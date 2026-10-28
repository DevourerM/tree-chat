import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {newGraph} from '../src/core/graph.js';
import {turnsOf, compilePath, surfaceOrigins} from '../src/host/context.js';
import {localizeSession, parseSession, archiveSession} from '../src/host/project-format.js';
import {resolveDshRuntime, importDshPackage} from '../scripts/_env.mjs';

let runtimeDir = null;
try {
  const candidate = resolveDshRuntime();
  if (existsSync(resolve(candidate, '@deepseek-ai/dsh-session/lib/index.js'))) runtimeDir = candidate;
} catch { runtimeDir = null; }
const skip = !runtimeDir && '未配置 DSH_DEV_RUNTIME';

let hostModules = null;
async function host() {
  if (hostModules) return hostModules;
  const sessionModule = await importDshPackage('@deepseek-ai/dsh-session/lib/index.js');
  const validator = await importDshPackage('@deepseek-ai/dsh-session-format-v3-to-v4/lib/index.js');
  hostModules = {Session: sessionModule.Session, KNOWN_SESSION_EVENT_TYPES: sessionModule.KNOWN_SESSION_EVENT_TYPES, assertReleasedV4Relationships: validator.assertReleasedV4Relationships};
  return hostModules;
}
const currentSurface = events => {
  const {nodes} = surfaceOrigins(events), bySeq = new Map(events.map(event => [event.seq, event]));
  return nodes.map(seq => structuredClone(bySeq.get(seq)));
};
function graphOf(data) {
  const graph = newGraph(data.header.id);
  for (const turn of turnsOf(data.events)) {
    const id = String(Object.keys(graph.nodes).length);
    graph.nodes[id] = {id, parent: id === '1' ? 'root' : String(Number(id) - 1), label: turn.label, createdAt: turn.createdAt, source: {sessionId: graph.id, start: turn.start, end: turn.end}};
    graph.active = id;
  }
  return graph;
}
/** A compiled seed must survive the host's own released-v4 relationship validation and replay. */
async function assertNativeSeed(seed, header) {
  const {Session, KNOWN_SESSION_EVENT_TYPES, assertReleasedV4Relationships} = await host();
  const artifactHeader = {...header, id: 'session-compiled', isSeeded: true, parentSession: 'session-parent'};
  assertReleasedV4Relationships({header: artifactHeader, inheritedEventCount: seed.length, events: seed}, KNOWN_SESSION_EVENT_TYPES);
  const session = Session.create('session-compiled', seed, artifactHeader, seed.length, []);
  const messages = session.deriveMessages();
  assert.deepEqual(seed.map(e => e.seq), seed.map((_, i) => i));
  return messages;
}
/** Every advertised tool call is answered before the enclosing step ends, in the same turn. */
function assertToolPairs(seed) {
  let turn = null, step = null;
  const pending = new Map();
  for (const event of seed) {
    const data = event.data ?? {};
    if (event.type === 'turn/start') {turn = data.turn; step = null; pending.clear();}
    else if (event.type === 'step/start') step = data.step;
    else if (event.type === 'assistant/message') for (const block of data.message?.content ?? []) if (block.type === 'tool-call') pending.set(block.id, {turn, step});
    else if (event.type === 'tool/result') {
      const id = data.message?.toolCallId;
      assert.ok(pending.has(id), `tool result ${id} has no advertised call in turn ${turn}`);
      pending.delete(id);
    } else if (event.type === 'step/end') {
      assert.equal(pending.size, 0, `step/end leaves unresolved tool calls: ${[...pending.keys()].join(',')}`);
      step = null;
    } else if (event.type === 'turn/end') {
      assert.equal(pending.size, 0, `turn/end leaves unresolved tool calls: ${[...pending.keys()].join(',')}`);
      turn = null;
    }
  }
}
/** Session builder; `inject` runs inside a turn's step so replacements land at a later log position. */
function builder(idPrefix = '') {
  const events = [];
  let serial = 0;
  const add = (type, data, extra = {}) => {
    const event = {type, data, seq: events.length, time: 1000 + events.length, ...extra};
    events.push(event); return event;
  };
  const message = (role, text) => ({
    id: `m-${++serial}`, role,
    source: role === 'assistant' ? {kind: 'model', provider: 'test', model: 'test'} : role === 'system' ? {kind: 'system-prompt'} : {kind: 'user'},
    content: [{type: 'text', text}]
  });
  const turn = (number, {tools = true, inject} = {}) => {
    add('turn/start', {turn: number});
    add('step/start', {turn: number, step: 1});
    if (number === 1) {
      add('system/message', {turn: 1, step: 1, message: message('system', '系统提示')}, {surfaceOp: 'append'});
      add('request/header', {turn: 1, step: 1, reason: 'initial', header: {config: {provider: 'test', model: 'test'}, tools: [{name: 'read', description: '读取', parameters: {type: 'object'}}]}});
    }
    add('user/message', message('user', `问题 ${number}`), {surfaceOp: 'append'});
    if (tools) {
      const callId = `${idPrefix}call-${number}`;
      const assistant = message('assistant', `调用 ${number}`);
      assistant.content.push({type: 'tool-call', id: callId, name: 'read', arguments: '{"path":"a"}'});
      add('assistant/message', {turn: number, step: 1, message: assistant, stream: []}, {surfaceOp: 'append'});
      add('tool/call', {turn: number, step: 1, callId, name: 'read', arguments: '{"path":"a"}'});
      add('tool/result', {turn: number, step: 1, message: {
        id: `m-${++serial}`, role: 'tool', source: {kind: 'tool', callId}, toolCallId: callId, isError: false,
        content: [{type: 'text', text: `结果 ${number}`}]
      }}, {surfaceOp: 'append'});
    }
    add('assistant/message', {turn: number, step: 1, message: message('assistant', `回答 ${number}`), stream: []}, {surfaceOp: 'append'});
    inject?.({add, message, events});
    add('step/end', {turn: number, step: 1});
    add('turn/end', {turn: number, reason: {kind: 'completed'}});
  };
  const data = id => ({events, header: {version: 4, id, cwd: '/project', createdAt: 1000, isSeeded: false}, surface: currentSurface(events)});
  return {events, add, message, turn, data};
}
const pruneResult = (original, content) => ({
  type: 'tool/result',
  data: {...structuredClone(original.data), message: {...structuredClone(original.data.message), content: [{type: 'text', text: content}]}},
  surfaceOp: {op: 'replace', startSeq: original.seq, endSeq: original.seq},
  sourceEventSeqs: [original.seq]
});

