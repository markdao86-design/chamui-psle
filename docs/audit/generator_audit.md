# 单词考题生成器 逻辑审计 (buildVocabQuestion 一族)

审计对象: `C:/claude/chamui-psle/data.js` 里的 `_fcDistractors / _fcParseHandQuiz / _fcLocate / buildVocabQuestion / pickQuizWords / recordVocabQuiz`, 渲染 `app.js:_renderFcQuiz / answerFcQuiz`。
方法: node vm 加载真实 `data.js` (同 qa_check.js 方式), 对全部 24 卡组 1067 词 (1056 唯一) × 1345 句例句直接调用原函数跑统计; 另对 `vocab_quiz_1~4.json` 共 2015 题 (meaning 722 / define 1062 / hand 93 / cloze 142) 做抽样复核。
脚本都在本目录: `gen_audit.js`(harness) `a1_similar.js` `a1b_cluster.js` `a2_define_locate.js` `a3_more.js` `a4_pairs.js` `a5_proto.js`(新过滤原型) `a7_locate_proto.js`(新定位原型) `a8_actual.js` `a9_risk.js`。
不改项目文件。

---

## 1. 结构性"两个都对": meaning / cloze 的干扰项是近义词

### 发现

现有过滤只有 4 条: 释义共用 ≥4 字母实词 / 中文完全相同 / 词干前 5 字母相同 / iWrite 同 root。三个漏洞:

1. **`_fcKeyWords` 只认 ≥4 字母**, "sad / say / cry / run / ran / big / hot / mad" 这些核心义素全漏。83 个词的释义主实词是 ≤3 字母。
2. **同义不同词**: "ran very quickly" vs "ran as fast as you can"、"filled with great happiness" vs "extremely happy"、"deeply upset" vs "very sad" —— 一个实词都不共用, 照样放行。
3. **IW_ROOT 只覆盖 iwrite_weekly 131 词**, 其他 17 个非术语卡组没有任何"同义场"信息。

数据:

| 口径 | meaning (722) | cloze (142) |
|---|---|---|
| 干扰项与正确项 同 root | 0 | 0 |
| 中文释义共享 ≥2 实义汉字 | 8 (1.1%) | 1 (0.7%) |
| 落在同一语义场 (36 个 PSLE 高频义场正则, 见 a1b) | 54 (7.5%) | 13 (9.2%) |
| 落在已知近义组 (手列 40 组, 见 a4) | 8 / 864 (0.9%) | |

- 按卡组看语义场撞车率: **iwrite_weekly 28%**, **connectors 22%**, phrasal_verbs2 13%, emotions 10%; 其他 ≤7%。
- **已知近义对 302 对 (同卡组), 现过滤放行 106 对 = 35%** (`a4_pairs.js`)。即 furious/livid 这类是被挡住了 (共用 angry), 但 dashed/sprinted、overjoyed/ecstatic、devastated/miserable/dejected、murmured/muttered/whispered、grabbed/snatched/clutched、enormous/immense/vast、scorching/sweltering、however/whereas/on the other hand、therefore/as a result/consequently/hence、moreover/in addition、snarled/rebuked/lambasted、implored/cajoled/urged/pleaded with、morose/sullen/grim/crestfallen/had a doleful expression… 全部互为合法干扰项。
- 每次出题干扰项是重抽的, 所以 JSON 里 0.9% 只是一次抽样; 按池子算 **每题至少抽中 1 个同义场干扰项的期望概率 5.8%, 31% 的词 (250 个) 池里有同义场词**; 最高的 lamented / to my shock and horror / to my consternation / on the contrary / whereas 每题风险 50-60% (`a9_risk.js`, say 义场偏宽, 数字偏高, 但排序可信)。

**最糟 20 例** (前 8 条是 JSON 里真出现的, 后面是过滤放行、随时会出现的):

| # | 题 | 正确 | 干扰项 (也说得通) |
|---|---|---|---|
| 1 | cloze: Cats are quiet; dogs, ___, are noisy. | on the other hand | **however** / whereas |
| 2 | cloze: The road was flooded, and ___, buses were late. | as a result | **therefore** |
| 3 | cloze: My brother loves sports, ___ I prefer reading. | whereas | **however** |
| 4 | meaning: My brother loves sports, [whereas] I prefer reading. | while in comparison | nevertheless "in spite of that" (中文都是"然而") |
| 5 | meaning: The boy was [overjoyed] to see his father… | filled with great happiness | ecstatic "extremely happy" |
| 6 | meaning: He [murmured] a quiet thank you… | said in a low, soft voice | muttered "spoke quietly in a cross way" |
| 7 | meaning: The children [stared] at the huge elephant | looked at with wide, fixed eyes | glanced "took a quick, short look" (方向反但同义场, 弱生只认 look) |
| 8 | meaning: She [had a lugubrious expression]… | sad and serious look on your face | sullen "silent and bad-tempered" |
| 9 | meaning: He [ignored] the warning sign | 不理睬 | neglect 忽视 (中文同义项) |
| 10 | meaning: He could [barely] keep his eyes open | 几乎不；勉强 | grudgingly 勉强地 |
| 11 | dashed ↔ sprinted | ran very quickly | ran as fast as you can |
| 12 | devastated ↔ miserable ↔ dejected | deeply upset and heartbroken | very sad and unhappy / sad after a disappointment |
| 13 | grabbed ↔ snatched ↔ clutched | took hold of something suddenly | grabbed something quickly and rudely (释义里就含 grabbed) |
| 14 | enormous ↔ immense ↔ vast | extremely big | very large in size / huge and wide-reaching |
| 15 | scorching ↔ sweltering | extremely hot | unpleasantly hot and sticky |
| 16 | therefore ↔ as a result ↔ consequently ↔ hence | for that reason | because of that / for this reason |
| 17 | moreover ↔ in addition (furthermore/moreover en 完全相同, 已被 seenEn 去重, 但 in addition "as an extra thing" 放行) | | |
| 18 | snarled ↔ rebuked ↔ lambasted ↔ chided | fierce angry voice | spoke angrily because you disapprove / criticised strongly and angrily |
| 19 | implored ↔ pleaded with ↔ cajoled ↔ urged | begged very seriously | asked again and again emotionally / gently persuade / strongly advise |
| 20 | morose ↔ sullen ↔ grim ↔ crestfallen ↔ had a sombre face ↔ had a doleful expression ↔ had a lugubrious expression ↔ looked very woeful ↔ with downcast eyes (iwrite 一个 9 词的"愁脸"家族, 两两之间 60% 互相放行) | | |

