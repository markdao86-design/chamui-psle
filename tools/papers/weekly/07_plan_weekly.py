# -*- coding: utf-8 -*-
# v6: 按 PSLE 专家方案. 每周 4 份 (每科一张); 寒假 P5 难校; 1 月起 P6:
#   学期小测跟学校进度 -> 数理等学校教完再上预考整卷, 语言科早上整卷 -> 2026 新题型预考压轴
#   -> 7/26 起 PSLE 真题校准 + 整卷二刷 (低分卷) ; 每周日滚动错题二刷
import os, datetime, collections
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_BREAK
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

D = r'C:\Users\Eric\Desktop'
F = {'P5': 'P5年终考卷SA2_十大名校_2024-2025', 'WA1': 'P6第一学期测验卷Term1_十大名校_2024-2025',
     'WA2': 'P6第二学期测验卷Term2_十大名校_2024-2025', 'PR': 'P6预考卷Prelim_十大名校_2024-2026'}
PSLE_DIR = 'P6顶尖小学真题2025' + ' \\ ' + 'PSLE真题'
SUBS = ['英文', '数学', '科学', '华文']
ORDER = ['爱同', '红卍字', '公教', '南华', '道南', 'Rosyth', 'Henry Park', 'ACS Junior', '南洋小学', '莱佛士女小']
SEP = ' \\ '
HRS = {'英文': 1.83, '数学': 2.5, '科学': 1.75, '华文': 1.67}
TL = {'英文': '1小时50分 · 只做 Paper 2', '数学': '2小时30分 · P1+P2连做', '科学': '1小时45分', '华文': '1小时40分 · Paper 2'}
TL_NEW = dict(TL, 数学='2小时30分 · P1 70分 + P2 80分连做')
SMALL_H, SMALL_TL = 0.83, '按卷面 · 约50分钟'
KN = {'P5': 'P5 年终考', 'PR': 'P6 预考', 'WA1': '第一学期小测', 'WA2': '第二学期小测'}


def files(kind, s):
    fs = os.listdir(os.path.join(D, F[kind], s))
    return sorted(fs, key=lambda f: (f.split('_')[1], ORDER.index(f.split('_')[0]), f))


def label(f):
    p = f.split('_'); return f'{p[0]} {p[1]}'


def row(s, k, f, tl=None):
    small = k in ('WA1', 'WA2')
    return (s, KN[k] + ' · ' + label(f), F[k] + SEP + s + SEP + f, SMALL_TL if small else (tl or TL[s]), SMALL_H if small else HRS[s])


def pick(s, k, year, schools):
    out = []
    for sch in schools:
        fn = [f for f in files(k, s) if f.startswith(f'{sch}_{year}_')]
        if fn: out.append(fn[0])
    return out


def latest_first(k, s):
    fs = files(k, s)
    return [f for f in fs if '_2025_' in f] + [f for f in fs if '_2024_' in f]


start = datetime.date(2026, 11, 23)
TAG = {}
for n in range(1, 45):
    TAG[n] = ('假期班第一期' if n == 1 else '寒假自学' if n <= 4 else '假期班第二期' if n <= 6 else
              '1月4日开学 · 第一学期' if n == 7 else '第一学期' if n <= 16 else '三月假期' if n == 17 else
              '第二学期' if n <= 27 else '六月假期' if n <= 31 else '第三学期' if n <= 35 else
              '第三学期 · 真题校准' if n <= 37 else '口试周（估）' if n == 38 else '学校预考周（估）' if n <= 40 else
              '第三学期 · 整卷二刷' if n == 41 else '九月假期 · 真题冲刺' if n == 42 else '第四学期 · 真题冲刺' if n == 43 else 'PSLE 笔试（估）')
weeks = [dict(n=n, a=start + datetime.timedelta(weeks=n - 1), tag=TAG[n], rows=[], notes=[]) for n in range(1, 45)]
W = lambda n: weeks[n - 1]


def place(s, first_week, items):
    for i, it in enumerate(items):
        W(first_week + i)['rows'].append(it)
    return first_week + len(items)


