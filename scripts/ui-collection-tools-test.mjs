import assert from 'node:assert/strict';
import {join} from 'node:path';
import {launchBrowser,resolveArtifactsDir} from './_env.mjs';
const browser=await launchBrowser();let page;
try{
  page=await browser.newPage({viewport:{width:1480,height:1000}});page.setDefaultTimeout(15000);
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/conversation-tree')&&r.method()==='POST')requests.push(r.postDataJSON());});
  const root=page.locator('.st-root:visible'),node=label=>root.locator('.st-node-body').and(root.getByRole('button',{name:label,exact:true}));
  const idle=()=>page.waitForFunction(()=>[...document.querySelectorAll('.st-root')].find(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden')?.getAttribute('aria-busy')==='false');
  async function edit(click){const pending=page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action==='edit');await click();const r=await pending;assert.ok(r.ok(),await r.text());const g=await r.json();await idle();return g;}
  async function noOverlap(){
    const cards=await root.locator('.st-node').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return {id:e.dataset.nodeId,x:b.x,y:b.y,w:b.width,h:b.height};}));
    for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){const a=cards[i],b=cards[j];assert.ok(a.x+a.w<=b.x+1||b.x+b.w<=a.x+1||a.y+a.h<=b.y+1||b.y+b.h<=a.y+1,`${a.id} overlaps ${b.id}`);}
  }
  async function frame(first,last,modifiers=[]){
    const a=await node(first).boundingBox(),b=await node(last).boundingBox();
    for(const key of modifiers)await page.keyboard.down(key);
    await page.mouse.move(Math.min(a.x,b.x)-10,a.y-10);await page.mouse.down();
    await page.mouse.move(Math.max(a.x+a.width,b.x+b.width)+10,b.y+b.height+10,{steps:12});
    assert.equal(await root.locator('.st-selection-box').count(),1);await page.mouse.up();
    for(const key of modifiers)await page.keyboard.up(key);
    assert.equal(await root.locator('.st-selection-box').count(),0);
  }
  async function create(name){await root.getByRole('button',{name:'合并为集合',exact:true}).click();await root.getByRole('textbox',{name:'集合名称',exact:true}).fill(name);return edit(()=>root.getByRole('button',{name:'合并',exact:true}).click());}
  await page.goto(process.argv[2],{waitUntil:'networkidle'});
  const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();await page.getByRole('button',{name:'打开 tree-chat'}).click();await node('问题 8').waitFor();
  const handle=await page.locator('[data-side=rightbar]').boundingBox();await page.mouse.move(handle.x+handle.width/2,30);await page.mouse.down();await page.mouse.move(829,30,{steps:12});await page.mouse.up();
  await root.getByRole('button',{name:'适合画布',exact:true}).click();
  assert.equal(await root.getByRole('button',{name:'框选节点',exact:true}).getAttribute('aria-pressed'),'true');
  await frame('问题 2','问题 5');assert.equal(await root.locator('.st-selected').count(),4);
  await node('问题 1').click({modifiers:['Control']});assert.equal(await root.locator('.st-selected').count(),5);
  await frame('问题 6','问题 6',['Shift']);assert.equal(await root.locator('.st-selected').count(),6);
  await root.getByRole('button',{name:'缩小',exact:true}).click();await frame('问题 2','问题 5');assert.equal(await root.locator('.st-selected').count(),4);
  const start=await node('问题 1').boundingBox();await page.mouse.move(start.x-10,start.y-10);await page.mouse.down();await page.mouse.move(start.x+start.width+10,start.y+start.height+10,{steps:6});await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await root.locator('.st-selected').count(),4);
  assert.equal(requests.filter(r=>r.action==='edit').length,0,'selection alone never writes graph');
  let graph=await create('四轮集合'),id=Object.keys(graph.groups)[0];await noOverlap();
  const groupBox=await node('四轮集合').boundingBox(),nextBox=await node('问题 6').boundingBox();assert.ok(nextBox.y-groupBox.y<110,'collapse must close the old multi-turn gap');
  await edit(()=>root.getByRole('button',{name:'整理节点',exact:true}).click());
  await edit(()=>root.getByRole('button',{name:'展开所有集合',exact:true}).click());await noOverlap();assert.equal(await root.locator('.st-group').count(),0);
  await node('问题 3').click({button:'right'});await root.getByRole('menuitem',{name:'删除所属集合…',exact:true}).click();await root.getByRole('alertdialog',{name:'删除集合',exact:true}).waitFor();await root.getByRole('button',{name:'取消',exact:true}).click();
  await root.getByRole('button',{name:'适合画布',exact:true}).click();await frame('问题 7','问题 8');graph=await create('末尾集合');assert.equal(Object.keys(graph.groups).length,2);
  for(let i=0;i<2;i++){
    await edit(()=>root.getByRole('button',{name:'展开所有集合',exact:true}).click());await noOverlap();
    await edit(()=>root.getByRole('button',{name:'折叠所有集合',exact:true}).click());await noOverlap();assert.equal(await root.locator('.st-group').count(),2);
  }
  // Space + left drag and middle drag continue to pan independently of box selection.
  await root.locator('.st-canvas').focus();const canvas=await root.locator('.st-canvas').boundingBox();
  for(const button of ['left','middle']){
    const before=await root.locator('.st-world').evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return {x:m.e,y:m.f};});
    if(button==='left')await page.keyboard.down('Space');await page.mouse.move(canvas.x+15,canvas.y+35);await page.mouse.down({button});await page.mouse.move(canvas.x+40,canvas.y+50,{steps:8});await page.mouse.up({button});if(button==='left')await page.keyboard.up('Space');
    const after=await root.locator('.st-world').evaluate(e=>{const m=new DOMMatrix(getComputedStyle(e).transform);return {x:m.e,y:m.f};});assert.ok(Math.abs(after.x-before.x-25)<1);assert.ok(Math.abs(after.y-before.y-15)<1);
  }
  await node('四轮集合').click({button:'right'});await root.getByRole('menuitem',{name:'删除集合…',exact:true}).click();
  await root.getByRole('alertdialog',{name:'删除集合',exact:true}).waitFor();
  graph=await edit(()=>root.getByRole('button',{name:'删除并保留后续',exact:true}).click());
  assert.ok(!graph.groups[id]);assert.ok(!Object.values(graph.nodes).some(n=>n.label==='问题 2'));
  const n6=Object.values(graph.nodes).find(n=>n.label==='问题 6'),n1=Object.values(graph.nodes).find(n=>n.label==='问题 1');assert.equal(n6.parent,n1.id);await noOverlap();
  await root.locator('.st-canvas').focus();await edit(()=>page.keyboard.press('Control+z'));await node('四轮集合').waitFor();await noOverlap();
  await page.reload({waitUntil:'networkidle'});if(!await root.count())await page.getByRole('button',{name:'打开 tree-chat'}).click();await node('四轮集合').waitFor();assert.equal(await root.locator('.st-group').count(),2);
  await page.emulateMedia({colorScheme:'dark'});await page.screenshot({path:join(resolveArtifactsDir(),'tree-chat-1.1-collections.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: drag marquee, native panning, bulk fold/unfold, compact collection layout, expand after arrange without overlap, collection deletion bridges context, undo and reload.');
}catch(error){await page?.screenshot({path:join(resolveArtifactsDir(),'tree-chat-1.1-failure.png'),fullPage:true});throw error;}finally{await browser.close();}
