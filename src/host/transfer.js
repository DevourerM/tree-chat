import {randomUUID} from 'node:crypto';
import {validateGraph,publicGraph,pathKey,pathTo,TreeError} from '../core/graph.js';
import {digest,validId,mapGraph,archiveSession,parseSession,attachmentRefs,localizeSession} from './project-format.js';

export const BUNDLE_FORMAT='tree-chat-bundle';
export const MAX_BUNDLE_BYTES=200*1024*1024;

/** Every native session a tree depends on: origin, bindings and node sources. */
export function treeSessionIds(graph){
  return new Set([graph.id,...Object.keys(graph.bindings),...Object.values(graph.nodes).filter(n=>n.source).map(n=>n.source.sessionId)]);
}
async function readAttachment(store,a){
  if(!store)throw Error('当前 DSH 缺少附件服务，无法完整导出');
  if(a.kind==='image')return Buffer.from((await store.readImage(a.ref)).data);
  const chunks=[];let size=0;
  for await(const chunk of store.readFileStream(a.ref)){size+=chunk.length;if(size>256*1024*1024)throw Error('单个附件超过 256 MiB');chunks.push(chunk);}
  return Buffer.concat(chunks);
}
/** Converts a local tree to portable session identities and collects session logs and attachment bytes. */
export async function collectTree(service,graph,inverse,root){
  const sourceIds=treeSessionIds(graph);
  if(sourceIds.size>1000)throw Error('一棵树最多包含 1000 个原生会话');
  const pid=id=>inverse[id]??id;
  const portable=mapGraph(graph,Object.fromEntries([...sourceIds].map(id=>[id,pid(id)])));
  const sessions=new Map(),sources=new Map(),assets=[],blobs=new Map(),seen=new Set();
  for(const sid of sourceIds){
    const data=await service.load(sid),id=pid(sid);sources.set(id,data);
    sessions.set(id,archiveSession(data,id,root??data.header.cwd??process.cwd()));
    for(const [key,a]of attachmentRefs(data.events))if(!seen.has(key)){
      seen.add(key);const bytes=await readAttachment(service.ctx.get('attachments'),a),hash=digest(bytes);
      blobs.set(hash,bytes);assets.push({key,kind:a.kind,ref:a.ref,hash,size:bytes.length});
    }
  }
  assets.sort((a,b)=>a.key.localeCompare(b.key));
  return {portable,sessions,sources,assets,blobs};
}
/**
 * Recreates a portable tree as brand-new local sessions in `root`, using the current session's model,
 * agent preset and permissions. Nothing existing is overwritten.
 */
