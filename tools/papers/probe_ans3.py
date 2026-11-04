# -*- coding: utf-8 -*-
# 没找到答案页的卷: OCR 最后 12 页整页, 打印每页特征 (开头文字 / Q编号数 / 1-4 单值数), 供判断答案页起点
import json, os, re, sys
import pypdfium2 as pdfium
from rapidocr_onnxruntime import RapidOCR
SP = os.path.dirname(os.path.abspath(__file__))
part, nparts = int(sys.argv[1]), int(sys.argv[2])
pages = json.load(open(os.path.join(SP, 'pages.json'), encoding='utf-8'))
ANS = {'英文': 'eng_answers', '科学': 'sci_answers', '华文': 'cn_answers', '数学': 'math_answers'}
todo = sorted(k for k, v in pages.items() if 'pages' in v and not any(pg['label'] == ANS[v['subject']] for pg in v['pages']) and re.search(r'_(2023|2024|2026)_|_2025_', k))
more = {p['src'] for p in json.load(open(r'C:\claude\chamui-papers\papers_more.json', encoding='utf-8'))}
todo = [k for k in todo if k in more][part::nparts]
ocr = RapidOCR(); out = {}
for k in todo:
    pdf = pdfium.PdfDocument(k); n = len(pdf); rows = []
    for pn in range(max(1, n - 11), n + 1):
        img = pdf[pn - 1].render(scale=1.3).to_pil()
        res, _ = ocr(img)
        txt = [r[1] for r in (res or [])]
        joined = ' '.join(txt)
        q = len(re.findall(r'\bQ\s?\d{1,2}\b', joined, re.I)); single = sum(1 for t in txt if re.fullmatch(r'\(?[1-4]\)?', t.strip()))
        kw = re.findall(r'answer|marking|scheme|参考答案|答案|SCHOOL|LEVEL', joined, re.I)
        rows.append({'p': pn, 'q': q, 'single': single, 'kw': sorted(set(x.lower() for x in kw)), 'head': re.sub(r'\s+', ' ', joined)[:140]})
    out[k] = rows
    print('PROBED', os.path.basename(k), flush=True)
    json.dump(out, open(os.path.join(SP, f'probe3_{part}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('PROBE DONE')
