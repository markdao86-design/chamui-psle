# chamui-psle 开发笔记 — 换电脑 / 新 session 接手指南

> 更新: 2026-10-05 · 当前版本 **v24.9** · 线上 https://chamui-psle.web.app · QA **1112 项全过**
> 2026-10-02 ~ 10-05 四天连发 v20.1 → v24.9 (约 40 版), 全部已 push 到 GitHub master 并 firebase deploy。

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
node qa_check.js       # 1112 项必须全过, 过了再动手
```

本地预览: `.claude/launch.json` 配了 `python -m http.server 8766`; 浏览器测试前先 `window.saveState=()=>{}` 防污染孩子云端数据。

---

## 1. 必读顺序

1. `~/.claude/skills/psle-app-dev/SKILL.md` — **项目手册** (孩子画像 / 部署七步 / 题库 JSON 回写 / 出题必过 agent 审 / 闪卡常量 / 防刷 / 课表照抄 / 7.z 设计规范 12 条铁律 / 7.w 单词线 140 口径 / 踩坑表)
2. `CLAUDE.md` — 项目定位 + 红线 (双龙 / 汇率 / 综合 AL 公式 / 配色)
3. `CHANGELOG.md` 最后 ~40 段 (v20.1 → v24.9, 每段写了用户原话 + 改了什么)
4. 本文件第 2-4 节

---

## 2. 现在的产品形态 (v24.9)

导航: 🏠 主页 · 📆 课表 · 📖 模块学习 (英语/科学) · 📇 词汇 · 📘 答题技巧 · 📕 错题集 · 📚 学习中心 · ⋯其他 (能力/目标校/我的/打卡/家长看板/管理)

| 页面 | 关键函数 (app.js) | 数据 (data.js) |
|---|---|---|
| 主页三卡: 每日分数打卡 / 每日考点学习 / 错题本 | `renderTodayThreeCard` `renderDailyFocusCard` `renderErrorBankCard` | `SCHED_DAYS`→`SCHED_GRID` (自动生成) · `DAILY_FOCUS` 248 条 + `getDailyFocusList/Score` |
| 课表 (课表行右侧直接打分, 四科计分卡, 整周表折叠) | `renderSchedulePage` `renderSchedDayScore` `computeSchedWeekSummary` | `schedKeysOf(name)` 课表块→打分行 |
| 模块学习 (每行: 练题 + 🧠 技巧测一测) | `renderModulesPage` `renderModulePage` `startTechQuiz` | `ENG_MODULES/SCI_MODULES` · `buildTechniqueQuiz` (从 `TECHNIQUE_BOOK` 生成) |
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

---

## 5. 部署与坑 (细节在 skill 第 3 节 / 踩坑表)

- 七步: QA → build.py → `?v=` 三处 + parent.html 同步递增 → CHANGELOG → commit/push → `npx firebase deploy --only hosting` → curl 验证
- Hosting 10GB 配额满 (429) → `node tools/prune_hosting_versions.js 5`
- agent worktree 别建在仓库里 (已 gitignore `.claude/worktrees/`); `git apply` 外来 patch 后检查 CRLF
- 用户看着手机截图提需求, 一条一版立刻发, 不攒
