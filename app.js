const issueCatalog = [
  {
    id: "font-drift",
    title: "Font system is inconsistent",
    category: "Typography",
    severity: "high",
    autoFix: true,
    consistency: true,
    penalty: 14,
    slides: [1, 4, 7],
    detail: "Titles, body copy, chart labels, or captions appear to use different font families or fallback styles.",
    aiAction: "Normalize all text styles to the selected style system and rebuild title/body/label sizing.",
    manualAction: "Review any brand-specific typeface requirements before exporting the final source deck."
  },
  {
    id: "logo-grid",
    title: "Logos and recurring furniture are off-grid",
    category: "Alignment",
    severity: "high",
    autoFix: true,
    consistency: true,
    penalty: 13,
    slides: [1, 3, 6, 9],
    detail: "Brand marks, slide numbers, and recurring footers do not share one x/y anchor across the deck.",
    aiAction: "Snap logos, page numbers, source notes, and footers to a shared grid.",
    manualAction: "Check partner or customer logo lockups that should not be resized."
  },
  {
    id: "page-numbers",
    title: "Page numbers are missing or inconsistent",
    category: "Pagination",
    severity: "medium",
    autoFix: true,
    consistency: true,
    penalty: 8,
    slides: [2, 5, 8],
    detail: "Some slides appear to have missing page numbers, inconsistent placement, or mismatched number styling.",
    aiAction: "Insert a consistent page-number component and align it to the footer grid.",
    manualAction: "Remove page numbers only from intentional cover, divider, or appendix slides."
  },
  {
    id: "capitalization",
    title: "Capitalization rules are mixed",
    category: "Copy consistency",
    severity: "medium",
    autoFix: true,
    consistency: true,
    penalty: 9,
    slides: [2, 6, 10],
    detail: "Headlines mix title case, sentence case, all caps, and startup emphasis casing.",
    aiAction: "Apply title case to headings, sentence case to body copy, and preserve acronyms.",
    manualAction: "Review product names and acronyms so the case normalization does not flatten brand language."
  },
  {
    id: "spelling",
    title: "Potential spelling and terminology drift",
    category: "Copy QA",
    severity: "medium",
    autoFix: true,
    consistency: true,
    penalty: 8,
    slides: [4, 8, 12],
    detail: "Repeated business terms may be spelled or punctuated differently across the deck.",
    aiAction: "Standardize repeated terms, hyphenation, currency formats, and acronym punctuation.",
    manualAction: "Confirm company, customer, investor, and product names against the source of truth."
  },
  {
    id: "footnotes",
    title: "Footnotes and source lines are uneven",
    category: "Footnotes",
    severity: "medium",
    autoFix: true,
    consistency: true,
    penalty: 7,
    slides: [3, 5, 11],
    detail: "Source notes and disclaimers have inconsistent type size, contrast, punctuation, or placement.",
    aiAction: "Normalize footnote style, align source notes to the footer grid, and standardize punctuation.",
    manualAction: "Confirm legal disclaimers and source citations are complete before sending externally."
  },
  {
    id: "chart-polish",
    title: "Charts need visual cleanup",
    category: "Charts",
    severity: "medium",
    autoFix: true,
    consistency: false,
    penalty: 9,
    slides: [5, 6, 9],
    detail: "Chart gutters, axis labels, bar spacing, legends, and number formats are visually uneven.",
    aiAction: "Rebuild chart spacing, label contrast, number formatting, and legend placement.",
    manualAction: "Validate the chart data and make sure the visual hierarchy supports the intended takeaway."
  },
  {
    id: "spacing",
    title: "Spacing rhythm is messy",
    category: "Layout",
    severity: "medium",
    autoFix: true,
    consistency: true,
    penalty: 8,
    slides: [1, 4, 10],
    detail: "Repeated modules have uneven padding between headings, body copy, charts, and callouts.",
    aiAction: "Reflow slide modules to 8 px spacing increments and align columns to the selected grid.",
    manualAction: "Review dense slides for message priority; spacing can reveal where content needs trimming."
  },
  {
    id: "contrast",
    title: "Small labels have low contrast",
    category: "Accessibility",
    severity: "low",
    autoFix: true,
    consistency: false,
    penalty: 5,
    slides: [6, 9, 12],
    detail: "Captions, axis labels, and footnotes are too light or too small for quick review.",
    aiAction: "Raise label contrast, set a minimum caption size, and normalize source-note weight.",
    manualAction: "Review any intentionally muted legal text or design-system exceptions."
  },
  {
    id: "content-callouts",
    title: "Callouts do not clearly state the takeaway",
    category: "Copywriting",
    severity: "medium",
    autoFix: false,
    consistency: false,
    penalty: 10,
    slides: [3, 7],
    detail: "Several slide callouts describe data without saying why it matters to the investor.",
    aiAction: "Draft sharper callout options for each affected slide.",
    manualAction: "Rewrite callouts so each one answers: why now, why this team, why this market, or why this metric matters."
  },
  {
    id: "narrative-gaps",
    title: "Narrative flow needs human review",
    category: "Story",
    severity: "low",
    autoFix: false,
    consistency: false,
    penalty: 6,
    slides: [2, 8, 13],
    detail: "The deck may jump between product, market, and traction without a clear connective thread.",
    aiAction: "Generate alternate section transitions and slide titles.",
    manualAction: "Decide the fundraising story arc: problem, insight, proof, scale, ask. Then remove slides that do not support it."
  }
];

