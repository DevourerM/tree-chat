import {existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';

export const pluginRoot = resolve(import.meta.dirname, '..');

function firstExisting(candidates) {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return resolve(candidate);
  }
  return null;
}

export function resolveArtifactsDir() {
  if (process.env.TREE_ARTIFACTS) return resolve(process.env.TREE_ARTIFACTS);
  return firstExisting([
    resolve(pluginRoot, '../artifacts'),
    resolve(pluginRoot, 'artifacts')
  ]) ?? resolve(pluginRoot, 'artifacts');
}

export function resolveDshRuntime() {
  const hit = firstExisting([
    process.env.DSH_DEV_RUNTIME,
    resolve(pluginRoot, 'research/dsh/node_modules'),
    resolve(pluginRoot, '../research/dsh/node_modules'),
    resolve(pluginRoot, '../../research/dsh/node_modules')
  ]);
  if (!hit) {
    throw new Error('未找到 DSH 开发运行时 node_modules。请设置环境变量 DSH_DEV_RUNTIME=/path/to/dsh/node_modules');
  }
  return hit;
}

export async function importDshPackage(subpath) {
  const runtime = resolveDshRuntime();
  const target = resolve(runtime, subpath);
  if (!existsSync(target)) {
    throw new Error(`DSH 运行时缺少模块：${target}（请检查 DSH_DEV_RUNTIME）`);
  }
  return import(pathToFileURL(target).href);
}

export async function loadPlaywright() {
  const hit = firstExisting([
    process.env.TREE_PLAYWRIGHT,
    resolve(pluginRoot, 'node_modules/playwright/index.mjs'),
    resolve(pluginRoot, 'artifacts/browser-tools/node_modules/playwright/index.mjs'),
    resolve(pluginRoot, '../artifacts/browser-tools/node_modules/playwright/index.mjs'),
    resolve(pluginRoot, '../../artifacts/browser-tools/node_modules/playwright/index.mjs')
  ]);
  if (hit) return import(pathToFileURL(hit).href);
  try {
    return await import('playwright');
  } catch {
    throw new Error('未找到 Playwright。请设置环境变量 TREE_PLAYWRIGHT=/path/to/playwright/index.mjs');
  }
}

export async function launchBrowser(options = {}) {
  const {chromium} = await loadPlaywright();
  const executablePath = process.env.TREE_CHROMIUM?.trim() || undefined;
  return chromium.launch({
    headless: true,
    ...(executablePath ? {executablePath} : {}),
    ...options
  });
}

export function resolveTestHome(defaultSubdir = 'test-home-v4') {
  if (process.env.TREE_TEST_HOME) return resolve(process.env.TREE_TEST_HOME);
  return join(resolveArtifactsDir(), defaultSubdir);
}