def psle(s, y):
    if s == '数学' and y in (2022, 2023, 2024, 2025):
        return (s, f'PSLE 真题 · {y}', PSLE_DIR + SEP + f'PSLE_{y}_数学_Paper1+2_含答案.pdf', TL[s], HRS[s])
    return (s, f'PSLE 真题 · {y}', f'【自备】PSLE 真题书 {y} 年{s}卷（EPH 出版，Popular 书店有售）', TL_NEW[s] if y >= 2026 else TL[s], HRS[s])


def redo(s):
    return (s, '整卷二刷 · 自选', '【自选】从前面得分低于 85% 的卷子里挑一份，去对应周的文件夹重打题目', TL[s], HRS[s])


# ---------- 第 1-6 周: P5 (家长定) + 英文、科学第二份 ----------
HARD = ['Rosyth', 'Henry Park', 'ACS Junior', '南洋小学', '莱佛士女小']
EXTRA_P5 = ['红卍字', '公教', '南华', '道南', 'Rosyth']   # 寒假英文、科学第二份: 2024 P5
for s in SUBS:
    place(s, 1, [row(s, 'P5', f) for f in pick(s, 'P5', '2024', ['爱同']) + pick(s, 'P5', '2025', HARD)])
    if s in ('英文', '科学'):
        place(s, 2, [row(s, 'P5', f) for f in pick(s, 'P5', '2024', EXTRA_P5)])

# ---------- 第 7-35 周 ----------
O25 = ['爱同', '红卍字', '公教', '南华', '南洋小学', '道南', 'Rosyth', '莱佛士女小', 'Henry Park', 'ACS Junior']
O26 = ['爱同', '红卍字', '公教', '南华', '道南', 'Henry Park', '南洋小学', 'ACS Junior', '莱佛士女小']
O24 = ['红卍字', '公教', '南华', '道南', 'Rosyth', 'Henry Park', 'ACS Junior', '南洋小学', '莱佛士女小']
HOL = {17, 28, 29, 30, 31}
FLEX = lambda s, what: (s, '机动 · ' + what, '【机动】不印新卷：' + what, '约 1 小时', 1.0)
P5_LEFT = ['红卍字', '南华', '道南', '爱同']   # 2025 P5 没做过的四所, 假期第二份用
for s in ('英文', '科学'):
    if s == '英文':
        full = [row(s, 'PR', f) for f in pick(s, 'PR', '2025', O25) + pick(s, 'PR', '2026', O26) + pick(s, 'PR', '2024', O24)]
    else:   # 科学: 2025 → 2024 (旧考法, 练内容和关键词) → 2026 新题型压轴
        full = [row(s, 'PR', f) for f in pick(s, 'PR', '2025', O25) + pick(s, 'PR', '2024', O24) + pick(s, 'PR', '2026', O26)]
    n = place(s, 7, full[:29])
    wa1 = latest_first('WA1', s); wa2 = latest_first('WA2', s); p5x = [row(s, 'P5', f) for f in pick(s, 'P5', '2025', P5_LEFT)]
    small = [row(s, 'WA1', f) for f in wa1] + [row(s, 'WA2', f) for f in wa2]
    if s == '科学':   # 红卍字 2024 两份课堂测验没有答案页, 换掉
        small = [x for x in small if '红卍字_2024_' not in x[2]]
        small.append(row(s, 'P5', pick(s, 'P5', '2024', ['Henry Park'])[0]))
    si = 0; pi = 0
    for wk in range(7, 36):
        if wk in HOL and pi < len(p5x):
            W(wk)['rows'].append(p5x[pi]); pi += 1
        elif si < len(small):
            k = 'WA2' if wk >= 18 else 'WA1'
            cand = [x for x in small[si:] if x[1].startswith('第二学期' if k == 'WA2' else '第一学期')] or small[si:]
            it = cand[0]; small.remove(it); W(wk)['rows'].append(it)
