const DEFAULT_TERMS = [
  "AI",
  "tariffs",
  "consumer pressure",
  "GLP-1",
  "pricing",
  "inventory",
  "data center",
  "labor"
];

const TERM_COLORS = ["#273519", "#8fb922", "#6d775d", "#c98f2b", "#6686a4", "#a75d4d", "#7b5aa6", "#28776c", "#bd596e", "#4e657b"];

const DEMO = {
  source: "demo",
  periods: ["2025 Q1", "2025 Q2", "2025 Q3", "2025 Q4", "2026 Q1", "2026 Q2"],
  companies: ["NVDA", "META", "WMT", "NKE", "MCD", "LLY", "JPM", "HD"],
  callsAnalyzed: 48,
  series: {
    "AI": [18, 24, 31, 42, 57, 105],
    "tariffs": [5, 7, 15, 26, 44, 61],
    "consumer pressure": [14, 18, 25, 31, 38, 43],
    "GLP-1": [3, 6, 11, 14, 19, 17],
    "pricing": [41, 38, 36, 35, 32, 34],
    "inventory": [39, 33, 29, 23, 20, 18],
    "data center": [9, 13, 18, 29, 37, 55],
    "labor": [26, 24, 21, 19, 18, 16]
  },
  latestByCompany: {
    NVDA: {"AI": 16, "tariffs": 3, "consumer pressure": 0, "GLP-1": 0, "pricing": 2, "inventory": 1, "data center": 14, "labor": 1},
    META: {"AI": 18, "tariffs": 2, "consumer pressure": 1, "GLP-1": 0, "pricing": 1, "inventory": 0, "data center": 10, "labor": 1},
    WMT: {"AI": 6, "tariffs": 11, "consumer pressure": 8, "GLP-1": 4, "pricing": 7, "inventory": 5, "data center": 0, "labor": 4},
    NKE: {"AI": 2, "tariffs": 9, "consumer pressure": 7, "GLP-1": 0, "pricing": 5, "inventory": 6, "data center": 0, "labor": 3},
    MCD: {"AI": 4, "tariffs": 5, "consumer pressure": 9, "GLP-1": 3, "pricing": 6, "inventory": 1, "data center": 0, "labor": 5},
    LLY: {"AI": 5, "tariffs": 4, "consumer pressure": 1, "GLP-1": 14, "pricing": 4, "inventory": 3, "data center": 1, "labor": 1},
    JPM: {"AI": 11, "tariffs": 6, "consumer pressure": 5, "GLP-1": 0, "pricing": 3, "inventory": 0, "data center": 2, "labor": 1},
    HD: {"AI": 3, "tariffs": 8, "consumer pressure": 12, "GLP-1": 0, "pricing": 6, "inventory": 2, "data center": 0, "labor": 4}
  },
  excerpts: [
    {ticker:"NVDA", period:"2026 Q2", term:"AI", speaker:"Management", text:"The buildout around AI infrastructure is expanding from training into inference, sovereign AI, and agentic workloads across industries."},
    {ticker:"WMT", period:"2026 Q2", term:"tariffs", speaker:"Management", text:"We are working item by item to mitigate tariffs, but there are categories where higher costs will still flow through the system."},
    {ticker:"HD", period:"2026 Q2", term:"consumer pressure", speaker:"Management", text:"We continue to see consumer pressure on larger discretionary projects, while smaller repair-and-maintenance categories remain more resilient."},
    {ticker:"LLY", period:"2026 Q2", term:"GLP-1", speaker:"Management", text:"Demand across the GLP-1 category remains strong, and capacity expansion is still one of the most important investments we are making."},
    {ticker:"META", period:"2026 Q2", term:"data center", speaker:"Management", text:"Our data center roadmap is being redesigned around the compute density required for the next generation of AI systems."},
    {ticker:"NKE", period:"2026 Q2", term:"inventory", speaker:"Management", text:"We have made progress normalizing inventory, but we still have work to do in selected channels and geographies."}
  ]
};

const state = {
  mode: "demo",
  terms: DEFAULT_TERMS.map((name, i) => ({ name, selected: i < 6 })),
  transcripts: [],
  dataset: null,
  excerptOffset: 0
};

