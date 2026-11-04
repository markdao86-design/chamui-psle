# -*- coding: utf-8 -*-
# 汇编目录 Word: 病根 → 模块 → 各校页数 / 在汇编里的起始页; 用法建议
import os, json
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
SP = os.path.dirname(os.path.abspath(__file__))
DESK = r'C:\Users\Eric\Desktop\P6顶尖小学真题2025'
idx = json.load(open(os.path.join(SP, 'index.json'), encoding='utf-8'))
man = json.load(open(os.path.join(DESK, 'manifest.json'), encoding='utf-8'))
doc = Document()
st = doc.styles['Normal']; st.font.name = 'Microsoft YaHei'; st.font.size = Pt(10.5); st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei')
for s in doc.sections: s.left_margin = s.right_margin = Cm(2); s.top_margin = s.bottom_margin = Cm(1.8)
def H(text, lvl=1, color='1E40AF'):
    p = doc.add_heading(level=lvl); r = p.add_run(text); r.font.name = 'Microsoft YaHei'; r._element.rPr.rFonts.set(qn('w:eastAsia'), 'Microsoft YaHei'); r.font.color.rgb = RGBColor.from_string(color); return p
def P(text, bold=False, color=None, size=None):
    p = doc.add_paragraph(); r = p.add_run(text); r.bold = bold
    if color: r.font.color.rgb = RGBColor.from_string(color)
    if size: r.font.size = Pt(size)
    return p
def table(rows, header, widths=None):
    t = doc.add_table(rows=1, cols=len(header)); t.style = 'Light Grid Accent 1'
    for i, h in enumerate(header): c = t.rows[0].cells[i]; c.text = ''; r = c.paragraphs[0].add_run(h); r.bold = True
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row): cells[i].text = str(v)
    if widths:
        for row in t.rows:
            for i, w in enumerate(widths): row.cells[i].width = Cm(w)
    return t
title = doc.add_paragraph(); title.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = title.add_run('P6 顶尖小学 2025 Prelim 真题 · 薄弱模块汇编 目录 v1'); r.bold = True; r.font.size = Pt(18); r.font.color.rgb = RGBColor.from_string('1E40AF')
P('整理日期 2026-11-04 · 目标 2027 PSLE 四科 AL1 · 薄弱模块依据 2026-11 校考逐题分析', color='64748B')
H('一、这套东西是什么', 1)
P('10 所学校 2025 年 P6 Prelim 四科原卷 40 份 (扫描件, 含学校答案页), 按科目放在本文件夹的 英文 / 数学 / 科学 / 华文 四个子目录。')
P('再从英文、科学、华文卷里把孩子这次校考暴露的薄弱模块整页抽出来, 按 科目 → 模块 → 学校 顺序合成三份汇编 PDF (每份带书签, 点左侧书签直达), 另有一份总汇编。数学 94/100 已是 AL1, 原卷照放, 不进汇编。')
P('10 校: 南洋小学 · 莱佛士女小 · Rosyth · 道南 · 南华 · 公教 · ACS Junior · Henry Park · 美以美女小 · 爱同 (常见家长榜单前十, sgexam.com 2025 Prelim 全部有卷)。', color='64748B')
H('二、薄弱模块 ↔ 校考病根 ↔ 汇编章节', 1)
table([
    ['英语', 'Booklet A 选择题 16/25 (64%)', '题感 + 词汇量; 每周限时 2 套', '英文汇编 第 1 章'],
    ['英语', '时态 (综合填空 4 错 3 / 改错 are→were / 作文跳时态)', '动词圈查; 做完每空问"过去还是现在"', '英文汇编 第 2-4 章 (语法填空 / 改错 / 综合填空)'],
    ['英语', '句型转换', '改写后意思必须一样', '英文汇编 第 5 章'],
    ['英语', '阅读问答 读题不准 (一个词 / 从第一段)', '先圈题目限定词再答', '英文汇编 第 6 章'],
    ['英语', '作文语言 (中式直译 / 词性 / 硬塞大词)', '每两周一篇, 写前看常错本, 写完圈查', '英文汇编 第 7 章 (10 校作文题 + 情境写作题)'],
    ['科学', 'Booklet B 开放题 32/40 (丢 8 分, 全科最大缺口)', '先写 2-3 个关键词再连因果链, 链写到题目问的结果', '科学汇编 第 1 章'],
    ['华文', '作文 32/40 (四项里相对最弱)', '审题 → 详略 → 点题; 错别字 ½ 分一个', '华文汇编 第 1 章 (10 校作文题)'],
    ['华文', '阅读理解二 开放题 (含书面互动)', '按分值写点, 用原文词', '华文汇编 第 2 章'],
], ['科目', '薄弱模块 (校考数据)', '练法', '在汇编里的位置'], [1.5, 5.5, 5.5, 4.5])
H('三、汇编文件', 1)
rows = []
for s in ['英文', '科学', '华文', '总']:
    if s in idx: rows.append([s, os.path.basename(idx[s]['file']), idx[s]['pages'], f"{idx[s]['bytes'] / 1048576:.0f} MB"])
