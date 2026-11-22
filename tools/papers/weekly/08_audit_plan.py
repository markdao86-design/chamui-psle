# -*- coding: utf-8 -*-
import os, collections
from docx import Document
D = r'C:\Users\Eric\Desktop'
BS = chr(92)
doc = Document(os.path.join(D, '佑子P6每周卷子清单_v3.docx'))
paths = []; re2 = []
for t in doc.tables[1:]:
    for r in t.rows[1:]:
        (re2 if r.cells[2].text.startswith('二刷') else paths).append(r.cells[3].text.replace('\n', ''))
print('total', len(paths), 'unique', len(set(paths)))
parts = [[x.strip() for x in p.split(BS)] for p in paths]
miss = [p for p in parts if not os.path.exists(os.path.join(D, *p))]
print('missing', len(miss), miss[:3])
cat = collections.defaultdict(lambda: collections.defaultdict(set))
for folder, sub, fn in parts:
    school, year = fn.split('_')[0], fn.split('_')[1]
    k = ('P5年终' if folder.startswith('P5') else 'WA1' if 'Term1' in folder else 'WA2' if 'Term2' in folder else '预考') + year[2:]
    cat[school][k].add(sub[0])
cols = ['P5年终24', 'P5年终25', 'WA124', 'WA125', 'WA224', 'WA225', '预考24', '预考25', '预考26']
print('school|' + '|'.join(cols))
for s in ['南洋小学', '莱佛士女小', 'Henry Park', 'Rosyth', '道南', '南华', '公教', 'ACS Junior', '红卍字', '爱同']:
    print(s + '|' + '|'.join(''.join(sorted(cat[s][c], key='英数科华'.index)) or '—' for c in cols))
print(collections.Counter(p[0] for p in parts))
# unused files
for f in os.listdir(D):
    if '十大名校' in f:
        allf = {(f, s, x) for s in os.listdir(os.path.join(D, f)) if os.path.isdir(os.path.join(D, f, s)) for x in os.listdir(os.path.join(D, f, s))}
        un = allf - {tuple(p) for p in parts}
        print('unused', f, len(un), sorted(x[2] for x in un if not f.startswith('P6预考'))[:10])
print('second pass', len(re2))
seen = []
for p in re2:
    fn = p.split(chr(92))[-1].strip(); k = '_'.join(fn.split('_')[:2])
    if k not in seen: seen.append(k)
print(seen)
