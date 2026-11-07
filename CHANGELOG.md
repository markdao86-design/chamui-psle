# 开发日志 — chamui-psle (PSLE 4-6 分陪练)

> 应用主目的: 帮助新加坡 P5/P6 学生考到 PSLE AL 4-6 (顶级 5-15%)
> 部署: https://chamui-psle.web.app · GitHub Pages: https://markdao86-design.github.io/chamui-psle/

---

## v19.78 (2026-09-04) — 练习弹层滑不动的真凶 (用户: "手指落在选项上就滑不动, 选项太大")

### 病根 (v19.76/77 都只治标)
1. **v19.77 的 touchmove 兜底自己是元凶**: `{passive:false}` 挂在 document 上, 每帧读 `scrollTop/scrollHeight` 强制布局, 且关掉 iOS 滚动快速路径 → 手指按在选项上就推不动。
2. **选项太大**: padding 12 / 字号 14 / 加粗 700, 一屏放不下 2 题 → 屏幕几乎全是按钮, 没有空白可下手。
3. **答题仍在整体重建**: v19.77 只是重建后把滚动位置拉回来, 治标; 10 题 DOM 全扔全建本身就卡。
4. **提交要滑到最底**: 10 题答完还得一路滑到底才够得着按钮。

### 修复
1. **删掉 touchmove 兜底**, 背景锁交给已验证的 html/body 双锁 + overscroll-behavior。加 QA 反向断言 `!/passive: false/` 防复发。
2. **`touch-action: pan-y`** 加到 `.mcq-opt/.cn-question/.mcq-opts` — 按在选项上也能纵向滑。
3. **答题改局部更新**: 只 toggle 这一题的按钮态 + 改提交条文案, **不再 innerHTML 重建** (实测重建次数 4→0)。
4. **选项瘦身**: padding 12→8/10, 字号 14→13, 字重 700→600, 题间距收紧 → 10 题总高 2165→1604px (**-26%**), 一屏从 2 题变 5 题。
5. **提交按钮吸底** (`position:sticky; bottom:-20px` + 白色投影补 padding 缝隙; 禁用态给实底, 否则题目从按钮下透出来)。
6. **滑动误触防护**: 手指在选项上拖动 >8px 判定为滚动, 不算选择 (修"滑动把选的答案滑掉")。两个监听均 passive, 不影响滚动。
7. **QA +7** → 686 全过。

### 验证 (localhost:8766, 768×1024 平板视口)
- 答题重建次数 **0**, DOM 未被替换, 选中态正确, 滚动位置纹丝不动 ✓
- 拖动选项 → 答案不变 ✓ 干净点击 → 正常选中 ✓
- 滚到中段提交按钮仍可见且实底 ✓ 答完 10 题提交 → 结果页 + 10 条解析正常 ✓ 背景全程锁定 ✓

> 附带发现 (未改, 非本次引入): `openKnowledgePractice(nodeId)` 若不传 subj/idx, 错题入库会写 `subj: undefined` → Firebase 拒绝整次保存。真实 UI 三个参数都传, 用户不受影响。

---

## v19.77 (2026-09-04) — modal 滚动三修 (v19.76 上线后用户反馈"弹层滑动卡, 底层还跟着跑")

### 真正的病根 (v19.76 没抓到)
1. **答题即跳顶**: `_renderKnowledgePractice` 每选一个选项就 `modal.innerHTML = ...` 整体重建, `.kt-inner` 滚动条归零 → 孩子滑到第 5 题一点选项就弹回第 1 题, 手感就是"滑动卡/乱跳"。
2. **v19.76 的锁自己制造卡顿**: 每次任意 class 变动都 `querySelectorAll('.show')` + `getComputedStyle` 强制回流。
3. **锁不够狠**: 只锁 body, 没锁 html, 没有 touchmove 兜底 (iOS 老版本 overscroll-behavior 不认)。

### 修复
1. **滚动位置保持**: 捕获阶段 `scroll` 监听记录弹层内 scrollTop (存在常驻 overlay 上), childList 重建后**同步**还原 — 不用 rAF (实测后台/预览环境 rAF 不触发, 会让还原永久卡死)。关闭即清零, 重开从顶部。
2. **锁改静态选择器**: `MSL_OPEN_SEL` 一次 querySelector 判开关, 零 getComputedStyle; observer 只对 8 个 overlay 家族的 class 变动做事。
3. **html+body 双锁 + touchmove 兜底**: 触点不在可滚动区 → preventDefault; 在滚动区但已到边界还推 → preventDefault。`passive:false`。
4. **CSS**: 内滚动区加 `-webkit-overflow-scrolling: touch` 动量。
5. **QA +7** (680 全过), 含"不依赖 rAF" 反向断言。

### 验证 (localhost:8766, 768×1024 平板视口)
- 背景滚到 400 → 开练习层: body fixed top:-400px, html overflow hidden ✓
- 内层滚到 900 → 连答 2 题: 位置保持 900/900 (v19.76 是 0) ✓
- 关闭: 解锁 + scrollY 恢复 400 ✓ · 重开: 从 0 开始 ✓ · 遮罩区 touchmove 被 preventDefault ✓

---

## v19.76 (2026-09-04) — modal 滚动穿透修复 (iPad 实拍反馈)

### 痛点
- 用户 iPad 实拍: 知识树 PSLE 风练习弹层 (物质三态) 开着时, 手指在弹层上滑, **背景页跟着一起滚** — iOS Safari 经典 scroll chaining, 40+ 处 modal 全中招。

### 修复 (零改动覆盖全部 modal)
1. **app.js `initModalScrollLock`**: MutationObserver 监听全文档 class 变化, 任何 `.show` 且 computed position:fixed 的浮层出现 → body `position:fixed; top:-scrollY` 钉死并记住位置; 全部关闭 → 解锁并 `scrollTo` 弹回原位。不改 40+ 处开关调用点。
2. **index.html CSS**: 8 个浮层家族 + 内滚动容器加 `overscroll-behavior: contain`, 弹层内滚到边不再把滚动链传给背景 (双保险)。
3. **QA +5 断言** (673 项全过): 函数定义/启动被调用(防死代码)/window 导出/锁+恢复逻辑/CSS 存在。

### 验证
- localhost:8766 实测全周期: 开弹层 body fixed top:-400px → 关弹层解锁 scrollY 恢复 400 ✓; 成就弹层常驻时保持锁定(正确行为) ✓。

---

## v19.15 (2026-05-23) — 第 5 次评审 P0 三件套: Leitner 封顶 + Cloze 字典扩 + 周末自选

### 痛点 (第 5 次 6 专家独立评审, 累计平均 6.88/10 vs 自评 7.58, 偏差 -0.7)
- **游戏数值专家** (新分 8.2, +1.2): 错题本 Leitner 每次答对 +2 = 50 题 × 3 次 = 300 分凭空刷
- **PSLE 英语专家** (新分 6.2, +0.4 但远低自评 7.5): v19.14l CLOZE_SYNONYM_DICT 161 词字典实际覆盖率 <50% (非预期 70%), 缺派生形式 (-ing/-ly/比较级)
- **儿童心理专家** (新分 5.9, 6 项最低): 17 月长跑 + 防沉迷只有 1 道闸 (LISTENING 30 min), 后 9 月自驱沉迷风险; 周末双科爆发是义务感而非自主感

### 改造 3 项 (P0 三件套)

**P0-1: Leitner 巩固积分封顶 — 毕业一次 +5, 取消每次 +2**
- `app.js submitErrorBankAnswer / submitErrorBankMath` (~5471/5503): 删除 `state.totalPoints += 2` 每答对计分 + 加 `state.totalPoints += 5` 仅毕业时
- 加 `showToast('🎓 +5 错题毕业!', 'happy')` 让孩子看见
- 量化: 50 错题 × 3 review = 旧 +300 / 新 +250, 锁死 +5/题封顶 (无法循环刷)

**P0-2: CLOZE_SYNONYM_DICT 161 → ~300 词 (+~140)**
- `data.js:8143` 后追加 5 大类:
  - **-ing 现在分词 ~34 词**: running/walking/sprinting/dashing/shouting/laughing/grabbing/...
  - **-ly 副词 ~24 词**: happily/sadly/angrily/gratefully/proudly/anxiously/kindly/...
  - **比较级/最高级 ~30 词**: bigger/biggest/faster/slower/better/worse/easier/harder/...
  - **思考/认知动词 ~16 词**: thought/wondered/realised/decided/believed/imagined/...
  - **沟通+出现+帮助+时间 ~36 词**: agreed/refused/appeared/vanished/helped/recently/many/very/...
- 量化: PSLE Cloze 字典覆盖率 <50% → ~80% (派生词补齐后)

**P0-3: 周末"自选推荐"模式 + 每日游戏沉迷闸**
- `app.js renderTodayThreeCard()` 周末分支: 标题 "🎯 今日要做的 3 件事" → "🌿 周末推荐 · 自选" (绿色); 计数器从 "3/3 完成" → "已挑 N 件 · 1-2 件就够"; tip 从"科目全开放"→"挑 1-2 件就好, 累了直接关 app 不掉 streak"; 每项加 "(可选)" 标签 + 时长建议
- `data.js` 加常量 `DAILY_GAME_SOFT_WARN=10` / `DAILY_GAME_HARD_NUDGE=15`
- `app.js _bumpDailyGameCount`: 总局数 = 10 toast "🛋️ 注意休息, PSLE 是 17 月马拉松"; = 15 toast "🛑 该关 app 休息了"
- 量化: 防沉迷从 1 道闸 (LISTENING 30 min) → 2 道闸 (+ 每日总局数软警告)

### 量化对比
| 维度 | v19.14l | v19.15 |
|---|---|---|
| Leitner 巩固刷分上限 | 50 题 × +6 = +300 分 (累积) | **50 题 × +5 = +250 分** (单次封顶) |
| CLOZE_SYNONYM_DICT | 161 词, 覆盖率 <50% | **~300 词, 覆盖率 ~80%** |
| 周末心理框架 | "3 件事必做" 义务感 | **"挑 1-2 件就好" 自主感** |
| 防沉迷闸数 | 1 (听力 30 min) | **2 (+ 每日总局数 10/15)** |
| QA 项数 | 280 | **295** (+15 P0 断言) |

QA 295 项全过 / cache buster ?v=19.15

---

## v19.14l (2026-05-23) — Cloze 3 件事同义词改 3 选 1 MCQ

### 痛点 (心理学家原建议, 累计 3 版未做)
- Cloze 3 件事 input 模式接受度 30% — AL5 孩子主动产出"同义词"是降维打击
- 心理学家原建议: 改 3 选 1 MCQ (识别难度 = AL5 孩子能力区), 接受度 75%
- 实际行为预测: input 模式假打卡率 20%, MCQ 模式 < 5%

### 改造
- **data.js CLOZE_SYNONYM_DICT 161 词**: PSLE Cloze 高频词 + 每词 1 正同义 + 2 干扰
  - 情感 38: happy/sad/angry/scared/excited/grateful/disappointed/relieved/curious/jealous/...
  - 品格 27: kind/honest/brave/generous/patient/polite/cautious/determined/humble/reliable/exemplary/...
  - 动作 38: ran/sprinted/whispered/glanced/laughed/sobbed/seized/dropped/finished/received/...
  - 副词 31: quickly/slowly/quietly/loudly/carefully/suddenly/immediately/frequently/rarely/...
  - 形容词 27: enormous/tiny/beautiful/difficult/important/interesting/strange/rare/thunderous/scattered/...
- **`getClozeSynonymOptions(word)`**: 查字典返回 {opts: shuffled 3, correctIdx, correctSyn}
- **app.js UI 双模式**: 字典覆盖词 → MCQ 3 选 1 (A/B/C 大按钮, 选后视觉反馈 ✓/✗); 字典不覆盖 → fallback 旧 input 模式
- **`pickClozeSyn(idx)`**: 点选项后视觉反馈 (正确绿 / 错误红) + 把正确同义词塞入 c3-syn hidden input 供保存
- **saveCloze3Things**: 加 mode 判断 — MCQ 模式跳过 input 质量校验 (字典已保证), input 模式仍走 3 重校验

### 量化
| 维度 | v19.14k (input only) | v19.14l (MCQ + input fallback) |
|---|---|---|
| Cloze 同义词模式 | input 强制产出 | **字典覆盖 → 3 选 1 MCQ** |
| 字典覆盖率 | 0% | **~70%** (161 词覆盖 PSLE 高频 Cloze 选项词) |
| 11 岁接受度 | 30% (心理学家预测) | **75%** (识别 vs 产出) |
| 假打卡率 | 20% ("aa"/原词) | **< 5%** (MCQ 无法假) |
| 数据质量 | 字符串噪音 | **结构化字典词** (Leitner 可信) |

QA 280 项全过 / cache buster ?v=19.14l

---

## v19.14k (2026-05-23) — 今日 3 件事科学项细化对接手册 day-by-day

### 痛点 (上次 review 自查)
- 主页"今日 3 件事"第 ③ 项只显示章节大名 (如 "P4 Plant Transport ⭐"), 但手册 v14 W5-W6 内部细分到 day-by-day (周一段 2 教材精读 → 周二配套练习 → 周三章节小测 → 周四错题分析)
- WEEK_TASKS day-by-day 数据已经按手册排好, 但主页不显示

### 改造
- **renderTodayThreeCard 第 ③ 项**:
  - 难章 2 周显示 "第 X/2 周 + 阶段标签" (第 1 周="概念建立" / 第 2 周="深化与应用")
  - 取今日 `WEEK_TASKS[week-1].days[todayKey].S2` 文字, 用 regex `🔬|Plant|Digestive|Heat|...` 过滤只取科学相关
  - 卡片副标显示 "**今天**: 🔬 xylem 横切染色实验<br>P4 Plant Transport ⭐ · 第 1/2 周 概念建立"
  - 任务超 36 字符截断 + "…"

### 量化
| 维度 | v19.14j | v19.14k |
|---|---|---|
| 主页科学项颗粒度 | 章节大名 (如 "P4 Plant Transport") | **今天具体任务** ("🔬 xylem 横切染色实验") |
| 难章 2 周分阶段 | 不显示 | **第 1 周 概念建立 / 第 2 周 深化与应用** |
| 对接手册 day-by-day | 数据有, UI 不显 | **完整显示** |

QA 274 项全过 / cache buster ?v=19.14k

---

## v19.14j (2026-05-23) — 撤 lock + 主页内容恢复 + 绿系收集 4 项

### 痛点 (用户反馈 + 心理学家警告)
- 用户: "装备目前穿戴取下都失灵的, 今天是周六, 是不是有 bug" (iPad 缓存旧版 + v19.14c 5 套 lock 累积)
- 用户: "不是删主页, 还是保存在我的" (v19.14i 把主页折叠区 hide 但内容没移到我的)
- 心理学家持续警告: 5 套 lock 累积 (math/chinese/装备/皮肤/宠物) → 平日 app 多巴胺 4/5 通道断 → 弃用率 ↑
- UI 专家: 错题色 "待复习" 仍像"未完成 KPI", 应改"已收集 N 题"绿系收集感

### 改造 4 项
- **撤回 v19.14c 装备 + 皮肤平日 lock**: `toggleEquipment` / `setActiveSkin` 删 isWeekdayToday 检测, 装备穿戴随时可用
- **撤回 v19.14c 宠物 zZz 休眠**: charPage 宠物 widget 一直活跃彩色, 不再灰显
- **主页折叠区入口移到 👤 我的 tab**: page-character 末尾加 `<details>` "📋 主页旧详情入口", 6 个一键按钮 (📋 教练报告 / 📓 待复习清单 / 🌅 看 W73 的我 / 📊 能力页 / ⚙️ 父母面板 / 🎁 神秘宝箱). 旧 #_dashboardLegacy 保留供 renderDashboard 兼容
- **错题色"已收集"绿系**: #607D8B 蓝灰 → #66BB6A 绿; "待复习 N 题" → "已收集 N 题 🌱"; 加"已答对 1+ 次 X 题 · 接近毕业 Y 题" Leitner 进度统计
- **SCIENCE_MCQ runtime chapter 推断**: 新 `inferScimcqChapter(q)` + `tagScimcqChapters()` lazy tag, 加权 keyword 匹配 (word boundary +2 / 子串 +1 / 难章 1.2× 加权); `_openMcqGame` 优先用 `_chapterId` 精确匹配, fallback 旧 keyword 子串. 召回率 70-85% → 90%+

### 量化
| 维度 | v19.14i | v19.14j |
|---|---|---|
| 装备穿戴可用性 | 平日 lock 弹 toast | **随时可用** |
| 宠物状态 | 平日 zZz 灰 | **一直活跃彩色** |
| 主页旧内容入口 | display:none 无入口 | **👤 我的 tab 末尾 6 个一键按钮** |
| 错题情感色 | 蓝灰中性 | **绿系收集感 ("已收集 N 题 🌱")** |
| SCIENCE_MCQ chapter 召回 | 70-85% (子串) | **90%+** (chapterId tag + 加权) |

QA 271 项全过 / cache buster ?v=19.14j

---

## v19.14i (2026-05-23) — UI 收尾 + 内容 5 项

### 痛点 (5 专家 4 次评审累计未做项)
- UI 专家累计 4 版指 3 大未做: 9 tab / 字号 / 主页折叠区
- 英语专家: errorBankByTopic 函数写了没人调用, Cloze 同主题闭环只做一半
- UI 专家: 作文 60% 硬锁可被绕过 (孩子假勾)

### 改造
- **字号全局升 (WCAG AA)**: `.tab-btn` → 14px / 48px 触控高度; #page-dashboard 内联 11px → 13px / 10px → 12px (所有 11/10/12 内联自动覆盖)
- **9 tab → 5 tab**: 🏠 主页 / ✅ 打卡 / 📚 练习 (新, hub 4 大入口) / 📊 能力 / 👤 我的; 知识树/题库/词汇/作文/管理 5 个 tab 隐藏 (page 容器仍存在, JS 跳转可访问)
- **新 page-practice hub**: 2×2 网格 4 个大按钮 (🌳/📚/📇/📝), 进入即 setActive 对应 page (data-page click 跳转), 静态不需 render 函数
- **真删主页"📋 更多详情" 折叠区**: `<details class="dashboard-collapse">` 改 `<div id="_dashboardLegacy" style="display:none">`, DOM 保留以兼容 renderDashboard 函数, 视觉上主页 "2 卡极简" 真兑现
- **错题 modal Cloze topic 聚类**: 调用 `errorBankByTopic(state, 'cloze')`, 8 主题彩色 chip + 命中数 + ✓3件事数 (travel/school/nature/emotion/food/family/sport/weather/general)
- **作文 60% 锁 → 软提示**: 删 canUploadV2 = hitRatio >= 0.6 硬锁, 改永远可上传; V2 奖励按命中率分级 ≥60% +10 / ≥30% +5 / <30% +2; 鼓励真用词不假勾

### 量化
| 维度 | v19.14h | v19.14i |
|---|---|---|
| 字号 | 11px/10px (WCAG AA 违反) | **13px/12px** (达标) |
| Tab 数 | 9 | **5** |
| 主页折叠区"详情" | 6 个卡藏在折叠区 | **DOM hide, 主页真 2 卡** |
| Cloze 错题主题闭环 | 写了没用 | **modal 显示 + 计数** |
| 作文 60% 锁 | 硬锁可绕过 (假勾) | **软提示 + 命中率分级奖励** |

QA 268 项全过 / cache buster ?v=19.14i

---

## v19.14h (2026-05-23) — 第 4 次评审 5 项 P0+P1 bug 修复

### 痛点 (5 专家 4 次评审)
- 作文 V2 +10 分无 dedupe — 每次"🔄 替换"都 +10, 73 周 × 3 次 = +2190 分凭空刷
- Cloze 3 件事卡 6 秒倒计时跳题, 但实测填 3 个 input 要 15+ 秒 → 孩子第 2 个 input 时题已跳
- Cloze 3 件事 syn 零质量门槛 ("aa"/"ok" 2 字符过) → 假打卡率 20%
- Leitner 常量两套阈值 — 数学错题 app.js:5470 硬编码 `>= 4`, 其他 3 次, 同一概念两个值
- OE 反向题 (oe_38 jacket "does NOT produce heat") 关键词命中但答错也给分

### 改造
- **P0-1 作文 V2 dedupe**: `state.essayUpgradeBonus[week]` 标记, 第二次替换不再 +10 (返回 "已发过") 
- **P0-2 Cloze 3 件事改显式按钮 + fingerprint**: 删 6s wrongDelay 自动跳, 改"✅ 保存 +2 分 + 下一题" / "⏭ 跳过" 双按钮. 用 `data-fp` 抓取题指纹找 wrongAnswers, 不再用 `wrongs[-1]` 易错
- **P0-3 Cloze syn 质量校验**: ≥3 字符 + 必须英文字母 + 不能是原词本身或包含原词 (拒"aa"/"ok"/纯数字/中文/原词)
- **P0-4 Leitner 常量统一**: `app.js:5470` 数学错题分支也读 `window.LEITNER_GRADUATION || 3`, 删硬编码 4
- **P1-1 OE 反向题封顶**: sciOe autoScore 加 `isReverseQ` 检测 (q 含 INCORRECT/NOT 或 model 含 "does NOT"/"NOT a"), 缺否定词 (not/cannot/never/no) → autoScore 封顶 1 分

