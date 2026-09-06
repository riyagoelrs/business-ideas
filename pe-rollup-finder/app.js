const INDUSTRIES = {
  "HVAC": {
    filters:[["craft","hvac"],["shop","heating"]],
    keywords:["hvac","heating","air conditioning","cooling"],
    thesis:"Local route density, recurring maintenance, fragmented ownership, and cross-sell can support a buy-and-build thesis.",
    margin:16, entry:6, exit:9, revenue:2.0
  },
  "Plumbing": {
    filters:[["craft","plumber"]],
    keywords:["plumb","drain","sewer"],
    thesis:"Highly local demand, emergency call-outs, fragmented operators, and dispatch/marketing efficiencies can create scale benefits.",
    margin:15, entry:5.5, exit:8, revenue:1.8
  },
  "Electrical Contractors": {
    filters:[["craft","electrician"]],
    keywords:["electric","electrical"],
    thesis:"Fragmented skilled-trade operators can benefit from centralized recruiting, procurement, dispatch, and commercial customer penetration.",
    margin:14, entry:5.5, exit:8, revenue:2.0
  },
  "Landscaping": {
    filters:[["craft","gardener"]],
    keywords:["landscap","lawn","tree service","grounds"],
    thesis:"Recurring routes and dense local service areas can make tuck-ins valuable, especially where back-office and fleet utilization improve with scale.",
    margin:14, entry:5, exit:7.5, revenue:1.5
  },
  "Pest Control": {
    filters:[["shop","pest_control"]],
    keywords:["pest","exterminat","termite"],
    thesis:"Recurring subscriptions, route density, and fragmented local providers are classic ingredients for a services roll-up.",
    margin:20, entry:7, exit:10, revenue:1.5
  },
  "Auto Repair": {
    filters:[["shop","car_repair"]],
    keywords:["auto","automotive","car repair","garage","collision"],
    thesis:"Independent shops remain locally fragmented, while procurement, technician recruiting, software, and marketing can benefit from scale.",
    margin:14, entry:5.5, exit:8, revenue:1.8
  },
  "Car Wash": {
    filters:[["amenity","car_wash"]],
    keywords:["car wash","autowash","auto wash"],
    thesis:"Membership revenue, site-level operating leverage, and local clustering can make add-on economics attractive where saturation remains manageable.",
    margin:28, entry:8, exit:10, revenue:2.5
  },
  "Veterinary Clinics": {
    filters:[["amenity","veterinary"]],
    keywords:["vet","veterinary","animal hospital"],
    thesis:"Recurring pet-care demand and practice fragmentation can support consolidation, though clinician retention and local pricing discipline are critical.",
    margin:18, entry:8, exit:11, revenue:2.2
  },
  "Dentists": {
    filters:[["amenity","dentist"]],
    keywords:["dent","orthodont","oral surgery"],
    thesis:"Practice fragmentation and centralized administrative functions can support consolidation, with provider retention and same-store growth as key diligence items.",
    margin:20, entry:8.5, exit:12, revenue:1.8
  },
  "Physical Therapy": {
    filters:[["healthcare","physiotherapist"]],
    keywords:["physical therapy","physiotherapy","rehab"],
    thesis:"Clinic fragmentation, referrals, scheduling utilization, and centralized payer/admin capabilities can create scale, subject to reimbursement risk.",
    margin:18, entry:7, exit:10, revenue:1.2
  },
  "Laundromats": {
    filters:[["shop","laundry"]],
    keywords:["laundromat","laundry","wash & fold","wash and fold"],
    thesis:"Local density, equipment utilization, wash-and-fold expansion, and fragmented ownership can create a straightforward small-business consolidation thesis.",
    margin:25, entry:4.5, exit:7, revenue:0.7
  },
  "Self Storage": {
    filters:[["shop","storage_rental"]],
    keywords:["storage","self storage","mini storage"],
    thesis:"Highly local competition, recurring monthly revenue, and operating leverage make density and supply discipline central to consolidation economics.",
    margin:40, entry:10, exit:14, revenue:1.2
  }
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
  ["Park Road Heating",35.1740,-80.8520,61,"B",true,5,"Charlotte, NC",""]
].map((d,i)=>({
  id:`demo-${i}`,name:d[0],lat:d[1],lon:d[2],target_score:d[3],target_tier:d[4],
  likely_independent:d[5],nearby_5km:d[6],address:d[7],website:d[8],phone:"",
  distance_km:haversine(35.2271,-80.8431,d[1],d[2]), tags:{}
}));

