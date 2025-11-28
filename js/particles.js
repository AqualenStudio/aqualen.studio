// 年份显示
const yearSpan = document.getElementById("year-span");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

// 粒子背景
(function () {
  const canvas = document.getElementById("particles-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let width, height;
  const particles = [];
  const COUNT = 70;

  function resize() {
    width = canvas.width = window.innerWidth * window.devicePixelRatio;
    height = canvas.height = window.innerHeight * window.devicePixelRatio;
  }

  window.addEventListener("resize", resize);
  resize();

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.2 + Math.random() * 2.4,
      vx: -0.2 + Math.random() * 0.4,
      vy: -0.3 + Math.random() * 0.3,
      alpha: 0.3 + Math.random() * 0.6
    });
  }

  function step() {
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -50) p.x = width + 50;
      if (p.x > width + 50) p.x = -50;
      if (p.y < -50) p.y = height + 50;
      if (p.y > height + 50) p.y = -50;

      ctx.beginPath();
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(56,189,248,${p.alpha})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(step);
  }

  step();
})();
