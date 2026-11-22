import re, urllib.request, json
UA={'User-Agent':'Mozilla/5.0'}
def get(u): return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read().decode('utf-8','ignore')
allk={}
for lvl in (5,6):
  for sub in ('english','maths','science','chinese'):
    idx=get(f'https://sgexam.com/primary-{lvl}-{sub}/')
    links=sorted(set(re.findall(r'href="(https://sgexam\.com/[^"]*/(202[456])-p%d-[^"]*-pdf/?)"'%lvl,idx)))
    allk[f'{lvl}-{sub}']=[l[0] for l in links]
json.dump(allk,open('sg_links.json','w'),indent=0)
for k,v in allk.items():
  print('==',k,len(v))
  for l in v: print('  ',l.split('/')[-2])
