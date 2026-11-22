# -*- coding: utf-8 -*-
"""佑子卷子省纸打印版: 一面拼两页 + 删空白 + 不带答案 + 每份卷子从新纸开始.
用法: python twoup_print.py <月份文件夹或周文件夹...> -o <输出pdf>
     python twoup_print.py --check <已有pdf>      只做自检
出文件前强制自检, 任何一条不过就不保存:
  1. 每个原页先去掉旋转标记(/Rotate), 转正后必须是竖版
  2. 每一面的上下两半都必须是"横躺"的文字(行是竖的), 不许有正立或挤压的页
  3. 卷子封面"第N周 第k份/共m份"必须按顺序出现, 不重不漏
  4. 每份卷子都从奇数面(新纸正面)开始
"""
import os, sys, re, glob, argparse
import fitz
sys.stdout.reconfigure(encoding='utf-8')
W, H = 595.28, 841.89
SUBSET = False   # --files 只挑部分卷子时: 只查周次递增不重复

def ink(pg):
    s = pg.get_pixmap(dpi=20, colorspace=fitz.csGRAY).samples
    return sum(1 for x in s if x < 200) / len(s)

def upright(src, i):
    t = fitz.open(); t.insert_pdf(src, from_page=i, to_page=i); p = t[0]
    if p.rotation: p.remove_rotation()
    if p.rect.width > p.rect.height:
        raise SystemExit(f'自检失败: {src.name} 第{i+1}页转正后是横版, 不能直接拼')
    return t

def papers(dirs):
    out = []
    for d in dirs:
        out += [f for f in glob.glob(os.path.join(d, '**', '*.pdf'), recursive=True) if '答案' not in os.path.basename(f)]
    return sorted(out)

def build(files, buggy=False):
    """buggy=True 只用于验证自检: 复现旧版不处理旋转标记的错误"""
    out = fitz.open(); starts = []; halves = []
    for f in files:
        src = fitz.open(f); keep = [i for i, p in enumerate(src) if ink(p) >= 0.004]
        starts.append((len(out), f))
        for k in range(0, len(keep), 2):
            pg = out.new_page(width=W, height=H)
            for j, rect in ((0, fitz.Rect(0, H/2, W, H)), (1, fitz.Rect(0, 0, W, H/2))):
                if k + j >= len(keep): break
                i = keep[k+j]
                if buggy: pg.show_pdf_page(rect, src, i, rotate=90)
                else: pg.show_pdf_page(rect, upright(src, i), 0, rotate=90)
                halves.append((len(out)-1, rect, f, i))
        if (len(out) - starts[-1][0]) % 2: out.new_page(width=W, height=H)
    return out, starts, halves

def half_is_sideways(pix):
    """横躺文字: 列方向墨量起伏大, 行方向平滑. 返回 None 表示这半边几乎空白"""
    w, h, s = pix.width, pix.height, pix.samples
    rows = [0]*h; cols = [0]*w
    for y in range(h):
        base = y*w
        for x in range(w):
            if s[base+x] < 160: rows[y] += 1; cols[x] += 1
    tot = sum(rows)
    if tot < 0.004*w*h: return None
    def jump(v): return sum(abs(v[i]-v[i-1]) for i in range(1, len(v))) / max(1, sum(v))
    return jump(cols) > jump(rows)

def _img(pix, size):
    from PIL import Image
    import numpy as np
    im = Image.frombytes('L', (pix.width, pix.height), pix.samples).resize(size)
    a = np.asarray(im, dtype=float); a = a - a.mean(); n = (a*a).sum() ** .5
    return a / n if n else a

