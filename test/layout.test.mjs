import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGraph,editGraph,pathKey} from '../src/core/graph.js';
import {layoutGraph,arrangedPositions,nextNodePosition,PlacementIndex,nodeVisibleView} from '../src/core/layout.js';

function sample(){
  const graph=newGraph('session-layout');graph.nodes.root.position={x:140,y:-100};
  for(const [id,x,y,parent]of [['a',500,100,'root'],['b',-400,210,'root'],['c',40,170,'root'],['leaf',-350,400,'b']]){
    graph.nodes[id]={id,parent,label:id,createdAt:1,position:{x,y},source:{sessionId:graph.id,start:0,end:1}};
  }
  graph.active='leaf';return graph;
}

test('窄侧栏切换后新卡片完整进入视野，已可见时不挪动画布',()=>{
  const view={x:-900,y:40,zoom:1.4},p={cx:1400,cy:1000,width:168,height:40};
  const next=nodeVisibleView(view,p,320,700);
  assert.ok(next.x+(p.cx+p.width/2)*next.zoom<=308.01);
  assert.ok(next.y+(p.cy+p.height/2)*next.zoom<=688.01);
  assert.equal(nodeVisibleView(next,p,320,700),next);
});
function noOverlaps(graph){
  const nodes=[...layoutGraph(graph).positions.values()];
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)assert.ok(Math.abs(nodes[i].cx-nodes[j].cx)>=Math.max(nodes[i].width,nodes[j].width)+20||Math.abs(nodes[i].cy-nodes[j].cy)>=Math.max(nodes[i].height,nodes[j].height)+20,`${nodes[i].node.id} overlaps ${nodes[j].node.id}`);
}

test('批量放置与单节点放置一致，并可复用空间索引导入五千轮深对话',()=>{
  const graph=sample(),index=new PlacementIndex(layoutGraph(graph).positions);
  assert.deepEqual(index.next('b'),nextNodePosition(graph,'b'));
  let parent='leaf';
  for(let i=0;i<5000;i++){
    const pos=index.next(parent),id=`new-${i}`;index.add(id,pos);
    assert.ok(Number.isFinite(pos.x)&&Number.isFinite(pos.y));parent=id;
  }
  assert.equal(index.positions.size,5005);
});
test('整理保留当前左右顺序、统一层级、无重叠且可撤销，不改变上下文路径',()=>{
  const original=sample(),key=pathKey(original,'leaf'),arranged=editGraph(original,{type:'arrange',id:'root'});
  const nodes=arranged.nodes;
  assert.ok(nodes.b.position.x<nodes.c.position.x&&nodes.c.position.x<nodes.a.position.x);
  assert.equal(nodes.a.position.y,nodes.b.position.y);assert.equal(nodes.b.position.y,nodes.c.position.y);
  assert.deepEqual(nodes.root.position,original.nodes.root.position);
  assert.equal(nodes.leaf.position.x,nodes.b.position.x);
  assert.equal(pathKey(arranged,'leaf'),key);noOverlaps(arranged);
  assert.deepEqual(arrangedPositions(arranged),Object.fromEntries(Object.values(nodes).map(n=>[n.id,n.position])));
  assert.deepEqual(editGraph(arranged,{type:'undo'}).nodes,original.nodes);
  assert.deepEqual(editGraph(editGraph(arranged,{type:'undo'}),{type:'redo'}).nodes,nodes);
});
test('新节点从已移动父节点下方寻找最近空位，避开现有节点，逻辑坐标不随侧栏尺寸变化',()=>{
  const graph=sample();graph.nodes.b.position={x:800,y:600};
  graph.nodes.a.position={x:800,y:680};graph.nodes.c.position={x:1028,y:680};
  const original=structuredClone(graph),next=nextNodePosition(graph,'b');
  assert.deepEqual(next,{x:572,y:680});assert.deepEqual(graph,original);
  graph.nodes.new={...graph.nodes.a,id:'new',parent:'b',position:next};noOverlaps(graph);
  for(const size of ['s','m','l'])assert.equal(layoutGraph(graph,size).positions.get('new').cx,next.x);
});