### 修改建议 (已在 `a5_proto.js` 跑过: 近义对放行 35% → 6%, 非术语词平均池 60.6 → 58.5, 没有任何词池子 <3)

```js
// 义场表: 释义或词本身出现这些词 → 同一义场, 不互为干扰项。比 IW_ROOT 覆盖全部卡组, 比共用实词抓得住"同义不同词"
const _FC_CONCEPTS = {
  angry: 'angry anger angrily rage fury furious livid cross temper indignant outraged resentful irritated annoyed bad-tempered',
  happy: 'happy happiness happily joy joyful delighted delight pleased glad cheerful elated ecstatic thrilled jubilant',
  sad: 'sad sadly sadness unhappy sorrow grief grieving miserable gloomy depressed dejected downcast upset heartbroken disappointed',
  cry: 'cry cried crying sob sobbed weep wept whimper tears wail',
  fear: 'fear afraid scared frightened terrified fright nervous anxious worried dread panic alarmed horror',
  walk: 'walk walked stroll march trudge stride wander pace tiptoe creep crept step',
  run: 'run ran running dash sprint race rush hurry bolt flee fled quickly fast',
  look: 'look looked glance stare gaze peer watch glimpse eyes observe see saw',
  say: 'say said speak spoke tell told shout yell mutter whisper voice utter exclaim remark murmur scream shriek bellow growl',
  surprise: 'surprised shocked astonished amazed stunned bewildered confused puzzled baffled perplexed dumbfounded',
  big: 'big large huge enormous vast immense giant massive wide', small: 'small tiny little slight',
  hot: 'hot heat burning scorching sweltering humid sticky', cold: 'cold freezing chilly icy',
  calm: 'quiet calm peaceful serene tranquil still silent soothing',
  beg: 'beg begged plead implore request urge persuade coax flatter appeal',
  laugh: 'laugh laughed giggle chuckle snigger grin smile smiled beam',
  grab: 'hold held grab grabbed grip clutch seize snatch grasp',
  shabby: 'dirty shabby run-down dilapidated worn ruined neglected',
  brave: 'brave courage courageous bold fearless daring', shy: 'shy timid sheepish meek bashful',
  proud: 'proud arrogant conceited haughty boastful smug', kind: 'kind generous compassionate caring gentle considerate thoughtful',
  diligent: 'diligent hardworking hard-working industrious persevere determined persistent',
  sorry: 'sorry regret remorse contrite guilty ashamed apologetic', reluctant: 'reluctant unwilling hesitant grudging',
  eager: 'eager keen enthusiastic excited', strange: 'strange odd peculiar bizarre weird eerie unusual',
  loud: 'loud deafening noisy thunderous piercing', serious: 'serious solemn grave sombre stern',
  think: 'think thought ponder consider reflect wonder contemplate', continue: 'continue continued carry keep going persist',
  // 连接词按功能分, 同功能的在 cloze 里一定两个都对
  contrast: 'however although though despite spite whereas nevertheless contrast contrary different',
  result: 'therefore thus hence result consequently reason', addition: 'addition furthermore moreover besides also extra',
};
const _FC_CONCEPT_OF = {};
Object.keys(_FC_CONCEPTS).forEach(k => _FC_CONCEPTS[k].split(' ').forEach(t => { _FC_CONCEPT_OF[t] = k; }));
// 另外: 审核 agent 回报的 banPair 直接进这张表, 两边都查
const FC_BAN_PAIRS = [/* ['on the other hand', 'however'], ['significant', 'remarkable'], ... 来自 vocab_findings_N.json 的 banPair */];
const _FC_BAN = new Set(FC_BAN_PAIRS.map(p => p[0] + '|' + p[1]).concat(FC_BAN_PAIRS.map(p => p[1] + '|' + p[0])));
const _fcStem = t => t.replace(/(ness|ingly|edly|ly|ing|ed|es|s)$/, '');   // happiness/happily/happy 归一到 happ*
// 实词: 3 字母起 (sad/say/cry/run/big/hot 都是核心义素), 词干归一
function _fcKeyWords(s) { return (String(s).toLowerCase().match(/[a-z]{3,}/g) || []).filter(x => !_FC_STOPW.has(x)).map(_fcStem); }
function _fcConcepts(word, en) {
  const out = new Set();
  (String(word + ' ' + en).toLowerCase().match(/[a-z-]{3,}/g) || []).forEach(t => { const c = _FC_CONCEPT_OF[t] || _FC_CONCEPT_OF[_fcStem(t)]; if (c) out.add(c); });
  return out;
}
// 两个词能不能互为干扰项 (抽出来方便 QA 直接断言 _fcCanDistract('overjoyed','ecstatic') === false)
function _fcCanDistract(word, x) {
  if (x === word || !getVocabEn(x)) return false;
  if (_FC_BAN.has(word + '|' + x)) return false;
  const root = IW_ROOT[word]; if (root && IW_ROOT[x] === root) return false;
  if (getVocabMeaning(x) === getVocabMeaning(word)) return false;
  if (x.toLowerCase().slice(0, 5) === word.toLowerCase().slice(0, 5)) return false;
  const mine = new Set(_fcKeyWords(getVocabEn(word)));
  if (_fcKeyWords(getVocabEn(x)).some(c => mine.has(c))) return false;
  const myC = _fcConcepts(word, getVocabEn(word)), xc = _fcConcepts(x, getVocabEn(x));
  for (const c of xc) if (myC.has(c)) return false;
  return true;
}
```

`_FC_STOPW` 里要补 3 字母的虚词, 否则 3 字母起会引入噪音: `'the','and','for','you','are','was','not','but','who','how','way','its','his','her','has','had','did','get','got','out','off','all','any','can','may','one','two','too','own','our','she','him','put','let','yet','now','new','old','off'`。
("way" 要进停用词: 几十条副词释义都是 "in a … way", 不然副词卡组互相全挡光。)

`_fcDistractors` 第 20-21 行改成 `deck.words.filter(w => _fcCanDistract(word, w))`, 其余不动。

另外 **术语卡组要反过来** (见第 2 节): 对 isTerm 卡组, 共用实词的兄弟词 (xylem/phloem、melting/freezing、isosceles/equilateral) 恰恰是 PSLE 真考的干扰项, 现在被整批滤掉, 术语题变成 "木质部 vs 迁徙 vs 物种 vs 细胞核" 的送分题。

---

## 2. define 题: 一条释义对应多个词

