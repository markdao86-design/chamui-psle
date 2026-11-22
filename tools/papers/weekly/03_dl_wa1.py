# -*- coding: utf-8 -*-
import re, os, json, time, urllib.request, html
from concurrent.futures import ThreadPoolExecutor
UA={'User-Agent':'Mozilla/5.0'}
ROOT=r'C:\Users\Eric\Desktop\P6第一学期测验卷Term1_十大名校_2024-2025'
SUBJ={'english':'英文','maths':'数学','science':'科学','chinese':'华文'}
TOP={'nanyang':'南洋小学','raffles-girls':'莱佛士女小','henry-park':'Henry Park','rosyth':'Rosyth','tao-nan':'道南',
     'nan-hua':'南华','catholic-high':'公教','acs-junior':'ACS Junior','red-swastika':'红卍字','ai-tong':'爱同'}
KIND={'weighted-assessment-1':'WA1计分测验','term-assessment-1':'第一学期测验','class-test-1':'课堂测验1',
      'non-weighted-assessment-1':'非计分测验1','bite-sized-assessment-1':'小测1'}
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
    lvl,sub=key.split('-')
    if lvl!='6': continue
    cn=SUBJ[sub]
    for u in lst:
        s=u.rstrip('/').split('/')[-1]
        m=re.match(r'(202[456])-p6-[a-z]+-(.+)-pdf$',s)
        if not m: continue
        y,rest=m.groups()
        for k,kn in KIND.items():
            if rest.startswith(k+'-') and rest[len(k)+1:] in TOP:
                name=TOP[rest[len(k)+1:]]
                jobs.append(dict(y=y,name=name,cn=cn,kind=kn,url=u,dst=os.path.join(ROOT,cn,f'{name}_{y}_P6_{cn}_{kn}.pdf')))
print('jobs',len(jobs),flush=True)
def run(j):
    os.makedirs(os.path.dirname(j['dst']),exist_ok=True)
    try:
        if os.path.exists(j['dst']) and os.path.getsize(j['dst'])>30000: j['status']='ok'; return j
        page=html.unescape(get(j['url']))
        m=re.search(r'https://drive\.google\.com/uc\?export=download&(?:#038;|amp;)?id=([A-Za-z0-9_-]+)',page) or re.search(r'drive\.google\.com/file/d/([A-Za-z0-9_-]+)',page)
        if not m: j['status']='no-link'; return j
        fid=m.group(1)
        d=get(f'https://drive.google.com/uc?export=download&confirm=t&id={fid}',binary=True)
        if not d.startswith(b'%PDF'):
            d=get(f'https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t',binary=True)
        if not d.startswith(b'%PDF'): j['status']='not-pdf'; return j
        open(j['dst'],'wb').write(d); j['status']='ok'; return j
    except Exception as e: j['status']='error '+str(e)[:80]; return j
out=[]
with ThreadPoolExecutor(6) as ex:
    for r in ex.map(run,jobs): out.append(r)
json.dump(out,open('dl_t1_result.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
for o in out:
    if not o['status'].startswith('ok'): print('FAIL',o['status'],o['url'])
print('DONE',sum(o['status'].startswith('ok') for o in out),'/',len(out))
