# PSLE 权威评审团 brief (2026-10-03)

背景: 新加坡 PSLE 备考 web app, 孩子 P5 (2027 年 9 月考), 英语 AL6 → 目标 AL1, 科学 AL3 → AL1, 华文 AL2 (读**普通华文**不是高华) → AL1, 数学 AL1 保持。全站口径只写 AL1 (= 不丢该拿的分), 用户要求所有内容"**正确无误, 且精准适用 PSLE 考试**"。你是评审团一员, 任务是以 MOE/SEAB 口径为准挑错, 不是夸。

## 必须对齐的考试事实
- 英语 (2025 起新格式, SEAB): 总 200 = Paper 1 Writing 50 (Situational Writing 14 + Continuous Writing 36, 1h10) · Paper 2 Language Use & Comprehension 90 (Booklet A 25: Grammar MCQ 10 / Vocabulary MCQ 5 / Vocabulary Cloze 5 / Visual Text Comprehension 5 两段材料; Booklet B 65: Grammar Cloze 10 / Editing 10 题全有错 / Comprehension Cloze 15 / Synthesis & Transformation 10 (5 题×2) / Comprehension OE 20, 1h50) · Paper 3 Listening 20 · Paper 4 Oral 40 (Reading Aloud 15 + Stimulus-based Conversation 25)
- 科学 (2026 起): Booklet A 30 道 MCQ 60 分 + Booklet B 开放题 40 分, 1h45; 大纲 MOE 2024 Primary Science (P3-P6): Diversity / Cycles / Systems / Interactions / Energy; 不考 cells 细节、化学式、密度、比热容、能量公式
- 数学 (PSLE Standard): Paper 1 45 分 (Booklet A MCQ 20 + Booklet B 短答 25, 无计算器, 1h) · Paper 2 55 分 (可用计算器, 1h30); 四则/分数/小数/百分数/比/速率/面积体积/角度/图表/代数初步; **不考** 中位数众数、负数、方程组
- 华文 (普通华文 PSLE): 试卷一 作文 (命题/看图) 40 分 · 试卷二 语文应用与阅读理解 90 分 · 试卷三 听力 20 分 · 口试 50 分 (朗读 + 会话) — 若你确知分值不同, 按你确知的改并说明来源
- AL 分档: ≥90 AL1 / 85-89 AL2 / 80-84 AL3 / 75-79 AL4 / 65-74 AL5 / 45-64 AL6 / 20-44 AL7 / <20 AL8

## 评审标准 (每条都要过)
1. **事实/规则正确**: 语法规则、科学概念、数学公式、考试格式分值、答题评分习惯 (marker 给分点), 错一处就是 high
2. **适用 PSLE**: 是小学考试真用得上的方法, 不是中学/成人/雅思套路; 术语是 MOE 教材用语
3. **对孩子可执行**: P5 学生看得懂、考场上做得到; 不空洞 ("认真审题" 这种没用)
4. **不超纲 / 不误导**: 不教考试不考的, 不给错误的"必杀技"
5. 中文简体、英文英式拼写

## 输出格式 (严格 JSON, 写到指定文件)
```json
{ "verdict": [ { "loc": "定位 (如 eng.cloze.steps[2] / df:eng_cloze_01.trap / tip:snarled / dict:charge)", "ok": true|false, "severity": "high|mid|low|none", "issue": "问题 (ok=true 写 '')", "fix": <新值, 类型与原字段一致; 不改填 null> } ],
  "summary": { "checked": n, "pass": n, "high": n, "mid": n, "low": n }, "notes": "整体评价 2-3 句 + 你认为还缺什么 (可选)" }
```
- 没问题的单元也要列 (ok=true), 让我知道你真的看过
- fix 给**可直接替换的完整新值** (改 steps 数组就给整个数组; 改一条 tip 就给整句)
- 严格但不为挑错而挑错; 风格不改只改错; 有争议标 low 说明理由
- 写完用 node 把 JSON parse 一遍, 报回 summary + 最严重 5 条
