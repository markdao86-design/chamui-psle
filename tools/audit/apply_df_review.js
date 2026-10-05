// 应用评审 (loc = df:<id>.<field> 或 df:<id>.q.ans 之类) 到 data.js 的 DAILY_FOCUS; 也可用 --add <file.json> 追加新条目
const fs = require('fs'), vm = require('vm');
const D = 'C:/Users/Eric/AppData/Local/Temp/claude/C--claude/4d3b5a33-ae7b-463a-a034-619c43f80a39/scratchpad/review2/';
const P = 'C:/claude/chamui-psle/data.js';
let src = fs.readFileSync(P, 'utf8');
const w = {};
vm.runInContext(src, vm.createContext({ window: w, document: {}, localStorage: { getItem: () => null, setItem: () => {} }, console }));
let list = JSON.parse(JSON.stringify(w.DAILY_FOCUS));
const stats = { applied: 0, skipped: [], added: 0, dropped: [] };
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--add') { const f = args[++i]; const arr = JSON.parse(fs.readFileSync(f.startsWith('C:') ? f : D + f, 'utf8')); const have = new Set(list.map(e => e.id)); arr.forEach(e => { if (!have.has(e.id)) { list.push(e); have.add(e.id); stats.added++; } }); continue; }
  const f = args[i]; if (!fs.existsSync(D + f)) { console.log('缺', f); continue; }
  const rv = JSON.parse(fs.readFileSync(D + f, 'utf8'));
  for (const v of rv.verdict || []) {
    if (v.ok) continue;
    const m = /^df:([A-Za-z0-9_]+)(?:\.(.+))?$/.exec(String(v.loc).trim());
    if (!m) { stats.skipped.push(v.loc); continue; }
    const e = list.find(x => x.id === m[1]); if (!e) { stats.skipped.push(v.loc + ' (无此 id)'); continue; }
    if (v.fix == null) { if (v.severity === 'high') { e._drop = true; stats.dropped.push(m[1] + ': ' + v.issue); } continue; }
    const path = m[2] ? m[2].split('.') : null;
    if (!path) { if (typeof v.fix === 'object') Object.assign(e, v.fix); stats.applied++; continue; }
    if (path.length === 1) { e[path[0]] = v.fix; stats.applied++; }
    else { let o = e; for (let k = 0; k < path.length - 1; k++) { o = o[path[k]] = o[path[k]] || {}; } o[path[path.length - 1]] = v.fix; stats.applied++; }
  }
}
list = list.filter(e => !e._drop);
// 校验
const bad = [];
list.forEach(e => {
  if (!e.id || !e.q) { bad.push((e.id || '?') + ' no q'); return; }
  if (e.q.type === 'mcq') { if (!Array.isArray(e.q.opts) || e.q.opts.length < 3 || e.q.opts.length > 4 || new Set(e.q.opts).size !== e.q.opts.length || typeof e.q.ans !== 'number' || e.q.ans < 0 || e.q.ans >= e.q.opts.length) bad.push(e.id + ' opts'); }
  else { e.q.opts = []; if (typeof e.q.ans !== 'string') bad.push(e.id + ' ans'); }
  if (!Array.isArray(e.steps) || !e.steps.length || !Array.isArray(e.takeaways) || !e.takeaways.length) bad.push(e.id + ' steps/takeaways');
  if (e.template == null) e.template = '';
});
if (bad.length) { console.log('BAD', bad); process.exit(1); }
const re = /const DAILY_FOCUS = \[[\s\S]*?\];\nwindow\.DAILY_FOCUS = DAILY_FOCUS;/;
src = src.replace(re, 'const DAILY_FOCUS = ' + JSON.stringify(list) + ';\nwindow.DAILY_FOCUS = DAILY_FOCUS;');
fs.writeFileSync(P, src);
console.log(JSON.stringify(stats), 'total', list.length, 'eng', list.filter(e => e.subj === 'eng').length, 'sci', list.filter(e => e.subj === 'sci').length);