const els = {};

function cacheEls() {
  [
    "sourceStatus","heroVelocity","heroVelocityLabel","runDemo","runLive","runPaste","liveTickers","dateFrom","dateTo","apiKey","toggleKey","liveError",
    "pasteTicker","pastePeriod","pasteText","addTranscript","transcriptFiles","clearLibrary","libraryCount","transcriptLibrary",
    "customTerm","addTerm","termChips","termLimitNote","progressCard","progressLabel","progressCount","progressBar",
    "metricCalls","metricCallsSub","metricTerms","metricTermsSub","metricRiser","metricRiserSub","metricAdoption","metricAdoptionSub",
    "chartMetric","chartLegend","trendChart","shiftList","heatmapPeriod","heatmap","excerptList","shuffleExcerpt"
  ].forEach(id => els[id] = document.getElementById(id));
}

function init() {
  cacheEls();
  bindEvents();
  renderTerms();
  setDataset(filterDemoDataset());
}

function bindEvents() {
  document.querySelectorAll(".mode-tab").forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
  els.runDemo.addEventListener("click", () => setDataset(filterDemoDataset()));
  els.addTerm.addEventListener("click", addCustomTerm);
  els.customTerm.addEventListener("keydown", e => { if (e.key === "Enter") addCustomTerm(); });
  els.toggleKey.addEventListener("click", toggleKeyVisibility);
  els.runLive.addEventListener("click", runLiveAnalysis);
  els.addTranscript.addEventListener("click", addPastedTranscript);
  els.transcriptFiles.addEventListener("change", addTranscriptFiles);
  els.clearLibrary.addEventListener("click", () => { state.transcripts = []; renderLibrary(); });
  els.runPaste.addEventListener("click", runPasteAnalysis);
  els.chartMetric.addEventListener("change", () => renderTrendChart(state.dataset));
  els.shuffleExcerpt.addEventListener("click", () => { state.excerptOffset += 2; renderExcerpts(state.dataset); });
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode-tab").forEach(btn => btn.classList.toggle("is-active", btn.dataset.mode === mode));
  document.querySelectorAll(".mode-panel").forEach(panel => panel.classList.toggle("is-active", panel.dataset.panel === mode));
  const labels = { demo: "Demo dataset", live: "Live API ready", paste: "Local transcript mode" };
  els.sourceStatus.textContent = labels[mode];
  els.termLimitNote.textContent = mode === "live"
    ? "Live mode analyzes up to 6 selected terms per run to keep API requests reasonable."
    : "Select any terms to include in the analysis.";
}

function addCustomTerm() {
  const name = els.customTerm.value.trim();
  if (!name) return;
  const existing = state.terms.find(t => t.name.toLowerCase() === name.toLowerCase());
  if (existing) existing.selected = true;
  else state.terms.push({ name, selected: true });
  els.customTerm.value = "";
  renderTerms();
}

function renderTerms() {
  els.termChips.innerHTML = "";
  state.terms.forEach(term => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `term-chip${term.selected ? " is-selected" : ""}`;
    btn.textContent = term.name;
    btn.addEventListener("click", () => {
      term.selected = !term.selected;
      renderTerms();
      if (state.dataset?.source === "demo") setDataset(filterDemoDataset());
    });
    els.termChips.appendChild(btn);
  });
}

function selectedTerms(limit = Infinity) {
  return state.terms.filter(t => t.selected).map(t => t.name).slice(0, limit);
}

function filterDemoDataset() {
  const wanted = selectedTerms().filter(term => DEMO.series[term]);
  const terms = wanted.length ? wanted : ["AI"];
  const series = Object.fromEntries(terms.map(term => [term, DEMO.series[term]]));
  const latestByCompany = {};
  DEMO.companies.forEach(company => {
    latestByCompany[company] = Object.fromEntries(terms.map(term => [term, DEMO.latestByCompany[company]?.[term] || 0]));
  });
  return {
    ...DEMO,
    terms,
    series,
    latestByCompany,
    excerpts: DEMO.excerpts.filter(x => terms.includes(x.term))
  };
}

