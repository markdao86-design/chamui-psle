# chamui-psle 开发笔记 — 换电脑 / 新 session 接手指南

> 更新: 2026-11-04 · 当前版本 **v29.4** (手动加组不限量; 发音全走 appSpeak, 跟随 iPad 朗读内容; 真题库 216 份) · 线上 https://chamui-psle.web.app (+ 卷子站 https://chamui-papers.web.app) · QA **2160+ 项全过**
> 2026-10-02 ~ 10-05 四天连发 v20.1 → v24.9 (约 40 版); 2026-11-03 v25.0 → v27.0 (13 寸屏字号 / 模块急迫度卡 / 2026-11 校考入库 + 逐题分析落地 / 📷 判分页)。全部已 push GitHub master 并 firebase deploy。

---

## 0. 换电脑三步 (10 分钟)

```bash
# 1) 代码
git clone https://github.com/markdao86-design/chamui-psle.git && cd chamui-psle
npm install            # 只为 firebase-tools (部署) ; app 本身零依赖
npx firebase login     # 浏览器授权一次

# 2) Claude 的 skill + memory (项目铁律、孩子画像、用户偏好、设计规范 都在这里, 不在仓库里)
curl -fsSL https://raw.githubusercontent.com/markdao86-design/claude-brain-sync/master/install.sh | bash
#    → 恢复 ~/.claude/skills/psle-app-dev/SKILL.md (开发手册) 和 ~/.claude/projects/.../memory/

# 3) 开 Claude Code, 说 "继续开发 chamui-psle", 它会自动加载 psle-app-dev skill + CLAUDE.md
node qa_check.js       # 全部必须过 (2160+ 项), 过了再动手
```

本地预览: `.claude/launch.json` 配了 `python -m http.server 8766`; 浏览器测试前先 `window.saveState=()=>{}` 防污染孩子云端数据。

---

## 1. 必读顺序

1. `~/.claude/skills/psle-app-dev/SKILL.md` — **项目手册** (孩子画像 / 部署七步 / 题库 JSON 回写 / 出题必过 agent 审 / 闪卡常量 / 防刷 / 课表照抄 / 7.z 设计规范 12 条铁律 / 7.w 单词线 140 口径 / 踩坑表)
2. `CLAUDE.md` — 项目定位 + 红线 (双龙 / 汇率 / 综合 AL 公式 / 配色)
3. `CHANGELOG.md` 最后 ~55 段 (v20.1 → v27.0, 每段写了用户原话 + 改了什么)
4. 本文件第 2-4 节

---

## 2. 现在的产品形态 (v28.x)

导航 (胶囊按钮): 🏠 主页 · 📆 课表 · 📖 专项练习 (原 模块学习, 英语/科学) · 🏫 真题库 · 📇 词汇 · 📘 答题技巧 · 📕 错题集 · 📷 判分 · 📚 学习中心 · ⋯其他; 导航上方一条学习统计 (本周/累计天数/日均/连续/几天到 AL1)

| 页面 | 关键函数 (app.js) | 数据 (data.js) |
|---|---|---|
| 主页三卡: 每日分数打卡 / 每日考点学习 / 错题本 | `renderTodayThreeCard` `renderDailyFocusCard` `renderErrorBankCard` | `SCHED_DAYS`→`SCHED_GRID` (自动生成) · `DAILY_FOCUS` 248 条 + `getDailyFocusList/Score` |
| 课表 (课表行右侧直接打分, 四科计分卡, 整周表折叠) | `renderSchedulePage` `renderSchedDayScore` `computeSchedWeekSummary` | `schedKeysOf(name)` 课表块→打分行 |
| 模块学习 (网格卡按急迫度排; 顶部 校考成绩 + 🎯 本阶段重点抓; 卡上 📋 校考病根; 每卡 练题 + 🧠 技巧测一测) | `renderModulesPage` `renderModulePage` `startTechQuiz` | `ENG_MODULES/SCI_MODULES` · `EXAM_RESULTS` (改成绩只改这里) · `EXAM_DIAG` (改病根只改这里) · `buildTechniqueQuiz` |
| 时态专项 / ✍️ 动词圈查 / 📕 我的常错本 / 🔑 科学关键词库 (v26.0 校考分析落地) | `openTenseDrill` `openTenseChecker` `openMyErrorBook` `openSciKeywordBank` · 科学 OE 答前圈关键词 `_sciOeKwChips` | `getTenseDrillQuestions` (39 题) · `tenseCheck` · `MY_ERROR_BOOK` · `SCI_KEYWORD_BANK` · `TECHNIQUE_BOOK.eng.mods.tense` |
| 🏫 真题库 (每科顺序 英语/科学/华文/数学; 页内 ① 📌 薄弱模块汇编 ② 🎯 PSLE 真题 ③ 🏫 名校 Prelim (年份胶囊 26/25/24/23 年) ④ 🔗 外站下载) | `_buildPaperBankInnerHtml` `_weakBookHtml` `_psleImportHtml` `_papersListHtml` · 做卷弹层 `openPaperRunner(id, startPage, weakKey)` (pdf.js 连续下滑 + 右侧答题卡 `_prSubmit` + 问答题 `_prGrade` → 判分页预设) | `PAPERS_2025` (data.js 标记块, `tools/papers/build_papers_data.py` 生成; 每份 id/subj/school/year/url/sections/ans.imgs/mcq.key) · `WEAK_BOOK` · `state.paperRuns` `state.weakDone` · 本机导入 IndexedDB `psle_local_papers` · 卷子 PDF 在独立站点, 流水线见 `tools/papers/README.md` |
| 📷 判分 (拍照 → Claude 按 PSLE 标准批改 → 分数/失分项/讲解/范文 → 入错题本/PDF) | `renderGradingPage` `_gdRun` `_gdResultHtml` `_gdToWrongBook` | `GRADING_TASKS` (五种任务的 rubric, 官方/非官方分开标) · `buildGradingSystemPrompt` · `callClaudeGrader` (浏览器直连 api.anthropic.com, key 只在 localStorage) · `state.gradeLog` (≤60 条, 不存图) |
| 词汇 (背今天这一组 / 考今天这一组 / 单词本 / 卡组) | `renderVocabPage` `_renderFlashcardSession` `_renderFcQuiz` | 闪卡引擎 `buildDailyFlashcardGroup` (30 新 + 40 最不熟复习) · `buildVocabQuestion` · `VOCAB_FIXES/VOCAB_TIPS/FC_BAN_PAIRS` 覆盖层 · `getDailyLoad` (≤140) |
| 答题技巧 (四科 31 模块 + 收藏 + PDF) | `renderTipsPage` `downloadTipBookPdf` | `TECHNIQUE_BOOK` |
| 错题集 (科目→题型归集 + 同类讲解 + PDF) | `renderWrongBookPage` `downloadHtmlAsPdf` | `state.wrongAnswers` |
| 全站查词 (悬浮/长按) + 单词本 | `_dictBind` `showDictPop` | `lookupDictLocal/Online` `CORE_DICT` `state.wordBook`→`WORDBOOK_DECK` |
| 家长看板 | `parent.html` (只读, 家长密码) | 读 Firestore REST |

