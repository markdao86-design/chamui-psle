// PSLE 2027 完整备考总手册 v18 — 教辅全覆盖排程版 (2026-09-02 起)
// v17→v18: 时间窗更新(周四/周六全天不可用); 15本实有教辅逐本排程+二刷;
// 三agent审计修正: 阅读OE专项补强/套卷总账收口/整卷弹性时长/无缝接续/批改分工
const docx = require("C:\\Users\\Eric\\AppData\\Roaming\\npm\\node_modules\\docx");
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  LevelFormat, PageBreak, Header, Footer, PageNumber
} = docx;

const FONT = "Microsoft YaHei";
const C = {
  title: "1F4E79", red: "C00000", orange: "C55A11", green: "538135", gray: "595959",
  lightBlue: "DEEBF7", lightRed: "FDE9E9", lightYellow: "FFF2CC", lightGreen: "E2EFDA", lightGray: "F2F2F2",
};

function run(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: opts.size || 21, bold: !!opts.bold, color: opts.color || "000000" });
}
function p(children, opts = {}) {
  if (typeof children === "string") children = [run(children, opts)];
  return new Paragraph({ children, alignment: opts.align, spacing: { before: opts.before ?? 60, after: opts.after ?? 60, line: 300 } });
}
function h1(text) {
  return new Paragraph({
    children: [run(text, { size: 30, bold: true, color: C.title })],
    heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 140 },
    border: { bottom: { color: C.title, style: BorderStyle.SINGLE, size: 6, space: 2 } },
  });
}
function h2(text, color = C.title) {
  return new Paragraph({ children: [run(text, { size: 24, bold: true, color })], heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 100 } });
}
function bullet(children, ref = "b1") {
  if (typeof children === "string") children = [run(children)];
  return new Paragraph({ children, numbering: { reference: ref, level: 0 }, spacing: { before: 40, after: 40, line: 300 } });
}
function cell(content, opts = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map((c) =>
    typeof c === "string"
      ? new Paragraph({ children: [run(c, { size: opts.size || 20, bold: !!opts.bold, color: opts.color })], alignment: opts.align || AlignmentType.LEFT, spacing: { before: 20, after: 20, line: 280 } })
      : c
  );
  return new TableCell({
    children: paras, width: { size: opts.w, type: WidthType.DXA },
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 }, verticalAlign: "center",
  });
}
function table(widths, rows) {
  return new Table({ columnWidths: widths, width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, rows });
}
function headerRow(cells, widths, fill = C.lightBlue) {
  return new TableRow({ tableHeader: true, children: cells.map((t, i) => cell(t, { w: widths[i], bold: true, fill, align: AlignmentType.CENTER })) });
}
function dataRow(cells, widths, opts = {}) {
  return new TableRow({ children: cells.map((t, i) => cell(t, { w: widths[i], align: opts.aligns ? opts.aligns[i] : AlignmentType.LEFT, bold: opts.bolds ? opts.bolds[i] : false, color: opts.colors ? opts.colors[i] : undefined, fill: opts.fill, size: opts.size || 19 })) });
}

const kids = [];

