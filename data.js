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

// ============= v16: 兑换汇率 (1 积分 = 0.25 SGD) =============
// 6000 积分 (满分 dragon 装备线) = SGD 1500 终极大奖
const SGD_PER_POINT = 0.25;
const ULTIMATE_PRIZE_SGD = 1500;
const ULTIMATE_PRIZE_POINTS = ULTIMATE_PRIZE_SGD / SGD_PER_POINT;  // = 6000

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
  { tag:'Oral', hook:'🗣️ Reading Aloud: 句号停 1.5 秒 = 多 2 分', body:'PSLE Oral Reading Aloud 评 15 分。 句末停顿 1.5 秒 + 重读关键词 = 流畅感觉。 平淡读完就 8-10 分; 有节奏 13-15 分。' },
  { tag:'Oral', hook:'🖼️ Stimulus 看图: 描述→联想→个人 3 步答', body:'PSLE Oral 看图说话: ① 描述场景 ② 联想问题/感受 ③ 个人经历呼应。 每点 2-3 句即可。 缺哪一步扣 1-2 分。' },
  { tag:'Synthesis', hook:'🔗 PSLE Paper 2 顶端 10 分: Synthesis', body:'把 2 个简单句合并成 1 个复杂句, 或换句型不变意 — Synthesis & Transformation 占 10 分。 W15 起每周 1h 专项练习。' },
  { tag:'词汇', hook:'🌍 PSLE Vocab 6 完成 = AL2 起步线', body:'Vocabulary 6 这本完成 = 词汇量到 PSLE AL2 标准。 v14 计划 W16 完成 Vocab 5, W52 前完成 Vocab 6 — 严格执行 = 英语稳 AL2。' },
  { tag:'写作', hook:'🌧️ 描写下雨用 5 个不同动词 — 都比 "rain" 好', body:'drizzle(细雨)/ shower(短雨)/ pour(倾盆)/ pelt(打)/ patter(嗒嗒). PSLE 作文用一个就比 "It rained" 高级 3 倍。' },
  { tag:'PSLE', hook:'🎯 PSLE 英语 Paper 1 = 作文 + Editing — 70 min', body:'Paper 1 = Composition(50 分, 50 min)+ Situational Writing(15 分, 20 min). 时间紧, 必须留 5 min 检查拼写。' }
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

// ============= v18.10: 仓鼠 7 形态 SVG 自绘 (每个独立可视化) =============
// 每个形态有独立 SVG 插画, 越高阶越华丽: 蛋→宝宝→蝴蝶结→眼镜→学士帽→战甲→王冠披风
// SVG viewBox 48×48; 共用基础: 头/耳朵/眼睛/腮红/鼻嘴 (HAMSTER_BASE 函数)
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

function getCurrentPetForm(state) {
  const streak = (state.dailyStreak && state.dailyStreak.bestEver) || 0;
  let form = PET_FORMS[0];
  for (const f of PET_FORMS) if (streak >= f.minStreak) form = f;
  return form;
}

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
  { id: 'eq_all',     icon:'🏆', name:'装备全集齐',   desc:'解锁全部 45 件',     cat:'收藏', cond:s=>_countUnlockedEq(s)>=45 },
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
  { id: 'hidden_pet_dragon',icon:'🐉', name:'神龙伙伴',desc:'宠物进化到神龙',  cat:'隐藏', cond:s=>(s.pet&&s.pet.formIdx||0)>=6 }
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
  // 预测 PSLE 成绩 — 粗估: 总分越高 AL 越低(更好)
  // 4 科 AL 总分 = 总分映射 (假设 6000 分 = AL 6, 3000 分 = AL 12, 1000 分 = AL 20)
  let predAL = 24;
  if (predictedTotal >= 5500) predAL = 6;
  else if (predictedTotal >= 4500) predAL = 8;
  else if (predictedTotal >= 3500) predAL = 10;
  else if (predictedTotal >= 2500) predAL = 12;
  else if (predictedTotal >= 1500) predAL = 16;
  else predAL = 20;
  return { predictedTotal, predLv, predEqCount, predAL, daysLeft, avgDaily: Math.round(avgDaily * 10) / 10, breakRate };
}

