# HANDOFF — chamui-psle 5 分钟接手指南

> 给新 Claude 账号 / 新协作者: 读完这份就能续开发, 不会重做已删的设计、不会喂错难度题、不会重蹈已修的 bug。

---

## ⏱ 5 分钟快速上手

```bash
# 1. Clone (1 min)
git clone https://github.com/markdao86-design/chamui-psle.git
cd chamui-psle

# 2. 装依赖 (2 min)
npm install firebase-tools  # Firebase 部署用
# Python 3.x (build.py 用) — 大概率系统已有

# 3. 读 context (2 min)
cat CLAUDE.md      # ← 项目核心 context (孩子画像/设计决策)
cat CHANGELOG.md   # ← 9 版改造日志 (v18.51-v18.62b)

# 4. 验证能 build
python build.py && node qa_check.js   # 应输出 "全部通过 ✅ (149 项)"

# 5. 部署
./deploy.sh "test commit"   # 一键 build + git push + Firebase
```

---

## 🎯 项目一句话

> 给一个 P5 中国转学生 (英语 65 弱 / 数学华文 90+ 强) 设计的 PSLE 备考 web app, 帮她拿 PSLE AL 4-6 (顶 5-15%)。

---

## 🚦 启动前必须知道的 5 件事

### ① 孩子是 **英语弱**, 不是数学弱
所有"提分策略"以英语为最高优先级。任何把数学加密/把英语降权的改动都是错的。

### ② math game 已升到 P6/PSLE 难度 (v18.54)
- 题库 65 道, 全 Diff 4-5 (反向%/Bar Model/调和速度/假设法)
- minFloor=4 (跳过 P5 心算)
- **不要回退到喂 P5 简单题**

### ③ 双层龙是终极目标, 双门槛设计 (v18.55)
- 银龙 = 10000 分 → SGD 500
- 金龙 = **105⭐ AND ≥10000 分 双门槛** → SGD 1500
- **不要改成单门槛或降阈值** — 用户明确决议过

### ④ SGD 汇率 = 0.05 (v18.51 修过)
任何 0.25 出现都是旧 v15 残留 bug, 必须修。

### ⑤ 部署 = `./deploy.sh "msg"` 一键搞定
build → git commit → push → Firebase deploy 一条龙。**不要手动 git push** (会重复)。

---

## 📚 关键 commit 转折点

| Commit | 版本 | 设计原因 |
|---|---|---|
| `d86ea59` | v18.55 | 双层龙首次设计 (银/金 双门槛) — 用户拍板 SGD 承诺不缩水 |
| `b2fc905` | v18.61 | 装备穿戴感 (apple 真握手 / cake 双手捧 / rocket 真骑乘) |
| `994635b` | v18.62 | 装备 3D (修 z-order bug + 全局 SVG defs) — rocket 之前是"红色影子"因为 body 覆盖 |
| `ef69344` | v18.60 | 双龙 RPG 化 (拿到龙真有意义) — 用户嫌之前拿到啥也不变 |
| `a627aa9` | v18.58 | 持续激励 (61 装备 49 成就, 73 周平均 1.5/周) |
| `941b94a` | v18.59 | 错题本 (答错入库, 答对清空) |
| `d86ea59` | v18.51 | P0 bug 修 (蘑菇/paradigm/SGD0.25/eng_psle 时间) |

完整历史看 [CHANGELOG.md](CHANGELOG.md)。

---

## 🐛 已修的 bug (不要再写出来)

