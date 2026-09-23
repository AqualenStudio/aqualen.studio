// 规则单元测试及隔离 DOM 的游戏流程回归；不向正式页面暴露调试状态。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { constrain, damagePlayer, gainXP, segmentHits } from '../assets/js/capy-core.mjs';
let passed = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }
test('护盾受击后提供保护，不会连续帧清空', () => {
  const p = { hp: 100, shield: 3, invulnerable: 0 };
  assert.equal(damagePlayer(p, 10), 'shield');
  for (let i = 0; i < 30; i++) assert.equal(damagePlayer(p, 10), 'ignored');
  assert.equal(p.shield, 2); assert.equal(p.hp, 100);
});
test('伤害与死亡钳制', () => {
  const p = { hp: 5, shield: 0, invulnerable: 0 };
  assert.equal(damagePlayer(p, 10), 'dead'); assert.equal(p.hp, 0);
});
test('大额经验保留每一次升级选择', () => {
  const xp = { level: 1, current: 0, need: 30 };
  assert.equal(gainXP(xp, 100), 2); assert.equal(xp.level, 3); assert.equal(xp.current, 26);
});
test('高速箭矢使用线段检测，不穿过敌人', () => {
  assert.equal(segmentHits(0,0,200,0,100,0,10), true);
  assert.equal(segmentHits(0,0,200,0,100,30,10), false);
});
test('世界边界与画布尺寸无关，极端位置仍在草地', () => {
  for (const [x,y] of [[-1000,3000],[5000,-200],[-1e6,1e6],[582,423]]) {
    const p = constrain(x,y,22);
    assert.ok(Math.hypot((p.x-582)/420,(p.y-423)/143) <= 1.00001);
  }
});

