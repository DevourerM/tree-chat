import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,symlink,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {newGraph} from '../src/core/graph.js';
import {PROJECT_FORMAT,digest,json,mapGraph,archiveSession,parseSession,localizeSession} from '../src/host/project-format.js';
import {projectRoot,writeArchive,readArchive,listProjectTrees} from '../src/host/project-files.js';
import {fixture} from './fixtures.mjs';
async function temp(){await mkdir('artifacts',{recursive:true});return projectRoot(await mkdtemp(resolve('artifacts/project-')));}
function payload(title='first'){
  const g=newGraph('session-test',title),data=fixture(2);g.bindings[g.id]={head:'root',key:'root',seen:15};
  const text=archiveSession({...data,inheritedEventCount:0},g.id,data.header.cwd),graph=json(g),files=new Map([['tree.json',graph],['sessions/session-test.jsonl',text],['conversation.md','# hello\n']]);
  const m={format:PROJECT_FORMAT,version:1,id:'tree-test',title,nodes:1,graphHash:digest(graph),transcriptHash:digest('# hello\n'),sessions:[{id:g.id,hash:digest(text)}],assets:[]};m.snapshot=digest(json(m));return {files,m};
}
test('项目格式保留事件序号、完整轮次和工具数据，目录与执行策略在导入时本地化',()=>{
  const data=fixture(3,true);data.events.push({seq:data.events.length,time:1,type:'sandbox/mode',data:{mode:'danger-full-access'}});
  const text=archiveSession({...data,inheritedEventCount:0},'portable',data.header.cwd),parsed=parseSession(text,'portable');
  assert.equal(parsed.header.cwd,'.');assert.deepEqual(parsed.events,data.events);
  const restored=localizeSession(parsed,'local',process.cwd(),{provider:'local',model:'test'});
  assert.equal(restored.header.cwd,process.cwd());assert.equal(restored.events.at(-1).data.mode,'workspace-write');
  assert.throws(()=>localizeSession({...parsed,events:[{type:'working-directory/change',data:{cwd:'../escape'}}]},'local',process.cwd(),{}),/相对目录/);
});
test('项目快照可读写、列出、完整校验，内容不变时不改文件；外部修改与旧快照均拒绝覆盖',async()=>{
  const root=await temp(),a=payload();assert.equal(await writeArchive(root,'tree-test',a.files,a.m,null),true);
  const before=(await stat(join(root,'.tree-chat/trees/tree-test/tree.json'))).mtimeMs;
  assert.equal(await writeArchive(root,'tree-test',a.files,a.m,a.m.snapshot),false);assert.equal((await stat(join(root,'.tree-chat/trees/tree-test/tree.json'))).mtimeMs,before);
  assert.equal((await listProjectTrees(root))[0].title,'first');assert.equal((await readArchive(root,'tree-test')).sessions.size,1);
  const b=payload('second');await assert.rejects(writeArchive(root,'tree-test',b.files,b.m,null),/外部修改/);
  const document=join(root,'.tree-chat/trees/tree-test/conversation.md');await writeFile(document,'manual annotation');
  await assert.rejects(writeArchive(root,'tree-test',b.files,b.m,a.m.snapshot),/对话文档/);assert.equal(await readFile(document,'utf8'),'manual annotation');await writeFile(document,'# hello\n');
  await writeFile(join(root,'.tree-chat/trees/tree-test/tree.json'),'manually edited');
  await assert.rejects(writeArchive(root,'tree-test',b.files,b.m,a.m.snapshot),/树文件/);assert.equal(await readFile(join(root,'.tree-chat/trees/tree-test/tree.json'),'utf8'),'manually edited');
});
test('非法清单、缺失会话、路径穿越与符号链接拒绝读取；目录锁阻止同时写入',async()=>{
  const root=await temp(),a=payload();await writeArchive(root,'tree-test',a.files,a.m,null);
  await assert.rejects(readArchive(root,'../bad'),/标识/);
  await mkdir(join(root,'.tree-chat/.locks/tree-test'));await assert.rejects(writeArchive(root,'tree-test',a.files,a.m,a.m.snapshot),/另一个进程/);
  const other=await temp();await symlink(root,join(other,'.tree-chat'),process.platform==='win32'?'junction':'dir');await assert.rejects(listProjectTrees(other),/符号链接/);
  const m={...a.m,version:99};await writeFile(join(root,'.tree-chat/trees/tree-test/manifest.json'),json(m));assert.ok((await listProjectTrees(root))[0].error);await assert.rejects(readArchive(root,'tree-test'),/不支持/);
});
test('树身份转换覆盖节点、集合、空枝及路径绑定，可逆且不导出本机撤销历史',()=>{
  const g=newGraph('s0');g.nodes['s0:1']={id:'s0:1',parent:'root',label:'a',createdAt:0,source:{sessionId:'s0',start:0,end:1}};g.active='s0:1';g.bindings.s0={head:g.active,key:'root/s0:1',seen:1};g.bindings.s1={head:g.active,key:'root/s0:1',seen:1};g.draftBranches={s1:{sessionId:'s1',parent:g.active,returnSessionId:'s0',createdAt:0}};
  const local=mapGraph(g,{s0:'l0',s1:'l1'});assert.equal(local.draftBranches.l1.parent,'l0:1');assert.equal(local.bindings.l0.key,'root/l0:1');assert.deepEqual(mapGraph(local,{l0:'s0',l1:'s1'}),g);
});