// ============= v18 Phase 5.4: 🧪 mini-game 数据 (v18.3 升级 P5/P6 PSLE 难度) =============
// 60+ 题 PSLE 级别, 涵盖 分数 / 比例 / 速度 / 百分比 / 平均数 / 周长面积 / 小数 / 整数四则
// 都设计为答案是整数(便于输入), 30 秒答 10 题
const MATH_QUESTIONS = [
  // === 分数 (P5/P6 高频) ===
  { q: '3/4 + 1/4', ans: 1 },
  { q: '1/2 + 1/4 = ?/4', ans: 3 },
  { q: '5/6 - 1/3 = ?/2', ans: 1 },
  { q: '2/3 of 18', ans: 12 },
  { q: '3/5 of 25', ans: 15 },
  { q: '5/8 of 24', ans: 15 },
  { q: '7/10 of 50', ans: 35 },
  { q: '1/4 of 60', ans: 15 },
  { q: '4/5 of 30', ans: 24 },
  { q: '2/7 of 49', ans: 14 },
  // === 百分比 (P5/P6 重点) ===
  { q: '50% of 80', ans: 40 },
  { q: '25% of 60', ans: 15 },
  { q: '10% of 250', ans: 25 },
  { q: '20% of 45', ans: 9 },
  { q: '75% of 80', ans: 60 },
  { q: '40% of 150', ans: 60 },
  { q: '60% of 50', ans: 30 },
  { q: '15% of 200', ans: 30 },
  { q: '30% of 90', ans: 27 },
  { q: '5% of 400', ans: 20 },
  // === 速度 (PSLE 高频, distance/time) ===
  { q: '60 km in 2h, speed (km/h)', ans: 30 },
  { q: '120 km at 40 km/h, time (h)', ans: 3 },
  { q: '45 km/h × 2h = ? km', ans: 90 },
  { q: '180 km in 3h, speed', ans: 60 },
  { q: '20 km/h × 4h = ? km', ans: 80 },
  { q: '100 km at 25 km/h, time (h)', ans: 4 },
  { q: '50 km/h × 5h = ? km', ans: 250 },
  { q: '90 km in 1.5h, speed', ans: 60 },
  { q: '300 km at 60 km/h, time (h)', ans: 5 },
  // === 比例 ratio (P5 重点) ===
  { q: 'Ratio 2:3, total 25, larger', ans: 15 },
  { q: 'Ratio 1:4, total 30, larger', ans: 24 },
  { q: 'Ratio 3:5, smaller is 15, larger', ans: 25 },
  { q: 'Ratio 4:5, total 36, smaller', ans: 16 },
  { q: 'Ratio 2:7, total 27, smaller', ans: 6 },
  { q: 'Ratio 3:4 = 9:?', ans: 12 },
  { q: 'Ratio 5:2 = ?:6', ans: 15 },
  { q: 'A:B = 3:5, A=12, B', ans: 20 },
  { q: 'Ratio 2:3:5, total 50, biggest', ans: 25 },
  // === 平均数 ===
  { q: 'Avg of 4, 6, 8', ans: 6 },
  { q: 'Avg of 10, 20, 30, 40', ans: 25 },
  { q: 'Avg of 5, 7, 9, 11', ans: 8 },
  { q: 'Avg of 12, 15, 18', ans: 15 },
  { q: 'Sum 100, count 4, avg', ans: 25 },
  { q: '3 numbers avg 10, sum', ans: 30 },
  { q: '5 numbers avg 12, sum', ans: 60 },
  { q: 'Avg of 50, 60, 70, 80', ans: 65 },
  // === 周长 / 面积 ===
  { q: 'Square side 7, perimeter', ans: 28 },
  { q: 'Square side 9, area', ans: 81 },
  { q: 'Rectangle 5×8, area', ans: 40 },
  { q: 'Rectangle 6×4, perimeter', ans: 20 },
  { q: 'Square area 64, side', ans: 8 },
  { q: 'Square area 144, side', ans: 12 },
  { q: 'Rectangle 12×7, area', ans: 84 },
  { q: 'Square side 11, perimeter', ans: 44 },
  { q: 'Rectangle 15×4, perimeter', ans: 38 },
  // === 小数 ===
  { q: '0.5 × 0.4 (×100)', ans: 20 },
  { q: '0.25 + 0.75 (×100)', ans: 100 },
  { q: '1.5 × 4', ans: 6 },
  { q: '2.5 × 4', ans: 10 },
  { q: '0.1 × 100', ans: 10 },
  { q: '12.5 × 8', ans: 100 },
  { q: '0.6 × 50', ans: 30 },
  // === 整数四则(快速心算)===
  { q: '125 + 75', ans: 200 },
  { q: '300 - 175', ans: 125 },
  { q: '12 × 25', ans: 300 },
  { q: '15 × 15', ans: 225 },
  { q: '450 ÷ 9', ans: 50 },
  { q: '720 ÷ 8', ans: 90 },
  { q: '13 × 7', ans: 91 },
  { q: '17 × 6', ans: 102 },
  { q: '24 × 25', ans: 600 },
  { q: '999 + 1', ans: 1000 },
  // === 余数除法 ===
  { q: '47 ÷ 6, remainder', ans: 5 },
  { q: '100 ÷ 7, remainder', ans: 2 },
  { q: '85 ÷ 9, remainder', ans: 4 },
  // === GST / 折扣 (Singapore PSLE 高频) ===
  { q: 'Item $100, 9% GST, total ($)', ans: 109 },
  { q: 'Item $200, 10% off, pay ($)', ans: 180 },
  { q: 'Item $50, 20% off, pay ($)', ans: 40 },
  { q: 'Item $80, 25% discount, pay ($)', ans: 60 }
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
    blanks: ['Reading','words','improve','vocabulary','imagination'], voice:'en-GB' }
];

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
    listenGameRuns: 0
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
    content:'4 段结构: ① 开场(描景/动作)② 矛盾发生 ③ 高潮 ④ 反思. 每篇必含: 对话/心理描写/感官描写(声音/气味/视觉)/全文过去时. 写在 150-180 词. PSLE 作文 40 分, 缺任一元素扣 5 分。' },
  { subject:'📝 PSLE 英语作文', title:'高级词每篇 3 个加 5-10 分',
    content:'crestfallen(沮丧)/ jubilant(欢欣)/ dawned upon me(突然意识到)/ ecstatic(狂喜)/ apprehensive(忧心). 每篇用 3 个就比平均高 5-10 分。考前背 30 个高级词, 作文 25→35 分。' },
  { subject:'📝 PSLE 作文开头', title:'5 类开头模板',
    content:'描景(That sunny morning, the playground was bustling)/ 直接对话("Hurry up!" Mom shouted)/ 反问(Have you ever felt...)/ 感觉(My heart pounded)/ 倒叙(Looking back, I still remember). 5 类背一种 = 永远不卡第 1 句。' },
  { subject:'📖 Comprehension OE', title:'答案 90% 在原文找',
    content:'PSLE Comp OE 答案直接在文章里, 找到关键词附近的句子, 摘下来稍改即可。别"自己想"原创答案 — 评卷只看你有没有抓到原文核心词。3 分题答 3 个点, 缺 1 点扣 1 分。' },
  { subject:'📖 Comprehension', title:'定位法 4 步骤',
    content:'① 先看题不看文 ② 题目划关键词 ③ 文章里搜关键词附近段落 ④ 摘原文核心词答。这样 1 篇 800 字 Comp 能 5 min 答完, 比"先读全文"快 3 倍。' },
  { subject:'✍️ Cloze (一空一词)', title:'70% 是介词或冠词',
    content:'PSLE Cloze 最难的空多是: in/on/at/of/for/with(介词)和 a/an/the(冠词)。这两类没规律, 全靠搭配感 — 读多遇多次自然会。每次错都查同义词 + 词性 + 搭配, 入词汇错题本。' },
  { subject:'✍️ Cloze 介词搭配', title:'动词 + 介词 50 高频组合',
    content:'look at(看)/ look after(照顾)/ look for(找)/ look up(查字典)/ look out(小心)/ depend on(取决于)/ result in(导致)/ result from(由...引起)/ believe in(信任)/ believe sb(信某人). 这 50 组占 Cloze 50% 答案。' },
  { subject:'✏️ Editing', title:'5 类错占 95% 题目',
    content:'主谓一致 / 时态 / 拼写 / 介词 / 冠词 — PSLE Editing 95% 错都在这 5 类。建一个 Editing 错题本按这 5 类分类记, 1 个月内错率减半。每天写 5 段 Editing, 26 周 100 段。' },
  { subject:'✏️ Editing 时态错', title:'时间词 → 时态匹配',
    content:'yesterday/last week → 过去式(was/went). tomorrow/next week → 将来时(will go). now/currently → 现在进行(is going). 每段先扫时间词, 锁定时态, 错率减 80%。' },
  { subject:'📚 Grammar 套路', title:'PSLE Grammar MCQ 常考点',
    content:'if/unless 看主从句关系(unless = if not). since/for 看时长(since 时间点 / for 时间段). much/many 看可数(much water / many books). too/either 看肯否(too 肯定 / either 否定)。' },
  { subject:'📚 Grammar', title:'unless = if not 100% 等价',
    content:'"Unless you study, you will fail" = "If you do not study, you will fail". unless 后用肯定句, 因为 unless 本身含否定。 PSLE 高频混淆, 1 题 2-3 分。' },
  { subject:'🗣️ PSLE Oral', title:'Reading Aloud 3 大评分点',
    content:'语调起伏 + 句末停 1.5 秒 + 重读关键词 = 流畅感觉. 平淡读完 8-10 分; 有节奏 13-15 分. 录音 + 自评 10 次, 一周提 3 分。' },
  { subject:'🗣️ Stimulus 看图', title:'描述→联想→个人经历 3 步',
    content:'Stimulus 看图说话每点 2-3 句即可: ① 描述场景(who/what/where) ② 联想问题或感受 ③ 个人经历呼应。缺哪一步扣 1-2 分, 多说反扣分。' },
  { subject:'🎧 PSLE Listening', title:'90% 答案在转折后',
    content:'听到 "but / however / although / on the other hand" 立刻竖耳朵 — 题目要问的内容 95% 在转折后, 不是前半句。听力题最大陷阱: 听了前半句就抢答。' },
  { subject:'🎧 Listening 数字陷阱', title:'fifteen vs fifty 重音不同',
    content:'fifteen [fɪfˈtiːn] 重音在后, fifty [ˈfɪfti] 重音在前。PSLE Listening 数字题常考 7 对易混: 13/30, 14/40, 15/50, 16/60, 17/70, 18/80, 19/90。听到 -teen 重音 → 1X, -ty 轻 → X0。' },
  { subject:'🎧 Listening 训练', title:'每天 10 min 真实英语',
    content:'CNA938 / CNA Insider 每天 10-15 min 精听: ① 不查字典先全听一遍 ② 第二遍记 3-5 个新词 ③ 第三遍跟读模仿语调。SG 口音熟悉度比 BBC 帮助大。' },
  { subject:'🔗 Synthesis & Transformation', title:'10 分高分项',
    content:'PSLE Paper 2 顶端 10 分: 把 2 个简单句合并成 1 个复杂句, 或换句型不变意。常考: although/because/while/since/whose/which/who. W15 起每周 1h 专项, 24 周熟练 = 稳拿 10 分。' },
  { subject:'📚 Vocab 词汇', title:'PSLE 200 高频词 = Comp 80% 覆盖',
    content:'PSLE 阅读题里 80% 单词来自最高频 200 词。背完这 200 个 = 任何文章读懂大意, 不卡壳。每天 5 个, W30 完 100, W52 完 200。 v14 词汇表里就是这 200 个。' },
  { subject:'🇸🇬 PSLE 英语 Paper 1', title:'70 min 时间分配',
    content:'Paper 1 = Composition(50 分, 50 min)+ Situational Writing(15 分, 20 min)。时间紧, 必须留 5 min 检查拼写。Composition 计划 3 min + 写 40 min + 检查 7 min。' },
  { subject:'🇸🇬 PSLE 英语 Paper 2', title:'1h50min 6 部分顺序',
    content:'Paper 2 = Grammar MCQ + Vocab MCQ + Vocab Cloze + Visual Text + Comp Cloze + Comprehension OE。6 部分严格按顺序, 难度递增。前 4 部分 50 min, 后 2 部分 60 min。' },
  { subject:'🖼️ Visual Text 看图', title:'5 类信息源',
    content:'Visual Text(海报/广告/通知)看图答题。必看 5 类: ① 大字标题(主题)② 数字(日期/时间/价格)③ 图片暗示 ④ 联系方式 ⑤ 排版强调(粗体/颜色)。题型: Who / What / When / Where / Why / How much。' },
  { subject:'📝 PSLE 作文重写', title:'重写 = 真正的提分',
    content:'老师改完作文后必须照标重写一次 — 不重写 = 白改。重写时换更好的词、更紧凑的句、更感官的描写。 1 篇重写比写 3 篇新作文提分快 3 倍。' },
  { subject:'📖 Reading 速度', title:'240 wpm 是 PSLE 临界线',
    content:'低于 240 词/分钟 = Comp 题做不完。每天 5 min 计时阅读练 1 个月 → 速度提到 240+。用《Conquer Comprehension》或同等级文章计时。' },
  { subject:'📚 学科英语词汇 500', title:'数学 200 + 科学 300',
    content:'PSLE 数学/科学题干用专业英语: perimeter/area/volume(数学)/ photosynthesis/transpiration/xylem(科学)。看不懂题干 → 数学/科学也丢分。 v16 附录 B 收的 500 词, W17 完成。' },
  { subject:'✏️ Editing 5 大错', title:'分类记 → 错率减半',
    content:'主谓一致(he go→goes)/ 时态(yesterday I am→was)/ 拼写(recieve→receive)/ 介词(in vs on)/ 冠词(a/an/the). 错题本按 5 类分页, 不混着记, 1 月翻 3 次。' },
];

