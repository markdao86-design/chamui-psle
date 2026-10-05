// 导出 1056 词条 (词/卡组/中文/英文解释/例句/手写题) + 每词 4 种题型各生成一题 (固定种子), 给审核 agent 看
const fs = require('fs'), vm = require('vm');
const DIR = 'C:/Users/Eric/AppData/Local/Temp/claude/C--claude/4d3b5a33-ae7b-463a-a034-619c43f80a39/scratchpad/audit';
const w = {};
vm.runInContext(fs.readFileSync('C:/claude/chamui-psle/data.js', 'utf8') + ';window.IW_EG=typeof IW_EG!=="undefined"?IW_EG:{};window.IW_ROOT=typeof IW_ROOT!=="undefined"?IW_ROOT:{};window.getVocabQuiz=typeof getVocabQuiz!=="undefined"?getVocabQuiz:null;window.getVocabSent=getVocabSent;window.getVocabMeaning=getVocabMeaning;window.getVocabEn=getVocabEn;window.buildVocabQuestion=buildVocabQuestion;', vm.createContext({ window: w, document: {}, localStorage: { getItem: () => null, setItem: () => {} }, console }));
const words = [];
w.FLASHCARD_DECKS.forEach(d => d.words.forEach(word => words.push({
  w: word, deck: d.id, zh: w.getVocabMeaning(word), en: w.getVocabEn(word), eg: (w.IW_EG[word] && w.IW_EG[word].length) ? w.IW_EG[word] : (w.getVocabSent(word) ? [w.getVocabSent(word)] : []), quiz: w.getVocabQuiz ? (w.getVocabQuiz(word) || null) : null, root: w.IW_ROOT[word] || null
})));
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
// 每词把所有可能的题型都生成一遍 (多跑几次随机, 收集到不同 type 为止)
const qs = [];
words.forEach(x => {
  const seen = {};
  for (let k = 0; k < 12; k++) { const q = w.buildVocabQuestion(x.w, rnd); if (!q) break; if (seen[q.type]) continue; seen[q.type] = 1; qs.push({ w: x.w, deck: x.deck, type: q.type, stem: q.stem || null, pre: q.pre || null, target: q.target || null, post: q.post || null, opts: q.opts, ans: q.ans, correct: q.opts[q.ans] }); }
  if (!Object.keys(seen).length) qs.push({ w: x.w, deck: x.deck, type: 'NONE', note: 'buildVocabQuestion 返回 null (干扰项不足?)' });
});
fs.mkdirSync(DIR, { recursive: true });
// 分 4 份给 4 个 agent
const per = Math.ceil(words.length / 4);
for (let i = 0; i < 4; i++) {
  const chunk = words.slice(i * per, (i + 1) * per);
  const set = new Set(chunk.map(c => c.w));
  fs.writeFileSync(`${DIR}/vocab_words_${i + 1}.json`, JSON.stringify(chunk, null, 0));
  fs.writeFileSync(`${DIR}/vocab_quiz_${i + 1}.json`, JSON.stringify(qs.filter(q => set.has(q.w)), null, 0));
  console.log('chunk', i + 1, chunk.length, 'words', qs.filter(q => set.has(q.w)).length, 'questions', chunk[0].w, '→', chunk[chunk.length - 1].w);
}
const byType = {}; qs.forEach(q => byType[q.type] = (byType[q.type] || 0) + 1); console.log(byType, 'decks', w.FLASHCARD_DECKS.map(d => d.id + ':' + d.words.length).join(' '));
fs.writeFileSync(`${DIR}/vocab_generator_src.js`, fs.readFileSync('C:/claude/chamui-psle/data.js', 'utf8').split('\n').slice(6210, 6330).join('\n'));
