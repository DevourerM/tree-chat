import assert from 'node:assert/strict';
import {launchBrowser} from './_env.mjs';
// Run on the same isolated home after ui-permissions-test and a complete Host restart.
const browser=await launchBrowser();
try{
  const page=await browser.newPage({viewport:{width:1480,height:980}});page.setDefaultTimeout(20000);
  await page.goto(process.argv[2],{waitUntil:'networkidle'});
  const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();
  await page.getByRole('button',{name:'访问模式，当前：完全权限',exact:true}).waitFor();
  await page.getByRole('button',{name:'打开 tree-chat',exact:true}).click();
  const root=page.locator('.st-root:visible');
  const located=page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action==='locate');
  await root.getByRole('button',{name:'问题 4',exact:true}).dblclick();const response=await located;
  assert.ok(response.ok(),await response.text());assert.equal((await response.json()).sessionId,'session-tree-demo');
  await page.getByRole('button',{name:'访问模式，当前：完全权限',exact:true}).waitFor();
  console.log('PASS: after a complete Host restart, a cold archived branch resumes through the native agent API and inherits full-access permission.');
}finally{await browser.close();}
