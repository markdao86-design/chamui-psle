# -*- coding: utf-8 -*-
# v14: 第 7-35 周 数学/华文空着的那周, 把"机动·错题重做"换成一份科学小测 (用 v13 去掉的那些, 放回原周)
import re, copy
from docx import Document
from docx.text.paragraph import Paragraph
V12 = r'C:\Users\Eric\Desktop\佑子P6每周卷子清单_v12.docx'
V13 = r'C:\Users\Eric\Desktop\佑子P6每周卷子清单_v13.docx'
OUT = r'C:\Users\Eric\Desktop\佑子P6每周卷子清单_v14.docx'
HRS = {'英文': 1.83, '数学': 2.5, '科学': 1.75, '华文': 1.67}


def hours(c):
    sub, lab, tl = c[1], c[2], c[4]
    if lab.startswith('机动'): return 1.0
    if '小测' in lab or '约50分钟' in tl: return 0.83
    return HRS.get(sub, 1.5)


def set_text(p, new):
    for r in p.runs[1:]: r.text = ''
    if p.runs: p.runs[0].text = new
    else: p.add_run(new)


def week_tables(d):
    heads = [p for p in d.paragraphs if p.text.startswith('第 ') and '周' in p.text[:6]]
    out = {}; ti = 1
    for hp in heads:
        n = int(re.match(r'第 (\d+) 周', hp.text).group(1))
        if '约 0 小时' in hp.text: out[n] = (hp, None); continue
        out[n] = (hp, d.tables[ti]); ti += 1
    return out


# 1. 从 v12 收集第 7 周起的科学小测 (按周)
d12 = Document(V12); w12 = week_tables(d12)
small_by_week = {}; spare = []
for n, (hp, t) in w12.items():
    if t is None or n < 7: continue
    for r in t.rows[1:]:
        c = [x.text for x in r.cells]
        if c[1] == '科学' and '小测' in c[2]:
            small_by_week[n] = c
# 2. 全部科学小测 (含 v12 没用的) 作为备选
import os
D = r'C:\Users\Eric\Desktop'
used_paths = {c[3].replace('\n', '') for c in small_by_week.values()}
for folder, lab in (('P6第一学期测验卷Term1_十大名校_2024-2025', '第一学期小测'), ('P6第二学期测验卷Term2_十大名校_2024-2025', '第二学期小测')):
    for fn in sorted(os.listdir(os.path.join(D, folder, '科学')), key=lambda f: ('_2025_' not in f, f)):
        path = f'{folder} \\ 科学 \\ {fn}'
        if path not in used_paths and not fn.startswith('红卍字_2024'):   # 红卍字 2024 两份没有答案页
            sch, y = fn.split('_')[0], fn.split('_')[1]
            spare.append(['☐', '科学', f'{lab} · {sch} {y}', path, '按卷面 · 约50分钟', '', '☐'])
print('small from v12', len(small_by_week), 'spare', len(spare))

# 3. 在 v13 上替换机动行
d = Document(V13); w13 = week_tables(d); replaced = []
for n in range(7, 36):
    hp, t = w13[n]
    if t is None: continue
    flex = [r for r in t.rows[1:] if r.cells[3].text.startswith('【机动】')]
    if not flex: continue
    row = small_by_week.get(n)
    if row is None:
        if not spare: continue
        row = spare.pop(0)
    r = flex[0]
    for i, v in enumerate(['☐', '科学', row[2], row[3], row[4], '', '☐']):
        r.cells[i].text = v
    replaced.append((n, row[2]))
    # 科目顺序: 把科学行挪到华文/数学前? 保持原位即可
    h = round(sum(hours([x.text for x in rr.cells]) for rr in t.rows[1:]))
    set_text(hp, re.sub(r'本周做卷约 \d+ 小时', f'本周做卷约 {h} 小时', hp.text))

# 4. 文案
for p in d.paragraphs:
    if p.text.startswith('佑子 P6 每周卷子清单 v13'): set_text(p, '佑子 P6 每周卷子清单 v14')
    if p.text.startswith('v13 改动：'):
        np_ = copy.deepcopy(p._p); p._p.addnext(np_)
        set_text(Paragraph(np_, p._parent), 'v14 改动：第 7–35 周数学或华文空着的那周，把“机动·错题重做”换成一份科学小测（约 50 分钟），每周整卷仍是 4 份。')
    if p.text.startswith('1. 比例：第 1–6 周寒假 6 份'):
        set_text(p, '1. 比例：第 1–6 周寒假 6 份（英 2 科 2 数 1 华 1）；第 7 周起每周 4 份整卷：英文 2、科学 1、数学或华文隔周 1。数学或华文空着的那周加一份科学小测（约 50 分钟），错题重做放周日 40 分钟。')
    if p.text.startswith('2. 英文：上学周 = 一份预考整卷'):
        set_text(p, '2. 英文：上学周 = 一份预考整卷 + 一份学期小测，假期 = 两份整卷，满足老师“Paper 2 每周一套”。科学：每周一份预考整卷，隔周再加一份小测。')
for s in d.sections:
    for p in s.header.paragraphs:
        if 'v13' in p.text: set_text(p, p.text.replace('v13', 'v14'))
t0 = d.tables[0]
for r in t0.rows[1:]:
    wk = r.cells[0].text.strip()
    if wk in ('7–16', '17', '18–27', '28–31', '32–35'):
        r.cells[3].text = r.cells[3].text + ' + 隔周一份小测'
d.save(OUT)
print('replaced', len(replaced)); [print(' ', x) for x in replaced]