// ============ 封面 ============
kids.push(
  new Paragraph({ children: [run("", {})], spacing: { before: 1400 } }),
  new Paragraph({ children: [run("PSLE 2027 完整备考总手册", { size: 52, bold: true, color: C.title })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  new Paragraph({ children: [run("v18.6 · 教辅全覆盖排程版(每日成绩单)", { size: 34, bold: true, color: C.red })], alignment: AlignmentType.CENTER, spacing: { after: 440 } }),
  new Paragraph({ children: [run("学生：新加坡 P5 在读(DP)，2027.9 参加 PSLE", { size: 22, color: C.gray })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
  new Paragraph({ children: [run("基准(2026.8校考)：英语 AL6｜华文(普华) AL2｜科学 AL3｜数学 AL1｜总分 AL12 → 目标 AL6·务实 AL8", { size: 22, color: C.gray })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
  new Paragraph({ children: [run("本版核心：家中16本+新购12本教辅逐本排到天，真题年份分池，2027.7.31前全覆盖", { size: 24, bold: true, color: C.red })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
  new Paragraph({ children: [run("时间窗：周一16:00·周二三五15:00到家即正式开始(作业课间已清)｜周日下午+晚上｜周四·周六全天另有安排｜21:30收工", { size: 20, color: C.gray })], alignment: AlignmentType.CENTER, spacing: { after: 380 } }),
  new Paragraph({ children: [run("排程经三重独立审计(容量核算/覆盖死线/教学合理性)修正后定稿", { size: 20, bold: true, color: C.title })], alignment: AlignmentType.CENTER, spacing: { after: 460 } }),
  new Paragraph({ children: [run("制定日期 2026.9.2 · 距笔试约56周 · 执行按44周排(留8周垫)", { size: 18, color: C.gray })], alignment: AlignmentType.CENTER }),
  new Paragraph({ children: [new PageBreak()] })
);

// ============ 一、全景 ============
kids.push(h1("一、备考全景"));
kids.push(h2("1.1 成绩、错因与主攻方向"));
{
  const w = [1300, 1300, 2200, 4200];
  kids.push(table(w, [
    headerRow(["科目", "现状→目标", "8月丢分(错因)", "主攻动作"], w),
    dataRow(["英语", "AL6→AL4冲3", "阅读OE -7(没答完整3/没读懂2/题意1/粗心1)；Editing -5(陷阱3/超纲1/语法1)；词汇-1；语法-1", "唯一大短板、要抬两三级, 全案近半资源在此。第一伤口是阅读开放问答, 每周3篇专项+家长踩点批改；Editing每周4篇+错题二刷；词汇超纲收集本"], w, { colors: [C.red], bolds: [true] }),
    dataRow(["科学", "AL3→AL2冲1", "选择题-8(薄弱模块没学明白)；大题-1.5(说错点+关键词拼写)", "P3-P5拉通18章(概念→诊断→回炉)；每章手写5张标准表述卡治术语"], w, { colors: [C.orange], bolds: [true] }),
    dataRow(["华文", "AL2→AL1", "阅读大题-7(漏点, 不是粗心)", "每周真题阅读踩点1篇：按分值数点+对marking scheme逐点核对"], w, { colors: [C.green], bolds: [true] }),
    dataRow(["数学", "AL1维持", "无大问题", "三周1次半卷限时+每4周整卷, 粗心错题本"], w, { colors: [C.green], bolds: [true] }),
  ]));
}
kids.push(p([
  run("审计纠偏：", { bold: true, color: C.red }),
  run("英语最大丢分项是阅读开放问答(7分)而非Editing(5分)——本版把阅读OE提为每周固定3篇的第一专项，此前版本此处配置为零。英华共14分丢在「会做但没写全」，开放题一律家长按采分点逐点批，孩子自批治不了这个病。", {}),
], { before: 100 }));
kids.push(h2("1.2 每周结构一览(5个可用日)"));
{
  const w = [1300, 2300, 5400];
  kids.push(table(w, [
    headerRow(["日", "学习窗口", "当日主线"], w),
    dataRow(["周一", "16:00–21:30", "英语改错语法35+阅读OE40 + 科学概念35+OE表述卡30 + 订正30｜约170分, 中途休息3次"], w),
    dataRow(["周二", "15:00–21:30", "英语Cloze词汇35+听说30 + 华文45 + 订正30 + 词汇背默30｜约170分, 休息4次"], w),
    dataRow(["周三", "15:00–21:30", "英语改错语法40+阅读OE40+Synthesis20 + 科学诊断35 + 错题复盘35｜约170分"], w),
    dataRow(["周四", "全天另有安排", "—(不排任何任务)"], w, { fill: C.lightGray }),
    dataRow(["周五", "15:00–21:30", "英语Cloze词汇35+Synthesis25 + 三周轮换35 + 二刷35 + 指标卡25｜约155分"], w),
    dataRow(["周六", "全天另有安排", "—(不排任何任务)"], w, { fill: C.lightGray }),
    dataRow(["周日", "15:00–21:30", "作文55 + 整卷(按科100–160) + 家长批改35 + 口语25 + 周复盘20｜约240–300分"], w, { bolds: [true] }),
  ]));
}
kids.push(p("周正式任务约14小时+睡前单词约2.5小时。时间按孩子实际节奏放宽约1.4倍，单块≤45分钟，块间必休息，慢做但做对做完整。睡前档全部改为三段式背单词(10分新词+10分滚动复习+10分自测)，直击词汇超纲与词汇辨析两个弱项。", { color: C.gray }));

// ============ 二、教辅总账 ============
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(h1("二、教辅总账：16本逐本排程(全覆盖+二刷)"));
kids.push(p([
  run("每本书三要素：周消耗量、落在哪个时段、完成死线。", { bold: true }),
  run("总账经容量审计收口：P5册做完当周无缝接P6册(不等新年)；套卷总量已对齐周日槽位。", {}),
]));
kids.push(h2("英语(11本)", C.red));
{
  const w = [2900, 1300, 2300, 1500, 1000];
  kids.push(table(w, [
    headerRow(["教辅", "总量", "周消耗·时段", "一刷死线", "二刷"], w),
    dataRow(["E1 Grammar MCQs Explained P5(剩余)", "约300题", "24题·周一/三主段各12", "2026.11中", "—"], w),
    dataRow(["E2 Grammar MCQs Explained P6", "约550题", "24题·E1完当周无缝接续", "2027.5中", "错题级"], w),
    dataRow(["E3 Editing Explained P5(剩余)", "约30篇", "4篇·周一/三主段各2", "2026.10中", "—"], w),
    dataRow(["E4 Editing Explained P6", "约60篇", "4篇·接E3续刷", "2027.2底", "错题级3–6月"], w),
    dataRow(["E5 Cloze Techniques 5(剩余)", "约20篇", "2篇·周二/五主段各1", "2026.11中", "—"], w),
    dataRow(["E6 Cloze Techniques 6", "约35篇", "2篇·接E5续刷", "2027.3底", "错题级"], w),
    dataRow(["E7a Conquer English Vocabulary Workbook 5", "约1000题", "50题·周二/五各25题(15分)", "2027.2底", "错词背默"], w),
    dataRow(["E7b Conquer English Vocabulary Workbook 6", "约1000题", "50题·接E7a续刷；假期每周+25题攒缓冲", "2027.7中", "错词背默"], w),
    dataRow(["E8 Model Compositions Book 5(范文)", "约30篇", "周日单周作文段范文拆解15分·约24篇, 跳过重复题材", "2027.7", "写作前重读同题材"], w),
    dataRow(["E9 EPH P6 Practice Package", "15套(封面标定)", "分池: 套1–8整卷专用(3–7月周日)｜套9–15拆件专用(阅读OE桥接4–5月+二刷题源)。一套不两用", "2027.7底", "错题级"], w),
    dataRow(["E10 Synthesis & Transformation P5", "约45单元", "2单元·周三/五各1", "2027.2底(刷完接新购P6册)", "错题+高频句型"], w),
  ]));
}
kids.push(h2("科学(3本)+华文(2本)", C.orange));
{
  const w = [2900, 1300, 2300, 1500, 1000];
  kids.push(table(w, [
    headerRow(["教辅", "总量", "周消耗·时段", "一刷死线", "二刷"], w),
    dataRow(["Science For Primary Levels 5/6(开放题为主)", "按册", "Level 5部分: 周一晚开放题2道, 跟拉通章节同步(审计修正: 立即启用, 不推迟到2027)", "2027.7(Level 6随P6进度)", "错题重做"], w),
    dataRow(["Science Daily OE P4", "约60道", "降级为周五科学回炉段补漏材料: 专打诊断出的P3/P4主题漏洞, 每次2道", "2027.4", "—"], w),
    dataRow(["Conquer Science P4 模拟卷", "约10套", "分池: 套1–6·2026年周日科学整卷｜套7–10·周五回炉拆件。互不越界", "2027.2底", "—"], w),
    dataRow(["伴你阅读五上·五下", "共约60课", "双周1课精读(周二, 与真题踩点交替)。睡前档已让给单词, 全书覆盖不做硬承诺(语感材料)", "不设死线", "—"], w),
  ]));
}
kids.push(h2("新购12本(2026.9采购, 到货后核对总量)", C.red));
{
  const w = [2900, 2600, 1500, 1000];
  kids.push(table(w, [
    headerRow(["教辅", "周消耗·时段", "一刷死线", "备注"], w),
    dataRow(["Conquer Comprehension P5", "2篇·周一/三阅读OE段", "2026.12中", "阅读OE主粮"], w),
    dataRow(["Conquer Comprehension P6", "2篇·接P5册, 与升P6同步爬坡", "2027.4底", "之后EPH拆件桥接"], w),
    dataRow(["PSLE English Yearly 真题", "周日英语整卷(与EPH套1–8轮流)+5–7月真题期", "2027.7.31", "阅读段兼作真题期OE供给"], w),
    dataRow(["PSLE English Listening 专项(带音频)", "1节·周二听说段", "2027.8", "口试听力弹药"], w),
    dataRow(["英语口试专项(朗读+看图会话SBC)", "周二听说段+周日口语段共用", "2027.8口试", "审计补漏: 原两时段无材料"], w),
    dataRow(["Synthesis & Transformation P6", "2单元·接P5册(约2027.3起)", "2027.7", "审计补漏: P5册半程耗尽"], w),
    dataRow(["PSLE Science Topical 题库(名校版)", "15题·周三诊断段", "拉通20周+二轮", "选名校题源, 避免与Yearly同题"], w),
    dataRow(["PSLE Science Yearly 真题", "2027年起周日科学整卷。整年份封存, 不拆件", "2027.7.31", ""], w),
    dataRow(["MC PSLE Science Revision Guide", "周一概念段主教材: 按薄弱模块优先, 与周三诊断同章联动, 不按目录线性读; P6未学章等学校教完", "拉通期", ""], w),
    dataRow(["PSLE Mathematics Yearly 真题", "分池: 旧5年·周五半卷限时｜近5年封存·周日整卷", "2027.7.31", "数学整卷降频每6–8周"], w),
    dataRow(["PSLE 华文 Yearly 真题", "分池: 旧5年·周二拆件踩点(双周)｜近5年封存·周日整卷(每8周+真题期)", "2027.7.31", ""], w),
    dataRow(["PSLE 华文阅读理解专项册", "1篇·周二踩点主粮+周五华文加练", "2027.6", "审计补漏: 真题一书三用会烧光"], w),
  ]));
}
kids.push(p([
  run("真题铁律(审计结论)：", { bold: true, color: C.red }),
  run("每科真题按年份分池——旧年份拆件练、近5年整封不动只做限时整卷。做过一半的卷再限时, 成绩是假的。分池写在书扉页, 全家遵守。", {}),
], { before: 100 }));
kids.push(h2("二刷口径(统一为错题级)"));
kids.push(bullet([run("制度内二刷：", { bold: true }), run("每单周五30分「本周错题二刷」——Editing/Grammar/Cloze/Synthesis当周错题全部重做")], "b1"));
kids.push(bullet([run("考前二刷(3–6月)：", { bold: true }), run("Editing P6错题+同陷阱类型补2篇(周一主段)；Synthesis错题+高频句型约20单元(周三段)；Cloze错题(周五)")], "b1"));
kids.push(bullet([run("终刷(8月)：", { bold: true }), run("全科错题本三刷，零新题。不承诺任何「整本二刷」——时间账上不存在，错题率>40%的书才升级讨论")], "b1"));

// ============ 三、每日时段模板 ============
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(h1("三、每日时段模板(全天时刻表)"));
kids.push(bullet([run("每晚≤3个学习块", { bold: true }), run("；50分以上的块中间站起来2分钟。手机/平板放房间外，中途碰=该块作废重来")], "b1"));
kids.push(bullet([run("节奏为「效率不高但保质保量」设计：", { bold: true }), run("同样任务量给约1.4倍时间, 慢慢做做对做完整；单块≤45分钟, 块间必休息15–20分；下午主块+晚间轻块(订正/背默/复盘), 全天无大段空档")], "b1"));
kids.push(bullet([run("批改分工：", { bold: true }), run("MCQ类(Grammar/Cloze/科学选择)孩子当场自批；所有开放题(英语阅读OE/华文阅读/科学大题/作文)家长按采分点逐点批，标出漏了哪个点")], "b1"));

const dayTableW = [1900, 1600, 5500];
function dayBlock(title, color, rows, note) {
  kids.push(h2(title, color));
  kids.push(table(dayTableW, [
    headerRow(["时间", "安排", "内容与教材"], dayTableW),
    ...rows.map((r) => new TableRow({ children: [
      cell(r[0], { w: dayTableW[0], align: AlignmentType.CENTER, fill: r[4] }),
      cell(r[1], { w: dayTableW[1], bold: true, align: AlignmentType.CENTER, color: r[3], fill: r[4] }),
      cell(r[2], { w: dayTableW[2], fill: r[4] }),
    ]})),
  ]));
  if (note) kids.push(p(note, { before: 80, color: C.gray }));
}
const REST = C.lightGray;

dayBlock("周一(16:00正式开始)", C.title, [
  ["16:00–16:35", "英语①改错+语法(35分)", "《Editing for Spelling and Grammar Explained》2篇+《Grammar MCQs Explained》12题(均P5册刷完接P6册)。不赶时间, 每题读完再答, 错因当场标[陷阱/超纲/语法点]", C.red],
  ["16:35–16:50", "休息(15分)", "站起来活动+喝水", C.gray, REST],
  ["16:50–17:30", "英语②阅读OE(40分)", "《Conquer Comprehension》1篇(P5册→2027年起P6册→4月后EPH拆件桥接)。按「答完整」框架慢写: 定位→改写→完整句→回读自查。写完留给家长批", C.red],
  ["17:30–17:45", "休息(15分)", "点心", C.gray, REST],
  ["17:45–18:20", "科学·概念(35分)", "《MC Science Revision Guide》本周章读透+自画概念图讲一遍。按薄弱模块优先排章不按目录顺读, 与周三诊断同章联动; P6未学章等学校教完再排。今天只管「学明白」", C.orange],
  ["18:20–19:10", "晚饭+休息", "", C.gray, REST],
  ["19:10–19:40", "户外/散步", "", C.gray, REST],
  ["19:40–20:10", "科学·开放题+表述卡(30分)", "《Science For Primary Levels 5/6》开放题2道(Level 5部分, 跟本周拉通章节走)+手写标准表述卡2张, 慢慢写, 拼写要对", C.orange],
  ["20:10–20:40", "订正与收尾(30分)", "今日错题登记入本; 家长批完的阅读OE看批注+补写漏点", C.gray],
  ["20:40–21:00", "洗漱", "", C.gray, REST],
  ["21:00–21:30", "睡前单词(30分)", "三段式: 10分新词5–8个(超纲本+今日阅读生词, 混脸熟不求拼写)→10分滚动复习(昨天/3天前/上周三档)→10分自测(家长报义孩子默, 错词进次日队列)。21:30熄灯", C.red],
]);
dayBlock("周二(15:00正式开始)", C.title, [
  ["15:00–15:35", "英语①Cloze+词汇(35分)", "《Comprehension Cloze Techniques》1篇(Book 5刷完接Book 6)先通读再填+《Conquer English Vocabulary》25题(Workbook 5→6)", C.red],
  ["15:35–15:50", "休息(15分)", "", C.gray, REST],
  ["15:50–16:20", "英语②听说(30分)", "结构化三样轮做: 口试专项朗读1篇录音回听/看图会话SBC 1题/《PSLE Listening》真题1节(带音频)", C.red],
  ["16:20–16:40", "休息(20分)", "点心", C.gray, REST],
  ["16:40–17:25", "华文(45分)", "单周: 《华文阅读理解专项册》或旧5年真题拆件1篇, 按分值数点慢慢写全; 双周: 伴你阅读精读1课。近5年真题不许碰(封存做整卷)", C.green],
  ["17:25–18:20", "户外/自由", "", C.gray, REST],
  ["18:20–19:10", "晚饭+休息", "", C.gray, REST],
  ["19:10–19:40", "订正与收尾(30分)", "华文对marking scheme逐点核对(家长参与), 漏的点抄标准表述; 错题入本", C.green],
  ["19:40–20:00", "休息(20分)", "", C.gray, REST],
  ["20:00–20:30", "词汇周清测(30分)", "测上周全部新词+《Conquer English Vocabulary》错词: 家长报义或遮盖自默, 错词归档回睡前本。与睡前档分工: 睡前管每日输入, 这里管每周检测", C.red],
  ["20:30–21:00", "洗漱", "", C.gray, REST],
  ["21:00–21:30", "睡前单词(30分)", "三段式同周一。今日Cloze/阅读生词优先入新词段", C.red],
]);
dayBlock("周三(15:00正式开始)", C.title, [
  ["15:00–15:40", "英语①改错+语法(40分)", "Editing 2篇+Grammar 12题, 同周一节奏, 慢做做对", C.red],
  ["15:40–15:55", "休息(15分)", "", C.gray, REST],
  ["15:55–16:35", "英语②阅读OE(40分)", "《Conquer Comprehension》1篇(本周第2篇)+回读自查, 留家长批", C.red],
  ["16:35–16:55", "休息(20分)", "点心", C.gray, REST],
  ["16:55–17:15", "英语③句型转换(20分)", "《Synthesis and Transformation》1单元, 对答案标错", C.red],
  ["17:15–18:15", "户外/自由", "", C.gray, REST],
  ["18:15–19:05", "晚饭+休息", "", C.gray, REST],
  ["19:05–19:40", "科学·选择题诊断(35分)", "《Science Topical题库》按本周章15题: 限时22分做+对答案订正13分。错的章节记上薄弱清单, 周五回炉", C.orange],
  ["19:40–20:00", "休息(20分)", "", C.gray, REST],
  ["20:00–20:35", "错题集中复盘(35分)", "本周英语+科学错题过一遍; 抽背标准表述卡5张。间隔了几小时再看, 记得更牢", C.gray],
  ["20:35–21:00", "洗漱", "", C.gray, REST],
  ["21:00–21:30", "睡前单词(30分)", "三段式同周一。注意: 今晚新词显式排进周五自测段, 别让周四空档断了间隔链", C.red],
]);
dayBlock("周四(全天另有安排)", C.orange, [
  ["全天", "—", "不排任何本手册任务", C.gray, REST],
]);
dayBlock("周五(15:00正式开始)", C.title, [
  ["15:00–15:35", "英语①Cloze+词汇(35分)", "Cloze 1篇+Vocabulary 25题", C.red],
  ["15:35–15:50", "休息(15分)", "", C.gray, REST],
  ["15:50–16:15", "英语②Synthesis(25分)", "1单元(本周第2个)+对答案", C.red],
  ["16:15–16:35", "休息(20分)", "点心", C.gray, REST],
  ["16:35–17:10", "三周轮换(35分)", "第1种: 数学旧5年真题半份Paper1限时15题+订正(近5年封存); 第2种: 科学薄弱回炉(《Science Daily》P4补漏2道+《Conquer Science P4》套7–10拆题, 专打诊断出的漏洞); 第3种: 华文加练(《华文阅读理解专项册》1篇)。按周循环", C.green],
  ["17:10–18:15", "户外/自由", "", C.gray, REST],
  ["18:15–19:05", "晚饭+休息", "", C.gray, REST],
  ["19:05–19:40", "错题二刷(35分)", "本周改错/语法/完形/句型转换/阅读OE错题全部重做(审计定: 此段固定吃错题不吃新题, 阅读新题量由周一/三专项册保障)", C.red],
  ["19:40–20:00", "休息(20分)", "", C.gray, REST],
  ["20:00–20:25", "指标卡+错题本整理(25分)", "从每日成绩单汇总周计分卡(英语逐模块); 全周错题本归档, 标记周日重点", C.gray],
  ["20:25–21:00", "洗漱/自由", "计分卡全达标周: 下周五二刷段免掉", C.gray, REST],
  ["21:00–21:30", "睡前单词(30分)", "三段式同周一。自测段补测周三新词(接上间隔链)", C.red],
]);
dayBlock("周六(全天另有安排)", C.green, [
  ["全天", "—", "不排任何本手册任务", C.gray, REST],
]);
dayBlock("周日(15:00开始 · 攻坚日)", C.red, [
  ["15:00–15:55", "作文(55分)", "四周循环: W1英语整篇/W2华文整篇/W3英语整篇/W4英语提纲练20分(数学整卷周减载)。英语=范文拆解15分+仿写40分, 情景写作与记叙文轮换", C.red],
  ["16:05–最晚18:45", "限时整卷(按科弹性)", "轮动(弱科加频): 英→科→英→数→英→科→华(华文每8周/数学每6–8周)。题源: 英语《English Practice Package》套1–8与English Yearly轮流110分/科学2026年《Conquer Science P4》套1–6→2027年Science Yearly封存卷105分/华文近5年封存真题100分/数学近5年封存真题P1 60分+休10分+P2 90分。严格计时, 拆过件的年份不做整卷", C.red],
  ["整卷后–19:15", "晚饭+自由", "数学周晚饭稍后移", C.gray, REST],
  ["19:15–19:50", "家长批改(35分)", "只批开放题: 按采分点逐点勾, 每题标漏了哪个点; 作文按PSLE双维度(内容20+语言20)给分并对照范文。孩子在旁边看着批, 当场明白漏在哪。每月挑1篇作文送学校老师/外部批改校准。MCQ部分孩子下午已自批", C.title],
  ["19:50–20:15", "口语(25分)", "英华各12分情景对话；2027年4月起家长扮考官模拟问答", C.orange],
  ["20:15–20:35", "周复盘(20分)", "孩子按PSLE模块念计分卡, 按响应规则定下周动作, 翻看下周章节", C.title],
]);

// ============ 四、科学拉通(18章) ============
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(h1("四、科学 P3–P5 拉通路线图(18章版)"));
kids.push(p([
  run("审计修正：P3–P5考点实为18–20个主题，14章排不完；大章占两周，允许收官滑到1月。", {}),
  run("周节奏：周一概念20分 → 周三诊断15题 → 双周五回炉 → 周日科学整卷检验。", { bold: true }),
]));
{
  const w = [2100, 4500, 2400];
  kids.push(table(w, [
    headerRow(["阶段", "章节(小章1周·大章2周)", "检验"], w),
    dataRow(["2026.9–10 (W1–W8)", "生物分类→材料→生命周期→繁殖(大章×2周)→物质三态→水循环", "每章诊断≥80%过关; W8=追赶周(清欠账)"], w),
    dataRow(["2026.11–12 假期(W11–W17)", "光→热→细胞→植物运输(大)→消化→呼吸循环(大)→电路", "假期每章加做开放题; 薄弱清单集中清零"], w, { fill: C.lightYellow }),
    dataRow(["2027.1 (W18–W21)", "磁铁→遗留补漏→一轮总测(完整卷2套)", "总测对照8月: 选择题失分减半"], w),
    dataRow(["2027.2", "二轮: 只扫清单未清零章节", "清单归零=拉通完成"], w),
    dataRow(["2027.3起", "并入套卷; P6新章(力/环境/能量)学完即滚动", "锁AL2冲AL1"], w),
  ]));
}
kids.push(bullet([run("标准表述卡(治大题-1.5分)：", { bold: true }), run("每章孩子手写5张完整句卡片(如 Light travels in a straight line)，周三错题段抽背5张。写卡的过程就是治关键词拼写")], "b1"));
kids.push(bullet([run("薄弱清单铁规则：", { bold: true }), run("贴书桌，超3章未清零→暂停新章先清旧账")], "b1"));

// ============ 五、逐周表 ============
kids.push(h1("五、阶段一逐周表(2026.9.2–12.31) + 后续框架"));
kids.push(p("固定量见第二章总账，本表只列变量。W9–W10预留学校年末考(计划停摆跟学校走)。", { color: C.gray }));
{
  const w = [800, 1600, 2500, 1900, 2200];
  const weeks = [
    ["W1", "9.2–9.6", "生物分类与多样性", "英语作文", "英语整卷(EPH套1)"],
    ["W2", "9.7–9.13", "材料与性质", "华文作文", "科学整卷(Conquer P4卷)"],
    ["W3", "9.14–9.20", "生命周期", "英语作文", "英语整卷(EPH套2)"],
    ["W4", "9.21–9.27", "繁殖(上)", "英提纲20分", "数学整卷(真题P1+P2)"],
    ["W5", "9.28–10.4", "繁殖(下)", "英语作文", "英语整卷"],
    ["W6", "10.5–10.11", "物质三态", "华文作文", "科学整卷(Conquer P4卷)"],
    ["W7", "10.12–10.18", "水循环", "英语作文", "华文整卷(封存真题1)"],
    ["W8", "10.19–10.25", "追赶周: 无新章只清欠账", "英提纲20分", "英语整卷(EPH套3)"],
    ["W9", "10.26–11.1", "学校SA2备考(手册停摆)", "跟学校", "跟学校"],
    ["W10", "11.2–11.8", "学校SA2考试周", "跟学校", "考后错因并入手册"],
    ["W11", "11.9–11.15", "光", "英语作文", "英语整卷"],
    ["W12", "11.16–11.22", "热", "华文作文", "科学整卷(Conquer P4卷)"],
    ["W13", "11.23–11.29", "细胞", "英语作文", "英语整卷(English Yearly封存卷)"],
    ["W14", "11.30–12.6", "植物运输(上)", "英提纲20分", "数学整卷"],
    ["W15", "12.7–12.13", "植物运输(下)+消化(上)", "英语作文", "英语整卷"],
    ["W16", "12.14–12.20", "消化(下)+呼吸循环(上)", "华文作文", "科学整卷(Conquer P4卷)"],
    ["W17", "12.21–12.27", "呼吸循环(下)+电路", "英语作文", "华文整卷(封存真题2)"],
  ];
  kids.push(table(w, [
    headerRow(["周", "日期", "科学章节", "周日作文", "周日整卷"], w),
    ...weeks.map((r) => new TableRow({ children: [
      cell(r[0], { w: w[0], bold: true, align: AlignmentType.CENTER, size: 18 }),
      cell(r[1], { w: w[1], align: AlignmentType.CENTER, size: 18 }),
      cell(r[2], { w: w[2], size: 18, fill: (r[0]==="W8") ? C.lightGreen : (r[0]==="W9"||r[0]==="W10") ? C.lightYellow : undefined }),
      cell(r[3], { w: w[3], align: AlignmentType.CENTER, size: 18 }),
      cell(r[4], { w: w[4], align: AlignmentType.CENTER, size: 18 }),
    ]})),
  ]));
}
kids.push(p("教辅接续提醒(不留空转周)：《Editing Explained》P5约10月中→接P6册；《Grammar MCQs》P5约11月中→接P6册；《Cloze Techniques》Book 5约11月中→接Book 6；《Conquer Comprehension》P5约12月中→接P6册；《Conquer English Vocabulary》W5约2月底→接W6册；《Synthesis and Transformation》P5约2月底→接新购P6册。", { color: C.red, before: 80 }));
kids.push(h2("后续阶段框架"));
{
  const w = [1900, 6700];
  kids.push(table(w, [
    headerRow(["阶段", "安排"], w),
    dataRow(["2027.1–2", "科学: 磁铁+补漏+一轮总测+二轮清零；英语: 《Editing Explained》P6和《Synthesis and Transformation》2月底刷完, 《Grammar MCQs》P6/《Cloze Techniques》6续刷；每8周1追赶周；口试素材加量"], w),
    dataRow(["2027.3–4", "整卷保持英语加频轮动；《Conquer Comprehension》P6收官(4月底)后EPH套9–15拆件桥接阅读OE；《Grammar MCQs》P6(5月中)/《Cloze Techniques》6(3月底)收官；《Synthesis》P6接棒；《Science Daily》用完"], w),
    dataRow(["2027.5–7", "真题密集: 周日整卷+周中二刷段全转真题错题; Editing/Synthesis/Cloze错题级二刷; EPH剩余用完; 四科Yearly(英6/科8/华8/数6年)7.31全清, 封题"], w),
    dataRow(["2027.8–9", "8月: 口试(约8.11–12)前每天15分口语+听力隔日1套; 9月: 听力(9.15)+笔试(9.24–30), 只做错题三刷+全真模考2次+调作息"], w),
  ]));
}

// ============ 六、验收监督 ============
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(h1("六、每周验收与监督(家长每周约1小时)"));
kids.push(h2("PSLE模块计分卡(严格按考试组卷结构, 周五从每日成绩单汇总·周日核对)"));
kids.push(p("左列就是PSLE真实考卷的模块和分值——每周盘的不是「做了多少题」, 而是考试每个得分点的备战水位。", { color: C.gray }));
{
  const w = [2700, 2600, 1200, 2200];
  const secRow = (label) => new TableRow({ children: [ cell(label, { w: w[0], bold: true, size: 18, fill: C.lightBlue }), cell("", { w: w[1], fill: C.lightBlue }), cell("", { w: w[2], fill: C.lightBlue }), cell("", { w: w[3], fill: C.lightBlue }) ] });
  kids.push(table(w, [
    headerRow(["PSLE考试模块(卷面分)", "对应周练习指标·达标线", "本周值", "响应规则(未达标)"], w),
    secRow("英语(权重: 笔试75%+口试15%+听力10%)"),
    dataRow(["Paper 1 作文: 情景写作15+命题作文40 (27.5%)", "作文(单周)内容__/20+语言__/20, 达标: 不低于上篇", "__/40", "下篇写前重读同题材范文+提纲给家长过目"], w, { colors: [C.red], bolds: [true] }),
    dataRow(["Paper 2 Booklet A: Grammar/Vocab MCQ+Visual Text (约23分)", "Grammar 24题错≤4; Vocabulary 50题错≤10", "错__/__", "错的语法点当周搞懂, 下周同点补10题"], w),
    dataRow(["Paper 2: Editing 改错 (12分)", "Editing 4篇错≤3", "错__", "周五二刷只刷错类+补2篇同型"], w, { colors: [C.red], bolds: [true] }),
    dataRow(["Paper 2: Comprehension Cloze 完形 (15分)", "Cloze 2篇得分率≥70%", "__%", "先讲思路再动笔+错空归类"], w),
    dataRow(["Paper 2: Synthesis句型转换 (10分)", "2单元错≤4", "错__", "错的公式抄3遍, 下周同型补5题"], w),
    dataRow(["Paper 2: Comprehension OE 阅读开放问答 (20分)", "2篇答完整率≥75%", "__%", "每篇强制回读自查+家长即时批"], w, { colors: [C.red], bolds: [true] }),
    dataRow(["Paper 3 听力 (20分, 10%)", "听力真题1节, 对__/题数", "__/__", "错的段周日重听一遍找原因"], w),
    dataRow(["Paper 4 口试: 朗读+看图会话 (30分, 15%)", "周二3样+周日口语完成5/5场; 流利度≥3星", "__/5·__星", "缺场周日补; 题目提前一天预告先备后说"], w),
    secRow("数学(100分)"),
    dataRow(["Paper 1 短答无计算器 (45分)", "周五半卷限时: 错__其中粗心__, 粗心≤2", "__/__", "限时降速10%, 验算流程重申"], w),
    dataRow(["Paper 2 长答应用题 (55分)", "整卷周(每6–8周)得分记录, 应用题错因标注", "__/55", "错的heuristic类型下周五补2题"], w),
    secRow("科学(100分)"),
    dataRow(["Booklet A 选择题 (28题56分)", "诊断15题对≥12; 薄弱清单≤3章", "对__·剩__章", "暂停新章先清旧账"], w, { colors: [C.orange], bolds: [true] }),
    dataRow(["Booklet B 开放题 (约44分)", "OE 2道术语全对2/2; 表述卡本周+5张", "__/2·__张", "错的术语抄标准句式3遍"], w),
    secRow("华文(普华)"),
    dataRow(["Paper 1 作文 (40分)", "双周作文得分记录", "__/40", "对照范文找扣分点"], w),
    dataRow(["Paper 2 阅读理解二 开放题", "踩点1篇漏点≤2", "漏__点", "下周华文段改双篇踩点"], w, { colors: [C.green], bolds: [true] }),
    dataRow(["Paper 3/4 听力+口试 (35%)", "周日华文口语1场≥3星", "__星", "题目提前预告; 学校听力课认真跟"], w),
    secRow("全局"),
    dataRow(["词汇底盘(渗透英语全卷)", "单词周清测≥80%", "__%", "新词减半复习翻倍"], w),
    dataRow(["教辅进度", "对照总账落后≤1周", "落后__周", "≥2周→下一个追赶周专清"], w),
  ]));
}
kids.push(p("数据链：孩子每做完一块→当场在「每日成绩单」(附录B)填数字→家长每晚5分钟核对签名→周五按左列考试模块汇总→周日复盘。不用回忆, 只用抄数。整卷周把整卷各Booklet实际得分也填进对应行, 和平时练习指标互相印证。", { color: C.gray, before: 80 }));
kids.push(h2("角色分工(执行才不崩)"));
kids.push(bullet([run("孩子只对两件事负责：", { bold: true }), run("今晚的块做完打勾+错题写进本子。打卡表贴墙他自己勾")], "b1"));
kids.push(bullet([run("家长三个固定动作：", { bold: true }), run("周日批开放题30分、周中批阅读1次、周日听孩子按考试模块念计分卡(数字他报, 拥有感在他)")], "b1"));
kids.push(bullet([run("即时激励：", { bold: true }), run("当周计分卡全达标→下周五「二刷段」直接免掉变自由时间。用「少学」奖励「学好」, 比物质奖励管用")], "b1"));
kids.push(bullet([run("盯的密度：", { bold: true }), run("前4周家长每晚在场陪跑, 之后退到只管开放题批改+周日复盘")], "b1"));
kids.push(h2("错题本5字段"));
kids.push(bullet("日期｜出处(书+页)｜错因分类｜正确要点(标准表述)｜复刷日期(3天后+周日)", "b1"));

// ============ 七、铁律+紧急调整 ============
kids.push(h1("七、核心铁律 + 紧急情况调整"));
kids.push(h2("核心铁律(8条)"));
kids.push(bullet([run("开放题按分值数点、写完回读自查", { bold: true, color: C.red }), run("——全局第一习惯, 英华14分的病根")], "b2"));
kids.push(bullet([run("开放题家长批, MCQ自批", { bold: true, color: C.red }), run("——没有外部踩点批改, 练的是把错误答法练熟")], "b2"));
kids.push(bullet([run("错题复盘>刷新题；2027.7.31封题", { bold: true })], "b2"));
kids.push(bullet([run("英语是录取杠杆", { bold: true }), run("：同总分比单科")], "b2"));
kids.push(bullet([run("单块≤45分钟、块间必休息、21:30收工、手机在房间外", { bold: true }), run("——慢做做对, 不追速度")], "b2"));
kids.push(bullet([run("周四周六全天不动、周日上午不动", { bold: true }), run("——留白就是可持续性")], "b2"));
kids.push(bullet([run("每8周1个追赶周", { bold: true }), run("：无新任务只清欠账, 宁可超前加量不要欠账硬压")], "b2"));
kids.push(bullet([run("教材从一而终", { bold: true }), run("：16本之外不再买书(唯一例外见第六章响应规则)")], "b2"));
kids.push(h2("紧急情况调整"));
{
  const w = [2600, 6000];
  kids.push(table(w, [
    headerRow(["情况", "怎么调"], w),
    dataRow(["偶发作业带回家/学校活动", "砍当日晚间轻块(订正/背默/复盘顺延到次日), 下午主块不动; 英语主段永不让位"], w),
    dataRow(["学校考试周(SA/CA/Prelim)", "手册全停只跟学校(W9–W10已预留); 考后新错因并入错因表, 必要时重开一次审计"], w),
    dataRow(["生病/状态差", "全停只留睡前单词自测5分钟; 好了从当周继续, 不补不追"], w),
    dataRow(["连续2周指标全不达标", "是计划问题不是孩子问题: 砍20%量(先砍Grammar和泛读), 回到全达标再加回"], w),
    dataRow(["厌学信号(拖延/顶撞/装病)", "立即减一档: 免二刷段+睡前单词1周; 只谈过程不谈AL; 周日全家外出一次"], w),
  ]));
}

// ============ 八、启动清单 ============
kids.push(h1("八、启动清单(9月第一周) + 周日复盘流程"));
kids.push(h2("启动清单"));
kids.push(bullet("清点6本P5册(Grammar/Editing/Cloze/Vocab W5/Synthesis/范文)剩余页数, 填进第二章总账「总量」列(取代估计值), 死线按实际余量微调", "b1"));
kids.push(bullet("买3本错题本+1本超纲词收集本+1叠索引卡(科学表述卡用); 按5字段画格式", "b1"));
kids.push(bullet("打印: 周打卡表×8、指标卡×8、科学薄弱清单1张、逐周表1张——全贴书桌墙", "b1"));
kids.push(bullet("和孩子开15分钟启动会: 看错因表——「你的分丢在哪、每周怎么一分分拿回来」; 讲清楚周四周六全休+达标免二刷的奖励规则", "b1"));
kids.push(bullet("家长动作: 找学校老师要英语作文批改支持(周日写的作文周一交); 下载PSLE听力真题音频", "b1"));
kids.push(h2("周日 20:05 复盘流程(15分钟)"));
kids.push(bullet([run("5分: ", { bold: true }), run("孩子按模块念计分卡, 达标的具体表扬(表扬行为不表扬聪明)")], "b1"));
kids.push(bullet([run("5分: ", { bold: true }), run("未达标按响应规则定下周动作, 写在下周打卡表顶部, 不追责")], "b1"));
kids.push(bullet([run("5分: ", { bold: true }), run("翻下周: 科学新章、作文类型、整卷科目、教辅是否接续换册, 孩子自己念一遍")], "b1"));

// ============ 附录：打卡表 ============
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(h1("附录A：每周打卡表(打印版)"));
{
  const w = [3000, 1120, 1120, 1120, 1120, 1120];
  const days = ["周一", "周二", "周三", "周五", "周日"];
  const mk = (task, marks) => new TableRow({ children: [
    cell(task, { w: w[0], size: 18 }),
    ...days.map((d, i) => cell(marks[i], { w: w[i + 1], align: AlignmentType.CENTER, size: 18 })),
  ]});
  kids.push(table(w, [
    headerRow(["任务 \\ 日", ...days], w),
    mk("英语主段50–70分", ["□A", "□B", "□A+Syn", "□B+Syn", "—"]),
    mk("阅读OE 1篇(答完整框架)", ["□", "—", "□", "○双周", "—"]),
    mk("科学(概念/诊断/回炉轮)", ["□概念", "—", "□诊断", "○回炉周", "□整卷轮"]),
    mk("华文(踩点/精读)", ["—", "□", "—", "○轮换周", "—"]),
    mk("数学(半卷限时, 三周1次)", ["—", "—", "—", "○轮换周", "□整卷轮"]),
    mk("错题(登记/集中复盘/二刷)", ["□登记", "□登记", "□复盘30", "□二刷30", "□三科归档"]),
    mk("作文55分/提纲20分", ["—", "—", "—", "—", "□"]),
    mk("限时整卷(按科弹性时长)", ["—", "—", "—", "—", "□"]),
    mk("口语20分+周复盘15分", ["—", "—", "—", "—", "□"]),
    mk("睡前单词30分(新词10+复习10+自测10)", ["□", "□", "□", "□", "○"]),
    mk("21:30准时收工", ["□", "□", "□", "□", "□"]),
  ]));
}
kids.push(p([run("□=必做  ○=按轮换/单双周  —=不安排。周四·周六全天无任务。", { color: C.gray })], { before: 100 }));
kids.push(p([run("本周科学章节:____  薄弱清单剩:__章  本周整卷:____  作文:□英整篇 □华整篇 □英提纲  教辅换册:____", { color: C.gray, size: 18 })], { before: 60 }));

// ============ 附录B：每日成绩单 ============
kids.push(new Paragraph({ children: [new PageBreak()] }));
kids.push(h1("附录B：每日成绩单(打印版, 每周一张)"));
kids.push(p([
  run("孩子每做完一块当场填数字, 家长每晚5分钟核对+签名。", { bold: true }),
  run("周五把5天的数字汇总进周指标卡8项。数字不会骗人, 回忆会。", {}),
]));
{
  const w = [2600, 1200, 1150, 1150, 1150, 1150, 1150];
  const hdr = ["检查项(填什么)", "达标参考", "周一", "周二", "周三", "周五", "周日"];
  const mk = (task, ref, marks, opts = {}) => new TableRow({ children: [
    cell(task, { w: w[0], size: 17, color: opts.color, bold: opts.bold }),
    cell(ref, { w: w[1], size: 16, align: AlignmentType.CENTER, fill: C.lightGray }),
    ...marks.map((m, i) => cell(m, { w: w[i + 2], align: AlignmentType.CENTER, size: 16 })),
  ]});
  const sec = (label, fill) => new TableRow({ children: [ cell(label, { w: w[0], bold: true, size: 17, fill }), ...Array.from({length: 6}, (_, i) => cell("", { w: w[i + 1], fill })) ] });
  kids.push(table(w, [
    headerRow(hdr, w),
    sec("英语", C.lightRed),
    mk("Editing 2篇: 错__题", "≤1/天", ["错__", "—", "错__", "—", "—"], { color: C.red }),
    mk("Grammar 12题: 错__题", "≤2/天", ["错__", "—", "错__", "—", "—"], { color: C.red }),
    mk("阅读OE 1篇: 答完整__/共__题", "≥75%", ["__/__", "—", "__/__", "—", "—"], { color: C.red, bold: true }),
    mk("Cloze 1篇: 对__/共__空", "≥70%", ["—", "__/__", "—", "__/__", "—"], { color: C.red }),
    mk("Vocabulary 25题: 错__题", "≤5", ["—", "错__", "—", "错__", "—"], { color: C.red }),
    mk("句型转换1单元: 错__题", "≤3", ["—", "—", "错__", "错__", "—"], { color: C.red }),
    mk("听说: 完成朗读/会话/听力__样", "3样", ["—", "__样", "—", "—", "—"], { color: C.red }),
    mk("词汇周清测: 对__/共__", "≥80%", ["—", "__/__", "—", "—", "—"], { color: C.red }),
    sec("科学", C.lightYellow),
    mk("概念: 本章讲给家长30秒, 讲清?", "是", ["是/否", "—", "—", "—", "—"], { color: C.orange }),
    mk("开放题2道: 术语全对__/2", "2/2", ["__/2", "—", "—", "—", "—"], { color: C.orange }),
    mk("诊断15题: 对__题", "≥12", ["—", "—", "对__", "—", "—"], { color: C.orange, bold: true }),
    mk("回炉(轮换周): 清掉__章", "≥1", ["—", "—", "—", "__章", "—"], { color: C.orange }),
    sec("华文 / 数学", C.lightGreen),
    mk("华文阅读1篇: 漏__点", "0点", ["—", "漏__", "—", "—", "—"], { color: C.green, bold: true }),
    mk("数学半卷(轮换周): 错__其中粗心__", "粗心0", ["—", "—", "—", "__/__", "—"], { color: C.green }),
    mk("周日整卷: 科目____得分____", "记录", ["—", "—", "—", "—", "____"], { color: C.green }),
    mk("作文(单周): 内容__/20 语言__/20", "≥上篇", ["—", "—", "—", "—", "__/40"], { color: C.red }),
    mk("口语2场(英/华): 完成+家长__星", "≥3星", ["—", "—", "—", "—", "__星"], { color: C.orange }),
    sec("每天必查", C.lightBlue),
    mk("错题登记/复盘/二刷: 完成?", "√", ["□", "□", "□", "□", "□"]),
    mk("睡前单词自测: 对__/共__", "≥80%", ["__/__", "__/__", "__/__", "__/__", "__/__"]),
    mk("21:30准时收工", "√", ["□", "□", "□", "□", "□"]),
    mk("家长核对签名", "", ["____", "____", "____", "____", "____"]),
  ]));
}
kids.push(p([run("填表规则：数字当场填不过夜；不适用的格子已印—；连续3天某项标红(低于达标参考)→不等周五, 当晚按响应规则调整。", { color: C.gray, size: 18 })], { before: 80 }));

// ---------- 文档 ----------
const doc = new Document({
  numbering: {
    config: [
      { reference: "b1", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 220 } } } }] },
      { reference: "b2", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 220 } } } }] },
    ],
  },
  styles: { default: { document: { run: { font: FONT, size: 21 } } } },
  sections: [{
    properties: { page: { margin: { top: 1200, bottom: 1200, left: 1300, right: 1300 } } },
    headers: { default: new Header({ children: [new Paragraph({ children: [run("PSLE 2027 完整备考总手册 v18.6 · 教辅全覆盖排程版 · 2026.9.2起", { size: 16, color: C.gray })], alignment: AlignmentType.RIGHT })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: C.gray })], alignment: AlignmentType.CENTER })] }) },
    children: kids,
  }],
});

const OUT = "C:\\Users\\Eric\\Desktop\\PSLE_2027_完整备考总手册_v18.6_教辅全覆盖排程版.docx";
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("OK " + OUT + " " + buf.length + " bytes"); });