const sampleDeck = {
  name: "Seed_Round_Messy_v17.pdf",
  type: "application/pdf",
  size: 6840000,
  text: "Inter Arial Calibri WHAT WE DO MARKET traction ARR EBITDA Gross Margin go-to-market go to market footnote SOURCE source Revnue growth",
  slideCount: 14
};

const state = {
  file: null,
  text: "",
  report: null,
  filter: "all",
  selectedIssueId: null,
  changeLog: [],
  styleSystem: "Inter",
  gridSystem: "24",
  sessionId: null,
  artifacts: null,
  backendActive: false
};

const dom = {
  deckInput: document.getElementById("deckInput"),
  dropzone: document.getElementById("dropzone"),
  sampleButton: document.getElementById("sampleButton"),
  scanAgainButton: document.getElementById("scanAgainButton"),
  exportButton: document.getElementById("exportButton"),
  applyAllButton: document.getElementById("applyAllButton"),
  markManualButton: document.getElementById("markManualButton"),
  fileName: document.getElementById("fileName"),
  scanStatus: document.getElementById("scanStatus"),
  scoreValue: document.getElementById("scoreValue"),
  scoreRing: document.getElementById("scoreRing"),
  projectedScore: document.getElementById("projectedScore"),
  scoreProgress: document.getElementById("scoreProgress"),
  summaryTitle: document.getElementById("summaryTitle"),
  summaryCopy: document.getElementById("summaryCopy"),
  openCount: document.getElementById("openCount"),
  autoCount: document.getElementById("autoCount"),
  manualCount: document.getElementById("manualCount"),
  fixedCount: document.getElementById("fixedCount"),
  deckCanvas: document.getElementById("deckCanvas"),
  issueList: document.getElementById("issueList"),
  issueInspector: document.getElementById("issueInspector"),
  changeLog: document.getElementById("changeLog"),
  styleSystem: document.getElementById("styleSystem"),
  gridSystem: document.getElementById("gridSystem"),
  tabs: [...document.querySelectorAll(".tab")]
};

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function extensionFor(file) {
  const match = (file.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "deck";
}

function estimateSlideCount(file, text) {
  if (file.slideCount) return file.slideCount;
  if (extensionFor(file) === "pdf") {
    const pages = text.match(/\/Type\s*\/Page\b/g);
    return Math.max(1, Math.min(80, pages?.length || Math.round((file.size || 1) / 420000)));
  }
  const pptxSlides = text.match(/ppt\/slides\/slide[0-9]+\.xml/g);
  return Math.max(1, Math.min(80, pptxSlides?.length || Math.round((file.size || 1) / 520000)));
}

function findFonts(text) {
  return ["Aptos", "Arial", "Calibri", "Helvetica", "Inter", "Georgia", "Times", "Montserrat"]
    .filter((font) => new RegExp(font, "i").test(text));
}

function findCaps(text) {
  return [...new Set(text.match(/\b[A-Z][A-Z0-9&-]{3,}\b/g) || [])].slice(0, 8);
}

async function readDeckText(file) {
  if (file.text) return file.text;
  const head = file.slice ? file.slice(0, Math.min(file.size || 0, 360000)) : file;
  if (head.arrayBuffer) {
    const buffer = await head.arrayBuffer();
    return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("File read failed")));
    reader.readAsText(head);
  });
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function applyBackendPayload(payload) {
  if (!payload?.ok || !payload.report) throw new Error(payload?.error || "Invalid backend response");
  state.sessionId = payload.sessionId;
  state.report = payload.report;
  state.changeLog = payload.changeLog || [];
  state.artifacts = payload.artifacts || null;
  state.backendActive = true;
  state.selectedIssueId = state.report.issues.find((issue) => issue.status !== "fixed")?.id || state.report.issues[0]?.id || null;
}