# 数学: 偶数周一套 (8 周 PSLE 2022 摸底 → 2025 难校 7 → 2026 新题型 6); 奇数周机动 (错题 + 20 分钟速算)
mq = [('数学', 'PSLE 真题 · 2022（摸底）', PSLE_DIR + SEP + 'PSLE_2022_数学_Paper1+2_含答案.pdf', TL['数学'], HRS['数学'])]
mq += [row('数学', 'PR', f) for f in pick('数学', 'PR', '2025', ['公教', '南华', 'Rosyth', 'Henry Park', '南洋小学', 'ACS Junior', '莱佛士女小'])]
mq += [row('数学', 'PR', f, TL_NEW['数学']) for f in pick('数学', 'PR', '2026', ['公教', '南华', 'Henry Park', '南洋小学', 'ACS Junior', '莱佛士女小'])]
for wk in range(7, 36):
    if wk % 2 == 0 and mq: W(wk)['rows'].append(mq.pop(0))
    else: W(wk)['rows'].append(FLEX('数学', '错题重做 + 20 分钟速算'))
# 华文: 奇数周一套 (小测 2 → 2025 预考 10 → 2026 预考 3); 偶数周机动 (错题 + 阅读)
cq = [row('华文', 'WA1', f) for f in latest_first('WA1', '华文')[:2]]
cq += [row('华文', 'PR', f) for f in pick('华文', 'PR', '2025', O25) + pick('华文', 'PR', '2026', ['公教', '南洋小学', '莱佛士女小'])]
for wk in range(7, 36):
    if wk % 2 == 1 and cq: W(wk)['rows'].append(cq.pop(0))
    else: W(wk)['rows'].append(FLEX('华文', '错题重做 + 读一篇华文'))

# ---------- 第 36-43 周: PSLE 真题 + 整卷二刷 ----------
for s in SUBS:
    W(36)['rows'].append(psle(s, 2023)); W(37)['rows'].append(psle(s, 2024))
    W(41)['rows'].append(redo(s))
    W(42)['rows'].append(psle(s, 2025)); W(43)['rows'].append(psle(s, 2026))
for s in ('英文', '科学'):
    W(36)['rows'].append(redo(s)); W(37)['rows'].append(redo(s)); W(41)['rows'].append(redo(s))
W(38)['rows'] += [redo('英文'), redo('科学')]

# ---------- 每周提示 ----------
W(1)['notes'].append('第一周爱同热身，先攒“做对了”的感觉。')
W(2)['notes'].append('从这周起做 P5 难校卷，分数低很正常，重点是订正和错题本。英文、科学每周两份，第二份是 2024 年中等难度学校。')
W(4)['notes'].append('本周加一项：翻出 P5 校内做过的卷子，自己把错题整理进错题本。')
W(7)['notes'].append('开学了，开始做 P6。英文、科学每周一份预考整卷加一份学期小测；数学偶数周一套、华文奇数周一套，空的那周只做错题。')
W(8)['notes'].append('数学这周做 2022 年 PSLE 真题摸底：真题通常比名校卷温和，先给他信心。速度题（Speed）2026 年起不考，跳过。')
W(17)['notes'].append('三月假期：英文、科学第二份换成 P5 2025 整卷。')
W(17)['notes'].append('科学从这周前后进入 2024 年预考：旧考法（28 道选择题），内容还在考纲，用来练关键词表述。')
W(22)['notes'].append('数学进入 2026 年预考：新题型，卷一 70 分钟、卷二 80 分钟，连着做练耐力。')
W(26)['notes'].append('科学进入 2026 年预考：新题型，30 道选择题。英文也在做 2026 年。')
W(28)['notes'].append('六月假期：英文、科学每周两份整卷。数学、华文照旧隔周。')
W(32)['notes'].append('本周起准备口试：每周 2–3 次，每次 15 分钟聊时事和看图说话，不占卷子名额。')
W(36)['notes'].append('进入真题校准：真题用来对准难度、节奏和评分口径，不再刷更难的卷子。英文、科学、华文真题要先买好书。英文、科学另加一份整卷二刷。')
W(38)['notes'].append('PSLE 口试大约在这周（2027 年日期未公布，按 2026 年推算），只做英文、科学二刷各一份，其余时间练口试。')
W(39)['notes'].append('学校预考大约在这两周（以学校通知为准），家里不做卷子。本周起每周一套听力，约 35 分钟，不占名额。')
W(40)['notes'].append('学校预考周，家里不做卷子，只翻错题本。')
W(41)['notes'].append('整卷二刷：每科从前面得分低于 85% 的卷子里挑重做，英文、科学各两份，数学、华文各一份。')
W(42)['notes'].append('按 PSLE 真考的时间段做：上午做，时长照真考。')
W(43)['notes'].append('2026 年 PSLE 真题是第一套新题型真题，最有价值。出书了就买（预计 2027 年初），没出就用 2025 年的重做。')
W(44)['notes'].append('PSLE 笔试（2027 年日期未公布，约 9 月 23–29 日）。不做新卷，只翻错题本、范文本和科学本子，按时睡觉。')

