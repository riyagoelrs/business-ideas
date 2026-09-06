(() => {
  const STORAGE_KEY = "internetTasteGraph.signalProfile.v2";
  const SOURCE_META = {
    google: { label: "Google / Search", weight: 1.25 },
    youtube: { label: "YouTube", weight: 1.35 },
    social: { label: "Social graph", weight: 1.15 },
    places: { label: "Places / Maps", weight: 1.45 },
    browser: { label: "Browser history", weight: .9 },
    manual: { label: "Typed interests", weight: 1.3 }
  };

  const STOP = new Set((`the a an and or but to of in on at for from with by is are was were be been being this that these those it its as into about your you my me we our they their them i search searched watched visited visit google youtube instagram tiktok chrome maps activity history http https www com net org html watch page home account profile video videos shorts short reel reels post posts following followers liked likes save saved open clicked click view viewed website websites app apps using use one two three new old get how what why who when where more less not no yes today yesterday tomorrow ago`)
    .split(/\s+/));

  const CATALOG = [
    { title:"Listening bars", kind:"place ritual", tags:["jazz","analog","music","tokyo","nightlife","design","vinyl"], why:"Your signals cluster around analog media, intentional spaces and music culture." },
    { title:"Apartamento Magazine", kind:"media", tags:["interiors","design","editorial","home","photography","creative"], why:"A strong bridge between design, lived-in spaces and image-led culture." },
    { title:"Kissaten culture", kind:"place ritual", tags:["coffee","japan","tokyo","jazz","analog","quiet","design"], why:"Combines café behavior with analog listening, ritual and Japanese design." },
    { title:"Casa Barragán", kind:"place", tags:["mexico","mexico city","architecture","color","modernism","design","travel"], why:"A high-fit crossover of architecture, color, travel and design specificity." },
    { title:"MUBI Notebook", kind:"content", tags:["film","cinema","editorial","culture","photography","design"], why:"Useful when film interest overlaps with editorial and visual taste." },
    { title:"Tenderbooks", kind:"place / media", tags:["books","london","art","fashion","magazine","editorial"], why:"A physical node where niche publishing, fashion and art overlap." },
    { title:"Noma Projects", kind:"brand", tags:["food","copenhagen","fermentation","design","restaurant","product"], why:"Turns restaurant R&D into culturally legible consumer products." },
    { title:"Modernist ceramics", kind:"object", tags:["ceramics","design","home","craft","food","art","objects"], why:"A useful object-level extension of design, restaurant and craft signals." },
    { title:"Hotel stationery collecting", kind:"micro-obsession", tags:["hotel","travel","paper","design","nostalgia","objects","analog"], why:"A deliberately niche jump from travel and visual-memory behavior." },
    { title:"Portuguese tinned fish design", kind:"food / design", tags:["food","packaging","portugal","travel","design","heritage"], why:"Connects food behavior to packaging, travel memory and heritage aesthetics." },
    { title:"PIN–UP Magazine", kind:"media", tags:["architecture","magazine","fashion","new york","design","editorial"], why:"Architecture content with the energy and personality of fashion publishing." },
    { title:"Gohar World", kind:"brand", tags:["food","table","objects","fashion","new york","surreal","design"], why:"A strong cross-category recommendation when food, fashion and object design converge." },
    { title:"Auralee", kind:"brand", tags:["japan","tokyo","fashion","textile","minimal","quiet luxury","design"], why:"A quieter, material-driven branch of fashion taste." },
    { title:"Martine Rose", kind:"brand", tags:["london","fashion","music","club","subculture","menswear"], why:"Moves fashion interest toward club culture and subcultural references." },
    { title:"Contramar", kind:"restaurant", tags:["mexico city","food","seafood","travel","fashion","restaurant"], why:"A place recommendation sitting at the intersection of food, travel and cultural crowd." },
    { title:"Cibone", kind:"place / retail", tags:["tokyo","japan","design","objects","retail","home","fashion"], why:"High-signal retail for people whose taste travels across objects, fashion and interiors." },
    { title:"032c", kind:"media", tags:["berlin","fashion","art","theory","magazine","subculture"], why:"Useful if your graph leans fashion but your searches also show art, culture or theory." },
    { title:"The Gentlewoman", kind:"media", tags:["women","fashion","editorial","interviews","design","london"], why:"A slower editorial recommendation from fashion and long-form profile signals." },
    { title:"Cycling cafés", kind:"place ritual", tags:["cycling","coffee","copenhagen","design","community","wellness"], why:"A cross-over between routine behavior, café culture, wellness and design." },
    { title:"Artist-run guesthouses", kind:"travel", tags:["hotel","travel","art","design","slow","creative","residency"], why:"A more adventurous extension of boutique hotels, art spaces and slow travel." }
  ];

  const state = loadState();
  let activeSource = "manual";

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && saved.terms && saved.sources) return saved;
    } catch (_) {}
    return { terms: {}, sources: {}, importedAt: null };
  }

  function saveState() {
    state.importedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalizeToken(token) {
    return token.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9+#&' -]/g, " ").replace(/\s+/g, " ").trim();
  }

  function extractTerms(text) {
    const decoded = (() => { try { return decodeURIComponent(text); } catch (_) { return text; } })();
    const enriched = decoded
      .replace(/https?:\/\/[^\s"'<>]+/gi, u => {
        try {
          const url = new URL(u);
          const q = url.searchParams.get("q") || url.searchParams.get("query") || url.searchParams.get("search_query") || "";
          return ` ${url.pathname.replace(/[\/_-]+/g," ")} ${q} `;
        } catch (_) { return " "; }
      })
      .replace(/<[^>]+>/g, " ")
      .replace(/[|•·→↗\t\r\n]+/g, " ");

    const words = enriched.toLowerCase().match(/[a-z0-9][a-z0-9+#&'-]{2,}/g) || [];
    const counts = {};
    for (const raw of words) {
      const t = normalizeToken(raw);
      if (!t || STOP.has(t) || /^\d+$/.test(t) || t.length < 3 || t.length > 32) continue;
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }

  function addCounts(source, counts, multiplier = 1) {
    const weight = (SOURCE_META[source]?.weight || 1) * multiplier;
    state.sources[source] = state.sources[source] || { events: 0, terms: {} };
    Object.entries(counts).forEach(([term, count]) => {
      const weighted = count * weight;
      state.terms[term] = (state.terms[term] || 0) + weighted;
      state.sources[source].terms[term] = (state.sources[source].terms[term] || 0) + weighted;
      state.sources[source].events += count;
    });
  }

  function addManualSeeds() {
    const input = document.getElementById("seedInput");
    if (!input) return;
    const chunks = input.value.split(/[,;]+/).map(normalizeToken).filter(Boolean);
    const counts = {};
    chunks.forEach(chunk => {
      counts[chunk] = (counts[chunk] || 0) + 4;
      chunk.split(/\s+/).forEach(t => { if (!STOP.has(t) && t.length > 2) counts[t] = (counts[t] || 0) + 1; });
    });
    addCounts("manual", counts, 1.4);
    saveState();
  }

  function flattenJson(value, out = []) {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach(v => flattenJson(v, out));
    else if (value && typeof value === "object") Object.values(value).forEach(v => flattenJson(v, out));
    return out;
  }

  async function fileToTexts(file) {
    if (file.name.toLowerCase().endsWith(".zip") && window.JSZip) {
      const zip = await JSZip.loadAsync(file);
      const texts = [];
      const entries = Object.values(zip.files).filter(f => !f.dir && /\.(json|csv|txt|html|htm)$/i.test(f.name));
      for (const entry of entries.slice(0, 120)) {
        if (entry._data && entry._data.uncompressedSize > 8_000_000) continue;
        const body = await entry.async("string");
        texts.push(...parseBody(body, entry.name));
      }
      return texts;
    }
    const body = await file.text();
    return parseBody(body, file.name);
  }

  function parseBody(body, name) {
    if (/\.json$/i.test(name)) {
      try { return flattenJson(JSON.parse(body)); } catch (_) {}
    }
    return [body];
  }

  async function importFiles(source, files) {
    let aggregate = {};
    let textBlocks = 0;
    for (const file of files) {
      const texts = await fileToTexts(file);
      for (const text of texts) {
        textBlocks++;
        const counts = extractTerms(text);
        for (const [term, count] of Object.entries(counts)) aggregate[term] = (aggregate[term] || 0) + count;
      }
    }
    addCounts(source, aggregate);
    saveState();
    renderAll();
    const card = document.querySelector(`[data-source-card="${source}"]`);
    if (card) {
      card.classList.add("is-loaded");
      const status = card.querySelector(".source-status");
      if (status) status.textContent = `${Object.keys(aggregate).length.toLocaleString()} signals parsed locally`;
    }
    toast(`${SOURCE_META[source].label}: ${Object.keys(aggregate).length} taste signals added`);
    return textBlocks;
  }

  function topTerms(limit = 18) {
    return Object.entries(state.terms)
      .sort((a,b) => b[1]-a[1])
      .slice(0, limit)
      .map(([term, score]) => ({ term, score }));
  }

  function sourceTopTerms(source, limit = 3) {
    return Object.entries(state.sources[source]?.terms || {})
      .sort((a,b) => b[1]-a[1]).slice(0,limit).map(([t])=>t);
  }

  function scoreRecommendation(item, ranked) {
    const rankMap = new Map(ranked.map((x, i) => [x.term, {score:x.score, rank:i}]));
    let affinity = 0;
    const matches = [];
    for (const tag of item.tags) {
      const normalized = normalizeToken(tag);
      if (rankMap.has(normalized)) {
        const m = rankMap.get(normalized);
        affinity += 22 + Math.max(0, 18 - m.rank);
        matches.push(normalized);
      } else {
        const pieces = normalized.split(" ");
        const found = pieces.find(p => rankMap.has(p));
        if (found) {
          affinity += 10;
          if (!matches.includes(found)) matches.push(found);
        }
      }
    }
    const novelty = Math.max(8, 34 - matches.length * 7);
    const score = Math.min(99, Math.round(48 + affinity/2 + novelty/3));
    return { ...item, score, matches: matches.slice(0,4), novelty };
  }

  function makeLinks(title, kind) {
    const q = encodeURIComponent(title);
    const links = [
      ["YouTube", `https://www.youtube.com/results?search_query=${q}`],
      ["Google", `https://www.google.com/search?q=${q}`],
      ["Instagram", `https://www.instagram.com/explore/search/keyword/?q=${q}`]
    ];
    if (/place|restaurant|cafe|travel|retail/i.test(kind)) links.unshift(["Maps", `https://www.google.com/maps/search/?api=1&query=${q}`]);
    return links.slice(0,4);
  }

  function evidenceFor(item) {
    const evidence = [];
    for (const [source] of Object.entries(state.sources)) {
      const tops = sourceTopTerms(source, 12);
      const matched = item.tags.find(tag => tops.includes(normalizeToken(tag)) || normalizeToken(tag).split(" ").some(p => tops.includes(p)));
      if (matched) evidence.push(`${SOURCE_META[source].label}: ${matched}`);
    }
    return evidence.slice(0,3);
  }

  function renderSignalCloud() {
    const root = document.getElementById("signalTags");
    if (!root) return;
    const terms = topTerms(22);
    root.innerHTML = terms.length ? terms.map(({term,score}) => `<span class="signal-tag">${escapeHtml(term)} <strong>${Math.round(score)}</strong></span>`).join("") : `<span class="signal-note">Import activity or use your typed interests to build this profile.</span>`;
  }

  function renderSourceMix() {
    const root = document.getElementById("sourceBars");
    if (!root) return;
    const rows = Object.entries(state.sources).map(([key,val])=>({key, label:SOURCE_META[key]?.label||key, events:val.events||0})).sort((a,b)=>b.events-a.events);
    const max = Math.max(1, ...rows.map(r=>r.events));
    root.innerHTML = rows.length ? rows.map(r => `<div class="source-bar-row"><span>${escapeHtml(r.label)}</span><div class="source-bar-track"><i style="width:${Math.max(4,Math.round(r.events/max*100))}%"></i></div><strong>${r.events > 999 ? Math.round(r.events/1000)+"k" : r.events}</strong></div>`).join("") : `<span class="signal-note">No connected signals yet.</span>`;
  }

  function renderCards() {
    document.querySelectorAll("[data-source-card]").forEach(card => {
      const source = card.dataset.sourceCard;
      const info = state.sources[source];
      card.classList.toggle("is-loaded", !!info?.events);
      const status = card.querySelector(".source-status");
      if (status && info?.events) status.textContent = `${info.events.toLocaleString()} events represented`;
    });
  }

  function renderFeed() {
    const root = document.getElementById("personalFeedGrid");
    if (!root) return;
    const ranked = topTerms(60);
    if (!ranked.length) {
      root.innerHTML = `<div class="empty-feed">Add your interests or import a history/following export. The recommendations will explain which signals led to each suggestion.</div>`;
      return;
    }
    const scored = CATALOG.map(item => scoreRecommendation(item, ranked)).sort((a,b)=>b.score-a.score).slice(0,8);
    root.innerHTML = scored.map(item => {
      const ev = evidenceFor(item);
      const evidence = [...new Set([...item.matches.map(m=>`signal: ${m}`), ...ev])].slice(0,4);
      return `<article class="feed-card">
        <span class="feed-card-kicker">${escapeHtml(item.kind)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.why)}</p>
        <div class="feed-evidence">${evidence.map(e=>`<span>${escapeHtml(e)}</span>`).join("")}</div>
        <div class="feed-score"><div><strong>${item.score}</strong><small>TASTE FIT</small></div><div><strong>${Math.round(item.novelty)}</strong><small>NOVELTY</small></div></div>
        <div class="feed-links">${makeLinks(item.title,item.kind).map(([label,url])=>`<a href="${url}" target="_blank" rel="noopener">${label} ↗</a>`).join("")}</div>
      </article>`;
    }).join("");
  }

  function renderAll() { renderSignalCloud(); renderSourceMix(); renderCards(); renderFeed(); }

  function demoData() {
    const samples = {
      google: "Barragan house Mexico City brutalist interiors textile archives vintage Porsche Kerala craft hotels Japanese ceramics natural wine restaurant design",
      youtube: "film photography Contax T2 darkroom printing Sofia Coppola costume design jazz kissa Tokyo architecture documentary fashion archive",
      social: "Apartamento Paloma Wool Bode Laila Gohar MUBI The Row Gimaguas Loewe Casa Bosques Tenderbooks",
      places: "Dimes Via Carota Bar Pisellino Contramar design bookstore coffee matcha listening bar museum gallery West Village Mexico City Tokyo",
      browser: "hotel stationery magazine archive independent bookstores ceramics food packaging boutique hotels artist residency"
    };
    Object.entries(samples).forEach(([source,text]) => addCounts(source, extractTerms(text), 5));
    addManualSeeds();
    saveState();
    renderAll();
    toast("Demo behavioral profile loaded");
  }

  function clearData() {
    state.terms = {}; state.sources = {}; state.importedAt = null;
    localStorage.removeItem(STORAGE_KEY);
    renderAll();
    toast("Local taste signals cleared");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  }

  function toast(message) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-visible");
    setTimeout(()=>el.classList.remove("is-visible"), 2200);
  }

  function bind() {
    const input = document.getElementById("signalFileInput");
    document.querySelectorAll("[data-import-source]").forEach(button => button.addEventListener("click", () => {
      activeSource = button.dataset.importSource;
      input?.click();
    }));
    input?.addEventListener("change", async e => {
      const files = [...(e.target.files || [])];
      if (!files.length) return;
      try { await importFiles(activeSource, files); }
      catch (err) { console.error(err); toast("Could not parse that export. Try JSON, CSV, HTML, TXT or ZIP."); }
      input.value = "";
    });

    document.getElementById("analyzeSignals")?.addEventListener("click", () => { addManualSeeds(); renderAll(); toast("Typed interests added to your behavioral profile"); });
    document.getElementById("demoSignals")?.addEventListener("click", demoData);
    document.getElementById("clearSignals")?.addEventListener("click", clearData);
    document.getElementById("refreshFeed")?.addEventListener("click", () => { addManualSeeds(); renderFeed(); toast("Recommendations refreshed"); });
    document.getElementById("seedForm")?.addEventListener("submit", () => setTimeout(() => { addManualSeeds(); renderAll(); }, 0));
  }

  bind();
  if (!Object.keys(state.terms).length) addManualSeeds();
  renderAll();
})();
