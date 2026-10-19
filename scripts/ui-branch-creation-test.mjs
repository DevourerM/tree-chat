import {unlink, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {launchBrowser, resolveArtifactsDir, resolveTestHome} from './_env.mjs';

const artifactsDir = resolveArtifactsDir();
const home = resolveTestHome('test-home-v4');
const humanInputs = request => request.messages
  .filter(m => m.role === 'user' && (!m.source?.kind || m.source.kind === 'user'))
  .map(m => m.content.filter(b => b.type === 'text').map(b => b.text).join(''));
await unlink(join(home, 'plugins/conversation-tree/graphs/session-tree-demo.json')).catch(e => { if (e.code !== 'ENOENT') throw e; });

const browser = await launchBrowser();

try {
  const page = await browser.newPage({viewport: {width: 1480, height: 980}});
  const errors = [];
  page.setDefaultTimeout(20000);
  page.on('pageerror', e => errors.push(e.message));

  const root = page.locator('.st-root:visible');
  const waitApi = action => page.waitForResponse(r => r.url().includes('/api/conversation-tree') && r.request().postDataJSON()?.action === action);
  const waitIdle = () => page.waitForFunction(() => {
    const r = [...document.querySelectorAll('.st-root')].find(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
    return r?.getAttribute('aria-busy') === 'false';
  });
  const waitPendingCount = n => page.waitForFunction(count => {
    const r = [...document.querySelectorAll('.st-root')].find(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
    return r && r.querySelectorAll('.st-node.st-pending').length === count;
  }, n);
  const nodeBtn = label => root.locator('.st-node-body').and(root.getByRole('button', {name: label, exact: true}));
  const cardOf = label => nodeBtn(label).locator('xpath=ancestor::article[1]');

  await page.goto(process.argv[2], {waitUntil: 'networkidle'});
  const consent = page.getByRole('button', {name: '继续', exact: true});
  if (await consent.count()) await consent.click();
  await page.getByText(/^tree-chat交互验证/).first().click();
  await page.getByRole('button', {name: '打开 tree-chat'}).click();
  await page.waitForFunction(() => {
    const r = [...document.querySelectorAll('.st-root')].find(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
    return r && r.querySelectorAll('.st-node').length === 5;
  });
  await waitIdle();

  // 1. Hover node 2 article so its + control becomes visible and interactive, then click +
  await cardOf('问题 2').hover();
  const b1 = waitApi('branch');
  await root.getByRole('button', {name: '从 问题 2 新建分支', exact: true}).click();
  const res1 = await (await b1).json();
  assert.ok(res1.sessionId && res1.graph.pendingBranch);
  assert.equal(res1.graph.title, 'tree-chat交互验证', 'tree title must sync from root session title');
  assert.equal(res1.graph.bindings['session-tree-demo'].autoArchived, true, 'root session must be auto-archived when switching to new branch');
  assert.equal(res1.graph.bindings[res1.sessionId].autoArchived, false, 'active branch must remain unarchived');
  await root.locator('.st-node.st-pending.st-current').waitFor();
  await waitIdle();
  assert.equal(await root.locator('.st-node').count(), 6);

  // 2. Repeated click on same node 2 does not create a duplicate session
  await cardOf('问题 2').hover();
  const b2 = waitApi('branch');
  await root.getByRole('button', {name: '从 问题 2 新建分支', exact: true}).click();
  const res2 = await (await b2).json();
  assert.equal(res2.sessionId, res1.sessionId, 'repeated branch click on same parent must reuse pending session');
  await waitIdle();
  assert.equal(await root.locator('.st-node.st-pending').count(), 1);

  // 3. Double-click another node to browse history without cancelling the pending branch; drag pending node & reload preserves it
  const loc4 = waitApi('locate');
  await nodeBtn('问题 4').dblclick();
  await loc4;
  await page.waitForFunction(() => {
    const el = [...document.querySelectorAll('[data-tree-chat-landing]')].find(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(e).visibility !== 'hidden'; });
    return el?.dataset.chatTurn === '4';
  });
  assert.equal(await root.locator('.st-node.st-pending').count(), 1, 'browsing history must not cancel pending branch');

  const pBox = await nodeBtn('新分支').boundingBox();
  const movePending = waitApi('edit');
  await page.mouse.move(pBox.x + pBox.width / 2, pBox.y + pBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(pBox.x + pBox.width / 2 + 72, pBox.y + pBox.height / 2 + 24, {steps: 12});
  await page.mouse.up();
  const movedGraph = await (await movePending).json();
  const draggedPos = movedGraph.pendingBranch?.position;
  assert.ok(draggedPos && Number.isFinite(draggedPos.x) && Number.isFinite(draggedPos.y));
  await waitIdle();

  // Reload and reopen panel if needed; verify pending node and coordinates survive reload
  await page.reload({waitUntil: 'networkidle'});
  if (await root.count() === 0) {
    await page.getByRole('button', {name: '打开 tree-chat'}).click();
  }
  await root.locator('.st-node.st-pending').waitFor();
  await waitIdle();
  const pendingStyleBefore = await root.locator('.st-node.st-pending').evaluate(el => ({left: el.style.left, top: el.style.top}));
  assert.equal(pendingStyleBefore.left, `${draggedPos.x}px`);
  assert.equal(pendingStyleBefore.top, `${draggedPos.y}px`);

  // 4. Double-click pending node to switch to its session and focus composer, then send first message
  await nodeBtn('新分支').dblclick();
  await waitIdle();
  await page.locator('[contenteditable=true]:visible').last().fill('问题 2新枝首轮');
  await page.locator('[contenteditable=true]:visible').last().press('Enter');
  await page.getByText('上下文验证：问题 1 → 问题 2 → 问题 2新枝首轮', {exact: true}).first().waitFor({timeout: 20000});
  await waitPendingCount(0);
  await nodeBtn('问题 2新枝首轮').waitFor();

  const promotedReq = JSON.parse(await readFile(join(artifactsDir, 'last-model-request.json'), 'utf8'));
  assert.deepEqual(humanInputs(promotedReq), ['问题 1', '问题 2', '问题 2新枝首轮']);
  const promotedStyle = await cardOf('问题 2新枝首轮').evaluate(el => ({left: el.style.left, top: el.style.top}));
  assert.equal(promotedStyle.left, `${draggedPos.x}px`, 'promoted node must inherit pending node X coordinate');
  assert.equal(promotedStyle.top, `${draggedPos.y}px`, 'promoted node must inherit pending node Y coordinate');

  // 5. Branch from root ("对话起点" / visible "起点") -> creates empty context branch, verify cancel & root message
  await cardOf('对话起点').hover();
  const bRoot1 = waitApi('branch');
  await root.getByRole('button', {name: '从 对话起点 新建分支', exact: true}).click();
  const rootBranch1 = await (await bRoot1).json();
  assert.equal(rootBranch1.graph.pendingBranch.parent, 'root');
  await root.locator('.st-node.st-pending.st-current').waitFor();
  await waitIdle();

  // Explicit deletion is in the normal node menu; empty nodes have no temporary × control.
  await root.locator('.st-pending.st-current .st-node-body').click({button:'right'});
  const cancelRes = waitApi('cancel-branch');
  await root.getByRole('menuitem', {name: '删除空分支', exact: true}).click();
  const afterCancel = await (await cancelRes).json();
  assert.equal(afterCancel.graph.pendingBranch, undefined);
  assert.equal(afterCancel.sessionId, res1.sessionId);
  assert.equal(afterCancel.graph.bindings[res1.sessionId].autoArchived, false);
  assert.equal(afterCancel.graph.bindings[rootBranch1.sessionId].autoArchived, true);
  await waitPendingCount(0);
  await waitIdle();

  // Create root branch again and actually send a message to verify zero prior user context
  await cardOf('对话起点').hover();
  const bRoot2 = waitApi('branch');
  await root.getByRole('button', {name: '从 对话起点 新建分支', exact: true}).click();
  await bRoot2;
  await root.locator('.st-node.st-pending.st-current').waitFor();
  await waitIdle();
  await page.locator('[contenteditable=true]:visible').last().fill('问题 根分枝首轮');
  await page.locator('[contenteditable=true]:visible').last().press('Enter');
  await page.getByText('上下文验证：问题 根分枝首轮', {exact: true}).first().waitFor({timeout: 20000});
  await nodeBtn('问题 根分枝首轮').waitFor();
  const rootReq = JSON.parse(await readFile(join(artifactsDir, 'last-model-request.json'), 'utf8'));
  assert.deepEqual(humanInputs(rootReq), ['问题 根分枝首轮'], 'branch from root must not include any prior user turns');

  // 6. Resume another existing leaf branch ("问题 4") via "继续这条分支" -> unarchives root and archives others
  await nodeBtn('问题 4').click({button: 'right'});
  await root.getByRole('menu', {name: '节点菜单'}).waitFor();
  const actLeaf = waitApi('activate');
  await root.getByRole('menuitem', {name: '继续这条分支', exact: true}).click();
  const resumed = await (await actLeaf).json();
  assert.equal(resumed.sessionId, 'session-tree-demo');
  assert.equal(resumed.graph.bindings['session-tree-demo'].autoArchived, false);
  assert.equal(resumed.graph.bindings[res1.sessionId].autoArchived, true);
  await root.locator('.st-current .st-node-title').filter({hasText: '问题 4'}).waitFor();
  await waitIdle();
} finally {
  await browser.close();
}
