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

// v16: 全部 73 周都必须有任务
let nonEmpty = 0;
for (let i = 0; i < W.WEEK_TASKS.length; i++) {
  const w = W.WEEK_TASKS[i];
  let slotCount = 0;
  if (w && w.days) {
    for (const d of Object.keys(w.days)) slotCount += Object.keys(w.days[d] || {}).length;
  }
  if (slotCount > 0) nonEmpty++;
  else warns.push(`W${i+1} 应该有任务但是空的`);
}
assert(nonEmpty === 73, `v16: W1-W73 全部 73 周都有任务 (实际 ${nonEmpty})`);

// 总 task 数 — v16 应有 ~2855
let totalTasks = 0;
W.WEEK_TASKS.forEach(w => {
  if (w && w.days) for (const d of Object.keys(w.days)) totalTasks += Object.keys(w.days[d] || {}).length;
});
assert(totalTasks >= 2500, `v16 总任务数 ≥ 2500 (实际 ${totalTasks})`);

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
assert(C.equipment.length === 72, `equipment 数量 72 (v19.8 +3 中期周次装备 W18/24/40) (实际 ${C.equipment.length})`);

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
assert(C.checkSkinUnlocked('hero', fullState) === true, '5000 分解锁 hero (3200)');

// v16: hero 阈值改 3200
const hero = C.skins.find(s => s.id === 'hero');
assert(hero && hero.condition && hero.condition.value === 3200, `v16: hero skin 阈值 = 3200 (实际 ${hero && hero.condition && hero.condition.value})`);

// 边界: 3199 不解锁 hero, 3200 解锁
const heroState = W.getDefaultState();
heroState.totalPoints = 3199;
assert(!C.checkSkinUnlocked('hero', heroState), 'v16: 3199 分不解锁 hero');
heroState.totalPoints = 3200;
assert(C.checkSkinUnlocked('hero', heroState), 'v16: 3200 分解锁 hero');

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

// ===== 8. v16 新增: 装备前 100 分密集 (≥4 件) =====
const ptsLow = C.equipment.filter(e => e.condition === 'points' && e.value <= 100);
assert(ptsLow.length >= 4, `v16: 0-100 分内 ≥4 件装备 (实际 ${ptsLow.length})`);
const minPts = Math.min(...C.equipment.filter(e => e.condition === 'points').map(e => e.value));
const maxPts = Math.max(...C.equipment.filter(e => e.condition === 'points').map(e => e.value));
assert(minPts === 5, `v16: 装备最小阈值 = 5 (实际 ${minPts})`);
assert(maxPts === 30000, `v18.33: 装备最大阈值 = 30000 (= SGD 1500 终极, 0.05/分) (实际 ${maxPts})`);

// ===== 9. v16 新增: 6 条铁律 / 周日复盘 / 词汇 500 / 汇率 =====
assert(W.IRON_RULES && W.IRON_RULES.length === 6, `v16: IRON_RULES 长度 6 (实际 ${W.IRON_RULES && W.IRON_RULES.length})`);
assert(W.SUNDAY_REVIEW_STEPS && W.SUNDAY_REVIEW_STEPS.length === 5, `v16: SUNDAY_REVIEW_STEPS 长度 5 (实际 ${W.SUNDAY_REVIEW_STEPS && W.SUNDAY_REVIEW_STEPS.length})`);
assert(W.SGD_PER_POINT === 0.05, `v18.33: SGD_PER_POINT = 0.05 (实际 ${W.SGD_PER_POINT})`);
assert(W.ULTIMATE_PRIZE_SGD === 1500, `v16: ULTIMATE_PRIZE_SGD = 1500 (实际 ${W.ULTIMATE_PRIZE_SGD})`);
assert(W.ULTIMATE_PRIZE_POINTS === 30000, `v18.33: ULTIMATE_PRIZE_POINTS = 30000 (实际 ${W.ULTIMATE_PRIZE_POINTS})`);
const vTotal = (W.VOCAB_500.math.total || 0) + (W.VOCAB_500.sci.total || 0);
assert(vTotal === 500, `v16: VOCAB_500 总词数 500 (实际 ${vTotal})`);
const v1 = W.getVocabForWeek(1);
assert(v1 && v1.subject === '数学', `v16: W1 词汇 = 数学 (实际 ${v1 && v1.subject})`);
const v8 = W.getVocabForWeek(8);
assert(v8 && v8.subject === '科学', `v16: W8 词汇 = 科学 (实际 ${v8 && v8.subject})`);
const v18 = W.getVocabForWeek(18);
assert(v18 === null, `v16: W18 词汇 = null (实际 ${JSON.stringify(v18)})`);

// ===== 10. v16: WEEK_TASKS W53-W73 不再为空 =====
const w60 = W.WEEK_TASKS[59];
const w60Slots = w60 && w60.days ? Object.values(w60.days).reduce((a,b) => a + Object.keys(b).length, 0) : 0;
assert(w60Slots > 0, `v16: W60 应有 daily 任务 (实际 slot 数 ${w60Slots})`);
const w73 = W.WEEK_TASKS[72];
const w73Slots = w73 && w73.days ? Object.values(w73.days).reduce((a,b) => a + Object.keys(b).length, 0) : 0;
assert(w73Slots > 0, `v16: W73 (PSLE 笔试周) 应有 daily 任务 (实际 slot 数 ${w73Slots})`);

// ===== 11. v17.1: Daily Streak state + helpers + 3 streak 装备 =====
const def2 = W.getDefaultState();
assert(def2.dailyStreak && def2.dailyStreak.days === 0, 'v17: 默认 dailyStreak.days = 0');
assert(def2.dailyStreak.bestEver === 0, 'v17: 默认 dailyStreak.bestEver = 0');
assert(def2.dailyStreak.freezeTokens === 0, 'v17: 默认 dailyStreak.freezeTokens = 0');
assert(typeof W.bumpDailyStreak === 'function', 'v17: bumpDailyStreak 函数存在');
assert(typeof W.streakSeverity === 'function', 'v17: streakSeverity 函数存在');
// streak 装备
const streakEqs = C.equipment.filter(e => e.condition === 'streak-days');
assert(streakEqs.length === 8, `v18.58: 有 8 件 streak 装备 (v17:3 + v18.58:5) (实际 ${streakEqs.length})`);
const streakValues = streakEqs.map(e => e.value).sort((a, b) => a - b);
assert(JSON.stringify(streakValues) === '[7,30,50,75,100,150,200,300]', `v18.58: streak 阈值 (实际 ${JSON.stringify(streakValues)})`);
// streak severity 边界
assert(W.streakSeverity(1) === 0, 'v17: 1 天 severity = 0');
assert(W.streakSeverity(7) === 2, 'v17: 7 天 severity = 2');
assert(W.streakSeverity(100) === 4, 'v17: 100 天 severity = 4');
// bumpDailyStreak 测试 (in-memory, 测后还原)
const ts = W.getDefaultState();
const r1 = W.bumpDailyStreak(ts);
assert(r1.added === true && r1.days === 1, 'v17: 第 1 次 bump 加到 days=1');
const r2 = W.bumpDailyStreak(ts);
assert(r2.added === false, 'v17: 同日第 2 次 bump no-op');

// ===== 12. v17.1: WEEKLY_WOW_FACTS 73 条 =====
assert(Array.isArray(W.WEEKLY_WOW_FACTS) && W.WEEKLY_WOW_FACTS.length === 73,
  `v17: WEEKLY_WOW_FACTS 长度 73 (实际 ${W.WEEKLY_WOW_FACTS && W.WEEKLY_WOW_FACTS.length})`);
// 每条都有 hook 和 body
const wowMissing = W.WEEKLY_WOW_FACTS.filter(w => !w.hook || !w.body || !w.week);
assert(wowMissing.length === 0, `v17: 所有 wow 事实都有 week/hook/body (缺 ${wowMissing.length} 条)`);
// week 1-73 都覆盖
const wowWeeks = new Set(W.WEEKLY_WOW_FACTS.map(w => w.week));
const missingWowWeeks = [];
for (let i = 1; i <= 73; i++) if (!wowWeeks.has(i)) missingWowWeeks.push(i);
assert(missingWowWeeks.length === 0, `v17: 73 周 wow 全覆盖 (缺周: ${JSON.stringify(missingWowWeeks)})`);
assert(typeof W.getWeeklyWowFact === 'function', 'v17: getWeeklyWowFact 函数存在');
const w1 = W.getWeeklyWowFact(1);
assert(w1 && w1.week === 1, 'v17: getWeeklyWowFact(1) 返回 week=1');

// v17.2: ENGLISH_WOW_FACTS pool + 按日轮换
assert(Array.isArray(W.ENGLISH_WOW_FACTS) && W.ENGLISH_WOW_FACTS.length >= 25,
  `v17.2: ENGLISH_WOW_FACTS 至少 25 条 (实际 ${W.ENGLISH_WOW_FACTS && W.ENGLISH_WOW_FACTS.length})`);
const enMissing = W.ENGLISH_WOW_FACTS.filter(f => !f.hook || !f.body || !f.tag);
assert(enMissing.length === 0, `v17.2: 所有英语 wow 都有 tag/hook/body (缺 ${enMissing.length})`);
assert(typeof W.getTodayWowFact === 'function', 'v17.2: getTodayWowFact 函数存在');
// Mon (dow=1) 应是 English
const monDate = new Date('2026-05-04');  // 周一
const monWow = W.getTodayWowFact(1, monDate);
assert(monWow && monWow.subjectKey === 'english', `v17.2: 周一 wow = 英语 (实际 ${monWow && monWow.subjectKey})`);
// Tue (dow=2) 应是 Science
const tueDate = new Date('2026-05-05');
const tueWow = W.getTodayWowFact(1, tueDate);
assert(tueWow && tueWow.subjectKey === 'science', `v17.2: 周二 wow = 科学 (实际 ${tueWow && tueWow.subjectKey})`);
// 同一日多次调用稳定返回同一条
const monWow2 = W.getTodayWowFact(1, monDate);
assert(monWow.hook === monWow2.hook, 'v17.2: 同日多次调 wow 稳定');

// ===== v17.5 Phase 2: 神秘宝箱 + 思考题 =====
// 默认 state 含两字段
const def3 = W.getDefaultState();
assert(def3.mysteryBoxes && def3.mysteryBoxes.available === 0, 'v17.5: 默认 mysteryBoxes.available = 0');
assert(def3.mysteryBoxes.opened === 0, 'v17.5: 默认 mysteryBoxes.opened = 0');
assert(typeof def3.thinkPuzzleAnswers === 'object', 'v17.5: 默认 thinkPuzzleAnswers 是对象');
// 函数存在
assert(typeof W.awardMysteryBoxesIfDue === 'function', 'v17.5: awardMysteryBoxesIfDue 存在');
assert(typeof W.openMysteryBoxOnce === 'function', 'v17.5: openMysteryBoxOnce 存在');
assert(typeof W.countTotalCompletedSlots === 'function', 'v17.5: countTotalCompletedSlots 存在');
// 思考题: 14 道 → v19.24 补 W1-W4 = 18 道, 每个难章 1 题
assert(Array.isArray(W.THINK_PUZZLES) && W.THINK_PUZZLES.length >= 18,
  `v17.5+24: THINK_PUZZLES 长度 ≥ 18 (实际 ${W.THINK_PUZZLES && W.THINK_PUZZLES.length})`);
const tpMissing = W.THINK_PUZZLES.filter(p => !p.question || !p.options || p.options.length !== 4 || !p.correct || !p.explanation);
assert(tpMissing.length === 0, `v17.5: 所有思考题完整 (缺 ${tpMissing.length})`);
// 模拟答题 in-memory
const ts2 = W.getDefaultState();
const tp1 = W.submitThinkPuzzleAnswer(ts2, 5, 'B');
assert(tp1 && tp1.correct === true, 'v17.5: 提交 W5 正确答案 B → correct=true');
// 重复提交不再加分
const tp1b = W.submitThinkPuzzleAnswer(ts2, 5, 'A');
assert(tp1b.correct === true, 'v17.5: 重复提交返回原记录 (不重新算)');
// 错答也加 5 分
const ts3 = W.getDefaultState();
const tp2 = W.submitThinkPuzzleAnswer(ts3, 5, 'A');
assert(tp2 && tp2.correct === false, 'v17.5: 错答返回 correct=false');
// 宝箱 award: 模拟 10 个 slot 完成
const ts4 = W.getDefaultState();
ts4.daily = { 1: { Mon: { E1: true, OR: true, VC: true, LS: true, ED: true, S2: true, VB: true }, Tue: { E1: true, OR: true, VC: true } } };
const newBoxes = W.awardMysteryBoxesIfDue(ts4);
assert(newBoxes >= 1, `v17.5: 10 个 slot → ≥1 box (实际 ${newBoxes})`);
assert(ts4.mysteryBoxes.available >= 1, 'v17.5: state.mysteryBoxes.available > 0');
// 开盒: 概率分布大致符合
let counts = { common: 0, wow: 0, rare: 0 };
for (let i = 0; i < 100; i++) {
  const ts5 = W.getDefaultState();
  ts5.mysteryBoxes.available = 1;
  const r = W.openMysteryBoxOnce(ts5);
  if (r) counts[r.tier]++;
}
assert(counts.common > 50 && counts.common < 90, `v17.5: common 概率 50-90 (实际 ${counts.common})`);

