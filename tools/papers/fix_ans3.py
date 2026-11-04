# -*- coding: utf-8 -*-
# 人工看联系表确认的答案页范围 → pages.json; 清掉对应 keys.json 旧条目 / 旧图 / 旧转录, 待重跑 extract_keys
import json, os, glob
SP = os.path.dirname(os.path.abspath(__file__))
DESK = 'C:/Users/Eric/Desktop/P6顶尖小学真题2025/'.replace('/', chr(92))
ANS = {'英文': 'eng_answers', '科学': 'sci_answers', '华文': 'cn_answers', '数学': 'math_answers'}
SUBJ = {'英文': 'eng', '科学': 'sci', '华文': 'cn', '数学': 'math'}
FIX = [('华文','南华',2023,21,22),('数学','公教',2026,35,38),('数学','南洋小学',2026,43,54),('数学','红卍字',2026,35,38),
 ('科学','ACS Primary',2024,41,44),('科学','南华',2024,39,44),('科学','爱同',2026,45,50),('科学','红卍字',2026,41,42),
 ('华文','红卍字',2023,21,22),('数学','南洋小学',2023,39,48),('数学','爱同',2026,35,40),('数学','美以美女小',2023,37,43),
 ('科学','公教',2023,49,52),('科学','圣尼各拉女校',2026,35,38),('科学','红卍字',2023,41,44),('科学','美以美女小',2026,39,42),
 ('数学','Temasek',2023,35,39),('数学','南洋小学',2024,43,52),('数学','红卍字',2023,35,38),('数学','美以美女小',2026,37,42),
 ('科学','公教',2026,39,42),('科学','新加坡华中女校 SCGS',2023,35,35),('科学','红卍字',2025,43,47),('英文','红卍字',2023,27,29),
 ('数学','南华',2026,39,46),('数学','莱佛士女小',2026,37,39),('数学','圣尼各拉女校',2026,47,49),('数学','道南',2026,33,36),
 ('科学','美以美女小',2023,37,39),('华文','美以美女小',2026,27,29),('科学','ACS Junior',2026,37,38)]
pages = json.load(open(os.path.join(SP, 'pages.json'), encoding='utf-8')); keys = json.load(open(os.path.join(SP, 'keys.json'), encoding='utf-8'))
for s, sch, y, a, b in FIX:
    src = DESK + s + chr(92) + f'{sch}_{y}_P6_{s}_Prelim.pdf'
    assert src in pages, src
    for pg in pages[src]['pages']:
        if a <= pg['p'] <= b: pg['label'] = ANS[s]
        elif pg['label'] == ANS[s]: pg['label'] = 'unknown'
    for k, v in list(keys.items()):
        if v['subj'] == SUBJ[s] and v['school'] == sch and v.get('year', 2025) == y:
            slug = v['slug']
            for f in glob.glob(f'C:/claude/chamui-papers/public/{y}/{v["subj"]}/{slug}_ans*.jpg') + glob.glob(os.path.join(SP, 'anskeys', f'{v["subj"]}_{slug}{"" if y == 2025 else "_" + str(y)}_ans*.jpg')): os.remove(f)
            mf = os.path.join(SP, 'keys_manual', f'{v["subj"]}_{slug}{"" if y == 2025 else "_" + str(y)}.json')
            if os.path.exists(mf): os.remove(mf)
            del keys[k]
    print('fixed', s, sch, y, a, b)
json.dump(pages, open(os.path.join(SP, 'pages.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
json.dump(keys, open(os.path.join(SP, 'keys.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(FIX), 'papers')
