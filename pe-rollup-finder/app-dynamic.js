const INDUSTRIES = {
  "HVAC": {filters:[["craft","hvac"],["shop","heating"]], keywords:["hvac","heating","air conditioning","cooling"], thesis:"Local route density, recurring maintenance, fragmented ownership, and cross-sell can support a buy-and-build thesis.", margin:16, entry:6, exit:9, revenue:2.0},
  "Plumbing": {filters:[["craft","plumber"]], keywords:["plumb","drain","sewer"], thesis:"Highly local demand, emergency call-outs, fragmented operators, and dispatch/marketing efficiencies can create scale benefits.", margin:15, entry:5.5, exit:8, revenue:1.8},
  "Electrical Contractors": {filters:[["craft","electrician"]], keywords:["electric","electrical"], thesis:"Fragmented skilled-trade operators can benefit from centralized recruiting, procurement, dispatch, and commercial customer penetration.", margin:14, entry:5.5, exit:8, revenue:2.0},
  "Landscaping": {filters:[["craft","gardener"]], keywords:["landscap","lawn","tree service","grounds"], thesis:"Recurring routes and dense local service areas can make tuck-ins valuable, especially where back-office and fleet utilization improve with scale.", margin:14, entry:5, exit:7.5, revenue:1.5},
  "Pest Control": {filters:[["shop","pest_control"]], keywords:["pest","exterminat","termite"], thesis:"Recurring subscriptions, route density, and fragmented local providers are classic ingredients for a services roll-up.", margin:20, entry:7, exit:10, revenue:1.5},
  "Auto Repair": {filters:[["shop","car_repair"]], keywords:["auto repair","automotive","car repair","garage","collision"], thesis:"Independent shops remain locally fragmented, while procurement, technician recruiting, software, and marketing can benefit from scale.", margin:14, entry:5.5, exit:8, revenue:1.8},
  "Car Wash": {filters:[["amenity","car_wash"]], keywords:["car wash","autowash","auto wash"], thesis:"Membership revenue, site-level operating leverage, and local clustering can make add-on economics attractive where saturation remains manageable.", margin:28, entry:8, exit:10, revenue:2.5},
  "Veterinary Clinics": {filters:[["amenity","veterinary"]], keywords:["veterinary","animal hospital"], thesis:"Recurring pet-care demand and practice fragmentation can support consolidation, though clinician retention and local pricing discipline are critical.", margin:18, entry:8, exit:11, revenue:2.2},
  "Dentists": {filters:[["amenity","dentist"]], keywords:["dentist","dental","orthodont","oral surgery"], thesis:"Practice fragmentation and centralized administrative functions can support consolidation, with provider retention and same-store growth as key diligence items.", margin:20, entry:8.5, exit:12, revenue:1.8},
  "Physical Therapy": {filters:[["healthcare","physiotherapist"]], keywords:["physical therapy","physiotherapy","rehab"], thesis:"Clinic fragmentation, referrals, scheduling utilization, and centralized payer/admin capabilities can create scale, subject to reimbursement risk.", margin:18, entry:7, exit:10, revenue:1.2},
  "Laundromats": {filters:[["shop","laundry"]], keywords:["laundromat","laundry","wash & fold","wash and fold"], thesis:"Local density, equipment utilization, wash-and-fold expansion, and fragmented ownership can create a straightforward small-business consolidation thesis.", margin:25, entry:4.5, exit:7, revenue:0.7},
  "Self Storage": {filters:[["shop","storage_rental"]], keywords:["self storage","mini storage"], thesis:"Highly local competition, recurring monthly revenue, and operating leverage make density and supply discipline central to consolidation economics.", margin:40, entry:10, exit:14, revenue:1.2}
};

const cityEl = document.getElementById('city');
const industryEl = document.getElementById('industry');
const radiusEl = document.getElementById('radius');
const runButton = document.getElementById('run-search');
const statusEl = document.getElementById('status');

let currentCenter = null;
let currentRadius = Number(radiusEl.value) || 20;
let currentIndustry = null;
let currentData = [];
let cityUniverse = [];
let marketOptions = [];
let scanSeq = 0;
let debounceTimer = null;

