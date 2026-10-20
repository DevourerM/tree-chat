window.__ModuleLoader__.load({id:'tree-chat',factory:(require)=>{
const React=require('react');
const CSS=".st-root {\n  --st-bg:var(--dsw-alias-bg-base,#fafafa);\n  --st-card:var(--dsw-alias-bg-layer-1,#fff);\n  --st-text:var(--dsw-alias-label-primary,#202124);\n  --st-secondary:var(--dsw-alias-label-secondary,#62646b);\n  --st-muted:var(--dsw-alias-label-tertiary,#8a8c94);\n  --st-line:var(--dsw-alias-border-l1,#e5e6e9);\n  --st-border:var(--dsw-alias-border-l2,#d9dbe1);\n  --st-hover:var(--dsw-alias-interactive-bg-hover,#eceef2);\n  --st-accent:var(--dsw-static-deepseek-500,#4c6ef5);\n  --st-soft:color-mix(in srgb,var(--st-accent) 16%,transparent);\n  display:flex;\n  flex-direction:column;\n  position:relative;\n  width:100%;\n  height:100%;\n  min-height:0;\n  overflow:hidden;\n  color:var(--st-text);\n  background:var(--st-bg);\n  font:inherit;\n  font-size:13px;\n  line-height:18px\n}\n.st-root,.st-root * {\n  box-sizing:border-box\n}\n.st-root button,.st-root input {\n  font:inherit\n}\n.st-root button {\n  cursor:pointer\n}\n.st-root button:disabled {\n  cursor:default;\n  opacity:.4\n}\n.st-root :is(button,input,[tabindex]):focus-visible {\n  outline:2px solid var(--st-accent);\n  outline-offset:2px\n}\n.st-root .st-button {\n  display:inline-flex;\n  align-items:center;\n  justify-content:center;\n  flex-shrink:0;\n  gap:6px;\n  width:28px;\n  height:28px;\n  padding:0;\n  border:0;\n  border-radius:6px;\n  color:var(--st-secondary);\n  background:transparent\n}\n.st-root .st-button:hover:not(:disabled) {\n  background:var(--st-hover);\n  color:var(--st-text)\n}\n.st-root .st-button[aria-pressed=true] {\n  color:var(--st-accent);\n  background:var(--st-soft)\n}\n.st-root .st-node-body { cursor:grab }\n.st-root .st-node-body:active,.st-root .st-node-dragging { cursor:grabbing }\n.st-root .st-node.st-moving { z-index:5; transition:none; box-shadow:0 0 0 3px var(--st-soft),0 8px 24px #00000018 }\n.st-root .st-labeled {\n  width:auto;\n  padding:0 10px;\n  white-space:nowrap\n}\n.st-root .st-primary {\n  color:#fff;\n  background:var(--st-accent)\n}\n.st-root .st-primary:hover:not(:disabled) {\n  color:#fff;\n  background:var(--st-accent);\n  filter:brightness(1.08)\n}\n/* Native sidebar toolbar;\nno duplicate panel heading. */\n.st-root .st-toolbar {\n  display:flex;\n  align-items:center;\n  gap:4px;\n  height:40px;\n  padding:0 8px;\n  border-bottom:1px solid var(--st-line);\n  flex:none\n}\n.st-root .st-search {\n  display:flex;\n  align-items:center;\n  gap:6px;\n  color:var(--st-muted);\n  height:28px;\n  flex:1;\n  min-width:0;\n  padding:0 8px;\n  margin-right:auto;\n  background:var(--st-card);\n  border:1px solid transparent;\n  border-radius:6px\n}\n.st-root .st-search:focus-within {\n  border-color:var(--st-accent)\n}\n.st-root .st-search input {\n  border:0;\n  background:transparent;\n  outline:0;\n  color:var(--st-text);\n  width:100%;\n  min-width:0;\n  font-size:12px\n}\n.st-root .st-search input::placeholder {\n  color:var(--st-muted)\n}\n.st-root .st-error,.st-root .st-notice {\n  padding:8px 12px;\n  font-size:12px;\n  line-height:18px;\n  flex:none\n}\n.st-root .st-error {\n  display:flex;\n  align-items:center;\n  gap:6px;\n  background:color-mix(in srgb,#dc6363 10%,var(--st-bg));\n  color:var(--dsw-alias-state-error-primary,#ce5959)\n}\n.st-root .st-error span {\n  flex:1;\n  overflow-wrap:anywhere\n}\n.st-root .st-notice {\n  background:color-mix(in srgb,#cf9c42 9%,var(--st-bg))\n}\n/* World coordinates stay stable across zoom and level-of-detail changes. */\n.st-root .st-canvas {\n  flex:1;\n  min-height:120px;\n  position:relative;\n  overflow:hidden;\n  touch-action:none;\n  user-select:none;\n  cursor:grab;\n  background-image:radial-gradient(circle,color-mix(in srgb,var(--st-muted) 24%,transparent) .8px,transparent 1px)\n}\n.st-root .st-canvas:active {\n  cursor:grabbing\n}\n.st-root .st-world {\n  position:absolute;\n  left:0;\n  top:0;\n  transform-origin:0 0;\n  will-change:transform\n}\n.st-root .st-wires {\n  position:absolute;\n  left:0;\n  top:0;\n  overflow:visible;\n  pointer-events:none\n}\n.st-root .st-wire {\n  fill:none;\n  stroke:var(--st-border);\n  stroke-width:1.5;\n  vector-effect:non-scaling-stroke\n}\n.st-root .st-wire-active {\n  stroke:var(--st-accent);\n  stroke-width:1.75\n}\n.st-root .st-node {\n  width:var(--node-w);\n  height:var(--node-h);\n  position:absolute;\n  transform:translate(-50%,-50%);\n  background:var(--st-card);\n  border:1px solid var(--st-border);\n  border-radius:8px;\n  cursor:pointer;\n  color:var(--st-secondary);\n  transition:border-color .12s,box-shadow .12s,opacity .12s\n}\n.st-root .st-node::before {\n  content:'';\n  position:absolute;\n  left:-1px;\n  top:8px;\n  bottom:8px;\n  width:3px;\n  border-radius:0 2px 2px 0;\n  background:transparent\n}\n.st-root .st-node:hover {\n  border-color:var(--st-muted);\n  background:var(--st-hover)\n}\n.st-root .st-onpath {\n  color:var(--st-text)\n}\n.st-root .st-node.st-selected {\n  border-color:var(--st-accent);\n  box-shadow:0 0 0 3px var(--st-soft)\n}\n.st-root .st-node.st-current::before {\n  background:var(--st-accent)\n}\n.st-root .st-dim {\n  opacity:.28\n}\n.st-root .st-detached {\n  border-style:dashed\n}\n.st-root .st-node-body {\n  display:flex;\n  align-items:center;\n  width:100%;\n  height:100%;\n  padding:0 54px 0 14px;\n  color:inherit;\n  text-align:left;\n  background:transparent;\n  border:0;\n  border-radius:inherit;\n  overflow:hidden\n}\n.st-root .st-node-title {\n  font-size:13px;\n  line-height:18px;\n  font-weight:400;\n  white-space:nowrap;\n  text-overflow:ellipsis;\n  overflow:hidden\n}\n.st-root .st-origin {\n  border-radius:999px;\n  color:var(--st-secondary)\n}\n.st-root .st-origin .st-node-body {\n  justify-content:center;\n  padding:0 28px 0 12px;\n  text-align:center\n}\n.st-root .st-origin::before {\n  display:none\n}\n.st-root .st-node-controls {\n  position:absolute;\n  right:4px;\n  top:50%;\n  transform:translateY(-50%);\n  display:flex;\n  align-items:center;\n  gap:2px;\n  opacity:0;\n  pointer-events:none;\n  transition:opacity .12s\n}\n.st-root .st-node:is(:hover,:focus-within,.st-selected,.st-pending) .st-node-controls {\n  opacity:1;\n  pointer-events:auto\n}\n.st-root .st-node-controls .st-button {\n  width:22px;\n  height:24px;\n  border-radius:5px;\n  background:var(--st-card);\n  color:var(--st-secondary)\n}\n.st-root .st-node-controls .st-button:hover:not(:disabled) {\n  background:var(--st-hover);\n  color:var(--st-text)\n}\n.st-root .st-node-flag {\n  display:none\n}\n.st-root .st-lod {\n  background-image:none\n}\n.st-root .st-lod .st-node {\n  width:12px;\n  height:12px;\n  border-radius:50%\n}\n.st-root .st-lod .st-onpath {\n  background:var(--st-accent);\n  border-color:var(--st-accent)\n}\n.st-root .st-lod .st-node :is(.st-node-body,.st-node-controls),.st-root .st-lod .st-node::before {\n  display:none\n}\n.st-root .st-lod :is(.st-selected,.st-current,.st-origin) .st-node-flag {\n  display:block;\n  position:absolute;\n  left:20px;\n  top:50%;\n  transform:translateY(-50%) scale(calc(1 / var(--st-zoom,1)));\n  transform-origin:left center;\n  max-width:160px;\n  overflow:hidden;\n  text-overflow:ellipsis;\n  white-space:nowrap;\n  color:var(--st-text);\n  font-size:12px;\n  pointer-events:none\n}\n.st-root .st-canvas-tools {\n  position:absolute;\n  bottom:8px;\n  left:8px;\n  display:flex;\n  align-items:center;\n  height:30px;\n  padding:0 2px;\n  background:var(--st-card);\n  border:1px solid var(--st-border);\n  border-radius:8px;\n  cursor:default\n}\n.st-root .st-canvas-tools span {\n  font-size:11px;\n  color:var(--st-secondary);\n  min-width:38px;\n  text-align:center;\n  font-variant-numeric:tabular-nums\n}\n.st-root .st-canvas-tools i {\n  height:14px;\n  width:1px;\n  background:var(--st-line);\n  margin:0 3px\n}\n.st-root .st-empty {\n  position:absolute;\n  left:20px;\n  right:20px;\n  bottom:70px;\n  text-align:center;\n  pointer-events:none;\n  color:var(--st-muted);\n  font-size:12px\n}\n.st-root .st-node-menu {\n  position:absolute;\n  max-height:calc(100% - 16px);\n  overflow:auto;\n  z-index:8;\n  min-width:168px;\n  background:var(--st-card);\n  border:1px solid var(--st-border);\n  padding:4px;\n  border-radius:8px;\n  box-shadow:0 6px 20px #00000020;\n  display:flex;\n  flex-direction:column\n}\n.st-root .st-node-menu button {\n  border:0;\n  background:transparent;\n  text-align:left;\n  padding:6px 8px;\n  border-radius:6px;\n  color:var(--st-text);\n  font-size:12px\n}\n.st-root .st-node-menu button:hover {\n  background:var(--st-hover)\n}\n.st-root .st-node-menu .st-danger {\n  color:var(--dsw-alias-state-error-primary,#ce5959)\n}\n.st-root .st-rename {\n  display:flex;\n  gap:6px;\n  padding:0 0 8px\n}\n.st-root .st-rename input {\n  width:0;\n  flex:1;\n  border:1px solid var(--st-border);\n  border-radius:6px;\n  padding:5px;\n  background:var(--st-bg);\n  color:var(--st-text)\n}\n.st-root .st-rename button {\n  border:0;\n  border-radius:6px;\n  background:var(--st-accent);\n  color:#fff;\n  padding:0 10px\n}\n.st-root .st-confirm {\n  border:1px solid var(--st-border);\n  background:var(--st-card);\n  border-radius:8px;\n  padding:10px;\n  font-size:12px;\n  margin:0 0 8px;\n  overflow:auto\n}\n.st-root .st-confirm strong {\n  font-weight:500\n}\n.st-root .st-confirm p {\n  font-size:12px;\n  color:var(--st-muted);\n  line-height:18px;\n  margin:7px 0\n}\n.st-root .st-confirm-actions {\n  display:flex;\n  gap:3px;\n  flex-wrap:wrap\n}\n.st-root.st-loading {\n  align-items:center;\n  justify-content:center;\n  color:var(--st-muted)\n}\n.st-header-button {\n  display:inline-flex;\n  align-items:center;\n  gap:5px;\n  min-height:28px;\n  padding:4px 7px;\n  font:inherit;\n  font-size:12px;\n  color:var(--dsw-alias-label-tertiary,#8a8c94);\n  background:transparent;\n  border:0;\n  border-radius:7px;\n  cursor:pointer;\n  white-space:nowrap\n}\n.st-header-button:hover {\n  background:var(--dsw-alias-interactive-bg-hover,#eceef2);\n  color:var(--dsw-alias-label-primary,#202124)\n}\n@media(prefers-reduced-motion:reduce) {\n  .st-root * {\n    transition:none!important\n  }\n}\n\n@media(hover:none),(pointer:coarse) {\n  .st-root .st-node-controls {opacity:1;pointer-events:auto}\n}\n.st-root[data-size=s] .st-toolbar .st-labeled {padding:0 7px;font-size:12px}\n.st-root .st-node-menu button {display:flex;align-items:center;gap:8px;min-height:30px}\n.st-root .st-node-menu button kbd {margin-left:auto;color:var(--st-muted);font:inherit;font-size:11px}\n.st-root .st-node-menu hr {border:0;border-top:1px solid var(--st-line);margin:4px 0}\n.st-root .st-dialog {position:absolute;z-index:9;left:12px;right:12px;bottom:12px;box-shadow:0 6px 24px #00000020}\n.st-root .st-group {border-color:color-mix(in srgb,var(--st-accent) 32%,var(--st-border));background:color-mix(in srgb,var(--st-accent) 5%,var(--st-card))}\n.st-root .st-group .st-node-body {padding-right:76px}\n.st-root .st-group-count {position:absolute;right:54px;top:50%;transform:translateY(-50%);font-size:10px;line-height:17px;min-width:19px;text-align:center;color:var(--st-muted);background:var(--st-hover);border-radius:4px;pointer-events:none}\n.st-root .st-group-tag {position:absolute;left:5px;top:-14px;max-width:140px;height:18px;padding:0 5px;border:1px solid var(--st-border);border-radius:4px;background:var(--st-card);color:var(--st-muted);font-size:10px;line-height:16px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;z-index:2}\n.st-root .st-group-tag:hover {color:var(--st-accent);border-color:var(--st-accent)}\n.st-root .st-group-dialog {display:flex;flex-direction:column;gap:12px;padding:14px;background:var(--st-card);border:1px solid var(--st-border);border-radius:10px;max-height:calc(100% - 24px);overflow:auto}\n.st-root .st-group-dialog label {display:flex;flex-direction:column;gap:6px;color:var(--st-secondary);font-size:12px}\n.st-root .st-group-dialog input,.st-root .st-group-dialog select {width:100%;min-width:0;padding:7px 8px;color:var(--st-text);background:var(--st-bg);border:1px solid var(--st-border);border-radius:6px}\n.st-root .st-dialog-actions {display:flex;justify-content:flex-end;gap:8px}\n.st-root .st-dialog-actions button {padding:5px 12px;border:1px solid var(--st-border);border-radius:6px;background:var(--st-card);color:var(--st-text)}\n.st-root .st-dialog-actions button[type=submit] {background:var(--st-accent);color:#fff;border-color:var(--st-accent)}\n.st-root .st-rename {padding:12px;background:var(--st-card);border:1px solid var(--st-border);border-radius:8px}\n.st-root .st-box-select {cursor:crosshair}\n.st-root .st-selection-box {position:absolute;z-index:6;pointer-events:none;border:1px solid var(--st-accent);background:var(--st-soft);border-radius:3px}\n.st-root[data-size=s] .st-toolbar .st-labeled {font-size:0;width:28px;padding:0;gap:0}\n";
/** Read legacy single-branch data alongside persistent empty branches. */
function draftBranchesOf(graph) {
  const branches = {...graph.draftBranches};
  if (graph.pendingBranch && !branches[graph.pendingBranch.sessionId]) branches[graph.pendingBranch.sessionId] = graph.pendingBranch;
  return branches;
}
function draftForNode(graph, id) {
  return typeof id === 'string' && id.startsWith('pending:') ? draftBranchesOf(graph)[id.slice(8)] : undefined;
}
function setDraftBranch(graph, branch) {
  graph.draftBranches = draftBranchesOf(graph);
  graph.draftBranches[branch.sessionId] = branch;
  graph.pendingBranch = branch; // Compatibility with existing persisted graphs and clients.
}
function removeDraftBranch(graph, sessionId) {
  graph.draftBranches = draftBranchesOf(graph);
  delete graph.draftBranches[sessionId];
  if (graph.pendingBranch?.sessionId === sessionId) delete graph.pendingBranch;
}

const NODE_SIZES = {s:{width:168,height:40},m:{width:188,height:44},l:{width:200,height:44}};
const COLUMN = 228, STEP = 80;

/** Clamp a newly selected card into the viewport after a native pane transition. */
function nodeVisibleView(view,position,width,height,pad=12){
  const z=view.zoom,left=view.x+(position.cx-position.width/2)*z,right=left+position.width*z;
  const top=view.y+(position.cy-position.height/2)*z,bottom=top+position.height*z;
  const x=view.x+(left<pad?pad-left:right>width-pad?width-pad-right:0);
  const y=view.y+(top<pad?pad-top:bottom>height-pad?height-pad-bottom:0);
  return x===view.x&&y===view.y?view:{...view,x,y};
}

function treePositions(graph, compare) {
  const children=new Map();
  for(const node of Object.values(graph.nodes)){
    const list=children.get(node.parent)??[];list.push(node);children.set(node.parent,list);
  }
  if(compare)for(const list of children.values())list.sort(compare);
  const roots=children.get(null)??[],order=[],stack=roots.map(node=>({node,depth:0})).reverse();
  while(stack.length){const item=stack.pop();order.push(item);for(const node of [...(children.get(item.node.id)??[])].reverse())stack.push({node,depth:item.depth+1});}
  const spans=new Map();
  for(let i=order.length-1;i>=0;i--)spans.set(order[i].node.id,Math.max(1,(children.get(order[i].node.id)??[]).reduce((sum,n)=>sum+spans.get(n.id),0)));
  let cursor=0;const positions=new Map();
  const place=roots.map(node=>{const from=cursor;cursor+=spans.get(node.id);return {node,from,depth:0};}).reverse();
  while(place.length){
    const {node,from,depth}=place.pop(),span=spans.get(node.id);
    positions.set(node.id,{x:24+(from+span/2)*COLUMN,y:30+depth*STEP,depth});
    let offset=from;for(const child of children.get(node.id)??[]){place.push({node:child,from:offset,depth:depth+1});offset+=spans.get(child.id);}
  }
  return positions;
}

/** One logical coordinate system across all sidebar sizes and Host operations. */
function layoutGraph(graph,size='l',moving={}) {
  const metrics=NODE_SIZES[size]??NODE_SIZES.l,positions=new Map();
  for(const [id,automatic]of treePositions(graph)){
    const node=graph.nodes[id],position=moving[id]??node.position??automatic;
    const width=id==='root'?88:metrics.width,height=id==='root'?30:metrics.height;
    positions.set(id,{x:position.x-width/2,y:position.y-height/2,cx:position.x,cy:position.y,width,height,node,depth:automatic.depth});
  }
  let left=0,top=0,right=240,bottom=120;
  for(const p of positions.values()){left=Math.min(left,p.x-24);top=Math.min(top,p.y-24);right=Math.max(right,p.x+p.width+24);bottom=Math.max(bottom,p.y+p.height+30);}
  return {positions,left,top,width:right-left,height:bottom-top};
}

/** Compact the tree while retaining the left/right order the user has drawn. */
function arrangedPositions(graph) {
  const current=layoutGraph(graph).positions;
  const children=new Map();
  for(const n of Object.values(graph.nodes)){const list=children.get(n.parent)??[];list.push(n.id);children.set(n.parent,list);}
  const order=[],stack=[...(children.get(null)??[])];
  while(stack.length){const id=stack.pop();order.push(id);for(const child of children.get(id)??[])stack.push(child);}
  const branches=new Map();
  for(let i=order.length-1;i>=0;i--){
    const id=order[i];let sum=current.get(id).cx,count=1;
    for(const child of children.get(id)??[]){const b=branches.get(child);sum+=b.sum;count+=b.count;}
    branches.set(id,{sum,count});
  }
  const positions=treePositions(graph,(a,b)=>{
    const pa=current.get(a.id),pb=current.get(b.id),ba=branches.get(a.id),bb=branches.get(b.id);
    return pa.cx-pb.cx||ba.sum/ba.count-bb.sum/bb.count||pa.cy-pb.cy||a.id.localeCompare(b.id);
  });
  const anchor=current.get('root'),root=positions.get('root');
  const dx=anchor&&root?anchor.cx-root.x:0,dy=anchor&&root?anchor.cy-root.y:0;
  return Object.fromEntries([...positions].map(([id,p])=>[id,{x:p.x+dx,y:p.y+dy}]));
}

/** Find the closest free horizontal slot below the actual parent, not its old slot. */
function nextNodePosition(graph,parentId) {
  return new PlacementIndex(layoutGraph(graph).positions).next(parentId);
}

/** Reuse spatial rows across a batch of imported turns instead of rebuilding the tree per turn. */
class PlacementIndex {
  constructor(positions){
    this.positions=new Map();this.rows=new Map();
    for(const [id,p]of positions)this.add(id,{x:p.cx,y:p.cy});
  }
  add(id,position){
    // Promotion of a durable empty branch keeps its existing slot.
    if(this.positions.has(id))return;
    const p={cx:position.x,cy:position.y},row=Math.floor(p.cy/STEP);
    this.positions.set(id,p);const list=this.rows.get(row)??[];list.push(p);this.rows.set(row,list);
  }
  next(parentId){
    const parent=this.positions.get(parentId);
    if(!parent)throw new Error('找不到新节点的父节点');
    const y=parent.cy+STEP,row=Math.floor(y/STEP),blocked=[];
    for(let r=row-1;r<=row+1;r++)for(const p of this.rows.get(r)??[])if(Math.abs(p.cy-y)<68)blocked.push(p);
  const candidates=[parent.cx,...blocked.flatMap(p=>[p.cx+COLUMN,p.cx-COLUMN])];
  candidates.sort((a,b)=>Math.abs(a-parent.cx)-Math.abs(b-parent.cx)||b-a);
  const x=candidates.find(x=>blocked.every(p=>Math.abs(p.cx-x)>=COLUMN-0.01));
  return {x,y};
  }
}

// groups.js - Pure JavaScript Core for tree-chat 1.0 Node Groups

/**
 * 内部工具：获取从节点到 root 的祖先链（含自身，索引 0 为自身）
 */
function getAncestorChain(nodes, nodeId, rootId = 'root') {
  const chain = [];
  const visited = new Set();
  let curr = nodeId;
  while (curr && nodes[curr] && !visited.has(curr)) {
    visited.add(curr);
    chain.push(curr);
    if (curr === rootId) break;
    curr = nodes[curr].parent;
  }
  return chain;
}

/**
 * 1. Shift 路径选择计算
 * 若 A 是 B 的祖先或反之，返回有向路径；若在不同分支，返回通过 LCA（不含 root）的连通路径
 */
function getShiftSelectionPath(nodes, anchorId, targetId, rootId = 'root') {
  if (!nodes[anchorId] || !nodes[targetId]) return [];
  if (anchorId === rootId || targetId === rootId) return [];
  if (anchorId === targetId) return [anchorId];

  const chainA = getAncestorChain(nodes, anchorId, rootId);
  const setA = new Set(chainA);
  const chainB = getAncestorChain(nodes, targetId, rootId);

  let lca = null;
  const pathB = [];
  for (const id of chainB) {
    pathB.push(id);
    if (setA.has(id)) {
      lca = id;
      break;
    }
  }
  // 跨分支且最近公共祖先是 root 时，不允许连选（因为集合不能包含 root）
  if (!lca || lca === rootId) return [];

  const pathA = [];
  for (const id of chainA) {
    if (id === lca) break;
    pathA.push(id);
  }
  return [...pathA, ...pathB];
}

/**
 * 2. 校验节点集合是否满足“不含 root、>=2 节点、单入口连通子树（不跨未选中间节点）”
 * 返回 { ok, reason, entryId, orderedNodeIds }
 */
function validateGroupCandidate(nodes, candidateIds, rootId = 'root') {
  const memberSet = new Set(candidateIds);
  if (memberSet.has(rootId)) {
    return { ok: false, reason: '集合不能包含 root 节点' };
  }
  if (memberSet.size < 2) {
    return { ok: false, reason: '集合至少需要包含 2 个节点' };
  }

  const entries = [];
  for (const id of memberSet) {
    const node = nodes[id];
    if (!node) {
      return { ok: false, reason: `节点 ${id} 不存在` };
    }
    if (!memberSet.has(node.parent)) {
      entries.push(id);
    }
  }

  if (entries.length === 0) {
    return { ok: false, reason: '检测到非法环路，无入口节点' };
  }
  if (entries.length > 1) {
    return {
      ok: false,
      reason: '所选节点不连通，或跨过了未选中的中间分叉节点（存在多个入口）',
      entries
    };
  }

  const entryId = entries[0];

  // 构建原树子表（保持原树兄弟节点的左右顺序：按 position.x 升序，次选 id）
  const childrenMap = new Map();
  for (const id of memberSet) {
    const p = nodes[id].parent;
    if (memberSet.has(p)) {
      if (!childrenMap.has(p)) childrenMap.set(p, []);
      childrenMap.get(p).push(id);
    }
  }
  for (const list of childrenMap.values()) {
    list.sort((a, b) => {
      const ax = nodes[a]?.position?.x ?? 0;
      const bx = nodes[b]?.position?.x ?? 0;
      return ax !== bx ? ax - bx : String(a).localeCompare(String(b));
    });
  }

  // DFS 遍历校验可达性并生成稳定拓扑序
  const orderedNodeIds = [];
  const stack = [entryId];
  const visited = new Set();
  while (stack.length > 0) {
    const curr = stack.pop();
    if (visited.has(curr)) continue;
    visited.add(curr);
    orderedNodeIds.push(curr);
    const ch = childrenMap.get(curr) || [];
    for (let i = ch.length - 1; i >= 0; i--) {
      stack.push(ch[i]);
    }
  }

  if (orderedNodeIds.length !== memberSet.size) {
    return { ok: false, reason: '集合内部存在不可达的孤立环' };
  }

  return { ok: true, entryId, orderedNodeIds };
}

/**
 * 3. 创建集合（支持纯节点选择，若选中了已有集合的成员且开启 absorbExisting，可打散旧集合重组的）
 */
function createGroup(state, selectedNodeIds, options = {}) {
  const { nodes, groups = {}, root = 'root' } = state;
  const {
    id = `grp_${Date.now().toString(36)}`,
    name = '未命名集合',
    absorbExisting = false
  } = options;

  // 检查是否与现有集合重叠
  const ownerMap = new Map();
  for (const [gid, g] of Object.entries(groups)) {
    for (const nid of g.nodeIds) ownerMap.set(nid, gid);
  }

  const nextGroups = { ...groups };
  const targetIds = new Set(selectedNodeIds);

  for (const nid of selectedNodeIds) {
    const existingGid = ownerMap.get(nid);
    if (existingGid) {
      if (!absorbExisting) {
        return {
          ok: false,
          reason: `节点 ${nid} 已属于集合 "${groups[existingGid].name}"，不能重叠创建`
        };
      }
      // 若允许吸收合并已有集合，将整个旧集合并入候选并移除旧集合
      for (const m of groups[existingGid].nodeIds) targetIds.add(m);
      delete nextGroups[existingGid];
    }
  }

  const validation = validateGroupCandidate(nodes, targetIds, root);
  if (!validation.ok) return validation;

  const entryNode = nodes[validation.entryId];
  nextGroups[id] = {
    id,
    name: String(name).trim() || '未命名集合',
    nodeIds: validation.orderedNodeIds,
    entryId: validation.entryId,
    collapsed: true,
    position: entryNode?.position ? { ...entryNode.position } : { x: 0, y: 0 }
  };

  return { ok: true, groupId: id, groups: nextGroups };
}

/**
 * 4. 展开 / 折叠 / 重命名 / 取消集合
 */
function setGroupCollapsed(groups, groupId, collapsed) {
  const g = groups[groupId];
  if (!g) return groups;
  const nextCollapsed = collapsed === undefined ? !g.collapsed : Boolean(collapsed);
  if (g.collapsed === nextCollapsed) return groups;
  return { ...groups, [groupId]: { ...g, collapsed: nextCollapsed } };
}

function renameGroup(groups, groupId, newName) {
  const g = groups[groupId];
  if (!g) return groups;
  const trimmed = String(newName ?? '').trim();
  if (!trimmed) return groups;
  return { ...groups, [groupId]: { ...g, name: trimmed } };
}

function dissolveGroup(groups, groupId) {
  if (!groups[groupId]) return groups;
  const next = { ...groups };
  delete next[groupId];
  return next;
}

/**
 * 5. 切开内部边拆分集合（Split Group by Edge Cut）
 * 切断集合内部边 (parent -> cutNodeId)，以 cutNodeId 为界的下半子树成为第 2 个连通分量，其余为第 1 个。
 * 若任一分量节点数 < 2，该分量自动退化为普通未分组节点；>= 2 则形成独立集合。
 */
function splitGroupAtEdge(state, groupId, cutNodeId, options = {}) {
  const { nodes, groups = {}, root = 'root' } = state;
  const group = groups[groupId];
  if (!group) return { ok: false, reason: '集合不存在' };

  const memberSet = new Set(group.nodeIds);
  if (!memberSet.has(cutNodeId)) {
    return { ok: false, reason: '切点节点不在该集合内' };
  }
  if (cutNodeId === group.entryId) {
    return { ok: false, reason: '不能在集合入口节点的上方切断，请选择集合内部的连接边' };
  }

  // 收集集合内以 cutNodeId 为根的子树节点（下半部分）
  const children = new Map();
  for(const id of group.nodeIds){const p=nodes[id]?.parent,list=children.get(p)??[];list.push(id);children.set(p,list);}
  const lowerSet = new Set([cutNodeId]),queue=[cutNodeId];
  for(let i=0;i<queue.length;i++)for(const id of children.get(queue[i])??[])if(!lowerSet.has(id)){lowerSet.add(id);queue.push(id);}

  const upperIds = group.nodeIds.filter(id => !lowerSet.has(id));
  const lowerIds = group.nodeIds.filter(id => lowerSet.has(id));

  const nextGroups = { ...groups };
  delete nextGroups[groupId];

  const createdGroupIds = [];

  // 处理上半部分（保持原 groupId 或可复用）
  if (upperIds.length >= 2) {
    const vUpper = validateGroupCandidate(nodes, upperIds, root);
    if (vUpper.ok) {
      nextGroups[groupId] = {
        ...group,
        nodeIds: vUpper.orderedNodeIds,
        entryId: vUpper.entryId
      };
      createdGroupIds.push(groupId);
    }
  }

  // 处理下半部分
  if (lowerIds.length >= 2) {
    const vLower = validateGroupCandidate(nodes, lowerIds, root);
    if (vLower.ok) {
      const newId = options.newGroupId || `${groupId}_sub_${Date.now().toString(36)}`;
      const entryNode = nodes[vLower.entryId];
      nextGroups[newId] = {
        id: newId,
        name: options.newGroupName || `${group.name} (拆分)`,
        nodeIds: vLower.orderedNodeIds,
        entryId: vLower.entryId,
        collapsed: group.collapsed,
        position: entryNode?.position ? { ...entryNode.position } : { ...group.position }
      };
      createdGroupIds.push(newId);
    }
  }

  return {
    ok: true,
    groups: nextGroups,
    createdGroupIds,
    releasedNodeIds: [
      ...(upperIds.length < 2 ? upperIds : []),
      ...(lowerIds.length < 2 ? lowerIds : [])
    ]
  };
}

/**
 * 6. 底层节点删除/结构变更后的失效集合自愈（Reconcile / Repair）
 * 当底层删除了节点并完成 parent 桥接后调用此函数：
 * 自动剔除不存在的节点，并将断裂的集合按单根连通分量拆分为合法子集合，不足 2 个节点的自动解散。
 */
function reconcileGroupsAfterGraphChange(nodes, groups = {}, rootId = 'root') {
  const nextGroups = {};
  const globallyClaimed = new Set();
  const reserved=new Set(Object.keys(groups));let suffix=0;

  for (const [gid, group] of Object.entries(groups)) {
    const surviving = (group.nodeIds || []).filter(
      id => id !== rootId && Boolean(nodes[id]) && !globallyClaimed.has(id)
    );
    if (surviving.length < 2) continue;

    const memberSet = new Set(surviving);
    // 找出当前存活节点中所有 parent 不在 memberSet 内的入口点
    // 每个入口点自然引导一棵极大的单入口连通子树！
    const entries = surviving.filter(id => !memberSet.has(nodes[id].parent));
    const children=new Map();
    for(const id of surviving){const p=nodes[id].parent,list=children.get(p)??[];list.push(id);children.set(p,list);}

    let partIndex = 0;
    for (const entryId of entries) {
      // 收集属于该 entryId 的连通分量
      const comp = new Set([entryId]);
      const queue=[entryId];
      for(let i=0;i<queue.length;i++)for(const id of children.get(queue[i])??[])if(!comp.has(id)){comp.add(id);queue.push(id);}

      if (comp.size >= 2) {
        const check = validateGroupCandidate(nodes, comp, rootId);
        if (check.ok) {
          let targetGid=gid;
          if(partIndex>0){do{targetGid=`group:repaired-${++suffix}`;}while(reserved.has(targetGid));reserved.add(targetGid);}
          const entryPos = nodes[check.entryId]?.position;
          nextGroups[targetGid] = {
            ...group,
            id: targetGid,
            name: partIndex === 0 ? group.name : `${group.name.slice(0,72)} (${partIndex + 1})`,
            nodeIds: check.orderedNodeIds,
            entryId: check.entryId,
            position: partIndex === 0
              ? group.position
              : (entryPos ? { ...entryPos } : { ...group.position })
          };
          for (const id of check.orderedNodeIds) globallyClaimed.add(id);
          partIndex++;
        }
      }
    }
  }

  return nextGroups;
}

/**
 * 7. 视图投影映射（无缝对接现有 conversationView 的 owners / targets 机制）
 * - 绝不修改底层 nodes，只产出视图层可见节点、虚拟边、高亮与会话绑定映射。
 */
function projectConversationView(state) {
  const {
    nodes,
    groups = {},
    root = 'root',
    bindings = {},
    activeNodeId = null
  } = state;

  // owners: realNodeId -> viewItemId (折叠态下指向 groupId，展开或未分组指向自身 realNodeId)
  // groupMembership: realNodeId -> groupId (无论展开还是折叠，用于渲染展开态外框或角标)
  // targets: viewItemId -> { entryNodeId, primaryExitNodeId, nodeIds } (供双击或操作定位底层节点)
  const owners = new Map();
  const groupMembership = new Map();
  const targets = new Map();

  for (const [gid, g] of Object.entries(groups)) {
    for (const nid of g.nodeIds) {
      if (!nodes[nid]) continue;
      groupMembership.set(nid, gid);
      if (g.collapsed) {
        owners.set(nid, gid);
      } else {
        owners.set(nid, nid);
      }
    }
  }
  for (const nid of Object.keys(nodes)) {
    if (!owners.has(nid)) owners.set(nid, nid);
    targets.set(nid, {
      entryNodeId: nid,
      primaryExitNodeId: nid,
      nodeIds: [nid]
    });
  }

  // 构建原树子列表以保持严格的左右顺序
  const rawChildren = new Map();
  for (const [nid, node] of Object.entries(nodes)) {
    const p = node.parent;
    if (p && nodes[p]) {
      if (!rawChildren.has(p)) rawChildren.set(p, []);
      rawChildren.get(p).push(nid);
    }
  }
  for (const list of rawChildren.values()) {
    list.sort((a, b) => {
      const ax = nodes[a]?.position?.x ?? 0;
      const bx = nodes[b]?.position?.x ?? 0;
      return ax !== bx ? ax - bx : String(a).localeCompare(String(b));
    });
  }

  const viewItems = {};
  const viewChildren = new Map();
  const viewChildSets = new Map();

  // 登记所有折叠集合为代理视图节点，并计算其多出口、内部是否含分叉
  for (const [gid, g] of Object.entries(groups)) {
    const memberSet = new Set(g.nodeIds);
    const exitNodeIds = [];
    let hasInternalBranching = false;

    for (const nid of g.nodeIds) {
      const ch = rawChildren.get(nid) || [];
      const internalCh = ch.filter(c => memberSet.has(c));
      const externalCh = ch.filter(c => !memberSet.has(c));
      if (internalCh.length > 1) hasInternalBranching = true;
      if (internalCh.length === 0 || externalCh.length > 0) {
        exitNodeIds.push(nid);
      }
    }

    const primaryExitNodeId =
      (activeNodeId && memberSet.has(activeNodeId) ? activeNodeId : null) ||
      exitNodeIds[exitNodeIds.length - 1] ||
      g.entryId;

    targets.set(gid, {
      entryNodeId: g.entryId,
      primaryExitNodeId,
      nodeIds: g.nodeIds
    });

    if (g.collapsed) {
      const entryParent = nodes[g.entryId]?.parent ?? null;
      const viewParent = entryParent ? owners.get(entryParent) : null;
      viewItems[gid] = {
        id: gid,
        kind: 'group',
        label: g.name,
        count: g.nodeIds.length,
        parent: viewParent,
        position: g.position || nodes[g.entryId]?.position || { x: 0, y: 0 },
        hasInternalBranching,
        exitCount: exitNodeIds.length,
        nodeIds: g.nodeIds,
        entryId: g.entryId,
        primaryExitNodeId
      };
    }
  }

  // 登记所有可见的普通节点
  for (const [nid, node] of Object.entries(nodes)) {
    if (owners.get(nid) !== nid) continue; // 已被折叠进集合
    const viewParent = node.parent ? owners.get(node.parent) : null;
    viewItems[nid] = {
      ...node,
      viewKind: 'node',
      parent: viewParent,
      groupId: groupMembership.get(nid) || null
    };
  }

  // 按原树先序 DFS 扫描，组装每个视图节点的有序子节点列表（天然保留多出口分叉的左右相对顺序！）
  const visitedRaw = new Set();
  const stack=[...Object.keys(nodes).filter(id=>nodes[id].parent===null)].reverse();
  while(stack.length){
    const rawId=stack.pop();
    if (!nodes[rawId] || visitedRaw.has(rawId)) continue;
    visitedRaw.add(rawId);

    const vId = owners.get(rawId);
    const vParent = viewItems[vId]?.parent;
    if (vParent && vParent !== vId) {
      if (!viewChildren.has(vParent)) viewChildren.set(vParent, []);
      const list = viewChildren.get(vParent);
      const seen=viewChildSets.get(vParent)??new Set();
      if(!seen.has(vId)){list.push(vId);seen.add(vId);viewChildSets.set(vParent,seen);}
    }

    const ch = rawChildren.get(rawId) || [];
    for(let i=ch.length-1;i>=0;i--)stack.push(ch[i]);
  }

  // 投影活动高亮与 Session bindings
  const activeViewId = activeNodeId ? (owners.get(activeNodeId) || null) : null;
  const projectedBindings = {};
  for (const [sessionId, binding] of Object.entries(bindings)) {
    const headNodeId=typeof binding==='string'?binding:binding.head;
    projectedBindings[sessionId] = owners.get(headNodeId) || headNodeId;
  }

  return {
    viewItems,
    viewChildren,
    owners,
    targets,
    groupMembership,
    activeViewId,
    projectedBindings
  };
}

/**
 * 8. 辅助动作：搜索命中/跳转内部节点时自动展开对应集合
 * 以及：拖动折叠集合卡时同步平移其内部所有节点坐标
 */
function revealNodeInGroups(groups, targetNodeId) {
  let nextGroups = groups;
  for (const [gid, g] of Object.entries(groups)) {
    if (g.collapsed && g.nodeIds.includes(targetNodeId)) {
      nextGroups = setGroupCollapsed(nextGroups, gid, false);
    }
  }
  return nextGroups;
}

function moveGroupWithMembers(state, groupId, newPosition) {
  const { nodes, groups = {} } = state;
  const g = groups[groupId];
  if (!g) return state;

  const oldPos = g.position || nodes[g.entryId]?.position || { x: 0, y: 0 };
  const dx = newPosition.x - oldPos.x;
  const dy = newPosition.y - oldPos.y;

  const nextNodes = { ...nodes };
  for (const nid of g.nodeIds) {
    if (!nextNodes[nid]) continue;
    const p = nextNodes[nid].position || { x: 0, y: 0 };
    nextNodes[nid] = {
      ...nextNodes[nid],
      position: { x: p.x + dx, y: p.y + dy }
    };
  }

  const nextGroups = {
    ...groups,
    [groupId]: { ...g, position: { ...newPosition } }
  };

  return { ...state, nodes: nextNodes, groups: nextGroups };
}

/** Project internal rounds onto human-input cards without removing context events. */
function conversationBaseView(graph, all = false) {
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

function conversationView(graph,all=false,query=''){
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

/** DSH 0.2 navigation adapter. Only the data-attribute lookup depends on chat markup. */
function navigationHeaderOptions(ctx) {
  const store=ctx.slots.entries('conversation.session.header').find(entry=>entry.store)?.store;
  if(!store)throw new Error('tree-chat: DSH 未提供会话视图存储');
  return {store,inject:(sessionId,actions)=>({ctx,selectView(view){ctx.uiConversation.binding(sessionId).activate(view);actions.setView(view);}})};
}
function createChatNavigator(ctx, headers) {
  let controller, landing, timer;
  const cancel=()=>controller?.abort();
  const clearLanding=()=>{clearTimeout(timer);landing?.removeAttribute('data-tree-chat-landing');landing=null;};
  const waitFor=async(signal,read,message='无法定位聊天记录，请确认 DSH 已加载该对话')=>{
    const deadline=Date.now()+10000;
    while(!signal.aborted){const value=read();if(value)return value;if(Date.now()>deadline)throw new Error(message);await new Promise(r=>setTimeout(r,32));}
    signal.throwIfAborted();
  };
  async function activateChat(sessionId,signal){
    ctx.sidebarRight.openTabIn?.(sessionId, 'conversation-tree');
    ctx.uiWorkspace.openSession(sessionId);
    const header=await waitFor(signal,()=>headers.get(sessionId));
    if(typeof header.selectView!=='function')throw new Error('此 DSH 版本未提供聊天视图切换能力');
    header.selectView('chat');
    return waitFor(signal,()=>{const b=ctx.sessions.binding(sessionId);return b?.session?.getSnapshot().openState==='open'?b:null;});
  }
  async function compose(sessionId){
    cancel();clearLanding();
    const request=new AbortController();controller=request;const {signal}=request;
    const binding=await activateChat(sessionId,signal);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));signal.throwIfAborted();
    const input=ctx.get?.('conversation')?.input?.for?.(binding.ctx);
    if(typeof input?.focus==='function'){input.focus();return;}
    const scope=`[data-conversation-content][data-conversation-session="${window.CSS.escape(sessionId)}"]`;
    const editor=document.querySelector(`${scope} [contenteditable="true"], ${scope} textarea`)??document.querySelector('[contenteditable="true"], textarea');
    editor?.focus?.();
  }
  async function open(resolve, beforeOpen) {
    cancel();const request=new AbortController();controller=request;const {signal}=request;
    const wait=read=>waitFor(signal,read);
    const target=await resolve(signal);signal.throwIfAborted();beforeOpen(target);
    const {session}=await activateChat(target.sessionId,signal);
    await wait(()=>!session.getSnapshot().loadingOlder);
    await session.loadThrough(target.seq);signal.throwIfAborted();
    const scope=`[data-conversation-content][data-conversation-session="${window.CSS.escape(target.sessionId)}"]`;
    const row=await wait(()=>{
      const root=document.querySelector(scope);if(!root)return null;
      const rows=[...root.querySelectorAll(`[data-chat-turn="${target.turn}"]`)];
      const visible=e=>e.getBoundingClientRect().height>0&&!e.closest('[hidden]');
      return rows.find(e=>e.dataset.chatFlowKind==='user'&&visible(e)) ?? rows.find(visible);
    });
    // Allow the native history render and initial tail restoration to finish first.
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));signal.throwIfAborted();
    row.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});
    // Let DSH record this changed scroll position as the reader's new location.
    row.closest('[data-conversation-scroll]')?.dispatchEvent(new Event('scroll'));
    clearLanding();landing=row;row.setAttribute('data-tree-chat-landing','');
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)row.animate?.([{backgroundColor:'color-mix(in srgb, var(--dsw-static-deepseek-500, #4c6ef5) 16%, transparent)'},{backgroundColor:'transparent'}],{duration:1000});
    timer=setTimeout(clearLanding,2500);
  }
  return {open,compose,cancel,dispose(){cancel();clearLanding();}};
}

