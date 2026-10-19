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
/** Convert the selected path to ordinary DSH events, keeping complete tool exchanges.
 * The captured effective surface already applies compaction/message projections.
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
  const system = origin.surface.find(e => e.type === 'system/message');
  const firstAssistant = origin.events.find(e => e.type === 'assistant/message')?.seq ?? -1;
  const baseline = origin.surface.filter(e => e.type === 'developer/message' && e.seq < firstAssistant);
  const baselineSeqs = new Set(baseline.map(e => e.seq));
  const header = origin.events.findLast(e => e.type === 'request/header');
  append('turn/start', {turn});
  append('step/start', {turn, step: 1});
  if (system) append(system.type, {...system.data, turn, step: 1}, true, system.time);
  let headerSeq;
  if (header) headerSeq = append('request/header', {...header.data, turn, step: 1});
  const emit = (event, currentTurn) => {
    const data = structuredClone(event.data);
    const message = event.type === 'user/message' ? data : data.message;
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
  const calls = new Map(), answered = new Set();
  for (const node of path) {
    if (node.id === ROOT) continue;
    const source = await read(node.source.sessionId);
    cwd = source.events.findLast(e => e.seq <= node.source.end && e.type === 'working-directory/change')?.data.cwd ?? source.header.cwd ?? cwd;
    const messages = source.surface.filter(e => e.seq >= node.source.start && e.seq <= node.source.end && e.type !== 'system/message' && !(node.source.sessionId === graph.id && baselineSeqs.has(e.seq)));
    if (!messages.some(e => e.type === 'user/message')) throw new TreeError('这个节点已被 DSH 压缩替代，无法单独重连；请使用压缩前的原始会话');
    turn++;
    append('turn/start', {turn});
    append('step/start', {turn, step: 1});
    for (const event of messages) {
      const message = event.type === 'user/message' ? event.data : event.data.message;
      // Tool-change definitions refer to the request header at their own historical boundary.
      if (event.type === 'developer/message' && event.data.headerSeq !== undefined) {
        const oldHeader = source.events[event.data.headerSeq];
        if (oldHeader?.type !== 'request/header') throw new TreeError('历史工具定义不完整');
        headerSeq = append('request/header', {...oldHeader.data, turn, step: 1});
      }
      for (const block of message?.content ?? []) if (block.type === 'tool-call') {
        if (calls.has(block.id)) throw new TreeError('所选路径包含重复工具调用，请选择不重复的枝');
        calls.set(block.id, block);
      }
      if (message?.role === 'tool') {
        if (!calls.has(message.toolCallId) || answered.has(message.toolCallId)) throw new TreeError('所选路径包含没有配对的工具结果');
        if (event.data.error?.code === 'TOOL_NOT_STARTED') throw new TreeError('这条路径包含分叉时尚未执行的工具记录，请选择完整结束的轮次');
        answered.add(message.toolCallId);
        const call = calls.get(message.toolCallId);
        const callSeq = append('tool/call', {turn, step: 1, callId: call.id, name: call.name, arguments: call.arguments});
        const seq = emit(event, turn);
        seed[seq].sourceEventSeqs = [callSeq];
        continue;
      }
      emit(event, turn);
    }
    append('step/end', {turn, step: 1});
    append('turn/end', {turn, reason: {kind: 'completed'}});
  }
  if ([...calls.keys()].some(id => !answered.has(id))) throw new TreeError('这条路径有未完成的工具调用，请等待对话完成后再创建枝');
  return {seed, origin, cwd, path: path.map(n => n.id)};
}