const SCIENCE_MASTER_TIPS = [
  { subject:'🔬 PSLE Science 答题模板', title:'OE 三大题型',
    content:'PSLE Science Open-Ended 三大题型: "What"→直接答名词 / "Why"→"because... so..." / "Compare"→用 unlike/whereas 对比关键差异. 所有 OE 答案必含原文核心词。' },
  { subject:'🔬 实验题 4 要素', title:'缺 1 个扣 1 分',
    content:'PSLE 实验题必含: ① Independent variable(改变啥 — 1 个) ② Dependent variable(测啥 — 1 个) ③ Controlled variables(保持不变 — 至少 2 个) ④ Hypothesis(预测 + 理由)。少哪个扣哪个 — 不是 partial credit, 是直接 0。' },
  { subject:'🔬 PSLE 8 大高频章', title:'占考试 70% 题量',
    content:'Plant Transport / Digestive / Light / Heat / Reproduction / Cells / Energy / Electricity — 这 8 章占 PSLE Science 70% 题量。复习抓这 8 章 = 抓 70% 分。' },
  { subject:'🔬 综合卷应试', title:'1h45min 时间分配',
    content:'严格 PSLE 时长(科学 1h45min)。MCQ 50min(2min/题, 快做不纠结)→ OE 50min(慢做仔细审题)→ 检查 5min。不会的 MCQ 标记跳过最后回头。OE 没思路就先写关键词不留空白。' },
  { subject:'🌳 Plant Transport', title:'芹菜染色实验答题',
    content:'Q: Why coloured water moves up celery? A: Water travels up the stem THROUGH the XYLEM BY transpiration. Water evaporates from leaves, creating SUCTION that pulls more water up. 关键词必含: xylem(木质部)/transpiration(蒸腾)/suction.' },
  { subject:'🌳 Plant Transport', title:'植物枯萎开放题',
    content:'Q: Why does the plant wilt? A: Leaves lose water faster than roots can absorb. Cells lose turgor pressure, plant wilts. Q: Why is xylem important? A: Transports water from roots to leaves for photosynthesis.' },
  { subject:'🍔 Digestive', title:'完整消化路径必背',
    content:'Mouth(saliva 含 amylase 消化淀粉)→ Esophagus(传送)→ Stomach(胃酸 + pepsin 消化蛋白)→ Small intestine(消化完成 + 吸收 nutrients to blood)→ Large intestine(吸水 + 形成 feces)→ Anus。每个器官的 function 一句话答清楚。' },
  { subject:'🍔 Digestive 营养素', title:'酶对应关系',
    content:'淀粉 starch → amylase(口腔/胰腺)→ glucose / 蛋白 protein → pepsin(胃)→ amino acids / 脂肪 fat → bile(肝制) + lipase(胰腺/小肠)→ fatty acids。PSLE Q: enzyme 在哪个器官最活跃? → 看 pH 和温度。' },
  { subject:'💡 Light & Shadow', title:'影子大小 vs 光源距离',
    content:'Q: Why bigger shadow when light is closer? A: As light source moves CLOSER to the object, MORE light is BLOCKED by the object, so shadow becomes LARGER. 反之 → 越远越小. 注意答案要说"more light blocked", 不能只说"shadow bigger"。' },
  { subject:'💡 Light 透光分类', title:'不透/半透/透明对比',
    content:'Opaque(不透)→ dark shadow / Translucent(半透, 如磨砂玻璃)→ light shadow / Transparent(透, 如玻璃)→ no shadow。PSLE 实验题: 控制光源位置 + 物体距离 + 物体材质 3 变量。' },
  { subject:'🔥 Heat 热传递', title:'三种区分模板',
    content:'Conduction(传导): solid 直接接触(金属勺烫)。Convection(对流): fluid(液/气)流动循环(暖气片在地面 — 热气上升)。Radiation(辐射): 无介质, 可穿真空(太阳到地球). Q "为什么 X 是 Y 传递" → 答介质 + 方向。' },
  { subject:'🔥 Heat 温度 vs 热', title:'易混高频陷阱',
    content:'温度 temperature(°C)= 热的程度(状态量). 热 heat(J)= 能量(总量). 同 100°C 的水: 1 杯 vs 1 桶, 温度一样但热量不同. 热膨胀: 遇热体积↑, 遇冷体积↓ — 题"为什么夏天电线下垂?" → expansion。' },
  { subject:'🌸 Reproduction', title:'花结构 + 受精流程',
    content:'花的结构 stamen(雄)= anther(花药)+ filament / pistil(雌)= stigma(柱头)+ style + ovary(子房). Pollination(传粉)= 花粉 anther → stigma. Fertilisation(受精)= 花粉 + ovule → seed. Methods: insect / wind / water。' },
  { subject:'🦠 Cells + Food Chain', title:'细胞结构对比 + 食物链',
    content:'动物细胞: cell membrane + cytoplasm + nucleus. 植物多 2 个: cell wall + chloroplast(叶绿体). Food chain: producer(植物 — make food)→ primary consumer(草食)→ secondary consumer(肉食)→ tertiary consumer / decomposer(分解). 箭头方向 = energy flow。' },
  { subject:'💧 Water Cycle', title:'4 步 + Air 组成',
    content:'水循环 4 步: evaporation(蒸发, 液→气)→ condensation(凝结, 气→液成云)→ precipitation(降水, 雨/雪)→ collection(汇集回海). Air 组成 = 78% nitrogen + 21% oxygen + 1% other. Weather 工具: thermometer / anemometer / rain gauge。' },
  { subject:'⚡ Electricity', title:'电路 + 用电安全',
    content:'电路 = battery(power source)+ wires + component(灯/电机)+ switch. 必须 closed circuit 闭合才有电流. Conductor(导体)= metals. Insulator(绝缘体)= plastic/wood/rubber/dry skin. 湿手不能碰电器(湿水是导体)。' },
  { subject:'⚡ Series & Parallel', title:'高频题型',
    content:'Series 串联: 1 个 path, 电流相同(same current), 电压分配(voltage shared). 一灯坏 → 全灭. Parallel 并联: 多 path, 电压相同, 电流分配. 一灯坏 → 其他正常. Q "为什么家里用并联?" → 一灯坏不影响 + 各设备独立电压。' },
  { subject:'🔋 Energy 形态', title:'7 种能量形态',
    content:'Kinetic(动能 — 移动物体)/ Potential(势能 — 高度/拉伸的弹簧)/ Sound 声 / Light 光 / Electrical 电 / Heat 热 / Chemical 化学(电池/食物). Q "骑车上山时哪种能量在变" → kinetic ↑↓ + potential ↑。' },
  { subject:'🔋 Energy Conversion', title:'转换链答题',
    content:'灯泡: electrical → light(useful)+ heat(wasted, 95%!). 风扇: electrical → kinetic. 太阳能板: light → electrical. 化石燃料发电: chemical → heat → kinetic → electrical. 答题用 → 箭头, 标 useful/wasted energy。' },
  { subject:'🌍 Adaptation', title:'P6 难章高频',
    content:'仙人掌的"刺"是退化的叶 — 减少蒸腾。它的"绿色枝干"才是光合主力. 适应(Adaptation)= 百万年自然选择, 不是个体反应. PSLE 易混: adaptation(物种变化)vs response(个体反应, 如开花闭合)。' },
  { subject:'🧪 PSLE 真题应试', title:'考前 1 个月策略',
    content:'考前 1 个月不学新东西, 只: ① 错题本第 3 轮重做(神经科学: 3 次重复才入长期记忆) ② 真题严格计时 ③ 错题分类(粗心/概念/题型). 临时抱佛脚反而扰乱。' },
];