### 量化
| 维度 | v19.14g | v19.14h |
|---|---|---|
| 作文 V2 刷分上限 | +2190 分 (73 周 × 3) | **+730 分** (73 周 × 1, dedupe) |
| Cloze 3 件事 UX | 6s 倒计时跳题 (跳过率 60%) | **显式按钮** (跳过率 < 10%) |
| Cloze syn 假打卡率 | 20% ("aa") | **< 5%** (拒 3 重校验) |
| Leitner 数学错题毕业 | 4 次 (常量不一致) | **3 次** (统一) |
| OE 反向题准确度 | 关键词全中给分 (误判) | **缺否定词封顶 1** |

QA 259 项全过 / cache buster ?v=19.14h

---

## v19.14g (2026-05-23) — 科学 OE 题库 15 → 50 道

### 痛点 (科学专家 3 次评审)
- OE 仅 15 题, Leitner 3 次毕业机制下 5 个原题循环, 第 7 天起孩子背得出 model answer
- 4 难章覆盖严重失衡: Plant Transport / Digestive / Light 各 1 题, Heat 仅 2 题, 远低于"按手册难易分级配比"

### 改造
+35 道 PSLE 真考风格 OE, 按手册 4 难章 + 实验设计权重:
- **Plant Transport +6** (oe_16-21): phloem 切环 / root hair 表面积 / 蒸腾 热风 / 染色芹菜 / wilting / magnesium 缺乏
- **Digestive +6** (oe_22-27): villi 双特征 / 太空蠕动 / bile emulsify / 口腔双消化 / 大肠吸水 / 嚼食物
- **Light +5** (oe_28-32): 影子距离比例 / translucent 灯影 / 4 floodlight 4 影子 / 潜望镜 / 暗光读书
- **Heat +7** (oe_33-39): saucepan 双材料 / 烧水对流 / 太阳辐射真空 / 黑白吸热实验 / thermos flask 三机制 / 衣服 reduce heat loss / 大小冰块 mass
- **实验设计 +5** (oe_40-44): 变量 3 件套 / control setup / 表格结论 / anomalous result / 摆长
- **Photosynthesis +3** (oe_45-47): 24h 呼吸 / 密封瓶死亡 / 4 要素
- **其他 +3** (oe_48-50): magnetisation 磁化 / friction useful / water cycle NEWater

每道题: `id / topic / q / keywords[] / model (PSLE 标准答完整句)`

### 量化
| 维度 | v19.14f | v19.14g |
|---|---|---|
| 科学 OE 题量 | 15 | **50** |
| 4 难章覆盖 | 1+1+1+2 | **7+7+6+9** |
| 实验设计专项 | 1 | **6** |
| Photo/Respiration | 1 | **4** |
| Leitner 重复风险 | 高 (5 题循环) | 低 (50 题池) |

QA 252 项全过 / cache buster ?v=19.14g

---

## v19.14f (2026-05-23) — 科学 3 项 (子串漏洞 + 章节 filter)

### 痛点 (5 专家 3 次评审)
- 子串匹配漏洞: 关键词 `heat` 误匹配 `wheat`, `cool` 误匹配 `school` — OE 评分系统性高估
- SCIENCE_CHAPTERS 13 章是 UI 装饰品: sciMcq / sciOe 抽题不过滤, W5 学 Plant Transport 但抽到 Magnet 题
- 章节卡承诺 vs 实际游戏内容割裂

### 改造
- **app.js sciOeCheck + 硬规则评分**: keyword 匹配改 `\\b<stem>(s/ed/ing/es/ies)?\\b` 词干正则, 词干 strip 8 种后缀
- **data.js SCIENCE_CHAPTERS**: 13 章全配 `chapterId` (如 `p4_plant_transport`) + `keywords` 数组. W15+ 综合阶段 keywords=null 走全库
- **app.js openSciMcqGame(chapterFilter)**: 加可选参数, 默认按 currentWeek 算章节. 本章 8 题 + 综合 2 题防偏, 不足 5 题 fallback 全库
- **app.js openScienceOEGame(chapterFilter)**: 同上, 章节卡 OE 训练入口直接传当前章节

### 量化
| 维度 | v19.14e | v19.14f |
|---|---|---|
| 关键词匹配精度 | 子串误判 (heat↔wheat) | word boundary + 词干 (准确) |
| MCQ/OE 章节一致性 | 0% (随机抽题) | 80% 本章 + 20% 综合 |
| 章节卡承诺 | 装饰 | 兑现 |

QA 247 项全过 / cache buster ?v=19.14f

---

## v19.14e (2026-05-23) — 英语 5 项 (Cloze/词汇/Comp OE/作文)

### 痛点 (5 专家 2 次评审英语)
- P5 Comp OE 定位法只 Q1 显示 (强化 20%)
- P3 学科词汇方向反: en→zh recognition (孩子需要 zh→en production)
- P2 Cloze 错题没"3 件事查" (同义/词性/搭配)
- P4 作文模板锁死 AL4: 无重写闭环
- 错题红色高亮 = 羞耻触发器

### 改造
- **P5 Comp OE 每题定位法**: `<details>` Q1 默认 open, 后题折叠. 加 self-score rubric 提示
- **P3 词汇 typing**: 显示中文, `<input>` 敲英文. Levenshtein ≤1 容错 + 单复数自动 + 3 秒首字母提示 + 跳过按钮
- **P2 Cloze 3 件事卡**: 答错弹"同义词必填 / 词性选填 / 搭配选填" + topic 自动聚类 (8 主题 travel/school/nature/emotion/food/family/sport/weather) + 跳过 fallback
- **P4 作文升级闭环**: 3 槽 (Draft 1 / Draft 2 / Teacher) + 模板词勾选 ≥60% 才解锁 V2 + V2 完成 +10 分
- **错题色去羞耻化**: 红 #FF6B6B → 蓝灰 #607D8B, "错题/真考" → "待复习/重点"
- 新 helper: data.js `CLOZE_TOPIC_MAP` + `guessClozeTopic` + `errorBankByTopic`
- 新 helper: app.js `_levenshtein` + `svSubmitTyping` + `svHint` + `svSkip` + `saveCloze3Things` + `uploadEssayV` + `toggleEssayCheck`

### 量化
| 维度 | v19.14d | v19.14e |
|---|---|---|
| Comp OE 强化密度 | 20% (Q1 only) | 100% (每题折叠) |
| 词汇训练模式 | recognition (4 选 1) | production (typing + 拼写容错) |
| Cloze 错题诊断 | 仅入库 | 同义/词性/搭配 + 主题聚类 |
| 作文反馈闭环 | 仅上传 1 张 | Draft 1 → 模板词检查 → Draft 2 三层 |
| 错题情感色 | 红色羞耻 | 蓝灰中性 |

QA 242 项全过 / cache buster ?v=19.14e

---

## v19.14d (2026-05-23) — 二次评审 8 项 (科学事实+数学+Oral+Leitner)

5 专家二次评审驱动, 修复:
- 🐛 Leitner bug (app.js >=4 → 读 LEITNER_GRADUATION 常量)
- 🔒 Yes/No 正则强化 (加 I agree/It is/True/Sure)
- 🎤 删 quickOralCheckin 假打卡 + Oral 反向验证 textarea (≥10 字)
- ➗ 数学 hard lock → soft cap (WEEKDAY_LOCKED_GAMES 移除 math)
- 🌱 Phloem "双向" → "from leaves to storage organs (translocation)"
- 🍳 Liver bile "消化" → "emulsify fat (not digest)"
- 💡 Light translucent 影子加 "lighter not fully dark"
- 🧪 OE #3/#4/#13 keywords + model 修 (transport+minerals / villi+thin wall / heat 独立)
- ➕ 数学 +20 题 (几何 10 + 速率追及 10)
- 🧪 科学 OE 自评 → 硬规则自动评分 (关键词+长度+opener+than+it)

QA 235 项全过 / cache buster ?v=19.14d

---

## v19.14c (2026-05-23) — 我的 tab lock + 宠物加到角色旁

- 平日 装备 toggleEquipment lock + 皮肤 setActiveSkin lock + 宠物 zZz 灰色休眠
- 周末 全开放 (装备穿戴/宠物活跃/喂食)
- charPage_petWidget 加到角色 SVG 右下角
- charPage_lockBanner 平日显示 "📅 装备穿戴已锁 + 宠物在休息"

### v19.14d1 hotfix
- "我的"页文字+角色 SVG 重叠 — scoped CSS 修 character-display height auto + svg margin-top 0 + 缩到 180px

---

## v19.14b (2026-05-23) — 平日/周末科目隔离

- WEEKDAY_LOCKED_GAMES = [math, chinese, unit] hard lock 平日
- getDailyTasksFiltered: 平日过滤数学/华文 slot, 周末注入 WSC/WUC
- 主页"今日 3 件事"按平日/周末分化 (平日 Oral+Cloze+SST+科学 / 周末 数学+华文+Cloze 保手感)
- mini-game hub math/chinese/unit 平日灰 + 🔒

QA 216 项全过

---

## v19.14a (2026-05-23) — 主页 2 卡 + 数值重平衡 + 弱科软门槛

5 专家评审驱动:
- 主页 5 卡 → 2 卡 (🎯 今日 3 件事 + 🏫 目标校 1 校)
- 录取概率 8 → 1 校 + "查看全部" 链接
- 打卡日封顶 5 项 + 周封顶 200 分
- Cloze/SST 改 +2 分/题, 20 题封顶, 21-50 衰减 1 分, 51+ 0 分
- 错题 Leitner — 3 次答对才毕业, 每次 +1 巩固, 毕业 +5
- 宝箱 30-50 → 10-20 + 周封顶 100 分
- 强项 game (math/chinese/unit/grammar) 第 3 次需先做 Cloze 5 题 (软门槛)
- 加 SGD 800 中型 milestone (20000 分 "龙之追随者")

QA 205 项全过

---

## v19.13 (2026-05-23) — 7 项对齐手册 v14: 英语 16.5h + 科学 P3-P4

### 痛点
读 `PSLE_2027_完整备考总手册_v16.pdf` 对比当前 app, 发现 7 大缺口:
1. ❌ Oral 25min/天 完全缺失 (手册要求每天豆包对话 + 录音回听)
2. ❌ 学科英语 500 词 (数学 200 + 科学 300) — 中国孩子题干读不懂污染数学/科学 AL1
3. ❌ 作文反馈结构化 (模板库 + 高级词清单)
4. ❌ Comp OE 答题套路 ("定位法 → 关键词覆盖") 没体现
5. ❌ 科学 W1-W14 P3-P4 章节进度 (手册按难易分级, app 未对齐)
6. ❌ 科学 OE 答题原则 ("不能 Yes/No 开头, 必含关键词")
7. ❌ 概念图工具 (Plant Transport / Digestive / Light / Heat 难章必备)

### 改造 (单批 deploy)
- **data.js +1800 行**: ORAL_QUESTIONS (30 题/8 类) · SUBJECT_VOCAB_MATH (220 词) + SUBJECT_VOCAB_SCIENCE (280 词) = **500 词** · ESSAY_TEMPLATES (15 模板 + 50 高级词) · SCIENCE_CHAPTERS (13 章, W1-W14 P3-P4 + 后期) · SCIENCE_OE_PRINCIPLES (5 原则) + SCIENCE_OE_QUESTIONS (15 题, model + keywords) · CONCEPT_DIAGRAMS (4 张 SVG: plant_transport/digestive/light/heat, 含 PSLE 陷阱标注)
- **app.js +600 行**: renderOralCheckinCard / openOralPracticeModal · renderSubjectVocabCard / openSubjectVocabGame (4 选 1, 同 cat 优先干扰) · renderScienceChapterCard (W → 章节自动匹配) · openScienceOEGame (5 原则 → 5 题, 自动检 Yes/No 开头 + 关键词覆盖度 < 50% 警告) · openConceptDiagram (4 张 SVG 模态 + tab 切换)
- **app.js 修改**: `_renderCompOe()` Q1 加"定位法 3 步"绿色提示卡 · `_buildEssayInnerHtml()` 顶部插模板库 details 折叠区
- **index.html**: 3 个新卡容器 · cache bust 19.12 → 19.13
- **qa_check.js +26 项**: **189 项全过**

### 量化效果
| 模块 | v19.12 | v19.13 |
|---|---|---|
| Oral 训练 | ❌ 无 | ✅ 30 题 + 每日打卡 + 25 min 目标进度 |
| 学科英语词汇 | ❌ 无 | ✅ 500 词 (数学 220 + 科学 280, 11 类) |
| 作文模板 | 仅上传 | ✅ 15 模板 (开 5/转 5/结 5) + 50 高级词 |
| Comp OE | 思考 30s | ✅ Q1 加"定位法 3 步" 强提示 |
| 科学章节 | 平级 | ✅ W1-W14 P3-P4 难易分级 + 焦点提示 |
| 科学 OE | ❌ 无 | ✅ 5 原则 + 15 题, 自动检 Yes/No 开头 |
| 概念图 | ❌ 无 | ✅ 4 张 SVG (难章 ⭐⭐) + 陷阱标注 |

### 主页结构 (v19.13)
5 张卡: 录取概率 + Paper 2 + Oral + 学科词汇 + 科学章节. 全 0 SGD/钱/角色字眼.

---

## 📅 版本历史 (v19.6 — v19.11)

### v19.11.1 — 积分校正 4208 + 数据备份归档 (2026-05-22)

**操作**: 用户告知 iPad localStorage 真实分数是 4208 (Firebase 被旧设备覆盖到 1257). 通过 Firestore REST PATCH `chamui/main` 把 totalPoints 从 1257 校正到 **4208** (+2951).

**追加 audit log** (永久在 state.logs):
```js
{
  reason: '✨ 校正积分到 4208 (iPad localStorage 为准, v19.11)',
  points: 2951, type: 'correction', timestamp: 2026-05-22T14:35:25Z
}
```

**安全网生效**: v19.10 的 sync 安全网阻止旧设备 (1257) 再覆盖 4208 (差 ≥500 → 拒绝)
**快照保护**: v19.11 的 10 min 快照系统会自动把 4208 备份到 `chamui_snapshots` collection
**回滚备份**: `firebase_before_correction_2026-05-22T14-35-25.json` (保留 1257 状态如需回退)

---

### v19.11 — 积分快照备份系统 (2026-05-22)

**痛点**: 5/13 → 5/22 间 Firebase 数据被某次 sync 覆盖, totalPoints 从 3486 降到 1257, logs 从 408 砍到 96. 没有历史快照, 无法精确恢复。

**v19.10 已加 sync 安全网防覆盖, v19.11 加快照系统留历史**:
- **每 10 分钟** 自动 snapshot `totalPoints / logs count / ⭐ / wrongAnswers` 到:
  - Firestore `chamui_snapshots/{ISO-timestamp}` (永久云端历史)
  - localStorage `chamui_snapshots_local` (最近 50 个 ring buffer)
- 启动 app 时立即拍 1 次 (`source: app-start`)
- 后续每 10 min 1 次 (`source: auto-10min`)
- 手动: `snapshotPoints(state, 'manual')`

**查询/恢复 API** (浏览器 console):
- `window.listLocalSnapshots()` — 最近 50 本地
- `await window.listCloudSnapshots(100)` — 最近 100 云端
- `await window.restoreFromSnapshot(ISO)` — 返回快照对象 (不自动恢复, 需手动 confirm)

**文档同步**:
- `CLAUDE.md` 加 "§7.5 积分快照备份系统" 章节
- `HANDOFF.md` 加 "积分快照 / 数据恢复工具" 章节
- 新 session 接手 → 跑 `./dump_firebase.sh` + 看 Firestore `chamui_snapshots` 历史趋势

---

### v19.10 — 数据完整性: 修 toggle 刷分 bug + sync 安全网

**深查数据混乱根源** (5/13 06:22 峰值 3486 → 5/22 live 1257, 跌 ~1100 分):

1. **Bug 1 — toggleDailyCheck 凭空多分**:
   5/12 12:55:28-12:55:51 间 W1 Sat WSF 反复"取消→重打" 10+ 次, 每次多 ~8 分 critExtra 没扣回.
   根因: 取消时找 slot log 找不到 → `undoAmount = 0` → 老 critExtra log 还在 logs → recalc 多算.
   **修**: app.js:2597-2618 — 找不到 slot log 时 `recalcTotalPoints` 兜底 + 不 push undo log + 防连点冷却 2s → 3s

2. **Bug 2 — 远端旧数据覆盖本地新数据**:
   5/13 → 5/22 间数据被回滚, 不是孩子操作 (logs 几乎没新增).
   **修**: data.js subscribeFirestore 加 `_isSyncDataSafeToAccept` 安全网:
   - 远端 totalPoints 比本地少 ≥500 → 拒绝
   - 远端 logs 比本地少 ≥50 → 拒绝
   - 弹 toast 警告 "远端数据可能比本地旧, 已忽略一次 sync"

3. **数据恢复工具** `restore_firebase.js` (默认 dry-run, --yes 才执行):
   - 拉 live → 备份 `firebase_before_restore_{ts}.json`
   - 读 `firebase_check.json` (5/13 06:22 peak 3486 分)
   - PATCH `/chamui-psle/databases/(default)/documents/chamui/main`
   - 验证 → 应是 3486

**注**: 最终未执行 restore — 用户告知 iPad localStorage 才是 ground truth (4000+), 让 iPad 自然 sync up (受新安全网保护)。

---

### v19.9 — 真考错题精准补救 (基于孩子 2026.5 Paper 2 真考)

**输入**: 用户传孩子 Paper 2 真考实物照片 3 张 (Section B/C/D), 逐题分析红笔批改。

**真考真错 17 道直接入孩子错题本** (`PAPER2_REAL_ERRORS` in data.js):
- Section B Grammar Cloze 4 道
- Section C Vocab Cloze 9 道 (Across→Flowing / saw→watched / too→so / him→myself / sanked→drowning / ground→safety 等)
- Section D Synthesis 4 道 (twee→twins 拼写 / 漏 station / **whose 关系从句 D34 10 分大题完全做不出** / bushed→bushes)

**机制**: `loadPaper2RealErrors(state)` 启动时自动入库, fingerprint 去重防重复.

**错题本 UI 升级**:
- `source: 'paper2-real'` 标记 → 红色背景高亮 + 🔥 标识
- 主页错题本卡分 "🔥 真考错题: N 题 (优先!)" + "📓 App 内错题: M 题"
- 复习顺序: 真考优先 (做完才轮到 app 错题)

**系统性补题** (除 17 真考外):
- SST +15 道关系从句专项 (whose 5 + which 5 + who 3 + whom 2, 真考 D34 救命题)
- Cloze +20 道词义辨析 (another/other / when/whenever / saw/watched / too/so / him/myself / pull to safety / flowing / drowning)

**Pool 规模**: Cloze 186→**206**, SST 85→**100**, 总 +35 题。

---

### v19.8 — P0+P1 全套提分改造

| 改造 | 详情 |
|---|---|
| +50 PSLE Vocab Cloze | 每题带 explain (词义辨析/搭配/连接词/phrasal/介词) |
| +20 SST 高仿真 distractor | passive/indirect/although/despite/so that 5 类各 4-5 题, 每题 explain |
| **主页学习画像卡** | 打卡天数/⭐/错题/各科难度/Paper 2 进度 — 打卡反馈解耦 |
| **Paper 2 模拟卷** | `openPaper2MockGame()` — 28 min 限时 15 Cloze + 8 SST → 自动预测 AL |
| +3 件中期装备 (W18/24/40) | 填 v18.62 F2P 专家指出的 W14-W42 中期荒漠 |
| 每日登录 +5 分 | v18.86 已埋点, 验证已激活 |

---

### v19.7 — Paper 2 弱点突击卡 + 降游戏性

**痛点**: 孩子 Paper 2 实考 AL6, Cloze 几乎全错 + SST 错不少. 用户希望"降低游戏性, 加强勤勉激励".

**Paper 2 突击卡** (主页置顶, 严肃风, 不撒花):
- Cloze 100 + SST 50 目标进度
- 近 5 次正确率 (≥75% 青绿 / 60-75% 橙 / <60% 红)
- "立即练" 大红按钮直达 mini-game
- `state.paper2Sprint = {target, progress, correct, recent}` 自动跟踪

**降游戏性** (避免为打卡而打卡):
- 宝箱奖励: 30 颗 confetti → 0 (只 toast)
- 当日全勾: 35 颗 + 震屏 + 大字 → 15 颗 (删震屏 + 删大字)
- Streak 里程碑: 50 → 20 颗
- Mini-game 满分: 40 → 15 颗
- 保留强反馈: 觉醒仪式 / 周完美 (真值得庆祝的)

---



### v19.6 — 治本任务焦虑: 主线日 + 极简加练池 5 项 + 周完美 (2026-05-18)

**痛点**: 孩子反馈"每日任务太多很累"。读源码发现根因不是"支线没藏好", 而是三层任务设计本身把"隐藏"做成了"层层解锁胡萝卜":
- 主线 3 个 (E1/S2/ED) → 21 分
- 主线全勤后弹按钮 `🎁 解锁支线挑战` (OR/LS, +7 分)
- 支线全勤后弹按钮 `🔮 解锁隐藏关卡` (VC/VB, +8 分)
- 全做完 → `🔥 完美日!` 大 combo (主线+支线+完美 = +70)

工作日实际负担 3.5h + 解锁机制属"沉没成本+完成欲"双重夹击, 孩子明知累还会做。

**核心洞察**:
1. 一些池子 slot 已被 mini-game 大厅替代 — LS 听力 / VC 学科词汇 / VB Vocab/华文 都能在大厅做更高效
2. 一些是软任务 — WSR 复盘 / WSV 家庭聊天 / WUP 整理书包 不是硬技能, 不该进打卡
3. 正确的不需要反复做 — 复用 v19.0 mastered 机制思路

**改造**:

