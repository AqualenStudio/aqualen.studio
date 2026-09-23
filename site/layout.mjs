// 静态页面共用结构；构建后直接部署根目录 HTML，无需运行时依赖。
export const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export const t = (en, ja, tag = 'span', attrs = '') => `<${tag} data-ja="${esc(ja)}" ${attrs}>${esc(en)}</${tag}>`;
export const arrow = '<span class="arrow" aria-hidden="true">↗</span>';
export const link = (href, en, ja, cls = 'text-link') => `<a class="${cls}" href="${href}">${t(en, ja)}${arrow}</a>`;
export const seal = '<span class="studio-seal" aria-hidden="true"><img src="/assets/img/logo-mark.webp" alt="" width="48" height="48"></span>';
const navItems = [['index.html', 'Home', 'ホーム'], ['projects.html', 'Games', '作品'], ['devlog.html', 'Journal', '開発日誌'], ['about.html', 'Studio', 'スタジオ']];
export function render(page) {
  const navGroup = page.nav || page.file;
  const url = `https://aqualen.studio/${page.file === 'index.html' ? '' : page.file}`;
  const title = page.title + ' — Aqualen Studio';
  const social = page.image || 'logo-512_512.webp';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <meta name="theme-color" content="#101f2b">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="/assets/img/logo-512_512.webp">
  <meta property="og:type" content="${page.article ? 'article' : 'website'}">
  <meta property="og:site_name" content="Aqualen Studio">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="https://aqualen.studio/assets/img/${social}">
  <meta name="twitter:card" content="${page.image ? 'summary_large_image' : 'summary'}">
  ${page.heroImage ? `<link rel="preload" as="image" href="/assets/img/${page.heroImage}">` : ''}
  <link rel="stylesheet" href="/assets/css/style.css">
  <link rel="preload" href="/assets/fonts/cormorant-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/rpg.css">
  ${page.prototype ? '<link rel="stylesheet" href="/assets/css/prototype.css">' : ''}
  <script src="/assets/js/site.js" defer></script>
</head>
<body class="${page.bodyClass || ''}">
  <a class="skip-link" href="#main">${t('Skip to content', '本文へ移動')}</a>
  <header class="site-header">
    <div class="nav-shell">
      <a class="brand" href="/" aria-label="Aqualen Studio home">${seal}<span class="wordmark">AQUALEN<small>INDEPENDENT GAME STUDIO</small></span></a>
      <button class="menu-toggle" type="button" aria-controls="primary-nav" aria-expanded="false">${t('Menu', 'メニュー')}<span aria-hidden="true">＋</span></button>
      <nav class="primary-nav" id="primary-nav" aria-label="Primary">
        ${navItems.map(([file, en, ja], i) => `<a href="/${file === 'index.html' ? '' : file}" ${navGroup === file ? 'aria-current="page"' : ''}><small aria-hidden="true">0${i + 1}</small>${t(en, ja)}</a>`).join('\n        ')}
        <div class="language" role="group" aria-label="Language"><button type="button" data-lang="en" aria-pressed="true">EN</button><span aria-hidden="true">/</span><button type="button" data-lang="ja" aria-pressed="false">JP</button></div>
        <a class="nav-contact" href="/about.html#contact">${t('Get in touch', 'お問い合わせ')}${arrow}</a>
      </nav>
    </div>
  </header>
  <main id="main" tabindex="-1">${page.content}</main>
  <footer class="site-footer">
    <div class="container footer-top">
      <div><a class="brand" href="/">${seal}<span class="wordmark">AQUALEN<small>INDEPENDENT GAME STUDIO</small></span></a>${t('A little mystery. A world of possibility.', '小さな謎から、世界が広がる。', 'p', 'class="footer-motto"')}</div>
      <div class="footer-column"><p class="eyebrow">${t('Explore', '探索')}</p>${link('/projects.html', 'Our games', '作品一覧')}${link('/devlog.html', 'Journal', '開発日誌')}${link('/demo-rogue.html', 'Playable prototype', 'プレイできるプロトタイプ')}</div>
      <div class="footer-column"><p class="eyebrow">${t('Connect', 'つながる')}</p>${link('mailto:contact@aqualen.studio', 'Business & press', 'ビジネス・取材')}${link('https://github.com/AqualenStudio', 'GitHub', 'GitHub')}${link('/about.html', 'About the studio', 'スタジオについて')}</div>
    </div>
    <div class="container footer-bottom"><span>© <span data-year>2026</span> Aqualen Studio · Joytoart Gaming Ltd. · Cyprus, EU</span><div>${link('/privacy.html', 'Privacy', 'プライバシー')}<button class="motion-toggle" type="button" aria-pressed="false" hidden>${t('Reduce motion', '動きを抑える')}</button><a href="#main" class="back-top" aria-label="Back to top">↑</a></div></div>
  </footer>
  <dialog class="media-dialog" aria-labelledby="media-title"><div class="dialog-bar"><h2 id="media-title">Inkighter · Official trailer</h2><button type="button" class="dialog-close" aria-label="Close video">×</button></div><div class="video-mount"></div><p>${link('https://www.youtube.com/watch?v=JokkS_4qgRA', 'Watch on YouTube', 'YouTubeで見る')}</p></dialog>
  ${page.prototype ? '<script type="module" src="/assets/js/rogue-survivor.js"></script>' : ''}
</body>
</html>
`.replace(/[ \t]+$/gm, '');
}

export const sectionTitle = (n, en, ja, desc = '', href = '') => `<div class="section-heading"><div><p class="eyebrow"><span>${n}</span> / AQUALEN STUDIO</p>${t(en, ja, 'h2')}${desc ? `<p class="section-description">${desc}</p>` : ''}</div>${href ? link(href, 'View all', 'すべて見る') : ''}</div>`;
export const pageTitle = (label, en, ja, description) => `<section class="page-heading container"><p class="eyebrow">AQUALEN STUDIO / ${label}</p>${t(en, ja, 'h1')}<div class="heading-foot">${description}<span class="heading-star" aria-hidden="true">✧</span></div></section>`;
export const orbit = '<div class="orbit" aria-hidden="true"><i></i><i></i><i></i><span>✦</span></div>';
export const status = (en, ja, cls = '') => `<span class="status ${cls}">${t(en, ja)}</span>`;
export const newsRow = () => `<a class="news-row" href="/post-2026-01-13.html"><time datetime="2026-01-13">2026.01.13</time><span class="news-type">${t('Studio', 'スタジオ')}</span>${t('A new home for Aqualen Studio', 'Aqualen Studio、新たなホームへ', 'h3')}${arrow}</a>`;
export const contactBand = () => `<section class="contact-band container"><div><p class="eyebrow">LET’S CONNECT</p>${t('Good things start with a conversation.', '新しい出会いは、ひとつの対話から。', 'h2')}</div>${link('mailto:contact@aqualen.studio', 'Get in touch', 'お問い合わせ', 'button button-gold')}</section>`;