const MATH_MASTER_TIPS = [
  { subject:'➗ PSLE Math 4 大 Heuristics', title:'Model Drawing / Table / Backwards / Show All',
    content:'PSLE 数学 4 大解题套路: ① Model Drawing(线段图)② Make a Table ③ Work Backwards ④ Show ALL Working. 不会用任一种 = 难题肯定丢分. 4 种各练 5 题 = 全套熟练。' },
  { subject:'➗ Math 时间分配', title:'Paper 2 17 题 6 min/题',
    content:'PSLE Math Paper 2 一共 1h45min, 17 道大题 → 平均 6 min/题。最后 4 道难题留 30 min, 检查 5 min。前 13 道严格 5 min/题, 难的留更多时间。' },
  { subject:'➗ Bar Graph 题', title:'必看 axis label',
    content:'多数学生跳过 y 轴单位 — 然后答出 "10 个" 而不是 "10 千克". PSLE 数据题 30% 错在没读单位. 先看坐标轴 → 再看数据 → 再答题。' },
  { subject:'➗ Math 难题', title:'限时 30min 不死磕',
    content:'限时 30min. Heuristic 4 选 1 试. 做不出抄题型 + 思路下次回看, 不死磕超 45min. 1 道难题花 1h 不如花在 5 道中等题。' },
  { subject:'➗ Math 错题本', title:'抄题 → 原因 → 正解',
    content:'每错一题写: ① 抄题完整 ② 错的原因(粗心/公式/题型陌生) ③ 正确解法. 每题 3 行, 周末重做. 第 3 次重做才真正会。' },
  { subject:'➗ PSLE 比例题', title:'高频题型',
    content:'比例题 = PSLE 高分题. 模板: 设单位 → 列方程 → 验证. 例: A:B = 2:3, A 多 6 → 1 unit = 6, A=12 B=18. 别用代数, 用 unit 思维。' },
];

