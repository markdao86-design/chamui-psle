# -*- coding: utf-8 -*-
# papers_2025.json + pages.json + keys.json → data.js 里的 PAPERS_2025 (标记块可重复生成)
import os, json, io, re
SP = os.path.dirname(os.path.abspath(__file__))
papers = json.load(open(r'C:\claude\chamui-papers\papers_2025.json', encoding='utf-8'))
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
    secs = []
    for k, label, labs in SEC[p['subj']]:
        ps = [x['p'] for x in pg if x['label'] in labs]
        if ps: secs.append({'k': k, 'label': label, 'from': min(ps), 'to': max(ps), 'n': len(ps)})
    kr = keys.get(p['slug'] + '|' + p['subj'], {})
    out.append({'id': f"{p['subj']}/{p['slug']}", 'subj': p['subj'], 'school': p['school'], 'year': 2025, 'url': p['url'], 'mb': round(p['bytes'] / 1048576, 1), 'pages': info.get('n', 0),
                'sections': secs, 'ans': {'pages': kr.get('ansPages', []), 'imgs': kr.get('ansImgs', [])},
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
