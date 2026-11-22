# -*- coding: utf-8 -*-
# 按 v3 清单, 生成全部周的打印包: 桌面\佑子每周打印包\<月>\第NN周_x月x日-x月x日\
#   每份卷子 = 说明封面 + 题目页; 每周答案合订一份 (家长用)
import os, re, json, datetime, collections, shutil, sys
import fitz
from docx import Document

DESK = r'C:\Users\Eric\Desktop'
ROOT = os.path.join(DESK, '佑子每周打印包')
FONT, FF = 'yh', r'C:\Windows\Fonts\msyh.ttc'
BS = chr(92)
ONLY = set(int(x) for x in sys.argv[1:]) if len(sys.argv) > 1 else None

ocr = json.load(open('all_pages.json', encoding='utf-8')) if os.path.exists('all_pages.json') else {}
if os.path.exists('some_pages.json'):
    for _k, _v in json.load(open('some_pages.json', encoding='utf-8')).items(): ocr.setdefault(_k, _v)
pj = json.load(open(r'C:\claude\chamui-psle\tools\papers\pages.json', encoding='utf-8'))
pre = {os.path.basename(k): v for k, v in pj.items()}

# ---------- 读 v3 清单 ----------
doc = Document(os.path.join(DESK, '佑子P6每周卷子清单_v12.docx'))
heads = [p.text for p in doc.paragraphs if p.text.startswith('第 ') and '周' in p.text[:6]]
start = datetime.date(2026, 11, 23)
weeks = []
ti = 1
for i in range(44):
    n = i + 1
    rows = []
    h = heads[i]
    if '本周做卷约 0 小时' not in h:
        t = doc.tables[ti]; ti += 1
        for r in t.rows[1:]:
            c = [x.text.replace('\n', '') for x in r.cells]
            if c[3].startswith('【'):
                rows.append(dict(sub=c[1], label=c[2], note=c[3], tl=c[4]))
            else:
                rows.append(dict(sub=c[1], label=c[2], path=os.path.join(DESK, *[x.strip() for x in c[3].split(BS)]), tl=c[4]))
    weeks.append(dict(n=n, a=start + datetime.timedelta(weeks=i), head=h, rows=rows))
assert ti == len(doc.tables), (ti, len(doc.tables))


# ---------- 拆分规则 ----------
def U(t):
    return re.sub(r'\s+', '', t).upper()


def is_ans(t):
    u = U(t)
    return ('ANSWERKEY' in u or 'ANSWERSHEET' in u and 'OPTICAL' not in u or '参考答案' in t or 'ANSWERSCHEME' in u or 'MARKINGSCHEME' in u
            or 'SUGGESTEDANSWER' in u or 'CORRECTIONSFOR' in u or re.search(r'答案[：:]?$', t.split('|')[1].strip() if '|' in t else '') is not None
            or ('SCHOOL' in u and 'SUBJECT' in u and ('LEVEL' in u or 'TERM' in u or 'YEAR' in u))
            or re.search(r'Q1\s*\|\s*Q2\s*\|\s*Q3', t) is not None)


def is_p1_eng(t):
    u = U(t)
    return 'SITUATIONALWRITING' in u or 'CONTINUOUSWRITING' in u or 'PAPER1' in u and 'WRITING' in u or 'ATLEAST150WORDS' in u


def is_p2_cn(t):
    u = U(t)
    return '试卷二' in t or '试卷（二）' in t or 'PAPER2' in u


def is_p1_cn(t):
    return '试卷一' in t or '试卷（一）' in t or '只需选做一题' in t or '字数在100' in t or ('作文' in t and '题' in t)


AOV = {  # 人工核对过的答案起始页 (0 起算)
    'Rosyth_2024_P5_华文_年终考.pdf': 22, '南华_2024_P5_数学_年终考.pdf': 34, '南洋小学_2024_P5_数学_年终考.pdf': 34,
    'Henry Park_2024_P5_科学_年终考.pdf': 38, '南华_2024_P5_科学_年终考.pdf': 36, '南洋小学_2025_P5_数学_年终考.pdf': 46, 'ACS Junior_2025_P6_英文_WA1计分测验.pdf': 6,
}


