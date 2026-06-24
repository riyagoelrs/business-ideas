const STORAGE_KEY = "foundlater.saves.v1";

const platformRules = [
  { key: "instagram", label: "Instagram", domains: ["instagram.com", "instagr.am"], color: "#d94876" },
  { key: "tiktok", label: "TikTok", domains: ["tiktok.com", "vm.tiktok.com"], color: "#111827" },
  { key: "substack", label: "Substack", domains: ["substack.com"], color: "#f06a2f" },
  { key: "pinterest", label: "Pinterest", domains: ["pinterest.com", "pin.it"], color: "#bd1e2d" },
  { key: "etsy", label: "Etsy", domains: ["etsy.com"], color: "#d5641c" },
  { key: "shopify", label: "Shop", domains: ["myshopify.com"], color: "#158866" },
  { key: "newsletter", label: "Newsletter", domains: ["mailchi.mp", "beehiiv.com", "convertkit-mail.com"], color: "#6c63ff" },
  { key: "web", label: "Web", domains: [], color: "#2f73d8" }
];

const categoryRules = [
  { name: "Apartment Move", words: ["apartment", "move", "moving", "furniture", "console", "sofa", "home", "decor", "lamp", "rug", "chair", "table"] },
  { name: "Summer Closet", words: ["summer", "bathing", "swimsuit", "bikini", "dress", "linen", "vacation", "closet", "outfit", "sandals"] },
  { name: "Gift Ideas", words: ["gift", "mom", "dad", "birthday", "holiday", "present", "friend", "anniversary"] },
  { name: "Brands to Try", words: ["brand", "try", "skincare", "makeup", "supplement", "coffee", "restaurant", "salon"] },
  { name: "Creators to Hire", words: ["creator", "commission", "photographer", "designer", "stylist", "maker", "artist", "custom", "hire"] },
  { name: "Read Later", words: ["article", "newsletter", "substack", "essay", "report", "podcast", "read", "listen"] }
];

const tagRules = {
  furniture: ["furniture", "console", "sofa", "chair", "table", "dresser", "nightstand", "wood", "walnut", "oak", "custom"],
  home: ["home", "apartment", "decor", "lamp", "rug", "kitchen", "bath", "bedroom"],
  clothing: ["dress", "bathing", "swimsuit", "bikini", "outfit", "shoes", "linen"],
  creator: ["creator", "maker", "artist", "designer", "studio", "commission"],
  brand: ["brand", "shop", "company", "store", "label"],
  newsletter: ["newsletter", "substack", "essay", "article"],
  sale: ["sale", "discount", "drop", "restock"],
  gift: ["gift", "present", "birthday", "mom", "dad"]
};

const examples = [
  {
    text: "https://www.instagram.com/reel/CUSTOMWOOD apartment furniture custom walnut console for my move in 5 months @oakandlinen",
    collection: "Apartment Move"
  },
  {
    text: "https://www.tiktok.com/@maisonvale/video/713 summer striped bathing suit brand to revisit before July vacation",
    collection: "Summer Closet"
  },
  {
    text: "https://studiojoinery.example.com/custom The Joinery House can build curved entry tables. Ask for quote when lease is signed.",
    collection: "Apartment Move"
  },
  {
    text: "https://reminder.substack.com/p/slow-shopping newsletter about small brands and better purchase timing",
    collection: "Read Later"
  },
  {
    text: "https://www.etsy.com/listing/ceramic-lamp handmade ceramic lamp for nightstand, maybe gift for mom",
    collection: "Gift Ideas"
  }
];

const state = {
  saves: [],
  messages: [],
  selectedId: null,
  query: "",
  platformFilter: "all",
  collectionFilter: "all"
};

const dom = {
  saveForm: document.getElementById("saveForm"),
  phoneNumber: document.getElementById("phoneNumber"),
  saveText: document.getElementById("saveText"),
  quickCollection: document.getElementById("quickCollection"),
  messageStream: document.getElementById("messageStream"),
  searchInput: document.getElementById("searchInput"),
  searchButton: document.getElementById("searchButton"),
  clearButton: document.getElementById("clearButton"),
  seedButton: document.getElementById("seedButton"),
  saveList: document.getElementById("saveList"),
  collectionList: document.getElementById("collectionList"),
  detailPanel: document.getElementById("detailPanel"),
  platformFilter: document.getElementById("platformFilter"),
  savedCount: document.getElementById("savedCount"),
  platformCount: document.getElementById("platformCount"),
  reminderCount: document.getElementById("reminderCount"),
  readyCount: document.getElementById("readyCount"),
  messageTemplate: document.getElementById("messageTemplate")
};