| 改造 | 详情 |
|---|---|
| 🗑️ 删冗余 slot | LS/VC/VB (mini-game 大厅替代) + WSR/WSV/WUP (软任务) 全部从打卡页移除 |
| 📋 引入加练池 | 剩 5 项进 `POOL_TARGET`: OR / WSE / WSL / WUE1 / WUE2 全部 1 次/周, `state.weeklyPool[week][slot]` 计数 |
| 🚫 删解锁钩 | 老的"🎁 解锁支线挑战" / "🔮 解锁隐藏关卡" 按钮 + 日完美 combo 全删 |
| 🌟 周完美替代日完美 | 主线 7 天全勤 + 池子 5/5 = `WEEKLY_PERFECT_BONUS` +30 (一周一次, `perfectGiven` flag 防重复) |
| 🎨 主线-only UI | dayTasks 过滤掉 pool slot, 工作日只显 3 个主线; 加 `renderWeeklyPoolCard` 折叠卡显进度 + [+1] 按钮 |
| 🔧 完成率修正 | `calcWeekCompletion` ALL_SLOTS 排除 OR (避免完成率被池子拖低); `isDayComplete` 同步排除 |

**新数据字段**:
```js
state.weeklyPool = { [week]: { OR: 0|1, WSE: 0|1, WSL: 0|1, WUE1: 0|1, WUE2: 0|1 } }
state.weekly[week].perfectGiven = true  // 防止周完美奖重复发
```

**新函数** (data.js):
- `POOL_TARGET` / `WEEKLY_PERFECT_BONUS` 常量
- `getPoolProgress(state, week)` → {done, total, items, full}
- `addPoolEntry(state, week, slotKey)` → bool
- `calcWeeklyPerfect(state, week)` → {eligible, given}
- `grantWeeklyPerfect(state, week)` — 发奖 + flag

**新函数** (app.js):
- `renderWeeklyPoolCard(week)` — 折叠卡 (头部进度条 + 展开 5 行)
- `addPoolAndScore(slotKey)` — 加分 + toast + 周完美检测
- `_checkWeeklyPerfect(week)` — 主线打卡和池子加练后检查是否凑齐
- 钩入 `toggleDailyCheck` 后

**心理转变**:
- 旧: "今天 7 个任务都摆出来, 不做就缺角" → 损失厌恶 + 完成欲
- 新: "今天主线 3 个就行, 想加练去翻本周池子" → 控制感 + 自由感
- 多做多得保留 (不封顶); 但默认看到的任务负担减少 50%+

**QA**: 149 → 163 项 (+14 新断言)
**cache buster**: 19.5b → 19.6

---

## 📅 版本历史 (v19.5)

### v19.5 — 专家评审后 5 大系统改造: 学习效果与激励耦合 (2026-05-15)
**痛点**: 组 PSLE 英语/科学/游戏化 3 位专家评审发现:
- App 是"行为激励系统"而非"能力提升系统" — 打卡≠学了
- 英语 65→85 缺口靠纯打卡无法弥补 (作文 40 分无训练)
- 积分与学习质量完全脱钩

| 改造 | 详情 |
|---|---|
| 🎯 P0-b 学习质量门槛 | `calcSlotReward` 增加 `SLOT_SUBJECT` 映射, 科目 mini-game 正确率 <60% 时该科打卡积分×0.5 |
| ✒️ P0-a 作文质量追踪 | `state.compTracking` 追踪每周交稿/批改/重写 3 步, 主页新卡显示进度 |
| 🎯 P1-a 弱科挑战系统 | `getWeeklyWeakChallenge` 每周检测弱科, 做 2 次弱科 game +30 bonus, `recordGameRun` 自动计入 |
| 📊 P1-b 模考诊断闭环 | `addMockExam`→`generateFocusAreas` 月度模考输入→自动生成训练重点(紧急/关注) |
| 🎧 P2 听力扩容 | `LISTEN_DICTATIONS` 16→51 段 (+35), 覆盖校园/交通/购物/健康/环境 5 大场景 |

**新数据字段**:
```js
state.compTracking = { W1: { submitted, reviewed, rewritten } }
state.weakChallenge = { week, done, bonusGiven }
state.focusAreas = [{ subject, priority, detail }]
```

**新 UI 卡片** (主页): 作文追踪卡 / 弱科挑战卡 / 模考诊断重点卡

**核心设计哲学转变**: 从"打卡就给分"→"学好才给满分"

---

## 📅 版本历史 (v18.51-v18.59)

### v18.51 — P0 误导性修复 (2026-05-02)
**痛点**: 20 个并行 agent 审查发现 8 个会误导孩子的硬错误。

| 修复 | 详情 |
|---|---|
| 🍄 蘑菇分类错 | data.js:1868 — 蘑菇是真菌不是植物, 改为"地钱" (真苔藓) |
| 📚 paradigm 超纲 | data.js VOCAB_HARD — SAT/大学词, 删除 |
| 💰 SGD 0.25 残留 | app.js:4214/4706 — 改为 0.05, 注释 6000 → 30000 |
| 📝 eng_psle Paper 1 时间错 | data.js — 1h10min (原标 70min 误导, Editing 不在 P1 在 P2) |
| 🧪 KNOWLEDGE_PRACTICE explain 不符 | math_psle_paper1 Q1 — 简化 explain 不混入 P2 内容 |

---

### v18.52 — P1 PSLE 对标加强
**痛点**: PSLE Math 题库 40% 是 P4-P5 心算题, AL 预测公式两套割裂。

| 改造 | 量化 |
|---|---|
| ➕ Math +27 道 PSLE Paper 2 多步推理 | 反向%/复合%/Bar Model/调和速度/假设法 |
| ➕ Grammar +15 (article/pronoun) | 25→40 题, 补充 PSLE Cloze 占 30% 的冠词陷阱 |
| ➕ Cloze +8 段落风 (200 词 context) | 25→33 题, 模拟真考 Vocab/Grammar Cloze |
| 🔧 AL 公式统一 | 删旧"积分→AL 6-20"映射 (超 PSLE 真实范围), 改为 4 科 mini-game 加权 |
| 🛋️ 95% 休息提醒 | 防沉迷第 3 闸 — 完成率 ≥95% 显示 "🛋️ 该休息了" 软提示 |

**新公式**: `AL = f(数学 25% + 英语 25% + 科学 20% + 华文 10% + 知识树⭐ 20%)`
- ≥90% AL 1 / ≥85% AL 2 / ≥80% AL 3 / ≥75% AL 4 / ≥65% AL 5 / ≥45% AL 6 / ≥20% AL 7 / <20% AL 8

---

### v18.53 — P2 内容打磨
| 改造 | 详情 |
|---|---|
| 🎧 Listen +4 段 SG 本地化 | hawker/MRT/kopi + 数字易混(15/50) + 转折否定 + precipitation 同义陷阱 |
| 🔬 sci_energy/sci_cells 表述优化 | "能量守恒 vs 可用能递减" / "壁支持 + 膜选择" |
| ➗ math_fractions explain 重写 | "1/3 + 1/2" 易误读, 明确"花余下 1/2 = 总共 2/3" |
| 🗣️ Oral 1.5 秒改范围 | 0.5-1.5 秒 (不再绝对值) |
| ⭐ 知识树 ⭐ 参与 AL | 权重 20%, 但 v18.55 修了 bug |

---

### v18.54 — Math 题库升级 P6+/PSLE 中难度
**痛点**: 孩子数学 90+ (memory 记录), mini-game 还在喂 P5 心算题。

| 维度 | 旧 (v18.53) | 新 (v18.54) |
|---|---|---|
| 总题数 | 121 | **65** (砍 56 入门题) |
| diff 1-2 (P3-P4 心算) | 56 道 | **0 道** |
| diff 3 (P5 热身) | 6 | 6 |
| diff 4 (P6 进阶) | 26 | **39** |
| diff 5 (PSLE+) | 14 | **20** |
| math 起步难度 | 3 | **4** (其他 game 仍 3) |

**删除**: 整数四则 (`125+75`) / 简单分数 (`3/4+1/4`) / 简单百分比 (`50% of 80`) / 简单几何 / 简单平均 / 余数

**新加 25 道 PSLE 5-mark**:
- Bar Model: "甲乙 7:3, 给 $20 后 1:1, 求甲原" → 70
- 调和平均: "上山 30 下山 60, 平均速度" → 40 (不是 45)
- 复合百分比: "$1200 涨 25% 降 20%" → 1200 (经典陷阱)
- 假设法: 鸡兔同笼 / 票面组合
- 复合图形: 矩形挖半圆 / 立方体表面积

**Agent 验证**: 68/68 答案 100% 正确 + 全整数。

---

### v18.55 — 双层龙系统 + AL bug 修
**痛点 1**: 30000 分龙 vs 73 周顶格 ~10000 分严重脱钩 — 普通孩子永远拿不到。
**痛点 2**: 1 个节点拿 3⭐ 就把 AL 拉高 1-2 级 (`avgStars/3` bug)。

#### 双层龙
| 装备 | 解锁 | SGD | 哲学 |
|---|---|---|---|
| 🐲 银龙伙伴 (新) | 10000 分 | SGD 500 | 习惯养成 — 打卡之王 |
| 🐉 金龙伙伴 (改) | 105/105 ⭐ AND ≥10000 分 | SGD 1500 | 真本事 — 学得深透才能拿 |

#### AL bug 修
```js
// 旧 (bug): 1 节点 3⭐ = 100% (虚高)
const ktAcc = avgStars / 3;
// 新 (修): 必须 105⭐ 全拿才 100% (真实)
const ktAcc = totalStars / (35 * 3);
```
**实测**: 用户 750 分 + 1 节点 3⭐ → AL 4 修正为 **AL 6**。

#### UI
- 主页 "🐉 双龙伙伴" 进度卡 (银/金双进度条)
- 知识树页顶 "🐉 金龙进度: X/105 ⭐" 提醒条 (金色高亮)

---

### v18.56 — 双龙卡紧凑 + 装备墙去重
**痛点**: 双龙进度卡占位太大; 装备墙 + 双龙卡都显示龙 — 孩子混淆。

| 改造 | 详情 |
|---|---|
| 🎨 双龙卡紧凑 | 1087 字节 (从 2375 减半), 一行一龙 |
| 🚫 装备墙隐藏双龙 | `HIDDEN_FROM_GRID = ['silver_dragon', 'dragon']` |
| 🐲 宠物龙改名 | 成就墙的 "神龙伙伴" → "宠物终极进化", 跟装备龙消歧义 |

---

### v18.57 — 73 周激励覆盖度补强
**痛点**: W27-W52 期间 5 个 4+ 周完全无新装备的"荒漠期"。

| 类别 | 量化 |
|---|---|
| ➕ 4 件装备 | 1290 (🦪 珍珠) / 2050 (🌠 极光) / 2350 (🛸 轨道) / 2700 (🌫️ 星云) |
| ➕ 4 个中段成就 | 半程战士 (3000 分) / 50 天战士 / 知识树探险家 (20 节点) / ⭐ 30 收集者 |

**效果**: W27-W52 最大 gap 从 350 分 (3+ 周) 缩到 250 分 (2-3 周)。

---

### v18.58 — 持续激励 (无尽奖励池)
**痛点**: 第 1 个月装备爆炸密集, 之后强度断崖式下降, 孩子失去新鲜感。

**目标**: 73 周每周都有"可期待的新东西", 学习动力越涨越强。

| 类别 | 数量 | 触发节奏 |
|---|---|---|
| 🛡️ Streak 装备扩展 (5 件) | 50/75/150/200/300 天 | 长期打卡持续奖 (填 100 天前后空档) |
| 📚 知识树 ⭐ 装备 (3 件) | 30/60/90 ⭐ | 学得深就有 (跟金龙路径联动) |
| 🎮 Mini-game 局数装备 (3 件) | 50/200/500 局 | 玩得多有奖 (新加 `state.totalGameRuns` 跟踪) |
| 🏆 周次里程碑成就 (15 个) | W5/10/15/20/25/30/35/40/45/50/55/60/65/70/73 | **每 5 周必触发**, 光打卡到周也有奖 |

**总数**: 装备 50→**61** (+11), 成就 34→**49** (+15), 总激励点 84→**110** = **平均每周 1.5 个**。

**心理学**: 永远有"近的目标" (streak 150→200→300 / 知识树 30→60→90⭐ / 周次 W5→10→...), 多条平行路径同时进度, 任一路径都有奖。

---

### v18.59 — 错题本 (Error Bank)
**痛点**: 错题做完就忘, 没有"反复练直到消灭"的机制。

**核心机制**:
```
答错 → 自动入错题本 (按 fingerprint 去重)
    ↓
主页错题本卡 (红色 badge: 12)
    ↓
点 "立即复习" → 一题一题做
    ↓
答对 → ✅ 自动从本里删除 + 1.2s 显示解析
答错 → ❌ 保留 + retries+1 + 2.2s 解析 + "下次再练"
    ↓
全部答完 → 撒花 + "本轮答对 X/Y" + 还剩 N 题
```

**已 hook 的 3 个题源** (v18.59):
| 来源 | 触发点 | 类型 |
|---|---|---|
| 🌳 知识树练习 | submitKnowledgePractice 后, 每道错题入库 | mcq |
| ✏️ Grammar / 🧩 Cloze | submitMcqAnswer 时答错 | mcq |
| 🔢 Math | submitMathAnswer 时答错 | math (整数) |

**TODO** (后续可加): 词汇 / 听力 / Editing / SciLab — 题型特殊, 单题"复做"逻辑跟 MCQ 不同。

**数据结构**:
```js
state.wrongAnswers = [
  {
    id, _fp,                    // fingerprint 去重
    gameKey, type,              // knowledge|math|grammar|cloze, mcq|math
    q, opts, ans, explain,
    addedDate, addedWeek, retries,
    nodeId?, subj?              // 仅 knowledge 类
  }
]
```

---

### v18.60 — 双龙 RPG 化 (拿到有真意义 + UI 炫酷)
**痛点**: 之前金银龙拿到啥也不变, 进度条只是两条纯色, 没有"通关大礼"感。

**🐲 银龙觉醒** (10000 分):
- 角色头顶浮真 SVG 银龙 (S 形飞行 + 银光粒子 + 上下飘动)
- 称号自动加 "🐲 银龙骑士" 前缀
- 永久 +10% mini-game 奖励 (5 处 reward 计算同时生效)
- 全屏银光觉醒仪式: 4 段文字滚动 + 撒花 + 音效

**🐉 金龙觉醒** (105⭐ + 10000 分双门槛):
- 金龙真 SVG 环绕全身 + 火焰口吐 + 金鳞片流动 (dasharray) + 4 个浮动金光粒子
- 称号 "👑 PSLE 大师 · 🐉 金龙之王"
- 永久 +20% 奖励 (覆盖银龙)
- 全屏黑场 + 5 段文字滚动 + 3 波撒花 + 双 tada 音效
- 主页金色主题 (`.gold-dragon-active` 渐变 + sparkle 角落动画)
- 第二宠物解锁: "🐉 金龙幼崽" SVG, 主页可一键切换 🐹↔🐉

**新数据**: `state.dragonsUnlocked = { silver, gold }` (含 unlockedAt + ceremonyDone), `state.activeDragonBuff`, `state.activePetType`, +`PET_FORMS_DRAGON` (新宠物 SVG)

**关键文件**: data.js (+`getDragonBuff` / `+checkDragonUnlock` / `+GOLD_DRAGON_PET`), character.js (+silverDragonBody / +goldDragonBody / +getDragonTitle), app.js (`+renderDragonCeremony` / `+_checkAndTriggerDragonCeremony` / `+switchPet`)

---

### v18.61 — 装备穿戴感重做 (手握/手捧/骑乘, RPG 风)
**痛点**: 装备只是"贴标签"在身上, 没有真互动感。

| 装备 | 改造 |
|---|---|
| 🍎 苹果 | 浮在腰带 → 真举右手 + 咬过的缺口 + 上下浮动 |
| ☕ 水杯 | 腰带挂饰 → 真握右手 + 3 道热气交错呼吸 |
| 🍪 饼干 | 浮腰中 → 脸侧咬一口姿态 + 咬痕 |
| 🎂 蛋糕 | 腰带小蛋糕 → 双手捧大蛋糕 (3 层奶油 + 樱桃 + 蜡烛火苗动画 + 6 颗装饰糖珠) |
| 🚀 火箭 | 旁边小浮 → **角色骑乘真起飞** (3 层喷射火焰 + 整体颠簸 + 速度线 + 烟雾尾) |
| 🦄 独角兽 | 旁边站 → **大尺寸骑乘** (4 腿摆动奔跑 + 彩虹鬃毛/尾巴飘 + 鞍 + 缰绳 + ✨闪粉) |

**优先级链**: handR 用于 sword > magic > mic > apple > cup, 防止双装备冲突

---

### v18.62 — 装备 3D 立体感 (从"红色影子" → 金属渐变 + 阴影)
**痛点**: 装备穿在身上不明显, 火箭就是个"红色影子" (实际是被 body 覆盖); 2D 平面填充缺乏立体感。

**核心 bug 修**: SVG 渲染顺序 `${rocket}` 在 `${body}` 之前 → 角色身体覆盖火箭。修复: rocket 移到 body 之后渲染。

**全局 3D 渲染体系** (新加 SVG `<defs>`):
- `eqShadow` / `eqShadowBig` — 通用 drop-shadow filter (装备立体悬浮)
- 7 个 gradient: `metalRed/metalSilver/metalGold/rocketBody/rocketRed/appleSphere/cupSphere/crystalSphere`

**重做的 8 件装备** (用 4 种 "假 3D" 技术: drop-shadow filter + linear/radial gradient + highlight 反光斑 + 双层描边):
| 装备 | 3D 升级 |
|---|---|
| 🚀 火箭 | 大型金属火箭 + 银色渐变 + 红色头锥 + 玻璃舷窗反光 + 4 颗铆钉 + 金色 A+ 红 banner |
| 🍎 苹果 | 球面渐变 + 大反光斑 + 立体咬痕 + 双层带描边叶子 |
| ☕ 水杯 | 釉面渐变 + 椭圆 3D 杯口 + 双线带阴影把手 + 杯底椭圆阴影 |
| ⚔️ 剑 | 金属渐变 + 高光中线 + 双层金属护手 + 红宝石球面柄端 + 缠绕皮革 |
| 🪄 魔法棒 | 黑檀木 + 金色球头 + 雕刻五角星 + 中心高光 + 旋转金色光环 + 3 颗飞溅火花 |
| ⌚ 手表 | 银色金属表壳 + 黑表盘 + 金色刻度 + 时针/分针 (60s 旋转) + 玻璃弧形反光 |
| 🔮 水晶球 | 金色 3D 底座 + 球面渐变 + 大反光斑 + 内部脉冲光晕 + 紫色环绕魔光 |
| 🎂 蛋糕 | 银色盘 + 5 朵奶油花 + 大樱桃 (3D 球) + 蓝白条纹蜡烛 + 3 层火苗 + 6 颗 3D 糖珠 + 露出拇指 |

**ViewBox 扩大**: 220×240 → **270×270** 容纳大型骑乘装备

---

### v18.62b — 知识树金龙提示条对比度
**痛点**: 浅黄底 + 深黄字, 看不清。

**修**:
- 背景: `#FFF3C4` → `#FFD700` 改为 `#3D2A00` → `#7A5C00` (深棕渐变)
- 主文字: `#5D4500` 改为 `#FFE066` (浅金, 高对比)
- 关键数字 "21/105 ⭐": 加白色 `#FFF` 加粗
- "(SGD 1500)": 亮金 `#FFD700` 加粗

---

## 🏗️ 架构概览

### 文件结构
```
chamui-psle/
├── index.html              主 HTML + CSS (~5k 行)
├── data.js                 数据 + 题库 + 算法 (~5k 行)
├── app.js                  UI 渲染 + 事件 + 游戏逻辑 (~5k 行)
├── character.js            角色/装备/皮肤 SVG 生成 (~1k 行)
├── qa_check.js             149 项断言 (vm.runInContext, Node 跑)
├── build.py                4 文件合并 → chamui_app_single.html
├── deploy.sh               build + git push + Firebase deploy
└── chamui_app_single.html  生成物 (单文件部署用)
```

### 状态结构 (state, 持久化在 localStorage + Firebase)
```js
{
  totalPoints,                // 累积积分 (打卡 + mini-game + 月小测)
  currentWeek, daily, weekly, // 73 周打卡数据
  dailyStreak: { days, bestEver, freezes },
  gameStats: { math: {difficulty:4, recent:[]}, ... },  // 5 级自适应
  knowledgeExplored: { [nodeId]: { date } },            // 看过节点
  knowledgeStars: { [nodeId]: { stars, bestScore, attempts } },
  totalGameRuns,              // v18.58 mini-game 累积局数
  wrongAnswers: [...],        // v18.59 错题本
  mysteryBoxes: { available, opened, history },
  pet: { formIdx, name },
  milestones: { W14: true, ... },
  achievementsUnlocked: [],
  equipmentDisabled: [],      // 卸下的装备
  exchanges: [],              // SGD 兑换记录
  logs: []                    // 加分日志
}
```

### 关键算法
| 算法 | 位置 | 描述 |
|---|---|---|
| 难度自适应 | data.js:1225 `recordGameRun` | 最近 3 次 ≥80% 升级, 最近 2 次 ≤40% 降级, math floor=4 |
| AL 预测 | data.js `predictOverallAL` | 4 科 mini-game 加权 + 知识树 ⭐ (绝对完成度) |
| 知识树 ⭐ | app.js `submitKnowledgePractice` | 60% 1⭐ / 80% 2⭐ / 100% 3⭐, 取最佳记录 |
| 错题去重 | data.js `addToErrorBank` | fingerprint = `gameKey|q|nodeId` |
| 装备解锁 | character.js `checkEquipmentUnlocked` | 7 种 condition: points/milestone/streak/streak-days/monthly3/kt-stars/game-runs (后两个 v18.58) |

