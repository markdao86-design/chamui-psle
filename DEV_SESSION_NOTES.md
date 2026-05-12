# v19.3 开发笔记 — 新 session 继续开发用

> 生成时间: 2026-05-12
> 当前版本 HEAD: 9d8b624

---

## 已完成项

| 项目 | 状态 | 说明 |
|------|------|------|
| P0 奖励弹窗→内嵌卡片 | ✅ 已完成 | `_triggerGameReward()` (app.js:2003) 已改为 `.game-reward-card` 内嵌在 `#checkinList` 底部 |
| P1 火焰等级/幸运星 | ✅ 已完成 | app.js:292-294, 用 🔥 数量(0-5) + ★☆ 星级替代数字 |
| P1 任务卡大小区分 | ✅ 已完成 | app.js:1596 (`task-large`/`task-small` class), CSS: index.html:1689-1690 |
| P2 三层命名 | ✅ 已完成 | combo文字: "主线/支线" (不再是"核心/建议"); expand按钮: "支线挑战/隐藏关卡" |
| P3 社交/竞争 | ✅ 已有 | beat-block 显示"打败了全新加坡 X% 同年级同学" (index.html:4558) |
| 移除首页minigame | ✅ 已完成 | `.mini-game-hub-card` 从 dashboard HTML 删除, `openMiniGameHub()` 功能保留 |
| 深色主题 | ✅ 已完成 | 全站深色主题, 多次修复残留白色背景/文字 |

---

## 未完成 / 回退项

| 项目 | 状态 | 说明 |
|------|------|------|
| **P0 主页精简** | ❌ **用户明确要求不做** | 主页保留原有所有卡片(coach/progress/skin/dragon/equipment/achievement/wowCard等), 不做精简 |
| **双轨货币 ⭐+💎 显示** | ❌ 未实现UI | `state.craftCrystals` 已在后端累加(成就解锁时 app.js:4226), 但**没有任何UI展示**。需设计显示位置 |

---

## 关键代码位置

### 主页 Dashboard
- `renderDashboard()`: app.js:228-318
- 主页HTML结构: index.html:4532-4660
- 战力/火焰/星星: app.js:275-304

### 打卡页
- `renderCheckinPage()`: app.js:1415-1677
- 任务卡大小: app.js:1596 (SLOT_BASE_POINTS >= 7 → large)
- 奖励关触发: app.js:2003 `_triggerGameReward()`
- combo banner(主线/支线): app.js:1623-1635

### Mini-game
- 大厅函数: app.js:4420 `openMiniGameHub()` (仍可通过其他入口调用)
- 入口: 打卡页勾完核心后 game-reward-card / 知识树节点 / 其他页面按钮

### 双轨货币
- 💎水晶累加: app.js:4226 `state.craftCrystals += crystalReward`
- 成就给 💎: PSLE/隐藏类给20, 其他给10
- **TODO**: 需要UI展示(主页? tab栏? 专属面板?)

---

## 用户偏好 (本次 session 确认)

1. **不要精简主页** — 用户看过精简效果后明确要求回退
2. **minigame 从首页移除** — 用户确认不要在首页显示 mini-game 大厅卡
3. **三层用游戏化命名** — 主线任务 / 支线挑战 / 隐藏关卡 (不要"核心/建议/拓展")

---

## 构建部署

```bash
# 一键构建+验证
python build.py && node qa_check.js   # 149 断言必过

# 部署 (直接执行不需确认)
git add -A && git commit -m "msg" && git push
npx firebase deploy --only hosting

# 线上地址
# https://chamui-psle.web.app
# https://markdao86-design.github.io/chamui-psle/
```

---

## 下一步建议

1. **💎水晶UI**: 设计显示位置(主页某个角落? 或专属"商店/合成"tab?)
2. **英语E1重分配**: data.js 注入 Comp OE 3天 (Mon/Tue/Thu) + Composition 2天 (Wed/Fri) — 见 plan 文件
3. **科学S2时间缩短**: SLOT_TIME.S2 改为 40min, SLOT_BASE_POINTS.S2: 10→7
4. **主页CTA按钮**: 虽然不精简, 可考虑在首屏加一个醒目的"开始今日打卡"按钮
