import {test} from 'node:test';
import assert from 'node:assert/strict';
import {automationFixture} from './fixtures.mjs';
import {turnsOf,compilePath,updateNodePresentation,messageLocation} from '../src/host/context.js';
import {conversationView} from '../src/core/presentation.js';
import {newGraph,editGraph,pathKey} from '../src/core/graph.js';
function sample() {
  const data=automationFixture(),graph=newGraph(data.header.id);
  turnsOf(data.events).forEach((t,i)=>{const id=String(i+1);graph.nodes[id]={id,parent:i?String(i):'root',label:t.label,kind:t.kind,labelMode:'auto',createdAt:t.createdAt,source:{sessionId:graph.id,start:t.start,end:t.end}};graph.active=id;});
  return {graph,data};
}
test('使用真实来源标记识别用户输入，同一轮中跳过先注入的权限提示',()=>{
  const turns=turnsOf(automationFixture().events);
  assert.deepEqual(turns.map(t=>t.kind),['user','internal','internal','internal','user','internal']);
  assert.deepEqual(turns.map(t=>t.label),['研究第一个问题','权限变更','自动继续','自动继续','继续研究第二个问题','自动继续']);
  const events=automationFixture().events;
  const first=events.find(e=>e.type==='user/message');first.data.content[0].text='<goal_round>用户实际输入的示例</goal_round>';
  assert.equal(turnsOf(events)[0].kind,'user');assert.match(turnsOf(events)[0].label,/用户实际输入/);
});
test('旧标题迁移保留自定义名称，自动标题改为真实输入',()=>{
  const turn=turnsOf(automationFixture().events)[4],auto={label:turn.legacyLabel},custom={label:'我的标题'};
  updateNodePresentation(auto,turn);updateNodePresentation(custom,turn);
  assert.equal(auto.label,'继续研究第二个问题');assert.equal(auto.labelMode,'auto');assert.equal(custom.label,'我的标题');assert.equal(custom.labelMode,'custom');
});
test('默认投影仅显示用户输入，继续位置覆盖自动轮次，完整视图可恢复所有节点',()=>{
  const {graph}=sample(),view=conversationView(graph);
  assert.deepEqual(Object.keys(view.graph.nodes),['1','5','root']);assert.equal(view.graph.nodes['5'].parent,'1');
  assert.equal(view.owners.get('6'),'5');assert.equal(view.targets.get('1'),'4');assert.equal(view.targets.get('5'),'6');
  assert.equal(Object.keys(conversationView(graph,true).graph.nodes).length,7);assert.equal(Object.keys(graph.nodes).length,7);
  const split=structuredClone(graph);split.nodes.side={...split.nodes['2'],id:'side',parent:'1'};
  assert.equal(conversationView(split).targets.get('1'),'1');
});
test('用户视图不删模型消息，自动轮次和成组工具完整保留',async()=>{
  const {graph,data}=sample(),view=conversationView(graph);
  const {seed}=await compilePath(graph,view.targets.get('5'),async()=>data);
  const users=seed.filter(e=>e.type==='user/message');
  assert.equal(users.length,7);assert.ok(users.some(e=>e.data.source.kind==='goal'));
  assert.equal(seed.filter(e=>e.type==='tool/result').length,1);
});
test('删除用户节点包含其折叠的自动轮次，后续用户输入与撤销保持完整',async()=>{
  const {graph,data}=sample(),deleted=editGraph(graph,{type:'delete',id:'1',grouped:true});
  assert.deepEqual(Object.keys(deleted.nodes),['5','6','root']);assert.equal(deleted.nodes['5'].parent,'root');
  const {seed}=await compilePath(deleted,'6',async()=>data);
  assert.equal(seed.filter(e=>e.type==='tool/result').length,0);
  assert.ok(!seed.some(e=>e.type==='user/message'&&e.data.content[0].text==='研究第一个问题'));
  assert.deepEqual(editGraph(deleted,{type:'undo'}).nodes,graph.nodes);
});
test('移动只改变位置；负坐标、撤销/重做、自动排列及无效坐标验证',()=>{
  const {graph}=sample(),key=pathKey(graph,'6');
  const moved=editGraph(graph,{type:'move',id:'5',position:{x:-160,y:430}});
  assert.equal(pathKey(moved,'6'),key);assert.deepEqual(moved.nodes['5'].source,graph.nodes['5'].source);
  assert.equal(graph.nodes['5'].position,undefined);assert.deepEqual(moved.nodes['5'].position,{x:-160,y:430});
  const undone=editGraph(moved,{type:'undo'});assert.equal(undone.nodes['5'].position,undefined);
  assert.deepEqual(editGraph(undone,{type:'redo'}).nodes['5'].position,moved.nodes['5'].position);
  assert.equal(editGraph(moved,{type:'reset-layout',id:'root'}).nodes['5'].position,undefined);
  for(const position of [{x:Infinity,y:0},{x:0},{x:NaN,y:0},{x:1000001,y:0}])assert.throws(()=>editGraph(graph,{type:'move',id:'5',position}),/位置/);
});
test('消息定位按保留的消息 ID 解析重建后的轮次坐标，不使用旧日志的序号',async()=>{
  const {graph,data}=sample();
  const origin=data.events.find(e=>e.type==='user/message'&&e.data.content[0].text==='继续研究第二个问题');
  const {seed}=await compilePath(editGraph(graph,{type:'delete',id:'1',grouped:true}),'6',async()=>data);
  const location=messageLocation(seed,origin.data.id,origin.seq);
  assert.equal(location.turn,2);assert.notEqual(location.seq,origin.seq);
  assert.equal(seed[location.seq].data.id,origin.data.id);
  assert.equal(messageLocation(seed,'not-in-this-branch',0),null);
});
test('待输入分支投影到所属用户节点，折叠内部轮次并在转正后继承位置',()=>{
  const {graph}=sample();
  graph.bindings[graph.id]={head:'6',key:pathKey(graph,'6'),seen:60};
  graph.bindings['session-branch']={head:'4',key:pathKey(graph,'4'),seen:40};
  graph.pendingBranch={sessionId:'session-branch',parent:'4',createdAt:9999,returnSessionId:graph.id,position:{x:88,y:199}};
  const collapsed=conversationView(graph,false);
  const pid='pending:session-branch';
  assert.ok(collapsed.graph.nodes[pid]);
  assert.equal(collapsed.graph.nodes[pid].parent,'1','internal parent 4 projects under user owner 1');
  assert.equal(collapsed.graph.nodes[pid].label,'新分支');
  assert.deepEqual(collapsed.graph.nodes[pid].position,{x:88,y:199});
  assert.equal(collapsed.owners.get(pid),pid);
  assert.equal(collapsed.targets.get(pid),'4');

  const expanded=conversationView(graph,true);
  assert.equal(expanded.graph.nodes[pid].parent,'4');
});
