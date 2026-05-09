# chamui-psle 开发说明文档

> 最后更新: 2026-05-09 (v19.0)  
> 部署: https://chamui-psle.web.app  
> GitHub: https://github.com/markdao86-design/chamui-psle

---

## 1. 项目概述

**PSLE 4-6 分陪练 App** — 帮助新加坡 P5/P6 学生考取 PSLE AL 4-6 (顶 5-15%)。

- 纯前端单页应用 (HTML + CSS + JS), 无框架
- 数据持久化: localStorage + Firebase Firestore
- 部署: Firebase Hosting (主) + GitHub Pages (备)
- 4 个源文件合并为 1 个 HTML 部署

---

## 2. 文件结构

```
chamui-psle/
├── index.html          HTML 结构 + 全部 CSS (~5200 行)
├── data.js             数据层 + 算法层 (~5300 行)
├── app.js              UI 渲染 + 事件 + 游戏逻辑 (~5400 行)
├── character.js        角色 SVG 生成 (~1500 行)
├── qa_check.js         149 项 QA 断言
├── build.py            合并 → chamui_app_single.html
├── deploy.sh           一键部署脚本
├── CLAUDE.md           Claude Code 项目 context (最高优先)
├── HANDOFF.md          详细接手指南
├── CHANGELOG.md        版本历史
└── DEV_GUIDE.md        ← 本文件
```

### 文件职责

**index.html**: 页面结构 + 全部 CSS (响应式断点 425/768/1024px)  
**data.js**: 题库定义 + 算法 (AL预测/自适应难度/抽题去重/错题本) + State schema  
**app.js**: UI渲染 + 事件处理 + mini-game流程 + 宠物系统 + Firebase同步  
**character.js**: 角色12级进化SVG + 61件装备SVG + 仓鼠7阶SVG + 表情系统

---

## 3. 核心系统

### 3.1 AL 预测 (v18.98)

```
综合 AL = 数学AL + 英语AL + 科学AL + 华文AL
(总分越低越好, 理想 4-6)

单科 AL 映射 (基于 mini-game 正确率):
≥90% → AL1 / ≥85% → AL2 / ≥80% → AL3 / ≥75% → AL4
≥65% → AL5 / ≥45% → AL6 / ≥20% → AL7 / <20% → AL8
```

科目 ↔ 游戏:
- 数学: math, unit
- 英语: grammar, cloze, editing, vocab, listen
- 科学: scilab, scimcq
- 华文: chinese

### 3.2 题库抽样 (v19.0)

```
_sampleByDiff(pool, diff, n):
1. 排除已掌握(mastered)的题 — 答对永久不再出
2. 优先本会话未答过的题 (按 _usedQIndex Set 跟踪)
3. 同难度优先, ±1 难度补充
4. 全 pool 用完 → 清空 Set, 重新循环
5. 全 pool 都 mastered → 重置 mastered, 重新出所有题
```

### 3.3 自适应难度 (v19.0)

```
6 级 (1-6), 每 game 独立:
- math/scimcq/chinese: minFloor=4 (起步PSLE级)
- 其他: minFloor=3
- 升级: 最近 3 次 ≥80%
- 降级: 最近 2 次 ≤40%
- 最高可达 diff 6 (超PSLE竞赛级)
```

### 3.4 统计系统 (v19.0)

```
gameStats[gameKey] = {
  difficulty,          // 当前难度 (1-6)
  recent[],           // 最近 5 局 (仅用于自适应)
  cumCorrect,         // 累积答对 (无上限)
  cumTotal,           // 累积总题 (无上限)
  cumRuns             // 累积局数 (无上限)
}
// 数据来源: mini-game + 知识树练习 + 名师秘诀答题
```

### 3.5 积分体系 (v18.99)

