import {randomUUID} from 'node:crypto';
import {Session} from '@deepseek-ai/dsh-session';
import {newGraph, ROOT, pathKey, pathTo, editGraph, publicGraph, assertRevision, TreeError} from '../core/graph.js';
import {turnsOf, compilePath, textOf, updateNodePresentation, messageLocation} from './context.js';
import {draftBranchesOf,draftForNode,setDraftBranch,removeDraftBranch} from '../core/branches.js';
import {conversationView} from '../core/presentation.js';
import {layoutGraph,PlacementIndex} from '../core/layout.js';
import {PermissionBridge} from './permissions.js';
import {conversationEntries,compactionBusy} from './compaction.js';

/** Resolve the closest living node for a head that an edit removed from the tree. */
function survivingHead(graph, head, before) {
  const chain = before?.nodes ?? graph.nodes, seen = new Set();
  let current = head;
  while (typeof current === 'string' && !Object.hasOwn(graph.nodes, current)) {
    if (seen.has(current)) { current = undefined; break; }
    seen.add(current);
    const node = chain[current];
    if (!node) { current = undefined; break; }
    current = node.parent;
  }
  if (typeof current === 'string' && Object.hasOwn(graph.nodes, current)) return current;
  // Trees broken by older versions lost the parent of the removed head: the node id ends in the
  // turn's last source seq, so its predecessor is the same session's node with the greatest end below it.
  const match = /^(.*):(\d+)$/.exec(typeof head === 'string' ? head : '');
  if (!match) return Object.hasOwn(graph.nodes, ROOT) ? ROOT : undefined;
  const [, sessionId, endText] = match, end = Number(endText);
  let best, bestEnd = -1;
  for (const node of Object.values(graph.nodes)) {
    if (node.source?.sessionId !== sessionId) continue;
    if (node.source.end < end && node.source.end > bestEnd) { best = node.id; bestEnd = node.source.end; }
  }
  return best;
}
/**
 * Keep every native binding on a living node with its exact path.
 * Deleting or reparenting the node a branch is bound to used to leave a dangling head or a stale
 * path key; the next load then rejected the session and the tree became unusable. Repairing the
 * mapping inside the same edit makes the half-finished rewind harmless: the branch stays readable
 * and a following activate replaces it with a freshly compiled context.
 * @param graph - graph to repair in place.
 * @param before - pre-edit graph used to walk removed parents; omitted when healing at read time.
 * @returns session ids whose binding changed.
 */
export function repairBindings(graph, before) {
  const repaired = [];
  for (const [sessionId, binding] of Object.entries(graph.bindings)) {
    let changed = false;
    if (!Object.hasOwn(graph.nodes, binding.head)) {
      const head = survivingHead(graph, binding.head, before);
      if (head !== undefined) { binding.head = head; changed = true; }
    }
    if (Object.hasOwn(graph.nodes, binding.head)) {
      let key;
      try { key = pathKey(graph, binding.head); }
      catch {if(!binding.rewind){binding.rewind=true;repaired.push(sessionId);}continue;} // Reconnect a detached path before generating.
      if (key !== binding.key) { binding.key = key; changed = true; }
    }
    if (changed) { binding.rewind = true; repaired.push(sessionId); }
  }
  return repaired;
}

