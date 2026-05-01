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
const KEY_SLOT_KEYWORDS = /教材精读|概念图|实验|开放题|综合测试|高频题型|总模考|模考|限时/;

// 时长基底 + 难章周 +1
function slotPoints(weekNum, slotKey) {
  const w = WEEK_TASKS[weekNum - 1];
  const isHard = w && w.theme.includes('⭐');
  const base = (slotKey === 'AM' || slotKey === 'PM') ? 3 : (slotKey === 'S3' ? 1 : 2);
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
  AM: '上午 9:00-12:00',
  PM: '下午 14:00-19:30',
  S1: '段1 16:30-18:00',
  S2: '段2 19:00-20:30',
  S3: '段3 20:30-21:00'
};

const DAY_LABELS = {
  Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四',
  Fri: '周五', Sat: '周六', Sun: '周日'
};
const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ============= 26 周每日任务表 (从 PSLE 备考手册 v9 提取) =============
const WEEK_TASKS = [{"week":1,"date":"5.4-5.10","theme":"P3 Diversity(动+植+材料)— 易章速览","goal":"里程碑:P3 Diversity 三章过完,确认基础概念","days":{"Mon":{"S1":"🔬 动物分类(脊椎/无脊椎)","S2":"📖 Comp P5 第 1","S3":"📚 Vocab U1"},"Tue":{"S1":"✏️ Grammar U1+Editing 1","S2":"🔬 植物分类(花/无花植物)","S3":"➗ 错题"},"Wed":{"S1":"🔬 材料(分类 +性质)","S2":"✏️ 作文计划","S3":"📚 Vocab U2"},"Thu":{"S1":"📖 Cloze 5 第 1","S2":"🔬 Diversity 章节小测","S3":"✏️ Editing 2"},"Fri":{"S1":"➗ P5 难题","S2":"🗣️ 听力+口试","S3":"📋 W2 准备"},"Sat":{"AM":"🔬 补习(分类整理表)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 P5 模拟卷 + 概念图","S2":"➗ 数学 + 📓 复盘"}}},{"week":2,"date":"5.11-5.17","theme":"P3 Plant Life Cycle — 中等节奏","goal":null,"days":{"Mon":{"S1":"🔬 种子结构(seed coat/embry o)","S2":"📖 Comp P5 第 2","S3":"📚 Vocab U3"},"Tue":{"S1":"✏️ Grammar U2+Editing 3","S2":"🔬 萌发条件(水+空气+ 温度)","S3":"➗ 错题"},"Wed":{"S1":"🔬 生长阶段(seedling→ mature)","S2":"✏️ 作文","S3":"📚 Vocab U4"},"Thu":{"S1":"📖 Cloze 第 2","S2":"🔬 Activity Book + 概念图","S3":"✏️ Editing 4"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W3 准备"},"Sat":{"AM":"🔬 补习 / 章节小测","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 概念图","S2":"➗ 数学 + 📓 复盘"}}},{"week":3,"date":"5.18-5.24","theme":"P3 Animal Life Cycle — 中等节奏","goal":null,"days":{"Mon":{"S1":"🔬 蝴蝶 4 阶段(完全变态)","S2":"📖 Comp P5 第 3","S3":"📚 Vocab U5"},"Tue":{"S1":"✏️ Grammar U3+Editing 5","S2":"🔬 蛙类 4 阶段(蝌蚪→青蛙)","S3":"➗ 错题"},"Wed":{"S1":"🔬 鸡(无变态)/ 蟑螂(不完全变态)","S2":"✏️ 作文","S3":"📚 Vocab U6"},"Thu":{"S1":"📖 Cloze 第 3","S2":"🔬 4 类动物对比表","S3":"✏️ Editing 6"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W4 准备"},"Sat":{"AM":"🔬 补习 / 章节小测","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 动物循环对比图","S2":"➗ 数学 + 📓 复盘"}}},{"week":4,"date":"5.25-5.31","theme":"P3 Plant Parts + P3 整合测试","goal":"W4 月评估:P3 全部完成,准备进入 P4 难章","days":{"Mon":{"S1":"🔬 根/茎/叶功能","S2":"📖 Comp P5 第 4","S3":"📚 Vocab U7"},"Tue":{"S1":"✏️ Grammar U4+Editing 7","S2":"🔬 花/果实/ 种子功能","S3":"➗ 错题"},"Wed":{"S1":"🔬 P3 整章思维导图","S2":"✏️ 作文","S3":"📚 Vocab U8"},"Thu":{"S1":"📖 Cloze 第 4","S2":"🔬 P3 综合练习","S3":"✏️ Editing 8"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W5 准备(进 P4 难章!)"},"Sat":{"AM":"🔬 P3 综合测试 + 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + P3 全章思维导图","S2":"➗ 数学 + 📓 月评估(W4)"}}},{"week":5,"date":"6.1-6.7","theme":"P4 Plant Transport ⭐ — 难章第 1 周(概念建立)","goal":"⭐ 难章第 1 周:概念建立,不急刷题","days":{"Mon":{"S1":"🔬 教材精读(运输系统结构)","S2":"📖 Comp P5 第 5","S3":"📚 Vocab U9"},"Tue":{"S1":"✏️ Grammar U5+Editing 9","S2":"🔬 教材精读(xylem 运水)","S3":"➗ 错题"},"Wed":{"S1":"🔬 芹菜染色实验分析","S2":"✏️ 作文","S3":"📚 Vocab U10"},"Thu":{"S1":"📖 Cloze 第 5","S2":"🔬 概念图(英文术语)","S3":"✏️ Editing 10"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W6 准备(深化)"},"Sat":{"AM":"🔬 补习(Plant Transport 概念)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 运输流程图","S2":"➗ 数学 + 📓 复盘"}}},{"week":6,"date":"6.8-6.14","theme":"P4 Plant Transport ⭐ — 难章第 2 周(深化应用)","goal":"⭐ Plant Transport 收官:确认能独立应对开放题","days":{"Mon":{"S1":"🔬 高频题型练习","S2":"📖 Comp P5 第 6","S3":"📚 Vocab U11"},"Tue":{"S1":"✏️ Grammar U6+Editing 11","S2":"🔬 开放题专项(关键词)","S3":"➗ 错题"},"Wed":{"S1":"🔬 实验设计题专项","S2":"✏️ 作文","S3":"📚 Vocab U12"},"Thu":{"S1":"📖 Cloze 第 6","S2":"🔬 章节综合测试","S3":"✏️ Editing 12"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W7 准备"},"Sat":{"AM":"🔬 综合测试 + 错题分析","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 错题重做","S2":"➗ 数学 + 📓 复盘"}}},{"week":7,"date":"6.15-6.21","theme":"P4 Digestive System ⭐⭐ — 难章第 1 周","goal":"⭐⭐ Digestive 第 1 周:完整路径必须烂熟","days":{"Mon":{"S1":"🔬 口腔/食道(化学+物理消化)","S2":"📖 Comp P5 第 7","S3":"📚 Vocab U13"},"Tue":{"S1":"✏️ Grammar U7+Editing 13","S2":"🔬 胃(胃酸+ 蛋白消化)","S3":"➗ 错题"},"Wed":{"S1":"🔬 小肠(吸收营养)+ 大肠(吸水)","S2":"✏️ 作文","S3":"📚 Vocab U14"},"Thu":{"S1":"📖 Cloze 第 7","S2":"🔬 完整消化路径流程图","S3":"✏️ Editing 14"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W8 准备(深化)"},"Sat":{"AM":"🔬 补习(Digestive 概念)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 消化路径图","S2":"➗ 数学 + 📓 复盘"}}},{"week":8,"date":"6.22-6.28","theme":"P4 Digestive System ⭐⭐ — 难章第 2 周","goal":"⭐⭐ Digestive 收官 + W8 月评估","days":{"Mon":{"S1":"🔬 PSLE 高频题型(消化路径)","S2":"📖 Comp P5 第 8","S3":"📚 Vocab U15"},"Tue":{"S1":"✏️ Grammar U8+Editing 15","S2":"🔬 营养素(糖 /蛋白/脂)消化对应","S3":"➗ 错题"},"Wed":{"S1":"🔬 实验题(酶活性)+ 开放题","S2":"✏️ 作文","S3":"📚 Vocab U16"},"Thu":{"S1":"📖 Cloze 第 8","S2":"🔬 章节综合测试","S3":"✏️ Editing 16"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W9 准备"},"Sat":{"AM":"🔬 综合测试 + 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + Digestive 错题重做","S2":"➗ 数学 + 📓 月评估(W8)"}}},{"week":9,"date":"6.29-7.5","theme":"P4 Matter + Mass/Volume — 易章速览","goal":null,"days":{"Mon":{"S1":"🔬 三态 + 状态变化(P5 复习)","S2":"📖 Comp P5 第 9","S3":"📚 Vocab U17"},"Tue":{"S1":"✏️ Grammar U9+Editing 17","S2":"🔬 Mass vs Volume 区分","S3":"➗ 错题"},"Wed":{"S1":"🔬 Activity 实验题(测量)","S2":"✏️ 作文","S3":"📚 Vocab U18"},"Thu":{"S1":"📖 Cloze 第 9","S2":"🔬 Matter+M/ V 章节小测","S3":"✏️ Editing 18"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W10 准备(进难章)"},"Sat":{"AM":"🔬 补习 / 自学错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 概念图","S2":"➗ 数学 + 📓 复盘"}}},{"week":10,"date":"7.6-7.12","theme":"P4 Light & Shadow ⭐ — 难章第 1 周","goal":null,"days":{"Mon":{"S1":"🔬 光源 + 直线传播","S2":"📖 Comp P5 第 10","S3":"📚 Vocab U19"},"Tue":{"S1":"✏️ Grammar U10+Editing 19","S2":"🔬 反射 + 镜面 vs 漫反射","S3":"➗ 错题"},"Wed":{"S1":"🔬 影子形成原理 + 实验","S2":"✏️ 作文","S3":"📚 Vocab U20"},"Thu":{"S1":"📖 Cloze 第 10","S2":"🔬 不透明/半透明/透明对比","S3":"✏️ Editing 20"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W11 准备"},"Sat":{"AM":"🔬 补习(光学概念)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 光学概念图","S2":"➗ 数学 + 📓 复盘"}}},{"week":11,"date":"7.13-7.19","theme":"P4 Light & Shadow ⭐ — 难章第 2 周","goal":"⭐ Light 收官:实验题答题模板熟练","days":{"Mon":{"S1":"🔬 影子大小 vs 光源距离","S2":"📖 Comp P5 第 11","S3":"📚 Vocab U21"},"Tue":{"S1":"✏️ Grammar U11+Editing 21","S2":"🔬 影子方向 vs 光源位置","S3":"➗ 错题"},"Wed":{"S1":"🔬 实验设计题专项","S2":"✏️ 作文","S3":"📚 Vocab U22"},"Thu":{"S1":"📖 Cloze 第 11","S2":"🔬 章节综合测试","S3":"✏️ Editing 22"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W12 准备"},"Sat":{"AM":"🔬 综合测试 + 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + Light 错题重做","S2":"➗ 数学 + 📓 复盘"}}},{"week":12,"date":"7.20-7.26","theme":"P4 Heat Energy ⭐⭐ — 难章第 1 周","goal":"⭐⭐ Heat 第 1 周:三种热传递必须区分清晰","days":{"Mon":{"S1":"🔬 温度 vs 热(区分)","S2":"📖 Comp P5 第 12","S3":"📚 Vocab U23"},"Tue":{"S1":"✏️ Grammar U12+Editing 23","S2":"🔬 热传导(良导体/绝缘体)","S3":"➗ 错题"},"Wed":{"S1":"🔬 对流(流体)+ 辐射(无介质)","S2":"✏️ 作文","S3":"📚 Vocab U24"},"Thu":{"S1":"📖 Cloze 第 12","S2":"🔬 热膨胀冷缩(实验)","S3":"✏️ Editing 24"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W13 准备"},"Sat":{"AM":"🔬 补习(Heat 概念)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 热传递对比图","S2":"➗ 数学 + 📓 复盘"}}},{"week":13,"date":"7.27-8.2","theme":"P4 Heat Energy ⭐⭐ — 难章第 2 周","goal":"⭐⭐ Heat 收官 + 难章全部完成","days":{"Mon":{"S1":"🔬 PSLE 高频题型(Heat)","S2":"📖 Comp P5 第 13","S3":"📚 Vocab U25"},"Tue":{"S1":"✏️ Grammar U13+Editing 25","S2":"🔬 开放题专项(为什么/解释)","S3":"➗ 错题"},"Wed":{"S1":"🔬 综合应用题(三种传递混合)","S2":"✏️ 作文","S3":"📚 Vocab U26"},"Thu":{"S1":"📖 Cloze 第 13","S2":"🔬 章节综合测试","S3":"✏️ Editing 26"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W14 准备(收尾)"},"Sat":{"AM":"🔬 综合测试 + 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + Heat 错题重做","S2":"➗ 数学 + 📓 复盘"}}},{"week":14,"date":"8.3-8.9","theme":"P4 Magnets + P3-P4 综合模拟卷 🎯","goal":"🎯🎯 第一阶段收官:P3-P4 综合模拟卷 + 大复盘","days":{"Mon":{"S1":"🔬 磁体属性 + 磁极相吸相斥","S2":"📖 Comp P5 第 14","S3":"📚 Vocab U27"},"Tue":{"S1":"✏️ Grammar U14+Editing 27","S2":"🔬 磁性材料 + 磁化","S3":"➗ 错题"},"Wed":{"S1":"🔬 磁场 + 应用题","S2":"✏️ 作文","S3":"📚 Vocab U28"},"Thu":{"S1":"📖 Cloze 第 14","S2":"🔬 Magnets 章节小测","S3":"✏️ Editing 28"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W15 准备(P5 收尾)"},"Sat":{"AM":"🔬 P3-P4 综合模拟卷(限时 1h45min)+ 错题分析","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 模考 + 整体复盘","S2":"➗ 数学 + 🎯 第一阶段大复盘 + W15 启动"}}},{"week":15,"date":"8.10-8.16","theme":"P5 启动:Reproduction","goal":"W15 启动 P5 系统提升期","days":{"Mon":{"S1":"🔬 P5 Plant Reproduction(植物繁殖)","S2":"📖 Comp P5 第 15","S3":"📚 Vocab 6 U1"},"Tue":{"S1":"✏️ Grammar U15+Editing 29","S2":"🔬 Human Reproduction","S3":"➗ 错题"},"Wed":{"S1":"🔬 Reproduction 配套练习","S2":"✏️ 作文","S3":"📚 Vocab 6 U2"},"Thu":{"S1":"📖 Cloze 第 15","S2":"🔬 P5 vs P3-P4 衔接整理","S3":"✏️ Editing 30"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W16 准备"},"Sat":{"AM":"🔬 补习(P5 启动)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + Reproduction 概念图","S2":"➗ 数学 + 📓 复盘"}}},{"week":16,"date":"8.17-8.23","theme":"P5 Cells + Energy from Food","goal":"Vocab 5 完成 ✅","days":{"Mon":{"S1":"🔬 Cells 结构(植物 vs 动物)","S2":"📖 Comp P5 第 16","S3":"📚 Vocab 6 U3"},"Tue":{"S1":"✏️ Grammar U16+Editing 31","S2":"🔬 食物链 + 食物网","S3":"➗ 错题"},"Wed":{"S1":"🔬 Cells 配套练习","S2":"✏️ 作文","S3":"📚 Vocab 6 U4"},"Thu":{"S1":"📖 Cloze 第 16","S2":"🔬 Energy from Food 续","S3":"✏️ Editing 32"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W17 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 概念图","S2":"➗ 数学 + 📓 复盘"}}},{"week":17,"date":"8.24-8.30","theme":"P5 Water + Air & Weather","goal":null,"days":{"Mon":{"S1":"🔬 P5 水循环深化","S2":"📖 Comp P5 第 17","S3":"📚 Vocab 6 U5"},"Tue":{"S1":"✏️ Grammar U17+Editing 33","S2":"🔬 Air 组成 + 气压","S3":"➗ 错题"},"Wed":{"S1":"🔬 Weather 类型 + 测量","S2":"✏️ 作文","S3":"📚 Vocab 6 U6"},"Thu":{"S1":"📖 Cloze 第 17","S2":"🔬 Water/Air 综合练习","S3":"✏️ Editing 34"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W18 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 概念图","S2":"➗ 数学 + 📓 复盘"}}},{"week":18,"date":"8.31-9.6","theme":"P5 Forms of Energy","goal":null,"days":{"Mon":{"S1":"🔬 Kinetic + Potential Energy","S2":"📖 Comp P5 第 18","S3":"📚 Vocab 6 U7"},"Tue":{"S1":"✏️ Grammar U18+Editing 35","S2":"🔬 Sound + Electrical","S3":"➗ 错题"},"Wed":{"S1":"🔬 Energy 综合分类","S2":"✏️ 作文","S3":"📚 Vocab 6 U8"},"Thu":{"S1":"📖 Cloze 第 18","S2":"🔬 Energy 配套练习","S3":"✏️ Editing 36"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W19 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + Energy 表格","S2":"➗ 数学 + 📓 复盘"}}},{"week":19,"date":"9.7-9.13","theme":"P5 Energy Conversions","goal":null,"days":{"Mon":{"S1":"🔬 能量转换例子(灯泡/风扇/太阳能)","S2":"📖 Comp P5 第 19","S3":"📚 Vocab 6 U9"},"Tue":{"S1":"✏️ Grammar U19+Editing 37","S2":"🔬 Sources(可再生 vs 不可再生)","S3":"➗ 错题"},"Wed":{"S1":"🔬 Energy efficiency 概念","S2":"✏️ 作文","S3":"📚 Vocab 6 U10"},"Thu":{"S1":"📖 Cloze 第 19","S2":"🔬 综合练习","S3":"✏️ Editing 38"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W20 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + Energy 整章图","S2":"➗ 数学 + 📓 复盘"}}},{"week":20,"date":"9.14-9.20","theme":"P5 Electricity 基础 ⭐","goal":"⭐ Electricity 是 PSLE 高频考点,重点掌握","days":{"Mon":{"S1":"🔬 电流/电压 /电阻基础","S2":"📖 Comp P5 第 20","S3":"📚 Vocab 6 U11"},"Tue":{"S1":"✏️ Grammar U20+Editing 39","S2":"🔬 简单电路(电池+灯+ 开关)","S3":"➗ 错题"},"Wed":{"S1":"🔬 导体 vs 绝缘体 + 安全","S2":"✏️ 作文","S3":"📚 Vocab 6 U12"},"Thu":{"S1":"📖 Cloze 第 20","S2":"🔬 电路图实操","S3":"✏️ Editing 40"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W21 准备"},"Sat":{"AM":"🔬 补习(电学重点)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 电路图练习","S2":"➗ 数学 + 📓 复盘"}}},{"week":21,"date":"9.21-9.27","theme":"P5 Series & Parallel 电路 ⭐","goal":null,"days":{"Mon":{"S1":"🔬 串联电路特点(电流相同/电压分配)","S2":"📖 Comp P5 第 21","S3":"📚 Vocab 6 U13"},"Tue":{"S1":"✏️ Grammar U21+Editing 41","S2":"🔬 并联电路特点","S3":"➗ 错题"},"Wed":{"S1":"🔬 串并联综合题","S2":"✏️ 作文","S3":"📚 Vocab 6 U14"},"Thu":{"S1":"📖 Cloze 第 21","S2":"🔬 PSLE 电路题专项","S3":"✏️ Editing 42"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W22 准备"},"Sat":{"AM":"🔬 补习(电路深化)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 电路对比表","S2":"➗ 数学 + 📓 复盘"}}},{"week":22,"date":"9.28-10.4","theme":"P5 综合复习 1","goal":null,"days":{"Mon":{"S1":"🔬 P5 Cycles 总复习","S2":"📖 Comp P5 第 22","S3":"📚 Vocab 6 U15"},"Tue":{"S1":"✏️ Grammar U22+Editing 43","S2":"🔬 P5 Systems 总复习","S3":"➗ 错题"},"Wed":{"S1":"🔬 P5 综合卷 1","S2":"✏️ 作文","S3":"📚 Vocab 6 U16"},"Thu":{"S1":"📖 Cloze 第 22","S2":"🔬 综合卷错题分析","S3":"✏️ Editing 44"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W23 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + P5 思维导图","S2":"➗ 数学 + 📓 复盘"}}},{"week":23,"date":"10.5-10.11","theme":"P5 综合复习 2","goal":null,"days":{"Mon":{"S1":"🔬 P5 Energy 总复习","S2":"📖 Comp P5 第 23","S3":"📚 Vocab 6 U17"},"Tue":{"S1":"✏️ Grammar U23+Editing 45","S2":"🔬 P5 Electricity 总复习","S3":"➗ 错题"},"Wed":{"S1":"🔬 P5 综合卷 2","S2":"✏️ 作文","S3":"📚 Vocab 6 U18"},"Thu":{"S1":"📖 Cloze 第 23","S2":"🔬 综合卷错题","S3":"✏️ Editing 46"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W24 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 整理 P5 大图","S2":"➗ 数学 + 📓 复盘"}}},{"week":24,"date":"10.12-10.18","theme":"P5 综合卷模拟 + 弱项回填","goal":null,"days":{"Mon":{"S1":"🔬 P5 综合卷 1(限时)","S2":"📖 Comp P5 第 24","S3":"📚 Vocab 6 U19"},"Tue":{"S1":"✏️ Grammar U24+Editing 47","S2":"🔬 综合卷 1 错题分析","S3":"➗ 错题"},"Wed":{"S1":"🔬 弱项章节回填","S2":"✏️ 作文","S3":"📚 Vocab 6 U20"},"Thu":{"S1":"📖 Cloze 第 24","S2":"🔬 P5 综合卷 2(限时)","S3":"✏️ Editing 48"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W25 准备"},"Sat":{"AM":"🔬 综合卷 2 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + 整体掌握度自评","S2":"➗ 数学 + 📓 复盘"}}},{"week":25,"date":"10.19-10.25","theme":"P5 整体串讲 + Visual Text 启动","goal":null,"days":{"Mon":{"S1":"🔬 P5 整体串讲(联系 P3-P4)","S2":"📖 Comp P5 第 25","S3":"📚 Vocab 6 U21"},"Tue":{"S1":"✏️ Grammar U25+Editing 49","S2":"🔬 弱项专项练习","S3":"➗ 错题"},"Wed":{"S1":"🔬 PSLE 题型熟悉(开放题)","S2":"✏️ 作文","S3":"📚 Vocab 6 U22"},"Thu":{"S1":"📖 Cloze 第 25 + Visual Text 6 第 1 套","S2":"🔬 实验题专项","S3":"✏️ Editing 50"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W26 准备(总模考)"},"Sat":{"AM":"🔬 综合练习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🇨🇳 真题 + P3- P5 大思维导图","S2":"➗ 数学 + 📓 复盘"}}},{"week":26,"date":"10.26-11.1","theme":"🎯 第一阶段总模考","goal":"🎯🎯 第一阶段总模考(W26)— 26 周收官 + W27 进入第二阶段","days":{"Mon":{"S1":"🔬 科学总模考(限时 1h45min)","S2":"📖 英语模考 Paper 1+2","S3":"📚 Vocab 6 U23"},"Tue":{"S1":"🔬 模考全卷讲评 + 错题","S2":"📖 英语错题分析","S3":"➗ 数学错题"},"Wed":{"S1":"🔬 弱项章节回填","S2":"🇨🇳 华文模考 + 错题","S3":"📚 Vocab 6 U24"},"Thu":{"S1":"📖 Cloze 第 26","S2":"➗ 数学模考 + 错题","S3":"✏️ Editing 52"},"Fri":{"S1":"➗ 难题","S2":"🗣️ 听力+口试","S3":"📋 W27 第二阶段准备"},"Sat":{"AM":"🔬 P6 难度卷 1 套(预热)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🎯 第一阶段大复盘 + 核对表","S2":"➗ 数学 + 🎯 第二阶段启动准备"}}}];

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
    exchanges: []
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
      desc: '科学 82+ 分(由家长在管理页确认)',
      points: 50,
      type: 'special',
      adminOnly: true
    });
  }
  if (weekNum === 20) {
    items.push({
      id: 'w20',
      label: '📚 W20 P5 综合复习达标',
      desc: '平均 82+ 分(由家长在管理页确认)',
      points: 30,
      type: 'special',
      adminOnly: true
    });
  }
  if (weekNum === 26) {
    items.push({
      id: 'w26',
      label: '🏆 W26 第一阶段总模考达标',
      desc: '4 科都达标:英 72+/科 88+/数 90+/华 88+',
      points: 100,
      type: 'special',
      adminOnly: true
    });
  }

  return items;
}

