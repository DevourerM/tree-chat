import assert from 'node:assert/strict';
import {launchBrowser} from './_env.mjs';
const browser=await launchBrowser();
try{
  const page=await browser.newPage({viewport:{width:1480,height:980}}),errors=[];
  page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2],{waitUntil:'networkidle'});
  const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();await page.getByRole('button',{name:'打开 tree-chat'}).click();
  const root=page.locator('.st-root:visible');
  await root.getByRole('button',{name:'问题 500',exact:true}).waitFor();
  const count=await root.locator('.st-node').count();assert.ok(count<80,`viewport rendered ${count} cards`);
  const unchanged=page.waitForResponse(async r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action==='get'&&(await r.json()).unchanged===true);
  await unchanged;
  await root.getByRole('textbox',{name:'搜索节点',exact:true}).fill('问题 1');
  await root.getByRole('button',{name:'问题 1',exact:true}).waitFor();
  assert.ok(await root.locator('.st-node').count()<80);
  await root.getByRole('button',{name:'问题 1',exact:true}).dblclick();
  await page.waitForFunction(()=>document.querySelector('[data-tree-chat-landing]')?.dataset.chatTurn==='1');
  assert.deepEqual(errors,[]);console.log('PASS: 500-turn native conversation uses fewer than 80 rendered cards; conditional polling, offscreen search and history navigation remain functional.');
}finally{await browser.close();}
