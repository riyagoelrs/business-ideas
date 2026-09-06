/* SignalCall ticker-first v5: persistent multi-company watchlists + ticker-specific preview profiles. */
(function () {
  const WATCH_KEY = "signalcall-watchlist-v2";
  const LEGACY_WATCH_KEY = "signalcall-watchlist-v1";
  const PERIODS = ["2025 Q1", "2025 Q2", "2025 Q3", "2025 Q4", "2026 Q1", "2026 Q2"];

  const PROFILES = {
    NVDA: [
      ["AI", 31, .46], ["data center", 27, .34], ["inference", 21, .58],
      ["demand", 15, .19], ["supply", 9, -.08], ["China", 6, -.18]
    ],
    META: [
      ["AI", 25, .39], ["advertising", 22, .17], ["capex", 19, .31],
      ["data center", 16, .28], ["engagement", 12, .08], ["margin", 8, -.05]
    ],
    MSFT: [
      ["AI", 23, .35], ["cloud", 21, .18], ["data center", 18, .29],
      ["capex", 16, .33], ["demand", 10, .09], ["margin", 7, -.06]
    ],
    AMZN: [
      ["cloud", 19, .21], ["AI", 17, .42], ["consumer spending", 12, .08],
      ["advertising", 14, .18], ["capex", 16, .26], ["pricing", 6, -.04]
    ],
    GOOGL: [
      ["AI", 22, .41], ["advertising", 20, .16], ["cloud", 15, .24],
      ["capex", 17, .29], ["data center", 13, .27], ["engagement", 8, .06]
    ],
    AAPL: [
      ["AI", 12, .36], ["China", 9, -.16], ["consumer spending", 8, -.04],
      ["pricing", 7, .03], ["supply chain", 6, -.09], ["services", 15, .14]
    ],
    TSLA: [
      ["pricing", 14, -.18], ["demand", 16, -.09], ["margin", 11, -.14],
      ["AI", 13, .38], ["capacity", 10, .07], ["China", 8, -.11]
    ],
    WMT: [
      ["consumer pressure", 18, .31], ["tariffs", 16, .47], ["pricing", 12, .14],
      ["inventory", 8, -.07], ["traffic", 14, .18], ["labor", 7, .06]
    ],
    TGT: [
      ["consumer pressure", 17, .34], ["promotions", 14, .26], ["inventory", 11, .08],
      ["traffic", 9, -.12], ["tariffs", 13, .44], ["pricing", 8, .05]
    ],
    COST: [
      ["traffic", 18, .17], ["consumer spending", 13, .09], ["pricing", 10, .06],
      ["inventory", 7, -.05], ["labor", 6, .04], ["tariffs", 11, .37]
    ],
    NKE: [
      ["inventory", 16, .22], ["China", 12, -.13], ["wholesale", 10, -.07],
      ["consumer pressure", 13, .28], ["tariffs", 14, .42], ["pricing", 7, -.06]
    ],
    MCD: [
      ["value", 19, .32], ["traffic", 15, -.08], ["consumer pressure", 16, .27],
      ["pricing", 10, .05], ["labor", 8, .09], ["inflation", 6, -.12]
    ],
    SBUX: [
      ["traffic", 18, -.16], ["labor", 13, .21], ["consumer pressure", 12, .18],
      ["pricing", 8, -.05], ["China", 9, -.12], ["demand", 10, .07]
    ],
    BROS: [
      ["traffic", 21, .38], ["store openings", 18, .29], ["same-store sales", 16, .24],
      ["labor", 10, .11], ["pricing", 7, -.07], ["margin", 13, .27]
    ],
    CAVA: [
      ["unit growth", 23, .41], ["same restaurant sales", 19, .28], ["traffic", 17, .22],
      ["digital", 11, .16], ["labor", 8, -.04], ["margin", 12, .19]
    ],
    CELH: [
      ["distribution", 19, .33], ["inventory", 15, -.11], ["demand", 17, .25],
      ["consumer spending", 9, .08], ["pricing", 6, -.05], ["margin", 11, .18]
    ],
    LLY: [
      ["GLP-1", 33, .52], ["obesity", 26, .37], ["capacity", 22, .31],
      ["demand", 24, .26], ["supply", 14, .15], ["pricing", 8, -.09]
    ],
    NVO: [
      ["GLP-1", 29, .44], ["obesity", 24, .32], ["capacity", 18, .24],
      ["demand", 20, .19], ["supply", 13, .11], ["pricing", 9, -.06]
    ],
    JPM: [
      ["credit", 20, .19], ["deposits", 16, -.04], ["capital", 14, .08],
      ["rates", 11, -.21], ["AI", 10, .36], ["consumer pressure", 8, .29]
    ],
    BAC: [
      ["credit", 18, .16], ["deposits", 15, -.06], ["rates", 12, -.18],
      ["capital", 13, .07], ["consumer pressure", 9, .26], ["AI", 7, .31]
    ],
    GS: [
      ["capital markets", 20, .29], ["M&A", 17, .34], ["rates", 9, -.12],
      ["credit", 8, .13], ["AI", 7, .27], ["demand", 10, .11]
    ],
    HD: [
      ["housing", 18, .13], ["consumer pressure", 15, .24], ["demand", 12, -.08],
      ["pricing", 8, -.04], ["inventory", 9, .06], ["tariffs", 13, .39]
    ],
    LOW: [
      ["housing", 16, .11], ["consumer pressure", 14, .22], ["demand", 11, -.09],
      ["pricing", 7, -.03], ["inventory", 8, .04], ["tariffs", 12, .36]
    ]
  };

  const GENERIC_TERMS = [
    "demand", "pricing", "margin", "traffic", "inventory", "consumer spending", "AI", "labor",
    "growth", "market share", "promotions", "capital", "supply chain", "international", "digital",
    "distribution", "capacity", "retention", "subscriptions", "free cash flow", "tariffs", "China"
  ];

  function cleanTicker(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 10);
  }

  function hash(value) {
    let h = 2166136261;
    const s = String(value);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0);
  }

  function loadWatchlist() {
    try {
      const current = JSON.parse(localStorage.getItem(WATCH_KEY) || "null");
      if (Array.isArray(current)) return [...new Set(current.map(cleanTicker).filter(Boolean))].slice(0, 20);
      const legacy = JSON.parse(localStorage.getItem(LEGACY_WATCH_KEY) || "[]");
      return Array.isArray(legacy) ? [...new Set(legacy.map(cleanTicker).filter(Boolean))].slice(0, 20) : [];
    } catch (_) {
      return [];
    }
  }

  let watchlist = loadWatchlist();

  function saveWatchlist() {
    watchlist = [...new Set(watchlist.map(cleanTicker).filter(Boolean))].slice(0, 20);
    try {
      localStorage.setItem(WATCH_KEY, JSON.stringify(watchlist));
      localStorage.setItem(LEGACY_WATCH_KEY, JSON.stringify(watchlist));
    } catch (_) {}
  }
  saveWatchlist();

  function profileFor(ticker) {
    if (PROFILES[ticker]) return PROFILES[ticker].map(([name, latest, growth]) => ({ name, latest, growth }));

    const seed = hash(ticker || "GENERIC");
    const chosen = [];
    for (let i = 0; chosen.length < 6 && i < GENERIC_TERMS.length * 2; i++) {
      const term = GENERIC_TERMS[(seed + i * 7 + (seed % 5) * i) % GENERIC_TERMS.length];
      if (!chosen.includes(term)) chosen.push(term);
    }
    const growthOptions = [-.22, -.11, -.03, .08, .16, .27, .39, .51];
    return chosen.map((name, i) => {
      const local = hash(`${ticker}|${name}|${i}`);
      return {
        name,
        latest: 6 + (local % 19),
        growth: growthOptions[(local + i) % growthOptions.length]
      };
    });
  }

  function termsForTickers(tickers) {
    const scores = new Map();
    tickers.forEach(ticker => {
      profileFor(ticker).forEach((item, index) => {
        const score = (12 - index) + item.latest / 8 + Math.max(0, item.growth * 3);
        scores.set(item.name, (scores.get(item.name) || 0) + score);
      });
    });
    return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([term]) => term).slice(0, 6);
  }

  function configFor(ticker, term) {
    const exact = profileFor(ticker).find(item => item.name.toLowerCase() === term.toLowerCase());
    if (exact) return exact;
    const seed = hash(`${ticker}|${term}|secondary`);
    if (seed % 5 === 0) return { name: term, latest: 0, growth: 0 };
    const growthOptions = [-.16, -.06, .04, .1, .18];
    return { name: term, latest: 1 + (seed % 6), growth: growthOptions[seed % growthOptions.length] };
  }

  function buildSeries(ticker, term, count) {
    const cfg = configFor(ticker, term);
    if (!cfg.latest) return Array(count).fill(0);
    const values = [];
    for (let i = 0; i < count; i++) {
      const stepsBack = count - 1 - i;
      const base = cfg.latest / Math.pow(Math.max(.48, 1 + cfg.growth), stepsBack);
      const jitterSeed = hash(`${ticker}|${term}|${i}|jitter`);
      const jitter = stepsBack ? (jitterSeed % 3) - 1 : 0;
      values.push(Math.max(0, Math.round(base + jitter)));
    }
    values[count - 1] = cfg.latest;
    return values;
  }

  function buildPreview(tickers) {
    const terms = termsForTickers(tickers);
    const latestByCompany = {};
    const companySeries = {};

    tickers.forEach(ticker => {
      latestByCompany[ticker] = {};
      companySeries[ticker] = {};
      terms.forEach(term => {
        const values = buildSeries(ticker, term, PERIODS.length);
        companySeries[ticker][term] = values;
        latestByCompany[ticker][term] = values.at(-1) || 0;
      });
    });

    const series = Object.fromEntries(terms.map(term => [
      term,
      PERIODS.map((_, index) => tickers.reduce((sum, ticker) => sum + Number(companySeries[ticker][term][index] || 0), 0))
    ]));

    return {
      source: "preview",
      terms,
      periods: [...PERIODS],
      companies: [...tickers],
      callsAnalyzed: tickers.length * PERIODS.length,
      series,
      latestByCompany,
      excerpts: []
    };
  }

  function syncGlobalTerms(terms) {
    try {
      if (typeof state === "undefined" || !Array.isArray(state.terms)) return;
      const wanted = new Set(terms.map(term => term.toLowerCase()));
      state.terms.forEach(item => { item.selected = wanted.has(item.name.toLowerCase()); });
      terms.forEach(name => {
        if (!state.terms.some(item => item.name.toLowerCase() === name.toLowerCase())) {
          state.terms.push({ name, selected: true });
        }
      });
      if (typeof renderTerms === "function") renderTerms();
    } catch (_) {}
  }

  function setMessage(text, error) {
    const el = document.getElementById("tickerLaunchMessageV5");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("is-error", !!error);
  }

  function updateNarrativePreview(tickers) {
    const holder = document.getElementById("autoNarrativeChipsV5");
    const label = document.getElementById("narrativeLabelV5");
    if (!holder || !label) return;
    const clean = [...new Set(tickers.map(cleanTicker).filter(Boolean))];
    if (!clean.length) {
      holder.innerHTML = "";
      label.textContent = "Enter a ticker to see company-specific themes";
      return;
    }
    const terms = termsForTickers(clean);
    holder.innerHTML = terms.map(term => `<span>${escapeHtmlMini(term)}</span>`).join("");
    label.textContent = clean.length === 1 ? `Suggested for ${clean[0]}` : `Suggested across ${clean.length} watchlist companies`;
  }

  function renderPreview(rawTickers) {
    const tickers = [...new Set(rawTickers.map(cleanTicker).filter(Boolean))].slice(0, 15);
    if (!tickers.length) return setMessage("Enter a ticker first, for example NVDA.", true);

    const dataset = buildPreview(tickers);
    syncGlobalTerms(dataset.terms);
    if (typeof setDataset === "function") setDataset(dataset);
    updateNarrativePreview(tickers);

    const status = document.getElementById("sourceStatus");
    if (status) status.textContent = "Illustrative company preview";

    const callsSub = document.getElementById("metricCallsSub");
    if (callsSub) callsSub.textContent = `illustrative profile · ${tickers.length} ${tickers.length === 1 ? "company" : "companies"}`;

    const adoptionValue = document.getElementById("metricAdoption");
    const adoptionCard = adoptionValue?.closest(".metric-card");
    const adoptionLabel = adoptionCard?.querySelector(":scope > span");
    const adoptionSub = document.getElementById("metricAdoptionSub");

    if (tickers.length === 1 && adoptionValue) {
      const ticker = tickers[0];
      const ranked = dataset.terms
        .map(term => ({ term, value: Number(dataset.latestByCompany[ticker]?.[term] || 0) }))
        .sort((a, b) => b.value - a.value);
      const top = ranked[0] || { term: "—", value: 0 };
      if (adoptionLabel) adoptionLabel.textContent = "Most discussed";
      adoptionValue.textContent = top.term;
      if (adoptionSub) adoptionSub.textContent = `${top.value} illustrative mentions · latest period`;
    } else if (adoptionLabel) {
      adoptionLabel.textContent = "Widest adoption";
    }

    const excerptTitle = document.querySelector(".excerpts-panel .panel-head h2");
    if (excerptTitle) excerptTitle.textContent = "Transcript excerpts appear with live data.";
    const excerptList = document.getElementById("excerptList");
    if (excerptList) excerptList.innerHTML = '<p class="empty-note">Preview mode does not fabricate management quotes. Live excerpts will appear once a transcript backend is connected.</p>';

    const profileText = dataset.terms.slice(0, 3).join(" · ");
    setMessage(`${tickers.length === 1 ? tickers[0] : `${tickers.length} companies`} analyzed in preview mode — ${profileText}.`, false);
  }

  function renderWatchlist() {
    const holder = document.getElementById("watchlistChipsV5");
    const empty = document.getElementById("watchlistEmptyV5");
    const analyze = document.getElementById("analyzeWatchlistV5");
    const count = document.getElementById("watchlistCountV5");
    if (!holder) return;

    holder.innerHTML = "";
    watchlist.forEach(ticker => {
      const chip = document.createElement("div");
      chip.className = "watchlist-chip";

      const open = document.createElement("button");
      open.type = "button";
      open.className = "watchlist-open";
      open.textContent = ticker;
      open.title = `Load ${ticker}`;
      open.addEventListener("click", () => {
        const input = document.getElementById("tickerInputV5");
        if (input) {
          input.value = ticker;
          input.focus();
          updateNarrativePreview([ticker]);
        }
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "watchlist-remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${ticker} from watchlist`);
      remove.addEventListener("click", () => {
        watchlist = watchlist.filter(item => item !== ticker);
        saveWatchlist();
        renderWatchlist();
        updateNarrativePreview(watchlist);
      });

      chip.append(open, remove);
      holder.appendChild(chip);
    });

    if (empty) empty.hidden = watchlist.length > 0;
    if (analyze) analyze.disabled = watchlist.length === 0;
    if (count) count.textContent = `${watchlist.length} / 20 saved`;
  }

  function addCurrentTicker() {
    const input = document.getElementById("tickerInputV5");
    const ticker = cleanTicker(input?.value || "");
    if (!ticker) return setMessage("Enter a ticker before adding it to the watchlist.", true);

    if (watchlist.includes(ticker)) {
      setMessage(`${ticker} is already in your watchlist.`, false);
      if (input) { input.value = ""; input.focus(); }
      return;
    }

    watchlist = [...watchlist, ticker].slice(0, 20);
    saveWatchlist();
    renderWatchlist();
    updateNarrativePreview(watchlist);
    setMessage(`${ticker} added. Your watchlist now has ${watchlist.length} ${watchlist.length === 1 ? "company" : "companies"}.`, false);

    if (input) {
      input.value = "";
      input.focus();
    }
  }

  function mount() {
    document.getElementById("tickerFirst")?.remove();
    document.getElementById("tickerFirstV4")?.remove();
    document.getElementById("tickerFirstV5")?.remove();

    const details = document.getElementById("dataSettings");
    if (details) details.style.display = "none";
    const panel = document.querySelector(".control-panel");
    if (panel && !details) panel.style.display = "none";

    const oldControls = document.getElementById("heatmapWatchControls");
    if (oldControls) oldControls.style.display = "none";

    const hero = document.querySelector(".hero");
    if (!hero) return;

    const section = document.createElement("section");
    section.id = "tickerFirstV5";
    section.className = "ticker-first ticker-first-v4";
    section.innerHTML = `
      <div class="ticker-first-copy">
        <p class="eyebrow">START WITH A COMPANY</p>
        <h1>Enter a ticker.</h1>
        <p>SignalCall builds a company-specific narrative view, then lets you compare it against a saved watchlist.</p>
      </div>

      <form id="tickerFormV5" class="ticker-launch" autocomplete="off">
        <div class="ticker-input-wrap">
          <span class="ticker-prefix">$</span>
          <input id="tickerInputV5" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="10" placeholder="NVDA" aria-label="Ticker symbol" />
        </div>
        <button class="primary-button ticker-analyze" type="submit">Analyze company →</button>
        <button id="addWatchV5" class="secondary-button ticker-watch-add" type="button">+ Add to watchlist</button>
      </form>

      <p id="tickerLaunchMessageV5" class="ticker-launch-message" aria-live="polite">Type any ticker, then analyze it or save it to your watchlist.</p>

      <div class="watchlist-builder">
        <div class="watchlist-title">
          <div>
            <p class="eyebrow">CREATE A WATCHLIST</p>
            <h2>Your companies</h2>
            <small id="watchlistCountV5" class="watchlist-count"></small>
          </div>
          <button id="analyzeWatchlistV5" class="mini-button" type="button">Analyze watchlist</button>
        </div>
        <div id="watchlistChipsV5" class="watchlist-chips"></div>
        <p id="watchlistEmptyV5" class="watchlist-empty">Add as many companies as you want, then analyze the group together.</p>
      </div>

      <div class="auto-narratives auto-narratives-v5">
        <div class="auto-narrative-copy">
          <p class="eyebrow">AUTO-SELECTED NARRATIVES</p>
          <strong id="narrativeLabelV5">Enter a ticker to see company-specific themes</strong>
        </div>
        <div id="autoNarrativeChipsV5" class="auto-narrative-chips"></div>
        <small>Preview themes and counts are illustrative; the live version will derive them from actual earnings transcripts.</small>
      </div>

      <div class="preview-mode-notice">
        <strong>Preview mode</strong>
        <span>No API key required. Company profiles are intentionally different so you can test the product behavior before live transcript data is connected.</span>
      </div>
    `;
    hero.insertAdjacentElement("beforebegin", section);

    const style = document.createElement("style");
    style.textContent = `
      #heatmapWatchControls,.row-watch{display:none!important}
      .watchlist-count{display:block;margin-top:5px;color:var(--muted);font-size:11px}
      .auto-narratives-v5{margin-top:16px}
    `;
    document.head.appendChild(style);

    const input = document.getElementById("tickerInputV5");
    const form = document.getElementById("tickerFormV5");
    const add = document.getElementById("addWatchV5");
    const analyzeWatchlist = document.getElementById("analyzeWatchlistV5");

    input.addEventListener("input", () => {
      const cleaned = cleanTicker(input.value);
      if (input.value !== cleaned) input.value = cleaned;
      updateNarrativePreview(cleaned ? [cleaned] : []);
      setMessage("Press Analyze company when you're ready.", false);
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      renderPreview([input.value]);
    });

    add.addEventListener("click", addCurrentTicker);
    analyzeWatchlist.addEventListener("click", () => renderPreview([...watchlist]));

    renderWatchlist();
    updateNarrativePreview([]);
    input.focus();
  }

  function escapeHtmlMini(value) {
    return String(value ?? "").replace(/[&<>\"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  }

  mount();
})();