const smsColors = {
  Instagram: "#d94876",
  TikTok: "#111827",
  Substack: "#f06a2f",
  Etsy: "#d5641c",
  Web: "#2f73d8"
};

function uid() {
  return `save-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    state.saves = Array.isArray(stored) ? stored : [];
  } catch {
    state.saves = [];
  }

  if (!state.saves.length) {
    state.messages = [
      botMessage("Forward any link, post, creator, product, or newsletter here."),
      botMessage("Then ask for it later in plain English.")
    ];
  } else {
    state.messages = [botMessage(`You have ${state.saves.length} saved memories ready to search.`)];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.saves));
}

function botMessage(text) {
  return { id: uid(), role: "bot", text, createdAt: new Date().toISOString() };
}

function userMessage(text) {
  return { id: uid(), role: "user", text, createdAt: new Date().toISOString() };
}

function extractUrl(text) {
  const match = text.match(/https?:\/\/[^\s]+|(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?/i);
  if (!match) return "";
  let url = match[0].replace(/[),.]+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

function hostFor(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function detectPlatform(url, text) {
  const host = hostFor(url);
  const lowered = `${host} ${text}`.toLowerCase();
  return platformRules.find((rule) => {
    if (rule.domains.some((domain) => lowered.includes(domain))) return true;
    return lowered.includes(rule.key);
  }) || platformRules.find((rule) => rule.key === "web");
}

function cleanText(text, url) {
  return text
    .replace(url, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordsFor(text) {
  return (text.toLowerCase().match(/[a-z0-9@#]+/g) || [])
    .map((word) => word.replace(/^#/, ""))
    .filter((word) => word.length > 1);
}

function inferCollection(text, chosen) {
  if (chosen) return chosen;
  const explicit = text.match(/(?:under|to|in|for)\s+["']?([a-z0-9 ]{3,32})["']?/i);
  if (explicit) {
    const value = explicit[1].trim();
    const match = categoryRules.find((rule) => value.toLowerCase().includes(rule.name.toLowerCase()));
    if (match) return match.name;
  }

  const tokens = new Set(wordsFor(text));
  const scored = categoryRules
    .map((rule) => ({
      name: rule.name,
      score: rule.words.reduce((sum, word) => sum + (tokens.has(word) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score ? scored[0].name : "Someday";
}

function inferTags(text, platform) {
  const tokens = new Set(wordsFor(text));
  const tags = Object.entries(tagRules)
    .filter(([, words]) => words.some((word) => tokens.has(word)))
    .map(([tag]) => tag);

  if (platform.key !== "web") tags.unshift(platform.key);
  const hashTags = [...text.matchAll(/#([a-z0-9_-]+)/gi)].map((match) => match[1].toLowerCase());
  return [...new Set([...tags, ...hashTags])].slice(0, 7);
}

function inferReminder(text) {
  const lowered = text.toLowerCase();
  const monthMatch = lowered.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  const relativeMatch = lowered.match(/\bin\s+(\d+)\s+(day|week|month|year)s?\b/);
  const beforeMatch = lowered.match(/\bbefore\s+([a-z0-9 ]{3,24})/);
  const saleMatch = lowered.match(/\b(on sale|sale|restock|drop)\b/);

  if (relativeMatch) {
    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2];
    const date = new Date();
    if (unit === "day") date.setDate(date.getDate() + amount);
    if (unit === "week") date.setDate(date.getDate() + amount * 7);
    if (unit === "month") date.setMonth(date.getMonth() + amount);
    if (unit === "year") date.setFullYear(date.getFullYear() + amount);
    return {
      label: `Review in ${amount} ${unit}${amount === 1 ? "" : "s"}`,
      date: date.toISOString()
    };
  }

  if (monthMatch) return { label: `Review in ${capitalize(monthMatch[1])}`, date: "" };
  if (beforeMatch) return { label: `Review before ${beforeMatch[1].trim()}`, date: "" };
  if (saleMatch) return { label: "Watch for sale or restock", date: "" };
  return null;
}

function inferTitle(note, url, platform) {
  const handle = note.match(/@[a-z0-9._-]+/i)?.[0];
  if (handle) return handle;

  const host = hostFor(url);
  const meaningful = note
    .replace(/#\w+/g, "")
    .split(/[,.]/)[0]
    .trim();

  if (meaningful.length > 9) {
    const words = meaningful.split(/\s+/).slice(0, 8).join(" ");
    return capitalizeSentence(words);
  }
  if (host) return host.split(".")[0].replace(/-/g, " ");
  return `${platform.label} save`;
}

function parseSave(text, collection) {
  const url = extractUrl(text);
  const platform = detectPlatform(url, text);
  const note = cleanText(text, url);
  const title = inferTitle(note || text, url, platform);
  const inferredCollection = inferCollection(text, collection);
  const tags = inferTags(text, platform);
  const reminder = inferReminder(text);
  const now = new Date().toISOString();

  return {
    id: uid(),
    title,
    url,
    note: note || text,
    originalText: text,
    platform: platform.key,
    platformLabel: platform.label,
    platformColor: platform.color,
    collection: inferredCollection,
    tags,
    reminder,
    createdAt: now,
    updatedAt: now
  };
}

function saveText(text, collection = "") {
  const save = parseSave(text.trim(), collection);
  state.saves.unshift(save);
  state.selectedId = save.id;
  persist();

  state.messages.push(userMessage(text.trim()));
  state.messages.push(botMessage(`Saved to ${save.collection}. Tags: ${save.tags.length ? save.tags.join(", ") : "none"}.`));
  render();
}

async function sendSmsMessage(text) {
  const phone = dom.phoneNumber.value.trim() || "+15550001000";
  state.messages.push(userMessage(text.trim()));
  renderMessages();

  const fields = new URLSearchParams();
  fields.set("From", phone);
  fields.set("Body", text.trim());

  try {
    const response = await fetch("/api/sms", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/x-www-form-urlencoded"
      },
      body: fields
    });
    if (!response.ok) throw new Error(`SMS endpoint returned ${response.status}`);
    const result = await response.json();
    let reply = result.reply;

    if (result.mode === "save" && result.save) {
      const save = normalizeServerSave(result.save);
      upsertSave(save);
      state.selectedId = save.id;
    }

    if (result.mode === "search" && result.matches?.length) {
      const saves = result.matches.map(normalizeServerSave);
      for (const save of saves) upsertSave(save);
      state.query = result.query || "";
      dom.searchInput.value = state.query;
      state.selectedId = saves[0].id;
    }

    if (result.mode === "search" && !result.matches?.length) {
      const query = result.query || searchQueryFromSmsText(text);
      const localMatches = localSearchMatches(query);
      if (localMatches.length) {
        reply = formatLocalSmsResults(localMatches);
        state.query = query;
        dom.searchInput.value = query;
        state.selectedId = localMatches[0].id;
      }
    }

    state.messages.push(botMessage(reply));
    persist();
    render();
  } catch (error) {
    state.messages.push(botMessage("Local SMS server is not reachable, so I saved this in browser-only mode."));
    saveText(text, dom.quickCollection.value);
  }
}

function searchQueryFromSmsText(text) {
  return text
    .replace(/^(find|search|show|get|pull up|look up)\s+/i, "")
    .replace(/^(what|where)\s+(?:was|is|are|were)?\s*/i, "")
    .replace(/^list\s+/i, "")
    .trim();
}

function localSearchMatches(query) {
  return state.saves
    .map((save) => ({ save, score: scoreSave(save, query) }))
    .filter(({ score }) => !query || score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.save.createdAt) - new Date(a.save.createdAt))
    .map(({ save }) => save)
    .slice(0, 3);
}

function formatLocalSmsResults(matches) {
  return matches.map((save, index) => {
    const link = save.url ? ` ${save.url}` : "";
    return `${index + 1}. ${save.title} (${save.collection})${link}`;
  }).join("\n");
}

function normalizeServerSave(save) {
  return {
    id: save.id,
    title: save.title || "Saved item",
    url: save.url || "",
    note: save.note || save.body || "",
    originalText: save.body || save.note || "",
    platform: String(save.platform || "Web").toLowerCase(),
    platformLabel: save.platform || "Web",
    platformColor: smsColors[save.platform] || "#2f73d8",
    collection: save.collection || "Someday",
    tags: save.tags || [],
    reminder: save.reminder ? { label: save.reminder, date: "" } : null,
    createdAt: save.createdAt || new Date().toISOString(),
    updatedAt: save.createdAt || new Date().toISOString()
  };
}

function upsertSave(save) {
  const index = state.saves.findIndex((item) => item.id === save.id);
  if (index === -1) {
    state.saves.unshift(save);
  } else {
    state.saves[index] = save;
  }
}

function scoreSave(save, query) {
  if (!query.trim()) return 1;
  const haystack = [
    save.title,
    save.note,
    save.originalText,
    save.url,
    save.collection,
    save.platformLabel,
    ...(save.tags || []),
    save.reminder?.label || ""
  ].join(" ").toLowerCase();

  const terms = wordsFor(query);
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score += 5;
    if (save.title.toLowerCase().includes(term)) score += 4;
    if (save.collection.toLowerCase().includes(term)) score += 3;
    if ((save.tags || []).some((tag) => tag.includes(term))) score += 3;
  }
  return score;
}

function filteredSaves() {
  return state.saves
    .map((save) => ({ save, score: scoreSave(save, state.query) }))
    .filter(({ save, score }) => {
      if (state.platformFilter !== "all" && save.platform !== state.platformFilter) return false;
      if (state.collectionFilter !== "all" && save.collection !== state.collectionFilter) return false;
      return !state.query.trim() || score > 0;
    })
    .sort((a, b) => {
      if (state.query.trim() && b.score !== a.score) return b.score - a.score;
      return new Date(b.save.createdAt) - new Date(a.save.createdAt);
    })
    .map(({ save }) => save);
}

function render() {
  renderMessages();
  renderMetrics();
  renderPlatformFilter();
  renderCollections();
  renderSaves();
  renderDetail();
}

function renderMessages() {
  dom.messageStream.innerHTML = "";
  for (const message of state.messages.slice(-8)) {
    const node = dom.messageTemplate.content.firstElementChild.cloneNode(true);
    node.classList.add(message.role === "user" ? "is-user" : "is-bot");
    node.querySelector("p").textContent = message.text;
    node.querySelector("small").textContent = new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(message.createdAt));
    dom.messageStream.append(node);
  }
  dom.messageStream.scrollTop = dom.messageStream.scrollHeight;
}

function renderMetrics() {
  const platformSet = new Set(state.saves.map((save) => save.platform));
  const reminders = state.saves.filter((save) => save.reminder);
  const soon = reminders.filter((save) => {
    if (!save.reminder?.date) return true;
    const due = new Date(save.reminder.date).getTime();
    const days = (due - Date.now()) / 86400000;
    return days <= 45;
  });

  dom.savedCount.textContent = state.saves.length;
  dom.platformCount.textContent = platformSet.size;
  dom.reminderCount.textContent = reminders.length;
  dom.readyCount.textContent = soon.length;
}

function renderPlatformFilter() {
  const current = dom.platformFilter.value || state.platformFilter;
  const platforms = [...new Map(state.saves.map((save) => [save.platform, save.platformLabel])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));

  dom.platformFilter.innerHTML = '<option value="all">All platforms</option>';
  for (const [key, label] of platforms) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = label;
    dom.platformFilter.append(option);
  }
  dom.platformFilter.value = platforms.some(([key]) => key === current) ? current : "all";
  state.platformFilter = dom.platformFilter.value;
}

function renderCollections() {
  const counts = new Map();
  for (const save of state.saves) counts.set(save.collection, (counts.get(save.collection) || 0) + 1);
  const collections = [["all", "All saves", state.saves.length], ...[...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => [name, name, count])];

  dom.collectionList.innerHTML = "";
  for (const [value, label, count] of collections) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `collection-button${state.collectionFilter === value ? " is-active" : ""}`;
    button.dataset.collection = value;
    button.innerHTML = `<span>${escapeHtml(label)}</span><strong>${count}</strong>`;
    dom.collectionList.append(button);
  }
}

function renderSaves() {
  const saves = filteredSaves();
  dom.saveList.innerHTML = "";

  if (!saves.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = state.saves.length ? "No matching saves yet." : "Your first saves will appear here.";
    dom.saveList.append(empty);
    return;
  }

  for (const save of saves) {
    const article = document.createElement("article");
    article.className = `save-card${state.selectedId === save.id ? " is-selected" : ""}`;
    article.tabIndex = 0;
    article.dataset.id = save.id;
    article.innerHTML = `
      <div class="thumb" style="--thumb-color: ${escapeHtml(save.platformColor)}">
        <span>${escapeHtml(initials(save.platformLabel))}</span>
      </div>
      <div class="save-body">
        <div class="save-title-row">
          <h3>${escapeHtml(save.title)}</h3>
          <small>${escapeHtml(relativeDate(save.createdAt))}</small>
        </div>
        <p>${escapeHtml(save.note)}</p>
        <div class="tag-row">
          <span>${escapeHtml(save.platformLabel)}</span>
          <span>${escapeHtml(save.collection)}</span>
          ${(save.tags || []).slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
    `;
    dom.saveList.append(article);
  }
}

function renderDetail() {
  const save = state.saves.find((item) => item.id === state.selectedId);
  if (!save) {
    dom.detailPanel.innerHTML = '<p class="empty-state">Select a save to see the original text, inferred tags, reminders, and source link.</p>';
    return;
  }

  dom.detailPanel.innerHTML = `
    <div class="detail-head">
      <div class="thumb large" style="--thumb-color: ${escapeHtml(save.platformColor)}">
        <span>${escapeHtml(initials(save.platformLabel))}</span>
      </div>
      <div>
        <p class="eyebrow">${escapeHtml(save.platformLabel)}</p>
        <h2>${escapeHtml(save.title)}</h2>
      </div>
    </div>
    <dl class="detail-list">
      <div>
        <dt>Collection</dt>
        <dd>${escapeHtml(save.collection)}</dd>
      </div>
      <div>
        <dt>Reminder</dt>
        <dd>${escapeHtml(save.reminder?.label || "None")}</dd>
      </div>
      <div>
        <dt>Saved text</dt>
        <dd>${escapeHtml(save.originalText)}</dd>
      </div>
      <div>
        <dt>Tags</dt>
        <dd>${save.tags.length ? save.tags.map((tag) => `<span class="detail-tag">${escapeHtml(tag)}</span>`).join("") : "None"}</dd>
      </div>
    </dl>
    <div class="detail-actions">
      ${save.url ? `<a class="primary-button" href="${escapeHtml(save.url)}" target="_blank" rel="noreferrer">Open source</a>` : ""}
      <button class="secondary-button" type="button" data-delete="${escapeHtml(save.id)}">Delete</button>
    </div>
  `;
}

function runSearch() {
  state.query = dom.searchInput.value.trim();
  if (state.query) {
    const matches = filteredSaves();
    state.messages.push(userMessage(state.query));
    state.messages.push(botMessage(matches.length ? `Found ${matches.length} match${matches.length === 1 ? "" : "es"}. Best result: ${matches[0].title}.` : "I could not find that yet."));
    if (matches[0]) state.selectedId = matches[0].id;
  }
  render();
}

function loadExamples() {
  const existingTexts = new Set(state.saves.map((save) => save.originalText));
  let added = 0;
  for (const example of examples) {
    if (!existingTexts.has(example.text)) {
      state.saves.unshift(parseSave(example.text, example.collection));
      added += 1;
    }
  }
  if (state.saves[0]) state.selectedId = state.saves[0].id;
  persist();
  state.messages.push(botMessage(added ? `Loaded ${added} example saves.` : "Examples are already loaded."));
  render();
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function initials(value) {
  return String(value || "FL")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function capitalizeSentence(value) {
  return value.replace(/(^|\s)([a-z])/g, (match) => match.toUpperCase());
}

function relativeDate(iso) {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

dom.saveForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = dom.saveText.value.trim();
  if (!text) return;
  await sendSmsMessage(text);
  dom.saveText.value = "";
  dom.quickCollection.value = "";
});

dom.searchButton.addEventListener("click", runSearch);
dom.searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") runSearch();
});

dom.clearButton.addEventListener("click", () => {
  dom.searchInput.value = "";
  state.query = "";
  state.platformFilter = "all";
  state.collectionFilter = "all";
  render();
});

dom.seedButton.addEventListener("click", loadExamples);

dom.platformFilter.addEventListener("change", () => {
  state.platformFilter = dom.platformFilter.value;
  renderSaves();
});

dom.collectionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-collection]");
  if (!button) return;
  state.collectionFilter = button.dataset.collection;
  render();
});

dom.saveList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-id]");
  if (!card) return;
  state.selectedId = card.dataset.id;
  render();
});

dom.saveList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-id]");
  if (!card) return;
  event.preventDefault();
  state.selectedId = card.dataset.id;
  render();
});

dom.detailPanel.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  state.saves = state.saves.filter((save) => save.id !== button.dataset.delete);
  state.selectedId = state.saves[0]?.id || null;
  state.messages.push(botMessage("Deleted the selected save."));
  persist();
  render();
});

loadState();
render();
