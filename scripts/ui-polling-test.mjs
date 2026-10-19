import assert from 'node:assert/strict';
import {launchBrowser} from './_env.mjs';

const browser=await launchBrowser();
try {
  const page=await browser.newPage({viewport:{width:1480,height:980}}), requests=[], errors=[];
  page.setDefaultTimeout(20000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/conversation-tree')&&r.method()==='POST')requests.push(r.postDataJSON());});
  const root=page.locator('.st-root:visible');
  const response=action=>page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action===action);
  await page.goto(process.argv[2],{waitUntil:'networkidle'});
  const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();
  await page.getByRole('button',{name:'打开 tree-chat'}).click();
  await root.getByRole('button',{name:'问题 2',exact:true}).waitFor();
  await root.getByRole('button',{name:'问题 2',exact:true}).click();
  const [branched]=await Promise.all([
    response('branch'),root.getByRole('button',{name:'新建分支',exact:true}).click()
  ]);
  const branch=await branched.json();
  await root.locator('.st-pending.st-current').waitFor();
  await page.waitForFunction(()=>document.querySelector('.st-root[aria-busy="true"]')===null);
  assert.ok(await page.locator('.st-root').count()>=2,'previous panel must remain mounted');
  requests.length=0;
  // Observe over two polling periods: only the visible branch may read the graph.
  await page.waitForTimeout(6200);
  const reads=requests.filter(r=>r.action==='get');
  assert.ok(reads.length>=1,'visible panel must continue syncing');
  assert.ok(reads.every(r=>r.sessionId===branch.sessionId),JSON.stringify(reads));
  await page.getByRole('button',{name:'收起右侧边栏',exact:true}).click();
  await root.waitFor({state:'hidden'});
  requests.length=0;
  await page.waitForTimeout(6200);
  assert.equal(requests.filter(r=>r.action==='get').length,0,'collapsed sidebar must stop polling');
  const resumed=response('get');
  await page.getByRole('button',{name:'打开 tree-chat'}).click();
  await resumed;
  await root.locator('.st-pending.st-current').waitFor();
  const cancelled=response('cancel-branch');
  await root.getByRole('button',{name:'取消新分支',exact:true}).click();
  await cancelled;
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS: retained hidden panels and collapsed sidebar stop polling; visible panel syncs and refreshes on reopen.');
} finally {await browser.close();}
