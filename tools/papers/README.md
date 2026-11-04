# 真题库流水线 (v28.x)

真题库 (`🏫 真题库` 标签) 里每一份卷子都能页内做: pdf.js 连续下滑看卷, 右侧答题卡选择题交卷自动判, 问答题拍照判分 (自动附学校官方答案页)。
卷子 PDF 和答案页图片放在 **独立的 Firebase Hosting 站点** `chamui-papers.web.app` (同一个 Firebase 项目 `chamui-psle` 的第二个 site), **不进本仓库** (几百 MB, 版权属各校 / 出版方, 仅家庭自用)。本目录只放生成它们的脚本、清单和中间结果。

## 目录

| 文件 | 作用 |
|---|---|
| `dl_papers.py` | 第一批: sgexam.com 2025 P6 Prelim 10 校 × 4 科 → 桌面 `P6顶尖小学真题2025\<科目>\` + `site/papers_2025.json` |
| `dl_more.py` | 补充: 2026 / 2025 其余 / 2024 / 2023 全部 P6 Prelim (并发 6) → `site/papers_more.json` |
| `psle_math.py` | PSLE 数学 2022-2025 (clubmath.sg 公开 PDF, 文字版): 章节 + 15 题答案键直接从文字解析 → `site/psle_papers.json` |
| `classify_pages.py` | 扫描件 OCR 分章 (RapidOCR 识别每页上半页标题 → 页标签), 参数传科目可四科并行: `python classify_pages.py 英文` → `pages_英文.json` |
| `pages.json` | 全部卷子的页标签 (已含手工修正: 科学南洋 B 册 / 华文南华·莱佛士答案页 / 数学 Rosyth·道南 Paper 1) |
| `extract_keys.py` | 按页标签把答案页渲成 JPG: 上传站点 (判分用) + 本地 `anskeys/` (给 agent 转录) |
| `keys/` | agent 视觉转录的选择题答案键 `<subj>_<slug>[_<year>].json` (每份自查 + 抽校) |
| `merge_keys.py` | `keys/` → `keys.json` (值域 1-4 / 题号齐全校验, 报缺题) |
| `build_papers_data.py` | 清单 + 页标签 + 答案键 → `data.js` 里的 `PAPERS_2025` 标记块 (`// PAPERS_2025_BEGIN … END`, 别手改) |
| `compile_weak.py` / `make_index_docx.py` | 桌面薄弱模块汇编 PDF + 目录 Word (app 里的「📌 薄弱模块汇编」用同一套目录, 直接跳原卷章节) |
| `site/` | 卷子站的 `firebase.json` / `.firebaserc` / `robots.txt` + 三份清单 |

## 重建卷子站 (换电脑)

```bash
mkdir chamui-papers && cd chamui-papers && cp -r <repo>/tools/papers/site/{firebase.json,.firebaserc} . && mkdir public && cp <repo>/tools/papers/site/robots.txt public/
python <repo>/tools/papers/dl_papers.py      # 第一批 40 份 (同时放到 public/2025/<subj>/)
python <repo>/tools/papers/dl_more.py        # 其余年份
python <repo>/tools/papers/psle_math.py      # PSLE 数学
python <repo>/tools/papers/extract_keys.py   # 答案页图片 (依赖 pages.json, 已在仓库)
npx firebase deploy --only hosting:chamui-papers
```

脚本里的 `SP` / `DESK` 是当时的 scratchpad 和桌面绝对路径, 换机器先改。

## 加新卷子的顺序

下载 → `classify_pages.py <科目>` (四科并行) → 抽查页标签, 必要时手工改 `pages.json` → `extract_keys.py` → 派 agent 按 `anskeys/` 转录 `keys/<subj>_<slug>_<year>.json` (只录 1-4 选择题, 看不清不写) → 自己抽 1-2 份对原图 → `merge_keys.py` → `build_papers_data.py` → QA → 部署两个站。

## 踩过的坑

- 扫描件无文字层, 必须 OCR; 一份 20-50 页, 四进程并行时每份 2-5 分钟
- 分章规则改了很多轮: `Optical Answer Sheet` / `read the passage` / `underlined word` 误判; 答案页模板 `SCHOOL: LEVEL: SUBJECT: TERM:`; 科学题目里的 `Continue from Q29)` 撞答案规则
- OCR 读答案表不可靠 (科学 30 题错 5), 改视觉转录
- 2023 年 sgexam 链接是 `-prelim-<school>-pdf` (没有 `exam`)
- 内置浏览器 / 安卓 iframe 显示不了 PDF → 自托管 pdf.js 画 canvas
- 结束 python 进程别 `taskkill /IM python.exe` (会连本地预览服务器一起杀), 按 PID 结束
- (v29.2) OCR 分章后**一定要查没答案页的卷**: `probe_ans3.py` 整页 OCR 最后 12 页找答案信号, `sheet.py <pdf> <from> <to> <out.jpg>` 出缩略联系表人工确认, 范围写进 `fix_ans3.py` 再重跑 `extract_keys.py`
- (v29.2) 答案页第一页 (Booklet A 选择题表) 常被标成题目页: agent 报 "images are pages 2-3 only" 就往前找一页
- (v29.2) 横扫的答案页 (南华科学 2024 / SCGS 科学 2023) 要转正, 两份方向不同, 转完看一眼
- (v29.2) 老格式题数: 2023/2024 英文 Booklet A 28 题, 2026 数学 18 题; 华文 Q26-29 完成对话选项到 5-8, 不算选择题
- (v29.2) extract_keys 对没答案页的卷也会记 done, 补标签前先从 keys.json 删掉那条