function setDataset(dataset) {
  state.dataset = dataset;
  state.excerptOffset = 0;
  els.sourceStatus.textContent = dataset.source === "demo" ? "Demo dataset" : dataset.source === "live" ? "Live API results" : "Local transcript results";
  renderDashboard(dataset);
  window.scrollTo({ top: document.querySelector(".metrics-grid").offsetTop - 16, behavior: "smooth" });
}

function renderDashboard(dataset) {
  renderMetrics(dataset);
  renderTrendChart(dataset);
  renderShiftList(dataset);
  renderHeatmap(dataset);
  renderExcerpts(dataset);
}

function renderMetrics(dataset) {
  const terms = dataset.terms || Object.keys(dataset.series || {});
  const companies = dataset.companies || Object.keys(dataset.latestByCompany || {});
  const periods = dataset.periods || [];
  const shifts = calculateShifts(dataset);
  const riser = shifts[0] || { term: terms[0] || "—", pct: 0 };
  const adoption = calculateAdoption(dataset);

  els.metricCalls.textContent = formatNumber(dataset.callsAnalyzed || 0);
  els.metricCallsSub.textContent = `${companies.length} ${companies.length === 1 ? "company" : "companies"} · ${periods.length} ${periods.length === 1 ? "period" : "periods"}`;
  els.metricTerms.textContent = terms.length;
  els.metricTermsSub.textContent = "selected narratives";
  els.metricRiser.textContent = riser.term || "—";
  els.metricRiserSub.textContent = `${formatPct(riser.pct)} vs. prior period`;
  els.metricAdoption.textContent = adoption.term || "—";
  els.metricAdoptionSub.textContent = `${adoption.count || 0} of ${companies.length} companies`;
  els.heroVelocity.textContent = formatPct(riser.pct);
  els.heroVelocityLabel.textContent = `${riser.term || "Narrative"} vs. prior period`;
}

function calculateShifts(dataset) {
  return Object.entries(dataset.series || {}).map(([term, values]) => {
    const current = Number(values.at(-1) || 0);
    const previous = Number(values.at(-2) || 0);
    const pct = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
    return { term, current, previous, pct, delta: current - previous };
  }).sort((a, b) => b.pct - a.pct);
}

function calculateAdoption(dataset) {
  const companies = dataset.companies || [];
  const terms = dataset.terms || Object.keys(dataset.series || {});
  return terms.map(term => ({
    term,
    count: companies.reduce((sum, company) => sum + ((dataset.latestByCompany?.[company]?.[term] || 0) > 0 ? 1 : 0), 0)
  })).sort((a, b) => b.count - a.count)[0] || { term: "—", count: 0 };
}

function renderShiftList(dataset) {
  const shifts = calculateShifts(dataset);
  els.shiftList.innerHTML = "";
  if (!shifts.length) {
    els.shiftList.innerHTML = '<p class="empty-note">No period-over-period change available.</p>';
    return;
  }
  shifts.slice(0, 7).forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "shift-row";
    const direction = item.pct >= 0 ? "up" : "down";
    row.innerHTML = `
      <span class="shift-rank">${String(index + 1).padStart(2, "0")}</span>
      <span class="shift-name"><strong>${escapeHtml(item.term)}</strong><small>${formatNumber(item.previous)} → ${formatNumber(item.current)}</small></span>
      <span class="shift-change ${direction}">${formatPct(item.pct)}</span>
    `;
    els.shiftList.appendChild(row);
  });
}

