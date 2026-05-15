# chamui-psle — Claude Code 必读 (项目最高优先 context)

> 这个文件是 Claude Code 自动加载的项目背景。**任何账号 git clone 后第一件事就是读这里。** 然后再看 `HANDOFF.md` (详细) 和 `CHANGELOG.md` (改造历史)。

---

## 1. 用户画像 + 孩子真实 AL 起点 (核心!)

**用户**: 中国 DP 转学生家长, 孩子 2026.5 进入新加坡 P5, **2027.9 PSLE 笔试**。

**孩子起点 AL** (2026-05 真实数据):

| 科目 | 当前分 | AL | 目标 | 缺口 |
|---|---|---|---|---|
| **英语** | 65 | **AL5** | 85+ (AL2) | **+20, 最大缺口** |
| **科学** | 85 | AL2 | 90+ (AL1) | +5 |
| **数学** | 90+ | AL1 | 维持 AL1 | 维持 |
| **华文** | 90+ | AL1 | 维持 AL1 | 维持 |

**总目标 AL**: 6-8 (DP 路径, COP 比 PR 严 2-3 分)
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

## 7. 当前规模 (v19.5)

- **装备 69 件** (39 points + 10 milestone + 8 streak-days + 3 ⭐ + 3 game-runs + 3 week + 2 monthly + 1 streak)
- **成就 60 个** (含周次里程碑)
- **皮肤 6 套** / **宠物 12 阶 + 高达伙伴** (v19.1 双宠物)
- **Mini-game 12 种**: Grammar 195 / Cloze 136 / SST 65 / Math 75 / Editing 61 / Vocab 61 / SciMCQ 70 / Chinese 40 / **Listen 51** / SciClassify 10 / Unit 45 / CompOE 20篇
- **知识树**: 35 节点 × 3 题 = 105 道 PSLE 风练习
- **73 周作文**: 73 个 prompt
- **QA**: 149 断言
- **v19.5 新系统**: 学习质量门槛 + 作文追踪 + 弱科挑战 + 模考闭环

---

## 8. 当前未做 TODO

1. **错题本扩展** 到 vocab/listen/editing/scilab (v18.59 仅 hook 了 4 个 MCQ + math)
2. **每日登录 +5 分 bonus** (持续小奖励)
3. **季节事件** (PSLE 100 天倒计时装备 / 假期主题)
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
