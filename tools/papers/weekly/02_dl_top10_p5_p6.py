# -*- coding: utf-8 -*-
import re, os, json, time, urllib.request, html, shutil
from concurrent.futures import ThreadPoolExecutor
UA={'User-Agent':'Mozilla/5.0'}
ROOT=r'C:\Users\Eric\Desktop\P5P6十大名校卷_2024-2026'
OLD=r'C:\Users\Eric\Desktop\P6顶尖小学真题2025'
SUBJ={'english':'英文','maths':'数学','science':'科学','chinese':'华文'}
TOP={'nanyang':'南洋小学','raffles-girls':'莱佛士女小','henry-park':'Henry Park','rosyth':'Rosyth','tao-nan':'道南',
     'nan-hua':'南华','catholic-high':'公教','acs-junior':'ACS Junior','acsj':'ACS Junior','red-swastika':'红卍字','ai-tong':'爱同'}
links=json.load(open('sg_links.json'))
def get(url,binary=False,tries=3):
    err=None
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=180) as r: d=r.read()
            return d if binary else d.decode('utf-8','ignore')
        except Exception as e: err=e; time.sleep(2*(i+1))
    raise err
jobs=[]
for key,lst in links.items():
    lvl,sub=key.split('-'); cn=SUBJ[sub]
    kind='Prelim' if lvl=='6' else '年终考'
    for u in lst:
        m=re.search(r'/(202[456])-p\d-[a-z]+-(prelim-exam|end-of-year-exam)-([a-z0-9-]+)-pdf/?$',u)
        if not m or m.group(3) not in TOP: continue
        y=m.group(1); name=TOP[m.group(3)]
        folder=os.path.join(ROOT,f'P{lvl}_{"预考Prelim" if lvl=="6" else "年终考SA2"}',cn)
        jobs.append(dict(lvl=lvl,y=y,name=name,cn=cn,url=u,dst=os.path.join(folder,f'{name}_{y}_P{lvl}_{cn}_{kind}.pdf'),old=os.path.join(OLD,cn,f'{name}_{y}_P6_{cn}_Prelim.pdf')))
print('jobs',len(jobs),flush=True)
def run(j):
    os.makedirs(os.path.dirname(j['dst']),exist_ok=True)
    try:
        if os.path.exists(j['dst']) and os.path.getsize(j['dst'])>50000: j['status']='ok'; return j
        if j['lvl']=='6' and os.path.exists(j['old']) and os.path.getsize(j['old'])>50000:
            shutil.copy2(j['old'],j['dst']); j['status']='ok(copied)'; return j
        page=html.unescape(get(j['url']))
        m=re.search(r'https://drive\.google\.com/uc\?export=download&(?:#038;|amp;)?id=([A-Za-z0-9_-]+)',page) or re.search(r'drive\.google\.com/file/d/([A-Za-z0-9_-]+)',page)
        if not m: j['status']='no-link'; return j
        fid=m.group(1)
        d=get(f'https://drive.google.com/uc?export=download&confirm=t&id={fid}',binary=True)
        if not d.startswith(b'%PDF'):
            m2=re.search(r'confirm=([0-9A-Za-z_]+)',d.decode('utf-8','ignore'))
            if m2: d=get(f'https://drive.google.com/uc?export=download&confirm={m2.group(1)}&id={fid}',binary=True)
        if not d.startswith(b'%PDF'):
            d=get(f'https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t',binary=True)
        if not d.startswith(b'%PDF'): j['status']='not-pdf'; return j
        open(j['dst'],'wb').write(d); j['status']='ok'; return j
    except Exception as e: j['status']='error '+str(e)[:80]; return j
out=[]
with ThreadPoolExecutor(6) as ex:
    for r in ex.map(run,jobs):
        out.append(r); print(r['status'],r['lvl'],r['y'],r['cn'],r['name'],flush=True)
json.dump(out,open('dl_top10_result.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('DONE',sum(1 for o in out if o['status'].startswith('ok')),'/',len(out))