function renderTrendChart(dataset) {
  const svg = els.trendChart;
  svg.innerHTML = "";
  const terms = dataset.terms || Object.keys(dataset.series || {});
  const periods = dataset.periods || [];
  if (!terms.length || !periods.length) return;

  const metric = els.chartMetric.value;
  const normalizedSeries = {};
  terms.forEach(term => {
    const raw = dataset.series[term] || [];
    if (metric === "index") {
      const base = raw.find(v => Number(v) > 0) || 1;
      normalizedSeries[term] = raw.map(v => (Number(v) / base) * 100);
    } else normalizedSeries[term] = raw.map(Number);
  });

  const allValues = Object.values(normalizedSeries).flat();
  const max = Math.max(...allValues, 1);
  const width = 900, height = 360;
  const pad = { left: 48, right: 24, top: 24, bottom: 44 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH * i / 4);
    const value = max * (1 - i / 4);
    svg.appendChild(svgEl("line", { x1: pad.left, x2: width - pad.right, y1: y, y2: y, class: "chart-grid-line" }));
    const label = svgEl("text", { x: pad.left - 8, y: y + 3, "text-anchor": "end", class: "chart-axis-label" });
    label.textContent = metric === "index" ? Math.round(value) : compactNumber(value);
    svg.appendChild(label);
  }

  periods.forEach((period, i) => {
    const x = periods.length === 1 ? pad.left + plotW / 2 : pad.left + (plotW * i / (periods.length - 1));
    const label = svgEl("text", { x, y: height - 13, "text-anchor": "middle", class: "chart-axis-label" });
    label.textContent = period;
    svg.appendChild(label);
  });

  els.chartLegend.innerHTML = "";
  terms.forEach((term, termIndex) => {
    const color = TERM_COLORS[termIndex % TERM_COLORS.length];
    const values = normalizedSeries[term] || [];
    const points = values.map((value, i) => {
      const x = values.length === 1 ? pad.left + plotW / 2 : pad.left + (plotW * i / (values.length - 1));
      const y = pad.top + plotH - ((value / max) * plotH);
      return [x, y, value];
    });
    const pathData = points.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    svg.appendChild(svgEl("path", { d: pathData, class: "chart-line", stroke: color }));
    points.forEach(([x, y]) => svg.appendChild(svgEl("circle", { cx: x, cy: y, r: 4, class: "chart-dot", fill: color })));

    const legend = document.createElement("span");
    legend.className = "legend-item";
    legend.style.setProperty("--legend-color", color);
    legend.innerHTML = `<i></i>${escapeHtml(term)}`;
    els.chartLegend.appendChild(legend);
  });
}

function renderHeatmap(dataset) {
  const companies = dataset.companies || [];
  const terms = dataset.terms || Object.keys(dataset.series || {});
  els.heatmapPeriod.textContent = dataset.periods?.at(-1) || "Latest period";
  els.heatmap.innerHTML = "";
  els.heatmap.style.gridTemplateColumns = `minmax(100px, 1.1fr) repeat(${terms.length}, minmax(86px, 1fr))`;

  const blank = document.createElement("div");
  blank.className = "heatmap-cell heatmap-header";
  blank.textContent = "Company";
  els.heatmap.appendChild(blank);
  terms.forEach(term => {
    const h = document.createElement("div");
    h.className = "heatmap-cell heatmap-header";
    h.textContent = term;
    els.heatmap.appendChild(h);
  });

  companies.forEach(company => {
    const companyCell = document.createElement("div");
    companyCell.className = "heatmap-cell heatmap-company";
    companyCell.textContent = company;
    els.heatmap.appendChild(companyCell);
    terms.forEach(term => {
      const value = Number(dataset.latestByCompany?.[company]?.[term] || 0);
      const cell = document.createElement("div");
      cell.className = `heatmap-cell heat-${heatLevel(value, dataset, term)}`;
      cell.textContent = value;
      cell.title = `${company} · ${term}: ${value}`;
      els.heatmap.appendChild(cell);
    });
  });
}

function heatLevel(value, dataset, term) {
  if (!value) return 0;
  const vals = (dataset.companies || []).map(c => Number(dataset.latestByCompany?.[c]?.[term] || 0));
  const max = Math.max(...vals, 1);
  const ratio = value / max;
  if (ratio <= .2) return 1;
  if (ratio <= .4) return 2;
  if (ratio <= .6) return 3;
  if (ratio <= .8) return 4;
  return 5;
}

