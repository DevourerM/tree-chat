import {pathTo, ROOT, TreeError} from '../core/graph.js';
import {isCompactionReplacement,messageRoots,applyCheckpoint} from './compaction.js';

const TYPES = new Set(['system/message', 'developer/message', 'user/message', 'assistant/message', 'tool/result']);
export function textOf(message) {
  return (message?.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('\n');
}
export function turnsOf(events, after = -1) {
  const turns = []; let start = null;
  for (const event of events) {
    if (event.type === 'turn/start') start = event.seq;
    if (event.type === 'turn/end' && start !== null) {
      if (event.seq > after) {
        const users = events.slice(start, event.seq + 1).filter(e => e.type === 'user/message');
        const human = users.filter(e => !e.data.source?.kind || e.data.source.kind === 'user');
        const user = human[0] ?? users[0];
        // Maintenance-only turns do not become conversation nodes.
        if (user) {
          const title = text => (text.trim() || '附件对话').replace(/\s+/g, ' ').slice(0,90);
          const kind = human.length ? 'user' : 'internal';
          const label = kind === 'user' ? title(human.map(e=>textOf(e.data)).join('\n'))
            : user.data.source?.kind === 'goal' ? '自动继续' : user.data.source?.kind === 'user-approval' ? '权限变更' : '系统消息';
          turns.push({start,end:event.seq,label,kind,legacyLabel:title(textOf(users[0].data)),createdAt:user.time});
        }
      }
      start = null;
    }
  }
  return turns;
}
export function updateNodePresentation(node, turn) {
  node.kind=turn?.kind ?? 'user';
  if (!turn) return;
  node.labelMode??=node.label===turn.legacyLabel?'auto':'custom';
  if(node.labelMode==='auto')node.label=turn.label;
}
export function messageLocation(events, messageId, fallbackSeq) {
  const message=events.find(e=>e.type==='user/message'&&e.data.id===messageId);
  if(messageId && !message)return null;
  const seq=message?.seq ?? fallbackSeq;
  const turn=events.findLast(e=>e.seq<=seq&&e.type==='turn/start')?.data.turn;
  return Number.isSafeInteger(turn)?{seq,turn}:null;
}
/**
 * Rebuild the current model-visible surface order from a session log.
 * Lifecycle events (`surfaceOp: 'append'`) become surface nodes at their own position;
 * a replacement node shadows the cited range and inherits every raw position it
 * ultimately stands for. Those raw positions let a recorded message be attributed to
 * the original turn even when compaction or result pruning logged it later.
 * @param events - raw session log in seq order.
 * @returns surface node seqs in model-visible order and each node's raw origin seqs.
 */
export function surfaceOrigins(events, allowReplacement) {
  const nodes = [], origins = new Map();
  const place = seq => { nodes.push(seq); origins.set(seq, new Set([seq])); };
  for (const event of events) {
    const op = event.surfaceOp;
    if (op === 'append') { place(event.seq); continue; }
    if (op === null || typeof op !== 'object' || Array.isArray(op)) continue;
    if(allowReplacement&&!allowReplacement(event))continue;
    const first = nodes.indexOf(op.startSeq), last = nodes.indexOf(op.endSeq);
    if (first < 0 || last < first) { if(!allowReplacement)place(event.seq); continue; }
    const removed = nodes.slice(first, last + 1), inherited = new Set();
    for (const seq of removed) {
      const source = origins.get(seq);
      if (source) for (const origin of source) inherited.add(origin);
      origins.delete(seq);
    }
    if (inherited.size === 0) inherited.add(event.seq);
    // The replacement's own seq is deliberately not an origin: it stands for the
    // messages it shadowed, not for the turn that happened to log the rewrite.
    origins.set(event.seq, inherited);
    nodes.splice(first, removed.length, event.seq);
  }
  return {nodes, origins};
}
function sessionContext(source,cutoff) {
  const events = (source.events??[]).slice(0,cutoff+1);
  const reader=source.snapshot?.(cutoff)??source.native;
  const {nodes,origins}=surfaceOrigins(events,event=>!isCompactionReplacement(event,events));
  const surface=nodes.map(seq=>{
    const event=structuredClone(events[seq]),message=reader?.deriveEventMessage(events[seq]);
    if(message){if(event.type==='user/message')event.data=structuredClone(message);else event.data.message=structuredClone(message);}
    return event;
  }).filter(event=>TYPES.has(event.type));
  const turns = turnsOf(events);
  const seqToTurn = new Map(), startToTurn = new Map();
  turns.forEach((turn, index) => {
    startToTurn.set(turn.start, index);
    for (let seq = turn.start; seq <= turn.end; seq++) seqToTurn.set(seq, index);
  });
  return {events, surface, turns, seqToTurn, startToTurn, origins};
}
/**
 * Convert the selected path to ordinary DSH events, keeping complete tool exchanges.
 * Read bounded historical surfaces, then apply only explicit checkpoints on this path.
 * A changed dependency path invalidates its old summary. Raw message provenance makes
 * replacement atomic across branches and prevents summaries from reintroducing removed turns.
 * Synthetic lifecycle coordinates keep complete tool exchanges valid for native persistence.
 */
export async function compilePath(graph, head, load, uuid) {
  const path=pathTo(graph,head),cache=new Map();
  const read=async id=>{if(!cache.has(id))cache.set(id,await load(id));return cache.get(id);};
  const origin=await read(graph.id),nodes=path.filter(node=>node.id!==ROOT),cutoffs=new Map();
  for(const node of nodes){if(!node.source)throw new TreeError('节点缺少消息来源');cutoffs.set(node.source.sessionId,Math.max(cutoffs.get(node.source.sessionId)??-1,node.source.end));}
  const contexts=new Map();
  for(const [id,cutoff]of cutoffs)contexts.set(id,sessionContext(await read(id),cutoff));
  const originCutoff=cutoffs.get(graph.id)??origin.events.find(e=>e.type==='assistant/message')?.seq??origin.events.length-1;
  const originContext=contexts.get(graph.id)??sessionContext(origin,originCutoff);
  const firstAssistant=origin.events.find(e=>e.type==='assistant/message')?.seq??Infinity;
  const system=originContext.surface.find(e=>e.type==='system/message');
  const baseline=originContext.surface.filter(e=>e===system||e.type==='developer/message'&&e.seq<firstAssistant);
  const baselineSeqs=new Set(baseline.map(e=>e.seq));
  const rows=baseline.map(event=>({event,source:origin,roots:messageRoots(event,origin,originContext.origins),group:-1}));
  const entries=[],groups=new Map();let cwd=origin.header.cwd;
  for(const [pathIndex,node]of nodes.entries()){
    const source=await read(node.source.sessionId),context=contexts.get(node.source.sessionId);
    cwd=context.events.findLast(e=>e.seq<=node.source.end&&e.type==='working-directory/change')?.data.cwd??source.header.cwd??cwd;
    if(node.kind==='compaction'){entries.push({pathIndex,node,source});continue;}
    const turnIndex=context.startToTurn.get(node.source.start)??context.seqToTurn.get(node.source.start);
    if(turnIndex===undefined)throw new TreeError('节点消息来源无法定位到原始轮次，请重新选择分支');
    const entry={pathIndex,node,source,context,turnIndex};entries.push(entry);
    const group=groups.get(node.source.sessionId)??[];group.push(entry);groups.set(node.source.sessionId,group);
  }
  const assigned=new Map();
  for(const [id,group]of groups){
    const {source,context}=group[0],exact=new Map(group.map(entry=>[entry.turnIndex,entry]));
    for(const event of context.surface){
      if(id===graph.id&&baselineSeqs.has(event.seq))continue;
      const originalTurns=new Set();
      for(const seq of context.origins.get(event.seq)??[event.seq]){const index=context.seqToTurn.get(seq);if(index!==undefined)originalTurns.add(index);}
      // A many-turn replacement must be a selected explicit checkpoint, never guessed onto a turn.
      if(originalTurns.size>1)throw new TreeError('存在无法归属的跨轮上下文替换，请从原始历史重新建立分支');
      const entry=exact.get([...originalTurns][0]);if(!entry)continue;
      const list=assigned.get(entry.pathIndex)??[];list.push({event,source,roots:messageRoots(event,source,context.origins),group:entry.pathIndex});assigned.set(entry.pathIndex,list);
    }
  }
  const ignoredCompactions=[];
  for(const entry of entries){
    if(entry.node.kind!=='compaction'){rows.push(...assigned.get(entry.pathIndex)??[]);continue;}
    const prefix=path.slice(0,entry.pathIndex+1).map(node=>node.id).join('/');
    if(entry.node.compaction?.prefixKey!==prefix){ignoredCompactions.push(entry.node.id);continue;}
    applyCheckpoint(rows,entry.node,entry.source,surfaceOrigins,entry.pathIndex);
  }
  // Emit a fresh valid lifecycle around the chosen model-visible messages. Summary replacement
  // happened above, so no original message and its summary can enter the same request twice.
  const seed=[];let turn=1,group=-1,headerSeq;
  const append=(type,data,surface=false,time=Date.now())=>{const event={type,data:structuredClone(data),seq:seed.length,time};if(surface)event.surfaceOp='append';seed.push(event);return event.seq;};
  const open=()=>{append('turn/start',{turn});append('step/start',{turn,step:1});};
  const pending=new Map(),advertised=new Set();
  const close=()=>{if(pending.size)throw new TreeError('这条路径有未完成的工具调用，请等待对话完成后再创建枝');append('step/end',{turn,step:1});append('turn/end',{turn,reason:{kind:'completed'}});};
  open();
  const header=originContext.events.findLast(e=>e.type==='request/header');
  if(header)headerSeq=append('request/header',{...header.data,turn,step:1});
  for(const row of rows){
    const {event,source}=row;
    if(row.group!==group){close();turn++;group=row.group;open();}
    const data=structuredClone(event.data),message=event.type==='user/message'?data:data?.message;
    if(!message||!TYPES.has(event.type))continue;
    if(message.source?.replayState)delete message.source.replayState;
    if(event.type!=='user/message'){data.turn=turn;data.step=1;}
    if(data.headerSeq!==undefined){
      const oldHeader=source.events[event.data.headerSeq];
      if(oldHeader?.type!=='request/header')throw new TreeError('历史工具定义不完整');
      headerSeq=append('request/header',{...oldHeader.data,turn,step:1});data.headerSeq=headerSeq;
    }
    for(const block of message.content??[])if(block.type==='tool-call'){
      if(advertised.has(block.id))throw new TreeError('所选路径包含重复工具调用，请选择不重复的枝');
      advertised.add(block.id);pending.set(block.id,block);
    }
    let callSeq;
    if(message.role==='tool'){
      const call=pending.get(message.toolCallId);if(!call)throw new TreeError('所选路径包含没有配对的工具结果');
      if(data.error?.code==='TOOL_NOT_STARTED')throw new TreeError('这条路径包含分叉时尚未执行的工具记录，请选择完整结束的轮次');
      pending.delete(message.toolCallId);callSeq=append('tool/call',{turn,step:1,callId:call.id,name:call.name,arguments:call.arguments});
    }
    const seq=append(event.type,data,true,event.time);if(callSeq!==undefined)seed[seq].sourceEventSeqs=[callSeq];
  }
  close();
  return {seed,origin,cwd,path:path.map(node=>node.id),ignoredCompactions};
}
