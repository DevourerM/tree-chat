import {cp, writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pluginRoot, resolveTestHome} from './_env.mjs';

const home = resolveTestHome('test-home-v4');
const target = join(home, 'profiles/web/node_modules/tree-chat');
await mkdir(target, {recursive: true});
for (const file of ['lib', 'assets', 'locale', 'package.json', 'cordis.patch.yml']) {
  await cp(join(pluginRoot, file), join(target, file), {recursive: true});
}
const profile = join(home, 'profiles/web');
await mkdir(profile, {recursive: true});
await writeFile(join(profile, 'package.json'), JSON.stringify({
  name: 'tree-isolated-test',
  private: true,
  dependencies: {'tree-chat': 'file:' + pluginRoot.replaceAll('\\', '/')},
  dsh: {profile: {bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'tree-chat']}}
}, null, 2));
await writeFile(
  join(profile, 'cordis.patch.yml'),
  '- id: locale\n  config:\n    preference: zh\n- insert:\n    - id: tree-test-fixture\n      name: ' +
    JSON.stringify(join(pluginRoot, 'scripts/dev-fixture.mjs').replaceAll('\\', '/')) + '\n'
);
console.log('Prepared isolated DSH profile:', home);
