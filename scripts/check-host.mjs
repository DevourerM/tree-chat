import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fixture,automationFixture} from '../test/fixtures.mjs';
import {conversationView} from '../src/core/presentation.js';
import {newGraph, editGraph} from '../src/core/graph.js';
import {turnsOf, compilePath} from '../src/host/context.js';
import {importDshPackage,pluginRoot,resolveDshRuntime} from './_env.mjs';

const manifest=JSON.parse(await readFile(join(pluginRoot,'package.json'),'utf8'));
const {default:semver}=await importDshPackage('semver/index.js');
for(const name of ['@deepseek-ai/dsh-session','@deepseek-ai/dsh-sandbox-policy','@deepseek-ai/dsh-user-approval']){
  const installed=JSON.parse(await readFile(join(resolveDshRuntime(),name,'package.json'),'utf8'));
  assert.ok(semver.satisfies(installed.version,manifest.peerDependencies[name]),`${name} ${installed.version} 不满足插件依赖 ${manifest.peerDependencies[name]}；请核对预发布版本范围。`);
}
console.log('PASS: installed DSH packages satisfy plugin peer dependencies, including prerelease admission.');

const {Session, KNOWN_SESSION_EVENT_TYPES} = await importDshPackage('@deepseek-ai/dsh-session/lib/index.js');
const {assertReleasedV4Relationships, releasedV4SessionFormatCodec} = await importDshPackage('@deepseek-ai/dsh-session-format-v3-to-v4/lib/index.js');

const data=fixture(4,true), graph=newGraph(data.header.id);
for(const [i,t] of turnsOf(data.events).entries())graph.nodes[String(i+1)]={id:String(i+1),parent:i?String(i):'root',label:t.label,createdAt:t.createdAt,source:{sessionId:graph.id,start:t.start,end:t.end}};
graph.active='4';
const edited=editGraph(graph,{type:'delete',id:'2'});let serial=0;
const {seed}=await compilePath(edited,'4',async()=>data,()=>`msg-native-${++serial}`);
const session=Session.create('session-native-check',seed);
for(const event of seed)releasedV4SessionFormatCodec.encodeEvent(event);
assertReleasedV4Relationships({header:session.header,events:seed,inheritedEventCount:0},new Set(KNOWN_SESSION_EVENT_TYPES));
const messages=session.deriveMessages();
assert.deepEqual(messages.filter(m=>m.role==='user').map(m=>m.content[0].text),['问题 1','问题 3','问题 4']);
assert.equal(messages.filter(m=>m.role==='tool').length,1);
const restored=Session.create(session.id,session.snapshotEvents(0),session.header,session.inheritedEventCount);
assert.deepEqual(restored.deriveMessages(),messages);
assert.equal(session.toolHistory().tools.length,0);
console.log('PASS: real DSH Session replay: 1-3-4; complete tool exchange; durable restore.');
const automatic=automationFixture(), automaticGraph=newGraph(automatic.header.id);
turnsOf(automatic.events).forEach((t,i)=>{const id=String(i+1);automaticGraph.nodes[id]={id,parent:i?String(i):'root',label:t.label,kind:t.kind,createdAt:t.createdAt,source:{sessionId:automaticGraph.id,start:t.start,end:t.end}};automaticGraph.active=id;});
const target=conversationView(automaticGraph).targets.get('5');
const replay=await compilePath(automaticGraph,target,async()=>automatic);
const native=Session.create('session-automation-check',replay.seed);
for(const event of replay.seed)releasedV4SessionFormatCodec.encodeEvent(event);
assertReleasedV4Relationships({header:native.header,events:replay.seed,inheritedEventCount:0},new Set(KNOWN_SESSION_EVENT_TYPES));
assert.equal(native.deriveMessages().filter(m=>m.role==='user').length,7);
assert.equal(native.deriveMessages().filter(m=>m.role==='tool').length,1);
console.log('PASS: user-input view preserves automatic rounds, source metadata and tool pairs through real DSH V4 replay.');
