// 把 4 个词条审核 agent 的 findings 合并, 以"覆盖层"形式注入 data.js (VOCAB_FIXES / VOCAB_TIPS / FC_BAN_PAIRS),
// 不改散落在 5 个表里的原数据 (IWRITE_WEEKLY/VOCAB_PLUS/VOCAB_MEANINGS/VOCAB_EN/VOCAB_SENT/VOCAB_QUIZ), 可重复执行 (幂等替换标记段)。
const fs = require('fs'), vm = require('vm');
const DIR = 'C:/Users/Eric/AppData/Local/Temp/claude/C--claude/4d3b5a33-ae7b-463a-a034-619c43f80a39/scratchpad/audit';
const P = 'C:/claude/chamui-psle/data.js';
let src = fs.readFileSync(P, 'utf8');
const w = {};
vm.runInContext(src.replace(/\/\/ ==== VOCAB_AUDIT_OVERLAY_BEGIN ====[\s\S]*?\/\/ ==== VOCAB_AUDIT_OVERLAY_END ====\n?/, '') + ';window.__IW_EG=IW_EG;window.__getVocabQuiz=getVocabQuiz;', vm.createContext({ window: w, document: {}, localStorage: { getItem: () => null, setItem: () => {} }, console }));
const allWords = new Set(); w.FLASHCARD_DECKS.forEach(d => d.words.forEach(x => allWords.add(x)));

const fixes = {}, tips = {}, bans = [], stats = { fixes: 0, badFix: [], tips: 0, pairs: 0, unknown: [] };
for (let i = 1; i <= 6; i++) {
  const f = `${DIR}/vocab_findings_${i}.json`;
  if (!fs.existsSync(f)) { console.log('缺', f); continue; }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  (j.fixes || []).forEach(x => {
    if (!allWords.has(x.w)) { stats.unknown.push(x.w); return; }
    const fx = fixes[x.w] = fixes[x.w] || {};
    if (x.field === 'eg') { const arr = Array.isArray(x.fix) ? x.fix : [x.fix]; if (!arr.length || !arr.every(s => typeof s === 'string' && s.length > 5)) { stats.badFix.push(x.w + ':eg'); return; } fx.eg = arr; }
    else if (/^(zh|en|quiz)$/.test(x.field)) { if (typeof x.fix !== 'string' || !x.fix) { stats.badFix.push(x.w + ':' + x.field); return; } fx[x.field] = x.fix; }
    else { stats.badFix.push(x.w + ':' + x.field); return; }
    stats.fixes++;
  });
  Object.keys(j.tips || {}).forEach(k => { if (allWords.has(k) && typeof j.tips[k] === 'string' && j.tips[k].trim()) { tips[k] = j.tips[k].trim().slice(0, 90); } });
  (j.quizIssues || []).forEach(x => { if (Array.isArray(x.banPair) && x.banPair.length === 2 && x.banPair.every(y => allWords.has(y)) && x.banPair[0] !== x.banPair[1]) bans.push(x.banPair.slice().sort()); });
}
// 校验 quiz 替换串能被解析 (4 个选项, 1 个 ✓)
Object.keys(fixes).forEach(k => {
  const q = fixes[k].quiz; if (!q) return;
  const m = q.match(/\(([A-D])\)\s*([^()]*?)(?=\s*\([A-D]\)|$)/g) || [];
  if (m.length !== 4 || (q.match(/✓/g) || []).length !== 1) { stats.badFix.push(k + ':quiz 解析失败'); delete fixes[k].quiz; }
});
// 例句修正: 新例句里必须真的含这个词 (允许变形), 否则 meaning/cloze 题定位不到
Object.keys(fixes).forEach(k => {
  const eg = fixes[k].eg; if (!eg) return;
  const stem = k.toLowerCase().split(' ')[0].replace(/(e|y)$/, '').slice(0, 4);
  if (!eg.some(s => s.toLowerCase().includes(stem))) { stats.badFix.push(k + ':eg 不含词 ' + eg[0].slice(0, 40)); delete fixes[k].eg; }
});
const uniqPairs = [...new Set(bans.map(p => p.join('|')))].map(s => s.split('|'));
stats.tips = Object.keys(tips).length; stats.pairs = uniqPairs.length;
const missingTips = [...allWords].filter(x => !tips[x]);

const block = `// ==== VOCAB_AUDIT_OVERLAY_BEGIN ====
// v23.0: 4 个 PSLE 词汇专家 agent 逐词审 1067 词后的修订覆盖层 (2026-10-03)。原表不动, 这里按词覆盖: zh/en/eg/quiz。
// VOCAB_TIPS = 每词考点解析 (答完考题看); FC_BAN_PAIRS = 不能互为干扰项的近义/反义对 (两个都说得通)。
const VOCAB_FIXES = ${JSON.stringify(fixes)};
Object.keys(VOCAB_FIXES).forEach(function (k) { var f = VOCAB_FIXES[k]; if (f.zh) IW_ZH[k] = f.zh; if (f.en) IW_EN[k] = f.en; if (f.eg) { IW_EG[k] = f.eg; VOCAB_SENT[k.toLowerCase()] = f.eg[0]; } if (f.quiz) VOCAB_QUIZ[k.toLowerCase()] = f.quiz; });
const VOCAB_TIPS = ${JSON.stringify(tips)};
function getVocabTip(word) { return VOCAB_TIPS[word] || VOCAB_TIPS[String(word || '').toLowerCase()] || ''; }
const FC_BAN_PAIRS = ${JSON.stringify(uniqPairs)};
const _FC_BAN = {};
FC_BAN_PAIRS.forEach(function (p) { (_FC_BAN[p[0]] = _FC_BAN[p[0]] || {})[p[1]] = 1; (_FC_BAN[p[1]] = _FC_BAN[p[1]] || {})[p[0]] = 1; });
function fcIsBanned(a, b) { return !!(_FC_BAN[a] && _FC_BAN[a][b]); }
window.VOCAB_FIXES = VOCAB_FIXES; window.VOCAB_TIPS = VOCAB_TIPS; window.getVocabTip = getVocabTip; window.FC_BAN_PAIRS = FC_BAN_PAIRS; window.fcIsBanned = fcIsBanned;
// ==== VOCAB_AUDIT_OVERLAY_END ====
`;
// 注入点: VOCAB_QUIZ 定义之后 (getVocabQuiz 函数那一行后面), 这样 IW_*/VOCAB_SENT/VOCAB_QUIZ 都已存在
src = src.replace(/\/\/ ==== VOCAB_AUDIT_OVERLAY_BEGIN ====[\s\S]*?\/\/ ==== VOCAB_AUDIT_OVERLAY_END ====\n?/, '');
const anchor = 'function getVocabQuiz(word){';
const ai = src.indexOf(anchor); if (ai < 0) throw new Error('no anchor');
const lineEnd = src.indexOf('\n', ai) + 1;
src = src.slice(0, lineEnd) + block + src.slice(lineEnd);
fs.writeFileSync(P, src);
console.log(JSON.stringify(stats));
console.log('缺 tip 的词', missingTips.length, missingTips.slice(0, 30).join(', '));
stats.badFix.forEach(b => console.log('  BAD', b));
