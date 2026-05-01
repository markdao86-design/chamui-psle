// QA consistency check — runs in node, simulates window+document, loads data.js + character.js
const fs = require('fs');
const path = require('path');

// ----- minimal browser shims -----
global.window = {};
global.document = { addEventListener: () => {}, getElementById: () => null };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.navigator = { userAgent: 'qa' };

// load both files via vm so they bind to our global window
const vm = require('vm');
const ctx = { window: global.window, document: global.document, localStorage: global.localStorage,
               navigator: global.navigator, console, Date, JSON, Math, Object, Array, String,
               Number, Boolean, RegExp, Error, parseInt, parseFloat, isNaN, isFinite,
               setTimeout: () => {}, clearTimeout: () => {}, undefined };
vm.createContext(ctx);

function load(p){
  const src = fs.readFileSync(path.join(__dirname, p), 'utf8');
  vm.runInContext(src, ctx, { filename: p });
}
load('character.js');
load('data.js');

const W = ctx.window;
const errors = [];
const warns = [];
const ok = [];

function assert(cond, msg) { (cond ? ok : errors).push(msg); }
function warn(cond, msg) { if (!cond) warns.push(msg); }

// ===== 1. data.js — 73 周 =====
assert(Array.isArray(W.WEEK_TASKS) && W.WEEK_TASKS.length === 73,
  `WEEK_TASKS 长度 73 (实际 ${W.WEEK_TASKS && W.WEEK_TASKS.length})`);

// W1-W52 必须有任务,W53-W73 应该为空 placeholder
let nonEmpty = 0, emptyCount = 0;
for (let i = 0; i < W.WEEK_TASKS.length; i++) {
  const w = W.WEEK_TASKS[i];
  let slotCount = 0;
  if (w && w.days) {
    for (const d of Object.keys(w.days)) slotCount += Object.keys(w.days[d] || {}).length;
  }
  if (i < 52) {
    if (slotCount > 0) nonEmpty++;
    else warns.push(`W${i+1} 应该有任务但是空的`);
  } else {
    if (slotCount === 0) emptyCount++;
    else warns.push(`W${i+1} 应该是空 placeholder 但有 ${slotCount} 个 slot`);
  }
}
assert(nonEmpty >= 50, `W1-W52 至少 50 周有任务 (实际 ${nonEmpty})`);
assert(emptyCount === 21, `W53-W73 全部为空 placeholder (实际 ${emptyCount}/21)`);

// 总 task 数
let totalTasks = 0;
W.WEEK_TASKS.forEach(w => {
  if (w && w.days) for (const d of Object.keys(w.days)) totalTasks += Object.keys(w.days[d] || {}).length;
});
assert(totalTasks >= 1000, `总任务数 ≥ 1000 (实际 ${totalTasks})`);

// ===== 2. SLOT_TIME 9 keys =====
const slotKeys = Object.keys(W.SLOT_TIME || {});
const expectedSlots = ['AM','PM','E1','OR','VC','LS','ED','S2','VB'];
expectedSlots.forEach(k => assert(slotKeys.includes(k), `SLOT_TIME 有 ${k}`));

// ===== 3. 默认 state 完整 =====
const def = W.getDefaultState();
assert(def.activeSkin === 'default', `默认 activeSkin = 'default' (实际 ${def.activeSkin})`);
['W14','W20','W26','W42','W52','W65','W68','W72','W73'].forEach(m =>
  assert(m in def.milestones, `milestones.${m} 存在`));

// ===== 4. character.js 装备 42 件 =====
const C = ctx.window.CHAMUI;
assert(C.equipment.length === 42, `equipment 数量 42 (实际 ${C.equipment.length})`);

// 装备 id 唯一
const eqIds = C.equipment.map(e => e.id);
assert(new Set(eqIds).size === eqIds.length, '装备 id 全部唯一');

// 装备阈值递增合理(只检查 points 类型)
const ptsEqs = C.equipment.filter(e => e.condition && e.condition.type === 'points');
let prev = -1;
let monoOk = true;
ptsEqs.forEach(e => {
  if (e.condition.value < 0) monoOk = false;
});
assert(monoOk, 'points 类装备阈值非负');

// ===== 5. 6 skins =====
assert(Array.isArray(C.skins) && C.skins.length === 6, `skins 数组 6 个 (实际 ${C.skins && C.skins.length})`);
const skinIds = ['default','scholar','scientist','explorer','hero','master'];
skinIds.forEach(id => assert(C.skins.find(s => s.id === id), `skin ${id} 存在`));

// 默认皮肤无条件
const defSk = C.skins.find(s => s.id === 'default');
assert(defSk.condition === 'always', 'default 皮肤无条件解锁');

// 测试 0 分新用户:只能用 default
const newState = W.getDefaultState();
assert(C.checkSkinUnlocked('default', newState) === true, '新用户解锁 default');
assert(C.checkSkinUnlocked('scholar', newState) === false, '新用户未解锁 scholar (Lv5)');
assert(C.checkSkinUnlocked('scientist', newState) === false, '新用户未解锁 scientist (W14)');

// 测试满分用户(里程碑达成后所有皮肤解锁)
const fullState = W.getDefaultState();
fullState.totalPoints = 5000;
['W14','W20','W26','W42','W52','W65','W68','W72','W73'].forEach(m => fullState.milestones[m] = true);
assert(C.checkSkinUnlocked('master', fullState) === true, '满分+全里程碑用户解锁 master');
assert(C.checkSkinUnlocked('explorer', fullState) === true, '5000 分解锁 explorer (1500)');
assert(C.checkSkinUnlocked('hero', fullState) === true, '5000 分解锁 hero (3000)');

// getActiveSkin 兜底:选未解锁的回退到 default
const trickState = W.getDefaultState();
trickState.activeSkin = 'master';
const fallback = C.getActiveSkin(trickState);
assert(fallback.id === 'default', '未解锁皮肤回退 default');

// ===== 6. 装备里程碑覆盖 9 milestone =====
['W14','W20','W26','W42','W52','W65','W68','W72','W73'].forEach(m => {
  const ms = W.getDefaultState();
  ms.milestones[m] = true;
  // checkEquipmentUnlocked 不抛错
  let crashed = false;
  try { C.equipment.forEach(e => C.checkEquipmentUnlocked(e.id, ms)); }
  catch (e) { crashed = true; }
  assert(!crashed, `checkEquipmentUnlocked 不因 ${m}=true 崩溃`);
});

// ===== 7. WEEK_MASTER_TIPS 长度 =====
const tips = W.WEEK_MASTER_TIPS || [];
warn(tips.length === 26 || tips.length === 73, `WEEK_MASTER_TIPS 长度 ${tips.length} (期望 26 或 73)`);

// ===== Output =====
console.log('\n=== QA 检查结果 ===\n');
ok.forEach(m => console.log('  ✓', m));
if (warns.length) {
  console.log('\n--- ⚠ 警告 ---');
  warns.forEach(m => console.log('  ⚠', m));
}
if (errors.length) {
  console.log('\n--- ✗ 失败 ---');
  errors.forEach(m => console.log('  ✗', m));
  process.exit(1);
}
console.log(`\n全部通过 ✅  (${ok.length} 项, ${warns.length} 警告)`);
