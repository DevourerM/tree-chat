import {writeFile,unlink,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {launchBrowser, resolveArtifactsDir, resolveTestHome} from './_env.mjs';

const artifactsDir = resolveArtifactsDir();
const home = resolveTestHome('test-home-v4');
await unlink(join(home, 'plugins/conversation-tree/graphs/session-tree-demo.json')).catch(e=>{if(e.code!=='ENOENT')throw e;});

const browser = await launchBrowser();
try {
  const page=await browser.newPage({viewport:{width:1480,height:980}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',async r=>{if(r.status()>=400)console.log('HTTP failure:',r.status(),r.url(),(await r.text().catch(()=>'(response closed)')).slice(0,500));});
  await page.goto(process.argv[2],{waitUntil:'networkidle'});
  const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();
  await page.getByRole('button',{name:'打开 tree-chat'}).click();
  const root = page.locator('.st-root:visible');
  const waitNodes = n => page.waitForFunction(count => {
    const r = [...document.querySelectorAll('.st-root')].find(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
    return r && r.querySelectorAll('.st-node').length === count;
  }, n);
  await root.waitFor();
  await waitNodes(5);
  await page.screenshot({path:join(artifactsDir,'host-initial.png'),fullPage:true});
  await root.locator('.st-node-body').filter({hasText:'问题 2'}).click();
  await root.getByRole('button',{name:'节点操作',exact:true}).click();
  await root.getByRole('menuitem',{name:'删除节点…',exact:true}).click();
  const activated=page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action==='activate');
  await root.getByRole('button',{name:'删除并保留后续',exact:true}).click();
  const response=await activated, result=await response.json();assert.ok(response.ok(),JSON.stringify(result));
  assert.equal(result.graph.bindings['session-tree-demo'].autoArchived,true,'root session must also be auto-archived when switching to active branch');
  assert.equal(result.graph.bindings[result.sessionId].autoArchived,false);
  console.log('Applied context to',result.sessionId);
  await waitNodes(4);
  await root.locator('.st-canvas').waitFor();
  await page.locator('[contenteditable=true]:visible').last().fill('验证当前上下文');
  await page.locator('[contenteditable=true]:visible').last().press('Enter');
  await page.getByText('上下文验证：问题 1 → 问题 3 → 问题 4',{exact:true}).first().waitFor({timeout:20000});
  const request=JSON.parse(await readFile(join(artifactsDir,'last-model-request.json'),'utf8'));
  assert.ok(!request.users.includes('问题 2'));assert.ok(request.users.includes('问题 3'));
  console.log('PASS: native chat model received 1-3-4 without 2');
  await waitNodes(5);
  await page.screenshot({path:join(artifactsDir,'host-reconnected.png'),fullPage:true});
  await root.locator('.st-node-body').filter({hasText:'问题 1'}).click();
  const branchResponse=page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action==='branch');
  await root.getByRole('button',{name:'节点操作',exact:true}).click();await root.getByRole('menuitem',{name:'新建分支',exact:true}).click();
  const branch=await(await branchResponse).json();assert.ok(branch.sessionId,JSON.stringify(branch));
  assert.equal(branch.graph.bindings['session-tree-demo'].autoArchived,true);
  assert.equal(branch.graph.bindings[result.sessionId].autoArchived,true);
  assert.equal(branch.graph.bindings[branch.sessionId].autoArchived,false);
  await root.locator('.st-pending.st-current .st-node-title').filter({hasText:'输入新消息…'}).waitFor();
  await page.locator('[contenteditable=true]:visible').last().fill('分枝验证');await page.locator('[contenteditable=true]:visible').last().press('Enter');
  await page.getByText('上下文验证：问题 1',{exact:true}).first().waitFor({timeout:20000});
  await waitNodes(6);
  assert.equal(await root.locator('.st-pending').count(),0);
  const branchRequest=JSON.parse(await readFile(join(artifactsDir,'last-model-request.json'),'utf8'));
  assert.ok(branchRequest.users.includes('问题 1'));assert.ok(!branchRequest.users.includes('问题 3'));
  await page.screenshot({path:join(artifactsDir,'host-branched.png'),fullPage:true});
  console.log('PASS: branch from node 1 grew independently; previous branch and root shelved (single sidebar entry)');
  await page.emulateMedia({colorScheme:'dark'});
  await page.screenshot({path:join(artifactsDir,'host-dark.png'),fullPage:true});
  await writeFile(join(artifactsDir,'browser-state.txt'),await page.locator('body').innerText());
  assert.equal(errors.length, 0, JSON.stringify(errors));
} finally {
  await browser.close();
}