### 发现

- define 1062 题: **同卡组有 ≥3 实词撞车的兄弟词 58 题 (5.5%)**, ≥2 实词 206 题 (19.4%)。
- 但**实际干扰项里共享实词的 = 0** —— 过滤生效, 所以"释义同时指向两个选项"在 define 题里目前没有发生 (pool fallback 一次都没触发)。
- 撞车主要在术语: xylem/phloem, solid/liquid, melting/freezing, conduction/convection, conductor/insulator, transparent/translucent/opaque, perimeter/circumference, radius/diameter, equilateral/isosceles/scalene, acute/obtuse/reflex, face/net/area, denominator/improper fraction。非术语只有 bewildered/with a perplexed look、pitifully/sobbed piteously、shrieked in pain/bellowed in agony、glanced/cast a furtive glance。
- **真正的问题反了**: 术语 define 252 题里**干扰项与正确释义有任何共享实词的 = 0**。例: "A triangle with two equal sides" → 选项 circumference / isosceles / depth / cuboid; "Plant tubes that carry water up from the roots" → nucleus / xylem / species / migration。孩子科学丢分大头是选择题 (-8), 这种题练不出 xylem vs phloem 的辨析。
- define 题 **stem 泄漏答案 70 题 (6.6%)**: 正确项的实词直接出现在释义里。"spoke solemnly" ← "Spoke in a very serious way", "walked jauntily" ← "Walked with a happy, confident step", "cell wall" ← "…supports a plant cell", "kinetic energy" ← "The energy of a moving object", "take over" ← "To take control of something", "go the extra mile" ← "To make a special extra effort"。干扰项实词出现在 stem 里 13 次 (误导)。
- 同卡组 en 完全相同: furthermore/moreover = "in addition to that"; carry on/keep on = "to continue doing something"。seenEn 去重挡住了同题出现, 但 define 题给 "In addition to that" 让选 furthermore 时 moreover 若在池里会被 seenEn 跳过 (因为 en 相同) —— 没问题; 但 **meaning 题 furthermore 划线, moreover 永远进不了干扰项**, 也没问题。只是数据上两个词共享一条释义, 定义题本身答案就不唯一 (孩子选 moreover 也对), 是数据问题, 已交数据 agent。

### 修改建议

**(a) 术语卡组: 干扰项优先挑同主题兄弟词** (释义共享实词越多越优先), 取 2 个"难"的 + 1 个随机:

```js
// 术语卡组: 真考考的是 xylem vs phloem、melting vs freezing 这种同主题辨析, 兄弟词要当干扰项而不是滤掉
function _fcTermDistractors(word, deck, n, rnd) {
  const mine = new Set(_fcKeyWords(getVocabEn(word))), en = getVocabEn(word);
  const scored = deck.words.filter(w => w !== word && getVocabEn(w) && getVocabEn(w) !== en && getVocabMeaning(w) !== getVocabMeaning(word))
    .map(w => ({ w, s: _fcKeyWords(getVocabEn(w)).filter(c => mine.has(c)).length + rnd() * 0.5 }))   // 共享实词数 + 抖动
    .sort((a, b) => b.s - a.s);
  const hard = scored.filter(x => x.s >= 1).slice(0, n - 1).map(x => x.w);          // 最多 n-1 个同主题
  const rest = _fcShuffleR(scored.filter(x => hard.indexOf(x.w) < 0).map(x => x.w), rnd);
  return hard.concat(rest).slice(0, n);
}
// buildVocabQuestion 里:
const ds = isTerm ? _fcTermDistractors(word, deck, 3, rnd) : _fcDistractors(word, 3, rnd);
```

注意术语的 en 彼此是互斥概念 (两条释义共享 "triangle…sides" 但一个 two equal 一个 three equal), 所以不会"两个都对"; 唯一要防的是 en 完全相同, 上面已排除。

**(b) define 题 stem 里把泄漏的实词挖掉**:

```js
// define 题: 释义里出现了答案词本身 (spoke solemnly ← "Spoke in a very serious way") 就把那个词挖成 ___, 不然白送
function _fcMaskLeak(en, word) {
  let s = en;
  String(word).toLowerCase().split(/\s+/).filter(t => t.length >= 4 && !_FC_STOPW.has(t)).forEach(t => {
    const st = _fcStem(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp('\\b' + st + '[a-z]{0,4}\\b', 'gi'), '___');
  });
  return s;
}
// define 分支: stem: _fcMaskLeak(en, word) 再首字母大写
```

**(c) 释义太泛的词 (同卡组有 ≥3 实词撞车) 非术语时优先出 meaning 不出 define** —— 在 `kinds` 里: 若 `_fcHasTwin(word)` 且 `loc` 存在, 不 push 'define'。`_fcHasTwin` 就是上面 scored 里 s≥3 的存在性判断, 可以缓存。

---

## 3. `_fcLocate` 的词干匹配

### 发现

- 1345 句: exact 1138, 词干匹配合理变形 91, **词干匹配可疑 1** (contrite → contrition, 可接受), **定位失败 115 句 (其中词组 104 句)**。
- 理论误伤 (`stem + [a-z]{0,5}`): 实测 `pat→pattern, bar→barely, car→carries, sent→sentence, tend→tender, mean→meaning` 都会中。现词库没有这些短词, 但 psle_verbs/sec_words 以后加 "rest/pat/bar/tend" 就炸。
- **真正的大问题是词组一律不做变形**: `if (/\s/.test(word)) return null`。结果 **95 个词 (9%) 全部例句都定位失败**, 清一色是 phrasal_verbs / phrasal_verbs2 / collocations / idioms —— 恰恰是 FC_CLOZE_DECKS 里本该出 cloze 的卡组:

| 卡组 | 词 | 能出 cloze | 只剩 define/hand |
|---|---|---|---|
| phrasal_verbs | 50 | 25 | 25 |
| phrasal_verbs2 | 50 | 23 | 27 |
| idioms | 20 | 9 | 11 |
| idioms2 | 30 | 16 | 14 |
| collocations2 | 40 | 30 | 10 |
| cloze_collocations | 20 | 18 | 2 |
| connectors | 25 | 25 | 0 |

失败原因三类: 时态 (come across / "came across", give in / "gave in", look forward to / "looked forward to"), 代词插入 (pick up / "pick me up", back up / "backs me up", lend a hand / "lent a hand"), one's 代词 (keep one's fingers crossed / "kept my fingers crossed", lose one's temper / "lost his temper")。
后果: phrasal_verbs 50 词里 25 个只能 hand(67%)+define(33%); phrasal_verbs2 没有 hand, 27 个词**只有 define 一种题**, 天天同一道。

