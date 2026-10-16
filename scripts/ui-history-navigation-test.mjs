import {join} from 'node:path';
import assert from 'node:assert/strict';
import {launchBrowser, resolveArtifactsDir} from './_env.mjs';

const artifactsDir = resolveArtifactsDir();
const browser = await launchBrowser();
try {
  const page=await browser.newPage({viewport:{width:1480,height:980}}),errors=[],requests=[],count=Number(process.argv[3]||80);
  page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/conversation-tree')&&r.method()==='POST')requests.push(r.postDataJSON());});
  await page.goto(process.argv[2],{waitUntil:'networkidle'});const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();await page.getByRole('button',{name:'打开 tree-chat'}).click();
  await page.waitForFunction(n=>document.querySelectorAll('.st-node').length===n,count+1);
  await page.locator(`[data-conversation-content] [data-chat-turn="${count}"]`).first().waitFor();
  assert.equal(await page.locator('[data-conversation-content] [data-chat-turn="1"]').count(),0,'fixture must include unloaded history');
  await page.locator('.st-canvas').focus();
  for(let i=1;i<count;i++)await page.keyboard.press('ArrowUp');
  assert.equal(await page.locator('.st-selected .st-node-body').getAttribute('aria-label'),'问题 1');
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('[data-tree-chat-landing]')?.dataset.chatTurn==='1');
  await page.waitForTimeout(450);
  const visible=await page.locator('[data-tree-chat-landing]').evaluate(e=>{const r=e.getBoundingClientRect(),s=e.closest('[data-conversation-scroll]').getBoundingClientRect();return r.bottom>s.top&&r.top<s.bottom;});
  assert.ok(visible,'history landing must stay visible after native scroll sampling');
  await page.screenshot({path:join(artifactsDir,'tree-chat-history-navigation.png')});
  assert.equal(requests.filter(r=>r.action==='activate'||r.action==='preview'||r.action==='edit').length,0);
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS: native unloaded history loaded through public Session API; keyboard jump lands on first message and remains visible; no fork or preview.');
}finally{await browser.close();}
