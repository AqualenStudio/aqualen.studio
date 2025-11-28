// 小游戏：Bubble Rush

let bubbleState = {
  running: false,
  score: 0,
  combo: 1,
  timeLeft: 45,
  bubbles: [],
  lastSpawn: 0
};

const SCORE_PER_HIT = 10;
const COMBO_DECAY_MS = 1200;

function startBubbleGame() {
  const canvas = document.getElementById("capyGameCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  bubbleState = {
    running: true,
    score: 0,
    combo: 1,
    timeLeft: 45,
    bubbles: [],
    lastSpawn: performance.now()
  };
  updateHUD();

  let lastTime = performance.now();
  function loop(now) {
    if (!bubbleState.running) return;
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    bubbleState.timeLeft -= dt;
    if (bubbleState.timeLeft <= 0) {
      bubbleState.timeLeft = 0;
      bubbleState.running = false;
      drawScene(ctx, canvas);
      alert("Time! Final score: " + bubbleState.score);
      return;
    }

    spawnBubbles(now, canvas);
    updateBubbles(dt, canvas);
    drawScene(ctx, canvas);
    updateHUD();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  canvas.onmousedown = (e) => handleBubbleClick(e, canvas);
  canvas.ontouchstart = (e) => {
    e.preventDefault();
    handleBubbleClick(e.touches[0], canvas);
  };
}

function spawnBubbles(now, canvas) {
  const spawnInterval = 280; // ms
  if (now - bubbleState.lastSpawn < spawnInterval) return;
  bubbleState.lastSpawn = now;

  const count = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const isShard = Math.random() < 0.18; // 红色碎片
    const r = isShard ? 14 + Math.random() * 10 : 18 + Math.random() * 18;
    bubbleState.bubbles.push({
      x: Math.random() * canvas.width,
      y: canvas.height + r + Math.random() * 30,
      r,
      vy: -40 - Math.random() * 40,
      alpha: 0,
      spawnAt: performance.now(),
      isShard
    });
  }

  if (bubbleState.bubbles.length > 60) {
    bubbleState.bubbles.splice(0, bubbleState.bubbles.length - 60);
  }
}

function updateBubbles(dt, canvas) {
  const now = performance.now();
  bubbleState.bubbles = bubbleState.bubbles.filter((b) => {
    b.y += b.vy * dt;
    const age = (now - b.spawnAt) / 1000;
    b.alpha = Math.min(1, age / 0.4);
    return b.y + b.r > -30;
  });

  if (
    bubbleState.combo > 1 &&
    (!bubbleState.lastHit || now - bubbleState.lastHit > COMBO_DECAY_MS)
  ) {
    bubbleState.combo = 1;
  }
}

function drawScene(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bg.addColorStop(0, "#020617");
  bg.addColorStop(0.4, "#020617");
  bg.addColorStop(1, "#000000");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(15,23,42,0.95)";
  ctx.fillRect(0, canvas.height * 0.55, canvas.width, canvas.height * 0.45);
  ctx.fillStyle = "rgba(56,189,248,0.24)";
  ctx.fillRect(0, canvas.height * 0.55 - 2, canvas.width, 2);

  for (const b of bubbleState.bubbles) {
    const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    if (b.isShard) {
      grd.addColorStop(0, `rgba(248,113,113,${b.alpha})`);
      grd.addColorStop(1, "rgba(127,29,29,0)");
    } else {
      grd.addColorStop(0, `rgba(56,189,248,${b.alpha})`);
      grd.addColorStop(0.45, `rgba(15,23,42,0)`);
      grd.addColorStop(1, "rgba(15,23,42,0)");
    }
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();

    if (!b.isShard) {
      ctx.strokeStyle = `rgba(226,232,240,${0.4 * b.alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = "rgba(15,23,42,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.55);
  for (let x = 0; x <= canvas.width; x += 18) {
    const y =
      canvas.height * 0.55 + Math.sin(Date.now() / 700 + x / 40) * 3;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function handleBubbleClick(e, canvas) {
  if (!bubbleState.running) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  let hitIndex = -1;
  for (let i = bubbleState.bubbles.length - 1; i >= 0; i--) {
    const b = bubbleState.bubbles[i];
    const dx = x - b.x;
    const dy = y - b.y;
    if (dx * dx + dy * dy <= b.r * b.r) {
      hitIndex = i;
      break;
    }
  }

  if (hitIndex === -1) {
    bubbleState.combo = 1;
    updateHUD();
    return;
  }

  const b = bubbleState.bubbles[hitIndex];
  bubbleState.bubbles.splice(hitIndex, 1);
  bubbleState.lastHit = performance.now();

  if (b.isShard) {
    bubbleState.score = Math.max(0, bubbleState.score - 30);
    bubbleState.combo = 1;
  } else {
    bubbleState.score += SCORE_PER_HIT * bubbleState.combo;
    bubbleState.combo = Math.min(9, bubbleState.combo + 1);
  }

  updateHUD();
}

function updateHUD() {
  const s = document.getElementById("hud-score");
  const c = document.getElementById("hud-combo");
  const t = document.getElementById("hud-time");
  if (!s || !c || !t) return;
  s.textContent = bubbleState.score;
  c.textContent = "x" + bubbleState.combo;
  t.textContent = Math.max(0, bubbleState.timeLeft | 0) + "s";
}
