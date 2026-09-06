from __future__ import annotations

import json, math, re, xml.etree.ElementTree as ET
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Optional

import refresh_scores as base

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'; RAW=DATA/'raw_snapshot.json'; SCORES=DATA/'restaurant_scores.json'; STATE=DATA/'v11_enrichment_state.json'

LEGACY_PUBLIC_SEED=[
 {'name':'4 Charles Prime Rib','lat':40.7353,'lng':-74.0008,'neighborhood':'West Village','public_rating':4.6,'review_count':612,'access_score':100,'beli':10.0},
 {'name':'Emily West Village','lat':40.7298,'lng':-74.0036,'neighborhood':'West Village','public_rating':4.1,'review_count':1182,'access_score':70,'beli':9.8},
 {'name':'Minetta Tavern','lat':40.7300,'lng':-74.0001,'neighborhood':'Greenwich Village','public_rating':4.1,'review_count':2686,'access_score':80,'beli':9.8},
 {'name':'Au Cheval','lat':40.7180,'lng':-74.0025,'neighborhood':'Tribeca','public_rating':4.3,'review_count':1396,'access_score':75,'beli':9.7},
 {'name':'7th Street Burger','lat':40.7267,'lng':-73.9854,'neighborhood':'East Village','public_rating':4.4,'review_count':509,'access_score':55,'beli':9.5},
 {'name':'Nowon East Village','lat':40.7245,'lng':-73.9824,'neighborhood':'East Village','public_rating':4.4,'review_count':558,'access_score':70,'beli':9.5},
 {'name':'The Polo Bar','lat':40.7617,'lng':-73.9747,'neighborhood':'Midtown East','public_rating':4.4,'review_count':688,'access_score':95,'beli':9.4},
 {'name':'The Fulton','lat':40.7068,'lng':-74.0029,'neighborhood':'Seaport','public_rating':3.6,'review_count':560,'access_score':45,'beli':9.4},
]
REDDIT_FEEDS=['https://www.reddit.com/r/FoodNYC/new/.rss?limit=100','https://www.reddit.com/r/FoodNYC/hot/.rss?limit=100','https://www.reddit.com/r/AskNYC/new/.rss?limit=100']

def norm(s):
 s=(s or '').lower().replace('&',' and '); s=re.sub(r'[^a-z0-9]+',' ',s).strip(); return re.sub(r'^the\s+','',s)
def toks(s):
 stop={'the','and','restaurant','nyc','new','york','east','west','upper','lower','bar','cafe','coffee'}; return [x for x in norm(s).split() if len(x)>2 and x not in stop]
def sim(a,b):
 na,nb=norm(a),norm(b)
 if not na or not nb:return 0
 if na==nb:return 1
 if na in nb or nb in na:return .92
 ta,tb=set(toks(a)),set(toks(b)); jac=len(ta&tb)/max(1,len(ta|tb)); seq=SequenceMatcher(None,na,nb).ratio(); return max(seq,jac*.9+seq*.1)
def load_rows():
 try:
  d=json.loads(RAW.read_text()); return d if isinstance(d,list) else []
 except:return []

def ensure_seed(rows):
 nyc=[r for r in rows if r.get('city')=='New York, NY']
 for s in LEGACY_PUBLIC_SEED:
  scored=sorted(((sim(s['name'],r.get('name','')),r) for r in nyc),key=lambda x:x[0],reverse=True)
  best=scored[0][1] if scored and scored[0][0]>=.82 else None
  if best is None:
   best={'name':s['name'],'city':'New York, NY','lat':s['lat'],'lng':s['lng'],'neighborhood':s['neighborhood'],'sources':{'osm':{'seeded':True}}}; rows.append(best); nyc.append(best)
  src=best.setdefault('sources',{}); src['public_reviews']={'rating':s['public_rating'],'review_count':s['review_count'],'provider':'public restaurant metadata seed','captured_at':'2026-09-06'}; src['reservation']={'scarcity_score':s['access_score'],'provider':'prototype access signal'}; src.setdefault('beli',{'rating':s['beli'],'provider':'public Beli list seed'})
  if not best.get('lat'): best['lat'],best['lng']=s['lat'],s['lng']

