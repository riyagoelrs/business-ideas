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
    id: "text-hierarchy",
    title: "Text size hierarchy is drifting",
    category: "Typography",
    severity: "medium",
    autoFix: true,
    consistency: true,
    penalty: 8,
    slides: [2, 4, 8],
    detail: "The deck appears to use too many nearby text sizes, which makes titles, labels, and body copy feel hand-tuned.",
    aiAction: "Collapse text into a banking-style hierarchy: title, subtitle, body, label, source note.",
    manualAction: "Confirm any intentionally oversized KPI callouts before flattening the type scale."
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
    id: "date-footnotes",
    title: "Dates in sources and footnotes are inconsistent",
    category: "Footnotes",
    severity: "medium",
    autoFix: true,
    consistency: true,
    penalty: 7,
    slides: [3, 6, 11],
    detail: "Date formats in source notes, as-of dates, and market data callouts are not using one convention.",
    aiAction: "Normalize source dates to one format and apply the same punctuation pattern to every footnote.",
    manualAction: "Verify as-of dates against the underlying data source before sending the deck."
  },
  {
    id: "number-formatting",
    title: "Financial figures are not banking-standard",
    category: "Financial formatting",
    severity: "medium",
    autoFix: true,
    consistency: true,
    penalty: 8,
    slides: [5, 7, 9],
    detail: "Currency, multiples, percentages, or large numbers appear in mixed formats.",
    aiAction: "Standardize financial figures to one convention, e.g. $12.4M, 18.2%, 3.1x, and FY2026E.",
    manualAction: "Confirm whether the deck should use actuals, estimates, calendar years, or fiscal years."
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
    id: "content-glance",
    title: "High-level content pass is recommended",
    category: "Content",
    severity: "low",
    autoFix: false,
    consistency: false,
    penalty: 5,
    slides: [2, 5, 8],
    detail: "The deck would benefit from a quick AI-level glance for vague claims, missing proof points, and generic slide titles.",
    aiAction: "Draft sharper titles and callouts that make each slide's investor takeaway explicit.",
    manualAction: "Check whether each slide has a single takeaway and whether the evidence supports that takeaway."
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

function typoMatches(text) {
  return text.match(/\b(Revnue|teh|adress|recieve|occured|seperate|definately|mangement|compnay)\b/gi) || [];
}

function dateFormats(text) {
  const formats = new Set();
  if (/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i.test(text)) formats.add("month-day-year");
  if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(text)) formats.add("slash-date");
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(text)) formats.add("iso-date");
  if (/\bQ[1-4]\s+['’]?\d{2,4}\b/i.test(text)) formats.add("quarter-year");
  if (/\bFY\s?\d{2,4}\b/i.test(text)) formats.add("fiscal-year");
  return formats;
}

function financialFormatSignals(text) {
  const signals = new Set();
  if (/\$\s?\d+(?:\.\d+)?\s?(?:m|mm|million)\b/i.test(text)) signals.add("currency-millions");
  if (/\$\s?\d+(?:\.\d+)?\s?(?:b|bn|billion)\b/i.test(text)) signals.add("currency-billions");
  if (/\b\d+(?:\.\d+)?\s?%/.test(text)) signals.add("percent");
  if (/\b\d+(?:\.\d+)?x\b/i.test(text)) signals.add("multiple");
  if (/\b\d{1,3}(?:,\d{3})+\b/.test(text)) signals.add("comma-number");
  if (/\b\d+(?:\.\d+)?\s?(?:ARR|MRR|GMV|EBITDA|Revenue|Rev)\b/i.test(text)) signals.add("metric-number");
  return signals;
}

function terminologyDrift(text) {
  const lower = text.toLowerCase();
  const includesTerm = (term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower);
  const groups = [
    ["go-to-market", "go to market", "gtm"],
    ["revenue", "rev", "sales"],
    ["customer acquisition cost", "cac"],
    ["gross margin", "gm"],
    ["year-over-year", "yoy", "year over year"]
  ];
  return groups.filter((group) => group.filter(includesTerm).length > 1);
}

function nonAcronymCaps(caps) {
  const allowed = new Set(["ARR", "MRR", "GMV", "CAC", "LTV", "EBITDA", "TAM", "SAM", "SOM", "CEO", "CFO", "COO", "API", "AI", "ML", "SaaS".toUpperCase()]);
  return caps.filter((item) => !allowed.has(item));
}

function textHierarchyDrift(fontSizes = []) {
  const normalized = [...new Set(fontSizes.map((size) => Math.round(size / 100)))].sort((a, b) => a - b);
  if (normalized.length <= 5) return false;
  const closeSizes = normalized.filter((size, index) => index > 0 && size - normalized[index - 1] <= 2);
  return closeSizes.length >= 3 || normalized.length >= 8;
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
  const noisyCaps = nonAcronymCaps(caps);
  const dates = dateFormats(text);
  const financeSignals = financialFormatSignals(text);
  const typos = typoMatches(text);
  const termDrift = terminologyDrift(text);
  const textLower = text.toLowerCase();
  const selectedIds = new Set();
  const isPitchDeck = /seed|series|investor|pitch|fundraise|deck/i.test(file.name) || slides > 6;
  const hasSourceLanguage = /\b(source|sources|footnote|as of|as-of|note:|notes:)\b/i.test(text);

  if (fonts.length > 1 || extraction.warning) selectedIds.add("font-drift");
  if (textHierarchyDrift(extraction.fontSizes || []) || fonts.length > 2 || (isPitchDeck && extraction.warning)) selectedIds.add("text-hierarchy");
  if ((isPitchDeck && slides > 4) || (extraction.warning && slides > 1)) selectedIds.add("logo-grid");
  if (slides > 4) selectedIds.add("page-numbers");
  if (noisyCaps.length > 1 || /FINAL|UPDATED|DRAFT/.test(file.name)) selectedIds.add("capitalization");
  if (typos.length || termDrift.length) selectedIds.add("spelling");
  if (hasSourceLanguage) selectedIds.add("footnotes");
  if (hasSourceLanguage && dates.size > 1) selectedIds.add("date-footnotes");
  if (financeSignals.size > 2) selectedIds.add("number-formatting");
  if ((financeSignals.size > 1 && slides > 3) || text.length > 5000 || extensionFor(file.name) === "pdf") selectedIds.add("chart-polish");
  if ((isPitchDeck && slides > 5) || (extraction.warning && slides > 2)) selectedIds.add("spacing");
  if (hasSourceLanguage || (isPitchDeck && slides > 10)) selectedIds.add("contrast");
  if (isPitchDeck && /\b(TBD|TODO|lorem|placeholder|insert|fix me)\b/i.test(text)) selectedIds.add("content-callouts");
  if (isPitchDeck && !/(problem|solution|market|traction|team|ask|use of funds|why now)/i.test(textLower)) selectedIds.add("content-glance");
  if (slides > 12 && !/(ask|use of funds|team)/i.test(textLower)) selectedIds.add("narrative-gaps");

  if (!selectedIds.size) return [];

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
      if (issue.id === "text-hierarchy" && extraction.fontSizes?.length) {
        hydrated.detail = `Detected ${new Set(extraction.fontSizes).size} distinct text sizes. Collapse them into a small title/body/label/source-note hierarchy.`;
      }
      if (issue.id === "capitalization" && noisyCaps.length > 1) {
        hydrated.detail = `All-caps tokens found: ${noisyCaps.join(", ")}. Preserve true acronyms and normalize the rest.`;
      }
      if (issue.id === "spelling") {
        const parts = [];
        if (typos.length) parts.push(`possible typos: ${[...new Set(typos)].join(", ")}`);
        if (termDrift.length) parts.push(`terminology drift: ${termDrift.map((group) => group.join(" / ")).join("; ")}`);
        if (parts.length) hydrated.detail = `Detected ${parts.join(". ")}.`;
      }
      if (issue.id === "date-footnotes") {
        hydrated.detail = `Detected mixed date conventions in source or footnote text: ${[...dates].join(", ")}.`;
      }
      if (issue.id === "number-formatting") {
        hydrated.detail = `Detected mixed financial formatting signals: ${[...financeSignals].join(", ")}. Standardize to one banking convention.`;
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
