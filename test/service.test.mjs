import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {TreeStorage} from '../src/host/storage.js';
import {conversationView} from '../src/core/presentation.js';
import {layoutGraph} from '../src/core/layout.js';
import {fixture} from './fixtures.mjs';
import {pluginRoot, resolveDshRuntime} from '../scripts/_env.mjs';
import {ProjectSync} from '../src/host/project-sync.js';
import {readArchive} from '../src/host/project-files.js';
import {exportBundle,importBundle} from '../src/host/transfer.js';

let runtimeDir = null;
try {
  const candidate = resolveDshRuntime();
  if (existsSync(resolve(candidate, '@deepseek-ai/dsh-session/lib/index.js'))) {
    runtimeDir = candidate;
  }
} catch {
  runtimeDir = null;
}

async function loadHostModules() {
  const sessionUrl = pathToFileURL(resolve(runtimeDir, '@deepseek-ai/dsh-session/lib/index.js')).href;
  const serviceUrl = pathToFileURL(resolve(pluginRoot, 'src/host/service.js')).href;
  const {Session, KNOWN_SESSION_EVENT_TYPES} = await import(sessionUrl);
  const [{setSandboxMode},{setApprovalPolicy}]=await Promise.all([
    import(pathToFileURL(resolve(runtimeDir,'@deepseek-ai/dsh-sandbox-policy/lib/index.js')).href),
    import(pathToFileURL(resolve(runtimeDir,'@deepseek-ai/dsh-user-approval/lib/index.js')).href)
  ]);
  const source = (await readFile(resolve(pluginRoot, 'src/host/service.js'), 'utf8'))
    .replace("from '@deepseek-ai/dsh-session'", `from ${JSON.stringify(sessionUrl)}`)
    .replace(/from '(\.[^']+)'/g,(_,relative)=>`from ${JSON.stringify(new URL(relative,serviceUrl).href)}`) + `\n//# sourceURL=${serviceUrl}\n`;
  const mod = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`);
  return {Session, KNOWN_SESSION_EVENT_TYPES, TreeService: mod.TreeService,permissionSetters:{setSandboxMode,setApprovalPolicy}};
}

function createMockHost(Session, initialTurns = 3, tools = false) {
  const liveSessions = new Map();
  const rootData = fixture(initialTurns, tools);
  const rootHeader = {...rootData.header, id: 'session-root', title: '主对话标题'};
  const rootSession = Session.create('session-root', rootData.events, rootHeader, 0, []);
  liveSessions.set('session-root', rootSession);

  const archived = new Set();
  const pinned = new Set();
  const attached = new Set(['session-root']);
  const agents = new Map([['session-root', {session: rootSession, status: 'idle'}]]);
  const services=new Map();

  const workspace = {
    get sessionIds() { return [...attached]; },
    async attachSession(id) { attached.add(id); }
  };

  const registry = {
    get archivedSessionIds() { return [...archived]; },
    get pinnedSessionIds() { return [...pinned]; },
    list() { return [workspace]; },
    async resolveByPath() {return workspace;},
    async create() {return workspace;},
    async archiveSession(id) { archived.add(id); },
    async unarchiveSession(id) { archived.delete(id); }
  };

  const ctx = {
    logger: {warn() {}},
    get(name) {
      if (name === 'workspaceRegistry') return registry;
      return services.get(name);
    },
    sessions: {
      projections: [],
      get(id) { return liveSessions.get(id) ?? null; }
    },
    sessionQuery: {
      async readSession(id) {
        const s = liveSessions.get(id);
        if (!s) { const err = new Error('not found'); err.code = 'SESSION_QUERY_SESSION_NOT_FOUND'; throw err; }
        return {events: s.snapshotEvents(0), session: s.header, inheritedEventCount: s.inheritedEventCount};
      }
    },
    agentDefaultModel: {
      currentSelection() { return {provider: 'test', model: 'test'}; }
    },
    agents: {
      get(id) { return agents.get(id); },
      async resume({resumeSessionId,setup}) {
        const session=liveSessions.get(resumeSessionId);assert.ok(session);
        const agent={session,status:'idle'};
        if(setup)await setup({},agent);
        agents.set(resumeSessionId,agent);return {agent};
      },
      async create({sessionId, seed = [], inheritedEventCount = seed.length, meta = {}, setup}) {
        const header = {
          version: 4,
          id: sessionId,
          createdAt: Date.now(),
          isSeeded: Boolean(meta.isSeeded),
          ...meta
        };
        const session = Session.create(sessionId, seed, header, inheritedEventCount, []);
        const agent = {session, status: 'idle'};
        if (setup) await setup({}, agent);
        liveSessions.set(sessionId, session);
        agents.set(sessionId, agent);
        return {agent};
      }
    }
  };

  function appendUserTurn(sessionId, text, kind = 'user',extra = []) {
    const session = liveSessions.get(sessionId);
    assert.ok(session, `missing session ${sessionId}`);
    const events = session.snapshotEvents(0);
    const turnNum = (events.findLast(e => e.type === 'turn/start')?.data.turn ?? 0) + 1;
    session.append('turn/start', {turn: turnNum});
    session.append('step/start', {turn: turnNum, step: 1});
    session.append(
      'user/message',
      {id: `msg-${sessionId}-${turnNum}`, role: 'user', source: {kind}, content: [{type: 'text', text},...extra]},
      {surfaceOp: 'append'}
    );
    session.append(
      'assistant/message',
      {
        turn: turnNum,
        step: 1,
        message: {
          id: `ast-${sessionId}-${turnNum}`,
          role: 'assistant',
          source: {kind: 'model', provider: 'test', model: 'test'},
          content: [{type: 'text', text: `回复 ${text}`}]
        },
        stream: []
      },
      {surfaceOp: 'append'}
    );
    session.append('step/end', {turn: turnNum, step: 1});
    session.append('turn/end', {turn: turnNum, reason: {kind: 'completed'}});
  }

  return {ctx, liveSessions, archived, pinned, agents, appendUserTurn,services};
}

function installPermissionOwner(host,setters){
  const specs={'workspace-write':{sandbox:'workspace-write',approval:'ask'},'danger-full-access':{sandbox:'danger-full-access',approval:'never'},auto:{sandbox:'danger-full-access',approval:'ask'}};
  let autoAvailable=true;
  const owner={
    permissionState(session){const state={preset:null,sandbox:null,approval:null};for(const e of session.snapshotEvents(0)){
      if(e.type==='permission/preset')state.preset=e.data.preset;
      if(e.type==='sandbox/mode')state.sandbox=e.data.mode;
      if(e.type==='approval/policy')state.approval=e.data.policy;
    }return state;},
    current(session){const s=this.permissionState(session),sandbox=s.sandbox??'workspace-write',approval=s.approval??'ask';
      if(s.preset==='auto'&&autoAvailable&&sandbox==='danger-full-access')return 'auto';
      if(specs[s.preset]?.sandbox===sandbox&&specs[s.preset]?.approval===approval)return s.preset;
      return Object.entries(specs).find(([name,p])=>name!=='auto'&&p.sandbox===sandbox&&p.approval===approval)?.[0]??'custom';
    },
    set(session,name){if(name==='auto'&&!autoAvailable)throw Error('Auto admission rejected');const spec=specs[name];if(!spec)throw Error('Unknown preset');
      if(this.current(session)!==name)session.append('permission/preset',{preset:name});
      const state=this.permissionState(session);
      if((state.sandbox??'workspace-write')!==spec.sandbox)setters.setSandboxMode(session,spec.sandbox);
      if((state.approval??'ask')!==spec.approval)setters.setApprovalPolicy(session,spec.approval);
    }
  };
  host.services.set('permissionPresets',owner);host.services.set('shell',{sandboxMode:'workspace-write'});host.services.set('approval',{config:{policy:'ask'}});
  return {owner,setAutoAvailable(value){autoAvailable=value;}};
}

test('TreeService: 原生权限预设与自定义组合继承到新枝、已有枝和取消返回，Auto 准入失败不改目标', {skip:!runtimeDir&&'未配置 DSH_DEV_RUNTIME'},async()=>{
  const {Session,TreeService,permissionSetters}=await loadHostModules();
  await mkdir(join(process.cwd(),'artifacts'),{recursive:true});
  const storage=new TreeStorage(await mkdtemp(join(process.cwd(),'artifacts','service-permission-'))),host=createMockHost(Session,2);
  const {owner,setAutoAvailable}=installPermissionOwner(host,permissionSetters),service=new TreeService(host.ctx,storage,permissionSetters);
  const source=host.liveSessions.get('session-root');owner.set(source,'danger-full-access');
  let graph=await service.get(source.id);const nodes=Object.values(graph.nodes).filter(n=>n.source);
  const first=await service.branch(source.id,graph.revision,nodes[0].id),target=host.liveSessions.get(first.sessionId);
  assert.equal(owner.current(target),'danger-full-access');
  owner.set(target,'workspace-write');
  const root=await service.activate(first.sessionId,first.graph.revision,nodes[1].id);
  assert.equal(owner.current(source),'workspace-write');
  host.agents.delete(first.sessionId);
  permissionSetters.setSandboxMode(source,'read-only');permissionSetters.setApprovalPolicy(source,'never');
  graph=await service.get(source.id);const reused=await service.branch(source.id,graph.revision,`pending:${first.sessionId}`);
  assert.equal(owner.current(target),'custom');assert.equal(owner.permissionState(target).sandbox,'read-only');assert.equal(owner.permissionState(target).approval,'never');
  assert.ok(host.agents.has(first.sessionId),'已卸载的目标分支通过原生 resume 恢复后继承权限');
  owner.set(target,'danger-full-access');
  await service.cancelBranch(first.sessionId,reused.graph.revision,`pending:${first.sessionId}`);
  assert.equal(owner.current(source),'danger-full-access');
  owner.set(source,'auto');graph=await service.get(source.id);
  const autoBranch=await service.branch(source.id,graph.revision,nodes[0].id);
  const autoTarget=host.liveSessions.get(autoBranch.sessionId);assert.equal(owner.current(autoTarget),'auto');
  owner.set(autoTarget,'workspace-write');setAutoAvailable(false);
  const before=autoTarget.seq;
  await assert.rejects(()=>service.transferPermissions(source.id,autoBranch.sessionId),/自动审查|Auto/);
  assert.equal(autoTarget.seq,before);
});

test('TreeService: 大批历史轮次只构建一次空间索引，条件轮询只回传变化', {skip:!runtimeDir&&'未配置 DSH_DEV_RUNTIME'},async()=>{
  const {Session,TreeService}=await loadHostModules();
  await mkdir(join(process.cwd(),'artifacts'),{recursive:true});
  const host=createMockHost(Session,2000),storage=new TreeStorage(await mkdtemp(join(process.cwd(),'artifacts','service-batch-')));
  const service=new TreeService(host.ctx,storage);let builds=0;
  const placement=service.placement.bind(service);service.placement=(...args)=>{builds++;return placement(...args);};
  const graph=await service.get('session-root');assert.equal(Object.keys(graph.nodes).length,2001);assert.equal(builds,1);
  assert.deepEqual(await service.get('session-root',graph.revision),{unchanged:true,revision:graph.revision});
  host.appendUserTurn('session-root','新的问题');
  const next=await service.get('session-root',graph.revision);assert.equal(Object.keys(next.nodes).length,2002);assert.ok(next.revision>graph.revision);
  assert.equal(builds,2);
});

test('TreeService: 集合显示操作允许生成中执行，删除集合必须等待生成结束并可按新上下文继续', {skip:!runtimeDir&&'未配置 DSH_DEV_RUNTIME'},async()=>{
  const {Session,TreeService}=await loadHostModules();
  await mkdir(join(process.cwd(),'artifacts'),{recursive:true});
  const host=createMockHost(Session,4),storage=new TreeStorage(await mkdtemp(join(process.cwd(),'artifacts','service-collection-'))),service=new TreeService(host.ctx,storage);
  let g=await service.get('session-root');const ids=Object.values(g.nodes).filter(n=>n.source).map(n=>n.id);
  g=await service.edit('session-root',g.revision,{type:'group-create',ids:ids.slice(1,3),name:'删除测试'});const id=Object.keys(g.groups)[0];
  host.agents.get('session-root').status='running';
  g=await service.edit('session-root',g.revision,{type:'group-toggle-all',collapsed:false});
  await assert.rejects(()=>service.edit('session-root',g.revision,{type:'group-delete',id}),/生成|完成/);
  host.agents.get('session-root').status='idle';g=await service.edit('session-root',g.revision,{type:'group-delete',id});
  assert.equal(g.nodes[ids[3]].parent,ids[0]);
  const resumed=await service.activate('session-root',g.revision,ids[3]);
  const messages=host.liveSessions.get(resumed.sessionId).deriveMessages().filter(m=>m.role==='user');
  assert.deepEqual(messages.map(m=>m.content[0].text),['问题 1','问题 4']);
});

test('项目同步：默认不写项目，完整往返集合/空枝/工具/文件附件，导入新身份并按本机权限和目录继续', {skip:!runtimeDir&&'未配置 DSH_DEV_RUNTIME'},async t=>{
  const {Session,TreeService,permissionSetters}=await loadHostModules();
  await mkdir(join(process.cwd(),'artifacts'),{recursive:true});
  const project=await mkdtemp(join(process.cwd(),'artifacts','project-roundtrip-')),storage=new TreeStorage(await mkdtemp(join(process.cwd(),'artifacts','project-state-'))),host=createMockHost(Session,4,true);
  const {owner}=installPermissionOwner(host,permissionSetters),source=host.liveSessions.get('session-root');owner.set(source,'danger-full-access');
  const file=Buffer.from('conversation as source'),attachmentId='sha256:'+createHash('sha256').update(file).digest('hex'),ref={attachmentId,name:'notes.txt',bytes:file.length};
  const saved=[];host.services.set('attachments',{async *readFileStream(){yield file;},async saveFile(input){saved.push(Buffer.from(input.data));return {...ref};}});
  host.appendUserTurn('session-root','问题 附件','user',[{type:'file',attachment:ref}]);
  const service=new TreeService(host.ctx,storage,permissionSetters),sync=new ProjectSync(service);t.after(()=>sync.dispose());
  let graph=await service.get('session-root');await assert.rejects(stat(join(project,'.tree-chat')),e=>e.code==='ENOENT');
  const ids=Object.values(graph.nodes).filter(n=>n.source).map(n=>n.id);
  graph=await service.edit('session-root',graph.revision,{type:'group-create',ids:ids.slice(0,2),name:'可迁移集合'});
  const branch=await service.branch('session-root',graph.revision,ids[1]);
  let status=await sync.configure(branch.sessionId,project,true);assert.equal(status.enabled,true);
  const archive=await readArchive(project,status.treeId);assert.equal(archive.manifest.assets.length,1);assert.ok(archive.graph.draftBranches);
  const markdown=await readFile(join(project,'.tree-chat/trees',status.treeId,'conversation.md'),'utf8');assert.match(markdown,/可迁移集合/);assert.match(markdown,/tool-call|工具/);
  owner.set(host.liveSessions.get(branch.sessionId),'workspace-write');const oldSeq=source.seq;
  const restored=await sync.import(branch.sessionId,project,status.treeId);assert.notEqual(restored.graph.id,graph.id);assert.equal(source.seq,oldSeq);
  assert.equal(saved.length,1);assert.deepEqual(saved[0],file);assert.equal(Object.values(restored.graph.groups)[0].name,'可迁移集合');
  assert.equal((await sync.link(restored.graph.id)).enabled,false);
  for(const id of Object.keys(restored.graph.bindings)){assert.equal(host.liveSessions.get(id).header.cwd,project);assert.equal(owner.current(host.liveSessions.get(id)),'workspace-write');}
  const root=await service.load(restored.graph.id);assert.equal(root.native.deriveMessages().filter(m=>m.role==='tool').length,1);
  host.appendUserTurn(restored.sessionId,'问题 迁移后继续');const continued=await service.get(restored.sessionId);assert.ok(Object.values(continued.nodes).some(n=>n.label==='问题 迁移后继续'));
  status=await sync.configure(restored.sessionId,project,true);assert.equal(status.records.length,1,'导入后启用同一记录，不能无意创建第二份');
  const second=await readArchive(project,status.treeId);assert.equal(second.graph.id,'session-root');assert.ok(Object.values(second.graph.nodes).some(n=>n.label==='问题 迁移后继续'));
  const destination=createMockHost(Session,0);destination.services.set('attachments',host.services.get('attachments'));
  const otherService=new TreeService(destination.ctx,new TreeStorage(await mkdtemp(join(process.cwd(),'artifacts','project-other-host-')))),otherSync=new ProjectSync(otherService);t.after(()=>otherSync.dispose());
  const originalEmpty=destination.liveSessions.get('session-root').snapshotEvents(0);
  const migrated=await otherSync.import('session-root',project,status.treeId);assert.notEqual(migrated.graph.id,'session-root');assert.deepEqual(destination.liveSessions.get('session-root').snapshotEvents(0),originalEmpty,'另一宿主上同名空会话不能被覆盖');
  assert.equal(destination.liveSessions.get(migrated.graph.id).deriveMessages().filter(m=>m.role==='tool').length,1);
});

test('对话文件：导出含完整会话与附件的单个 JSON，另一宿主导入为新会话并可继续；旧版与损坏文件给出提示', {skip:!runtimeDir&&'未配置 DSH_DEV_RUNTIME'},async t=>{
  const {Session,TreeService,permissionSetters}=await loadHostModules();
  await mkdir(join(process.cwd(),'artifacts'),{recursive:true});
  const host=createMockHost(Session,3,true),storage=new TreeStorage(await mkdtemp(join(process.cwd(),'artifacts','bundle-state-')));
  const file=Buffer.from('bundle attachment'),attachmentId='sha256:'+createHash('sha256').update(file).digest('hex'),ref={attachmentId,name:'notes.txt',bytes:file.length};
  host.services.set('attachments',{async *readFileStream(){yield file;},async saveFile(){return {...ref};}});
  host.appendUserTurn('session-root','问题 附件','user',[{type:'file',attachment:ref}]);
  const service=new TreeService(host.ctx,storage,permissionSetters);
  let graph=await service.get('session-root');
  const ids=Object.values(graph.nodes).filter(n=>n.source).map(n=>n.id);
  graph=await service.edit('session-root',graph.revision,{type:'group-create',ids:ids.slice(0,2),name:'导出集合'});
  const branch=await service.branch('session-root',graph.revision,ids[1]);
  const bundle=JSON.parse(JSON.stringify(await exportBundle(service,branch.sessionId)));
  assert.equal(bundle.format,'tree-chat-bundle');assert.equal(Object.keys(bundle.sessions).length,2);assert.equal(bundle.assets.length,1);
  assert.deepEqual(Buffer.from(bundle.assets[0].data,'base64'),file);

  const destination=createMockHost(Session,0),saved=[];
  destination.services.set('attachments',{async saveFile(input){saved.push(Buffer.from(input.data));return {...ref,attachmentId:'sha256:local'};}});
  const other=new TreeService(destination.ctx,new TreeStorage(await mkdtemp(join(process.cwd(),'artifacts','bundle-other-'))),permissionSetters);
  const before=destination.liveSessions.get('session-root').snapshotEvents(0);
  const imported=await importBundle(other,'session-root',bundle);
  assert.notEqual(imported.graph.id,'session-root');assert.deepEqual(destination.liveSessions.get('session-root').snapshotEvents(0),before,'导入不能改写当前会话');
  assert.equal(Object.values(imported.graph.groups)[0].name,'导出集合');assert.ok(imported.graph.draftBranches);
  assert.deepEqual(saved,[file]);
  const root=await other.load(imported.graph.id);assert.equal(root.native.deriveMessages().filter(m=>m.role==='tool').length,1);
  assert.ok(JSON.stringify(root.events).includes('sha256:local'),'附件引用改为本机附件');
  const labels=Object.values(imported.graph.nodes).map(n=>n.label);for(const n of Object.values(graph.nodes))assert.ok(labels.includes(n.label));
  destination.appendUserTurn(imported.graph.id,'问题 导入后继续');
  assert.ok(Object.values((await other.get(imported.graph.id)).nodes).some(n=>n.label==='问题 导入后继续'));

  await assert.rejects(importBundle(other,'session-root',{...bundle,assets:[{...bundle.assets[0],data:Buffer.from('x').toString('base64')}]}),/附件校验/);
  await assert.rejects(importBundle(other,'session-root',{format:'something'}),/不是 tree-chat/);
  const {sessions,...partial}=bundle;await assert.rejects(importBundle(other,'session-root',{...partial,sessions:{}}),/会话记录不完整/);
  const legacy=JSON.parse(JSON.stringify(await service.get('session-root')));
  await assert.rejects(importBundle(other,'session-root',legacy),/旧版/);
  const copied=await importBundle(service,'session-root',legacy);assert.notEqual(copied.graph.id,graph.id,'同机旧版文件复制为新树');
});

test('项目同步：自动跟进完成消息、关闭不删文件、重启读取配置，外部编辑暂停且可另存副本', {skip:!runtimeDir&&'未配置 DSH_DEV_RUNTIME'},async t=>{
  const {Session,TreeService}=await loadHostModules();await mkdir(join(process.cwd(),'artifacts'),{recursive:true});
  const project=await mkdtemp(join(process.cwd(),'artifacts','project-auto-')),storage=new TreeStorage(await mkdtemp(join(process.cwd(),'artifacts','project-auto-state-'))),host=createMockHost(Session,2),service=new TreeService(host.ctx,storage);
  const sync=new ProjectSync(service);t.after(()=>sync.dispose());host.agents.get('session-root').status='running';const status=await sync.configure('session-root',project,true);
  assert.equal(status.waiting,true);await assert.rejects(stat(join(project,'.tree-chat')),e=>e.code==='ENOENT');host.agents.get('session-root').status='idle';await sync.write('session-root',true);
  host.appendUserTurn('session-root','问题 自动同步');await sync.event('session-root');await new Promise(r=>setTimeout(r,1100));
  assert.ok(Object.values((await readArchive(project,status.treeId)).graph.nodes).some(n=>n.label==='问题 自动同步'));
  const file=join(project,'.tree-chat/trees',status.treeId,'tree.json');await writeFile(file,'external edit');
  await assert.rejects(sync.configure('session-root',project,true),/树文件|外部修改/);assert.ok(sync.summary('session-root').error);assert.equal(await readFile(file,'utf8'),'external edit');
  const copy=await sync.configure('session-root',project,true,true);assert.notEqual(copy.treeId,status.treeId);assert.equal(copy.records.length,2);assert.equal(await readFile(file,'utf8'),'external edit');
  await sync.configure('session-root',project,false);host.appendUserTurn('session-root','问题 不同步');await sync.event('session-root');await new Promise(r=>setTimeout(r,800));
  assert.ok(!Object.values((await readArchive(project,copy.treeId)).graph.nodes).some(n=>n.label==='问题 不同步'));
  sync.dispose();const again=new ProjectSync(service);t.after(()=>again.dispose());await again.start();assert.equal((await again.status('session-root',project)).enabled,false);
});

test('TreeService: 多个空分枝持久保留；避让手动节点；完成后原 ID 原位填充，只删除指定空枝', {skip: !runtimeDir && '未配置 DSH_DEV_RUNTIME，跳过宿主服务集成测试'}, async()=>{
  const {Session,TreeService}=await loadHostModules();
  await mkdir(join(process.cwd(),'artifacts'),{recursive:true});
  const storage=new TreeStorage(await mkdtemp(join(process.cwd(),'artifacts','service-empty-'))),host=createMockHost(Session,3);
  let service=new TreeService(host.ctx,storage),graph=await service.get('session-root');
  const ids=Object.values(graph.nodes).filter(n=>n.source).map(n=>n.id),parent=graph.nodes[ids[0]].position;
  graph=await service.edit('session-root',graph.revision,{type:'move',id:ids[2],position:{x:parent.x,y:parent.y+80}});
  const first=await service.branch('session-root',graph.revision,ids[0]),firstId=`pending:${first.sessionId}`;
  assert.notDeepEqual(first.graph.pendingBranch.position,graph.nodes[ids[2]].position);
  const originalPosition=first.graph.pendingBranch.position;
  const second=await service.branch(first.sessionId,first.graph.revision,ids[1]),secondId=`pending:${second.sessionId}`;
  assert.equal(Object.keys(second.graph.draftBranches).length,2);
  service=new TreeService(host.ctx,new TreeStorage(storage.directory));
  graph=await service.get(second.sessionId);
  assert.ok(conversationView(graph).graph.nodes[firstId]);assert.ok(conversationView(graph).graph.nodes[secondId]);
  const arranged=await service.edit(second.sessionId,graph.revision,{type:'arrange',id:'root'});
  const preserved=arranged.draftBranches[first.sessionId].position;
  const returned=await service.branch(second.sessionId,arranged.revision,firstId);
  assert.equal(returned.sessionId,first.sessionId);
  host.appendUserTurn(first.sessionId,'完成第一条分支');
  graph=await service.get(second.sessionId);
  assert.equal(graph.nodes[firstId].label,'完成第一条分支');
  assert.deepEqual(graph.nodes[firstId].position,preserved);
  assert.ok(graph.draftBranches[second.sessionId]);assert.equal(graph.draftBranches[first.sessionId],undefined);
  const positions=layoutGraph(conversationView(graph).graph).positions;
  assert.notDeepEqual(positions.get(firstId),positions.get(secondId));assert.ok(originalPosition);
  const deleted=await service.cancelBranch(second.sessionId,graph.revision,secondId);
  assert.equal(Object.keys(deleted.graph.draftBranches).length,0);assert.ok(deleted.graph.nodes[firstId]);
});

test('TreeService: 新宿主工作目录变更在派生 Session 中生效，历史节点不继承未来目录', {skip: !runtimeDir && '未配置 DSH_DEV_RUNTIME，跳过宿主服务集成测试'}, async t => {
  const {Session, KNOWN_SESSION_EVENT_TYPES, TreeService} = await loadHostModules();
  if(!KNOWN_SESSION_EVENT_TYPES.has('working-directory/change'))return t.skip('旧宿主不支持聊天中切换工作目录');
  await mkdir(join(process.cwd(), 'artifacts'), {recursive:true});
  const storage = new TreeStorage(await mkdtemp(join(process.cwd(), 'artifacts', 'service-cwd-')));
  const host=createMockHost(Session,1), service=new TreeService(host.ctx,storage);
  const original=host.liveSessions.get('session-root');
  const changed=join(process.cwd(),'changed-project'),future=join(process.cwd(),'future-project');
  original.append('working-directory/change',{cwd:changed});
  host.appendUserTurn('session-root','目录变更后提问');
  original.append('working-directory/change',{cwd:future});
  const graph=await service.get('session-root');
  const selected=Object.values(graph.nodes).find(n=>n.label==='目录变更后提问');
  const branch=await service.branch('session-root',graph.revision,selected.id);
  assert.equal(host.liveSessions.get(branch.sessionId).header.cwd,changed);
  const first=Object.values(graph.nodes).find(n=>n.label==='问题 1');
  const earlier=await service.branch(branch.sessionId,branch.graph.revision,first.id);
  assert.equal(host.liveSessions.get(earlier.sessionId).header.cwd,original.header.cwd);
});

test('TreeService: 新建分支、重复点击防抖、单入口归档（含原根与置顶豁免）、取消分支回退', {skip: !runtimeDir && '未配置 DSH_DEV_RUNTIME，跳过宿主服务集成测试'}, async () => {
  const {Session, TreeService} = await loadHostModules();
  await mkdir(join(process.cwd(), 'artifacts'), {recursive: true});
  const dir = await mkdtemp(join(process.cwd(), 'artifacts', 'service-test-'));
  const storage = new TreeStorage(dir);
  const host = createMockHost(Session, 3);
  const service = new TreeService(host.ctx, storage);

  const initial = await service.get('session-root');
  const nodeIds = Object.keys(initial.nodes).filter(k => k !== 'root');
  assert.equal(nodeIds.length, 3);
  assert.equal(initial.title, '主对话标题');

  const n2 = nodeIds[1];
  const b1 = await service.branch('session-root', initial.revision, n2);
  assert.ok(b1.graph.pendingBranch);
  assert.equal(b1.graph.pendingBranch.parent, n2);
  assert.equal(b1.graph.pendingBranch.returnSessionId, 'session-root');
  assert.ok(host.archived.has('session-root'), '切到新分支后原根会话应被归档收纳');
  assert.ok(!host.archived.has(b1.sessionId), '当前激活的新分支保持可见');

  const b2 = await service.branch(b1.sessionId, b1.graph.revision, n2);
  assert.equal(b2.sessionId, b1.sessionId);

  host.pinned.add(b1.sessionId);
  const cancelled = await service.cancelBranch(b1.sessionId, b2.graph.revision);
  assert.equal(cancelled.sessionId, 'session-root');
  assert.equal(cancelled.graph.pendingBranch, undefined);
  assert.ok(!host.archived.has('session-root'), '取消分支后原根会话恢复可见');
  assert.ok(!host.archived.has(b1.sessionId), '被用户置顶的分支不应被自动归档');
  host.pinned.delete(b1.sessionId);
});

test('TreeService: 分阶段验证 internal 轮次先完成保留待输入节点与可拖动性，真实 user 轮次完成后转正并继承坐标', {skip: !runtimeDir && '未配置 DSH_DEV_RUNTIME，跳过宿主服务集成测试'}, async () => {
  const {Session, TreeService} = await loadHostModules();
  await mkdir(join(process.cwd(), 'artifacts'), {recursive: true});
  const dir = await mkdtemp(join(process.cwd(), 'artifacts', 'service-promote-'));
  const storage = new TreeStorage(dir);
  const host = createMockHost(Session, 2);
  const service = new TreeService(host.ctx, storage);

  const g0 = await service.get('session-root');
  const n1 = Object.keys(g0.nodes).find(k => g0.nodes[k].label === '问题 1');
  const n2 = Object.keys(g0.nodes).find(k => g0.nodes[k].label === '问题 2');

  // 阶段 1：从节点 1 创建待输入分支并首次拖动
  const branched = await service.branch('session-root', g0.revision, n1);
  const draftSession = branched.sessionId;
  const pid = `pending:${draftSession}`;
  const moved1 = await service.edit(draftSession, branched.graph.revision, {
    type: 'move',
    id: pid,
    position: {x: 180, y: 260}
  });
  assert.deepEqual(moved1.pendingBranch.position, {x: 180, y: 260});
  const backToRoot = await service.activate(draftSession, moved1.revision, n2);
  assert.equal(backToRoot.sessionId, 'session-root');
  assert.equal(backToRoot.graph.active, n2);

  // 阶段 2：新分支单独先完成一个 internal 轮次（用户尚未发送真实输入），然后从原根会话 get('session-root')
  host.appendUserTurn(draftSession, 'The approval policy changed from "ask" to "never"', 'user-approval');
  const afterInternal = await service.get('session-root');
  assert.ok(afterInternal.pendingBranch, '单独 internal 轮次完成后待输入节点必须保留，不得提前消失');
  assert.deepEqual(afterInternal.pendingBranch.position, {x: 180, y: 260});
  assert.equal(afterInternal.pendingBranch.parent, afterInternal.bindings[draftSession].head, 'pending.parent 应推进到最新 internal 节点以保持移动校验一致');
  assert.equal(afterInternal.active, n2, '后台分支同步不得篡改当前正在浏览的原根 active 节点');
  const collapsedView = conversationView(afterInternal, false);
  assert.ok(collapsedView.graph.nodes[pid], '默认折叠视图下待输入节点依然可见');
  assert.equal(collapsedView.graph.nodes[pid].parent, n1);

  // 阶段 3：在 internal 轮次之后继续拖动待输入节点，验证不会被 editGraph 误删
  const moved2 = await service.edit('session-root', afterInternal.revision, {
    type: 'move',
    id: pid,
    position: {x: 240, y: 310}
  });
  assert.ok(moved2.pendingBranch, '移动待输入节点后 pendingBranch 不得被删');
  assert.deepEqual(moved2.pendingBranch.position, {x: 240, y: 310});

  // 阶段 4：随后用户完成真实 user 轮次，从旧分支 get('session-root') 轮询同步
  host.appendUserTurn(draftSession, '问题 分支首条消息', 'user');
  const afterUser = await service.get('session-root');
  assert.equal(afterUser.pendingBranch, undefined, '真实用户轮次完成后 pendingBranch 必须转正清除');
  assert.equal(afterUser.active, n2, '从旧分支后台轮询时仍保持旧分支 active 不被抢占');
  const promotedUserNode = Object.values(afterUser.nodes).find(n => n.label === '问题 分支首条消息');
  assert.ok(promotedUserNode, '新分支真实用户节点必须入树');
  assert.equal(promotedUserNode.kind, 'user');
  assert.deepEqual(promotedUserNode.position, {x: 240, y: 310}, '转正后的真实用户节点必须继承最新拖动坐标');
});