# ---------- 统计 ----------
used = collections.Counter(); all_rows = [r for w in weeks for r in w['rows']]
for r in all_rows:
    used[r[2].split(SEP)[0] if not r[2].startswith('【') else r[2][:4]] += 1
print('rows', len(all_rows), dict(used))
for w in weeks:
    w['h'] = round(sum(r[4] for r in w['rows']))
    per = collections.Counter(r[0] for r in w['rows'] if not r[2].startswith('【'))
    assert all(v <= (2 if k in ('英文', '科学') else 1) for k, v in per.items()), (w['n'], per)
    assert sum(per.values()) <= 6, (w['n'], per)
print([(w['n'], len(w['rows'])) for w in weeks])
lib = {k: sum(len(os.listdir(os.path.join(D, v, s))) for s in SUBS) for k, v in F.items()}
use = collections.Counter()
for r in all_rows:
    for k, v in F.items():
        if r[2].startswith(v): use[k] += 1
print('library', lib, 'used', dict(use))

# ---------- docx ----------
doc = Document()
sec = doc.sections[0]
sec.page_height = Cm(29.7); sec.page_width = Cm(21)
sec.left_margin = sec.right_margin = Cm(1.2); sec.top_margin = sec.bottom_margin = Cm(1.0)
st = doc.styles['Normal']
st.font.name = '微软雅黑'; st.element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑'); st.font.size = Pt(10)
st.paragraph_format.space_after = Pt(2)
for h, sz in (('Heading 1', 16), ('Heading 2', 12.5)):
    hs = doc.styles[h]; hs.font.name = '微软雅黑'; hs.element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')
    hs.font.color.rgb = RGBColor(0x1E, 0x40, 0xAF); hs.font.size = Pt(sz)
r = sec.header.paragraphs[0].add_run('佑子 P6 每周卷子清单 v10'); r.font.size = Pt(8)


def para(t, b=False, size=None):
    p = doc.add_paragraph(); r = p.add_run(t); r.bold = b
    if size: r.font.size = Pt(size)
    return p


def shade(cell, color):
    tcPr = cell._tc.get_or_add_tcPr(); s = OxmlElement('w:shd')
    s.set(qn('w:val'), 'clear'); s.set(qn('w:color'), 'auto'); s.set(qn('w:fill'), color); tcPr.append(s)


def table(head, rows, widths, fs=9):
    t = doc.add_table(rows=1, cols=len(head)); t.style = 'Table Grid'
    for i, h in enumerate(head):
        c = t.rows[0].cells[i]; c.text = h; c.paragraphs[0].runs[0].bold = True; shade(c, 'DCE6F5')
    for rw in rows:
        cs = t.add_row().cells
        for i, v in enumerate(rw): cs[i].text = str(v)
    for rw in t.rows:
        trPr = rw._tr.get_or_add_trPr(); cs = OxmlElement('w:cantSplit'); trPr.append(cs)
        for i, w in enumerate(widths): rw.cells[i].width = Cm(w)
        for c in rw.cells:
            for p in c.paragraphs:
                p.paragraph_format.space_after = Pt(0)
                for rr in p.runs: rr.font.size = Pt(fs)
    return t