test('压缩/裁剪把工具结果追加到后面的轮次时，种子仍把调用与结果留在原轮次', {skip}, async () => {
  const source = builder();
  source.turn(1); source.turn(2);
  source.turn(3, {inject: ({add, events}) => {
    const original = events.find(e => e.type === 'tool/result' && e.data.message.toolCallId === 'call-1');
    const rewrite = pruneResult(original, '被裁剪的结果 1');
    add(rewrite.type, rewrite.data, {surfaceOp: rewrite.surfaceOp, sourceEventSeqs: rewrite.sourceEventSeqs});
  }});
  const data = source.data('session-fixture');
  // The rewrite is logged much later than the result it replaces.
  const originalSeq = source.events.find(e => e.type === 'tool/result' && e.data.message.toolCallId === 'call-1').seq;
  assert.ok(data.surface.find(e => e.data?.message?.toolCallId === 'call-1').seq > originalSeq + 5);
  const {seed} = await compilePath(graphOf(data), '3', async () => data);
  assertToolPairs(seed);
  const messages = await assertNativeSeed(seed, data.header);
  const users = messages.filter(m => m.role === 'user').map(m => m.content[0].text);
  assert.deepEqual(users, ['问题 1', '问题 2', '问题 3']);
  const callIndex = seed.findIndex(e => e.type === 'tool/call' && e.data.callId === 'call-1');
  const resultIndex = seed.findIndex(e => e.type === 'tool/result' && e.data.message.toolCallId === 'call-1');
  assert.ok(callIndex >= 0 && resultIndex > callIndex);
  assert.equal(seed[resultIndex].data.message.content[0].text, '被裁剪的结果 1');
  assert.ok(seed.findIndex((e, i) => i > resultIndex && e.type === 'turn/end') > resultIndex);
});