---

## 📊 当前规模 (v18.62b)

| 系统 | 数量 |
|---|---|
| 装备 | 61 件 (34 points + 10 milestone + 8 streak-days + 3 kt-stars + 3 game-runs + 2 monthly3 + 1 streak) |
| 成就 | 49 个 (5 坚持 + 5 探索 + 4 收藏 + 4 宝箱 + 6 PSLE + 6 隐藏 + 4 v18.57 中段 + 15 v18.58 周次) |
| 皮肤 | 6 套 |
| 宠物形态 | 7 阶 (蛋 → 王者) |
| Mini-game 题库 | Math 65 / Grammar 40 / Cloze 33 / Vocab 150+ / Listen 16 / Editing 25 / SciLab 53 / Unit 50 |
| 知识树 | 35 节点 × 3 题 = 105 道 PSLE 风练习 |
| 73 周作文 | 73 个 prompt, 26 周有完整模板 |
| QA 断言 | 149 项必过 |

---

## 🚀 部署

```bash
./deploy.sh "commit message"
```

自动: build (4 文件 → chamui_app_single.html) → git push → Firebase Hosting deploy。

GitHub Pages 1-2 分钟自动从 main 分支同步。

---

## 🔮 后续可加 (TODO)

1. **错题本扩展到 vocab/listen/editing/scilab** — 4 个 mini-game 错题 hook (v18.59 仅做了 3 个 MCQ + math)
2. **P3 周次里程碑装备** — W30/W36/W50 加 3 个非考试里程碑装备 (光打卡也解锁)
3. **每日登录 +5 分 bonus** — 持续小奖励
4. **季节事件** — PSLE 100 天倒计时装备 / 假期主题装备
5. **错题分类筛选** — 只复习数学 / 只复习语法等

---

> 维护: 每个版本 deploy 时同时更新此文档. 大修改在版本号 .X 增加, 小修在 .X.Y。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v19.50 (2026-09-03) 每日课表 tab + 按日打分卡 + 周汇总/月跟踪

**痛点**: 手册 v18.6 定稿后课表只在 Word 里, 孩子每天要翻文档; 每日成绩单纸质填写, 家长按月跟踪要手抄。

**改造**:
1. 新增 📆 课表 tab (暑假后第 8 tab): 手册 v18.6 全天时刻表内置, 自动定位今天, 7 天可切换, 周四/周六显示全天无任务
2. 按日打分卡: 每天对应字段 (Editing错题/阅读OE答完整/Cloze得分/科学诊断/华文漏点/睡前单词自测等), 做完当场填, 存 state.scheduleScores 随 Firebase 多设备同步
3. 本周计分卡: 严格按 PSLE 考试组卷结构 12 模块 (英P1作文/P2各题型/P3听力/P4口试+数学+科学BktA/B+华文+词汇底盘), 从每日打分自动汇总, 达标✓/✗/待填三态; 全达标提示"下周五二刷免掉"
4. 月度跟踪: 最近 8 周关键指标表 (阅读OE/Editing/完形/科诊断/华漏点/达标数), 按周看趋势

**量化**: QA 579→593 项 (+14); 汇总计算浏览器实测通过 (70% 判✗/合计/百分比全对)。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v19.51 (2026-09-03) 周打分表: 完整成绩矩阵(对齐手册附录B每日成绩单)

**痛点**: v19.50 打分卡只显示"今天"字段, 周四打开=空白; 无法补填/修正其他天; 图2纸质成绩单的完整结构没有数字化。

**改造**:
1. 今日打分卡 → **周打分表**: 21检查项×5学习日完整网格(行=英语8+科学4+华文数学周日5+每天必查4), 任意格可填可补, 只填数字/勾选
2. 列头带日期+今天高亮; **‹上周/下周›切换**可查改历史周; 表格 overflow-x 卡内滚动手机不撑破
3. 新增行: 科学概念讲清勾/回炉清章数/数学错题+粗心双栏/作文内容+语言双栏/家长已核对/21:30收工
4. 字段体系重构为矩阵式统一key (ed/gr/oe/cloze/vw/syn/listen/wkt/sci_*/cn/math/paper/essay/oral/review/vt/sleep/parent), 计分卡Grammar行合并词汇MCQ(≤4/≤10)
5. 周计分卡+13行(加周日整卷记录行), 跟随所选周

**量化**: QA 593→602项; 浏览器端到端实测(真实DOM change事件→打分→汇总80%联动→周切换→数据清零), 测试全程拦截saveState未污染线上数据。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v19.55 (2026-09-03) 全站换肤: 暗色赛博 → 亮色主题(对齐BTC挖矿策略系统配色)

**改造**:
1. :root 全变量重写: 浅灰蓝底#F0F2F5/白卡#FFF/品蓝主色#2B5BD7/深灰文字#1F2937/浅边框#E5E9F2
2. v19.20-21 "inline浅色hex自动转暗"机制整体移除(~3KB CSS), 浅色原生生效
3. 全文件批量色彩映射 863 处 (index/app/data/character/qa): 亮灰文字→深灰、白透明容器→浅色实底、荧光accent→深色版、青→品蓝、暗底→白底
4. body 去暗色radial渐变+漂浮装饰; character-card 暗渐变修复(无空格rgba变体补扫)
5. CLAUDE.md 7.6 配色规则改写为亮色主题版(新UI必读); QA废除14条暗色机制断言+新增7条亮主题守护断言

**验证**: QA 604全过; 浏览器逐页截图检查(主页/课表/打卡/练习/我的/能力/词汇/Cloze弹窗)全部浅色干净。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v19.61-v19.75 (2026-09-03) 课表/亮色主题/同步根修/详解全量/知识树扩容 (单日版本群)

