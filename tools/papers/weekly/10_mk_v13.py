# -*- coding: utf-8 -*-
# v13: 第 7 周起 科学每周只留一份整卷 (去掉小测 / 假期第二份), 英文 2 + 科学 1 + 数或华隔周 1 = 4 份. 第 1-6 周不动.
import re, copy
from docx import Document
SRC = r'C:\Users\Eric\Desktop\佑子P6每周卷子清单_v12.docx'
OUT = r'C:\Users\Eric\Desktop\佑子P6每周卷子清单_v13.docx'
d = Document(SRC)
HRS = {'英文': 1.83, '数学': 2.5, '科学': 1.75, '华文': 1.67}


def hours(row_cells):
    sub, lab, tl = row_cells[1], row_cells[2], row_cells[4]
    if lab.startswith('机动'): return 1.0
    if '小测' in lab or '约50分钟' in tl: return 0.83
    return HRS.get(sub, 1.5)


def set_text(p, new):
    for r in p.runs[1:]: r.text = ''
    if p.runs: p.runs[0].text = new
    else: p.add_run(new)


# ---- 前言 ----
for p in d.paragraphs:
    if p.text.startswith('佑子 P6 每周卷子清单 v12'): set_text(p, '佑子 P6 每周卷子清单 v13')
    if p.text.startswith('v12 改动：'):
        np_ = copy.deepcopy(p._p); p._p.addnext(np_)
        from docx.text.paragraph import Paragraph
        set_text(Paragraph(np_, p._parent), 'v13 改动：第 7 周起每周 4 份 = 英文 2 + 科学 1 + 数学或华文隔周 1。科学去掉学期小测和假期第二份，只留一份预考整卷。第 1–6 周已打印，不动。')
    if p.text.startswith('1. 比例：英文、科学每周两份'):
        set_text(p, '1. 比例：第 1–6 周寒假 6 份（英 2 科 2 数 1 华 1）；第 7 周起每周 4 份：英文 2、科学 1、数学或华文隔周 1，空的那周只做错题（数学加 20 分钟速算，华文加读一篇）。')
    if p.text.startswith('2. 上学周英文、科学 = 一份预考整卷 + 一份学期小测'):
        set_text(p, '2. 英文：上学周 = 一份预考整卷 + 一份学期小测，假期 = 两份整卷，满足老师“Paper 2 每周一套”。科学：每周一份预考整卷。')
for s in d.sections:
    for p in s.header.paragraphs:
        if 'v12' in p.text: set_text(p, p.text.replace('v12', 'v13'))

# ---- 时间表 (第一张表) 科学列 ----
t0 = d.tables[0]
hdr = t0.rows[0].cells
for c in hdr:
    if c.text.startswith('科学'): c.text = '科学（每周 1）'
for r in t0.rows[1:]:
    wk = r.cells[0].text.strip()
    sci = r.cells[3]
    txt = sci.text
    if wk.startswith(('1', '2', '3', '4', '5', '6')) and '–6' in wk or wk == '1–6':
        continue
    new = re.sub(r'\s*\+\s*(小测 WA[12]|P5 2025 整卷|小测|整卷二刷)', '', txt)
    if new != txt: sci.text = new

# ---- 各周表: 第 7 周起去掉科学第二份 ----
heads = [p for p in d.paragraphs if p.text.startswith('第 ') and '周' in p.text[:6]]
ti = 1; removed = []
for hp in heads:
    n = int(re.match(r'第 (\d+) 周', hp.text).group(1))
    if '约 0 小时' in hp.text: continue
    t = d.tables[ti]; ti += 1
    if n >= 7:
        sci_rows = [r for r in t.rows[1:] if r.cells[1].text == '科学']
        if len(sci_rows) >= 2:
            keep = next((r for r in sci_rows if r.cells[2].text.startswith(('P6 预考', 'PSLE'))), sci_rows[0])
            for r in sci_rows:
                if r is not keep:
                    removed.append((n, r.cells[2].text)); t._tbl.remove(r._tr)
    # 重算小时
    h = round(sum(hours([c.text for c in r.cells]) for r in t.rows[1:]))
    set_text(hp, re.sub(r'本周做卷约 \d+ 小时', f'本周做卷约 {h} 小时', hp.text))
d.save(OUT)
print('removed', len(removed)); [print(' ', x) for x in removed]
