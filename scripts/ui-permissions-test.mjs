import assert from 'node:assert/strict';
import {launchBrowser} from './_env.mjs';
const browser=await launchBrowser();
try{
  const page=await browser.newPage({viewport:{width:1480,height:980}}),errors=[];
  page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  const root=page.locator('.st-root:visible');
  const mode=name=>page.getByRole('button',{name:`访问模式，当前：${name}`,exact:true});
  const response=action=>page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action===action);
  const node=label=>root.locator('.st-node-body').and(root.getByRole('button',{name:label,exact:true}));
  async function choose(name){
    await page.getByRole('button',{name:/^访问模式，当前：/}).click();
    await page.getByText(name,{exact:true}).last().click();
    if(name==='完全权限'){
      await page.getByRole('checkbox').check();
      await page.getByRole('button',{name:'启用完全权限',exact:true}).click();
    }
    await mode(name).waitFor();
  }
  async function branch(label){
    await node(label).click();const pending=response('branch');await root.getByRole('button',{name:'新建分支',exact:true}).click();
    const result=await (await pending).json();await root.locator('.st-pending.st-current').waitFor();return result;
  }
  await page.goto(process.argv[2],{waitUntil:'networkidle'});
  const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();await page.getByRole('button',{name:'打开 tree-chat'}).click();await node('问题 4').waitFor();
  await choose('完全权限');
  const first=await branch('问题 2');await mode('完全权限').waitFor();
  await choose('工作区内修改');
  const located=response('locate');await node('问题 4').dblclick();await located;await mode('工作区内修改').waitFor();
  const second=await branch('问题 1');await mode('工作区内修改').waitFor();
  await choose('完全权限');
  const restored=response('branch');
  await root.locator(`[data-node-id=${JSON.stringify(`pending:${first.sessionId}`)}] .st-node-body`).dblclick();
  const target=await (await restored).json();assert.equal(target.sessionId,first.sessionId);await mode('完全权限').waitFor();
  await page.reload({waitUntil:'networkidle'});await mode('完全权限').waitFor();
  assert.ok(second.sessionId!==first.sessionId);assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS: native permissions survive branch creation, archived branch switches and reload; both workspace-write and full-access selections retained.');
}finally{await browser.close();}
