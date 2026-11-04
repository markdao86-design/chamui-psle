# -*- coding: utf-8 -*-
# agent 转录的 keys_manual/<subj>_<slug>.json → 合进 keys.json (mcq / mcqMax / ok / missing), 带校验
import os, json, glob
SP = os.path.dirname(os.path.abspath(__file__))
keys = json.load(open(os.path.join(SP, 'keys.json'), encoding='utf-8'))
EXPECT = {'eng': 25, 'sci': (28, 30), 'math': 15, 'cn': 29}
report = []
for f in sorted(glob.glob(os.path.join(SP, 'keys_manual', '*.json'))):
    try: m = json.load(open(f, encoding='utf-8'))
    except Exception as e: report.append(f'BAD JSON {os.path.basename(f)}: {e}'); continue
    subj, slug = m.get('subj'), m.get('slug'); k = f'{slug}|{subj}'
    if k not in keys: report.append(f'UNKNOWN paper {k}'); continue
    mcq = {}
    for q, a in (m.get('mcq') or {}).items():
        try: q = int(q); a = int(a)
        except Exception: continue
        if 1 <= a <= 4: mcq[str(q)] = a
    exp = EXPECT[subj]
    n = len(mcq); maxq = max((int(q) for q in mcq), default=0)
    if subj == 'sci': expected = 28 if maxq <= 28 and n <= 28 else 30
    else: expected = exp
    missing = [q for q in range(1, expected + 1) if str(q) not in mcq]
    rec = keys[k]; rec['mcq'] = mcq; rec['mcqMax'] = expected; rec['missing'] = missing; rec['ok'] = not missing
    rec['confidence'] = m.get('confidence', ''); rec['notes'] = m.get('notes', '')
    report.append(f"{'OK ' if rec['ok'] else 'GAP'} {subj} {rec['school']}: {n}/{expected} missing {missing} {m.get('notes', '')[:80]}")
json.dump(keys, open(os.path.join(SP, 'keys.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('\n'.join(report)); print('complete keys:', sum(1 for v in keys.values() if v.get('ok')), '/', len(keys))
