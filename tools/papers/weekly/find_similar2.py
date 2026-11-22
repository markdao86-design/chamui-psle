# -*- coding: utf-8 -*-
import json, re
d = json.load(open('eng_full.json', encoding='utf-8'))
items = json.load(open('bktA_items.json', encoding='utf-8'))


def show(title, rows, n=8):
    print('\n####', title, len(rows))
    for r in rows[:n]: print('  -', r)


def optmatch(pat):
    return [f"{it['paper']} p{it['page']} Q{it['q']} 题干…{it['stem'][-130:]} || {it['opts']}" for it in items if any(re.search(pat, o, re.I) for o in it['opts'])]


show('Q12 感谢/表扬类名词选项', optmatch(r'appreciat|gratitude|recognition|commendat|complimen|acknowledg'))
show('Q17 组装/拼类选项', optmatch(r'assembl|construct|compil|fabricat|arrang'))
show('Q18 回忆形容词', optmatch(r'^(fond|vivid|treasured|precious|lasting|faint)'))
show('Q19 出游类', optmatch(r'outing|excursion|journey|voyage|expedition|trip$'))
show('Q23/24 purpose/ensure 题干', [f"{it['paper']} p{it['page']} Q{it['q']} …{it['stem'][-160:]} || {it['opts']}" for it in items if re.search(r'purpose|ensure|aims to|intends to', it['stem'][-120:], re.I)])

# 改错 / 填空类: 按页面文本窗口
def win(labels, pat, before=120, after=160, n=8):
    out = []
    for paper, pages in d.items():
        for pg, v in pages.items():
            if v['label'] not in labels: continue
            t = v['text'].replace('\n', ' ')
            for m in re.finditer(pat, t, re.I):
                out.append(f"{paper.replace('_P6_英文_Prelim.pdf','')} p{pg} …{t[max(0,m.start()-before):m.end()+after]}")
    return out


show('Q40 改错页里 -ble/-bility 词', win({'eng_editing'}, r'\b\w+(abil|ibil|able|ible)\w*\b(?=[^|]{0,60}\(\d\d\))|\(\d\d\)[^(]{0,80}\b\w+(abil|ibil|ible|able)\w*'), 10)
show('Q42 改错页里 volunt/副词', win({'eng_editing'}, r'volunt\w*|\(\d\d\)\s*\w+\s+\w+(ful|ous|ive|ent|ant)\s+\w+(ed|s)\b'), 8)
show('Q47 hygiene', win({'eng_compcloze', 'eng_gcloze', 'eng_bktA_vocab', 'eng_bktA_grammar'}, r'hygiene'))
show('Q49 ___ up 占比', win({'eng_compcloze', 'eng_gcloze'}, r'\(\d\d\)\s*up\b|\bup (about|nearly|almost|around|\d+%)'))
show('Q50 Even', win({'eng_compcloze', 'eng_gcloze'}, r'\bEven\s*(\(\d\d\))?\s*,|\bEven so\b|\bEven then\b'))
show('Q51 which 定语从句空', win({'eng_compcloze', 'eng_gcloze'}, r',\s*(\(\d\d\))?\s*(prevents|makes|means|causes|allows|helps|leads|results|enables)\b'))
show('Q52 demand/need for', win({'eng_compcloze', 'eng_gcloze', 'eng_bktA_vocab'}, r'(demand|need|call|request)\s*(\(\d\d\))?\s*for|\(\d\d\)\s*for\s+\w+\s+(is|has|was)\s+(constantly\s+)?(rising|increasing|growing)'))
show('Q54 come by / ___ by', win({'eng_compcloze', 'eng_gcloze'}, r'(hard|harder|difficult|easy|easier)\s+to\s+(\(\d\d\))?\s*\w*\s*by\b|come by'))
show('Q58 In ___ ,', win({'eng_compcloze', 'eng_gcloze'}, r'(^|\.\s+)In\s*(\(\d\d\))?\s*,|\bIn fact\b|\bIn addition\b'))
show('Q60 awareness', win({'eng_compcloze', 'eng_gcloze', 'eng_bktA_vocab', 'eng_synthesis'}, r'\(\d\d\)\s*awareness|awareness'))
show('Q48 unable/impossible 填空', win({'eng_compcloze', 'eng_gcloze', 'eng_editing'}, r'\b(unable|impossible)\b'))