const map = L.map('map', {zoomControl:true}).setView([39.5,-98.35], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
const markerLayer = L.layerGroup().addTo(map);

function clamp(n, lo=0, hi=100){ return Math.max(lo, Math.min(hi, n)); }
function rad(x){ return x * Math.PI / 180; }
function haversine(lat1,lon1,lat2,lon2){
  const R=6371.0088, p1=rad(lat1), p2=rad(lat2), dp=rad(lat2-lat1), dl=rad(lon2-lon1);
  const a=Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function escapeHtml(s=''){ return String(s).replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[c])); }
function tier(score){ if(score>=75) return 'A+'; if(score>=60) return 'A'; if(score>=45) return 'B'; return 'Watch'; }
function markerColor(t){ return (t==='A+'||t==='A') ? '#2e5d46' : t==='B' ? '#b6813c' : '#9b5a52'; }
function num(id, fallback){ const v=parseFloat(document.getElementById(id).value); return Number.isFinite(v)?v:fallback; }
function moneyM(v){ return `$${v.toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})}m`; }

function setIndustryPlaceholder(text){
  industryEl.innerHTML='';
  const opt=document.createElement('option'); opt.value=''; opt.textContent=text; industryEl.appendChild(opt);
  industryEl.disabled=true;
}

function clearMarketView(message='Enter a city to scan the market.'){
  currentData=[]; currentIndustry=null; cityUniverse=[]; marketOptions=[];
  setIndustryPlaceholder('Enter a market first');
  markerLayer.clearLayers();
  map.setView([39.5,-98.35], 4);
  document.getElementById('kpi-score').textContent='—';
  document.getElementById('kpi-locations').textContent='—';
  document.getElementById('kpi-independent').textContent='—';
  document.getElementById('kpi-independent-count').textContent='waiting for scan';
  document.getElementById('kpi-top').textContent='—';
  ['fragmentation','density','scale'].forEach(k=>{ document.getElementById(`${k}-value`).textContent='—'; document.getElementById(`${k}-bar`).style.width='0%'; });
  document.getElementById('map-title').textContent='Choose a market';
  document.getElementById('thesis').innerHTML='<strong>Market-driven discovery</strong> Enter a city and the available roll-up categories will be rebuilt from that city\'s mapped operator universe.';
  document.getElementById('target-body').innerHTML='<tr><td colspan="7" class="empty-row">No market loaded yet.</td></tr>';
  statusEl.className='status'; statusEl.textContent=message;
}

function normalizedText(row){
  const t=row.tags||{};
  return [row.name,t.brand,t.operator,t.description,t.craft,t.shop,t.amenity,t.healthcare].filter(Boolean).join(' ').toLowerCase();
}

function matchesIndustry(row, industry){
  const cfg=INDUSTRIES[industry], tags=row.tags||{};
  if(cfg.filters.some(([k,v])=>String(tags[k]||'').toLowerCase()===String(v).toLowerCase())) return true;
  const text=normalizedText(row);
  return cfg.keywords.some(k=>text.includes(k.toLowerCase()));
}

function scoreBusinesses(rows, center){
  const names=rows.map(r=>(r.name||'').toLowerCase().trim());
  const counts=names.reduce((a,n)=>(a[n]=(a[n]||0)+1,a),{});
  return rows.map((r,i)=>{
    const nearby=rows.reduce((n,x,j)=>n+(i!==j&&haversine(r.lat,r.lon,x.lat,x.lon)<=5?1:0),0);
    const t=r.tags||{};
    const repeated=counts[names[i]]>=3;
    const branded=!!t.brand||!!t['brand:wikidata']||!!t['brand:wikipedia']||repeated;
    const independent=!branded;
    const contact=(r.phone?8:0)+(r.website?7:0);
    const addressPts=r.address?5:0;
    const score=Math.round((Math.min(nearby,12)/12*30+(independent?40:8)+contact+addressPts)*10)/10;
    return {...r,nearby_5km:nearby,likely_independent:independent,target_score:score,target_tier:tier(score),distance_km:haversine(center.lat,center.lon,r.lat,r.lon)};
  }).sort((a,b)=>b.target_score-a.target_score||b.nearby_5km-a.nearby_5km);
}

function marketScore(rows,radius){
  if(!rows.length) return {score:0,fragmentation:0,density:0,scale:0};
  const frag=rows.filter(r=>r.likely_independent).length/rows.length*100;
  const area=Math.PI*radius*radius;
  const densityScore=clamp((rows.length/Math.max(area,1)*100)/5*100);
  const scaleScore=clamp(rows.length/60*100);
  return {score:.5*frag+.3*densityScore+.2*scaleScore,fragmentation:frag,density:densityScore,scale:scaleScore};
}

