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
assert(/\?v=19.(3[6789]|[4-9][0-9])/.test(idxSrc) && !/\?v=19\.14[a-z][^0-9]/.test(idxSrc),
  'v19.36+: cache buster ≥ 19.36');

// ===== v19.43: 闪卡反面 4 段 = 中文 + 英文解释(短语) + 例句 + 考题 =====
assert(typeof W.VOCAB_QUIZ === 'object' && Object.keys(W.VOCAB_QUIZ).length >= 440,
  `v19.43: VOCAB_QUIZ ≥ 440 词 (实际 ${W.VOCAB_QUIZ ? Object.keys(W.VOCAB_QUIZ).length : 0})`);
assert(typeof W.VOCAB_EN === 'object' && Object.keys(W.VOCAB_EN).length >= 440,
  `v19.43: VOCAB_EN ≥ 440 词 (实际 ${W.VOCAB_EN ? Object.keys(W.VOCAB_EN).length : 0})`);
assert(typeof W.VOCAB_SENT === 'object' && Object.keys(W.VOCAB_SENT).length >= 440,
  `v19.43: VOCAB_SENT ≥ 440 词 (实际 ${W.VOCAB_SENT ? Object.keys(W.VOCAB_SENT).length : 0})`);
assert(typeof W.getVocabQuiz === 'function' && typeof W.getVocabEn === 'function' && typeof W.getVocabSent === 'function',
  'v19.43: getVocabQuiz/En/Sent 全导出');
(function(){
  const decks = W.FLASHCARD_DECKS || [];
  const allW = [...new Set(decks.flatMap(d => d.words))];
  const noZh = allW.filter(w => W.getVocabMeaning(w) === w);
  assert(noZh.length === 0, `v19.43: 所有词有中文 (缺 ${noZh.length}: ${noZh.slice(0,5).join(',')})`);
  const noEn = allW.filter(w => !W.getVocabEn(w));
  assert(noEn.length === 0, `v19.43: 所有词有英文解释 (缺 ${noEn.length}: ${noEn.slice(0,5).join(',')})`);
  const noS = allW.filter(w => !W.getVocabSent(w));
  assert(noS.length === 0, `v19.43: 所有词有例句 (缺 ${noS.length}: ${noS.slice(0,5).join(',')})`);
  const noQuiz = allW.filter(w => !W.getVocabQuiz(w));
  assert(noQuiz.length === 0, `v19.43: 所有词有考题 (缺 ${noQuiz.length}: ${noQuiz.slice(0,5).join(',')})`);
})();
// 科学/数学考题准确性 (逐条核准, 防误导)
assert(!/6CO2|C6H12O6|6H2O/.test(W.getVocabQuiz('photosynthesis')),
  'v19.43: photosynthesis 去掉超纲化学式');
(function(){
  const q = W.getVocabQuiz('quotient');
  const m = q.match(/(\d+)\s*÷\s*(\d+)[^✓]*✓\s*(\d+)/);
  assert(m && parseInt(m[1]) / parseInt(m[2]) === parseInt(m[3]),
    `v19.43: quotient 算式与答案自洽 (${q})`);
})();
assert(/不需光|water\/air\/warmth|水\+?空气\+?温暖|水\/空气\/温暖/.test(W.getVocabQuiz('germination')),
  'v19.43: germination 强调不需光 (PSLE 陷阱)');
assert(/1\s*不是|✓\s*2/.test(W.getVocabQuiz('prime')),
  'v19.43: prime 最小质数 2, 1 不是');
assert(/cm²/.test(W.getVocabQuiz('area')), 'v19.43: area 有 cm² 单位');
assert(/cm(?![²³])/.test(W.getVocabQuiz('perimeter')), 'v19.43: perimeter 有 cm 单位');
// UI 反面 4 段渲染
assert(/getVocabEn/.test(appSrc) && /getVocabSent/.test(appSrc) && /getVocabQuiz/.test(appSrc),
  'v19.43: render 调 getVocabEn/Sent/Quiz');
assert(/fc-card-endef/.test(appSrc) && /fc-card-sentence/.test(appSrc) && /fc-card-qtype/.test(appSrc),
  'v19.43: render 有 endef+sentence+qtype 3 段');
