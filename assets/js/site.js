(() => {
  'use strict';
  // 浏览器存储被禁用时，导航和页面内容仍然工作。
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch { /* 会话内设置仍然有效。 */ } };
  const root = document.documentElement;
  const translated = [...document.querySelectorAll('[data-ja]')];
  const original = new Map(translated.map(el => [el, el.textContent]));
  const languageButtons = document.querySelectorAll('[data-lang]');
  function applyLanguage(lang) {
    root.lang = lang;
    translated.forEach(el => { el.textContent = lang === 'ja' ? el.dataset.ja : original.get(el); });
    languageButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === lang)));
  }
  languageButtons.forEach(button => button.addEventListener('click', () => {
    const lang = button.dataset.lang;
    save('aqualen_lang', lang);
    applyLanguage(lang);
  }));
  applyLanguage(read('aqualen_lang') === 'ja' ? 'ja' : 'en');
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // 移动导航：支持 Escape、点选链接与桌面断点恢复。
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');
  const narrow = matchMedia('(max-width: 800px)');
  const closeMenu = () => { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
  });
  narrow.addEventListener('change', closeMenu);
  document.body.classList.add('menu-ready');
  window.addEventListener('pageshow', closeMenu);

  // 作品状态筛选只增强展示；无脚本时仍显示所有作品。
  const filters = document.querySelector('.filter-bar');
  if (filters) {
    filters.hidden = false;
    const cards = [...document.querySelectorAll('.catalogue [data-status]')];
    const buttons = filters.querySelectorAll('[data-filter]');
    buttons.forEach(button => button.addEventListener('click', () => {
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      let visible = 0;
      cards.forEach(card => {
        card.hidden = button.dataset.filter !== 'all' && card.dataset.status !== button.dataset.filter;
        if (!card.hidden) visible++;
      });
      filters.querySelector('.filter-count').textContent = String(visible);
    }));
  }

  // 原生 dialog 管理焦点；关闭弹窗即卸载视频，阻止后台继续播放。
  const dialog = document.querySelector('.media-dialog');
  const mount = dialog.querySelector('.video-mount');
  let videoTrigger = null;
  if (typeof dialog.showModal === 'function') {
    document.querySelectorAll('[data-video]').forEach(trigger => trigger.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      videoTrigger = trigger;
      const frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/JokkS_4qgRA?autoplay=1&rel=0';
      frame.title = 'Inkighter official trailer';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      mount.replaceChildren(frame);
      dialog.showModal();
    }));
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const r = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => { mount.replaceChildren(); videoTrigger?.focus(); });
  }

  // 系统减少动态效果优先。自定义偏好跨页面保留。
  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('.motion-toggle');
  let userReduced = read('aqualen_reduce_motion') === 'true';
  let observer;
  function applyMotion() {
    const reduced = systemMotion.matches || userReduced;
    root.classList.toggle('motion-reduced', reduced);
    motionButton.setAttribute('aria-pressed', String(reduced));
    motionButton.disabled = systemMotion.matches;
    motionButton.title = systemMotion.matches ? 'Reduced motion follows your system preference.' : '';
    if (reduced) {
      observer?.disconnect();
      document.querySelectorAll('.reveal-pending').forEach(el => el.classList.remove('reveal-pending'));
    }
  }
  motionButton.hidden = false;
  motionButton.addEventListener('click', () => { userReduced = !userReduced; save('aqualen_reduce_motion', String(userReduced)); applyMotion(); });
  systemMotion.addEventListener('change', applyMotion);
  applyMotion();
  // 短促纹章反馈：尊重减少动效，不拦截链接，不影响游戏操作。
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || root.classList.contains('motion-reduced')) return;
    if (!(event.target instanceof Element) || event.target.closest('.prototype-shell')) return;
    if (!event.target.closest('.button, .primary-nav a, .filter-bar button, .language button')) return;
    const spark = document.createElement('span');
    spark.className = 'ui-spark';
    spark.setAttribute('aria-hidden', 'true');
    spark.style.left = `${event.clientX}px`;
    spark.style.top = `${event.clientY}px`;
    document.body.append(spark);
    setTimeout(() => spark.remove(), 500);
  });
  if (!root.classList.contains('motion-reduced') && 'IntersectionObserver' in window) {
    // 只对首屏以下的区块应用入场，确保主要内容立即可见。
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('reveal-pending'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll('.section-heading, .home-games, .film-grid, .studio-copy, .news-row').forEach(el => {
      el.dataset.reveal = '';
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('reveal-pending'); observer.observe(el); }
    });
    document.body.classList.add('reveal-ready');
  }
})();
