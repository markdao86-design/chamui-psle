import fitz, sys, glob, os
def sheet(items, out, dpi=35):
    imgs = []
    for f, i in items:
        d = fitz.open(f); i = i if i >= 0 else len(d) + i
        p = d[i].get_pixmap(dpi=dpi)
        if p.n != 3: p = fitz.Pixmap(fitz.csRGB, p)
        imgs.append(p)
    W = sum(p.width for p in imgs) + 8 * len(imgs); H = max(p.height for p in imgs)
    c = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, W, H), 0); c.clear_with(255); x = 0
    for p in imgs:
        p.set_origin(x, 0); c.copy(p, p.irect); x += p.width + 8
    c.save(out)
if __name__ == '__main__':
    wdir = glob.glob(sys.argv[1])[0]
    fs = sorted(f for f in glob.glob(os.path.join(wdir, '*.pdf')))
    items = []
    for f in fs:
        if '题目' in f: items += [(f, 1)]
    sheet(items, sys.argv[2])
    a = [f for f in fs if '答案' in f]
    if a:
        d = fitz.open(a[0]); n = len(d)
        sheet([(a[0], i) for i in range(0, n, max(1, n // 8))][:9], sys.argv[2].replace('.png', '_ans.png'))
