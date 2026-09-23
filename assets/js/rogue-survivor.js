import { WORLD, clamp, constrain, damagePlayer, gainXP, segmentHits } from './capy-core.mjs';
import { createRenderer } from './capy-render.mjs';

// #region 界面与状态：保留原型玩法和既有最高分，游戏不接管全站键盘。
const ids = ['stage', 'game', 'btnStart', 'btnPause', 'btnRestart', 'btnResume', 'btnAgain', 'btnDash', 'uiDash', 'startScreen', 'pauseScreen', 'overlay', 'overGame', 'cards', 'overlayTitle', 'gameNotice', 'loadStatus', 'uiTime', 'uiLevel', 'uiScore', 'uiBest', 'uiHp', 'uiHpBar', 'uiXpBar', 'goTime', 'goLevel', 'goScore', 'goBest', 'touchControls', 'touchHint', 'joystick', 'joystickKnob', 'bossBanner', 'bossHp', 'buildSummary'];
const ui = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const shell = document.querySelector('.prototype-shell');
// 游戏内覆盖层不是整页模态窗口；网站导航仍可操作，Tab 可以离开游戏。
ui.stage.querySelectorAll('[role="dialog"]').forEach(panel => panel.setAttribute('aria-modal', 'false'));
const key = 'aqualen_rogue_best_final_v3';
const rand = (min, max) => min + Math.random() * (max - min);
const timeText = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
let best = 0;
try { const saved = Number(localStorage.getItem(key)); best = Number.isFinite(saved) && saved > 0 ? saved : 0; } catch { /* 禁用存储时仍能游玩。 */ }
const freshPlayer = () => ({ x: 582, y: 433, r: 22, facing: 1, hp: 100, hpMax: 100, speed: 220, fireRate: 2.6, bulletDamage: 12, bulletSpeed: 520, bulletCount: 1, spread: .18, pierce: 0, magnet: 80, dashCd: 1.2, dashReady: 0, dashTime: 0, dashX: 1, dashY: 0, shield: 0, shieldTimer: 0, invulnerable: 0, flash: 0, moving: 0 });
const game = { mode: 'ready', time: 0, score: 0, kills: 0, shake: 0, player: freshPlayer(), enemies: [], bullets: [], gems: [], particles: [], trails: [], boss: null };
const xp = { level: 1, current: 0, need: 30 };
const levels = {}, evolved = new Set(), keys = new Set();
let spawnTimer = 0, shotTimer = 0, nextBoss = 120, pendingLevels = 0, choices = [], noticeTimer;
let renderer, inputPointer = null, stick = { x: 0, y: 0 }, last = 0, accumulator = 0, hudTimer = 0;
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => systemMotion.matches || document.documentElement.classList.contains('motion-reduced');
const upgrades = [
  { id: 'firerate', icon: '»', title: 'Swift Brush', desc: '+20% fire rate', apply: p => p.fireRate *= 1.2 },
  { id: 'damage', icon: '✦', title: 'Heavy Ink', desc: '+25% damage', apply: p => p.bulletDamage *= 1.25 },
  { id: 'multishot', icon: '⋔', title: 'Twin Strokes', desc: '+1 projectile', apply: p => p.bulletCount++ },
  { id: 'pierce', icon: '↗', title: 'Piercing Script', desc: '+1 pierce', apply: p => p.pierce++ },
  { id: 'movespeed', icon: '⌁', title: 'Light Steps', desc: '+12% move speed', apply: p => p.speed *= 1.12 },
  { id: 'maxhp', icon: '✚', title: 'Ink Vitality', desc: '+20 max HP · recover 20 HP', apply: p => { p.hpMax += 20; p.hp = Math.min(p.hpMax, p.hp + 20); } },
  { id: 'magnet', icon: '◎', title: 'Relic Pull', desc: '+35 pickup radius', apply: p => p.magnet += 35 },
  { id: 'bulletspeed', icon: '➶', title: 'Sharper Current', desc: '+18% projectile speed', apply: p => p.bulletSpeed *= 1.18 },
  { id: 'shield', icon: '◇', title: 'Xuanwu Aegis', desc: '+1 shield charge · recharges in 10s', apply: p => { p.shield = Math.min(3, p.shield + 1); p.shieldTimer = 0; } },
];
function clearInput() {
  keys.clear(); stick = { x: 0, y: 0 };
  if (inputPointer !== null && ui.joystick.hasPointerCapture(inputPointer)) ui.joystick.releasePointerCapture(inputPointer);
  inputPointer = null; ui.joystickKnob.style.transform = '';
}
function setMode(mode, moveFocus = true) {
  clearInput(); game.mode = mode; accumulator = 0;
  const panels = { ready: ui.startScreen, pause: ui.pauseScreen, levelup: ui.overlay, gameover: ui.overGame };
  Object.values(panels).forEach(panel => panel.classList.toggle('show', panel === panels[mode]));
  const modal = panels[mode];
  // 模态层之外的游戏操作不进入 Tab 顺序。
  ui.stage.querySelectorAll(':scope > *').forEach(el => { el.inert = !!modal && el !== modal; });
  shell.querySelector('.topbar').inert = !!modal;
  ui.btnPause.disabled = mode !== 'play';
  ui.btnRestart.disabled = mode !== 'play';
  ui.touchControls.hidden = mode !== 'play';
  ui.touchHint.hidden = mode !== 'play';
  if (moveFocus) (modal?.querySelector('button:not(:disabled)') || ui.stage).focus({ preventScroll: true });
  updateHUD();
}
function notify(message) {
  clearTimeout(noticeTimer); ui.gameNotice.textContent = message;
  ui.gameNotice.classList.add('visible');
  noticeTimer = setTimeout(() => ui.gameNotice.classList.remove('visible'), 2800);
}
function particle(p) { if (game.particles.length < 240) game.particles.push(p); }
function burst(x, y, count = 9, color = '#f4dd9b') {
  for (let i = 0; i < (reduced() ? 3 : count); i++) {
    const a = rand(0, Math.PI * 2), speed = rand(30, 150);
    particle({ kind: 'leaf', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, size: rand(2, 5), color, life: .5, duration: .5 });
  }
}
function ring(x, y, color = '#f6e2ac', size = 45) { particle({ kind: 'ring', x, y, vx: 0, vy: 0, color, size, life: .35, duration: .35 }); }
function floating(x, y, text, color = '#fff0c7') { particle({ kind: 'text', x, y: y - 35, vx: 0, vy: -30, text, color, life: .6, duration: .6 }); }
function reset() {
  Object.assign(game, { time: 0, score: 0, kills: 0, shake: 0, player: freshPlayer(), boss: null });
  for (const list of [game.enemies, game.bullets, game.gems, game.particles, game.trails]) list.length = 0;
  Object.keys(levels).forEach(id => delete levels[id]); evolved.clear();
  Object.assign(xp, { level: 1, current: 0, need: 30 });
  spawnTimer = shotTimer = pendingLevels = 0; nextBoss = 120; choices = [];
  setMode('play'); notify('Stay light on your feet. Your bow fires automatically.');
}
function finish() {
  best = Math.max(best, Math.floor(game.score));
  try { localStorage.setItem(key, String(best)); } catch { /* 本次最高分仍然保留在内存。 */ }
  ui.goTime.textContent = timeText(game.time); ui.goLevel.textContent = xp.level;
  ui.goScore.textContent = Math.floor(game.score); ui.goBest.textContent = best;
  setMode('gameover');
}
function showUpgrade() {
  const pool = upgrades.filter(u => u.id !== 'shield' || (levels.shield || 0) < 3);
  choices = [];
  while (choices.length < 3 && pool.length) choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  ui.overlayTitle.textContent = `Level ${xp.level - pendingLevels + 1} — Choose a gift`;
  ui.cards.replaceChildren(...choices.map((u, i) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'card';
    button.innerHTML = `<span class="upgrade-icon" aria-hidden="true">${u.icon}</span><span class="upgrade-tier">${i + 1} / LEVEL ${levels[u.id] || 0} → ${(levels[u.id] || 0) + 1}</span><span class="t">${u.title}</span><span class="d">${u.desc}</span>`;
    button.addEventListener('click', () => choose(i)); return button;
  }));
  setMode('levelup');
}
function choose(index) {
  if (game.mode !== 'levelup' || !choices[index]) return;
  const chosen = choices[index]; chosen.apply(game.player); levels[chosen.id] = (levels[chosen.id] || 0) + 1;
  const p = game.player;
  const evolutions = [
    ['trident', levels.multishot >= 3 && levels.pierce >= 2, () => { p.bulletCount += 2; p.spread *= .75; p.bulletDamage *= 1.15; }, 'Trident awakened'],
    ['cutter', levels.firerate >= 3 && levels.damage >= 3, () => { p.fireRate *= 1.35; p.bulletSpeed *= 1.2; p.pierce++; }, 'Ink Cutter awakened'],
    ['vortex', levels.magnet >= 2 && levels.shield >= 2, () => { p.magnet += 120; p.shield = Math.min(3, p.shield + 1); }, 'Forest Vortex awakened'],
  ];
  let message = `${chosen.title} · Level ${levels[chosen.id]}`;
  for (const [id, active, apply, title] of evolutions) if (active && !evolved.has(id)) { evolved.add(id); apply(); message = title; }
  pendingLevels--; ring(p.x, p.y); notify(message);
  if (pendingLevels > 0) showUpgrade(); else setMode('play');
}
// #endregion

