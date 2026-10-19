window.__ModuleLoader__.load({id:'tree-chat',factory:(require)=>{
const React=require('react');
const CSS=".st-root {\n  --st-bg:var(--dsw-alias-bg-base,#fafafa);\n  --st-card:var(--dsw-alias-bg-layer-1,#fff);\n  --st-text:var(--dsw-alias-label-primary,#202124);\n  --st-secondary:var(--dsw-alias-label-secondary,#62646b);\n  --st-muted:var(--dsw-alias-label-tertiary,#8a8c94);\n  --st-line:var(--dsw-alias-border-l1,#e5e6e9);\n  --st-border:var(--dsw-alias-border-l2,#d9dbe1);\n  --st-hover:var(--dsw-alias-interactive-bg-hover,#eceef2);\n  --st-accent:var(--dsw-static-deepseek-500,#4c6ef5);\n  --st-soft:color-mix(in srgb,var(--st-accent) 16%,transparent);\n  display:flex;\n  flex-direction:column;\n  position:relative;\n  width:100%;\n  height:100%;\n  min-height:0;\n  overflow:hidden;\n  color:var(--st-text);\n  background:var(--st-bg);\n  font:inherit;\n  font-size:13px;\n  line-height:18px\n}\n.st-root,.st-root * {\n  box-sizing:border-box\n}\n.st-root button,.st-root input {\n  font:inherit\n}\n.st-root button {\n  cursor:pointer\n}\n.st-root button:disabled {\n  cursor:default;\n  opacity:.4\n}\n.st-root :is(button,input,[tabindex]):focus-visible {\n  outline:2px solid var(--st-accent);\n  outline-offset:2px\n}\n.st-root .st-button {\n  display:inline-flex;\n  align-items:center;\n  justify-content:center;\n  flex-shrink:0;\n  gap:6px;\n  width:28px;\n  height:28px;\n  padding:0;\n  border:0;\n  border-radius:6px;\n  color:var(--st-secondary);\n  background:transparent\n}\n.st-root .st-button:hover:not(:disabled) {\n  background:var(--st-hover);\n  color:var(--st-text)\n}\n.st-root .st-button[aria-pressed=true] {\n  color:var(--st-accent);\n  background:var(--st-soft)\n}\n.st-root .st-node-body { cursor:grab }\n.st-root .st-node-body:active,.st-root .st-node-dragging { cursor:grabbing }\n.st-root .st-node.st-moving { z-index:5; transition:none; box-shadow:0 0 0 3px var(--st-soft),0 8px 24px #00000018 }\n.st-root .st-labeled {\n  width:auto;\n  padding:0 10px;\n  white-space:nowrap\n}\n.st-root .st-primary {\n  color:#fff;\n  background:var(--st-accent)\n}\n.st-root .st-primary:hover:not(:disabled) {\n  color:#fff;\n  background:var(--st-accent);\n  filter:brightness(1.08)\n}\n/* Native sidebar toolbar;\nno duplicate panel heading. */\n.st-root .st-toolbar {\n  display:flex;\n  align-items:center;\n  gap:4px;\n  height:40px;\n  padding:0 8px;\n  border-bottom:1px solid var(--st-line);\n  flex:none\n}\n.st-root .st-search {\n  display:flex;\n  align-items:center;\n  gap:6px;\n  color:var(--st-muted);\n  height:28px;\n  flex:1;\n  min-width:0;\n  padding:0 8px;\n  margin-right:auto;\n  background:var(--st-card);\n  border:1px solid transparent;\n  border-radius:6px\n}\n.st-root .st-search:focus-within {\n  border-color:var(--st-accent)\n}\n.st-root .st-search input {\n  border:0;\n  background:transparent;\n  outline:0;\n  color:var(--st-text);\n  width:100%;\n  min-width:0;\n  font-size:12px\n}\n.st-root .st-search input::placeholder {\n  color:var(--st-muted)\n}\n.st-root .st-error,.st-root .st-notice {\n  padding:8px 12px;\n  font-size:12px;\n  line-height:18px;\n  flex:none\n}\n.st-root .st-error {\n  display:flex;\n  align-items:center;\n  gap:6px;\n  background:color-mix(in srgb,#dc6363 10%,var(--st-bg));\n  color:var(--dsw-alias-state-error-primary,#ce5959)\n}\n.st-root .st-error span {\n  flex:1;\n  overflow-wrap:anywhere\n}\n.st-root .st-notice {\n  background:color-mix(in srgb,#cf9c42 9%,var(--st-bg))\n}\n/* World coordinates stay stable across zoom and level-of-detail changes. */\n.st-root .st-canvas {\n  flex:1;\n  min-height:120px;\n  position:relative;\n  overflow:hidden;\n  touch-action:none;\n  user-select:none;\n  cursor:grab;\n  background-image:radial-gradient(circle,color-mix(in srgb,var(--st-muted) 24%,transparent) .8px,transparent 1px)\n}\n.st-root .st-canvas:active {\n  cursor:grabbing\n}\n.st-root .st-world {\n  position:absolute;\n  left:0;\n  top:0;\n  transform-origin:0 0;\n  will-change:transform\n}\n.st-root .st-wires {\n  position:absolute;\n  left:0;\n  top:0;\n  overflow:visible;\n  pointer-events:none\n}\n.st-root .st-wire {\n  fill:none;\n  stroke:var(--st-border);\n  stroke-width:1.5;\n  vector-effect:non-scaling-stroke\n}\n.st-root .st-wire-active {\n  stroke:var(--st-accent);\n  stroke-width:1.75\n}\n.st-root .st-node {\n  width:var(--node-w);\n  height:var(--node-h);\n  position:absolute;\n  transform:translate(-50%,-50%);\n  background:var(--st-card);\n  border:1px solid var(--st-border);\n  border-radius:8px;\n  cursor:pointer;\n  color:var(--st-secondary);\n  transition:border-color .12s,box-shadow .12s,opacity .12s\n}\n.st-root .st-node::before {\n  content:'';\n  position:absolute;\n  left:-1px;\n  top:8px;\n  bottom:8px;\n  width:3px;\n  border-radius:0 2px 2px 0;\n  background:transparent\n}\n.st-root .st-node:hover {\n  border-color:var(--st-muted);\n  background:var(--st-hover)\n}\n.st-root .st-onpath {\n  color:var(--st-text)\n}\n.st-root .st-node.st-selected {\n  border-color:var(--st-accent);\n  box-shadow:0 0 0 3px var(--st-soft)\n}\n.st-root .st-node.st-current::before {\n  background:var(--st-accent)\n}\n.st-root .st-dim {\n  opacity:.28\n}\n.st-root .st-detached {\n  border-style:dashed\n}\n.st-root .st-node-body {\n  display:flex;\n  align-items:center;\n  width:100%;\n  height:100%;\n  padding:0 54px 0 14px;\n  color:inherit;\n  text-align:left;\n  background:transparent;\n  border:0;\n  border-radius:inherit;\n  overflow:hidden\n}\n.st-root .st-node-title {\n  font-size:13px;\n  line-height:18px;\n  font-weight:400;\n  white-space:nowrap;\n  text-overflow:ellipsis;\n  overflow:hidden\n}\n.st-root .st-origin {\n  border-radius:999px;\n  color:var(--st-secondary)\n}\n.st-root .st-origin .st-node-body {\n  justify-content:center;\n  padding:0 28px 0 12px;\n  text-align:center\n}\n.st-root .st-origin::before {\n  display:none\n}\n.st-root .st-node-controls {\n  position:absolute;\n  right:4px;\n  top:50%;\n  transform:translateY(-50%);\n  display:flex;\n  align-items:center;\n  gap:2px;\n  opacity:0;\n  pointer-events:none;\n  transition:opacity .12s\n}\n.st-root .st-node:is(:hover,:focus-within,.st-selected,.st-pending) .st-node-controls {\n  opacity:1;\n  pointer-events:auto\n}\n.st-root .st-node-controls .st-button {\n  width:22px;\n  height:24px;\n  border-radius:5px;\n  background:var(--st-card);\n  color:var(--st-secondary)\n}\n.st-root .st-node-controls .st-button:hover:not(:disabled) {\n  background:var(--st-hover);\n  color:var(--st-text)\n}\n.st-root .st-node-flag {\n  display:none\n}\n.st-root .st-lod {\n  background-image:none\n}\n.st-root .st-lod .st-node {\n  width:12px;\n  height:12px;\n  border-radius:50%\n}\n.st-root .st-lod .st-onpath {\n  background:var(--st-accent);\n  border-color:var(--st-accent)\n}\n.st-root .st-lod .st-node :is(.st-node-body,.st-node-controls),.st-root .st-lod .st-node::before {\n  display:none\n}\n.st-root .st-lod :is(.st-selected,.st-current,.st-origin) .st-node-flag {\n  display:block;\n  position:absolute;\n  left:20px;\n  top:50%;\n  transform:translateY(-50%) scale(calc(1 / var(--st-zoom,1)));\n  transform-origin:left center;\n  max-width:160px;\n  overflow:hidden;\n  text-overflow:ellipsis;\n  white-space:nowrap;\n  color:var(--st-text);\n  font-size:12px;\n  pointer-events:none\n}\n.st-root .st-canvas-tools {\n  position:absolute;\n  bottom:8px;\n  left:8px;\n  display:flex;\n  align-items:center;\n  height:30px;\n  padding:0 2px;\n  background:var(--st-card);\n  border:1px solid var(--st-border);\n  border-radius:8px;\n  cursor:default\n}\n.st-root .st-canvas-tools span {\n  font-size:11px;\n  color:var(--st-secondary);\n  min-width:38px;\n  text-align:center;\n  font-variant-numeric:tabular-nums\n}\n.st-root .st-canvas-tools i {\n  height:14px;\n  width:1px;\n  background:var(--st-line);\n  margin:0 3px\n}\n.st-root .st-empty {\n  position:absolute;\n  left:20px;\n  right:20px;\n  bottom:70px;\n  text-align:center;\n  pointer-events:none;\n  color:var(--st-muted);\n  font-size:12px\n}\n.st-root .st-node-menu {\n  position:absolute;\n  max-height:calc(100% - 16px);\n  overflow:auto;\n  z-index:8;\n  min-width:168px;\n  background:var(--st-card);\n  border:1px solid var(--st-border);\n  padding:4px;\n  border-radius:8px;\n  box-shadow:0 6px 20px #00000020;\n  display:flex;\n  flex-direction:column\n}\n.st-root .st-node-menu button {\n  border:0;\n  background:transparent;\n  text-align:left;\n  padding:6px 8px;\n  border-radius:6px;\n  color:var(--st-text);\n  font-size:12px\n}\n.st-root .st-node-menu button:hover {\n  background:var(--st-hover)\n}\n.st-root .st-node-menu .st-danger {\n  color:var(--dsw-alias-state-error-primary,#ce5959)\n}\n.st-root .st-rename {\n  display:flex;\n  gap:6px;\n  padding:0 0 8px\n}\n.st-root .st-rename input {\n  width:0;\n  flex:1;\n  border:1px solid var(--st-border);\n  border-radius:6px;\n  padding:5px;\n  background:var(--st-bg);\n  color:var(--st-text)\n}\n.st-root .st-rename button {\n  border:0;\n  border-radius:6px;\n  background:var(--st-accent);\n  color:#fff;\n  padding:0 10px\n}\n.st-root .st-confirm {\n  border:1px solid var(--st-border);\n  background:var(--st-card);\n  border-radius:8px;\n  padding:10px;\n  font-size:12px;\n  margin:0 0 8px;\n  overflow:auto\n}\n.st-root .st-confirm strong {\n  font-weight:500\n}\n.st-root .st-confirm p {\n  font-size:12px;\n  color:var(--st-muted);\n  line-height:18px;\n  margin:7px 0\n}\n.st-root .st-confirm-actions {\n  display:flex;\n  gap:3px;\n  flex-wrap:wrap\n}\n.st-root.st-loading {\n  align-items:center;\n  justify-content:center;\n  color:var(--st-muted)\n}\n.st-header-button {\n  display:inline-flex;\n  align-items:center;\n  gap:5px;\n  min-height:28px;\n  padding:4px 7px;\n  font:inherit;\n  font-size:12px;\n  color:var(--dsw-alias-label-tertiary,#8a8c94);\n  background:transparent;\n  border:0;\n  border-radius:7px;\n  cursor:pointer;\n  white-space:nowrap\n}\n.st-header-button:hover {\n  background:var(--dsw-alias-interactive-bg-hover,#eceef2);\n  color:var(--dsw-alias-label-primary,#202124)\n}\n@media(prefers-reduced-motion:reduce) {\n  .st-root * {\n    transition:none!important\n  }\n}\n\n@media(hover:none),(pointer:coarse) {\n  .st-root .st-node-controls {opacity:1;pointer-events:auto}\n}\n.st-root[data-size=s] .st-toolbar .st-labeled {padding:0 7px;font-size:12px}\n.st-root .st-node-menu button {display:flex;align-items:center;gap:8px;min-height:30px}\n.st-root .st-node-menu button kbd {margin-left:auto;color:var(--st-muted);font:inherit;font-size:11px}\n.st-root .st-node-menu hr {border:0;border-top:1px solid var(--st-line);margin:4px 0}\n.st-root .st-dialog {position:absolute;z-index:9;left:12px;right:12px;bottom:12px;box-shadow:0 6px 24px #00000020}\n.st-root .st-rename {padding:12px;background:var(--st-card);border:1px solid var(--st-border);border-radius:8px}\n";
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
  const positions=treePositions(graph,(a,b)=>current.get(a.id).cx-current.get(b.id).cx);
  const anchor=current.get('root'),root=positions.get('root');
  const dx=anchor&&root?anchor.cx-root.x:0,dy=anchor&&root?anchor.cy-root.y:0;
  return Object.fromEntries([...positions].map(([id,p])=>[id,{x:p.x+dx,y:p.y+dy}]));
}

/** Find the closest free horizontal slot below the actual parent, not its old slot. */
function nextNodePosition(graph,parentId) {
  const positions=layoutGraph(graph).positions,parent=positions.get(parentId);
  if(!parent)throw new Error('找不到新节点的父节点');
  const y=parent.cy+STEP,blocked=[...positions.values()].filter(p=>Math.abs(p.cy-y)<68);
  const candidates=[parent.cx,...blocked.flatMap(p=>[p.cx+COLUMN,p.cx-COLUMN])];
  candidates.sort((a,b)=>Math.abs(a-parent.cx)-Math.abs(b-parent.cx)||b-a);
  const x=candidates.find(x=>blocked.every(p=>Math.abs(p.cx-x)>=COLUMN-0.01));
  return {x,y};
}

/** Project internal rounds onto human-input cards without removing context events. */
function conversationView(graph, all = false) {
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
  while (id && graph.nodes[id] && !seen.has(id)) { seen.add(id); result.unshift(id); id = graph.nodes[id].parent; }
  return result;
}
function currentHead(graph, sessionId) {
  const head = graph.bindings[sessionId]?.head;
  return graph.nodes[head] ? head : graph.active;
}
const currentNode = (graph,sessionId) => draftBranchesOf(graph)[sessionId] ? `pending:${sessionId}` : currentHead(graph,sessionId);
const nodeExists = (graph,id) => Boolean(graph.nodes[id] || draftForNode(graph,id));
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
  const [menu, setMenu] = useState(null);
  const [rename, setRename] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [size, setSize] = useState('m');
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

  const presentation=useMemo(()=>graph?conversationView(graph,showInternal):null,[graph,showInternal]);
  const selectedId=presentation?.owners.get(selected) ?? selected;
  const targetId=presentation?.targets.get(selectedId) ?? selectedId;
  useEffect(()=>{if(menu)panel.current?.querySelector('.st-node-menu button:not(:disabled)')?.focus();},[menu]);

  const refresh = useCallback(async signal => {
    const next = await api({action: 'get', sessionId}, signal);
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
        if (!busyRef.current && !nodeDrag.current && document.visibilityState !== 'hidden') {
          await refresh(abort.signal);
          setError('');
        }
      } catch (e) { if (!abort.signal.aborted) setError(e.message); }
      if (!abort.signal.aborted) timer = setTimeout(tick, !graph ? 1200 : 2800);
    };
    tick(); return () => { abort.abort(); clearTimeout(timer); };
  }, [refresh, !!graph, visible]);

  const layout = useMemo(() => presentation ? layoutGraph(presentation.graph, size, moving) : null, [presentation, size, moving]);
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
        const z=view.zoom, pad=12, halfW=pos.width*z/2, halfH=pos.height*z/2;
        let x=view.x, y=view.y, cx=x+pos.cx*z, cy=y+pos.cy*z;
        if(cx-halfW<pad)x+=pad-(cx-halfW);
        else if(cx+halfW>vw-pad)x-=(cx+halfW)-(vw-pad);
        if(cy-halfH<pad)y+=pad-(cy-halfH);
        else if(cy+halfH>vh-pad)y-=(cy+halfH)-(vh-pad);
        if(x!==view.x||y!==view.y){viewTouched.current=true;nextView={...view,x,y};}
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
    setMenu(null);
    return run(async()=>{
      const cur=graphRef.current;
      const branchParent=draftForNode(cur,id)?id:(presentation.targets.get(id)??id);
      await compose(await api({action:'branch',sessionId,revision:cur.revision,id:branchParent}));
    });
  }
  const cancelBranch=(id=selectedId)=>{setMenu(null);return run(async()=>compose(await api({action:'cancel-branch',sessionId,revision:graphRef.current.revision,id})));};
  async function jump(id) {
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
    setSelected(id);
    setMenu(null);
    setError('');
    persistCache(graph, id, view, viewTouched.current, showInternal);
  }
  function handleNodeClick(event, id) {
    event.stopPropagation();
    if (ignoreClick.current?.id === id && Date.now() < ignoreClick.current.until) return;
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
    const updated = await api({action: 'edit', sessionId, revision: graphRef.current.revision, operation});
    graphRef.current=updated;
    setGraph(updated); setMenu(null); setConfirm(null); setRename(null);
    const head = updated.bindings[sessionId]?.head;
    const target = updated.nodes[head] ? head : updated.active;
    const nextSelected = nodeExists(updated,selected) ? selected : target;
    setSelected(nextSelected);
    persistCache(updated, nextSelected, view, viewTouched.current, showInternal);
    const path = ancestors(updated, target);
    if (path[0] === 'root' && path.join('/') !== previousPath && path.join('/') !== updated.bindings[sessionId]?.key) {
      const result = await api({action: 'activate', sessionId, revision: updated.revision, id: target});
      const activatedHead = currentNode(result.graph, result.sessionId) ?? target;
      setSelected(activatedHead);
      if (result.sessionId !== sessionId) pendingSelection = {sessionId: result.sessionId, id: activatedHead};
      navigate(result, activatedHead);
    }
  }
  function beginNode(event,id) {
    if(event.button!==0 || busyRef.current)return;
    navigation.cancel();ignoreClick.current=null;setMenu(null);
    viewTouched.current=true;
    event.stopPropagation();event.preventDefault();event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);
    const p=layout.positions.get(id);setSelected(id);
    nodeDrag.current={id,pointerId:event.pointerId,x:event.clientX,y:event.clientY,position:{x:p.cx,y:p.cy},zoom:view.zoom,moved:false};
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
  const current = presentation.owners.get(currentNode(graph, sessionId)) ?? 'root', activePath = ancestors(graph, currentHead(graph,sessionId)), pathSet = new Set([...activePath,current]);
  const node = presentation.graph.nodes[selectedId], selectedPath = ancestors(graph, targetId), connected = selectedPath[0] === 'root', isDraft=node?.kind==='pending';
  const hasRealChild = Object.values(presentation.graph.nodes).some(n => n.parent === selectedId && n.kind !== 'pending');
  const leaf = node && !isDraft && !hasRealChild;
  const dirty = activePath.join('/') !== graph.bindings[sessionId]?.key;
  const lod = view.zoom < .6;
  return h('section', {className: 'st-root', ref: panel, 'data-size': size, 'aria-label': 'tree-chat 对话管理', 'aria-busy': busy, onPointerDown:e=>{if(menu&&!e.target.closest('.st-node-menu'))setMenu(null);}, onKeyDown: e => {
    if (e.target.matches('input,textarea')&&e.key!=='Escape') return;
    if (e.key === 'Escape') {if(nodeDrag.current)ignoreClick.current={id:nodeDrag.current.id,until:Date.now()+400};nodeDrag.current=null;setMoving({});setConfirm(null);setRename(null);setMenu(null);navigation.cancel();}
    if ((e.ctrlKey || e.metaKey) && ['z','y'].includes(e.key.toLowerCase())) {e.preventDefault();run(() => mutate({type:e.shiftKey||e.key.toLowerCase()==='y'?'redo':'undo'}));}
  }},
    h('div', {className: 'st-toolbar'}, h('label', {className: 'st-search'}, h(Icon, {name: 'search', size: 14}), h('input', {value: query, onChange: e => setQuery(e.target.value), placeholder: '搜索节点', 'aria-label': '搜索节点'})),
      h(Button,{icon:'plus',label:'新建分支',disabled:busy||!connected,onClick:()=>createBranch(),children:'新建分支'}),
      h(Button,{icon:'arrange',label:'整理节点',disabled:busy,onClick:()=>{viewTouched.current=false;run(()=>mutate({type:'arrange',id:'root',includeInternal:showInternal}));}}),
      h('button',{type:'button',className:'st-button','aria-label':'对话树选项','aria-haspopup':'menu','aria-expanded':menu?.kind==='global',onClick:e=>openMenu(e,'global')},h(Icon,{name:'more'}))),
    error && h('div', {className: 'st-error', role: 'alert'}, h('span', null, error), h(Button, {icon: 'close', label: '关闭提示', onClick: () => setError('')})),
    dirty && h('div', {className: 'st-notice'}, '上下文待应用'),
    h('div', {className: `st-canvas${lod?' st-lod':''}${Object.keys(moving).length?' st-node-dragging':''}`, ref: viewport, tabIndex: 0, 'aria-label': '对话树画布，可拖动节点或空白处平移，滚轮缩放', style:{'--st-zoom':view.zoom,backgroundSize:`${24*view.zoom}px ${24*view.zoom}px`,backgroundPosition:`${view.x}px ${view.y}px`},
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
      onWheel: e => {if(nodeDrag.current)return;const rect = viewport.current.getBoundingClientRect(); zoomTo(view.zoom * Math.exp(-e.deltaY * .0015), {x: e.clientX - rect.left, y: e.clientY - rect.top});},
      onPointerDown: e => {
        if (e.target.closest('button,input,.st-node')) return;
        viewTouched.current = true; e.currentTarget.setPointerCapture(e.pointerId); drag.current = {x: e.clientX, y: e.clientY, view};
      },
      onPointerMove: e => {
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
        if(nodeDrag.current?.pointerId===e.pointerId){const n=nodeDrag.current;nodeDrag.current=null;if(n.moved){ignoreClick.current={id:n.id,until:Date.now()+400};savePosition(n.id,n.latest);}return;}
        drag.current = null;
      }, onPointerCancel: () => {if(nodeDrag.current)ignoreClick.current={id:nodeDrag.current.id,until:Date.now()+400};nodeDrag.current=null;setMoving({});drag.current = null;},onLostPointerCapture:()=>{if(nodeDrag.current){ignoreClick.current={id:nodeDrag.current.id,until:Date.now()+400};nodeDrag.current=null;setMoving({});}}
    },
      h('div', {className: 'st-world', style: {width: layout.width, height: layout.height, transform: `translate(${view.x}px,${view.y}px) scale(${view.zoom})`}},
        h('svg', {className: 'st-wires', width: layout.width, height: layout.height},
          ...[...layout.positions.values()].filter(p => p.node.parent).map(p => {
            const parent = layout.positions.get(p.node.parent), x = parent.cx, y=parent.cy+(lod?6:parent.height/2), x2=p.cx, y2=p.cy-(lod?6:p.height/2);
            const d=`M${x},${y} C${x},${y+27} ${x2},${y2-27} ${x2},${y2}`;
            return h('path', {key:p.node.id,d,className:`st-wire${pathSet.has(p.node.id)?' st-wire-active':''}`});
          })),
        ...[...layout.positions.values()].map(p => {
          const n=p.node, label=n.id==='root'&&n.label==='对话起点'?'起点':n.label, match=!query || n.label.toLowerCase().includes(query.toLowerCase());
          return h('article', {key:n.id, 'data-node-id':n.id, className:`st-node${n.id==='root'?' st-origin':''}${n.kind==='pending'?' st-pending':''}${n.id===selectedId?' st-selected':''}${moving[n.id]?' st-moving':''}${pathSet.has(n.id)?' st-onpath':''}${n.id===current?' st-current':''}${n.parent===null&&n.id!=='root'?' st-detached':''}${!match?' st-dim':''}`, style:{left:p.cx,top:p.cy,'--node-w':`${p.width}px`,'--node-h':`${p.height}px`}, title:n.kind==='pending'?'新分支':n.id==='root'?'对话起点':`${n.label}\n第 ${p.depth} 轮 · ${new Date(n.createdAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}${n.parent===null?' · 未连接':''}`, onClick:e=>handleNodeClick(e,n.id), onDoubleClick:e=>handleNodeDoubleClick(e,n.id), onContextMenu:e=>openMenu(e,n.id)},
            h('button',{className:'st-node-body', onPointerDown:e=>beginNode(e,n.id), onClick:e=>handleNodeClick(e,n.id), onDoubleClick:e=>handleNodeDoubleClick(e,n.id), 'aria-label':n.label, 'aria-pressed':n.id===selectedId},h('span',{className:'st-node-title'},label)),
            h('div',{className:'st-node-controls'},n.kind==='pending'
              ?h('button',{className:'st-button','aria-label':n.id===selectedId?'节点操作':`节点操作：${n.label}`,title:'节点操作',onPointerDown:e=>e.stopPropagation(),onClick:e=>openMenu(e,n.id)},h(Icon,{name:'more',size:14}))
              :h(React.Fragment,null,h('button',{className:'st-button st-node-add','aria-label':`从 ${n.label} 新建分支`,title:'从这里新建分支',disabled:busy||ancestors(graph,presentation.targets.get(n.id)??n.id)[0]!=='root',onPointerDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();createBranch(n.id);}},h(Icon,{name:'plus',size:14})),n.id!=='root'&&h('button',{className:'st-button st-node-more','aria-label':n.id===selectedId?'节点操作':`节点操作：${n.label}`,title:'节点操作',onPointerDown:e=>e.stopPropagation(),onClick:e=>openMenu(e,n.id)},h(Icon,{name:'more',size:14})))),
            h('span',{className:'st-node-flag','aria-hidden':true},label),
            );
        })),
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
      :isDraft?h(React.Fragment,null,
        h('button',{role:'menuitem',disabled:busy,onClick:()=>createBranch()},h(Icon,{name:'play'}),'继续分支'),
        h('button',{role:'menuitem',onClick:()=>{setRename(node.label);setMenu(null);}},'重命名节点'),
        h('button',{role:'menuitem',className:'st-danger',disabled:busy,onClick:()=>cancelBranch()},h(Icon,{name:'trash'}),'删除空分支'))
      :h(React.Fragment,null,
        h('button',{role:'menuitem',disabled:busy||!connected,onClick:()=>createBranch()},h(Icon,{name:'plus'}),'新建分支'),
        leaf&&selectedId!==current&&h('button',{role:'menuitem',disabled:busy||!connected,onClick:activate},h(Icon,{name:'play'}),'继续这条分支'),
        h('button',{role:'menuitem',onClick:()=>{setRename(node.label);setMenu(null);}},'重命名节点'),
        !connected&&h('button',{role:'menuitem',disabled:busy,onClick:()=>run(()=>mutate({type:'reparent',id:selectedId,parent:'root'}))},'接回起点'),
        selectedId!=='root'&&h('button',{role:'menuitem',className:'st-danger',onClick:()=>{setConfirm({type:'delete',id:selectedId});setMenu(null);}},'删除节点…'))),
    rename!==null && h('form',{className:'st-dialog st-rename',role:'dialog','aria-label':'重命名节点',onSubmit:e=>{e.preventDefault();run(()=>mutate({type:'rename',id:selectedId,label:rename}));}},h('input',{value:rename,onChange:e=>setRename(e.target.value),maxLength:200,'aria-label':'节点名称',autoFocus:true}),h('button',{type:'submit',disabled:busy},'保存'),h('button',{type:'button',onClick:()=>setRename(null)},'取消')),
    confirm && h('div',{className:'st-dialog st-confirm',role:'alertdialog','aria-label':'删除节点'},
      h('strong',null,'如何删除这个节点？'),
      h('p',null,'保留后续会自动接好上下文，可撤销。'),
      h('div',{className:'st-confirm-actions'},h(Button,{label:'删除并保留后续',onClick:()=>run(()=>mutate({type:'delete',id:confirm.id,grouped:!showInternal})),children:'保留后续'}),h(Button,{label:'删除整枝',onClick:()=>run(()=>mutate({type:'delete',id:confirm.id,subtree:true})),children:'删除整枝'}),h(Button,{label:'取消',onClick:()=>setConfirm(null),children:'取消'}))));
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