function selectionRect(a,b){return {left:Math.min(a.x,b.x),top:Math.min(a.y,b.y),right:Math.max(a.x,b.x),bottom:Math.max(a.y,b.y)};}
/** Use logical coordinates so offscreen cards, negative positions and zoom all behave alike. */
function marqueeIds(positions,rect,base=[]){
  const ids=new Set(base);
  for(const [id,p]of positions)if(id!=='root'&&p.x+p.width>=rect.left&&p.x<=rect.right&&p.y+p.height>=rect.top&&p.y<=rect.bottom)ids.add(id);
  return [...ids];
}

/** Small native-themed editor for named collections and edge-based splitting. */
function GroupDialog({value,graph,busy,onCancel,onCommit}){
  const group=graph.groups?.[value.id],split=value.type==='split';
  const [name,setName]=React.useState(value.name??(split?`${group?.name??'集合'} 2`:'新集合'));
  const [cutId,setCutId]=React.useState(value.cutId??group?.nodeIds.find(id=>id!==group.entryId)??'');
  return h('form',{className:'st-dialog st-group-dialog',role:'dialog','aria-modal':true,'aria-label':split?'拆分集合':'合并为集合',onSubmit:e=>{
    e.preventDefault();onCommit(split?{type:'group-split',id:value.id,cutId,name}:{type:'group-create',ids:value.ids,name,includeInternal:value.includeInternal});
  }},
    h('strong',null,split?'拆分集合':'合并为集合'),
    split&&h('label',null,'在此节点前拆分',h('select',{'aria-label':'拆分位置',value:cutId,onChange:e=>setCutId(e.target.value)},
      ...(group?.nodeIds??[]).filter(id=>id!==group.entryId).map(id=>h('option',{key:id,value:id},graph.nodes[id]?.label??id)))),
    h('label',null,split?'新集合名称':'集合名称',h('input',{'aria-label':split?'新集合名称':'集合名称',value:name,maxLength:80,autoFocus:true,onChange:e=>setName(e.target.value)})),
    h('div',{className:'st-dialog-actions'},h('button',{type:'button',onClick:onCancel},'取消'),h('button',{type:'submit',disabled:busy||!name.trim()||(split&&!cutId)},split?'拆分':'合并')));
}