// #region 输入：限定焦点、失焦暂停、触屏独立摇杆与冲刺。
function movement() {
  let x = stick.x + Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  let y = stick.y + Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  return { x, y };
}
function dash() {
  const p = game.player;
  if (game.mode !== 'play' || p.dashReady > 0) return;
  const move = movement(), magnitude = Math.hypot(move.x, move.y);
  p.dashX = magnitude > .1 ? move.x / magnitude : p.facing;
  p.dashY = magnitude > .1 ? move.y / magnitude : 0;
  p.dashTime = .17; p.dashReady = p.dashCd; p.invulnerable = Math.max(.22, p.invulnerable);
  ring(p.x, p.y, '#d5e5c6', 25);
}
ui.stage.addEventListener('keydown', event => {
  const k = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (game.mode === 'levelup' && ['1', '2', '3'].includes(k) && !event.repeat) { event.preventDefault(); choose(Number(k) - 1); return; }
  if ((k === 'p' || k === 'escape') && !event.repeat && ['play', 'pause'].includes(game.mode)) {
    event.preventDefault(); setMode(game.mode === 'play' ? 'pause' : 'play'); return;
  }
  if (game.mode !== 'play' || event.target.closest('button')) return;
  if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) {
    event.preventDefault(); keys.add(k); if (k === ' ' && !event.repeat) dash();
  }
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
function backgroundPause() { clearInput(); if (game.mode === 'play') setMode('pause', false); }
window.addEventListener('blur', backgroundPause);
document.addEventListener('visibilitychange', () => { if (document.hidden) backgroundPause(); });
shell.addEventListener('focusout', event => { if (!shell.contains(event.relatedTarget)) backgroundPause(); });
ui.game.addEventListener('pointerdown', () => { if (game.mode === 'play') ui.stage.focus({ preventScroll: true }); });
ui.joystick.addEventListener('pointerdown', event => {
  if (game.mode !== 'play' || inputPointer !== null) return;
  event.preventDefault(); inputPointer = event.pointerId; ui.joystick.setPointerCapture(inputPointer);
  ui.stage.focus({ preventScroll: true }); updateStick(event);
});
function updateStick(event) {
  if (event.pointerId !== inputPointer) return;
  const r = ui.joystick.getBoundingClientRect();
  let x = (event.clientX - r.left - r.width / 2) / 34, y = (event.clientY - r.top - r.height / 2) / 34;
  const size = Math.hypot(x, y); if (size > 1) { x /= size; y /= size; }
  stick = { x, y }; ui.joystickKnob.style.transform = `translate(${x * 24}px,${y * 24}px)`;
}
ui.joystick.addEventListener('pointermove', updateStick);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) ui.joystick.addEventListener(type, event => { if (event.pointerId === inputPointer) clearInput(); });
ui.btnDash.addEventListener('pointerdown', event => { event.preventDefault(); dash(); });
ui.btnDash.addEventListener('click', event => { if (event.detail === 0) dash(); });
ui.btnStart.addEventListener('click', reset); ui.btnRestart.addEventListener('click', reset); ui.btnAgain.addEventListener('click', reset);
ui.btnPause.addEventListener('click', () => setMode('pause')); ui.btnResume.addEventListener('click', () => setMode('play'));
// #endregion

