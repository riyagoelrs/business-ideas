from __future__ import annotations

import re
from typing import List
from bs4 import BeautifulSoup
import refresh_scores as base

LISTS=[
    ('Burger','https://beliapp.com/nyc-burger-search'),
    ('Italian Sandwich','https://beliapp.com/nyc-italian-sandwich-search'),
]

def fetch_beli() -> List[dict]:
    out=[]
    for category,url in LISTS:
        try:
            r=base.session().get(url,timeout=20); r.raise_for_status(); soup=BeautifulSoup(r.text,'html.parser')
        except Exception as exc:
            print('precise Beli fetch failed',category,type(exc).__name__); continue
        found=[]
        for h in soup.find_all('h2'):
            text=h.get_text(' ',strip=True)
            m=re.match(r'^#\s*(\d+)\s*-\s*(.+?)\s*$',text)
            if not m: continue
            rank=int(m.group(1)); name=m.group(2).strip()
            rating=None; node=h.find_next(['h3','p'])
            hops=0
            while node is not None and hops<5:
                t=node.get_text(' ',strip=True)
                rm=re.search(r'Beli rating:\s*(\d+(?:\.\d+)?)',t,re.I)
                if rm:
                    rating=float(rm.group(1)); break
                if node.name=='h2': break
                node=node.find_next(['h2','h3','p']); hops+=1
            if rating is not None and 0<=rating<=10:
                found.append((rank,name,rating))
        found.sort(key=lambda x:x[0]); total=len(found)
        for rank,name,rating in found:
            out.append({'name':name,'city':'New York, NY','sources':{'beli':{'rating':rating,'category':category,'rank':rank,'total':total,'source_url':url,'provider':'Beli public ranked list'}}})
        print('precise Beli',category,total)
    return out

def clean_and_apply(rows):
    # Remove prior parser output before applying only verified ranked-list entries.
    for r in rows:
        if r.get('city')=='New York, NY':
            (r.get('sources') or {}).pop('beli',None)
    beli=fetch_beli(); nyc=[r for r in rows if r.get('city')=='New York, NY' and r.get('name')]
    matched=0
    for b in beli:
        cand=sorted(((base.slug(b['name'])==base.slug(r['name']), r) for r in nyc),key=lambda x:x[0],reverse=True)
        exact=cand[0][1] if cand and cand[0][0] else None
        if exact is None:
            # Reuse v11's fuzzy matcher if imported; local conservative token similarity otherwise.
            bn=set(base.slug(b['name']).split()); best=None; bestscore=0.0
            for r in nyc:
                rn=set(base.slug(r['name']).split()); inter=len(bn&rn); union=max(1,len(bn|rn)); score=inter/union
                if base.slug(b['name']) in base.slug(r['name']) or base.slug(r['name']) in base.slug(b['name']): score=max(score,.9)
                if score>bestscore: bestscore,best=score,r
            exact=best if bestscore>=.66 else None
        if exact is not None:
            exact.setdefault('sources',{})['beli']=b['sources']['beli']; matched+=1
    print('precise Beli matched',matched,'of',len(beli))
    return matched