const industryEl = document.getElementById("industry");
const cityEl = document.getElementById("city");
const radiusEl = document.getElementById("radius");
const runButton = document.getElementById("run-search");
const statusEl = document.getElementById("status");

let currentIndustry = "HVAC";
let currentData = DEMO;
let currentCenter = {lat:35.2271, lon:-80.8431, label:"Charlotte, NC"};
let currentRadius = 20;
let cityUniverse = [];
let marketOptions = [];
let scanToken = 0;
let cityDebounce = null;

let map = L.map("map", {zoomControl:true}).setView([currentCenter.lat, currentCenter.lon], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom:19,
  attribution:"&copy; OpenStreetMap contributors"
}).addTo(map);
let markerLayer = L.layerGroup().addTo(map);

function clamp(n, lo=0, hi=100){ return Math.max(lo, Math.min(hi, n)); }
function rad(x){ return x * Math.PI / 180; }
function haversine(lat1,lon1,lat2,lon2){
  const R=6371.0088, p1=rad(lat1), p2=rad(lat2), dp=rad(lat2-lat1), dl=rad(lon2-lon1);
  const a=Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function escapeHtml(s=""){
  return String(s).replace(/[&<>'"]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"
  }[c]));
}
function tier(score){ if(score>=75) return "A+"; if(score>=60) return "A"; if(score>=45) return "B"; return "Watch"; }
function markerColor(t){ return (t==="A+"||t==="A") ? "#2e5d46" : t==="B" ? "#b6813c" : "#9b5a52"; }

function normalizedText(row){
  const t = row.tags || {};
  return [
    row.name, t.brand, t.operator, t.description, t["contact:website"], t.website,
    t.craft, t.shop, t.amenity, t.healthcare
  ].filter(Boolean).join(" ").toLowerCase();
}

function matchesIndustry(row, industry){
  const cfg = INDUSTRIES[industry];
  const tags = row.tags || {};
  const exact = cfg.filters.some(([k,v]) => String(tags[k] || "").toLowerCase() === String(v).toLowerCase());
  if(exact) return true;
  const text = normalizedText(row);
  return cfg.keywords.some(k => text.includes(k.toLowerCase()));
}

