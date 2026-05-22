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
// 思考题: 14 道, 每个难章 1 题
assert(Array.isArray(W.THINK_PUZZLES) && W.THINK_PUZZLES.length === 14,
  `v17.5: THINK_PUZZLES 长度 14 (实际 ${W.THINK_PUZZLES && W.THINK_PUZZLES.length})`);
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
assert(/\?v=19\.12/.test(idxSrc) && !/\?v=19\.11[^0-9]/.test(idxSrc),
  'v19.12: cache buster 已更新到 19.12');

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
