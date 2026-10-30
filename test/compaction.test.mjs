import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,compactFixture} from './fixtures.mjs';
import {turnsOf,compilePath,surfaceOrigins} from '../src/host/context.js';
import {compactionsOf,conversationEntries,compactionBusy} from '../src/host/compaction.js';
import {newGraph,pathKey,editGraph} from '../src/core/graph.js';
import {mapGraph,archiveSession,parseSession,localizeSession} from '../src/host/project-format.js';
import {importDshPackage} from '../scripts/_env.mjs';
let native;try{native=await importDshPackage('@deepseek-ai/dsh-session/lib/index.js');}catch{}
function graphOf(data){
  const graph=newGraph(data.header.id);let parent='root';
  for(const entry of conversationEntries(data.events,turnsOf(data.events))){
    const id=entry.kind==='compaction'?`${graph.id}:compact-${entry.compaction.summarySeq}`:`${graph.id}:${entry.end}`;
    graph.nodes[id]={id,parent,label:entry.label,kind:entry.kind,createdAt:entry.createdAt,source:{sessionId:graph.id,start:entry.start,end:entry.end},...(entry.compaction?{compaction:{...entry.compaction,prefixKey:pathKey(graph,parent)}}:{})};parent=id;
  }
  graph.active=parent;graph.bindings[graph.id]={head:parent,key:pathKey(graph,parent),seen:data.events.at(-1).seq};return graph;
}
const users=seed=>seed.filter(e=>e.type==='user/message').map(e=>e.data.content[0].text);
async function compile(graph,head,data,extra){
  const result=await compilePath(graph,head,async id=>id===data.header.id?data:extra[id]);
  if(native){const s=native.Session.create('session-replay',result.seed);s.deriveMessages();const codec=await importDshPackage('@deepseek-ai/dsh-session-format-v3-to-v4/lib/index.js');codec.assertReleasedV4Relationships({header:s.header,events:result.seed,inheritedEventCount:0},new Set(native.KNOWN_SESSION_EVENT_TYPES));for(const e of result.seed)codec.releasedV4SessionFormatCodec.encodeEvent(e);}
  return result;
}
test('手动压缩不需要新聊天轮次，只有完成并提交摘要的事务产生节点',()=>{
  const data=compactFixture(fixture());const entries=conversationEntries(data.events,turnsOf(data.events));
  assert.deepEqual(entries.map(e=>e.kind),['user','user','user','user','compaction']);assert.equal(compactionBusy(data.events),false);
  const cancelled=compactFixture(fixture(),{cancelled:true});assert.equal(compactionsOf(cancelled.events).length,0);
  const pending=structuredClone(data.events);pending.pop();assert.equal(compactionsOf(pending).length,0);assert.equal(compactionBusy(pending),true);
});
test('压缩前任意历史分支恢复原文，压缩后只带摘要与未覆盖轮次，没有未来内容',async()=>{
  const data=compactFixture(fixture(4,true)),graph=graphOf(data),nodes=Object.values(graph.nodes).filter(n=>n.kind==='user');
  assert.deepEqual(users((await compile(graph,nodes[0].id,data)).seed),['问题 1']);
  assert.deepEqual(users((await compile(graph,nodes[2].id,data)).seed),['问题 1','问题 2','问题 3']);
  const after=await compile(graph,graph.active,data);
  assert.deepEqual(users(after.seed),[`摘要 ${compactionsOf(data.events)[0].compaction.id}`,'问题 3','问题 4']);
  assert.equal(after.seed.filter(e=>e.type==='tool/result').length,1);
});
test('修改压缩之前的路径使旧摘要失效，移动改名不使摘要失效，删除压缩可恢复原文',async()=>{
  const data=compactFixture(fixture()),graph=graphOf(data),first=Object.values(graph.nodes).find(n=>n.label==='问题 1');
  const changed=editGraph(graph,{type:'delete',id:first.id});const replay=await compile(changed,changed.active,data);
  assert.deepEqual(users(replay.seed),['问题 2','问题 3','问题 4']);assert.deepEqual(replay.ignoredCompactions,[graph.active]);
  const undone=editGraph(changed,{type:'undo'});assert.equal((await compile(undone,undone.active,data)).ignoredCompactions.length,0);
  const renamed=editGraph(graph,{type:'rename',id:first.id,label:'重命名'});assert.equal((await compile(renamed,renamed.active,data)).ignoredCompactions.length,0);
  const removed=editGraph(graph,{type:'delete',id:graph.active});assert.deepEqual(users((await compile(removed,removed.active,data)).seed),['问题 1','问题 2','问题 3','问题 4']);
});
test('多次压缩可分别分支，后一次摘要不会倒灌前一次检查点',async()=>{
  const data=compactFixture(fixture(4,true),{id:'first'});const first=compactionsOf(data.events)[0];compactFixture(data,{id:'second',throughTurn:4});
  const graph=graphOf(data),firstNode=Object.values(graph.nodes).find(n=>n.compaction?.id===first.compaction.id);
  assert.deepEqual(users((await compile(graph,firstNode.id,data)).seed),['摘要 first','问题 3','问题 4']);
  assert.deepEqual(users((await compile(graph,graph.active,data)).seed),['摘要 second']);
});
test('压缩节点的身份映射与完整会话迁移保持摘要依赖路径有效',async()=>{
  const data=compactFixture(fixture()),graph=graphOf(data),mapped=mapGraph(graph,{[graph.id]:'session-new'});
  const archive=parseSession(archiveSession(data,'session-portable',data.header.cwd),'session-portable');const local=localizeSession(archive,'session-new',data.header.cwd,{provider:'test',model:'test'});
  const restored={...local,surface:surfaceOrigins(local.events).nodes.map(seq=>local.events[seq])};
  assert.equal(mapped.nodes[mapped.active].compaction.prefixKey,pathKey(mapped,mapped.nodes[mapped.active].parent));
  assert.deepEqual(users((await compile(mapped,mapped.active,restored)).seed),users((await compile(graph,graph.active,data)).seed));
});
test('新分支压缩继承自其他会话的历史时，摘要只替换一次且不混入原文',async()=>{
  const main=fixture(2),side=fixture(3,true);side.header.id='session-side';const graph=graphOf(main);
  const third=turnsOf(side.events)[2],id='session-side:third';
  graph.nodes[id]={id,parent:graph.active,label:third.label,kind:'user',createdAt:third.createdAt,source:{sessionId:side.header.id,start:third.start,end:third.end}};
  compactFixture(side,{throughTurn:3,id:'cross-session'});const record=compactionsOf(side.events)[0],cid='session-side:checkpoint';
  graph.nodes[cid]={id:cid,parent:id,label:record.label,kind:'compaction',createdAt:record.createdAt,source:{sessionId:side.header.id,start:record.start,end:record.end},compaction:{...record.compaction,prefixKey:pathKey(graph,id)}};graph.active=cid;
  assert.deepEqual(users((await compile(graph,cid,main,{[side.header.id]:side})).seed),['摘要 cross-session']);
  assert.deepEqual(users((await compile(graph,id,main,{[side.header.id]:side})).seed),['问题 1','问题 2','问题 3']);
});
test('自动压缩与完整聊天轮次共同提交，未结束轮次不产生检查点',async()=>{
  const data=compactFixture(fixture(4,true),{id:'automatic'}),last=turnsOf(data.events).at(-1);
  const transaction=data.events.splice(last.end+1),closing=data.events.splice(last.end-1,2);data.events.push(...transaction,...closing);
  const sequence=new Map(data.events.map((e,i)=>[e.seq,i]));
  for(const e of data.events){e.seq=sequence.get(e.seq);if(e.sourceEventSeqs)e.sourceEventSeqs=e.sourceEventSeqs.map(seq=>sequence.get(seq));if(e.type==='compaction/start'||e.type==='compaction/end')e.data.turn=4;}
  const entries=conversationEntries(data.events,turnsOf(data.events));assert.equal(entries.at(-1).kind,'compaction');assert.equal(entries.at(-1).end,entries.at(-2).end);
  assert.equal(conversationEntries(data.events.slice(0,-1),turnsOf(data.events.slice(0,-1))).filter(n=>n.kind==='compaction').length,0);
  const graph=graphOf(data);assert.deepEqual(users((await compile(graph,graph.active,data)).seed),['摘要 automatic','问题 3','问题 4']);
});
test('继承的摘要在另一个原生会话中再次压缩，保持来源别名并且只保留最终摘要',async()=>{
  const main=compactFixture(fixture(4,true),{id:'inherited'}),graph=graphOf(main);
  const {seed}=await compile(graph,graph.active,main),data={header:{...main.header,id:'session-next'},events:structuredClone(seed)};
  const turn=(seed.findLast(e=>e.type==='turn/end')?.data.turn??0)+1,added=fixture(1).events.filter(e=>!['system/message','request/header'].includes(e.type));
  const start=data.events.length;
  for(const e of added){e.seq=data.events.length;if('turn'in e.data)e.data.turn=turn;if(e.data.id)e.data.id+='-next';if(e.data.message)e.data.message.id+='-next';data.events.push(e);}
  const own='session-next:own';graph.nodes[own]={id:own,parent:graph.active,label:'新问题',kind:'user',createdAt:1,source:{sessionId:data.header.id,start,end:data.events.length-1}};
  compactFixture(data,{throughTurn:turn,id:'final'});const record=compactionsOf(data.events)[0],id='session-next:checkpoint';
  graph.nodes[id]={id,parent:own,label:record.label,kind:'compaction',createdAt:record.createdAt,source:{sessionId:data.header.id,start:record.start,end:record.end},compaction:{...record.compaction,prefixKey:pathKey(graph,own)}};
  assert.deepEqual(users((await compile(graph,id,main,{[data.header.id]:data})).seed),['摘要 final']);
});