function rankMarkets(){
  marketOptions=Object.keys(INDUSTRIES).map(industry=>{
    const rows=scoreBusinesses(cityUniverse.filter(r=>matchesIndustry(r,industry)),currentCenter);
    const q=marketScore(rows,currentRadius);
    return {industry,rows,count:rows.length,independent:rows.filter(r=>r.likely_independent).length,score:q.score};
  }).sort((a,b)=>b.score-a.score||b.count-a.count);
}

function populateIndustryOptions(){
  const strong=marketOptions.filter(o=>o.count>=3);
  const relevant=strong.length?strong:marketOptions.filter(o=>o.count>0);
  industryEl.innerHTML='';
  if(!relevant.length){ setIndustryPlaceholder('No mapped roll-up categories found'); return false; }
  industryEl.disabled=false;
  relevant.forEach(o=>{
    const opt=document.createElement('option');
    opt.value=o.industry;
    opt.textContent=`${o.industry} · ${o.count} operators · ${Math.round(o.score)}/100`;
    industryEl.appendChild(opt);
  });
  return true;
}

function applyIndustry(industry){
  const opt=marketOptions.find(o=>o.industry===industry);
  if(!opt) return;
  currentIndustry=industry; currentData=opt.rows; industryEl.value=industry;
  syncModelDefaults(); render();
  statusEl.className='status';
  statusEl.textContent=`${currentCenter.shortLabel}: ${opt.count} mapped ${industry.toLowerCase()} operators. Categories above are ranked from this market's live operator data.`;
}

function render(){
  const q=marketScore(currentData,currentRadius), indep=currentData.filter(r=>r.likely_independent), top=currentData.filter(r=>['A','A+'].includes(r.target_tier));
  document.getElementById('kpi-score').textContent=Math.round(q.score);
  document.getElementById('kpi-locations').textContent=currentData.length;
  document.getElementById('kpi-independent').textContent=currentData.length?`${Math.round(indep.length/currentData.length*100)}%`:'0%';
  document.getElementById('kpi-independent-count').textContent=`${indep.length} targets`;
  document.getElementById('kpi-top').textContent=top.length;
  document.getElementById('fragmentation-value').textContent=Math.round(q.fragmentation);
  document.getElementById('density-value').textContent=Math.round(q.density);
  document.getElementById('scale-value').textContent=Math.round(q.scale);
  document.getElementById('fragmentation-bar').style.width=`${q.fragmentation}%`;
  document.getElementById('density-bar').style.width=`${q.density}%`;
  document.getElementById('scale-bar').style.width=`${q.scale}%`;
  document.getElementById('map-title').textContent=`${currentCenter.shortLabel} · ${currentIndustry}`;
  document.getElementById('thesis').innerHTML=`<strong>Why ${escapeHtml(currentIndustry)}?</strong> ${escapeHtml(INDUSTRIES[currentIndustry].thesis)}`;
  renderMap(); renderTable();
}

function renderMap(){
  markerLayer.clearLayers();
  currentData.forEach(r=>{
    const marker=L.circleMarker([r.lat,r.lon],{radius:7,color:'#fff',weight:1.5,fillColor:markerColor(r.target_tier),fillOpacity:.86});
    marker.bindPopup(`<div class="popup-title">${escapeHtml(r.name)}</div><div class="popup-meta"><b>${r.target_tier}</b> · score ${Math.round(r.target_score)}<br>${r.likely_independent?'Likely independent':'Possible chain / branded'}<br>${escapeHtml(r.address||'Address unavailable')}<br>${r.website?`<a href="${escapeHtml(r.website)}" target="_blank" rel="noreferrer">Website ↗</a>`:''}</div>`);
    marker.addTo(markerLayer);
  });
  if(currentData.length){ const bounds=L.latLngBounds(currentData.map(r=>[r.lat,r.lon])); if(bounds.isValid()) map.fitBounds(bounds.pad(.12),{maxZoom:12}); }
  else map.setView([currentCenter.lat,currentCenter.lon],10);
}

