import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {launchBrowser, resolveArtifactsDir} from './_env.mjs';

const artifactsDir = resolveArtifactsDir();
const browser = await launchBrowser();
try {
  const page=await browser.newPage({viewport:{width:1480,height:980}}),errors=[],requests=[];
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/conversation-tree')&&r.method()==='POST')requests.push(r.postDataJSON());});
  const response=action=>page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action===action);
  const card=label=>page.locator('.st-node').filter({has:page.locator('.st-node-body[aria-label="'+label+'"]')});
  const style=label=>card(label).evaluate(e=>({x:parseFloat(e.style.left),y:parseFloat(e.style.top)}));
  const samePoint=(a,b)=>assert.ok(Math.abs(a.x-b.x)<.001&&Math.abs(a.y-b.y)<.001,JSON.stringify({a,b}));
  const clickGlobalMenu=async name=>{
    await page.getByRole('button',{name:'对话树选项',exact:true}).click();
    await page.getByRole('menu',{name:'对话树选项'}).waitFor();
    await page.getByRole('menuitem',{name}).or(page.getByRole('menuitemcheckbox',{name})).first().click();
  };
  async function open(){
    await page.goto(process.argv[2],{waitUntil:'networkidle'});
    const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
    await page.getByText(/^tree-chat交互验证/).first().click();
    await page.getByRole('button',{name:'打开 tree-chat'}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.st-node').length===3);
  }
  await open();
  const initialReset=response('edit');await clickGlobalMenu(/自动排列/);await initialReset;
  await page.waitForFunction(()=>document.querySelector('.st-root')?.getAttribute('aria-busy')==='false');
  assert.ok(!(await page.locator('.st-root').innerText()).includes('<goal_round>'));
  assert.ok(!(await page.locator('.st-root').innerText()).includes('The approval policy'));
  await card('研究第一个问题').waitFor();await card('继续研究第二个问题').waitFor();
  await page.screenshot({path:join(artifactsDir,'tree-chat-user-input-default.png')});
  await clickGlobalMenu(/显示完整轮次/);
  await page.waitForFunction(()=>document.querySelectorAll('.st-node').length===7);
  assert.equal(await page.locator('.st-node-body').filter({hasText:'自动继续'}).count(),3);
  await clickGlobalMenu(/仅显示用户输入/);
  await page.waitForFunction(()=>document.querySelectorAll('.st-node').length===3);

  async function move(label,dx,dy){
    const initial=await style(label),box=await card(label).boundingBox();
    const zoom=Number((await page.locator('.st-canvas-tools span').innerText()).replace('%',''))/100;
    const beforeWires=await page.locator('svg.st-wires path').evaluateAll(es=>es.map(e=>e.getAttribute('d')).join('|'));
    const edited=response('edit');
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy,{steps:12});
    await page.waitForFunction(before=>[...document.querySelectorAll('svg.st-wires path')].map(e=>e.getAttribute('d')).join('|')!==before,beforeWires);
    await page.mouse.up();const result=await(await edited).json();assert.ok(result.nodes,JSON.stringify(result));
    const node=Object.values(result.nodes).find(n=>n.label===label);
    assert.ok(Math.abs(node.position.x-initial.x-dx/zoom)<2);assert.ok(Math.abs(node.position.y-initial.y-dy/zoom)<2);
    await page.waitForFunction(()=>document.querySelector('.st-root')?.getAttribute('aria-busy')==='false');
    return node.position;
  }
  const first=await move('研究第一个问题',86,42);
  await open();samePoint(await style('研究第一个问题'),first);
  await page.getByRole('button',{name:'缩小',exact:true}).click();
  const secondInitial=await style('继续研究第二个问题'),second=await move('继续研究第二个问题',-66,-30);
  const undo=response('edit');await clickGlobalMenu(/撤销/);
  await undo;await page.waitForFunction(()=>document.querySelector('.st-root')?.getAttribute('aria-busy')==='false');samePoint(await style('继续研究第二个问题'),secondInitial);
  const redo=response('edit');await clickGlobalMenu(/重做/);
  assert.deepEqual(Object.values((await(await redo).json()).nodes).find(n=>n.label==='继续研究第二个问题').position,second);
  await page.waitForFunction(()=>document.querySelector('.st-root')?.getAttribute('aria-busy')==='false');
  const count=requests.filter(r=>r.action==='edit').length,box=await card('继续研究第二个问题').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+30,box.y+box.height/2+20,{steps:6});await page.keyboard.press('Escape');await page.mouse.up();
  samePoint(await style('继续研究第二个问题'),second);assert.equal(requests.filter(r=>r.action==='edit').length,count);
  const reset=response('edit');await clickGlobalMenu(/自动排列/);
  assert.ok(Object.values((await(await reset).json()).nodes).every(n=>!n.position));
  const restore=response('edit');await clickGlobalMenu(/撤销/);
  const restored=await(await restore).json();assert.deepEqual(Object.values(restored.nodes).find(n=>n.label==='研究第一个问题').position,first);
  assert.equal(requests.filter(r=>r.action==='activate').length,0,'moving/reset/undo must not create context forks');
  await page.screenshot({path:join(artifactsDir,'tree-chat-dragged.png')});
  console.log('PASS: legacy titles migrated; default human inputs only; all-round toggle; real pointer drag, live wires, zoom, disk reload, undo/redo, Escape, auto layout; no context forks.');

  await page.getByRole('button',{name:'研究第一个问题',exact:true}).click({button:'right'});
  const branched=response('branch');await page.getByRole('menuitem',{name:'新建分支',exact:true}).click();
  const branch=await(await branched).json();assert.ok(branch.sessionId,JSON.stringify(branch));
  const head=branch.graph.bindings[branch.sessionId].head;assert.equal(branch.graph.nodes[head].kind,'internal');
  assert.equal(branch.graph.nodes[head].label,'自动继续');
  await page.locator('[contenteditable=true]').last().fill('问题 验证拖动后的上下文');await page.locator('[contenteditable=true]').last().press('Enter');
  await page.getByRole('button',{name:'问题 验证拖动后的上下文',exact:true}).waitFor({timeout:20000});
  const model=JSON.parse(await readFile(join(artifactsDir,'last-model-request.json'),'utf8'));
  assert.ok(model.users.includes('研究第一个问题'));assert.ok(!model.users.includes('继续研究第二个问题'));
  assert.equal(model.users.filter(t=>t.startsWith('<goal_round>')).length,2);
  assert.ok(model.users.some(t=>t.startsWith('The approval policy changed')));
  assert.ok(model.messages.some(m=>m.role==='tool'));
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS: branching from a human card retains its complete automatic rounds and paired tool result in actual model context.');
}finally{await browser.close();}
