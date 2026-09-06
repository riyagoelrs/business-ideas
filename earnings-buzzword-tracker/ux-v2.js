/* SignalCall UX v3 — ticker first, watchlist driven, auto-populated narratives. */
(function () {
  const API_BASE = "https://earningscalls.dev/api/v1";
  const WATCH_KEY = "signalcall-watchlist-v1";
  const DEFAULT_NARRATIVES = ["AI", "demand", "pricing", "margin", "consumer pressure", "tariffs"];
  const NARRATIVE_CATALOG = [
    "AI","artificial intelligence","data center","inference","cloud","capex","advertising","engagement",
    "consumer pressure","consumer spending","traffic","pricing","promotions","value","inventory","tariffs",
    "China","supply chain","supply","demand","capacity","labor","wages","inflation","margin","margins",
    "GLP-1","obesity","credit","delinquencies","rates","deposits","capital","housing","mortgage",
    "wholesale","direct-to-consumer","e-commerce","subscription","revenue growth","free cash flow"
  ];
  const TICKER_HINTS = {
    NVDA:["AI","data center","inference","demand","supply","China"],
    META:["AI","advertising","capex","data center","engagement","demand"],
    MSFT:["AI","cloud","data center","capex","demand","margin"],
    AMZN:["AI","cloud","consumer spending","pricing","advertising","capex"],
    GOOGL:["AI","advertising","cloud","capex","data center","engagement"],
    AAPL:["AI","China","consumer spending","pricing","supply chain","demand"],
    TSLA:["pricing","demand","margin","China","capacity","AI"],
    WMT:["consumer pressure","tariffs","pricing","inventory","labor","traffic"],
    TGT:["consumer pressure","pricing","inventory","promotions","traffic","tariffs"],
    COST:["consumer spending","pricing","traffic","inventory","labor","tariffs"],
    NKE:["consumer pressure","tariffs","inventory","China","pricing","wholesale"],
    MCD:["consumer pressure","pricing","traffic","value","labor","inflation"],
    SBUX:["traffic","consumer pressure","pricing","labor","China","demand"],
    LLY:["GLP-1","obesity","capacity","demand","pricing","supply"],
    NVO:["GLP-1","obesity","capacity","demand","pricing","supply"],
    JPM:["AI","consumer pressure","credit","deposits","capital","rates"],
    BAC:["consumer pressure","credit","deposits","capital","rates","AI"],
    GS:["capital","rates","AI","credit","demand","margin"],
    HD:["consumer pressure","housing","pricing","inventory","demand","tariffs"],
    LOW:["consumer pressure","housing","pricing","inventory","demand","tariffs"]
  };

  let watchlist = loadWatchlist();
  let watchlistOnly = false;

  function boot() {
    addTickerFirstExperience();
    restructureExistingControls();
    addCallLimitControl();
    replaceLiveHandler();
    upgradeHeatmap();
    addStyles();
    if (typeof setMode === "function") setMode("live");
    renderWatchlist();
    updateSuggestions("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function addTickerFirstExperience() {
    const hero = document.querySelector(".hero");
    if (!hero || document.getElementById("tickerFirst")) return;
    const section = document.createElement("section");
    section.id = "tickerFirst";
    section.className = "ticker-first";
    section.innerHTML = `
      <div class="ticker-first-copy">
        <p class="eyebrow">START WITH A COMPANY</p>
        <h1>Enter a ticker.</h1>
        <p>SignalCall will pull recent earnings calls, identify the narratives that matter, and populate the dashboard automatically.</p>
      </div>
      <form id="tickerLaunchForm" class="ticker-launch" novalidate>
        <div class="ticker-input-wrap">
          <span class="ticker-prefix">$</span>
          <input id="tickerLaunchInput" inputmode="text" autocomplete="off" spellcheck="false" maxlength="10" placeholder="NVDA" aria-label="Ticker symbol" />
        </div>
        <button class="primary-button ticker-analyze" type="submit">Analyze company →</button>
        <button id="addTickerWatch" class="secondary-button ticker-watch-add" type="button">+ Add to watchlist</button>
      </form>
      <p id="tickerLaunchMessage" class="ticker-launch-message" aria-live="polite">Try NVDA, WMT, NKE, LLY, JPM, or any public-company ticker.</p>

      <div class="watchlist-builder">
        <div class="watchlist-title">
          <div><p class="eyebrow">CREATE A WATCHLIST</p><h2>Your companies</h2></div>
          <button id="analyzeWatchlist" class="mini-button" type="button">Analyze watchlist</button>
        </div>
        <div id="watchlistChips" class="watchlist-chips"></div>
        <p id="watchlistEmpty" class="watchlist-empty">Save companies here, then analyze the whole group in one click.</p>
      </div>

      <div class="auto-narratives">
        <div class="auto-narrative-copy">
          <p class="eyebrow">AUTO-SELECTED NARRATIVES</p>
          <strong id="narrativeLabel">Enter a ticker to see suggested themes</strong>
        </div>
        <div id="autoNarrativeChips" class="auto-narrative-chips"></div>
        <small>These suggestions update again after SignalCall reads the actual transcripts.</small>
      </div>

      <div class="ticker-first-footer">
        <span>Transcript source: EarningsCalls.dev</span>
        <button id="openDataSettings" class="text-button" type="button">Data access & settings ↓</button>
      </div>
    `;
    hero.insertAdjacentElement("beforebegin", section);

    const input = section.querySelector("#tickerLaunchInput");
    input.addEventListener("input", () => {
      input.value = cleanTicker(input.value);
      updateSuggestions(input.value);
    });
    section.querySelector("#tickerLaunchForm").addEventListener("submit", e => {
      e.preventDefault();
      analyzeSingle(input.value);
    });
    section.querySelector("#addTickerWatch").addEventListener("click", () => addToWatchlist(input.value));
    section.querySelector("#analyzeWatchlist").addEventListener("click", analyzeSavedWatchlist);
    section.querySelector("#openDataSettings").addEventListener("click", () => revealDataSettings());
  }

  function restructureExistingControls() {
    const hero = document.querySelector(".hero");
    if (hero) hero.classList.add("product-context-hero");
    const howTo = document.getElementById("howToUse");
    if (howTo) howTo.remove();
    const panel = document.querySelector(".control-panel");
    if (!panel || document.getElementById("dataSettings")) return;
    const details = document.createElement("details");
    details.id = "dataSettings";
    details.className = "data-settings";
    details.innerHTML = `<summary><span><strong>Data access & advanced settings</strong><small>Date range, transcript API, manual terms, demo and paste/upload fallback</small></span><b>+</b></summary>`;
    panel.parentNode.insertBefore(details, panel);
    details.appendChild(panel);
    const termHead = panel.querySelector(".term-head h3");
    if (termHead) termHead.textContent = "Override the auto-selected narratives.";
    const note = document.getElementById("termLimitNote");
    if (note) note.textContent = "Optional: edit the terms manually. By default SignalCall chooses narratives from the company and transcript language.";
  }

  function addCallLimitControl() {
    if (document.getElementById("callsPerCompany")) return;
    const dateTo = document.getElementById("dateTo");
    const label = dateTo?.closest("label.field");
    if (!label) return;
    const field = document.createElement("label");
    field.className = "field";
    field.innerHTML = `<span>Calls per company</span><select id="callsPerCompany"><option value="2">Latest 2</option><option value="4" selected>Latest 4</option><option value="6">Latest 6</option><option value="8">Latest 8</option></select><small>Within the selected date range.</small>`;
    label.insertAdjacentElement("afterend", field);
  }

  function replaceLiveHandler() {
    const old = document.getElementById("runLive");
    if (!old) return;
    const fresh = old.cloneNode(true);
    fresh.textContent = "Pull & analyze transcripts";
    old.replaceWith(fresh);
    if (typeof els === "object" && els) els.runLive = fresh;
    fresh.addEventListener("click", runAutoPull);
  }

  function cleanTicker(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 10);
  }

  function getSuggestedTerms(tickers) {
    const list = Array.isArray(tickers) ? tickers : [tickers];
    const scores = new Map();
    list.filter(Boolean).forEach(ticker => {
      const terms = TICKER_HINTS[ticker] || DEFAULT_NARRATIVES;
      terms.forEach((term, i) => scores.set(term, (scores.get(term) || 0) + (terms.length - i)));
    });
    const ranked = [...scores.entries()].sort((a,b) => b[1] - a[1]).map(([term]) => term);
    return (ranked.length ? ranked : DEFAULT_NARRATIVES).slice(0, 6);
  }

  function updateSuggestions(tickerOrTickers) {
    const tickers = Array.isArray(tickerOrTickers) ? tickerOrTickers : tickerOrTickers ? [cleanTicker(tickerOrTickers)] : [];
    const terms = getSuggestedTerms(tickers);
    const holder = document.getElementById("autoNarrativeChips");
    const label = document.getElementById("narrativeLabel");
    if (!holder || !label) return;
    holder.innerHTML = terms.map(t => `<span>${escapeMini(t)}</span>`).join("");
    label.textContent = tickers.length ? `Suggested for ${tickers.join(", ")}` : "Enter a ticker to see suggested themes";
  }

  function syncTerms(terms, transcriptDerived = false) {
    if (typeof state !== "undefined" && Array.isArray(state.terms)) {
      const wanted = new Set(terms.map(t => t.toLowerCase()));
      state.terms.forEach(item => { item.selected = wanted.has(item.name.toLowerCase()); });
      terms.forEach(name => {
        if (!state.terms.some(item => item.name.toLowerCase() === name.toLowerCase())) state.terms.push({ name, selected: true });
      });
      if (typeof renderTerms === "function") renderTerms();
    }
    const holder = document.getElementById("autoNarrativeChips");
    const label = document.getElementById("narrativeLabel");
    if (holder) holder.innerHTML = terms.map(t => `<span>${escapeMini(t)}</span>`).join("");
    if (label) label.textContent = transcriptDerived ? "Selected from transcript language" : "Suggested from your company selection";
  }

  function analyzeSingle(rawTicker) {
    const ticker = cleanTicker(rawTicker);
    if (!ticker) return launchMessage("Enter a ticker first, for example NVDA.", true);
    const live = document.getElementById("liveTickers");
    if (live) live.value = ticker;
    const suggested = getSuggestedTerms([ticker]);
    syncTerms(suggested);
    updateSuggestions([ticker]);
    launchMessage(`Ready to analyze ${ticker}.`);
    startLiveRun();
  }

  function addToWatchlist(rawTicker) {
    const ticker = cleanTicker(rawTicker);
    if (!ticker) return launchMessage("Enter a ticker before adding it to your watchlist.", true);
    if (!watchlist.includes(ticker)) watchlist.push(ticker);
    watchlist = watchlist.slice(0, 20);
    saveWatchlist();
    renderWatchlist();
    launchMessage(`${ticker} added to your watchlist.`);
  }

  function analyzeSavedWatchlist() {
    if (!watchlist.length) return launchMessage("Add at least one company to your watchlist first.", true);
    const live = document.getElementById("liveTickers");
    if (live) live.value = watchlist.join(",");
    const suggested = getSuggestedTerms(watchlist);
    syncTerms(suggested);
    updateSuggestions(watchlist);
    launchMessage(`Ready to analyze ${watchlist.length} watchlist compan${watchlist.length === 1 ? "y" : "ies"}.`);
    startLiveRun();
  }

  function startLiveRun() {
    const key = document.getElementById("apiKey")?.value.trim();
    if (!key) return revealDataSettings("Connect transcript access once, then the ticker-first workflow will run automatically.");
    document.getElementById("runLive")?.click();
  }

  function revealDataSettings(message) {
    const details = document.getElementById("dataSettings");
    if (details) details.open = true;
    if (message) {
      const err = document.getElementById("liveError");
      if (err) err.textContent = message;
      launchMessage(message, true);
    }
    details?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => document.getElementById("apiKey")?.focus({ preventScroll: true }), 350);
  }

  function launchMessage(text, error) {
    const el = document.getElementById("tickerLaunchMessage");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("is-error", !!error);
  }

  function loadWatchlist() {
    try {
      const raw = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
      return Array.isArray(raw) ? raw.map(cleanTicker).filter(Boolean).slice(0,20) : [];
    } catch (_) { return []; }
  }
  function saveWatchlist() { try { localStorage.setItem(WATCH_KEY, JSON.stringify(watchlist)); } catch (_) {} }

  function renderWatchlist() {
    const holder = document.getElementById("watchlistChips");
    const empty = document.getElementById("watchlistEmpty");
    const analyze = document.getElementById("analyzeWatchlist");
    if (!holder) return;
    holder.innerHTML = "";
    watchlist.forEach(ticker => {
      const chip = document.createElement("div");
      chip.className = "watchlist-chip";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "watchlist-open";
      open.textContent = ticker;
      open.title = `Analyze ${ticker}`;
      open.addEventListener("click", () => {
        const input = document.getElementById("tickerLaunchInput");
        if (input) input.value = ticker;
        analyzeSingle(ticker);
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "watchlist-remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${ticker} from watchlist`);
      remove.addEventListener("click", () => {
        watchlist = watchlist.filter(x => x !== ticker);
        saveWatchlist();
        renderWatchlist();
        if (typeof state !== "undefined" && state.dataset && typeof renderHeatmap === "function") renderHeatmap(state.dataset);
      });
      chip.append(open, remove);
      holder.appendChild(chip);
    });
    if (empty) empty.hidden = watchlist.length > 0;
    if (analyze) analyze.disabled = watchlist.length === 0;
    const toggle = document.getElementById("watchlistHeatmapToggle");
    if (toggle) toggle.textContent = `My watchlist (${watchlist.length})`;
  }

  async function runAutoPull() {
    const errorEl = document.getElementById("liveError");
    if (errorEl) errorEl.textContent = "";
    const apiKey = document.getElementById("apiKey")?.value.trim();
    const tickers = (document.getElementById("liveTickers")?.value || "").split(",").map(cleanTicker).filter(Boolean).slice(0,15);
    const dateFrom = document.getElementById("dateFrom")?.value;
    const dateTo = document.getElementById("dateTo")?.value;
    const callsPerCompany = Number(document.getElementById("callsPerCompany")?.value || 4);

    if (!apiKey) return revealDataSettings("Connect transcript access to run live analysis.");
    if (!tickers.length) return launchMessage("Enter at least one ticker.", true);
    if (!dateFrom || !dateTo || dateFrom > dateTo) return revealDataSettings("Choose a valid date range.");

    const histories = [];
    showProgressSafe("Finding earnings calls…", 0, tickers.length);
    try {
      for (let i=0; i<tickers.length; i++) {
        const ticker = tickers[i];
        showProgressSafe(`Finding ${ticker} calls…`, i, tickers.length);
        const payload = await apiGet(`/companies/ticker/${encodeURIComponent(ticker)}`, apiKey);
        const data = payload?.data ?? payload ?? {};
        const calls = Array.isArray(data.earnings_calls) ? data.earnings_calls : Array.isArray(data.calls) ? data.calls : [];
        histories.push(...calls.map(c => normalizeCall(c,ticker)).filter(c => c.id && c.date && c.date >= dateFrom && c.date <= dateTo).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,callsPerCompany));
      }
      if (!histories.length) throw new Error("No earnings calls were found for those tickers in the selected date range.");

      const transcripts = [];
      let previewOnly = 0;
      for (let i=0; i<histories.length; i++) {
        const call = histories[i];
        showProgressSafe(`Pulling ${call.ticker} · ${call.period} transcript…`, i, histories.length);
        const payload = await apiGet(`/transcripts/${call.id}?format=value`, apiKey);
        const text = extractTranscriptText(payload);
        if (text.length < 500) previewOnly += 1;
        if (text) transcripts.push({ ...call, text });
      }
      if (!transcripts.length) throw new Error("Calls were found, but no readable transcript text was returned.");

      const autoTerms = discoverNarratives(transcripts, tickers);
      syncTerms(autoTerms, true);
      const dataset = analyzePulledTranscripts(transcripts, autoTerms, tickers);
      hideProgressSafe();
      if (typeof setDataset === "function") setDataset(dataset);
      launchMessage(`Analyzed ${transcripts.length} calls across ${dataset.companies.length} compan${dataset.companies.length === 1 ? "y" : "ies"}.`);
      if (previewOnly && errorEl) {
        errorEl.className = "inline-error api-warning";
        errorEl.textContent = `${previewOnly} transcript${previewOnly===1?"":"s"} returned only a short preview. Full-text access improves the analysis.`;
      }
    } catch (err) {
      hideProgressSafe();
      const msg = normalizeApiError(err);
      if (errorEl) errorEl.textContent = msg;
      launchMessage(msg, true);
    }
  }

  function discoverNarratives(transcripts, tickers) {
    const corpus = transcripts.map(t=>t.text).join("\n");
    const totalWords = Math.max(1, (corpus.match(/\S+/g)||[]).length);
    const hints = new Set(getSuggestedTerms(tickers).map(t=>t.toLowerCase()));
    const ranked = NARRATIVE_CATALOG.map(term => {
      const count = countPhraseLocal(corpus,term);
      const density = count / totalWords * 10000;
      const hint = hints.has(term.toLowerCase()) ? 2.5 : 0;
      return {term,count,score:density + hint};
    }).filter(x=>x.count>0).sort((a,b)=>b.score-a.score || b.count-a.count);
    const unique=[];
    ranked.forEach(x=>{
      if (unique.length>=6) return;
      const low=x.term.toLowerCase();
      if (unique.some(t=>t.toLowerCase()===low || (low==="margin"&&t.toLowerCase()==="margins") || (low==="margins"&&t.toLowerCase()==="margin"))) return;
      unique.push(x.term);
    });
    return unique.length >= 4 ? unique : getSuggestedTerms(tickers);
  }

  function normalizeCall(call, fallbackTicker) {
    const rawDate = call.event_date_time || call.date || call.event_date || call.created_at || "";
    const date = String(rawDate).slice(0,10);
    return { id:call.id||call.earnings_call_id||call.earningsId||call.earnings_id, ticker:String(call.company_ticker||call.ticker||call.stock_symbol||fallbackTicker).split(":")[0].toUpperCase(), company:call.company_name||call.company||fallbackTicker, date, period:quarterLabel(date), title:call.transcript_title||call.title||"Earnings call" };
  }
  function extractTranscriptText(payload) {
    const data=payload?.data??payload??{};
    const direct=[data.transcript,data.transcript_text,data.text,data.text_content,data.content,data.value,payload?.transcript,payload?.text,payload?.value].find(v=>typeof v==="string"&&v.trim());
    if(direct) return direct.trim();
    const arrays=[data.segments,data.components,data.speakers,payload?.segments,payload?.components].filter(Array.isArray);
    for(const arr of arrays){const joined=arr.map(x=>x?.text_content||x?.text||x?.content||x?.value||"").filter(Boolean).join("\n\n"); if(joined.trim()) return joined.trim();}
    if(Array.isArray(data)){const joined=data.map(x=>x?.text_content||x?.text||x?.content||"").filter(Boolean).join("\n\n"); if(joined.trim()) return joined.trim();}
    return "";
  }
  function analyzePulledTranscripts(transcripts,terms,requestedTickers){
    const periods=[...new Set(transcripts.map(t=>t.period))].sort(periodCompare);
    const companies=[...new Set(transcripts.map(t=>t.ticker))];
    const series=Object.fromEntries(terms.map(term=>[term,periods.map(()=>0)]));
    const latestByCompany=Object.fromEntries(companies.map(c=>[c,Object.fromEntries(terms.map(t=>[t,0]))]));
    const latestDate={}; const excerpts=[];
    transcripts.forEach(t=>{if(!latestDate[t.ticker]||t.date>latestDate[t.ticker]) latestDate[t.ticker]=t.date;});
    transcripts.forEach(call=>{const p=periods.indexOf(call.period);terms.forEach(term=>{const count=countPhraseLocal(call.text,term);if(p>=0)series[term][p]+=count;if(call.date===latestDate[call.ticker])latestByCompany[call.ticker][term]+=count;if(count>0){const text=extractSnippetLocal(call.text,term);if(text)excerpts.push({ticker:call.ticker,period:call.period,term,speaker:"Transcript",text});}});});
    return {source:"live",terms,periods,companies:companies.length?companies:requestedTickers,callsAnalyzed:transcripts.length,series,latestByCompany,excerpts:dedupeLocal(excerpts).slice(0,40)};
  }
  async function apiGet(path,key){const r=await fetch(`${API_BASE}${path}`,{headers:{"X-API-Key":key,"Accept":"application/json"}});let p={};try{p=await r.json();}catch(_){}if(!r.ok)throw new Error(String(p?.message||p?.detail||p?.error||`Transcript API returned ${r.status}.`));return p;}
  function countPhraseLocal(text,term){const e=String(term).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return(String(text).match(new RegExp(e,"gi"))||[]).length;}
  function extractSnippetLocal(text,term){const c=String(text).replace(/\s+/g," ").trim();const i=c.toLowerCase().indexOf(String(term).toLowerCase());if(i<0)return"";let s=Math.max(0,i-145),e=Math.min(c.length,i+String(term).length+230);const l=c.lastIndexOf(". ",i),r=c.indexOf(". ",i+String(term).length);if(l>=0&&l>s-80)s=l+2;if(r>=0&&r<e+80)e=r+1;return`${s>0?"…":""}${c.slice(s,e).trim()}${e<c.length?"…":""}`;}
  function dedupeLocal(items){const seen=new Set();return items.filter(x=>{const k=`${x.ticker}|${x.period}|${x.term}|${x.text.slice(0,90)}`;if(seen.has(k))return false;seen.add(k);return true;});}
  function quarterLabel(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date||""))return date||"Unknown";const[y,m]=date.split("-").map(Number);return`${y} Q${Math.ceil(m/3)}`;}
  function periodCompare(a,b){const am=String(a).match(/(20\d{2}) Q([1-4])/),bm=String(b).match(/(20\d{2}) Q([1-4])/);if(am&&bm)return Number(am[1])*10+Number(am[2])-(Number(bm[1])*10+Number(bm[2]));return String(a).localeCompare(String(b));}
  function normalizeApiError(err){const m=String(err?.message||err||"Automatic transcript pull failed.");if(/failed to fetch/i.test(m))return"The browser could not reach the transcript API. Open Data access & settings to use the manual fallback.";if(/401|unauthor|api key/i.test(m))return"The transcript API rejected the key. Check that it is valid and active.";if(/403|plan|preview|upgrade|full access/i.test(m))return"The provider found the calls, but this API plan does not include full transcript access.";return m;}
  function showProgressSafe(label,done,total){if(typeof showProgress==="function")showProgress(label,done,total);}
  function hideProgressSafe(){if(typeof hideProgress==="function")hideProgress();}

  function upgradeHeatmap(){
    if(typeof renderHeatmap!=="function")return;
    renderHeatmap=function(dataset){
      const allCompanies=dataset.companies||[];
      const companies=watchlistOnly?allCompanies.filter(c=>watchlist.includes(c)):allCompanies;
      const terms=dataset.terms||Object.keys(dataset.series||{});
      if(els?.heatmapPeriod)els.heatmapPeriod.textContent=dataset.periods?.at(-1)||"Latest period";
      const map=els?.heatmap;if(!map)return;
      map.innerHTML="";map.style.gridTemplateColumns=`minmax(155px, 1.2fr) repeat(${terms.length}, minmax(86px, 1fr))`;
      const blank=document.createElement("div");blank.className="heatmap-cell heatmap-header";blank.textContent="Company";map.appendChild(blank);
      terms.forEach(term=>{const h=document.createElement("div");h.className="heatmap-cell heatmap-header";h.textContent=term;map.appendChild(h);});
      if(!companies.length){const empty=document.createElement("div");empty.className="heatmap-watch-empty";empty.style.gridColumn=`1 / span ${terms.length+1}`;empty.textContent="No analyzed companies are in your watchlist yet.";map.appendChild(empty);}
      companies.forEach(company=>{
        const cc=document.createElement("div");cc.className="heatmap-cell heatmap-company heatmap-company-watch";
        const name=document.createElement("strong");name.textContent=company;
        const btn=document.createElement("button");btn.type="button";btn.className=`row-watch${watchlist.includes(company)?" is-watching":""}`;btn.textContent=watchlist.includes(company)?"✓ Watching":"+ Watch";
        btn.addEventListener("click",()=>{if(watchlist.includes(company))watchlist=watchlist.filter(x=>x!==company);else watchlist=[...watchlist,company].slice(0,20);saveWatchlist();renderWatchlist();renderHeatmap(dataset);});
        cc.append(name,btn);map.appendChild(cc);
        terms.forEach(term=>{const value=Number(dataset.latestByCompany?.[company]?.[term]||0);const cell=document.createElement("div");cell.className=`heatmap-cell heat-${typeof heatLevel==="function"?heatLevel(value,dataset,term):0}`;cell.textContent=value;cell.title=`${company} · ${term}: ${value}`;map.appendChild(cell);});
      });
      addHeatmapFilter(dataset);
    };
  }
  function addHeatmapFilter(dataset){
    const panel=document.querySelector(".heatmap-panel");const head=panel?.querySelector(".panel-head");if(!head)return;
    let controls=document.getElementById("heatmapWatchControls");if(!controls){controls=document.createElement("div");controls.id="heatmapWatchControls";controls.className="heatmap-watch-controls";controls.innerHTML=`<button id="allCompaniesToggle" class="mini-button is-active" type="button">All companies</button><button id="watchlistHeatmapToggle" class="mini-button" type="button">My watchlist (${watchlist.length})</button>`;const period=document.getElementById("heatmapPeriod");period?.insertAdjacentElement("beforebegin",controls);controls.querySelector("#allCompaniesToggle").addEventListener("click",()=>{watchlistOnly=false;renderHeatmap(dataset);});controls.querySelector("#watchlistHeatmapToggle").addEventListener("click",()=>{watchlistOnly=true;renderHeatmap(dataset);});}
    controls.querySelector("#allCompaniesToggle")?.classList.toggle("is-active",!watchlistOnly);controls.querySelector("#watchlistHeatmapToggle")?.classList.toggle("is-active",watchlistOnly);const wt=controls.querySelector("#watchlistHeatmapToggle");if(wt)wt.textContent=`My watchlist (${watchlist.length})`;
  }

  function escapeMini(s){return String(s).replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));}
  function addStyles(){
    const style=document.createElement("style");style.textContent=`
      .ticker-first{padding:68px 0 28px;max-width:1040px;margin:0 auto}.ticker-first-copy{text-align:center}.ticker-first-copy h1{font-size:clamp(52px,7vw,92px);line-height:.95;letter-spacing:-.06em;margin:0}.ticker-first-copy>p:last-child{max-width:680px;margin:20px auto 0;color:var(--muted);font-size:17px;line-height:1.55}.ticker-launch{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;margin:34px auto 0;max-width:900px}.ticker-input-wrap{display:flex;align-items:center;border:1px solid var(--line);border-radius:14px;background:white;min-height:58px;overflow:hidden;box-shadow:0 10px 30px rgba(32,37,29,.06)}.ticker-prefix{font:600 18px "IBM Plex Mono",monospace;color:var(--muted);padding-left:17px}.ticker-input-wrap input{border:0;outline:0;background:transparent;width:100%;min-width:0;padding:15px 14px;font:600 22px "IBM Plex Mono",monospace;text-transform:uppercase;color:var(--ink)}.ticker-input-wrap input::placeholder{color:#b6bbb0}.ticker-analyze,.ticker-watch-add{min-height:58px;border-radius:14px}.ticker-launch-message{text-align:center;color:var(--muted);font-size:12px;margin:10px 0 0}.ticker-launch-message.is-error{color:var(--danger)}.watchlist-builder{margin:34px 0 0;border-top:1px solid var(--line);padding-top:25px}.watchlist-title{display:flex;align-items:end;justify-content:space-between;gap:16px}.watchlist-title h2{margin:0;font-size:20px}.watchlist-chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:15px}.watchlist-chip{display:inline-flex;align-items:center;border:1px solid var(--line);background:var(--paper);border-radius:999px;overflow:hidden}.watchlist-open,.watchlist-remove{border:0;background:transparent;cursor:pointer}.watchlist-open{padding:9px 4px 9px 13px;font:600 12px "IBM Plex Mono",monospace}.watchlist-remove{color:var(--muted);padding:9px 11px 9px 7px;font-size:17px;line-height:1}.watchlist-empty{color:var(--muted);font-size:12px;margin:12px 0 0}.auto-narratives{display:grid;grid-template-columns:minmax(180px,.7fr) minmax(0,1.3fr);gap:18px;align-items:center;margin-top:20px;padding:17px 18px;border:1px solid var(--line);background:#f8f9f5;border-radius:14px}.auto-narrative-copy strong{font-size:13px}.auto-narrative-chips{display:flex;flex-wrap:wrap;gap:7px}.auto-narrative-chips span{background:var(--charcoal);color:var(--accent);border-radius:999px;padding:7px 10px;font:600 10px "IBM Plex Mono",monospace}.auto-narratives>small{grid-column:2;color:var(--muted);font-size:10px}.ticker-first-footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px;color:var(--muted);font-size:11px}.product-context-hero{display:none}.data-settings{margin:18px 0}.data-settings>summary{list-style:none;cursor:pointer;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}.data-settings>summary::-webkit-details-marker{display:none}.data-settings>summary span strong,.data-settings>summary span small{display:block}.data-settings>summary span small{color:var(--muted);font-size:10px;margin-top:3px}.data-settings>summary b{font-size:20px}.data-settings[open]>summary{border-radius:14px 14px 0 0}.data-settings[open] .control-panel{border-top:0;border-radius:0 0 20px 20px;box-shadow:none}.heatmap-watch-controls{display:flex;gap:7px;margin-left:auto}.heatmap-watch-controls .mini-button.is-active{background:var(--charcoal);color:var(--accent);border-color:var(--charcoal)}.heatmap-company-watch{justify-content:space-between;gap:8px}.heatmap-company-watch strong{font-size:12px}.row-watch{border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:9px;font-weight:700;padding:5px 6px;border-radius:999px}.row-watch.is-watching{background:var(--charcoal);color:var(--accent)}.heatmap-watch-empty{padding:24px;color:var(--muted);font-size:12px;text-align:center;border:1px dashed var(--line);border-radius:10px}.api-warning{color:#8a6d16!important}
      @media(max-width:760px){.ticker-first{padding-top:38px}.ticker-launch{grid-template-columns:1fr 1fr}.ticker-input-wrap{grid-column:1/-1}.ticker-analyze,.ticker-watch-add{width:100%}.auto-narratives{grid-template-columns:1fr}.auto-narratives>small{grid-column:1}.ticker-first-footer{align-items:flex-start;gap:12px}.watchlist-title{align-items:center}.heatmap-watch-controls{width:100%;order:3}.heatmap-panel .panel-head{flex-wrap:wrap}}
      @media(max-width:480px){.ticker-launch{grid-template-columns:1fr}.ticker-input-wrap{grid-column:auto}.ticker-first-copy h1{font-size:52px}.ticker-first-footer{flex-direction:column}.watchlist-title{align-items:flex-start;flex-direction:column}.watchlist-title .mini-button{width:100%}}
    `;document.head.appendChild(style);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();