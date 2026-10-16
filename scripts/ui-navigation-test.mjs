import {join} from 'node:path';
import assert from 'node:assert/strict';
import {launchBrowser, resolveArtifactsDir} from './_env.mjs';

const artifactsDir = resolveArtifactsDir();
const browser = await launchBrowser();

try {
  const page = await browser.newPage({viewport: {width: 1480, height: 980}}), errors = [], requests = [];
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => {
    if (r.url().includes('/api/conversation-tree') && r.method() === 'POST') requests.push(r.postDataJSON());
  });
  const root = page.locator('.st-root:visible');
  const waitNodes = n => page.waitForFunction(count => {
    const r = [...document.querySelectorAll('.st-root')].find(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
    return r && r.querySelectorAll('.st-node').length === count;
  }, n);
  const response = action => page.waitForResponse(r => r.url().includes('/api/conversation-tree') && r.request().postDataJSON()?.action === action);
  const node = label => root.getByRole('button', {name: label, exact: true});
  const landed = turn => page.waitForFunction(n => {
    const el = [...document.querySelectorAll('[data-tree-chat-landing]')].find(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
    return el?.dataset.chatTurn === String(n);
  }, turn);
  const waitIdle = () => page.waitForFunction(() => {
    const r = [...document.querySelectorAll('.st-root')].find(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
    return r?.getAttribute('aria-busy') === 'false';
  });

  await page.goto(process.argv[2], {waitUntil: 'networkidle'});
  const consent = page.getByRole('button', {name: '继续', exact: true});
  if (await consent.count()) await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();
  await page.getByRole('button', {name: '打开 tree-chat'}).click();
  await waitNodes(5);
  assert.equal(await page.locator('.st-inspector,.st-preview,.st-actions').count(), 0);
  assert.equal(await page.locator('.st-port,.st-wire-hit,.st-wire-draft,.st-connect-hint').count(), 0, 'ports and manual wire handles must be removed');

  // 1. 验证单击（Single Click）：仅选中高亮，绝不触发 locate 请求与聊天流跳转
  const reqCountBeforeClick = requests.filter(r => r.action === 'locate').length;
  await node('问题 2').click();
  await page.waitForTimeout(300);
  assert.equal(requests.filter(r => r.action === 'locate').length, reqCountBeforeClick, 'single click must select only and not trigger locate navigation');
  assert.ok(await node('问题 2').locator('xpath=ancestor::article[1]').evaluate(el => el.classList.contains('st-selected')));

  // 2. 验证双击（Double Click）：成功触发 locate 请求与主聊天视口落地
  let locating = response('locate');
  await node('问题 2').dblclick();
  let location = await (await locating).json();
  assert.equal(location.turn, 2);
  await landed(2);
  const bounds = await page.locator('[data-tree-chat-landing]:visible').evaluate(e => {
    const r = e.getBoundingClientRect(), s = e.closest('[data-conversation-scroll]').getBoundingClientRect();
    return {top: r.top, bottom: r.bottom, floor: s.bottom, ceiling: s.top};
  });
  assert.ok(bounds.bottom > bounds.ceiling && bounds.top < bounds.floor, JSON.stringify(bounds));
  assert.equal(requests.filter(r => r.action === 'activate' || r.action === 'edit' || r.action === 'preview').length, 0);

  await page.getByRole('tab', {name: '轨迹', exact: true}).click();
  locating = response('locate');
  await node('问题 1').dblclick();
  await locating;
  await landed(1);
  assert.equal(await page.getByRole('tab', {name: '对话', exact: true}).getAttribute('aria-selected'), 'true');
  await page.screenshot({path: join(artifactsDir, 'tree-chat-navigation.png')});

  const count = requests.filter(r => r.action === 'locate').length, box = await node('问题 3').boundingBox(), edit = response('edit');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 24, {steps: 12});
  await page.mouse.up();
  let graph = await (await edit).json();
  assert.ok(Object.values(graph.nodes).find(n => n.label === '问题 3').position);
  await waitIdle();
  assert.equal(requests.filter(r => r.action === 'locate').length, count, 'dragging must not trigger a jump');

  // Delete node 2 with "保留后续" -> bridges 1-2-3-4 into 1-3-4 and activates new branch session
  await node('问题 2').click({button: 'right'});
  await root.getByRole('menu', {name: '节点菜单'}).waitFor();
  await root.getByRole('menuitem', {name: '删除节点…', exact: true}).click();
  const delEdit = response('edit'), activated = response('activate');
  await root.getByRole('button', {name: '删除并保留后续', exact: true}).click();
  graph = await (await delEdit).json();
  const third = Object.values(graph.nodes).find(n => n.label === '问题 3');
  assert.equal(graph.nodes[third.parent].label, '问题 1');
  const branch = await (await activated).json();
  assert.ok(branch.sessionId, JSON.stringify(branch));
  await waitNodes(4);
  await root.locator('.st-current .st-node-title').filter({hasText: '问题 4'}).waitFor();
  await waitIdle();

  locating = response('locate');
  await node('问题 1').dblclick();
  location = await (await locating).json();
  assert.equal(location.sessionId, branch.sessionId);
  assert.equal(location.turn, 2);
  await landed(2);

  locating = response('locate');
  await node('问题 3').dblclick();
  location = await (await locating).json();
  assert.equal(location.sessionId, branch.sessionId);
  assert.equal(location.turn, 3);
  await landed(3);

  await node('问题 3').click({button: 'right'});
  await root.getByRole('menu', {name: '节点菜单'}).waitFor();
  assert.equal(await root.getByRole('menuitem', {name: '新建分支', exact: true}).count(), 1);
  await page.keyboard.press('Escape');

  // Undo deletion via global menu -> restores 1-2-3-4
  await root.getByRole('button', {name: '对话树选项', exact: true}).click();
  await root.getByRole('menu', {name: '对话树选项'}).waitFor();
  const undoEdit = response('edit'), undoActivate = response('activate');
  await root.getByRole('menuitem', {name: /撤销/}).click();
  await undoEdit;
  await undoActivate;
  await waitNodes(5);
  await waitIdle();

  locating = response('locate');
  await node('问题 2').dblclick();
  location = await (await locating).json();
  assert.equal(location.sessionId, 'session-tree-demo');
  assert.equal(location.turn, 2);
  await landed(2);

  assert.equal(requests.filter(r => r.action === 'activate').length, 2, 'only explicit context edits may activate a branch');
  assert.equal(requests.filter(r => r.action === 'preview').length, 0);
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS: single click selects without jumping; double click successfully triggers locate/jump; drag and delete bridge verified.');
} finally {
  await browser.close();
}
