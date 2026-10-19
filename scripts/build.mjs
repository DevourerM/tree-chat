import {mkdir, readFile, writeFile, cp} from 'node:fs/promises';
import {resolve, join} from 'node:path';
const root = resolve(import.meta.dirname, '..');
await mkdir(join(root, 'lib'), {recursive: true});
await cp(join(root, 'src/core'), join(root, 'lib/core'), {recursive: true});
await cp(join(root, 'src/host'), join(root, 'lib/host'), {recursive: true});
await writeFile(join(root, 'lib/index.js'), "export {apply, inject} from './host/index.js';\n");
const client = await readFile(join(root, 'src/client/index.js'), 'utf8');
const branches = (await readFile(join(root, 'src/core/branches.js'),'utf8')).replace(/^export /gm,'');
const layout = (await readFile(join(root, 'src/core/layout.js'),'utf8')).replace(/^export /gm,'');
const presentation = (await readFile(join(root, 'src/core/presentation.js'),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const navigation = (await readFile(join(root, 'src/client/navigation.js'),'utf8')).replace(/^export /gm,'');
const css = await readFile(join(root, 'src/client/style.css'), 'utf8');
// Host supplies React through the official singleton module loader.
await writeFile(join(root, 'lib/client.js'), `window.__ModuleLoader__.load({id:'tree-chat',factory:(require)=>{\nconst React=require('react');\nconst CSS=${JSON.stringify(css)};\n${branches}\n${layout}\n${presentation}\n${navigation}\n${client}\nreturn {apply,inject};\n}});\n`);
console.log('Built host and native DSH client plugin.');