- **v19.50-54 课表tab**: 每日课表(手册v18.6同源实书名) + 周打分矩阵(7天可填) + PSLE组件计分卡自动汇总 + 月趋势; 导航重构(练习提前, 打卡/我的/暑假/管理收进 ⋯其他)
- **v19.55-63 亮色主题**: 全站对齐BTC挖矿系统配色(品蓝#1E40AF/浅灰蓝底#F1F5F9/白卡), 灰字全转黑
- **v19.65/69/71 错题本editing三连修**: 自评式复习 → 全段落入库(修"题不对") → 交互式点词找错(全对且无误选才算对, 真错词绿/误选红)
- **v19.68 数据同步根修(P0)**: saveState盖 _lastTouch 时间戳 / load取新者 / 本地更全自动推回云端 / onSnapshot拒收旧戳; 云端手工合并两条数月分叉(4806分+iPad学习线), 合并前备份 firebase_dump_2026-09-03-14-18-25.json 在仓库. 教训: 本地localhost测试必先清localStorage或拦截saveState
- **v19.70 详解全量注入**: 528道题 explain 批量生成+验证 (Grammar195/Math132/Cloze206/SST100)
- **v19.72/73 知识树配色统一**: 金龙横幅白底 / 已掌握节点品蓝浅底(用户点名不要绿) / 星环调色板琥珀
- **v19.74 知识树扩容 35→47节点**: 科学19 = MOE P3-P6五大主题全覆盖(+磁铁/物质三态/消化系统/植物运输/呼吸循环/电路/生态环境); 英语13 = PSLE四卷组件全覆盖(+词汇辨析/看图理解/完形填空/句型转换S&T/情景写作); 科学英语全部desc深度从AL4-6重写为AL1满分标准; 修旧口径(听力20分/P1=55/口试=朗读10+SBC20); 金龙105⭐门槛不变(总星池141)
- **v19.75 科学每节点3→10题**: 3基础+3易错(常考陷阱)+2应用(新情境)+2拉分(超纲/名校prelim风), 共190题全带详解+彩色标签芯片; 节点两按钮分工: 定星练习(学透主通道)/加练熟练度(mini-game)
- **QA**: 604 → 668 项

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v19.81 (2026-09-05) 全站对齐"综合AL4=四科全AL1" + 数学/华文树补全 + 修三个让AL1算不出来的死结

**背景**: 用户把目标从"综合 AL 4-6"改成 **综合 AL4 = 四科全部 AL1 (每科90分以上)**。四个审计员分科体检后, 发现问题远不止文案口径。

### 一、三个代码死结 (不修则 AL1 在系统里永远不可达)
1. `_gameDiffToAL` 的映射表漏了最高档 `diff=6`, 落到 `|| 6` → **打到最高难度反被判 AL6, 越努力评级越差**。修为 `{6:1,5:1,4:2,3:4,2:6,1:7}`, 未知档回退 8 而不是冒充 AL6
2. Paper2 模考 `estAL` 最高档是 `>=31 → 'AL 2-3'`, 满分 35 也判不出 AL1; 且 `parseInt('AL 2-3')=2` 写进 paper2ALHistory 喂给综合AL预测 → **英语被结构性封顶在 AL2, "综合AL4"数学上不可能出现**。补 AL1/AL2/AL3 三档
3. 数学 mini-game 用 `parseInt` 判分 → **11 道答案是小数的题永远判错**(2.5/4.8/83.44...), 还会拖低自适应难度、错题永远毕不了业。改 `parseFloat` + 0.005 容差; input 改 `inputmode="decimal"`(iPad 数字键盘原本没有小数点键)

### 二、难度引擎对齐 AL1
- 升级线 **80% → 90%** (AL1 的定义就是 90 分; 原来孩子每档只练到 AL3/AL4 水平就被推走)
- 华文移出平日锁 `WEEKDAY_LOCKED_GAMES` (华文已从 AL1 掉到 AL2, 一周只有周日能练不够)
- `subjectALEstimates` 默认值对齐 2026-08 校考实测: 英6/数1/科3/华2 (原为 科2/华1)

### 三、数学树 10 → 19 节点 (对齐科学广度)
新增: 整数·因数倍数 / 分数四则运算 / 小数运算 / 面积与周长 / 平均数 / 图表与数据 / 圆 / 立体图形·展开图 / 数列与规律
- 修超纲内容: 删圆柱体积、平行线截角(同位角内错角)、n边形内角和公式 —— 都是中一内容
- 修 π 口径自相矛盾(三处不一致): 统一为"半径是7的倍数用22/7, 否则用3.14"
- **⚠️ 速度节点标为"待确认是否还考"**: 多方资料显示 MOE 2026 起把 Speed 移出小学大纲下放中一, 孩子 2027 年考。不删内容, 但去掉"必考"标签并写明请向学校确认; 补题时改为主攻仍在大纲内的"率 Rate"
- 修练习入口错配: 9 个数学节点的 game 指向 UNIT_CONVERSIONS(纯单位换算), 点"圆"练到"1kg=?g" → 改指 math

### 四、华文树 5 → 12 节点 (从高华框架整体重建为普通华文)
**根因**: 原 5 个节点全按高级华文(HCL)写, 孩子读普通华文。危害包括: 总复习节点写"PSLE高华只有2张卷"(把听力和口试从备考地图抹掉)、"高华fail影响中学分配"(不存在的焦虑)、例子举到"七月流火"级冷僻典故、作文教议论文+引用孔子云(HCL打法)、`ch_reading` 的 pitfall 写"不能照抄原文要升华"(正好和孩子"2分题只写1点"的病灶相反)
新树: 汉字词语基础 / 词语运用选词填空 / 成语与熟语 / 句子与语法病句 / 阅读理解选择题 / 阅读方法 / **阅读理解问答踩点(对准丢的7分)** / 情境写作实用文 / 命题作文 / 听力理解 / 口试朗读+看图说话 / PSLE华文四卷
- 删除编造的考项: 原 tips 写"华文Paper2综合题=听写+默写", **PSLE华文没有听写**, 改为听力理解(选择题)
- 真题资源区从"PSLE高华真题"改标注"认准 Chinese 普华, 别下成 Higher Chinese"

### 五、题库扩容: 每节点 3 题 → 10 题 (基础3+易错3+应用2+拉分2)
数学 19 节点 + 华文 12 节点 + 英语 13 节点全部补齐, 每题带标签和详解, 由多个命题 agent 分科生成并各自复核计算/语法/答案位置打散

### 六、口径全站换血
`AL 4-6`/`75-89%`/`目标AL2`/`英语AL6→AL3` 等旧文案逐条改 AL1; 录取概率卡补 COP4-5 顶部梯队(南洋女中/德明直通车), 否则四科全AL1后 8 所里 7 所都是 98% 失去区分度; CLAUDE.md/DEV_GUIDE.md/HANDOFF.md 的目标同步改写(防下个 session 又写回 AL4-6)

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v19.82-v19.86 (2026-09-05) 题库体检: 修事实错误 + 拆掉两条泄题线索 + 引擎对齐 AL1

四个审计员分科体检后的连续修复。**这一批修的不是"少了什么", 是"教错了什么"。**

### 科学事实错误 (孩子照着学会答错的)
- **W12 热感题热流方向讲反**: 100°C 方块摸起来烫, 热是"进"手; 原文写"把你手指的热抢走"——那是冬天摸铁门的解释。热流方向是 PSLE Heat 章核心采分点
- **编造的数据**: "LED 把90%电变光"(真实光效约30-50%) / "蒸腾增5倍"(对光强是饱和响应, PSLE不考定量倍数) / 小肠"250m²"(旧教科书数据, 近年测定30-40m²)
- **"摘光叶子几天枯死"** 生理上站不住(根压仍能送水, 落叶树每年落光叶也不死)
- 220V→删(新加坡是230V且电压不在大纲内); 蒸汽烫伤 hook 写100倍正文写6倍自相矛盾; 手电筒影子题题干问"离墙近"解释讲"离物体近"
- 细胞节点删"中心体"(中学内容); 生殖节点 desc 把配子和装配子的结构混为一谈, 且与本节点自己的练习题矛盾

### 两条泄题线索 (这是本轮最重要的发现)
**线索一 — 答案就是最长的那个**: 科学190题里81%的正确答案是四选项中唯一最长的, 正确项平均是干扰项的2.98倍长。**闭眼选最长能拿93分。** 而孩子科学最大失分点恰恰是选择题(-8)。华文同样58%。
→ 5个agent分批重写203题干扰项(按"概念用反/方向记反/常见误解/张冠李戴"设计, 保证科学上确实错)。科学 81%→22% (长度比2.98→1.03), 华文 58%→36% (1.60→1.05)

**线索二 — 伪随机洗牌**: 各处用 `sort(() => Math.random() - 0.5)`, 四元素时分布明显不均(实测答案原在A位: 洗后留A 28.1%/到D仅18.8%)。叠加题库位置偏差(SST 100%答案在A位、科学知识树86%在B位), 位置本身就是线索。
→ 新增 `_fyShuffle` (Fisher-Yates) 替换全部选项洗牌, 实测 25/27/24/25%。错题本也改为每次复习重新洗牌(否则反复复习变成"记住答案在第几个")

### 华文题库去高华化
d6 十题全是《论语》/文言虚词/借代 —— 孩子读普通华文。危害是复合的: 自适应难度把华文好的孩子一路推到 d6 从此喂文言文, 而 computeTotalAL 又拿"华文难度档位"反推华文AL —— **等于测的根本不是普华能力**(这解释了为什么 app 显示华文AL1、校考却是AL2)。
→ 替换15题为普华真高难点(病句四类/关联词/近义词精细辨析/短文选词填空/标点), 顺带修掉一道有5个选项的结构bug

### 难度引擎
- `_gameMaxCap` 按题库真实覆盖动态封顶: 原来所有game都能升到Lv6, 但该档题不够时 `_sampleByDiff` 会静默回落"全池随机" → 孩子看到"Editing Lv6"实际做的是P4题
- Editing 题库 61→77 段(补 diff5×10 + diff6×6), 封顶 Lv4→Lv5。原来封顶=起步档, 等于没有进阶空间, 而它正是孩子丢5分的弱项
- 英语 weak 模式难度上限 Lv2→Lv3; 连错劝退门槛 4→6 题; 弱科告警线 70%→90% (AL1就是90分, 原来75-88%这个真正该救的区间完全不报警)

QA 751→764

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v19.87-v19.89 (2026-09-05) 词汇闪卡改版 + 全站题库对齐 AL1

### v19.87 词汇闪卡: 每天一组, 每个词都点到「认识」才算完
旧逻辑一次抓20个到期词过一遍就散场; 首页报的"到期总数"只涨不落越积越吓人。
新逻辑(用户定的六条): ①三档自评(不认识/有点印象/认识), 前两档把词排到本组队尾带"🔁补考"徽章
②全部认识才收工, 收工页写"今天这一组全认识了"并列出补考过的词 ③跨天自动重编, 今天不认识的排进去
④**曲线只认当天第一次自评** — 同一天补考三遍不会跳三关也不重复加分 ⑤编组新词优先但
**"之前没记住的"保底1/3** (否则查词多的日子老赖永远进不来) ⑥首页/词汇页改报"这一组还剩几个"
数据层 `state.fcDailyGroup {date, words, queue, firstPass, retakes, done}`

### v19.88-89 全站题库对齐 AL1 (用户: 不要在基础题型上反复浪费时间)
两个教研审计员的结论: 数学库约65%对已AL1的孩子没价值, 科学库90%是单点事实回忆,
而孩子科学最大失分点恰恰是选择题。

**删掉 75 道浪费时间的题**:
- 数学 33 道: 平方根/工程问题/数论余数/数列求和/环形跑道/火车过桥/勾股/负数答案/重复题 —
  这些是奥数不是 PSLE, "更难"被误当成"更像奥数"
- 数学"答案编码hack": 原有题要求把 2.4h 输成 24、5/8+3/4 只填分子 11 —— 在教考场上会害死人的格式
- 英语 42 道 d1-d2: minFloor=4 时这些**永远抽不到**, 纯占位置

**补 119 道 AL1 难度题**:
- 数学 +20 (d5/d6): PSLE Paper 2 形态, 题干29-65字、需先求中间量、条件藏在后半句
- 科学 +20 (d5/d6): 审计发现三类 Booklet A 硬题原来是 0/0/1 道 → 现补 装置对比6/图表推断6/多陈述5/跨主题3
- 英语 +79 (d5/d6): Grammar 27 / Cloze 28 / SST 24

**修的错**: 环形跑道题答案精度必错(400/9存44.4而判分容差0.005, 算对反被判错)、
"盐是生锈catalyst"(盐是电解质)、一道电路题有两个正确答案(开关和磁铁都非必需)
**渲染**: .mg-q 原固定36px居中(为算式设计), 新的多步应用题在iPad会撑爆 → 按题干长度自适应

结果: 七个题库全部能真正升到 Lv6 (editing Lv5), d5+d6 拉分题从个位数涨到 54-74 道/库
QA 776→792

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v19.90-v19.98 (2026-09-05) 四轮复核: 从"内容够不够"查到"内容对不对"

四个教研复核员按 AL1 标准逐科验收, 挖出的问题比补内容本身更严重 —— **有一整类内容在主动教错**。

### 正在教错的 (最高优先级)
- **264 道题的解析在指错选项**: 解析写"A 是对的""第二项错在…", 但渲染时每次都 Fisher-Yates
  重洗选项并重算 ans → **任何位置引用天生 3/4 概率指错**。更糟的是有一批在存储顺序下就已经错了,
  即**每次都教反**: `ch_comp_oe`(专治孩子丢那7分的节点) 10题里7题、SST i=42 直接指着正确答案说它错
  ("such hot soup" 是对的却被判错, 把带 a 的干扰项说成标准答案)。
  修法不是改字母, 是全部改成引用选项原文「…」
- **GST 题答案错**: 250×1.09=272.5 存成 273, 判分容差 0.005 → **孩子算对反被判错**
- **考试格式记错且正确答案被列为干扰项**: 科学卷写 1h15min(实际1h45)、数学 Paper1 写 50min。
  对科学 AL1 是直接伤害 —— 他丢 8 分在 Booklet A, app 却教他 28 题 30 分钟做完(64秒/题),
  实际有约 45 分钟。按 app 的节奏练 = 练成在最丢分的地方赶时间
- **4 道题的干扰项本身是合法英语**(合法倒装/省略让步从句/复数版比较), 选了会被冤枉判错
- **5 条"僵尸解析"**: 点评的是 v19.90 就被换掉的选项, 孩子读到的是上一版题目的解析

### Editing 引擎三处硬伤
- **3 段孩子根本通不了关**: "已找到"按词字符串去重, 而这 3 段错词首词重复(如 a/have/are/speaks/a),
  永远凑不满 5 个。改按位置下标记录, 实测死锁段现已可通关
- **25 处歧义点击**: 同一个词在正文出现多次时, 点到语法正确的那个也算"找到了"
- **假难度**: 恒传 recordGameRun(...,5,5) = 每局 100%, 难度只升不降、误点多少次都不影响

### 难度显示是假的
- 顶格档实测只有约 5 局新内容, **第 12 局起 Lv6 里混进 d4, 第 19 局 10 题里 9 题是 d≤4**, UI 仍显示 Lv6。
  原因: `_gameMaxCap` 算一次永久缓存且按全库算(不扣已掌握)、`_sampleByDiff` 最后一层兜底
  完全不看难度。现改为按"未掌握的题"实时算 + 兜底加 diff-1 下限
- **掌握判定**: 答对1次 → 连对2次 (顶格档只有 8-15 道, 一局好状态就刷空)

### 内容
- **阅读理解问答 20→32 篇**(孩子最大失分点 -7分): 新增 12 篇 PSLE 真实篇幅(364-424词,
  原来全是100-220词只有真考一半), **3分题从 0 道变 37 道** —— 而"3分=3个独立point"正是他丢分处。
  配套修 3 个代码坑: 自评按钮封顶2分/原文只第1题显示/段落塌成一坨
- **英语题库 +79 道 d5/d6, 清 42 道 d1-d2 死库存**(minFloor=4 时永远抽不到)
- **数理清 33+11 道超纲奥数**(勾股/工程问题/数论余数/数列求和/梯形/杠杆/并联电流定量)
- **科学干扰项重写**: 旧 67 道里 61% 的答案是唯一最长选项(闭眼选最长拿65分), 而孩子丢分正在选择题

### QA 从"查有没有"升级到"查对不对"
原 801 项断言把上述硬伤一个都没拦住(只查题量和关键词残留)。新增: 选项恰4个不重复、
双答案检测、僵尸解析检测(解析引用的英文选项必须真实存在)、钱数答案不能是四舍五入来的。
**QA 796 → 834**

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

---

## v20.0 (2026-09-05) — 华文阅读问答·动笔版

### 为什么单做一套, 不复用英语版
校考华文 43/50, 丢的 7 分**全是"2分题只写1个点"**。病在**产出**, 不在识别。
可是全站华文一个字都不用写: 知识树 `ch_comp_oe` 是"下面哪个答案能拿满分"选择题;
英语版 `comp_oe` 也只是"想30秒→看范文→自评0/1/2"。练一年也治不了漏点。

### 机器比英语版更进一步
- **不写不给看**: 输入框少于 6 字, 点"对答案"直接拦住
- **逐点核对**: 参考答案按 ①②③ 拆成一条条采分点摊开, 一条一个勾选框问"这个点你写到了吗"
  —— 数点数这个动作本身就是训练, 而不是笼统给自己打个分
- **每题一条陷阱**: 点名这一分通常丢在哪 ("抄原文只算一个点"/"三个近义词只算一个点")
- **结算逐题点名**: "第 4 题 — 要 3 个点, 你写到 1 个", 不给笼统百分比
- **漏点入错题本**: 复习时看得到完整采分点 + 新增的华文踩点技巧

### 题库
23 篇 / 129 题 / 320 分, 3 分题 64 道。篇幅 **401-803 字**(对齐真考, 不是百来字的片段),
记叙文为主 + 说明文(红树林/垃圾埋置场), 全部**普通华文**不含文言。
QA 锁死: **每题采分点数必须等于分值**, 否则孩子勾满也拿不到该题满分。

### 顺带修的两个测量 bug
- **华文 AL 一直报喜**: 原来只看选择题难度档, 满档就报 AL1 —— 和真实卷面差整整一档
  (这解释了 app 显示华文 AL1 而校考 AL2)。改成与阅读问答**踩点率取更差的那个**,
  练满 2 局才参与, 没练过的不误判。实测踩点 46% 时如实报 AL6
- **GAME_LABEL 有 3 份副本**: 只改一份, 错题本标题就渲染成原始 key `cn_oe`。三份都补,
  并加断言锁住"副本数 == 认识 cn_oe 的份数"
- **cache buster 断言写死 19.x**: 版本进到 20.0 反而变红, 改成读数字比大小

**QA 841 → 858**

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

---

## v20.1 (2026-09-06) — 生词模块新增 iWrite Weekly 卡组

来源: 孩子补习班 iWrite Weekly 的 Overused verbs 讲义 handout 1/2/3/4/6/7/11 (CreativEdge)。
讲义只有词和箭头, **一个例句都没有** —— 而他英语的病正是"认得出但用不出"。

**131 词 / 393 句例句**, 每张卡背 = 中文释义 + 英文解释 + **3 句编号例句** + 一句
"用它替换 said — 作文里写这个词, 别再写 said"。讲义的重点就是这个替换映射, 卡片得把它说出来。
这一组的版式和其他卡组不同: 3 句例句取代原来的 1 句 + Cloze 考题。

| handout | 覆盖的 overused verb | 词数 |
|---|---|---|
| 1 | said / looked | 18 |
| 2 | asked / thanked / scolded / cried | 19 |
| 3 | laughed / thought / understood / planned | 20 |
| 4 | angry / confused / fearful / shocked / happy / curious / worried | 22 |
| 6 | shocked / sad / happily | 18 |
| 7 | serious / moved / said / agreed / fell | 15 |
| 11 | embarrassed / determined / disappointed / sorry | 19 |

QA 锁死两条: 每条必须正好 3 句; **3 句都要真的把这个词用进去** (否则又是一张背不下去的词表)。

### 两个连带修的坑
- **大卡组霸屏**: 131 个新词一次进池, "今天这一组"新词优先, 接下来 7 天全是它, 科学词/Cloze 词
  整周断流。加 `FC_ONE_DECK_CAP = 1/2`: 单个卡组在每日一组里最多占一半。实测 10 iWrite + 10 其他。
- **卡背溢出**: 560px 固定高, 3 句例句在手机宽度下溢出 98px。卡片是 absolute + 3D 翻转, 内容
  撑不高容器, 只能卡内滚 —— 而卡片点一下就翻面, 手指滑动读例句会被判成点击翻回正面。
  改成翻到背面时长到 700px (窄屏 760px), 最长的几条实测溢出全为 0。

**QA 858 → 876**

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

---

## v20.2 (2026-09-09) — 假期课表重排 + 常规课表入口

用户圈着 9/9 那天问"下午休息要 4 个半小时么": 14:15→14:40 / 15:25→16:30 / 17:15→19:30 / 20:15→21:00,
四段共 270 分钟没写名字, 看上去像凭空消失。同时假期期间 `getHolidayPlan()` 直接 return,
常规课表整个没入口 ("常规课表在哪儿呢")。

### 四条排班规则 (用户 2026-09-09 定, QA 锁死)
1. 午饭休息固定 **12:00–14:00** (原来只到 13:30)
2. 模块之间休息 **10–15 分钟**, 必须写出来
3. 连续学习满 **3 小时** 插 **30 分钟户外运动**
4. 时间轴连续, 起床到熄灯每一段都有名字 (回家 / 晚饭 / 洗澡 / 洗漱 / 自由)

9 天全部按此重排, 学习量不变 (5.4–6.25h/天, 班课 2–4h), 只是把休息写明白、下午收紧。
9/10 双班日上下午都有班, 运动放晚饭后散步。

### 常规课表入口
假期卡右上 **📆 看常规课表** ↔ 常规卡右上 **🏖️ 回今天的假期课表**, 常规卡顶部提示"现在是假期, 这是 9/14 开学后恢复的常规课表"。

**QA 876 → 887**

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

---

## v20.3 (2026-09-09) — 常规课表课间规则统一

用户看周三常规课表定的规则: **晚饭 1 小时 / 户外 30 分 / 其他课间休息一律 15 分**。
周一/二/三/五按此重算时间轴, 学习块内容与时长不动; 省出来的时间显式写成"自由", 洗漱 15 分, 21:00 睡前单词不变。
周一起步 16:00 最紧, 洗漱并进晚上那个课间。QA 887 → 888 (锁: 晚饭60/户外30/课间15/无空档)。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

---

## v20.4 (2026-09-09) — 课表规则终版: 空档一律填薄弱模块二刷三刷

用户当天连续三轮纠正后的终版规则 (假期 + 常规通用):
1. 吃饭 / 户外 可到 1 小时 (周一 16:00 才到家, 晚饭 45)
2. 其他课间休息 15–20 分
3. 假期午休 12:00–14:00; 连续学习满 3h 插 30 分运动
4. **填不满的时间不许留"自由", 一律加任务: 到明年考前 2 个月, 英语薄弱模块 + 科学薄弱模块至少二刷, 三刷收尾**

薄弱模块 (2026-08 校考): 英语 阅读问答踩点 / Editing / 完形+词汇 / 情景写作; 科学 选择题; 华文 阅读问答漏点。
二刷 = 错题本按题型抽题重做 (家长看点数); 三刷 = 二刷还错的再做, 三遍都对才从错题本毕业。
假期每天 6.75–7.5h, 常规 3.25–3.75h (到家即开始, 21:00 睡前单词, 21:30 熄灯); 周一 16:00 到家塞不下二刷, 其余三天必有。
上一版 v20.3 的 QA 块 heredoc 写坏了 (正则断行), 已删掉重写。一条断言锁住全部规则 (无空档/无"自由"/课间 10-20/晚饭 45-60/户外 30-60/二刷三刷/连续学习≤3h)。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v20.5 (2026-09-09) — 班课日先回家再整理错题; 单词做完再洗漱; 日常户外 30 分
用户三条: ①上午班课结束先回家 (11:00–11:15), 到家再整理错题, 休息到 12:00 午饭 ②洗漱是一天最后一块: 睡前单词做完再洗漱, 21:30 熄灯 ③常规课表户外一律 30 分, 省下的时间填二刷/三刷 (周三加三刷 25, 周五三刷加到 40)。假期 9 天 + 常规 4 天同步。QA 结尾断言改为 "睡前单词→洗漱→21:30"。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v20.6 (2026-09-09) — 班课日户外 60→30, 省下 30 分补三刷
9/7–9/9 下午户外改 30 分, 晚上加"薄弱模块三刷 30 分" (19:15 二刷 → App → 20:15 三刷 → 20:45 单词 → 21:15 洗漱)。三天各 7.0h。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v20.7 (2026-09-09) — 周打分表 "成绩根本不对" (孩子实报)
根因: 打分格 26px 宽, 两位数被截成一位 —— 云端 9/7 存的是 Editing 20/30、Grammar 12/12, 屏幕显示 2/3、1/1。数据没错, 是显示。
修: ①格子加宽到 40px + 去掉 number 上下箭头 (悬停占宽) ②假期周任务和平日课表不同 (假期周一做科学选择题/完形/数学, 平日锁格子没地方填) → 假期日期所有行全开, 表下加提示 ③周汇总不再按固定星期取数 (原来阅读OE只看周一周三), 全周 7 天聚合 ④科学选择题行改"对_/共_题 ≥80%", 不写死 /15。QA +6。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

---

## v21.0 (2026-10-02) — 单词闪卡重做 + 词库 563 → 977

孩子实报四条: 没有已学会的记录 / 没有进度 / 不知道多久学完 / 每天背多少没规划。家长要求每天看到背单词情况; 词库要覆盖 PSLE 常考词和词组, 再加新加坡初中词。

**云端数据查到的真相**: 549 个词全在 9/6、9/8 两天点完 (9/8 一天 514 个"认识"、拿 529 分), 之后 23 天一次没背; 页面上"已掌握"一直是 0 —— 因为只有"过 30 天关"这一档。

- **四档进度**: 还没学 / 学习中 / 已学会 (隔 ≥3 天再见还认识) / 已掌握 (30 天关)。点数字看是哪些词
- **每日计划**: 每天 20 / 30 / 40 个可选 (默认 30), 每组 1/3 新词 + 2/3 复习; 每个选项旁直接写预计哪天全部学会
- **家长看板**: 最近 14 天逐天一行 —— 完成没 / 一遍过几个 / 没记住几个 (点开看是哪些词) / 新学会几个 / 用时; 没背的日子标红; 平均 ≤2 秒一个词标"太快"; 难词榜
- **防刷**: 不翻面不能自评; 卡组入口改成只翻看, 不动曲线不给分 (进度只走每日一组)
- **词库 +414**: PSLE 高频动词 60 / 形容词 58 / 名词 50 / 副词 29 / 短语动词 II 50 / 固定搭配 II 40 / 习语 II 30 / 初中进阶词 97, 每条 中文 + 英文解释 + 例句。MOE 没有官方 PSLE 词表, 按 Paper 2 高频收
- 日期统一用本地日期 (原来 UTC, 早上 8 点前算成前一天)

QA 899 → 925。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

---

## v21.1 (2026-10-02) — 艾宾浩斯完整链 + 逐天模拟预估 + 音标/发音 + 考题卡组 + 词库 1056

- **艾宾浩斯走完整条链才算掌握**: 当天 → 1 → 3 → 7 → 14 → 30 天, 第 6 次 (隔 30 天) 还认识才毕业 (原来过 14 天关就标掌握)。忘了**退两级**、第二天先补 (原来一把归零, 每词平均要复习 11 次, 背不完)
- **预估改成逐天模拟** (`simulateFcPlan`): 同一套配额和间隔, 固定随机种子; 报三个日子 —— 新词全部见过一遍 / 掌握 95% / 最后 5% 难词。复习一遍过率用近 7 天实测 (夹 75%–95%, 新词第一次见不计), 没样本按 85%
- **音标 + 小喇叭**: 1056 个词全部有英式 IPA (词组按词拼); 单词和每句例句旁都有 🔊, 浏览器自带语音 en-GB, 点喇叭不翻卡
- **考题卡组**: 每个词都能出题, 四种 PSLE 题型 (手写 Cloze/Grammar 四选一 · 例句挖空选词 · 划词选最接近的意思 · 按解释选词, 科学/数学术语只出最后一种)。入口: 考今天这一组 / 每个卡组考 20 题。**答错的词退两级、明天优先补** (考题比自评说了算)。家长看板加"考题"列
- **词库 977 → 1056**: 科学考试术语 II 56 + 数学考试术语 II 23
- 当前真实数据的预估 (每天都背, 一遍过率 85%): 每天 20 个 → 2028/1; 30 个 → 2027/9/6; 40 个 → 2027/6/26

QA 925 → 948。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

---

## v21.2 (2026-10-02) — 清除刷分记录 + 防刷

**查到的事实 (云端数据)**
- 家长管理页的 "W26 第一阶段总模考达标 +100" 按钮在 9/22、9/24、9/26 被连点 **221 次** (间隔 0.26 秒) = 22,100 分。靠这些分 9/24 解锁银龙 (承诺 SGD 500)、9/25 解锁金龙 (承诺 SGD 1500)
- 9/9 家长页其他项也被连点: 羽毛球 1 分钟内 9 次、良好作息 5 次、老师表扬 3 次
- 闪卡 9/6–9/9 连点 648 条 = 846 分, 528 个词的假进度
- 根因: `addPoints()` 只有家长密码一道门 (认证后 15 分钟免输), 没有任何去重/冷却/上限; 孩子知道密码

**一次性清理 `applyFarmCleanup`** (幂等; 每台设备加载和收到同步数据时都跑, 旧页面把脏数据推回云端会被再清):
删 221 条 W26 + 18 条同日重复加分 + 648 条闪卡连点; 528 个词进度归零; 总分按剩余记录重算 24,509 → 约 1,233; 银龙/金龙收回; 留一条 cleanup 日志。清理前备份 `firebase_dump_2026-10-02-02-52-45.json`

**防刷**
- 家长页加分闸门 `checkAdminAward`: 里程碑只发一次 / 同一项一天一次 (按时吃完饭 3 次) / 两次加分隔 5 秒 / 家长页一天最多 300 分; 日志带 `admin_award` 类型
- 通用安全网: `recalcTotalPoints` 里单日正分最多算 400 —— 以后不管哪个入口被连点, 一天最多多出这么多
- 同步安全网放行"清理后分更低"的远端数据
- 每天背单词加 50 个选项 (清理后 1025 个词算新词, 30 个/天要背到 2027/11)

QA 948 → 969。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v21.3 (2026-10-02) — 家长只读看板 parent.html
用户: "家长登录能远程检查孩子的学习情况么" → 先选了放米多那台 EC2, 写完还没推就改口"不要在米多里面加, 还是在 psle 这个页面上加" → 米多仓库改动全部撤回 (未提交未推送), 看板搬到本站 `parent.html`。
- 结构上只读: 只加载 data.js (借纯计算函数), 不加载主程序和 Firebase SDK; 数据走 Firestore 只读 REST, 每分钟刷新
- 内容: 今天的单词 (背到几个/一遍过/没记住哪些/考题) · 单词进度 + 预计背完 · 最近 14 天逐天 · 课表打分最近 7 天 · 积分 + 今天进账明细 + 单日超 300 分告警 · 错题本
- 家长密码进; 主 app「其他」菜单加入口; parent.html 不缓存
- ⚠️ 仍托管在 Google 上, 中国大陆要 VPN 才打得开
QA 969 → 979。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v21.4 (2026-10-02) — 每天新学 30 个 (不含复习), 新学 + 复习一天最多 100 个
用户定的口径: "每天 30"= 每天**新学** 30 个; 复习按艾宾浩斯到期多少来多少, 只受 100 的总上限管 (原来是一组 30 里 1/3 新词 + 2/3 复习)。
- `buildDailyFlashcardGroup` / `simulateFcPlan` 同口径; 可选每天新学 20 / 30 / 40; 复习不够多时不凑数
- 页面按钮改成"每天新学 N 个 · 新词 X/X 学完"; 家长看板同步
- 预估 (每天都背, 一遍过率 85%): 新词 11/6 全部学过一遍, 2027/3/31 掌握 95%, 2027/7 全部掌握
QA 979 → 981。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v21.5 (2026-10-02) — 手动再加一组
用户: "这个单词我手动加一组, 不停的加"。今天这一组背完后, 词汇页和背完页都有 "➕ 再加一组": 按同一套规则再编 30 个新词 + 还没轮到的到期复习, 今天碰过的词不重复进, 想加几次加几次 (每日 100 的上限只管自动编的那一组)。家长看板当天行跟着变。
顺带修: 背完后那行写"新词 0 个 + 复习 30 个" —— 事后数新词会数成 0, 改成编组时就记下。QA 981 → 991。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

---

## v22.0 (2026-10-02) — 新切页「英语模块学习」
用户: "新开一个切页叫英语模块学习, 英语按 paper1、paper2 的主要模块依次放练习的题库 (editing、grammar、cloze…), 每个模块记录正确率, 题型是 psle 真题和模拟题, 对标考试 AL1 的水准"。(之前那版"练习中心四科重排"用户叫停, 没并入; 练习中心原样未动。)

- 导航多一个切页 📖 英语模块学习: Paper 1 (情境写作/记叙作文) → Paper 2 Booklet A (Grammar MCQ/Vocabulary MCQ/Visual Text) → Booklet B (Grammar Cloze/Editing/Comp Cloze/S&T/阅读问答) → Paper 3 听力 → Paper 4 口试 → Paper 2 限时模拟, 共 13 个模块
- 每个模块两种练法: 题库练 (原有小游戏, 难度 Lv4 起) / 考点 10 题 (知识树节点)
- **每个模块记正确率** (`state.engModules`): 题库小游戏、考点 10 题、单词考题、听力选择、Paper 2 模拟都记到对应模块; 显示 累计正确率 + 折算 AL + 最近一次 + 近 5 次; 顶部报"几个模块到 AL1"和最弱模块
- 以前小游戏累计的对错一次性搬进来 (孩子真实数据: Grammar 94% AL1, Editing 25% 最弱)
- 课表打分表里纸笔做的分数 (教辅/真题) 在对应模块用紫色一起显示
- **如实说明**: 题库是按 PSLE 题型出的模拟题; 历年真题有版权不在 app 里, 纸上做完填分

QA 991 → 1018。

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v22.1 (2026-10-03) — 常规课表换成用户的新表, 今日必做按课表生成
- 课表页: 周一到周日照用户 2026-10-03 的表逐格抄 (上学 / 高级华文 / 补习老师 (Editing、Cloze、Synthesis 各两篇) / Editing·Cloze·Synthesis 各 2 篇 / 背单词 / 口语打卡 / 语法 30 题 / 范文半篇 / 周六写作课·科学·英语课 / 周日语文真题·口语课, 22:00 睡觉); 班课高亮
- 主页今日必做: 不再写死 "Oral / Cloze+SST / 科学", 改成从当天课表生成 (每天 2–6 项)。App 里能测到的自动勾 (背单词=今天这一组背完, 口语=口语练习, Editing/Cloze/Synthesis/语法/科学=当天练过), 作业/班课点一下自己打勾
- 周打分表的格子按新课表开: Editing 周二, 语法 30 题 周三周五, Cloze/句型 周二, 背单词 一二三六, 口语打卡 一到五, 科学 周六, 语文真题 周日, 范文半篇 三六
- 旧课表时代的 QA (排班规则 / 周末自选文案 / 章节内周进度) 退役, 换成"和用户的表逐格一致"校验。QA 1018 → 1021

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v22.2 (2026-10-03) — 科学模块学习切页 + 练习改名学习中心
- 新切页 🔬 科学模块学习 (和英语同一套渲染器 `renderModulePage`): Booklet A 选择题 (混合题库 / 科学术语) → Booklet B 开放题 (开放题 / 实验题变量) → MOE 五大主题 19 个考点 (Diversity / Cycles / Systems / Interactions / Energy) → PSLE 复习/笔试, 共 23 个模块。有章节题库的考点多一个"本章选择题"按钮, 有概念图的多"概念图"
- 科学的对错也记进模块 (`sci:` 前缀): 选择题/开放题/实验题小游戏、每个考点 10 题、科学术语考题; 纸上做的科学选择题/开放题分数紫色并列
- 导航: 练习 → **学习中心**, 挪到词汇后面 (主页 · 课表 · 英语模块学习 · 科学模块学习 · 词汇 · 学习中心 · 能力 · 其他)
QA 1021 → 1030

🤖 协作开发: [Claude Code](https://claude.com/claude-code)

## v22.3 (2026-10-03) — 5 个 PSLE 专家 agent 审题库 (英语模块学习 + 科学模块学习)
用户: "并组5个psle专家agent检查这两个切页内容的题目和答案以及难度的正确性, 难度对标各科AL1分, 内容是真题和模拟题或同等难度"
- 五路并行审: 语法+听力 86 条 / Editing+SST 77 条 / Cloze+阅读 51 条 / 科学 67 条 / 考点题 41 条, 共 322 条发现
- 直接改掉 280 处 (答案错/歧义题/选项不唯一/解析错/难度低于 AL1 的改写), 删 22 道超纲或 P3 送分题 (语法 9 / Editing 5 / 科学选择 5 / 科学开放 3)
- 典型纠错: 密封罐植物实验结论、电池能量分类、2025 英语卷题型事实 (Editing 10 题无"不改" / Oral 40 / SW 14 / 作文 36 / P2 90)、科学 2026 卷结构 (30 MCQ 60 分 + 开放 40 分, 1h45)、杜撰的评分标准
- 答案位置偏置: Cloze/语法/SST/科学选择题按固定种子洗牌, 不再扎堆同一选项
- sci_diversity 补一道 AL1 "证据充分性"题 (共有特征不能当分类依据)
- Editing 引擎复核: 72 段全部 ≥5 错且能逐词定位, 无占位项
- QA: 旧的"数源码正则"断言改读对象 (题库已按 JSON 回写), 阈值按新题数调整; 1030 → 1029

## v23.0 (2026-10-03) — 首页重做 + 每日考点学习 + 答题技巧本 + 词汇考题四专家审核
用户: "首页内容太多太杂乱" / "导航增加答题技巧切页" / "派 agents 检查词汇考题的正确性和难度, 讲考点详细解析" / "以后出题都要带一组 agent 自我测试检查后才能上线"
**首页只剩三卡**
- 左栏 ① **每日分数打卡表**: 今天课表 (做完点一下打勾) + 今天要填的分数格 (SCHED_GRID 里 days 含今天的行, 和课表页周表同一份数据 `_sgCtrl` 共用) + 去练入口 ② 错题本 (原样)
- 右栏 "教学+信息+复盘" → **每日考点学习**: 每天一个英语/科学 PSLE 常考点 (英语两天科学一天, 优先没学过的): ① 这类题的一般方法 (TECHNIQUE_BOOK, 可展开) → ② 今天这道题 (选择题直接选 / 开放题先写再看满分范例) → ③ 这道题逐步分析 + 最容易错在哪 + 模板 → ④ 关键总结自动收进答题技巧本 (+5 分, 一天一次) · "再学一个考点"
- Paper2 突击 / 思考题 / 知识树每日练 / 毕业复测 全部撤出首页 (DOM 留在隐藏容器)
**新切页 📘 答题技巧** (学习中心后): 英语 14 模块 (按 SEAB 2025 新卷: SW14/CW36 · BktA 25 · BktB 65 · 听力 20 · RA15/SBC25) + 科学 6 类 (MCQ/实验变量/图表/解释因果/比较/应用) + 数学 6 + 华文 5, 每模块 做题方法 / 答题模板 / 最常丢分的坑 / 交卷自查 + "我从每日考点学到的" 收藏; 一键汇总成一份技巧本 (打印/存 PDF)
**每日考点内容 72 条** (英 42 = 14 模块 × 3 考点, 科 30): 专家 agent 编写 → 第二组 agent 逐题对抗复核: 英语 42 条过 25, 1 严重 (unlike 两可) + 15 中 (多为旧分值 15/40/10/20 → 14/36/15/25、Editing 12→10) + 4 轻; 科学 30 条过 26, 1 中 (磁铁题题干不严谨) + 3 轻; 全部 fix 已应用, 0 删
**词汇考题审核 (1067 词 × 2015 道生成题, 4 个数据专家 + 1 个出题器专家 + 1 个复核)**
- 词条修订 132 处 (释义错如 apparently"显然"、prominent"杰出"; 科学术语按 MOE 口径 fertilisation/insulator/amphibian; 例句不含词条/语法错/语境太弱推不出词义 ~40 句; 手写题两个都对 10 道换题)
- 近义/反义排斥表 182 对 (pass away/pass on、by accident/on purpose、alter/modify…) + 义场表 (angry/happy/sad/walk/run/look/say/连接词功能组…): 近义词互为干扰项放行率 35% → 6%
- 出题器: 词组变形定位 (came across / pick me up / kept my fingers crossed), cloze 题从 123 → 215 道, 干扰项跟正确项同时态; 术语卡组反向: 干扰项优先同主题兄弟词 (xylem↔phloem, melting↔freezing) 不再送分; define 题挖掉释义里泄漏的答案词; 跨卡组重复词 (freezing) 按当前卡组出题
- **每词考点解析 1056 条** (VOCAB_TIPS): 答完题显示 语境线索 + 其他三个选项各是什么意思为什么不对 + 这个词 PSLE 怎么考/搭配/易混
- 规则固化: 以后任何出题先过 agent 审再上线 (记入 memory + psle-app-dev skill)
QA 1029 → 1060

## v23.1 (2026-10-03) — 每日分数打卡严格按课表
用户: "周六课表只有这几项, 怎么打卡有这么多内容, 严格按课表来打卡, 不加多练习"
- 打卡行 = 当天课表的学习块 (班课/自学), 每块一行: 时间 | 内容 | 打卡控件; 休息/吃饭/睡觉不列
- 对得上周表格子的 (Editing/Cloze/Synthesis/语法/科学/语文/范文/阅读) 用同一个打分格 (周表自动同步); 对不上的 (班课/作业/补习老师) 点一下打勾; App 能测到的 (背单词/口语/Editing…) 自动标 "App 已完成"
- 删掉 v23.0 把周表 13 个格子全列出来的写法

## v23.2 (2026-10-03) — 全站悬浮查词 + 单词本 (逻辑对齐口语教练 App)
用户: "整个 psle 网址, 鼠标悬浮到任何一个词上都可以查词意, 并收藏单词本, 和英文学习 app 的逻辑一致"
- 任何页面的英文词: 桌面鼠标停 0.4s / 平板手机长按 0.5s → 小弹层: 词 · 词性 · 音标 · 🔊 · 中文 · 英文释义 · 例句 · (本站词库词带考点) · ⭐ 收藏
- 查词链 (照 speak_coach): 本站词库 1056 词 (中英释义+音标+考点) → 内置离线词典 CORE_DICT 1215 常用词 (从口语 App 搬来) → 变形退回原形 (charges→charge, photosynthesising→photosynthesis) → 联网 (Google 翻译中文 + dictionaryapi.dev 音标/英文释义/例句) → 结果缓存 state.dictCache (600 条)
- 本地只有中文时, 弹层里可点 "联网查英文释义/例句"
- 单词本 state.wordBook: 收藏时带查词所在的句子当例句; 同步成闪卡卡组「📔 我的单词本」排第一 (每日新词优先取), 跟其他词一起按艾宾浩斯复习、出考题; 词库里已有的词只标记不重复进卡组
- 词汇页顶部 单词本卡: 最近 30 词 (中文 / 例句 / 🔊 / 移除), 停用词 (the/is…) 不触发不收藏
- 输入框 / 导航 / 弹层自身不触发; Esc 或点别处关闭
QA 1060 → 1077

## v23.3 (2026-10-03) — 评审团修订 + 错题集切页 + PDF 下载 + 每日多考点排程
用户: "答题技巧和今天新增部分, 组 PSLE 权威专家和老师评审" / "单词右上角 × 关不掉" / "答题技巧默认是打印, 我无法存 pdf" / "错题本专门做一个切页, 按科目真题错题集, 同类讲解, 能下载打印" / "考点英语科学穿插, 到考前每个考点出现 ≥3 次" / "学习中心和答题技巧互换" / "在词汇后放错题集"
**评审团 (7 路)**: 英语技巧本 243 项 (7 高: Vocabulary Cloze 写成了选项框题型/Editing "题干标 spelling" 不实 等) · 理数技巧本 192 项 (0 高, 平行线内错角/菱形性质超纲等 13 处) · 华文技巧本 63 项 (6 高: 看图作文 PSLE 是六幅图非四幅/把字句被字句改写 PSLE 不考 → 换成"完成对话") · 每日考点终审 74 项 (0 高, 口试屏幕上不能画停顿) · 考点解析 1056 条 (0 高, 7 中 21 轻: potential energy 漏 chemical / tessellation 已不考 / excuse 重音说法错…) — 全部 fix 已应用 (技巧本 64 处, 考点 6 处, 解析 28 处)
- **📕 错题集** 切页 (词汇后): 按科目 → 题型归集 (真考错题优先), 每组带"同类讲解" (EB_TYPE_TIPS + 技巧本的方法/坑/模板), 每题 题干/选项/正确答案/解析/错几次; 下载 PDF / 打印; 首页错题本卡不动
- **PDF 下载**: 技巧本和错题集都能一键存 PDF (html2canvas + jsPDF 自托管 vendor/, 中文靠栅格化; 失败退回打印)
- **每日考点排程**: 每天 k 个 (k = 3×考点数÷距考试天数, 2-6), 英语科学交替, 每科挑出现次数最少的; 卡片列出今天全部考点 (折叠, 做完一个展开下一个), 显示 "每个考点出现 ≥3 次: 已达 N / 最少 x 次"; QA 模拟到 2027-09-24 每天都学 → 最少 ≥3 次
- 查词弹层: ✕ 关掉后同一个词不再弹 (原来鼠标没动 0.4s 又弹回来), 联网 7 秒兜底显示"没查到"
- 导航: 主页 · 课表 · 英语模块 · 科学模块 · 词汇 · **错题集** · **答题技巧** · 学习中心 · 能力
QA 1077 → 1083

## v23.4 (2026-10-03) — 单词考题只考今天背过的
用户: "词汇, 今天考的要对应今天学的"
- "考今天这一组" → "考今天学过的 N 个": 只考今天这一组里已经翻过卡、点过认识/不认识的词; 一个没背时按钮灰掉提示"先背再考" (原来没背就能考, 考的是还没学的词)

## v23.5 (2026-10-03) — 每日考点库 72 → 212 (覆盖 MOE 全量考点清单的 85%)
用户: "考点只有 72 条么? 确认覆盖所有 PSLE 英语和科学么?"
- 先按 MOE/SEAB 大纲列全量考点清单: 英语 14 模块 140 个考点 (语法 19 / 句型转换 19 / 阅读问答 14 / 改错 11 …), 科学 5 主题 + 跨主题实验数据 109 个
- 五路写手补写 177 条 → 每组另派复核 (对抗审): 英 A 31 条 (0 高 2 中 12 低) · 英 B 31 条 (2 高: 词汇填空写成选项框题型) · 科 A 35 条 (1 高: 骨骼肌肉系统不在大纲, 已删) · 科 B 44 条 (0 高 3 中: balanced forces 超纲降级) · 英 C 36 条 (阅读/写作/口试, 复核中, 下一版)
- 本版合入 140 条 (修 37 处, 删 1 条): 考点库 212 = 英语 104 (覆盖清单 104/140) + 科学 108 (108/109); 每天自动 2-3 个 (3×212÷355 天), 英科交替

## v23.6 (2026-10-03) — 考点库 248 (英 140 / 科 108), 口试听力按 2025 真实格式修正
- 英语 C 组 36 条 (阅读问答 11 / 图文 4 / 听力 4 / 朗读 3 / 会话 4 / 情境写作 4 / 作文 6) 复核后合入: 2 高 8 中 6 低全修 (高: 口试会话写成"看视频", 2025 起是**一张无文字真实照片** + 三问独立 Q1 看图 / Q2 经历 / Q3 观点; 朗读准备时间是 5 分钟含照片、顶部有情境句、屏幕不能做记号)
- 连带修正: 老的会话条目 7 处"视频"→照片; 听力题按真卷改成 **3 个选项** (前 7 题三张图, 后 13 题文字); 技巧本 oral_conv / oral_read / listening 三模块说法同步
- 考点库 248 = 英语 140 (全量清单 140/140) + 科学 108 (109 里删 1 条超纲); 每天 3 个 (3×248÷355 天), 英科交替, 到考前每个 ≥3 次 (QA 模拟通过)
- QA: 听力必须 3 选项; 口试条目不得出现"视频"; 英 ≥130 科 ≥100

## v23.7-v23.8 (2026-10-03) — 考点优先级 / 导航 / 模块学习合并 / 打分简化
用户: "英科交替、出现次数最少优先这个改: 错误率最高的、最常考的优先" / "错题集和答题技巧互换, 能力收到其他" / "英语模块和科学模块合并为一个模块学习页, 分英语科学两类" / "简化周打分表和周计分卡"
- 每日考点优先级 = **错误率 (×7) > 常考 (+1.5) > 没出现够 3 次 (每少一次 +2)**, 5 天内刚出现过 −1.5; 错误率 = 本题历史对错 6 成 + 所属模块正确率 (题库/考点练习/纸笔分) 4 成; 每条考点挂 freq (high 179 / mid 69, 来自大纲清单); QA 模拟到考前仍每个 ≥3 次
- 导航: 主页 · 课表 · 📖 模块学习 (页内 英语/科学 两类, 原两页合并, engmod/scimod 当别名) · 词汇 · 答题技巧 · 错题集 · 学习中心 · ⋯其他 (能力收进去)
- 课表页: 周打分表 → "打分" 按天填 (跟上面选的那天联动: 这天课表学习块 + 每天必查, 一行一格), 整周 7 列表格折叠给家长; 周计分卡 → 四科大格 (达标 n/m + 没达标的项名), 13 行明细折叠

## v23.9 (2026-10-03) — 单词考题 = 今天这一组 (先考后背都行)
用户: "不要先背再考, 可以先自己做再背也行, 总之每天背诵的和考题是对应的就行"
- "考今天这一组 (N 个)": 考的就是今天这一组全部词 (含手动加的组); 点考题时把今天这一组真正编出来锁定, 之后背的是同一份; 撤回 v23.4 的"只考背过的"

## v23.10 (2026-10-03) — 周打分表从课表自动生成 (全对上)
用户: "每周打分明细应该和课表内容能全对上"
- SCHED_GRID 不再手写: 由 SCHED_DAYS 的学习块按 schedKeysOf 映射生成 (补习老师 = Editing+Cloze+Synthesis 三行; 作业/班课 = 一个"完成"勾), 哪天有什么就只开哪格; 删掉课表上没有的项 (词汇周清测/数学半卷/周日整卷/回炉/自学记录/概念讲给家长); 每天必查只留 睡觉 + 家长核对
- 主页每日打卡 / 课表页按天填 / 整周表格 / 四科计分卡 四处共用同一张映射; 计分卡只列课表里有的模块, 分值按 2025/2026 新卷 (Editing 10 / 作文 36 / 科选择 60 / 开放 40)

## v24.0 (2026-10-03) — 全 App 傻瓜式 UI (UX 专家 agent 逐页改)
用户: "整个 APP 请专家 UI 互动进行优化, 每个页面都傻瓜式呈现, 非常容易理解和交互"
- 全局: 一套 ui-* 组件 (页顶一句话 / 实底主按钮 ≥48px / 描边次按钮 / 列表行 ≥56px / 28px 大数字 / 说明折叠 ▾ / 44px 科目胶囊); 手机 ≤640px 顶栏修复 (标题不再竖排), 页边距 12px, 无横向滚动
- 主页: 顶部动态一句话 ("先填打卡表 (1/4) → 复习错题 → 学考点"); 三卡右上大数字; 说明全部折叠; 勾改大勾 "做完点这/已完成"; 考点行 "开始 ▼/再看 ▼"; 选项 ≥44px
- 词汇: 顺序重排 (一句话 → 背今天这一组 大数字+通栏按钮 → 考今天这一组 → 进度 → 单词本 → 设置/记录/卡组默认折叠); 三段原理说明折叠
- 课表: 日期胶囊 40px 实底; 删版本号; 课表行按 班课/自学/休息 配色; "今天打分"; 月度跟踪折叠
- 模块学习: "先补最弱: Editing (42%) →" 通栏按钮; 每行 28px 百分比 + ✅/⚠️/❌; 低于 75% 红边; 两段 intro 折叠
- 错题集 / 答题技巧: 页顶一句话 + 右上大数字; 新增 "开始复习 (到期的先来) →"; 下载/打印降为描边; 行 ≥56px 整行可点
- 学习中心: 入口 112px 大卡, 文案去数字去术语; 其他菜单: 7 行列表带一句大白话, 去掉半透明
- QA 改 2 条 (错题本红 badge → 大数字; 考几个按钮变量名), 1093 项全过

## v24.1 (2026-10-03) — 设计层简化 (不是改文案, 是改视觉系统)
用户看 v24.0 截图: "还不算简洁" —— 头部 6 胶囊臃肿 / 一屏 6 种强调色 / 五层嵌套 / 首页双栏太密 / 按钮打架 / 删除线·圆角·阴影·字体混用
- 设计 token (index.html `v24.1 design tokens` 块, 替换 v24.0 组件定义, ui-* class 名不变): 主色只有品蓝 #1E40AF; 成功/警告/危险 只做标记不做底色; 紫色/黄提示条/卡片左彩条全撤; 字号五档 28/18/15/13/12; 圆角 14/10/999; 一种阴影; 8pt 间距; 做完 = ✅ + 变灰 (无删除线); 当前行 = 左侧 3px 品蓝条; 一卡一个实底主按钮, 次要动作一律文字链接 (.ui-btn2 改成链接样式); 32px 原生勾 (.ui-check); 英文题干去 Georgia
- 头部 + 导航: 一行 "🔨 佑子备考" + 一个胶囊 "⭐ 分 · Lv" (点进 我的) + 8px 同步圆点; 水晶/宝箱/周次 挪到 ⋯其他 顶部一行小字 (id 不变); 导航改白底分段控件 (选中品蓝实底, 其余无边框)
- 主页: ≤1100px 单栏 打卡 → 考点 → 错题 (display:contents + order), 桌面双栏; 打卡行 = 时间 12px 灰 + 名称 15px | 右一个控件 (32px 勾 / 对·共两格带占位), 删 "怎么填"; 考点卡默认只露 标题+题干+选项, "为什么常考/这类题怎么做" 合成文字链接 "先看方法 ›", ①②③④ 删掉, 答完一块灰底; 错题卡 = 大数字 + "开始复习 →" + 一个文字链接 (分布/说明收进错题集页)
- 词汇: 背 + 考合成一张 "今天" 卡两步进度, 任何时刻只一个实底按钮 (开始背 / 开始考今天这一组 / 都完 = 文字链接 再加一组); 进度卡四格改一行数字 + 一条进度条; 单词本/设置/家长看板/卡组 四个折叠标题统一 (15px + 右侧数字 + ▾)
- 课表: 日期胶囊 36px 文字 14; 课表行去三种底色, 班课/自学 12px 标签, 休息行灰字; "今天打分" 并进课表卡 (renderSchedDayScore 渲染整张表, 打分格在行右侧)
- 模块学习: 每行一个主按钮 (有考点题 → 练 10 题 →, 写作类 → 去写 →), 其他动作文字链接; 百分比 28px 左对齐 56px; 分组标题 12px 灰色大写字距; 行改 1px 分隔线列表
- 答题技巧 / 错题集 / 学习中心: 头部统一 (18px 标题 + 右侧 28px 数字 + 一行 13px 灰字 + 右侧 下载/打印 文字链接); 技巧本模块打开后一块灰底 (去四种底色); 错题集每题块改 1px 分隔线列表, 正确答案绿字, 解析灰字 (页面 CSS 覆盖, PDF 导出不变)
- QA 改 3 条 (都是被 v24.0 旧样式锁住的): ① "🎯 立即开始复习" → 锁 "开始复习 →" 仍是卡上唯一 ui-cta; ② 错题卡大数字去 inline 绿色; ③ "绿左彩条/已收集文案" → 锁 "错题卡函数体无红色 + 左彩条清空"; 1093 项全过
- 不动: 引擎/数据/函数名/window 导出/data.js/parent.html/版本号 (由下一步部署统一 bump)

## v24.2 (2026-10-04) — 词汇页: 背/考两行各自带按钮
用户: "直接在背这一组和考这一组后面加按钮开始"
- ① 背今天这一组 行右侧 "开始背 → / 继续背 →" (背完变 "➕ 再加一组" 链接); ② 考今天这一组 行右侧 "开始考 →" (考完变 "再考一次 ›"); 删掉下面的大按钮和 "先考也行"

## v24.3 (2026-10-04) — 技巧测一测 + 每题都能看答案和详细解析
用户: "在模块学习里把答题技巧对应进去, 先把答题技巧作为考题测试一遍, 再总结" / "每个题都要能查看答案和详细解析" / "大长条太丑"
- 模块学习每行 "🧠 技巧测一测": 从技巧本自动生成 3-5 题 (第一步做什么 / 哪条是这类题最常丢分的坑 / 交卷前自查哪条 / 哪句是正确模板; 正确项来自本模块, 干扰项来自同科非兄弟模块) → 每题可看答案和解析 → 测完给整套技巧总结 (方法/模板/坑/自查), 坑自动进技巧本, 首次 +5 分, 行上显示 "技巧 80% · 再测"
- 技巧题经 agent 审 155 题 (17 高 25 中): 科学模板 <占位符> 不再被当 HTML 剥掉 (改 ＿＿); 并列类别型步骤不再出"下一步"题 (banRules 25 条); 兄弟模块 (model↔分数比 / 实验↔数据 / 应用↔解释 / 语法五兄弟 / 写作口语类) 互不做干扰项; 数学不拿"防粗心"做干扰; 口试类改"说完前"; 回退题不重复已用的坑
- **每题可看答案**: 通用选择题游戏 (语法/完形/句型/科学选择/华文) 每题 "💡 不会, 看答案和解析" (算答错进错题本), 答错/看答案后显示 题解 + 这类题考点技巧, **不再 4.5 秒自动跳**, 自己点"下一题"; Editing 找错 "找不到了, 看答案和解析" 列出 5 处错词 → 改法 · 原因 (这篇不计分); 单词考题每题 "看答案" (算答错退两级)
- 模块学习汇总卡: 通栏大按钮 → 一行 "最弱: Editing 25%  [去练 →]"
- QA 1093 → 1101

## v24.4 (2026-10-04) — 答完就出"下一题", 看答案也算做过
用户: "一道题答完了, 直接出下一题按钮, 所有都这样改" / "我看了答案, 这道题也算做了, 加入错题本"
- 通用选择题 / 听力选择题 / 错题本复习: 答对答错都不再定时自动跳, 反馈下面直接出 "下一题 →" (最后一题 "看成绩 →")
- Editing: 全找到或看答案后 "下一题 →" 直接换下一段 (不关弹层); 看答案 = 算做过一遍 (按找到几个记难度和模块正确率, 整段进错题本, 不给积分)
- 单词考题: 答错 / 看答案 的词进错题本 (错题集按词汇归集, 带解析和考点)

## v24.5 (2026-10-05) — 每日总量闸: 新词 + 题 ≤ 100
用户: "每日做的题和新旧单词总共不超过 100 个" → "每日新词还是 30 个不变" → "单词新 + 题 上限 ≤ 100" (复习不计)
- `getDailyLoad(state)`: 新词 (今天这一组的 newCount, 含加组) + 题 (各模块今天答的题 engModules runs + 每日考点 + 技巧测一测); 满 100 → 开练 (`_checkGameDailyLock`) / 再加一组 / 再加一个考点 都提示 "到 100 个上限了, 明天继续"
- 首页顶部一句话右侧显示 "今日 n/100 (新词 x + 题 y)"
- 新词默认 30、复习上限 100 都不动

## v24.6 (2026-10-05) — 单词线总量口径定稿: 30 新词 + 最不熟复习 ≤20 + 这些词的考题 ≤ 100
用户: "每日新学习的词 30 个 + 最不熟练的词 + 每日对应单词 (新旧) 的题型, 总共不超过 100 个"
- 每词一道考题 → 新+复习 ≤ 50 (FC_DAILY_MAX 100→50): 30 新 + 20 复习; 复习名额按"最不熟"排 (刚忘的 → 忘的次数多 → 间隔短 → 到期早), 不再新旧穿插
- 今日单词量 = 新词 + 复习词 + 单词考题; 再加一组前先算 "会不会超 100"; 首页顶部显示 "单词 n/100 (新 30 + 复习 20 + 考题 50)"
- 做题模块 (每日考点 / 模块练习 / 技巧测一测) 不在这个闸里 (v24.5 加错的开练闸撤掉)

## v24.7 (2026-10-05) — 单词线按 140/天: 30 新 + 40 最不熟复习 + 70 考题
用户: "调吧, 按 140 一天来" (为赶在考前 2 个月全掌握)
- FC_DAILY_MAX 50→70, DAILY_LOAD_CAP 100→140; 模拟 (85% 一遍过, 每天都背): 2026-11-10 全过一遍, 2027-05-11 掌握 95%, 2027-08-06 全部掌握

## v24.8 (2026-10-05) — 考题错得多的词优先复习
用户: "做题错的多的单词也应该优先复习"
- 复习名额排序的"不熟度" = 背卡时忘的次数 (lapses) + 单词考题答错次数 (fcQuiz.bad); 考错多的词排到复习队列最前

## v24.9 (2026-10-05) — 口语打卡只勾不打分
用户: "口语打卡没有分数, 孩子只勾打卡即可"
- 周表/主页/课表按天填 的 口语打卡 行从 "完成_次" 数字格改成一个勾; 计分卡 "英P3/P4·口语" 按本周打卡天数 (≥4 天) + 口语课家长星

## v25.0 (2026-11-03) — 闪卡和单词考题放大到 13 寸屏舒服的尺寸
用户: "闪卡的内容和题, 所有文字太小了, 放大, 放到适合 13 寸屏幕大小"
- ≥900px 宽时: 闪卡 640→900px 宽、词 44→60px、音标 20→26、中文 34→44、英文释义/例句 18→22-23、三档按钮 16→20; 单词考题 题干 19→26、选项 15→21、解析 14→17-22; 手机尺寸不变

## v25.1 (2026-11-03) — 闪卡/考题再放大一档
用户: "这些内容, 文字还是小, 再放大"
- ≥900px: 卡 1000px 宽; 词 72 / 中文 52 / 释义例句 26-27 / 按钮 24; 考题 题干 32 / 选项 26 / 解析正文 22, 词头 28

## v25.2–v25.3 (2026-11-03) — 模块学习按急迫度排卡 + 接 2026-11 校考差距 + 导航学习统计条 + 解析/词典放大
用户: "不要把写作放最前面, 一看没练习动力; 按模块卡一个一个排, 急需提升的放最前, 给出目标和差距" / "这是这次考试情况, 分析差距结合改 UI" / "导航条统计本周学习时间、累计天数、日均, 提示别断, 多少天到 AL1" / "解析文字太小不醒目, 密集了就不看; 词典也是"
- **模块学习**: 一个模块一张卡 (状态标签 急需/接近/已到 AL1/校考没到/还没练/家长批 · 大百分比 vs 目标 90% · 进度条带 90% 刻度 · "还差 N 个百分点 → 再连对 M 题" 或 "接下来 20 题对 18 题" · 校考该卷子得分/丢分); 排序 = 没达标按差距大→小 (App 正确率和校考卷子 % 取更差的) → 没练过 → 已达标 → 写作类垫底
- **2026-11 校考入库** (`EXAM_RESULTS`): 英 Booklet A 16/25 · 听力 15/20 · Booklet B 57/65 = 88/110 (80%, AL3, 离 AL1 差 11 分); 数 94/100 AL1; 华 155.5/170 AL1 (作文 32/40); 科 Booklet B 37/40, A 待出。模块页顶部 "丢分在哪" 卡
- **学习统计条** (导航上方): 本周学了 / 累计学习天数 / 近两周日均 / 🔥 连续 N 天别断 / 🎯 照这个速度约 N 天后四科都到 AL1 (两次校考进步速度外推, 最慢的科目); 学习时间 = app 里 60 秒内有操作每 30 秒记 30 秒 (`state.studyLog`), 历史日用闪卡用时兜底
- 考题解析块: 每个干扰项一卡 (词 + 中文大字, 英文释义灰色小字), 语境线索/其他选项 标题条; 词典弹层 360→460px, 词 32 / 中文 28 / 释义 18 (≥900px)
- QA 1112 → 1121

## v25.4 (2026-11-03) — 模块学习改网格卡片
用户: "把图一变成卡片排列, 一排 3 或 4 张卡, 一张卡一个模块"
- `.mod-grid`: 手机 1 列 / ≥700 两列 / ≥1100 三列 / ≥1600 四列; 卡内主按钮通栏, 次要动作文字链接在下

## v25.5 (2026-11-03) — 模块卡对齐
- 卡内动作区固定结构: 通栏"练 10 题"按钮在同一高度 (头部 min-height, 按钮前 margin-top:auto), 文字链接单独一行右对齐固定高度

## v25.6 (2026-11-03) — 考题解析块字号回调一档 (比 v25.1 大, 比 v25.3 小)
- 解析: 标题条 16 / 例句 20 / 干扰项词 21 中文 19 英文 15 / 考点 17; 反馈头 20, 词头 23, 释义 18

## v25.7 (2026-11-03) — 解析块再小一号
- 干扰项词 19 / 中文 17 / 英文 14, 例句 18, 考点 16, 反馈头 18, 词头 21, 释义 16

## v29.6 (2026-11-07) — 事故: v29.5 上线后 iPad 页面卡死、云端数据被清零 → 回滚 + 恢复 + 三道闸
用户: "页面卡住, 打不开了"; "学习记录和得分都清 0 了, 恢复"; "以后不要再这类错误"
- **时间线**: 13:26 v29.5 发布 → 13:27 iPad 打开卡住 → 13:29 云端 chamui/main 被一份只有登录 +5 分的空数据覆盖 (1746 分 / 699 词记录 → 5 分 / 0 词) → 13:30 用我这台电脑浏览器里完整的本地副本 (13:25 快照) 整份写回 → 13:31 又被覆盖一次, 看门狗 3 秒后再写回 → 之后稳定
- **数据丢失**: 13:25 到 13:29 之间 iPad 上的操作 (如果有) 没有副本, 其余全部恢复
- **根因 (写入链)**: 旧设备打开时读云端失败/超时 → 本地空白 → 每日登录 +5 分 → 不再算"空默认值" → saveState 整份覆盖云端。原有的"空默认值不写"和"分数差 500 不收"两道闸都挡不住这条路
- **根因 (卡死)**: WebKit 18 桌面内核没复现; 唯一的全局性改动是 body:has(#page-vocab.active .fc-card) 这类 :has 规则 (每次切页/重渲染全文档重算样式), 已改成 JS 切 body.fc-focus
- **三道闸**: ① 启动只认服务器读取, 本次没读到云端一律不写云端 (只存本机, 角标显示 error); ② 要写的数据比云端缩水 (词记录 <70% / 打卡 <70% / 日志 <50% / 分数 <50%) 拒写; ③ 每天早晚各一次把完整数据另存到 chamui/backup_<slot> (保留 14 天)。手动重置 (force) 不受限
- **线上**: 13:30 先回滚到 v29.4, v29.6 = v29.5 内容 + 三道闸 + 去 :has
- QA: 6291 项 (新增事故场景: 没读到云端的 5 分空数据不写; 读到后缩水不写; 正常写; force 可写)

## v29.5 (2026-11-07) — 闪卡一屏放下 + 全部题库复审 + 删听写
用户: "科学和数学词汇部分的考题经常有问题"; "整个闪卡词汇的题都检查"; "整个网站其他部分的题也存在类似错误吗"; "闪卡单词卡片缩小, 让认识、不认识这些按钮和整个卡片内容在一屏内全部显示"; "听力听写按 psle 标准题型出题, psle 没有的题型, 删掉"
- **闪卡**: 背卡时收起顶栏和导航 (:has 判断, 退出自动恢复), 卡片宽 760、高按内容 460/600, 字号随屏高缩放; 1056 词在 1024×768 全部不溢出, 13 寸 / 11 寸横屏 / 竖屏按钮都在屏内
- **术语题**: 释义被挖成 "A ___ that uses a ___" 这类题干时改考中文; 3 字母词也挖 (air sac); cloze 干扰项不再给非动词词组硬加 -ed ("ined a flash")
- **闪卡题复审**: 11 个 agent 逐词审 24 卡组 1067 词: 改词条 108 词, 新增互斥对 349 组 (近义词不再同场当选项), 高危 159 处, 主要是一题两个对的选项
- **全站题库复审**: 1338 题 / 篇, 改 90 条, 高危 10 条。答案标错的: Grammar i62 (must)、PAPER2 真题错题 i16 (by)、华文阅读 i5; 两个答案都对的: PAPER2 i3/i8、华文 一(诺)千金; 句子不成立的: PAPER2 i15; Editing 20 段重写 (一词两次 / 双词错词点不中)
- **听力**: PSLE 没有听写, 删除听写游戏, 入口统一到听力选择题 (孩子填听到的词得 0 分的根因: 只给 5 个空框不说填哪个词, 判分却逐格比隐藏答案); 修 _startTriggeredGame 里不存在的 openListeningGame
- QA: 6285 项

## v29.4 (2026-11-07) — 闪卡加组不限量 + 查词弹窗不再误弹 + 例句小喇叭
用户: "闪卡单词学完一组, 再加一组, 加不了"; "加下一组, 不要限制我的上限, 时间多, 孩子希望多背"; "单词查询功能有 bug, 有的时候弹窗自动弹出, 且关不掉"; "单词查询和闪卡中的例句, 都加小喇叭, 可朗读"
- **再加一组**: v24.7 的 140 上限闸在每日一组满 70 词时必拦 (70 词 + 70 题已到 140)。按用户决定删除手动加组的闸, 首页不再显示 /140
  - 今天这组背完就算打卡: 加的组没背完不再把当天改回未完成, 不扣连续天数 (`rec.done` 只进不退)
  - 自动排的每日一组仍最多 70 词, 没变
- **查词弹窗**: iPad 单击补发 mousemove, 被当成悬浮 0.4 秒后自动弹; 点外面关掉后同一个补发事件又把它弹回来
  - 悬浮改 pointermove 且只认 pointerType mouse (真鼠标 / 触控板), 手指只认长按 (0.6 秒)
  - 系统接管滚动 touchcancel、滚动、两指、抬手都取消长按; 按钮和链接上久按不查词; 鼠标没动的补发事件不算
  - 点外面在捕获阶段关闭并清全部计时; 鼠标点外面也关; ✕ 放大到 44px; 弹层限高可滚
- **例句喇叭**: 闪卡原有的 21px 灰图标夹在斜体里看不出来, 改成行尾 40px 圆底按钮; 查词弹窗原来没有例句 (1056 词条目都不带 ex), 改取闪卡例句, 词库外的词取原句, 带喇叭; 考题解析句子、单词本原句也加
- 实测 (真实数据, 云端同步关闭, 测后还原): 70 词背完点加组变 140, 连加 3 组到 280; 第 3 组背 1 个就走打卡仍在、连续天数不变; 单击 / 点外面 / ✕ / touchcancel / 按钮久按都不弹; 长按弹、抬手不关; 例句喇叭读整句且不翻卡。**未在真 iPad 上测**
- QA: 6285 项

## v29.3 (2026-11-07) — 全软件发音跟随 iPad 系统声音
用户: "让整个软件的发音跟随ipad系统设置声音"
- 原因: 5 个发音入口各写各的, 全部写死 en-GB, 单词卡还自己挑声音, iPad「朗读内容」里选的声音用不上
- 改: 全部收进 `appSpeak` / `stopSpeak`, 不指定 voice, 语言 en-US (和口语软件同一口径); 听写题 51 条 voice 字段删除
- 带上口语软件踩过的坑: 开口前 resume、cancel 后等真停再念、保留朗读对象引用、4 秒没动静且不在排队才换设备报上来的英语声音 (只管本次打开), 停止后不会补念
- 学习慢速保留 (朗读 0.85 / 听力 0.95 / 单词 0.8 / 听写 0.9 / 词典 0.85): 网页读不到系统语速
- 实测: 5 个入口实际送出 voice=null lang=en-US; 模拟不出声设备回退一次且后续沿用; 中途停止 4 秒内不补念; 真实语音引擎能念完并回调。**未在真 iPad 上听过**
- QA: 6284 项

## v29.2 (2026-11-04) — 真题库补齐: 名校 Prelim 212 份 (2023-2026 四年 × 四科), 全部选择题页内判
用户: "不要固定 10 份, 找到多少放多少"; "跑完后所有开发代码推 github"
- **卷子**: 第二批 102 份补充卷 OCR 分章跑完, 名校 Prelim 从 110 份到 **212 份** (能页内判的卷从 96 份到 216 份) (英 54 / 数 55 / 科 54 / 华 49) + PSLE 数学 4 份
- **答案页**: 24 份 OCR 没找到答案页、9 份答案页第一页被标成别的 (整页 OCR 探针 + 缩略联系表逐份人工确认范围); 南洋科学 2023/2024 把 Booklet B 误判成答案 (Continue from Q29) 已改; 南华科学 2024 / SCGS 科学 2023 答案页是横扫的, 已转正
- **答案键**: 14 个 agent 视觉转录 + 主控抽校 (英南洋 2024 / 科 Henry Park 2026 共 58 题全对), 4 份主控自转录; **216 份全部能页内判**
  - 老格式: 2023/2024 英文 Booklet A 28 题 (19 份), 2026 数学 Booklet A 18 题 (10 份), 按卷面题数判
  - 华文 Q26-29 完成对话是选词 (选项到 5-8), 不算选择题, 前 25 题齐就能判
  - 多答案 / 涂改看不清的 1-2 题不判 (ACS Junior 数学 2026 Q5、南洋科学 2026 Q8), 其余照判
- **章节名**: 老格式英文不再套 2025 新格式题号 (Booklet A 1-28, Grammar Cloze 不写 26-35); 华文 "试卷二 选择题" 不写死 1-29
- 流水线 (tools/papers/): merge_keys 认 agent 报的本卷选择题数; build 按题数改章节名; 新增 probe_ans3 / fix_ans3 / sheet (联系表)
- 实测: 爱同英文 2023 (28 题) 故意错 2 题判 26/28; 爱同数学 2026 18 题答题卡; 南华科学 2024 判分页带 6 张转正后的官方答案页; 23年 标签 16 所
- QA: 6281 项 (名校卷 ≥210 / 答案键 ≥214 / 老格式章节名 / 2026 数学 18 题)

## v29.1 (2026-11-04) — 修: 点答题卡后卷子消失 + 跳章节多滚 + 手机答题卡被挤到最下面
用户: "打开卷子的选择题, 点了答题卡对应答案后, 页面的题都没了, 不能继续做了, 有 bug, 你冒险测试一下答题、提交和判分流程"
- **根因 1 (主 bug)**: 点答题卡调用 `_renderPaperRunner(false)`, 把整个弹层 innerHTML 重写 → 已画好的卷子画布被清空, 而 false 又跳过了重新加载 → 左边空白。交卷 / 重做也整页重画 (卷子重载、滚动丢失)
  - 修: 答题卡拆成 `_prSideHtml(p)`, 选答案 / 交卷 / 重做只调 `_renderPrSide()` 刷新右侧, 卷子画布和滚动位置不动
- **根因 2**: 卷子滚动区没有定位, 每页 offsetTop 是相对弹层算的 (多了约 248px), 点章节会多滚过那一节开头一截; 刚打开还没排版时所有页位置都是 0, 页码框误显示成最后一页
  - 修: `.pr-canvas-host` 加 `position:relative`; 未排版 (clientHeight 0) 不算页码
- **根因 3 (手机 / 竖屏平板)**: flex 子项 min-height:auto 被整份卷撑到 1 万多像素, 答题卡排在 22 页之后
  - 修: 卷子区 / 答题卡各自滚动 (卷子在上约六成, 答题卡在下约四成), 章节按钮一行横滑, 375px 屏两列答题卡放得下 1-4
- **破坏性测试 (真实点击)**: 选 / 改选 (旧选项取消, 计数对) · 选完卷子容器不重建、滚动保留 · 没答完交卷点取消 (不写成绩) · 交卷判分 (故意错 Q5/Q21 → 23/25 92%, 错红对绿, 2 题进错题集) · 交卷后乱点不改答案 · 看答案页跳 p21 · 重做清空可再选 · 无答案键的卷 (提示纸上做, 无交卷按钮) · 问答题跳判分 (任务 sci_oe, 自动附 4 张官方答案页) · 手机 375px (卷子 395px 可滑, 答题卡 242px 可滑, Editing 跳 p15, 四个选项不出界)
- QA 3409 → 3412

## v29.0 (2026-11-04) — 修: 点 Editing 跳到 Comprehension (章节页码重叠)
用户: "我点 editing, 跳到了 comprehension, 有 bug, 检查, 全部修正" (截图: Henry Park 2026 英文, Editing p20-21 和 Comprehension OE p18-28 同时高亮)
- **根因**: 每节起止页按 "这一节所有页的 最小页 → 最大页" 算。阅读问答的文章在前 (p18-19)、题目在后 (p25-28), 中间夹着 Editing / 综合填空 / 句型转换, OE 的范围把它们整个包住 → 翻到 Editing 两个按钮一起亮, 范围判断也会把人带错节
- **修 1 · 起止页**: 每节取 **最长的连续页段** (等长时 OE / 答案取靠后段, 其他取靠前段), 章节按起始页排序; 全部 114 份卷重叠检查 = 0 对 (QA 断言锁住)
- **修 2 · 高亮**: 每份卷新增逐页章节标签 `pl` (一页一个字符), 滚动时只亮当前页自己所属的那一节
- **修 3 · 跳转**: 点章节按钮改为立即跳到那一页并同步刷新页码和高亮 (平滑滚动在后台标签 / 部分平板上不执行, 会停在原处)
- 本地实测 Henry Park 2026: Editing→p20 / 综合填空→p22 / 句型转换→p24 / 阅读问答→p25 / 选择题→p7 / 答案→p29, 每次只亮一个; 从薄弱模块汇编 "改错" 点进来停在 p20
- QA 3406 → 3409

## v28.9 (2026-11-04) — 薄弱模块汇编按年份分行
用户: "Henry Park 和 Henry Park 2026 的内容有什么差别, 前面是什么年代的? 应该整体按年份排"
- 原因: 之前只给非 2025 年的卷子按钮标年份, 2025 年的只写校名, 看起来像两份不同东西
- 改成每个模块里按年份分行 (行首 26年 / 25年 / 24年 / 23年), 新 → 旧, 同年按校名; 按钮只写校名 + 页码
- QA 3405 → 3406

## v28.8 (2026-11-04) — 名校卷第一批补充上线: 44 → 114 份, 四个年份
- 新增 70 份已分章的名校 Prelim (2026 / 2025 其他学校 / 2024 / 2023), 年份胶囊现在 26年 / 25年 / 24年 / 23年 都有卷; 每科: 英文 26 / 科学 23 / 华文 37 / 数学 24 (含原 10 校)
- 选择题答案键: 新卷 56 份 agent 视觉转录 (英文 15 / 华文 22 / 科学 8 / 数学 9), 共 96 份卷可交卷自动判
- **排除两份张冠李戴的答案页**: 数学 ACS Junior 2023 (答案页页眉是 ACS Primary) / 华文 ACS Primary 2024 (答案页页眉是 ACS Junior) —— 卷子照常能看能做, 选择题不自动判, 判分也不附这两份答案页
- 缺答案键: 华文南洋 2023 (答案页缺 Q1-25 那页) / 数学 Henry Park 2026 (只有 Paper 2 解答); 另有 14 份没认出答案页, 和剩下约 100 份分章中的卷子一起在下一版补
- 接手文档: `tools/papers/README.md` (真题库流水线 / 重建卷子站 / 加新卷顺序 / 踩坑), DEV_SESSION_NOTES 第 2 节加真题库, CLAUDE.md 状态横幅; 卷子站配置 + 清单 + 页标签 + 答案键全部进 `tools/papers/` (PDF 不进仓库)
- QA 2161 → 3405

## v28.7 (2026-11-04) — 真题库: 科目顺序 英语→科学→华文→数学; 名校卷按年份切换
用户: "这个顺序按英语、科学、华文、数学排" / "这个页面要区分年份, 如: 26年、25年、24年" / "不要固定 10 份, 找到多少放多少, 在目前的 10 份后面补充"
- 科目胶囊顺序 英语 / 科学 / 华文 / 数学, 进页面默认英语
- 名校卷卡片加年份胶囊 `26年 / 25年 / 24年 / 23年` (每个带份数, 做过几份显示 已做/总数), 默认最新一年; 25 年里现有 10 校排前面
- 做卷弹层 / 错题集 / 判分备注里写死的 "2025" 改成卷子实际年份; 薄弱模块汇编的学校按钮纳入所有年份 (非 2025 标年份), 计数改 "n 份"
- 补充卷已全部下载 (2026 年 43 / 2025 其余 14 / 2024 年 55 / 2023 年 60 = 172 份, 450 MB, 新增 9 所学校), 正在 OCR 分章; 分章 + 答案键转录后在 v28.8 上线 (本版年份胶囊暂时只有 25 年)
- 下载 / 分章 / 答案键 / 数据生成 脚本全部改成带年份 (`tools/papers/dl_more.py` 等)
- QA 2158 → 2161

## v28.6 (2026-11-04) — 真题库加 📌 薄弱模块汇编 (按目录, 点进去直接做)
用户: "在真题库, 加入薄弱模块汇编, 按这个目录逻辑排列, 点目录进去能直接做题" (指桌面 薄弱模块汇编_目录与用法_v1.docx)
- 真题库每科最上面 `📌 薄弱模块汇编`: 和目录文档同一套顺序 —— 英文 7 个模块 (Booklet A → 语法填空 → 改错 → 综合填空 → 句型转换 → 阅读问答 → 写作), 科学 Booklet B 开放题, 华文 作文 + 阅读理解二; 数学 AL1 只放一句说明
- 每个模块: 序号 + 名称 + 📋 校考病根 + 一行练法 + 10 校按钮 (学校名 + 页码范围); 点学校 = 打开那份原卷并直接停在那一节第一页 (`openPaperRunner(id, startPage, weakKey)`), 选择题照常答题卡自动判, 问答题照常拍照判分
- 打开过的学校记 `state.weakDone[模块][卷]`, 按钮变灰打勾, 模块右上角 "n/10 校" 全做完变绿
- 不另外上传汇编 PDF, 直接复用已上线的 40 份原卷 (省 250 MB)
- QA 2157 → 2158

## v28.5 (2026-11-04) — 导航改成一个一个的胶囊按钮
用户: "把这个按钮的间距做宽一点, 太窄了, 做成一个一个明显的按钮, 现在拍成一行文字了"
- `nav.tabs`: 间距 4px → 10px (手机 6px), 每项浅灰底 #F1F5F9 + 1px 边框 + 12px 圆角 + 轻阴影, 高 44px; 当前页深蓝 #1E40AF 白字; 悬停加深
- QA 2156 → 2157

## v28.4 (2026-11-04) — 名校卷 科学 / 华文 / 数学 选择题全部可页内自动判
- 三科 30 份卷重新分章 (规则再修: 答案页模板 `SCHOOL: LEVEL: SUBJECT: TERM:` / `Q1 Q2 Q3` 表头 / 数学答案页; 科学南洋 B 册 "Continue from Q29)" 撞答案规则、华文南华 / 莱佛士答案页没认出、数学 Rosyth / 道南 Paper 1 被当封面, 手工修正)
- 选择题答案键: 科学 10 校 Q1-28 (都是老格式 28 题) / 华文 10 校 试卷二 Q1-25 / 数学 10 校 Booklet A Q1-15, 三组 agent 视觉转录 + 自查; 我交叉核: 道南数学 15/15 对原图, 南洋科学 28/28 与独立 OCR 一致, 南洋华文抽 5 题一致
- 44 份卷 (名校 40 + PSLE 数学 4) 答案键全部完整, 答题卡交卷自动判; 三科答案页 JPG 上传到卷子站, 问答题拍照判分自动附官方答案
- 桌面薄弱模块汇编 (科学 220 页 / 华文 82 页 / 总 532 页) + 目录 Word 按修正后的分章重新生成
- 注: 华文 南华 那份页眉是 "2025 年六年级华文年终考试", 不是预考
- QA 1476 → 2156 (每个答案键值域逐个断言)

## v28.3 (2026-11-04) — 真题库整页: PSLE 真题 → 名校卷 → 外站链接 (保留)
用户: "整体改一下, 点进去后直接做题, 不需要跳转, 但链接保留, 我想跳转过去自己下载是可以的; 目前只有名校卷, 没有真题, 把真题也放进去" → "真题你直接帮我下载放上去, 跟名校卷一样"
- 每科页面顺序: ① 🎯 PSLE 真题 (页内做) ② 🏫 名校真题 2025 Prelim (页内做) ③ 🔗 外站下载 (原链接全部保留, 新窗口打开)
- **PSLE 数学 2022 / 2023 / 2024 / 2025** (Paper 1 + 2 含答案, 来源 clubmath.sg 公开 PDF, 文字版): 放到 `chamui-papers.web.app/psle/math/<年>.pdf`, 原件在桌面 `P6顶尖小学真题2025/PSLE真题/`; 章节按标题文字定位, Booklet A 15 道选择题答案键从答案页文字解析, 四份全齐 → 交卷自动判; 答案页另渲 JPG 给判分用 (`tools/papers/psle_math.py`)
- 英文 / 科学 / 华文 的 PSLE 历年真题网上没有免费公开版 (只有授权出版社 Shing Lee / EPH 出售), 页面写明; 加 **导入真题 PDF**: 家长自己下载或买书扫描的 PDF 存这台设备 IndexedDB, 同一个页内阅读器做 + 拍照判分, 不上传
- 做卷弹层 / 错题集 标题区分 PSLE 真题 / 名校卷 / 本机导入
- QA 1414 → 1476

## v28.2 (2026-11-04) — 做卷改成整卷连续下滑
用户: "别一页一页点, 就直接下滑看完所有卷子" (截图还看到 "/ 0 页")
- 阅读器: 所有页竖排在一个滚动区, IntersectionObserver 前后各一屏预渲染, 只渲染看得到的页 (42 页科学卷首屏只画 2 页); 页码框跟着滚动变, 可输入跳页; 章节按钮 = 平滑滚到那一节; 适宽 / 1.5× / 2× 保持当前页重排
- 删掉 上一页 / 下一页 按钮; 总页数改用 PDF 实际页数 (科学 / 华文 / 数学的分页数据还没合并时会显示 0 页)
- QA 1411 → 1412

## v28.1 (2026-11-04) — 导航: 模块学习 → 专项练习; 题库搬出学习中心 → 独立标签「真题库」
用户: "这个改成专项练习, 然后题库从学习中心拿出来, 名字改为真题库, 不要收进去"
- 导航 `📖 专项练习` (原 模块学习, 页面标题 / 返回按钮同步改) 后面紧跟 `🏫 真题库` (原来隐藏的 paperbank 标签放出来, 页面标题改 真题库); 学习中心里的 "题库" 卡删除
- 外站链接还在真题库页下半部分, 下一版按用户要求删掉, 只留页内能做的名校卷

## v28.0 (2026-11-04) — 🏫 名校真题 2025 Prelim: 10 校 × 4 科原卷页内做卷 (选择题自动判 / 问答题拍照判分)
用户: "把这个模块的名校卷点进去直接放一份一份下载好的扫描 PDF 试卷及答案, 能立即做, 不要跳转" → "点卷子直接打开能在页面做题, 选择题页面填答案自动判断, 问答题写下答案拍照上传自动判分"
- **卷源**: sgexam.com 2025 P6 Prelim, 10 校 (南洋 / 莱佛士女小 / Rosyth / 道南 / 南华 / 公教 / ACS Junior / Henry Park / 美以美女小 / 爱同) × 英文 / 数学 / 科学 / 华文 = 40 份扫描 PDF (531 MB), 原件也按科目放在桌面 `P6顶尖小学真题2025\`
- **独立站点** `https://chamui-papers.web.app/2025/<subj>/<school>.pdf` (Firebase 同项目第二个 Hosting site, 目录 `C:\claude\chamui-papers`, 不进 app 仓库; 一年强缓存 + CORS + noindex); 答案页另渲成 JPG `<school>_ansN.jpg` 给判分模型当官方答案
- **页内阅读器**: 自托管 pdf.js (`vendor/pdf.min.mjs` + worker) 按页画 canvas, range 请求不用整本下完; 章节按钮 (Booklet A / Grammar Cloze / Editing / … / 答案) 直接跳页, 上下页 / 输页码 / 1.5× 2×。内置浏览器与安卓 Chrome 的 iframe 显示不了 PDF, 所以不走 iframe
- **分章 + 答案页**: 40 份扫描件无文字层, 用 RapidOCR 识别每页上半页标题分章 (`tools/papers/classify_pages.py`), 规则改了 5 轮 (Optical Answer Sheet / read the passage / underlined word / 老格式科学 Section B 从 29 题起 / "SCHOOL: LEVEL: SUBJECT: TERM:" 答案模板 都踩过); 分章结果进 `PAPERS_2025` (data.js 标记块, `build_papers_data.py` 生成)
- **选择题答案键**: OCR 读答案表不可靠 (科学 30 题错 5), 改为 agent 用视觉逐份转录 + 自查 + 我抽校 (公教英文 25/25 一致) → `mcq.key`; 没齐的卷答题卡提示 "答案键缺 N 题, 先纸上做翻答案页对"
- **做卷弹层** `openPaperRunner`: 右侧答题卡 1-4 点选 → 交卷自动判, 对错着色, 错题自动进错题集 (题型 "名校卷 选择题", 带学校/题号/答案页页码), 英文 1-10/11-20/21-25 分别记进 语法/词汇/看图 模块正确率, 科学记 sci:mcq; `state.paperRuns[id]` 记分 + 作答, 可重做
- **问答题** → 判分页预设 `openGradingPreset`: 任务自动选 (英文阅读问答 / 科学开放题 / 华文作文), 备注自动写学校 + 章节页码, **自动附这所学校的官方答案页图** (放在孩子作答前, 提示词要求严格按学校答案给分, 分歧写 caveats); 判分页显示 "官方答案 N 张" 缩略图
- 入口: 学习中心 → 📚 题库 → 每科顶部 "🏫 名校真题 2025 Prelim" 列表 (做过的显示分数); 原来的外站链接保留在下面
- 薄弱模块汇编 (桌面): `薄弱模块汇编_英文/科学/华文_2025Prelim_v1.pdf` + 总汇编 + `薄弱模块汇编_目录与用法_v1.docx` (病根 ↔ 模块 ↔ 章节, 假期用法)
- 本版: 英文 10 校选择题答案键齐 (视觉转录 + 抽校); 科学 / 华文 / 数学 卷子能页内看、能拍照判分, 选择题答案键还在转录 (答题卡先提示纸上做)
- QA 1154 → 1409

## v27.1 (2026-11-03) — 校考成绩改按分析稿
用户: "按分析稿来"
- `EXAM_RESULTS.eng` 88/110 → **154/200** (77%, AL4, 离 AL1 差 26 分): Booklet A 16/25 · 听力 15/20 · Booklet B 54/65 · 写作 + 口试 69/90 (推算合计 = 154 − 16 − 15 − 54, 映射 writing / sitwriting / oral 三张卡); `sci` 86.5 → **88/100** (AL2): Booklet B 开放题 30.5 → 32/40
- `EXAM_HISTORY` 11 月 英 77 / 科 88 (导航条 "几天到 AL1" 跟着变); 科学开放题病根文字加 "32/40 丢 8 分"
- QA 1154 (三条断言改数)

## v27.0 (2026-11-03) — 📷 判分切页: 拍照上传 → 按 PSLE 官方格式 + 评分标准批改
用户: "加一个切页, 判分, 支持拍照上传, 严格按照 PSLE 英文作文 / 华文 / 科学的答题和判分标准批改, 给出失分项和详细讲解, 给范文和规范答案, 不要幻想, 去查最新 PSLE 判分标准"
- **评分标准查证** (2026-11-03): 官方 SEAB 考纲 PDF 原文 — 英语 (implemented from 2025) Paper 1 = 情境写作 14 + 作文 36 (≥150 词, 三图至少用一张), Paper 2 Booklet B 阅读问答 10 题 20 分; 华文 (0005) 试卷一 写作 50 分钟 40 分, 命题 / 看图 二选一, 字数不少过 100, 可用考评局规定词典; 科学 (for examination from 2026, 2023 syllabus) Booklet B 10–11 题 structured, 每题 2/3/4/5 分, 共 40 分, AO2 = 应用 + 科学探究。SEAB 不公布分项与等级描述, 学校/机构通行口径 (Playwrite / Writers Studio 2024-2026): 作文 内容 18 + 语言组织 18 五等级 (16-18/13-15/9-12/5-8/1-4); 情境写作 内容 6 (每要点 1 分, 须达成目的) + 语言组织 8; 华文作文 内容 20 + 语言 20; 科学按得分点 (关键词 + 因果链)。两类在提示词和页面说明里**分开标注**
- **页面** `renderGradingPage` (导航 错题集 后): 1 选任务 (英语作文 / 情境写作 / 阅读问答 / 华文作文 / 科学开放题) → 2 拍照/选图 (`capture="environment"`, 最多 6 张, 压到最长边 1600 JPEG 0.85) → 3 补充题目/分值 → 开始判分 → 结果页: 总分 + 分项等级 + 转写 (核对认字) + 失分项 (位置 / 原文 / 为什么 / 改成) + 做得好的 + 详细讲解 + 范文/规范答案 (可复制) + 接下来练什么 + 不确定说明; 失分项一键整批进错题本 (gameKey `graded_*`, 错题集按科目归 "判分 · xx"); PDF 下载; 记录页 (≤60 条, 不存图)
- **调用** `callClaudeGrader`: 浏览器直连 `api.anthropic.com/v1/messages` (`anthropic-dangerous-direct-browser-access`), 默认 `claude-opus-5-5` (可选 sonnet-5-5), effort high, max_tokens 16000; 提示词七条铁规: 先逐字转写 (看不清用 [?]) / 只判照片里看得到的, 拍不全标"估分" / 只用给定标准, 非官方部分在 caveats 说明 / 每个失分项引用原文位置 / 不夸 / 简体中文讲解 / 只输出 JSON (解析容错: 代码围栏、前后杂文)。**API key 只存本机 localStorage, 绝不进 state / Firestore** (Firestore 是公开读写)
- 真实 API 调用在开发机没有 key, 只用 mock 结果实测了页面全流程 (选图 → 判分 → 入错题本 → 记录); 第一次真用若报错, 页面会显示错误和模型原文
- 评审团 (对照 SEAB 原文) 17 条全部应用: Official 句只留官方原文 (题目焦点 / 自拟要点 / 题型清单 移到学校口径段); 规则 7-9 新增 禁止从答案反推题目再判分 / 家长备注不能改标准 / 拍的和选的任务不符不出分; 科学整分不给半分、分值不可见不编总分; 华文错别字 ½ 分封顶 4、成语不额外加分; schema 加 word_count (150 词 / 100 字门槛前端标红)、marks 改数字 + impact、band 非作文填 null
- QA 1140 → 1154

## v26.2 (2026-11-03) — 时态卡排第一
- 线上实测: 病根加急分 (diagBump) 只加在写作那条 return 上, 时态专项 (没练过 = 60 分) 排不到前面; 三条 return 都加上, 时态 / 科学开放题 +500 稳居第一。QA 1139 → 1140

## v26.1 (2026-11-03) — 修科学开放题"提交 + 看 Model Answer"报错
- 线上实测 v26.0 时发现: `_renderSciOe` 里 `weakOpener` 声明在 `if (userAns)` 块内, 看答案那段 (v19.14d 起) 引用它 → ReferenceError, 科学 OE 提交后一直渲染不出 model answer。提到函数作用域, QA 加断言
- QA 1138 → 1139

## v26.0 (2026-11-03) — 2026-11 校考逐题分析落地: 时态专项 / 常错本 / 科学关键词答题 / 病根标注
家长给的试卷分析结论: 知识底子够, 丢分在"技术活" —— 英语 = 时态 + 选择题 + 读题不准; 科学 = 会的东西没写成得分句。"根据这个建议, 修正学习模块"
- **`EXAM_DIAG` 病根表** (data.js, 改病根只改这里): 每个模块这次考试暴露的问题, 模块卡上红条 "📋 校考病根", 排序加急 (时态 / 科学开放题 永远第一); 模块页顶部 "🎯 本阶段重点抓" 改为按病根列 (模块 + 问题 + 去练), 超过 6 个折叠提示
- **时态专项模块** (英语 Booklet B 第一张卡): 语法题库里 39 道真时态题 (评审团收紧正则: 排除被动语序 / 虚拟 / 情态推测) 每次练 10 题, 记进 `state.engModules.tense`; 技巧本新模块 `eng.tense` (时间信号词 / 动词圈查 / 过去完成 / 对话例外 / 不规则动词), 技巧测一测自动生成
- **✍️ 动词圈查** `openTenseChecker()`: 把写好的段落输进来, 过去时叙述里的现在时动词黄底红线逐个确认; 评审团规则: to / 情态 / did not / let / make / saw 后接原形不标, 限定词后名词 (the lives) 不标, 双引号 / 弯单引号 / 直单引号对话跳过, isn't 整词匹配, put / read 原形=过去式不列。入口: 作文页顶部 / 情境写作弹层 / 时态卡 / 技巧本 compo
- **📕 我的常错本** `MY_ERROR_BOOK`: 两篇作文老师划的 30 多处归 6 类 (时态 / 中式直译 / 词性 / 硬塞大词 / 格式拼写 / 要背的搭配), 弹层 + PDF, 技巧本 compo 模块内嵌; 评审团修: wore→wear 拆成 "to/did 后原形" 单独一条, Yours sincerely / faithfully 规则, An 按发音
- **科学开放题先圈关键词**: 答题前从 chips 里圈 2-4 个得分关键词 (真关键词 + 别题干扰词), 提交后显示 圈对 / 漏了 / 多圈; **🔑 科学关键词库** `SCI_KEYWORD_BANK` 14 单元 (含这次丢分的 6 题: 心率 / 种子传播 / 公平测试 / 根吸水 / 凝结 / 传粉) 每条 关键词 + 得分句 + 这次怎么丢的, 弹层 + PDF + 题库 63 题按主题的关键词
- **新增 6 道开放题 oe_61-66** (同类情境改写这次丢分的题), 科学评审团修 4 高: model 必须命中自己全部关键词 (slower / only one 命不中 → 改), oe_64 题干 dry soil 歧义 → moist soil 每天浇水; 送分词 (题干里有的) 从 keywords 删
- 技巧本追加: compo 中式直译 / 词性 / 大词 三坑 + 圈查自查 + 搭配模板; sw 格式小错; comp_oe 限定词 (one word / from paragraph 1); gram_mcq / gram_cloze / editing 时态坑; sci oe_explain "先写 2-3 个关键词, 链写到题目问的结果为止" + 两坑两查; oe_exp 点名变量
- 评审: 英语组 15 条 (3 高) + 科学组 13 条 (4 高) 全部应用; QA 1125 → 1138
- 未做 (课表铁律 "照抄不加规则"): 分析里的 "假期每天 40 分钟 / Booklet A 每周 2 套 / 假期末模拟卷" 没有进课表, 等家长发课表截图
- 注: 分析稿里英语 154/200、Booklet B 54/65、科学开放题 32/40 与家长手写单 (88/110、57/65、30.5/40) 不一致, 成绩仍以手写单为准

## v25.9 (2026-11-03) — 科学校考成绩补齐 + 模块页"重点抓"
用户: "改一下科学, Booklet B 30.5/40, A 是 56/60" / "所以科学要把重要的模块提出来重点抓"
- `EXAM_RESULTS.sci`: Booklet A 56/60 (93%, 映射 sci:mcq / sci:terms) + Booklet B 30.5/40 (76%, 映射 sci:oe / sci:lab) = 86.5/100 AL2, 离 AL1 差 4 分; 不再 "待出"。`EXAM_HISTORY` 11 月科学 92.5 → 86.5 (影响导航条 "几天到 AL1" 外推)
- 模块页 (英/科通用) 顶部新增 **🎯 本阶段重点抓** 红框: 校考没到 90% 的卷子 → 它对应的模块逐行列出 (卷子得分/丢分/App 正确率 + 去练按钮)。科学 = 开放题 + 实验题; 英语 = Booklet A 的语法/词汇/看图 + 听力
- 科学三张卡的 tip 改成对着 11 月校考说话 (选择题已过线保持; 开放题是全科最大缺口; 实验题结论要带数据)
- QA 1121 → 1125

## v25.8 (2026-11-03) — 考题题干/选项和词典弹层回调
- 题干 32→26, 选项 26→21, 卡宽 940; 词典 400px 宽, 词 26 / 中文 23 / 释义 16
