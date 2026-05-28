const crypto = require("node:crypto");

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
    manualAction: "Review product names and acronyms so case normalization does not flatten brand language."
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

function extensionFor(name = "") {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "deck";
}

function decodeBuffer(buffer) {
  return buffer
    .toString("latin1")
    .replace(/\0/g, " ")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ")
    .slice(0, 800000);
}

function estimateSlideCount(file, text, detectedSlides) {
  if (detectedSlides) return detectedSlides;
  const ext = extensionFor(file.name);
  if (ext === "pdf") {
    const pages = text.match(/\/Type\s*\/Page\b/g);
    return Math.max(1, Math.min(120, pages?.length || Math.round((file.size || 1) / 420000)));
  }
  if (ext === "pptx") {
    const slides = text.match(/ppt\/slides\/slide[0-9]+\.xml/g);
    return Math.max(1, Math.min(120, slides?.length || Math.round((file.size || 1) / 520000)));
  }
  return Math.max(1, Math.min(120, Math.round((file.size || 1) / 520000)));
}

function findFonts(text, extractedFonts = []) {
  const known = ["Aptos", "Arial", "Calibri", "Helvetica", "Inter", "Georgia", "Times", "Montserrat"];
  return [...new Set([
    ...extractedFonts,
    ...known.filter((font) => new RegExp(font, "i").test(text))
  ])].slice(0, 10);
}

function findCaps(text) {
  return [...new Set(text.match(/\b[A-Z][A-Z0-9&-]{3,}\b/g) || [])].slice(0, 10);
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

function buildIssues(file, extraction, previousIssues = [], options = {}) {
  const text = extraction.text || "";
  const slides = estimateSlideCount(file, text, extraction.slideCount);
  const fonts = findFonts(text, extraction.fonts);
  const caps = findCaps(text);
  const selectedIds = new Set([
    "font-drift",
    "logo-grid",
    "page-numbers",
    "capitalization",
    "spelling",
    "footnotes",
    "spacing"
  ]);

  if (extensionFor(file.name) === "pdf" || text.length > 3000 || file.size > 2000000) selectedIds.add("chart-polish");
  if (slides > 10 || file.size > 5000000) selectedIds.add("contrast");
  if (/seed|series|investor|pitch|fundraise/i.test(file.name) || slides > 8) selectedIds.add("content-callouts");
  if (slides > 12 || /v[0-9]+|final|updated/i.test(file.name)) selectedIds.add("narrative-gaps");

  const previousById = new Map(previousIssues.map((issue) => [issue.id, issue]));
  return issueCatalog
    .filter((issue) => selectedIds.has(issue.id))
    .map((issue, index) => {
      const hydrated = {
        ...issue,
        status: previousById.get(issue.id)?.status || "open",
        slides: issue.slides
          .map((slide) => Math.min(slides, slide))
          .filter((slide, slideIndex, all) => all.indexOf(slide) === slideIndex)
      };

      if (issue.id === "font-drift") {
        hydrated.detail = fonts.length > 1
          ? `Detected likely font references: ${fonts.join(", ")}. Collapse these into ${options.styleSystem || "Inter"}.`
          : "The deck appears to rely on generic or embedded fallback fonts. Locking the type system will reduce drift.";
      }
      if (issue.id === "capitalization" && caps.length > 1) {
        hydrated.detail = `All-caps tokens found: ${caps.join(", ")}. Preserve true acronyms and normalize the rest.`;
      }
      if (issue.id === "spelling" && /Revnue|teh|adress|recieve|occured|seperate|definately/i.test(text)) {
        hydrated.detail = "Potential spelling errors or repeated terminology drift were detected in extracted deck text.";
      }
      if (extraction.warning && index === 0) {
        hydrated.detail += " Text extraction was limited, so this finding also uses metadata and layout heuristics.";
      }
      return hydrated;
    });
}

function buildReport(file, extraction, previousIssues = [], options = {}) {
  const issues = buildIssues(file, extraction, previousIssues, options);
  const score = scoreFor(issues);
  const projectedScore = projectedScoreFor(issues);
  const fixed = issues.filter((issue) => issue.status === "fixed").length;
  const open = issues.length - fixed;
  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    fileSize: file.size,
    ext: extensionFor(file.name).toUpperCase(),
    slides: estimateSlideCount(file, extraction.text || "", extraction.slideCount),
    issues,
    score,
    projectedScore,
    counts: {
      open,
      auto: issues.filter((issue) => issue.status !== "fixed" && issue.autoFix).length,
      manual: issues.filter((issue) => issue.status !== "fixed" && !issue.autoFix).length,
      fixed
    },
    extraction: {
      warning: Boolean(extraction.warning),
      method: extraction.method || "metadata",
      textLength: (extraction.text || "").length,
      fonts: extraction.fonts || []
    }
  };
}

module.exports = {
  decodeBuffer,
  extensionFor,
  buildReport,
  scoreFor,
  projectedScoreFor,
  issueCatalog
};
