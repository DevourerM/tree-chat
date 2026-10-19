import {draftBranchesOf} from './branches.js';
/** Project internal rounds onto human-input cards without removing context events. */
export function conversationView(graph, all = false) {
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