// ===== v17.6: 多科 master tips =====
assert(W.ENGLISH_MASTER_TIPS && W.ENGLISH_MASTER_TIPS.length >= 20, `v17.6: ENGLISH_MASTER_TIPS ≥20 (实际 ${W.ENGLISH_MASTER_TIPS && W.ENGLISH_MASTER_TIPS.length})`);
assert(W.SCIENCE_MASTER_TIPS && W.SCIENCE_MASTER_TIPS.length >= 15, `v17.6: SCIENCE_MASTER_TIPS ≥15 (实际 ${W.SCIENCE_MASTER_TIPS && W.SCIENCE_MASTER_TIPS.length})`);
assert(W.MATH_MASTER_TIPS && W.MATH_MASTER_TIPS.length >= 5, `v17.6: MATH_MASTER_TIPS ≥5 (实际 ${W.MATH_MASTER_TIPS && W.MATH_MASTER_TIPS.length})`);
assert(W.CHINESE_MASTER_TIPS && W.CHINESE_MASTER_TIPS.length >= 5, `v17.6: CHINESE_MASTER_TIPS ≥5 (实际 ${W.CHINESE_MASTER_TIPS && W.CHINESE_MASTER_TIPS.length})`);
assert(typeof W.getTodayMasterTip === 'function', 'v17.6: getTodayMasterTip 存在');
const monMt = W.getTodayMasterTip(1, new Date('2026-05-04'));  // 周一
assert(monMt && monMt.dailySubject === '英语', `v17.6: 周一 master tip = 英语 (实际 ${monMt && monMt.dailySubject})`);
const tueMt = W.getTodayMasterTip(1, new Date('2026-05-05'));
assert(tueMt && tueMt.dailySubject === '科学', `v17.6: 周二 master tip = 科学`);
const satMt = W.getTodayMasterTip(1, new Date('2026-05-09'));
assert(satMt && satMt.dailySubject === '数学', `v17.6: 周六 master tip = 数学`);

// ===== v17.7 Phase 3: 每日任务 =====
const def4 = W.getDefaultState();
assert(typeof def4.dailyQuests === 'object', 'v17.7: 默认 dailyQuests 是对象');
assert(W.DAILY_QUEST_POOL && W.DAILY_QUEST_POOL.length >= 6, `v17.7: DAILY_QUEST_POOL ≥6 (实际 ${W.DAILY_QUEST_POOL && W.DAILY_QUEST_POOL.length})`);
const ts7 = W.getDefaultState();
const todayQ = W.getTodayQuest(ts7);
assert(todayQ && todayQ.title, 'v17.7: getTodayQuest 返回当天任务');
const sameQ = W.getTodayQuest(ts7);
assert(sameQ.questId === todayQ.questId, 'v17.7: 同日多次取相同任务');

// ===== v17.7 Phase 4: VOCAB_MEANINGS =====
assert(W.VOCAB_MEANINGS && Object.keys(W.VOCAB_MEANINGS).length >= 80, `v17.7: VOCAB_MEANINGS ≥80 (实际 ${W.VOCAB_MEANINGS && Object.keys(W.VOCAB_MEANINGS).length})`);
assert(W.getVocabMeaning('xylem') === '木质部', 'v17.7: xylem → 木质部');
assert(W.getVocabMeaning('photosynthesis') === '光合作用', 'v17.7: photosynthesis → 光合作用');

// ===== v18 Phase 5.1: 宠物 + 成就 + 每日抽奖 =====
const def8 = W.getDefaultState();
assert(def8.pet && def8.pet.formIdx === 0, 'v18: 默认 pet.formIdx=0');
assert(def8.achievements && Array.isArray(def8.achievements.unlocked), 'v18: achievements.unlocked array');
assert(def8.dailyDraws && def8.dailyDraws.fragments === 0, 'v18: dailyDraws.fragments=0');
assert(W.PET_FORMS && W.PET_FORMS.length === 12, `v19.1: PET_FORMS 12 形态 (实际 ${W.PET_FORMS && W.PET_FORMS.length})`);
// v18.10: SVG 字段验证
assert(W.PET_FORMS.every(f => typeof f.svg === 'string' && f.svg.includes('<svg')), 'v18.10: 每个形态有 svg 字符串');
assert(W.PET_FORMS.every(f => !f.emoji), 'v18.10: 已迁移, 不再有 emoji 字段');
const streaks = W.PET_FORMS.map(f => f.minStreak);
assert(streaks.every((s, i) => i === 0 || s > streaks[i-1]), 'v18.10: minStreak 单调递增');
const ts8 = W.getDefaultState();
// v19.0: 仓鼠进化改为累计打卡天数
ts8.daily = {};
for (let i = 1; i <= 14; i++) ts8.daily[i] = { Mon: { E1: true } };
const form7 = W.getCurrentPetForm(ts8);
assert(form7 && form7.idx === 3, `v19.1: 14天打卡 → 形态 3 小仓鼠 (实际 ${form7 && form7.idx})`);
for (let i = 15; i <= 200; i++) ts8.daily[i] = { Mon: { E1: true } };
const form100 = W.getCurrentPetForm(ts8);
assert(form100 && form100.idx === 11, `v19.1: 200天打卡 → 形态 11 仓鼠王者 (实际 ${form100 && form100.idx})`);
assert(W.ACHIEVEMENTS && W.ACHIEVEMENTS.length >= 28, `v18: ACHIEVEMENTS ≥28 (实际 ${W.ACHIEVEMENTS && W.ACHIEVEMENTS.length})`);
// 模拟解锁 streak_7
const ts9 = W.getDefaultState();
ts9.dailyStreak = { days: 7, bestEver: 7, freezeTokens: 0, lastDate: null, brokenAt: null };
const newAch = W.checkAchievements(ts9);
const hasStreak7 = newAch.find(a => a.id === 'streak_7');
assert(!!hasStreak7, 'v18: streak=7 → 解锁 streak_7 成就');
// 每日抽奖
const ts10 = W.getDefaultState();
const draw1 = W.checkDailyDraw(ts10);
assert(draw1 && draw1.fragments >= 1 && draw1.fragments <= 3, `v18: 第 1 次抽奖给 1-3 片 (实际 ${draw1 && draw1.fragments})`);
const draw2 = W.checkDailyDraw(ts10);
assert(draw2 === null, 'v18: 同一天再抽 = null');

// ===== v18 Phase 5.3: 间隔重复 + 未来自我 =====
const ts11 = W.getDefaultState();
W.enqueueReview(ts11, 'wow', 'test_1');
assert(ts11.spacedRepetition.reviews['wow:test_1'], 'v18: enqueueReview 写入 reviews');
const due0 = W.getDueReviews(ts11);
assert(due0.length === 0, 'v18: 刚 enqueue 的 review 不到期');
const ts12 = W.getDefaultState();
ts12.totalPoints = 1000;
ts12.currentWeek = 10;
const fut = W.predictFutureSelf(ts12);
assert(fut && fut.predictedTotal > 0, 'v18: predictFutureSelf 返回预测分');

// ===== v18.3: mini-game 数据 — P5/P6 PSLE 难度 + 按日轮换 =====
assert(W.MATH_QUESTIONS && W.MATH_QUESTIONS.length >= 60, `v18.3: MATH_QUESTIONS ≥60 P5/P6 题 (实际 ${W.MATH_QUESTIONS && W.MATH_QUESTIONS.length})`);
assert(W.EDITING_PARAGRAPHS && W.EDITING_PARAGRAPHS.length >= 25, `v18.3: EDITING_PARAGRAPHS ≥25 段 (实际 ${W.EDITING_PARAGRAPHS && W.EDITING_PARAGRAPHS.length})`);
assert(W.LISTEN_DICTATIONS && W.LISTEN_DICTATIONS.length >= 12, `v18.3: LISTEN_DICTATIONS ≥12 段 (实际 ${W.LISTEN_DICTATIONS && W.LISTEN_DICTATIONS.length})`);
// 按日轮换函数存在 + 同一天稳定
assert(typeof W.getDailyMathQuestions === 'function', 'v18.3: getDailyMathQuestions 存在');
const m1 = W.getDailyMathQuestions(10);
const m2 = W.getDailyMathQuestions(10);
assert(m1.length === 10 && m1[0].q === m2[0].q, 'v18.3: 同一天 math 稳定');
assert(typeof W.getDailyEditingParagraph === 'function', 'v18.3: getDailyEditingParagraph 存在');
const e1 = W.getDailyEditingParagraph();
const e2 = W.getDailyEditingParagraph();
assert(e1.text === e2.text, 'v18.3: 同一天 editing 稳定');
assert(typeof W.getDailyListenDictation === 'function', 'v18.3: getDailyListenDictation 存在');
// P5/P6 题包含分数/比例/速度关键词
const hasFrac = W.MATH_QUESTIONS.some(q => /\d+\/\d+/.test(q.q));
const hasSpeed = W.MATH_QUESTIONS.some(q => /km\/h|speed/i.test(q.q));
const hasRatio = W.MATH_QUESTIONS.some(q => /[Rr]atio|:/.test(q.q));
const hasPercent = W.MATH_QUESTIONS.some(q => /%/.test(q.q));
assert(hasFrac, 'v18.3: 有分数题');
assert(hasSpeed, 'v18.3: 有速度题');
assert(hasRatio, 'v18.3: 有比例题');
assert(hasPercent, 'v18.3: 有百分比题');
const mq0 = W.MATH_QUESTIONS[0];
assert(mq0.q && typeof mq0.ans === 'number', 'v18: math question 有 q 和 ans');
const ep0 = W.EDITING_PARAGRAPHS[0];
assert(ep0.text && Array.isArray(ep0.errors), 'v18: editing paragraph 有 text 和 errors');
const ld0 = W.LISTEN_DICTATIONS[0];
assert(ld0.text && Array.isArray(ld0.blanks), 'v18: listen dict 有 text 和 blanks');

// ===== v19.6: 加练池 =====
assert(W.POOL_TARGET && typeof W.POOL_TARGET === 'object',
  'v19.6: POOL_TARGET 已导出');
const poolKeys = W.POOL_TARGET ? Object.keys(W.POOL_TARGET) : [];
assert(poolKeys.length === 5,
  `v19.6: POOL_TARGET 5 项 (实际 ${poolKeys.length})`);
const expectedPool = ['OR','WSE','WSL','WUE1','WUE2'];
assert(expectedPool.every(k => W.POOL_TARGET && W.POOL_TARGET[k] === 1),
  'v19.6: POOL_TARGET 含 OR/WSE/WSL/WUE1/WUE2 各 1');
assert(typeof W.getPoolProgress === 'function' &&
       typeof W.addPoolEntry === 'function' &&
       typeof W.calcWeeklyPerfect === 'function' &&
       typeof W.grantWeeklyPerfect === 'function' &&
       typeof W.ensureCurrentWeekPool === 'function',
  'v19.6: 加练池 5 个函数全部导出');
assert(typeof W.WEEKLY_PERFECT_BONUS === 'number' && W.WEEKLY_PERFECT_BONUS === 30,
  'v19.6: WEEKLY_PERFECT_BONUS = 30');
// 验证: addPoolEntry 能写, getPoolProgress 能读, 超额返回 false
const _testState = { currentWeek: 1, weeklyPool: {}, totalPoints: 0, logs: [], weekly: {} };
assert(W.addPoolEntry(_testState, 1, 'OR') === true,
  'v19.6: addPoolEntry OR 第一次返回 true');
assert(W.addPoolEntry(_testState, 1, 'OR') === false,
  'v19.6: addPoolEntry OR 第二次(已满)返回 false');
const _prog = W.getPoolProgress(_testState, 1);
assert(_prog.done === 1 && _prog.total === 5,
  `v19.6: getPoolProgress 写 1 项后 done=1 total=5 (实际 done=${_prog.done} total=${_prog.total})`);
