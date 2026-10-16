import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pluginRoot, resolveArtifactsDir} from './_env.mjs';

const gui=process.argv.includes('--gui');
const artifactsDir = resolveArtifactsDir();
const profile=resolve(process.env.TREE_GUI_TEST_HOME?join(process.env.TREE_GUI_TEST_HOME,'profiles/web'):join(artifactsDir,gui?'gui-install-home-v3/profiles/web':'standard-install-home/profiles/web'));
await mkdir(profile,{recursive:true});
await writeFile(join(profile,'package.json'),JSON.stringify({name:'tree-standard-install-test',private:true,dependencies:{},dsh:{profile:{bundles:['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app']}}},null,2));
await writeFile(join(profile,'pnpm-workspace.yaml'),'packages:\n  - .\nnodeLinker: hoisted\nautoInstallPeers: false\n');
await writeFile(join(profile,'cordis.patch.yml'),'- id: locale\n  config:\n    preference: zh\n'+(gui?'':'- insert:\n    - id: tree-standard-install-probe\n      name: '+JSON.stringify(join(pluginRoot,'scripts/dev-plugin-install-probe.mjs').replaceAll('\\','/'))+'\n'));
console.log(profile);