async function scanWithBackend(file) {
  const form = new FormData();
  form.append("deck", file, file.name || "deck");
  const response = await fetch("/api/scan", {
    method: "POST",
    body: form
  });
  if (!response.ok) throw new Error(`Scan request failed: ${response.status}`);
  applyBackendPayload(await response.json());
}

async function rescanWithBackend() {
  const payload = await postJson("/api/rescan", { sessionId: state.sessionId });
  applyBackendPayload(payload);
}

async function applyFixesWithBackend(payload) {
  const response = await postJson("/api/apply-fixes", {
    sessionId: state.sessionId,
    styleSystem: state.styleSystem,
    gridSystem: state.gridSystem,
    ...payload
  });
  applyBackendPayload(response);
}

function buildIssues(file, text, readWarning = false) {
  const slides = estimateSlideCount(file, text);
  const fonts = findFonts(text);
  const caps = findCaps(text);
  const fileName = file.name || "";
  const selectedIds = new Set([
    "font-drift",
    "logo-grid",
    "page-numbers",
    "capitalization",
    "spelling",
    "footnotes",
    "spacing"
  ]);

  if (extensionFor(file) === "pdf" || text.length > 3000 || file.size > 2000000) selectedIds.add("chart-polish");
  if (slides > 10 || file.size > 5000000) selectedIds.add("contrast");
  if (/seed|series|investor|pitch|fundraise/i.test(fileName) || slides > 8) selectedIds.add("content-callouts");
  if (slides > 12 || /v[0-9]+|final|updated/i.test(fileName)) selectedIds.add("narrative-gaps");

  return issueCatalog
    .filter((issue) => selectedIds.has(issue.id))
    .map((issue, index) => {
      const hydrated = {
        ...issue,
        status: state.report?.issues.find((oldIssue) => oldIssue.id === issue.id)?.status || "open",
        slides: issue.slides.map((slide) => Math.min(slides, slide)).filter((slide, slideIndex, all) => all.indexOf(slide) === slideIndex)
      };
      if (issue.id === "font-drift") {
        hydrated.detail = fonts.length > 1
          ? `Detected likely font references: ${fonts.join(", ")}. Collapse these into ${state.styleSystem}.`
          : "The deck appears to rely on generic or embedded fallback fonts. Locking the type system will reduce drift.";
      }
      if (issue.id === "capitalization" && caps.length > 1) {
        hydrated.detail = `All-caps tokens found: ${caps.join(", ")}. Preserve true acronyms and normalize the rest.`;
      }
      if (issue.id === "spelling" && /Revnue|teh|adress|recieve|occured/i.test(text)) {
        hydrated.detail = "Potential spelling errors or repeated terminology drift were detected in extracted deck text.";
      }
      if (readWarning && index === 0) {
        hydrated.detail += " Text extraction was limited, so this finding also uses metadata and layout heuristics.";
      }
      return hydrated;
    });
}

