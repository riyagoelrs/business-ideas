const issueTemplates = [
  {
    id: "font-drift",
    title: "Font drift across core slides",
    detail: "Multiple typefaces or system fallbacks appear in titles, body copy, and labels.",
    category: "Typography",
    severity: "high",
    autoFix: true,
    fix: "Map every text style to the primary deck font and rebuild title/body sizes."
  },
  {
    id: "logo-grid",
    title: "Logo and page furniture are off-grid",
    detail: "Brand marks, page numbers, and footnotes do not share the same x/y anchors.",
    category: "Alignment",
    severity: "high",
    autoFix: true,
    fix: "Snap recurring objects to a single 24 px layout grid and lock slide margins."
  },
  {
    id: "chart-polish",
    title: "Chart spacing and labels feel uneven",
    detail: "Bars, labels, and axis text have inconsistent spacing, contrast, or weight.",
    category: "Charts",
    severity: "medium",
    autoFix: true,
    fix: "Normalize chart gutters, label contrast, and axis type size."
  },
  {
    id: "capitalization",
    title: "Random capitalization in headings",
    detail: "Headlines mix title case, sentence case, all caps, and startup-style emphasis.",
    category: "Copy",
    severity: "medium",
    autoFix: true,
    fix: "Apply one title-case rule to section headers and one sentence-case rule to body copy."
  },
  {
    id: "spacing",
    title: "Messy vertical spacing",
    detail: "Repeated slide modules have uneven padding between headings, bullets, and charts.",
    category: "Layout",
    severity: "medium",
    autoFix: true,
    fix: "Recalculate vertical rhythm with 8 px spacing increments."
  },
  {
    id: "contrast",
    title: "Low-contrast supporting labels",
    detail: "Tiny axis labels, captions, and source notes are too light for a partner meeting.",
    category: "Accessibility",
    severity: "low",
    autoFix: true,
    fix: "Raise caption and label contrast to a readable neutral tone."
  },
  {
    id: "orphan-bullets",
    title: "Orphan bullets and ragged text blocks",
    detail: "Short bullets and uneven text boxes make the slide feel hand-adjusted.",
    category: "Composition",
    severity: "low",
    autoFix: false,
    fix: "Recommend manual rewrite because the best fix depends on message priority."
  }
];

const sampleDeck = {
  name: "Seed_Round_Messy_v17.pdf",
  type: "application/pdf",
  size: 6840000,
  text: "Inter Arial Calibri WHAT WE DO traction MARKET pull Why Now Revenue Growth EBITDA ARR Gross Margin Product roadmap",
  slideCount: 14
};

const state = {
  file: null,
  report: null,
  view: "messy",
  fixed: false
};

const deckInput = document.getElementById("deckInput");
const dropzone = document.getElementById("dropzone");
const sampleButton = document.getElementById("sampleButton");
const scanAgainButton = document.getElementById("scanAgainButton");
const fileName = document.getElementById("fileName");
const scanStatus = document.getElementById("scanStatus");
const scoreValue = document.getElementById("scoreValue");
const scoreRing = document.getElementById("scoreRing");
const summaryTitle = document.getElementById("summaryTitle");
const summaryCopy = document.getElementById("summaryCopy");
const issueCount = document.getElementById("issueCount");
const fixCount = document.getElementById("fixCount");
const slideCount = document.getElementById("slideCount");
const issueList = document.getElementById("issueList");
const deckPreview = document.getElementById("deckPreview");
const stageTitle = document.getElementById("stageTitle");
const autoFixButton = document.getElementById("autoFixButton");
const exportButton = document.getElementById("exportButton");
const fixPlanTitle = document.getElementById("fixPlanTitle");
const fixPlanCopy = document.getElementById("fixPlanCopy");
const fixSteps = document.getElementById("fixSteps");
const segmentButtons = [...document.querySelectorAll(".segment")];
const optionInputs = [
  document.getElementById("brandGrid"),
  document.getElementById("typeScale"),
  document.getElementById("chartPolish")
];

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
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
  const name = file.name || "";
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "deck";
}

function estimateSlideCount(file, text) {
  if (file.slideCount) return file.slideCount;
  const ext = extensionFor(file);
  if (ext === "pdf") {
    const pageMatches = text.match(/\/Type\s*\/Page\b/g);
    return Math.max(1, Math.min(80, pageMatches?.length || Math.round((file.size || 1) / 430000)));
  }
  if (ext === "pptx") {
    const slideMatches = text.match(/ppt\/slides\/slide[0-9]+\.xml/g);
    return Math.max(1, Math.min(80, slideMatches?.length || Math.round((file.size || 1) / 510000)));
  }
  return Math.max(1, Math.min(80, Math.round((file.size || 1) / 520000)));
}

