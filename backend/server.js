#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const { URL } = require("node:url");
const {
  buildReport,
  decodeBuffer,
  extensionFor,
  scoreFor,
  projectedScoreFor
} = require("./analyzer");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, ".deckcleaner-data");
const smsStorePath = path.join(dataDir, "foundlater-sms-saves.json");
const sessions = new Map();
const port = Number(process.env.PORT || 8787);
const maxUploadBytes = Number(process.env.DECKCLEANER_MAX_UPLOAD_BYTES || 50 * 1024 * 1024);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".pdf": "application/pdf"
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendError(res, status, message, details = {}) {
  sendJson(res, status, { ok: false, error: message, ...details });
}

function readRequest(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxUploadBytes) {
        req.destroy(new Error("Upload too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function bufferIndexOf(buffer, search, start = 0) {
  return buffer.indexOf(search, start);
}

function parseMultipart(contentType, body) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error("Missing multipart boundary");
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const parts = [];
  let cursor = bufferIndexOf(body, boundary);
  while (cursor !== -1) {
    cursor += boundary.length;
    if (body[cursor] === 45 && body[cursor + 1] === 45) break;
    if (body[cursor] === 13 && body[cursor + 1] === 10) cursor += 2;
    const headerEnd = bufferIndexOf(body, Buffer.from("\r\n\r\n"), cursor);
    if (headerEnd === -1) break;
    const headerText = body.slice(cursor, headerEnd).toString("utf8");
    let contentStart = headerEnd + 4;
    let next = bufferIndexOf(body, Buffer.from(`\r\n--${boundary.toString("utf8").slice(2)}`), contentStart);
    if (next === -1) next = body.length;
    const content = body.slice(contentStart, next);
    const disposition = headerText.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || "";
    const name = disposition.match(/name="([^"]+)"/)?.[1];
    const filename = disposition.match(/filename="([^"]*)"/)?.[1];
    const type = headerText.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() || "application/octet-stream";
    if (name) parts.push({ name, filename, type, content });
    cursor = bufferIndexOf(body, boundary, next);
  }
  return parts;
}

function safeName(name) {
  return path.basename(name || "deck").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function parseJson(req) {
  return readRequest(req).then((body) => JSON.parse(body.toString("utf8") || "{}"));
}

async function parseRequestFields(req) {
  const body = await readRequest(req);
  const contentType = req.headers["content-type"] || "";
  const text = body.toString("utf8");
  if (contentType.includes("application/json")) return JSON.parse(text || "{}");
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  return { Body: text };
}

function parseSmsSave(text) {
  const body = String(text || "").trim();
  const urlMatch = body.match(/https?:\/\/[^\s]+|(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?/i);
  let url = urlMatch ? urlMatch[0].replace(/[),.]+$/, "") : "";
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  const note = url ? body.replace(urlMatch[0], "").replace(/\s+/g, " ").trim() : body;
  const lowered = body.toLowerCase();

  let platform = "Web";
  if (lowered.includes("instagram.com") || lowered.includes("instagram")) platform = "Instagram";
  if (lowered.includes("tiktok.com") || lowered.includes("tiktok")) platform = "TikTok";
  if (lowered.includes("substack.com") || lowered.includes("substack")) platform = "Substack";
  if (lowered.includes("etsy.com") || lowered.includes("etsy")) platform = "Etsy";

  let collection = "Someday";
  if (/\b(apartment|move|moving|furniture|console|sofa|lamp|rug|decor)\b/i.test(body)) collection = "Apartment Move";
  if (/\b(summer|bathing|swimsuit|bikini|dress|vacation|outfit)\b/i.test(body)) collection = "Summer Closet";
  if (/\b(gift|birthday|mom|dad|holiday|present)\b/i.test(body)) collection = "Gift Ideas";
  if (/\b(creator|commission|photographer|designer|maker|artist|custom|hire)\b/i.test(body)) collection = "Creators to Hire";

  const relative = lowered.match(/\bin\s+(\d+)\s+(day|week|month|year)s?\b/);
  const reminder = relative ? `Review in ${relative[1]} ${relative[2]}${Number(relative[1]) === 1 ? "" : "s"}` : "";
  const tags = [];
  if (/\b(furniture|console|sofa|chair|table|dresser|nightstand|wood|walnut|oak|custom)\b/i.test(body)) tags.push("furniture");
  if (/\b(creator|maker|artist|designer|studio|commission)\b/i.test(body)) tags.push("creator");
  if (/\b(brand|shop|company|store|label)\b/i.test(body)) tags.push("brand");

  const title = inferSmsTitle(note || body, url, platform);
  return { body, url, note, platform, collection, reminder, tags, title };
}

function inferSmsTitle(note, url, platform) {
  const handle = note.match(/@[a-z0-9._-]+/i)?.[0];
  if (handle) return handle;
  const cleaned = note.replace(/#\w+/g, "").split(/[,.]/)[0].trim();
  if (cleaned.length > 9) return cleaned.split(/\s+/).slice(0, 7).join(" ");
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return platform;
    }
  }
  return platform;
}

