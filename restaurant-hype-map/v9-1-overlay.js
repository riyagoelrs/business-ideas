/* Restaurant Hype Map v10: no fake neutral scores; every restaurant remains clickable */
const V91_LIVE=new Map();
const v91Clamp=v=>Math.max(0,Math.min(100,Number(v)||0));
const v91Color=v=>v==null?'#7b61ff':v>=90?'#ff4d67':v>=75?'#ff9f43':v>=60?'#ffd166':v>=40?'#62a8ff':'#7b61ff';
const v91Band=v=>v==null?'Not scored yet':v>=90?'Peak':v>=75?'Hot':v>=60?'Rising':v>=40?'Moderate':'Quiet';
function v91Log(n,k=15,cap=50){return Math.min(cap,Math.log1p(Math.max(0,Number(n)||0))*k)}
function v91LiveWebScore(live){
  const m30=Number(live.mentions30)||0,m7=Number(live.mentions7)||0,domains=Number(live.domains)||0;
  if(m30===0&&m7===0&&domains===0)return 5;
  const vel=m30?Math.min(2,(m7/Math.max(1,m30))*4):0;
  return v91Clamp(8+v91Log(m30,14,48)+Math.min(24,domains*2.6)+vel*8);
}
function v91Rate(r){
  const row=scoreIndex.get(norm(r.name)),src=row?.sources||{},sc=row?.scores||{},live=V91_LIVE.get(norm(r.name))||{};
  const quality=sc.quality!=null?sc.quality:(src.beli?.rating!=null?Number(src.beli.rating)*10:(src.website?.rating!=null?Number(src.website.rating)*20:null));
  if(sc.hype!=null){
    const coverage=v91Clamp(sc.coverage),full=Boolean(src.tiktok)&&coverage>=55;
    return{score:v91Clamp(sc.hype),quality,gap:sc.hype_gap,coverage,mode:full?'Full Hype':'Partial Hype',signal:sc.signal||v91Band(sc.hype),parts:sc.components||{}};
  }
  if(live.loaded){
    const score=v91LiveWebScore(live);
    return{score,quality,gap:quality==null?null:score-quality,coverage:25,mode:'Live Web Buzz',signal:v91Band(score),parts:{'Web/news':score}};
  }
  if(quality!=null){
    return{score:v91Clamp(quality),quality,gap:0,coverage:v91Clamp(sc.coverage||15),mode:'Quality proxy',signal:'Quality proxy',parts:{Quality:v91Clamp(quality)}};
  }
  return{score:null,quality:null,gap:null,coverage:0,mode:'Not scored',signal:'Collecting signal',parts:{}};
}
function v91Explain(r,rate){
  if(rate.mode==='Full Hype')return'Stored multi-source attention score with TikTok plus other free signals.';
  if(rate.mode==='Partial Hype')return'Real hype signal, but coverage is still partial.';
  if(rate.mode==='Live Web Buzz')return'Live free web/news buzz from the last 30 days. This is not yet the full multi-source Hype Score.';
  if(rate.mode==='Quality proxy')return'No attention signal yet; color temporarily reflects the available quality rating.';
  return'No rating is being invented. Click this restaurant and the map will check recent public web/news activity for a provisional buzz signal.';
}
function v91ScoreText(a){return a.score==null?'—':fmt(a.score)}
function v91Popup(r){const a=v91Rate(r);return`<div class="popname">${esc(r.name)}</div><div class="popmeta">${esc(r.cuisine||'Restaurant')} · ${esc(cityLabel)}</div><div class="metrics"><div class="metric"><span>Signal</span><b>${v91ScoreText(a)}</b></div><div class="metric"><span>Quality</span><b>${fmt(a.quality)}</b></div><div class="metric"><span>Coverage</span><b>${fmt(a.coverage)}%</b></div><div class="metric"><span>Type</span><b style="font-size:8px">${esc(a.mode)}</b></div></div><div class="popnote"><b>${esc(a.signal)}</b><br>${esc(v91Explain(r,a))}</div><a class="maps" target="_blank" href="${mapsUrl(r.name)}">Reviews & directions ↗</a>`}
function v91Paint(r){const a=v91Rate(r),m=markers.get(r.id);if(!m)return;const full=a.mode==='Full Hype';m.setStyle({fillColor:v91Color(a.score),fillOpacity:a.score==null?.62:(full?.98:.86),color:full?'#111':'#fff',weight:full?2.6:1.2});m.setRadius(full?8:6);m.setTooltipContent(a.score==null?`${esc(r.name)} · Not scored · click to check buzz`:`${esc(r.name)} · ${a.mode} ${fmt(a.score)} · ${fmt(a.coverage)}% coverage`);m.setPopupContent(v91Popup(r))}
async function v91Web(r){
  const k=norm(r.name);if(V91_LIVE.get(k)?.loaded)return;
  try{
    const d=await j('https://api.gdeltproject.org/api/v2/doc/doc?mode=artlist&maxrecords=50&timespan=30d&sort=datedesc&format=json&query='+encodeURIComponent(`"${r.name}" restaurant "${cityName(cityLabel)}"`),{},7000),arts=d?.articles||[],now=Date.now(),week=604800000,domains=new Set(arts.map(x=>x.domain).filter(Boolean)),m7=arts.filter(x=>{const t=Date.parse(x.seendate||x.datetime||x.date||'');return Number.isFinite(t)&&now-t<=week}).length;
    V91_LIVE.set(k,{loaded:true,mentions30:arts.length,mentions7:m7,domains:domains.size,examples:arts.slice(0,4)});
  }catch(e){V91_LIVE.set(k,{loaded:true,mentions30:0,mentions7:0,domains:0,examples:[]})}
  v91Paint(r);
}
function v91Detail(r,refresh=true){
  const row=scoreIndex.get(norm(r.name)),a=v91Rate(r),live=V91_LIVE.get(norm(r.name))||{},stored=row?mentions(row):[],fresh=(live.examples||[]).map(x=>({src:x.domain||'Web/news',text:x.title||'Recent coverage'})),mm=[...stored,...fresh].slice(0,4),lines=[v91Explain(r,a),...(row?why(row):[])];
  $('detail').className='detail';
  $('detail').innerHTML=`<div class="dh"><div><div class="dn">${esc(r.name)}</div><div class="dm">${esc(r.cuisine||'Restaurant')} · ${esc(r.address||cityLabel)}</div></div><span class="badge">${esc(a.mode)}</span></div><div class="metrics"><div class="metric"><span>Signal</span><b>${v91ScoreText(a)}</b></div><div class="metric"><span>Quality</span><b>${fmt(a.quality)}</b></div><div class="metric"><span>Gap</span><b>${a.gap==null?'—':(a.gap>0?'+':'')+fmt(a.gap)}</b></div><div class="metric"><span>Coverage</span><b>${fmt(a.coverage)}%</b></div></div><div class="why"><div class="wt">Why this color</div>${Object.entries(a.parts||{}).map(([k,v])=>`<div class="barrow"><span>${esc(k)}</span><span class="bar"><i style="width:${v91Clamp(v)}%"></i></span><b>${fmt(v)}</b></div>`).join('')}${lines.map(x=>`<div class="line">${esc(x)}</div>`).join('')}</div><div class="why"><div class="wt">Highlighted reviews & public mentions</div>${mm.length?mm.map(x=>`<div class="mention"><small>${esc(x.src)}</small><div>${esc(x.text)}</div></div>`).join(''):(refresh?'<div class="line">Checking recent public coverage…</div>':'<div class="line">No recent free web coverage returned.</div>')}</div><div class="actions"><a target="_blank" href="${mapsUrl(r.name)}">Google Maps reviews ↗</a><a target="_blank" href="${r.website||webUrl(r.name)}">${r.website?'Restaurant website':'Web reviews'} ↗</a></div>`;
  if(refresh&&(a.mode==='Not scored'||a.mode==='Quality proxy'))v91Web(r).then(()=>{if($('detail')?.querySelector('.dn')?.textContent===r.name)v91Detail(r,false)});
}
detail=v91Detail;popup=v91Popup;
draw=function(){
  base.clearLayers();markers.clear();
  for(const r of restaurants){
    const a=v91Rate(r),full=a.mode==='Full Hype',m=L.circleMarker([r.lat,r.lng],{radius:full?8:6,color:full?'#111':'#fff',weight:full?2.6:1.2,fillColor:v91Color(a.score),fillOpacity:a.score==null?.62:(full?.98:.86),interactive:true,bubblingMouseEvents:false}).bindTooltip(a.score==null?`${esc(r.name)} · Not scored · click to check buzz`:`${esc(r.name)} · ${a.mode} ${fmt(a.score)} · ${fmt(a.coverage)}% coverage`).bindPopup(v91Popup(r)).on('click',()=>v91Detail(r)).addTo(base);
    markers.set(r.id,m);
  }
  $('rc').textContent=restaurants.length.toLocaleString();$('rp').textContent=restaurants.length.toLocaleString()+' restaurants';$('mapstatus').textContent=restaurants.length.toLocaleString()+' clickable restaurants loaded';
};
drawScores=function(){
  hype.clearLayers();hmarkers.clear();scoreIndex=new Map();const rows=scores.filter(sameCity);rows.forEach(r=>scoreIndex.set(norm(r.name),r));let signal=0,cov=0;
  for(const r of rows){if(r.scores?.hype!=null)signal++;if(Number(r.scores?.coverage)>=40)cov++}
  $('hc').textContent=signal;$('cc').textContent=cov;$('sp').textContent=signal+' signal scored';
  const span=$('hc')?.nextElementSibling;if(span)span.textContent='signal scored';
  if(restaurants.length)draw();leader();
};
focus=function(r){v91Detail(r);map.setView([r.lat,r.lng],16);const m=markers.get(r.id)||hmarkers.get(norm(r.name));setTimeout(()=>m?.openPopup(),150)};
const lg=document.querySelector('.legend');if(lg)lg.innerHTML=`<b>HOW TO READ IT</b><p>Every dot is a restaurant and every dot is clickable. A number is shown only when there is an actual signal or quality input.</p><div class="ld"><i class="dot" style="background:#ff4d67"></i>90–100 Peak</div><div class="ld"><i class="dot" style="background:#ff9f43"></i>75–89 Hot</div><div class="ld"><i class="dot" style="background:#ffd166"></i>60–74 Rising</div><div class="ld"><i class="dot" style="background:#62a8ff"></i>40–59 Moderate</div><div class="ld"><i class="dot" style="background:#7b61ff"></i>Not scored yet / quiet</div><p><b>Heavy outline</b> = Full Hype. Thin outline = partial, web-buzz, quality proxy, or unscored. Click any purple dot to check live public web buzz.</p>`;
const k=document.querySelector('.k');if(k)k.textContent='Restaurant signal terminal · v10';
const sub=document.querySelector('.sub');if(sub)sub.textContent='NYC restaurants are loaded independently of scoring. Colors now come from real stored signals, quality inputs, or live web-buzz checks — never a fake default 50.';
if(restaurants.length)drawScores();
