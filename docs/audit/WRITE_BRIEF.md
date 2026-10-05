# 补写"每日考点学习"条目 brief (第二批, 2026-10-03)

目标: 把每日考点库从"每模块 3 个"补齐到覆盖全量 PSLE 考点清单。你拿到的 todo 文件里每条已经定好 `id / subj / mod / topic / detail / freq`, 你要为**每一条**写成完整条目。

## 必读
1. 同目录 `../audit/DAILY_FOCUS_BRIEF.md` — schema (id/subj/mod/topic/title/why/q{type,stem,opts,ans,marks}/steps/trap/takeaways/template) 和质量硬要求
2. 同目录 `PANEL_BRIEF.md` 里的"必须对齐的考试事实" (2025 英语新卷 / 2026 科学新卷分值)
3. 同目录 `daily_focus.json` — 已有 72 条, 看 3-5 条学格式和深度, **不要和它们重复出题**

## 规则
- id/subj/mod/topic 用 todo 给的, 不改; title ≤20 字; why 要点出 detail 里的陷阱
- q.marks: 英语 cloze/editing/gram_mcq/vocab_mcq/vocab_cloze/visual/gram_cloze/listening 1 分, synthesis 2 分, comp_oe 1-2 分, sw 14 / compo 36 / oral_read 15 / oral_conv 25 整体; 科学 mcq 2 分, OE 按题 2-3 分
- 题目格式贴近真卷: 完形给 3-4 句短文挖 1 空 (练习用 mcq 4 选 1); 语法填空给句子 + 4 个功能词选项; 改错给含 1 处错的句子让选哪个词错 (opts 是 4 个词); 句型转换给原句 + 开头词, type short, ans 是满分改写; 阅读问答给 4-6 句段落 + 问题, type short; 图文理解用文字描述海报/网页 (标题/小字/条款) 再问 purpose/audience/细节; 听力给 4-6 句脚本 + 问题; 口试/写作 type short, ans 给范例, steps 讲组织
- 科学: 不超纲; 范例答案带 marker 关键词与因果链 (gains heat from / loses heat to / only one variable changed / reliable / conductor…); 数据题在 stem 里用文字表格
- **答案必须唯一正确** (把每个干扰项代入读; 会有另一组 agent 逐题复核, 错一道打回), 英式拼写, 新加坡语境, 简体中文
- takeaways 1-3 条, ≤40 字, 可迁移规则不是知识点复述; steps 3-5 条针对这道题
- 输出: JSON 数组写到指定文件; 写完 node parse 校验 (条数 = todo 条数, id 一一对应, mcq opts=4 不重复 ans 0-3, short opts=[] ans 字符串), 报回条数和校验结果