| Bug | 修过版本 | 表现 |
|---|---|---|
| `SGD_PER_POINT = 0.25` 残留 | v18.51 | 算错钱 (孩子拿 30000 分应是 1500 SGD, 旧值算 7500) |
| 蘑菇标"不开花植物" | v18.51 | 蘑菇是真菌不是植物, 改"地钱" |
| paradigm 在 VOCAB_HARD | v18.51 | SAT/大学词, 不是 PSLE |
| eng_psle Paper 1 时间错 | v18.51 | 标 70 min, 实际 1h10min, Editing 在 P2 不在 P1 |
| AL 公式 ⭐ 用平均拉高 | v18.55 | 1 节点 3⭐ 就让 AL 虚高 1-2 级, 改用 totalStars/105 绝对值 |
| math 喂 P5 心算题 | v18.54 | 孩子 90+ 浪费时间, minFloor 改 4 |
| rocket "红色影子" | v18.62 | SVG 渲染顺序 rocket 在 body 之前, 被覆盖 |
| 双龙卡占位太大 | v18.56 | 紧凑化, 一行一龙 |
| 知识树/作文是弹框 | v18.49 | 改成 page (data-page="knowledge") |
| 95% 周完成率"封顶" | v18.52 | 软提示, 不强制扣分 (binary slot 本来就防刷) |

---

## 🚧 当前未完成 TODO (可以接着做)

按优先级:

### P1 (高 ROI, 快做)
1. **错题本扩展到 vocab/listen/editing/scilab** — 4 个 mini-game 还没 hook 错题入库 (v18.59 仅 4 个)
2. **P3 周次里程碑装备** — W30/W36/W50 加 3 件"光打卡也解锁" (跟成绩脱钩)

### P2 (中, 内容打磨)
3. **每日登录 +5 分 bonus** — 持续小奖励
4. **错题本分类筛选** — 只复习数学/语法
5. **季节事件** — PSLE 100 天倒计时装备 / 假期主题

### P3 (大, 选做)
6. **PSLE 名人堂截图分享** — 拿金龙后角色+日期+总分入"名人堂", 可截图给家长群
7. **第二宠物完整养成** — 金龙幼崽现在只是显示, 没独立喂养/进化逻辑

---

## 🔧 部署 + 测试流程

```bash
# 改完代码后
python build.py                        # 合并 4 文件 → chamui_app_single.html
node qa_check.js                       # 149 项断言, 必过
./deploy.sh "v18.XX 描述本次改动"      # 一键 build + push + Firebase

# 本地预览 (preview server: localhost:8766 通常已起)
# 浏览器开 chamui_app_single.html 也能直接玩

# 加新装备时记得更新 qa_check.js 的装备总数断言
```

### Preview MCP (Claude Code 内)
```js
preview_eval({ serverId, expression: 'window.MATH_QUESTIONS.length' })
preview_screenshot({ serverId })   // 看视觉效果
```

---

## 🔗 资源链接

- **Firebase 项目**: chamui-psle (用户 markdao86 owner)
- **GitHub repo**: https://github.com/markdao86-design/chamui-psle
- **生产环境**: https://chamui-psle.web.app
- **GitHub Pages**: https://markdao86-design.github.io/chamui-psle/
- **PSLE 真题外链** (题库 tab 内): clubmath.sg / freetestpaper.com / sgtestpaper.com / lioncitytutors.com 等 (全部 WebFetch 验证过)

---

## 👥 协作风格 (用户偏好)

- 中文为主, 技术词英文
- 直接给方案 + 量化对比, **不要太多铺垫**
- "先验证再改" — 大改前用 Agent 跑一遍 (避免误删 / 答案错)
- commit 信息详细 (v18.XX + 痛点 + 量化效果)
- 用户嫌"看不懂"或"不够炫酷"时直接重做, 不要狡辩
- 优先做 P0 (误导性), 然后 P1 (对标), 最后 P2 (打磨)
- **不要重做已修的 bug**, 看 CHANGELOG 先

---

## 🚨 红线 (绝对不能改)

1. **SGD_PER_POINT = 0.05** (v18.51 已修, 不要回退)
2. **金龙双门槛** (105⭐ + 10000 分, 不要改单门槛或降阈值)
3. **math game minFloor = 4** (其他 game 仍 3, 不要统一)
4. **副标题** "PSLE 4-6 分陪练 · 打卡是养成, 能力才是目标" (不要改成"全能学习 app")
5. **149 QA 全过** (改装备/题库/常量后必跑)
6. **不要 commit firebase 私钥** (config 是 public 的, 但 service account key 不能进 git)

---

> 还有疑问? 看 [CLAUDE.md](CLAUDE.md) 项目 context 或 [CHANGELOG.md](CHANGELOG.md) 完整历史。
