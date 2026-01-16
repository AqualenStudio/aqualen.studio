(() => {
  // =========================
  // Helpers
  // =========================
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const hyp = (x, y) => Math.hypot(x, y);

  function fmtTime(sec) {
    sec = Math.max(0, sec | 0);
    const m = (sec / 60) | 0;
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // =========================
  // DOM
  // =========================
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const stage = document.getElementById("stage");

  const uiTime = document.getElementById("uiTime");
  const uiLevel = document.getElementById("uiLevel");
  const uiScore = document.getElementById("uiScore");
  const uiBest = document.getElementById("uiBest");
  const uiHpBar = document.getElementById("uiHpBar");
  const uiXpBar = document.getElementById("uiXpBar");

  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const cardsEl = document.getElementById("cards");

  const overGame = document.getElementById("overGame");
  const goScore = document.getElementById("goScore");
  const goBest = document.getElementById("goBest");

  const btnPause = document.getElementById("btnPause");
  const btnRestart = document.getElementById("btnRestart");
  const btnAgain = document.getElementById("btnAgain");
  const touchHint = document.getElementById("touchHint");

  // =========================
  // Sprite sizing (tune here)
  // =========================
  // player:192x192, enemy:231x128, boss:463x256 (keep aspect, no distortion)
  const SPR = {
    playerSize: 92,
    enemySize: 84,
    bossSize: 170, // boss ≈ 1.8x player; bump to 190/210 if you want bigger
    bulletSize: 22,
    gemSize: 20,

    playerR: 22,
    enemyR: 22,
    bossR: 44,
  };

  // =========================
  // Assets
  // =========================
  // Put files into /assets/img/
  const ASSETS = {
    player: "/assets/img/player.webp",
    enemy: "/assets/img/enemy.webp",
    boss: "/assets/img/boss.webp",
    bullet: "/assets/img/bullet.webp",
    gem: "/assets/img/gem.webp",

    bgPaper: "/assets/img/bg-paper.webp",
    bloodInk: "/assets/img/blood-ink.webp",
    smokeInk: "/assets/img/smoke-ink.webp",
  };

  const images = {};
  function loadImage(key, src) {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    }).then((img) => (images[key] = img));
  }

  // =========================
  // Drawing (contain + flip + white-bg rescue)
  // =========================
  function drawSpriteRaw(key, x, y, w, h, rot = 0, flipX = false, alpha = 1) {
    const img = images[key];
    if (!img) return false;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);

    if (flipX) ctx.scale(-1, 1);
    if (rot) ctx.rotate(rot);

    // Rescue for assets that accidentally have white background.
    // multiply makes white nearly disappear on paper/darker bg.
    if (key === "bloodInk" || key === "smokeInk" || key === "bullet") {
      ctx.globalCompositeOperation = "multiply";
    }

    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
    return true;
  }

  function drawSpriteContainFlip(key, x, y, size, flipX = false, rot = 0, alpha = 1) {
    const img = images[key];
    if (!img) return false;

    const aspect = img.width / img.height;
    let w = size,
      h = size;
    if (aspect >= 1) h = size / aspect;
    else w = size * aspect;

    return drawSpriteRaw(key, x, y, w, h, rot, flipX, alpha);
  }

  // =========================
  // Resize
  // =========================
  function resize() {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(r.width * dpr);
    canvas.height = Math.floor(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);

  // =========================
  // Grass-only movement area (forest is blocked)
  // =========================
  function grassArea(w, h) {
    return {
      cx: w * 0.52,
      cy: h * 0.74,
      rx: w * 0.44,
      ry: h * 0.28,
      yMin: h * 0.42, // raise => more blocked; lower => more grass
      pad: 10,
    };
  }

  function clampToGrass(x, y, r, w, h) {
    const g = grassArea(w, h);
    y = Math.max(y, g.yMin + r);

    const dx = x - g.cx;
    const dy = y - g.cy;
    const nx = dx / (g.rx - r - g.pad);
    const ny = dy / (g.ry - r - g.pad);
    const q = nx * nx + ny * ny;

    if (q > 1) {
      const k = 1 / Math.sqrt(q);
      x = g.cx + dx * k;
      y = g.cy + dy * k;
      y = Math.max(y, g.yMin + r);
    }
    return { x, y };
  }

  function randomPointInGrass(r, w, h) {
    const g = grassArea(w, h);
    for (let tries = 0; tries < 60; tries++) {
      const x = rand(g.cx - g.rx + r, g.cx + g.rx - r);
      const y = rand(g.yMin + r, g.cy + g.ry - r);
      const dx = (x - g.cx) / (g.rx - r);
      const dy = (y - g.cy) / (g.ry - r);
      if (dx * dx + dy * dy <= 1) return { x, y };
    }
    return { x: g.cx, y: g.cy };
  }

  // =========================
  // Input
  // =========================
  const keys = new Set();
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys.add(k);

    if (state.mode === "levelup") {
      if (e.key === "1") chooseUpgrade(0);
      if (e.key === "2") chooseUpgrade(1);
      if (e.key === "3") chooseUpgrade(2);
    }
    if (k === "p") togglePause();
    if (k === " ") dash();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

  let pointerActive = false;
  let pointerId = null;
  let pointerStart = { x: 0, y: 0 };
  let pointerVec = { x: 0, y: 0 };
  let lastTap = 0;

  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
    pointerActive = true;
    pointerId = e.pointerId;

    const r = stage.getBoundingClientRect();
    pointerStart = { x: e.clientX - r.left, y: e.clientY - r.top };
    pointerVec = { x: 0, y: 0 };

    const now = performance.now();
    if (now - lastTap < 260 && state.mode === "play") dash();
    lastTap = now;
  });

  stage.addEventListener("pointermove", (e) => {
    if (!pointerActive || e.pointerId !== pointerId) return;
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const dx = x - pointerStart.x;
    const dy = y - pointerStart.y;

    const mag = hyp(dx, dy);
    const max = 70;
    const k = mag > 0 ? Math.min(1, max / mag) : 1;
    pointerVec = { x: (dx * k) / 70, y: (dy * k) / 70 };
  });

  stage.addEventListener("pointerup", (e) => {
    if (e.pointerId !== pointerId) return;
    pointerActive = false;
    pointerId = null;
    pointerVec = { x: 0, y: 0 };
  });

  // =========================
  // Save Best
  // =========================
  const BEST_KEY = "aqualen_rogue_best_final_v3";

  // =========================
  // Screen shake
  // =========================
  let shakeT = 0;
  let shakeMag = 0;
  function addShake(mag = 6, t = 0.12) {
    shakeMag = Math.max(shakeMag, mag);
    shakeT = Math.max(shakeT, t);
  }

  // =========================
  // State
  // =========================
  const state = {
    mode: "play", // play | pause | levelup | gameover
    t: 0,
    score: 0,
    best: Number(localStorage.getItem(BEST_KEY) || 0),
    spawnTimer: 0,
    spawnRate: 1.0,
  };

  const player = {
    x: 0,
    y: 0,
    r: SPR.playerR,
    facing: 1, // 1=right, -1=left
    hpMax: 100,
    hp: 100,
    speed: 220,

    fireRate: 2.6,
    bulletSpeed: 520,
    bulletDamage: 12,
    bulletCount: 1,
    bulletSpread: 0.18,
    pierce: 0,

    magnet: 80,

    dashCd: 1.2,
    dashReady: 0,
    dashPower: 220,

    shield: 0,
    shieldCd: 10,
    shieldReady: 0,

    // cosmetic motion
    animWalk: 0,  // accumulates when moving
    animBreathe: 0, // time-based
    lastMoveMag: 0,
  };

  const xp = { level: 1, current: 0, need: 30 };
  const enemies = [];
  const bullets = [];
  const gems = [];
  const ink = []; // particles
  const picked = [];

  // Boss system
  let boss = null;
  let nextBossAt = 120;

  // Upgrade tracking / evolution
  const upLv = {};
  const evolved = {};

  // =========================
  // Upgrades
  // =========================
  const UPGRADES = [
    { id: "firerate", title: "Swift Brush", desc: "+20% fire rate", apply() { player.fireRate *= 1.2; } },
    { id: "damage", title: "Heavy Ink", desc: "+25% damage", apply() { player.bulletDamage *= 1.25; } },
    { id: "multishot", title: "Twin Strokes", desc: "+1 projectile", apply() { player.bulletCount += 1; } },
    { id: "pierce", title: "Piercing Script", desc: "+1 pierce", apply() { player.pierce += 1; } },
    { id: "movespeed", title: "Light Steps", desc: "+12% move speed", apply() { player.speed *= 1.12; } },
    { id: "maxhp", title: "Ink Vitality", desc: "+20 max HP (heal 20)", apply() { player.hpMax += 20; player.hp = Math.min(player.hpMax, player.hp + 20); } },
    { id: "magnet", title: "Relic Pull", desc: "+35 pickup radius", apply() { player.magnet += 35; } },
    { id: "bulletspeed", title: "Sharper Current", desc: "+18% projectile speed", apply() { player.bulletSpeed *= 1.18; } },
    { id: "shield", title: "Xuanwu Aegis", desc: "Gain 1 shield charge (auto-refresh)", apply() { player.shield = Math.min(3, player.shield + 1); player.shieldReady = 0; } },
  ];

  let upgradeChoices = null;

  function pick3() {
    const pool = UPGRADES.slice();
    const out = [];
    while (out.length < 3 && pool.length) {
      const i = (Math.random() * pool.length) | 0;
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

  function onLevelUp() {
    if (state.mode === "gameover") return;
    state.mode = "levelup";
    upgradeChoices = pick3();

    overlayTitle.textContent = `Level ${xp.level} — Choose one`;
    cardsEl.innerHTML = "";

    upgradeChoices.forEach((u, idx) => {
      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = `<div class="t">${idx + 1}. ${u.title}</div><div class="d">${u.desc}</div>`;
      el.addEventListener("click", () => chooseUpgrade(idx));
      cardsEl.appendChild(el);
    });

    overlay.classList.add("show");
  }

  function chooseUpgrade(i) {
    if (state.mode !== "levelup" || !upgradeChoices) return;
    const u = upgradeChoices[i];
    if (!u) return;

    u.apply();
    picked.push(u.id);

    upLv[u.id] = (upLv[u.id] || 0) + 1;
    checkEvolution();

    upgradeChoices = null;
    overlay.classList.remove("show");
    state.mode = "play";
  }

  function spawnInkKill(x, y, power = 1) {
    const n = Math.floor(14 + power * 14);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(80, 320) * power;
      ink.push({
        kind: "dot",
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        r: rand(1.5, 5.5) * power,
        t: rand(0.22, 0.65),
      });
    }

    const big = 1 + ((Math.random() * 2) | 0);
    for (let k = 0; k < big; k++) {
      ink.push({
        kind: "splat",
        x: x + rand(-8, 8),
        y: y + rand(-8, 8),
        vx: rand(-30, 30) * power,
        vy: rand(-30, 30) * power,
        r: rand(18, 34) * power,
        t: rand(0.35, 0.9),
        rot: rand(-Math.PI, Math.PI),
      });
    }

    if (images.smokeInk) {
      ink.push({
        kind: "smoke",
        x, y,
        vx: 0, vy: 0,
        r: 64 * power,
        t: 0.9,
        rot: rand(-Math.PI, Math.PI),
      });
    }
  }

  function checkEvolution() {
    // Evo 1: Multishot 3 + Pierce 2
    if (!evolved.trident && (upLv.multishot || 0) >= 3 && (upLv.pierce || 0) >= 2) {
      evolved.trident = true;
      player.bulletCount += 2;
      player.bulletSpread *= 0.75;
      player.bulletDamage *= 1.15;
      spawnInkKill(player.x, player.y, 1.6);
      addShake(10, 0.18);
    }

    // Evo 2: FireRate 3 + Damage 3
    if (!evolved.cutter && (upLv.firerate || 0) >= 3 && (upLv.damage || 0) >= 3) {
      evolved.cutter = true;
      player.fireRate *= 1.35;
      player.bulletSpeed *= 1.2;
      player.pierce += 1;
      spawnInkKill(player.x, player.y, 1.6);
      addShake(10, 0.18);
    }

    // Evo 3: Magnet 2 + Shield 2
    if (!evolved.vortex && (upLv.magnet || 0) >= 2 && (upLv.shield || 0) >= 2) {
      evolved.vortex = true;
      player.magnet += 120;
      player.shield = Math.min(3, player.shield + 1);
      spawnInkKill(player.x, player.y, 1.6);
      addShake(10, 0.18);
    }
  }

  // =========================
  // Core systems
  // =========================
  function addXP(v) {
    xp.current += v;
    while (xp.current >= xp.need) {
      xp.current -= xp.need;
      xp.level += 1;
      xp.need = Math.floor(xp.need * 1.22 + 8);
      onLevelUp();
    }
  }

  function getMoveVec() {
    let x = 0, y = 0;
    if (keys.has("w") || keys.has("arrowup")) y -= 1;
    if (keys.has("s") || keys.has("arrowdown")) y += 1;
    if (keys.has("a") || keys.has("arrowleft")) x -= 1;
    if (keys.has("d") || keys.has("arrowright")) x += 1;
    if (pointerActive) {
      x += pointerVec.x;
      y += pointerVec.y;
    }
    return { x, y };
  }

  function dash() {
    if (state.mode !== "play") return;
    if (player.dashReady > 0) return;

    const v = getMoveVec();
    const m = hyp(v.x, v.y);
    if (m < 0.01) return;

    const r = stage.getBoundingClientRect();
    player.x += (v.x / m) * player.dashPower;
    player.y += (v.y / m) * player.dashPower;

    const c = clampToGrass(player.x, player.y, player.r, r.width, r.height);
    player.x = c.x; player.y = c.y;

    // face dash direction
    if (Math.abs(v.x) > 0.05) player.facing = v.x > 0 ? 1 : -1;

    player.dashReady = player.dashCd;
    addShake(3, 0.06);
  }

  function spawnEnemy() {
    const r = stage.getBoundingClientRect();

    const t = state.t;
    const hp = 26 + t * 0.70;
    const sp = 65 + t * 0.20;
    const dmg = 10 + t * 0.05;

    const p = randomPointInGrass(SPR.enemyR, r.width, r.height);

    // push towards edge of grass ellipse (feels like coming from forest border)
    const g = grassArea(r.width, r.height);
    const dx = p.x - g.cx, dy = p.y - g.cy;
    const d = hyp(dx, dy) || 1;
    const push = 0.97;

    const x = g.cx + (dx / d) * g.rx * push;
    const y = g.cy + (dy / d) * g.ry * push;

    enemies.push({ x, y, r: SPR.enemyR, facing: -1, hp, speed: sp, dmg });
  }

  function spawnBoss() {
    const r = stage.getBoundingClientRect();
    const p = randomPointInGrass(SPR.bossR, r.width, r.height);

    const t = state.t;
    const hpMax = 980 + t * 9;
    const speed = 78 + t * 0.09;
    const dmg = 22 + t * 0.04;

    addShake(12, 0.20);
    spawnInkKill(p.x, p.y, 1.2);
    return { x: p.x, y: p.y, r: SPR.bossR, facing: -1, hp: hpMax, hpMax, speed, dmg };
  }

  function nearestEnemy() {
    let best = null, bestD = 1e18;

    if (boss) {
      const dx = boss.x - player.x, dy = boss.y - player.y;
      bestD = dx * dx + dy * dy;
      best = boss;
    }

    for (const e of enemies) {
      const dx = e.x - player.x, dy = e.y - player.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  let shootAcc = 0;
  function shoot(dt) {
    shootAcc += dt;
    const interval = 1 / player.fireRate;

    while (shootAcc >= interval) {
      shootAcc -= interval;
      const t = nearestEnemy();
      if (!t) return;

      const ang = Math.atan2(t.y - player.y, t.x - player.x);
      const n = player.bulletCount;
      const spread = player.bulletSpread;
      const start = ang - (spread * (n - 1)) / 2;

      for (let i = 0; i < n; i++) {
        const a = start + i * spread + rand(-0.02, 0.02);
        bullets.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(a) * player.bulletSpeed,
          vy: Math.sin(a) * player.bulletSpeed,
          r: 5,
          dmg: player.bulletDamage,
          pierce: player.pierce,
          life: 1.6,
          rot: a,
        });
      }
    }
  }

  function takeDamage(amount) {
    if (player.shield > 0) {
      player.shield -= 1;
      addShake(3, 0.08);
      return;
    }
    player.hp -= amount;
    if (player.hp <= 0) gameOver();
  }

  function gameOver() {
    state.mode = "gameover";
    overGame.classList.add("show");

    const s = Math.floor(state.score);
    goScore.textContent = String(s);

    if (s > state.best) {
      state.best = s;
      localStorage.setItem(BEST_KEY, String(s));
    }
    goBest.textContent = String(state.best);
    uiBest.textContent = String(state.best);
  }

  function togglePause() {
    if (state.mode === "levelup" || state.mode === "gameover") return;
    state.mode = state.mode === "pause" ? "play" : "pause";
    btnPause.textContent = state.mode === "pause" ? "Resume" : "Pause";
  }

  btnPause.addEventListener("click", togglePause);
  btnRestart.addEventListener("click", reset);
  btnAgain.addEventListener("click", reset);

  function reset() {
    state.mode = "play";
    state.t = 0;
    state.score = 0;
    state.spawnTimer = 0;
    state.spawnRate = 1.0;

    enemies.length = 0;
    bullets.length = 0;
    gems.length = 0;
    ink.length = 0;
    picked.length = 0;

    boss = null;
    nextBossAt = 120;

    for (const k in upLv) delete upLv[k];
    for (const k in evolved) delete evolved[k];

    const r = stage.getBoundingClientRect();
    const p = randomPointInGrass(player.r, r.width, r.height);
    player.x = p.x;
    player.y = p.y;

    player.facing = 1;

    player.hpMax = 100;
    player.hp = 100;
    player.speed = 220;
    player.fireRate = 2.6;
    player.bulletSpeed = 520;
    player.bulletDamage = 12;
    player.bulletCount = 1;
    player.bulletSpread = 0.18;
    player.pierce = 0;
    player.magnet = 80;
    player.dashReady = 0;
    player.shield = 0;
    player.shieldReady = 0;

    player.animWalk = 0;
    player.animBreathe = 0;
    player.lastMoveMag = 0;

    xp.level = 1;
    xp.current = 0;
    xp.need = 30;

    overlay.classList.remove("show");
    overGame.classList.remove("show");

    uiBest.textContent = String(state.best);
    touchHint.style.display = "ontouchstart" in window ? "block" : "none";
  }

  // =========================
  // Update + Draw
  // =========================
  function update(dt) {
    if (player.dashReady > 0) player.dashReady = Math.max(0, player.dashReady - dt);

    // shake decay
    if (shakeT > 0) {
      shakeT -= dt;
      if (shakeT <= 0) shakeMag = 0;
    }

    // shield regen (based on number of times picked)
    const shieldCap = Math.min(3, picked.filter((x) => x === "shield").length);
    if (shieldCap > 0 && player.shield < shieldCap) {
      player.shieldReady += dt;
      if (player.shieldReady >= player.shieldCd) {
        player.shieldReady = 0;
        player.shield += 1;
      }
    }

    // --- movement + facing + walk anim ---
    const mv = getMoveVec();
    const r = stage.getBoundingClientRect();
    const m = hyp(mv.x, mv.y);

    player.animBreathe += dt;

    if (m > 0.001) {
      // face left/right based on x intent
      if (Math.abs(mv.x) > 0.05) player.facing = mv.x > 0 ? 1 : -1;

      player.x += (mv.x / m) * player.speed * dt;
      player.y += (mv.y / m) * player.speed * dt;

      const c = clampToGrass(player.x, player.y, player.r, r.width, r.height);
      player.x = c.x; player.y = c.y;

      // walk accumulates only when moving
      player.animWalk += dt * (2.3 + 0.9 * clamp(player.speed / 240, 0.6, 1.6));
      player.lastMoveMag = m;
    } else {
      // decay move mag smoothly (so idle breath looks nice)
      player.lastMoveMag *= Math.pow(0.001, dt);
    }

    // --- spawn scaling ---
    state.spawnRate = 1.1 + state.t * 0.03;
    state.spawnTimer += dt;
    const need = 1 / state.spawnRate;
    while (state.spawnTimer >= need) {
      state.spawnTimer -= need;
      spawnEnemy();
    }

    // boss spawn every 120s
    if (!boss && state.t >= nextBossAt) {
      boss = spawnBoss();
      nextBossAt += 120;
    }

    // shoot
    shoot(dt);

    // bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // ink trail
      ink.push({ kind: "dot", x: b.x, y: b.y, vx: 0, vy: 0, r: 1.6, t: 0.16 });

      if (b.life <= 0 || b.x < -60 || b.y < -60 || b.x > r.width + 60 || b.y > r.height + 60) {
        bullets.splice(i, 1);
      }
    }

    // enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const dx = player.x - e.x, dy = player.y - e.y;
      const d = hyp(dx, dy) || 1;

      // face player
      if (Math.abs(dx) > 0.01) e.facing = dx > 0 ? 1 : -1;

      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;

      const cc = clampToGrass(e.x, e.y, e.r, r.width, r.height);
      e.x = cc.x; e.y = cc.y;

      if (d < e.r + player.r) takeDamage(e.dmg * dt);
    }

    // boss
    if (boss) {
      const dx = player.x - boss.x, dy = player.y - boss.y;
      const d = hyp(dx, dy) || 1;

      if (Math.abs(dx) > 0.01) boss.facing = dx > 0 ? 1 : -1;

      boss.x += (dx / d) * boss.speed * dt;
      boss.y += (dy / d) * boss.speed * dt;

      const cc = clampToGrass(boss.x, boss.y, boss.r, r.width, r.height);
      boss.x = cc.x; boss.y = cc.y;

      if (d < boss.r + player.r) takeDamage(boss.dmg * dt);
    }

    // bullets hit boss
    if (boss) {
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        const dx = boss.x - b.x, dy = boss.y - b.y;
        const rr = boss.r + b.r;
        if (dx * dx + dy * dy <= rr * rr) {
          boss.hp -= b.dmg;
          if (b.pierce > 0) b.pierce -= 1;
          else bullets.splice(bi, 1);

          if (boss.hp <= 0) {
            spawnInkKill(boss.x, boss.y, 2.6);
            addShake(16, 0.22);

            for (let k = 0; k < 18; k++) {
              gems.push({ x: boss.x + rand(-18, 18), y: boss.y + rand(-18, 18), r: 6, v: 22 });
            }
            state.score += 500;
            boss = null;
          }
        }
      }
    }

    // bullets hit enemies
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        const dx = e.x - b.x, dy = e.y - b.y;
        const rr = e.r + b.r;
        if (dx * dx + dy * dy <= rr * rr) {
          e.hp -= b.dmg;
          if (b.pierce > 0) b.pierce -= 1;
          else bullets.splice(bi, 1);

          if (e.hp <= 0) {
            const xpVal = 7 + Math.min(12, state.t * 0.08);
            gems.push({ x: e.x, y: e.y, r: 6, v: xpVal });
            enemies.splice(ei, 1);

            state.score += 10;
            const power = clamp(player.bulletDamage / 18, 1, 2.2);
            spawnInkKill(e.x, e.y, power);
            addShake(4.5 * power, 0.10);
          }
          break;
        }
      }
    }

    // gems magnet + pickup
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      const dx = player.x - g.x, dy = player.y - g.y;
      const d = hyp(dx, dy) || 1;

      if (d < player.magnet) {
        const pull = (1 - d / player.magnet) * 700;
        g.x += (dx / d) * pull * dt;
        g.y += (dy / d) * pull * dt;
      }
      if (d < player.r + g.r + 4) {
        addXP(g.v);
        state.score += g.v;
        gems.splice(i, 1);
      }
    }

    // ink particles update
    for (let i = ink.length - 1; i >= 0; i--) {
      const p = ink[i];
      p.t -= dt;
      p.vx *= 0.92;
      p.vy = p.vy * 0.92 + 380 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.t <= 0) ink.splice(i, 1);
    }

    // passive score
    state.score += dt * 4;

    // HUD
    uiTime.textContent = fmtTime(state.t);
    uiLevel.textContent = String(xp.level);
    uiScore.textContent = String(Math.floor(state.score));
    uiHpBar.style.width = `${clamp(player.hp / player.hpMax, 0, 1) * 100}%`;
    uiXpBar.style.width = `${clamp(xp.current / xp.need, 0, 1) * 100}%`;
  }

  function draw() {
    const r = stage.getBoundingClientRect();
    const w = r.width, h = r.height;

    ctx.save();
    if (shakeT > 0) {
      const k = clamp(shakeT / 0.12, 0, 1);
      const mag = shakeMag * k;
      ctx.translate(rand(-mag, mag), rand(-mag, mag));
    }

    // ===== background =====
    ctx.fillStyle = "#0b0d12";
    ctx.fillRect(0, 0, w, h);

    if (images.bgPaper) {
      const img = images.bgPaper;
      const iw = img.width, ih = img.height;
      const scale = Math.max(w / iw, h / ih);
      const dw = iw * scale, dh = ih * scale;
      ctx.globalAlpha = 1.0;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = "#e9e1cf";
      ctx.fillRect(0, 0, w, h);
    }

    // dark overlay
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#0b0d12";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    // vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.max(w, h) * 0.70);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // ===== gems =====
    for (const g of gems) {
      if (!drawSpriteRaw("gem", g.x, g.y, SPR.gemSize, SPR.gemSize, 0, false, 1)) {
        ctx.fillStyle = "rgba(120,190,255,.95)";
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ===== bullets =====
    for (const b of bullets) {
      if (!drawSpriteRaw("bullet", b.x, b.y, SPR.bulletSize, SPR.bulletSize, b.rot || 0, false, 1)) {
        ctx.fillStyle = "rgba(20,20,20,.85)";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ===== enemies =====
    for (const e of enemies) {
      // flipX logic: facing<0 => flip
      // If your sprite's "default facing" is LEFT and you see reversed, change to: (e.facing > 0)
      const flipX = e.facing < 0;
      if (!drawSpriteContainFlip("enemy", e.x, e.y, SPR.enemySize, flipX, 0, 1)) {
        ctx.fillStyle = "rgba(0,0,0,.22)";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ===== boss =====
    if (boss) {
      // If your boss default facing is LEFT and you see reversed, change to: (boss.facing > 0)
      const flipX = boss.facing < 0;
      const ok = drawSpriteContainFlip("boss", boss.x, boss.y, SPR.bossSize, flipX, 0, 1);
      if (!ok) {
        ctx.fillStyle = "rgba(0,0,0,.28)";
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, boss.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // boss hp bar
      const bw = 280, bh = 10;
      const bx = w / 2 - bw / 2, by = 18;
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = "rgba(255,255,255,.18)";
      ctx.strokeRect(bx, by, bw, bh);

      const p = clamp(boss.hp / boss.hpMax, 0, 1);
      ctx.fillStyle = "rgba(10,10,10,.78)";
      ctx.fillRect(bx, by, bw * p, bh);
    }

    // ===== player (walk sway + breathe) =====
    // Motion is subtle: sway (rotate+tilt) when moving, breathe (scaleY) always.
    const moveAmt = clamp(player.lastMoveMag, 0, 1);
    const sway = Math.sin(player.animWalk * 7.0) * (0.06 * moveAmt); // radians
    const bob = Math.sin(player.animWalk * 14.0) * (2.2 * moveAmt);  // px
    const breathe = 1 + Math.sin(player.animBreathe * 2.1) * 0.015;  // scale

    ctx.save();
    ctx.translate(player.x, player.y + bob);

    // flip based on facing
    // If your player default facing is LEFT and you see reversed, change to: (player.facing > 0)
    const flipX = player.facing < 0;
    if (flipX) ctx.scale(-1, 1);

    // rotate a bit when moving
    ctx.rotate(sway);

    // breathe (slight scale)
    ctx.scale(1, breathe);

    // draw at origin (because we've already translated)
    if (!drawSpriteRaw("player", 0, 0, SPR.playerSize, SPR.playerSize, 0, false, 1)) {
      ctx.fillStyle = "rgba(0,0,0,.25)";
      ctx.beginPath();
      ctx.arc(0, 0, player.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ===== shields =====
    if (player.shield > 0) {
      for (let i = 0; i < player.shield; i++) {
        const ang = performance.now() / 700 + i * ((Math.PI * 2) / player.shield);
        const sx = player.x + Math.cos(ang) * 24;
        const sy = player.y + Math.sin(ang) * 24;
        ctx.fillStyle = "rgba(0,0,0,.55)";
        ctx.beginPath();
        ctx.arc(sx, sy, 3.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ===== ink particles =====
    for (const p of ink) {
      const alpha = clamp(p.t / 0.9, 0, 1);

      if (p.kind === "splat" && images.bloodInk) {
        ctx.save();
        ctx.globalAlpha = 0.75 * alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        drawSpriteRaw("bloodInk", 0, 0, p.r * 2, p.r * 2, 0, false, 1);
        ctx.restore();
        continue;
      }

      if (p.kind === "smoke" && images.smokeInk) {
        ctx.save();
        ctx.globalAlpha = 0.22 * alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        const rr0 = p.r * (1.08 - alpha * 0.25);
        drawSpriteRaw("smokeInk", 0, 0, rr0 * 2, rr0 * 2, 0, false, 1);
        ctx.restore();
        continue;
      }

      ctx.fillStyle = `rgba(10,12,16,${0.65 * alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r || 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // =========================
  // Loop
  // =========================
  let last = performance.now();
  function loop(now) {
    const dt = clamp((now - last) / 1000, 0, 0.033);
    last = now;

    if (state.mode === "play") {
      state.t += dt;
      update(dt);
    }
    draw();
    requestAnimationFrame(loop);
  }

  // =========================
  // Boot
  // =========================
  async function boot() {
    resize();

    await Promise.all([
      loadImage("player", ASSETS.player),
      loadImage("enemy", ASSETS.enemy),
      loadImage("boss", ASSETS.boss),
      loadImage("bullet", ASSETS.bullet),
      loadImage("gem", ASSETS.gem),
      loadImage("bgPaper", ASSETS.bgPaper),
      loadImage("bloodInk", ASSETS.bloodInk),
      loadImage("smokeInk", ASSETS.smokeInk),
    ]);

    uiBest.textContent = String(state.best);
    reset();
    requestAnimationFrame(loop);
  }

  boot();
})();