function scoreFor(issues) {
  const penalty = issues
    .filter((issue) => issue.status !== "fixed")
    .reduce((total, issue) => total + issue.penalty, 0);
  return Math.max(34, 100 - penalty);
}

function projectedScoreFor(issues) {
  const manualPenalty = issues
    .filter((issue) => issue.status !== "fixed" && !issue.autoFix)
    .reduce((total, issue) => total + issue.penalty, 0);
  return Math.max(34, 100 - manualPenalty);
}

function buildReport(file, text, readWarning = false) {
  const issues = buildIssues(file, text, readWarning);
  const slides = estimateSlideCount(file, text);
  return {
    fileName: file.name || "Sample deck",
    fileSize: file.size || 0,
    ext: extensionFor(file).toUpperCase(),
    slides,
    issues,
    readWarning
  };
}

async function scanFile(file, options = {}) {
  state.file = file;
  dom.fileName.textContent = `${file.name || "Sample deck"} (${formatBytes(file.size)})`;
  dom.scanStatus.textContent = options.rescan ? "Rescanning" : "Scanning";

  if (file instanceof File && !options.localOnly) {
    try {
      await scanWithBackend(file);
      dom.scanStatus.textContent = options.rescan ? "Backend rescan complete" : "Backend scan complete";
      render();
      return;
    } catch (error) {
      state.backendActive = false;
      state.sessionId = null;
      state.artifacts = null;
      dom.scanStatus.textContent = "Local fallback scan";
    }
  }

  try {
    state.text = await readDeckText(file);
    state.report = buildReport(file, state.text, false);
    dom.scanStatus.textContent = options.rescan ? "Rescan complete" : "Scan complete";
  } catch (error) {
    state.text = "";
    state.report = buildReport(file, "", true);
    dom.scanStatus.textContent = "Metadata scan complete";
  }

  state.sessionId = null;
  state.artifacts = null;
  state.selectedIssueId = state.report.issues.find((issue) => issue.status !== "fixed")?.id || state.report.issues[0]?.id || null;
  render();
}

async function rescanCurrentDeck() {
  if (state.sessionId) {
    dom.scanStatus.textContent = "Backend rescanning";
    try {
      await rescanWithBackend();
      dom.scanStatus.textContent = "Backend rescan complete";
      render();
      return;
    } catch (error) {
      dom.scanStatus.textContent = "Backend unavailable; local rescan";
    }
  }
  scanFile(state.file || sampleDeck, { rescan: true, localOnly: !state.file });
}

function counts() {
  const issues = state.report?.issues || [];
  return {
    open: issues.filter((issue) => issue.status !== "fixed").length,
    auto: issues.filter((issue) => issue.status !== "fixed" && issue.autoFix).length,
    manual: issues.filter((issue) => issue.status !== "fixed" && !issue.autoFix).length,
    fixed: issues.filter((issue) => issue.status === "fixed").length
  };
}

function issueScoreLabel(issue) {
  return issue.status === "fixed" ? "Fixed" : `+${issue.penalty} pts`;
}

async function fixIssue(issueId, source = "AI fix") {
  if (state.sessionId) {
    dom.scanStatus.textContent = source === "Manual review" ? "Saving manual review" : "Applying backend fix";
    try {
      await applyFixesWithBackend({ issueIds: [issueId] });
      dom.scanStatus.textContent = "Backend fix applied";
      render();
      return;
    } catch (error) {
      dom.scanStatus.textContent = "Backend unavailable; applied locally";
    }
  }

  const issue = state.report?.issues.find((item) => item.id === issueId);
  if (!issue || issue.status === "fixed") return;
  issue.status = "fixed";
  state.changeLog.unshift(`${source}: ${issue.title}`);
  dom.scanStatus.textContent = "Fix applied";
  state.selectedIssueId = issueId;
  render();
}

