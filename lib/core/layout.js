export const NODE_SIZES = {s:{width:168,height:40},m:{width:188,height:44},l:{width:200,height:44}};
const COLUMN = 228, STEP = 80;

/** Clamp a newly selected card into the viewport after a native pane transition. */
export function nodeVisibleView(view,position,width,height,pad=12){
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
export function layoutGraph(graph,size='l',moving={}) {
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
export function arrangedPositions(graph) {
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
export function nextNodePosition(graph,parentId) {
  return new PlacementIndex(layoutGraph(graph).positions).next(parentId);
}

/** Reuse spatial rows across a batch of imported turns instead of rebuilding the tree per turn. */
export class PlacementIndex {
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
