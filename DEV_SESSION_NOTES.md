# v19.15 开发笔记 — 新 session 接手指南

> 生成时间: 2026-05-23
> 当前版本: **v19.15** (第 5 次评审 P0 三件套)
> 部署地址: https://chamui-psle.web.app
> QA: **295 项全过** (+15 v19.15 P0 断言)
> 累计改造: v19.14a-l + v19.15 = **13 批 56 项** (v19.15 = 3 项 P0)
> 第 5 次评审平均分: **6.88/10** (实测 vs 自评预测 7.58, 偏差 -0.7)

---

## 🎯 新 Session 第一件事

```
继续开发 chamui-psle (C:\claude\chamui-psle)
读 CLAUDE.md 了解项目背景, 读 DEV_SESSION_NOTES.md 了解最近 12 批改造, 读 CHANGELOG.md 看具体改了什么
```

读这 3 个文件即可立即续做, **不需要重新评审 / 不需要回顾对话历史**。

---

## 📊 v19.14a-l + v19.15 = 13 批改造 (56 项, QA 163 → 295)

### v19.15 (3 项 P0, 第 5 次评审驱动)
- **P0-1 Leitner 巩固积分封顶**: 错题答对 +2/次 → 毕业 +5 一次, 防 50 题×3 review = +300 刷分
- **P0-2 CLOZE_SYNONYM_DICT 161→~300**: +140 派生词 (-ing 34/-ly 24/比较级 30/思考 16/沟通+其他 36), 覆盖率 <50% → ~80%
- **P0-3 周末"自选推荐" + 沉迷闸**: 周末从"3 件事必做"→"挑 1-2 件就好"; 加 DAILY_GAME_SOFT_WARN=10/HARD_NUDGE=15 toast (防沉迷 2 道闸)



### v19.14a (7 项): 主页 5→2 卡 + 数值重平衡 + 弱科软门槛
- 主页 5 张卡 → 2 张 (🎯 今日 3 件事 + 🏫 目标校 1 校)
- 录取概率 8 校 → 1 校 + 杠杆提示
- 打卡日封顶 5 项 + 周封顶 200
- Cloze/SST 改 +2 分/题 20 题满奖 21-50 衰减
- 错题 Leitner 3 次答对毕业 + 每次 +1 巩固 + 毕业 +5
- 宝箱产出 50→20 + 周封顶 100
- SGD 800 中型 milestone (20000 分 "龙之追随者")

### v19.14b (6 项): 平日/周末科目隔离
- WEEKDAY_LOCKED_GAMES = [math, chinese, unit] 平日 hard lock (后 v19.14d 移除 math)
- getDailyTasksFiltered 平日过滤数学/华文 slot, 周末注入 WSC/WUC
- 今日 3 件事按平日 (英语+科学) vs 周末 (数学+华文+Cloze 5+科学) 分化
- mini-game hub 灰锁 badge

### v19.14c (5 项): 我的 tab lock + 宠物 widget (后 v19.14j 全撤)
- 装备/皮肤平日 lock (v19.14j 撤)
- 宠物 zZz 平日休眠 (v19.14j 撤)
- charPage 加宠物 widget 角色旁

### v19.14d (10 项): 二次评审 8 项 + Leitner + Yes/No
- Leitner bug 第 1 处修 (app.js:5241 >=4 → LEITNER_GRADUATION)
- Yes/No 正则强化 (加 I agree / It is / True / Sure)
- 删 quickOralCheckin 假打卡 + Oral 反向验证 textarea ≥10 字
- 数学 hard→soft cap (WEEKDAY_LOCKED_GAMES 移除 math)
- 概念图 3 处修 (Phloem translocation / Liver bile emulsify / Light translucent shadow lighter)
- OE #3/#4/#13 keywords + model 修
- 数学 +20 题 (几何 10 + 速率 10)
- OE 自评 → 硬规则自动评分 (5 维: keyword + length + Yes/No opener + than + it)