export class TreeService {
  constructor(ctx, storage, permissionSetters) { this.ctx = ctx; this.storage = storage; this.loaded = new Map(); this.permissions=new PermissionBridge(ctx,permissionSetters); }
  repair(graph){return repairBindings(graph);}
  isBusy(graph){return Object.keys(graph.bindings).some(id=>this.ctx.agents.get(id)?.status==='running'||compactionBusy(this.ctx.sessions.get(id)?.snapshotEvents(0)??[]));}
  contextNeedsRewind(graph,sessionId,source){
    if(!source.activeCompactions.length)return false;
    const path=pathTo(graph,graph.bindings[sessionId].head,false);if(path[0]?.id!==ROOT)return true;
    const checkpoints=new Map(path.filter(n=>n.kind==='compaction').map(n=>[n.compaction.id,n]));
    return source.activeCompactions.some(id=>{const node=checkpoints.get(id);return node?node.compaction.prefixKey!==pathKey(graph,node.parent):graph.deletedCompactions?.includes(id);});
  }
  async transferPermissions(from,to) {
    if(from===to||!this.ctx.get('permissionPresets'))return;
    const source=await this.load(from),selection=this.permissions.capture(source.native);
    if(compactionBusy(source.events)||compactionBusy(this.ctx.sessions.get(to)?.snapshotEvents(0)??[]))throw new TreeError('请等待上下文压缩完成后再切换分支',409);
    let agent=this.ctx.agents.get(to);
    if(agent?.status==='running')throw new TreeError('目标分支正在生成，请完成后再切换权限',409);
    if(!agent){
      const target=await this.load(to),presets=this.ctx.get('agentPresets');
      const presetId=target.events.findLast(e=>e.type==='agent-preset/selected')?.data.agentPreset??target.header.agentPreset;
      const preset=presets?await presets.resolve(presetId):null;
      const model=target.events.findLast(e=>e.type==='model/selection')?.data??this.ctx.agentDefaultModel.currentSelection();
      const result=await this.ctx.agents.resume({resumeSessionId:to,agentOptions:{provider:model.provider,model:model.model},setup:async(agentCtx,resumed)=>{
        if(presets)await presets.mount(agentCtx,preset.id);
        this.permissions.apply(resumed.session,selection);
      }});
      agent=result.agent;
    }else this.permissions.apply(agent.session,selection);
    this.loaded.delete(to);
  }
  placement(graph) {
    const projected=conversationView(graph),layout=layoutGraph(projected.graph);
    // Keep existing nodes fixed when a new child changes the automatic tree spans.
    for(const [id,p]of layout.positions){
      const node=draftForNode(graph,id)??graph.nodes[id]??graph.groups?.[id];
      if(!node.position)node.position={x:p.cx,y:p.cy};
    }
    return {index:new PlacementIndex(layout.positions),owners:projected.owners};
  }
  newPosition(graph,parentId) {
    const {index,owners}=this.placement(graph);
    return index.next(owners.get(parentId)??parentId);
  }
  async shelve(graph, selectedSessionId) {
    const registry = this.ctx.get('workspaceRegistry');
    if (!registry?.archiveSession || !registry?.unarchiveSession) return;
    await registry.unarchiveSession(selectedSessionId);
    if (graph.bindings[selectedSessionId]) graph.bindings[selectedSessionId].autoArchived = false;
    for (const [id, binding] of Object.entries(graph.bindings)) {
      if (id === selectedSessionId || registry.pinnedSessionIds?.includes(id)) continue;
      if (registry.archivedSessionIds?.includes(id)) {
        if (binding.autoArchived === undefined) binding.autoArchived = true;
        continue;
      }
      try {await registry.archiveSession(id); binding.autoArchived = true;}
      catch (error) {this.ctx.logger.warn(`tree-chat保留活动枝 ${id}: ${String(error)}`);}
    }
    await this.storage.save(graph);
  }
  async load(sessionId) {
    const live = this.ctx.sessions.get(sessionId);
    const lease = !live && this.ctx.sessionQuery.observeSession ? await this.ctx.sessionQuery.observeSession(sessionId, {projectionMode: 'none'}) : null;
    try {
    const cursor = live ? live.seq - 1 : lease?.cursor;
    const cached = this.loaded.get(sessionId);
    if (cursor !== undefined && cached?.cursor === cursor) return cached.value;
    const data = live ? {events: live.snapshotEvents(0), session: live.header, inheritedEventCount: live.inheritedEventCount}
      : lease ? {events: lease.events, session: lease.header, inheritedEventCount: lease.inheritedEventCount}
      : await this.ctx.sessionQuery.readSession(sessionId);
    const native = live ?? Session.create(sessionId, data.events, data.session, data.inheritedEventCount, this.ctx.sessions.projections);
    const events = data.events;
    const surface = native.surface.nodes.map(seq => {
      const event = structuredClone(events[seq]);
      const message = native.deriveEventMessage(events[seq]);
      if (message) {
        if (event.type === 'user/message') event.data = structuredClone(message);
        else event.data.message = structuredClone(message);
      }
      return event;
    });
    const turns=turnsOf(events);
    const inheritedCheckpoints=events.filter(e=>e.type==='user/message'&&e.surfaceOp==='append'&&['compact-checkpoint','compact-basic'].includes(e.data.source?.kind));
    const activeCompactions=surface.filter(e=>e.type==='user/message'&&e.data.source?.compactionId).map(e=>e.data.source.compactionId);
    const snapshot=end=>{const prefix=events.slice(0,end+1);return Session.create(sessionId,prefix,data.session,Math.min(native.inheritedEventCount,prefix.length),this.ctx.sessions.projections);};
    const value = {events, surface, native, snapshot,header: data.session, inheritedEventCount:native.inheritedEventCount,turns,entries:conversationEntries(events,turns),inheritedCheckpoints,activeCompactions};
    this.loaded.delete(sessionId); this.loaded.set(sessionId, {cursor: events.at(-1)?.seq ?? -1, value});
    if (this.loaded.size > 12) this.loaded.delete(this.loaded.keys().next().value);
    return value;
    } finally {lease?.[Symbol.dispose]();}
  }
  resolveTreeTitle(originSource, currentTitle) {
    const titled = originSource.events.findLast(e => e.type === 'session/title' && typeof e.data?.title === 'string' && e.data.title.trim())?.data.title.trim()
      ?? (typeof originSource.header?.title === 'string' && originSource.header.title.trim() ? originSource.header.title.trim() : '');
    if (titled) return titled.replace(/\s+/g, ' ').slice(0, 80);
    if (currentTitle && currentTitle !== '对话树') return currentTitle;
    const firstTurn = originSource.turns.find(t => t.kind === 'user') ?? originSource.turns[0];
    return firstTurn?.label ? firstTurn.label.slice(0, 60) : (currentTitle || '对话树');
  }
  branchSessionTitle(graph, id) {
    const base = (graph.title && graph.title !== '对话树' ? graph.title : '对话').slice(0, 48);
    const label = graph.nodes[id]?.label;
    if (!label || id === ROOT || label === '对话起点' || label === base) return base;
    const shortLabel = label.length > 24 ? `${label.slice(0, 24)}…` : label;
    return `${base} · ${shortLabel}`;
  }
  async refreshPresentation(graph, source, sessionId) {
    const pending = new Map();
    // Include undo snapshots so old titles do not reappear after an undo.
    for (const state of [graph,...graph.undo,...graph.redo]) for(const node of Object.values(state.nodes)) {
      if (!node.source || node.kind) continue;
      const list=pending.get(node.source.sessionId)??[];list.push(node);pending.set(node.source.sessionId,list);
    }
    for(const [id,nodes]of pending) {
      const data=id===sessionId?source:await this.load(id);
      const turns=new Map(data.turns.map(t=>[t.end,t]));
      for(const node of nodes) {
        updateNodePresentation(node,turns.get(node.source.end));
      }
    }
    return pending.size>0;
  }
  async recoverInheritedCheckpoints(graph,sessionId,source,isCurrent){
    const binding=graph.bindings[sessionId];
    if(!source.inheritedCheckpoints.length||binding.compactionRecoveryVersion===1)return false;
    binding.compactionRecoveryVersion=1;
    const oldHead=binding.head,chain=pathTo(graph,oldHead,false);if(chain[0]?.id!==ROOT){binding.rewind=true;return true;}
    const ids=new Set([graph.id,...chain.map(n=>n.source?.sessionId).filter(Boolean)]);
    const markers=[...source.inheritedCheckpoints],sources=[];
    for(const id of ids){const data=id===sessionId?source:await this.load(id).catch(()=>null);if(!data)continue;sources.push([id,data]);markers.push(...data.inheritedCheckpoints);}
    const transactions=new Set(markers.map(e=>e.data.source?.compactionId).filter(Boolean)),messages=new Set(markers.map(e=>e.data.id));
    for(const [owner,data]of sources)for(const record of data.entries.filter(e=>e.kind==='compaction')){
      if(!transactions.has(record.compaction.id)&&!messages.has(data.events[record.compaction.replacementSeq].data.id))continue;
      const path=pathTo(graph,binding.head),included=path.find(n=>n.compaction?.id===record.compaction.id);
      if(included){if(included.compaction.prefixKey!==pathKey(graph,included.parent))binding.rewind=true;continue;}
      const existing=Object.values(graph.nodes).find(n=>n.compaction?.id===record.compaction.id);
      if(!existing&&graph.deletedCompactions?.includes(record.compaction.id)){binding.rewind=true;continue;}
      let index=0;for(let i=1;i<path.length;i++)if(path[i].source?.sessionId===owner&&path[i].source.end<=record.end)index=i;
      const parent=path[index].id,next=path[index+1],group=Object.values(graph.groups??{}).find(g=>g.nodeIds.includes(parent)&&g.nodeIds.includes(next?.id));
      if(existing&&(existing.parent!==parent||group&&Object.values(graph.groups??{}).some(g=>g.id!==group.id&&g.nodeIds.includes(existing.id)))){binding.rewind=true;continue;}
      const id=existing?.id??`${owner}:compact-${record.compaction.summarySeq}`;
      if(!existing)graph.nodes[id]={id,parent,label:record.label,kind:'compaction',labelMode:'auto',createdAt:record.createdAt,
        source:{sessionId:owner,start:record.start,end:record.end},compaction:{...record.compaction,prefixKey:binding.rewind?null:pathKey(graph,parent)},position:this.newPosition(graph,parent)};
      if(next)next.parent=id;else binding.head=id;
      if(group&&!group.nodeIds.includes(id))group.nodeIds.push(id);
      if(graph.nodes[id].compaction.prefixKey!==pathKey(graph,parent))binding.rewind=true;
      else try{await compilePath(graph,id,s=>this.load(s));}catch{if(!existing)graph.nodes[id].compaction.prefixKey=null;binding.rewind=true;}
    }
    binding.key=pathKey(graph,binding.head);
    if(binding.head!==oldHead){
      if(isCurrent||graph.active===oldHead&&!Object.entries(graph.bindings).some(([id,b])=>id!==sessionId&&b.head===oldHead))graph.active=binding.head;
      const draft=draftBranchesOf(graph)[sessionId];if(draft?.parent===oldHead)setDraftBranch(graph,{...draft,parent:binding.head});
    }
    return true;
  }
  async syncSessionTurns(graph, sessionId, sourceInput, isCurrentSession = true) {
    const binding = graph.bindings[sessionId];
    if (!binding) return false;
    if(pathTo(graph,binding.head,false)[0]?.id!==ROOT)return false;
    const source = sourceInput ?? await this.load(sessionId);
    const recovered=await this.recoverInheritedCheckpoints(graph,sessionId,source,isCurrentSession);
    const mismatched=!binding.rewind&&this.contextNeedsRewind(graph,sessionId,source);if(mismatched)binding.rewind=true;
    const newTurns = source.entries.filter(t=>t.kind==='compaction'?t.compaction.endSeq>(binding.compactionSeen??-1):t.end>binding.seen);
    if (!newTurns.length) return recovered||mismatched;
    const pending = draftBranchesOf(graph)[sessionId];
    if(pending&&graph.pendingBranch?.sessionId===sessionId)graph.pendingBranch=pending;
    let promoted = false;
    let placement;
    for (const turn of newTurns) {
      if(turn.kind==='compaction'){
        const known=Object.values(graph.nodes).find(n=>n.kind==='compaction'&&n.source.sessionId===sessionId&&n.compaction.summarySeq===turn.compaction.summarySeq);
        const id=known?.id??`${sessionId}:compact-${turn.compaction.summarySeq}`;
        binding.compactionSeen=Math.max(binding.compactionSeen??-1,turn.compaction.endSeq);
        if(!known&&graph.deletedCompactions?.includes(turn.compaction.id)){binding.rewind=true;continue;}
        if(!graph.nodes[id]){
          // Upgrade trees that already contain later turns without attaching old side branches
          // to a compression they never used. Only the next node owned by this native log moves.
          const following=Object.values(graph.nodes).filter(n=>n.source?.sessionId===sessionId&&n.source.end>turn.end).sort((a,b)=>a.source.end-b.source.end)[0];
          const parent=following?.parent??binding.head,prefixKey=!binding.rewind?pathKey(graph,parent):null;
          graph.nodes[id]={id,parent,label:turn.label,kind:'compaction',labelMode:'auto',createdAt:turn.createdAt,
            source:{sessionId,start:turn.start,end:turn.end},compaction:{...turn.compaction,prefixKey},position:this.newPosition(graph,parent)};
          if(following){following.parent=id;for(const group of Object.values(graph.groups??{}))if(group.nodeIds.includes(parent)&&group.nodeIds.includes(following.id))group.nodeIds.push(id);}
          else{binding.head=id;if(isCurrentSession)graph.active=id;}
          // Old trees/files may have lost their native rewind flag. Prove the checkpoint
          // against the actual selected history instead of trusting that flag or its label.
          if(prefixKey!==null){try{await compilePath(graph,id,s=>this.load(s));}catch{graph.nodes[id].compaction.prefixKey=null;binding.rewind=true;}}
        }
        binding.seen=Math.max(binding.seen,turn.end);placement=undefined;continue;
      }
      const promote=pending&&!promoted&&turn.kind==='user';
      const id = promote ? `pending:${sessionId}` : `${sessionId}:${turn.end}`;
      // A deleted historical node must never be resurrected by a polling read.
      if (!graph.nodes[id]) {
        const parent = graph.nodes[binding.head] ? binding.head : graph.active;
        let position;
        if(turn.kind==='user'){
          placement??=this.placement(graph);
          position=pending&&!promoted&&pending.position?pending.position:placement.index.next(placement.owners.get(parent)??parent);
          placement.index.add(id,position);placement.owners.set(id,id);
        }else if(placement)placement.owners.set(id,placement.owners.get(parent)??parent);
        graph.nodes[id] = {id, parent, label: turn.label, kind: turn.kind, labelMode: 'auto', createdAt: turn.createdAt,
          source: {sessionId, start: turn.start, end: turn.end},...(position?{position}:{})};
        if (pending && !promoted && turn.kind === 'user') {
          if (pending.position) graph.nodes[id].position = pending.position;
          if(pending.labelMode==='custom'){graph.nodes[id].label=pending.label;graph.nodes[id].labelMode='custom';}
          promoted = true;
        }
      }
      binding.head = id;
      if (isCurrentSession) graph.active = id;
      binding.seen = Math.max(binding.seen,turn.end);
    }
    binding.key = pathKey(graph,binding.head);
    if (pending) {
      if (promoted) removeDraftBranch(graph,sessionId);
      else pending.parent = binding.head;
    }
    return true;
  }
  async sync(sessionId) {
    const source = await this.load(sessionId);
    let graph = await this.storage.find(sessionId); const created = !graph;
    if (!graph) {
      if (source.header.origin === 'subagent') throw new TreeError('请在普通对话中使用tree-chat；智能体子任务由 DSH 自身管理');
      graph = newGraph(sessionId, this.resolveTreeTitle(source, '对话树'));
      graph.bindings[sessionId] = {head: ROOT, key: ROOT, seen: -1};
    }
    const initiallyRepaired=repairBindings(graph);
    const originSource = sessionId === graph.id ? source : await this.load(graph.id).catch(() => null);
    let titleChanged = false;
    if (originSource) {
      const nextTitle = this.resolveTreeTitle(originSource, graph.title);
      if (nextTitle && nextTitle !== graph.title) {
        graph.title = nextTitle;
        titleChanged = true;
      }
    }
    const presentationChanged = await this.refreshPresentation(graph, source, sessionId);
    let changed = await this.syncSessionTurns(graph, sessionId, source, true);
    for(const draft of Object.values(draftBranchesOf(graph))) {
      if(draft.sessionId!==sessionId)changed=(await this.syncSessionTurns(graph,draft.sessionId,undefined,false))||changed;
      if(!graph.nodes[draft.parent]||!graph.bindings[draft.sessionId]||!graph.bindings[draft.returnSessionId]||(!graph.nodes[`pending:${draft.sessionId}`]&&graph.bindings[draft.sessionId].head!==draft.parent)){
        removeDraftBranch(graph,draft.sessionId);changed=true;
      }
    }
    const repaired = [...initiallyRepaired,...repairBindings(graph)];
    if (changed) { graph.revision++; graph.undo = []; graph.redo = []; }
    else if (presentationChanged || titleChanged || repaired.length) graph.revision++;
    if (changed || created || presentationChanged || titleChanged || repaired.length) await this.storage.save(graph);
    return graph;
  }
  async syncCompaction(sessionId){
    const graph=await this.storage.find(sessionId);if(!graph)return;
    if(await this.syncSessionTurns(graph,sessionId,undefined,graph.active===graph.bindings[sessionId]?.head)){repairBindings(graph);graph.revision++;graph.undo=[];graph.redo=[];await this.storage.save(graph);}
  }
  async get(sessionId,knownRevision) {
    const graph=await this.sync(sessionId);
    if(this.projects)await this.projects.link(graph.id);
    const projectSync=this.projects?.summary(graph.id);
    return knownRevision===graph.revision?{unchanged:true,revision:graph.revision,...(projectSync?{projectSync}:{})}:{...publicGraph(graph),...(projectSync?{projectSync}:{})};
  }
  validateArchive(data){return Session.create(data.header.id,data.events,data.header,data.inheritedEventCount,this.ctx.sessions.projections).deriveMessages();}
  async locate(sessionId,id) {
    const graph=await this.sync(sessionId), node=Object.hasOwn(graph.nodes,id)?graph.nodes[id]:undefined;
    if(!node)throw new TreeError('节点不存在');
    const current=await this.load(sessionId);
    if(node.kind==='compaction'){
      const destination=node.source.sessionId;
      if(destination!==sessionId){await this.transferPermissions(sessionId,destination);await this.shelve(graph,destination);}
      const source=await this.load(destination),summary=source.events[node.compaction.summarySeq];
      if(summary?.type!=='compaction/summary')throw new TreeError('找不到这次压缩的原生记录');
      return {sessionId:destination,seq:node.compaction.endSeq,compactionId:node.compaction.id,commandId:summary.data.sourceCommandId};
    }
    if(id===ROOT){const first=current.events.find(e=>e.type==='user/message'&&e.data.source?.kind==='user')??current.events.find(e=>e.type==='user/message');if(!first)throw new TreeError('尚无聊天记录');return {sessionId,...messageLocation(current.events,first.data.id,first.seq)};}
    const source=node.source.sessionId===sessionId?current:await this.load(node.source.sessionId);
    const inputs=source.events.filter(e=>e.seq>=node.source.start&&e.seq<=node.source.end&&e.type==='user/message');
    const input=inputs.find(e=>e.data.source?.kind==='user')??inputs[0];
    let destination=sessionId, location=messageLocation(current.events,input?.data.id,node.source.start);
    if(!location){destination=node.source.sessionId;location=messageLocation(source.events,input?.data.id,node.source.start);}
    if(!location)throw new TreeError('该轮聊天记录无法定位');
    if(destination!==sessionId){
      await this.transferPermissions(sessionId,destination);
      await this.shelve(graph,destination);
    }else{
      const registry=this.ctx.get('workspaceRegistry');
      if(registry?.archivedSessionIds?.includes(destination)){
        await registry.unarchiveSession(destination);
        if(graph.bindings[destination]){graph.bindings[destination].autoArchived=false;await this.storage.save(graph);}
      }
    }
    return {sessionId:destination,...location};
  }
  async edit(sessionId, revision, operation) {
    const graph = await this.sync(sessionId);
    assertRevision(graph, revision);
    if (!['move','reset-layout','arrange','rename'].includes(operation.type) && (!operation.type?.startsWith('group-')||operation.type==='group-delete') && this.isBusy(graph)) throw new TreeError('请等待这棵树中的生成或上下文压缩完成后再调整上下文', 409);
    const updated = editGraph(graph, operation);
    // A delete or reparent can remove or move the node a native branch is bound to. Repair the
    // mapping in the same write so an interrupted client can never leave the tree unreadable.
    repairBindings(updated, graph);
    await this.storage.save(updated);
    return publicGraph(updated);
  }
  async preview(sessionId, id, through = id, includeInternal = false) {
    const graph = await this.sync(sessionId), node = graph.nodes[id];
    if (!node) throw new TreeError('节点不存在');
    if (id === ROOT) return {messages: [], path: [ROOT]};
    const path=pathTo(graph,through,false), start=path.findIndex(n=>n.id===id);
    if(start<0)throw new TreeError('预览路径无效');
    const messages=[];
    for(const part of path.slice(start)) {
    const source = await this.load(part.source.sessionId);
    messages.push(...source.surface.filter(e => e.seq >= part.source.start && e.seq <= part.source.end && (includeInternal || e.type!=='user/message' || !e.data.source?.kind || e.data.source.kind==='user'))
      .map(e => ({role: e.type === 'user/message' ? 'user' : e.data.message?.role, text: textOf(e.type === 'user/message' ? e.data : e.data.message)}))
      .filter(m => m.role && m.text).map(m => ({...m, text: m.text.slice(0, 40000)})));
    }
    return {messages, path: pathTo(graph, id, false).map(n => n.id)};
  }
  /** Keep the sidebar tidy for a native session that just left the tree. */
  async archiveDropped(sessionId) {
    const registry = this.ctx.get('workspaceRegistry');
    try { await registry?.archiveSession?.(sessionId); }
    catch (error) { this.ctx.logger.warn(`tree-chat归档已重连会话 ${sessionId}: ${String(error)}`); }
  }
  async activate(sessionId, revision, id, force = false, rewind = false) {
    const graph = await this.sync(sessionId);
    assertRevision(graph, revision);
    if(this.isBusy(graph))throw new TreeError('请等待当前生成或上下文压缩结束后再切换上下文',409);
    const key = pathKey(graph, id);
    // A repaired binding still points at the right node but its native context belongs to the
    // pre-edit path. Activating the same position replaces it instead of trusting the mapping.
    const takeOver = () => {
      const previous = graph.bindings[sessionId];
      if (!previous || previous.head !== id || previous.key !== key || !(rewind || previous.rewind)) return null;
      delete graph.bindings[sessionId];
      return sessionId;
    };
    if (!force) {
      const existing = Object.entries(graph.bindings).find(([owner, b]) => owner !== sessionId && !b.rewind && b.head === id && b.key === key);
      if (existing) {
        await this.transferPermissions(sessionId,existing[0]);
        const replaced = takeOver();
        graph.active = id; await this.shelve(graph, existing[0]); await this.storage.save(graph);
        if (replaced) await this.archiveDropped(replaced);
        return {sessionId: existing[0], graph: publicGraph(graph)};
      }
    }
    const compiled = await compilePath(graph, id, s => this.load(s), () => `msg-${randomUUID()}`);
    const newId = `session-${randomUUID()}`;
    // Validate with the same native interpreter that the model loop uses before publishing anything.
    Session.create(newId, compiled.seed, undefined, undefined, this.ctx.sessions.projections).deriveMessages();
    const presets = this.ctx.get('agentPresets');
    const preset = presets ? await presets.resolve(compiled.origin.header.agentPreset) : undefined;
    const defaults = this.ctx.agentDefaultModel.currentSelection();
    const original = (await this.load(sessionId)).events.findLast(e => e.type === 'model/selection')?.data;
    const selection = original?.provider && original?.model ? original : defaults;
    const permission=this.permissions.capture((await this.load(sessionId)).native);
    const registry = this.ctx.get('workspaceRegistry');
    const workspace = registry?.list().find(w => w.sessionIds.includes(sessionId) || w.sessionIds.includes(graph.id));
    const sessionTitle = this.branchSessionTitle(graph, id);
    const handle = await this.ctx.agents.create({sessionId: newId, seed: compiled.seed,
      inheritedEventCount: compiled.seed.length,
      meta: {...(compiled.cwd ? {cwd: compiled.cwd} : {}), parentSession: graph.id, isSeeded: true,
        ...(preset ? {agentPreset: preset.id} : {})},
      agentOptions: {provider: selection.provider, model: selection.model},
      setup: async (agentCtx, agent) => {
        if (presets) await presets.mount(agentCtx, preset.id);
        this.permissions.apply(agent.session,permission);
        agent.session.append('model/selection', selection);
        agent.session.append('session/title', {title: sessionTitle, messageSeqs: [], source: {kind: 'user'}});
      }
    });
    // Store mapping before any navigation can submit a prompt.
    // A rewind hands this tree position over to the new native context; the previous session
    // leaves the tree instead of keeping a mapping whose compiled path no longer matches it.
    const replaced = takeOver();
    graph.bindings[newId] = {head: id, key, seen: handle.agent.session.seq - 1,compactionRecoveryVersion:1};
    graph.active = id; graph.revision++;
    await this.storage.save(graph);
    if (workspace) await workspace.attachSession(newId);
    await this.shelve(graph, newId);
    if (replaced) await this.archiveDropped(replaced);
    return {sessionId: newId, graph: publicGraph(graph)};
  }
  async branch(sessionId,revision,id){
    let graph=await this.sync(sessionId);assertRevision(graph,revision);
    if(this.isBusy(graph))throw new TreeError('请等待当前生成或上下文压缩结束后再新建分支',409);
    const empty=draftForNode(graph,id);
    if(empty){await this.transferPermissions(sessionId,empty.sessionId);setDraftBranch(graph,empty);await this.shelve(graph,empty.sessionId);return {sessionId:empty.sessionId,graph:publicGraph(graph)};}
    if(!Object.hasOwn(graph.nodes,id))throw new TreeError('节点不存在');
    for(const draft of Object.values(draftBranchesOf(graph))){
      if(draft.parent===id && graph.bindings[draft.sessionId]?.key===pathKey(graph,id)){
        await this.transferPermissions(sessionId,draft.sessionId);setDraftBranch(graph,draft);await this.shelve(graph,draft.sessionId);
        return {sessionId:draft.sessionId,graph:publicGraph(graph)};
      }
    }
    const currentDraft=draftBranchesOf(graph)[sessionId];
    const returnSessionId = currentDraft&&graph.bindings[currentDraft.returnSessionId]?currentDraft.returnSessionId:sessionId;
    const position=this.newPosition(graph,id);
    await this.storage.save(graph);
    const result=await this.activate(sessionId,graph.revision,id,true);
    graph=await this.storage.find(result.sessionId);
    setDraftBranch(graph,{sessionId:result.sessionId,parent:id,createdAt:Date.now(),returnSessionId,position});
    graph.undo=[];graph.redo=[];graph.revision++;
    await this.storage.save(graph);
    return {sessionId:result.sessionId,graph:publicGraph(graph)};
  }
  async cancelBranch(sessionId,revision,id){
    let graph=await this.sync(sessionId);assertRevision(graph,revision);
    const draft=id?draftForNode(graph,id):draftBranchesOf(graph)[sessionId]??graph.pendingBranch;
    if(!draft)throw new TreeError('该分支已产生消息，请使用节点菜单管理');
    if(this.isBusy(graph))throw new TreeError('请等待当前生成或上下文压缩结束',409);
    let target=sessionId;
    if(target===draft.sessionId)target=draft.returnSessionId;
    if(!graph.bindings[target] || !graph.nodes[graph.bindings[target]?.head])target=graph.id;
    await this.transferPermissions(sessionId,target);
    removeDraftBranch(graph,draft.sessionId);graph.undo=[];graph.redo=[];graph.revision++;
    graph.active=graph.nodes[graph.bindings[target]?.head]?.id??ROOT;
    await this.shelve(graph,target);await this.storage.save(graph);
    return {sessionId:target,graph:publicGraph(graph)};
  }
}
