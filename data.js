/**
 * 数据存储 + 规则引擎 (v2)
 * v2 新增:每日打卡 (state.daily) + 周完成率分析
 * 当前用 localStorage,后续可以替换为 Firebase
 */

// ============= 26 周日期映射 =============
const WEEK_DATES = [
  '5.4-5.10', '5.11-5.17', '5.18-5.24', '5.25-5.31',
  '6.1-6.7', '6.8-6.14', '6.15-6.21', '6.22-6.28',
  '6.29-7.5', '7.6-7.12', '7.13-7.19', '7.20-7.26',
  '7.27-8.2', '8.3-8.9', '8.10-8.16', '8.17-8.23',
  '8.24-8.30', '8.31-9.6', '9.7-9.13', '9.14-9.20',
  '9.21-9.27', '9.28-10.4', '10.5-10.11', '10.12-10.18',
  '10.19-10.25', '10.26-11.1'
];

const WEEK_THEMES = [
  'P3 Diversity 速览', 'P3 Plant Life Cycle', 'P3 Animal Life Cycle', 'P3 Plant Parts + 整合',
  'P4 Plant Transport ⭐ (1/2)', 'P4 Plant Transport ⭐ (2/2)', 'P4 Digestive ⭐⭐ (1/2)', 'P4 Digestive ⭐⭐ (2/2)',
  'P4 Matter + Mass/Volume', 'P4 Light & Shadow ⭐ (1/2)', 'P4 Light & Shadow ⭐ (2/2)', 'P4 Heat ⭐⭐ (1/2)',
  'P4 Heat ⭐⭐ (2/2)', 'P4 Magnets + P3-P4 综合 🎯', 'P5 启动: Reproduction', 'P5 Cells + Energy',
  'P5 Water + Air', 'P5 Forms of Energy', 'P5 Energy Conversions', 'P5 Electricity ⭐',
  'P5 Series & Parallel ⭐', 'P5 综合复习 1', 'P5 综合复习 2', 'P5 综合卷模拟',
  'P5 整体串讲', '🎯 第一阶段总模考'
];

// 关键里程碑周
const KEY_WEEKS = [4, 8, 12, 14, 20, 26];

// 完成率达标阈值:周完成率 ≥80% → 拿到 +5 周复盘分
const WEEKLY_REVIEW_THRESHOLD = 0.80;
const WEEKLY_REVIEW_POINTS = 5;

// v4 — 两层加分体系:
// A. 时长加权 slot 分:段3=1, 段1/2=2, 周末 AM/PM=3;难章周(⭐)所有 slot +1 baseline
// B. 必做关键 slot:难章 🔬 教材精读/概念图/实验/综合测试 自动标记;不做 → 周完成 80% 不发 +5 复盘奖
const DAY_COMBO_POINTS = 5;
const KEY_SLOT_KEYWORDS = /教材精读|概念图|实验|开放题|综合测试|高频题型|总模考|模考|限时|Synthesis|周诊断/;

// 时长基底 + 难章周 +1
function slotPoints(weekNum, slotKey) {
  const w = WEEK_TASKS[weekNum - 1];
  const isHard = w && w.theme.includes('⭐');
  // v14: AM/PM 大块=3, E1/S2 1h=2, VB 30min=1, OR/VC/LS/ED 短=1
  const base =
    (slotKey === 'AM' || slotKey === 'PM') ? 3 :
    (slotKey === 'E1' || slotKey === 'S2') ? 2 :
    1;  // OR/VC/LS/ED/VB 一律 1 分(短任务)
  return base + (isHard ? 1 : 0);
}

// 兼容老 API:仅返回当前周难度状态(部分 UI 仍在用)
function slotPointsForWeek(weekNum) {
  const w = WEEK_TASKS[weekNum - 1];
  if (!w) return 1;
  return w.theme.includes('⭐') ? 2 : 1;
}

// 关键 slot:难章周 🔬 + 关键词;模考周里所有 模考/综合卷/总模考 也算
function isKeySlot(weekNum, dayKey, slotKey) {
  const w = WEEK_TASKS[weekNum - 1];
  if (!w) return false;
  const task = (w.days[dayKey] && w.days[dayKey][slotKey]) || '';
  if (!task) return false;
  // 难章周:🔬 + 关键深度词
  if (w.theme.includes('⭐') && task.startsWith('🔬') && KEY_SLOT_KEYWORDS.test(task)) return true;
  // 任何周里的"模考"/"总模考"/"综合卷"/"限时" → 关键
  if (/总模考|限时.*模拟|综合模拟卷|科学总模考|英语模考/.test(task)) return true;
  return false;
}

function listKeySlots(weekNum) {
  const w = WEEK_TASKS[weekNum - 1];
  if (!w) return [];
  const result = [];
  for (const day of DAY_KEYS) {
    for (const slot of Object.keys(w.days[day] || {})) {
      if (isKeySlot(weekNum, day, slot)) {
        result.push({ day, slot, task: w.days[day][slot] });
      }
    }
  }
  return result;
}

// 该周关键 slot 是否全部完成
function allKeySlotsDone(weekNum, state) {
  const keys = listKeySlots(weekNum);
  if (keys.length === 0) return true;
  return keys.every(k => getDailyCheck(state, weekNum, k.day, k.slot));
}

function isDayComplete(state, weekNum, dayKey) {
  const tasks = (WEEK_TASKS[weekNum - 1] && WEEK_TASKS[weekNum - 1].days[dayKey]) || {};
  const slots = Object.keys(tasks);
  if (slots.length === 0) return false;
  return slots.every(s => getDailyCheck(state, weekNum, dayKey, s));
}


// ============= Slot 时间表 =============
const SLOT_TIME = {
  AM: '上午 9:00-12:00 (周末)',
  PM: '下午 14:00-19:30 (周六)',
  E1: '16:30-17:30 英语主项 (1h)',
  OR: '17:30-17:55 Oral 口语 (25min)',
  VC: '18:10-18:25 学科词汇 (15min)',
  LS: '19:00-19:10 听力 (10min)',
  ED: '19:30-19:48 Editing (18min)',
  S2: '20:00-21:00 段2 主科目 (1h)',
  VB: '21:00-21:30 Vocab/华文 (30min)'
};

