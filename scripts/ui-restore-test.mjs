import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {launchBrowser, resolveArtifactsDir} from './_env.mjs';

const artifactsDir = resolveArtifactsDir();
const browser = await launchBrowser();
try{
  const page=await browser.newPage({viewport:{width:1480,height:980}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2],{waitUntil:'networkidle'});const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();await page.getByRole('button',{name:'打开 tree-chat'}).click();await page.waitForFunction(n=>document.querySelectorAll('.st-node').length===n,6);
  const targetNode = page.locator('.st-node-body').filter({hasText:'验证当前上下文'});
  await targetNode.click({button:'right'});
  await page.getByRole('menu',{name:'节点菜单'}).waitFor();
  const resumeItem = page.getByRole('menuitem',{name:'继续这条分支',exact:true});
  if (await resumeItem.count()) {
    const activated=page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action==='activate');
    await resumeItem.click();
    const result=await(await activated).json();assert.ok(result.sessionId,JSON.stringify(result));
  } else {
    await page.keyboard.press('Escape');
  }
  await page.locator('.st-current .st-node-title').filter({hasText:'验证当前上下文'}).waitFor();
  await page.locator('[contenteditable=true]').last().fill('问题 重启恢复验证');await page.locator('[contenteditable=true]').last().press('Enter');
  await page.waitForFunction(n=>document.querySelectorAll('.st-node').length===n,7);
  const request=JSON.parse(await readFile(join(artifactsDir,'last-model-request.json'),'utf8'));assert.ok(request.users.includes('问题 3'));assert.ok(!request.users.includes('问题 2'));
  await page.screenshot({path:join(artifactsDir,'host-restored.png'),fullPage:true});assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS: complete Host restart; archived branch restored; native model receives 1-3-4; new node persists');
}finally{await browser.close();}
