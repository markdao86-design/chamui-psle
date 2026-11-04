# -*- coding: utf-8 -*-
# 对每份卷的答案页: ① 渲染成 JPG (给判分模型当官方答案) ② OCR 提取选择题答案键 (题号→1-4), 带覆盖率校验 → keys.json
import os, re, json, sys
import pypdfium2 as pdfium
from rapidocr_onnxruntime import RapidOCR
SP = os.path.dirname(os.path.abspath(__file__))
pages = json.load(open(os.path.join(SP, 'pages.json'), encoding='utf-8'))
papers = [dict(p, year=2025) for p in json.load(open(r'C:\claude\chamui-papers\papers_2025.json', encoding='utf-8'))]
if os.path.exists(r'C:\claude\chamui-papers\papers_more.json'): papers += [p for p in json.load(open(r'C:\claude\chamui-papers\papers_more.json', encoding='utf-8')) if p.get('status') == 'ok']
def kid(p): return f"{p['slug']}|{p['subj']}" if p['year'] == 2025 else f"{p['slug']}|{p['subj']}|{p['year']}" 
PUB = r'C:\claude\chamui-papers\public'
ocr = RapidOCR()
MCQ_MAX = {'eng': 25, 'sci': 30, 'math': 15, 'cn': 29}   # 2025 新卷; 老格式科学 28 题由键自己决定
ANS_LABELS = {'英文': 'eng_answers', '科学': 'sci_answers', '华文': 'cn_answers', '数学': 'math_answers'}
out = json.load(open(os.path.join(SP, 'keys.json'), encoding='utf-8')) if os.path.exists(os.path.join(SP, 'keys.json')) else {}
def parse_pairs(res, qmax):
    toks = []
    for box, txt, conf in (res or []):
        x = min(p[0] for p in box); y = (box[0][1] + box[2][1]) / 2; h = abs(box[2][1] - box[0][1])
        t = txt.strip().upper().replace('Q', '').replace('（', '(').replace('）', ')')
        # 拆 "1 2" / "Q1 1" / "1) 2" 这类同框多值
        for m in re.finditer(r'\d{1,2}', t):
            toks.append({'x': x + m.start() * h * 0.55, 'y': y, 'h': h, 'v': int(m.group())})
    pairs = {}
    toks.sort(key=lambda t: (t['x'], t['y']))
    for t in toks:
        if not (1 <= t['v'] <= qmax): continue
        # 右侧最近、同一行、值 1-4 的 token 当答案
        cands = [u for u in toks if u is not t and 1 <= u['v'] <= 4 and u['x'] > t['x'] + t['h'] * 0.6 and abs(u['y'] - t['y']) < t['h'] * 0.9]
        if not cands: continue
        u = min(cands, key=lambda u: u['x'] - t['x'])
        if u['x'] - t['x'] > t['h'] * 6: continue   # 太远不是同一格
        if t['v'] in pairs and pairs[t['v']] != u['v']: pairs[t['v']] = None   # 冲突
        elif t['v'] not in pairs: pairs[t['v']] = u['v']
    return pairs
for p in papers:
    key = p['src']
    if key not in pages or 'pages' not in pages[key]: continue
    info = pages[key]; subj = p['subj']
    ans_pages = [pg['p'] for pg in info['pages'] if pg['label'] == ANS_LABELS[info['subject']]]
    rec = out.get(kid(p)) or {}
    if rec.get('done'): continue
    pdf = pdfium.PdfDocument(key)
    imgs = []; local = []
    os.makedirs(os.path.join(SP, 'anskeys'), exist_ok=True)
    for n, pn in enumerate(ans_pages):
        img = pdf[pn - 1].render(scale=2.2).to_pil()
        w, h = img.size
        if w > 1600: img = img.resize((1600, int(h * 1600 / w)))
        os.makedirs(os.path.join(PUB, str(p['year']), subj), exist_ok=True)
        fn = os.path.join(PUB, str(p['year']), subj, f"{p['slug']}_ans{n + 1}.jpg"); img.convert('RGB').save(fn, 'JPEG', quality=80, optimize=True)
        imgs.append(f"https://chamui-papers.web.app/{p['year']}/{subj}/{p['slug']}_ans{n + 1}.jpg")
        lf = os.path.join(SP, 'anskeys', f"{subj}_{p['slug']}{'' if p['year'] == 2025 else '_' + str(p['year'])}_ans{n + 1}.jpg"); img.convert('RGB').save(lf, 'JPEG', quality=85); local.append(lf)
    rec = {'done': True, 'school': p['school'], 'subj': subj, 'slug': p['slug'], 'year': p['year'], 'ansPages': ans_pages, 'ansImgs': imgs, 'local': local, 'mcqMax': MCQ_MAX[subj]}
    out[kid(p)] = rec
    json.dump(out, open(os.path.join(SP, 'keys.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f"IMG {p['year']} {subj} {p['school']} ans pages {ans_pages}", flush=True)
print('KEYS DONE')