function renderExcerpts(dataset) {
  const excerpts = dataset.excerpts || [];
  els.excerptList.innerHTML = "";
  if (!excerpts.length) {
    els.excerptList.innerHTML = '<p class="empty-note">No matched excerpts available for this dataset. Paste full transcript text to generate context snippets automatically.</p>';
    return;
  }
  const start = state.excerptOffset % excerpts.length;
  const shown = Array.from({ length: Math.min(3, excerpts.length) }, (_, i) => excerpts[(start + i) % excerpts.length]);
  shown.forEach(item => {
    const card = document.createElement("article");
    card.className = "excerpt-card";
    card.innerHTML = `
      <div class="excerpt-meta"><span>${escapeHtml(item.ticker)} · ${escapeHtml(item.period || "")}</span><span>${escapeHtml(item.speaker || "Management")}</span></div>
      <blockquote>${highlightTerm(item.text, item.term)}</blockquote>
    `;
    els.excerptList.appendChild(card);
  });
}

function toggleKeyVisibility() {
  const visible = els.apiKey.type === "text";
  els.apiKey.type = visible ? "password" : "text";
  els.toggleKey.textContent = visible ? "Show" : "Hide";
}

async function runLiveAnalysis() {
  els.liveError.textContent = "";
  const apiKey = els.apiKey.value.trim();
  const tickers = els.liveTickers.value.split(",").map(x => x.trim().toUpperCase()).filter(Boolean).slice(0, 25);
  const terms = selectedTerms(6);
  const dateFrom = els.dateFrom.value;
  const dateTo = els.dateTo.value;

  if (!apiKey) return showLiveError("Add an earningscalls.dev API key first.");
  if (!tickers.length) return showLiveError("Add at least one ticker.");
  if (!terms.length) return showLiveError("Select at least one buzzword.");
  if (!dateFrom || !dateTo || dateFrom > dateTo) return showLiveError("Choose a valid date range.");

  const periods = buildPeriods(dateFrom, dateTo, 6);
  const total = periods.length * terms.length;
  let done = 0;
  showProgress("Searching earnings calls…", done, total);

  const series = Object.fromEntries(terms.map(term => [term, []]));
  const latestByCompany = Object.fromEntries(tickers.map(ticker => [ticker, Object.fromEntries(terms.map(term => [term, 0]))]));
  const companyNames = {};
  let callsAnalyzed = 0;

  try {
    for (const term of terms) {
      for (let p = 0; p < periods.length; p++) {
        const period = periods[p];
        const data = await searchByTicker({ apiKey, term, tickers, from: period.from, to: period.to });
        const results = Array.isArray(data.results) ? data.results : [];
        const aggregate = results.reduce((sum, item) => sum + Number(item.calls_matched || item.matches || 0), 0);
        series[term].push(aggregate);
        if (p === periods.length - 1) {
          results.forEach(item => {
            const ticker = String(item.ticker || "").toUpperCase();
            if (!ticker || !latestByCompany[ticker]) return;
            latestByCompany[ticker][term] = Number(item.calls_matched || item.matches || 0);
            if (item.company_name) companyNames[ticker] = item.company_name;
          });
        }
        callsAnalyzed = Math.max(callsAnalyzed, Number(data.total_calls || 0));
        done += 1;
        showProgress(`Searching “${term}” · ${period.label}`, done, total);
      }
    }

    const dataset = {
      source: "live",
      terms,
      periods: periods.map(p => p.label),
      companies: tickers,
      companyNames,
      callsAnalyzed: callsAnalyzed || sumLatest(latestByCompany),
      series,
      latestByCompany,
      excerpts: []
    };
    hideProgress();
    setDataset(dataset);
  } catch (error) {
    hideProgress();
    const message = error?.message || "Live search failed.";
    showLiveError(message.includes("Failed to fetch")
      ? "Browser request was blocked or the API could not be reached. Check the key/plan, or use Paste / upload mode for a no-API workflow."
      : message);
  }
}

async function searchByTicker({ apiKey, term, tickers, from, to }) {
  const params = new URLSearchParams({
    q: term,
    tickers: tickers.join(","),
    date_from: from,
    date_to: to
  });
  const response = await fetch(`https://earningscalls.dev/api/v1/search/by_ticker?${params.toString()}`, {
    headers: { "X-API-Key": apiKey, "Accept": "application/json" }
  });
  let data = {};
  try { data = await response.json(); } catch { /* ignored */ }
  if (!response.ok) {
    const detail = data.message || data.error || `API returned ${response.status}`;
    throw new Error(detail);
  }
  return data;
}