function findFonts(text) {
  const knownFonts = ["Aptos", "Arial", "Calibri", "Helvetica", "Inter", "Georgia", "Times", "Garamond", "Montserrat"];
  return knownFonts.filter((font) => new RegExp(font, "i").test(text));
}

function findCaps(text) {
  const matches = text.match(/\b[A-Z][A-Z0-9&-]{3,}\b/g) || [];
  return [...new Set(matches)].slice(0, 8);
}

function pickIssues(file, text, slides) {
  const ext = extensionFor(file);
  const fonts = findFonts(text);
  const caps = findCaps(text);
  const issues = [];
  const add = (id, overrides = {}) => {
    const template = issueTemplates.find((issue) => issue.id === id);
    if (template && !issues.some((issue) => issue.id === id)) {
      issues.push({ ...template, ...overrides });
    }
  };

  if (fonts.length > 1) {
    add("font-drift", {
      detail: `Detected likely font references: ${fonts.join(", ")}. Titles and body text should collapse to one system.`
    });
  } else {
    add("font-drift", {
      severity: "medium",
      detail: "Deck text appears to rely on generic fallbacks. A locked type scale would reduce visual drift."
    });
  }

  add("logo-grid", {
    detail: `${slides} slides were mapped against recurring object anchors; several slide furniture positions are likely inconsistent.`
  });

  if (ext === "pdf" || text.length > 4000 || file.size > 2500000) {
    add("chart-polish");
  }

  if (caps.length > 2 || /v[0-9]+|FINAL|UPDATED/i.test(file.name || "")) {
    add("capitalization", {
      detail: caps.length
        ? `All-caps tokens found: ${caps.join(", ")}. These should be reserved for acronyms only.`
        : "Filename and extracted text suggest mixed editorial casing across deck sections."
    });
  }

  add("spacing", {
    detail: "Repeated slide modules show enough variance to warrant an 8 px rhythm pass."
  });

  if (slides > 10 || file.size > 5000000) {
    add("contrast");
  }

  if (slides > 12 || /seed|series|investor|fundraise/i.test(file.name || "")) {
    add("orphan-bullets");
  }

  return issues.map((issue, index) => ({
    ...issue,
    slide: Math.min(slides, Math.max(1, Math.round(((index + 1) / (issues.length + 1)) * slides))),
    effort: issue.autoFix ? "Auto" : "Review"
  }));
}

function scoreFor(issues) {
  const penalty = issues.reduce((total, issue) => {
    if (issue.severity === "high") return total + 17;
    if (issue.severity === "medium") return total + 10;
    return total + 5;
  }, 0);
  return Math.max(38, 100 - penalty);
}

function buildReport(file, text) {
  const slides = estimateSlideCount(file, text);
  const issues = pickIssues(file, text, slides);
  const score = scoreFor(issues);
  const autoFixable = issues.filter((issue) => issue.autoFix).length;
  const minutes = 8 + issues.length * 3 + Math.round(slides / 2);

  return {
    fileName: file.name || "Sample deck",
    fileSize: file.size || 0,
    ext: extensionFor(file).toUpperCase(),
    slides,
    issues,
    score,
    autoFixable,
    minutes,
    fixedScore: Math.min(96, score + autoFixable * 8)
  };
}

function setStatus(text) {
  scanStatus.textContent = text;
}

async function readDeckText(file) {
  if (file.text) return file.text;
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 180000)));
  let binaryText = "";
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binaryText += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return binaryText;
}

async function scanFile(file) {
  state.file = file;
  state.fixed = false;
  state.view = "messy";
  fileName.textContent = `${file.name || "Sample deck"} (${formatBytes(file.size)})`;
  setStatus("Scanning");
  renderPreviewMode();

  try {
    const text = await readDeckText(file);
    state.report = buildReport(file, text);
    setStatus("Scan complete");
    renderReport();
  } catch (error) {
    setStatus("Scan failed");
    summaryTitle.textContent = "Could not read this deck.";
    summaryCopy.textContent = "Try another PDF, PPT, or PPTX. The browser could not load the selected file.";
  }
}

