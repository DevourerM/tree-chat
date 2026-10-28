import {pathTo, ROOT, TreeError} from '../core/graph.js';

const TYPES = new Set(['system/message', 'developer/message', 'user/message', 'assistant/message', 'tool/result']);
export function textOf(message) {
  return (message?.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('\n');
}
export function turnsOf(events, after = -1) {
  const turns = []; let start = null;
  for (const event of events) {
    if (event.type === 'turn/start') start = event.seq;
    if (event.type === 'turn/end' && start !== null) {
      if (event.seq > after) {
        const users = events.slice(start, event.seq + 1).filter(e => e.type === 'user/message');
        const human = users.filter(e => !e.data.source?.kind || e.data.source.kind === 'user');
        const user = human[0] ?? users[0];
        // Maintenance-only turns do not become conversation nodes.
        if (user) {
          const title = text => (text.trim() || '附件对话').replace(/\s+/g, ' ').slice(0,90);
          const kind = human.length ? 'user' : 'internal';
          const label = kind === 'user' ? title(human.map(e=>textOf(e.data)).join('\n'))
            : user.data.source?.kind === 'goal' ? '自动继续' : user.data.source?.kind === 'user-approval' ? '权限变更' : '系统消息';
          turns.push({start,end:event.seq,label,kind,legacyLabel:title(textOf(users[0].data)),createdAt:user.time});
        }
      }
      start = null;
    }
  }
  return turns;
}
export function updateNodePresentation(node, turn) {
  node.kind=turn?.kind ?? 'user';
  if (!turn) return;
  node.labelMode??=node.label===turn.legacyLabel?'auto':'custom';
  if(node.labelMode==='auto')node.label=turn.label;
}
export function messageLocation(events, messageId, fallbackSeq) {
  const message=events.find(e=>e.type==='user/message'&&e.data.id===messageId);
  if(messageId && !message)return null;
  const seq=message?.seq ?? fallbackSeq;
  const turn=events.findLast(e=>e.seq<=seq&&e.type==='turn/start')?.data.turn;
  return Number.isSafeInteger(turn)?{seq,turn}:null;
}
/**
 * Rebuild the current model-visible surface order from a session log.
 * Lifecycle events (`surfaceOp: 'append'`) become surface nodes at their own position;
 * a replacement node shadows the cited range and inherits every raw position it
 * ultimately stands for. Those raw positions let a recorded message be attributed to
 * the original turn even when compaction or result pruning logged it later.
 * @param events - raw session log in seq order.
 * @returns surface node seqs in model-visible order and each node's raw origin seqs.
 */
export function surfaceOrigins(events) {
  const nodes = [], origins = new Map();
  const place = seq => { nodes.push(seq); origins.set(seq, new Set([seq])); };
  for (const event of events) {
    const op = event.surfaceOp;
    if (op === 'append') { place(event.seq); continue; }
    if (op === null || typeof op !== 'object' || Array.isArray(op)) continue;
    const first = nodes.indexOf(op.startSeq), last = nodes.indexOf(op.endSeq);
    if (first < 0 || last < first) { place(event.seq); continue; }
    const removed = nodes.slice(first, last + 1), inherited = new Set();
    for (const seq of removed) {
      const source = origins.get(seq);
      if (source) for (const origin of source) inherited.add(origin);
      origins.delete(seq);
    }
    if (inherited.size === 0) inherited.add(event.seq);
    // The replacement's own seq is deliberately not an origin: it stands for the
    // messages it shadowed, not for the turn that happened to log the rewrite.
    origins.set(event.seq, inherited);
    nodes.splice(first, removed.length, event.seq);
  }
  return {nodes, origins};
}
function sessionContext(source) {
  const events = source.events ?? [];
  const surface = source.surface ?? events.filter(e => e.surfaceOp !== undefined);
  const turns = turnsOf(events);
  const seqToTurn = new Map(), startToTurn = new Map();
  turns.forEach((turn, index) => {
    startToTurn.set(turn.start, index);
    for (let seq = turn.start; seq <= turn.end; seq++) seqToTurn.set(seq, index);
  });
  const {origins} = surfaceOrigins(events);
  return {events, surface, turns, seqToTurn, startToTurn, origins};
}
/**
 * Convert the selected path to ordinary DSH events, keeping complete tool exchanges.
 * The captured effective surface already applies compaction and message projections;
 * each recorded message is re-attributed to the turn its raw log position belonged to,
 * so later compaction/pruning replacements never move a tool call away from its result.
 * Synthetic lifecycle coordinates keep reconnected forks valid for native persistence.
 */
export async function compilePath(graph, head, load, uuid) {
  const path = pathTo(graph, head), cache = new Map();
  const read = async id => {
    if (!cache.has(id)) cache.set(id, await load(id));
    return cache.get(id);
  };
  const origin = await read(graph.id);
  let cwd = origin.header.cwd;
  const seed = []; let turn = 1;
  const append = (type, data, surface = false, time = Date.now()) => {
    const event = {type, data: structuredClone(data), seq: seed.length, time};
    if (surface) event.surfaceOp = 'append';
    seed.push(event); return event.seq;
  };
  // System prompt is protected separately from the user's editable conversation graph.
  const originSurface = origin.surface ?? origin.events.filter(e => e.surfaceOp !== undefined);
  const system = originSurface.find(e => e.type === 'system/message');
  const firstAssistant = origin.events.find(e => e.type === 'assistant/message')?.seq ?? -1;
  const baseline = originSurface.filter(e => e.type === 'developer/message' && e.seq < firstAssistant);
  const baselineSeqs = new Set(baseline.map(e => e.seq));
  const header = origin.events.findLast(e => e.type === 'request/header');
  append('turn/start', {turn});
  append('step/start', {turn, step: 1});
  if (system) append(system.type, {...system.data, turn, step: 1}, true, system.time);
  let headerSeq;
  if (header) headerSeq = append('request/header', {...header.data, turn, step: 1});
  const emit = (event, currentTurn) => {
    const data = structuredClone(event.data);
    const message = event.type === 'user/message' ? data : data?.message;
    if (!message || !TYPES.has(event.type)) return;
    // Preserved provider replay state belongs to the old prefix. A changed prefix must be re-encoded.
    if (message.source?.replayState) delete message.source.replayState;
    if (event.type !== 'user/message' && currentTurn !== undefined) {data.turn = currentTurn; data.step = 1;}
    if (data.headerSeq !== undefined) {
      if (headerSeq === undefined) throw new TreeError('工具定义缺少原生请求头，无法安全重建上下文');
      data.headerSeq = headerSeq;
    }
    return append(event.type, data, true, event.time);
  };
  for (const event of baseline) {
    if (event.data.headerSeq !== undefined) {
      const oldHeader = origin.events[event.data.headerSeq];
      if (oldHeader?.type !== 'request/header') throw new TreeError('共享工具定义不完整');
      headerSeq = append('request/header', {...oldHeader.data, turn, step: 1});
    }
    emit(event, turn);
  }
  append('step/end', {turn, step: 1});
  append('turn/end', {turn, reason: {kind: 'completed'}});

  const nodes = path.filter(node => node.id !== ROOT);
  const sources = new Map(), contexts = new Map(), entries = [];
  for (const node of nodes) {
    if (!node.source) throw new TreeError('节点缺少消息来源');
    const source = await read(node.source.sessionId);
    if (!sources.has(node.source.sessionId)) sources.set(node.source.sessionId, source);
    let context = contexts.get(node.source.sessionId);
    if (!context) { context = sessionContext(source); contexts.set(node.source.sessionId, context); }
    const turnIndex = context.startToTurn.get(node.source.start) ?? context.seqToTurn.get(node.source.start);
    if (turnIndex === undefined) throw new TreeError('节点消息来源无法定位到原始轮次，请重新选择分支');
    entries.push({pathIndex: entries.length, node, sessionId: node.source.sessionId, source, context, turnIndex});
    cwd = source.events.findLast(e => e.seq <= node.source.end && e.type === 'working-directory/change')?.data.cwd ?? source.header.cwd ?? cwd;
  }
  // Attribute every current surface message to at most one synthetic turn.
  // Single-turn messages only travel with their own turn; multi-turn replacements
  // (compaction summaries) stand in for earlier history and ride the first path turn at or after them.
  const assigned = new Map(), groups = new Map();
  for (const entry of entries) {
    const list = groups.get(entry.sessionId) ?? []; list.push(entry); groups.set(entry.sessionId, list);
  }
  for (const [sessionId, group] of groups) {
    const entry = group[0];
    const context = entry.context;
    const exact = new Map(group.map(item => [item.turnIndex, item]));
    const reachable = minTurn => {
      let best;
      for (const item of group) if (item.turnIndex >= minTurn && (best === undefined || item.turnIndex < best.turnIndex)) best = item;
      return best;
    };
    for (const event of context.surface) {
      if (event.type === 'system/message') continue;
      if (sessionId === graph.id && baselineSeqs.has(event.seq)) continue;
      const origins = context.origins.get(event.seq) ?? new Set([event.seq]);
      const seenTurns = new Set();
      let minTurn = Infinity;
      for (const originSeq of origins) {
        const turnIndex = context.seqToTurn.get(originSeq);
        if (turnIndex === undefined) continue;
        seenTurns.add(turnIndex);
        if (turnIndex < minTurn) minTurn = turnIndex;
      }
      if (minTurn === Infinity) continue;
      const target = seenTurns.size === 1 ? exact.get(minTurn) : reachable(minTurn);
      if (!target) continue;
      const list = assigned.get(target.pathIndex) ?? []; list.push(event); assigned.set(target.pathIndex, list);
    }
  }
  const advertised = new Set();
  for (const entry of entries) {
    const messages = assigned.get(entry.pathIndex) ?? [];
    if (!messages.length) continue;
    turn++;
    append('turn/start', {turn});
    append('step/start', {turn, step: 1});
    const pending = new Map();
    for (const event of messages) {
      const message = event.type === 'user/message' ? event.data : event.data?.message;
      // Tool-change definitions refer to the request header at their own historical boundary.
      if (event.type === 'developer/message' && event.data?.headerSeq !== undefined) {
        const oldHeader = entry.source.events[event.data.headerSeq];
        if (oldHeader?.type !== 'request/header') throw new TreeError('历史工具定义不完整');
        headerSeq = append('request/header', {...oldHeader.data, turn, step: 1});
      }
      for (const block of message?.content ?? []) if (block.type === 'tool-call') {
        if (advertised.has(block.id)) throw new TreeError('所选路径包含重复工具调用，请选择不重复的枝');
        advertised.add(block.id);
        pending.set(block.id, block);
      }
      if (message?.role === 'tool') {
        const callId = message.toolCallId;
        if (!pending.has(callId)) throw new TreeError('所选路径包含没有配对的工具结果');
        const call = pending.get(callId); pending.delete(callId);
        if (event.data?.error?.code === 'TOOL_NOT_STARTED') throw new TreeError('这条路径包含分叉时尚未执行的工具记录，请选择完整结束的轮次');
        const callSeq = append('tool/call', {turn, step: 1, callId, name: call.name, arguments: call.arguments});
        const seq = emit(event, turn);
        seed[seq].sourceEventSeqs = [callSeq];
        continue;
      }
      emit(event, turn);
    }
    if (pending.size !== 0) throw new TreeError('这条路径有未完成的工具调用，请等待对话完成后再创建枝');
    append('step/end', {turn, step: 1});
    append('turn/end', {turn, reason: {kind: 'completed'}});
  }
  return {seed, origin, cwd, path: path.map(n => n.id)};
}
