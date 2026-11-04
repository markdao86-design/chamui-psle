# 联系表: python sheet.py <pdf> <from> <to> <out.jpg>  (每页缩略图 + 页码)
import sys, pypdfium2 as pdfium
from PIL import Image, ImageDraw
pdf = pdfium.PdfDocument(sys.argv[1]); a, b = int(sys.argv[2]), int(sys.argv[3])
ims = [(pn, pdf[pn - 1].render(scale=0.45).to_pil()) for pn in range(a, min(b, len(pdf)) + 1)]
w = max(i.size[0] for _, i in ims); h = max(i.size[1] for _, i in ims); cols = 6; rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * w, rows * h), 'white'); d = ImageDraw.Draw(S)
for n, (pn, im) in enumerate(ims):
    x, y = (n % cols) * w, (n // cols) * h; S.paste(im, (x, y)); d.rectangle([x, y, x + 60, y + 28], fill='red'); d.text((x + 6, y + 6), str(pn), fill='white')
S.save(sys.argv[4], quality=70)
