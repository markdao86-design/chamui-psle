# -*- coding: utf-8 -*-
# agent 转录的 keys_manual/<subj>_<slug>.json → 合进 keys.json (mcq / mcqMax / ok / missing), 带校验
import os, json, glob
SP = os.path.dirname(os.path.abspath(__file__))
keys = json.load(open(os.path.join(SP, 'keys.json'), encoding='utf-8'))
EXPECT = {'eng': 25, 'sci': (28, 30), 'math': 15, 'cn': 25}
report = []
for f in sorted(glob.glob(os.path.join(SP, 'keys_manual', '*.json'))):
    try: m = json.load(open(f, encoding='utf-8'))
    except Exception as e: report.append(f'BAD JSON {os.path.basename(f)}: {e}'); continue
    subj, slug, year = m.get('subj'), m.get('slug'), int(m.get('year') or 2025); k = f'{slug}|{subj}' if year == 2025 else f'{slug}|{subj}|{year}'
    if k not in keys: report.append(f'UNKNOWN paper {k}'); continue
    mcq = {}
    for q, a in (m.get('mcq') or {}).items():
        try: q = int(q); a = int(a)
        except Exception: continue
        if 1 <= a <= 4: mcq[str(q)] = a
    exp = EXPECT[subj]
    if not mcq: report.append(f"NONE {subj} {keys[k]['school']} {year}: {m.get('notes', '')[:100]}"); keys[k].update({'mcq': {}, 'ok': False, 'missing': [], 'notes': m.get('notes', '')}); continue
    n = len(mcq); maxq = max((int(q) for q in mcq), default=0)
    if subj == 'sci': expected = 28 if maxq <= 28 and n <= 28 else 30
    else: expected = exp
    # agent 报的本卷选择题数 (老格式数学 18 / 华文 20-32 题), 合理范围内以它为准
    mm = m.get('mcqMax')
    if isinstance(mm, int) and ((subj == 'math' and mm in (15, 18)) or (subj == 'cn' and 15 <= mm <= 32) or (subj == 'sci' and mm in (28, 30)) or (subj == 'eng' and mm in (25, 28, 30))): expected = mm
    missing = [q for q in range(1, expected + 1) if str(q) not in mcq]
    if subj == 'cn':   # 华文 26-29 一类是选词填空 (选项 5-8), 不算选择题: 前 25 题齐就能判, 题数按实际键
        missing = [q for q in range(1, 26) if str(q) not in mcq]; expected = n
    elif missing and len(missing) <= 2 and n >= expected - 2:   # 多答案 / 涂改看不清的 1-2 题不判, 其余照判
        expected = n; missing_note = missing; missing = []
        m['notes'] = (m.get('notes', '') + f' | 不判: Q{missing_note}').strip(' |')
    rec = keys[k]; rec['mcq'] = mcq; rec['mcqMax'] = expected; rec['missing'] = missing; rec['ok'] = not missing
    rec['confidence'] = m.get('confidence', ''); rec['notes'] = m.get('notes', '')
    report.append(f"{'OK ' if rec['ok'] else 'GAP'} {subj} {rec['school']}: {n}/{expected} missing {missing} {m.get('notes', '')[:80]}")
json.dump(keys, open(os.path.join(SP, 'keys.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('\n'.join(report)); print('complete keys:', sum(1 for v in keys.values() if v.get('ok')), '/', len(keys))