const CHINESE_MASTER_TIPS = [
  { subject:'🇨🇳 PSLE 华文作文', title:'5 类开头 + 5 成语',
    content:'5 类开头(描景/引句/反问/排比/对话)+ 5+ 成语 / 谚语 + 心理描写细致. 背 5 个固定开头 = 永远写得出第一段. 每篇用 3-5 个成语, 1 篇作文从 25→32 分。' },
  { subject:'🇨🇳 PSLE 华文 Paper 1+2', title:'时间分配',
    content:'PSLE 华文 Paper 1 = 作文(50min). Paper 2 = 阅读理解 + 综合(1h50min). 分开计时严格执行, 别让 Paper 2 拖累 Paper 1。' },
  { subject:'🇨🇳 华文 OE 答题', title:'找句子原文 + 四字概括',
    content:'PSLE 华文 OE: 找句子原文位置 + 用四字词概括 + 注意"为什么/有什么影响"格式. 答案直接从原文找, 不要自己原创. 抓核心词答题。' },
  { subject:'🇨🇳 华文阅读', title:'抓 5 个关键人物/事件',
    content:'PSLE 华文阅读理解: 先扫一遍找 5 个关键(人物/时间/地点/事件/结果), 再回头答题. 跟英语 Comp 一样, 定位法 4 步。' },
  { subject:'🇨🇳 华文综合', title:'听写 + 阅读 + 看图',
    content:'综合题 = 听写 + 阅读 + 看图. 听写最难, 平时多听 cna938 中文台 + 读古诗培养语感. 看图作文用记叙文结构 4 段。' },
  { subject:'🇨🇳 华文作文老师', title:'每周 1 篇必交',
    content:'华文作文每周 1 篇必交老师改. 改完照标重写一次 — 不重写 = 白改. 30-50 SGD/篇, 这是最不该省的钱。' },
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
