import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGraph,editGraph,validateGraph,pathKey} from '../src/core/graph.js';
import {conversationView} from '../src/core/presentation.js';
import {turnsOf,compilePath} from '../src/host/context.js';
import {getShiftSelectionPath,validateGroupCandidate} from '../src/core/groups.js';
import {fixture,automationFixture} from './fixtures.mjs';
import {layoutGraph,arrangedPositions} from '../src/core/layout.js';

function chain(count=6,data=fixture(count,false)){
  const graph=newGraph(data.header.id);let parent='root';
  for(const [i,t]of turnsOf(data.events).entries()){
    const id=String(i+1);graph.nodes[id]={id,parent,label:t.label,kind:t.kind,position:{x:140,y:110+i*80},createdAt:t.createdAt,source:{sessionId:graph.id,start:t.start,end:t.end}};parent=id;
  }
  graph.active=parent;return {graph,data};
}
const create=(g,ids,name='集合')=>editGraph(g,{type:'group-create',ids,name});
const firstGroup=g=>Object.values(g.groups)[0];
function validView(graph){const view=conversationView(graph).graph;for(const n of Object.values(view.nodes)){assert.notEqual(n.parent,n.id);if(n.parent!==null)assert.ok(view.nodes[n.parent]);}return view;}
const content=nodes=>Object.fromEntries(Object.entries(nodes).map(([id,{position,...n}])=>[id,n]));
test('集合只接受连通节点，拒绝起点、跨过中间节点、空分支和重叠；Shift 支持共同祖先路径',()=>{
  const {graph}=chain();assert.throws(()=>create(graph,['1','3']),/不连通|入口/);
  assert.throws(()=>create(graph,['root','1']),/root|起点/);
  assert.throws(()=>create(graph,['1','pending:missing']),/空分支/);
  const g=create(graph,['1','2']);assert.throws(()=>create(g,['2','3']),/已属于集合/);
  assert.deepEqual(new Set(getShiftSelectionPath(graph.nodes,'2','4')),new Set(['2','3','4']));
  graph.nodes.side={...graph.nodes['3'],id:'side',parent:'2'};
  assert.deepEqual(new Set(getShiftSelectionPath(graph.nodes,'4','side')),new Set(['4','3','2','side']));
  assert.equal(validateGroupCandidate(graph.nodes,['3','side']).ok,false);
});
test('折叠、展开、重命名、取消与拆分均保留原节点和模型上下文；展开不占撤销历史',async()=>{
  const {graph,data}=chain(),originalNodes=structuredClone(graph.nodes);
  let g=create(graph,['1','2','3','4'],'研究过程'),id=firstGroup(g).id;
  assert.deepEqual(content(g.nodes),content(originalNodes));assert.equal(Object.keys(validView(g).nodes).length,4);
  const compile=await compilePath(g,'6',async()=>data);
  assert.deepEqual(compile.seed.filter(e=>e.type==='user/message').map(e=>e.data.content[0].text),['问题 1','问题 2','问题 3','问题 4','问题 5','问题 6']);
  const undoCount=g.undo.length;g=editGraph(g,{type:'group-toggle',id,collapsed:false});assert.equal(g.undo.length,undoCount);
  assert.equal(Object.keys(validView(g).nodes).length,7);
  g=editGraph(g,{type:'rename',id,label:'新名称'});assert.equal(g.groups[id].name,'新名称');
  g=editGraph(g,{type:'group-split',id,cutId:'3',name:'后半段'});
  assert.equal(Object.keys(g.groups).length,2);assert.equal(firstGroup(g).nodeIds.length,2);
  assert.deepEqual(content(g.nodes),content(originalNodes));assert.equal(pathKey(g,'6'),pathKey(graph,'6'));
  const undone=editGraph(g,{type:'undo'});assert.equal(Object.keys(undone.groups).length,1);
  g=editGraph(undone,{type:'group-dissolve',id});assert.equal(Object.keys(g.groups).length,0);assert.deepEqual(content(g.nodes),content(originalNodes));
});
test('Y 型集合保留多个出口，删除入口自动修复为连通集合并可撤销；孤立单节点释放',()=>{
  const {graph}=chain(5);graph.nodes['4'].parent='1';
  let g=create(graph,['1','2','3','4','5']);const group=firstGroup(g);
  g.nodes.outA={...g.nodes['3'],id:'outA',parent:'3'};g.nodes.outB={...g.nodes['5'],id:'outB',parent:'5'};
  let view=validView(g);assert.equal(view.nodes.outA.parent,group.id);assert.equal(view.nodes.outB.parent,group.id);
  const deleted=editGraph(g,{type:'delete',id:'1'});assert.equal(Object.keys(deleted.groups).length,2);validView(deleted);
  const longName=editGraph(g,{type:'rename',id:group.id,label:'长'.repeat(80)});
  validateGraph(editGraph(longName,{type:'delete',id:'1'}));
  assert.deepEqual(editGraph(deleted,{type:'undo'}).groups,g.groups);
  const split=editGraph(g,{type:'group-split',id:group.id,cutId:'3',name:'单节点'});
  assert.equal(Object.keys(split.groups).length,1);assert.ok(validView(split).nodes['3']);
});
test('集合移动同步平移成员，整理不改路径，搜索临时展开但不改折叠存档',()=>{
  const {graph}=chain();let g=create(graph,['2','3','4']);const id=firstGroup(g).id,prior=structuredClone(g);
  g=editGraph(g,{type:'move',id,position:{x:firstGroup(g).position.x+200,y:firstGroup(g).position.y+40}});
  for(const nid of ['2','3','4'])assert.equal(g.nodes[nid].position.x,prior.nodes[nid].position.x+200);
  const search=conversationView(g,false,'问题 3');assert.ok(search.graph.nodes['3']);assert.equal(g.groups[id].collapsed,true);
  assert.equal(conversationView(g).owners.get('3'),id);
  const sorted=editGraph(g,{type:'arrange',id:'root'});assert.equal(pathKey(sorted,'6'),pathKey(g,'6'));validView(sorted);
  assert.deepEqual(editGraph(sorted,{type:'undo'}).nodes,g.nodes);
});
test('内部轮次分组与原生空枝出口投影完整，分组后新消息不自动吸入',()=>{
  const data=automationFixture(),{graph}=chain(6,data);
  const g=create(graph,['1','5']);const group=firstGroup(g);
  assert.ok(group.nodeIds.includes('2'));assert.ok(group.nodeIds.includes('4'));
  g.nodes.new={...g.nodes['5'],id:'new',parent:'4',label:'新消息'};
  g.bindings[g.id]={head:'6',key:pathKey(g,'6'),seen:100};g.bindings['session-empty']={head:'3',key:pathKey(g,'3'),seen:100};
  g.draftBranches={'session-empty':{sessionId:'session-empty',parent:'3',createdAt:1,returnSessionId:g.id,position:{x:500,y:500}}};
  validateGraph(g);const view=validView(g);
  assert.equal(view.nodes.new.parent,group.id);assert.equal(view.nodes['pending:session-empty'].parent,group.id);
  assert.equal(conversationView(g).owners.get('3'),group.id);
});
test('深树投影不使用递归，集合 ID、名称和坐标非法时拒绝写入',()=>{
  const {graph}=chain(2);const g=create(graph,['1','2']),id=firstGroup(g).id;
  for(const patch of [{name:''},{position:{x:Infinity,y:0}},{nodeIds:['root','1']},{entryId:'missing'}])assert.throws(()=>validateGraph({...g,groups:{[id]:{...g.groups[id],...patch}}}));
  const deep=newGraph('session-deep');let parent='root';
  for(let i=0;i<12000;i++){const id=`n${i}`;deep.nodes[id]={id,parent,label:id,kind:'user',createdAt:0,position:{x:0,y:i*40},source:{sessionId:deep.id,start:0,end:1}};parent=id;}
  deep.active=parent;const all=Object.keys(deep.nodes).filter(n=>n!=='root');
  const grouped=create(deep,all);assert.equal(Object.keys(validView(grouped).nodes).length,2);
});
