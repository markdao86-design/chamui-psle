const fs = require('fs'), vm = require('vm'); const w = {};
vm.runInContext(fs.readFileSync('C:/claude/chamui-psle/data.js', 'utf8'), vm.createContext({ window: w, document: {}, localStorage: { getItem: () => null, setItem: () => {} }, console }));
let seed = 3; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; const out = []; let n = 0, bad = 0, frag = 0;
Object.keys(w.TECHNIQUE_BOOK).forEach(s => w.TECHNIQUE_BOOK[s].order.forEach(m => { const qs = w.buildTechniqueQuiz(s, m, rnd); n += qs.length; qs.forEach(q => { if (q.opts.length !== 4 || new Set(q.opts).size !== 4 || q.ans < 0) bad++; if (/Only the is|The , and/.test(q.opts.join('|'))) frag++; }); out.push({ subj: s, mod: m, n: qs.length, qs }); }));
console.log('questions', n, 'bad', bad, 'fragments', frag, 'few:', out.filter(x => x.n < 3).map(x => x.subj + '/' + x.mod + ':' + x.n).join(' '));
const t = out.find(x => x.mod === 'oe_exp'); console.log(JSON.stringify((t.qs.find(q => /模板/.test(q.stem)) || {}).opts || []).slice(0, 300));
fs.writeFileSync('C:/Users/Eric/AppData/Local/Temp/claude/C--claude/4d3b5a33-ae7b-463a-a034-619c43f80a39/scratchpad/review2/techquiz_sample2.json', JSON.stringify(out, null, 1));