doc.add_heading('佑子 P6 每周卷子清单 v10', 1)
para('2026年11月23日 至 2027年 PSLE 笔试，共 44 周。依据：11月21日家长面谈整理 + PSLE 备考专家方案；数学、科学 P6 内容已自学完，华文已稳定 90% 以上。')
para('一句话：名校卷练硬功夫，真题对准尺子；最后一个月靠真题，不靠更难的卷子。', b=True)
doc.add_heading('一、规矩', 2)
for t in ['1. 比例：英文、科学每周两份；数学、华文隔周一份，空的那周只做错题（数学加 20 分钟速算，华文加读一篇）。',
          '2. 上学周英文、科学 = 一份预考整卷 + 一份学期小测；假期 = 两份整卷。',
          '3. 寒假做 P5 难校卷。1 月开学起只做 P6，数理已自学完，1 月中起直接做预考整卷。',
          '4. 顺序：2025 预考 → 2026 新题型压轴（6–7 月）。科学中间插 2024 预考练内容。数学 2024 旧考法不排。',
          '5. 7 月 26 日起 PSLE 真题对准难度，夹着整卷二刷。学校预考和口试那几周家里不做卷或只做两份。',
          '6. 英文只做 Paper 2。作文按老师的范文和第二稿走，不在这里。']:
    para(t)
doc.add_heading('二、时间表', 2)
table(['周', '时间', '英文（每周 2）', '科学（每周 2）', '数学（隔周）', '华文（隔周）'], [
    ['1–6', '11/23–1/3 寒假', 'P5 难校 2025 + 第二份 P5 2024 中等校', '同英文', 'P5 难校 2025，每周', 'P5 难校 2025，每周'],
    ['7–16', '1/4–3/14 第一学期', '2025 预考 + 小测 WA1', '2025 预考 + 小测 WA1', '偶数周：8 周 PSLE 2022 摸底，然后 2025 预考难校', '奇数周：小测两份，然后 2025 预考'],
    ['17', '3/15–21 三月假', '2026 预考 + P5 2025 整卷', '2024 预考 + P5 2025 整卷', '机动', '2025 预考'],
    ['18–27', '3/22–5/30 第二学期', '2026 预考 + 小测 WA2', '2024 预考 + 小测 WA2', '偶数周：2025 收尾，22 周起 2026 预考', '奇数周：2025 预考'],
    ['28–31', '5/31–6/27 六月假', '2024 预考 + P5 2025 整卷', '2026 预考 + P5 2025 整卷', '偶数周：2026 预考', '奇数周：2025 收尾，2026 预考'],
    ['32–35', '6/28–7/25', '2024 预考 + 小测', '2026 预考 + 小测', '偶数周：2026 预考收尾', '奇数周：2026 预考'],
    ['36–37', '7/26–8/8', 'PSLE 真题 2023、2024 + 整卷二刷', '同英文', 'PSLE 真题 2023、2024', 'PSLE 真题 2023、2024'],
    ['38', '8/9–8/15 口试周', '整卷二刷一份', '整卷二刷一份', '练口试', '练口试'],
    ['39–40', '8/16–8/29 学校预考', '不做家庭卷', '', '', ''],
    ['41', '8/30–9/5', '整卷二刷两份', '整卷二刷两份', '整卷二刷一份', '整卷二刷一份'],
    ['42–43', '9/6–9/19', 'PSLE 真题 2025、2026', '同左', '同左', '同左'],
    ['44', '9/20 起', 'PSLE 笔试，不做新卷', '', '', ''],
], [1.2, 3.0, 3.6, 3.6, 3.3, 3.3], fs=8.5)
para('考试日期按 2026 年考评局时间表推算，2027 年的还没公布；校历按教育部公布的 2027 年校历。', size=9)
doc.add_heading('三、卷子刷几遍', 2)
for t in ['1. 新卷做一遍：限时整卷，家长批分，分数写在清单上。',
          '2. 错题滚动二刷：每周日 40 分钟，重做一周前和四周前的错题。比集中重做记得牢。',
          '3. 整卷二刷：只重做得分低于 85% 的卷子，英文、科学各最多 5 份，数学、华文各最多 2 份，放在第 36–38、41 周。',
          '4. 错题最后一轮：9 月照错题本从头过一遍，只做第一次还错的，再做二刷还错的。',
          '5. 结果：好卷子做一遍，低分卷做两遍，错题做三到四遍。']:
    para(t)
