import {homedir} from 'node:os';
import {join} from 'node:path';
import {TreeStorage} from './storage.js';
import {TreeService} from './service.js';
import {TreeError, pathKey} from '../core/graph.js';
import {setSandboxMode} from '@deepseek-ai/dsh-sandbox-policy';
import {setApprovalPolicy} from '@deepseek-ai/dsh-user-approval';
import {ProjectSync} from './project-sync.js';
import {exportBundle, importBundle} from './transfer.js';

export const inject = ['connection', 'sessionQuery', 'sessions', 'agents', 'agentDefaultModel'];
export async function apply(ctx) {
  for (const [name, method] of [['sessionQuery', 'readSession'], ['agents', 'create'], ['sessions', 'get']]) {
    if (typeof ctx[name]?.[method] !== 'function') throw new Error(`tree-chat不兼容此 DSH：缺少 ${name}.${method}`);
  }
  const storage = new TreeStorage(join(process.env.DSH_HOME?.trim() || join(homedir(), '.dsh'), 'plugins', 'conversation-tree', 'graphs'));
  const service = new TreeService(ctx, storage, {setSandboxMode,setApprovalPolicy});
  const projects=new ProjectSync(service);ctx.effect(()=>()=>projects.dispose());
  await projects.start();
  ctx.on('session/event',(session,event)=>{
    if(event.type==='compaction/end')storage.serial(()=>service.syncCompaction(session.id)).catch(e=>ctx.logger.warn(`tree-chat 压缩记录：${e.message}`));
    if(['turn/end','session/title','compaction/end'].includes(event.type))projects.event(session.id).catch(e=>ctx.logger.warn(`tree-chat 项目同步：${e.message}`));
  });
  ctx.on('agent/pre-step', async (payload, next) => {
    const graph = await storage.find(payload.agent.session.id);
    if (graph) {
      const binding = graph.bindings[payload.agent.session.id];
      try {
        if (!binding || binding.rewind || !graph.nodes[binding.head] || binding.key !== pathKey(graph, binding.head)) return {kind: 'reject'};
        if(service.contextNeedsRewind(graph,payload.agent.session.id,await service.load(payload.agent.session.id)))return {kind:'reject'};
      } catch { return {kind: 'reject'}; }
    }
    return next();
  });
  // Exact Fetch routes inherit DSH's authentication, Origin fence, and desktop transport.
  ctx.effect(() => ctx.connection.fetch.register({path: '/api/conversation-tree', methods: ['POST'], requestBody: 'buffered',
    fetch: async request => {
      try {
        const raw = await request.text();
        // Only conversation file imports carry large bodies; DSH buffers at most 300 MiB per request.
        if (raw.length > 280*1024*1024) throw new TreeError('导入文件过大', 413);
        let input; try { input = JSON.parse(raw); } catch { throw new TreeError('请求格式错误'); }
        if (raw.length > 4*1024*1024 && input?.action !== 'import') throw new TreeError('请求过大', 413);
        if (typeof input.sessionId !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(input.sessionId)) throw new TreeError('无效的会话标识');
        const result = await storage.serial(async () => {
          switch (input.action) {
            case 'get': return service.get(input.sessionId,input.knownRevision);
            case 'locate': return service.locate(input.sessionId,input.id);
            case 'edit': return service.edit(input.sessionId, input.revision, input.operation ?? {});
            case 'preview': return service.preview(input.sessionId, input.id, input.through ?? input.id, input.includeInternal === true);
            case 'activate': return service.activate(input.sessionId, input.revision, input.id, input.force === true, input.rewind === true);
            case 'branch': return service.branch(input.sessionId,input.revision,input.id);
            case 'cancel-branch': return service.cancelBranch(input.sessionId,input.revision,input.id);
            case 'project-status': return projects.status(input.sessionId,input.directory);
            case 'project-set': return projects.configure(input.sessionId,input.directory,input.enabled,input.asCopy===true);
            case 'project-read': return projects.import(input.sessionId,input.directory,input.treeId);
            case 'export': return exportBundle(service,input.sessionId);
            case 'import': return importBundle(service,input.sessionId,input.bundle);
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
