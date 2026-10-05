// 把 5 个专家 agent 的 findings 应用到 data.js 的题库上。
// 规则: 有 fix 的直接覆盖字段; fix 为 null 且 severity=high 的题库题 → 删题 (考点题/阅读篇不删, 只列出来);
// _global 类跳过 (位置偏置另外用数据层洗牌处理)。改完校验: 4 个不重复选项、ans 在范围内。
const fs = require('fs'), vm = require('vm');
const DIR = 'C:/Users/Eric/AppData/Local/Temp/claude/C--claude/4d3b5a33-ae7b-463a-a034-619c43f80a39/scratchpad/audit';
const P = 'C:/claude/chamui-psle/data.js';
let src = fs.readFileSync(P, 'utf8');
const w = {};
vm.runInContext(src, vm.createContext({ window: w, document: {}, localStorage: { getItem: () => null, setItem: () => {} }, console }));

const MAP = { grammar: 'GRAMMAR_QUESTIONS', listening_mcq: 'LISTENING_MCQ', cloze: 'CLOZE_QUESTIONS', comp_oe: 'COMP_OE_PASSAGES', sci_mcq: 'SCIENCE_MCQ', sci_oe: 'SCIENCE_OE_QUESTIONS', sci_classify: 'SCIENCE_CLASSIFY', editing: 'EDITING_PARAGRAPHS', sst: 'SST_QUESTIONS', eng_nodes: 'KNOWLEDGE_PRACTICE', sci_nodes: 'KNOWLEDGE_PRACTICE' };
const banks = {};
Object.values(MAP).forEach(v => { banks[v] = JSON.parse(JSON.stringify(w[v])); });

const files = fs.readdirSync(DIR).filter(f => /^findings_.*\.json$/.test(f));
const stats = { applied: 0, deleted: 0, skippedGlobal: 0, unfixable: [], bad: [] };
const toDelete = {};
for (const f of files) {
  const arr = JSON.parse(fs.readFileSync(DIR + '/' + f, 'utf8'));
  for (const x of arr) {
    const fix = x.fix;
    if (fix && fix._global) { stats.skippedGlobal++; continue; }
    const bank = banks[MAP[x.file]];
    if (!bank) { stats.bad.push(f + ': 未知 file ' + x.file); continue; }
    let target = null, where = '';
    if (x.file === 'eng_nodes' || x.file === 'sci_nodes') { target = (bank[x.node] || [])[x.qIdx]; where = x.node + '#' + x.qIdx; }
    else if (x.file === 'comp_oe') { const p = bank[x._i]; target = (x.qIdx == null) ? p : (p && p.questions[x.qIdx]); where = 'comp_oe#' + x._i + (x.qIdx == null ? '' : '/q' + x.qIdx); }
    else { target = bank[x._i]; where = x.file + '#' + x._i; }
    if (!target) { stats.bad.push(f + ': 找不到 ' + where); continue; }
    if (!fix || typeof fix !== 'object') {
      if (x.severity === 'high' && !/nodes|comp_oe/.test(x.file)) { toDelete[x.file] = toDelete[x.file] || new Set(); toDelete[x.file].add(x._i); }
      else stats.unfixable.push(`${x.severity} ${where}: ${x.issue}`);
      continue;
    }
    Object.keys(fix).forEach(k => { target[k] = fix[k]; });
    // 校验
    if (target.opts) {
      if (!Array.isArray(target.opts) || target.opts.length !== 4 || new Set(target.opts).size !== 4) stats.bad.push(where + ': 选项不是 4 个不重复 ' + JSON.stringify(target.opts));
      if (typeof target.ans !== 'number' || target.ans < 0 || target.ans > 3) stats.bad.push(where + ': ans 越界 ' + target.ans);
    }
    stats.applied++;
  }
}
// 删题 (从后往前)
Object.keys(toDelete).forEach(file => {
  const bank = banks[MAP[file]]; const idx = [...toDelete[file]].sort((a, b) => b - a);
  idx.forEach(i => { bank.splice(i, 1); stats.deleted++; });
  console.log('删题', file, idx.join(','));
});
// Cloze 答案位置偏置: 数据层洗牌 (渲染时本来也会洗, 双保险)
let seed = 20261003; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
['CLOZE_QUESTIONS', 'GRAMMAR_QUESTIONS', 'SST_QUESTIONS', 'SCIENCE_MCQ'].forEach(v => {
  const pos = [0, 0, 0, 0];
  banks[v].forEach(q => {
    if (!Array.isArray(q.opts) || q.opts.length !== 4) return;
    const correct = q.opts[q.ans];
    for (let i = 3; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [q.opts[i], q.opts[j]] = [q.opts[j], q.opts[i]]; }
    q.ans = q.opts.indexOf(correct); pos[q.ans]++;
  });
  console.log(v, '答案位置分布', pos.join('/'));
});

// 回写: 找 const NAME = <[ 或 {> ... 配对的收尾, 跳过字符串和注释
function spanOf(name) {
  const head = 'const ' + name + ' = ';
  const i = src.indexOf(head); if (i < 0) throw new Error('no ' + name);
  let p = i + head.length; const open = src[p]; const close = open === '[' ? ']' : '}';
  let depth = 0, inStr = null, j = p;
  for (; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inStr) { if (c === '\\') { j++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '/' && n === '/') { j = src.indexOf('\n', j); continue; }
    if (c === '/' && n === '*') { j = src.indexOf('*/', j) + 1; continue; }
    if (c === '[' || c === '{') depth++;
    if (c === ']' || c === '}') { depth--; if (depth === 0) return [p, j + 1]; }
  }
  throw new Error('unbalanced ' + name);
}
const names = [...new Set(Object.values(MAP))];
// 从后往前替换, 位置不互相影响
const spans = names.map(n => ({ n, s: spanOf(n) })).sort((a, b) => b.s[0] - a.s[0]);
for (const { n, s } of spans) src = src.slice(0, s[0]) + JSON.stringify(banks[n]) + src.slice(s[1]);
fs.writeFileSync(P, src);
console.log(JSON.stringify({ applied: stats.applied, deleted: stats.deleted, skippedGlobal: stats.skippedGlobal, bad: stats.bad.length, unfixable: stats.unfixable.length }));
stats.bad.forEach(b => console.log('  BAD', b));
stats.unfixable.forEach(u => console.log('  未修', u));