// #region 战斗：固定时间步、命中去重、受击保护和升级排队。
function spawn(isBoss = false) {
  let point;
  for (let i = 0; i < 12; i++) {
    const a = rand(0, Math.PI * 2);
    point = constrain(582 + Math.cos(a) * 500, 423 + Math.sin(a) * 230, isBoss ? 42 : 20);
    if (Math.hypot(point.x - game.player.x, point.y - game.player.y) > 200) break;
  }
  const hp = isBoss ? 980 + game.time * 9 : 26 + game.time * .7;
  const enemy = { ...point, r: isBoss ? 42 : 20, hp, maxHp: hp, speed: isBoss ? 75 : 62 + game.time * .16, damage: isBoss ? 22 : 10, facing: -1, flash: 0, grace: .7, warning: 0, attack: 4 };
  if (isBoss) { game.boss = enemy; notify('A guardian enters the clearing. Watch for the amber ring.'); }
  else game.enemies.push(enemy);
  ring(point.x, point.y, '#e9d5a0', 30);
}
function receiveDamage(amount) {
  const p = game.player, result = damagePlayer(p, amount);
  if (result === 'ignored') return;
  p.flash = .12; game.shake = reduced() ? 0 : 3;
  ring(p.x, p.y, result === 'shield' ? '#d9f2e2' : '#dc9d78');
  if (result === 'shield') floating(p.x, p.y, 'GUARD', '#d9f2e2');
  else floating(p.x, p.y, `−${Math.ceil(amount)}`, '#ffe0be');
  if (result === 'dead') finish();
}
function shoot() {
  const p = game.player, targets = [...game.enemies, ...(game.boss ? [game.boss] : [])];
  let target, distance = Infinity;
  for (const enemy of targets) {
    const d = Math.hypot(enemy.x - p.x, enemy.y - p.y);
    if (d < distance) { distance = d; target = enemy; }
  }
  if (!target) return;
  const angle = Math.atan2(target.y - p.y, target.x - p.x);
  for (let i = 0; i < Math.min(24, p.bulletCount); i++) {
    if (game.bullets.length >= 180) break;
    const a = angle + (i - (p.bulletCount - 1) / 2) * p.spread;
    game.bullets.push({ x: p.x, y: p.y, vx: Math.cos(a) * p.bulletSpeed, vy: Math.sin(a) * p.bulletSpeed, damage: p.bulletDamage, remaining: p.pierce + 1, life: 1.6, hit: new Set() });
  }
}
function kill(enemy) {
  const isBoss = enemy === game.boss;
  burst(enemy.x, enemy.y, isBoss ? 24 : 10, '#edda9c');
  burst(enemy.x, enemy.y, 5, '#72915b');
  game.score += isBoss ? 500 : 10; game.kills++;
  const count = isBoss ? 18 : 1;
  for (let i = 0; i < count; i++) {
    const gem = { x: enemy.x + rand(-10,10), y: enemy.y + rand(-8,8), value: isBoss ? 22 : 7 + Math.min(12, game.time * .08) };
    if (game.gems.length < 300) game.gems.push(gem);
    else game.gems[0].value += gem.value;
  }
  if (isBoss) { game.boss = null; notify('Guardian defeated · The clearing is yours.'); }
}
function update(dt) {
  const p = game.player; game.time += dt; game.score += dt * 4;
  p.invulnerable = Math.max(0, p.invulnerable - dt); p.flash = Math.max(0, p.flash - dt);
  p.dashReady = Math.max(0, p.dashReady - dt); game.shake *= Math.exp(-18 * dt);
  const capacity = Math.min(3, levels.shield || 0);
  if (p.shield < capacity) { p.shieldTimer += dt; if (p.shieldTimer >= 10) { p.shield++; p.shieldTimer = 0; } }
  const move = movement(); p.moving = Math.hypot(move.x, move.y);
  if (Math.abs(move.x) > .1) p.facing = Math.sign(move.x);
  let vx = move.x * p.speed, vy = move.y * p.speed;
  if (p.dashTime > 0) {
    p.dashTime = Math.max(0, p.dashTime - dt); vx = p.dashX * 1100; vy = p.dashY * 1100;
    if (!reduced()) game.trails.push({ x: p.x, y: p.y, facing: p.facing, life: .22 });
  }
  Object.assign(p, constrain(p.x + vx * dt, p.y + vy * dt, p.r));
  spawnTimer += dt;
  const interval = 1 / Math.min(4.5, 1.1 + game.time * .022);
  if (spawnTimer >= interval) { spawnTimer -= interval; if (game.enemies.length < 75) spawn(); }
  if (!game.boss && game.time >= nextBoss) { spawn(true); nextBoss += 120; }
  shotTimer += dt;
  const shotInterval = 1 / Math.min(24, p.fireRate);
  while (shotTimer >= shotInterval) { shotTimer -= shotInterval; shoot(); }
  const targets = [...game.enemies, ...(game.boss ? [game.boss] : [])];
  for (const enemy of targets) {
    enemy.flash = Math.max(0, enemy.flash - dt); enemy.grace = Math.max(0, enemy.grace - dt);
    const dx = p.x - enemy.x, dy = p.y - enemy.y, d = Math.hypot(dx,dy) || 1;
    if (Math.abs(dx) > 1) enemy.facing = Math.sign(dx);
    if (enemy === game.boss) {
      enemy.attack -= dt;
      if (enemy.attack <= 0 && enemy.warning <= 0) enemy.warning = 1.15;
      if (enemy.warning > 0) {
        enemy.warning -= dt;
        if (enemy.warning <= 0) { if (d < 88 + p.r) receiveDamage(24); ring(enemy.x, enemy.y, '#b8794d', 88); enemy.attack = 4.5; }
      }
    }
    if (enemy.warning <= 0 && enemy.grace <= 0) Object.assign(enemy, constrain(enemy.x + dx / d * enemy.speed * dt, enemy.y + dy / d * enemy.speed * dt, enemy.r));
    if (enemy.grace <= 0 && d < enemy.r + p.r) receiveDamage(enemy.damage);
    if (game.mode !== 'play') return;
  }
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i], oldX = b.x, oldY = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    for (const enemy of targets) {
      if (enemy.hp <= 0 || b.hit.has(enemy) || !segmentHits(oldX, oldY, b.x, b.y, enemy.x, enemy.y, enemy.r + 4)) continue;
      b.hit.add(enemy); b.remaining--; enemy.hp -= b.damage; enemy.flash = .09;
      const norm = Math.hypot(b.vx,b.vy) || 1;
      Object.assign(enemy, constrain(enemy.x + b.vx / norm * 5, enemy.y + b.vy / norm * 5, enemy.r));
      burst(enemy.x, enemy.y - 10, 4);
      if (enemy.hp <= 0) kill(enemy);
      if (b.remaining <= 0) break;
    }
    if (b.remaining <= 0 || b.life <= 0 || b.x < 0 || b.x > WORLD.width || b.y < 0 || b.y > WORLD.height) game.bullets.splice(i,1);
  }
  game.enemies = game.enemies.filter(enemy => enemy.hp > 0);
  for (let i = game.gems.length - 1; i >= 0; i--) {
    const g = game.gems[i], dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx,dy);
    if (d < p.magnet && d > 0) { const step = Math.min(d, dt * (140 + (1 - d / p.magnet) * 450)); g.x += dx / d * step; g.y += dy / d * step; }
    if (d < 27) { pendingLevels += gainXP(xp, g.value); game.score += g.value; game.gems.splice(i,1); burst(p.x, p.y, 2, '#b7e2cc'); }
  }
  for (const effect of game.particles) { effect.life -= dt; effect.x += effect.vx * dt; effect.y += effect.vy * dt; }
  game.particles = game.particles.filter(effect => effect.life > 0);
  game.trails.forEach(trail => trail.life -= dt); game.trails = game.trails.filter(trail => trail.life > 0);
  if (pendingLevels > 0) showUpgrade();
}
// #endregion

