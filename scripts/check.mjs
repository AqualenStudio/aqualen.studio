import { readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pages } from '../site/pages.mjs';
import { render } from '../site/layout.mjs';
const root = new URL('../', import.meta.url);
const failures = [];
const docs = new Map();
for (const page of pages) docs.set(page.file, await readFile(new URL(page.file, root), 'utf8'));
// 检查生成文件是否与源模板一致，并检查真实本地链接与锚点。
for (const page of pages) {
  const html = docs.get(page.file);
  if (html !== render(page)) failures.push(`${page.file}: generated file is stale; run node scripts/build.mjs`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  if (new Set(ids).size !== ids.length) failures.push(`${page.file}: duplicate IDs`);
  if ([...html.matchAll(/<h1\b/g)].length !== 1) failures.push(`${page.file}: expected one h1`);
  if (!html.includes('rel="canonical"')) failures.push(`${page.file}: missing canonical`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(https?:|mailto:|data:)/.test(value)) continue;
    const [pathname, fragment] = value.split('#');
    const target = pathname === '/' ? 'index.html' : pathname ? pathname.replace(/^\//, '') : page.file;
    try { await access(new URL(target, root)); } catch { failures.push(`${page.file}: missing ${value}`); }
    if (fragment && docs.has(target) && !docs.get(target).includes(`id="${fragment}"`)) failures.push(`${page.file}: missing anchor ${value}`);
  }
}
// 原型的 DOM ID 来自现有游戏脚本，防止换皮时破坏启动与按钮。
const game = await readFile(new URL('assets/js/rogue-survivor.js', root), 'utf8');
for (const [, id] of game.matchAll(/getElementById\("([^"]+)"\)/g)) {
  if (!docs.get('demo-rogue.html').includes(`id="${id}"`)) failures.push(`prototype: missing required #${id}`);
}
const gameIds = game.match(/const ids = \[([^\]]+)\]/)?.[1] || '';
for (const [, id] of gameIds.matchAll(/'([^']+)'/g)) {
  if (!docs.get('demo-rogue.html').includes(`id="${id}"`)) failures.push(`prototype: missing required #${id}`);
}
for (const file of ['assets/js/site.js', 'assets/js/rogue-survivor.js', 'assets/js/capy-core.mjs', 'assets/js/capy-render.mjs', 'scripts/fonts.mjs', 'scripts/test-capy.mjs', 'scripts/build.mjs', 'scripts/serve.mjs', 'site/pages.mjs', 'site/layout.mjs', 'site/prototype.mjs']) {
  const check = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(file, root))], { encoding: 'utf8' });
  if (check.status !== 0) failures.push(`${file}: ${check.stderr}`);
}
// 检查 CSS 内本地字体和纹理，避免网页可打开但视觉资源静默缺失。
for (const file of ['style.css', 'rpg.css', 'prototype.css']) {
  const css = await readFile(new URL(`assets/css/${file}`, root), 'utf8');
  for (const [, value] of css.matchAll(/url\(['"]?(\/[^)'"\s]+)['"]?\)/g)) {
    try { await access(new URL(value.slice(1), root)); } catch { failures.push(`${file}: missing ${value}`); }
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${pages.length} pages; generated-file parity, local links, fragments, unique IDs, metadata and prototype DOM contract; JavaScript syntax.`);
