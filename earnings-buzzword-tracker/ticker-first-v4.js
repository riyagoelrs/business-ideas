/* SignalCall ticker-first v4: one editable input, one preview flow, no credential routing. */
(function () {
  const WATCH_KEY = "signalcall-watchlist-v1";
  const DEFAULT_TERMS = ["AI", "demand", "pricing", "margin", "consumer pressure", "tariffs"];
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
    LOW:["consumer pressure","housing","pricing","inventory","demand","tariffs"],
    BROS:["traffic","pricing","consumer spending","labor","margin","demand"],
    CAVA:["traffic","pricing","consumer spending","labor","margin","demand"],
    CELH:["demand","inventory","pricing","consumer spending","margin","distribution"]
  };

  function cleanTicker(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 10);
  }

  function loadWatchlist() {
    try {
      const parsed = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(cleanTicker).filter(Boolean).slice(0, 20) : [];
    } catch (_) { return []; }
  }

  function saveWatchlist(list) {
    try { localStorage.setItem(WATCH_KEY, JSON.stringify(list.slice(0, 20))); } catch (_) {}
  }

  function suggestedTerms(tickers) {
    const scores = new Map();
    tickers.forEach(ticker => {
      const terms = TICKER_HINTS[ticker] || DEFAULT_TERMS;
      terms.forEach((term, index) => scores.set(term, (scores.get(term) || 0) + (terms.length - index)));
    });
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([term]) => term);
    return (ranked.length ? ranked : DEFAULT_TERMS).slice(0, 6);
  }

  function hash(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0);
  }

  function buildSeries(ticker, term, count) {
    const seed = hash(`${ticker}|${term}`);
    const latest = 2 + (seed % 15);
    const growthOptions = [-0.12, -0.05, 0.06, 0.12, 0.2, 0.29];
    const growth = growthOptions[seed % growthOptions.length];
    const values = [];
    for (let i = 0; i < count; i++) {
      const back = count - 1 - i;
      const base = latest / Math.pow(Math.max(0.58, 1 + growth), back);
      const jitter = (hash(`${ticker}|${term}|${i}`) % 3) - 1;
      values.push(Math.max(0, Math.round(base + jitter)));
    }
    values[count - 1] = latest;
    return values;
  }

  function buildPreview(tickers) {
    const periods = ["2025 Q1", "2025 Q2", "2025 Q3", "2025 Q4", "2026 Q1", "2026 Q2"];
    const terms = suggestedTerms(tickers);
    const latestByCompany = {};
    const companySeries = {};

    tickers.forEach(ticker => {
      latestByCompany[ticker] = {};
      companySeries[ticker] = {};
      terms.forEach(term => {
        const values = buildSeries(ticker, term, periods.length);
        companySeries[ticker][term] = values;
        latestByCompany[ticker][term] = values.at(-1) || 0;
      });
    });

    const series = Object.fromEntries(terms.map(term => [
      term,
      periods.map((_, i) => tickers.reduce((sum, ticker) => sum + Number(companySeries[ticker][term][i] || 0), 0))
    ]));

    return {
      source: "preview",
      terms,
      periods,
      companies: tickers,
      callsAnalyzed: tickers.length * periods.length,
      series,
      latestByCompany,
      excerpts: []
    };
  }

  function syncGlobalTerms(terms) {
    try {
      if (typeof state !== "undefined" && Array.isArray(state.terms)) {
        const wanted = new Set(terms.map(t => t.toLowerCase()));
        state.terms.forEach(item => { item.selected = wanted.has(item.name.toLowerCase()); });
        terms.forEach(name => {
          if (!state.terms.some(item => item.name.toLowerCase() === name.toLowerCase())) state.terms.push({ name, selected: true });
        });
        if (typeof renderTerms === "function") renderTerms();
      }
    } catch (_) {}
  }

  function renderPreview(tickers) {
    const clean = [...new Set(tickers.map(cleanTicker).filter(Boolean))].slice(0, 15);
    if (!clean.length) return setMessage("Enter a ticker first, for example NVDA.", true);
    const dataset = buildPreview(clean);
    syncGlobalTerms(dataset.terms);
    if (typeof setDataset === "function") setDataset(dataset);

    const status = document.getElementById("sourceStatus");
    if (status) status.textContent = "Illustrative preview";
    const metricSub = document.getElementById("metricCallsSub");
    if (metricSub) metricSub.textContent = `preview · ${clean.length} ${clean.length === 1 ? "company" : "companies"}`;
    const excerptTitle = document.querySelector(".excerpts-panel .panel-head h2");
    if (excerptTitle) excerptTitle.textContent = "Transcript excerpts appear with live data.";
    const excerptList = document.getElementById("excerptList");
    if (excerptList) excerptList.innerHTML = '<p class="empty-note">Preview mode does not fabricate management quotes. Live excerpts will appear once a transcript backend is connected.</p>';
    setMessage(`Preview generated for ${clean.join(", ")}.`, false);
  }

  function setMessage(text, error) {
    const el = document.getElementById("tickerLaunchMessageV4");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("is-error", !!error);
  }

  function renderWatchlist() {
    const holder = document.getElementById("watchlistChipsV4");
    const empty = document.getElementById("watchlistEmptyV4");
    const analyze = document.getElementById("analyzeWatchlistV4");
    if (!holder) return;
    const list = loadWatchlist();
    holder.innerHTML = "";
    list.forEach(ticker => {
      const chip = document.createElement("div");
      chip.className = "watchlist-chip";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "watchlist-open";
      open.textContent = ticker;
      open.addEventListener("click", () => {
        const input = document.getElementById("tickerInputV4");
        if (input) { input.value = ticker; input.focus(); }
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "watchlist-remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${ticker}`);
      remove.addEventListener("click", () => {
        saveWatchlist(loadWatchlist().filter(item => item !== ticker));
        renderWatchlist();
      });
      chip.append(open, remove);
      holder.appendChild(chip);
    });
    if (empty) empty.hidden = list.length > 0;
    if (analyze) analyze.disabled = list.length === 0;
  }

  function mount() {
    document.getElementById("tickerFirst")?.remove();
    const oldDetails = document.getElementById("dataSettings");
    if (oldDetails) oldDetails.style.display = "none";
    const oldPanel = document.querySelector(".control-panel");
    if (oldPanel && !oldDetails) oldPanel.style.display = "none";

    const main = document.getElementById("top");
    const hero = document.querySelector(".hero");
    if (!main || !hero || document.getElementById("tickerFirstV4")) return;

    const section = document.createElement("section");
    section.id = "tickerFirstV4";
    section.className = "ticker-first ticker-first-v4";
    section.innerHTML = `
      <div class="ticker-first-copy">
        <p class="eyebrow">START WITH A COMPANY</p>
        <h1>Enter a ticker.</h1>
        <p>SignalCall builds the narrative view automatically from your company selection.</p>
      </div>
      <form id="tickerFormV4" class="ticker-launch" autocomplete="off">
        <div class="ticker-input-wrap">
          <span class="ticker-prefix">$</span>
          <input id="tickerInputV4" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="10" placeholder="NVDA" aria-label="Ticker symbol" />
        </div>
        <button class="primary-button ticker-analyze" type="submit">Analyze company →</button>
        <button id="addWatchV4" class="secondary-button ticker-watch-add" type="button">+ Add to watchlist</button>
      </form>
      <p id="tickerLaunchMessageV4" class="ticker-launch-message" aria-live="polite">Type any ticker, then analyze it or save it to your watchlist.</p>
      <div class="watchlist-builder">
        <div class="watchlist-title">
          <div><p class="eyebrow">CREATE A WATCHLIST</p><h2>Your companies</h2></div>
          <button id="analyzeWatchlistV4" class="mini-button" type="button">Analyze watchlist</button>
        </div>
        <div id="watchlistChipsV4" class="watchlist-chips"></div>
        <p id="watchlistEmptyV4" class="watchlist-empty">Save companies here, then analyze the group together.</p>
      </div>
      <div class="preview-mode-notice"><strong>Preview mode</strong><span>No API key required. Dashboard counts are illustrative until live transcript data is connected.</span></div>
    `;
    hero.insertAdjacentElement("beforebegin", section);

    const input = document.getElementById("tickerInputV4");
    const form = document.getElementById("tickerFormV4");
    const add = document.getElementById("addWatchV4");
    const analyzeWatchlist = document.getElementById("analyzeWatchlistV4");

    input.addEventListener("input", () => {
      const cleaned = cleanTicker(input.value);
      if (input.value !== cleaned) input.value = cleaned;
      setMessage("Press Analyze company when you're ready.", false);
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      renderPreview([input.value]);
    });
    add.addEventListener("click", () => {
      const ticker = cleanTicker(input.value);
      if (!ticker) return setMessage("Enter a ticker before adding it to the watchlist.", true);
      const list = loadWatchlist();
      if (!list.includes(ticker)) list.push(ticker);
      saveWatchlist(list);
      renderWatchlist();
      setMessage(`${ticker} added to your watchlist.`, false);
    });
    analyzeWatchlist.addEventListener("click", () => renderPreview(loadWatchlist()));

    renderWatchlist();
    input.focus();
  }

  mount();
})();
