# -*- coding: utf-8 -*-
# 英文预考 2024-2026: Booklet A 选择题 / 语法填空 / 改错 / 综合填空 / 句式转换 页 整页 OCR → eng_full.json
import os, json, glob
from multiprocessing import Pool
D = r'C:\Users\Eric\Desktop\P6预考卷Prelim_十大名校_2024-2026\英文'
pj = json.load(open(r'C:\claude\chamui-psle\tools\papers\pages.json', encoding='utf-8'))
pre = {os.path.basename(k): v for k, v in pj.items()}
WANT = {'eng_bktA_grammar', 'eng_bktA_vocab', 'eng_bktA_vocabcloze', 'eng_bktA_visual', 'eng_gcloze', 'eng_editing', 'eng_compcloze', 'eng_synthesis'}


def work(job):
    import pypdfium2 as pdfium
    from rapidocr_onnxruntime import RapidOCR
    global _ocr
    try: _ocr
    except NameError: _ocr = RapidOCR(intra_op_num_threads=1, inter_op_num_threads=1)
    p, pages = job
    pdf = pdfium.PdfDocument(p); out = {}
    for i, lab in pages:
        img = pdf[i].render(scale=1.6).to_pil()
        res, _ = _ocr(img)
        lines = sorted((r for r in (res or [])), key=lambda r: (round(r[0][0][1] / 12), r[0][0][0]))
        out[i + 1] = {'label': lab, 'text': '\n'.join(r[1] for r in lines)}
    return p, out


if __name__ == '__main__':
    jobs = []
    for f in sorted(glob.glob(D + r'\*.pdf')):
        b = os.path.basename(f)
        if b not in pre: continue
        pages = [(pg['p'] - 1, pg['label']) for pg in pre[b]['pages'] if pg['label'] in WANT]
        if pages: jobs.append((f, pages))
    print('papers', len(jobs), 'pages', sum(len(j[1]) for j in jobs), flush=True)
    out = {}
    with Pool(6) as pool:
        for k, (p, v) in enumerate(pool.imap_unordered(work, jobs), 1):
            out[os.path.basename(p)] = v
            print(k, os.path.basename(p), len(v), flush=True)
    json.dump(out, open('eng_full.json', 'w', encoding='utf-8'), ensure_ascii=False)
    print('done')