function normalizeSmsUser(value) {
  return String(value || "local-test").replace(/[^\d+a-zA-Z_-]/g, "");
}

async function readSmsSaves() {
  try {
    const data = await fsp.readFile(smsStorePath, "utf8");
    const saves = JSON.parse(data);
    return Array.isArray(saves) ? saves : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeSmsSaves(saves) {
  await fsp.mkdir(dataDir, { recursive: true });
  await fsp.writeFile(smsStorePath, JSON.stringify(saves, null, 2));
}

function isSmsSearch(body) {
  return /^(find|search|show|what|where|list|get|pull up|look up)\b/i.test(body.trim());
}

function smsSearchQuery(body) {
  return body
    .replace(/^(find|search|show|get|pull up|look up)\s+/i, "")
    .replace(/^(what|where)\s+(?:was|is|are|were)?\s*/i, "")
    .replace(/^list\s+/i, "")
    .trim();
}

function wordsForSms(value) {
  return (String(value).toLowerCase().match(/[a-z0-9@#]+/g) || []).filter((word) => word.length > 1);
}

function scoreSmsSave(save, query) {
  const terms = wordsForSms(query);
  const haystack = [
    save.title,
    save.note,
    save.body,
    save.url,
    save.platform,
    save.collection,
    save.reminder,
    ...(save.tags || [])
  ].join(" ").toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function formatSmsResults(matches) {
  if (!matches.length) return "I couldn't find that yet. Try another word, creator, product, or collection.";
  return matches.slice(0, 3).map((save, index) => {
    const link = save.url ? ` ${save.url}` : "";
    return `${index + 1}. ${save.title} (${save.collection})${link}`;
  }).join("\n");
}

function twiml(reply) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeHtml(reply)}</Message></Response>`;
}

async function handleSms(req, res) {
  const fields = await parseRequestFields(req);
  const body = String(fields.Body || fields.body || fields.message || "").trim();
  const userId = normalizeSmsUser(fields.From || fields.from || fields.phone);
  const wantsJson = (req.headers["accept"] || "").includes("application/json");
  const saves = await readSmsSaves();
  let reply = "";
  let payload = {};

  if (!body || /^help$/i.test(body)) {
    reply = "Text me any link or note to save it. Later text: find apartment furniture, show bathing suits, or list apartment move.";
    payload = { mode: "help" };
  } else if (isSmsSearch(body)) {
    const query = smsSearchQuery(body);
    const matches = saves
      .filter((save) => save.userId === userId)
      .map((save) => ({ save, score: scoreSmsSave(save, query) }))
      .filter(({ score }) => !query || score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.save.createdAt) - new Date(a.save.createdAt))
      .map(({ save }) => save);
    reply = formatSmsResults(matches);
    payload = { mode: "search", query, matches };
  } else {
    const parsed = parseSmsSave(body);
    const save = {
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
      ...parsed
    };
    saves.unshift(save);
    await writeSmsSaves(saves);
    reply = [
      `Saved: ${save.title}.`,
      `Collection: ${save.collection}.`,
      save.tags.length ? `Tags: ${save.tags.join(", ")}.` : "",
      save.reminder ? `${save.reminder}.` : "",
      "Text find + words when you want it back."
    ].filter(Boolean).join(" ");
    payload = { mode: "save", save };
  }

  if (wantsJson) {
    return sendJson(res, 200, { ok: true, reply, ...payload });
  }

  const xml = twiml(reply);
  res.writeHead(200, {
    "content-type": "text/xml; charset=utf-8",
    "content-length": Buffer.byteLength(xml)
  });
  res.end(xml);
}

function extractPdfText(buffer) {
  const decoded = decodeBuffer(buffer);
  const literalStrings = [...decoded.matchAll(/\(([^()]{2,200})\)/g)]
    .map((match) => match[1].replace(/\\([nrtbf()\\])/g, " "))
    .join(" ");
  return {
    text: `${decoded.slice(0, 260000)} ${literalStrings}`.trim(),
    slideCount: (decoded.match(/\/Type\s*\/Page\b/g) || []).length,
    fonts: [...new Set([...decoded.matchAll(/\/BaseFont\s*\/([A-Za-z0-9+_-]+)/g)].map((match) => match[1].replace(/^[A-Z]{6}\+/, "")))],
    warning: literalStrings.length < 20,
    method: "pdf-byte-parser"
  };
}

function runPythonJson(script, args) {
  const result = spawnSync("python3", [path.join(__dirname, script), ...args], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });
  if (result.status !== 0) {
    return { text: "", warning: true, method: `${script}-failed`, error: result.stderr || result.stdout };
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    return { text: result.stdout || "", warning: true, method: `${script}-invalid-json`, error: error.message };
  }
}

function extractDeck(filePath, file) {
  const buffer = fs.readFileSync(filePath);
  const ext = extensionFor(file.name);
  if (ext === "pdf") return extractPdfText(buffer);
  if (ext === "pptx") {
    const extraction = runPythonJson("pptx_extract.py", [filePath]);
    if (extraction.text || extraction.slideCount) return extraction;
  }
  return {
    text: decodeBuffer(buffer),
    slideCount: 0,
    fonts: [],
    warning: true,
    method: `${ext}-metadata-fallback`
  };
}

function artifactUrls(sessionId, session) {
  return {
    editBrief: `/api/sessions/${sessionId}/edit-brief.txt`,
    cleanedPreview: `/api/sessions/${sessionId}/cleaned-preview.html`,
    fixedDeck: session.fixedDeckPath ? `/api/sessions/${sessionId}/fixed-deck.pptx` : null
  };
}

function briefFor(session) {
  const report = session.report;
  const lines = [
    "DeckCleaner edit brief",
    report.fileName,
    `Current score: ${scoreFor(report.issues)}`,
    `Projected after AI fixes: ${projectedScoreFor(report.issues)}`,
    `Style system: ${session.styleSystem}`,
    `Grid: ${session.gridSystem}px`,
    "",
    "Open issues",
    ...report.issues
      .filter((issue) => issue.status !== "fixed")
      .map((issue) => `- [${issue.severity.toUpperCase()}] ${issue.title} | ${issue.autoFix ? "AI-fixable" : "Manual"} | slides ${issue.slides.join(", ")} | ${issue.autoFix ? issue.aiAction : issue.manualAction}`),
    "",
    "Applied changes",
    ...(session.changeLog.length ? session.changeLog.map((entry) => `- ${entry}`) : ["- None yet"])
  ];
  return `${lines.join("\n")}\n`;
}

function previewFor(session) {
  const report = session.report;
  const issueRows = report.issues.map((issue) => `
    <tr>
      <td>${escapeHtml(issue.status)}</td>
      <td>${escapeHtml(issue.severity)}</td>
      <td>${escapeHtml(issue.category)}</td>
      <td>${escapeHtml(issue.title)}</td>
      <td>${issue.slides.join(", ")}</td>
    </tr>
  `).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>DeckCleaner Preview - ${escapeHtml(report.fileName)}</title>
  <style>
    body { margin: 40px; color: #17202a; font-family: Inter, Arial, sans-serif; }
    .score { display: inline-grid; width: 120px; height: 120px; place-items: center; border: 10px solid #b8d9ce; font-size: 36px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border: 1px solid #dce5ef; padding: 10px; text-align: left; }
    th { background: #f3f7fb; }
  </style>
</head>
<body>
  <h1>DeckCleaner cleaned preview</h1>
  <div class="score">${scoreFor(report.issues)}</div>
  <p>${escapeHtml(report.fileName)} | ${report.slides} estimated slides | ${session.styleSystem} | ${session.gridSystem}px grid</p>
  <table>
    <thead><tr><th>Status</th><th>Severity</th><th>Category</th><th>Issue</th><th>Slides</th></tr></thead>
    <tbody>${issueRows}</tbody>
  </table>
</body>
</html>`;
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

async function writeArtifacts(sessionId, session) {
  const dir = path.join(dataDir, sessionId);
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(path.join(dir, "edit-brief.txt"), briefFor(session));
  await fsp.writeFile(path.join(dir, "cleaned-preview.html"), previewFor(session));
  session.fixedDeckPath = null;
  if (extensionFor(session.file.name) === "pptx") {
    const out = path.join(dir, "fixed-deck.pptx");
    const result = spawnSync("python3", [path.join(__dirname, "fix_pptx.py"), session.filePath, out, session.styleSystem], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024
    });
    if (result.status === 0 && fs.existsSync(out)) session.fixedDeckPath = out;
  }
}

async function createSession(upload) {
  await fsp.mkdir(dataDir, { recursive: true });
  const sessionId = crypto.randomUUID();
  const dir = path.join(dataDir, sessionId);
  await fsp.mkdir(dir, { recursive: true });
  const fileName = safeName(upload.filename || "deck");
  const filePath = path.join(dir, fileName);
  await fsp.writeFile(filePath, upload.content);
  const file = { name: fileName, size: upload.content.length, type: upload.type };
  const extraction = extractDeck(filePath, file);
  const report = buildReport(file, extraction, [], { styleSystem: "Inter", gridSystem: "24" });
  const session = {
    id: sessionId,
    createdAt: new Date().toISOString(),
    file,
    filePath,
    extraction,
    report,
    changeLog: [],
    styleSystem: "Inter",
    gridSystem: "24",
    fixedDeckPath: null
  };
  sessions.set(sessionId, session);
  await writeArtifacts(sessionId, session);
  return session;
}

function recalcReport(session, previousIssues = session.report.issues) {
  session.report = buildReport(session.file, session.extraction, previousIssues, {
    styleSystem: session.styleSystem,
    gridSystem: session.gridSystem
  });
}

function applyFixes(session, issueIds, source = "AI fix") {
  const ids = new Set(issueIds);
  for (const issue of session.report.issues) {
    if (ids.has(issue.id) && issue.status !== "fixed") {
      issue.status = "fixed";
      session.changeLog.unshift(`${source}: ${issue.title}`);
    }
  }
  session.report.score = scoreFor(session.report.issues);
  session.report.projectedScore = projectedScoreFor(session.report.issues);
  session.report.counts = {
    open: session.report.issues.filter((issue) => issue.status !== "fixed").length,
    auto: session.report.issues.filter((issue) => issue.status !== "fixed" && issue.autoFix).length,
    manual: session.report.issues.filter((issue) => issue.status !== "fixed" && !issue.autoFix).length,
    fixed: session.report.issues.filter((issue) => issue.status === "fixed").length
  };
}

async function handleScan(req, res) {
  const body = await readRequest(req);
  const parts = parseMultipart(req.headers["content-type"] || "", body);
  const deck = parts.find((part) => part.name === "deck" && part.filename);
  if (!deck) return sendError(res, 400, "No deck file uploaded");
  const session = await createSession(deck);
  sendJson(res, 200, {
    ok: true,
    sessionId: session.id,
    report: session.report,
    changeLog: session.changeLog,
    artifacts: artifactUrls(session.id, session)
  });
}

async function handleApplyFixes(req, res) {
  const body = await parseJson(req);
  const session = sessions.get(body.sessionId);
  if (!session) return sendError(res, 404, "Session not found");
  session.styleSystem = body.styleSystem || session.styleSystem;
  session.gridSystem = body.gridSystem || session.gridSystem;
  let issueIds = body.issueIds || [];
  if (body.mode === "all-auto") {
    issueIds = session.report.issues.filter((issue) => issue.autoFix).map((issue) => issue.id);
  }
  if (body.mode === "all-manual") {
    issueIds = session.report.issues.filter((issue) => !issue.autoFix).map((issue) => issue.id);
  }
  applyFixes(session, issueIds, body.mode === "all-manual" ? "Manual review" : "AI fix");
  await writeArtifacts(session.id, session);
  sendJson(res, 200, {
    ok: true,
    sessionId: session.id,
    report: session.report,
    changeLog: session.changeLog,
    artifacts: artifactUrls(session.id, session)
  });
}

async function handleRescan(req, res) {
  const body = await parseJson(req);
  const session = sessions.get(body.sessionId);
  if (!session) return sendError(res, 404, "Session not found");
  session.extraction = extractDeck(session.filePath, session.file);
  recalcReport(session);
  await writeArtifacts(session.id, session);
  sendJson(res, 200, {
    ok: true,
    sessionId: session.id,
    report: session.report,
    changeLog: session.changeLog,
    artifacts: artifactUrls(session.id, session)
  });
}

async function serveArtifact(req, res, sessionId, fileName) {
  const session = sessions.get(sessionId);
  if (!session) return sendError(res, 404, "Session not found");
  const allowed = new Set(["edit-brief.txt", "cleaned-preview.html", "fixed-deck.pptx"]);
  if (!allowed.has(fileName)) return sendError(res, 404, "Artifact not found");
  const filePath = fileName === "fixed-deck.pptx" ? session.fixedDeckPath : path.join(dataDir, sessionId, fileName);
  if (!filePath || !fs.existsSync(filePath)) return sendError(res, 404, "Artifact not available");
  const ext = path.extname(fileName);
  res.writeHead(200, {
    "content-type": mimeTypes[ext] || "application/octet-stream",
    "content-disposition": `attachment; filename="${fileName}"`
  });
  fs.createReadStream(filePath).pipe(res);
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(rootDir, `.${requested}`);
  if (!filePath.startsWith(rootDir)) return sendError(res, 403, "Forbidden");
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) return sendError(res, 404, "Not found");
    res.writeHead(200, { "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function route(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, service: "FoundLater API" });
    }
    if (req.method === "POST" && url.pathname === "/api/sms") return handleSms(req, res);
    if (req.method === "POST" && url.pathname === "/api/scan") return handleScan(req, res);
    if (req.method === "POST" && url.pathname === "/api/apply-fixes") return handleApplyFixes(req, res);
    if (req.method === "POST" && url.pathname === "/api/rescan") return handleRescan(req, res);
    const artifactMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/([^/]+)$/);
    if (req.method === "GET" && artifactMatch) return serveArtifact(req, res, artifactMatch[1], artifactMatch[2]);
    if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res, url.pathname);
    sendError(res, 405, "Method not allowed");
  } catch (error) {
    sendError(res, 500, "Backend error", { detail: error.message });
  }
}

http.createServer(route).listen(port, () => {
  console.log(`FoundLater running at http://127.0.0.1:${port}`);
});