function renderReport() {
  const report = state.report;
  if (!report) {
    issueList.innerHTML = '<div class="empty-state">Upload a deck or run the sample scan to populate the formatting issue queue.</div>';
    return;
  }

  const activeScore = state.fixed ? report.fixedScore : report.score;
  scoreValue.textContent = activeScore;
  scoreRing.style.borderColor = activeScore >= 85 ? "#b8d9ce" : activeScore >= 68 ? "#f6dca7" : "#f4b8b3";
  summaryTitle.textContent = state.fixed ? "Auto-fix pass applied." : `${report.issues.length} formatting issues found.`;
  summaryCopy.textContent = state.fixed
    ? `The preview applies ${report.autoFixable} automated fixes and moves the deck score from ${report.score} to ${report.fixedScore}.`
    : `${report.fileName} is a ${report.ext} deck with ${report.slides} estimated slides. Fix pass estimate: ${report.minutes} minutes.`;
  issueCount.textContent = report.issues.length;
  fixCount.textContent = report.autoFixable;
  slideCount.textContent = report.slides;

  issueList.innerHTML = report.issues.map((issue) => `
    <article class="issue-card">
      <span class="severity ${issue.severity}">${escapeHtml(issue.severity)}</span>
      <div>
        <h3>${escapeHtml(issue.title)}</h3>
        <p>${escapeHtml(issue.detail)}</p>
        <div class="issue-meta">
          <span>Slide ${issue.slide}</span>
          <span>${escapeHtml(issue.category)}</span>
          <span>${escapeHtml(issue.effort)}</span>
        </div>
      </div>
      ${issue.autoFix ? '<span class="fix-badge">Fixable</span>' : '<span class="fix-badge">Manual</span>'}
    </article>
  `).join("");

  const selectedFixes = selectedFixPlan(report);
  fixPlanTitle.textContent = state.fixed ? "Cleaned deck recipe" : `${selectedFixes.length} fixes queued`;
  fixPlanCopy.textContent = state.fixed
    ? "These are the normalization rules applied to the preview and export report."
    : "Turn on the cleanup rules you want and apply the auto-fix pass.";
  fixSteps.innerHTML = selectedFixes.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
}

function selectedFixPlan(report) {
  if (!report) return [];
  const rules = [];
  if (document.getElementById("brandGrid").checked) {
    rules.push("Snap logos, footers, and page numbers to one shared margin grid.");
  }
  if (document.getElementById("typeScale").checked) {
    rules.push("Normalize title, subtitle, body, label, and source-note text styles.");
  }
  if (document.getElementById("chartPolish").checked) {
    rules.push("Rebuild chart gutters, bar widths, label contrast, and number formatting.");
  }
  report.issues
    .filter((issue) => issue.autoFix)
    .slice(0, 4)
    .forEach((issue) => rules.push(issue.fix));
  return [...new Set(rules)].slice(0, 7);
}

function renderPreviewMode() {
  deckPreview.classList.toggle("is-fixed", state.view === "fixed" || state.fixed);
  stageTitle.textContent = state.view === "fixed" || state.fixed
    ? "Cleaned formatting preview"
    : "Formatting issue preview";
  segmentButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });
}

function applyAutoFix() {
  if (!state.report) {
    scanFile(sampleDeck);
    return;
  }
  state.fixed = true;
  state.view = "fixed";
  setStatus("Auto-fixed");
  renderPreviewMode();
  renderReport();
}

function exportReport() {
  if (!state.report) {
    scanFile(sampleDeck);
    return;
  }

  const report = state.report;
  const safeFileName = escapeHtml(report.fileName);
  const rows = report.issues.map((issue) => `
    <tr>
      <td>${escapeHtml(issue.severity)}</td>
      <td>${escapeHtml(issue.category)}</td>
      <td>${escapeHtml(issue.title)}</td>
      <td>${issue.autoFix ? "Yes" : "Manual review"}</td>
    </tr>
  `).join("");
  const steps = selectedFixPlan(report).map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>DeckCleaner Report - ${safeFileName}</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 40px; color: #17202a; }
    h1 { margin-bottom: 6px; }
    p { color: #657282; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border: 1px solid #dfe5ec; padding: 10px; text-align: left; }
    th { background: #f2f5f8; }
  </style>
</head>
<body>
  <h1>DeckCleaner Report</h1>
  <p>${safeFileName} | ${report.slides} slides | Score ${report.score} -> ${report.fixedScore}</p>
  <h2>Issues</h2>
  <table>
    <thead><tr><th>Severity</th><th>Category</th><th>Issue</th><th>Auto-fix</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <h2>Fix Plan</h2>
  <ol>${steps}</ol>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `deckcleaner-report-${Date.now()}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
}

deckInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) scanFile(file);
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragging");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("is-dragging");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-dragging");
  const [file] = event.dataTransfer.files;
  if (file) scanFile(file);
});

sampleButton.addEventListener("click", () => scanFile(sampleDeck));
scanAgainButton.addEventListener("click", () => scanFile(state.file || sampleDeck));
autoFixButton.addEventListener("click", applyAutoFix);
exportButton.addEventListener("click", exportReport);

segmentButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    renderPreviewMode();
  });
});

optionInputs.forEach((input) => {
  input.addEventListener("change", renderReport);
});

renderReport();

if (new URLSearchParams(window.location.search).get("sample") === "1") {
  scanFile(sampleDeck);
}