```
主线打卡 >> 支线游戏:
- 每日登录: +5
- 每 slot 打卡: 1-3 分/slot
- 全勤奖 (day combo): +15 (全 slot 完成)
- 每日任务: 3-12 分
- Mini-game: diff4=3分, diff5=5分, diff6=7分 (满分)
- 错题答对: +2/题
- 知识树/名师秘诀也计入各科 AL
```

### 3.6 Mastered 机制 (v19.0)

```
答对的题永久不再出:
- state.masteredQs = { poolKey: [qIndex, ...] }
- 每次答对 MCQ → _markMastered(poolKey, pool, q)
- _sampleByDiff 排除 mastered 的题
- 全 pool 都 mastered → 重置, 重新出
```

### 3.5 宠物仓鼠

- 7 阶进化 (蛋→王者, 按积分解锁)
- 4 种表情 (normal/happy/excited/sleepy, CSS class 切换)
- 冷笑话: 10s 首发, 之后每 2min 一条
- 气泡: 160px 宽, 靠右定位, 长文字向左滚动 (10s/轮)

### 3.6 双层龙

- 银龙: 10000 分 → SGD 500 + 10% buff
- 金龙: 105⭐ AND ≥10000 分 → SGD 1500 + 20% buff + 金色主题
- **不可修改**: 门槛 / SGD 数额

### 3.7 错题本 (v18.59)

答错自动入库 (fingerprint 去重), 答对自动移除

---

## 4. State Schema

```js
{
  totalPoints,
  currentWeek,
  daily, weekly,                    // 打卡记录
  dailyStreak: { days, bestEver, freezes, lastDate },
  gameStats: { [gameKey]: { difficulty, recent[], cumCorrect, cumTotal, cumRuns } },
  knowledgeExplored: { [nodeId]: { date } },
  knowledgeStars: { [nodeId]: { stars, bestScore, attempts } },
  totalGameRuns,
  wrongAnswers: [{ id, _fp, gameKey, type, q, opts, ans, explain, retries }],
  dragonsUnlocked: { silver: {}, gold: {} },
  activePetType: 'hamster' | 'gold_dragon',
  activeDragonBuff,
  pet: { formIdx, name },
  milestones, achievementsUnlocked, equipmentDisabled, exchanges, logs
}
```

---

## 5. 关键函数

### data.js
| 函数 | 用途 |
|---|---|
| `recordGameRun(state, gameKey, correct, total)` | 记录游戏 + 自适应 |
| `_sampleByDiff(pool, diff, n)` | 抽题(去重) |
| `getSubjectAccuracy(state)` | 4科准确率 |
| `predictOverallAL(state)` | AL总分 |
| `addToErrorBank(state, item)` | 错题入库 |
| `saveState(state)` / `loadState()` | 持久化 |

### app.js
| 函数 | 用途 |
|---|---|
| `renderDashboard()` | 主页渲染 |
| `petSay(message, duration)` | 宠物说话 |
| `petReact(eventType, message)` | 宠物反应 |
| `_renderAbilityOverview(state)` | 能力概览 |
| `syncToFirebase()` | 云同步 |

### character.js
| 函数 | 用途 |
|---|---|
| `_hamsterBase(furColor, bellyColor, hasHelmet)` | 仓鼠身体 |
| `_hamsterFace(furColor)` | 仓鼠表情 (4套) |
| `generateCharacterSVG(state)` | 角色+装备 |

---

## 6. 构建 + 部署

```bash
# 开发
python build.py && node qa_check.js    # 149 项必须全过

# 部署
npx firebase deploy --only hosting

# 一键 (Linux/Mac)
./deploy.sh "v18.XX 说明"

# Windows 手动
python build.py && node qa_check.js && npx firebase deploy --only hosting
```

环境要求: Python 3.x + Node 16+ + Firebase CLI

---

## 7. 常见开发任务

| 任务 | 步骤 |
|---|---|
| 加题目 | data.js 对应数组 → qa_check 验证 |
| 加装备 | data.js EQUIPMENT + character.js SVG |
| 加成就 | data.js ACHIEVEMENTS + app.js checkAchievements() |
| 改 AL | data.js predictOverallAL() + app.js 显示文案 |
| 改气泡 | index.html .pet-bubble CSS + app.js petSay() |