function filteredRows(){
  const independent=document.getElementById('independent-only').checked, tf=document.getElementById('tier-filter').value;
  return currentData.filter(r=>{ if(independent&&!r.likely_independent)return false; if(tf==='top'&&!['A','A+'].includes(r.target_tier))return false; if(!['all','top'].includes(tf)&&r.target_tier!==tf)return false; return true; });
}
function renderTable(){
  const rows=filteredRows(), body=document.getElementById('target-body');
  if(!rows.length){ body.innerHTML='<tr><td colspan="7" class="empty-row">No targets match these filters.</td></tr>'; return; }
  body.innerHTML=rows.slice(0,75).map((r,i)=>`<tr><td>${i+1}</td><td><span class="operator">${escapeHtml(r.name)}</span><span class="subline">${escapeHtml(r.address||'Address unavailable')}</span></td><td><span class="tier ${r.target_tier==='B'?'b':r.target_tier==='Watch'?'watch':''}">${r.target_tier}</span></td><td class="score-num">${Math.round(r.target_score)}</td><td>${r.nearby_5km}</td><td>${r.distance_km.toFixed(1)} km</td><td>${r.website?`<a class="contact" href="${escapeHtml(r.website)}" target="_blank" rel="noreferrer">Website ↗</a>`:(r.phone?escapeHtml(r.phone):'—')}</td></tr>`).join('');
}

function encodeUniverseQuery(lat,lon,radiusKm){
  const r=Math.round(radiusKm*1000), clauses=[], seen=new Set();
  Object.values(INDUSTRIES).forEach(cfg=>cfg.filters.forEach(([k,v])=>{
    const key=`${k}=${v}`; if(seen.has(key)) return; seen.add(key);
    ['node','way','relation'].forEach(t=>clauses.push(`${t}["${k}"="${v}"](around:${r},${lat},${lon});`));
  }));
  const keywords=[...new Set(Object.values(INDUSTRIES).flatMap(c=>c.keywords))]
    .map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  ['node','way','relation'].forEach(t=>clauses.push(`${t}["name"~"${keywords}",i](around:${r},${lat},${lon});`));
  return `[out:json][timeout:45];(${clauses.join('')});out center tags;`;
}

