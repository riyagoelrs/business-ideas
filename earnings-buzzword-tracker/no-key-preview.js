/* SignalCall no-key prototype mode.
   Keeps the ticker/watchlist product usable while live transcript ingestion is deferred to backend infrastructure.
   All generated dashboard counts in this mode are explicitly illustrative. */
(function () {
  const PREVIEW_SENTINEL = "__SIGNALCALL_PREVIEW__";

  function boot() {
    const key = document.getElementById("apiKey");
    if (key) key.value = PREVIEW_SENTINEL;

    hideCredentialUI();
    relabelPreviewExperience();
    interceptLiveRun();
    addPreviewNotice();
  }

  function hideCredentialUI() {
    const key = document.getElementById("apiKey");
    const keyField = key?.closest("label.field");
    if (keyField) keyField.style.display = "none";
    const toggle = document.getElementById("toggleKey");
    if (toggle) toggle.style.display = "none";
  }

  function relabelPreviewExperience() {
    const status = document.getElementById("sourceStatus");
    if (status) status.textContent = "Preview mode";

    const liveTab = document.querySelector('.mode-tab[data-mode="live"]');
    if (liveTab) liveTab.textContent = "Preview data";

    const run = document.getElementById("runLive");
    if (run) run.textContent = "Generate preview";

    const liveNote = document.querySelector('.mode-panel[data-panel="live"] .mode-actions .fine-print');
    if (liveNote) liveNote.innerHTML = "No API key is required in this prototype. SignalCall generates a clearly labeled illustrative preview from the ticker/watchlist so the product flow is usable now. Live transcript ingestion can be connected behind the scenes later.";

    const summarySmall = document.querySelector("#dataSettings summary small");
    if (summarySmall) summarySmall.textContent = "Date range, manual terms, preview data and paste/upload fallback";

    const tickerCopy = document.querySelector("#tickerFirst .ticker-first-copy > p:last-child");
    if (tickerCopy) tickerCopy.textContent = "SignalCall identifies the narratives that matter for the company, builds a watchlist view, and populates the dashboard automatically. Live transcript ingestion can be connected later without changing this workflow.";

    const autoSmall = document.querySelector("#tickerFirst .auto-narratives small");
    if (autoSmall) autoSmall.textContent = "In live mode, these themes can re-rank after SignalCall reads the actual transcripts.";

    const sourceLabel = document.querySelector("#tickerFirst .ticker-first-footer span");
    if (sourceLabel) sourceLabel.textContent = "Data mode: illustrative preview";

    const heroCopy = document.querySelector(".hero-copy");
    if (heroCopy) heroCopy.innerHTML = 'Enter a company watchlist and SignalCall maps terms like <strong>AI</strong>, <strong>tariffs</strong>, <strong>GLP-1</strong>, and <strong>consumer pressure</strong> to show how the narrative dashboard works. Live transcript data can be connected behind the scenes later.';
  }

  function addPreviewNotice() {
    const tickerFirst = document.getElementById("tickerFirst");
    if (!tickerFirst || document.getElementById("previewModeNotice")) return;
    const note = document.createElement("div");
    note.id = "previewModeNotice";
    note.className = "preview-mode-notice";
    note.innerHTML = '<strong>Preview mode</strong><span>No API key required. Dashboard counts are illustrative until a live transcript backend is connected.</span>';
    tickerFirst.appendChild(note);

    const style = document.createElement("style");
    style.textContent = `
      .preview-mode-notice{margin:14px auto 0;max-width:900px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;padding:10px 14px;border:1px solid var(--line);border-radius:12px;background:#f5f7ef;color:var(--muted);font-size:12px}
      .preview-mode-notice strong{color:var(--ink)}
      .preview-badge{display:inline-flex;align-items:center;border:1px solid var(--line);background:#f5f7ef;color:var(--muted);border-radius:999px;padding:6px 9px;font:600 10px "IBM Plex Mono",monospace;letter-spacing:.04em}
    `;
    document.head.appendChild(style);
  }

  function interceptLiveRun() {
    const run = document.getElementById("runLive");
    if (!run) return;
    run.addEventListener("click", function (event) {
      const key = document.getElementById("apiKey")?.value || "";
      if (key !== PREVIEW_SENTINEL) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      generatePreview();
    }, true);
  }

  function generatePreview() {
    const tickers = (document.getElementById("liveTickers")?.value || document.getElementById("tickerLaunchInput")?.value || "")
      .split(",")
      .map(cleanTicker)
      .filter(Boolean)
      .slice(0, 15);

    if (!tickers.length) {
      const msg = document.getElementById("tickerLaunchMessage");
      if (msg) {
        msg.textContent = "Enter at least one ticker first.";
        msg.classList.add("is-error");
      }
      return;
    }

    let terms = [];
    try { if (typeof selectedTerms === "function") terms = selectedTerms(); } catch (_) {}
    if (!terms.length) terms = ["AI", "demand", "pricing", "margin", "consumer pressure", "tariffs"];
    terms = terms.slice(0, 6);

    const periods = (typeof DEMO !== "undefined" && Array.isArray(DEMO.periods) && DEMO.periods.length)
      ? [...DEMO.periods]
      : ["2025 Q1", "2025 Q2", "2025 Q3", "2025 Q4", "2026 Q1", "2026 Q2"];

    const companySeries = {};
    const latestByCompany = {};
    tickers.forEach(ticker => {
      companySeries[ticker] = {};
      latestByCompany[ticker] = {};
      terms.forEach(term => {
        const values = buildCompanySeries(ticker, term, periods.length);
        companySeries[ticker][term] = values;
        latestByCompany[ticker][term] = values[values.length - 1] || 0;
      });
    });

    const series = Object.fromEntries(terms.map(term => [
      term,
      periods.map((_, index) => tickers.reduce((sum, ticker) => sum + Number(companySeries[ticker][term][index] || 0), 0))
    ]));

    const dataset = {
      source: "preview",
      terms,
      periods,
      companies: tickers,
      callsAnalyzed: tickers.length * periods.length,
      series,
      latestByCompany,
      excerpts: []
    };

    if (typeof setDataset === "function") setDataset(dataset);

    const status = document.getElementById("sourceStatus");
    if (status) status.textContent = "Illustrative preview";
    const callsSub = document.getElementById("metricCallsSub");
    if (callsSub) callsSub.textContent = `illustrative preview · ${tickers.length} ${tickers.length === 1 ? "company" : "companies"}`;
    const heatPeriod = document.getElementById("heatmapPeriod");
    if (heatPeriod) {
      heatPeriod.innerHTML = `${escapeText(periods[periods.length - 1])} <span class="preview-badge">PREVIEW</span>`;
      heatPeriod.style.display = "inline-flex";
      heatPeriod.style.gap = "6px";
      heatPeriod.style.alignItems = "center";
    }
    const excerptTitle = document.querySelector(".excerpts-panel .panel-head h2");
    if (excerptTitle) excerptTitle.textContent = "Transcript excerpts appear in live mode.";
    const excerptList = document.getElementById("excerptList");
    if (excerptList) excerptList.innerHTML = '<p class="empty-note">Preview mode does not fabricate management quotes. Once a live transcript backend is connected, matched excerpts will appear here automatically.</p>';
    const message = document.getElementById("tickerLaunchMessage");
    if (message) {
      message.textContent = `Preview generated for ${tickers.join(", ")}. No API key required.`;
      message.classList.remove("is-error");
    }
  }

  function buildCompanySeries(ticker, term, count) {
    const demoLatest = getDemoLatest(ticker, term);
    const seed = hash(`${ticker}|${term}`);
    const latest = demoLatest !== null ? demoLatest : 1 + (seed % 13);
    if (latest === 0) return Array(count).fill(0);

    const growthOptions = [-0.14, -0.07, 0.04, 0.1, 0.18, 0.27];
    const growth = growthOptions[seed % growthOptions.length];
    const values = [];
    for (let i = 0; i < count; i++) {
      const stepsBack = (count - 1) - i;
      const denominator = Math.pow(Math.max(0.55, 1 + growth), stepsBack);
      const jitter = ((hash(`${ticker}|${term}|${i}`) % 3) - 1);
      values.push(Math.max(0, Math.round((latest / denominator) + jitter)));
    }
    values[count - 1] = latest;
    return values;
  }

  function getDemoLatest(ticker, term) {
    try {
      if (typeof DEMO !== "undefined" && DEMO.latestByCompany?.[ticker] && Object.prototype.hasOwnProperty.call(DEMO.latestByCompany[ticker], term)) {
        return Number(DEMO.latestByCompany[ticker][term] || 0);
      }
    } catch (_) {}
    return null;
  }

  function hash(value) {
    let h = 2166136261;
    for (let i = 0; i < String(value).length; i++) {
      h ^= String(value).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0);
  }

  function cleanTicker(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 10);
  }

  function escapeText(value) {
    return String(value ?? "").replace(/[&<>\"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  }

  boot();
})();
