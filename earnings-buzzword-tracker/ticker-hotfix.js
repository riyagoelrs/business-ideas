/* SignalCall ticker hotfix: keep the ticker field fully editable and route only submit actions to preview mode. */
(function () {
  const PREVIEW_SENTINEL = "__SIGNALCALL_PREVIEW__";
  const WATCH_KEY = "signalcall-watchlist-v1";

  function cleanTicker(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 10);
  }

  function forcePreview() {
    const key = document.getElementById("apiKey");
    if (key) key.value = PREVIEW_SENTINEL;
    const error = document.getElementById("liveError");
    if (error) error.textContent = "";
  }

  function message(text, isError) {
    const el = document.getElementById("tickerLaunchMessage");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("is-error", !!isError);
  }

  function loadWatchlist() {
    try {
      const raw = JSON.parse(localStorage.getItem(WATCH_KEY) || "[]");
      return Array.isArray(raw) ? raw.map(cleanTicker).filter(Boolean).slice(0, 20) : [];
    } catch (_) {
      return [];
    }
  }

  function saveWatchlist(list) {
    try { localStorage.setItem(WATCH_KEY, JSON.stringify(list)); } catch (_) {}
  }

  function renderWatchlist() {
    const holder = document.getElementById("watchlistChips");
    const empty = document.getElementById("watchlistEmpty");
    const analyze = document.getElementById("analyzeWatchlist");
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
        const input = document.getElementById("tickerLaunchInput");
        if (input) {
          input.value = ticker;
          input.focus();
        }
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "watchlist-remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${ticker} from watchlist`);
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

  function runPreviewFor(tickers) {
    const clean = tickers.map(cleanTicker).filter(Boolean).slice(0, 15);
    if (!clean.length) return message("Enter a ticker first, for example NVDA.", true);
    const liveTickers = document.getElementById("liveTickers");
    if (liveTickers) liveTickers.value = clean.join(",");
    forcePreview();
    const run = document.getElementById("runLive");
    if (run) run.click();
  }

  function wire() {
    const existingForm = document.getElementById("tickerLaunchForm");
    if (!existingForm || existingForm.dataset.hotfixed === "true") return;

    const form = existingForm.cloneNode(true);
    form.dataset.hotfixed = "true";
    existingForm.replaceWith(form);

    const input = form.querySelector("#tickerLaunchInput");
    if (input) {
      input.disabled = false;
      input.readOnly = false;
      input.removeAttribute("readonly");
      input.removeAttribute("disabled");
      input.style.pointerEvents = "auto";
      input.style.userSelect = "text";
      input.setAttribute("autocomplete", "off");
      input.addEventListener("input", () => {
        input.value = cleanTicker(input.value);
        message("Press Analyze company when you're ready.", false);
      });
      input.addEventListener("focus", () => input.select());
    }

    form.addEventListener("submit", event => {
      event.preventDefault();
      event.stopPropagation();
      runPreviewFor([input?.value || ""]);
    });

    const add = form.querySelector("#addTickerWatch");
    if (add) {
      add.addEventListener("click", () => {
        const ticker = cleanTicker(input?.value || "");
        if (!ticker) return message("Enter a ticker before adding it to your watchlist.", true);
        const list = loadWatchlist();
        if (!list.includes(ticker)) list.push(ticker);
        saveWatchlist(list.slice(0, 20));
        renderWatchlist();
        message(`${ticker} added to your watchlist.`, false);
      });
    }

    const oldAnalyze = document.getElementById("analyzeWatchlist");
    if (oldAnalyze) {
      const freshAnalyze = oldAnalyze.cloneNode(true);
      oldAnalyze.replaceWith(freshAnalyze);
      freshAnalyze.addEventListener("click", () => runPreviewFor(loadWatchlist()));
    }

    renderWatchlist();
  }

  wire();
  setTimeout(wire, 0);
})();
