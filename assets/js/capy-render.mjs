import { WORLD, clamp } from './capy-core.mjs';

// 固定世界、响应式镜头：手机裁切视野而不是缩小角色或改变碰撞区域。
export async function createRenderer(canvas, stage) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const images = {};
  const missing = [];
  await Promise.all(['player', 'enemy', 'boss', 'bg-paper'].map(key => new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      let crop = { x: 0, y: 0, w: image.width, h: image.height };
      if (key !== 'bg-paper') {
        // 去除素材透明留白，不改写原始文件，统一可见角色的比例。
        const buffer = document.createElement('canvas');
        buffer.width = image.width; buffer.height = image.height;
        const c = buffer.getContext('2d', { willReadFrequently: true });
        c.drawImage(image, 0, 0);
        const data = c.getImageData(0, 0, image.width, image.height).data;
        let left = image.width, right = 0, top = image.height, bottom = 0;
        for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
          if (data[(y * image.width + x) * 4 + 3] > 12) {
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
        }
        if (right >= left) crop = { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
      }
      images[key] = { image, crop }; resolve();
    };
    image.onerror = () => { missing.push(key); resolve(); };
    image.src = `/assets/img/${key}.webp`;
  })));
  const view = { width: 0, height: 0, scale: 1, x: 0, dpr: 1 };
  function resize() {
    const rect = stage.getBoundingClientRect();
    view.width = rect.width; view.height = rect.height;
    view.dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * view.dpr);
    canvas.height = Math.round(rect.height * view.dpr);
    view.scale = Math.max(rect.width / WORLD.width, rect.height / WORLD.height);
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  function ellipse(x, y, rx, ry, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  function sprite(key, x, y, size, facing = 1, rotation = 0, alpha = 1, flash = false) {
    const asset = images[key];
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.scale(facing, 1); ctx.globalAlpha *= alpha;
    if (asset) {
      const c = asset.crop, height = size * c.h / c.w;
      if (flash) ctx.filter = 'brightness(1.9)';
      ctx.drawImage(asset.image, c.x, c.y, c.w, c.h, -size / 2, -height + 22, size, height);
    } else {
      ellipse(0, 0, size / 3, size / 3, key === 'player' ? '#dfb779' : '#879b4f');
    }
    ctx.restore();
  }
  function ring(x, y, r, color, width = 2) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  }
  let idleFrame = '';
  function render(game, reduced) {
    const signature = `${game.mode}:${view.width}:${view.height}:${reduced}`;
    if (game.mode !== 'play' && idleFrame === signature) return;
    idleFrame = game.mode === 'play' ? '' : signature;
    const { player, enemies, boss, bullets, gems, particles, trails, time, mode } = game;
    const { width, height, scale, dpr } = view;
    const visibleWidth = width / scale, visibleHeight = height / scale;
    view.x = clamp(player.x - visibleWidth / 2, 0, WORLD.width - visibleWidth);
    const cameraY = clamp(player.y - visibleHeight * .58, 0, WORLD.height - visibleHeight);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#233b30'; ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.scale(scale, scale); ctx.translate(-view.x, -cameraY);
    if (!reduced && game.shake > 0 && mode === 'play') ctx.translate(Math.sin(time * 105) * game.shake, Math.cos(time * 89) * game.shake * .6);
    if (images['bg-paper']) ctx.drawImage(images['bg-paper'].image, 0, 0, WORLD.width, WORLD.height);
    else { ctx.fillStyle = '#81915c'; ctx.fillRect(0, 0, WORLD.width, WORLD.height); }
    // 柔和林间光束与远景遮罩，不使用全屏闪烁。
    const light = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height);
    light.addColorStop(0, 'rgba(244,224,164,.19)'); light.addColorStop(.6, 'rgba(245,225,155,0)'); light.addColorStop(1, 'rgba(18,39,32,.18)');
    ctx.fillStyle = light; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = 'rgba(255,238,185,.045)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(230 + i * 280, 0); ctx.lineTo(270 + i * 280, 0); ctx.lineTo(550 + i * 280, 600); ctx.lineTo(370 + i * 280, 600); ctx.fill();
    }
    for (let i = 0; i < 18; i++) {
      const phase = reduced ? 0 : time;
      ellipse((i * 173 + phase * (3 + i % 3)) % WORLD.width, 180 + (i * 79) % 420 + Math.sin(phase + i) * 4, 1.5, 1.5, 'rgba(255,239,175,.55)');
    }
    for (const gem of gems) {
      const bob = reduced ? 0 : Math.sin(time * 3 + gem.x) * 2;
      ellipse(gem.x, gem.y + 4, 8, 3, 'rgba(35,56,37,.18)');
      ctx.save(); ctx.translate(gem.x, gem.y - 4 + bob); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#4b9587'; ctx.fillRect(-5, -5, 10, 10);
      ctx.strokeStyle = '#fff0bf'; ctx.lineWidth = 1.5; ctx.strokeRect(-5, -5, 10, 10); ctx.restore();
    }
    if (!reduced) for (const trail of trails) sprite('player', trail.x, trail.y, 76, trail.facing, 0, trail.life / .22 * .24);
    const actors = [...enemies, ...(boss ? [boss] : []), player].sort((a, b) => a.y - b.y);
    for (const actor of actors) {
      const isPlayer = actor === player, isBoss = actor === boss;
      const size = isPlayer ? 76 : isBoss ? 142 : 70;
      const active = mode === 'play' && !reduced;
      const bob = active ? Math.sin(time * (isPlayer ? 14 : 10) + actor.x) * (isPlayer ? player.moving * 2 : 2) : 0;
      ellipse(actor.x, actor.y + 18, size * .3, size * .075, 'rgba(29,48,31,.24)');
      if (isBoss && actor.warning > 0) {
        ctx.save(); ctx.setLineDash([7, 6]); ring(actor.x, actor.y, 88, '#b75836', 3); ctx.restore();
        ellipse(actor.x, actor.y, 88 * (1 - actor.warning / 1.15), 88 * (1 - actor.warning / 1.15), 'rgba(163,64,35,.1)');
      }
      if (isPlayer) {
        ring(actor.x, actor.y + 15, 29, 'rgba(250,237,186,.75)', 1.5);
        if (player.dashReady > 0) {
          ctx.strokeStyle = '#4c8176'; ctx.lineWidth = 3; ctx.beginPath();
          ctx.arc(actor.x, actor.y + 15, 29, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - player.dashReady / player.dashCd)); ctx.stroke();
        }
      }
      sprite(isPlayer ? 'player' : isBoss ? 'boss' : 'enemy', actor.x, actor.y + bob, size, actor.facing, active ? Math.sin(time * 7) * .025 : 0, 1, !reduced && actor.flash > 0);
      if (isPlayer && player.invulnerable > 0) ring(actor.x, actor.y - 8, 38, '#fff0c2', 2);
      if (isPlayer && player.shield > 0) for (let i = 0; i < player.shield; i++) {
        const a = (reduced ? 0 : time) + i * Math.PI * 2 / player.shield;
        ellipse(actor.x + Math.cos(a) * 39, actor.y - 8 + Math.sin(a) * 21, 4, 4, '#c7e3d3');
      }
      if (!isPlayer && !isBoss && actor.hp < actor.maxHp) {
        ctx.fillStyle = '#344638'; ctx.fillRect(actor.x - 18, actor.y - 44, 36, 3);
        ctx.fillStyle = '#f1d39a'; ctx.fillRect(actor.x - 18, actor.y - 44, 36 * clamp(actor.hp / actor.maxHp, 0, 1), 3);
      }
    }
    for (const bullet of bullets) {
      const a = Math.atan2(bullet.vy, bullet.vx);
      ctx.save(); ctx.translate(bullet.x, bullet.y - 8); ctx.rotate(a);
      ctx.strokeStyle = '#fff2c7'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(5, 0); ctx.stroke();
      ctx.strokeStyle = '#514628'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#fff2c7'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(2, -4); ctx.lineTo(2, 4); ctx.fill(); ctx.restore();
    }
    for (const p of particles) {
      ctx.save(); ctx.globalAlpha = clamp(p.life / p.duration, 0, 1);
      if (p.kind === 'text') {
        ctx.font = '600 14px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = p.color; ctx.strokeStyle = '#304532'; ctx.lineWidth = 3;
        ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y);
      } else if (p.kind === 'ring') {
        ring(p.x, p.y, (1 - p.life / p.duration) * p.size + 8, p.color, 2);
      } else {
        ctx.translate(p.x, p.y); ctx.rotate(p.life * 4); ellipse(0, 0, p.size, p.size * .4, p.color);
      }
      ctx.restore();
    }
    ctx.restore();
    // 暗角固定在视口，避免随角色移动产生明暗跳动。
    const vignette = ctx.createRadialGradient(width / 2, height / 2, height * .2, width / 2, height / 2, Math.max(width, height) * .7);
    vignette.addColorStop(0, 'rgba(13,35,26,0)'); vignette.addColorStop(1, 'rgba(13,35,26,.3)');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
  }
  return { render, missing };
}
