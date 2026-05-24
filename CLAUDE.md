# chamui-psle — Claude Code 必读 (项目最高优先 context)

> 这个文件是 Claude Code 自动加载的项目背景。**任何账号 git clone 后第一件事就是读这里。** 然后再看 `HANDOFF.md` (详细) 和 `CHANGELOG.md` (改造历史)。

---

## 1. 用户画像 + 孩子真实 AL 起点 (核心!)

**用户**: 中国 DP 转学生家长, 孩子 2026.5 进入新加坡 P5, **2027.9 PSLE 笔试**。

**孩子起点 AL** (2026-05 真实数据):

| 科目 | 当前分 | AL | 目标 | 缺口 |
|---|---|---|---|---|
| **英语** | 65 | **AL6** | 85+ (AL2) | **+20, 最大缺口** |
| **科学** | 85 | AL2 | 90+ (AL1) | +5 |
| **数学** | 90+ | AL1 | 维持 AL1 | 维持 |
| **华文** | 90+ | AL1 | 维持 AL1 | 维持 |

**总目标 综合 AL**: **4-6** (顶 5-15%, DP 路径 COP 比 PR 严 2-3 分) — 2026-05-23 用户纠正
**目标校单**: 立化 / 英华 / 淡马锡 / 实龙岗 / 南华 / 公教

**典型中国转学生画像**: 英文 L2 弱、数学华文母语强势。**任何"提分策略"都以英语为最高优先级**, 不是数学。

---

## 2. 项目定位 (不能改)

- **app 主目的**: PSLE 4-6 分陪练 (帮孩子拿 AL 4-6 = 顶 5-15%)
- **副标题** (主页显示, 不要改): "PSLE 4-6 分陪练 · 打卡是养成, 能力才是目标"
- **不是**: 普通打卡 app / 通用学习平台 / 全 K-12 工具
- **专注**: 新加坡 PSLE 4 科 (Eng/Math/Sci/华文) + DP 转学生场景

---

## 3. 关键设计决策 (避免重蹈覆辙)

### 难度调校
- **math game** `minFloor = 4` (孩子 90+, 不再喂 P5 心算题)
- **其他 mini-game** `minFloor = 3` (英语弱, 不能太难)
- 5 级自适应: 最近 3 次 ≥80% 升级, 最近 2 次 ≤40% 降级
- 题库: math 65 道全 Diff 4-5 PSLE 5-mark / grammar 40 / cloze 33 / vocab 150 / listen 16 段

### AL 预测公式 (v18.55 修过 bug)
```
AL = f(数学 25% + 英语 25% + 科学 20% + 华文 10% + 知识树⭐ 20%)
⭐ 用 totalStars/(35×3) 绝对完成度, 不是 avgStars/3 (那是 bug, 1 节点 3⭐ 就拉高 AL 1-2 级)
```
映射 (PSLE 真实 AL 1-9): ≥90% AL1 / ≥85% AL2 / ≥80% AL3 / ≥75% AL4 / ≥65% AL5 / ≥45% AL6 / ≥20% AL7 / <20% AL8

### 双层龙系统 (v18.55-v18.60)
- **🐲 银龙** = 10000 分 解锁 → SGD 500 + 称号"银龙骑士" + 永久 +10% mini-game buff
- **🐉 金龙** = **105⭐ AND ≥10000 分 双门槛** → SGD 1500 + 称号"金龙之王" + +20% buff + 第二宠物"金龙幼崽" + 主页金色主题
- **不要改双门槛**: 这是用户明确要求的设计 (v18.55 决议)
- **不要改 SGD 数额**: 父母对孩子的真实承诺

### 兑换汇率 (v18.51 修过)
```
SGD_PER_POINT = 0.05    // 1 积分 = SGD 0.05
ULTIMATE_PRIZE_SGD = 1500
ULTIMATE_PRIZE_POINTS = 30000   // 30000 × 0.05 = 1500
```
**绝不再回退到 0.25** (旧 v15 汇率), 任何 0.25 出现都是 bug