### 修改建议 (已在 `a7_locate_proto.js` 跑过: 定位 1230 → 1333 句, 救回 103/115, 旧 exact 结果一个不变, 旧 pat→pattern 类误伤全消)

```js
// 不规则动词 (词组里的 come/give/take/keep/lend/… 例句里都是过去式)。约定: 第一个一定是过去式, _fcMatchTense 靠它变时态; put/cut/hit 这类过去式同形的第一个写自己
const _FC_IRREG = { come: 'came|comes|coming', go: 'went|goes|going|gone', run: 'ran|runs|running', give: 'gave|gives|giving|given', take: 'took|takes|taking|taken', make: 'made|makes|making', break: 'broke|breaks|breaking|broken', fall: 'fell|falls|falling|fallen', get: 'got|gets|getting', keep: 'kept|keeps|keeping', lend: 'lent|lends|lending', burn: 'burnt|burned|burns|burning', bite: 'bit|bites|biting|bitten', see: 'saw|sees|seeing|seen', lose: 'lost|loses|losing', pay: 'paid|pays|paying', wear: 'wore|wears|wearing|worn', stand: 'stood|stands|standing', spill: 'spilt|spilled|spills|spilling', feel: 'felt|feels|feeling', hold: 'held|holds|holding', bring: 'brought|brings|bringing', catch: 'caught|catches|catching', do: 'did|does|doing|done', blow: 'blew|blows|blowing|blown', fly: 'flew|flies|flying|flown', flee: 'fled|flees|fleeing', die: 'died|dies|dying', lie: 'lay|lies|lying', put: 'put|puts|putting', cut: 'cut|cuts|cutting', hit: 'hit|hits|hitting', let: 'let|lets|letting', set: 'set|sets|setting', shut: 'shut|shuts|shutting', cost: 'cost|costs|costing', sit: 'sat|sits|sitting', can: 'could', say: 'said|says|saying', tell: 'told|tells|telling', think: 'thought|thinks|thinking', leave: 'left|leaves|leaving', meet: 'met|meets|meeting', draw: 'drew|draws|drawing|drawn', throw: 'threw|throws|throwing|thrown', speak: 'spoke|speaks|speaking|spoken', hang: 'hung|hangs|hanging', shoot: 'shot|shoots|shooting', strike: 'struck|strikes|striking', stick: 'stuck|sticks|sticking', win: 'won|wins|winning', eat: 'ate|eats|eating|eaten', wake: 'woke|wakes|waking|woken', creep: 'crept|creeps|creeping', leap: 'leapt|leaped|leaps|leaping', weep: 'wept|weeps|weeping', overcome: 'overcame|overcomes|overcoming', is: 'am|are|was|were|be|been|being', was: 'is|are|were|be|been|being', has: 'have|had|having', had: 'has|have|having' };
const _fcEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// 一个词允许的全部变形 (白名单后缀, 代替 [a-z]{0,5}; 词条是过去式 snarled 也能对回 snarl/snarling)
function _fcInflect(t) {
  t = t.toLowerCase();
  const alts = [t].concat(_FC_IRREG[t] ? _FC_IRREG[t].split('|') : []);
  const base = t.replace(/(ed|ing|s)$/, '');
  const stems = new Set([t, base, t.replace(/e$/, ''), base.replace(/e$/, ''), t.replace(/y$/, 'i'), base.replace(/y$/, 'i')]);
  const SUF = ['', 'e', 's', 'es', 'ed', 'd', 'ing', 'ly', 'er', 'est', 'ness', 'ment', 'ion', 'tion', 'cation'];
  stems.forEach(s => { if (s.length < 3) return; SUF.forEach(x => alts.push(s + x)); if (/[bdglmnprt]$/.test(s)) alts.push(s + s.slice(-1) + 'ed', s + s.slice(-1) + 'ing'); });
  return Array.from(new Set(alts)).sort((a, b) => b.length - a.length).map(_fcEsc).join('|');   // 长的在前, 先匹配 looked 再 look
}
// 在例句里找到这个词或词组 (允许变形; 词组每个词各自变形, one's/him → 任意代词, 词间允许插 ≤2 个词: pick [me] up / lent [a] hand)
function _fcLocate(word, sent) {
  let m = new RegExp('(^|[^A-Za-z])(' + _fcEsc(word) + ')(?![A-Za-z])', 'i').exec(sent);
  if (m) { const at = m.index + m[1].length; return { pre: sent.slice(0, at), target: m[2], post: sent.slice(at + m[2].length), exact: true }; }
  const toks = String(word).toLowerCase().split(/\s+/).filter(Boolean);
  const PRON = "(?:my|your|his|her|our|their|its|one's|someone's|me|you|him|us|them)";
  const parts = toks.map(t => /^(one's|someone's|his|him|sb|somebody)$/.test(t) ? PRON : /^(a|an|the)$/.test(t) ? '(?:a|an|the|' + PRON + ')' : '(?:' + _fcInflect(t) + ')');
  const gap = toks.length > 1 ? "(?:\\s+[A-Za-z']+){0,2}?\\s+" : '';
  m = new RegExp('(^|[^A-Za-z])(' + parts.join(gap) + ')(?![A-Za-z])', 'i').exec(sent);
  if (!m) return null;
  const at = m.index + m[1].length;
  return { pre: sent.slice(0, at), target: m[2], post: sent.slice(at + m[2].length), exact: false };
}
```

配套改 `buildVocabQuestion` 第 65 行: cloze 不再要求 `loc.exact`, 而是 **挖空后把正确项改成例句里的实际形态**, 干扰项同样变形 (不然 "The old bus ___ halfway" 选项给 break down / gave up / … 时态对不上, 一眼排除):

