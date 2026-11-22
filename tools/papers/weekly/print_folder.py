# -*- coding: utf-8 -*-
# 打印某个月或某一周文件夹里的全部卷子: 先检查打印机在不在线, 再一份一份发过去
# 版式: 横向 A4 一面拼两页 + 自动跳过空白页 + 双面 (短边翻)。每份卷子单独一个任务, 不跨卷拼页。
# 用法: python 打印.py <月或周文件夹>          -> 打印全部 (题目 + 答案)
#       python 打印.py <文件夹> 题目           -> 只打题目
#       python 打印.py <文件夹> 答案           -> 只打答案
#       python 打印.py <文件夹> 检查           -> 只检查打印机, 不打印
#       python 打印.py <文件夹> 测试 输出.pdf  -> 用"Microsoft Print to PDF"走一遍第一份, 不出纸
import os, sys, socket, subprocess, re
import fitz, win32print, win32ui, win32con
from PIL import Image, ImageWin

PRINTER = 'Brother MFC-J2730DW Printer'
HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else HERE
args = sys.argv[2:]


def printer_online(name):
    """打印机端口能连通才算在线。"""
    try:
        h = win32print.OpenPrinter(name); info = win32print.GetPrinter(h, 2); win32print.ClosePrinter(h)
    except Exception as e:
        return False, f'找不到打印机 {name}: {e}'
    port = info['pPortName']
    host = None
    out = subprocess.run(['powershell', '-NoProfile', '-Command', f"(Get-PrinterPort -Name '{port}').PrinterHostAddress"], capture_output=True, text=True, encoding='gbk', errors='ignore').stdout.strip()
    host = out or None
    if not host:
        return True, f'端口 {port} 不是网络端口, 默认可用'
    cands = [host]
    mac = re.sub(r'^BRW', '', host).lower()
    if re.fullmatch(r'[0-9a-f]{12}', mac):   # Brother 默认主机名 = BRW + MAC, 按 MAC 在局域网里找 IP
        mac_dash = '-'.join(mac[i:i + 2] for i in range(0, 12, 2))
        arp = subprocess.run(['arp', '-a'], capture_output=True, text=True, encoding='gbk', errors='ignore').stdout.lower()
        m = re.search(r'(\d+\.\d+\.\d+\.\d+)\s+' + mac_dash, arp)
        if m: cands.insert(0, m.group(1))
    for h in cands:
        for p in (9100, 515, 631):
            try:
                with socket.create_connection((h, p), timeout=2):
                    return True, f'{h}:{p} 能连上'
            except Exception:
                pass
    return False, f'连不上 {host}（打印机没开、没连网，或者电脑不在同一个 Wi-Fi）'


def is_blank(img):
    """空白页: 只有页眉水印那种一点点字, 深色像素比例极低。"""
    g = img.convert('L').resize((300, 420))
    dark = sum(1 for v in g.getdata() if v < 128)
    return dark / (300 * 420) < 0.004


def page_images(doc, dpi=170):
    out = []
    for page in doc:
        pix = page.get_pixmap(dpi=dpi)
        img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        if img.width > img.height:
            img = img.rotate(90, expand=True)
        if not is_blank(img):
            out.append(img)
    return out


def print_pdf(path, printer, output=None, duplex=True):
    """一张横向 A4 拼两页 (左右), 空白页不印, 双面短边翻。返回 (原页数, 实印页数, 用纸面数)。"""
    doc = fitz.open(path)
    imgs = page_images(doc)
    h = win32print.OpenPrinter(printer)
    dm = win32print.GetPrinter(h, 2)['pDevMode']
    if dm is not None:
        dm.PaperSize = win32con.DMPAPER_A4
        dm.Orientation = 2          # 横向
        if duplex: dm.Duplex = 3    # 短边翻 (横向纸拼页用这个, 翻过来方向才对)
    win32print.ClosePrinter(h)
    hdc = win32ui.CreateDC()
    hdc.CreatePrinterDC(printer)
    if dm is not None:
        import win32gui
        win32gui.ResetDC(hdc.GetSafeHdc(), dm)
    pw, ph = hdc.GetDeviceCaps(win32con.PHYSICALWIDTH), hdc.GetDeviceCaps(win32con.PHYSICALHEIGHT)
    ox, oy = hdc.GetDeviceCaps(win32con.PHYSICALOFFSETX), hdc.GetDeviceCaps(win32con.PHYSICALOFFSETY)
    if pw < ph:   # 驱动没接受横向, 自己换
        pw, ph = ph, pw
    hdc.StartDoc(os.path.basename(path), output) if output else hdc.StartDoc(os.path.basename(path))
    half = pw // 2; gap = int(pw * 0.012)
    sides = 0
    for i in range(0, len(imgs), 2):
        pair = imgs[i:i + 2]
        hdc.StartPage()
        for k, img in enumerate(pair):
            boxw, boxh = half - gap * 2, ph - gap * 2
            s = min(boxw / img.width, boxh / img.height)
            w, hh = int(img.width * s), int(img.height * s)
            x = k * half + (half - w) // 2 - ox; y = (ph - hh) // 2 - oy
            ImageWin.Dib(img).draw(hdc.GetHandleOutput(), (x, y, x + w, y + hh))
        hdc.EndPage(); sides += 1
    hdc.EndDoc(); hdc.DeleteDC()
    return len(doc), len(imgs), sides

files = []
for dp, dn, fn in os.walk(TARGET):
    dn.sort()
    files += [os.path.join(dp, f) for f in sorted(fn) if f.endswith('.pdf')]
if args and args[0] == '题目': files = [f for f in files if '题目' in os.path.basename(f)]
if args and args[0] == '答案': files = [f for f in files if '答案' in os.path.basename(f)]
print(f'要打印: {TARGET}  共 {len(files)} 份')

if args and args[0] == '测试':
    out = args[1] if len(args) > 1 else os.path.join(HERE, '_测试输出.pdf')
    n, k, sides = print_pdf(files[0], 'Microsoft Print to PDF', output=out, duplex=False)
    print(f'测试完成: {os.path.basename(files[0])} 原 {n} 页, 去空白后 {k} 页, 拼成 {sides} 面 -> {out}')
    sys.exit(0)

ok, msg = printer_online(PRINTER)
print('打印机检查:', msg)
if not ok or (args and args[0] == '检查'):
    sys.exit(0 if ok else 1)
total = 0; sheets = 0
for f in files:
    n, k, sides = print_pdf(f, PRINTER); total += k; sheets += (sides + 1) // 2
    print(f'已发送 {os.path.relpath(f, TARGET)}  {k} 页 → {sides} 面 (约 {(sides + 1) // 2} 张纸)')
print(f'全部发送完毕, 共 {len(files)} 份 {total} 页, 约 {sheets} 张 A4 纸 (一面两页 + 双面)')