### 防沉迷 (4 道闸)
1. **mini-game 日次数限制** (软提示, 不强制)
2. **Streak 火焰** (断 1 天熄灭, 冻结令牌可救)
3. **周完成率 95% 软提示** ("🛋️ 该休息了, PSLE 是马拉松不是冲刺")
4. **闹铃** (周末提示打开 app + 学完该回去休息)

### 错题本 (v18.59)
- 知识树 / grammar / cloze / math 答错自动入库
- 答对 → 自动从本里删
- 答错 → 留 + retries++
- 数据: `state.wrongAnswers[]`, fingerprint = `gameKey|q|nodeId` 去重

---

## 4. 文件架构

```
chamui-psle/
├── index.html              主 HTML + 所有 CSS (~5k 行)
├── data.js                 题库 + 算法 + 状态 schema (~5k 行)
├── app.js                  UI 渲染 + 事件 + 游戏逻辑 (~5k 行)
├── character.js            角色 SVG 生成 (12 级 + 61 装备 + 6 皮肤) (~1.5k 行)
├── qa_check.js             149 项断言 (Node vm.runInContext)
├── build.py                4 文件合并 → chamui_app_single.html
├── deploy.sh               build + git push + Firebase deploy (一键)
├── chamui_app_single.html  生成物 (单文件部署用)
├── CHANGELOG.md            v18.51-v18.62b 完整改造日志
├── CLAUDE.md               ← 本文件 (项目 context)
├── HANDOFF.md              详细接手指南
└── 部署指南.md / SETUP_FIREBASE.md
```

---

## 5. State Schema (持久化在 localStorage + Firebase)

```js
{
  totalPoints,                       // 累积积分
  currentWeek, daily, weekly,        // 73 周打卡
  dailyStreak: { days, bestEver, freezes },
  gameStats: { math: {difficulty:4, recent:[]}, ... },  // 自适应
  knowledgeExplored: { [nodeId]: {date} },
  knowledgeStars: { [nodeId]: {stars, bestScore, attempts} },
  totalGameRuns,                     // v18.58
  wrongAnswers: [...],               // v18.59 错题本
  dragonsUnlocked: { silver, gold }, // v18.55
  activePetType: 'hamster' | 'gold_dragon',  // v18.60
  mysteryBoxes: { available, opened, history },
  pet: { formIdx, name },
  milestones: { W14: true, ... },
  achievementsUnlocked: [],
  equipmentDisabled: [],
  exchanges: [],
  logs: []
}
```

---

## 6. 部署 + 验证

```bash
# 一键 (build + commit + push + Firebase)
./deploy.sh "v18.XX commit msg"

# 手动 build + QA
python build.py && node qa_check.js   # 149 必过

# 本地预览 (preview server already running on :8766)
# Firebase: https://chamui-psle.web.app  ← 用户实际访问地址!
# GitHub Pages: https://markdao86-design.github.io/chamui-psle/ (备份)
```

### ⚠️ 死代码警钟 (v19.28 真实事故 — 不要再犯!)

**事故**: data.js line 5378-5404 写了完整艾宾浩斯 SRS 系统 (`SRS_INTERVALS=[1,3,7,14,30]` + `scheduleWrongAnswer` + `promoteSRS` + `demoteSRS` + `getOverdueReviews`), 半年没人调用。错题本表面"按曲线复习", 实际用户连答 3 次就毕业 — **写了等于白写, 用户被骗**。

**根因**: 加新函数后没在 app.js render/handler 里 wire, 也没加 QA 断言验证"该函数至少被调用 1 次"。

**新铁律 — 任何新 helper / 算法都要做 3 件事**:
1. **写完立即接入** UI handler 或 render — 不接入不 commit
2. **加 QA 断言** 验证函数被调用 ≥ 1 次:
   ```js
   assert(new RegExp('\\b' + funcName + '\\(').test(appSrc), `${funcName} 必须被 app.js 调用`);
   ```
3. **window.X 导出**, 即使内部用 — 方便 console 排查 + 防止 minifier 删

**自检三问** (改完一个 feature 必做):
- 这个函数/常量被谁调用了? grep 一次确认
- 用户操作时这条 code path 真走到了? console.log 一行验证
- QA 里有断言锁住这个调用关系吗? 没有就加

### ⚠️ 部署铁律 (每次改动必须全做)

