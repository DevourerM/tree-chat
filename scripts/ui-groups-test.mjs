import assert from 'node:assert/strict';
import {join} from 'node:path';
import {launchBrowser,resolveArtifactsDir} from './_env.mjs';
const browser=await launchBrowser();
try{
  const page=await browser.newPage({viewport:{width:1480,height:1000}}),errors=[],requests=[];
  page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/conversation-tree')&&r.method()==='POST')requests.push(r.postDataJSON());});
  const root=page.locator('.st-root:visible');
  const node=label=>root.locator('.st-node-body').and(root.getByRole('button',{name:label,exact:true}));
  const response=()=>page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action==='edit');
  const idle=()=>page.waitForFunction(()=>[...document.querySelectorAll('.st-root')].find(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden')?.getAttribute('aria-busy')==='false');
  async function edit(click){const pending=response();await click();const r=await pending;assert.ok(r.ok(),await r.text());const g=await r.json();await idle();return g;}
  async function menu(label){await node(label).click({button:'right'});}
  async function split(label,cut,name){
    await menu(label);await root.getByRole('menuitem',{name:'拆分集合…',exact:true}).click();
    await root.getByRole('combobox',{name:'拆分位置',exact:true}).selectOption({label:cut});
    await root.getByRole('textbox',{name:'新集合名称',exact:true}).fill(name);
    return edit(()=>root.getByRole('button',{name:'拆分',exact:true}).click());
  }
  await page.goto(process.argv[2],{waitUntil:'networkidle'});
  const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();await page.getByRole('button',{name:'打开 tree-chat'}).click();await node('问题 8').waitFor();
  const handle=await page.locator('[data-side=rightbar]').boundingBox();
  await page.mouse.move(handle.x+handle.width/2,30);await page.mouse.down();await page.mouse.move(829,30,{steps:12});await page.mouse.up();
  await root.getByRole('button',{name:'适合画布',exact:true}).click();
  await node('问题 1').click();await node('问题 6').click({modifiers:['Shift']});
  assert.equal(await root.locator('.st-selected').count(),6);
  await root.getByRole('button',{name:'合并为集合',exact:true}).click();
  await root.getByRole('textbox',{name:'集合名称',exact:true}).fill('调研过程');
  let graph=await edit(()=>root.getByRole('button',{name:'合并',exact:true}).click());
  const content=nodes=>Object.fromEntries(Object.entries(nodes).map(([id,{position,...n}])=>[id,n]));
  const raw=content(graph.nodes);assert.equal(Object.keys(graph.groups).length,1);assert.equal(await root.locator('.st-group').count(),1);
  assert.equal(await root.locator('.st-node').count(),4);
  await edit(()=>root.getByRole('button',{name:'展开集合：调研过程',exact:true}).click());
  assert.equal(await root.locator('.st-group-tag').count(),6);
  await edit(()=>root.getByRole('button',{name:'折叠集合：调研过程',exact:true}).first().click());
  await root.getByRole('textbox',{name:'搜索节点',exact:true}).fill('问题 4');
  await node('问题 4').waitFor();assert.equal(await root.locator('.st-group').count(),0);
  await root.getByRole('textbox',{name:'搜索节点',exact:true}).fill('');await node('调研过程').waitFor();
  graph=await split('调研过程','问题 3','深入讨论');assert.equal(Object.keys(graph.groups).length,2);
  graph=await split('深入讨论','问题 5','阶段结论');assert.equal(Object.keys(graph.groups).length,3);
  assert.deepEqual(content(graph.nodes),raw,'group operations preserve raw context nodes');
  await menu('阶段结论');await root.getByRole('menuitem',{name:'重命名集合',exact:true}).click();
  await root.getByRole('textbox',{name:'集合名称',exact:true}).fill('结论');
  await edit(()=>root.getByRole('button',{name:'保存',exact:true}).click());
  await menu('结论');graph=await edit(()=>root.getByRole('menuitem',{name:'取消集合',exact:true}).click());assert.equal(Object.keys(graph.groups).length,2);
  await root.locator('.st-canvas').focus();graph=await edit(()=>page.keyboard.press('Control+z'));assert.equal(Object.keys(graph.groups).length,3);
  const id=Object.keys(graph.groups).find(id=>graph.groups[id].name==='结论'),before=structuredClone(graph);
  const box=await node('结论').boundingBox(),z=await root.locator('.st-world').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a);
  graph=await edit(async()=>{await page.mouse.move(box.x+30,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+30+100*z,box.y+box.height/2+20*z,{steps:10});await page.mouse.up();});
  for(const n of graph.groups[id].nodeIds){assert.ok(Math.abs(graph.nodes[n].position.x-before.nodes[n].position.x-100)<1);assert.ok(Math.abs(graph.nodes[n].position.y-before.nodes[n].position.y-20)<1);}
  await edit(()=>root.getByRole('button',{name:'整理节点',exact:true}).click());
  await page.reload({waitUntil:'networkidle'});if(!await root.count())await page.getByRole('button',{name:'打开 tree-chat'}).click();
  await node('结论').waitFor();assert.equal(await root.locator('.st-group').count(),3);
  await page.emulateMedia({colorScheme:'dark'});await page.screenshot({path:join(resolveArtifactsDir(),'tree-chat-v1-groups-dark.png'),fullPage:true});
  assert.equal(requests.filter(r=>['activate','branch','locate'].includes(r.action)).length,0,'collections do not navigate or modify model sessions');
  assert.deepEqual(errors,[]);console.log('PASS: Shift selection, named collection, expand/fold, temporary search reveal, three-way splitting, rename/dissolve/undo, group drag, arrange and reload preserve context.');
}finally{await browser.close();}
