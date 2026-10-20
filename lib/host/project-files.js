import {mkdir,readFile,writeFile,realpath,lstat,readdir,rm} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {randomUUID} from 'node:crypto';
import {renameWithRetry} from './files.js';
import {PROJECT_FORMAT,digest,json,validId} from './project-format.js';

export async function projectRoot(path){
  if(typeof path!=='string'||!isAbsolute(path))throw Error('请选择项目的完整目录');
  const root=await realpath(path);if(!(await lstat(root)).isDirectory())throw Error('项目路径不是文件夹');return root;
}
function inside(root,path){const r=relative(root,path);if(!r||r.startsWith('..')||isAbsolute(r))throw Error('项目记录路径越界');return path;}
async function checked(root,parts,create=false){
  let current=root;
  for(let i=0;i<parts.length;i++){
    if(!parts[i]||parts[i]==='.'||parts[i]==='..'||/[\\/:]/.test(parts[i]))throw Error('项目记录包含非法路径');
    current=inside(root,join(current,parts[i]));
    if(create)await mkdir(current).catch(e=>{if(e.code!=='EEXIST')throw e;});
    const s=await lstat(current);if(s.isSymbolicLink()||(i<parts.length-1||create)&&!s.isDirectory())throw Error('项目记录不能使用符号链接或目录替代');
  }
  return current;
}
async function readBounded(root,parts,max){const file=await checked(root,parts);const s=await lstat(file);if(!s.isFile()||s.size>max)throw Error('项目记录文件过大或不是普通文件');return readFile(file);}
function archiveParts(id){if(!validId(id))throw Error('无效的项目树标识');return ['.tree-chat','trees',id];}
function validateManifest(m,id){
  if(m?.format!==PROJECT_FORMAT||m.version!==1||m.id!==id||!Array.isArray(m.sessions)||!Array.isArray(m.assets)||m.sessions.length>1000||m.assets.length>20000||typeof m.title!=='string'||m.title.length>200)throw Error('不支持的项目树清单');
  if(!/^[a-f0-9]{64}$/.test(m.graphHash)||!/^[a-f0-9]{64}$/.test(m.transcriptHash)||!/^[a-f0-9]{64}$/.test(m.snapshot))throw Error('项目树校验信息无效');
  if(digest(json({...m,snapshot:undefined}))!==m.snapshot)throw Error('项目清单校验不匹配，请处理 Git 冲突后重试');
  const ids=new Set();for(const s of m.sessions){if(!validId(s.id)||ids.has(s.id)||!/^[a-f0-9]{64}$/.test(s.hash))throw Error('项目会话索引无效');ids.add(s.id);}
  for(const a of m.assets)if(!['file','image'].includes(a.kind)||!a.ref?.attachmentId||!/^[a-f0-9]{64}$/.test(a.hash)||typeof a.key!=='string')throw Error('项目附件索引无效');
  return m;
}
export async function manifestAt(root,id){
  const text=await readBounded(root,[...archiveParts(id),'manifest.json'],2*1024*1024);return validateManifest(JSON.parse(text),id);
}
export async function listProjectTrees(root){
  let dir;try{dir=await checked(root,['.tree-chat','trees']);}catch(e){if(e.code==='ENOENT')return [];throw e;}
  const result=[];
  for(const name of await readdir(dir))if(validId(name)){
    try{const m=await manifestAt(root,name);result.push({id:m.id,title:m.title,nodes:m.nodes,sessions:m.sessions.length,snapshot:m.snapshot});}
    catch(e){result.push({id:name,title:name,error:e.message});}
  }
  return result;
}
export async function readArchive(root,id){
  const m=await manifestAt(root,id),parts=archiveParts(id);
  const graph=await readBounded(root,[...parts,'tree.json'],32*1024*1024);
  if(digest(graph)!==m.graphHash)throw Error('树文件与清单不同，请处理外部修改后重试');
  const transcript=await readBounded(root,[...parts,'conversation.md'],128*1024*1024);
  if(digest(transcript)!==m.transcriptHash)throw Error('对话文档已被外部修改，自动同步已暂停');
  const folder=await checked(root,parts);
  if((await readdir(folder)).some(name=>!['tree.json','manifest.json','conversation.md','sessions','assets'].includes(name)))throw Error('记录目录包含额外文件，请移出后再同步以免覆盖');
  for(const [dir,expected]of [['sessions',new Set(m.sessions.map(s=>s.id+'.jsonl'))],['assets',new Set(m.assets.map(a=>a.hash))]]){
    let path;try{path=await checked(root,[...parts,dir]);}catch(e){if(e.code==='ENOENT'&&!expected.size)continue;throw e;}
    if((await readdir(path)).some(name=>!expected.has(name)))throw Error('记录目录存在未登记文件，请移出后再同步');
  }
  const sessions=new Map();let total=graph.length+transcript.length;
  for(const s of m.sessions){const b=await readBounded(root,[...parts,'sessions',s.id+'.jsonl'],128*1024*1024);total+=b.length;if(total>512*1024*1024)throw Error('项目对话记录超过 512 MiB');if(digest(b)!==s.hash)throw Error(`会话 ${s.id} 校验失败`);sessions.set(s.id,b.toString('utf8'));}
  const assets=new Map();
  for(const a of m.assets){if(assets.has(a.hash))continue;const b=await readBounded(root,[...parts,'assets',a.hash],256*1024*1024);total+=b.length;if(total>1024*1024*1024)throw Error('项目记录总大小超过 1 GiB');if(digest(b)!==a.hash)throw Error('项目附件校验失败');assets.set(a.hash,b);}
  if((await manifestAt(root,id)).snapshot!==m.snapshot)throw Error('项目记录读取过程中发生变化，请重试');
  return {manifest:m,graph:JSON.parse(graph),sessions,assets};
}
/** Directory replacement publishes one coherent tree. Only our owned staging directory is removed. */
export async function writeArchive(root,id,files,manifest,expected){
  const base=await checked(root,['.tree-chat'],true);
  const stageBase=await checked(root,['.tree-chat','.staging'],true),lockBase=await checked(root,['.tree-chat','.locks'],true);
  const trees=await checked(root,['.tree-chat','trees'],true),target=inside(trees,join(trees,id));archiveParts(id);
  const lock=inside(lockBase,join(lockBase,id));
  try{await mkdir(lock);}catch(e){if(e.code==='EEXIST')throw Error('另一个进程正在同步这棵树；如异常退出，请确认无同步进程后清理 .tree-chat/.locks 中对应目录');throw e;}
  const stage=inside(stageBase,join(stageBase,randomUUID()));await mkdir(stage);
  let moved=false,published=false;
  try{
    let current;try{current=await manifestAt(root,id);}catch(e){if(e.code!=='ENOENT')throw e;}
    if((current?.snapshot??null)!==(expected??null))throw Error('项目记录已被外部修改，自动同步已暂停；请读取项目版本或另存为副本');
    if(current)await readArchive(root,id);
    if(current?.snapshot===manifest.snapshot)return false;
    for(const [path,body]of files){const parts=path.split('/');if(parts.length>1)await checked(stage,parts.slice(0,-1),true);const dest=inside(stage,join(stage,...parts));await writeFile(dest,body,{flag:'wx'});}
    await writeFile(join(stage,'manifest.json'),json(manifest),{flag:'wx'});
    if(current){await checked(root,archiveParts(id));await renameWithRetry(target,join(stageBase,`${id}-${stage.split(/[\\/]/).at(-1)}-old`));moved=true;}
    try{await renameWithRetry(stage,target);published=true;}
    catch(e){if(moved)await renameWithRetry(join(stageBase,`${id}-${stage.split(/[\\/]/).at(-1)}-old`),target);throw e;}
    // Keep transaction internals out of Git without changing the project's .gitignore.
    const ignore=join(base,'.gitignore');try{await writeFile(ignore,'.staging/\n.locks/\n',{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
    return true;
  }finally{
    if(!published)await rm(inside(stageBase,stage),{recursive:true,force:true});
    if(moved&&published)await rm(inside(stageBase,join(stageBase,`${id}-${stage.split(/[\\/]/).at(-1)}-old`)),{recursive:true,force:true});
    await rm(inside(lockBase,lock),{recursive:true,force:true});
  }
}