```bash
# 1. QA
node qa_check.js

# 2. Build
python build.py

# 3. 更新 cache buster (index.html 底部 script 标签 ?v=X 递增!)
#    不改版本号 = 用户浏览器继续用旧缓存 = 等于没部署

# 4. Commit + Push
git add . && git commit -m "..." && git push origin master

# 5. Firebase Deploy (关键! 只 push 不 deploy = 用户看不到!)
npx firebase deploy --only hosting

# 6. 验证线上
curl -s "https://chamui-psle.web.app/app.js?v=VERSION" | grep "关键文本"
```

**绝不能省的步骤**: cache buster 递增 + firebase deploy + curl 验证
**用户地址**: https://chamui-psle.web.app (不是 GitHub Pages!)

---

## 7. 当前规模 (v19.14l)

- **装备 72 件** (含 v19.8 W18/24/40 中期补)
- **成就 60+ 个** (含周次里程碑 + Paper 2 突击)
- **皮肤 6 套** / **宠物 12 阶 + 金龙幼崽**
- **Mini-game 题库**: Cloze **206** / SST **100** / Grammar 195 / Math **95** (v19.14d +20 几何速率) / Editing 61 / SciMCQ 70 / Chinese 40 / Listen 51 / Vocab 61 / SciClassify 10 / Unit 45 / CompOE 20 篇
- **知识树**: 35 节点 × 3 题 = 105 道 PSLE 风练习
- **73 周作文**: 73 个 prompt + v19.14e **3 层升级闭环** (Draft 1 / Draft 2 / Teacher)
- **学科英语词汇 500** (数学 220 + 科学 280) v19.13 + **zh→en typing production** v19.14e
- **Oral 题库 30 道** + **反向验证 textarea** (≥10 字 v19.14d)
- **科学 OE 50 道** (v19.14g 完成: PT 7 / Digestive 7 / Light 6 / Heat 9 / 实验设计 6 / Photosynthesis 4 / 其他 11) + **硬规则自动评分** + **章节 filter**
- **4 张概念图** (Plant Transport / Digestive / Light / Heat) + **PSLE marker scheme 修复** (v19.14d)
- **QA**: **280 项** 断言