test('连续替换（替换再被替换）仍按最初的轮次归属', {skip}, async () => {
  const source = builder();
  source.turn(1);
  source.turn(2, {inject: ({add, events}) => {
    const original = events.find(e => e.type === 'tool/result' && e.data.message.toolCallId === 'call-1');
    const rewrite = pruneResult(original, '第一次裁剪');
    add(rewrite.type, rewrite.data, {surfaceOp: rewrite.surfaceOp, sourceEventSeqs: rewrite.sourceEventSeqs});
  }});
  source.turn(3, {inject: ({add, events}) => {
    const middle = events.findLast(e => e.type === 'tool/result' && e.data?.message?.toolCallId === 'call-1' && e.surfaceOp);
    const rewrite = pruneResult(middle, '第二次裁剪');
    add(rewrite.type, rewrite.data, {surfaceOp: rewrite.surfaceOp, sourceEventSeqs: rewrite.sourceEventSeqs});
  }});
  const data = source.data('session-fixture');
  assert.equal(data.surface.filter(e => e.data?.message?.toolCallId === 'call-1').length, 1);
  const {seed} = await compilePath(graphOf(data), '3', async () => data);
  assertToolPairs(seed);
  await assertNativeSeed(seed, data.header);
  assert.equal(seed.find(e => e.type === 'tool/result' && e.data.message.toolCallId === 'call-1').data.message.content[0].text, '第二次裁剪');
});

test('跨轮压缩摘要被放回它替代的历史位置之前，而不是落在产生摘要的轮次', {skip}, async () => {
  const source = builder();
  source.turn(1, {tools: false});
  source.turn(2, {tools: false});
  source.turn(3, {tools: false, inject: ({add, message, events}) => {
    const startSeq = events.find(e => e.type === 'user/message' && e.data.content[0].text === '问题 1').seq;
    const endSeq = events.findLast(e => e.type === 'assistant/message' && e.data.turn === 1).seq;
    const shadowed = [startSeq, endSeq];
    const summary = message('user', '压缩摘要');
    summary.source = {kind: 'compact-basic'};
    add('user/message', summary, {surfaceOp: {op: 'replace', startSeq, endSeq}, sourceEventSeqs: shadowed});
  }});
  const data = source.data('session-fixture');
  const {seed} = await compilePath(graphOf(data), '3', async () => data);
  await assertNativeSeed(seed, data.header);
  const users = seed.filter(e => e.type === 'user/message').map(e => e.data.content[0].text);
  assert.deepEqual(users, ['压缩摘要', '问题 2', '问题 3']);
  // The summary stands before the turns it summarizes and cannot be duplicated.
  assert.equal(seed.filter(e => e.data?.content?.[0]?.text === '压缩摘要').length, 1);
});

test('路径跨会话时每个来源各自归位，种子仍通过原生校验', {skip}, async () => {
  const main = builder();
  main.turn(1); main.turn(2);
  const branch = builder('b');
  branch.turn(1);
  const mainData = main.data('session-main'), branchData = branch.data('session-branch');
  const graph = graphOf(mainData);
  const branchTurn = turnsOf(branchData.events)[0];
  graph.nodes.side = {
    id: 'side', parent: String(Object.keys(graph.nodes).length - 1), label: '侧枝', createdAt: branchTurn.createdAt,
    source: {sessionId: 'session-branch', start: branchTurn.start, end: branchTurn.end}
  };
  graph.active = 'side';
  const {seed} = await compilePath(graph, 'side', async id => id === 'session-main' ? mainData : branchData);
  assertToolPairs(seed);
  await assertNativeSeed(seed, mainData.header);
  assert.deepEqual(seed.filter(e => e.type === 'user/message').map(e => e.data.content[0].text), ['问题 1', '问题 2', '问题 1']);
});

test('导入恢复会话时把投递标记改写为新会话身份', () => {
  const marker = {type: 'session-log-deepseek/delivery-accepted', data: {sessionId: 'session-source', sessionFormatVersion: 4, throughSeq: 0}, seq: 1, time: 1};
  const archived = {
    header: {version: 4, id: 'session-source', createdAt: 1, cwd: '/project', isSeeded: false},
    inheritedEventCount: 0,
    events: [{type: 'turn/start', data: {turn: 1}, seq: 0, time: 0}, marker]
  };
  const roundTrip = parseSession(archiveSession(archived, 'session-portable', '/project'), 'session-portable');
  const localized = localizeSession(roundTrip, 'session-target', '/project', {provider: 'test', model: 'test'});
  assert.equal(localized.events[1].data.sessionId, 'session-target');
  assert.equal(localized.header.id, 'session-target');
});