```js
// cloze: 正确项用例句里的实际形态 (broke down), 干扰项也按同一时态变 (gave in / turned out), 不然光看时态就能排除
function _fcMatchTense(sample, phrase) {
  const head = sample.split(/\s+/)[0].toLowerCase(), t = phrase.split(/\s+/), h = t[0].toLowerCase();
  const past = /(ed|t)$/.test(head) || Object.keys(_FC_IRREG).some(k => _FC_IRREG[k].split('|')[0] === head);
  const ing = /ing$/.test(head), s3 = /[^s]s$/.test(head);
  let nh = h;
  if (past) nh = _FC_IRREG[h] ? _FC_IRREG[h].split('|')[0] : /e$/.test(h) ? h + 'd' : /[^aeiou]y$/.test(h) ? h.slice(0, -1) + 'ied' : h + 'ed';
  else if (ing) nh = (/e$/.test(h) && !/ee$/.test(h) ? h.slice(0, -1) : h) + 'ing';
  else if (s3) nh = /(s|x|ch|sh)$/.test(h) ? h + 'es' : /[^aeiou]y$/.test(h) ? h.slice(0, -1) + 'ies' : h + 's';
  return [nh].concat(t.slice(1)).join(' ');
}
if (kind === 'cloze') { const correct = loc.target, opts = [correct].concat(ds.map(d => _fcMatchTense(loc.target, d))); return finish({ type: 'cloze', ..., pre: loc.pre, target: '______', post: loc.post, say: sent, opts }, correct); }
```
(`finish` 里 `ans: opts.indexOf(correctText)` 要用变形后的 correct; 代词插入的 "pick me up" 作为正确项, 干扰项 "turn me out" 会怪, 所以**词间有插入词时只出 meaning 不出 cloze**: `if (!/\s[a-z']+\s/.test(loc.target.replace(word, '')) ...` 简单做法是 `loc.target.split(/\s+/).length === word.split(/\s+/).length` 才允许 cloze。)

仍然救不回的 12 句是例句问题, 交数据 agent: budged→"budge" (加 'e' 后缀后已救回), mortified→"mortification"(加 cation 后救回), was shamefaced→"shamefaced smile", it pricked my conscience→例句没有 it, take for granted→中间插了 3 个词 "our parents love", once bitten twice shy→例句有逗号, a stone's throw away→例句漏了 's, bite off more than one can chew→"bit off more than she could chew" (can→could 没进不规则表, 加 `can: 'could'`)。

---

## 4. hand 题解析 `_fcParseHandQuiz`

### 发现

- VOCAB_QUIZ 440 条, 含"四选一" **95 条, 解析成功 95, 失败 0**。目前没有选项带括号的数据, 正则没炸。JSON 里 hand 93 题, 少的 2 个 (on the contrary / in vain) 是抽样没抽到 hand, 不是 bug。
- 合成用例实测 (`a3_more.js`):

| 用例 | 结果 | 评 |
|---|---|---|
| 选项含括号 `(B) called (it) off` | **NULL** | 预期中的炸点, 整题丢, fallback 到 define, 手写白写 |
| 全角括号 `（A）` | NULL | 手敲中文输入法极易出现 |
| 小写 `(a)` | NULL | |
| 5 个选项 (E) | NULL | 合理 |
| 重复选项 | NULL | 合理 |
| **两个 ✓** | **OK, ans 取最后一个** | 静默吞错, 应 null + console.warn |
| ✓ 紧贴字母 `(A)✓ called off` | OK | |
| 题干含括号 `He (finally) ___` | OK | indexOf('(A)') 之后才切 |
| 题干含冒号 `Mother said: "___"` | OK | 前缀正则只吃第一个冒号 |
| 没冒号 `Cloze四选一 He ___` | OK 但 stem 残留 "Cloze四选一 " | 应剥 |

- **356 个卡组词有 quiz 字段但不是四选一** (作文升级 127 / Science 109 / Math 65 / Comp 35 / 作文习语 20), 格式如 `作文升级: "spoke with nervous pauses" → ✓stammered`。这是现成的"短释义选词"题料 (比 en 更贴 PSLE 作文替换语境), 生成器完全没用。
- `kinds.push('hand','hand')`: 有 hand 的词 hand 占 50-67% (come across 实测 20 次 14 次 hand)。phrasal_verbs 这类词孩子每天看到的几乎都是同一道手写题, 背答案位置就过了 (hand 题选项顺序虽然打乱, 但题干固定)。

### 修改建议

```js
function _fcParseHandQuiz(word) {
  const q = getVocabQuiz(word);
  if (!q || !/四选一/.test(q)) return null;
  // 全角括号/小写字母先归一; 前缀 "Cloze四选一:" 有没有冒号都剥掉
  const body = q.replace(/[（]/g, '(').replace(/[）]/g, ')').replace(/\(([a-d])\)/g, (_, c) => '(' + c.toUpperCase() + ')').replace(/^[^(]*?四选一[:：]?\s*/, '');
  const i = body.search(/\(A\)/);
  if (i < 0) return null;
  // 按 (A)/(B)/(C)/(D) 的位置切, 不用 [^()]*? 吃内容 —— 选项里自己带括号也不怕
  const seg = body.slice(i), marks = [];
  const re = /\(([A-D])\)/g; let m;
  while ((m = re.exec(seg))) marks.push({ L: m[1], at: m.index, end: m.index + m[0].length });
  if (marks.length !== 4 || marks.map(x => x.L).join('') !== 'ABCD') return null;
  const opts = [], ticks = [];
  marks.forEach((mk, k) => { let t = seg.slice(mk.end, k + 1 < marks.length ? marks[k + 1].at : undefined).trim(); if (/✓/.test(t)) { ticks.push(k); t = t.replace(/\s*✓\s*/g, ' ').trim(); } opts.push(t); });
  if (ticks.length !== 1 || opts.some(o => !o) || new Set(opts).size !== 4) { if (ticks.length > 1) console.warn('hand quiz 多个 ✓:', word); return null; }
  return { stem: body.slice(0, i).trim(), opts, ans: ticks[0] };
}
```

把"作文升级"题也接进来 (再加一种 kind `upgrade`, 本质是 define 但 stem 是短语, 更像 PSLE 作文替换):

```js
// 作文升级: "looked quickly" 换高级词 → ✓glanced   —— 题干是短语, 选项是同卡组词, 比 en 更贴作文语境
function _fcParseUpgradeQuiz(word) {
  const q = getVocabQuiz(word); const m = q && /^作文(升级|习语)[:：]\s*[“"]([^”"]+)[”"].*✓\s*([A-Za-z' -]+)/.exec(q);
  return m && m[3].trim().toLowerCase() === String(word).toLowerCase() ? { stem: m[2].trim() } : null;
}
// buildVocabQuestion: const up = _fcParseUpgradeQuiz(word); if (up) kinds.push('upgrade');
// if (kind === 'upgrade') return finish({ type: 'define', label: 'Vocabulary · 作文升级', prompt: 'Which word could replace this in a composition?', stem: '"' + up.stem + '"', opts: [word].concat(ds) }, word);
```

