import assert from 'node:assert/strict';
import {join} from 'node:path';
import {launchBrowser,resolveArtifactsDir} from './_env.mjs';

const browser=await launchBrowser();
try{
  const page=await browser.newPage({viewport:{width:1480,height:980}}),errors=[],requests=[];
  page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/conversation-tree')&&r.method()==='POST')requests.push(r.postDataJSON());});
  const root=page.locator('.st-root:visible');
  const response=action=>page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action===action);
  const node=label=>root.locator('.st-node-body').and(root.getByRole('button',{name:label,exact:true}));
  const idle=()=>page.waitForFunction(()=>[...document.querySelectorAll('.st-root')].find(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden')?.getAttribute('aria-busy')==='false');
  async function move(label,dx,dy){
    const box=await node(label).boundingBox(),changed=response('edit');
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy,{steps:12});await page.mouse.up();
    const graph=await (await changed).json();await idle();return graph;
  }
  async function branch(label){
    await node(label).click();const result=response('branch');
    await root.getByRole('button',{name:'新建分支',exact:true}).click();
    const data=await (await result).json();await root.locator('.st-pending.st-current').waitFor();await idle();return data;
  }
  await page.goto(process.argv[2],{waitUntil:'networkidle'});
  const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();await page.getByRole('button',{name:'打开 tree-chat'}).click();
  await node('问题 4').waitFor();await idle();
  const resize=await page.locator('[data-side=rightbar]').boundingBox();
  await page.mouse.move(resize.x+resize.width/2,30);await page.mouse.down();await page.mouse.move(829,30,{steps:12});await page.mouse.up();
  const zoom=await root.locator('.st-world').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a);
  await move('问题 3',-228*zoom,0);
  let graph=await move('问题 4',0,-80*zoom);
  const existing=Object.values(graph.nodes).find(n=>n.label==='问题 4');
  const first=await branch('问题 2'),firstId=`pending:${first.sessionId}`;
  assert.notDeepEqual(first.graph.draftBranches[first.sessionId].position,existing.position);
  const firstCard=root.locator(`[data-node-id=${JSON.stringify(firstId)}]`);
  assert.equal(await firstCard.evaluate(e=>getComputedStyle(e).borderStyle),'solid');
  assert.equal(await root.locator('.st-wires path').evaluateAll(es=>es.every(e=>getComputedStyle(e).strokeDasharray==='none')),true);
  const second=await branch('问题 1');
  assert.equal(Object.keys(second.graph.draftBranches).length,2);
  await page.reload({waitUntil:'networkidle'});if(!await root.count())await page.getByRole('button',{name:'打开 tree-chat'}).click();
  await root.locator('.st-pending').first().waitFor();assert.equal(await root.locator('.st-pending').count(),2);
  // Move the first empty sibling to the left; cleanup must preserve this new order.
  await firstCard.locator('.st-node-body').click({button:'right'});
  await root.getByRole('menuitem',{name:'重命名节点',exact:true}).click();
  await root.getByRole('textbox',{name:'节点名称',exact:true}).fill('左边的新分支');
  const renamed=response('edit');await root.getByRole('button',{name:'保存',exact:true}).click();await renamed;await idle();
  const zoom2=await root.locator('.st-world').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a);
  graph=await move('左边的新分支',-684*zoom2,40*zoom2);
  const before=structuredClone(graph),arranging=response('edit');
  await root.getByRole('button',{name:'整理节点',exact:true}).click();
  const arranged=await (await arranging).json();await idle();
  const third=Object.values(arranged.nodes).find(n=>n.label==='问题 3');
  assert.ok(arranged.draftBranches[first.sessionId].position.x<third.position.x);
  assert.equal(arranged.draftBranches[first.sessionId].position.y,third.position.y);
  assert.equal(Object.keys(arranged.draftBranches).length,2);
  const points=[...Object.values(arranged.nodes),...Object.values(arranged.draftBranches)];
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    const a=points[i].position,b=points[j].position;
    assert.ok(Math.abs(a.x-b.x)>=220||Math.abs(a.y-b.y)>=64,'arranged cards overlap');
  }
  await root.getByRole('button',{name:'对话树选项',exact:true}).click();
  let edited=response('edit');await root.getByRole('menuitem',{name:/^撤销/}).click();
  const undone=await (await edited).json();await idle();
  assert.deepEqual(undone.draftBranches[first.sessionId].position,before.draftBranches[first.sessionId].position);
  await root.getByRole('button',{name:'对话树选项',exact:true}).click();
  edited=response('edit');await root.getByRole('menuitem',{name:/^重做/}).click();await edited;await idle();
  await root.getByRole('button',{name:'适合画布',exact:true}).click();await page.emulateMedia({colorScheme:'dark'});
  await page.screenshot({path:join(resolveArtifactsDir(),'tree-chat-persistent-arranged.png'),fullPage:true});
  assert.equal(requests.filter(r=>r.action==='activate').length,0,'layout must not create context sessions');
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS: solid persistent empty nodes, multiple branches after reload, collision avoidance after drag, visible arrange button, preserved left/right order and undo/redo.');
}finally{await browser.close();}