// 验证 app.js 里有 renderWeeklyPoolCard / addPoolAndScore (字符串 grep, 因为 qa 不加载 app.js)
const appSrc = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
assert(/function renderWeeklyPoolCard\(/.test(appSrc),
  'v19.6: app.js 有 renderWeeklyPoolCard 函数');
assert(/function addPoolAndScore\(/.test(appSrc),
  'v19.6: app.js 有 addPoolAndScore 函数');
assert(/_checkWeeklyPerfect\(week\)/.test(appSrc),
  'v19.6: app.js toggleDailyCheck 调 _checkWeeklyPerfect');
assert(!/解锁支线挑战/.test(appSrc),
  'v19.6: 解锁支线挑战按钮已删除');
assert(!/解锁隐藏关卡/.test(appSrc),
  'v19.6: 解锁隐藏关卡按钮已删除');
// 验证 cache buster
const idxSrc = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(/\?v=19\.(3[6789]|40)/.test(idxSrc) && !/\?v=19\.14[a-z][^0-9]/.test(idxSrc),
  'v19.36+: cache buster ≥ 19.36');

// ===== v19.40: 闪卡反面 例句 + 常考题型 =====
assert(typeof W.VOCAB_META === 'object' && Object.keys(W.VOCAB_META).length >= 100,
  `v19.40: VOCAB_META ≥ 100 词 (实际 ${W.VOCAB_META ? Object.keys(W.VOCAB_META).length : 0})`);
assert(typeof W.getVocabMeta === 'function', 'v19.40: getVocabMeta 已导出');
['come across', 'photosynthesis', 'furious'].forEach(w => {
  const m = W.getVocabMeta(w);
  assert(m && m.sent && m.qtype, `v19.40: "${w}" 有 sent + qtype`);
});
const _fbMeta = W.getVocabMeta('hibernation');
assert(_fbMeta && _fbMeta.qtype && /Science/.test(_fbMeta.qtype),
  'v19.40: 未列词 fallback 返回 Science category qtype');
assert(/window\.getVocabMeta\s*\?\s*window\.getVocabMeta\(word\)/.test(appSrc),
  'v19.40: _renderFlashcardSession 调 getVocabMeta');
assert(/fc-card-qtype/.test(appSrc), 'v19.40: 闪卡 back render 加 .fc-card-qtype');
assert(/\.fc-card-qtype\s*\{/.test(idxSrc), 'v19.40: CSS 加 .fc-card-qtype');
assert(/height:280px/.test(idxSrc), 'v19.40: 闪卡 height 增到 280px');

// ===== v19.39: 基于老师反馈重排 =====
// page-summer 顶部加老师反馈卡
assert(/英文老师 5-29 反馈/.test(idxSrc), 'v19.39: page-summer 加老师反馈卡');
assert(/4\/15 \(27%\)/.test(idxSrc), 'v19.39: 反馈卡含 B 册 OE 4/15');
assert(/10\/15\+/.test(idxSrc), 'v19.39: 反馈卡含目标 10/15+');
// 整体节奏表更新
assert(/W1 OE 攻坚/.test(idxSrc), 'v19.39: W1 主题改为 OE 攻坚');
assert(/W2 Composition 看图/.test(idxSrc), 'v19.39: W2 主题改为 Composition 看图');
// SUMMER_CURRICULUM 弱点导向 — 周一加重 OE 2 篇
const _mondayTask = (W.SUMMER_CURRICULUM || []).find(d => d.dow === '周一' && d.weekLabel === 'W1 P2 攻坚')
                 || (W.SUMMER_CURRICULUM || []).find(d => d.dow === '周一' && d.weekLabel !== 'W0 启动');
assert(_mondayTask && /Comp OE 2 篇/.test(_mondayTask.tasks[0].label),
  'v19.39: 周一 A 时段改为 Comp OE 2 篇');
// 5-29 基线日加 B 册 OE 起点
const _baseline = (W.SUMMER_CURRICULUM || []).find(d => d.date === '2026-05-29');
assert(_baseline && /4\/15/.test(_baseline.title || ''),
  'v19.39: 5-29 baseline title 提及 4/15');
// 周五加 X2 B 册 OE 加测
const _friday = (W.SUMMER_CURRICULUM || []).find(d => d.dow === '周五' && d.weekLabel !== 'W0 启动');
const _x2 = _friday && _friday.tasks.find(t => t.id === 'X2');
assert(_x2 && /B 册 OE/.test(_x2.label),
  'v19.39: 周五 X2 chip = B 册 OE 加测');
// v19.36: balanceHomeColumns 改用 _sumChildrenHeights 排除 filler 自身高度
assert(/function _sumChildrenHeights\(col\)/.test(appSrc), 'v19.36: _sumChildrenHeights 已加 (排除 filler 测纯内容高)');
assert(/_sumChildrenHeights\(left\)/.test(appSrc) && /_sumChildrenHeights\(right\)/.test(appSrc), 'v19.36: balanceHomeColumns 调用 _sumChildrenHeights');
// v19.35 信任度引擎 (data.js)
const _v35data = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
assert(/function getConfidenceLevel\(state\)/.test(_v35data), 'v19.35: getConfidenceLevel 已定义');
assert(/function admissionProbabilityWithCI\(childAL, schoolCOP, alWidth\)/.test(_v35data), 'v19.35: admissionProbabilityWithCI 已定义 (含 clamp)');
assert(/function rawMarkToAL\(score\)/.test(_v35data), 'v19.35: rawMarkToAL 已定义');
assert(/window\.getConfidenceLevel = getConfidenceLevel/.test(_v35data), 'v19.35: getConfidenceLevel window 导出');
assert(/window\.admissionProbabilityWithCI/.test(_v35data), 'v19.35: admissionProbabilityWithCI window 导出');
assert(/monthlyMockHistory: \[\]/.test(_v35data), 'v19.35: state schema 加 monthlyMockHistory');
assert(/psleDone: false/.test(_v35data), 'v19.35: state schema 加 psleDone flag');
// v19.35 UI 信任度显示 + CI 区间 (app.js)
assert(/信任度 \$\{starStr\}/.test(appSrc), 'v19.35: 主页录取卡显示信任度 ★');
assert(/admissionProbabilityWithCI\(total_AL, s\.cop, conf\.alWidth\)/.test(appSrc), 'v19.35: renderSchool 调 admissionProbabilityWithCI');
assert(/为什么 \? 怎么涨信任度\?/.test(appSrc) || /为什么 ± N\? 怎么涨信任度/.test(appSrc), 'v19.35: showALExplain 加第 5 节');
// v19.35 防 broken refs: openMonthlyMockExam 不能出现 (本轮拆分 ship)
assert(!/openMonthlyMockExam/.test(appSrc), 'v19.35: openMonthlyMockExam 引用全删 (本轮未实施, 拆分 ship)');
// v19.35 左右栏自动对齐
assert(/function balanceHomeColumns\(\)/.test(appSrc), 'v19.35: balanceHomeColumns 已定义');
assert(/balanceHomeColumns\(\)/.test(appSrc), 'v19.35: balanceHomeColumns 在 renderAll 调用');
assert(/col-balance-filler/.test(idxSrc), 'v19.35: index.html 加 col-balance-filler CSS 类');
assert(/id="leftColFiller"/.test(idxSrc) && /id="rightColFiller"/.test(idxSrc), 'v19.35: index.html 左右栏末加 filler 元素');
// v19.34 P0-3: 数学 paper auto-tag + 抽题函数 + mini-game hub 2 入口
const _v34data = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
assert(/function getMathQuestionsByPaper\(diff, n, paper\)/.test(_v34data), 'v19.34 P0-3: getMathQuestionsByPaper 已加');
assert(/function _autoTagMathPaper\(/.test(_v34data), 'v19.34 P0-3: _autoTagMathPaper 启发式分类');
assert(/window\.getMathQuestionsByPaper/.test(_v34data), 'v19.34 P0-3: getMathQuestionsByPaper window 导出');
assert(/openMathGame\(1\)/.test(appSrc) && /openMathGame\(2\)/.test(appSrc), 'v19.34 P0-3: mini-game hub 加 P1 + P2 双入口');
assert(/function openMathGame\(paper\)/.test(appSrc), 'v19.34 P0-3: openMathGame 接 paper 参数');
assert(/数学 P1 速算/.test(appSrc) && /数学 P2 应用/.test(appSrc), 'v19.34 P0-3: P1/P2 入口 label');
// v19.34 P0-1: AL 公式澄清 + showALExplain 弹窗
assert(/function showALExplain\(/.test(appSrc), 'v19.34 P0-1: showALExplain 弹窗函数');
assert(/window\.showALExplain = showALExplain/.test(appSrc), 'v19.34 P0-1: showALExplain window 导出');
assert(/MOE 标准.*4 科 AL 等权加总/.test(appSrc), 'v19.34 P0-1: 录取卡顶部加 MOE 标识');
assert(/onclick="showALExplain\(\)"/.test(appSrc), 'v19.34 P0-1: 录取卡链接到 AL 完整说明');
// v19.34 P0-1: CLAUDE.md 修正陈旧加权描述
const claudemd = fs.readFileSync(path.join(__dirname, 'CLAUDE.md'), 'utf8');
assert(/v19\.34 文档纠错/.test(claudemd), 'v19.34 P0-1: CLAUDE.md 修正陈旧公式描述');
assert(!/AL = f\(数学 25%/.test(claudemd), 'v19.34 P0-1: CLAUDE.md 陈旧 25/25/20/10/20 公式已删');
// v19.33: 科学 OE 60 题 (50 → 60), 3 个 Systems 主题填补
const _v33data = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
function _countOEByTopic(topic) {
  const re = new RegExp("\\{ id: 'oe_\\d+', topic: '" + topic + "'", 'g');
  return (_v33data.match(re) || []).length;
}
function _countOEAll() {
  const re = /\{ id: 'oe_\d+', topic:/g;
  return (_v33data.match(re) || []).length;
}
assert(_countOEAll() >= 60, `v19.33: SCIENCE_OE_QUESTIONS ≥ 60 题 (实际 ${_countOEAll()})`);
assert(_countOEByTopic('Circulatory') >= 4, `v19.33: Circulatory OE ≥ 4 题 (Expert 4 P0, 实际 ${_countOEByTopic('Circulatory')})`);
assert(_countOEByTopic('Respiratory') >= 3, `v19.33: Respiratory OE ≥ 3 题 (Expert 4 P0, 实际 ${_countOEByTopic('Respiratory')})`);
assert(_countOEByTopic('Electrical Circuits') >= 3, `v19.33: Electrical Circuits OE ≥ 3 题 (Expert 4 P0, 实际 ${_countOEByTopic('Electrical Circuits')})`);
// v19.32: getDifficulty 加 englishMode 钩子
const _v32data = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
assert(/state\.englishMode \|\| 'normal'/.test(_v32data), 'v19.32: getDifficulty 加 englishMode 钩子');
assert(/function checkEnglishModeAdjust\(/.test(_v32data), 'v19.32: checkEnglishModeAdjust 升降级函数');
assert(/window\.checkEnglishModeAdjust = checkEnglishModeAdjust/.test(_v32data), 'v19.32: checkEnglishModeAdjust window 导出');
// v19.32: setEnglishMode UI 切换接入
assert(/function setEnglishMode\(mode\)/.test(appSrc), 'v19.32: setEnglishMode 已定义');
assert(/window\.setEnglishMode = setEnglishMode/.test(appSrc), 'v19.32: setEnglishMode window 导出');
// mini-game hub 用 template literal 渲染 chip, 检查 modeChip 函数定义 + 3 个 mode key 出现
assert(/modeChip\('weak'/.test(appSrc) && /modeChip\('normal'/.test(appSrc) && /modeChip\('strong'/.test(appSrc), 'v19.32: 3 个 mode chip 接入 mini-game hub');
// v19.32: hook 接入 _openMcqGame + listen MCQ (防死代码)
const hookCount = (appSrc.match(/_checkEnglishModeHook/g) || []).length;
assert(hookCount >= 3, `v19.32: _checkEnglishModeHook 接入 ≥ 3 处 (定义+window+grammar+listen, 实际 ${hookCount})`);
assert(/v19\.32: 英语 scaffold 升降级检查/.test(appSrc), 'v19.32: mcq submit 加 scaffold 检查');
// v19.31: Listening MCQ 20 题
const _lmCount = (() => {
  const txt = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
  const re = /const LISTENING_MCQ\s*=\s*\[/m, m = re.exec(txt); if (!m) return 0;
  let i = m.index + m[0].length, depth = 1, c = 0, inStr = false, q = '';
  for (; i < txt.length && depth > 0; i++) {
    const ch = txt[i];
    if (inStr) { if (ch === q && txt[i-1] !== '\\') inStr = false; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; q = ch; continue; }
    if (ch === '[') depth++; else if (ch === ']') depth--;
    else if (ch === '{' && depth === 1) c++;
  }
  return c;
})();
assert(_lmCount >= 20, `v19.31 #2: Listening MCQ ≥ 20 题 (实际 ${_lmCount})`);
// v19.31 防死代码: openListenMcqGame 已接入 + window 导出 + 错题本 GAME_LABEL
assert(/function openListenMcqGame\(/.test(appSrc), 'v19.31: openListenMcqGame 已定义');
assert(/closeMiniGameHub\(\); openListenMcqGame\(\)/.test(appSrc), 'v19.31: 听力 MCQ 接入 mini-game hub');
assert(/window\.openListenMcqGame = openListenMcqGame/.test(appSrc), 'v19.31: openListenMcqGame window 导出');
assert(/listen_mcq: '🎧 听力 MCQ'/.test(appSrc), 'v19.31: 错题本 GAME_LABEL 加 listen_mcq');
assert(/window\.LISTENING_MCQ = LISTENING_MCQ/.test(fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8')), 'v19.31: LISTENING_MCQ window 导出');
// v19.31: 接入错题本 (答错自动入库)
assert(/gameKey: 'listen_mcq', type: 'mcq'/.test(appSrc), 'v19.31: 听力 MCQ 错题接入错题本');
// v19.30: 题库规模
const _v30data = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
function _countItems(name) {
  const re = new RegExp('const '+name+'\\s*=\\s*\\[','m');
  const m = re.exec(_v30data); if (!m) return 0;
  let i = m.index+m[0].length, depth=1, c=0, inStr=false, q='';
  for (; i<_v30data.length && depth>0; i++) {
    const ch = _v30data[i];
    if (inStr) { if (ch===q && _v30data[i-1]!=='\\') inStr=false; continue; }
    if (ch==='"'||ch==="'"||ch==='`') { inStr=true; q=ch; continue; }
    if (ch==='[') depth++;
    else if (ch===']') depth--;
    else if (ch==='{' && depth===1) c++;
  }
  return c;
}
const _oralCount = _countItems('ORAL_QUESTIONS');
const _raCount = _countItems('ORAL_RA_PASSAGES');
const _swCount = _countItems('SITUATIONAL_WRITING');
assert(_oralCount >= 80, `v19.30 #7: Oral SBC 应 ≥ 80 题 (实际 ${_oralCount})`);
assert(_raCount >= 10, `v19.30 #3: Oral RA 应 ≥ 10 段 (实际 ${_raCount})`);
assert(_swCount >= 15, `v19.30 #4: Situational Writing 应 ≥ 15 题 (实际 ${_swCount})`);
// v19.30: 防死代码 — modal 函数必须接入 mini-game hub
assert(/function openOralRAModal\(/.test(appSrc), 'v19.30: openOralRAModal 已定义');
assert(/function openSituationalWritingModal\(/.test(appSrc), 'v19.30: openSituationalWritingModal 已定义');
assert(/closeMiniGameHub\(\); openOralRAModal\(\)/.test(appSrc), 'v19.30: 朗读 RA 接入 mini-game hub');
assert(/closeMiniGameHub\(\); openSituationalWritingModal\(\)/.test(appSrc), 'v19.30: 情境写作 SW 接入 mini-game hub');
// v19.30: window 导出齐
assert(/window\.ORAL_RA_PASSAGES = ORAL_RA_PASSAGES/.test(_v30data), 'v19.30: ORAL_RA_PASSAGES window 导出');
assert(/window\.SITUATIONAL_WRITING = SITUATIONAL_WRITING/.test(_v30data), 'v19.30: SITUATIONAL_WRITING window 导出');
assert(/window\.openOralRAModal = openOralRAModal/.test(appSrc), 'v19.30: openOralRAModal window 导出');
assert(/window\.openSituationalWritingModal = openSituationalWritingModal/.test(appSrc), 'v19.30: openSituationalWritingModal window 导出');
// v19.30: TTS 接入 (P4 RA 需要)
assert(/speechSynthesis\.speak/.test(appSrc), 'v19.30: 接入 speechSynthesis TTS (RA 听示范)');
// v19.29: SRS 死代码已删 (data.js 不应再含这些函数定义)
const _v29data = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
assert(!/function scheduleWrongAnswer\(/.test(_v29data), 'v19.29 死代码清理: scheduleWrongAnswer 已删');
assert(!/function promoteSRS\(/.test(_v29data), 'v19.29 死代码清理: promoteSRS 已删');
assert(!/function demoteSRS\(/.test(_v29data), 'v19.29 死代码清理: demoteSRS 已删');
assert(!/function getOverdueReviews\(/.test(_v29data), 'v19.29 死代码清理: getOverdueReviews 已删');
assert(!/^const SRS_INTERVALS\s*=/m.test(_v29data), 'v19.29 死代码清理: SRS_INTERVALS 已删');
// v19.29: petBreaksHappiness 必须被 app.js 调用 (锁住调用关系防再死)
assert(/petBreaksHappiness\(state\)/.test(appSrc), 'v19.29: petBreaksHappiness 已接入 app.js (renderDashboard)');
// v19.29: petBreaksHappiness 改按天衰减
assert(/lastBreakCheck/.test(_v29data), 'v19.29: petBreaksHappiness 加 lastBreakCheck 防同日重复扣');
// v19.28: startErrorBankReview 接 (filterGameKey, mode) 参数
assert(/function startErrorBankReview\(filterGameKey, mode\)/.test(appSrc), 'v19.28: startErrorBankReview 加 (filterGameKey, mode) 参数');
// v19.28: due 队列过滤 (艾宾浩斯曲线接入)
assert(/wrongs\.filter\(w => !w\.nextReview \|\| w\.nextReview <= now\)/.test(appSrc), 'v19.28: 按 nextReview 过滤 due 题 (艾宾浩斯生效)');
// v19.28: chip 按钮 — 学科分类入口
assert(/startErrorBankReview\('\$\{k\}','due'\)/.test(appSrc), 'v19.28: 学科 chip 按钮调 startErrorBankReview(gameKey)');
// v19.28: 全部混练副入口
assert(/startErrorBankReview\(null,'all'\)/.test(appSrc), 'v19.28: 全部混练副入口');
// v19.28: 艾宾浩斯曲线说明出现在 modal
assert(/艾宾浩斯曲线/.test(appSrc), 'v19.28: modal 加艾宾浩斯曲线说明');
// v19.26: index.html 加 no-cache meta
assert(/http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/.test(idxSrc), 'v19.26: index.html 加 no-cache meta');
assert(/http-equiv="Pragma" content="no-cache"/.test(idxSrc), 'v19.26: index.html 加 Pragma no-cache');
// v19.27: modal overlay 不透明 + inner 加 solid 底色
assert(/background: rgba\(8, 12, 24, 0\.92\)/.test(idxSrc), 'v19.27: kt-modal overlay 改 92% 不透明');
assert(/backdrop-filter: blur\(6px\)/.test(idxSrc), 'v19.27: kt-modal 加 backdrop blur');
assert(/background-color: #14213A/.test(idxSrc), 'v19.27: kt-inner 加 solid 底色 #14213A (修 modal 文字与背景重叠)');
// v19.25 Bug 1: 删 renderCheckinPage 的 renderThinkPuzzleCard 调用
assert(/v19\.25: 删 renderThinkPuzzleCard 调用/.test(appSrc), 'v19.25 Bug1: renderCheckinPage 不再调 renderThinkPuzzleCard');
// 防回归: 全局只有 1 处 renderThinkPuzzleCard call (在 renderDashboard 用 state.currentWeek), 不再有 (week) 调用
const tpCalls = (appSrc.match(/\brenderThinkPuzzleCard\(/g) || []).length;
// 期望: 1 处 function 定义 + 1 处 dashboard 调用 = 2 个匹配 (definition + call)
assert(tpCalls === 2, `v19.25 Bug1: renderThinkPuzzleCard 调用收敛 (定义 + 主页 1 处 = 2, 实际 ${tpCalls})`);
// v19.25 Bug 2: openErrorBank modal 暗调 (v19.28: 注释标签升级保留 rgba 暗调样式)
assert(/background:linear-gradient\(135deg, rgba\(255,184,0,0\.10\), rgba\(255,107,53,0\.04\)\);border:1px dashed rgba\(255,184,0,0\.40\)/.test(appSrc), 'v19.25 Bug2: 顶部提示暗调样式保留');
assert(/border:1px solid rgba\(0,212,255,0\.30\);border-radius:6px;padding:6px 10px;font-size:12px;color:#E0E0E0/.test(appSrc), 'v19.25 Bug2: chip 暗调样式');
// v19.25 全局 CSS 补 hex
assert(/\[style\*="background:#ECEFF1"\]/.test(idxSrc), 'v19.25: 全局补 #ECEFF1 适配');
assert(/\[style\*="color:#455A64"\]/.test(idxSrc), 'v19.25: 全局补 #455A64 字色提亮');
assert(/\[style\*="color:#1565C0"\]/.test(idxSrc), 'v19.25: 全局补 #1565C0 字色提亮');
// v19.24: gameHubCard 移练习中心
assert(/v19\.24: gameHubCard 从主页迁到练习中心/.test(idxSrc), 'v19.24: 练习中心 gameHubCard 标注');
assert(/v19\.24: 删主页插入, 改 render 到 page-practice 内的 gameHubCard 容器/.test(appSrc), 'v19.24: renderGameHubCard 改不主页插入');
const oldHeroInsert = (appSrc.match(/heroSection\.parentNode\.insertBefore\(el, heroSection\.nextSibling\)/g) || []).length;
assert(oldHeroInsert === 0, `v19.24: 旧 hero 插入逻辑已撤 (实际 ${oldHeroInsert})`);
// v19.24: 错题本 modal 加历史改错记录
assert(/📋 改错记录/.test(appSrc), 'v19.24: modal 加"改错记录" 块');
assert(/接近毕业 \(再 \$\{3 - streak\} 次\)/.test(appSrc), 'v19.24: 显示"接近毕业"');
// v19.24 data 类断言 (dataSrcV14 需移到下面 declare 后 — 此处用 fs 直读)
const _v24data = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
assert(/week: 1, subject: '🔬 P3 Diversity'/.test(_v24data), 'v19.24: W1 P3 Diversity 思考题');
assert(/week: 2, subject: '🔬 P3 Plant Life Cycle'/.test(_v24data), 'v19.24: W2 P3 Plant Life Cycle');
assert(/week: 3, subject: '🔬 P3 Animal Life Cycle'/.test(_v24data), 'v19.24: W3 P3 Animal Life Cycle');
assert(/week: 4, subject: '🔬 P3 Plant Parts'/.test(_v24data), 'v19.24: W4 P3 Plant Parts');
// v19.23: 右栏顺序 思考题 → 名师秘籍 → 目标校 → 毕业题
// v19.23: 右栏 4 卡顺序 思考→名师→目标校→毕业
assert(/id="thinkPuzzleCard"[\s\S]{0,300}id="weekMasterTipCard"[\s\S]{0,300}id="targetSchoolMini"[\s\S]{0,300}id="gradReviewCard"/.test(idxSrc), 'v19.23: 右栏顺序 思考→名师→目标校→毕业');
assert(/🎓 教学 \+ 信息 \+ 复盘/.test(idxSrc), 'v19.23: 右栏标题改"教学 + 信息 + 复盘"');
// v19.22: 错题本卡 改进
assert(/v19\.22: 错题本卡 \(整张可点 \+ game\/topic 分类 \+ 显眼大按钮\)/.test(appSrc), 'v19.22: 错题本卡注释');
assert(/card\.onclick = \(e\) =>/.test(appSrc), 'v19.22: 错题本卡整张可点');
assert(/📊 按科目分布:/.test(appSrc), 'v19.22: 按 game 分类显示');
assert(/🎯 立即开始复习/.test(appSrc), 'v19.22: 显眼大按钮');
// v19.22: 答错 modal 暂停
assert(/function _ebNextManual/.test(appSrc), 'v19.22: 手动下一题函数');
assert(/_ebPendingNext/.test(appSrc), 'v19.22: pending next 缓存');
assert(/为什么<\/b>: \$\{escapeHtml\(item\.explain/.test(appSrc), 'v19.22: 错答 modal 显示"为什么" + explain');
// 防回归: 旧"setTimeout(...) isCorrect ? 1200 : 2200" 已撤
const oldEbDualTimer = (appSrc.match(/setTimeout\(\(\) => _renderErrorBankReview\(\), isCorrect \? 1200 : 2200\)/g) || []).length;
assert(oldEbDualTimer === 0, `v19.22: 旧 1200/2200 双 setTimeout 已撤 (实际 ${oldEbDualTimer})`);
// v19.22: gradReviewCard 移到右栏
// v19.22 + 23: gradReviewCard 在右栏 (v19.23 后注释改成 "教学 + 信息 + 复盘")
assert(/<!-- 右栏:[\s\S]{0,800}id="gradReviewCard"/.test(idxSrc), 'v19.22+23: gradReviewCard 在右栏');
// v19.21: Paper 2 弱点卡改暗调
assert(/color:#FF8A9C">🎯 Paper 2 弱点突击/.test(appSrc), 'v19.21: Paper 2 标题用亮粉 #FF8A9C');
assert(/rgba\(255,255,255,0\.04\);border:1px solid rgba\(255,255,255,0\.10\)[\s\S]{0,500}Cloze 单空填/.test(appSrc), 'v19.21: Cloze 块用透明背景');
assert(/linear-gradient\(90deg,#FFB74D,#66FFB0\)/.test(appSrc), 'v19.21: 进度条改亮版橙→绿渐变');
assert(/rgba\(255,255,255,0\.08\);border-radius:4px;height:8px/.test(appSrc), 'v19.21: 进度条底用透明白');
// v19.21 全局补 #FFF/#EEE/linear-gradient
assert(/\[style\*="background:#FFF;"\]/.test(idxSrc), 'v19.21: 全局补 #FFF; 适配');
assert(/\[style\*="background:#EEE;"\]/.test(idxSrc), 'v19.21: 全局补 #EEE; 适配');
assert(/\[style\*="background:linear-gradient\(135deg,#FFE0E0/.test(idxSrc), 'v19.21: 全局补浅红粉 linear-gradient 适配');
// v19.20: 全局适配 CSS
assert(/\[style\*="background:#F0F8FF"\][\s\S]{0,200}rgba\(0,212,255/.test(idxSrc), 'v19.20: 蓝色调浅底转暗青渐变');
assert(/\[style\*="background:#E8F5E9"\][\s\S]{0,200}rgba\(0,255,136/.test(idxSrc), 'v19.20: 绿色调浅底转暗绿渐变');
assert(/\[style\*="background:#FFF3E0"\][\s\S]{0,300}rgba\(255,184,0/.test(idxSrc), 'v19.20: 橙色调浅底转暗橙渐变');
assert(/\[style\*="background:#FFEBEE"\][\s\S]{0,300}rgba\(255,51,102/.test(idxSrc), 'v19.20: 红色调浅底转暗红渐变');
assert(/\[style\*="color:#212121"\][\s\S]{0,600}color:\s*#E0E0E0/.test(idxSrc), 'v19.20: 深字转亮灰');
assert(/\[style\*="color:#666"\][\s\S]{0,200}color:\s*#A0A0A0/.test(idxSrc), 'v19.20: 中灰字提亮');
// v19.19: 左右 2 栏布局
assert(/class="home-grid-2col"/.test(idxSrc), 'v19.19: home-grid-2col 容器');
assert(/class="home-col-left"/.test(idxSrc), 'v19.19: home-col-left');
assert(/class="home-col-right"/.test(idxSrc), 'v19.19: home-col-right');
assert(/⚡ 今日必做/.test(idxSrc), 'v19.19: 左栏标题');
// v19.23 右栏标题改 "🎓 教学 + 信息 + 复盘" (上面已断言)
assert(/🎓 教学 \+ 信息 \+ 复盘|🎓 目标 \+ 教学/.test(idxSrc), 'v19.19+23: 右栏标题');
assert(/@media \(min-width:\s*900px\)[\s\S]{0,200}grid-template-columns:\s*1fr 1fr/.test(idxSrc), 'v19.19: 响应式 ≥900px 2 栏 / 其他 1 栏');
// 防回归: 旧"📚 学习入口" 单栏标题已撤
assert(!/📚 学习入口<\/div>/.test(idxSrc), 'v19.19: 旧学习入口单栏标题已撤');
// v19.18: 主页学习入口区 4 卡
// v19.19 撤回 v19.18 "📚 学习入口" 单栏标题, 改 2 栏布局 "⚡ 今日必做" + "🎓 目标 + 教学"
assert(/id="thinkPuzzleCard"/.test(idxSrc), 'v19.18: thinkPuzzleCard 在主页');
assert(/id="paper2SprintCard"/.test(idxSrc), 'v19.18: paper2SprintCard 在主页');
assert(/id="weekMasterTipCard"/.test(idxSrc), 'v19.18: weekMasterTipCard 在主页');
// 旧位置改 id 防冲
assert(/id="thinkPuzzleCardOld"/.test(idxSrc), 'v19.18: 打卡页 thinkPuzzleCard 改 thinkPuzzleCardOld 避冲');
// renderDashboard 调用新卡
assert(/renderWeekMasterTipCard\(\)/.test(appSrc), 'v19.18: renderWeekMasterTipCard 被调用');
assert(/renderThinkPuzzleCard\(state\.currentWeek\)/.test(appSrc), 'v19.18: renderThinkPuzzleCard 被主页调用');
// 错题本卡红 badge
assert(/background:#EF5350;color:#FFF[\s\S]{0,150}border-radius:14px/.test(appSrc), 'v19.18: 错题本红 badge 强提醒');
// renderWeekMasterTipCard 函数
assert(/function renderWeekMasterTipCard/.test(appSrc), 'v19.18: renderWeekMasterTipCard 函数');
assert(/window\.WEEK_MASTER_TIPS\[week - 1\]/.test(appSrc), 'v19.18: 取 WEEK_MASTER_TIPS[week-1]');
// v19.17: 补做日上限
assert(/今日补打已达.*\$\{cap\} 项上限/.test(appSrc), 'v19.17: 补做日上限拦截 toast');
assert(/window\.DAILY_CARRY_CAP \|\| 3/.test(appSrc), 'v19.17: 读 DAILY_CARRY_CAP 常量');
// v19.17: 毕业题迁 gradReviewQueue
assert(/state\.gradReviewQueue\.push/.test(appSrc), 'v19.17: 毕业题迁 gradReviewQueue');
assert(/nextReview: Date\.now\(\) \+ 14 \* 86400000/.test(appSrc), 'v19.17: 14 天后回测');
assert(/14 天后会回测/.test(appSrc), 'v19.17: 毕业 toast 提示 14 天后回测');
// v19.17: 科学降级同难度
assert(/Math\.abs\(qDiff - chapterDiff\) <= 1/.test(appSrc), 'v19.17: 科学降级 ±1 难度');
assert(/补 \$\{supplement\.length\} 题同难度/.test(appSrc), 'v19.17: 科学降级 toast');
// v19.17: 毕业题间隔复习对话框
assert(/function renderGradReviewCard/.test(appSrc), 'v19.17: renderGradReviewCard');
assert(/function openGradReview/.test(appSrc), 'v19.17: openGradReview');
assert(/function getDueGradReviewCount/.test(appSrc), 'v19.17: getDueGradReviewCount');
assert(/id="gradReviewCard"/.test(idxSrc), 'v19.17: gradReviewCard 容器');
// v19.16 app 类 (data 类移到 dataSrcV14 之后)
assert(/sci_oe_grad|🎓 OE 错题毕业/.test(appSrc), 'v19.16: OE 毕业 +3 标记');
assert(/sci_oe_consol|💪 OE 巩固/.test(appSrc), 'v19.16: OE 巩固 +1 标记');
assert(/leitner_consol/.test(appSrc), 'v19.16: Leitner 巩固 log type');
assert(/💪 错题巩固.*streak.*\+1/.test(appSrc), 'v19.16: 错题巩固 +1 文案');
assert(/🎓 \+3 错题毕业/.test(appSrc), 'v19.16: 毕业 +3 文案 (原 +5)');
const old5GradLogs = (appSrc.match(/'🎓 错题毕业 \(Leitner 3 连对\)', points: 5/g) || []).length;
assert(old5GradLogs === 0, `v19.16: 旧 +5 毕业 log 已撤 (实际 ${old5GradLogs})`);
// v19.15k: AL what-if in-memory (不持久化)
assert(/let _alWhatIf = null/.test(appSrc), 'v19.15k: in-memory _alWhatIf');
assert(/function bumpWhatIfAL/.test(appSrc), 'v19.15k: bumpWhatIfAL 函数');
assert(/function clearAlWhatIf/.test(appSrc), 'v19.15k: clearAlWhatIf 函数');
assert(/function _getEffectiveForecast/.test(appSrc), 'v19.15k: _getEffectiveForecast 取真实+whatIf');
// 按钮触控 32×32 达 WCAG (旧 18×18 已撤)
assert(/min-width:32px;min-height:32px/.test(appSrc), 'v19.15k: AL 按钮 32px 达 WCAG');
assert(!/width:18px;height:18px;border:1px solid rgba\(255,255,255,0\.20\);background:rgba\(255,255,255,0\.05\);color:#4FC3F7;border-radius:3px;cursor:pointer;font-weight:900;font-size:12px;line-height:1;padding:0">−/.test(appSrc), 'v19.15k: 旧 18x18 AL 按钮已删');
// "模拟" 标识替换 "已手动"
assert(/💭 模拟/.test(appSrc), 'v19.15k: 显示 💭 模拟 标识');
assert(/真实 <s>\$\{realTotalAL\}<\/s>/.test(appSrc), 'v19.15k: 显示真实 AL 对比 (删除线)');
// data 类 v19.15k 断言移到 dataSrcV14 之后 (下面)
// v19.15j: 4 科 AL 手动编辑
assert(/function _renderALEditor/.test(appSrc), 'v19.15j: _renderALEditor helper');
// v19.15k 重命名: function bumpManualAL → bumpWhatIfAL (window 别名兼容)
assert(/function bumpWhatIfAL/.test(appSrc) && /window\.bumpManualAL = bumpWhatIfAL/.test(appSrc), 'v19.15k: bumpWhatIfAL 函数 + bumpManualAL 兼容别名');
// v19.15k 重命名 bumpManualAL → bumpWhatIfAL / resetSubjectALToAuto → clearAlWhatIf (旧 window 别名仍保留兼容)
assert(/window\.resetSubjectALToAuto = clearAlWhatIf/.test(appSrc), 'v19.15k: resetSubjectALToAuto 兼容 window 别名');
assert(/onclick="bumpWhatIfAL\('\$\{key\}',-1\)"/.test(appSrc), 'v19.15k: - 按钮 (改 bumpWhatIfAL)');
assert(/onclick="bumpWhatIfAL\('\$\{key\}',\+1\)"/.test(appSrc), 'v19.15k: + 按钮 (改 bumpWhatIfAL)');
// 接入 renderTargetSchoolMini + openAllSchoolsModal
const renderALCount = (appSrc.match(/_renderALEditor\('english'/g) || []).length;
assert(renderALCount >= 2, `v19.15j: _renderALEditor 接入 ≥2 处 (主页 + modal, 实际 ${renderALCount})`);
// 防回归: 显示文案应包含 ✏️ 已手动 / (自动算) 标识
// v19.15k 撤回 v19.15j "✏️ 已手动" 改 "💭 模拟" (上面已断言 💭 模拟)
// v19.15i: 8 校 modal
assert(/function openAllSchoolsModal\(\)/.test(appSrc), 'v19.15i: openAllSchoolsModal 函数');
assert(/onclick="openAllSchoolsModal\(\)"/.test(appSrc), 'v19.15i: 查看全部 8 校 按钮触发 openAllSchoolsModal');
assert(/全部 \$\{schools\.length\} 校 \$\{isWhatIf \? '💭 模拟概率' : '录取概率'\}/.test(appSrc), 'v19.15i+k: 8 校 modal 标题 (含 whatIf 分支)');
// v19.15i: 装备/皮肤防沉迷封顶
assert(/function _checkAvatarActionCap/.test(appSrc), 'v19.15i: _checkAvatarActionCap helper');
assert(/function _bumpAvatarAction/.test(appSrc), 'v19.15i: _bumpAvatarAction helper');
// toggleEquipment + setActiveSkin 都 wire
assert((appSrc.match(/_bumpAvatarAction\(\)/g) || []).length >= 2, 'v19.15i: _bumpAvatarAction 至少接 2 处 (装备 + 皮肤)');
assert((appSrc.match(/_checkAvatarActionCap\(\)/g) || []).length >= 2, 'v19.15i: _checkAvatarActionCap 至少守 2 处 (装备 + 皮肤)');
// v19.15h: 难度显示走 getDifficulty (强制 floor=4)
assert(/diff:\s*window\.getDifficulty\s*\?\s*window\.getDifficulty\(state,\s*k\)\s*:\s*4/.test(appSrc), 'v19.15h: 难度显示用 getDifficulty 强制 floor');
// 防回归: 不能再有 raw state.gameStats?.[k]?.difficulty || (k === 'math' ? 4 : 3)
assert(!/diff:\s*state\.gameStats\?\.\[k\]\?\.difficulty\s*\|\|\s*\(k\s*===\s*'math'\s*\?\s*4\s*:\s*3\)/.test(appSrc), 'v19.15h: 旧 raw difficulty fallback 已撤');
// 画像卡暗调
assert(/v19\.15h: 整张卡改暗调/.test(appSrc), 'v19.15h: 画像卡注释说明改暗调');
assert(/起步 Lv 4, 最近 3 次 ≥80% 升级/.test(appSrc), 'v19.15h: 加难度规则说明');
// v19.15g: 练习中心 4 卡改暗调
assert(/class="practice-hub-btn" data-accent="green"/.test(idxSrc), 'v19.15g: 知识树 卡 data-accent=green');
assert(/class="practice-hub-btn" data-accent="orange"/.test(idxSrc), 'v19.15g: 题库 卡 data-accent=orange');
assert(/class="practice-hub-btn" data-accent="cyan"/.test(idxSrc), 'v19.15g: 词汇 卡 data-accent=cyan');
assert(/class="practice-hub-btn" data-accent="pink"/.test(idxSrc), 'v19.15g: 作文 卡 data-accent=pink');
// 防回归: 仅在 hub 4 卡 (5258-5286 范围) 不能有旧亮浅底
const hubBlock = (idxSrc.match(/page-practice[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/) || [''])[0];
const oldBrightHub = (hubBlock.match(/#E8F5E9|#FFF3E0|#E3F2FD|#FCE4EC/g) || []).length;
assert(oldBrightHub === 0, `v19.15g: 练习中心 hub 旧亮浅底已撤 (实际 ${oldBrightHub})`);
assert(/\.practice-hub-btn:hover/.test(idxSrc), 'v19.15g: 加 hover 动效 translateY + brightness');
// v19.15f: MCQ option + close 按钮亮色修复
assert(/\.mcq-opt\s*\{[^}]*color:\s*var\(--color-text\)/.test(idxSrc), 'v19.15f: .mcq-opt 加 color: var(--color-text)');
assert(/\.vocab-modal-close\s*\{[^}]*color:\s*var\(--color-text\)/.test(idxSrc), 'v19.15f: .vocab-modal-close 加 color: var(--color-text)');
// 5 处 inline × button 应已升级 (不能再有 color:#999">×)
const oldGray999Close = (appSrc.match(/cursor:pointer;color:#999">×/g) || []).length;
assert(oldGray999Close === 0, `v19.15f: 旧 color:#999 × button 已全升级 (实际 ${oldGray999Close})`);
const newBrightClose = (appSrc.match(/border:2px solid var\(--color-text\);color:var\(--color-text\)[^"]*">×/g) || []).length;
assert(newBrightClose >= 5, `v19.15f: ≥5 处 × button 升级到亮色圆形 (实际 ${newBrightClose})`);
// v19.15e: 主页配色统一到暗调+青色发光 (匹配 .checkin-item)
assert(/暗调 \+ 青色发光风格, 匹配打卡页 \.checkin-item/.test(appSrc), 'v19.15e: renderTodayThreeCard 注释说明改暗调');
// v19.15k 重构 renderTargetSchoolMini 后该注释撤. 暗调样式仍在 (rgba(0,212,255,...) 渐变)
assert(/background:linear-gradient\(135deg, rgba\(0,212,255,0\.08\)/.test(appSrc), 'v19.15e+k: renderTargetSchoolMini 仍暗调 (青色渐变)');
// 验证关键暗色 token 出现
assert(/color:#4FC3F7/.test(appSrc), 'v19.15e: 目标校标题色 #4FC3F7 (亮青)');
assert(/probColorBright/.test(appSrc), 'v19.15e: 录取概率色加亮版本 probColorBright');
// 防回归: 不能再有 #FFF (纯白) item bg + #1565C0 (暗蓝标题) 残留
assert(!/background:\$\{done \? '#E8F5E9' : '#FFF'\}/.test(appSrc), 'v19.15e: 旧白底 item 已撤');
// 目标校卡内部 (renderTargetSchoolMini 函数体) 不能含 F0F8FF (其他地方仍可用)
const targetSchoolFn = (appSrc.match(/function renderTargetSchoolMini[\s\S]*?^window\.renderTargetSchoolMini/m) || [''])[0];
assert(!/#F0F8FF/.test(targetSchoolFn), 'v19.15e: 目标校函数体内旧浅蓝底 #F0F8FF 已撤');
// v19.15c app 类 (data 类移到 dataSrcV14 declare 之后)
assert(/state\.currentWeek\s*=\s*window\.computeCurrentWeekFromToday\(\)/.test(appSrc), 'v19.15c: init/renderAll 自动同步 currentWeek');
assert(/if \(!wasChecked && week > state\.currentWeek\)/.test(appSrc), 'v19.15c: toggleDailyCheck 守卫改 week > currentWeek');
assert(/不能提前打卡未来周/.test(appSrc), 'v19.15c: 守卫文案改"不能提前打卡未来周"');
const oldCrossWeekGuard = (appSrc.match(/week\s*!==\s*state\.currentWeek/g) || []).length;
assert(oldCrossWeekGuard === 0, `v19.15c: 旧 !== 跨周守卫已删 (实际 ${oldCrossWeekGuard})`);
assert(/function doCarryForwardCheckin/.test(appSrc), 'v19.15c: doCarryForwardCheckin 函数');
assert(/slot_carry/.test(appSrc), 'v19.15c: log type "slot_carry" 标识补打');
assert(/carry-forward-card/.test(appSrc), 'v19.15c: 补做卡 carry-forward-card UI');
assert(/补做池 \(\$\{carryItems\.length\} 项, 最近 4 周\)/.test(appSrc), 'v19.15c: 补做卡标题');
// v19.15b 软打卡逃生口 + 视觉对比加强
assert(/function softCheckin\(week, day, slot\)/.test(appSrc), 'v19.15b: softCheckin 函数');
assert(/state\.softCheckins/.test(appSrc), 'v19.15b: state.softCheckins 标记软打卡');
// v19.15d: 软打卡 UI 已撤 (用户决议 — 必须传照片), CSS 可保留兼容
assert(!/data-source="soft"/.test(appSrc), 'v19.15d: pickPhotoForSlot 软打卡按钮已删');
assert(!/softCheckin\(week, day, slot\);/.test(appSrc) || (appSrc.match(/softCheckin\(/g) || []).length <= 1, 'v19.15d: softCheckin 仅函数定义残留(无 UI 触发)');
assert(/打卡必须先传作业照/.test(appSrc), 'v19.15d: guard 文案强调"必须先传"');
// v19.15d: checkin tab 跳今日
assert(/if \(page === 'checkin'\)[\s\S]{0,400}_displayWeek\s*=\s*null/.test(appSrc), 'v19.15d: tab checkin 重置 _displayWeek');
assert(/if \(page === 'checkin'\)[\s\S]{0,400}selectedDay\s*=\s*todayKey/.test(appSrc), 'v19.15d: tab checkin 重置 selectedDay 到 today');
assert(/photo-source-guard-banner/.test(appSrc) && /photo-source-guard-banner/.test(idxSrc), 'v19.15b: photo guard 横幅提示');
assert(/pickPhotoForSlot\(week, day, slot, true\)/.test(appSrc), 'v19.15b: toggleDailyCheck 用 fromGuard=true');
assert(/软打卡升级|slot_soft_promote/.test(appSrc), 'v19.15b: 照片上传后软打卡补差');
assert(/opacity:\s*0\.38/.test(idxSrc), 'v19.15b CSS: 已打卡 opacity 0.38 灰掉');
assert(/border:\s*1px solid rgba\(0,212,255,0\.45\)/.test(idxSrc), 'v19.15b CSS: 未打卡 border 高亮');
// v19.14m: 装备穿戴 bug fix — renderAll 加 renderCharacterPage 刷新
assert(/charPageActive\.classList\.contains\('active'\)[\s\S]{0,100}renderCharacterPage\(\)/.test(appSrc), 'v19.14m: renderAll 加我的 tab active 时 renderCharacterPage');

// v19.15 P0-1: Leitner 巩固积分封顶 — 毕业一次性 +5, 不再每答对 +2
assert(/错题毕业.*Leitner 3 连对|🎓 错题毕业/.test(appSrc), 'v19.15 P0-1: Leitner 毕业 +5 标记');
// v19.15a hotfix: removeFromErrorBank 必须用 {force:true} 跳过内部 markErrorAnsweredCorrect 双重计分
const forceRemoveCount = (appSrc.match(/removeFromErrorBank\(state,\s*\{\s*force:\s*true,\s*id:\s*item\.id\s*\}\)/g) || []).length;
assert(forceRemoveCount === 2, `v19.15a hotfix: 两处 Leitner 毕业用 {force:true} (实际 ${forceRemoveCount})`);
// 防回归: 不能有 removeFromErrorBank(state, item.id) 单参形式 (走 mark 双重)
const naiveRemove = (appSrc.match(/removeFromErrorBank\(state,\s*item\.id\)/g) || []).length;
assert(naiveRemove === 0, `v19.15a hotfix: 不能有单参 removeFromErrorBank(state, item.id) (实际 ${naiveRemove})`);
// v19.16 改成 +3 毕业 (+1 中途 ×2 = 总 +5 仍 cap), 取代原 v19.15 +5 一次性
const leitnerGradPlus3 = (appSrc.match(/state\.totalPoints\s*=\s*\(state\.totalPoints\s*\|\|\s*0\)\s*\+\s*3;\s*\n\s*state\.logs\.push\(\{\s*reason:\s*'🎓 错题毕业/g) || []).length;
assert(leitnerGradPlus3 >= 2, `v19.16: 两处 Leitner 分支都 +3 毕业 (实际 ${leitnerGradPlus3})`);
// 验证已删除 +2 每次 (旧逻辑)
const leitnerPlus2 = (appSrc.match(/state\.totalPoints\s*=\s*\(state\.totalPoints\s*\|\|\s*0\)\s*\+\s*2;\s*\n\s*state\.logs\.push\(\{\s*reason:\s*'📓 错题复习答对/g) || []).length;
assert(leitnerPlus2 === 0, `v19.15 P0-1: 旧 +2 每次答对已删除 (实际残留 ${leitnerPlus2})`);

// v19.15 P0-3 app 类断言 (data 类移到 dataSrcV14 之后)
assert(/headerTitle\s*=\s*'🌿 周末推荐 · 自选'|周末推荐 · 自选/.test(appSrc), 'v19.15 P0-3: 周末标题改"自选推荐"');
assert(/挑 1-2 件就好|休息也算赢/.test(appSrc), 'v19.15 P0-3: 周末提示文案改"挑 1-2 件"');
assert(/今日已练 \$\{totalToday\} 局, 注意休息|PSLE 是 17 月马拉松/.test(appSrc), 'v19.15 P0-3: _bumpDailyGameCount 加软提示 toast');
assert(/今日 \$\{totalToday\} 局太多了/.test(appSrc), 'v19.15 P0-3: 15 局强劝 toast');
// v19.14l Cloze 3 件事改 MCQ
assert(/pickClozeSyn|getClozeSynonymOptions/.test(appSrc), 'v19.14l: Cloze syn MCQ 函数');
assert(/data-mode=.{1,30}mcq.{0,20}input|data-mode=.{1,40}'mcq'.{0,30}'input'/.test(appSrc), 'v19.14l: MCQ/input 双模式');
assert(/c3-syn-opt/.test(appSrc), 'v19.14l: MCQ 选项渲染');
// v19.14k 今日 3 件事科学项加章节内进度 + 今日 S2 任务
assert(/chapterSubProgress|第 \$\{chapterWeekIdx\}\/\$\{chapterTotalWeeks\} 周/.test(appSrc), 'v19.14k: 章节内周进度');
assert(/概念建立|深化与应用/.test(appSrc), 'v19.14k: 难章 2 周分阶段标签');
assert(/todayS2Task|dayTasks\.S2/.test(appSrc), 'v19.14k: 今日 S2 段具体任务读取');
// v19.14j 4 项: 装备 lock 撤 + 主页恢复入口 + 错题绿系 + SCIENCE_MCQ chapterId
assert(!/平日 lock 装备穿戴\/卸下 — 防止/.test(appSrc), 'v19.14j: toggleEquipment 平日 lock 已撤');
assert(!/showToast\('🔒 皮肤切换只在周末开放/.test(appSrc), 'v19.14j: setActiveSkin 平日 lock 已撤');
assert(/已收集 \$\{wrongs\.length\} 题 🌱|borderLeft\s*=\s*'4px solid #66BB6A'/.test(appSrc), 'v19.14j: 错题色绿系 + 已收集文案');
assert(/inferScimcqChapter|tagScimcqChapters/.test(appSrc) || /inferScimcqChapter/.test(appSrc), 'v19.14j: SCIENCE_MCQ chapterId runtime');
// data 类
// v19.14j data 类断言放后面 (在 dataSrcV14 之后)
// v19.14i UI 5 项
assert(/font-size:\s*14px\s*!important[\s\S]*\.tab-btn/.test(idxSrc) || /\.tab-btn\s*\{[^}]*font-size:\s*14px/.test(idxSrc), 'v19.14i 字号: tab-btn 升 14px');
assert(/font-size:11px["'][\s\S]{0,200}font-size:\s*13px\s*!important/.test(idxSrc), 'v19.14i 字号: 11→13 全局升');
assert(/id="page-practice"/.test(idxSrc), 'v19.14i: page-practice hub 容器');
assert(/data-page="practice"/.test(idxSrc), 'v19.14i: tab-btn 加 📚 练习');
assert(/data-page="knowledge"\s+style="display:none"/.test(idxSrc), 'v19.14i: 知识树 tab 隐藏');
assert(/_dashboardLegacy/.test(idxSrc), 'v19.14i: dashboard-collapse 改 display:none');
assert(/errorBankByTopic.*'cloze'|errorBankByTopic\(state,\s*'cloze'\)/.test(appSrc), 'v19.14i: 错题 modal 加 topic 聚类调用');
assert(/Cloze 错题主题聚类|topic 主题聚类/.test(appSrc), 'v19.14i: 错题 modal 显示主题块');
assert(/hitRatioT\s*>=\s*0\.6\s*\?\s*10\s*:\s*hitRatioT\s*>=\s*0\.3\s*\?\s*5/.test(appSrc), 'v19.14i: 作文 V2 +10/+5/+2 分级');
// v19.14h 5 项 P0+P1 修复
assert(/essayUpgradeBonus\[week\]|state\.essayUpgradeBonus/.test(appSrc), 'v19.14h P0-1: 作文 V2 +10 dedupe');
assert(/saveCloze3ThingsAndNext|skipCloze3ThingsAndNext/.test(appSrc), 'v19.14h P0-2: Cloze 3 件事去倒计时改显式按钮');
assert(/data-fp.*escapeAttr\(fp\)|getAttribute\('data-fp'\)/.test(appSrc), 'v19.14h P0-2: fingerprint 抓取');
assert(/必须是英文|不能是原词本身|synTrim\.length < 3/.test(appSrc), 'v19.14h P0-3: syn 质量校验');
// Leitner: 两处都用 LEITNER_GRADUATION (没 hardcoded >= 4)
const leitnerHardcoded = (appSrc.match(/correctStreak\s*>=\s*4/g) || []).length;
assert(leitnerHardcoded === 0, `v19.14h P0-4: Leitner 硬编码 4 = 0 (实际 ${leitnerHardcoded})`);
const leitnerGrad = (appSrc.match(/LEITNER_GRADUATION\s*\|\|\s*3/g) || []).length;
assert(leitnerGrad >= 2, `v19.14h P0-4: 两处都读 LEITNER_GRADUATION (实际 ${leitnerGrad})`);
assert(/isReverseQ|反向题 \(NOT\/INCORRECT\)/.test(appSrc), 'v19.14h P1-1: OE 反向题封顶');
// v19.14g: OE 题库扩到 50 题
const oeCountV14g = (fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8').match(/id:\s*'oe_\d+'/g) || []).length;
assert(oeCountV14g >= 50, `v19.14g: 科学 OE 题 ≥ 50 (实际 ${oeCountV14g})`);
// v19.14g: 4 难章配比验证 (Plant Transport / Digestive / Light / Heat 各至少 6 道)
const ptCount = (fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8').match(/topic:\s*'Plant Transport'/g) || []).length;
const digCount = (fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8').match(/topic:\s*'Digestion'/g) || []).length;
const lightCount = (fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8').match(/topic:\s*'Light'/g) || []).length;
const heatCount = (fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8').match(/topic:\s*'Heat'/g) || []).length;
assert(ptCount >= 6, `v19.14g: Plant Transport OE ≥ 6 (${ptCount})`);
assert(digCount >= 6, `v19.14g: Digestion OE ≥ 6 (${digCount})`);
assert(lightCount >= 6, `v19.14g: Light OE ≥ 6 (${lightCount})`);
assert(heatCount >= 7, `v19.14g: Heat OE ≥ 7 (${heatCount})`);
// v19.14f 科学章节 filter + 子串漏洞修 (app 类)
assert(/word boundary.*stem|safeStem.*RegExp/.test(appSrc), 'v19.14f: 关键词匹配改 word boundary + stem');
assert(/openSciMcqGame\(chapterFilter\)|chapter && chapter\.keywords/.test(appSrc), 'v19.14f: openSciMcqGame 加 chapter filter');
assert(/openScienceOEGame\(chapterFilter\)|onChapter\.length >= 3/.test(appSrc), 'v19.14f: openScienceOEGame 加 chapter filter');
// data 类断言移到 dataSrcV14 之后
// v19.14e 英语 5 项
assert(/<details \${isQ1 \? 'open' : ''}|定位法 3 步.*\$\{isQ1/.test(appSrc), 'v19.14e P5: Comp OE 每题定位法 (Q1 open, 后题折叠)');
assert(/svSubmitTyping|_levenshtein/.test(appSrc), 'v19.14e P3: 词汇 typing (zh→en + Levenshtein)');
assert(/saveCloze3Things|skipCloze3Things/.test(appSrc), 'v19.14e P2: Cloze 3 件事卡');
assert(/uploadEssayV|toggleEssayCheck/.test(appSrc), 'v19.14e P4: 作文 V1/V2/Teacher 升级闭环');
assert(/#607D8B|待复习清单|待掌握/.test(appSrc), 'v19.14e: 错题色去羞耻化 (蓝灰 + 待复习文案)');
// v19.14d1: 我的 tab 角色卡布局 hotfix — 防文字+角色重叠 (保留检查)
assert(/#page-character\s+\.character-display[\s\S]{0,200}height:\s*auto/.test(idxSrc), 'v19.14d1: page-character display height auto');
assert(/#page-character\s+\.character-svg[\s\S]{0,200}margin-top:\s*0/.test(idxSrc), 'v19.14d1: page-character svg margin-top 0');
// v19.14d 二次评审 app.js 类断言 (data 类移到 dataSrcV14 declare 后)
assert(/LEITNER_GRADUATION\s*\|\|\s*3/.test(appSrc), 'v19.14d: Leitner bug 修 — 读 LEITNER_GRADUATION 不再硬编码');
assert(/i\\s\+agree|i\s+agree/.test(appSrc), 'v19.14d: Yes/No 正则加 I agree');
assert(/quickOralCheckin[\s\S]{0,200}已禁用/.test(appSrc), 'v19.14d: quickOralCheckin 假打卡禁用');
assert(/oralReverseInput/.test(appSrc), 'v19.14d: Oral 反向验证 textarea');
assert(/自动评分:\s*\$\{autoScore\}|关键词命中.*matchedKw\.length/.test(appSrc), 'v19.14d: OE 改硬规则自动评分');

// v19.14c → v19.14j: 我的 tab 装备/皮肤平日 lock 已撤 (用户反馈+心理学家), 宠物保留 widget 但去掉 zZz
assert(/charPage_petWidget/.test(appSrc), 'v19.14j: charPage 加宠物 widget (lock 已撤但 widget 保留)');
assert(/charPage_lockBanner/.test(appSrc), 'v19.14j: charPage lock banner DOM 保留 (已 hide)');

// v19.14a 新模块断言
const dataSrcV14 = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');

// v19.14e data 类断言
assert(/guessClozeTopic|CLOZE_TOPIC_MAP/.test(dataSrcV14), 'v19.14e: data.js 有 Cloze 主题词聚类');
assert(/errorBankByTopic/.test(dataSrcV14), 'v19.14e: data.js 有 errorBankByTopic');
// v19.14j data 类断言
assert(/function inferScimcqChapter/.test(dataSrcV14), 'v19.14j: data.js 有 inferScimcqChapter');
assert(/function tagScimcqChapters/.test(dataSrcV14), 'v19.14j: data.js 有 tagScimcqChapters');
// v19.14l data 类断言: SYNONYM_DICT 同义词字典 + helper
assert(/CLOZE_SYNONYM_DICT/.test(dataSrcV14), 'v19.14l: data.js 有 CLOZE_SYNONYM_DICT');
assert(/function getClozeSynonymOptions/.test(dataSrcV14), 'v19.14l: getClozeSynonymOptions helper');
// 字典 ≥ 100 词
const synDictCount = (dataSrcV14.match(/'[a-z][a-z\s\-]+':\s*\{\s*syn:/g) || []).length;
assert(synDictCount >= 100, `v19.14l: 同义词字典 ≥ 100 词 (实际 ${synDictCount})`);
// v19.15 P0-2: CLOZE_SYNONYM_DICT 扩充到 ≥ 280 词 (从 161 → ~300)
assert(synDictCount >= 280, `v19.15 P0-2: 同义词字典 ≥ 280 词 (实际 ${synDictCount})`);
// 验证含派生形式 (-ing, -ly, 比较级, 思考动词)
assert(/'running':\s*\{\s*syn:/.test(dataSrcV14), 'v19.15 P0-2: 含 -ing 派生 (running)');
assert(/'happily':\s*\{\s*syn:/.test(dataSrcV14), 'v19.15 P0-2: 含 -ly 副词 (happily)');
assert(/'bigger':\s*\{\s*syn:/.test(dataSrcV14), 'v19.15 P0-2: 含比较级 (bigger)');
assert(/'thought':\s*\{\s*syn:/.test(dataSrcV14), 'v19.15 P0-2: 含思考动词 (thought)');
// v19.15 P0-3 data 类: 沉迷闸常量
assert(/DAILY_GAME_SOFT_WARN\s*=\s*10/.test(dataSrcV14), 'v19.15 P0-3: DAILY_GAME_SOFT_WARN = 10');
assert(/DAILY_GAME_HARD_NUDGE\s*=\s*15/.test(dataSrcV14), 'v19.15 P0-3: DAILY_GAME_HARD_NUDGE = 15');
// v19.15i data 类: 装备/皮肤防沉迷封顶常量
assert(/DAILY_AVATAR_ACTIONS_SOFT\s*=\s*8/.test(dataSrcV14), 'v19.15i: DAILY_AVATAR_ACTIONS_SOFT = 8');
assert(/DAILY_AVATAR_ACTIONS_HARD\s*=\s*15/.test(dataSrcV14), 'v19.15i: DAILY_AVATAR_ACTIONS_HARD = 15');
// v19.17 data 类
assert(/DAILY_CARRY_CAP\s*=\s*3/.test(dataSrcV14), 'v19.17: DAILY_CARRY_CAP = 3 常量');
assert(/gradReviewQueue:\s*\[\]/.test(dataSrcV14), 'v19.17: state.gradReviewQueue 默认 []');
// v19.16 data 类: 内容补足
assert(/'turn on':\s*\{\s*syn:\s*'switch on'/.test(dataSrcV14), "v19.16: phrasal verb 'turn on'");
assert(/'put off':\s*\{\s*syn:\s*'postpone'/.test(dataSrcV14), "v19.16: phrasal verb 'put off'");
assert(/'disagree':\s*\{\s*syn:\s*'object'/.test(dataSrcV14), "v19.16: dis- 前缀 'disagree'");
assert(/'disrespect':\s*\{\s*syn:\s*'insult'/.test(dataSrcV14), "v19.16: dis- 前缀 'disrespect'");
assert(/'pull to safety':\s*\{\s*syn:\s*'rescue'/.test(dataSrcV14), "v19.16: 搭配 'pull to safety'");
const synDictV16 = (dataSrcV14.match(/'[^']+':\s*\{\s*syn:/g) || []).length;
assert(synDictV16 >= 370, `v19.16: 同义词字典 ≥ 370 词 (实际 ${synDictV16})`);
const mathCountV16 = (dataSrcV14.match(/q:\s*'[^']+',\s*ans:/g) || []).length;
assert(mathCountV16 >= 125, `v19.16: 数学题 ≥ 125 (实际 ${mathCountV16})`);
// v19.15k 撤回 v19.15j subjectALManual 持久化, 改 in-memory _alWhatIf (data 类断言)
assert(!/state\.subjectALManual && typeof state\.subjectALManual === 'object'/.test(dataSrcV14), 'v19.15k: computeTotalAL 已撤 manual 持久化分支');
assert(/getAdmissionForecasts\(state, whatIfBySubject\)/.test(dataSrcV14), 'v19.15k: getAdmissionForecasts 加 whatIfBySubject 参数');
assert(!/window\.setManualSubjectAL = setManualSubjectAL/.test(dataSrcV14), 'v19.15k: setManualSubjectAL window 暴露已撤');
assert(!/subjectALManual:\s*null/.test(dataSrcV14), 'v19.15k: state default subjectALManual 已删');
// v19.15c data 类: currentWeek 自动算 + carry-forward 池
assert(/function computeCurrentWeekFromToday/.test(dataSrcV14), 'v19.15c: computeCurrentWeekFromToday 函数');
assert(/function getCarryForwardTasks/.test(dataSrcV14), 'v19.15c: getCarryForwardTasks 函数');
assert(/W1_START\s*=\s*new Date\(2026,\s*4,\s*4\)/.test(dataSrcV14), 'v19.15c: W1 起 2026-05-04');
// v19.14f data 类断言
assert(/chapterId:\s*'p4_plant_transport'/.test(dataSrcV14), 'v19.14f: SCIENCE_CHAPTERS 加 chapterId');
assert(/keywords:\s*\[[^\]]*'xylem'/.test(dataSrcV14), 'v19.14f: Plant Transport 章节 keywords');

// v19.14d data 类断言 (在 dataSrcV14 之后)
assert(/WEEKDAY_LOCKED_GAMES\s*=\s*\['chinese',\s*'unit'\]/.test(dataSrcV14), 'v19.14d: 数学从 hard lock 移除');
assert(/WEEKDAY_SOFT_CAP_GAMES/.test(dataSrcV14), 'v19.14d: 数学加 soft cap');
assert(/from LEAVES to STORAGE ORGANS|translocation/.test(dataSrcV14), 'v19.14d: Phloem 修正不写双向');
assert(/EMULSIFIES?\s+fat|emulsify fat/.test(dataSrcV14), 'v19.14d: Liver bile 改 emulsify');
assert(/lighter\s*\/\s*not fully dark|影子 lighter/.test(dataSrcV14), 'v19.14d: Light translucent 影子加 lighter');
assert(/'thin'.*'surface area'|villi.*'thin'/.test(dataSrcV14), 'v19.14d: OE #4 加 villi+thin wall keywords');
assert(/Change 1:.*Change 2:|do NOT bracket heat/.test(dataSrcV14), 'v19.14d: OE #13 light/heat 独立');
const mathCountV14d = (dataSrcV14.match(/q:\s*'[^']+',\s*ans:/g) || []).length;
assert(mathCountV14d >= 90, `v19.14d: 数学题 ≥ 90 (实际 ${mathCountV14d}), 原 75 + 20`);

// v19.14b 平日/周末科目隔离断言 (放到 dataSrcV14 declare 之后)
assert(/function isWeekdayToday/.test(dataSrcV14), 'v19.14b: isWeekdayToday 函数');
assert(/function isWeekendDayKey/.test(dataSrcV14), 'v19.14b: isWeekendDayKey 函数');
// v19.14d: 此项已废 (math 从 hard lock 移除, 改为 v19.14d 的 chinese/unit only). 见上面 v19.14d 断言.
assert(/function getDailyTasksFiltered/.test(dataSrcV14), 'v19.14b: getDailyTasksFiltered 函数');
assert(/SLOT_BASE_POINTS\.WSC\s*=\s*5/.test(dataSrcV14), 'v19.14b: SLOT_BASE_POINTS.WSC = 5');
assert(/SLOT_BASE_POINTS\.WUC\s*=\s*4/.test(dataSrcV14), 'v19.14b: SLOT_BASE_POINTS.WUC = 4');
assert(/SLOT_SUBJECT\.WSC\s*=\s*'华文'/.test(dataSrcV14), 'v19.14b: WSC = 华文');
assert(/WEEKDAY_LOCKED_GAMES.*includes\(gameKey\)/.test(appSrc), 'v19.14b: _checkGameDailyLock 加 hard lock 检查');
assert(/isWeekday\s*\?\s*\[?weekend|周末 3 件事|isWeekdayToday\(\)/.test(appSrc), 'v19.14b: renderTodayThreeCard 加 weekday/weekend 分支');
assert(/getDailyTasksFiltered/.test(appSrc), 'v19.14b: renderCheckinPage 调用 getDailyTasksFiltered');
assert(/🔒.*周末专属|周末才开放/.test(appSrc), 'v19.14b: hub 加 lock badge');

assert(/DAILY_SLOT_CAP\s*=\s*5/.test(dataSrcV14), 'v19.14a: DAILY_SLOT_CAP = 5');
assert(/WEEKLY_CHECKIN_CAP\s*=\s*200/.test(dataSrcV14), 'v19.14a: WEEKLY_CHECKIN_CAP = 200');
assert(/LEITNER_GRADUATION\s*=\s*3/.test(dataSrcV14), 'v19.14a: LEITNER_GRADUATION = 3');
assert(/PSLE_MILESTONES\s*=/.test(dataSrcV14), 'v19.14a: PSLE_MILESTONES 数组');
assert(/CLOZE_SST_PER_Q\s*=\s*2/.test(dataSrcV14), 'v19.14a: CLOZE_SST_PER_Q = 2');
assert(/MYSTERY_BOX_WEEKLY_CAP\s*=\s*100/.test(dataSrcV14), 'v19.14a: 宝箱周封顶 100');
assert(/function markErrorAnsweredCorrect/.test(dataSrcV14), 'v19.14a: Leitner markErrorAnsweredCorrect');
assert(/function isPaper2GateOpen/.test(dataSrcV14), 'v19.14a: isPaper2GateOpen');
assert(/STRONG_SUBJECT_GAMES/.test(dataSrcV14), 'v19.14a: STRONG_SUBJECT_GAMES 定义');
// app.js 新 render
assert(/function renderTodayThreeCard/.test(appSrc), 'v19.14a: renderTodayThreeCard');
assert(/function renderTargetSchoolMini/.test(appSrc), 'v19.14a: renderTargetSchoolMini');
assert(/clozeSstReward\s*\(/.test(appSrc), 'v19.14a: app.js 用 clozeSstReward');
assert(/STRONG_SUBJECT_GAMES.*includes\(gameKey\)/.test(appSrc), 'v19.14a: _checkGameDailyLock 加强项 gate');
assert(/DAILY_SLOT_CAP/.test(appSrc), 'v19.14a: toggleDailyCheck 用 DAILY_SLOT_CAP');
// HTML 新容器
assert(/id="todayThreeCard"/.test(idxSrc), 'v19.14a: index.html 有 todayThreeCard');
assert(/id="targetSchoolMini"/.test(idxSrc), 'v19.14a: index.html 有 targetSchoolMini');

// v19.13: 5 大新模块数据 (oral / vocab / essay tmpl / sci chapter / OE / diagrams)
const dataSrc = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
assert(/ORAL_QUESTIONS\s*=\s*\[/.test(dataSrc), 'v19.13: data.js 有 ORAL_QUESTIONS');
assert(/SUBJECT_VOCAB_MATH\s*=\s*\[/.test(dataSrc), 'v19.13: data.js 有 SUBJECT_VOCAB_MATH');
assert(/SUBJECT_VOCAB_SCIENCE\s*=\s*\[/.test(dataSrc), 'v19.13: data.js 有 SUBJECT_VOCAB_SCIENCE');
assert(/ESSAY_TEMPLATES\s*=/.test(dataSrc), 'v19.13: data.js 有 ESSAY_TEMPLATES');
assert(/SCIENCE_CHAPTERS\s*=/.test(dataSrc), 'v19.13: data.js 有 SCIENCE_CHAPTERS');
assert(/SCIENCE_OE_QUESTIONS\s*=/.test(dataSrc), 'v19.13: data.js 有 SCIENCE_OE_QUESTIONS');
assert(/CONCEPT_DIAGRAMS\s*=/.test(dataSrc), 'v19.13: data.js 有 CONCEPT_DIAGRAMS');
// 5 个 render 函数都在 app.js
assert(/function renderOralCheckinCard/.test(appSrc), 'v19.13: app.js 有 renderOralCheckinCard');
assert(/function renderSubjectVocabCard/.test(appSrc), 'v19.13: app.js 有 renderSubjectVocabCard');
assert(/function renderScienceChapterCard/.test(appSrc), 'v19.13: app.js 有 renderScienceChapterCard');
assert(/function openScienceOEGame/.test(appSrc), 'v19.13: app.js 有 openScienceOEGame');
assert(/function openConceptDiagram/.test(appSrc), 'v19.13: app.js 有 openConceptDiagram');
// renderDashboard 调用新卡
assert(/renderOralCheckinCard\(\);/.test(appSrc), 'v19.13: renderDashboard 调用 oral 卡');
assert(/renderSubjectVocabCard\(\);/.test(appSrc), 'v19.13: renderDashboard 调用 vocab 卡');
assert(/renderScienceChapterCard\(\);/.test(appSrc), 'v19.13: renderDashboard 调用 science 卡');
// v19.13 → v19.14a: 旧 3 张卡容器已收纳到"今日 3 件事", HTML 不再需要这 3 个 id
// 检查 render 函数还在 (内容可用) 即可
assert(/function renderOralCheckinCard/.test(appSrc), 'v19.14a: renderOralCheckinCard 函数保留');
assert(/function renderSubjectVocabCard/.test(appSrc), 'v19.14a: renderSubjectVocabCard 函数保留');
assert(/function renderScienceChapterCard/.test(appSrc), 'v19.14a: renderScienceChapterCard 函数保留');
// 学科词汇 ≥ 500
const mathVocabMatches = (dataSrc.match(/cat:\s*'(几何|数与运算|比例|统计|单位|题干)'/g) || []).length;
const sciVocabMatches = (dataSrc.match(/cat:\s*'(力学|光学|热学|物质|植物|动物|人体|实验|环境\/能量)'/g) || []).length;
assert(mathVocabMatches >= 195, `v19.13: 数学词汇 ≥ 195 (实际 ${mathVocabMatches})`);
assert(sciVocabMatches >= 280, `v19.13: 科学词汇 ≥ 280 (实际 ${sciVocabMatches})`);
// 30+ Oral 题
const oralCount = (dataSrc.match(/id:\s*'o_/g) || []).length;
assert(oralCount >= 28, `v19.13: Oral 题库 ≥ 28 (实际 ${oralCount})`);
// 15 OE 题
const oeCount = (dataSrc.match(/id:\s*'oe_\d+'/g) || []).length;
assert(oeCount >= 13, `v19.13: 科学 OE 题 ≥ 13 (实际 ${oeCount})`);
// 4 概念图
['plant_transport', 'digestive', 'light', 'heat'].forEach(k => {
  assert(new RegExp(`'${k}'\\s*:`).test(dataSrc) || new RegExp(`\\b${k}\\b\\s*:`).test(dataSrc), `v19.13: 概念图 ${k} 存在`);
});

// ===== v19.27: 暑假 31 天互动课表 =====
assert(Array.isArray(W.SUMMER_CURRICULUM) && W.SUMMER_CURRICULUM.length === 31,
  `v19.27: SUMMER_CURRICULUM 31 天 (实际 ${W.SUMMER_CURRICULUM && W.SUMMER_CURRICULUM.length})`);
assert(W.SUMMER_CURRICULUM && W.SUMMER_CURRICULUM[0].date === '2026-05-29', 'v19.27: 首日 5-29');
assert(W.SUMMER_CURRICULUM && W.SUMMER_CURRICULUM[30].date === '2026-06-28', 'v19.27: 末日 6-28');
const _sundays = (W.SUMMER_CURRICULUM || []).filter(d => d.type === 'rest');
assert(_sundays.length === 5, `v19.27: 5 个周日休息日 (实际 ${_sundays.length})`);
const _underTasked = (W.SUMMER_CURRICULUM || []).filter(d => d.type !== 'rest' && d.tasks.length < 3);
assert(_underTasked.length === 0, `v19.27: 所有学习日 ≥3 task (异常 ${_underTasked.length})`);
const _fns27 = new Set();
(W.SUMMER_CURRICULUM || []).forEach(d => d.tasks.forEach(t => t.fn && _fns27.add(t.fn)));
const _missingFns27 = [];
_fns27.forEach(f => {
  if (f.indexOf('tab:') === 0) return;
  if (!new RegExp(`function\\s+${f}\\b`).test(appSrc) && !new RegExp(`window\\.${f}\\s*=`).test(appSrc)) {
    _missingFns27.push(f);
  }
});
assert(_missingFns27.length === 0, `v19.27: 所有 fn 在 app.js 有定义 (缺失: ${_missingFns27.join(',')})`);
['getSummerDayByDate', 'getTodaySummerDate', 'getSummerProgress', 'markSummerTaskDone', 'unmarkSummerTaskDone'].forEach(f => {
  assert(typeof W[f] === 'function', `v19.27: ${f} 已 window 导出`);
});
assert(/summerDone:\s*\{\}/.test(_v35data), 'v19.27: state.summerDone defaultState 加');
assert(/function renderSummerCalendar\(/.test(appSrc), 'v19.27: app.js 有 renderSummerCalendar');
assert(/function doSummerTask\(/.test(appSrc), 'v19.27: app.js 有 doSummerTask');
assert(/if \(page === 'summer'\)[\s\S]{0,80}renderSummerCalendar\(\)/.test(appSrc),
  'v19.27: tab summer 触发 renderSummerCalendar');
assert(/id="summerCalendarContainer"/.test(idxSrc), 'v19.27: page-summer 有 #summerCalendarContainer');
assert(!/5 周分主题进度/.test(idxSrc), 'v19.27: 老静态 section "5 周分主题进度" 已替换');
assert(/\?v=19\.(3[789]|40)/.test(idxSrc), 'v19.27+: cache buster ≥ 19.37');

// ===== v19.38: 周末 → 只周日 (装备/皮肤/mini-game lock) =====
// isWeekdayToday() 含义扩到 Mon-Sat (周六不再是自由日)
assert(/return d !== 0/.test(_v35data), 'v19.38: isWeekdayToday 返回 d !== 0 (Mon-Sat 都锁)');
assert(typeof W.isWeekdayToday === 'function', 'v19.38: isWeekdayToday window 导出');
// toggleEquipment / setActiveSkin 加 Sun-only 锁
assert(/装备穿戴只能周日/.test(appSrc), 'v19.38: toggleEquipment 加周日锁文案');
assert(/皮肤切换只能周日/.test(appSrc), 'v19.38: setActiveSkin 加周日锁文案');
// charPage_lockBanner 改为按 isWeekdayToday 显示
assert(/lockBanner\.style\.display = locked \? 'block' : 'none'/.test(appSrc),
  'v19.38: charPage_lockBanner Mon-Sat 显示');
// 老 "周末才开放" 文案改成 "周日才开放"
assert(!/周末才开放/.test(appSrc), 'v19.38: 老"周末才开放"文案已改成"周日才开放"');
assert(/周日才开放/.test(appSrc), 'v19.38: app.js 含"周日才开放"新文案');

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