def split(path, sub):
    """返回 (题目页 list, 答案页 list, 备注)"""
    b = os.path.basename(path)
    if b in pre and '_Prelim' in b:
        labs = [p['label'] for p in pre[b]['pages']]; N = len(labs)
        a0 = next((i for i in range(N // 2, N) if labs[i].endswith('_answers')), N)
        q0 = 0
        if sub == '英文':
            p1 = [i for i in range(int(N * 0.6)) if labs[i] in ('eng_sw', 'eng_cw')]
            if p1: q0 = p1[-1] + 1
        if sub == '华文':
            f2 = [i for i in range(N // 2) if labs[i] == 'cn_p2_front']
            if f2: q0 = f2[0]
            else:
                c1 = [i for i in range(N // 2) if labs[i] == 'cn_compo']
                if c1: q0 = c1[-1] + 1
        return list(range(q0, a0)), list(range(a0, N)), N
    v = ocr[path]; hs = v['pages']; N = v['n']
    a0 = AOV.get(b) or next((i for i in range(int(N * 0.4), N) if is_ans(hs[i])), N)
    q0 = 0
    if sub == '英文':
        p1 = [i for i in range(int(N * 0.6)) if is_p1_eng(hs[i])]
        if p1: q0 = p1[-1] + 1
        g = next((i for i in range(int(N * 0.6)) if 'FOREACHQUESTIONFROM1TO10' in U(hs[i]) or 'GRAMMAR(10' in U(hs[i])), None)
        if g is not None and g > q0:   # 正卷第 1 题; 前面的作文卷和听力卷都去掉, 保留正卷封面
            q0 = g - 1 if g >= 1 and 'EXAMINATION' in U(hs[g - 1]) else g
    if sub == '华文' and not is_p2_cn(hs[0]):
        f2 = [i for i in range(1, a0) if is_p2_cn(hs[i])]
        if f2 and any(is_p1_cn(hs[j]) for j in range(f2[0])): q0 = f2[0]
    return list(range(q0, a0)), list(range(a0, N)), N


# ---------- 封面文字 ----------
def todo(row):
    lab = row['label']; sub = row['sub']
    redo = lab.startswith('二刷')
    if '小测' in lab:
        what = '按卷面全部做完。'
        tl = '约 50 分钟（以卷面写的时间为准）'
    else:
        what = {'英文': '只做 Paper 2：Booklet A + Booklet B 全部。作文 Paper 1 不做。',
                '数学': 'Paper 1 + Paper 2 两份连着做，中间不休息。Paper 1 不能用计算器，Paper 2 可以。',
                '科学': 'Booklet A 选择题 + Booklet B 问答题，全部做完。问答题要写完整的关键词。',
                '华文': '只做试卷二：选择题 + 作答簿上的问答题。试卷一作文不做。'}[sub]
        tl = {'英文': '1 小时 50 分钟', '数学': '2 小时 30 分钟（Paper 1 1 小时 + Paper 2 1 小时 30 分）',
              '科学': '1 小时 45 分钟', '华文': '1 小时 40 分钟'}[sub]
    if 'PSLE 真题' in lab:
        what = 'PSLE 真题，按真考的样子做：上午做，限时，做完家长按评分标准批。' + ('速度题（Speed）2026 年起不考，跳过。' if sub == '数学' else '')
    if redo:
        what = '二刷：这套卷子之前做过，不看第一次的答案，限时重做。做完跟第一次的分数比。' + what
    if '预考' in lab and sub in ('数学', '科学') and not redo:
        what += '还没学过的题先跳过，打个记号，学完再回来补。'
    return what, tl


def cover(doc, wk, k, total, row):
    pg = doc.new_page(width=595, height=842)
    y = [90]

    def line(txt, size, dy):
        pg.insert_textbox(fitz.Rect(60, y[0], 535, y[0] + dy), txt, fontname=FONT, fontfile=FF, fontsize=size); y[0] += dy
    what, tl = todo(row)
    a = wk['a']; b = a + datetime.timedelta(days=6)
    line(f'第 {wk["n"]} 周（{a.month}月{a.day}日–{b.month}月{b.day}日）· 第 {k} 份 / 共 {total} 份', 13, 40)
    line(f'{row["sub"]}　{row["label"]}', 22, 70)
    line('要做什么', 15, 30); line(what, 13, 85)
    line('限时', 15, 30); line(tl, 13, 50)
    line('规矩', 15, 30)
    line('1. 一次做完，中途不查书、不问人。\n2. 做完交给家长对答案，错题进错题本。\n3. 没把握的题先做记号，最后有时间再回头检查。', 12.5, 90)
    line('开始时间：________　　结束时间：________\n\n得分：________ / ________　　　家长签字：________', 13, 110)
    pg.draw_rect(fitz.Rect(45, 70, 550, y[0] + 10), color=(0.12, 0.25, 0.69), width=1.2)


# ---------- 生成 ----------
LOCKED = []
if os.path.isdir(ROOT) and ONLY is None:
    shutil.rmtree(ROOT, ignore_errors=True)
    for dp, dn, fn in os.walk(ROOT, topdown=False):
        for f in fn: LOCKED.append(os.path.join(dp, f))
        for dd in dn:
            try: os.rmdir(os.path.join(dp, dd))
            except OSError: pass
os.makedirs(ROOT, exist_ok=True)
report = []; flags = []; month_pages = collections.Counter()
for wk in weeks:
    if ONLY and wk['n'] not in ONLY: continue
    a = wk['a']; b = a + datetime.timedelta(days=6)
    mdir = os.path.join(ROOT, f'{a.year}年{a.month:02d}月')
    wdir = os.path.join(mdir, f'第{wk["n"]:02d}周_{a.month}月{a.day}日-{b.month}月{b.day}日')
    os.makedirs(wdir, exist_ok=True)
    if not wk['rows']:
        open(os.path.join(wdir, '本周不做家庭卷.txt'), 'w', encoding='utf-8').write('本周不做家庭卷（学校考试周或 PSLE 笔试），只翻错题本、范文本和科学本子。\n')
        continue
    notes = [r for r in wk['rows'] if 'note' in r]
    if notes:
        open(os.path.join(wdir, '本周要自备或自选的卷子.txt'), 'w', encoding='utf-8').write(
            '\n'.join(f'{r["sub"]}：{r["label"]}　{r["note"]}　限时 {r["tl"]}' for r in notes) + '\n')
    prow = [r for r in wk['rows'] if 'note' not in r]
    if not prow:
        continue
    ans = fitz.open(); nrows = len(prow); wpages = 0
    for k, row in enumerate(prow, 1):
        q, an, N = split(row['path'], row['sub'])
        s = fitz.open(row['path'])
        d = fitz.open(); cover(d, wk, k, nrows, row)
        d.insert_pdf(s, from_page=q[0], to_page=q[-1])
        tag = row['label'].replace(' · ', '_').replace(' ', '')
        _fp = os.path.join(wdir, f'{k:02d}_{row["sub"]}_{tag}_题目.pdf')
        try:
            d.save(_fp, garbage=3, deflate=True)
        except Exception:
            print('LOCKED, skipped', _fp)
        wpages += len(d)
        if an:
            st = len(ans); ans.insert_pdf(s, from_page=an[0], to_page=an[-1])
            for j in range(st, len(ans)):
                p = ans[j]; w = p.rect.width
                p.insert_textbox(fitz.Rect(20, 4, w - 20, 22), f'答案 · 第 {wk["n"]} 周第 {k} 份 · {row["sub"]} {row["label"]}', fontname=FONT, fontfile=FF, fontsize=10, color=(0.8, 0, 0), align=1)
        fr = len(an) / N
        bad = (not an) or fr > 0.4 or len(q) < 3 or (q[0] > N * 0.4)
        rec = dict(week=wk['n'], k=k, sub=row['sub'], label=row['label'], N=N, q=f'{q[0] + 1}-{q[-1] + 1}', a=(f'{an[0] + 1}-{an[-1] + 1}' if an else '无'), path=row['path'])
        report.append(rec)
        if bad: flags.append(rec)
    if len(ans):
        ans.save(os.path.join(wdir, f'{nrows + 1:02d}_答案_家长用_本周合订.pdf'), garbage=3, deflate=True)
    wpages += len(ans)
    month_pages[os.path.basename(mdir)] += wpages
    print('week', wk['n'], 'papers', nrows, 'pages', wpages, flush=True)
json.dump(report, open('build_report.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
json.dump(flags, open('build_flags.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('flags', len(flags)); print('locked', LOCKED)
for f in flags: print('  FLAG', f['week'], f['sub'], f['label'], 'N', f['N'], 'q', f['q'], 'a', f['a'])
print(dict(month_pages))

# ---------- 打印脚本 + 每月一键打印 + 总目录 ----------
shutil.copy2('打印.py', os.path.join(ROOT, '打印.py'))
BAT = '@echo off\r\nchcp 65001 >nul\r\nset PYTHONUTF8=1\r\npython "%~dp0..\打印.py" "%~dp0." %*\r\npause\r\n'
lines = ['佑子每周打印包 目录 v1', '', '用法：每个月文件夹里双击“双击打印本月.bat”，先查打印机，在线才打印。题目和答案都会打。', '只打题目：在命令行运行  python 打印.py <月份文件夹> 题目', '只打答案：python 打印.py <月份文件夹> 答案', '']
for m in sorted(os.listdir(ROOT)):
    mp = os.path.join(ROOT, m)
    if not os.path.isdir(mp): continue
    open(os.path.join(mp, '双击打印本月.bat'), 'w', encoding='utf-8', newline='').write(BAT)
    tot = 0; sheets = 0; wl = []
    for w in sorted(os.listdir(mp)):
        wp = os.path.join(mp, w)
        if not os.path.isdir(wp): continue
        pdfs = [f for f in sorted(os.listdir(wp)) if f.endswith('.pdf')]
        ns = [len(fitz.open(os.path.join(wp, f))) for f in pdfs]; pg = sum(ns); tot += pg; sheets += sum((x + 1) // 2 for x in ns)
        wl.append(f'  {w}：{len([f for f in pdfs if "题目" in f])} 份卷子 + 答案，{pg} 页')
    lines.append(f'{m}：共 {tot} 页（双面打印约 {sheets} 张 A4 纸）')
    lines += wl; lines.append('')
open(os.path.join(ROOT, '目录.txt'), 'w', encoding='utf-8').write('\n'.join(lines))
print('\n'.join(lines))