`kinds` 权重改成按次数轮转, 不再 hand 双倍 (同一个词今天 hand 明天 meaning 后天 define, 考法不重复):

```js
// 题型轮转: 用这个词已考次数取模, 四种考法轮着来; 没 state 时退回随机
const n = (window.state && state.fcQuiz && state.fcQuiz[word]) ? (state.fcQuiz[word].ok + state.fcQuiz[word].bad) : -1;
if (hand) kinds.push('hand');
const kind = n >= 0 ? kinds[n % kinds.length] : kinds[Math.floor(rnd() * kinds.length)];
```
(`buildVocabQuestion` 现在不接 state, 可以加第三个参数 `seen` 由 `startFcQuiz` 传 `state.fcQuiz[w]`。)

---

## 5. 答案位置分布 / 选项长度泄漏

### 发现

- ans 分布 (2015 题): meaning 24/25/25/26%, define 24/25/27/23%, hand 25/22/27/27%, cloze 21/24/29/26%。模拟 5 轮全词库 5335 题: 1314/1268/1374/1379。**均匀, 没有位置泄漏** (`_fcShuffleR` 是正经 Fisher-Yates)。
- 长度: meaning 正确项最长 23% / 最短 21% (随机就是 25%), 长出 8 字以上 6%, 短 8 字以上 7%; define/cloze 21%/21%; **hand 正确项最长 39%** (n=93, 手写题常见毛病, 正确项写得更完整)。总体**没有可利用的长度泄漏**。
- **词性/形态泄漏才是 meaning 题的真漏洞**: 4 个选项形态类别数分布 = 1 类 142 题 (20%) / 2 类 270 / 3 类 260 / **4 类 50 题 (7%)**。例: snarled 划线, 选项 "to say something…" / "filled with shock and horror" / "understood something completely" / "walked with long…steps" —— 一个不定式一个形容词短语一个过去式, 孩子不用懂词, 看划线词是 -ed 动词就能排掉形容词释义。目标词是 -ed/-ly 且只有正确项形态对得上的 22 题 (3%) 直接秒选。
- 术语 define: 100% 都是 define (251 词 252 题), 且干扰项跨主题 (见第 2 节), 等于 100% 送分。

### 修改建议

形态分桶: 干扰项优先挑与正确项同形态的释义 (都是 "to …" / 都是 "in a … way" / 都是形容词短语), 池子不够再放宽:

```js
// 释义的语法形态: 动词释义 to…/过去式, 副词 in a…way, 名词 a/an/the…, 其他当形容词
function _fcEnForm(en) { return /^to /.test(en) ? 'v' : /^(in a|in an|in the) /.test(en) || / way$/.test(en) ? 'adv' : /^(a|an|the) /.test(en) ? 'n' : /^[a-z]+ed\b/.test(en) ? 'v' : /^[a-z]+ing\b/.test(en) ? 'v' : 'adj'; }
function _fcDistractors(word, n, rnd) {
  const deck = _fcDeckOf(word);
  if (!deck) return [];
  const form = _fcEnForm(getVocabEn(word));
  let pool = deck.words.filter(w => _fcCanDistract(word, w));
  const same = pool.filter(w => _fcEnForm(getVocabEn(w)) === form);     // 同形态优先, 不够才混
  if (same.length >= n) pool = same;
  if (pool.length < n) pool = deck.words.filter(w => w !== word && getVocabEn(w) && getVocabEn(w) !== getVocabEn(word));
  const seenEn = new Set([getVocabEn(word)]), out = [];
  for (const w of _fcShuffleR(pool.slice(), rnd)) { const e = getVocabEn(w); if (seenEn.has(e)) continue; seenEn.add(e); out.push(w); if (out.length >= n) break; }
  return out;
}
```

define 题同理: 选项都是词, 形态泄漏来自 **词本身的词尾** (stem "To say something…" 选项 lambasted / flippant / in a detailed manner / snarled → 只有两个是 -ed)。`_fcEnForm` 换成看词尾即可: `/ed$/ → 'v', /ly$/ → 'adv', /(ful|ous|ive|ish|ic|al|ent|ant|less)$/ → 'adj'`。

hand 题正确项偏长: 数据层面提醒写题的人, 代码不用改。

---

## 6. 渲染层: 答完后的"考点解析"

### 发现

`_renderFcQuiz` 答完只显示: 对/错 一行 + 词 + 音标 + zh + en。`q.explain` ("word = zh · en") 字段渲染里甚至没用, 是死字段。
缺的东西: 为什么这个对 (语境线索), 每个干扰项是什么词、什么意思 (孩子选错的那个尤其要看), 这个词 PSLE 怎么考 (VOCAB_TIPS)。meaning 题里干扰项是四条英文释义, 答完孩子都不知道那三条是哪三个词, 等于白看三条释义。

### buildVocabQuestion 应额外返回

```js
// finish 里统一补: optMeta 与 opts 一一对应 (打乱后顺序), 每项知道它是哪个词
const finish = (q, correctText, optWords) => {
  const idx = _fcShuffleR(q.opts.map((_, i) => i), rnd);          // 打乱下标而不是打乱文本, optMeta 才能跟着走
  const opts = idx.map(i => q.opts[i]);
  const optMeta = idx.map(i => { const w = optWords ? optWords[i] : null; return w ? { word: w, zh: getVocabMeaning(w) === w ? '' : getVocabMeaning(w), en: getVocabEn(w), tip: (window.VOCAB_TIPS || {})[w] || '' } : { word: null, zh: '', en: '', tip: '' }; });
  return Object.assign(q, {
    word, deckId: deck.id, opts, optMeta, ans: opts.indexOf(correctText),
    zh: zh === word ? '' : zh, en, ipa: getVocabIpa(word), tip: (window.VOCAB_TIPS || {})[word] || '',
    sent: q.say || '',                                        // 语境句 (define/hand 没有就取一句例句给解析用)
    clue: q.type === 'meaning' || q.type === 'cloze' ? _fcClue(word, sent) : '',
  });
};
// 调用处: finish({...meaning...}, en, [word].concat(ds));  finish({...define/cloze...}, word, [word].concat(ds));
// hand: optWords 用 hand.opts.map(o => deck.words.find(w => w.toLowerCase() === o.toLowerCase()) || null)  (对不上的就 null, 只显示文本)
```

语境线索 `_fcClue` 不靠 AI, 规则抓: 例句里与释义共享实词的词 + 划线词前后 3 个词:

