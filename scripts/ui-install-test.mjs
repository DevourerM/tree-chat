import {writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {launchBrowser, pluginRoot, resolveArtifactsDir} from './_env.mjs';

const artifactsDir = resolveArtifactsDir();
const browser = await launchBrowser();
try{
  const page=await browser.newPage({viewport:{width:1480,height:980}});page.setDefaultTimeout(20000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2],{waitUntil:'networkidle'});
  for(let attempt=0;attempt<3;attempt++){
    const startup=page.getByRole('button',{name:/^(继续|稍后配置)$/}).first();
    try{await startup.waitFor({state:'visible',timeout:3000});await startup.click();}catch{break;}
  }
  await page.screenshot({path:join(artifactsDir,'install-ui-before.png'),fullPage:true});
  await page.getByText('插件',{exact:true}).first().click();
  await page.getByRole('button',{name:'添加插件',exact:true}).click();
  const {version}=JSON.parse(await readFile(join(pluginRoot,'package.json'),'utf8'));
  const packageSpec=process.env.TREE_PLUGIN_SPEC || join(pluginRoot,`dist/tree-chat-${version}.tgz`);
  await page.getByRole('textbox',{name:'包名或地址',exact:true}).fill(packageSpec);
  await page.getByRole('button',{name:'安装',exact:true}).click();
  await page.getByText('tree-chat',{exact:true}).first().waitFor({timeout:120000});
  const enable=page.getByRole('button',{name:'立即启用',exact:true});
  await enable.waitFor({state:'visible'});await enable.click();await enable.waitFor({state:'hidden'});
  await page.screenshot({path:join(artifactsDir,'standard-plugin-install.png'),fullPage:true});
  await writeFile(join(artifactsDir,'install-ui-state.txt'),await page.locator('body').innerText());
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('PASS: standard tgz package installed and enabled via DSH UI.');
}finally{await browser.close();}