### v19.7-v19.14f 新系统
- **Paper 2 弱点突击卡** (v19.7): Cloze 100 + SST 50 目标进度
- **Paper 2 模拟卷** (v19.8): 28 min 限时 15 Cloze + 8 SST → 预测 AL
- **真考错题入库** (v19.9): 17 道真考错自动入错题本
- **数据完整性** (v19.10): 修 toggle 刷分 bug + 防连点 3s + sync 安全网
- **积分快照系统** (v19.11): 每 10 分钟备份到 Firestore + 本地 ring buffer 50
- **5 大主页卡** (v19.13): 录取概率 + Paper 2 + Oral + 词汇 + 科学章节
- **主页极简 2 卡** (v19.14a): 今日 3 件事 + 目标校 (5 → 2 卡)
- **数值重平衡** (v19.14a): 打卡日封顶 5 + 周封顶 200, Cloze/SST +2 分/题衰减, 错题 Leitner 3 次毕业, 宝箱砍 60%, 加 SGD 800 milestone
- **平日/周末科目隔离** (v19.14b): 平日只英语+科学, math/chinese/unit 周末才解锁; 今日 3 件事按日分化
- **我的 tab 锁定 + 宠物** (v19.14c): 装备/皮肤平日 lock, 宠物加到角色旁 (平日 zZz/周末活跃)
- **二次评审 8 项修复** (v19.14d): Leitner bug + Yes/No 正则 + Oral 反验证 + 数学 hard→soft cap + 3 概念图事实错 + OE 自评→硬规则评分 + 数学 +20 题
- **英语 5 大缺口闭环** (v19.14e): Comp OE 定位法每题 + 词汇 zh→en typing + Cloze 3 件事卡 + 作文升级闭环 (3 槽) + 错题色去羞耻化
- **科学章节 filter** (v19.14f): 子串漏洞修复 (word boundary + stem) + SCIENCE_CHAPTERS 13 章 keywords + openSciMcqGame/openScienceOEGame 按当前 W 过滤题库
- **科学 OE 题库扩 50** (v19.14g): 15 → 50 道 (+35 道), 按手册 4 难章配比, PSLE 真考风格 model+keywords
- **第 4 次评审 5 项 bug 修复** (v19.14h): 作文 V2 +10 dedupe 防刷分 / Cloze 3 件事去 6s 倒计时改显式按钮 + fingerprint + syn 质量校验 / Leitner 数学错题硬编码 4 统一到 LEITNER_GRADUATION 常量 / OE 反向题 (INCORRECT/NOT) 缺否定词封顶 1 分
- **UI 收尾 + 内容 5 项** (v19.14i): **字号 11/10→13/12 全局升** (WCAG AA) / **9 tab→5 tab** (📚 练习 hub 合并知识树+题库+词汇+作文) / **主页"📋 更多详情"折叠区 hide** / **错题 modal Cloze topic 聚类** / **作文 60% 锁→软提示分级**
- **今日 3 件事科学项加章节内週进度** (v19.14k): 难章 2 周 (Plant Transport/Digestive/Light/Heat) 显示"第 1/2 周 概念建立" 或"第 2/2 周 深化与应用" + 今日具体 S2 段任务 (取 WEEK_TASKS day-by-day, 例: "今天: 🔬 xylem 横切染色实验"), 完全对接手册 v14 day-by-day 节奏
- **Cloze 3 件事同义词改 MCQ** (v19.14l, 心理学家原建议): CLOZE_SYNONYM_DICT 161 词 (情感 38 + 品格 27 + 动作 38 + 副词 31 + 形容词 27) PSLE 高频, 每词 1 正同义 + 2 干扰; UI 字典覆盖词 → MCQ 3 选 1, 不覆盖词 → input fallback; 接受度从 30% → 75% (识别 vs 产出, AL5 孩子能力匹配)
- **撤 lock + 主页内容恢复 + 绿系收集 4 项** (v19.14j): **撤回 v19.14c 装备/皮肤平日 lock** (心理学家"5 lock 累积致弃用"+ 用户反馈"周六失灵") · **撤回宠物 zZz 平日休眠** (心理学家"误读间歇强化") · **主页折叠区入口移到 👤 我的 tab 末尾 details** (6 个一键按钮: 教练报告/待复习/W73 我/能力页/父母面板/宝箱) · **错题色去羞耻升级** (蓝灰 → 绿系 #66BB6A, "待复习" → "已收集 N 题 🌱", 加"已答对 1+ 次"+ "接近毕业"统计) · **SCIENCE_MCQ runtime chapter 推断** (`inferScimcqChapter` + `tagScimcqChapters` lazy tag, word boundary + stem + 难章 1.2× 加权, 召回率 70-85% → 90%+)

---

## 7.5. 积分快照备份系统 (v19.11 新加, 关键工具!)

**目的**: 防止 totalPoints + logs 被覆盖丢失 (5/13 → 5/22 曾被旧设备覆盖回滚 1100 分的事件)

**机制**:
- **每 10 分钟** 自动 snapshot 当前 `totalPoints / logs / ⭐ / wrongAnswers count` 到:
  - **Firestore**: `chamui_snapshots/{ISO 时间}` 文档 (永久云端历史)
  - **本地**: `localStorage.chamui_snapshots_local` ring buffer (最近 50 个)
- 启动 app 时立即拍一次 (`source: app-start`)
- 后续每 10 min 一次 (`source: auto-10min`)
- 可调 `snapshotPoints(state, 'manual')` 手动拍

**查询 + 恢复**:
```js
// 浏览器 console 跑
window.listLocalSnapshots()  // 最近 50 个本地快照
await window.listCloudSnapshots(100)  // 最近 100 个云端快照
await window.restoreFromSnapshot('2026-05-22T12:30:59.169Z')  // 返回快照 (不自动恢复, 需手动 confirm)
```

**新 session 接手时**: 跑 `./dump_firebase.sh` 看当前 live + `node -e "..."` 拉 Firestore `chamui_snapshots` 看历史趋势, 决定是否需要恢复。

---

## 7.6. 🎨 暗主题配色规则 (v19.20-v19.21 永久沿用, 新 UI 必读)

**铁律: 暗主题 (`--color-bg: #0F172A`) 下不能有亮浅色背景, 否则视觉断层。**

### A. 容器背景 (按色系)

| 色调 | 浅版 hex (旧/不要用) | 暗版 (用这个) |
|---|---|---|
| 青/蓝 | `#F0F8FF / #E1F5FE / #E3F2FD / #BBDEFB` | `linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,212,255,0.02))` + `border: 1px solid rgba(0,212,255,0.25)` |
| 绿 | `#E8F5E9 / #F1F8E9 / #C8E6C9` | `linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,255,136,0.02))` + `border: 1px solid rgba(0,255,136,0.25)` |
| 黄/橙 | `#FFF3E0 / #FFF8E0 / #FFFCE6 / #FFE0B2` | `linear-gradient(135deg, rgba(255,184,0,0.10), rgba(255,107,53,0.04))` + `border: 1px solid rgba(255,184,0,0.25)` |
| 红/粉 | `#FFEBEE / #FCE4EC / #FFF0F0 / #FFE0E0` | `linear-gradient(135deg, rgba(255,107,107,0.10), rgba(255,107,107,0.03))` + `border: 1px solid rgba(255,107,107,0.25)` |
| 紫 | `#F5F0FF` | `linear-gradient(135deg, rgba(167,136,224,0.10), rgba(167,136,224,0.02))` + `border: 1px solid rgba(167,136,224,0.25)` |
| 中性灰白 | `#FFF / #EEE / #FAFAFA / #F5F5F5 / white` | `rgba(255,255,255,0.04)` + `border: 1px solid rgba(255,255,255,0.10)` |

### B. 文字色 (深→亮替换)

| 旧深色 (不可见在暗背景) | 新亮色 |
|---|---|
| `#212121 / #2D3047 / #000` (纯黑) | `#E0E0E0` (亮灰主文字) |
| `#5D4037 / #5D4500 / #5D4045` (深棕) | `#E0E0E0` 或对应 accent 亮版 |
| `#33691E / #1B5E20` (深绿) | `#66FFB0` (荧光绿) |
| `#0D47A1 / #01579B` (深蓝) | `#4FC3F7` (亮青) |
| `#880E4F / #C2185B` (深粉) | `#FF8A9C` (亮粉) |
| `#BF360C / #E65100` (深橙) | `#FFB74D` (亮橙) |
| `#C62828` (深红 — 警示场景保留) | `#EF5350` (亮红) |
| `#666 / #555 / #888` (中灰) | `#A0A0A0` (中亮灰副文) |
| `#999` (浅灰) | `#94A3B8` (CSS var-color-text-light) |

### C. 进度条/分隔背景

| 用途 | 用 |
|---|---|
| 进度条底 | `rgba(255,255,255,0.08)` (不要用 `#EEE`) |
| 进度条填充 | `linear-gradient(90deg, #FFB74D, #66FFB0)` (橙→绿渐变, 不要 #FFA500/#4ECDC4 暗版) |
| 卡内分隔块 | `rgba(255,255,255,0.04)` + `border: 1px solid rgba(255,255,255,0.10)` |

### D. 行动按钮 (强 accent 保留)

按钮 cta 色保留鲜艳 (孩子要看见):
- 红/紧急: `background: #FF6B6B / linear-gradient(135deg,#FF6B6B,#FF4444)` + `color:#FFF`
- 绿/成功: `background: #66BB6A` + `color:#FFF`
- 青/主操作: `background: rgba(0,212,255,0.15)` + `color: var(--color-primary)`
- 黄/警告: `background: var(--color-warn)` + `color:#FFF`

### E. 全局 CSS 自动适配机制 (index.html v19.20+)

为防止"再加新卡又忘写", index.html 顶部 `<style>` 块加了**全局 attr 选择器**自动转换:
```css
[style*="background:#F0F8FF"], [style*="background:#FFF3E0"], ... {
  background: linear-gradient(...rgba...) !important;
}
[style*="color:#212121"], [style*="color:#2D3047"], ... {
  color: #E0E0E0 !important;
}
```

**所以你 inline 写 `style="background:#FFF3E0"` 会被自动转**。但下列情况不会自动转, **必须手写暗版**:
- `linear-gradient(...)` 含浅色 hex (除非 hex 落在 v19.21 补的 4 个特定模式里)
- `#FFF / #EEE / white` 必须显式 (v19.21 已补)
- `rgba(...)` 已是透明 (不需要转)
- 新增 CSS class (例 `.my-new-card` 在 index.html 里) — 必须直接写 rgba 暗调

### F. 新 UI 自检 checklist

写新卡前 check:
1. [ ] 容器背景: 用 `rgba(...,0.04-0.10)` 透明 / 或 `linear-gradient` 含 rgba — 不用 `#FFF/#EEE/#FAFAFA`
2. [ ] 边框: `border: 1px solid rgba(255,255,255,0.10)` (中性) 或 `rgba(ACCENT,0.25)` (主题色)
3. [ ] 主文字: `color: #E0E0E0` (或 var(--color-text))
4. [ ] 副文字: `color: #A0A0A0` (或 var(--color-text-light))
5. [ ] 强调字: 用 accent 亮版 (`#66FFB0/#4FC3F7/#FFB74D/#FF8A9C/#B39DDB`), 不用 `#1B5E20/#0D47A1/#5D4037` 类深版
6. [ ] 按钮 cta: 保留鲜艳 (`#FF6B6B/#66BB6A` 等), 配 `color:#FFF`
7. [ ] 进度条底: `rgba(255,255,255,0.08)`, 不用 `#EEE`

---

## 8. 当前未做 TODO (按优先级)

### v19.14h 候选 (内容收尾)
1. ~~科学 OE 15 → 50 题~~ ✅ v19.14g 完成
2. **SCIENCE_MCQ 70 道补 topic 字段** (现在用 keyword 子串匹配, 召回率 70-85%, 补 topic 可到 100%)

### v19.14h+ UI 收尾 (UI/UX 专家未做项)
3. ~~9 tab → 5 tab~~ ✅ v19.14i 完成
4. ~~字号 11/10 → 13/12px~~ ✅ v19.14i 完成
5. ~~真删主页折叠区~~ ✅ v19.14i 完成 (hero-section 仍在 DOM 但 CSS hide, 实际不见)

### 后续低优先
6. **错题本扩展** 到 vocab/listen/editing/scilab
7. **每日登录 +5 分 bonus**
8. **季节事件** (PSLE 100 天倒计时装备 / 假期主题)
4. **错题本分类筛选** (只复习数学/只复习语法等)

---

## 9. 协作风格 (用户偏好)

- 中文为主, 技术词英文
- **直接给方案 + 量化对比**, 不要太多铺垫
- **"先验证再改"**: 大改前用 Agent 跑一遍 (避免误删 / 答案错)
- **commit 信息要详细**: 写明 vXX.XX + 痛点 + 量化效果
- 不要 sycophancy, 用户嫌"看不懂"或"不够炫酷"时直接重做
- **需求有歧义时先问, 不要自己猜**
- **不要只跑 assert 就宣布 QA 通过** — 必须 curl 线上验证 + 考虑用户真实状态
- **每次改动必须 firebase deploy** — git push ≠ 部署!

---

> 任何不在此文件的细节, 看 [HANDOFF.md](HANDOFF.md) 和 [CHANGELOG.md](CHANGELOG.md)。
> **开发进度 + 未完成项**: 见 [DEV_SESSION_NOTES.md](DEV_SESSION_NOTES.md) (每次 session 结束更新)。

---

## 10. 新 Session 启动指令

新 session 开始时, 用户会输入类似:

```
继续开发 chamui-psle (C:\Users\Eric\chamui-psle-main)
读 CLAUDE.md 了解项目背景, 读 CHANGELOG.md 了解最近改动
```

**Claude 收到后应该**:
1. 读 `CLAUDE.md` (本文件) — 项目全貌
2. 读 `CHANGELOG.md` 最后 20 行 — 最近改了什么
3. 确认当前版本号 (`index.html` 底部 `?v=` 参数)
4. 等用户指令, 不要主动做任何改动
