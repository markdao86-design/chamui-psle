# -*- coding: utf-8 -*-
# 补充下载 sgexam 2025/2024/2023 全部 P6 Prelim (已有的 2025 十校跳过) → 桌面 + 卷子站目录 → papers_more.json
import re, os, json, time, urllib.request, html, shutil, sys
from concurrent.futures import ThreadPoolExecutor
UA = {'User-Agent': 'Mozilla/5.0'}
DESK = r'C:\Users\Eric\Desktop\P6顶尖小学真题2025'
PUB = r'C:\claude\chamui-papers\public'
SUBJ = {'english': ('eng', '英文'), 'maths': ('math', '数学'), 'science': ('sci', '科学'), 'chinese': ('cn', '华文')}
CN = {'acsj': 'ACS Junior', 'acsp': 'ACS Primary', 'mgs': '美以美女小', 'maris-stella': 'Maris Stella 海星', 'scgs': '新加坡华中女校 SCGS', 'pei-chun': '培群', 'nanyang': '南洋小学', 'raffles-girls': '莱佛士女小', 'rosyth': 'Rosyth', 'tao-nan': '道南', 'nan-hua': '南华', 'catholic-high': '公教', 'acs-junior': 'ACS Junior',
      'henry-park': 'Henry Park', 'methodist-girls': '美以美女小', 'ai-tong': '爱同', 'red-swastika': '红卍字', 'st-nicholas': '圣尼各拉女校', 'mgs-paya-lebar': 'MGS 巴耶利峇',
      'pei-hwa': '培华', 'chij': 'CHIJ', 'scgs': '新加坡华中女校 SCGS', 'singapore-chinese-girls': 'SCGS', 'maha-bodhi': '菩提', 'nan-chiau': '南侨', 'kong-hwa': '光华', 'pei-chun': '培群',
      'raffles': '莱佛士', 'acs-primary': 'ACS Primary', 'anglo-chinese': 'ACS', 'st-hildas': "St Hilda's", 'chij-st-nicholas': '圣尼各拉女校', 'temasek': 'Temasek', 'rulang': '育龙', 'henry': 'Henry Park', 'tao-nan-school': '道南'}
SLUG10 = {'nanyang': 'nanyang', 'raffles-girls': 'rgps', 'rosyth': 'rosyth', 'tao-nan': 'taonan', 'nan-hua': 'nanhua', 'catholic-high': 'chs', 'acs-junior': 'acsj', 'henry-park': 'henrypark', 'methodist-girls': 'mgs', 'ai-tong': 'aitong'}
def get(url, binary=False, tries=3):
    err = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r: data = r.read()
            return data if binary else data.decode('utf-8', 'ignore')
        except Exception as e: err = e; time.sleep(2 * (i + 1))
    raise err
jobs = []
for sub, (s, cn) in SUBJ.items():
    idx = get(f'https://sgexam.com/primary-6-{sub}/')
    for y in (2026, 2025, 2024, 2023):
        links = sorted(set(re.findall(rf'href="(https://sgexam\.com/[^"]*{y}-p6-{sub}-prelim-(?:exam-)?([a-z0-9-]+)-pdf/?)"', idx)))
        for url, school_slug in links:
            if y == 2025 and school_slug in SLUG10: continue   # 已有
            jobs.append((s, cn, y, school_slug, url))
print('jobs', len(jobs), flush=True)
def run(job):
    s, cn, y, ss, page_url = job
    slug = SLUG10.get(ss, ss.replace('-', ''))
    name = CN.get(ss, ss.replace('-', ' ').title())
    dst = os.path.join(PUB, str(y), s, f'{slug}.pdf'); os.makedirs(os.path.dirname(dst), exist_ok=True)
    desk = os.path.join(DESK, cn, f'{name}_{y}_P6_{cn}_Prelim.pdf')
    try:
        if not (os.path.exists(dst) and os.path.getsize(dst) > 100000):
            page = html.unescape(get(page_url))
            m = re.search(r'https://drive\.google\.com/uc\?export=download&(?:#038;|amp;)?id=([A-Za-z0-9_-]+)', page)
            if not m: return {'subj': s, 'year': y, 'school': name, 'status': 'no-link', 'page': page_url}
            data = get(f'https://drive.google.com/uc?export=download&confirm=t&id={m.group(1)}', binary=True)
            if not data.startswith(b'%PDF'):
                m2 = re.search(r'confirm=([0-9A-Za-z_]+)', data.decode('utf-8', 'ignore'))
                if m2: data = get(f'https://drive.google.com/uc?export=download&confirm={m2.group(1)}&id={m.group(1)}', binary=True)
            if not data.startswith(b'%PDF'): return {'subj': s, 'year': y, 'school': name, 'status': 'not-pdf', 'page': page_url}
            open(dst, 'wb').write(data)
        if not os.path.exists(desk): shutil.copy2(dst, desk)
        return {'subj': s, 'subjCn': cn, 'school': name, 'slug': slug, 'year': y, 'url': f'https://chamui-papers.web.app/{y}/{s}/{slug}.pdf', 'bytes': os.path.getsize(dst), 'src': desk, 'status': 'ok', 'page': page_url}
    except Exception as e:
        return {'subj': s, 'year': y, 'school': name, 'status': 'error: ' + str(e)[:80], 'page': page_url}
out = []
with ThreadPoolExecutor(6) as ex:
    for r in ex.map(run, jobs):
        out.append(r); print(r['status'], r['year'], r['subj'], r['school'], r.get('bytes', 0) // 1024, 'KB', flush=True)
json.dump(out, open(r'C:\claude\chamui-papers\papers_more.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
ok = [o for o in out if o['status'] == 'ok']
print('DONE ok', len(ok), '/', len(out), 'MB', sum(o['bytes'] for o in ok) // 1048576)
