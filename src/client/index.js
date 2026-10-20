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
  folder: 'M3 7V4h6l2 3h10v13H3zM7 13h10m-3-3 3 3-3 3',
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
  const [projectDialog,setProjectDialog]=useState(false),[projectSummary,setProjectSummary]=useState({enabled:false,error:null});
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
  useEffect(()=>{
    const cancel=()=>{finishMarquee(true);nodeDrag.current=null;drag.current=null;spaceHeld.current=false;setMoving({});};
    window.addEventListener('blur',cancel);return()=>window.removeEventListener('blur',cancel);
  },[]);

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
    if(next.projectSync&&!signal?.aborted)setProjectSummary(old=>old.enabled===next.projectSync.enabled&&old.error===next.projectSync.error?old:next.projectSync);
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
      h('button',{type:'button',className:`st-button${projectSummary.error?' st-sync-error':''}`,'aria-label':'项目同步',title:projectSummary.error??'项目同步','aria-pressed':projectSummary.enabled,onClick:()=>setProjectDialog(true)},h(Icon,{name:'folder'})),
      h('button',{type:'button',className:'st-button','aria-label':'对话树选项','aria-haspopup':'menu','aria-expanded':menu?.kind==='global',onClick:e=>openMenu(e,'global')},h(Icon,{name:'more'}))),
    error && h('div', {className: 'st-error', role: 'alert'}, h('span', null, error), h(Button, {icon: 'close', label: '关闭提示', onClick: () => setError('')})),
    dirty && h('div', {className: 'st-notice'}, '上下文待应用'),
    h('div', {className: `st-canvas${lod?' st-lod':''}${Object.keys(moving).length?' st-node-dragging':''}${boxSelect?' st-box-select':''}`, ref: viewport, tabIndex: 0, 'aria-label': '对话树画布，左键拖动空白框选，右键、中键或空格拖动平移，滚轮缩放', style:{'--st-zoom':view.zoom,backgroundSize:`${24*view.zoom}px ${24*view.zoom}px`,backgroundPosition:`${view.x}px ${view.y}px`},
      onContextMenu:e=>{if(!e.target.closest('.st-node'))e.preventDefault();},
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
        if (e.target.closest('button,input,.st-node')||busyRef.current||![0,1,2].includes(e.button)) return;
        finishMarquee();drag.current=null;
        e.preventDefault();e.currentTarget.focus();navigation.cancel();setMenu(null);viewTouched.current = true;e.currentTarget.setPointerCapture(e.pointerId);
        if(e.button===0&&boxSelect&&!spaceHeld.current){
          const start=canvasPoint(e),originalIds=selectedIds.length?selectedIds:[selectedId].filter(Boolean);
          marquee.current={pointerId:e.pointerId,start,base:e.shiftKey||e.ctrlKey||e.metaKey?originalIds:[],originalIds,originalSelected:selected};setSelectionBox(selectionRect(start,start));
        }else drag.current={x:e.clientX,y:e.clientY,view};
      },
      onPointerMove: e => {
        const m=marquee.current;
        if(m?.pointerId===e.pointerId){
          if(!(e.buttons&1)){finishMarquee();return;}
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
          if(!e.buttons){drag.current=null;return;}
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
    projectDialog&&h(ProjectDialog,{sessionId,ctx,onClose:()=>setProjectDialog(false),onStatus:setProjectSummary,onImported:result=>{setProjectDialog(false);setProjectSummary({enabled:false,error:null});setSelectedIds([]);setSelected(result.graph.active);viewTouched.current=false;navigate(result,result.graph.active);}}),
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
