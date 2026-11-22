# -*- coding: utf-8 -*-
# P5 年终考 + P6 WA1/WA2 全部卷子: 每页 OCR 上 40%, 并行, 结果并入 w1_pages.json 同格式的 all_pages.json
import os, json, glob, time, sys
from multiprocessing import Pool

D = r'C:\Users\Eric\Desktop'
OUT = 'all_pages.json'


def work(p):
    import pypdfium2 as pdfium
    from rapidocr_onnxruntime import RapidOCR
    global _ocr
    try:
        _ocr
    except NameError:
        _ocr = RapidOCR(intra_op_num_threads=1, inter_op_num_threads=1)
    pdf = pdfium.PdfDocument(p); heads = []
    for i in range(len(pdf)):
        img = pdf[i].render(scale=0.9).to_pil(); w, h = img.size
        res, _ = _ocr(img.crop((0, 0, w, int(h * 0.4))))
        heads.append(' | '.join(r[1] for r in (res or []))[:220])
    return p, {'n': len(pdf), 'pages': heads}


if __name__ == '__main__':
    done = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
    old = json.load(open('w1_pages.json', encoding='utf-8'))
    for k, v in old.items():
        done.setdefault(k, {'n': v['n'], 'pages': v['pages']})
    fs = glob.glob(D + r'\P5年终考卷*\*\*.pdf') + glob.glob(D + r'\P6第*学期*\*\*.pdf')
    todo = [f for f in fs if f not in done]
    print('todo', len(todo), flush=True)
    t0 = time.time()
    with Pool(6) as pool:
        for k, (p, v) in enumerate(pool.imap_unordered(work, todo), 1):
            done[p] = v
            if k % 5 == 0 or k == len(todo):
                json.dump(done, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
            print(k, '/', len(todo), os.path.basename(p), v['n'], round(time.time() - t0), 's', flush=True)
    json.dump(done, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    print('ALL DONE', len(done))
