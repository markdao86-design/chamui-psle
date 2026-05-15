# v19.5 开发笔记 — 新 session 继续开发用

> 生成时间: 2026-05-15
> 当前版本: v19.5 (commit 6b87a6a)
> 部署地址: https://chamui-psle.web.app

---

## 本次 Session 完成项 (2026-05-15)

| 项目 | 状态 | 说明 |
|------|------|------|
| 专家评审 | ✅ | 组 PSLE 英语/科学/游戏化 3 专家评审, 发现"行为激励≠能力提升"结构性问题 |
| P0-b 学习质量门槛 | ✅ | `SLOT_SUBJECT` 映射 + `getSlotQualityMultiplier()` + calcSlotReward 积分×0.5 |
| P0-a 作文质量追踪 | ✅ | `state.compTracking` + 主页 3 步 checkbox 卡 + `markCompStep()` |
| P1-a 弱科挑战 | ✅ | `getWeeklyWeakChallenge()` + `recordWeakChallenge()` hook 在 recordGameRun + 主页卡 |
| P1-b 模考闭环 | ✅ | `addMockExam()` + `generateFocusAreas()` + 主页录入/诊断卡 + showMockExamInput() |
| P2 听力扩容 | ✅ | LISTEN_DICTATIONS 16→51 段 (+35), diff 3-5 全覆盖 |
| v19.4i 删 log 幽灵复原 bug | ✅ | 移除 anti-rollback + _localWritePending flag + 5s 双重保护 (上一 session) |

---

## 关键新文件/函数 (v19.5 新增)

### data.js
- `SLOT_SUBJECT` — slot 到学科映射 (E1→英语, WSM→数学, S2→科学...)
- `getSlotQualityMultiplier(state, slotKey)` — 返回 1 或 0.5
- `getCompStatus(state, week)` / `setCompStep()` / `getCompCompletion()` — 作文追踪
- `getWeeklyWeakChallenge(state)` — 返回 {subject, games[], required, bonus}
- `getWeakChallengeProgress(state)` / `recordWeakChallenge(state)` — 弱科进度
- `addMockExam(state, scores)` / `generateFocusAreas(state)` / `getFocusAreas(state)` — 模考

### app.js
- `renderCompTrackerCard()` — 作文 3 步追踪主页卡
- `renderWeakChallengeCard()` — 弱科挑战主页卡
- `renderFocusAreasCard()` — 模考诊断重点主页卡
- `showMockExamInput()` / `submitMockExam()` — 模考录入 modal

### index.html
- `#compTrackerCard` / `#weakChallengeCard` / `#focusAreasCard` — 3 个新卡容器
- `.comp-step-btn` / `.comp-step-btn.done` — 作文步骤按钮样式
- cache buster: `?v=19.5`

---

## 未完成 / 后续可做

| 项目 | 优先级 | 说明 |
|------|------|------|
| 作文追踪对接积分 | P1 | 当前仅 UI 提示, 未真正扣减作文 slot 积分 (可后续加) |
| 知识树弱科高亮 | P2 | 弱科挑战卡已做, 但知识树页面内还没有视觉高亮 |
| Listening MCQ 格式 | P2 | 当前仍是听写填空, 未加 PSLE 真考 MCQ 选择题格式 |
| 错题本扩展 | P2 | vocab/listen/editing/scilab 的错题 hook |
| Comprehension 互动 | P3 | CompOE 仅"自评", 可加"标关键词+对照 model answer 打分" |

---

## 历史 Session 完成项

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
