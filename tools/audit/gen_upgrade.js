// 出题器升级 (按 generator_audit.md 必修项): 义场过滤 / 术语卡组反向挑干扰 / 词组变形定位 + cloze 同时态 / deck 提示
const fs = require('fs');
const P = 'C:/claude/chamui-psle/data.js';
let s = fs.readFileSync(P, 'utf8');
const begin = s.indexOf('const _FC_STOPW = new Set(');
const end = s.indexOf('function buildVocabQuestion(word, rnd) {');
if (begin < 0 || end < 0) throw new Error('anchors');
const NEW = require('fs').readFileSync(__dirname + '/gen_new_block.js', 'utf8');
s = s.slice(0, begin) + NEW + s.slice(end);
// buildVocabQuestion: deck 提示 + 术语干扰 + cloze 同时态 + define 挖泄漏词
const reps = [
  ['function buildVocabQuestion(word, rnd) {\n  rnd = rnd || Math.random;\n  const en = getVocabEn(word), zh = getVocabMeaning(word), deck = _fcDeckOf(word);',
   'function buildVocabQuestion(word, rnd, deckHint) {\n  rnd = rnd || Math.random;\n  const en = getVocabEn(word), zh = getVocabMeaning(word), deck = _fcDeckOf(word, deckHint);'],
  ["  if (!isTerm && loc && loc.exact && FC_CLOZE_DECKS.indexOf(deck.id) >= 0) kinds.push('cloze');",
   "  // v23.0: cloze 不再要求精确匹配 (词组例句都是过去式), 但词间有插入词 (pick me up) 时不出 cloze, 干扰项会怪\n  const clozeOk = loc && FC_CLOZE_DECKS.indexOf(deck.id) >= 0 && loc.target.split(/\\s+/).length === String(word).split(/\\s+/).length;\n  if (!isTerm && clozeOk) kinds.push('cloze');"],
  ['  const ds = _fcDistractors(word, 3, rnd);', '  const ds = isTerm ? _fcTermDistractors(word, deck, 3, rnd) : _fcDistractors(word, 3, rnd, deck);'],
  ["  if (kind === 'cloze') return finish({ type: 'cloze', label: 'Cloze · 选词填空', prompt: 'Choose the word or phrase that best completes the sentence.', pre: loc.pre, target: '______', post: loc.post, say: sent, opts: [word].concat(ds) }, word, [word].concat(ds));",
   "  if (kind === 'cloze') { const correct = loc.exact ? word : loc.target; const dsT = loc.exact ? ds : ds.map(d => _fcMatchTense(loc.target, d)); if (new Set([correct].concat(dsT)).size === 4) return finish({ type: 'cloze', label: 'Cloze · 选词填空', prompt: 'Choose the word or phrase that best completes the sentence.', pre: loc.pre, target: '______', post: loc.post, say: sent, opts: [correct].concat(dsT) }, correct, [word].concat(ds)); }"],
  ["stem: en.charAt(0).toUpperCase() + en.slice(1), opts: [word].concat(ds) }, word, [word].concat(ds));",
   "stem: (function (e) { return e.charAt(0).toUpperCase() + e.slice(1); })(_fcMaskLeak(en, word)), opts: [word].concat(ds) }, word, [word].concat(ds));"],
];
for (const [a, b] of reps) { if (!s.includes(a)) throw new Error('miss: ' + a.slice(0, 60)); s = s.replace(a, b); }
// 第一个 if (kind === 'cloze') 现在可能落空 (选项撞车) → 往下走到 meaning/define, 但 meaning 需要 loc; 保证 fallthrough 时 define 一定可用 (已是)
fs.writeFileSync(P, s);
console.log('ok');