// ============= 任务"怎么做"提示(从手册 v9 章节 IV/IX/XII 提炼) =============
// 输入任务文本,输出 1-2 句具体执行方法。匹配多个则取第一个。
function getTaskTip(task) {
  if (!task) return '';
  const t = String(task);

  // ===== 复盘类 =====
  if (/月评估|大复盘|月模考/.test(t))
    return '🎯 大复盘:看模考成绩 → 检查这月哪些任务没做完 → 决定下月调整(花 2h)';
  if (/复盘|错题本复盘|📓/.test(t))
    return '📓 周日 19:30-21:00 做 5 件事:① 本周打钩 ② 错题入册 ③ 看下周卡 ④ 教材摆桌 ⑤ 作文题确定';
  if (/W\d+ ?准备|准备\(P5|准备\(进/.test(t))
    return '📋 把下周教材按周一到周日顺序摆好;作文题写在作文本第一行';
  if (/总模考|科学总模考|英语模考/.test(t))
    return '🎯 完整模拟 4 科,考完整理错题本,对照目标分(英 72+/科 88+/数 90+/华 88+)';

  // ===== 科学 =====
  if (/教材精读|精读/.test(t))
    return '🔬 通读 + 划重点 + 概念图(写英文术语)。番茄钟 25min 专注 + 5min 起立喝水';
  if (/概念图|思维导图/.test(t))
    return '🧠 分支整理章节 + 写英文术语 + 标 PSLE 高频考点';
  if (/实验设计|实验题/.test(t))
    return '🧪 答题模板:① 假设 ② 控制变量 ③ 步骤 ④ 结论。注意控制变量法';
  if (/开放题|为什么/.test(t))
    return '💡 关键词答题法:答案必须含原文核心词;为什么类用"因为...所以..."';
  if (/章节小测|配套练习|Activity/.test(t))
    return '📝 限时 20-30min,正确率 70%+ 才能进下章。错题立刻入错题本';
  if (/综合测试|综合模拟|综合卷|综合练习/.test(t))
    return '⏱️ 限时 PSLE 真实时长(1h45min)。错题分类:粗心/概念/题型';
  if (/补习/.test(t))
    return '👨‍🏫 补习课:带上一周错题本,让老师专门讲不懂的点';
  if (/^🔬|🔬/.test(t))
    return '🔬 教材 + Activity Book 配套。英文术语必背,实验题答题模板要熟';

  // ===== 英语 =====
  if (/Comp|阅读理解/.test(t))
    return '📖 定位法:先看题目找关键词再回原文。OE 答案必含原文核心词';
  if (/Cloze|完形/.test(t))
    return '✍️ 一空一词无选项。每错查 3 件事:同义词/词性/固定搭配。建词汇错题本按主题分';
  if (/Editing/.test(t))
    return '✏️ 5 类错误分类记本:主谓一致/时态/拼写/介词/冠词';
  if (/Grammar/.test(t))
    return '📚 MCQ 50 题/周。错题不光改答案,要分析为什么选错';
  if (/作文计划/.test(t))
    return '📝 列大纲:开头-发展-高潮-结尾;选 3-5 个高级词汇背好';
  if (/作文.*重写|重写.*作文/.test(t))
    return '🔁 照着老师标的地方重写一次 — 不重写 = 白改';
  if (/作文/.test(t))
    return '✏️ 周六 15:45-17:00 写,周一交老师改。模板库:开头/转折/结尾各 5 种背熟';
  if (/Vocab|词汇/.test(t))
    return '📚 每天 5 个,按主题分类(travel/school/nature/emotion)';
  if (/听力.*口试|口试.*听力|🗣/.test(t))
    return '🎤 朗读 1 段英文录音回放找发音错;看图说话 3 句扩展:看到→联想→个人经历';
  if (/听力/.test(t))
    return '🎧 每天 15min CNA938 / okto;周六晚 1 套听力题';
  if (/Visual Text/.test(t))
    return '🖼️ Visual Text:看图答题,注意图片中文字 + 数字 + 颜色暗示';
  if (/Practice Package/.test(t))
    return '📦 综合包套题:限时做完 + 老师批 Comp 部分';

  // ===== 数学 =====
  if (/数学.*模考|数学.*真题|数学.*错题/.test(t))
    return '🔢 限时 1h30min。错题本必填:粗心/公式/题型 三类';
  if (/难题|P5 难题/.test(t))
    return '🧮 限时 30min 做。做不出抄思路下次回看,不死磕';
  if (/^➗ 错题|错题.*数学|^➗/.test(t))
    return '➗ 抄题 → 错的原因 → 正确解法。每题 3 行';

  // ===== 华文 =====
  if (/华文|🇨🇳/.test(t)) {
    if (/作文/.test(t)) return '🇨🇳 华文作文:用规律句型 + 周末交老师改';
    if (/真题|模拟|模考/.test(t)) return '🇨🇳 限时模拟,作文+阅读分开计时';
    return '🇨🇳 词汇 + 阅读为主,周日上午 1.25h 完成';
  }

  // ===== 其它 =====
  if (/启动|阶段大复盘|第二阶段启动/.test(t))
    return '🚀 阶段交接:整理上阶段错题本 + 看下阶段计划 + 教材准备';

  return '';  // 找不到对应 tip 就不显示
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
  const order = ['AM', 'PM', 'S1', 'S2', 'S3'];
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

function saveState(state) {
  let ok = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('保存数据失败', e);
    ok = false;
  }
  // 同时镜像写到 Firestore(不阻塞)
  if (_fbReady && _fbDoc) {
    setFbStatus('syncing');
    _fbDoc.set(state).then(
      () => setFbStatus('synced'),
      e => { console.warn('Firestore 写入失败:', e); setFbStatus('error'); }
    );
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
