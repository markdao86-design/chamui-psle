# -*- coding: utf-8 -*-
import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUT = r'C:\Users\Eric\Desktop\佑子_爱同2024P5英文年终考_判分与解析_v9.docx'
doc = Document()
sec = doc.sections[0]
sec.left_margin = sec.right_margin = Cm(1.8); sec.top_margin = sec.bottom_margin = Cm(1.5)
st = doc.styles['Normal']; st.font.name = '微软雅黑'; st.element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑'); st.font.size = Pt(10.5)
st.paragraph_format.space_after = Pt(3)
for h, sz in (('Heading 1', 16), ('Heading 2', 13)):
    hs = doc.styles[h]; hs.font.name = '微软雅黑'; hs.element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑'); hs.font.color.rgb = RGBColor(0x1E, 0x40, 0xAF); hs.font.size = Pt(sz)
sec.header.paragraphs[0].add_run('佑子 · 爱同 2024 P5 英文年终考 Paper 2 · 判分与解析 v9').font.size = Pt(8)


def para(t, b=False, size=None):
    p = doc.add_paragraph(); r = p.add_run(t); r.bold = b
    if size: r.font.size = Pt(size)
    return p


def shade(c, color):
    tcPr = c._tc.get_or_add_tcPr(); s = OxmlElement('w:shd'); s.set(qn('w:val'), 'clear'); s.set(qn('w:color'), 'auto'); s.set(qn('w:fill'), color); tcPr.append(s)


def table(head, rows, widths, fs=9.5):
    t = doc.add_table(rows=1, cols=len(head)); t.style = 'Table Grid'
    for i, h in enumerate(head):
        c = t.rows[0].cells[i]; c.text = h; c.paragraphs[0].runs[0].bold = True; shade(c, 'DCE6F5')
    for rw in rows:
        cs = t.add_row().cells
        for i, v in enumerate(rw): cs[i].text = str(v)
    for rw in t.rows:
        for i, w in enumerate(widths): rw.cells[i].width = Cm(w)
        for c in rw.cells:
            for p in c.paragraphs:
                p.paragraph_format.space_after = Pt(0)
                for r in p.runs: r.font.size = Pt(fs)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return t


doc.add_heading('佑子 · 爱同 2024 P5 英文年终考 Paper 2 判分与解析 v9', 1)
para('做卷日期：2026 年 11 月第 1 周（清单第 1 周）。判分依据：严格按 PSLE 考官评分标准。选择题、语法填空、改错按爱同官方答案判；综合填空只接受语法和语境都成立的词；句式转换要求意思不变且语法正确，否则 0 分；阅读问答按采分点给分，少一个采分点不给分，答案里出现原文没有的内容扣分，不给半分，不扣语法分。', size=9.5)

doc.add_heading('一、结论', 2)
para('Paper 2 得分 67 / 90，折合 74.4%，AL5（对比学校期末 70 / 90，77.8%）。离 AL1 线（90%，81 分）差 14 分；离老师给的 Paper 2 目标 80 分差 13 分。', b=True)
para('丢分 23 分：综合填空 9，Booklet A 选择题 7，阅读问答 5，Editing 2。句式转换和语法填空满分。语法没问题，丢分在词汇搭配和阅读踩点。')

doc.add_heading('二、分项得分', 2)
table(['部分', '题号', '满分', '得分', '丢分', '说明'], [
    ['语法选择 Grammar MCQ', '1–10', 10, 9, 1, 'Q10 时态'],
    ['词汇选择 Vocabulary MCQ', '11–15', 5, 4, 1, 'Q12 固定搭配'],
    ['词义选择 Vocabulary Cloze', '16–20', 5, 2, 3, 'Q17、18、19 近义词辨析'],
    ['图文理解 Visual Text', '21–25', 5, 3, 2, 'Q23、24 读题不准'],
    ['语法填空 Grammar Cloze', '26–35', 10, 10, 0, '全对'],
    ['改错 Editing', '36–45', 10, 8, 2, 'Q40 词性，Q42 空着'],
    ['综合填空 Comprehension Cloze', '46–60', 15, 6, 9, '三题空着，六题搭配错'],
    ['句式转换 Synthesis & Transformation', '61–65', 10, 10, 0, '全对'],
    ['阅读问答 Comprehension OE', '66–75', 20, 15, 5, '四题没回原文定位，一题少采分点'],
    ['合计', '', 90, 67, 23, '74.4%，AL1 线 81 分'],
], [4.2, 1.4, 1.1, 1.1, 1.1, 7.6])

doc.add_heading('三、错题逐题解析', 2)
from aitong_v3_expl import EXPL
for sec_title, items in EXPL:
    doc.add_heading(sec_title, 2)
    for q, ans, paras in items:
        para(q, b=True)
        para(ans, b=True, size=10)
        # v6 定稿 (老板 2026-11-22): 只要完整解析, 不加红色重点行 / 考点方法论 / 名校同类题
        for k, p in enumerate(paras, 1):
            para(f'{k}. {p}')
        doc.add_paragraph().paragraph_format.space_after = Pt(2)

doc.add_heading('一处给了分、但要留意', 2)
para('第 62 题 Out of mischievousness：意思不变、语法正确，给满分。标准答案是 mischief，考场上用 mischief 最稳。记：out of mischief / curiosity / kindness / fear。')

doc.add_heading('四、丢分规律', 2)
for t in ['1. 空着 4 题白送 4 分（42、50、54、58）。没有倒扣，永远不留空。',
          '2. 固定搭配丢 8 分：commendation、personal hygiene、make up、demand for、come by、raise awareness、compatibility、voluntarily。词认识，不知道和谁搭。',
          '3. 近义词辨析丢 3 分（17、18、19）：选了意思沾边的词，没抓核心含义和分量。',
          '4. 阅读问答丢 5 分：自己总结代替原文定位（70c、71a、71c、75），加漏采分点（67）。和校考开放题丢分是同一个根子。',
          '5. 语法是强项：语法选择、语法填空、句式转换共 30 分只丢 1 分。']:
    para(t)
doc.add_heading('五、差距与目标', 2)
table(['部分', '这次', 'AL1 需要', '最容易补的分'], [
    ['综合填空', '6/15', '13/15', '先不空着 +3；背熟本卷 8 个搭配 +3'],
    ['Booklet A 选择题', '18/25', '23/25', '近义词辨析 +2；海报题一律先想 persuade +1'],
    ['阅读问答', '15/20', '19/20', '每题先在原文划依据、按采分点写全 +4'],
    ['Editing', '8/10', '10/10', '不空着 +1；-ability 规则 +1'],
    ['合计', '67/90', '81/90', '以上加起来有 15 分空间，够到 AL1 线'],
], [3.6, 1.6, 1.8, 9.2])

doc.save(OUT); print('saved', OUT)