async function geocode(city){
  const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(city)}`;
  const res=await fetch(url,{headers:{Accept:'application/json'}});
  if(!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data=await res.json(); if(!data.length) throw new Error(`Could not find “${city}”. Try “City, State”.`);
  const d=data[0], a=d.address||{};
  const short=[a.city||a.town||a.village||a.county||city,a.state].filter(Boolean).join(', ');
  return {lat:+d.lat,lon:+d.lon,label:d.display_name||city,shortLabel:short||city};
}

async function fetchUniverse(center,radius){
  const q=encodeUniverseQuery(center.lat,center.lon,radius);
  const endpoints=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter'];
  let lastErr;
  for(const endpoint of endpoints){
    try{
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:`data=${encodeURIComponent(q)}`});
      if(!res.ok) throw new Error(`Operator data source returned ${res.status}`);
      const data=await res.json(), seen=new Set(), rows=[];
      for(const e of data.elements||[]){
        const t=e.tags||{}, c=e.center||{}, lat=e.lat??c.lat, lon=e.lon??c.lon; if(lat==null||lon==null) continue;
        const name=(t.name||t.brand||t.operator||'Unnamed operator').trim();
        const key=`${name.toLowerCase().replace(/[^a-z0-9]+/g,'')}-${(+lat).toFixed(4)}-${(+lon).toFixed(4)}`; if(seen.has(key)) continue; seen.add(key);
        const address=[t['addr:housenumber'],t['addr:street'],t['addr:city'],t['addr:state'],t['addr:postcode']].filter(Boolean).join(' ');
        rows.push({id:`${e.type}-${e.id}`,name,lat:+lat,lon:+lon,address,phone:t.phone||t['contact:phone']||'',website:t.website||t['contact:website']||'',tags:t});
      }
      return rows;
    }catch(err){ lastErr=err; }
  }
  throw lastErr||new Error('Could not load operator data.');
}

async function scanMarket(){
  const city=cityEl.value.trim(); if(city.length<3){ clearMarketView('Enter a city or metro to begin.'); return; }
  const seq=++scanSeq; currentRadius=Number(radiusEl.value)||20;
  runButton.disabled=true; runButton.textContent='Scanning…';
  setIndustryPlaceholder('Scanning market…');
  currentData=[]; markerLayer.clearLayers(); renderTable();
  statusEl.className='status'; statusEl.textContent=`Finding ${city}…`;
  try{
    const center=await geocode(city); if(seq!==scanSeq)return;
    currentCenter=center; map.setView([center.lat,center.lon],10); document.getElementById('map-title').textContent=`${center.shortLabel} · scanning`;
    statusEl.textContent=`Pulling the local operator universe for ${center.shortLabel}…`;
    cityUniverse=await fetchUniverse(center,currentRadius); if(seq!==scanSeq)return;
    rankMarkets();
    if(!populateIndustryOptions()){
      currentData=[]; renderTable(); statusEl.className='status error'; statusEl.textContent=`No mapped operators from the supported roll-up categories were found around ${center.shortLabel}. Try a larger radius.`; return;
    }
    applyIndustry(industryEl.value);
  }catch(err){
    if(seq!==scanSeq)return;
    currentData=[]; cityUniverse=[]; marketOptions=[]; setIndustryPlaceholder('Scan failed'); markerLayer.clearLayers();
    document.getElementById('map-title').textContent=currentCenter?`${currentCenter.shortLabel} · no data`:'Choose a market';
    renderTable(); statusEl.className='status error'; statusEl.textContent=`Live scan failed: ${err.message}. No demo data is being substituted.`;
  }finally{
    if(seq===scanSeq){ runButton.disabled=false; runButton.textContent='Scan market'; }
  }
}

function syncModelDefaults(){
  if(!currentIndustry)return; const cfg=INDUSTRIES[currentIndustry];
  document.getElementById('m-margin').value=cfg.margin; document.getElementById('m-entry').value=cfg.entry; document.getElementById('m-exit').value=cfg.exit; document.getElementById('m-revenue').value=cfg.revenue;
  const top=currentData.filter(r=>['A','A+'].includes(r.target_tier)).length;
  document.getElementById('m-targets').value=Math.max(1,Math.min(12,top||Math.min(currentData.length,8)||1)); updateModel();
}
function updateModel(){
  const n=clamp(num('m-targets',8),1,100), rev=clamp(num('m-revenue',2),.1,100), margin=clamp(num('m-margin',16),1,60)/100;
  const entry=clamp(num('m-entry',6),1,30), exit=clamp(num('m-exit',9),1,30), synergy=clamp(num('m-synergy',3),0,20)/100, debtPct=clamp(num('m-debt',50),0,90)/100;
  const revenue=n*rev, standalone=revenue*margin, proforma=standalone+revenue*synergy, purchase=standalone*entry;
  const debt=purchase*debtPct, equity=purchase-debt, exitEv=proforma*exit, exitEq=Math.max(exitEv-debt,0), moc=equity>0?exitEq/equity:0, irr=moc>0?Math.pow(moc,1/5)-1:-1;
  document.getElementById('r-purchase').textContent=moneyM(purchase); document.getElementById('r-ebitda').textContent=moneyM(proforma); document.getElementById('r-moc').textContent=`${moc.toFixed(2)}x`; document.getElementById('r-irr').textContent=`${(irr*100).toFixed(1)}%`;
}
function downloadCsv(){
  const rows=filteredRows(), headers=['name','target_tier','target_score','likely_independent','nearby_5km','distance_km','address','phone','website'], esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const csv=[headers.join(','),...rows.map(r=>headers.map(h=>esc(h==='distance_km'?r[h].toFixed(2):r[h])).join(','))].join('\n');
  const blob=new Blob([csv],{type:'text/csv'}),a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${(currentIndustry||'market').toLowerCase().replace(/\s+/g,'-')}-targets.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

document.getElementById('search-form').addEventListener('submit',e=>{e.preventDefault();scanMarket();});
cityEl.addEventListener('input',()=>{ clearTimeout(debounceTimer); const q=cityEl.value.trim(); if(q.length<3){clearMarketView('Enter a city or metro to begin.');return;} statusEl.className='status';statusEl.textContent='Market changed — rescanning automatically…'; debounceTimer=setTimeout(()=>scanMarket(),900); });
radiusEl.addEventListener('change',()=>{ if(cityEl.value.trim().length>=3) scanMarket(); });
industryEl.addEventListener('change',()=>applyIndustry(industryEl.value));
document.getElementById('independent-only').addEventListener('change',renderTable);
document.getElementById('tier-filter').addEventListener('change',renderTable);
document.getElementById('download-csv').addEventListener('click',downloadCsv);
['m-targets','m-revenue','m-margin','m-entry','m-exit','m-synergy','m-debt'].forEach(id=>document.getElementById(id).addEventListener('input',updateModel));

clearMarketView(); updateModel();