const {createElement: h, useState, useEffect, useRef, useCallback, useMemo} = React;
const ID = 'tree-chat';
let pendingSession = null;
let pendingSelection = null;
let activeTreeCache = null; // { graphId, graph, view, viewTouched, selected, showInternal }
const headerViews=new Map();
const inject = ['slots', 'sidebarRight', 'sidebarRightTabs', 'uiWorkspace','sessions','uiConversation'];
const icons = {
  tree: 'M12 3v5m0 5v8M5 8h14M5 8v5m14-5v5M3 13h4v4H3zm14 0h4v4h-4zM10 1h4v4h-4z',
  branch: 'M6 3v18m0-8c0-7 12-1 12-8m-3 0h6m-3-3v6',
  close: 'm6 6 12 12M6 18 18 6', undo: 'm8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14',
  redo: 'm16 4 5 5-5 5m5-5H11a7 7 0 0 0 0 14',
  fit: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8z',
  minus: 'M5 12h14', plus: 'M5 12h14M12 5v14',
  trash: 'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  link: 'm9 15 6-6M8 17l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2-1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
  down: 'm6 9 6 6 6-6', more: 'M5 12h.01M12 12h.01M19 12h.01',
  play: 'm8 4 12 8-12 8z', search: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16m6-2 6 6',
  download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
  layers: 'm12 3 10 5-10 5L2 8zm-9 9 9 5 9-5m-18 5 9 5 9-5',
  select: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 7l9 4-4 2-2 4z',
  expandAll: 'm7 8 5-5 5 5M12 3v7m-5 6 5 5 5-5m-5 5v-7M3 12h18',
  collapseAll: 'm7 3 5 5 5-5M12 8V1m-5 20 5-5 5 5m-5-5v7M3 12h18',
  arrange: 'M12 3v6M5 9h14M5 9v5m14-5v5M2 14h6v6H2zm14 0h6v6h-6z',
};
function Icon({name, size = 16}) {
  return h('svg', {width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true}, h('path', {d: icons[name] || icons.tree}));
}
function Button({icon, label, onClick, disabled, primary, children, pressed}) {
  return h('button', {type: 'button', className: `st-button${primary ? ' st-primary' : ''}${children ? ' st-labeled' : ''}`, title: label, 'aria-label': label, 'aria-pressed':pressed, onClick, disabled}, icon && h(Icon, {name: icon}), children);
}
async function api(input, signal) {
  const send = window.__DSH_TRANSPORT__?.fetch ?? window.fetch.bind(window);
  const response = await send('/api/conversation-tree', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(input), signal});
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.error || '无法连接tree-chat'); error.status = response.status; throw error; }
  return result;
}
function ancestors(graph, id) {
  const result = []; const seen = new Set();
  while (id && graph.nodes[id] && !seen.has(id)) { seen.add(id); result.push(id); id = graph.nodes[id].parent; }
  return result.reverse();
}
function currentHead(graph, sessionId) {
  const head = graph.bindings[sessionId]?.head;
  return graph.nodes[head] ? head : graph.active;
}
const currentNode = (graph,sessionId) => draftBranchesOf(graph)[sessionId] ? `pending:${sessionId}` : currentHead(graph,sessionId);
const nodeExists = (graph,id) => Boolean(graph.nodes[id] || draftForNode(graph,id) || Object.hasOwn(graph.groups??{},id));
function TreePanel({sessionId, ctx, navigation, useTabInfo}) {
  const visible = useTabInfo().tab.visible;
  const cached = activeTreeCache && activeTreeCache.graph?.bindings?.[sessionId] ? activeTreeCache : null;
  const [graph, setGraph] = useState(cached?.graph ?? null);
  const [selected, setSelected] = useState(() => {
    if (!cached?.graph) return null;
    const rest = cached.graph;
    const restored = pendingSelection?.sessionId === sessionId ? pendingSelection.id : null;
    if (restored) pendingSelection = null;
    return restored && nodeExists(rest,restored) ? restored : cached.selected && nodeExists(rest,cached.selected) ? cached.selected : currentNode(rest, sessionId);
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIds,setSelectedIds]=useState([]),[groupDialog,setGroupDialog]=useState(null);
  const [boxSelect,setBoxSelect]=useState(true),[selectionBox,setSelectionBox]=useState(null);
  const marquee=useRef(null),spaceHeld=useRef(false);
  const selectionAnchor=useRef(null);
  const [menu, setMenu] = useState(null);
  const [rename, setRename] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [size, setSize] = useState('m');
  const [canvasSize,setCanvasSize]=useState({width:1000,height:1000});
  const [showInternal, setShowInternal] = useState(cached?.showInternal ?? false);
  const [moving, setMoving] = useState({});
  const [view, setView] = useState(cached?.view ?? {x: 0, y: 0, zoom: .8});
  const panel = useRef(null), viewport = useRef(null), drag = useRef(null), graphRef = useRef(null), busyRef = useRef(false), viewTouched = useRef(cached?.viewTouched ?? false);
  const nodeDrag=useRef(null),ignoreClick=useRef(null);
  graphRef.current = graph;

  const persistCache = useCallback((g, sel, v, vt, si) => {
    if (!g) return;
    activeTreeCache = {
      graphId: g.id,
      graph: g,
      view: v,
      viewTouched: vt,
      selected: sel,
      showInternal: si
    };
  }, []);

  useEffect(() => {
    if (graph && visible) persistCache(graph, selected, view, viewTouched.current, showInternal);
  }, [graph, selected, view, showInternal, persistCache, visible]);

  const presentation=useMemo(()=>graph?conversationView(graph,showInternal,query):null,[graph,showInternal,query]);
  const mappedSelected=presentation?.owners.get(selected)??selected;
  const selectedId=presentation?.graph.nodes[mappedSelected]?mappedSelected:graph?.groups?.[mappedSelected]?.entryId??mappedSelected;
  const targetId=presentation?.targets.get(selectedId) ?? selectedId;
  useEffect(()=>{if(menu)panel.current?.querySelector('.st-node-menu button:not(:disabled)')?.focus();},[menu]);

  const refresh = useCallback(async signal => {
    const next = await api({action: 'get', sessionId,knownRevision:graphRef.current?.revision}, signal);
    if(next.unchanged)return graphRef.current;
    if (!signal?.aborted) {
      const previousHead = graphRef.current ? currentNode(graphRef.current,sessionId) : null;
      graphRef.current=next;
      setGraph(old => old?.revision === next.revision ? old : next);
      const restored=pendingSelection?.sessionId===sessionId?pendingSelection.id:null;
      if(restored)pendingSelection=null;
      setSelected(old => restored&&nodeExists(next,restored)?restored:nodeExists(next,old) && old !== previousHead ? old : currentNode(next, sessionId));
    }
    return next;
  }, [sessionId]);

  useEffect(() => {
    if (!visible) return;
    const abort = new AbortController(); let timer;
    const tick = async () => {
      try {
        if (!busyRef.current && !nodeDrag.current && !marquee.current && !drag.current && document.visibilityState !== 'hidden') {
          await refresh(abort.signal);
          setError('');
        }
      } catch (e) { if (!abort.signal.aborted) setError(e.message); }
      if (!abort.signal.aborted) timer = setTimeout(tick, !graph ? 1200 : 2800);
    };
    tick(); return () => { abort.abort(); clearTimeout(timer); };
  }, [refresh, !!graph, visible]);

  const layout = useMemo(() => presentation ? layoutGraph(presentation.graph, size, moving) : null, [presentation, size, moving]);
  const connectedIds=useMemo(()=>{
    if(!layout)return new Set();
    const children=new Map();
    for(const p of layout.positions.values()){const list=children.get(p.node.parent)??[];list.push(p.node.id);children.set(p.node.parent,list);}
    const ids=new Set(),stack=['root'];
    while(stack.length){const id=stack.pop();if(ids.has(id))continue;ids.add(id);stack.push(...(children.get(id)??[]));}
    return ids;
  },[layout]);
  const viewportBounds={left:(-view.x-240)/view.zoom,right:(canvasSize.width-view.x+240)/view.zoom,top:(-view.y-160)/view.zoom,bottom:(canvasSize.height-view.y+160)/view.zoom};
  const inViewport=p=>p.x+p.width>=viewportBounds.left&&p.x<=viewportBounds.right&&p.y+p.height>=viewportBounds.top&&p.y<=viewportBounds.bottom;
  const renderNodes=layout?[...layout.positions.values()].filter(p=>layout.positions.size<=250||inViewport(p)||p.node.id===selectedId):[];
  useEffect(()=>{
    if(!query.trim()||!layout||!viewport.current)return;
    const match=[...layout.positions.values()].find(p=>p.node.label.toLowerCase().includes(query.trim().toLowerCase()));
    if(match){viewTouched.current=true;setView(v=>({...v,x:viewport.current.clientWidth/2-match.cx*v.zoom,y:viewport.current.clientHeight*.45-match.cy*v.zoom}));}
  },[query,presentation]);
  const selectedDraft=graph&&draftBranchesOf(graph)[sessionId];
  useEffect(()=>{
    if(!selectedDraft||!visible||!layout||!viewport.current)return;
    const p=layout.positions.get(`pending:${sessionId}`),r=viewport.current;
    if(p&&r.clientWidth&&r.clientHeight)setView(v=>nodeVisibleView(v,p,r.clientWidth,r.clientHeight));
  },[selectedDraft?.sessionId,visible,size]);
  function fit() {
    if (!viewport.current || !layout) return;
    const {clientWidth: width, clientHeight: height} = viewport.current;
    const available = Math.max(80, height - 80);
    viewTouched.current = true;
    const zoom = Math.max(.3, Math.min(1, (width - 30) / layout.width, available / layout.height));
    const nextView = {x: (width - layout.width * zoom) / 2-layout.left*zoom, y: 12 + Math.max(0, (available - layout.height * zoom) / 2)-layout.top*zoom, zoom};
    setView(nextView);
    persistCache(graph, selected, nextView, true, showInternal);
  }

  useEffect(() => {
    if (!panel.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize(entry.contentRect.width < 400 ? 's' : entry.contentRect.width < 560 ? 'm' : 'l');
      if(viewport.current)setCanvasSize({width:viewport.current.clientWidth,height:viewport.current.clientHeight});
    });
    observer.observe(panel.current); return () => observer.disconnect();
  }, [!!graph]);

  useEffect(() => {
    if (!visible || !viewport.current || !layout || !graph) return;
    if (cached && !viewTouched.current) return;
    const follow = () => {
      if (viewTouched.current) return;
      const {clientWidth: width, clientHeight: height} = viewport.current;
      const zoom = size === 's' ? .9 : 1;
      const currentPos = layout.positions.get(presentation.owners.get(currentNode(graph, sessionId)) ?? 'root');
      if (!currentPos) return;
      const overview = Math.min(zoom, (width-24)/layout.width, (height-56)/layout.height);
      const nextView = overview >= .85 ? {zoom:overview, x:(width-layout.width*overview)/2-layout.left*overview, y:Math.max(20,(height-40-layout.height*overview)/2)-layout.top*overview}
        : {zoom, x:width/2-currentPos.cx*zoom, y:height*.58-currentPos.cy*zoom};
      setView(nextView);
    };
    if (!cached) follow();
    const observer = new ResizeObserver(follow);
    observer.observe(viewport.current); return () => observer.disconnect();
  }, [layout?.width, layout?.height, layout?.left, layout?.top, size, graph?.bindings[sessionId]?.head, graph?.active, graph?.revision, showInternal, cached, visible]);

  async function run(action) {
    if (busyRef.current) return;
    navigation.cancel();
    busyRef.current = true; setBusy(true); setError('');
    try { await action(); } catch (e) { if (e.name !== 'AbortError') setError(e.message); if (e.status === 409) await refresh(); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function navigate(result, nextSelected = selected, nextView = view) {
    graphRef.current=result.graph;
    setGraph(result.graph);
    if (nextView !== view) setView(nextView);
    persistCache(result.graph, nextSelected, nextView, viewTouched.current, showInternal);
    if (result.sessionId !== sessionId) {
      pendingSession = result.sessionId;
      ctx.sidebarRight.openTabIn?.(result.sessionId, 'conversation-tree');
      ctx.uiWorkspace.openSession(result.sessionId);
    }
  }
  async function compose(result){
    const nextCurrent=currentNode(result.graph,result.sessionId);
    let nextView=view;
    if(nextCurrent&&viewport.current){
      const nextProj=conversationView(result.graph,showInternal);
      const visibleId=nextProj.owners.get(nextCurrent)??nextCurrent;
      const pos=layoutGraph(nextProj.graph,size,moving).positions.get(visibleId);
      const {clientWidth:vw,clientHeight:vh}=viewport.current;
      if(pos&&vw>0&&vh>0){
        nextView=nodeVisibleView(view,pos,vw,vh);
        if(nextView!==view)viewTouched.current=true;
      }
    }
    if(nextCurrent){
      setSelected(nextCurrent);
      if(result.sessionId!==sessionId)pendingSelection={sessionId:result.sessionId,id:nextCurrent};
    }
    navigate(result, nextCurrent ?? selected, nextView);
    try { await navigation.compose(result.sessionId); } catch (e) { if (e.name !== 'AbortError') throw e; }
  }
  const activate = () => {setMenu(null);return run(async () => compose(await api({action: 'activate', sessionId, revision: graphRef.current.revision, id: targetId})));};
  function createBranch(id=selectedId){
    if(Object.hasOwn(graphRef.current.groups??{},id))return toggleGroup(id,false);
    setMenu(null);
    return run(async()=>{
      const cur=graphRef.current;
      const branchParent=draftForNode(cur,id)?id:(presentation.targets.get(id)??id);
      await compose(await api({action:'branch',sessionId,revision:cur.revision,id:branchParent}));
    });
  }
  const cancelBranch=(id=selectedId)=>{setMenu(null);return run(async()=>compose(await api({action:'cancel-branch',sessionId,revision:graphRef.current.revision,id})));};
  async function jump(id) {
    if(Object.hasOwn(graphRef.current.groups??{},id))return toggleGroup(id,false);
    setSelected(id);setMenu(null);setError('');
    persistCache(graph, id, view, viewTouched.current, showInternal);
    try {
      if(draftForNode(graphRef.current,id)){
        return await createBranch(id);
      }
      await navigation.open(signal=>api({action:'locate',sessionId,id},signal),target=>{
        if(target.sessionId!==sessionId){pendingSession=target.sessionId;pendingSelection={sessionId:target.sessionId,id};}
      });
    }catch(e){if(e.name!=='AbortError')setError(e.message);}
  }
  function selectNode(id) {
    setSelectedIds([id]);selectionAnchor.current=id;
    setSelected(id);
    setMenu(null);
    setError('');
    persistCache(graph, id, view, viewTouched.current, showInternal);
  }
  function handleNodeClick(event, id) {
    event.stopPropagation();
    if (ignoreClick.current?.id === id && Date.now() < ignoreClick.current.until) return;
    if(event.shiftKey){
      const path=getShiftSelectionPath(presentation.graph.nodes,selectionAnchor.current??selectedId,id);
      if(!path.length){setError('请选择不经过起点的连通节点');return;}
      setSelectedIds(path);setSelected(id);setMenu(null);setError('');return;
    }
    if(event.ctrlKey||event.metaKey){
      const prior=selectedIds.length?selectedIds:[selectedId].filter(Boolean),next=prior.includes(id)?prior.filter(n=>n!==id):[...prior,id];
      setSelectedIds(next);selectionAnchor.current=id;setSelected(next.includes(id)?id:next.at(-1)??null);setMenu(null);setError('');return;
    }
    selectNode(id);
  }
  function handleNodeDoubleClick(event, id) {
    event.stopPropagation();
    if (ignoreClick.current?.id === id && Date.now() < ignoreClick.current.until) return;
    jump(id);
  }
  function openMenu(event,id) {
    event.preventDefault();event.stopPropagation();navigation.cancel();setConfirm(null);setRename(null);if(id!=='global')setSelected(id);
    const r=panel.current.getBoundingClientRect(),b=event.currentTarget.getBoundingClientRect();
    setMenu({kind:id==='global'?'global':'node',x:Math.max(8,Math.min((event.clientX||b.right)-r.left,r.width-196)),y:Math.max(8,Math.min((event.clientY||b.bottom)-r.top,r.height-250))});
  }
  async function mutate(operation) {
    const previous=graphRef.current, previousPath=ancestors(previous,currentHead(previous,sessionId)).join('/');
    const updated = await api({action: 'edit', sessionId, revision: graphRef.current.revision, operation:{includeInternal:showInternal,...operation}});
    graphRef.current=updated;
    setGraph(updated); setMenu(null); setConfirm(null); setRename(null);
    const head = updated.bindings[sessionId]?.head;
    const target = updated.nodes[head] ? head : updated.active;
    const nextSelected = nodeExists(updated,selected) ? selected : target;
    setSelected(nextSelected);
    if(['group-create','group-toggle','group-toggle-all','group-split','group-dissolve','group-delete'].includes(operation.type)){
      // Keep the acted-on card under the pointer while its surrounding tree compacts or expands.
      const before=layout?.positions.get(operation.id??selectedId);
      const projected=conversationView(updated,showInternal),nextLayout=layoutGraph(projected.graph,size);
      const nextId=updated.groups?.[operation.id]?.collapsed?operation.id:updated.groups?.[operation.id]?.entryId??projected.owners.get(nextSelected)??nextSelected;
      const after=nextLayout.positions.get(nextId);
      viewTouched.current=true;
      if(before&&after)setView(v=>({...v,x:v.x+(before.cx-after.cx)*v.zoom,y:v.y+(before.cy-after.cy)*v.zoom}));
    }
    persistCache(updated, nextSelected, view, viewTouched.current, showInternal);
    const path = ancestors(updated, target);
    if (path[0] === 'root' && path.join('/') !== previousPath && path.join('/') !== updated.bindings[sessionId]?.key) {
      const result = await api({action: 'activate', sessionId, revision: updated.revision, id: target});
      const activatedHead = currentNode(result.graph, result.sessionId) ?? target;
      setSelected(activatedHead);
      if (result.sessionId !== sessionId) pendingSelection = {sessionId: result.sessionId, id: activatedHead};
      navigate(result, activatedHead);
    }
    return updated;
  }
  function toggleGroup(id,collapsed){
    setMenu(null);setQuery('');return run(async()=>{
      const updated=await mutate({type:'group-toggle',id,collapsed});
      setSelected(updated.groups[id].collapsed?id:updated.groups[id].entryId);setSelectedIds([]);
    });
  }
  function toggleAllGroups(){
    setQuery('');setSelectedIds([]);return run(async()=>{
      const collapsed=!Object.values(graphRef.current.groups??{}).some(g=>g.collapsed);
      const updated=await mutate({type:'group-toggle-all',collapsed});
      const projected=conversationView(updated,showInternal);setSelected(projected.owners.get(selectedId)??updated.groups?.[selectedId]?.entryId??selectedId);
    });
  }
  function openGroupDialog(value){setMenu(null);setGroupDialog(value);}
  function commitGroup(operation){return run(async()=>{
    const before=new Set(Object.keys(graphRef.current.groups??{})),updated=await mutate(operation);
    const created=Object.keys(updated.groups??{}).find(id=>!before.has(id));
    if(created)setSelected(created);setSelectedIds([]);setGroupDialog(null);
  });}
  function beginNode(event,id) {
    if(event.button!==0 || busyRef.current)return;
    if(event.ctrlKey||event.metaKey||event.shiftKey)return;
    navigation.cancel();ignoreClick.current=null;setMenu(null);
    viewTouched.current=true;
    event.stopPropagation();event.preventDefault();event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);
    const p=layout.positions.get(id);setSelected(id);setSelectedIds([id]);selectionAnchor.current=id;
    nodeDrag.current={id,pointerId:event.pointerId,x:event.clientX,y:event.clientY,position:{x:p.cx,y:p.cy},zoom:view.zoom,moved:false};
  }
  function canvasPoint(event){const r=viewport.current.getBoundingClientRect();return {x:(event.clientX-r.left-view.x)/view.zoom,y:(event.clientY-r.top-view.y)/view.zoom};}
  function finishMarquee(cancel=false){
    const m=marquee.current;marquee.current=null;setSelectionBox(null);
    if(cancel&&m){setSelectedIds(m.originalIds);setSelected(m.originalSelected);}
  }
  async function savePosition(id,position) {
    await run(async()=>{
      try {await mutate({type:'move',id,position});}
      catch(e){if(e.status!==409)throw e;await refresh();await mutate({type:'move',id,position});}
    });
    setMoving({});
  }
  function zoomTo(value, point) {
    viewTouched.current = true;
    setView(old => {
      const zoom = Math.max(.3, Math.min(1.8, value));
      const p = point ?? {x: viewport.current.clientWidth / 2, y: viewport.current.clientHeight / 2};
      const nextView = {zoom, x: p.x - (p.x - old.x) * zoom / old.zoom, y: p.y - (p.y - old.y) * zoom / old.zoom};
      persistCache(graph, selected, nextView, true, showInternal);
      return nextView;
    });
  }
  function exportTree() {
    const blob = new Blob([JSON.stringify(graph, null, 2)], {type: 'application/json'}), url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `tree-chat-${graph.id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!graph) return h('div', {className: 'st-root st-loading', ref: panel}, h(Icon, {name: 'tree', size: 30}), h('p', null, error || '正在读取对话树…'), error && h(Button, {label: '重试', onClick: () => run(() => refresh()), children: '重试'}));
  const current = presentation.owners.get(currentNode(graph, sessionId)) ?? 'root', activePath = ancestors(graph, currentHead(graph,sessionId)), pathSet = new Set([...activePath.map(id=>presentation.owners.get(id)??id),current]);
  const node = presentation.graph.nodes[selectedId], selectedPath = ancestors(graph, targetId), connected = selectedPath[0] === 'root', isDraft=node?.kind==='pending',isGroup=node?.kind==='group';
  const membership=presentation.groupMembership.get(selectedId),memberGroup=graph.groups?.[membership];
  const groupCandidate=selectedIds.length>=2?validateGroupCandidate(presentation.graph.nodes,selectedIds):{ok:false};
  const hasRealChild = Object.values(presentation.graph.nodes).some(n => n.parent === selectedId && n.kind !== 'pending');
  const leaf = node && !isDraft && !hasRealChild;
  const dirty = activePath.join('/') !== graph.bindings[sessionId]?.key;
  const lod = view.zoom < .6;
  const hasGroups=Object.keys(graph.groups??{}).length>0,hasCollapsed=Object.values(graph.groups??{}).some(g=>g.collapsed);
  return h('section', {className: 'st-root', ref: panel, 'data-size': size, 'aria-label': 'tree-chat 对话管理', 'aria-busy': busy, onPointerDown:e=>{if(menu&&!e.target.closest('.st-node-menu'))setMenu(null);},onKeyUp:e=>{if(e.code==='Space')spaceHeld.current=false;},onBlur:e=>{if(!e.currentTarget.contains(e.relatedTarget))spaceHeld.current=false;}, onKeyDown: e => {
    if (e.target.matches('input,textarea,select,[contenteditable=true]')&&e.key!=='Escape') return;
    if(e.code==='Space'&&e.target.matches('.st-canvas,.st-node-body')){e.preventDefault();spaceHeld.current=true;}
    if (e.key === 'Escape') {if(nodeDrag.current)ignoreClick.current={id:nodeDrag.current.id,until:Date.now()+400};nodeDrag.current=null;finishMarquee(true);drag.current=null;setMoving({});setConfirm(null);setRename(null);setGroupDialog(null);setMenu(null);navigation.cancel();}
    if ((e.ctrlKey || e.metaKey) && ['z','y'].includes(e.key.toLowerCase())) {e.preventDefault();run(() => mutate({type:e.shiftKey||e.key.toLowerCase()==='y'?'redo':'undo'}));}
  }},
    h('div', {className: 'st-toolbar'}, h('label', {className: 'st-search'}, h(Icon, {name: 'search', size: 14}), h('input', {value: query, onChange: e => setQuery(e.target.value), placeholder: '搜索节点', 'aria-label': '搜索节点'})),
      h(Button,{icon:'plus',label:'新建分支',disabled:busy||!connected||isGroup,onClick:()=>createBranch(),children:'新建分支'}),
      h(Button,{icon:'layers',label:'合并为集合',disabled:busy||!groupCandidate.ok||selectedIds.some(id=>presentation.graph.nodes[id]?.kind==='pending'),onClick:()=>openGroupDialog({type:'create',ids:selectedIds,includeInternal:showInternal})}),
      h(Button,{icon:'select',label:'框选节点',pressed:boxSelect,onClick:()=>setBoxSelect(!boxSelect)}),
      h(Button,{icon:hasCollapsed?'expandAll':'collapseAll',label:hasCollapsed?'展开所有集合':'折叠所有集合',disabled:busy||!hasGroups,onClick:toggleAllGroups}),
      h(Button,{icon:'arrange',label:'整理节点',disabled:busy,onClick:()=>{viewTouched.current=false;run(()=>mutate({type:'arrange',id:'root',includeInternal:showInternal}));}}),
      h('button',{type:'button',className:'st-button','aria-label':'对话树选项','aria-haspopup':'menu','aria-expanded':menu?.kind==='global',onClick:e=>openMenu(e,'global')},h(Icon,{name:'more'}))),
    error && h('div', {className: 'st-error', role: 'alert'}, h('span', null, error), h(Button, {icon: 'close', label: '关闭提示', onClick: () => setError('')})),
    dirty && h('div', {className: 'st-notice'}, '上下文待应用'),
    h('div', {className: `st-canvas${lod?' st-lod':''}${Object.keys(moving).length?' st-node-dragging':''}${boxSelect?' st-box-select':''}`, ref: viewport, tabIndex: 0, 'aria-label': '对话树画布，拖动空白框选，空格或中键拖动平移，滚轮缩放', style:{'--st-zoom':view.zoom,backgroundSize:`${24*view.zoom}px ${24*view.zoom}px`,backgroundPosition:`${view.x}px ${view.y}px`},
      onKeyDown: e => {
        if (e.target !== e.currentTarget) return;
        const here = layout.positions.get(selectedId), list = [...layout.positions.values()];
        let next;
        if (e.key === 'ArrowUp') next = presentation.graph.nodes[selectedId]?.parent;
        if (e.key === 'ArrowDown') next = list.find(p=>p.node.parent===selectedId)?.node.id;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const siblings=list.filter(p=>p.depth===here?.depth).sort((a,b)=>a.cx-b.cx);
          next=siblings[siblings.findIndex(p=>p.node.id===selectedId)+(e.key==='ArrowLeft'?-1:1)]?.node.id;
        }
        if (next) {e.preventDefault();selectNode(next);const p=layout.positions.get(next),r=viewport.current;viewTouched.current=true;setView(v=>{const nv={...v,x:r.clientWidth/2-p.cx*v.zoom,y:r.clientHeight*.58-p.cy*v.zoom};persistCache(graph, next, nv, true, showInternal);return nv;});}
        if (e.key === 'Enter') {e.preventDefault();if(e.shiftKey&&connected)createBranch();else jump(selectedId);}
      },
      onWheel: e => {if(nodeDrag.current||marquee.current||drag.current)return;const rect = viewport.current.getBoundingClientRect(); zoomTo(view.zoom * Math.exp(-e.deltaY * .0015), {x: e.clientX - rect.left, y: e.clientY - rect.top});},
      onPointerDown: e => {
        if (e.target.closest('button,input,.st-node')||busyRef.current||![0,1].includes(e.button)) return;
        e.preventDefault();e.currentTarget.focus();navigation.cancel();setMenu(null);viewTouched.current = true;e.currentTarget.setPointerCapture(e.pointerId);
        if(e.button===0&&boxSelect&&!spaceHeld.current){
          const start=canvasPoint(e),originalIds=selectedIds.length?selectedIds:[selectedId].filter(Boolean);
          marquee.current={pointerId:e.pointerId,start,base:e.shiftKey||e.ctrlKey||e.metaKey?originalIds:[],originalIds,originalSelected:selected};setSelectionBox(selectionRect(start,start));
        }else drag.current={x:e.clientX,y:e.clientY,view};
      },
      onPointerMove: e => {
        const m=marquee.current;
        if(m?.pointerId===e.pointerId){
          const rect=selectionRect(m.start,canvasPoint(e)),ids=marqueeIds(layout.positions,rect,m.base);
          setSelectionBox(rect);setSelectedIds(ids);setSelected(ids.at(-1)??null);selectionAnchor.current=ids[0]??null;return;
        }
        const n=nodeDrag.current;
        if(n && n.pointerId===e.pointerId) {
          if(!n.moved && Math.hypot(e.clientX-n.x,e.clientY-n.y)<5)return;
          n.moved=true;viewTouched.current=true;
          n.latest={x:n.position.x+(e.clientX-n.x)/n.zoom,y:n.position.y+(e.clientY-n.y)/n.zoom};setMoving({[n.id]:n.latest});return;
        }
        if (drag.current) {
          const nv={...view, x: drag.current.view.x + e.clientX - drag.current.x, y: drag.current.view.y + e.clientY - drag.current.y};
          setView(nv);
          persistCache(graph, selectedId, nv, viewTouched.current, showInternal);
        }
      },
      onPointerUp: e => {
        if(marquee.current?.pointerId===e.pointerId){finishMarquee();return;}
        if(nodeDrag.current?.pointerId===e.pointerId){const n=nodeDrag.current;nodeDrag.current=null;if(n.moved){ignoreClick.current={id:n.id,until:Date.now()+400};savePosition(n.id,n.latest);}return;}
        drag.current = null;
      }, onPointerCancel: () => {finishMarquee(true);if(nodeDrag.current)ignoreClick.current={id:nodeDrag.current.id,until:Date.now()+400};nodeDrag.current=null;setMoving({});drag.current = null;},onLostPointerCapture:()=>{if(marquee.current)finishMarquee(true);drag.current=null;if(nodeDrag.current){ignoreClick.current={id:nodeDrag.current.id,until:Date.now()+400};nodeDrag.current=null;setMoving({});}}
    },
      h('div', {className: 'st-world', style: {width: layout.width, height: layout.height, transform: `translate(${view.x}px,${view.y}px) scale(${view.zoom})`}},
        h('svg', {className: 'st-wires', width: layout.width, height: layout.height},
          ...[...layout.positions.values()].filter(p => {
            if(!p.node.parent)return false;
            if(layout.positions.size<=250)return true;
            const parent=layout.positions.get(p.node.parent),b=viewportBounds;
            return Math.max(p.cx,parent.cx)>=b.left&&Math.min(p.cx,parent.cx)<=b.right&&Math.max(p.cy,parent.cy)>=b.top&&Math.min(p.cy,parent.cy)<=b.bottom;
          }).map(p => {
            const parent = layout.positions.get(p.node.parent), x = parent.cx, y=parent.cy+(lod?6:parent.height/2), x2=p.cx, y2=p.cy-(lod?6:p.height/2);
            const d=`M${x},${y} C${x},${y+27} ${x2},${y2-27} ${x2},${y2}`;
            return h('path', {key:p.node.id,d,className:`st-wire${pathSet.has(p.node.id)?' st-wire-active':''}`});
          })),
        ...renderNodes.map(p => {
          const n=p.node, label=n.id==='root'&&n.label==='对话起点'?'起点':n.label, match=!query || n.label.toLowerCase().includes(query.toLowerCase());
          return h('article', {key:n.id, 'data-node-id':n.id, className:`st-node${n.id==='root'?' st-origin':''}${n.kind==='pending'?' st-pending':''}${n.kind==='group'?' st-group':''}${n.id===selectedId||selectedIds.includes(n.id)?' st-selected':''}${moving[n.id]?' st-moving':''}${pathSet.has(n.id)?' st-onpath':''}${n.id===current?' st-current':''}${n.parent===null&&n.id!=='root'?' st-detached':''}${!match?' st-dim':''}`, style:{left:p.cx,top:p.cy,'--node-w':`${p.width}px`,'--node-h':`${p.height}px`}, title:n.kind==='group'?`${n.label} · ${n.count} 个节点`:n.kind==='pending'?'新分支':n.id==='root'?'对话起点':`${n.label}\n第 ${p.depth} 轮 · ${new Date(n.createdAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}${n.parent===null?' · 未连接':''}`, onClick:e=>handleNodeClick(e,n.id), onDoubleClick:e=>handleNodeDoubleClick(e,n.id), onContextMenu:e=>openMenu(e,n.id)},
            h('button',{className:'st-node-body', onPointerDown:e=>beginNode(e,n.id), onClick:e=>handleNodeClick(e,n.id), onDoubleClick:e=>handleNodeDoubleClick(e,n.id), 'aria-label':n.label, 'aria-pressed':n.id===selectedId},h('span',{className:'st-node-title'},label)),
            n.kind==='group'&&h('span',{className:'st-group-count','aria-label':`${n.count} 个节点`},n.count),
            presentation.groupMembership.get(n.id)&&h('button',{className:'st-group-tag',title:`折叠集合：${graph.groups[presentation.groupMembership.get(n.id)].name}`,'aria-label':`折叠集合：${graph.groups[presentation.groupMembership.get(n.id)].name}`,onPointerDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();toggleGroup(presentation.groupMembership.get(n.id),true);}},graph.groups[presentation.groupMembership.get(n.id)].name),
            h('div',{className:'st-node-controls'},n.kind==='group'
              ?h(React.Fragment,null,h('button',{className:'st-button','aria-label':`展开集合：${n.label}`,title:'展开集合',onPointerDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();toggleGroup(n.id,false);}},h(Icon,{name:'layers',size:14})),h('button',{className:'st-button','aria-label':n.id===selectedId?'节点操作':`节点操作：${n.label}`,onPointerDown:e=>e.stopPropagation(),onClick:e=>openMenu(e,n.id)},h(Icon,{name:'more',size:14})))
              :n.kind==='pending'
              ?h('button',{className:'st-button','aria-label':n.id===selectedId?'节点操作':`节点操作：${n.label}`,title:'节点操作',onPointerDown:e=>e.stopPropagation(),onClick:e=>openMenu(e,n.id)},h(Icon,{name:'more',size:14}))
              :h(React.Fragment,null,h('button',{className:'st-button st-node-add','aria-label':`从 ${n.label} 新建分支`,title:'从这里新建分支',disabled:busy||!connectedIds.has(n.id),onPointerDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();createBranch(n.id);}},h(Icon,{name:'plus',size:14})),n.id!=='root'&&h('button',{className:'st-button st-node-more','aria-label':n.id===selectedId?'节点操作':`节点操作：${n.label}`,title:'节点操作',onPointerDown:e=>e.stopPropagation(),onClick:e=>openMenu(e,n.id)},h(Icon,{name:'more',size:14})))),
            h('span',{className:'st-node-flag','aria-hidden':true},label),
            );
        })),
      selectionBox&&h('div',{className:'st-selection-box','aria-hidden':true,style:{left:selectionBox.left*view.zoom+view.x,top:selectionBox.top*view.zoom+view.y,width:(selectionBox.right-selectionBox.left)*view.zoom,height:(selectionBox.bottom-selectionBox.top)*view.zoom}}),
      Object.keys(presentation.graph.nodes).length===1 && h('div',{className:'st-empty'},h('span',null,'暂无用户输入')),
      h('div',{className:'st-canvas-tools'},h(Button,{icon:'minus',label:'缩小',onClick:()=>zoomTo(view.zoom/1.2)}),h('span',null,`${Math.round(view.zoom*100)}%`),h(Button,{icon:'plus',label:'放大',onClick:()=>zoomTo(view.zoom*1.2)}),h('i'),h(Button,{icon:'fit',label:'适合画布',onClick:fit})),
      ),
    menu && h('div',{className:'st-node-menu',role:'menu','aria-label':menu.kind==='global'?'对话树选项':'节点菜单',style:{left:menu.x,top:menu.y},onKeyDown:e=>{
      if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();
      const items=[...e.currentTarget.querySelectorAll('button:not(:disabled)')],index=items.indexOf(document.activeElement);
      items[e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();
    }},
      menu.kind==='global'?h(React.Fragment,null,
        h('button',{role:'menuitem',disabled:busy||!graph.canUndo,onClick:()=>run(()=>mutate({type:'undo'}))},h(Icon,{name:'undo'}),'撤销',h('kbd',null,'Ctrl+Z')),
        h('button',{role:'menuitem',disabled:busy||!graph.canRedo,onClick:()=>run(()=>mutate({type:'redo'}))},h(Icon,{name:'redo'}),'重做',h('kbd',null,'Ctrl+Shift+Z')),
        h('hr'),h('button',{role:'menuitem',disabled:busy,onClick:()=>{viewTouched.current=false;run(()=>mutate({type:'arrange',id:'root',includeInternal:showInternal}));}},h(Icon,{name:'arrange'}),'整理节点'),
        h('button',{role:'menuitemcheckbox','aria-checked':showInternal,onClick:()=>{viewTouched.current=false;setShowInternal(!showInternal);persistCache(graph, selectedId, view, viewTouched.current, !showInternal);setMenu(null);}},h(Icon,{name:'layers'}),showInternal?'仅显示用户输入':'显示完整轮次'),
        h('button',{role:'menuitem',onClick:()=>{exportTree();setMenu(null);}},h(Icon,{name:'download'}),'导出树结构'))
      :isGroup?h(React.Fragment,null,
        h('button',{role:'menuitem',disabled:busy,onClick:()=>toggleGroup(selectedId,false)},h(Icon,{name:'layers'}),'展开集合'),
        h('button',{role:'menuitem',onClick:()=>{setRename(node.label);setMenu(null);}},'重命名集合'),
        h('button',{role:'menuitem',disabled:busy,onClick:()=>openGroupDialog({type:'split',id:selectedId})},'拆分集合…'),
        h('button',{role:'menuitem',disabled:busy,onClick:()=>run(async()=>{await mutate({type:'group-dissolve',id:selectedId});setSelected(graph.groups[selectedId].entryId);})},'取消集合'),
        h('button',{role:'menuitem',className:'st-danger',disabled:busy,onClick:()=>{setConfirm({type:'group-delete',id:selectedId});setMenu(null);}},h(Icon,{name:'trash'}),'删除集合…'))
      :isDraft?h(React.Fragment,null,
        h('button',{role:'menuitem',disabled:busy,onClick:()=>createBranch()},h(Icon,{name:'play'}),'继续分支'),
        h('button',{role:'menuitem',onClick:()=>{setRename(node.label);setMenu(null);}},'重命名节点'),
        h('button',{role:'menuitem',className:'st-danger',disabled:busy,onClick:()=>cancelBranch()},h(Icon,{name:'trash'}),'删除空分支'))
      :h(React.Fragment,null,
        h('button',{role:'menuitem',disabled:busy||!connected,onClick:()=>createBranch()},h(Icon,{name:'plus'}),'新建分支'),
        leaf&&selectedId!==current&&h('button',{role:'menuitem',disabled:busy||!connected,onClick:activate},h(Icon,{name:'play'}),'继续这条分支'),
        memberGroup&&h('button',{role:'menuitem',disabled:busy,onClick:()=>toggleGroup(membership,true)},'折叠集合'),
        memberGroup&&memberGroup.entryId!==selectedId&&h('button',{role:'menuitem',disabled:busy,onClick:()=>openGroupDialog({type:'split',id:membership,cutId:selectedId})},'在此拆分集合…'),
        memberGroup&&h('button',{role:'menuitem',disabled:busy,onClick:()=>run(()=>mutate({type:'group-dissolve',id:membership}))},'取消集合'),
        memberGroup&&h('button',{role:'menuitem',className:'st-danger',disabled:busy,onClick:()=>{setConfirm({type:'group-delete',id:membership});setMenu(null);}},'删除所属集合…'),
        h('button',{role:'menuitem',onClick:()=>{setRename(node.label);setMenu(null);}},'重命名节点'),
        !connected&&h('button',{role:'menuitem',disabled:busy,onClick:()=>run(()=>mutate({type:'reparent',id:selectedId,parent:'root'}))},'接回起点'),
        selectedId!=='root'&&h('button',{role:'menuitem',className:'st-danger',onClick:()=>{setConfirm({type:'delete',id:selectedId});setMenu(null);}},'删除节点…'))),
    groupDialog&&h(GroupDialog,{key:`${groupDialog.type}:${groupDialog.id??'new'}`,value:groupDialog,graph,busy,onCancel:()=>setGroupDialog(null),onCommit:commitGroup}),
    rename!==null && h('form',{className:'st-dialog st-rename',role:'dialog','aria-label':isGroup?'重命名集合':'重命名节点',onSubmit:e=>{e.preventDefault();run(()=>mutate({type:'rename',id:selectedId,label:rename}));}},h('input',{value:rename,onChange:e=>setRename(e.target.value),maxLength:isGroup?80:200,'aria-label':isGroup?'集合名称':'节点名称',autoFocus:true}),h('button',{type:'submit',disabled:busy},'保存'),h('button',{type:'button',onClick:()=>setRename(null)},'取消')),
    confirm && h('div',{className:'st-dialog st-confirm',role:'alertdialog','aria-label':confirm.type==='group-delete'?'删除集合':'删除节点'},
      h('strong',null,confirm.type==='group-delete'?'删除集合内的所有节点？':'如何删除这个节点？'),
      h('p',null,'保留后续会自动接好上下文，可撤销。'),
      h('div',{className:'st-confirm-actions'},h(Button,{label:'删除并保留后续',onClick:()=>run(()=>mutate({type:confirm.type,id:confirm.id,grouped:!showInternal})),children:'保留后续'}),h(Button,{label:'删除整枝',onClick:()=>run(()=>mutate({type:confirm.type,id:confirm.id,subtree:true})),children:'删除整枝'}),h(Button,{label:'取消',onClick:()=>setConfirm(null),children:'取消'}))));
}

function HeaderButton({ctx, sessionId, selectView}) {
  useEffect(()=>{const header={selectView};headerViews.set(sessionId,header);return()=>{if(headerViews.get(sessionId)===header)headerViews.delete(sessionId);};},[sessionId,selectView]);
  useEffect(()=>{
    if (pendingSession === sessionId) {
      const timer = setTimeout(()=>{ctx.sidebarRight.openTabIn?.(sessionId, 'conversation-tree'); pendingSession = null;}, 0);
      return ()=>clearTimeout(timer);
    }
  },[sessionId]);
  return h('button',{type:'button',className:'st-header-button',title:'tree-chat', 'aria-label':'打开 tree-chat',onClick:()=>ctx.sidebarRight.openTabIn?.(sessionId, 'conversation-tree')},h(Icon,{name:'tree',size:17}));
}
function apply(ctx) {
  const navigation=createChatNavigator(ctx,headerViews);
  ctx.effect(()=>()=>navigation.dispose());
  ctx.effect(()=>{
    const style=document.createElement('style');style.dataset.plugin=ID;style.textContent=CSS;document.head.appendChild(style);
    return ()=>style.remove();
  });
  ctx.effect(()=>ctx.sidebarRightTabs.register({id:ID,kind:'conversation-tree',title:()=> 'tree-chat',keepMounted:true,
    guide:[{id:'conversation-tree',order:45,title:()=> 'tree-chat',description:()=> '浏览对话，从任意节点长出新分支',icon:()=>h(Icon,{name:'tree'})}]}));
  ctx.slots.inject('conversation.session.header.actions',()=>ctx.slots.register({name:'conversation.session.header.actions',id:ID,order:-29,...navigationHeaderOptions(ctx)},HeaderButton));
  ctx.slots.inject('sidebar.right.pane.tab',()=>ctx.slots.register({name:'sidebar.right.pane.tab',key:ID,inject:()=>({ctx,navigation})},TreePanel));
}

return {apply,inject};
}});
