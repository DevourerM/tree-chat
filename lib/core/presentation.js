import {draftBranchesOf} from './branches.js';
import {projectConversationView} from './groups.js';
import {arrangedPositions} from './layout.js';
/** Project internal rounds onto human-input cards without removing context events. */
export function conversationBaseView(graph, all = false) {
  const owners = new Map(), children = new Map(), nodes = {};
  for (const n of Object.values(graph.nodes)) {
    const list = children.get(n.parent) ?? []; list.push(n.id); children.set(n.parent, list);
  }
  const visible = id => all || id === 'root' || graph.nodes[id].kind !== 'internal';
  // Resolve each hidden chain once, including detached components.
  for (const first of Object.keys(graph.nodes)) {
    let id = first; const pending = [];
    while (id !== null && !owners.has(id) && !visible(id)) {pending.push(id);id=graph.nodes[id].parent;}
    const owner = id === null ? null : owners.get(id) ?? id;
    if (id !== null && visible(id)) owners.set(id,id);
    for (const item of pending) owners.set(item,owner);
    if (visible(first)) owners.set(first,first);
  }
  const targets = new Map();
  for (const n of Object.values(graph.nodes)) if (visible(n.id)) {
    nodes[n.id] = {...n, parent:n.parent === null ? null : owners.get(n.parent) ?? null};
    let target=n.id;
    while (children.get(target)?.length === 1 && !visible(children.get(target)[0])) target=children.get(target)[0];
    targets.set(n.id,target);
  }
  for(const p of Object.values(draftBranchesOf(graph)))if(Object.hasOwn(graph.nodes,p.parent)){
    const id=`pending:${p.sessionId}`;
    nodes[id]={id,parent:owners.get(p.parent)??p.parent,label:p.label||'新分支',kind:'pending',createdAt:p.createdAt,...(p.position?{position:p.position}:{})};
    owners.set(id,id);targets.set(id,p.parent);
  }
  return {graph:{...graph,nodes},owners,targets};
}

export function conversationView(graph,all=false,query=''){
  const base=conversationBaseView(graph,all);
  if(!Object.keys(graph.groups??{}).length)return {...base,groupMembership:new Map()};
  const groups={};let revealed=false;
  for(const [id,g]of Object.entries(graph.groups)){
    const nodeIds=g.nodeIds.filter(n=>base.graph.nodes[n]);
    const match=query.trim().toLowerCase();
    const reveal=match&&!g.name.toLowerCase().includes(match)&&g.nodeIds.some(n=>graph.nodes[n]?.label.toLowerCase().includes(match));
    if(reveal&&g.collapsed)revealed=true;
    if(nodeIds.length)groups[id]={...g,collapsed:reveal?false:g.collapsed,nodeIds,entryId:nodeIds.includes(g.entryId)?g.entryId:nodeIds[0]};
  }
  const projected=projectConversationView({...base.graph,groups,activeNodeId:graph.active});
  const owners=new Map(),targets=new Map(base.targets);
  for(const [id,owner]of base.owners)owners.set(id,projected.owners.get(owner)??owner);
  for(const [id,g]of Object.entries(groups))if(g.collapsed)for(const member of graph.groups[id].nodeIds)owners.set(member,id);
  const drafts=draftBranchesOf(graph);
  for(const [id,node]of Object.entries(projected.viewItems)){
    const parent=node.kind==='group'?graph.nodes[graph.groups[id].entryId].parent:graph.nodes[id]?.parent??(id.startsWith('pending:')?drafts[id.slice(8)]?.parent:null);
    node.parent=parent===null?null:owners.get(parent)??parent??null;
  }
  for(const [id,target]of projected.targets)if(groups[id])targets.set(id,base.targets.get(target.primaryExitNodeId)??target.primaryExitNodeId);
  if(revealed){
    const arranged=arrangedPositions({nodes:projected.viewItems});
    for(const [id,position]of Object.entries(arranged))projected.viewItems[id]={...projected.viewItems[id],position};
  }
  return {graph:{...graph,nodes:projected.viewItems},owners,targets,groupMembership:projected.groupMembership};
}
