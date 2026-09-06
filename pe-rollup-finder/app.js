const INDUSTRIES = {
  "HVAC": {filters:[["craft","hvac"],["shop","heating"]], keywords:["hvac","heating","air conditioning","cooling"], thesis:"Local route density, recurring maintenance, fragmented ownership, and cross-sell can support a buy-and-build thesis.", margin:16, entry:6, exit:9},
  "Plumbing": {filters:[["craft","plumber"]], keywords:["plumb","drain","sewer"], thesis:"Highly local demand, emergency call-outs, fragmented operators, and dispatch/marketing efficiencies can create scale benefits.", margin:15, entry:5.5, exit:8},
  "Electrical Contractors": {filters:[["craft","electrician"]], keywords:["electric","electrical"], thesis:"Fragmented skilled-trade operators can benefit from centralized recruiting, procurement, dispatch, and commercial customer penetration.", margin:14, entry:5.5, exit:8},
  "Landscaping": {filters:[["craft","gardener"]], keywords:["landscap","lawn","tree service","grounds"], thesis:"Recurring routes and dense local service areas can make tuck-ins valuable, especially where back-office and fleet utilization improve with scale.", margin:14, entry:5, exit:7.5},
  "Pest Control": {filters:[["shop","pest_control"]], keywords:["pest","exterminat","termite"], thesis:"Recurring subscriptions, route density, and fragmented local providers are classic ingredients for a services roll-up.", margin:20, entry:7, exit:10},
  "Auto Repair": {filters:[["shop","car_repair"]], keywords:["auto","automotive","car repair","garage","collision"], thesis:"Independent shops remain locally fragmented, while procurement, technician recruiting, software, and marketing can benefit from scale.", margin:14, entry:5.5, exit:8},
  "Car Wash": {filters:[["amenity","car_wash"]], keywords:["car wash","autowash","auto wash"], thesis:"Membership revenue, site-level operating leverage, and local clustering can make add-on economics attractive where saturation remains manageable.", margin:28, entry:8, exit:10},
  "Veterinary Clinics": {filters:[["amenity","veterinary"]], keywords:["vet","veterinary","animal hospital"], thesis:"Recurring pet-care demand and practice fragmentation can support consolidation, though clinician retention and local pricing discipline are critical.", margin:18, entry:8, exit:11},
  "Dentists": {filters:[["amenity","dentist"]], keywords:["dent","orthodont","oral surgery"], thesis:"Practice fragmentation and centralized administrative functions can support consolidation, with provider retention and same-store growth as key diligence items.", margin:20, entry:8.5, exit:12},
  "Physical Therapy": {filters:[["healthcare","physiotherapist"]], keywords:["physical therapy","physiotherapy","rehab"], thesis:"Clinic fragmentation, referrals, scheduling utilization, and centralized payer/admin capabilities can create scale, subject to reimbursement risk.", margin:18, entry:7, exit:10},
  "Laundromats": {filters:[["shop","laundry"]], keywords:["laundromat","laundry","wash & fold","wash and fold"], thesis:"Local density, equipment utilization, wash-and-fold expansion, and fragmented ownership can create a straightforward small-business consolidation thesis.", margin:25, entry:4.5, exit:7},
  "Self Storage": {filters:[["shop","storage_rental"]], keywords:["storage","self storage","mini storage"], thesis:"Highly local competition, recurring monthly revenue, and operating leverage make density and supply discipline central to consolidation economics.", margin:40, entry:10, exit:14}
};