assert(/\.fc-card-endef\s*\{/.test(idxSrc) && /\.fc-card-sentence\s*\{/.test(idxSrc),
  'v19.43: CSS 有 endef + sentence');
assert(/min-height:560px/.test(idxSrc), 'v19.46: 闪卡放大 2 倍 min-height 560px');
// v19.46: 闪卡文字最小 14px (反面各段 ≥14px, 卡片放大)
assert(/max-width:640px/.test(idxSrc), 'v19.46: 闪卡宽度放大到 640px');
(function(){
  const fcSection = idxSrc.slice(idxSrc.indexOf('.fc-card {'), idxSrc.indexOf('.game-hub-card'));
  const tooSmall = (fcSection.match(/font-size:\s*(\d+)px/g) || []).filter(m => parseInt(m.match(/\d+/)[0]) < 14);
  assert(tooSmall.length === 0, `v19.46: 闪卡区无 <14px 文字 (违规 ${tooSmall.length}: ${tooSmall.slice(0,5).join(',')})`);
})();

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
assert(/background: rgba\(15, 23, 42, 0\.45\)/.test(idxSrc), "v19.60: kt-modal 轻遮罩 (亮主题)");
assert(/backdrop-filter: blur\(6px\)/.test(idxSrc), 'v19.27: kt-modal 加 backdrop blur');
assert(/background-color: #FFFFFF/.test(idxSrc), 'v19.60: kt-inner 白底 (亮主题)');
// v19.25 Bug 1: 删 renderCheckinPage 的 renderThinkPuzzleCard 调用
assert(/v19\.25: 删 renderThinkPuzzleCard 调用/.test(appSrc), 'v19.25 Bug1: renderCheckinPage 不再调 renderThinkPuzzleCard');
// 防回归: 全局只有 1 处 renderThinkPuzzleCard call (在 renderDashboard 用 state.currentWeek), 不再有 (week) 调用
const tpCalls = (appSrc.match(/\brenderThinkPuzzleCard\(/g) || []).length;
// 期望: 1 处 function 定义 + 1 处 dashboard 调用 + v19.80 下一道 1 处 = 3 个匹配
assert(tpCalls === 3, `v19.25 Bug1/v19.80: renderThinkPuzzleCard 调用收敛 (定义 + 主页 + 下一道 = 3, 实际 ${tpCalls})`);
// v19.25 Bug 2: openErrorBank modal 暗调 (v19.28: 注释标签升级保留 rgba 暗调样式)
assert(/background:linear-gradient\(135deg, rgba\(230,162,60,0\.10\), rgba\(192,86,33,0\.04\)\);border:1px dashed rgba\(230,162,60,0\.40\)/.test(appSrc), 'v19.25 Bug2: 顶部提示暗调样式保留');
assert(/border:1px solid rgba\(30,64,175,0\.30\);border-radius:6px;padding:6px 10px;font-size:12px;color:#1E293B/.test(appSrc), 'v19.25 Bug2: chip 暗调样式');
// v19.25 全局 CSS 补 hex
// [v19.55 亮色主题: 暗色机制断言废除] assert(/\[style\*="background:#ECEFF1"\]/.test(idxSrc), 'v19.25: 全局补 #ECEFF1 适配');
// [v19.55 亮色主题: 暗色机制断言废除] assert(/\[style\*="color:#455A64"\]/.test(idxSrc), 'v19.25: 全局补 #455A64 字色提亮');
// [v19.55 亮色主题: 暗色机制断言废除] assert(/\[style\*="color:#1565C0"\]/.test(idxSrc), 'v19.25: 全局补 #1565C0 字色提亮');
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
// v19.23→v19.80: 右栏顺序 思考题 → 知识树每日练(原名师秘籍容器) → 毕业题 (目标校已收进 ⋯其他 弹层)
assert(/id="thinkPuzzleCard"[\s\S]{0,300}id="weekMasterTipCard"[\s\S]{0,300}id="gradReviewCard"/.test(idxSrc), 'v19.80: 右栏顺序 思考→每日练→毕业');
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
assert(/weight:900;color:#1E40AF">🎯 Paper 2 弱点突击/.test(appSrc), "v19.63: Paper 2 标题品蓝(亮主题收敛)");
// [v19.55 亮色主题: 暗色机制断言废除] assert(/rgba\(255,255,255,0\.04\);border:1px solid rgba\(255,255,255,0\.10\)[\s\S]{0,500}Cloze 单空填/.test(appSrc), 'v19.21: Cloze 块用透明背景');
assert(/linear-gradient\(90deg,#B45309,#16A34A\)/.test(appSrc), 'v19.21: 进度条改亮版橙→绿渐变');
// [v19.55 亮色主题: 暗色机制断言废除] assert(/#F1F5F9;border-radius:4px;height:8px/.test(appSrc), 'v19.21: 进度条底用透明白');
// v19.21 全局补 #FFF/#EEE/linear-gradient
// [v19.55 亮色主题: 暗色机制断言废除] assert(/\[style\*="background:#FFF;"\]/.test(idxSrc), 'v19.21: 全局补 #FFF; 适配');
// [v19.55 亮色主题: 暗色机制断言废除] assert(/\[style\*="background:#EEE;"\]/.test(idxSrc), 'v19.21: 全局补 #EEE; 适配');
// [v19.55 亮色主题: 暗色机制断言废除] assert(/\[style\*="background:linear-gradient\(135deg,#FFE0E0/.test(idxSrc), 'v19.21: 全局补浅红粉 linear-gradient 适配');
// v19.20: 全局适配 CSS
// [v19.55 亮色主题: 暗色机制断言废除] assert(/\[style\*="background:#F0F8FF"\][\s\S]{0,200}rgba\(0,212,255/.test(idxSrc), 'v19.20: 蓝色调浅底转暗青渐变');
// [v19.55 亮色主题: 暗色机制断言废除] assert(/\[style\*="background:#E8F5E9"\][\s\S]{0,200}rgba\(0,255,136/.test(idxSrc), 'v19.20: 绿色调浅底转暗绿渐变');
// [v19.55 亮色主题: 暗色机制断言废除] assert(/\[style\*="background:#FFF3E0"\][\s\S]{0,300}rgba\(255,184,0/.test(idxSrc), 'v19.20: 橙色调浅底转暗橙渐变');
// [v19.55 亮色主题: 暗色机制断言废除] assert(/\[style\*="background:#FFEBEE"\][\s\S]{0,300}rgba\(255,51,102/.test(idxSrc), 'v19.20: 红色调浅底转暗红渐变');
// [v19.55 亮色主题: 暗色机制断言废除] assert(/\[style\*="color:#212121"\][\s\S]{0,600}color:\s*#1E293B/.test(idxSrc), 'v19.20: 深字转亮灰');
// [v19.55 亮色主题: 暗色机制断言废除] assert(/\[style\*="color:#666"\][\s\S]{0,200}color:\s*#64748B/.test(idxSrc), 'v19.20: 中灰字提亮');
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
assert(/background:#DC2626;color:#FFF[\s\S]{0,150}border-radius:14px/.test(appSrc), 'v19.18: 错题本红 badge 强提醒');
// renderWeekMasterTipCard 函数
assert(/function renderWeekMasterTipCard/.test(appSrc), 'v19.18: renderWeekMasterTipCard 函数');
// v19.80: 名师秘籍卡已换成知识树每日练 (WEEK_MASTER_TIPS 数据保留未接 UI)
assert(/function getDailyTreePicks\(/.test(appSrc) && /window\.getDailyTreePicks = getDailyTreePicks/.test(appSrc), 'v19.80: getDailyTreePicks 定义+导出');
assert(/const picks = getDailyTreePicks\(3\);/.test(appSrc), 'v19.80: 每日练卡调用 getDailyTreePicks (防死代码)');
assert(/🌳 知识树每日练/.test(appSrc) && /openKnowledgePractice\('\$\{p\.node\.id\}'/.test(appSrc), 'v19.80: 每日练卡一键进定星练习');
assert(!/window\.WEEK_MASTER_TIPS\[week - 1\]/.test(appSrc), 'v19.80: 主页不再渲染名师秘籍');
// v19.80: 思考题下一道 + 每日上限
assert(/const THINK_DAILY_CAP = 5;/.test(appSrc), 'v19.80: 思考题每日上限 5');
assert(/function thinkNextPuzzle\(/.test(appSrc) && /window\.thinkNextPuzzle = thinkNextPuzzle/.test(appSrc) && /onclick="thinkNextPuzzle\(\)"/.test(appSrc), 'v19.80: 下一道按钮接线');
assert(/_thinkAnsweredTodayCount\(\) >= THINK_DAILY_CAP/.test(appSrc), 'v19.80: 下一道受上限约束');
const dataSrcV80 = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
assert(/function getNextThinkPuzzle\(/.test(dataSrcV80) && /window\.getNextThinkPuzzle = getNextThinkPuzzle/.test(dataSrcV80) && /function getThinkPuzzleByWeek\(/.test(dataSrcV80), 'v19.80: 思考题取题 helper 定义+导出');
assert(typeof W.getNextThinkPuzzle === 'function' && W.getNextThinkPuzzle({ thinkPuzzleAnswers: {} }, null) !== null, 'v19.80: getNextThinkPuzzle 空答案时能取到题');
// v19.80: 布局 — 错题本在今日3件事前, 目标校进 ⋯其他 弹层
assert(idxSrc.indexOf('id="errorBankCard"') < idxSrc.indexOf('id="todayThreeCard"'), 'v19.80: 错题本卡在今日 3 件事前面');
assert(/id="targetSchoolModal"/.test(idxSrc) && /window\.toggleTargetSchoolModal\(\);window\.toggleMoreMenu\(\)/.test(idxSrc), 'v19.80: 目标校收进 ⋯其他 菜单弹层');
assert((idxSrc.match(/id="targetSchoolMini"/g) || []).length === 1, 'v19.80: targetSchoolMini 只在弹层里出现一次');
assert(/function toggleTargetSchoolModal\(/.test(appSrc) && /window\.toggleTargetSchoolModal = toggleTargetSchoolModal/.test(appSrc), 'v19.80: 目标校弹层开关定义+导出');
// v19.80: 英语薄弱模块思考题 + 科学/英语交替
assert((dataSrcV80.match(/subject: '📖 /g) || []).length >= 14, 'v19.80: 英语思考题 ≥14 道 (完形/改错/阅读/词汇/句型/语法/情景写作/听力)');
assert(/THINK_PUZZLES\.push\(\.\.\.THINK_PUZZLES_ENGLISH\)/.test(dataSrcV80), 'v19.80: 英语思考题已并入主题库 (防死数据)');
assert(/isEng\(p\) !== isEng\(cur\)/.test(dataSrcV80), 'v19.80: 下一道科学/英语交替');
assert(W.THINK_PUZZLES ? new Set(W.THINK_PUZZLES.map(p => p.week)).size === W.THINK_PUZZLES.length : true, 'v19.80: 思考题 week 键无重复');
assert(/comp_oe:\s*\{ spot: '阅读理解问答/.test(appSrc) && /return 'comp_oe'/.test(appSrc), 'v19.80: 阅读理解思考题接考点库 comp_oe');
assert(/if \(!result\) return;\s*\/\/ v19\.80[^\n]*\n\s*_thinkShowWeek = weekN;/.test(appSrc), 'v19.80: 答题后锁住当前思考题 (防 rotation 把解析冲掉)');
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
assert(!/width:18px;height:18px;border:1px solid rgba\(255,255,255,0\.20\);background:rgba\(255,255,255,0\.05\);color:#1E40AF;border-radius:3px;cursor:pointer;font-weight:900;font-size:12px;line-height:1;padding:0">−/.test(appSrc), 'v19.15k: 旧 18x18 AL 按钮已删');
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
assert(/onclick="openAllSchoolsModal\(\)"/.test(appSrc), 'v19.15i: 查看全部校 按钮触发 openAllSchoolsModal');
assert((W.PSLE_TARGET_SCHOOLS || []).some(s => s.cop <= 5), 'v19.81: 目标校补了 COP4-5 顶部梯队 (四科全AL1 时仍有可争取的标的)');
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
// v19.15k 重构 renderTargetSchoolMini 后该注释撤. 暗调样式仍在 (rgba(30,64,175,...) 渐变)
assert(/background:linear-gradient\(135deg, rgba\(30,64,175,0\.08\)/.test(appSrc), 'v19.15e+k: renderTargetSchoolMini 仍暗调 (青色渐变)');
// 验证关键暗色 token 出现
assert(/color:#1E40AF/.test(appSrc), 'v19.15e: 目标校标题色 #1E40AF (亮青)');
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
assert(/border:\s*1px solid rgba\(30,64,175,0\.45\)/.test(idxSrc), 'v19.15b CSS: 未打卡 border 高亮');
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
const mathCountV16 = ((dataSrcV14.match(/q:\s*'[^']+',\s*ans:/g) || []).length + (dataSrcV14.match(/"q":"[^"]+","ans":/g) || []).length);
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
// v19.81: 华文也移出 hard lock (已从 AL1 掉到 AL2, 目标又是四科全 AL1, 一周只有周日能练不够)
assert(/WEEKDAY_LOCKED_GAMES\s*=\s*\['unit'\]/.test(dataSrcV14), 'v19.14d/v19.81: 数学+华文都不在 hard lock 里');
assert(/WEEKDAY_SOFT_CAP_GAMES/.test(dataSrcV14), 'v19.14d: 数学加 soft cap');
assert(/from LEAVES to STORAGE ORGANS|translocation/.test(dataSrcV14), 'v19.14d: Phloem 修正不写双向');
assert(/EMULSIFIES?\s+fat|emulsify fat/.test(dataSrcV14), 'v19.14d: Liver bile 改 emulsify');
assert(/lighter\s*\/\s*not fully dark|影子 lighter/.test(dataSrcV14), 'v19.14d: Light translucent 影子加 lighter');
assert(/'thin'.*'surface area'|villi.*'thin'/.test(dataSrcV14), 'v19.14d: OE #4 加 villi+thin wall keywords');
assert(/Change 1:.*Change 2:|do NOT bracket heat/.test(dataSrcV14), 'v19.14d: OE #13 light/heat 独立');
const mathCountV14d = ((dataSrcV14.match(/q:\s*'[^']+',\s*ans:/g) || []).length + (dataSrcV14.match(/"q":"[^"]+","ans":/g) || []).length);
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
assert(/\?v=19.(3[789]|[4-9][0-9])/.test(idxSrc), 'v19.27+: cache buster ≥ 19.37');

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

// ===== v19.50: 每日课表 + 打分卡 + 周汇总 (手册v18.6) =====
assert(/data-page="schedule"/.test(idxSrc), 'v19.50: nav 含课表 tab 按钮');
assert(/id="page-schedule"/.test(idxSrc), 'v19.50: page-schedule 容器存在');
assert(/const SCHED_DAYS = \{/.test(appSrc), 'v19.50: SCHED_DAYS 课表数据存在');
assert(/const SCHED_GRID = \[/.test(appSrc), 'v19.51: SCHED_GRID 周打分矩阵存在');
// v19.51: 完整周打分表 (行×5学习日网格, 任意格可填, 周切换)
assert(/function renderSchedGrid\(/.test(appSrc), 'v19.51: renderSchedGrid 已定义');
assert(/renderSchedGrid\(\)/.test(appSrc), 'v19.51: renderSchedGrid 被调用');
assert(/_schedShiftWeek/.test(appSrc) && /window\._schedShiftWeek = _schedShiftWeek/.test(appSrc), 'v19.51: 周切换已接入+导出');
assert(/'家长已核对'/.test(appSrc), 'v19.51: 家长核对行存在');
assert(/21:30准时收工/.test(appSrc), 'v19.51: 收工勾选行存在');
assert(/math_b/.test(appSrc), 'v19.51: 数学pair(错/粗心)计入汇总');
assert(/essay_a/.test(appSrc) && /essay_b/.test(appSrc), 'v19.51: 作文内容+语言两栏');
assert((appSrc.match(/SCHED_GRID/g) || []).length >= 3, 'v19.51: SCHED_GRID 被渲染使用');
assert(/overflow-x:auto/.test(appSrc), 'v19.51: 打分表横向滚动容器(手机不撑破)');
assert(/v19\.53: 家长停在课表页/.test(appSrc), 'v19.53: 远程更新即时刷新课表页(多设备查看)');
// v19.59: 打分表全周7天 + 自学记录文本行
assert(/const COLS = \[1, 2, 3, 4, 5, 6, 0\]/.test(appSrc), 'v19.59: 打分表含周四/周六列');
assert(/key: 'note'/.test(appSrc) && /type: 'text'/.test(appSrc), 'v19.59: 自学记录文本行存在');
assert(/field === 'note'/.test(appSrc), 'v19.59: note 存文本不转数字');
assert(/row\.type === 'text'/.test(appSrc), 'v19.59: text 输入渲染分支');
// v19.62: 能力页按计分卡维度评估
assert(/id="schedAbilityCard"/.test(idxSrc), 'v19.62: 能力评估卡容器在能力页首屏');
assert(/function renderSchedAbilityCard\(/.test(appSrc), 'v19.62: renderSchedAbilityCard 已定义');
assert(/renderSchedAbilityCard\(\);/.test(appSrc), 'v19.62: 能力页hook已接入(防死代码)');
assert(/待积累/.test(appSrc), 'v19.62: 能力评估空态文案');
assert(/本周先补/.test(appSrc), 'v19.62: 能力评估结论先行(弱项导向)');
assert(/id="roadmapCard"/.test(idxSrc), 'v19.62: 备考时间线卡容器');
assert(/ROADMAP_PHASES/.test(appSrc) && /renderRoadmapCard\(\);/.test(appSrc), 'v19.62: 时间线渲染+hook接入');
assert(/距 PSLE 笔试还剩约/.test(appSrc), 'v19.62: 笔试倒计时');
assert(/ontoggle="if\(this\.open&&window\.drawChart\)/.test(idxSrc), 'v19.62: 旧分析卡收折叠+展开重画chart');
assert(/1 积分 = SGD 0\.05/.test(idxSrc) && !/SGD 0\.25/.test(idxSrc), 'v19.62: 兑换汇率文案修正0.25→0.05 (老bug)');
// v19.63: 思考题卡恢复 + filler 大差距隐藏
assert(/id="thinkPuzzleCard"(?! style="display:none")/.test(idxSrc), 'v19.63: 思考题卡不再被 display:none 隐藏');
assert(/delta < 30 \|\| delta > 300/.test(appSrc), 'v19.63: filler 差距过大时隐藏(不硬撑空框)');
assert(/当周无题不再返回 null/.test(dataSrc) && /seed % list\.length/.test(dataSrc), 'v19.63: 思考题当周无题时每日轮换fallback');
// v19.65: editing错题做不了 bug 修复
assert(/id="ebSelfArea"/.test(appSrc), 'v19.65: 无选项题型有自评作答区(不再空白)');
assert(/function ebRevealAnswer\(/.test(appSrc) && /window\.ebRevealAnswer = ebRevealAnswer/.test(appSrc), 'v19.65: 看答案函数已定义+导出');
assert(/function submitErrorBankSelf\(/.test(appSrc) && /window\.submitErrorBankSelf = submitErrorBankSelf/.test(appSrc), 'v19.65: 自评提交已定义+导出');
assert(/_ebApplyResult\(optIdx === item\.ans\)/.test(appSrc), 'v19.65: mcq提交复用共享结果处理');
assert(/item\.ans \?\? item\.correctAns/.test(appSrc), 'v19.65: 答错反馈兜底correctAns(修undefined)');
// v19.66: 做题类统一 对/总 两格填写
assert(/label: 'Editing 2篇: 对_\/共_题'/.test(appSrc), 'v19.66: Editing行改对/总格式');
assert(/const wrongOf = /.test(appSrc) && /wrongOf\(1, 'ed'\)/.test(appSrc), 'v19.66: 错数从对/总推导');
assert(!/label: '[^']*: 错_题'/.test(appSrc), 'v19.66: 无残留单格错题行');
// v19.67: 答案详解+PSLE考点技巧
assert(/const EB_TYPE_TIPS = \{/.test(appSrc) && /_ebTipsHtml\(item\.gameKey\)/.test(appSrc), 'v19.67: 题型考点技巧库+渲染接入');
assert(/id="ebPeekBtn"/.test(appSrc) && /ebRevealMcqAnswer/.test(appSrc), 'v19.67: MCQ可直接看答案');
assert(/window\._ebPeekNext = _ebPeekNext/.test(appSrc), 'v19.67: 看答案后一步进下一题');
assert((appSrc.match(/_ebTipsHtml\(/g) || []).length >= 4, 'v19.67: 考点卡在看答案/答错反馈处都接入');
assert(/editing:\s*\{ spot:/.test(appSrc) && /sst:\s*\{ spot:/.test(appSrc) && /sci_oe:\s*\{ spot:/.test(appSrc), 'v19.67: 主要题型考点覆盖');
// v19.68: 同步根因修复 (772分覆盖4806分真实事故)
assert(/_lastTouch = Date\.now\(\)/.test(dataSrc), 'v19.68: saveState盖时间戳');
assert(/ct > lt/.test(dataSrc) && /totalPoints \|\| 0\) >/.test(dataSrc), 'v19.68: 同步取新/取分高者');
assert(/已推回云端自动纠正/.test(dataSrc), 'v19.68: 本地更全时自动推回痊愈');
assert(/rtouch < ltouch && rp < lp/.test(dataSrc), 'v19.68: onSnapshot拒收旧时间戳数据');
// v19.68: 思考题带详解+考点技巧
assert(/_thinkSubjectToGameKey/.test(appSrc) && /_ebTipsHtml\(_thinkSubjectToGameKey/.test(appSrc), 'v19.68: 思考题解析带PSLE考点技巧卡');
// v19.69: editing错题题面修复(iPad实报"题不对")
assert(/找出这段里的错词并改正/.test(appSrc), 'v19.69: editing新错题入库带原段落');
assert(!/e\.word \+ '→' \+ e\.fix/.test(appSrc), 'v19.69: e.fix undefined bug已修(字段是reason)');
assert(/_ebUpgradeLegacyEditing\(item\)/.test(appSrc) && /window\._ebUpgradeLegacyEditing/.test(appSrc), 'v19.69: 旧格式editing错题运行时自动补全+接入');
// v19.71: editing错题交互式找错
assert(/eb-edit-word/.test(appSrc) && /ebToggleEditWord/.test(appSrc), 'v19.71: 段落词可点选');
assert(/function ebSubmitEditing\(/.test(appSrc) && /window\.ebSubmitEditing/.test(appSrc), 'v19.71: 批改函数已定义+导出');
assert(/hit === wrongSet\.size && extra === 0/.test(appSrc), 'v19.71: 全找对且无误选才算对');
assert(/_qShort/.test(appSrc), 'v19.71: 交互模式题面用短指令不重复段落');
// v19.54: 我的/暑假收纳进"⋯其他"灰色按钮
assert(/id="moreTabBtn"/.test(idxSrc), 'v19.54: 其他按钮存在');
assert(/id="moreMenu"/.test(idxSrc), 'v19.54: 收纳菜单存在');
assert(/data-page="character" style="display:none"/.test(idxSrc), 'v19.54: 我的tab已隐藏');
assert(/data-page="summer" style="display:none"/.test(idxSrc), 'v19.54: 暑假tab已隐藏');
assert(/function gotoPage\(/.test(appSrc) && /window\.gotoPage = gotoPage/.test(appSrc), 'v19.54: gotoPage统一切页+导出');
assert(/if \(!page\) return;/.test(appSrc), 'v19.54: 无data-page按钮防炸');
assert(/MORE_MENU_PAGES/.test(appSrc), 'v19.54: 隐藏页激活时其他按钮高亮');
assert((idxSrc.match(/window\.gotoPage\('(checkin|character|summer|admin)'\)/g) || []).length === 4, 'v19.61: 菜单四项都接gotoPage(含打卡)');
assert(/data-page="checkin" style="display:none"/.test(idxSrc), 'v19.61: 打卡tab已隐藏');
assert(/'checkin', 'character', 'summer', 'admin'/.test(appSrc), 'v19.61: checkin在MORE_MENU_PAGES');
assert(/function renderSchedulePage\(/.test(appSrc), 'v19.50: renderSchedulePage 已定义');
assert(/page === 'schedule'/.test(appSrc), 'v19.50: tab 切换 hook 已接入 (防死代码)');
assert(/function computeSchedWeekSummary\(/.test(appSrc), 'v19.50: 周汇总函数已定义');
assert(/renderSchedWeekSummary\(\)/.test(appSrc), 'v19.50: 周汇总被调用');
assert(/renderSchedMonthTrend\(\)/.test(appSrc), 'v19.50: 月趋势被调用');
assert(/window\.saveDailyScore = saveDailyScore/.test(appSrc), 'v19.50: saveDailyScore window 导出');
assert(/saveState\(state\);\s*renderSchedWeekSummary/.test(appSrc), 'v19.50: 打分即存 state + 刷新汇总');
assert(/Conquer Comprehension/.test(appSrc), 'v19.50: 课表含实书名(阅读OE)');
assert(/21:00–21:30/.test(appSrc) && /睡前单词/.test(appSrc), 'v19.50: 睡前单词档在课表中');
assert(/scheduleScores/.test(appSrc), 'v19.50: 打分数据挂 state.scheduleScores (随 Firebase 同步)');

// ===== v19.55: 亮色主题 (对齐挖矿系统配色) =====
assert(/--color-bg: #F1F5F9/.test(idxSrc), 'v19.55: 页面底色浅灰蓝');
assert(/--color-card: #FFFFFF/.test(idxSrc), 'v19.55: 卡片白底');
assert(/--color-primary: #1E40AF/.test(idxSrc), 'v19.55: 主色品蓝');
assert(/--color-text: #1E293B/.test(idxSrc), 'v19.55: 主文字深灰');
assert(!/\[style\*="background:#F0F8FF"\]/.test(idxSrc), 'v19.55: v19.20 自动转暗机制已移除');
assert(!/#E0E0E0/.test(appSrc) && !/#0F172A/.test(appSrc), 'v19.55: app.js 无暗主题残留色');
assert(!/--color-bg: #0F172A/.test(idxSrc), 'v19.55: 暗主题变量已替换');

// ===== v19.74: 知识树 3-6 年级全大纲扩容 (科学 19 + 英语 13) =====
{
  const KT = W.KNOWLEDGE_TREE, KP = W.KNOWLEDGE_PRACTICE;
  const sci = KT && KT['🔬 科学'], eng = KT && KT['📖 英语'];
  assert(sci && sci.length === 19, `v19.74: 科学树 19 节点 (MOE P3-P6 五大主题全覆盖, 实际 ${sci && sci.length})`);
  assert(eng && eng.length === 13, `v19.74: 英语树 13 节点 (PSLE 四卷组件全覆盖, 实际 ${eng && eng.length})`);
  ['sci_magnets', 'sci_matter', 'sci_digestive', 'sci_plant_transport', 'sci_respiratory', 'sci_electric', 'sci_ecosystem',
   'eng_vocab_mcq', 'eng_visualtext', 'eng_compcloze', 'eng_synthesis', 'eng_sitwriting'].forEach(id => {
    assert(sci.concat(eng).some(n => n.id === id), `v19.74: 新节点 ${id} 在树中`);
  });
  // v19.81: 四科全部扩到 10 题/节点 (基础+易错+应用+拉分分层), 对齐"四科全 AL1"目标
  const math = KT && KT['➗ 数学'], chi = KT && KT['🇨🇳 华文'];
  assert(math && math.length === 19, `v19.81: 数学树 19 节点 (MOE P3-P6 全大纲, 实际 ${math && math.length})`);
  assert(chi && chi.length === 12, `v19.81: 华文树 12 节点 (普通华文四卷全覆盖, 实际 ${chi && chi.length})`);
  ['math_whole_numbers', 'math_fraction_basic', 'math_decimals', 'math_area_perimeter', 'math_average',
   'math_charts', 'math_circle', 'math_nets', 'math_patterns',
   'ch_chars', 'ch_vocab_use', 'ch_sentence', 'ch_comp_mcq', 'ch_comp_oe', 'ch_situational', 'ch_listening'].forEach(id => {
    assert(math.concat(chi).some(n => n.id === id), `v19.81: 新节点 ${id} 在树中`);
  });
  let allNodes = [];
  Object.keys(KT || {}).forEach(s => { allNodes = allNodes.concat(KT[s]); });
  const badQty = allNodes.filter(n => !KP[n.id] || KP[n.id].length !== 10);
  assert(badQty.length === 0, `v19.81: 全部 ${allNodes.length} 节点每个 10 题 (不齐: ${badQty.map(n => n.id + '=' + ((KP[n.id] || []).length)).join(',') || '无'})`);
  const badTags = allNodes.filter(n => {
    const tags = (KP[n.id] || []).map(q => q.tag);
    const cnt = t => tags.filter(x => x === t).length;
    return cnt('易错') < 3 || cnt('应用') < 2 || cnt('拉分') < 2;
  });
  assert(badTags.length === 0, `v19.81: 每个节点 ≥3易错+2应用+2拉分 (不齐: ${badTags.map(n => n.id).join(',') || '无'})`);
  // 华文必须是普通华文口径 — 高华(HCL)是另一科, 孩子不考
  assert(!/高华|HCL/.test(JSON.stringify(chi)), 'v19.81: 华文树无高华/HCL 残留 (孩子读普通华文)');
  assert(chi.some(n => /四卷/.test(n.desc || '')), 'v19.81: 华文树标明四卷结构 (含听力+口试, 不是只有2卷)');
  const noExplain = allNodes.filter(n => (KP[n.id] || []).some(q => !q.explain));
  assert(noExplain.length === 0, `v19.74: 知识树练习题全部有 explain (缺: ${noExplain.map(n => n.id).join(',') || '无'})`);
  // 每个节点 desc 有内容 + 3 examples + pitfall (AL1 深度结构)
  const thin = allNodes.filter(n => !n.desc || !n.examples || n.examples.length < 3 || !n.pitfall);
  assert(thin.length === 0, `v19.74: 所有节点 desc+3examples+pitfall 齐全 (缺: ${thin.map(n => n.id).join(',') || '无'})`);
  assert(!/AL 4-6/.test(JSON.stringify(KT)), 'v19.81: 四科节点深度标准全部对齐 AL1 (无 AL 4-6 残留)');
  // v19.81: 修死结 — 这三处不修, "综合 AL4 = 四科全 AL1" 在代码里永远算不出来
  assert(/const map = \{ 6: 1, 5: 1, 4: 2, 3: 4, 2: 6, 1: 7 \}/.test(dataSrcV80), 'v19.81: _gameDiffToAL 补 diff=6 档 (原来打到最高难度反被判 AL6)');
  assert(/estPaper2Score >= 32 \? 'AL 1'/.test(appSrc), 'v19.81: Paper2 模考补 AL1 档 (原来满分也只判 AL 2-3, 英语被封顶)');
  assert(/const val = parseFloat\(input\.value\);/.test(appSrc) && !/const val = parseInt\(input\.value\)/.test(appSrc), 'v19.81: 数学游戏改 parseFloat (原 parseInt 让 11 道小数答案题永远判错)');
  assert(/last3\.every\(r => r\.accuracy >= 0\.9\)/.test(dataSrcV80), 'v19.81: 难度升级线 80%→90% (AL1 的定义就是 90 分)');
  assert(/const WEEKDAY_LOCKED_GAMES = \['unit'\]/.test(dataSrcV80), 'v19.81: 华文解锁平日 (已从 AL1 掉到 AL2, 一周练一天不够)');
}

// ===== v19.76: modal 滚动穿透修复 =====
{
  assert(/function initModalScrollLock\(/.test(appSrc), 'v19.76: initModalScrollLock 已定义');
  assert(/initModalScrollLock\(\);|DOMContentLoaded.*initModalScrollLock/.test(appSrc), 'v19.76: initModalScrollLock 启动时被调用 (非死代码)');
  assert(/window\.syncModalScrollLock\s*=/.test(appSrc), 'v19.76: syncModalScrollLock 已导出 window');
  assert(/b\.style\.position = 'fixed'/.test(appSrc) && /window\.scrollTo\(0, _mslScrollY\)/.test(appSrc), 'v19.76: body 锁定用 position:fixed 且解锁恢复滚动位置');
  assert(/overscroll-behavior: contain/.test(idxSrc), 'v19.76: index.html 浮层含 overscroll-behavior: contain');
  // v19.77 三修
  assert(/MSL_OPEN_SEL/.test(appSrc) && !/querySelectorAll\('\.show'\)/.test(appSrc), 'v19.77: 用静态选择器判开关, 不再 getComputedStyle 全量扫描(修卡顿)');
  assert(/h\.style\.overflow = 'hidden'/.test(appSrc), 'v19.77: html+body 双锁');
  assert(/function _mslRestoreScroll\(/.test(appSrc) && /if \(rebuilt\) _mslRestoreScroll\(rebuilt\);/.test(appSrc), 'v19.77: 弹层重建后同步还原内层滚动位置(答题不跳顶)且被调用');
  assert(!/_mslRaf/.test(appSrc), 'v19.77: 还原不依赖 rAF (后台标签/低电量不触发会让还原永久失效)');
  assert(/_mslTrackScroll/.test(appSrc) && /addEventListener\('scroll', _mslTrackScroll, true\)/.test(appSrc), 'v19.77: 捕获阶段记录弹层内滚动位置');
  // v19.78: 滚动流畅性 —— 反向断言, 防止再引入非 passive touchmove
  assert(!/passive: false/.test(appSrc), 'v19.78: 无 {passive:false} touchmove (会关掉 iOS 滚动快速路径 → 按在选项上滑不动)');
  assert(!/_mslScrollableAncestor/.test(appSrc), 'v19.78: 已删每帧强制布局的可滚动祖先查找');
  assert(/_mcqDragged/.test(appSrc) && /if \(_mcqDragged\) \{ _mcqDragged = false; return; \}/.test(appSrc), 'v19.78: 选项上拖动判定为滚动, 不算选择');
  assert(!/_kpracticeState\.answers\[qIdx\] = optIdx;\s*\n\s*_renderKnowledgePractice\(\);/.test(appSrc), 'v19.78: 答题不再整体重建弹层');
  assert(/qEl\.querySelectorAll\('\.mcq-opt'\)\.forEach/.test(appSrc), 'v19.78: 答题改为局部更新按钮态');
  assert(/touch-action: pan-y/.test(idxSrc), 'v19.78: 选项区允许纵向拖动滚动');
  assert(/\.kt-inner \.cn-submit/.test(idxSrc) && /position: sticky/.test(idxSrc), 'v19.78: 提交按钮吸底');
  assert(/-webkit-overflow-scrolling: touch/.test(idxSrc), 'v19.77: 弹层内滚动区有动量滚动');
}

// ===== v19.79: 9月假期课表 (9/5-13) + 练习弹层右侧滑动走廊 =====
assert(/const HOLIDAY_SCHED = \{/.test(appSrc), 'v19.79: HOLIDAY_SCHED 已定义');
assert((appSrc.match(/'2026-09-\d{2}': \{ label:/g) || []).length === 9, 'v19.79: 假期 9 天 (9/5-13) 全部有课表');
assert((appSrc.match(/\], three: \[/g) || []).length === 9, 'v19.79: 假期 9 天都配了主页今日 3 件事');
assert(/function getHolidayPlan\(/.test(appSrc) && /window\.getHolidayPlan = getHolidayPlan/.test(appSrc), 'v19.79: getHolidayPlan 定义+导出');
assert(/if \(getHolidayPlan\(\)\) \{ _renderHolidaySchedule\(el\); return; \}/.test(appSrc), 'v19.79: 课表页接了假期分支 (防死代码)');
assert(/const holiday = window\.getHolidayPlan && window\.getHolidayPlan\(\);/.test(appSrc) && /holiday\.three\.map/.test(appSrc), 'v19.79: 主页今日 3 件事接了假期分支');
assert(/window\._schedSetHDay = _schedSetHDay/.test(appSrc), 'v19.79: 假期日期切换按钮已接线');
assert(/9\/14 恢复常规|9\/14\(周一\)恢复常规/.test(appSrc), 'v19.79: 界面标明 9/14 自动恢复');
assert(!/Science Yearly/.test(appSrc.match(/const HOLIDAY_SCHED[\s\S]*?window\.HOLIDAY_SCHED/)[0]), 'v19.79: 假期课表无 Science Yearly (未购, 用选择题册替代)');
assert(/\.kt-inner \.cn-questions \{ padding-right: 38px; \}/.test(idxSrc), 'v19.79: 练习弹层右侧 38px 滑动走廊');

// ===== v19.82: 科学事实修正 (4-agent 审计查出, 这些是给孩子学的内容, 错了很糟) =====
{
  const TP = W.THINK_PUZZLES || [];
  const all = JSON.stringify(TP) + dataSrcV80;
  assert(!/把你手指的热抢走得快, 大脑感觉"凉\/烫"剧烈/.test(all), 'v19.82: W12热感题热流方向已修 (100°C方块是热流进手, 原文写反了 — 热流方向是Heat章核心采分点)');
  assert(!/LED 把 90% 电变光/.test(all), 'v19.82: 删掉编造的"LED 90%变光" (真实光效约30-50%)');
  assert(!/蒸腾速度大约增 5 倍/.test(all) && !/增加约 5 倍/.test(all), 'v19.82: 删掉编造的"蒸腾增5倍" (蒸腾对光强是饱和响应, PSLE不考定量倍数)');
  assert(!/表面积可达 250 m²/.test(all), 'v19.82: 删掉过时的小肠250m² (近年测定约30-40m², 且PSLE不考数字)');
  assert(!/每个设备都拿到完整 220V/.test(all), 'v19.82: 删掉220V (新加坡是230V, 且电压不在PSLE大纲内)');
  assert(!/树停止吸水, 几天后枯死/.test(all), 'v19.82: 修"摘光叶子几天枯死" (根压仍能送水, 落叶树每年落光叶也不死)');
  assert(!/动物特有: 中心体/.test(dataSrcV80), 'v19.82: 删中心体 (中学内容, PSLE P5细胞只考6个)');
  assert(!/sperm↔pollen grain/.test(dataSrcV80), 'v19.82: 生殖对照表修正 (原把配子和装配子的结构混为一谈, 和本节点练习题自相矛盾)');
  assert(!/严重 100 倍/.test(dataSrcV80), 'v19.82: 蒸汽烫伤倍数口径统一 (原hook写100倍, 正文写6倍, 自相矛盾)');
}

// ===== v19.82: 难度按题库真实覆盖动态封顶 (防"Lv6其实在发P4题") =====
assert(/function _gameMaxCap\(gameKey\)/.test(dataSrcV80), 'v19.82: _gameMaxCap 已定义');
assert(/s\.difficulty < _gameMaxCap\(gameKey\)/.test(dataSrcV80), 'v19.82: 升级判断用动态封顶 (原硬编码 <6, 题库不够时会静默回落随机发简单题)');
assert(typeof W._gameMaxCap === 'function' && W._gameMaxCap('editing') <= 5 && W._gameMaxCap('math') >= 5,
  `v19.82: 封顶按题库算 (editing=${W._gameMaxCap && W._gameMaxCap('editing')}, math=${W._gameMaxCap && W._gameMaxCap('math')})`);

// ===== v19.83: 选项防猜 (长度线索 + 真随机洗牌) =====
{
  const KT2 = W.KNOWLEDGE_TREE, KP2 = W.KNOWLEDGE_PRACTICE;
  const sciKey = Object.keys(KT2).find(k => k.indexOf('科学') >= 0);
  const sci2 = KT2[sciKey] || [];
  let tot = 0, longest = 0, ratio = 0;
  sci2.forEach(n => (KP2[n.id] || []).forEach(q => {
    const L = q.opts.map(o => String(o).length), m = Math.max(...L);
    tot++;
    if (L[q.ans] === m && L.filter(x => x === m).length === 1) longest++;
    const oth = L.filter((_, i) => i !== q.ans);
    ratio += L[q.ans] / (oth.reduce((a, b) => a + b, 0) / 3);
  }));
  assert(tot > 0 && longest / tot < 0.45, `v19.83: 科学题"答案=唯一最长选项" <45% (实际 ${Math.round(longest / tot * 100)}%, 修复前 81% — 闭眼选最长能拿93分)`);
  assert(tot > 0 && ratio / tot < 1.35, `v19.83: 科学题答案/干扰项长度比 <1.35 (实际 ${(ratio / tot).toFixed(2)}, 修复前 2.98)`);
}
assert(/function _fyShuffle\(arr\)/.test(appSrc), 'v19.83: Fisher-Yates 洗牌已定义');
assert(!/\[\.\.\.q\.opts\]\.sort\(\(\) => Math\.random\(\) - 0\.5\)/.test(appSrc), 'v19.83: 选项洗牌不再用伪洗牌 (四元素时答案留A位28.1%/到D仅18.8%)');
assert((appSrc.match(/_fyShuffle\(/g) || []).length >= 5, 'v19.83: _fyShuffle 已接入各处选项洗牌 (防死代码)');

// ===== v19.84: 华文题库去高华化 (自适应难度会把孩子一路推到最高档, 而 computeTotalAL 又拿它反推华文AL) =====
{
  const CM = W.CHINESE_MCQ || [];
  const bad = CM.filter(q => /论语|文言|之南海|巾帼|须眉|温故而知新|三人行|己所不欲|学而不思|春风又绿/.test(q.q + (q.explain || q.exp || '')));
  assert(bad.length === 0, `v19.84: 华文题库无文言文/高华内容 (孩子读普通华文; 残留 ${bad.length} 题${bad.length ? ': ' + bad[0].q.slice(0, 18) : ''})`);
  const d6 = CM.filter(q => (q.diff || q.difficulty) === 6);
  assert(d6.length >= 8, `v19.84: 华文最高难度档仍有 ≥8 题撑一局 (实际 ${d6.length})`);
}

// ===== v19.85: 华文选项防猜 + Editing 补高难度段落 + 引擎不再往下劝退 =====
{
  const KT3 = W.KNOWLEDGE_TREE, KP3 = W.KNOWLEDGE_PRACTICE;
  const chKey = Object.keys(KT3).find(k => k.indexOf('华文') >= 0);
  let tot = 0, longest = 0;
  (KT3[chKey] || []).forEach(n => (KP3[n.id] || []).forEach(q => {
    const L = q.opts.map(o => String(o).length), m = Math.max(...L);
    tot++;
    if (L[q.ans] === m && L.filter(x => x === m).length === 1) longest++;
  }));
  assert(tot > 0 && longest / tot < 0.45, `v19.85: 华文题"答案=唯一最长选项" <45% (实际 ${Math.round(longest / tot * 100)}%, 修复前 58%)`);
}
{
  const EP = W.EDITING_PARAGRAPHS || [];
  const hard = EP.filter(p => (p.diff || 0) >= 5).length;
  assert(hard >= 12, `v19.85: Editing 补了高难度段落 (diff≥5 共 ${hard} 段, 原来是 0 — 孩子起步就是 Lv4, 等于没有进阶空间, 而 Editing 是他丢5分的弱项)`);
  assert(W._gameMaxCap && W._gameMaxCap('editing') >= 5, 'v19.85: Editing 封顶已抬到 Lv5+ (原来封顶=起步档 Lv4)');
}
assert(/d = Math\.min\(d, 3\);/.test(dataSrcV80), 'v19.85: 英语 weak 模式不再压到 Lv2 (Lv2是P3-P4难度, 长期停那练不出AL1)');
assert(/state\.englishStreak\.wrong >= 6/.test(dataSrcV80), 'v19.85: 连错劝退门槛 4→6 题 (冲AL1期间不该一遇挫折就往下劝)');
assert(/acc\[s\]\.accuracy < 90/.test(dataSrcV80), 'v19.85: 弱科告警线 70%→90% (AL1=90分, 原来75-88%这个真正该救的区间完全不报警)');

// ===== v19.87: 词汇闪卡改成"每天一组, 全认识才收工" =====
{
  const st = { flashcardSRS: {}, totalPoints: 0, logs: [] };
  const g = W.getDailyFlashcardGroup(st);
  assert(g.words.length === W.FC_GROUP_SIZE, `v19.87: 每天编一组 ${W.FC_GROUP_SIZE} 个词 (实际 ${g.words.length})`);
  const w0 = g.words[0];
  const r1 = W.answerDailyFlashcard(st, w0, 'dont');
  assert(st.fcDailyGroup.queue[st.fcDailyGroup.queue.length - 1] === w0, 'v19.87: 点不认识 → 该词排到本组队尾, 待会儿还回来');
  assert(r1.remaining === g.words.length, 'v19.87: 不认识不出队, 剩余数不变');
  const before = JSON.stringify(st.flashcardSRS[w0]);
  const r2 = W.answerDailyFlashcard(st, w0, 'know');
  assert(r2.isFirst === false && r2.pts === 0, 'v19.87: 同一天补考不重复加分');
  assert(JSON.stringify(st.flashcardSRS[w0]) === before, 'v19.87: 曲线只认当天第一次自评 — 补考三遍不会跳三关');
  assert(r2.remaining === g.words.length - 1, 'v19.87: 点认识才出队');
  // 全部点认识 → done
  let guard = 0;
  while (st.fcDailyGroup.queue.length && guard++ < 200) W.answerDailyFlashcard(st, st.fcDailyGroup.queue[0], 'know');
  assert(st.fcDailyGroup.done === true, 'v19.87: 全部点到认识才收工');
  // 老赖保底: 造 30 个新词 + 15 个没记住的, 看新组里没记住的占比
  const st2 = { flashcardSRS: {}, totalPoints: 0, logs: [] };
  const allWords = [];
  (W.FLASHCARD_DECKS || []).forEach(d => d.words.forEach(x => allWords.push(x)));
  allWords.slice(0, 15).forEach(x => { st2.flashcardSRS[x] = { interval: 0, correctStreak: 0, lastReviewed: '2020-01-01', nextReview: '2020-01-02', mastered: false }; });
  const grp2 = W.buildDailyFlashcardGroup(st2);
  const lapsedIn = grp2.filter(x => st2.flashcardSRS[x]).length;
  assert(lapsedIn >= Math.floor(W.FC_GROUP_SIZE / 3), `v19.87: 之前没记住的词有 1/3 保底名额 (实际进组 ${lapsedIn}/${W.FC_GROUP_SIZE}) — 否则查词多的日子老赖永远进不来`);
}
assert(/getDailyGroupRemaining/.test(appSrc), 'v19.87: 首页/词汇页改报"这一组还剩几个"');
assert(/今天这一组全认识了/.test(appSrc), 'v19.87: 收工页写明"今天这一组全认识了"');
assert(/fc-btn-vague/.test(appSrc) && /fc-btn-vague/.test(idxSrc), 'v19.87: 三档自评按钮(不认识/有点印象/认识)已接入+有样式');
assert(!/getAllDueFlashcards\(state\)/.test(appSrc), 'v19.87: UI 不再报只涨不落的到期总数');

// ===== v19.88: 题库对齐 AL1 — 清超纲奥数 + 补 PSLE 真形态题 =====
{
  const M = W.MATH_QUESTIONS || [], S = W.SCIENCE_MCQ || [];
  const off = M.filter(q => /sqrt|√|环形跑道|水池.*管.*满|每人分\s*\d+\s*余|1\+2\+3\+/.test(String(q.q)));
  assert(off.length === 0, `v19.88: 数学库无超纲奥数 (平方根/工程问题/数论余数/数列求和/环形跑道; 残留 ${off.length})`);
  const hack = M.filter(q => /取整|\?\s*\/\s*\d/.test(String(q.q)));
  assert(hack.length === 0, `v19.88: 数学库无"答案编码hack" (原来有题要求把2.4h输成24, 是在教考场上会害死人的答题格式; 残留 ${hack.length})`);
  const neg = M.filter(q => typeof q.ans === 'number' && q.ans < 0);
  assert(neg.length === 0, `v19.88: 数学库无负数答案 (小学不考负数; 残留 ${neg.length})`);
  const longQ = M.filter(q => String(q.q).length >= 40).length;
  assert(longQ >= 15, `v19.88: 数学库有 ≥15 道 PSLE Paper2 形态多步应用题 (题干≥40字, 实际 ${longQ}; 原来全库最长才60字符全是一步速算)`);
  // 科学: 孩子最大失分点是选择题, 必须有 Booklet A 的三类硬题
  const setup = S.filter(q => /应比较|哪两组|哪两杯|这个实验最主要的问题/.test(String(q.q))).length;
  const chart = S.filter(q => /(\d+\s*(mL|cm|°C|g|分钟)[^]{0,40}){3,}/.test(String(q.q))).length;
  const multi = S.filter(q => /\(1\)[^]*\(2\)[^]*\(3\)/.test(String(q.q))).length;
  assert(setup >= 4, `v19.88: 科学库有 ≥4 道"实验装置对比"题 (原来 0 道, 实际 ${setup})`);
  assert(chart >= 4, `v19.88: 科学库有 ≥4 道"图表/数据推断"题 (原来全库没出现过任何一组数据, 实际 ${chart})`);
  assert(multi >= 4, `v19.88: 科学库有 ≥4 道"多陈述判断"题 (原来 1 道, 实际 ${multi})`);
  assert(!/catalyst/.test(JSON.stringify(S)), 'v19.88: 删掉"盐是生锈催化剂"的错误说法 (盐是电解质不是催化剂)');
}
assert(/mg-q-long/.test(idxSrc) && /mg-q-xlong/.test(appSrc), 'v19.88: 长题干自适应字号 (原来固定36px居中, PSLE多步应用题在iPad上会撑爆)');

// ===== v19.89: 英语题库补 AL1 难度 + 清死库存 =====
{
  const G = W.GRAMMAR_QUESTIONS || [], C = W.CLOZE_QUESTIONS || [], S2 = W.SST_QUESTIONS || [];
  [['GRAMMAR', G], ['CLOZE', C], ['SST', S2]].forEach(([n, bank]) => {
    const dead = bank.filter(q => (q.diff || 4) <= 2).length;
    assert(dead === 0, `v19.89: ${n} 无 d1-d2 死库存 (minFloor=4 时这些题永远抽不到, 白占位置; 残留 ${dead})`);
    const hard = bank.filter(q => (q.diff || 0) >= 5).length;
    assert(hard >= 40, `v19.89: ${n} 有 ≥40 道 d5/d6 拉分题 (实际 ${hard}) — 冲 AL1 不能只在 d4 打转`);
  });
  assert(W._gameMaxCap('grammar') === 6 && W._gameMaxCap('cloze') === 6 && W._gameMaxCap('sst') === 6,
    `v19.89: 三个英语库都能升到 Lv6 (原来 grammar/cloze/sst 只到 Lv5, 顶格档题不够会静默发简单题)`);
}

// ===== v19.90: 英语题库 6 处硬伤 (教研审计: 这些在教错知识) =====
{
  const S3 = W.SST_QUESTIONS || [], C3 = W.CLOZE_QUESTIONS || [], G3 = W.GRAMMAR_QUESTIONS || [];
  // too...to: 不定式宾语与主句主语同指时必须省略, 原答案带 him 正好教反了 PSLE 判分点
  const redundant = S3.filter(q => /\btoo\b[^]*for (anyone|me|us|him|her|them) to \w+ (it|him|her|them|us)\b/.test(String(q.opts[q.ans])));
  assert(redundant.length === 0, `v19.90: SST 无 "too...to + 多余宾语" 的错误答案 (残留 ${redundant.length}) — 这是全国最高频失分点, 原来教反了`);
  // 只差一对"成对逗号"的双正确答案 (限定性/非限定性两种都合法)
  const balanced = s => { const t = String(s); const c = (t.match(/,/g) || []).length; return c === 2 || c === 0; };
  let dbl = 0;
  const norm = s => String(s).replace(/,/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  S3.forEach(q => {
    const a = q.opts[q.ans];
    q.opts.forEach((o, k) => { if (k !== q.ans && norm(o) === norm(a) && balanced(o) && balanced(a)) dbl++; });
  });
  assert(dbl === 0, `v19.90: SST 无"只差一对逗号所以两个都对"的题 (残留 ${dbl}) — 限定性/非限定性定语从句两种写法都合法`);
  assert(!C3.some(q => (q.opts || []).some(o => /reckessly/.test(o))), 'v19.90: Cloze 干扰项拼写已修 (拼错的干扰项等于送分)');
  assert(!G3.some(q => /Were it not for/.test(String(q.q))), 'v19.90: 删掉倒装虚拟语气题 (中学内容, 且原句时态混搭不干净)');
}

// ===== v19.91: 掌握判定 答对1次 → 连对2次 =====
{
  const pool = W.GRAMMAR_QUESTIONS, st = {};
  const q = pool[0];
  W._markMastered('grammar', pool, q); W._saveMastered(st);
  assert(!(st.masteredQs.grammar || []).includes(0), 'v19.91: 答对1次不算掌握 (原来一次就永久移出题池, 顶格档一局刷空后只能发"换选项顺序的变体")');
  W._markMastered('grammar', pool, q); W._saveMastered(st);
  assert((st.masteredQs.grammar || []).includes(0), 'v19.91: 连对2次才算掌握');
  const q2 = pool[1];
  W._markMastered('grammar', pool, q2); W._resetMasteredHit('grammar', pool, q2);
  W._markMastered('grammar', pool, q2); W._saveMastered(st);
  assert(!(st.masteredQs.grammar || []).includes(1), 'v19.91: 中间答错要重新连对 (掌握必须连续, 不是累计)');
}
assert(/window\._resetMasteredHit\(/.test(appSrc), 'v19.91: 答错清零已接入 mcq 游戏 (防死代码)');
assert(!/\[\.\.\.q\.opts\]\.sort\(\(\) => Math\.random\(\) - 0\.5\)/.test(dataSrcV80), 'v19.91: 变体生成也换成真随机洗牌');

// ===== v19.92: 阅读理解问答扩充 + Editing引擎修复 + 考试格式事实纠错 =====
{
  const P = W.COMP_OE_PASSAGES || [];
  const long = P.filter(p => (p.wordCount || 0) >= 350).length;
  assert(long >= 10, `v19.92: 有 ≥10 篇 PSLE 真实篇幅(350-450词)阅读 (实际 ${long}; 原来20篇全是100-220词, 只有真考一半, 跨段找线索的题产不出来)`);
  const m3 = P.reduce((a, p) => a + (p.questions || []).filter(q => (q.marks || 0) >= 3).length, 0);
  assert(m3 >= 20, `v19.92: 有 ≥20 道 3分题 (实际 ${m3}; 原来 0 道 — 而"3分=3个独立point"正是孩子丢分的地方)`);
  const badModel = P.filter(p => (p.questions || []).some(q => ((String(q.model || '').match(/\(1m\)/g) || []).length) > (q.marks || 0)));
  assert(badModel.length === 0, `v19.92: model 里的 (1m) 采分点数不超过 marks (异常 ${badModel.length} 篇)`);
}
{
  // Editing 死锁: errors 首词重复时, 按"词"去重的 Set 永远凑不满 → 孩子卡死通不了关
  const EP = W.EDITING_PARAGRAPHS || [];
  const keyOf = w => String(w).split(' ')[0].replace(/[.,!?;:]$/, '');
  const dead = EP.filter(p => new Set(p.errors.map(e => keyOf(e.word))).size < p.errors.length).length;
  assert(dead === 3, `v19.92: 已知 ${dead} 段错词首词重复 — 引擎改按位置下标记录后不再死锁 (下面断言保证)`);
  assert(/const _egErrIdx = para\.errors\.map/.test(appSrc), 'v19.92: Editing 按"词的位置下标"建索引 (修死锁+修25处歧义点击)');
  assert(/clickEditingWord\(idx\)/.test(appSrc) && !/errWords/.test(appSrc), 'v19.92: 点击判定改用下标, 旧的按词匹配已清');
  assert(!/recordGameRun\(state, 'editing', 5, 5\)/.test(appSrc), 'v19.92: Editing 难度按真实表现记 (原来恒传5/5=每局100%, 难度只升不降)');
}
{
  // 考试格式: 正确答案原来被当成干扰项
  const KP2 = W.KNOWLEDGE_PRACTICE;
  const sci0 = (KP2.sci_psle || [])[0];
  assert(sci0 && /1 小时 45 分/.test(sci0.opts[sci0.ans]), 'v19.92: 科学卷时长改为 1h45min (原写 1h15min, 而正确的 1h45 被列为错误选项)');
  const m0 = (KP2.math_psle_paper1 || [])[0];
  assert(m0 && /1 小时/.test(m0.opts[m0.ans]), 'v19.92: 数学 Paper1 时长修正 (原写 50min, 正确答案被当干扰项)');
  const gst = (W.MATH_QUESTIONS || []).find(q => /GST 9%/.test(String(q.q)));
  assert(gst && Math.abs(gst.ans - 272.5) < 0.001, `v19.92: GST 题答案 272.5 不是 273 (判分容差0.005, 原来孩子算对反被判错)`);
  assert(!(W.SCIENCE_MCQ || []).some(q => (q.opts || []).some(o => /Both A and B/i.test(o))), 'v19.92: 删掉自指选项"Both A and B" (洗牌后A/B指向别的选项, 认真读题反而排除掉正确答案)');
}
assert(/white-space: pre-wrap/.test(idxSrc), 'v19.92: 阅读原文保留段落 (跨段整合题靠段落结构训练)');
assert(/点开回看原文/.test(appSrc), 'v19.92: 每题都能回看原文 (原来只第1题显示, 后5题等于逼他背文章)');

// ===== v19.93: 解析不再用 A/B/C/D 指代选项 (渲染时每次洗牌, 位置引用天生 3/4 概率指错) =====
{
  const KT4 = W.KNOWLEDGE_TREE, KP4 = W.KNOWLEDGE_PRACTICE;
  // 只算"字母 + 描述选项的字"这种真引用; 排除 25°C / A管 / Booklet A 这类题目内容
  const re = /(?:^|[^A-Za-z°])([ABCD])\s*(?:项|选项|的)?\s*[是把写答只等太全没有角度两]/;
  const bad = [];
  Object.keys(KT4).forEach(s => KT4[s].forEach(n => (KP4[n.id] || []).forEach((q, i) => {
    if (re.test(String(q.explain || ''))) bad.push(n.id + '#' + i);
  })));
  assert(bad.length === 0, `v19.93: 知识树解析无"点名选项字母"的写法 (残留 ${bad.length}${bad.length ? ': ' + bad.slice(0, 4).join(',') : ''}) — 渲染时 _fyShuffle 每次重洗选项, 任何位置引用都会把孩子选对的说成错的`);
  // 改写后的解析必须引用选项原文(用「」括起来)
  const quoted = [];
  ['ch_comp_oe', 'ch_comp_mcq', 'ch_composition', 'ch_listening', 'eng_writing', 'eng_oral'].forEach(id => {
    (KP4[id] || []).forEach((q, i) => { if (/「[^」]+」/.test(String(q.explain || ''))) quoted.push(id + '#' + i); });
  });
  assert(quoted.length >= 25, `v19.93: 重写后的解析改成引用选项原文「…」(实际 ${quoted.length} 条)`);
}

// ===== v19.93b: mini-game 题库解析也去位置引用 + 清超纲/双答案 =====
{
  const banks = { SST_QUESTIONS: W.SST_QUESTIONS, GRAMMAR_QUESTIONS: W.GRAMMAR_QUESTIONS, CLOZE_QUESTIONS: W.CLOZE_QUESTIONS, CHINESE_MCQ: W.CHINESE_MCQ };
  // 只抓"序号引用"和"字母+描述词"这种真指代; 排除 John/PSLE/100°C 这类内容里的大写字母
  const re2 = /第[一二三四1234]项|(?:^|[^A-Za-z])([ABCD])\s*(?:项|选项)?\s*[是把写答选错对少漏用]/;
  const bad = [];
  Object.entries(banks).forEach(([n, b]) => (b || []).forEach((q, i) => {
    if (re2.test(String(q.explain || q.exp || ''))) bad.push(n + '#' + i);
  }));
  assert(bad.length === 0, `v19.93b: 题库解析无位置引用 (残留 ${bad.length}${bad.length ? ': ' + bad.slice(0, 3).join(',') : ''})`);
  const quoted = (W.SST_QUESTIONS || []).filter(q => /「[^」]+」/.test(String(q.explain || ''))).length;
  assert(quoted >= 100, `v19.93b: SST 解析改成引用选项原文 (实际 ${quoted} 条 — 原来 59/124 用"第X项", 期望75%的对局会把孩子选对的说成错的)`);
}
{
  const M2 = W.MATH_QUESTIONS || [], S4 = W.SCIENCE_MCQ || [], KP5 = W.KNOWLEDGE_PRACTICE;
  const off = M2.filter(q => /三角形三边 5,\s*12,\s*13|正八边形|甲\s*\d+\s*天\s*乙|÷\s*7\s*余|梯形/.test(String(q.q)));
  assert(off.length === 0, `v19.93b: 数学库无勾股/正多边形/工程问题/数论余数/梯形 (全是中学或奥数内容; 残留 ${off.length})`);
  const offS = S4.filter(q => /lever|mechanical advantage|in parallel, the total current/i.test(String(q.q)));
  assert(offS.length === 0, `v19.93b: 科学库无杠杆/并联电流定量 (中学内容; 残留 ${offS.length})`);
  const treeOff = ['math_area_perimeter', 'math_vol_3d'].flatMap(n => (KP5[n] || []).filter(q => /梯形|平行四边形|圆柱/.test(String(q.q))));
  assert(treeOff.length === 0, `v19.93b: 知识树无梯形/平行四边形/圆柱面积体积题 (残留 ${treeOff.length})`);
  assert(!(W.CLOZE_QUESTIONS || []).some(q => /After he ___ his homework/.test(String(q.sentence || ''))), 'v19.93b: 换掉 after+过去完成时那道双答案题 (finished 和 had finished 都成立)');
}

// ===== v19.94: 换掉"干扰项其实也对"的题 (孩子选了合法英语却被判错) =====
{
  const S5 = W.SST_QUESTIONS || [];
  const valid = ['So boring was the film that we all fell asleep.', 'Although rich, he is not happy.',
                 'No other pupils in her class are as hardworking as Meiling.', 'The food was delicious, although very expensive.'];
  const still = S5.filter(q => (q.opts || []).some(o => valid.includes(String(o))));
  assert(still.length === 0, `v19.94: 已换掉 4 个本身合法的干扰项(倒装/省略让步从句/复数版比较) — 孩子选了会被冤枉判错 (残留 ${still.length})`);
}

// ===== v19.96: 结构性体检 — 原来的 QA 只查"有没有"不查"对不对", 这轮所有硬伤它一个都没拦住 =====
{
  const allBanks = {
    GRAMMAR_QUESTIONS: W.GRAMMAR_QUESTIONS, CLOZE_QUESTIONS: W.CLOZE_QUESTIONS, SST_QUESTIONS: W.SST_QUESTIONS,
    MATH_QUESTIONS: W.MATH_QUESTIONS, SCIENCE_MCQ: W.SCIENCE_MCQ, CHINESE_MCQ: W.CHINESE_MCQ
  };
  // ① 选项结构合法: 恰4项、无重复、ans 越界
  const structBad = [];
  Object.entries(allBanks).forEach(([n, b]) => (b || []).forEach((q, i) => {
    if (!q.opts) return;                       // 数学是填空题, 无 opts
    if (q.opts.length !== 4) structBad.push(n + '#' + i + '(选项' + q.opts.length + '个)');
    else if (new Set(q.opts.map(String)).size !== 4) structBad.push(n + '#' + i + '(选项重复)');
    else if (typeof q.ans !== 'number' || q.ans < 0 || q.ans > 3) structBad.push(n + '#' + i + '(ans越界)');
  }));
  assert(structBad.length === 0, `v19.96: 所有选择题恰4个不重复选项且 ans 合法 (异常 ${structBad.length}${structBad.length ? ': ' + structBad.slice(0, 3).join(',') : ''})`);

  // ② "只差标点/空格就相同"的双答案 (限定性vs非限定性那类)
  const norm = s => String(s).replace(/[,，.。\s]/g, '').toLowerCase();
  const dbl = [];
  Object.entries(allBanks).forEach(([n, b]) => (b || []).forEach((q, i) => {
    if (!q.opts || typeof q.ans !== 'number') return;
    const a = norm(q.opts[q.ans]);
    // 逗号"成对"才算真的两种合法写法; 逗号不成对(如只有左逗号)本身就是错句, 是合法干扰项
    const balanced = s => { const c2 = (String(s).match(/[,，]/g) || []).length; return c2 === 0 || c2 === 2; };
    q.opts.forEach((o, k) => { if (k !== q.ans && norm(o) === a && balanced(o) && balanced(q.opts[q.ans])) dbl.push(n + '#' + i); });
  }));
  assert(dbl.length === 0, `v19.96: 无"只差一对成对逗号所以两个都对"的题 (实际 ${dbl.length}${dbl.length ? ': ' + dbl.slice(0, 4).join(',') : ''})`);

  // ③ 解析里的「」引用必须真的存在于该题选项 (防"僵尸解析"点评已被换掉的选项)
  // 只查"含英文字母"的引用 —— 那才是在引英文选项原文;
  // 纯中文的「」多半是释义(如 must 的意思「必须先做完作业才能玩」), 不是选项指代
  let ghost = 0, quoted = 0;
  const ghostList = [];
  Object.entries(allBanks).forEach(([n, b]) => (b || []).forEach((q, i) => {
    if (!q.opts) return;
    [...String(q.explain || '').matchAll(/「([^」]{4,})」/g)].forEach(m => {
      const t = m[1].replace(/[…\.]+$/, '').trim();
      if (!/[A-Za-z]{3}/.test(t)) return;      // 纯中文释义, 跳过
      quoted++;
      if (!q.opts.some(o => String(o).includes(t) || t.includes(String(o).slice(0, 20)))) { ghost++; ghostList.push(n + '#' + i); }
    });
  }));
  assert(quoted > 100 && ghost / quoted < 0.05, `v19.96: 解析引用的英文选项原文都真实存在 (${quoted} 处引用, 对不上 ${ghost} 处${ghost ? ': ' + ghostList.slice(0, 3).join(',') : ''}) — 防"僵尸解析"点评已被换掉的选项`);

  // ④ 数学答案格式: 钱数不能被擅自取整成假答案
  const badMoney = (W.MATH_QUESTIONS || []).filter(q => /\$|GST|折|价/.test(String(q.q)) && typeof q.ans === 'number'
    && /≈|约等于/.test(String(q.explain || '')));
  assert(badMoney.length === 0, `v19.96: 钱数题的答案不是四舍五入来的 (异常 ${badMoney.length}) — 判分容差 0.005, 存了取整值会把算对的孩子判错`);
}

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