const DAY_LABELS = {
  Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四',
  Fri: '周五', Sat: '周六', Sun: '周日'
};
const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ============= 26 周每日任务表 (从 PSLE 备考手册 v9 提取) =============
const WEEK_TASKS = [{"week":1,"date":"5.4-5.10","theme":"P3 Diversity(动+植+材料)— 易章速览","goal":"里程碑:P3 Diversity 三章过完,确认基础概念","days":{"Mon":{"E1":"📖 Comprehension P5 第 1","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数学几何与测量 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 动物分类(脊椎/无脊椎)","VB":"📚 Vocabulary U1"},"Tue":{"E1":"✏️ Grammar U1+Editing 1","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 植物分类(花/无花植物)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文计划","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 几何与测量拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 材料(分类+ 性质)","VB":"📚 Vocabulary U2"},"Thu":{"E1":"📖 Cloze 5 第 1","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 Diversity 章节小测","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ P5 难题","VB":"📋 W2 准备"},"Sat":{"AM":"🔬 补习(分类整理表)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":2,"date":"5.11-5.17","theme":"P3 Plant Life Cycle — 中等节奏","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 2","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数学数与运算 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 种子结构(seed coat/embryo)","VB":"📚 Vocabulary U3"},"Tue":{"E1":"✏️ Grammar U2+Editing 3","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 萌发条件(水+空气+温度)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数与运算拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 生长阶段(seedling→m ature)","VB":"📚 Vocabulary U4"},"Thu":{"E1":"📖 Cloze 第 2","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 Conquer Daily + 概念图","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W3 准备"},"Sat":{"AM":"🔬 补习 / 章节小测","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":3,"date":"5.18-5.24","theme":"P3 Animal Life Cycle — 中等节奏","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 3","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数学比与比例 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 蝴蝶 4 阶段(完全变态)","VB":"📚 Vocabulary U5"},"Tue":{"E1":"✏️ Grammar U3+Editing 5","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 蛙类 4 阶段(蝌蚪→青蛙)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 比与比例拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 鸡(无变态)/ 蟑螂(不完全变态)","VB":"📚 Vocabulary U6"},"Thu":{"E1":"📖 Cloze 第 3","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 4 类动物对比表","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W4 准备"},"Sat":{"AM":"🔬 补习 / 章节小测","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":4,"date":"5.25-5.31","theme":"P3 Plant Parts + P3 整合测试","goal":"W4 月评估:P3 全部完成,准备进入 P4 难章","days":{"Mon":{"E1":"📖 Comprehension P5 第 4","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数学数据统计 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 根/茎/叶功能","VB":"📚 Vocabulary U7"},"Tue":{"E1":"✏️ Grammar U4+Editing 7","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 花/果实/种子功能","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数据统计拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 P3 整章思维导图","VB":"📚 Vocabulary U8"},"Thu":{"E1":"📖 Cloze 第 4","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 P3 综合练习","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W5 准备(进 P4 难章!)"},"Sat":{"AM":"🔬 P3 综合测试 + 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":5,"date":"6.1-6.7","theme":"P4 Plant Transport ⭐ — 难章第 1 周(概念建立)","goal":"⭐ 难章第 1 周:概念建立,不急刷题","days":{"Mon":{"E1":"📖 Comprehension P5 第 5","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数学运算动词 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 教材精读(运输系统结构)","VB":"📚 Vocabulary U9"},"Tue":{"E1":"✏️ Grammar U5+Editing 9","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 教材精读(xylem 运水)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 运算动词拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 芹菜染色实验分析","VB":"📚 Vocabulary U10"},"Thu":{"E1":"📖 Cloze 第 5","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 概念图(英文术语)","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W6 准备(深化)"},"Sat":{"AM":"🔬 补习(Plant Transport 概念)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":6,"date":"6.8-6.14","theme":"P4 Plant Transport ⭐ — 难章第 2 周(深化应用)","goal":"⭐ Plant Transport 收官:确认能独立应对开放题","days":{"Mon":{"E1":"📖 Comprehension P5 第 6","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数学综合复习 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 高频题型练习","VB":"📚 Vocabulary U11"},"Tue":{"E1":"✏️ Grammar U6+Editing 11","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 开放题专项(关键词)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 综合复习拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 实验设计题专项","VB":"📚 Vocabulary U12"},"Thu":{"E1":"📖 Cloze 第 6","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 章节综合测试","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W7 准备"},"Sat":{"AM":"🔬 综合测试 + 错题分析","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":7,"date":"6.15-6.21","theme":"P4 Digestive System ⭐⭐ — 难章第 1 周","goal":"⭐⭐ Digestive 第 1 周:完整路径必须烂熟","days":{"Mon":{"E1":"📖 Comprehension P5 第 7","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 数学错题回看 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 口腔/食道(化学+物理消化)","VB":"📚 Vocabulary U13"},"Tue":{"E1":"✏️ Grammar U7+Editing 13","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 胃(胃酸+蛋白消化)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 错题回看拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 小肠(吸收营养)+ 大肠(吸水)","VB":"📚 Vocabulary U14"},"Thu":{"E1":"📖 Cloze 第 7","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 完整消化路径流程图","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W8 准备(深化)"},"Sat":{"AM":"🔬 补习(Digestive 概念)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":8,"date":"6.22-6.28","theme":"P4 Digestive System ⭐⭐ — 难章第 2 周","goal":"⭐⭐ Digestive 收官 + W8 月评估","days":{"Mon":{"E1":"📖 Comprehension P5 第 8","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学物质三态 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 PSLE 高频题型(消化路径)","VB":"📚 Vocabulary U15"},"Tue":{"E1":"✏️ Grammar U8+Editing 15","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 营养素(糖/ 蛋白/脂)消化对应","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 物质三态拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 实验题(酶活性)+ 开放题","VB":"📚 Vocabulary U16"},"Thu":{"E1":"📖 Cloze 第 8","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 章节综合测试","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W9 准备"},"Sat":{"AM":"🔬 综合测试 + 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":9,"date":"6.29-7.5","theme":"P4 Matter + Mass/Volume — 易章速览","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 9","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学力与运动 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 三态 + 状态变化(P5 复习)","VB":"📚 Vocabulary U17"},"Tue":{"E1":"✏️ Grammar U9+Editing 17","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 Mass vs Volume 区分","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 力与运动拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 Conquer Daily 实验题(测量)","VB":"📚 Vocabulary U18"},"Thu":{"E1":"📖 Cloze 第 9","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 Matter+M/V 章节小测","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W10 准备(进难章)"},"Sat":{"AM":"🔬 补习 / 自学错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":10,"date":"7.6-7.12","theme":"P4 Light & Shadow ⭐ — 难章第 1 周","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 10","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学热温度 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 光源 + 直线传播","VB":"📚 Vocabulary U19"},"Tue":{"E1":"✏️ Grammar U10+Editing 19","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 反射 + 镜面 vs 漫反射","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 热温度拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 影子形成原理 + 实验","VB":"📚 Vocabulary U20"},"Thu":{"E1":"📖 Cloze 第 10","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 不透明/半透明/透明对比","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W11 准备"},"Sat":{"AM":"🔬 补习(光学概念)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":11,"date":"7.13-7.19","theme":"P4 Light & Shadow ⭐ — 难章第 2 周","goal":"⭐ Light 收官:实验题答题模板熟练","days":{"Mon":{"E1":"📖 Comprehension P5 第 11","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学光与影 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 影子大小 vs 光源距离","VB":"📚 Vocabulary U21"},"Tue":{"E1":"✏️ Grammar U11+Editing 21","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 影子方向 vs 光源位置","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 光与影拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 实验设计题专项","VB":"📚 Vocabulary U22"},"Thu":{"E1":"📖 Cloze 第 11","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 章节综合测试","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W12 准备"},"Sat":{"AM":"🔬 综合测试 + 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":12,"date":"7.20-7.26","theme":"P4 Heat Energy ⭐⭐ — 难章第 1 周","goal":"⭐⭐ Heat 第 1 周:三种热传递必须区分清晰","days":{"Mon":{"E1":"📖 Comprehension P5 第 12","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学电 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 温度 vs 热(区分)","VB":"📚 Vocabulary U23"},"Tue":{"E1":"✏️ Grammar U12+Editing 23","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 热传导(良导体/绝缘体)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 电拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 对流(流体) + 辐射(无介质)","VB":"📚 Vocabulary U24"},"Thu":{"E1":"📖 Cloze 第 12","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 热膨胀冷缩(实验)","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W13 准备"},"Sat":{"AM":"🔬 补习(Heat 概念)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":13,"date":"7.27-8.2","theme":"P4 Heat Energy ⭐⭐ — 难章第 2 周","goal":"⭐⭐ Heat 收官 + 难章全部完成","days":{"Mon":{"E1":"📖 Comprehension P5 第 13","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学植物生命 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 PSLE 高频题型(Heat)","VB":"📚 Vocabulary U25"},"Tue":{"E1":"✏️ Grammar U13+Editing 25","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 开放题专项(为什么/解释)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 植物生命拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 综合应用题(三种传递混合)","VB":"📚 Vocabulary U26"},"Thu":{"E1":"📖 Cloze 第 13","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 章节综合测试","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W14 准备(收尾)"},"Sat":{"AM":"🔬 综合测试 + 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":14,"date":"8.3-8.9","theme":"P4 Magnets + P3-P4 综合模拟卷 🎯","goal":"🎯🎯 第一阶段收官:P3-P4 综合模拟卷 + 大复盘","days":{"Mon":{"E1":"📖 Comprehension P5 第 14","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学动物人体 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 磁体属性 + 磁极相吸相斥","VB":"📚 Vocabulary U27"},"Tue":{"E1":"✏️ Grammar U14+Editing 27","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 磁性材料 + 磁化","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 动物人体拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 磁场 + 应用题","VB":"📚 Vocabulary U28"},"Thu":{"E1":"📖 Cloze 第 14","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 Magnets 章节小测","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W15 准备(P5 收尾)"},"Sat":{"AM":"🔬 P3-P4 综合模拟卷(限时 1h45min)+ 错题分析","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":15,"date":"8.10-8.16","theme":"P5 启动:Reproduction","goal":"W15 启动 P5 系统提升期","days":{"Mon":{"E1":"📖 Comprehension P5 第 15","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 科学生态环境 30 词领读","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 Plant Reproduction (植物繁殖)","VB":"📚 Vocabulary 6 U1"},"Tue":{"E1":"✏️ Grammar U15+Editing 29","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Human Reproduction","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 生态环境拼写 + 用法测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Reproduction 配套练习","VB":"📚 Vocabulary 6 U2"},"Thu":{"E1":"📖 Cloze 第 15","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 vs P3- P4 衔接整理","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W16 准备"},"Sat":{"AM":"🔬 补习(P5 启动)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":16,"date":"8.17-8.23","theme":"P5 Cells + Energy from Food","goal":"Vocab 5 完成 ✅","days":{"Mon":{"E1":"📖 Comprehension P5 第 16","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 科学实验科学方法 30 词领读","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Cells 结构(植物 vs 动物)","VB":"📚 Vocabulary 6 U3"},"Tue":{"E1":"✏️ Grammar U16+Editing 31","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 食物链 + 食物网","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 实验科学方法拼写 + 用法测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Cells 配套练习","VB":"📚 Vocabulary 6 U4"},"Thu":{"E1":"📖 Cloze 第 16","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Energy from Food 续","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W17 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":17,"date":"8.24-8.30","theme":"P5 Water + Air & Weather","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 17","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 科学综合复习 30 词领读","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 水循环深化","VB":"📚 Vocabulary 6 U5"},"Tue":{"E1":"✏️ Grammar U17+Editing 33","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Air 组成 + 气压","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 综合复习拼写 + 用法测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Weather 类型 + 测量","VB":"📚 Vocabulary 6 U6"},"Thu":{"E1":"📖 Cloze 第 17","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Water/Air 综合练习","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W18 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":18,"date":"8.31-9.6","theme":"P5 Forms of Energy","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 18","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Kinetic + Potential Energy","VB":"📚 Vocabulary 6 U7"},"Tue":{"E1":"✏️ Grammar U18+Editing 35","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Sound + Electrical","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Energy 综合分类","VB":"📚 Vocabulary 6 U8"},"Thu":{"E1":"📖 Cloze 第 18","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Energy 配套练习","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W19 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":19,"date":"9.7-9.13","theme":"P5 Energy Conversions","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 19","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 能量转换例子(灯泡/风扇/ 太阳能)","VB":"📚 Vocabulary 6 U9"},"Tue":{"E1":"✏️ Grammar U19+Editing 37","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Sources(可再生 vs 不可再生)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Energy efficiency 概念","VB":"📚 Vocabulary 6 U10"},"Thu":{"E1":"📖 Cloze 第 19","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 综合练习","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W20 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":20,"date":"9.14-9.20","theme":"P5 Electricity 基础 ⭐","goal":"⭐ Electricity 是 PSLE 高频考点,重点掌握","days":{"Mon":{"E1":"📖 Comprehension P5 第 20","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 电流/电压/ 电阻基础","VB":"📚 Vocabulary 6 U11"},"Tue":{"E1":"✏️ Grammar U20+Editing 39","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 简单电路(电池+灯+开关)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 导体 vs 绝缘体 + 安全","VB":"📚 Vocabulary 6 U12"},"Thu":{"E1":"📖 Cloze 第 20","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 电路图实操","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W21 准备"},"Sat":{"AM":"🔬 补习(电学重点)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":21,"date":"9.21-9.27","theme":"P5 Series & Parallel 电路 ⭐","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 21","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 串联电路特点(电流相同/电压分配)","VB":"📚 Vocabulary 6 U13"},"Tue":{"E1":"✏️ Grammar U21+Editing 41","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 并联电路特点","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 串并联综合题","VB":"📚 Vocabulary 6 U14"},"Thu":{"E1":"📖 Cloze 第 21","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 PSLE 电路题专项","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W22 准备"},"Sat":{"AM":"🔬 补习(电路深化)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":22,"date":"9.28-10.4","theme":"P5 综合复习 1","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 22","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 Cycles 总复习","VB":"📚 Vocabulary 6 U15"},"Tue":{"E1":"✏️ Grammar U22+Editing 43","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 Systems 总复习","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 综合卷 1","VB":"📚 Vocabulary 6 U16"},"Thu":{"E1":"📖 Cloze 第 22","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 综合卷错题分析","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W23 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":23,"date":"10.5-10.11","theme":"P5 综合复习 2","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 23","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 Energy 总复习","VB":"📚 Vocabulary 6 U17"},"Tue":{"E1":"✏️ Grammar U23+Editing 45","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 Electricity 总复习","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 综合卷 2","VB":"📚 Vocabulary 6 U18"},"Thu":{"E1":"📖 Cloze 第 23","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 综合卷错题","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W24 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":24,"date":"10.12-10.18","theme":"P5 综合卷模拟 + 弱项回填","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 24","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 综合卷 1(限时)","VB":"📚 Vocabulary 6 U19"},"Tue":{"E1":"✏️ Grammar U24+Editing 47","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 综合卷 1 错题分析","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 弱项章节回填","VB":"📚 Vocabulary 6 U20"},"Thu":{"E1":"📖 Cloze 第 24","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 综合卷 2(限时)","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W25 准备"},"Sat":{"AM":"🔬 综合卷 2 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":25,"date":"10.19-10.25","theme":"P5 整体串讲 + Visual Text 启动","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 25","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 整体串讲(联系 P3- P4)","VB":"📚 Vocabulary 6 U21"},"Tue":{"E1":"✏️ Grammar U25+Editing 49","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 弱项专项练习","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 PSLE 题型熟悉(开放题)","VB":"📚 Vocabulary 6 U22"},"Thu":{"E1":"📖 Cloze 第 25 + Visual Text 6 第 1 套","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 实验题专项","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W26 准备(总模考)"},"Sat":{"AM":"🔬 综合练习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":26,"date":"10.26-11.1","theme":"🎯 第一阶段总模考","goal":"🎯🎯 第一阶段总模考(W26)— 26 周收官 + W27 进入第二阶段","days":{"Mon":{"E1":"📖 英语模考 Paper 1+2","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 科学总模考(限时 1h45min)","VB":"📚 Vocabulary 6 U23"},"Tue":{"E1":"📖 英语错题分析","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 模考全卷讲评 + 错题","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文模考 + 错题","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 弱项章节回填","VB":"📚 Vocabulary 6 U24"},"Thu":{"E1":"📖 Cloze 第 26","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"➗ 数学模考 + 错题","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W27 第二阶段准备"},"Sat":{"AM":"🔬 P6 难度卷 1 套(预热)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🎯 第一阶段大复盘 + 核对表","S2":"📖 英语作文重写 + 📓 复盘"}}}];

// ============= 默认数据结构 (v2) =============
function getDefaultState() {
  return {
    version: 2,
    currentWeek: 1,
    totalPoints: 0,

    // 每日打卡 (v2 新增):daily[weekN][dayKey][slotKey] = true/false
    // dayKey ∈ Mon|Tue|Wed|Thu|Fri|Sat|Sun, slotKey ∈ S1|S2|S3|AM|PM
    daily: {},

    // 每周状态(里程碑/月小测等管理项)
    // weekly[1] = { checkin: { monthlyTest: true, w14: true, ... } }
    weekly: {},

    // 全局打卡
    streakBonusCount: 0,
    monthlyTestPass: 0,

    // 已完成的关键里程碑
    milestones: { W14: false, W20: false, W26: false },

    // 沮丧表情持续时间(扣分后 24h)
    sadUntil: null,

    // 全局加分日志
    logs: [],

    // 兑换记录
    exchanges: [],

    // 各科作业分数 (v4):scores['week_day_slot'] = { score, max, note, savedAt }
    scores: {}
  };
}

// ============= 周打卡项(里程碑/月小测,不含 review) =============
// review 不再是手动勾选项,改为根据每日打卡完成率自动判定
function getWeeklyCheckinTemplate(weekNum) {
  const items = [];

  // 月节点(W4, W8, W12)
  if (weekNum === 4 || weekNum === 8 || weekNum === 12) {
    items.push({
      id: 'monthlyTest',
      label: '🎯 月小测达标',
      desc: 'P3 整合 / 月模考达标(由家长在管理页确认)',
      points: 20,
      type: 'milestone',
      adminOnly: true
    });
  }

  if (weekNum === 14) {
    items.push({
      id: 'w14',
      label: '🏅 W14 P3-P4 综合模拟卷达标',
      desc: '科学 88+ 分(目标 AL1,由家长在管理页确认)',
      points: 50,
      type: 'special',
      adminOnly: true
    });
  }
  if (weekNum === 20) {
    items.push({
      id: 'w20',
      label: '📚 W20 P5 综合复习达标',
      desc: '平均 85+ 分(冲 AL2,由家长在管理页确认)',
      points: 30,
      type: 'special',
      adminOnly: true
    });
  }
  if (weekNum === 26) {
    items.push({
      id: 'w26',
      label: '🏆 W26 第一阶段总模考达标',
      desc: '4 科都达标:英 85+/科 90+/数 90+/华 90+ (总 AL 6-8)',
      points: 100,
      type: 'special',
      adminOnly: true
    });
  }

  return items;
}

// ============= 本周智慧教练(诊断 + 重点 + 建议 + 名师秘诀) =============

// 各周章节核心知识点(教练用 — 给孩子讲本周该重点抓什么)
const WEEK_FOCUS_TIPS = [
  // index = week-1
  { theme: 'P3 Diversity', points: ['动物分类:脊椎 vs 无脊椎', '植物分类:开花 vs 不开花', '材料分类与性质(磁性/导热/透光)'] },
  { theme: 'P3 Plant Life Cycle', points: ['种子结构:seed coat / embryo / cotyledon', '萌发 3 条件:水 + 空气 + 温度', '4 阶段:seed → seedling → mature → flowering'] },
  { theme: 'P3 Animal Life Cycle', points: ['完全变态(蝴蝶/蛙)vs 不完全变态(蟑螂/蚊)', '4 类动物对比:鸡(无变态)/ 蛙 / 蝴蝶 / 蟑螂', 'PSLE 高频:阶段名英文术语必背'] },
  { theme: 'P3 Plant Parts', points: ['根 = 吸收 + 固定 / 茎 = 运输 + 支撑 / 叶 = 光合 + 蒸腾', '花 = 繁殖 / 果实 = 保护种子', 'P3 整章思维导图必画'] },
  { theme: 'P4 Plant Transport ⭐ 难章 1', points: ['xylem (木质部) 运水向上', 'phloem (韧皮部) 运养分双向', '芹菜染色实验:观察 + 推理'] },
  { theme: 'P4 Plant Transport ⭐ 难章 2', points: ['蒸腾作用:为什么水会向上运', '开放题答题模板:"because... so..."', '实验设计:控制变量 + 假设'] },
  { theme: 'P4 Digestive ⭐⭐ 难章 1', points: ['完整路径:口 → 食道 → 胃 → 小肠 → 大肠', '物理消化(咀嚼) vs 化学消化(酶)', '各器官功能英文术语必背'] },
  { theme: 'P4 Digestive ⭐⭐ 难章 2', points: ['营养素 + 消化对应:糖→amylase / 蛋白→pepsin / 脂→bile', '酶活性实验(温度 / pH 影响)', 'PSLE 高频:为什么类开放题'] },
  { theme: 'P4 Matter + Mass/Volume', points: ['三态 + 状态变化', 'Mass(质量,kg)vs Volume(体积,L) — 测量工具不同', '易章速过,不深挖'] },
  { theme: 'P4 Light & Shadow ⭐ 难章 1', points: ['光源 + 直线传播 + 反射(镜面 vs 漫)', '影子形成 3 条件:光源 + 不透明物 + 屏', '不透明 / 半透明 / 透明 区别'] },
  { theme: 'P4 Light & Shadow ⭐ 难章 2', points: ['影子大小 vs 光源距离(近 → 大)', '影子方向 vs 光源位置(对面)', '实验设计题答题模板熟练'] },
  { theme: 'P4 Heat ⭐⭐ 难章 1', points: ['温度 vs 热(状态量 vs 能量量,易混)', '热传导(良/绝缘体)+ 对流(流体)+ 辐射(无介质)', '热膨胀冷缩(实验)'] },
  { theme: 'P4 Heat ⭐⭐ 难章 2', points: ['PSLE 高频:三种传递混合应用题', '"为什么"开放题:用"because + 传递方式"', '保温 vs 散热设计题'] },
  { theme: 'P4 Magnets + 综合 🎯', points: ['磁极:同极相斥/异极相吸', '磁性材料(铁钴镍)+ 磁化方法', '🎯 W14 P3-P4 综合模拟卷,严格 1h45min'] },
  { theme: 'P5 Reproduction', points: ['Plant Reproduction(花的结构 + 受精)', 'Human Reproduction', '从 P3-P4 到 P5 的衔接整理'] },
  { theme: 'P5 Cells + Energy from Food', points: ['Cells:植物 vs 动物结构(细胞壁/叶绿体)', '食物链 → 食物网,生产者/消费者/分解者', 'Vocab 5 完成 ✅'] },
  { theme: 'P5 Water + Air & Weather', points: ['水循环深化:蒸发/凝结/降水', 'Air 组成(氮 78% 氧 21% 其他 1%)', 'Weather:云型 + 测量工具'] },
  { theme: 'P5 Forms of Energy', points: ['Kinetic 动能 + Potential 势能', 'Sound + Light + Electrical + Heat 形态', '能量分类'] },
  { theme: 'P5 Energy Conversions', points: ['转换链:化学→电→光/热(灯泡)', '可再生(太阳/风/水)vs 不可再生(化石)', 'Energy efficiency 概念'] },
  { theme: 'P5 Electricity ⭐', points: ['电流(I,安培)/电压(V,伏特)/电阻', '简单电路:电池 + 灯 + 开关', '导体 vs 绝缘体 + 用电安全'] },
  { theme: 'P5 Series & Parallel ⭐', points: ['串联:电流相同,电压分配', '并联:电压相同,电流分配', 'PSLE 电路题:开关短路 vs 断开'] },
  { theme: 'P5 综合复习 1', points: ['Cycles 总复习(水/物质/生命)', 'Systems 总复习(消化/运输/呼吸)', '综合卷 1 限时模拟'] },
  { theme: 'P5 综合复习 2', points: ['Energy 总复习', 'Electricity 总复习', '综合卷 2 + 错题分析'] },
  { theme: 'P5 综合卷模拟 + 弱项回填', points: ['限时综合卷 ×2', '弱项章节回填(看错题本数据)', '整体掌握度自评'] },
  { theme: 'P5 整体串讲 + Visual Text 启动', points: ['P5 整体串讲(联系 P3-P4)', 'PSLE 题型熟悉(开放题)', '看图答题 Visual Text 启动'] },
  { theme: '🎯 第一阶段总模考', points: ['🎯 严格 PSLE 时长完整模拟 4 科', '对照目标 (v14 冲分版):英 85+ / 科 90+ / 数 90+ / 华 90+ → 总 AL 6-8', 'W27 第二阶段启动准备'] },
];

// 名师秘诀池(26 条,每周一对一,与本周主题学科匹配的 PSLE 答题模板/技巧)
const WEEK_MASTER_TIPS = [
  // W1 P3 Diversity
  { subject: '🔬 P3 Diversity', title: '动物 5 类 + 植物 2 类 关键词',
    content: '脊椎 5 类:fish(鳃+鳞)/ amphibian(湿皮+变态)/ reptile(干鳞+蛋)/ bird(羽+喙+卵生)/ mammal(毛+乳+胎生)。植物:flowering vs non-flowering。PSLE 题"why classified as X" → 答关键特征词。' },
  // W2 P3 Plant Life Cycle
  { subject: '🔬 P3 Plant Life Cycle', title: '萌发 3 条件答题',
    content: '种子萌发必需:water + air + warmth(注意 PSLE 不要写 sunlight/soil — 萌发不需要,只是后续生长用)。题"为什么 seed 没发芽?"→ 检查缺哪个条件就答哪个。' },
  // W3 P3 Animal Life Cycle
  { subject: '🔬 P3 Animal Life Cycle', title: '完全 vs 不完全变态对比',
    content: '完全变态(complete):egg → larva → pupa → adult(蝴蝶/苍蝇/甲虫)。不完全(incomplete):egg → nymph → adult,无 pupa 阶段(蟑螂/蚊子/蜻蜓)。鸡(no metamorphosis)直接 egg → chick → adult。阶段名英文必背。' },
  // W4 P3 Plant Parts
  { subject: '🔬 P3 Plant Parts', title: '各部位功能英文术语',
    content: 'roots = absorb water + anchor / stem = transport water+nutrients + support / leaves = photosynthesis(光合) + transpiration(蒸腾) / flower = reproduction / fruit = protect seeds。题"切掉茎/叶会怎样" → 用对应功能反推后果。' },
  // W5 P4 Plant Transport (1/2)
  { subject: '🔬 P4 Plant Transport ⭐', title: '芹菜染色实验答题模板',
    content: 'Q: Why coloured water moves up celery? A: Water travels up the stem THROUGH the XYLEM BY transpiration. Water evaporates from leaves, creating SUCTION that pulls more water up. 关键词必含:xylem(木质部) / transpiration(蒸腾) / suction.' },
  // W6 P4 Plant Transport (2/2)
  { subject: '🔬 P4 Plant Transport ⭐', title: '为什么植物枯萎 / 凋零开放题',
    content: 'Q: Why does the plant wilt? A: Leaves lose water faster than roots can absorb. Cells lose turgor pressure, plant wilts. Q: Why is xylem important? A: Transports water from roots to leaves for photosynthesis.' },
  // W7 P4 Digestive (1/2)
  { subject: '🔬 P4 Digestive ⭐⭐', title: '完整消化路径必背',
    content: 'Mouth(saliva 含 amylase 消化淀粉)→ Esophagus(传送)→ Stomach(胃酸 + pepsin 消化蛋白)→ Small intestine(消化完成 + 吸收 nutrients to blood)→ Large intestine(吸水 + 形成 feces)→ Anus。每个器官的 function 一句话答清楚。' },
  // W8 P4 Digestive (2/2)
  { subject: '🔬 P4 Digestive ⭐⭐', title: '营养素 + 消化酶对应',
    content: '淀粉 starch → amylase(口腔/胰腺)→ glucose / 蛋白 protein → pepsin(胃)→ amino acids / 脂肪 fat → bile(肝制) + lipase(胰腺/小肠)→ fatty acids。PSLE Q: enzyme 在哪个器官最活跃?→ 看 pH 和温度。' },
  // W9 P4 Matter
  { subject: '🔬 P4 Matter + Mass/Volume', title: '三态特征 + 测量工具',
    content: 'Solid(固定形状+体积) / Liquid(体积固定但形状随容器) / Gas(都不固定)。Mass(kg)= 质量,不变,用 balance 称。Volume(L/cm³)= 体积,可变,用 measuring cylinder 量。Mass ≠ Weight(weight 受重力影响)。' },
  // W10 P4 Light & Shadow (1/2)
  { subject: '🔬 P4 Light & Shadow ⭐', title: '影子大小 vs 光源距离',
    content: 'Q: Why bigger shadow when light is closer? A: As light source moves CLOSER to the object, MORE light is BLOCKED by the object, so shadow becomes LARGER. 反之 → 越远越小。注意答案要说"more light blocked",不能只说"shadow bigger"。' },
  // W11 P4 Light & Shadow (2/2)
  { subject: '🔬 P4 Light & Shadow ⭐', title: '影子方向 + 透光分类',
    content: '影子永远在光源对面(opposite side)。Opaque(不透)→ dark shadow / Translucent(半透,如磨砂玻璃)→ light shadow / Transparent(透,如玻璃)→ no shadow。PSLE 实验题:控制光源位置 + 物体距离。' },
  // W12 P4 Heat (1/2)
  { subject: '🔬 P4 Heat ⭐⭐', title: '三种热传递区分模板',
    content: 'Conduction(传导):solid 直接接触(金属勺烫)。Convection(对流):fluid(液/气)流动循环(暖气片在地面 — 热气上升)。Radiation(辐射):无介质,可穿真空(太阳到地球)。Q "为什么 X 是 Y 传递" → 答介质 + 方向。' },
  // W13 P4 Heat (2/2)
  { subject: '🔬 P4 Heat ⭐⭐', title: '温度 vs 热 + 热膨胀',
    content: '温度 temperature(°C)= 热的程度(状态量)。热 heat(J)= 能量(总量)。同 100°C 的水 1 杯 vs 1 桶,温度一样但热量不同。热膨胀:遇热体积↑,遇冷体积↓ — 题"为什么夏天电线下垂?" → expansion。' },
  // W14 P4 Magnets + 综合
  { subject: '🔬 P4 Magnets + 🎯 综合卷', title: '磁体规律 + 综合卷应试策略',
    content: '同极 repel,异极 attract。磁性材料:iron / cobalt / nickel(铁钴镍)。磁化:同极擦或电流。综合卷策略:严格 1h45min,先做有把握的题,标记不确定的;MCQ 先 50min,OE 50min,检查 5min。' },
  // W15 P5 Reproduction
  { subject: '🔬 P5 Reproduction', title: '花结构 + 受精流程英文',
    content: '花的结构 stamen(雄)= anther(花药)+ filament / pistil(雌)= stigma(柱头)+ style + ovary(子房)。Pollination(传粉)= 花粉 anther → stigma。Fertilisation(受精)= 花粉 + ovule → seed。Methods of pollination: insect / wind / water。' },
  // W16 P5 Cells + Food
  { subject: '🔬 P5 Cells + Food Chain', title: '细胞结构 + 食物链顺序',
    content: '动物细胞:cell membrane + cytoplasm + nucleus。植物多 2 个:cell wall + chloroplast(叶绿体)。Food chain:producer(植物 — make food)→ primary consumer(草食)→ secondary consumer(肉食)→ tertiary consumer / decomposer(分解)。箭头方向 = energy flow。' },
  // W17 P5 Water + Air
  { subject: '🔬 P5 Water + Air & Weather', title: '水循环 4 步 + Air 组成',
    content: '水循环:evaporation(蒸发,液→气)→ condensation(凝结,气→液成云)→ precipitation(降水,雨/雪)→ collection(汇集回海)。Air 组成 = 78% nitrogen + 21% oxygen + 1% other(包括 CO₂ 和 noble gases)。Weather 工具:thermometer / anemometer / rain gauge。' },
  // W18 P5 Forms of Energy
  { subject: '🔬 P5 Forms of Energy', title: '能量形态对应表 + 例子',
    content: 'Kinetic(动能 — 移动物体)/ Potential(势能 — 高度 / 拉伸的弹簧)/ Sound 声 / Light 光 / Electrical 电 / Heat 热 / Chemical 化学(电池/食物)。题"骑车上山时哪种能量在变" → kinetic ↑↓ + potential ↑。' },
  // W19 P5 Energy Conversions
  { subject: '🔬 P5 Energy Conversions', title: '能量转换链答题',
    content: '灯泡:electrical → light(useful) + heat(wasted)。风扇:electrical → kinetic。太阳能板:light → electrical。化石燃料发电:chemical → heat → kinetic → electrical。答题用 → 箭头,标 useful/wasted energy。' },
  // W20 P5 Electricity
  { subject: '⚡ P5 Electricity ⭐', title: '电路 + 用电安全模板',
    content: '电路 = battery(power source)+ wires + component(灯/电机)+ switch。必须 closed circuit 闭合才有电流。Conductor(导体)= metals。Insulator(绝缘体)= plastic / wood / rubber / dry skin。湿手不能碰电器(湿水是导体)。' },
  // W21 P5 Series & Parallel
  { subject: '⚡ P5 Series & Parallel ⭐', title: '串并联高频题型',
    content: 'Series 串联:1 个 path,电流相同(same current),电压分配(voltage shared)。一灯坏 → 全灭。Parallel 并联:多 path,电压相同,电流分配。一灯坏 → 其他正常。Q"为什么家里用并联?" → 一灯坏不影响其他 + 各设备独立电压。' },
  // W22 P5 综合复习 1
  { subject: '🔬 综合复习 — Cycles & Systems', title: 'PSLE OE 三大题型答题模板',
    content: '"Compare A and B" → 用 unlike / whereas 对比两者关键差异。"Why" → because + 机制因果链。"Predict what will happen" → 因果推理 + 量化变化(more/less/no change)。所有 OE 答案必含原文核心词。' },
  // W23 P5 综合复习 2
  { subject: '⚡ 综合复习 — Energy & Electricity', title: 'PSLE 实验题 4 要素练熟',
    content: '答题每次都要写:① Independent variable(改变啥 — 1 个) ② Dependent variable(测啥 — 1 个)③ Controlled variables(保持不变 — 至少 2 个)④ Hypothesis(预测 + 理由)。少 1 项扣 1 分。' },
  // W24 P5 综合卷模拟
  { subject: '🎯 综合卷模拟 + 弱项回填', title: '综合卷应试时间分配',
    content: '严格 PSLE 时长(1h45min)。MCQ 50min(2min/题,快做不纠结)→ OE 50min(慢做仔细审题)→ 检查 5min。不会的 MCQ 标记跳过最后回头。OE 没思路就先写关键词不留空白。' },
  // W25 P5 整体串讲 + Visual Text
  { subject: '📖 串讲 + Visual Text', title: 'Visual Text 答题模板',
    content: 'Visual Text(海报/广告/通知)看图答题。必看:① 大字标题(主题)② 数字(日期/时间/价格)③ 图片暗示 ④ 联系方式 ⑤ 排版强调(粗体/颜色)。题型:Who / What / When / Where / Why / How much。答案直接从图找,不要自己推断。' },
  // W26 总模考
  { subject: '🎯 第一阶段总模考', title: '4 科模考全面策略',
    content: '严格 PSLE 时长完整 4 科。建议顺序:① 数学(精神最好)② 科学 ③ 英语 Paper 1(作文)④ 英语 Paper 2 ⑤ 华文。每科考完不立刻对答案,等全考完再分析错题分类(粗心/概念/题型)。v14 目标:英 85+(AL2)/ 科 90+(AL1)/ 数 90+(AL1)/ 华 90+(AL1)→ 总 AL 6-8(DP 实际进 9-12 分校)。' },
];

// 弱项 → 针对性建议(基于 taskSubtype 关键字)
function adviceForWeakness(subtype) {
  const m = {
    'Cloze 完形': '✍️ 每错一空必查 3 件事:同义词 / 词性 / 固定搭配。重点背介词搭配(look at/depend on),时态一致(过去时上下文连贯)。',
    'Comp 阅读': '📖 用定位法:先看题找关键词再回原文找。OE 答案必含原文核心词,3 分题答 3 个点。每天 1 篇精读。',
    '作文': '✏️ 4 段结构(开场→矛盾→高潮→反思)。每周必交老师改 + 重写一次。背 5 个高级词(crestfallen/jubilant)用进作文。',
    'Editing 改错': '✏️ 每错按 5 类记本:主谓一致 / 时态 / 拼写 / 介词 / 冠词。每周 50 题 + 错题分类分析。',
    'Grammar 语法': '📚 MCQ 50 题/周。错题分析为什么选错,不光改答案。重点:if/since/much/too 等高频套路。',
    'Vocab 词汇': '📚 主题分类记(travel/school/nature/emotion)。每天 5 个,连记带用,在作文里用进去 3-5 个。',
    '听力/口试': '🎤 每天 5-10min 朗读录音回放找发音错。看图说话 3 句扩展:描述→联想→个人经历。',
    '科学综合卷': '🔬 错题分 3 类(粗心/概念/题型)。概念错回教材重读;题型错对照 PSLE 8 大高频章答题模板。',
    '科学章节测': '🔬 70%+ 才进下章。错题立刻入本,周末重做。英文术语必背,实验题答题模板要熟。',
    '科学其他': '🔬 概念图记英文术语。PSLE 高频:Plant Transport / Digestive / Light / Heat / Reproduction / Cells / Energy / Electricity。',
    '数学模考': '🔢 错题本必填:粗心(看错题)/ 公式(忘记) / 题型(没见过)三类。Heuristic 4 选 1:Model Drawing / Table / Backwards / ALL Working。',
    '数学其他': '🧮 难题限时 30min,做不出抄题型 + 思路下次回看,不死磕超 45min。',
    '华文作文': '🇨🇳 5 类开头(描景/引句/反问/排比/对话)+ 5+ 成语/谚语 + 心理描写。',
    '华文模考': '🇨🇳 Paper 1=作文(50min) / Paper 2=阅读+综合(1h50min)。分开计时,作文优先。',
    '华文其他': '🇨🇳 找原文位置 + 用四字词概括 + 注意"为什么/有什么影响"格式。',
    'Visual Text': '🖼️ 看海报答题:文字 + 数字 + 颜色 + 符号 + 排版 全注意。',
  };
  return m[subtype] || '💪 持续打卡,关注错题本,周末必复盘。每周日复盘 5 件事是命根子。';
}

// 整合 — 返回 { phase, weekTheme, diagnosis[], focus, weakness, masterTip }
function getWeeklyCoaching(state) {
  const week = state.currentWeek;
  const wt = WEEK_TASKS[week - 1];
  const c = calcWeekCompletion(week, state);
  const dp = calcWeekDailyPoints(week, state);
  const agg = aggregateScores(state);
  const isHard = wt && wt.theme.includes('⭐');
  const phase = week <= 14 ? '第一阶段 P3-P4 系统过' : '第一阶段 P5 收尾';

  // 1) 诊断 (3-4 lines)
  const diagnosis = [];
  if (!c || c.total === 0) {
    diagnosis.push('🌱 本周还没开始,加油打卡!');
  } else {
    if (c.percent === 100) diagnosis.push(`🌟 本周满勾 ${c.done}/${c.total} (100%) — 完美!`);
    else if (c.onTrack) diagnosis.push(`🟢 本周完成 ${c.done}/${c.total} (${c.percent}%) — 进度优秀,目标稳了`);
    else if (c.percent >= 50) diagnosis.push(`🟡 本周完成 ${c.done}/${c.total} (${c.percent}%) — 距 80% 达标还差 ${Math.max(0, Math.ceil(c.total * 0.8) - c.done)} 个`);
    else diagnosis.push(`🟠 本周才 ${c.done}/${c.total} (${c.percent}%) — 加把劲!优先做今日剩下的 slot`);
  }
  if (dp.reviewBlocked) diagnosis.push(`⚠️ 完成率够了,但 ${dp.missingKeySlots.length} 个 🎯 必做 slot 还没做 → 拿不到周复盘 +5 分`);
  if (agg.weakest && agg.weakest.count >= 2) {
    diagnosis.push(`📉 当前弱项: ${agg.weakest.subtype}(${agg.weakest.count} 次记录,均 ${agg.weakest.avgPct}%)`);
  } else if (agg.items.length >= 1) {
    const totals = Object.values(agg.bySubject);
    if (totals.length > 0) {
      const avg = Math.round(totals.reduce((a, b) => a + b.avgPct, 0) / totals.length);
      diagnosis.push(`📈 各科累计平均 ${avg}% (${agg.items.length} 项分数)`);
    }
  }
  if (state.sadUntil && Date.now() < state.sadUntil) {
    diagnosis.push(`😞 老师反馈学习问题 24h 内 — 沉住气,这是态度提醒,不是能力否定`);
  }

  // 2) 本周重点(从手册章节)
  const focusData = WEEK_FOCUS_TIPS[week - 1] || { theme: wt ? wt.theme : `W${week}`, points: [] };
  const focus = {
    title: `W${week} ${focusData.theme}${isHard ? ' ⭐ 难章周' : ''}`,
    points: focusData.points
  };

  // 3) 提升建议(基于弱项,否则给本周相关默认建议)
  let weakAdvice = null;
  if (agg.weakest && agg.weakest.count >= 2) {
    weakAdvice = {
      subject: agg.weakest.subtype,
      avgPct: agg.weakest.avgPct,
      advice: adviceForWeakness(agg.weakest.subtype)
    };
  }

  // 4) 名师秘诀:本周主题学科对应的 PSLE 答题模板(每周 1 条专项)
  //    弱项的针对性建议在 weakAdvice 里单独显示,这里不重复
  const weekTip = WEEK_MASTER_TIPS[week - 1];
  const masterTip = weekTip ? {
    title: `${weekTip.subject} — ${weekTip.title}`,
    content: weekTip.content
  } : null;

  return { phase, weekTheme: wt ? wt.theme : '', isHard, diagnosis, focus, weakAdvice, masterTip };
}

// ============= 周末报告生成(可打印为 PDF) =============
// 把当前周完整状态打包成结构化报告对象,UI 渲染成可打印 HTML
function generateWeeklyReport(state, weekNum) {
  const week = weekNum || state.currentWeek;
  const wt = WEEK_TASKS[week - 1];
  const c = calcWeekCompletion(week, state);
  const dp = calcWeekDailyPoints(week, state);
  const agg = aggregateScores(state);
  const coach = getWeeklyCoaching({ ...state, currentWeek: week });
  const nextWt = WEEK_TASKS[week] || null;
  const nextFocus = WEEK_FOCUS_TIPS[week] || null;
  const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  // 本周分数明细(只本周的)
  const weekScores = agg.items.filter(it => it.week === week);

  // 本周累计积分
  let weekPoints = dp.total;
  const wd = state.weekly[week];
  if (wd && wd.checkin) {
    const items = getWeeklyCheckinTemplate(week);
    items.forEach(item => { if (wd.checkin[item.id]) weekPoints += item.points; });
  }

  // 总积分 + 击败比例
  const beatPct = studentBeatPercent(state.totalPoints);
  const beatCnt = studentBeatCount(state.totalPoints);
  const levelInfo = window.CHAMUI ? CHAMUI.getLevelInfo(state.totalPoints) : { lv: 0, name: '', title: '' };

  return {
    generatedAt: dateStr,
    week, dateRange: wt ? wt.date : '', theme: wt ? wt.theme : '', isHard: wt && wt.theme.includes('⭐'),
    completion: { done: c.done, total: c.total, percent: c.percent, onTrack: c.onTrack },
    points: { weekTotal: weekPoints, slot: dp.slot, combo: dp.combo, review: dp.review, grandTotal: state.totalPoints },
    level: { lv: levelInfo.lv, name: levelInfo.name, title: levelInfo.title },
    beat: { pct: beatPct, count: beatCnt, total: SG_P5_TOTAL },
    missed: c.missed.slice(0, 20),
    keySlotsMissing: dp.missingKeySlots,
    bySubject: c.bySubject,
    weekScores,
    overallScores: agg.bySubject,
    weakest: agg.weakest,
    coachDiagnosis: coach.diagnosis,
    coachFocus: coach.focus,
    coachWeakAdvice: coach.weakAdvice,
    coachMasterTip: coach.masterTip,
    nextWeek: nextWt ? {
      week: week + 1, dateRange: nextWt.date, theme: nextWt.theme,
      isHard: nextWt.theme.includes('⭐'),
      focus: nextFocus ? nextFocus.points : []
    } : null
  };
}

// ============= 击败全新加坡 P5 同学百分比(虚拟激励指标) =============
// 新加坡每年 P5 学生约 50,000 人。曲线设计:
// 0 分:0% / 30 分(W1 起步):20% / 100 分:43% / 250 分:71% / 500 分:91% / 1000 分:99% / 1500+:99.5%
const SG_P5_TOTAL = 50000;
function studentBeatPercent(pts) {
  if (pts <= 0) return 0;
  // 平滑曲线:1 - exp(-pts / 200 * 0.9),最高 99.5%
  const raw = 100 * (1 - Math.exp(-pts / 200 * 0.9));
  return Math.min(99.5, Math.round(raw * 10) / 10);
}
function studentBeatCount(pts) {
  return Math.round(SG_P5_TOTAL * studentBeatPercent(pts) / 100);
}

// ============= 各科作业分数(v4 新增) =============
// state.scores['week_day_slot'] = { score, max, note, savedAt }
function scoreKey(week, day, slot) { return `${week}_${day}_${slot}`; }

function getScore(state, week, day, slot) {
  return state.scores && state.scores[scoreKey(week, day, slot)];
}

// 设置/删除分数。score=null 删除
function setScore(state, week, day, slot, score, max, note) {
  if (!state.scores) state.scores = {};
  const k = scoreKey(week, day, slot);
  if (score == null || score === '') {
    delete state.scores[k];
  } else {
    state.scores[k] = {
      score: Number(score),
      max: Number(max) || 100,
      note: note || '',
      savedAt: Date.now()
    };
  }
}

// 任务文本 → 大科目分组(用于聚合)
function subjectGroup(task) {
  const t = task || '';
  if (t.startsWith('🔬')) return '🔬 科学';
  if (t.startsWith('📖') || t.startsWith('📚')) return '📖 英语阅读/词汇';
  if (t.startsWith('✏️') || t.startsWith('✍️')) return '✏️ 英语写作/语法';
  if (t.startsWith('🗣')) return '🗣️ 听力口试';
  if (t.startsWith('➗')) return '➗ 数学';
  if (t.startsWith('🇨🇳')) return '🇨🇳 华文';
  return '其他';
}

// 任务文本 → 子项类型(更细的统计 — 区分作文/Cloze/Comp/Editing 等)
function taskSubtype(task) {
  const t = task || '';
  if (/作文/.test(t)) return '作文';
  if (/Cloze|完形/.test(t)) return 'Cloze 完形';
  if (/Comp|阅读 Comprehension/.test(t)) return 'Comp 阅读';
  if (/Editing|改错/.test(t)) return 'Editing 改错';
  if (/Grammar|语法/.test(t)) return 'Grammar 语法';
  if (/Vocab|词汇/.test(t)) return 'Vocab 词汇';
  if (/听力|口试/.test(t)) return '听力/口试';
  if (/Visual Text|看图答题/.test(t)) return 'Visual Text';
  if (t.startsWith('🔬') && /综合|模拟|总模考/.test(t)) return '科学综合卷';
  if (t.startsWith('🔬') && /章节小测|配套/.test(t)) return '科学章节测';
  if (t.startsWith('🔬')) return '科学其他';
  if (t.startsWith('➗') && /模考|真题|综合/.test(t)) return '数学模考';
  if (t.startsWith('➗')) return '数学其他';
  if (t.startsWith('🇨🇳') && /模考|真题/.test(t)) return '华文模考';
  if (t.startsWith('🇨🇳') && /作文/.test(t)) return '华文作文';
  if (t.startsWith('🇨🇳')) return '华文其他';
  return '其他';
}

// 聚合所有分数 → 按 (week, subject, subtype) 分组
// 返回 { byWeekSubject: { week: { subject: {sum, max, count, avgPct, items: [...]} } },
//        bySubtype: { subtype: { sum, max, count, avgPct, latest, weeks: [...] } },
//        bySubject: { subject: { sum, max, count, avgPct, weekly: [...] } },
//        byMonth: { month: { subject: {sum, max, count, avgPct} } }   月份 = ceil(week/4)
//        weakest: subtype }
function aggregateScores(state) {
  const out = {
    byWeekSubject: {},
    bySubtype: {},
    bySubject: {},
    byMonth: {},
    weakest: null,
    items: []  // flat list for table
  };
  if (!state.scores) return out;
  const entries = Object.entries(state.scores);

  for (const [key, sc] of entries) {
    const [w, day, slot] = key.split('_');
    const week = parseInt(w);
    const wt = WEEK_TASKS[week - 1];
    if (!wt) continue;
    const task = wt.days[day] && wt.days[day][slot];
    if (!task) continue;
    const subject = subjectGroup(task);
    const subtype = taskSubtype(task);
    const month = Math.ceil(week / 4);
    const item = { week, day, slot, task, subject, subtype, score: sc.score, max: sc.max, pct: Math.round(sc.score / sc.max * 100), note: sc.note, savedAt: sc.savedAt };
    out.items.push(item);

    // byWeekSubject
    if (!out.byWeekSubject[week]) out.byWeekSubject[week] = {};
    if (!out.byWeekSubject[week][subject]) out.byWeekSubject[week][subject] = { sum: 0, max: 0, count: 0, items: [] };
    out.byWeekSubject[week][subject].sum += sc.score;
    out.byWeekSubject[week][subject].max += sc.max;
    out.byWeekSubject[week][subject].count++;
    out.byWeekSubject[week][subject].items.push(item);

    // bySubtype
    if (!out.bySubtype[subtype]) out.bySubtype[subtype] = { sum: 0, max: 0, count: 0, latest: null };
    out.bySubtype[subtype].sum += sc.score;
    out.bySubtype[subtype].max += sc.max;
    out.bySubtype[subtype].count++;
    if (!out.bySubtype[subtype].latest || sc.savedAt > out.bySubtype[subtype].latest.savedAt) {
      out.bySubtype[subtype].latest = item;
    }

    // bySubject
    if (!out.bySubject[subject]) out.bySubject[subject] = { sum: 0, max: 0, count: 0 };
    out.bySubject[subject].sum += sc.score;
    out.bySubject[subject].max += sc.max;
    out.bySubject[subject].count++;

    // byMonth
    if (!out.byMonth[month]) out.byMonth[month] = {};
    if (!out.byMonth[month][subject]) out.byMonth[month][subject] = { sum: 0, max: 0, count: 0 };
    out.byMonth[month][subject].sum += sc.score;
    out.byMonth[month][subject].max += sc.max;
    out.byMonth[month][subject].count++;
  }

  // compute avg %
  for (const w in out.byWeekSubject) {
    for (const s in out.byWeekSubject[w]) {
      const x = out.byWeekSubject[w][s];
      x.avgPct = Math.round(x.sum / x.max * 100);
    }
  }
  for (const k in out.bySubtype) {
    out.bySubtype[k].avgPct = Math.round(out.bySubtype[k].sum / out.bySubtype[k].max * 100);
  }
  for (const k in out.bySubject) {
    out.bySubject[k].avgPct = Math.round(out.bySubject[k].sum / out.bySubject[k].max * 100);
  }
  for (const m in out.byMonth) {
    for (const s in out.byMonth[m]) {
      const x = out.byMonth[m][s];
      x.avgPct = Math.round(x.sum / x.max * 100);
    }
  }

  // weakest subtype:最少 2 次记录,找最低 avgPct
  let weakest = null, minPct = 101;
  for (const k in out.bySubtype) {
    const s = out.bySubtype[k];
    if (s.count >= 2 && s.avgPct < minPct) {
      minPct = s.avgPct;
      weakest = { subtype: k, avgPct: s.avgPct, count: s.count };
    }
  }
  out.weakest = weakest;

  return out;
}

// ============= 任务"怎么做" + PSLE 答题技巧(从手册 v9 + PSLE rubrics 提炼) =============
function getTaskTip(task) {
  if (!task) return '';
  const t = String(task);

  // ===== 复盘类 =====
  if (/月评估|大复盘|月模考/.test(t))
    return '🎯 大复盘 2h:① 看模考分对照目标 ② 错题分 3 类(粗心/概念/题型) ③ 决定下月任务量增减';
  if (/复盘|错题本复盘|📓/.test(t))
    return '📓 周日 19:30-21:00 做 5 件事:① 本周打钩 ② 错题入册 ③ 看下周卡 ④ 教材摆桌 ⑤ 作文题确定';
  if (/W\d+ ?准备|准备\(P5|准备\(进/.test(t))
    return '📋 把下周教材按周一到周日顺序摆好;作文题写在作文本第一行';
  if (/总模考|科学总模考/.test(t))
    return '🎯 严格 PSLE 时长完整模拟 4 科。v14 目标:英 85+ / 科 90+ / 数 90+ / 华 90+ → 总 AL 6-8 分 (DP 冲分版)';
  if (/英语模考|Paper 1\+2/.test(t))
    return '📃 PSLE 英语 Paper 1=Composition+Editing(70min) / Paper 2=Grammar+Vocab+Cloze+Comp(1h50min)';

  // ===== 科学 PSLE Science 答题技巧 =====
  if (/教材精读|精读/.test(t))
    return '🔬 通读 + 概念图 + 英文术语必背(如 xylem 木质部 / phloem 韧皮部)。PSLE 全英文,术语错 = 题错';
  if (/概念图|思维导图/.test(t))
    return '🧠 一章 1 张树形图:中心写章节名 → 分支写 过程/原因/结果。英文术语 + 标 PSLE 高频考点';
  if (/实验设计|实验题/.test(t))
    return '🧪 PSLE 实验 4 要素:① Independent var(改变啥) ② Dependent var(测啥) ③ Controlled vars(保持不变) ④ Hypothesis 假设';
  if (/开放题|为什么/.test(t))
    return '💡 PSLE OE 答题:What→直接答名词 / Why→"because... so..." / Explain→概念+例子。答案必含原文核心词';
  if (/章节小测|配套练习|Activity/.test(t))
    return '📝 限时 20-30min,70%+ 才进下章。错题立刻入本 + 周末重做。教材是 Inspiring Science P3+P4 Activity Book';
  if (/综合测试|综合模拟|综合卷|综合练习|P3-P4 综合|P5 综合|综合复习/.test(t))
    return '⏱️ 严格 PSLE 时长(科学 1h45min)。错题分 3 类:粗心(看错题)/概念不清/题型陌生 → 各对应不同补救';
  if (/PSLE 高频题型|高频/.test(t))
    return '🎯 PSLE 8 大高频章:Plant Transport / Digestive / Light / Heat / Reproduction / Cells / Energy / Electricity';
  if (/电路题|Series.*Parallel|串并联/.test(t))
    return '⚡ PSLE 电路:串联 = 电流相同电压分;并联 = 电压相同电流分。开关短路 = 0 阻力,断开 = 无穷大';
  if (/补习/.test(t))
    return '👨‍🏫 补习课:带上一周错题本,让老师专门讲不懂的点。不要盲目刷新题';
  if (/^🔬|🔬/.test(t))
    return '🔬 主教材 Inspiring Science P3+P4 + 配套 Activity Book。术语必背,实验题答题模板熟';

  // ===== 英语 PSLE English 答题技巧 =====
  if (/Comp|阅读|Comprehension/.test(t))
    return '📖 PSLE OE 答题:① 定位法(先看题找关键词) ② 答案含原文核心词 ③ 完整句子 ④ 3 分题答 3 个点';
  if (/Cloze|完形/.test(t))
    return '✍️ PSLE Cloze 高频考点:介词搭配(look at/depend on/interested in)/ 时态一致 / 单复数 / 转折因果词(although/therefore)';
  if (/Editing|改错/.test(t))
    return '✏️ PSLE 5 大错误类型:① 主谓一致(he go→goes) ② 时态(yesterday I am→was) ③ 拼写(recieve→receive) ④ 介词 ⑤ 冠词(a/an/the)';
  if (/Grammar|语法/.test(t))
    return '📚 PSLE Grammar MCQ 套路:if/unless 看主从句 / since/for 看时长 / much/many 看可数 / too/either 看肯否';
  if (/作文计划/.test(t))
    return '📝 4 段结构:开场(描景/动作)→ 矛盾发生 → 高潮 → 反思。挑 3-5 个高级词背(crestfallen 沮丧/jubilant 欢欣)';
  if (/作文.*重写|重写.*作文/.test(t))
    return '🔁 照老师标的地方重写一次 — 不重写 = 白改。重写时换更好的词、更紧凑的句';
  if (/作文/.test(t))
    return '✏️ PSLE Composition 40 分:对话+心理+感官描写 + 全文过去时 + 150-180 词。直接引语用 "..."';
  if (/Vocab|词汇/.test(t))
    return '📚 每天 5 个,按主题(travel/school/nature/emotion)。PSLE 高频词 200 个 W30 完 100 / W52 完 200';
  // v14 新加:豆包 PSLE 口语模拟对话
  if (/豆包/.test(t))
    return '🤖 豆包对话:点 PSLE 主题(family/school/hobby)→ 跟 AI 对答 → AI 纠音 + 给评分。每天 25min,坚持 26 周开口量翻倍';
  // v14 新加:Stimulus + 3 问对答(W15+)
  if (/Stimulus.*3 问|看图.*3 推/.test(t))
    return '🖼️ Stimulus 看图 1min:① 描述场景(who/what/where) ② 联想问题或感受 ③ 个人经历呼应。每点 2-3 句';
  // v14 新加:录音回听 + 自评
  if (/录音回听|周诊断.*听力|周诊断.*词汇/.test(t))
    return '📝 周诊断 30min:听 5 题 + 词汇 5 题,标出错误类型(发音/拼写/词性);本周薄弱点写在错题本';
  if (/听力.*口试|口试.*听力|🗣/.test(t))
    return '🎤 PSLE Oral:Reading Aloud(语调起伏 + 句号停 1.5s + 重读关键词)+ Stimulus 看图说话(3 句扩展:描述→联想→个人经历)';
  // v14 新加:Editing 加量提示
  if (/Editing.*段|Editing 5/.test(t))
    return '✏️ Editing 5-6 段 / 每段 3min:5 类错(主谓一致/时态/拼写/介词/冠词)。错题分类入本,周末重做';
  // v14 新加:Synthesis & Transformation (W15+)
  if (/Synthesis|Transformation/.test(t))
    return '✏️ Synthesis & Transformation:把 2 句合并成 1 句,或改换句型不变意。PSLE Paper 2 顶端 10 分。每周 1h';
  // v14 新加:学科英语词汇 (数学/科学术语)
  if (/数学.*30 词|数学.*领读|科学.*30 词|生态环境|几何与测量|数与运算|比与比例/.test(t))
    return '📚 学科英语词汇:中→英翻译 + 造句 + 拼写。这些是 PSLE 数学/科学题干高频词,看不懂题就丢分';
  if (/DeepSeek/.test(t))
    return '🔁 DeepSeek 词汇复习(中→英翻译 + 造句):AI 帮你检查搭配 + 拼写。15min 巩固本周 30 词';
  // v14 新加:听力(CNA938/okto/PSLE 真题)
  if (/CNA938|okto/.test(t))
    return '🎧 每天 10min 真实新闻/儿童节目精听:不查字典先全听一遍 → 第二遍记 3-5 个新词';
  if (/PSLE Listening 题型/.test(t))
    return '🎧 PSLE Listening 真题题型:1 段听 1 次 → 题型 4 选 1。注意陷阱:数字 / 否定 / 转折';
  if (/听力/.test(t))
    return '🎧 每天 10-15min CNA938 / okto / PSLE 真题。听辨 4 选 1,陷阱在数字 / 否定词 / 转折';
  if (/Visual Text|看图答题/.test(t))
    return '🖼️ Visual Text:看海报 / 广告 / 通知答题。注意图中 文字 + 数字 + 颜色 + 符号 + 排版 暗示';
  if (/Practice Package|综合包/.test(t))
    return '📦 PSLE Practice Package 6:全 Paper 1+2 限时套题,老师批 Composition + Comprehension OE';

  // ===== 数学 PSLE Math 答题技巧 =====
  if (/数学.*模考|数学.*真题|数学.*错题/.test(t))
    return '🔢 PSLE 数学 4 大 Heuristics:Model Drawing(线段图)/ Make a Table / Work Backwards / Show ALL Working(中间步骤都写)';
  if (/难题|P5 难题/.test(t))
    return '🧮 限时 30min。Heuristic 4 选 1 试。做不出抄题型 + 思路下次回看,不死磕超 45min';
  if (/^➗ 错题|错题.*数学|^➗/.test(t))
    return '➗ 抄题 → 错的原因(粗心/公式/题型)→ 正确解法。每题 3 行,周末重做';

  // ===== 华文 PSLE Chinese 答题技巧 =====
  if (/华文|🇨🇳/.test(t)) {
    if (/作文/.test(t)) return '🇨🇳 PSLE 华文作文:5 类开头(描景/引句/反问/排比/对话)+ 5+ 成语 / 谚语 + 心理描写细致';
    if (/真题|模拟|模考/.test(t)) return '🇨🇳 PSLE 华文 Paper 1=作文(50min) / Paper 2=阅读理解+综合(1h50min)。分开计时';
    if (/思维导图|大图/.test(t)) return '🇨🇳 整理章节脉络:语法 / 词汇 / 阅读题型 / 作文模板。一张图一目了然';
    return '🇨🇳 PSLE 华文 OE:找句子原文位置 + 用四字词概括 + 注意"为什么 / 有什么影响"格式';
  }

  // ===== 其它 =====
  if (/启动|阶段大复盘|第二阶段启动/.test(t))
    return '🚀 阶段交接:整理上阶段错题本 + 看下阶段计划 + 教材摆桌 + 心态对齐';

  return '';
}

// ============= 每日任务查询 =============
function getWeekTasks(weekNum) {
  return WEEK_TASKS[weekNum - 1] || null;
}

// 返回该日的 slot 列表 [{slot, time, task}, ...]
function getDailyTasks(weekNum, dayKey) {
  const w = getWeekTasks(weekNum);
  if (!w || !w.days[dayKey]) return [];
  const daySlots = w.days[dayKey];
  // 按固定顺序输出 (S1/S2/S3 工作日, AM/PM 周末)
  const order = ['AM', 'PM', 'E1', 'OR', 'VC', 'LS', 'ED', 'S2', 'VB'];
  return order
    .filter(s => s in daySlots)
    .map(s => ({ slot: s, time: SLOT_TIME[s], task: daySlots[s] }));
}

// 单个 slot 是否已勾
function getDailyCheck(state, weekNum, dayKey, slotKey) {
  return !!(state.daily &&
    state.daily[weekNum] &&
    state.daily[weekNum][dayKey] &&
    state.daily[weekNum][dayKey][slotKey]);
}

// 设置 slot 勾选状态(返回是否变更)
function setDailyCheck(state, weekNum, dayKey, slotKey, value) {
  if (!state.daily) state.daily = {};
  if (!state.daily[weekNum]) state.daily[weekNum] = {};
  if (!state.daily[weekNum][dayKey]) state.daily[weekNum][dayKey] = {};
  const prev = !!state.daily[weekNum][dayKey][slotKey];
  if (value) {
    state.daily[weekNum][dayKey][slotKey] = true;
  } else {
    delete state.daily[weekNum][dayKey][slotKey];
  }
  return prev !== !!value;
}

// ============= 周完成情况分析 =============
// 返回 {total, done, percent, bySubject:{...}, byDayPart:{...}, missed:[...], onTrack}
function calcWeekCompletion(weekNum, state) {
  const w = getWeekTasks(weekNum);
  if (!w) return null;

  const subjects = ['🔬 科学', '📖 英语阅读', '✏️ 英语写作/作文', '📚 词汇', '🗣️ 听力口试', '➗ 数学', '🇨🇳 华文', '📓 复盘其他'];
  const subjectKey = (task) => {
    if (task.startsWith('🔬')) return '🔬 科学';
    if (task.startsWith('📖')) return '📖 英语阅读';
    if (task.startsWith('✏️')) return '✏️ 英语写作/作文';
    if (task.startsWith('📚')) return '📚 词汇';
    if (task.startsWith('🗣')) return '🗣️ 听力口试';
    if (task.startsWith('➗')) return '➗ 数学';
    if (task.startsWith('🇨🇳')) return '🇨🇳 华文';
    return '📓 复盘其他';
  };

  const bySubject = {};
  subjects.forEach(s => bySubject[s] = { total: 0, done: 0 });
  const byDayPart = {
    weekday: { total: 0, done: 0, label: '工作日(段1+2+3)' },
    weekend: { total: 0, done: 0, label: '周末(上午/下午)' }
  };
  const byDay = {};
  DAY_KEYS.forEach(d => byDay[d] = { total: 0, done: 0 });
  const missed = [];
  let total = 0, done = 0;

  for (const day of DAY_KEYS) {
    const daySlots = w.days[day] || {};
    const isWeekend = day === 'Sat' || day === 'Sun';
    for (const slot of ['AM', 'PM', 'S1', 'S2', 'S3']) {
      if (!(slot in daySlots)) continue;
      const task = daySlots[slot];
      const subj = subjectKey(task);
      const checked = getDailyCheck(state, weekNum, day, slot);
      total++;
      bySubject[subj].total++;
      byDay[day].total++;
      (isWeekend ? byDayPart.weekend : byDayPart.weekday).total++;
      if (checked) {
        done++;
        bySubject[subj].done++;
        byDay[day].done++;
        (isWeekend ? byDayPart.weekend : byDayPart.weekday).done++;
      } else {
        missed.push({ day, dayLabel: DAY_LABELS[day], slot, time: SLOT_TIME[slot], task, subject: subj });
      }
    }
  }

  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const onTrack = (done / total) >= WEEKLY_REVIEW_THRESHOLD;

  return {
    total, done, percent, onTrack,
    bySubject, byDay, byDayPart, missed
  };
}

// ============= 数据存储 =============
const STORAGE_KEY = 'chamui_psle_v1';  // ⚠️ key 不能改(改了会丢老数据)

// ----- Firebase 同步层(可选 - 需在 index.html 顶部填 firebaseConfig 才启用) -----
let _fbDb = null;
let _fbDoc = null;
let _fbReady = false;
let _fbStatus = 'local';  // 'local' | 'syncing' | 'synced' | 'error'
let _fbStatusListener = null;  // app.js 注册的回调,用于刷新 header badge

function setFbStatus(s) {
  _fbStatus = s;
  if (_fbStatusListener) try { _fbStatusListener(s); } catch (e) {}
}

function initFirebase() {
  if (_fbReady) return true;
  if (typeof firebase === 'undefined') return false;
  if (!window.firebaseConfig || !window.firebaseConfig.apiKey) return false;
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(window.firebaseConfig);
    }
    _fbDb = firebase.firestore();
    _fbDoc = _fbDb.collection('chamui').doc('main');
    _fbReady = true;
    setFbStatus('syncing');
    console.log('🔥 Firebase 同步已启用');
    return true;
  } catch (e) {
    console.warn('Firebase 初始化失败,降级到本地:', e);
    setFbStatus('error');
    return false;
  }
}

function getFbStatus() { return _fbStatus; }
function isFbReady() { return _fbReady; }

// 注册 status 变化回调(app.js 用来刷新 header)
function onFbStatusChange(cb) { _fbStatusListener = cb; }

// 订阅 Firestore 远端变化(其它设备改动会触发)
function subscribeFirestore(onUpdate) {
  if (!_fbReady || !_fbDoc) return null;
  return _fbDoc.onSnapshot(
    snap => {
      if (snap.metadata.hasPendingWrites) return;  // 自己刚写的就别触发了
      if (snap.exists) {
        try { onUpdate(snap.data()); } catch (e) { console.warn(e); }
      }
      setFbStatus('synced');
    },
    err => {
      console.warn('Firestore 订阅出错:', err);
      setFbStatus('error');
    }
  );
}

// 异步加载(优先 Firestore,失败降级 localStorage)
async function loadStateAsync() {
  initFirebase();
  if (_fbReady && _fbDoc) {
    try {
      const snap = await _fbDoc.get();
      if (snap.exists) {
        const merged = Object.assign(getDefaultState(), snap.data());
        if (!merged.daily) merged.daily = {};
        if (!merged.scores) merged.scores = {};
        merged.version = 2;
        // 同时更新本地缓存
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (e) {}
        setFbStatus('synced');
        return merged;
      } else {
        // Firestore 为空 → 用本地的初始化它(首次同步)
        const local = loadState();
        try { await _fbDoc.set(local); setFbStatus('synced'); } catch (e) { console.warn(e); }
        return local;
      }
    } catch (e) {
      console.warn('Firestore 加载失败,降级到本地:', e);
      setFbStatus('error');
    }
  }
  return loadState();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const merged = Object.assign(getDefaultState(), data);
      // v1 → v2 迁移:老数据没有 daily 字段,加一个空对象
      if (!merged.daily) merged.daily = {};
      if (!merged.scores) merged.scores = {};  // v3 → v4 迁移
      // 老 weekly[].checkin.review 在新模型里被淘汰(改为完成率自动判定)
      // 不删除老数据,但 recalc 时会忽略 review 字段
      merged.version = 2;
      return merged;
    }
  } catch (e) {
    console.error('加载数据失败', e);
  }
  return getDefaultState();
}

// 检测 state 是不是"全空的默认值" — 用于防止意外覆盖云端数据
function isEmptyDefaultState(s) {
  if (!s) return true;
  return (s.totalPoints || 0) === 0
    && Object.keys(s.daily || {}).length === 0
    && Object.keys(s.weekly || {}).length === 0
    && Object.keys(s.scores || {}).length === 0
    && (s.logs || []).length === 0
    && (s.exchanges || []).length === 0
    && (s.streakBonusCount || 0) === 0
    && (s.monthlyTestPass || 0) === 0;
}

// saveState(state, options)
// options.force = true → 即使是空默认值也写(用于"重置数据"按钮)
// 默认情况下,空默认值 state 拒绝写 Firestore(防止意外覆盖云端历史)
function saveState(state, options) {
  options = options || {};
  let ok = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('保存数据失败', e);
    ok = false;
  }
  // 镜像写到 Firestore(不阻塞)— 加安全闸
  if (_fbReady && _fbDoc) {
    if (isEmptyDefaultState(state) && !options.force) {
      console.warn('🛡️ 拒绝写空默认值到 Firestore(防止覆盖云端历史)。如确需重置,请传 saveState(state, {force: true})');
      // 不改 fbStatus
    } else {
      setFbStatus('syncing');
      _fbDoc.set(state).then(
        () => setFbStatus('synced'),
        e => { console.warn('Firestore 写入失败:', e); setFbStatus('error'); }
      );
    }
  }
  return ok;
}

// 计算某周 daily 部分得分(v4:per-slot 时长加权 + day combo + weekly review with key-slot 守门)
function calcWeekDailyPoints(weekNum, state) {
  const w = WEEK_TASKS[weekNum - 1];
  if (!w) return { slot: 0, combo: 0, review: 0, total: 0, reviewBlocked: false, missingKeySlots: [] };
  let slotTotal = 0;
  let comboTotal = 0;
  for (const day of DAY_KEYS) {
    const slots = Object.keys(w.days[day] || {});
    if (slots.length === 0) continue;
    let checkedCount = 0;
    for (const s of slots) {
      if (getDailyCheck(state, weekNum, day, s)) {
        slotTotal += slotPoints(weekNum, s);
        checkedCount++;
      }
    }
    if (checkedCount === slots.length) comboTotal += DAY_COMBO_POINTS;
  }
  // 周复盘 +5:需要 ≥80% AND 关键 slot 全做完(B 守门)
  const c = calcWeekCompletion(weekNum, state);
  const keysOk = allKeySlotsDone(weekNum, state);
  const review = (c && c.onTrack && keysOk) ? WEEKLY_REVIEW_POINTS : 0;
  const reviewBlocked = c && c.onTrack && !keysOk;
  const missingKeySlots = listKeySlots(weekNum)
    .filter(k => !getDailyCheck(state, weekNum, k.day, k.slot));

  return {
    slot: slotTotal, combo: comboTotal, review,
    total: slotTotal + comboTotal + review,
    reviewBlocked, missingKeySlots
  };
}

// ============= 规则引擎 =============
function recalcTotalPoints(state) {
  let total = 0;

  // 1) 每日打卡得分:per-slot + day-combo + weekly-review
  const weeksTouched = new Set();
  Object.keys(state.daily || {}).forEach(w => weeksTouched.add(parseInt(w)));
  Object.keys(state.weekly || {}).forEach(w => weeksTouched.add(parseInt(w)));
  weeksTouched.forEach(week => {
    total += calcWeekDailyPoints(week, state).total;
  });

  // 2) 周里程碑/月小测(管理页确认项)
  Object.entries(state.weekly || {}).forEach(([weekStr, weekData]) => {
    if (!weekData.checkin) return;
    const week = parseInt(weekStr);
    const items = getWeeklyCheckinTemplate(week);
    items.forEach(item => {
      if (weekData.checkin[item.id]) total += item.points;
    });
  });

  // 3) 加日志积分(管理页手动加分)
  state.logs.forEach(log => {
    total += log.points;
  });

  state.totalPoints = total;
  return total;
}

// ============= IndexedDB 照片存证 (v3 方案 A 防虚假打卡) =============
const PHOTO_DB = 'chamui_photos';
const PHOTO_STORE = 'photos';

function _openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTO_DB, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function photoKey(week, day, slot) {
  return `${week}_${day}_${slot}`;
}

async function photoPut(week, day, slot, blob) {
  const db = await _openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).put(
      { blob, mime: blob.type, savedAt: Date.now(), size: blob.size },
      photoKey(week, day, slot)
    );
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function photoGet(week, day, slot) {
  const db = await _openIDB();
  return new Promise((resolve) => {
    const tx = db.transaction(PHOTO_STORE, 'readonly');
    const req = tx.objectStore(PHOTO_STORE).get(photoKey(week, day, slot));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

async function photoDelete(week, day, slot) {
  const db = await _openIDB();
  return new Promise((resolve) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).delete(photoKey(week, day, slot));
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

async function photoAllKeys() {
  const db = await _openIDB();
  return new Promise((resolve) => {
    const tx = db.transaction(PHOTO_STORE, 'readonly');
    const req = tx.objectStore(PHOTO_STORE).getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

// 把 IDB 里某周的所有照片 key 拉出来,塞进 in-memory cache 供同步渲染查询
const photoKeyCache = new Set();
async function refreshPhotoKeyCache() {
  const keys = await photoAllKeys();
  photoKeyCache.clear();
  keys.forEach(k => photoKeyCache.add(k));
}
function hasPhotoCached(week, day, slot) {
  return photoKeyCache.has(photoKey(week, day, slot));
}

// 图片压缩:max 1280px JPEG q=0.75。原图可能 5MB → 压完 100-300KB
async function compressImage(file, maxDim = 1280, quality = 0.75) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise((resolve) => {
      canvas.toBlob(b => resolve(b), 'image/jpeg', quality);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ============= 暴露 =============
window.WEEK_DATES = WEEK_DATES;
window.WEEK_THEMES = WEEK_THEMES;
window.WEEK_TASKS = WEEK_TASKS;
window.KEY_WEEKS = KEY_WEEKS;
window.SLOT_TIME = SLOT_TIME;
window.DAY_LABELS = DAY_LABELS;
window.DAY_KEYS = DAY_KEYS;
window.WEEKLY_REVIEW_THRESHOLD = WEEKLY_REVIEW_THRESHOLD;
window.WEEKLY_REVIEW_POINTS = WEEKLY_REVIEW_POINTS;
window.DAY_COMBO_POINTS = DAY_COMBO_POINTS;
window.slotPointsForWeek = slotPointsForWeek;
window.slotPoints = slotPoints;
window.isKeySlot = isKeySlot;
window.listKeySlots = listKeySlots;
window.allKeySlotsDone = allKeySlotsDone;
window.isDayComplete = isDayComplete;
window.calcWeekDailyPoints = calcWeekDailyPoints;
window.getTaskTip = getTaskTip;
window.getScore = getScore;
window.setScore = setScore;
window.subjectGroup = subjectGroup;
window.taskSubtype = taskSubtype;
window.aggregateScores = aggregateScores;
window.studentBeatPercent = studentBeatPercent;
window.getWeeklyCoaching = getWeeklyCoaching;
window.WEEK_FOCUS_TIPS = WEEK_FOCUS_TIPS;
window.WEEK_MASTER_TIPS = WEEK_MASTER_TIPS;
window.adviceForWeakness = adviceForWeakness;
window.generateWeeklyReport = generateWeeklyReport;
window.studentBeatCount = studentBeatCount;
window.SG_P5_TOTAL = SG_P5_TOTAL;
window.loadStateAsync = loadStateAsync;
window.subscribeFirestore = subscribeFirestore;
window.initFirebase = initFirebase;
window.isFbReady = isFbReady;
window.getFbStatus = getFbStatus;
window.onFbStatusChange = onFbStatusChange;
window.photoPut = photoPut;
window.photoGet = photoGet;
window.photoDelete = photoDelete;
window.photoAllKeys = photoAllKeys;
window.photoKey = photoKey;
window.refreshPhotoKeyCache = refreshPhotoKeyCache;
window.hasPhotoCached = hasPhotoCached;
window.compressImage = compressImage;
window.getDefaultState = getDefaultState;
window.getWeeklyCheckinTemplate = getWeeklyCheckinTemplate;
window.getWeekTasks = getWeekTasks;
window.getDailyTasks = getDailyTasks;
window.getDailyCheck = getDailyCheck;
window.setDailyCheck = setDailyCheck;
window.calcWeekCompletion = calcWeekCompletion;
window.loadState = loadState;
window.saveState = saveState;
window.recalcTotalPoints = recalcTotalPoints;
