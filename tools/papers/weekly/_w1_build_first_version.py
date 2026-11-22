# -*- coding: utf-8 -*-
# 第 1 周打印包: 每份卷子 = 说明封面 + 题目页; 答案单独合成一份 (家长用)
import os, json, re
import fitz
D = r'C:\Users\Eric\Desktop\P5年终考卷SA2_十大名校_2024-2025'
OUT = r'C:\Users\Eric\Desktop\第1周打印包_11月23日-29日'
os.makedirs(OUT, exist_ok=True)
pages = json.load(open('w1_pages.json', encoding='utf-8'))
TODO = {
    '英文': ('只做 Paper 2：Booklet A 第 1–25 题 + Booklet B 第 26–75 题。作文 Paper 1 不做。', '1 小时 50 分钟'),
    '数学': ('Paper 1（Booklet A+B，第 1–30 题）+ Paper 2（第 1–17 题），两份连着做，中间不休息。Paper 1 不能用计算器，Paper 2 可以。', '2 小时 30 分钟（Paper 1 1 小时 + Paper 2 1 小时 30 分）'),
    '科学': ('Booklet A 选择题 + Booklet B 问答题，全部做完。问答题要写完整的关键词。', '1 小时 45 分钟'),
    '华文': ('只做试卷二：第 1–25 题涂在答案上，第 26–40 题写在作答簿上。试卷一作文不做。', '1 小时 40 分钟'),
}
ORDER = [('爱同', '英文'), ('爱同', '数学'), ('爱同', '科学'), ('爱同', '华文'), ('红卍字', '英文'), ('红卍字', '数学'), ('红卍字', '科学'), ('红卍字', '华文')]


def is_ans(t):
    u = re.sub(r'\s+', '', t).upper()
    return ('ANSWERKEY' in u or '参考答案' in t or 'ANSWERSCHEME' in u or 'MARKINGSCHEME' in u or
            ('SCHOOL' in u and 'SUBJECT' in u and ('LEVEL' in u or 'TERM' in u)))


def is_p2_cn(t):
    return '试卷二' in t or '试卷（二）' in t or 'PAPER 2' in t.upper() or 'PAPER2' in t.upper().replace(' ', '')


FONT = 'yh'
FF = r'C:\Windows\Fonts\msyh.ttc'
ans_doc = fitz.open(); summary = []
for n, (sch, sub) in enumerate(ORDER, 1):
    fn = f'{sch}_2024_P5_{sub}_年终考.pdf'; src = os.path.join(D, sub, fn)
    info = pages[src]; heads = info['pages']; N = info['n']
    OV = {('红卍字', '科学'): 42, ('红卍字', '华文'): 16}
    a0 = OV.get((sch, sub)) or next(i for i in range(N // 2, N) if is_ans(heads[i]))
    q0 = 0
    if sub == '华文' and not is_p2_cn(heads[0]):
        q0 = next(i for i in range(1, a0) if is_p2_cn(heads[i]))
    q_pages = list(range(q0, a0)); a_pages = list(range(a0, N))
    todo, tl = TODO[sub]
    doc = fitz.open(); s = fitz.open(src)
    # 封面
    pg = doc.new_page(width=595, height=842)
    y = 90
    def line(txt, size, dy, bold=False):
        global y
        rect = fitz.Rect(60, y, 535, y + dy)
        pg.insert_textbox(rect, txt, fontname=FONT, fontfile=FF, fontsize=size)
        y += dy
    line(f'第 1 周 · 第 {n} 份 / 共 8 份', 14, 40)
    line(f'{sub}　{sch} 2024　P5 年终考', 26, 70)
    line('要做什么', 15, 30)
    line(todo, 13, 80)
    line('限时', 15, 30)
    line(tl, 13, 50)
    line('规矩', 15, 30)
    line('1. 一次做完，中途不查书、不问人。\n2. 做完交给家长对答案，错题进错题本。\n3. 没把握的题先做记号，最后有时间再回头检查。', 12.5, 90)
    line('开始时间：________　　结束时间：________\n\n得分：________ / ________　　　家长签字：________', 13, 110)
    pg.draw_rect(fitz.Rect(45, 70, 550, y + 10), color=(0.12, 0.25, 0.69), width=1.2)
    doc.insert_pdf(s, from_page=q_pages[0], to_page=q_pages[-1])
    out = os.path.join(OUT, f'{n:02d}_{sub}_{sch}2024_题目.pdf'); doc.save(out, garbage=3, deflate=True)
    # 答案: 每页顶部盖章
    st = len(ans_doc)
    ans_doc.insert_pdf(s, from_page=a_pages[0], to_page=a_pages[-1])
    for k in range(st, len(ans_doc)):
        p = ans_doc[k]; w = p.rect.width
        p.insert_textbox(fitz.Rect(20, 4, w - 20, 22), f'答案 · 第 {n} 份 · {sub} {sch} 2024 P5 年终考', fontname=FONT, fontfile=FF, fontsize=10, color=(0.8, 0, 0), align=1)
    summary.append((n, sub, sch, N, f'{q0 + 1}-{a0}', f'{a0 + 1}-{N}', len(q_pages) + 1))
ans_out = os.path.join(OUT, '09_答案_家长用_8份合订.pdf'); ans_doc.save(ans_out, garbage=3, deflate=True)
for r in summary:
    print(r)
print('answer pages', len(ans_doc), 'total print pages', sum(r[6] for r in summary) + len(ans_doc))
