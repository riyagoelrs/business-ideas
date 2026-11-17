/* v11 aggregate-source detail layer */
(function(){
  const oldDetail=v91Detail;
  const oldDrawScores=drawScores;
  const srcBadge=(label,value,ok)=>`<div class="metric"><span>${esc(label)}</span><b style="font-size:${String(value).length>8?'9':'13'}px">${ok?esc(value):'—'}</b></div>`;
  function fmt1(v){return v==null?'—':Number(v).toFixed(1)}
  function freshness(row){
    const raw=row?.snapshot_at;
    const ts=raw?Date.parse(raw):NaN;
    if(!Number.isFinite(ts))return{label:'Unknown',ageText:'timestamp unavailable',exact:'No snapshot timestamp',stale:false,color:'#8b8b94'};
    const ageMs=Math.max(0,Date.now()-ts),mins=Math.floor(ageMs/60000),hours=Math.floor(ageMs/3600000),days=Math.floor(hours/24);
    const ageText=mins<1?'just now':mins<60?`${mins} min ago`:hours<24?`${hours}h ago`:`${days}d ago`;
    const exact=new Date(ts).toLocaleString();
    if(hours<24)return{label:'Fresh',ageText,exact,stale:false,color:'#67d391'};
    if(hours<48)return{label:'Aging',ageText,exact,stale:false,color:'#ffd166'};
    return{label:'Stale',ageText,exact,stale:true,color:'#ff6b7d'};
  }
  function freshnessPanel(row){
    const f=freshness(row);
    return `<div class="why"><div class="wt">Data freshness</div><div class="line"><b style="color:${f.color}">${esc(f.label)}</b> · Updated ${esc(f.ageText)} · Last checked ${esc(f.exact)}</div>${f.stale?'<div class="line" style="color:#ff9aa8">Scores may not reflect current hype because this snapshot is more than 48 hours old.</div>':''}</div>`;
  }
  function updateFreshnessPill(){
    const cityRows=(scores||[]).filter(sameCity).filter(r=>Number.isFinite(Date.parse(r?.snapshot_at||'')));
    const wrap=document.querySelector('.pills');
    let pill=document.getElementById('freshness-pill');
    if(!cityRows.length){if(pill)pill.remove();return;}
    const latest=cityRows.reduce((a,b)=>Date.parse(a.snapshot_at)>=Date.parse(b.snapshot_at)?a:b);
    const f=freshness(latest);
    if(!pill&&wrap){pill=document.createElement('span');pill.className='pill';pill.id='freshness-pill';wrap.appendChild(pill)}
    if(pill){pill.textContent=`${f.label} · ${f.ageText}`;pill.title=`Latest city snapshot: ${f.exact}`;pill.style.borderColor=f.color;}
  }
  function v11Detail(r,refresh=true){
    const row=scoreIndex.get(norm(r.name));
    if(!row){oldDetail(r,refresh);return;}
    const a=v91Rate(r),s=row.sources||{},tt=s.tiktok||{},rd=s.reddit||{},wb=s.web||{},bl=s.beli||{},pr=s.public_reviews||{},site=s.website||{},res=s.reservation||{};
    const examples=[];
    (rd.examples||[]).slice(0,2).forEach(x=>examples.push({src:'Reddit',text:x.title||'Recent Reddit mention',url:x.url}));
    (wb.examples||[]).slice(0,3).forEach(x=>examples.push({src:x.domain||'Web/news',text:x.title||'Recent coverage',url:x.url}));
    const contribution=[];
    if(tt.mentions_7d!=null)contribution.push(`TikTok: ${tt.mentions_7d} mentions · ${compact(tt.views_7d)} views · ${fmt(tt.creators_7d)} creators`);
    if(rd.mentions_30d!=null)contribution.push(`Reddit: ${rd.mentions_30d} recent FoodNYC / AskNYC mentions`);
    if(wb.mentions_30d!=null)contribution.push(`Web/news: ${fmt(wb.mentions_30d)} mentions in 30d · ${fmt(wb.mentions_7d)} in 7d · ${fmt(wb.domains_30d)} publications`);
    if(bl.rating!=null)contribution.push(`Beli: ${fmt1(bl.rating)}/10${bl.rank?' · #'+bl.rank+(bl.total?' of '+bl.total:''):''}`);
    if(pr.rating!=null)contribution.push(`Public rating seed: ${fmt1(pr.rating)}/5 · ${compact(pr.review_count)} reviews`);
    if(site.rating!=null)contribution.push(`Restaurant-site aggregate rating: ${fmt1(site.rating)}/5 · ${compact(site.review_count)} ratings`);
    if(res.scarcity_score!=null)contribution.push(`Access / reservation friction: ${fmt(res.scarcity_score)}/100`);
    const missing=[];if(!s.tiktok)missing.push('TikTok');if(!s.reddit)missing.push('Reddit');if(!s.web)missing.push('web/news');if(!s.beli)missing.push('Beli');if(!s.public_reviews&&!s.website)missing.push('public rating');
    $('detail').className='detail';
    $('detail').innerHTML=`<div class="dh"><div><div class="dn">${esc(r.name)}</div><div class="dm">${esc(r.cuisine||'Restaurant')} · ${esc(r.address||r.neighborhood||cityLabel)}</div></div><span class="badge">${esc(a.mode)}</span></div>
      <div class="metrics"><div class="metric"><span>Hype</span><b>${v91ScoreText(a)}</b></div><div class="metric"><span>Quality</span><b>${fmt(a.quality)}</b></div><div class="metric"><span>Gap</span><b>${a.gap==null?'—':(a.gap>0?'+':'')+fmt(a.gap)}</b></div><div class="metric"><span>Coverage</span><b>${fmt(a.coverage)}%</b></div></div>
      ${freshnessPanel(row)}
      <div class="why"><div class="wt">Aggregate inputs</div><div class="metrics" style="grid-template-columns:repeat(3,1fr)">${srcBadge('Beli',bl.rating!=null?fmt1(bl.rating)+'/10':'',bl.rating!=null)}${srcBadge('Reddit',rd.mentions_30d!=null?rd.mentions_30d+' mentions':'',rd.mentions_30d!=null)}${srcBadge('Web',wb.mentions_30d!=null?wb.mentions_30d+' mentions':'',wb.mentions_30d!=null)}${srcBadge('TikTok',tt.mentions_7d!=null?tt.mentions_7d+' mentions':'',tt.mentions_7d!=null)}${srcBadge('Public rating',pr.rating!=null?fmt1(pr.rating)+'/5':(site.rating!=null?fmt1(site.rating)+'/5':''),pr.rating!=null||site.rating!=null)}${srcBadge('Access',res.scarcity_score!=null?fmt(res.scarcity_score)+'/100':'',res.scarcity_score!=null)}</div></div>
      <div class="why"><div class="wt">Why this score</div>${Object.entries(a.parts||{}).filter(([,v])=>v!=null).map(([k,v])=>`<div class="barrow"><span>${esc(k)}</span><span class="bar"><i style="width:${v91Clamp(v)}%"></i></span><b>${fmt(v)}</b></div>`).join('')}${contribution.map(x=>`<div class="line">${esc(x)}</div>`).join('')||'<div class="line">No stored source signal yet.</div>'}${missing.length?`<div class="line" style="color:#777">Still missing: ${esc(missing.join(', '))}</div>`:''}</div>
      <div class="why"><div class="wt">Highlighted public mentions</div>${examples.length?examples.map(x=>`<div class="mention"><small>${esc(x.src)}</small><div>${esc(x.text)}</div></div>`).join(''):(refresh?'<div class="line">Checking recent public coverage…</div>':'<div class="line">No recent saved mentions returned.</div>')}</div>
      <div class="actions"><a target="_blank" href="${mapsUrl(r.name)}">Google Maps reviews ↗</a><a target="_blank" href="${r.website||webUrl(r.name)}">${r.website?'Restaurant website':'Web reviews'} ↗</a></div>`;
    if(refresh&&!s.web)v91Web(r).then(()=>{if($('detail')?.querySelector('.dn')?.textContent===r.name)v11Detail(r,false)});
  }
  detail=v11Detail;v91Detail=v11Detail;
  drawScores=function(){oldDrawScores();updateFreshnessPill()};
  updateFreshnessPill();
  const lg=document.querySelector('.legend');if(lg){lg.innerHTML=`<b>HOW TO READ IT</b><p><b>Color = restaurant signal.</b> The score uses every source currently available for that restaurant; missing sources are shown in the detail card rather than treated as zero.</p><div class="ld"><i class="dot" style="background:#ff4d67"></i>90–100 Peak</div><div class="ld"><i class="dot" style="background:#ff9f43"></i>75–89 Hot</div><div class="ld"><i class="dot" style="background:#ffd166"></i>60–74 Rising</div><div class="ld"><i class="dot" style="background:#62a8ff"></i>40–59 Moderate</div><div class="ld"><i class="dot" style="background:#7b61ff"></i>0–39 Quiet / insufficient signal</div><p>Inputs can include <b>TikTok, Reddit, public web/news, Beli, public ratings, restaurant-site ratings and access friction.</b> Coverage tells you how much of that stack is present.</p>`}
  const k=document.querySelector('.k');if(k)k.textContent='Restaurant signal terminal · v11';
  const sub=document.querySelector('.sub');if(sub)sub.textContent='Aggregate restaurant intelligence: attention signals are kept separate from quality, then combined into a transparent Hype / Quality / Coverage view.';
})();