table(rows, ['科目', '文件', '页数', '大小'], [1.5, 9, 2, 2.5])
for s in ['英文', '科学', '华文']:
    if s not in idx: continue
    H(f'四 · {s}汇编 各章各校页数 (括号内 = 在汇编 PDF 里的起始页)', 2)
    cur = None; rows = []
    for r in idx[s]['rows']:
        if r['module'] != cur:
            cur = r['module']; rows.append([cur, '', ''])
        if r.get('pages', 0) > 0: rows.append(['', r['school'], f"{r['pages']} 页 (第 {r['at']} 页起)"])
        else: rows.append(['', r.get('school', '—'), r.get('note', '0 页')])
    table(rows, ['模块', '学校', '页数 / 起始页'], [7, 3.5, 6.5])
H('五、怎么用 (11-12 月假期, 每天 40 分钟)', 1)
for line in [
    '英语 Booklet A: 每周 2 套, 一套 25 题限时 25 分钟 (第 1 章里 10 校各一套, 够 5 周); 错题进 app 错题集, 月底看 语法 / 词汇 / 看图 哪类还在错。',
    '时态三章 (语法填空 / 改错 / 综合填空): 每天一篇, 做完对着答案页, 每个错的动词问一句 "这句讲过去还是现在"。',
    '阅读问答: 每周 2 篇, 先用笔圈题目里的 one word / from paragraph X / in your own words, 再答。',
    '作文: 每两周写一篇第 7 章里的题, 写前看 app 里「我的常错本」, 写完做「动词圈查」, 再拍照用 app 判分页批。',
    '科学 Booklet B: 每天 2 题, 答前先写 2-3 个关键词 (app 关键词库), 写完对答案页, 缺的关键词抄进错题本。',
    '华文作文: 每两周一篇第 1 章的题, 50 分钟限时, 字数 150 以上, 拍照用 app 判分页批; 阅读理解二每周 1 篇。',
    '假期结束前做一套完整模拟 (任选一校四科原卷), 看时态错误是否清零、Booklet A 能否到 20/25。',
]:
    doc.add_paragraph(line, style='List Number')
H('六、说明', 1)
P('原卷来自 sgexam.com 的公开分享, 版权属各校, 仅供家庭自用。扫描件无文字层, 分章靠 OCR 识别页眉标题, 个别页可能归错章 (已把每份卷的封面 / 空白页排除); 发现归错直接翻对应学校原卷即可。', color='64748B')
P('汇编里每校的答案页集中放在各科最后一章; 老格式科学卷 (Section A 28 题 / Section B 从 29 题起) 也按 Section B 抽取。', color='64748B')
out = os.path.join(DESK, '薄弱模块汇编_目录与用法_v1.docx'); doc.save(out); print('docx', out)
