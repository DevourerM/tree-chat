import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGraph,editGraph,pathKey} from '../src/core/graph.js';
import {conversationView} from '../src/core/presentation.js';
import {layoutGraph} from '../src/core/layout.js';
import {marqueeIds,selectionRect} from '../src/client/selection.js';
function sample(){
  const g=newGraph('layout-regression');let parent='root';
  for(let i=1;i<=9;i++){const id=String(i);g.nodes[id]={id,parent,label:`问题 ${i}`,kind:'user',position:{x:140,y:30+i*80},createdAt:i,source:{sessionId:g.id,start:i,end:i}};parent=id;}
  g.nodes.side={...g.nodes['7'],id:'side',parent:'2',position:{x:-200,y:590}};g.active='9';
  return g;
}
const create=(g,ids,name='组')=>editGraph(g,{type:'group-create',ids,name});
const first=g=>Object.values(g.groups)[0];
function check(g,query=''){
  const view=conversationView(g,false,query),positions=layoutGraph(view.graph).positions,list=[...positions.values()];
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)assert.ok(Math.abs(list[i].cx-list[j].cx)>=220||Math.abs(list[i].cy-list[j].cy)>=64,`${list[i].node.id} overlaps ${list[j].node.id}`);
  for(const p of list)if(p.node.parent)assert.equal(p.cy-positions.get(p.node.parent).cy,80,'consistent parent/child spacing');
  return positions;
}
test('创建集合压紧下游，整理后反复展开/收起及取消均无重叠，保持上下文与左右分枝顺序',()=>{
  const original=sample(),key=pathKey(original,'9');let g=create(original,['2','3','4','5','6']),id=first(g).id;
  let p=check(g);assert.equal(p.get('7').cy-p.get(id).cy,80);assert.ok(p.get('side').cx<p.get('7').cx);
  for(let i=0;i<4;i++){
    g=editGraph(g,{type:'arrange',id:'root'});g=editGraph(g,{type:'group-toggle',id,collapsed:false});check(g);
    assert.equal(pathKey(g,'9'),key);g=editGraph(g,{type:'group-toggle',id,collapsed:true});check(g);
  }
  check(g,'问题 4');assert.equal(g.groups[id].collapsed,true);
  g=editGraph(g,{type:'group-dissolve',id});check(g);assert.equal(pathKey(g,'9'),key);
});
test('批量展开/折叠一次布局覆盖多个串行集合、已有空枝和混合状态，不占撤销历史',()=>{
  let g=create(sample(),['2','3','4']);g=create(g,['5','6','7']);
  g.bindings[g.id]={head:'9',key:pathKey(g,'9'),seen:20};g.bindings.empty={head:'8',key:pathKey(g,'8'),seen:20};
  g.draftBranches={empty:{sessionId:'empty',parent:'8',createdAt:0,returnSessionId:g.id,position:{x:140,y:670}}};
  const count=g.undo.length;
  for(const collapsed of [false,true,false]){g=editGraph(g,{type:'group-toggle-all',collapsed});check(g);assert.equal(g.undo.length,count);assert.ok(Object.values(g.groups).every(x=>x.collapsed===collapsed));}
});
test('删除集合可桥接所有出口或删除整枝，原子撤销恢复；下游空枝拒绝删除',()=>{
  const grouped=create(sample(),['2','3','4']),id=first(grouped).id;
  const deleted=editGraph(grouped,{type:'group-delete',id});
  assert.equal(deleted.nodes['5'].parent,'1');assert.equal(deleted.nodes.side.parent,'1');assert.ok(!deleted.nodes['2']);check(deleted);
  assert.deepEqual(editGraph(deleted,{type:'undo'}).nodes,grouped.nodes);assert.deepEqual(editGraph(deleted,{type:'undo'}).groups,grouped.groups);
  const subtree=editGraph(grouped,{type:'group-delete',id,subtree:true});assert.deepEqual(new Set(Object.keys(subtree.nodes)),new Set(['root','1']));assert.equal(subtree.active,'1');
  const blocked=structuredClone(grouped);blocked.bindings.empty={head:'9',key:pathKey(blocked,'9'),seen:20};blocked.bindings[blocked.id]={head:'9',key:pathKey(blocked,'9'),seen:20};
  blocked.draftBranches={empty:{sessionId:'empty',parent:'9',createdAt:0,returnSessionId:blocked.id}};
  assert.throws(()=>editGraph(blocked,{type:'group-delete',id}),/空分支/);assert.deepEqual(blocked.nodes,grouped.nodes);
});
test('框选按逻辑坐标命中卡片边界，支持反向矩形、负坐标、追加选择且不选中起点',()=>{
  const g=sample(),positions=layoutGraph(g).positions;
  const rect=selectionRect({x:150,y:360},{x:35,y:180});
  assert.deepEqual(marqueeIds(positions,rect),['2','3','4']);
  assert.deepEqual(marqueeIds(positions,rect,['side']),['side','2','3','4']);
  assert.deepEqual(marqueeIds(positions,selectionRect({x:-301,y:568},{x:-299,y:612})),['side']);
  assert.ok(!marqueeIds(positions,{left:-10000,top:-10000,right:10000,bottom:10000}).includes('root'));
});
