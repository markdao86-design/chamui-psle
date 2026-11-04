# -*- coding: utf-8 -*-
# ClubMath PSLE 数学 2022-2025 (文字版 PDF): 复制到站点 + 解析章节页码 / Booklet A 答案键 / 答案页渲 JPG → psle_papers.json
import os, re, json, shutil, glob
import pypdf, pypdfium2 as pdfium
SRC = r'C:\Users\Eric\Desktop\P6顶尖小学真题2025\PSLE真题'
PUB = r'C:\claude\chamui-papers\public\psle\math'
os.makedirs(PUB, exist_ok=True)
out = []
for f in sorted(glob.glob(os.path.join(SRC, 'PSLE_*_数学_*.pdf'))):
    y = re.search(r'PSLE_(\d{4})_', f).group(1)
    dst = os.path.join(PUB, f'{y}.pdf'); shutil.copy2(f, dst)
    r = pypdf.PdfReader(f); n = len(r.pages); texts = [(p.extract_text() or '') for p in r.pages]
    def first(rx, start=0):
        for i in range(start, n):
            if re.search(rx, texts[i]): return i + 1
        return None
    p1 = 1
    p1b = first(r'Booklet\s*B\s*:\s*\(\s*25\s*marks')
    p2 = first(r'PAPER\s*2\s*\(\s*55\s*marks', 1)
    ans = first(r'Answer\s*Key')
    secs = [
        {'k': 'p1a', 'label': 'Paper 1 Booklet A 选择题 1-15', 'from': p1, 'to': p1b - 1},
        {'k': 'p1b', 'label': 'Paper 1 Booklet B 16-30', 'from': p1b, 'to': p2 - 1},
        {'k': 'p2', 'label': 'Paper 2 1-17', 'from': p2, 'to': ans - 1},
        {'k': 'answers', 'label': '答案', 'from': ans, 'to': n},
    ]
    keytxt = texts[ans - 1]; keytxt = keytxt[:keytxt.index('Booklet B')] if 'Booklet B' in keytxt else keytxt
    key = {}
    for q, a in re.findall(r'(?<!\d)(\d{1,2})\.\s*\(?([1-4])\)?(?!\d)', keytxt):
        if 1 <= int(q) <= 15: key[q] = int(a)
    missing = [q for q in range(1, 16) if str(q) not in key]
    pdf = pdfium.PdfDocument(f); imgs = []
    for k, pn in enumerate(range(ans, n + 1)):
        img = pdf[pn - 1].render(scale=2.0).to_pil(); w, h = img.size
        if w > 1600: img = img.resize((1600, int(h * 1600 / w)))
        img.convert('RGB').save(os.path.join(PUB, f'{y}_ans{k + 1}.jpg'), 'JPEG', quality=80, optimize=True)
        imgs.append(f'https://chamui-papers.web.app/psle/math/{y}_ans{k + 1}.jpg')
    out.append({'id': f'psle/math/{y}', 'kind': 'psle', 'subj': 'math', 'school': f'PSLE {y}', 'year': int(y), 'url': f'https://chamui-papers.web.app/psle/math/{y}.pdf',
                'mb': round(os.path.getsize(dst) / 1048576, 1), 'pages': n, 'sections': secs, 'ans': {'pages': list(range(ans, n + 1)), 'imgs': imgs[:4]},
                'mcq': {'max': 15, 'key': key, 'ok': not missing, 'missing': missing}, 'oeTask': None, 'src': 'clubmath.sg'})
    print(y, n, 'pages', 'secs', [(s['k'], s['from'], s['to']) for s in secs], 'key', len(key), 'missing', missing)
json.dump(out, open(r'C:\claude\chamui-papers\psle_papers.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