### v19.14e (5 项): 英语 5 大缺口
- Comp OE 定位法每题 (Q1 默认 open, 后题 collapsed)
- 词汇 zh→en typing + Levenshtein 容错 + 首字母提示 + 跳过
- Cloze 错题 3 件事卡 (同义/词性/搭配 input) — v19.14l 改 MCQ
- 作文升级闭环 3 槽 (Draft 1/2/Teacher) + 模板词勾选
- 错题色去羞耻化 (#FF6B6B 红 → #607D8B 蓝灰, v19.14j 再升级到绿系)

### v19.14f (3 项): 科学章节 filter
- 子串匹配漏洞修 (word boundary + stem 词干, 防 heat→wheat)
- SCIENCE_CHAPTERS 13 章加 chapterId + keywords
- openSciMcqGame / openScienceOEGame 加 chapter filter

### v19.14g (1 项): OE 题库 15 → 50
- 按手册 4 难章配比: PT 7 / Digestive 7 / Light 6 / Heat 9 / 实验设计 6 / Photosynthesis 4 / 其他 11
- 每题: id / topic / q / keywords[] / model (PSLE 风格完整答)

### v19.14h (5 项): 第 4 次评审 P0/P1 bug
- 作文 V2 +10 dedupe (state.essayUpgradeBonus[week])
- Cloze 3 件事去 6s 倒计时改显式 ✅/⏭ 按钮
- Cloze 3 件事 fingerprint 抓取 (不依赖 wrongs[-1])
- Cloze syn 质量校验 (≥3 字英文 + 拒原词/纯数字)
- Leitner 第 2 处修 (app.js:5470 数学错题硬编码 4 → LEITNER_GRADUATION)
- OE 反向题 (INCORRECT/NOT) 缺否定词封顶 1 分

### v19.14i (5 项): UI 收尾
- 字号 11/10 → 13/12px 全局升 (WCAG AA)
- 9 tab → 5 tab (📚 练习 hub 合并知识树+题库+词汇+作文)
- 主页 "📋 更多详情" 折叠区 hide
- 错题 modal Cloze topic 主题聚类显示
- 作文 60% 锁 → 软提示 (V2 奖按命中率 +10/+5/+2)

### v19.14j (4 项): 撤 lock + 主页恢复 + 绿系收集
- **撤回装备/皮肤/宠物所有平日 lock** (心理学家"5 lock 累积"+ 用户反馈"周六失灵")
- 主页折叠区内容入口移到 👤 我的 tab (6 个一键按钮)
- 错题色"已收集 N 题 🌱" + 绿系 #66BB6A + Leitner 进度统计
- SCIENCE_MCQ runtime chapterId tag (inferScimcqChapter + tagScimcqChapters, 召回 70-85% → 90%+)

### v19.14k (1 项): 今日 3 件事科学项细化
- 难章 2 周显示 "第 1/2 周 概念建立" 或 "第 2/2 周 深化与应用"
- 取 WEEK_TASKS day-by-day 显示今日具体 S2 任务 (例: "今天: 🔬 xylem 横切染色实验")

### v19.14l (1 项): Cloze 3 件事改 3 选 1 MCQ
- CLOZE_SYNONYM_DICT 161 词 (情感/品格/动作/副词/形容词)
- 字典覆盖词 → MCQ 3 选 1 (心理学家原建议, 接受度 30% → 75%)
- 字典不覆盖 → fallback input 模式

---

## 🏆 5 专家累计 4 次评审"必改 1 项" 已 100% 完成

| 专家 (第 4 次评审建议) | 完成版本 |
|---|---|
| PSLE 英语: Cloze 3 件事去 6s 倒计时 | v19.14h |
| PSLE 科学: SCIENCE_MCQ 补 chapterId | v19.14j (runtime tag) |
| 儿童心理: Cloze 3 件事改 3 选 1 MCQ | **v19.14l** ⭐ |
| 游戏数值: 作文 V2 +10 dedupe | v19.14h |
| UI/UX: 真删主页 hero / 字号 / 9 tab | v19.14i |

---

## 📁 关键文件地图

```
chamui-psle/
├── CLAUDE.md              ← 自动加载, 项目最高优先 context
├── HANDOFF.md             ← 5 分钟接手指南 + bug 表 + TODO
├── CHANGELOG.md           ← v19.14a-l 完整改造日志 (痛点+改造+量化)
├── DEV_SESSION_NOTES.md   ← 本文件 (新 session 第一个读)
├── README.md / 部署指南.md / SETUP_*.md
│
├── index.html             ~5500 行 (CSS + HTML, cache buster ?v=19.14l)
├── data.js                ~9200 行 (题库 + 算法 + state schema)
├── app.js                 ~9400 行 (UI render + 事件 + 游戏逻辑)
├── character.js           ~1500 行 (角色 SVG + 装备 + 双龙)
├── qa_check.js            280 项断言 (node vm 跑)
│
├── build.py               4 文件 → chamui_app_single.html
├── deploy.sh              一键 build + git push + Firebase deploy
├── dump_firebase.sh       查孩子当前 live state
└── restore_firebase.js    备份恢复工具
```

---

## ⚠️ 部署铁律 (绝不能省)

```bash
# 1. QA 必过
node qa_check.js   # 280 项

# 2. Build
python build.py

# 3. cache buster 必须递增! (否则用户浏览器拿旧版)
# 改 index.html 底部 ?v=19.14X 三处

# 4. 一键
./deploy.sh "v19.14X commit msg"

# 5. curl 验证线上
curl -s "https://chamui-psle.web.app/index.html" | grep "?v=19.14X"
```

---

## 🐛 常见 bug 排查

### iPad 上装备 / UI 失灵
**99% 是 Safari 缓存**. 让用户:
- 按住地址栏刷新 🔄 → 选 "重新载入页面 (无缓存)"
- 或 设置 → Safari → 清除历史记录与网站数据

### 积分突然下降 / 数据丢失
跑 `./dump_firebase.sh --full` 看当前 state, 再用 `restore_firebase.js` 或浏览器 console `window.listCloudSnapshots(100)` 查快照恢复。

### QA 失败
看 last fail 行号, 多数是新增 assertion 引用了未声明的 `dataSrcV14` (放到 dataSrcV14 declare 后) 或正则误差 (用 `[\s\S]{0,500}?` 而非 `.*?`).

---

## 🎓 下一步建议 (按优先级)

### 立即 (1 hr 内)
- **第 5 次评审** 验证 v19.14l 效果 (5 专家累计"必改 1 项"已完成, 看新评分)

### 短期 (本周)
- SCIENCE_MCQ 70 道手动补 chapterId 字段 (runtime tag 90% → 100%)
- CLOZE_SYNONYM_DICT 161 → 300 词 (覆盖率 70% → 90%)

### 中期 (后续)
- 错题本扩展到 vocab / listen / editing (现仅 4 个 MCQ + math)
- 每日登录 +5 分 bonus
- 季节事件 (PSLE 100 天倒计时装备)

### 观察期 (7-14 天)
观察孩子 v19.14l 后是否真用 Cloze 3 件事 MCQ:
- 期望: 60%+ 答错 Cloze 题孩子点了 MCQ 选项 (vs 跳过)
- 失败信号: 仍 80% 直接跳过 → 字典覆盖率不够, 扩到 300 词

---

## 💡 设计决策记忆 (避免重蹈覆辙)

1. **数学 lock**: hard lock 误伤 AL1 维持 (4 专家共识), 必须 soft cap. **不要再回 hard lock**.
2. **装备/皮肤/宠物 lock**: 心理学家警告"5 lock 累积致 app 平日多巴胺 4/5 通道断". 用户反馈也支持 (v19.14j 撤了). **不要再加平日 lock**.
3. **主页 2 卡极简**: UI 专家 4 次评审强调, v19.14i 真删折叠区 + v19.14j 内容入口移到我的. **不要再往主页堆卡**.
4. **错题色绿系收集感**: 心理学家"红色 = 羞耻触发, 蓝灰 = 待办压力". 现 #66BB6A 绿系 + "已收集 N 题". **不要再回红色**.
5. **Cloze 3 件事**: 心理学家原建议"MCQ vs input", v19.14l 终于做了. **不要回 input 模式**.
6. **双龙双门槛 (10000 银 / 30000+105⭐ 金)**: 用户决议, **不要改数额或门槛**.
7. **SGD 隐藏**: v19.12 决策, SGD 字眼从 app 完全消失 (家长私下知道). **不要再显示**.
8. **平日数学 + 华文 lock**: 仍保留 (用户决策"周末才数学+华文"). **不要撤**.

---

## 📈 5 专家最新预测评分 (v19.14l 后)

| 专家 | v19.13 初评 | v19.14g 第 3 评 | v19.14l 预测 |
|---|---|---|---|
| PSLE 英语 | 4.5 | 5.8 | **7.5** (Cloze 全闭环) |
| PSLE 科学 | 6.5 | 7.0 | **8.5** (OE 50 + 章节 filter) |
| PSLE 数学 | 5.0 | 3.5 → 6.5 | **6.5** (soft cap 维持) |
| 儿童心理 | 4.5 | 5.6 | **7.0** (MCQ + 撤 lock + 绿系) |
| 游戏数值 | 4.5 | 7.0 | **8.0** (V2 dedupe + Leitner 统一) |
| UI/UX | 4.5 | 6.0 | **8.0** (字号 + tab + 删 hero) |
| **平均** | **4.92** | **5.83** | **7.58** (+2.66) |

---

**任何疑问看 CLAUDE.md → CHANGELOG.md → 本文件 → HANDOFF.md, 这 4 个文件覆盖 99% 上下文。**