export async function restoreTree(service,sessionId,{portable,sessions,assetBytes},root,afterSave){
  const ctx=service.ctx;
  if(portable.undo.length||portable.redo.length)throw new TreeError('记录不能包含本机撤销历史');
  const originals=treeSessionIds(portable);
  if(originals.size!==sessions.size||[...originals].some(id=>!sessions.has(id)))throw new TreeError('树引用的会话记录不完整');
  const source=await service.load(sessionId),presets=ctx.get('agentPresets');
  const presetId=source.events.findLast(e=>e.type==='agent-preset/selected')?.data.agentPreset??source.header.agentPreset;
  const preset=presets?await presets.resolve(presetId):null;
  const model=source.events.findLast(e=>e.type==='model/selection')?.data??ctx.agentDefaultModel.currentSelection();
  const permission=service.permissions.capture(source.native),mapping=Object.fromEntries([...originals].map(id=>[id,`session-${randomUUID()}`]));
  const parsed=new Map();
  for(const [id,text]of sessions){const data=parseSession(text,id);parsed.set(id,data);service.validateArchive(localizeSession(data,mapping[id],root,model));}
  for(const node of Object.values(portable.nodes))if(node.source&&node.source.end>=parsed.get(node.source.sessionId).events.length)throw new TreeError('节点消息来源超出会话范围');
  const needed=new Map();for(const data of parsed.values())for(const [key,a]of attachmentRefs(data.events))needed.set(key,a);
  const attachmentMap={},store=ctx.get('attachments');
  if(needed.size&&!store)throw new TreeError('当前 DSH 缺少附件恢复服务');
  for(const [key,a]of needed){
    const bytes=assetBytes(key);if(!bytes)throw new TreeError('记录缺少对话附件');
    attachmentMap[key]=a.kind==='image'?await store.saveImage({data:bytes,mediaType:a.ref.mediaType,...(a.ref.name?{name:a.ref.name}:{})}):await store.saveFile({data:bytes,...(a.ref.name?{name:a.ref.name}:{})});
  }
  const graph=mapGraph(portable,mapping),handles=[];
  try{
    for(const [id,data]of parsed){
      const restored=localizeSession(data,mapping[id],root,model,attachmentMap);service.validateArchive(restored);
      const handle=await ctx.agents.create({sessionId:mapping[id],seed:restored.events,inheritedEventCount:data.inheritedEventCount,
        meta:{createdAt:data.header.createdAt,cwd:root,isSeeded:data.header.isSeeded,...(preset?{agentPreset:preset.id}:{})},agentOptions:{provider:model.provider,model:model.model},
        setup:async(agentCtx,agent)=>{if(presets)await presets.mount(agentCtx,preset.id);service.permissions.apply(agent.session,permission);agent.session.append('model/selection',model);}
      });handles.push(handle);
      if(graph.bindings[mapping[id]])graph.bindings[mapping[id]].seen=handle.agent.session.seq-1;
    }
    service.repair(graph);
    const owner=Object.entries(graph.bindings).find(([,b])=>b.head===graph.active&&b.key===pathKey(graph,graph.active))?.[0]??graph.id;
    for(const id of Object.keys(graph.bindings))await service.syncSessionTurns(graph,id,undefined,id===owner);
    for(const b of Object.values(graph.bindings))if(pathTo(graph,b.head).some(n=>n.kind==='compaction'&&n.compaction.prefixKey!==pathKey(graph,n.parent)))b.rewind=true;
    const registry=ctx.get('workspaceRegistry');const workspace=registry?await registry.resolveByPath(root)??await registry.create(root):null;
    await service.storage.save(graph);
    await afterSave?.(graph,mapping);
    if(workspace)for(const sid of Object.keys(graph.bindings))await workspace.attachSession(sid);
    const selected=Object.entries(graph.bindings).find(([,b])=>b.head===graph.active&&b.key===pathKey(graph,graph.active))?.[0]??graph.id;
    await service.shelve(graph,selected);
    if(graph.bindings[selected]?.rewind)return await service.activate(selected,graph.revision,graph.bindings[selected].head,false,true);
    return {sessionId:selected,graph:publicGraph(graph)};
  }catch(e){for(const h of handles.reverse())await h.dispose?.().catch(()=>{});throw e;}
}
async function workspaceRoot(service,sessionId,graph){
  const registry=service.ctx.get('workspaceRegistry');
  const workspace=registry?.list().find(w=>w.sessionIds.includes(sessionId)||w.sessionIds.includes(graph.id));
  return workspace?.path??(await service.load(sessionId)).header.cwd??null;
}
/** A single self-contained JSON file: tree, full session event logs and attachments. */
export async function exportBundle(service,sessionId){
  const graph=await service.sync(sessionId);
  if(service.isBusy(graph))throw new TreeError('请等待这棵树中的生成或上下文压缩完成后再导出',409);
  let changed=false;
  for(const sid of Object.keys(graph.bindings))changed=(await service.syncSessionTurns(graph,sid,undefined,sid===sessionId))||changed;
  if(changed){graph.revision++;graph.undo=[];graph.redo=[];await service.storage.save(graph);}
  const root=await workspaceRoot(service,sessionId,graph);
  const {portable,sessions,assets,blobs}=await collectTree(service,graph,{},root);
  let total=0;for(const text of sessions.values())total+=Buffer.byteLength(text);for(const b of blobs.values())total+=Math.ceil(b.length/3)*4;
  if(total>MAX_BUNDLE_BYTES)throw new TreeError('对话超过 200 MiB，无法导出为单个文件；请改用项目同步',413);
  return {format:BUNDLE_FORMAT,version:1,title:graph.title,exportedAt:new Date().toISOString(),graph:portable,
    sessions:Object.fromEntries(sessions),assets:assets.map(a=>({...a,data:blobs.get(a.hash).toString('base64')}))};
}
function parseBundle(input){
  const bad=message=>new TreeError(message);
  if(input?.format!==BUNDLE_FORMAT)throw bad('不是 tree-chat 导出的对话文件');
  if(input.version!==1)throw bad('不支持的对话文件版本，请升级 tree-chat');
  if(!input.sessions||typeof input.sessions!=='object'||Array.isArray(input.sessions)||!Array.isArray(input.assets))throw bad('对话文件内容不完整');
  const ids=Object.keys(input.sessions);
  if(ids.length>1000||ids.some(id=>!validId(id)||typeof input.sessions[id]!=='string'))throw bad('对话文件中的会话无效');
  if(input.assets.length>20000)throw bad('对话文件附件过多');
  const assets=new Map();
  for(const a of input.assets){
    if(!a||typeof a.key!=='string'||!['file','image'].includes(a.kind)||typeof a.data!=='string'||!/^[a-f0-9]{64}$/.test(a.hash))throw bad('对话文件附件索引无效');
    const bytes=Buffer.from(a.data,'base64');if(digest(bytes)!==a.hash)throw bad('对话文件附件校验失败');
    assets.set(a.key,bytes);
  }
  let portable;try{portable=validateGraph(structuredClone(input.graph));}catch(e){throw bad(`对话文件中的树无效：${e.message}`);}
  return {portable,sessions:new Map(Object.entries(input.sessions)),assetBytes:key=>assets.get(key)};
}
/** Earlier versions exported only the tree; it can be copied only when its sessions still exist on this machine. */
async function legacyBundle(service,input){
  const graph=structuredClone(input);delete graph.canUndo;delete graph.canRedo;delete graph.projectSync;graph.undo=[];graph.redo=[];
  try{validateGraph(graph);}catch(e){throw new TreeError(`对话文件中的树无效：${e.message}`);}
  try{
    const {portable,sessions,assets,blobs}=await collectTree(service,graph,{},null);
    return {portable,sessions,assetBytes:key=>{const a=assets.find(x=>x.key===key);return a&&blobs.get(a.hash);}};
  }catch{throw new TreeError('该文件是旧版“树结构”导出，只含节点、不含聊天内容，且本机找不到对应会话；请在原设备升级 tree-chat 后重新导出');}
}
export async function importBundle(service,sessionId,input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new TreeError('对话文件格式错误');
  const current=await service.sync(sessionId);
  const root=await workspaceRoot(service,sessionId,current);
  if(typeof root!=='string'||!root)throw new TreeError('无法确定当前对话的工作目录，请先在工作区中打开一个对话');
  const parsed=input.format===undefined&&input.schemaVersion!==undefined?await legacyBundle(service,input):parseBundle(input);
  return restoreTree(service,sessionId,parsed,root);
}