if (!vm.SourceTextModule) throw new Error('Run: node --experimental-vm-modules scripts/test-capy.mjs');
const elements = new Map();
class Element {
  constructor(id) { this.id=id; this.listeners={}; this.children=[]; this.style={}; this.disabled=false; this.classes=new Set(); this.classList={ add:c=>this.classes.add(c), remove:c=>this.classes.delete(c), contains:c=>this.classes.has(c), toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c) }; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  click() { for(const fn of this.listeners.click || []) fn({detail:1}); }
  setAttribute(name,value) { this[name]=value; }
  focus() { document.activeElement=this; }
  querySelector(selector) { return selector.includes('button') ? this.children[0] || elements.get('btnResume') : null; }
  querySelectorAll() { return this.children; }
  replaceChildren(...children) { this.children=children; }
  contains(target) { return elements.has(target?.id); }
  hasPointerCapture(id) { return this.pointer===id; }
  setPointerCapture(id) { this.pointer=id; }
  releasePointerCapture() { this.pointer=null; }
  getBoundingClientRect() { return {left:0,top:0,width:96,height:96}; }
  closest() { return null; }
}
const document = { activeElement:null, hidden:false, documentElement:new Element('root'), getElementById:id=>{ if(!elements.has(id)) elements.set(id,new Element(id)); return elements.get(id); }, createElement:()=>new Element('button'), addEventListener(){}, querySelector:()=>({querySelector:()=>new Element('topbar'),addEventListener(){},contains:()=>true}) };
let frame;
const context = vm.createContext({document,window:{addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},matchMedia:()=>({matches:true}),setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:fn=>{frame=fn;},console});
const source = await readFile(new URL('../assets/js/rogue-survivor.js',import.meta.url),'utf8');
const core = new vm.SourceTextModule(await readFile(new URL('../assets/js/capy-core.mjs',import.meta.url),'utf8'),{context});
const rendering = new vm.SourceTextModule('export async function createRenderer(){return {missing:[],render(){}}}',{context});
const main = new vm.SourceTextModule(source + '\nexport {game,xp,levels,pendingLevels,update,reset,setMode,receiveDamage,choose,showUpgrade,spawn,shoot,backgroundPause,movement,dash};',{context});
await main.link(name=>name.includes('capy-core')?core:rendering);
await main.evaluate();
const api=main.namespace;
test('开始前不计时，点击开始后运行',()=>{
  frame(1000); frame(2000); assert.equal(api.game.time,0);
  elements.get('btnStart').click(); frame(2017); assert.ok(api.game.time>0);
});
test('暂停与失焦冻结，恢复后可继续',()=>{
  api.setMode('pause'); const time=api.game.time; frame(3017); assert.equal(api.game.time,time);
  api.setMode('play'); frame(3034); assert.ok(api.game.time>time);
  api.backgroundPause(); assert.equal(api.game.mode,'pause');
});
test('重开清理弹幕、升级、计时和冲刺',()=>{
  api.game.bullets.push({}); api.levels.damage=4; api.game.player.dashReady=1;
  api.reset(); assert.equal(api.game.time,0); assert.equal(api.game.bullets.length,0); assert.equal(api.levels.damage,undefined); assert.equal(api.game.player.dashReady,0);
});
test('升级卡排队发放，不覆盖多次升级',()=>{
  api.reset(); api.game.gems.push({x:582,y:433,value:100}); api.update(1/60);
  assert.equal(api.pendingLevels,2); assert.equal(api.game.mode,'levelup');
  api.choose(0); assert.equal(api.pendingLevels,1); assert.equal(api.game.mode,'levelup');
  api.choose(0); assert.equal(api.pendingLevels,0); assert.equal(api.game.mode,'play');
});
test('穿透弹同一敌人只命中一次',()=>{
  api.reset(); api.spawn(); const enemy=api.game.enemies[0]; Object.assign(enemy,{x:720,y:423,hp:100,maxHp:100,speed:0});
  api.game.bullets.push({x:720,y:423,vx:0,vy:0,damage:12,remaining:3,life:1,hit:new Set()});
  api.update(1/60); api.update(1/60); assert.equal(enemy.hp,88);
});
test('Boss 被击败后可安全处理同帧多颗子弹',()=>{
  api.reset(); api.spawn(true); const boss=api.game.boss; Object.assign(boss,{x:720,y:423,hp:1,speed:0});
  for(let i=0;i<3;i++) api.game.bullets.push({x:720,y:423,vx:0,vy:0,damage:12,remaining:1,life:1,hit:new Set()});
  api.update(1/60); assert.equal(api.game.boss,null); assert.equal(api.game.kills,1);
});
test('死亡显示结算，重开恢复操作',()=>{
  api.reset(); api.receiveDamage(1000); assert.equal(api.game.mode,'gameover');
  assert.equal(elements.get('overGame').classList.contains('show'),true);
  elements.get('btnAgain').click(); assert.equal(api.game.mode,'play'); assert.equal(api.game.player.hp,100);
});
test('摇杆移动与 pointercancel 清理',()=>{
  api.reset(); const stick=elements.get('joystick');
  stick.listeners.pointerdown[0]({pointerId:1,clientX:82,clientY:48,preventDefault(){}});
  assert.equal(api.movement().x,1); const old=api.game.player.x; api.update(1/60); assert.ok(api.game.player.x>old);
  stick.listeners.pointercancel[0]({pointerId:1}); assert.equal(api.movement().x,0);
});
test('冲刺有持续位移与冷却，不连续触发',()=>{
  api.reset(); api.dash(); const x=api.game.player.x; api.update(1/60);
  assert.ok(api.game.player.x-x>10); assert.ok(api.game.player.dashReady>1);
  const remaining=api.game.player.dashReady; api.dash(); assert.equal(api.game.player.dashReady,remaining);
});
test('Boss 蓄力后结算范围攻击',()=>{
  api.reset(); api.spawn(true); const b=api.game.boss;
  Object.assign(b,{x:642,y:433,attack:0,grace:0,speed:0});
  api.update(1/60); assert.ok(b.warning>1);
  for(let i=0;i<72;i++) api.update(1/60);
  assert.ok(api.game.player.hp<100); assert.ok(b.attack>3);
});
test('键盘离开游戏时不拦截 Tab',()=>{
  api.reset(); let prevented=false;
  elements.get('stage').listeners.keydown[0]({key:'Tab',target:elements.get('stage'),preventDefault(){prevented=true;}});
  assert.equal(prevented,false);
});
console.log(`${passed} tests passed.`);
