import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {TreeStorage} from '../src/host/storage.js';
import {conversationView} from '../src/core/presentation.js';
import {fixture} from './fixtures.mjs';
import {pluginRoot, resolveDshRuntime} from '../scripts/_env.mjs';

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
  const graphUrl = pathToFileURL(resolve(pluginRoot, 'src/core/graph.js')).href;
  const contextUrl = pathToFileURL(resolve(pluginRoot, 'src/host/context.js')).href;
  const serviceUrl = pathToFileURL(resolve(pluginRoot, 'src/host/service.js')).href;
  const {Session} = await import(sessionUrl);
  const source = (await readFile(resolve(pluginRoot, 'src/host/service.js'), 'utf8'))
    .replace("from '@deepseek-ai/dsh-session'", `from ${JSON.stringify(sessionUrl)}`)
    .replace("from '../core/graph.js'", `from ${JSON.stringify(graphUrl)}`)
    .replace("from './context.js'", `from ${JSON.stringify(contextUrl)}`) + `\n//# sourceURL=${serviceUrl}\n`;
  const mod = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`);
  return {Session, TreeService: mod.TreeService};
}

function createMockHost(Session, initialTurns = 3) {
  const liveSessions = new Map();
  const rootData = fixture(initialTurns, false);
  const rootHeader = {...rootData.header, id: 'session-root', title: '主对话标题'};
  const rootSession = Session.create('session-root', rootData.events, rootHeader, 0, []);
  liveSessions.set('session-root', rootSession);

  const archived = new Set();
  const pinned = new Set();
  const attached = new Set(['session-root']);
  const agents = new Map([['session-root', {session: rootSession, status: 'idle'}]]);

  const workspace = {
    get sessionIds() { return [...attached]; },
    async attachSession(id) { attached.add(id); }
  };

  const registry = {
    get archivedSessionIds() { return [...archived]; },
    get pinnedSessionIds() { return [...pinned]; },
    list() { return [workspace]; },
    async archiveSession(id) { archived.add(id); },
    async unarchiveSession(id) { archived.delete(id); }
  };

  const ctx = {
    logger: {warn() {}},
    get(name) {
      if (name === 'workspaceRegistry') return registry;
      return undefined;
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

  function appendUserTurn(sessionId, text, kind = 'user') {
    const session = liveSessions.get(sessionId);
    assert.ok(session, `missing session ${sessionId}`);
    const events = session.snapshotEvents(0);
    const turnNum = (events.findLast(e => e.type === 'turn/start')?.data.turn ?? 0) + 1;
    session.append('turn/start', {turn: turnNum});
    session.append('step/start', {turn: turnNum, step: 1});
    session.append(
      'user/message',
      {id: `msg-${sessionId}-${turnNum}`, role: 'user', source: {kind}, content: [{type: 'text', text}]},
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

  return {ctx, liveSessions, archived, pinned, agents, appendUserTurn};
}

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