async function applyAllAutoFixes() {
  if (!state.report) {
    scanFile(sampleDeck);
    return;
  }

  if (state.sessionId) {
    dom.scanStatus.textContent = "Applying backend AI fixes";
    try {
      await applyFixesWithBackend({ mode: "all-auto" });
      dom.scanStatus.textContent = "Backend AI fixes applied";
      render();
      return;
    } catch (error) {
      dom.scanStatus.textContent = "Backend unavailable; applied locally";
    }
  }

  state.report.issues
    .filter((issue) => issue.autoFix && issue.status !== "fixed")
    .forEach((issue) => {
      issue.status = "fixed";
      state.changeLog.unshift(`AI fix: ${issue.title}`);
    });
  dom.scanStatus.textContent = "AI fixes applied";
  render();
}

async function markManualReviewed() {
  if (!state.report) {
    scanFile(sampleDeck);
    return;
  }

  if (state.sessionId) {
    dom.scanStatus.textContent = "Saving manual review";
    try {
      await applyFixesWithBackend({ mode: "all-manual" });
      dom.scanStatus.textContent = "Backend manual review saved";
      render();
      return;
    } catch (error) {
      dom.scanStatus.textContent = "Backend unavailable; applied locally";
    }
  }

  state.report.issues
    .filter((issue) => !issue.autoFix && issue.status !== "fixed")
    .forEach((issue) => {
      issue.status = "fixed";
      state.changeLog.unshift(`Manual review: ${issue.title}`);
    });
  dom.scanStatus.textContent = "Manual fixes reviewed";
  render();
}

function filteredIssues() {
  const issues = state.report?.issues || [];
  if (state.filter === "auto") return issues.filter((issue) => issue.autoFix);
  if (state.filter === "manual") return issues.filter((issue) => !issue.autoFix);
  if (state.filter === "consistency") return issues.filter((issue) => issue.consistency);
  return issues;
}

function renderScore() {
  if (!state.report) {
    dom.scoreValue.textContent = "--";
    dom.projectedScore.textContent = "--";
    dom.scoreProgress.style.width = "0%";
    return;
  }

  const score = scoreFor(state.report.issues);
  const projected = projectedScoreFor(state.report.issues);
  const stats = counts();
  dom.scoreValue.textContent = score;
  dom.projectedScore.textContent = projected;
  dom.scoreProgress.style.width = `${projected}%`;
  dom.scoreRing.style.borderColor = score >= 85 ? "#b8d9ce" : score >= 68 ? "#f4d58d" : "#f1aaa5";
  dom.openCount.textContent = stats.open;
  dom.autoCount.textContent = stats.auto;
  dom.manualCount.textContent = stats.manual;
  dom.fixedCount.textContent = stats.fixed;
  dom.summaryTitle.textContent = stats.open
    ? `${stats.open} issues left to clean.`
    : "Deck is clean.";
  dom.summaryCopy.textContent = stats.open
    ? `${state.report.fileName} has ${state.report.slides} estimated slides. Apply AI fixes, review manual suggestions, then rescan to confirm the score.`
    : `${state.report.fileName} is ready for export review. The live preview reflects all applied fixes.`;
}

function slideIssues(slideNumber) {
  return (state.report?.issues || []).filter((issue) => issue.slides.includes(slideNumber));
}