```js
// 语境线索: 例句里哪些词暗示了词义 —— 与释义共用词干的 (growling→snarled), 以及紧挨着的搭配 (snarled AT the driver)
function _fcClue(word, sent) {
  const k = new Set(_fcKeyWords(getVocabEn(word)));
  const hits = (sent.match(/[A-Za-z']+/g) || []).filter(t => k.has(_fcStem(t.toLowerCase())) && !new RegExp('^' + _fcEsc(word.split(' ')[0]), 'i').test(t));
  const loc = _fcLocate(word, sent); const after = loc ? (loc.post.match(/^\s*([A-Za-z']+(\s+[A-Za-z']+){0,2})/) || [])[1] : '';
  return { hints: Array.from(new Set(hits)).slice(0, 3), collocation: after ? word + ' ' + after : '' };
}
```

### 解析区 HTML (替换 `_renderFcQuiz` 里的 `fb`)

```js
const picked = z.picked, right = picked === q.ans, pm = q.optMeta || [];
const row = (i, cls) => { const m = pm[i] || {}; const head = m.word && m.word !== q.opts[i] ? `<b>${escapeHtml(m.word)}</b> ` : ''; return `<div style="padding:6px 0;border-top:1px solid #EEF1F6;font-size:14px;line-height:1.5"><span style="display:inline-block;width:20px;font-weight:800;color:${cls === 'ok' ? '#16A34A' : cls === 'bad' ? '#DC2626' : '#94A3B8'}">${'ABCD'[i]}</span>${head}${m.zh ? `<span style="color:#1E293B">${escapeHtml(m.zh)}</span>` : ''}${m.en ? ` <span style="color:#64748B">· ${escapeHtml(m.en)}</span>` : ''}${cls === 'bad' && m.tip ? `<div style="margin:2px 0 0 20px;color:#B45309;font-size:13px">你选的这个: ${escapeHtml(m.tip)}</div>` : ''}</div>`; };
const fb = !done ? '' : `
  <div style="margin-top:12px;padding:12px 14px;border-radius:10px;background:${right ? '#F0FDF4' : '#FFF7ED'};border:1px solid ${right ? '#86EFAC' : '#FDBA74'}">
    <div style="font-size:15px;font-weight:800;color:${right ? '#16A34A' : '#C2410C'}">${right ? '✅ 答对了' : '❌ 答错了 — 这个词退两级, 明天这一组先补'}</div>
    <!-- 1. 正确词义 -->
    <div style="font-size:16px;margin-top:8px;color:#1E293B"><b>${escapeHtml(q.word)}</b> ${q.ipa ? '<span style="color:#64748B">/' + escapeHtml(q.ipa) + '/</span>' : ''} ${_fcSpk(q.word, 18)} <span style="color:#1E40AF;font-weight:700">${escapeHtml(q.zh)}</span></div>
    <div style="font-size:14px;color:#475569;line-height:1.6">${escapeHtml(q.en)}</div>
    <!-- 2. 为什么对: 语境线索 (meaning/cloze 才有) -->
    ${q.clue && (q.clue.hints.length || q.clue.collocation) ? `<div style="margin-top:8px;padding:8px 10px;background:rgba(43,91,215,0.06);border-radius:8px;font-size:14px;color:#1E293B"><b>线索</b> ${q.clue.hints.length ? '句里的 <b>' + q.clue.hints.map(escapeHtml).join(' / ') + '</b> 已经在提示' : ''}${q.clue.collocation ? (q.clue.hints.length ? '；' : '') + '搭配 <b>' + escapeHtml(q.clue.collocation) + '</b>' : ''}</div>` : ''}
    <!-- 3. 四个选项各是什么 (选错的那个标红并给它的 tip) -->
    <div style="margin-top:8px">${q.opts.map((_, i) => row(i, i === q.ans ? 'ok' : i === picked ? 'bad' : 'other')).join('')}</div>
    <!-- 4. 考点 tip -->
    ${q.tip ? `<div style="margin-top:8px;padding:8px 10px;background:rgba(230,162,60,0.10);border:1px solid rgba(230,162,60,0.25);border-radius:8px;font-size:14px;color:#1E293B"><b>考点</b> ${escapeHtml(q.tip)}</div>` : ''}
  </div>
  <div style="text-align:center;margin-top:14px"><button onclick="nextFcQuiz()" ...>${z.idx + 1 >= z.qs.length ? '看成绩' : '下一题 →'}</button></div>`;
```

四块的顺序是刻意的: 先结论 (词义), 再为什么 (线索), 再逐项 (孩子看自己选错的那条, 红色 + 那个词的 tip = 易混词辨析), 最后考点。答对时第 3 块可以折叠成 `<details>` 只展开第 1、4 块, 省屏幕。
optMeta 另一个用途: 错题本 (`state.wrongAnswers`) 现在不收单词题 (CLAUDE.md TODO 6), 有了 optMeta 就能把 "选了 X 其实是 Y" 存下来, 第二天复盘时直接显示混淆对。

---

## 7. 其他 bug / 边界

