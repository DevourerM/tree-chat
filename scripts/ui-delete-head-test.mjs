import assert from 'node:assert/strict';
import {launchBrowser} from './_env.mjs';

const browser = await launchBrowser();
try {
  const page=await browser.newPage({viewport:{width:1480,height:980}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.goto(process.argv[2],{waitUntil:'networkidle'});
  const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();await page.getByRole('button',{name:'打开 tree-chat'}).click();
  await page.getByRole('button',{name:'重启恢复验证',exact:true}).click({button:'right'});
  await page.getByRole('menu',{name:'节点菜单'}).waitFor();
  const continueItem = page.getByRole('menuitem',{name:'继续这条分支',exact:true});
  if (await continueItem.count()) {
    const activated=page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action==='activate');
    await continueItem.click();
    await activated;
  } else {
    await page.keyboard.press('Escape');
  }
  await page.locator('.st-current .st-node-title').filter({hasText:'重启恢复验证'}).waitFor();
  const handle=await page.locator('[data-side=rightbar]').boundingBox();await page.mouse.move(handle.x+handle.width/2,30);await page.mouse.down();await page.mouse.move(1159,30,{steps:12});await page.mouse.up();
  await page.getByRole('button',{name:'重启恢复验证',exact:true}).click({button:'right'});
  await page.getByRole('menuitem',{name:'删除节点…',exact:true}).click();
  const activated=page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action==='activate');
  await page.getByRole('button',{name:'删除并保留后续',exact:true}).click();const result=await(await activated).json();
  assert.ok(result.graph.nodes[result.graph.bindings[result.sessionId].head]);
  assert.ok(!Object.values(result.graph.nodes).some(n=>n.label==='重启恢复验证'));
  await page.locator('.st-current .st-node-title').filter({hasText:'验证当前上下文'}).waitFor();
  await page.getByRole('button',{name:'对话树选项',exact:true}).click();
  const edited=page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action==='edit');
  await page.getByRole('menuitem',{name:/撤销/}).click();const restored=await(await edited).json();
  assert.ok(Object.values(restored.nodes).some(n=>n.label==='重启恢复验证'));
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS: deleting current head in 320px sidebar navigates to valid native context; undo restores node; no transient render error.');
} finally {await browser.close();}
