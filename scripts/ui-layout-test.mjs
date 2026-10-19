import {join} from 'node:path';
import assert from 'node:assert/strict';
import {launchBrowser, resolveArtifactsDir} from './_env.mjs';

const artifactsDir = resolveArtifactsDir();
const browser = await launchBrowser();
let page;
try {
  page=await browser.newPage({viewport:{width:1480,height:980}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.goto(process.argv[2],{waitUntil:'networkidle'});
  const consent=page.getByRole('button',{name:'继续',exact:true});if(await consent.count())await consent.click();
  const targetTitle=process.argv[3];
  if(targetTitle)await page.getByText(targetTitle,{exact:true}).first().click();
  else await page.getByText(/^tree-chat交互验证/).first().click();
  await page.getByRole('button',{name:'打开 tree-chat'}).click();await page.locator('.st-node').first().waitFor();
  for(const height of [700,1000]) {
    await page.setViewportSize({width:1480,height});
    for(const width of [320,480,650]) {
      const handle=await page.locator('[data-side=rightbar]').boundingBox();
      await page.mouse.move(handle.x+handle.width/2,30);await page.mouse.down();
      await page.mouse.move(1480-width-1,30,{steps:12});await page.mouse.up();
      await page.waitForFunction(w=>Math.abs(document.querySelector('.st-root').clientWidth-w)<3,width);
      const expected=width<400?'s':width<560?'m':'l';
      await page.waitForFunction(s=>document.querySelector('.st-root').dataset.size===s,expected);
      for(const theme of ['light','dark']) {
        await page.emulateMedia({colorScheme:theme});
        const metrics=await page.locator('.st-root').evaluate(root=>{
          const canvas=root.querySelector('.st-canvas'), toolbar=root.querySelector('.st-toolbar'), button=root.querySelector('.st-canvas-tools'), node=root.querySelector('.st-node:not(.st-origin)');
          return {width:root.clientWidth,height:root.clientHeight,canvas:canvas.clientHeight,toolbar:toolbar.scrollWidth<=toolbar.clientWidth,button:button.getBoundingClientRect().bottom<=root.getBoundingClientRect().bottom,node:parseFloat(getComputedStyle(node).width)};
        });
        assert.ok(metrics.canvas>=height*.4,JSON.stringify(metrics));assert.ok(metrics.toolbar&&metrics.button,JSON.stringify(metrics));
        assert.equal(metrics.node,{s:168,m:188,l:200}[expected]);
        await page.screenshot({path:join(artifactsDir,`tree-chat-${width}x${height}-${theme}.png`),fullPage:true});
      }
    }
  }
  // Verify pending node visibility and non-overflow at narrow 320px width
  const root = page.locator('.st-root:visible');
  const handle=await page.locator('[data-side=rightbar]').boundingBox();
  await page.mouse.move(handle.x+handle.width/2,30);await page.mouse.down();
  await page.mouse.move(1480-320-1,30,{steps:12});await page.mouse.up();
  await page.waitForFunction(()=>{
    const r=[...document.querySelectorAll('.st-root')].find(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&getComputedStyle(e).visibility!=='hidden';});
    return r&&Math.abs(r.clientWidth-320)<3;
  });
  const branchWait=page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action==='branch');
  await root.getByRole('button',{name:'新建分支',exact:true}).first().click();
  await branchWait;
  await root.locator('.st-node.st-pending.st-current').waitFor();
  const pendingElement=await root.locator('.st-node.st-pending.st-current').elementHandle();
  await page.waitForFunction(p => {
    const c = p?.closest('.st-canvas');
    if (!p || !c) return false;
    const pr = p.getBoundingClientRect(), cr = c.getBoundingClientRect();
    return pr.left >= cr.left && pr.right <= cr.right;
  },pendingElement);
  const pendingMetrics=await root.locator('.st-node.st-pending').evaluate(el=>{
    const r=el.getBoundingClientRect(), c=el.closest('.st-canvas').getBoundingClientRect(), btn=el.querySelector('.st-node-controls button').getBoundingClientRect();
    return {visible:r.width>0&&r.height>0,inCanvas:r.left>=c.left&&r.right<=c.right,cancelVisible:btn.width>0&&btn.right<=r.right+1};
  });
  assert.ok(pendingMetrics.visible&&pendingMetrics.inCanvas&&pendingMetrics.cancelVisible,JSON.stringify(pendingMetrics));
  await root.locator('.st-pending.st-current .st-node-body').click({button:'right'});
  const cancelWait=page.waitForResponse(r=>r.url().includes('/api/conversation-tree')&&r.request().postDataJSON()?.action==='cancel-branch');
  await root.getByRole('menuitem',{name:'删除空分支',exact:true}).click();
  await cancelWait;
  await page.waitForFunction(()=>{
    const r=[...document.querySelectorAll('.st-root')].find(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&getComputedStyle(e).visibility!=='hidden';});
    return r&&r.querySelectorAll('.st-node.st-pending').length===0;
  });
  await page.waitForFunction(()=>{
    const r=[...document.querySelectorAll('.st-root')].find(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&getComputedStyle(e).visibility!=='hidden';});
    return r?.getAttribute('aria-busy')==='false';
  });

  assert.equal(await root.locator('.st-inspector,.st-preview').count(),0);
  await root.locator('.st-canvas').focus();await page.keyboard.press('ArrowUp');
  assert.ok(await root.locator('.st-selected').count());
  await root.getByRole('textbox',{name:'搜索节点',exact:true}).fill('问题 4');
  await root.locator('.st-dim').first().waitFor();
  assert.ok(await root.locator('.st-dim').count());
  await root.getByRole('textbox',{name:'搜索节点',exact:true}).fill('');
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS: native sidebar resized to 320/480/650 × 700/1000, light/dark, readable nodes, pending node at 320px, no toolbar overflow, no preview, keyboard and search.');
} catch(error){await page?.screenshot({path:join(artifactsDir,'tree-chat-layout-failure.png'),fullPage:true});throw error;}
finally {await browser.close();}