function buildPeriods(from, to, maxPeriods = 6) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const months = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const groupSize = Math.max(1, Math.ceil(months.length / maxPeriods));
  const periods = [];
  for (let i = 0; i < months.length; i += groupSize) {
    const groupStart = months[i];
    const next = new Date(months[Math.min(i + groupSize, months.length - 1)] || end);
    let groupEnd;
    if (i + groupSize < months.length) {
      groupEnd = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), 0));
    } else groupEnd = end;
    const actualStart = i === 0 ? start : groupStart;
    periods.push({
      from: isoDate(actualStart),
      to: isoDate(groupEnd),
      label: labelPeriod(actualStart, groupEnd)
    });
  }
  return periods.slice(-maxPeriods);
}

function labelPeriod(start, end) {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (sameYear && start.getUTCMonth() === end.getUTCMonth()) return `${months[start.getUTCMonth()]} ${String(start.getUTCFullYear()).slice(-2)}`;
  return `${months[start.getUTCMonth()]}–${months[end.getUTCMonth()]} '${String(end.getUTCFullYear()).slice(-2)}`;
}

function showLiveError(msg) { els.liveError.textContent = msg; }

function addPastedTranscript() {
  const ticker = els.pasteTicker.value.trim().toUpperCase() || "CALL";
  const period = els.pastePeriod.value.trim() || "Unspecified period";
  const text = els.pasteText.value.trim();
  if (!text) return;
  state.transcripts.push({ id: cryptoId(), ticker, period, text, source: "paste" });
  els.pasteText.value = "";
  renderLibrary();
}

async function addTranscriptFiles(event) {
  const files = Array.from(event.target.files || []);
  for (const file of files) {
    const text = await file.text();
    if (!text.trim()) continue;
    const meta = parseFilename(file.name);
    state.transcripts.push({ id: cryptoId(), ticker: meta.ticker, period: meta.period, text, source: file.name });
  }
  event.target.value = "";
  renderLibrary();
}

function parseFilename(name) {
  const base = name.replace(/\.(txt|md)$/i, "");
  const ticker = (base.match(/^([A-Za-z]{1,6})(?:[_\-\s]|$)/)?.[1] || base.split(/[_\-\s]/)[0] || "CALL").toUpperCase();
  const year = base.match(/20\d{2}/)?.[0];
  const q = base.match(/Q[1-4]/i)?.[0]?.toUpperCase();
  return { ticker, period: [year, q].filter(Boolean).join(" ") || base };
}

function renderLibrary() {
  els.libraryCount.textContent = `${state.transcripts.length} ${state.transcripts.length === 1 ? "transcript" : "transcripts"}`;
  els.runPaste.disabled = state.transcripts.length === 0;
  els.transcriptLibrary.innerHTML = "";
  if (!state.transcripts.length) {
    els.transcriptLibrary.innerHTML = '<p class="empty-note">Add transcripts to analyze them locally. Nothing is uploaded anywhere.</p>';
    return;
  }
  state.transcripts.forEach(item => {
    const row = document.createElement("div");
    row.className = "transcript-item";
    row.innerHTML = `<span><strong>${escapeHtml(item.ticker)}</strong> · ${escapeHtml(item.period)} · ${formatNumber(wordCount(item.text))} words</span>`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Remove transcript";
    remove.addEventListener("click", () => {
      state.transcripts = state.transcripts.filter(x => x.id !== item.id);
      renderLibrary();
    });
    row.appendChild(remove);
    els.transcriptLibrary.appendChild(row);
  });
}

