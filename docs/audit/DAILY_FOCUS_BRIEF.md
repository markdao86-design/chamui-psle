# 每日考点学习 内容 brief

用途: 新加坡 PSLE 备考 app 首页的"每日考点学习"卡。孩子 P5 (2027.9 考 PSLE), 英语 AL6 → 目标 AL1, 科学 AL3 → AL1。每天轮换展示一个 PSLE 常考点:
1. 先讲这类题型的一般性解题方法论 (这部分由 app 的 TECHNIQUE_BOOK 提供, 你不用写)
2. 再给一道同等难度的例题 (真题风格/模拟题, 难度对标 AL1 = 不丢该拿的分, 所以要的是"会被扣分的典型题", 不是偏题怪题)
3. 针对这道题逐步分析 + 这道题最容易错在哪
4. 关键总结 (takeaways) 自动收藏进孩子的"答题技巧本", 所以 takeaways 必须是通用、可迁移的一句话规则, 不是只对这道题成立的话

## 条目 JSON schema (严格遵守, 一个字段不能少)
```json
{
  "id": "eng_cloze_01",            // subj_mod_序号
  "subj": "eng",                   // eng | sci
  "mod": "cloze",                  // 见下面模块 key 表
  "topic": "连接词逻辑空",          // ≤12 字, 这道题考的具体点; 科学填章节如 "Heat · 传热"
  "title": "完形: 转折关系靠前后句对比",   // ≤20 字
  "why": "为什么常考 / 孩子通常怎么丢分 (1-2 句中文)",
  "q": {
    "type": "mcq",                 // mcq | short (short = 要写答案的开放题)
    "stem": "题干 (英文; cloze 给 3-4 句带 ___ 的短文; 科学 OE 给情境+问题; 可用 \n 换行)",
    "opts": ["A", "B", "C", "D"],  // mcq 必填 4 个; short 填 []
    "ans": 2,                      // mcq: 正确下标 0-3; short: 范文答案字符串 (英文, PSLE marker 会给满分的写法)
    "marks": 1                     // 这题在真考里值几分
  },
  "steps": ["第 1 步: ...", "第 2 步: ...", "..."],   // 3-5 条, 针对这道题的解题过程, 中文为主术语英文
  "trap": "这道题最容易错在哪 (1-2 句)",
  "takeaways": ["通用规则一句话", "..."],   // 1-3 条, ≤40 字/条, 可迁移
  "template": "答题模板 (若这类题有固定句式, 给英文模板; 没有填空字符串)"
}
```

## 模块 key 表
英语 (eng), 按 2025 起 PSLE 卷结构:
- sw 情境写作 Paper1 (15分) · compo 作文 Paper1 (40分)
- gram_mcq 语法选择 BktA (10) · vocab_mcq 词汇选择 BktA (5) · vocab_cloze 词汇填空 BktA (5) · visual 图文理解 BktA (8)
- gram_cloze 语法填空 BktB (10) · editing 改错 BktB (12) · cloze 完形填空 BktB (15) · synthesis 句型转换 BktB (10) · comp_oe 阅读问答 BktB (20)
- listening 听力 Paper3 (20) · oral_read 朗读 Paper4 (10) · oral_conv 看图会话 Paper4 (20)
科学 (sci), 2026 起: 30 道选择题 (60 分) + 开放题 (40 分), 1h45:
- mcq 选择题 · oe_exp 实验设计/变量 · oe_data 图表数据题 · oe_explain 解释因果 · oe_compare 比较/分类 · oe_apply 情境应用
科学章节范围 (P3-P6 MOE 2024 syllabus): Diversity (living/non-living, plants, animals, fungi, bacteria, materials), Cycles (life cycles, matter, water cycle, reproduction), Systems (plant parts/transport, digestive, respiratory, circulatory, electrical circuits), Interactions (magnets, forces, environment/adaptations/food chains, man's impact), Energy (light, heat, energy forms & conversion, photosynthesis). 不要出超纲 (如 cells 细节/化学式/密度计算)。

## 质量硬要求
- 题目和答案必须准确无误, 答案唯一; 会有另一组 agent 逐题复核, 错一道都会被打回
- 英式拼写; 新加坡语境 (HDB, hawker centre, MRT, Mr Tan/Siti/Ravi/Meiling 这种名字)
- 英语题的难度: 真题里"AL1 孩子也会错"的那种 (近义辨析、时态一致、连接词逻辑、指代、Editing 的拼写+语法混合、Synthesis 的 reported speech/ although/ despite/ unless/ so...that/ passive)
- 科学题: 考"用概念解释现象", 答案要带 PSLE marker 要的关键词 (如 "gains heat" "conducts heat faster" "fair test: only one variable changed")
- 每个模块至少 3 条, 分别考该模块 3 个不同的常考点, 不要重复
- 全部中文用简体
- 输出: 一个 JSON 数组写到指定文件, 写完用 node 把文件 parse 一遍, 校验每条 mcq 的 opts 长度 4、ans 在 0-3、无重复选项; 把条数和校验结果报回来