def fuzzy_beli(rows):
 beli=base.fetch_beli(); nyc=[r for r in rows if r.get('city')=='New York, NY' and r.get('name')]; n=0
 for b in beli:
  cand=sorted(((sim(b['name'],r['name']),r) for r in nyc),key=lambda x:x[0],reverse=True)
  if cand and (cand[0][0]>=.82 or len(set(toks(b['name']))&set(toks(cand[0][1]['name'])))>=2): cand[0][1].setdefault('sources',{})['beli']=b['sources']['beli']; n+=1
 print('v11 Beli matched',n,'of',len(beli))

def reddit_entries():
 out=[]; seen=set(); ns={'a':'http://www.w3.org/2005/Atom'}
 for url in REDDIT_FEEDS:
  try:
   r=base.session().get(url,timeout=15,headers={'Accept':'application/atom+xml'}); r.raise_for_status(); root=ET.fromstring(r.text)
  except Exception as e: print('reddit feed failed',type(e).__name__); continue
  for en in root.findall('a:entry',ns):
   title=(en.findtext('a:title',default='',namespaces=ns) or '').strip(); content=(en.findtext('a:content',default='',namespaces=ns) or '').strip(); le=en.find('a:link',ns); link=le.attrib.get('href','') if le is not None else ''; key=link or title
   if key in seen: continue
   seen.add(key); out.append({'title':title,'content':re.sub(r'<[^>]+>',' ',content),'url':link})
 print('reddit entries',len(out)); return out

def add_reddit(rows,entries):
 hitn=0
 for r in rows:
  if r.get('city')!='New York, NY' or not r.get('name'):continue
  tt=toks(r['name']); hits=[]
  if not tt:continue
  for e in entries:
   text=norm((e.get('title') or '')+' '+(e.get('content') or ''))
   if norm(r['name']) in text or (len(tt)>=2 and all(x in text for x in tt[:3])): hits.append(e)
  if hits:
   r.setdefault('sources',{})['reddit']={'mentions_30d':len(hits),'mentions_7d':len(hits),'examples':[{'title':h['title'],'url':h['url'],'source':'Reddit'} for h in hits[:4]],'provider':'public Reddit RSS feeds'}; hitn+=1
 print('reddit matched restaurants',hitn)

def manhattan(r):
 try: lat,lng=float(r.get('lat')),float(r.get('lng'))
 except:return False
 return 40.700<=lat<=40.882 and -74.025<=lng<=-73.905

def web_batch(rows,limit=420):
 nyc=[r for r in rows if r.get('city')=='New York, NY' and r.get('name') and r.get('lat') is not None]; m=[r for r in nyc if manhattan(r) and not (r.get('sources') or {}).get('web')]; o=[r for r in nyc if not manhattan(r) and not (r.get('sources') or {}).get('web')]; targets=sorted(m,key=lambda r:norm(r['name']))[:320]+sorted(o,key=lambda r:norm(r['name']))[:max(0,limit-min(320,len(m)))]
 n=0
 with ThreadPoolExecutor(max_workers=12) as ex:
  fs={ex.submit(base.gdelt_signal,r['name'],'New York, NY'):r for r in targets}
  for f in as_completed(fs):
   try:s=f.result()
   except:s=None
   if s is not None:fs[f].setdefault('sources',{})['web']=s;n+=1
 print('web enriched',n,'of',len(targets))

def pct(v,vals,log=False):
 if v is None:return None
 a=[float(x) for x in vals if x is not None]
 if not a:return None
 x=float(v)
 if log:x=math.log1p(max(0,x));a=[math.log1p(max(0,z)) for z in a]
 if len(a)==1:return 50
 less=sum(z<x for z in a);eq=sum(z==x for z in a);return 100*(less+(eq-1)/2)/(len(a)-1)
def weighted(parts,w):
 a=[(k,v) for k,v in parts.items() if v is not None]
 if not a:return None
 d=sum(w[k] for k,_ in a);return sum(float(v)*w[k] for k,v in a)/d

