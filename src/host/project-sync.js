import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {renameWithRetry} from './files.js';
import {validateGraph,TreeError} from '../core/graph.js';
import {PROJECT_FORMAT,digest,json,validId,mapGraph,archiveSession,attachmentRefs,markdownTree} from './project-format.js';
import {restoreTree} from './transfer.js';
import {projectRoot,listProjectTrees,readArchive,writeArchive} from './project-files.js';

export class ProjectSync {
  constructor(service){
    this.service=service;this.ctx=service.ctx;this.directory=join(service.storage.directory,'..','project-sync');
    this.links=new Map();this.timers=new Map();this.errors=new Map();this.writing=new Set();this.disposed=false;
    service.projects=this;service.storage.onSaved=graph=>this.schedule(graph.id);
  }
  async start(){
    let names;try{names=await readdir(this.directory);}catch(e){if(e.code==='ENOENT')return;throw e;}
    for(const name of names)if(name.endsWith('.json')&&validId(name.slice(0,-5))){try{const link=await this.link(name.slice(0,-5));if(link.enabled)this.schedule(name.slice(0,-5));}catch(e){this.ctx.logger.warn(`tree-chat 项目同步配置：${e.message}`);}}
  }
  async link(id){
    if(!validId(id))throw Error('无效的树标识');if(this.links.has(id))return this.links.get(id);
    let link;try{link=JSON.parse(await readFile(join(this.directory,id+'.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
    if(link&&(!validId(link.treeId)||typeof link.root!=='string'||typeof link.enabled!=='boolean'||!link.sessionMap||Object.entries(link.sessionMap).some(([a,b])=>!validId(a)||!validId(b))))throw Error('项目同步配置损坏');
    this.links.set(id,link??null);return link??null;
  }
  async saveLink(id,link){
    await mkdir(this.directory,{recursive:true});const file=join(this.directory,id+'.json'),temp=file+'.'+randomUUID()+'.tmp';
    await writeFile(temp,json(link));await renameWithRetry(temp,file);this.links.set(id,link);
  }
  summary(id){const link=this.links.get(id);return {enabled:link?.enabled??false,error:this.errors.get(id)??null};}
  schedule(id){
    if(this.disposed||this.writing.has(id)||this.errors.has(id))return;
    const link=this.links.get(id);if(!link?.enabled)return;
    clearTimeout(this.timers.get(id));const timer=setTimeout(()=>{this.timers.delete(id);this.service.storage.serial(()=>this.write(id)).catch(e=>{this.errors.set(id,e.message);this.ctx.logger.warn(`tree-chat 项目同步：${e.message}`);});},700);timer.unref?.();this.timers.set(id,timer);
  }
  async event(sessionId){const graph=await this.service.storage.find(sessionId);if(graph){await this.link(graph.id);this.schedule(graph.id);}}
  async defaultRoot(sessionId){
    const graph=await this.service.sync(sessionId),registry=this.ctx.get('workspaceRegistry');
    const workspace=registry?.list().find(w=>w.sessionIds.includes(sessionId)||w.sessionIds.includes(graph.id));
    return workspace?.path??(await this.service.load(sessionId)).header.cwd??null;
  }
  async status(sessionId,directory){
    const graph=await this.service.sync(sessionId),link=await this.link(graph.id);
    const root=await projectRoot(directory??link?.root??await this.defaultRoot(sessionId));
    const records=await listProjectTrees(root);
    const enabled=Boolean(link?.enabled&&link.root===root),waiting=enabled&&this.service.isBusy(graph);
    return {root,enabled,waiting,treeId:link?.root===root?link.treeId:null,error:this.errors.get(graph.id)??null,records};
  }
  async configure(sessionId,directory,enabled,asCopy=false){
    if(typeof enabled!=='boolean')throw new TreeError('请选择是否同步');
    const graph=await this.service.sync(sessionId);let link=await this.link(graph.id);
    if(!enabled){if(link){link={...link,enabled:false};await this.saveLink(graph.id,link);}clearTimeout(this.timers.get(graph.id));this.timers.delete(graph.id);this.errors.delete(graph.id);return this.status(sessionId,directory??link?.root);}
    const root=await projectRoot(directory??link?.root??await this.defaultRoot(sessionId));
    if(!link||link.root!==root||asCopy)link={root,treeId:`tree-${randomUUID()}`,enabled:true,sessionMap:{},snapshot:null};
    else link={...link,enabled:true};
    await this.saveLink(graph.id,link);this.errors.delete(graph.id);
    if(this.service.isBusy(graph)){this.schedule(graph.id);return this.status(sessionId,root);}
    try{await this.write(graph.id,true);}catch(e){this.errors.set(graph.id,e.message);throw new TreeError(e.message,409);}
    return this.status(sessionId,root);
  }
  async write(id,manual=false){
    if(this.disposed)return;
    const link=await this.link(id);if(!link?.enabled)return;
    if(this.writing.has(id))return;
    const graph=await this.service.storage.read(id);if(!graph)throw Error('找不到需要同步的树');
    if(this.service.isBusy(graph)){if(manual)throw new TreeError('请等待这棵树中的生成或上下文压缩完成后再同步',409);this.schedule(id);return;}
    this.writing.add(id);
    try{
      // Catch up completed rounds in every binding, including branches whose panel is closed.
      let changed=false;
      for(const sid of Object.keys(graph.bindings))changed=(await this.service.syncSessionTurns(graph,sid,undefined,false))||changed;
      if(changed){graph.revision++;graph.undo=[];graph.redo=[];await this.service.storage.save(graph);}
      const root=await projectRoot(link.root),mapping={...link.sessionMap},sources=new Map(),sessions=[];
      const sourceIds=new Set([graph.id,...Object.keys(graph.bindings),...Object.values(graph.nodes).filter(n=>n.source).map(n=>n.source.sessionId)]);
      if(sourceIds.size>1000)throw Error('一棵项目树最多同步 1000 个原生会话');
      for(const sid of sourceIds)if(!Object.values(mapping).includes(sid))mapping[sid]=sid;
      const inverse=Object.fromEntries(Object.entries(mapping).map(([portable,local])=>[local,portable]));
      const portable=mapGraph(graph,inverse),files=new Map(),assets=[],assetSeen=new Set();
      for(const sid of sourceIds){
        const data=await this.service.load(sid),pid=inverse[sid];sources.set(sid,data);
        const text=archiveSession(data,pid,root);files.set(`sessions/${pid}.jsonl`,text);sessions.push({id:pid,hash:digest(text)});
        for(const [key,a]of attachmentRefs(data.events))if(!assetSeen.has(key)){
          assetSeen.add(key);const store=this.ctx.get('attachments');if(!store)throw Error('当前 DSH 缺少附件服务，无法完整同步');
          let bytes;
          if(a.kind==='image')bytes=Buffer.from((await store.readImage(a.ref)).data);
          else{const chunks=[];let size=0;for await(const chunk of store.readFileStream(a.ref)){size+=chunk.length;if(size>256*1024*1024)throw Error('单个项目附件超过 256 MiB');chunks.push(chunk);}bytes=Buffer.concat(chunks);}
          const hash=digest(bytes);files.set(`assets/${hash}`,bytes);assets.push({key,kind:a.kind,ref:a.ref,hash,size:bytes.length});
        }
      }
      sessions.sort((a,b)=>a.id.localeCompare(b.id));assets.sort((a,b)=>a.key.localeCompare(b.key));
      const graphText=json(portable),transcript=markdownTree(portable,new Map([...sources].map(([sid,data])=>[inverse[sid],data])));files.set('tree.json',graphText);files.set('conversation.md',transcript);
      const manifest={format:PROJECT_FORMAT,version:1,id:link.treeId,title:graph.title,nodes:Object.keys(graph.nodes).length,graphHash:digest(graphText),transcriptHash:digest(transcript),sessions,assets};
      manifest.snapshot=digest(json(manifest));
      let logs=0,total=Buffer.byteLength(json(manifest));
      if(total>2*1024*1024)throw Error('项目清单超过 2 MiB');
      for(const [path,body]of files){
        const size=Buffer.byteLength(body);total+=size;
        if(path.startsWith('sessions/')){logs+=size;if(size>128*1024*1024)throw Error('单个会话日志超过 128 MiB');}
        if(path==='tree.json'&&size>32*1024*1024)throw Error('树文件超过 32 MiB');
        if(path==='conversation.md'&&size>128*1024*1024)throw Error('对话文档超过 128 MiB');
      }
      if(logs>512*1024*1024||total>1024*1024*1024)throw Error('项目记录超过大小限制，已保留原有版本');
      await writeArchive(root,link.treeId,files,manifest,link.snapshot);
      await this.saveLink(id,{...link,sessionMap:mapping,snapshot:manifest.snapshot});this.errors.delete(id);
    }finally{this.writing.delete(id);}
  }
  async import(sessionId,directory,treeId){
    const root=await projectRoot(directory),archive=await readArchive(root,treeId),portable=validateGraph(archive.graph);
    const assetMap=new Map(archive.manifest.assets.map(a=>[a.key,a]));
    return restoreTree(this.service,sessionId,{portable,sessions:archive.sessions,assetBytes:key=>assetMap.has(key)?archive.assets.get(assetMap.get(key).hash):undefined},root,
      (graph,mapping)=>this.saveLink(graph.id,{root,treeId,enabled:false,sessionMap:mapping,snapshot:archive.manifest.snapshot}));
  }
  dispose(){this.disposed=true;for(const timer of this.timers.values())clearTimeout(timer);this.timers.clear();}
}