function scoreBusinesses(rows, center){
  const names = rows.map(r => (r.name||"").toLowerCase().trim());
  const counts = names.reduce((acc,n)=>(acc[n]=(acc[n]||0)+1,acc),{});
  return rows.map((r, i) => {
    const nearby = rows.reduce((n, x, j) => n + (i!==j && haversine(r.lat,r.lon,x.lat,x.lon)<=5 ? 1:0), 0);
    const repeated = counts[names[i]] >= 3;
    const t = r.tags || {};
    const branded = !!t.brand || !!t["brand:wikidata"] || !!t["brand:wikipedia"] || repeated;
    const independent = !branded;
    const contact = (r.phone ? 8:0) + (r.website ? 7:0);
    const addressPts = r.address ? 5 : 0;
    const densityPts = Math.min(nearby,12)/12*30;
    const score = Math.round((densityPts + (independent?40:8) + contact + addressPts)*10)/10;
    return {
      ...r,
      nearby_5km:nearby,
      likely_independent:independent,
      target_score:score,
      target_tier:tier(score),
      distance_km:haversine(center.lat,center.lon,r.lat,r.lon)
    };
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
  return {
    score:0.5*frag+0.3*densityScore+0.2*scaleScore,
    fragmentation:frag,
    density:densityScore,
    scale:scaleScore
  };
}

function marketRank(industry, rawRows){
  const matched = rawRows.filter(r => matchesIndustry(r, industry));
  const scored = scoreBusinesses(matched, currentCenter);
  const quality = marketScore(scored, currentRadius);
  return {
    industry,
    rows:scored,
    count:scored.length,
    independent:scored.filter(r=>r.likely_independent).length,
    score:quality.score
  };
}

function populateIndustryOptions(options, preferredIndustry=null){
  industryEl.innerHTML = "";
  const relevant = options.filter(o => o.count > 0);
  if(!relevant.length){
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No mapped opportunities found";
    industryEl.appendChild(option);
    industryEl.disabled = true;
    return;
  }

  industryEl.disabled = false;
  relevant.forEach(o => {
    const option = document.createElement("option");
    option.value = o.industry;
    option.textContent = `${o.industry} · ${o.count} operators · ${Math.round(o.score)}/100`;
    industryEl.appendChild(option);
  });

  const preferred = preferredIndustry && relevant.some(o=>o.industry===preferredIndustry)
    ? preferredIndustry
    : relevant[0].industry;
  industryEl.value = preferred;
  currentIndustry = preferred;
}

function applyIndustry(industry, {syncModel=true}={}){
  const option = marketOptions.find(o => o.industry === industry);
  if(!option) return;
  currentIndustry = industry;
  currentData = option.rows;
  industryEl.value = industry;
  if(syncModel) syncModelDefaults();
  render();
  statusEl.textContent = `${currentCenter.label}: ${option.count} mapped ${industry.toLowerCase()} operators found. Market options are ranked from this city's live operator universe.`;
}

function syncModelDefaults(){
  const cfg = INDUSTRIES[currentIndustry];
  if(!cfg) return;
  document.getElementById("m-margin").value = cfg.margin;
  document.getElementById("m-entry").value = cfg.entry;
  document.getElementById("m-exit").value = cfg.exit;
  document.getElementById("m-revenue").value = cfg.revenue || 2;
  const topTargets = currentData.filter(r=>["A","A+"].includes(r.target_tier)).length;
  document.getElementById("m-targets").value = Math.max(1, Math.min(12, topTargets || Math.min(currentData.length, 8) || 1));
  updateModel();
}

function render(){
  const score = marketScore(currentData, currentRadius);
  const independents = currentData.filter(r=>r.likely_independent);
  const top = currentData.filter(r=>["A","A+"].includes(r.target_tier));

  document.getElementById("kpi-score").textContent = Math.round(score.score);
  document.getElementById("kpi-locations").textContent = currentData.length;
  document.getElementById("kpi-independent").textContent = currentData.length
    ? `${Math.round(independents.length/currentData.length*100)}%`
    : "0%";
  document.getElementById("kpi-independent-count").textContent = `${independents.length} targets`;
  document.getElementById("kpi-top").textContent = top.length;

  document.getElementById("fragmentation-value").textContent = Math.round(score.fragmentation);
  document.getElementById("density-value").textContent = Math.round(score.density);
  document.getElementById("scale-value").textContent = Math.round(score.scale);
  document.getElementById("fragmentation-bar").style.width = `${score.fragmentation}%`;
  document.getElementById("density-bar").style.width = `${score.density}%`;
  document.getElementById("scale-bar").style.width = `${score.scale}%`;

  document.getElementById("map-title").textContent =
    `${currentCenter.label.split(",").slice(0,2).join(",")} · ${currentIndustry}`;

  const cfg = INDUSTRIES[currentIndustry];
  document.getElementById("thesis").innerHTML = cfg
    ? `<strong>Why ${escapeHtml(currentIndustry)}?</strong> ${escapeHtml(cfg.thesis)}`
    : "";

  renderMap();
  renderTable();
}

function renderMap(){
  markerLayer.clearLayers();
  currentData.forEach(r => {
    const color = markerColor(r.target_tier);
    const marker = L.circleMarker([r.lat,r.lon], {
      radius:7,color:"#ffffff",weight:1.5,fillColor:color,fillOpacity:.86
    });
    marker.bindPopup(
      `<div class="popup-title">${escapeHtml(r.name)}</div>` +
      `<div class="popup-meta"><b>${escapeHtml(r.target_tier)}</b> · score ${Math.round(r.target_score)}<br>` +
      `${r.likely_independent?"Likely independent":"Possible chain / branded"}<br>` +
      `${escapeHtml(r.address||"Address unavailable")}<br>` +
      `${r.website?`<a href="${escapeHtml(r.website)}" target="_blank" rel="noreferrer">Website ↗</a>`:""}</div>`
    );
    marker.addTo(markerLayer);
  });

  if(currentData.length){
    const bounds = L.latLngBounds(currentData.map(r=>[r.lat,r.lon]));
    if(bounds.isValid()) map.fitBounds(bounds.pad(.12), {maxZoom:12});
  } else {
    map.setView([currentCenter.lat,currentCenter.lon], 10);
  }
}

function filteredRows(){
  const independent = document.getElementById("independent-only").checked;
  const tf = document.getElementById("tier-filter").value;
  return currentData.filter(r => {
    if(independent && !r.likely_independent) return false;
    if(tf==="top" && !["A","A+"].includes(r.target_tier)) return false;
    if(!["all","top"].includes(tf) && r.target_tier!==tf) return false;
    return true;
  });
}

function renderTable(){
  const body = document.getElementById("target-body");
  const rows = filteredRows();
  if(!rows.length){
    body.innerHTML='<tr><td colspan="7" class="empty-row">No targets match these filters.</td></tr>';
    return;
  }
  body.innerHTML = rows.slice(0,60).map((r,i) => {
    const contact = r.website
      ? `<a class="contact" href="${escapeHtml(r.website)}" target="_blank" rel="noreferrer">Website ↗</a>`
      : (r.phone ? escapeHtml(r.phone) : "—");
    return `<tr>
      <td>${i+1}</td>
      <td><span class="operator">${escapeHtml(r.name)}</span><span class="subline">${escapeHtml(r.address||"Address unavailable")}</span></td>
      <td><span class="tier ${r.target_tier==="B"?"b":r.target_tier==="Watch"?"watch":""}">${r.target_tier}</span></td>
      <td class="score-num">${Math.round(r.target_score)}</td>
      <td>${r.nearby_5km}</td>
      <td>${r.distance_km.toFixed(1)} km</td>
      <td>${contact}</td>
    </tr>`;
  }).join("");
}

function exactFilterFragments(lat, lon, radiusKm){
  const r = Math.round(radiusKm*1000);
  const unique = new Set();
  Object.values(INDUSTRIES).forEach(cfg => {
    cfg.filters.forEach(([k,v]) => {
      ["node","way","relation"].forEach(type => unique.add(`${type}["${k}"="${v}"](around:${r},${lat},${lon});`));
    });
  });
  return [...unique];
}

function keywordFragments(lat, lon, radiusKm){
  const r = Math.round(radiusKm*1000);
  const words = [...new Set(Object.values(INDUSTRIES).flatMap(cfg=>cfg.keywords))]
    .map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"))
    .join("|");
  return ["node","way","relation"].map(type =>
    `${type}["name"~"${words}",i](around:${r},${lat},${lon});`
  );
}

function encodeDiscoveryQuery(lat, lon, radiusKm){
  const parts = [...exactFilterFragments(lat,lon,radiusKm), ...keywordFragments(lat,lon,radiusKm)];
  return `[out:json][timeout:45];(${parts.join("")});out center tags;`;
}

async function geocode(city){
  const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(city)}`;
  const res = await fetch(u, {headers:{"Accept":"application/json"}});
  if(!res.ok) throw new Error("Could not geocode that market.");
  const data = await res.json();
  if(!data.length) throw new Error("Market not found. Try City, State or City, Country.");
  const p = data[0];
  const a = p.address || {};
  const locality = a.city || a.town || a.village || a.municipality || city.split(",")[0].trim();
  const region = a.state || a.region || a.country_code?.toUpperCase() || "";
  return {lat:+p.lat, lon:+p.lon, label:[locality, region].filter(Boolean).join(", ")};
}

function parseElement(el, center){
  const t = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if(!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const name = t.name || t.brand || t.operator || "Unnamed operator";
  const address = [
    [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "),
    t["addr:city"],
    t["addr:state"],
    t["addr:postcode"]
  ].filter(Boolean).join(", ");

  const website = t.website || t["contact:website"] || "";
  const phone = t.phone || t["contact:phone"] || "";

  return {
    id:`${el.type}-${el.id}`,
    name,
    lat:+lat,
    lon:+lon,
    address,
    website,
    phone,
    tags:t,
    distance_km:haversine(center.lat,center.lon,+lat,+lon)
  };
}

function dedupeRows(rows){
  const seen = new Set();
  return rows.filter(r => {
    const key = `${r.name.toLowerCase().trim()}|${r.lat.toFixed(4)}|${r.lon.toFixed(4)}`;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function queryUniverse(lat, lon, radiusKm){
  const q = encodeDiscoveryQuery(lat, lon, radiusKm);
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];
  let lastError = null;

  for(const endpoint of endpoints){
    try{
      const res = await fetch(endpoint, {
        method:"POST",
        headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
        body:`data=${encodeURIComponent(q)}`
      });
      if(!res.ok) throw new Error(`Data source returned ${res.status}.`);
      const json = await res.json();
      return dedupeRows(json.elements.map(el=>parseElement(el,{lat,lon})).filter(Boolean));
    }catch(err){
      lastError = err;
    }
  }
  throw lastError || new Error("Live market data is temporarily unavailable.");
}

function rankMarkets(rawRows){
  return Object.keys(INDUSTRIES)
    .map(industry => marketRank(industry, rawRows))
    .filter(o => o.count > 0)
    .sort((a,b) => b.score-a.score || b.count-a.count || b.independent-a.independent);
}

async function scanMarket({preserveIndustry=true}={}){
  const token = ++scanToken;
  const city = cityEl.value.trim();
  if(!city){
    statusEl.textContent = "Enter a city to scan.";
    return;
  }

  currentRadius = +radiusEl.value || 20;
  const previousIndustry = preserveIndustry ? currentIndustry : null;
  runButton.disabled = true;
  industryEl.disabled = true;
  statusEl.textContent = `Scanning ${city} across ${Object.keys(INDUSTRIES).length} roll-up categories…`;

  try{
    const center = await geocode(city);
    if(token !== scanToken) return;
    currentCenter = center;
    statusEl.textContent = `Mapped ${center.label}. Pulling the local operator universe…`;

    const rawRows = await queryUniverse(center.lat, center.lon, currentRadius);
    if(token !== scanToken) return;

    cityUniverse = rawRows;
    marketOptions = rankMarkets(rawRows);
    populateIndustryOptions(marketOptions, previousIndustry);

    if(!marketOptions.length){
      currentData = [];
      render();
      statusEl.textContent = `No mapped operators in the current categories were found within ${currentRadius} km of ${center.label}. Try a larger radius.`;
      return;
    }

    const selected = marketOptions.find(o=>o.industry===currentIndustry) || marketOptions[0];
    currentIndustry = selected.industry;
    currentData = selected.rows;
    syncModelDefaults();
    render();

    const topThree = marketOptions.slice(0,3)
      .map(o=>`${o.industry} ${Math.round(o.score)}/100 (${o.count})`)
      .join(" · ");
    statusEl.textContent = `${center.label}: ${rawRows.length} local operators classified. Top opportunities: ${topThree}.`;
  }catch(err){
    console.error(err);
    statusEl.textContent = `${err.message} Keeping the last successful market on screen.`;
  }finally{
    if(token === scanToken){
      runButton.disabled = false;
      industryEl.disabled = marketOptions.length===0;
    }
  }
}

function updateModel(){
  const n = clamp(parseFloat(document.getElementById("m-targets").value)||1,1,100);
  const rev = clamp(parseFloat(document.getElementById("m-revenue").value)||0,0,1000);
  const margin = clamp(parseFloat(document.getElementById("m-margin").value)||0,0,100)/100;
  const entry = clamp(parseFloat(document.getElementById("m-entry").value)||1,0.1,100);
  const exit = clamp(parseFloat(document.getElementById("m-exit").value)||1,0.1,100);
  const synergy = clamp(parseFloat(document.getElementById("m-synergy").value)||0,0,100)/100;
  const debtPct = clamp(parseFloat(document.getElementById("m-debt").value)||0,0,100)/100;

  const baseEbitda = n * rev * margin;
  const purchase = baseEbitda * entry;
  const pfEbitda = baseEbitda + n * rev * synergy;
  const debt = purchase * debtPct;
  const equity = Math.max(purchase - debt, .0001);
  const exitEquity = Math.max(pfEbitda * exit - debt, 0);
  const moc = exitEquity / equity;
  const irr = moc>0 ? Math.pow(moc,1/5)-1 : -1;

  document.getElementById("r-purchase").textContent = `$${purchase.toFixed(1)}m`;
  document.getElementById("r-ebitda").textContent = `$${pfEbitda.toFixed(1)}m`;
  document.getElementById("r-moc").textContent = `${moc.toFixed(2)}x`;
  document.getElementById("r-irr").textContent = `${(irr*100).toFixed(1)}%`;
}

function downloadCsv(){
  const rows = filteredRows();
  const headers = ["rank","operator","tier","score","likely_independent","nearby_5km","distance_km","address","phone","website","industry","market"];
  const lines = [headers.join(",")];

  rows.forEach((r,i)=>{
    const vals = [
      i+1,r.name,r.target_tier,Math.round(r.target_score),r.likely_independent,
      r.nearby_5km,r.distance_km.toFixed(2),r.address,r.phone,r.website,currentIndustry,currentCenter.label
    ].map(v=>`"${String(v??"").replace(/"/g,'""')}"`);
    lines.push(vals.join(","));
  });

  const blob = new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentCenter.label}-${currentIndustry}-targets`.toLowerCase().replace(/[^a-z0-9]+/g,"-")+".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.getElementById("search-form").addEventListener("submit", e=>{
  e.preventDefault();
  scanMarket({preserveIndustry:true});
});

cityEl.addEventListener("input", ()=>{
  clearTimeout(cityDebounce);
  const city = cityEl.value.trim();
  if(city.length < 3) return;
  statusEl.textContent = `Market changed to "${city}". Auto-scan will run when you finish typing…`;
  cityDebounce = setTimeout(()=>scanMarket({preserveIndustry:false}), 700);
});

cityEl.addEventListener("change", ()=>{
  clearTimeout(cityDebounce);
  scanMarket({preserveIndustry:false});
});

radiusEl.addEventListener("change", ()=>{
  clearTimeout(cityDebounce);
  scanMarket({preserveIndustry:true});
});

industryEl.addEventListener("change", ()=>{
  applyIndustry(industryEl.value, {syncModel:true});
});

document.getElementById("independent-only").addEventListener("change", renderTable);
document.getElementById("tier-filter").addEventListener("change", renderTable);
document.getElementById("download-csv").addEventListener("click", downloadCsv);

["m-targets","m-revenue","m-margin","m-entry","m-exit","m-synergy","m-debt"].forEach(id=>{
  document.getElementById(id).addEventListener("input", updateModel);
});

marketOptions = [{
  industry:"HVAC",
  rows:DEMO,
  count:DEMO.length,
  independent:DEMO.filter(r=>r.likely_independent).length,
  score:marketScore(DEMO,20).score
}];
populateIndustryOptions(marketOptions, "HVAC");
render();
syncModelDefaults();

setTimeout(()=>scanMarket({preserveIndustry:false}), 150);
