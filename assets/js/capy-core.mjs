// 与 DOM 无关的规则，供游戏及自动化回归测试共用。
export const WORLD = { width: 1120, height: 632 };
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function constrain(x, y, radius = 22) {
  // 对应背景草地的保守椭圆，世界坐标不随窗口尺寸改变。
  const cx = 582, cy = 423, rx = 442 - radius, ry = 165 - radius;
  const dx = x - cx, dy = y - cy;
  const q = Math.hypot(dx / rx, dy / ry);
  return q <= 1 ? { x, y } : { x: cx + dx / q, y: cy + dy / q };
}
export function damagePlayer(player, amount) {
  if (player.invulnerable > 0 || amount <= 0) return 'ignored';
  player.invulnerable = .65;
  if (player.shield > 0) { player.shield--; return 'shield'; }
  player.hp = Math.max(0, player.hp - amount);
  return player.hp <= 0 ? 'dead' : 'hit';
}
export function gainXP(xp, amount) {
  xp.current += amount;
  let levels = 0;
  while (xp.current >= xp.need) {
    xp.current -= xp.need;
    xp.level++;
    xp.need = Math.floor(xp.need * 1.22 + 8);
    levels++;
  }
  return levels;
}
export function segmentHits(ax, ay, bx, by, x, y, radius) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(ax + dx * t - x, ay + dy * t - y) <= radius;
}
