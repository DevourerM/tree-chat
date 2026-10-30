import {draftBranchesOf,draftForNode,removeDraftBranch} from './branches.js';
import {validateGroups,applyGroupEdit,moveGroupState,reconcileGroupState,arrangeVisibleGraph} from './group-state.js';
export const SCHEMA_VERSION = 1;
export const ROOT = 'root';
export const pendingId = graph => graph?.pendingBranch ? `pending:${graph.pendingBranch.sessionId}` : null;
export class TreeError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function newGraph(sessionId, title = '对话树') {
  return {schemaVersion: SCHEMA_VERSION, id: sessionId, title, revision: 0,
    nodes: {[ROOT]: {id: ROOT, parent: null, label: '对话起点', createdAt: Date.now()}},
    bindings: {}, active: ROOT, undo: [], redo: []};
}
export function pathTo(graph, id, requireRoot = true) {
  const path = [], seen = new Set();
  while (id !== null) {
    if (seen.has(id)) throw new TreeError('连线形成了循环');
    seen.add(id);
    const node = Object.hasOwn(graph.nodes, id) ? graph.nodes[id] : undefined;
    if (!node) throw new TreeError('节点不存在');
    path.push(node);
    id = node.parent;
  }
  path.reverse();
  if (requireRoot && path[0]?.id !== ROOT) throw new TreeError('这条旧分支未连接到起点，请在节点菜单中选择“接回起点”');
  return path;
}
export function pathKey(graph, id) { return pathTo(graph, id).map(n => n.id).join('/'); }
export function validateGraph(graph) {
  if (graph?.schemaVersion !== SCHEMA_VERSION || typeof graph.id !== 'string' || !graph.nodes || Array.isArray(graph.nodes)) throw new TreeError('不支持的对话树数据格式');
  if (!Number.isSafeInteger(graph.revision) || graph.revision < 0 || !graph.bindings || typeof graph.bindings !== 'object' || Array.isArray(graph.bindings)) throw new TreeError('无效的树版本或会话映射');
  if (!Array.isArray(graph.undo) || !Array.isArray(graph.redo) || graph.undo.length > 30 || graph.redo.length > 30) throw new TreeError('无效的编辑历史');
  if (graph.nodes[ROOT]?.parent !== null || graph.nodes[ROOT]?.id !== ROOT) throw new TreeError('对话起点无效');
  if (Object.keys(graph.nodes).length > 20000) throw new TreeError('节点数量超过 20000');
  if(graph.deletedCompactions!==undefined&&(!Array.isArray(graph.deletedCompactions)||graph.deletedCompactions.length>20000||graph.deletedCompactions.some(id=>typeof id!=='string'||!id||id.length>200)))throw new TreeError('无效的压缩删除记录');
  for (const [id, node] of Object.entries(graph.nodes)) {
    if (id !== node.id || !id || typeof node.label !== 'string' || node.label.length > 200 || (node.parent !== null && typeof node.parent !== 'string')) throw new TreeError('无效的节点');
    if (id !== ROOT && (!node.source || typeof node.source.sessionId !== 'string' || !Number.isSafeInteger(node.source.start) || !Number.isSafeInteger(node.source.end) || node.source.start < 0 || node.source.end < node.source.start)) throw new TreeError('无效的消息来源');
    if (node.parent !== null && !Object.hasOwn(graph.nodes, node.parent)) throw new TreeError('父节点不存在');
    if(node.kind==='compaction'){
      const c=node.compaction;
      if(!c||typeof c.id!=='string'||!c.id||!Number.isSafeInteger(c.summarySeq)||!Number.isSafeInteger(c.replacementSeq)||!Number.isSafeInteger(c.endSeq)||c.summarySeq<node.source.start||c.replacementSeq<=c.summarySeq||c.endSeq<=c.replacementSeq||c.endSeq>node.source.end||(c.prefixKey!==null&&typeof c.prefixKey!=='string'))throw new TreeError('无效的压缩节点记录');
    }
    if (node.position !== undefined && (!node.position || !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y) || Math.abs(node.position.x)>1000000 || Math.abs(node.position.y)>1000000)) throw new TreeError('无效的节点位置');
  }
  // Linear-time cycle validation, including disconnected components.
  const complete = new Set();
  for (const first of Object.keys(graph.nodes)) {
    let id = first; const visiting = new Set();
    while (id !== null && !complete.has(id)) {
      if (visiting.has(id)) throw new TreeError('连线形成了循环');
      visiting.add(id); id = graph.nodes[id].parent;
    }
    for (const seen of visiting) complete.add(seen);
  }
  if (!graph.nodes[graph.active]) throw new TreeError('当前枝不存在');
  if(graph.pendingBranch!==undefined&&(!graph.pendingBranch||typeof graph.pendingBranch!=='object'))throw new TreeError('无效的待输入分支');
  if(graph.draftBranches!==undefined&&(!graph.draftBranches||typeof graph.draftBranches!=='object'||Array.isArray(graph.draftBranches)))throw new TreeError('无效的分支节点');
  const drafts=draftBranchesOf(graph);
  if(Object.keys(drafts).length+Object.keys(graph.nodes).length>20000)throw new TreeError('节点数量超过 20000');
  for(const [sessionId,pending]of Object.entries(drafts)){
    if(!pending || typeof pending.sessionId!=='string' || !Object.hasOwn(graph.bindings,pending.sessionId) || !Object.hasOwn(graph.nodes,pending.parent) || !Number.isFinite(pending.createdAt) || typeof pending.returnSessionId!=='string' || !Object.hasOwn(graph.bindings,pending.returnSessionId))throw new TreeError('无效的待输入分支');
    if(pending.sessionId!==sessionId || (pending.label!==undefined&&(typeof pending.label!=='string'||!pending.label.trim()||pending.label.length>200)))throw new TreeError('无效的分支节点');
    if(pending.position!==undefined&&(!pending.position || !Number.isFinite(pending.position.x) || !Number.isFinite(pending.position.y) || Math.abs(pending.position.x)>1000000 || Math.abs(pending.position.y)>1000000))throw new TreeError('无效的节点位置');
  }
  try{validateGroups(graph.nodes,graph.groups);}catch(error){throw new TreeError(error.message);}
  return graph;
}
const snapshot = graph => structuredClone({nodes: graph.nodes, active: graph.active, pendingBranch:graph.pendingBranch,draftBranches:graph.draftBranches,groups:graph.groups});
export function editGraph(original, operation) {
  if(typeof operation?.type!=='string')throw new TreeError('无效的编辑操作');
  const graph = structuredClone(original);
  if (operation.type === 'undo' || operation.type === 'redo') {
    const from = operation.type === 'undo' ? 'undo' : 'redo', to = from === 'undo' ? 'redo' : 'undo';
    const prior = graph[from].pop();
    if (!prior) throw new TreeError(from === 'undo' ? '没有可以撤销的操作' : '没有可以重做的操作');
    graph[to].push(snapshot(graph));
    Object.assign(graph, prior);
    if (prior.pendingBranch === undefined) delete graph.pendingBranch;
    if (prior.draftBranches === undefined) delete graph.draftBranches;
    if (prior.groups === undefined) delete graph.groups;
  } else if(operation.type.startsWith('group-')){
    if(!['group-toggle','group-toggle-all'].includes(operation.type)){graph.undo.push(snapshot(graph));graph.undo=graph.undo.slice(-30);graph.redo=[];}
    try{applyGroupEdit(graph,operation);}catch(error){throw new TreeError(error.message);}
  } else {
    // Normalize the legacy alias to the same object before editing positions or labels.
    if(graph.draftBranches&&graph.pendingBranch)graph.pendingBranch=graph.draftBranches[graph.pendingBranch.sessionId]??graph.pendingBranch;
    const draft=draftForNode(graph,operation.id),isPending=Boolean(draft),group=Object.hasOwn(graph.groups??{},operation.id)?graph.groups[operation.id]:null,node=draft??group??(Object.hasOwn(graph.nodes,operation.id)?graph.nodes[operation.id]:undefined);
    if (!node) throw new TreeError('节点不存在');
    if (isPending && !['move','rename'].includes(operation.type)) throw new TreeError('请通过节点菜单删除空分支');
    if(group&&!['move','rename'].includes(operation.type))throw new TreeError('请展开集合后操作内部节点');
    if (operation.type === 'delete' || operation.type === 'reparent') for(const draft of Object.values(draftBranchesOf(graph))){
      const pendingAncestors = new Set(pathTo(graph,draft.parent,false).map(n => n.id));
      if (pendingAncestors.has(operation.id)) throw new TreeError('请先完成或取消当前待输入分支，再修改其上游节点');
    }
    graph.undo.push(snapshot(graph));
    graph.undo = graph.undo.slice(-30); graph.redo = [];
    switch (operation.type) {
      case 'rename':
        if (typeof operation.label !== 'string' || !operation.label.trim() || operation.label.length > 200) throw new TreeError('名称需为 1–200 个字符');
        if(group){if(operation.label.trim().length>80)throw new TreeError('集合名称需为 1–80 个字符');group.name=operation.label.trim();}
        else{node.label = operation.label.trim(); node.labelMode = 'custom';}break;
      case 'move':
        if(group)moveGroupState(graph,group.id,{x:operation.position?.x,y:operation.position?.y});
        else node.position = {x:operation.position?.x,y:operation.position?.y};break;
      case 'reset-layout':
        for (const n of Object.values(graph.nodes)) delete n.position;
        for(const draft of Object.values(draftBranchesOf(graph)))delete draft.position;
        break;
      case 'arrange':
        arrangeVisibleGraph(graph,operation.includeInternal===true);
        break;
      case 'reparent':
        if (node.id === ROOT) throw new TreeError('不能修改对话起点的输入');
        if (operation.parent !== null && !Object.hasOwn(graph.nodes, operation.parent)) throw new TreeError('目标节点不存在');
        node.parent = operation.parent;
        pathTo(graph, node.id, false); break;
      case 'delete': {
        if (node.id === ROOT) throw new TreeError('不能删除对话起点');
        const removed = new Set([node.id]);
        if (operation.subtree) {
          // A single traversal supports deep and wide graphs without recursive stacks.
          const children = new Map();
          for (const n of Object.values(graph.nodes)) { const list = children.get(n.parent) ?? []; list.push(n.id); children.set(n.parent, list); }
          const queue = [node.id];
          for (let i = 0; i < queue.length; i++) for (const child of children.get(queue[i]) ?? []) { removed.add(child); queue.push(child); }
        } else {
          if (operation.grouped) {
            const queue=[node.id], children=new Map();
            for(const n of Object.values(graph.nodes)){const list=children.get(n.parent)??[];list.push(n);children.set(n.parent,list);}
            for(let i=0;i<queue.length;i++)for(const child of children.get(queue[i])??[])if(child.kind==='internal'){removed.add(child.id);queue.push(child.id);}
          }
          for (const n of Object.values(graph.nodes)) if (!removed.has(n.id) && removed.has(n.parent)) n.parent = node.parent;
        }
        for (const id of removed) delete graph.nodes[id];
        if (removed.has(graph.active)) graph.active = node.parent ?? ROOT;
        break;
      }
      default: throw new TreeError('未知的编辑操作');
    }
  }
  const removedCheckpoints=Object.values(original.nodes).filter(n=>n.kind==='compaction'&&!graph.nodes[n.id]).map(n=>n.compaction.id);
  if(removedCheckpoints.length)graph.deletedCompactions=[...new Set([...(graph.deletedCompactions??[]),...removedCheckpoints])];
  reconcileGroupState(graph);
  if(['group-create','group-toggle','group-toggle-all','group-dissolve','group-split','group-delete'].includes(operation.type))arrangeVisibleGraph(graph,operation.includeInternal===true);
  for(const draft of Object.values(draftBranchesOf(graph)))if(!graph.nodes[draft.parent]||!graph.bindings[draft.sessionId]||!graph.bindings[draft.returnSessionId]||graph.bindings[draft.sessionId].head!==draft.parent)removeDraftBranch(graph,draft.sessionId);
  graph.revision++;
  return validateGraph(graph);
}
export function publicGraph(graph) {
  return {...graph, undo: undefined, redo: undefined, canUndo: graph.undo.length > 0, canRedo: graph.redo.length > 0};
}
export function assertRevision(graph, revision) {
  if (revision !== graph.revision) throw new TreeError('对话树已经更新，已重新读取；请再操作一次', 409);
}
