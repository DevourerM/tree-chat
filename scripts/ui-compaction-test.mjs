import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {launchBrowser,resolveArtifactsDir} from './_env.mjs';
const browser=await launchBrowser(),artifacts=resolveArtifactsDir();let page;
try{
  page=await browser.newPage({viewport:{width:1480,height:1000}});page.setDefaultTimeout(20000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const root=page.locator('.st-root:visible'),node=label=>root.locator('.st-node-body').and(root.getByRole('button',{name:label,exact:true}));
  const response=action=>page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action===action);
  const api=input=>page.evaluate(async input=>{const send=window.__DSH_TRANSPORT__?.fetch??window.fetch.bind(window);const r=await send('/api/conversation-tree',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});const value=await r.json();if(!r.ok)throw Error(JSON.stringify(value));return value;},input);
  const editor=()=>page.locator('[contenteditable=true]:visible').last();
  const atSession=id=>page.waitForFunction(id=>[...document.querySelectorAll('.st-root')].some(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden'&&e.dataset.sessionId===id&&e.getAttribute('aria-busy')==='false'),id);
  async function branch(label,text){
    await node(label).click();const [r]=await Promise.all([response('branch'),root.getByRole('button',{name:'新建分支',exact:true}).click()]);const result=await r.json();assert.ok(result.sessionId,JSON.stringify(result));await atSession(result.sessionId);
    await root.locator('.st-pending.st-current').waitFor();await editor().fill(text);await editor().press('Enter');await node(text).waitFor();
    return {...result,request:JSON.parse(await readFile(join(artifacts,'last-model-request.json'),'utf8'))};
  }
  await page.goto(process.argv[2],{waitUntil:'networkidle'});const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();await page.getByRole('button',{name:'打开 tree-chat'}).click();await node('问题 4').waitFor();
  // Execute the real native command, using only the fixture's local model adapter.
  await editor().fill('/compact');await editor().press('Enter');await node('上下文压缩').waitFor({timeout:40000});
  let graph=await api({action:'get',sessionId:'session-tree-demo'}),checkpoint=Object.values(graph.nodes).find(n=>n.kind==='compaction');assert.ok(checkpoint);
  assert.equal(await root.locator('.st-compaction').count(),1);
  const locating=response('locate');await node('上下文压缩').dblclick();await locating;await page.locator('[data-tree-chat-landing]').waitFor();
  assert.match(await page.locator('[data-tree-chat-landing]').getAttribute('data-chat-flow-kind'),/compaction/);
  const after=await branch('上下文压缩','问题 摘要分支');assert.ok(after.request.messages.some(m=>m.source?.kind==='compact-checkpoint'));
  assert.ok(after.request.users.length<5,'summary must replace original user turns');
  const bundle=await api({action:'export',sessionId:after.sessionId}),file=join(artifacts,'compaction-conversation.json');await writeFile(file,JSON.stringify(bundle));
  const [importResponse]=await Promise.all([response('import'),root.locator('input[type=file]').setInputFiles(file)]);const imported=await importResponse.json();assert.ok(imported.sessionId,JSON.stringify(imported));await atSession(imported.sessionId);
  checkpoint=Object.values(imported.graph.nodes).find(n=>n.kind==='compaction');assert.ok(checkpoint);
  await editor().fill('问题 导入压缩记录后继续');await editor().press('Enter');await node('问题 导入压缩记录后继续').waitFor();
  const importedRequest=JSON.parse(await readFile(join(artifacts,'last-model-request.json'),'utf8'));assert.ok(importedRequest.messages.some(m=>m.source?.kind==='compact-checkpoint'));
  for(let n=1;n<=4;n++)if(!after.request.users.includes(`问题 ${n}`))assert.ok(!importedRequest.users.includes(`问题 ${n}`));
  const before=await branch('问题 4','问题 原文分支');assert.ok(!before.request.messages.some(m=>m.source?.kind==='compact-checkpoint'));
  for(let n=1;n<=4;n++)assert.ok(before.request.users.includes(`问题 ${n}`));
  await node('问题 1').click({button:'right'});await root.getByRole('menuitem',{name:'删除节点…',exact:true}).click();
  const [activation]=await Promise.all([response('activate'),root.getByRole('button',{name:'删除并保留后续',exact:true}).click()]);const reconnected=await activation.json();assert.ok(reconnected.sessionId,JSON.stringify(reconnected));await atSession(reconnected.sessionId);
  await root.locator('.st-compaction-stale').waitFor();
  const oldLocation=response('locate');await node('上下文压缩').dblclick();const old=await(await oldLocation).json();await atSession(old.sessionId);
  const [applied]=await Promise.all([response('activate'),root.getByRole('button',{name:'应用当前路径',exact:true}).click()]);const appliedContext=await applied.json();await atSession(appliedContext.sessionId);
  await editor().fill('问题 应用当前路径');await editor().press('Enter');await node('问题 应用当前路径').waitFor();
  const appliedRequest=JSON.parse(await readFile(join(artifacts,'last-model-request.json'),'utf8'));assert.ok(!appliedRequest.users.includes('问题 1'));assert.ok(!appliedRequest.messages.some(m=>m.source?.kind==='compact-checkpoint'));
  const changed=await branch('上下文压缩','问题 修改历史后继续');assert.ok(!changed.request.users.includes('问题 1'));assert.ok(!changed.request.messages.some(m=>m.source?.kind==='compact-checkpoint'),'invalidated summaries never restore deleted text');
  await node('上下文压缩').click({button:'right'});const [removed]=await Promise.all([response('activate'),root.getByRole('menuitem',{name:'移除压缩，使用原文',exact:true}).click()]);const raw=await removed.json();await atSession(raw.sessionId);await root.locator('.st-compaction').waitFor({state:'detached'});
  graph=await api({action:'get',sessionId:raw.sessionId});assert.ok(!graph.nodes[checkpoint.id]);
  await page.reload({waitUntil:'networkidle'});if(!await root.count())await page.getByRole('button',{name:'打开 tree-chat'}).click();await node('问题 4').waitFor();assert.equal(await root.locator('.st-compaction').count(),0,'deleted checkpoints do not reappear on reload');
  await page.emulateMedia({colorScheme:'dark'});await page.screenshot({path:join(artifacts,'tree-chat-compaction.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: real /compact node, native summary navigation, raw/summary branching, full file import and continuation, stale summary invalidation, guarded native context apply, checkpoint removal and reload.');
}catch(error){await page?.screenshot({path:join(artifacts,'compaction-failure.png'),fullPage:true});await writeFile(join(artifacts,'compaction-failure-state.txt'),await page?.locator('body').innerText()??'');throw error;}finally{await browser.close();}