const DEMO = [
  ["Carolina Climate Pros",35.1886,-80.8333,89,"A+",true,8,"2120 South Blvd, Charlotte, NC","https://example.com"],
  ["Queen City Heating & Air",35.2271,-80.8431,86,"A+",true,9,"Charlotte, NC",""],
  ["SouthEnd Mechanical",35.2082,-80.8602,82,"A+",true,7,"South End, Charlotte, NC",""],
  ["Crown Comfort Services",35.2490,-80.8135,80,"A+",true,8,"Charlotte, NC",""],
  ["Piedmont Air Solutions",35.1700,-80.8422,76,"A",true,5,"Charlotte, NC",""],
  ["Metro Mechanical CLT",35.2374,-80.7825,74,"A",true,6,"Charlotte, NC",""],
  ["Lake Norman Comfort",35.3180,-80.8410,72,"A",true,4,"Charlotte, NC",""],
  ["Dilworth Heating Co.",35.1970,-80.8260,70,"A",true,6,"Dilworth, Charlotte, NC",""],
  ["Uptown Air Care",35.2290,-80.8390,68,"A",true,9,"Charlotte, NC",""],
  ["Mint Hill HVAC",35.1800,-80.6500,66,"A",true,3,"Mint Hill, NC",""],
  ["Matthews Comfort Systems",35.1168,-80.7237,64,"A",true,4,"Matthews, NC",""],
  ["Park Road Heating",35.1740,-80.8520,61,"B",true,5,"Charlotte, NC",""],
  ["Steele Creek Mechanical",35.1140,-80.9740,58,"B",true,3,"Charlotte, NC",""],
  ["Eastway Air",35.2200,-80.7750,56,"B",true,5,"Charlotte, NC",""],
  ["NoDa HVAC Repair",35.2460,-80.8080,54,"B",true,6,"Charlotte, NC",""],
  ["University Climate",35.3050,-80.7350,51,"B",true,4,"Charlotte, NC",""],
  ["Westside Air Systems",35.2550,-80.9100,48,"B",true,4,"Charlotte, NC",""],
  ["ComfortHub Charlotte",35.2050,-80.8000,43,"Watch",false,7,"Charlotte, NC","https://example.com"],
  ["National Air & Heat",35.2600,-80.8500,39,"Watch",false,8,"Charlotte, NC",""],
  ["ClimateOne Services",35.1500,-80.7600,37,"Watch",false,3,"Charlotte, NC",""],
  ["Citywide Mechanical",35.2800,-80.8700,35,"Watch",false,5,"Charlotte, NC",""],
  ["Premier Home Services",35.1300,-80.8600,34,"Watch",false,2,"Charlotte, NC",""],
  ["AirMax Carolinas",35.3000,-80.8000,32,"Watch",false,3,"Charlotte, NC",""],
  ["HomePro HVAC",35.2200,-80.9400,30,"Watch",false,2,"Charlotte, NC",""],
].map((d,i)=>({id:`demo-${i}`,name:d[0],lat:d[1],lon:d[2],target_score:d[3],target_tier:d[4],likely_independent:d[5],nearby_5km:d[6],address:d[7],website:d[8],phone:"",distance_km:haversine(35.2271,-80.8431,d[1],d[2])}));

const industryEl = document.getElementById('industry');
Object.keys(INDUSTRIES).forEach(name => {
  const option = document.createElement('option');
  option.value = name; option.textContent = name; industryEl.appendChild(option);
});