function runPasteAnalysis() {
  const terms = selectedTerms();
  if (!state.transcripts.length || !terms.length) return;
  showProgress("Scanning transcript text locally…", 0, state.transcripts.length);

  setTimeout(() => {
    const periods = uniqueSorted(state.transcripts.map(x => x.period));
    const companies = uniqueSorted(state.transcripts.map(x => x.ticker));
    const series = Object.fromEntries(terms.map(term => [term, periods.map(() => 0)]));
    const latestByCompany = Object.fromEntries(companies.map(c => [c, Object.fromEntries(terms.map(t => [t, 0]))]));
    const excerpts = [];

    state.transcripts.forEach((call, idx) => {
      const periodIndex = periods.indexOf(call.period);
      terms.forEach(term => {
        const count = countPhrase(call.text, term);
        series[term][periodIndex] += count;
        if (call.period === periods.at(-1)) latestByCompany[call.ticker][term] += count;
        if (count > 0) {
          const snippet = extractSnippet(call.text, term);
          if (snippet) excerpts.push({ ticker: call.ticker, period: call.period, term, speaker: inferSpeaker(snippet), text: snippet });
        }
      });
      showProgress(`Scanned ${call.ticker} · ${call.period}`, idx + 1, state.transcripts.length);
    });

    const dataset = {
      source: "paste",
      terms,
      periods,
      companies,
      callsAnalyzed: state.transcripts.length,
      series,
      latestByCompany,
      excerpts: dedupeExcerpts(excerpts).slice(0, 30)
    };
    hideProgress();
    setDataset(dataset);
  }, 120);
}

function countPhrase(text, term) {
  const pattern = new RegExp(escapeRegex(term), "gi");
  return (text.match(pattern) || []).length;
}

function extractSnippet(text, term) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const lower = cleaned.toLowerCase();
  const index = lower.indexOf(term.toLowerCase());
  if (index < 0) return "";
  let start = Math.max(0, index - 150);
  let end = Math.min(cleaned.length, index + term.length + 220);
  const left = cleaned.lastIndexOf(". ", index);
  if (left >= 0 && left > start - 80) start = left + 2;
  const right = cleaned.indexOf(". ", index + term.length);
  if (right >= 0 && right < end + 80) end = right + 1;
  return `${start > 0 ? "…" : ""}${cleaned.slice(start, end).trim()}${end < cleaned.length ? "…" : ""}`;
}

function inferSpeaker(snippet) {
  const match = snippet.match(/(?:^|\n|\.\s)([A-Z][A-Za-z .'-]{2,35}):/);
  return match?.[1] || "Transcript";
}

function dedupeExcerpts(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.ticker}|${item.term}|${item.text.slice(0, 80)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function showProgress(label, done, total) {
  els.progressCard.hidden = false;
  els.progressLabel.textContent = label;
  els.progressCount.textContent = `${done} / ${total}`;
  els.progressBar.style.width = `${total ? Math.min(100, (done / total) * 100) : 0}%`;
}

function hideProgress() {
  setTimeout(() => { els.progressCard.hidden = true; }, 220);
}

function sumLatest(matrix) {
  return Object.values(matrix).reduce((sum, row) => sum + Object.values(row).reduce((s, v) => s + Number(v || 0), 0), 0);
}

function formatNumber(value) { return new Intl.NumberFormat("en-US").format(Math.round(Number(value || 0))); }
function compactNumber(value) { return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0)); }
function formatPct(value) {
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  const sign = n > 0 ? "+" : "";
  return `${sign}${Math.round(n)}%`;
}
function wordCount(text) { return (text.trim().match(/\S+/g) || []).length; }
function uniqueSorted(values) { return Array.from(new Set(values)).sort((a, b) => naturalPeriodCompare(a, b)); }
function naturalPeriodCompare(a, b) {
  const ay = Number(String(a).match(/20\d{2}/)?.[0] || 0), by = Number(String(b).match(/20\d{2}/)?.[0] || 0);
  if (ay !== by) return ay - by;
  const aq = Number(String(a).match(/Q([1-4])/i)?.[1] || 0), bq = Number(String(b).match(/Q([1-4])/i)?.[1] || 0);
  if (aq !== bq) return aq - bq;
  return String(a).localeCompare(String(b));
}
function escapeRegex(str) { return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function escapeHtml(str) { return String(str ?? "").replace(/[&<>"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch])); }
function highlightTerm(text, term) {
  const safe = escapeHtml(text);
  if (!term) return safe;
  const pattern = new RegExp(`(${escapeRegex(escapeHtml(term))})`, "ig");
  return safe.replace(pattern, "<mark>$1</mark>");
}
function isoDate(date) { return date.toISOString().slice(0, 10); }
function cryptoId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

init();
