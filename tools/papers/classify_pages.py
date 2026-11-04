# -*- coding: utf-8 -*-
# 对每份试卷每页 OCR (上半页), 按 PSLE 卷面结构给每页贴模块标签 → pages.json
import os, re, json, sys, time
import pypdfium2 as pdfium
from rapidocr_onnxruntime import RapidOCR
DESK = r'C:\Users\Eric\Desktop\P6顶尖小学真题2025'
ONLY = sys.argv[1] if len(sys.argv) > 1 else None
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ('pages_' + ONLY + '.json') if ONLY else 'pages.json')
import glob
man = []
for sub in ([ONLY] if ONLY else ['英文', '科学', '华文', '数学']):
    for f in sorted(glob.glob(os.path.join(DESK, sub, '*.pdf'))):
        if os.path.getsize(f) > 100000: man.append({'status': 'ok', 'file': f, 'subject': sub, 'school': os.path.basename(f).split('_')[0]})
ocr = RapidOCR()
done = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}

def norm(s): return re.sub(r'\s+', '', s).lower()

# ---- 英文: 按题号范围 / 标题 ----
ENG_RULES = [
    # 顺序: 先具体题号 / 答案页模板, 最后才是 Booklet A/B 封面兜底
    ('eng_answers', r'answerkey|answerscheme|markingscheme|suggestedanswer|q66\)|q26\)|q36\)|q46\)|q61\)|school:.*subject.*term'),
    ('eng_sw', r'situationalwriting|part1.*14marks'),
    ('eng_cw', r'continuouswriting|part2.*36marks|atleast150words'),
    ('eng_compoe', r'66to75|from66|questions66|refertothepassage|comprehensionopen-?ended'),
    ('eng_synthesis', r'synthesis|61to65|transformation|rewritethegiven'),
    ('eng_compcloze', r'46to60|numbered46|comprehensioncloze|fillineachblankwithasuitableword|\(15marks\)'),
    ('eng_editing', r'36to45|editing|spellingandgrammar|spellingorgrammar|spellingorgrammatical'),
    ('eng_gcloze', r'numbered26to35|26to35|grammarcloze'),
    ('eng_bktA_visual', r'from21to25|21to25|text1|text2|studytheposter|studytheadvertisement'),
    ('eng_bktA_vocabcloze', r'from16to20|16to20'),
    ('eng_bktA_vocab', r'from11to15|11to15'),
    ('eng_bktA_grammar', r'from1to10|1to10,'),
    ('eng_bktB_front', r'booklet\s*b'),
    ('eng_bktA_front', r'booklet\s*a'),
]
SCI_RULES = [
    ('sci_answers', r'answerkey|answerscheme|markingscheme|suggestedanswer|school:?.*level.*subject|q1q2q3q4|q1\)|q26\)|q29\)|q31\)'),
    ('sci_bktB', r'booklet\s*b|sectionb|open-?ended|structuredquestions|\(bookletb\)'),
    ('sci_bktA', r'booklet\s*a|sectiona|multiple-?choice|\(bookleta\)'),
]
CN_RULES = [
    ('cn_answers', r'参考答案|答案卷|评分标准|answerkey|suggestedanswer|school:?.*level.*subject|q1q2q3q4|q1\)|q26\)|q29\)|q31\)'),
    ('cn_ansbook', r'作答簿|作答薄|answerbooklet'),
    ('cn_p2_front', r'paper2|试卷（二）|试卷二|试卷\(二\)|试卷2'),
    ('cn_compo', r'试卷一|试卷（一）|作文|命题作文|看图作文|字数在100|不少过100|不少于100|只需选做一题'),
    ('cn_p2_oe', r'阅读理解二|阅读理解（二）|根据短文和上下文的意思，回答问题|书面互动'),
    ('cn_p2_mcq', r'语文应用|短文填空|阅读理解一|阅读理解（一）|完成对话|选出最适当|选出适当的答案'),
]
MATH_RULES = [
    ('math_answers', r'answerkey|answerscheme|markingscheme|suggestedanswer|school:?.*level.*subject|q1q2q3q4|q1\)|q26\)|q29\)|q31\)|paper1q1|paper2q1'),
    ('math_p2', r'paper2|booklet\s*b|calculator(s)?(are)?allowed|questions6to17|questions6to16|questions1to5'),
    ('math_p1', r'paper1|booklet\s*a|calculator(s)?(are)?notallowed|donotusecalculator|questions1to15'),
]
RULES = {'英文': ENG_RULES, '科学': SCI_RULES, '华文': CN_RULES, '数学': MATH_RULES}

def label_page(sub, text, prev):
    t = norm(text)
    for lab, rx in RULES[sub]:
        if re.search(rx, t): return lab
    return prev   # 没有标题就承接上一页

def qnums(text):
    # 页面里出现的题号 (行首数字.)
    return [int(m) for m in re.findall(r'(?m)^\s*(\d{1,2})[\.\)]', text) if 1 <= int(m) <= 99]

for m in man:
    if m.get('status') != 'ok': continue
    key = m['file']
    if key in done: continue
    sub = m['subject']
    try:
        pdf = pdfium.PdfDocument(key)
    except Exception as e:
        done[key] = {'error': str(e)}; continue
    pages = []; prev = sub + '_front'; t0 = time.time()
    for i in range(len(pdf)):
        img = pdf[i].render(scale=1.25).to_pil()
        w, h = img.size
        res, _ = ocr(img.crop((0, 0, w, int(h * 0.45))))
        lines = [r[1] for r in (res or [])]
        text = '\n'.join(lines)
        lab = label_page(sub, text, prev)
        # 英文 Booklet A 子项按题号细分 (标题常只在第一页)
        if sub == '英文' and lab in ('eng_bktA_grammar', 'eng_bktA_front', '英文_front'):
            qs = qnums(text)
            if any(21 <= q <= 25 for q in qs): lab = 'eng_bktA_visual'
            elif any(16 <= q <= 20 for q in qs): lab = 'eng_bktA_vocabcloze'
            elif any(11 <= q <= 15 for q in qs): lab = 'eng_bktA_vocab'
        if sub == '科学' and lab == '科学_front':
            qs = qnums(text)
            if qs and all(q <= 30 for q in qs): lab = 'sci_bktA'
        pages.append({'p': i + 1, 'label': lab, 'head': text[:120].replace('\n', ' | ')})
        prev = lab
    done[key] = {'subject': sub, 'school': m['school'], 'n': len(pdf), 'pages': pages, 'secs': round(time.time() - t0, 1)}
    json.dump(done, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('classified', sub, m['school'], len(pdf), 'pages', round(time.time() - t0, 1), 's', flush=True)
print('ALL DONE', len(done))
