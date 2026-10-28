import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGraph, pathTo, pathKey, pendingId, editGraph, validateGraph, assertRevision} from '../src/core/graph.js';
import {turnsOf, compilePath} from '../src/host/context.js';
import {TreeStorage} from '../src/host/storage.js';
import {fixture} from './fixtures.mjs';
import {mkdtemp, readFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';

export function chain(count=4) {
  const graph=newGraph('session-fixture');
  for(const t of turnsOf(fixture(count).events)) {const id=String(Object.keys(graph.nodes).length);graph.nodes[id]={id,parent:id==='1'?'root':String(Number(id)-1),label:t.label,source:{sessionId:graph.id,start:t.start,end:t.end},createdAt:t.createdAt};graph.active=id;}
  return graph;
}
test('删除中间节点：1-2-3-4 → 1-3-4，撤销和重做完整恢复',()=>{
  let graph=editGraph(chain(),{type:'delete',id:'2'});
  assert.deepEqual(pathTo(graph,'4').map(n=>n.id),['root','1','3','4']);
  graph=editGraph(graph,{type:'undo'});assert.equal(pathKey(graph,'4'),'root/1/2/3/4');
  graph=editGraph(graph,{type:'redo'});assert.equal(pathKey(graph,'4'),'root/1/3/4');
});
test('断开、重新连接与禁止环路',()=>{
  let graph=editGraph(chain(),{type:'reparent',id:'3',parent:null});
  assert.throws(()=>pathTo(graph,'4'),/未连接|尚未连接/);
  graph=editGraph(graph,{type:'reparent',id:'3',parent:'1'});assert.equal(pathKey(graph,'4'),'root/1/3/4');
  assert.throws(()=>editGraph(graph,{type:'reparent',id:'1',parent:'4'}),/循环/);
});
test('整枝删除保留其他枝，禁止删除根，版本冲突',()=>{
  const graph=chain();graph.nodes.side={...graph.nodes['2'],id:'side',parent:'1'};
  const edited=editGraph(graph,{type:'delete',id:'2',subtree:true});
  assert.equal(Object.keys(edited.nodes).length,3);assert.equal(edited.active,'1');assert.ok(edited.nodes.side);
  assert.throws(()=>editGraph(graph,{type:'delete',id:'root'}));assert.throws(()=>assertRevision(graph,123));
});
export function chainOf(data) {
  const graph=newGraph(data.header.id);
  for(const t of turnsOf(data.events)) {const id=String(Object.keys(graph.nodes).length);graph.nodes[id]={id,parent:id==='1'?'root':String(Number(id)-1),label:t.label,source:{sessionId:graph.id,start:t.start,end:t.end},createdAt:t.createdAt};graph.active=id;}
  return graph;
}
test('上下文仅包含新路径的轮次，并保留整组工具调用',async()=>{
  const data=fixture(4,true), graph=editGraph(chainOf(data),{type:'delete',id:'2'});let i=0;
  const {seed}=await compilePath(graph,'4',async()=>data,()=>`new-msg-${++i}`);
  const users=seed.filter(e=>e.type==='user/message').map(e=>e.data.content[0].text);
  assert.deepEqual(users,['问题 1','问题 3','问题 4']);
  assert.equal(seed.filter(e=>e.type==='tool/result').length,1);
  assert.ok(seed.every((e,i)=>e.seq===i));
  assert.deepEqual(seed.filter(e=>e.type==='turn/start').map(e=>e.data.turn),[1,2,3,4]);
  const call=seed.find(e=>e.type==='tool/call'), result=seed.find(e=>e.type==='tool/result');
  assert.ok(call.seq<result.seq);
  assert.equal(seed.find(e=>e.type==='turn/end'&&e.data.turn===3).seq>result.seq,true);
});
test('缺失工具结果时拒绝上下文，未完成轮次不进入树',async()=>{
  const data=fixture(4,true);data.surface=data.surface.filter(e=>e.type!=='tool/result');
  await assert.rejects(()=>compilePath(chainOf(data),'4',async()=>data,()=> 'new'),/未完成的工具/);
  assert.equal(turnsOf(data.events.slice(0,-1)).length,3);
});
test('历史分支继承该节点的工作目录，删除桥接和跨来源仍尊重路径末端，不带入未来变更',async()=>{
  const data=fixture(3,false);data.header.cwd='/project/original';
  const second=data.events.findIndex(e=>e.type==='turn/start'&&e.data.turn===2);
  data.events.splice(second,0,{type:'working-directory/change',data:{cwd:'/project/second'},time:2000});
  data.events.push({type:'working-directory/change',data:{cwd:'/project/future'},time:3000});
  data.events.forEach((e,i)=>{e.seq=i;});data.surface=data.events.filter(e=>e.surfaceOp);
  const graph=newGraph(data.header.id);
  turnsOf(data.events).forEach((t,i)=>{const id=String(i+1);graph.nodes[id]={id,parent:i?String(i):'root',label:t.label,createdAt:t.createdAt,source:{sessionId:graph.id,start:t.start,end:t.end}};graph.active=id;});
  const read=async()=>data;
  assert.equal((await compilePath(graph,'root',read)).cwd,'/project/original');
  assert.equal((await compilePath(graph,'1',read)).cwd,'/project/original');
  assert.equal((await compilePath(graph,'2',read)).cwd,'/project/second');
  assert.equal((await compilePath(editGraph(graph,{type:'delete',id:'2'}),'3',read)).cwd,'/project/second');
  const child=fixture(1,false);child.header.id='session-other';child.header.cwd='/project/other';
  const childTurn=turnsOf(child.events)[0];
  graph.nodes.side={id:'side',parent:'2',label:childTurn.label,createdAt:childTurn.createdAt,source:{sessionId:child.header.id,start:childTurn.start,end:childTurn.end}};
  assert.equal((await compilePath(graph,'side',async id=>id===graph.id?data:child)).cwd,'/project/other');
});
test('持久化原子保存、会话映射与串行操作',async()=>{
  await mkdir(join(process.cwd(),'artifacts'),{recursive:true});
  const dir=await mkdtemp(join(process.cwd(),'artifacts','storage-test-'));const store=new TreeStorage(dir), graph=chain();
  graph.bindings['session-child']={head:'4',key:pathKey(graph,'4'),seen:20};
  await store.save(graph);assert.deepEqual(await store.find('session-child'),graph);
  const order=[];await Promise.all([store.serial(async()=>{await new Promise(r=>setTimeout(r,20));order.push(1);}),store.serial(async()=>order.push(2))]);assert.deepEqual(order,[1,2]);
  assert.equal(JSON.parse(await readFile(store.file(graph.id),'utf8')).schemaVersion,1);
  assert.throws(()=>store.file('../escape'));
});
test('损坏数据和未知版本拒绝读取',()=>{
  assert.throws(()=>validateGraph({...chain(),schemaVersion:99}));
  const bad=chain();bad.nodes['1'].parent='missing';assert.throws(()=>validateGraph(bad));
});
test('pendingBranch 元数据校验、虚拟节点移动、删除父节点桥接与撤销恢复',()=>{
  const graph=chain();
  graph.bindings['session-fixture']={head:'4',key:pathKey(graph,'4'),seen:20};
  graph.bindings['session-pending']={head:'2',key:pathKey(graph,'2'),seen:10};
  graph.pendingBranch={sessionId:'session-pending',parent:'2',createdAt:12345,returnSessionId:'session-fixture'};
  validateGraph(graph);
  const pid=pendingId(graph);
  assert.equal(pid,'pending:session-pending');
  const moved=editGraph(graph,{type:'move',id:pid,position:{x:120,y:260}});
  assert.deepEqual(moved.pendingBranch.position,{x:120,y:260});
  assert.equal(editGraph(graph,{type:'rename',id:pid,label:'我的分支'}).pendingBranch.label,'我的分支');

  const reset=editGraph(moved,{type:'reset-layout',id:'root'});
  assert.equal(reset.pendingBranch.position,undefined);

  // Deleting or reparenting an ancestor of pendingBranch is rejected until the pending branch is sent or cancelled.
  assert.throws(()=>editGraph(moved,{type:'delete',id:'2',subtree:true}),/待输入分支/);
  assert.throws(()=>editGraph(moved,{type:'delete',id:'1'}),/待输入分支/);
  // Deleting a downstream node (not an ancestor of pendingBranch) is allowed and preserves pendingBranch.
  const deletedDownstream=editGraph(moved,{type:'delete',id:'4'});
  assert.deepEqual(deletedDownstream.pendingBranch,moved.pendingBranch);
  assert.deepEqual(editGraph(deletedDownstream,{type:'undo'}).pendingBranch,moved.pendingBranch);

  // If a real turn already advanced the pending session head, undo must not resurrect stale pendingBranch.
  const advanced=structuredClone(moved);
  advanced.bindings['session-pending'].head='4';
  delete advanced.pendingBranch;
  const afterUndo=editGraph(advanced,{type:'undo'});
  assert.equal(afterUndo.pendingBranch,undefined);

  assert.throws(()=>validateGraph({...graph,pendingBranch:{sessionId:'missing',parent:'2',createdAt:1,returnSessionId:'session-fixture'}}),/待输入分支/);
});
