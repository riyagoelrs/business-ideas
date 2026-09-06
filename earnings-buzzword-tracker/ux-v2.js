/* SignalCall UX v2: make automatic transcript pulling the primary workflow. */

(function () {
  const API_BASE = "https://earningscalls.dev/api/v1";

  function boot() {
    addHowToGuide();
    relabelWorkflow();
    addCallLimitControl();
    replaceLiveHandler();
    addInlineStyles();
    if (typeof setMode === "function") setMode("live");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function addHowToGuide() {
    const hero = document.querySelector(".hero");
    if (!hero || document.getElementById("howToUse")) return;
    const section = document.createElement("section");
    section.id = "howToUse";
    section.className = "how-to-card";
    section.innerHTML = `
      <div class="how-to-title">
        <p class="eyebrow">HOW TO USE SIGNALCALL</p>
        <h2>Three steps. The site pulls the calls for you.</h2>
      </div>
      <div class="how-to-steps">
        <div class="how-step"><span>1</span><div><strong>Enter companies</strong><small>Type tickers like NVDA, META, WMT, NKE.</small></div></div>
        <div class="how-step"><span>2</span><div><strong>Choose the language</strong><small>Select AI, tariffs, GLP-1, consumer pressure — or add your own phrase.</small></div></div>
        <div class="how-step"><span>3</span><div><strong>Pull + analyze</strong><small>SignalCall fetches recent earnings transcripts and builds the charts automatically.</small></div></div>
      </div>
      <p class="how-to-note"><strong>Data access:</strong> the transcript provider requires an API key for programmatic full-text transcripts. You do not need to paste transcript text unless you want to use the manual fallback.</p>
    `;
    hero.insertAdjacentElement("afterend", section);
  }

  function relabelWorkflow() {
    const liveTab = document.querySelector('.mode-tab[data-mode="live"]');
    const demoTab = document.querySelector('.mode-tab[data-mode="demo"]');
    const pasteTab = document.querySelector('.mode-tab[data-mode="paste"]');
    if (liveTab) liveTab.textContent = "Pull transcripts";
    if (demoTab) demoTab.textContent = "Try demo";
    if (pasteTab) pasteTab.textContent = "Manual fallback";

    const livePanel = document.querySelector('.mode-panel[data-panel="live"]');
    if (livePanel) {
      const eyebrow = livePanel.querySelector(".eyebrow");
      if (!eyebrow) {
        const intro = document.createElement("div");
        intro.className = "live-intro";
        intro.innerHTML = `<p class="eyebrow">START HERE</p><h2>Enter a watchlist and SignalCall will fetch the transcripts.</h2><p>Choose a date range and how many recent calls to analyze per company. Then select your buzzwords below and click <strong>Pull & analyze transcripts</strong>.</p>`;
        livePanel.prepend(intro);
      }
      const note = livePanel.querySelector(".mode-actions .fine-print");
      if (note) note.innerHTML = `SignalCall first pulls each ticker's call history, then retrieves the transcript for each selected call and counts your phrases locally. <strong>Paste/upload is not required.</strong>`;
    }

    const run = document.getElementById("runLive");
    if (run) run.textContent = "Pull & analyze transcripts";

    const liveTickerLabel = document.querySelector('label.field:has(#liveTickers) > span');
    if (liveTickerLabel) liveTickerLabel.textContent = "1. Companies / tickers";

    const keyLabel = document.querySelector('label.field:has(#apiKey) > span');
    if (keyLabel) keyLabel.textContent = "2. Transcript API key";

    const termHead = document.querySelector(".term-head h3");
    if (termHead) termHead.textContent = "3. Choose the narratives you care about.";

    const limitNote = document.getElementById("termLimitNote");
    if (limitNote) limitNote.textContent = "Select any number of phrases. They are counted locally after the transcripts are pulled.";
  }

  function addCallLimitControl() {
    if (document.getElementById("callsPerCompany")) return;
    const dateTo = document.getElementById("dateTo");
    if (!dateTo) return;
    const label = dateTo.closest("label.field");
    if (!label) return;
    const field = document.createElement("label");
    field.className = "field";
    field.innerHTML = `
      <span>Calls per company</span>
      <select id="callsPerCompany">
        <option value="2">Latest 2</option>
        <option value="4" selected>Latest 4</option>
        <option value="6">Latest 6</option>
        <option value="8">Latest 8</option>
      </select>
      <small>Within the selected date range.</small>
    `;
    label.insertAdjacentElement("afterend", field);
  }

  function replaceLiveHandler() {
    const oldButton = document.getElementById("runLive");
    if (!oldButton) return;
    const newButton = oldButton.cloneNode(true);
    oldButton.replaceWith(newButton);
    if (typeof els === "object" && els) els.runLive = newButton;
    newButton.addEventListener("click", runAutoPull);
  }

  async function runAutoPull() {
    const errorEl = document.getElementById("liveError");
    if (errorEl) errorEl.textContent = "";

    const apiKey = document.getElementById("apiKey")?.value.trim();
    const tickers = (document.getElementById("liveTickers")?.value || "")
      .split(",")
      .map(x => x.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 15);
    const dateFrom = document.getElementById("dateFrom")?.value;
    const dateTo = document.getElementById("dateTo")?.value;
    const callsPerCompany = Number(document.getElementById("callsPerCompany")?.value || 4);
    const terms = typeof selectedTerms === "function" ? selectedTerms() : [];

    if (!apiKey) return fail("Add your EarningsCalls.dev API key. The provider requires a key for automatic transcript access.");
    if (!tickers.length) return fail("Enter at least one ticker, for example: NVDA,META,WMT,NKE.");
    if (!terms.length) return fail("Select at least one buzzword below.");
    if (!dateFrom || !dateTo || dateFrom > dateTo) return fail("Choose a valid date range.");

    const histories = [];
    showProgressSafe("Finding earnings calls…", 0, tickers.length);

    try {
      for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        showProgressSafe(`Finding ${ticker} calls…`, i, tickers.length);
        const companyPayload = await apiGet(`/companies/ticker/${encodeURIComponent(ticker)}`, apiKey);
        const companyData = companyPayload?.data ?? companyPayload ?? {};
        const calls = Array.isArray(companyData.earnings_calls)
          ? companyData.earnings_calls
          : Array.isArray(companyData.calls)
            ? companyData.calls
            : [];
        const filtered = calls
          .map(call => normalizeCall(call, ticker))
          .filter(call => call.id && call.date && call.date >= dateFrom && call.date <= dateTo)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, callsPerCompany);
        histories.push(...filtered);
      }

      if (!histories.length) throw new Error("No earnings calls were found for those tickers in the selected date range.");

      const transcripts = [];
      let previewOnlyCount = 0;
      for (let i = 0; i < histories.length; i++) {
        const call = histories[i];
        showProgressSafe(`Pulling ${call.ticker} · ${call.period} transcript…`, i, histories.length);
        const transcriptPayload = await apiGet(`/transcripts/${call.id}?format=value`, apiKey);
        const text = extractTranscriptText(transcriptPayload);
        if (text.length < 500) previewOnlyCount += 1;
        if (text) transcripts.push({ ...call, text });
      }

      if (!transcripts.length) throw new Error("Calls were found, but the transcript provider did not return readable transcript text for this API plan.");

      const dataset = analyzePulledTranscripts(transcripts, terms, tickers);
      hideProgressSafe();
      if (typeof setDataset === "function") setDataset(dataset);

      if (previewOnlyCount > 0 && errorEl) {
        errorEl.className = "inline-error api-warning";
        errorEl.textContent = `${previewOnlyCount} transcript${previewOnlyCount === 1 ? "" : "s"} returned only a short preview. Full-text analysis requires the provider's full-access plan.`;
      }
    } catch (err) {
      hideProgressSafe();
      fail(normalizeApiError(err));
    }
  }

  function normalizeCall(call, fallbackTicker) {
    const rawDate = call.event_date_time || call.date || call.event_date || call.created_at || "";
    const date = String(rawDate).slice(0, 10);
    return {
      id: call.id || call.earnings_call_id || call.earningsId || call.earnings_id,
      ticker: String(call.company_ticker || call.ticker || call.stock_symbol || fallbackTicker).split(":")[0].toUpperCase(),
      company: call.company_name || call.company || fallbackTicker,
      date,
      period: quarterLabel(date),
      title: call.transcript_title || call.title || "Earnings call"
    };
  }

  function extractTranscriptText(payload) {
    const data = payload?.data ?? payload ?? {};
    const direct = [
      data.transcript,
      data.transcript_text,
      data.text,
      data.text_content,
      data.content,
      data.value,
      payload?.transcript,
      payload?.text,
      payload?.value
    ].find(v => typeof v === "string" && v.trim());
    if (direct) return direct.trim();

    const arrays = [data.segments, data.components, data.speakers, payload?.segments, payload?.components].filter(Array.isArray);
    for (const arr of arrays) {
      const joined = arr.map(item => item?.text_content || item?.text || item?.content || item?.value || "").filter(Boolean).join("\n\n");
      if (joined.trim()) return joined.trim();
    }

    if (Array.isArray(data)) {
      const joined = data.map(item => item?.text_content || item?.text || item?.content || "").filter(Boolean).join("\n\n");
      if (joined.trim()) return joined.trim();
    }
    return "";
  }

  function analyzePulledTranscripts(transcripts, terms, requestedTickers) {
    const periods = [...new Set(transcripts.map(t => t.period))].sort(periodCompare);
    const companies = [...new Set(transcripts.map(t => t.ticker))];
    const series = Object.fromEntries(terms.map(term => [term, periods.map(() => 0)]));
    const latestByCompany = Object.fromEntries(companies.map(c => [c, Object.fromEntries(terms.map(t => [t, 0]))]));
    const excerpts = [];

    const latestDateByCompany = {};
    transcripts.forEach(t => {
      if (!latestDateByCompany[t.ticker] || t.date > latestDateByCompany[t.ticker]) latestDateByCompany[t.ticker] = t.date;
    });

    transcripts.forEach(call => {
      const p = periods.indexOf(call.period);
      terms.forEach(term => {
        const count = countPhraseLocal(call.text, term);
        if (p >= 0) series[term][p] += count;
        if (call.date === latestDateByCompany[call.ticker]) latestByCompany[call.ticker][term] += count;
        if (count > 0) {
          const snippet = extractSnippetLocal(call.text, term);
          if (snippet) excerpts.push({ ticker: call.ticker, period: call.period, term, speaker: "Transcript", text: snippet });
        }
      });
    });

    return {
      source: "live",
      terms,
      periods,
      companies: companies.length ? companies : requestedTickers,
      callsAnalyzed: transcripts.length,
      series,
      latestByCompany,
      excerpts: dedupeLocal(excerpts).slice(0, 40)
    };
  }

  async function apiGet(path, apiKey) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "X-API-Key": apiKey, "Accept": "application/json" }
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    if (!response.ok) {
      const message = payload?.message || payload?.detail || payload?.error || `Transcript API returned ${response.status}.`;
      throw new Error(String(message));
    }
    return payload;
  }

  function countPhraseLocal(text, term) {
    const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return (String(text).match(new RegExp(escaped, "gi")) || []).length;
  }

  function extractSnippetLocal(text, term) {
    const cleaned = String(text).replace(/\s+/g, " ").trim();
    const index = cleaned.toLowerCase().indexOf(String(term).toLowerCase());
    if (index < 0) return "";
    let start = Math.max(0, index - 145);
    let end = Math.min(cleaned.length, index + String(term).length + 230);
    const left = cleaned.lastIndexOf(". ", index);
    const right = cleaned.indexOf(". ", index + String(term).length);
    if (left >= 0 && left > start - 80) start = left + 2;
    if (right >= 0 && right < end + 80) end = right + 1;
    return `${start > 0 ? "…" : ""}${cleaned.slice(start, end).trim()}${end < cleaned.length ? "…" : ""}`;
  }

  function dedupeLocal(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = `${item.ticker}|${item.period}|${item.term}|${item.text.slice(0, 90)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function quarterLabel(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return date || "Unknown";
    const [year, month] = date.split("-").map(Number);
    return `${year} Q${Math.ceil(month / 3)}`;
  }

  function periodCompare(a, b) {
    const am = String(a).match(/(20\d{2}) Q([1-4])/);
    const bm = String(b).match(/(20\d{2}) Q([1-4])/);
    if (am && bm) return Number(am[1]) * 10 + Number(am[2]) - (Number(bm[1]) * 10 + Number(bm[2]));
    return String(a).localeCompare(String(b));
  }

  function normalizeApiError(err) {
    const msg = String(err?.message || err || "Automatic transcript pull failed.");
    if (/failed to fetch/i.test(msg)) return "The browser could not reach the transcript API. This can happen if the provider blocks browser requests; the manual fallback will still work.";
    if (/401|unauthor|api key/i.test(msg)) return "The transcript API rejected the key. Check that the key is valid and active.";
    if (/403|plan|preview|upgrade|full access/i.test(msg)) return "The provider found the calls, but your API plan does not include full transcript access. Full-text API access is required for automatic word counting.";
    return msg;
  }

  function fail(message) {
    const el = document.getElementById("liveError");
    if (el) {
      el.className = "inline-error";
      el.textContent = message;
    }
  }

  function showProgressSafe(label, done, total) {
    if (typeof showProgress === "function") showProgress(label, done, total);
  }

  function hideProgressSafe() {
    if (typeof hideProgress === "function") hideProgress();
  }

  function addInlineStyles() {
    if (document.getElementById("uxV2Styles")) return;
    const style = document.createElement("style");
    style.id = "uxV2Styles";
    style.textContent = `
      .how-to-card{background:#20251d;color:#fff;border-radius:20px;padding:24px 26px;margin:0 0 18px;display:grid;grid-template-columns:minmax(220px,.65fr) minmax(0,1.6fr);gap:26px;box-shadow:0 18px 50px rgba(32,37,29,.08)}
      .how-to-card .eyebrow{color:#b9c0b2}.how-to-title h2{margin:0;font-size:24px;line-height:1.12;letter-spacing:-.03em}
      .how-to-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.how-step{display:flex;gap:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:13px;padding:13px}.how-step>span{flex:0 0 26px;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#c9ff4a;color:#20251d;font:700 11px "IBM Plex Mono",monospace}.how-step strong,.how-step small{display:block}.how-step strong{font-size:13px}.how-step small{margin-top:4px;color:#c8cdc3;font-size:11px;line-height:1.4}
      .how-to-note{grid-column:1/-1;margin:0;padding-top:14px;border-top:1px solid rgba(255,255,255,.12);color:#c8cdc3;font-size:11px;line-height:1.5}.how-to-note strong{color:#fff}.live-intro{margin-bottom:18px}.live-intro h2{margin:0;font-size:22px;letter-spacing:-.025em}.live-intro p:last-child{margin:8px 0 0;color:#6d7168;font-size:13px;line-height:1.5}.api-warning{color:#806112!important}
      @media(max-width:900px){.how-to-card{grid-template-columns:1fr}.how-to-steps{grid-template-columns:1fr}.how-to-note{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