let currentIndustry = 'HVAC';
let currentData = DEMO;
let currentCenter = {lat:35.2271, lon:-80.8431, label:'Charlotte, NC'};
let currentRadius = 20;
let map = L.map('map', {zoomControl:true}).setView([currentCenter.lat, currentCenter.lon], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
let markerLayer = L.layerGroup().addTo(map);

function clamp(n, lo=0, hi=100){ return Math.max(lo, Math.min(hi, n)); }
function rad(x){ return x * Math.PI / 180; }
function haversine(lat1,lon1,lat2,lon2){
  const R=6371.0088, p1=rad(lat1), p2=rad(lat2), dp=rad(lat2-lat1), dl=rad(lon2-lon1);
  const a=Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }
function tier(score){ if(score>=75) return 'A+'; if(score>=60) return 'A'; if(score>=45) return 'B'; return 'Watch'; }
function markerColor(t){ return (t==='A+'||t==='A') ? '#2e5d46' : t==='B' ? '#b6813c' : '#9b5a52'; }

function scoreBusinesses(rows, center){
  const names = rows.map(r => (r.name||'').toLowerCase().trim());
  const counts = names.reduce((acc,n)=>(acc[n]=(acc[n]||0)+1,acc),{});
  return rows.map((r, i) => {
    const nearby = rows.reduce((n, x, j) => n + (i!==j && haversine(r.lat,r.lon,x.lat,x.lon)<=5 ? 1:0), 0);
    const repeated = counts[names[i]] >= 3;
    const branded = !!r.chain_signal || repeated || !!r.brand;
    const independent = !branded;
    const contact = (r.phone ? 8:0) + (r.website ? 7:0);
    const addressPts = r.address ? 5 : 0;
    const score = Math.round((Math.min(nearby,12)/12*30 + (independent?40:8) + contact + addressPts)*10)/10;
    return {...r, nearby_5km:nearby, likely_independent:independent, target_score:score, target_tier:tier(score), distance_km:haversine(center.lat,center.lon,r.lat,r.lon)};
  }).sort((a,b)=>b.target_score-a.target_score || b.nearby_5km-a.nearby_5km);
}

function marketScore(rows, radius){
  if(!rows.length) return {score:0,fragmentation:0,density:0,scale:0};
  const share = rows.filter(r=>r.likely_independent).length / rows.length;
  const area = Math.PI * radius * radius;
  const density = rows.length / Math.max(area,1) * 100;
  const densityScore = clamp(density/5*100);
  const scaleScore = clamp(rows.length/60*100);
  const frag = share*100;
  return {score:0.5*frag+0.3*densityScore+0.2*scaleScore, fragmentation:frag, density:densityScore, scale:scaleScore};
}

function render(){
  const score = marketScore(currentData, currentRadius);
  const independents = currentData.filter(r=>r.likely_independent);
  const top = currentData.filter(r=>['A','A+'].includes(r.target_tier));
  document.getElementById('kpi-score').textContent = Math.round(score.score);
  document.getElementById('kpi-locations').textContent = currentData.length;
  document.getElementById('kpi-independent').textContent = currentData.length ? `${Math.round(independents.length/currentData.length*100)}%` : '0%';
  document.getElementById('kpi-independent-count').textContent = `${independents.length} targets`;
  document.getElementById('kpi-top').textContent = top.length;
  document.getElementById('fragmentation-value').textContent = Math.round(score.fragmentation);
  document.getElementById('density-value').textContent = Math.round(score.density);
  document.getElementById('scale-value').textContent = Math.round(score.scale);
  document.getElementById('fragmentation-bar').style.width = `${score.fragmentation}%`;
  document.getElementById('density-bar').style.width = `${score.density}%`;
  document.getElementById('scale-bar').style.width = `${score.scale}%`;
  document.getElementById('map-title').textContent = `${currentCenter.label.split(',').slice(0,2).join(',')} · ${currentIndustry}`;
  document.getElementById('thesis').innerHTML = `<strong>Why ${escapeHtml(currentIndustry)}?</strong> ${escapeHtml(INDUSTRIES[currentIndustry].thesis)}`;
  renderMap(); renderTable();
}

function renderMap(){
  markerLayer.clearLayers();
  currentData.forEach(r => {
    const color = markerColor(r.target_tier);
    const marker = L.circleMarker([r.lat,r.lon], {radius:7, color:'#ffffff', weight:1.5, fillColor:color, fillOpacity:.86});
    marker.bindPopup(`<div class="popup-title">${escapeHtml(r.name)}</div><div class="popup-meta"><b>${escapeHtml(r.target_tier)}</b> · score ${Math.round(r.target_score)}<br>${r.likely_independent?'Likely independent':'Possible chain / branded'}<br>${escapeHtml(r.address||'Address unavailable')}<br>${r.website?`<a href="${escapeHtml(r.website)}" target="_blank" rel="noreferrer">Website ↗</a>`:''}</div>`);
    marker.addTo(markerLayer);
  });
  if(currentData.length){
    const bounds = L.latLngBounds(currentData.map(r=>[r.lat,r.lon]));
    if(bounds.isValid()) map.fitBounds(bounds.pad(.12), {maxZoom:12});
  } else map.setView([currentCenter.lat,currentCenter.lon], 10);
}

function filteredRows(){
  const independent = document.getElementById('independent-only').checked;
  const tf = document.getElementById('tier-filter').value;
  return currentData.filter(r => {
    if(independent && !r.likely_independent) return false;
    if(tf==='top' && !['A','A+'].includes(r.target_tier)) return false;
    if(!['all','top'].includes(tf) && r.target_tier!==tf) return false;
    return true;
  });
}

function renderTable(){
  const body = document.getElementById('target-body');
  const rows = filteredRows();
  if(!rows.length){ body.innerHTML='<tr><td colspan="7" class="empty-row">No targets match these filters.</td></tr>'; return; }
  body.innerHTML = rows.slice(0,60).map((r,i) => {
    const contact = r.website ? `<a class="contact" href="${escapeHtml(r.website)}" target="_blank" rel="noreferrer">Website ↗</a>` : (r.phone ? escapeHtml(r.phone) : '—');
    return `<tr><td>${i+1}</td><td><span class="operator">${escapeHtml(r.name)}</span><span class="subline">${escapeHtml(r.address||'Address unavailable')}</span></td><td><span class="tier ${r.target_tier==='B'?'b':r.target_tier==='Watch'?'watch':''}">${r.target_tier}</span></td><td class="score-num">${Math.round(r.target_score)}</td><td>${r.nearby_5km}</td><td>${r.distance_km.toFixed(1)} km</td><td>${contact}</td></tr>`;
  }).join('');
}

function encodeQuery(industry, lat, lon, radiusKm){
  const cfg = INDUSTRIES[industry], r = Math.round(radiusKm*1000), parts=[];
  cfg.filters.forEach(([k,v]) => ['node','way','relation'].forEach(t => parts.push(`${t}["${k}"="${v}"](around:${r},${lat},${lon});`)));
  const regex = cfg.keywords.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  ['node','way','relation'].forEach(t => parts.push(`${t}["name"~"${regex}",i](around:${r},${lat},${lon});`));
  return `[out:json][timeout:35];(${parts.join('')});out center tags;`;
}

async function geocode(city){
  const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(city)}`;
  const res = await fetch(u, {headers:{'Accept':'application/json'}});
  if(!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data = await res.json();
  if(!data.length) throw new Error(`Could not find “${city}”. Try “City, State”.`);
  return {lat:+data[0].lat, lon:+data[0].lon, label:data[0].display_name || city};
}

async function fetchBusinesses(industry, center, radius){
  const q = encodeQuery(industry, center.lat, center.lon, radius);
  const endpoints = ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  let lastErr;
  for(const endpoint of endpoints){
    try{
      const res = await fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}, body:`data=${encodeURIComponent(q)}`});
      if(!res.ok) throw new Error(`Overpass ${res.status}`);
      const data = await res.json();
      const seen = new Set(), rows=[];
      for(const e of data.elements || []){
        const t=e.tags||{}, c=e.center||{}; const lat=e.lat??c.lat, lon=e.lon??c.lon;
        if(lat==null || lon==null) continue;
        const name=(t.name||t.brand||'Unnamed operator').trim();
        const key=`${name.toLowerCase().replace(/[^a-z0-9]+/g,'')}-${(+lat).toFixed(4)}-${(+lon).toFixed(4)}`;
        if(seen.has(key)) continue; seen.add(key);
        const address=[t['addr:housenumber'],t['addr:street'],t['addr:city'],t['addr:state'],t['addr:postcode']].filter(Boolean).join(' ');
        rows.push({id:`${e.type}-${e.id}`,name,lat:+lat,lon:+lon,address,phone:t.phone||t['contact:phone']||'',website:t.website||t['contact:website']||'',brand:t.brand||t.operator||'',chain_signal:!!(t['brand:wikidata']||t['brand:wikipedia'])});
      }
      return rows;
    }catch(err){ lastErr=err; }
  }
  throw lastErr || new Error('OpenStreetMap query failed.');
}

async function runSearch(evt){
  evt.preventDefault();
  const btn=document.getElementById('run-search'), status=document.getElementById('status');
  const city=document.getElementById('city').value.trim();
  const industry=industryEl.value, radius=+document.getElementById('radius').value;
  if(!city){ status.textContent='Enter a city or metro first.'; status.className='status error'; return; }
  btn.disabled=true; btn.textContent='Scanning…'; status.className='status'; status.textContent='Geocoding market…';
  try{
    const center=await geocode(city); status.textContent='Pulling local operators from OpenStreetMap…';
    const raw=await fetchBusinesses(industry,center,radius);
    currentIndustry=industry; currentCenter=center; currentRadius=radius; currentData=scoreBusinesses(raw,center);
    status.textContent = currentData.length ? `Live scan complete: ${currentData.length} public listings found around ${center.label}.` : 'No matching public listings found. Try a larger radius or another industry.';
    status.className='status'; applyIndustryDefaults(false); render();
  }catch(err){
    console.error(err); status.textContent=`Live scan failed: ${err.message}. The demo remains visible.`; status.className='status error';
  }finally{ btn.disabled=false; btn.textContent='Scan market'; }
}

function applyIndustryDefaults(updateRender=true){
  const cfg=INDUSTRIES[industryEl.value];
  document.getElementById('m-margin').value=cfg.margin;
  document.getElementById('m-entry').value=cfg.entry;
  document.getElementById('m-exit').value=cfg.exit;
  if(updateRender){ currentIndustry=industryEl.value; document.getElementById('thesis').innerHTML=`<strong>Why ${escapeHtml(currentIndustry)}?</strong> ${escapeHtml(cfg.thesis)}`; }
  updateModel();
}

function num(id, fallback){ const v=parseFloat(document.getElementById(id).value); return Number.isFinite(v)?v:fallback; }
function moneyM(v){ return `$${v.toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})}m`; }
function updateModel(){
  const n=clamp(num('m-targets',8),1,100), rev=clamp(num('m-revenue',2),.1,100), margin=clamp(num('m-margin',16),1,60)/100;
  const entry=clamp(num('m-entry',6),1,30), exit=clamp(num('m-exit',9),1,30), synergy=clamp(num('m-synergy',3),0,20)/100, debtPct=clamp(num('m-debt',50),0,90)/100;
  const revenue=n*rev, standalone=revenue*margin, synergyEbitda=revenue*synergy, proforma=standalone+synergyEbitda, purchase=standalone*entry;
  const debt=purchase*debtPct, equity=purchase-debt, exitEv=proforma*exit, exitEq=Math.max(exitEv-debt,0), moc=equity>0?exitEq/equity:0, irr=moc>0?Math.pow(moc,1/5)-1:-1;
  document.getElementById('r-purchase').textContent=moneyM(purchase);
  document.getElementById('r-ebitda').textContent=moneyM(proforma);
  document.getElementById('r-moc').textContent=`${moc.toFixed(2)}x`;
  document.getElementById('r-irr').textContent=`${(irr*100).toFixed(1)}%`;
}

function downloadCsv(){
  const rows=filteredRows();
  const headers=['name','target_tier','target_score','likely_independent','nearby_5km','distance_km','address','phone','website'];
  const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const csv=[headers.join(','),...rows.map(r=>headers.map(h=>esc(h==='distance_km'?r[h].toFixed(2):r[h])).join(','))].join('\n');
  const blob=new Blob([csv],{type:'text/csv'}), a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download=`${currentIndustry.toLowerCase().replace(/\s+/g,'-')}-targets.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

document.getElementById('search-form').addEventListener('submit',runSearch);
document.getElementById('independent-only').addEventListener('change',renderTable);
document.getElementById('tier-filter').addEventListener('change',renderTable);
document.getElementById('download-csv').addEventListener('click',downloadCsv);
industryEl.addEventListener('change',()=>applyIndustryDefaults(true));
['m-targets','m-revenue','m-margin','m-entry','m-exit','m-synergy','m-debt'].forEach(id=>document.getElementById(id).addEventListener('input',updateModel));

industryEl.value='HVAC';
document.getElementById('thesis').innerHTML=`<strong>Why HVAC?</strong> ${INDUSTRIES.HVAC.thesis}`;
render(); updateModel();