// #region 渲染与启动：资源失败有可见提示；隐藏标签页不推进游戏。
function updateHUD() {
  const p = game.player;
  ui.uiTime.textContent = timeText(game.time); ui.uiLevel.textContent = xp.level;
  ui.uiScore.textContent = Math.floor(game.score); ui.uiBest.textContent = best; ui.uiHp.textContent = Math.ceil(p.hp);
  ui.uiHpBar.style.width = `${p.hp / p.hpMax * 100}%`; ui.uiXpBar.style.width = `${xp.current / xp.need * 100}%`;
  ui.uiDash.textContent = p.dashReady > 0 ? `${p.dashReady.toFixed(1)}s` : 'READY';
  ui.btnDash.setAttribute('aria-disabled', String(p.dashReady > 0));
  ui.bossBanner.hidden = !game.boss;
  if (game.boss) ui.bossHp.style.width = `${Math.max(0, game.boss.hp / game.boss.maxHp) * 100}%`;
  const build = upgrades.filter(u => levels[u.id]).map(u => `${u.title} ${levels[u.id]}`);
  ui.buildSummary.textContent = build.length ? build.join(' · ') : 'Your abilities will appear here.';
}
function loop(now) {
  const dt = Math.min(.1, (now - (last || now)) / 1000); last = now;
  if (game.mode === 'play') {
    accumulator += dt;
    while (accumulator >= 1 / 60 && game.mode === 'play') { accumulator -= 1 / 60; update(1 / 60); }
  } else accumulator = 0;
  hudTimer += dt;
  if (hudTimer >= .1) { updateHUD(); hudTimer = 0; }
  if (!document.hidden) renderer.render(game, reduced());
  requestAnimationFrame(loop);
}
try {
  renderer = await createRenderer(ui.game, ui.stage);
  ui.btnStart.disabled = false; ui.btnStart.textContent = 'Enter the clearing';
  ui.loadStatus.textContent = renderer.missing.length ? 'Some art could not load. Simple fallback shapes are available.' : 'Ready when you are.';
  updateHUD();
  // 首次加载不抢走网页焦点；玩家点击开始才进入游戏输入上下文。
  ui.touchControls.hidden = true; ui.touchHint.hidden = true;
  requestAnimationFrame(loop);
} catch {
  ui.loadStatus.textContent = 'The forest could not load. Please refresh to try again.';
}
// #endregion