每一道题都能 "💡 不会, 看答案和解析", 答完出 "下一题 →" 不自动跳; 看答案算做过并入错题本。

---

## 3. 内容审核的工具链 (出题铁律: 生成 → agent 审 → apply → QA → 上线)

- `docs/audit/*.md` — 给 agent 的 brief (评审团标准 `PANEL_BRIEF`, 写考点 `WRITE_BRIEF` + `DAILY_FOCUS_BRIEF`, 审词条 `VOCAB_AUDIT_BRIEF`); `generator_audit.md` 是出题器审计报告
- `docs/audit/syllabus_eng.json` (140) / `syllabus_sci.json` (109) — PSLE 全量考点清单, 当前 `DAILY_FOCUS` 248 条 = 英 140/140 + 科 108/109
- `tools/audit/apply_df_review.js` — 把 agent 的 verdict (loc `df:<id>.<field>`) 应用到 `DAILY_FOCUS`, `--add new.json review.json` 合入新条目
- `tools/audit/apply_tb_review.js` — 应用到 `TECHNIQUE_BOOK` (loc `eng.cloze.steps[2]`)
- `tools/audit/apply_vocab.js` + `export_vocab.js` — 词条审核: 导出 → agent 写 `vocab_findings_N.json` → 生成 `VOCAB_AUDIT_OVERLAY` 覆盖层
- `tools/audit/gen_upgrade.js` / `tq_regen.js` — 出题器升级与技巧题样本
- ⚠️ 这些脚本里的 `DIR`/`P` 是当时 scratchpad 的绝对路径, 换机器先改成你的临时目录
- 题库是单行 JSON 回写在 data.js (`const NAME = [...]`), 改法: vm 加载 → 改对象 → 按括号配对找整段替换 `JSON.stringify` (脚本里有现成 `spanOf`)

---

## 4. 已知未修 / 待办

1. 阅读理解 `COMP_OE_PASSAGES` comp1-20 篇幅偏短 (100-150 词, 真题 300+) — 要重写不是改字
2. Cloze #216-219 分类错位; 听力题库只 20 段
3. 家长看板大陆访问要 VPN (Google 托管), 方案未定 (用户否了放米多 EC2)
4. 家长密码 2026-10-03 重置过临时密码 (见聊天记录), 用户是否已改未知
5. `sec_words` 97 条考点解析对近义辨析偏薄; 英语 Comp OE 缺 why/指代题, 科学缺 adaptations/food web 多级影响 (评审 notes 里的缺口)
6. 主页"班课"勾存 `todayManual`, 课表页同一块存周表 `hw` 格, 两边不互通
7. 390px 下 7 个日期胶囊会折行
8. 旧数据 `fcDailySize` 若曾设 40, 现在仍可选 (选项 20/30/40)
9. 判分页: 线路已用假 key 实测 (401 正常返回), 真 key 只在孩子设备 localStorage; 若 Claude 的 JSON 偶尔不合法, 页面会显示模型原文
11. 真题库卷子 PDF / 答案页图不在仓库 (版权 + 体积), 在 `chamui-papers` 站; 换电脑按 `tools/papers/README.md` 重建; 英/科/华 PSLE 历年真题网上无免费公开版, 页面提供本机导入
10. 课表没有按校考分析改 (铁律: 课表照抄用户截图); 分析里的 "假期每天 40 分钟 / Booklet A 每周 2 套 / 假期末模拟卷" 等家长发课表再加

---

## 5. 部署与坑 (细节在 skill 第 3 节 / 踩坑表)

- 七步: QA → build.py → `?v=` 三处 + parent.html 同步递增 → CHANGELOG → commit/push → `npx firebase deploy --only hosting` → curl 验证
- Hosting 10GB 配额满 (429) → `node tools/prune_hosting_versions.js 5`
- agent worktree 别建在仓库里 (已 gitignore `.claude/worktrees/`); `git apply` 外来 patch 后检查 CRLF
- 用户看着手机截图提需求, 一条一版立刻发, 不攒
