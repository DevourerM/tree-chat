import {homedir} from 'node:os';
import {join} from 'node:path';
import {TreeStorage} from './storage.js';
import {TreeService} from './service.js';
import {TreeError, pathKey} from '../core/graph.js';

export const inject = ['connection', 'sessionQuery', 'sessions', 'agents', 'agentDefaultModel'];
export function apply(ctx) {
  for (const [name, method] of [['sessionQuery', 'readSession'], ['agents', 'create'], ['sessions', 'get']]) {
    if (typeof ctx[name]?.[method] !== 'function') throw new Error(`tree-chat不兼容此 DSH：缺少 ${name}.${method}`);
  }
  const storage = new TreeStorage(join(process.env.DSH_HOME?.trim() || join(homedir(), '.dsh'), 'plugins', 'conversation-tree', 'graphs'));
  const service = new TreeService(ctx, storage);
  ctx.on('agent/pre-step', async (payload, next) => {
    const graph = await storage.find(payload.agent.session.id);
    if (graph) {
      const binding = graph.bindings[payload.agent.session.id];
      try {
        if (!binding || !graph.nodes[binding.head] || binding.key !== pathKey(graph, binding.head)) return {kind: 'reject'};
      } catch { return {kind: 'reject'}; }
    }
    return next();
  });
  // Exact Fetch routes inherit DSH's authentication, Origin fence, and desktop transport.
  ctx.effect(() => ctx.connection.fetch.register({path: '/api/conversation-tree', methods: ['POST'], requestBody: 'buffered',
    fetch: async request => {
      try {
        const raw = await request.text();
        if (raw.length > 65536) throw new TreeError('请求过大', 413);
        let input; try { input = JSON.parse(raw); } catch { throw new TreeError('请求格式错误'); }
        if (typeof input.sessionId !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(input.sessionId)) throw new TreeError('无效的会话标识');
        const result = await storage.serial(async () => {
          switch (input.action) {
            case 'get': return service.get(input.sessionId);
            case 'locate': return service.locate(input.sessionId,input.id);
            case 'edit': return service.edit(input.sessionId, input.revision, input.operation ?? {});
            case 'preview': return service.preview(input.sessionId, input.id, input.through ?? input.id, input.includeInternal === true);
            case 'activate': return service.activate(input.sessionId, input.revision, input.id, input.force === true);
            case 'branch': return service.branch(input.sessionId,input.revision,input.id);
            case 'cancel-branch': return service.cancelBranch(input.sessionId,input.revision,input.id);
            default: throw new TreeError('未知的tree-chat操作');
          }
        });
        return Response.json(result, {headers: {'Cache-Control': 'no-store'}});
      } catch (error) {
        const status = error instanceof TreeError ? error.status : 500;
        if (status === 500) ctx.logger.warn(`tree-chat: ${String(error)}`);
        return Response.json({error: status === 500 ? `tree-chat操作失败：${error.message}` : error.message}, {status});
      }
    }
  }), 'conversation-tree: authenticated API');
}