def match_halves(doc, halves):
    """每半面都要和原卷那页(阅读器里看到的样子)逆时针转90度后对得上, 且明显好过其他摆法"""
    from PIL import Image
    import numpy as np
    errs = []; cache = {}
    for side, rect, f, i in halves:
        if f not in cache: cache[f] = fitz.open(f)
        # show_pdf_page 保持比例居中放置; 只比对实际放进去的那块(Letter 等非 A4 页会留白边)
        ur = upright(cache[f], i)[0].rect; rw, rh = ur.height, ur.width   # 转90度后的宽高
        sc = min(rect.width / rw, rect.height / rh)
        cx, cy = (rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2
        placed = fitz.Rect(cx - rw*sc/2, cy - rh*sc/2, cx + rw*sc/2, cy + rh*sc/2)
        half = doc[side].get_pixmap(dpi=40, colorspace=fitz.csGRAY, clip=placed)
        hs = (half.width, half.height)
        sp = cache[f][i].get_pixmap(dpi=40, colorspace=fitz.csGRAY)   # 阅读器里正立的样子
        src = Image.frombytes('L', (sp.width, sp.height), sp.samples)
        h = _img(half, hs)
        scores = {}
        for ang in (90, 270, 0):
            r = src.rotate(ang, expand=True).resize(hs)
            a = np.asarray(r, dtype=float); a = a - a.mean(); n = (a*a).sum() ** .5
            scores[ang] = float((h * (a / n if n else a)).sum())
        if scores[90] < 0.5 or scores[90] < max(scores[270], scores[0]) + 0.05:
            errs.append(f'第{side+1}面{"下半" if rect.y0 > 1 else "上半"}: 和原卷 {os.path.basename(f)} 第{i+1}页对不上(相似度{scores[90]:.2f})')
    return errs

def check(doc, halves=None):
    errs = match_halves(doc, halves) if halves else []
    covers = []
    for i, pg in enumerate(doc):
        m = re.search(r'第\s*(\d+)\s*周.*?第\s*(\d+)\s*份\s*/\s*共\s*(\d+)\s*份', pg.get_text().replace('\n', ' '))
        if m: covers.append((i, int(m.group(1)), int(m.group(2)), int(m.group(3))))
    for a, b in zip(covers, covers[1:]):
        if SUBSET: ok = (b[1], b[2]) > (a[1], a[2])
        else: ok = (b[1] == a[1] and b[2] == a[2]+1) or (b[1] == a[1]+1 and b[2] == 1 and a[2] == a[3])
        if not ok: errs.append(f'顺序错: 第{a[0]+1}面是第{a[1]}周第{a[2]}份, 下一份是第{b[1]}周第{b[2]}份')
    for i, w, k, m in covers:
        if i % 2: errs.append(f'第{w}周第{k}份从反面开始(第{i+1}面), 会和上一份印在同一张纸上')
    if covers and not SUBSET and covers[-1][2] != covers[-1][3]: errs.append(f'最后一份是第{covers[-1][1]}周第{covers[-1][2]}份, 本周没收全')
    return errs, covers

if __name__ == '__main__':
    global_ns = globals()
    ap = argparse.ArgumentParser(); ap.add_argument('dirs', nargs='*'); ap.add_argument('-o'); ap.add_argument('--check')
    ap.add_argument('--files', nargs='*', help='直接给要合并的题目pdf(按给的顺序), 只查递增不查连号')
    ap.add_argument('--simulate-bug', action='store_true'); ap.add_argument('--only-weeks')
    a = ap.parse_args()
    def fix(p):
        if p and not os.path.exists(p):
            for enc in ('gbk', 'cp936'):
                try:
                    q = p.encode(enc, 'surrogateescape').decode('utf-8')
                    if os.path.exists(q) or os.path.exists(os.path.dirname(q) or '.'): return q
                except Exception: pass
        return p
    a.dirs = [fix(d) for d in a.dirs]; a.o = fix(a.o); a.check = fix(a.check)
    if a.check:
        doc = fitz.open(a.check); errs, covers = check(doc)
        print('注意: 只查顺序和起页; 方向比对要从原卷重新出文件才能做')
    else:
        if a.files:
            SUBSET = True; a.files = [fix(f) for f in a.files]
        doc, starts, halves = build(a.files or papers(a.dirs), buggy=a.simulate_bug); errs, covers = check(doc, halves)
    print(f'半面比对 {0 if a.check else len(halves)} 个  面数 {len(doc)}  纸 {(len(doc)+1)//2} 张  卷子 {len(covers)} 份')
    if errs:
        print('自检不通过, 不出文件:'); [print('  ', e) for e in errs[:30]]; print(f'  共 {len(errs)} 条'); sys.exit(1)
    print('自检通过')
    if not a.check:
        doc.save(a.o, garbage=4, deflate=True); print('已保存', a.o)
