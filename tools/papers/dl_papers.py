# -*- coding: utf-8 -*-
# 从 sgexam.com 下 2025 P6 Prelim 四科 × 10 校 到桌面, 产出 manifest.json
import re, os, json, time, urllib.request, html
UA = {'User-Agent': 'Mozilla/5.0'}
DESK = r'C:\Users\Eric\Desktop\P6顶尖小学真题2025'
SUBJ = {'english': '英文', 'maths': '数学', 'science': '科学', 'chinese': '华文'}
SCHOOLS = {  # sgexam slug → 中文名
    'nanyang': '南洋小学', 'raffles-girls': '莱佛士女小', 'rosyth': 'Rosyth', 'tao-nan': '道南', 'nan-hua': '南华',
    'catholic-high': '公教', 'acs-junior': 'ACS Junior', 'henry-park': 'Henry Park', 'methodist-girls': '美以美女小', 'ai-tong': '爱同',
}
def get(url, binary=False, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            return data if binary else data.decode('utf-8', 'ignore')
        except Exception as e:
            time.sleep(2 * (i + 1)); err = e
    raise err
manifest = []
for sub, cn in SUBJ.items():
    idx = get(f'https://sgexam.com/primary-6-{sub}/')
    links = sorted(set(re.findall(r'href="(https://sgexam\.com/[^"]*2025-p6-[^"]*prelim[^"]*)"', idx)))
    os.makedirs(os.path.join(DESK, cn), exist_ok=True)
    for slug, name in SCHOOLS.items():
        cand = [l for l in links if l.rstrip('/').endswith(f'-{slug}-pdf') or f'-{slug}-pdf' in l]
        if not cand:
            manifest.append({'subject': cn, 'school': name, 'status': 'missing'}); print('MISSING', cn, name); continue
        page = get(cand[0])
        m = re.search(r'https://drive\.google\.com/uc\?export=download&(?:#038;|amp;)?id=([A-Za-z0-9_-]+)', html.unescape(page))
        if not m:
            manifest.append({'subject': cn, 'school': name, 'status': 'no-drive-link', 'page': cand[0]}); print('NOLINK', cn, name); continue
        fid = m.group(1)
        fn = os.path.join(DESK, cn, f'{name}_2025_P6_{cn}_Prelim.pdf')
        if not (os.path.exists(fn) and os.path.getsize(fn) > 100000):
            data = get(f'https://drive.google.com/uc?export=download&confirm=t&id={fid}', binary=True)
            if not data.startswith(b'%PDF'):
                # 大文件确认页: 找 confirm 参数
                m2 = re.search(r'confirm=([0-9A-Za-z_]+)', data.decode('utf-8', 'ignore'))
                if m2:
                    data = get(f'https://drive.google.com/uc?export=download&confirm={m2.group(1)}&id={fid}', binary=True)
            if not data.startswith(b'%PDF'):
                manifest.append({'subject': cn, 'school': name, 'status': 'not-pdf', 'page': cand[0]}); print('NOTPDF', cn, name); continue
            open(fn, 'wb').write(data)
        manifest.append({'subject': cn, 'school': name, 'status': 'ok', 'file': fn, 'bytes': os.path.getsize(fn), 'page': cand[0]})
        print('OK', cn, name, os.path.getsize(fn) // 1024, 'KB')
json.dump(manifest, open(os.path.join(DESK, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
ok = sum(1 for m in manifest if m['status'] == 'ok'); print('DONE', ok, '/', len(manifest))