def score(rows):
 groups=defaultdict(list)
 for r in rows:groups[r.get('city') or 'Unknown'].append(r)
 out=[]
 for city,cr in groups.items():
  def s(r,a,b):return ((r.get('sources') or {}).get(a) or {}).get(b)
  U={'tm':[s(r,'tiktok','mentions_7d') for r in cr],'tv':[s(r,'tiktok','views_7d') for r in cr],'red':[s(r,'reddit','mentions_30d') for r in cr],'w30':[s(r,'web','mentions_30d') for r in cr],'w7':[s(r,'web','mentions_7d') for r in cr],'wd':[s(r,'web','domains_30d') for r in cr]}
  for r in cr:
   z=dict(r);src=r.get('sources') or {};tt=src.get('tiktok') or {};rd=src.get('reddit') or {};wb=src.get('web') or {}
   tiktok=weighted({'m':pct(tt.get('mentions_7d'),U['tm'],True),'v':pct(tt.get('views_7d'),U['tv'],True)},{'m':.55,'v':.45}) if tt else None; reddit=pct(rd.get('mentions_30d'),U['red'],True) if rd else None
   if wb:
    web=5.0 if (wb.get('mentions_30d') or 0)==0 and (wb.get('mentions_7d') or 0)==0 else weighted({'m':pct(wb.get('mentions_30d'),U['w30'],True),'f':pct(wb.get('mentions_7d'),U['w7'],True),'d':pct(wb.get('domains_30d'),U['wd'],True)},{'m':.45,'f':.30,'d':.25})
   else:web=None
   access=(src.get('reservation') or {}).get('scarcity_score'); hp={'tiktok':tiktok,'reddit':reddit,'web':web,'access':access}; hype=weighted(hp,{'tiktok':.45,'reddit':.25,'web':.20,'access':.10})
   beli=(src.get('beli') or {}).get('rating');pub=src.get('public_reviews') or {};site=src.get('website') or {};pq=None if pub.get('rating') is None else float(pub['rating'])*20;sq=None if site.get('rating') is None else float(site['rating'])*20;qp={'beli':None if beli is None else float(beli)*10,'public_reviews':pq,'website':sq};quality=weighted(qp,{'beli':.45,'public_reviews':.40,'website':.15})
   cov=(30 if tiktok is not None else 0)+(20 if reddit is not None else 0)+(20 if web is not None else 0)+(15 if beli is not None else 0)+(10 if pq is not None else 0)+(5 if sq is not None else 0)+(5 if access is not None else 0);cov=min(100,cov);gap=None if hype is None or quality is None else hype-quality
   signal='Not enough data' if hype is None and quality is None else 'Quality only' if hype is None else 'Hype only' if quality is None else 'Overhyped' if gap>=15 else 'Sleeper' if gap<=-15 else 'Worth the hype' if hype>=75 and quality>=75 else 'Hot' if hype>=75 else 'Balanced'
   z['scores']={'hype':None if hype is None else round(hype,1),'quality':None if quality is None else round(quality,1),'hype_gap':None if gap is None else round(gap,1),'coverage':int(cov),'signal':signal,'components':{k:(None if v is None else round(float(v),1)) for k,v in hp.items()},'quality_components':{k:(None if v is None else round(float(v),1)) for k,v in qp.items()}};out.append(z)
 return out

def main():
 rows=load_rows()
 if not rows:raise SystemExit('No raw restaurant snapshot found')
 ensure_seed(rows);fuzzy_beli(rows);add_reddit(rows,reddit_entries());web_batch(rows)
 stamp=datetime.now(timezone.utc).isoformat()
 for r in rows:
  if r.get('city')=='New York, NY':r['v11_enriched_at']=stamp
 RAW.write_text(json.dumps(rows,indent=2,ensure_ascii=False));sc=score(rows);SCORES.write_text(json.dumps(sc,indent=2,ensure_ascii=False));ny=[r for r in sc if r.get('city')=='New York, NY'];print('v11 summary',{'nyc':len(ny),'hype':sum((r.get('scores') or {}).get('hype') is not None for r in ny),'quality':sum((r.get('scores') or {}).get('quality') is not None for r in ny),'beli':sum(bool((r.get('sources') or {}).get('beli')) for r in ny),'reddit':sum(bool((r.get('sources') or {}).get('reddit')) for r in ny),'web':sum(bool((r.get('sources') or {}).get('web')) for r in ny)})
if __name__=='__main__':main()
