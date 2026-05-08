/**
 * 数据存储 + 规则引擎 (v2)
 * v2 新增:每日打卡 (state.daily) + 周完成率分析
 * 当前用 localStorage,后续可以替换为 Firebase
 */

// ============= 73 周日期映射 (v16) =============
const WEEK_DATES = ['5.4-5.10', '5.11-5.17', '5.18-5.24', '5.25-5.31', '6.1-6.7', '6.8-6.14', '6.15-6.21', '6.22-6.28', '6.29-7.5', '7.6-7.12', '7.13-7.19', '7.20-7.26', '7.27-8.2', '8.3-8.9', '8.10-8.16', '8.17-8.23', '8.24-8.30', '8.31-9.6', '9.7-9.13', '9.14-9.20', '9.21-9.27', '9.28-10.4', '10.5-10.11', '10.12-10.18', '10.19-10.25', '10.26-11.1', '11.2-11.8', '11.9-11.15', '11.16-11.22', '11.23-11.29', '11.30-12.6', '12.7-12.13', '12.14-12.20', '12.21-12.27', '12.28-1.3', '1.4-1.10', '1.11-1.17', '1.18-1.24', '1.25-1.31', '2.1-2.7', '2.8-2.14', '2.15-2.21', '2.22-2.28', '3.1-3.7', '3.8-3.14', '3.15-3.21', '3.22-3.28', '3.29-4.4', '4.5-4.11', '4.12-4.18', '4.19-4.25', '4.26-5.2', '5.3-5.9', '5.10-5.16', '5.17-5.23', '5.24-5.30', '5.31-6.6', '6.7-6.13', '6.14-6.20', '6.21-6.27', '6.28-7.4', '7.5-7.11', '7.12-7.18', '7.19-7.25', '7.26-8.1', '8.2-8.8', '8.9-8.15', '8.16-8.22', '8.23-8.29', '8.30-9.5', '9.6-9.12', '9.13-9.19', '9.20-9.26'];

const WEEK_THEMES = [
  'P3 Diversity(动+植+材料)— 易章速览',
  'P3 Plant Life Cycle — 中等节奏',
  'P3 Animal Life Cycle — 中等节奏',
  'P3 Plant Parts + P3 整合测试',
  'P4 Plant Transport ⭐ — 难章第 1 周(概念建立)',
  'P4 Plant Transport ⭐ — 难章第 2 周(深化应用)',
  'P4 Digestive System ⭐⭐ — 难章第 1 周',
  'P4 Digestive System ⭐⭐ — 难章第 2 周',
  'P4 Matter + Mass/Volume — 易章速览',
  'P4 Light & Shadow ⭐ — 难章第 1 周',
  'P4 Light & Shadow ⭐ — 难章第 2 周',
  'P4 Heat Energy ⭐⭐ — 难章第 1 周',
  'P4 Heat Energy ⭐⭐ — 难章第 2 周',
  'P4 Magnets + P3-P4 综合模拟卷 🎯',
  'P5 启动:Reproduction',
  'P5 Cells + Energy from Food',
  'P5 Water + Air & Weather',
  'P5 Forms of Energy',
  'P5 Energy Conversions',
  'P5 Electricity 基础 ⭐',
  'P5 Series & Parallel 电路 ⭐',
  'P5 综合复习 1',
  'P5 综合复习 2',
  'P5 综合卷模拟 + 弱项回填',
  'P5 整体串讲 + Visual Text 启动',
  '🎯 第一阶段总模考',
  'P5 光合作用深化',
  'P5 Air & Weather',
  'P5 能量形式',
  'P5 能量转换 + Practice Package 启动',
  'P5 电学基础 ⭐',
  'P5 串并联电路 ⭐ + 月模考 1',
  'P6 Adaptations 启动',
  'P5 总复习 + 月模考 1 收尾',
  'P6 Electrical Systems 启动 ⭐',
  'P6 Electrical Systems 续',
  'P6 Forces 基础 ⭐',
  'P6 Forces 续 + 月模考 2',
  'P6 Interactions:食物链/网',
  'P6 生态系统的相互作用',
  'P6 食物中的能量',
  'P6 Adaptations 深化 + 月模考 3',
  'MC PSLE Guide + 科学真题 1',
  'PSLE Guide + 科学真题 2',
  'PSLE Guide + 科学真题 3',
  'PSLE Guide + 科学真题 4 + 月模考 4',
  '科学真题 5 + 英语真题 1',
  '科学真题 6 + Practice Package 6',
  '科学真题 7 + 英语真题 2',
  '科学真题 8 + Practice Package 6',
  '科学真题 9 + 英语真题 3',
  '🎯 第二阶段总收官 + 全科总模考',
  '🎯 第三阶段启动 — 全科真题暖身',
  '第三阶段第 2 周 — 暖身延续',
  '弱项专题攻关(科学薄弱章节)',
  '弱项专题攻关 + 第 1 次月度模考',
  '6 月启动 — 模考强度提升',
  '第 2 次全科模考',
  '真题冲刺 + 错题专项',
  '6 月收官 + 第 3 次月度模考',
  '7 月启动 — 限时刷题',
  '限时刷题第 2 周',
  '倒数 4 周 — 近 3 年真题精选',
  '倒数 3 周 — 第 4 次月度模考',
  '🎯 第三阶段最后完整模考(7.31 收题)',
  '🎯 8 月第 1 周 — 口试密集训练启动',
  '🎯 8 月第 2 周 — 8.12-13 口试考试',
  '8 月第 3 周 — 听力专项 + 错题第 1 轮',
  '8 月第 4 周 — 听力 + 错题第 2 轮',
  '🎯 9 月第 1 周 — 听力 + 9.15 听力考试准备',
  '9 月第 2 周 — 真题日刷 + 听力冲刺',
  '9 月第 3 周 — 9.15 听力考试 + 笔试冲刺',
  '🎯🎯🎯 PSLE 笔试周(9.24-30)'
];

// 关键里程碑周
const KEY_WEEKS = [4, 8, 12, 14, 20, 26, 34, 42, 52, 65, 68, 72, 73];

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
  // v18.22: 周末新作息按时长定分
  const weekendBig3 = ['WSF', 'WSS', 'WSM', 'WUH', 'WUR', 'WUM', 'WUS', 'WUE1'];  // 50-60min 大块
  const weekendMid2 = ['WSE', 'WSR', 'WSV', 'WUE2', 'WUP'];  // 30-60min 中
  const weekendSmall1 = ['WSL'];  // 15min 小
  // 旧 v14: AM/PM 大块=3, E1/S2 1h=2, VB 30min=1, OR/VC/LS/ED 短=1
  let base;
  if (slotKey === 'AM' || slotKey === 'PM') base = 3;
  else if (weekendBig3.includes(slotKey)) base = 2;
  else if (weekendMid2.includes(slotKey)) base = 2;
  else if (weekendSmall1.includes(slotKey)) base = 1;
  else if (slotKey === 'E1' || slotKey === 'S2') base = 2;
  else base = 1;
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
  VB: '21:00-21:30 Vocab/华文 (30min)',
  // v18.22: 周末新作息 slot keys
  WSE: '周六 09:00-10:00 周四作业/错题集 (建议周五晚优先)',
  WSF: '周六 10:00-11:00 美林作业',
  WSS: '周六 11:00-11:50 P5 科学练习册',
  WSL: '周六 11:50-12:05 听力 15min (4 步精听法)',
  WSM: '周六 14:00-14:50 P6 数学 paper 2',
  WSR: '周六 19:50-20:20 美林课要点回顾 (趁记忆热)',
  WSV: '周六 20:30-21:00 本周复盘 + 家庭聊天',
  WUH: '周日 10:35-11:30 恒瑞作业 (课后立刻做)',
  WUR: '周日 11:30-12:00 阅读理解 1 篇',
  WUM: '周日 14:00-14:50 数学 PSLE paper 1',
  WUS: '周日 15:00-15:50 P5 科学练习册',
  WUE1: '周日 18:30-19:30 美玲周五作业 part 1 (1h)',
  WUE2: '周日 19:45-20:30 美玲周五作业 part 2 + cloze 收尾',
  WUP: '周日 20:30-21:00 下周计划 + 整理书包'
};

const DAY_LABELS = {
  Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四',
  Fri: '周五', Sat: '周六', Sun: '周日'
};
const DAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ============= 兑换汇率 (v18.33 起: 1 积分 = 0.05 SGD) =============
// 30000 积分 (神龙装备线) = SGD 1500 终极大奖
const SGD_PER_POINT = 0.05;
const ULTIMATE_PRIZE_SGD = 1500;
const ULTIMATE_PRIZE_POINTS = ULTIMATE_PRIZE_SGD / SGD_PER_POINT;  // = 30000

// ============= v16: 6 条核心铁律 (每天主页轮换 1 条) =============
const IRON_RULES = [
  { n: 1, title: '加速 ≠ 蒙混', body: '每章学完必须独立做对 70%+。不达标立刻回头补,不要往前走。' },
  { n: 2, title: '错题本是命根子', body: '科/英/数各 1 本。每错一题写: 抄题 → 错的原因 → 正确解法。每周日 0.5h 翻错题本。' },
  { n: 3, title: '老师改作文不能省', body: '英语作文每周 2 篇,华文 1 篇。改完必须照标重写一次。30-50 SGD/篇,这是最不该省的钱。' },
  { n: 4, title: '18:00-19:00 必须离开书桌', body: '吃饭、散步、看窗外都行,不能写题。这 1h 决定段 2 的效率。' },
  { n: 5, title: '22:00 准时熄灯 + 周日下午雷打不动休息', body: '平日 22:00 必须熄灯 (21:30 开始洗漱)。周日 14:00-18:00 神圣不可侵犯。' },
  { n: 6, title: '每月最后一个周日大调整', body: '花 2h:看模考分对照目标 → 检查任务完成情况 → 决定下月调整。' }
];

// ============= v16: 周日 19:30 复盘 5 步流程 =============
const SUNDAY_REVIEW_STEPS = [
  '① 本周打钩:把这周完成的任务在卡片上画 ✅',
  '② 错题入册:把本周的错题分类记到对应错题本',
  '③ 看下周卡片:打开 App 切到下周',
  '④ 教材摆桌:把下周要用的教材按周一到周日顺序摆好',
  '⑤ 作文题确定:把下周作文题写在作文本第一行'
];

// ============= v16 附录 B: 学科英语词汇 500 词 =============
// 数学 200 (W1-W7) + 科学 300 (W8-W17), 来自 v16 §附录B
// 每周对应 ~30 词, slot 内 📚 按钮点击弹出
const VOCAB_500 = {
  math: {
    weeks: '1-7', total: 200,
    sections: [
      { title: '几何与测量', words: ['perimeter','area','volume','length','breadth','height','width','depth','edge','vertex','face','side','base','apex','surface','square','rectangle','triangle','circle','oval','polygon','pentagon','hexagon','octagon','parallel','perpendicular','equilateral','isoceles','scalene','right-angled','acute','obtuse','reflex','straight','circumference','radius','diameter','chord','arc','sector','segment','cuboid','cube','cylinder','cone','sphere','prism','pyramid'] },
      { title: '数与运算', words: ['quotient','remainder','dividend','divisor','numerator','denominator','mixed number','improper fraction','equivalent fraction','simplest form','decimal','decimal place','place value','digit','factor','multiple','prime','composite','lowest common multiple','highest common factor','product','sum','difference','multiply','divide','add','subtract','estimate','approximate','round off','nearest'] },
      { title: '比与比例', words: ['ratio','proportion','percentage','scale','equivalent ratio','rate','speed','distance','time','average speed','discount','profit','loss','GST','percentage increase','percentage decrease'] },
      { title: '数据与统计', words: ['ascending','descending','median','mean','mode','range','graph','bar graph','line graph','pie chart','histogram','frequency','data','table','axis','x-axis','y-axis','scale'] },
      { title: '运算操作动词', words: ['substitute','evaluate','simplify','solve','calculate','represent','illustrate','show','demonstrate','indicate','compare','contrast','identify','classify','sort','arrange'] }
    ]
  },
  sci: {
    weeks: '8-17', total: 300,
    sections: [
      { title: '物质三态与变化', words: ['matter','mass','volume','density','weight','solid','liquid','gas','particle','melt','freeze','evaporate','condense','sublime','boil','melting point','freezing point','boiling point','evaporation','condensation','sublimation'] },
      { title: '力与运动', words: ['force','friction','gravity','magnetic force','elastic force','contact force','inertia','motion','speed','distance','acceleration','weight','mass','balance','scale','spring','push','pull','attract','repel','lift','support'] },
      { title: '热与温度', words: ['heat','temperature','conductor','insulator','heat gain','heat loss','heat transfer','contraction','expansion','Celsius','Fahrenheit','thermometer','degree'] },
      { title: '光与影', words: ['light','shadow','reflection','refraction','absorption','transparent','translucent','opaque','mirror','lens','source of light','ray','beam','focus','image'] },
      { title: '电', words: ['circuit','series circuit','parallel circuit','complete circuit','open circuit','battery','bulb','switch','wire','cell','conductor','insulator','current','voltage','resistance','electricity'] },
      { title: '生命科学:植物', words: ['photosynthesis','respiration','transpiration','germination','reproduction','root','stem','leaf','flower','fruit','seed','pollen','xylem','phloem','chlorophyll','stomata'] },
      { title: '生命科学:动物 + 人体', words: ['digestion','circulation','respiration','excretion','heart','lung','kidney','stomach','intestine','liver','skeleton','muscle','joint','nerve','blood vessel','mammal','reptile','amphibian','bird','fish','insect'] },
      { title: '生态与环境', words: ['ecosystem','habitat','environment','food chain','food web','producer','consumer','decomposer','predator','prey','adaptation','camouflage','hibernation','migration','water cycle','carbon cycle','evaporation','precipitation'] },
      { title: '实验与科学方法', words: ['experiment','observation','hypothesis','conclusion','variable','control','fair test','repeat','accuracy','prediction','apparatus','beaker','flask','test tube','measuring cylinder'] }
    ]
  }
};

// ============= v16.4: 听力资源 (PSLE-aligned: 儿童故事 + 儿童科普) =============
// 孩子在打卡页 listening 项目点 🔊 按钮唤出
// 选材原则: P5/P6 PSLE listening 实际语速 120-140 wpm + 儿童词汇,所以用儿童故事/儿童科普
// CNA938 直播降级到末尾 + 标"进阶 W15+"(成人语速 ~180 wpm 太快)
// v16.14: SG 本地 3 项置顶(PSLE 必须熟悉新加坡口音);其后国际趣味 → 英式
const LISTENING_RESOURCES = [
  // === 1) 🇸🇬 PSLE 真题(SG 口音 · 目标级别 · 起点)===
  { type: 'youtube', title: '🎬 PSLE 2020 English Listening', desc: '🇸🇬 历年真题(老题型对比)', videoId: 'YEna-0IhkU8',
    level: '🇸🇬 PSLE 真题', levelColor: '#FF9F45', episodeInfo: '35:28 · 1 个视频' },
  { type: 'youtube', title: '🎬 PSLE 2024 English Listening', desc: '🇸🇬 官方真题 Text 1-7 完整音频', videoId: '8ePjsfutd8E',
    level: '🇸🇬 PSLE 真题', levelColor: '#FF9F45', episodeInfo: '30:04 · 1 个视频' },
  { type: 'youtube', title: '🎬 PSLE 2025 English Listening', desc: '🇸🇬 官方真题 Text 1-7 完整音频', videoId: 'rrqzKUGXdnw',
    level: '🇸🇬 PSLE 真题', levelColor: '#FF9F45', episodeInfo: '11:25 · 1 个视频' },
  // === 2) 🇸🇬 SG 本地深度 + 直播(熟悉新加坡口音的核心)===
  {
    type: 'youtube-playlist',
    title: '🇸🇬 CNA Insider 新加坡深度(频道连播)',
    desc: '🇸🇬 本地长篇新闻调查 5-30 min · 真实 SG 口音听感,贴 PSLE',
    playlistId: 'UU_Lnb8ZHqqgLbp-7hltuT9w',
    level: '🇸🇬 SG · C1 高级',
    levelColor: '#FF5757',
    episodeInfo: '6227 集 · 自动连播'
  },
  {
    type: 'live-audio',
    title: '🎙️ CNA938 新加坡新闻直播',
    desc: '🇸🇬 24h 直播 — Mediacorp 新闻台,新加坡口音泛听首选',
    src: 'https://playerservices.streamtheworld.com/api/livestream-redirect/938NOW_PREM.aac',
    fallbackUrl: 'https://www.melisten.sg/radio/cna938',
    level: '🇸🇬 SG · 成人级',
    levelColor: '#FF5757',
    episodeInfo: '24h 直播'
  },
  // === 3) 🌎 国际趣味(美式 — 词汇/知识深化,但不强化 SG 口音)===
  {
    type: 'youtube-playlist',
    title: '🎓 TED-Ed 教育动画(频道连播)',
    desc: '🌎 5-15 min 动画课 — 科学/历史/数学/语言学,B2 中高级',
    playlistId: 'UUsooa4yRKGN_zEE8iknghZA',
    level: '🌎 B2 中高级 ⭐ 有趣',
    levelColor: '#FF9F45',
    episodeInfo: '2350 集 · 自动连播'
  },
  {
    type: 'youtube-playlist',
    title: '📚 Crash Course 学术速成(频道连播)',
    desc: '🌎 PBS 学术系列 — 文学/历史/生物/化学/物理,讲师生动',
    playlistId: 'UUX6b17PVsYBQ0ip5gyeme-Q',
    level: '🌎 B2-C1 学术 ⭐ 有趣',
    levelColor: '#FF9F45',
    episodeInfo: '1685 集 · 自动连播'
  },
  {
    type: 'youtube-playlist',
    title: '🔬 60-Second Science(频道连播)',
    desc: '🌎 Scientific American — 每集 60-90 秒科普短讯,适合泛听',
    playlistId: 'UU_xYMXx_-mAzheKyEtwtCAQ',
    level: '🌎 B2-C1 科普 ⭐ 短小',
    levelColor: '#FF9F45',
    episodeInfo: '1040 集 · 自动连播'
  },
  // === 4) 🇬🇧 英式(BBC 标准,跟 PSLE 略不同口音)===
  {
    type: 'youtube-playlist',
    title: '📺 BBC Learning English(频道连播)',
    desc: '🇬🇧 英式新闻 + 词汇 + 6 Minute English + News Review',
    playlistId: 'UUHaHD477h-FeBbVh9Sh7syA',
    level: '🇬🇧 B2-C1 进阶',
    levelColor: '#FF9F45',
    episodeInfo: '4314 集 · 自动连播'
  }
];

// ============= v16.10: 防沉迷 — 每日听力时间限制 =============
const LISTENING_DAILY_LIMIT_MIN = 30;  // 每天 30 分钟,达到自动关 modal 当天不能再开

function listeningTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getListeningSecondsToday(state) {
  if (!state || !state.listeningUsage) return 0;
  const k = listeningTodayKey();
  return (state.listeningUsage[k] && state.listeningUsage[k].seconds) || 0;
}

// 增量记录听力时长(秒);返回今日累计
function addListeningSeconds(state, secs) {
  if (!state.listeningUsage) state.listeningUsage = {};
  const k = listeningTodayKey();
  if (!state.listeningUsage[k]) state.listeningUsage[k] = { seconds: 0 };
  state.listeningUsage[k].seconds += secs;
  return state.listeningUsage[k].seconds;
}

// 是否今日已达上限(锁定状态)
function isListeningLocked(state) {
  return getListeningSecondsToday(state) >= LISTENING_DAILY_LIMIT_MIN * 60;
}

// 父母重置今日听力额度(在管理页通过密码后调用)
function resetListeningToday(state) {
  if (!state.listeningUsage) state.listeningUsage = {};
  const k = listeningTodayKey();
  state.listeningUsage[k] = { seconds: 0 };
}

// ============= v17.1: Daily Streak — Kahneman 损失厌恶 =============
// streak 阶梯:1-3 (轻);4-6 (轻+);7-29 (高);30-99 (高高);100+ (高高高)
function streakTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function streakDateAdd(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 给 streak 严重等级 0-4(对应惩罚强度 toast/小 modal/全屏/全屏延迟/全屏倒计时)
function streakSeverity(days) {
  if (days <= 3) return 0;
  if (days <= 6) return 1;
  if (days <= 29) return 2;
  if (days <= 99) return 3;
  return 4;
}

// 调用时机:孩子今天打了 ≥1 个 slot. 如果今天已计过则 no-op.
// 返回 { added: bool, days: N, isMilestone: 7|14|30|50|100|null, gainedFreeze: bool, brokenInfo: null|{prevDays} }
function bumpDailyStreak(state) {
  if (!state.dailyStreak) {
    state.dailyStreak = { days: 0, lastDate: null, bestEver: 0, freezeTokens: 0, brokenAt: null };
  }
  const s = state.dailyStreak;
  const today = streakTodayKey();
  if (s.lastDate === today) {
    return { added: false, days: s.days, isMilestone: null, gainedFreeze: false, brokenInfo: null };
  }
  // 算"昨天"
  const yesterday = streakDateAdd(today, -1);
  let brokenInfo = null;
  if (!s.lastDate) {
    // 全新用户: 第一天打卡
    s.days = 1;
  } else if (s.lastDate === yesterday) {
    // 连续: 累加
    s.days += 1;
  } else {
    // 断了 — 检查保护券
    if ((s.freezeTokens || 0) > 0) {
      s.freezeTokens -= 1;
      s.days += 1;  // 用券保住 streak
      brokenInfo = { usedFreeze: true, prevDays: s.days - 1 };
    } else {
      // 真断了: 记录历史最高,清零重新算
      const prev = s.days;
      if (prev > (s.bestEver || 0)) s.bestEver = prev;
      s.brokenAt = Date.now();
      s.days = 1;
      brokenInfo = { usedFreeze: false, prevDays: prev };
    }
  }
  s.lastDate = today;
  if (s.days > (s.bestEver || 0)) s.bestEver = s.days;
  // 里程碑: 7/14/30/50/100 给奖励
  let isMilestone = null;
  let gainedFreeze = false;
  if (s.days === 7) { isMilestone = 7; s.freezeTokens = Math.min(3, (s.freezeTokens || 0) + 1); gainedFreeze = true; }
  else if (s.days === 14) { isMilestone = 14; }
  else if (s.days === 30) { isMilestone = 30; s.freezeTokens = Math.min(3, (s.freezeTokens || 0) + 1); gainedFreeze = true; }
  else if (s.days === 50) { isMilestone = 50; }
  else if (s.days === 100) { isMilestone = 100; }
  // 之后每 14 天 +1 freeze (上限 3)
  if (s.days >= 14 && s.days % 14 === 0 && !isMilestone) {
    if ((s.freezeTokens || 0) < 3) { s.freezeTokens += 1; gainedFreeze = true; }
  }
  return { added: true, days: s.days, isMilestone, gainedFreeze, brokenInfo };
}

// 检查"是否当前正在 streak 断点 24h 灰烬期"
function isStreakInAshes(state) {
  const s = state.dailyStreak;
  if (!s || !s.brokenAt) return false;
  return (Date.now() - s.brokenAt) < 24 * 60 * 60 * 1000;
}

// ============= v17.1: 73 周每日 Wow 事实 =============
// 每周 1 条颠覆认知 + 与本周 PSLE 主题挂钩的事实
// 格式: { week, hook (短句钩子), body (80-150 字解释) }
// 主页卡显示 hook;点击展开 body
const WEEKLY_WOW_FACTS = [
  // ===== Phase 1 P3-P4 (W1-W14) =====
  { week:1, hook:'🦋 蝴蝶用脚尝味道, 不是用嘴!', body:'蝴蝶的味觉感受器在前足上 — 它停在花上"踩"几下, 就知道这朵花的花蜜值不值得喝。这就是为什么 PSLE P3 Diversity 章节里, 动物分类时要看"感官在身体哪部分"。' },
  { week:2, hook:'🌱 种子在土里能"听"到水', body:'种子萌发只需要 3 件事: 水 + 空气 + 温度 — 不需要阳光! 种子里的胚胎能感知周围水分子, 一旦水到位就开始膨胀破壳。这就是为什么干种子能存几十年, 一遇水就活。' },
  { week:3, hook:'🐞 蜻蜓飞行时眼睛能看到 360°', body:'蜻蜓的复眼有 30000 个小眼, 能 360° 全方位捕捉移动物体。这就是 P3 Animal Life Cycle 章节强调"成虫的感官 vs 幼虫"的差异 — 完全变态变出全新生物。' },
  { week:4, hook:'🌳 一棵大树 50% 的重量是空气', body:'树木的木质部主要是碳, 而碳来自空气中的 CO₂(光合作用!) — 不是来自土壤。所以你"看"到的树, 一半是从空中"长出来"的。P3 Plant Parts 章节核心。' },
  { week:5, hook:'🌳 30 米高的树没有泵, 怎么把水提到顶?', body:'靠叶子的"蒸腾"产生 suction(吸力)— 水在 xylem 里像一根连续的"水链"被叶子拽上去, 每天能输送 200 升。比工业水泵省能源 1000 倍。这是 P4 Plant Transport 难章核心。' },
  { week:6, hook:'🥀 植物为什么会"喝醉"?', body:'砍倒的木头放置时, xylem 里残留的水会被微生物发酵成酒精 — 古人就是这么发现"酒"的! Plant Transport 难章第 2 周, 注意 xylem 不只是"水管", 还是植物的"血管系统"。' },
  { week:7, hook:'🍔 你的胃酸 pH=1, 跟电池液一样腐蚀', body:'pH=1 的胃酸能溶解金属, 但胃壁每 3-4 天就换一层新细胞, 所以不被自己消化掉。 P4 Digestive 难章: 消化路径口→食道→胃→小肠→大肠, 每个器官都靠这种"自我修复"工作。' },
  { week:8, hook:'🧠 小肠是身体里"第二个大脑"', body:'小肠有 1 亿个神经元, 比脊髓还多 — 它能独立"判断"该分泌什么酶。这就是 PSLE 高频题"为什么小肠这么长(6 米)?" — 因为表面积大才能吸收完所有营养。' },
  { week:9, hook:'⚖️ 1 吨铁 vs 1 吨棉花, 哪个重?', body:'一样重! 但棉花体积是铁的 1000 倍。这就是 P4 Matter 章节区分 mass(质量, 不变)和 volume(体积, 可变)— PSLE 高频陷阱题: "重量"用 balance 称, "体积"用 measuring cylinder 量。' },
  { week:10, hook:'🌑 月亮上的影子可以保留几亿年', body:'地球上的影子风一吹就变, 但月球没大气没风 — 阿波罗 11 号宇航员 1969 年踩的脚印, 今天还在! P4 Light & Shadow 难章: 影子需要 光源 + 不透明物 + 屏 — 月球都满足。' },
  { week:11, hook:'🌅 为什么夕阳红, 中午太阳白?', body:'阳光经过大气层会"散射" — 蓝光散得多, 红光散得少。中午太阳直射穿过的大气薄, 各种光都到; 夕阳斜射穿过厚大气, 只剩红光能穿透。 PSLE Light 高频难题。' },
  { week:12, hook:'🥶 冬天的铁门比木门"冷", 其实温度一样', body:'金属导热快 — 你手指的热被铁门快速抢走, 大脑感觉"凉"。木门导热慢, 你手的热散不出去, 感觉"温"。P4 Heat 难章: 温度 vs 热感是两回事! PSLE 高频反直觉题。' },
  { week:13, hook:'💨 100°C 蒸汽烫伤比 100°C 水严重 100 倍', body:'蒸汽变回水时释放大量"汽化潜热"(2260 J/g) — 100°C 蒸汽接触皮肤先凝结再降温, 比 100°C 水多放 6 倍热。这就是 P4 Heat 章节区分 "热的形式" vs "温度"的关键。' },
  { week:14, hook:'🧲 磁铁切两半, 不是一个 N + 一个 S, 而是两个完整磁铁', body:'磁铁里每个原子都是小磁铁, 切开只是把大集合切成两个小集合 — 每块仍然有 N 和 S 极。 P4 Magnets + W14 综合: PSLE 必考"为什么磁铁不能分解为单极"。' },

  // ===== Phase 2 P5 (W15-W26) =====
  { week:15, hook:'🌸 花是植物的"性器官"', body:'花的真正功能是繁殖 — stamen(雄)产生花粉, pistil(雌)接受花粉。我们觉得花漂亮, 其实是植物为了吸引昆虫帮它传粉的"广告". P5 Reproduction 章节核心。' },
  { week:16, hook:'🦠 你身上的细菌细胞 比 你自己的细胞还多', body:'人体约 30 万亿细胞, 但身上微生物有 39 万亿个! 你不是"一个人", 是"一个生态系统"。 P5 Cells 章节: 细胞结构 + 食物链 — 你也是某条食物链的一环。' },
  { week:17, hook:'💧 你今天喝的水, 恐龙也喝过', body:'水循环 40 亿年没新增过水分子, 全靠 evaporation→condensation→precipitation 循环。你早上那杯水里, 真的有恐龙喝过的同样水分子。 P5 Water + Air 章节。' },
  { week:18, hook:'⚡ 你身上每秒 100 万个电信号', body:'每个神经元每秒触发几百次电脉冲, 你的大脑就是个"生物电脑"。 P5 Forms of Energy: 电能不只是发电厂的, 你身上时刻都在用电。' },
  { week:19, hook:'🔋 一节 AA 电池, 能让人体亮 1 灯泡 5 分钟', body:'人体新陈代谢每天产生 2000 大卡 ≈ 2.3 kWh — 远超一节电池(0.003 kWh)。 但你 5 分钟产的能量已超过 1 节电池, 这就是 P5 Energy Conversions: 化学→热→机械→电的转换。' },
  { week:20, hook:'⚡ 闪电的温度比太阳表面还高', body:'闪电核心 30000°C, 太阳表面才 5500°C。但闪电太"短"(0.001 秒)所以不会煮熟空气。 P5 Electricity 难章: 电流 + 电压 + 电阻关系, PSLE 必考。' },
  { week:21, hook:'💡 串联电路 vs 并联电路: 家里用哪种?', body:'家里全是并联! 因为串联一个灯坏全部黑, 而并联一个坏其他正常。这就是为什么圣诞老灯串(串联)一个坏全黑, 而家里厨房客厅独立。 P5 Series & Parallel 难章。' },
  { week:22, hook:'🔄 综合复习: 万物皆"循环"', body:'P5 学了水循环、物质循环、生命循环 — 它们的共通点是: 物质守恒 + 能量驱动循环。 W22-W23 综合复习把这些线索串起来 — PSLE OE 题就考你能不能"看到 systems"。' },
  { week:23, hook:'🌞 阳光是地球所有能量的源头', body:'吃食物 = 间接吃太阳能(植物光合 → 你)。烧煤 = 烧古生物吸收的远古太阳能。风/水循环 = 太阳加热不均匀驱动的。 P5 Energy 综合复习: 一切能量归一。' },
  { week:24, hook:'📝 综合卷模拟 — 每错 1 题节省考试 5 分', body:'考前 1 个错题深度分析 = 实际 PSLE 多 5 分。研究: 错题分析的学生平均比"刷新题"的高 1 个 AL。 W24 综合卷模拟 + 弱项回填的科学依据。' },
  { week:25, hook:'🖼️ Visual Text 题: 75% 信息在图里, 不在题干', body:'PSLE Visual Text(海报/广告/通知)— 多数考生只看题干跳过图。但答案隐藏在: ① 大字标题 ② 数字 ③ 小图暗示 ④ 联系方式。 W25 整体串讲 + Visual Text 启动。' },
  { week:26, hook:'🎯 W26 总模考 — 不是终点, 是新起点', body:'第一阶段完成 = P3-P5 知识地图全亮。从 W27 开始进入"系统提升期", 引入 P6 + 真题前移。 W26 总模考的目标不是分数, 是发现"哪些章节我以为会其实没真懂"。' },

  // ===== Phase 2 W27-W52 =====
  { week:27, hook:'🚀 第二阶段启动 — P6 是"挑战", 不是"难"', body:'P6 内容比 P5 难 30%, 但你 P5 已经熟了 — 所以感觉是"挑战"而不是"听不懂"。 W27 第二阶段开始, 重点是把 P6 新概念跟 P3-P5 已学过的串起来。' },
  { week:28, hook:'🌍 PSLE Science 8 大高频章占考试 70%', body:'Plant Transport / Digestive / Light / Heat / Reproduction / Cells / Energy / Electricity — 这 8 章占 PSLE Science 70% 题量。复习抓这 8 章 = 抓 70% 分。' },
  { week:29, hook:'📚 阅读速度: 240 wpm 是 PSLE 临界', body:'240 词/分钟是 PSLE Comprehension 不慌的速度。低于这个 → 题做不完。每天 5 min 计时阅读练 = 一个月内提到 240 wpm。' },
  { week:30, hook:'🔁 Vocabulary 5 完成 — 200 高频词到手', body:'PSLE 高频词 200 个 W30 完成 100, W52 完成 200。研究: 知道这 200 个词 = Comprehension 多读懂 80% 内容。 这是 v14 加的关键资产。' },
  { week:31, hook:'🌊 真题里的"海洋"主题占 15%', body:'PSLE Science 真题里, 涉及水/海洋/生态的题占 15%。新加坡是岛国, 出题特别偏爱海洋生态系统。 W31 起特别注意 ecosystem / food chain / adaptation。' },
  { week:32, hook:'🐢 适应(Adaptation)的本质是"长期"', body:'乌龟的硬壳、骆驼的驼峰、北极熊的白毛 — 都是百万年自然选择的结果, 不是"出生后选择的"。 PSLE 易混: adaptation(物种变化)vs response(个体反应)。' },
  { week:33, hook:'🪴 同一片叶子能既"产氧"又"耗氧"', body:'白天叶子光合 → 产氧, 但同时也呼吸 → 耗氧。净结果是产 > 耗。晚上没光合, 只剩呼吸 → 净耗氧。 PSLE 高频陷阱: 别说"植物白天产氧晚上产 CO₂"— 太简化。' },
  { week:34, hook:'🌡️ 热膨胀让铁桥每年伸长 30 cm', body:'伦敦塔桥每天热胀冷缩, 全年累计伸缩 30 cm — 所以桥都有"伸缩缝"。 PSLE Heat: 温度变化 → 体积变化, 这是工程师每天对抗的物理。' },
  { week:35, hook:'⚡ Series Circuits 在烟雾报警里救命', body:'家里所有烟雾报警器是串联的 — 任何一个房间冒烟, 全屋报警。这就是 PSLE Electricity 高级题: "为什么有的设备故意用串联?"' },
  { week:36, hook:'🌐 Energy Conversions 链不是直线', body:'灯泡: 电 → 光(useful)+ 热(wasted, 95%!)。LED 不是"省电", 是少浪费成热。 PSLE 实验题专问 "useful energy %"。' },
  { week:37, hook:'🦠 微生物分解器 = 生态系统的"清道夫"', body:'没有 decomposers, 整个地球会被尸体和落叶填满! 它们把死物质变回 CO₂ 让植物再用。 PSLE 食物链题 95% 漏 decomposer — 别忘了它。' },
  { week:38, hook:'🧬 P6 Adaptations: 仙人掌没"叶子", 它的"刺"就是叶', body:'仙人掌的"刺"是退化的叶 — 减少蒸腾。它的"绿色枝干"才是光合主力。 PSLE 适应题最爱考: "为什么仙人掌长这样?"' },
  { week:39, hook:'🔬 实验题 4 要素少 1 个扣 1 分', body:'PSLE 实验题必含: ① Independent var ② Dependent var ③ Controlled vars ④ Hypothesis. 少哪个扣哪个 — 不是 partial credit, 是直接 0。' },
  { week:40, hook:'⏱️ PSLE 数学时间分配: 7-8 道大题 ≈ 5 min/题', body:'PSLE Math Paper 2 一共 1h45min, 17 道大题 → 平均 6 min/题。最后 4 道难题留 30 min, 检查 5 min。 W40 真题前移期开始, 严格按时间。' },
  { week:41, hook:'📊 Bar graph 题: PSLE 必看 axis label', body:'多数学生跳过 y 轴单位 — 然后答出 "10 个" 而不是 "10 千克"。 PSLE 数据题 30% 错在没读单位。' },
  { week:42, hook:'🎯 P6 Adaptations + 月模考 3 — 关键节点', body:'W42 是第二阶段中点, P6 难章全部过完。这次模考的成绩 = PSLE 预估的 70% 准确度。 重点不是分数, 是"哪些章节再也不能丢分"。' },
  { week:43, hook:'📖 真题前移: 越早做越好', body:'考前 6 个月开始做真题 vs 考前 1 个月: 前者 PSLE 平均高 1 个 AL。 W43 进入真题密集期, 不要"留到最后".' },
  { week:44, hook:'🇸🇬 SG 真题里的"地理梗"占 10%', body:'PSLE 出题特爱新加坡场景 — 圣淘沙、组屋、CBD、武吉知马自然保护区。 听到"Bukit Timah" 就知道考森林生态。 SG 本地知识 = 隐藏分。' },
  { week:45, hook:'✏️ Cloze 一空一词: 70% 是介词或冠词', body:'PSLE Cloze 最难的题 = 介词搭配(look at/depend on)和冠词(a/an/the)。其它词类反而好猜。 W45 真题刷题专攻这 2 类。' },
  { week:46, hook:'📦 Practice Package 6 = 模考"实弹演习"', body:'Package 6 是 SG 老师圈认证的 PSLE 最接近真题的练习包。 做完一套 = 模拟一次完整 PSLE 体验。' },
  { week:47, hook:'📝 PSLE 作文 30 分: 1 句"金句"加 5 分', body:'PSLE Composition 评分: 内容 + 语言 + 结构. 一个高级表达(crestfallen / ecstatic / dawned upon me)单独可以加 2-5 分. 每篇作文背 3 句金句 = 持续高分。' },
  { week:48, hook:'🌊 听力陷阱 #1: 转折词后才是答案', body:'PSLE Listening 90% 答案在 "but / however / although" 后面。 听到这 3 个词立刻竖耳朵 — 题目要问的是后半句, 不是前半句。' },
  { week:49, hook:'📐 数学 Heuristics 4 大法', body:'Model Drawing(线段图)/ Make a Table / Work Backwards / Show ALL Working — PSLE 数学 4 大解题套路。 不会用任一种 = 难题肯定丢分。' },
  { week:50, hook:'🇨🇳 华文作文: 5 类开头任选其一', body:'描景 / 引句 / 反问 / 排比 / 对话 — PSLE 华文作文 90% 用这 5 种开头之一。背 5 个固定开头 = 永远写得出第一段。' },
  { week:51, hook:'🔀 真题做错的题, 要重做 3 次才入脑', body:'1 次错 → 知道; 2 次重做 → 记住; 3 次重做(隔 1 周)→ 自动化。 W51 真题冲刺期, 错题本翻 3 次比刷新题强 5 倍。' },
  { week:52, hook:'🎯 第二阶段总收官 — 模拟 PSLE 全套', body:'W52 完整模拟 4 科 = PSLE 真实预演。 之后 21 周冲刺, 重点是"已知弱项专项突破", 不再"广撒网"。' },

  // ===== Phase 3 W53-W65 (刷题冲刺) =====
  { week:53, hook:'🚀 三阶段启动 — 速度比知识重要', body:'到这阶段你已知道 95% PSLE 知识, 缺的是"考场速度"。 W53-W65 训练: 严格计时 + 题海熟练度 + 心理稳定。' },
  { week:54, hook:'🧠 大脑在 18-22°C 时表现最好', body:'PSLE 考场室温通常 22°C — 太冷或太热都影响发挥。 W54 起每天在 22°C 下做题 1h 习惯环境。' },
  { week:55, hook:'🎯 弱项攻关: 找你"经常错"的 3 类题', body:'统计你 W14-W52 错题分类 — 你最频繁错的 3 类(可能是 OE / 实验题 / 串联电路)。 W55 起 70% 时间花在这 3 类。' },
  { week:56, hook:'📊 月度模考: 看分数变化趋势, 不是绝对分', body:'第 1 次月模考 75 → 第 2 次 78 → 第 3 次 82 = 趋势 OK。 别被某次"突然 70" 吓到 — 看 3 次平均。' },
  { week:57, hook:'🌅 早晨记忆比晚上好 30%', body:'人脑早晨 6-9 点记忆效率最高(皮质醇唤醒)。 W57 起把"背单词 / 复习公式"挪到早晨, 晚上做题。' },
  { week:58, hook:'⏰ 全科模考: 模拟 PSLE 心理疲劳', body:'PSLE 一天连考多科, 心理疲劳是主因之一。 W58 模拟"半天 4 科连续"训练抗疲劳, 不只是单科水平。' },
  { week:59, hook:'📓 错题本电子版 + 纸版双备份', body:'电子版方便搜索, 纸版方便涂画 — 两个都要。 W59 起每天翻 2 个版本错题各 10 min。' },
  { week:60, hook:'🎮 限时刷题 = 把考场恐惧变肌肉记忆', body:'前 30 次限时做题最痛苦, 之后大脑习惯 "看到题就开始答" 节奏。 W60 起每天 1 套真题严格计时, 1 个月后考场反应自动化。' },
  { week:61, hook:'🌗 7 月暑期: 别一天学 8 小时', body:'连续学 4h+ 大脑记忆效率掉 50%。 W61 暑期最佳: 上午 3h + 下午 2h + 晚上 1h(分散记忆)。' },
  { week:62, hook:'🧊 大脑也要"凉"下来', body:'每学 50 min 休息 10 min(番茄钟)— 大脑前额叶皮质恢复。 W62 起严格执行: 50/10 节奏比连续 2h 提分高 30%。' },
  { week:63, hook:'📚 近 3 年真题 = 出题趋势风向标', body:'PSLE 出题官 5 年换一次组, 近 3 年题型最接近你 2027 年要考的。 W63 倒数 4 周, 把近 3 年精做一遍。' },
  { week:64, hook:'⚖️ 第 4 次月模考 = PSLE 预测最准的一次', body:'W64 月模考的成绩, 跟你 8 个月后的 PSLE 实际成绩相关性 90%。 这次成绩 ≈ 你 PSLE 真实预估。' },
  { week:65, hook:'🏆 三阶段最后完整模考 — 信心收官', body:'W65 (7.31 收题)是最后一次模考。 重点不是分数, 是"我考完不慌, 知道每科都能答"的信心建立。' },

  // ===== Phase 4 W66-W73 (考前冲刺) =====
  { week:66, hook:'🗣️ 8 月口试: PSLE Oral 占英语 15 分', body:'Oral = Reading Aloud(15 分) + Stimulus 看图说话(15 分). W66-W67 口试密集期, 录音回听是关键 — 听自己听 10 次发现的问题最多。' },
  { week:67, hook:'🎤 8.12-13 PSLE 口试: 流畅 > 完美', body:'考官评分: 流畅(stops 少)> 完美词汇。 卡壳 1 次 -1 分, 用错 1 词 -0.5 分。 宁可用简单词流畅说, 不要纠结高级词卡 5 秒。' },
  { week:68, hook:'🎧 听力专项: 不是"听清楚"是"边听边记"', body:'PSLE Listening 1 段听 1 次 → 4 选 1。 边听边在草稿上记关键数字/否定/转折。 W68 听力专项, 每天 1 套限时。' },
  { week:69, hook:'🔁 错题第 N 轮: 第 3 轮才真正记牢', body:'神经科学: 同一题做对 3 次, 大脑才把它从"短期记忆"挪到"长期"。 W69 错题本第 2 轮 — 别跳过, 这是稳定 AL 的核心。' },
  { week:70, hook:'📅 9 月: 距 PSLE 笔试 4 周', body:'W70 是冲刺最关键 4 周 — 不学新东西, 只刷旧错题 + 真题 + 心理调整。 新知识来不及消化反而扰乱。' },
  { week:71, hook:'🛌 考前 1 周睡眠 = 多 1 个 AL', body:'考前 1 周每天睡足 9 小时的学生, PSLE 平均比"熬夜复习"的高 1 个 AL。 大脑在睡眠中整理记忆, 比临时抱佛脚强。' },
  { week:72, hook:'🎯 9.15 PSLE 听力考试: 一次定胜负', body:'PSLE Listening 是 1 次性考试 — 听不清就丢分, 不能重听。 W72 当周每天上午同时间做听力, 让大脑形成"上午 9 点听英语"反射。' },
  { week:73, hook:'🏆 9.24-30 PSLE 笔试周 — 你已准备好', body:'73 周努力到这一刻。 你已经做了 ~2855 个 task, 看了 16000+ 集听力, 答了 14 道反直觉题。 现在就做你已经会的事 — 你比你想的更强。 加油!🌟' }
];

function getWeeklyWowFact(weekN) {
  return WEEKLY_WOW_FACTS.find(w => w.week === weekN) || null;
}

// ============= v17.2: 英语 Wow 池 (独立 30 条, 按日轮换) =============
// 涵盖: 词汇趣闻 / 语法陷阱 / 习语 / 词源 / 听力技巧 / 写作 / PSLE 高频错点
const ENGLISH_WOW_FACTS = [
  { tag:'词源', hook:'🍝 "Spaghetti" 字面意思是"小绳子"', body:'spaghetti 来自意大利语 spago(绳子)+ 小型后缀 -etti, 字面就是 "tiny strings"。意大利面条几乎所有名字都是形状描述: penne(笔尖)/ farfalle(蝴蝶结)/ rigatoni(条纹)。背单词从词源切入, 印象深 5x。' },
  { tag:'词源', hook:'🐶 "Salary" 来自盐 — 古罗马军人发"盐工资"', body:'拉丁语 sal(盐)→ salarium(发盐的钱)→ salary。古罗马时盐是奢侈品, 军饷一部分发盐。下次想"赚 salary" 想想盐 — 词义就刻进脑子。' },
  { tag:'语法', hook:'❗ "He doesn\'t go" vs "He don\'t go" — 后者错在哪?', body:'第三人称单数(he/she/it)动词必须 +s。does 已含 -s 信息所以后面跟原形 go。"He don\'t" 是非正式英语听起来 OK, 但 PSLE 严格扣分。 主谓一致是 PSLE Editing 5 大错之一。' },
  { tag:'语法', hook:'⚖️ "Less" vs "Fewer" — 90% 母语者也用错', body:'fewer 用于可数名词(fewer apples), less 用于不可数(less water). 但超市经常写 "10 items or less" — 严格来说是错的, 应该是 "10 items or fewer". PSLE 这点会考。' },
  { tag:'语法', hook:'🔄 "I\'m going to school" vs "I\'m going to the school" 不一样', body:'前者 = 我去上学(目的); 后者 = 我去那栋校舍(地点). 类似: hospital(就医) vs the hospital(去那栋楼). PSLE 高频陷阱: 缺/加 the 改变意思。' },
  { tag:'习语', hook:'🐱 "It\'s raining cats and dogs" 哪里来?', body:'17 世纪伦敦下大雨时, 街上经常冲出死猫死狗(脏排水沟堆的)。所以"下猫下狗"= 极大暴雨。 PSLE 看图作文 / Comp 经常出现这种 idiom — 知道来源就忘不了。' },
  { tag:'习语', hook:'🥚 "Walk on eggshells" 字面 vs 真意', body:'字面: 在蛋壳上走(踩破就炸)= 真意: 跟某人说话特别小心怕惹他生气。 PSLE Comp 常见 figurative language — 不能字面理解。' },
  { tag:'词汇', hook:'📚 英语 1 个词平均有 3 个意思 — "set" 有 464 个', body:'OED 里 "set" 有 464 个不同含义/用法 — 是英语最多义词。"run" 紧随其后 645 个。所以 PSLE Cloze 一空一词难, 要看上下文判断哪个意思。' },
  { tag:'词汇', hook:'🌊 PSLE 200 高频词 = 80% Comp 文章覆盖', body:'PSLE 阅读题里 80% 单词来自最高频 200 词。 背完这 200 个 = 任何文章都能读懂大意, 不卡壳。 v14 词汇表里就是这 200 个。' },
  { tag:'词汇', hook:'🇸🇬 "Lah" 在 PSLE 作文里能用吗?', body:'❌ 绝对不能。Singlish(lah/lor/leh)在日常 OK, 但 PSLE 用 Standard English 评分。"Eat already lah" 写成"I have already eaten" — 这是 PSLE 写作高频丢分点。' },
  { tag:'写作', hook:'✍️ PSLE 作文 1 个高级词加 2-5 分', body:'crestfallen(沮丧) / jubilant(欢欣) / dawned upon me(突然意识到) — 每篇作文用 3 个就比平均高 5 分。 背 30 个高级词, PSLE 作文从 25 → 32 分。' },
  { tag:'写作', hook:'📖 开头 3 句决定整篇作文分数', body:'PSLE 评卷老师 1 篇作文给 4-6 分钟。前 3 句就定调 — 平淡开头 → 整篇 25 分天花板。 用感官描写(声音/气味)开头 → 起评 30 分。' },
  { tag:'写作', hook:'🎭 对话引语让作文活起来 — 但要正确', body:'"What a beautiful day!" she exclaimed. — 引号内首字母大写, 引号外动词小写, 句末标点在引号内。 PSLE 高频扣分: 标点放错位置。' },
  { tag:'阅读', hook:'🎯 Comp 答案 90% 在原文找得到, 不是猜的', body:'PSLE Comprehension OE 题: 答案直接在文章里, 找到关键词附近的句子, 摘下来稍改即可。 别"自己想"原创答案 — 评卷只看你有没有抓到原文核心词。' },
  { tag:'阅读', hook:'⏱️ Comp 速度 240 wpm 是 PSLE 临界线', body:'低于 240 词/分钟 = 题做不完。每天 5 min 计时阅读练 1 个月 → 速度提到 240+。这是 v16 手册强调的。' },
  { tag:'听力', hook:'🎧 PSLE Listening 答案 90% 在转折后', body:'听到 "but / however / although" → 立刻竖耳朵, 答案 95% 在后半句, 不是前半句。 听力题最大陷阱: 听了前半句就抢答。' },
  { tag:'听力', hook:'🔢 数字陷阱: 听 "fifteen" 还是 "fifty"?', body:'fifteen [fɪfˈtiːn] vs fifty [ˈfɪfti] — 重音不同。 PSLE Listening 数字题常考: 13/30, 14/40, 15/50, 16/60, 17/70, 18/80, 19/90 这 7 对。' },
  { tag:'听力', hook:'🇸🇬 PSLE 听力是新加坡口音 — 不是英美', body:'PSLE Listening 用新加坡 standard English 录音, 不是 BBC / NPR。 平时多听 CNA938 / CNA Insider 适应 SG 口音, 比听 BBC 帮助大。' },
  { tag:'Cloze', hook:'🧩 Cloze "一空一词" 70% 是介词或冠词', body:'PSLE Cloze 最难空多是: in/on/at/of/for/with(介词)和 a/an/the(冠词)。 这两类没规律, 全靠搭配感 — 读多遇多次自然会。' },
  { tag:'Cloze', hook:'⚠️ "Look at" vs "Look after" 意思天差地别', body:'介词搭配换一个词意思全变: look at(看)/ look after(照顾)/ look for(找)/ look up(查字典)/ look out(小心). PSLE Cloze 必考动词短语。' },
  { tag:'Editing', hook:'✏️ Editing 5 类错占 95% 题目', body:'主谓一致 / 时态 / 拼写 / 介词 / 冠词 — PSLE Editing 95% 错都在这 5 类。建一个 Editing 错题本按这 5 类记, 1 个月内错率减半。' },
  { tag:'Editing', hook:'⏰ "Yesterday I am hungry" — 时态错', body:'yesterday 是过去时间 → 必须用 was, 不是 am。 PSLE Editing 高频: 时间词跟动词时态不匹配(yesterday/last week → 过去式; tomorrow → 将来时)。' },
  { tag:'Grammar', hook:'🔀 if 句 vs unless 句 — 90% 学生混了', body:'"unless = if not". "Unless you study, you will fail" = "If you do not study, you will fail". PSLE Grammar 高频: unless 后用肯定句, 因为本身就含否定。' },
  { tag:'Grammar', hook:'⏳ "since" vs "for" — 都表"持续多久"', body:'since + 时间点(since 2020 / since I was 5). for + 时间段(for 5 years / for 10 minutes). PSLE 高频, 别混。' },
  { tag:'Oral', hook:'🗣️ Reading Aloud: 句末适当停顿 + 重读关键词', body:'PSLE Oral Reading Aloud 评 15 分。 句末停顿约 0.5-1.5 秒(逗号短/句号长)+ 重读关键词 = 流畅感觉。 平淡读完 8-10 分; 有起伏节奏 13-15 分。' },
  { tag:'Oral', hook:'🖼️ Stimulus 看图: 描述→联想→个人 3 步答', body:'PSLE Oral 看图说话: ① 描述场景 ② 联想问题/感受 ③ 个人经历呼应。 每点 2-3 句即可。 缺哪一步扣 1-2 分。' },
  { tag:'Synthesis', hook:'🔗 PSLE Paper 2 顶端 10 分: Synthesis', body:'把 2 个简单句合并成 1 个复杂句, 或换句型不变意 — Synthesis & Transformation 占 10 分。 W15 起每周 1h 专项练习。' },
  { tag:'词汇', hook:'🌍 PSLE Vocab 6 完成 = AL2 起步线', body:'Vocabulary 6 这本完成 = 词汇量到 PSLE AL2 标准。 v14 计划 W16 完成 Vocab 5, W52 前完成 Vocab 6 — 严格执行 = 英语稳 AL2。' },
  { tag:'写作', hook:'🌧️ 描写下雨用 5 个不同动词 — 都比 "rain" 好', body:'drizzle(细雨)/ shower(短雨)/ pour(倾盆)/ pelt(打)/ patter(嗒嗒). PSLE 作文用一个就比 "It rained" 高级 3 倍。' },
  { tag:'PSLE', hook:'🎯 PSLE 英语 Paper 1 = 写作 1h 10min', body:'Paper 1 = Situational Writing(15 分, ~20 min) + Continuous Writing(40 分, ~50 min). 注意: Editing 在 Paper 2, 不在 Paper 1. 必留 5 min 检查拼写。' }
];

// 按日轮换: Sun/Mon/Wed/Fri = 英语 (4 天), Tue/Thu/Sat = 科学 (3 天)
// 每日同一天稳定显示同一条 (用 dayOfYear*12345 哈希避免连续相同)
function getTodayWowFact(weekN, dateOverride) {
  const d = dateOverride || new Date();
  const dow = d.getDay();  // 0=Sun, 1=Mon, ..., 6=Sat
  const englishDays = new Set([0, 1, 3, 5]);  // Sun/Mon/Wed/Fri
  if (englishDays.has(dow)) {
    // 英语 — 按 epoch day 索引,每天 +1, 30 天循环一遍
    const epochDay = Math.floor(d.getTime() / 86400000);
    const idx = ((epochDay % ENGLISH_WOW_FACTS.length) + ENGLISH_WOW_FACTS.length) % ENGLISH_WOW_FACTS.length;
    const fact = ENGLISH_WOW_FACTS[idx];
    return { subject: '英语', subjectIcon: '📚', subjectColor: '#6FB8A0', subjectKey: 'english', tag: fact.tag, hook: fact.hook, body: fact.body, week: null };
  }
  // 科学(本周对应 wow)
  const sci = WEEKLY_WOW_FACTS.find(w => w.week === weekN);
  if (!sci) return null;
  return { subject: '科学/策略', subjectIcon: '🔬', subjectColor: '#9B8FC9', subjectKey: 'science', tag: `W${sci.week}`, hook: sci.hook, body: sci.body, week: sci.week };
}

// viewBox 48×48; 7阶进化: 蛋→宝宝→小仓鼠→学习→智慧→战神→王者

// 颜色随形态进化: 浅橙(baby)→标准(cute)→蓝学(study)→紫智(wisdom)→红战(warrior)→金王(king)
function _hamsterBase(furColor, faceColor, hasHelmet) {
  return `
    ${hasHelmet ? '' : `<ellipse cx="13" cy="15" rx="4" ry="5" fill="${furColor}"/><ellipse cx="35" cy="15" rx="4" ry="5" fill="${furColor}"/><ellipse cx="13" cy="15" rx="2" ry="3" fill="#FFB6D9"/><ellipse cx="35" cy="15" rx="2" ry="3" fill="#FFB6D9"/>`}
    <circle cx="24" cy="26" r="14" fill="${furColor}"/>
    <ellipse cx="24" cy="30" rx="9" ry="6" fill="${faceColor}"/>
    <circle cx="15" cy="29" r="2" fill="#FFB6D9" opacity="0.75"/>
    <circle cx="33" cy="29" r="2" fill="#FFB6D9" opacity="0.75"/>
    <ellipse cx="24" cy="28" rx="1" ry="0.8" fill="#D67C7C"/>
    <path d="M22 30 Q24 31.5 26 30" fill="none" stroke="#5D3D2D" stroke-width="0.6" stroke-linecap="round"/>`;
}
function _hamsterEyes(eyeColor) {
  eyeColor = eyeColor || '#2D2D2D';
  return `<circle cx="19" cy="24" r="1.6" fill="${eyeColor}"/><circle cx="29" cy="24" r="1.6" fill="${eyeColor}"/><circle cx="19.4" cy="23.5" r="0.4" fill="white"/><circle cx="29.4" cy="23.5" r="0.4" fill="white"/>`;
}

const PET_FORMS = [
  { idx: 0, name: '仓鼠蛋', minStreak: 0,
    bg: 'linear-gradient(135deg, #FFF8E7 0%, #FFE0B2 100%)',
    desc: '里面有只小仓鼠在等着孵化',
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="26" rx="14" ry="18" fill="#FFF3D6" stroke="#D9A86A" stroke-width="1.5"/>
      <ellipse cx="19" cy="20" rx="3" ry="5" fill="#FFFAEC" opacity="0.6"/>
      <path d="M16 28 L19 26 L21 29 L23 26 L26 29 L29 26 L32 28" fill="none" stroke="#B8860B" stroke-width="0.6" opacity="0.5"/>
      <circle cx="24" cy="38" r="1" fill="#D9A86A" opacity="0.4"/>
    </svg>` },

  { idx: 1, name: '仓鼠宝宝', minStreak: 3,
    bg: 'linear-gradient(135deg, #FFE6F0 0%, #FFB6D9 100%)',
    desc: '刚出生的小仓鼠, 软软的好可爱',
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      ${_hamsterBase('#FFD8A8', '#FFF5E6', false)}
      ${_hamsterEyes('#2D2D2D')}
    </svg>` },

  { idx: 2, name: '小仓鼠', minStreak: 7,
    bg: 'linear-gradient(135deg, #FFE066 0%, #FFB347 100%)',
    desc: '系上蝴蝶结, 会塞食物到腮帮子了',
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      ${_hamsterBase('#F4B860', '#FFF5E6', false)}
      ${_hamsterEyes('#2D2D2D')}
      <path d="M14 8 L20 5 L22 11 L17 13 Z" fill="#FF6B9D" stroke="#C3447A" stroke-width="0.6"/>
      <path d="M34 8 L28 5 L26 11 L31 13 Z" fill="#FF6B9D" stroke="#C3447A" stroke-width="0.6"/>
      <circle cx="24" cy="10" r="2.2" fill="#C3447A"/>
    </svg>` },

  { idx: 3, name: '学习仓鼠', minStreak: 14,
    bg: 'linear-gradient(135deg, #B3E5FC 0%, #4ECDC4 100%)',
    desc: '戴上眼镜, 很爱读书',
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      ${_hamsterBase('#F4B860', '#FFF5E6', false)}
      <circle cx="19" cy="24" r="1.4" fill="#2D2D2D"/>
      <circle cx="29" cy="24" r="1.4" fill="#2D2D2D"/>
      <circle cx="19" cy="24" r="3.6" fill="white" fill-opacity="0.25" stroke="#2D2D2D" stroke-width="1.3"/>
      <circle cx="29" cy="24" r="3.6" fill="white" fill-opacity="0.25" stroke="#2D2D2D" stroke-width="1.3"/>
      <line x1="22.6" y1="24" x2="25.4" y2="24" stroke="#2D2D2D" stroke-width="1.1"/>
      <rect x="18" y="38" width="12" height="7" fill="#4A90E2" stroke="#2D2D2D" stroke-width="0.7" rx="0.5"/>
      <rect x="18.6" y="38.6" width="10.8" height="5.8" fill="#FFF" stroke="none"/>
      <line x1="24" y1="38" x2="24" y2="45" stroke="#2D2D2D" stroke-width="0.6"/>
      <line x1="20" y1="40.5" x2="22.8" y2="40.5" stroke="#2D2D2D" stroke-width="0.4"/>
      <line x1="25.2" y1="40.5" x2="28" y2="40.5" stroke="#2D2D2D" stroke-width="0.4"/>
    </svg>` },

  { idx: 4, name: '智慧仓鼠', minStreak: 30,
    bg: 'linear-gradient(135deg, #E1BEE7 0%, #A788E0 100%)',
    desc: '戴上学士帽, 智力满分',
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      ${_hamsterBase('#F4B860', '#FFF5E6', false)}
      ${_hamsterEyes('#2D2D2D')}
      <polygon points="6,10 42,10 38,14 10,14" fill="#2D2D2D"/>
      <rect x="11" y="9" width="26" height="2.5" fill="#1A1A1A" rx="0.4"/>
      <rect x="22" y="6" width="4" height="4" fill="#2D2D2D"/>
      <line x1="34" y1="10" x2="38" y2="16" stroke="#FFD700" stroke-width="0.9"/>
      <circle cx="38" cy="16.5" r="2" fill="#FFD700" stroke="#B8860B" stroke-width="0.4"/>
      <rect x="33" y="34" width="5" height="11" fill="#FFFAEC" stroke="#8B6F47" stroke-width="0.6" transform="rotate(15 35.5 39.5)"/>
      <line x1="33" y1="36" x2="38" y2="36" stroke="#8B6F47" stroke-width="0.4" transform="rotate(15 35.5 39.5)"/>
      <line x1="33" y1="39" x2="38" y2="39" stroke="#8B6F47" stroke-width="0.4" transform="rotate(15 35.5 39.5)"/>
    </svg>` },

  { idx: 5, name: '战神仓鼠', minStreak: 60,
    bg: 'linear-gradient(135deg, #FF9F45 0%, #FF5757 100%)',
    desc: '披上红色战袍, PSLE 战无不胜',
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 28 Q2 42 10 46 L38 46 Q46 42 42 28 Q40 36 24 36 Q8 36 6 28 Z" fill="#C13030" stroke="#7A1A1A" stroke-width="0.7"/>
      <path d="M6 28 L24 32 L42 28 L40 30 L24 34 L8 30 Z" fill="#FFD700" opacity="0.7"/>
      ${_hamsterBase('#E89060', '#FFE5C2', true)}
      ${_hamsterEyes('#1A1A1A')}
      <path d="M8 16 Q24 4 40 16 L40 19 Q24 14 8 19 Z" fill="#8B7355" stroke="#5D4A2D" stroke-width="0.8"/>
      <path d="M8 16 Q24 4 40 16" fill="none" stroke="#FFD700" stroke-width="0.6"/>
      <rect x="22" y="2" width="4" height="6" fill="#FFD700" stroke="#8B6F00" stroke-width="0.4"/>
      <polygon points="22,2 26,2 24,-1" fill="#FF5757"/>
      <path d="M14 22 L16 20 L17 23 Z" fill="#5D2D1D"/>
      <path d="M34 22 L32 20 L31 23 Z" fill="#5D2D1D"/>
    </svg>` },

  { idx: 6, name: '仓鼠王者', minStreak: 100,
    bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF6B6B 100%)',
    desc: 'PSLE 终极守护神兽 — 戴上王冠披上紫袍',
    svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="none" stroke="#FFD700" stroke-width="1.2" opacity="0.55">
        <animate attributeName="r" values="20;23;20" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2s" repeatCount="indefinite"/>
      </circle>
      <path d="M5 28 Q1 44 11 47 L37 47 Q47 44 43 28 Q42 38 32 39 L24 38 L16 39 Q6 38 5 28 Z" fill="#7B2CBF" stroke="#4D0F8B" stroke-width="0.7"/>
      <path d="M5 28 L11 30 L24 32 L37 30 L43 28" fill="none" stroke="#FFD700" stroke-width="0.8"/>
      <circle cx="13" cy="42" r="1.4" fill="#FFD700"/>
      <circle cx="35" cy="42" r="1.4" fill="#FFD700"/>
      ${_hamsterBase('#F4C140', '#FFF8DC', false)}
      ${_hamsterEyes('#1A1A1A')}
      <path d="M9 13 L14 4 L18 11 L24 3 L30 11 L34 4 L39 13 Z" fill="#FFD700" stroke="#8B6F00" stroke-width="0.7"/>
      <rect x="9" y="13" width="30" height="2" fill="#FFA500" stroke="#8B6F00" stroke-width="0.4"/>
      <circle cx="24" cy="9" r="1.8" fill="#FF1744" stroke="#8B0000" stroke-width="0.3"/>
      <circle cx="14" cy="11" r="1.2" fill="#1A75FF" stroke="#003D99" stroke-width="0.3"/>
      <circle cx="34" cy="11" r="1.2" fill="#00C853" stroke="#005728" stroke-width="0.3"/>
      <circle cx="18" cy="11.5" r="0.6" fill="#FFF" opacity="0.8"/>
      <circle cx="30" cy="11.5" r="0.6" fill="#FFF" opacity="0.8"/>
    </svg>` }
];

// v18.68: 命运高达 (连续打卡100天仓鼠满级后解锁的第二宠物)
const GUNDAM_PET = {
  idx: 'gundam', name: '命运高达', minStreak: 100,
  bg: 'radial-gradient(ellipse at center, #0A1628 0%, #1A3A6B 60%, #CC2200 100%)',
  desc: '连续百日苦练，从仓鼠王者觉醒的终极战神伙伴！展翅飞翔，PSLE 必胜！',
  svg: `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <!-- 左翼 -->
    <path d="M24 20 L1 5 L4 14 L9 18 L7 28 L2 32 L24 26Z" fill="#CC2200" opacity="0.9"/>
    <path d="M24 20 L3 8 L6 15 L11 18Z" fill="#FF4444" opacity="0.7"/>
    <path d="M24 20 L2 6 L2.5 11 L8 15" fill="none" stroke="#111" stroke-width="1.5" opacity="0.6"/>
    <!-- 右翼 (镜像) -->
    <path d="M24 20 L47 5 L44 14 L39 18 L41 28 L46 32 L24 26Z" fill="#CC2200" opacity="0.9"/>
    <path d="M24 20 L45 8 L42 15 L37 18Z" fill="#FF4444" opacity="0.7"/>
    <path d="M24 20 L46 6 L45.5 11 L40 15" fill="none" stroke="#111" stroke-width="1.5" opacity="0.6"/>
    <!-- 翼光粒子 -->
    <circle cx="4" cy="8" r="1.2" fill="#FF6666"><animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite"/></circle>
    <circle cx="44" cy="8" r="1.2" fill="#FF6666"><animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" begin="0.7s"/></circle>
    <circle cx="7" cy="26" r="0.8" fill="#FF8888"><animate attributeName="opacity" values="0;1;0" dur="2.2s" repeatCount="indefinite" begin="0.3s"/></circle>
    <circle cx="41" cy="26" r="0.8" fill="#FF8888"><animate attributeName="opacity" values="0;1;0" dur="2.2s" repeatCount="indefinite" begin="1.1s"/></circle>
    <!-- 机体胸甲 -->
    <rect x="20.5" y="21" width="7" height="9" fill="#2255CC" stroke="#0A2266" stroke-width="0.8" rx="0.8"/>
    <!-- 胸核心 (发光菱形) -->
    <polygon points="24,22 26,24 24,26 22,24" fill="#00FFFF" opacity="0.9">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
    </polygon>
    <!-- 肩甲 -->
    <rect x="17" y="21" width="4" height="5" fill="#1A44AA" stroke="#0A2266" stroke-width="0.6" rx="0.5"/>
    <rect x="27" y="21" width="4" height="5" fill="#1A44AA" stroke="#0A2266" stroke-width="0.6" rx="0.5"/>
    <!-- 头部 -->
    <rect x="21.5" y="13" width="5" height="8" fill="#E8E8F4" stroke="#AAAACC" stroke-width="0.7" rx="1"/>
    <!-- 眼部 visor -->
    <rect x="22" y="15.5" width="4" height="2" fill="#00BBFF" rx="0.4">
      <animate attributeName="fill" values="#00BBFF;#88EEFF;#00BBFF" dur="3s" repeatCount="indefinite"/>
    </rect>
    <!-- V字额角 -->
    <polygon points="24,12 22.5,14 24,13.2 25.5,14" fill="#FFD700"/>
    <!-- 腿部 -->
    <rect x="21" y="30" width="3" height="9" fill="#1A44AA" stroke="#0A2266" stroke-width="0.6" rx="0.5"/>
    <rect x="24" y="30" width="3" height="9" fill="#1A44AA" stroke="#0A2266" stroke-width="0.6" rx="0.5"/>
  </svg>`
};
function getCurrentPetForm(state) {
  const streak = (state.dailyStreak && state.dailyStreak.bestEver) || 0;
  // v18.68: 连续100天仓鼠王者 → 解锁高达, 若选了高达模式则显示
  if (state.activePetType === 'gundam' && streak >= 100) {
    return GUNDAM_PET;
  }
  let form = PET_FORMS[0];
  for (const f of PET_FORMS) if (streak >= f.minStreak) form = f;
  return form;
}
window.GUNDAM_PET = GUNDAM_PET;

function feedPet(state) {
  if (!state.pet) state.pet = { name: '小蛋蛋', formIdx: 0, spawnedAt: Date.now(), feedCount: 0, happiness: 100, lastFedDate: null };
  state.pet.feedCount += 1;
  state.pet.happiness = Math.min(100, (state.pet.happiness || 0) + 5);
  state.pet.lastFedDate = streakTodayKey();
  // 进化检查
  const form = getCurrentPetForm(state);
  state.pet.formIdx = form.idx;
}

function petBreaksHappiness(state) {
  if (!state.pet) return;
  state.pet.happiness = Math.max(0, (state.pet.happiness || 100) - 50);
}

// ============= v18 Phase 5.1: 🏆 隐藏成就 =============
function _countDay5Slot(s) {
  if (!s.daily) return false;
  for (const wk of Object.values(s.daily)) {
    for (const day of Object.values(wk || {})) {
      let n = 0;
      for (const v of Object.values(day || {})) if (v === true) n++;
      if (n >= 5) return true;
    }
  }
  return false;
}
function _countSundaySlots(s) {
  if (!s.daily) return false;
  for (const wk of Object.values(s.daily)) {
    if (!wk.Sun) continue;
    let n = 0;
    for (const v of Object.values(wk.Sun)) if (v === true) n++;
    if (n >= 5) return true;
  }
  return false;
}
function _countConsecCorrect(s) {
  if (!s.thinkPuzzleAnswers) return 0;
  const sorted = Object.entries(s.thinkPuzzleAnswers).sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0));
  let max = 0, cur = 0;
  for (const [, ans] of sorted) {
    if (ans.correct) { cur++; if (cur > max) max = cur; }
    else cur = 0;
  }
  return max;
}
function _totalListenSec(s) {
  if (!s.listeningUsage) return 0;
  let n = 0;
  for (const k of Object.values(s.listeningUsage)) n += (k.seconds || 0);
  return n;
}
function _countUnlockedEq(s) {
  if (!window.CHAMUI) return 0;
  return window.CHAMUI.equipment.filter(e => window.CHAMUI.checkEquipmentUnlocked(e.id, s)).length;
}
function _countUnlockedSkins(s) {
  if (!window.CHAMUI) return 0;
  return window.CHAMUI.skins.filter(sk => window.CHAMUI.checkSkinUnlocked(sk.id, s)).length;
}

const ACHIEVEMENTS = [
  // 学习坚持 (5)
  { id: 'streak_7',   icon:'🛡️', name:'坚持 7 天',   desc:'连续打卡 7 天',   cat:'坚持', cond:s=>(s.dailyStreak&&s.dailyStreak.bestEver||0)>=7 },
  { id: 'streak_30',  icon:'🔥', name:'坚持 30 天',   desc:'连续打卡 30 天',  cat:'坚持', cond:s=>(s.dailyStreak&&s.dailyStreak.bestEver||0)>=30 },
  { id: 'streak_100', icon:'👑', name:'百日王',       desc:'连续打卡 100 天', cat:'坚持', cond:s=>(s.dailyStreak&&s.dailyStreak.bestEver||0)>=100 },
  { id: 'day_5slot',  icon:'⚡', name:'单日 5 项',    desc:'1 天完成 5 个项目', cat:'坚持', cond:s=>_countDay5Slot(s) },
  { id: 'no_break_30',icon:'🌟', name:'无断 30 天',  desc:'当前连续打卡 ≥30 天',  cat:'坚持', cond:s=>(s.dailyStreak&&s.dailyStreak.days||0)>=30 },
  // 知识探索 (5)
  { id: 'wow_10',     icon:'🤯', name:'好奇宝宝',     desc:'看 10 条 Wow 事实', cat:'探索', cond:s=>(s.wowSeenCount||0)>=10 },
  { id: 'think_5',    icon:'🧠', name:'思考者',       desc:'答 5 道思考题',     cat:'探索', cond:s=>Object.keys(s.thinkPuzzleAnswers||{}).length>=5 },
  { id: 'think_correct_3', icon:'💡', name:'反直觉征服者', desc:'连答对 3 题', cat:'探索', cond:s=>_countConsecCorrect(s)>=3 },
  { id: 'vocab_perfect',   icon:'📚', name:'词汇大师', desc:'词汇游戏 0 错通关', cat:'探索', cond:s=>(s.vocabPerfectRuns||0)>=1 },
  { id: 'listen_300', icon:'🎧', name:'听力 5h',     desc:'累计听力 300 分钟',  cat:'探索', cond:s=>_totalListenSec(s)>=18000 },
  // 收藏家 (4)
  { id: 'eq_20',      icon:'⚔️', name:'装备 20 件',  desc:'解锁 20 件装备',     cat:'收藏', cond:s=>_countUnlockedEq(s)>=20 },
  { id: 'eq_35',      icon:'🛡️', name:'装备 35 件', desc:'解锁 35 件装备',     cat:'收藏', cond:s=>_countUnlockedEq(s)>=35 },
  { id: 'eq_all',     icon:'🏆', name:'装备全集齐',   desc:'解锁 45+ 件 (双龙除外)', cat:'收藏', cond:s=>_countUnlockedEq(s)>=45 },
  { id: 'skin_all',   icon:'👕', name:'6 皮肤集齐',   desc:'解锁全部 6 皮肤',    cat:'收藏', cond:s=>_countUnlockedSkins(s)>=6 },
  // 宝箱大师 (4)
  { id: 'box_10',     icon:'🎁', name:'开盒 10 个',  desc:'累计开 10 个宝箱',   cat:'宝箱', cond:s=>(s.mysteryBoxes&&s.mysteryBoxes.opened||0)>=10 },
  { id: 'box_50',     icon:'🎉', name:'开盒 50 个',  desc:'累计开 50 个宝箱',   cat:'宝箱', cond:s=>(s.mysteryBoxes&&s.mysteryBoxes.opened||0)>=50 },
  { id: 'box_100',    icon:'✨', name:'开盒 100 个', desc:'累计开 100 个宝箱',  cat:'宝箱', cond:s=>(s.mysteryBoxes&&s.mysteryBoxes.opened||0)>=100 },
  { id: 'box_rare',   icon:'🌟', name:'抽到稀有',    desc:'抽到 5 个 rare',    cat:'宝箱', cond:s=>(s.rareBoxesCount||0)>=5 },
  // PSLE 里程碑 (6)
  { id: 'm_w14',      icon:'🎯', name:'P3-P4 收官',  desc:'W14 综合卷达标',     cat:'PSLE', cond:s=>!!(s.milestones&&s.milestones.W14) },
  { id: 'm_w26',      icon:'🏆', name:'第一阶段毕业',desc:'W26 总模考达标',     cat:'PSLE', cond:s=>!!(s.milestones&&s.milestones.W26) },
  { id: 'm_w42',      icon:'🎖️', name:'P6 通关',    desc:'W42 P6 月模考',     cat:'PSLE', cond:s=>!!(s.milestones&&s.milestones.W42) },
  { id: 'm_w52',      icon:'🏵️', name:'第二阶段毕业',desc:'W52 总收官',        cat:'PSLE', cond:s=>!!(s.milestones&&s.milestones.W52) },
  { id: 'm_w65',      icon:'🎗️', name:'冲刺完成',   desc:'W65 最后模考',       cat:'PSLE', cond:s=>!!(s.milestones&&s.milestones.W65) },
  { id: 'm_psle',     icon:'📜', name:'PSLE 通关',   desc:'W73 笔试完成',       cat:'PSLE', cond:s=>!!(s.milestones&&s.milestones.W73) },
  // 隐藏 / 趣味 (6)
  { id: 'hidden_admin',    icon:'🤫', name:'好奇者', desc:'打开管理页 10 次',   cat:'隐藏', cond:s=>(s.adminPageOpens||0)>=10 },
  { id: 'hidden_midnight', icon:'🌙', name:'夜猫子', desc:'晚 22:00 后打卡',    cat:'隐藏', cond:s=>!!s._lateNightChecked },
  { id: 'hidden_dawn',     icon:'🌅', name:'早起鸟', desc:'早 6:00 前打卡',     cat:'隐藏', cond:s=>!!s._earlyMorningChecked },
  { id: 'hidden_sunday',   icon:'🛌', name:'周日奉献',desc:'周日完成 5 项',     cat:'隐藏', cond:s=>_countSundaySlots(s) },
  { id: 'hidden_marathon', icon:'🏃', name:'马拉松', desc:'连续答对 10 题',     cat:'隐藏', cond:s=>(s.marathonStreak||0)>=10 },
  { id: 'hidden_pet_dragon',icon:'🐲', name:'宠物终极进化',desc:'仓鼠 → 神龙形态 (打卡 streak 6+ 触发, 跟装备龙无关)',  cat:'隐藏', cond:s=>(s.pet&&s.pet.formIdx||0)>=6 },
  // v18.57: 中段填荒漠 4 个成就 (W23-W50 之间触发)
  { id: 'mid_3000pts', icon:'🎯', name:'半程战士',     desc:'累积 3000 分 (PSLE 备考过半证明)', cat:'PSLE', cond:s=>(s.totalPoints||0)>=3000 },
  { id: 'mid_streak50',icon:'⚔️', name:'50 天战士',   desc:'连续打卡 50 天 (介于 30/100 天之间)', cat:'坚持', cond:s=>(s.dailyStreak&&s.dailyStreak.bestEver||0)>=50 },
  { id: 'mid_kt_explore20', icon:'🌳', name:'知识树探险家', desc:'探索 20 个知识树节点 (35 中超半)', cat:'探索', cond:s=>Object.keys(s.knowledgeExplored||{}).length>=20 },
  { id: 'mid_kt_stars30', icon:'⭐', name:'⭐ 30 收集者', desc:'知识树累计 30 ⭐ (105 中近 1/3)', cat:'探索', cond:s=>Object.values(s.knowledgeStars||{}).reduce((s,e)=>s+(e.stars||0),0)>=30 },
  // v18.58: 15 个周次里程碑 (每 5 周必触发, 防中后期激励荒漠)
  { id: 'wk_5',  icon:'🌱', name:'W5 起步达人',  desc:'打卡到第 5 周 (1 个月里程碑)',     cat:'PSLE', cond:s=>(s.currentWeek||1)>=5 },
  { id: 'wk_10', icon:'🌿', name:'W10 茁壮成长', desc:'打卡到第 10 周',                    cat:'PSLE', cond:s=>(s.currentWeek||1)>=10 },
  { id: 'wk_15', icon:'🌳', name:'W15 1/5 路程', desc:'打卡到第 15 周 (跨过 1/5 备考)',    cat:'PSLE', cond:s=>(s.currentWeek||1)>=15 },
  { id: 'wk_20', icon:'🚶', name:'W20 稳步前进', desc:'打卡到第 20 周',                    cat:'PSLE', cond:s=>(s.currentWeek||1)>=20 },
  { id: 'wk_25', icon:'🏃', name:'W25 1/3 达标', desc:'打卡到第 25 周 (1/3 备考完成)',     cat:'PSLE', cond:s=>(s.currentWeek||1)>=25 },
  { id: 'wk_30', icon:'⚡', name:'W30 加速期',   desc:'打卡到第 30 周',                    cat:'PSLE', cond:s=>(s.currentWeek||1)>=30 },
  { id: 'wk_35', icon:'🔥', name:'W35 半程王',   desc:'打卡到第 35 周 (备考接近一半)',     cat:'PSLE', cond:s=>(s.currentWeek||1)>=35 },
  { id: 'wk_40', icon:'💪', name:'W40 P6 攻坚',  desc:'打卡到第 40 周 (P6 主战场)',        cat:'PSLE', cond:s=>(s.currentWeek||1)>=40 },
  { id: 'wk_45', icon:'🏔️', name:'W45 翻山', desc:'打卡到第 45 周',                       cat:'PSLE', cond:s=>(s.currentWeek||1)>=45 },
  { id: 'wk_50', icon:'⛰️', name:'W50 登顶', desc:'打卡到第 50 周 (2/3 备考完成)',         cat:'PSLE', cond:s=>(s.currentWeek||1)>=50 },
  { id: 'wk_55', icon:'🚀', name:'W55 冲刺起点', desc:'打卡到第 55 周',                    cat:'PSLE', cond:s=>(s.currentWeek||1)>=55 },
  { id: 'wk_60', icon:'⭐', name:'W60 星光', desc:'打卡到第 60 周',                        cat:'PSLE', cond:s=>(s.currentWeek||1)>=60 },
  { id: 'wk_65', icon:'🎖️', name:'W65 荣耀', desc:'打卡到第 65 周 (PSLE 倒计时)',         cat:'PSLE', cond:s=>(s.currentWeek||1)>=65 },
  { id: 'wk_70', icon:'🏆', name:'W70 冠军', desc:'打卡到第 70 周 (笔试前)',               cat:'PSLE', cond:s=>(s.currentWeek||1)>=70 },
  { id: 'wk_73', icon:'👑', name:'W73 PSLE 王', desc:'打卡到 W73 PSLE 笔试周!',           cat:'PSLE', cond:s=>(s.currentWeek||1)>=73 }
];

// 检查并解锁新成就 — 返回新解锁的成就数组
function checkAchievements(state) {
  if (!state.achievements) state.achievements = { unlocked: [], unlockedAt: {} };
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.unlocked.indexOf(a.id) >= 0) continue;
    if (a.cond(state)) {
      state.achievements.unlocked.push(a.id);
      state.achievements.unlockedAt[a.id] = Date.now();
      newly.push(a);
    }
  }
  return newly;
}

// ============= v18 Phase 5.1: 🎁 每日抽奖 =============
function checkDailyDraw(state) {
  if (!state.dailyDraws) state.dailyDraws = { fragments: 0, consecutive: 0, lastDrawDate: null };
  const today = streakTodayKey();
  if (state.dailyDraws.lastDrawDate === today) return null;
  // 计算 consecutive
  const yesterday = streakDateAdd(today, -1);
  if (state.dailyDraws.lastDrawDate === yesterday) {
    state.dailyDraws.consecutive += 1;
  } else if (state.dailyDraws.lastDrawDate) {
    state.dailyDraws.consecutive = 1;  // 断了, 重新算
  } else {
    state.dailyDraws.consecutive = 1;  // 第一次
  }
  state.dailyDraws.lastDrawDate = today;
  // 普通抽 1-3 片
  let frags = 1 + Math.floor(Math.random() * 3);
  let bonus = null;
  // 7 天必中 1 整盒(7 片直接给), 14 天 +1 wow, 30 天 +1 rare 提示
  if (state.dailyDraws.consecutive % 30 === 0) {
    bonus = 'rare-hint';
  } else if (state.dailyDraws.consecutive % 14 === 0) {
    bonus = 'wow';
  } else if (state.dailyDraws.consecutive % 7 === 0) {
    frags += 7;
  }
  state.dailyDraws.fragments += frags;
  // 7 片自动合 1 完整 box
  let newBoxes = 0;
  while (state.dailyDraws.fragments >= 7) {
    state.dailyDraws.fragments -= 7;
    if (!state.mysteryBoxes) state.mysteryBoxes = { available: 0, opened: 0, totalSlotsAtLastEarn: 0, history: [] };
    state.mysteryBoxes.available += 1;
    newBoxes += 1;
  }
  return { fragments: frags, totalFragments: state.dailyDraws.fragments, consecutive: state.dailyDraws.consecutive, bonus, newBoxes };
}

// ============= v18 Phase 5.3: 🔁 间隔重复 =============
function enqueueReview(state, type, id) {
  if (!state.spacedRepetition) state.spacedRepetition = { reviews: {} };
  const key = `${type}:${id}`;
  if (state.spacedRepetition.reviews[key]) return;  // 已加
  state.spacedRepetition.reviews[key] = {
    firstSeen: Date.now(),
    lastReviewed: Date.now(),
    intervalDays: 3,
    correctStreak: 0
  };
}

function getDueReviews(state) {
  if (!state.spacedRepetition || !state.spacedRepetition.reviews) return [];
  const now = Date.now();
  const due = [];
  for (const [key, r] of Object.entries(state.spacedRepetition.reviews)) {
    const dueTs = r.lastReviewed + r.intervalDays * 86400000;
    if (now >= dueTs) {
      due.push({ key, ...r });
    }
  }
  return due;
}

function submitReview(state, key, correct) {
  if (!state.spacedRepetition || !state.spacedRepetition.reviews[key]) return;
  const r = state.spacedRepetition.reviews[key];
  r.lastReviewed = Date.now();
  if (correct) {
    r.correctStreak += 1;
    r.intervalDays = Math.min(60, r.intervalDays * 2);
    state.totalPoints += 3;
  } else {
    r.correctStreak = 0;
    r.intervalDays = 3;
  }
}

// ============= v18 Phase 5.3: 🌅 未来自我预览 =============
function predictFutureSelf(state) {
  // 算: avgDailyPoints / daysToW73 / 预测 totalPoints / 装备数 / Lv
  const today = new Date();
  // 假设当前 currentWeek 对应 W1-W73, 简化为按 currentWeek 推算
  const weeksLeft = Math.max(0, 73 - (state.currentWeek || 1));
  const daysLeft = weeksLeft * 7;
  // 平均日加分: 用 totalPoints / 已过天数 (粗算)
  const startedWeek = state.currentWeek || 1;
  const daysPassed = Math.max(7, startedWeek * 7);
  const avgDaily = (state.totalPoints || 0) / daysPassed;
  // 预测累加(按当前 streak 不断率)
  const breakRate = (state.dailyStreak && state.dailyStreak.days > 0) ? 0.85 : 0.50;  // 当前在 streak 中 → 85% 不断
  const predictedTotal = Math.round((state.totalPoints || 0) + avgDaily * daysLeft * breakRate);
  // 预测 Lv (CHAMUI.getLevelInfo)
  const predLv = window.CHAMUI ? window.CHAMUI.getLevelInfo(predictedTotal) : { lv: '?' };
  // 预测装备数
  const predEqCount = window.CHAMUI ? window.CHAMUI.equipment.filter(e =>
    e.condition === 'points' && e.value <= predictedTotal
  ).length : 0;
  // v18.52: PSLE AL 综合预测 — 用 4 科 mini-game 实战正确率加权 (而非 app 积分)
  // 原因: app 积分主要反映"是否打卡", PSLE AL 应反映"做题对错率". PSLE 真实 AL 范围 1-9.
  const predAL = window.predictOverallAL ? window.predictOverallAL(state) : 6;
  return { predictedTotal, predLv, predEqCount, predAL, daysLeft, avgDaily: Math.round(avgDaily * 10) / 10, breakRate };
}

// v18.52: 4 科 mini-game 加权综合 AL 预测 (PSLE AL 1-9 真实范围)
// 权重: 数学 30% + 英语 30% + 科学 25% + 华文 15% (PSLE 4 科 AL 等权但英数偏重)
function predictOverallAL(state) {
  if (!window.getSubjectAccuracy) return 6;  // 冷启动
  const bySubj = window.getSubjectAccuracy(state);  // returns { '数学': {accuracy, correct, total}, '英语':..., '科学':... }
  // v18.53: 5 项加权 — 4 科 mini-game (60%) + 知识树 ⭐ (20%) + 留 20% 给未参考项
  const groups = [
    { name: '数学', weight: 0.25, data: bySubj['数学'] },
    { name: '英语', weight: 0.25, data: bySubj['英语'] },
    { name: '科学', weight: 0.20, data: bySubj['科学'] },
    { name: '华文', weight: 0.10, data: bySubj['华文'] }
  ];
  let totalAccPct = 0, totalW = 0;
  for (const g of groups) {
    if (!g.data || !g.data.total) continue;
    const acc = g.data.correct / g.data.total;  // 0-1
    totalAccPct += acc * g.weight;
    totalW += g.weight;
  }
  // v18.55: 加入知识树 ⭐ 绝对完成度 (权重 20%)
  // 修 v18.53 bug: 之前用平均⭐/3, 1 节点拿 3⭐ 就 = 知识树 100%, 严重虚高 AL
  // 现在用 totalStars / (35×3) — 105⭐ 全拿才 = 100%, 真实反映学习深度
  const ks = state.knowledgeStars || {};
  const starEntries = Object.values(ks);
  if (starEntries.length > 0) {
    const totalStars = starEntries.reduce((s, e) => s + (e.stars || 0), 0);
    const ktAcc = totalStars / (35 * 3);  // 0-1, 105⭐ 满分
    totalAccPct += ktAcc * 0.20;
    totalW += 0.20;
  }
  if (totalW === 0) return 6;  // 冷启动默认 AL 6
  const wAcc = totalAccPct / totalW;  // 0-1
  // PSLE AL 真实分布: AL 1=≥90%, 2=85-89, 3=80-84, 4=75-79, 5=65-74, 6=45-64, 7=20-44, 8=<20
  if (wAcc >= 0.90) return 1;
  if (wAcc >= 0.85) return 2;
  if (wAcc >= 0.80) return 3;
  if (wAcc >= 0.75) return 4;
  if (wAcc >= 0.65) return 5;
  if (wAcc >= 0.45) return 6;
  if (wAcc >= 0.20) return 7;
  return 8;
}
window.predictOverallAL = predictOverallAL;

// ============= v18.59: 错题本 (Error Bank) =============
// 知识树/mini-game 答错的题自动入库, 反复练直到答对清空
function addToErrorBank(state, item) {
  if (!state.wrongAnswers) state.wrongAnswers = [];
  // 去重: 同一道题不重复加 (按 gameKey + q + nodeId fingerprint)
  const fp = (item.gameKey || '') + '|' + (item.q || '') + '|' + (item.nodeId || '');
  if (state.wrongAnswers.some(w => w._fp === fp)) return false;
  item._fp = fp;
  item.id = fp + ':' + Date.now();
  item.addedDate = new Date().toISOString().slice(0, 10);
  item.addedWeek = state.currentWeek || 1;
  item.retries = 0;
  state.wrongAnswers.push(item);
  return true;
}
function removeFromErrorBank(state, id) {
  if (!state.wrongAnswers) return;
  state.wrongAnswers = state.wrongAnswers.filter(w => w.id !== id);
}
function errorBankCount(state) {
  return (state.wrongAnswers || []).length;
}
function errorBankByGame(state) {
  const out = {};
  (state.wrongAnswers || []).forEach(w => {
    out[w.gameKey] = (out[w.gameKey] || 0) + 1;
  });
  return out;
}
window.addToErrorBank = addToErrorBank;
window.removeFromErrorBank = removeFromErrorBank;
window.errorBankCount = errorBankCount;
window.errorBankByGame = errorBankByGame;

// ============= v18.54 mini-game Math (P6 + PSLE 中难度专攻, 已删入门题) =============
// 孩子数学已 90+, 直起 P6 难度. 全部 diff 4-5, 极少 diff 3 作热身. 答案均整数.
const MATH_QUESTIONS = [
  // ========== 反向百分比 (PSLE 必考陷阱) ==========
  { q: '8 折后 $640, 原价 ($)', ans: 800, diff: 4 },
  { q: '9 折后 $360, 原价 ($)', ans: 400, diff: 4 },
  { q: '含 9% GST 总价 $327, 不含税 ($)', ans: 300, diff: 4 },
  { q: '增 20% 后 $144, 原 ($)', ans: 120, diff: 4 },
  { q: '减 15% 后 $170, 原 ($)', ans: 200, diff: 4 },
  // ========== 多步百分比 (复合) ==========
  { q: '$500 先涨 20% 再降 20%, 最终 ($)', ans: 480, diff: 5 },
  { q: '$200 先 8 折再 9 折, 最终 ($)', ans: 144, diff: 5 },
  { q: '$1000 涨 10% 后再 9% GST, 最终 ($)', ans: 1199, diff: 5 },
  { q: '$1200 涨 25% 后降 20%, 现价 ($)', ans: 1200, diff: 5 },  // 经典陷阱: 不还原 = 不变
  { q: '$300 涨 10% 后降 10%, 现价 ($)', ans: 297, diff: 5 },
  { q: '原价 $1000 打 8 折再加 9% GST, 实付 ($)', ans: 872, diff: 5 },
  { q: '考 80 满分, A 得 60% B 得 75%, B 比 A 多几分', ans: 12, diff: 4 },
  // ========== 比例多步 (Bar Model / Before-After) ==========
  { q: 'A:B = 2:3, B:C = 4:5, A:C 化简比 A 部分', ans: 8, diff: 4 },
  { q: 'A:B = 3:5, A 比 B 少 16, A = ?', ans: 24, diff: 4 },
  { q: '红:蓝 = 5:3, 共 64 个, 红比蓝多几个?', ans: 16, diff: 4 },
  { q: '3 个比 4 个便宜 $5, 1 个 = ? ($)', ans: 5, diff: 4 },
  { q: '甲乙钱 7:3, 甲给乙 $20 后变 1:1, 甲原 ($)', ans: 70, diff: 5 },
  { q: 'A:B = 2:5, A 加 9 后 B 减 9 后变 1:1, 原 A', ans: 12, diff: 5 },
  { q: '男:女 = 5:3, 30 男生离开后比 1:1, 原总人数', ans: 120, diff: 5 },
  { q: '4 人 12 天完工, 6 人需几天?', ans: 8, diff: 4 },
  // ========== 速度 (PSLE Paper 2 高频) ==========
  { q: '60 km/h 跑 90 km, 几分钟?', ans: 90, diff: 4 },
  { q: '甲 60 km/h 乙 40 km/h 同向, 1h 后差几 km?', ans: 20, diff: 4 },
  { q: '相向 50+30 km/h, 240 km, 几小时相遇?', ans: 3, diff: 4 },
  { q: '相向 80+60 km/h, 280 km, 几小时相遇?', ans: 2, diff: 4 },
  { q: '匀速 1h 走 45 km, 走 135 km 几小时?', ans: 3, diff: 3 },
  { q: '上山 30 km/h 下山 60 km/h, 全程平均速度 (km/h)', ans: 40, diff: 5 },  // 调和平均陷阱
  { q: '上学 1.2 km, 步行 4 km/h, 几分钟到?', ans: 18, diff: 4 },
  { q: '火车 200 m, 60 km/h, 完全过 800 m 桥需几秒?', ans: 60, diff: 5 },
  // ========== 分数 of remainder (PSLE 必考) ==========
  { q: '花 1/3 后, 又花余下 1/2, 共花全部的 ?/3', ans: 2, diff: 4 },
  { q: '某数 2/5 是 60, 此数 = ?', ans: 150, diff: 4 },
  { q: '蛋糕吃 3/8, 剩 25 块, 原共几块?', ans: 40, diff: 4 },
  { q: '看书第 1 天 1/4, 第 2 天剩余的 1/3, 共看 ?/12', ans: 6, diff: 5 },
  { q: '$X 给 A 1/3, 给 B 1/4, 余 $25, X = ?', ans: 60, diff: 5 },
  // ========== 平均数变化 (PSLE 高频) ==========
  { q: '5 数平均 12, 加一新数变 13, 新数 = ?', ans: 18, diff: 4 },
  { q: '4 人平均 80 分, 加 1 人后平均 78, 新人 ?', ans: 70, diff: 4 },
  { q: '4 数平均 25, 加 1 后平均 27, 新数', ans: 35, diff: 4 },
  { q: '6 数平均 50, 前 4 平均 45, 后 2 平均', ans: 60, diff: 5 },
  // ========== 几何 (复合图形 / 立体) ==========
  { q: '圆 r=7, 面积 (π=22/7)', ans: 154, diff: 3 },
  { q: '圆 r=14, 周长 (π=22/7)', ans: 88, diff: 3 },
  { q: '长 20 宽 15 矩形, 中挖 5×5 正方形, 剩面积', ans: 275, diff: 4 },
  { q: '矩形 14×10 内挖直径 14 半圆, 剩面积 (π=22/7)', ans: 63, diff: 5 },
  { q: '直角三角形腿 6 和 8, 斜边长 (cm)', ans: 10, diff: 4 },
  { q: '立方体棱长 5 cm, 表面积 (cm²)', ans: 150, diff: 4 },
  { q: '立方体棱长 6 cm, 体积 (cm³)', ans: 216, diff: 4 },
  { q: '长方体 10×8×4 表面积 (cm²)', ans: 304, diff: 5 },
  { q: '水箱 20×10×5 cm³ 满水, 倒入 5×4 cm² 底瓶, 水高 (cm)', ans: 50, diff: 5 },
  // ========== 假设法 (鸡兔同笼变种) ==========
  { q: '鸡兔共 20 头, 共 56 脚, 兔几只?', ans: 8, diff: 4 },
  { q: '$5 + $2 票共 30 张共 $96, $5 几张?', ans: 12, diff: 4 },
  { q: '$5 + $2 票共 30 张共 $108, $5 几张?', ans: 16, diff: 4 },
  { q: '苹果 $2 香蕉 $1 共 15 个用 $25, 苹果几个?', ans: 10, diff: 4 },
  // ========== 利润 / 成本 (PSLE 应用题) ==========
  { q: '原价 $80, 成本 $50, 打 8 折卖, 利润 ($)', ans: 14, diff: 4 },
  { q: '进价 $30 加 50% 利润, 售价 ($)', ans: 45, diff: 4 },
  { q: '售价 $90 成本 $75, 利润率 (%)', ans: 20, diff: 4 },
  // ========== v18.25 hard 题 (保留 diff 4-5) ==========
  { q: 'sqrt(144) + 13² = ?', ans: 181, diff: 5 },
  { q: '24 × 25 - 15 × 16', ans: 360, diff: 4 },
  { q: '15% of 240 + 30% of 80', ans: 60, diff: 4 },
  { q: 'GST 9%: $250 final price', ans: 273, diff: 4 },
  { q: '5/8 + 3/4 = ?/8', ans: 11, diff: 4 },
  { q: '288 ÷ 12 + 48 ÷ 6', ans: 32, diff: 4 },
  { q: 'Average of 78, 82, 95, 67, 88', ans: 82, diff: 4 },
  { q: '20% discount on $85, pay?', ans: 68, diff: 3 },
  { q: '(15² - 12²) ÷ 9', ans: 9, diff: 5 },
  { q: 'Area of triangle base 12 height 8', ans: 48, diff: 3 }
];

// v18.3: 25 段 PSLE Editing 5 类错(主谓/时态/拼写/介词/冠词), 每段 ~50 词 5 错
const EDITING_PARAGRAPHS = [
  { text: 'Yesterday I goes to school. The teacher tells us a interesting story. We listen carefully and asked many question. After class, I and my friend played football.',
    errors: [{word:'goes',reason:'过去时→went'},{word:'tells',reason:'过去时→told'},{word:'a',reason:'元音前→an'},{word:'question',reason:'复数→questions'},{word:'listen',reason:'过去时→listened'}] },
  { text: 'My mother teach English in a school. She love her students. Every morning, she wake up at six and prepare breakfast for me and my brother. We are very lucky.',
    errors: [{word:'teach',reason:'主谓一致→teaches'},{word:'love',reason:'主谓一致→loves'},{word:'wake',reason:'主谓一致→wakes'},{word:'prepare',reason:'主谓一致→prepares'},{word:'me',reason:'语序→my brother and me'}] },
  { text: 'Last weekend, we visit the zoo. There were many different kind of animals. The lion roared loudly when we passed it cage. My sister was scare of the snake.',
    errors: [{word:'visit',reason:'过去时→visited'},{word:'kind',reason:'复数→kinds'},{word:'it',reason:'所有格→its'},{word:'scare',reason:'形容词→scared'},{word:'roared',reason:'(此句无错备用)'}] },
  { text: 'I have a pet dog. He name is Buddy. Buddy love to play with me everyday. Last Sunday, we taked him to the beach. He runned in the sand and chasing seagulls.',
    errors: [{word:'He',reason:'所有格→His'},{word:'love',reason:'主谓一致→loves'},{word:'taked',reason:'过去时→took'},{word:'runned',reason:'过去时→ran'},{word:'chasing',reason:'平行结构→chased'}] },
  { text: 'My brother and me went to the library yesterday. We borrow three book each. The librarian were very friendly. She help us find a book on dinosaur. We was so happy.',
    errors: [{word:'me',reason:'主格→I'},{word:'borrow',reason:'过去时→borrowed'},{word:'book',reason:'复数→books'},{word:'were',reason:'主谓一致→was'},{word:'was',reason:'主谓一致→were'}] },
  { text: 'On Monday, my class go on a trip to Sentosa. The bus arrive at school at 8am. We sing songs in the bus. When we reach there, the sun were shining brightly. It was a wonderful day.',
    errors: [{word:'go',reason:'过去时→went'},{word:'arrive',reason:'过去时→arrived'},{word:'sing',reason:'过去时→sang'},{word:'reach',reason:'过去时→reached'},{word:'were',reason:'主谓一致→was'}] },
  { text: 'I love eat chicken rice. It is a popular food in Singapore. The rice are cooked with chicken broth. Many peoples like to add chili sauce. My favourite stall is in a food court near my house.',
    errors: [{word:'eat',reason:'eat→eating'},{word:'are',reason:'主谓一致→is'},{word:'peoples',reason:'people 不可数'},{word:'favourite',reason:'(此句无错备用)'},{word:'a food court',reason:'冠词→the food court'}] },
  { text: 'My father usually drive me to school. But today, his car was broke down. So we have to take the MRT. The train was very crowded. I almost couldnt breathe in the carriage.',
    errors: [{word:'drive',reason:'主谓一致→drives'},{word:'was',reason:'多余 was'},{word:'have',reason:'过去时→had'},{word:'couldnt',reason:'拼写→couldn\'t'},{word:'crowded',reason:'(无错备用)'}] },
  { text: 'During the school holidays, we went to Malaysia. We stayed at a beach resort for five day. My sister learned how to swim. The food there was delicious. We enjoy ourselves very much.',
    errors: [{word:'day',reason:'复数→days'},{word:'enjoy',reason:'过去时→enjoyed'},{word:'a beach resort',reason:'(无错备用)'},{word:'learned',reason:'(无错备用)'},{word:'delicious',reason:'(无错备用)'}] },
  { text: 'When I were young, I lived in a village. The houses there was made of wood. Children played outside until evening. I have many happy memory of that place. Now everything are different.',
    errors: [{word:'were',reason:'主谓一致→was'},{word:'was',reason:'主谓一致→were'},{word:'have',reason:'时态→had'},{word:'memory',reason:'复数→memories'},{word:'are',reason:'主谓一致→is'}] },
  { text: 'My best friend is name Sarah. She and I has known each other since kindergarten. We always play together at recess. Last week, she got a award for being the top student. I was so prouded of her.',
    errors: [{word:'is name',reason:'is named/her name is'},{word:'has',reason:'主谓一致→have'},{word:'a award',reason:'冠词→an award'},{word:'prouded',reason:'拼写→proud'},{word:'recess',reason:'(无错备用)'}] },
  { text: 'I have been play badminton for three years. Every Saturday, I goes to the sports hall to train. My coach are very strict. She makes us run laps and do exercise. But I really enjoys it.',
    errors: [{word:'play',reason:'play→playing'},{word:'goes',reason:'主谓一致→go'},{word:'are',reason:'主谓一致→is'},{word:'exercise',reason:'复数→exercises'},{word:'enjoys',reason:'主谓一致→enjoy'}] },
  { text: 'The fire in the kitchen was started by a candle. My mother quickly put out it with a wet towel. Luckly, no one was hurt. We learnt a important lesson that day. Always blow off candle before sleeping.',
    errors: [{word:'put out it',reason:'词序→put it out'},{word:'Luckly',reason:'拼写→Luckily'},{word:'a important',reason:'冠词→an important'},{word:'learnt',reason:'(无错备用)'},{word:'candle',reason:'复数→candles'}] },
  { text: 'My grandmother live in a small flat near the seaside. She always cook delicious food when we visit her. She know many old stories. Last weekend, she telled us about her childhood in China. It were so interesting.',
    errors: [{word:'live',reason:'主谓一致→lives'},{word:'cook',reason:'主谓一致→cooks'},{word:'know',reason:'主谓一致→knows'},{word:'telled',reason:'过去时→told'},{word:'were',reason:'主谓一致→was'}] },
  { text: 'On rainy day, I love to read books at home. My favourite is the Harry Potter series. I has read all seven book. The story are exciting. I wish I could go to a magic school like Hogwarts.',
    errors: [{word:'rainy day',reason:'冠词→rainy days'},{word:'has',reason:'主谓一致→have'},{word:'book',reason:'复数→books'},{word:'are',reason:'主谓一致→is'},{word:'a magic',reason:'(无错备用)'}] },
  { text: 'During PE lesson, I sprained my ankle while playing soccer. The teacher take me to the school clinic. The nurse put a ice pack on it. My ankle was very pain. I limped to the bus stop after school.',
    errors: [{word:'PE lesson',reason:'冠词→a PE lesson'},{word:'take',reason:'过去时→took'},{word:'a ice',reason:'冠词→an ice'},{word:'pain',reason:'形容词→painful'},{word:'limped',reason:'(无错备用)'}] },
  { text: 'My family decided to went on a holiday. We choosed to visit Japan. The flight take seven hour. When we arrived, it was raining. We checked into the hotel and goed to sleep early.',
    errors: [{word:'went',reason:'to+原形→go'},{word:'choosed',reason:'过去时→chose'},{word:'take',reason:'过去时→took'},{word:'hour',reason:'复数→hours'},{word:'goed',reason:'过去时→went'}] },
  { text: 'There are five member in my family. My father is engineer. My mother work in a bank. I have one elder sister and a younger brother. We loves spending time together on weekends.',
    errors: [{word:'member',reason:'复数→members'},{word:'is engineer',reason:'冠词→is an engineer'},{word:'work',reason:'主谓一致→works'},{word:'a younger',reason:'(无错备用)'},{word:'loves',reason:'主谓一致→love'}] },
  { text: 'Singapore is a island country in Southeast Asia. It have a population of about 6 million. The country are very clean and safe. People here speaks four official languages. I am proud to be a Singaporean.',
    errors: [{word:'a island',reason:'冠词→an island'},{word:'have',reason:'主谓一致→has'},{word:'are',reason:'主谓一致→is'},{word:'speaks',reason:'主谓一致→speak'},{word:'a Singaporean',reason:'(无错备用)'}] },
  { text: 'Last night, I had a strange dream. I was flying over a mountain. Suddenly, a big bird appears in front of me. It taked me to a magical land. There were many talking animal there. Then I woke up.',
    errors: [{word:'appears',reason:'过去时→appeared'},{word:'taked',reason:'过去时→took'},{word:'a magical',reason:'(无错备用)'},{word:'animal',reason:'复数→animals'},{word:'were',reason:'(无错备用)'}] },
  { text: 'My favourite hobby are reading books. I usually borrows books from the school library. Last month, I read a interesting book about space. The author write in a very lively way. I learnt many new fact.',
    errors: [{word:'are',reason:'主谓一致→is'},{word:'borrows',reason:'主谓一致→borrow'},{word:'a interesting',reason:'冠词→an interesting'},{word:'write',reason:'过去时→wrote'},{word:'fact',reason:'复数→facts'}] },
  { text: 'The boy was running very fastly when he tripped. He hurt his knee badly. His friend helped him to stand up. They walks slowly to the bench. The boy mother soon came to fetch him home.',
    errors: [{word:'fastly',reason:'副词→fast'},{word:'badly',reason:'(无错备用)'},{word:'walks',reason:'过去时→walked'},{word:'boy mother',reason:'所有格→boy\'s mother'},{word:'fetch him home',reason:'冗余→take him home'}] },
  { text: 'Every Sunday, my whole family go to church together. We listens to the pastor preach. After the service, we usually have lunch in a nearby restaurant. The food there is always tasty. We loves these Sunday outings.',
    errors: [{word:'go',reason:'主谓一致→goes'},{word:'listens',reason:'主谓一致→listen'},{word:'a nearby',reason:'(无错备用)'},{word:'is',reason:'(无错备用)'},{word:'loves',reason:'主谓一致→love'}] },
  { text: 'I has a beautiful garden at home. There is many flowers and plants. My father water them every morning. The bees come to drink the nectar. Sometimes butterfly fly in to lay egg.',
    errors: [{word:'has',reason:'主谓一致→have'},{word:'is',reason:'主谓一致→are'},{word:'water',reason:'主谓一致→waters'},{word:'butterfly',reason:'复数→butterflies'},{word:'egg',reason:'复数→eggs'}] },
  { text: 'My class went on a learning journey to a museum yesterday. The guide explain everything in detail. We see many old artefacts. After the tour, we wrote a report on what we have learn. The teacher was please with our work.',
    errors: [{word:'explain',reason:'过去时→explained'},{word:'see',reason:'过去时→saw'},{word:'have learn',reason:'过去分词→had learnt'},{word:'please',reason:'形容词→pleased'},{word:'a museum',reason:'(无错备用)'}] }
];

// v18.3: 12 段 PSLE 风格听写, 涵盖科学/社会/校园/家庭/旅行 等主题
const LISTEN_DICTATIONS = [
  { text: 'Last Sunday, my family went to the beach. We had a wonderful picnic and played in the sand all afternoon.',
    blanks: ['Sunday','beach','wonderful','picnic','afternoon'], voice:'en-GB' },
  { text: 'The science teacher explained how plants get water through their roots and transport it to the leaves.',
    blanks: ['science','plants','water','roots','leaves'], voice:'en-GB' },
  { text: 'PSLE listening exam will test your understanding of conversations and short news reports in English.',
    blanks: ['PSLE','listening','conversations','news','English'], voice:'en-GB' },
  { text: 'Singapore is a small island country with a population of about six million people from many cultures.',
    blanks: ['Singapore','island','population','million','cultures'], voice:'en-GB' },
  { text: 'My favourite subject in school is mathematics because I enjoy solving difficult problems and puzzles.',
    blanks: ['favourite','school','mathematics','solving','puzzles'], voice:'en-GB' },
  { text: 'The library opens at nine in the morning and closes at six in the evening on weekdays.',
    blanks: ['library','nine','morning','six','weekdays'], voice:'en-GB' },
  { text: 'During the holiday, we visited the zoo and saw many animals including lions tigers and elephants.',
    blanks: ['holiday','visited','animals','tigers','elephants'], voice:'en-GB' },
  { text: 'Recycling helps protect our environment by reducing waste and saving valuable natural resources.',
    blanks: ['Recycling','protect','environment','waste','resources'], voice:'en-GB' },
  { text: 'The PSLE exam will be held in September and consists of four main subjects English Math Science and Mother Tongue.',
    blanks: ['PSLE','September','English','Science','Tongue'], voice:'en-GB' },
  { text: 'My grandmother taught me how to cook traditional dishes using fresh vegetables from her own garden.',
    blanks: ['grandmother','traditional','dishes','vegetables','garden'], voice:'en-GB' },
  { text: 'The water cycle includes evaporation condensation and precipitation which keeps water moving around the earth.',
    blanks: ['water','evaporation','condensation','precipitation','earth'], voice:'en-GB' },
  { text: 'Reading books helps you learn new words improve your vocabulary and develop a strong imagination.',
    blanks: ['Reading','words','improve','vocabulary','imagination'], voice:'en-GB' },
  // ====== v18.53 P2-B: 加 4 段 — SG 本地化 + PSLE 数字陷阱 + 转折否定 ======
  // 数字易混 (15 vs 50, 30 vs 13)
  { text: 'The MRT train arrives every fifteen minutes and the journey from Bukit Timah to Marina Bay takes about thirty minutes.',
    blanks: ['MRT','fifteen','Bukit','Marina','thirty'], voice:'en-GB' },
  // SG 生活: hawker / kopi / void deck
  { text: 'After school we often go to the hawker centre at the void deck for a plate of chicken rice and a cup of kopi.',
    blanks: ['hawker','void','deck','chicken','kopi'], voice:'en-GB' },
  // 转折否定 (although/however 后才是真意思)
  { text: 'Although the science test looked easy at first, many students actually scored below seventy percent due to careless mistakes.',
    blanks: ['Although','science','below','seventy','careless'], voice:'en-GB' },
  // 同义改写陷阱 (precipitation = rainfall)
  { text: 'The weather forecast warned that heavy precipitation would continue throughout the weekend, so outdoor activities were cancelled.',
    blanks: ['forecast','heavy','precipitation','weekend','cancelled'], voice:'en-GB' }
];

// ============= v18.25: 难度标签 (auto-tag existing + 加 hard 题库) =============
// MATH: 按 q 长度+关键词启发式分级
MATH_QUESTIONS.forEach(q => {
  if (q.diff !== undefined) return;
  const t = q.q.toLowerCase();
  const len = q.q.length;
  // 关键词路由
  if (/sqrt|²|³|根号|平方|立方/.test(t)) q.diff = 5;
  else if (/gst|tax|profit|discount.*%|compound|ratio.*ratio/.test(t)) q.diff = 4;
  else if (/speed|km\/h|km in|average|\bratio\b|km in.*h/.test(t)) q.diff = 3;
  else if (/%|of \d|\?\/\d/.test(t)) q.diff = 2;  // 百分比/分数
  else if (len < 10) q.diff = 1;  // 短题如 3+4
  else q.diff = 2;
});
// v18.54: 旧的 v18.25 push 已合并到 MATH_QUESTIONS 主体, 此处保留极少几道超 PSLE+ 挑战题
MATH_QUESTIONS.push(
  { q: 'sqrt(225) - 7²', ans: -34, diff: 5 },
  { q: '3 mins 45s in seconds', ans: 225, diff: 3 }
);

EDITING_PARAGRAPHS.forEach(p => {
  if (p.diff !== undefined) return;
  const len = (p.text || '').length;
  if (len < 90) p.diff = 1;
  else if (len < 130) p.diff = 2;
  else if (len < 180) p.diff = 3;
  else p.diff = 4;
});

LISTEN_DICTATIONS.forEach(d => {
  if (d.diff !== undefined) return;
  const len = (d.text || '').length;
  const blanks = (d.blanks || []).length;
  if (len < 80 && blanks <= 5) d.diff = 1;
  else if (len < 120) d.diff = 2;
  else if (len < 160) d.diff = 3;
  else d.diff = 4;
});

// 高级英语词汇 + 例句 (供 vocab game diff 4-5 用)
const VOCAB_HARD = [
  { en: 'photosynthesis', zh: '光合作用', diff: 3, sent: 'Plants use photosynthesis to make food from sunlight.' },
  { en: 'evaporation', zh: '蒸发', diff: 3, sent: 'Heat causes water evaporation in summer.' },
  { en: 'condensation', zh: '凝结', diff: 3, sent: 'Water vapor turns into condensation on cold glass.' },
  { en: 'congestion', zh: '拥堵', diff: 4, sent: 'Heavy traffic congestion delayed the bus.' },
  { en: 'commute', zh: '通勤', diff: 4, sent: 'My father commutes to work by MRT.' },
  { en: 'detour', zh: '绕道', diff: 4, sent: 'We had to take a detour due to road closure.' },
  { en: 'crestfallen', zh: '沮丧的', diff: 5, sent: 'He was crestfallen after losing the match.' },
  { en: 'jubilant', zh: '欢欣的', diff: 5, sent: 'The jubilant crowd cheered loudly.' },
  { en: 'phenomenon', zh: '现象', diff: 4, sent: 'Lightning is a fascinating phenomenon.' },
  { en: 'meticulous', zh: '一丝不苟的', diff: 5, sent: 'A meticulous student checks every answer.' },
  { en: 'resilient', zh: '坚韧的', diff: 4, sent: 'Resilient students bounce back from setbacks.' },
  { en: 'inevitable', zh: '不可避免的', diff: 4, sent: 'PSLE preparation is inevitable for P6 students.' },
  { en: 'tremendous', zh: '巨大的', diff: 3, sent: 'She made tremendous progress this term.' },
  { en: 'perspiration', zh: '汗水', diff: 3, sent: 'Hard work and perspiration lead to success.' }
];

// ============= v18.25: 难度自适应 helper =============
// v18.54: math game minFloor=4 (孩子 90+, 直接起 P6 难). 其他 game 保持 3 (英语弱).
function _gameMinFloor(gameKey) {
  return gameKey === 'math' ? 4 : 3;
}
function recordGameRun(state, gameKey, correct, total) {
  const minFloor = _gameMinFloor(gameKey);
  if (!state.gameStats) state.gameStats = { vocab:{difficulty:3,recent:[]}, math:{difficulty:4,recent:[]}, editing:{difficulty:3,recent:[]}, listen:{difficulty:3,recent:[]}, cloze:{difficulty:3,recent:[]} };
  if (!state.gameStats[gameKey]) state.gameStats[gameKey] = { difficulty: minFloor, recent: [] };
  state.totalGameRuns = (state.totalGameRuns || 0) + 1;  // v18.58: 累积 mini-game 局数 (用于 game-runs 装备)
  const s = state.gameStats[gameKey];
  if (s.difficulty < minFloor) s.difficulty = minFloor;
  const acc = total > 0 ? correct / total : 0;
  s.recent.push({ date: new Date().toISOString().slice(0,10), correct, total, accuracy: acc });
  if (s.recent.length > 5) s.recent.shift();
  let levelChanged = null;
  const last3 = s.recent.slice(-3);
  const last2 = s.recent.slice(-2);
  if (s.difficulty < 5 && last3.length === 3 && last3.every(r => r.accuracy >= 0.8)) {
    s.difficulty++;
    levelChanged = 'up';
    s.recent = [];
  } else if (s.difficulty > minFloor && last2.length === 2 && last2.every(r => r.accuracy <= 0.4)) {
    s.difficulty--;
    levelChanged = 'down';
    s.recent = [];
  }
  return { newDiff: s.difficulty, levelChanged };
}

function getDifficulty(state, gameKey) {
  // v18.54: math = 4, 其他 = 3
  const minFloor = _gameMinFloor(gameKey);
  if (!state.gameStats || !state.gameStats[gameKey]) return minFloor;
  return Math.max(minFloor, state.gameStats[gameKey].difficulty || minFloor);
}

// 从池中按难度采样: 主难度 70% + ±1 难度 30%
function _sampleByDiff(pool, diff, n) {
  const main = pool.filter(p => p.diff === diff);
  const near = pool.filter(p => Math.abs(p.diff - diff) === 1);
  const out = [];
  const shuffle = arr => arr.map(x => [Math.random(), x]).sort((a,b) => a[0]-b[0]).map(x => x[1]);
  const m = shuffle(main);
  const ne = shuffle(near);
  const mainCount = Math.ceil(n * 0.7);
  for (let i = 0; i < mainCount && i < m.length; i++) out.push(m[i]);
  for (let i = 0; out.length < n && i < ne.length; i++) out.push(ne[i]);
  // 不够再从全池补
  if (out.length < n) {
    const all = shuffle(pool.filter(p => !out.includes(p)));
    for (let i = 0; out.length < n && i < all.length; i++) out.push(all[i]);
  }
  return out.slice(0, n);
}

function getMathQuestionsByDiff(diff, n) {
  return _sampleByDiff(MATH_QUESTIONS, diff, n || 10);
}
function getEditingByDiff(diff) {
  const arr = _sampleByDiff(EDITING_PARAGRAPHS, diff, 1);
  return arr[0] || EDITING_PARAGRAPHS[0];
}
function getListenByDiff(diff) {
  const arr = _sampleByDiff(LISTEN_DICTATIONS, diff, 1);
  return arr[0] || LISTEN_DICTATIONS[0];
}

// 词汇按难度: 1-2 用本周 vocab, 3+ 加 VOCAB_HARD; 5 混入句子
function getVocabPairsByDiff(diff, weekN, n) {
  n = n || 6;
  const v = window.getVocabForWeek ? window.getVocabForWeek(weekN) : null;
  let basePairs = [];
  if (v && v.section && v.section.words) {
    const words = v.section.words.filter(w => VOCAB_MEANINGS && VOCAB_MEANINGS[w]);
    basePairs = words.map(w => ({ en: w, zh: VOCAB_MEANINGS[w], kind: 'word' }));
  }
  // diff 3+ 加 VOCAB_HARD 词
  if (diff >= 3) {
    const hardWords = VOCAB_HARD.filter(h => h.diff <= diff && h.diff >= diff - 1);
    basePairs = basePairs.concat(hardWords.map(h => ({ en: h.en, zh: h.zh, kind: 'word' })));
  }
  // 洗牌取词
  const sh = basePairs.map(p => [Math.random(), p]).sort((a,b) => a[0]-b[0]).map(p => p[1]);
  let result = sh.slice(0, n);
  // diff 4+ 强制混入 1-2 个句子卡 (替换最后 1-2 个 word)
  if (diff >= 4) {
    const sentPool = VOCAB_HARD.filter(h => h.sent && h.diff <= diff);
    const sShuf = sentPool.map(x => [Math.random(), x]).sort((a,b) => a[0]-b[0]).map(x => x[1]);
    const sentCount = diff === 4 ? 1 : 2;
    for (let i = 0; i < sentCount && i < sShuf.length; i++) {
      const s = sShuf[i];
      result[result.length - 1 - i] = { en: s.sent, zh: '【句】' + s.zh, kind: 'sent' };
    }
  }
  return result;
}

// ============= v18.29: PSLE 作文题库 (W1-W26, 完全按 PSLE Paper 1 Section B 格式) =============
// 每个 PSLE composition 题: theme + 3 pictures (你可选 1+ 或自己 idea) + 150+ words + 主题扣题
const PSLE_COMPOSITIONS = [
  { week: 1, theme: 'A Mistake (一次错误)', level: 'P5 入门',
    pictures: ['🎒 教室里学生发现笔记本不见了', '👨‍👧 父亲拿着不及格成绩单, 学生低头', '🚲 男孩骑车撞到老人, 想跑走'],
    structure: '开头 (设定场景) → 错误发生 → 后果 / 内心挣扎 → 改正 / 学到什么 → 结尾点题',
    tips: '第一人称叙事; 用感官描写开头(听见/闻到); 至少 1 个高级词 (crestfallen 沮丧 / regret 后悔)',
    requirement: '≥150 字 · narrative · 必须扣 "mistake" 主题' },
  { week: 2, theme: 'Honesty (诚实)', level: 'P5 入门',
    pictures: ['💵 男孩在学校走廊捡到 50 块钱', '🏪 杂货店老板多找了零钱, 顾客准备走', '📝 测验时同学传纸条, 自己怎么办'],
    structure: '设定 → 诱惑出现 → 内心挣扎 → 选择诚实 → 结果与感受',
    tips: '内心独白对比诚实 vs 不诚实; 用 dialogue 让人物活; 高级词: temptation 诱惑 / integrity 正直',
    requirement: '≥150 字 · 必须有 dialogue · 扣 "honesty"' },
  { week: 3, theme: 'A Surprise (一次惊喜)', level: 'P5 入门',
    pictures: ['🎂 生日蛋糕上写着自己名字, 朋友们躲在门后', '📦 邮差送来意外大包裹', '🌧️ 下雨天, 父母提早出现在校门口接你'],
    structure: '平凡的一天开始 → 异常细节铺垫 → 惊喜揭晓 → 情感高潮 → 反思',
    tips: '前半段 plain, 后半段 vivid 对比; 用 short sentence 制造紧张感; 高级词: jubilant 欢欣 / astonished 震惊',
    requirement: '≥150 字 · 至少 3 个感官描写 (视/听/触)' },
  { week: 4, theme: 'Helping Others (帮助他人)', level: 'P5',
    pictures: ['🦯 一个老人拿着 walking stick 过马路有困难', '🧒 同学摔倒, 书包散落', '🐱 流浪小猫卡在树上'],
    structure: '看到需要帮助的场景 → 犹豫 (要不要帮?) → 决定行动 → 帮助过程 → 被帮助者反应 + 自己感受',
    tips: '展示 inner conflict (帮 vs 不帮); 用动作描写 (action verbs); 高级词: compassion 同情 / grateful 感激',
    requirement: '≥150 字 · 必须包含被帮者的反应' },
  { week: 5, theme: 'A Lesson Learnt (一次教训)', level: 'P5',
    pictures: ['🍔 男孩偷吃妈妈做给妹妹的蛋糕', '⏰ 闹钟响了不起床, 上课迟到', '📱 手机沉迷, 忘了做作业'],
    structure: '不当行为 → 后果发生 → 受到批评/失败 → 反思 → 学到的教训 (明确写出 lesson)',
    tips: '明确点出 lesson (不要含糊); 结尾用 "From that day on, I learned that..."; 高级词: realised 意识到 / regret',
    requirement: '≥150 字 · 结尾必须有 explicit lesson' },
  { week: 6, theme: 'A Memorable Day (难忘的一天)', level: 'P5',
    pictures: ['🎢 全家去环球影城坐过山车', '🏆 学校 sports day 得奖', '👴 跟奶奶一起做传统菜'],
    structure: '为什么这天难忘 → 时间地点人物 → 主要事件 (高潮) → 细节描写 → 结尾点题为何难忘',
    tips: '不要流水账, 抓住 1-2 个 vivid moments; 用对话和感受; 高级词: unforgettable 难忘 / treasured 珍贵',
    requirement: '≥150 字 · 必须明确说为何难忘' },
  { week: 7, theme: 'Overcoming Fear (克服恐惧)', level: 'P5/P6',
    pictures: ['🌊 第一次学游泳怕水', '🎤 全校大会要演讲, 紧张到发抖', '🐶 害怕狗, 但邻居家有只大狗'],
    structure: '害怕的对象/场景 → 害怕的具体感受 (心跳加速/手心出汗) → 决定面对 → 过程挣扎 → 克服后的解放感',
    tips: '细节描写恐惧 (具体身体反应); 转折要清晰 (突然意识到 / 看到一个孩子...); 高级词: trembling 颤抖 / triumph 胜利',
    requirement: '≥160 字 · 至少描写 3 个身体反应' },
  { week: 8, theme: 'A Disagreement (一次争吵)', level: 'P5/P6',
    pictures: ['👫 跟最好的朋友争一个游戏角色', '👨‍👦 跟父亲意见不合, 摔门走', '👯‍♀️ 小组作业分工不均, 同学吵起来'],
    structure: '场景 → 分歧出现 → 升级到争吵 → 冷静期 (一方主动 / 看到对方角度) → 和解 / 妥协',
    tips: '展示双方都有道理; 用 dialogue; 结尾要有 growth (学到什么); 高级词: misunderstanding 误会 / reconciled 和解',
    requirement: '≥160 字 · 必须有 dialogue + 两方观点' },
  { week: 9, theme: 'Determination (坚持/决心)', level: 'P5/P6',
    pictures: ['🎹 学钢琴一直弹不好一段, 想放弃', '🏃 长跑训练每天练, 累', '📚 月考某科成绩差, 决定追上'],
    structure: '目标 → 困难 → 想放弃 → 坚持的转折 (一句话点醒 / 看到他人) → 行动 → 成果',
    tips: '展示反复挣扎 (不是一次就成); 用 specific time markers (Day 1, Week 2...); 高级词: persevere 坚持 / discipline 自律',
    requirement: '≥160 字 · 必须有时间推进 (至少 3 个时间点)' },
  { week: 10, theme: 'A Discovery (一次发现)', level: 'P5/P6',
    pictures: ['🔍 在阁楼发现奶奶年轻时的相册', '🌳 学校后院发现一窝小鸟', '📜 图书馆翻出一本 1950 年的旧书'],
    structure: '日常场景 → 偶然发现 → 好奇调查 → 意义 / 故事浮现 → 反思自己改变',
    tips: '前半神秘 (不直接说发现什么); 详细描写 the object 本身; 高级词: discovered 发现 / fascinating 引人入胜',
    requirement: '≥160 字 · 至少 100 字描述 the discovery 本身' },
  { week: 11, theme: 'A Special Gift (特别的礼物)', level: 'P6',
    pictures: ['🎁 生日收到一封手写信而不是玩具', '👵 奶奶给了你她年轻时戴的项链', '🌱 朋友送了一颗种子让你养'],
    structure: '收到礼物的场景 → 第一反应 (失望? 困惑?) → 慢慢理解 → 礼物背后的意义 → 礼物的影响',
    tips: '反转: 看似普通其实意义深远; 描述送礼者的心意; 高级词: meaningful 有意义的 / sentimental 充满感情的',
    requirement: '≥160 字 · 必须解释礼物背后意义' },
  { week: 12, theme: 'Forgiveness (原谅)', level: 'P6',
    pictures: ['🤝 朋友之前背叛你, 现在道歉', '💔 弟妹弄坏了你最爱的东西, 哭着道歉', '👨‍🏫 误会老师, 后来发现自己错了'],
    structure: '冲突源头 → 受伤 / 愤怒 → 时间过去 → 看到对方真心 → 决定原谅 → 关系修复 / 自己释怀',
    tips: '展示原谅的难处 (不容易, 不假); 用 inner monologue; 高级词: resentment 怨恨 / forgive 原谅 / peace of mind',
    requirement: '≥170 字 · 必须有时间跨度 (至少几天)' },
  { week: 13, theme: 'Teamwork (团队合作)', level: 'P6',
    pictures: ['⚽ 学校足球队比赛, 配合传球进球', '🎨 小组艺术展, 每人负责一部分', '🚣 户外活动 dragon boat, 全队同步划'],
    structure: '团队组成 / 个人角色 → 初期不默契 (有冲突) → 关键时刻 → 大家配合 → 成功 → 个人收获',
    tips: '展示个人 vs 集体 平衡; 描写 1-2 个团队成员个性; 高级词: collaboration 合作 / synergy 协同',
    requirement: '≥170 字 · 必须 ≥3 个具体队员名字 + 角色' },
  { week: 14, theme: 'A Turning Point (转折点)', level: 'PSLE 准',
    pictures: ['📖 读到一本书改变想法', '👨‍⚕️ 一次去医院看到 something 改变想法', '🌅 一次旅行见到新世界'],
    structure: '转折前的状态 → 触发事件 → 顿悟 (the moment of clarity) → 行为改变 → 现在的不同',
    tips: '突出 before vs after 对比; 顿悟要有具体 trigger (一句话 / 一个画面); 高级词: epiphany 顿悟 / transformed 蜕变',
    requirement: '≥170 字 · 必须有 explicit before/after 对比' },
  { week: 15, theme: 'Trust (信任)', level: 'PSLE 准',
    pictures: ['🔐 朋友把秘密告诉你, 想说还是不说', '👨‍👦 父母让你独自坐 MRT 第一次', '🏪 老板让新员工管钱'],
    structure: '被信任的场景 → 责任感 → 挑战 / 诱惑 → 选择守信 → 信任加深 / 后果',
    tips: '展示信任的重量 (不容易承担); 用第一人称内心独白; 高级词: entrusted 托付 / trustworthy 可信赖',
    requirement: '≥170 字 · 必须展示责任感与诱惑的对抗' },
  { week: 16, theme: 'Loss and Found (失而复得)', level: 'PSLE 准',
    pictures: ['👜 mall 里弄丢钱包, 四处找', '🐶 小狗走失, 全家找了 3 天', '📿 奶奶的纪念项链不见了'],
    structure: '失去 → 焦急 / 自责 → 寻找 (具体步骤) → 绝望 → 意外找到 → 失而复得的反思',
    tips: '描写 losing 的痛点 (不只是物, 还有意义); 用 time pressure; 高级词: frantic 焦急 / cherish 珍惜',
    requirement: '≥170 字 · 必须有 ≥3 个寻找步骤' },
  { week: 17, theme: 'An Adventure (一次探险)', level: 'PSLE 准',
    pictures: ['🌳 跟朋友去 Bukit Timah 探险, 迷路', '🏝️ 周末家人去 Pulau Ubin 骑车', '🚣 第一次划独木舟'],
    structure: '准备 / 期待 → 意外发生 → 危机 → 解决 → 安全 + 成长',
    tips: '描述 setting 用 sensory details; 危机要 specific (不模糊); 高级词: ventured 冒险 / breathtaking 壮观',
    requirement: '≥170 字 · 至少 1 段环境描写 ≥30 字' },
  { week: 18, theme: 'Patience (耐心)', level: 'PSLE',
    pictures: ['🌱 种植物, 每天浇水等开花', '🎨 学画画, 进步缓慢', '🍳 学做菜, 多次失败'],
    structure: '设定目标 → 想要快速结果 → 失败 / 慢 → 学着等待 → 终于成功 → 体会耐心的价值',
    tips: '用季节 / 月份推进时间感; 反复失败描写不要重复; 高级词: patience 耐心 / persistence 毅力',
    requirement: '≥180 字 · 必须有 ≥3 个失败 attempts' },
  { week: 19, theme: 'Courage (勇气)', level: 'PSLE',
    pictures: ['🛡️ 看到 bully 欺负小同学, 站出来', '🎤 报名学校演讲比赛', '🚒 火警时帮助同学撤离'],
    structure: '危险 / 挑战 → 害怕 (具体身体反应) → 内心挣扎 → 决定行动 (the moment of courage) → 行动 → 结果',
    tips: '勇气 ≠ 不害怕, 是害怕仍行动; 展示 fear + action 并存; 高级词: courage 勇气 / mustered 鼓起 / valiant 英勇',
    requirement: '≥180 字 · 必须明确写出害怕 + 勇敢两个层次' },
  { week: 20, theme: 'Generosity (慷慨)', level: 'PSLE',
    pictures: ['💰 把存的零花钱捐给灾区', '🍱 把午餐分给忘了带饭的同学', '⏰ 放弃自己时间帮父母做家务'],
    structure: '自己的拥有 (有什么) → 看到他人需要 → 内心挣扎 (给 vs 留) → 选择给予 → 受赠人反应 + 自己感受',
    tips: '展示 sacrifice (放弃了什么); 受赠人感谢要 specific; 高级词: generous 慷慨 / selfless 无私',
    requirement: '≥180 字 · 必须有 sacrifice + recipient reaction' },
  { week: 21, theme: 'Responsibility (责任)', level: 'PSLE',
    pictures: ['🐹 父母给买宠物, 自己照顾', '👶 父母不在, 自己照顾妹妹', '🏫 班长职责 — 处理同学纠纷'],
    structure: '被赋予责任 → 起初轻视 → 出问题 → 意识严重性 → 真心承担 → 完成责任 → 成长',
    tips: '展示责任的 weight (重量); 起初对比终于成熟; 高级词: responsibility 责任 / mature 成熟',
    requirement: '≥180 字 · 必须有 ≥1 个 mistake / failure 学会教训' },
  { week: 22, theme: 'Persistence (毅力)', level: 'PSLE',
    pictures: ['🎵 学乐器准备考级, 连续半年练', '📝 PSLE 模考成绩差, 半年追上', '🏃 准备校运会长跑, 3 个月训练'],
    structure: '目标 (specific) → 第 1 阶段努力 → 受挫想放弃 → 转折 (谁/什么让你坚持) → 第 2 阶段 → 第 3 阶段 → 成果',
    tips: '至少 3 个 specific 时间节点; 描写 grit (咬紧牙); 高级词: perseverance 毅力 / unwavering 坚定不移',
    requirement: '≥180 字 · 必须 ≥3 个 time stages 推进' },
  { week: 23, theme: 'A Misunderstanding (一次误会)', level: 'PSLE 高',
    pictures: ['📚 同桌偷看你测验, 其实是借橡皮擦', '👨‍👦 父亲生气以为你撒谎, 其实是误会', '👯 朋友以为你 ditch 她, 其实你病了'],
    structure: '场景 → 误会发生 → 受到不公 → 试图解释 (不被听) → 真相浮现 → 和解 / 反思 sym',
    tips: '展示双方 perspective; 解释失败的细节 (为什么 not heard); 高级词: misjudged 误判 / vindicated 平反',
    requirement: '≥180 字 · 必须包含 误会过程 + 真相揭晓' },
  { week: 24, theme: 'Growing Up (成长)', level: 'PSLE 高',
    pictures: ['📏 发现自己比一年前高了一头', '👵 帮奶奶过马路, 第一次感到自己长大', '📖 看小学相册, 突然觉得自己变了'],
    structure: '某个 trigger 让你意识到 → 对比过去 vs 现在 → 具体改变 (思想 / 行为) → 父母 / 他人评价 → 反思 ahead 未来',
    tips: '不只是长高, 是 internal growth; 用 flashback 技巧; 高级词: matured 成熟 / outgrew 超越',
    requirement: '≥190 字 · 必须有 flashback (回忆过去)' },
  { week: 25, theme: 'A Promise Kept (信守诺言)', level: 'PSLE 高',
    pictures: ['🤝 答应朋友帮忙搬家, 当天累到不行', '👵 答应每周陪奶奶散步', '📚 答应弟弟教他作业'],
    structure: '承诺场景 → 后来发现困难 → 想反悔 → 坚持守诺 → 履行 → 关系深化 + 自己骄傲',
    tips: '诱惑反悔要 specific; 展示 effort; 高级词: promised 承诺 / honoured 信守 / commitment 承诺',
    requirement: '≥190 字 · 必须有 ≥1 个 temptation to break promise' },
  { week: 26, theme: 'A Kind Stranger (一位善良的陌生人)', level: 'PSLE 综合',
    pictures: ['🚌 公车上有人帮你付车费 (你忘带钱)', '🌧️ 雨中陌生人借你伞', '🤕 跌倒受伤, 路人扶你去诊所'],
    structure: '处境 → 无助 → 陌生人出现 → 帮助过程 → 想感谢却 已离去 → 反思 + 决定将来 pay it forward',
    tips: '陌生人面孔不说太多 (留 mystery); 强调 anonymous kindness; 高级词: stranger 陌生人 / kindness / pay it forward',
    requirement: '≥190 字 · 必须有 "无法感谢" + "传递善意" 主题' },
  // === W27-W42 P6 上半学期 (16 周) ===
  { week: 27, theme: 'A Difficult Decision (艰难的决定)', level: 'P6',
    pictures: ['🎮 假期想玩 vs 复习', '👫 选两个朋友其中一个', '🏫 转学 vs 留原校'],
    structure: '决定背景 → 两条路对比 → 内心挣扎 → 做出选择 → 后果',
    tips: '展示 trade-off 痛苦; 高级词: dilemma 困境 / weighed 权衡',
    requirement: '≥180 字 · 必须 ≥2 个反面考虑' },
  { week: 28, theme: 'An Embarrassing Moment (尴尬时刻)', level: 'P6',
    pictures: ['🎤 全校演讲忘词', '🍽️ 食堂端盘子摔了', '👖 裤子破了同学指出'],
    structure: '场景 → 尴尬发生 → 想躲 → 别人反应 → 自己消化 / 学到',
    tips: '细节描写脸红/心跳; 用幽默口吻; 高级词: mortified 极尴尬 / blushed 脸红',
    requirement: '≥180 字 · 至少 1 句自嘲' },
  { week: 29, theme: 'A Goal Achieved (达成目标)', level: 'P6',
    pictures: ['🥇 校运会破纪录', '🎵 钢琴考过 6 级', '📈 月考成绩追上'],
    structure: '设定目标 → 计划 → 执行困难 → 最后冲刺 → 实现 → 庆祝 + 反思',
    tips: 'specific timeline; 高级词: accomplished 完成 / persevered 坚持',
    requirement: '≥180 字 · 必须有 deadline + 时间推进' },
  { week: 30, theme: 'Sacrifice (牺牲)', level: 'P6',
    pictures: ['💰 攒钱买礼物送父母, 自己不买想要的', '⏰ 周末陪生病爷爷, 错过和朋友 outing', '📚 让出学习时间帮妹妹做项目'],
    structure: '想要的东西 → 出现需要让出的场景 → 内心挣扎 → 选择牺牲 → 受惠人反应 + 自己的释然',
    tips: '展示 真实的损失感; 高级词: sacrificed 牺牲 / selfless 无私',
    requirement: '≥180 字 · 必须明确写自己 lose 了什么' },
  { week: 31, theme: 'Loyalty (忠诚)', level: 'P6',
    pictures: ['👯 朋友被冤枉, 你站出来作证', '🐕 老狗病了, 守在身边', '🏫 同学被孤立, 你坚持跟他玩'],
    structure: '关系建立 → 被考验 (诱惑/压力背叛) → 选择忠诚 → 代价 → 关系深化',
    tips: '展示忠诚的代价 (失去什么); 高级词: loyal 忠诚 / steadfast 坚定',
    requirement: '≥180 字 · 必须有 ≥1 个 cost of loyalty' },
  { week: 32, theme: 'A Hero (心中的英雄)', level: 'P6',
    pictures: ['👨‍🚒 消防员邻居的故事', '👵 奶奶年轻时的故事', '👩‍⚕️ Covid 期间的护士'],
    structure: '初识 hero → 一件 specific 事情 → 为何打动你 → 你受到的影响 → 你想成为怎样的人',
    tips: '不说"我的英雄是XX"开头; 用故事代替形容词; 高级词: admirable 令人敬佩 / inspired 受启发',
    requirement: '≥180 字 · 必须有 1 个 specific incident' },
  { week: 33, theme: 'Curiosity (好奇心)', level: 'P6',
    pictures: ['🔬 科学馆看到 something 想深究', '📚 图书馆翻一本书一发不可收拾', '🌌 看星空想了解宇宙'],
    structure: '好奇被激起的瞬间 → 探索过程 → 发现 → 引发更多问题 → 持续追求',
    tips: '展示 question → answer → new question 链条; 高级词: curiosity 好奇心 / inquired 探究',
    requirement: '≥180 字 · 必须有 ≥3 个 questions' },
  { week: 34, theme: 'An Apology (一次道歉)', level: 'P6',
    pictures: ['🤝 跟兄弟姐妹道歉', '👨‍🏫 跟老师道歉', '👫 跟好友道歉'],
    structure: '错误回顾 → 意识到自己错 → 鼓起勇气道歉 → 道歉过程 (不容易) → 对方反应 → 自己释怀',
    tips: '道歉要 specific (不只是 sorry); 高级词: apologise 道歉 / sincere 真诚',
    requirement: '≥180 字 · 必须有 specific apology dialogue' },
  { week: 35, theme: 'A Quarrel (一次争吵)', level: 'P6',
    pictures: ['🍔 跟弟妹抢东西', '🎮 跟朋友为游戏吵', '👨‍👦 跟父母为手机吵'],
    structure: '导火索 → 升级 → 互相指责 → 冷静期 → 谁先低头 → 和解',
    tips: '描写双方 dialogue; 不让一方完全错; 高级词: quarrelled 争吵 / reconciled 和解',
    requirement: '≥180 字 · 必须有 ≥3 句 dialogue' },
  { week: 36, theme: 'Hard Work Pays Off (努力终有回报)', level: 'P6',
    pictures: ['📊 数学持续差, 每天补习 3 个月追上', '🏃 长跑队 last place 训练到夺冠', '🎨 学画半年终于画出满意作品'],
    structure: '起点 (差/弱) → 决定改变 → 长期 commitment → 阶段成果 → 最终突破',
    tips: '至少 3 个 milestone 时间点; 高级词: diligent 勤奋 / accomplished 完成',
    requirement: '≥180 字 · 必须 ≥3 个时间节点 (1 个月/3 个月/半年)' },
  { week: 37, theme: 'A Rainy Day (一个雨天)', level: 'P6',
    pictures: ['🌧️ 放学突然下雨, 没带伞', '🚗 大雨中堵车', '🌈 雨后看到彩虹'],
    structure: '场景设定 → 突发情况 → 应对 → 转折 (善意/启示) → 雨后反思',
    tips: '充分用 sensory details (听雨声/闻土腥气); 高级词: drenched 湿透 / refreshed 焕然一新',
    requirement: '≥180 字 · 至少 5 个 sensory details' },
  { week: 38, theme: 'An Unexpected Visitor (意外访客)', level: 'P6',
    pictures: ['🚪 多年没见的远亲来访', '🐱 流浪猫天天来你家', '👮 警察来调查邻居案件'],
    structure: '日常 → 意外敲门 → 来人是谁 → 互动 → 影响生活 → 余波',
    tips: '初见的描写要 vivid; 高级词: unexpected 意外 / encountered 遇到',
    requirement: '≥180 字 · 来人外貌细节 ≥30 字' },
  { week: 39, theme: 'A Dream Come True (梦想成真)', level: 'P6',
    pictures: ['🎤 喜欢的歌手见面会被选中', '🏆 入选校队首次出场', '✈️ 第一次出国'],
    structure: '梦想由来 → 等待 → 实现的瞬间 → 实际感受 (vs 想象) → 反思',
    tips: '现实 vs 想象 对比 (有时不完全如愿); 高级词: realised 实现 / surreal 不真实',
    requirement: '≥190 字 · 必须有 想象 vs 现实对比' },
  { week: 40, theme: 'A Pet (宠物)', level: 'P6',
    pictures: ['🐕 第一次带狗回家', '🐠 鱼缸里的金鱼陪你 5 年', '🐹 仓鼠生病要照顾'],
    structure: '相遇 → 日常陪伴 → 一次困难 → 关系深化 → 教会你什么',
    tips: '不说宠物可爱, 用 specific behaviors; 高级词: companion 伙伴 / devoted 忠诚',
    requirement: '≥190 字 · ≥3 个 specific 习惯/动作' },
  { week: 41, theme: 'A New Friend (一位新朋友)', level: 'P6',
    pictures: ['👋 转学第一天结识', '🎮 游戏里认识 IRL 见面', '🏃 体育课分组配对'],
    structure: '初见印象 → 渐渐了解 → 共同 moment → 友谊建立 → 现在的关系',
    tips: '描写共同点 vs 不同; 高级词: acquaintance 熟人 / kindred 同道',
    requirement: '≥190 字 · 必须有 1 个 bonding moment' },
  { week: 42, theme: 'A Family Tradition (家庭传统)', level: 'P6',
    pictures: ['🥟 春节包饺子', '🎂 生日仪式', '🏞️ 每年清明扫墓'],
    structure: '传统由来 → 每年怎么做 → 一次特别的 → 你的角色 → 传承的意义',
    tips: '细节描写动作; 突出文化感; 高级词: tradition 传统 / heritage 传承',
    requirement: '≥190 字 · 必须 ≥1 个 ritual 细节' },
  // === W43-W65 PSLE 冲刺 (23 周) ===
  { week: 43, theme: 'An Inspiring Person (启发我的人)', level: 'PSLE 冲刺',
    pictures: ['👨‍🏫 老师一句话改变想法', '👵 奶奶年轻时的故事', '📺 名人传记打动你'],
    structure: '相遇/初识 → 一件 specific 事 → 受到的具体影响 → 你的改变 → 这个人之于你',
    tips: '不要笼统赞美, 用故事; 高级词: inspired 启发 / role model 榜样',
    requirement: '≥190 字 · 必须 ≥1 specific incident' },
  { week: 44, theme: 'A Childhood Memory (童年回忆)', level: 'PSLE 冲刺',
    pictures: ['🎈 5 岁第一次去游乐园', '🏖️ 海边玩沙', '🎂 第一次自己生日'],
    structure: '场景 (用 sensory recall) → 事件 → 当时感受 (孩子视角) → 现在回看 → 意义',
    tips: '童年视角 (不要太成熟); 高级词: nostalgic 怀旧 / vivid 鲜明',
    requirement: '≥190 字 · 必须有 then-vs-now 对比' },
  { week: 45, theme: 'A Festival Celebration (节日庆祝)', level: 'PSLE 冲刺',
    pictures: ['🥮 中秋赏月吃饼', '🎆 跨年烟花', '🎁 圣诞交换礼物'],
    structure: '节日由来/期待 → 准备过程 → 庆祝高潮 → 一个 special moment → 节日的意义',
    tips: '描写传统活动细节; 高级词: festive 节日 / cherished 珍贵',
    requirement: '≥190 字 · 必须有 cultural/traditional 元素' },
  { week: 46, theme: 'A Selfless Act (一次无私的行为)', level: 'PSLE 冲刺',
    pictures: ['💰 把零花钱给乞讨的人', '🍱 自己饿肚子让朋友吃饱', '⏰ 加班帮同学复习'],
    structure: '看到需要 → 自己也需要这个东西 → 选择给予 → 失去 + 得到 → 内心的平和',
    tips: '展示真实 sacrifice 不是 noble; 高级词: selfless 无私 / altruistic 利他',
    requirement: '≥190 字 · 必须 explicit 自己 lost 了什么' },
  { week: 47, theme: 'A Talent Show (才艺秀)', level: 'PSLE 冲刺',
    pictures: ['🎵 学校 talent show 上台', '🏫 班级表演节目', '👶 家庭聚会展示才艺'],
    structure: '准备 → 紧张 → 上台 → 表演中转折 (失误 / 高光) → 反应 → 成长',
    tips: '描写舞台紧张感 (心跳/手汗); 高级词: nervous 紧张 / showcased 展示',
    requirement: '≥190 字 · 必须有 1 个 turning point on stage' },
  { week: 48, theme: 'A New Skill Learnt (学会新技能)', level: 'PSLE 冲刺',
    pictures: ['🚲 学骑自行车摔很多次', '🍳 学做菜烧焦', '🏊 学游泳呛水'],
    structure: '决定学 → 第 1 阶段笨拙 → 失败 → 转折 (好教练 / 顿悟) → 突破 → 现在能做',
    tips: '物理细节 (动作/失败方式); 高级词: mastered 掌握 / persevered 坚持',
    requirement: '≥190 字 · 至少 ≥3 个 failure attempts' },
  { week: 49, theme: 'A Field Trip (一次郊游)', level: 'PSLE 冲刺',
    pictures: ['🌳 学校组织 Bukit Timah hike', '🏛️ 博物馆 trip', '🐠 S.E.A. Aquarium 一日'],
    structure: '出发期待 → 地点描写 → 一件意外 → 学到/见到什么 → 回程感受',
    tips: '描写 setting; 高级词: explored 探索 / fascinating 引人入胜',
    requirement: '≥190 字 · ≥1 段环境描写 ≥40 字' },
  { week: 50, theme: 'An Argument with a Friend (跟朋友争论)', level: 'PSLE 冲刺',
    pictures: ['📱 借手机不还争吵', '🎮 玩法分歧', '🍱 食物分配不均'],
    structure: '触发 → 各执一词 → 争吵升级 → 冷静 → 一方主动 → 和解',
    tips: '双方 dialogue 平衡; 高级词: argued 争论 / resolved 解决',
    requirement: '≥190 字 · ≥4 句 dialogue' },
  { week: 51, theme: 'A Heroic Deed (一次英勇之举)', level: 'PSLE 冲刺',
    pictures: ['🚒 火灾时帮助同学撤离', '💧 救溺水的小孩', '🚗 看到事故第一个施救'],
    structure: '场景 (危险出现) → 别人都愣住 → 你冲上去 → 救助过程 → 后续 + 反思',
    tips: '动作要 specific; 高级词: heroic 英勇 / instinct 本能',
    requirement: '≥190 字 · 必须 ≥3 个 action verbs' },
  { week: 52, theme: 'A Special Recipe (特别的食谱)', level: 'PSLE 冲刺',
    pictures: ['🥟 奶奶的饺子', '🍰 妈妈的生日蛋糕', '🍜 自己第一次成功做的菜'],
    structure: '食谱由来 → 制作过程 → 一次特别的 → 食物之于家庭 → 传承意义',
    tips: '动作 verbs 要 vivid; 高级词: cherished 珍贵 / tradition',
    requirement: '≥190 字 · 必须有 ≥3 个 cooking 动作描写' },
  { week: 53, theme: 'A Memorable Teacher (难忘的老师)', level: 'PSLE 冲刺',
    pictures: ['👨‍🏫 严厉但用心的数学老师', '👩‍🏫 鼓励你的英文老师', '🎓 退休前的告别课'],
    structure: '初识印象 → 一件 specific 事 → 影响 → 你的改变 → 现在的回忆',
    tips: 'teacher 性格要 specific; 高级词: dedicated 敬业 / influential 有影响',
    requirement: '≥200 字 · 必须 ≥1 个 quote from teacher' },
  { week: 54, theme: 'A Misunderstanding Resolved (误会解开)', level: 'PSLE 冲刺',
    pictures: ['👯 朋友以为你 ditch 她, 真相是你病了', '👨‍👦 父亲误会撒谎', '🏫 老师误会作弊'],
    structure: '误会发生 → 受伤 → 试图解释失败 → 真相浮现 → 道歉 + 关系修复',
    tips: '展示双方 perspective; 高级词: misunderstood 误解 / vindicated 平反',
    requirement: '≥200 字 · 必须有 explanation moment' },
  { week: 55, theme: 'A Moment of Fear (恐惧时刻)', level: 'PSLE 冲刺',
    pictures: ['🐍 走山路遇蛇', '🌑 晚上独自在家停电', '🚙 坐车遇险'],
    structure: '场景 → 害怕的具体表现 → 内心挣扎 → 应对 → 安全 → 反思',
    tips: '身体反应描写 (颤抖/心跳); 高级词: terrified 恐惧 / overcame 克服',
    requirement: '≥200 字 · ≥3 个身体反应' },
  { week: 56, theme: 'An Achievement I am Proud Of (骄傲的成就)', level: 'PSLE 冲刺',
    pictures: ['🥇 比赛得第一', '📊 月考从 60 到 90', '🎵 钢琴考级满分'],
    structure: '目标背景 → 努力过程 → 关键时刻 → 实现 → 内心 pride + 教训',
    tips: 'pride 不要自满, 配 humility; 高级词: accomplished / proud',
    requirement: '≥200 字 · 必须 ≥1 个 humbling 时刻' },
  { week: 57, theme: 'A Second Chance (再一次机会)', level: 'PSLE 冲刺',
    pictures: ['📝 月考重考机会', '👫 友谊修复', '⚽ 教练给你 last chance 入选'],
    structure: '第 1 次失败 → 反思 → 得到 second chance → 准备 → 这次表现 → 结果',
    tips: '展示 growth; 高级词: redeemed 救赎 / opportunity',
    requirement: '≥200 字 · 必须有 explicit 失败 → 反思 → 改变' },
  { week: 58, theme: 'The Most Helpful Friend (最帮我的朋友)', level: 'PSLE 冲刺',
    pictures: ['📚 PSLE 复习陪你的朋友', '💔 失意时安慰你的朋友', '🚲 摔倒第一个扶你的朋友'],
    structure: '朋友介绍 → 1 件 specific 事 (不模糊) → 你的状态 → 朋友的帮助 → 友谊深化',
    tips: '不说 friend nice, 用 specific actions; 高级词: supportive 支持 / steadfast 坚定',
    requirement: '≥200 字 · ≥1 个 specific 帮助场景' },
  { week: 59, theme: 'A Lesson from Nature (从自然学到的)', level: 'PSLE 冲刺',
    pictures: ['🌱 看种子破土而出', '🦋 看毛毛虫变蝴蝶', '🌳 大风后倒下的树又发新芽'],
    structure: '观察自然现象 → 细节描写 → 联想到自己/人生 → 感悟 → 行为改变',
    tips: '从自然到人生的转折要自然; 高级词: observed 观察 / metaphor 隐喻',
    requirement: '≥200 字 · 必须有 nature → life lesson 转折' },
  { week: 60, theme: 'A Stranger Who Changed My View (改变我看法的陌生人)', level: 'PSLE 冲刺',
    pictures: ['🚌 公车上听到陌生人对话', '🏪 服务员一句话点醒你', '👴 公园里聊天的老人'],
    structure: '日常 → 偶遇陌生人 → 一句话/一个动作 → 触动 → 你的改变',
    tips: '陌生人不需要 dramatic, 平凡反而真实; 高级词: encounter 邂逅 / perspective 视角',
    requirement: '≥200 字 · 陌生人不超过 50 字描述' },
  { week: 61, theme: 'A Time I Felt Alone (一次孤独的时刻)', level: 'PSLE 冲刺',
    pictures: ['🏫 转学第一天没人理', '🎉 朋友们玩没叫你', '🌙 晚上一个人在家'],
    structure: '场景 → 孤独感升起 → 内心独白 → 转折 (谁出现 / 什么改变) → 走出',
    tips: '孤独要 honest 不悲情; 高级词: isolated 孤立 / solitary 独处',
    requirement: '≥200 字 · ≥1 段 inner monologue' },
  { week: 62, theme: 'A Promise I Kept (我守的承诺)', level: 'PSLE 冲刺',
    pictures: ['🤝 帮朋友搬家累', '👵 每周陪奶奶散步', '📚 教弟弟功课'],
    structure: '承诺 → 困难出现 → 想反悔 → 坚持 → 履行 → 自我感受',
    tips: '反悔诱惑要 specific; 高级词: honoured 信守 / commitment',
    requirement: '≥200 字 · ≥1 个 temptation to break promise' },
  { week: 63, theme: 'A Time I Stood Up for Someone (替人发声)', level: 'PSLE 冲刺',
    pictures: ['🛡️ 同学被 bully 你站出来', '👴 公交上让座给老人有人骂', '🏫 老师误责备同学你解释'],
    structure: '不公场景 → 别人沉默 → 内心挣扎 → 站出来 → 后果 → 反思',
    tips: '展示恐惧 + 勇气并存; 高级词: defended 捍卫 / brave',
    requirement: '≥200 字 · 必须有 fear + courage 双层' },
  { week: 64, theme: 'My Greatest Fear Conquered (战胜最大恐惧)', level: 'PSLE 冲刺',
    pictures: ['🏊 怕水学游泳', '🎤 怕公开演讲报名比赛', '🐶 怕狗去帮助流浪狗'],
    structure: '恐惧由来 (小时候?) → 决定面对 → 准备 → 实战 → 战胜后的感受',
    tips: 'fear 来源要 specific; 高级词: phobia 恐惧症 / triumph 胜利',
    requirement: '≥200 字 · 必须有恐惧的 origin story' },
  { week: 65, theme: 'A Moment I Will Never Forget (永远难忘的时刻)', level: 'PSLE 冲刺',
    pictures: ['🎓 毕业典礼', '👶 弟弟出生', '🌅 看日出的瞬间'],
    structure: '场景设定 → moment 描写 (慢镜头) → 当时感受 → 为什么难忘 → 现在回想',
    tips: 'moment 用 freeze frame 写法; 高级词: unforgettable / etched 铭刻',
    requirement: '≥210 字 · moment 本身 ≥80 字描写' },
  // === W66-W73 PSLE 周 (8 周, 真题模拟 + 复习) ===
  { week: 66, theme: '【模考周】回到 W7 Overcoming Fear, 重写一遍 (PSLE level)', level: 'PSLE 模考',
    pictures: ['(W7 题) 学游泳 / 演讲 / 怕狗'],
    structure: '用学到的所有技巧重写; 对比第一次的版本',
    tips: '高级词 ≥5 个; dialogue ≥4 句; sensory details ≥5',
    requirement: '≥220 字 · 必须比 W7 版本进步' },
  { week: 67, theme: '【模考周】回到 W14 A Turning Point, 重写一遍', level: 'PSLE 模考',
    pictures: ['(W14 题) 读书 / 医院 / 旅行'],
    structure: '用 PSLE 全套 toolkit', tips: '比 W14 字数多 50, 用更多 advanced vocab',
    requirement: '≥220 字' },
  { week: 68, theme: '【PSLE 口试周】不写作文, 专注 Oral 准备', level: 'PSLE 真考',
    pictures: ['口试日 8.12-13'],
    structure: '复习过往作文 themes 当 oral 素材', tips: '熟悉 30 个高级词',
    requirement: '本周 0 作文, 专心口试' },
  { week: 69, theme: '【PSLE 复习】挑 W1-W26 任意 1 题重写', level: 'PSLE 复习',
    pictures: ['任选'], structure: '检查所有学过的技巧', tips: '自评 + 父母给反馈',
    requirement: '≥220 字 + 自评 1 段' },
  { week: 70, theme: '【PSLE 复习】挑 W27-W42 任意 1 题重写', level: 'PSLE 复习',
    pictures: ['任选'], structure: '同上', tips: '同上',
    requirement: '≥220 字 + 自评' },
  { week: 71, theme: '【PSLE 复习】挑 W43-W65 任意 1 题重写', level: 'PSLE 复习',
    pictures: ['任选'], structure: '同上', tips: '同上',
    requirement: '≥220 字 + 自评' },
  { week: 72, theme: '【PSLE 听力周】不写作文', level: 'PSLE 真考',
    pictures: ['听力 9.15'], structure: '复习听力 4 步法 + 真题', tips: '不练作文',
    requirement: '本周 0 作文, 专心听力' },
  { week: 73, theme: '【PSLE 笔试周】不写作文 — 真考!', level: 'PSLE 真考',
    pictures: ['9.24-30 真考'], structure: '休息 + 调整状态', tips: '相信平时积累',
    requirement: '本周 0 作文, 上考场!' }
];

function getCompositionPrompt(weekN) {
  return PSLE_COMPOSITIONS.find(c => c.week === weekN) || null;
}

// ============= v18.28: 4 个新 mini-game 数据池 =============

// 1. 单位换算 (~50 道, 5 级)
const UNIT_CONVERSIONS = [
  // diff 1 — P3 简单
  { q: '1 m = ? cm', ans: 100, diff: 1 },
  { q: '1 km = ? m', ans: 1000, diff: 1 },
  { q: '1 kg = ? g', ans: 1000, diff: 1 },
  { q: '1 L = ? ml', ans: 1000, diff: 1 },
  { q: '1 h = ? min', ans: 60, diff: 1 },
  { q: '1 min = ? sec', ans: 60, diff: 1 },
  { q: '2 m = ? cm', ans: 200, diff: 1 },
  { q: '3 kg = ? g', ans: 3000, diff: 1 },
  { q: '5 L = ? ml', ans: 5000, diff: 1 },
  { q: '2 km = ? m', ans: 2000, diff: 1 },
  // diff 2 — P4
  { q: '1.5 m = ? cm', ans: 150, diff: 2 },
  { q: '2.5 kg = ? g', ans: 2500, diff: 2 },
  { q: '1.5 L = ? ml', ans: 1500, diff: 2 },
  { q: '0.5 km = ? m', ans: 500, diff: 2 },
  { q: '90 min = ? h ? min (输 h*100+min)', ans: 130, diff: 2 },  // 1h30min
  { q: '120 min = ? h', ans: 2, diff: 2 },
  { q: '300 cm = ? m', ans: 3, diff: 2 },
  { q: '4500 g = ? kg ? g (输 kg*1000+g)', ans: 4500, diff: 2 },  // 4kg500g
  // diff 3 — P5 (混合单位)
  { q: '2 h 30 min = ? min', ans: 150, diff: 3 },
  { q: '3 L 500 ml = ? ml', ans: 3500, diff: 3 },
  { q: '1 m 25 cm = ? cm', ans: 125, diff: 3 },
  { q: '5 kg 200 g = ? g', ans: 5200, diff: 3 },
  { q: '750 cm = ? m ? cm (输 m*100+cm)', ans: 750, diff: 3 },  // 7m50cm
  { q: '3500 ml = ? L ? ml (输 L*1000+ml)', ans: 3500, diff: 3 },
  { q: '180 sec = ? min', ans: 3, diff: 3 },
  { q: '4 h 15 min = ? min', ans: 255, diff: 3 },
  // diff 4 — PSLE
  { q: '0.45 km = ? m', ans: 450, diff: 4 },
  { q: '2.75 L = ? ml', ans: 2750, diff: 4 },
  { q: '1.25 kg = ? g', ans: 1250, diff: 4 },
  { q: '675 cm = ? m (小数, 输 cm/100*100, 即 6.75 输 675)', ans: 675, diff: 4 },
  { q: '2 km 350 m = ? m', ans: 2350, diff: 4 },
  { q: '8 h 20 min = ? min', ans: 500, diff: 4 },
  { q: '6500 ml = ? L (小数 ×100, 即 6.5 输 650)', ans: 650, diff: 4 },
  { q: '0.08 km = ? m', ans: 80, diff: 4 },
  // diff 5 — 超 PSLE
  { q: '5400 sec = ? h ? min (输 h*100+min)', ans: 130, diff: 5 },  // 1h 30min
  { q: '2.5 h = ? sec', ans: 9000, diff: 5 },
  { q: '0.005 km = ? cm', ans: 500, diff: 5 },
  { q: '12500 g = ? kg (×100, 即 12.5 输 1250)', ans: 1250, diff: 5 },
  { q: '3 days = ? hours', ans: 72, diff: 5 },
  { q: '1 week = ? hours', ans: 168, diff: 5 }
];

// 2. Grammar MCQ (~40 道)
const GRAMMAR_QUESTIONS = [
  // diff 1 — 主谓 / 时态基础
  { q: 'He ___ to school every day.', opts: ['go','goes','going','gone'], ans: 1, diff: 1, tag: '主谓' },
  { q: 'They ___ playing football.', opts: ['is','are','am','be'], ans: 1, diff: 1, tag: '主谓' },
  { q: 'I ___ a student.', opts: ['am','is','are','be'], ans: 0, diff: 1, tag: '主谓' },
  { q: 'She ___ a book now.', opts: ['read','reads','is reading','are reading'], ans: 2, diff: 1, tag: '现在进行' },
  { q: 'My brother ___ tall.', opts: ['is','are','am','be'], ans: 0, diff: 1, tag: '主谓' },
  // diff 2 — 时态扩展
  { q: 'Yesterday I ___ a movie.', opts: ['watch','watches','watched','watching'], ans: 2, diff: 2, tag: '过去时' },
  { q: 'Tomorrow we ___ to the park.', opts: ['go','went','will go','going'], ans: 2, diff: 2, tag: '将来时' },
  { q: 'I ___ my homework already.', opts: ['finish','finished','have finished','finishing'], ans: 2, diff: 2, tag: '完成时' },
  { q: 'When I arrived, she ___ TV.', opts: ['watch','watched','was watching','watching'], ans: 2, diff: 2, tag: '过去进行' },
  { q: 'He ___ in Singapore for 5 years.', opts: ['live','lived','has lived','living'], ans: 2, diff: 2, tag: '现在完成' },
  // diff 3 — 比较级 / 介词
  { q: 'She is ___ than me.', opts: ['taller','more taller','tallest','tall'], ans: 0, diff: 3, tag: '比较级' },
  { q: 'This is the ___ book I have read.', opts: ['good','better','best','well'], ans: 2, diff: 3, tag: '最高级' },
  { q: 'The cat is ___ the chair.', opts: ['under','at','in','on top'], ans: 0, diff: 3, tag: '介词' },
  { q: 'I am good ___ math.', opts: ['at','in','on','to'], ans: 0, diff: 3, tag: '介词搭配' },
  { q: 'Be careful ___ the hot soup.', opts: ['with','of','to','in'], ans: 0, diff: 3, tag: '介词' },
  // diff 4 — 高频陷阱
  { q: 'If it rains, I ___ at home.', opts: ['stay','will stay','stayed','staying'], ans: 1, diff: 4, tag: '条件句' },
  { q: 'Neither John ___ Mary likes durian.', opts: ['or','nor','and','but'], ans: 1, diff: 4, tag: 'neither/nor' },
  { q: 'She speaks English ___ than her brother.', opts: ['good','better','best','more well'], ans: 1, diff: 4, tag: '副词比较' },
  { q: 'I would rather ___ tea than coffee.', opts: ['drink','drinks','drinking','to drink'], ans: 0, diff: 4, tag: 'would rather' },
  { q: 'The book ___ I borrowed is interesting.', opts: ['who','which','whom','whose'], ans: 1, diff: 4, tag: '关系代词' },
  // diff 5 — PSLE+ 难点
  { q: 'Neither of them ___ here.', opts: ['is','are','were','have'], ans: 0, diff: 5, tag: '主谓陷阱' },
  { q: 'Each of the boys ___ a prize.', opts: ['receive','receives','receiving','have'], ans: 1, diff: 5, tag: '主谓陷阱' },
  { q: 'The news ___ shocking.', opts: ['is','are','were','being'], ans: 0, diff: 5, tag: '不可数主谓' },
  { q: 'Hardly ___ I sat down when the phone rang.', opts: ['have','had','did','was'], ans: 1, diff: 5, tag: '倒装' },
  { q: 'Not only ___ smart, but also kind.', opts: ['he is','is he','he was','was him'], ans: 1, diff: 5, tag: '倒装' },
  // ====== v18.52: 加 15 题, 重点 article + pronoun (PSLE Grammar Cloze 高频) ======
  // === 冠词 (a / an / the / 0) — PSLE Cloze 占 30% ===
  { q: 'I saw ___ elephant at the zoo.', opts: ['a','an','the','/'], ans: 1, diff: 2, tag: '冠词-元音' },
  { q: 'My mother is ___ teacher.', opts: ['a','an','the','/'], ans: 0, diff: 2, tag: '冠词-辅音' },
  { q: 'He plays ___ football every weekend.', opts: ['a','an','the','/'], ans: 3, diff: 3, tag: '冠词-球类不加' },
  { q: 'The Sun rises in ___ east.', opts: ['a','an','the','/'], ans: 2, diff: 3, tag: '冠词-方位the' },
  { q: 'She is ___ honest student.', opts: ['a','an','the','/'], ans: 1, diff: 3, tag: '冠词-h不发音' },
  { q: 'I want to be ___ engineer when I grow up.', opts: ['a','an','the','/'], ans: 1, diff: 3, tag: '冠词-元音音' },
  // === 代词 (主格/宾格/所有格/反身) — PSLE 必考 ===
  { q: 'My brother and ___ went to the park.', opts: ['I','me','my','myself'], ans: 0, diff: 3, tag: '代词-主格' },
  { q: 'The teacher gave the prize to John and ___.', opts: ['I','me','my','myself'], ans: 1, diff: 3, tag: '代词-宾格' },
  { q: 'She did the homework by ___.', opts: ['her','herself','she','hers'], ans: 1, diff: 3, tag: '代词-反身' },
  { q: 'This pen is ___, not yours.', opts: ['my','mine','me','I'], ans: 1, diff: 4, tag: '代词-名词性物主' },
  { q: 'The cat licked ___ paws.', opts: ['it','its','it\'s','itself'], ans: 1, diff: 4, tag: '代词-its陷阱' },
  { q: 'Everyone should bring ___ own pencil.', opts: ['his or her','their','its','one\'s'], ans: 0, diff: 5, tag: '代词-everyone' },
  { q: 'Between you and ___, this is a secret.', opts: ['I','me','my','myself'], ans: 1, diff: 5, tag: '代词-between后宾格' },
  // === 修饰主谓陷阱 (article + pronoun 联动) ===
  { q: 'A group of students ___ waiting outside.', opts: ['is','are','was','have'], ans: 0, diff: 5, tag: '主谓-集合主语' },
  { q: 'One of the books ___ missing.', opts: ['is','are','were','being'], ans: 0, diff: 5, tag: '主谓-one of' }
];

// 3. Cloze 单空填 (~40 道)
const CLOZE_QUESTIONS = [
  // diff 1 — 基础介词
  { sentence: 'I went ___ school yesterday.', opts: ['to','at','in','on'], ans: 0, diff: 1 },
  { sentence: 'The book is ___ the table.', opts: ['on','at','in','to'], ans: 0, diff: 1 },
  { sentence: 'I live ___ Singapore.', opts: ['in','at','on','to'], ans: 0, diff: 1 },
  { sentence: 'She is afraid ___ dogs.', opts: ['of','from','to','at'], ans: 0, diff: 1 },
  { sentence: 'Class starts ___ 8 am.', opts: ['at','on','in','to'], ans: 0, diff: 1 },
  // diff 2 — 冠词/简单
  { sentence: '___ apple a day keeps the doctor away.', opts: ['An','A','The','One'], ans: 0, diff: 2, tag: '冠词' },
  { sentence: 'She is ___ honest girl.', opts: ['an','a','the','one'], ans: 0, diff: 2, tag: '冠词' },
  { sentence: 'I had ___ cup of tea.', opts: ['a','an','the','some'], ans: 0, diff: 2, tag: '冠词' },
  { sentence: 'He plays ___ piano well.', opts: ['the','a','an','/'], ans: 0, diff: 2, tag: '冠词' },
  { sentence: 'My dad goes to work ___ MRT.', opts: ['by','on','in','with'], ans: 0, diff: 2, tag: '介词' },
  // diff 3 — 介词搭配
  { sentence: 'She arrived ___ Singapore last week.', opts: ['in','at','on','to'], ans: 0, diff: 3 },
  { sentence: 'I am interested ___ science.', opts: ['in','at','on','about'], ans: 0, diff: 3 },
  { sentence: "Don't laugh ___ him!", opts: ['at','to','of','with'], ans: 0, diff: 3 },
  { sentence: 'We will meet ___ Monday.', opts: ['on','at','in','from'], ans: 0, diff: 3 },
  { sentence: 'She is married ___ a doctor.', opts: ['to','with','of','at'], ans: 0, diff: 3 },
  // diff 4 — phrasal verbs
  { sentence: 'I came ___ this old photo in the attic.', opts: ['across','at','on','through'], ans: 0, diff: 4, tag: 'phrasal' },
  { sentence: 'Please look ___ the children while I go out.', opts: ['after','at','for','into'], ans: 0, diff: 4, tag: 'phrasal' },
  { sentence: 'The fire broke ___ at midnight.', opts: ['out','in','off','down'], ans: 0, diff: 4, tag: 'phrasal' },
  { sentence: 'He gave ___ smoking last year.', opts: ['up','off','in','out'], ans: 0, diff: 4, tag: 'phrasal' },
  { sentence: 'They put ___ the meeting to next week.', opts: ['off','in','out','down'], ans: 0, diff: 4, tag: 'phrasal' },
  // diff 5 — 难混淆
  { sentence: 'Despite ___ tired, he kept working.', opts: ['being','to be','was','being a'], ans: 0, diff: 5 },
  { sentence: "The students were dismissed ___ the principal's announcement.", opts: ['upon','at','on','in'], ans: 0, diff: 5 },
  { sentence: 'She was so engrossed ___ the book.', opts: ['in','at','with','on'], ans: 0, diff: 5 },
  { sentence: 'I prefer reading ___ watching TV.', opts: ['to','than','rather','more'], ans: 0, diff: 5 },
  { sentence: 'He had no choice ___ to apologize.', opts: ['but','than','rather','then'], ans: 0, diff: 5 },
  // ====== v18.52: 加 8 道 PSLE 段落风 Cloze (30-50 词 context, 模拟真考 Vocab+Grammar Cloze) ======
  { sentence: 'After working tirelessly for ten hours under the scorching sun, the construction workers were ___ exhausted.', opts: ['utterly','quite','rather','barely'], ans: 0, diff: 5, tag: 'context-vocab' },
  { sentence: 'Although the storm warning was issued early, many residents ___ to evacuate, hoping the typhoon would change course.', opts: ['refused','accepted','hurried','agreed'], ans: 0, diff: 4, tag: 'context-vocab' },
  { sentence: 'The teacher reminded the class that ___ a complete sentence requires both a subject and a verb.', opts: ['constructing','construct','to constructs','constructed'], ans: 0, diff: 4, tag: 'context-grammar' },
  { sentence: 'By the time the firefighters arrived, the entire building ___ to the ground.', opts: ['burned','was burning','had burned','has burned'], ans: 2, diff: 5, tag: 'context-grammar-pluperfect' },
  { sentence: 'Despite ___ the fastest runner in the school, Ahmad lost the race because he tripped over a stone.', opts: ['being','been','to be','is'], ans: 0, diff: 5, tag: 'context-grammar-despite' },
  { sentence: 'The librarian, ___ patience with the noisy children was wearing thin, finally asked them to leave.', opts: ['who','whom','whose','which'], ans: 2, diff: 5, tag: 'context-grammar-whose' },
  { sentence: 'If I ___ harder for the test, I would not have failed it.', opts: ['studied','had studied','have studied','study'], ans: 1, diff: 5, tag: 'context-grammar-conditional3' },
  { sentence: 'The detective examined the crime scene ___, looking for any clue that might have been overlooked.', opts: ['meticulously','barely','randomly','quickly'], ans: 0, diff: 5, tag: 'context-vocab-adv' }
];

// v18.40: PSLE 高华阅读理解题库 (新加坡 PSLE 高级华文 Paper 2 风格)
const CHINESE_READING = [
  {
    title: '友情', diff: 3,
    passage: '小明和小华是一对好朋友, 他们从幼儿园开始就在一起玩。一天, 小明的笔不见了, 他怀疑是小华拿的, 两人因此吵了一架。小华很伤心地走开了。回家后, 小明在书包夹层里发现了那支笔, 才意识到自己冤枉了好朋友。第二天上学, 小明红着脸向小华道歉, 还把自己心爱的橡皮送给他。小华笑着说: "好朋友之间最重要的是信任, 以后有话直接说就行。"',
    questions: [
      { q: '小明为什么和小华吵架?', opts: ['因为笔不见了, 怀疑小华拿的', '因为小华抢他的玩具', '因为两人意见不合', '因为小华上课不专心'], ans: 0, explain: '原文: "他怀疑是小华拿的, 两人因此吵了一架"' },
      { q: '后来小明发现笔在哪里?', opts: ['书桌上', '书包夹层里', '小华那里', '老师那里'], ans: 1, explain: '原文: "在书包夹层里发现了那支笔"' },
      { q: '小华认为好朋友之间最重要的是什么?', opts: ['一起玩', '信任', '送礼物', '不吵架'], ans: 1, explain: '原文最后: "好朋友之间最重要的是信任"' },
      { q: '从这个故事我们学到什么?', opts: ['不要送礼物给朋友', '怀疑别人前先确认事实', '应该一直不说话', '不要相信任何人'], ans: 1, explain: '故事教训: 别冤枉人, 先查事实' }
    ]
  },
  {
    title: '勤奋的农夫', diff: 3,
    passage: '从前有一位老农夫, 临终前把三个儿子叫到床边, 说: "我的葡萄园里埋着宝藏, 你们去挖吧。" 父亲去世后, 三兄弟把整个葡萄园翻了个遍, 却没找到金银财宝。但是那年葡萄园丰收了, 葡萄又大又甜, 卖了好多钱。三兄弟这才明白父亲的真意 — 勤劳就是最大的财富。',
    questions: [
      { q: '老农夫临终前告诉儿子什么?', opts: ['葡萄园会丰收', '葡萄园里埋着宝藏', '让他们卖掉葡萄园', '让他们离开葡萄园'], ans: 1, explain: '原文: "我的葡萄园里埋着宝藏, 你们去挖吧"' },
      { q: '三兄弟挖到了什么?', opts: ['金银财宝', '老父亲的遗物', '什么都没挖到', '一些古董'], ans: 2, explain: '原文: "却没找到金银财宝", 没挖到宝藏' },
      { q: '为什么葡萄园会丰收?', opts: ['天气好', '土被翻了, 种得好', '运气好', '葡萄品种好'], ans: 1, explain: '兄弟翻土 = 松土除草, 自然丰收' },
      { q: '父亲说的"宝藏"指的是?', opts: ['真的金银', '葡萄园本身', '勤劳', '兄弟感情'], ans: 2, explain: '原文最后: "勤劳就是最大的财富"' }
    ]
  },
  {
    title: '中秋赏月', diff: 3,
    passage: '中秋节是中国传统节日之一, 在农历八月十五。这一天家人团圆, 一起赏月吃月饼。中秋节起源于古代帝王秋季祭月的习俗, 到了唐朝才逐渐流行成为大众节日。月饼最早是祭月用的供品, 后来演变成节日食品。中秋的月亮格外圆又亮, 象征家人团圆。如今, 即使家人分散在各地, 看到同一轮明月, 也能感受到彼此的思念。',
    questions: [
      { q: '中秋节是哪一天?', opts: ['农历八月十五', '农历七月十五', '阳历八月十五', '冬至'], ans: 0, explain: '原文: "在农历八月十五"' },
      { q: '中秋节起源于什么?', opts: ['赏月', '吃月饼', '古代帝王秋季祭月', '家人团圆'], ans: 2, explain: '原文: "起源于古代帝王秋季祭月的习俗"' },
      { q: '月饼最早是用来做什么的?', opts: ['送礼', '祭月供品', '日常食物', '商品'], ans: 1, explain: '原文: "月饼最早是祭月用的供品"' },
      { q: '中秋圆月象征什么?', opts: ['丰收', '健康', '家人团圆', '财富'], ans: 2, explain: '原文: "象征家人团圆"' }
    ]
  },
  {
    title: '保护环境', diff: 4,
    passage: '近年来, 全球气候变暖, 海平面上升, 极端天气频繁发生。这都和人类活动密切相关 — 工厂排放废气、汽车排放尾气、森林被砍伐、塑料垃圾污染海洋。新加坡是个小岛国, 海拔低, 受气候变化影响特别大。政府推行"绿色未来"计划, 鼓励市民少用一次性塑料、多乘公共交通、植树造林。每个人的小行动, 汇聚起来就是大改变。保护环境不是口号, 而是从今天开始的具体行动。',
    questions: [
      { q: '哪一项不是文章提到的环境问题原因?', opts: ['工厂排放废气', '汽车排放尾气', '动物大量繁殖', '塑料垃圾污染海洋'], ans: 2, explain: '文章列举的是工厂/汽车/砍伐/塑料, 没说"动物繁殖"' },
      { q: '新加坡为什么受气候变化影响大?', opts: ['人口多', '小岛国海拔低', '工业发达', '汽车多'], ans: 1, explain: '原文: "新加坡是个小岛国, 海拔低"' },
      { q: '"绿色未来"计划包括哪些建议? (找最完整的)', opts: ['少用塑料', '多乘公共交通', '植树造林', '以上都是'], ans: 3, explain: '原文列举 3 项: 少用塑料 + 公共交通 + 植树' },
      { q: '作者认为保护环境关键是?', opts: ['政府制定法律', '从今天开始具体行动', '提高科技', '减少人口'], ans: 1, explain: '原文最后: "从今天开始的具体行动"' }
    ]
  },
  {
    title: '李白与磨杵成针', diff: 4,
    passage: '相传唐朝大诗人李白小时候很贪玩, 不爱读书。一天他在路边看到一位老婆婆在磨一根铁杵, 便好奇地问: "老婆婆, 您在做什么?" 老婆婆说: "我要把这根铁杵磨成一根针。" 李白吃惊地说: "这怎么可能? 铁杵那么粗, 针那么细。" 老婆婆笑着说: "只要功夫深, 铁杵磨成针。" 李白听了深受感动, 从此发奋读书, 终成一代诗仙。',
    questions: [
      { q: '李白小时候有什么特点?', opts: ['爱读书', '很贪玩, 不爱读书', '聪明伶俐', '体弱多病'], ans: 1, explain: '原文开头: "李白小时候很贪玩, 不爱读书"' },
      { q: '老婆婆做什么让李白吃惊?', opts: ['织布', '磨铁杵成针', '挑水', '砍柴'], ans: 1, explain: '原文: "我要把这根铁杵磨成一根针"' },
      { q: '"只要功夫深, 铁杵磨成针" 这句话的意思是?', opts: ['磨铁杵很好玩', '只要肯坚持就能成功', '老婆婆很厉害', '铁杵很容易磨'], ans: 1, explain: '成语义: 坚持不懈就能完成困难的事' },
      { q: '李白后来怎样了?', opts: ['继续贪玩', '发奋读书成为诗仙', '帮老婆婆磨杵', '逃学'], ans: 1, explain: '原文最后: "从此发奋读书, 终成一代诗仙"' }
    ]
  },
  {
    title: '小蚂蚁的智慧', diff: 3,
    passage: '一只小蚂蚁看到一颗大谷粒, 想搬回家。它使尽全力推, 谷粒纹丝不动。它去叫来三只蚂蚁帮忙, 还是搬不动。最后它叫来全家二十几只蚂蚁, 大家齐心协力, 终于把谷粒搬回了家。蚂蚁妈妈说: "孩子, 一个人的力量是有限的, 团队合作才能完成大事。"',
    questions: [
      { q: '小蚂蚁一个人能搬动谷粒吗?', opts: ['能', '不能, 纹丝不动', '能但很慢', '能但要很久'], ans: 1, explain: '原文: "纹丝不动"' },
      { q: '小蚂蚁最后叫来了多少同伴?', opts: ['三只', '二十几只', '一百只', '全家所有'], ans: 1, explain: '原文: "全家二十几只蚂蚁"' },
      { q: '故事告诉我们什么道理?', opts: ['谷粒很重', '蚂蚁很厉害', '团队合作才能完成大事', '多吃饭长力气'], ans: 2, explain: '蚂蚁妈妈最后总结的话' },
      { q: '"齐心协力"的意思是?', opts: ['互相竞争', '团结一致, 共同努力', '各自做事', '动作一致'], ans: 1, explain: '成语: 一齐 + 协同 + 努力' }
    ]
  },
  {
    title: '科技双刃剑', diff: 5,
    passage: '智能手机改变了我们的生活方式。它让信息触手可及, 让人们随时随地交流。然而, 过度使用手机也带来诸多问题: 视力下降、颈椎酸痛、注意力分散、人与人的真实交流减少。研究显示, 青少年每天看屏幕超过 4 小时, 患近视的风险显著提高。新加坡政府建议小学生每天屏幕时间不超过 2 小时。科技是把双刃剑, 关键在于怎么用 — 善用之便利生活, 滥用之损害身心。',
    questions: [
      { q: '智能手机的好处不包括?', opts: ['信息触手可及', '随时交流', '提升视力', '了解世界'], ans: 2, explain: '原文反而说"视力下降", 不可能提升' },
      { q: '青少年每天看屏幕超过几小时近视风险显著提高?', opts: ['2 小时', '3 小时', '4 小时', '5 小时'], ans: 2, explain: '原文: "超过 4 小时"' },
      { q: '新加坡政府建议小学生每天屏幕时间不超过?', opts: ['1 小时', '2 小时', '3 小时', '4 小时'], ans: 1, explain: '原文: "每天屏幕时间不超过 2 小时"' },
      { q: '"科技是把双刃剑" 这个比喻说明?', opts: ['科技很危险', '科技既有利也有弊', '科技像剑一样锋利', '应避免使用科技'], ans: 1, explain: '双刃剑 = 两面性, 善用与滥用结果不同' }
    ]
  },
  {
    title: '陈嘉庚的故事', diff: 5,
    passage: '陈嘉庚是著名的爱国华侨, 出生在福建。年轻时他到新加坡谋生, 经过多年努力, 成为东南亚著名的企业家。但他没有把财富留给自己, 而是把大部分钱用来办教育, 在福建创办了厦门大学和集美学校。他常说: "国家兴亡, 匹夫有责。教育是百年大计。" 即使在事业受挫时, 他仍坚持资助教育。今天厦门大学已经是中国名校, 陈嘉庚的精神也激励着无数后人。',
    questions: [
      { q: '陈嘉庚出生在哪里?', opts: ['新加坡', '福建', '厦门', '马来西亚'], ans: 1, explain: '原文: "出生在福建"' },
      { q: '他在新加坡做什么成功的?', opts: ['做政府官员', '当老师', '成为东南亚著名企业家', '当医生'], ans: 2, explain: '原文: "成为东南亚著名的企业家"' },
      { q: '陈嘉庚把财富主要用来?', opts: ['享受生活', '办教育', '投资股市', '收藏古董'], ans: 1, explain: '原文: "把大部分钱用来办教育"' },
      { q: '"国家兴亡, 匹夫有责" 的意思是?', opts: ['国家有难, 普通人也有责任', '只有伟人才能救国', '国家事和个人无关', '战争只能靠军队'], ans: 0, explain: '匹夫=普通人, 这句强调每人都有责任' },
      { q: '陈嘉庚创办了哪些学校?', opts: ['厦门大学和清华大学', '厦门大学和集美学校', '北大和厦大', '清华和北大'], ans: 1, explain: '原文: "厦门大学和集美学校"' }
    ]
  }
];

function getChineseReadingByDiff(diff) {
  const arr = _sampleByDiff(CHINESE_READING, diff, 1);
  return arr[0] || CHINESE_READING[0];
}

// 4. Science 分类 (~10 题, 每题 5-8 项)
const SCIENCE_CLASSIFY = [
  { topic: '动物分类: 脊椎 vs 无脊椎', cats: ['脊椎动物','无脊椎动物'], diff: 1,
    items: [{n:'鱼',c:0},{n:'蝴蝶',c:1},{n:'青蛙',c:0},{n:'蜘蛛',c:1},{n:'鸟',c:0},{n:'蜗牛',c:1}] },
  { topic: '植物: 开花 vs 不开花', cats: ['开花植物','不开花植物'], diff: 1,
    items: [{n:'玫瑰',c:0},{n:'蕨类',c:1},{n:'向日葵',c:0},{n:'苔藓',c:1},{n:'樱花',c:0},{n:'地钱',c:1}] },
  { topic: '材料: 导体 vs 绝缘体', cats: ['导体','绝缘体'], diff: 2,
    items: [{n:'铜',c:0},{n:'塑料',c:1},{n:'铁',c:0},{n:'橡胶',c:1},{n:'银',c:0},{n:'木头',c:1},{n:'玻璃',c:1}] },
  { topic: '动物分类: 哺乳/鸟/鱼/爬行', cats: ['哺乳','鸟类','鱼类','爬行类'], diff: 3,
    items: [{n:'狗',c:0},{n:'鹰',c:1},{n:'鲨鱼',c:2},{n:'蛇',c:3},{n:'蝙蝠',c:0},{n:'企鹅',c:1},{n:'鳄鱼',c:3}] },
  { topic: '物质三态: 固/液/气', cats: ['固体','液体','气体'], diff: 2,
    items: [{n:'冰',c:0},{n:'水',c:1},{n:'水蒸气',c:2},{n:'石头',c:0},{n:'果汁',c:1},{n:'氧气',c:2}] },
  { topic: '能量形式', cats: ['热能','光能','电能','声能'], diff: 4,
    items: [{n:'阳光',c:1},{n:'火',c:0},{n:'电池',c:2},{n:'乐器',c:3},{n:'灯泡',c:1},{n:'微波炉',c:0},{n:'扬声器',c:3}] },
  { topic: '生命周期: 完全/不完全变态', cats: ['完全变态','不完全变态'], diff: 4,
    items: [{n:'蝴蝶',c:0},{n:'蝗虫',c:1},{n:'蚊子',c:0},{n:'蝉',c:1},{n:'蜜蜂',c:0},{n:'蟋蟀',c:1}] },
  { topic: '光的反射/折射/吸收', cats: ['反射','折射','吸收'], diff: 5,
    items: [{n:'镜子',c:0},{n:'水中筷子弯',c:1},{n:'黑布',c:2},{n:'放大镜',c:1},{n:'金属表面',c:0},{n:'深色衣服',c:2}] },
  { topic: '环境因素', cats: ['生物因素','非生物因素'], diff: 3,
    items: [{n:'植物',c:0},{n:'阳光',c:1},{n:'细菌',c:0},{n:'温度',c:1},{n:'动物',c:0},{n:'水',c:1},{n:'空气',c:1}] },
  { topic: '电路: 串联/并联', cats: ['串联','并联'], diff: 5,
    items: [{n:'圣诞灯一坏全灭',c:0},{n:'家用插座',c:1},{n:'手电筒电池',c:0},{n:'路灯一栋楼',c:1}] }
];

// helpers
function getUnitByDiff(diff, n) { return _sampleByDiff(UNIT_CONVERSIONS, diff, n || 10); }
function getGrammarByDiff(diff, n) { return _sampleByDiff(GRAMMAR_QUESTIONS, diff, n || 10); }
function getClozeByDiff(diff, n) { return _sampleByDiff(CLOZE_QUESTIONS, diff, n || 10); }
function getSciClassifyByDiff(diff) { const arr = _sampleByDiff(SCIENCE_CLASSIFY, diff, 1); return arr[0] || SCIENCE_CLASSIFY[0]; }

// ============= v18.36: 弱项分析 + 知识点映射 =============
const SUBJECT_OF_GAME = {
  math: '数学', unit: '数学',
  grammar: '英语', cloze: '英语', editing: '英语', vocab: '英语', listen: '英语',
  scilab: '科学'
};

function getSubjectAccuracy(state) {
  const stats = (state && state.gameStats) || {};
  const bySubject = {};
  Object.keys(SUBJECT_OF_GAME).forEach(gameKey => {
    const subj = SUBJECT_OF_GAME[gameKey];
    const recent = (stats[gameKey] && stats[gameKey].recent) || [];
    if (recent.length === 0) return;
    const tc = recent.reduce((s, r) => s + r.correct, 0);
    const ta = recent.reduce((s, r) => s + r.total, 0);
    if (ta === 0) return;
    if (!bySubject[subj]) bySubject[subj] = { correct: 0, total: 0, runs: 0 };
    bySubject[subj].correct += tc;
    bySubject[subj].total += ta;
    bySubject[subj].runs += recent.length;
  });
  Object.keys(bySubject).forEach(s => {
    bySubject[s].accuracy = bySubject[s].total > 0
      ? Math.round(bySubject[s].correct / bySubject[s].total * 100) : null;
  });
  return bySubject;
}

function findWeakSubjects(state) {
  const acc = getSubjectAccuracy(state);
  return Object.keys(acc)
    .filter(s => acc[s].accuracy !== null && acc[s].accuracy < 70)
    .sort((a, b) => acc[a].accuracy - acc[b].accuracy)
    .slice(0, 2);
}

const WEAK_KNOWLEDGE_MAP = {
  '数学': {
    color: '#E8B86E',
    topics: [
      { name: '百分比', why: 'X% of Y = X/100 × Y, 别忘 /100', drill: '玩 数学速算 + 单位换算' },
      { name: '比例', why: 'A:B = 2:3 时, A/(A+B) = 2/5, B/(A+B) = 3/5', drill: '数学速算选 ratio 题' },
      { name: '速度', why: '速度 = 距离 ÷ 时间; 单位匹配 (km/h vs m/s)', drill: '单位换算 + speed 题' }
    ]
  },
  '英语': {
    color: '#6FB8A0',
    topics: [
      { name: '介词搭配', why: 'good at / interested in / careful with — 多读多记', drill: 'Cloze MCQ 重点' },
      { name: '时态', why: 'yesterday→过去, tomorrow→将来, since→现在完成', drill: 'Grammar MCQ' },
      { name: 'phrasal verbs', why: 'come across / look after / put off — 整体记忆', drill: 'Cloze 高难度' }
    ]
  },
  '科学': {
    color: '#9B8FC9',
    topics: [
      { name: '分类', why: '按可见特征 (有无脊椎/导电与否)', drill: '科学快分类 game' },
      { name: '生命周期', why: '完全变态 4 段 (蝴蝶) vs 不完全变态 3 段 (蝗虫)', drill: '科学分类 + wow 复习' },
      { name: '能量转换', why: '热↔光↔电↔声 不消失只转化', drill: 'wow 揭晓 + 阅读' }
    ]
  },
  '华文': {
    color: '#E07B7B',
    topics: [
      { name: '词汇', why: '常考成语 + 造句搭配', drill: 'VB slot 复习' },
      { name: '阅读', why: '抓段落主旨, 不纠结生字', drill: '多读多看' }
    ]
  }
};

// ============= v18.27: 闹铃时间表 (周末优先, 工作日 placeholder) =============
const ALARM_SCHEDULE = {
  Sat: [
    { time: '09:00', type: 'start', icon: '📚', msg: '周六学习开始! 先做周四 1 对 1 作业 (1h)' },
    { time: '10:00', type: 'switch', icon: '✏️', msg: '换 — 美林作业 (1h)' },
    { time: '11:00', type: 'switch', icon: '🔬', msg: '换 — P5 科学练习册 (50min)' },
    { time: '11:50', type: 'switch', icon: '🎧', msg: '换 — 听力 15min (4 步精听法)' },
    { time: '12:00', type: 'rest', icon: '🍽️', msg: '吃饭休息! 2 小时, 离开桌子吃饭走动' },
    { time: '14:00', type: 'back', icon: '🔔', msg: '回来! 数学 P6 paper 2 (限时 50min)' },
    { time: '15:20', type: 'rest', icon: '☕', msg: '准备美林课! 上厕所 + 喝水' },
    { time: '19:30', type: 'rest', icon: '☕', msg: '美林课结束! 休息 20min, 吃点东西放松' },
    { time: '19:50', type: 'back', icon: '📝', msg: '回来! 美林课要点回顾 30min (趁记忆热)' },
    { time: '20:30', type: 'switch', icon: '🪞', msg: '本周复盘 + 跟父母聊聊本周收获' },
    { time: '21:30', type: 'sleep', icon: '😴', msg: '戴 OK 镜准备睡觉, 好好休息' }
  ],
  Sun: [
    { time: '08:00', type: 'start', icon: '🎓', msg: '周日学习开始! 恒瑞课 (2h20)' },
    { time: '10:20', type: 'rest', icon: '☕', msg: '恒瑞课结束! 真休息 15min, 离开桌子' },
    { time: '10:35', type: 'back', icon: '✏️', msg: '回来! 恒瑞作业 (趁记忆热, 巩固 ×2)' },
    { time: '11:30', type: 'switch', icon: '📖', msg: '换 — 阅读理解 + Cloze (30min)' },
    { time: '12:00', type: 'rest', icon: '🍽️', msg: '吃饭休息! 2 小时' },
    { time: '14:00', type: 'back', icon: '🎯', msg: '回来! 数学 PSLE paper 1 (限时 50min)' },
    { time: '15:00', type: 'switch', icon: '🔬', msg: '换 — 科学练习册 (50min)' },
    { time: '16:10', type: 'rest', icon: '🏊', msg: '游泳时间! 体力放松大脑' },
    { time: '17:30', type: 'rest', icon: '🍽️', msg: '吃饭休息 (40min)' },
    { time: '18:30', type: 'back', icon: '✏️', msg: '回来! 美玲周五作业 part 1 (1h)' },
    { time: '19:30', type: 'rest', icon: '☕', msg: '休息 15min, 跟父母聊几句' },
    { time: '19:45', type: 'back', icon: '📝', msg: '回来! 美玲作业 part 2 + cloze 收尾' },
    { time: '20:30', type: 'switch', icon: '🪞', msg: '下周计划 + 整理书包 + 写明日 1 个目标' },
    { time: '21:30', type: 'sleep', icon: '😴', msg: '戴 OK 镜睡觉, 周日辛苦了' }
  ],
  // 工作日 (简版, 仅关键时段)
  Mon: [
    { time: '16:30', type: 'start', icon: '📚', msg: '放学! 准备开始今日学习' },
    { time: '21:30', type: 'sleep', icon: '😴', msg: '戴 OK 镜睡觉时间' }
  ],
  Tue: [
    { time: '16:30', type: 'start', icon: '📚', msg: '放学! 准备开始今日学习' },
    { time: '21:30', type: 'sleep', icon: '😴', msg: '戴 OK 镜睡觉时间' }
  ],
  Wed: [
    { time: '16:30', type: 'start', icon: '📚', msg: '放学! 准备开始今日学习' },
    { time: '21:30', type: 'sleep', icon: '😴', msg: '戴 OK 镜睡觉时间' }
  ],
  Thu: [
    { time: '16:30', type: 'start', icon: '📚', msg: '放学! 准备开始今日学习' },
    { time: '21:30', type: 'sleep', icon: '😴', msg: '戴 OK 镜睡觉时间' }
  ],
  Fri: [
    { time: '16:30', type: 'start', icon: '📚', msg: '放学! 周五尽量完成本周作业, 别拖到周六' },
    { time: '21:30', type: 'sleep', icon: '😴', msg: '戴 OK 镜睡觉时间' }
  ]
};

// ============= v18.26+v18.41+v18.42: 知识树 (4 学科 × ~10 节点, 对标 PSLE AL 4-6) =============
// 内容标准: 不写"是什么", 写"PSLE 怎么考 + 易错陷阱 + 答题模板 + AL 4-6 必拿分技巧"
const KNOWLEDGE_TREE = {
  '🔬 科学': [
    { id: 'sci_diversity', name: 'Diversity 分类', weeks: [1, 2], icon: '🦋',
      desc: 'PSLE 高频考: 给图分类 + 解释判断依据. AL 4-6 必须用 specific feature 答, 不能笼统说 "因为它是哺乳"。',
      examples: ['鲸鱼陷阱: 看似鱼, 实哺乳 (胎生 + 哺乳 + 肺呼吸)', '蝙蝠陷阱: 看似鸟, 实哺乳 (体温恒定 + 体毛)', '答 OE 模板: "It is a XXX because it has YYY (1 specific feature)"'],
      pitfall: '只说"它是哺乳"不给分, 必给 1 个具体特征', game: 'scilab' },
    { id: 'sci_plant_lc', name: '植物生命周期', weeks: [3, 4], icon: '🌱',
      desc: 'PSLE 必考实验: 萌发 3 条件 (水/空气/温度) — 控制变量法. AL 4-6 关键: 写 fair test 必标 IV/DV/CV.',
      examples: ['Pollination 媒介: 风媒 (花瓣小, 花粉轻多) vs 虫媒 (花瓣大艳, 花蜜诱)', 'Dispersal 4 种: 风/水/动物/弹射 — 看种子结构判断', '萌发实验: IV=水/空气/温度其中 1 个, DV=是否萌发, CV=其他全控'],
      pitfall: 'Germination ≠ photosynthesis, 萌发不需要光 (用储存的食物)', game: 'scilab' },
    { id: 'sci_material', name: '材料性质', weeks: [5, 6], icon: '🧪',
      desc: 'PSLE 高频: 给场景选材料 + 解释为什么. AL 4-6 必给 2 个 properties + 关联 use.',
      examples: ['锅 handle = 塑料 (good insulator + 不烫手)', '电线芯 = 铜 (good conductor + flexible)', '答模板: "X is suitable because it is Y AND Z"'],
      pitfall: '只说"它是导体"不够, 必关联到具体用途 (so that...)', game: 'scilab' },
    { id: 'sci_forces', name: '力 Forces', weeks: [7, 9], icon: '⚙️',
      desc: 'P6 必考: 力的 4 种效果 (move/stop/speed up/slow down/change direction/change shape). AL 4-6 关键: 多力并存时用箭头标方向 + 大小.',
      examples: ['Friction 利弊: 鞋底防滑 (好) vs 机器磨损 (坏 → 加润滑油)', 'Gravity vs Mass: 重 = mass × g, 月球上 mass 同, weight 1/6', '题: 球减速 → 摩擦力方向与运动相反'],
      pitfall: 'Mass (kg) 和 Weight (N) 别混, PSLE 只考 mass 不考重力数字', game: 'scilab' },
    { id: 'sci_light_heat', name: '光与热', weeks: [10, 12], icon: '💡',
      desc: 'PSLE 必考实验: 影子大小变化 (光源距离 vs 物体距离). 热传 3 方式 + 颜色吸热实验.',
      examples: ['影子: 光源近, 影子大; 物体近屏幕, 影子小', '深色 vs 浅色吸热: 深色快, 浅色反射 (PSLE 真题常考夏天衣服)', '太阳能板黑色 = 吸热; 北极服白色 = 反射保暖矛盾? (反: 是为了防雪盲, 内层黑色保温)'],
      pitfall: '光直线传播, 不能"绕过"物体 → 影子永远在背光面', game: 'scilab' },
    { id: 'sci_cells', name: '细胞 Cells', weeks: [13, 15], icon: '🔬',
      desc: 'PSLE 必识 6 个 organelles. AL 4-6 必会画图 + 标 function.',
      examples: ['植物特有: 细胞壁 (支撑) + 叶绿体 (光合) + 大液泡 (储水)', '动物特有: 中心体 (分裂)', '细胞膜 vs 细胞壁: 膜动植都有 (选择性通过, "看门人"); 壁只植物有 (刚性支撑, 让分子可通过但靠膜筛选)'],
      pitfall: '叶绿体 ≠ 叶绿素, 前者是 organelle, 后者是 pigment 分子', game: 'vocab' },
    { id: 'sci_water', name: '水循环', weeks: [16, 18], icon: '💧',
      desc: 'PSLE 必考: 给图标 4 步 + 解释能量来源 + 连接到环境 (干旱/洪水).',
      examples: ['Evaporation = 液→气 (温度高加快)', 'Condensation = 气→液 (温度低 → 镜面起雾)', 'Precipitation 含 rain/snow/hail/sleet (PSLE 不限于 rain)'],
      pitfall: 'Boiling 是 evaporation 的特殊情况 (达到 100°C), 都是液→气', game: 'vocab' },
    { id: 'sci_reproduction', name: '生殖', weeks: [19, 21], icon: '🌿',
      desc: 'PSLE 必考完全 vs 不完全变态 + 花的 4 部分 + 受精过程.',
      examples: ['完全变态 4 段: 卵→幼虫→蛹→成虫 (蝶/蛙/蜜蜂)', '不完全 3 段: 卵→若虫→成虫 (蝗/蟋蟀/蜻蜓 — 若虫像小成虫)', '花: stamen (♂ anther + filament) + pistil (♀ stigma + style + ovary)'],
      pitfall: 'Pollination ≠ Fertilization. Pollination = 花粉到 stigma, Fertilization = sperm 到 egg', game: 'scilab' },
    { id: 'sci_energy', name: '能量 Energy', weeks: [22, 26], icon: '⚡',
      desc: 'PSLE 高频: 画 energy flow chart + Energy conservation (不消失只转化). AL 4-6 必标每个箭头的能量类型.',
      examples: ['手电筒: 电能 → 光能 + 热能 (热是 waste)', '光合作用: 光能 → 化学能 (储在葡萄糖)', '食物链: 太阳→植物→草食→肉食 (10% 传递, 顶端 energy 最少)'],
      pitfall: '能量守恒 (总量不变) 但 "可用能" 递减 — 常以热能形式散失到环境, 不可逆。PSLE 答 "energy is converted, not destroyed"', game: 'scilab' },
    { id: 'sci_adaptations', name: 'P6 适应', weeks: [27, 42], icon: '🦎',
      desc: 'PSLE Paper 2 长题: 给环境推适应特征. AL 4-6 必分 structural / behavioral 两类.',
      examples: ['沙漠: 仙人掌刺 (减蒸发) + 深根 (找水) + 厚皮 (储水) — 3 个不同 features', 'Camel 驼峰储脂肪 (不是水 — PSLE 高频陷阱)', '北极熊: 白毛 (camouflage) + 厚脂肪 (insulation) + 大脚掌 (分散重量) — structural'],
      pitfall: '驼峰是脂肪, 不是水! (代谢脂肪产生水)', game: 'vocab' },
    { id: 'sci_revision', name: 'PSLE 复习', weeks: [43, 65], icon: '📚',
      desc: 'PSLE Paper 2 OE 题答题模板: 4 要素必齐 (Identify + Explain + Evidence + Conclude). 缺 1 项扣 1 分.',
      examples: ['模板: "I observe that X. This is because Y (concept). The evidence is Z (data). Therefore P."', 'Graph 题: 必标 axis + units + 比较 high/low + 给原因', '5 大主题串记: Cycles + Diversity + Systems + Energy + Interactions'],
      pitfall: 'OE 题"Yes/No"开头不给分, 必先 explain 再 conclude', game: 'scilab' },
    { id: 'sci_psle', name: 'PSLE 笔试', weeks: [66, 73], icon: '🎯', milestone: 'W73',
      desc: 'PSLE 科学 2 张卷 75 min: Booklet A 28 题 MCQ + B 12-13 题 OE. AL 4-6 时间分配: A 30min / B 40min + 5min 检查.',
      examples: ['Booklet A 简单题不超 1 min (跳过太久浪费)', 'Booklet B 长题先看分值 (4 分题写 4 个点)', 'OE 答题用 bullet point 清晰, 不要写大段散文'],
      pitfall: '前 28 道 MCQ 别花太久, B 卷 OE 才是拉分关键', game: 'scilab' }
  ],
  '📖 英语': [
    { id: 'eng_basics', name: '基础 Grammar', weeks: [1, 4], icon: '✏️',
      desc: 'PSLE Grammar Cloze 12 题 + Editing 12 个空 (8 wrong + 4 unchanged). AL 4-6 必识陷阱: each/every/news 当单数 + 短语动词必背.',
      examples: ['Each of the boys HAS (not have) a book — each + 单数', 'The news IS shocking (news 是不可数单数)', 'Neither John NOR Mary likes durian (nor 不是 or)', '"He dare not speak" 中 dare 当 modal 不加 s'],
      pitfall: 'PSLE 高频陷阱: each/every/either/neither + 单数动词, 别被复数主语误导',
      game: 'grammar' },
    { id: 'eng_comp', name: 'Comprehension P5', weeks: [5, 10], icon: '📖',
      desc: 'PSLE Comp 占 20+ 分. AL 4-6 关键: 一字一分 (3 分题答 3 个点) + 用原文关键词 + 推断题必引证据.',
      examples: ['答案模板 (3 分): "First, ... Second, ... Third, ..."', '"The author suggests" → 找隐含含义, 不写原文表面', '词义题: 看上下文 (substitute test) — 把选项代入看通顺'],
      pitfall: 'OE 题 3 分 = 3 个独立 point, 不能换说法重复',
      game: 'editing' },
    { id: 'eng_cloze', name: 'Grammar/Vocab Cloze', weeks: [11, 14], icon: '🧩',
      desc: 'PSLE Grammar Cloze (15 空) + Vocab Cloze (15 空). AL 4-6 难点: phrasal verbs + collocations + 不易察觉的连接词.',
      examples: ['"He came ___ his old diary" → across (偶遇, 不是 to)', '"In SPITE of the rain, ..." (= despite, 不是 spite)', 'Collocation: "make a decision" / "do homework" / "take a break" — 死记不能创造'],
      pitfall: 'Cloze 高频 traps: phrasal verb 字面 vs 真意 (look up=查/look out=小心)',
      game: 'cloze' },
    { id: 'eng_editing', name: 'Editing 改错', weeks: [15, 18], icon: '🔍',
      desc: 'PSLE Editing 12 空: 8 错 + 4 不变. AL 4-6 必关: 不能漏改 + 不能错改 unchanged + 改正必准确.',
      examples: ['Subject-verb: "He don\'t like" → "doesn\'t"', 'Tense: "Yesterday I am hungry" → was', 'Article: "I had a apple" → an', '陷阱: 4 个 unchanged 千万别瞎改, 改了也扣分'],
      pitfall: '识别 unchanged 比改错更重要 — 改错的 unchanged 双扣分',
      game: 'editing' },
    { id: 'eng_writing', name: '作文 Composition', weeks: [19, 26], icon: '✒️',
      desc: 'PSLE Composition Paper 1 = 40 分. AL 4-6 公式: 开头 3 句定调 (sensory + dialogue + action) + 至少 5 个高级词 + 1 个 idiom + 引人深思结尾.',
      examples: ['开头模板: "The shrill bell pierced the silent classroom" (听觉 + 形容词)', '高级词: crestfallen / jubilant / dawned upon me / etched in memory', '结尾 reflection: "From that day on, I learnt that..."'],
      pitfall: '跑题 0 分 — 至少 1 段必须有 theme keyword',
      game: 'vocab' },
    { id: 'eng_listening', name: '听力 Listening', weeks: [27, 42], icon: '🎧', milestone: 'W42',
      desc: 'PSLE Listening 20 题 = 14 分. AL 4-6 重点: 转折词后必抓答案 + 数字陷阱 (重音差) + 推断题需 2 句话综合.',
      examples: ['答案在 "but/however/although" 后 (90% 真题)', 'fifteen [fɪfˈtiːn] vs fifty [ˈfɪfti] — 重音第 1 还是第 2 音节', '日期: "the third of April" = 4/3, 不是 3/4'],
      pitfall: '听力陷阱: 第一次说的常被否定改成第二次说的, 听完整段再选',
      game: 'listen' },
    { id: 'eng_oral', name: '口试 Oral', weeks: [43, 65], icon: '🗣️', milestone: 'W68',
      desc: 'PSLE Oral 30 分 = 朗读 (10) + 看图说话 (10) + 对话 (10). AL 4-6 关键: 流畅 > 完美 + 内容深度.',
      examples: ['朗读: 标点停顿 + 重音 + 语调', '看图说话: 不只描述 — 加 personal opinion + 假设', '对话: 用 connectors (first, moreover, however, in conclusion)'],
      pitfall: '卡顿 1 次 -1 分, 错词 -0.5. 宁用简单流畅, 别用复杂卡 5 秒',
      game: 'vocab' },
    { id: 'eng_psle', name: 'PSLE 笔试', weeks: [66, 73], icon: '🎯', milestone: 'W73',
      desc: 'PSLE 英语 4 张卷 = 200 分. AL 4-6 = 75-89%. 时间分配: P1 (作文 1h10min: Sit Writing+Cont Writing) / P2 (1h50min Grammar+Cloze+Editing+Comp) / P3 (听力 35 min) / P4 (Oral). Editing 在 Paper 2, 不在 P1.',
      examples: ['Paper 2 时间: 35 min synthesis + 35 min comp + 35 min cloze/editing', '作文 = 25-30 min 写 + 5 min 检查', '检查必看: 时态 + 主谓 + 拼写 + 标点'],
      pitfall: 'Paper 2 SST (Synthesis & Transformation) 是杀手, 一字一分必练',
      game: 'editing' }
  ],
  '➗ 数学': [
    { id: 'math_algebra', name: '代数方程', weeks: [1, 4], icon: '🔣',
      desc: 'PSLE Paper 2 核心: 设未知数 x, 列方程解题. 2 个未知数 → 2 个方程联立 (代入/消元). 必写 "Let x = ..." 才拿 method marks.',
      examples: ['设 x 只鸡 (2 腿), (8-x) 只牛 (4 腿): 2x + 4(8-x) = 26, 32-2x=26, x=3', '代入法: A+B=24, A=3B → 3B+B=24, B=6, A=18', 'PSLE 步骤: ①Let x=... ②列方程 ③解方程 ④答 (缺步扣分)'],
      pitfall: '只写答案最多 1 分; 方程中括号展开必仔细: 4(8-x) = 32-4x 不是 32-x', game: 'math' },
    { id: 'math_fraction_adv', name: '分数余数陷阱', weeks: [5, 8], icon: '🍕',
      desc: 'PSLE 必考: fraction of remainder 多步链. "剩余的 1/3" ≠ 原数的 1/3 — 必画 bar model 标清基准.',
      examples: ['"花 1/3, 再花剩余的 1/2, 最后剩 $60": 设总=$x; 余=2x/3; 再花=x/3; 剩=x/3=$60; x=$180', '验证: 180×1/3=60余120; 120×1/2=60余60 ✓', '3步链: 先花1/4 → 余3/4; "余下的1/3" = 3/4×1/3 = 1/4原数 (不是1/3!)'],
      pitfall: '"of remainder" 以剩下为基准, 不是原数 — 直接算原数的 1/3 是高频大错', game: 'math' },
    { id: 'math_vol_3d', name: '体积与容积', weeks: [9, 10], icon: '📦',
      desc: 'PSLE 必考: 复合立体体积 + 单位换算. 圆柱必用 π=22/7 (不是3.14). 1L=1000cm³.',
      examples: ['水缸 40×25×30 cm: V=30000cm³=30L (1L=1000cm³)', '圆柱 r=7cm, h=10cm: V=22/7×49×10=1540cm³', '复合立体: 拆分各形状 → 分别算 → 相加/相减'],
      pitfall: 'PSLE 规定 π=22/7; 升与 cm³ 换算: 1L=1000cm³, 1mL=1cm³', game: 'unit' },
    { id: 'math_percent', name: '百分比', weeks: [11, 13], icon: '%',
      desc: 'PSLE 高频: 多步百分比 + GST + 反向找原值. AL 4-6 必明: 增加 20% 后再减 20% ≠ 还原.',
      examples: ['8 折后 $640 → 原价 $640 ÷ 0.8 = $800 (反向)', 'GST 9% 含税: 含税 ÷ 1.09 = 不含税', '$100 增 20% = $120, 再减 20% = $96 (不是 $100!)'],
      pitfall: '"20% more than X" = 1.2X (不是 X+20)', game: 'unit' },
    { id: 'math_ratio', name: '比例', weeks: [14, 16], icon: '⚖️',
      desc: 'PSLE 高频: 两/三量比例 + before/after 变化 (only A change, B 不变, ratio 变).',
      examples: ['A:B=2:3, A 给 B 4 个, ratio 变 1:5, 求原数 (设单位 + 列方程)', '链接比: A:B=2:3, B:C=4:5 → A:C=8:15 (B 通分到 12)', 'Bar model: 2 段 vs 3 段, 1 段 = 总÷5'],
      pitfall: '题目说 "ratio remains the same" 其实暗示 A 和 B 同比例变化', game: 'math' },
    { id: 'math_speed', name: '速度', weeks: [17, 19], icon: '🏃',
      desc: 'PSLE 必考: 单位换算 (km/h ↔ m/s) + 相遇/追及. AL 4-6 用三角图记公式.',
      examples: ['追及题: 速度差 × 时间 = 距离差', '相遇题: 速度和 × 时间 = 总距离', 'km/h ÷ 3.6 = m/s (60 km/h = 16.67 m/s)'],
      pitfall: '题目时间单位混杂 (1h 30min) 必先统一为 1.5h 或 90 min', game: 'unit' },
    { id: 'math_geometry', name: '几何', weeks: [20, 23], icon: '📐',
      desc: 'PSLE 必考: 复合图形 (拼/挖) + 角度推理 (内角和/平行线). AL 4-6 标辅助线.',
      examples: ['平行线截角: 同位角相等, 内错角相等, 同旁内角和=180°', '复合图形面积: 拆/挖法 + 标尺寸', '三角形内角和 180°, 四边形 360°, n 边形 (n-2)×180°'],
      pitfall: 'PSLE 圆周率用 22/7 (不是 3.14), 算除法保留分数算更准', game: 'unit' },
    { id: 'math_word_problems', name: '应用题', weeks: [24, 42], icon: '📝',
      desc: 'PSLE Paper 2 高分关键: 5 大解题法 (模型/假设/替换/倒推/单位).',
      examples: ['假设法: 鸡兔同笼 (假设全是鸡, 算多余腿)', '替换法: A 替换为 2B 再算', '倒推法: 从最终结果倒推每步'],
      pitfall: '4-5 分题必给 method (写 working), 只写答案最多 1 分', game: 'math' },
    { id: 'math_psle_paper1', name: 'P5 paper 1+2', weeks: [27, 52], icon: '🎯',
      desc: 'PSLE Paper 1 = 50min 30 题 MCQ+短答; Paper 2 = 100min 17 大题. AL 4-6 时间分配关键.',
      examples: ['Paper 1: 平均 1.6 min/题, 不会跳', 'Paper 2: 前 13 道严格 5 min/题, 最后 4 道难题留 30 min', '先做易题 (前面分值少但稳得分), 难题留最后'],
      pitfall: 'Paper 2 长题展示 working 才有 method marks', game: 'math' },
    { id: 'math_psle', name: 'PSLE 笔试', weeks: [66, 73], icon: '🏆', milestone: 'W73',
      desc: 'PSLE 数学 2 张卷 = 100 分. AL 4-6 = 75-89%. 检查 5min 抓回 3-5 分.',
      examples: ['漏单位 -1: $50 写 50 错', '答完必倒读题 + 检查单位 + 检查范围合理', '估算: 答案 = $1234.56 但题问只有几百块, 一定算错'],
      pitfall: 'Paper 2 一道大题 4-5 分, 答错连扣全题', game: 'math' }
  ],
  '🇨🇳 华文': [
    { id: 'ch_idiom_adv', name: '成语辨析+病句', weeks: [1, 6], icon: '🈵',
      desc: 'PSLE 高华 Paper 2 两大丢分项: ①成语误用 (望文生义/感情色彩/单复数) ②病句辨析 (成分缺失/搭配不当/语义重复/逻辑矛盾). AL1 必全覆盖.',
      examples: ['望文生义: "差强人意"≠不满意 (实=勉强可以); "七月流火"≠炎热 (实=天凉)', '感情色彩: "处心积虑"=贬 (阴谋); "殚精竭虑"=褒 (尽心尽力). 不可互换!', '病句: "他的成绩和体育都很好" (搭配不当) → "他成绩优异, 体育出色"'],
      pitfall: '成语选填: 先确认褒/贬/中性 → 再排除望文生义; 病句先找"是否能搭配"',
      game: 'vocab' },
    { id: 'ch_reading', name: '阅读理解', weeks: [7, 14], icon: '📖',
      desc: 'PSLE 高华阅读 = 长篇 300+ 字 + 古文/古诗 + 隐含含义题. AL 4-6 必练: 找中心句 + 推作者意图.',
      examples: ['"作者借此表达什么" = 推中心思想, 不是表面意思', '"这句话在文中的作用" → 结构上 (承上启下) + 内容上 (突出主题)', '古诗题: 找意象 (月亮=思乡, 柳=离别)'],
      pitfall: 'OE 题答"作者意图"不能照抄原文, 必用自己话总结升华',
      game: 'vocab' },
    { id: 'ch_composition', name: '作文', weeks: [15, 26], icon: '✒️',
      desc: 'PSLE 高华作文 40 分. AL 4-6 公式: 议论文 (论点+论据+论证) 或 叙事 (开端-发展-高潮-结局) + 引古用典 +1 个比喻.',
      examples: ['议论模板: 起承转合 — 引出论点 → 分论点 1 + 例 → 分论点 2 + 例 → 升华', '高级词: 浮现/迸发/不胫而走/络绎不绝/锲而不舍/历历在目', '引古: "正如孔子所言..." / "古人云..."'],
      pitfall: '作文跑题 0 分; 全文必有 1 句呼应题目, 结尾点题',
      game: 'vocab' },
    { id: 'ch_oral', name: '口试', weeks: [27, 65], icon: '🗣️',
      desc: 'PSLE 高华口试 30 分 = 朗读 (10) + 看图说话 (10) + 对话 (10). AL 4-6 关键: 流畅 + 内容深度 + 引用.',
      examples: ['朗读: 字正腔圆 + 标点停顿', '看图说话: 描述 → 推断原因 → 联系生活', '对话: "首先...其次...最后..." / "在我看来..." / "正如...所说"'],
      pitfall: '高华口试要展示思考深度, 不只是描述图片',
      game: 'vocab' },
    { id: 'ch_psle', name: 'PSLE 高华', weeks: [66, 73], icon: '🎯', milestone: 'W73',
      desc: 'PSLE 高华 = Paper 1 (作文 1.5h) + Paper 2 (1h45 阅读+成语+造句+病句). AL 4-6 = 通过高华 + 高分.',
      examples: ['Paper 1: 50 min 写完 + 检查 10 min', 'Paper 2 时间: 阅读 50 min / 成语+病句 30 min / 造句 25 min', '高华证书 = bonus 申报中学 (HCL = +2 加分点)'],
      pitfall: '高华 fail 影响中学分配; 别为冲 AL 1 牺牲华文基础',
      game: 'vocab' }
  ]
};

// v18.45: 知识树独立练习题库 (按 node id, 每节点 3 题, PSLE AL 4-6 风格)
// q = 题干; opts = 4 选项; ans = 正确 idx; explain = 解析
const KNOWLEDGE_PRACTICE = {
  // === 🔬 科学 ===
  sci_diversity: [
    { q: '鲸鱼和鱼最大的区别是什么? (PSLE 真考)', opts: ['鲸鱼有鳃', '鲸鱼用肺呼吸 + 胎生', '鲸鱼是冷血动物', '鲸鱼有鱼鳞'], ans: 1, explain: '鲸鱼=哺乳类: 用肺呼吸 + 胎生 + 哺乳 + 体温恒定. 看似鱼实非鱼' },
    { q: '蝙蝠属于哪一类动物?', opts: ['鸟类', '昆虫', '哺乳动物', '爬行动物'], ans: 2, explain: '蝙蝠 = 哺乳: 体毛 + 胎生 + 哺乳, 能飞但不是鸟' },
    { q: '"它是 XXX, 因为它有 YYY" — 这个答题模板适用于:', opts: ['MCQ 题', 'Open-ended 分类题', 'Calculation 题', '填空题'], ans: 1, explain: 'PSLE Open-ended 分类题必给 specific feature 才得分' }
  ],
  sci_plant_lc: [
    { q: '种子萌发不需要哪个条件?', opts: ['水', '空气', '光', '适宜温度'], ans: 2, explain: '萌发用的是种子内储存的食物, 不需要光. 光合作用是萌发后才需要' },
    { q: '风媒花的特征是?', opts: ['花瓣大艳', '花香浓郁', '花粉轻量多', '有花蜜'], ans: 2, explain: '风媒花靠风传粉 → 需大量轻花粉飘散; 虫媒花反之要吸引昆虫' },
    { q: '设计萌发实验, IV (independent variable) 是?', opts: ['种子大小', '水的量', '萌发率', '温度计'], ans: 1, explain: 'IV = 主动改变的变量 (水量); DV = 测量结果 (萌发率)' }
  ],
  sci_material: [
    { q: '锅柄用塑料因为?', opts: ['塑料便宜', '塑料是热的不良导体', '塑料漂亮', '塑料轻'], ans: 1, explain: 'PSLE OE 答题: 必给 property + use, "塑料是不良导体, 所以不烫手"' },
    { q: '电线芯用铜不用铁的原因?', opts: ['铜便宜', '铜更亮', '铜导电性好且不易锈', '铁不导电'], ans: 2, explain: '铁也导电但易生锈断路; 铜导电好 + 抗锈 + 延展性好' },
    { q: '透明材料适合做?', opts: ['锅', '窗户', '电线', '保温杯'], ans: 1, explain: '透明 = 透光; 窗户需要透光让光线进入' }
  ],
  sci_forces: [
    { q: '骑车后突然停止, 人前倾因为?', opts: ['重力', '惯性', '风力', '摩擦'], ans: 1, explain: '惯性 = 物体维持原运动状态; 车停了人因惯性继续前移' },
    { q: 'mass 和 weight 的区别?', opts: ['完全一样', 'mass 单位 N, weight kg', 'mass 不变, weight 因重力改变', 'mass 是 force'], ans: 2, explain: 'Mass(kg) 物质多少, 不变; Weight(N) = mass × g, 月球上变小' },
    { q: '增大摩擦力的方法?', opts: ['抹油', '加压力', '减少接触面', '让表面更光滑'], ans: 1, explain: '增大摩擦: 加压力 / 增大接触面 / 表面更粗糙. 抹油是减小' }
  ],
  sci_light_heat: [
    { q: '光源越靠近物体, 影子怎样?', opts: ['变小', '变大', '不变', '消失'], ans: 1, explain: '光源近 → 光线发散角大 → 影子大 (PSLE 真题高频)' },
    { q: '夏天穿什么颜色衣服更凉爽?', opts: ['黑色', '白色', '红色', '深蓝'], ans: 1, explain: '浅色反射阳光 → 吸热少; 深色吸热多 → 更热' },
    { q: '热从一个物体到另一个: 高 → 低. 这个过程叫?', opts: ['热反射', '热平衡', '热传递', '热消失'], ans: 2, explain: '热传递 (conduction/convection/radiation), 高温 → 低温, 直到平衡' }
  ],
  sci_cells: [
    { q: '哪个 organelle 只在植物细胞有?', opts: ['细胞膜', '细胞核', '叶绿体', '线粒体'], ans: 2, explain: '叶绿体 (光合作用) 只在植物; 动物细胞没有' },
    { q: '细胞壁的功能?', opts: ['控制进出', '储存能量', '提供支撑结构', '光合作用'], ans: 2, explain: '细胞壁 = 植物特有, 提供刚性支撑 (动物靠骨骼)' },
    { q: '细胞膜 vs 细胞壁的区别?', opts: ['完全一样', '膜动植都有, 壁只植物', '膜只动物, 壁只植物', '膜不允许物质通过'], ans: 1, explain: '膜 = 动植物都有 + 选择性通过 (看门人); 壁 = 只植物 + 提供刚性支撑 (分子可通过)' }
  ],
  sci_water: [
    { q: '水蒸气在冷玻璃上变水滴, 这个过程叫?', opts: ['蒸发', '凝结', '降水', '径流'], ans: 1, explain: 'Condensation 凝结: 气 → 液, 温度降低发生' },
    { q: '水循环的能量来源是?', opts: ['月亮', '风', '太阳', '地热'], ans: 2, explain: '太阳 = 蒸发动力源; 整个水循环由太阳能驱动' },
    { q: 'Boiling 和 evaporation 的区别?', opts: ['完全不同的过程', 'Boiling 在 100°C 发生, evaporation 任何温度', 'Boiling 只在液体里, evaporation 只在气体', 'Evaporation 需要太阳, boiling 不需要'], ans: 1, explain: '都是液→气, boiling 是 evaporation 的特殊情况 (达 100°C 沸点)' }
  ],
  sci_reproduction: [
    { q: '蝴蝶的生命周期有几个阶段?', opts: ['3 个 (卵-若虫-成虫)', '4 个 (卵-幼虫-蛹-成虫)', '2 个 (卵-成虫)', '5 个'], ans: 1, explain: '蝴蝶 = 完全变态 4 段, 蝗虫蜻蜓是不完全变态 3 段 (无蛹期)' },
    { q: '花的雄性部分叫?', opts: ['Pistil', 'Stamen', 'Ovary', 'Stigma'], ans: 1, explain: 'Stamen = anther + filament, 雄性; Pistil 含 stigma+style+ovary, 雌性' },
    { q: 'Pollination 和 Fertilization 的区别?', opts: ['完全相同', 'Pollination=花粉到 stigma; Fertilization=精到卵', 'Pollination 在动物; Fertilization 在植物', '都是受精过程'], ans: 1, explain: '先 pollination (传粉) → 后 fertilization (受精)' }
  ],
  sci_energy: [
    { q: '手电筒涉及的能量转换?', opts: ['光 → 电', '电 → 光 + 热', '热 → 电', '声 → 光'], ans: 1, explain: '电池 (化学) → 电 → 灯泡 → 光 + 热 (热是 waste)' },
    { q: '光合作用的能量转换?', opts: ['化学 → 光', '光 → 化学 (储在葡萄糖)', '光 → 热', '电 → 光'], ans: 1, explain: '光合 = 光能 → 化学能, 储存在葡萄糖中供植物用' },
    { q: '能量"用完"的真正含义?', opts: ['消失了', '转化为不可用形式 (常是热)', '变成 mass', '储存到电池里'], ans: 1, explain: '能量守恒 — 不消失, 只是转化为不可用形式 (散失为热)' }
  ],
  sci_adaptations: [
    { q: '骆驼的驼峰储存什么?', opts: ['水', '脂肪', '空气', '盐分'], ans: 1, explain: 'PSLE 高频陷阱: 驼峰 = 脂肪 (代谢脂肪 → 产生水), 不是水' },
    { q: '北极熊白色毛的两个功能?', opts: ['保暖 + 反射光', '保护色 + 保暖 (空气隔层)', '吸热 + 美观', '防水 + 反射'], ans: 1, explain: 'White camouflage + 中空毛保暖 (空气是好的 insulator)' },
    { q: '仙人掌的刺最主要功能?', opts: ['防止被吃', '减少水蒸发', '吸收阳光', '吸引昆虫'], ans: 1, explain: '刺 = 退化的叶, 减少表面积 → 减少水蒸发 (沙漠适应)' }
  ],
  sci_revision: [
    { q: 'PSLE OE 题答题 4 要素是?', opts: ['Identify-Explain-Evidence-Conclude', 'Question-Answer-Reason-Sum', 'Yes-Why-Example-No', 'Read-Think-Write-Check'], ans: 0, explain: '4 要素: I (识别现象) + E (解释概念) + E (举证据) + C (下结论)' },
    { q: '画图题必标的 2 个要素?', opts: ['颜色 + 名字', 'Axis + units', '日期 + 作者', '方向 + 大小'], ans: 1, explain: 'PSLE 画图: 必标 X/Y axis 名称 + units, 漏 1 项扣 1 分' },
    { q: '科学的 5 大主题是?', opts: ['Math-Sci-Eng-Hist-Geo', 'Cycles-Diversity-Systems-Energy-Interactions', 'Plant-Animal-Material-Force-Light', 'Water-Air-Land-Sun-Moon'], ans: 1, explain: 'PSLE Science 5 themes: 5 大块全要复习, 每块至少 5 道真题' }
  ],
  sci_psle: [
    { q: 'PSLE 科学考多长时间? 几道题?', opts: ['1h, 50 题', '1h15min, 40 题', '1h45min, 60 题', '2h, 30 题'], ans: 1, explain: 'PSLE Science: Booklet A (28 MCQ) + B (12-13 OE), 总 1h15min' },
    { q: 'AL 4-6 时间分配 Booklet A:B 的建议?', opts: ['一半一半', 'A 30 min / B 40 min + 5 min 检查', 'A 40 min / B 30 min', 'A 50 min / B 20 min'], ans: 1, explain: 'B 卷 OE 是拉分关键, 要留时间; A 卷别花太久' },
    { q: 'OE 题以"Yes/No"开头?', opts: ['可以, 直接给结论', '不可以, 必先 explain 再 conclude', '看题型', '只有 12 题可以'], ans: 1, explain: 'PSLE 评分: 直接 Yes/No 不给分, 必须先 explain (concept + evidence) 再 conclude' }
  ],

  // === ➗ 数学 ===
  math_algebra: [
    { q: '解方程: 4x + 3 = 19', opts: ['x = 4', 'x = 3', 'x = 5', 'x = 22'], ans: 0, explain: '4x = 19-3 = 16, x = 4. PSLE 必写三步: Let x=... 列方程 解方程' },
    { q: 'A + B = 24, A = 3B, 求 B?', opts: ['8', '6', '18', '3'], ans: 1, explain: '代入: 3B+B=24, 4B=24, B=6; A=18. 联立方程标准解法' },
    { q: '为什么代数题必须写 "Let x = ..."?', opts: ['老师习惯', '有 working 才能拿 method marks', '无区别', '只是建议'], ans: 1, explain: 'PSLE 5分题: 答错但 working 对可拿 2-3 分; 只写答案最多 1 分' }
  ],
  math_fraction_adv: [
    { q: '小明有 $120, 花 1/3 后再花剩下的 1/4, 剩多少?', opts: ['$60', '$70', '$30', '$80'], ans: 0, explain: '余 $120×2/3=$80; 再花 $80×1/4=$20; 剩 $80-$20=$60' },
    { q: '"花剩余的 1/3" vs "花总数的 1/3", 区别?', opts: ['一样', '剩余的 1/3 更小', '没有规律', '看题目决定'], ans: 1, explain: '已花1/4后剩3/4; 剩余的1/3=3/4×1/3=1/4原数 ≠ 原数的1/3. 必画 bar model!' },
    { q: 'fraction of remainder 题最安全的解法?', opts: ['心算', '直接乘分数', '画 bar model 标清剩余', '估算'], ans: 2, explain: '必画 bar: 标出"已花"和"剩余"两部分, 以"剩余"为100%再算下一步' }
  ],
  math_vol_3d: [
    { q: '水缸 40cm×25cm×30cm, 注满水是几升?', opts: ['3 L', '30 L', '300 L', '3000 L'], ans: 1, explain: '40×25×30=30000cm³; 1L=1000cm³; 30000÷1000=30L' },
    { q: '圆柱底面半径 7cm, 高 10cm, 体积? (π=22/7)', opts: ['440 cm³', '1540 cm³', '220 cm³', '770 cm³'], ans: 1, explain: '22/7 × 7² × 10 = 22/7 × 49 × 10 = 22×7×10 = 1540cm³' },
    { q: '1 mL = ? cm³', opts: ['10', '100', '1', '0.1'], ans: 2, explain: '1mL=1cm³; 1L=1000mL=1000cm³. PSLE 体积题必知换算' }
  ],
  math_percent: [
    { q: '8 折后 $640, 原价多少?', opts: ['$512', '$700', '$800', '$640'], ans: 2, explain: '8 折 = 0.8; 原价 = $640 ÷ 0.8 = $800' },
    { q: 'GST 9% 含税价 $327, 不含税价?', opts: ['$300', '$320', '$297.27', '$310'], ans: 0, explain: '含税 ÷ 1.09 = 不含税; $327 ÷ 1.09 = $300' },
    { q: '$100 增 20% 后再减 20%, 等于?', opts: ['$100', '$96', '$104', '$120'], ans: 1, explain: '$100×1.2=$120; $120×0.8=$96. 不是还原!' }
  ],
  math_ratio: [
    { q: 'A:B = 2:3, 总 25, A 是多少?', opts: ['10', '8', '15', '12'], ans: 0, explain: 'A:B=2:3, 5 份共 25; 1 份 = 5; A=2 份=10' },
    { q: 'A:B=2:3, B:C=4:5, A:C 是?', opts: ['2:5', '8:15', '6:12', '4:5'], ans: 1, explain: 'B 通分: A:B=8:12, B:C=12:15; A:C=8:15' },
    { q: 'PSLE 比例题最常用的解法?', opts: ['代数法', 'Bar model 模型法', '猜', '画图列表'], ans: 1, explain: 'Singapore Bar Model 是 PSLE 比例题标准解法, 必学' }
  ],
  math_speed: [
    { q: '120 km in 1.5 h, 平均速度?', opts: ['60 km/h', '75 km/h', '80 km/h', '90 km/h'], ans: 2, explain: '120 ÷ 1.5 = 80 km/h; 别误算成 120 ÷ 1 = 120' },
    { q: '60 km/h = ? m/s', opts: ['10', '16.67', '20', '60'], ans: 1, explain: 'km/h ÷ 3.6 = m/s; 60 ÷ 3.6 = 16.67' },
    { q: '相遇问题: A 速 60, B 速 40, 相距 200 km, 多久相遇?', opts: ['2 h', '4 h', '5 h', '3 h'], ans: 0, explain: '相遇: 速度和 × 时间 = 距离; 100×t=200, t=2h' }
  ],
  math_geometry: [
    { q: '矩形长 8, 宽 5, 周长 + 面积?', opts: ['周 26 面 40', '周 13 面 40', '周 40 面 26', '周 26 面 13'], ans: 0, explain: '周长 = 2(8+5)=26; 面积 = 8×5=40' },
    { q: '三角形底 12 高 8, 面积?', opts: ['96', '48', '24', '20'], ans: 1, explain: '三角形面积 = 底×高÷2 = 12×8÷2 = 48' },
    { q: '内角和 540° 是几边形?', opts: ['四边形', '五边形', '六边形', '七边形'], ans: 1, explain: '(n-2)×180 = 540, n-2=3, n=5; 五边形' }
  ],
  math_word_problems: [
    { q: '鸡兔同笼: 头 10, 脚 26, 鸡几只?', opts: ['4', '6', '7', '5'], ans: 2, explain: '假设法: 假设全鸡=20脚, 多 6 脚 → 6÷2=3 只兔, 7 只鸡' },
    { q: '应用题为什么 PSLE 评分必给 working?', opts: ['老师查作弊', '过程分 (method marks)', '没区别', '只是建议'], ans: 1, explain: 'PSLE 5 分题: 答错但 working 对仍给 method marks 1-2 分' },
    { q: '5 大解题法不包含?', opts: ['模型法', '假设法', '替换法', '猜测法'], ans: 3, explain: 'PSLE 5 法: 模型/假设/替换/倒推/单位. 猜测不算' }
  ],
  math_psle_paper1: [
    { q: 'PSLE 数学 Paper 1 多少分钟? 多少题?', opts: ['1h, 30 题', '50 min, 30 题', '1h15min, 25 题', '40 min, 40 题'], ans: 1, explain: 'Paper 1 = 50 min / 30 题, 平均 1.6 min/题. 不会跳着做.' },
    { q: 'Paper 2 长难题最多分值?', opts: ['2 分', '3 分', '4 分', '5 分'], ans: 3, explain: 'P2 末几道大题 4-5 分, 多步推理. 必给完整 working' },
    { q: '检查发现错题但时间不够时?', opts: ['硬改', '保留原答 + 旁注新答', '空着', '随便填'], ans: 0, explain: '硬改也比空着好; 至少有机会得分' }
  ],
  math_psle: [
    { q: 'AL 4-6 数学需要多少分?', opts: ['60-74%', '75-89%', '90-100%', '50-59%'], ans: 1, explain: 'AL 4=85-89, AL 5=80-84, AL 6=75-79' },
    { q: '答题漏单位最多扣几分?', opts: ['不扣', '1 分', '2 分', '全题分'], ans: 1, explain: '漏单位 (e.g., $50 写 50) -1; 多发可累积' },
    { q: '估算检查最有效的方法?', opts: ['看时长', '答案数量级是否合理', '检查写字工整', '问同学'], ans: 1, explain: '估算: 题问几百块, 答出 $1234 一定算错' }
  ],

  // === 📖 英语 ===
  eng_basics: [
    { q: 'Each of the boys ___ a book. 选?', opts: ['have', 'has', 'having', 'had'], ans: 1, explain: 'Each + 单数动词; "Each of the boys" 整体当 each 看, 单数' },
    { q: 'The news ___ shocking. 选?', opts: ['are', 'is', 'were', 'have'], ans: 1, explain: 'news 不可数 + 单数. 同类: information / advice / furniture' },
    { q: 'Neither John nor Mary ___ here. 选?', opts: ['is', 'are', 'were', 'has been'], ans: 0, explain: 'Neither/nor 看后面更近的主语 (Mary 单数), 用 is' }
  ],
  eng_comp: [
    { q: '"author suggests that..." 这种题考的是?', opts: ['表面意思', '隐含/推断', '词汇', '语法'], ans: 1, explain: 'Suggest/imply/hint = 推断题, 必抓证据再推, 不是直接答' },
    { q: '3 分 OE 题应给几个 point?', opts: ['1', '2', '3', '5'], ans: 2, explain: '3 分 = 3 个独立 point; 重复同样意思不给分' },
    { q: '词义题最有效的方法?', opts: ['查字典', 'Substitute test (代入测试)', '猜', '看上下文颜色'], ans: 1, explain: '把每个选项代入原句, 看哪个最通顺 + 不改变意思' }
  ],
  eng_cloze: [
    { q: 'I came ___ this old photo in the attic. 选?', opts: ['across', 'to', 'on', 'over'], ans: 0, explain: 'come across = 偶遇/无意中发现; phrasal verb 必背' },
    { q: 'In ___ of the rain, we went out. 选?', opts: ['spite', 'despite', 'although', 'instead'], ans: 0, explain: 'in spite of = despite (不是 spite alone); 都接名词' },
    { q: 'I am good ___ math. 选?', opts: ['at', 'in', 'on', 'with'], ans: 0, explain: '固定搭配: good AT subject. 类似: interested in / careful with' }
  ],
  eng_editing: [
    { q: 'Editing 12 空中 unchanged 有几个?', opts: ['0', '2', '4', '6'], ans: 2, explain: 'PSLE Editing: 8 错 + 4 unchanged. 改 unchanged 双扣分' },
    { q: '"He don\'t like apples." 改正为?', opts: ['He don\'t likes', 'He doesn\'t like', 'He do not like', 'unchanged'], ans: 1, explain: '主谓: He = 3rd person → doesn\'t (not don\'t)' },
    { q: '"Yesterday I am hungry." 改正?', opts: ['unchanged', 'I were', 'I was', 'I will be'], ans: 2, explain: 'yesterday = 过去时间 → 用 was, 不是 am' }
  ],
  eng_writing: [
    { q: '作文开头 3 句最佳策略?', opts: ['介绍人物', 'Sensory details + dialogue + action', '直接讲故事', '总结全文'], ans: 1, explain: 'Hook 读者: 听觉/视觉描写 + 对话 + 动作 → 评卷老师 6 分钟内决定分数' },
    { q: 'PSLE 作文跑题扣多少?', opts: ['扣 5 分', '扣 10 分', '直接 0 分', '不扣'], ans: 2, explain: '跑题 = 0 分; 全文必有 1 句扣 theme 关键词' },
    { q: '高级词最少几个?', opts: ['0', '1', '5', '10'], ans: 2, explain: 'AL 4-6 关键: 至少 5 个高级词 (crestfallen / jubilant / dawned upon...)' }
  ],
  eng_listening: [
    { q: '听到 "but" 后, 答案大概率在?', opts: ['前半句', '后半句', '完全无关', '需重听'], ans: 1, explain: 'but/however/although 后 90% 是答案; 前半句常是 distractor' },
    { q: 'fifteen 和 fifty 怎么区分?', opts: ['完全一样', '重音位置不同', 'fifteen 长一点', '看上下文'], ans: 1, explain: 'fifteen [fɪfˈtiːn] 重音第 2; fifty [ˈfɪfti] 重音第 1' },
    { q: '"the third of April" 是哪天?', opts: ['3/4', '4/3', '3 April', 'April 3'], ans: 1, explain: 'the third of April = April 3 = 4/3 (新加坡 day/month); 不是 3/4' }
  ],
  eng_oral: [
    { q: 'PSLE Oral 总分?', opts: ['20', '30', '40', '50'], ans: 1, explain: 'Oral = 朗读 10 + 看图说话 10 + 对话 10 = 30 分' },
    { q: '看图说话最佳深度?', opts: ['只描述', '描述 + 推断 + 联系生活', '只表达观点', '编故事'], ans: 1, explain: 'AL 4-6 关键: 不只看图说图, 加 personal opinion + 假设/经验' },
    { q: '卡顿 1 次扣多少分?', opts: ['0.5 分', '1 分', '2 分', '不扣'], ans: 1, explain: '卡 1 次 -1, 错词 -0.5; 宁可用简单流畅, 别用复杂卡 5 秒' }
  ],
  eng_psle: [
    { q: 'PSLE 英语总分?', opts: ['100', '150', '200', '300'], ans: 2, explain: 'P1 (作文 40) + P2 (95) + P3 (听 14) + P4 (Oral 30) ≈ 200 分' },
    { q: 'AL 4-6 英语对应几分?', opts: ['60-74%', '75-89%', '90-100%', '50-59%'], ans: 1, explain: 'PSLE AL 4=85-89, AL 5=80-84, AL 6=75-79' },
    { q: 'P2 SST (Synthesis & Transformation) 是?', opts: ['填空', '合并/改写句子', '阅读', '听力'], ans: 1, explain: 'SST = 合并 2 句 / 改主动被动 / 直接转间接, 一字一分' }
  ],

  // === 🇨🇳 华文 ===
  ch_idiom_adv: [
    { q: '"差强人意"的正确用法?', opts: ['表现差强人意让大家失望', '这次考试差强人意还算可接受', '表现实在差强人意太差了', '差强人意表示完美'], ans: 1, explain: '差强人意 = 勉强令人满意 (偏褒义). 望文生义误以为"很差"是最常见错误' },
    { q: '以下哪个句子有病句?', opts: ['他学习很努力', '这本书非常有意思', '他的成绩和体育都很好', '她认真完成了作业'], ans: 2, explain: '"成绩和体育都很好" — 搭配不当; 成绩用"优异", 体育用"出色", 不能混搭' },
    { q: '"处心积虑"的感情色彩是?', opts: ['褒义', '贬义', '中性', '看上下文'], ans: 1, explain: '处心积虑=贬义(蓄谋已久). 对应褒义: 殚精竭虑(尽心尽力). 感情色彩不可错用' }
  ],
  ch_reading: [
    { q: '"作者借此表达什么" 这种题?', opts: ['答原文表面', '推中心思想 + 自己话总结', '答字数最多的', '随便答'], ans: 1, explain: 'PSLE 高华推断题 = 不能照抄原文, 必用自己的话提炼升华' },
    { q: '古诗中"月亮" 常代表?', opts: ['夜晚', '思乡/团圆', '光明', '冷清'], ans: 1, explain: '月 = 思乡 (李白 "举头望明月"); 团圆 (中秋); PSLE 高频意象' },
    { q: '"这句话在文中的作用" 应答?', opts: ['只答内容', '只答结构', '内容 + 结构 (承上启下)', '答字数'], ans: 2, explain: '内容上 (突出主题) + 结构上 (承上启下/铺垫). 缺一扣分' }
  ],
  ch_composition: [
    { q: '议论文标准结构?', opts: ['开端-结局', '总-分-总', '起承转合', '提问-回答'], ans: 2, explain: '起 (引出论点) → 承 (论证 1+2) → 转 (反例) → 合 (升华)' },
    { q: 'AL 4-6 作文必有的元素?', opts: ['只要 150 字', '高级词 + 引用古文 + 比喻', '只写日常', '只说观点'], ans: 1, explain: '高华作文要"古为今用": 引用 (孔子云) + 高级词 + 至少 1 比喻' },
    { q: '作文跑题扣多少?', opts: ['扣 10 分', '扣 50%', '直接 0 分', '不扣'], ans: 2, explain: '跑题 = 0 分. 全文必扣 theme; 结尾必呼应题目' }
  ],
  ch_oral: [
    { q: 'PSLE 高华口试 看图说话 满分策略?', opts: ['只描述图片', '描述 + 推因 + 联系生活/经验', '说越多越好', '说越快越好'], ans: 1, explain: '高华口试要展示思考深度: 描述+推断+联系自身, 不只是描述' },
    { q: '常用对话连接词?', opts: ['首先...其次...最后', '随便', '我觉得...', '不知道'], ans: 0, explain: '"首先...其次...最后..." / "在我看来" / "古人云..." 显逻辑' },
    { q: '高华口试 vs 普华区别?', opts: ['一样', '高华内容深度更高', '只考朗读', '只考听'], ans: 1, explain: '高华: 朗读难度更高 + 内容深度 (议论性) + 引用古典' }
  ],
  ch_psle: [
    { q: 'PSLE 高华 Paper 1 是?', opts: ['阅读', '作文', '听力', '口试'], ans: 1, explain: 'Paper 1 = 作文 1.5h; Paper 2 = 1h45 阅读+成语+造句+病句' },
    { q: '高华证书对中学申请的作用?', opts: ['没作用', '加分 (HCL bonus)', '减分', '只是装饰'], ans: 1, explain: 'HCL pass = +2 加分点申请名校 (e.g., RI/Hwa Chong)' },
    { q: '高华失败 (fail) 的影响?', opts: ['不能上中学', '影响中学分配', '没影响', '加分 50%'], ans: 1, explain: 'HCL fail 影响 secondary school posting; 别为冲 AL 1 牺牲华文' }
  ]
};

function getNodePractice(nodeId) {
  return KNOWLEDGE_PRACTICE[nodeId] || null;
}

// v18.46: PSLE 真题 + P5/P6 名校 prelim 题库 (所有链接已 WebFetch 验证)
const PSLE_PAPER_BANK = {
  math: {
    name: '数学', icon: '➗', color: '#E8B86E',
    sections: [
      {
        title: '🎯 PSLE 真题 (历年完整卷 + 答案)',
        links: [
          { name: 'Club Math', star: true, desc: 'PSLE Math 2022-2025 历年真题 + 完整答案 PDF', url: 'https://www.clubmath.sg/past-years-psle-math-questions-with-answers/' },
          { name: 'Free Test Paper', star: true, desc: 'PSLE Math 历年真题免费下载 (P6 专区)', url: 'https://freetestpaper.com/' },
          { name: 'SG Test Paper', desc: '2009-2025 PSLE Math 历年汇编', url: 'https://www.sgtestpaper.com/' }
        ]
      },
      {
        title: '📚 P5/P6 名校 Prelim',
        links: [
          { name: 'Lion City Tutors', star: true, desc: 'P6 Math 11 套名校 (Raffles/Nanyang/Methodist/Nanhua/Red Swastika)', url: 'https://www.lioncitytutors.com/free-test-papers' },
          { name: 'Test Papers Free', desc: 'P5/P6 Math WA1/SA2 各名校免费 PDF', url: 'https://testpapersfree.com/' }
        ]
      }
    ]
  },
  english: {
    name: '英语', icon: '📖', color: '#6FB8A0',
    sections: [
      {
        title: '🎯 PSLE 真题',
        links: [
          { name: 'Free Test Paper', star: true, desc: 'P6 English PSLE 真题 + 名校 prelim', url: 'https://freetestpaper.com/' },
          { name: 'SG Test Paper', star: true, desc: '历年 PSLE English Paper 1-3 汇编', url: 'https://www.sgtestpaper.com/' }
        ]
      },
      {
        title: '📚 P5/P6 名校 Prelim',
        links: [
          { name: 'Lion City Tutors', star: true, desc: 'P6 English 3 套 (Nanyang/Raffles Girls/SCGS) + P5 15 套', url: 'https://www.lioncitytutors.com/free-test-papers' },
          { name: 'Test Papers Free', desc: 'P5/P6 English WA1/SA2/Prelim 各名校免费', url: 'https://testpapersfree.com/' },
          { name: 'Asian Parent', desc: 'PSLE English 题型 + 历年总结', url: 'https://sg.theasianparent.com/psle-past-year-papers' }
        ]
      }
    ]
  },
  science: {
    name: '科学', icon: '🔬', color: '#9B8FC9',
    sections: [
      {
        title: '🎯 PSLE 真题',
        links: [
          { name: 'Free Test Paper', star: true, desc: 'P6 Science PSLE 真题 + 名校 prelim 全免费', url: 'https://freetestpaper.com/' },
          { name: 'SG Test Paper', star: true, desc: '2009-2025 PSLE Science 历年 (含 OE 答案)', url: 'https://www.sgtestpaper.com/' }
        ]
      },
      {
        title: '📚 P5/P6 名校 Prelim',
        links: [
          { name: 'Lion City Tutors', star: true, desc: 'P6 Science 10 套名校 (ACS Junior/Methodist/Nanhua/Nanyang/Raffles Girls)', url: 'https://www.lioncitytutors.com/free-test-papers' },
          { name: 'Test Papers Free', desc: 'P5/P6 Science 免费 PDF (WA1/SA2)', url: 'https://testpapersfree.com/' }
        ]
      }
    ]
  },
  chinese: {
    name: '华文/高华', icon: '🇨🇳', color: '#E07B7B',
    sections: [
      {
        title: '🎯 PSLE 高华真题',
        links: [
          { name: 'Free Test Paper', star: true, desc: 'P6 Higher Chinese 2025 + 历年专区, 15+ 真题免费', url: 'https://freetestpaper.com/' },
          { name: 'SG Test Paper', star: true, desc: 'P6 HCL 专区, 2009-2025 历年高华真题', url: 'https://www.sgtestpaper.com/' },
          { name: 'Kiasu Exampaper', desc: '2018-2024 P6 HCL + 名校 prelim PDF (部分免费)', url: 'https://kiasuexampaper.com/product/psle-p6-higher-chinese-hcl-exam-papers-soft-copy-download-pdf/' }
        ]
      },
      {
        title: '📚 P5/P6 名校 Prelim',
        links: [
          { name: 'SG Exam', star: true, desc: 'P6 名校中文卷 (Hwa Chong / Nanyang / RGS / RI)', url: 'https://sgexam.com/category/primary/chinese/' },
          { name: 'PSLE Pals 网课', desc: 'PSLE Chinese 在线课程 + 真题精讲', url: 'https://pslepals.thinkific.com/courses/pslechinese' }
        ]
      }
    ]
  }
};

function getPaperBank(subj) { return PSLE_PAPER_BANK[subj] || null; }

// 计算节点状态: locked / learning / mastered
function getKnowledgeNodeStatus(node, state) {
  const cw = state.currentWeek || 1;
  // 如果有 milestone 要求, 先看是否完成
  if (node.milestone && state.milestones && state.milestones[node.milestone]) return 'mastered';
  // 按周范围
  if (cw < node.weeks[0]) return 'locked';
  if (cw > node.weeks[1]) return 'mastered';
  return 'learning';
}

function getKnowledgeTreeStatus(state) {
  const out = {};
  Object.keys(KNOWLEDGE_TREE).forEach(subj => {
    out[subj] = KNOWLEDGE_TREE[subj].map(n => ({ ...n, status: getKnowledgeNodeStatus(n, state) }));
  });
  return out;
}

function getKnowledgeProgress(state) {
  let total = 0, mastered = 0, learning = 0;
  Object.keys(KNOWLEDGE_TREE).forEach(subj => {
    KNOWLEDGE_TREE[subj].forEach(n => {
      total++;
      const s = getKnowledgeNodeStatus(n, state);
      if (s === 'mastered') mastered++;
      else if (s === 'learning') learning++;
    });
  });
  return { total, mastered, learning, percent: Math.round(mastered / total * 100) };
}

// v18.3: 按今日 epochDay 哈希选 mini-game 内容(同一天稳定,跨天换)
function _epochDay() { return Math.floor(Date.now() / 86400000); }
function getDailyMathQuestions(count) {
  // 用日期作为种子洗牌, 取前 N 题; 同一天调多次返回同一组
  const seed = _epochDay();
  const arr = [...MATH_QUESTIONS];
  // 简单确定性 shuffle (Fisher-Yates with seeded RNG)
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count || 10);
}
function getDailyEditingParagraph() {
  const idx = _epochDay() % EDITING_PARAGRAPHS.length;
  return EDITING_PARAGRAPHS[idx];
}
function getDailyListenDictation() {
  const idx = _epochDay() % LISTEN_DICTATIONS.length;
  return LISTEN_DICTATIONS[idx];
}

// 父母解锁(管理页): 强制重置 streak 到指定天数 (默认上次最高的一半,鼓励)
function parentRestoreStreak(state, daysToRestore) {
  if (!state.dailyStreak) state.dailyStreak = { days: 0, lastDate: null, bestEver: 0, freezeTokens: 0, brokenAt: null };
  state.dailyStreak.days = daysToRestore || Math.floor((state.dailyStreak.bestEver || 0) / 2) || 1;
  state.dailyStreak.lastDate = streakTodayKey();
  state.dailyStreak.brokenAt = null;
}

// ============= v17.5 Phase 2: 神秘宝箱 (Skinner 变量奖励) =============
const MYSTERY_BOX_SLOTS_PER_BOX = 10;  // 每 10 个 slot 完成 → +1 box

// 计算总完成 slot 数 (从 state.daily 数据所有 true 计数)
function countTotalCompletedSlots(state) {
  if (!state.daily) return 0;
  let n = 0;
  for (const wk of Object.values(state.daily)) {
    for (const day of Object.values(wk || {})) {
      for (const v of Object.values(day || {})) {
        if (v === true) n++;
      }
    }
  }
  return n;
}

// 检查是否该发新 box (在每次打卡后调用) — 返回新发的盒子数
function awardMysteryBoxesIfDue(state) {
  if (!state.mysteryBoxes) {
    state.mysteryBoxes = { available: 0, opened: 0, totalSlotsAtLastEarn: 0, history: [] };
  }
  const total = countTotalCompletedSlots(state);
  const last = state.mysteryBoxes.totalSlotsAtLastEarn || 0;
  const newBoxes = Math.floor(total / MYSTERY_BOX_SLOTS_PER_BOX) - Math.floor(last / MYSTERY_BOX_SLOTS_PER_BOX);
  if (newBoxes > 0) {
    state.mysteryBoxes.available += newBoxes;
    state.mysteryBoxes.totalSlotsAtLastEarn = total;
  }
  return newBoxes;
}

// 开 1 个宝箱 — 返回 {tier:'common'|'wow'|'rare', points, wowFact?, equipId?}
// 概率: 70% common (+5 分) / 25% wow (+15 + wow 卡片) / 5% rare (随机解锁未到阈值的高分装备)
function openMysteryBoxOnce(state) {
  if (!state.mysteryBoxes || state.mysteryBoxes.available <= 0) return null;
  state.mysteryBoxes.available -= 1;
  state.mysteryBoxes.opened += 1;
  const r = Math.random();
  let tier, result;
  if (r < 0.70) {
    tier = 'common';
    result = { tier, points: 5 };
  } else if (r < 0.95) {
    tier = 'wow';
    // 随机选 1 条英语 wow 事实(科学的跟本周关联,这里给"惊喜"用英语池)
    const pool = ENGLISH_WOW_FACTS;
    const wow = pool[Math.floor(Math.random() * pool.length)];
    result = { tier, points: 15, wow };
  } else {
    tier = 'rare';
    // 选 1 件未解锁的高分装备(points 类),让 state 立刻解锁(通过提分到阈值)
    if (window.CHAMUI) {
      const candidates = window.CHAMUI.equipment.filter(e =>
        e.condition === 'points' && state.totalPoints < e.value
      ).sort((a, b) => a.value - b.value);  // 先解锁最容易够到的
      const eq = candidates[0];
      if (eq) {
        const needed = eq.value - state.totalPoints;
        result = { tier, points: needed, equipId: eq.id, equipName: eq.name, equipIcon: eq.icon };
      } else {
        // 都解锁了 → 给大额积分
        result = { tier, points: 50 };
      }
    } else {
      result = { tier, points: 50 };
    }
  }
  // 记录历史(只保留最近 10 条)
  state.mysteryBoxes.history.unshift({
    tier: result.tier,
    points: result.points,
    wow: result.wow ? result.wow.hook : null,
    equipId: result.equipId || null,
    ts: Date.now()
  });
  if (state.mysteryBoxes.history.length > 10) {
    state.mysteryBoxes.history = state.mysteryBoxes.history.slice(0, 10);
  }
  return result;
}

// ============= v17.5 Phase 2: 反直觉谜题(14 道, 1 题/难章周) =============
// Loewenstein 信息缺口 + Schultz 预测奖赏 — 必须先猜后看
const THINK_PUZZLES = [
  {
    week: 5, subject: '🔬 P4 Plant Transport ⭐',
    question: '把一棵小树苗的所有叶子都摘光, 树根继续吸水, 树会发生什么?',
    options: ['A. 树长得更快(节省叶子的能耗)', 'B. 树停止吸水, 几天后枯死', 'C. 树继续生长但变形', 'D. 树马上倒下'],
    correct: 'B',
    explanation: '叶子是"吸水的发动机"!没有叶子蒸腾, 就没有 suction 把水从根抬到顶 — 树根能吸水但水送不上去, xylem 干涸, 几天就死。这证明 xylem 的水流靠叶子蒸腾驱动, 不是根"压"上去的。'
  },
  {
    week: 6, subject: '🔬 P4 Plant Transport ⭐',
    question: '阳光强度增加 1 倍, 植物的蒸腾速度大约会增加多少?',
    options: ['A. 不变(蒸腾不靠阳光)', 'B. 增加约 1 倍', 'C. 增加约 5 倍', 'D. 反而减少'],
    correct: 'C',
    explanation: '不是 1 倍! 阳光让叶面温度升, 气孔开更大, 蒸腾速度大约增 5 倍。所以同样一棵树, 中午跟早晨的蒸腾速度差很多。这是 PSLE OE 题"为什么夏天树需要更多水"的原理。'
  },
  {
    week: 7, subject: '🔬 P4 Digestive ⭐⭐',
    question: '为什么小肠绒毛(villi)长得密密麻麻?',
    options: ['A. 让小肠看起来更大', 'B. 增加表面积加速吸收营养', 'C. 防止细菌入侵', 'D. 帮助食物移动'],
    correct: 'B',
    explanation: '小肠 6 米长, 加上绒毛 + 微绒毛, 表面积可达 250 m²(一个网球场!)。表面积越大 = 吸收越快越完全。这是 PSLE 高频题"小肠为什么这么长", 答案核心是"surface area for absorption"。'
  },
  {
    week: 8, subject: '🔬 P4 Digestive ⭐⭐',
    question: '胃里 pH=1 的强酸, 为什么不会把胃壁本身消化掉?',
    options: ['A. 胃壁是金属', 'B. 胃壁分泌黏液 + 每 3-4 天换新细胞', 'C. 胃酸只消化食物不消化人体', 'D. 胃酸不是真的酸'],
    correct: 'B',
    explanation: '胃壁会被消化, 所以才需要持续保护! 黏液层中和酸 + 上皮细胞每 3-4 天全部更新一遍。 PSLE 高频题"为什么胃酸不溶解胃" — 答案是"protective mucus + cell renewal"。'
  },
  {
    week: 10, subject: '🔬 P4 Light & Shadow ⭐',
    question: '同一只手电筒, 离墙更近, 影子会:',
    options: ['A. 变小变清晰', 'B. 变大变模糊', 'C. 大小不变', 'D. 完全消失'],
    correct: 'B',
    explanation: '光源越近, 物体相对光源越大, 挡的光越多 → 影子变大。同时光从多角度射来, 边缘模糊。 PSLE 高频反直觉: 直觉以为"近 = 小", 其实"近 = 大"。这跟太阳投影相反原理一样。'
  },
  {
    week: 11, subject: '🔬 P4 Light & Shadow ⭐',
    question: '一只白色物体放在红光下, 你看到它是什么颜色?',
    options: ['A. 白色(物体本身是白)', 'B. 红色', 'C. 看不见(变透明)', 'D. 黑色'],
    correct: 'B',
    explanation: '"白色" 是物体反射所有颜色光的结果。 红光下只有红光可反射 → 你看到红色。 PSLE 高频题"物体颜色取决于什么": 取决于光源 + 物体反射特性, 不是物体"自带颜色"。'
  },
  {
    week: 12, subject: '🔬 P4 Heat ⭐⭐',
    question: '两块同样大小的方块, 金属一块木头一块, 都在 100°C 烤箱 1 小时取出。你光手摸 — 哪块烫?',
    options: ['A. 金属烫', 'B. 木头烫', 'C. 一样烫(温度相同)', 'D. 都不烫'],
    correct: 'A',
    explanation: '虽然温度一样, 但金属导热快 — 把你手指的热抢走得快, 大脑感觉"凉/烫"剧烈; 木头导热慢, 你的手感觉相对温和。 PSLE 经典反直觉题: 温度 vs 热感是两回事!'
  },
  {
    week: 13, subject: '🔬 P4 Heat ⭐⭐',
    question: '100°C 的水蒸汽 vs 100°C 的开水 — 哪个烫到手更狠?',
    options: ['A. 开水(液体直接接触面积大)', 'B. 蒸汽(温度一样所以一样)', 'C. 蒸汽(释放汽化潜热多 6 倍)', 'D. 都不烫(100°C 而已)'],
    correct: 'C',
    explanation: '蒸汽接触皮肤先凝结成水(释放 2260 J/g 汽化潜热)再降温, 比 100°C 水多放约 6 倍热。 这就是为什么蒸汽烫伤特别严重。 PSLE 高频区分: 相同温度 ≠ 相同热量。'
  },
  {
    week: 16, subject: '🔬 P5 Cells + Food',
    question: '食物链上, 老鹰吃蛇, 蛇吃青蛙, 青蛙吃虫, 虫吃草。如果草大量减少, 谁的数量会先暴跌?',
    options: ['A. 虫(直接吃草)', 'B. 老鹰(顶层最敏感)', 'C. 蛇(中间环节)', 'D. 一起减少'],
    correct: 'A',
    explanation: '虫直接吃草 — 草少 → 虫先饿死。然后青蛙因虫少饿, 蛇因蛙少饿, 鹰最后受影响。 PSLE 食物链高频题: 影响从底层向上传递, 时间差几天到几周。'
  },
  {
    week: 17, subject: '🔬 P5 Water + Air',
    question: '一杯水放阳光下蒸发完了, 水分子去了哪里?',
    options: ['A. 消失了(变成空气)', 'B. 变成水蒸气分散到空气中', 'C. 变成氢和氧气', 'D. 沉到杯底了'],
    correct: 'B',
    explanation: '蒸发 = 水分子从液态进入气态, 分散到周围空气中。 不是"消失", 也不是分解(那是电解才会分成 H 和 O)。 PSLE 高频陷阱区分 evaporation(物理变化) vs 化学反应。'
  },
  {
    week: 20, subject: '⚡ P5 Electricity ⭐',
    question: '你家圣诞树上 20 个小灯泡串联, 1 个坏了:',
    options: ['A. 只有那 1 个不亮, 其他 19 个正常', 'B. 全部 20 个都不亮', 'C. 旁边 2 个不亮, 其余正常', 'D. 整个房间停电'],
    correct: 'B',
    explanation: '串联 = 1 个 path, 1 个断开 = 全断 → 全黑。 这就是为什么家里其他电器都用并联(其中 1 个坏不影响其他)。 PSLE 经典电路题。'
  },
  {
    week: 21, subject: '⚡ P5 Series & Parallel ⭐',
    question: '为什么家里的电灯/电视/电冰箱必须用并联, 不能串联?',
    options: ['A. 并联便宜', 'B. 1 个设备坏不影响其他, 且每个都有完整电压', 'C. 串联会爆炸', 'D. 并联省电'],
    correct: 'B',
    explanation: '并联两大优势: ① 1 个设备坏其他正常 ② 每个设备都拿到完整 220V (串联会被分压)。 设备需要的电压不同 — 并联让每个独立工作。 PSLE Paper 2 高频应用题。'
  },
  {
    week: 23, subject: '⚡ 综合 — Energy & Electricity',
    question: '一个 100W 的灯泡 vs 10W 的 LED 灯, 同等照明亮度, LED 多省了多少能源?',
    options: ['A. 节省 50%', 'B. 节省 90% (浪费的热量大幅减少)', 'C. 节省 100%', 'D. LED 反而更耗电'],
    correct: 'B',
    explanation: 'LED 把 90% 电变光, 10% 变热; 白炽灯只 5% 变光, 95% 变热!所以同样亮度 LED 用电仅 1/10。 PSLE Energy 高频"useful vs wasted energy"题。'
  },
  {
    week: 25, subject: '🎯 P5 整体串讲',
    question: 'PSLE Listening 题目里, 90% 的答案藏在哪个词后面?',
    options: ['A. "first" 后面', 'B. "but / however / although" 后面', 'C. "and" 后面', 'D. "the" 后面'],
    correct: 'B',
    explanation: '转折词后才是真正的信息! 听到 "but / however / although" 立刻竖耳朵 — 题目要问的内容 95% 在转折后, 不是前半句。 这是 PSLE Listening 必杀技。'
  }
];

// 取本周思考题(无则 null) + 是否已答
function getThinkPuzzleForWeek(state, weekN) {
  const puzzle = THINK_PUZZLES.find(p => p.week === weekN);
  if (!puzzle) return null;
  const answer = (state.thinkPuzzleAnswers && state.thinkPuzzleAnswers[weekN]) || null;
  return { puzzle, answer };
}

// 提交答案 — 返回 { correct: bool, points: int }
function submitThinkPuzzleAnswer(state, weekN, userAnswer) {
  const puzzle = THINK_PUZZLES.find(p => p.week === weekN);
  if (!puzzle) return null;
  if (!state.thinkPuzzleAnswers) state.thinkPuzzleAnswers = {};
  // 已答过不重复加分
  if (state.thinkPuzzleAnswers[weekN]) return state.thinkPuzzleAnswers[weekN];
  const correct = userAnswer === puzzle.correct;
  const record = { answer: userAnswer, correct, ts: Date.now() };
  state.thinkPuzzleAnswers[weekN] = record;
  // 答对答错都给分, 重点是思考过程; 答对 +10, 答错 +5
  state.totalPoints += correct ? 10 : 5;
  state.logs.push({
    reason: `🤔 思考题 W${weekN} ${correct ? '答对' : '思考奖励'}`,
    points: correct ? 10 : 5,
    week: weekN,
    timestamp: Date.now()
  });
  return record;
}

// v17.7 Phase 4: 词汇连连看中文翻译 — 用于 mini-game 配对
// 只覆盖最常考的 ~80 词(从 VOCAB_500 各 section 抽);其他词 fallback "未翻译"
const VOCAB_MEANINGS = {
  // 数学几何
  'perimeter':'周长','area':'面积','volume':'体积','length':'长','breadth':'宽','height':'高','width':'宽','depth':'深',
  'edge':'棱','vertex':'顶点','face':'面','side':'边','base':'底','apex':'顶','surface':'表面',
  'square':'正方形','rectangle':'长方形','triangle':'三角形','circle':'圆','oval':'椭圆','polygon':'多边形','pentagon':'五边形','hexagon':'六边形','octagon':'八边形',
  'parallel':'平行','perpendicular':'垂直','equilateral':'等边','right-angled':'直角','acute':'锐角','obtuse':'钝角','reflex':'优角','straight':'平角',
  'circumference':'圆周','radius':'半径','diameter':'直径',
  'cuboid':'长方体','cube':'立方体','cylinder':'圆柱','cone':'圆锥','sphere':'球体','prism':'棱柱','pyramid':'棱锥',
  // 数与运算
  'quotient':'商','remainder':'余数','dividend':'被除数','divisor':'除数','numerator':'分子','denominator':'分母',
  'mixed number':'带分数','improper fraction':'假分数','equivalent fraction':'等值分数','simplest form':'最简形式',
  'decimal':'小数','digit':'数字','factor':'因数','multiple':'倍数','prime':'质数','composite':'合数',
  'product':'积','sum':'和','difference':'差','multiply':'乘','divide':'除','add':'加','subtract':'减',
  'estimate':'估算','approximate':'近似','round off':'四舍五入',
  // 比例
  'ratio':'比','proportion':'比例','percentage':'百分比','scale':'比例尺','rate':'比率','speed':'速度','distance':'距离','time':'时间','average speed':'平均速度',
  'discount':'折扣','profit':'利润','loss':'亏损','GST':'消费税',
  // 数据
  'ascending':'升序','descending':'降序','median':'中位数','mean':'平均数','mode':'众数','range':'范围',
  'graph':'图','bar graph':'条形图','line graph':'折线图','pie chart':'饼图','frequency':'频率','data':'数据','table':'表',
  // 科学物质
  'matter':'物质','mass':'质量','density':'密度','weight':'重量',
  'solid':'固体','liquid':'液体','gas':'气体','particle':'粒子',
  'melt':'熔化','freeze':'凝固','evaporate':'蒸发','condense':'凝结','sublime':'升华','boil':'沸腾',
  'melting point':'熔点','freezing point':'凝固点','boiling point':'沸点','evaporation':'蒸发','condensation':'凝结','sublimation':'升华',
  // 力
  'force':'力','friction':'摩擦力','gravity':'重力','magnetic force':'磁力','elastic force':'弹力','contact force':'接触力',
  'inertia':'惯性','motion':'运动','acceleration':'加速度','balance':'平衡','spring':'弹簧',
  'push':'推','pull':'拉','attract':'吸引','repel':'排斥','lift':'举','support':'支撑',
  // 热
  'heat':'热','temperature':'温度','conductor':'导体','insulator':'绝缘体','heat gain':'吸热','heat loss':'放热','heat transfer':'热传递','contraction':'收缩','expansion':'膨胀',
  'Celsius':'摄氏度','thermometer':'温度计','degree':'度',
  // 光
  'light':'光','shadow':'影子','reflection':'反射','refraction':'折射','absorption':'吸收',
  'transparent':'透明','translucent':'半透明','opaque':'不透明','mirror':'镜子','lens':'透镜',
  'source of light':'光源','ray':'光线','beam':'光束','focus':'焦点','image':'影像',
  // 电
  'circuit':'电路','series circuit':'串联电路','parallel circuit':'并联电路','complete circuit':'完整电路','open circuit':'开路',
  'battery':'电池','bulb':'灯泡','switch':'开关','wire':'电线','cell':'电池单元',
  'current':'电流','voltage':'电压','resistance':'电阻','electricity':'电',
  // 生命科学植物
  'photosynthesis':'光合作用','respiration':'呼吸','transpiration':'蒸腾','germination':'萌发','reproduction':'繁殖',
  'root':'根','stem':'茎','leaf':'叶','flower':'花','fruit':'果实','seed':'种子','pollen':'花粉',
  'xylem':'木质部','phloem':'韧皮部','chlorophyll':'叶绿素','stomata':'气孔',
  // 动物人体
  'digestion':'消化','circulation':'循环','excretion':'排泄',
  'heart':'心','lung':'肺','kidney':'肾','stomach':'胃','intestine':'肠','liver':'肝',
  'skeleton':'骨骼','muscle':'肌肉','joint':'关节','nerve':'神经','blood vessel':'血管',
  'mammal':'哺乳动物','reptile':'爬行动物','amphibian':'两栖动物','bird':'鸟','fish':'鱼','insect':'昆虫',
  // 生态
  'ecosystem':'生态系统','habitat':'栖息地','environment':'环境','food chain':'食物链','food web':'食物网',
  'producer':'生产者','consumer':'消费者','decomposer':'分解者','predator':'捕食者','prey':'猎物',
  'adaptation':'适应','camouflage':'伪装','hibernation':'冬眠','migration':'迁徙',
  'water cycle':'水循环','carbon cycle':'碳循环','precipitation':'降水',
  // 实验
  'experiment':'实验','observation':'观察','hypothesis':'假设','conclusion':'结论','variable':'变量',
  'control':'对照','fair test':'公平实验','prediction':'预测',
  'apparatus':'仪器','beaker':'烧杯','flask':'烧瓶','test tube':'试管','measuring cylinder':'量筒'
};

// 给一个英文词返回中文 (找不到返回 word 本身)
function getVocabMeaning(word) {
  return VOCAB_MEANINGS[word] || word;
}

// 给 weekN (1..73) 返回该周对应的词表 ({subject, subjectIcon, section, weekRange}).
// W1-W7 → math (按 section 索引顺序); W8-W17 → sci; 其它周 → null
function getVocabForWeek(weekN) {
  if (weekN >= 1 && weekN <= 7) {
    const idx = (weekN - 1) % VOCAB_500.math.sections.length;
    return { subject: '数学', subjectIcon: '➗', section: VOCAB_500.math.sections[idx], weekRange: 'W1-W7 (200 词)' };
  }
  if (weekN >= 8 && weekN <= 17) {
    const idx = (weekN - 8) % VOCAB_500.sci.sections.length;
    return { subject: '科学', subjectIcon: '🔬', section: VOCAB_500.sci.sections[idx], weekRange: 'W8-W17 (300 词)' };
  }
  return null;
}

// ============= 73 周每日任务表 (从 PSLE 备考手册 v16.docx 提取) =============
const WEEK_TASKS = [{"week":1,"date":"5.4-5.10","theme":"P3 Diversity(动+植+材料)— 易章速览","goal":"里程碑:P3 Diversity 三章过完,确认基础概念","days":{"Mon":{"E1":"📖 Comprehension P5 第 1","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数学几何与测量 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 动物分类(脊椎/无脊椎)","VB":"📚 Vocabulary U1"},"Tue":{"E1":"✏️ Grammar U1+Editing 1","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 植物分类(花/无花植物)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文计划","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 几何与测量拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 材料(分类+性质)","VB":"📚 Vocabulary U2"},"Thu":{"E1":"📖 Cloze 5 第 1","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 Diversity 章节小测","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ P5 难题","VB":"📋 W2 准备"},"Sat":{"AM":"🔬 补习(分类整理表)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":2,"date":"5.11-5.17","theme":"P3 Plant Life Cycle — 中等节奏","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 2","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数学数与运算 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 种子结构(seed coat/embryo)","VB":"📚 Vocabulary U3"},"Tue":{"E1":"✏️ Grammar U2+Editing 3","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 萌发条件(水+空气+温度)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数与运算拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 生长阶段(seedling→mature)","VB":"📚 Vocabulary U4"},"Thu":{"E1":"📖 Cloze 第 2","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 Conquer Daily + 概念图","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W3 准备"},"Sat":{"AM":"🔬 补习 / 章节小测","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":3,"date":"5.18-5.24","theme":"P3 Animal Life Cycle — 中等节奏","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 3","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数学比与比例 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 蝴蝶 4 阶段(完全变态)","VB":"📚 Vocabulary U5"},"Tue":{"E1":"✏️ Grammar U3+Editing 5","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 蛙类 4 阶段(蝌蚪→青蛙)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 比与比例拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 鸡(无变态)/ 蟑螂(不完全变态)","VB":"📚 Vocabulary U6"},"Thu":{"E1":"📖 Cloze 第 3","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 4 类动物对比表","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W4 准备"},"Sat":{"AM":"🔬 补习 / 章节小测","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":4,"date":"5.25-5.31","theme":"P3 Plant Parts + P3 整合测试","goal":"W4 月评估:P3 全部完成,准备进入 P4 难章","days":{"Mon":{"E1":"📖 Comprehension P5 第 4","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数学数据统计 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 根/茎/叶功能","VB":"📚 Vocabulary U7"},"Tue":{"E1":"✏️ Grammar U4+Editing 7","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 花/果实/种子功能","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数据统计拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 P3 整章思维导图","VB":"📚 Vocabulary U8"},"Thu":{"E1":"📖 Cloze 第 4","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 P3 综合练习","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W5 准备(进 P4 难章!)"},"Sat":{"AM":"🔬 P3 综合测试 + 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":5,"date":"6.1-6.7","theme":"P4 Plant Transport ⭐ — 难章第 1 周(概念建立)","goal":"⭐ 难章第 1 周:概念建立,不急刷题","days":{"Mon":{"E1":"📖 Comprehension P5 第 5","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数学运算动词 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 教材精读(运输系统结构)","VB":"📚 Vocabulary U9"},"Tue":{"E1":"✏️ Grammar U5+Editing 9","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 教材精读(xylem 运水)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 运算动词拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 芹菜染色实验分析","VB":"📚 Vocabulary U10"},"Thu":{"E1":"📖 Cloze 第 5","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 概念图(英文术语)","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W6 准备(深化)"},"Sat":{"AM":"🔬 补习(Plant Transport 概念)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":6,"date":"6.8-6.14","theme":"P4 Plant Transport ⭐ — 难章第 2 周(深化应用)","goal":"⭐ Plant Transport 收官:确认能独立应对开放题","days":{"Mon":{"E1":"📖 Comprehension P5 第 6","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 数学综合复习 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 高频题型练习","VB":"📚 Vocabulary U11"},"Tue":{"E1":"✏️ Grammar U6+Editing 11","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 开放题专项(关键词)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 综合复习拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 实验设计题专项","VB":"📚 Vocabulary U12"},"Thu":{"E1":"📖 Cloze 第 6","OR":"🗣️ 豆包 PSLE 口语模拟对话","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 章节综合测试","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W7 准备"},"Sat":{"AM":"🔬 综合测试 + 错题分析","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":7,"date":"6.15-6.21","theme":"P4 Digestive System ⭐⭐ — 难章第 1 周","goal":"⭐⭐ Digestive 第 1 周:完整路径必须烂熟","days":{"Mon":{"E1":"📖 Comprehension P5 第 7","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 数学错题回看 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 口腔/食道(化学+物理消化)","VB":"📚 Vocabulary U13"},"Tue":{"E1":"✏️ Grammar U7+Editing 13","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 胃(胃酸+蛋白消化)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 错题回看拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 小肠(吸收营养)+ 大肠(吸水)","VB":"📚 Vocabulary U14"},"Thu":{"E1":"📖 Cloze 第 7","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 完整消化路径流程图","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W8 准备(深化)"},"Sat":{"AM":"🔬 补习(Digestive 概念)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":8,"date":"6.22-6.28","theme":"P4 Digestive System ⭐⭐ — 难章第 2 周","goal":"⭐⭐ Digestive 收官 + W8 月评估","days":{"Mon":{"E1":"📖 Comprehension P5 第 8","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学物质三态 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 PSLE 高频题型(消化路径)","VB":"📚 Vocabulary U15"},"Tue":{"E1":"✏️ Grammar U8+Editing 15","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 营养素(糖/蛋白/脂)消化对应","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 物质三态拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 实验题(酶活性)+ 开放题","VB":"📚 Vocabulary U16"},"Thu":{"E1":"📖 Cloze 第 8","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 章节综合测试","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W9 准备"},"Sat":{"AM":"🔬 综合测试 + 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":9,"date":"6.29-7.5","theme":"P4 Matter + Mass/Volume — 易章速览","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 9","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学力与运动 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 三态 + 状态变化(P5 复习)","VB":"📚 Vocabulary U17"},"Tue":{"E1":"✏️ Grammar U9+Editing 17","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 Mass vs Volume 区分","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 力与运动拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 Conquer Daily 实验题(测量)","VB":"📚 Vocabulary U18"},"Thu":{"E1":"📖 Cloze 第 9","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 Matter+M/V 章节小测","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W10 准备(进难章)"},"Sat":{"AM":"🔬 补习 / 自学错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":10,"date":"7.6-7.12","theme":"P4 Light & Shadow ⭐ — 难章第 1 周","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 10","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学热温度 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 光源 + 直线传播","VB":"📚 Vocabulary U19"},"Tue":{"E1":"✏️ Grammar U10+Editing 19","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 反射 + 镜面 vs 漫反射","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 热温度拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 影子形成原理 + 实验","VB":"📚 Vocabulary U20"},"Thu":{"E1":"📖 Cloze 第 10","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 不透明/半透明/透明对比","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W11 准备"},"Sat":{"AM":"🔬 补习(光学概念)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":11,"date":"7.13-7.19","theme":"P4 Light & Shadow ⭐ — 难章第 2 周","goal":"⭐ Light 收官:实验题答题模板熟练","days":{"Mon":{"E1":"📖 Comprehension P5 第 11","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学光与影 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 影子大小 vs 光源距离","VB":"📚 Vocabulary U21"},"Tue":{"E1":"✏️ Grammar U11+Editing 21","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 影子方向 vs 光源位置","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 光与影拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 实验设计题专项","VB":"📚 Vocabulary U22"},"Thu":{"E1":"📖 Cloze 第 11","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 章节综合测试","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W12 准备"},"Sat":{"AM":"🔬 综合测试 + 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":12,"date":"7.20-7.26","theme":"P4 Heat Energy ⭐⭐ — 难章第 1 周","goal":"⭐⭐ Heat 第 1 周:三种热传递必须区分清晰","days":{"Mon":{"E1":"📖 Comprehension P5 第 12","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学电 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 温度 vs 热(区分)","VB":"📚 Vocabulary U23"},"Tue":{"E1":"✏️ Grammar U12+Editing 23","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 热传导(良导体/绝缘体)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 电拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 对流(流体)+ 辐射(无介质)","VB":"📚 Vocabulary U24"},"Thu":{"E1":"📖 Cloze 第 12","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 热膨胀冷缩(实验)","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W13 准备"},"Sat":{"AM":"🔬 补习(Heat 概念)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":13,"date":"7.27-8.2","theme":"P4 Heat Energy ⭐⭐ — 难章第 2 周","goal":"⭐⭐ Heat 收官 + 难章全部完成","days":{"Mon":{"E1":"📖 Comprehension P5 第 13","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学植物生命 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 PSLE 高频题型(Heat)","VB":"📚 Vocabulary U25"},"Tue":{"E1":"✏️ Grammar U13+Editing 25","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 开放题专项(为什么/解释)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 植物生命拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 综合应用题(三种传递混合)","VB":"📚 Vocabulary U26"},"Thu":{"E1":"📖 Cloze 第 13","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 章节综合测试","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W14 准备(收尾)"},"Sat":{"AM":"🔬 综合测试 + 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":14,"date":"8.3-8.9","theme":"P4 Magnets + P3-P4 综合模拟卷 🎯","goal":"🎯🎯 第一阶段收官:P3-P4 综合模拟卷 + 大复盘","days":{"Mon":{"E1":"📖 Comprehension P5 第 14","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 科学动物人体 30 词领读","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 磁体属性 + 磁极相吸相斥","VB":"📚 Vocabulary U27"},"Tue":{"E1":"✏️ Grammar U14+Editing 27","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 磁性材料 + 磁化","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 动物人体拼写 + 用法测","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 磁场 + 应用题","VB":"📚 Vocabulary U28"},"Thu":{"E1":"📖 Cloze 第 14","OR":"🗣️ 看图说话 1min + 3 推理","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 CNA938 / okto kids 短篇","ED":"✏️ Editing 5 段(每段 3min)","S2":"🔬 Magnets 章节小测","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5 段(每段 3min)","S2":"➗ 难题","VB":"📋 W15 准备(P5 收尾)"},"Sat":{"AM":"🔬 P3-P4 综合模拟卷(限时 1h45min)+ 错题分析","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":15,"date":"8.10-8.16","theme":"P5 启动:Reproduction","goal":"W15 启动 P5 系统提升期","days":{"Mon":{"E1":"📖 Comprehension P5 第 15","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 科学生态环境 30 词领读","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 Plant Reproduction(植物繁殖)","VB":"📚 Vocabulary 6 U1"},"Tue":{"E1":"✏️ Grammar U15+Editing 29","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Human Reproduction","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 生态环境拼写 + 用法测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Reproduction 配套练习","VB":"📚 Vocabulary 6 U2"},"Thu":{"E1":"📖 Cloze 第 15","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 vs P3-P4 衔接整理","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W16 准备"},"Sat":{"AM":"🔬 补习(P5 启动)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":16,"date":"8.17-8.23","theme":"P5 Cells + Energy from Food","goal":"Vocab 5 完成 ✅","days":{"Mon":{"E1":"📖 Comprehension P5 第 16","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 科学实验科学方法 30 词领读","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Cells 结构(植物 vs 动物)","VB":"📚 Vocabulary 6 U3"},"Tue":{"E1":"✏️ Grammar U16+Editing 31","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 食物链 + 食物网","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 实验科学方法拼写 + 用法测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Cells 配套练习","VB":"📚 Vocabulary 6 U4"},"Thu":{"E1":"📖 Cloze 第 16","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Energy from Food 续","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W17 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":17,"date":"8.24-8.30","theme":"P5 Water + Air & Weather","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 17","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 科学综合复习 30 词领读","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 水循环深化","VB":"📚 Vocabulary 6 U5"},"Tue":{"E1":"✏️ Grammar U17+Editing 33","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Air 组成 + 气压","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 综合复习拼写 + 用法测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Weather 类型 + 测量","VB":"📚 Vocabulary 6 U6"},"Thu":{"E1":"📖 Cloze 第 17","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(本周 30 词:中→英翻译 + 造句)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Water/Air 综合练习","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断含 5 题词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W18 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":18,"date":"8.31-9.6","theme":"P5 Forms of Energy","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 18","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Kinetic + Potential Energy","VB":"📚 Vocabulary 6 U7"},"Tue":{"E1":"✏️ Grammar U18+Editing 35","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Sound + Electrical","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Energy 综合分类","VB":"📚 Vocabulary 6 U8"},"Thu":{"E1":"📖 Cloze 第 18","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Energy 配套练习","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W19 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":19,"date":"9.7-9.13","theme":"P5 Energy Conversions","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 19","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 能量转换例子(灯泡/风扇/太阳能)","VB":"📚 Vocabulary 6 U9"},"Tue":{"E1":"✏️ Grammar U19+Editing 37","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Sources(可再生 vs 不可再生)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 Energy efficiency 概念","VB":"📚 Vocabulary 6 U10"},"Thu":{"E1":"📖 Cloze 第 19","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 综合练习","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W20 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":20,"date":"9.14-9.20","theme":"P5 Electricity 基础 ⭐","goal":"⭐ Electricity 是 PSLE 高频考点,重点掌握","days":{"Mon":{"E1":"📖 Comprehension P5 第 20","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 电流/电压/电阻基础","VB":"📚 Vocabulary 6 U11"},"Tue":{"E1":"✏️ Grammar U20+Editing 39","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 简单电路(电池+灯+开关)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 导体 vs 绝缘体 + 安全","VB":"📚 Vocabulary 6 U12"},"Thu":{"E1":"📖 Cloze 第 20","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 电路图实操","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W21 准备"},"Sat":{"AM":"🔬 补习(电学重点)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":21,"date":"9.21-9.27","theme":"P5 Series & Parallel 电路 ⭐","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 21","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 串联电路特点(电流相同/电压分配)","VB":"📚 Vocabulary 6 U13"},"Tue":{"E1":"✏️ Grammar U21+Editing 41","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 并联电路特点","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 串并联综合题","VB":"📚 Vocabulary 6 U14"},"Thu":{"E1":"📖 Cloze 第 21","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 PSLE 电路题专项","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W22 准备"},"Sat":{"AM":"🔬 补习(电路深化)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":22,"date":"9.28-10.4","theme":"P5 综合复习 1","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 22","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 Cycles 总复习","VB":"📚 Vocabulary 6 U15"},"Tue":{"E1":"✏️ Grammar U22+Editing 43","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 Systems 总复习","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 综合卷 1","VB":"📚 Vocabulary 6 U16"},"Thu":{"E1":"📖 Cloze 第 22","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 综合卷错题分析","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W23 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":23,"date":"10.5-10.11","theme":"P5 综合复习 2","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 23","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 Energy 总复习","VB":"📚 Vocabulary 6 U17"},"Tue":{"E1":"✏️ Grammar U23+Editing 45","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 Electricity 总复习","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 综合卷 2","VB":"📚 Vocabulary 6 U18"},"Thu":{"E1":"📖 Cloze 第 23","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 综合卷错题","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W24 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":24,"date":"10.12-10.18","theme":"P5 综合卷模拟 + 弱项回填","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 24","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 综合卷 1(限时)","VB":"📚 Vocabulary 6 U19"},"Tue":{"E1":"✏️ Grammar U24+Editing 47","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 综合卷 1 错题分析","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 弱项章节回填","VB":"📚 Vocabulary 6 U20"},"Thu":{"E1":"📖 Cloze 第 24","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 综合卷 2(限时)","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W25 准备"},"Sat":{"AM":"🔬 综合卷 2 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":25,"date":"10.19-10.25","theme":"P5 整体串讲 + Visual Text 启动","goal":null,"days":{"Mon":{"E1":"📖 Comprehension P5 第 25","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 P5 整体串讲(联系 P3-P4)","VB":"📚 Vocabulary 6 U21"},"Tue":{"E1":"✏️ Grammar U25+Editing 49","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 弱项专项练习","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 作文","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 PSLE 题型熟悉(开放题)","VB":"📚 Vocabulary 6 U22"},"Thu":{"E1":"📖 Cloze 第 25 + Visual Text 6 第 1 套","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 实验题专项","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W26 准备(总模考)"},"Sat":{"AM":"🔬 综合练习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":26,"date":"10.26-11.1","theme":"🎯 第一阶段总模考","goal":"🎯🎯 第一阶段总模考(W26)— 26 周收官 + W27 进入第二阶段","days":{"Mon":{"E1":"📖 英语模考 Paper 1+2","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 错题词汇本回看","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 科学总模考(限时 1h45min)","VB":"📚 Vocabulary 6 U23"},"Tue":{"E1":"📖 英语错题分析","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 模考全卷讲评 + 错题","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文模考 + 错题","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 旧词复测","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"🔬 弱项章节回填","VB":"📚 Vocabulary 6 U24"},"Thu":{"E1":"📖 Cloze 第 26","OR":"🗣️ Stimulus + 3 问对答","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE Listening 题型 1 段","ED":"✏️ Editing 5-6 段","S2":"➗ 数学模考 + 错题","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 5-6 段","S2":"➗ 难题","VB":"📋 W27 第二阶段准备"},"Sat":{"AM":"🔬 P6 难度卷 1 套(预热)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"🎯 第一阶段大复盘 + 核对表","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":27,"date":"11.2-11.8","theme":"P5 光合作用深化","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 2 套","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 光合作用过程(水+CO2+阳光)","VB":"📚 Vocabulary 6 U25"},"Tue":{"E1":"✏️ Grammar 6 U1+Editing 1","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 叶子结构与光合作用","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 P6 阅读+作文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 影响因素(光强/CO2/温度)","VB":"📚 Vocabulary 6 U26"},"Thu":{"E1":"📖 Cloze 6 第 1","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 光合 vs 呼吸对比","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ P6 难题","VB":"📋 W28 准备"},"Sat":{"AM":"🔬 补习(P5 内容)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":28,"date":"11.9-11.15","theme":"P5 Air & Weather","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 3","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Air 组成(N2/O2/CO2)","VB":"📚 Vocabulary 6 U27"},"Tue":{"E1":"✏️ Grammar U2+Editing 3","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Weather 类型 + 测量","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文 P6","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 气压 + 风的形成","VB":"📚 Vocabulary 6 U28"},"Thu":{"E1":"📖 Cloze 6 第 2","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 综合练习","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W29 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":29,"date":"11.16-11.22","theme":"P5 能量形式","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 4","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Kinetic + Potential Energy","VB":"📚 Vocabulary 6 U29"},"Tue":{"E1":"✏️ Grammar U3+Editing 5","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Sound + Electrical Energy","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Heat/Light/Chemical(回顾)","VB":"📚 Vocabulary 6 U30"},"Thu":{"E1":"📖 Cloze 6 第 3","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 能量分类","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W30 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":30,"date":"11.23-11.29","theme":"P5 能量转换 + Practice Package 启动","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 5","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Energy Conversion 例子","VB":"📚 PSLE 高频词 1-5"},"Tue":{"E1":"✏️ Grammar U4+Editing 7","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Sources(可再生 vs 不可再生)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Energy efficiency","VB":"📚 PSLE 高频词 6-10"},"Thu":{"E1":"📖 Cloze 6 第 4","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 综合练习","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W31 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 Practice Package 6 第 1 套 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":31,"date":"11.30-12.6","theme":"P5 电学基础 ⭐","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 6","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 电流/电压/电阻基础","VB":"📚 高频词 11-15"},"Tue":{"E1":"✏️ Grammar U5+Editing 9","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 简单电路","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 导体 vs 绝缘体 + 安全","VB":"📚 高频词 16-20"},"Thu":{"E1":"📖 Cloze 6 第 5","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 电路图实操","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W32 准备"},"Sat":{"AM":"🔬 补习(电学重点)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":32,"date":"12.7-12.13","theme":"P5 串并联电路 ⭐ + 月模考 1","goal":"🎯 月模考 1 + Vocab 6 主体完成 ✅","days":{"Mon":{"E1":"📖 Visual Text 6 第 7","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 串联电路特点","VB":"📚 高频词 21-25"},"Tue":{"E1":"✏️ Grammar U6+Editing 11","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 并联电路特点","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 串并联综合题","VB":"📚 高频词 26-30"},"Thu":{"E1":"📖 Cloze 6 第 6","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE 电路题专项","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W33 准备"},"Sat":{"AM":"🔬 月模考 1(P3+P4+P5 综合)","PM":"📖 模考分析 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":33,"date":"12.14-12.20","theme":"P6 Adaptations 启动","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 8","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 P6 Plant Adaptations","VB":"📚 PSLE 高频词 31-35"},"Tue":{"E1":"✏️ Grammar U7+Editing 13","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Animal Adaptations","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 适应特征 vs 环境","VB":"📚 高频词 36-40"},"Thu":{"E1":"📖 Cloze 6 第 7","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W34 准备"},"Sat":{"AM":"🔬 补习(P6 启动)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":34,"date":"12.21-12.27","theme":"P5 总复习 + 月模考 1 收尾","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 9","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 P5 Cycles+Systems 复习","VB":"📚 高频词 41-45"},"Tue":{"E1":"✏️ Grammar U8+Editing 15","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 P5 Energy+Electricity 复习","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 P5 Air+Water 复习","VB":"📚 高频词 46-50"},"Thu":{"E1":"📖 Cloze 6 第 8","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 P5 思维导图整理","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W35 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 Practice Package 6 第 2 套 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":35,"date":"12.28-1.3","theme":"P6 Electrical Systems 启动 ⭐","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 10","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 复杂电路分析(混合)","VB":"📚 高频词 51-55"},"Tue":{"E1":"✏️ Grammar U9+Editing 17","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 电路故障诊断","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 电流分配规律","VB":"📚 高频词 56-60"},"Thu":{"E1":"📖 Cloze 6 第 9","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE 电学综合题","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W36 准备"},"Sat":{"AM":"🔬 补习(P6 电学)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":36,"date":"1.4-1.10","theme":"P6 Electrical Systems 续","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 11","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE 电学专题(近 5 年)","VB":"📚 高频词 61-65"},"Tue":{"E1":"✏️ Grammar U10+Editing 19","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 电学开放题专项","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 电学错题分析","VB":"📚 高频词 66-70"},"Thu":{"E1":"📖 Cloze 6 第 10","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 电学综合卷","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W37 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":37,"date":"1.11-1.17","theme":"P6 Forces 基础 ⭐","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 12","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 力的种类(推/拉/重力/摩擦/弹力)","VB":"📚 高频词 71-75"},"Tue":{"E1":"✏️ Grammar U11+Editing 21","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 摩擦力(种类/方向/影响)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 重力 vs 质量 + 测量","VB":"📚 高频词 76-80"},"Thu":{"E1":"📖 Cloze 6 第 11","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 家庭实验(摩擦)","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W38 准备"},"Sat":{"AM":"🔬 补习(力)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":38,"date":"1.18-1.24","theme":"P6 Forces 续 + 月模考 2","goal":"🎯 月模考 2","days":{"Mon":{"E1":"📖 Visual Text 6 第 13","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 力的合成与平衡","VB":"📚 高频词 81-85"},"Tue":{"E1":"✏️ Grammar U12+Editing 23","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 力的应用题","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 力与运动","VB":"📚 高频词 86-90"},"Thu":{"E1":"📖 Cloze 6 第 12","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + Forces 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W39 准备"},"Sat":{"AM":"🔬 月模考 2(P5+P6 已学)","PM":"📖 Practice Package 6 第 3 套 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":39,"date":"1.25-1.31","theme":"P6 Interactions:食物链/网","goal":"🎯 100 个核心高频词完成 ✅","days":{"Mon":{"E1":"📖 Visual Text 6 第 14","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 食物链(producer/consumer)","VB":"📚 高频词 91-95"},"Tue":{"E1":"✏️ Grammar U13+Editing 25","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 食物网构建与解读","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 营养层级 + 能量流动","VB":"📚 高频词 96-100"},"Thu":{"E1":"📖 Cloze 6 第 13","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 食物链/网题型","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W40 准备"},"Sat":{"AM":"🔬 补习(生态)","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":40,"date":"2.1-2.7","theme":"P6 生态系统的相互作用","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 15","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 种群增长 + 限制因素","VB":"📚 进阶高频词 1-5"},"Tue":{"E1":"✏️ Grammar U14+Editing 27","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 共生(共生/寄生/捕食)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 人类活动对环境影响","VB":"📚 进阶高频词 6-10"},"Thu":{"E1":"📖 Cloze 6 第 14","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + Interactions 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W41 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":41,"date":"2.8-2.14","theme":"P6 食物中的能量","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 16","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 食物中的能量(carb/fat/protein)","VB":"📚 进阶高频词 11-15"},"Tue":{"E1":"✏️ Grammar U15+Editing 29","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 七大营养素 + 平衡饮食","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 食物→消化→能量(综合)","VB":"📚 进阶高频词 16-20"},"Thu":{"E1":"📖 Cloze 6 第 15","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 营养题专项","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W42 准备"},"Sat":{"AM":"🔬 补习","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":42,"date":"2.15-2.21","theme":"P6 Adaptations 深化 + 月模考 3","goal":"🎯🎯 W42 P5+P6 全部学完!W43 起进入真题前移期","days":{"Mon":{"E1":"📖 Visual Text 6 第 17","OR":"🗣️ PSLE 真题对答练习","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Adaptations 深化(极端环境)","VB":"📚 进阶高频词 21-25"},"Tue":{"E1":"✏️ Grammar U16+Editing 31","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Adaptations+Interactions 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ PSLE 真题对答练习","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 P5+P6 整体串讲","VB":"📚 进阶高频词 26-30"},"Thu":{"E1":"📖 Cloze 6 第 16","OR":"🗣️ PSLE 真题对答练习","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 P5+P6 总思维导图","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W43 真题前移期准备"},"Sat":{"AM":"🔬 月模考 3(全 P6)","PM":"📖 Practice Package 6 第 4 套 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":43,"date":"2.22-2.28","theme":"MC PSLE Guide + 科学真题 1","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 18","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 MC PSLE Guide Ch1(Diversity 复习)","VB":"📚 进阶高频词 31-35"},"Tue":{"E1":"✏️ Grammar U17+Editing 33","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide 配套练习","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 MC PSLE Guide Ch2(Cycles)","VB":"📚 进阶高频词 36-40"},"Thu":{"E1":"📖 Cloze 6 第 17","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + Diversity/Cycles 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W44 准备"},"Sat":{"AM":"🔬 PSLE 2024 真题(限时 1h45min)+ 错题分析","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":44,"date":"3.1-3.7","theme":"PSLE Guide + 科学真题 2","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 19","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide Ch3(Plant System)","VB":"📚 进阶高频词 41-45"},"Tue":{"E1":"✏️ Grammar U18+Editing 35","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide Ch4(Human System)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Systems PSLE 题型专项","VB":"📚 进阶高频词 46-50"},"Thu":{"E1":"📖 Cloze 6 第 18","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + Systems 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W45 准备"},"Sat":{"AM":"🔬 PSLE 2023 真题(限时)+ 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":45,"date":"3.8-3.14","theme":"PSLE Guide + 科学真题 3","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 20","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide Ch5(Light)","VB":"📚 进阶高频词 51-55"},"Tue":{"E1":"✏️ Grammar U19+Editing 37","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide Ch6(Heat)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Energy 综合题专项(实验设计)","VB":"📚 进阶高频词 56-60"},"Thu":{"E1":"📖 Cloze 6 第 19","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + Energy 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W46 准备"},"Sat":{"AM":"🔬 PSLE 2022 真题(限时)+ 错题","PM":"📖 综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":46,"date":"3.15-3.21","theme":"PSLE Guide + 科学真题 4 + 月模考 4","goal":"🎯 月模考 4","days":{"Mon":{"E1":"📖 Visual Text 6 第 21","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide Ch7(Magnets)","VB":"📚 进阶高频词 61-65"},"Tue":{"E1":"✏️ Grammar U20+Editing 39","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide Ch8(Matter)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 月模考 4 准备","VB":"📚 进阶高频词 66-70"},"Thu":{"E1":"📖 Cloze 6 第 20","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + Interactions 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W47 准备"},"Sat":{"AM":"🔬 PSLE 2021 真题(限时)+ 错题","PM":"📖 Practice Package 6 第 5 套 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":47,"date":"3.22-3.28","theme":"科学真题 5 + 英语真题 1","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 22","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide Ch9-10(Cells/Reproduction)","VB":"📚 进阶高频词 71-75"},"Tue":{"E1":"✏️ Grammar U21+Editing 41","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide 续","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 顶校真题题型分析","VB":"📚 进阶高频词 76-80"},"Thu":{"E1":"📖 Cloze 6 第 21","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W48 准备"},"Sat":{"AM":"🔬 顶校真题(限时)+ 错题","PM":"📖 英语真题 1(完整 P1+P2)+ 老师批改"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":48,"date":"3.29-4.4","theme":"科学真题 6 + Practice Package 6","goal":null,"days":{"Mon":{"E1":"📖 Visual Text 6 第 23","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide Ch11-12","VB":"📚 进阶高频词 81-85"},"Tue":{"E1":"✏️ Grammar U22+Editing 43","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide 续","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题模式总结","VB":"📚 进阶高频词 86-90"},"Thu":{"E1":"📖 Cloze 6 第 22","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W49 准备"},"Sat":{"AM":"🔬 顶校真题(限时)+ 错题","PM":"📖 Practice Package 6 第 6 套 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":49,"date":"4.5-4.11","theme":"科学真题 7 + 英语真题 2","goal":"🎯 200 个 PSLE 高频词完成 ✅","days":{"Mon":{"E1":"📖 Visual Text 6 第 24(完成!)","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide Ch13-14","VB":"📚 进阶高频词 91-95"},"Tue":{"E1":"✏️ Grammar U23+Editing 45","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide 续","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 实验设计题专项","VB":"📚 进阶高频词 96-100"},"Thu":{"E1":"📖 Cloze 6 第 23","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W50 准备"},"Sat":{"AM":"🔬 顶校真题(限时)+ 错题","PM":"📖 英语真题 2(完整)+ 老师批改"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":50,"date":"4.12-4.18","theme":"科学真题 8 + Practice Package 6","goal":null,"days":{"Mon":{"E1":"📖 Cloze 6 复习","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 PSLE Guide 综合题型","VB":"📚 高频词复习"},"Tue":{"E1":"✏️ Grammar U24+Editing 47","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 开放题专项(关键词答题)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 8 套真题错题模式总结","VB":"📚 高频词复习"},"Thu":{"E1":"📖 Cloze 6 第 24","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W51 准备"},"Sat":{"AM":"🔬 顶校真题(限时)+ 错题","PM":"📖 Practice Package 6 第 7 套 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":51,"date":"4.19-4.25","theme":"科学真题 9 + 英语真题 3","goal":null,"days":{"Mon":{"E1":"📖 Cloze 6 复习","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 第二阶段错题本第 1 轮重做","VB":"📚 高频词复习"},"Tue":{"E1":"✏️ Grammar U25+Editing 49","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题本重做续","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题分类整理(粗心/概念/题型)","VB":"📚 高频词复习"},"Thu":{"E1":"📖 Cloze 6 第 25","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 Conquer Daily + 综合","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W52 收官准备"},"Sat":{"AM":"🔬 综合真题(限时)+ 错题","PM":"📖 英语真题 3(顶校 Prelim)+ 老师批改"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":52,"date":"4.26-5.2","theme":"🎯 第二阶段总收官 + 全科总模考","goal":"🎯🎯🎯 第二阶段全部完成 — W53 起进入冲刺阶段","days":{"Mon":{"E1":"📖 第二阶段英语错题集中复盘","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 第二阶段错题本第 2 轮","VB":"📚 高频词复习"},"Tue":{"E1":"✏️ Grammar U26+Editing 51","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题模式整理(自己讲)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"🇨🇳 华文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 第二阶段总思维导图","VB":"📚 高频词复习"},"Thu":{"E1":"📖 Cloze 6 第 26(完成!)","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 整理 P3-P6 大全图","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 听力+口试","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 难题","VB":"📋 W53 第三阶段准备"},"Sat":{"AM":"🔬 综合真题第 10 套 + 全科总模考","PM":"📖 Practice Package 6 第 8 套 + ✏️ 作文"},"Sun":{"AM":"➗ 数学 P5 模拟卷(限时)+ 错题","S2":"📖 英语作文重写 + 📓 复盘"}}},{"week":53,"date":"5.3-5.9","theme":"🎯 第三阶段启动 — 全科真题暖身","goal":"🎯 W53 启动 — 第三阶段第 1 周(暖身 + 弱项扫描)","days":{"Mon":{"E1":"📖 英语真题 P1(限时)","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 11 — Paper 1","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 英语真题 P2(限时)","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 11 — Paper 2","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文(老师批改重点)","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学错题专项","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 英语错题精修(P1+P2)","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 实验题专项 — 变量/假设/结论","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试模拟 + Listening 真题","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 数学真题 P5/P6","VB":"📋 周诊断 + W54 准备"},"Sat":{"AM":"🔬 科学真题第 12 套(限时整套)","PM":"📖 英语综合 + ✏️ 作文重写"},"Sun":{"AM":"➗ 数学错题攻坚 + 难题专项","S2":"📖 英语作文重写 + 📓 弱项清单整理"}}},{"week":54,"date":"5.10-5.16","theme":"第三阶段第 2 周 — 暖身延续","goal":"🎯 W54 — 弱项已锁定,开始针对性攻关","days":{"Mon":{"E1":"📖 英语真题 P1(限时)","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 13 — Paper 1","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 英语真题 P2(限时)","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 13 — Paper 2","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文(老师批改)","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 弱项章节专题","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 英语弱项专项(W53 找出来的)","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 实验题专项","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试模拟 + Listening 真题","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 数学真题 P6","VB":"📋 周诊断 + W55 准备"},"Sat":{"AM":"🔬 科学真题第 14 套(限时)","PM":"📖 英语综合 + ✏️ 作文重写"},"Sun":{"AM":"➗ 数学错题 + 难题","S2":"📖 弱项专题攻坚(英/科)"}}},{"week":55,"date":"5.17-5.23","theme":"弱项专题攻关(科学薄弱章节)","goal":"🎯 W55 — 弱项攻关周(不做新进度,只补漏)","days":{"Mon":{"E1":"📖 弱项题型 — Comp OE 专项","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 弱项章节 1 重学(MC P6)","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 弱项题型 — Cloze 专项","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 弱项章节 1 真题题型","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文(主题重训)","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 弱项章节 2 重学","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 弱项题型 — Editing 专项","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 弱项章节 2 真题题型","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试模拟 + Listening","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 数学难题专项","VB":"📋 周诊断 + W56 准备"},"Sat":{"AM":"🔬 弱项章节综合卷(自配)","PM":"📖 英语综合 + ✏️ 作文重写"},"Sun":{"AM":"➗ 数学错题第 1 轮全本回看","S2":"📖 错题第 1 轮回看 + 📓 复盘"}}},{"week":56,"date":"5.24-5.30","theme":"弱项专题攻关 + 第 1 次月度模考","goal":"🎯 W56 — 第 1 次月度模考,5 月收官","days":{"Mon":{"E1":"📖 弱项题型 — Comp OE 第 2 轮","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 弱项章节 3 重学","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 弱项题型 — Cloze 第 2 轮","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 弱项章节 3 真题","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文(P6 难度)","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 弱项错题专项","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 弱项题型 — Editing 第 2 轮","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 实验题难度升级","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试 + Listening 模拟","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 数学错题攻坚","VB":"📋 周诊断 + 月度模考准备"},"Sat":{"AM":"🎯 月度模考 — 科学整套(限时)","PM":"🎯 月度模考 — 英语 P1+P2"},"Sun":{"AM":"🎯 月度模考 — 数学(浓缩)","S2":"📓 月度模考分析(找差距 + 调整下月计划)"}}},{"week":57,"date":"5.31-6.6","theme":"6 月启动 — 模考强度提升","goal":"🎯 W57 — 6 月启动,模考强度上来","days":{"Mon":{"E1":"📖 英语真题 6 P1","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 15 — Paper 1","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 英语真题 6 P2","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 15 — Paper 2","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题专项","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 英语错题 + Comprehension OE","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 实验题难题","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试 + Listening 真题","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 数学真题 5","VB":"📋 周诊断 + W58 准备"},"Sat":{"AM":"🔬 科学真题第 16 套(限时)","PM":"📖 英语综合 + ✏️ 作文重写"},"Sun":{"AM":"➗ 数学难题 + 错题","S2":"📖 作文重写 + 📓 复盘"}}},{"week":58,"date":"6.7-6.13","theme":"第 2 次全科模考","goal":"🎯 W58 — 第 2 次全科模考","days":{"Mon":{"E1":"📖 英语真题 7 P1","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 17 — Paper 1","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 英语真题 7 P2","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 17 — Paper 2","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题 + 实验题","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 英语错题 + 题型专项","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 实验题专项","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试 + Listening","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 数学难题","VB":"📋 模考准备"},"Sat":{"AM":"🎯 全科模考 — 科学整套(限时)","PM":"🎯 全科模考 — 英语 P1+P2"},"Sun":{"AM":"🎯 全科模考 — 数学整套","S2":"📓 模考分析 + 错题归档"}}},{"week":59,"date":"6.14-6.20","theme":"真题冲刺 + 错题专项","goal":"🎯 W59 — 近 3 年真题精修开始","days":{"Mon":{"E1":"📖 英语真题 8 P1","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 18 — Paper 1","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 英语真题 8 P2","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 18 — Paper 2","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文(2024 题型)","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题第 2 轮全本","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 英语错题第 2 轮","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 实验题精讲","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试 + Listening","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 数学真题 7","VB":"📋 周诊断 + W60 准备"},"Sat":{"AM":"🔬 科学真题第 19 套(限时)","PM":"📖 英语综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学错题 + 难题","S2":"📖 作文重写 + 📓 复盘"}}},{"week":60,"date":"6.21-6.27","theme":"6 月收官 + 第 3 次月度模考","goal":"🎯 W60 — 6 月收官,第 3 次月度模考","days":{"Mon":{"E1":"📖 英语真题 9 P1","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 20 — Paper 1","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 英语真题 9 P2","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 20 — Paper 2","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文 + 自评","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题第 2 轮","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 英语错题第 2 轮","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 实验题专项","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试 + Listening","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 数学难题","VB":"📋 月度模考准备"},"Sat":{"AM":"🎯 月度模考 — 科学整套","PM":"🎯 月度模考 — 英语 P1+P2"},"Sun":{"AM":"🎯 月度模考 — 数学 + 华文","S2":"📓 6 月总结 + 7 月计划"}}},{"week":61,"date":"6.28-7.4","theme":"7 月启动 — 限时刷题","goal":"🎯 W61 — 7 月启动,严格 PSLE 时间训练","days":{"Mon":{"E1":"📖 英语真题 10 P1(8:30 限时)","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 21 P1(8:30 限时)","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 英语真题 10 P2(8:30 限时)","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 21 P2","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文(50min 限时)","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题精讲","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 英语错题精修","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 实验题难题","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试 + Listening 限时","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 数学真题 9","VB":"📋 周诊断 + W62 准备"},"Sat":{"AM":"🔬 科学真题第 22 套(完全模拟 PSLE 时间)","PM":"📖 英语综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学难题 + 错题","S2":"📖 作文重写 + 📓 复盘"}}},{"week":62,"date":"7.5-7.11","theme":"限时刷题第 2 周","goal":"🎯 W62 — 错题第 3 轮启动","days":{"Mon":{"E1":"📖 英语真题 11 P1(限时)","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 23 P1","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 英语真题 11 P2(限时)","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 23 P2","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文 + 老师改","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题第 3 轮","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 英语错题第 3 轮","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 实验题精讲","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试 + Listening","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 数学真题 10","VB":"📋 周诊断 + W63 准备"},"Sat":{"AM":"🔬 科学真题第 24 套(限时)","PM":"📖 英语综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学错题第 3 轮","S2":"📖 作文重写 + 📓 复盘"}}},{"week":63,"date":"7.12-7.18","theme":"倒数 4 周 — 近 3 年真题精选","goal":"🎯 W63 — 倒数 4 周,精选近 3 年","days":{"Mon":{"E1":"📖 英语真题 12 P1","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 25 P1","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 英语真题 12 P2","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 25 P2","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文(2024 风格)","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题精讲","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 英语错题精修","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 实验题专项","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试 + Listening","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 数学真题 11","VB":"📋 周诊断 + W64 准备"},"Sat":{"AM":"🔬 科学真题第 26 套(整套连做)","PM":"📖 英语综合 + ✏️ 作文"},"Sun":{"AM":"➗ 数学错题精修","S2":"📖 作文重写 + 📓 复盘"}}},{"week":64,"date":"7.19-7.25","theme":"倒数 3 周 — 第 4 次月度模考","goal":"🎯 W64 — 7 月收官 + 月度模考","days":{"Mon":{"E1":"📖 英语真题 13 P1","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 27 P1","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 英语真题 13 P2","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 27 P2","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 实验题最后一刷","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 英语错题精修","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题最后一刷","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试 + Listening","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"➗ 数学难题","VB":"📋 月度模考准备"},"Sat":{"AM":"🎯 月度模考 — 科学(整套限时)","PM":"🎯 月度模考 — 英语 P1+P2"},"Sun":{"AM":"🎯 月度模考 — 数学 + 华文","S2":"📓 7 月总结 + 8 月调整方案"}}},{"week":65,"date":"7.26-8.1","theme":"🎯 第三阶段最后完整模考(7.31 收题)","goal":"🎯🎯🎯 W65 — 第三阶段全部完成!8 月起转入考前调整","days":{"Mon":{"E1":"📖 英语真题 15 P1(整套连做)","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 29 P1","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 英语真题 15 P2(整套连做)","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 科学真题 29 P2","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 真题作文 + 老师批改","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题最后总览","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 英语整体复盘","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 知识点最后总览(思维导图)","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🎯 7.31 最后真题 — 英语","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"🎯 7.31 最后真题 — 科学","VB":"📋 第三阶段总结"},"Sat":{"AM":"🎯 数学最后真题 + 华文最后真题","PM":"📖 英语错题第 4 轮启动"},"Sun":{"AM":"📓 第三阶段总复盘 — 整体诊断","S2":"📓 8 月调整方案确定 + 复盘"}}},{"week":66,"date":"8.2-8.8","theme":"🎯 8 月第 1 周 — 口试密集训练启动","goal":"🎯 W66 — 口试密集训练第 1 周(8.12-13 口试考试倒数 1 周)","days":{"Mon":{"E1":"🗣️ 英语口试 — Reading + Stimulus 朗读","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🗣️ 英语口试 — Conversation 对答(老师纠音)","VB":"📚 错题词汇本回看"},"Tue":{"E1":"🗣️ 英语口试 — Stimulus 描述","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🗣️ 华文口试 — 朗读 + 看图","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 英语作文(短改 + 老师反馈)","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🔬 错题本第 1 轮回看 — 章节 1-3","VB":"📚 错题词汇本回看"},"Thu":{"E1":"🗣️ 英语口试 — 完整流程模拟(20min)","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🗣️ 华文口试 — 对话练习","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🗣️ 口试录音回听 + 自评","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"🎧 Listening PSLE 真题精听","VB":"📋 周诊断 + W67 准备"},"Sat":{"AM":"🔬 科学真题 1 套(保持手感)","PM":"📖 英语综合(短)+ 错题","S2":"🌳 自由家庭活动"},"Sun":{"AM":"📓 错题本第 1 轮 — 章节 4-6","S2":"📖 英语作文 + 📓 复盘"}}},{"week":67,"date":"8.9-8.15","theme":"🎯 8 月第 2 周 — 8.12-13 口试考试","goal":"🎯🎯 W67 — 8.12-13 PSLE 口试考试!","days":{"Mon":{"E1":"🗣️ 英语口试完整模拟 1","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🗣️ 华文口试完整模拟 1","VB":"📚 救场短语再背"},"Tue":{"E1":"🗣️ 英语口试完整模拟 2 + 老师最后纠音","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🗣️ 华文口试完整模拟 2 + 老师最后纠音","VB":"🇨🇳 华文阅读"},"Wed":{"E1":"🌳 8.12 考前 — 早睡 + 不做难题","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🌳 早睡(只复习救场短语 5min)","VB":"🛌 22:00 早 30min 入睡"},"Thu":{"E1":"🎯 8.12 PSLE 口试考试日(英)","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🎯 8.13 PSLE 口试考试日(华文)","VB":"🌳 考完休息"},"Fri":{"E1":"🌳 口试后放松 + 早睡补眠","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"🎧 Listening 真题(轻)","VB":"📋 周诊断(轻)"},"Sat":{"AM":"🔬 科学真题 1 套(整套)","PM":"📖 英语综合 + 错题","S2":"🌳 自由家庭活动"},"Sun":{"AM":"📓 错题本第 1 轮 — 章节 7-10","S2":"📖 英语作文 + 📓 复盘"}}},{"week":68,"date":"8.16-8.22","theme":"8 月第 3 周 — 听力专项 + 错题第 1 轮","goal":"🎯 W68 — 听力升级 + 错题第 1 轮收尾","days":{"Mon":{"E1":"🎧 英语听力真题 1(限时)+ 答题校对","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题本 — 科学章节 1-5 第 1 轮","VB":"📚 错题词汇本回看"},"Tue":{"E1":"🎧 英语听力真题 2(限时)+ 错题","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题本 — 科学章节 6-10 第 1 轮","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 英语作文(短)","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题本 — 英语 Comp/Cloze 第 1 轮","VB":"📚 错题词汇本回看"},"Thu":{"E1":"🎧 英语听力真题 3 + 错题","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题本 — 英语 Editing/Grammar 第 1 轮","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🎧 听力周诊断 5 题","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题本 — 数学第 1 轮","VB":"📋 周诊断 + W69 准备"},"Sat":{"AM":"🔬 科学真题 1 套(限时整套)","PM":"🎧 Listening 真题 1 套(完整)","S2":"🌳 自由家庭活动"},"Sun":{"AM":"📓 错题本第 1 轮总览(找出\"还在错\"的题)","S2":"📖 英语作文 + 📓 复盘"}}},{"week":69,"date":"8.23-8.29","theme":"8 月第 4 周 — 听力 + 错题第 2 轮","goal":"🎯 W69 — 错题第 2 轮 + 听力稳定","days":{"Mon":{"E1":"🎧 英语听力真题 4(限时)","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 2 轮 — 科学反复错的题","VB":"📚 错题词汇本回看"},"Tue":{"E1":"🎧 英语听力真题 5","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 2 轮 — 英语反复错的题","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 英语作文(短改)","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 2 轮 — 数学难题集","VB":"📚 错题词汇本回看"},"Thu":{"E1":"🎧 英语听力真题 6 + 错题","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 2 轮 — 实验题专项","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🎧 听力周诊断","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 2 轮 — 华文","VB":"📋 周诊断 + W70 准备"},"Sat":{"AM":"🔬 科学真题 1 套(限时)","PM":"📖 英语真题 P1+P2(限时)","S2":"🌳 自由家庭活动"},"Sun":{"AM":"📓 错题第 2 轮收尾(标\"还在错\"的题入第 3 轮)","S2":"📖 英语作文 + 📓 复盘"}}},{"week":70,"date":"8.30-9.5","theme":"🎯 9 月第 1 周 — 听力 + 9.15 听力考试准备","goal":"🎯 W70 — 9.15 听力考试倒数 2 周","days":{"Mon":{"E1":"🎧 听力真题 7(限时模拟考试)","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 3 轮 — 核心错题集","VB":"📚 错题词汇本回看"},"Tue":{"E1":"🎧 听力真题 8(限时)","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 3 轮 — 科学/英语","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 英语作文(短)","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 3 轮 — 数学/华文","VB":"📚 错题词汇本回看"},"Thu":{"E1":"🎧 听力真题 9 + 错题精修","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 3 轮 — 实验题最后冲刺","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🎧 听力综合诊断 + 救场策略复习","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 3 轮收尾","VB":"📋 周诊断 + W71 准备"},"Sat":{"AM":"🔬 近 3 年科学真题 1 套(限时)","PM":"📖 近 3 年英语真题 P1+P2","S2":"🌳 自由家庭活动"},"Sun":{"AM":"📓 错题第 3 轮总览","S2":"📖 英语作文 + 📓 复盘 + 心理建设"}}},{"week":71,"date":"9.6-9.12","theme":"9 月第 2 周 — 真题日刷 + 听力冲刺","goal":"🎯🎯 W71 — 9.15 听力考试日!","days":{"Mon":{"E1":"📖 真题日刷 — 英语 P1","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 4 轮 — 高频错题","VB":"📚 错题词汇本回看"},"Tue":{"E1":"📖 真题日刷 — 英语 P2","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🎧 听力真题 10(限时)","VB":"🇨🇳 华文阅读 / 词汇"},"Wed":{"E1":"✏️ 英语作文(短)","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📖 真题日刷 — 科学 P1","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 真题日刷 — 科学 P2","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🎧 听力真题 11 + 救场策略","VB":"🇨🇳 华文阅读 / 词汇"},"Fri":{"E1":"🎧 9.12 听力最后冲刺 + 心理建设","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 4 轮 — 关键章节","VB":"📋 9.15 考前准备"},"Sat":{"AM":"📖 真题保持(短)— 不超 1h","PM":"🌳 9.13-14 早睡 + 不做难题","S2":"🌳 自由家庭活动"},"Sun":{"AM":"🌳 9.14 考前一天 — 不学习","S2":"🛌 9.14 早 30min 入睡(22:00 前)"}}},{"week":72,"date":"9.13-9.19","theme":"9 月第 3 周 — 9.15 听力考试 + 笔试冲刺","goal":"🎯 W72 — 听力考完 + 笔试倒数 9 天","days":{"Mon":{"E1":"🎯 9.15 PSLE 听力考试日(早)","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🌳 听力考完调整 + 轻松活动","VB":"🌳 早睡"},"Tue":{"E1":"📖 真题日刷 — 英语 P1+P2","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 4 轮 — 英语","VB":"📚 错题词汇本回看"},"Wed":{"E1":"📖 真题日刷 — 科学 P1+P2","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 4 轮 — 科学","VB":"📚 错题词汇本回看"},"Thu":{"E1":"📖 真题日刷 — 数学整套","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 4 轮 — 数学","VB":"🇨🇳 华文阅读"},"Fri":{"E1":"📖 真题日刷 — 华文整套","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 错题第 4 轮 — 华文","VB":"📋 周诊断 + W73 准备"},"Sat":{"AM":"📖 综合保持(短)— 不超 2h","PM":"📓 错题最后回看 + 心态调整","S2":"🌳 自由家庭活动"},"Sun":{"AM":"📓 9.19 错题最后总览","S2":"📓 笔试倒数 1 周计划 + 早睡"}}},{"week":73,"date":"9.20-9.26","theme":"🎯🎯🎯 PSLE 笔试周(9.24-30)","goal":"🎯🎯🎯 W73 — PSLE 笔试周!17 个月长跑收官","days":{"Mon":{"E1":"📖 9.20 — 英语真题 P1+P2(轻)","OR":"🗣️ 全真口试模拟","VC":"📚 错题词汇本回看","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 英语错题最后总览","VB":"🛌 早睡 21:30 入睡"},"Tue":{"E1":"📖 9.21 — 科学真题(轻)","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 科学错题最后总览","VB":"🛌 早睡"},"Wed":{"E1":"📖 9.22 — 数学错题精读","OR":"🗣️ 全真口试模拟","VC":"📚 旧词复测","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"📓 数学公式 + 高频错题","VB":"🛌 早睡"},"Thu":{"E1":"🌳 9.23 考前一天 — 不学习","OR":"🗣️ 全真口试模拟","VC":"📚 DeepSeek 词汇复习(错题词 1-3-7-21 回顾)","LS":"🎧 PSLE 真题听力 1 段精听","ED":"✏️ Editing 错题回看 + 真题","S2":"🌳 文具/证件最后检查 + 看场地","VB":"🛌 9.23 早睡(20:30 前入睡)"},"Fri":{"E1":"🎯 9.24 PSLE 第 1 天:科目 1","OR":"🗣️ 录音回听 + 自评","VC":"📚 周诊断词汇","LS":"🎧 周诊断听力 5 题","ED":"✏️ Editing 错题回看 + 真题","S2":"🌳 考完休息,不讨论难题","VB":"🛌 早睡准备明天"},"Sat":{"AM":"🎯 9.25 PSLE 第 2 天:科目 2","PM":"🎯 9.26 PSLE 第 3 天:科目 3","S2":"🌳 考完轻松"},"Sun":{"AM":"🎯 9.27 PSLE 第 4 天:科目 4(收官)","S2":"🎉 PSLE 全部考完!"}}}];

// ============= v18.22: 周末新作息注入 (W1-W26 替换 Sat/Sun) =============
// 删除原 AM/PM/S2, 用 7+7 个固定时段替换 (移除外课: 美林课/恒瑞课/游泳)
(function _injectWeekendRoutine() {
  const SAT = {
    WSE: '✏️ 周四 1对1 课后作业 / 美玲一周错题集 (建议周五晚优先做)',
    WSF: '✏️ 美林作业 (上课前巩固)',
    WSS: '🔬 P5 科学练习册',
    WSL: '🎧 听力 15min — CNA938 / okto kids (4 步精听法)',
    WSM: '🎯 P6 数学 paper 2 (限时 50min)',
    WSR: '📝 美林课要点回顾 30min (趁记忆热复习当天所学)',
    WSV: '🪞 本周复盘 + 家庭聊天 (回顾本周学到 / 弱项)'
  };
  const SUN = {
    WUH: '✏️ 恒瑞作业 (课后立刻做, 巩固当天所学)',
    WUR: '📖 阅读理解 + Cloze 1 篇',
    WUM: '🎯 数学 PSLE paper 1 (限时 50min)',
    WUS: '🔬 科学练习册',
    WUE1: '✏️ 美玲周五作业 part 1 (1h, 主体作业)',
    WUE2: '✏️ 美玲周五作业 part 2 + Cloze 收尾 (45min)',
    WUP: '🪞 下周计划 + 整理书包 (写明日 1 个具体目标)'
  };
  for (let i = 0; i < 26 && i < WEEK_TASKS.length; i++) {
    if (WEEK_TASKS[i] && WEEK_TASKS[i].days) {
      WEEK_TASKS[i].days.Sat = Object.assign({}, SAT);
      WEEK_TASKS[i].days.Sun = Object.assign({}, SUN);
    }
  }
})();

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

    // 已完成的关键里程碑(v5:9 个 — 第一阶段 + 二三阶段 + PSLE 三大考)
    milestones: { W14: false, W20: false, W26: false, W42: false, W52: false, W65: false, W68: false, W72: false, W73: false },

    // 沮丧表情持续时间(扣分后 24h)
    sadUntil: null,

    // 全局加分日志
    logs: [],

    // 兑换记录
    exchanges: [],

    // 各科作业分数 (v4):scores['week_day_slot'] = { score, max, note, savedAt }
    scores: {},

    // v5: 当前激活的皮肤 id(default | scholar | scientist | explorer | hero | master)
    activeSkin: 'default',

    // v16: 家长密码 — null = 首次使用未设置(addPoints/deleteLog 触发设置流程)
    adminPassword: null,

    // v16.8: 已解锁但用户主动隐藏的装备 id 列表(默认全显示;点击装备图鉴可切换)
    equipmentDisabled: [],

    // v16.10: 防沉迷 — 每日听力时间记录 { 'YYYY-MM-DD': { seconds: int } }
    // 每日上限到了自动关闭 modal,当天不能再开
    listeningUsage: {},

    // v17.1: Daily Streak — Kahneman 损失厌恶(失去 100 块痛 > 得 100 块爽 2:1)
    dailyStreak: {
      days: 0,             // 当前连击天数
      lastDate: null,      // 'YYYY-MM-DD' 最近成功打卡日
      bestEver: 0,         // 历史最高(墓碑)
      freezeTokens: 0,     // 🧊 救命券(每 14 天 +1, 上限 3, 自动消耗保 1 天)
      brokenAt: null       // 上次断点时间戳(用于 24h 灰烬效果)
    },

    // v17.5 Phase 2: 神秘宝箱 — Skinner 变量奖励(每 10 个 slot +1 box)
    mysteryBoxes: {
      available: 0,                // 可开数量
      opened: 0,                   // 已开总数
      totalSlotsAtLastEarn: 0,     // 上次得 box 时的累计完成 slot 数(用于增量计算)
      history: []                  // 最近 10 次开盒 [{tier, points, wow, equipId, ts}]
    },

    // v17.5 Phase 2: 反直觉谜题答题记录 — { weekN: { answer, correct, ts } }
    thinkPuzzleAnswers: {},

    // v17.7 Phase 3: 每日特别任务 — { dateKey: { questId, progress, target, completed, claimedAt } }
    dailyQuests: {},

    // v18 Phase 5.1 (v18.4: 改仓鼠主题): 🐹 宠物 (跟连续打卡联动进化, IKEA effect 自定义名)
    pet: {
      name: '球球',         // 默认名(可改)
      formIdx: 0,
      spawnedAt: Date.now(),
      feedCount: 0,
      happiness: 100,
      lastFedDate: null
    },

    // v18 Phase 5.1: 🏆 隐藏成就 — { unlocked: [id], unlockedAt: { id: ts } }
    achievements: { unlocked: [], unlockedAt: {} },

    // v18 Phase 5.1: 🎁 每日登录抽奖
    dailyDraws: { fragments: 0, consecutive: 0, lastDrawDate: null },

    // v18 Phase 5.3: 🔁 间隔重复 — { 'wow:eng_5': { firstSeen, lastReviewed, intervalDays, correctStreak } }
    spacedRepetition: { reviews: {} },

    // v18 Phase 5.4: 🔊 音效开关
    soundEnabled: true,

    // v18 misc tracking (用于成就)
    wowSeenCount: 0,
    vocabPerfectRuns: 0,
    adminPageOpens: 0,
    marathonStreak: 0,
    rareBoxesCount: 0,
    // v18.2 数据可视化用
    vocabGameRuns: 0,
    mathGameRuns: 0,
    editingGameRuns: 0,
    listenGameRuns: 0,
    // v18.25: 4 mini-game 5 级难度自适应 (1=入门 P3-4, 5=超 PSLE)
    gameStats: {
      // v18.37: 全部 game 起点 = P5 实战 PSLE 准 (难度 3, ★★★)
      vocab:   { difficulty: 3, recent: [] },
      math:    { difficulty: 3, recent: [] },
      editing: { difficulty: 3, recent: [] },
      listen:  { difficulty: 3, recent: [] },
      unit:    { difficulty: 3, recent: [] },
      grammar: { difficulty: 3, recent: [] },
      cloze:   { difficulty: 3, recent: [] },
      scilab:  { difficulty: 3, recent: [] }
    },
    // v18.27: 闹铃
    alarmsEnabled: true,
    alarmShownToday: { date: null, shown: [] },
    // v18.40: 题库进度 — { 'cn_friendship': {done: true, score: 4, max: 4, lastDate: '2026-...'} }
    questionBankProgress: {},
    // v18.41: 知识树探索状态 — { 'sci_diversity': {date: 'YYYY-MM-DD'} }
    knowledgeExplored: {},
    // v18.45: 知识树练习 ⭐ 进度 — { 'sci_diversity': {stars: 0-3, bestScore: 3, attempts: 5} }
    knowledgeStars: {},
    // v18.59: 错题本
    wrongAnswers: [],
    // v18.60: 双龙觉醒状态 — null 或 { unlockedAt, totalPointsAtUnlock, ceremonyDone }
    dragonsUnlocked: { silver: null, gold: null },
    // v18.60: 当前主页宠物类型 — 'hamster' (默认) 或 'gold_dragon' (拿金龙后可切)
    activePetType: 'hamster'
  };
}

// ============= v18.60: 双龙 RPG 系统 =============
// 拿到银龙 mini-game +10%, 金龙 +20% (累计取最高)
function getDragonBuff(state) {
  if (state.dragonsUnlocked && state.dragonsUnlocked.gold) return 1.20;
  if (state.dragonsUnlocked && state.dragonsUnlocked.silver) return 1.10;
  return 1.0;
}
// 检测是否新解锁双龙. 返回新解锁的类型 ('silver'|'gold'|null) 用于触发觉醒仪式
function checkDragonUnlock(state) {
  if (!state.dragonsUnlocked) state.dragonsUnlocked = { silver: null, gold: null };
  const pts = state.totalPoints || 0;
  const ks = state.knowledgeStars || {};
  const totalStars = Object.values(ks).reduce((s, e) => s + (e.stars || 0), 0);
  let newlyUnlocked = null;
  // 银龙: 10000 分
  if (!state.dragonsUnlocked.silver && pts >= 10000) {
    state.dragonsUnlocked.silver = {
      unlockedAt: new Date().toISOString(),
      totalPointsAtUnlock: pts,
      ceremonyDone: false
    };
    newlyUnlocked = 'silver';
  }
  // 金龙: 105 ⭐ + 10000 分 (双门槛)
  if (!state.dragonsUnlocked.gold && totalStars >= 105 && pts >= 10000) {
    state.dragonsUnlocked.gold = {
      unlockedAt: new Date().toISOString(),
      totalPointsAtUnlock: pts,
      totalStarsAtUnlock: totalStars,
      ceremonyDone: false
    };
    newlyUnlocked = 'gold';  // 金龙优先 (覆盖 silver 标记)
  }
  return newlyUnlocked;
}
window.getDragonBuff = getDragonBuff;
window.checkDragonUnlock = checkDragonUnlock;

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
  // v5: 第二阶段 + 第三阶段里程碑
  if (weekNum === 42) {
    items.push({ id: 'w42', label: '🎖️ W42 P6 月模考 3 达标',
      desc: 'P6 系统学完阶段性测试(由家长确认)', points: 60, type: 'special', adminOnly: true });
  }
  if (weekNum === 52) {
    items.push({ id: 'w52', label: '🏵️ W52 第二阶段总收官',
      desc: '全科总模考 — 英 80+/科 90+/数 90+/华 88+ (理想 AL 5-6)', points: 120, type: 'special', adminOnly: true });
  }
  if (weekNum === 65) {
    items.push({ id: 'w65', label: '🎗️ W65 第三阶段最后完整模考',
      desc: '7.31 收题前最后一次完整模考', points: 80, type: 'special', adminOnly: true });
  }
  // v5: PSLE 三大考(W68 口试 / W72 听力 / W73 笔试)
  if (weekNum === 68) {
    items.push({ id: 'w68', label: '🎤 W68 PSLE 口试 (8.12-13)',
      desc: '英语 + 华文口试,达标后家长确认', points: 60, type: 'special', adminOnly: true });
  }
  if (weekNum === 72) {
    items.push({ id: 'w72', label: '🎵 W72 PSLE 听力 (9.15)',
      desc: '听力理解考试,达标后家长确认', points: 60, type: 'special', adminOnly: true });
  }
  if (weekNum === 73) {
    items.push({ id: 'w73', label: '📜 W73 PSLE 笔试 (9.24-30) 🎯🎯',
      desc: '4 科笔试。完成 = 终极成就', points: 200, type: 'special', adminOnly: true });
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

// ============= v17.6: 名师秘诀多科分池 (按日轮换 — 英语 3 天/科学 2 天/数学 1 天/华文 1 天) =============
const ENGLISH_MASTER_TIPS = [
  { subject:'📝 PSLE 英语作文', title:'4 段结构 + 必含 4 元素',
    content:'4 段结构: ① 开场(描景/动作)② 矛盾发生 ③ 高潮 ④ 反思. 每篇必含: 对话/心理描写/感官描写(声音/气味/视觉)/全文过去时. 写在 150-180 词. PSLE 作文 40 分, 缺任一元素扣 5 分。',
    qs: [
      { q: 'In PSLE narrative writing, which element should NOT appear in the introduction paragraph?', opts: ['A vivid scene description', 'The climax of the story', 'A shocking statement', 'A question to engage readers'], ans: 1, exp: '开场段建立场景/人物，高潮应在第三段' },
      { q: 'Which of the following is a sensory detail in a PSLE story?', opts: ['He was happy.', 'She ran quickly.', 'The sharp smell of smoke filled the air.', 'They went to the park.'], ans: 2, exp: 'smell/sound/sight/touch = 感官细节，"happy"是直接告知(telling)而非展示(showing)' }
    ] },
  { subject:'📝 PSLE 英语作文', title:'高级词每篇 3 个加 5-10 分',
    content:'crestfallen(沮丧)/ jubilant(欢欣)/ dawned upon me(突然意识到)/ ecstatic(狂喜)/ apprehensive(忧心). 每篇用 3 个就比平均高 5-10 分。考前背 30 个高级词, 作文 25→35 分。',
    qs: [
      { q: 'Which word BEST replaces "very happy" in a high-scoring PSLE essay?', opts: ['glad', 'cheerful', 'elated', 'pleased'], ans: 2, exp: 'elated = 欣喜若狂，是最高强度的积极情绪词' },
      { q: 'The girl was ___ when she heard the bad news.', opts: ['unhappy', 'crestfallen', 'sad', 'upset'], ans: 1, exp: 'crestfallen = 垂头丧气，比 sad/unhappy 高级得多' }
    ] },
  { subject:'📝 PSLE 作文开头', title:'5 类开头模板',
    content:'描景(That sunny morning, the playground was bustling)/ 直接对话("Hurry up!" Mom shouted)/ 反问(Have you ever felt...)/ 感觉(My heart pounded)/ 倒叙(Looking back, I still remember). 5 类背一种 = 永远不卡第 1 句。',
    qs: [
      { q: '"CRACK! The ball shattered the window." — What type of story opening is this?', opts: ['Direct speech', 'Descriptive scene', 'Sound effect/action opening', 'Rhetorical question'], ans: 2, exp: '拟声词 + 动作 = 效果开头，立刻抓住读者注意' },
      { q: 'Which opening type is LEAST likely to score well in PSLE?', opts: ['"Have you ever felt truly alone?"', '"The sun blazed down on the crowded market."', '"One day, I went to school."', '"Help!" cried the boy.'], ans: 2, exp: '"One day" + 平铺直述 = 最低分开头，缺乏吸引力' }
    ] },
  { subject:'📖 Comprehension OE', title:'答案 90% 在原文找',
    content:'PSLE Comp OE 答案直接在文章里, 找到关键词附近的句子, 摘下来稍改即可。别"自己想"原创答案 — 评卷只看你有没有抓到原文核心词。3 分题答 3 个点, 缺 1 点扣 1 分。',
    qs: [
      { q: 'In PSLE Comprehension OE, what should you do when answering a 3-mark question?', opts: ['Write one long sentence', 'Use your own creative ideas', 'Find and include 3 key points from the passage', 'Summarise the whole passage'], ans: 2, exp: '3分题 = 3个点，每点1分，直接摘原文核心词' },
      { q: 'The BEST strategy for PSLE Comprehension OE answers is to ___', opts: ['Write your own opinions freely', 'Locate and quote key words from the passage', 'Answer from memory without re-reading', 'Write as much as possible'], ans: 1, exp: '评卷员只看原文核心词是否出现，不给原创观点分数' }
    ] },
  { subject:'📖 Comprehension', title:'定位法 4 步骤',
    content:'① 先看题不看文 ② 题目划关键词 ③ 文章里搜关键词附近段落 ④ 摘原文核心词答。这样 1 篇 800 字 Comp 能 5 min 答完, 比"先读全文"快 3 倍。',
    qs: [
      { q: 'When using the LOCATE method for comprehension, what is Step 2?', opts: ['Read the whole passage carefully', 'Underline keywords in the QUESTION', 'Search for keywords in the text', 'Write your answer'], ans: 1, exp: '4步: 先看题→划题中关键词→文章搜词→摘答案' },
      { q: 'A question asks "Why was Tom nervous?" — what keyword should you search for in the passage?', opts: ['"Tom"', '"nervous"', '"Why"', '"was"'], ans: 1, exp: '"nervous" 是情感关键词，在文章里找这个词附近的原因句' }
    ] },
  { subject:'✍️ Cloze (一空一词)', title:'70% 是介词或冠词',
    content:'PSLE Cloze 最难的空多是: in/on/at/of/for/with(介词)和 a/an/the(冠词)。这两类没规律, 全靠搭配感 — 读多遇多次自然会。每次错都查同义词 + 词性 + 搭配, 入词汇错题本。',
    qs: [
      { q: 'She is ___ best student in the class.', opts: ['a', 'an', 'the', '/'], ans: 2, exp: '"best" 前需 the 定冠词，表示唯一最好的' },
      { q: 'He is afraid ___ heights.', opts: ['of', 'from', 'at', 'with'], ans: 0, exp: 'afraid of = 固定搭配，怕某事物' }
    ] },
  { subject:'✍️ Cloze 介词搭配', title:'动词 + 介词 50 高频组合',
    content:'look at(看)/ look after(照顾)/ look for(找)/ look up(查字典)/ look out(小心)/ depend on(取决于)/ result in(导致)/ result from(由...引起)/ believe in(信任)/ believe sb(信某人). 这 50 组占 Cloze 50% 答案。',
    qs: [
      { q: 'She is looking ___ her lost phone.', opts: ['at', 'after', 'for', 'out'], ans: 2, exp: 'look for = 寻找；look after = 照顾；look at = 看' },
      { q: 'The heavy rain resulted ___ the cancellation of the event.', opts: ['from', 'in', 'at', 'with'], ans: 1, exp: 'result in = 导致（原因→结果）；result from = 由...引起（结果←原因）' },
      { q: 'I depend ___ my parents for financial support.', opts: ['at', 'in', 'on', 'from'], ans: 2, exp: 'depend on = 依赖，固定搭配' }
    ] },
  { subject:'✏️ Editing', title:'5 类错占 95% 题目',
    content:'主谓一致 / 时态 / 拼写 / 介词 / 冠词 — PSLE Editing 95% 错都在这 5 类。建一个 Editing 错题本按这 5 类分类记, 1 个月内错率减半。每天写 5 段 Editing, 26 周 100 段。',
    qs: [
      { q: 'Find the error: "Yesterday, she go to the market to buy vegetables."', opts: ['she → her', 'go → went', 'to buy → buying', 'the market → a market'], ans: 1, exp: 'yesterday + 过去时 → go 改为 went（时态错）' },
      { q: 'Find the error: "He has three sister and two brother."', opts: ['has → have', 'sister → sisters', 'and → but', 'two → second'], ans: 1, exp: 'three + 可数名词 → sister 改 sisters，brother 改 brothers（复数错）' }
    ] },
  { subject:'✏️ Editing 时态错', title:'时间词 → 时态匹配',
    content:'yesterday/last week → 过去式(was/went). tomorrow/next week → 将来时(will go). now/currently → 现在进行(is going). 每段先扫时间词, 锁定时态, 错率减 80%。',
    qs: [
      { q: '"Last Monday, I am very tired after school." — what is the error?', opts: ['Last → This', 'am → was', 'very → too', 'after → before'], ans: 1, exp: 'Last Monday 是过去时间词 → 动词用 was，不是 am' },
      { q: 'Which time expression signals FUTURE tense?', opts: ['yesterday', 'last week', 'currently', 'next Monday'], ans: 3, exp: 'next Monday → will + 动词原形；其余是过去/现在时信号' }
    ] },
  { subject:'📚 Grammar 套路', title:'PSLE Grammar MCQ 常考点',
    content:'if/unless 看主从句关系(unless = if not). since/for 看时长(since 时间点 / for 时间段). much/many 看可数(much water / many books). too/either 看肯否(too 肯定 / either 否定)。',
    qs: [
      { q: '"___ you study hard, you will not pass." — which word fits?', opts: ['If', 'Unless', 'Although', 'Because'], ans: 1, exp: 'unless = if not，"Unless you study" = "If you do NOT study"' },
      { q: '"I have been waiting ___ 3 hours." — which word fits?', opts: ['since', 'for', 'from', 'during'], ans: 1, exp: 'for + 时间段(3 hours)；since + 时间点(3 o\'clock)' }
    ] },
  { subject:'📚 Grammar', title:'unless = if not 100% 等价',
    content:'"Unless you study, you will fail" = "If you do not study, you will fail". unless 后用肯定句, 因为 unless 本身含否定。 PSLE 高频混淆, 1 题 2-3 分。',
    qs: [
      { q: '"Unless it rains, we will play outside." = ___', opts: ['If it rains, we will play outside.', 'If it does not rain, we will play outside.', 'Although it rains, we will play outside.', 'Because it rains, we will play outside.'], ans: 1, exp: 'unless = if not，后接肯定句，整体表否定条件' },
      { q: '"Unless you apologise, she will not forgive you." — what must happen for her to forgive?', opts: ['She must apologise', 'You must NOT apologise', 'You must apologise', 'She must forgive first'], ans: 2, exp: 'unless you apologise = if you do NOT apologise → 需要你道歉才能被原谅' }
    ] },
  { subject:'🗣️ PSLE Oral', title:'Reading Aloud 3 大评分点',
    content:'语调起伏 + 句末适当停顿(0.5-1.5 秒, 逗号短/句号长)+ 重读关键词 = 流畅感觉. 平淡读完 8-10 分; 有节奏 13-15 分. 录音 + 自评 10 次, 一周提 3 分。',
    qs: [
      { q: 'In PSLE Reading Aloud, what should you do at a COMMA?', opts: ['Stop for 2 full seconds', 'Raise your voice sharply', 'Pause briefly (about 0.5 sec)', 'Lower your voice to a whisper'], ans: 2, exp: '逗号停0.5秒，句号停1-1.5秒，有节奏感才得高分' },
      { q: 'Which technique MOST improves PSLE Reading Aloud scores?', opts: ['Reading as fast as possible', 'Stressing key words with rising/falling tone', 'Reading in a flat monotone voice', 'Skipping all punctuation pauses'], ans: 1, exp: '重读关键词 + 音调起伏 = 13-15分；单调平读 = 8-10分' }
    ] },
  { subject:'🗣️ Stimulus 看图', title:'描述→联想→个人经历 3 步',
    content:'Stimulus 看图说话每点 2-3 句即可: ① 描述场景(who/what/where) ② 联想问题或感受 ③ 个人经历呼应。缺哪一步扣 1-2 分, 多说反扣分。',
    qs: [
      { q: 'In PSLE Oral Stimulus, Step 3 "personal connection" means ___', opts: ['Describing what you see in the picture', 'Making up a story about the picture', 'Relating the topic to your own experience', 'Asking the examiner a question'], ans: 2, exp: '3步: 描述→联想感受→个人经历呼应，Step 3 = 联系自身' },
      { q: 'How many sentences should each step of Stimulus description have?', opts: ['1 sentence only', '2-3 sentences per step', 'At least 5 sentences', 'As many as possible'], ans: 1, exp: '每步2-3句适中，太多反扣分，太少不够分' }
    ] },
  { subject:'🎧 PSLE Listening', title:'90% 答案在转折后',
    content:'听到 "but / however / although / on the other hand" 立刻竖耳朵 — 题目要问的内容 95% 在转折后, 不是前半句。听力题最大陷阱: 听了前半句就抢答。',
    qs: [
      { q: 'In PSLE Listening, which word signals the answer usually follows?', opts: ['and', 'but', 'then', 'first'], ans: 1, exp: 'but/however/although 是转折词，答案95%在转折后' },
      { q: 'The speaker says: "The food was delicious, HOWEVER the service was very slow." — PSLE likely asks about ___', opts: ['How delicious the food was', 'The slow service', 'The restaurant location', 'The price of the food'], ans: 1, exp: '转折后的负面信息(slow service)是PSLE考查重点' }
    ] },
  { subject:'🎧 Listening 数字陷阱', title:'fifteen vs fifty 重音不同',
    content:'fifteen [fɪfˈtiːn] 重音在后, fifty [ˈfɪfti] 重音在前。PSLE Listening 数字题常考 7 对易混: 13/30, 14/40, 15/50, 16/60, 17/70, 18/80, 19/90。听到 -teen 重音 → 1X, -ty 轻 → X0。',
    qs: [
      { q: 'The word "fifteen" has stress on which syllable?', opts: ['FIF-teen (first syllable)', 'fif-TEEN (second syllable)', 'Both equally stressed', 'Neither syllable'], ans: 1, exp: 'fif-TEEN 重音在后 = 15；FIF-ty 重音在前 = 50' },
      { q: 'You hear a number with strong stress on the FIRST syllable (e.g. SIX-ty). The number is likely ___', opts: ['16', '60', '106', '116'], ans: 1, exp: 'X-ty 重音在前 = 几十(60,70,80...)；-TEEN 重音在后 = 十几(16,17...)' }
    ] },
  { subject:'🎧 Listening 训练', title:'每天 10 min 真实英语',
    content:'CNA938 / CNA Insider 每天 10-15 min 精听: ① 不查字典先全听一遍 ② 第二遍记 3-5 个新词 ③ 第三遍跟读模仿语调。SG 口音熟悉度比 BBC 帮助大。',
    qs: [
      { q: 'For PSLE Listening preparation, which source is MOST useful?', opts: ['American Hollywood movies', 'British BBC documentaries', 'Singapore CNA English broadcasts', 'Australian TV shows'], ans: 2, exp: 'CNA938/CNA Insider = 新加坡口音，最贴近PSLE听力' },
      { q: 'In the 3-step intensive listening method, Step 2 is to ___', opts: ['Translate everything to Chinese', 'Note 3-5 new words on second listen', 'Just listen without stopping', 'Repeat every sentence immediately'], ans: 1, exp: '3步: ①全听不查词 ②第二遍记3-5新词 ③第三遍跟读模仿' }
    ] },
  { subject:'🔗 Synthesis & Transformation', title:'10 分高分项',
    content:'PSLE Paper 2 顶端 10 分: 把 2 个简单句合并成 1 个复杂句, 或换句型不变意。常考: although/because/while/since/whose/which/who. W15 起每周 1h 专项, 24 周熟练 = 稳拿 10 分。',
    qs: [
      { q: 'Combine: "Tom is rich. He is not happy." using "although" — which is correct?', opts: ['Although Tom is rich, he is not happy.', 'Tom is rich, although he is not happy.', 'Both A and B are correct.', 'Although Tom is not happy, he is rich.'], ans: 2, exp: 'although 从句可前可后，A和B都正确语法' },
      { q: '"She sings well. She dances well." — combine with "not only...but also"', opts: ['She not only sings but also dances.', 'Not only does she sing well, but she also dances well.', 'Not only she sings well but also she dances well.', 'She not only sings well but also dances.'], ans: 1, exp: 'Not only + 倒装(does she)是PSLE高分格式，选B' }
    ] },
  { subject:'📚 Vocab 词汇', title:'PSLE 200 高频词 = Comp 80% 覆盖',
    content:'PSLE 阅读题里 80% 单词来自最高频 200 词。背完这 200 个 = 任何文章读懂大意, 不卡壳。每天 5 个, W30 完 100, W52 完 200。 v14 词汇表里就是这 200 个。',
    qs: [
      { q: 'The word "reluctant" means ___', opts: ['eager and excited', 'unwilling or hesitant', 'confident and brave', 'confused and lost'], ans: 1, exp: 'reluctant = 不情愿的，不愿意做某事' },
      { q: '"The audience was ___ by the magician\'s tricks." — which word fits BEST?', opts: ['bored', 'mesmerised', 'frightened', 'confused'], ans: 1, exp: 'mesmerised = 被迷住/着迷，comp高频词，强于fascinated' }
    ] },
  { subject:'📚 学科英语词汇 500', title:'数学 200 + 科学 300',
    content:'PSLE 数学/科学题干用专业英语: perimeter/area/volume(数学)/ photosynthesis/transpiration/xylem(科学)。看不懂题干 → 数学/科学也丢分。 v16 附录 B 收的 500 词, W17 完成。',
    qs: [
      { q: 'In PSLE Math, "perimeter" means ___', opts: ['The area inside a shape', 'The total length around a shape', 'The height of a shape', 'The volume of a shape'], ans: 1, exp: 'perimeter = 周长，围绕形状一圈的总长度' },
      { q: 'In PSLE Science, "transpiration" is the process of ___', opts: ['Water absorbed by roots', 'Water evaporating from leaves', 'Photosynthesis in leaves', 'Nutrients moving up the stem'], ans: 1, exp: 'transpiration = 蒸腾作用，水从叶片气孔蒸发散失' }
    ] },
  { subject:'🇸🇬 PSLE 英语 Paper 1', title:'1h 10min 时间分配',
    content:'Paper 1 = Situational Writing(15 分, ~20 min) + Continuous Writing(40 分, ~50 min)。注意: Editing 在 Paper 2 不在 P1. 写作必留 5 min 检查拼写。Continuous Writing: 计划 3 min + 写 40 min + 检查 7 min。',
    qs: [
      { q: 'In PSLE English Paper 1, how much time should you spend on Continuous Writing?', opts: ['20 minutes', '30 minutes', '50 minutes', '70 minutes'], ans: 2, exp: 'Paper 1 = Situational(20min) + Continuous(50min)，总1h10min' },
      { q: 'How should you use the LAST 7 minutes of Continuous Writing?', opts: ['Write more content', 'Check spelling, tenses and punctuation', 'Re-read the question', 'Add more paragraphs'], ans: 1, exp: '最后7min检查拼写/时态/标点，比多写内容更有效' }
    ] },
  { subject:'🇸🇬 PSLE 英语 Paper 2', title:'1h50min 6 部分顺序',
    content:'Paper 2 = Grammar MCQ + Vocab MCQ + Vocab Cloze + Visual Text + Comp Cloze + Comprehension OE。6 部分严格按顺序, 难度递增。前 4 部分 50 min, 后 2 部分 60 min。',
    qs: [
      { q: 'In PSLE English Paper 2, what comes AFTER Vocabulary MCQ?', opts: ['Grammar MCQ', 'Comprehension OE', 'Vocabulary Cloze', 'Visual Text'], ans: 2, exp: '顺序: Grammar MCQ→Vocab MCQ→Vocab Cloze→Visual Text→Comp Cloze→Comp OE' },
      { q: 'How many minutes should you spend on the FIRST 4 sections of Paper 2?', opts: ['30 minutes', '40 minutes', '50 minutes', '60 minutes'], ans: 2, exp: '前4部分(Grammar/Vocab/Cloze/Visual) = 50min，后2部分(Comp) = 60min' }
    ] },
  { subject:'🖼️ Visual Text 看图', title:'5 类信息源',
    content:'Visual Text(海报/广告/通知)看图答题。必看 5 类: ① 大字标题(主题)② 数字(日期/时间/价格)③ 图片暗示 ④ 联系方式 ⑤ 排版强调(粗体/颜色)。题型: Who / What / When / Where / Why / How much。',
    qs: [
      { q: 'In a PSLE Visual Text (poster), which element should you check FIRST?', opts: ['The small print at the bottom', 'The large title/headline', 'The contact number', 'The border design'], ans: 1, exp: '大字标题 = 主题，先看才知道整个海报的目的' },
      { q: 'A Visual Text question asks "How much does entry cost?" — where should you look?', opts: ['The pictures', 'Any numbers/prices on the poster', 'The organiser\'s name', 'The event description'], ans: 1, exp: '价格=数字信息，Visual Text答案90%直接从图上找' }
    ] },
  { subject:'📝 PSLE 作文重写', title:'重写 = 真正的提分',
    content:'老师改完作文后必须照标重写一次 — 不重写 = 白改。重写时换更好的词、更紧凑的句、更感官的描写。 1 篇重写比写 3 篇新作文提分快 3 倍。',
    qs: [
      { q: 'After a teacher marks your essay, what is the MOST effective next step?', opts: ['Write a completely new essay on a different topic', 'Rewrite the same essay incorporating all corrections', 'Just read the corrections without rewriting', 'Memorise the corrections only'], ans: 1, exp: '重写同一篇 = 神经科学练习，1次重写 > 3篇新作文' },
      { q: 'When rewriting a corrected essay, you should ALSO ___', opts: ['Keep all the same words and sentences', 'Replace weak words with stronger vocabulary', 'Make it shorter to save time', 'Change the story topic completely'], ans: 1, exp: '重写时升级词汇+句式，不只是改错，是全面提升' }
    ] },
];

const SCIENCE_MASTER_TIPS = [
  { subject:'🔬 PSLE Science 答题模板', title:'OE 三大题型',
    content:'PSLE Science Open-Ended 三大题型: "What"→直接答名词 / "Why"→"because... so..." / "Compare"→用 unlike/whereas 对比关键差异. 所有 OE 答案必含原文核心词。',
    qs: [
      { q: 'In PSLE Science, a "Why" question answer should follow the format ___', opts: ['because [cause]...so [effect]', 'The answer is...', 'Yes, because...', 'It means that...'], ans: 0, exp: '"because [原因]...so [结果]" 是PSLE Science OE Why题标准格式' },
      { q: 'When COMPARING two things in a PSLE Science OE, which word best shows contrast?', opts: ['also', 'therefore', 'unlike', 'since'], ans: 2, exp: 'unlike/whereas 是Compare题型的关键对比词，必须在答案中出现' }
    ] },
  { subject:'🔬 实验题 4 要素', title:'缺 1 个扣 1 分',
    content:'PSLE 实验题必含: ① Independent variable(改变啥 — 1 个) ② Dependent variable(测啥 — 1 个) ③ Controlled variables(保持不变 — 至少 2 个) ④ Hypothesis(预测 + 理由)。少哪个扣哪个 — 不是 partial credit, 是直接 0。',
    qs: [
      { q: 'In a PSLE Science experiment, the "independent variable" is ___', opts: ['What you measure at the end', 'What you change — 1 factor only', 'What you keep the same', 'Your prediction before the experiment'], ans: 1, exp: '独立变量(independent variable) = 主动改变的那1个因素' },
      { q: 'In a fair test, how many independent variables should there be?', opts: ['As many as you want', 'At least 3', 'Exactly 1', 'Exactly 2'], ans: 2, exp: '公平实验只能改变1个独立变量，才能确定是哪个因素影响结果' }
    ] },
  { subject:'🔬 PSLE 8 大高频章', title:'占考试 70% 题量',
    content:'Plant Transport / Digestive / Light / Heat / Reproduction / Cells / Energy / Electricity — 这 8 章占 PSLE Science 70% 题量。复习抓这 8 章 = 抓 70% 分。',
    qs: [
      { q: 'Which topic is NOT one of the 8 PSLE Science high-frequency chapters?', opts: ['Plant Transport', 'Electricity', 'The Solar System', 'Digestive System'], ans: 2, exp: 'Solar System 不在8大高频章；8章 = 植物运输/消化/光/热/生殖/细胞/能量/电' },
      { q: 'Focusing on the 8 key PSLE Science chapters covers approximately ___% of exam content', opts: ['40%', '55%', '70%', '90%'], ans: 2, exp: '8大高频章占约70%题量，是最高效的复习策略' }
    ] },
  { subject:'🔬 综合卷应试', title:'1h45min 时间分配',
    content:'严格 PSLE 时长(科学 1h45min)。MCQ 50min(2min/题, 快做不纠结)→ OE 50min(慢做仔细审题)→ 检查 5min。不会的 MCQ 标记跳过最后回头。OE 没思路就先写关键词不留空白。',
    qs: [
      { q: 'In PSLE Science (1h45min total), approximately how long should you spend on MCQ?', opts: ['25 minutes', '35 minutes', '50 minutes', '70 minutes'], ans: 2, exp: 'MCQ约50分钟(约2分钟/题)，剩50分钟做OE，5分钟检查' },
      { q: 'If you cannot answer a PSLE Science MCQ, you should ___', opts: ['Spend all remaining time on it', 'Leave it blank permanently', 'Mark it, skip, and return at the end', 'Always guess option A'], ans: 2, exp: '标记跳过再回头 — 不卡难题，先拿确定分' }
    ] },
  { subject:'🌳 Plant Transport', title:'芹菜染色实验答题',
    content:'Q: Why coloured water moves up celery? A: Water travels up the stem THROUGH the XYLEM BY transpiration. Water evaporates from leaves, creating SUCTION that pulls more water up. 关键词必含: xylem(木质部)/transpiration(蒸腾)/suction.',
    qs: [
      { q: 'Which vessel carries water from the roots up to the leaves in a plant?', opts: ['Phloem', 'Xylem', 'Stomata', 'Chloroplast'], ans: 1, exp: 'xylem(木质部) = 运水通道(上行)；phloem = 运糖(双向)' },
      { q: 'The main process that causes water to move up through a plant stem is ___', opts: ['Photosynthesis', 'Respiration', 'Transpiration', 'Germination'], ans: 2, exp: 'transpiration(蒸腾) = 叶片水分蒸发，产生吸力拉水上升' }
    ] },
  { subject:'🌳 Plant Transport', title:'植物枯萎开放题',
    content:'Q: Why does the plant wilt? A: Leaves lose water faster than roots can absorb. Cells lose turgor pressure, plant wilts. Q: Why is xylem important? A: Transports water from roots to leaves for photosynthesis.',
    qs: [
      { q: 'Why does a plant wilt when there is not enough water?', opts: ['Roots grow too fast', 'Cells lose turgor pressure', 'Leaves produce too much oxygen', 'Xylem breaks down'], ans: 1, exp: '缺水 → 细胞失去膨压(turgor pressure) → 植物萎蔫(wilt)' },
      { q: 'What does xylem transport in a plant?', opts: ['Sugar from leaves to roots', 'Water and minerals from roots to leaves', 'Oxygen from stomata to cells', 'Carbon dioxide for photosynthesis'], ans: 1, exp: 'xylem = 水+矿物质从根到叶(上行)；phloem = 糖(双向)' }
    ] },
  { subject:'🍔 Digestive', title:'完整消化路径必背',
    content:'Mouth(saliva 含 amylase 消化淀粉)→ Esophagus(传送)→ Stomach(胃酸 + pepsin 消化蛋白)→ Small intestine(消化完成 + 吸收 nutrients to blood)→ Large intestine(吸水 + 形成 feces)→ Anus。每个器官的 function 一句话答清楚。',
    qs: [
      { q: 'Where does starch digestion BEGIN in the human body?', opts: ['Stomach', 'Small intestine', 'Mouth', 'Large intestine'], ans: 2, exp: '淀粉消化从口腔开始 — 唾液中的amylase分解淀粉' },
      { q: 'Where are digested nutrients absorbed into the bloodstream?', opts: ['Mouth', 'Stomach', 'Large intestine', 'Small intestine'], ans: 3, exp: '小肠(small intestine) = 消化完成并吸收营养进血液' }
    ] },
  { subject:'🍔 Digestive 营养素', title:'酶对应关系',
    content:'淀粉 starch → amylase(口腔/胰腺)→ glucose / 蛋白 protein → pepsin(胃)→ amino acids / 脂肪 fat → bile(肝制) + lipase(胰腺/小肠)→ fatty acids。PSLE Q: enzyme 在哪个器官最活跃? → 看 pH 和温度。',
    qs: [
      { q: 'Which enzyme found in the STOMACH digests protein?', opts: ['Amylase', 'Lipase', 'Pepsin', 'Bile'], ans: 2, exp: 'pepsin = 胃中消化蛋白质的酶；amylase = 消化淀粉；bile = 乳化脂肪(不是酶)' },
      { q: 'Bile is PRODUCED by which organ?', opts: ['Stomach', 'Small intestine', 'Pancreas', 'Liver'], ans: 3, exp: 'bile(胆汁) = 肝脏(liver)产生，储存在胆囊，乳化脂肪' }
    ] },
  { subject:'💡 Light & Shadow', title:'影子大小 vs 光源距离',
    content:'Q: Why bigger shadow when light is closer? A: As light source moves CLOSER to the object, MORE light is BLOCKED by the object, so shadow becomes LARGER. 反之 → 越远越小. 注意答案要说"more light blocked", 不能只说"shadow bigger"。',
    qs: [
      { q: 'When a light source moves CLOSER to an object, the shadow becomes ___', opts: ['Smaller', 'The same size', 'Larger', 'Disappears'], ans: 2, exp: '光源越近 → 物体挡住更多光 → 影子越大' },
      { q: 'The BEST PSLE answer for "why does the shadow get bigger" is ___', opts: ['Because the shadow wants to grow', 'More light is blocked by the object', 'The object gets bigger', 'Light moves faster'], ans: 1, exp: '必须说"more light is blocked" — PSLE评分关键词，缺少这词扣分' }
    ] },
  { subject:'💡 Light 透光分类', title:'不透/半透/透明对比',
    content:'Opaque(不透)→ dark shadow / Translucent(半透, 如磨砂玻璃)→ light shadow / Transparent(透, 如玻璃)→ no shadow。PSLE 实验题: 控制光源位置 + 物体距离 + 物体材质 3 变量。',
    qs: [
      { q: 'Which type of material produces the DARKEST shadow?', opts: ['Transparent', 'Translucent', 'Opaque', 'Reflective'], ans: 2, exp: 'opaque(不透明) = 不让任何光通过 → 最深最暗的影子' },
      { q: 'Frosted glass lets some light through but you cannot see clearly. It is ___', opts: ['Transparent', 'Translucent', 'Opaque', 'Reflective'], ans: 1, exp: 'translucent(半透明) = 透部分光但不清晰；例: 磨砂玻璃/油纸' }
    ] },
  { subject:'🔥 Heat 热传递', title:'三种区分模板',
    content:'Conduction(传导): solid 直接接触(金属勺烫)。Convection(对流): fluid(液/气)流动循环(暖气片在地面 — 热气上升)。Radiation(辐射): 无介质, 可穿真空(太阳到地球). Q "为什么 X 是 Y 传递" → 答介质 + 方向。',
    qs: [
      { q: 'Which method of heat transfer can work through a VACUUM (no medium needed)?', opts: ['Conduction', 'Convection', 'Radiation', 'All three'], ans: 2, exp: 'radiation(辐射) = 唯一不需要介质的传热，如太阳→地球穿越真空' },
      { q: 'Why is a heater placed at FLOOR level effective at warming a room?', opts: ['Heat conducts through the floor tiles', 'Hot air rises creating convection currents', 'Radiation fills the room equally', 'Cold air sinks to the ceiling'], ans: 1, exp: '暖气在地面→热空气上升→冷空气下沉→形成对流循环(convection current)' }
    ] },
  { subject:'🔥 Heat 温度 vs 热', title:'易混高频陷阱',
    content:'温度 temperature(°C)= 热的程度(状态量). 热 heat(J)= 能量(总量). 同 100°C 的水: 1 杯 vs 1 桶, 温度一样但热量不同. 热膨胀: 遇热体积↑, 遇冷体积↓ — 题"为什么夏天电线下垂?" → expansion。',
    qs: [
      { q: 'A cup and a bucket both contain water at 100°C. Which has MORE heat energy?', opts: ['The cup', 'The bucket', 'They have equal heat energy', 'Cannot be determined'], ans: 1, exp: '温度相同但热量不同 — 桶的水更多，热能更大；temperature ≠ heat energy' },
      { q: 'Why do power lines SAG more in SUMMER than in winter?', opts: ['They become heavier in summer', 'Metal expands when heated', 'Metal contracts when heated', 'Wind pushes them down'], ans: 1, exp: '热膨胀(thermal expansion): 金属受热体积增大 → 电线夏天变长下垂' }
    ] },
  { subject:'🌸 Reproduction', title:'花结构 + 受精流程',
    content:'花的结构 stamen(雄)= anther(花药)+ filament / pistil(雌)= stigma(柱头)+ style + ovary(子房). Pollination(传粉)= 花粉 anther → stigma. Fertilisation(受精)= 花粉 + ovule → seed. Methods: insect / wind / water。',
    qs: [
      { q: 'Which part of a flower PRODUCES pollen?', opts: ['Stigma', 'Ovary', 'Anther', 'Petal'], ans: 2, exp: 'anther(花药) = 产生花粉，属于stamen(雄蕊)' },
      { q: 'Pollination occurs when pollen is transferred from the anther to the ___', opts: ['Ovary', 'Stigma', 'Petal', 'Root'], ans: 1, exp: 'pollination = 花粉从anther传到stigma(柱头)；然后受精才产生种子' }
    ] },
  { subject:'🦠 Cells + Food Chain', title:'细胞结构对比 + 食物链',
    content:'动物细胞: cell membrane + cytoplasm + nucleus. 植物多 2 个: cell wall + chloroplast(叶绿体). Food chain: producer(植物 — make food)→ primary consumer(草食)→ secondary consumer(肉食)→ tertiary consumer / decomposer(分解). 箭头方向 = energy flow。',
    qs: [
      { q: 'Which structure is found in PLANT cells but NOT in animal cells?', opts: ['Cell membrane', 'Nucleus', 'Cell wall', 'Cytoplasm'], ans: 2, exp: '植物细胞独有: cell wall(细胞壁) + chloroplast(叶绿体)；动物细胞无' },
      { q: 'In a food chain, the ARROW (→) represents ___', opts: ['What the animal eats', 'The direction of energy flow', 'Who is physically stronger', 'Movement direction'], ans: 1, exp: '箭头 = energy flow方向(能量流动)，从被吃者指向吃者' }
    ] },
  { subject:'💧 Water Cycle', title:'4 步 + Air 组成',
    content:'水循环 4 步: evaporation(蒸发, 液→气)→ condensation(凝结, 气→液成云)→ precipitation(降水, 雨/雪)→ collection(汇集回海). Air 组成 = 78% nitrogen + 21% oxygen + 1% other. Weather 工具: thermometer / anemometer / rain gauge。',
    qs: [
      { q: 'Which process in the water cycle FORMS CLOUDS?', opts: ['Evaporation', 'Precipitation', 'Condensation', 'Collection'], ans: 2, exp: 'condensation(凝结) = 水蒸气遇冷变液态水形成云' },
      { q: 'What percentage of air is NITROGEN?', opts: ['21%', '50%', '78%', '99%'], ans: 2, exp: '空气成分: 78%氮气(nitrogen) + 21%氧气(oxygen) + 约1%其他气体' }
    ] },
  { subject:'⚡ Electricity', title:'电路 + 用电安全',
    content:'电路 = battery(power source)+ wires + component(灯/电机)+ switch. 必须 closed circuit 闭合才有电流. Conductor(导体)= metals. Insulator(绝缘体)= plastic/wood/rubber/dry skin. 湿手不能碰电器(湿水是导体)。',
    qs: [
      { q: 'Why is RUBBER used to cover electric wires?', opts: ['It is cheap', 'It is an insulator preventing electric shocks', 'It conducts electricity better than metal', 'It makes wires lighter'], ans: 1, exp: 'rubber(橡胶) = 绝缘体(insulator)，防止电流传到外面导致触电' },
      { q: 'For electric current to flow, a circuit must be ___', opts: ['Open', 'Closed (complete)', 'Very long', 'Made of plastic'], ans: 1, exp: '电流只在闭合回路(closed circuit)中流动；断路(open circuit) = 无电流' }
    ] },
  { subject:'⚡ Series & Parallel', title:'高频题型',
    content:'Series 串联: 1 个 path, 电流相同(same current), 电压分配(voltage shared). 一灯坏 → 全灭. Parallel 并联: 多 path, 电压相同, 电流分配. 一灯坏 → 其他正常. Q "为什么家里用并联?" → 一灯坏不影响 + 各设备独立电压。',
    qs: [
      { q: 'In a SERIES circuit, if ONE bulb breaks, what happens to the others?', opts: ['They glow brighter', 'They glow dimmer', 'They all go out', 'Nothing changes'], ans: 2, exp: '串联(series) = 只有1条通路，一灯断 → 全部熄灭' },
      { q: 'Why do homes use PARALLEL circuits instead of series?', opts: ['Parallel uses less electricity', 'Each appliance works independently at the same voltage', 'Series circuits are more dangerous', 'Parallel is cheaper to build'], ans: 1, exp: '并联 = 一灯坏不影响其他 + 各设备独立获得相同电压' }
    ] },
  { subject:'🔋 Energy 形态', title:'7 种能量形态',
    content:'Kinetic(动能 — 移动物体)/ Potential(势能 — 高度/拉伸的弹簧)/ Sound 声 / Light 光 / Electrical 电 / Heat 热 / Chemical 化学(电池/食物). Q "骑车上山时哪种能量在变" → kinetic ↑↓ + potential ↑。',
    qs: [
      { q: 'A stretched rubber band has which type of energy?', opts: ['Kinetic energy', 'Elastic potential energy', 'Chemical energy', 'Sound energy'], ans: 1, exp: '拉伸的弹簧/橡皮筋 = elastic potential energy(弹性势能)' },
      { q: 'Which energy type is stored in FOOD and BATTERIES?', opts: ['Kinetic energy', 'Light energy', 'Chemical energy', 'Electrical energy'], ans: 2, exp: 'chemical energy(化学能) = 储存在食物/电池/燃料中' }
    ] },
  { subject:'🔋 Energy Conversion', title:'转换链答题',
    content:'灯泡: electrical → light(useful)+ heat(wasted, 95%!). 风扇: electrical → kinetic. 太阳能板: light → electrical. 化石燃料发电: chemical → heat → kinetic → electrical. 答题用 → 箭头, 标 useful/wasted energy。',
    qs: [
      { q: 'A light bulb converts electrical energy mainly into ___ (useful) and ___ (wasted)', opts: ['Sound and heat', 'Light and heat', 'Kinetic and sound', 'Chemical and light'], ans: 1, exp: '灯泡: electrical → light(有用) + heat(浪费，约95%热损耗)' },
      { q: 'A wind turbine converts ___ energy into electrical energy', opts: ['Chemical energy', 'Heat energy', 'Kinetic energy', 'Light energy'], ans: 2, exp: '风力涡轮: wind kinetic energy(风的动能) → electrical energy(电能)' }
    ] },
  { subject:'🌍 Adaptation', title:'P6 难章高频',
    content:'仙人掌的"刺"是退化的叶 — 减少蒸腾。它的"绿色枝干"才是光合主力. 适应(Adaptation)= 百万年自然选择, 不是个体反应. PSLE 易混: adaptation(物种变化)vs response(个体反应, 如开花闭合)。',
    qs: [
      { q: 'The spines of a cactus are modified leaves. Their MAIN function is to ___', opts: ['Attract insects for pollination', 'Store water inside', 'Reduce water loss through transpiration', 'Protect from large animals only'], ans: 2, exp: '仙人掌刺(退化叶) = 减少蒸腾作用(reduce transpiration)，保持水分' },
      { q: '"Adaptation" in PSLE Science means ___', opts: ['An animal changing behaviour in one day', 'Inherited features that help a species survive over millions of years', 'A plant growing towards sunlight', 'An individual response to today\'s environment'], ans: 1, exp: 'adaptation = 物种经百万年进化的遗传特征；区别于个体response(如向光性)' }
    ] },
];

const MATH_MASTER_TIPS = [
  { subject:'➗ PSLE Math 4 大 Heuristics', title:'Model Drawing / Table / Backwards / Show All',
    content:'PSLE 数学 4 大解题套路: ① Model Drawing(线段图)② Make a Table ③ Work Backwards ④ Show ALL Working. 不会用任一种 = 难题肯定丢分. 4 种各练 5 题 = 全套熟练。',
    qs: [
      { q: 'For a PSLE Math RATIO or comparison problem, which heuristic works BEST?', opts: ['Make a Table', 'Model Drawing (bar model)', 'Work Backwards', 'Systematic Listing'], ans: 1, exp: 'Model Drawing(线段图) = 最适合比例/分数/比较题，画图比列方程直观' },
      { q: '"The answer is 50. Each step adds 5 starting from 0. What was the value at step 3?" — which heuristic?', opts: ['Model Drawing', 'Make a Table', 'Work Backwards', 'Guess and Check'], ans: 2, exp: 'Work Backwards(逆推法) = 已知最终结果，逆向推回中间步骤' }
    ] },
  { subject:'➗ Math 时间分配', title:'Paper 2 17 题 6 min/题',
    content:'PSLE Math Paper 2 一共 1h45min, 17 道大题 → 平均 6 min/题。最后 4 道难题留 30 min, 检查 5 min。前 13 道严格 5 min/题, 难的留更多时间。',
    qs: [
      { q: 'PSLE Math Paper 2 has 17 questions in 1h45min. About how many minutes per question?', opts: ['3 minutes', '4 minutes', '6 minutes', '10 minutes'], ans: 2, exp: '105分钟 ÷ 17题 ≈ 6分钟/题；前13题约5分钟，最后4题留30分钟' },
      { q: 'How much time should you RESERVE for the last 4 difficult questions in Paper 2?', opts: ['10 minutes', '20 minutes', '30 minutes', '45 minutes'], ans: 2, exp: '最后4道难题留30分钟，确保有时间展示完整解题步骤拿部分分' }
    ] },
  { subject:'➗ Bar Graph 题', title:'必看 axis label',
    content:'多数学生跳过 y 轴单位 — 然后答出 "10 个" 而不是 "10 千克". PSLE 数据题 30% 错在没读单位. 先看坐标轴 → 再看数据 → 再答题。',
    qs: [
      { q: 'Before answering any PSLE data/graph question, what should you check FIRST?', opts: ['The tallest bar', 'The chart title', 'The y-axis label and unit', 'The number of bars'], ans: 2, exp: '先看y轴标签和单位 — 30%数据题错误来自忽略单位' },
      { q: 'A bar reaches height 4. The y-axis label says "Number of books (hundreds)". How many books?', opts: ['4', '40', '400', '4000'], ans: 2, exp: '4 × 100(百) = 400本；不读单位直接读数值是最常见错误' }
    ] },
  { subject:'➗ Math 难题', title:'限时 30min 不死磕',
    content:'限时 30min. Heuristic 4 选 1 试. 做不出抄题型 + 思路下次回看, 不死磕超 45min. 1 道难题花 1h 不如花在 5 道中等题。',
    qs: [
      { q: 'If you are stuck on a difficult PSLE Math question for 8 minutes, you should ___', opts: ['Keep trying until solved', 'Ask for help immediately', 'Mark it, move on, return later', 'Skip it and never return'], ans: 2, exp: '卡住超时 → 标记跳过，完成其余题目后剩余时间再回头' },
      { q: 'Why is it better to spend 30 minutes on 5 medium questions than 30 min on 1 hard question?', opts: ['Medium questions are easier to guess', 'You can earn more total marks from 5 questions', 'Hard questions never have partial marks', 'Medium questions have shorter working'], ans: 1, exp: '5道中等题×2-3分 > 1道难题5分；分散时间总分更高' }
    ] },
  { subject:'➗ Math 错题本', title:'抄题 → 原因 → 正解',
    content:'每错一题写: ① 抄题完整 ② 错的原因(粗心/公式/题型陌生) ③ 正确解法. 每题 3 行, 周末重做. 第 3 次重做才真正会。',
    qs: [
      { q: 'In the math error notebook "3-line method", what does the SECOND line record?', opts: ['The full question text', 'The reason for the mistake', 'The correct solution method', 'The date of the error'], ans: 1, exp: '3行法: ①抄题 ②错误原因(粗心/公式/陌生题型) ③正确解法' },
      { q: 'How many times should you redo each error-book problem before it is truly learned?', opts: ['1 time', '2 times', '3 times', '5 times'], ans: 2, exp: '神经科学: 重复3次才进入长期记忆，第3次重做才算真正掌握' }
    ] },
  { subject:'➗ PSLE 比例题', title:'高频题型',
    content:'比例题 = PSLE 高分题. 模板: 设单位 → 列方程 → 验证. 例: A:B = 2:3, A 多 6 → 1 unit = 6, A=12 B=18. 别用代数, 用 unit 思维。',
    qs: [
      { q: 'A:B = 3:5. If A = 12, what is B?', opts: ['15', '18', '20', '25'], ans: 2, exp: 'A = 3 units = 12, so 1 unit = 4; B = 5 units = 5 × 4 = 20' },
      { q: 'Tom and Jerry share marbles in ratio 2:3. Jerry has 15 marbles. How many does Tom have?', opts: ['6', '10', '12', '15'], ans: 1, exp: 'Jerry = 3 units = 15, so 1 unit = 5; Tom = 2 units = 2 × 5 = 10' }
    ] },
];

const CHINESE_MASTER_TIPS = [
  { subject:'🇨🇳 PSLE 华文作文', title:'5 类开头 + 5 成语',
    content:'5 类开头(描景/引句/反问/排比/对话)+ 5+ 成语 / 谚语 + 心理描写细致. 背 5 个固定开头 = 永远写得出第一段. 每篇用 3-5 个成语, 1 篇作文从 25→32 分。',
    qs: [
      { q: '华文作文中，哪种开头方式通常获得最高分？', opts: ['直接叙述"那天我去了..."', '感官描写开场（气味/声音/色彩）', '介绍人物姓名背景', '说明本文的写作目的'], ans: 1, exp: '感官描写开场 = 最能吸引阅卷老师；"那天我去了"是最低分开头' },
      { q: '在华文作文中，成语放在哪里效果最好？', opts: ['只能放在第一句', '关键情节高潮处或结尾升华', '每段第一句强制使用', '最好完全不用成语'], ans: 1, exp: '成语放在高潮/结尾处效果最佳；生硬嵌入反而扣分' }
    ] },
  { subject:'🇨🇳 PSLE 华文 Paper 1+2', title:'时间分配',
    content:'PSLE 华文 Paper 1 = 作文(50min). Paper 2 = 阅读理解 + 综合(1h50min). 分开计时严格执行, 别让 Paper 2 拖累 Paper 1。',
    qs: [
      { q: 'PSLE 华文 Paper 1（作文）应该用多少分钟？', opts: ['30 分钟', '40 分钟', '50 分钟', '70 分钟'], ans: 2, exp: 'Paper 1作文 = 约50分钟（构思3+写作40+检查7）' },
      { q: 'PSLE 华文 Paper 2（阅读理解+综合）共多少时间？', opts: ['50 分钟', '1 小时', '1 小时 20 分钟', '1 小时 50 分钟'], ans: 3, exp: 'Paper 2 = 1小时50分钟；阅读理解约1h，综合题约50min' }
    ] },
  { subject:'🇨🇳 华文 OE 答题', title:'找句子原文 + 四字概括',
    content:'PSLE 华文 OE: 找句子原文位置 + 用四字词概括 + 注意"为什么/有什么影响"格式. 答案直接从原文找, 不要自己原创. 抓核心词答题。',
    qs: [
      { q: 'PSLE 华文 OE 答题，答案应该主要来自：', opts: ['自己的想法和观点', '其他书本的知识', '原文的核心句子和词语', '日常生活经验'], ans: 2, exp: '华文OE = 原文核心词，不接受脱离原文的"创意答案"' },
      { q: '华文阅读"为什么"题，答案格式应该是：', opts: ['只需回答结果', '因果关系（因为...所以...）', '时间顺序（先...后...）', '对比关系（虽然...但是...）'], ans: 1, exp: '"为什么"题 = 因为[原因]，所以[结果]；缺少因果格式会扣分' }
    ] },
  { subject:'🇨🇳 华文阅读', title:'抓 5 个关键人物/事件',
    content:'PSLE 华文阅读理解: 先扫一遍找 5 个关键(人物/时间/地点/事件/结果), 再回头答题. 跟英语 Comp 一样, 定位法 4 步。',
    qs: [
      { q: '阅读华文理解文章时，第一步应该扫描找出：', opts: ['所有生字的意思', '5个关键（人/时/地/事/果）', '作者的写作风格特点', '文章一共有多少字'], ans: 1, exp: '先找5个关键(人物/时间/地点/事件/结果)，建立整体框架再答题' },
      { q: '华文阅读定位法与英语Comprehension策略相比：', opts: ['完全不同，不可借鉴', '基本相同：先看题→划关键词→原文搜→摘答案', '华文不需要定位', '只适用于英语'], ans: 1, exp: '定位法4步：先看题→划关键词→文章搜索→摘原文答，中英文通用' }
    ] },
  { subject:'🇨🇳 华文综合', title:'听写 + 阅读 + 看图',
    content:'综合题 = 听写 + 阅读 + 看图. 听写最难, 平时多听 cna938 中文台 + 读古诗培养语感. 看图作文用记叙文结构 4 段。',
    qs: [
      { q: '华文 Paper 2 综合题中，哪个部分通常最难？', opts: ['看图作文', '短文阅读理解', '听写（默写）', '词语造句'], ans: 2, exp: '听写(默写) = 综合题最难，需长期积累语感，不能临时抱佛脚' },
      { q: '华文看图作文应该使用哪种结构？', opts: ['说明文三段式', '议论文五段式', '记叙文四段结构', '诗歌对仗格式'], ans: 2, exp: '看图作文 = 记叙文4段：开场→事件发展→高潮→结局反思' }
    ] },
  { subject:'🇨🇳 华文作文老师', title:'每周 1 篇必交',
    content:'华文作文每周 1 篇必交老师改. 改完照标重写一次 — 不重写 = 白改. 30-50 SGD/篇, 这是最不该省的钱。',
    qs: [
      { q: '老师改完华文作文后，最重要的下一步是什么？', opts: ['换新题目重新写一篇', '照老师批改重写同一篇', '只读批改评语不重写', '背诵老师的评语'], ans: 1, exp: '照标重写 = 重复练习才真正内化；不重写等于白改，比写新文章效果好3倍' },
      { q: '找老师批改一篇华文作文，市场价通常是：', opts: ['5-10 SGD', '15-20 SGD', '30-50 SGD', '100+ SGD'], ans: 2, exp: '市场价约30-50 SGD/篇，这是PSLE备考最值得的投资' }
    ] },
];

// ============= v17.7 Phase 3: 每日特别任务 (Daily Quest) =============
// 8 个模板, 每天上午随机选 1 个, 24h 内完成
const DAILY_QUEST_POOL = [
  {
    id: 'wow-1', icon: '🤯', title: '看 1 条今日 Wow 事实',
    desc: '点开主页 Wow 卡, 至少看完 1 条', target: 1, reward: 5,
    hintWhere: '主页 → 🤯 Wow 卡(右上)'
  },
  {
    id: 'think-1', icon: '🤔', title: '答 1 道反直觉思考题',
    desc: '打卡页顶部, 任意一题', target: 1, reward: 10,
    hintWhere: '打卡页 → 💭 思考题(只在难章周有)'
  },
  {
    id: 'listen-15', icon: '🎧', title: '听 15 分钟英语',
    desc: '听力 modal 累计 15 分钟(任意源)', target: 900, reward: 10, unit: 'sec',
    hintWhere: '打卡页 → 🔊 按钮(LS 时段旁)'
  },
  {
    id: 'slot-3', icon: '✅', title: '打 3 个项目',
    desc: '任意 slot 完成 3 个', target: 3, reward: 5,
    hintWhere: '打卡页 → 任意 7 个时段勾选'
  },
  {
    id: 'slot-5', icon: '🔥', title: '打 5 个项目(挑战)',
    desc: '今天连打 5 个 slot', target: 5, reward: 12,
    hintWhere: '打卡页 → 一天打满 5 个'
  },
  {
    id: 'box-open', icon: '🎁', title: '开 1 个神秘宝箱',
    desc: 'tab 栏点 🎁 开盒(没盒就先攒)', target: 1, reward: 3,
    hintWhere: 'Tab 栏 → 🎁 按钮'
  },
  {
    id: 'vocab-1', icon: '📚', title: '看 1 个学科词汇本',
    desc: '打卡页词汇 slot → 📚 按钮看 30 词', target: 1, reward: 5,
    hintWhere: '打卡页 → 📚 按钮(W1-W17 词汇 slot 旁)'
  },
  {
    id: 'feynman', icon: '🗣️', title: '教家人 1 个新单词/概念',
    desc: '用 30 秒讲给家人听 — 自评 +8 分', target: 1, reward: 8,
    hintWhere: '本任务靠诚实点击, 不能作弊!'
  }
];

function dailyQuestTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 取今日任务 — 如果没有则从 pool 选 1 个 (按 day-of-year 哈希, 同一天稳定)
function getTodayQuest(state) {
  if (!state.dailyQuests) state.dailyQuests = {};
  const key = dailyQuestTodayKey();
  if (!state.dailyQuests[key]) {
    const epochDay = Math.floor(Date.now() / 86400000);
    const idx = ((epochDay % DAILY_QUEST_POOL.length) + DAILY_QUEST_POOL.length) % DAILY_QUEST_POOL.length;
    const tmpl = DAILY_QUEST_POOL[idx];
    state.dailyQuests[key] = {
      questId: tmpl.id, progress: 0, target: tmpl.target,
      completed: false, claimedAt: null
    };
  }
  const record = state.dailyQuests[key];
  const tmpl = DAILY_QUEST_POOL.find(q => q.id === record.questId);
  return { ...tmpl, ...record };
}

// 进度增量 — type 跟 quest.id 对应; 例: bumpQuestProgress(state, 'wow-1', 1)
// 返回是否首次达成
function bumpQuestProgress(state, questId, amount) {
  const today = getTodayQuest(state);
  if (today.questId !== questId) return { matched: false };
  if (today.completed) return { matched: true, alreadyDone: true };
  const key = dailyQuestTodayKey();
  state.dailyQuests[key].progress = Math.min(today.target, (state.dailyQuests[key].progress || 0) + amount);
  if (state.dailyQuests[key].progress >= today.target) {
    state.dailyQuests[key].completed = true;
    state.dailyQuests[key].claimedAt = Date.now();
    state.totalPoints += today.reward;
    state.logs.push({
      reason: `⭐ 每日任务: ${today.title} (+${today.reward})`,
      points: today.reward, week: state.currentWeek, timestamp: Date.now()
    });
    return { matched: true, justCompleted: true, reward: today.reward };
  }
  return { matched: true, progress: state.dailyQuests[key].progress, target: today.target };
}

// 按日轮换名师秘诀: 周一/三/五 = 英语 (3); 周二/四 = 科学 (2); 周六 = 数学 (1); 周日 = 华文 (1)
function getTodayMasterTip(weekN, dateOverride) {
  const d = dateOverride || new Date();
  const dow = d.getDay();  // 0=Sun, 1=Mon, ..., 6=Sat
  const epochDay = Math.floor(d.getTime() / 86400000);
  let pool, subject, color;
  if (dow === 1 || dow === 3 || dow === 5) {
    pool = ENGLISH_MASTER_TIPS; subject = '英语'; color = '#6FB8A0';
  } else if (dow === 2 || dow === 4) {
    pool = SCIENCE_MASTER_TIPS; subject = '科学'; color = '#9B8FC9';
  } else if (dow === 6) {
    pool = MATH_MASTER_TIPS; subject = '数学'; color = '#E8B86E';
  } else {
    pool = CHINESE_MASTER_TIPS; subject = '华文'; color = '#E07B7B';
  }
  const idx = ((epochDay % pool.length) + pool.length) % pool.length;
  const tip = pool[idx];
  return { ...tip, dailySubject: subject, dailySubjectColor: color };
}

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
// 新加坡每年 P5 学生约 50,000 人。
// v18.34: 标定到 30000 分上限 (0.05 SGD/分):
// 500=14% / 1000=26% / 3000=59% / 5000=78% / 10000=95% / 20000=99.5% / 30000+=99.5%
const SG_P5_TOTAL = 50000;
function studentBeatPercent(pts) {
  if (pts <= 0) return 0;
  // 平滑曲线: 1 - exp(-pts / 3000 * 0.9), 最高 99.5%
  const raw = 100 * (1 - Math.exp(-pts / 3000 * 0.9));
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
  if (t.startsWith('🗣') || t.startsWith('🎧')) return '🗣️ 听力口试';  // v16: 🎧 听力归入此类
  if (t.startsWith('➗')) return '➗ 数学';
  if (t.startsWith('🇨🇳')) return '🇨🇳 华文';
  if (t.startsWith('📓') || t.startsWith('📋') || t.startsWith('🎯')) return '📓 复盘/里程碑';
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
  if (/听力|口试/.test(t) || t.startsWith('🎧') || t.startsWith('🗣')) return '听力/口试';
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
    return '📃 PSLE 英语 Paper 1=Sit+Cont Writing(1h10min) / Paper 2=Grammar+Cloze+Editing+Comp(1h50min) — Editing 在 P2!';

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

  // ===== v16 强调点 =====
  if (/Comp.*Cloze|阅读.*完形/.test(t))
    return '📖 v16 强调:Comp/Cloze 是 PSLE 重灾区。错一空必查同义词/词性/搭配,记词汇错题本';
  if (/Editing.*5 类|改错.*5 类/.test(t))
    return '✏️ v16 强调:5 类错(主谓/时态/拼写/介词/冠词),分类入本';
  if (/22:00|22 点|熄灯/.test(t))
    return '💤 铁律 5:22:00 准时熄灯。任务没做完明天补,睡眠不让步';

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
  // v18.22: 顺序按时间; 工作日 E1→VB; 周末 W* 按时段链
  const order = [
    // 工作日 / 兼容旧
    'AM', 'E1', 'OR', 'VC', 'LS', 'ED', 'S2', 'VB',
    // 周六新作息 (按时间)
    'WSE', 'WSF', 'WSS', 'WSL', 'WSM', 'WSR', 'WSV',
    // 周日新作息 (按时间)
    'WUH', 'WUR', 'WUM', 'WUS', 'WUE1', 'WUE2', 'WUP',
    // PM 在最后兜底 (旧周末数据)
    'PM'
  ];
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
    if (task.startsWith('🗣') || task.startsWith('🎧')) return '🗣️ 听力口试';  // v16: 🎧 听力归入此类
    if (task.startsWith('➗')) return '➗ 数学';
    if (task.startsWith('🇨🇳')) return '🇨🇳 华文';
    return '📓 复盘其他';
  };

  const bySubject = {};
  subjects.forEach(s => bySubject[s] = { total: 0, done: 0 });
  const byDayPart = {
    weekday: { total: 0, done: 0, label: '工作日(全部时段)' },
    weekend: { total: 0, done: 0, label: '周末(上午/下午)' }
  };
  const byDay = {};
  DAY_KEYS.forEach(d => byDay[d] = { total: 0, done: 0 });
  const missed = [];
  let total = 0, done = 0;

  // v14/v16: 9 个 slot — AM/PM(周末)+ E1/OR/VC/LS/ED/S2/VB(平日 7 个)
  const ALL_SLOTS = ['AM', 'PM', 'E1', 'OR', 'VC', 'LS', 'ED', 'S2', 'VB'];
  for (const day of DAY_KEYS) {
    const daySlots = w.days[day] || {};
    const isWeekend = day === 'Sat' || day === 'Sun';
    for (const slot of ALL_SLOTS) {
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
let _fbStorage = null;
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
    _fbStorage = firebase.storage();
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
  // v18.34: 防 logs 无限增长 (73 周 511 天 × 5 = 2500+ 条会撑爆 Firestore 1MB 文档)
  if (state.logs && state.logs.length > 1000) {
    state.logs = state.logs.slice(-1000);  // 只保留最近 1000 条
  }
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

// ---- Firebase Storage 云端照片同步 (v18.64) ----
// 上传照片 blob 到 Storage，把 URL + 时间戳写入 state.cloudPhotos，触发 Firestore 同步
async function photoUploadCloud(week, day, slot, blob) {
  if (!_fbStorage) return null;
  const key = photoKey(week, day, slot);
  const timestamp = Date.now();
  const path = `photos/${key}_${timestamp}.jpg`;
  const ref = _fbStorage.ref(path);
  await ref.put(blob, { contentType: 'image/jpeg' });
  const url = await ref.getDownloadURL();
  if (!state.cloudPhotos) state.cloudPhotos = {};
  state.cloudPhotos[key] = { url, uploadedAt: timestamp, verified: false, verifiedAt: null };
  saveState();
  return url;
}

// 家长确认作业真实：把 verified=true 写入 state.cloudPhotos 并同步
function verifyCloudPhoto(week, day, slot) {
  const key = photoKey(week, day, slot);
  if (!state.cloudPhotos || !state.cloudPhotos[key]) return;
  state.cloudPhotos[key].verified = true;
  state.cloudPhotos[key].verifiedAt = Date.now();
  saveState();
  if (typeof showToast === 'function') showToast('✅ 已确认作业真实', 'success');
  if (typeof renderAll === 'function') renderAll();
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
window.photoUploadCloud = photoUploadCloud;
window.verifyCloudPhoto = verifyCloudPhoto;
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
// v16
window.SGD_PER_POINT = SGD_PER_POINT;
window.ULTIMATE_PRIZE_SGD = ULTIMATE_PRIZE_SGD;
window.ULTIMATE_PRIZE_POINTS = ULTIMATE_PRIZE_POINTS;
window.IRON_RULES = IRON_RULES;
window.SUNDAY_REVIEW_STEPS = SUNDAY_REVIEW_STEPS;
window.VOCAB_500 = VOCAB_500;
window.getVocabForWeek = getVocabForWeek;
window.LISTENING_RESOURCES = LISTENING_RESOURCES;
// v16.10: 防沉迷
window.LISTENING_DAILY_LIMIT_MIN = LISTENING_DAILY_LIMIT_MIN;
window.listeningTodayKey = listeningTodayKey;
window.getListeningSecondsToday = getListeningSecondsToday;
window.addListeningSeconds = addListeningSeconds;
window.isListeningLocked = isListeningLocked;
window.resetListeningToday = resetListeningToday;
// v17.1: streak + wow facts
window.bumpDailyStreak = bumpDailyStreak;
window.streakSeverity = streakSeverity;
window.isStreakInAshes = isStreakInAshes;
window.parentRestoreStreak = parentRestoreStreak;
window.streakTodayKey = streakTodayKey;
window.WEEKLY_WOW_FACTS = WEEKLY_WOW_FACTS;
window.getWeeklyWowFact = getWeeklyWowFact;
// v17.2
window.ENGLISH_WOW_FACTS = ENGLISH_WOW_FACTS;
window.getTodayWowFact = getTodayWowFact;
// v17.5 Phase 2
window.MYSTERY_BOX_SLOTS_PER_BOX = MYSTERY_BOX_SLOTS_PER_BOX;
window.countTotalCompletedSlots = countTotalCompletedSlots;
window.awardMysteryBoxesIfDue = awardMysteryBoxesIfDue;
window.openMysteryBoxOnce = openMysteryBoxOnce;
window.THINK_PUZZLES = THINK_PUZZLES;
window.getThinkPuzzleForWeek = getThinkPuzzleForWeek;
window.submitThinkPuzzleAnswer = submitThinkPuzzleAnswer;
// v17.6
window.ENGLISH_MASTER_TIPS = ENGLISH_MASTER_TIPS;
window.SCIENCE_MASTER_TIPS = SCIENCE_MASTER_TIPS;
window.MATH_MASTER_TIPS = MATH_MASTER_TIPS;
window.CHINESE_MASTER_TIPS = CHINESE_MASTER_TIPS;
window.getTodayMasterTip = getTodayMasterTip;
// v17.7 Phase 3
window.DAILY_QUEST_POOL = DAILY_QUEST_POOL;
window.getTodayQuest = getTodayQuest;
window.bumpQuestProgress = bumpQuestProgress;
window.dailyQuestTodayKey = dailyQuestTodayKey;
// v17.7 Phase 4
window.VOCAB_MEANINGS = VOCAB_MEANINGS;
window.getVocabMeaning = getVocabMeaning;
// v18 Phase 5.1
window.PET_FORMS = PET_FORMS;
window.getCurrentPetForm = getCurrentPetForm;
window.feedPet = feedPet;
window.petBreaksHappiness = petBreaksHappiness;
window.ACHIEVEMENTS = ACHIEVEMENTS;
window.checkAchievements = checkAchievements;
window.checkDailyDraw = checkDailyDraw;
// v18 Phase 5.3
window.enqueueReview = enqueueReview;
window.getDueReviews = getDueReviews;
window.submitReview = submitReview;
window.predictFutureSelf = predictFutureSelf;
// v18 Phase 5.4
window.MATH_QUESTIONS = MATH_QUESTIONS;
window.EDITING_PARAGRAPHS = EDITING_PARAGRAPHS;
window.LISTEN_DICTATIONS = LISTEN_DICTATIONS;
// v18.3: 按日轮换
window.getDailyMathQuestions = getDailyMathQuestions;
window.getDailyEditingParagraph = getDailyEditingParagraph;
window.getDailyListenDictation = getDailyListenDictation;
// v18.25: 难度自适应
window.recordGameRun = recordGameRun;
window.getDifficulty = getDifficulty;
window.getMathQuestionsByDiff = getMathQuestionsByDiff;
window.getEditingByDiff = getEditingByDiff;
window.getListenByDiff = getListenByDiff;
window.getVocabPairsByDiff = getVocabPairsByDiff;
window.VOCAB_HARD = VOCAB_HARD;
// v18.26: 知识树
window.KNOWLEDGE_TREE = KNOWLEDGE_TREE;
window.getKnowledgeTreeStatus = getKnowledgeTreeStatus;
window.getKnowledgeProgress = getKnowledgeProgress;
// v18.45: 知识树独立练习
window.KNOWLEDGE_PRACTICE = KNOWLEDGE_PRACTICE;
window.getNodePractice = getNodePractice;
// v18.46: PSLE 题库
window.PSLE_PAPER_BANK = PSLE_PAPER_BANK;
window.getPaperBank = getPaperBank;
// v18.27: 闹铃
window.ALARM_SCHEDULE = ALARM_SCHEDULE;
// v18.28: 4 新 mini-game 数据 + helpers
window.UNIT_CONVERSIONS = UNIT_CONVERSIONS;
window.GRAMMAR_QUESTIONS = GRAMMAR_QUESTIONS;
window.CLOZE_QUESTIONS = CLOZE_QUESTIONS;
window.SCIENCE_CLASSIFY = SCIENCE_CLASSIFY;
window.getUnitByDiff = getUnitByDiff;
window.getGrammarByDiff = getGrammarByDiff;
window.getClozeByDiff = getClozeByDiff;
window.getSciClassifyByDiff = getSciClassifyByDiff;
// v18.31: 作文
window.PSLE_COMPOSITIONS = PSLE_COMPOSITIONS;
window.getCompositionPrompt = getCompositionPrompt;
// v18.36: 弱项分析
window.SUBJECT_OF_GAME = SUBJECT_OF_GAME;
window.WEAK_KNOWLEDGE_MAP = WEAK_KNOWLEDGE_MAP;
window.getSubjectAccuracy = getSubjectAccuracy;
window.findWeakSubjects = findWeakSubjects;
// v18.40: 题库 (华文阅读)
window.CHINESE_READING = CHINESE_READING;
window.getChineseReadingByDiff = getChineseReadingByDiff;
