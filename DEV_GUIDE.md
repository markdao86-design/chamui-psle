# chamui-psle 开发说明文档

> 最后更新: 2026-05-09 (v18.98)  
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
- 科学: scilab
- 华文: 暂无 mini-game

### 3.2 题库抽样 (v18.97)

```
_sampleByDiff(pool, diff, n):
1. 优先本会话未答过的题 (按 _usedQIndex Set 跟踪)
2. 同难度优先, ±1 难度补充
3. 全 pool 用完 → 清空 Set, 重新循环
```

### 3.3 自适应难度

```
5 级 (1-5), 每 game 独立:
- math minFloor=4, 其他 minFloor=3
- 升级: 最近 3 次 ≥80%
- 降级: 最近 2 次 ≤40%
```

### 3.4 统计系统 (v18.97+)

```
gameStats[gameKey] = {
  difficulty,          // 当前难度
  recent[],           // 最近 5 局 (仅用于自适应)
  cumCorrect,         // 累积答对 (无上限)
  cumTotal,           // 累积总题 (无上限)
  cumRuns             // 累积局数 (无上限)
}
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

| 题库 | 数量 | 难度范围 |
|---|---|---|
| Math | 65 | Diff 4-5 (全 PSLE 5-mark) |
| Grammar | 40 | Diff 3-5 |
| Cloze | 33 | Diff 3-5 |
| Vocab | 150+ | Easy/Medium/Hard |
| Listen | 16 段 | Diff 3-5 |
| Editing | 25 段 | Diff 3-5 |
| SciLab | 53 | Diff 3-5 |
| Unit | 50 | Diff 3-5 |
| 知识树 | 35节点×3题=105 | PSLE 风格 |

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

---

## 10. 不可修改项

- 双龙门槛 (银10000分, 金105⭐+10000分)
- SGD 数额 (银500, 金1500)
- 汇率 0.05 (1分=SGD 0.05)
- 副标题文案
- Math minFloor=4
