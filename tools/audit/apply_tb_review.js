// 把评审团对 TECHNIQUE_BOOK 的 fix 应用回 data.js (loc 形如 eng.cloze.steps[2] / eng.cloze.paper / sci.mcq.template)
const fs = require('fs'), vm = require('vm');
const D = 'C:/Users/Eric/AppData/Local/Temp/claude/C--claude/4d3b5a33-ae7b-463a-a034-619c43f80a39/scratchpad/review2/';
const P = 'C:/claude/chamui-psle/data.js';
let src = fs.readFileSync(P, 'utf8');
const w = {};
vm.runInContext(src, vm.createContext({ window: w, document: {}, localStorage: { getItem: () => null, setItem: () => {} }, console }));
const TB = JSON.parse(JSON.stringify(w.TECHNIQUE_BOOK));
const files = process.argv.slice(2);
const stats = { applied: 0, skipped: [], bySev: {} };
for (const f of files) {
  if (!fs.existsSync(D + f)) { console.log('缺', f); continue; }
  const rv = JSON.parse(fs.readFileSync(D + f, 'utf8'));
  for (const v of rv.verdict || []) {
    if (v.ok || v.fix == null) continue;
    stats.bySev[v.severity] = (stats.bySev[v.severity] || 0) + 1;
    const m = /^(eng|sci|math|cn)\.([a-z_]+)\.([a-z]+)(?:\[(\d+)\])?$/.exec(String(v.loc).trim());
    if (!m) { stats.skipped.push(v.loc + ' (loc 解析失败)'); continue; }
    const [, subj, mod, field, idx] = m;
    const M = TB[subj] && TB[subj].mods[mod];
    if (!M) { stats.skipped.push(v.loc + ' (模块不存在)'); continue; }
    if (idx != null) {
      if (!Array.isArray(M[field])) { stats.skipped.push(v.loc + ' (字段不是数组)'); continue; }
      if (typeof v.fix === 'string') { M[field][+idx] = v.fix; stats.applied++; }
      else if (Array.isArray(v.fix)) { M[field] = v.fix; stats.applied++; }   // 有的评审给整个数组
      else stats.skipped.push(v.loc + ' (fix 类型不对)');
    } else {
      if (Array.isArray(M[field]) && Array.isArray(v.fix)) { M[field] = v.fix; stats.applied++; }
      else if (typeof M[field] === 'string' && typeof v.fix === 'string') { M[field] = v.fix; stats.applied++; }
      else if (Array.isArray(M[field]) && typeof v.fix === 'string') { M[field].push(v.fix); stats.applied++; }   // 补一条
      else stats.skipped.push(v.loc + ' (类型不匹配)');
    }
  }
}
// 回写: 找 const TECHNIQUE_BOOK = { ... }; 的配对范围
function spanOf(name) {
  const head = 'const ' + name + ' = ';
  const i = src.indexOf(head); if (i < 0) throw new Error('no ' + name);
  let p = i + head.length, depth = 0, inStr = null, j = p;
  for (; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inStr) { if (c === '\\') { j++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '/' && n === '/') { j = src.indexOf('\n', j); continue; }
    if (c === '/' && n === '*') { j = src.indexOf('*/', j) + 1; continue; }
    if (c === '[' || c === '{') depth++;
    if (c === ']' || c === '}') { depth--; if (depth === 0) return [p, j + 1]; }
  }
  throw new Error('unbalanced');
}
const s = spanOf('TECHNIQUE_BOOK');
src = src.slice(0, s[0]) + JSON.stringify(TB) + src.slice(s[1]);
fs.writeFileSync(P, src);
console.log(JSON.stringify(stats));