function renderDeckCanvas() {
  if (!state.report) {
    dom.deckCanvas.innerHTML = '<div class="empty-state">Upload a deck to generate editable slide previews.</div>';
    return;
  }

  const visibleSlides = Math.min(Math.max(state.report.slides, 6), 12);
  dom.deckCanvas.innerHTML = Array.from({ length: visibleSlides }, (_, index) => {
    const slide = index + 1;
    const issues = slideIssues(slide);
    const openIssues = issues.filter((issue) => issue.status !== "fixed");
    const fixedClass = openIssues.length ? "has-issues" : "is-clean";
    const affectedClass = openIssues.map((issue) => issue.id).join(" ");
    const chips = issues.slice(0, 3).map((issue) => `<span class="${issue.status === "fixed" ? "fixed" : ""}">${escapeHtml(issue.category)}</span>`).join("");
    return `
      <article class="slide-thumb ${fixedClass} ${affectedClass}" data-slide="${slide}">
        <div class="slide-top">
          <i></i>
          <strong>${slide}</strong>
        </div>
        <div class="slide-title"></div>
        <div class="slide-body">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="slide-chart">
          <b></b><b></b><b></b>
        </div>
        <div class="slide-footer">Source: company data <em>${slide}</em></div>
        <div class="slide-chips">${chips || "<span class=\"fixed\">clean</span>"}</div>
      </article>
    `;
  }).join("");
}

function renderIssues() {
  if (!state.report) {
    dom.issueList.innerHTML = '<div class="empty-state">Upload a deck or run the sample scan to see a prioritized issue list.</div>';
    return;
  }

  const issues = filteredIssues();
  dom.issueList.innerHTML = issues.map((issue) => `
    <article class="issue-card ${issue.status === "fixed" ? "is-fixed" : ""} ${issue.id === state.selectedIssueId ? "is-selected" : ""}" data-issue-id="${escapeHtml(issue.id)}">
      <div class="severity ${issue.severity}">${escapeHtml(issue.severity)}</div>
      <div>
        <div class="issue-title-row">
          <h3>${escapeHtml(issue.title)}</h3>
          <span>${issueScoreLabel(issue)}</span>
        </div>
        <p>${escapeHtml(issue.detail)}</p>
        <div class="issue-meta">
          <span>${escapeHtml(issue.category)}</span>
          <span>Slides ${issue.slides.join(", ")}</span>
          <span>${issue.autoFix ? "AI-fixable" : "Manual"}</span>
        </div>
      </div>
      <div class="issue-actions">
        ${issue.autoFix && issue.status !== "fixed" ? `<button class="primary-button mini" type="button" data-action="fix" data-issue-id="${escapeHtml(issue.id)}">Apply fix</button>` : ""}
        ${!issue.autoFix && issue.status !== "fixed" ? `<button class="secondary-button mini" type="button" data-action="review" data-issue-id="${escapeHtml(issue.id)}">Mark reviewed</button>` : ""}
        <button class="secondary-button mini" type="button" data-action="inspect" data-issue-id="${escapeHtml(issue.id)}">Inspect</button>
      </div>
    </article>
  `).join("");
}

function renderInspector() {
  const issue = state.report?.issues.find((item) => item.id === state.selectedIssueId);
  const artifactLinks = state.artifacts
    ? `<div class="artifact-links">
        <a class="secondary-button mini" href="${state.artifacts.cleanedPreview}" target="_blank" rel="noreferrer">Open cleaned preview</a>
        ${state.artifacts.fixedDeck ? `<a class="primary-button mini" href="${state.artifacts.fixedDeck}">Download fixed PPTX</a>` : ""}
      </div>`
    : "";
  if (!issue) {
    dom.issueInspector.innerHTML = `<p class="empty-state">Select an issue to see the slide-level fix, score impact, and manual guidance.</p>${artifactLinks}`;
    return;
  }

  dom.issueInspector.innerHTML = `
    <p class="eyebrow">${escapeHtml(issue.category)} · Slides ${issue.slides.join(", ")}</p>
    <h3>${escapeHtml(issue.title)}</h3>
    <p>${escapeHtml(issue.detail)}</p>
    <div class="inspector-actions">
      <div>
        <strong>${issue.autoFix ? "AI can fix this" : "Manual judgment needed"}</strong>
        <p>${escapeHtml(issue.autoFix ? issue.aiAction : issue.manualAction)}</p>
      </div>
      <div>
        <strong>Manual guidance</strong>
        <p>${escapeHtml(issue.manualAction)}</p>
      </div>
    </div>
    <div class="inspector-footer">
      <span class="score-pill">${issue.status === "fixed" ? "Already fixed" : `Worth ${issue.penalty} score points`}</span>
      ${issue.status !== "fixed" ? `<button class="primary-button compact" type="button" data-action="${issue.autoFix ? "fix" : "review"}" data-issue-id="${escapeHtml(issue.id)}">${issue.autoFix ? "Apply AI fix" : "Mark manual fix done"}</button>` : ""}
    </div>
    ${artifactLinks}
  `;

  dom.changeLog.innerHTML = state.changeLog.length
    ? state.changeLog.slice(0, 8).map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")
    : "<li>No fixes applied yet.</li>";
}