doc.add_heading('四、错题本', 2)
for t in ['1. 英文只记五类：Grammar MCQ、Vocabulary MCQ、句式转换、固定搭配、Editing。Cloze 不记。',
          '2. 写法：抄题、写正确整句、圈出考的词、旁边写一句为什么错。',
          '3. 科学：问答题把标准答案的关键词抄进科学本子，用关键词重写一遍答案。',
          '4. 数学：只记“会做但做错”的题，写清楚错在哪一步。',
          '5. 每页标日期，二刷做对打勾，连对两次就不再做。']:
    para(t)
doc.add_heading('五、要买的书', 2)
para('PSLE 真题书：英文、科学、华文各买 2023–2025 年版（EPH 出版的 PSLE Examination Q&A，Popular 书店有售）。数学手上已有 2022–2025 四年。2026 年真题书出了就加买，四科都要，那是第一套新题型真题。')
doc.add_heading('六、选卷原则', 2)
for t in ['1. 寒假的 P5 卷做完后，按他自己每所学校的得分排“对他来说哪所难”，预考阶段先做他得分高的学校。',
          '2. 两所最难的学校（南洋、莱佛士女小）不连着排。',
          '3. 哪周考砸了，下周换一所温和的学校。',
          '4. 2024 年数学、科学预考是旧题型，不排；2025 年的照用，速度题跳过。',
          '5. 没排进计划的卷子是备用，哪科某周特别差，从备用里挑同科补一张。']:
    para(t)
doc.add_heading('七、每张卷子的做法', 2)
for t in ['1. 限时一次做完，中途不查书、不问人。数学卷一卷二连着做，练后半段的耐力。',
          '2. 科学最后 10 分钟强制检查，问答题对照关键词清单自己先批一遍。',
          '3. 分数不理想不要责怪。具体夸他做对的地方。']:
    para(t)
doc.add_heading('八、要家长确认的事', 2)
for t in [          '2. 2027 年 PSLE 口试、听力、笔试日期和学校预考日期都还没公布，出了以后要微调第 38–44 周。']:
    para(t)
doc.add_heading('九、每天固定', 2)
para('☐ 补习班作业 2 小时，查结果　☐ 错题本和范文本翻 10 分钟，家长抽问　☐ 科学本子抽一个主题，要点用完整的词说出来')

for w in weeks:
    a = w['a']; b = a + datetime.timedelta(days=6)
    hp = para(f'第 {w["n"]} 周　{a.month}月{a.day}日 – {b.month}月{b.day}日　·　{w["tag"]}　·　本周做卷约 {w["h"]} 小时', b=True, size=11)
    hp.paragraph_format.keep_with_next = True; hp.paragraph_format.space_before = Pt(8)
    if w['rows']:
        rows = sorted(w['rows'], key=lambda r: SUBS.index(r[0]))
        table(['☐', '科目', '卷子', '打印哪份（桌面文件夹 \\ 科目 \\ 文件名）', '限时', '得分', '错题进本'],
              [('☐', r[0], r[1], r[2], r[3], '', '☐') for r in rows], [0.7, 1.0, 3.4, 7.0, 2.6, 1.2, 1.3], fs=8.5)
    for n in w['notes']:
        para('提示：' + n, size=9)
    if w['n'] <= 43:
        para('本周另做：☐ 周日 40 分钟错题二刷　☐ 科学练习册一个单元　☐ 作文第二稿打字发老师　☐ 聊一条新闻　　家长签字：________', size=9)

out = os.path.join(D, '佑子P6每周卷子清单_v10.docx')
doc.save(out); print('saved', out)
