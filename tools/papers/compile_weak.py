# -*- coding: utf-8 -*-
# 按孩子薄弱模块从各校卷子抽页 → 每科一份汇编 PDF (书签: 模块 → 学校) + 一份总汇编 + 目录 index.json
import os, json
from pypdf import PdfReader, PdfWriter
SP = os.path.dirname(os.path.abspath(__file__))
DESK = r'C:\Users\Eric\Desktop\P6顶尖小学真题2025'
pages = json.load(open(os.path.join(SP, 'pages.json'), encoding='utf-8'))
PLAN = {
    '英文': [
        ('1 Booklet A 选择题 (语法 / 词汇 / 词汇填空 / 看图) — 校考 16/25 最弱', ['eng_bktA_grammar', 'eng_bktA_vocab', 'eng_bktA_vocabcloze', 'eng_bktA_visual']),
        ('2 语法填空 Grammar Cloze — 时态病根', ['eng_gcloze']),
        ('3 改错 Editing — 时态 / 拼写', ['eng_editing']),
        ('4 综合填空 Comprehension Cloze — 4 错 3 是时态', ['eng_compcloze']),
        ('5 句型转换 Synthesis', ['eng_synthesis']),
        ('6 阅读问答 Comprehension OE — 读题不准', ['eng_compoe']),
        ('7 写作题目 (情境写作 + 作文) — 时态 / 中式英语 / 词性', ['eng_sw', 'eng_cw']),
        ('8 各校答案页', ['eng_answers']),
    ],
    '科学': [
        ('1 Booklet B 开放题 — 每 ½ 分一个关键词 + 因果链到底 (校考 32/40)', ['sci_bktB']),
        ('2 各校答案页', ['sci_answers']),
    ],
    '华文': [
        ('1 作文题 (命题 / 看图) — 校考 32/40 相对最弱', ['cn_compo']),
        ('2 阅读理解二 (开放题)', ['cn_p2_oe']),
        ('3 各校答案页', ['cn_answers']),
    ],
}
index = {}
def build(subject, writer, outline_parent=None):
    rows = []
    for title, labs in PLAN[subject]:
        start_total = len(writer.pages)
        node = None
        for key, info in pages.items():
            if info.get('subject') != subject or 'pages' not in info: continue
            sel = [p['p'] for p in info['pages'] if p['label'] in labs]
            if not sel: continue
            reader = PdfReader(key)
            first = len(writer.pages)
            for pn in sel: writer.add_page(reader.pages[pn - 1])
            if node is None: node = writer.add_outline_item(title, start_total, parent=outline_parent)
            writer.add_outline_item(f"{info['school']} ({len(sel)} 页)", first, parent=node)
            rows.append({'module': title, 'school': info['school'], 'pages': len(sel), 'src_pages': sel, 'at': first + 1})
        if len(writer.pages) == start_total:
            rows.append({'module': title, 'school': '—', 'pages': 0, 'note': '没有识别到这一节'})
    return rows
total = PdfWriter()
for subject in ['英文', '科学', '华文']:
    w = PdfWriter()
    rows = build(subject, w)
    fn = os.path.join(DESK, f'薄弱模块汇编_{subject}_2025Prelim_v1.pdf')
    with open(fn, 'wb') as f: w.write(f)
    index[subject] = {'file': fn, 'pages': len(w.pages), 'bytes': os.path.getsize(fn), 'rows': rows}
    print(subject, len(w.pages), '页', os.path.getsize(fn) // 1048576, 'MB')
    node = total.add_outline_item(subject, len(total.pages))
    build(subject, total, node)
fn = os.path.join(DESK, '薄弱模块汇编_总_2025Prelim_v1.pdf')
with open(fn, 'wb') as f: total.write(f)
index['总'] = {'file': fn, 'pages': len(total.pages), 'bytes': os.path.getsize(fn)}
print('总', len(total.pages), '页', os.path.getsize(fn) // 1048576, 'MB')
json.dump(index, open(os.path.join(SP, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
