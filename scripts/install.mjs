import {readFile,writeFile,mkdir,cp,stat,lstat} from 'node:fs/promises';
import {renameWithRetry as rename} from '../src/host/files.js';
import {openSync,readSync,closeSync,existsSync} from 'node:fs';
import {resolve,join,relative,isAbsolute,dirname} from 'node:path';
import {homedir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
const NAME='tree-chat';
const LEGACY_NAME='dsh-conversation-tree';
const args=process.argv.slice(2);
const value=(flag,fallback)=>args.includes(flag)?args[args.indexOf(flag)+1]:fallback;
const source=resolve(import.meta.dirname,'..');
const dshHome=resolve(value('--home',process.env.DSH_HOME?.trim()||join(homedir(),'.dsh')));
const profile=join(dshHome,'profiles','desktop');
const appArg=value('--app',process.env.DSH_APP_DIR?.trim()||'');
const app=appArg?resolve(appArg):null;
const manifestPath=join(profile,'package.json'), modules=join(profile,'node_modules'), target=join(modules,NAME);
const stateDir=join(profile,'.tree-chat-install'), statePath=join(stateDir,'state.json');
function assertInside(root,path){const rel=relative(resolve(root),resolve(path));if(!rel||rel.startsWith('..')||isAbsolute(rel))throw new Error(`路径不在预期目录中：${path}`);}
assertInside(modules,target);
function bundledJson(path){
  if(!app||!existsSync(join(app,'resources','app.asar')))return {version:'0.2.0-rc.2'};
  const fd=openSync(join(app,'resources','app.asar'),'r');
  try{
    const prefix=Buffer.alloc(16);readSync(fd,prefix,0,16,0);
    const data=Buffer.alloc(prefix.readUInt32LE(12));readSync(fd,data,0,data.length,16);
    let entry=JSON.parse(data);for(const part of path.split('/'))entry=entry.files[part];
    const body=Buffer.alloc(entry.size);readSync(fd,body,0,body.length,8+prefix.readUInt32LE(4)+Number(entry.offset));return JSON.parse(body);
  }finally{closeSync(fd);}
}
async function atomic(path,text){await mkdir(dirname(path),{recursive:true});const temp=`${path}.${randomUUID()}.tmp`;await writeFile(temp,text);await rename(temp,path);}
const original=await readFile(manifestPath,'utf8'), manifest=JSON.parse(original);
if(!Array.isArray(manifest.dsh?.profile?.bundles))throw new Error('目标不是有效的 DSH Desktop profile');
const build=JSON.parse(await readFile(join(source,'package.json'),'utf8'));
if(args.includes('--uninstall')){
  const state=JSON.parse(await readFile(statePath,'utf8'));
  if(!state.hadBundle)manifest.dsh.profile.bundles=manifest.dsh.profile.bundles.filter(n=>n!==NAME);
  if(manifest.dependencies?.[NAME]===state.spec){if(state.originalDependency===null)delete manifest.dependencies[NAME];else manifest.dependencies[NAME]=state.originalDependency;}
  if(!args.includes('--check')){
    const backup=join(stateDir,'backups',`uninstall-${Date.now()}`);await mkdir(backup,{recursive:true});await writeFile(join(backup,'package.json'),original);
    await atomic(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  }
  console.log('tree-chat已从 Desktop 插件组合中移除。图数据、原始对话和插件文件均保留。重启 DSH 生效。');
}else{
  const runtime=bundledJson('package.json');
  if(!['0.2.0-rc.2','0.2.1-rc.2','0.2.1-rc.3'].includes(runtime.version))throw new Error(`此版本尚未验证：DSH ${runtime.version}。请先运行兼容测试后升级插件。`);
  await stat(join(source,'lib','index.js'));await stat(join(source,'lib','client.js'));
  const spec='file:'+source.replaceAll('\\','/');
  let state;try{state=JSON.parse(await readFile(statePath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  state??={originalDependency:manifest.dependencies?.[NAME]??null,hadBundle:manifest.dsh.profile.bundles.includes(NAME),legacyDependency:manifest.dependencies?.[LEGACY_NAME]??null,legacyHadBundle:manifest.dsh.profile.bundles.includes(LEGACY_NAME)};
  manifest.dsh.profile.bundles=manifest.dsh.profile.bundles.filter(n=>n!==LEGACY_NAME);
  if(manifest.dependencies)delete manifest.dependencies[LEGACY_NAME];
  manifest.dependencies??={};manifest.dependencies[NAME]=spec;
  if(!manifest.dsh.profile.bundles.includes(NAME))manifest.dsh.profile.bundles.push(NAME);
  console.log(JSON.stringify({plugin:NAME,version:build.version,dshVersion:runtime.version,profile,target,bundle:NAME,source},null,2));
  if(!args.includes('--check')){
    if(args.includes('--no-backup')){
      try{if((await lstat(target)).isSymbolicLink())throw new Error('已有插件目录是链接，请用 DSH 插件管理器更新。');}catch(e){if(e.code!=='ENOENT')throw e;}
      await mkdir(target,{recursive:true});
      for(const file of ['lib','assets','locale','package.json','cordis.patch.yml','README.md','LICENSE'])await cp(join(source,file),join(target,file),{recursive:true});
      await atomic(manifestPath,JSON.stringify(manifest,null,2)+'\n');
      const {backup,...previous}=state;
      await atomic(statePath,JSON.stringify({...previous,spec,version:build.version,installedAt:new Date().toISOString(),clientHash:createHash('sha256').update(await readFile(join(target,'lib/client.js'))).digest('hex')},null,2)+'\n');
      console.log('已直接更新 tree-chat，未创建额外备份。重启 DSH 生效。');
      process.exit(0);
    }
    const stamp=Date.now(),backup=join(stateDir,'backups',String(stamp));await mkdir(backup,{recursive:true});
    await writeFile(join(backup,'package.json'),original);
    const stage=join(modules,`.tree-stage-${randomUUID()}`);assertInside(modules,stage);await mkdir(stage,{recursive:true});
    for(const file of ['lib','assets','locale','package.json','cordis.patch.yml','README.md','LICENSE'])await cp(join(source,file),join(stage,file),{recursive:true});
    let prior=false;
    try{const info=await lstat(target);if(info.isSymbolicLink())throw new Error('已有插件目录是链接，安装器不会覆盖；请用 DSH 插件管理器更新。');prior=true;}
    catch(e){if(e.code!=='ENOENT')throw e;}
    const priorPath=join(backup,'plugin');assertInside(backup,priorPath);
    if(prior)await rename(target,priorPath);
    try{
      await rename(stage,target);
      await atomic(manifestPath,JSON.stringify(manifest,null,2)+'\n');
      await atomic(statePath,JSON.stringify({...state,spec,version:build.version,installedAt:new Date().toISOString(),backup,clientHash:createHash('sha256').update(await readFile(join(target,'lib/client.js'))).digest('hex')},null,2)+'\n');
    }catch(e){
      const failed=join(backup,'failed-install');assertInside(backup,failed);
      try{await rename(target,failed);}catch{}
      if(prior)await rename(priorPath,target);
      await atomic(manifestPath,original);throw e;
    }
    console.log('安装完成。未修改 app.asar 或 cordis.patch.yml。重启 DSH 后在对话页头点击“tree-chat”。');
    console.log('备份：'+backup);
  }
}
