import {mkdir,mkdtemp,readFile,writeFile,readdir,cp,stat} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {launchBrowser,resolveArtifactsDir} from './_env.mjs';
const artifacts=resolveArtifactsDir();await mkdir(artifacts,{recursive:true});
const project=await mkdtemp(join(artifacts,'project-ui-source-')),clone=await mkdtemp(join(artifacts,'project-ui-clone-'));
const browser=await launchBrowser();let page;
try{
  page=await browser.newPage({viewport:{width:1480,height:980}});page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const root=page.locator('.st-root:visible'),dialog=root.getByRole('dialog',{name:'项目同步',exact:true});
  const node=name=>root.locator('.st-node-body').and(root.getByRole('button',{name,exact:true}));
  let releaseInitial,holdInitial=true;
  const initialGate=new Promise(resolve=>releaseInitial=resolve);
  await page.route('**/api/conversation-tree',async route=>{const data=route.request().postDataJSON();if(holdInitial&&data?.action==='project-status'&&!data.directory){holdInitial=false;await initialGate;}await route.continue();});
  const response=action=>page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action===action);
  async function clickAPI(action,fn){const pending=response(action);await fn();const r=await pending;assert.ok(r.ok(),await r.text());return r.json();}
  async function inspect(path){const field=dialog.getByRole('textbox',{name:'项目目录',exact:true});await field.fill(path);assert.equal(await field.inputValue(),path);return clickAPI('project-status',()=>dialog.getByRole('button',{name:'读取',exact:true}).click());}
  async function waitFile(path,predicate){for(let i=0;i<40;i++){try{const value=await readFile(path,'utf8');if(predicate(value))return value;}catch(e){if(e.code!=='ENOENT')throw e;}await page.waitForTimeout(200);}throw Error('project sync did not update '+path);}
  await page.goto(process.argv[2],{waitUntil:'networkidle'});const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();await page.getByRole('button',{name:'打开 tree-chat'}).click();await node('问题 4').waitFor();
  await assert.rejects(stat(join(project,'.tree-chat')),e=>e.code==='ENOENT');
  await node('问题 2').click();await node('问题 3').click({modifiers:['Shift']});await root.getByRole('button',{name:'合并为集合',exact:true}).click();await root.getByRole('textbox',{name:'集合名称',exact:true}).fill('项目中的集合');
  await clickAPI('edit',()=>root.getByRole('button',{name:'合并',exact:true}).click());
  await root.getByRole('button',{name:'项目同步',exact:true}).click();await dialog.waitFor();
  assert.ok(await dialog.getByRole('textbox',{name:'项目目录',exact:true}).isDisabled(),'initial status must finish before editing the directory');
  assert.ok(await dialog.getByRole('button',{name:'读取',exact:true}).isDisabled());
  assert.ok(await dialog.getByRole('button',{name:'关闭项目同步',exact:true}).isEnabled(),'loading does not trap the user in the dialog');
  releaseInitial();await inspect(project);
  const state=await clickAPI('project-set',()=>dialog.getByRole('button',{name:'开启同步',exact:true}).click());const treeId=state.treeId;
  await dialog.getByRole('button',{name:'停止同步',exact:true}).waitFor();await dialog.getByRole('button',{name:'关闭项目同步',exact:true}).click();
  const treeFile=join(project,'.tree-chat/trees',treeId,'tree.json');assert.equal(JSON.parse(await readFile(treeFile,'utf8')).id,'session-tree-demo');
  await node('问题 4').click({button:'right'});await root.getByRole('menuitem',{name:'重命名节点',exact:true}).click();await root.getByRole('textbox',{name:'节点名称',exact:true}).fill('项目记录已更新');await clickAPI('edit',()=>root.getByRole('button',{name:'保存',exact:true}).click());
  await waitFile(treeFile,s=>s.includes('项目记录已更新'));
  await root.getByRole('button',{name:'项目同步',exact:true}).click();await dialog.getByRole('button',{name:'停止同步',exact:true}).waitFor();await clickAPI('project-set',()=>dialog.getByRole('button',{name:'停止同步',exact:true}).click());
  await cp(join(project,'.tree-chat'),join(clone,'.tree-chat'),{recursive:true});await inspect(clone);
  await dialog.getByRole('combobox',{name:'项目中的对话树',exact:true}).selectOption(treeId);
  const restored=await clickAPI('project-read',()=>dialog.getByRole('button',{name:'读取为新对话',exact:true}).click());assert.notEqual(restored.graph.id,'session-tree-demo');
  await node('项目记录已更新').waitFor();assert.equal(await root.locator('.st-group').count(),1);
  const prompt=page.locator('[contenteditable=true][role=textbox]:visible');await prompt.fill('问题 从项目迁移后继续');await prompt.press('Enter');await node('问题 从项目迁移后继续').waitFor({timeout:30000});
  const request=JSON.parse(await readFile(join(artifacts,'last-model-request.json'),'utf8'));for(const text of ['问题 1','问题 2','问题 3','问题 4','问题 从项目迁移后继续'])assert.ok(request.users.some(value=>value.startsWith(text)),text);
  if(process.env.TREE_MEDIA_FIXTURE){const manifest=JSON.parse(await readFile(join(clone,'.tree-chat/trees',treeId,'manifest.json'),'utf8'));assert.equal(manifest.assets.length,2);assert.ok(request.messages.some(m=>m.content?.some(b=>b.type==='image')),'image must survive migration into a real native model request');}
  await root.getByRole('button',{name:'项目同步',exact:true}).click();await dialog.getByRole('button',{name:'开启同步',exact:true}).waitFor();
  await clickAPI('project-set',()=>dialog.getByRole('button',{name:'开启同步',exact:true}).click());
  const cloneFile=join(clone,'.tree-chat/trees',treeId,'tree.json');await waitFile(cloneFile,s=>s.includes('问题 从项目迁移后继续'));assert.equal((await readdir(join(clone,'.tree-chat/trees'))).length,1);
  await writeFile(cloneFile,'external Git change');
  const failed=response('project-set');await dialog.getByRole('button',{name:'立即同步',exact:true}).click();assert.equal((await failed).status(),409);await dialog.getByRole('alert').waitFor();assert.equal(await readFile(cloneFile,'utf8'),'external Git change');
  await page.screenshot({path:join(artifacts,'tree-chat-project-sync.png'),fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS: opt-in project export, automatic update, stop, copied-project import with collections, native continuation with full context, same-record resync and external-change protection.');
}catch(e){await page?.screenshot({path:join(artifacts,'project-sync-failure.png'),fullPage:true});throw e;}finally{await browser.close();}
