# -*- coding: utf-8 -*-
# 从 OCR 文本里抽 Booklet A 选择题 (题干 + 四选项), 再按考点分类
import json, re, collections
d = json.load(open('eng_full.json', encoding='utf-8'))
items = []
for paper, pages in d.items():
    for pg, v in pages.items():
        if v['label'] not in ('eng_bktA_grammar', 'eng_bktA_vocab', 'eng_bktA_vocabcloze', 'eng_bktA_visual'):
            continue
        txt = v['text'].replace('\n', ' ')
        # 选项块: (1) xxx (2) xxx (3) xxx (4) xxx
        for m in re.finditer(r'\(1\)\s*(.{1,40}?)\s*\(2\)\s*(.{1,40}?)\s*\(3\)\s*(.{1,40}?)\s*\(4\)\s*(.{1,40}?)(?=\s+\d{1,2}[\.\s]|\s+\(1\)|$)', txt):
            opts = [o.strip(' .|') for o in m.groups()]
            stem = txt[max(0, m.start() - 260):m.start()]
            qn = re.findall(r'(?:^|\s)(\d{1,2})[\.\s]', stem)
            items.append(dict(paper=paper.replace('_P6_英文_Prelim.pdf', ''), page=int(pg), label=v['label'], q=(qn[-1] if qn else '?'), stem=stem[-220:], opts=opts))
print('items', len(items))
CATS = {
  'Q10 时态(last/ago/since)': lambda it: re.search(r'\b(last (year|week|month|night)|ago|since|yesterday|so far|already)\b', it['stem'], re.I) and any(re.search(r'\b(ha(s|ve|d)|was|were|is|are)\b', o) for o in it['opts']),
  'Q12 letter of / commend': lambda it: re.search(r'letter of|commend|praise', it['stem'] + ' '.join(it['opts']), re.I),
  'Q17 assemble/piece': lambda it: any(re.search(r'assembl|piec|put together|link', o, re.I) for o in it['opts']),
  'Q18 fond/cherish/vivid': lambda it: any(re.search(r'\bfond|cherish|vivid|treasur', o, re.I) for o in it['opts']),
  'Q19 outing/excursion/journey': lambda it: any(re.search(r'outing|excursion|journey|expedition|trip\b', o, re.I) for o in it['opts']),
  'Q23 purpose': lambda it: re.search(r'purpose|aims? to', it['stem'], re.I),
  'Q24 ensure': lambda it: re.search(r'ensure|make sure', it['stem'], re.I),
  'Q48 unable/impossible': lambda it: any(re.search(r'^(unable|impossible|incapable)', o, re.I) for o in it['opts']),
  'Q52 demand/need for': lambda it: re.search(r'\bfor\b', it['stem'][-30:], re.I) and any(re.search(r'demand|need|request|call', o, re.I) for o in it['opts']),
}
for cat, f in CATS.items():
    hits = [it for it in items if f(it)]
    print('\n####', cat, len(hits))
    for it in hits[:8]:
        print(f"  - {it['paper']} p{it['page']} Q{it['q']} [{it['label'][9:]}] 题干…{it['stem'][-150:]} || 选项 {it['opts']}")
json.dump(items, open('bktA_items.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