| # | 发现 | 数据 | 级别 |
|---|---|---|---|
| 7.1 | **跨卡组重复词, `_fcDeckOf` 只认第一个卡组**。`freezing` 在 descriptions (环境词) 和 sci_physical 都有, 释义是科学的 "when a liquid turns into a solid on cooling", 例句 "Water turns to ice by freezing…"。考 sci_physical 卡组时 `_fcDeckOf('freezing')` = descriptions → isTerm=false → 出了 **meaning 题** (JSON sci_physical 里那 1 道 meaning 就是它), 干扰项是 scorching/drenched 这种形容词释义, 成绩记进 `vocab` 模块而不是 `sci:terms`; 反过来考 descriptions 卡组时, "freezing" 作为"冰冷的"环境词, 释义却是物态变化。`volume` (sci_physical > math_geometry)、`thermometer` (sci_physical > sci_process)、`stammered/glanced/flinched/stumbled` (iwrite > actions)、`indignant/bewildered/ecstatic/apprehensive` (iwrite > emotions) 同理, 11 个词 | 11 词 | 必修 |
| 7.2 | `buildVocabQuestion(word)` 不知道是从哪个卡组点进来的。应加 `deckId` 参数: `buildVocabQuestion(word, rnd, deckId)`, `_fcDeckOf` 退化为兜底; `startFcQuiz(source)` 把 source 传进去; recordVocabQuiz 同样接 deckId 决定记哪个模块 | | 必修 |
| 7.3 | `_fcParseHandQuiz` 两个 ✓ 静默取最后一个 (见第 4 节) | 合成用例 | 建议 |
| 7.4 | **术语卡组 251 词全部有例句, 但 isTerm 一刀切屏蔽 meaning/cloze**, 251 词 100% 只有 define 一种考法, 且干扰项跨主题 (第 2 节), 孩子科学术语题等于每天做同一道送分题。建议 isTerm 也允许 cloze (例句挖空选术语, 干扰项用 `_fcTermDistractors` 的同主题词) —— 这才是 PSLE 科学 MCQ 的样子 | 251 词 | 必修 |
| 7.5 | 例句 ≤6 词的 221 句 (16%): "Father rebuked us for wasting food." "She sounded distraught on the phone." 语境推不出词义, meaning 题只能靠认词。生成器层面: meaning 题优先选最长的一句 (`sents.sort((a,b)=>b.length-a.length)[0]` 或按 rnd 但权重 ∝ 长度); 数据层面交数据 agent 补长句 | 221 句 | 建议 |
| 7.6 | `kinds.push('hand','hand')` 权重 + Math.random 无记忆: 同一个词天天同一种考法 (第 4 节有轮转代码) | | 建议 |
| 7.7 | `pickQuizWords(deckId)`: rank 0 (没考过) 内部按卡组原顺序, 每次都是卡组前 20 个, 直到全考完; 建议 rank 0 内打乱 `|| rnd() - 0.5` 或按 `flashcardSRS` 的 nextReview 排 | | 建议 |
| 7.8 | `pickQuizWords('today')` 不截断 n: 今天这一组若手动加过组 (v21.5 "再加一组") 会一次考几十题; `startFcQuiz` 没有上限 | | 建议 |
| 7.9 | 正则特殊字符: 词条里没有 `.*+?^${}()|[]\`; 撇号 `one's` 14 个词, 连字符 3 个, `_fcLocate` 的 `[^A-Za-z]` 边界对撇号安全 (`one's` 里 `'` 不是字母, 但整串 exact 匹配; 新版 `_fcInflect` 已把 one's 转代词) | 0 炸 | 可忽略 |
| 7.10 | 空例句 / 无 en / zh 退化成 word / 卡组可用词 <4 / 干扰项池 <3 fallback / buildVocabQuestion 返回 null: **全部 0**。fallback 分支 (`pool.length < n`) 目前一次没走过, 但一旦走到会把 root/zh 同义过滤全丢掉, 应至少保留 `getVocabEn(w) !== en && getVocabMeaning(w) !== zh` | 0 | 可忽略 (加个保底) |
| 7.11 | `explain` 字段渲染里没用 (死字段), 第 6 节已替换 | | 可忽略 |
| 7.12 | `finish` 打乱的是 `q.opts` 文本, 若两条 en 文本相同 (furthermore/moreover) `indexOf` 取第一个 —— seenEn 已防, 但改成打乱下标 (第 6 节) 后彻底不依赖文本唯一 | | 可忽略 |
| 7.13 | `_fcLocate` 第一次 exact 匹配用 `i` 标志, 句首大写 "Cross out the wrong answer" 能对上; 但 define 题 `stem = en.charAt(0).toUpperCase()+…` 若 en 以专有名词/缩写开头 (GST) 无影响 | | 可忽略 |
| 7.14 | `recordVocabQuiz` 用 `_fcDeckOf` 决定记 `sci:terms` 还是 `vocab`, 与 7.1 同根; `rec.quizWrong` 当天答对后不移除 (只是展示) | | 可忽略 |
| 7.15 | 术语 define 的 prompt "Which term matches this description?" 对 math 卡组 "GST / percentage increase" 这种名词短语没问题; 但 `simplify` (动词) 用 "term" 略怪, 可忽略 | | 可忽略 |

---

## 三档清单

### 必修 (影响题目有效性, 改完要加 QA 断言)
1. **干扰项过滤升级** (第 1 节): `_fcKeyWords` 3 字母起 + 词干归一 + `_FC_CONCEPTS` 义场表 + `FC_BAN_PAIRS` (吃数据 agent 的 banPair) + 抽出 `_fcCanDistract(a,b)`。QA: `assert(!_fcCanDistract('overjoyed','ecstatic'))`, `assert(!_fcCanDistract('as a result','therefore'))`, `assert(!_fcCanDistract('dashed','sprinted'))`; 全词库跑一遍 `_fcDistractors(w,3).length===3`。
2. **术语卡组干扰项反向** (第 2 节 a): 同主题兄弟词优先, 配合 7.4 让术语也能出例句挖空。QA: xylem 的 3 个干扰项里至少 1 个与释义共享实词。
3. **`_fcLocate` 词组变形 + 白名单后缀** (第 3 节): 救回 95 词的 meaning/cloze; cloze 正确项用例句实际形态, 干扰项跟着变时态。QA: `_fcLocate('come across','Mei Ling came across an old photo')` 非 null; `_fcLocate('pat','the pattern')` 为 null。
4. **卡组来源显式传参** (7.1/7.2): `buildVocabQuestion(word, rnd, deckId)` + `recordVocabQuiz(state, word, correct, deckId)`, 解决 freezing/volume 11 个重复词进错模块、出错题型。
5. **解析区重做 + optMeta** (第 6 节): 答完能看到四个选项各是哪个词、选错的那个为什么不对、考点 tip。这是 VOCAB_TIPS 的唯一出口, 不接等于白写 (CLAUDE.md 死代码警钟)。

### 建议 (提升区分度与体验)
6. 形态分桶 (第 5 节): meaning 干扰项同语法形态优先, define 同词尾优先。
7. define stem 挖掉泄漏词 `_fcMaskLeak` (第 2 节 b), 70 题/6.6%。
8. 题型按次数轮转, 取消 hand 双倍 (第 4 节)。
9. `_fcParseHandQuiz` 改按标记位置切 + 全角/小写归一 + 多 ✓ 判空 (第 4 节)。
10. 接入 356 条"作文升级/习语"手写题料当 `upgrade` 题型 (第 4 节)。
11. meaning 题优先选长例句 (7.5); pickQuizWords rank 0 内打乱 (7.7); today 组设上限 (7.8)。

### 可忽略 (记录在案)
12. fallback 分支保底过滤 (7.10)、explain 死字段 (7.11)、打乱下标代替打乱文本 (7.12)、撇号/连字符边界 (7.9)、hand 正确项偏长 39% (数据层提醒)、term prompt 用词 (7.15)。
