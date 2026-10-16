// Integration test for the exact PluginManager API used by DSH's Plugins page.
// This fixture is excluded from distributable files.
import {writeFile, readFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pluginRoot, resolveArtifactsDir} from './_env.mjs';

export const inject=['pluginManager'];
export function apply(ctx){
  ctx.effect(()=>{
    const timer=setTimeout(async()=>{
      const result={};
      const artifactsDir = resolveArtifactsDir();
      try{
        const {version} = JSON.parse(await readFile(join(pluginRoot, 'package.json'), 'utf8'));
        const tgzPath = join(pluginRoot, 'dist', `tree-chat-${version}.tgz`);
        result.inspect=await ctx.pluginManager.inspect(tgzPath);
        result.install=await ctx.pluginManager.installBundle(tgzPath,{enabled:true,requestId:'tree-standard-install-test'});
        result.bundles=(await ctx.pluginManager.listBundles()).filter(p=>p.name==='tree-chat');
      }catch(error){result.error={message:error.message,stack:error.stack};}
      await mkdir(artifactsDir, {recursive: true});
      await writeFile(join(artifactsDir, 'standard-install-result.json'),JSON.stringify(result,null,2));
      console.log('TREE_STANDARD_INSTALL_RESULT',JSON.stringify(result));
    },1000);
    return()=>clearTimeout(timer);
  });
}
