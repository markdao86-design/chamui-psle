# -*- coding: utf-8 -*-
# papers_2025.json + pages.json + keys.json → data.js 里的 PAPERS_2025 (标记块可重复生成)
import os, json, io, re
SP = os.path.dirname(os.path.abspath(__file__))
papers = [dict(p, year=2025, top10=True) for p in json.load(open(r'C:\claude\chamui-papers\papers_2025.json', encoding='utf-8'))]
if os.path.exists(r'C:\claude\chamui-papers\papers_more.json'): papers += [p for p in json.load(open(r'C:\claude\chamui-papers\papers_more.json', encoding='utf-8')) if p.get('status') == 'ok']
pages = json.load(open(os.path.join(SP, 'pages.json'), encoding='utf-8'))
keys = json.load(open(os.path.join(SP, 'keys.json'), encoding='utf-8')) if os.path.exists(os.path.join(SP, 'keys.json')) else {}
SEC = {
    'eng': [('bktA', 'Booklet A 选择题 1-25', ['eng_bktA_grammar', 'eng_bktA_vocab', 'eng_bktA_vocabcloze', 'eng_bktA_visual']), ('gcloze', 'Grammar Cloze 26-35', ['eng_gcloze']), ('editing', 'Editing 36-45', ['eng_editing']), ('compcloze', 'Comprehension Cloze 46-60', ['eng_compcloze']), ('synthesis', 'Synthesis 61-65', ['eng_synthesis']), ('compoe', 'Comprehension OE 66-75', ['eng_compoe']), ('writing', 'Paper 1 写作', ['eng_sw', 'eng_cw']), ('answers', '答案', ['eng_answers'])],
    'sci': [('bktA', 'Booklet A 选择题', ['sci_bktA']), ('bktB', 'Booklet B 开放题', ['sci_bktB']), ('answers', '答案', ['sci_answers'])],
    'cn': [('compo', '作文', ['cn_compo']), ('mcq', '试卷二 选择题 1-29', ['cn_p2_mcq']), ('oe', '阅读理解二 30-40', ['cn_p2_oe']), ('ansbook', '作答簿', ['cn_ansbook']), ('answers', '参考答案', ['cn_answers'])],
    'math': [('p1', 'Paper 1', ['math_p1']), ('p2', 'Paper 2', ['math_p2']), ('answers', '答案', ['math_answers'])],
}
OE_TASK = {'eng': 'eng_comp', 'sci': 'sci_oe', 'cn': 'cn_compo', 'math': None}
out = []
for p in papers:
    info = pages.get(p['src'], {}); pg = info.get('pages', [])
    # v29.0 修: 一节的起止页 = 最长的连续页段 (原来 min..max 会把 OE 的文章页和题目页之间的 Editing / Cloze 包进去, 章节重叠)
    secs = []; plab = [''] * (info.get('n', 0) or len(pg))
    for k, label, labs in SEC[p['subj']]:
        ps = sorted(x['p'] for x in pg if x['label'] in labs)
        if not ps: continue
        for q in ps:
            if 0 < q <= len(plab): plab[q - 1] = k
        runs = []; cur = [ps[0]]
        for q in ps[1:]:
            if q == cur[-1] + 1: cur.append(q)
            else: runs.append(cur); cur = [q]
        runs.append(cur)
        best = max(runs, key=lambda r: (len(r), r[0] if k in ('compoe', 'oe', 'answers') else -r[0]))   # 等长时: OE/答案取靠后的段 (题目在后), 其他取靠前的
        secs.append({'k': k, 'label': label, 'from': best[0], 'to': best[-1], 'n': len(ps)})
    secs.sort(key=lambda s: s['from'])
    kr = keys.get(f"{p['slug']}|{p['subj']}" if p['year'] == 2025 else f"{p['slug']}|{p['subj']}|{p['year']}", {})
    if not info.get('pages'): continue   # 还没分章的先不上
    out.append({'id': f"{p['subj']}/{p['slug']}" if p['year'] == 2025 else f"{p['subj']}/{p['year']}-{p['slug']}", 'subj': p['subj'], 'school': p['school'], 'year': p['year'], 'top10': bool(p.get('top10')), 'url': p['url'], 'mb': round(p['bytes'] / 1048576, 1), 'pages': info.get('n', 0),
                'sections': secs, 'pl': ''.join({'bktA': 'A', 'gcloze': 'g', 'editing': 'e', 'compcloze': 'c', 'synthesis': 's', 'compoe': 'o', 'writing': 'w', 'answers': 'z', 'bktB': 'B', 'compo': 'w', 'mcq': 'A', 'oe': 'o', 'ansbook': 'k', 'p1': '1', 'p2': '2'}.get(x, '.') for x in plab), 'ans': {'pages': kr.get('ansPages', []), 'imgs': kr.get('ansImgs', [])},
                'mcq': {'max': kr.get('mcqMax', 0), 'key': kr.get('mcq', {}), 'ok': bool(kr.get('ok')), 'missing': kr.get('missing', [])}, 'oeTask': OE_TASK[p['subj']]})
ps = r'C:\claude\chamui-papers\psle_papers.json'
if os.path.exists(ps): out = json.load(open(ps, encoding='utf-8')) + out   # v28.3 PSLE 真题 (kind: psle) 排在前面
js = "// PAPERS_2025_BEGIN (由 build_papers_data.py 生成, 别手改)\nconst PAPERS_2025 = " + json.dumps(out, ensure_ascii=False) + ";\nwindow.PAPERS_2025 = PAPERS_2025;\n// PAPERS_2025_END\n"
d = io.open(r'C:\claude\chamui-psle\data.js', encoding='utf-8').read()
if '// PAPERS_2025_BEGIN' in d:
    d = d[:d.index('// PAPERS_2025_BEGIN')] + js + d[d.index('// PAPERS_2025_END\n') + len('// PAPERS_2025_END\n'):]
else:
    d += '\n' + js
io.open(r'C:\claude\chamui-psle\data.js', 'w', encoding='utf-8', newline='').write(d)
ok = sum(1 for o in out if o['mcq']['ok']); withsec = sum(1 for o in out if o['sections'])
print(f'PAPERS_2025: {len(out)} papers, {withsec} with sections, {ok} with complete MCQ key')
