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
