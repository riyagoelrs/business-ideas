/* SignalCall preview router guard.
   Prevent hidden credential autofill from accidentally routing prototype actions into the live transcript API. */
(function () {
  const PREVIEW_SENTINEL = "__SIGNALCALL_PREVIEW__";

  function forcePreviewRoute() {
    const key = document.getElementById("apiKey");
    if (key) {
      key.value = PREVIEW_SENTINEL;
      key.setAttribute("autocomplete", "off");
      key.setAttribute("data-lpignore", "true");
      key.setAttribute("data-1p-ignore", "true");
    }
    const error = document.getElementById("liveError");
    if (error && /api|key|unauthor|rejected/i.test(error.textContent || "")) error.textContent = "";
  }

  document.addEventListener("click", function (event) {
    const target = event.target instanceof Element ? event.target.closest("#runLive, .ticker-analyze, #analyzeWatchlist") : null;
    if (target) forcePreviewRoute();
  }, true);

  document.addEventListener("submit", function (event) {
    if (event.target?.id === "tickerLaunchForm") forcePreviewRoute();
  }, true);

  window.addEventListener("pageshow", forcePreviewRoute);
  forcePreviewRoute();
})();