---

## 8. 题库规模

| 题库 | 数量 | 难度范围 | 游戏 key |
|---|---|---|---|
| Math | 75 | Diff 3-6 | math |
| Grammar | 50 | Diff 3-6 | grammar |
| Cloze | 39 | Diff 3-6 | cloze |
| Vocab | 150+ | Easy/Medium/Hard | vocab |
| Listen | 16 段 | Diff 3-5 | listen |
| Editing | 25 段 | Diff 3-5 | editing |
| SciLab (分类) | 53 | Diff 1-6 | scilab |
| Science MCQ | 100 | Diff 4-6 | scimcq |
| Unit | 55 | Diff 3-6 | unit |
| Chinese MCQ | 40 | Diff 4-6 | chinese |
| 知识树 | 35节点×3题=105 | PSLE 风格 | — |

---

## 9. 版本历史

| 版本 | 核心 |
|---|---|
| v18.51 | 8个硬错误修复 |
| v18.52 | 题库扩容 + AL公式统一 |
| v18.54 | Math全P6+ |
| v18.55 | 双层龙 + AL bug修 |
| v18.58 | 装备61/成就49 |
| v18.59 | 错题本 |
| v18.60 | 双龙RPG化 |
| v18.86 | 每日+5分 |
| v18.88-93 | 仓鼠宠物系统 |
| v18.97 | 题库去重+无上限统计 |
| v18.98 | AL=各科之和+气泡滚动 |
| v18.99 | 训练中心重构+错题本整合+积分重平衡(打卡>>游戏)+难度6级 |
| v19.0 | 新增科学MCQ+华文MCQ+难度梯度积分+答对永久去重(mastered) |

---

## 10. 不可修改项

- 双龙门槛 (银10000分, 金105⭐+10000分)
- SGD 数额 (银500, 金1500)
- 汇率 0.05 (1分=SGD 0.05)
- 副标题文案
- Math/SciMcq/Chinese minFloor=4

---

## 11. Mini-game 大厅 (10 个游戏)

| # | Key | 名称 | 科目 | 题型 | minFloor |
|---|---|---|---|---|---|
| 1 | vocab | 词汇连连看 | 英语 | 6×6 配对 | 3 |
| 2 | math | 数学速算 | 数学 | 10 题输入 | 4 |
| 3 | scimcq | 科学 MCQ | 科学 | 10 题选择 | 4 |
| 4 | chinese | 华文 MCQ | 华文 | 10 题选择 | 4 |
| 5 | editing | Editing 找错 | 英语 | 选错词 | 3 |
| 6 | listen | 听写练习 | 英语 | 填 5 词 | 3 |
| 7 | unit | 单位换算 | 数学 | 10 题输入 | 3 |
| 8 | grammar | Grammar MCQ | 英语 | 10 题选择 | 3 |
| 9 | cloze | Cloze 单空 | 英语 | 10 题选择 | 3 |
| 10 | scilab | 科学快分类 | 科学 | 拖拽分类 | 3 |

### 难度梯度积分 (v19.0)

| 难度 | 满分奖 | 7+奖 | 说明 |
|---|---|---|---|
| 3 | 2 | 1 | 基础 |
| 4 (PSLE) | 3 | 2 | 起步 |
| 5 (PSLE+) | 5 | 4 | 熟练 |
| 6 (竞赛) | 7 | 6 | 挑战 |

---

## 12. 训练中心 (原智慧教练, v18.99)

整合模块:
1. 📊 能力概览 (4 科 AL 网格)
2. 📈 今日训练统计 (积分/游戏局数/错题消灭)
3. ❌ 错题训练 (分科统计+每题详情+训练按钮, 答对+2分)
4. ⚡ 重点攻克 + 🎯 本周重点

错题本入口在训练中心, 主页独立卡片已隐藏。