function renderTabs() {
  dom.tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.filter === state.filter);
  });
}

function render() {
  renderScore();
  renderTabs();
  renderDeckCanvas();
  renderIssues();
  renderInspector();
}

function exportBrief() {
  if (!state.report) {
    scanFile(sampleDeck);
    return;
  }

  if (state.artifacts?.editBrief) {
    window.location.href = state.artifacts.editBrief;
    return;
  }

  const score = scoreFor(state.report.issues);
  const lines = [
    "DeckCleaner edit brief",
    state.report.fileName,
    `Current score: ${score}`,
    `Projected after AI fixes: ${projectedScoreFor(state.report.issues)}`,
    `Style system: ${state.styleSystem}`,
    `Grid: ${state.gridSystem}px`,
    "",
    "Open issues",
    ...state.report.issues
      .filter((issue) => issue.status !== "fixed")
      .map((issue) => `- [${issue.severity.toUpperCase()}] ${issue.title} | ${issue.autoFix ? "AI-fixable" : "Manual"} | slides ${issue.slides.join(", ")} | ${issue.autoFix ? issue.aiAction : issue.manualAction}`),
    "",
    "Applied changes",
    ...(state.changeLog.length ? state.changeLog.map((entry) => `- ${entry}`) : ["- None yet"])
  ];

  const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `deckcleaner-edit-brief-${Date.now()}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
}

dom.deckInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) scanFile(file);
});

dom.dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dom.dropzone.classList.add("is-dragging");
});

dom.dropzone.addEventListener("dragleave", () => {
  dom.dropzone.classList.remove("is-dragging");
});

dom.dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dom.dropzone.classList.remove("is-dragging");
  const [file] = event.dataTransfer.files;
  if (file) scanFile(file);
});

dom.issueList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  const card = event.target.closest("[data-issue-id]");
  const issueId = button?.dataset.issueId || card?.dataset.issueId;
  if (!issueId) return;
  state.selectedIssueId = issueId;
  if (button?.dataset.action === "fix") fixIssue(issueId, "AI fix");
  if (button?.dataset.action === "review") fixIssue(issueId, "Manual review");
  render();
});

dom.issueInspector.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  fixIssue(button.dataset.issueId, button.dataset.action === "fix" ? "AI fix" : "Manual review");
});

dom.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.filter = tab.dataset.filter;
    render();
  });
});

dom.sampleButton.addEventListener("click", () => scanFile(sampleDeck));
dom.scanAgainButton.addEventListener("click", rescanCurrentDeck);
dom.applyAllButton.addEventListener("click", applyAllAutoFixes);
dom.markManualButton.addEventListener("click", markManualReviewed);
dom.exportButton.addEventListener("click", exportBrief);

dom.styleSystem.addEventListener("change", () => {
  state.styleSystem = dom.styleSystem.value;
  if (state.report) {
    state.changeLog.unshift(`Style system set to ${state.styleSystem}`);
    fixIssue("font-drift", "Style system");
  }
});

dom.gridSystem.addEventListener("change", () => {
  state.gridSystem = dom.gridSystem.value;
  if (state.report) {
    state.changeLog.unshift(`Grid set to ${state.gridSystem}px`);
    fixIssue("logo-grid", "Grid normalization");
    fixIssue("page-numbers", "Grid normalization");
  }
});

render();

if (new URLSearchParams(window.location.search).get("sample") === "1") {
  scanFile(sampleDeck);
}
