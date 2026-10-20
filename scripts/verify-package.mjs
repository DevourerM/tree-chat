import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..'), destination=join(root,'dist');
await mkdir(destination,{recursive:true});
const npm=process.env.npm_execpath || join(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const packed=JSON.parse(execFileSync(process.execPath,[npm,'pack','--ignore-scripts','--json','--pack-destination',destination],{cwd:root,encoding:'utf8'}))[0];
const file=join(destination,packed.filename),tar=gunzipSync(await readFile(file)),files=new Map();
for(let offset=0;offset+512<=tar.length;){
  const header=tar.subarray(offset,offset+512);if(header.every(n=>n===0))break;
  const name=header.subarray(0,100).toString().replace(/\0.*$/s,'');
  const size=parseInt(header.subarray(124,136).toString().replace(/\0.*$/s,'').trim(),8)||0;
  files.set(name,tar.subarray(offset+512,offset+512+size));offset+=512+Math.ceil(size/512)*512;
}
for(const name of ['package.json','lib/index.js','lib/client.js','lib/host/index.js','lib/host/permissions.js','lib/core/graph.js','lib/core/presentation.js','lib/core/branches.js','lib/core/layout.js','lib/core/groups.js','lib/core/group-state.js','cordis.patch.yml','assets/tree.svg','locale/en.json','locale/zh.json','README.md','LICENSE'])assert.ok(files.has('package/'+name),`缺少 ${name}`);
const manifest=JSON.parse(files.get('package/package.json'));
for(const name of ['project-files','project-format','project-sync'])assert.ok(files.has(`package/lib/host/${name}.js`),`缺少项目同步运行文件 ${name}`);
assert.equal(manifest.dsh.bundle.patch,'./cordis.patch.yml');assert.equal(manifest.exports['./client'],'./lib/client.js');
assert.equal(manifest.exports['./locale/*.json'],'./locale/*.json');
assert.ok(files.get('package/lib/client.js').toString().includes('window.__ModuleLoader__.load'));
assert.equal(manifest.scripts?.install,undefined);assert.equal(manifest.scripts?.postinstall,undefined);
assert.ok([...files.keys()].every(n=>!/(research|artifacts|node_modules|\.git)\//.test(n)));
for(const [name,body]of files)if(name.startsWith('package/lib/'))assert.ok(!/[A-Z]:[\\/](?:Users|ai_dev|code)/.test(body.toString()),`运行文件包含本机路径：${name}`);
await writeFile(join(destination,'checksums.json'),JSON.stringify({file:packed.filename,version:manifest.version,shasum:packed.shasum,integrity:packed.integrity,size:packed.size,files:files.size},null,2)+'\n');
console.log(`PASS: 标准 DSH bundle/client、元数据、完整运行文件、无安装脚本及本机运行路径。\n${file}`);
