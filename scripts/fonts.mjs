// 按站点文字下载 OFL 字体子集；仅更新字体时运行，构建与访客访问均不依赖外网。
import { mkdir, writeFile } from 'node:fs/promises';
import { pages } from '../site/pages.mjs';
import { render } from '../site/layout.mjs';
const directory = new URL('../assets/fonts/', import.meta.url);
await mkdir(directory, { recursive: true });
const japanese = [...new Set(pages.map(render).join('').match(/[^\u0000-\u007f]/gu))].sort().join('');
const latin = Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)).join('') + '—’·©';
const fonts = [
  ['Cormorant Garamond', 'cormorant-latin', latin, 'cormorantgaramond'],
  ['Noto Serif JP', 'noto-serif-jp', japanese, 'notoserifjp'],
];
for (const [family, name, text, folder] of fonts) {
  const url = new URL('https://fonts.googleapis.com/css2');
  url.search = new URLSearchParams({ family: `${family}:wght@500`, display: 'swap', text });
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' } });
  if (!response.ok) throw new Error(`Font CSS ${response.status}`);
  const css = await response.text();
  const asset = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]woff2['"]\)/);
  if (!asset || new URL(asset[1]).hostname !== 'fonts.gstatic.com') throw new Error(`Expected official WOFF2 subset: ${css}`);
  const font = await fetch(asset[1]);
  if (!font.ok) throw new Error(`Font download ${font.status}`);
  const bytes = new Uint8Array(await font.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 4)) !== 'wOF2') throw new Error('Invalid WOFF2');
  await writeFile(new URL(`${name}.woff2`, directory), bytes);
  const license = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${folder}/OFL.txt`);
  if (!license.ok) throw new Error(`Font license ${license.status}`);
  await writeFile(new URL(`${name}-OFL.txt`, directory), await license.text());
  console.log(`${family}: ${bytes.length} bytes; license saved`);
}
