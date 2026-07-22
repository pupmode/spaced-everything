var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SpacedEverythingPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian13 = require("obsidian");

// src/store.ts
var EMPTY_DATA = { reviewLoadLog: [], reviewHistory: [] };
async function loadStore(plugin) {
  var _a;
  const saved = await plugin.loadData();
  return (_a = saved == null ? void 0 : saved.pluginData) != null ? _a : EMPTY_DATA;
}
async function _saveStore(plugin, data) {
  var _a;
  const MAX_HISTORY = 1e4;
  if (data.reviewHistory.length > MAX_HISTORY) {
    data = { ...data, reviewHistory: data.reviewHistory.slice(-MAX_HISTORY) };
  }
  const current = (_a = await plugin.loadData()) != null ? _a : {};
  await plugin.saveData({ ...current, pluginData: data });
}
var saveQueue = Promise.resolve();
function saveStore(plugin, data) {
  saveQueue = saveQueue.then(() => _saveStore(plugin, data));
  return saveQueue;
}

// src/ReviewModal.ts
var import_obsidian6 = require("obsidian");

// src/types.ts
var DEFAULT_SETTINGS = {
  sourceScope: "vault",
  sourceFolders: [],
  evergreenFolder: "Evergreen",
  initialInterval: 1,
  defaultEaseFactor: 300,
  renameFolderWithDeck: true,
  recentUndueThreshold: 0.5,
  excitingThreshold: 0.7,
  reactionSetMode: "default",
  customReactionSets: [],
  weekendDays: ["Sat", "Sun"],
  noteStateValues: ["\u{1F331}", "\u{1F33F}", "\u{1F332}"]
};
var PRESET_DEFAULT = [
  { id: "exciting", label: "Exciting" },
  { id: "interesting", label: "Interesting" },
  { id: "yeah", label: "Yeah" },
  { id: "lol", label: "Lol" },
  { id: "meh", label: "Meh" },
  { id: "cringe", label: "Cringe" },
  { id: "taxing", label: "Taxing" }
];
var PRESET_ANKI = [
  { id: "easy", label: "Easy" },
  { id: "good", label: "Good" },
  { id: "hard", label: "Hard" },
  { id: "again", label: "Again" }
];
function getActiveReactions(settings) {
  var _a;
  if (settings.reactionSetMode === "anki") return PRESET_ANKI;
  const activeSet = (_a = settings.customReactionSets) == null ? void 0 : _a.find((s) => s.id === settings.reactionSetMode);
  if (activeSet) return activeSet.reactions;
  return PRESET_DEFAULT;
}

// src/utils.ts
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function getAllDeckNames(app) {
  var _a, _b;
  const deckSet = /* @__PURE__ */ new Set();
  for (const file of app.vault.getMarkdownFiles()) {
    const decks = (_b = (_a = app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter) == null ? void 0 : _b.decks;
    if (Array.isArray(decks))
      decks.forEach((d) => {
        if (d) deckSet.add(d);
      });
    else if (typeof decks === "string" && decks) deckSet.add(decks);
  }
  return Array.from(deckSet).sort();
}
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function getActiveNotes(app, notes) {
  return notes.filter((n) => {
    var _a, _b;
    const f = app.vault.getAbstractFileByPath(n.filepath);
    return f ? ((_b = (_a = app.metadataCache.getFileCache(f)) == null ? void 0 : _a.frontmatter) == null ? void 0 : _b.active) === true : false;
  });
}
function getCurrentTimeblock() {
  const hour = (/* @__PURE__ */ new Date()).getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}
function filterByEnergyLevel(notes, level) {
  const highColors = ["\u{1F525}", "\u{1F33F}"];
  const lowColors = ["\u{1FA94}", "\u{1F30A}"];
  const allowed = level === "high" ? [...highColors, ...lowColors] : lowColors;
  return notes.filter((n) => {
    if (!n.energy) return true;
    const energies = Array.isArray(n.energy) ? n.energy : [n.energy];
    return energies.some((e) => allowed.includes(e));
  });
}
function filterByTimeblock(notes, timeblocks) {
  if (timeblocks.length === 0) return notes;
  return notes.filter((n) => {
    if (!n.timeblock) return true;
    const blocks = Array.isArray(n.timeblock) ? n.timeblock : [n.timeblock];
    return blocks.some((b) => timeblocks.includes(b));
  });
}
function filterByContext(notes, contexts) {
  if (contexts.length === 0) return notes;
  return notes.filter((n) => {
    if (!n.context) return true;
    const noteContexts = Array.isArray(n.context) ? n.context : [n.context];
    return noteContexts.some((c) => contexts.includes(c));
  });
}
function getAllContextValues(app) {
  var _a;
  const contextSet = /* @__PURE__ */ new Set();
  for (const file of app.vault.getMarkdownFiles()) {
    const fm = (_a = app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
    if (!(fm == null ? void 0 : fm.active)) continue;
    const ctx = fm == null ? void 0 : fm.context;
    if (Array.isArray(ctx))
      ctx.forEach((c) => {
        if (c) contextSet.add(c);
      });
    else if (typeof ctx === "string" && ctx) contextSet.add(ctx);
  }
  return Array.from(contextSet).sort();
}
var timescope_DAYS = {
  daily: 1,
  "every-other-day": 2,
  weekly: 7,
  "every-other-week": 14,
  monthly: 30,
  seasonal: 91,
  yearly: 365
};
function isDue(fm) {
  const freq = fm.timescope;
  if (!freq) return false;
  const interval = timescope_DAYS[freq];
  if (!interval) return false;
  const last = fm.last_completed;
  if (!last) return true;
  const daysSince = Math.floor((new Date(today()).getTime() - new Date(last).getTime()) / 864e5);
  return daysSince >= interval;
}

// src/scheduler.ts
var MAX_INTERVAL = 365;
var MIN_INTERVAL = 1;
var MAX_EASE = 500;
function folderWeight(filepath, settings) {
  if (settings.sourceScope !== "folder") return 1;
  const entry = settings.sourceFolders.find((e) => filepath.startsWith(e.path + "/"));
  return entry ? entry.weight / 100 : 1;
}
function daysBetween(a, b) {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 864e5);
}
function numDaysOverdue(note) {
  if (note.interval < 0) return note.interval;
  const daysSinceReviewed = daysBetween(note.lastReviewedOn, today());
  return daysSinceReviewed - note.interval;
}
function noteIsDue(note) {
  return numDaysOverdue(note) >= 0;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function reactionT(id, reactions) {
  const idx = reactions.findIndex((r) => r.id === id);
  if (idx === -1) return 0.5;
  return reactions.length === 1 ? 0.5 : idx / (reactions.length - 1);
}
function nextInterval(note, reaction, reactions) {
  const { interval, easeFactor } = note;
  if (reaction === "skip") return interval;
  const reactionDef = reactions.find((r) => r.id === reaction);
  if ((reactionDef == null ? void 0 : reactionDef.manualOverride) && reactionDef.intervalMult !== void 0) {
    return Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, Math.floor(interval * reactionDef.intervalMult)));
  }
  const autoReactions = reactions.filter((r) => !r.manualOverride);
  const t = reactionT(reaction, autoReactions);
  let m;
  if (t <= 0.5) {
    m = lerp(0.5, 1, t * 2);
  } else {
    m = lerp(1, easeFactor / 100, (t - 0.5) * 2);
  }
  return Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, Math.floor(interval * m)));
}
function nextEaseFactor(note, reaction, reactions) {
  if (reaction === "skip") return note.easeFactor;
  const reactionDef = reactions.find((r) => r.id === reaction);
  if ((reactionDef == null ? void 0 : reactionDef.manualOverride) && reactionDef.easeDelta !== void 0) {
    return Math.min(MAX_EASE, Math.max(130, note.easeFactor + reactionDef.easeDelta));
  }
  const autoReactions = reactions.filter((r) => !r.manualOverride);
  const t = reactionT(reaction, autoReactions);
  const delta = Math.round(lerp(20, -20, t));
  return Math.min(MAX_EASE, Math.max(130, note.easeFactor + delta));
}
function weightedRandom(candidates, weights) {
  if (!candidates.length) return null;
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}
function pickNoteToReview(notes, settings) {
  var _a, _b;
  const rand = Math.random();
  if (rand < settings.recentUndueThreshold) {
    const recentUnreviewed = notes.filter((n) => {
      const age = daysBetween(n.createdOn, today());
      return n.interval >= 0 && n.noteState === "normal" && age <= 50 && n.reviewedCount === 0;
    });
    if (recentUnreviewed.length) {
      return recentUnreviewed[Math.floor(Math.random() * recentUnreviewed.length)];
    }
  }
  const reactions = getActiveReactions(settings);
  if (rand < settings.excitingThreshold) {
    const excitingId = (_b = (_a = reactions[0]) == null ? void 0 : _a.id) != null ? _b : "exciting";
    const exciting = notes.filter((n) => noteIsDue(n) && n.noteState === excitingId);
    const weights2 = exciting.map(
      (n) => Math.pow(Math.max(1, numDaysOverdue(n)), 2) * folderWeight(n.filepath, settings)
    );
    const picked = weightedRandom(exciting, weights2);
    if (picked) return picked;
  }
  const allDue = notes.filter((n) => noteIsDue(n));
  const weights = allDue.map((n) => {
    let sw;
    if (n.noteState === "normal") {
      sw = 1;
    } else {
      const t = reactionT(n.noteState, reactions);
      sw = lerp(1.5, 0.3, t);
    }
    return Math.pow(Math.max(1, numDaysOverdue(n)), 2) * folderWeight(n.filepath, settings) * sw;
  });
  return weightedRandom(allDue, weights);
}

// src/frontmatter.ts
function daysAgo(n) {
  const d = /* @__PURE__ */ new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
function readNoteRecord(plugin, file) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const fm = (_b = (_a = plugin.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter) != null ? _b : {};
  const stored = (_c = plugin.data.noteRecords) == null ? void 0 : _c[file.path];
  const { defaultEaseFactor, initialInterval } = plugin.settings;
  return {
    filepath: file.path,
    easeFactor: (_d = stored == null ? void 0 : stored.easeFactor) != null ? _d : defaultEaseFactor,
    interval: (_e = stored == null ? void 0 : stored.interval) != null ? _e : initialInterval,
    lastReviewedOn: (_f = stored == null ? void 0 : stored.lastReviewedOn) != null ? _f : daysAgo(initialInterval),
    createdOn: (_g = stored == null ? void 0 : stored.createdOn) != null ? _g : today(),
    reviewedCount: (_h = stored == null ? void 0 : stored.reviewedCount) != null ? _h : 0,
    noteState: (_i = stored == null ? void 0 : stored.noteState) != null ? _i : "normal",
    active: fm.active,
    decks: fm.decks
  };
}
async function writeNoteRecord(plugin, filepath, updates) {
  var _a;
  if (!plugin.data.noteRecords) plugin.data.noteRecords = {};
  const existing = (_a = plugin.data.noteRecords[filepath]) != null ? _a : {
    easeFactor: plugin.settings.defaultEaseFactor,
    interval: plugin.settings.initialInterval,
    lastReviewedOn: daysAgo(plugin.settings.initialInterval),
    createdOn: today(),
    reviewedCount: 0,
    noteState: "normal"
  };
  plugin.data.noteRecords[filepath] = { ...existing, ...updates };
  await saveStore(plugin, plugin.data);
}
async function writeFrontmatterActionable(app, filepath, opts) {
  const file = app.vault.getAbstractFileByPath(filepath);
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.active = true;
    if (opts.energy !== void 0) fm.energy = opts.energy;
    if (opts.timeblock !== void 0) fm.timeblock = opts.timeblock;
  });
}
async function writeFrontmatterState(app, filepath, state) {
  const file = app.vault.getAbstractFileByPath(filepath);
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.state = state;
  });
}
function getNotesFromVault(plugin) {
  const files = plugin.app.vault.getMarkdownFiles().filter((f) => {
    if (plugin.settings.sourceScope === "folder") {
      return plugin.settings.sourceFolders.some((e) => f.path.startsWith(e.path + "/"));
    }
    return true;
  });
  return files.map((f) => readNoteRecord(plugin, f));
}
async function migrateSeToStore(plugin) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
  if (plugin.data.noteRecords !== void 0) return;
  plugin.data.noteRecords = {};
  const { defaultEaseFactor, initialInterval } = plugin.settings;
  for (const file of plugin.app.vault.getMarkdownFiles()) {
    const fm = (_b = (_a = plugin.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter) != null ? _b : {};
    const nested = (_c = fm.se) != null ? _c : {};
    const hasSeData = nested.ease !== void 0 || nested.interval !== void 0 || fm.se_ease !== void 0 || fm.se_interval !== void 0 || fm.se_archived === true;
    if (hasSeData) {
      plugin.data.noteRecords[file.path] = {
        easeFactor: (_e = (_d = nested.ease) != null ? _d : fm.se_ease) != null ? _e : defaultEaseFactor,
        interval: fm.se_archived === true ? -1 : (_g = (_f = nested.interval) != null ? _f : fm.se_interval) != null ? _g : initialInterval,
        lastReviewedOn: (_h = fm.se_last_reviewed) != null ? _h : daysAgo(initialInterval),
        createdOn: (_j = (_i = nested.created) != null ? _i : fm.se_created) != null ? _j : today(),
        reviewedCount: (_l = (_k = nested.count) != null ? _k : fm.se_count) != null ? _l : 0,
        noteState: (_n = (_m = nested.state) != null ? _m : fm.se_state) != null ? _n : "normal"
      };
    }
    const hasAnySeKey = hasSeData || fm.se_last_reviewed !== void 0 || fm.se_next_review !== void 0;
    if (hasAnySeKey) {
      await plugin.app.fileManager.processFrontMatter(file, (fm2) => {
        delete fm2.se;
        delete fm2.se_ease;
        delete fm2.se_interval;
        delete fm2.se_last_reviewed;
        delete fm2.se_created;
        delete fm2.se_count;
        delete fm2.se_state;
        delete fm2.se_next_review;
        delete fm2.se_archived;
      });
    }
  }
  await saveStore(plugin, plugin.data);
}
async function writeFrontmatterActive(app, filepath, active) {
  const file = app.vault.getAbstractFileByPath(filepath);
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.active = active;
  });
}
async function writeFrontmatterRecurringComplete(app, filepath) {
  const file = app.vault.getAbstractFileByPath(filepath);
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.last_completed = today();
    fm.skipped = 0;
  });
}
async function writeFrontmatterDecks(app, filepath, decks) {
  const file = app.vault.getAbstractFileByPath(filepath);
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.decks = decks;
  });
}
function stripFrontmatter(raw) {
  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end !== -1) return { frontmatter: raw.slice(0, end + 4), body: raw.slice(end + 4).trimStart() };
  }
  return { frontmatter: "", body: raw };
}
async function writeFrontmatterSkip(app, filepath) {
  const file = app.vault.getAbstractFileByPath(filepath);
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    var _a;
    fm.skipped = ((_a = fm.skipped) != null ? _a : 0) + 1;
  });
}

// src/BaseNoteModal.ts
var import_obsidian4 = require("obsidian");

// src/RouteFolderModal.ts
var import_obsidian = require("obsidian");
var RouteFolderModal = class extends import_obsidian.Modal {
  constructor(app, note, plugin, onMoved) {
    super(app);
    this.note = note;
    this.plugin = plugin;
    this.onMoved = onMoved;
    this.selectedFolder = "";
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Route note to\u2026" });
    const lastFolder = this.plugin.data.lastRoutedFolder;
    if (lastFolder) {
      const quickBtn = contentEl.createEl("button", {
        text: `\u21A9 Move to ${lastFolder}`,
        cls: "spaced-btn mod-cta spaced-btn-quick-route"
      });
      quickBtn.style.marginBottom = "12px";
      quickBtn.addEventListener("click", async () => {
        await this.doMove(lastFolder);
      });
    }
    const folders = this.app.vault.getAllFolders().map((f) => f.path).sort();
    new import_obsidian.Setting(contentEl).setName("Destination folder").addDropdown((drop) => {
      drop.addOption("", "\u2014 select a folder \u2014");
      for (const f of folders) {
        drop.addOption(f, f);
      }
      drop.onChange((v) => {
        this.selectedFolder = v;
      });
    });
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());
    const confirmBtn = btnRow.createEl("button", { text: "Move", cls: "mod-cta" });
    confirmBtn.addEventListener("click", async () => {
      if (!this.selectedFolder) return;
      await this.doMove(this.selectedFolder);
    });
  }
  // ── Shared move logic ──────────────────────────────────────────────────────
  async doMove(folder) {
    const folderExists = this.app.vault.getAbstractFileByPath(folder) instanceof import_obsidian.TFolder;
    if (!folderExists) {
      new import_obsidian.Notice(`Folder "${folder}" no longer exists.`);
      return;
    }
    const currentFolder = this.note.filepath.includes("/") ? this.note.filepath.substring(0, this.note.filepath.lastIndexOf("/")) : "";
    if (currentFolder === folder) {
      new import_obsidian.Notice(`Note is already in "${folder}".`);
      return;
    }
    const filename = this.note.filepath.split("/").pop();
    const dest = `${folder}/${filename}`;
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath);
    try {
      if (file) {
        await this.app.vault.rename(file, dest);
        this.plugin.data.lastRoutedFolder = folder;
        await saveStore(this.plugin, this.plugin.data);
        this.onMoved(dest);
      }
    } catch (e) {
      new import_obsidian.Notice(`Could not move note: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    this.close();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/QuickNoteModal.ts
var import_obsidian3 = require("obsidian");

// src/deckDropdown.ts
var import_obsidian2 = require("obsidian");
function createDeckDropdown(app, anchor, initialDecks, onDecksChanged) {
  const allDecks = getAllDeckNames(app);
  const currentDecks = [...initialDecks];
  const dropdown = anchor.createDiv({ cls: "spaced-deck-dropdown" });
  const searchInput = dropdown.createEl("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search decks\u2026";
  searchInput.addClass("spaced-deck-search");
  const listEl = dropdown.createDiv({ cls: "spaced-deck-list" });
  const addDeck = async (name) => {
    const trimmed = name.trim();
    if (!trimmed || currentDecks.includes(trimmed)) return;
    currentDecks.push(trimmed);
    if (!allDecks.includes(trimmed)) {
      allDecks.push(trimmed);
      allDecks.sort();
    }
    await onDecksChanged(currentDecks);
    searchInput.value = "";
    renderList("");
  };
  const renderList = (filter2) => {
    listEl.empty();
    const filtered = allDecks.filter((d) => d.toLowerCase().includes(filter2.toLowerCase()));
    for (const deck of filtered) {
      const item = listEl.createDiv({ cls: "spaced-deck-item" });
      const cb = item.createEl("input");
      cb.type = "checkbox";
      cb.checked = currentDecks.includes(deck);
      item.createSpan({ text: deck });
      item.addEventListener("click", async (e) => {
        e.stopPropagation();
        const idx = currentDecks.indexOf(deck);
        if (idx >= 0) {
          currentDecks.splice(idx, 1);
          cb.checked = false;
        } else {
          currentDecks.push(deck);
          cb.checked = true;
        }
        await onDecksChanged(currentDecks);
      });
    }
    if (filter2.trim()) {
      const addItem = listEl.createDiv({ cls: "spaced-deck-item spaced-deck-add" });
      const iconEl = addItem.createDiv({ cls: "spaced-deck-add-icon" });
      (0, import_obsidian2.setIcon)(iconEl, "circle-plus");
      addItem.createSpan({ text: `Add "${filter2.trim()}"` });
      addItem.addEventListener("mousedown", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await addDeck(filter2.trim());
      });
    }
  };
  renderList("");
  searchInput.addEventListener("input", () => renderList(searchInput.value));
  searchInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    const filter2 = searchInput.value.trim();
    if (!filter2) return;
    const filtered = allDecks.filter((d) => d.toLowerCase().includes(filter2.toLowerCase()));
    if (filtered.length === 1) {
      const deck = filtered[0];
      const idx = currentDecks.indexOf(deck);
      if (idx >= 0) currentDecks.splice(idx, 1);
      else currentDecks.push(deck);
      await onDecksChanged(currentDecks);
      renderList(filter2);
    } else if (filtered.length === 0) {
      await addDeck(filter2);
    }
    e.preventDefault();
  });
  const outsideHandler = (e) => {
    if (!document.contains(dropdown) || !dropdown.contains(e.target)) {
      dropdown.remove();
      document.removeEventListener("mousedown", outsideHandler);
    }
  };
  setTimeout(() => document.addEventListener("mousedown", outsideHandler), 0);
  searchInput.focus();
  return { dropdown, outsideHandler };
}

// src/QuickNoteModal.ts
var QuickNoteModal = class extends import_obsidian3.Modal {
  constructor(app, plugin, deckName = "") {
    super(app);
    this.plugin = plugin;
    this.deckName = deckName;
    this.customLocation = null;
    this.selectedDecks = deckName ? [deckName] : [];
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Quick note" });
    this.titleInput = contentEl.createEl("input", {
      type: "text",
      placeholder: "Title",
      cls: "spaced-quicknote-title"
    });
    this.contentArea = contentEl.createEl("textarea", {
      placeholder: "Jot something down...",
      cls: "spaced-quicknote-body"
    });
    const deckRow = contentEl.createDiv({ cls: "spaced-quicknote-row" });
    const deckWrapper = deckRow.createDiv({ cls: "spaced-deck-wrapper" });
    const deckBtn = deckWrapper.createDiv({ cls: "spaced-deck-btn" });
    (0, import_obsidian3.setIcon)(deckBtn, "layers");
    deckBtn.setAttribute("aria-label", "Assign to decks");
    const deckLabel = deckRow.createSpan({ cls: "spaced-quicknote-deck-label" });
    this.updateDeckLabel(deckLabel);
    let deckDropdown = null;
    deckDropdown = createDeckDropdown(this.app, deckWrapper, [...this.selectedDecks], (decks) => {
      this.selectedDecks = [...decks];
      this.updateDeckLabel(deckLabel);
      this.updateLocationLabel();
    }).dropdown;
    if (this.deckName) {
      const addToDeckRow = contentEl.createDiv({ cls: "spaced-quicknote-row" });
      const cb = addToDeckRow.createEl("input");
      cb.type = "checkbox";
      cb.checked = true;
      addToDeckRow.createSpan({ text: `Add to "${this.deckName}"` });
      cb.addEventListener("change", () => {
        if (cb.checked) {
          if (!this.selectedDecks.includes(this.deckName)) this.selectedDecks.push(this.deckName);
        } else {
          this.selectedDecks = this.selectedDecks.filter((d) => d !== this.deckName);
        }
        this.updateDeckLabel(deckLabel);
        this.updateLocationLabel();
      });
    }
    const locationRow = contentEl.createDiv({ cls: "spaced-quicknote-row" });
    this.locationLabel = locationRow.createSpan({ cls: "spaced-quicknote-location-label" });
    this.updateLocationLabel();
    const chooseBtn = locationRow.createEl("button", { text: "Choose other location\u2026" });
    chooseBtn.addEventListener("click", () => {
      new FolderPickerModal(this.app, (folderPath) => {
        this.customLocation = folderPath;
        this.updateLocationLabel();
      }).open();
    });
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    btnRow.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
    btnRow.createEl("button", { text: "Create", cls: "mod-cta" }).addEventListener("click", () => this.createNote());
    contentEl.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.createNote();
      }
      if (e.key === "Escape") this.close();
    });
    this.titleInput.focus();
  }
  updateDeckLabel(el) {
    el.textContent = this.selectedDecks.length > 0 ? this.selectedDecks.join(", ") : "No deck";
  }
  updateLocationLabel() {
    if (this.customLocation !== null) {
      this.locationLabel.textContent = `Save to: ${this.customLocation}/`;
      return;
    }
    if (this.selectedDecks.length > 0) {
      const f = this.app.vault.getAbstractFileByPath(this.selectedDecks[0]);
      if (f instanceof import_obsidian3.TFolder) {
        this.locationLabel.textContent = `Save to: ${this.selectedDecks[0]}/ (deck folder)`;
        return;
      }
    }
    const defaultFolder = this.app.fileManager.getNewFileParent("").path;
    this.locationLabel.textContent = `Save to: ${defaultFolder === "/" ? "vault root" : defaultFolder + "/"}`;
  }
  resolveFolder() {
    if (this.customLocation !== null) return this.customLocation;
    if (this.selectedDecks.length > 0) {
      const f = this.app.vault.getAbstractFileByPath(this.selectedDecks[0]);
      if (f instanceof import_obsidian3.TFolder) return this.selectedDecks[0];
    }
    const parent = this.app.fileManager.getNewFileParent("");
    return parent.path === "/" ? "" : parent.path;
  }
  async createNote() {
    const title = this.titleInput.value.trim();
    if (!title) {
      this.titleInput.focus();
      return;
    }
    const folder = this.resolveFolder();
    const path2 = folder ? `${folder}/${title}.md` : `${title}.md`;
    const body = this.contentArea.value.trim();
    try {
      const file = await this.app.vault.create(path2, body ? `${body}
` : "");
      if (this.selectedDecks.length > 0) {
        await writeFrontmatterDecks(this.app, file.path, this.selectedDecks);
        await writeFrontmatterActive(this.app, file.path, true);
      }
      new import_obsidian3.Notice(`Created "${title}"`);
      this.close();
    } catch (e) {
      new import_obsidian3.Notice(`Could not create note: ${e.message}`);
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var FolderPickerModal = class extends import_obsidian3.FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("Choose a folder\u2026");
  }
  getItems() {
    const folders = [];
    const root2 = this.app.vault.getRoot();
    const collect = (folder) => {
      folders.push(folder);
      for (const child of folder.children) {
        if (child instanceof import_obsidian3.TFolder) collect(child);
      }
    };
    collect(root2);
    return folders;
  }
  getItemText(folder) {
    return folder.path === "/" ? "/ (vault root)" : folder.path;
  }
  onChooseItem(folder) {
    this.onChoose(folder.path === "/" ? "" : folder.path);
  }
};

// src/cm6-editor.ts
async function createCM6Editor(container, file, app) {
  const leaf = app.workspace.getLeaf("tab");
  await leaf.openFile(file, { state: { mode: "source" }, active: false });
  const editMode = leaf.view.editMode;
  container.appendChild(editMode.cm.dom);
  editMode.cm.requestMeasure();
  return { leaf, editMode };
}
function destroyCM6Editor(leaf) {
  leaf.detach();
}
function getCM6Content(editMode) {
  const full = editMode.cm.state.doc.toString();
  const { body } = stripFrontmatter(full);
  return body;
}

// src/BaseNoteModal.ts
var _BaseNoteModal = class _BaseNoteModal extends import_obsidian4.Modal {
  constructor(app) {
    super(app);
    // ── Shared fields ──────────────────────────────────────────────────────────
    this.tiptapEditor = null;
    this.cm6EditMode = null;
    this.cm6Leaf = null;
    this.renderComponent = null;
    this.renderedContainer = null;
    this.editorContainer = null;
    this.isEditing = false;
    this.titleEl = null;
    this.originalTitle = "";
    this.deckName = "";
    this.showRestartButton = false;
    this.progressBarEl = null;
    this.footerEl = null;
    this.USE_CM6 = true;
    this.metadataEditor = null;
    this._vaultModifyRef = null;
  }
  // ── Shared methods ─────────────────────────────────────────────────────────
  async onOpen() {
    if (!this.shouldOpen()) return;
    await this.renderModal();
    this.setupVaultListener();
  }
  shouldOpen() {
    return true;
  }
  async renderNote(contentEl) {
    this.cleanupEditors();
    this.renderHeader(contentEl);
    await this.renderExtraContent(contentEl);
    await this.renderContent(contentEl);
    const footer = contentEl.createDiv({ cls: "spaced-sticky-footer" });
    this.footerEl = footer;
    this.renderButtons(footer);
    this.renderProgressBar(footer);
  }
  async renderExtraContent(contentEl) {
  }
  onRestartClick() {
  }
  renderProgressBar(container) {
    this.progressBarEl = container.createDiv({ cls: "spaced-progress-bar" });
    const segments = this.getProgressSegments();
    for (const seg of segments) {
      this.progressBarEl.createDiv({ cls: `spaced-progress-seg ${seg}`.trim() });
    }
  }
  refreshProgressBar() {
    const statusEl = this.contentEl.querySelector(".spaced-due-count");
    if (statusEl) statusEl.textContent = this.getStatusText();
    if (!this.progressBarEl) return;
    this.progressBarEl.empty();
    const segments = this.getProgressSegments();
    for (const seg of segments) {
      this.progressBarEl.createDiv({ cls: `spaced-progress-seg ${seg}`.trim() });
    }
  }
  async renderFrontmatterEditor(container, file) {
    var _a, _b, _c;
    const MetadataEditorClass = this.getMetadataEditorClass();
    console.log("MetadataEditorClass:", MetadataEditorClass);
    if (!MetadataEditorClass) return;
    console.log("metadataEditor instance:", this.metadataEditor);
    console.log("containerEl:", (_a = this.metadataEditor) == null ? void 0 : _a.containerEl);
    const owner = {
      getFile: () => file,
      saveFrontmatter: async (fm2) => {
        await this.app.fileManager.processFrontMatter(file, (existing) => {
          Object.assign(existing, fm2);
        });
      },
      getHoverSource: () => "preview",
      getMode: () => "preview"
    };
    this.metadataEditor = new MetadataEditorClass(this.app, owner);
    this.metadataEditor.load();
    const rawFm = (_c = (_b = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _b.frontmatter) != null ? _c : {};
    const { position: _pos, ...fm } = rawFm;
    this.metadataEditor.synchronize(fm);
    container.appendChild(this.metadataEditor.containerEl);
    setTimeout(() => this.applyIconicPropertyIcons(), 0);
  }
  renderHeader(contentEl) {
    var _a, _b;
    const title = this.note.filepath.split("/").pop().replace(/\.md$/, "");
    const headerRow = contentEl.createDiv({ cls: "spaced-header-row" });
    this.titleEl = headerRow.createEl("h1", { text: title, cls: "spaced-note-title" });
    this.originalTitle = title;
    this.titleEl.spellcheck = false;
    this.titleEl.contentEditable = this.isEditing ? "true" : "false";
    this.titleEl.addEventListener("blur", () => void this.saveTitle());
    this.titleEl.addEventListener("click", () => {
      if (this.isEditing) return;
      const file = this.app.vault.getAbstractFileByPath(this.note.filepath);
      if (file) void this.app.workspace.getLeaf(true).openFile(file);
    });
    this.titleEl.addEventListener("keydown", (e) => {
      if (!this.isEditing) return;
      if (e.key === "Enter") {
        e.preventDefault();
        this.titleEl.blur();
      }
      if (e.key === "Escape") {
        this.titleEl.textContent = this.originalTitle;
        this.titleEl.blur();
      }
    });
    contentEl.createEl("div", { text: this.getStatusText(), cls: "spaced-due-count" });
    const headerRight = headerRow.createDiv({ cls: "spaced-header-right" });
    this.renderExtraHeaderButtons(headerRight);
    if (this.showRestartButton) {
      const restartBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
      (0, import_obsidian4.setIcon)(restartBtn, "rotate-ccw");
      restartBtn.setAttribute("aria-label", "Restart session");
      restartBtn.addEventListener("click", () => this.onRestartClick());
    }
    const editBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    (0, import_obsidian4.setIcon)(editBtn, this.isEditing ? "eye" : "pencil");
    editBtn.setAttribute("aria-label", this.isEditing ? "Switch to read view" : "Switch to edit view");
    editBtn.addEventListener("click", async () => {
      var _a2, _b2, _c, _d, _e;
      if (this.isEditing) {
        await this.saveTitle();
        await this.saveBodyEdits();
        this.isEditing = false;
        (_a2 = this.footerEl) == null ? void 0 : _a2.removeClass("spaced-footer-disabled");
        this.titleEl.contentEditable = "false";
        if (this.editorContainer) this.editorContainer.style.display = "none";
        if (this.renderedContainer) {
          this.renderedContainer.style.display = "";
          this.renderedContainer.empty();
          (_b2 = this.renderComponent) == null ? void 0 : _b2.unload();
          this.renderComponent = null;
          const updatedFile = this.app.vault.getAbstractFileByPath(this.note.filepath);
          if (updatedFile) {
            const updatedRaw = await this.app.vault.read(updatedFile);
            const { body: updatedBody } = stripFrontmatter(updatedRaw);
            this.renderComponent = new import_obsidian4.Component();
            this.renderComponent.load();
            await import_obsidian4.MarkdownRenderer.render(
              this.app,
              updatedBody,
              this.renderedContainer,
              this.note.filepath,
              this.renderComponent
            );
          }
        }
        (_c = this.metadataEditor) == null ? void 0 : _c.containerEl.style.removeProperty("display");
        (0, import_obsidian4.setIcon)(editBtn, "pencil");
        editBtn.setAttribute("aria-label", "Switch to edit view");
      } else {
        this.isEditing = true;
        (_d = this.footerEl) == null ? void 0 : _d.addClass("spaced-footer-disabled");
        this.titleEl.contentEditable = "true";
        this.titleEl.focus();
        if (this.renderedContainer) this.renderedContainer.style.display = "none";
        if (this.editorContainer) this.editorContainer.style.display = "";
        setTimeout(() => {
          var _a3;
          const cm = (_a3 = this.cm6EditMode) == null ? void 0 : _a3.cm;
          if (!cm) return;
          cm.dispatch({});
          cm.requestMeasure();
          cm.focus();
        }, 0);
        (0, import_obsidian4.setIcon)(editBtn, "eye");
        (_e = this.metadataEditor) == null ? void 0 : _e.containerEl.style.setProperty("display", "none");
        editBtn.setAttribute("aria-label", "Switch to read view");
      }
    });
    const newNoteBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    (0, import_obsidian4.setIcon)(newNoteBtn, "file-plus");
    newNoteBtn.setAttribute("aria-label", "New note");
    newNoteBtn.addEventListener("click", () => new QuickNoteModal(this.app, this.plugin, this.deckName).open());
    const deckWrapper = headerRight.createDiv({ cls: "spaced-deck-wrapper" });
    const deckBtn = deckWrapper.createDiv({ cls: "spaced-deck-btn" });
    (0, import_obsidian4.setIcon)(deckBtn, "layers");
    deckBtn.setAttribute("aria-label", "Assign to decks");
    let deckDropdown = null;
    let deckOutsideHandler = null;
    deckBtn.addEventListener("click", (e) => {
      var _a2, _b2;
      e.stopPropagation();
      if (deckDropdown && document.contains(deckDropdown)) {
        deckDropdown.remove();
        deckDropdown = null;
        if (deckOutsideHandler) {
          document.removeEventListener("mousedown", deckOutsideHandler);
          deckOutsideHandler = null;
        }
        return;
      }
      const noteFile = this.app.vault.getAbstractFileByPath(this.note.filepath);
      const rawDecks = noteFile ? (_b2 = (_a2 = this.app.metadataCache.getFileCache(noteFile)) == null ? void 0 : _a2.frontmatter) == null ? void 0 : _b2.decks : void 0;
      const initialDecks = Array.isArray(rawDecks) ? [...rawDecks] : typeof rawDecks === "string" && rawDecks ? [rawDecks] : [];
      const result = createDeckDropdown(this.app, deckWrapper, initialDecks, async (decks) => {
        await writeFrontmatterDecks(this.app, this.note.filepath, decks);
        await this.autoActivateNote();
      });
      deckDropdown = result.dropdown;
      deckOutsideHandler = result.outsideHandler;
    });
    const activeCheckbox = headerRight.createEl("input", { cls: "spaced-active-checkbox" });
    activeCheckbox.type = "checkbox";
    const noteFileForActive = this.app.vault.getAbstractFileByPath(this.note.filepath);
    activeCheckbox.checked = noteFileForActive ? ((_b = (_a = this.app.metadataCache.getFileCache(noteFileForActive)) == null ? void 0 : _a.frontmatter) == null ? void 0 : _b.active) === true : false;
    activeCheckbox.setAttribute("aria-label", "Add to active deck");
    activeCheckbox.addEventListener("change", async () => {
      const newActive = activeCheckbox.checked;
      this.note = { ...this.note, active: newActive };
      await writeFrontmatterActive(this.app, this.note.filepath, newActive);
    });
  }
  renderExtraHeaderButtons(headerRight) {
  }
  setupVaultListener() {
    this._vaultModifyRef = this.app.vault.on("modify", (file) => {
      if (file.path === this.note.filepath && !this.isEditing) {
        void this.refreshContent();
      }
    });
  }
  teardownVaultListener() {
    if (this._vaultModifyRef) {
      this.app.vault.offref(this._vaultModifyRef);
      this._vaultModifyRef = null;
    }
  }
  getMetadataEditorClass() {
    if (_BaseNoteModal._MetadataEditorClass) return _BaseNoteModal._MetadataEditorClass;
    let cls = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      var _a, _b;
      if (!cls) cls = (_b = (_a = leaf.view) == null ? void 0 : _a.metadataEditor) == null ? void 0 : _b.constructor;
    });
    if (cls) _BaseNoteModal._MetadataEditorClass = cls;
    return cls != null ? cls : null;
  }
  applyIconicPropertyIcons() {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!((_a = this.metadataEditor) == null ? void 0 : _a.containerEl)) return;
    const propertyIcons = (_f = (_e = (_d = (_c = (_b = this.app.plugins) == null ? void 0 : _b.plugins) == null ? void 0 : _c["iconic"]) == null ? void 0 : _d.settings) == null ? void 0 : _e.propertyIcons) != null ? _f : {};
    if (!Object.keys(propertyIcons).length) return;
    const propEls = this.metadataEditor.containerEl.findAll(".metadata-property");
    for (const propEl of propEls) {
      const key = (_g = propEl.dataset.propertyKey) == null ? void 0 : _g.toLowerCase();
      if (!key) continue;
      const entry = propertyIcons[key];
      if (!(entry == null ? void 0 : entry.icon)) continue;
      const iconEl = propEl.find(".metadata-property-icon");
      if (!iconEl) continue;
      (0, import_obsidian4.setIcon)(iconEl, entry.icon);
      const svgEl = iconEl.find(".svg-icon");
      if (svgEl && entry.color) {
        svgEl.style.setProperty("color", entry.color);
      }
    }
  }
  async refreshContent() {
    var _a;
    if (this.isEditing || !this.renderedContainer) return;
    if (this.renderedContainer.contains(document.activeElement)) return;
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath);
    if (!file) return;
    const raw = await this.app.vault.read(file);
    const { body } = stripFrontmatter(raw);
    this.renderedContainer.empty();
    (_a = this.renderComponent) == null ? void 0 : _a.unload();
    this.renderComponent = new import_obsidian4.Component();
    this.renderComponent.load();
    await import_obsidian4.MarkdownRenderer.render(this.app, body, this.renderedContainer, this.note.filepath, this.renderComponent);
  }
  /*
  protected async saveBodyEdits(): Promise<void> {
    if (!this.isEditing || !this.tiptapEditor) return;
    const newBody = extractMarkdown(this.tiptapEditor);
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
    if (!file) return;
    const raw = await this.app.vault.read(file);
    const { frontmatter, body } = stripFrontmatter(raw);
    if (newBody.trim() === body.trim()) return;
    await this.app.vault.modify(file, frontmatter ? `${frontmatter}\n${newBody}` : newBody);
  }*/
  async saveBodyEdits() {
    if (!this.isEditing) return;
    const newBody = this.USE_CM6 ? this.cm6EditMode ? getCM6Content(this.cm6EditMode) : null : this.tiptapEditor ? extractMarkdown(this.tiptapEditor) : null;
    if (newBody === null) return;
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath);
    if (!file) return;
    const raw = await this.app.vault.read(file);
    const { frontmatter, body } = stripFrontmatter(raw);
    if (newBody.trim() === body.trim()) return;
    await this.app.vault.modify(file, frontmatter ? `${frontmatter}
${newBody}` : newBody);
  }
  async saveTitle() {
    var _a;
    if (!this.isEditing || !this.titleEl) return;
    const newName = ((_a = this.titleEl.textContent) != null ? _a : "").trim();
    if (!newName || newName === this.originalTitle) return;
    const f = this.app.vault.getAbstractFileByPath(this.note.filepath);
    if (!f) return;
    const dir = this.note.filepath.includes("/") ? this.note.filepath.substring(0, this.note.filepath.lastIndexOf("/")) : "";
    const newPath = dir ? `${dir}/${newName}.md` : `${newName}.md`;
    await this.app.vault.rename(f, newPath);
    this.note = { ...this.note, filepath: newPath };
    this.originalTitle = newName;
  }
  async autoActivateNote() {
    if (this.note.active) return;
    this.note = { ...this.note, active: true };
    await writeFrontmatterActive(this.app, this.note.filepath, true);
    const cb = this.contentEl.querySelector(".spaced-active-checkbox");
    if (cb) cb.checked = true;
  }
  routeNote() {
    new RouteFolderModal(this.app, this.note, this.plugin, (newPath) => {
      this.note = { ...this.note, filepath: newPath };
    }).open();
  }
  /*
    protected cleanupEditors(): void {
      this.tiptapEditor?.destroy();
      this.tiptapEditor = null;
      this.renderComponent?.unload();
      this.renderComponent = null;
      this.metadataEditor?.unload();
      this.metadataEditor = null;
      this.renderedContainer = null;
      this.editorContainer = null;
    }
  */
  cleanupEditors() {
    var _a, _b, _c;
    if (this.USE_CM6) {
      if (this.cm6Leaf) {
        destroyCM6Editor(this.cm6Leaf);
        this.cm6Leaf = null;
        this.cm6EditMode = null;
      }
    } else {
      (_a = this.tiptapEditor) == null ? void 0 : _a.destroy();
      this.tiptapEditor = null;
    }
    (_b = this.renderComponent) == null ? void 0 : _b.unload();
    this.renderComponent = null;
    (_c = this.metadataEditor) == null ? void 0 : _c.unload();
    this.metadataEditor = null;
    this.renderedContainer = null;
    this.editorContainer = null;
  }
  addBtn(container, opts) {
    const btn = new import_obsidian4.ButtonComponent(container).onClick(opts.cb);
    if (opts.icon) btn.setIcon(opts.icon);
    if (opts.label) btn.setButtonText(opts.label);
    if (opts.tooltip) btn.setTooltip(opts.tooltip);
    else if (!opts.label && opts.icon) btn.setTooltip(opts.cls);
    btn.buttonEl.addClass("spaced-btn");
    btn.buttonEl.addClass(`spaced-btn-${opts.cls}`);
    if (opts.modifier) btn.buttonEl.addClass(`mod-${opts.modifier}`);
    return btn;
  }
  async renderContent(contentEl) {
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath);
    if (!file) {
      contentEl.createEl("p", { text: `File not found: ${this.note.filepath}` });
      return;
    }
    const raw = await this.app.vault.read(file);
    const { body } = stripFrontmatter(raw);
    await this.renderFrontmatterEditor(contentEl, file);
    this.renderedContainer = contentEl.createDiv({ cls: "spaced-note-content" });
    this.renderComponent = new import_obsidian4.Component();
    this.renderComponent.load();
    await import_obsidian4.MarkdownRenderer.render(this.app, body, this.renderedContainer, this.note.filepath, this.renderComponent);
    this.editorContainer = contentEl.createDiv({ cls: "spaced-tiptap-container" });
    if (this.USE_CM6) {
      const { leaf, editMode } = await createCM6Editor(this.editorContainer, file, this.app);
      this.cm6Leaf = leaf;
      this.cm6EditMode = editMode;
    } else {
      if (this.tiptapEditor) {
        this.tiptapEditor.destroy();
        this.tiptapEditor = null;
      }
      this.tiptapEditor = createTiptapEditor(this.editorContainer, body);
    }
    if (this.isEditing) {
      this.renderedContainer.style.display = "none";
      this.editorContainer.style.display = "";
    } else {
      this.renderedContainer.style.display = "";
      this.editorContainer.style.display = "none";
    }
  }
  onSessionClose() {
  }
  onClose() {
    this.teardownVaultListener();
    void this.saveTitle();
    void this.saveBodyEdits();
    this.onSessionClose();
    this.cleanupEditors();
    this.contentEl.empty();
  }
};
_BaseNoteModal._MetadataEditorClass = null;
var BaseNoteModal = _BaseNoteModal;

// src/MakeActionableModal.ts
var import_obsidian5 = require("obsidian");
var ENERGY_OPTIONS = [
  { value: "\u{1F525}", label: "\u{1F525}", desc: "Urgent + high energy" },
  { value: "\u{1FA94}", label: "\u{1FA94}", desc: "Urgent + low energy" },
  { value: "\u{1F30A}", label: "\u{1F30A}", desc: "Fun + low energy" },
  { value: "\u{1F33F}", label: "\u{1F33F}", desc: "Fun + high energy" }
];
var TIMEBLOCKS = ["morning", "afternoon", "evening", "night"];
var MakeActionableModal = class extends import_obsidian5.Modal {
  constructor(app, filepath, onConfirm) {
    super(app);
    this.filepath = filepath;
    this.onConfirm = onConfirm;
    this.selectedEnergy = [];
    this.selectedTimeblocks = [];
  }
  onOpen() {
    const { contentEl } = this;
    const noteTitle = this.filepath.split("/").pop().replace(/\.md$/, "");
    this.titleEl.setText(`Make actionable \u2014 ${noteTitle}`);
    contentEl.createEl("p", { text: "Energy level", cls: "spaced-mka-label" });
    const energyRow = contentEl.createDiv({ cls: "spaced-mka-row" });
    for (const opt of ENERGY_OPTIONS) {
      const btn = energyRow.createEl("button", { cls: `spaced-mka-btn spaced-mka-${opt.value}` });
      btn.createEl("span", { text: opt.label, cls: "spaced-mka-btn-label" });
      btn.createEl("span", { text: opt.desc, cls: "spaced-mka-btn-desc" });
      btn.addEventListener("click", () => {
        if (this.selectedEnergy.includes(opt.value)) {
          this.selectedEnergy = this.selectedEnergy.filter((e) => e !== opt.value);
          btn.removeClass("is-active");
        } else {
          this.selectedEnergy.push(opt.value);
          btn.addClass("is-active");
        }
      });
    }
    contentEl.createEl("p", { text: "Timeblock", cls: "spaced-mka-label" });
    const tbRow = contentEl.createDiv({ cls: "spaced-mka-row" });
    for (const block of TIMEBLOCKS) {
      const btn = tbRow.createEl("button", { text: block, cls: "spaced-mka-btn" });
      btn.addEventListener("click", () => {
        if (this.selectedTimeblocks.includes(block)) {
          this.selectedTimeblocks = this.selectedTimeblocks.filter((t) => t !== block);
          btn.removeClass("is-active");
        } else {
          this.selectedTimeblocks.push(block);
          btn.addClass("is-active");
        }
      });
    }
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    const confirmBtn = btnRow.createEl("button", { text: "Make actionable", cls: "mod-cta" });
    confirmBtn.addEventListener("click", async () => {
      await writeFrontmatterActionable(this.app, this.filepath, {
        energy: this.selectedEnergy.length > 0 ? this.selectedEnergy : void 0,
        timeblock: this.selectedTimeblocks.length > 0 ? this.selectedTimeblocks : void 0
      });
      new import_obsidian5.Notice(`${noteTitle} marked as actionable`);
      this.onConfirm();
      this.close();
    });
    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/ReviewModal.ts
var ReviewModal = class extends BaseNoteModal {
  constructor(app, plugin, note) {
    super(app);
    this.plugin = plugin;
    this.note = note;
    this.reviewStartTime = 0;
    this.reviewedInSession = /* @__PURE__ */ new Set();
    this.progressLog = [];
    this.sessionSize = 0;
    this.activeSources = [];
  }
  getSourceFolderList() {
    if (this.plugin.settings.sourceScope === "folder") {
      return this.plugin.settings.sourceFolders.map((f) => f.path);
    }
    const notes = getNotesFromVault(this.plugin).filter((n) => n.interval >= 0);
    const folders = new Set(
      notes.map((n) => n.filepath.split("/")[0]).filter((seg) => seg.endsWith(".md") === false)
      // exclude root-level files
    );
    return [...folders].sort();
  }
  async onOpen() {
    const allNotes = getNotesFromVault(this.plugin).filter((n) => n.interval >= 0);
    this.sessionSize = allNotes.filter((n) => noteIsDue(n)).length;
    await this.render();
    this.setupVaultListener();
  }
  getStatusText() {
    let allNotes = getNotesFromVault(this.plugin).filter((n) => n.interval >= 0);
    if (this.activeSources.length > 0) {
      allNotes = allNotes.filter((n) => this.activeSources.some((src) => n.filepath.startsWith(src + "/")));
    }
    const remainingDue = allNotes.filter((n) => noteIsDue(n) && !this.reviewedInSession.has(n.filepath)).length;
    return `${remainingDue} note${remainingDue !== 1 ? "s" : ""} due`;
  }
  async render() {
    this.reviewStartTime = Date.now();
    this.isEditing = false;
    const { contentEl } = this;
    contentEl.empty();
    await this.renderNote(contentEl);
  }
  renderExtraHeaderButtons(headerRight) {
    var _a, _b, _c;
    const stateOptions = (_a = this.plugin.settings.noteStateValues) != null ? _a : ["\u{1F331}", "\u{1F33F}", "\u{1F332}"];
    let currentState = (_c = (_b = this.app.metadataCache.getFileCache(
      this.app.vault.getAbstractFileByPath(this.note.filepath)
    )) == null ? void 0 : _b.frontmatter) == null ? void 0 : _c.state;
    let stateDropdown = null;
    const badge = headerRight.createEl("span", {
      text: currentState || "no state",
      cls: "spaced-state-badge"
    });
    badge.style.position = "relative";
    badge.style.cursor = "pointer";
    badge.addEventListener("click", () => {
      if (stateDropdown) {
        stateDropdown.remove();
        stateDropdown = null;
        return;
      }
      stateDropdown = badge.createDiv({ cls: "spaced-state-dropdown" });
      for (const state of stateOptions) {
        const opt = stateDropdown.createDiv({ cls: "spaced-state-option" });
        opt.setText(state);
        if (state === currentState) opt.addClass("is-active");
        opt.addEventListener("click", async () => {
          await writeFrontmatterState(this.app, this.note.filepath, state);
          currentState = state;
          badge.setText(state);
          stateDropdown == null ? void 0 : stateDropdown.remove();
          stateDropdown = null;
        });
      }
    });
    const mkaBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    (0, import_obsidian6.setIcon)(mkaBtn, "zap");
    mkaBtn.setAttribute("aria-label", "Make actionable");
    mkaBtn.addEventListener("click", () => {
      new MakeActionableModal(this.app, this.note.filepath, () => {
      }).open();
    });
  }
  // reaction button row
  renderButtons(contentEl) {
    const COLOR_VAR_MAP = {
      "spaced-seg-purple": "var(--color-purple)",
      "spaced-seg-blue": "var(--color-blue)",
      "spaced-seg-green": "var(--color-green)",
      "spaced-seg-yellow": "var(--color-yellow)",
      "spaced-seg-orange": "var(--color-orange)",
      "spaced-seg-red": "var(--color-red)"
    };
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    const reactions = getActiveReactions(this.plugin.settings);
    reactions.forEach((r, i) => {
      const wrapper = btnRow.createDiv({ cls: "spaced-btn-wrapper" });
      const btn = this.addBtn(wrapper, { label: r.label, cls: r.id, cb: () => this.react(r.id) });
      if (i === 0) btn.setCta();
      const colorVar = COLOR_VAR_MAP[this.reactionColor(r.id)];
      if (colorVar) btn.buttonEl.style.setProperty("--reaction-color", colorVar);
      const days = nextInterval(this.note, r.id, reactions);
      wrapper.createEl("span", {
        text: formatInterval(days),
        cls: "spaced-btn-interval"
      });
    });
    const routeBtn = this.addBtn(btnRow, { label: "Route \u2192", cls: "route", cb: () => this.routeNote() });
    routeBtn.setCta();
    this.addBtn(btnRow, { label: "Skip", cls: "skip", cb: () => this.react("skip") });
    this.addBtn(btnRow, { label: "Archive", cls: "archive", cb: () => this.archiveNote() });
    this.addBtn(btnRow, { icon: "trash-2", cls: "delete", cb: () => this.deleteNote() });
    let srcDropdown = null;
    const srcBtn = this.addBtn(btnRow, {
      label: "Source",
      cls: "source",
      tooltip: `Source: ${this.activeSources.length ? this.activeSources.join(", ") : "All"}`,
      cb: () => {
        if (srcDropdown) {
          srcDropdown.remove();
          srcDropdown = null;
          return;
        }
        const folders = this.getSourceFolderList();
        if (folders.length === 0) return;
        srcDropdown = btnRow.createDiv({ cls: "spaced-source-dropdown" });
        const isAll = this.activeSources.length === 0;
        const allRow = srcDropdown.createDiv({ cls: "spaced-context-option" });
        const allCb = allRow.createEl("input");
        allCb.type = "checkbox";
        allCb.checked = isAll;
        allRow.createSpan({ text: "All" });
        allCb.addEventListener("change", () => {
          srcBtn.buttonEl.setAttribute(
            "aria-label",
            `Source: ${this.activeSources.length ? this.activeSources.join(", ") : "All"}`
          );
          this.activeSources = [];
          this.refreshSessionSize();
          srcDropdown == null ? void 0 : srcDropdown.remove();
          srcDropdown = null;
          srcBtn.buttonEl.click();
        });
        for (const folder of folders) {
          const row = srcDropdown.createDiv({ cls: "spaced-context-option" });
          if (isAll) row.addClass("spaced-source-greyed");
          const cb = row.createEl("input");
          cb.type = "checkbox";
          cb.checked = isAll || this.activeSources.includes(folder);
          row.createSpan({ text: folder });
          cb.addEventListener("change", () => {
            srcBtn.buttonEl.setAttribute(
              "aria-label",
              `Source: ${this.activeSources.length ? this.activeSources.join(", ") : "All"}`
            );
            if (this.activeSources.length === 0) {
              this.activeSources = [folder];
            } else if (cb.checked) {
              this.activeSources.push(folder);
            } else {
              this.activeSources = this.activeSources.filter((s) => s !== folder);
            }
            this.refreshSessionSize();
            srcDropdown == null ? void 0 : srcDropdown.remove();
            srcDropdown = null;
            srcBtn.buttonEl.click();
          });
        }
        const onOutside = (e) => {
          if (!srcDropdown || !document.contains(srcDropdown)) {
            document.removeEventListener("mousedown", onOutside);
            return;
          }
          if (!srcDropdown.contains(e.target) && !srcBtn.buttonEl.contains(e.target)) {
            srcDropdown.remove();
            srcDropdown = null;
            document.removeEventListener("mousedown", onOutside);
          }
        };
        document.addEventListener("mousedown", onOutside);
      }
    });
  }
  async react(reaction) {
    var _a;
    await this.saveTitle();
    await this.saveBodyEdits();
    this.progressLog.push(this.reactionColor(reaction));
    if (reaction === "skip") {
      this.reviewedInSession.add(this.note.filepath);
      await this.showNextNote();
      return;
    }
    this.reviewedInSession.add(this.note.filepath);
    this.plugin.data.reviewHistory = (_a = this.plugin.data.reviewHistory) != null ? _a : [];
    this.plugin.data.reviewHistory.push({
      timestamp: (/* @__PURE__ */ new Date()).toISOString().slice(0, 19),
      notePath: this.note.filepath,
      reaction
    });
    const reactions = getActiveReactions(this.plugin.settings);
    const newInterval = nextInterval(this.note, reaction, reactions);
    const updatedNote = {
      ...this.note,
      interval: newInterval,
      easeFactor: nextEaseFactor(this.note, reaction, reactions),
      lastReviewedOn: today(),
      reviewedCount: this.note.reviewedCount + 1,
      noteState: reaction
    };
    this.note = updatedNote;
    await writeNoteRecord(this.plugin, this.note.filepath, updatedNote);
    await saveStore(this.plugin, this.plugin.data);
    await this.showNextNote();
  }
  async archiveNote() {
    await this.saveTitle();
    await this.saveBodyEdits();
    this.progressLog.push(this.reactionColor("archive"));
    await writeNoteRecord(this.plugin, this.note.filepath, { interval: -1 });
    await this.showNextNote();
  }
  async showNextNote() {
    let allNotes = getNotesFromVault(this.plugin).filter(
      (n) => n.interval >= 0 && !this.reviewedInSession.has(n.filepath)
    );
    if (this.activeSources.length > 0) {
      allNotes = allNotes.filter((n) => this.activeSources.some((src) => n.filepath.startsWith(src + "/")));
    }
    const note = pickNoteToReview(allNotes, this.plugin.settings);
    if (!note) {
      const { contentEl } = this;
      contentEl.empty();
      contentEl.createEl("h3", { text: "All caught up!" });
      contentEl.createEl("p", { text: "No more notes due. Close this modal to exit." });
      return;
    }
    this.note = note;
    await this.render();
  }
  async deleteNote() {
    await this.saveTitle();
    this.progressLog.push(this.reactionColor("delete"));
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath);
    if (file) {
      await this.app.vault.delete(file);
    }
    await this.showNextNote();
  }
  reactionColor(reaction) {
    const systemColors = {
      route: "spaced-seg-blue",
      archive: "spaced-seg-yellow",
      delete: "spaced-seg-red",
      skip: "spaced-seg-skip"
    };
    if (systemColors[reaction]) return systemColors[reaction];
    const reactions = getActiveReactions(this.plugin.settings);
    const reactionDef = reactions.find((r) => r.id === reaction);
    if (reactionDef == null ? void 0 : reactionDef.color) return reactionDef.color;
    const ramp = [
      "spaced-seg-purple",
      "spaced-seg-blue",
      "spaced-seg-green",
      "spaced-seg-yellow",
      "spaced-seg-orange",
      "spaced-seg-red"
    ];
    const idx = reactionDef ? reactions.indexOf(reactionDef) : -1;
    if (idx === -1) return "";
    const t = reactions.length === 1 ? 0.5 : idx / (reactions.length - 1);
    return ramp[Math.round(t * (ramp.length - 1))];
  }
  getProgressSegments() {
    var _a;
    const segments = [];
    for (let i = 0; i < this.sessionSize; i++) {
      segments.push((_a = this.progressLog[i]) != null ? _a : "");
    }
    return segments;
  }
  refreshSessionSize() {
    let allNotes = getNotesFromVault(this.plugin).filter((n) => n.interval >= 0);
    if (this.activeSources.length > 0) {
      allNotes = allNotes.filter((n) => this.activeSources.some((src) => n.filepath.startsWith(src + "/")));
    }
    const remainingDue = allNotes.filter((n) => noteIsDue(n) && !this.reviewedInSession.has(n.filepath)).length;
    this.sessionSize = this.progressLog.length + remainingDue;
    this.refreshProgressBar();
  }
  resumeSession(session) {
    this.reviewedInSession = new Set(session.reviewedFilepaths);
    this.progressLog = [...session.progressLog];
    this.sessionSize = session.sessionSize;
  }
  onSessionClose() {
    if (this.sessionSize > 0) {
      if (this.reviewedInSession.size < this.sessionSize) {
        this.plugin.data.srsSession = {
          reviewedFilepaths: [...this.reviewedInSession],
          progressLog: [...this.progressLog],
          sessionSize: this.sessionSize
        };
      } else {
        delete this.plugin.data.srsSession;
      }
      void saveStore(this.plugin, this.plugin.data);
    }
  }
};
function formatInterval(days) {
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

// src/SettingsTab.ts
var import_obsidian7 = require("obsidian");
var REACTION_RAMP = [
  "spaced-seg-purple",
  "spaced-seg-blue",
  "spaced-seg-green",
  "spaced-seg-yellow",
  "spaced-seg-orange",
  "spaced-seg-red"
];
var _activePaletteHandler = null;
function openColorPalette(anchor, current, onPick) {
  document.querySelectorAll(".spaced-color-palette").forEach((el) => el.remove());
  if (_activePaletteHandler) {
    document.removeEventListener("mousedown", _activePaletteHandler);
    _activePaletteHandler = null;
  }
  const palette = document.body.createDiv({ cls: "spaced-color-palette" });
  const rect = anchor.getBoundingClientRect();
  palette.style.top = `${rect.bottom + 4}px`;
  palette.style.left = `${rect.left}px`;
  for (const cls of REACTION_RAMP) {
    const dot = palette.createEl("button", { cls: `spaced-color-dot ${cls}` });
    if (cls === current) dot.addClass("spaced-color-dot--active");
    dot.addEventListener("mousedown", (e) => {
      e.preventDefault();
      onPick(cls);
      palette.remove();
    });
  }
  const outsideHandler = (e) => {
    if (!document.contains(palette) || !palette.contains(e.target)) {
      palette.remove();
      document.removeEventListener("mousedown", outsideHandler);
      _activePaletteHandler = null;
    }
  };
  _activePaletteHandler = outsideHandler;
  setTimeout(() => document.addEventListener("mousedown", outsideHandler), 0);
}
var SpacedEverythingSettingsTab = class extends import_obsidian7.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.pendingFolder = "";
    this.pendingSetName = "";
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Spaced Everything" });
    new import_obsidian7.Setting(containerEl).setName("Source scope").setDesc("Process notes from the whole vault or a specific folder.").addDropdown(
      (drop) => drop.addOption("vault", "Whole vault").addOption("folder", "Specific folder").setValue(this.plugin.settings.sourceScope).onChange(async (v) => {
        this.plugin.settings.sourceScope = v;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    const folders = this.app.vault.getAllFolders().map((f) => f.path).sort();
    if (this.plugin.settings.sourceScope === "folder") {
      for (const entry of this.plugin.settings.sourceFolders) {
        new import_obsidian7.Setting(containerEl).setName(entry.path).setDesc("Review quota weight (%). 100 = default, lower = appears less often.").addSlider(
          (sl) => sl.setLimits(1, 200, 1).setValue(entry.weight).setDynamicTooltip().onChange(async (v) => {
            entry.weight = v;
            await this.plugin.saveSettings();
          })
        ).addButton(
          (btn) => btn.setButtonText("Remove").setWarning().onClick(async () => {
            this.plugin.settings.sourceFolders = this.plugin.settings.sourceFolders.filter(
              (e) => e.path !== entry.path
            );
            await this.plugin.saveSettings();
            this.display();
          })
        );
      }
      this.pendingFolder = "";
      new import_obsidian7.Setting(containerEl).setName("Add source folder").addDropdown((drop) => {
        drop.addOption("", "\u2014 select a folder \u2014");
        for (const f of folders) {
          if (!this.plugin.settings.sourceFolders.some((e) => e.path === f)) {
            drop.addOption(f, f);
          }
        }
        drop.onChange((v) => {
          this.pendingFolder = v;
        });
      }).addButton(
        (btn) => btn.setButtonText("Add").onClick(async () => {
          if (this.pendingFolder && !this.plugin.settings.sourceFolders.some((e) => e.path === this.pendingFolder)) {
            this.plugin.settings.sourceFolders.push({ path: this.pendingFolder, weight: 100 });
            await this.plugin.saveSettings();
            this.display();
          }
        })
      );
    }
    new import_obsidian7.Setting(containerEl).setName("Evergreen destination folder").setDesc("Where routed notes are moved to.").addDropdown((drop) => {
      drop.addOption("", "\u2014 select a folder \u2014");
      for (const folder of folders) {
        drop.addOption(folder, folder);
      }
      drop.setValue(this.plugin.settings.evergreenFolder).onChange(async (v) => {
        this.plugin.settings.evergreenFolder = v;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian7.Setting(containerEl).setName("Initial interval (days)").setDesc("How many days before a new note first appears for review.").addText(
      (text) => text.setValue(String(this.plugin.settings.initialInterval)).onChange(async (v) => {
        const n = parseInt(v);
        if (!isNaN(n) && n > 0) {
          this.plugin.settings.initialInterval = n;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian7.Setting(containerEl).setName("Default ease factor (%)").setDesc("Multiplier for interval growth. 300 = 3x per review cycle.").addText(
      (text) => text.setValue(String(this.plugin.settings.defaultEaseFactor)).onChange(async (v) => {
        const n = parseInt(v);
        if (!isNaN(n) && n > 0) {
          this.plugin.settings.defaultEaseFactor = n;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian7.Setting(containerEl).setName("Rename folder when renaming deck").setDesc("If a deck has a matching folder, rename the folder too.").addToggle(
      (t) => t.setValue(this.plugin.settings.renameFolderWithDeck).onChange(async (v) => {
        this.plugin.settings.renameFolderWithDeck = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian7.Setting(containerEl).setName("Recent-note priority threshold").setDesc("Probability (0\u20131) of trying to show a recently-created unreviewed note first. Default: 0.5").addText(
      (text) => text.setValue(String(this.plugin.settings.recentUndueThreshold)).onChange(async (v) => {
        const n = parseFloat(v);
        if (!isNaN(n) && n >= 0 && n <= 1) {
          this.plugin.settings.recentUndueThreshold = n;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian7.Setting(containerEl).setName("Exciting-note priority threshold").setDesc(
      "Cumulative probability (0\u20131) of trying to show an exciting note. Must be > recent-note threshold. Default: 0.7"
    ).addText(
      (text) => text.setValue(String(this.plugin.settings.excitingThreshold)).onChange(async (v) => {
        const n = parseFloat(v);
        if (!isNaN(n) && n >= 0 && n <= 1) {
          if (n <= this.plugin.settings.recentUndueThreshold) {
            new import_obsidian7.Notice("Exciting threshold must be greater than recent-note threshold.");
            return;
          }
          this.plugin.settings.excitingThreshold = n;
          await this.plugin.saveSettings();
        }
      })
    );
    containerEl.createEl("h3", { text: "Reaction buttons" });
    new import_obsidian7.Setting(containerEl).setName("Reaction set").setDesc("Choose which reaction buttons appear during review.").addDropdown((drop) => {
      drop.addOption("default", "Default (Exciting / Interesting / \u2026)");
      drop.addOption("anki", "Anki (Easy / Good / Hard / Again)");
      for (const set of this.plugin.settings.customReactionSets) {
        drop.addOption(set.id, set.name);
      }
      drop.setValue(this.plugin.settings.reactionSetMode).onChange(async (v) => {
        this.plugin.settings.reactionSetMode = v;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    const activeSet = this.plugin.settings.customReactionSets.find(
      (s) => s.id === this.plugin.settings.reactionSetMode
    );
    if (activeSet) {
      new import_obsidian7.Setting(containerEl).setName(`Edit: ${activeSet.name}`).addButton(
        (btn) => btn.setButtonText("Open editor").onClick(() => new CustomReactionSetModal(this.app, this.plugin, activeSet).open())
      ).addButton(
        (btn) => btn.setButtonText("Delete").setWarning().onClick(async () => {
          this.plugin.settings.customReactionSets = this.plugin.settings.customReactionSets.filter(
            (s) => s.id !== activeSet.id
          );
          this.plugin.settings.reactionSetMode = "default";
          await this.plugin.saveSettings();
          this.display();
        })
      );
    }
    this.pendingSetName = "";
    new import_obsidian7.Setting(containerEl).setName("Add custom reaction set").addText(
      (text) => text.setPlaceholder("Set name").onChange((v) => {
        this.pendingSetName = v;
      })
    ).addButton(
      (btn) => btn.setButtonText("Add").onClick(async () => {
        const name = this.pendingSetName.trim();
        if (!name) return;
        const id = name.toLowerCase().replace(/\s+/g, "-");
        if (this.plugin.settings.customReactionSets.some((s) => s.id === id)) {
          new import_obsidian7.Notice(`A set with id "${id}" already exists.`);
          return;
        }
        this.plugin.settings.customReactionSets.push({ id, name, reactions: [] });
        this.plugin.settings.reactionSetMode = id;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    containerEl.createEl("h3", { text: "System" });
    new import_obsidian7.Setting(containerEl).setName("Weekend days").setDesc("Days treated as weekend for context auto-detection in System modal.").then((setting) => {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const row = setting.controlEl.createDiv({ cls: "spaced-day-toggle-row" });
      for (const day of days) {
        const btn = row.createEl("button", { text: day, cls: "spaced-day-toggle" });
        if (this.plugin.settings.weekendDays.includes(day)) btn.addClass("is-active");
        btn.addEventListener("click", async () => {
          const current = this.plugin.settings.weekendDays;
          if (current.includes(day)) {
            this.plugin.settings.weekendDays = current.filter((d) => d !== day);
            btn.removeClass("is-active");
          } else {
            this.plugin.settings.weekendDays = [...current, day];
            btn.addClass("is-active");
          }
          await this.plugin.saveSettings();
        });
      }
    });
    containerEl.createEl("h3", { text: "Note state values" });
    containerEl.createEl("p", {
      text: "Values available in the state badge dropdown during review.",
      cls: "setting-item-description"
    });
    for (const val of this.plugin.settings.noteStateValues) {
      new import_obsidian7.Setting(containerEl).setName(val).addButton(
        (btn) => btn.setButtonText("Remove").setWarning().onClick(async () => {
          this.plugin.settings.noteStateValues = this.plugin.settings.noteStateValues.filter((v) => v !== val);
          await this.plugin.saveSettings();
          this.display();
        })
      );
    }
    let pendingStateValue = "";
    new import_obsidian7.Setting(containerEl).setName("Add state value").addText(
      (text) => text.setPlaceholder("e.g. incubating").onChange((v) => {
        pendingStateValue = v;
      })
    ).addButton(
      (btn) => btn.setButtonText("Add").onClick(async () => {
        const trimmed = pendingStateValue.trim();
        if (!trimmed) return;
        if (this.plugin.settings.noteStateValues.includes(trimmed)) {
          new import_obsidian7.Notice(`"${trimmed}" already exists.`);
          return;
        }
        this.plugin.settings.noteStateValues.push(trimmed);
        await this.plugin.saveSettings();
        this.display();
      })
    );
    containerEl.createEl("h3", { text: "Danger Zone" });
    new import_obsidian7.Setting(containerEl).setName("Reset all scheduling data").setDesc(
      "Permanently deletes all review history, intervals, and note states. Your note files are not affected. This cannot be undone."
    ).addButton(
      (btn) => btn.setButtonText("Reset data").setWarning().onClick(() => new ResetConfirmModal(this.app, this.plugin).open())
    );
  }
};
var ResetConfirmModal = class extends import_obsidian7.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Reset all scheduling data?" });
    contentEl.createEl("p", {
      text: "This will permanently delete all review history, intervals, and scheduling data for every note. Your actual note files will not be touched. After reset, all notes will be re-imported on the next sync."
    });
    contentEl.createEl("p", {
      text: "This cannot be undone.",
      cls: "spaced-reset-warning"
    });
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());
    const confirmBtn = btnRow.createEl("button", {
      text: "Reset everything",
      cls: "mod-warning"
    });
    confirmBtn.addEventListener("click", async () => {
      await this.plugin.resetData();
      this.close();
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var CustomReactionSetModal = class extends import_obsidian7.Modal {
  constructor(app, plugin, set) {
    super(app);
    this.plugin = plugin;
    this.set = set;
  }
  onOpen() {
    this.modalEl.addClass("spaced-reaction-panel");
    this.titleEl.setText(this.set.name);
    this.renderReactions();
  }
  renderReactions() {
    const { contentEl } = this;
    contentEl.empty();
    const reactions = this.set.reactions;
    const list = contentEl.createDiv({ cls: "spaced-reaction-list" });
    reactions.forEach((r, i) => {
      var _a, _b;
      const autoReactions = reactions.filter((rx) => !rx.manualOverride);
      const autoN = autoReactions.length;
      const autoIdx = autoReactions.findIndex((rx) => rx.id === r.id);
      const tAuto = autoN <= 1 ? 0.5 : autoIdx / (autoN - 1);
      const tFull = reactions.length === 1 ? 0.5 : i / (reactions.length - 1);
      const t = r.manualOverride ? tFull : tAuto;
      const mult = t <= 0.5 ? 0.5 + 0.5 * (t * 2) : 1 + 2 * ((t - 0.5) * 2);
      const easeDelta = Math.round(20 - 40 * t);
      const sign = easeDelta >= 0 ? "+" : "";
      const row = list.createDiv({ cls: "spaced-reaction-item" });
      const removeBtn = row.createEl("button", { cls: "clickable-icon" });
      (0, import_obsidian7.setIcon)(removeBtn, "circle-minus");
      removeBtn.addEventListener("click", async () => {
        reactions.splice(i, 1);
        await this.plugin.saveSettings();
        this.renderReactions();
      });
      const checkbox = row.createEl("input", { type: "checkbox" });
      checkbox.checked = (_a = r.manualOverride) != null ? _a : false;
      checkbox.addEventListener("change", async () => {
        reactions[i].manualOverride = checkbox.checked;
        if (!checkbox.checked) {
          delete reactions[i].intervalMult;
          delete reactions[i].easeDelta;
        } else {
          reactions[i].intervalMult = parseFloat((tFull <= 0.5 ? 0.5 + 0.5 * (tFull * 2) : 1 + 2 * ((tFull - 0.5) * 2)).toFixed(2));
          reactions[i].easeDelta = Math.round(20 - 40 * tFull);
        }
        await this.plugin.saveSettings();
        this.renderReactions();
      });
      const labelInput = row.createEl("input", { type: "text", cls: "spaced-reaction-label-input" });
      labelInput.value = r.label;
      labelInput.placeholder = "Label";
      labelInput.addEventListener("change", async () => {
        reactions[i].label = labelInput.value;
        await this.plugin.saveSettings();
      });
      const RAMP = [
        "spaced-seg-purple",
        "spaced-seg-blue",
        "spaced-seg-green",
        "spaced-seg-yellow",
        "spaced-seg-orange",
        "spaced-seg-red"
      ];
      const defaultColorIdx = Math.round(tFull * (RAMP.length - 1));
      const defaultColor = RAMP[defaultColorIdx];
      const activeColor = (_b = r.color) != null ? _b : defaultColor;
      const swatch = row.createEl("button", { cls: `clickable-icon spaced-reaction-swatch ${activeColor}` });
      swatch.title = r.color ? `Color: ${r.color} (click to change)` : "Color: auto (click to override)";
      swatch.addEventListener("click", () => {
        openColorPalette(swatch, activeColor, async (chosen) => {
          if (chosen === defaultColor) {
            delete reactions[i].color;
          } else {
            reactions[i].color = chosen;
          }
          await this.plugin.saveSettings();
          this.renderReactions();
        });
      });
      if (r.manualOverride) {
        const inputs = row.createDiv({ cls: "spaced-reaction-inputs" });
        const multInput = inputs.createEl("input", { type: "text", cls: "spaced-reaction-input" });
        multInput.placeholder = `\xD7${mult.toFixed(2)}`;
        multInput.value = r.intervalMult !== void 0 ? String(r.intervalMult) : "";
        multInput.addEventListener("change", async () => {
          const n = parseFloat(multInput.value);
          if (!isNaN(n) && n > 0) {
            reactions[i].intervalMult = n;
            await this.plugin.saveSettings();
          }
        });
        const easeInput = inputs.createEl("input", { type: "text", cls: "spaced-reaction-input" });
        easeInput.placeholder = `ease ${sign}${easeDelta}`;
        easeInput.value = r.easeDelta !== void 0 ? String(r.easeDelta) : "";
        easeInput.addEventListener("change", async () => {
          const n = parseInt(easeInput.value);
          if (!isNaN(n)) {
            reactions[i].easeDelta = n;
            await this.plugin.saveSettings();
          }
        });
      } else {
        row.createSpan({
          text: `\xD7${mult.toFixed(2)}  ease ${sign}${easeDelta}`,
          cls: "spaced-reaction-meta"
        });
      }
      const upBtn = row.createEl("button", { cls: "clickable-icon" });
      (0, import_obsidian7.setIcon)(upBtn, "arrow-up");
      upBtn.disabled = i === 0;
      upBtn.addEventListener("click", async () => {
        [reactions[i - 1], reactions[i]] = [reactions[i], reactions[i - 1]];
        await this.plugin.saveSettings();
        this.renderReactions();
      });
      const downBtn = row.createEl("button", { cls: "clickable-icon" });
      (0, import_obsidian7.setIcon)(downBtn, "arrow-down");
      downBtn.disabled = i === reactions.length - 1;
      downBtn.addEventListener("click", async () => {
        [reactions[i + 1], reactions[i]] = [reactions[i], reactions[i + 1]];
        await this.plugin.saveSettings();
        this.renderReactions();
      });
    });
    const addRow = contentEl.createDiv({ cls: "spaced-reaction-add-row" });
    const addInput = addRow.createEl("input", { type: "text", cls: "spaced-reaction-add-input" });
    addInput.placeholder = "New reaction label\u2026";
    const addBtn = addRow.createEl("button", { cls: "clickable-icon" });
    (0, import_obsidian7.setIcon)(addBtn, "circle-plus");
    const doAdd = async () => {
      const trimmed = addInput.value.trim();
      if (!trimmed) return;
      const id = trimmed.toLowerCase().replace(/\s+/g, "-");
      if (reactions.some((r) => r.id === id)) {
        new import_obsidian7.Notice(`A reaction with id "${id}" already exists.`);
        return;
      }
      reactions.push({ id, label: trimmed });
      await this.plugin.saveSettings();
      this.renderReactions();
    };
    addBtn.addEventListener("click", doAdd);
    addInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        await doAdd();
        e.preventDefault();
      }
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/DueNotesView.ts
var import_obsidian8 = require("obsidian");
var DUE_NOTES_VIEW_TYPE = "spaced-everything-due-notes";
var DueNotesView = class extends import_obsidian8.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return DUE_NOTES_VIEW_TYPE;
  }
  getDisplayText() {
    return "Due Notes";
  }
  getIcon() {
    return "clock";
  }
  async onOpen() {
    await this.render();
  }
  async onClose() {
    this.contentEl.empty();
  }
  async render() {
    var _a, _b;
    const { contentEl } = this;
    contentEl.empty();
    const allNotes = getNotesFromVault(this.plugin).filter((n) => n.interval >= 0);
    const dueNotes = allNotes.filter((n) => noteIsDue(n)).sort((a, b) => numDaysOverdue(b) - numDaysOverdue(a));
    if (dueNotes.length === 0) {
      contentEl.createEl("div", {
        text: "All caught up \u2014 no notes due.",
        cls: "spaced-empty pane-empty"
      });
      return;
    }
    contentEl.createEl("div", {
      text: `${dueNotes.length} note${dueNotes.length !== 1 ? "s" : ""} due`,
      cls: "spaced-due-count"
    });
    const list = contentEl.createDiv({ cls: "nav-files-container" });
    for (const note of dueNotes) {
      const filename = (_b = (_a = note.filepath.split("/").pop()) == null ? void 0 : _a.replace(/\.md$/, "")) != null ? _b : note.filepath;
      const days = numDaysOverdue(note);
      const file = list.createDiv({ cls: "nav-file" });
      const title = file.createDiv({ cls: "nav-file-title" });
      title.createSpan({ text: filename, cls: "nav-file-title-content" });
      title.createSpan({
        text: `${days}d overdue \xB7 ${note.noteState}`,
        cls: "spaced-due-meta"
      });
      title.addEventListener("click", () => {
        const modal = new ReviewModal(this.app, this.plugin, note);
        const saved = this.plugin.data.srsSession;
        if (saved) modal.resumeSession(saved);
        modal.open();
      });
    }
  }
};

// src/StatsView.ts
var import_obsidian9 = require("obsidian");

// node_modules/d3-array/src/ascending.js
function ascending(a, b) {
  return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

// node_modules/d3-array/src/descending.js
function descending(a, b) {
  return a == null || b == null ? NaN : b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
}

// node_modules/d3-array/src/bisector.js
function bisector(f) {
  let compare1, compare2, delta;
  if (f.length !== 2) {
    compare1 = ascending;
    compare2 = (d, x2) => ascending(f(d), x2);
    delta = (d, x2) => f(d) - x2;
  } else {
    compare1 = f === ascending || f === descending ? f : zero;
    compare2 = f;
    delta = f;
  }
  function left(a, x2, lo = 0, hi = a.length) {
    if (lo < hi) {
      if (compare1(x2, x2) !== 0) return hi;
      do {
        const mid = lo + hi >>> 1;
        if (compare2(a[mid], x2) < 0) lo = mid + 1;
        else hi = mid;
      } while (lo < hi);
    }
    return lo;
  }
  function right(a, x2, lo = 0, hi = a.length) {
    if (lo < hi) {
      if (compare1(x2, x2) !== 0) return hi;
      do {
        const mid = lo + hi >>> 1;
        if (compare2(a[mid], x2) <= 0) lo = mid + 1;
        else hi = mid;
      } while (lo < hi);
    }
    return lo;
  }
  function center(a, x2, lo = 0, hi = a.length) {
    const i = left(a, x2, lo, hi - 1);
    return i > lo && delta(a[i - 1], x2) > -delta(a[i], x2) ? i - 1 : i;
  }
  return { left, center, right };
}
function zero() {
  return 0;
}

// node_modules/d3-array/src/number.js
function number(x2) {
  return x2 === null ? NaN : +x2;
}

// node_modules/d3-array/src/bisect.js
var ascendingBisect = bisector(ascending);
var bisectRight = ascendingBisect.right;
var bisectLeft = ascendingBisect.left;
var bisectCenter = bisector(number).center;
var bisect_default = bisectRight;

// node_modules/internmap/src/index.js
var InternMap = class extends Map {
  constructor(entries, key = keyof) {
    super();
    Object.defineProperties(this, { _intern: { value: /* @__PURE__ */ new Map() }, _key: { value: key } });
    if (entries != null) for (const [key2, value] of entries) this.set(key2, value);
  }
  get(key) {
    return super.get(intern_get(this, key));
  }
  has(key) {
    return super.has(intern_get(this, key));
  }
  set(key, value) {
    return super.set(intern_set(this, key), value);
  }
  delete(key) {
    return super.delete(intern_delete(this, key));
  }
};
function intern_get({ _intern, _key }, value) {
  const key = _key(value);
  return _intern.has(key) ? _intern.get(key) : value;
}
function intern_set({ _intern, _key }, value) {
  const key = _key(value);
  if (_intern.has(key)) return _intern.get(key);
  _intern.set(key, value);
  return value;
}
function intern_delete({ _intern, _key }, value) {
  const key = _key(value);
  if (_intern.has(key)) {
    value = _intern.get(key);
    _intern.delete(key);
  }
  return value;
}
function keyof(value) {
  return value !== null && typeof value === "object" ? value.valueOf() : value;
}

// node_modules/d3-array/src/ticks.js
var e10 = Math.sqrt(50);
var e5 = Math.sqrt(10);
var e2 = Math.sqrt(2);
function tickSpec(start, stop, count) {
  const step = (stop - start) / Math.max(0, count), power = Math.floor(Math.log10(step)), error = step / Math.pow(10, power), factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
  let i1, i2, inc;
  if (power < 0) {
    inc = Math.pow(10, -power) / factor;
    i1 = Math.round(start * inc);
    i2 = Math.round(stop * inc);
    if (i1 / inc < start) ++i1;
    if (i2 / inc > stop) --i2;
    inc = -inc;
  } else {
    inc = Math.pow(10, power) * factor;
    i1 = Math.round(start / inc);
    i2 = Math.round(stop / inc);
    if (i1 * inc < start) ++i1;
    if (i2 * inc > stop) --i2;
  }
  if (i2 < i1 && 0.5 <= count && count < 2) return tickSpec(start, stop, count * 2);
  return [i1, i2, inc];
}
function ticks(start, stop, count) {
  stop = +stop, start = +start, count = +count;
  if (!(count > 0)) return [];
  if (start === stop) return [start];
  const reverse = stop < start, [i1, i2, inc] = reverse ? tickSpec(stop, start, count) : tickSpec(start, stop, count);
  if (!(i2 >= i1)) return [];
  const n = i2 - i1 + 1, ticks2 = new Array(n);
  if (reverse) {
    if (inc < 0) for (let i = 0; i < n; ++i) ticks2[i] = (i2 - i) / -inc;
    else for (let i = 0; i < n; ++i) ticks2[i] = (i2 - i) * inc;
  } else {
    if (inc < 0) for (let i = 0; i < n; ++i) ticks2[i] = (i1 + i) / -inc;
    else for (let i = 0; i < n; ++i) ticks2[i] = (i1 + i) * inc;
  }
  return ticks2;
}
function tickIncrement(start, stop, count) {
  stop = +stop, start = +start, count = +count;
  return tickSpec(start, stop, count)[2];
}
function tickStep(start, stop, count) {
  stop = +stop, start = +start, count = +count;
  const reverse = stop < start, inc = reverse ? tickIncrement(stop, start, count) : tickIncrement(start, stop, count);
  return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
}

// node_modules/d3-array/src/range.js
function range(start, stop, step) {
  start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;
  var i = -1, n = Math.max(0, Math.ceil((stop - start) / step)) | 0, range2 = new Array(n);
  while (++i < n) {
    range2[i] = start + i * step;
  }
  return range2;
}

// node_modules/d3-scale/src/init.js
function initRange(domain, range2) {
  switch (arguments.length) {
    case 0:
      break;
    case 1:
      this.range(domain);
      break;
    default:
      this.range(range2).domain(domain);
      break;
  }
  return this;
}

// node_modules/d3-scale/src/ordinal.js
var implicit = /* @__PURE__ */ Symbol("implicit");
function ordinal() {
  var index = new InternMap(), domain = [], range2 = [], unknown = implicit;
  function scale(d) {
    let i = index.get(d);
    if (i === void 0) {
      if (unknown !== implicit) return unknown;
      index.set(d, i = domain.push(d) - 1);
    }
    return range2[i % range2.length];
  }
  scale.domain = function(_) {
    if (!arguments.length) return domain.slice();
    domain = [], index = new InternMap();
    for (const value of _) {
      if (index.has(value)) continue;
      index.set(value, domain.push(value) - 1);
    }
    return scale;
  };
  scale.range = function(_) {
    return arguments.length ? (range2 = Array.from(_), scale) : range2.slice();
  };
  scale.unknown = function(_) {
    return arguments.length ? (unknown = _, scale) : unknown;
  };
  scale.copy = function() {
    return ordinal(domain, range2).unknown(unknown);
  };
  initRange.apply(scale, arguments);
  return scale;
}

// node_modules/d3-scale/src/band.js
function band() {
  var scale = ordinal().unknown(void 0), domain = scale.domain, ordinalRange = scale.range, r0 = 0, r1 = 1, step, bandwidth, round = false, paddingInner = 0, paddingOuter = 0, align = 0.5;
  delete scale.unknown;
  function rescale() {
    var n = domain().length, reverse = r1 < r0, start = reverse ? r1 : r0, stop = reverse ? r0 : r1;
    step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
    if (round) step = Math.floor(step);
    start += (stop - start - step * (n - paddingInner)) * align;
    bandwidth = step * (1 - paddingInner);
    if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
    var values = range(n).map(function(i) {
      return start + step * i;
    });
    return ordinalRange(reverse ? values.reverse() : values);
  }
  scale.domain = function(_) {
    return arguments.length ? (domain(_), rescale()) : domain();
  };
  scale.range = function(_) {
    return arguments.length ? ([r0, r1] = _, r0 = +r0, r1 = +r1, rescale()) : [r0, r1];
  };
  scale.rangeRound = function(_) {
    return [r0, r1] = _, r0 = +r0, r1 = +r1, round = true, rescale();
  };
  scale.bandwidth = function() {
    return bandwidth;
  };
  scale.step = function() {
    return step;
  };
  scale.round = function(_) {
    return arguments.length ? (round = !!_, rescale()) : round;
  };
  scale.padding = function(_) {
    return arguments.length ? (paddingInner = Math.min(1, paddingOuter = +_), rescale()) : paddingInner;
  };
  scale.paddingInner = function(_) {
    return arguments.length ? (paddingInner = Math.min(1, _), rescale()) : paddingInner;
  };
  scale.paddingOuter = function(_) {
    return arguments.length ? (paddingOuter = +_, rescale()) : paddingOuter;
  };
  scale.align = function(_) {
    return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
  };
  scale.copy = function() {
    return band(domain(), [r0, r1]).round(round).paddingInner(paddingInner).paddingOuter(paddingOuter).align(align);
  };
  return initRange.apply(rescale(), arguments);
}

// node_modules/d3-color/src/define.js
function define_default(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
}
function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}

// node_modules/d3-color/src/color.js
function Color() {
}
var darker = 0.7;
var brighter = 1 / darker;
var reI = "\\s*([+-]?\\d+)\\s*";
var reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*";
var reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
var reHex = /^#([0-9a-f]{3,8})$/;
var reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`);
var reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`);
var reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`);
var reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`);
var reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`);
var reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
var named = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
};
define_default(Color, color, {
  copy(channels) {
    return Object.assign(new this.constructor(), this, channels);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: color_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHex8: color_formatHex8,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});
function color_formatHex() {
  return this.rgb().formatHex();
}
function color_formatHex8() {
  return this.rgb().formatHex8();
}
function color_formatHsl() {
  return hslConvert(this).formatHsl();
}
function color_formatRgb() {
  return this.rgb().formatRgb();
}
function color(format2) {
  var m, l;
  format2 = (format2 + "").trim().toLowerCase();
  return (m = reHex.exec(format2)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format2)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format2)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format2)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format2)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format2)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format2)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format2) ? rgbn(named[format2]) : format2 === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
}
function rgbn(n) {
  return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
}
function rgba(r, g, b, a) {
  if (a <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a);
}
function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb();
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}
function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}
function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}
define_default(Rgb, rgb, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && (-0.5 <= this.g && this.g < 255.5) && (-0.5 <= this.b && this.b < 255.5) && (0 <= this.opacity && this.opacity <= 1);
  },
  hex: rgb_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatHex8: rgb_formatHex8,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));
function rgb_formatHex() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
}
function rgb_formatHex8() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function rgb_formatRgb() {
  const a = clampa(this.opacity);
  return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
}
function clampa(opacity) {
  return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
}
function clampi(value) {
  return Math.max(0, Math.min(255, Math.round(value) || 0));
}
function hex(value) {
  value = clampi(value);
  return (value < 16 ? "0" : "") + value.toString(16);
}
function hsla(h, s, l, a) {
  if (a <= 0) h = s = l = NaN;
  else if (l <= 0 || l >= 1) h = s = NaN;
  else if (s <= 0) h = NaN;
  return new Hsl(h, s, l, a);
}
function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Hsl();
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255, g = o.g / 255, b = o.b / 255, min = Math.min(r, g, b), max = Math.max(r, g, b), h = NaN, s = max - min, l = (max + min) / 2;
  if (s) {
    if (r === max) h = (g - b) / s + (g < b) * 6;
    else if (g === max) h = (b - r) / s + 2;
    else h = (r - g) / s + 4;
    s /= l < 0.5 ? max + min : 2 - max - min;
    h *= 60;
  } else {
    s = l > 0 && l < 1 ? 0 : h;
  }
  return new Hsl(h, s, l, o.opacity);
}
function hsl(h, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
}
function Hsl(h, s, l, opacity) {
  this.h = +h;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}
define_default(Hsl, hsl, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb() {
    var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < 0.5 ? l : 1 - l) * s, m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
      hsl2rgb(h, m1, m2),
      hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
      this.opacity
    );
  },
  clamp() {
    return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && (0 <= this.l && this.l <= 1) && (0 <= this.opacity && this.opacity <= 1);
  },
  formatHsl() {
    const a = clampa(this.opacity);
    return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
  }
}));
function clamph(value) {
  value = (value || 0) % 360;
  return value < 0 ? value + 360 : value;
}
function clampt(value) {
  return Math.max(0, Math.min(1, value || 0));
}
function hsl2rgb(h, m1, m2) {
  return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
}

// node_modules/d3-interpolate/src/basis.js
function basis(t12, v0, v1, v2, v3) {
  var t2 = t12 * t12, t3 = t2 * t12;
  return ((1 - 3 * t12 + 3 * t2 - t3) * v0 + (4 - 6 * t2 + 3 * t3) * v1 + (1 + 3 * t12 + 3 * t2 - 3 * t3) * v2 + t3 * v3) / 6;
}
function basis_default(values) {
  var n = values.length - 1;
  return function(t) {
    var i = t <= 0 ? t = 0 : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n), v1 = values[i], v2 = values[i + 1], v0 = i > 0 ? values[i - 1] : 2 * v1 - v2, v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
    return basis((t - i / n) * n, v0, v1, v2, v3);
  };
}

// node_modules/d3-interpolate/src/basisClosed.js
function basisClosed_default(values) {
  var n = values.length;
  return function(t) {
    var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n), v0 = values[(i + n - 1) % n], v1 = values[i % n], v2 = values[(i + 1) % n], v3 = values[(i + 2) % n];
    return basis((t - i / n) * n, v0, v1, v2, v3);
  };
}

// node_modules/d3-interpolate/src/constant.js
var constant_default = (x2) => () => x2;

// node_modules/d3-interpolate/src/color.js
function linear(a, d) {
  return function(t) {
    return a + t * d;
  };
}
function exponential(a, b, y2) {
  return a = Math.pow(a, y2), b = Math.pow(b, y2) - a, y2 = 1 / y2, function(t) {
    return Math.pow(a + t * b, y2);
  };
}
function gamma(y2) {
  return (y2 = +y2) === 1 ? nogamma : function(a, b) {
    return b - a ? exponential(a, b, y2) : constant_default(isNaN(a) ? b : a);
  };
}
function nogamma(a, b) {
  var d = b - a;
  return d ? linear(a, d) : constant_default(isNaN(a) ? b : a);
}

// node_modules/d3-interpolate/src/rgb.js
var rgb_default = (function rgbGamma(y2) {
  var color2 = gamma(y2);
  function rgb2(start, end) {
    var r = color2((start = rgb(start)).r, (end = rgb(end)).r), g = color2(start.g, end.g), b = color2(start.b, end.b), opacity = nogamma(start.opacity, end.opacity);
    return function(t) {
      start.r = r(t);
      start.g = g(t);
      start.b = b(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }
  rgb2.gamma = rgbGamma;
  return rgb2;
})(1);
function rgbSpline(spline) {
  return function(colors) {
    var n = colors.length, r = new Array(n), g = new Array(n), b = new Array(n), i, color2;
    for (i = 0; i < n; ++i) {
      color2 = rgb(colors[i]);
      r[i] = color2.r || 0;
      g[i] = color2.g || 0;
      b[i] = color2.b || 0;
    }
    r = spline(r);
    g = spline(g);
    b = spline(b);
    color2.opacity = 1;
    return function(t) {
      color2.r = r(t);
      color2.g = g(t);
      color2.b = b(t);
      return color2 + "";
    };
  };
}
var rgbBasis = rgbSpline(basis_default);
var rgbBasisClosed = rgbSpline(basisClosed_default);

// node_modules/d3-interpolate/src/numberArray.js
function numberArray_default(a, b) {
  if (!b) b = [];
  var n = a ? Math.min(b.length, a.length) : 0, c = b.slice(), i;
  return function(t) {
    for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
    return c;
  };
}
function isNumberArray(x2) {
  return ArrayBuffer.isView(x2) && !(x2 instanceof DataView);
}

// node_modules/d3-interpolate/src/array.js
function genericArray(a, b) {
  var nb = b ? b.length : 0, na = a ? Math.min(nb, a.length) : 0, x2 = new Array(na), c = new Array(nb), i;
  for (i = 0; i < na; ++i) x2[i] = value_default(a[i], b[i]);
  for (; i < nb; ++i) c[i] = b[i];
  return function(t) {
    for (i = 0; i < na; ++i) c[i] = x2[i](t);
    return c;
  };
}

// node_modules/d3-interpolate/src/date.js
function date_default(a, b) {
  var d = /* @__PURE__ */ new Date();
  return a = +a, b = +b, function(t) {
    return d.setTime(a * (1 - t) + b * t), d;
  };
}

// node_modules/d3-interpolate/src/number.js
function number_default(a, b) {
  return a = +a, b = +b, function(t) {
    return a * (1 - t) + b * t;
  };
}

// node_modules/d3-interpolate/src/object.js
function object_default(a, b) {
  var i = {}, c = {}, k;
  if (a === null || typeof a !== "object") a = {};
  if (b === null || typeof b !== "object") b = {};
  for (k in b) {
    if (k in a) {
      i[k] = value_default(a[k], b[k]);
    } else {
      c[k] = b[k];
    }
  }
  return function(t) {
    for (k in i) c[k] = i[k](t);
    return c;
  };
}

// node_modules/d3-interpolate/src/string.js
var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
var reB = new RegExp(reA.source, "g");
function zero2(b) {
  return function() {
    return b;
  };
}
function one(b) {
  return function(t) {
    return b(t) + "";
  };
}
function string_default(a, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
  a = a + "", b = b + "";
  while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) {
      bs = b.slice(bi, bs);
      if (s[i]) s[i] += bs;
      else s[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) {
      if (s[i]) s[i] += bm;
      else s[++i] = bm;
    } else {
      s[++i] = null;
      q.push({ i, x: number_default(am, bm) });
    }
    bi = reB.lastIndex;
  }
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s[i]) s[i] += bs;
    else s[++i] = bs;
  }
  return s.length < 2 ? q[0] ? one(q[0].x) : zero2(b) : (b = q.length, function(t) {
    for (var i2 = 0, o; i2 < b; ++i2) s[(o = q[i2]).i] = o.x(t);
    return s.join("");
  });
}

// node_modules/d3-interpolate/src/value.js
function value_default(a, b) {
  var t = typeof b, c;
  return b == null || t === "boolean" ? constant_default(b) : (t === "number" ? number_default : t === "string" ? (c = color(b)) ? (b = c, rgb_default) : string_default : b instanceof color ? rgb_default : b instanceof Date ? date_default : isNumberArray(b) ? numberArray_default : Array.isArray(b) ? genericArray : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object_default : number_default)(a, b);
}

// node_modules/d3-interpolate/src/round.js
function round_default(a, b) {
  return a = +a, b = +b, function(t) {
    return Math.round(a * (1 - t) + b * t);
  };
}

// node_modules/d3-scale/src/constant.js
function constants(x2) {
  return function() {
    return x2;
  };
}

// node_modules/d3-scale/src/number.js
function number2(x2) {
  return +x2;
}

// node_modules/d3-scale/src/continuous.js
var unit = [0, 1];
function identity(x2) {
  return x2;
}
function normalize(a, b) {
  return (b -= a = +a) ? function(x2) {
    return (x2 - a) / b;
  } : constants(isNaN(b) ? NaN : 0.5);
}
function clamper(a, b) {
  var t;
  if (a > b) t = a, a = b, b = t;
  return function(x2) {
    return Math.max(a, Math.min(b, x2));
  };
}
function bimap(domain, range2, interpolate) {
  var d0 = domain[0], d1 = domain[1], r0 = range2[0], r1 = range2[1];
  if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
  else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
  return function(x2) {
    return r0(d0(x2));
  };
}
function polymap(domain, range2, interpolate) {
  var j = Math.min(domain.length, range2.length) - 1, d = new Array(j), r = new Array(j), i = -1;
  if (domain[j] < domain[0]) {
    domain = domain.slice().reverse();
    range2 = range2.slice().reverse();
  }
  while (++i < j) {
    d[i] = normalize(domain[i], domain[i + 1]);
    r[i] = interpolate(range2[i], range2[i + 1]);
  }
  return function(x2) {
    var i2 = bisect_default(domain, x2, 1, j) - 1;
    return r[i2](d[i2](x2));
  };
}
function copy(source, target) {
  return target.domain(source.domain()).range(source.range()).interpolate(source.interpolate()).clamp(source.clamp()).unknown(source.unknown());
}
function transformer() {
  var domain = unit, range2 = unit, interpolate = value_default, transform, untransform, unknown, clamp = identity, piecewise, output, input;
  function rescale() {
    var n = Math.min(domain.length, range2.length);
    if (clamp !== identity) clamp = clamper(domain[0], domain[n - 1]);
    piecewise = n > 2 ? polymap : bimap;
    output = input = null;
    return scale;
  }
  function scale(x2) {
    return x2 == null || isNaN(x2 = +x2) ? unknown : (output || (output = piecewise(domain.map(transform), range2, interpolate)))(transform(clamp(x2)));
  }
  scale.invert = function(y2) {
    return clamp(untransform((input || (input = piecewise(range2, domain.map(transform), number_default)))(y2)));
  };
  scale.domain = function(_) {
    return arguments.length ? (domain = Array.from(_, number2), rescale()) : domain.slice();
  };
  scale.range = function(_) {
    return arguments.length ? (range2 = Array.from(_), rescale()) : range2.slice();
  };
  scale.rangeRound = function(_) {
    return range2 = Array.from(_), interpolate = round_default, rescale();
  };
  scale.clamp = function(_) {
    return arguments.length ? (clamp = _ ? true : identity, rescale()) : clamp !== identity;
  };
  scale.interpolate = function(_) {
    return arguments.length ? (interpolate = _, rescale()) : interpolate;
  };
  scale.unknown = function(_) {
    return arguments.length ? (unknown = _, scale) : unknown;
  };
  return function(t, u) {
    transform = t, untransform = u;
    return rescale();
  };
}
function continuous() {
  return transformer()(identity, identity);
}

// node_modules/d3-format/src/formatDecimal.js
function formatDecimal_default(x2) {
  return Math.abs(x2 = Math.round(x2)) >= 1e21 ? x2.toLocaleString("en").replace(/,/g, "") : x2.toString(10);
}
function formatDecimalParts(x2, p) {
  if (!isFinite(x2) || x2 === 0) return null;
  var i = (x2 = p ? x2.toExponential(p - 1) : x2.toExponential()).indexOf("e"), coefficient = x2.slice(0, i);
  return [
    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
    +x2.slice(i + 1)
  ];
}

// node_modules/d3-format/src/exponent.js
function exponent_default(x2) {
  return x2 = formatDecimalParts(Math.abs(x2)), x2 ? x2[1] : NaN;
}

// node_modules/d3-format/src/formatGroup.js
function formatGroup_default(grouping, thousands) {
  return function(value, width) {
    var i = value.length, t = [], j = 0, g = grouping[0], length = 0;
    while (i > 0 && g > 0) {
      if (length + g + 1 > width) g = Math.max(1, width - length);
      t.push(value.substring(i -= g, i + g));
      if ((length += g + 1) > width) break;
      g = grouping[j = (j + 1) % grouping.length];
    }
    return t.reverse().join(thousands);
  };
}

// node_modules/d3-format/src/formatNumerals.js
function formatNumerals_default(numerals) {
  return function(value) {
    return value.replace(/[0-9]/g, function(i) {
      return numerals[+i];
    });
  };
}

// node_modules/d3-format/src/formatSpecifier.js
var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
function formatSpecifier(specifier) {
  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
  var match;
  return new FormatSpecifier({
    fill: match[1],
    align: match[2],
    sign: match[3],
    symbol: match[4],
    zero: match[5],
    width: match[6],
    comma: match[7],
    precision: match[8] && match[8].slice(1),
    trim: match[9],
    type: match[10]
  });
}
formatSpecifier.prototype = FormatSpecifier.prototype;
function FormatSpecifier(specifier) {
  this.fill = specifier.fill === void 0 ? " " : specifier.fill + "";
  this.align = specifier.align === void 0 ? ">" : specifier.align + "";
  this.sign = specifier.sign === void 0 ? "-" : specifier.sign + "";
  this.symbol = specifier.symbol === void 0 ? "" : specifier.symbol + "";
  this.zero = !!specifier.zero;
  this.width = specifier.width === void 0 ? void 0 : +specifier.width;
  this.comma = !!specifier.comma;
  this.precision = specifier.precision === void 0 ? void 0 : +specifier.precision;
  this.trim = !!specifier.trim;
  this.type = specifier.type === void 0 ? "" : specifier.type + "";
}
FormatSpecifier.prototype.toString = function() {
  return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
};

// node_modules/d3-format/src/formatTrim.js
function formatTrim_default(s) {
  out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
    switch (s[i]) {
      case ".":
        i0 = i1 = i;
        break;
      case "0":
        if (i0 === 0) i0 = i;
        i1 = i;
        break;
      default:
        if (!+s[i]) break out;
        if (i0 > 0) i0 = 0;
        break;
    }
  }
  return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
}

// node_modules/d3-format/src/formatPrefixAuto.js
var prefixExponent;
function formatPrefixAuto_default(x2, p) {
  var d = formatDecimalParts(x2, p);
  if (!d) return prefixExponent = void 0, x2.toPrecision(p);
  var coefficient = d[0], exponent = d[1], i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1, n = coefficient.length;
  return i === n ? coefficient : i > n ? coefficient + new Array(i - n + 1).join("0") : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i) : "0." + new Array(1 - i).join("0") + formatDecimalParts(x2, Math.max(0, p + i - 1))[0];
}

// node_modules/d3-format/src/formatRounded.js
function formatRounded_default(x2, p) {
  var d = formatDecimalParts(x2, p);
  if (!d) return x2 + "";
  var coefficient = d[0], exponent = d[1];
  return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1) : coefficient + new Array(exponent - coefficient.length + 2).join("0");
}

// node_modules/d3-format/src/formatTypes.js
var formatTypes_default = {
  "%": (x2, p) => (x2 * 100).toFixed(p),
  "b": (x2) => Math.round(x2).toString(2),
  "c": (x2) => x2 + "",
  "d": formatDecimal_default,
  "e": (x2, p) => x2.toExponential(p),
  "f": (x2, p) => x2.toFixed(p),
  "g": (x2, p) => x2.toPrecision(p),
  "o": (x2) => Math.round(x2).toString(8),
  "p": (x2, p) => formatRounded_default(x2 * 100, p),
  "r": formatRounded_default,
  "s": formatPrefixAuto_default,
  "X": (x2) => Math.round(x2).toString(16).toUpperCase(),
  "x": (x2) => Math.round(x2).toString(16)
};

// node_modules/d3-format/src/identity.js
function identity_default(x2) {
  return x2;
}

// node_modules/d3-format/src/locale.js
var map = Array.prototype.map;
var prefixes = ["y", "z", "a", "f", "p", "n", "\xB5", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y"];
function locale_default(locale3) {
  var group = locale3.grouping === void 0 || locale3.thousands === void 0 ? identity_default : formatGroup_default(map.call(locale3.grouping, Number), locale3.thousands + ""), currencyPrefix = locale3.currency === void 0 ? "" : locale3.currency[0] + "", currencySuffix = locale3.currency === void 0 ? "" : locale3.currency[1] + "", decimal = locale3.decimal === void 0 ? "." : locale3.decimal + "", numerals = locale3.numerals === void 0 ? identity_default : formatNumerals_default(map.call(locale3.numerals, String)), percent = locale3.percent === void 0 ? "%" : locale3.percent + "", minus = locale3.minus === void 0 ? "\u2212" : locale3.minus + "", nan = locale3.nan === void 0 ? "NaN" : locale3.nan + "";
  function newFormat(specifier, options) {
    specifier = formatSpecifier(specifier);
    var fill = specifier.fill, align = specifier.align, sign = specifier.sign, symbol = specifier.symbol, zero3 = specifier.zero, width = specifier.width, comma = specifier.comma, precision = specifier.precision, trim = specifier.trim, type = specifier.type;
    if (type === "n") comma = true, type = "g";
    else if (!formatTypes_default[type]) precision === void 0 && (precision = 12), trim = true, type = "g";
    if (zero3 || fill === "0" && align === "=") zero3 = true, fill = "0", align = "=";
    var prefix = (options && options.prefix !== void 0 ? options.prefix : "") + (symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : ""), suffix = (symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "") + (options && options.suffix !== void 0 ? options.suffix : "");
    var formatType = formatTypes_default[type], maybeSuffix = /[defgprs%]/.test(type);
    precision = precision === void 0 ? 6 : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision)) : Math.max(0, Math.min(20, precision));
    function format2(value) {
      var valuePrefix = prefix, valueSuffix = suffix, i, n, c;
      if (type === "c") {
        valueSuffix = formatType(value) + valueSuffix;
        value = "";
      } else {
        value = +value;
        var valueNegative = value < 0 || 1 / value < 0;
        value = isNaN(value) ? nan : formatType(Math.abs(value), precision);
        if (trim) value = formatTrim_default(value);
        if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;
        valuePrefix = (valueNegative ? sign === "(" ? sign : minus : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
        valueSuffix = (type === "s" && !isNaN(value) && prefixExponent !== void 0 ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");
        if (maybeSuffix) {
          i = -1, n = value.length;
          while (++i < n) {
            if (c = value.charCodeAt(i), 48 > c || c > 57) {
              valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
              value = value.slice(0, i);
              break;
            }
          }
        }
      }
      if (comma && !zero3) value = group(value, Infinity);
      var length = valuePrefix.length + value.length + valueSuffix.length, padding = length < width ? new Array(width - length + 1).join(fill) : "";
      if (comma && zero3) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";
      switch (align) {
        case "<":
          value = valuePrefix + value + valueSuffix + padding;
          break;
        case "=":
          value = valuePrefix + padding + value + valueSuffix;
          break;
        case "^":
          value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length);
          break;
        default:
          value = padding + valuePrefix + value + valueSuffix;
          break;
      }
      return numerals(value);
    }
    format2.toString = function() {
      return specifier + "";
    };
    return format2;
  }
  function formatPrefix2(specifier, value) {
    var e = Math.max(-8, Math.min(8, Math.floor(exponent_default(value) / 3))) * 3, k = Math.pow(10, -e), f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier), { suffix: prefixes[8 + e / 3] });
    return function(value2) {
      return f(k * value2);
    };
  }
  return {
    format: newFormat,
    formatPrefix: formatPrefix2
  };
}

// node_modules/d3-format/src/defaultLocale.js
var locale;
var format;
var formatPrefix;
defaultLocale({
  thousands: ",",
  grouping: [3],
  currency: ["$", ""]
});
function defaultLocale(definition) {
  locale = locale_default(definition);
  format = locale.format;
  formatPrefix = locale.formatPrefix;
  return locale;
}

// node_modules/d3-format/src/precisionFixed.js
function precisionFixed_default(step) {
  return Math.max(0, -exponent_default(Math.abs(step)));
}

// node_modules/d3-format/src/precisionPrefix.js
function precisionPrefix_default(step, value) {
  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent_default(value) / 3))) * 3 - exponent_default(Math.abs(step)));
}

// node_modules/d3-format/src/precisionRound.js
function precisionRound_default(step, max) {
  step = Math.abs(step), max = Math.abs(max) - step;
  return Math.max(0, exponent_default(max) - exponent_default(step)) + 1;
}

// node_modules/d3-scale/src/tickFormat.js
function tickFormat(start, stop, count, specifier) {
  var step = tickStep(start, stop, count), precision;
  specifier = formatSpecifier(specifier == null ? ",f" : specifier);
  switch (specifier.type) {
    case "s": {
      var value = Math.max(Math.abs(start), Math.abs(stop));
      if (specifier.precision == null && !isNaN(precision = precisionPrefix_default(step, value))) specifier.precision = precision;
      return formatPrefix(specifier, value);
    }
    case "":
    case "e":
    case "g":
    case "p":
    case "r": {
      if (specifier.precision == null && !isNaN(precision = precisionRound_default(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
      break;
    }
    case "f":
    case "%": {
      if (specifier.precision == null && !isNaN(precision = precisionFixed_default(step))) specifier.precision = precision - (specifier.type === "%") * 2;
      break;
    }
  }
  return format(specifier);
}

// node_modules/d3-scale/src/linear.js
function linearish(scale) {
  var domain = scale.domain;
  scale.ticks = function(count) {
    var d = domain();
    return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
  };
  scale.tickFormat = function(count, specifier) {
    var d = domain();
    return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
  };
  scale.nice = function(count) {
    if (count == null) count = 10;
    var d = domain();
    var i0 = 0;
    var i1 = d.length - 1;
    var start = d[i0];
    var stop = d[i1];
    var prestep;
    var step;
    var maxIter = 10;
    if (stop < start) {
      step = start, start = stop, stop = step;
      step = i0, i0 = i1, i1 = step;
    }
    while (maxIter-- > 0) {
      step = tickIncrement(start, stop, count);
      if (step === prestep) {
        d[i0] = start;
        d[i1] = stop;
        return domain(d);
      } else if (step > 0) {
        start = Math.floor(start / step) * step;
        stop = Math.ceil(stop / step) * step;
      } else if (step < 0) {
        start = Math.ceil(start * step) / step;
        stop = Math.floor(stop * step) / step;
      } else {
        break;
      }
      prestep = step;
    }
    return scale;
  };
  return scale;
}
function linear2() {
  var scale = continuous();
  scale.copy = function() {
    return copy(scale, linear2());
  };
  initRange.apply(scale, arguments);
  return linearish(scale);
}

// node_modules/d3-scale/src/nice.js
function nice(domain, interval) {
  domain = domain.slice();
  var i0 = 0, i1 = domain.length - 1, x0 = domain[i0], x1 = domain[i1], t;
  if (x1 < x0) {
    t = i0, i0 = i1, i1 = t;
    t = x0, x0 = x1, x1 = t;
  }
  domain[i0] = interval.floor(x0);
  domain[i1] = interval.ceil(x1);
  return domain;
}

// node_modules/d3-time/src/interval.js
var t0 = /* @__PURE__ */ new Date();
var t1 = /* @__PURE__ */ new Date();
function timeInterval(floori, offseti, count, field) {
  function interval(date2) {
    return floori(date2 = arguments.length === 0 ? /* @__PURE__ */ new Date() : /* @__PURE__ */ new Date(+date2)), date2;
  }
  interval.floor = (date2) => {
    return floori(date2 = /* @__PURE__ */ new Date(+date2)), date2;
  };
  interval.ceil = (date2) => {
    return floori(date2 = new Date(date2 - 1)), offseti(date2, 1), floori(date2), date2;
  };
  interval.round = (date2) => {
    const d0 = interval(date2), d1 = interval.ceil(date2);
    return date2 - d0 < d1 - date2 ? d0 : d1;
  };
  interval.offset = (date2, step) => {
    return offseti(date2 = /* @__PURE__ */ new Date(+date2), step == null ? 1 : Math.floor(step)), date2;
  };
  interval.range = (start, stop, step) => {
    const range2 = [];
    start = interval.ceil(start);
    step = step == null ? 1 : Math.floor(step);
    if (!(start < stop) || !(step > 0)) return range2;
    let previous;
    do
      range2.push(previous = /* @__PURE__ */ new Date(+start)), offseti(start, step), floori(start);
    while (previous < start && start < stop);
    return range2;
  };
  interval.filter = (test) => {
    return timeInterval((date2) => {
      if (date2 >= date2) while (floori(date2), !test(date2)) date2.setTime(date2 - 1);
    }, (date2, step) => {
      if (date2 >= date2) {
        if (step < 0) while (++step <= 0) {
          while (offseti(date2, -1), !test(date2)) {
          }
        }
        else while (--step >= 0) {
          while (offseti(date2, 1), !test(date2)) {
          }
        }
      }
    });
  };
  if (count) {
    interval.count = (start, end) => {
      t0.setTime(+start), t1.setTime(+end);
      floori(t0), floori(t1);
      return Math.floor(count(t0, t1));
    };
    interval.every = (step) => {
      step = Math.floor(step);
      return !isFinite(step) || !(step > 0) ? null : !(step > 1) ? interval : interval.filter(field ? (d) => field(d) % step === 0 : (d) => interval.count(0, d) % step === 0);
    };
  }
  return interval;
}

// node_modules/d3-time/src/millisecond.js
var millisecond = timeInterval(() => {
}, (date2, step) => {
  date2.setTime(+date2 + step);
}, (start, end) => {
  return end - start;
});
millisecond.every = (k) => {
  k = Math.floor(k);
  if (!isFinite(k) || !(k > 0)) return null;
  if (!(k > 1)) return millisecond;
  return timeInterval((date2) => {
    date2.setTime(Math.floor(date2 / k) * k);
  }, (date2, step) => {
    date2.setTime(+date2 + step * k);
  }, (start, end) => {
    return (end - start) / k;
  });
};
var milliseconds = millisecond.range;

// node_modules/d3-time/src/duration.js
var durationSecond = 1e3;
var durationMinute = durationSecond * 60;
var durationHour = durationMinute * 60;
var durationDay = durationHour * 24;
var durationWeek = durationDay * 7;
var durationMonth = durationDay * 30;
var durationYear = durationDay * 365;

// node_modules/d3-time/src/second.js
var second = timeInterval((date2) => {
  date2.setTime(date2 - date2.getMilliseconds());
}, (date2, step) => {
  date2.setTime(+date2 + step * durationSecond);
}, (start, end) => {
  return (end - start) / durationSecond;
}, (date2) => {
  return date2.getUTCSeconds();
});
var seconds = second.range;

// node_modules/d3-time/src/minute.js
var timeMinute = timeInterval((date2) => {
  date2.setTime(date2 - date2.getMilliseconds() - date2.getSeconds() * durationSecond);
}, (date2, step) => {
  date2.setTime(+date2 + step * durationMinute);
}, (start, end) => {
  return (end - start) / durationMinute;
}, (date2) => {
  return date2.getMinutes();
});
var timeMinutes = timeMinute.range;
var utcMinute = timeInterval((date2) => {
  date2.setUTCSeconds(0, 0);
}, (date2, step) => {
  date2.setTime(+date2 + step * durationMinute);
}, (start, end) => {
  return (end - start) / durationMinute;
}, (date2) => {
  return date2.getUTCMinutes();
});
var utcMinutes = utcMinute.range;

// node_modules/d3-time/src/hour.js
var timeHour = timeInterval((date2) => {
  date2.setTime(date2 - date2.getMilliseconds() - date2.getSeconds() * durationSecond - date2.getMinutes() * durationMinute);
}, (date2, step) => {
  date2.setTime(+date2 + step * durationHour);
}, (start, end) => {
  return (end - start) / durationHour;
}, (date2) => {
  return date2.getHours();
});
var timeHours = timeHour.range;
var utcHour = timeInterval((date2) => {
  date2.setUTCMinutes(0, 0, 0);
}, (date2, step) => {
  date2.setTime(+date2 + step * durationHour);
}, (start, end) => {
  return (end - start) / durationHour;
}, (date2) => {
  return date2.getUTCHours();
});
var utcHours = utcHour.range;

// node_modules/d3-time/src/day.js
var timeDay = timeInterval(
  (date2) => date2.setHours(0, 0, 0, 0),
  (date2, step) => date2.setDate(date2.getDate() + step),
  (start, end) => (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay,
  (date2) => date2.getDate() - 1
);
var timeDays = timeDay.range;
var utcDay = timeInterval((date2) => {
  date2.setUTCHours(0, 0, 0, 0);
}, (date2, step) => {
  date2.setUTCDate(date2.getUTCDate() + step);
}, (start, end) => {
  return (end - start) / durationDay;
}, (date2) => {
  return date2.getUTCDate() - 1;
});
var utcDays = utcDay.range;
var unixDay = timeInterval((date2) => {
  date2.setUTCHours(0, 0, 0, 0);
}, (date2, step) => {
  date2.setUTCDate(date2.getUTCDate() + step);
}, (start, end) => {
  return (end - start) / durationDay;
}, (date2) => {
  return Math.floor(date2 / durationDay);
});
var unixDays = unixDay.range;

// node_modules/d3-time/src/week.js
function timeWeekday(i) {
  return timeInterval((date2) => {
    date2.setDate(date2.getDate() - (date2.getDay() + 7 - i) % 7);
    date2.setHours(0, 0, 0, 0);
  }, (date2, step) => {
    date2.setDate(date2.getDate() + step * 7);
  }, (start, end) => {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
  });
}
var timeSunday = timeWeekday(0);
var timeMonday = timeWeekday(1);
var timeTuesday = timeWeekday(2);
var timeWednesday = timeWeekday(3);
var timeThursday = timeWeekday(4);
var timeFriday = timeWeekday(5);
var timeSaturday = timeWeekday(6);
var timeSundays = timeSunday.range;
var timeMondays = timeMonday.range;
var timeTuesdays = timeTuesday.range;
var timeWednesdays = timeWednesday.range;
var timeThursdays = timeThursday.range;
var timeFridays = timeFriday.range;
var timeSaturdays = timeSaturday.range;
function utcWeekday(i) {
  return timeInterval((date2) => {
    date2.setUTCDate(date2.getUTCDate() - (date2.getUTCDay() + 7 - i) % 7);
    date2.setUTCHours(0, 0, 0, 0);
  }, (date2, step) => {
    date2.setUTCDate(date2.getUTCDate() + step * 7);
  }, (start, end) => {
    return (end - start) / durationWeek;
  });
}
var utcSunday = utcWeekday(0);
var utcMonday = utcWeekday(1);
var utcTuesday = utcWeekday(2);
var utcWednesday = utcWeekday(3);
var utcThursday = utcWeekday(4);
var utcFriday = utcWeekday(5);
var utcSaturday = utcWeekday(6);
var utcSundays = utcSunday.range;
var utcMondays = utcMonday.range;
var utcTuesdays = utcTuesday.range;
var utcWednesdays = utcWednesday.range;
var utcThursdays = utcThursday.range;
var utcFridays = utcFriday.range;
var utcSaturdays = utcSaturday.range;

// node_modules/d3-time/src/month.js
var timeMonth = timeInterval((date2) => {
  date2.setDate(1);
  date2.setHours(0, 0, 0, 0);
}, (date2, step) => {
  date2.setMonth(date2.getMonth() + step);
}, (start, end) => {
  return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
}, (date2) => {
  return date2.getMonth();
});
var timeMonths = timeMonth.range;
var utcMonth = timeInterval((date2) => {
  date2.setUTCDate(1);
  date2.setUTCHours(0, 0, 0, 0);
}, (date2, step) => {
  date2.setUTCMonth(date2.getUTCMonth() + step);
}, (start, end) => {
  return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
}, (date2) => {
  return date2.getUTCMonth();
});
var utcMonths = utcMonth.range;

// node_modules/d3-time/src/year.js
var timeYear = timeInterval((date2) => {
  date2.setMonth(0, 1);
  date2.setHours(0, 0, 0, 0);
}, (date2, step) => {
  date2.setFullYear(date2.getFullYear() + step);
}, (start, end) => {
  return end.getFullYear() - start.getFullYear();
}, (date2) => {
  return date2.getFullYear();
});
timeYear.every = (k) => {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : timeInterval((date2) => {
    date2.setFullYear(Math.floor(date2.getFullYear() / k) * k);
    date2.setMonth(0, 1);
    date2.setHours(0, 0, 0, 0);
  }, (date2, step) => {
    date2.setFullYear(date2.getFullYear() + step * k);
  });
};
var timeYears = timeYear.range;
var utcYear = timeInterval((date2) => {
  date2.setUTCMonth(0, 1);
  date2.setUTCHours(0, 0, 0, 0);
}, (date2, step) => {
  date2.setUTCFullYear(date2.getUTCFullYear() + step);
}, (start, end) => {
  return end.getUTCFullYear() - start.getUTCFullYear();
}, (date2) => {
  return date2.getUTCFullYear();
});
utcYear.every = (k) => {
  return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : timeInterval((date2) => {
    date2.setUTCFullYear(Math.floor(date2.getUTCFullYear() / k) * k);
    date2.setUTCMonth(0, 1);
    date2.setUTCHours(0, 0, 0, 0);
  }, (date2, step) => {
    date2.setUTCFullYear(date2.getUTCFullYear() + step * k);
  });
};
var utcYears = utcYear.range;

// node_modules/d3-time/src/ticks.js
function ticker(year, month, week, day, hour, minute) {
  const tickIntervals = [
    [second, 1, durationSecond],
    [second, 5, 5 * durationSecond],
    [second, 15, 15 * durationSecond],
    [second, 30, 30 * durationSecond],
    [minute, 1, durationMinute],
    [minute, 5, 5 * durationMinute],
    [minute, 15, 15 * durationMinute],
    [minute, 30, 30 * durationMinute],
    [hour, 1, durationHour],
    [hour, 3, 3 * durationHour],
    [hour, 6, 6 * durationHour],
    [hour, 12, 12 * durationHour],
    [day, 1, durationDay],
    [day, 2, 2 * durationDay],
    [week, 1, durationWeek],
    [month, 1, durationMonth],
    [month, 3, 3 * durationMonth],
    [year, 1, durationYear]
  ];
  function ticks2(start, stop, count) {
    const reverse = stop < start;
    if (reverse) [start, stop] = [stop, start];
    const interval = count && typeof count.range === "function" ? count : tickInterval(start, stop, count);
    const ticks3 = interval ? interval.range(start, +stop + 1) : [];
    return reverse ? ticks3.reverse() : ticks3;
  }
  function tickInterval(start, stop, count) {
    const target = Math.abs(stop - start) / count;
    const i = bisector(([, , step2]) => step2).right(tickIntervals, target);
    if (i === tickIntervals.length) return year.every(tickStep(start / durationYear, stop / durationYear, count));
    if (i === 0) return millisecond.every(Math.max(tickStep(start, stop, count), 1));
    const [t, step] = tickIntervals[target / tickIntervals[i - 1][2] < tickIntervals[i][2] / target ? i - 1 : i];
    return t.every(step);
  }
  return [ticks2, tickInterval];
}
var [utcTicks, utcTickInterval] = ticker(utcYear, utcMonth, utcSunday, unixDay, utcHour, utcMinute);
var [timeTicks, timeTickInterval] = ticker(timeYear, timeMonth, timeSunday, timeDay, timeHour, timeMinute);

// node_modules/d3-time-format/src/locale.js
function localDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date2 = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
    date2.setFullYear(d.y);
    return date2;
  }
  return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
}
function utcDate(d) {
  if (0 <= d.y && d.y < 100) {
    var date2 = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
    date2.setUTCFullYear(d.y);
    return date2;
  }
  return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
}
function newDate(y2, m, d) {
  return { y: y2, m, d, H: 0, M: 0, S: 0, L: 0 };
}
function formatLocale(locale3) {
  var locale_dateTime = locale3.dateTime, locale_date = locale3.date, locale_time = locale3.time, locale_periods = locale3.periods, locale_weekdays = locale3.days, locale_shortWeekdays = locale3.shortDays, locale_months = locale3.months, locale_shortMonths = locale3.shortMonths;
  var periodRe = formatRe(locale_periods), periodLookup = formatLookup(locale_periods), weekdayRe = formatRe(locale_weekdays), weekdayLookup = formatLookup(locale_weekdays), shortWeekdayRe = formatRe(locale_shortWeekdays), shortWeekdayLookup = formatLookup(locale_shortWeekdays), monthRe = formatRe(locale_months), monthLookup = formatLookup(locale_months), shortMonthRe = formatRe(locale_shortMonths), shortMonthLookup = formatLookup(locale_shortMonths);
  var formats = {
    "a": formatShortWeekday,
    "A": formatWeekday,
    "b": formatShortMonth,
    "B": formatMonth,
    "c": null,
    "d": formatDayOfMonth,
    "e": formatDayOfMonth,
    "f": formatMicroseconds,
    "g": formatYearISO,
    "G": formatFullYearISO,
    "H": formatHour24,
    "I": formatHour12,
    "j": formatDayOfYear,
    "L": formatMilliseconds,
    "m": formatMonthNumber,
    "M": formatMinutes,
    "p": formatPeriod,
    "q": formatQuarter,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatSeconds,
    "u": formatWeekdayNumberMonday,
    "U": formatWeekNumberSunday,
    "V": formatWeekNumberISO,
    "w": formatWeekdayNumberSunday,
    "W": formatWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatYear,
    "Y": formatFullYear,
    "Z": formatZone,
    "%": formatLiteralPercent
  };
  var utcFormats = {
    "a": formatUTCShortWeekday,
    "A": formatUTCWeekday,
    "b": formatUTCShortMonth,
    "B": formatUTCMonth,
    "c": null,
    "d": formatUTCDayOfMonth,
    "e": formatUTCDayOfMonth,
    "f": formatUTCMicroseconds,
    "g": formatUTCYearISO,
    "G": formatUTCFullYearISO,
    "H": formatUTCHour24,
    "I": formatUTCHour12,
    "j": formatUTCDayOfYear,
    "L": formatUTCMilliseconds,
    "m": formatUTCMonthNumber,
    "M": formatUTCMinutes,
    "p": formatUTCPeriod,
    "q": formatUTCQuarter,
    "Q": formatUnixTimestamp,
    "s": formatUnixTimestampSeconds,
    "S": formatUTCSeconds,
    "u": formatUTCWeekdayNumberMonday,
    "U": formatUTCWeekNumberSunday,
    "V": formatUTCWeekNumberISO,
    "w": formatUTCWeekdayNumberSunday,
    "W": formatUTCWeekNumberMonday,
    "x": null,
    "X": null,
    "y": formatUTCYear,
    "Y": formatUTCFullYear,
    "Z": formatUTCZone,
    "%": formatLiteralPercent
  };
  var parses = {
    "a": parseShortWeekday,
    "A": parseWeekday,
    "b": parseShortMonth,
    "B": parseMonth,
    "c": parseLocaleDateTime,
    "d": parseDayOfMonth,
    "e": parseDayOfMonth,
    "f": parseMicroseconds,
    "g": parseYear,
    "G": parseFullYear,
    "H": parseHour24,
    "I": parseHour24,
    "j": parseDayOfYear,
    "L": parseMilliseconds,
    "m": parseMonthNumber,
    "M": parseMinutes,
    "p": parsePeriod,
    "q": parseQuarter,
    "Q": parseUnixTimestamp,
    "s": parseUnixTimestampSeconds,
    "S": parseSeconds,
    "u": parseWeekdayNumberMonday,
    "U": parseWeekNumberSunday,
    "V": parseWeekNumberISO,
    "w": parseWeekdayNumberSunday,
    "W": parseWeekNumberMonday,
    "x": parseLocaleDate,
    "X": parseLocaleTime,
    "y": parseYear,
    "Y": parseFullYear,
    "Z": parseZone,
    "%": parseLiteralPercent
  };
  formats.x = newFormat(locale_date, formats);
  formats.X = newFormat(locale_time, formats);
  formats.c = newFormat(locale_dateTime, formats);
  utcFormats.x = newFormat(locale_date, utcFormats);
  utcFormats.X = newFormat(locale_time, utcFormats);
  utcFormats.c = newFormat(locale_dateTime, utcFormats);
  function newFormat(specifier, formats2) {
    return function(date2) {
      var string = [], i = -1, j = 0, n = specifier.length, c, pad2, format2;
      if (!(date2 instanceof Date)) date2 = /* @__PURE__ */ new Date(+date2);
      while (++i < n) {
        if (specifier.charCodeAt(i) === 37) {
          string.push(specifier.slice(j, i));
          if ((pad2 = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
          else pad2 = c === "e" ? " " : "0";
          if (format2 = formats2[c]) c = format2(date2, pad2);
          string.push(c);
          j = i + 1;
        }
      }
      string.push(specifier.slice(j, i));
      return string.join("");
    };
  }
  function newParse(specifier, Z) {
    return function(string) {
      var d = newDate(1900, void 0, 1), i = parseSpecifier(d, specifier, string += "", 0), week, day;
      if (i != string.length) return null;
      if ("Q" in d) return new Date(d.Q);
      if ("s" in d) return new Date(d.s * 1e3 + ("L" in d ? d.L : 0));
      if (Z && !("Z" in d)) d.Z = 0;
      if ("p" in d) d.H = d.H % 12 + d.p * 12;
      if (d.m === void 0) d.m = "q" in d ? d.q : 0;
      if ("V" in d) {
        if (d.V < 1 || d.V > 53) return null;
        if (!("w" in d)) d.w = 1;
        if ("Z" in d) {
          week = utcDate(newDate(d.y, 0, 1)), day = week.getUTCDay();
          week = day > 4 || day === 0 ? utcMonday.ceil(week) : utcMonday(week);
          week = utcDay.offset(week, (d.V - 1) * 7);
          d.y = week.getUTCFullYear();
          d.m = week.getUTCMonth();
          d.d = week.getUTCDate() + (d.w + 6) % 7;
        } else {
          week = localDate(newDate(d.y, 0, 1)), day = week.getDay();
          week = day > 4 || day === 0 ? timeMonday.ceil(week) : timeMonday(week);
          week = timeDay.offset(week, (d.V - 1) * 7);
          d.y = week.getFullYear();
          d.m = week.getMonth();
          d.d = week.getDate() + (d.w + 6) % 7;
        }
      } else if ("W" in d || "U" in d) {
        if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
        day = "Z" in d ? utcDate(newDate(d.y, 0, 1)).getUTCDay() : localDate(newDate(d.y, 0, 1)).getDay();
        d.m = 0;
        d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day + 5) % 7 : d.w + d.U * 7 - (day + 6) % 7;
      }
      if ("Z" in d) {
        d.H += d.Z / 100 | 0;
        d.M += d.Z % 100;
        return utcDate(d);
      }
      return localDate(d);
    };
  }
  function parseSpecifier(d, specifier, string, j) {
    var i = 0, n = specifier.length, m = string.length, c, parse;
    while (i < n) {
      if (j >= m) return -1;
      c = specifier.charCodeAt(i++);
      if (c === 37) {
        c = specifier.charAt(i++);
        parse = parses[c in pads ? specifier.charAt(i++) : c];
        if (!parse || (j = parse(d, string, j)) < 0) return -1;
      } else if (c != string.charCodeAt(j++)) {
        return -1;
      }
    }
    return j;
  }
  function parsePeriod(d, string, i) {
    var n = periodRe.exec(string.slice(i));
    return n ? (d.p = periodLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function parseShortWeekday(d, string, i) {
    var n = shortWeekdayRe.exec(string.slice(i));
    return n ? (d.w = shortWeekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function parseWeekday(d, string, i) {
    var n = weekdayRe.exec(string.slice(i));
    return n ? (d.w = weekdayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function parseShortMonth(d, string, i) {
    var n = shortMonthRe.exec(string.slice(i));
    return n ? (d.m = shortMonthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function parseMonth(d, string, i) {
    var n = monthRe.exec(string.slice(i));
    return n ? (d.m = monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function parseLocaleDateTime(d, string, i) {
    return parseSpecifier(d, locale_dateTime, string, i);
  }
  function parseLocaleDate(d, string, i) {
    return parseSpecifier(d, locale_date, string, i);
  }
  function parseLocaleTime(d, string, i) {
    return parseSpecifier(d, locale_time, string, i);
  }
  function formatShortWeekday(d) {
    return locale_shortWeekdays[d.getDay()];
  }
  function formatWeekday(d) {
    return locale_weekdays[d.getDay()];
  }
  function formatShortMonth(d) {
    return locale_shortMonths[d.getMonth()];
  }
  function formatMonth(d) {
    return locale_months[d.getMonth()];
  }
  function formatPeriod(d) {
    return locale_periods[+(d.getHours() >= 12)];
  }
  function formatQuarter(d) {
    return 1 + ~~(d.getMonth() / 3);
  }
  function formatUTCShortWeekday(d) {
    return locale_shortWeekdays[d.getUTCDay()];
  }
  function formatUTCWeekday(d) {
    return locale_weekdays[d.getUTCDay()];
  }
  function formatUTCShortMonth(d) {
    return locale_shortMonths[d.getUTCMonth()];
  }
  function formatUTCMonth(d) {
    return locale_months[d.getUTCMonth()];
  }
  function formatUTCPeriod(d) {
    return locale_periods[+(d.getUTCHours() >= 12)];
  }
  function formatUTCQuarter(d) {
    return 1 + ~~(d.getUTCMonth() / 3);
  }
  return {
    format: function(specifier) {
      var f = newFormat(specifier += "", formats);
      f.toString = function() {
        return specifier;
      };
      return f;
    },
    parse: function(specifier) {
      var p = newParse(specifier += "", false);
      p.toString = function() {
        return specifier;
      };
      return p;
    },
    utcFormat: function(specifier) {
      var f = newFormat(specifier += "", utcFormats);
      f.toString = function() {
        return specifier;
      };
      return f;
    },
    utcParse: function(specifier) {
      var p = newParse(specifier += "", true);
      p.toString = function() {
        return specifier;
      };
      return p;
    }
  };
}
var pads = { "-": "", "_": " ", "0": "0" };
var numberRe = /^\s*\d+/;
var percentRe = /^%/;
var requoteRe = /[\\^$*+?|[\]().{}]/g;
function pad(value, fill, width) {
  var sign = value < 0 ? "-" : "", string = (sign ? -value : value) + "", length = string.length;
  return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
}
function requote(s) {
  return s.replace(requoteRe, "\\$&");
}
function formatRe(names) {
  return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
}
function formatLookup(names) {
  return new Map(names.map((name, i) => [name.toLowerCase(), i]));
}
function parseWeekdayNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.w = +n[0], i + n[0].length) : -1;
}
function parseWeekdayNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.u = +n[0], i + n[0].length) : -1;
}
function parseWeekNumberSunday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.U = +n[0], i + n[0].length) : -1;
}
function parseWeekNumberISO(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.V = +n[0], i + n[0].length) : -1;
}
function parseWeekNumberMonday(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.W = +n[0], i + n[0].length) : -1;
}
function parseFullYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 4));
  return n ? (d.y = +n[0], i + n[0].length) : -1;
}
function parseYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2e3), i + n[0].length) : -1;
}
function parseZone(d, string, i) {
  var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
  return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
}
function parseQuarter(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 1));
  return n ? (d.q = n[0] * 3 - 3, i + n[0].length) : -1;
}
function parseMonthNumber(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
}
function parseDayOfMonth(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.d = +n[0], i + n[0].length) : -1;
}
function parseDayOfYear(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
}
function parseHour24(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.H = +n[0], i + n[0].length) : -1;
}
function parseMinutes(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.M = +n[0], i + n[0].length) : -1;
}
function parseSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 2));
  return n ? (d.S = +n[0], i + n[0].length) : -1;
}
function parseMilliseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 3));
  return n ? (d.L = +n[0], i + n[0].length) : -1;
}
function parseMicroseconds(d, string, i) {
  var n = numberRe.exec(string.slice(i, i + 6));
  return n ? (d.L = Math.floor(n[0] / 1e3), i + n[0].length) : -1;
}
function parseLiteralPercent(d, string, i) {
  var n = percentRe.exec(string.slice(i, i + 1));
  return n ? i + n[0].length : -1;
}
function parseUnixTimestamp(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.Q = +n[0], i + n[0].length) : -1;
}
function parseUnixTimestampSeconds(d, string, i) {
  var n = numberRe.exec(string.slice(i));
  return n ? (d.s = +n[0], i + n[0].length) : -1;
}
function formatDayOfMonth(d, p) {
  return pad(d.getDate(), p, 2);
}
function formatHour24(d, p) {
  return pad(d.getHours(), p, 2);
}
function formatHour12(d, p) {
  return pad(d.getHours() % 12 || 12, p, 2);
}
function formatDayOfYear(d, p) {
  return pad(1 + timeDay.count(timeYear(d), d), p, 3);
}
function formatMilliseconds(d, p) {
  return pad(d.getMilliseconds(), p, 3);
}
function formatMicroseconds(d, p) {
  return formatMilliseconds(d, p) + "000";
}
function formatMonthNumber(d, p) {
  return pad(d.getMonth() + 1, p, 2);
}
function formatMinutes(d, p) {
  return pad(d.getMinutes(), p, 2);
}
function formatSeconds(d, p) {
  return pad(d.getSeconds(), p, 2);
}
function formatWeekdayNumberMonday(d) {
  var day = d.getDay();
  return day === 0 ? 7 : day;
}
function formatWeekNumberSunday(d, p) {
  return pad(timeSunday.count(timeYear(d) - 1, d), p, 2);
}
function dISO(d) {
  var day = d.getDay();
  return day >= 4 || day === 0 ? timeThursday(d) : timeThursday.ceil(d);
}
function formatWeekNumberISO(d, p) {
  d = dISO(d);
  return pad(timeThursday.count(timeYear(d), d) + (timeYear(d).getDay() === 4), p, 2);
}
function formatWeekdayNumberSunday(d) {
  return d.getDay();
}
function formatWeekNumberMonday(d, p) {
  return pad(timeMonday.count(timeYear(d) - 1, d), p, 2);
}
function formatYear(d, p) {
  return pad(d.getFullYear() % 100, p, 2);
}
function formatYearISO(d, p) {
  d = dISO(d);
  return pad(d.getFullYear() % 100, p, 2);
}
function formatFullYear(d, p) {
  return pad(d.getFullYear() % 1e4, p, 4);
}
function formatFullYearISO(d, p) {
  var day = d.getDay();
  d = day >= 4 || day === 0 ? timeThursday(d) : timeThursday.ceil(d);
  return pad(d.getFullYear() % 1e4, p, 4);
}
function formatZone(d) {
  var z = d.getTimezoneOffset();
  return (z > 0 ? "-" : (z *= -1, "+")) + pad(z / 60 | 0, "0", 2) + pad(z % 60, "0", 2);
}
function formatUTCDayOfMonth(d, p) {
  return pad(d.getUTCDate(), p, 2);
}
function formatUTCHour24(d, p) {
  return pad(d.getUTCHours(), p, 2);
}
function formatUTCHour12(d, p) {
  return pad(d.getUTCHours() % 12 || 12, p, 2);
}
function formatUTCDayOfYear(d, p) {
  return pad(1 + utcDay.count(utcYear(d), d), p, 3);
}
function formatUTCMilliseconds(d, p) {
  return pad(d.getUTCMilliseconds(), p, 3);
}
function formatUTCMicroseconds(d, p) {
  return formatUTCMilliseconds(d, p) + "000";
}
function formatUTCMonthNumber(d, p) {
  return pad(d.getUTCMonth() + 1, p, 2);
}
function formatUTCMinutes(d, p) {
  return pad(d.getUTCMinutes(), p, 2);
}
function formatUTCSeconds(d, p) {
  return pad(d.getUTCSeconds(), p, 2);
}
function formatUTCWeekdayNumberMonday(d) {
  var dow = d.getUTCDay();
  return dow === 0 ? 7 : dow;
}
function formatUTCWeekNumberSunday(d, p) {
  return pad(utcSunday.count(utcYear(d) - 1, d), p, 2);
}
function UTCdISO(d) {
  var day = d.getUTCDay();
  return day >= 4 || day === 0 ? utcThursday(d) : utcThursday.ceil(d);
}
function formatUTCWeekNumberISO(d, p) {
  d = UTCdISO(d);
  return pad(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
}
function formatUTCWeekdayNumberSunday(d) {
  return d.getUTCDay();
}
function formatUTCWeekNumberMonday(d, p) {
  return pad(utcMonday.count(utcYear(d) - 1, d), p, 2);
}
function formatUTCYear(d, p) {
  return pad(d.getUTCFullYear() % 100, p, 2);
}
function formatUTCYearISO(d, p) {
  d = UTCdISO(d);
  return pad(d.getUTCFullYear() % 100, p, 2);
}
function formatUTCFullYear(d, p) {
  return pad(d.getUTCFullYear() % 1e4, p, 4);
}
function formatUTCFullYearISO(d, p) {
  var day = d.getUTCDay();
  d = day >= 4 || day === 0 ? utcThursday(d) : utcThursday.ceil(d);
  return pad(d.getUTCFullYear() % 1e4, p, 4);
}
function formatUTCZone() {
  return "+0000";
}
function formatLiteralPercent() {
  return "%";
}
function formatUnixTimestamp(d) {
  return +d;
}
function formatUnixTimestampSeconds(d) {
  return Math.floor(+d / 1e3);
}

// node_modules/d3-time-format/src/defaultLocale.js
var locale2;
var timeFormat;
var timeParse;
var utcFormat;
var utcParse;
defaultLocale2({
  dateTime: "%x, %X",
  date: "%-m/%-d/%Y",
  time: "%-I:%M:%S %p",
  periods: ["AM", "PM"],
  days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
});
function defaultLocale2(definition) {
  locale2 = formatLocale(definition);
  timeFormat = locale2.format;
  timeParse = locale2.parse;
  utcFormat = locale2.utcFormat;
  utcParse = locale2.utcParse;
  return locale2;
}

// node_modules/d3-scale/src/time.js
function date(t) {
  return new Date(t);
}
function number3(t) {
  return t instanceof Date ? +t : +/* @__PURE__ */ new Date(+t);
}
function calendar(ticks2, tickInterval, year, month, week, day, hour, minute, second2, format2) {
  var scale = continuous(), invert = scale.invert, domain = scale.domain;
  var formatMillisecond = format2(".%L"), formatSecond = format2(":%S"), formatMinute = format2("%I:%M"), formatHour = format2("%I %p"), formatDay = format2("%a %d"), formatWeek = format2("%b %d"), formatMonth = format2("%B"), formatYear2 = format2("%Y");
  function tickFormat2(date2) {
    return (second2(date2) < date2 ? formatMillisecond : minute(date2) < date2 ? formatSecond : hour(date2) < date2 ? formatMinute : day(date2) < date2 ? formatHour : month(date2) < date2 ? week(date2) < date2 ? formatDay : formatWeek : year(date2) < date2 ? formatMonth : formatYear2)(date2);
  }
  scale.invert = function(y2) {
    return new Date(invert(y2));
  };
  scale.domain = function(_) {
    return arguments.length ? domain(Array.from(_, number3)) : domain().map(date);
  };
  scale.ticks = function(interval) {
    var d = domain();
    return ticks2(d[0], d[d.length - 1], interval == null ? 10 : interval);
  };
  scale.tickFormat = function(count, specifier) {
    return specifier == null ? tickFormat2 : format2(specifier);
  };
  scale.nice = function(interval) {
    var d = domain();
    if (!interval || typeof interval.range !== "function") interval = tickInterval(d[0], d[d.length - 1], interval == null ? 10 : interval);
    return interval ? domain(nice(d, interval)) : scale;
  };
  scale.copy = function() {
    return copy(scale, calendar(ticks2, tickInterval, year, month, week, day, hour, minute, second2, format2));
  };
  return scale;
}
function time() {
  return initRange.apply(calendar(timeTicks, timeTickInterval, timeYear, timeMonth, timeSunday, timeDay, timeHour, timeMinute, second, timeFormat).domain([new Date(2e3, 0, 1), new Date(2e3, 0, 2)]), arguments);
}

// node_modules/d3-shape/src/constant.js
function constant_default2(x2) {
  return function constant() {
    return x2;
  };
}

// node_modules/d3-path/src/path.js
var pi = Math.PI;
var tau = 2 * pi;
var epsilon = 1e-6;
var tauEpsilon = tau - epsilon;
function append(strings) {
  this._ += strings[0];
  for (let i = 1, n = strings.length; i < n; ++i) {
    this._ += arguments[i] + strings[i];
  }
}
function appendRound(digits) {
  let d = Math.floor(digits);
  if (!(d >= 0)) throw new Error(`invalid digits: ${digits}`);
  if (d > 15) return append;
  const k = 10 ** d;
  return function(strings) {
    this._ += strings[0];
    for (let i = 1, n = strings.length; i < n; ++i) {
      this._ += Math.round(arguments[i] * k) / k + strings[i];
    }
  };
}
var Path = class {
  constructor(digits) {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null;
    this._ = "";
    this._append = digits == null ? append : appendRound(digits);
  }
  moveTo(x2, y2) {
    this._append`M${this._x0 = this._x1 = +x2},${this._y0 = this._y1 = +y2}`;
  }
  closePath() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._append`Z`;
    }
  }
  lineTo(x2, y2) {
    this._append`L${this._x1 = +x2},${this._y1 = +y2}`;
  }
  quadraticCurveTo(x1, y1, x2, y2) {
    this._append`Q${+x1},${+y1},${this._x1 = +x2},${this._y1 = +y2}`;
  }
  bezierCurveTo(x1, y1, x2, y2, x3, y3) {
    this._append`C${+x1},${+y1},${+x2},${+y2},${this._x1 = +x3},${this._y1 = +y3}`;
  }
  arcTo(x1, y1, x2, y2, r) {
    x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
    if (r < 0) throw new Error(`negative radius: ${r}`);
    let x0 = this._x1, y0 = this._y1, x21 = x2 - x1, y21 = y2 - y1, x01 = x0 - x1, y01 = y0 - y1, l01_2 = x01 * x01 + y01 * y01;
    if (this._x1 === null) {
      this._append`M${this._x1 = x1},${this._y1 = y1}`;
    } else if (!(l01_2 > epsilon)) ;
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._append`L${this._x1 = x1},${this._y1 = y1}`;
    } else {
      let x20 = x2 - x0, y20 = y2 - y0, l21_2 = x21 * x21 + y21 * y21, l20_2 = x20 * x20 + y20 * y20, l21 = Math.sqrt(l21_2), l01 = Math.sqrt(l01_2), l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2), t01 = l / l01, t21 = l / l21;
      if (Math.abs(t01 - 1) > epsilon) {
        this._append`L${x1 + t01 * x01},${y1 + t01 * y01}`;
      }
      this._append`A${r},${r},0,0,${+(y01 * x20 > x01 * y20)},${this._x1 = x1 + t21 * x21},${this._y1 = y1 + t21 * y21}`;
    }
  }
  arc(x2, y2, r, a0, a1, ccw) {
    x2 = +x2, y2 = +y2, r = +r, ccw = !!ccw;
    if (r < 0) throw new Error(`negative radius: ${r}`);
    let dx = r * Math.cos(a0), dy = r * Math.sin(a0), x0 = x2 + dx, y0 = y2 + dy, cw = 1 ^ ccw, da = ccw ? a0 - a1 : a1 - a0;
    if (this._x1 === null) {
      this._append`M${x0},${y0}`;
    } else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
      this._append`L${x0},${y0}`;
    }
    if (!r) return;
    if (da < 0) da = da % tau + tau;
    if (da > tauEpsilon) {
      this._append`A${r},${r},0,1,${cw},${x2 - dx},${y2 - dy}A${r},${r},0,1,${cw},${this._x1 = x0},${this._y1 = y0}`;
    } else if (da > epsilon) {
      this._append`A${r},${r},0,${+(da >= pi)},${cw},${this._x1 = x2 + r * Math.cos(a1)},${this._y1 = y2 + r * Math.sin(a1)}`;
    }
  }
  rect(x2, y2, w, h) {
    this._append`M${this._x0 = this._x1 = +x2},${this._y0 = this._y1 = +y2}h${w = +w}v${+h}h${-w}Z`;
  }
  toString() {
    return this._;
  }
};
function path() {
  return new Path();
}
path.prototype = Path.prototype;

// node_modules/d3-shape/src/path.js
function withPath(shape) {
  let digits = 3;
  shape.digits = function(_) {
    if (!arguments.length) return digits;
    if (_ == null) {
      digits = null;
    } else {
      const d = Math.floor(_);
      if (!(d >= 0)) throw new RangeError(`invalid digits: ${_}`);
      digits = d;
    }
    return shape;
  };
  return () => new Path(digits);
}

// node_modules/d3-shape/src/array.js
var slice = Array.prototype.slice;
function array_default(x2) {
  return typeof x2 === "object" && "length" in x2 ? x2 : Array.from(x2);
}

// node_modules/d3-shape/src/curve/linear.js
function Linear(context) {
  this._context = context;
}
Linear.prototype = {
  areaStart: function() {
    this._line = 0;
  },
  areaEnd: function() {
    this._line = NaN;
  },
  lineStart: function() {
    this._point = 0;
  },
  lineEnd: function() {
    if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
    this._line = 1 - this._line;
  },
  point: function(x2, y2) {
    x2 = +x2, y2 = +y2;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
        break;
      case 1:
        this._point = 2;
      // falls through
      default:
        this._context.lineTo(x2, y2);
        break;
    }
  }
};
function linear_default(context) {
  return new Linear(context);
}

// node_modules/d3-shape/src/point.js
function x(p) {
  return p[0];
}
function y(p) {
  return p[1];
}

// node_modules/d3-shape/src/line.js
function line_default(x2, y2) {
  var defined = constant_default2(true), context = null, curve = linear_default, output = null, path2 = withPath(line);
  x2 = typeof x2 === "function" ? x2 : x2 === void 0 ? x : constant_default2(x2);
  y2 = typeof y2 === "function" ? y2 : y2 === void 0 ? y : constant_default2(y2);
  function line(data) {
    var i, n = (data = array_default(data)).length, d, defined0 = false, buffer;
    if (context == null) output = curve(buffer = path2());
    for (i = 0; i <= n; ++i) {
      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
        if (defined0 = !defined0) output.lineStart();
        else output.lineEnd();
      }
      if (defined0) output.point(+x2(d, i, data), +y2(d, i, data));
    }
    if (buffer) return output = null, buffer + "" || null;
  }
  line.x = function(_) {
    return arguments.length ? (x2 = typeof _ === "function" ? _ : constant_default2(+_), line) : x2;
  };
  line.y = function(_) {
    return arguments.length ? (y2 = typeof _ === "function" ? _ : constant_default2(+_), line) : y2;
  };
  line.defined = function(_) {
    return arguments.length ? (defined = typeof _ === "function" ? _ : constant_default2(!!_), line) : defined;
  };
  line.curve = function(_) {
    return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
  };
  line.context = function(_) {
    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
  };
  return line;
}

// node_modules/d3-shape/src/area.js
function area_default(x0, y0, y1) {
  var x1 = null, defined = constant_default2(true), context = null, curve = linear_default, output = null, path2 = withPath(area);
  x0 = typeof x0 === "function" ? x0 : x0 === void 0 ? x : constant_default2(+x0);
  y0 = typeof y0 === "function" ? y0 : y0 === void 0 ? constant_default2(0) : constant_default2(+y0);
  y1 = typeof y1 === "function" ? y1 : y1 === void 0 ? y : constant_default2(+y1);
  function area(data) {
    var i, j, k, n = (data = array_default(data)).length, d, defined0 = false, buffer, x0z = new Array(n), y0z = new Array(n);
    if (context == null) output = curve(buffer = path2());
    for (i = 0; i <= n; ++i) {
      if (!(i < n && defined(d = data[i], i, data)) === defined0) {
        if (defined0 = !defined0) {
          j = i;
          output.areaStart();
          output.lineStart();
        } else {
          output.lineEnd();
          output.lineStart();
          for (k = i - 1; k >= j; --k) {
            output.point(x0z[k], y0z[k]);
          }
          output.lineEnd();
          output.areaEnd();
        }
      }
      if (defined0) {
        x0z[i] = +x0(d, i, data), y0z[i] = +y0(d, i, data);
        output.point(x1 ? +x1(d, i, data) : x0z[i], y1 ? +y1(d, i, data) : y0z[i]);
      }
    }
    if (buffer) return output = null, buffer + "" || null;
  }
  function arealine() {
    return line_default().defined(defined).curve(curve).context(context);
  }
  area.x = function(_) {
    return arguments.length ? (x0 = typeof _ === "function" ? _ : constant_default2(+_), x1 = null, area) : x0;
  };
  area.x0 = function(_) {
    return arguments.length ? (x0 = typeof _ === "function" ? _ : constant_default2(+_), area) : x0;
  };
  area.x1 = function(_) {
    return arguments.length ? (x1 = _ == null ? null : typeof _ === "function" ? _ : constant_default2(+_), area) : x1;
  };
  area.y = function(_) {
    return arguments.length ? (y0 = typeof _ === "function" ? _ : constant_default2(+_), y1 = null, area) : y0;
  };
  area.y0 = function(_) {
    return arguments.length ? (y0 = typeof _ === "function" ? _ : constant_default2(+_), area) : y0;
  };
  area.y1 = function(_) {
    return arguments.length ? (y1 = _ == null ? null : typeof _ === "function" ? _ : constant_default2(+_), area) : y1;
  };
  area.lineX0 = area.lineY0 = function() {
    return arealine().x(x0).y(y0);
  };
  area.lineY1 = function() {
    return arealine().x(x0).y(y1);
  };
  area.lineX1 = function() {
    return arealine().x(x1).y(y0);
  };
  area.defined = function(_) {
    return arguments.length ? (defined = typeof _ === "function" ? _ : constant_default2(!!_), area) : defined;
  };
  area.curve = function(_) {
    return arguments.length ? (curve = _, context != null && (output = curve(context)), area) : curve;
  };
  area.context = function(_) {
    return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), area) : context;
  };
  return area;
}

// node_modules/d3-selection/src/namespaces.js
var xhtml = "http://www.w3.org/1999/xhtml";
var namespaces_default = {
  svg: "http://www.w3.org/2000/svg",
  xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

// node_modules/d3-selection/src/namespace.js
function namespace_default(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces_default.hasOwnProperty(prefix) ? { space: namespaces_default[prefix], local: name } : name;
}

// node_modules/d3-selection/src/creator.js
function creatorInherit(name) {
  return function() {
    var document2 = this.ownerDocument, uri = this.namespaceURI;
    return uri === xhtml && document2.documentElement.namespaceURI === xhtml ? document2.createElement(name) : document2.createElementNS(uri, name);
  };
}
function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}
function creator_default(name) {
  var fullname = namespace_default(name);
  return (fullname.local ? creatorFixed : creatorInherit)(fullname);
}

// node_modules/d3-selection/src/selector.js
function none() {
}
function selector_default(selector) {
  return selector == null ? none : function() {
    return this.querySelector(selector);
  };
}

// node_modules/d3-selection/src/selection/select.js
function select_default(select) {
  if (typeof select !== "function") select = selector_default(select);
  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }
  return new Selection(subgroups, this._parents);
}

// node_modules/d3-selection/src/array.js
function array(x2) {
  return x2 == null ? [] : Array.isArray(x2) ? x2 : Array.from(x2);
}

// node_modules/d3-selection/src/selectorAll.js
function empty() {
  return [];
}
function selectorAll_default(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
}

// node_modules/d3-selection/src/selection/selectAll.js
function arrayAll(select) {
  return function() {
    return array(select.apply(this, arguments));
  };
}
function selectAll_default(select) {
  if (typeof select === "function") select = arrayAll(select);
  else select = selectorAll_default(select);
  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }
  return new Selection(subgroups, parents);
}

// node_modules/d3-selection/src/matcher.js
function matcher_default(selector) {
  return function() {
    return this.matches(selector);
  };
}
function childMatcher(selector) {
  return function(node) {
    return node.matches(selector);
  };
}

// node_modules/d3-selection/src/selection/selectChild.js
var find = Array.prototype.find;
function childFind(match) {
  return function() {
    return find.call(this.children, match);
  };
}
function childFirst() {
  return this.firstElementChild;
}
function selectChild_default(match) {
  return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
}

// node_modules/d3-selection/src/selection/selectChildren.js
var filter = Array.prototype.filter;
function children() {
  return Array.from(this.children);
}
function childrenFilter(match) {
  return function() {
    return filter.call(this.children, match);
  };
}
function selectChildren_default(match) {
  return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
}

// node_modules/d3-selection/src/selection/filter.js
function filter_default(match) {
  if (typeof match !== "function") match = matcher_default(match);
  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }
  return new Selection(subgroups, this._parents);
}

// node_modules/d3-selection/src/selection/sparse.js
function sparse_default(update) {
  return new Array(update.length);
}

// node_modules/d3-selection/src/selection/enter.js
function enter_default() {
  return new Selection(this._enter || this._groups.map(sparse_default), this._parents);
}
function EnterNode(parent, datum2) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum2;
}
EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) {
    return this._parent.insertBefore(child, this._next);
  },
  insertBefore: function(child, next) {
    return this._parent.insertBefore(child, next);
  },
  querySelector: function(selector) {
    return this._parent.querySelector(selector);
  },
  querySelectorAll: function(selector) {
    return this._parent.querySelectorAll(selector);
  }
};

// node_modules/d3-selection/src/constant.js
function constant_default3(x2) {
  return function() {
    return x2;
  };
}

// node_modules/d3-selection/src/selection/data.js
function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0, node, groupLength = group.length, dataLength = data.length;
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}
function bindKey(parent, group, enter, update, exit, data, key) {
  var i, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data.length, keyValues = new Array(groupLength), keyValue;
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
      if (nodeByKeyValue.has(keyValue)) {
        exit[i] = node;
      } else {
        nodeByKeyValue.set(keyValue, node);
      }
    }
  }
  for (i = 0; i < dataLength; ++i) {
    keyValue = key.call(parent, data[i], i, data) + "";
    if (node = nodeByKeyValue.get(keyValue)) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue.delete(keyValue);
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) {
      exit[i] = node;
    }
  }
}
function datum(node) {
  return node.__data__;
}
function data_default(value, key) {
  if (!arguments.length) return Array.from(this, datum);
  var bind = key ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
  if (typeof value !== "function") value = constant_default3(value);
  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j], group = groups[j], groupLength = group.length, data = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength), exitGroup = exit[j] = new Array(groupLength);
    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength) ;
        previous._next = next || null;
      }
    }
  }
  update = new Selection(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
}
function arraylike(data) {
  return typeof data === "object" && "length" in data ? data : Array.from(data);
}

// node_modules/d3-selection/src/selection/exit.js
function exit_default() {
  return new Selection(this._exit || this._groups.map(sparse_default), this._parents);
}

// node_modules/d3-selection/src/selection/join.js
function join_default(onenter, onupdate, onexit) {
  var enter = this.enter(), update = this, exit = this.exit();
  if (typeof onenter === "function") {
    enter = onenter(enter);
    if (enter) enter = enter.selection();
  } else {
    enter = enter.append(onenter + "");
  }
  if (onupdate != null) {
    update = onupdate(update);
    if (update) update = update.selection();
  }
  if (onexit == null) exit.remove();
  else onexit(exit);
  return enter && update ? enter.merge(update).order() : update;
}

// node_modules/d3-selection/src/selection/merge.js
function merge_default(context) {
  var selection2 = context.selection ? context.selection() : context;
  for (var groups0 = this._groups, groups1 = selection2._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }
  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }
  return new Selection(merges, this._parents);
}

// node_modules/d3-selection/src/selection/order.js
function order_default() {
  for (var groups = this._groups, j = -1, m = groups.length; ++j < m; ) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
      if (node = group[i]) {
        if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }
  return this;
}

// node_modules/d3-selection/src/selection/sort.js
function sort_default(compare) {
  if (!compare) compare = ascending2;
  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }
  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }
  return new Selection(sortgroups, this._parents).order();
}
function ascending2(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

// node_modules/d3-selection/src/selection/call.js
function call_default() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
}

// node_modules/d3-selection/src/selection/nodes.js
function nodes_default() {
  return Array.from(this);
}

// node_modules/d3-selection/src/selection/node.js
function node_default() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }
  return null;
}

// node_modules/d3-selection/src/selection/size.js
function size_default() {
  let size = 0;
  for (const node of this) ++size;
  return size;
}

// node_modules/d3-selection/src/selection/empty.js
function empty_default() {
  return !this.node();
}

// node_modules/d3-selection/src/selection/each.js
function each_default(callback) {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }
  return this;
}

// node_modules/d3-selection/src/selection/attr.js
function attrRemove(name) {
  return function() {
    this.removeAttribute(name);
  };
}
function attrRemoveNS(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}
function attrConstant(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}
function attrConstantNS(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}
function attrFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}
function attrFunctionNS(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}
function attr_default(name, value) {
  var fullname = namespace_default(name);
  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
  }
  return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
}

// node_modules/d3-selection/src/window.js
function window_default(node) {
  return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
}

// node_modules/d3-selection/src/selection/style.js
function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}
function styleConstant(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}
function styleFunction(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}
function style_default(name, value, priority) {
  return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
}
function styleValue(node, name) {
  return node.style.getPropertyValue(name) || window_default(node).getComputedStyle(node, null).getPropertyValue(name);
}

// node_modules/d3-selection/src/selection/property.js
function propertyRemove(name) {
  return function() {
    delete this[name];
  };
}
function propertyConstant(name, value) {
  return function() {
    this[name] = value;
  };
}
function propertyFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}
function property_default(name, value) {
  return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
}

// node_modules/d3-selection/src/selection/classed.js
function classArray(string) {
  return string.trim().split(/^|\s+/);
}
function classList(node) {
  return node.classList || new ClassList(node);
}
function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}
ClassList.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};
function classedAdd(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}
function classedRemove(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}
function classedTrue(names) {
  return function() {
    classedAdd(this, names);
  };
}
function classedFalse(names) {
  return function() {
    classedRemove(this, names);
  };
}
function classedFunction(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}
function classed_default(name, value) {
  var names = classArray(name + "");
  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }
  return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
}

// node_modules/d3-selection/src/selection/text.js
function textRemove() {
  this.textContent = "";
}
function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}
function textFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}
function text_default(value) {
  return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
}

// node_modules/d3-selection/src/selection/html.js
function htmlRemove() {
  this.innerHTML = "";
}
function htmlConstant(value) {
  return function() {
    this.innerHTML = value;
  };
}
function htmlFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}
function html_default(value) {
  return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
}

// node_modules/d3-selection/src/selection/raise.js
function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}
function raise_default() {
  return this.each(raise);
}

// node_modules/d3-selection/src/selection/lower.js
function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function lower_default() {
  return this.each(lower);
}

// node_modules/d3-selection/src/selection/append.js
function append_default(name) {
  var create = typeof name === "function" ? name : creator_default(name);
  return this.select(function() {
    return this.appendChild(create.apply(this, arguments));
  });
}

// node_modules/d3-selection/src/selection/insert.js
function constantNull() {
  return null;
}
function insert_default(name, before) {
  var create = typeof name === "function" ? name : creator_default(name), select = before == null ? constantNull : typeof before === "function" ? before : selector_default(before);
  return this.select(function() {
    return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
  });
}

// node_modules/d3-selection/src/selection/remove.js
function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}
function remove_default() {
  return this.each(remove);
}

// node_modules/d3-selection/src/selection/clone.js
function selection_cloneShallow() {
  var clone = this.cloneNode(false), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}
function selection_cloneDeep() {
  var clone = this.cloneNode(true), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}
function clone_default(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
}

// node_modules/d3-selection/src/selection/datum.js
function datum_default(value) {
  return arguments.length ? this.property("__data__", value) : this.node().__data__;
}

// node_modules/d3-selection/src/selection/on.js
function contextListener(listener) {
  return function(event) {
    listener.call(this, event, this.__data__);
  };
}
function parseTypenames(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return { type: t, name };
  });
}
function onRemove(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}
function onAdd(typename, value, options) {
  return function() {
    var on = this.__on, o, listener = contextListener(value);
    if (on) for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
        this.addEventListener(o.type, o.listener = listener, o.options = options);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, options);
    o = { type: typename.type, name: typename.name, value, listener, options };
    if (!on) this.__on = [o];
    else on.push(o);
  };
}
function on_default(typename, value, options) {
  var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;
  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }
  on = value ? onAdd : onRemove;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
  return this;
}

// node_modules/d3-selection/src/selection/dispatch.js
function dispatchEvent(node, type, params) {
  var window = window_default(node), event = window.CustomEvent;
  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window.document.createEvent("Event");
    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type, false, false);
  }
  node.dispatchEvent(event);
}
function dispatchConstant(type, params) {
  return function() {
    return dispatchEvent(this, type, params);
  };
}
function dispatchFunction(type, params) {
  return function() {
    return dispatchEvent(this, type, params.apply(this, arguments));
  };
}
function dispatch_default(type, params) {
  return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
}

// node_modules/d3-selection/src/selection/iterator.js
function* iterator_default() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) yield node;
    }
  }
}

// node_modules/d3-selection/src/selection/index.js
var root = [null];
function Selection(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}
function selection() {
  return new Selection([[document.documentElement]], root);
}
function selection_selection() {
  return this;
}
Selection.prototype = selection.prototype = {
  constructor: Selection,
  select: select_default,
  selectAll: selectAll_default,
  selectChild: selectChild_default,
  selectChildren: selectChildren_default,
  filter: filter_default,
  data: data_default,
  enter: enter_default,
  exit: exit_default,
  join: join_default,
  merge: merge_default,
  selection: selection_selection,
  order: order_default,
  sort: sort_default,
  call: call_default,
  nodes: nodes_default,
  node: node_default,
  size: size_default,
  empty: empty_default,
  each: each_default,
  attr: attr_default,
  style: style_default,
  property: property_default,
  classed: classed_default,
  text: text_default,
  html: html_default,
  raise: raise_default,
  lower: lower_default,
  append: append_default,
  insert: insert_default,
  remove: remove_default,
  clone: clone_default,
  datum: datum_default,
  on: on_default,
  dispatch: dispatch_default,
  [Symbol.iterator]: iterator_default
};

// node_modules/d3-selection/src/select.js
function select_default2(selector) {
  return typeof selector === "string" ? new Selection([[document.querySelector(selector)]], [document.documentElement]) : new Selection([[selector]], root);
}

// src/StatsView.ts
var STATS_VIEW_TYPE = "spaced-everything-stats";
var CHART_PERIODS = ["1W", "2W", "1M", "6M", "1Y", "All"];
var PERIOD_DAYS = {
  "1W": 7,
  "2W": 14,
  "1M": 30,
  "6M": 180,
  "1Y": 365,
  All: Infinity
};
var PERIOD_LABELS = {
  "1W": "Week",
  "2W": "14 days",
  "1M": "Month",
  "6M": "Half year",
  "1Y": "Year",
  All: "All time"
};
function makeTimeFormat(period) {
  const dayFmt = timeFormat("%d");
  if (period === "1W" || period === "2W" || period === "1M") return (d) => String(parseInt(dayFmt(d)));
  if (period === "6M") return timeFormat("%b");
  if (period === "1Y") {
    const yearFmt = timeFormat("'%y");
    const monthFmt = timeFormat("%b");
    return (d) => d.getMonth() === 0 ? yearFmt(d) : monthFmt(d);
  }
  return timeFormat("'%y");
}
var StatsView = class extends import_obsidian9.ItemView {
  // ── Obsidian view API ─────────────────────────────────────────────────────
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.reviewChartPeriod = "1M";
    this.dueChartPeriod = "1M";
    this.forecastChartPeriod = "1M";
    this.selectedChart = "month";
    this.resizeObserver = null;
    this.resizeDebounce = null;
    const now = /* @__PURE__ */ new Date();
    this.calendarYear = now.getFullYear();
    this.calendarMonth = now.getMonth();
    this.heatmapYear = now.getFullYear();
  }
  getViewType() {
    return STATS_VIEW_TYPE;
  }
  getDisplayText() {
    return "Spaced Everything \u2014 Stats";
  }
  getIcon() {
    return "bar-chart-2";
  }
  getState() {
    return {
      selectedChart: this.selectedChart,
      calendarYear: this.calendarYear,
      calendarMonth: this.calendarMonth,
      heatmapYear: this.heatmapYear,
      reviewChartPeriod: this.reviewChartPeriod,
      dueChartPeriod: this.dueChartPeriod,
      forecastChartPeriod: this.forecastChartPeriod
    };
  }
  async setState(state, result) {
    if (state.selectedChart !== void 0) this.selectedChart = state.selectedChart;
    if (state.calendarYear !== void 0) this.calendarYear = state.calendarYear;
    if (state.calendarMonth !== void 0) this.calendarMonth = state.calendarMonth;
    if (state.heatmapYear !== void 0) this.heatmapYear = state.heatmapYear;
    if (state.reviewChartPeriod !== void 0)
      this.reviewChartPeriod = state.reviewChartPeriod;
    if (state.dueChartPeriod !== void 0) this.dueChartPeriod = state.dueChartPeriod;
    if (state.forecastChartPeriod !== void 0)
      this.forecastChartPeriod = state.forecastChartPeriod;
    await super.setState(state, result);
  }
  async onOpen() {
    await this.render();
    requestAnimationFrame(() => {
      this.render().catch(console.error);
    });
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeDebounce) clearTimeout(this.resizeDebounce);
      this.resizeDebounce = setTimeout(() => {
        this.render().catch(console.error);
      }, 100);
    });
    this.resizeObserver.observe(this.containerEl);
  }
  // ── Render & section dispatchers ──────────────────────────────────────────
  async render() {
    var _a, _b;
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("spaced-stats-view");
    const history = this.plugin.data.reviewHistory;
    const todayStr = today();
    const activeNotes = getNotesFromVault(this.plugin).filter((n) => n.interval >= 0);
    const dueNotes = activeNotes.filter((n) => noteIsDue(n));
    const todayEvents = history.filter((e) => e.timestamp.startsWith(todayStr));
    const avgInterval = activeNotes.length > 0 ? Math.round(activeNotes.reduce((sum, n) => sum + n.interval, 0) / activeNotes.length) : 0;
    const headerEl = contentEl.createDiv({ cls: "spaced-header-stats" });
    this.addStat(headerEl, "Today", String(todayEvents.length));
    this.addStat(headerEl, "Due", String(dueNotes.length));
    this.addStat(headerEl, "Active", String(activeNotes.length));
    this.addStat(headerEl, "Reviews", String(history.length));
    this.addStat(headerEl, "Avg interval", `${avgInterval}d`);
    const selectorRow = contentEl.createDiv({ cls: "spaced-chart-selector-row" });
    const chartOptions = [
      { value: "month", label: "Month calendar" },
      { value: "year", label: "Year heatmap" },
      { value: "forecast", label: "Upcoming load" },
      { value: "reviews", label: "Daily reviews" },
      { value: "due", label: "Due notes" }
    ];
    const currentLabel = (_b = (_a = chartOptions.find((o) => o.value === this.selectedChart)) == null ? void 0 : _a.label) != null ? _b : this.selectedChart;
    const chartTriggerWrapper = selectorRow.createDiv({ cls: "spaced-period-wrapper" });
    const chartTriggerBtn = chartTriggerWrapper.createDiv({ cls: "se-graph-sel" });
    chartTriggerBtn.createSpan({ text: currentLabel });
    chartTriggerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = new import_obsidian9.Menu();
      for (const opt of chartOptions) {
        menu.addItem((item) => {
          item.setTitle(opt.label);
          item.setChecked(opt.value === this.selectedChart);
          item.onClick(() => {
            this.selectedChart = opt.value;
            this.render();
          });
        });
      }
      menu.showAtMouseEvent(e);
    });
    const chartArea = contentEl.createDiv({ cls: "spaced-chart-area" });
    switch (this.selectedChart) {
      case "month":
        this.renderMonthSection(chartArea, history, activeNotes, todayStr);
        break;
      case "year":
        this.renderYearSection(chartArea, history, todayStr);
        break;
      case "forecast":
        this.renderForecastSection(chartArea, activeNotes, todayStr);
        break;
      case "reviews":
        this.renderReviewsSection(chartArea, history);
        break;
      case "due":
        this.renderDueSection(chartArea);
        break;
    }
  }
  renderMonthSection(chartArea, history, activeNotes, todayStr) {
    var _a;
    const practicedCounts = this.buildPracticedCounts(history);
    const upcomingDue = /* @__PURE__ */ new Map();
    for (const note of activeNotes) {
      const dueDate = new Date(note.lastReviewedOn);
      dueDate.setDate(dueDate.getDate() + note.interval);
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      if (dueDateStr > todayStr) upcomingDue.set(dueDateStr, ((_a = upcomingDue.get(dueDateStr)) != null ? _a : 0) + 1);
    }
    const todayYear = parseInt(todayStr.slice(0, 4));
    const todayMonth = parseInt(todayStr.slice(5, 7)) - 1;
    const isThisMonth = this.calendarYear === todayYear && this.calendarMonth === todayMonth;
    const monthName = new Date(this.calendarYear, this.calendarMonth, 1).toLocaleString("default", { month: "long" });
    const label = isThisMonth ? "This month" : `${monthName}, ${this.calendarYear}`;
    this.createNavRow(
      chartArea,
      label,
      () => {
        this.calendarMonth--;
        if (this.calendarMonth < 0) {
          this.calendarMonth = 11;
          this.calendarYear--;
        }
        this.render();
      },
      () => {
        this.calendarMonth++;
        if (this.calendarMonth > 11) {
          this.calendarMonth = 0;
          this.calendarYear++;
        }
        this.render();
      }
    );
    this.renderMonthCalendar(chartArea, this.calendarYear, this.calendarMonth, practicedCounts, todayStr, upcomingDue);
  }
  renderYearSection(chartArea, history, todayStr) {
    const yearEvents = history.filter((e) => e.timestamp.startsWith(String(this.heatmapYear)));
    const practicedInYear = this.buildPracticedCounts(yearEvents);
    this.createNavRow(
      chartArea,
      String(this.heatmapYear),
      () => {
        this.heatmapYear--;
        this.render();
      },
      () => {
        this.heatmapYear++;
        this.render();
      }
    );
    this.renderYearHeatmap(chartArea, this.heatmapYear, practicedInYear, todayStr);
  }
  renderForecastSection(chartArea, activeNotes, todayStr) {
    const forecastDays = Math.min(PERIOD_DAYS[this.forecastChartPeriod], 730);
    const forecastData = this.buildForecastData(activeNotes, todayStr, forecastDays);
    this.renderForecastChart(chartArea, forecastData, this.forecastChartPeriod, (p) => {
      this.forecastChartPeriod = p;
      this.render();
    });
  }
  renderReviewsSection(chartArea, history) {
    const dailyData = this.buildDailyReviewData(history);
    if (dailyData.length === 0) {
      chartArea.createEl("p", { text: "No review history yet.", cls: "spaced-muted" });
    } else {
      this.renderBarTrendChart(chartArea, dailyData, this.reviewChartPeriod, (p) => {
        this.reviewChartPeriod = p;
        this.render();
      });
    }
  }
  renderDueSection(chartArea) {
    const log = this.plugin.data.reviewLoadLog;
    if (log.length === 0) {
      chartArea.createEl("p", {
        text: "No sync history yet. Run 'Sync vault' to start logging.",
        cls: "spaced-muted"
      });
    } else {
      this.renderBarTrendChart(
        chartArea,
        this.buildDailyData(log, (e) => e.numDue, true),
        this.dueChartPeriod,
        (p) => {
          this.dueChartPeriod = p;
          this.render();
        }
      );
    }
  }
  // ── Shared chart infrastructure ───────────────────────────────────────────
  // Used by multiple charts: scaffold, helpers, shared primitives
  buildChartScaffold(container, data, selEl) {
    const labelH = 24;
    const selH = selEl.offsetHeight + 6;
    const chartH = Math.max((container.clientHeight || 200) - labelH - selH - 10, 100);
    const totalH = chartH + labelH + 20;
    const yAxisW = 34;
    const totalW = Math.max((container.clientWidth || 300) - yAxisW - 8, 60);
    const dataMax = Math.max(...data.map((d) => d.value), 1);
    const topPad = 14;
    const yScale = linear2().domain([0, dataMax]).range([chartH, topPad]).nice(6);
    const yTicks = yScale.ticks(6);
    const wrapEl = container.createDiv({ cls: "spaced-chart-wrap" });
    const yAxisSvg = select_default2(wrapEl).append("svg").attr("width", yAxisW).attr("height", totalH).attr("class", "spaced-y-axis-svg");
    yAxisSvg.selectAll("line.y-tick").data(yTicks).join("line").attr("class", "y-tick").attr("x1", yAxisW - 4).attr("y1", (d) => Math.round(yScale(d))).attr("x2", yAxisW).attr("y2", (d) => Math.round(yScale(d))).attr("stroke", "var(--background-modifier-border)").attr("stroke-width", 1);
    yAxisSvg.selectAll("text.y-label").data(yTicks).join("text").attr("class", "y-label").attr("x", yAxisW - 6).attr("y", (d) => Math.round(yScale(d)) + 3).attr("text-anchor", "end").attr("font-size", 16).attr("fill", "var(--text-muted)").text((d) => String(d));
    yAxisSvg.append("line").attr("x1", yAxisW).attr("y1", 0).attr("x2", yAxisW).attr("y2", chartH).attr("stroke", "var(--background-modifier-border)").attr("stroke-width", 1);
    const chartSvg = select_default2(wrapEl).append("svg").attr("width", totalW).attr("height", totalH).attr("class", "spaced-chart-svg");
    chartSvg.selectAll("line.grid-h").data(yTicks).join("line").attr("class", "grid-h").attr("x1", 0).attr("y1", (d) => Math.round(yScale(d))).attr("x2", totalW).attr("y2", (d) => Math.round(yScale(d))).attr("stroke", "var(--background-modifier-border)").attr("stroke-width", 1).attr("opacity", 0.4);
    chartSvg.append("line").attr("x1", 0).attr("y1", chartH).attr("x2", totalW).attr("y2", chartH).attr("stroke", "var(--background-modifier-border)").attr("stroke-width", 1);
    return { svg: chartSvg.node(), chartH, totalH, totalW, yScale };
  }
  renderLineContent(svg, data, period, chartH, totalH, totalW, yScale) {
    var _a, _b;
    const dates = data.map((d) => new Date(d.date));
    const xScale = time().domain([dates[0], dates[dates.length - 1]]).range([0, totalW]);
    const tickInterval = period === "1W" ? timeDay.every(1) : period === "2W" ? timeDay.every(2) : period === "1M" ? timeDay.every(10) : period === "6M" ? timeMonth.every(1) : period === "1Y" ? timeMonth.every(1) : timeYear.every(1);
    const xTicks = xScale.ticks(tickInterval);
    const fmt = makeTimeFormat(period);
    const rawData = dates.map((date2, i) => ({ date: date2, value: data[i].value }));
    const areaGen = area_default().x((d) => xScale(d.date)).y0(chartH).y1((d) => yScale(d.value));
    const lineGen = line_default().x((d) => xScale(d.date)).y((d) => yScale(d.value));
    const svgSel = select_default2(svg);
    svgSel.selectAll("line.grid-v").data(xTicks).join("line").attr("class", "grid-v").attr("x1", (d) => Math.round(xScale(d))).attr("y1", 0).attr("x2", (d) => Math.round(xScale(d))).attr("y2", chartH + 10).attr("stroke", "var(--color-base-40)").attr("stroke-width", 0.5);
    svgSel.append("path").attr("d", (_a = areaGen(rawData)) != null ? _a : "").attr("fill", "var(--interactive-accent)").attr("opacity", 0.15).attr("stroke", "none");
    svgSel.append("path").attr("d", (_b = lineGen(rawData)) != null ? _b : "").attr("fill", "none").attr("stroke", "var(--interactive-accent)").attr("stroke-width", 1.5).attr("stroke-linecap", "round").attr("stroke-linejoin", "round");
    svgSel.selectAll("text.x-label").data(xTicks).join("text").attr("class", "x-label").attr("x", (d) => Math.round(xScale(d))).attr("y", totalH - 2).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", "var(--text-muted)").text((d) => fmt(d));
  }
  renderBarContent(svg, data, period, chartH, totalH, totalW, yScale, todayStr) {
    var _a, _b;
    const xScale = band().domain(data.map((d) => d.date)).range([0, totalW]).padding(0.35);
    const barW = xScale.bandwidth();
    const fmt = makeTimeFormat(period);
    const labelDates = data.filter((d, i) => {
      if (period === "1W") return true;
      if (period === "2W") return i % 2 === 0;
      if (period === "1M") {
        const day = parseInt(d.date.slice(8, 10));
        return day === 1 || day === 10 || day === 20;
      }
      return false;
    });
    const rolling = this.rollingAverage(data);
    const rawData = data.map((d, i) => ({ date: d.date, value: rolling[i] }));
    const lineGen = line_default().x((d) => {
      var _a2;
      return ((_a2 = xScale(d.date)) != null ? _a2 : 0) + barW / 2;
    }).y((d) => yScale(d.value));
    const svgSel = select_default2(svg);
    svgSel.selectAll("line.grid-v").data(labelDates).join("line").attr("class", "grid-v").attr("x1", (d) => {
      var _a2;
      return ((_a2 = xScale(d.date)) != null ? _a2 : 0) + barW / 2;
    }).attr("y1", 0).attr("x2", (d) => {
      var _a2;
      return ((_a2 = xScale(d.date)) != null ? _a2 : 0) + barW / 2;
    }).attr("y2", chartH + 10).attr("stroke", "var(--color-base-40)").attr("stroke-width", 0.5);
    svgSel.append("path").attr("d", (_a = lineGen(rawData)) != null ? _a : "").attr("fill", "none").attr("stroke", "var(--interactive-accent)").attr("stroke-width", 3).attr("stroke-linecap", "round").attr("stroke-linejoin", "round").attr("opacity", 0.8);
    svgSel.selectAll("rect.bar").data(data).join("rect").attr("class", "bar").attr("x", (d) => {
      var _a2;
      return (_a2 = xScale(d.date)) != null ? _a2 : 0;
    }).attr("y", (d) => yScale(d.value)).attr("width", barW).attr("height", (d) => Math.max(Math.round(yScale(0) - yScale(d.value)), d.value > 0 ? 2 : 0)).attr("rx", 2).attr("fill", "var(--color-green)").attr("opacity", 1);
    if (period === "1W" || period === "2W") {
      svgSel.selectAll("text.bar-label").data(data.filter((d) => d.value > 0)).join("text").attr("class", "bar-label").attr("x", (d) => {
        var _a2;
        return ((_a2 = xScale(d.date)) != null ? _a2 : 0) + barW / 2;
      }).attr("y", (d) => Math.max(yScale(d.value) - 6, 10)).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", "bold").attr("fill", "var(--color-green)").text((d) => String(d.value));
    }
    svgSel.selectAll("text.x-label").data(labelDates).join("text").attr("class", "x-label").attr("x", (d) => {
      var _a2;
      return ((_a2 = xScale(d.date)) != null ? _a2 : 0) + barW / 2;
    }).attr("y", totalH - 18).attr("text-anchor", "middle").attr("font-size", 16).attr("fill", "var(--text-muted)").text((d) => fmt(new Date(d.date)));
    if (todayStr && labelDates.some((d) => d.date === todayStr)) {
      const tx = ((_b = xScale(todayStr)) != null ? _b : 0) + barW / 2;
      svgSel.insert("circle", "text.x-label").attr("cx", tx).attr("cy", totalH - 24).attr("r", 10).attr("fill", "var(--text-muted)");
      svgSel.selectAll("text.x-label").filter((d) => d.date === todayStr).attr("fill", "var(--background-primary)").attr("font-size", "16px");
    }
  }
  createNavRow(container, label, onPrev, onNext) {
    const nav = container.createDiv({ cls: "spaced-nav-row" });
    nav.createSpan({ text: label });
    const btns = nav.createDiv({ cls: "spaced-nav-btns" });
    const prevBtn = btns.createEl("button", { cls: "spaced-nav-btn" });
    (0, import_obsidian9.setIcon)(prevBtn, "chevron-left");
    prevBtn.addEventListener("click", onPrev);
    const nextBtn = btns.createEl("button", { cls: "spaced-nav-btn" });
    (0, import_obsidian9.setIcon)(nextBtn, "chevron-right");
    nextBtn.addEventListener("click", onNext);
  }
  addStat(container, label, value) {
    const row = container.createDiv({ cls: "spaced-stat-row" });
    row.createSpan({ text: label, cls: "spaced-stat-label" });
    row.createSpan({ text: value, cls: "spaced-stat-value" });
  }
  rollingAverage(data, window = 7) {
    return data.map((_, i) => {
      const slice2 = data.slice(Math.max(0, i - (window - 1)), i + 1);
      return slice2.reduce((s, d) => s + d.value, 0) / slice2.length;
    });
  }
  // ── Data builders ─────────────────────────────────────────────────────────
  buildPracticedCounts(events) {
    var _a;
    const counts = /* @__PURE__ */ new Map();
    for (const e of events) {
      const d = e.timestamp.slice(0, 10);
      counts.set(d, ((_a = counts.get(d)) != null ? _a : 0) + 1);
    }
    return counts;
  }
  buildDailyReviewData(history) {
    return this.buildDailyData(history, () => 1);
  }
  buildForecastData(activeNotes, todayStr, days = 730) {
    var _a, _b;
    const dueByDate = /* @__PURE__ */ new Map();
    for (const note of activeNotes) {
      const dueDate = new Date(note.lastReviewedOn);
      dueDate.setDate(dueDate.getDate() + note.interval);
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      const effectiveDate = dueDateStr < todayStr ? todayStr : dueDateStr;
      dueByDate.set(effectiveDate, ((_a = dueByDate.get(effectiveDate)) != null ? _a : 0) + 1);
    }
    const result = [];
    const start = new Date(todayStr);
    for (let i = 0; i < days; i++) {
      const cur = new Date(start);
      cur.setDate(cur.getDate() + i);
      const d = cur.toISOString().slice(0, 10);
      result.push({ date: d, value: (_b = dueByDate.get(d)) != null ? _b : 0 });
    }
    return result;
  }
  buildDailyData(entries, getValue, overwrite = false) {
    var _a, _b;
    const byDay = /* @__PURE__ */ new Map();
    for (const e of entries) {
      const d = e.timestamp.slice(0, 10);
      if (overwrite) {
        byDay.set(d, getValue(e));
      } else {
        byDay.set(d, ((_a = byDay.get(d)) != null ? _a : 0) + getValue(e));
      }
    }
    if (byDay.size === 0) return [];
    const todayStr = today();
    const start = [...byDay.keys()].sort()[0];
    const result = [];
    const cur = new Date(start);
    const end = new Date(todayStr);
    while (cur <= end) {
      const d = cur.toISOString().slice(0, 10);
      result.push({ date: d, value: (_b = byDay.get(d)) != null ? _b : 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }
  // ── Chart: Line trend (Reviews & Due) ─────────────────────────────────────
  renderBarTrendChart(container, allData, period, onPeriodChange) {
    var _a;
    const selEl = this.createPeriodSelect(container, period, onPeriodChange);
    const days = PERIOD_DAYS[period];
    let data;
    if (days === Infinity) {
      data = allData;
    } else {
      const byDate = new Map(allData.map((d) => [d.date, d.value]));
      data = [];
      const end = new Date(today());
      const start = new Date(end);
      start.setDate(start.getDate() - days + 1);
      const cur = new Date(start);
      while (cur <= end) {
        const d = cur.toISOString().slice(0, 10);
        data.push({ date: d, value: (_a = byDate.get(d)) != null ? _a : 0 });
        cur.setDate(cur.getDate() + 1);
      }
    }
    if (data.length < 2) {
      container.createEl("p", { text: "Not enough data for this period.", cls: "spaced-muted" });
      return;
    }
    const showBars = period === "1W" || period === "2W" || period === "1M";
    const { svg, chartH, totalH, totalW, yScale } = this.buildChartScaffold(container, data, selEl);
    if (showBars) {
      this.renderBarContent(svg, data, period, chartH, totalH, totalW, yScale);
    } else {
      this.renderLineContent(svg, data, period, chartH, totalH, totalW, yScale);
    }
  }
  // ── Chart: Forecast ───────────────────────────────────────────────────────
  renderForecastChart(container, allData, period, onPeriodChange) {
    const showBars = period === "1W" || period === "2W" || period === "1M";
    const selEl = this.createPeriodSelect(container, period, onPeriodChange);
    const days = PERIOD_DAYS[period];
    const data = days === Infinity ? allData : allData.slice(0, days);
    if (data.length < 1) {
      container.createEl("p", { text: "No active notes.", cls: "spaced-muted" });
      return;
    }
    const { svg, chartH, totalH, totalW, yScale } = this.buildChartScaffold(container, data, selEl);
    if (showBars) {
      this.renderBarContent(svg, data, period, chartH, totalH, totalW, yScale, today());
    } else {
      this.renderLineContent(svg, data, period, chartH, totalH, totalW, yScale);
    }
  }
  // ── Chart: Month Calendar ─────────────────────────────────────────────────
  renderMonthCalendar(container, year, month, practicedCounts, todayStr, upcomingDue) {
    var _a, _b;
    const grid = container.createDiv({ cls: "se-month-grid" });
    for (const d of ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]) {
      grid.createDiv({ text: d, cls: "se-month-header" });
    }
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) {
      grid.createDiv({ cls: "se-month-cell se-month-empty" });
    }
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const maxDue = Math.max(...Array.from(upcomingDue.values()), 1);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dueCount = (_a = upcomingDue.get(dateStr)) != null ? _a : 0;
      const isFuture = dateStr > todayStr;
      const reviewCount = (_b = practicedCounts.get(dateStr)) != null ? _b : 0;
      const cls = [
        "se-month-cell",
        reviewCount > 0 ? "se-month-practiced" : "",
        isFuture && dueCount > 0 ? "se-month-upcoming" : "",
        dateStr === todayStr ? "se-month-today" : ""
      ].filter(Boolean).join(" ");
      const cell = grid.createDiv({ cls });
      if (isFuture && dueCount > 0) {
        const pct = Math.round(10 + dueCount / maxDue * 60);
        cell.style.background = `color-mix(in srgb, var(--interactive-accent) ${pct}%, transparent)`;
      }
      cell.createSpan({ text: String(d), cls: "se-month-day-num" });
      if (reviewCount > 0) {
        cell.dataset.tooltip = `${reviewCount} review${reviewCount !== 1 ? "s" : ""}`;
      } else if (isFuture && dueCount > 0) {
        cell.dataset.tooltip = `${dueCount} due`;
      }
    }
  }
  createPeriodSelect(container, period, onPeriodChange) {
    const wrapper = container.createDiv({ cls: "spaced-period-wrapper" });
    const btn = wrapper.createDiv({ cls: "spaced-period-trigger" });
    const labelEl = btn.createSpan({ text: PERIOD_LABELS[period], cls: "spaced-deck-label" });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = new import_obsidian9.Menu();
      for (const p of CHART_PERIODS) {
        menu.addItem((item) => {
          item.setTitle(PERIOD_LABELS[p]);
          item.setChecked(p === period);
          item.onClick(() => {
            labelEl.textContent = PERIOD_LABELS[p];
            onPeriodChange(p);
          });
        });
      }
      menu.showAtMouseEvent(e);
    });
    return wrapper;
  }
  // ── Chart: Year Heatmap ───────────────────────────────────────────────────
  renderYearHeatmap(container, year, practicedDays, todayStr) {
    var _a;
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const wrapper = container.createDiv({ cls: "se-year-heatmap-v" });
    const headerRow = wrapper.createDiv({ cls: "se-heatmap-week-row" });
    headerRow.createDiv({ cls: "se-heatmap-month-col" });
    for (const h of ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]) {
      headerRow.createDiv({ text: h, cls: "se-heatmap-dow-header" });
    }
    const jan1 = new Date(year, 0, 1);
    const startOffset = (jan1.getDay() + 6) % 7;
    const start = new Date(jan1);
    start.setDate(start.getDate() - startOffset);
    const dec31 = new Date(year, 11, 31);
    const endOffset = (dec31.getDay() + 6) % 7;
    const end = new Date(dec31);
    end.setDate(end.getDate() + (6 - endOffset));
    const cur = new Date(start);
    while (cur <= end) {
      const weekRow = wrapper.createDiv({ cls: "se-heatmap-week-row" });
      let monthLabel = "";
      for (let d = 0; d < 7; d++) {
        const check = new Date(cur);
        check.setDate(check.getDate() + d);
        if (check.getDate() === 1 && check.getFullYear() === year) {
          monthLabel = MONTHS[check.getMonth()];
          break;
        }
      }
      weekRow.createDiv({ text: monthLabel, cls: "se-heatmap-month-col" });
      for (let d = 0; d < 7; d++) {
        const dateStr = cur.toISOString().slice(0, 10);
        const inYear = cur.getFullYear() === year;
        const rc = (_a = practicedDays.get(dateStr)) != null ? _a : 0;
        const cls = [
          "se-heatmap-cell",
          !inYear ? "se-heatmap-out" : rc > 0 ? "se-heatmap-practiced" : "",
          dateStr === todayStr ? "se-heatmap-today" : ""
        ].filter(Boolean).join(" ");
        const cell = weekRow.createDiv({ cls });
        if (rc > 0) cell.setAttribute("title", `${rc} review${rc !== 1 ? "s" : ""}`);
        cur.setDate(cur.getDate() + 1);
      }
    }
  }
  onClose() {
    var _a;
    (_a = this.resizeObserver) == null ? void 0 : _a.disconnect();
    this.resizeObserver = null;
    if (this.resizeDebounce) {
      clearTimeout(this.resizeDebounce);
      this.resizeDebounce = null;
    }
    return Promise.resolve();
  }
};

// src/DeckPickerModal.ts
var import_obsidian10 = require("obsidian");

// src/ActiveModal.ts
var ActiveModal = class extends BaseNoteModal {
  constructor(app, plugin, notes, deckName = "default") {
    super(app);
    this.plugin = plugin;
    this.passed = [];
    this.failed = [];
    this.progressLog = [];
    this.allNotes = [];
    this.showRestartButton = true;
    this.deckName = deckName;
    this.allNotes = [...notes];
    this.remaining = [...notes];
    this.currentRoundSize = notes.length;
  }
  onRestartClick() {
    void this.restartSession(this.allNotes);
  }
  getStatusText() {
    return `${this.remaining.length} remaining \xB7 ${this.failed.length} to retry`;
  }
  resumeSession(state) {
    this.remaining = state.remaining;
    this.failed = state.failed;
    this.progressLog = state.progressLog;
    this.currentRoundSize = state.currentRoundSize;
  }
  async onOpen() {
    if (this.remaining.length === 0) {
      this.showSummary(this.failed.length === 0);
      return;
    }
    await this.render();
    this.setupVaultListener();
  }
  async render() {
    if (this.remaining.length === 0) {
      this.showSummary(this.failed.length === 0);
      return;
    }
    const { contentEl } = this;
    contentEl.empty();
    this.note = this.remaining[0];
    await this.renderNote(contentEl);
  }
  renderButtons(container) {
    const btnRow = container.createDiv({ cls: "spaced-btn-row" });
    this.addBtn(btnRow, { label: "Not now/Pass", cls: "pass", cb: () => this.respond("pass") });
    this.addBtn(btnRow, { label: "Retry", cls: "fail", cb: () => this.respond("fail") });
    this.addBtn(btnRow, {
      icon: "shuffle",
      cls: "icon",
      tooltip: "Shuffle remaining cards",
      cb: async () => {
        this.remaining = shuffleArray(this.remaining);
        await this.render();
      }
    });
    this.addBtn(btnRow, { icon: "route", cls: "route", tooltip: "Route \u2192", cb: () => this.routeNote() });
  }
  getProgressSegments() {
    const segments = [];
    for (let i = 0; i < this.currentRoundSize; i++) {
      const result = this.progressLog[i];
      if (result === "pass") segments.push("spaced-progress-pass");
      else if (result === "fail") segments.push("spaced-progress-fail");
      else segments.push("");
    }
    return segments;
  }
  async respond(result) {
    await this.saveTitle();
    await this.saveBodyEdits();
    const note = this.remaining.shift();
    this.progressLog.push(result);
    if (result === "pass") {
      this.passed.push(note);
    } else {
      this.failed.push(note);
    }
    if (this.remaining.length === 0) {
      if (this.failed.length === 0) {
        this.showSummary(true);
      } else {
        this.showSummary(false);
      }
      return;
    }
    await this.render();
  }
  showSummary(isDone) {
    this.cleanupEditors();
    const { contentEl } = this;
    contentEl.empty();
    if (isDone) {
      void this.clearSession();
      contentEl.createEl("h3", { text: "All done!" });
    } else {
      contentEl.createEl("h3", { text: "Round complete!" });
      contentEl.createEl("p", { text: `Passed: ${this.passed.length}` });
      contentEl.createEl("p", { text: `Failed: ${this.failed.length}` });
    }
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    this.addBtn(btnRow, {
      label: isDone ? "Restart session" : "Next round",
      cls: "summary-action",
      modifier: "cta",
      cb: () => this.restartSession(isDone ? this.allNotes : this.failed)
    });
    this.addBtn(btnRow, { label: "Close", cls: "summary-close", cb: () => this.close() });
  }
  async clearSession() {
    if (this.plugin.data.cramSessions) {
      delete this.plugin.data.cramSessions[this.deckName];
    }
    await saveStore(this.plugin, this.plugin.data);
  }
  async saveSession() {
    var _a;
    this.plugin.data.cramSessions = (_a = this.plugin.data.cramSessions) != null ? _a : {};
    this.plugin.data.cramSessions[this.deckName] = {
      remaining: this.remaining.map((n) => n.filepath),
      failed: this.failed.map((n) => n.filepath),
      progressLog: [...this.progressLog],
      currentRoundSize: this.currentRoundSize
    };
    await saveStore(this.plugin, this.plugin.data);
  }
  async restartSession(sourceNotes) {
    this.remaining = getActiveNotes(this.app, sourceNotes);
    this.passed = [];
    this.failed = [];
    this.progressLog = [];
    this.currentRoundSize = this.remaining.length;
    await this.render();
  }
  onSessionClose() {
    if (this.remaining.length > 0 || this.failed.length > 0) {
      void this.saveSession();
    }
  }
};

// src/DeckPickerModal.ts
var DeckPickerModal = class extends import_obsidian10.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    var _a, _b;
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Choose a deck" });
    const deckMap = /* @__PURE__ */ new Map();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
      if (!(fm == null ? void 0 : fm.active)) continue;
      const record = readNoteRecord(this.plugin, file);
      if (!deckMap.has("default")) deckMap.set("default", []);
      deckMap.get("default").push(record);
      const namedDecks = Array.isArray(fm.decks) ? fm.decks.filter((d) => d !== "default") : [];
      for (const deck of namedDecks) {
        if (!deckMap.has(deck)) deckMap.set(deck, []);
        deckMap.get(deck).push(record);
      }
    }
    if (deckMap.size === 0) {
      contentEl.createEl("p", { text: "No active notes found." });
      return;
    }
    const lastUsed = (_b = this.plugin.data.deckLastUsed) != null ? _b : {};
    const sorted = [...deckMap.keys()].sort((a, b) => {
      var _a2, _b2;
      const ta = (_a2 = lastUsed[a]) != null ? _a2 : "";
      const tb = (_b2 = lastUsed[b]) != null ? _b2 : "";
      return tb.localeCompare(ta);
    });
    for (const deckName of sorted) {
      const notes = deckMap.get(deckName);
      const row = contentEl.createDiv({ cls: "spaced-deck-row" });
      const btn = row.createEl("button", {
        text: `${deckName === "default" ? "Default deck" : deckName} (${notes.length})`,
        cls: "mod-cta spaced-deck-pick-btn"
      });
      btn.addEventListener("click", () => {
        var _a2;
        this.plugin.data.deckLastUsed = { ...lastUsed, [deckName]: (/* @__PURE__ */ new Date()).toISOString() };
        this.close();
        const modal = new ActiveModal(this.app, this.plugin, notes, deckName);
        const saved = (_a2 = this.plugin.data.cramSessions) == null ? void 0 : _a2[deckName];
        if (saved && (saved.remaining.length > 0 || saved.failed.length > 0)) {
          const allNotes = [...notes];
          const toRecord = (fp) => allNotes.find((n) => n.filepath === fp);
          const filterRecords = (fps) => fps.map(toRecord).filter((n) => n !== void 0);
          const remaining = filterRecords(saved.remaining);
          const failed = filterRecords(saved.failed);
          if (remaining.length > 0 || failed.length > 0) {
            const missingCount = saved.remaining.length - remaining.length + saved.failed.length - failed.length;
            modal.resumeSession({
              remaining,
              failed,
              progressLog: saved.progressLog,
              currentRoundSize: saved.currentRoundSize - missingCount
            });
          }
        }
        modal.open();
      });
      if (deckName !== "default") {
        const renameBtn = row.createDiv({ cls: "spaced-hdr-btn" });
        (0, import_obsidian10.setIcon)(renameBtn, "pencil");
        renameBtn.setAttribute("aria-label", "Rename deck");
        renameBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const input = document.createElement("input");
          input.className = "spaced-deck-rename-input";
          input.value = deckName;
          btn.replaceWith(input);
          renameBtn.remove();
          input.focus();
          input.select();
          let submitted = false;
          const cancel = () => {
            input.replaceWith(btn);
            row.appendChild(renameBtn);
          };
          const confirm = async () => {
            if (submitted) return;
            submitted = true;
            const newName = input.value.trim();
            if (!newName || newName === deckName) {
              cancel();
              return;
            }
            await this.renameDeck(deckName, newName);
          };
          input.addEventListener("keydown", async (e3) => {
            if (e3.key === "Enter") {
              e3.preventDefault();
              await confirm();
            }
            if (e3.key === "Escape") {
              e3.preventDefault();
              cancel();
            }
          });
          input.addEventListener("blur", () => {
            void confirm();
          });
        });
      }
    }
  }
  async renameDeck(oldName, newName) {
    var _a, _b, _c;
    for (const file of this.app.vault.getMarkdownFiles()) {
      const decks = (_b = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter) == null ? void 0 : _b.decks;
      if (!Array.isArray(decks) || !decks.includes(oldName)) continue;
      await writeFrontmatterDecks(
        this.app,
        file.path,
        decks.map((d) => d === oldName ? newName : d)
      );
    }
    if (this.plugin.settings.renameFolderWithDeck) {
      const matchingFolders = this.app.vault.getAllFolders().filter((f) => f.name === oldName);
      if (matchingFolders.length === 1) {
        const folder = matchingFolders[0];
        const parentPath = (_c = folder.parent) == null ? void 0 : _c.path;
        const newFolderPath = parentPath && parentPath !== "/" ? `${parentPath}/${newName}` : newName;
        await this.app.vault.rename(folder, newFolderPath);
      } else if (matchingFolders.length > 1) {
        new Notice(`Deck renamed, but folder was not renamed: multiple folders named "${oldName}" exist.`);
      }
    }
    const lastUsed = this.plugin.data.deckLastUsed;
    if ((lastUsed == null ? void 0 : lastUsed[oldName]) !== void 0) {
      lastUsed[newName] = lastUsed[oldName];
      delete lastUsed[oldName];
    }
    const sessions = this.plugin.data.cramSessions;
    if ((sessions == null ? void 0 : sessions[oldName]) !== void 0) {
      sessions[newName] = sessions[oldName];
      delete sessions[oldName];
    }
    await saveStore(this.plugin, this.plugin.data);
    this.onOpen();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/FolderDeckPickerModal.ts
var import_obsidian11 = require("obsidian");
var FolderDeckPickerModal = class extends import_obsidian11.Modal {
  constructor(app, folder, plugin) {
    super(app);
    this.folder = folder;
    this.plugin = plugin;
    this.selectedDecks = /* @__PURE__ */ new Set();
    this.useFolderName = false;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: `Add "${this.folder.name}" to deck` });
    const folderRow = contentEl.createDiv({ cls: "spaced-deck-item" });
    const folderCheck = folderRow.createEl("input", { type: "checkbox" });
    folderRow.createSpan({ text: `Create deck: ${this.folder.name}...` });
    folderCheck.addEventListener("change", () => {
      this.useFolderName = folderCheck.checked;
    });
    const existingDecks = this.getExistingDecks();
    if (existingDecks.length > 0) {
      contentEl.createEl("p", { text: "Or add to existing deck:", cls: "spaced-deck-empty" });
      for (const deck of existingDecks) {
        const row = contentEl.createDiv({ cls: "spaced-deck-item" });
        const cb = row.createEl("input", { type: "checkbox" });
        row.createSpan({ text: deck });
        cb.addEventListener("change", () => {
          if (cb.checked) this.selectedDecks.add(deck);
          else this.selectedDecks.delete(deck);
        });
      }
    }
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());
    const confirmBtn = btnRow.createEl("button", { text: "Add to deck", cls: "mod-cta" });
    confirmBtn.addEventListener("click", async () => {
      var _a;
      const decksToAssign = [...this.selectedDecks];
      if (this.useFolderName) decksToAssign.push(this.folder.name);
      const folderFiles = this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith(this.folder.path + "/"));
      for (const f of folderFiles) {
        await writeFrontmatterActive(this.app, f.path, true);
        if (decksToAssign.length > 0) {
          const existingFm = (_a = this.app.metadataCache.getFileCache(f)) == null ? void 0 : _a.frontmatter;
          const existingDecks2 = Array.isArray(existingFm == null ? void 0 : existingFm.decks) ? existingFm.decks : (existingFm == null ? void 0 : existingFm.decks) ? [existingFm.decks] : [];
          const mergedDecks = [.../* @__PURE__ */ new Set([...existingDecks2, ...decksToAssign])];
          await writeFrontmatterDecks(this.app, f.path, mergedDecks);
        }
      }
      new import_obsidian11.Notice(`Added ${folderFiles.length} note${folderFiles.length !== 1 ? "s" : ""} to deck.`);
      this.close();
    });
  }
  getExistingDecks() {
    var _a;
    const deckSet = /* @__PURE__ */ new Set();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
      const decks = fm == null ? void 0 : fm.decks;
      if (Array.isArray(decks)) decks.forEach((d) => deckSet.add(d));
      else if (typeof decks === "string" && decks) deckSet.add(decks);
    }
    return [...deckSet].sort();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/SystemModal.ts
var import_obsidian12 = require("obsidian");

// src/SubtaskModal.ts
var SubtaskModal = class extends ActiveModal {
  constructor(app, plugin, notes) {
    super(app, plugin, notes, "__subtask__");
  }
  // No session persistence — this modal is ephemeral
  onSessionClose() {
  }
};

// src/SystemModal.ts
var _SystemModal = class _SystemModal extends BaseNoteModal {
  constructor(app, plugin) {
    super(app);
    this.allActionNotes = [];
    this.remaining = [];
    this.passed = [];
    this.failed = [];
    this.progressLog = [];
    this.currentRoundSize = 0;
    this.energyLevel = null;
    this.activeTimeblocks = [];
    this.activeContexts = [];
    this.showRestartButton = true;
    this.plugin = plugin;
  }
  // ── BaseNoteModal hooks ────────────────────────────────────────────────────
  async renderModal() {
    const saved = this.plugin.data.systemSession;
    if (saved) {
      await this.resumeSession(saved);
      return;
    }
    if (this.energyLevel === null) {
      this.showEnergyPicker();
      return;
    }
    if (this.remaining.length === 0 && this.failed.length === 0) {
      await this.showSummary(true);
      return;
    }
    if (this.remaining.length === 0) {
      await this.showSummary(false);
      return;
    }
    const { contentEl } = this;
    contentEl.empty();
    this.note = this.remaining[0];
    await this.renderNote(contentEl);
  }
  async renderExtraContent(contentEl) {
    var _a;
    const skipCount = (_a = this.note.skipped) != null ? _a : 0;
    if (skipCount >= 2) {
      this.renderLeechBanner(contentEl);
    }
  }
  getStatusText() {
    return `${this.remaining.length} remaining \xB7 ${this.failed.length} to retry`;
  }
  getProgressSegments() {
    const segments = [];
    for (let i = 0; i < this.currentRoundSize; i++) {
      const log = this.progressLog[i];
      if (log === "pass") segments.push("spaced-progress-pass");
      else if (log === "fail") segments.push("spaced-progress-fail");
      else if (log === "skip") segments.push("spaced-progress-skip");
      else segments.push("");
    }
    return segments;
  }
  renderButtons(container) {
    const btnRow = container.createDiv({ cls: "spaced-btn-row" });
    this.addBtn(btnRow, { label: "Pass", cls: "pass", cb: () => this.respond("pass") });
    this.addBtn(btnRow, { label: "Retry", cls: "fail", cb: () => this.respond("fail") });
    this.addBtn(btnRow, { label: "Skip", cls: "skip", tooltip: "Skip for today", cb: () => this.skipNote() });
    this.addBtn(btnRow, {
      icon: "shuffle",
      cls: "icon",
      tooltip: "Shuffle remaining",
      cb: async () => {
        this.remaining = shuffleArray(this.remaining);
        await this.renderModal();
      }
    });
    this.addBtn(btnRow, { icon: "route", cls: "route", tooltip: "Route \u2192", cb: () => this.routeNote() });
    const subtaskNotes = this.getSubtaskNotes();
    const subtaskBtn = this.addBtn(btnRow, {
      icon: "list-checks",
      cls: "subtasks",
      tooltip: subtaskNotes.length > 0 ? `Open ${subtaskNotes.length} subtask${subtaskNotes.length !== 1 ? "s" : ""}` : "No subtasks in this note",
      cb: () => {
        if (subtaskNotes.length === 0) return;
        new SubtaskModal(this.app, this.plugin, subtaskNotes).open();
      }
    });
    if (subtaskNotes.length === 0) subtaskBtn.setDisabled(true);
  }
  async skipNote() {
    await this.saveTitle();
    await this.saveBodyEdits();
    const note = this.remaining.shift();
    this.progressLog.push("skip");
    await writeFrontmatterSkip(this.app, note.filepath);
    const todayStr = today();
    const entry = this.plugin.data.systemSkippedToday;
    if (!entry || entry.date !== todayStr) {
      this.plugin.data.systemSkippedToday = { date: todayStr, filepaths: [note.filepath] };
    } else {
      entry.filepaths.push(note.filepath);
    }
    await saveStore(this.plugin, this.plugin.data);
    await this.renderModal();
  }
  applyFiltersInline() {
    var _a;
    const processed = /* @__PURE__ */ new Set([...this.passed.map((n) => n.filepath), ...this.failed.map((n) => n.filepath)]);
    const currentPath = (_a = this.note) == null ? void 0 : _a.filepath;
    this.buildFilteredRemaining(this.allActionNotes, processed);
    const currentStillValid = this.remaining.find((n) => n.filepath === currentPath);
    if (currentStillValid) {
      this.remaining = [currentStillValid, ...this.remaining.filter((n) => n.filepath !== currentPath)];
    }
    const total = this.remaining.length + this.passed.length + this.failed.length;
    this.currentRoundSize = this.progressLog.length + this.remaining.length;
    this.refreshProgressBar();
  }
  renderExtraHeaderButtons(headerRight) {
    let tbDropdown = null;
    const tbBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    (0, import_obsidian12.setIcon)(tbBtn, "clock");
    tbBtn.setAttribute(
      "aria-label",
      `Timeblock: ${this.activeTimeblocks.length ? this.activeTimeblocks.join(", ") : "All"}`
    );
    tbBtn.addEventListener("click", () => {
      if (tbDropdown) {
        tbDropdown.remove();
        tbDropdown = null;
        return;
      }
      tbDropdown = headerRight.createDiv({ cls: "spaced-timeblock-picker" });
      for (const block of ["morning", "afternoon", "evening", "night"]) {
        const row = tbDropdown.createDiv({ cls: "spaced-context-option" });
        const cb = row.createEl("input");
        cb.type = "checkbox";
        cb.checked = this.activeTimeblocks.includes(block);
        row.createSpan({ text: block });
        cb.addEventListener("change", () => {
          if (cb.checked) {
            if (!this.activeTimeblocks.includes(block)) this.activeTimeblocks.push(block);
          } else {
            this.activeTimeblocks = this.activeTimeblocks.filter((b) => b !== block);
          }
          void this.applyFiltersInline();
        });
      }
      const onOutside = (e) => {
        if (!tbDropdown || !document.contains(tbDropdown)) {
          document.removeEventListener("mousedown", onOutside);
          return;
        }
        if (!tbDropdown.contains(e.target) && !tbBtn.contains(e.target)) {
          tbDropdown.remove();
          tbDropdown = null;
          document.removeEventListener("mousedown", onOutside);
        }
      };
      document.addEventListener("mousedown", onOutside);
    });
    let ctxDropdown = null;
    const ctxBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    (0, import_obsidian12.setIcon)(ctxBtn, "tag");
    ctxBtn.setAttribute(
      "aria-label",
      `Context: ${this.activeContexts.length ? this.activeContexts.join(", ") : "All"}`
    );
    ctxBtn.addEventListener("click", () => {
      if (ctxDropdown) {
        ctxDropdown.remove();
        ctxDropdown = null;
        return;
      }
      const allContexts = getAllContextValues(this.app);
      if (allContexts.length === 0) return;
      ctxDropdown = headerRight.createDiv({ cls: "spaced-context-dropdown" });
      for (const ctx of allContexts) {
        const row = ctxDropdown.createDiv({ cls: "spaced-context-option" });
        const cb = row.createEl("input");
        cb.type = "checkbox";
        cb.checked = this.activeContexts.includes(ctx);
        row.createSpan({ text: ctx });
        cb.addEventListener("change", () => {
          if (cb.checked) {
            if (!this.activeContexts.includes(ctx)) this.activeContexts.push(ctx);
          } else {
            this.activeContexts = this.activeContexts.filter((c) => c !== ctx);
          }
          void this.applyFiltersInline();
        });
      }
      const onOutside = (e) => {
        if (!ctxDropdown || !document.contains(ctxDropdown)) {
          document.removeEventListener("mousedown", onOutside);
          return;
        }
        if (!ctxDropdown.contains(e.target) && !ctxBtn.contains(e.target)) {
          ctxDropdown.remove();
          ctxDropdown = null;
          document.removeEventListener("mousedown", onOutside);
        }
      };
      document.addEventListener("mousedown", onOutside);
    });
  }
  onRestartClick() {
    void this.restartSession();
  }
  onSessionClose() {
    if (this.remaining.length > 0 || this.failed.length > 0) {
      void this.saveSession();
    }
  }
  // ── Screens ────────────────────────────────────────────────────────────────
  showEnergyPicker() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "How's your energy?" });
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    this.addBtn(btnRow, {
      label: "High energy",
      cls: "energy-high",
      modifier: "cta",
      cb: () => {
        this.energyLevel = "high";
        void this.startSession("high");
      }
    });
    this.addBtn(btnRow, {
      label: "Low energy",
      cls: "energy-low",
      cb: () => {
        this.energyLevel = "low";
        void this.startSession("low");
      }
    });
  }
  async startSession(level) {
    this.energyLevel = level;
    this.activeTimeblocks = [getCurrentTimeblock()];
    this.allActionNotes = this.loadActionNotes();
    if (this.allActionNotes.length === 0) {
      new import_obsidian12.Notice("No action notes found in vault.");
      this.showEmptyState();
      return;
    }
    const processed = /* @__PURE__ */ new Set();
    if (!this.buildFilteredRemaining(this.allActionNotes, processed)) {
      new import_obsidian12.Notice("No actions match current filters. Showing all active actions.");
      this.activeTimeblocks = [];
      this.activeContexts = [];
      this.buildFilteredRemaining(this.allActionNotes, processed);
    }
    this.passed = [];
    this.failed = [];
    this.progressLog = [];
    await this.renderModal();
  }
  async nextRound() {
    const sourceNotes = [...this.failed];
    this.passed = [];
    this.failed = [];
    this.progressLog = [];
    const processed = /* @__PURE__ */ new Set();
    this.buildFilteredRemaining(sourceNotes, processed);
    await this.renderModal();
  }
  async resumeSession(saved) {
    var _a;
    delete this.plugin.data.systemSession;
    this.allActionNotes = this.loadActionNotes();
    this.remaining = saved.remaining.map((fp) => this.allActionNotes.find((n) => n.filepath === fp)).filter((n) => n !== void 0);
    this.failed = saved.failed.map((fp) => this.allActionNotes.find((n) => n.filepath === fp)).filter((n) => n !== void 0);
    this.progressLog = [...saved.progressLog];
    this.currentRoundSize = saved.currentRoundSize;
    this.energyLevel = saved.energyLevel;
    this.activeTimeblocks = (_a = saved.activeTimeblocks) != null ? _a : [];
    this.activeContexts = [...saved.activeContexts];
    await this.renderModal();
  }
  async showSummary(isDone) {
    this.cleanupEditors();
    const { contentEl } = this;
    contentEl.empty();
    if (isDone) {
      await this.clearSession();
      contentEl.createEl("h3", { text: "All done!" });
    } else {
      contentEl.createEl("h3", { text: "Round complete!" });
      contentEl.createEl("p", { text: `Passed: ${this.passed.length}` });
      contentEl.createEl("p", { text: `Failed: ${this.failed.length}` });
    }
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    this.addBtn(btnRow, {
      label: isDone ? "Restart session" : "Next round",
      cls: "summary-action",
      modifier: "cta",
      cb: () => isDone ? void this.restartSession() : void this.nextRound()
    });
    this.addBtn(btnRow, { label: "Close", cls: "summary-close", cb: () => this.close() });
  }
  async restartSession() {
    await this.clearSession();
    this.energyLevel = null;
    this.remaining = [];
    this.passed = [];
    this.failed = [];
    this.progressLog = [];
    this.currentRoundSize = 0;
    await this.renderModal();
  }
  // ── Note response ──────────────────────────────────────────────────────────
  async respond(result) {
    await this.saveTitle();
    await this.saveBodyEdits();
    const note = this.remaining.shift();
    this.progressLog.push(result);
    if (result === "pass") {
      this.passed.push(note);
      if (note.timescope) {
        await writeFrontmatterRecurringComplete(this.app, note.filepath);
      }
    } else {
      this.failed.push(note);
    }
    await this.renderModal();
  }
  // ── Skipped tracking ──────────────────────────────────────────────────────────
  renderLeechBanner(container) {
    var _a;
    const count = (_a = this.note.skipped) != null ? _a : 0;
    const banner = container.createDiv({ cls: "spaced-leech-banner" });
    banner.createSpan({ text: `\u26A0\uFE0F Skipped ${count}\xD7 \u2014 consider rescheduling or breaking this down.` });
    const actions = banner.createDiv({ cls: "spaced-leech-actions" });
    this.addBtn(actions, {
      label: "Edit",
      cls: "leech-edit",
      cb: async () => {
        this.isEditing = true;
        await this.renderModal();
      }
    });
    this.addBtn(actions, {
      label: "Wrong context?",
      cls: "leech-context",
      cb: () => {
        new import_obsidian12.Notice("Use the clock or tag buttons in the header to adjust your timeblock or context filters.");
      }
    });
    this.addBtn(actions, {
      label: "Deactivate",
      cls: "leech-deactivate",
      cb: async () => {
        this.remaining.shift();
        this.note = { ...this.note, active: false };
        await writeFrontmatterActive(this.app, this.note.filepath, false);
        await this.renderModal();
      }
    });
  }
  getSkippedToday() {
    const entry = this.plugin.data.systemSkippedToday;
    if (!entry || entry.date !== today()) return /* @__PURE__ */ new Set();
    return new Set(entry.filepaths);
  }
  // ── Note discovery ──────────────────
  loadActionNotes() {
    var _a;
    const skippedToday = this.getSkippedToday();
    const notes = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
      if ((fm == null ? void 0 : fm.active) !== true) continue;
      if (!fm.energy && !fm.timeblock && !fm.timescope) continue;
      if (fm.timescope && !isDue(fm)) continue;
      if (skippedToday.has(file.path)) continue;
      notes.push({
        filepath: file.path,
        active: true,
        energy: fm.energy,
        timeblock: fm.timeblock,
        due: fm.due,
        context: fm.context,
        timescope: fm.timescope,
        last_completed: fm.last_completed,
        skipped: fm.skipped
      });
    }
    return notes;
  }
  showEmptyState() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "No action notes found in vault" });
    contentEl.createEl("p", {
      text: "Add notes with active: true and at least one of energy, timeblock, or timescope to use the System modal.",
      cls: "spaced-empty-desc"
    });
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    this.addBtn(btnRow, { label: "Close", cls: "close", cb: () => this.close() });
  }
  buildFilteredRemaining(sourceNotes, processed) {
    const byEnergy = this.energyLevel ? filterByEnergyLevel(sourceNotes, this.energyLevel) : sourceNotes;
    const byTimeblock = filterByTimeblock(byEnergy, this.activeTimeblocks);
    const byContext = filterByContext(byTimeblock, this.activeContexts);
    const unprocessed = byContext.filter((n) => !processed.has(n.filepath));
    const withDue = unprocessed.filter((n) => !!n.due).sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
    const noDueAll = unprocessed.filter((n) => !n.due);
    const skippedBefore = noDueAll.filter((n) => {
      var _a;
      return ((_a = n.skipped) != null ? _a : 0) > 0;
    }).sort((a, b) => {
      var _a, _b;
      return ((_a = b.skipped) != null ? _a : 0) - ((_b = a.skipped) != null ? _b : 0);
    });
    const neverSkipped = shuffleArray(noDueAll.filter((n) => {
      var _a;
      return !((_a = n.skipped) != null ? _a : 0);
    }));
    const withoutDue = [...skippedBefore, ...neverSkipped];
    const dueSlice = withDue.slice(0, _SystemModal.DUE_SLOTS);
    const noDueSlice = withoutDue.slice(0, _SystemModal.SESSION_SIZE - dueSlice.length);
    this.remaining = [...dueSlice, ...noDueSlice];
    this.currentRoundSize = this.remaining.length;
    return this.remaining.length > 0;
  }
  // ── Session persistence ────────────────────────────────────────────────────
  async clearSession() {
    delete this.plugin.data.systemSession;
    await saveStore(this.plugin, this.plugin.data);
  }
  async saveSession() {
    this.plugin.data.systemSession = {
      remaining: this.remaining.map((n) => n.filepath),
      failed: this.failed.map((n) => n.filepath),
      progressLog: [...this.progressLog],
      currentRoundSize: this.currentRoundSize,
      energyLevel: this.energyLevel,
      activeTimeblocks: this.activeTimeblocks,
      activeContexts: [...this.activeContexts]
    };
    await saveStore(this.plugin, this.plugin.data);
  }
  // Subtask Modal
  getSubtaskNotes() {
    var _a, _b;
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath);
    if (!file) return [];
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return [];
    const taskLines = new Set(
      ((_a = cache.listItems) != null ? _a : []).filter((item) => item.task !== void 0).map((item) => item.position.start.line)
    );
    const notes = [];
    for (const link of (_b = cache.links) != null ? _b : []) {
      if (!taskLines.has(link.position.start.line)) continue;
      const target = this.app.metadataCache.getFirstLinkpathDest(link.link, this.note.filepath);
      if (!target || !(target instanceof import_obsidian12.TFile)) continue;
      notes.push(
        readNoteRecord(this.plugin, target)
      );
    }
    return notes;
  }
};
_SystemModal.SESSION_SIZE = 20;
_SystemModal.DUE_SLOTS = 10;
var SystemModal = _SystemModal;

// src/main.ts
var SpacedEverythingPlugin = class extends import_obsidian13.Plugin {
  async onload() {
    await this.loadSettings();
    this.data = await loadStore(this);
    this.app.workspace.onLayoutReady(async () => {
      await migrateSeToStore(this);
    });
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        var _a;
        if (!(file instanceof import_obsidian13.TFile) || file.extension !== "md") return;
        if ((_a = this.data.noteRecords) == null ? void 0 : _a[oldPath]) {
          this.data.noteRecords[file.path] = this.data.noteRecords[oldPath];
          delete this.data.noteRecords[oldPath];
          void saveStore(this, this.data);
        }
      })
    );
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar();
    this.registerView(DUE_NOTES_VIEW_TYPE, (leaf) => new DueNotesView(leaf, this));
    this.addRibbonIcon("clock", "Show due notes", () => this.activateDueNotesView());
    this.addCommand({
      id: "start-system-review",
      name: "Start system review",
      callback: () => {
        new SystemModal(this.app, this).open();
      }
    });
    this.addCommand({
      id: "show-due-notes",
      name: "Show due notes",
      callback: () => this.activateDueNotesView()
    });
    this.addSettingTab(new SpacedEverythingSettingsTab(this.app, this));
    this.addCommand({
      id: "review-next-note",
      name: "Review next note",
      callback: async () => {
        delete this.data.srsSession;
        const notes = getNotesFromVault(this).filter((n) => n.interval >= 0);
        const dueCount = notes.filter((n) => noteIsDue(n)).length;
        this.data.reviewLoadLog.push({ timestamp: today(), numNotes: notes.length, numDue: dueCount });
        await saveStore(this, this.data);
        this.updateStatusBar(notes);
        await this.refreshDueNotesView();
        await this.refreshStatsView();
        const note = pickNoteToReview(notes, this.settings);
        if (!note) {
          new import_obsidian13.Notice("No notes due!");
          return;
        }
        new ReviewModal(this.app, this, note).open();
      }
    });
    this.addCommand({
      id: "continue-review",
      name: "Continue review session",
      callback: async () => {
        const saved = this.data.srsSession;
        if (!saved || saved.reviewedFilepaths.length === 0) {
          new import_obsidian13.Notice("No saved session found. Use 'Review next note' to start one.");
          return;
        }
        const allNotes = getNotesFromVault(this).filter((n) => n.interval >= 0);
        const remaining = allNotes.filter((n) => noteIsDue(n) && !saved.reviewedFilepaths.includes(n.filepath));
        if (remaining.length === 0) {
          new import_obsidian13.Notice("Session complete \u2014 no notes remaining.");
          delete this.data.srsSession;
          await saveStore(this, this.data);
          return;
        }
        const note = pickNoteToReview(remaining, this.settings);
        if (!note) return;
        const modal = new ReviewModal(this.app, this, note);
        modal.resumeSession(saved);
        modal.open();
      }
    });
    this.addCommand({
      id: "start-active-review",
      name: "Start active deck review",
      callback: () => {
        new DeckPickerModal(this.app, this).open();
      }
    });
    this.addCommand({
      id: "show-stats",
      name: "Show stats",
      callback: () => this.activateStatsView()
    });
    this.addCommand({
      id: "sync-vault",
      name: "Refresh schedule views",
      callback: async () => {
        this.updateStatusBar();
        await this.refreshDueNotesView();
        await this.refreshStatsView();
      }
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        var _a, _b;
        if (file instanceof import_obsidian13.TFile && file.extension === "md") {
          const isActive = ((_b = (_a = this.app.metadataCache.getFileCache(file)) == null ? void 0 : _a.frontmatter) == null ? void 0 : _b.active) === true;
          menu.addItem(
            (item) => item.setTitle(isActive ? "Remove from active deck" : "Add to active deck").setIcon(isActive ? "square" : "check-square").onClick(async () => {
              await writeFrontmatterActive(this.app, file.path, !isActive);
            })
          );
        }
        if (file instanceof import_obsidian13.TFolder) {
          menu.addItem(
            (item) => item.setTitle("Add folder to deck...").setIcon("layers").onClick(() => {
              new FolderDeckPickerModal(this.app, file, this).open();
            })
          );
        }
      })
    );
    this.addCommand({
      id: "clear-active-deck",
      name: "Clear active deck (uncheck all notes)",
      callback: async () => {
        const activeFiles = this.app.vault.getMarkdownFiles().filter((f) => {
          var _a, _b;
          return ((_b = (_a = this.app.metadataCache.getFileCache(f)) == null ? void 0 : _a.frontmatter) == null ? void 0 : _b.active) === true;
        });
        if (!activeFiles.length) {
          new import_obsidian13.Notice("No notes in the active deck.");
          return;
        }
        for (const file of activeFiles) {
          await writeFrontmatterActive(this.app, file.path, false);
        }
        new import_obsidian13.Notice(`Cleared ${activeFiles.length} note${activeFiles.length !== 1 ? "s" : ""} from the active deck.`);
      }
    });
    this.registerView(STATS_VIEW_TYPE, (leaf) => new StatsView(leaf, this));
    this.addRibbonIcon("bar-chart", "Show stats", () => this.activateStatsView());
  }
  onunload() {
  }
  async loadSettings() {
    var _a;
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, (_a = saved == null ? void 0 : saved.settings) != null ? _a : {});
  }
  async saveSettings() {
    var _a;
    const current = (_a = await this.loadData()) != null ? _a : {};
    await this.saveData({ ...current, settings: this.settings });
  }
  updateStatusBar(precomputed) {
    const allNotes = precomputed != null ? precomputed : getNotesFromVault(this).filter((n) => n.interval >= 0);
    const dueCount = allNotes.filter((n) => noteIsDue(n)).length;
    this.statusBarItem.setText(`${dueCount} due`);
  }
  async activateDueNotesView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(DUE_NOTES_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: DUE_NOTES_VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }
  async refreshDueNotesView() {
    for (const leaf of this.app.workspace.getLeavesOfType(DUE_NOTES_VIEW_TYPE)) {
      if (leaf.view instanceof DueNotesView) {
        await leaf.view.render();
      }
    }
  }
  async activateStatsView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(STATS_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: STATS_VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }
  async refreshStatsView() {
    for (const leaf of this.app.workspace.getLeavesOfType(STATS_VIEW_TYPE)) {
      if (leaf.view instanceof StatsView) {
        await leaf.view.render();
      }
    }
  }
  async resetData() {
    this.data = { reviewLoadLog: [], reviewHistory: [] };
    await saveStore(this, this.data);
    this.updateStatusBar();
    await this.refreshDueNotesView();
    await this.refreshStatsView();
    new import_obsidian13.Notice("All scheduling data has been reset.");
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL3N0b3JlLnRzIiwgInNyYy9SZXZpZXdNb2RhbC50cyIsICJzcmMvdHlwZXMudHMiLCAic3JjL3V0aWxzLnRzIiwgInNyYy9zY2hlZHVsZXIudHMiLCAic3JjL2Zyb250bWF0dGVyLnRzIiwgInNyYy9CYXNlTm90ZU1vZGFsLnRzIiwgInNyYy9Sb3V0ZUZvbGRlck1vZGFsLnRzIiwgInNyYy9RdWlja05vdGVNb2RhbC50cyIsICJzcmMvZGVja0Ryb3Bkb3duLnRzIiwgInNyYy9jbTYtZWRpdG9yLnRzIiwgInNyYy9NYWtlQWN0aW9uYWJsZU1vZGFsLnRzIiwgInNyYy9TZXR0aW5nc1RhYi50cyIsICJzcmMvRHVlTm90ZXNWaWV3LnRzIiwgInNyYy9TdGF0c1ZpZXcudHMiLCAibm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9hc2NlbmRpbmcuanMiLCAibm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9kZXNjZW5kaW5nLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvYmlzZWN0b3IuanMiLCAibm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9udW1iZXIuanMiLCAibm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9iaXNlY3QuanMiLCAibm9kZV9tb2R1bGVzL2ludGVybm1hcC9zcmMvaW5kZXguanMiLCAibm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy90aWNrcy5qcyIsICJub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL3JhbmdlLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvaW5pdC5qcyIsICJub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL29yZGluYWwuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy9iYW5kLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvZGVmaW5lLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvY29sb3IuanMiLCAibm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9iYXNpcy5qcyIsICJub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL2Jhc2lzQ2xvc2VkLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvY29uc3RhbnQuanMiLCAibm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9jb2xvci5qcyIsICJub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL3JnYi5qcyIsICJub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL251bWJlckFycmF5LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvYXJyYXkuanMiLCAibm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9kYXRlLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvbnVtYmVyLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvb2JqZWN0LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvc3RyaW5nLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvdmFsdWUuanMiLCAibm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9yb3VuZC5qcyIsICJub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL2NvbnN0YW50LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvbnVtYmVyLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvY29udGludW91cy5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXREZWNpbWFsLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2V4cG9uZW50LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdEdyb3VwLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdE51bWVyYWxzLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdFNwZWNpZmllci5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXRUcmltLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdFByZWZpeEF1dG8uanMiLCAibm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZm9ybWF0Um91bmRlZC5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXRUeXBlcy5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9pZGVudGl0eS5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9sb2NhbGUuanMiLCAibm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZGVmYXVsdExvY2FsZS5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9wcmVjaXNpb25GaXhlZC5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9wcmVjaXNpb25QcmVmaXguanMiLCAibm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvcHJlY2lzaW9uUm91bmQuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy90aWNrRm9ybWF0LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvbGluZWFyLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvbmljZS5qcyIsICJub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvaW50ZXJ2YWwuanMiLCAibm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL21pbGxpc2Vjb25kLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9kdXJhdGlvbi5qcyIsICJub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvc2Vjb25kLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9taW51dGUuanMiLCAibm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL2hvdXIuanMiLCAibm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL2RheS5qcyIsICJub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvd2Vlay5qcyIsICJub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvbW9udGguanMiLCAibm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3llYXIuanMiLCAibm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3RpY2tzLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy10aW1lLWZvcm1hdC9zcmMvbG9jYWxlLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy10aW1lLWZvcm1hdC9zcmMvZGVmYXVsdExvY2FsZS5qcyIsICJub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL3RpbWUuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNoYXBlL3NyYy9jb25zdGFudC5qcyIsICJub2RlX21vZHVsZXMvZDMtcGF0aC9zcmMvcGF0aC5qcyIsICJub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL3BhdGguanMiLCAibm9kZV9tb2R1bGVzL2QzLXNoYXBlL3NyYy9hcnJheS5qcyIsICJub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL2N1cnZlL2xpbmVhci5qcyIsICJub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL3BvaW50LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zaGFwZS9zcmMvbGluZS5qcyIsICJub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL2FyZWEuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbmFtZXNwYWNlcy5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9uYW1lc3BhY2UuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvY3JlYXRvci5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rvci5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc2VsZWN0LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL2FycmF5LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdG9yQWxsLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zZWxlY3RBbGwuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbWF0Y2hlci5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc2VsZWN0Q2hpbGQuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NlbGVjdENoaWxkcmVuLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9maWx0ZXIuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NwYXJzZS5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZW50ZXIuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvY29uc3RhbnQuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2RhdGEuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2V4aXQuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2pvaW4uanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL21lcmdlLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9vcmRlci5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc29ydC5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vY2FsbC5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbm9kZXMuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL25vZGUuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NpemUuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2VtcHR5LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9lYWNoLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9hdHRyLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3dpbmRvdy5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc3R5bGUuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3Byb3BlcnR5LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jbGFzc2VkLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi90ZXh0LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9odG1sLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9yYWlzZS5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbG93ZXIuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2FwcGVuZC5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaW5zZXJ0LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9yZW1vdmUuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2Nsb25lLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kYXR1bS5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vb24uanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2Rpc3BhdGNoLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9pdGVyYXRvci5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaW5kZXguanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0LmpzIiwgInNyYy9EZWNrUGlja2VyTW9kYWwudHMiLCAic3JjL0FjdGl2ZU1vZGFsLnRzIiwgInNyYy9Gb2xkZXJEZWNrUGlja2VyTW9kYWwudHMiLCAic3JjL1N5c3RlbU1vZGFsLnRzIiwgInNyYy9TdWJ0YXNrTW9kYWwudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IFBsdWdpbiwgVEZpbGUsIFRGb2xkZXIsIE1lbnUsIE5vdGljZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBsb2FkU3RvcmUsIHNhdmVTdG9yZSB9IGZyb20gXCIuL3N0b3JlXCI7XHJcbmltcG9ydCB7IFJldmlld01vZGFsIH0gZnJvbSBcIi4vUmV2aWV3TW9kYWxcIjtcclxuaW1wb3J0IHsgU3BhY2VkRXZlcnl0aGluZ1NldHRpbmdzVGFiIH0gZnJvbSBcIi4vU2V0dGluZ3NUYWJcIjtcclxuaW1wb3J0IHsgRHVlTm90ZXNWaWV3LCBEVUVfTk9URVNfVklFV19UWVBFIH0gZnJvbSBcIi4vRHVlTm90ZXNWaWV3XCI7XHJcbmltcG9ydCB7IFN0YXRzVmlldywgU1RBVFNfVklFV19UWVBFIH0gZnJvbSBcIi4vU3RhdHNWaWV3XCI7XHJcbmltcG9ydCB7IERlY2tQaWNrZXJNb2RhbCB9IGZyb20gXCIuL0RlY2tQaWNrZXJNb2RhbFwiO1xyXG5pbXBvcnQgeyBGb2xkZXJEZWNrUGlja2VyTW9kYWwgfSBmcm9tIFwiLi9Gb2xkZXJEZWNrUGlja2VyTW9kYWxcIjtcclxuaW1wb3J0IHsgU3BhY2VkRXZlcnl0aGluZ1NldHRpbmdzLCBERUZBVUxUX1NFVFRJTkdTLCBQbHVnaW5EYXRhLCBOb3RlUmVjb3JkIH0gZnJvbSBcIi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgZ2V0Tm90ZXNGcm9tVmF1bHQsIHdyaXRlRnJvbnRtYXR0ZXJBY3RpdmUsIG1pZ3JhdGVTZVRvU3RvcmUgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiOyAgXHJcbmltcG9ydCB7IHBpY2tOb3RlVG9SZXZpZXcsIG5vdGVJc0R1ZSB9IGZyb20gXCIuL3NjaGVkdWxlclwiO1xyXG5pbXBvcnQgeyB0b2RheSB9IGZyb20gXCIuL3V0aWxzXCI7XHJcbmltcG9ydCB7IFN5c3RlbU1vZGFsIH0gZnJvbSBcIi4vU3lzdGVtTW9kYWxcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xyXG4gIHNldHRpbmdzOiBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3M7XHJcbiAgZGF0YTogUGx1Z2luRGF0YTtcclxuXHJcbiAgcHJpdmF0ZSBzdGF0dXNCYXJJdGVtOiBIVE1MRWxlbWVudDtcclxuXHJcbiAgYXN5bmMgb25sb2FkKCkge1xyXG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcclxuICAgIHRoaXMuZGF0YSA9IGF3YWl0IGxvYWRTdG9yZSh0aGlzKTtcclxuXHJcbiAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub25MYXlvdXRSZWFkeShhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IG1pZ3JhdGVTZVRvU3RvcmUodGhpcyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcbiAgICAgIHRoaXMuYXBwLnZhdWx0Lm9uKFwicmVuYW1lXCIsIChmaWxlLCBvbGRQYXRoKSA9PiB7XHJcbiAgICAgICAgaWYgKCEoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB8fCBmaWxlLmV4dGVuc2lvbiAhPT0gXCJtZFwiKSByZXR1cm47XHJcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5ub3RlUmVjb3Jkcz8uW29sZFBhdGhdKSB7XHJcbiAgICAgICAgICB0aGlzLmRhdGEubm90ZVJlY29yZHNbZmlsZS5wYXRoXSA9IHRoaXMuZGF0YS5ub3RlUmVjb3Jkc1tvbGRQYXRoXTtcclxuICAgICAgICAgIGRlbGV0ZSB0aGlzLmRhdGEubm90ZVJlY29yZHNbb2xkUGF0aF07XHJcbiAgICAgICAgICB2b2lkIHNhdmVTdG9yZSh0aGlzLCB0aGlzLmRhdGEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSksXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuc3RhdHVzQmFySXRlbSA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpO1xyXG4gICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcclxuXHJcbiAgICB0aGlzLnJlZ2lzdGVyVmlldyhEVUVfTk9URVNfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IER1ZU5vdGVzVmlldyhsZWFmLCB0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5hZGRSaWJib25JY29uKFwiY2xvY2tcIiwgXCJTaG93IGR1ZSBub3Rlc1wiLCAoKSA9PiB0aGlzLmFjdGl2YXRlRHVlTm90ZXNWaWV3KCkpO1xyXG5cclxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgIGlkOiBcInN0YXJ0LXN5c3RlbS1yZXZpZXdcIixcclxuICAgICAgbmFtZTogXCJTdGFydCBzeXN0ZW0gcmV2aWV3XCIsXHJcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgbmV3IFN5c3RlbU1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKCk7XHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6IFwic2hvdy1kdWUtbm90ZXNcIixcclxuICAgICAgbmFtZTogXCJTaG93IGR1ZSBub3Rlc1wiLFxyXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5hY3RpdmF0ZUR1ZU5vdGVzVmlldygpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3NUYWIodGhpcy5hcHAsIHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICBpZDogXCJyZXZpZXctbmV4dC1ub3RlXCIsXHJcbiAgICAgIG5hbWU6IFwiUmV2aWV3IG5leHQgbm90ZVwiLFxyXG4gICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLmRhdGEuc3JzU2Vzc2lvbjtcclxuICAgICAgICBjb25zdCBub3RlcyA9IGdldE5vdGVzRnJvbVZhdWx0KHRoaXMpLmZpbHRlcigobikgPT4gbi5pbnRlcnZhbCA+PSAwKTtcclxuICAgICAgICBjb25zdCBkdWVDb3VudCA9IG5vdGVzLmZpbHRlcigobikgPT4gbm90ZUlzRHVlKG4pKS5sZW5ndGg7XHJcbiAgICAgICAgdGhpcy5kYXRhLnJldmlld0xvYWRMb2cucHVzaCh7IHRpbWVzdGFtcDogdG9kYXkoKSwgbnVtTm90ZXM6IG5vdGVzLmxlbmd0aCwgbnVtRHVlOiBkdWVDb3VudCB9KTtcclxuICAgICAgICBhd2FpdCBzYXZlU3RvcmUodGhpcywgdGhpcy5kYXRhKTtcclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0Jhcihub3Rlcyk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoRHVlTm90ZXNWaWV3KCk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoU3RhdHNWaWV3KCk7XHJcbiAgICAgICAgY29uc3Qgbm90ZSA9IHBpY2tOb3RlVG9SZXZpZXcobm90ZXMsIHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgICAgIGlmICghbm90ZSkge1xyXG4gICAgICAgICAgbmV3IE5vdGljZShcIk5vIG5vdGVzIGR1ZSFcIik7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG5ldyBSZXZpZXdNb2RhbCh0aGlzLmFwcCwgdGhpcywgbm90ZSkub3BlbigpO1xyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6IFwiY29udGludWUtcmV2aWV3XCIsXHJcbiAgICAgIG5hbWU6IFwiQ29udGludWUgcmV2aWV3IHNlc3Npb25cIixcclxuICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcclxuICAgICAgICBjb25zdCBzYXZlZCA9IHRoaXMuZGF0YS5zcnNTZXNzaW9uO1xyXG4gICAgICAgIGlmICghc2F2ZWQgfHwgc2F2ZWQucmV2aWV3ZWRGaWxlcGF0aHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICBuZXcgTm90aWNlKFwiTm8gc2F2ZWQgc2Vzc2lvbiBmb3VuZC4gVXNlICdSZXZpZXcgbmV4dCBub3RlJyB0byBzdGFydCBvbmUuXCIpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBhbGxOb3RlcyA9IGdldE5vdGVzRnJvbVZhdWx0KHRoaXMpLmZpbHRlcigobikgPT4gbi5pbnRlcnZhbCA+PSAwKTtcclxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBhbGxOb3Rlcy5maWx0ZXIoKG4pID0+IG5vdGVJc0R1ZShuKSAmJiAhc2F2ZWQucmV2aWV3ZWRGaWxlcGF0aHMuaW5jbHVkZXMobi5maWxlcGF0aCkpO1xyXG4gICAgICAgIGlmIChyZW1haW5pbmcubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICBuZXcgTm90aWNlKFwiU2Vzc2lvbiBjb21wbGV0ZSBcdTIwMTQgbm8gbm90ZXMgcmVtYWluaW5nLlwiKTtcclxuICAgICAgICAgIGRlbGV0ZSB0aGlzLmRhdGEuc3JzU2Vzc2lvbjtcclxuICAgICAgICAgIGF3YWl0IHNhdmVTdG9yZSh0aGlzLCB0aGlzLmRhdGEpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBub3RlID0gcGlja05vdGVUb1JldmlldyhyZW1haW5pbmcsIHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgICAgIGlmICghbm90ZSkgcmV0dXJuO1xyXG4gICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IFJldmlld01vZGFsKHRoaXMuYXBwLCB0aGlzLCBub3RlKTtcclxuICAgICAgICBtb2RhbC5yZXN1bWVTZXNzaW9uKHNhdmVkKTtcclxuICAgICAgICBtb2RhbC5vcGVuKCk7XHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICBpZDogXCJzdGFydC1hY3RpdmUtcmV2aWV3XCIsXHJcbiAgICAgIG5hbWU6IFwiU3RhcnQgYWN0aXZlIGRlY2sgcmV2aWV3XCIsXHJcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgbmV3IERlY2tQaWNrZXJNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpO1xyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6IFwic2hvdy1zdGF0c1wiLFxyXG4gICAgICBuYW1lOiBcIlNob3cgc3RhdHNcIixcclxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVTdGF0c1ZpZXcoKSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgIGlkOiBcInN5bmMtdmF1bHRcIixcclxuICAgICAgbmFtZTogXCJSZWZyZXNoIHNjaGVkdWxlIHZpZXdzXCIsXHJcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hEdWVOb3Rlc1ZpZXcoKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hTdGF0c1ZpZXcoKTtcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbGUgZXhwbG9yZXIgY29udGV4dCBtZW51XHJcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcbiAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbihcImZpbGUtbWVudVwiLCAobWVudTogTWVudSwgZmlsZSkgPT4ge1xyXG4gICAgICAgIC8vIFNpbmdsZSBub3RlXHJcbiAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSAmJiBmaWxlLmV4dGVuc2lvbiA9PT0gXCJtZFwiKSB7XHJcbiAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcj8uYWN0aXZlID09PSB0cnVlO1xyXG4gICAgICAgICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PlxyXG4gICAgICAgICAgICBpdGVtXHJcbiAgICAgICAgICAgICAgLnNldFRpdGxlKGlzQWN0aXZlID8gXCJSZW1vdmUgZnJvbSBhY3RpdmUgZGVja1wiIDogXCJBZGQgdG8gYWN0aXZlIGRlY2tcIilcclxuICAgICAgICAgICAgICAuc2V0SWNvbihpc0FjdGl2ZSA/IFwic3F1YXJlXCIgOiBcImNoZWNrLXNxdWFyZVwiKVxyXG4gICAgICAgICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJBY3RpdmUodGhpcy5hcHAsIGZpbGUucGF0aCwgIWlzQWN0aXZlKTtcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBGb2xkZXIgXHUyMDE0IGFkZCBhbGwgbm90ZXMgaW5zaWRlXHJcbiAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURm9sZGVyKSB7XHJcbiAgICAgICAgICBtZW51LmFkZEl0ZW0oKGl0ZW0pID0+XHJcbiAgICAgICAgICAgIGl0ZW1cclxuICAgICAgICAgICAgICAuc2V0VGl0bGUoXCJBZGQgZm9sZGVyIHRvIGRlY2suLi5cIilcclxuICAgICAgICAgICAgICAuc2V0SWNvbihcImxheWVyc1wiKVxyXG4gICAgICAgICAgICAgIC5vbkNsaWNrKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIG5ldyBGb2xkZXJEZWNrUGlja2VyTW9kYWwodGhpcy5hcHAsIGZpbGUsIHRoaXMpLm9wZW4oKTtcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KSxcclxuICAgICk7XHJcblxyXG4gICAgLyogSXRlcmF0ZSBhbGwgbWFya2Rvd24gZmlsZXMgaW4gdGhlIHZhdWx0XHJcbkZvciBlYWNoIGZpbGUsIHJlYWQgZnJvbnRtYXR0ZXIuZGVja3MgZnJvbSBtZXRhZGF0YUNhY2hlXHJcbkNoZWNrIGlmIGl0J3MgYW4gYXJyYXkgd2l0aCBhbnkgZHVwbGljYXRlcyAoaS5lLiwgbmV3IFNldChkZWNrcykuc2l6ZSA8IGRlY2tzLmxlbmd0aClcclxuSWYgc28sIGNhbGwgd3JpdGVGcm9udG1hdHRlckRlY2tzKHRoaXMuYXBwLCBmaWxlLnBhdGgsIFsuLi5uZXcgU2V0KGRlY2tzKV0pXHJcblNob3cgYSBOb3RpY2UgcmVwb3J0aW5nIGhvdyBtYW55IGZpbGVzIHdlcmUgZml4ZWRcclxuXHJcbmh0dHBzOi8vZGVlcHdpa2kuY29tL3NlYXJjaC9zb21ldGltZXMtaS1oYXZlLWEtcHJvYmxlbS13aGVfYjk1N2FlYzQtYzhmNi00YTA3LWE5ZWEtNWI0Yzg0ZTdiMzIwXHJcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICBpZDogXCJjaGVjay1kZWNrLWR1cGVzXCIsXHJcbiAgICAgIG5hbWU6IFwiQ2hlY2sgZGVjayBkdXBsaWNhdGVzXCIsXHJcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgIGl0ZXJhdGUgYWxsIG1hcmtkb3duIGZpbGVzIGluIHZhdWx0IFxyXG4gICAgICAgIGNvbnN0IEZpbGVzID0gdGhpcy5hcHAudmF1bHRcclxuICAgICAgICAgIC5nZXRNYXJrZG93bkZpbGVzKClcclxuICAgICAgICBcclxuICAgICAgfSxcclxuICAgIH0pOyovXHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6IFwiY2xlYXItYWN0aXZlLWRlY2tcIixcclxuICAgICAgbmFtZTogXCJDbGVhciBhY3RpdmUgZGVjayAodW5jaGVjayBhbGwgbm90ZXMpXCIsXHJcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgYWN0aXZlRmlsZXMgPSB0aGlzLmFwcC52YXVsdFxyXG4gICAgICAgICAgLmdldE1hcmtkb3duRmlsZXMoKVxyXG4gICAgICAgICAgLmZpbHRlcigoZikgPT4gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZik/LmZyb250bWF0dGVyPy5hY3RpdmUgPT09IHRydWUpO1xyXG5cclxuICAgICAgICBpZiAoIWFjdGl2ZUZpbGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgbmV3IE5vdGljZShcIk5vIG5vdGVzIGluIHRoZSBhY3RpdmUgZGVjay5cIik7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgYWN0aXZlRmlsZXMpIHtcclxuICAgICAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJBY3RpdmUodGhpcy5hcHAsIGZpbGUucGF0aCwgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBuZXcgTm90aWNlKGBDbGVhcmVkICR7YWN0aXZlRmlsZXMubGVuZ3RofSBub3RlJHthY3RpdmVGaWxlcy5sZW5ndGggIT09IDEgPyBcInNcIiA6IFwiXCJ9IGZyb20gdGhlIGFjdGl2ZSBkZWNrLmApO1xyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5yZWdpc3RlclZpZXcoU1RBVFNfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IFN0YXRzVmlldyhsZWFmLCB0aGlzKSk7XHJcbiAgICB0aGlzLmFkZFJpYmJvbkljb24oXCJiYXItY2hhcnRcIiwgXCJTaG93IHN0YXRzXCIsICgpID0+IHRoaXMuYWN0aXZhdGVTdGF0c1ZpZXcoKSk7XHJcbiAgfVxyXG5cclxuICBvbnVubG9hZCgpIHt9XHJcblxyXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcclxuICAgIGNvbnN0IHNhdmVkID0gYXdhaXQgdGhpcy5sb2FkRGF0YSgpO1xyXG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIHNhdmVkPy5zZXR0aW5ncyA/PyB7fSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7XHJcbiAgICBjb25zdCBjdXJyZW50ID0gKGF3YWl0IHRoaXMubG9hZERhdGEoKSkgPz8ge307XHJcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHsgLi4uY3VycmVudCwgc2V0dGluZ3M6IHRoaXMuc2V0dGluZ3MgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVTdGF0dXNCYXIocHJlY29tcHV0ZWQ/OiBOb3RlUmVjb3JkW10pIHtcclxuICAgIGNvbnN0IGFsbE5vdGVzID0gcHJlY29tcHV0ZWQgPz8gZ2V0Tm90ZXNGcm9tVmF1bHQodGhpcykuZmlsdGVyKChuKSA9PiBuLmludGVydmFsID49IDApO1xyXG4gICAgY29uc3QgZHVlQ291bnQgPSBhbGxOb3Rlcy5maWx0ZXIoKG4pID0+IG5vdGVJc0R1ZShuKSkubGVuZ3RoO1xyXG4gICAgdGhpcy5zdGF0dXNCYXJJdGVtLnNldFRleHQoYCR7ZHVlQ291bnR9IGR1ZWApO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgYWN0aXZhdGVEdWVOb3Rlc1ZpZXcoKSB7XHJcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XHJcbiAgICBsZXQgbGVhZiA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoRFVFX05PVEVTX1ZJRVdfVFlQRSlbMF07XHJcbiAgICBpZiAoIWxlYWYpIHtcclxuICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpITtcclxuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBEVUVfTk9URVNfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSk7XHJcbiAgICB9XHJcbiAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHJlZnJlc2hEdWVOb3Rlc1ZpZXcoKSB7XHJcbiAgICBmb3IgKGNvbnN0IGxlYWYgb2YgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShEVUVfTk9URVNfVklFV19UWVBFKSkge1xyXG4gICAgICBpZiAobGVhZi52aWV3IGluc3RhbmNlb2YgRHVlTm90ZXNWaWV3KSB7XHJcbiAgICAgICAgYXdhaXQgbGVhZi52aWV3LnJlbmRlcigpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyBhY3RpdmF0ZVN0YXRzVmlldygpIHtcclxuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcclxuICAgIGxldCBsZWFmID0gd29ya3NwYWNlLmdldExlYXZlc09mVHlwZShTVEFUU19WSUVXX1RZUEUpWzBdO1xyXG4gICAgaWYgKCFsZWFmKSB7XHJcbiAgICAgIGxlYWYgPSB3b3Jrc3BhY2UuZ2V0UmlnaHRMZWFmKGZhbHNlKSE7XHJcbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogU1RBVFNfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSk7XHJcbiAgICB9XHJcbiAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHJlZnJlc2hTdGF0c1ZpZXcoKSB7XHJcbiAgICBmb3IgKGNvbnN0IGxlYWYgb2YgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShTVEFUU19WSUVXX1RZUEUpKSB7XHJcbiAgICAgIGlmIChsZWFmLnZpZXcgaW5zdGFuY2VvZiBTdGF0c1ZpZXcpIHtcclxuICAgICAgICBhd2FpdCBsZWFmLnZpZXcucmVuZGVyKCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHJlc2V0RGF0YSgpIHtcclxuICAgIHRoaXMuZGF0YSA9IHsgcmV2aWV3TG9hZExvZzogW10sIHJldmlld0hpc3Rvcnk6IFtdIH07XHJcbiAgICBhd2FpdCBzYXZlU3RvcmUodGhpcywgdGhpcy5kYXRhKTtcclxuICAgIHRoaXMudXBkYXRlU3RhdHVzQmFyKCk7XHJcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hEdWVOb3Rlc1ZpZXcoKTtcclxuICAgIGF3YWl0IHRoaXMucmVmcmVzaFN0YXRzVmlldygpO1xyXG4gICAgbmV3IE5vdGljZShcIkFsbCBzY2hlZHVsaW5nIGRhdGEgaGFzIGJlZW4gcmVzZXQuXCIpO1xyXG4gIH1cclxufVxyXG4iLCAiaW1wb3J0IHsgUGx1Z2luIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFBsdWdpbkRhdGEgfSBmcm9tIFwiLi90eXBlc1wiO1xyXG5cclxuY29uc3QgRU1QVFlfREFUQTogUGx1Z2luRGF0YSA9IHsgcmV2aWV3TG9hZExvZzogW10sIHJldmlld0hpc3Rvcnk6IFtdIH07XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFN0b3JlKHBsdWdpbjogUGx1Z2luKTogUHJvbWlzZTxQbHVnaW5EYXRhPiB7XHJcbiAgY29uc3Qgc2F2ZWQgPSBhd2FpdCBwbHVnaW4ubG9hZERhdGEoKTtcclxuICByZXR1cm4gc2F2ZWQ/LnBsdWdpbkRhdGEgPz8gRU1QVFlfREFUQTtcclxufVxyXG5cclxuLy8gVGhlIGFjdHVhbCB3cml0ZSBcdTIwMTQgZG9lcyB0aGUgcmVhZC1tb2RpZnktd3JpdGVcclxuYXN5bmMgZnVuY3Rpb24gX3NhdmVTdG9yZShwbHVnaW46IFBsdWdpbiwgZGF0YTogUGx1Z2luRGF0YSk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IE1BWF9ISVNUT1JZID0gMTBfMDAwO1xyXG4gIGlmIChkYXRhLnJldmlld0hpc3RvcnkubGVuZ3RoID4gTUFYX0hJU1RPUlkpIHtcclxuICAgIC8vIEtlZXAgb25seSB0aGUgbW9zdCByZWNlbnQgZW50cmllczsgZG9uJ3QgbXV0YXRlIHRoZSBvcmlnaW5hbFxyXG4gICAgZGF0YSA9IHsgLi4uZGF0YSwgcmV2aWV3SGlzdG9yeTogZGF0YS5yZXZpZXdIaXN0b3J5LnNsaWNlKC1NQVhfSElTVE9SWSkgfTtcclxuICB9XHJcbiAgY29uc3QgY3VycmVudCA9IChhd2FpdCBwbHVnaW4ubG9hZERhdGEoKSkgPz8ge307XHJcbiAgYXdhaXQgcGx1Z2luLnNhdmVEYXRhKHsgLi4uY3VycmVudCwgcGx1Z2luRGF0YTogZGF0YSB9KTtcclxufVxyXG5cclxuLy8gQSBxdWV1ZSBzbyBjb25jdXJyZW50IGNhbGxzIG5ldmVyIG92ZXJsYXBcclxubGV0IHNhdmVRdWV1ZTogUHJvbWlzZTx2b2lkPiA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVTdG9yZShwbHVnaW46IFBsdWdpbiwgZGF0YTogUGx1Z2luRGF0YSk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHNhdmVRdWV1ZSA9IHNhdmVRdWV1ZS50aGVuKCgpID0+IF9zYXZlU3RvcmUocGx1Z2luLCBkYXRhKSk7XHJcbiAgcmV0dXJuIHNhdmVRdWV1ZTtcclxufVxyXG4iLCAiaW1wb3J0IHsgQXBwLCBURmlsZSwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgTm90ZVJlY29yZCwgU3JzU2Vzc2lvbiwgZ2V0QWN0aXZlUmVhY3Rpb25zIH0gZnJvbSBcIi4vdHlwZXNcIjtcbmltcG9ydCB7IG5leHRJbnRlcnZhbCwgbmV4dEVhc2VGYWN0b3IsIG5vdGVJc0R1ZSwgcGlja05vdGVUb1JldmlldyB9IGZyb20gXCIuL3NjaGVkdWxlclwiO1xuaW1wb3J0IHsgdG9kYXkgfSBmcm9tIFwiLi91dGlsc1wiO1xuaW1wb3J0IHsgc2F2ZVN0b3JlIH0gZnJvbSBcIi4vc3RvcmVcIjtcbmltcG9ydCB0eXBlIFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuaW1wb3J0IHsgd3JpdGVOb3RlUmVjb3JkLCBnZXROb3Rlc0Zyb21WYXVsdCwgd3JpdGVGcm9udG1hdHRlclN0YXRlIH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcbmltcG9ydCB7IEJhc2VOb3RlTW9kYWwgfSBmcm9tIFwiLi9CYXNlTm90ZU1vZGFsXCI7XG5pbXBvcnQgeyBNYWtlQWN0aW9uYWJsZU1vZGFsIH0gZnJvbSBcIi4vTWFrZUFjdGlvbmFibGVNb2RhbFwiO1xuXG5leHBvcnQgY2xhc3MgUmV2aWV3TW9kYWwgZXh0ZW5kcyBCYXNlTm90ZU1vZGFsIHtcbiAgcHJpdmF0ZSByZXZpZXdTdGFydFRpbWUgPSAwO1xuICBwcml2YXRlIHJldmlld2VkSW5TZXNzaW9uID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHByaXZhdGUgcHJvZ3Jlc3NMb2c6IHN0cmluZ1tdID0gW107XG4gIHByaXZhdGUgc2Vzc2lvblNpemUgPSAwO1xuICBwcml2YXRlIGFjdGl2ZVNvdXJjZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByb3RlY3RlZCBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXG4gICAgcHJvdGVjdGVkIG5vdGU6IE5vdGVSZWNvcmQsXG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gIH1cbiAgcHJpdmF0ZSBnZXRTb3VyY2VGb2xkZXJMaXN0KCk6IHN0cmluZ1tdIHtcbiAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3Muc291cmNlU2NvcGUgPT09IFwiZm9sZGVyXCIpIHtcbiAgICAgIHJldHVybiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zb3VyY2VGb2xkZXJzLm1hcCgoZikgPT4gZi5wYXRoKTtcbiAgICB9XG4gICAgLy8gdmF1bHQgc2NvcGU6IGRlcml2ZSB1bmlxdWUgdG9wLWxldmVsIGRpcnMgZnJvbSBsaXZlIG5vdGVzXG4gICAgY29uc3Qgbm90ZXMgPSBnZXROb3Rlc0Zyb21WYXVsdCh0aGlzLnBsdWdpbikuZmlsdGVyKChuKSA9PiBuLmludGVydmFsID49IDApO1xuICAgIGNvbnN0IGZvbGRlcnMgPSBuZXcgU2V0KFxuICAgICAgbm90ZXMubWFwKChuKSA9PiBuLmZpbGVwYXRoLnNwbGl0KFwiL1wiKVswXSkuZmlsdGVyKChzZWcpID0+IHNlZy5lbmRzV2l0aChcIi5tZFwiKSA9PT0gZmFsc2UpLCAvLyBleGNsdWRlIHJvb3QtbGV2ZWwgZmlsZXNcbiAgICApO1xuICAgIHJldHVybiBbLi4uZm9sZGVyc10uc29ydCgpO1xuICB9XG5cbiAgYXN5bmMgb25PcGVuKCkge1xuICAgIGNvbnN0IGFsbE5vdGVzID0gZ2V0Tm90ZXNGcm9tVmF1bHQodGhpcy5wbHVnaW4pLmZpbHRlcigobikgPT4gbi5pbnRlcnZhbCA+PSAwKTtcbiAgICB0aGlzLnNlc3Npb25TaXplID0gYWxsTm90ZXMuZmlsdGVyKChuKSA9PiBub3RlSXNEdWUobikpLmxlbmd0aDtcbiAgICBhd2FpdCB0aGlzLnJlbmRlcigpO1xuICAgIHRoaXMuc2V0dXBWYXVsdExpc3RlbmVyKCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0U3RhdHVzVGV4dCgpOiBzdHJpbmcge1xuICAgIGxldCBhbGxOb3RlcyA9IGdldE5vdGVzRnJvbVZhdWx0KHRoaXMucGx1Z2luKS5maWx0ZXIoKG4pID0+IG4uaW50ZXJ2YWwgPj0gMCk7XG4gICAgaWYgKHRoaXMuYWN0aXZlU291cmNlcy5sZW5ndGggPiAwKSB7XG4gICAgICBhbGxOb3RlcyA9IGFsbE5vdGVzLmZpbHRlcigobikgPT4gdGhpcy5hY3RpdmVTb3VyY2VzLnNvbWUoKHNyYykgPT4gbi5maWxlcGF0aC5zdGFydHNXaXRoKHNyYyArIFwiL1wiKSkpO1xuICAgIH1cbiAgICBjb25zdCByZW1haW5pbmdEdWUgPSBhbGxOb3Rlcy5maWx0ZXIoKG4pID0+IG5vdGVJc0R1ZShuKSAmJiAhdGhpcy5yZXZpZXdlZEluU2Vzc2lvbi5oYXMobi5maWxlcGF0aCkpLmxlbmd0aDtcbiAgICByZXR1cm4gYCR7cmVtYWluaW5nRHVlfSBub3RlJHtyZW1haW5pbmdEdWUgIT09IDEgPyBcInNcIiA6IFwiXCJ9IGR1ZWA7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlcigpIHtcbiAgICB0aGlzLnJldmlld1N0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgdGhpcy5pc0VkaXRpbmcgPSBmYWxzZTtcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcbiAgICBhd2FpdCB0aGlzLnJlbmRlck5vdGUoY29udGVudEVsKTtcbiAgfVxuXG4gIHByb3RlY3RlZCByZW5kZXJFeHRyYUhlYWRlckJ1dHRvbnMoaGVhZGVyUmlnaHQ6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgLy8gXHUyNTAwXHUyNTAwIFN0YXRlIGJhZGdlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNvbnN0IHN0YXRlT3B0aW9ucyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLm5vdGVTdGF0ZVZhbHVlcyA/PyBbXCJcdUQ4M0NcdURGMzFcIiwgXCJcdUQ4M0NcdURGM0ZcIiwgXCJcdUQ4M0NcdURGMzJcIl07XG5cbiAgICBsZXQgY3VycmVudFN0YXRlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoXG4gICAgICB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZSxcbiAgICApPy5mcm9udG1hdHRlcj8uc3RhdGUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gICAgbGV0IHN0YXRlRHJvcGRvd246IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdCBiYWRnZSA9IGhlYWRlclJpZ2h0LmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICB0ZXh0OiBjdXJyZW50U3RhdGUgfHwgXCJubyBzdGF0ZVwiLFxuICAgICAgY2xzOiBcInNwYWNlZC1zdGF0ZS1iYWRnZVwiLFxuICAgIH0pO1xuICAgIGJhZGdlLnN0eWxlLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiO1xuICAgIGJhZGdlLnN0eWxlLmN1cnNvciA9IFwicG9pbnRlclwiO1xuXG4gICAgYmFkZ2UuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgIGlmIChzdGF0ZURyb3Bkb3duKSB7XG4gICAgICAgIHN0YXRlRHJvcGRvd24ucmVtb3ZlKCk7XG4gICAgICAgIHN0YXRlRHJvcGRvd24gPSBudWxsO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzdGF0ZURyb3Bkb3duID0gYmFkZ2UuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1zdGF0ZS1kcm9wZG93blwiIH0pO1xuICAgICAgZm9yIChjb25zdCBzdGF0ZSBvZiBzdGF0ZU9wdGlvbnMpIHtcbiAgICAgICAgY29uc3Qgb3B0ID0gc3RhdGVEcm9wZG93bi5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLXN0YXRlLW9wdGlvblwiIH0pO1xuICAgICAgICBvcHQuc2V0VGV4dChzdGF0ZSk7XG4gICAgICAgIGlmIChzdGF0ZSA9PT0gY3VycmVudFN0YXRlKSBvcHQuYWRkQ2xhc3MoXCJpcy1hY3RpdmVcIik7XG4gICAgICAgIG9wdC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJTdGF0ZSh0aGlzLmFwcCwgdGhpcy5ub3RlLmZpbGVwYXRoLCBzdGF0ZSk7XG4gICAgICAgICAgY3VycmVudFN0YXRlID0gc3RhdGU7XG4gICAgICAgICAgYmFkZ2Uuc2V0VGV4dChzdGF0ZSk7XG4gICAgICAgICAgc3RhdGVEcm9wZG93bj8ucmVtb3ZlKCk7XG4gICAgICAgICAgc3RhdGVEcm9wZG93biA9IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIE1ha2UgQWN0aW9uYWJsZSBidXR0b24gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc3QgbWthQnRuID0gaGVhZGVyUmlnaHQuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1oZHItYnRuXCIgfSk7XG4gICAgc2V0SWNvbihta2FCdG4sIFwiemFwXCIpO1xuICAgIG1rYUJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiTWFrZSBhY3Rpb25hYmxlXCIpO1xuICAgIG1rYUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgbmV3IE1ha2VBY3Rpb25hYmxlTW9kYWwodGhpcy5hcHAsIHRoaXMubm90ZS5maWxlcGF0aCwgKCkgPT4ge30pLm9wZW4oKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIHJlYWN0aW9uIGJ1dHRvbiByb3dcbiAgcHJvdGVjdGVkIHJlbmRlckJ1dHRvbnMoY29udGVudEVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IENPTE9SX1ZBUl9NQVA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICBcInNwYWNlZC1zZWctcHVycGxlXCI6IFwidmFyKC0tY29sb3ItcHVycGxlKVwiLFxuICAgICAgXCJzcGFjZWQtc2VnLWJsdWVcIjogXCJ2YXIoLS1jb2xvci1ibHVlKVwiLFxuICAgICAgXCJzcGFjZWQtc2VnLWdyZWVuXCI6IFwidmFyKC0tY29sb3ItZ3JlZW4pXCIsXG4gICAgICBcInNwYWNlZC1zZWcteWVsbG93XCI6IFwidmFyKC0tY29sb3IteWVsbG93KVwiLFxuICAgICAgXCJzcGFjZWQtc2VnLW9yYW5nZVwiOiBcInZhcigtLWNvbG9yLW9yYW5nZSlcIixcbiAgICAgIFwic3BhY2VkLXNlZy1yZWRcIjogXCJ2YXIoLS1jb2xvci1yZWQpXCIsXG4gICAgfTtcblxuICAgIGNvbnN0IGJ0blJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWJ0bi1yb3dcIiB9KTtcbiAgICBjb25zdCByZWFjdGlvbnMgPSBnZXRBY3RpdmVSZWFjdGlvbnModGhpcy5wbHVnaW4uc2V0dGluZ3MpO1xuICAgIHJlYWN0aW9ucy5mb3JFYWNoKChyLCBpKSA9PiB7XG4gICAgICBjb25zdCB3cmFwcGVyID0gYnRuUm93LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYnRuLXdyYXBwZXJcIiB9KTtcbiAgICAgIGNvbnN0IGJ0biA9IHRoaXMuYWRkQnRuKHdyYXBwZXIsIHsgbGFiZWw6IHIubGFiZWwsIGNsczogci5pZCwgY2I6ICgpID0+IHRoaXMucmVhY3Qoci5pZCkgfSk7XG4gICAgICBpZiAoaSA9PT0gMCkgYnRuLnNldEN0YSgpO1xuICAgICAgY29uc3QgY29sb3JWYXIgPSBDT0xPUl9WQVJfTUFQW3RoaXMucmVhY3Rpb25Db2xvcihyLmlkKV07XG4gICAgICBpZiAoY29sb3JWYXIpIGJ0bi5idXR0b25FbC5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tcmVhY3Rpb24tY29sb3JcIiwgY29sb3JWYXIpO1xuXG4gICAgICBjb25zdCBkYXlzID0gbmV4dEludGVydmFsKHRoaXMubm90ZSwgci5pZCwgcmVhY3Rpb25zKTtcbiAgICAgIHdyYXBwZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgICAgdGV4dDogZm9ybWF0SW50ZXJ2YWwoZGF5cyksXG4gICAgICAgIGNsczogXCJzcGFjZWQtYnRuLWludGVydmFsXCIsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBjb25zdCByb3V0ZUJ0biA9IHRoaXMuYWRkQnRuKGJ0blJvdywgeyBsYWJlbDogXCJSb3V0ZSBcdTIxOTJcIiwgY2xzOiBcInJvdXRlXCIsIGNiOiAoKSA9PiB0aGlzLnJvdXRlTm90ZSgpIH0pO1xuICAgIHJvdXRlQnRuLnNldEN0YSgpO1xuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgeyBsYWJlbDogXCJTa2lwXCIsIGNsczogXCJza2lwXCIsIGNiOiAoKSA9PiB0aGlzLnJlYWN0KFwic2tpcFwiKSB9KTtcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHsgbGFiZWw6IFwiQXJjaGl2ZVwiLCBjbHM6IFwiYXJjaGl2ZVwiLCBjYjogKCkgPT4gdGhpcy5hcmNoaXZlTm90ZSgpIH0pO1xuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgeyBpY29uOiBcInRyYXNoLTJcIiwgY2xzOiBcImRlbGV0ZVwiLCBjYjogKCkgPT4gdGhpcy5kZWxldGVOb3RlKCkgfSk7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgU291cmNlIHBpY2tlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBsZXQgc3JjRHJvcGRvd246IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3Qgc3JjQnRuID0gdGhpcy5hZGRCdG4oYnRuUm93LCB7XG4gICAgICBsYWJlbDogXCJTb3VyY2VcIixcbiAgICAgIGNsczogXCJzb3VyY2VcIixcbiAgICAgIHRvb2x0aXA6IGBTb3VyY2U6ICR7dGhpcy5hY3RpdmVTb3VyY2VzLmxlbmd0aCA/IHRoaXMuYWN0aXZlU291cmNlcy5qb2luKFwiLCBcIikgOiBcIkFsbFwifWAsXG4gICAgICBjYjogKCkgPT4ge1xuICAgICAgICBpZiAoc3JjRHJvcGRvd24pIHtcbiAgICAgICAgICBzcmNEcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgICBzcmNEcm9wZG93biA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZvbGRlcnMgPSB0aGlzLmdldFNvdXJjZUZvbGRlckxpc3QoKTtcbiAgICAgICAgaWYgKGZvbGRlcnMubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgICAgICAgc3JjRHJvcGRvd24gPSBidG5Sb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1zb3VyY2UtZHJvcGRvd25cIiB9KTtcbiAgICAgICAgY29uc3QgaXNBbGwgPSB0aGlzLmFjdGl2ZVNvdXJjZXMubGVuZ3RoID09PSAwO1xuXG4gICAgICAgIC8vIFwiQWxsXCIgcm93XG4gICAgICAgIGNvbnN0IGFsbFJvdyA9IHNyY0Ryb3Bkb3duLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtY29udGV4dC1vcHRpb25cIiB9KTtcbiAgICAgICAgY29uc3QgYWxsQ2IgPSBhbGxSb3cuY3JlYXRlRWwoXCJpbnB1dFwiKTtcbiAgICAgICAgYWxsQ2IudHlwZSA9IFwiY2hlY2tib3hcIjtcbiAgICAgICAgYWxsQ2IuY2hlY2tlZCA9IGlzQWxsO1xuICAgICAgICBhbGxSb3cuY3JlYXRlU3Bhbih7IHRleHQ6IFwiQWxsXCIgfSk7XG4gICAgICAgIGFsbENiLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xuICAgICAgICAgIHNyY0J0bi5idXR0b25FbC5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICBcImFyaWEtbGFiZWxcIixcbiAgICAgICAgICAgIGBTb3VyY2U6ICR7dGhpcy5hY3RpdmVTb3VyY2VzLmxlbmd0aCA/IHRoaXMuYWN0aXZlU291cmNlcy5qb2luKFwiLCBcIikgOiBcIkFsbFwifWAsXG4gICAgICAgICAgKTtcbiAgICAgICAgICB0aGlzLmFjdGl2ZVNvdXJjZXMgPSBbXTtcbiAgICAgICAgICB0aGlzLnJlZnJlc2hTZXNzaW9uU2l6ZSgpO1xuICAgICAgICAgIHNyY0Ryb3Bkb3duPy5yZW1vdmUoKTtcbiAgICAgICAgICBzcmNEcm9wZG93biA9IG51bGw7XG4gICAgICAgICAgLy8gcmUtb3BlbiB0byByZWZsZWN0IG5ldyBzdGF0ZVxuICAgICAgICAgIHNyY0J0bi5idXR0b25FbC5jbGljaygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQZXItZm9sZGVyIHJvd3NcbiAgICAgICAgZm9yIChjb25zdCBmb2xkZXIgb2YgZm9sZGVycykge1xuICAgICAgICAgIGNvbnN0IHJvdyA9IHNyY0Ryb3Bkb3duLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtY29udGV4dC1vcHRpb25cIiB9KTtcbiAgICAgICAgICBpZiAoaXNBbGwpIHJvdy5hZGRDbGFzcyhcInNwYWNlZC1zb3VyY2UtZ3JleWVkXCIpO1xuICAgICAgICAgIGNvbnN0IGNiID0gcm93LmNyZWF0ZUVsKFwiaW5wdXRcIik7XG4gICAgICAgICAgY2IudHlwZSA9IFwiY2hlY2tib3hcIjtcbiAgICAgICAgICBjYi5jaGVja2VkID0gaXNBbGwgfHwgdGhpcy5hY3RpdmVTb3VyY2VzLmluY2x1ZGVzKGZvbGRlcik7XG4gICAgICAgICAgcm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiBmb2xkZXIgfSk7XG5cbiAgICAgICAgICBjYi5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcbiAgICAgICAgICAgIHNyY0J0bi5idXR0b25FbC5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgIFwiYXJpYS1sYWJlbFwiLFxuICAgICAgICAgICAgICBgU291cmNlOiAke3RoaXMuYWN0aXZlU291cmNlcy5sZW5ndGggPyB0aGlzLmFjdGl2ZVNvdXJjZXMuam9pbihcIiwgXCIpIDogXCJBbGxcIn1gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmFjdGl2ZVNvdXJjZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgIHRoaXMuYWN0aXZlU291cmNlcyA9IFtmb2xkZXJdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjYi5jaGVja2VkKSB7XG4gICAgICAgICAgICAgIHRoaXMuYWN0aXZlU291cmNlcy5wdXNoKGZvbGRlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLmFjdGl2ZVNvdXJjZXMgPSB0aGlzLmFjdGl2ZVNvdXJjZXMuZmlsdGVyKChzKSA9PiBzICE9PSBmb2xkZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoU2Vzc2lvblNpemUoKTsgLy8gXHUyMTkwIHVwZGF0ZXMgZHVlIGNvdW50IG9ubHksIG5vIGZ1bGwgcmUtcmVuZGVyXG4gICAgICAgICAgICAvLyByZS1vcGVuIGRyb3Bkb3duIHRvIHJlZmxlY3QgbmV3IGNoZWNrZWQvZ3JleWVkIHN0YXRlczpcbiAgICAgICAgICAgIHNyY0Ryb3Bkb3duPy5yZW1vdmUoKTtcbiAgICAgICAgICAgIHNyY0Ryb3Bkb3duID0gbnVsbDtcbiAgICAgICAgICAgIHNyY0J0bi5idXR0b25FbC5jbGljaygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb25PdXRzaWRlID0gKGU6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoIXNyY0Ryb3Bkb3duIHx8ICFkb2N1bWVudC5jb250YWlucyhzcmNEcm9wZG93bikpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb25PdXRzaWRlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFzcmNEcm9wZG93bi5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKSAmJiAhc3JjQnRuLmJ1dHRvbkVsLmNvbnRhaW5zKGUudGFyZ2V0IGFzIE5vZGUpKSB7XG4gICAgICAgICAgICBzcmNEcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgICAgIHNyY0Ryb3Bkb3duID0gbnVsbDtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb25PdXRzaWRlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb25PdXRzaWRlKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlYWN0KHJlYWN0aW9uOiBzdHJpbmcpIHtcbiAgICBhd2FpdCB0aGlzLnNhdmVUaXRsZSgpO1xuICAgIGF3YWl0IHRoaXMuc2F2ZUJvZHlFZGl0cygpO1xuICAgIHRoaXMucHJvZ3Jlc3NMb2cucHVzaCh0aGlzLnJlYWN0aW9uQ29sb3IocmVhY3Rpb24pKTtcbiAgICBpZiAocmVhY3Rpb24gPT09IFwic2tpcFwiKSB7XG4gICAgICB0aGlzLnJldmlld2VkSW5TZXNzaW9uLmFkZCh0aGlzLm5vdGUuZmlsZXBhdGgpO1xuICAgICAgYXdhaXQgdGhpcy5zaG93TmV4dE5vdGUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5yZXZpZXdlZEluU2Vzc2lvbi5hZGQodGhpcy5ub3RlLmZpbGVwYXRoKTtcbiAgICB0aGlzLnBsdWdpbi5kYXRhLnJldmlld0hpc3RvcnkgPSB0aGlzLnBsdWdpbi5kYXRhLnJldmlld0hpc3RvcnkgPz8gW107XG4gICAgdGhpcy5wbHVnaW4uZGF0YS5yZXZpZXdIaXN0b3J5LnB1c2goe1xuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTkpLFxuICAgICAgbm90ZVBhdGg6IHRoaXMubm90ZS5maWxlcGF0aCxcbiAgICAgIHJlYWN0aW9uLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVhY3Rpb25zID0gZ2V0QWN0aXZlUmVhY3Rpb25zKHRoaXMucGx1Z2luLnNldHRpbmdzKTtcbiAgICBjb25zdCBuZXdJbnRlcnZhbCA9IG5leHRJbnRlcnZhbCh0aGlzLm5vdGUsIHJlYWN0aW9uLCByZWFjdGlvbnMpO1xuICAgIGNvbnN0IHVwZGF0ZWROb3RlOiBOb3RlUmVjb3JkID0ge1xuICAgICAgLi4udGhpcy5ub3RlLFxuICAgICAgaW50ZXJ2YWw6IG5ld0ludGVydmFsLFxuICAgICAgZWFzZUZhY3RvcjogbmV4dEVhc2VGYWN0b3IodGhpcy5ub3RlLCByZWFjdGlvbiwgcmVhY3Rpb25zKSxcbiAgICAgIGxhc3RSZXZpZXdlZE9uOiB0b2RheSgpLFxuICAgICAgcmV2aWV3ZWRDb3VudDogdGhpcy5ub3RlLnJldmlld2VkQ291bnQgKyAxLFxuICAgICAgbm90ZVN0YXRlOiByZWFjdGlvbixcbiAgICB9O1xuICAgIHRoaXMubm90ZSA9IHVwZGF0ZWROb3RlO1xuICAgIGF3YWl0IHdyaXRlTm90ZVJlY29yZCh0aGlzLnBsdWdpbiwgdGhpcy5ub3RlLmZpbGVwYXRoLCB1cGRhdGVkTm90ZSk7XG4gICAgYXdhaXQgc2F2ZVN0b3JlKHRoaXMucGx1Z2luLCB0aGlzLnBsdWdpbi5kYXRhKTtcbiAgICBhd2FpdCB0aGlzLnNob3dOZXh0Tm90ZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBhcmNoaXZlTm90ZSgpIHtcbiAgICBhd2FpdCB0aGlzLnNhdmVUaXRsZSgpO1xuICAgIGF3YWl0IHRoaXMuc2F2ZUJvZHlFZGl0cygpO1xuICAgIHRoaXMucHJvZ3Jlc3NMb2cucHVzaCh0aGlzLnJlYWN0aW9uQ29sb3IoXCJhcmNoaXZlXCIpKTtcbiAgICBhd2FpdCB3cml0ZU5vdGVSZWNvcmQodGhpcy5wbHVnaW4sIHRoaXMubm90ZS5maWxlcGF0aCwgeyBpbnRlcnZhbDogLTEgfSk7XG4gICAgYXdhaXQgdGhpcy5zaG93TmV4dE5vdGUoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2hvd05leHROb3RlKCkge1xuICAgIGxldCBhbGxOb3RlcyA9IGdldE5vdGVzRnJvbVZhdWx0KHRoaXMucGx1Z2luKS5maWx0ZXIoXG4gICAgICAobikgPT4gbi5pbnRlcnZhbCA+PSAwICYmICF0aGlzLnJldmlld2VkSW5TZXNzaW9uLmhhcyhuLmZpbGVwYXRoKSxcbiAgICApO1xuICAgIGlmICh0aGlzLmFjdGl2ZVNvdXJjZXMubGVuZ3RoID4gMCkge1xuICAgICAgYWxsTm90ZXMgPSBhbGxOb3Rlcy5maWx0ZXIoKG4pID0+IHRoaXMuYWN0aXZlU291cmNlcy5zb21lKChzcmMpID0+IG4uZmlsZXBhdGguc3RhcnRzV2l0aChzcmMgKyBcIi9cIikpKTtcbiAgICB9XG4gICAgY29uc3Qgbm90ZSA9IHBpY2tOb3RlVG9SZXZpZXcoYWxsTm90ZXMsIHRoaXMucGx1Z2luLnNldHRpbmdzKTtcbiAgICBpZiAoIW5vdGUpIHtcbiAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgY29udGVudEVsLmVtcHR5KCk7XG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiQWxsIGNhdWdodCB1cCFcIiB9KTtcbiAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIG1vcmUgbm90ZXMgZHVlLiBDbG9zZSB0aGlzIG1vZGFsIHRvIGV4aXQuXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMubm90ZSA9IG5vdGU7XG4gICAgYXdhaXQgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZGVsZXRlTm90ZSgpIHtcbiAgICBhd2FpdCB0aGlzLnNhdmVUaXRsZSgpO1xuICAgIHRoaXMucHJvZ3Jlc3NMb2cucHVzaCh0aGlzLnJlYWN0aW9uQ29sb3IoXCJkZWxldGVcIikpO1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZTtcbiAgICBpZiAoZmlsZSkge1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuZGVsZXRlKGZpbGUpO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLnNob3dOZXh0Tm90ZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWFjdGlvbkNvbG9yKHJlYWN0aW9uOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN5c3RlbUNvbG9yczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgIHJvdXRlOiBcInNwYWNlZC1zZWctYmx1ZVwiLFxuICAgICAgYXJjaGl2ZTogXCJzcGFjZWQtc2VnLXllbGxvd1wiLFxuICAgICAgZGVsZXRlOiBcInNwYWNlZC1zZWctcmVkXCIsXG4gICAgICBza2lwOiBcInNwYWNlZC1zZWctc2tpcFwiLFxuICAgIH07XG4gICAgaWYgKHN5c3RlbUNvbG9yc1tyZWFjdGlvbl0pIHJldHVybiBzeXN0ZW1Db2xvcnNbcmVhY3Rpb25dO1xuXG4gICAgY29uc3QgcmVhY3Rpb25zID0gZ2V0QWN0aXZlUmVhY3Rpb25zKHRoaXMucGx1Z2luLnNldHRpbmdzKTtcbiAgICBjb25zdCByZWFjdGlvbkRlZiA9IHJlYWN0aW9ucy5maW5kKChyKSA9PiByLmlkID09PSByZWFjdGlvbik7XG4gICAgaWYgKHJlYWN0aW9uRGVmPy5jb2xvcikgcmV0dXJuIHJlYWN0aW9uRGVmLmNvbG9yO1xuXG4gICAgY29uc3QgcmFtcCA9IFtcbiAgICAgIFwic3BhY2VkLXNlZy1wdXJwbGVcIixcbiAgICAgIFwic3BhY2VkLXNlZy1ibHVlXCIsXG4gICAgICBcInNwYWNlZC1zZWctZ3JlZW5cIixcbiAgICAgIFwic3BhY2VkLXNlZy15ZWxsb3dcIixcbiAgICAgIFwic3BhY2VkLXNlZy1vcmFuZ2VcIixcbiAgICAgIFwic3BhY2VkLXNlZy1yZWRcIixcbiAgICBdO1xuICAgIGNvbnN0IGlkeCA9IHJlYWN0aW9uRGVmID8gcmVhY3Rpb25zLmluZGV4T2YocmVhY3Rpb25EZWYpIDogLTE7XG4gICAgaWYgKGlkeCA9PT0gLTEpIHJldHVybiBcIlwiO1xuICAgIGNvbnN0IHQgPSByZWFjdGlvbnMubGVuZ3RoID09PSAxID8gMC41IDogaWR4IC8gKHJlYWN0aW9ucy5sZW5ndGggLSAxKTtcbiAgICByZXR1cm4gcmFtcFtNYXRoLnJvdW5kKHQgKiAocmFtcC5sZW5ndGggLSAxKSldO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFByb2dyZXNzU2VnbWVudHMoKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IHNlZ21lbnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zZXNzaW9uU2l6ZTsgaSsrKSB7XG4gICAgICBzZWdtZW50cy5wdXNoKHRoaXMucHJvZ3Jlc3NMb2dbaV0gPz8gXCJcIik7XG4gICAgfVxuICAgIHJldHVybiBzZWdtZW50cztcbiAgfVxuXG4gIHByaXZhdGUgcmVmcmVzaFNlc3Npb25TaXplKCk6IHZvaWQge1xuICAgIGxldCBhbGxOb3RlcyA9IGdldE5vdGVzRnJvbVZhdWx0KHRoaXMucGx1Z2luKS5maWx0ZXIoKG4pID0+IG4uaW50ZXJ2YWwgPj0gMCk7XG4gICAgaWYgKHRoaXMuYWN0aXZlU291cmNlcy5sZW5ndGggPiAwKSB7XG4gICAgICBhbGxOb3RlcyA9IGFsbE5vdGVzLmZpbHRlcigobikgPT4gdGhpcy5hY3RpdmVTb3VyY2VzLnNvbWUoKHNyYykgPT4gbi5maWxlcGF0aC5zdGFydHNXaXRoKHNyYyArIFwiL1wiKSkpO1xuICAgIH1cbiAgICBjb25zdCByZW1haW5pbmdEdWUgPSBhbGxOb3Rlcy5maWx0ZXIoKG4pID0+IG5vdGVJc0R1ZShuKSAmJiAhdGhpcy5yZXZpZXdlZEluU2Vzc2lvbi5oYXMobi5maWxlcGF0aCkpLmxlbmd0aDtcbiAgICB0aGlzLnNlc3Npb25TaXplID0gdGhpcy5wcm9ncmVzc0xvZy5sZW5ndGggKyByZW1haW5pbmdEdWU7XG4gICAgdGhpcy5yZWZyZXNoUHJvZ3Jlc3NCYXIoKTsgLy8gdXBkYXRlcyBkdWUgY291bnQgdGV4dCArIHJlZHJhd3MgYmFyXG4gIH1cblxuICBwdWJsaWMgcmVzdW1lU2Vzc2lvbihzZXNzaW9uOiBTcnNTZXNzaW9uKSB7XG4gICAgdGhpcy5yZXZpZXdlZEluU2Vzc2lvbiA9IG5ldyBTZXQoc2Vzc2lvbi5yZXZpZXdlZEZpbGVwYXRocyk7XG4gICAgdGhpcy5wcm9ncmVzc0xvZyA9IFsuLi5zZXNzaW9uLnByb2dyZXNzTG9nXTtcbiAgICB0aGlzLnNlc3Npb25TaXplID0gc2Vzc2lvbi5zZXNzaW9uU2l6ZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBvblNlc3Npb25DbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zZXNzaW9uU2l6ZSA+IDApIHtcbiAgICAgIGlmICh0aGlzLnJldmlld2VkSW5TZXNzaW9uLnNpemUgPCB0aGlzLnNlc3Npb25TaXplKSB7XG4gICAgICAgIHRoaXMucGx1Z2luLmRhdGEuc3JzU2Vzc2lvbiA9IHtcbiAgICAgICAgICByZXZpZXdlZEZpbGVwYXRoczogWy4uLnRoaXMucmV2aWV3ZWRJblNlc3Npb25dLFxuICAgICAgICAgIHByb2dyZXNzTG9nOiBbLi4udGhpcy5wcm9ncmVzc0xvZ10sXG4gICAgICAgICAgc2Vzc2lvblNpemU6IHRoaXMuc2Vzc2lvblNpemUsXG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgdGhpcy5wbHVnaW4uZGF0YS5zcnNTZXNzaW9uO1xuICAgICAgfVxuICAgICAgdm9pZCBzYXZlU3RvcmUodGhpcy5wbHVnaW4sIHRoaXMucGx1Z2luLmRhdGEpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmb3JtYXRJbnRlcnZhbChkYXlzOiBudW1iZXIpOiBzdHJpbmcge1xuICBpZiAoZGF5cyA8IDcpIHJldHVybiBgJHtkYXlzfWRgO1xuICBpZiAoZGF5cyA8IDMwKSByZXR1cm4gYCR7TWF0aC5yb3VuZChkYXlzIC8gNyl9d2A7XG4gIGlmIChkYXlzIDwgMzY1KSByZXR1cm4gYCR7TWF0aC5yb3VuZChkYXlzIC8gMzApfW1vYDtcbiAgcmV0dXJuIGAke01hdGgucm91bmQoZGF5cyAvIDM2NSl9eWA7XG59XG4iLCAiLy9cdTIxOTAgTm90ZVJlY29yZCwgUGx1Z2luRGF0YSwgU2V0dGluZ3MgaW50ZXJmYWNlc1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCYXNlTm90ZSB7XHJcbiAgZmlsZXBhdGg6IHN0cmluZztcclxuICBhY3RpdmU/OiBib29sZWFuO1xyXG59ICBcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTm90ZVJlY29yZCBleHRlbmRzIEJhc2VOb3RlIHtcclxuICBlYXNlRmFjdG9yOiBudW1iZXI7XHJcbiAgaW50ZXJ2YWw6IG51bWJlcjtcclxuICBsYXN0UmV2aWV3ZWRPbjogc3RyaW5nO1xyXG4gIGNyZWF0ZWRPbjogc3RyaW5nO1xyXG4gIHJldmlld2VkQ291bnQ6IG51bWJlcjtcclxuICBub3RlU3RhdGU6IE5vdGVTdGF0ZTtcclxuICBkZWNrcz86IHN0cmluZ1tdO1xyXG59ICBcclxuXHJcbmV4cG9ydCB0eXBlIEVuZXJneUNvbG9yID0gXCJcdUQ4M0RcdUREMjVcIiB8IFwiXHVEODNFXHVERTk0XCIgfCBcIlx1RDgzQ1x1REYwQVwiIHwgXCJcdUQ4M0NcdURGM0ZcIjsgIFxyXG5leHBvcnQgdHlwZSBEYXlOYW1lID0gXCJTdW5cIiB8IFwiTW9uXCIgfCBcIlR1ZVwiIHwgXCJXZWRcIiB8IFwiVGh1XCIgfCBcIkZyaVwiIHwgXCJTYXRcIjtcclxuIFxyXG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvbk5vdGUgZXh0ZW5kcyBCYXNlTm90ZSB7ICBcclxuICBlbmVyZ3k/OiBFbmVyZ3lDb2xvciB8IEVuZXJneUNvbG9yW107ICBcclxuICB0aW1lYmxvY2s/OiBzdHJpbmcgfCBzdHJpbmdbXTsgIFxyXG4gIGR1ZT86IHN0cmluZzsgIFxyXG4gIGNvbnRleHQ/OiBzdHJpbmcgfCBzdHJpbmdbXTsgIFxyXG4gIHRpbWVzY29wZT86IFwiZGFpbHlcIiB8IFwiZXZlcnktb3RoZXItZGF5XCIgfCBcIndlZWtseVwiIHwgXCJldmVyeS1vdGhlci13ZWVrXCIgfCBcIm1vbnRobHlcIiB8IFwic2Vhc29uYWxcIiB8IFwieWVhcmx5XCI7ICBcclxuICBsYXN0X2NvbXBsZXRlZD86IHN0cmluZzsgICAvLyBZWVlZLU1NLUREICBcclxuICBza2lwcGVkPzogbnVtYmVyOyAgXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3VzdG9tUmVhY3Rpb25TZXQge1xyXG4gIGlkOiBzdHJpbmc7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG4gIHJlYWN0aW9uczogUmVhY3Rpb25EZWZpbml0aW9uW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3JhbVNlc3Npb24ge1xyXG4gIHJlbWFpbmluZzogc3RyaW5nW107IC8vIGZpbGVwYXRoc1xyXG4gIGZhaWxlZDogc3RyaW5nW107IC8vIGZpbGVwYXRoc1xyXG4gIHByb2dyZXNzTG9nOiAoXCJwYXNzXCIgfCBcImZhaWxcIilbXTtcclxuICBjdXJyZW50Um91bmRTaXplOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU3lzdGVtU2Vzc2lvbiB7XHJcbiAgcmVtYWluaW5nOiBzdHJpbmdbXTtcclxuICBmYWlsZWQ6IHN0cmluZ1tdO1xyXG4gIHByb2dyZXNzTG9nOiAoXCJwYXNzXCIgfCBcImZhaWxcIiB8IFwic2tpcFwiKVtdO1xyXG4gIGN1cnJlbnRSb3VuZFNpemU6IG51bWJlcjtcclxuICBlbmVyZ3lMZXZlbDogXCJoaWdoXCIgfCBcImxvd1wiIHwgbnVsbDtcclxuICBhY3RpdmVUaW1lYmxvY2tzOiBzdHJpbmdbXTtcclxuICBhY3RpdmVDb250ZXh0czogc3RyaW5nW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVhY3Rpb25EZWZpbml0aW9uIHtcclxuICBpZDogc3RyaW5nOyAvLyBzdG9yZWQgaW4gbm90ZVN0YXRlIGZyb250bWF0dGVyIChlLmcuIFwiZXhjaXRpbmdcIiwgXCJteS1jdXN0b21cIilcclxuICBsYWJlbDogc3RyaW5nOyAvLyBzaG93biBvbiB0aGUgYnV0dG9uXHJcbiAgbWFudWFsT3ZlcnJpZGU/OiBib29sZWFuO1xyXG4gIGludGVydmFsTXVsdD86IG51bWJlcjsgLy8gZGlyZWN0IG11bHRpcGxpZXI6IDwxIHNocmlua3MgKGUuZy4gMC41ID0gaGFsdmUpLCA+MSBncm93cyAoZS5nLiAzLjAgPSB0cmlwbGUpXHJcbiAgZWFzZURlbHRhPzogbnVtYmVyOyAvLyByZXBsYWNlcyB0aGUgbGVycCdkIGRlbHRhIChlLmcuICsxMCBvciAtMTUpXHJcbiAgY29sb3I/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIFJlYWN0aW9uU2V0TW9kZSA9IFwiZGVmYXVsdFwiIHwgXCJhbmtpXCIgfCAoc3RyaW5nICYge30pO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTb3VyY2VGb2xkZXIge1xyXG4gIHBhdGg6IHN0cmluZztcclxuICB3ZWlnaHQ6IG51bWJlcjsgLy8gcGVyY2VudGFnZSwgZS5nLiAxMDAgPSBub3JtYWwsIDUwID0gaGFsZiB3ZWlnaHRcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgTm90ZVN0YXRlID0gc3RyaW5nO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXZpZXdFdmVudCB7XHJcbiAgdGltZXN0YW1wOiBzdHJpbmc7XHJcbiAgbm90ZVBhdGg6IHN0cmluZztcclxuICByZWFjdGlvbjogTm90ZVN0YXRlO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNyc1Nlc3Npb24ge1xyXG4gIHJldmlld2VkRmlsZXBhdGhzOiBzdHJpbmdbXTtcclxuICBwcm9ncmVzc0xvZzogc3RyaW5nW107XHJcbiAgc2Vzc2lvblNpemU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTcnNSZWNvcmQge1xyXG4gIGVhc2VGYWN0b3I6IG51bWJlcjtcclxuICBpbnRlcnZhbDogbnVtYmVyO1xyXG4gIGxhc3RSZXZpZXdlZE9uOiBzdHJpbmc7XHJcbiAgY3JlYXRlZE9uOiBzdHJpbmc7XHJcbiAgcmV2aWV3ZWRDb3VudDogbnVtYmVyO1xyXG4gIG5vdGVTdGF0ZTogTm90ZVN0YXRlO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBsdWdpbkRhdGEge1xyXG4gIHJldmlld0xvYWRMb2c6IEFycmF5PHsgdGltZXN0YW1wOiBzdHJpbmc7IG51bU5vdGVzOiBudW1iZXI7IG51bUR1ZTogbnVtYmVyIH0+O1xyXG4gIHJldmlld0hpc3Rvcnk6IFJldmlld0V2ZW50W107XHJcbiAgY3JhbVNlc3Npb25zPzogUmVjb3JkPHN0cmluZywgQ3JhbVNlc3Npb24+O1xyXG4gIGRlY2tMYXN0VXNlZD86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XHJcbiAgc3JzU2Vzc2lvbj86IFNyc1Nlc3Npb247XHJcbiAgc3lzdGVtU2Vzc2lvbj86IFN5c3RlbVNlc3Npb247XHJcbiAgbm90ZVJlY29yZHM6IFJlY29yZDxzdHJpbmcsIFNyc1JlY29yZD47XHJcbiAgc3lzdGVtU2tpcHBlZFRvZGF5PzogeyBkYXRlOiBzdHJpbmc7IGZpbGVwYXRoczogc3RyaW5nW10gfTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3Mge1xyXG4gIHNvdXJjZVNjb3BlOiBcInZhdWx0XCIgfCBcImZvbGRlclwiO1xyXG4gIHNvdXJjZUZvbGRlcnM6IFNvdXJjZUZvbGRlcltdO1xyXG4gIGV2ZXJncmVlbkZvbGRlcjogc3RyaW5nO1xyXG4gIGluaXRpYWxJbnRlcnZhbDogbnVtYmVyO1xyXG4gIGRlZmF1bHRFYXNlRmFjdG9yOiBudW1iZXI7XHJcbiAgcmVuYW1lRm9sZGVyV2l0aERlY2s6IGJvb2xlYW47XHJcbiAgcmVjZW50VW5kdWVUaHJlc2hvbGQ6IG51bWJlcjtcclxuICBleGNpdGluZ1RocmVzaG9sZDogbnVtYmVyO1xyXG4gIHJlYWN0aW9uU2V0TW9kZTogUmVhY3Rpb25TZXRNb2RlO1xyXG4gIHdlZWtlbmREYXlzOiBEYXlOYW1lW107XHJcbiAgY3VzdG9tUmVhY3Rpb25TZXRzOiBDdXN0b21SZWFjdGlvblNldFtdO1xyXG4gIG5vdGVTdGF0ZVZhbHVlczogc3RyaW5nW107XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3MgPSB7XHJcbiAgc291cmNlU2NvcGU6IFwidmF1bHRcIixcclxuICBzb3VyY2VGb2xkZXJzOiBbXSxcclxuICBldmVyZ3JlZW5Gb2xkZXI6IFwiRXZlcmdyZWVuXCIsXHJcbiAgaW5pdGlhbEludGVydmFsOiAxLFxyXG4gIGRlZmF1bHRFYXNlRmFjdG9yOiAzMDAsXHJcbiAgcmVuYW1lRm9sZGVyV2l0aERlY2s6IHRydWUsXHJcbiAgcmVjZW50VW5kdWVUaHJlc2hvbGQ6IDAuNSxcclxuICBleGNpdGluZ1RocmVzaG9sZDogMC43LFxyXG4gIHJlYWN0aW9uU2V0TW9kZTogXCJkZWZhdWx0XCIsXHJcbiAgY3VzdG9tUmVhY3Rpb25TZXRzOiBbXSxcclxuICB3ZWVrZW5kRGF5czogW1wiU2F0XCIsIFwiU3VuXCJdLFxyXG4gIG5vdGVTdGF0ZVZhbHVlczogW1wiXHVEODNDXHVERjMxXCIsIFwiXHVEODNDXHVERjNGXCIsIFwiXHVEODNDXHVERjMyXCJdLFxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IFBSRVNFVF9ERUZBVUxUOiBSZWFjdGlvbkRlZmluaXRpb25bXSA9IFtcclxuICB7IGlkOiBcImV4Y2l0aW5nXCIsIGxhYmVsOiBcIkV4Y2l0aW5nXCIgfSxcclxuICB7IGlkOiBcImludGVyZXN0aW5nXCIsIGxhYmVsOiBcIkludGVyZXN0aW5nXCIgfSxcclxuICB7IGlkOiBcInllYWhcIiwgbGFiZWw6IFwiWWVhaFwiIH0sXHJcbiAgeyBpZDogXCJsb2xcIiwgbGFiZWw6IFwiTG9sXCIgfSxcclxuICB7IGlkOiBcIm1laFwiLCBsYWJlbDogXCJNZWhcIiB9LFxyXG4gIHsgaWQ6IFwiY3JpbmdlXCIsIGxhYmVsOiBcIkNyaW5nZVwiIH0sXHJcbiAgeyBpZDogXCJ0YXhpbmdcIiwgbGFiZWw6IFwiVGF4aW5nXCIgfSxcclxuXTtcclxuXHJcbmV4cG9ydCBjb25zdCBQUkVTRVRfQU5LSTogUmVhY3Rpb25EZWZpbml0aW9uW10gPSBbXHJcbiAgeyBpZDogXCJlYXN5XCIsIGxhYmVsOiBcIkVhc3lcIiB9LFxyXG4gIHsgaWQ6IFwiZ29vZFwiLCBsYWJlbDogXCJHb29kXCIgfSxcclxuICB7IGlkOiBcImhhcmRcIiwgbGFiZWw6IFwiSGFyZFwiIH0sXHJcbiAgeyBpZDogXCJhZ2FpblwiLCBsYWJlbDogXCJBZ2FpblwiIH0sXHJcbl07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aXZlUmVhY3Rpb25zKHNldHRpbmdzOiBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3MpOiBSZWFjdGlvbkRlZmluaXRpb25bXSB7XHJcbiAgaWYgKHNldHRpbmdzLnJlYWN0aW9uU2V0TW9kZSA9PT0gXCJhbmtpXCIpIHJldHVybiBQUkVTRVRfQU5LSTtcclxuICBjb25zdCBhY3RpdmVTZXQgPSBzZXR0aW5ncy5jdXN0b21SZWFjdGlvblNldHM/LmZpbmQoKHMpID0+IHMuaWQgPT09IHNldHRpbmdzLnJlYWN0aW9uU2V0TW9kZSk7XHJcbiAgaWYgKGFjdGl2ZVNldCkgcmV0dXJuIGFjdGl2ZVNldC5yZWFjdGlvbnM7XHJcbiAgcmV0dXJuIFBSRVNFVF9ERUZBVUxUO1xyXG59IiwgImltcG9ydCB7IEFwcCwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgTm90ZVJlY29yZCwgU3BhY2VkRXZlcnl0aGluZ1NldHRpbmdzLCBEYXlOYW1lLCBBY3Rpb25Ob3RlLCBFbmVyZ3lDb2xvciB9IGZyb20gXCIuL3R5cGVzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdG9kYXkoKTogc3RyaW5nIHtcclxuICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbERlY2tOYW1lcyhhcHA6IEFwcCk6IHN0cmluZ1tdIHtcclxuICBjb25zdCBkZWNrU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgZm9yIChjb25zdCBmaWxlIG9mIGFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkpIHtcclxuICAgIGNvbnN0IGRlY2tzID0gYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcj8uZGVja3M7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkZWNrcykpXHJcbiAgICAgIGRlY2tzLmZvckVhY2goKGQ6IHN0cmluZykgPT4ge1xyXG4gICAgICAgIGlmIChkKSBkZWNrU2V0LmFkZChkKTtcclxuICAgICAgfSk7XHJcbiAgICBlbHNlIGlmICh0eXBlb2YgZGVja3MgPT09IFwic3RyaW5nXCIgJiYgZGVja3MpIGRlY2tTZXQuYWRkKGRlY2tzKTtcclxuICB9XHJcbiAgcmV0dXJuIEFycmF5LmZyb20oZGVja1NldCkuc29ydCgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2h1ZmZsZUFycmF5PFQ+KGFycjogVFtdKTogVFtdIHtcclxuICBjb25zdCBhID0gWy4uLmFycl07XHJcbiAgZm9yIChsZXQgaSA9IGEubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xyXG4gICAgY29uc3QgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpO1xyXG4gICAgW2FbaV0sIGFbal1dID0gW2Fbal0sIGFbaV1dO1xyXG4gIH1cclxuICByZXR1cm4gYTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGl2ZU5vdGVzKGFwcDogQXBwLCBub3RlczogTm90ZVJlY29yZFtdKTogTm90ZVJlY29yZFtdIHtcclxuICByZXR1cm4gbm90ZXMuZmlsdGVyKChuKSA9PiB7XHJcbiAgICBjb25zdCBmID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChuLmZpbGVwYXRoKSBhcyBURmlsZSB8IG51bGw7XHJcbiAgICByZXR1cm4gZiA/IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmKT8uZnJvbnRtYXR0ZXI/LmFjdGl2ZSA9PT0gdHJ1ZSA6IGZhbHNlO1xyXG4gIH0pO1xyXG59XHJcblxyXG5jb25zdCBEQVlfTkFNRVM6IERheU5hbWVbXSA9IFtcIlN1blwiLCBcIk1vblwiLCBcIlR1ZVwiLCBcIldlZFwiLCBcIlRodVwiLCBcIkZyaVwiLCBcIlNhdFwiXTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDdXJyZW50RGF5TmFtZSgpOiBEYXlOYW1lIHtcclxuICByZXR1cm4gREFZX05BTUVTW25ldyBEYXRlKCkuZ2V0RGF5KCldO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaXNXZWVrZW5kKHNldHRpbmdzOiBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3MpOiBib29sZWFuIHtcclxuICByZXR1cm4gc2V0dGluZ3Mud2Vla2VuZERheXMuaW5jbHVkZXMoZ2V0Q3VycmVudERheU5hbWUoKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDdXJyZW50VGltZWJsb2NrKCk6IFwibW9ybmluZ1wiIHwgXCJhZnRlcm5vb25cIiB8IFwiZXZlbmluZ1wiIHwgXCJuaWdodFwiIHtcclxuICBjb25zdCBob3VyID0gbmV3IERhdGUoKS5nZXRIb3VycygpO1xyXG4gIGlmIChob3VyID49IDUgJiYgaG91ciA8IDEyKSByZXR1cm4gXCJtb3JuaW5nXCI7XHJcbiAgaWYgKGhvdXIgPj0gMTIgJiYgaG91ciA8IDE3KSByZXR1cm4gXCJhZnRlcm5vb25cIjtcclxuICBpZiAoaG91ciA+PSAxNyAmJiBob3VyIDwgMjEpIHJldHVybiBcImV2ZW5pbmdcIjtcclxuICByZXR1cm4gXCJuaWdodFwiO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyQnlFbmVyZ3lMZXZlbChub3RlczogQWN0aW9uTm90ZVtdLCBsZXZlbDogXCJoaWdoXCIgfCBcImxvd1wiKTogQWN0aW9uTm90ZVtdIHtcclxuICBjb25zdCBoaWdoQ29sb3JzOiBFbmVyZ3lDb2xvcltdID0gW1wiXHVEODNEXHVERDI1XCIsIFwiXHVEODNDXHVERjNGXCJdO1xyXG4gIGNvbnN0IGxvd0NvbG9yczogRW5lcmd5Q29sb3JbXSA9IFtcIlx1RDgzRVx1REU5NFwiLCBcIlx1RDgzQ1x1REYwQVwiXTtcclxuICBjb25zdCBhbGxvd2VkID0gbGV2ZWwgPT09IFwiaGlnaFwiID8gWy4uLmhpZ2hDb2xvcnMsIC4uLmxvd0NvbG9yc10gOiBsb3dDb2xvcnM7XHJcbiAgcmV0dXJuIG5vdGVzLmZpbHRlcigobikgPT4ge1xyXG4gICAgaWYgKCFuLmVuZXJneSkgcmV0dXJuIHRydWU7XHJcbiAgICBjb25zdCBlbmVyZ2llcyA9IEFycmF5LmlzQXJyYXkobi5lbmVyZ3kpID8gbi5lbmVyZ3kgOiBbbi5lbmVyZ3ldO1xyXG4gICAgcmV0dXJuIGVuZXJnaWVzLnNvbWUoKGUpID0+IGFsbG93ZWQuaW5jbHVkZXMoZSkpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyQnlUaW1lYmxvY2sobm90ZXM6IEFjdGlvbk5vdGVbXSwgdGltZWJsb2Nrczogc3RyaW5nW10pOiBBY3Rpb25Ob3RlW10ge1xyXG4gIGlmICh0aW1lYmxvY2tzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG5vdGVzOyAvLyBlbXB0eSA9IG5vIGZpbHRlciwgc2hvdyBhbGxcclxuICByZXR1cm4gbm90ZXMuZmlsdGVyKChuKSA9PiB7XHJcbiAgICBpZiAoIW4udGltZWJsb2NrKSByZXR1cm4gdHJ1ZTtcclxuICAgIGNvbnN0IGJsb2NrcyA9IEFycmF5LmlzQXJyYXkobi50aW1lYmxvY2spID8gbi50aW1lYmxvY2sgOiBbbi50aW1lYmxvY2tdO1xyXG4gICAgcmV0dXJuIGJsb2Nrcy5zb21lKChiKSA9PiB0aW1lYmxvY2tzLmluY2x1ZGVzKGIpKTtcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckJ5Q29udGV4dChub3RlczogQWN0aW9uTm90ZVtdLCBjb250ZXh0czogc3RyaW5nW10pOiBBY3Rpb25Ob3RlW10ge1xyXG4gIGlmIChjb250ZXh0cy5sZW5ndGggPT09IDApIHJldHVybiBub3RlcztcclxuICByZXR1cm4gbm90ZXMuZmlsdGVyKChuKSA9PiB7XHJcbiAgICBpZiAoIW4uY29udGV4dCkgcmV0dXJuIHRydWU7XHJcbiAgICBjb25zdCBub3RlQ29udGV4dHMgPSBBcnJheS5pc0FycmF5KG4uY29udGV4dCkgPyBuLmNvbnRleHQgOiBbbi5jb250ZXh0XTtcclxuICAgIHJldHVybiBub3RlQ29udGV4dHMuc29tZSgoYykgPT4gY29udGV4dHMuaW5jbHVkZXMoYykpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsQ29udGV4dFZhbHVlcyhhcHA6IEFwcCk6IHN0cmluZ1tdIHtcclxuICBjb25zdCBjb250ZXh0U2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgZm9yIChjb25zdCBmaWxlIG9mIGFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkpIHtcclxuICAgIGNvbnN0IGZtID0gYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcclxuICAgIGlmICghZm0/LmFjdGl2ZSkgY29udGludWU7XHJcbiAgICBjb25zdCBjdHggPSBmbT8uY29udGV4dDtcclxuICAgIGlmIChBcnJheS5pc0FycmF5KGN0eCkpXHJcbiAgICAgIGN0eC5mb3JFYWNoKChjOiBzdHJpbmcpID0+IHtcclxuICAgICAgICBpZiAoYykgY29udGV4dFNldC5hZGQoYyk7XHJcbiAgICAgIH0pO1xyXG4gICAgZWxzZSBpZiAodHlwZW9mIGN0eCA9PT0gXCJzdHJpbmdcIiAmJiBjdHgpIGNvbnRleHRTZXQuYWRkKGN0eCk7XHJcbiAgfVxyXG4gIHJldHVybiBBcnJheS5mcm9tKGNvbnRleHRTZXQpLnNvcnQoKTtcclxufVxyXG5cclxuY29uc3QgdGltZXNjb3BlX0RBWVM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcbiAgZGFpbHk6IDEsXHJcbiAgXCJldmVyeS1vdGhlci1kYXlcIjogMixcclxuICB3ZWVrbHk6IDcsXHJcbiAgXCJldmVyeS1vdGhlci13ZWVrXCI6IDE0LFxyXG4gIG1vbnRobHk6IDMwLFxyXG4gIHNlYXNvbmFsOiA5MSxcclxuICB5ZWFybHk6IDM2NSxcclxufTtcclxuZXhwb3J0IGZ1bmN0aW9uIGlzRHVlKGZtOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IGJvb2xlYW4ge1xyXG4gIGNvbnN0IGZyZXEgPSBmbS50aW1lc2NvcGUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gIGlmICghZnJlcSkgcmV0dXJuIGZhbHNlO1xyXG4gIGNvbnN0IGludGVydmFsID0gdGltZXNjb3BlX0RBWVNbZnJlcV07XHJcbiAgaWYgKCFpbnRlcnZhbCkgcmV0dXJuIGZhbHNlO1xyXG4gIGNvbnN0IGxhc3QgPSBmbS5sYXN0X2NvbXBsZXRlZCBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgaWYgKCFsYXN0KSByZXR1cm4gdHJ1ZTtcclxuICBjb25zdCBkYXlzU2luY2UgPSBNYXRoLmZsb29yKChuZXcgRGF0ZSh0b2RheSgpKS5nZXRUaW1lKCkgLSBuZXcgRGF0ZShsYXN0KS5nZXRUaW1lKCkpIC8gODY0MDAwMDApO1xyXG4gIHJldHVybiBkYXlzU2luY2UgPj0gaW50ZXJ2YWw7XHJcbn0iLCAiaW1wb3J0IHsgTm90ZVJlY29yZCwgUmVhY3Rpb25EZWZpbml0aW9uLCBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3MsIGdldEFjdGl2ZVJlYWN0aW9ucyB9IGZyb20gXCIuL3R5cGVzXCI7XHJcbmltcG9ydCB7IHRvZGF5IH0gZnJvbSBcIi4vdXRpbHNcIjtcclxuXHJcbmNvbnN0IE1BWF9JTlRFUlZBTCA9IDM2NTsgLy8gZGF5cyBcdTIwMTQgcHJldmVudHMgbm90ZXMgZnJvbSBkaXNhcHBlYXJpbmcgZm9yIHllYXJzICBcclxuY29uc3QgTUlOX0lOVEVSVkFMID0gMTsgICAvLyBkYXlzIFx1MjAxNCBmbG9vciBmb3IgcG9zaXRpdmUgcmVhY3Rpb25zICBcclxuY29uc3QgTUFYX0VBU0UgPSA1MDA7IC8vIHBlcmNlbnRhZ2UgXHUyMDE0IHByZXZlbnRzIHJ1bmF3YXkgYWNjZWxlcmF0aW9uXHJcblxyXG5mdW5jdGlvbiBmb2xkZXJXZWlnaHQoZmlsZXBhdGg6IHN0cmluZywgc2V0dGluZ3M6IFNwYWNlZEV2ZXJ5dGhpbmdTZXR0aW5ncyk6IG51bWJlciB7XHJcbiAgaWYgKHNldHRpbmdzLnNvdXJjZVNjb3BlICE9PSBcImZvbGRlclwiKSByZXR1cm4gMTtcclxuICBjb25zdCBlbnRyeSA9IHNldHRpbmdzLnNvdXJjZUZvbGRlcnMuZmluZCgoZSkgPT4gZmlsZXBhdGguc3RhcnRzV2l0aChlLnBhdGggKyBcIi9cIikpO1xyXG4gIHJldHVybiBlbnRyeSA/IGVudHJ5LndlaWdodCAvIDEwMCA6IDE7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBkYXlzQmV0d2VlbihhOiBzdHJpbmcsIGI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgcmV0dXJuIE1hdGguZmxvb3IoKG5ldyBEYXRlKGIpLmdldFRpbWUoKSAtIG5ldyBEYXRlKGEpLmdldFRpbWUoKSkgLyA4NjQwMDAwMCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBudW1EYXlzT3ZlcmR1ZShub3RlOiBOb3RlUmVjb3JkKTogbnVtYmVyIHtcclxuICBpZiAobm90ZS5pbnRlcnZhbCA8IDApIHJldHVybiBub3RlLmludGVydmFsO1xyXG4gIGNvbnN0IGRheXNTaW5jZVJldmlld2VkID0gZGF5c0JldHdlZW4obm90ZS5sYXN0UmV2aWV3ZWRPbiwgdG9kYXkoKSk7XHJcbiAgcmV0dXJuIGRheXNTaW5jZVJldmlld2VkIC0gbm90ZS5pbnRlcnZhbDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG5vdGVJc0R1ZShub3RlOiBOb3RlUmVjb3JkKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIG51bURheXNPdmVyZHVlKG5vdGUpID49IDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYTogbnVtYmVyLCBiOiBudW1iZXIsIHQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgcmV0dXJuIGEgKyAoYiAtIGEpICogdDtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVhY3Rpb25UKGlkOiBzdHJpbmcsIHJlYWN0aW9uczogUmVhY3Rpb25EZWZpbml0aW9uW10pOiBudW1iZXIge1xyXG4gIGNvbnN0IGlkeCA9IHJlYWN0aW9ucy5maW5kSW5kZXgoKHIpID0+IHIuaWQgPT09IGlkKTtcclxuICBpZiAoaWR4ID09PSAtMSkgcmV0dXJuIDAuNTsgLy8gdW5rbm93biByZWFjdGlvbiBcdTIxOTIgbmV1dHJhbFxyXG4gIHJldHVybiByZWFjdGlvbnMubGVuZ3RoID09PSAxID8gMC41IDogaWR4IC8gKHJlYWN0aW9ucy5sZW5ndGggLSAxKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG5leHRJbnRlcnZhbChub3RlOiBOb3RlUmVjb3JkLCByZWFjdGlvbjogc3RyaW5nLCByZWFjdGlvbnM6IFJlYWN0aW9uRGVmaW5pdGlvbltdKTogbnVtYmVyIHtcclxuICBjb25zdCB7IGludGVydmFsLCBlYXNlRmFjdG9yIH0gPSBub3RlO1xyXG4gIGlmIChyZWFjdGlvbiA9PT0gXCJza2lwXCIpIHJldHVybiBpbnRlcnZhbDtcclxuICBjb25zdCByZWFjdGlvbkRlZiA9IHJlYWN0aW9ucy5maW5kKChyKSA9PiByLmlkID09PSByZWFjdGlvbik7XHJcbiAgaWYgKHJlYWN0aW9uRGVmPy5tYW51YWxPdmVycmlkZSAmJiByZWFjdGlvbkRlZi5pbnRlcnZhbE11bHQgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIE1hdGgubWluKE1BWF9JTlRFUlZBTCwgTWF0aC5tYXgoTUlOX0lOVEVSVkFMLCBNYXRoLmZsb29yKGludGVydmFsICogcmVhY3Rpb25EZWYuaW50ZXJ2YWxNdWx0KSkpO1xyXG4gIH1cclxuICBjb25zdCBhdXRvUmVhY3Rpb25zID0gcmVhY3Rpb25zLmZpbHRlcigocikgPT4gIXIubWFudWFsT3ZlcnJpZGUpO1xyXG4gIGNvbnN0IHQgPSByZWFjdGlvblQocmVhY3Rpb24sIGF1dG9SZWFjdGlvbnMpO1xyXG4gIGxldCBtOiBudW1iZXI7XHJcbiAgaWYgKHQgPD0gMC41KSB7XHJcbiAgICAvLyBQb3NpdGl2ZSBoYWxmOiBzaHJpbmsgaW50ZXJ2YWwsIG5vIGVhc2VGYWN0b3JcclxuICAgIC8vIHQ9MCBcdTIxOTIgXHUwMEQ3MC41LCB0PTAuNSBcdTIxOTIgXHUwMEQ3MS4wXHJcbiAgICBtID0gbGVycCgwLjUsIDEuMCwgdCAqIDIpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBOZWdhdGl2ZSBoYWxmOiBncm93IGludGVydmFsIHVzaW5nIGVhc2VGYWN0b3JcclxuICAgIC8vIHQ9MC41IFx1MjE5MiBcdTAwRDcxLjAsIHQ9MSBcdTIxOTIgXHUwMEQ3KGVhc2VGYWN0b3IvMTAwKVxyXG4gICAgbSA9IGxlcnAoMS4wLCBlYXNlRmFjdG9yIC8gMTAwLCAodCAtIDAuNSkgKiAyKTtcclxuICB9XHJcbiAgcmV0dXJuIE1hdGgubWluKE1BWF9JTlRFUlZBTCwgTWF0aC5tYXgoTUlOX0lOVEVSVkFMLCBNYXRoLmZsb29yKGludGVydmFsICogbSkpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG5leHRFYXNlRmFjdG9yKG5vdGU6IE5vdGVSZWNvcmQsIHJlYWN0aW9uOiBzdHJpbmcsIHJlYWN0aW9uczogUmVhY3Rpb25EZWZpbml0aW9uW10pOiBudW1iZXIge1xyXG4gaWYgKHJlYWN0aW9uID09PSBcInNraXBcIikgcmV0dXJuIG5vdGUuZWFzZUZhY3RvcjtcclxuICBjb25zdCByZWFjdGlvbkRlZiA9IHJlYWN0aW9ucy5maW5kKChyKSA9PiByLmlkID09PSByZWFjdGlvbik7XHJcbiAgaWYgKHJlYWN0aW9uRGVmPy5tYW51YWxPdmVycmlkZSAmJiByZWFjdGlvbkRlZi5lYXNlRGVsdGEgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIE1hdGgubWluKE1BWF9FQVNFLCBNYXRoLm1heCgxMzAsIG5vdGUuZWFzZUZhY3RvciArIHJlYWN0aW9uRGVmLmVhc2VEZWx0YSkpO1xyXG4gIH1cclxuICBjb25zdCBhdXRvUmVhY3Rpb25zID0gcmVhY3Rpb25zLmZpbHRlcigocikgPT4gIXIubWFudWFsT3ZlcnJpZGUpO1xyXG4gIGNvbnN0IHQgPSByZWFjdGlvblQocmVhY3Rpb24sIGF1dG9SZWFjdGlvbnMpO1xyXG4gIGNvbnN0IGRlbHRhID0gTWF0aC5yb3VuZChsZXJwKDIwLCAtMjAsIHQpKTtcclxuICByZXR1cm4gTWF0aC5taW4oTUFYX0VBU0UsIE1hdGgubWF4KDEzMCwgbm90ZS5lYXNlRmFjdG9yICsgZGVsdGEpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldER1ZU5vdGVzKG5vdGVzOiBOb3RlUmVjb3JkW10pOiBOb3RlUmVjb3JkW10ge1xyXG4gIHJldHVybiBub3Rlcy5maWx0ZXIobm90ZUlzRHVlKTtcclxufVxyXG5cclxuLy8gV2VpZ2h0ZWQgcmFuZG9tIHNlbGVjdGlvbiBcdTIwMTQgcG9ydCBvZiBnZXRfZXhjaXRpbmdfbm90ZSAvIGdldF9hbGxfb3RoZXJfbm90ZVxyXG5leHBvcnQgZnVuY3Rpb24gd2VpZ2h0ZWRSYW5kb208VD4oY2FuZGlkYXRlczogVFtdLCB3ZWlnaHRzOiBudW1iZXJbXSk6IFQgfCBudWxsIHtcclxuICBpZiAoIWNhbmRpZGF0ZXMubGVuZ3RoKSByZXR1cm4gbnVsbDtcclxuICBjb25zdCB0b3RhbCA9IHdlaWdodHMucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMCk7XHJcbiAgbGV0IHIgPSBNYXRoLnJhbmRvbSgpICogdG90YWw7XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjYW5kaWRhdGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICByIC09IHdlaWdodHNbaV07XHJcbiAgICBpZiAociA8PSAwKSByZXR1cm4gY2FuZGlkYXRlc1tpXTtcclxuICB9XHJcbiAgcmV0dXJuIGNhbmRpZGF0ZXNbY2FuZGlkYXRlcy5sZW5ndGggLSAxXTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBpY2tOb3RlVG9SZXZpZXcobm90ZXM6IE5vdGVSZWNvcmRbXSwgc2V0dGluZ3M6IFNwYWNlZEV2ZXJ5dGhpbmdTZXR0aW5ncyk6IE5vdGVSZWNvcmQgfCBudWxsIHtcclxuICBjb25zdCByYW5kID0gTWF0aC5yYW5kb20oKTtcclxuXHJcbiAgLy8gNTAlIGNoYW5jZTogcmVjZW50bHktY3JlYXRlZCB1bnJldmlld2VkIG5vdGVcclxuICBpZiAocmFuZCA8IHNldHRpbmdzLnJlY2VudFVuZHVlVGhyZXNob2xkKSB7XHJcbiAgICBjb25zdCByZWNlbnRVbnJldmlld2VkID0gbm90ZXMuZmlsdGVyKChuKSA9PiB7XHJcbiAgICAgIGNvbnN0IGFnZSA9IGRheXNCZXR3ZWVuKG4uY3JlYXRlZE9uLCB0b2RheSgpKTtcclxuICAgICAgcmV0dXJuIG4uaW50ZXJ2YWwgPj0gMCAmJiBuLm5vdGVTdGF0ZSA9PT0gXCJub3JtYWxcIiAmJiBhZ2UgPD0gNTAgJiYgbi5yZXZpZXdlZENvdW50ID09PSAwO1xyXG4gICAgfSk7XHJcbiAgICBpZiAocmVjZW50VW5yZXZpZXdlZC5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuIHJlY2VudFVucmV2aWV3ZWRbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcmVjZW50VW5yZXZpZXdlZC5sZW5ndGgpXTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNvbnN0IHJlYWN0aW9ucyA9IGdldEFjdGl2ZVJlYWN0aW9ucyhzZXR0aW5ncyk7XHJcblxyXG4gIC8vIDIwJSBjaGFuY2U6IGZpcnN0LXJlYWN0aW9uIChtb3N0IHBvc2l0aXZlKSBub3RlcyAod2VpZ2h0ZWQgYnkgb3ZlcmR1ZVx1MDBCMilcclxuICBpZiAocmFuZCA8IHNldHRpbmdzLmV4Y2l0aW5nVGhyZXNob2xkKSB7XHJcbiAgICBjb25zdCBleGNpdGluZ0lkID0gcmVhY3Rpb25zWzBdPy5pZCA/PyBcImV4Y2l0aW5nXCI7XHJcbiAgICBjb25zdCBleGNpdGluZyA9IG5vdGVzLmZpbHRlcigobikgPT4gbm90ZUlzRHVlKG4pICYmIG4ubm90ZVN0YXRlID09PSBleGNpdGluZ0lkKTtcclxuICAgIGNvbnN0IHdlaWdodHMgPSBleGNpdGluZy5tYXAoXHJcbiAgICAgIChuKSA9PiBNYXRoLnBvdyhNYXRoLm1heCgxLCBudW1EYXlzT3ZlcmR1ZShuKSksIDIpICogZm9sZGVyV2VpZ2h0KG4uZmlsZXBhdGgsIHNldHRpbmdzKSxcclxuICAgICk7XHJcbiAgICBjb25zdCBwaWNrZWQgPSB3ZWlnaHRlZFJhbmRvbShleGNpdGluZywgd2VpZ2h0cyk7XHJcbiAgICBpZiAocGlja2VkKSByZXR1cm4gcGlja2VkO1xyXG4gIH1cclxuXHJcbiAgLy8gRmFsbGJhY2s6IGFueSBkdWUgbm90ZSwgd2VpZ2h0ZWQgYnkgb3ZlcmR1ZVx1MDBCMiBcdTAwRDcgZm9sZGVyIHF1b3RhXHJcbiAgY29uc3QgYWxsRHVlID0gbm90ZXMuZmlsdGVyKChuKSA9PiBub3RlSXNEdWUobikpO1xyXG4gIGNvbnN0IHdlaWdodHMgPSBhbGxEdWUubWFwKChuKSA9PiB7XHJcbiAgICBsZXQgc3c6IG51bWJlcjtcclxuICAgIGlmIChuLm5vdGVTdGF0ZSA9PT0gXCJub3JtYWxcIikge1xyXG4gICAgICBzdyA9IDEuMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnN0IHQgPSByZWFjdGlvblQobi5ub3RlU3RhdGUsIHJlYWN0aW9ucyk7XHJcbiAgICAgIHN3ID0gbGVycCgxLjUsIDAuMywgdCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gTWF0aC5wb3coTWF0aC5tYXgoMSwgbnVtRGF5c092ZXJkdWUobikpLCAyKSAqIGZvbGRlcldlaWdodChuLmZpbGVwYXRoLCBzZXR0aW5ncykgKiBzdztcclxuICB9KTtcclxuICByZXR1cm4gd2VpZ2h0ZWRSYW5kb20oYWxsRHVlLCB3ZWlnaHRzKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgQXBwLCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBOb3RlUmVjb3JkLCBTcnNSZWNvcmQsIFNwYWNlZEV2ZXJ5dGhpbmdTZXR0aW5ncyB9IGZyb20gXCIuL3R5cGVzXCI7XHJcbmltcG9ydCB7IHRvZGF5IH0gZnJvbSBcIi4vdXRpbHNcIjtcclxuaW1wb3J0IHsgc2F2ZVN0b3JlIH0gZnJvbSBcIi4vc3RvcmVcIjtcclxuaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XHJcblxyXG5mdW5jdGlvbiBkYXlzQWdvKG46IG51bWJlcik6IHN0cmluZyB7XHJcbiAgY29uc3QgZCA9IG5ldyBEYXRlKCk7XHJcbiAgZC5zZXRVVENEYXRlKGQuZ2V0VVRDRGF0ZSgpIC0gbik7XHJcbiAgcmV0dXJuIGQudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XHJcbn1cclxuLy8gXHUyNTAwXHUyNTAwIFJlYWQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZE5vdGVSZWNvcmQocGx1Z2luOiBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luLCBmaWxlOiBURmlsZSk6IE5vdGVSZWNvcmQge1xyXG4gIGNvbnN0IGZtID0gcGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXIgPz8ge307XHJcbiAgY29uc3Qgc3RvcmVkID0gcGx1Z2luLmRhdGEubm90ZVJlY29yZHM/LltmaWxlLnBhdGhdO1xyXG4gIGNvbnN0IHsgZGVmYXVsdEVhc2VGYWN0b3IsIGluaXRpYWxJbnRlcnZhbCB9ID0gcGx1Z2luLnNldHRpbmdzO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgZmlsZXBhdGg6IGZpbGUucGF0aCxcclxuICAgIGVhc2VGYWN0b3I6IHN0b3JlZD8uZWFzZUZhY3RvciA/PyBkZWZhdWx0RWFzZUZhY3RvcixcclxuICAgIGludGVydmFsOiBzdG9yZWQ/LmludGVydmFsID8/IGluaXRpYWxJbnRlcnZhbCxcclxuICAgIGxhc3RSZXZpZXdlZE9uOiBzdG9yZWQ/Lmxhc3RSZXZpZXdlZE9uID8/IGRheXNBZ28oaW5pdGlhbEludGVydmFsKSxcclxuICAgIGNyZWF0ZWRPbjogc3RvcmVkPy5jcmVhdGVkT24gPz8gdG9kYXkoKSxcclxuICAgIHJldmlld2VkQ291bnQ6IHN0b3JlZD8ucmV2aWV3ZWRDb3VudCA/PyAwLFxyXG4gICAgbm90ZVN0YXRlOiBzdG9yZWQ/Lm5vdGVTdGF0ZSA/PyBcIm5vcm1hbFwiLFxyXG4gICAgYWN0aXZlOiBmbS5hY3RpdmUsXHJcbiAgICBkZWNrczogZm0uZGVja3MsXHJcbiAgfTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIFdyaXRlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlTm90ZVJlY29yZChcclxuICBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXHJcbiAgZmlsZXBhdGg6IHN0cmluZyxcclxuICB1cGRhdGVzOiBQYXJ0aWFsPFNyc1JlY29yZD4sXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGlmICghcGx1Z2luLmRhdGEubm90ZVJlY29yZHMpIHBsdWdpbi5kYXRhLm5vdGVSZWNvcmRzID0ge307XHJcbiAgY29uc3QgZXhpc3Rpbmc6IFNyc1JlY29yZCA9IHBsdWdpbi5kYXRhLm5vdGVSZWNvcmRzW2ZpbGVwYXRoXSA/PyB7XHJcbiAgICBlYXNlRmFjdG9yOiBwbHVnaW4uc2V0dGluZ3MuZGVmYXVsdEVhc2VGYWN0b3IsXHJcbiAgICBpbnRlcnZhbDogcGx1Z2luLnNldHRpbmdzLmluaXRpYWxJbnRlcnZhbCxcclxuICAgIGxhc3RSZXZpZXdlZE9uOiBkYXlzQWdvKHBsdWdpbi5zZXR0aW5ncy5pbml0aWFsSW50ZXJ2YWwpLFxyXG4gICAgY3JlYXRlZE9uOiB0b2RheSgpLFxyXG4gICAgcmV2aWV3ZWRDb3VudDogMCxcclxuICAgIG5vdGVTdGF0ZTogXCJub3JtYWxcIixcclxuICB9O1xyXG4gIHBsdWdpbi5kYXRhLm5vdGVSZWNvcmRzW2ZpbGVwYXRoXSA9IHsgLi4uZXhpc3RpbmcsIC4uLnVwZGF0ZXMgfTtcclxuICBhd2FpdCBzYXZlU3RvcmUocGx1Z2luLCBwbHVnaW4uZGF0YSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250bWF0dGVyQWN0aW9uYWJsZShcclxuICBhcHA6IEFwcCxcclxuICBmaWxlcGF0aDogc3RyaW5nLFxyXG4gIG9wdHM6IHsgZW5lcmd5Pzogc3RyaW5nIHwgc3RyaW5nW107IHRpbWVibG9jaz86IHN0cmluZyB8IHN0cmluZ1tdIH0sXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGZpbGUgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZpbGVwYXRoKSBhcyBURmlsZSB8IG51bGw7XHJcbiAgaWYgKCFmaWxlKSByZXR1cm47XHJcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcclxuICAgIGZtLmFjdGl2ZSA9IHRydWU7XHJcbiAgICBpZiAob3B0cy5lbmVyZ3kgIT09IHVuZGVmaW5lZCkgZm0uZW5lcmd5ID0gb3B0cy5lbmVyZ3k7XHJcbiAgICBpZiAob3B0cy50aW1lYmxvY2sgIT09IHVuZGVmaW5lZCkgZm0udGltZWJsb2NrID0gb3B0cy50aW1lYmxvY2s7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250bWF0dGVyU3RhdGUoYXBwOiBBcHAsIGZpbGVwYXRoOiBzdHJpbmcsIHN0YXRlOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBmaWxlID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xyXG4gIGlmICghZmlsZSkgcmV0dXJuO1xyXG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XHJcbiAgICBmbS5zdGF0ZSA9IHN0YXRlO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgVmF1bHQgc2NhbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXROb3Rlc0Zyb21WYXVsdChwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4pOiBOb3RlUmVjb3JkW10ge1xyXG4gIGNvbnN0IGZpbGVzID0gcGx1Z2luLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkuZmlsdGVyKChmKSA9PiB7XHJcbiAgICBpZiAocGx1Z2luLnNldHRpbmdzLnNvdXJjZVNjb3BlID09PSBcImZvbGRlclwiKSB7XHJcbiAgICAgIHJldHVybiBwbHVnaW4uc2V0dGluZ3Muc291cmNlRm9sZGVycy5zb21lKChlKSA9PiBmLnBhdGguc3RhcnRzV2l0aChlLnBhdGggKyBcIi9cIikpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSk7XHJcbiAgcmV0dXJuIGZpbGVzLm1hcCgoZikgPT4gcmVhZE5vdGVSZWNvcmQocGx1Z2luLCBmKSk7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBPbmUtdGltZSBtaWdyYXRpb24gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWlncmF0ZVNlVG9TdG9yZShwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBpZiAocGx1Z2luLmRhdGEubm90ZVJlY29yZHMgIT09IHVuZGVmaW5lZCkgcmV0dXJuOyAvLyBhbHJlYWR5IG1pZ3JhdGVkXHJcblxyXG4gIHBsdWdpbi5kYXRhLm5vdGVSZWNvcmRzID0ge307XHJcbiAgY29uc3QgeyBkZWZhdWx0RWFzZUZhY3RvciwgaW5pdGlhbEludGVydmFsIH0gPSBwbHVnaW4uc2V0dGluZ3M7XHJcblxyXG4gIGZvciAoY29uc3QgZmlsZSBvZiBwbHVnaW4uYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKSkge1xyXG4gICAgY29uc3QgZm0gPSBwbHVnaW4uYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlciA/PyB7fTtcclxuICAgIGNvbnN0IG5lc3RlZCA9IGZtLnNlID8/IHt9O1xyXG5cclxuICAgIGNvbnN0IGhhc1NlRGF0YSA9XHJcbiAgICAgIG5lc3RlZC5lYXNlICE9PSB1bmRlZmluZWQgfHxcclxuICAgICAgbmVzdGVkLmludGVydmFsICE9PSB1bmRlZmluZWQgfHxcclxuICAgICAgZm0uc2VfZWFzZSAhPT0gdW5kZWZpbmVkIHx8XHJcbiAgICAgIGZtLnNlX2ludGVydmFsICE9PSB1bmRlZmluZWQgfHxcclxuICAgICAgZm0uc2VfYXJjaGl2ZWQgPT09IHRydWU7XHJcblxyXG4gICAgaWYgKGhhc1NlRGF0YSkge1xyXG4gICAgICBwbHVnaW4uZGF0YS5ub3RlUmVjb3Jkc1tmaWxlLnBhdGhdID0ge1xyXG4gICAgICAgIGVhc2VGYWN0b3I6IG5lc3RlZC5lYXNlID8/IGZtLnNlX2Vhc2UgPz8gZGVmYXVsdEVhc2VGYWN0b3IsXHJcbiAgICAgICAgaW50ZXJ2YWw6IGZtLnNlX2FyY2hpdmVkID09PSB0cnVlID8gLTEgOiAobmVzdGVkLmludGVydmFsID8/IGZtLnNlX2ludGVydmFsID8/IGluaXRpYWxJbnRlcnZhbCksXHJcbiAgICAgICAgbGFzdFJldmlld2VkT246IGZtLnNlX2xhc3RfcmV2aWV3ZWQgPz8gZGF5c0Fnbyhpbml0aWFsSW50ZXJ2YWwpLFxyXG4gICAgICAgIGNyZWF0ZWRPbjogbmVzdGVkLmNyZWF0ZWQgPz8gZm0uc2VfY3JlYXRlZCA/PyB0b2RheSgpLFxyXG4gICAgICAgIHJldmlld2VkQ291bnQ6IG5lc3RlZC5jb3VudCA/PyBmbS5zZV9jb3VudCA/PyAwLFxyXG4gICAgICAgIG5vdGVTdGF0ZTogbmVzdGVkLnN0YXRlID8/IGZtLnNlX3N0YXRlID8/IFwibm9ybWFsXCIsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RyaXAgYWxsIHNlIGtleXMgZnJvbSBmcm9udG1hdHRlciByZWdhcmRsZXNzXHJcbiAgICBjb25zdCBoYXNBbnlTZUtleSA9IGhhc1NlRGF0YSB8fCBmbS5zZV9sYXN0X3Jldmlld2VkICE9PSB1bmRlZmluZWQgfHwgZm0uc2VfbmV4dF9yZXZpZXcgIT09IHVuZGVmaW5lZDtcclxuXHJcbiAgICBpZiAoaGFzQW55U2VLZXkpIHtcclxuICAgICAgYXdhaXQgcGx1Z2luLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XHJcbiAgICAgICAgZGVsZXRlIGZtLnNlO1xyXG4gICAgICAgIGRlbGV0ZSBmbS5zZV9lYXNlO1xyXG4gICAgICAgIGRlbGV0ZSBmbS5zZV9pbnRlcnZhbDtcclxuICAgICAgICBkZWxldGUgZm0uc2VfbGFzdF9yZXZpZXdlZDtcclxuICAgICAgICBkZWxldGUgZm0uc2VfY3JlYXRlZDtcclxuICAgICAgICBkZWxldGUgZm0uc2VfY291bnQ7XHJcbiAgICAgICAgZGVsZXRlIGZtLnNlX3N0YXRlO1xyXG4gICAgICAgIGRlbGV0ZSBmbS5zZV9uZXh0X3JldmlldztcclxuICAgICAgICBkZWxldGUgZm0uc2VfYXJjaGl2ZWQ7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXdhaXQgc2F2ZVN0b3JlKHBsdWdpbiwgcGx1Z2luLmRhdGEpO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgRnJvbnRtYXR0ZXIgaGVscGVycyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250bWF0dGVyQWN0aXZlKGFwcDogQXBwLCBmaWxlcGF0aDogc3RyaW5nLCBhY3RpdmU6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBmaWxlID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xyXG4gIGlmICghZmlsZSkgcmV0dXJuO1xyXG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XHJcbiAgICBmbS5hY3RpdmUgPSBhY3RpdmU7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250bWF0dGVyUmVjdXJyaW5nQ29tcGxldGUoYXBwOiBBcHAsIGZpbGVwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBmaWxlID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xyXG4gIGlmICghZmlsZSkgcmV0dXJuO1xyXG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XHJcbiAgICBmbS5sYXN0X2NvbXBsZXRlZCA9IHRvZGF5KCk7XHJcbiAgICBmbS5za2lwcGVkID0gMDtcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlRnJvbnRtYXR0ZXJEZWNrcyhhcHA6IEFwcCwgZmlsZXBhdGg6IHN0cmluZywgZGVja3M6IHN0cmluZ1tdKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgZmlsZSA9IGFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZXBhdGgpIGFzIFRGaWxlIHwgbnVsbDtcclxuICBpZiAoIWZpbGUpIHJldHVybjtcclxuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xyXG4gICAgZm0uZGVja3MgPSBkZWNrcztcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwRnJvbnRtYXR0ZXIocmF3OiBzdHJpbmcpOiB7IGZyb250bWF0dGVyOiBzdHJpbmc7IGJvZHk6IHN0cmluZyB9IHtcclxuICBpZiAocmF3LnN0YXJ0c1dpdGgoXCItLS1cIikpIHtcclxuICAgIGNvbnN0IGVuZCA9IHJhdy5pbmRleE9mKFwiXFxuLS0tXCIsIDMpO1xyXG4gICAgaWYgKGVuZCAhPT0gLTEpIHJldHVybiB7IGZyb250bWF0dGVyOiByYXcuc2xpY2UoMCwgZW5kICsgNCksIGJvZHk6IHJhdy5zbGljZShlbmQgKyA0KS50cmltU3RhcnQoKSB9O1xyXG4gIH1cclxuICByZXR1cm4geyBmcm9udG1hdHRlcjogXCJcIiwgYm9keTogcmF3IH07XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250bWF0dGVyU2tpcChhcHA6IEFwcCwgZmlsZXBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGZpbGUgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZpbGVwYXRoKSBhcyBURmlsZSB8IG51bGw7XHJcbiAgaWYgKCFmaWxlKSByZXR1cm47XHJcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcclxuICAgIGZtLnNraXBwZWQgPSAoZm0uc2tpcHBlZCA/PyAwKSArIDE7XHJcbiAgfSk7XHJcbn0iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCwgVEZpbGUsIENvbXBvbmVudCwgTWFya2Rvd25SZW5kZXJlciwgRXZlbnRSZWYsIEJ1dHRvbkNvbXBvbmVudCwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgQmFzZU5vdGUgfSBmcm9tIFwiLi90eXBlc1wiO1xuaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgeyB3cml0ZUZyb250bWF0dGVyQWN0aXZlLCB3cml0ZUZyb250bWF0dGVyRGVja3MsIHN0cmlwRnJvbnRtYXR0ZXIgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiO1xuaW1wb3J0IHsgUm91dGVGb2xkZXJNb2RhbCB9IGZyb20gXCIuL1JvdXRlRm9sZGVyTW9kYWxcIjtcbmltcG9ydCB7IFF1aWNrTm90ZU1vZGFsIH0gZnJvbSBcIi4vUXVpY2tOb3RlTW9kYWxcIjtcbmltcG9ydCB7IGNyZWF0ZURlY2tEcm9wZG93biB9IGZyb20gXCIuL2RlY2tEcm9wZG93blwiO1xuaW1wb3J0IHsgY3JlYXRlQ002RWRpdG9yLCBnZXRDTTZDb250ZW50LCBkZXN0cm95Q002RWRpdG9yIH0gZnJvbSBcIi4vY202LWVkaXRvclwiO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQmFzZU5vdGVNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgLy8gXHUyNTAwXHUyNTAwIFNoYXJlZCBmaWVsZHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIHByb3RlY3RlZCB0aXB0YXBFZGl0b3I6IEVkaXRvciB8IG51bGwgPSBudWxsO1xuICBwcm90ZWN0ZWQgY202RWRpdE1vZGU6IGFueSA9IG51bGw7XG4gIHByb3RlY3RlZCBjbTZMZWFmOiBhbnkgPSBudWxsO1xuXG4gIHByb3RlY3RlZCByZW5kZXJDb21wb25lbnQ6IENvbXBvbmVudCB8IG51bGwgPSBudWxsO1xuICBwcm90ZWN0ZWQgcmVuZGVyZWRDb250YWluZXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByb3RlY3RlZCBlZGl0b3JDb250YWluZXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByb3RlY3RlZCBpc0VkaXRpbmcgPSBmYWxzZTtcbiAgcHJvdGVjdGVkIHRpdGxlRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByb3RlY3RlZCBvcmlnaW5hbFRpdGxlID0gXCJcIjtcbiAgcHJvdGVjdGVkIGRlY2tOYW1lID0gXCJcIjtcbiAgcHJvdGVjdGVkIHNob3dSZXN0YXJ0QnV0dG9uID0gZmFsc2U7XG4gIHByb3RlY3RlZCBwcm9ncmVzc0JhckVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xuICBwcm90ZWN0ZWQgZm9vdGVyRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIFVTRV9DTTYgPSB0cnVlO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMCBTaGFyZWQgbWV0aG9kcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgYXN5bmMgb25PcGVuKCkge1xuICAgIGlmICghdGhpcy5zaG91bGRPcGVuKCkpIHJldHVybjtcbiAgICBhd2FpdCB0aGlzLnJlbmRlck1vZGFsKCk7XG4gICAgdGhpcy5zZXR1cFZhdWx0TGlzdGVuZXIoKTtcbiAgfVxuICBwcm90ZWN0ZWQgc2hvdWxkT3BlbigpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBwcm90ZWN0ZWQgYWJzdHJhY3QgcmVuZGVyTW9kYWwoKTogUHJvbWlzZTx2b2lkPjtcblxuICBwcm90ZWN0ZWQgYXN5bmMgcmVuZGVyTm90ZShjb250ZW50RWw6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5jbGVhbnVwRWRpdG9ycygpO1xuICAgIHRoaXMucmVuZGVySGVhZGVyKGNvbnRlbnRFbCk7XG4gICAgYXdhaXQgdGhpcy5yZW5kZXJFeHRyYUNvbnRlbnQoY29udGVudEVsKTtcbiAgICBhd2FpdCB0aGlzLnJlbmRlckNvbnRlbnQoY29udGVudEVsKTtcbiAgICBjb25zdCBmb290ZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1zdGlja3ktZm9vdGVyXCIgfSk7XG4gICAgdGhpcy5mb290ZXJFbCA9IGZvb3RlcjtcbiAgICB0aGlzLnJlbmRlckJ1dHRvbnMoZm9vdGVyKTtcbiAgICB0aGlzLnJlbmRlclByb2dyZXNzQmFyKGZvb3Rlcik7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcmVuZGVyRXh0cmFDb250ZW50KGNvbnRlbnRFbDogSFRNTEVsZW1lbnQpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgcHJvdGVjdGVkIGFic3RyYWN0IGdldFN0YXR1c1RleHQoKTogc3RyaW5nO1xuICBwcm90ZWN0ZWQgb25SZXN0YXJ0Q2xpY2soKTogdm9pZCB7fVxuICBwcm90ZWN0ZWQgYWJzdHJhY3QgZ2V0UHJvZ3Jlc3NTZWdtZW50cygpOiBzdHJpbmdbXTtcbiAgcHJvdGVjdGVkIG5vdGUhOiBCYXNlTm90ZTtcbiAgcHJvdGVjdGVkIGFic3RyYWN0IHBsdWdpbjogU3BhY2VkRXZlcnl0aGluZ1BsdWdpbjtcblxuICBwcm90ZWN0ZWQgcmVuZGVyUHJvZ3Jlc3NCYXIoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIHRoaXMucHJvZ3Jlc3NCYXJFbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLXByb2dyZXNzLWJhclwiIH0pO1xuICAgIGNvbnN0IHNlZ21lbnRzID0gdGhpcy5nZXRQcm9ncmVzc1NlZ21lbnRzKCk7XG4gICAgZm9yIChjb25zdCBzZWcgb2Ygc2VnbWVudHMpIHtcbiAgICAgIHRoaXMucHJvZ3Jlc3NCYXJFbC5jcmVhdGVEaXYoeyBjbHM6IGBzcGFjZWQtcHJvZ3Jlc3Mtc2VnICR7c2VnfWAudHJpbSgpIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCByZWZyZXNoUHJvZ3Jlc3NCYXIoKTogdm9pZCB7XG4gICAgY29uc3Qgc3RhdHVzRWwgPSB0aGlzLmNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcIi5zcGFjZWQtZHVlLWNvdW50XCIpO1xuICAgIGlmIChzdGF0dXNFbCkgc3RhdHVzRWwudGV4dENvbnRlbnQgPSB0aGlzLmdldFN0YXR1c1RleHQoKTtcbiAgICBpZiAoIXRoaXMucHJvZ3Jlc3NCYXJFbCkgcmV0dXJuO1xuICAgIHRoaXMucHJvZ3Jlc3NCYXJFbC5lbXB0eSgpO1xuICAgIGNvbnN0IHNlZ21lbnRzID0gdGhpcy5nZXRQcm9ncmVzc1NlZ21lbnRzKCk7XG4gICAgZm9yIChjb25zdCBzZWcgb2Ygc2VnbWVudHMpIHtcbiAgICAgIHRoaXMucHJvZ3Jlc3NCYXJFbC5jcmVhdGVEaXYoeyBjbHM6IGBzcGFjZWQtcHJvZ3Jlc3Mtc2VnICR7c2VnfWAudHJpbSgpIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbWV0YWRhdGFFZGl0b3I6IGFueSA9IG51bGw7XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJlbmRlckZyb250bWF0dGVyRWRpdG9yKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGZpbGU6IFRGaWxlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgTWV0YWRhdGFFZGl0b3JDbGFzcyA9IHRoaXMuZ2V0TWV0YWRhdGFFZGl0b3JDbGFzcygpO1xuICAgIGNvbnNvbGUubG9nKFwiTWV0YWRhdGFFZGl0b3JDbGFzczpcIiwgTWV0YWRhdGFFZGl0b3JDbGFzcyk7XG4gICAgaWYgKCFNZXRhZGF0YUVkaXRvckNsYXNzKSByZXR1cm47XG4gICAgY29uc29sZS5sb2coXCJtZXRhZGF0YUVkaXRvciBpbnN0YW5jZTpcIiwgdGhpcy5tZXRhZGF0YUVkaXRvcik7XG4gICAgY29uc29sZS5sb2coXCJjb250YWluZXJFbDpcIiwgdGhpcy5tZXRhZGF0YUVkaXRvcj8uY29udGFpbmVyRWwpO1xuXG4gICAgY29uc3Qgb3duZXIgPSB7XG4gICAgICBnZXRGaWxlOiAoKSA9PiBmaWxlLFxuICAgICAgc2F2ZUZyb250bWF0dGVyOiBhc3luYyAoZm06IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZXhpc3RpbmcpID0+IHtcbiAgICAgICAgICBPYmplY3QuYXNzaWduKGV4aXN0aW5nLCBmbSk7XG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICAgIGdldEhvdmVyU291cmNlOiAoKSA9PiBcInByZXZpZXdcIixcbiAgICAgIGdldE1vZGU6ICgpID0+IFwicHJldmlld1wiLFxuICAgIH07XG5cbiAgICB0aGlzLm1ldGFkYXRhRWRpdG9yID0gbmV3IE1ldGFkYXRhRWRpdG9yQ2xhc3ModGhpcy5hcHAsIG93bmVyKTtcbiAgICB0aGlzLm1ldGFkYXRhRWRpdG9yLmxvYWQoKTtcblxuICAgIGNvbnN0IHJhd0ZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyID8/IHt9O1xuICAgIGNvbnN0IHsgcG9zaXRpb246IF9wb3MsIC4uLmZtIH0gPSByYXdGbTtcbiAgICB0aGlzLm1ldGFkYXRhRWRpdG9yLnN5bmNocm9uaXplKGZtKTtcblxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLm1ldGFkYXRhRWRpdG9yLmNvbnRhaW5lckVsKTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuYXBwbHlJY29uaWNQcm9wZXJ0eUljb25zKCksIDApO1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlbmRlckhlYWRlcihjb250ZW50RWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgdGl0bGUgPSB0aGlzLm5vdGUuZmlsZXBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIS5yZXBsYWNlKC9cXC5tZCQvLCBcIlwiKTtcbiAgICBjb25zdCBoZWFkZXJSb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1oZWFkZXItcm93XCIgfSk7XG4gICAgdGhpcy50aXRsZUVsID0gaGVhZGVyUm93LmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiB0aXRsZSwgY2xzOiBcInNwYWNlZC1ub3RlLXRpdGxlXCIgfSk7XG4gICAgdGhpcy5vcmlnaW5hbFRpdGxlID0gdGl0bGU7XG4gICAgdGhpcy50aXRsZUVsLnNwZWxsY2hlY2sgPSBmYWxzZTtcbiAgICB0aGlzLnRpdGxlRWwuY29udGVudEVkaXRhYmxlID0gdGhpcy5pc0VkaXRpbmcgPyBcInRydWVcIiA6IFwiZmFsc2VcIjtcblxuICAgIHRoaXMudGl0bGVFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMuc2F2ZVRpdGxlKCkpO1xuXG4gICAgdGhpcy50aXRsZUVsLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc0VkaXRpbmcpIHJldHVybjtcbiAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZSB8IG51bGw7XG4gICAgICBpZiAoZmlsZSkgdm9pZCB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZih0cnVlKS5vcGVuRmlsZShmaWxlKTtcbiAgICB9KTtcblxuICAgIHRoaXMudGl0bGVFbC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZSkgPT4ge1xuICAgICAgaWYgKCF0aGlzLmlzRWRpdGluZykgcmV0dXJuO1xuICAgICAgaWYgKGUua2V5ID09PSBcIkVudGVyXCIpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB0aGlzLnRpdGxlRWwhLmJsdXIoKTtcbiAgICAgIH1cbiAgICAgIGlmIChlLmtleSA9PT0gXCJFc2NhcGVcIikge1xuICAgICAgICB0aGlzLnRpdGxlRWwhLnRleHRDb250ZW50ID0gdGhpcy5vcmlnaW5hbFRpdGxlO1xuICAgICAgICB0aGlzLnRpdGxlRWwhLmJsdXIoKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImRpdlwiLCB7IHRleHQ6IHRoaXMuZ2V0U3RhdHVzVGV4dCgpLCBjbHM6IFwic3BhY2VkLWR1ZS1jb3VudFwiIH0pO1xuXG4gICAgY29uc3QgaGVhZGVyUmlnaHQgPSBoZWFkZXJSb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1oZWFkZXItcmlnaHRcIiB9KTtcblxuICAgIHRoaXMucmVuZGVyRXh0cmFIZWFkZXJCdXR0b25zKGhlYWRlclJpZ2h0KTtcblxuICAgIGlmICh0aGlzLnNob3dSZXN0YXJ0QnV0dG9uKSB7XG4gICAgICBjb25zdCByZXN0YXJ0QnRuID0gaGVhZGVyUmlnaHQuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1oZHItYnRuXCIgfSk7XG4gICAgICBzZXRJY29uKHJlc3RhcnRCdG4sIFwicm90YXRlLWNjd1wiKTtcbiAgICAgIHJlc3RhcnRCdG4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBcIlJlc3RhcnQgc2Vzc2lvblwiKTtcbiAgICAgIHJlc3RhcnRCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMub25SZXN0YXJ0Q2xpY2soKSk7XG4gICAgfVxuXG4gICAgLy8gRWRpdCBidXR0b24gXHUyMDE0IGlubGluZSB0b2dnbGUsIG5vIGZ1bGwgcmUtcmVuZGVyXG4gICAgY29uc3QgZWRpdEJ0biA9IGhlYWRlclJpZ2h0LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtaGRyLWJ0blwiIH0pO1xuICAgIHNldEljb24oZWRpdEJ0biwgdGhpcy5pc0VkaXRpbmcgPyBcImV5ZVwiIDogXCJwZW5jaWxcIik7XG4gICAgZWRpdEJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHRoaXMuaXNFZGl0aW5nID8gXCJTd2l0Y2ggdG8gcmVhZCB2aWV3XCIgOiBcIlN3aXRjaCB0byBlZGl0IHZpZXdcIik7XG4gICAgZWRpdEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNFZGl0aW5nKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZVRpdGxlKCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZUJvZHlFZGl0cygpO1xuICAgICAgICB0aGlzLmlzRWRpdGluZyA9IGZhbHNlO1xuICAgICAgICB0aGlzLmZvb3RlckVsPy5yZW1vdmVDbGFzcyhcInNwYWNlZC1mb290ZXItZGlzYWJsZWRcIik7XG4gICAgICAgIHRoaXMudGl0bGVFbCEuY29udGVudEVkaXRhYmxlID0gXCJmYWxzZVwiO1xuICAgICAgICBpZiAodGhpcy5lZGl0b3JDb250YWluZXIpIHRoaXMuZWRpdG9yQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgaWYgKHRoaXMucmVuZGVyZWRDb250YWluZXIpIHtcbiAgICAgICAgICB0aGlzLnJlbmRlcmVkQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xuICAgICAgICAgIHRoaXMucmVuZGVyZWRDb250YWluZXIuZW1wdHkoKTtcbiAgICAgICAgICB0aGlzLnJlbmRlckNvbXBvbmVudD8udW5sb2FkKCk7XG4gICAgICAgICAgdGhpcy5yZW5kZXJDb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgIGNvbnN0IHVwZGF0ZWRGaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMubm90ZS5maWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xuICAgICAgICAgIGlmICh1cGRhdGVkRmlsZSkge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlZFJhdyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQodXBkYXRlZEZpbGUpO1xuICAgICAgICAgICAgY29uc3QgeyBib2R5OiB1cGRhdGVkQm9keSB9ID0gc3RyaXBGcm9udG1hdHRlcih1cGRhdGVkUmF3KTtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyQ29tcG9uZW50ID0gbmV3IENvbXBvbmVudCgpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJDb21wb25lbnQubG9hZCgpO1xuICAgICAgICAgICAgYXdhaXQgTWFya2Rvd25SZW5kZXJlci5yZW5kZXIoXG4gICAgICAgICAgICAgIHRoaXMuYXBwLFxuICAgICAgICAgICAgICB1cGRhdGVkQm9keSxcbiAgICAgICAgICAgICAgdGhpcy5yZW5kZXJlZENvbnRhaW5lcixcbiAgICAgICAgICAgICAgdGhpcy5ub3RlLmZpbGVwYXRoLFxuICAgICAgICAgICAgICB0aGlzLnJlbmRlckNvbXBvbmVudCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMubWV0YWRhdGFFZGl0b3I/LmNvbnRhaW5lckVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KFwiZGlzcGxheVwiKTtcbiAgICAgICAgc2V0SWNvbihlZGl0QnRuLCBcInBlbmNpbFwiKTtcbiAgICAgICAgZWRpdEJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiU3dpdGNoIHRvIGVkaXQgdmlld1wiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaXNFZGl0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5mb290ZXJFbD8uYWRkQ2xhc3MoXCJzcGFjZWQtZm9vdGVyLWRpc2FibGVkXCIpO1xuICAgICAgICB0aGlzLnRpdGxlRWwhLmNvbnRlbnRFZGl0YWJsZSA9IFwidHJ1ZVwiO1xuICAgICAgICB0aGlzLnRpdGxlRWwhLmZvY3VzKCk7XG4gICAgICAgIGlmICh0aGlzLnJlbmRlcmVkQ29udGFpbmVyKSB0aGlzLnJlbmRlcmVkQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgaWYgKHRoaXMuZWRpdG9yQ29udGFpbmVyKSB0aGlzLmVkaXRvckNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgY29uc3QgY20gPSB0aGlzLmNtNkVkaXRNb2RlPy5jbTtcbiAgICAgICAgICBpZiAoIWNtKSByZXR1cm47XG4gICAgICAgICAgY20uZGlzcGF0Y2goe30pOyAvLyBlbXB0eSB0cmFuc2FjdGlvbiBmb3JjZXMgYSBmdWxsIHJlLXJlbmRlciBjeWNsZVxuICAgICAgICAgIGNtLnJlcXVlc3RNZWFzdXJlKCk7XG4gICAgICAgICAgY20uZm9jdXMoKTtcbiAgICAgICAgfSwgMCk7XG4gICAgICAgIHNldEljb24oZWRpdEJ0biwgXCJleWVcIik7XG4gICAgICAgIHRoaXMubWV0YWRhdGFFZGl0b3I/LmNvbnRhaW5lckVsLnN0eWxlLnNldFByb3BlcnR5KFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XG4gICAgICAgIGVkaXRCdG4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBcIlN3aXRjaCB0byByZWFkIHZpZXdcIik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBuZXdOb3RlQnRuID0gaGVhZGVyUmlnaHQuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1oZHItYnRuXCIgfSk7XG4gICAgc2V0SWNvbihuZXdOb3RlQnRuLCBcImZpbGUtcGx1c1wiKTtcbiAgICBuZXdOb3RlQnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJOZXcgbm90ZVwiKTtcbiAgICBuZXdOb3RlQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiBuZXcgUXVpY2tOb3RlTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luLCB0aGlzLmRlY2tOYW1lKS5vcGVuKCkpO1xuXG4gICAgY29uc3QgZGVja1dyYXBwZXIgPSBoZWFkZXJSaWdodC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2std3JhcHBlclwiIH0pO1xuICAgIGNvbnN0IGRlY2tCdG4gPSBkZWNrV3JhcHBlci5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2stYnRuXCIgfSk7XG4gICAgc2V0SWNvbihkZWNrQnRuLCBcImxheWVyc1wiKTtcbiAgICBkZWNrQnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJBc3NpZ24gdG8gZGVja3NcIik7XG4gICAgbGV0IGRlY2tEcm9wZG93bjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgZGVja091dHNpZGVIYW5kbGVyOiAoKGU6IE1vdXNlRXZlbnQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gICAgZGVja0J0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICBpZiAoZGVja0Ryb3Bkb3duICYmIGRvY3VtZW50LmNvbnRhaW5zKGRlY2tEcm9wZG93bikpIHtcbiAgICAgICAgZGVja0Ryb3Bkb3duLnJlbW92ZSgpO1xuICAgICAgICBkZWNrRHJvcGRvd24gPSBudWxsO1xuICAgICAgICBpZiAoZGVja091dHNpZGVIYW5kbGVyKSB7XG4gICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBkZWNrT3V0c2lkZUhhbmRsZXIpO1xuICAgICAgICAgIGRlY2tPdXRzaWRlSGFuZGxlciA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3Qgbm90ZUZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZSB8IG51bGw7XG4gICAgICBjb25zdCByYXdEZWNrcyA9IG5vdGVGaWxlID8gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUobm90ZUZpbGUpPy5mcm9udG1hdHRlcj8uZGVja3MgOiB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBpbml0aWFsRGVja3M6IHN0cmluZ1tdID0gQXJyYXkuaXNBcnJheShyYXdEZWNrcylcbiAgICAgICAgPyBbLi4ucmF3RGVja3NdXG4gICAgICAgIDogdHlwZW9mIHJhd0RlY2tzID09PSBcInN0cmluZ1wiICYmIHJhd0RlY2tzXG4gICAgICAgICAgPyBbcmF3RGVja3NdXG4gICAgICAgICAgOiBbXTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGNyZWF0ZURlY2tEcm9wZG93bih0aGlzLmFwcCwgZGVja1dyYXBwZXIsIGluaXRpYWxEZWNrcywgYXN5bmMgKGRlY2tzKSA9PiB7XG4gICAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJEZWNrcyh0aGlzLmFwcCwgdGhpcy5ub3RlLmZpbGVwYXRoLCBkZWNrcyk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXV0b0FjdGl2YXRlTm90ZSgpO1xuICAgICAgfSk7XG4gICAgICBkZWNrRHJvcGRvd24gPSByZXN1bHQuZHJvcGRvd247XG4gICAgICBkZWNrT3V0c2lkZUhhbmRsZXIgPSByZXN1bHQub3V0c2lkZUhhbmRsZXI7XG4gICAgfSk7XG5cbiAgICBjb25zdCBhY3RpdmVDaGVja2JveCA9IGhlYWRlclJpZ2h0LmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyBjbHM6IFwic3BhY2VkLWFjdGl2ZS1jaGVja2JveFwiIH0pO1xuICAgIGFjdGl2ZUNoZWNrYm94LnR5cGUgPSBcImNoZWNrYm94XCI7XG4gICAgY29uc3Qgbm90ZUZpbGVGb3JBY3RpdmUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZSB8IG51bGw7XG4gICAgYWN0aXZlQ2hlY2tib3guY2hlY2tlZCA9IG5vdGVGaWxlRm9yQWN0aXZlXG4gICAgICA/IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKG5vdGVGaWxlRm9yQWN0aXZlKT8uZnJvbnRtYXR0ZXI/LmFjdGl2ZSA9PT0gdHJ1ZVxuICAgICAgOiBmYWxzZTtcbiAgICBhY3RpdmVDaGVja2JveC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiQWRkIHRvIGFjdGl2ZSBkZWNrXCIpO1xuICAgIGFjdGl2ZUNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbmV3QWN0aXZlID0gYWN0aXZlQ2hlY2tib3guY2hlY2tlZDtcbiAgICAgIHRoaXMubm90ZSA9IHsgLi4udGhpcy5ub3RlLCBhY3RpdmU6IG5ld0FjdGl2ZSB9O1xuICAgICAgYXdhaXQgd3JpdGVGcm9udG1hdHRlckFjdGl2ZSh0aGlzLmFwcCwgdGhpcy5ub3RlLmZpbGVwYXRoLCBuZXdBY3RpdmUpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlbmRlckV4dHJhSGVhZGVyQnV0dG9ucyhoZWFkZXJSaWdodDogSFRNTEVsZW1lbnQpOiB2b2lkIHt9XG4gIHByaXZhdGUgX3ZhdWx0TW9kaWZ5UmVmOiBFdmVudFJlZiB8IG51bGwgPSBudWxsO1xuXG4gIHByb3RlY3RlZCBzZXR1cFZhdWx0TGlzdGVuZXIoKTogdm9pZCB7XG4gICAgdGhpcy5fdmF1bHRNb2RpZnlSZWYgPSB0aGlzLmFwcC52YXVsdC5vbihcIm1vZGlmeVwiLCAoZmlsZSkgPT4ge1xuICAgICAgaWYgKGZpbGUucGF0aCA9PT0gdGhpcy5ub3RlLmZpbGVwYXRoICYmICF0aGlzLmlzRWRpdGluZykge1xuICAgICAgICB2b2lkIHRoaXMucmVmcmVzaENvbnRlbnQoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCB0ZWFyZG93blZhdWx0TGlzdGVuZXIoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX3ZhdWx0TW9kaWZ5UmVmKSB7XG4gICAgICB0aGlzLmFwcC52YXVsdC5vZmZyZWYodGhpcy5fdmF1bHRNb2RpZnlSZWYpO1xuICAgICAgdGhpcy5fdmF1bHRNb2RpZnlSZWYgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIF9NZXRhZGF0YUVkaXRvckNsYXNzOiBhbnkgPSBudWxsO1xuXG4gIHByaXZhdGUgZ2V0TWV0YWRhdGFFZGl0b3JDbGFzcygpOiBhbnkge1xuICAgIGlmIChCYXNlTm90ZU1vZGFsLl9NZXRhZGF0YUVkaXRvckNsYXNzKSByZXR1cm4gQmFzZU5vdGVNb2RhbC5fTWV0YWRhdGFFZGl0b3JDbGFzcztcbiAgICBsZXQgY2xzOiBhbnkgPSBudWxsO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5pdGVyYXRlQWxsTGVhdmVzKChsZWFmKSA9PiB7XG4gICAgICBpZiAoIWNscykgY2xzID0gKGxlYWYudmlldyBhcyBhbnkpPy5tZXRhZGF0YUVkaXRvcj8uY29uc3RydWN0b3I7XG4gICAgfSk7XG4gICAgaWYgKGNscykgQmFzZU5vdGVNb2RhbC5fTWV0YWRhdGFFZGl0b3JDbGFzcyA9IGNscztcbiAgICByZXR1cm4gY2xzID8/IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5SWNvbmljUHJvcGVydHlJY29ucygpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubWV0YWRhdGFFZGl0b3I/LmNvbnRhaW5lckVsKSByZXR1cm47XG4gICAgY29uc3QgcHJvcGVydHlJY29uczogUmVjb3JkPHN0cmluZywgeyBpY29uPzogc3RyaW5nOyBjb2xvcj86IHN0cmluZyB9PiA9XG4gICAgICAodGhpcy5hcHAgYXMgYW55KS5wbHVnaW5zPy5wbHVnaW5zPy5bXCJpY29uaWNcIl0/LnNldHRpbmdzPy5wcm9wZXJ0eUljb25zID8/IHt9O1xuICAgIGlmICghT2JqZWN0LmtleXMocHJvcGVydHlJY29ucykubGVuZ3RoKSByZXR1cm47XG5cbiAgICBjb25zdCBwcm9wRWxzID0gdGhpcy5tZXRhZGF0YUVkaXRvci5jb250YWluZXJFbC5maW5kQWxsKFwiLm1ldGFkYXRhLXByb3BlcnR5XCIpO1xuICAgIGZvciAoY29uc3QgcHJvcEVsIG9mIHByb3BFbHMpIHtcbiAgICAgIGNvbnN0IGtleSA9IChwcm9wRWwgYXMgSFRNTEVsZW1lbnQpLmRhdGFzZXQucHJvcGVydHlLZXk/LnRvTG93ZXJDYXNlKCk7XG4gICAgICBpZiAoIWtleSkgY29udGludWU7XG4gICAgICBjb25zdCBlbnRyeSA9IHByb3BlcnR5SWNvbnNba2V5XTtcbiAgICAgIGlmICghZW50cnk/Lmljb24pIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaWNvbkVsID0gcHJvcEVsLmZpbmQoXCIubWV0YWRhdGEtcHJvcGVydHktaWNvblwiKSBhcyBIVE1MRWxlbWVudCB8IG51bGw7XG4gICAgICBpZiAoIWljb25FbCkgY29udGludWU7XG4gICAgICBzZXRJY29uKGljb25FbCwgZW50cnkuaWNvbik7XG4gICAgICBjb25zdCBzdmdFbCA9IGljb25FbC5maW5kKFwiLnN2Zy1pY29uXCIpIGFzIEhUTUxFbGVtZW50IHwgbnVsbDtcbiAgICAgIGlmIChzdmdFbCAmJiBlbnRyeS5jb2xvcikge1xuICAgICAgICBzdmdFbC5zdHlsZS5zZXRQcm9wZXJ0eShcImNvbG9yXCIsIGVudHJ5LmNvbG9yKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcmVmcmVzaENvbnRlbnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuaXNFZGl0aW5nIHx8ICF0aGlzLnJlbmRlcmVkQ29udGFpbmVyKSByZXR1cm47XG4gICAgaWYgKHRoaXMucmVuZGVyZWRDb250YWluZXIuY29udGFpbnMoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkpIHJldHVybjtcbiAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMubm90ZS5maWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xuICAgIGlmICghZmlsZSkgcmV0dXJuO1xuICAgIGNvbnN0IHJhdyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgY29uc3QgeyBib2R5IH0gPSBzdHJpcEZyb250bWF0dGVyKHJhdyk7XG4gICAgdGhpcy5yZW5kZXJlZENvbnRhaW5lci5lbXB0eSgpO1xuICAgIHRoaXMucmVuZGVyQ29tcG9uZW50Py51bmxvYWQoKTtcbiAgICB0aGlzLnJlbmRlckNvbXBvbmVudCA9IG5ldyBDb21wb25lbnQoKTtcbiAgICB0aGlzLnJlbmRlckNvbXBvbmVudC5sb2FkKCk7XG4gICAgYXdhaXQgTWFya2Rvd25SZW5kZXJlci5yZW5kZXIodGhpcy5hcHAsIGJvZHksIHRoaXMucmVuZGVyZWRDb250YWluZXIsIHRoaXMubm90ZS5maWxlcGF0aCwgdGhpcy5yZW5kZXJDb21wb25lbnQpO1xuICB9XG4gIC8qXG4gIHByb3RlY3RlZCBhc3luYyBzYXZlQm9keUVkaXRzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5pc0VkaXRpbmcgfHwgIXRoaXMudGlwdGFwRWRpdG9yKSByZXR1cm47XG4gICAgY29uc3QgbmV3Qm9keSA9IGV4dHJhY3RNYXJrZG93bih0aGlzLnRpcHRhcEVkaXRvcik7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLm5vdGUuZmlsZXBhdGgpIGFzIFRGaWxlIHwgbnVsbDtcbiAgICBpZiAoIWZpbGUpIHJldHVybjtcbiAgICBjb25zdCByYXcgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgIGNvbnN0IHsgZnJvbnRtYXR0ZXIsIGJvZHkgfSA9IHN0cmlwRnJvbnRtYXR0ZXIocmF3KTtcbiAgICBpZiAobmV3Qm9keS50cmltKCkgPT09IGJvZHkudHJpbSgpKSByZXR1cm47XG4gICAgYXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIGZyb250bWF0dGVyID8gYCR7ZnJvbnRtYXR0ZXJ9XFxuJHtuZXdCb2R5fWAgOiBuZXdCb2R5KTtcbiAgfSovXG5cbiAgcHJvdGVjdGVkIGFzeW5jIHNhdmVCb2R5RWRpdHMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLmlzRWRpdGluZykgcmV0dXJuO1xuICAgIGNvbnN0IG5ld0JvZHkgPSB0aGlzLlVTRV9DTTZcbiAgICAgID8gdGhpcy5jbTZFZGl0TW9kZVxuICAgICAgICA/IGdldENNNkNvbnRlbnQodGhpcy5jbTZFZGl0TW9kZSlcbiAgICAgICAgOiBudWxsXG4gICAgICA6IHRoaXMudGlwdGFwRWRpdG9yXG4gICAgICAgID8gZXh0cmFjdE1hcmtkb3duKHRoaXMudGlwdGFwRWRpdG9yKVxuICAgICAgICA6IG51bGw7XG4gICAgaWYgKG5ld0JvZHkgPT09IG51bGwpIHJldHVybjtcbiAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMubm90ZS5maWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xuICAgIGlmICghZmlsZSkgcmV0dXJuO1xuICAgIGNvbnN0IHJhdyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgY29uc3QgeyBmcm9udG1hdHRlciwgYm9keSB9ID0gc3RyaXBGcm9udG1hdHRlcihyYXcpO1xuICAgIGlmIChuZXdCb2R5LnRyaW0oKSA9PT0gYm9keS50cmltKCkpIHJldHVybjtcbiAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoZmlsZSwgZnJvbnRtYXR0ZXIgPyBgJHtmcm9udG1hdHRlcn1cXG4ke25ld0JvZHl9YCA6IG5ld0JvZHkpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHNhdmVUaXRsZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuaXNFZGl0aW5nIHx8ICF0aGlzLnRpdGxlRWwpIHJldHVybjtcbiAgICBjb25zdCBuZXdOYW1lID0gKHRoaXMudGl0bGVFbC50ZXh0Q29udGVudCA/PyBcIlwiKS50cmltKCk7XG4gICAgaWYgKCFuZXdOYW1lIHx8IG5ld05hbWUgPT09IHRoaXMub3JpZ2luYWxUaXRsZSkgcmV0dXJuO1xuICAgIGNvbnN0IGYgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZTtcbiAgICBpZiAoIWYpIHJldHVybjtcbiAgICBjb25zdCBkaXIgPSB0aGlzLm5vdGUuZmlsZXBhdGguaW5jbHVkZXMoXCIvXCIpXG4gICAgICA/IHRoaXMubm90ZS5maWxlcGF0aC5zdWJzdHJpbmcoMCwgdGhpcy5ub3RlLmZpbGVwYXRoLmxhc3RJbmRleE9mKFwiL1wiKSlcbiAgICAgIDogXCJcIjtcbiAgICBjb25zdCBuZXdQYXRoID0gZGlyID8gYCR7ZGlyfS8ke25ld05hbWV9Lm1kYCA6IGAke25ld05hbWV9Lm1kYDtcbiAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZW5hbWUoZiwgbmV3UGF0aCk7XG4gICAgdGhpcy5ub3RlID0geyAuLi50aGlzLm5vdGUsIGZpbGVwYXRoOiBuZXdQYXRoIH07XG4gICAgdGhpcy5vcmlnaW5hbFRpdGxlID0gbmV3TmFtZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBhdXRvQWN0aXZhdGVOb3RlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLm5vdGUuYWN0aXZlKSByZXR1cm47XG4gICAgdGhpcy5ub3RlID0geyAuLi50aGlzLm5vdGUsIGFjdGl2ZTogdHJ1ZSB9O1xuICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJBY3RpdmUodGhpcy5hcHAsIHRoaXMubm90ZS5maWxlcGF0aCwgdHJ1ZSk7XG4gICAgY29uc3QgY2IgPSB0aGlzLmNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yPEhUTUxJbnB1dEVsZW1lbnQ+KFwiLnNwYWNlZC1hY3RpdmUtY2hlY2tib3hcIik7XG4gICAgaWYgKGNiKSBjYi5jaGVja2VkID0gdHJ1ZTtcbiAgfVxuXG4gIHByb3RlY3RlZCByb3V0ZU5vdGUoKSB7XG4gICAgbmV3IFJvdXRlRm9sZGVyTW9kYWwodGhpcy5hcHAsIHRoaXMubm90ZSwgdGhpcy5wbHVnaW4sIChuZXdQYXRoKSA9PiB7XG4gICAgICB0aGlzLm5vdGUgPSB7IC4uLnRoaXMubm90ZSwgZmlsZXBhdGg6IG5ld1BhdGggfTtcbiAgICB9KS5vcGVuKCk7XG4gIH1cbiAgLypcbiAgcHJvdGVjdGVkIGNsZWFudXBFZGl0b3JzKCk6IHZvaWQge1xuICAgIHRoaXMudGlwdGFwRWRpdG9yPy5kZXN0cm95KCk7XG4gICAgdGhpcy50aXB0YXBFZGl0b3IgPSBudWxsO1xuICAgIHRoaXMucmVuZGVyQ29tcG9uZW50Py51bmxvYWQoKTtcbiAgICB0aGlzLnJlbmRlckNvbXBvbmVudCA9IG51bGw7XG4gICAgdGhpcy5tZXRhZGF0YUVkaXRvcj8udW5sb2FkKCk7XG4gICAgdGhpcy5tZXRhZGF0YUVkaXRvciA9IG51bGw7XG4gICAgdGhpcy5yZW5kZXJlZENvbnRhaW5lciA9IG51bGw7XG4gICAgdGhpcy5lZGl0b3JDb250YWluZXIgPSBudWxsO1xuICB9XG4qL1xuXG4gIHByb3RlY3RlZCBjbGVhbnVwRWRpdG9ycygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5VU0VfQ002KSB7XG4gICAgICBpZiAodGhpcy5jbTZMZWFmKSB7XG4gICAgICAgIGRlc3Ryb3lDTTZFZGl0b3IodGhpcy5jbTZMZWFmKTtcbiAgICAgICAgdGhpcy5jbTZMZWFmID0gbnVsbDtcbiAgICAgICAgdGhpcy5jbTZFZGl0TW9kZSA9IG51bGw7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudGlwdGFwRWRpdG9yPy5kZXN0cm95KCk7XG4gICAgICB0aGlzLnRpcHRhcEVkaXRvciA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMucmVuZGVyQ29tcG9uZW50Py51bmxvYWQoKTtcbiAgICB0aGlzLnJlbmRlckNvbXBvbmVudCA9IG51bGw7XG4gICAgdGhpcy5tZXRhZGF0YUVkaXRvcj8udW5sb2FkKCk7XG4gICAgdGhpcy5tZXRhZGF0YUVkaXRvciA9IG51bGw7XG4gICAgdGhpcy5yZW5kZXJlZENvbnRhaW5lciA9IG51bGw7XG4gICAgdGhpcy5lZGl0b3JDb250YWluZXIgPSBudWxsO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFkZEJ0bihcbiAgICBjb250YWluZXI6IEhUTUxFbGVtZW50LFxuICAgIG9wdHM6IHtcbiAgICAgIGxhYmVsPzogc3RyaW5nO1xuICAgICAgaWNvbj86IHN0cmluZztcbiAgICAgIGNsczogc3RyaW5nO1xuICAgICAgbW9kaWZpZXI/OiBzdHJpbmc7XG4gICAgICB0b29sdGlwPzogc3RyaW5nO1xuICAgICAgY2I6ICgpID0+IHZvaWQ7XG4gICAgfSxcbiAgKSB7XG4gICAgY29uc3QgYnRuID0gbmV3IEJ1dHRvbkNvbXBvbmVudChjb250YWluZXIpLm9uQ2xpY2sob3B0cy5jYik7XG5cbiAgICBpZiAob3B0cy5pY29uKSBidG4uc2V0SWNvbihvcHRzLmljb24pO1xuICAgIGlmIChvcHRzLmxhYmVsKSBidG4uc2V0QnV0dG9uVGV4dChvcHRzLmxhYmVsKTtcbiAgICBpZiAob3B0cy50b29sdGlwKSBidG4uc2V0VG9vbHRpcChvcHRzLnRvb2x0aXApO1xuICAgIGVsc2UgaWYgKCFvcHRzLmxhYmVsICYmIG9wdHMuaWNvbikgYnRuLnNldFRvb2x0aXAob3B0cy5jbHMpO1xuXG4gICAgYnRuLmJ1dHRvbkVsLmFkZENsYXNzKFwic3BhY2VkLWJ0blwiKTtcbiAgICBidG4uYnV0dG9uRWwuYWRkQ2xhc3MoYHNwYWNlZC1idG4tJHtvcHRzLmNsc31gKTtcbiAgICBpZiAob3B0cy5tb2RpZmllcikgYnRuLmJ1dHRvbkVsLmFkZENsYXNzKGBtb2QtJHtvcHRzLm1vZGlmaWVyfWApO1xuXG4gICAgcmV0dXJuIGJ0bjtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyByZW5kZXJDb250ZW50KGNvbnRlbnRFbDogSFRNTEVsZW1lbnQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMubm90ZS5maWxlcGF0aCkgYXMgVEZpbGU7XG4gICAgaWYgKCFmaWxlKSB7XG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYEZpbGUgbm90IGZvdW5kOiAke3RoaXMubm90ZS5maWxlcGF0aH1gIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCByYXcgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xuICAgIGNvbnN0IHsgYm9keSB9ID0gc3RyaXBGcm9udG1hdHRlcihyYXcpO1xuICAgIGF3YWl0IHRoaXMucmVuZGVyRnJvbnRtYXR0ZXJFZGl0b3IoY29udGVudEVsLCBmaWxlKTtcblxuICAgIC8vIFJlYWQtb25seSByZW5kZXJlZCB2aWV3XG4gICAgdGhpcy5yZW5kZXJlZENvbnRhaW5lciA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLW5vdGUtY29udGVudFwiIH0pO1xuICAgIHRoaXMucmVuZGVyQ29tcG9uZW50ID0gbmV3IENvbXBvbmVudCgpO1xuICAgIHRoaXMucmVuZGVyQ29tcG9uZW50LmxvYWQoKTtcbiAgICBhd2FpdCBNYXJrZG93blJlbmRlcmVyLnJlbmRlcih0aGlzLmFwcCwgYm9keSwgdGhpcy5yZW5kZXJlZENvbnRhaW5lciwgdGhpcy5ub3RlLmZpbGVwYXRoLCB0aGlzLnJlbmRlckNvbXBvbmVudCk7XG5cbiAgICAvKlxuICAgIC8vIFRpcHRhcCBlZGl0b3IgXHUyMDE0IGFsd2F5cyBjcmVhdGVkLCB2aXNpYmlsaXR5IGNvbnRyb2xsZWQgYnkgaXNFZGl0aW5nXG4gICAgdGhpcy5lZGl0b3JDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC10aXB0YXAtY29udGFpbmVyXCIgfSk7XG4gICAgaWYgKHRoaXMudGlwdGFwRWRpdG9yKSB7XG4gICAgICB0aGlzLnRpcHRhcEVkaXRvci5kZXN0cm95KCk7XG4gICAgICB0aGlzLnRpcHRhcEVkaXRvciA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMudGlwdGFwRWRpdG9yID0gY3JlYXRlVGlwdGFwRWRpdG9yKHRoaXMuZWRpdG9yQ29udGFpbmVyLCBib2R5KTtcblxuICAgIGlmICh0aGlzLmlzRWRpdGluZykge1xuICAgICAgdGhpcy5yZW5kZXJlZENvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICB0aGlzLmVkaXRvckNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZW5kZXJlZENvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcbiAgICAgIHRoaXMuZWRpdG9yQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICB9Ki9cblxuICAgIHRoaXMuZWRpdG9yQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtdGlwdGFwLWNvbnRhaW5lclwiIH0pO1xuICAgIGlmICh0aGlzLlVTRV9DTTYpIHtcbiAgICAgIGNvbnN0IHsgbGVhZiwgZWRpdE1vZGUgfSA9IGF3YWl0IGNyZWF0ZUNNNkVkaXRvcih0aGlzLmVkaXRvckNvbnRhaW5lciwgZmlsZSwgdGhpcy5hcHApO1xuICAgICAgdGhpcy5jbTZMZWFmID0gbGVhZjtcbiAgICAgIHRoaXMuY202RWRpdE1vZGUgPSBlZGl0TW9kZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMudGlwdGFwRWRpdG9yKSB7XG4gICAgICAgIHRoaXMudGlwdGFwRWRpdG9yLmRlc3Ryb3koKTtcbiAgICAgICAgdGhpcy50aXB0YXBFZGl0b3IgPSBudWxsO1xuICAgICAgfVxuICAgICAgdGhpcy50aXB0YXBFZGl0b3IgPSBjcmVhdGVUaXB0YXBFZGl0b3IodGhpcy5lZGl0b3JDb250YWluZXIsIGJvZHkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmlzRWRpdGluZykge1xuICAgICAgdGhpcy5yZW5kZXJlZENvbnRhaW5lciEuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgdGhpcy5lZGl0b3JDb250YWluZXIuc3R5bGUuZGlzcGxheSA9IFwiXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVuZGVyZWRDb250YWluZXIhLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xuICAgICAgdGhpcy5lZGl0b3JDb250YWluZXIuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBvblNlc3Npb25DbG9zZSgpOiB2b2lkIHt9XG5cbiAgcHJvdGVjdGVkIGFic3RyYWN0IHJlbmRlckJ1dHRvbnMoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQ7XG5cbiAgb25DbG9zZSgpIHtcbiAgICB0aGlzLnRlYXJkb3duVmF1bHRMaXN0ZW5lcigpO1xuICAgIHZvaWQgdGhpcy5zYXZlVGl0bGUoKTtcbiAgICB2b2lkIHRoaXMuc2F2ZUJvZHlFZGl0cygpO1xuICAgIHRoaXMub25TZXNzaW9uQ2xvc2UoKTtcbiAgICB0aGlzLmNsZWFudXBFZGl0b3JzKCk7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IEFwcCwgU2V0dGluZywgTW9kYWwsIE5vdGljZSwgVEZvbGRlciB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBCYXNlTm90ZSB9IGZyb20gXCIuL3R5cGVzXCI7XHJcbmltcG9ydCB0eXBlIFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xyXG5pbXBvcnQgeyBzYXZlU3RvcmUgfSBmcm9tIFwiLi9zdG9yZVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFJvdXRlRm9sZGVyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgcHJpdmF0ZSBzZWxlY3RlZEZvbGRlciA9IFwiXCI7XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgYXBwOiBBcHAsXHJcbiAgICBwcml2YXRlIG5vdGU6IEJhc2VOb3RlLFxyXG4gICAgcHJpdmF0ZSBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXHJcbiAgICBwcml2YXRlIG9uTW92ZWQ6IChuZXdQYXRoOiBzdHJpbmcpID0+IHZvaWQsXHJcbiAgKSB7XHJcbiAgICBzdXBlcihhcHApO1xyXG4gIH1cclxuXHJcbiAgb25PcGVuKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiUm91dGUgbm90ZSB0b1x1MjAyNlwiIH0pO1xyXG5cclxuICAgIC8vIFx1MjUwMFx1MjUwMCBRdWljay1yb3V0ZSBidXR0b24gKG9ubHkgc2hvd24gaWYgYSBsYXN0IGZvbGRlciBpcyByZW1lbWJlcmVkKSBcdTI1MDBcdTI1MDBcclxuICAgIGNvbnN0IGxhc3RGb2xkZXIgPSB0aGlzLnBsdWdpbi5kYXRhLmxhc3RSb3V0ZWRGb2xkZXI7XHJcbiAgICBpZiAobGFzdEZvbGRlcikge1xyXG4gICAgICBjb25zdCBxdWlja0J0biA9IGNvbnRlbnRFbC5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcbiAgICAgICAgdGV4dDogYFx1MjFBOSBNb3ZlIHRvICR7bGFzdEZvbGRlcn1gLFxyXG4gICAgICAgIGNsczogXCJzcGFjZWQtYnRuIG1vZC1jdGEgc3BhY2VkLWJ0bi1xdWljay1yb3V0ZVwiLFxyXG4gICAgICB9KTtcclxuICAgICAgcXVpY2tCdG4uc3R5bGUubWFyZ2luQm90dG9tID0gXCIxMnB4XCI7XHJcbiAgICAgIHF1aWNrQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5kb01vdmUobGFzdEZvbGRlcik7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFx1MjUwMFx1MjUwMCBGb2xkZXIgcGlja2VyIFx1MjUwMFx1MjUwMFxyXG4gICAgY29uc3QgZm9sZGVycyA9IHRoaXMuYXBwLnZhdWx0XHJcbiAgICAgIC5nZXRBbGxGb2xkZXJzKClcclxuICAgICAgLm1hcCgoZikgPT4gZi5wYXRoKVxyXG4gICAgICAuc29ydCgpO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbCkuc2V0TmFtZShcIkRlc3RpbmF0aW9uIGZvbGRlclwiKS5hZGREcm9wZG93bigoZHJvcCkgPT4ge1xyXG4gICAgICBkcm9wLmFkZE9wdGlvbihcIlwiLCBcIlx1MjAxNCBzZWxlY3QgYSBmb2xkZXIgXHUyMDE0XCIpO1xyXG4gICAgICBmb3IgKGNvbnN0IGYgb2YgZm9sZGVycykge1xyXG4gICAgICAgIGRyb3AuYWRkT3B0aW9uKGYsIGYpO1xyXG4gICAgICB9XHJcbiAgICAgIGRyb3Aub25DaGFuZ2UoKHYpID0+IHtcclxuICAgICAgICB0aGlzLnNlbGVjdGVkRm9sZGVyID0gdjtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBidG5Sb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1idG4tcm93XCIgfSk7XHJcblxyXG4gICAgY29uc3QgY2FuY2VsQnRuID0gYnRuUm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDYW5jZWxcIiB9KTtcclxuICAgIGNhbmNlbEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5jbG9zZSgpKTtcclxuXHJcbiAgICBjb25zdCBjb25maXJtQnRuID0gYnRuUm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJNb3ZlXCIsIGNsczogXCJtb2QtY3RhXCIgfSk7XHJcbiAgICBjb25maXJtQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGlmICghdGhpcy5zZWxlY3RlZEZvbGRlcikgcmV0dXJuO1xyXG4gICAgICBhd2FpdCB0aGlzLmRvTW92ZSh0aGlzLnNlbGVjdGVkRm9sZGVyKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIFNoYXJlZCBtb3ZlIGxvZ2ljIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gIHByaXZhdGUgYXN5bmMgZG9Nb3ZlKGZvbGRlcjogc3RyaW5nKSB7XHJcbiAgICAvLyBDaGVjayBmb2xkZXIgc3RpbGwgZXhpc3RzXHJcbiAgICBjb25zdCBmb2xkZXJFeGlzdHMgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZm9sZGVyKSBpbnN0YW5jZW9mIFRGb2xkZXI7XHJcbiAgICBpZiAoIWZvbGRlckV4aXN0cykge1xyXG4gICAgICBuZXcgTm90aWNlKGBGb2xkZXIgXCIke2ZvbGRlcn1cIiBubyBsb25nZXIgZXhpc3RzLmApO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgbm90ZSBpc24ndCBhbHJlYWR5IHRoZXJlXHJcbiAgICBjb25zdCBjdXJyZW50Rm9sZGVyID0gdGhpcy5ub3RlLmZpbGVwYXRoLmluY2x1ZGVzKFwiL1wiKVxyXG4gICAgICA/IHRoaXMubm90ZS5maWxlcGF0aC5zdWJzdHJpbmcoMCwgdGhpcy5ub3RlLmZpbGVwYXRoLmxhc3RJbmRleE9mKFwiL1wiKSlcclxuICAgICAgOiBcIlwiO1xyXG4gICAgaWYgKGN1cnJlbnRGb2xkZXIgPT09IGZvbGRlcikge1xyXG4gICAgICBuZXcgTm90aWNlKGBOb3RlIGlzIGFscmVhZHkgaW4gXCIke2ZvbGRlcn1cIi5gKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGZpbGVuYW1lID0gdGhpcy5ub3RlLmZpbGVwYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSE7XHJcbiAgICBjb25zdCBkZXN0ID0gYCR7Zm9sZGVyfS8ke2ZpbGVuYW1lfWA7XHJcbiAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMubm90ZS5maWxlcGF0aCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgaWYgKGZpbGUpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZW5hbWUoZmlsZSwgZGVzdCk7XHJcbiAgICAgICAgLy8gU2F2ZSBsYXN0IHVzZWQgZm9sZGVyXHJcbiAgICAgICAgdGhpcy5wbHVnaW4uZGF0YS5sYXN0Um91dGVkRm9sZGVyID0gZm9sZGVyO1xyXG4gICAgICAgIGF3YWl0IHNhdmVTdG9yZSh0aGlzLnBsdWdpbiwgdGhpcy5wbHVnaW4uZGF0YSk7XHJcbiAgICAgICAgdGhpcy5vbk1vdmVkKGRlc3QpO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIG5ldyBOb3RpY2UoYENvdWxkIG5vdCBtb3ZlIG5vdGU6ICR7ZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpfWApO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5jbG9zZSgpO1xyXG4gIH1cclxuXHJcbiAgb25DbG9zZSgpIHtcclxuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XHJcbiAgfVxyXG59XHJcbiIsICJpbXBvcnQgeyBBcHAsIE1vZGFsLCBURm9sZGVyLCBGdXp6eVN1Z2dlc3RNb2RhbCwgTm90aWNlLCBzZXRJY29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xyXG5pbXBvcnQgeyB3cml0ZUZyb250bWF0dGVyQWN0aXZlLCB3cml0ZUZyb250bWF0dGVyRGVja3MgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiO1xyXG5pbXBvcnQgeyBnZXRBbGxEZWNrTmFtZXMgfSBmcm9tIFwiLi91dGlsc1wiO1xyXG5pbXBvcnQgeyBjcmVhdGVEZWNrRHJvcGRvd24gfSBmcm9tIFwiLi9kZWNrRHJvcGRvd25cIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBRdWlja05vdGVNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICBwcml2YXRlIHRpdGxlSW5wdXQhOiBIVE1MSW5wdXRFbGVtZW50O1xyXG4gIHByaXZhdGUgY29udGVudEFyZWEhOiBIVE1MVGV4dEFyZWFFbGVtZW50O1xyXG4gIHByaXZhdGUgc2VsZWN0ZWREZWNrczogc3RyaW5nW107XHJcbiAgcHJpdmF0ZSBjdXN0b21Mb2NhdGlvbjogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcbiAgcHJpdmF0ZSBsb2NhdGlvbkxhYmVsITogSFRNTFNwYW5FbGVtZW50O1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFwcDogQXBwLFxyXG4gICAgcHJpdmF0ZSBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXHJcbiAgICBwcml2YXRlIGRlY2tOYW1lOiBzdHJpbmcgPSBcIlwiLFxyXG4gICkge1xyXG4gICAgc3VwZXIoYXBwKTtcclxuICAgIHRoaXMuc2VsZWN0ZWREZWNrcyA9IGRlY2tOYW1lID8gW2RlY2tOYW1lXSA6IFtdO1xyXG4gIH1cclxuXHJcbiAgb25PcGVuKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJRdWljayBub3RlXCIgfSk7XHJcblxyXG4gICAgdGhpcy50aXRsZUlucHV0ID0gY29udGVudEVsLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG4gICAgICB0eXBlOiBcInRleHRcIixcclxuICAgICAgcGxhY2Vob2xkZXI6IFwiVGl0bGVcIixcclxuICAgICAgY2xzOiBcInNwYWNlZC1xdWlja25vdGUtdGl0bGVcIixcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuY29udGVudEFyZWEgPSBjb250ZW50RWwuY3JlYXRlRWwoXCJ0ZXh0YXJlYVwiLCB7XHJcbiAgICAgIHBsYWNlaG9sZGVyOiBcIkpvdCBzb21ldGhpbmcgZG93bi4uLlwiLFxyXG4gICAgICBjbHM6IFwic3BhY2VkLXF1aWNrbm90ZS1ib2R5XCIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBcdTI1MDBcdTI1MDAgRGVjayByb3cgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgICBjb25zdCBkZWNrUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtcXVpY2tub3RlLXJvd1wiIH0pO1xyXG5cclxuICAgIGNvbnN0IGRlY2tXcmFwcGVyID0gZGVja1Jvdy5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2std3JhcHBlclwiIH0pO1xyXG4gICAgY29uc3QgZGVja0J0biA9IGRlY2tXcmFwcGVyLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtZGVjay1idG5cIiB9KTtcclxuICAgIHNldEljb24oZGVja0J0biwgXCJsYXllcnNcIik7XHJcbiAgICBkZWNrQnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJBc3NpZ24gdG8gZGVja3NcIik7XHJcbiAgICBjb25zdCBkZWNrTGFiZWwgPSBkZWNrUm93LmNyZWF0ZVNwYW4oeyBjbHM6IFwic3BhY2VkLXF1aWNrbm90ZS1kZWNrLWxhYmVsXCIgfSk7XHJcbiAgICB0aGlzLnVwZGF0ZURlY2tMYWJlbChkZWNrTGFiZWwpO1xyXG5cclxuICAgIGxldCBkZWNrRHJvcGRvd246IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcbiAgICBkZWNrRHJvcGRvd24gPSBjcmVhdGVEZWNrRHJvcGRvd24odGhpcy5hcHAsIGRlY2tXcmFwcGVyLCBbLi4udGhpcy5zZWxlY3RlZERlY2tzXSwgKGRlY2tzKSA9PiB7XHJcbiAgICAgIHRoaXMuc2VsZWN0ZWREZWNrcyA9IFsuLi5kZWNrc107XHJcbiAgICAgIHRoaXMudXBkYXRlRGVja0xhYmVsKGRlY2tMYWJlbCk7XHJcbiAgICAgIHRoaXMudXBkYXRlTG9jYXRpb25MYWJlbCgpO1xyXG4gICAgfSkuZHJvcGRvd247XHJcblxyXG4gICAgLy8gXCJBZGQgdG8gY3VycmVudCBkZWNrXCIgY2hlY2tib3ggXHUyMDE0IG9ubHkgc2hvd24gd2hlbiBvcGVuZWQgZnJvbSBBY3RpdmVNb2RhbFxyXG4gICAgaWYgKHRoaXMuZGVja05hbWUpIHtcclxuICAgICAgY29uc3QgYWRkVG9EZWNrUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtcXVpY2tub3RlLXJvd1wiIH0pO1xyXG4gICAgICBjb25zdCBjYiA9IGFkZFRvRGVja1Jvdy5jcmVhdGVFbChcImlucHV0XCIpO1xyXG4gICAgICBjYi50eXBlID0gXCJjaGVja2JveFwiO1xyXG4gICAgICBjYi5jaGVja2VkID0gdHJ1ZTtcclxuICAgICAgYWRkVG9EZWNrUm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiBgQWRkIHRvIFwiJHt0aGlzLmRlY2tOYW1lfVwiYCB9KTtcclxuICAgICAgY2IuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB7XHJcbiAgICAgICAgaWYgKGNiLmNoZWNrZWQpIHtcclxuICAgICAgICAgIGlmICghdGhpcy5zZWxlY3RlZERlY2tzLmluY2x1ZGVzKHRoaXMuZGVja05hbWUpKSB0aGlzLnNlbGVjdGVkRGVja3MucHVzaCh0aGlzLmRlY2tOYW1lKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5zZWxlY3RlZERlY2tzID0gdGhpcy5zZWxlY3RlZERlY2tzLmZpbHRlcigoZCkgPT4gZCAhPT0gdGhpcy5kZWNrTmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMudXBkYXRlRGVja0xhYmVsKGRlY2tMYWJlbCk7XHJcbiAgICAgICAgdGhpcy51cGRhdGVMb2NhdGlvbkxhYmVsKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFx1MjUwMFx1MjUwMCBMb2NhdGlvbiByb3cgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgICBjb25zdCBsb2NhdGlvblJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLXF1aWNrbm90ZS1yb3dcIiB9KTtcclxuICAgIHRoaXMubG9jYXRpb25MYWJlbCA9IGxvY2F0aW9uUm93LmNyZWF0ZVNwYW4oeyBjbHM6IFwic3BhY2VkLXF1aWNrbm90ZS1sb2NhdGlvbi1sYWJlbFwiIH0pO1xyXG4gICAgdGhpcy51cGRhdGVMb2NhdGlvbkxhYmVsKCk7XHJcblxyXG4gICAgY29uc3QgY2hvb3NlQnRuID0gbG9jYXRpb25Sb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNob29zZSBvdGhlciBsb2NhdGlvblx1MjAyNlwiIH0pO1xyXG4gICAgY2hvb3NlQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgIG5ldyBGb2xkZXJQaWNrZXJNb2RhbCh0aGlzLmFwcCwgKGZvbGRlclBhdGgpID0+IHtcclxuICAgICAgICB0aGlzLmN1c3RvbUxvY2F0aW9uID0gZm9sZGVyUGF0aDtcclxuICAgICAgICB0aGlzLnVwZGF0ZUxvY2F0aW9uTGFiZWwoKTtcclxuICAgICAgfSkub3BlbigpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gXHUyNTAwXHUyNTAwIEJ1dHRvbnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgICBjb25zdCBidG5Sb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1idG4tcm93XCIgfSk7XHJcbiAgICBidG5Sb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNhbmNlbFwiIH0pLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNsb3NlKCkpO1xyXG4gICAgYnRuUm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDcmVhdGVcIiwgY2xzOiBcIm1vZC1jdGFcIiB9KS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5jcmVhdGVOb3RlKCkpO1xyXG5cclxuICAgIGNvbnRlbnRFbC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZSkgPT4ge1xyXG4gICAgICBpZiAoKGUuY3RybEtleSB8fCBlLm1ldGFLZXkpICYmIGUua2V5ID09PSBcIkVudGVyXCIpIHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgdGhpcy5jcmVhdGVOb3RlKCk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGUua2V5ID09PSBcIkVzY2FwZVwiKSB0aGlzLmNsb3NlKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnRpdGxlSW5wdXQuZm9jdXMoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgdXBkYXRlRGVja0xhYmVsKGVsOiBIVE1MU3BhbkVsZW1lbnQpIHtcclxuICAgIGVsLnRleHRDb250ZW50ID0gdGhpcy5zZWxlY3RlZERlY2tzLmxlbmd0aCA+IDAgPyB0aGlzLnNlbGVjdGVkRGVja3Muam9pbihcIiwgXCIpIDogXCJObyBkZWNrXCI7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHVwZGF0ZUxvY2F0aW9uTGFiZWwoKSB7XHJcbiAgICBpZiAodGhpcy5jdXN0b21Mb2NhdGlvbiAhPT0gbnVsbCkge1xyXG4gICAgICB0aGlzLmxvY2F0aW9uTGFiZWwudGV4dENvbnRlbnQgPSBgU2F2ZSB0bzogJHt0aGlzLmN1c3RvbUxvY2F0aW9ufS9gO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvLyBDaGVjayBpZiB0aGUgcHJpbWFyeSBkZWNrIG5hbWUgbWF0Y2hlcyBhIGZvbGRlclxyXG4gICAgaWYgKHRoaXMuc2VsZWN0ZWREZWNrcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5zZWxlY3RlZERlY2tzWzBdKTtcclxuICAgICAgaWYgKGYgaW5zdGFuY2VvZiBURm9sZGVyKSB7XHJcbiAgICAgICAgdGhpcy5sb2NhdGlvbkxhYmVsLnRleHRDb250ZW50ID0gYFNhdmUgdG86ICR7dGhpcy5zZWxlY3RlZERlY2tzWzBdfS8gKGRlY2sgZm9sZGVyKWA7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjb25zdCBkZWZhdWx0Rm9sZGVyID0gdGhpcy5hcHAuZmlsZU1hbmFnZXIuZ2V0TmV3RmlsZVBhcmVudChcIlwiKS5wYXRoO1xyXG4gICAgdGhpcy5sb2NhdGlvbkxhYmVsLnRleHRDb250ZW50ID0gYFNhdmUgdG86ICR7ZGVmYXVsdEZvbGRlciA9PT0gXCIvXCIgPyBcInZhdWx0IHJvb3RcIiA6IGRlZmF1bHRGb2xkZXIgKyBcIi9cIn1gO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZXNvbHZlRm9sZGVyKCk6IHN0cmluZyB7XHJcbiAgICBpZiAodGhpcy5jdXN0b21Mb2NhdGlvbiAhPT0gbnVsbCkgcmV0dXJuIHRoaXMuY3VzdG9tTG9jYXRpb247XHJcbiAgICBpZiAodGhpcy5zZWxlY3RlZERlY2tzLmxlbmd0aCA+IDApIHtcclxuICAgICAgY29uc3QgZiA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLnNlbGVjdGVkRGVja3NbMF0pO1xyXG4gICAgICBpZiAoZiBpbnN0YW5jZW9mIFRGb2xkZXIpIHJldHVybiB0aGlzLnNlbGVjdGVkRGVja3NbMF07XHJcbiAgICB9XHJcbiAgICBjb25zdCBwYXJlbnQgPSB0aGlzLmFwcC5maWxlTWFuYWdlci5nZXROZXdGaWxlUGFyZW50KFwiXCIpO1xyXG4gICAgcmV0dXJuIHBhcmVudC5wYXRoID09PSBcIi9cIiA/IFwiXCIgOiBwYXJlbnQucGF0aDtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlTm90ZSgpIHtcclxuICAgIGNvbnN0IHRpdGxlID0gdGhpcy50aXRsZUlucHV0LnZhbHVlLnRyaW0oKTtcclxuICAgIGlmICghdGl0bGUpIHtcclxuICAgICAgdGhpcy50aXRsZUlucHV0LmZvY3VzKCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmb2xkZXIgPSB0aGlzLnJlc29sdmVGb2xkZXIoKTtcclxuICAgIGNvbnN0IHBhdGggPSBmb2xkZXIgPyBgJHtmb2xkZXJ9LyR7dGl0bGV9Lm1kYCA6IGAke3RpdGxlfS5tZGA7XHJcbiAgICBjb25zdCBib2R5ID0gdGhpcy5jb250ZW50QXJlYS52YWx1ZS50cmltKCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNyZWF0ZShwYXRoLCBib2R5ID8gYCR7Ym9keX1cXG5gIDogXCJcIik7XHJcbiAgICAgIGlmICh0aGlzLnNlbGVjdGVkRGVja3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJEZWNrcyh0aGlzLmFwcCwgZmlsZS5wYXRoLCB0aGlzLnNlbGVjdGVkRGVja3MpO1xyXG4gICAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJBY3RpdmUodGhpcy5hcHAsIGZpbGUucGF0aCwgdHJ1ZSk7XHJcbiAgICAgIH1cclxuICAgICAgbmV3IE5vdGljZShgQ3JlYXRlZCBcIiR7dGl0bGV9XCJgKTtcclxuICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICBuZXcgTm90aWNlKGBDb3VsZCBub3QgY3JlYXRlIG5vdGU6ICR7KGUgYXMgRXJyb3IpLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBvbkNsb3NlKCkge1xyXG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuICB9XHJcbn1cclxuXHJcbmNsYXNzIEZvbGRlclBpY2tlck1vZGFsIGV4dGVuZHMgRnV6enlTdWdnZXN0TW9kYWw8VEZvbGRlcj4ge1xyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgYXBwOiBBcHAsXHJcbiAgICBwcml2YXRlIG9uQ2hvb3NlOiAocGF0aDogc3RyaW5nKSA9PiB2b2lkLFxyXG4gICkge1xyXG4gICAgc3VwZXIoYXBwKTtcclxuICAgIHRoaXMuc2V0UGxhY2Vob2xkZXIoXCJDaG9vc2UgYSBmb2xkZXJcdTIwMjZcIik7XHJcbiAgfVxyXG5cclxuICBnZXRJdGVtcygpOiBURm9sZGVyW10ge1xyXG4gICAgY29uc3QgZm9sZGVyczogVEZvbGRlcltdID0gW107XHJcbiAgICBjb25zdCByb290ID0gdGhpcy5hcHAudmF1bHQuZ2V0Um9vdCgpO1xyXG4gICAgY29uc3QgY29sbGVjdCA9IChmb2xkZXI6IFRGb2xkZXIpID0+IHtcclxuICAgICAgZm9sZGVycy5wdXNoKGZvbGRlcik7XHJcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZm9sZGVyLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgaWYgKGNoaWxkIGluc3RhbmNlb2YgVEZvbGRlcikgY29sbGVjdChjaGlsZCk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICBjb2xsZWN0KHJvb3QpO1xyXG4gICAgcmV0dXJuIGZvbGRlcnM7XHJcbiAgfVxyXG5cclxuICBnZXRJdGVtVGV4dChmb2xkZXI6IFRGb2xkZXIpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIGZvbGRlci5wYXRoID09PSBcIi9cIiA/IFwiLyAodmF1bHQgcm9vdClcIiA6IGZvbGRlci5wYXRoO1xyXG4gIH1cclxuXHJcbiAgb25DaG9vc2VJdGVtKGZvbGRlcjogVEZvbGRlcikge1xyXG4gICAgdGhpcy5vbkNob29zZShmb2xkZXIucGF0aCA9PT0gXCIvXCIgPyBcIlwiIDogZm9sZGVyLnBhdGgpO1xyXG4gIH1cclxufVxyXG4iLCAiaW1wb3J0IHsgQXBwLCBzZXRJY29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IGdldEFsbERlY2tOYW1lcyB9IGZyb20gXCIuL3V0aWxzXCI7XHJcblxyXG4vKipcclxuICogQnVpbGRzIGFuZCBhdHRhY2hlcyBhIGRlY2stcGlja2VyIGRyb3Bkb3duIHRvIGBhbmNob3JgLlxyXG4gKlxyXG4gKiBAcGFyYW0gYXBwICAgICAgICAgICAtIFRoZSBPYnNpZGlhbiBBcHAgaW5zdGFuY2VcclxuICogQHBhcmFtIGFuY2hvciAgICAgICAgLSBUaGUgZWxlbWVudCB0aGUgZHJvcGRvd24gd2lsbCBiZSBhcHBlbmRlZCB0b1xyXG4gKiBAcGFyYW0gaW5pdGlhbERlY2tzICAtIFRoZSBkZWNrcyBhbHJlYWR5IHNlbGVjdGVkIGZvciB0aGlzIG5vdGVcclxuICogQHBhcmFtIG9uRGVja3NDaGFuZ2VkIC0gQ2FsbGVkIHdpdGggdGhlIG5ldyBkZWNrIGxpc3Qgd2hlbmV2ZXIgaXQgY2hhbmdlc1xyXG4gKlxyXG4gKiBSZXR1cm5zIHRoZSBkcm9wZG93biBlbGVtZW50IGFuZCB0aGUgb3V0c2lkZS1jbGljayBoYW5kbGVyXHJcbiAqIChzbyB0aGUgY2FsbGVyIGNhbiByZW1vdmUgdGhlIGhhbmRsZXIgaWYgaXQgY2xvc2VzIHRoZSBkcm9wZG93biBtYW51YWxseSkuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRGVja0Ryb3Bkb3duKFxyXG4gIGFwcDogQXBwLFxyXG4gIGFuY2hvcjogSFRNTEVsZW1lbnQsXHJcbiAgaW5pdGlhbERlY2tzOiBzdHJpbmdbXSxcclxuICBvbkRlY2tzQ2hhbmdlZDogKHVwZGF0ZWREZWNrczogc3RyaW5nW10pID0+IFByb21pc2U8dm9pZD4gfCB2b2lkLFxyXG4pOiB7IGRyb3Bkb3duOiBIVE1MRWxlbWVudDsgb3V0c2lkZUhhbmRsZXI6IChlOiBNb3VzZUV2ZW50KSA9PiB2b2lkIH0ge1xyXG4gIGNvbnN0IGFsbERlY2tzID0gZ2V0QWxsRGVja05hbWVzKGFwcCk7XHJcbiAgY29uc3QgY3VycmVudERlY2tzID0gWy4uLmluaXRpYWxEZWNrc107IC8vIHdvcmsgb24gYSBjb3B5XHJcblxyXG4gIGNvbnN0IGRyb3Bkb3duID0gYW5jaG9yLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtZGVjay1kcm9wZG93blwiIH0pO1xyXG5cclxuICBjb25zdCBzZWFyY2hJbnB1dCA9IGRyb3Bkb3duLmNyZWF0ZUVsKFwiaW5wdXRcIik7XHJcbiAgc2VhcmNoSW5wdXQudHlwZSA9IFwidGV4dFwiO1xyXG4gIHNlYXJjaElucHV0LnBsYWNlaG9sZGVyID0gXCJTZWFyY2ggZGVja3NcdTIwMjZcIjtcclxuICBzZWFyY2hJbnB1dC5hZGRDbGFzcyhcInNwYWNlZC1kZWNrLXNlYXJjaFwiKTtcclxuXHJcbiAgY29uc3QgbGlzdEVsID0gZHJvcGRvd24uY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1kZWNrLWxpc3RcIiB9KTtcclxuXHJcbiAgY29uc3QgYWRkRGVjayA9IGFzeW5jIChuYW1lOiBzdHJpbmcpID0+IHtcclxuICAgIGNvbnN0IHRyaW1tZWQgPSBuYW1lLnRyaW0oKTtcclxuICAgIGlmICghdHJpbW1lZCB8fCBjdXJyZW50RGVja3MuaW5jbHVkZXModHJpbW1lZCkpIHJldHVybjtcclxuICAgIGN1cnJlbnREZWNrcy5wdXNoKHRyaW1tZWQpO1xyXG4gICAgaWYgKCFhbGxEZWNrcy5pbmNsdWRlcyh0cmltbWVkKSkge1xyXG4gICAgICBhbGxEZWNrcy5wdXNoKHRyaW1tZWQpO1xyXG4gICAgICBhbGxEZWNrcy5zb3J0KCk7XHJcbiAgICB9XHJcbiAgICBhd2FpdCBvbkRlY2tzQ2hhbmdlZChjdXJyZW50RGVja3MpO1xyXG4gICAgc2VhcmNoSW5wdXQudmFsdWUgPSBcIlwiO1xyXG4gICAgcmVuZGVyTGlzdChcIlwiKTtcclxuICB9O1xyXG5cclxuICBjb25zdCByZW5kZXJMaXN0ID0gKGZpbHRlcjogc3RyaW5nKSA9PiB7XHJcbiAgICBsaXN0RWwuZW1wdHkoKTtcclxuICAgIGNvbnN0IGZpbHRlcmVkID0gYWxsRGVja3MuZmlsdGVyKChkKSA9PiBkLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoZmlsdGVyLnRvTG93ZXJDYXNlKCkpKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IGRlY2sgb2YgZmlsdGVyZWQpIHtcclxuICAgICAgY29uc3QgaXRlbSA9IGxpc3RFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2staXRlbVwiIH0pO1xyXG4gICAgICBjb25zdCBjYiA9IGl0ZW0uY3JlYXRlRWwoXCJpbnB1dFwiKTtcclxuICAgICAgY2IudHlwZSA9IFwiY2hlY2tib3hcIjtcclxuICAgICAgY2IuY2hlY2tlZCA9IGN1cnJlbnREZWNrcy5pbmNsdWRlcyhkZWNrKTtcclxuICAgICAgaXRlbS5jcmVhdGVTcGFuKHsgdGV4dDogZGVjayB9KTtcclxuICAgICAgaXRlbS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKGUpID0+IHtcclxuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIGNvbnN0IGlkeCA9IGN1cnJlbnREZWNrcy5pbmRleE9mKGRlY2spO1xyXG4gICAgICAgIGlmIChpZHggPj0gMCkge1xyXG4gICAgICAgICAgY3VycmVudERlY2tzLnNwbGljZShpZHgsIDEpO1xyXG4gICAgICAgICAgY2IuY2hlY2tlZCA9IGZhbHNlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjdXJyZW50RGVja3MucHVzaChkZWNrKTtcclxuICAgICAgICAgIGNiLmNoZWNrZWQgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhd2FpdCBvbkRlY2tzQ2hhbmdlZChjdXJyZW50RGVja3MpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZmlsdGVyLnRyaW0oKSkge1xyXG4gICAgICBjb25zdCBhZGRJdGVtID0gbGlzdEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtZGVjay1pdGVtIHNwYWNlZC1kZWNrLWFkZFwiIH0pO1xyXG4gICAgICBjb25zdCBpY29uRWwgPSBhZGRJdGVtLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtZGVjay1hZGQtaWNvblwiIH0pO1xyXG4gICAgICBzZXRJY29uKGljb25FbCwgXCJjaXJjbGUtcGx1c1wiKTtcclxuICAgICAgYWRkSXRlbS5jcmVhdGVTcGFuKHsgdGV4dDogYEFkZCBcIiR7ZmlsdGVyLnRyaW0oKX1cImAgfSk7XHJcbiAgICAgIGFkZEl0ZW0uYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBhc3luYyAoZSkgPT4ge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIGF3YWl0IGFkZERlY2soZmlsdGVyLnRyaW0oKSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHJlbmRlckxpc3QoXCJcIik7XHJcbiAgc2VhcmNoSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsICgpID0+IHJlbmRlckxpc3Qoc2VhcmNoSW5wdXQudmFsdWUpKTtcclxuXHJcbiAgc2VhcmNoSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgYXN5bmMgKGUpID0+IHtcclxuICAgIGlmIChlLmtleSAhPT0gXCJFbnRlclwiKSByZXR1cm47XHJcbiAgICBjb25zdCBmaWx0ZXIgPSBzZWFyY2hJbnB1dC52YWx1ZS50cmltKCk7XHJcbiAgICBpZiAoIWZpbHRlcikgcmV0dXJuO1xyXG4gICAgY29uc3QgZmlsdGVyZWQgPSBhbGxEZWNrcy5maWx0ZXIoKGQpID0+IGQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhmaWx0ZXIudG9Mb3dlckNhc2UoKSkpO1xyXG4gICAgaWYgKGZpbHRlcmVkLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICBjb25zdCBkZWNrID0gZmlsdGVyZWRbMF07XHJcbiAgICAgIGNvbnN0IGlkeCA9IGN1cnJlbnREZWNrcy5pbmRleE9mKGRlY2spO1xyXG4gICAgICBpZiAoaWR4ID49IDApIGN1cnJlbnREZWNrcy5zcGxpY2UoaWR4LCAxKTtcclxuICAgICAgZWxzZSBjdXJyZW50RGVja3MucHVzaChkZWNrKTtcclxuICAgICAgYXdhaXQgb25EZWNrc0NoYW5nZWQoY3VycmVudERlY2tzKTtcclxuICAgICAgcmVuZGVyTGlzdChmaWx0ZXIpO1xyXG4gICAgfSBlbHNlIGlmIChmaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcclxuICAgICAgYXdhaXQgYWRkRGVjayhmaWx0ZXIpO1xyXG4gICAgfVxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gIH0pO1xyXG5cclxuICBjb25zdCBvdXRzaWRlSGFuZGxlciA9IChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcbiAgICBpZiAoIWRvY3VtZW50LmNvbnRhaW5zKGRyb3Bkb3duKSB8fCAhZHJvcGRvd24uY29udGFpbnMoZS50YXJnZXQgYXMgTm9kZSkpIHtcclxuICAgICAgZHJvcGRvd24ucmVtb3ZlKCk7XHJcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb3V0c2lkZUhhbmRsZXIpO1xyXG4gICAgfVxyXG4gIH07XHJcbiAgc2V0VGltZW91dCgoKSA9PiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG91dHNpZGVIYW5kbGVyKSwgMCk7XHJcbiAgc2VhcmNoSW5wdXQuZm9jdXMoKTtcclxuICByZXR1cm4geyBkcm9wZG93biwgb3V0c2lkZUhhbmRsZXIgfTtcclxufVxyXG4iLCAiaW1wb3J0IHsgQXBwLCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBzdHJpcEZyb250bWF0dGVyIH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUNNNkVkaXRvcihcclxuICBjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG4gIGZpbGU6IFRGaWxlLFxyXG4gIGFwcDogQXBwLFxyXG4pOiBQcm9taXNlPHsgbGVhZjogYW55OyBlZGl0TW9kZTogYW55IH0+IHtcclxuICBjb25zdCBsZWFmID0gYXBwLndvcmtzcGFjZS5nZXRMZWFmKFwidGFiXCIpO1xyXG4gIGF3YWl0IGxlYWYub3BlbkZpbGUoZmlsZSwgeyBzdGF0ZTogeyBtb2RlOiBcInNvdXJjZVwiIH0sIGFjdGl2ZTogZmFsc2UgfSk7XHJcblxyXG4gIGNvbnN0IGVkaXRNb2RlID0gKGxlYWYudmlldyBhcyBhbnkpLmVkaXRNb2RlO1xyXG4gIGNvbnRhaW5lci5hcHBlbmRDaGlsZChlZGl0TW9kZS5jbS5kb20pO1xyXG4gIGVkaXRNb2RlLmNtLnJlcXVlc3RNZWFzdXJlKCk7IC8vIGZvcmNlIGxheW91dCByZWNhbGMgaW4gbmV3IGNvbnRhaW5lclxyXG5cclxuICByZXR1cm4geyBsZWFmLCBlZGl0TW9kZSB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZGVzdHJveUNNNkVkaXRvcihsZWFmOiBhbnkpOiB2b2lkIHtcclxuICBsZWFmLmRldGFjaCgpO1xyXG59XHJcblxyXG4vLyBSZXBsYWNlcyBleHRyYWN0TWFya2Rvd24odGlwdGFwRWRpdG9yKVxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q002Q29udGVudChlZGl0TW9kZTogYW55KTogc3RyaW5nIHtcclxuICBjb25zdCBmdWxsID0gZWRpdE1vZGUuY20uc3RhdGUuZG9jLnRvU3RyaW5nKCk7XHJcbiAgY29uc3QgeyBib2R5IH0gPSBzdHJpcEZyb250bWF0dGVyKGZ1bGwpO1xyXG4gIHJldHVybiBib2R5O1xyXG59XHJcbiIsICJpbXBvcnQgeyBBcHAsIE1vZGFsLCBOb3RpY2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHR5cGUgeyBFbmVyZ3lDb2xvciB9IGZyb20gXCIuL3R5cGVzXCI7XHJcbmltcG9ydCB7IHdyaXRlRnJvbnRtYXR0ZXJBY3Rpb25hYmxlIH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcclxuXHJcbmNvbnN0IEVORVJHWV9PUFRJT05TOiB7IHZhbHVlOiBFbmVyZ3lDb2xvcjsgbGFiZWw6IHN0cmluZzsgZGVzYzogc3RyaW5nIH1bXSA9IFtcclxuICB7IHZhbHVlOiBcIlx1RDgzRFx1REQyNVwiLCBsYWJlbDogXCJcdUQ4M0RcdUREMjVcIiwgZGVzYzogXCJVcmdlbnQgKyBoaWdoIGVuZXJneVwiIH0sXHJcbiAgeyB2YWx1ZTogXCJcdUQ4M0VcdURFOTRcIiwgbGFiZWw6IFwiXHVEODNFXHVERTk0XCIsIGRlc2M6IFwiVXJnZW50ICsgbG93IGVuZXJneVwiIH0sXHJcbiAgeyB2YWx1ZTogXCJcdUQ4M0NcdURGMEFcIiwgbGFiZWw6IFwiXHVEODNDXHVERjBBXCIsIGRlc2M6IFwiRnVuICsgbG93IGVuZXJneVwiIH0sXHJcbiAgeyB2YWx1ZTogXCJcdUQ4M0NcdURGM0ZcIiwgbGFiZWw6IFwiXHVEODNDXHVERjNGXCIsIGRlc2M6IFwiRnVuICsgaGlnaCBlbmVyZ3lcIiB9LFxyXG5dO1xyXG5cclxuY29uc3QgVElNRUJMT0NLUyA9IFtcIm1vcm5pbmdcIiwgXCJhZnRlcm5vb25cIiwgXCJldmVuaW5nXCIsIFwibmlnaHRcIl07XHJcblxyXG5leHBvcnQgY2xhc3MgTWFrZUFjdGlvbmFibGVNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICBwcml2YXRlIHNlbGVjdGVkRW5lcmd5OiBFbmVyZ3lDb2xvcltdID0gW107XHJcbiAgcHJpdmF0ZSBzZWxlY3RlZFRpbWVibG9ja3M6IHN0cmluZ1tdID0gW107XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgYXBwOiBBcHAsXHJcbiAgICBwcml2YXRlIGZpbGVwYXRoOiBzdHJpbmcsXHJcbiAgICBwcml2YXRlIG9uQ29uZmlybTogKCkgPT4gdm9pZCxcclxuICApIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgfVxyXG5cclxuICBvbk9wZW4oKSB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgY29uc3Qgbm90ZVRpdGxlID0gdGhpcy5maWxlcGF0aC5zcGxpdChcIi9cIikucG9wKCkhLnJlcGxhY2UoL1xcLm1kJC8sIFwiXCIpO1xyXG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQoYE1ha2UgYWN0aW9uYWJsZSBcdTIwMTQgJHtub3RlVGl0bGV9YCk7XHJcblxyXG4gICAgLy8gRW5lcmd5XHJcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJFbmVyZ3kgbGV2ZWxcIiwgY2xzOiBcInNwYWNlZC1ta2EtbGFiZWxcIiB9KTtcclxuICAgIGNvbnN0IGVuZXJneVJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLW1rYS1yb3dcIiB9KTtcclxuICAgIGZvciAoY29uc3Qgb3B0IG9mIEVORVJHWV9PUFRJT05TKSB7XHJcbiAgICAgIGNvbnN0IGJ0biA9IGVuZXJneVJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogYHNwYWNlZC1ta2EtYnRuIHNwYWNlZC1ta2EtJHtvcHQudmFsdWV9YCB9KTtcclxuICAgICAgYnRuLmNyZWF0ZUVsKFwic3BhblwiLCB7IHRleHQ6IG9wdC5sYWJlbCwgY2xzOiBcInNwYWNlZC1ta2EtYnRuLWxhYmVsXCIgfSk7XHJcbiAgICAgIGJ0bi5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBvcHQuZGVzYywgY2xzOiBcInNwYWNlZC1ta2EtYnRuLWRlc2NcIiB9KTtcclxuICAgICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRFbmVyZ3kuaW5jbHVkZXMob3B0LnZhbHVlKSkge1xyXG4gICAgICAgICAgdGhpcy5zZWxlY3RlZEVuZXJneSA9IHRoaXMuc2VsZWN0ZWRFbmVyZ3kuZmlsdGVyKChlKSA9PiBlICE9PSBvcHQudmFsdWUpO1xyXG4gICAgICAgICAgYnRuLnJlbW92ZUNsYXNzKFwiaXMtYWN0aXZlXCIpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLnNlbGVjdGVkRW5lcmd5LnB1c2gob3B0LnZhbHVlKTtcclxuICAgICAgICAgIGJ0bi5hZGRDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFRpbWVibG9ja1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiVGltZWJsb2NrXCIsIGNsczogXCJzcGFjZWQtbWthLWxhYmVsXCIgfSk7XHJcbiAgICBjb25zdCB0YlJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLW1rYS1yb3dcIiB9KTtcclxuICAgIGZvciAoY29uc3QgYmxvY2sgb2YgVElNRUJMT0NLUykge1xyXG4gICAgICBjb25zdCBidG4gPSB0YlJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IGJsb2NrLCBjbHM6IFwic3BhY2VkLW1rYS1idG5cIiB9KTtcclxuICAgICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRUaW1lYmxvY2tzLmluY2x1ZGVzKGJsb2NrKSkge1xyXG4gICAgICAgICAgdGhpcy5zZWxlY3RlZFRpbWVibG9ja3MgPSB0aGlzLnNlbGVjdGVkVGltZWJsb2Nrcy5maWx0ZXIoKHQpID0+IHQgIT09IGJsb2NrKTtcclxuICAgICAgICAgIGJ0bi5yZW1vdmVDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5zZWxlY3RlZFRpbWVibG9ja3MucHVzaChibG9jayk7XHJcbiAgICAgICAgICBidG4uYWRkQ2xhc3MoXCJpcy1hY3RpdmVcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb25maXJtIC8gQ2FuY2VsXHJcbiAgICBjb25zdCBidG5Sb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1idG4tcm93XCIgfSk7XHJcbiAgICBjb25zdCBjb25maXJtQnRuID0gYnRuUm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJNYWtlIGFjdGlvbmFibGVcIiwgY2xzOiBcIm1vZC1jdGFcIiB9KTtcclxuICAgIGNvbmZpcm1CdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgd3JpdGVGcm9udG1hdHRlckFjdGlvbmFibGUodGhpcy5hcHAsIHRoaXMuZmlsZXBhdGgsIHtcclxuICAgICAgICBlbmVyZ3k6IHRoaXMuc2VsZWN0ZWRFbmVyZ3kubGVuZ3RoID4gMCA/IHRoaXMuc2VsZWN0ZWRFbmVyZ3kgOiB1bmRlZmluZWQsXHJcbiAgICAgICAgdGltZWJsb2NrOiB0aGlzLnNlbGVjdGVkVGltZWJsb2Nrcy5sZW5ndGggPiAwID8gdGhpcy5zZWxlY3RlZFRpbWVibG9ja3MgOiB1bmRlZmluZWQsXHJcbiAgICAgIH0pO1xyXG4gICAgICBuZXcgTm90aWNlKGAke25vdGVUaXRsZX0gbWFya2VkIGFzIGFjdGlvbmFibGVgKTtcclxuICAgICAgdGhpcy5vbkNvbmZpcm0oKTtcclxuICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgfSk7XHJcbiAgICBjb25zdCBjYW5jZWxCdG4gPSBidG5Sb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNhbmNlbFwiIH0pO1xyXG4gICAgY2FuY2VsQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNsb3NlKCkpO1xyXG4gIH1cclxuXHJcbiAgb25DbG9zZSgpIHtcclxuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XHJcbiAgfVxyXG59XHJcbiIsICJpbXBvcnQgdHlwZSBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luIGZyb20gXCIuL21haW5cIjtcclxuaW1wb3J0IHsgQXBwLCBNb2RhbCwgTm90aWNlLCBzZXRJY29uLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEN1c3RvbVJlYWN0aW9uU2V0LCBEYXlOYW1lIH0gZnJvbSBcIi4vdHlwZXNcIjtcclxuXHJcbmNvbnN0IFJFQUNUSU9OX1JBTVAgPSBbXHJcbiAgXCJzcGFjZWQtc2VnLXB1cnBsZVwiLFxyXG4gIFwic3BhY2VkLXNlZy1ibHVlXCIsXHJcbiAgXCJzcGFjZWQtc2VnLWdyZWVuXCIsXHJcbiAgXCJzcGFjZWQtc2VnLXllbGxvd1wiLFxyXG4gIFwic3BhY2VkLXNlZy1vcmFuZ2VcIixcclxuICBcInNwYWNlZC1zZWctcmVkXCIsXHJcbl07XHJcblxyXG5sZXQgX2FjdGl2ZVBhbGV0dGVIYW5kbGVyOiAoKGU6IE1vdXNlRXZlbnQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7ICBcclxuXHJcbmZ1bmN0aW9uIG9wZW5Db2xvclBhbGV0dGUoYW5jaG9yLCBjdXJyZW50LCBvblBpY2spIHtcclxuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiLnNwYWNlZC1jb2xvci1wYWxldHRlXCIpLmZvckVhY2goKGVsKSA9PiBlbC5yZW1vdmUoKSk7XHJcbiAgLy8gUmVtb3ZlIG9sZCBoYW5kbGVyIGJlZm9yZSByZWdpc3RlcmluZyBhIG5ldyBvbmVcclxuICBpZiAoX2FjdGl2ZVBhbGV0dGVIYW5kbGVyKSB7XHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIF9hY3RpdmVQYWxldHRlSGFuZGxlcik7XHJcbiAgICBfYWN0aXZlUGFsZXR0ZUhhbmRsZXIgPSBudWxsO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcGFsZXR0ZSA9IGRvY3VtZW50LmJvZHkuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1jb2xvci1wYWxldHRlXCIgfSk7XHJcbiAgY29uc3QgcmVjdCA9IGFuY2hvci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICBwYWxldHRlLnN0eWxlLnRvcCA9IGAke3JlY3QuYm90dG9tICsgNH1weGA7XHJcbiAgcGFsZXR0ZS5zdHlsZS5sZWZ0ID0gYCR7cmVjdC5sZWZ0fXB4YDtcclxuXHJcbiAgZm9yIChjb25zdCBjbHMgb2YgUkVBQ1RJT05fUkFNUCkge1xyXG4gICAgY29uc3QgZG90ID0gcGFsZXR0ZS5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogYHNwYWNlZC1jb2xvci1kb3QgJHtjbHN9YCB9KTtcclxuICAgIGlmIChjbHMgPT09IGN1cnJlbnQpIGRvdC5hZGRDbGFzcyhcInNwYWNlZC1jb2xvci1kb3QtLWFjdGl2ZVwiKTtcclxuICAgIGRvdC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIChlKSA9PiB7XHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgb25QaWNrKGNscyk7XHJcbiAgICAgIHBhbGV0dGUucmVtb3ZlKCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGNvbnN0IG91dHNpZGVIYW5kbGVyID0gKGU6IE1vdXNlRXZlbnQpID0+IHtcclxuICAgIGlmICghZG9jdW1lbnQuY29udGFpbnMocGFsZXR0ZSkgfHwgIXBhbGV0dGUuY29udGFpbnMoZS50YXJnZXQgYXMgTm9kZSkpIHtcclxuICAgICAgcGFsZXR0ZS5yZW1vdmUoKTtcclxuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBvdXRzaWRlSGFuZGxlcik7XHJcbiAgICAgIF9hY3RpdmVQYWxldHRlSGFuZGxlciA9IG51bGw7XHJcbiAgICB9XHJcbiAgfTtcclxuICBfYWN0aXZlUGFsZXR0ZUhhbmRsZXIgPSBvdXRzaWRlSGFuZGxlcjtcclxuICBzZXRUaW1lb3V0KCgpID0+IGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb3V0c2lkZUhhbmRsZXIpLCAwKTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNwYWNlZEV2ZXJ5dGhpbmdTZXR0aW5nc1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xyXG4gIHByaXZhdGUgcGVuZGluZ0ZvbGRlciA9IFwiXCI7XHJcbiAgcHJpdmF0ZSBwZW5kaW5nU2V0TmFtZSA9IFwiXCI7XHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBhcHA6IEFwcCxcclxuICAgIHByaXZhdGUgcGx1Z2luOiBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luLFxyXG4gICkge1xyXG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xyXG4gIH1cclxuXHJcbiAgZGlzcGxheSgpOiB2b2lkIHtcclxuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XHJcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xyXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiU3BhY2VkIEV2ZXJ5dGhpbmdcIiB9KTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgLnNldE5hbWUoXCJTb3VyY2Ugc2NvcGVcIilcclxuICAgICAgLnNldERlc2MoXCJQcm9jZXNzIG5vdGVzIGZyb20gdGhlIHdob2xlIHZhdWx0IG9yIGEgc3BlY2lmaWMgZm9sZGVyLlwiKVxyXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3ApID0+XHJcbiAgICAgICAgZHJvcFxyXG4gICAgICAgICAgLmFkZE9wdGlvbihcInZhdWx0XCIsIFwiV2hvbGUgdmF1bHRcIilcclxuICAgICAgICAgIC5hZGRPcHRpb24oXCJmb2xkZXJcIiwgXCJTcGVjaWZpYyBmb2xkZXJcIilcclxuICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zb3VyY2VTY29wZSlcclxuICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zb3VyY2VTY29wZSA9IHYgYXMgXCJ2YXVsdFwiIHwgXCJmb2xkZXJcIjtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xyXG4gICAgICAgICAgfSksXHJcbiAgICAgICk7XHJcblxyXG4gICAgY29uc3QgZm9sZGVycyA9IHRoaXMuYXBwLnZhdWx0XHJcbiAgICAgIC5nZXRBbGxGb2xkZXJzKClcclxuICAgICAgLm1hcCgoZikgPT4gZi5wYXRoKVxyXG4gICAgICAuc29ydCgpO1xyXG5cclxuICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zb3VyY2VTY29wZSA9PT0gXCJmb2xkZXJcIikge1xyXG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHRoaXMucGx1Z2luLnNldHRpbmdzLnNvdXJjZUZvbGRlcnMpIHtcclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgIC5zZXROYW1lKGVudHJ5LnBhdGgpXHJcbiAgICAgICAgICAuc2V0RGVzYyhcIlJldmlldyBxdW90YSB3ZWlnaHQgKCUpLiAxMDAgPSBkZWZhdWx0LCBsb3dlciA9IGFwcGVhcnMgbGVzcyBvZnRlbi5cIilcclxuICAgICAgICAgIC5hZGRTbGlkZXIoKHNsKSA9PlxyXG4gICAgICAgICAgICBzbFxyXG4gICAgICAgICAgICAgIC5zZXRMaW1pdHMoMSwgMjAwLCAxKVxyXG4gICAgICAgICAgICAgIC5zZXRWYWx1ZShlbnRyeS53ZWlnaHQpXHJcbiAgICAgICAgICAgICAgLnNldER5bmFtaWNUb29sdGlwKClcclxuICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcclxuICAgICAgICAgICAgICAgIGVudHJ5LndlaWdodCA9IHY7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgIClcclxuICAgICAgICAgIC5hZGRCdXR0b24oKGJ0bikgPT5cclxuICAgICAgICAgICAgYnRuXHJcbiAgICAgICAgICAgICAgLnNldEJ1dHRvblRleHQoXCJSZW1vdmVcIilcclxuICAgICAgICAgICAgICAuc2V0V2FybmluZygpXHJcbiAgICAgICAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc291cmNlRm9sZGVycyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnNvdXJjZUZvbGRlcnMuZmlsdGVyKFxyXG4gICAgICAgICAgICAgICAgICAoZSkgPT4gZS5wYXRoICE9PSBlbnRyeS5wYXRoLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLnBlbmRpbmdGb2xkZXIgPSBcIlwiO1xyXG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAuc2V0TmFtZShcIkFkZCBzb3VyY2UgZm9sZGVyXCIpXHJcbiAgICAgICAgLmFkZERyb3Bkb3duKChkcm9wKSA9PiB7XHJcbiAgICAgICAgICBkcm9wLmFkZE9wdGlvbihcIlwiLCBcIlx1MjAxNCBzZWxlY3QgYSBmb2xkZXIgXHUyMDE0XCIpO1xyXG4gICAgICAgICAgZm9yIChjb25zdCBmIG9mIGZvbGRlcnMpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnBsdWdpbi5zZXR0aW5ncy5zb3VyY2VGb2xkZXJzLnNvbWUoKGUpID0+IGUucGF0aCA9PT0gZikpIHtcclxuICAgICAgICAgICAgICBkcm9wLmFkZE9wdGlvbihmLCBmKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZHJvcC5vbkNoYW5nZSgodikgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBlbmRpbmdGb2xkZXIgPSB2O1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAuYWRkQnV0dG9uKChidG4pID0+XHJcbiAgICAgICAgICBidG4uc2V0QnV0dG9uVGV4dChcIkFkZFwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMucGVuZGluZ0ZvbGRlciAmJiAhdGhpcy5wbHVnaW4uc2V0dGluZ3Muc291cmNlRm9sZGVycy5zb21lKChlKSA9PiBlLnBhdGggPT09IHRoaXMucGVuZGluZ0ZvbGRlcikpIHtcclxuICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zb3VyY2VGb2xkZXJzLnB1c2goeyBwYXRoOiB0aGlzLnBlbmRpbmdGb2xkZXIsIHdlaWdodDogMTAwIH0pO1xyXG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAuc2V0TmFtZShcIkV2ZXJncmVlbiBkZXN0aW5hdGlvbiBmb2xkZXJcIilcclxuICAgICAgLnNldERlc2MoXCJXaGVyZSByb3V0ZWQgbm90ZXMgYXJlIG1vdmVkIHRvLlwiKVxyXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3ApID0+IHtcclxuICAgICAgICBkcm9wLmFkZE9wdGlvbihcIlwiLCBcIlx1MjAxNCBzZWxlY3QgYSBmb2xkZXIgXHUyMDE0XCIpO1xyXG4gICAgICAgIGZvciAoY29uc3QgZm9sZGVyIG9mIGZvbGRlcnMpIHtcclxuICAgICAgICAgIGRyb3AuYWRkT3B0aW9uKGZvbGRlciwgZm9sZGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZHJvcC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVyZ3JlZW5Gb2xkZXIpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XHJcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVyZ3JlZW5Gb2xkZXIgPSB2O1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAuc2V0TmFtZShcIkluaXRpYWwgaW50ZXJ2YWwgKGRheXMpXCIpXHJcbiAgICAgIC5zZXREZXNjKFwiSG93IG1hbnkgZGF5cyBiZWZvcmUgYSBuZXcgbm90ZSBmaXJzdCBhcHBlYXJzIGZvciByZXZpZXcuXCIpXHJcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG4gICAgICAgIHRleHQuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmluaXRpYWxJbnRlcnZhbCkpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBuID0gcGFyc2VJbnQodik7XHJcbiAgICAgICAgICBpZiAoIWlzTmFOKG4pICYmIG4gPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmluaXRpYWxJbnRlcnZhbCA9IG47XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pLFxyXG4gICAgICApO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgZWFzZSBmYWN0b3IgKCUpXCIpXHJcbiAgICAgIC5zZXREZXNjKFwiTXVsdGlwbGllciBmb3IgaW50ZXJ2YWwgZ3Jvd3RoLiAzMDAgPSAzeCBwZXIgcmV2aWV3IGN5Y2xlLlwiKVxyXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cclxuICAgICAgICB0ZXh0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0RWFzZUZhY3RvcikpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBuID0gcGFyc2VJbnQodik7XHJcbiAgICAgICAgICBpZiAoIWlzTmFOKG4pICYmIG4gPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRFYXNlRmFjdG9yID0gbjtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSksXHJcbiAgICAgICk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKFwiUmVuYW1lIGZvbGRlciB3aGVuIHJlbmFtaW5nIGRlY2tcIilcclxuICAgICAgLnNldERlc2MoXCJJZiBhIGRlY2sgaGFzIGEgbWF0Y2hpbmcgZm9sZGVyLCByZW5hbWUgdGhlIGZvbGRlciB0b28uXCIpXHJcbiAgICAgIC5hZGRUb2dnbGUoKHQpID0+XHJcbiAgICAgICAgdC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZW5hbWVGb2xkZXJXaXRoRGVjaykub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcclxuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJlbmFtZUZvbGRlcldpdGhEZWNrID0gdjtcclxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgIH0pLFxyXG4gICAgICApO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAuc2V0TmFtZShcIlJlY2VudC1ub3RlIHByaW9yaXR5IHRocmVzaG9sZFwiKVxyXG4gICAgICAuc2V0RGVzYyhcIlByb2JhYmlsaXR5ICgwXHUyMDEzMSkgb2YgdHJ5aW5nIHRvIHNob3cgYSByZWNlbnRseS1jcmVhdGVkIHVucmV2aWV3ZWQgbm90ZSBmaXJzdC4gRGVmYXVsdDogMC41XCIpXHJcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG4gICAgICAgIHRleHQuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLnJlY2VudFVuZHVlVGhyZXNob2xkKSkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcclxuICAgICAgICAgIGNvbnN0IG4gPSBwYXJzZUZsb2F0KHYpO1xyXG4gICAgICAgICAgaWYgKCFpc05hTihuKSAmJiBuID49IDAgJiYgbiA8PSAxKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJlY2VudFVuZHVlVGhyZXNob2xkID0gbjtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSksXHJcbiAgICAgICk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKFwiRXhjaXRpbmctbm90ZSBwcmlvcml0eSB0aHJlc2hvbGRcIilcclxuICAgICAgLnNldERlc2MoXHJcbiAgICAgICAgXCJDdW11bGF0aXZlIHByb2JhYmlsaXR5ICgwXHUyMDEzMSkgb2YgdHJ5aW5nIHRvIHNob3cgYW4gZXhjaXRpbmcgbm90ZS4gTXVzdCBiZSA+IHJlY2VudC1ub3RlIHRocmVzaG9sZC4gRGVmYXVsdDogMC43XCIsXHJcbiAgICAgIClcclxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XHJcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MuZXhjaXRpbmdUaHJlc2hvbGQpKS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xyXG4gICAgICAgICAgY29uc3QgbiA9IHBhcnNlRmxvYXQodik7XHJcbiAgICAgICAgICBpZiAoIWlzTmFOKG4pICYmIG4gPj0gMCAmJiBuIDw9IDEpIHtcclxuICAgICAgICAgICAgaWYgKG4gPD0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVjZW50VW5kdWVUaHJlc2hvbGQpIHtcclxuICAgICAgICAgICAgICBuZXcgTm90aWNlKFwiRXhjaXRpbmcgdGhyZXNob2xkIG11c3QgYmUgZ3JlYXRlciB0aGFuIHJlY2VudC1ub3RlIHRocmVzaG9sZC5cIik7XHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV4Y2l0aW5nVGhyZXNob2xkID0gbjsgXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pLFxyXG4gICAgICApO1xyXG5cclxuICAgIC8vIFJlYWN0aW9uIGJ1dHRvbnNcclxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlJlYWN0aW9uIGJ1dHRvbnNcIiB9KTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgLnNldE5hbWUoXCJSZWFjdGlvbiBzZXRcIilcclxuICAgICAgLnNldERlc2MoXCJDaG9vc2Ugd2hpY2ggcmVhY3Rpb24gYnV0dG9ucyBhcHBlYXIgZHVyaW5nIHJldmlldy5cIilcclxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wKSA9PiB7XHJcbiAgICAgICAgZHJvcC5hZGRPcHRpb24oXCJkZWZhdWx0XCIsIFwiRGVmYXVsdCAoRXhjaXRpbmcgLyBJbnRlcmVzdGluZyAvIFx1MjAyNilcIik7XHJcbiAgICAgICAgZHJvcC5hZGRPcHRpb24oXCJhbmtpXCIsIFwiQW5raSAoRWFzeSAvIEdvb2QgLyBIYXJkIC8gQWdhaW4pXCIpO1xyXG4gICAgICAgIGZvciAoY29uc3Qgc2V0IG9mIHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbVJlYWN0aW9uU2V0cykge1xyXG4gICAgICAgICAgZHJvcC5hZGRPcHRpb24oc2V0LmlkLCBzZXQubmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRyb3Auc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MucmVhY3Rpb25TZXRNb2RlKS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xyXG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVhY3Rpb25TZXRNb2RlID0gdjtcclxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFjdGl2ZVNldCA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbVJlYWN0aW9uU2V0cy5maW5kKFxyXG4gICAgICAocykgPT4gcy5pZCA9PT0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVhY3Rpb25TZXRNb2RlLFxyXG4gICAgKTtcclxuICAgIGlmIChhY3RpdmVTZXQpIHtcclxuICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgLnNldE5hbWUoYEVkaXQ6ICR7YWN0aXZlU2V0Lm5hbWV9YClcclxuICAgICAgICAuYWRkQnV0dG9uKChidG4pID0+XHJcbiAgICAgICAgICBidG5cclxuICAgICAgICAgICAgLnNldEJ1dHRvblRleHQoXCJPcGVuIGVkaXRvclwiKVxyXG4gICAgICAgICAgICAub25DbGljaygoKSA9PiBuZXcgQ3VzdG9tUmVhY3Rpb25TZXRNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIGFjdGl2ZVNldCkub3BlbigpKSxcclxuICAgICAgICApXHJcbiAgICAgICAgLmFkZEJ1dHRvbigoYnRuKSA9PlxyXG4gICAgICAgICAgYnRuXHJcbiAgICAgICAgICAgIC5zZXRCdXR0b25UZXh0KFwiRGVsZXRlXCIpXHJcbiAgICAgICAgICAgIC5zZXRXYXJuaW5nKClcclxuICAgICAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbVJlYWN0aW9uU2V0cyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbVJlYWN0aW9uU2V0cy5maWx0ZXIoXHJcbiAgICAgICAgICAgICAgICAocykgPT4gcy5pZCAhPT0gYWN0aXZlU2V0LmlkLFxyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVhY3Rpb25TZXRNb2RlID0gXCJkZWZhdWx0XCI7XHJcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5wZW5kaW5nU2V0TmFtZSA9IFwiXCI7XHJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgLnNldE5hbWUoXCJBZGQgY3VzdG9tIHJlYWN0aW9uIHNldFwiKVxyXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cclxuICAgICAgICB0ZXh0LnNldFBsYWNlaG9sZGVyKFwiU2V0IG5hbWVcIikub25DaGFuZ2UoKHYpID0+IHtcclxuICAgICAgICAgIHRoaXMucGVuZGluZ1NldE5hbWUgPSB2O1xyXG4gICAgICAgIH0pLFxyXG4gICAgICApXHJcbiAgICAgIC5hZGRCdXR0b24oKGJ0bikgPT5cclxuICAgICAgICBidG4uc2V0QnV0dG9uVGV4dChcIkFkZFwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgIGNvbnN0IG5hbWUgPSB0aGlzLnBlbmRpbmdTZXROYW1lLnRyaW0oKTtcclxuICAgICAgICAgIGlmICghbmFtZSkgcmV0dXJuO1xyXG4gICAgICAgICAgY29uc3QgaWQgPSBuYW1lLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXFxzKy9nLCBcIi1cIik7XHJcbiAgICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuY3VzdG9tUmVhY3Rpb25TZXRzLnNvbWUoKHMpID0+IHMuaWQgPT09IGlkKSkge1xyXG4gICAgICAgICAgICBuZXcgTm90aWNlKGBBIHNldCB3aXRoIGlkIFwiJHtpZH1cIiBhbHJlYWR5IGV4aXN0cy5gKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuY3VzdG9tUmVhY3Rpb25TZXRzLnB1c2goeyBpZCwgbmFtZSwgcmVhY3Rpb25zOiBbXSB9KTtcclxuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJlYWN0aW9uU2V0TW9kZSA9IGlkO1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcclxuICAgICAgICB9KSxcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIFN5c3RlbSAgXHJcbmNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlN5c3RlbVwiIH0pOyAgXHJcbiAgXHJcbm5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKSAgXHJcbiAgLnNldE5hbWUoXCJXZWVrZW5kIGRheXNcIikgIFxyXG4gIC5zZXREZXNjKFwiRGF5cyB0cmVhdGVkIGFzIHdlZWtlbmQgZm9yIGNvbnRleHQgYXV0by1kZXRlY3Rpb24gaW4gU3lzdGVtIG1vZGFsLlwiKSAgXHJcbiAgLnRoZW4oKHNldHRpbmcpID0+IHsgIFxyXG4gICAgY29uc3QgZGF5czogRGF5TmFtZVtdID0gW1wiU3VuXCIsIFwiTW9uXCIsIFwiVHVlXCIsIFwiV2VkXCIsIFwiVGh1XCIsIFwiRnJpXCIsIFwiU2F0XCJdOyAgXHJcbiAgICBjb25zdCByb3cgPSBzZXR0aW5nLmNvbnRyb2xFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRheS10b2dnbGUtcm93XCIgfSk7ICBcclxuICAgIGZvciAoY29uc3QgZGF5IG9mIGRheXMpIHsgIFxyXG4gICAgICBjb25zdCBidG4gPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBkYXksIGNsczogXCJzcGFjZWQtZGF5LXRvZ2dsZVwiIH0pOyAgXHJcbiAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrZW5kRGF5cy5pbmNsdWRlcyhkYXkpKSBidG4uYWRkQ2xhc3MoXCJpcy1hY3RpdmVcIik7ICBcclxuICAgICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7ICBcclxuICAgICAgICBjb25zdCBjdXJyZW50ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla2VuZERheXM7ICBcclxuICAgICAgICBpZiAoY3VycmVudC5pbmNsdWRlcyhkYXkpKSB7ICBcclxuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtlbmREYXlzID0gY3VycmVudC5maWx0ZXIoKGQpID0+IGQgIT09IGRheSk7ICBcclxuICAgICAgICAgIGJ0bi5yZW1vdmVDbGFzcyhcImlzLWFjdGl2ZVwiKTsgIFxyXG4gICAgICAgIH0gZWxzZSB7ICBcclxuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtlbmREYXlzID0gWy4uLmN1cnJlbnQsIGRheV07ICBcclxuICAgICAgICAgIGJ0bi5hZGRDbGFzcyhcImlzLWFjdGl2ZVwiKTsgIFxyXG4gICAgICAgIH0gIFxyXG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpOyAgXHJcbiAgICAgIH0pOyAgXHJcbiAgICB9ICBcclxuICB9KTtcclxuXHJcbiAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiTm90ZSBzdGF0ZSB2YWx1ZXNcIiB9KTtcclxuICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xyXG4gICAgdGV4dDogXCJWYWx1ZXMgYXZhaWxhYmxlIGluIHRoZSBzdGF0ZSBiYWRnZSBkcm9wZG93biBkdXJpbmcgcmV2aWV3LlwiLFxyXG4gICAgY2xzOiBcInNldHRpbmctaXRlbS1kZXNjcmlwdGlvblwiLFxyXG4gIH0pO1xyXG5cclxuICBmb3IgKGNvbnN0IHZhbCBvZiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub3RlU3RhdGVWYWx1ZXMpIHtcclxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKHZhbCkuYWRkQnV0dG9uKChidG4pID0+XHJcbiAgICAgIGJ0blxyXG4gICAgICAgIC5zZXRCdXR0b25UZXh0KFwiUmVtb3ZlXCIpXHJcbiAgICAgICAgLnNldFdhcm5pbmcoKVxyXG4gICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm5vdGVTdGF0ZVZhbHVlcyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLm5vdGVTdGF0ZVZhbHVlcy5maWx0ZXIoKHYpID0+IHYgIT09IHZhbCk7XHJcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xyXG4gICAgICAgIH0pLFxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIGxldCBwZW5kaW5nU3RhdGVWYWx1ZSA9IFwiXCI7XHJcbiAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAuc2V0TmFtZShcIkFkZCBzdGF0ZSB2YWx1ZVwiKVxyXG4gICAgLmFkZFRleHQoKHRleHQpID0+XHJcbiAgICAgIHRleHQuc2V0UGxhY2Vob2xkZXIoXCJlLmcuIGluY3ViYXRpbmdcIikub25DaGFuZ2UoKHYpID0+IHtcclxuICAgICAgICBwZW5kaW5nU3RhdGVWYWx1ZSA9IHY7XHJcbiAgICAgIH0pLFxyXG4gICAgKVxyXG4gICAgLmFkZEJ1dHRvbigoYnRuKSA9PlxyXG4gICAgICBidG4uc2V0QnV0dG9uVGV4dChcIkFkZFwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICBjb25zdCB0cmltbWVkID0gcGVuZGluZ1N0YXRlVmFsdWUudHJpbSgpO1xyXG4gICAgICAgIGlmICghdHJpbW1lZCkgcmV0dXJuO1xyXG4gICAgICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub3RlU3RhdGVWYWx1ZXMuaW5jbHVkZXModHJpbW1lZCkpIHtcclxuICAgICAgICAgIG5ldyBOb3RpY2UoYFwiJHt0cmltbWVkfVwiIGFscmVhZHkgZXhpc3RzLmApO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub3RlU3RhdGVWYWx1ZXMucHVzaCh0cmltbWVkKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICB0aGlzLmRpc3BsYXkoKTtcclxuICAgICAgfSksXHJcbiAgICApO1xyXG4gICAgXHJcbiAgICAvLyBEYW5nZXIgem9uZVxyXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiRGFuZ2VyIFpvbmVcIiB9KTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgLnNldE5hbWUoXCJSZXNldCBhbGwgc2NoZWR1bGluZyBkYXRhXCIpXHJcbiAgICAgIC5zZXREZXNjKFxyXG4gICAgICAgIFwiUGVybWFuZW50bHkgZGVsZXRlcyBhbGwgcmV2aWV3IGhpc3RvcnksIGludGVydmFscywgYW5kIG5vdGUgc3RhdGVzLiBcIiArXHJcbiAgICAgICAgICBcIllvdXIgbm90ZSBmaWxlcyBhcmUgbm90IGFmZmVjdGVkLiBUaGlzIGNhbm5vdCBiZSB1bmRvbmUuXCIsXHJcbiAgICAgIClcclxuICAgICAgLmFkZEJ1dHRvbigoYnRuKSA9PlxyXG4gICAgICAgIGJ0blxyXG4gICAgICAgICAgLnNldEJ1dHRvblRleHQoXCJSZXNldCBkYXRhXCIpXHJcbiAgICAgICAgICAuc2V0V2FybmluZygpXHJcbiAgICAgICAgICAub25DbGljaygoKSA9PiBuZXcgUmVzZXRDb25maXJtTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCkpLFxyXG4gICAgICApO1xyXG4gIH1cclxufVxyXG5cclxuY2xhc3MgUmVzZXRDb25maXJtTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBhcHA6IEFwcCxcclxuICAgIHByaXZhdGUgcGx1Z2luOiBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luLFxyXG4gICkge1xyXG4gICAgc3VwZXIoYXBwKTtcclxuICB9XHJcblxyXG4gIG9uT3BlbigpIHtcclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlJlc2V0IGFsbCBzY2hlZHVsaW5nIGRhdGE/XCIgfSk7XHJcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuICAgICAgdGV4dDpcclxuICAgICAgICBcIlRoaXMgd2lsbCBwZXJtYW5lbnRseSBkZWxldGUgYWxsIHJldmlldyBoaXN0b3J5LCBpbnRlcnZhbHMsIGFuZCBzY2hlZHVsaW5nIFwiICtcclxuICAgICAgICBcImRhdGEgZm9yIGV2ZXJ5IG5vdGUuIFlvdXIgYWN0dWFsIG5vdGUgZmlsZXMgd2lsbCBub3QgYmUgdG91Y2hlZC4gXCIgK1xyXG4gICAgICAgIFwiQWZ0ZXIgcmVzZXQsIGFsbCBub3RlcyB3aWxsIGJlIHJlLWltcG9ydGVkIG9uIHRoZSBuZXh0IHN5bmMuXCIsXHJcbiAgICB9KTtcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwge1xyXG4gICAgICB0ZXh0OiBcIlRoaXMgY2Fubm90IGJlIHVuZG9uZS5cIixcclxuICAgICAgY2xzOiBcInNwYWNlZC1yZXNldC13YXJuaW5nXCIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBidG5Sb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1idG4tcm93XCIgfSk7XHJcblxyXG4gICAgY29uc3QgY2FuY2VsQnRuID0gYnRuUm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDYW5jZWxcIiB9KTtcclxuICAgIGNhbmNlbEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5jbG9zZSgpKTtcclxuXHJcbiAgICBjb25zdCBjb25maXJtQnRuID0gYnRuUm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuICAgICAgdGV4dDogXCJSZXNldCBldmVyeXRoaW5nXCIsXHJcbiAgICAgIGNsczogXCJtb2Qtd2FybmluZ1wiLFxyXG4gICAgfSk7XHJcbiAgICBjb25maXJtQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnJlc2V0RGF0YSgpO1xyXG4gICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIG9uQ2xvc2UoKSB7XHJcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gIH1cclxufVxyXG5cclxuY2xhc3MgQ3VzdG9tUmVhY3Rpb25TZXRNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFwcDogQXBwLFxyXG4gICAgcHJpdmF0ZSBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXHJcbiAgICBwcml2YXRlIHNldDogQ3VzdG9tUmVhY3Rpb25TZXQsXHJcbiAgKSB7XHJcbiAgICBzdXBlcihhcHApO1xyXG4gIH1cclxuXHJcbiAgb25PcGVuKCkge1xyXG4gICAgdGhpcy5tb2RhbEVsLmFkZENsYXNzKFwic3BhY2VkLXJlYWN0aW9uLXBhbmVsXCIpO1xyXG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQodGhpcy5zZXQubmFtZSk7XHJcbiAgICB0aGlzLnJlbmRlclJlYWN0aW9ucygpO1xyXG4gIH1cclxuXHJcbiAgcmVuZGVyUmVhY3Rpb25zKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIGNvbnN0IHJlYWN0aW9ucyA9IHRoaXMuc2V0LnJlYWN0aW9ucztcclxuXHJcbiAgICBjb25zdCBsaXN0ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtcmVhY3Rpb24tbGlzdFwiIH0pO1xyXG5cclxuICAgIHJlYWN0aW9ucy5mb3JFYWNoKChyLCBpKSA9PiB7XHJcbiAgICAgIGNvbnN0IGF1dG9SZWFjdGlvbnMgPSByZWFjdGlvbnMuZmlsdGVyKChyeCkgPT4gIXJ4Lm1hbnVhbE92ZXJyaWRlKTtcclxuICAgICAgY29uc3QgYXV0b04gPSBhdXRvUmVhY3Rpb25zLmxlbmd0aDtcclxuICAgICAgY29uc3QgYXV0b0lkeCA9IGF1dG9SZWFjdGlvbnMuZmluZEluZGV4KChyeCkgPT4gcnguaWQgPT09IHIuaWQpO1xyXG4gICAgICBjb25zdCB0QXV0byA9IGF1dG9OIDw9IDEgPyAwLjUgOiBhdXRvSWR4IC8gKGF1dG9OIC0gMSk7XHJcbiAgICAgIGNvbnN0IHRGdWxsID0gcmVhY3Rpb25zLmxlbmd0aCA9PT0gMSA/IDAuNSA6IGkgLyAocmVhY3Rpb25zLmxlbmd0aCAtIDEpO1xyXG4gICAgICBjb25zdCB0ID0gci5tYW51YWxPdmVycmlkZSA/IHRGdWxsIDogdEF1dG87XHJcbiAgICAgIGNvbnN0IG11bHQgPSB0IDw9IDAuNSA/IDAuNSArIDAuNSAqICh0ICogMikgOiAxLjAgKyAyLjAgKiAoKHQgLSAwLjUpICogMik7XHJcbiAgICAgIGNvbnN0IGVhc2VEZWx0YSA9IE1hdGgucm91bmQoMjAgLSA0MCAqIHQpO1xyXG4gICAgICBjb25zdCBzaWduID0gZWFzZURlbHRhID49IDAgPyBcIitcIiA6IFwiXCI7XHJcblxyXG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtcmVhY3Rpb24taXRlbVwiIH0pO1xyXG5cclxuICAgICAgLy8gTWludXMgKHJlbW92ZSlcclxuICAgICAgY29uc3QgcmVtb3ZlQnRuID0gcm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcImNsaWNrYWJsZS1pY29uXCIgfSk7XHJcbiAgICAgIHNldEljb24ocmVtb3ZlQnRuLCBcImNpcmNsZS1taW51c1wiKTtcclxuICAgICAgcmVtb3ZlQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgcmVhY3Rpb25zLnNwbGljZShpLCAxKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICB0aGlzLnJlbmRlclJlYWN0aW9ucygpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIE1hbnVhbCBvdmVycmlkZSBjaGVja2JveFxyXG4gICAgICBjb25zdCBjaGVja2JveCA9IHJvdy5jcmVhdGVFbChcImlucHV0XCIsIHsgdHlwZTogXCJjaGVja2JveFwiIH0pO1xyXG4gICAgICBjaGVja2JveC5jaGVja2VkID0gci5tYW51YWxPdmVycmlkZSA/PyBmYWxzZTtcclxuICAgICAgY2hlY2tib3guYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgcmVhY3Rpb25zW2ldLm1hbnVhbE92ZXJyaWRlID0gY2hlY2tib3guY2hlY2tlZDtcclxuICAgICAgICBpZiAoIWNoZWNrYm94LmNoZWNrZWQpIHtcclxuICAgICAgICAgIGRlbGV0ZSByZWFjdGlvbnNbaV0uaW50ZXJ2YWxNdWx0O1xyXG4gICAgICAgICAgZGVsZXRlIHJlYWN0aW9uc1tpXS5lYXNlRGVsdGE7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJlYWN0aW9uc1tpXS5pbnRlcnZhbE11bHQgPSBwYXJzZUZsb2F0KCh0RnVsbCA8PSAwLjUgPyAwLjUgKyAwLjUgKiAodEZ1bGwgKiAyKSA6IDEuMCArIDIuMCAqICgodEZ1bGwgLSAwLjUpICogMikpLnRvRml4ZWQoMikpO1xyXG4gICAgICAgICAgcmVhY3Rpb25zW2ldLmVhc2VEZWx0YSA9IE1hdGgucm91bmQoMjAgLSA0MCAqIHRGdWxsKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXJSZWFjdGlvbnMoKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHaG9zdCBsYWJlbCBpbnB1dFxyXG4gICAgICBjb25zdCBsYWJlbElucHV0ID0gcm93LmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyB0eXBlOiBcInRleHRcIiwgY2xzOiBcInNwYWNlZC1yZWFjdGlvbi1sYWJlbC1pbnB1dFwiIH0pO1xyXG4gICAgICBsYWJlbElucHV0LnZhbHVlID0gci5sYWJlbDtcclxuICAgICAgbGFiZWxJbnB1dC5wbGFjZWhvbGRlciA9IFwiTGFiZWxcIjtcclxuICAgICAgbGFiZWxJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICByZWFjdGlvbnNbaV0ubGFiZWwgPSBsYWJlbElucHV0LnZhbHVlO1xyXG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIENvbG9yIHN3YXRjaCBcdTIwMTQgc2hvd3MgY3VycmVudCBjb2xvciwgY2xpY2sgY3ljbGVzIHRocm91Z2ggcmFtcCBvciBjbGVhcnNcclxuICAgICAgY29uc3QgUkFNUCA9IFtcclxuICAgICAgICBcInNwYWNlZC1zZWctcHVycGxlXCIsXHJcbiAgICAgICAgXCJzcGFjZWQtc2VnLWJsdWVcIixcclxuICAgICAgICBcInNwYWNlZC1zZWctZ3JlZW5cIixcclxuICAgICAgICBcInNwYWNlZC1zZWcteWVsbG93XCIsXHJcbiAgICAgICAgXCJzcGFjZWQtc2VnLW9yYW5nZVwiLFxyXG4gICAgICAgIFwic3BhY2VkLXNlZy1yZWRcIixcclxuICAgICAgXTtcclxuXHJcbiAgICAgIC8vIENvbXB1dGUgdGhlIGRlZmF1bHQgcmFtcCBjb2xvciBmb3IgdGhpcyByZWFjdGlvbiAoc2FtZSBtYXRoIGFzIHJlYWN0aW9uQ29sb3IoKSlcclxuICAgICAgY29uc3QgZGVmYXVsdENvbG9ySWR4ID0gTWF0aC5yb3VuZCh0RnVsbCAqIChSQU1QLmxlbmd0aCAtIDEpKTtcclxuICAgICAgY29uc3QgZGVmYXVsdENvbG9yID0gUkFNUFtkZWZhdWx0Q29sb3JJZHhdO1xyXG4gICAgICBjb25zdCBhY3RpdmVDb2xvciA9IHIuY29sb3IgPz8gZGVmYXVsdENvbG9yO1xyXG5cclxuICAgICAgY29uc3Qgc3dhdGNoID0gcm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBgY2xpY2thYmxlLWljb24gc3BhY2VkLXJlYWN0aW9uLXN3YXRjaCAke2FjdGl2ZUNvbG9yfWAgfSk7XHJcbiAgICAgIHN3YXRjaC50aXRsZSA9IHIuY29sb3IgPyBgQ29sb3I6ICR7ci5jb2xvcn0gKGNsaWNrIHRvIGNoYW5nZSlgIDogXCJDb2xvcjogYXV0byAoY2xpY2sgdG8gb3ZlcnJpZGUpXCI7XHJcblxyXG4gICAgICBzd2F0Y2guYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAvLyBTaG93IGEgbWluaSBwYWxldHRlIHBvcG92ZXJcclxuICAgICAgICBvcGVuQ29sb3JQYWxldHRlKHN3YXRjaCwgYWN0aXZlQ29sb3IsIGFzeW5jIChjaG9zZW4pID0+IHtcclxuICAgICAgICAgIGlmIChjaG9zZW4gPT09IGRlZmF1bHRDb2xvcikge1xyXG4gICAgICAgICAgICAvLyBDaG9vc2luZyB0aGUgZGVmYXVsdCA9IGNsZWFyIHRoZSBvdmVycmlkZVxyXG4gICAgICAgICAgICBkZWxldGUgcmVhY3Rpb25zW2ldLmNvbG9yO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmVhY3Rpb25zW2ldLmNvbG9yID0gY2hvc2VuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICB0aGlzLnJlbmRlclJlYWN0aW9ucygpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEludGVydmFsL2Vhc2U6IGVkaXRhYmxlIGlucHV0cyBvciBtdXRlZCB0ZXh0XHJcbiAgICAgIGlmIChyLm1hbnVhbE92ZXJyaWRlKSB7XHJcbiAgICAgICAgY29uc3QgaW5wdXRzID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtcmVhY3Rpb24taW5wdXRzXCIgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IG11bHRJbnB1dCA9IGlucHV0cy5jcmVhdGVFbChcImlucHV0XCIsIHsgdHlwZTogXCJ0ZXh0XCIsIGNsczogXCJzcGFjZWQtcmVhY3Rpb24taW5wdXRcIiB9KTtcclxuICAgICAgICBtdWx0SW5wdXQucGxhY2Vob2xkZXIgPSBgXHUwMEQ3JHttdWx0LnRvRml4ZWQoMil9YDtcclxuICAgICAgICBtdWx0SW5wdXQudmFsdWUgPSByLmludGVydmFsTXVsdCAhPT0gdW5kZWZpbmVkID8gU3RyaW5nKHIuaW50ZXJ2YWxNdWx0KSA6IFwiXCI7XHJcbiAgICAgICAgbXVsdElucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgY29uc3QgbiA9IHBhcnNlRmxvYXQobXVsdElucHV0LnZhbHVlKTtcclxuICAgICAgICAgIGlmICghaXNOYU4obikgJiYgbiA+IDApIHtcclxuICAgICAgICAgICAgcmVhY3Rpb25zW2ldLmludGVydmFsTXVsdCA9IG47XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBlYXNlSW5wdXQgPSBpbnB1dHMuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IHR5cGU6IFwidGV4dFwiLCBjbHM6IFwic3BhY2VkLXJlYWN0aW9uLWlucHV0XCIgfSk7XHJcbiAgICAgICAgZWFzZUlucHV0LnBsYWNlaG9sZGVyID0gYGVhc2UgJHtzaWdufSR7ZWFzZURlbHRhfWA7XHJcbiAgICAgICAgZWFzZUlucHV0LnZhbHVlID0gci5lYXNlRGVsdGEgIT09IHVuZGVmaW5lZCA/IFN0cmluZyhyLmVhc2VEZWx0YSkgOiBcIlwiO1xyXG4gICAgICAgIGVhc2VJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgIGNvbnN0IG4gPSBwYXJzZUludChlYXNlSW5wdXQudmFsdWUpO1xyXG4gICAgICAgICAgaWYgKCFpc05hTihuKSkge1xyXG4gICAgICAgICAgICByZWFjdGlvbnNbaV0uZWFzZURlbHRhID0gbjtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcm93LmNyZWF0ZVNwYW4oe1xyXG4gICAgICAgICAgdGV4dDogYFx1MDBENyR7bXVsdC50b0ZpeGVkKDIpfSAgZWFzZSAke3NpZ259JHtlYXNlRGVsdGF9YCxcclxuICAgICAgICAgIGNsczogXCJzcGFjZWQtcmVhY3Rpb24tbWV0YVwiLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBVcCAvIERvd24gYXJyb3dzXHJcbiAgICAgIGNvbnN0IHVwQnRuID0gcm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcImNsaWNrYWJsZS1pY29uXCIgfSk7XHJcbiAgICAgIHNldEljb24odXBCdG4sIFwiYXJyb3ctdXBcIik7XHJcbiAgICAgIHVwQnRuLmRpc2FibGVkID0gaSA9PT0gMDtcclxuICAgICAgdXBCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICBbcmVhY3Rpb25zW2kgLSAxXSwgcmVhY3Rpb25zW2ldXSA9IFtyZWFjdGlvbnNbaV0sIHJlYWN0aW9uc1tpIC0gMV1dO1xyXG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgIHRoaXMucmVuZGVyUmVhY3Rpb25zKCk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZG93bkJ0biA9IHJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJjbGlja2FibGUtaWNvblwiIH0pO1xyXG4gICAgICBzZXRJY29uKGRvd25CdG4sIFwiYXJyb3ctZG93blwiKTtcclxuICAgICAgZG93bkJ0bi5kaXNhYmxlZCA9IGkgPT09IHJlYWN0aW9ucy5sZW5ndGggLSAxO1xyXG4gICAgICBkb3duQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgW3JlYWN0aW9uc1tpICsgMV0sIHJlYWN0aW9uc1tpXV0gPSBbcmVhY3Rpb25zW2ldLCByZWFjdGlvbnNbaSArIDFdXTtcclxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICB0aGlzLnJlbmRlclJlYWN0aW9ucygpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCByb3cgYXQgdGhlIGJvdHRvbVxyXG4gICAgY29uc3QgYWRkUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtcmVhY3Rpb24tYWRkLXJvd1wiIH0pO1xyXG4gICAgY29uc3QgYWRkSW5wdXQgPSBhZGRSb3cuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IHR5cGU6IFwidGV4dFwiLCBjbHM6IFwic3BhY2VkLXJlYWN0aW9uLWFkZC1pbnB1dFwiIH0pO1xyXG4gICAgYWRkSW5wdXQucGxhY2Vob2xkZXIgPSBcIk5ldyByZWFjdGlvbiBsYWJlbFx1MjAyNlwiO1xyXG5cclxuICAgIGNvbnN0IGFkZEJ0biA9IGFkZFJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJjbGlja2FibGUtaWNvblwiIH0pO1xyXG4gICAgc2V0SWNvbihhZGRCdG4sIFwiY2lyY2xlLXBsdXNcIik7IC8vIG1hdGNoZXMgdGhlIGRlY2sgZHJvcGRvd24ncyBhZGQgaWNvblxyXG5cclxuICAgIGNvbnN0IGRvQWRkID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCB0cmltbWVkID0gYWRkSW5wdXQudmFsdWUudHJpbSgpO1xyXG4gICAgICBpZiAoIXRyaW1tZWQpIHJldHVybjtcclxuICAgICAgY29uc3QgaWQgPSB0cmltbWVkLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXFxzKy9nLCBcIi1cIik7XHJcbiAgICAgIGlmIChyZWFjdGlvbnMuc29tZSgocikgPT4gci5pZCA9PT0gaWQpKSB7XHJcbiAgICAgICAgbmV3IE5vdGljZShgQSByZWFjdGlvbiB3aXRoIGlkIFwiJHtpZH1cIiBhbHJlYWR5IGV4aXN0cy5gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgcmVhY3Rpb25zLnB1c2goeyBpZCwgbGFiZWw6IHRyaW1tZWQgfSk7XHJcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICB0aGlzLnJlbmRlclJlYWN0aW9ucygpO1xyXG4gICAgfTtcclxuXHJcbiAgICBhZGRCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGRvQWRkKTtcclxuICAgIGFkZElucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGFzeW5jIChlKSA9PiB7XHJcbiAgICAgIGlmIChlLmtleSA9PT0gXCJFbnRlclwiKSB7XHJcbiAgICAgICAgYXdhaXQgZG9BZGQoKTtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgb25DbG9zZSgpIHtcclxuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XHJcbiAgfVxyXG59XHJcbiIsICJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBub3RlSXNEdWUsIG51bURheXNPdmVyZHVlIH0gZnJvbSBcIi4vc2NoZWR1bGVyXCI7XHJcbmltcG9ydCB7IFJldmlld01vZGFsIH0gZnJvbSBcIi4vUmV2aWV3TW9kYWxcIjtcclxuaW1wb3J0IHsgZ2V0Tm90ZXNGcm9tVmF1bHQgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiO1xyXG5pbXBvcnQgdHlwZSBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luIGZyb20gXCIuL21haW5cIjtcclxuXHJcbmV4cG9ydCBjb25zdCBEVUVfTk9URVNfVklFV19UWVBFID0gXCJzcGFjZWQtZXZlcnl0aGluZy1kdWUtbm90ZXNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBEdWVOb3Rlc1ZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBsZWFmOiBXb3Jrc3BhY2VMZWFmLFxyXG4gICAgcHJpdmF0ZSBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXHJcbiAgKSB7XHJcbiAgICBzdXBlcihsZWFmKTtcclxuICB9XHJcblxyXG4gIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gRFVFX05PVEVTX1ZJRVdfVFlQRTtcclxuICB9XHJcbiAgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBcIkR1ZSBOb3Rlc1wiO1xyXG4gIH1cclxuICBnZXRJY29uKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gXCJjbG9ja1wiO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgb25PcGVuKCkge1xyXG4gICAgYXdhaXQgdGhpcy5yZW5kZXIoKTtcclxuICB9XHJcbiAgYXN5bmMgb25DbG9zZSgpIHtcclxuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XHJcbiAgfVxyXG5cclxuICBhc3luYyByZW5kZXIoKSB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuICAgIGNvbnN0IGFsbE5vdGVzID0gZ2V0Tm90ZXNGcm9tVmF1bHQodGhpcy5wbHVnaW4pLmZpbHRlcigobikgPT4gbi5pbnRlcnZhbCA+PSAwKTtcclxuICAgIGNvbnN0IGR1ZU5vdGVzID0gYWxsTm90ZXMuZmlsdGVyKChuKSA9PiBub3RlSXNEdWUobikpLnNvcnQoKGEsIGIpID0+IG51bURheXNPdmVyZHVlKGIpIC0gbnVtRGF5c092ZXJkdWUoYSkpO1xyXG5cclxuICAgIGlmIChkdWVOb3Rlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuICAgICAgICB0ZXh0OiBcIkFsbCBjYXVnaHQgdXAgXHUyMDE0IG5vIG5vdGVzIGR1ZS5cIixcclxuICAgICAgICBjbHM6IFwic3BhY2VkLWVtcHR5IHBhbmUtZW1wdHlcIixcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBNdXRlZCBjb3VudCBsaW5lLCBsaWtlIE9ic2lkaWFuJ3MgXCJYIGxpbmtlZCBtZW50aW9uc1wiXHJcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG4gICAgICB0ZXh0OiBgJHtkdWVOb3Rlcy5sZW5ndGh9IG5vdGUke2R1ZU5vdGVzLmxlbmd0aCAhPT0gMSA/IFwic1wiIDogXCJcIn0gZHVlYCxcclxuICAgICAgY2xzOiBcInNwYWNlZC1kdWUtY291bnRcIixcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGxpc3QgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcIm5hdi1maWxlcy1jb250YWluZXJcIiB9KTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IG5vdGUgb2YgZHVlTm90ZXMpIHtcclxuICAgICAgY29uc3QgZmlsZW5hbWUgPSBub3RlLmZpbGVwYXRoLnNwbGl0KFwiL1wiKS5wb3AoKT8ucmVwbGFjZSgvXFwubWQkLywgXCJcIikgPz8gbm90ZS5maWxlcGF0aDtcclxuICAgICAgY29uc3QgZGF5cyA9IG51bURheXNPdmVyZHVlKG5vdGUpO1xyXG5cclxuICAgICAgY29uc3QgZmlsZSA9IGxpc3QuY3JlYXRlRGl2KHsgY2xzOiBcIm5hdi1maWxlXCIgfSk7XHJcbiAgICAgIGNvbnN0IHRpdGxlID0gZmlsZS5jcmVhdGVEaXYoeyBjbHM6IFwibmF2LWZpbGUtdGl0bGVcIiB9KTtcclxuXHJcbiAgICAgIHRpdGxlLmNyZWF0ZVNwYW4oeyB0ZXh0OiBmaWxlbmFtZSwgY2xzOiBcIm5hdi1maWxlLXRpdGxlLWNvbnRlbnRcIiB9KTtcclxuICAgICAgdGl0bGUuY3JlYXRlU3Bhbih7XHJcbiAgICAgICAgdGV4dDogYCR7ZGF5c31kIG92ZXJkdWUgXHUwMEI3ICR7bm90ZS5ub3RlU3RhdGV9YCxcclxuICAgICAgICBjbHM6IFwic3BhY2VkLWR1ZS1tZXRhXCIsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdGl0bGUuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICBjb25zdCBtb2RhbCA9IG5ldyBSZXZpZXdNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIG5vdGUpO1xyXG4gICAgICAgIGNvbnN0IHNhdmVkID0gdGhpcy5wbHVnaW4uZGF0YS5zcnNTZXNzaW9uO1xyXG4gICAgICAgIGlmIChzYXZlZCkgbW9kYWwucmVzdW1lU2Vzc2lvbihzYXZlZCk7XHJcbiAgICAgICAgbW9kYWwub3BlbigpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuIiwgImltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmLCBWaWV3U3RhdGVSZXN1bHQsIHNldEljb24sIE1lbnUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XHJcbmltcG9ydCB7IG5vdGVJc0R1ZSB9IGZyb20gXCIuL3NjaGVkdWxlclwiO1xyXG5pbXBvcnQgeyB0b2RheSB9IGZyb20gXCIuL3V0aWxzXCI7XHJcbmltcG9ydCB7IGdldE5vdGVzRnJvbVZhdWx0IH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcclxuaW1wb3J0IHsgUmV2aWV3RXZlbnQsIE5vdGVSZWNvcmQgfSBmcm9tIFwiLi90eXBlc1wiO1xyXG5pbXBvcnQgeyBzY2FsZUxpbmVhciwgc2NhbGVUaW1lLCBzY2FsZUJhbmQsIFNjYWxlTGluZWFyIH0gZnJvbSBcImQzLXNjYWxlXCI7XHJcbmltcG9ydCB7IGxpbmUgYXMgZDNMaW5lLCBhcmVhIGFzIGQzQXJlYSB9IGZyb20gXCJkMy1zaGFwZVwiO1xyXG5pbXBvcnQgeyB0aW1lRm9ybWF0IH0gZnJvbSBcImQzLXRpbWUtZm9ybWF0XCI7XHJcbmltcG9ydCB7IHRpbWVEYXksIHRpbWVNb250aCwgdGltZVllYXIgfSBmcm9tIFwiZDMtdGltZVwiO1xyXG5pbXBvcnQgeyBzZWxlY3QgfSBmcm9tIFwiZDMtc2VsZWN0aW9uXCI7XHJcblxyXG5leHBvcnQgY29uc3QgU1RBVFNfVklFV19UWVBFID0gXCJzcGFjZWQtZXZlcnl0aGluZy1zdGF0c1wiO1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIENvbnN0YW50cyAmIFR5cGVzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5jb25zdCBDSEFSVF9QRVJJT0RTID0gW1wiMVdcIiwgXCIyV1wiLCBcIjFNXCIsIFwiNk1cIiwgXCIxWVwiLCBcIkFsbFwiXSBhcyBjb25zdDtcclxudHlwZSBDaGFydFBlcmlvZCA9ICh0eXBlb2YgQ0hBUlRfUEVSSU9EUylbbnVtYmVyXTtcclxuY29uc3QgUEVSSU9EX0RBWVM6IFJlY29yZDxDaGFydFBlcmlvZCwgbnVtYmVyPiA9IHtcclxuICBcIjFXXCI6IDcsXHJcbiAgXCIyV1wiOiAxNCxcclxuICBcIjFNXCI6IDMwLFxyXG4gIFwiNk1cIjogMTgwLFxyXG4gIFwiMVlcIjogMzY1LFxyXG4gIEFsbDogSW5maW5pdHksXHJcbn07XHJcblxyXG5jb25zdCBQRVJJT0RfTEFCRUxTOiBSZWNvcmQ8Q2hhcnRQZXJpb2QsIHN0cmluZz4gPSB7XHJcbiAgXCIxV1wiOiBcIldlZWtcIixcclxuICBcIjJXXCI6IFwiMTQgZGF5c1wiLFxyXG4gIFwiMU1cIjogXCJNb250aFwiLFxyXG4gIFwiNk1cIjogXCJIYWxmIHllYXJcIixcclxuICBcIjFZXCI6IFwiWWVhclwiLFxyXG4gIEFsbDogXCJBbGwgdGltZVwiLFxyXG59O1xyXG5cclxuLy8gXHUyNTAwXHUyNTAwIE1vZHVsZS1sZXZlbCBjaGFydCB1dGlsaXRpZXMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbmZ1bmN0aW9uIG1ha2VUaW1lRm9ybWF0KHBlcmlvZDogQ2hhcnRQZXJpb2QpOiAoZDogRGF0ZSkgPT4gc3RyaW5nIHtcclxuICBjb25zdCBkYXlGbXQgPSB0aW1lRm9ybWF0KFwiJWRcIik7XHJcbiAgaWYgKHBlcmlvZCA9PT0gXCIxV1wiIHx8IHBlcmlvZCA9PT0gXCIyV1wiIHx8IHBlcmlvZCA9PT0gXCIxTVwiKSByZXR1cm4gKGQpID0+IFN0cmluZyhwYXJzZUludChkYXlGbXQoZCkpKTtcclxuICBpZiAocGVyaW9kID09PSBcIjZNXCIpIHJldHVybiB0aW1lRm9ybWF0KFwiJWJcIik7XHJcbiAgaWYgKHBlcmlvZCA9PT0gXCIxWVwiKSB7XHJcbiAgICBjb25zdCB5ZWFyRm10ID0gdGltZUZvcm1hdChcIicleVwiKTtcclxuICAgIGNvbnN0IG1vbnRoRm10ID0gdGltZUZvcm1hdChcIiViXCIpO1xyXG4gICAgcmV0dXJuIChkKSA9PiAoZC5nZXRNb250aCgpID09PSAwID8geWVhckZtdChkKSA6IG1vbnRoRm10KGQpKTtcclxuICB9XHJcbiAgcmV0dXJuIHRpbWVGb3JtYXQoXCInJXlcIik7IC8vIFwiQWxsXCJcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFN0YXRzVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcclxuICAvLyBcdTI1MDBcdTI1MDAgU3RhdGUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgcHJpdmF0ZSBjYWxlbmRhclllYXI6IG51bWJlcjtcclxuICBwcml2YXRlIGNhbGVuZGFyTW9udGg6IG51bWJlcjsgLy8gMC1pbmRleGVkXHJcbiAgcHJpdmF0ZSBoZWF0bWFwWWVhcjogbnVtYmVyO1xyXG4gIHByaXZhdGUgcmV2aWV3Q2hhcnRQZXJpb2Q6IENoYXJ0UGVyaW9kID0gXCIxTVwiO1xyXG4gIHByaXZhdGUgZHVlQ2hhcnRQZXJpb2Q6IENoYXJ0UGVyaW9kID0gXCIxTVwiO1xyXG4gIHByaXZhdGUgZm9yZWNhc3RDaGFydFBlcmlvZDogQ2hhcnRQZXJpb2QgPSBcIjFNXCI7XHJcbiAgcHJpdmF0ZSBzZWxlY3RlZENoYXJ0OiBcIm1vbnRoXCIgfCBcInllYXJcIiB8IFwiZm9yZWNhc3RcIiB8IFwicmV2aWV3c1wiIHwgXCJkdWVcIiA9IFwibW9udGhcIjtcclxuICBwcml2YXRlIHJlc2l6ZU9ic2VydmVyOiBSZXNpemVPYnNlcnZlciB8IG51bGwgPSBudWxsO1xyXG4gIHByaXZhdGUgcmVzaXplRGVib3VuY2U6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgbnVsbCA9IG51bGw7XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBPYnNpZGlhbiB2aWV3IEFQSSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGxlYWY6IFdvcmtzcGFjZUxlYWYsXHJcbiAgICBwcml2YXRlIHBsdWdpbjogU3BhY2VkRXZlcnl0aGluZ1BsdWdpbixcclxuICApIHtcclxuICAgIHN1cGVyKGxlYWYpO1xyXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuICAgIHRoaXMuY2FsZW5kYXJZZWFyID0gbm93LmdldEZ1bGxZZWFyKCk7XHJcbiAgICB0aGlzLmNhbGVuZGFyTW9udGggPSBub3cuZ2V0TW9udGgoKTtcclxuICAgIHRoaXMuaGVhdG1hcFllYXIgPSBub3cuZ2V0RnVsbFllYXIoKTtcclxuICB9XHJcblxyXG4gIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gU1RBVFNfVklFV19UWVBFO1xyXG4gIH1cclxuICBnZXREaXNwbGF5VGV4dCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIFwiU3BhY2VkIEV2ZXJ5dGhpbmcgXHUyMDE0IFN0YXRzXCI7XHJcbiAgfVxyXG4gIGdldEljb24oKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBcImJhci1jaGFydC0yXCI7XHJcbiAgfVxyXG5cclxuICBnZXRTdGF0ZSgpOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzZWxlY3RlZENoYXJ0OiB0aGlzLnNlbGVjdGVkQ2hhcnQsXHJcbiAgICAgIGNhbGVuZGFyWWVhcjogdGhpcy5jYWxlbmRhclllYXIsXHJcbiAgICAgIGNhbGVuZGFyTW9udGg6IHRoaXMuY2FsZW5kYXJNb250aCxcclxuICAgICAgaGVhdG1hcFllYXI6IHRoaXMuaGVhdG1hcFllYXIsXHJcbiAgICAgIHJldmlld0NoYXJ0UGVyaW9kOiB0aGlzLnJldmlld0NoYXJ0UGVyaW9kLFxyXG4gICAgICBkdWVDaGFydFBlcmlvZDogdGhpcy5kdWVDaGFydFBlcmlvZCxcclxuICAgICAgZm9yZWNhc3RDaGFydFBlcmlvZDogdGhpcy5mb3JlY2FzdENoYXJ0UGVyaW9kLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHNldFN0YXRlKHN0YXRlOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiwgcmVzdWx0OiBWaWV3U3RhdGVSZXN1bHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmIChzdGF0ZS5zZWxlY3RlZENoYXJ0ICE9PSB1bmRlZmluZWQpIHRoaXMuc2VsZWN0ZWRDaGFydCA9IHN0YXRlLnNlbGVjdGVkQ2hhcnQgYXMgdHlwZW9mIHRoaXMuc2VsZWN0ZWRDaGFydDtcclxuICAgIGlmIChzdGF0ZS5jYWxlbmRhclllYXIgIT09IHVuZGVmaW5lZCkgdGhpcy5jYWxlbmRhclllYXIgPSBzdGF0ZS5jYWxlbmRhclllYXIgYXMgbnVtYmVyO1xyXG4gICAgaWYgKHN0YXRlLmNhbGVuZGFyTW9udGggIT09IHVuZGVmaW5lZCkgdGhpcy5jYWxlbmRhck1vbnRoID0gc3RhdGUuY2FsZW5kYXJNb250aCBhcyBudW1iZXI7XHJcbiAgICBpZiAoc3RhdGUuaGVhdG1hcFllYXIgIT09IHVuZGVmaW5lZCkgdGhpcy5oZWF0bWFwWWVhciA9IHN0YXRlLmhlYXRtYXBZZWFyIGFzIG51bWJlcjtcclxuICAgIGlmIChzdGF0ZS5yZXZpZXdDaGFydFBlcmlvZCAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICB0aGlzLnJldmlld0NoYXJ0UGVyaW9kID0gc3RhdGUucmV2aWV3Q2hhcnRQZXJpb2QgYXMgdHlwZW9mIHRoaXMucmV2aWV3Q2hhcnRQZXJpb2Q7XHJcbiAgICBpZiAoc3RhdGUuZHVlQ2hhcnRQZXJpb2QgIT09IHVuZGVmaW5lZCkgdGhpcy5kdWVDaGFydFBlcmlvZCA9IHN0YXRlLmR1ZUNoYXJ0UGVyaW9kIGFzIHR5cGVvZiB0aGlzLmR1ZUNoYXJ0UGVyaW9kO1xyXG4gICAgaWYgKHN0YXRlLmZvcmVjYXN0Q2hhcnRQZXJpb2QgIT09IHVuZGVmaW5lZClcclxuICAgICAgdGhpcy5mb3JlY2FzdENoYXJ0UGVyaW9kID0gc3RhdGUuZm9yZWNhc3RDaGFydFBlcmlvZCBhcyB0eXBlb2YgdGhpcy5mb3JlY2FzdENoYXJ0UGVyaW9kO1xyXG4gICAgYXdhaXQgc3VwZXIuc2V0U3RhdGUoc3RhdGUsIHJlc3VsdCk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnJlbmRlcigpO1xyXG4gICAgLy8gU2Vjb25kIHJlbmRlciBhZnRlciBsYXlvdXQgc28gU1ZHIGRpbWVuc2lvbnMgKGNsaWVudFdpZHRoL2NsaWVudEhlaWdodCkgYXJlIG5vbi16ZXJvLlxyXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcclxuICAgICAgdGhpcy5yZW5kZXIoKS5jYXRjaChjb25zb2xlLmVycm9yKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMucmVzaXplT2JzZXJ2ZXIgPSBuZXcgUmVzaXplT2JzZXJ2ZXIoKCkgPT4ge1xyXG4gICAgICBpZiAodGhpcy5yZXNpemVEZWJvdW5jZSkgY2xlYXJUaW1lb3V0KHRoaXMucmVzaXplRGVib3VuY2UpO1xyXG4gICAgICB0aGlzLnJlc2l6ZURlYm91bmNlID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKS5jYXRjaChjb25zb2xlLmVycm9yKTtcclxuICAgICAgfSwgMTAwKTtcclxuICAgIH0pO1xyXG4gICAgdGhpcy5yZXNpemVPYnNlcnZlci5vYnNlcnZlKHRoaXMuY29udGFpbmVyRWwpO1xyXG4gIH1cclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIFJlbmRlciAmIHNlY3Rpb24gZGlzcGF0Y2hlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgYXN5bmMgcmVuZGVyKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIGNvbnRlbnRFbC5hZGRDbGFzcyhcInNwYWNlZC1zdGF0cy12aWV3XCIpO1xyXG5cclxuICAgIGNvbnN0IGhpc3RvcnkgPSB0aGlzLnBsdWdpbi5kYXRhLnJldmlld0hpc3Rvcnk7XHJcbiAgICBjb25zdCB0b2RheVN0ciA9IHRvZGF5KCk7XHJcbiAgICBjb25zdCBhY3RpdmVOb3RlcyA9IGdldE5vdGVzRnJvbVZhdWx0KHRoaXMucGx1Z2luKS5maWx0ZXIoKG4pID0+IG4uaW50ZXJ2YWwgPj0gMCk7XHJcbiAgICBjb25zdCBkdWVOb3RlcyA9IGFjdGl2ZU5vdGVzLmZpbHRlcigobikgPT4gbm90ZUlzRHVlKG4pKTtcclxuICAgIGNvbnN0IHRvZGF5RXZlbnRzID0gaGlzdG9yeS5maWx0ZXIoKGUpID0+IGUudGltZXN0YW1wLnN0YXJ0c1dpdGgodG9kYXlTdHIpKTtcclxuICAgIGNvbnN0IGF2Z0ludGVydmFsID1cclxuICAgICAgYWN0aXZlTm90ZXMubGVuZ3RoID4gMCA/IE1hdGgucm91bmQoYWN0aXZlTm90ZXMucmVkdWNlKChzdW0sIG4pID0+IHN1bSArIG4uaW50ZXJ2YWwsIDApIC8gYWN0aXZlTm90ZXMubGVuZ3RoKSA6IDA7XHJcblxyXG4gICAgY29uc3QgaGVhZGVyRWwgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1oZWFkZXItc3RhdHNcIiB9KTtcclxuICAgIHRoaXMuYWRkU3RhdChoZWFkZXJFbCwgXCJUb2RheVwiLCBTdHJpbmcodG9kYXlFdmVudHMubGVuZ3RoKSk7XHJcbiAgICB0aGlzLmFkZFN0YXQoaGVhZGVyRWwsIFwiRHVlXCIsIFN0cmluZyhkdWVOb3Rlcy5sZW5ndGgpKTtcclxuICAgIHRoaXMuYWRkU3RhdChoZWFkZXJFbCwgXCJBY3RpdmVcIiwgU3RyaW5nKGFjdGl2ZU5vdGVzLmxlbmd0aCkpO1xyXG4gICAgdGhpcy5hZGRTdGF0KGhlYWRlckVsLCBcIlJldmlld3NcIiwgU3RyaW5nKGhpc3RvcnkubGVuZ3RoKSk7XHJcbiAgICB0aGlzLmFkZFN0YXQoaGVhZGVyRWwsIFwiQXZnIGludGVydmFsXCIsIGAke2F2Z0ludGVydmFsfWRgKTtcclxuXHJcbiAgICBjb25zdCBzZWxlY3RvclJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWNoYXJ0LXNlbGVjdG9yLXJvd1wiIH0pO1xyXG4gICAgY29uc3QgY2hhcnRPcHRpb25zOiB7IHZhbHVlOiB0eXBlb2YgdGhpcy5zZWxlY3RlZENoYXJ0OyBsYWJlbDogc3RyaW5nIH1bXSA9IFtcclxuICAgICAgeyB2YWx1ZTogXCJtb250aFwiLCBsYWJlbDogXCJNb250aCBjYWxlbmRhclwiIH0sXHJcbiAgICAgIHsgdmFsdWU6IFwieWVhclwiLCBsYWJlbDogXCJZZWFyIGhlYXRtYXBcIiB9LFxyXG4gICAgICB7IHZhbHVlOiBcImZvcmVjYXN0XCIsIGxhYmVsOiBcIlVwY29taW5nIGxvYWRcIiB9LFxyXG4gICAgICB7IHZhbHVlOiBcInJldmlld3NcIiwgbGFiZWw6IFwiRGFpbHkgcmV2aWV3c1wiIH0sXHJcbiAgICAgIHsgdmFsdWU6IFwiZHVlXCIsIGxhYmVsOiBcIkR1ZSBub3Rlc1wiIH0sXHJcbiAgICBdO1xyXG4gICAgY29uc3QgY3VycmVudExhYmVsID0gY2hhcnRPcHRpb25zLmZpbmQoKG8pID0+IG8udmFsdWUgPT09IHRoaXMuc2VsZWN0ZWRDaGFydCk/LmxhYmVsID8/IHRoaXMuc2VsZWN0ZWRDaGFydDtcclxuXHJcbiAgICBjb25zdCBjaGFydFRyaWdnZXJXcmFwcGVyID0gc2VsZWN0b3JSb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1wZXJpb2Qtd3JhcHBlclwiIH0pO1xyXG4gICAgY29uc3QgY2hhcnRUcmlnZ2VyQnRuID0gY2hhcnRUcmlnZ2VyV3JhcHBlci5jcmVhdGVEaXYoeyBjbHM6IFwic2UtZ3JhcGgtc2VsXCIgfSk7XHJcbiAgICBjaGFydFRyaWdnZXJCdG4uY3JlYXRlU3Bhbih7IHRleHQ6IGN1cnJlbnRMYWJlbCB9KTtcclxuXHJcbiAgICBjaGFydFRyaWdnZXJCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XHJcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgIGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG4gICAgICBmb3IgKGNvbnN0IG9wdCBvZiBjaGFydE9wdGlvbnMpIHtcclxuICAgICAgICBtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuICAgICAgICAgIGl0ZW0uc2V0VGl0bGUob3B0LmxhYmVsKTtcclxuICAgICAgICAgIGl0ZW0uc2V0Q2hlY2tlZChvcHQudmFsdWUgPT09IHRoaXMuc2VsZWN0ZWRDaGFydCk7XHJcbiAgICAgICAgICBpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnNlbGVjdGVkQ2hhcnQgPSBvcHQudmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgICBtZW51LnNob3dBdE1vdXNlRXZlbnQoZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBjaGFydEFyZWEgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1jaGFydC1hcmVhXCIgfSk7XHJcblxyXG4gICAgc3dpdGNoICh0aGlzLnNlbGVjdGVkQ2hhcnQpIHtcclxuICAgICAgY2FzZSBcIm1vbnRoXCI6XHJcbiAgICAgICAgdGhpcy5yZW5kZXJNb250aFNlY3Rpb24oY2hhcnRBcmVhLCBoaXN0b3J5LCBhY3RpdmVOb3RlcywgdG9kYXlTdHIpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIFwieWVhclwiOlxyXG4gICAgICAgIHRoaXMucmVuZGVyWWVhclNlY3Rpb24oY2hhcnRBcmVhLCBoaXN0b3J5LCB0b2RheVN0cik7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgXCJmb3JlY2FzdFwiOlxyXG4gICAgICAgIHRoaXMucmVuZGVyRm9yZWNhc3RTZWN0aW9uKGNoYXJ0QXJlYSwgYWN0aXZlTm90ZXMsIHRvZGF5U3RyKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBcInJldmlld3NcIjpcclxuICAgICAgICB0aGlzLnJlbmRlclJldmlld3NTZWN0aW9uKGNoYXJ0QXJlYSwgaGlzdG9yeSk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgXCJkdWVcIjpcclxuICAgICAgICB0aGlzLnJlbmRlckR1ZVNlY3Rpb24oY2hhcnRBcmVhKTtcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyTW9udGhTZWN0aW9uKFxyXG4gICAgY2hhcnRBcmVhOiBIVE1MRWxlbWVudCxcclxuICAgIGhpc3Rvcnk6IFJldmlld0V2ZW50W10sXHJcbiAgICBhY3RpdmVOb3RlczogTm90ZVJlY29yZFtdLFxyXG4gICAgdG9kYXlTdHI6IHN0cmluZyxcclxuICApOiB2b2lkIHtcclxuICAgIGNvbnN0IHByYWN0aWNlZENvdW50cyA9IHRoaXMuYnVpbGRQcmFjdGljZWRDb3VudHMoaGlzdG9yeSk7XHJcbiAgICBjb25zdCB1cGNvbWluZ0R1ZSA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcbiAgICBmb3IgKGNvbnN0IG5vdGUgb2YgYWN0aXZlTm90ZXMpIHtcclxuICAgICAgY29uc3QgZHVlRGF0ZSA9IG5ldyBEYXRlKG5vdGUubGFzdFJldmlld2VkT24pO1xyXG4gICAgICBkdWVEYXRlLnNldERhdGUoZHVlRGF0ZS5nZXREYXRlKCkgKyBub3RlLmludGVydmFsKTtcclxuICAgICAgY29uc3QgZHVlRGF0ZVN0ciA9IGR1ZURhdGUudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XHJcbiAgICAgIGlmIChkdWVEYXRlU3RyID4gdG9kYXlTdHIpIHVwY29taW5nRHVlLnNldChkdWVEYXRlU3RyLCAodXBjb21pbmdEdWUuZ2V0KGR1ZURhdGVTdHIpID8/IDApICsgMSk7XHJcbiAgICB9XHJcbiAgICBjb25zdCB0b2RheVllYXIgPSBwYXJzZUludCh0b2RheVN0ci5zbGljZSgwLCA0KSk7XHJcbiAgICBjb25zdCB0b2RheU1vbnRoID0gcGFyc2VJbnQodG9kYXlTdHIuc2xpY2UoNSwgNykpIC0gMTsgLy8gMC1pbmRleGVkXHJcbiAgICBjb25zdCBpc1RoaXNNb250aCA9IHRoaXMuY2FsZW5kYXJZZWFyID09PSB0b2RheVllYXIgJiYgdGhpcy5jYWxlbmRhck1vbnRoID09PSB0b2RheU1vbnRoO1xyXG4gICAgY29uc3QgbW9udGhOYW1lID0gbmV3IERhdGUodGhpcy5jYWxlbmRhclllYXIsIHRoaXMuY2FsZW5kYXJNb250aCwgMSkudG9Mb2NhbGVTdHJpbmcoXCJkZWZhdWx0XCIsIHsgbW9udGg6IFwibG9uZ1wiIH0pO1xyXG4gICAgY29uc3QgbGFiZWwgPSBpc1RoaXNNb250aCA/IFwiVGhpcyBtb250aFwiIDogYCR7bW9udGhOYW1lfSwgJHt0aGlzLmNhbGVuZGFyWWVhcn1gO1xyXG4gICAgdGhpcy5jcmVhdGVOYXZSb3coXHJcbiAgICAgIGNoYXJ0QXJlYSxcclxuICAgICAgbGFiZWwsXHJcbiAgICAgICgpID0+IHtcclxuICAgICAgICB0aGlzLmNhbGVuZGFyTW9udGgtLTtcclxuICAgICAgICBpZiAodGhpcy5jYWxlbmRhck1vbnRoIDwgMCkge1xyXG4gICAgICAgICAgdGhpcy5jYWxlbmRhck1vbnRoID0gMTE7XHJcbiAgICAgICAgICB0aGlzLmNhbGVuZGFyWWVhci0tO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICB9LFxyXG4gICAgICAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5jYWxlbmRhck1vbnRoKys7XHJcbiAgICAgICAgaWYgKHRoaXMuY2FsZW5kYXJNb250aCA+IDExKSB7XHJcbiAgICAgICAgICB0aGlzLmNhbGVuZGFyTW9udGggPSAwO1xyXG4gICAgICAgICAgdGhpcy5jYWxlbmRhclllYXIrKztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgfSxcclxuICAgICk7XHJcbiAgICB0aGlzLnJlbmRlck1vbnRoQ2FsZW5kYXIoY2hhcnRBcmVhLCB0aGlzLmNhbGVuZGFyWWVhciwgdGhpcy5jYWxlbmRhck1vbnRoLCBwcmFjdGljZWRDb3VudHMsIHRvZGF5U3RyLCB1cGNvbWluZ0R1ZSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlclllYXJTZWN0aW9uKGNoYXJ0QXJlYTogSFRNTEVsZW1lbnQsIGhpc3Rvcnk6IFJldmlld0V2ZW50W10sIHRvZGF5U3RyOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGNvbnN0IHllYXJFdmVudHMgPSBoaXN0b3J5LmZpbHRlcigoZSkgPT4gZS50aW1lc3RhbXAuc3RhcnRzV2l0aChTdHJpbmcodGhpcy5oZWF0bWFwWWVhcikpKTtcclxuICAgIGNvbnN0IHByYWN0aWNlZEluWWVhciA9IHRoaXMuYnVpbGRQcmFjdGljZWRDb3VudHMoeWVhckV2ZW50cyk7XHJcbiAgICB0aGlzLmNyZWF0ZU5hdlJvdyhcclxuICAgICAgY2hhcnRBcmVhLFxyXG4gICAgICBTdHJpbmcodGhpcy5oZWF0bWFwWWVhciksXHJcbiAgICAgICgpID0+IHtcclxuICAgICAgICB0aGlzLmhlYXRtYXBZZWFyLS07XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgfSxcclxuICAgICAgKCkgPT4ge1xyXG4gICAgICAgIHRoaXMuaGVhdG1hcFllYXIrKztcclxuICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICB9LFxyXG4gICAgKTtcclxuICAgIHRoaXMucmVuZGVyWWVhckhlYXRtYXAoY2hhcnRBcmVhLCB0aGlzLmhlYXRtYXBZZWFyLCBwcmFjdGljZWRJblllYXIsIHRvZGF5U3RyKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyRm9yZWNhc3RTZWN0aW9uKGNoYXJ0QXJlYTogSFRNTEVsZW1lbnQsIGFjdGl2ZU5vdGVzOiBOb3RlUmVjb3JkW10sIHRvZGF5U3RyOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGNvbnN0IGZvcmVjYXN0RGF5cyA9IE1hdGgubWluKFBFUklPRF9EQVlTW3RoaXMuZm9yZWNhc3RDaGFydFBlcmlvZF0sIDczMCk7XHJcbiAgICBjb25zdCBmb3JlY2FzdERhdGEgPSB0aGlzLmJ1aWxkRm9yZWNhc3REYXRhKGFjdGl2ZU5vdGVzLCB0b2RheVN0ciwgZm9yZWNhc3REYXlzKTtcclxuICAgIHRoaXMucmVuZGVyRm9yZWNhc3RDaGFydChjaGFydEFyZWEsIGZvcmVjYXN0RGF0YSwgdGhpcy5mb3JlY2FzdENoYXJ0UGVyaW9kLCAocCkgPT4ge1xyXG4gICAgICB0aGlzLmZvcmVjYXN0Q2hhcnRQZXJpb2QgPSBwO1xyXG4gICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlclJldmlld3NTZWN0aW9uKGNoYXJ0QXJlYTogSFRNTEVsZW1lbnQsIGhpc3Rvcnk6IFJldmlld0V2ZW50W10pOiB2b2lkIHtcclxuICAgIGNvbnN0IGRhaWx5RGF0YSA9IHRoaXMuYnVpbGREYWlseVJldmlld0RhdGEoaGlzdG9yeSk7XHJcbiAgICBpZiAoZGFpbHlEYXRhLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBjaGFydEFyZWEuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyByZXZpZXcgaGlzdG9yeSB5ZXQuXCIsIGNsczogXCJzcGFjZWQtbXV0ZWRcIiB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMucmVuZGVyQmFyVHJlbmRDaGFydChjaGFydEFyZWEsIGRhaWx5RGF0YSwgdGhpcy5yZXZpZXdDaGFydFBlcmlvZCwgKHApID0+IHtcclxuICAgICAgICB0aGlzLnJldmlld0NoYXJ0UGVyaW9kID0gcDtcclxuICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyRHVlU2VjdGlvbihjaGFydEFyZWE6IEhUTUxFbGVtZW50KTogdm9pZCB7XHJcbiAgICBjb25zdCBsb2cgPSB0aGlzLnBsdWdpbi5kYXRhLnJldmlld0xvYWRMb2c7XHJcbiAgICBpZiAobG9nLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBjaGFydEFyZWEuY3JlYXRlRWwoXCJwXCIsIHtcclxuICAgICAgICB0ZXh0OiBcIk5vIHN5bmMgaGlzdG9yeSB5ZXQuIFJ1biAnU3luYyB2YXVsdCcgdG8gc3RhcnQgbG9nZ2luZy5cIixcclxuICAgICAgICBjbHM6IFwic3BhY2VkLW11dGVkXCIsXHJcbiAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5yZW5kZXJCYXJUcmVuZENoYXJ0KFxyXG4gICAgICAgIGNoYXJ0QXJlYSxcclxuICAgICAgICB0aGlzLmJ1aWxkRGFpbHlEYXRhKGxvZywgKGUpID0+IGUubnVtRHVlLCB0cnVlKSxcclxuICAgICAgICB0aGlzLmR1ZUNoYXJ0UGVyaW9kLFxyXG4gICAgICAgIChwKSA9PiB7XHJcbiAgICAgICAgICB0aGlzLmR1ZUNoYXJ0UGVyaW9kID0gcDtcclxuICAgICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBTaGFyZWQgY2hhcnQgaW5mcmFzdHJ1Y3R1cmUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgLy8gVXNlZCBieSBtdWx0aXBsZSBjaGFydHM6IHNjYWZmb2xkLCBoZWxwZXJzLCBzaGFyZWQgcHJpbWl0aXZlc1xyXG5cclxuICBwcml2YXRlIGJ1aWxkQ2hhcnRTY2FmZm9sZChcclxuICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcbiAgICBkYXRhOiB7IGRhdGU6IHN0cmluZzsgdmFsdWU6IG51bWJlciB9W10sXHJcbiAgICBzZWxFbDogSFRNTEVsZW1lbnQsXHJcbiAgKTogeyBzdmc6IFNWR0VsZW1lbnQ7IGNoYXJ0SDogbnVtYmVyOyB0b3RhbEg6IG51bWJlcjsgdG90YWxXOiBudW1iZXI7IHlTY2FsZTogU2NhbGVMaW5lYXI8bnVtYmVyLCBudW1iZXI+IH0ge1xyXG4gICAgY29uc3QgbGFiZWxIID0gMjQ7XHJcbiAgICBjb25zdCBzZWxIID0gc2VsRWwub2Zmc2V0SGVpZ2h0ICsgNjtcclxuICAgIGNvbnN0IGNoYXJ0SCA9IE1hdGgubWF4KChjb250YWluZXIuY2xpZW50SGVpZ2h0IHx8IDIwMCkgLSBsYWJlbEggLSBzZWxIIC0gMTAsIDEwMCk7XHJcbiAgICBjb25zdCB0b3RhbEggPSBjaGFydEggKyBsYWJlbEggKyAyMDtcclxuICAgIGNvbnN0IHlBeGlzVyA9IDM0O1xyXG4gICAgY29uc3QgdG90YWxXID0gTWF0aC5tYXgoKGNvbnRhaW5lci5jbGllbnRXaWR0aCB8fCAzMDApIC0geUF4aXNXIC0gOCwgNjApO1xyXG4gICAgY29uc3QgZGF0YU1heCA9IE1hdGgubWF4KC4uLmRhdGEubWFwKChkKSA9PiBkLnZhbHVlKSwgMSk7XHJcbiAgICBjb25zdCB0b3BQYWQgPSAxNDsgLy8gcGl4ZWxzIHJlc2VydmVkIGFib3ZlIHRoZSB0YWxsZXN0IGJhciBmb3IgbGFiZWxzXHJcbiAgICBjb25zdCB5U2NhbGUgPSBzY2FsZUxpbmVhcigpLmRvbWFpbihbMCwgZGF0YU1heF0pLnJhbmdlKFtjaGFydEgsIHRvcFBhZF0pLm5pY2UoNik7XHJcbiAgICBjb25zdCB5VGlja3MgPSB5U2NhbGUudGlja3MoNik7XHJcblxyXG4gICAgY29uc3Qgd3JhcEVsID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtY2hhcnQtd3JhcFwiIH0pO1xyXG5cclxuICAgIC8vIFx1MjUwMFx1MjUwMCBZLWF4aXMgU1ZHIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gICAgY29uc3QgeUF4aXNTdmcgPSBzZWxlY3Qod3JhcEVsKVxyXG4gICAgICAuYXBwZW5kKFwic3ZnXCIpXHJcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwgeUF4aXNXKVxyXG4gICAgICAuYXR0cihcImhlaWdodFwiLCB0b3RhbEgpXHJcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJzcGFjZWQteS1heGlzLXN2Z1wiKTtcclxuXHJcbiAgICB5QXhpc1N2Z1xyXG4gICAgICAuc2VsZWN0QWxsPFNWR0xpbmVFbGVtZW50LCBudW1iZXI+KFwibGluZS55LXRpY2tcIilcclxuICAgICAgLmRhdGEoeVRpY2tzKVxyXG4gICAgICAuam9pbihcImxpbmVcIilcclxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInktdGlja1wiKVxyXG4gICAgICAuYXR0cihcIngxXCIsIHlBeGlzVyAtIDQpXHJcbiAgICAgIC5hdHRyKFwieTFcIiwgKGQpID0+IE1hdGgucm91bmQoeVNjYWxlKGQpKSlcclxuICAgICAgLmF0dHIoXCJ4MlwiLCB5QXhpc1cpXHJcbiAgICAgIC5hdHRyKFwieTJcIiwgKGQpID0+IE1hdGgucm91bmQoeVNjYWxlKGQpKSlcclxuICAgICAgLmF0dHIoXCJzdHJva2VcIiwgXCJ2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlcilcIilcclxuICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwgMSk7XHJcblxyXG4gICAgeUF4aXNTdmdcclxuICAgICAgLnNlbGVjdEFsbDxTVkdUZXh0RWxlbWVudCwgbnVtYmVyPihcInRleHQueS1sYWJlbFwiKVxyXG4gICAgICAuZGF0YSh5VGlja3MpXHJcbiAgICAgIC5qb2luKFwidGV4dFwiKVxyXG4gICAgICAuYXR0cihcImNsYXNzXCIsIFwieS1sYWJlbFwiKVxyXG4gICAgICAuYXR0cihcInhcIiwgeUF4aXNXIC0gNilcclxuICAgICAgLmF0dHIoXCJ5XCIsIChkKSA9PiBNYXRoLnJvdW5kKHlTY2FsZShkKSkgKyAzKVxyXG4gICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwiZW5kXCIpXHJcbiAgICAgIC5hdHRyKFwiZm9udC1zaXplXCIsIDE2KVxyXG4gICAgICAuYXR0cihcImZpbGxcIiwgXCJ2YXIoLS10ZXh0LW11dGVkKVwiKVxyXG4gICAgICAudGV4dCgoZCkgPT4gU3RyaW5nKGQpKTtcclxuXHJcbiAgICB5QXhpc1N2Z1xyXG4gICAgICAuYXBwZW5kKFwibGluZVwiKVxyXG4gICAgICAuYXR0cihcIngxXCIsIHlBeGlzVylcclxuICAgICAgLmF0dHIoXCJ5MVwiLCAwKVxyXG4gICAgICAuYXR0cihcIngyXCIsIHlBeGlzVylcclxuICAgICAgLmF0dHIoXCJ5MlwiLCBjaGFydEgpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwidmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpXCIpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIDEpO1xyXG5cclxuICAgIC8vIFx1MjUwMFx1MjUwMCBDaGFydCBTVkcgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgICBjb25zdCBjaGFydFN2ZyA9IHNlbGVjdCh3cmFwRWwpXHJcbiAgICAgIC5hcHBlbmQoXCJzdmdcIilcclxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB0b3RhbFcpXHJcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIHRvdGFsSClcclxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInNwYWNlZC1jaGFydC1zdmdcIik7XHJcblxyXG4gICAgY2hhcnRTdmdcclxuICAgICAgLnNlbGVjdEFsbDxTVkdMaW5lRWxlbWVudCwgbnVtYmVyPihcImxpbmUuZ3JpZC1oXCIpXHJcbiAgICAgIC5kYXRhKHlUaWNrcylcclxuICAgICAgLmpvaW4oXCJsaW5lXCIpXHJcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJncmlkLWhcIilcclxuICAgICAgLmF0dHIoXCJ4MVwiLCAwKVxyXG4gICAgICAuYXR0cihcInkxXCIsIChkKSA9PiBNYXRoLnJvdW5kKHlTY2FsZShkKSkpXHJcbiAgICAgIC5hdHRyKFwieDJcIiwgdG90YWxXKVxyXG4gICAgICAuYXR0cihcInkyXCIsIChkKSA9PiBNYXRoLnJvdW5kKHlTY2FsZShkKSkpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwidmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpXCIpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIDEpXHJcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLCAwLjQpO1xyXG5cclxuICAgIGNoYXJ0U3ZnXHJcbiAgICAgIC5hcHBlbmQoXCJsaW5lXCIpXHJcbiAgICAgIC5hdHRyKFwieDFcIiwgMClcclxuICAgICAgLmF0dHIoXCJ5MVwiLCBjaGFydEgpXHJcbiAgICAgIC5hdHRyKFwieDJcIiwgdG90YWxXKVxyXG4gICAgICAuYXR0cihcInkyXCIsIGNoYXJ0SClcclxuICAgICAgLmF0dHIoXCJzdHJva2VcIiwgXCJ2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlcilcIilcclxuICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwgMSk7XHJcblxyXG4gICAgcmV0dXJuIHsgc3ZnOiBjaGFydFN2Zy5ub2RlKCkhLCBjaGFydEgsIHRvdGFsSCwgdG90YWxXLCB5U2NhbGUgfTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVuZGVyTGluZUNvbnRlbnQoXHJcbiAgICBzdmc6IFNWR0VsZW1lbnQsXHJcbiAgICBkYXRhOiB7IGRhdGU6IHN0cmluZzsgdmFsdWU6IG51bWJlciB9W10sXHJcbiAgICBwZXJpb2Q6IENoYXJ0UGVyaW9kLFxyXG4gICAgY2hhcnRIOiBudW1iZXIsXHJcbiAgICB0b3RhbEg6IG51bWJlcixcclxuICAgIHRvdGFsVzogbnVtYmVyLFxyXG4gICAgeVNjYWxlOiBTY2FsZUxpbmVhcjxudW1iZXIsIG51bWJlcj4sXHJcbiAgKTogdm9pZCB7XHJcbiAgICBjb25zdCBkYXRlcyA9IGRhdGEubWFwKChkKSA9PiBuZXcgRGF0ZShkLmRhdGUpKTtcclxuICAgIGNvbnN0IHhTY2FsZSA9IHNjYWxlVGltZSgpXHJcbiAgICAgIC5kb21haW4oW2RhdGVzWzBdLCBkYXRlc1tkYXRlcy5sZW5ndGggLSAxXV0pXHJcbiAgICAgIC5yYW5nZShbMCwgdG90YWxXXSk7XHJcblxyXG4gICAgY29uc3QgdGlja0ludGVydmFsID1cclxuICAgICAgcGVyaW9kID09PSBcIjFXXCJcclxuICAgICAgICA/IHRpbWVEYXkuZXZlcnkoMSlcclxuICAgICAgICA6IHBlcmlvZCA9PT0gXCIyV1wiXHJcbiAgICAgICAgICA/IHRpbWVEYXkuZXZlcnkoMilcclxuICAgICAgICAgIDogcGVyaW9kID09PSBcIjFNXCJcclxuICAgICAgICAgICAgPyB0aW1lRGF5LmV2ZXJ5KDEwKVxyXG4gICAgICAgICAgICA6IHBlcmlvZCA9PT0gXCI2TVwiXHJcbiAgICAgICAgICAgICAgPyB0aW1lTW9udGguZXZlcnkoMSlcclxuICAgICAgICAgICAgICA6IHBlcmlvZCA9PT0gXCIxWVwiXHJcbiAgICAgICAgICAgICAgICA/IHRpbWVNb250aC5ldmVyeSgxKVxyXG4gICAgICAgICAgICAgICAgOiB0aW1lWWVhci5ldmVyeSgxKTtcclxuICAgIGNvbnN0IHhUaWNrcyA9IHhTY2FsZS50aWNrcyh0aWNrSW50ZXJ2YWwhKTtcclxuICAgIGNvbnN0IGZtdCA9IG1ha2VUaW1lRm9ybWF0KHBlcmlvZCk7XHJcblxyXG4gICAgY29uc3QgcmF3RGF0YSA9IGRhdGVzLm1hcCgoZGF0ZSwgaSkgPT4gKHsgZGF0ZSwgdmFsdWU6IGRhdGFbaV0udmFsdWUgfSkpO1xyXG5cclxuICAgIGNvbnN0IGFyZWFHZW4gPSBkM0FyZWE8eyBkYXRlOiBEYXRlOyB2YWx1ZTogbnVtYmVyIH0+KClcclxuICAgICAgLngoKGQpID0+IHhTY2FsZShkLmRhdGUpKVxyXG4gICAgICAueTAoY2hhcnRIKVxyXG4gICAgICAueTEoKGQpID0+IHlTY2FsZShkLnZhbHVlKSk7XHJcblxyXG4gICAgY29uc3QgbGluZUdlbiA9IGQzTGluZTx7IGRhdGU6IERhdGU7IHZhbHVlOiBudW1iZXIgfT4oKVxyXG4gICAgICAueCgoZCkgPT4geFNjYWxlKGQuZGF0ZSkpXHJcbiAgICAgIC55KChkKSA9PiB5U2NhbGUoZC52YWx1ZSkpO1xyXG5cclxuICAgIGNvbnN0IHN2Z1NlbCA9IHNlbGVjdChzdmcpO1xyXG5cclxuICAgIHN2Z1NlbFxyXG4gICAgICAuc2VsZWN0QWxsPFNWR0xpbmVFbGVtZW50LCBEYXRlPihcImxpbmUuZ3JpZC12XCIpXHJcbiAgICAgIC5kYXRhKHhUaWNrcylcclxuICAgICAgLmpvaW4oXCJsaW5lXCIpXHJcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJncmlkLXZcIilcclxuICAgICAgLmF0dHIoXCJ4MVwiLCAoZCkgPT4gTWF0aC5yb3VuZCh4U2NhbGUoZCkpKVxyXG4gICAgICAuYXR0cihcInkxXCIsIDApXHJcbiAgICAgIC5hdHRyKFwieDJcIiwgKGQpID0+IE1hdGgucm91bmQoeFNjYWxlKGQpKSlcclxuICAgICAgLmF0dHIoXCJ5MlwiLCBjaGFydEggKyAxMClcclxuICAgICAgLmF0dHIoXCJzdHJva2VcIiwgXCJ2YXIoLS1jb2xvci1iYXNlLTQwKVwiKVxyXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAwLjUpO1xyXG5cclxuICAgIHN2Z1NlbFxyXG4gICAgICAuYXBwZW5kKFwicGF0aFwiKVxyXG4gICAgICAuYXR0cihcImRcIiwgYXJlYUdlbihyYXdEYXRhKSA/PyBcIlwiKVxyXG4gICAgICAuYXR0cihcImZpbGxcIiwgXCJ2YXIoLS1pbnRlcmFjdGl2ZS1hY2NlbnQpXCIpXHJcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLCAwLjE1KVxyXG4gICAgICAuYXR0cihcInN0cm9rZVwiLCBcIm5vbmVcIik7XHJcblxyXG4gICAgc3ZnU2VsXHJcbiAgICAgIC5hcHBlbmQoXCJwYXRoXCIpXHJcbiAgICAgIC5hdHRyKFwiZFwiLCBsaW5lR2VuKHJhd0RhdGEpID8/IFwiXCIpXHJcbiAgICAgIC5hdHRyKFwiZmlsbFwiLCBcIm5vbmVcIilcclxuICAgICAgLmF0dHIoXCJzdHJva2VcIiwgXCJ2YXIoLS1pbnRlcmFjdGl2ZS1hY2NlbnQpXCIpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIDEuNSlcclxuICAgICAgLmF0dHIoXCJzdHJva2UtbGluZWNhcFwiLCBcInJvdW5kXCIpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlLWxpbmVqb2luXCIsIFwicm91bmRcIik7XHJcblxyXG4gICAgc3ZnU2VsXHJcbiAgICAgIC5zZWxlY3RBbGw8U1ZHVGV4dEVsZW1lbnQsIERhdGU+KFwidGV4dC54LWxhYmVsXCIpXHJcbiAgICAgIC5kYXRhKHhUaWNrcylcclxuICAgICAgLmpvaW4oXCJ0ZXh0XCIpXHJcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ4LWxhYmVsXCIpXHJcbiAgICAgIC5hdHRyKFwieFwiLCAoZCkgPT4gTWF0aC5yb3VuZCh4U2NhbGUoZCkpKVxyXG4gICAgICAuYXR0cihcInlcIiwgdG90YWxIIC0gMilcclxuICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxyXG4gICAgICAuYXR0cihcImZvbnQtc2l6ZVwiLCAxMilcclxuICAgICAgLmF0dHIoXCJmaWxsXCIsIFwidmFyKC0tdGV4dC1tdXRlZClcIilcclxuICAgICAgLnRleHQoKGQpID0+IGZtdChkKSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlckJhckNvbnRlbnQoXHJcbiAgICBzdmc6IFNWR0VsZW1lbnQsXHJcbiAgICBkYXRhOiB7IGRhdGU6IHN0cmluZzsgdmFsdWU6IG51bWJlciB9W10sXHJcbiAgICBwZXJpb2Q6IENoYXJ0UGVyaW9kLFxyXG4gICAgY2hhcnRIOiBudW1iZXIsXHJcbiAgICB0b3RhbEg6IG51bWJlcixcclxuICAgIHRvdGFsVzogbnVtYmVyLFxyXG4gICAgeVNjYWxlOiBTY2FsZUxpbmVhcjxudW1iZXIsIG51bWJlcj4sXHJcbiAgICB0b2RheVN0cj86IHN0cmluZyxcclxuICApOiB2b2lkIHtcclxuICAgIGNvbnN0IHhTY2FsZSA9IHNjYWxlQmFuZDxzdHJpbmc+KClcclxuICAgICAgLmRvbWFpbihkYXRhLm1hcCgoZCkgPT4gZC5kYXRlKSlcclxuICAgICAgLnJhbmdlKFswLCB0b3RhbFddKVxyXG4gICAgICAucGFkZGluZygwLjM1KTtcclxuICAgIGNvbnN0IGJhclcgPSB4U2NhbGUuYmFuZHdpZHRoKCk7XHJcbiAgICBjb25zdCBmbXQgPSBtYWtlVGltZUZvcm1hdChwZXJpb2QpO1xyXG5cclxuICAgIGNvbnN0IGxhYmVsRGF0ZXMgPSBkYXRhLmZpbHRlcigoZCwgaSkgPT4ge1xyXG4gICAgICBpZiAocGVyaW9kID09PSBcIjFXXCIpIHJldHVybiB0cnVlO1xyXG4gICAgICBpZiAocGVyaW9kID09PSBcIjJXXCIpIHJldHVybiBpICUgMiA9PT0gMDtcclxuICAgICAgaWYgKHBlcmlvZCA9PT0gXCIxTVwiKSB7XHJcbiAgICAgICAgY29uc3QgZGF5ID0gcGFyc2VJbnQoZC5kYXRlLnNsaWNlKDgsIDEwKSk7XHJcbiAgICAgICAgcmV0dXJuIGRheSA9PT0gMSB8fCBkYXkgPT09IDEwIHx8IGRheSA9PT0gMjA7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgcm9sbGluZyA9IHRoaXMucm9sbGluZ0F2ZXJhZ2UoZGF0YSk7XHJcbiAgICBjb25zdCByYXdEYXRhID0gZGF0YS5tYXAoKGQsIGkpID0+ICh7IGRhdGU6IGQuZGF0ZSwgdmFsdWU6IHJvbGxpbmdbaV0gfSkpO1xyXG5cclxuICAgIGNvbnN0IGxpbmVHZW4gPSBkM0xpbmU8eyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfT4oKVxyXG4gICAgICAueCgoZCkgPT4gKHhTY2FsZShkLmRhdGUpID8/IDApICsgYmFyVyAvIDIpXHJcbiAgICAgIC55KChkKSA9PiB5U2NhbGUoZC52YWx1ZSkpO1xyXG5cclxuICAgIGNvbnN0IHN2Z1NlbCA9IHNlbGVjdChzdmcpO1xyXG5cclxuICAgIHN2Z1NlbFxyXG4gICAgICAuc2VsZWN0QWxsPFNWR0xpbmVFbGVtZW50LCB7IGRhdGU6IHN0cmluZzsgdmFsdWU6IG51bWJlciB9PihcImxpbmUuZ3JpZC12XCIpXHJcbiAgICAgIC5kYXRhKGxhYmVsRGF0ZXMpXHJcbiAgICAgIC5qb2luKFwibGluZVwiKVxyXG4gICAgICAuYXR0cihcImNsYXNzXCIsIFwiZ3JpZC12XCIpXHJcbiAgICAgIC5hdHRyKFwieDFcIiwgKGQpID0+ICh4U2NhbGUoZC5kYXRlKSA/PyAwKSArIGJhclcgLyAyKVxyXG4gICAgICAuYXR0cihcInkxXCIsIDApXHJcbiAgICAgIC5hdHRyKFwieDJcIiwgKGQpID0+ICh4U2NhbGUoZC5kYXRlKSA/PyAwKSArIGJhclcgLyAyKVxyXG4gICAgICAuYXR0cihcInkyXCIsIGNoYXJ0SCArIDEwKVxyXG4gICAgICAuYXR0cihcInN0cm9rZVwiLCBcInZhcigtLWNvbG9yLWJhc2UtNDApXCIpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIDAuNSk7XHJcblxyXG4gICAgc3ZnU2VsXHJcbiAgICAgIC5hcHBlbmQoXCJwYXRoXCIpXHJcbiAgICAgIC5hdHRyKFwiZFwiLCBsaW5lR2VuKHJhd0RhdGEpID8/IFwiXCIpXHJcbiAgICAgIC5hdHRyKFwiZmlsbFwiLCBcIm5vbmVcIilcclxuICAgICAgLmF0dHIoXCJzdHJva2VcIiwgXCJ2YXIoLS1pbnRlcmFjdGl2ZS1hY2NlbnQpXCIpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIDMpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlLWxpbmVjYXBcIiwgXCJyb3VuZFwiKVxyXG4gICAgICAuYXR0cihcInN0cm9rZS1saW5lam9pblwiLCBcInJvdW5kXCIpXHJcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLCAwLjgpO1xyXG5cclxuICAgIHN2Z1NlbFxyXG4gICAgICAuc2VsZWN0QWxsPFNWR1JlY3RFbGVtZW50LCB7IGRhdGU6IHN0cmluZzsgdmFsdWU6IG51bWJlciB9PihcInJlY3QuYmFyXCIpXHJcbiAgICAgIC5kYXRhKGRhdGEpXHJcbiAgICAgIC5qb2luKFwicmVjdFwiKVxyXG4gICAgICAuYXR0cihcImNsYXNzXCIsIFwiYmFyXCIpXHJcbiAgICAgIC5hdHRyKFwieFwiLCAoZCkgPT4geFNjYWxlKGQuZGF0ZSkgPz8gMClcclxuICAgICAgLmF0dHIoXCJ5XCIsIChkKSA9PiB5U2NhbGUoZC52YWx1ZSkpXHJcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwgYmFyVylcclxuICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgKGQpID0+IE1hdGgubWF4KE1hdGgucm91bmQoeVNjYWxlKDApIC0geVNjYWxlKGQudmFsdWUpKSwgZC52YWx1ZSA+IDAgPyAyIDogMCkpXHJcbiAgICAgIC5hdHRyKFwicnhcIiwgMilcclxuICAgICAgLmF0dHIoXCJmaWxsXCIsIFwidmFyKC0tY29sb3ItZ3JlZW4pXCIpXHJcbiAgICAgIC5hdHRyKFwib3BhY2l0eVwiLCAxKTtcclxuXHJcbiAgICAvLyBWYWx1ZSBsYWJlbHMgYWJvdmUgYmFycyBcdTIwMTQgb25seSBmb3IgbmFycm93LXBlcmlvZCB2aWV3c1xyXG4gICAgaWYgKHBlcmlvZCA9PT0gXCIxV1wiIHx8IHBlcmlvZCA9PT0gXCIyV1wiKSB7XHJcbiAgICAgIHN2Z1NlbFxyXG4gICAgICAgIC5zZWxlY3RBbGw8U1ZHVGV4dEVsZW1lbnQsIHsgZGF0ZTogc3RyaW5nOyB2YWx1ZTogbnVtYmVyIH0+KFwidGV4dC5iYXItbGFiZWxcIilcclxuICAgICAgICAuZGF0YShkYXRhLmZpbHRlcigoZCkgPT4gZC52YWx1ZSA+IDApKVxyXG4gICAgICAgIC5qb2luKFwidGV4dFwiKVxyXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJiYXItbGFiZWxcIilcclxuICAgICAgICAuYXR0cihcInhcIiwgKGQpID0+ICh4U2NhbGUoZC5kYXRlKSA/PyAwKSArIGJhclcgLyAyKVxyXG4gICAgICAgIC5hdHRyKFwieVwiLCAoZCkgPT4gTWF0aC5tYXgoeVNjYWxlKGQudmFsdWUpIC0gNiwgMTApKSAvLyBjbGFtcCBzbyBpdCBkb2Vzbid0IGNsaXAgYXQgdG9wXHJcbiAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxyXG4gICAgICAgIC5hdHRyKFwiZm9udC1zaXplXCIsIDEyKVxyXG4gICAgICAgIC5hdHRyKFwiZm9udC13ZWlnaHRcIiwgXCJib2xkXCIpXHJcbiAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwidmFyKC0tY29sb3ItZ3JlZW4pXCIpXHJcbiAgICAgICAgLnRleHQoKGQpID0+IFN0cmluZyhkLnZhbHVlKSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3ZnU2VsXHJcbiAgICAgIC5zZWxlY3RBbGw8U1ZHVGV4dEVsZW1lbnQsIHsgZGF0ZTogc3RyaW5nOyB2YWx1ZTogbnVtYmVyIH0+KFwidGV4dC54LWxhYmVsXCIpXHJcbiAgICAgIC5kYXRhKGxhYmVsRGF0ZXMpXHJcbiAgICAgIC5qb2luKFwidGV4dFwiKVxyXG4gICAgICAuYXR0cihcImNsYXNzXCIsIFwieC1sYWJlbFwiKVxyXG4gICAgICAuYXR0cihcInhcIiwgKGQpID0+ICh4U2NhbGUoZC5kYXRlKSA/PyAwKSArIGJhclcgLyAyKVxyXG4gICAgICAuYXR0cihcInlcIiwgdG90YWxIIC0gMTgpXHJcbiAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcclxuICAgICAgLmF0dHIoXCJmb250LXNpemVcIiwgMTYpXHJcbiAgICAgIC5hdHRyKFwiZmlsbFwiLCBcInZhcigtLXRleHQtbXV0ZWQpXCIpXHJcbiAgICAgIC50ZXh0KChkKSA9PiBmbXQobmV3IERhdGUoZC5kYXRlKSkpO1xyXG5cclxuICAgIC8vIFRvZGF5IGNpcmNsZSBtYXJrZXIgXHUyMDE0IG9ubHkgd2hlbiBjYWxsZWQgZnJvbSB0aGUgZm9yZWNhc3QgY2hhcnRcclxuICAgIGlmICh0b2RheVN0ciAmJiBsYWJlbERhdGVzLnNvbWUoKGQpID0+IGQuZGF0ZSA9PT0gdG9kYXlTdHIpKSB7XHJcbiAgICAgIGNvbnN0IHR4ID0gKHhTY2FsZSh0b2RheVN0cikgPz8gMCkgKyBiYXJXIC8gMjtcclxuICAgICAgLy8gZm9udC1zaXplIGlzIDE2LCBiYXNlbGluZSBhdCB0b3RhbEgtMiwgc28gY2VudGVyIFx1MjI0OCB0b3RhbEgtMTBcclxuICAgICAgc3ZnU2VsXHJcbiAgICAgICAgLmluc2VydChcImNpcmNsZVwiLCBcInRleHQueC1sYWJlbFwiKSAvLyBpbnNlcnRzIGJlZm9yZSB0ZXh0LCBzbyBjaXJjbGUgaXMgYmVoaW5kXHJcbiAgICAgICAgLmF0dHIoXCJjeFwiLCB0eClcclxuICAgICAgICAuYXR0cihcImN5XCIsIHRvdGFsSCAtIDI0KVxyXG4gICAgICAgIC5hdHRyKFwiclwiLCAxMClcclxuICAgICAgICAuYXR0cihcImZpbGxcIiwgXCJ2YXIoLS10ZXh0LW11dGVkKVwiKTtcclxuICAgICAgc3ZnU2VsXHJcbiAgICAgICAgLnNlbGVjdEFsbDxTVkdUZXh0RWxlbWVudCwgeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfT4oXCJ0ZXh0LngtbGFiZWxcIilcclxuICAgICAgICAuZmlsdGVyKChkKSA9PiBkLmRhdGUgPT09IHRvZGF5U3RyKVxyXG4gICAgICAgIC5hdHRyKFwiZmlsbFwiLCBcInZhcigtLWJhY2tncm91bmQtcHJpbWFyeSlcIilcclxuICAgICAgICAuYXR0cihcImZvbnQtc2l6ZVwiLCBcIjE2cHhcIilcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlTmF2Um93KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcsIG9uUHJldjogKCkgPT4gdm9pZCwgb25OZXh0OiAoKSA9PiB2b2lkKTogdm9pZCB7XHJcbiAgICBjb25zdCBuYXYgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1uYXYtcm93XCIgfSk7XHJcbiAgICBuYXYuY3JlYXRlU3Bhbih7IHRleHQ6IGxhYmVsIH0pO1xyXG4gICAgY29uc3QgYnRucyA9IG5hdi5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLW5hdi1idG5zXCIgfSk7IC8vIFx1MjE5MCBhZGQgY2xhc3NcclxuXHJcbiAgICBjb25zdCBwcmV2QnRuID0gYnRucy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzcGFjZWQtbmF2LWJ0blwiIH0pO1xyXG4gICAgc2V0SWNvbihwcmV2QnRuLCBcImNoZXZyb24tbGVmdFwiKTtcclxuICAgIHByZXZCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIG9uUHJldik7XHJcblxyXG4gICAgY29uc3QgbmV4dEJ0biA9IGJ0bnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic3BhY2VkLW5hdi1idG5cIiB9KTtcclxuICAgIHNldEljb24obmV4dEJ0biwgXCJjaGV2cm9uLXJpZ2h0XCIpO1xyXG4gICAgbmV4dEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgb25OZXh0KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYWRkU3RhdChjb250YWluZXI6IEhUTUxFbGVtZW50LCBsYWJlbDogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zdCByb3cgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1zdGF0LXJvd1wiIH0pO1xyXG4gICAgcm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiBsYWJlbCwgY2xzOiBcInNwYWNlZC1zdGF0LWxhYmVsXCIgfSk7XHJcbiAgICByb3cuY3JlYXRlU3Bhbih7IHRleHQ6IHZhbHVlLCBjbHM6IFwic3BhY2VkLXN0YXQtdmFsdWVcIiB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcm9sbGluZ0F2ZXJhZ2UoZGF0YTogeyB2YWx1ZTogbnVtYmVyIH1bXSwgd2luZG93ID0gNyk6IG51bWJlcltdIHtcclxuICAgIHJldHVybiBkYXRhLm1hcCgoXywgaSkgPT4ge1xyXG4gICAgICBjb25zdCBzbGljZSA9IGRhdGEuc2xpY2UoTWF0aC5tYXgoMCwgaSAtICh3aW5kb3cgLSAxKSksIGkgKyAxKTtcclxuICAgICAgcmV0dXJuIHNsaWNlLnJlZHVjZSgocywgZCkgPT4gcyArIGQudmFsdWUsIDApIC8gc2xpY2UubGVuZ3RoO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgRGF0YSBidWlsZGVycyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICBwcml2YXRlIGJ1aWxkUHJhY3RpY2VkQ291bnRzKGV2ZW50czogeyB0aW1lc3RhbXA6IHN0cmluZyB9W10pOiBNYXA8c3RyaW5nLCBudW1iZXI+IHtcclxuICAgIGNvbnN0IGNvdW50cyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcbiAgICBmb3IgKGNvbnN0IGUgb2YgZXZlbnRzKSB7XHJcbiAgICAgIGNvbnN0IGQgPSBlLnRpbWVzdGFtcC5zbGljZSgwLCAxMCk7XHJcbiAgICAgIGNvdW50cy5zZXQoZCwgKGNvdW50cy5nZXQoZCkgPz8gMCkgKyAxKTtcclxuICAgIH1cclxuICAgIHJldHVybiBjb3VudHM7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGJ1aWxkRGFpbHlSZXZpZXdEYXRhKGhpc3Rvcnk6IHsgdGltZXN0YW1wOiBzdHJpbmcgfVtdKTogeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfVtdIHtcclxuICAgIHJldHVybiB0aGlzLmJ1aWxkRGFpbHlEYXRhKGhpc3RvcnksICgpID0+IDEpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBidWlsZEZvcmVjYXN0RGF0YShcclxuICAgIGFjdGl2ZU5vdGVzOiB7IGxhc3RSZXZpZXdlZE9uOiBzdHJpbmc7IGludGVydmFsOiBudW1iZXIgfVtdLFxyXG4gICAgdG9kYXlTdHI6IHN0cmluZyxcclxuICAgIGRheXMgPSA3MzAsXHJcbiAgKTogeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfVtdIHtcclxuICAgIGNvbnN0IGR1ZUJ5RGF0ZSA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcbiAgICBmb3IgKGNvbnN0IG5vdGUgb2YgYWN0aXZlTm90ZXMpIHtcclxuICAgICAgY29uc3QgZHVlRGF0ZSA9IG5ldyBEYXRlKG5vdGUubGFzdFJldmlld2VkT24pO1xyXG4gICAgICBkdWVEYXRlLnNldERhdGUoZHVlRGF0ZS5nZXREYXRlKCkgKyBub3RlLmludGVydmFsKTtcclxuICAgICAgY29uc3QgZHVlRGF0ZVN0ciA9IGR1ZURhdGUudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XHJcbiAgICAgIGNvbnN0IGVmZmVjdGl2ZURhdGUgPSBkdWVEYXRlU3RyIDwgdG9kYXlTdHIgPyB0b2RheVN0ciA6IGR1ZURhdGVTdHI7XHJcbiAgICAgIGR1ZUJ5RGF0ZS5zZXQoZWZmZWN0aXZlRGF0ZSwgKGR1ZUJ5RGF0ZS5nZXQoZWZmZWN0aXZlRGF0ZSkgPz8gMCkgKyAxKTtcclxuICAgIH1cclxuICAgIGNvbnN0IHJlc3VsdDogeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfVtdID0gW107XHJcbiAgICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKHRvZGF5U3RyKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF5czsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGN1ciA9IG5ldyBEYXRlKHN0YXJ0KTtcclxuICAgICAgY3VyLnNldERhdGUoY3VyLmdldERhdGUoKSArIGkpO1xyXG4gICAgICBjb25zdCBkID0gY3VyLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xyXG4gICAgICByZXN1bHQucHVzaCh7IGRhdGU6IGQsIHZhbHVlOiBkdWVCeURhdGUuZ2V0KGQpID8/IDAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBidWlsZERhaWx5RGF0YTxUIGV4dGVuZHMgeyB0aW1lc3RhbXA6IHN0cmluZyB9PihcclxuICAgIGVudHJpZXM6IFRbXSxcclxuICAgIGdldFZhbHVlOiAoZW50cnk6IFQpID0+IG51bWJlcixcclxuICAgIG92ZXJ3cml0ZSA9IGZhbHNlLFxyXG4gICk6IHsgZGF0ZTogc3RyaW5nOyB2YWx1ZTogbnVtYmVyIH1bXSB7XHJcbiAgICBjb25zdCBieURheSA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcbiAgICBmb3IgKGNvbnN0IGUgb2YgZW50cmllcykge1xyXG4gICAgICBjb25zdCBkID0gZS50aW1lc3RhbXAuc2xpY2UoMCwgMTApO1xyXG4gICAgICBpZiAob3ZlcndyaXRlKSB7XHJcbiAgICAgICAgYnlEYXkuc2V0KGQsIGdldFZhbHVlKGUpKTsgLy8ga2VlcCBsYXN0IHZhbHVlIGZvciB0aGUgZGF5XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgYnlEYXkuc2V0KGQsIChieURheS5nZXQoZCkgPz8gMCkgKyBnZXRWYWx1ZShlKSk7IC8vIGFjY3VtdWxhdGVcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGJ5RGF5LnNpemUgPT09IDApIHJldHVybiBbXTtcclxuICAgIGNvbnN0IHRvZGF5U3RyID0gdG9kYXkoKTtcclxuICAgIGNvbnN0IHN0YXJ0ID0gWy4uLmJ5RGF5LmtleXMoKV0uc29ydCgpWzBdO1xyXG4gICAgY29uc3QgcmVzdWx0OiB7IGRhdGU6IHN0cmluZzsgdmFsdWU6IG51bWJlciB9W10gPSBbXTtcclxuICAgIGNvbnN0IGN1ciA9IG5ldyBEYXRlKHN0YXJ0KTtcclxuICAgIGNvbnN0IGVuZCA9IG5ldyBEYXRlKHRvZGF5U3RyKTtcclxuICAgIHdoaWxlIChjdXIgPD0gZW5kKSB7XHJcbiAgICAgIGNvbnN0IGQgPSBjdXIudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XHJcbiAgICAgIHJlc3VsdC5wdXNoKHsgZGF0ZTogZCwgdmFsdWU6IGJ5RGF5LmdldChkKSA/PyAwIH0pO1xyXG4gICAgICBjdXIuc2V0RGF0ZShjdXIuZ2V0RGF0ZSgpICsgMSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG4gIH1cclxuICAvLyBcdTI1MDBcdTI1MDAgQ2hhcnQ6IExpbmUgdHJlbmQgKFJldmlld3MgJiBEdWUpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gIHByaXZhdGUgcmVuZGVyQmFyVHJlbmRDaGFydChcclxuICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcbiAgICBhbGxEYXRhOiB7IGRhdGU6IHN0cmluZzsgdmFsdWU6IG51bWJlciB9W10sXHJcbiAgICBwZXJpb2Q6IENoYXJ0UGVyaW9kLFxyXG4gICAgb25QZXJpb2RDaGFuZ2U6IChwOiBDaGFydFBlcmlvZCkgPT4gdm9pZCxcclxuICApOiB2b2lkIHtcclxuICAgIGNvbnN0IHNlbEVsID0gdGhpcy5jcmVhdGVQZXJpb2RTZWxlY3QoY29udGFpbmVyLCBwZXJpb2QsIG9uUGVyaW9kQ2hhbmdlKTtcclxuICAgIGNvbnN0IGRheXMgPSBQRVJJT0RfREFZU1twZXJpb2RdO1xyXG5cclxuICAgIGxldCBkYXRhOiB7IGRhdGU6IHN0cmluZzsgdmFsdWU6IG51bWJlciB9W107XHJcbiAgICBpZiAoZGF5cyA9PT0gSW5maW5pdHkpIHtcclxuICAgICAgZGF0YSA9IGFsbERhdGE7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBCdWlsZCBhIGZ1bGwgd2luZG93IG9mIGBkYXlzYCBkYXlzIGVuZGluZyB0b2RheSwgZmlsbGluZyBnYXBzIHdpdGggMFxyXG4gICAgICBjb25zdCBieURhdGUgPSBuZXcgTWFwKGFsbERhdGEubWFwKChkKSA9PiBbZC5kYXRlLCBkLnZhbHVlXSkpO1xyXG4gICAgICBkYXRhID0gW107XHJcbiAgICAgIGNvbnN0IGVuZCA9IG5ldyBEYXRlKHRvZGF5KCkpO1xyXG4gICAgICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKGVuZCk7XHJcbiAgICAgIHN0YXJ0LnNldERhdGUoc3RhcnQuZ2V0RGF0ZSgpIC0gZGF5cyArIDEpO1xyXG4gICAgICBjb25zdCBjdXIgPSBuZXcgRGF0ZShzdGFydCk7XHJcbiAgICAgIHdoaWxlIChjdXIgPD0gZW5kKSB7XHJcbiAgICAgICAgY29uc3QgZCA9IGN1ci50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcclxuICAgICAgICBkYXRhLnB1c2goeyBkYXRlOiBkLCB2YWx1ZTogYnlEYXRlLmdldChkKSA/PyAwIH0pO1xyXG4gICAgICAgIGN1ci5zZXREYXRlKGN1ci5nZXREYXRlKCkgKyAxKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChkYXRhLmxlbmd0aCA8IDIpIHtcclxuICAgICAgY29udGFpbmVyLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm90IGVub3VnaCBkYXRhIGZvciB0aGlzIHBlcmlvZC5cIiwgY2xzOiBcInNwYWNlZC1tdXRlZFwiIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc2hvd0JhcnMgPSBwZXJpb2QgPT09IFwiMVdcIiB8fCBwZXJpb2QgPT09IFwiMldcIiB8fCBwZXJpb2QgPT09IFwiMU1cIjtcclxuICAgIGNvbnN0IHsgc3ZnLCBjaGFydEgsIHRvdGFsSCwgdG90YWxXLCB5U2NhbGUgfSA9IHRoaXMuYnVpbGRDaGFydFNjYWZmb2xkKGNvbnRhaW5lciwgZGF0YSwgc2VsRWwpO1xyXG5cclxuICAgIGlmIChzaG93QmFycykge1xyXG4gICAgICB0aGlzLnJlbmRlckJhckNvbnRlbnQoc3ZnLCBkYXRhLCBwZXJpb2QsIGNoYXJ0SCwgdG90YWxILCB0b3RhbFcsIHlTY2FsZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnJlbmRlckxpbmVDb250ZW50KHN2ZywgZGF0YSwgcGVyaW9kLCBjaGFydEgsIHRvdGFsSCwgdG90YWxXLCB5U2NhbGUpO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBcdTI1MDBcdTI1MDAgQ2hhcnQ6IEZvcmVjYXN0IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gIHByaXZhdGUgcmVuZGVyRm9yZWNhc3RDaGFydChcclxuICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcbiAgICBhbGxEYXRhOiB7IGRhdGU6IHN0cmluZzsgdmFsdWU6IG51bWJlciB9W10sXHJcbiAgICBwZXJpb2Q6IENoYXJ0UGVyaW9kLFxyXG4gICAgb25QZXJpb2RDaGFuZ2U6IChwOiBDaGFydFBlcmlvZCkgPT4gdm9pZCxcclxuICApOiB2b2lkIHtcclxuICAgIGNvbnN0IHNob3dCYXJzID0gcGVyaW9kID09PSBcIjFXXCIgfHwgcGVyaW9kID09PSBcIjJXXCIgfHwgcGVyaW9kID09PSBcIjFNXCI7XHJcbiAgICBjb25zdCBzZWxFbCA9IHRoaXMuY3JlYXRlUGVyaW9kU2VsZWN0KGNvbnRhaW5lciwgcGVyaW9kLCBvblBlcmlvZENoYW5nZSk7XHJcbiAgICBjb25zdCBkYXlzID0gUEVSSU9EX0RBWVNbcGVyaW9kXTtcclxuICAgIGNvbnN0IGRhdGEgPSBkYXlzID09PSBJbmZpbml0eSA/IGFsbERhdGEgOiBhbGxEYXRhLnNsaWNlKDAsIGRheXMpO1xyXG5cclxuICAgIGlmIChkYXRhLmxlbmd0aCA8IDEpIHtcclxuICAgICAgY29udGFpbmVyLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gYWN0aXZlIG5vdGVzLlwiLCBjbHM6IFwic3BhY2VkLW11dGVkXCIgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7IHN2ZywgY2hhcnRILCB0b3RhbEgsIHRvdGFsVywgeVNjYWxlIH0gPSB0aGlzLmJ1aWxkQ2hhcnRTY2FmZm9sZChjb250YWluZXIsIGRhdGEsIHNlbEVsKTtcclxuXHJcbiAgICBpZiAoc2hvd0JhcnMpIHtcclxuICAgICAgdGhpcy5yZW5kZXJCYXJDb250ZW50KHN2ZywgZGF0YSwgcGVyaW9kLCBjaGFydEgsIHRvdGFsSCwgdG90YWxXLCB5U2NhbGUsIHRvZGF5KCkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5yZW5kZXJMaW5lQ29udGVudChzdmcsIGRhdGEsIHBlcmlvZCwgY2hhcnRILCB0b3RhbEgsIHRvdGFsVywgeVNjYWxlKTtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gXHUyNTAwXHUyNTAwIENoYXJ0OiBNb250aCBDYWxlbmRhciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICBwcml2YXRlIHJlbmRlck1vbnRoQ2FsZW5kYXIoXHJcbiAgICBjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG4gICAgeWVhcjogbnVtYmVyLFxyXG4gICAgbW9udGg6IG51bWJlcixcclxuICAgIHByYWN0aWNlZENvdW50czogTWFwPHN0cmluZywgbnVtYmVyPixcclxuICAgIHRvZGF5U3RyOiBzdHJpbmcsXHJcbiAgICB1cGNvbWluZ0R1ZTogTWFwPHN0cmluZywgbnVtYmVyPixcclxuICApOiB2b2lkIHtcclxuICAgIGNvbnN0IGdyaWQgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNlLW1vbnRoLWdyaWRcIiB9KTtcclxuICAgIGZvciAoY29uc3QgZCBvZiBbXCJNb1wiLCBcIlR1XCIsIFwiV2VcIiwgXCJUaFwiLCBcIkZyXCIsIFwiU2FcIiwgXCJTdVwiXSkge1xyXG4gICAgICBncmlkLmNyZWF0ZURpdih7IHRleHQ6IGQsIGNsczogXCJzZS1tb250aC1oZWFkZXJcIiB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaXJzdERvdyA9IChuZXcgRGF0ZSh5ZWFyLCBtb250aCwgMSkuZ2V0RGF5KCkgKyA2KSAlIDc7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZpcnN0RG93OyBpKyspIHtcclxuICAgICAgZ3JpZC5jcmVhdGVEaXYoeyBjbHM6IFwic2UtbW9udGgtY2VsbCBzZS1tb250aC1lbXB0eVwiIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGRheXNJbk1vbnRoID0gbmV3IERhdGUoeWVhciwgbW9udGggKyAxLCAwKS5nZXREYXRlKCk7XHJcbiAgICBjb25zdCBtYXhEdWUgPSBNYXRoLm1heCguLi5BcnJheS5mcm9tKHVwY29taW5nRHVlLnZhbHVlcygpKSwgMSk7XHJcbiAgICBmb3IgKGxldCBkID0gMTsgZCA8PSBkYXlzSW5Nb250aDsgZCsrKSB7XHJcbiAgICAgIGNvbnN0IGRhdGVTdHIgPSBgJHt5ZWFyfS0ke1N0cmluZyhtb250aCArIDEpLnBhZFN0YXJ0KDIsIFwiMFwiKX0tJHtTdHJpbmcoZCkucGFkU3RhcnQoMiwgXCIwXCIpfWA7XHJcbiAgICAgIGNvbnN0IGR1ZUNvdW50ID0gdXBjb21pbmdEdWUuZ2V0KGRhdGVTdHIpID8/IDA7XHJcbiAgICAgIGNvbnN0IGlzRnV0dXJlID0gZGF0ZVN0ciA+IHRvZGF5U3RyO1xyXG4gICAgICBjb25zdCByZXZpZXdDb3VudCA9IHByYWN0aWNlZENvdW50cy5nZXQoZGF0ZVN0cikgPz8gMDtcclxuICAgICAgY29uc3QgY2xzID0gW1xyXG4gICAgICAgIFwic2UtbW9udGgtY2VsbFwiLFxyXG4gICAgICAgIHJldmlld0NvdW50ID4gMCA/IFwic2UtbW9udGgtcHJhY3RpY2VkXCIgOiBcIlwiLFxyXG4gICAgICAgIGlzRnV0dXJlICYmIGR1ZUNvdW50ID4gMCA/IFwic2UtbW9udGgtdXBjb21pbmdcIiA6IFwiXCIsXHJcbiAgICAgICAgZGF0ZVN0ciA9PT0gdG9kYXlTdHIgPyBcInNlLW1vbnRoLXRvZGF5XCIgOiBcIlwiLFxyXG4gICAgICBdXHJcbiAgICAgICAgLmZpbHRlcihCb29sZWFuKVxyXG4gICAgICAgIC5qb2luKFwiIFwiKTtcclxuICAgICAgY29uc3QgY2VsbCA9IGdyaWQuY3JlYXRlRGl2KHsgY2xzIH0pO1xyXG4gICAgICBpZiAoaXNGdXR1cmUgJiYgZHVlQ291bnQgPiAwKSB7XHJcbiAgICAgICAgY29uc3QgcGN0ID0gTWF0aC5yb3VuZCgxMCArIChkdWVDb3VudCAvIG1heER1ZSkgKiA2MCk7IC8vIDEwJSBcdTIxOTIgOTAlXHJcbiAgICAgICAgY2VsbC5zdHlsZS5iYWNrZ3JvdW5kID0gYGNvbG9yLW1peChpbiBzcmdiLCB2YXIoLS1pbnRlcmFjdGl2ZS1hY2NlbnQpICR7cGN0fSUsIHRyYW5zcGFyZW50KWA7XHJcbiAgICAgIH1cclxuICAgICAgY2VsbC5jcmVhdGVTcGFuKHsgdGV4dDogU3RyaW5nKGQpLCBjbHM6IFwic2UtbW9udGgtZGF5LW51bVwiIH0pO1xyXG4gICAgICBpZiAocmV2aWV3Q291bnQgPiAwKSB7XHJcbiAgICAgICAgY2VsbC5kYXRhc2V0LnRvb2x0aXAgPSBgJHtyZXZpZXdDb3VudH0gcmV2aWV3JHtyZXZpZXdDb3VudCAhPT0gMSA/IFwic1wiIDogXCJcIn1gO1xyXG4gICAgICB9IGVsc2UgaWYgKGlzRnV0dXJlICYmIGR1ZUNvdW50ID4gMCkge1xyXG4gICAgICAgIGNlbGwuZGF0YXNldC50b29sdGlwID0gYCR7ZHVlQ291bnR9IGR1ZWA7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlUGVyaW9kU2VsZWN0KFxyXG4gICAgY29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuICAgIHBlcmlvZDogQ2hhcnRQZXJpb2QsXHJcbiAgICBvblBlcmlvZENoYW5nZTogKHA6IENoYXJ0UGVyaW9kKSA9PiB2b2lkLFxyXG4gICk6IEhUTUxFbGVtZW50IHtcclxuICAgIGNvbnN0IHdyYXBwZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1wZXJpb2Qtd3JhcHBlclwiIH0pO1xyXG4gICAgY29uc3QgYnRuID0gd3JhcHBlci5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLXBlcmlvZC10cmlnZ2VyXCIgfSk7XHJcbiAgICBjb25zdCBsYWJlbEVsID0gYnRuLmNyZWF0ZVNwYW4oeyB0ZXh0OiBQRVJJT0RfTEFCRUxTW3BlcmlvZF0sIGNsczogXCJzcGFjZWQtZGVjay1sYWJlbFwiIH0pO1xyXG5cclxuICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHtcclxuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgY29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcbiAgICAgIGZvciAoY29uc3QgcCBvZiBDSEFSVF9QRVJJT0RTKSB7XHJcbiAgICAgICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcbiAgICAgICAgICBpdGVtLnNldFRpdGxlKFBFUklPRF9MQUJFTFNbcF0pO1xyXG4gICAgICAgICAgaXRlbS5zZXRDaGVja2VkKHAgPT09IHBlcmlvZCk7XHJcbiAgICAgICAgICBpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG4gICAgICAgICAgICBsYWJlbEVsLnRleHRDb250ZW50ID0gUEVSSU9EX0xBQkVMU1twXTtcclxuICAgICAgICAgICAgb25QZXJpb2RDaGFuZ2UocCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgICBtZW51LnNob3dBdE1vdXNlRXZlbnQoZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gd3JhcHBlcjtcclxuICB9XHJcbiAgLy8gXHUyNTAwXHUyNTAwIENoYXJ0OiBZZWFyIEhlYXRtYXAgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgcHJpdmF0ZSByZW5kZXJZZWFySGVhdG1hcChcclxuICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcbiAgICB5ZWFyOiBudW1iZXIsXHJcbiAgICBwcmFjdGljZWREYXlzOiBNYXA8c3RyaW5nLCBudW1iZXI+LFxyXG4gICAgdG9kYXlTdHI6IHN0cmluZyxcclxuICApOiB2b2lkIHtcclxuICAgIGNvbnN0IE1PTlRIUyA9IFtcIkphblwiLCBcIkZlYlwiLCBcIk1hclwiLCBcIkFwclwiLCBcIk1heVwiLCBcIkp1blwiLCBcIkp1bFwiLCBcIkF1Z1wiLCBcIlNlcFwiLCBcIk9jdFwiLCBcIk5vdlwiLCBcIkRlY1wiXTtcclxuXHJcbiAgICBjb25zdCB3cmFwcGVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzZS15ZWFyLWhlYXRtYXAtdlwiIH0pO1xyXG5cclxuICAgIC8vIERheS1vZi13ZWVrIGhlYWRlciByb3dcclxuICAgIGNvbnN0IGhlYWRlclJvdyA9IHdyYXBwZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNlLWhlYXRtYXAtd2Vlay1yb3dcIiB9KTtcclxuICAgIGhlYWRlclJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic2UtaGVhdG1hcC1tb250aC1jb2xcIiB9KTsgLy8gZW1wdHkgc3BhY2VyXHJcbiAgICBmb3IgKGNvbnN0IGggb2YgW1wiTW9cIiwgXCJUdVwiLCBcIldlXCIsIFwiVGhcIiwgXCJGclwiLCBcIlNhXCIsIFwiU3VcIl0pIHtcclxuICAgICAgaGVhZGVyUm93LmNyZWF0ZURpdih7IHRleHQ6IGgsIGNsczogXCJzZS1oZWF0bWFwLWRvdy1oZWFkZXJcIiB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBCdWlsZCBzdGFydC9lbmQgKHNhbWUgbG9naWMgYXMgYmVmb3JlKVxyXG4gICAgY29uc3QgamFuMSA9IG5ldyBEYXRlKHllYXIsIDAsIDEpO1xyXG4gICAgY29uc3Qgc3RhcnRPZmZzZXQgPSAoamFuMS5nZXREYXkoKSArIDYpICUgNztcclxuICAgIGNvbnN0IHN0YXJ0ID0gbmV3IERhdGUoamFuMSk7XHJcbiAgICBzdGFydC5zZXREYXRlKHN0YXJ0LmdldERhdGUoKSAtIHN0YXJ0T2Zmc2V0KTtcclxuXHJcbiAgICBjb25zdCBkZWMzMSA9IG5ldyBEYXRlKHllYXIsIDExLCAzMSk7XHJcbiAgICBjb25zdCBlbmRPZmZzZXQgPSAoZGVjMzEuZ2V0RGF5KCkgKyA2KSAlIDc7XHJcbiAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZShkZWMzMSk7XHJcbiAgICBlbmQuc2V0RGF0ZShlbmQuZ2V0RGF0ZSgpICsgKDYgLSBlbmRPZmZzZXQpKTtcclxuXHJcbiAgICBjb25zdCBjdXIgPSBuZXcgRGF0ZShzdGFydCk7XHJcbiAgICB3aGlsZSAoY3VyIDw9IGVuZCkge1xyXG4gICAgICBjb25zdCB3ZWVrUm93ID0gd3JhcHBlci5jcmVhdGVEaXYoeyBjbHM6IFwic2UtaGVhdG1hcC13ZWVrLXJvd1wiIH0pO1xyXG5cclxuICAgICAgLy8gTW9udGggbGFiZWw6IHNob3cgaWYgYW55IGRheSBpbiB0aGlzIHdlZWsgaXMgdGhlIDFzdCBvZiBhIG1vbnRoIGluIGB5ZWFyYFxyXG4gICAgICBsZXQgbW9udGhMYWJlbCA9IFwiXCI7XHJcbiAgICAgIGZvciAobGV0IGQgPSAwOyBkIDwgNzsgZCsrKSB7XHJcbiAgICAgICAgY29uc3QgY2hlY2sgPSBuZXcgRGF0ZShjdXIpO1xyXG4gICAgICAgIGNoZWNrLnNldERhdGUoY2hlY2suZ2V0RGF0ZSgpICsgZCk7XHJcbiAgICAgICAgaWYgKGNoZWNrLmdldERhdGUoKSA9PT0gMSAmJiBjaGVjay5nZXRGdWxsWWVhcigpID09PSB5ZWFyKSB7XHJcbiAgICAgICAgICBtb250aExhYmVsID0gTU9OVEhTW2NoZWNrLmdldE1vbnRoKCldO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHdlZWtSb3cuY3JlYXRlRGl2KHsgdGV4dDogbW9udGhMYWJlbCwgY2xzOiBcInNlLWhlYXRtYXAtbW9udGgtY29sXCIgfSk7XHJcblxyXG4gICAgICAvLyA3IGRheSBjZWxsc1xyXG4gICAgICBmb3IgKGxldCBkID0gMDsgZCA8IDc7IGQrKykge1xyXG4gICAgICAgIGNvbnN0IGRhdGVTdHIgPSBjdXIudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XHJcbiAgICAgICAgY29uc3QgaW5ZZWFyID0gY3VyLmdldEZ1bGxZZWFyKCkgPT09IHllYXI7XHJcbiAgICAgICAgY29uc3QgcmMgPSBwcmFjdGljZWREYXlzLmdldChkYXRlU3RyKSA/PyAwO1xyXG4gICAgICAgIGNvbnN0IGNscyA9IFtcclxuICAgICAgICAgIFwic2UtaGVhdG1hcC1jZWxsXCIsXHJcbiAgICAgICAgICAhaW5ZZWFyID8gXCJzZS1oZWF0bWFwLW91dFwiIDogcmMgPiAwID8gXCJzZS1oZWF0bWFwLXByYWN0aWNlZFwiIDogXCJcIixcclxuICAgICAgICAgIGRhdGVTdHIgPT09IHRvZGF5U3RyID8gXCJzZS1oZWF0bWFwLXRvZGF5XCIgOiBcIlwiLFxyXG4gICAgICAgIF1cclxuICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbilcclxuICAgICAgICAgIC5qb2luKFwiIFwiKTtcclxuICAgICAgICBjb25zdCBjZWxsID0gd2Vla1Jvdy5jcmVhdGVEaXYoeyBjbHMgfSk7XHJcbiAgICAgICAgaWYgKHJjID4gMCkgY2VsbC5zZXRBdHRyaWJ1dGUoXCJ0aXRsZVwiLCBgJHtyY30gcmV2aWV3JHtyYyAhPT0gMSA/IFwic1wiIDogXCJcIn1gKTtcclxuICAgICAgICBjdXIuc2V0RGF0ZShjdXIuZ2V0RGF0ZSgpICsgMSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIG9uQ2xvc2UoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0aGlzLnJlc2l6ZU9ic2VydmVyPy5kaXNjb25uZWN0KCk7XHJcbiAgICB0aGlzLnJlc2l6ZU9ic2VydmVyID0gbnVsbDtcclxuICAgIGlmICh0aGlzLnJlc2l6ZURlYm91bmNlKSB7XHJcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJlc2l6ZURlYm91bmNlKTtcclxuICAgICAgdGhpcy5yZXNpemVEZWJvdW5jZSA9IG51bGw7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgfVxyXG59XHJcbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBhc2NlbmRpbmcoYSwgYikge1xuICByZXR1cm4gYSA9PSBudWxsIHx8IGIgPT0gbnVsbCA/IE5hTiA6IGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiBhID49IGIgPyAwIDogTmFOO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRlc2NlbmRpbmcoYSwgYikge1xuICByZXR1cm4gYSA9PSBudWxsIHx8IGIgPT0gbnVsbCA/IE5hTlxuICAgIDogYiA8IGEgPyAtMVxuICAgIDogYiA+IGEgPyAxXG4gICAgOiBiID49IGEgPyAwXG4gICAgOiBOYU47XG59XG4iLCAiaW1wb3J0IGFzY2VuZGluZyBmcm9tIFwiLi9hc2NlbmRpbmcuanNcIjtcbmltcG9ydCBkZXNjZW5kaW5nIGZyb20gXCIuL2Rlc2NlbmRpbmcuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYmlzZWN0b3IoZikge1xuICBsZXQgY29tcGFyZTEsIGNvbXBhcmUyLCBkZWx0YTtcblxuICAvLyBJZiBhbiBhY2Nlc3NvciBpcyBzcGVjaWZpZWQsIHByb21vdGUgaXQgdG8gYSBjb21wYXJhdG9yLiBJbiB0aGlzIGNhc2Ugd2VcbiAgLy8gY2FuIHRlc3Qgd2hldGhlciB0aGUgc2VhcmNoIHZhbHVlIGlzIChzZWxmLSkgY29tcGFyYWJsZS4gV2UgY2FuXHUyMDE5dCBkbyB0aGlzXG4gIC8vIGZvciBhIGNvbXBhcmF0b3IgKGV4Y2VwdCBmb3Igc3BlY2lmaWMsIGtub3duIGNvbXBhcmF0b3JzKSBiZWNhdXNlIHdlIGNhblx1MjAxOXRcbiAgLy8gdGVsbCBpZiB0aGUgY29tcGFyYXRvciBpcyBzeW1tZXRyaWMsIGFuZCBhbiBhc3ltbWV0cmljIGNvbXBhcmF0b3IgY2FuXHUyMDE5dCBiZVxuICAvLyB1c2VkIHRvIHRlc3Qgd2hldGhlciBhIHNpbmdsZSB2YWx1ZSBpcyBjb21wYXJhYmxlLlxuICBpZiAoZi5sZW5ndGggIT09IDIpIHtcbiAgICBjb21wYXJlMSA9IGFzY2VuZGluZztcbiAgICBjb21wYXJlMiA9IChkLCB4KSA9PiBhc2NlbmRpbmcoZihkKSwgeCk7XG4gICAgZGVsdGEgPSAoZCwgeCkgPT4gZihkKSAtIHg7XG4gIH0gZWxzZSB7XG4gICAgY29tcGFyZTEgPSBmID09PSBhc2NlbmRpbmcgfHwgZiA9PT0gZGVzY2VuZGluZyA/IGYgOiB6ZXJvO1xuICAgIGNvbXBhcmUyID0gZjtcbiAgICBkZWx0YSA9IGY7XG4gIH1cblxuICBmdW5jdGlvbiBsZWZ0KGEsIHgsIGxvID0gMCwgaGkgPSBhLmxlbmd0aCkge1xuICAgIGlmIChsbyA8IGhpKSB7XG4gICAgICBpZiAoY29tcGFyZTEoeCwgeCkgIT09IDApIHJldHVybiBoaTtcbiAgICAgIGRvIHtcbiAgICAgICAgY29uc3QgbWlkID0gKGxvICsgaGkpID4+PiAxO1xuICAgICAgICBpZiAoY29tcGFyZTIoYVttaWRdLCB4KSA8IDApIGxvID0gbWlkICsgMTtcbiAgICAgICAgZWxzZSBoaSA9IG1pZDtcbiAgICAgIH0gd2hpbGUgKGxvIDwgaGkpO1xuICAgIH1cbiAgICByZXR1cm4gbG87XG4gIH1cblxuICBmdW5jdGlvbiByaWdodChhLCB4LCBsbyA9IDAsIGhpID0gYS5sZW5ndGgpIHtcbiAgICBpZiAobG8gPCBoaSkge1xuICAgICAgaWYgKGNvbXBhcmUxKHgsIHgpICE9PSAwKSByZXR1cm4gaGk7XG4gICAgICBkbyB7XG4gICAgICAgIGNvbnN0IG1pZCA9IChsbyArIGhpKSA+Pj4gMTtcbiAgICAgICAgaWYgKGNvbXBhcmUyKGFbbWlkXSwgeCkgPD0gMCkgbG8gPSBtaWQgKyAxO1xuICAgICAgICBlbHNlIGhpID0gbWlkO1xuICAgICAgfSB3aGlsZSAobG8gPCBoaSk7XG4gICAgfVxuICAgIHJldHVybiBsbztcbiAgfVxuXG4gIGZ1bmN0aW9uIGNlbnRlcihhLCB4LCBsbyA9IDAsIGhpID0gYS5sZW5ndGgpIHtcbiAgICBjb25zdCBpID0gbGVmdChhLCB4LCBsbywgaGkgLSAxKTtcbiAgICByZXR1cm4gaSA+IGxvICYmIGRlbHRhKGFbaSAtIDFdLCB4KSA+IC1kZWx0YShhW2ldLCB4KSA/IGkgLSAxIDogaTtcbiAgfVxuXG4gIHJldHVybiB7bGVmdCwgY2VudGVyLCByaWdodH07XG59XG5cbmZ1bmN0aW9uIHplcm8oKSB7XG4gIHJldHVybiAwO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG51bWJlcih4KSB7XG4gIHJldHVybiB4ID09PSBudWxsID8gTmFOIDogK3g7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogbnVtYmVycyh2YWx1ZXMsIHZhbHVlb2YpIHtcbiAgaWYgKHZhbHVlb2YgPT09IHVuZGVmaW5lZCkge1xuICAgIGZvciAobGV0IHZhbHVlIG9mIHZhbHVlcykge1xuICAgICAgaWYgKHZhbHVlICE9IG51bGwgJiYgKHZhbHVlID0gK3ZhbHVlKSA+PSB2YWx1ZSkge1xuICAgICAgICB5aWVsZCB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbGV0IGluZGV4ID0gLTE7XG4gICAgZm9yIChsZXQgdmFsdWUgb2YgdmFsdWVzKSB7XG4gICAgICBpZiAoKHZhbHVlID0gdmFsdWVvZih2YWx1ZSwgKytpbmRleCwgdmFsdWVzKSkgIT0gbnVsbCAmJiAodmFsdWUgPSArdmFsdWUpID49IHZhbHVlKSB7XG4gICAgICAgIHlpZWxkIHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCBhc2NlbmRpbmcgZnJvbSBcIi4vYXNjZW5kaW5nLmpzXCI7XG5pbXBvcnQgYmlzZWN0b3IgZnJvbSBcIi4vYmlzZWN0b3IuanNcIjtcbmltcG9ydCBudW1iZXIgZnJvbSBcIi4vbnVtYmVyLmpzXCI7XG5cbmNvbnN0IGFzY2VuZGluZ0Jpc2VjdCA9IGJpc2VjdG9yKGFzY2VuZGluZyk7XG5leHBvcnQgY29uc3QgYmlzZWN0UmlnaHQgPSBhc2NlbmRpbmdCaXNlY3QucmlnaHQ7XG5leHBvcnQgY29uc3QgYmlzZWN0TGVmdCA9IGFzY2VuZGluZ0Jpc2VjdC5sZWZ0O1xuZXhwb3J0IGNvbnN0IGJpc2VjdENlbnRlciA9IGJpc2VjdG9yKG51bWJlcikuY2VudGVyO1xuZXhwb3J0IGRlZmF1bHQgYmlzZWN0UmlnaHQ7XG4iLCAiZXhwb3J0IGNsYXNzIEludGVybk1hcCBleHRlbmRzIE1hcCB7XG4gIGNvbnN0cnVjdG9yKGVudHJpZXMsIGtleSA9IGtleW9mKSB7XG4gICAgc3VwZXIoKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7X2ludGVybjoge3ZhbHVlOiBuZXcgTWFwKCl9LCBfa2V5OiB7dmFsdWU6IGtleX19KTtcbiAgICBpZiAoZW50cmllcyAhPSBudWxsKSBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBlbnRyaWVzKSB0aGlzLnNldChrZXksIHZhbHVlKTtcbiAgfVxuICBnZXQoa2V5KSB7XG4gICAgcmV0dXJuIHN1cGVyLmdldChpbnRlcm5fZ2V0KHRoaXMsIGtleSkpO1xuICB9XG4gIGhhcyhrZXkpIHtcbiAgICByZXR1cm4gc3VwZXIuaGFzKGludGVybl9nZXQodGhpcywga2V5KSk7XG4gIH1cbiAgc2V0KGtleSwgdmFsdWUpIHtcbiAgICByZXR1cm4gc3VwZXIuc2V0KGludGVybl9zZXQodGhpcywga2V5KSwgdmFsdWUpO1xuICB9XG4gIGRlbGV0ZShrZXkpIHtcbiAgICByZXR1cm4gc3VwZXIuZGVsZXRlKGludGVybl9kZWxldGUodGhpcywga2V5KSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEludGVyblNldCBleHRlbmRzIFNldCB7XG4gIGNvbnN0cnVjdG9yKHZhbHVlcywga2V5ID0ga2V5b2YpIHtcbiAgICBzdXBlcigpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHRoaXMsIHtfaW50ZXJuOiB7dmFsdWU6IG5ldyBNYXAoKX0sIF9rZXk6IHt2YWx1ZToga2V5fX0pO1xuICAgIGlmICh2YWx1ZXMgIT0gbnVsbCkgZm9yIChjb25zdCB2YWx1ZSBvZiB2YWx1ZXMpIHRoaXMuYWRkKHZhbHVlKTtcbiAgfVxuICBoYXModmFsdWUpIHtcbiAgICByZXR1cm4gc3VwZXIuaGFzKGludGVybl9nZXQodGhpcywgdmFsdWUpKTtcbiAgfVxuICBhZGQodmFsdWUpIHtcbiAgICByZXR1cm4gc3VwZXIuYWRkKGludGVybl9zZXQodGhpcywgdmFsdWUpKTtcbiAgfVxuICBkZWxldGUodmFsdWUpIHtcbiAgICByZXR1cm4gc3VwZXIuZGVsZXRlKGludGVybl9kZWxldGUodGhpcywgdmFsdWUpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnRlcm5fZ2V0KHtfaW50ZXJuLCBfa2V5fSwgdmFsdWUpIHtcbiAgY29uc3Qga2V5ID0gX2tleSh2YWx1ZSk7XG4gIHJldHVybiBfaW50ZXJuLmhhcyhrZXkpID8gX2ludGVybi5nZXQoa2V5KSA6IHZhbHVlO1xufVxuXG5mdW5jdGlvbiBpbnRlcm5fc2V0KHtfaW50ZXJuLCBfa2V5fSwgdmFsdWUpIHtcbiAgY29uc3Qga2V5ID0gX2tleSh2YWx1ZSk7XG4gIGlmIChfaW50ZXJuLmhhcyhrZXkpKSByZXR1cm4gX2ludGVybi5nZXQoa2V5KTtcbiAgX2ludGVybi5zZXQoa2V5LCB2YWx1ZSk7XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gaW50ZXJuX2RlbGV0ZSh7X2ludGVybiwgX2tleX0sIHZhbHVlKSB7XG4gIGNvbnN0IGtleSA9IF9rZXkodmFsdWUpO1xuICBpZiAoX2ludGVybi5oYXMoa2V5KSkge1xuICAgIHZhbHVlID0gX2ludGVybi5nZXQoa2V5KTtcbiAgICBfaW50ZXJuLmRlbGV0ZShrZXkpO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24ga2V5b2YodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiA/IHZhbHVlLnZhbHVlT2YoKSA6IHZhbHVlO1xufVxuIiwgImNvbnN0IGUxMCA9IE1hdGguc3FydCg1MCksXG4gICAgZTUgPSBNYXRoLnNxcnQoMTApLFxuICAgIGUyID0gTWF0aC5zcXJ0KDIpO1xuXG5mdW5jdGlvbiB0aWNrU3BlYyhzdGFydCwgc3RvcCwgY291bnQpIHtcbiAgY29uc3Qgc3RlcCA9IChzdG9wIC0gc3RhcnQpIC8gTWF0aC5tYXgoMCwgY291bnQpLFxuICAgICAgcG93ZXIgPSBNYXRoLmZsb29yKE1hdGgubG9nMTAoc3RlcCkpLFxuICAgICAgZXJyb3IgPSBzdGVwIC8gTWF0aC5wb3coMTAsIHBvd2VyKSxcbiAgICAgIGZhY3RvciA9IGVycm9yID49IGUxMCA/IDEwIDogZXJyb3IgPj0gZTUgPyA1IDogZXJyb3IgPj0gZTIgPyAyIDogMTtcbiAgbGV0IGkxLCBpMiwgaW5jO1xuICBpZiAocG93ZXIgPCAwKSB7XG4gICAgaW5jID0gTWF0aC5wb3coMTAsIC1wb3dlcikgLyBmYWN0b3I7XG4gICAgaTEgPSBNYXRoLnJvdW5kKHN0YXJ0ICogaW5jKTtcbiAgICBpMiA9IE1hdGgucm91bmQoc3RvcCAqIGluYyk7XG4gICAgaWYgKGkxIC8gaW5jIDwgc3RhcnQpICsraTE7XG4gICAgaWYgKGkyIC8gaW5jID4gc3RvcCkgLS1pMjtcbiAgICBpbmMgPSAtaW5jO1xuICB9IGVsc2Uge1xuICAgIGluYyA9IE1hdGgucG93KDEwLCBwb3dlcikgKiBmYWN0b3I7XG4gICAgaTEgPSBNYXRoLnJvdW5kKHN0YXJ0IC8gaW5jKTtcbiAgICBpMiA9IE1hdGgucm91bmQoc3RvcCAvIGluYyk7XG4gICAgaWYgKGkxICogaW5jIDwgc3RhcnQpICsraTE7XG4gICAgaWYgKGkyICogaW5jID4gc3RvcCkgLS1pMjtcbiAgfVxuICBpZiAoaTIgPCBpMSAmJiAwLjUgPD0gY291bnQgJiYgY291bnQgPCAyKSByZXR1cm4gdGlja1NwZWMoc3RhcnQsIHN0b3AsIGNvdW50ICogMik7XG4gIHJldHVybiBbaTEsIGkyLCBpbmNdO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB0aWNrcyhzdGFydCwgc3RvcCwgY291bnQpIHtcbiAgc3RvcCA9ICtzdG9wLCBzdGFydCA9ICtzdGFydCwgY291bnQgPSArY291bnQ7XG4gIGlmICghKGNvdW50ID4gMCkpIHJldHVybiBbXTtcbiAgaWYgKHN0YXJ0ID09PSBzdG9wKSByZXR1cm4gW3N0YXJ0XTtcbiAgY29uc3QgcmV2ZXJzZSA9IHN0b3AgPCBzdGFydCwgW2kxLCBpMiwgaW5jXSA9IHJldmVyc2UgPyB0aWNrU3BlYyhzdG9wLCBzdGFydCwgY291bnQpIDogdGlja1NwZWMoc3RhcnQsIHN0b3AsIGNvdW50KTtcbiAgaWYgKCEoaTIgPj0gaTEpKSByZXR1cm4gW107XG4gIGNvbnN0IG4gPSBpMiAtIGkxICsgMSwgdGlja3MgPSBuZXcgQXJyYXkobik7XG4gIGlmIChyZXZlcnNlKSB7XG4gICAgaWYgKGluYyA8IDApIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgKytpKSB0aWNrc1tpXSA9IChpMiAtIGkpIC8gLWluYztcbiAgICBlbHNlIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgKytpKSB0aWNrc1tpXSA9IChpMiAtIGkpICogaW5jO1xuICB9IGVsc2Uge1xuICAgIGlmIChpbmMgPCAwKSBmb3IgKGxldCBpID0gMDsgaSA8IG47ICsraSkgdGlja3NbaV0gPSAoaTEgKyBpKSAvIC1pbmM7XG4gICAgZWxzZSBmb3IgKGxldCBpID0gMDsgaSA8IG47ICsraSkgdGlja3NbaV0gPSAoaTEgKyBpKSAqIGluYztcbiAgfVxuICByZXR1cm4gdGlja3M7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0aWNrSW5jcmVtZW50KHN0YXJ0LCBzdG9wLCBjb3VudCkge1xuICBzdG9wID0gK3N0b3AsIHN0YXJ0ID0gK3N0YXJ0LCBjb3VudCA9ICtjb3VudDtcbiAgcmV0dXJuIHRpY2tTcGVjKHN0YXJ0LCBzdG9wLCBjb3VudClbMl07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0aWNrU3RlcChzdGFydCwgc3RvcCwgY291bnQpIHtcbiAgc3RvcCA9ICtzdG9wLCBzdGFydCA9ICtzdGFydCwgY291bnQgPSArY291bnQ7XG4gIGNvbnN0IHJldmVyc2UgPSBzdG9wIDwgc3RhcnQsIGluYyA9IHJldmVyc2UgPyB0aWNrSW5jcmVtZW50KHN0b3AsIHN0YXJ0LCBjb3VudCkgOiB0aWNrSW5jcmVtZW50KHN0YXJ0LCBzdG9wLCBjb3VudCk7XG4gIHJldHVybiAocmV2ZXJzZSA/IC0xIDogMSkgKiAoaW5jIDwgMCA/IDEgLyAtaW5jIDogaW5jKTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByYW5nZShzdGFydCwgc3RvcCwgc3RlcCkge1xuICBzdGFydCA9ICtzdGFydCwgc3RvcCA9ICtzdG9wLCBzdGVwID0gKG4gPSBhcmd1bWVudHMubGVuZ3RoKSA8IDIgPyAoc3RvcCA9IHN0YXJ0LCBzdGFydCA9IDAsIDEpIDogbiA8IDMgPyAxIDogK3N0ZXA7XG5cbiAgdmFyIGkgPSAtMSxcbiAgICAgIG4gPSBNYXRoLm1heCgwLCBNYXRoLmNlaWwoKHN0b3AgLSBzdGFydCkgLyBzdGVwKSkgfCAwLFxuICAgICAgcmFuZ2UgPSBuZXcgQXJyYXkobik7XG5cbiAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICByYW5nZVtpXSA9IHN0YXJ0ICsgaSAqIHN0ZXA7XG4gIH1cblxuICByZXR1cm4gcmFuZ2U7XG59XG4iLCAiZXhwb3J0IGZ1bmN0aW9uIGluaXRSYW5nZShkb21haW4sIHJhbmdlKSB7XG4gIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIGNhc2UgMDogYnJlYWs7XG4gICAgY2FzZSAxOiB0aGlzLnJhbmdlKGRvbWFpbik7IGJyZWFrO1xuICAgIGRlZmF1bHQ6IHRoaXMucmFuZ2UocmFuZ2UpLmRvbWFpbihkb21haW4pOyBicmVhaztcbiAgfVxuICByZXR1cm4gdGhpcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRJbnRlcnBvbGF0b3IoZG9tYWluLCBpbnRlcnBvbGF0b3IpIHtcbiAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgY2FzZSAwOiBicmVhaztcbiAgICBjYXNlIDE6IHtcbiAgICAgIGlmICh0eXBlb2YgZG9tYWluID09PSBcImZ1bmN0aW9uXCIpIHRoaXMuaW50ZXJwb2xhdG9yKGRvbWFpbik7XG4gICAgICBlbHNlIHRoaXMucmFuZ2UoZG9tYWluKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBkZWZhdWx0OiB7XG4gICAgICB0aGlzLmRvbWFpbihkb21haW4pO1xuICAgICAgaWYgKHR5cGVvZiBpbnRlcnBvbGF0b3IgPT09IFwiZnVuY3Rpb25cIikgdGhpcy5pbnRlcnBvbGF0b3IoaW50ZXJwb2xhdG9yKTtcbiAgICAgIGVsc2UgdGhpcy5yYW5nZShpbnRlcnBvbGF0b3IpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzO1xufVxuIiwgImltcG9ydCB7SW50ZXJuTWFwfSBmcm9tIFwiZDMtYXJyYXlcIjtcbmltcG9ydCB7aW5pdFJhbmdlfSBmcm9tIFwiLi9pbml0LmpzXCI7XG5cbmV4cG9ydCBjb25zdCBpbXBsaWNpdCA9IFN5bWJvbChcImltcGxpY2l0XCIpO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBvcmRpbmFsKCkge1xuICB2YXIgaW5kZXggPSBuZXcgSW50ZXJuTWFwKCksXG4gICAgICBkb21haW4gPSBbXSxcbiAgICAgIHJhbmdlID0gW10sXG4gICAgICB1bmtub3duID0gaW1wbGljaXQ7XG5cbiAgZnVuY3Rpb24gc2NhbGUoZCkge1xuICAgIGxldCBpID0gaW5kZXguZ2V0KGQpO1xuICAgIGlmIChpID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICh1bmtub3duICE9PSBpbXBsaWNpdCkgcmV0dXJuIHVua25vd247XG4gICAgICBpbmRleC5zZXQoZCwgaSA9IGRvbWFpbi5wdXNoKGQpIC0gMSk7XG4gICAgfVxuICAgIHJldHVybiByYW5nZVtpICUgcmFuZ2UubGVuZ3RoXTtcbiAgfVxuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkb21haW4uc2xpY2UoKTtcbiAgICBkb21haW4gPSBbXSwgaW5kZXggPSBuZXcgSW50ZXJuTWFwKCk7XG4gICAgZm9yIChjb25zdCB2YWx1ZSBvZiBfKSB7XG4gICAgICBpZiAoaW5kZXguaGFzKHZhbHVlKSkgY29udGludWU7XG4gICAgICBpbmRleC5zZXQodmFsdWUsIGRvbWFpbi5wdXNoKHZhbHVlKSAtIDEpO1xuICAgIH1cbiAgICByZXR1cm4gc2NhbGU7XG4gIH07XG5cbiAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocmFuZ2UgPSBBcnJheS5mcm9tKF8pLCBzY2FsZSkgOiByYW5nZS5zbGljZSgpO1xuICB9O1xuXG4gIHNjYWxlLnVua25vd24gPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAodW5rbm93biA9IF8sIHNjYWxlKSA6IHVua25vd247XG4gIH07XG5cbiAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBvcmRpbmFsKGRvbWFpbiwgcmFuZ2UpLnVua25vd24odW5rbm93bik7XG4gIH07XG5cbiAgaW5pdFJhbmdlLmFwcGx5KHNjYWxlLCBhcmd1bWVudHMpO1xuXG4gIHJldHVybiBzY2FsZTtcbn1cbiIsICJpbXBvcnQge3JhbmdlIGFzIHNlcXVlbmNlfSBmcm9tIFwiZDMtYXJyYXlcIjtcbmltcG9ydCB7aW5pdFJhbmdlfSBmcm9tIFwiLi9pbml0LmpzXCI7XG5pbXBvcnQgb3JkaW5hbCBmcm9tIFwiLi9vcmRpbmFsLmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGJhbmQoKSB7XG4gIHZhciBzY2FsZSA9IG9yZGluYWwoKS51bmtub3duKHVuZGVmaW5lZCksXG4gICAgICBkb21haW4gPSBzY2FsZS5kb21haW4sXG4gICAgICBvcmRpbmFsUmFuZ2UgPSBzY2FsZS5yYW5nZSxcbiAgICAgIHIwID0gMCxcbiAgICAgIHIxID0gMSxcbiAgICAgIHN0ZXAsXG4gICAgICBiYW5kd2lkdGgsXG4gICAgICByb3VuZCA9IGZhbHNlLFxuICAgICAgcGFkZGluZ0lubmVyID0gMCxcbiAgICAgIHBhZGRpbmdPdXRlciA9IDAsXG4gICAgICBhbGlnbiA9IDAuNTtcblxuICBkZWxldGUgc2NhbGUudW5rbm93bjtcblxuICBmdW5jdGlvbiByZXNjYWxlKCkge1xuICAgIHZhciBuID0gZG9tYWluKCkubGVuZ3RoLFxuICAgICAgICByZXZlcnNlID0gcjEgPCByMCxcbiAgICAgICAgc3RhcnQgPSByZXZlcnNlID8gcjEgOiByMCxcbiAgICAgICAgc3RvcCA9IHJldmVyc2UgPyByMCA6IHIxO1xuICAgIHN0ZXAgPSAoc3RvcCAtIHN0YXJ0KSAvIE1hdGgubWF4KDEsIG4gLSBwYWRkaW5nSW5uZXIgKyBwYWRkaW5nT3V0ZXIgKiAyKTtcbiAgICBpZiAocm91bmQpIHN0ZXAgPSBNYXRoLmZsb29yKHN0ZXApO1xuICAgIHN0YXJ0ICs9IChzdG9wIC0gc3RhcnQgLSBzdGVwICogKG4gLSBwYWRkaW5nSW5uZXIpKSAqIGFsaWduO1xuICAgIGJhbmR3aWR0aCA9IHN0ZXAgKiAoMSAtIHBhZGRpbmdJbm5lcik7XG4gICAgaWYgKHJvdW5kKSBzdGFydCA9IE1hdGgucm91bmQoc3RhcnQpLCBiYW5kd2lkdGggPSBNYXRoLnJvdW5kKGJhbmR3aWR0aCk7XG4gICAgdmFyIHZhbHVlcyA9IHNlcXVlbmNlKG4pLm1hcChmdW5jdGlvbihpKSB7IHJldHVybiBzdGFydCArIHN0ZXAgKiBpOyB9KTtcbiAgICByZXR1cm4gb3JkaW5hbFJhbmdlKHJldmVyc2UgPyB2YWx1ZXMucmV2ZXJzZSgpIDogdmFsdWVzKTtcbiAgfVxuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkb21haW4oXyksIHJlc2NhbGUoKSkgOiBkb21haW4oKTtcbiAgfTtcblxuICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChbcjAsIHIxXSA9IF8sIHIwID0gK3IwLCByMSA9ICtyMSwgcmVzY2FsZSgpKSA6IFtyMCwgcjFdO1xuICB9O1xuXG4gIHNjYWxlLnJhbmdlUm91bmQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIFtyMCwgcjFdID0gXywgcjAgPSArcjAsIHIxID0gK3IxLCByb3VuZCA9IHRydWUsIHJlc2NhbGUoKTtcbiAgfTtcblxuICBzY2FsZS5iYW5kd2lkdGggPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYmFuZHdpZHRoO1xuICB9O1xuXG4gIHNjYWxlLnN0ZXAgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc3RlcDtcbiAgfTtcblxuICBzY2FsZS5yb3VuZCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChyb3VuZCA9ICEhXywgcmVzY2FsZSgpKSA6IHJvdW5kO1xuICB9O1xuXG4gIHNjYWxlLnBhZGRpbmcgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocGFkZGluZ0lubmVyID0gTWF0aC5taW4oMSwgcGFkZGluZ091dGVyID0gK18pLCByZXNjYWxlKCkpIDogcGFkZGluZ0lubmVyO1xuICB9O1xuXG4gIHNjYWxlLnBhZGRpbmdJbm5lciA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChwYWRkaW5nSW5uZXIgPSBNYXRoLm1pbigxLCBfKSwgcmVzY2FsZSgpKSA6IHBhZGRpbmdJbm5lcjtcbiAgfTtcblxuICBzY2FsZS5wYWRkaW5nT3V0ZXIgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocGFkZGluZ091dGVyID0gK18sIHJlc2NhbGUoKSkgOiBwYWRkaW5nT3V0ZXI7XG4gIH07XG5cbiAgc2NhbGUuYWxpZ24gPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoYWxpZ24gPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBfKSksIHJlc2NhbGUoKSkgOiBhbGlnbjtcbiAgfTtcblxuICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGJhbmQoZG9tYWluKCksIFtyMCwgcjFdKVxuICAgICAgICAucm91bmQocm91bmQpXG4gICAgICAgIC5wYWRkaW5nSW5uZXIocGFkZGluZ0lubmVyKVxuICAgICAgICAucGFkZGluZ091dGVyKHBhZGRpbmdPdXRlcilcbiAgICAgICAgLmFsaWduKGFsaWduKTtcbiAgfTtcblxuICByZXR1cm4gaW5pdFJhbmdlLmFwcGx5KHJlc2NhbGUoKSwgYXJndW1lbnRzKTtcbn1cblxuZnVuY3Rpb24gcG9pbnRpc2goc2NhbGUpIHtcbiAgdmFyIGNvcHkgPSBzY2FsZS5jb3B5O1xuXG4gIHNjYWxlLnBhZGRpbmcgPSBzY2FsZS5wYWRkaW5nT3V0ZXI7XG4gIGRlbGV0ZSBzY2FsZS5wYWRkaW5nSW5uZXI7XG4gIGRlbGV0ZSBzY2FsZS5wYWRkaW5nT3V0ZXI7XG5cbiAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBwb2ludGlzaChjb3B5KCkpO1xuICB9O1xuXG4gIHJldHVybiBzY2FsZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBvaW50KCkge1xuICByZXR1cm4gcG9pbnRpc2goYmFuZC5hcHBseShudWxsLCBhcmd1bWVudHMpLnBhZGRpbmdJbm5lcigxKSk7XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29uc3RydWN0b3IsIGZhY3RvcnksIHByb3RvdHlwZSkge1xuICBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBmYWN0b3J5LnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgcHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY29uc3RydWN0b3I7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmQocGFyZW50LCBkZWZpbml0aW9uKSB7XG4gIHZhciBwcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHBhcmVudC5wcm90b3R5cGUpO1xuICBmb3IgKHZhciBrZXkgaW4gZGVmaW5pdGlvbikgcHJvdG90eXBlW2tleV0gPSBkZWZpbml0aW9uW2tleV07XG4gIHJldHVybiBwcm90b3R5cGU7XG59XG4iLCAiaW1wb3J0IGRlZmluZSwge2V4dGVuZH0gZnJvbSBcIi4vZGVmaW5lLmpzXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBDb2xvcigpIHt9XG5cbmV4cG9ydCB2YXIgZGFya2VyID0gMC43O1xuZXhwb3J0IHZhciBicmlnaHRlciA9IDEgLyBkYXJrZXI7XG5cbnZhciByZUkgPSBcIlxcXFxzKihbKy1dP1xcXFxkKylcXFxccypcIixcbiAgICByZU4gPSBcIlxcXFxzKihbKy1dPyg/OlxcXFxkKlxcXFwuKT9cXFxcZCsoPzpbZUVdWystXT9cXFxcZCspPylcXFxccypcIixcbiAgICByZVAgPSBcIlxcXFxzKihbKy1dPyg/OlxcXFxkKlxcXFwuKT9cXFxcZCsoPzpbZUVdWystXT9cXFxcZCspPyklXFxcXHMqXCIsXG4gICAgcmVIZXggPSAvXiMoWzAtOWEtZl17Myw4fSkkLyxcbiAgICByZVJnYkludGVnZXIgPSBuZXcgUmVnRXhwKGBecmdiXFxcXCgke3JlSX0sJHtyZUl9LCR7cmVJfVxcXFwpJGApLFxuICAgIHJlUmdiUGVyY2VudCA9IG5ldyBSZWdFeHAoYF5yZ2JcXFxcKCR7cmVQfSwke3JlUH0sJHtyZVB9XFxcXCkkYCksXG4gICAgcmVSZ2JhSW50ZWdlciA9IG5ldyBSZWdFeHAoYF5yZ2JhXFxcXCgke3JlSX0sJHtyZUl9LCR7cmVJfSwke3JlTn1cXFxcKSRgKSxcbiAgICByZVJnYmFQZXJjZW50ID0gbmV3IFJlZ0V4cChgXnJnYmFcXFxcKCR7cmVQfSwke3JlUH0sJHtyZVB9LCR7cmVOfVxcXFwpJGApLFxuICAgIHJlSHNsUGVyY2VudCA9IG5ldyBSZWdFeHAoYF5oc2xcXFxcKCR7cmVOfSwke3JlUH0sJHtyZVB9XFxcXCkkYCksXG4gICAgcmVIc2xhUGVyY2VudCA9IG5ldyBSZWdFeHAoYF5oc2xhXFxcXCgke3JlTn0sJHtyZVB9LCR7cmVQfSwke3JlTn1cXFxcKSRgKTtcblxudmFyIG5hbWVkID0ge1xuICBhbGljZWJsdWU6IDB4ZjBmOGZmLFxuICBhbnRpcXVld2hpdGU6IDB4ZmFlYmQ3LFxuICBhcXVhOiAweDAwZmZmZixcbiAgYXF1YW1hcmluZTogMHg3ZmZmZDQsXG4gIGF6dXJlOiAweGYwZmZmZixcbiAgYmVpZ2U6IDB4ZjVmNWRjLFxuICBiaXNxdWU6IDB4ZmZlNGM0LFxuICBibGFjazogMHgwMDAwMDAsXG4gIGJsYW5jaGVkYWxtb25kOiAweGZmZWJjZCxcbiAgYmx1ZTogMHgwMDAwZmYsXG4gIGJsdWV2aW9sZXQ6IDB4OGEyYmUyLFxuICBicm93bjogMHhhNTJhMmEsXG4gIGJ1cmx5d29vZDogMHhkZWI4ODcsXG4gIGNhZGV0Ymx1ZTogMHg1ZjllYTAsXG4gIGNoYXJ0cmV1c2U6IDB4N2ZmZjAwLFxuICBjaG9jb2xhdGU6IDB4ZDI2OTFlLFxuICBjb3JhbDogMHhmZjdmNTAsXG4gIGNvcm5mbG93ZXJibHVlOiAweDY0OTVlZCxcbiAgY29ybnNpbGs6IDB4ZmZmOGRjLFxuICBjcmltc29uOiAweGRjMTQzYyxcbiAgY3lhbjogMHgwMGZmZmYsXG4gIGRhcmtibHVlOiAweDAwMDA4YixcbiAgZGFya2N5YW46IDB4MDA4YjhiLFxuICBkYXJrZ29sZGVucm9kOiAweGI4ODYwYixcbiAgZGFya2dyYXk6IDB4YTlhOWE5LFxuICBkYXJrZ3JlZW46IDB4MDA2NDAwLFxuICBkYXJrZ3JleTogMHhhOWE5YTksXG4gIGRhcmtraGFraTogMHhiZGI3NmIsXG4gIGRhcmttYWdlbnRhOiAweDhiMDA4YixcbiAgZGFya29saXZlZ3JlZW46IDB4NTU2YjJmLFxuICBkYXJrb3JhbmdlOiAweGZmOGMwMCxcbiAgZGFya29yY2hpZDogMHg5OTMyY2MsXG4gIGRhcmtyZWQ6IDB4OGIwMDAwLFxuICBkYXJrc2FsbW9uOiAweGU5OTY3YSxcbiAgZGFya3NlYWdyZWVuOiAweDhmYmM4ZixcbiAgZGFya3NsYXRlYmx1ZTogMHg0ODNkOGIsXG4gIGRhcmtzbGF0ZWdyYXk6IDB4MmY0ZjRmLFxuICBkYXJrc2xhdGVncmV5OiAweDJmNGY0ZixcbiAgZGFya3R1cnF1b2lzZTogMHgwMGNlZDEsXG4gIGRhcmt2aW9sZXQ6IDB4OTQwMGQzLFxuICBkZWVwcGluazogMHhmZjE0OTMsXG4gIGRlZXBza3libHVlOiAweDAwYmZmZixcbiAgZGltZ3JheTogMHg2OTY5NjksXG4gIGRpbWdyZXk6IDB4Njk2OTY5LFxuICBkb2RnZXJibHVlOiAweDFlOTBmZixcbiAgZmlyZWJyaWNrOiAweGIyMjIyMixcbiAgZmxvcmFsd2hpdGU6IDB4ZmZmYWYwLFxuICBmb3Jlc3RncmVlbjogMHgyMjhiMjIsXG4gIGZ1Y2hzaWE6IDB4ZmYwMGZmLFxuICBnYWluc2Jvcm86IDB4ZGNkY2RjLFxuICBnaG9zdHdoaXRlOiAweGY4ZjhmZixcbiAgZ29sZDogMHhmZmQ3MDAsXG4gIGdvbGRlbnJvZDogMHhkYWE1MjAsXG4gIGdyYXk6IDB4ODA4MDgwLFxuICBncmVlbjogMHgwMDgwMDAsXG4gIGdyZWVueWVsbG93OiAweGFkZmYyZixcbiAgZ3JleTogMHg4MDgwODAsXG4gIGhvbmV5ZGV3OiAweGYwZmZmMCxcbiAgaG90cGluazogMHhmZjY5YjQsXG4gIGluZGlhbnJlZDogMHhjZDVjNWMsXG4gIGluZGlnbzogMHg0YjAwODIsXG4gIGl2b3J5OiAweGZmZmZmMCxcbiAga2hha2k6IDB4ZjBlNjhjLFxuICBsYXZlbmRlcjogMHhlNmU2ZmEsXG4gIGxhdmVuZGVyYmx1c2g6IDB4ZmZmMGY1LFxuICBsYXduZ3JlZW46IDB4N2NmYzAwLFxuICBsZW1vbmNoaWZmb246IDB4ZmZmYWNkLFxuICBsaWdodGJsdWU6IDB4YWRkOGU2LFxuICBsaWdodGNvcmFsOiAweGYwODA4MCxcbiAgbGlnaHRjeWFuOiAweGUwZmZmZixcbiAgbGlnaHRnb2xkZW5yb2R5ZWxsb3c6IDB4ZmFmYWQyLFxuICBsaWdodGdyYXk6IDB4ZDNkM2QzLFxuICBsaWdodGdyZWVuOiAweDkwZWU5MCxcbiAgbGlnaHRncmV5OiAweGQzZDNkMyxcbiAgbGlnaHRwaW5rOiAweGZmYjZjMSxcbiAgbGlnaHRzYWxtb246IDB4ZmZhMDdhLFxuICBsaWdodHNlYWdyZWVuOiAweDIwYjJhYSxcbiAgbGlnaHRza3libHVlOiAweDg3Y2VmYSxcbiAgbGlnaHRzbGF0ZWdyYXk6IDB4Nzc4ODk5LFxuICBsaWdodHNsYXRlZ3JleTogMHg3Nzg4OTksXG4gIGxpZ2h0c3RlZWxibHVlOiAweGIwYzRkZSxcbiAgbGlnaHR5ZWxsb3c6IDB4ZmZmZmUwLFxuICBsaW1lOiAweDAwZmYwMCxcbiAgbGltZWdyZWVuOiAweDMyY2QzMixcbiAgbGluZW46IDB4ZmFmMGU2LFxuICBtYWdlbnRhOiAweGZmMDBmZixcbiAgbWFyb29uOiAweDgwMDAwMCxcbiAgbWVkaXVtYXF1YW1hcmluZTogMHg2NmNkYWEsXG4gIG1lZGl1bWJsdWU6IDB4MDAwMGNkLFxuICBtZWRpdW1vcmNoaWQ6IDB4YmE1NWQzLFxuICBtZWRpdW1wdXJwbGU6IDB4OTM3MGRiLFxuICBtZWRpdW1zZWFncmVlbjogMHgzY2IzNzEsXG4gIG1lZGl1bXNsYXRlYmx1ZTogMHg3YjY4ZWUsXG4gIG1lZGl1bXNwcmluZ2dyZWVuOiAweDAwZmE5YSxcbiAgbWVkaXVtdHVycXVvaXNlOiAweDQ4ZDFjYyxcbiAgbWVkaXVtdmlvbGV0cmVkOiAweGM3MTU4NSxcbiAgbWlkbmlnaHRibHVlOiAweDE5MTk3MCxcbiAgbWludGNyZWFtOiAweGY1ZmZmYSxcbiAgbWlzdHlyb3NlOiAweGZmZTRlMSxcbiAgbW9jY2FzaW46IDB4ZmZlNGI1LFxuICBuYXZham93aGl0ZTogMHhmZmRlYWQsXG4gIG5hdnk6IDB4MDAwMDgwLFxuICBvbGRsYWNlOiAweGZkZjVlNixcbiAgb2xpdmU6IDB4ODA4MDAwLFxuICBvbGl2ZWRyYWI6IDB4NmI4ZTIzLFxuICBvcmFuZ2U6IDB4ZmZhNTAwLFxuICBvcmFuZ2VyZWQ6IDB4ZmY0NTAwLFxuICBvcmNoaWQ6IDB4ZGE3MGQ2LFxuICBwYWxlZ29sZGVucm9kOiAweGVlZThhYSxcbiAgcGFsZWdyZWVuOiAweDk4ZmI5OCxcbiAgcGFsZXR1cnF1b2lzZTogMHhhZmVlZWUsXG4gIHBhbGV2aW9sZXRyZWQ6IDB4ZGI3MDkzLFxuICBwYXBheWF3aGlwOiAweGZmZWZkNSxcbiAgcGVhY2hwdWZmOiAweGZmZGFiOSxcbiAgcGVydTogMHhjZDg1M2YsXG4gIHBpbms6IDB4ZmZjMGNiLFxuICBwbHVtOiAweGRkYTBkZCxcbiAgcG93ZGVyYmx1ZTogMHhiMGUwZTYsXG4gIHB1cnBsZTogMHg4MDAwODAsXG4gIHJlYmVjY2FwdXJwbGU6IDB4NjYzMzk5LFxuICByZWQ6IDB4ZmYwMDAwLFxuICByb3N5YnJvd246IDB4YmM4ZjhmLFxuICByb3lhbGJsdWU6IDB4NDE2OWUxLFxuICBzYWRkbGVicm93bjogMHg4YjQ1MTMsXG4gIHNhbG1vbjogMHhmYTgwNzIsXG4gIHNhbmR5YnJvd246IDB4ZjRhNDYwLFxuICBzZWFncmVlbjogMHgyZThiNTcsXG4gIHNlYXNoZWxsOiAweGZmZjVlZSxcbiAgc2llbm5hOiAweGEwNTIyZCxcbiAgc2lsdmVyOiAweGMwYzBjMCxcbiAgc2t5Ymx1ZTogMHg4N2NlZWIsXG4gIHNsYXRlYmx1ZTogMHg2YTVhY2QsXG4gIHNsYXRlZ3JheTogMHg3MDgwOTAsXG4gIHNsYXRlZ3JleTogMHg3MDgwOTAsXG4gIHNub3c6IDB4ZmZmYWZhLFxuICBzcHJpbmdncmVlbjogMHgwMGZmN2YsXG4gIHN0ZWVsYmx1ZTogMHg0NjgyYjQsXG4gIHRhbjogMHhkMmI0OGMsXG4gIHRlYWw6IDB4MDA4MDgwLFxuICB0aGlzdGxlOiAweGQ4YmZkOCxcbiAgdG9tYXRvOiAweGZmNjM0NyxcbiAgdHVycXVvaXNlOiAweDQwZTBkMCxcbiAgdmlvbGV0OiAweGVlODJlZSxcbiAgd2hlYXQ6IDB4ZjVkZWIzLFxuICB3aGl0ZTogMHhmZmZmZmYsXG4gIHdoaXRlc21va2U6IDB4ZjVmNWY1LFxuICB5ZWxsb3c6IDB4ZmZmZjAwLFxuICB5ZWxsb3dncmVlbjogMHg5YWNkMzJcbn07XG5cbmRlZmluZShDb2xvciwgY29sb3IsIHtcbiAgY29weShjaGFubmVscykge1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKG5ldyB0aGlzLmNvbnN0cnVjdG9yLCB0aGlzLCBjaGFubmVscyk7XG4gIH0sXG4gIGRpc3BsYXlhYmxlKCkge1xuICAgIHJldHVybiB0aGlzLnJnYigpLmRpc3BsYXlhYmxlKCk7XG4gIH0sXG4gIGhleDogY29sb3JfZm9ybWF0SGV4LCAvLyBEZXByZWNhdGVkISBVc2UgY29sb3IuZm9ybWF0SGV4LlxuICBmb3JtYXRIZXg6IGNvbG9yX2Zvcm1hdEhleCxcbiAgZm9ybWF0SGV4ODogY29sb3JfZm9ybWF0SGV4OCxcbiAgZm9ybWF0SHNsOiBjb2xvcl9mb3JtYXRIc2wsXG4gIGZvcm1hdFJnYjogY29sb3JfZm9ybWF0UmdiLFxuICB0b1N0cmluZzogY29sb3JfZm9ybWF0UmdiXG59KTtcblxuZnVuY3Rpb24gY29sb3JfZm9ybWF0SGV4KCkge1xuICByZXR1cm4gdGhpcy5yZ2IoKS5mb3JtYXRIZXgoKTtcbn1cblxuZnVuY3Rpb24gY29sb3JfZm9ybWF0SGV4OCgpIHtcbiAgcmV0dXJuIHRoaXMucmdiKCkuZm9ybWF0SGV4OCgpO1xufVxuXG5mdW5jdGlvbiBjb2xvcl9mb3JtYXRIc2woKSB7XG4gIHJldHVybiBoc2xDb252ZXJ0KHRoaXMpLmZvcm1hdEhzbCgpO1xufVxuXG5mdW5jdGlvbiBjb2xvcl9mb3JtYXRSZ2IoKSB7XG4gIHJldHVybiB0aGlzLnJnYigpLmZvcm1hdFJnYigpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjb2xvcihmb3JtYXQpIHtcbiAgdmFyIG0sIGw7XG4gIGZvcm1hdCA9IChmb3JtYXQgKyBcIlwiKS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIChtID0gcmVIZXguZXhlYyhmb3JtYXQpKSA/IChsID0gbVsxXS5sZW5ndGgsIG0gPSBwYXJzZUludChtWzFdLCAxNiksIGwgPT09IDYgPyByZ2JuKG0pIC8vICNmZjAwMDBcbiAgICAgIDogbCA9PT0gMyA/IG5ldyBSZ2IoKG0gPj4gOCAmIDB4ZikgfCAobSA+PiA0ICYgMHhmMCksIChtID4+IDQgJiAweGYpIHwgKG0gJiAweGYwKSwgKChtICYgMHhmKSA8PCA0KSB8IChtICYgMHhmKSwgMSkgLy8gI2YwMFxuICAgICAgOiBsID09PSA4ID8gcmdiYShtID4+IDI0ICYgMHhmZiwgbSA+PiAxNiAmIDB4ZmYsIG0gPj4gOCAmIDB4ZmYsIChtICYgMHhmZikgLyAweGZmKSAvLyAjZmYwMDAwMDBcbiAgICAgIDogbCA9PT0gNCA/IHJnYmEoKG0gPj4gMTIgJiAweGYpIHwgKG0gPj4gOCAmIDB4ZjApLCAobSA+PiA4ICYgMHhmKSB8IChtID4+IDQgJiAweGYwKSwgKG0gPj4gNCAmIDB4ZikgfCAobSAmIDB4ZjApLCAoKChtICYgMHhmKSA8PCA0KSB8IChtICYgMHhmKSkgLyAweGZmKSAvLyAjZjAwMFxuICAgICAgOiBudWxsKSAvLyBpbnZhbGlkIGhleFxuICAgICAgOiAobSA9IHJlUmdiSW50ZWdlci5leGVjKGZvcm1hdCkpID8gbmV3IFJnYihtWzFdLCBtWzJdLCBtWzNdLCAxKSAvLyByZ2IoMjU1LCAwLCAwKVxuICAgICAgOiAobSA9IHJlUmdiUGVyY2VudC5leGVjKGZvcm1hdCkpID8gbmV3IFJnYihtWzFdICogMjU1IC8gMTAwLCBtWzJdICogMjU1IC8gMTAwLCBtWzNdICogMjU1IC8gMTAwLCAxKSAvLyByZ2IoMTAwJSwgMCUsIDAlKVxuICAgICAgOiAobSA9IHJlUmdiYUludGVnZXIuZXhlYyhmb3JtYXQpKSA/IHJnYmEobVsxXSwgbVsyXSwgbVszXSwgbVs0XSkgLy8gcmdiYSgyNTUsIDAsIDAsIDEpXG4gICAgICA6IChtID0gcmVSZ2JhUGVyY2VudC5leGVjKGZvcm1hdCkpID8gcmdiYShtWzFdICogMjU1IC8gMTAwLCBtWzJdICogMjU1IC8gMTAwLCBtWzNdICogMjU1IC8gMTAwLCBtWzRdKSAvLyByZ2IoMTAwJSwgMCUsIDAlLCAxKVxuICAgICAgOiAobSA9IHJlSHNsUGVyY2VudC5leGVjKGZvcm1hdCkpID8gaHNsYShtWzFdLCBtWzJdIC8gMTAwLCBtWzNdIC8gMTAwLCAxKSAvLyBoc2woMTIwLCA1MCUsIDUwJSlcbiAgICAgIDogKG0gPSByZUhzbGFQZXJjZW50LmV4ZWMoZm9ybWF0KSkgPyBoc2xhKG1bMV0sIG1bMl0gLyAxMDAsIG1bM10gLyAxMDAsIG1bNF0pIC8vIGhzbGEoMTIwLCA1MCUsIDUwJSwgMSlcbiAgICAgIDogbmFtZWQuaGFzT3duUHJvcGVydHkoZm9ybWF0KSA/IHJnYm4obmFtZWRbZm9ybWF0XSkgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1wcm90b3R5cGUtYnVpbHRpbnNcbiAgICAgIDogZm9ybWF0ID09PSBcInRyYW5zcGFyZW50XCIgPyBuZXcgUmdiKE5hTiwgTmFOLCBOYU4sIDApXG4gICAgICA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIHJnYm4obikge1xuICByZXR1cm4gbmV3IFJnYihuID4+IDE2ICYgMHhmZiwgbiA+PiA4ICYgMHhmZiwgbiAmIDB4ZmYsIDEpO1xufVxuXG5mdW5jdGlvbiByZ2JhKHIsIGcsIGIsIGEpIHtcbiAgaWYgKGEgPD0gMCkgciA9IGcgPSBiID0gTmFOO1xuICByZXR1cm4gbmV3IFJnYihyLCBnLCBiLCBhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJnYkNvbnZlcnQobykge1xuICBpZiAoIShvIGluc3RhbmNlb2YgQ29sb3IpKSBvID0gY29sb3Iobyk7XG4gIGlmICghbykgcmV0dXJuIG5ldyBSZ2I7XG4gIG8gPSBvLnJnYigpO1xuICByZXR1cm4gbmV3IFJnYihvLnIsIG8uZywgby5iLCBvLm9wYWNpdHkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmdiKHIsIGcsIGIsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyByZ2JDb252ZXJ0KHIpIDogbmV3IFJnYihyLCBnLCBiLCBvcGFjaXR5ID09IG51bGwgPyAxIDogb3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBSZ2IociwgZywgYiwgb3BhY2l0eSkge1xuICB0aGlzLnIgPSArcjtcbiAgdGhpcy5nID0gK2c7XG4gIHRoaXMuYiA9ICtiO1xuICB0aGlzLm9wYWNpdHkgPSArb3BhY2l0eTtcbn1cblxuZGVmaW5lKFJnYiwgcmdiLCBleHRlbmQoQ29sb3IsIHtcbiAgYnJpZ2h0ZXIoaykge1xuICAgIGsgPSBrID09IG51bGwgPyBicmlnaHRlciA6IE1hdGgucG93KGJyaWdodGVyLCBrKTtcbiAgICByZXR1cm4gbmV3IFJnYih0aGlzLnIgKiBrLCB0aGlzLmcgKiBrLCB0aGlzLmIgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICBkYXJrZXIoaykge1xuICAgIGsgPSBrID09IG51bGwgPyBkYXJrZXIgOiBNYXRoLnBvdyhkYXJrZXIsIGspO1xuICAgIHJldHVybiBuZXcgUmdiKHRoaXMuciAqIGssIHRoaXMuZyAqIGssIHRoaXMuYiAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYigpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcbiAgY2xhbXAoKSB7XG4gICAgcmV0dXJuIG5ldyBSZ2IoY2xhbXBpKHRoaXMuciksIGNsYW1waSh0aGlzLmcpLCBjbGFtcGkodGhpcy5iKSwgY2xhbXBhKHRoaXMub3BhY2l0eSkpO1xuICB9LFxuICBkaXNwbGF5YWJsZSgpIHtcbiAgICByZXR1cm4gKC0wLjUgPD0gdGhpcy5yICYmIHRoaXMuciA8IDI1NS41KVxuICAgICAgICAmJiAoLTAuNSA8PSB0aGlzLmcgJiYgdGhpcy5nIDwgMjU1LjUpXG4gICAgICAgICYmICgtMC41IDw9IHRoaXMuYiAmJiB0aGlzLmIgPCAyNTUuNSlcbiAgICAgICAgJiYgKDAgPD0gdGhpcy5vcGFjaXR5ICYmIHRoaXMub3BhY2l0eSA8PSAxKTtcbiAgfSxcbiAgaGV4OiByZ2JfZm9ybWF0SGV4LCAvLyBEZXByZWNhdGVkISBVc2UgY29sb3IuZm9ybWF0SGV4LlxuICBmb3JtYXRIZXg6IHJnYl9mb3JtYXRIZXgsXG4gIGZvcm1hdEhleDg6IHJnYl9mb3JtYXRIZXg4LFxuICBmb3JtYXRSZ2I6IHJnYl9mb3JtYXRSZ2IsXG4gIHRvU3RyaW5nOiByZ2JfZm9ybWF0UmdiXG59KSk7XG5cbmZ1bmN0aW9uIHJnYl9mb3JtYXRIZXgoKSB7XG4gIHJldHVybiBgIyR7aGV4KHRoaXMucil9JHtoZXgodGhpcy5nKX0ke2hleCh0aGlzLmIpfWA7XG59XG5cbmZ1bmN0aW9uIHJnYl9mb3JtYXRIZXg4KCkge1xuICByZXR1cm4gYCMke2hleCh0aGlzLnIpfSR7aGV4KHRoaXMuZyl9JHtoZXgodGhpcy5iKX0ke2hleCgoaXNOYU4odGhpcy5vcGFjaXR5KSA/IDEgOiB0aGlzLm9wYWNpdHkpICogMjU1KX1gO1xufVxuXG5mdW5jdGlvbiByZ2JfZm9ybWF0UmdiKCkge1xuICBjb25zdCBhID0gY2xhbXBhKHRoaXMub3BhY2l0eSk7XG4gIHJldHVybiBgJHthID09PSAxID8gXCJyZ2IoXCIgOiBcInJnYmEoXCJ9JHtjbGFtcGkodGhpcy5yKX0sICR7Y2xhbXBpKHRoaXMuZyl9LCAke2NsYW1waSh0aGlzLmIpfSR7YSA9PT0gMSA/IFwiKVwiIDogYCwgJHthfSlgfWA7XG59XG5cbmZ1bmN0aW9uIGNsYW1wYShvcGFjaXR5KSB7XG4gIHJldHVybiBpc05hTihvcGFjaXR5KSA/IDEgOiBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBvcGFjaXR5KSk7XG59XG5cbmZ1bmN0aW9uIGNsYW1waSh2YWx1ZSkge1xuICByZXR1cm4gTWF0aC5tYXgoMCwgTWF0aC5taW4oMjU1LCBNYXRoLnJvdW5kKHZhbHVlKSB8fCAwKSk7XG59XG5cbmZ1bmN0aW9uIGhleCh2YWx1ZSkge1xuICB2YWx1ZSA9IGNsYW1waSh2YWx1ZSk7XG4gIHJldHVybiAodmFsdWUgPCAxNiA/IFwiMFwiIDogXCJcIikgKyB2YWx1ZS50b1N0cmluZygxNik7XG59XG5cbmZ1bmN0aW9uIGhzbGEoaCwgcywgbCwgYSkge1xuICBpZiAoYSA8PSAwKSBoID0gcyA9IGwgPSBOYU47XG4gIGVsc2UgaWYgKGwgPD0gMCB8fCBsID49IDEpIGggPSBzID0gTmFOO1xuICBlbHNlIGlmIChzIDw9IDApIGggPSBOYU47XG4gIHJldHVybiBuZXcgSHNsKGgsIHMsIGwsIGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaHNsQ29udmVydChvKSB7XG4gIGlmIChvIGluc3RhbmNlb2YgSHNsKSByZXR1cm4gbmV3IEhzbChvLmgsIG8ucywgby5sLCBvLm9wYWNpdHkpO1xuICBpZiAoIShvIGluc3RhbmNlb2YgQ29sb3IpKSBvID0gY29sb3Iobyk7XG4gIGlmICghbykgcmV0dXJuIG5ldyBIc2w7XG4gIGlmIChvIGluc3RhbmNlb2YgSHNsKSByZXR1cm4gbztcbiAgbyA9IG8ucmdiKCk7XG4gIHZhciByID0gby5yIC8gMjU1LFxuICAgICAgZyA9IG8uZyAvIDI1NSxcbiAgICAgIGIgPSBvLmIgLyAyNTUsXG4gICAgICBtaW4gPSBNYXRoLm1pbihyLCBnLCBiKSxcbiAgICAgIG1heCA9IE1hdGgubWF4KHIsIGcsIGIpLFxuICAgICAgaCA9IE5hTixcbiAgICAgIHMgPSBtYXggLSBtaW4sXG4gICAgICBsID0gKG1heCArIG1pbikgLyAyO1xuICBpZiAocykge1xuICAgIGlmIChyID09PSBtYXgpIGggPSAoZyAtIGIpIC8gcyArIChnIDwgYikgKiA2O1xuICAgIGVsc2UgaWYgKGcgPT09IG1heCkgaCA9IChiIC0gcikgLyBzICsgMjtcbiAgICBlbHNlIGggPSAociAtIGcpIC8gcyArIDQ7XG4gICAgcyAvPSBsIDwgMC41ID8gbWF4ICsgbWluIDogMiAtIG1heCAtIG1pbjtcbiAgICBoICo9IDYwO1xuICB9IGVsc2Uge1xuICAgIHMgPSBsID4gMCAmJiBsIDwgMSA/IDAgOiBoO1xuICB9XG4gIHJldHVybiBuZXcgSHNsKGgsIHMsIGwsIG8ub3BhY2l0eSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoc2woaCwgcywgbCwgb3BhY2l0eSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/IGhzbENvbnZlcnQoaCkgOiBuZXcgSHNsKGgsIHMsIGwsIG9wYWNpdHkgPT0gbnVsbCA/IDEgOiBvcGFjaXR5KTtcbn1cblxuZnVuY3Rpb24gSHNsKGgsIHMsIGwsIG9wYWNpdHkpIHtcbiAgdGhpcy5oID0gK2g7XG4gIHRoaXMucyA9ICtzO1xuICB0aGlzLmwgPSArbDtcbiAgdGhpcy5vcGFjaXR5ID0gK29wYWNpdHk7XG59XG5cbmRlZmluZShIc2wsIGhzbCwgZXh0ZW5kKENvbG9yLCB7XG4gIGJyaWdodGVyKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gYnJpZ2h0ZXIgOiBNYXRoLnBvdyhicmlnaHRlciwgayk7XG4gICAgcmV0dXJuIG5ldyBIc2wodGhpcy5oLCB0aGlzLnMsIHRoaXMubCAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIGRhcmtlcihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGRhcmtlciA6IE1hdGgucG93KGRhcmtlciwgayk7XG4gICAgcmV0dXJuIG5ldyBIc2wodGhpcy5oLCB0aGlzLnMsIHRoaXMubCAqIGssIHRoaXMub3BhY2l0eSk7XG4gIH0sXG4gIHJnYigpIHtcbiAgICB2YXIgaCA9IHRoaXMuaCAlIDM2MCArICh0aGlzLmggPCAwKSAqIDM2MCxcbiAgICAgICAgcyA9IGlzTmFOKGgpIHx8IGlzTmFOKHRoaXMucykgPyAwIDogdGhpcy5zLFxuICAgICAgICBsID0gdGhpcy5sLFxuICAgICAgICBtMiA9IGwgKyAobCA8IDAuNSA/IGwgOiAxIC0gbCkgKiBzLFxuICAgICAgICBtMSA9IDIgKiBsIC0gbTI7XG4gICAgcmV0dXJuIG5ldyBSZ2IoXG4gICAgICBoc2wycmdiKGggPj0gMjQwID8gaCAtIDI0MCA6IGggKyAxMjAsIG0xLCBtMiksXG4gICAgICBoc2wycmdiKGgsIG0xLCBtMiksXG4gICAgICBoc2wycmdiKGggPCAxMjAgPyBoICsgMjQwIDogaCAtIDEyMCwgbTEsIG0yKSxcbiAgICAgIHRoaXMub3BhY2l0eVxuICAgICk7XG4gIH0sXG4gIGNsYW1wKCkge1xuICAgIHJldHVybiBuZXcgSHNsKGNsYW1waCh0aGlzLmgpLCBjbGFtcHQodGhpcy5zKSwgY2xhbXB0KHRoaXMubCksIGNsYW1wYSh0aGlzLm9wYWNpdHkpKTtcbiAgfSxcbiAgZGlzcGxheWFibGUoKSB7XG4gICAgcmV0dXJuICgwIDw9IHRoaXMucyAmJiB0aGlzLnMgPD0gMSB8fCBpc05hTih0aGlzLnMpKVxuICAgICAgICAmJiAoMCA8PSB0aGlzLmwgJiYgdGhpcy5sIDw9IDEpXG4gICAgICAgICYmICgwIDw9IHRoaXMub3BhY2l0eSAmJiB0aGlzLm9wYWNpdHkgPD0gMSk7XG4gIH0sXG4gIGZvcm1hdEhzbCgpIHtcbiAgICBjb25zdCBhID0gY2xhbXBhKHRoaXMub3BhY2l0eSk7XG4gICAgcmV0dXJuIGAke2EgPT09IDEgPyBcImhzbChcIiA6IFwiaHNsYShcIn0ke2NsYW1waCh0aGlzLmgpfSwgJHtjbGFtcHQodGhpcy5zKSAqIDEwMH0lLCAke2NsYW1wdCh0aGlzLmwpICogMTAwfSUke2EgPT09IDEgPyBcIilcIiA6IGAsICR7YX0pYH1gO1xuICB9XG59KSk7XG5cbmZ1bmN0aW9uIGNsYW1waCh2YWx1ZSkge1xuICB2YWx1ZSA9ICh2YWx1ZSB8fCAwKSAlIDM2MDtcbiAgcmV0dXJuIHZhbHVlIDwgMCA/IHZhbHVlICsgMzYwIDogdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGNsYW1wdCh2YWx1ZSkge1xuICByZXR1cm4gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgdmFsdWUgfHwgMCkpO1xufVxuXG4vKiBGcm9tIEZ2RCAxMy4zNywgQ1NTIENvbG9yIE1vZHVsZSBMZXZlbCAzICovXG5mdW5jdGlvbiBoc2wycmdiKGgsIG0xLCBtMikge1xuICByZXR1cm4gKGggPCA2MCA/IG0xICsgKG0yIC0gbTEpICogaCAvIDYwXG4gICAgICA6IGggPCAxODAgPyBtMlxuICAgICAgOiBoIDwgMjQwID8gbTEgKyAobTIgLSBtMSkgKiAoMjQwIC0gaCkgLyA2MFxuICAgICAgOiBtMSkgKiAyNTU7XG59XG4iLCAiZXhwb3J0IGZ1bmN0aW9uIGJhc2lzKHQxLCB2MCwgdjEsIHYyLCB2Mykge1xuICB2YXIgdDIgPSB0MSAqIHQxLCB0MyA9IHQyICogdDE7XG4gIHJldHVybiAoKDEgLSAzICogdDEgKyAzICogdDIgLSB0MykgKiB2MFxuICAgICAgKyAoNCAtIDYgKiB0MiArIDMgKiB0MykgKiB2MVxuICAgICAgKyAoMSArIDMgKiB0MSArIDMgKiB0MiAtIDMgKiB0MykgKiB2MlxuICAgICAgKyB0MyAqIHYzKSAvIDY7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlcykge1xuICB2YXIgbiA9IHZhbHVlcy5sZW5ndGggLSAxO1xuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIHZhciBpID0gdCA8PSAwID8gKHQgPSAwKSA6IHQgPj0gMSA/ICh0ID0gMSwgbiAtIDEpIDogTWF0aC5mbG9vcih0ICogbiksXG4gICAgICAgIHYxID0gdmFsdWVzW2ldLFxuICAgICAgICB2MiA9IHZhbHVlc1tpICsgMV0sXG4gICAgICAgIHYwID0gaSA+IDAgPyB2YWx1ZXNbaSAtIDFdIDogMiAqIHYxIC0gdjIsXG4gICAgICAgIHYzID0gaSA8IG4gLSAxID8gdmFsdWVzW2kgKyAyXSA6IDIgKiB2MiAtIHYxO1xuICAgIHJldHVybiBiYXNpcygodCAtIGkgLyBuKSAqIG4sIHYwLCB2MSwgdjIsIHYzKTtcbiAgfTtcbn1cbiIsICJpbXBvcnQge2Jhc2lzfSBmcm9tIFwiLi9iYXNpcy5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgdmFyIG4gPSB2YWx1ZXMubGVuZ3RoO1xuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIHZhciBpID0gTWF0aC5mbG9vcigoKHQgJT0gMSkgPCAwID8gKyt0IDogdCkgKiBuKSxcbiAgICAgICAgdjAgPSB2YWx1ZXNbKGkgKyBuIC0gMSkgJSBuXSxcbiAgICAgICAgdjEgPSB2YWx1ZXNbaSAlIG5dLFxuICAgICAgICB2MiA9IHZhbHVlc1soaSArIDEpICUgbl0sXG4gICAgICAgIHYzID0gdmFsdWVzWyhpICsgMikgJSBuXTtcbiAgICByZXR1cm4gYmFzaXMoKHQgLSBpIC8gbikgKiBuLCB2MCwgdjEsIHYyLCB2Myk7XG4gIH07XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgeCA9PiAoKSA9PiB4O1xuIiwgImltcG9ydCBjb25zdGFudCBmcm9tIFwiLi9jb25zdGFudC5qc1wiO1xuXG5mdW5jdGlvbiBsaW5lYXIoYSwgZCkge1xuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBhICsgdCAqIGQ7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGV4cG9uZW50aWFsKGEsIGIsIHkpIHtcbiAgcmV0dXJuIGEgPSBNYXRoLnBvdyhhLCB5KSwgYiA9IE1hdGgucG93KGIsIHkpIC0gYSwgeSA9IDEgLyB5LCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIE1hdGgucG93KGEgKyB0ICogYiwgeSk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBodWUoYSwgYikge1xuICB2YXIgZCA9IGIgLSBhO1xuICByZXR1cm4gZCA/IGxpbmVhcihhLCBkID4gMTgwIHx8IGQgPCAtMTgwID8gZCAtIDM2MCAqIE1hdGgucm91bmQoZCAvIDM2MCkgOiBkKSA6IGNvbnN0YW50KGlzTmFOKGEpID8gYiA6IGEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2FtbWEoeSkge1xuICByZXR1cm4gKHkgPSAreSkgPT09IDEgPyBub2dhbW1hIDogZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBiIC0gYSA/IGV4cG9uZW50aWFsKGEsIGIsIHkpIDogY29uc3RhbnQoaXNOYU4oYSkgPyBiIDogYSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG5vZ2FtbWEoYSwgYikge1xuICB2YXIgZCA9IGIgLSBhO1xuICByZXR1cm4gZCA/IGxpbmVhcihhLCBkKSA6IGNvbnN0YW50KGlzTmFOKGEpID8gYiA6IGEpO1xufVxuIiwgImltcG9ydCB7cmdiIGFzIGNvbG9yUmdifSBmcm9tIFwiZDMtY29sb3JcIjtcbmltcG9ydCBiYXNpcyBmcm9tIFwiLi9iYXNpcy5qc1wiO1xuaW1wb3J0IGJhc2lzQ2xvc2VkIGZyb20gXCIuL2Jhc2lzQ2xvc2VkLmpzXCI7XG5pbXBvcnQgbm9nYW1tYSwge2dhbW1hfSBmcm9tIFwiLi9jb2xvci5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCAoZnVuY3Rpb24gcmdiR2FtbWEoeSkge1xuICB2YXIgY29sb3IgPSBnYW1tYSh5KTtcblxuICBmdW5jdGlvbiByZ2Ioc3RhcnQsIGVuZCkge1xuICAgIHZhciByID0gY29sb3IoKHN0YXJ0ID0gY29sb3JSZ2Ioc3RhcnQpKS5yLCAoZW5kID0gY29sb3JSZ2IoZW5kKSkuciksXG4gICAgICAgIGcgPSBjb2xvcihzdGFydC5nLCBlbmQuZyksXG4gICAgICAgIGIgPSBjb2xvcihzdGFydC5iLCBlbmQuYiksXG4gICAgICAgIG9wYWNpdHkgPSBub2dhbW1hKHN0YXJ0Lm9wYWNpdHksIGVuZC5vcGFjaXR5KTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgc3RhcnQuciA9IHIodCk7XG4gICAgICBzdGFydC5nID0gZyh0KTtcbiAgICAgIHN0YXJ0LmIgPSBiKHQpO1xuICAgICAgc3RhcnQub3BhY2l0eSA9IG9wYWNpdHkodCk7XG4gICAgICByZXR1cm4gc3RhcnQgKyBcIlwiO1xuICAgIH07XG4gIH1cblxuICByZ2IuZ2FtbWEgPSByZ2JHYW1tYTtcblxuICByZXR1cm4gcmdiO1xufSkoMSk7XG5cbmZ1bmN0aW9uIHJnYlNwbGluZShzcGxpbmUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGNvbG9ycykge1xuICAgIHZhciBuID0gY29sb3JzLmxlbmd0aCxcbiAgICAgICAgciA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgZyA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgYiA9IG5ldyBBcnJheShuKSxcbiAgICAgICAgaSwgY29sb3I7XG4gICAgZm9yIChpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgY29sb3IgPSBjb2xvclJnYihjb2xvcnNbaV0pO1xuICAgICAgcltpXSA9IGNvbG9yLnIgfHwgMDtcbiAgICAgIGdbaV0gPSBjb2xvci5nIHx8IDA7XG4gICAgICBiW2ldID0gY29sb3IuYiB8fCAwO1xuICAgIH1cbiAgICByID0gc3BsaW5lKHIpO1xuICAgIGcgPSBzcGxpbmUoZyk7XG4gICAgYiA9IHNwbGluZShiKTtcbiAgICBjb2xvci5vcGFjaXR5ID0gMTtcbiAgICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgICAgY29sb3IuciA9IHIodCk7XG4gICAgICBjb2xvci5nID0gZyh0KTtcbiAgICAgIGNvbG9yLmIgPSBiKHQpO1xuICAgICAgcmV0dXJuIGNvbG9yICsgXCJcIjtcbiAgICB9O1xuICB9O1xufVxuXG5leHBvcnQgdmFyIHJnYkJhc2lzID0gcmdiU3BsaW5lKGJhc2lzKTtcbmV4cG9ydCB2YXIgcmdiQmFzaXNDbG9zZWQgPSByZ2JTcGxpbmUoYmFzaXNDbG9zZWQpO1xuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgaWYgKCFiKSBiID0gW107XG4gIHZhciBuID0gYSA/IE1hdGgubWluKGIubGVuZ3RoLCBhLmxlbmd0aCkgOiAwLFxuICAgICAgYyA9IGIuc2xpY2UoKSxcbiAgICAgIGk7XG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgZm9yIChpID0gMDsgaSA8IG47ICsraSkgY1tpXSA9IGFbaV0gKiAoMSAtIHQpICsgYltpXSAqIHQ7XG4gICAgcmV0dXJuIGM7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlckFycmF5KHgpIHtcbiAgcmV0dXJuIEFycmF5QnVmZmVyLmlzVmlldyh4KSAmJiAhKHggaW5zdGFuY2VvZiBEYXRhVmlldyk7XG59XG4iLCAiaW1wb3J0IHZhbHVlIGZyb20gXCIuL3ZhbHVlLmpzXCI7XG5pbXBvcnQgbnVtYmVyQXJyYXksIHtpc051bWJlckFycmF5fSBmcm9tIFwiLi9udW1iZXJBcnJheS5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHJldHVybiAoaXNOdW1iZXJBcnJheShiKSA/IG51bWJlckFycmF5IDogZ2VuZXJpY0FycmF5KShhLCBiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyaWNBcnJheShhLCBiKSB7XG4gIHZhciBuYiA9IGIgPyBiLmxlbmd0aCA6IDAsXG4gICAgICBuYSA9IGEgPyBNYXRoLm1pbihuYiwgYS5sZW5ndGgpIDogMCxcbiAgICAgIHggPSBuZXcgQXJyYXkobmEpLFxuICAgICAgYyA9IG5ldyBBcnJheShuYiksXG4gICAgICBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBuYTsgKytpKSB4W2ldID0gdmFsdWUoYVtpXSwgYltpXSk7XG4gIGZvciAoOyBpIDwgbmI7ICsraSkgY1tpXSA9IGJbaV07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbmE7ICsraSkgY1tpXSA9IHhbaV0odCk7XG4gICAgcmV0dXJuIGM7XG4gIH07XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICB2YXIgZCA9IG5ldyBEYXRlO1xuICByZXR1cm4gYSA9ICthLCBiID0gK2IsIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gZC5zZXRUaW1lKGEgKiAoMSAtIHQpICsgYiAqIHQpLCBkO1xuICB9O1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEgPSArYSwgYiA9ICtiLCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIGEgKiAoMSAtIHQpICsgYiAqIHQ7XG4gIH07XG59XG4iLCAiaW1wb3J0IHZhbHVlIGZyb20gXCIuL3ZhbHVlLmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGkgPSB7fSxcbiAgICAgIGMgPSB7fSxcbiAgICAgIGs7XG5cbiAgaWYgKGEgPT09IG51bGwgfHwgdHlwZW9mIGEgIT09IFwib2JqZWN0XCIpIGEgPSB7fTtcbiAgaWYgKGIgPT09IG51bGwgfHwgdHlwZW9mIGIgIT09IFwib2JqZWN0XCIpIGIgPSB7fTtcblxuICBmb3IgKGsgaW4gYikge1xuICAgIGlmIChrIGluIGEpIHtcbiAgICAgIGlba10gPSB2YWx1ZShhW2tdLCBiW2tdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY1trXSA9IGJba107XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICBmb3IgKGsgaW4gaSkgY1trXSA9IGlba10odCk7XG4gICAgcmV0dXJuIGM7XG4gIH07XG59XG4iLCAiaW1wb3J0IG51bWJlciBmcm9tIFwiLi9udW1iZXIuanNcIjtcblxudmFyIHJlQSA9IC9bLStdPyg/OlxcZCtcXC4/XFxkKnxcXC4/XFxkKykoPzpbZUVdWy0rXT9cXGQrKT8vZyxcbiAgICByZUIgPSBuZXcgUmVnRXhwKHJlQS5zb3VyY2UsIFwiZ1wiKTtcblxuZnVuY3Rpb24gemVybyhiKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYjtcbiAgfTtcbn1cblxuZnVuY3Rpb24gb25lKGIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gYih0KSArIFwiXCI7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGJpID0gcmVBLmxhc3RJbmRleCA9IHJlQi5sYXN0SW5kZXggPSAwLCAvLyBzY2FuIGluZGV4IGZvciBuZXh0IG51bWJlciBpbiBiXG4gICAgICBhbSwgLy8gY3VycmVudCBtYXRjaCBpbiBhXG4gICAgICBibSwgLy8gY3VycmVudCBtYXRjaCBpbiBiXG4gICAgICBicywgLy8gc3RyaW5nIHByZWNlZGluZyBjdXJyZW50IG51bWJlciBpbiBiLCBpZiBhbnlcbiAgICAgIGkgPSAtMSwgLy8gaW5kZXggaW4gc1xuICAgICAgcyA9IFtdLCAvLyBzdHJpbmcgY29uc3RhbnRzIGFuZCBwbGFjZWhvbGRlcnNcbiAgICAgIHEgPSBbXTsgLy8gbnVtYmVyIGludGVycG9sYXRvcnNcblxuICAvLyBDb2VyY2UgaW5wdXRzIHRvIHN0cmluZ3MuXG4gIGEgPSBhICsgXCJcIiwgYiA9IGIgKyBcIlwiO1xuXG4gIC8vIEludGVycG9sYXRlIHBhaXJzIG9mIG51bWJlcnMgaW4gYSAmIGIuXG4gIHdoaWxlICgoYW0gPSByZUEuZXhlYyhhKSlcbiAgICAgICYmIChibSA9IHJlQi5leGVjKGIpKSkge1xuICAgIGlmICgoYnMgPSBibS5pbmRleCkgPiBiaSkgeyAvLyBhIHN0cmluZyBwcmVjZWRlcyB0aGUgbmV4dCBudW1iZXIgaW4gYlxuICAgICAgYnMgPSBiLnNsaWNlKGJpLCBicyk7XG4gICAgICBpZiAoc1tpXSkgc1tpXSArPSBiczsgLy8gY29hbGVzY2Ugd2l0aCBwcmV2aW91cyBzdHJpbmdcbiAgICAgIGVsc2Ugc1srK2ldID0gYnM7XG4gICAgfVxuICAgIGlmICgoYW0gPSBhbVswXSkgPT09IChibSA9IGJtWzBdKSkgeyAvLyBudW1iZXJzIGluIGEgJiBiIG1hdGNoXG4gICAgICBpZiAoc1tpXSkgc1tpXSArPSBibTsgLy8gY29hbGVzY2Ugd2l0aCBwcmV2aW91cyBzdHJpbmdcbiAgICAgIGVsc2Ugc1srK2ldID0gYm07XG4gICAgfSBlbHNlIHsgLy8gaW50ZXJwb2xhdGUgbm9uLW1hdGNoaW5nIG51bWJlcnNcbiAgICAgIHNbKytpXSA9IG51bGw7XG4gICAgICBxLnB1c2goe2k6IGksIHg6IG51bWJlcihhbSwgYm0pfSk7XG4gICAgfVxuICAgIGJpID0gcmVCLmxhc3RJbmRleDtcbiAgfVxuXG4gIC8vIEFkZCByZW1haW5zIG9mIGIuXG4gIGlmIChiaSA8IGIubGVuZ3RoKSB7XG4gICAgYnMgPSBiLnNsaWNlKGJpKTtcbiAgICBpZiAoc1tpXSkgc1tpXSArPSBiczsgLy8gY29hbGVzY2Ugd2l0aCBwcmV2aW91cyBzdHJpbmdcbiAgICBlbHNlIHNbKytpXSA9IGJzO1xuICB9XG5cbiAgLy8gU3BlY2lhbCBvcHRpbWl6YXRpb24gZm9yIG9ubHkgYSBzaW5nbGUgbWF0Y2guXG4gIC8vIE90aGVyd2lzZSwgaW50ZXJwb2xhdGUgZWFjaCBvZiB0aGUgbnVtYmVycyBhbmQgcmVqb2luIHRoZSBzdHJpbmcuXG4gIHJldHVybiBzLmxlbmd0aCA8IDIgPyAocVswXVxuICAgICAgPyBvbmUocVswXS54KVxuICAgICAgOiB6ZXJvKGIpKVxuICAgICAgOiAoYiA9IHEubGVuZ3RoLCBmdW5jdGlvbih0KSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDAsIG87IGkgPCBiOyArK2kpIHNbKG8gPSBxW2ldKS5pXSA9IG8ueCh0KTtcbiAgICAgICAgICByZXR1cm4gcy5qb2luKFwiXCIpO1xuICAgICAgICB9KTtcbn1cbiIsICJpbXBvcnQge2NvbG9yfSBmcm9tIFwiZDMtY29sb3JcIjtcbmltcG9ydCByZ2IgZnJvbSBcIi4vcmdiLmpzXCI7XG5pbXBvcnQge2dlbmVyaWNBcnJheX0gZnJvbSBcIi4vYXJyYXkuanNcIjtcbmltcG9ydCBkYXRlIGZyb20gXCIuL2RhdGUuanNcIjtcbmltcG9ydCBudW1iZXIgZnJvbSBcIi4vbnVtYmVyLmpzXCI7XG5pbXBvcnQgb2JqZWN0IGZyb20gXCIuL29iamVjdC5qc1wiO1xuaW1wb3J0IHN0cmluZyBmcm9tIFwiLi9zdHJpbmcuanNcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi9jb25zdGFudC5qc1wiO1xuaW1wb3J0IG51bWJlckFycmF5LCB7aXNOdW1iZXJBcnJheX0gZnJvbSBcIi4vbnVtYmVyQXJyYXkuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICB2YXIgdCA9IHR5cGVvZiBiLCBjO1xuICByZXR1cm4gYiA9PSBudWxsIHx8IHQgPT09IFwiYm9vbGVhblwiID8gY29uc3RhbnQoYilcbiAgICAgIDogKHQgPT09IFwibnVtYmVyXCIgPyBudW1iZXJcbiAgICAgIDogdCA9PT0gXCJzdHJpbmdcIiA/ICgoYyA9IGNvbG9yKGIpKSA/IChiID0gYywgcmdiKSA6IHN0cmluZylcbiAgICAgIDogYiBpbnN0YW5jZW9mIGNvbG9yID8gcmdiXG4gICAgICA6IGIgaW5zdGFuY2VvZiBEYXRlID8gZGF0ZVxuICAgICAgOiBpc051bWJlckFycmF5KGIpID8gbnVtYmVyQXJyYXlcbiAgICAgIDogQXJyYXkuaXNBcnJheShiKSA/IGdlbmVyaWNBcnJheVxuICAgICAgOiB0eXBlb2YgYi52YWx1ZU9mICE9PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIGIudG9TdHJpbmcgIT09IFwiZnVuY3Rpb25cIiB8fCBpc05hTihiKSA/IG9iamVjdFxuICAgICAgOiBudW1iZXIpKGEsIGIpO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIGEgPSArYSwgYiA9ICtiLCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoYSAqICgxIC0gdCkgKyBiICogdCk7XG4gIH07XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29uc3RhbnRzKHgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB4O1xuICB9O1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG51bWJlcih4KSB7XG4gIHJldHVybiAreDtcbn1cbiIsICJpbXBvcnQge2Jpc2VjdH0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQge2ludGVycG9sYXRlIGFzIGludGVycG9sYXRlVmFsdWUsIGludGVycG9sYXRlTnVtYmVyLCBpbnRlcnBvbGF0ZVJvdW5kfSBmcm9tIFwiZDMtaW50ZXJwb2xhdGVcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi9jb25zdGFudC5qc1wiO1xuaW1wb3J0IG51bWJlciBmcm9tIFwiLi9udW1iZXIuanNcIjtcblxudmFyIHVuaXQgPSBbMCwgMV07XG5cbmV4cG9ydCBmdW5jdGlvbiBpZGVudGl0eSh4KSB7XG4gIHJldHVybiB4O1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemUoYSwgYikge1xuICByZXR1cm4gKGIgLT0gKGEgPSArYSkpXG4gICAgICA/IGZ1bmN0aW9uKHgpIHsgcmV0dXJuICh4IC0gYSkgLyBiOyB9XG4gICAgICA6IGNvbnN0YW50KGlzTmFOKGIpID8gTmFOIDogMC41KTtcbn1cblxuZnVuY3Rpb24gY2xhbXBlcihhLCBiKSB7XG4gIHZhciB0O1xuICBpZiAoYSA+IGIpIHQgPSBhLCBhID0gYiwgYiA9IHQ7XG4gIHJldHVybiBmdW5jdGlvbih4KSB7IHJldHVybiBNYXRoLm1heChhLCBNYXRoLm1pbihiLCB4KSk7IH07XG59XG5cbi8vIG5vcm1hbGl6ZShhLCBiKSh4KSB0YWtlcyBhIGRvbWFpbiB2YWx1ZSB4IGluIFthLGJdIGFuZCByZXR1cm5zIHRoZSBjb3JyZXNwb25kaW5nIHBhcmFtZXRlciB0IGluIFswLDFdLlxuLy8gaW50ZXJwb2xhdGUoYSwgYikodCkgdGFrZXMgYSBwYXJhbWV0ZXIgdCBpbiBbMCwxXSBhbmQgcmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyByYW5nZSB2YWx1ZSB4IGluIFthLGJdLlxuZnVuY3Rpb24gYmltYXAoZG9tYWluLCByYW5nZSwgaW50ZXJwb2xhdGUpIHtcbiAgdmFyIGQwID0gZG9tYWluWzBdLCBkMSA9IGRvbWFpblsxXSwgcjAgPSByYW5nZVswXSwgcjEgPSByYW5nZVsxXTtcbiAgaWYgKGQxIDwgZDApIGQwID0gbm9ybWFsaXplKGQxLCBkMCksIHIwID0gaW50ZXJwb2xhdGUocjEsIHIwKTtcbiAgZWxzZSBkMCA9IG5vcm1hbGl6ZShkMCwgZDEpLCByMCA9IGludGVycG9sYXRlKHIwLCByMSk7XG4gIHJldHVybiBmdW5jdGlvbih4KSB7IHJldHVybiByMChkMCh4KSk7IH07XG59XG5cbmZ1bmN0aW9uIHBvbHltYXAoZG9tYWluLCByYW5nZSwgaW50ZXJwb2xhdGUpIHtcbiAgdmFyIGogPSBNYXRoLm1pbihkb21haW4ubGVuZ3RoLCByYW5nZS5sZW5ndGgpIC0gMSxcbiAgICAgIGQgPSBuZXcgQXJyYXkoaiksXG4gICAgICByID0gbmV3IEFycmF5KGopLFxuICAgICAgaSA9IC0xO1xuXG4gIC8vIFJldmVyc2UgZGVzY2VuZGluZyBkb21haW5zLlxuICBpZiAoZG9tYWluW2pdIDwgZG9tYWluWzBdKSB7XG4gICAgZG9tYWluID0gZG9tYWluLnNsaWNlKCkucmV2ZXJzZSgpO1xuICAgIHJhbmdlID0gcmFuZ2Uuc2xpY2UoKS5yZXZlcnNlKCk7XG4gIH1cblxuICB3aGlsZSAoKytpIDwgaikge1xuICAgIGRbaV0gPSBub3JtYWxpemUoZG9tYWluW2ldLCBkb21haW5baSArIDFdKTtcbiAgICByW2ldID0gaW50ZXJwb2xhdGUocmFuZ2VbaV0sIHJhbmdlW2kgKyAxXSk7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgIHZhciBpID0gYmlzZWN0KGRvbWFpbiwgeCwgMSwgaikgLSAxO1xuICAgIHJldHVybiByW2ldKGRbaV0oeCkpO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29weShzb3VyY2UsIHRhcmdldCkge1xuICByZXR1cm4gdGFyZ2V0XG4gICAgICAuZG9tYWluKHNvdXJjZS5kb21haW4oKSlcbiAgICAgIC5yYW5nZShzb3VyY2UucmFuZ2UoKSlcbiAgICAgIC5pbnRlcnBvbGF0ZShzb3VyY2UuaW50ZXJwb2xhdGUoKSlcbiAgICAgIC5jbGFtcChzb3VyY2UuY2xhbXAoKSlcbiAgICAgIC51bmtub3duKHNvdXJjZS51bmtub3duKCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNmb3JtZXIoKSB7XG4gIHZhciBkb21haW4gPSB1bml0LFxuICAgICAgcmFuZ2UgPSB1bml0LFxuICAgICAgaW50ZXJwb2xhdGUgPSBpbnRlcnBvbGF0ZVZhbHVlLFxuICAgICAgdHJhbnNmb3JtLFxuICAgICAgdW50cmFuc2Zvcm0sXG4gICAgICB1bmtub3duLFxuICAgICAgY2xhbXAgPSBpZGVudGl0eSxcbiAgICAgIHBpZWNld2lzZSxcbiAgICAgIG91dHB1dCxcbiAgICAgIGlucHV0O1xuXG4gIGZ1bmN0aW9uIHJlc2NhbGUoKSB7XG4gICAgdmFyIG4gPSBNYXRoLm1pbihkb21haW4ubGVuZ3RoLCByYW5nZS5sZW5ndGgpO1xuICAgIGlmIChjbGFtcCAhPT0gaWRlbnRpdHkpIGNsYW1wID0gY2xhbXBlcihkb21haW5bMF0sIGRvbWFpbltuIC0gMV0pO1xuICAgIHBpZWNld2lzZSA9IG4gPiAyID8gcG9seW1hcCA6IGJpbWFwO1xuICAgIG91dHB1dCA9IGlucHV0ID0gbnVsbDtcbiAgICByZXR1cm4gc2NhbGU7XG4gIH1cblxuICBmdW5jdGlvbiBzY2FsZSh4KSB7XG4gICAgcmV0dXJuIHggPT0gbnVsbCB8fCBpc05hTih4ID0gK3gpID8gdW5rbm93biA6IChvdXRwdXQgfHwgKG91dHB1dCA9IHBpZWNld2lzZShkb21haW4ubWFwKHRyYW5zZm9ybSksIHJhbmdlLCBpbnRlcnBvbGF0ZSkpKSh0cmFuc2Zvcm0oY2xhbXAoeCkpKTtcbiAgfVxuXG4gIHNjYWxlLmludmVydCA9IGZ1bmN0aW9uKHkpIHtcbiAgICByZXR1cm4gY2xhbXAodW50cmFuc2Zvcm0oKGlucHV0IHx8IChpbnB1dCA9IHBpZWNld2lzZShyYW5nZSwgZG9tYWluLm1hcCh0cmFuc2Zvcm0pLCBpbnRlcnBvbGF0ZU51bWJlcikpKSh5KSkpO1xuICB9O1xuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkb21haW4gPSBBcnJheS5mcm9tKF8sIG51bWJlciksIHJlc2NhbGUoKSkgOiBkb21haW4uc2xpY2UoKTtcbiAgfTtcblxuICBzY2FsZS5yYW5nZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChyYW5nZSA9IEFycmF5LmZyb20oXyksIHJlc2NhbGUoKSkgOiByYW5nZS5zbGljZSgpO1xuICB9O1xuXG4gIHNjYWxlLnJhbmdlUm91bmQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIHJhbmdlID0gQXJyYXkuZnJvbShfKSwgaW50ZXJwb2xhdGUgPSBpbnRlcnBvbGF0ZVJvdW5kLCByZXNjYWxlKCk7XG4gIH07XG5cbiAgc2NhbGUuY2xhbXAgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoY2xhbXAgPSBfID8gdHJ1ZSA6IGlkZW50aXR5LCByZXNjYWxlKCkpIDogY2xhbXAgIT09IGlkZW50aXR5O1xuICB9O1xuXG4gIHNjYWxlLmludGVycG9sYXRlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGludGVycG9sYXRlID0gXywgcmVzY2FsZSgpKSA6IGludGVycG9sYXRlO1xuICB9O1xuXG4gIHNjYWxlLnVua25vd24gPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAodW5rbm93biA9IF8sIHNjYWxlKSA6IHVua25vd247XG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHQsIHUpIHtcbiAgICB0cmFuc2Zvcm0gPSB0LCB1bnRyYW5zZm9ybSA9IHU7XG4gICAgcmV0dXJuIHJlc2NhbGUoKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29udGludW91cygpIHtcbiAgcmV0dXJuIHRyYW5zZm9ybWVyKCkoaWRlbnRpdHksIGlkZW50aXR5KTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiBNYXRoLmFicyh4ID0gTWF0aC5yb3VuZCh4KSkgPj0gMWUyMVxuICAgICAgPyB4LnRvTG9jYWxlU3RyaW5nKFwiZW5cIikucmVwbGFjZSgvLC9nLCBcIlwiKVxuICAgICAgOiB4LnRvU3RyaW5nKDEwKTtcbn1cblxuLy8gQ29tcHV0ZXMgdGhlIGRlY2ltYWwgY29lZmZpY2llbnQgYW5kIGV4cG9uZW50IG9mIHRoZSBzcGVjaWZpZWQgbnVtYmVyIHggd2l0aFxuLy8gc2lnbmlmaWNhbnQgZGlnaXRzIHAsIHdoZXJlIHggaXMgcG9zaXRpdmUgYW5kIHAgaXMgaW4gWzEsIDIxXSBvciB1bmRlZmluZWQuXG4vLyBGb3IgZXhhbXBsZSwgZm9ybWF0RGVjaW1hbFBhcnRzKDEuMjMpIHJldHVybnMgW1wiMTIzXCIsIDBdLlxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdERlY2ltYWxQYXJ0cyh4LCBwKSB7XG4gIGlmICghaXNGaW5pdGUoeCkgfHwgeCA9PT0gMCkgcmV0dXJuIG51bGw7IC8vIE5hTiwgXHUwMEIxSW5maW5pdHksIFx1MDBCMTBcbiAgdmFyIGkgPSAoeCA9IHAgPyB4LnRvRXhwb25lbnRpYWwocCAtIDEpIDogeC50b0V4cG9uZW50aWFsKCkpLmluZGV4T2YoXCJlXCIpLCBjb2VmZmljaWVudCA9IHguc2xpY2UoMCwgaSk7XG5cbiAgLy8gVGhlIHN0cmluZyByZXR1cm5lZCBieSB0b0V4cG9uZW50aWFsIGVpdGhlciBoYXMgdGhlIGZvcm0gXFxkXFwuXFxkK2VbLStdXFxkK1xuICAvLyAoZS5nLiwgMS4yZSszKSBvciB0aGUgZm9ybSBcXGRlWy0rXVxcZCsgKGUuZy4sIDFlKzMpLlxuICByZXR1cm4gW1xuICAgIGNvZWZmaWNpZW50Lmxlbmd0aCA+IDEgPyBjb2VmZmljaWVudFswXSArIGNvZWZmaWNpZW50LnNsaWNlKDIpIDogY29lZmZpY2llbnQsXG4gICAgK3guc2xpY2UoaSArIDEpXG4gIF07XG59XG4iLCAiaW1wb3J0IHtmb3JtYXREZWNpbWFsUGFydHN9IGZyb20gXCIuL2Zvcm1hdERlY2ltYWwuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4geCA9IGZvcm1hdERlY2ltYWxQYXJ0cyhNYXRoLmFicyh4KSksIHggPyB4WzFdIDogTmFOO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGdyb3VwaW5nLCB0aG91c2FuZHMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlLCB3aWR0aCkge1xuICAgIHZhciBpID0gdmFsdWUubGVuZ3RoLFxuICAgICAgICB0ID0gW10sXG4gICAgICAgIGogPSAwLFxuICAgICAgICBnID0gZ3JvdXBpbmdbMF0sXG4gICAgICAgIGxlbmd0aCA9IDA7XG5cbiAgICB3aGlsZSAoaSA+IDAgJiYgZyA+IDApIHtcbiAgICAgIGlmIChsZW5ndGggKyBnICsgMSA+IHdpZHRoKSBnID0gTWF0aC5tYXgoMSwgd2lkdGggLSBsZW5ndGgpO1xuICAgICAgdC5wdXNoKHZhbHVlLnN1YnN0cmluZyhpIC09IGcsIGkgKyBnKSk7XG4gICAgICBpZiAoKGxlbmd0aCArPSBnICsgMSkgPiB3aWR0aCkgYnJlYWs7XG4gICAgICBnID0gZ3JvdXBpbmdbaiA9IChqICsgMSkgJSBncm91cGluZy5sZW5ndGhdO1xuICAgIH1cblxuICAgIHJldHVybiB0LnJldmVyc2UoKS5qb2luKHRob3VzYW5kcyk7XG4gIH07XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obnVtZXJhbHMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlLnJlcGxhY2UoL1swLTldL2csIGZ1bmN0aW9uKGkpIHtcbiAgICAgIHJldHVybiBudW1lcmFsc1sraV07XG4gICAgfSk7XG4gIH07XG59XG4iLCAiLy8gW1tmaWxsXWFsaWduXVtzaWduXVtzeW1ib2xdWzBdW3dpZHRoXVssXVsucHJlY2lzaW9uXVt+XVt0eXBlXVxudmFyIHJlID0gL14oPzooLik/KFs8Pj1eXSkpPyhbK1xcLSggXSk/KFskI10pPygwKT8oXFxkKyk/KCwpPyhcXC5cXGQrKT8ofik/KFthLXolXSk/JC9pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKSB7XG4gIGlmICghKG1hdGNoID0gcmUuZXhlYyhzcGVjaWZpZXIpKSkgdGhyb3cgbmV3IEVycm9yKFwiaW52YWxpZCBmb3JtYXQ6IFwiICsgc3BlY2lmaWVyKTtcbiAgdmFyIG1hdGNoO1xuICByZXR1cm4gbmV3IEZvcm1hdFNwZWNpZmllcih7XG4gICAgZmlsbDogbWF0Y2hbMV0sXG4gICAgYWxpZ246IG1hdGNoWzJdLFxuICAgIHNpZ246IG1hdGNoWzNdLFxuICAgIHN5bWJvbDogbWF0Y2hbNF0sXG4gICAgemVybzogbWF0Y2hbNV0sXG4gICAgd2lkdGg6IG1hdGNoWzZdLFxuICAgIGNvbW1hOiBtYXRjaFs3XSxcbiAgICBwcmVjaXNpb246IG1hdGNoWzhdICYmIG1hdGNoWzhdLnNsaWNlKDEpLFxuICAgIHRyaW06IG1hdGNoWzldLFxuICAgIHR5cGU6IG1hdGNoWzEwXVxuICB9KTtcbn1cblxuZm9ybWF0U3BlY2lmaWVyLnByb3RvdHlwZSA9IEZvcm1hdFNwZWNpZmllci5wcm90b3R5cGU7IC8vIGluc3RhbmNlb2ZcblxuZXhwb3J0IGZ1bmN0aW9uIEZvcm1hdFNwZWNpZmllcihzcGVjaWZpZXIpIHtcbiAgdGhpcy5maWxsID0gc3BlY2lmaWVyLmZpbGwgPT09IHVuZGVmaW5lZCA/IFwiIFwiIDogc3BlY2lmaWVyLmZpbGwgKyBcIlwiO1xuICB0aGlzLmFsaWduID0gc3BlY2lmaWVyLmFsaWduID09PSB1bmRlZmluZWQgPyBcIj5cIiA6IHNwZWNpZmllci5hbGlnbiArIFwiXCI7XG4gIHRoaXMuc2lnbiA9IHNwZWNpZmllci5zaWduID09PSB1bmRlZmluZWQgPyBcIi1cIiA6IHNwZWNpZmllci5zaWduICsgXCJcIjtcbiAgdGhpcy5zeW1ib2wgPSBzcGVjaWZpZXIuc3ltYm9sID09PSB1bmRlZmluZWQgPyBcIlwiIDogc3BlY2lmaWVyLnN5bWJvbCArIFwiXCI7XG4gIHRoaXMuemVybyA9ICEhc3BlY2lmaWVyLnplcm87XG4gIHRoaXMud2lkdGggPSBzcGVjaWZpZXIud2lkdGggPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6ICtzcGVjaWZpZXIud2lkdGg7XG4gIHRoaXMuY29tbWEgPSAhIXNwZWNpZmllci5jb21tYTtcbiAgdGhpcy5wcmVjaXNpb24gPSBzcGVjaWZpZXIucHJlY2lzaW9uID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiArc3BlY2lmaWVyLnByZWNpc2lvbjtcbiAgdGhpcy50cmltID0gISFzcGVjaWZpZXIudHJpbTtcbiAgdGhpcy50eXBlID0gc3BlY2lmaWVyLnR5cGUgPT09IHVuZGVmaW5lZCA/IFwiXCIgOiBzcGVjaWZpZXIudHlwZSArIFwiXCI7XG59XG5cbkZvcm1hdFNwZWNpZmllci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZmlsbFxuICAgICAgKyB0aGlzLmFsaWduXG4gICAgICArIHRoaXMuc2lnblxuICAgICAgKyB0aGlzLnN5bWJvbFxuICAgICAgKyAodGhpcy56ZXJvID8gXCIwXCIgOiBcIlwiKVxuICAgICAgKyAodGhpcy53aWR0aCA9PT0gdW5kZWZpbmVkID8gXCJcIiA6IE1hdGgubWF4KDEsIHRoaXMud2lkdGggfCAwKSlcbiAgICAgICsgKHRoaXMuY29tbWEgPyBcIixcIiA6IFwiXCIpXG4gICAgICArICh0aGlzLnByZWNpc2lvbiA9PT0gdW5kZWZpbmVkID8gXCJcIiA6IFwiLlwiICsgTWF0aC5tYXgoMCwgdGhpcy5wcmVjaXNpb24gfCAwKSlcbiAgICAgICsgKHRoaXMudHJpbSA/IFwiflwiIDogXCJcIilcbiAgICAgICsgdGhpcy50eXBlO1xufTtcbiIsICIvLyBUcmltcyBpbnNpZ25pZmljYW50IHplcm9zLCBlLmcuLCByZXBsYWNlcyAxLjIwMDBrIHdpdGggMS4yay5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHMpIHtcbiAgb3V0OiBmb3IgKHZhciBuID0gcy5sZW5ndGgsIGkgPSAxLCBpMCA9IC0xLCBpMTsgaSA8IG47ICsraSkge1xuICAgIHN3aXRjaCAoc1tpXSkge1xuICAgICAgY2FzZSBcIi5cIjogaTAgPSBpMSA9IGk7IGJyZWFrO1xuICAgICAgY2FzZSBcIjBcIjogaWYgKGkwID09PSAwKSBpMCA9IGk7IGkxID0gaTsgYnJlYWs7XG4gICAgICBkZWZhdWx0OiBpZiAoIStzW2ldKSBicmVhayBvdXQ7IGlmIChpMCA+IDApIGkwID0gMDsgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiBpMCA+IDAgPyBzLnNsaWNlKDAsIGkwKSArIHMuc2xpY2UoaTEgKyAxKSA6IHM7XG59XG4iLCAiaW1wb3J0IHtmb3JtYXREZWNpbWFsUGFydHN9IGZyb20gXCIuL2Zvcm1hdERlY2ltYWwuanNcIjtcblxuZXhwb3J0IHZhciBwcmVmaXhFeHBvbmVudDtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCwgcCkge1xuICB2YXIgZCA9IGZvcm1hdERlY2ltYWxQYXJ0cyh4LCBwKTtcbiAgaWYgKCFkKSByZXR1cm4gcHJlZml4RXhwb25lbnQgPSB1bmRlZmluZWQsIHgudG9QcmVjaXNpb24ocCk7XG4gIHZhciBjb2VmZmljaWVudCA9IGRbMF0sXG4gICAgICBleHBvbmVudCA9IGRbMV0sXG4gICAgICBpID0gZXhwb25lbnQgLSAocHJlZml4RXhwb25lbnQgPSBNYXRoLm1heCgtOCwgTWF0aC5taW4oOCwgTWF0aC5mbG9vcihleHBvbmVudCAvIDMpKSkgKiAzKSArIDEsXG4gICAgICBuID0gY29lZmZpY2llbnQubGVuZ3RoO1xuICByZXR1cm4gaSA9PT0gbiA/IGNvZWZmaWNpZW50XG4gICAgICA6IGkgPiBuID8gY29lZmZpY2llbnQgKyBuZXcgQXJyYXkoaSAtIG4gKyAxKS5qb2luKFwiMFwiKVxuICAgICAgOiBpID4gMCA/IGNvZWZmaWNpZW50LnNsaWNlKDAsIGkpICsgXCIuXCIgKyBjb2VmZmljaWVudC5zbGljZShpKVxuICAgICAgOiBcIjAuXCIgKyBuZXcgQXJyYXkoMSAtIGkpLmpvaW4oXCIwXCIpICsgZm9ybWF0RGVjaW1hbFBhcnRzKHgsIE1hdGgubWF4KDAsIHAgKyBpIC0gMSkpWzBdOyAvLyBsZXNzIHRoYW4gMXkhXG59XG4iLCAiaW1wb3J0IHtmb3JtYXREZWNpbWFsUGFydHN9IGZyb20gXCIuL2Zvcm1hdERlY2ltYWwuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCwgcCkge1xuICB2YXIgZCA9IGZvcm1hdERlY2ltYWxQYXJ0cyh4LCBwKTtcbiAgaWYgKCFkKSByZXR1cm4geCArIFwiXCI7XG4gIHZhciBjb2VmZmljaWVudCA9IGRbMF0sXG4gICAgICBleHBvbmVudCA9IGRbMV07XG4gIHJldHVybiBleHBvbmVudCA8IDAgPyBcIjAuXCIgKyBuZXcgQXJyYXkoLWV4cG9uZW50KS5qb2luKFwiMFwiKSArIGNvZWZmaWNpZW50XG4gICAgICA6IGNvZWZmaWNpZW50Lmxlbmd0aCA+IGV4cG9uZW50ICsgMSA/IGNvZWZmaWNpZW50LnNsaWNlKDAsIGV4cG9uZW50ICsgMSkgKyBcIi5cIiArIGNvZWZmaWNpZW50LnNsaWNlKGV4cG9uZW50ICsgMSlcbiAgICAgIDogY29lZmZpY2llbnQgKyBuZXcgQXJyYXkoZXhwb25lbnQgLSBjb2VmZmljaWVudC5sZW5ndGggKyAyKS5qb2luKFwiMFwiKTtcbn1cbiIsICJpbXBvcnQgZm9ybWF0RGVjaW1hbCBmcm9tIFwiLi9mb3JtYXREZWNpbWFsLmpzXCI7XG5pbXBvcnQgZm9ybWF0UHJlZml4QXV0byBmcm9tIFwiLi9mb3JtYXRQcmVmaXhBdXRvLmpzXCI7XG5pbXBvcnQgZm9ybWF0Um91bmRlZCBmcm9tIFwiLi9mb3JtYXRSb3VuZGVkLmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgXCIlXCI6ICh4LCBwKSA9PiAoeCAqIDEwMCkudG9GaXhlZChwKSxcbiAgXCJiXCI6ICh4KSA9PiBNYXRoLnJvdW5kKHgpLnRvU3RyaW5nKDIpLFxuICBcImNcIjogKHgpID0+IHggKyBcIlwiLFxuICBcImRcIjogZm9ybWF0RGVjaW1hbCxcbiAgXCJlXCI6ICh4LCBwKSA9PiB4LnRvRXhwb25lbnRpYWwocCksXG4gIFwiZlwiOiAoeCwgcCkgPT4geC50b0ZpeGVkKHApLFxuICBcImdcIjogKHgsIHApID0+IHgudG9QcmVjaXNpb24ocCksXG4gIFwib1wiOiAoeCkgPT4gTWF0aC5yb3VuZCh4KS50b1N0cmluZyg4KSxcbiAgXCJwXCI6ICh4LCBwKSA9PiBmb3JtYXRSb3VuZGVkKHggKiAxMDAsIHApLFxuICBcInJcIjogZm9ybWF0Um91bmRlZCxcbiAgXCJzXCI6IGZvcm1hdFByZWZpeEF1dG8sXG4gIFwiWFwiOiAoeCkgPT4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKSxcbiAgXCJ4XCI6ICh4KSA9PiBNYXRoLnJvdW5kKHgpLnRvU3RyaW5nKDE2KVxufTtcbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB4O1xufVxuIiwgImltcG9ydCBleHBvbmVudCBmcm9tIFwiLi9leHBvbmVudC5qc1wiO1xuaW1wb3J0IGZvcm1hdEdyb3VwIGZyb20gXCIuL2Zvcm1hdEdyb3VwLmpzXCI7XG5pbXBvcnQgZm9ybWF0TnVtZXJhbHMgZnJvbSBcIi4vZm9ybWF0TnVtZXJhbHMuanNcIjtcbmltcG9ydCBmb3JtYXRTcGVjaWZpZXIgZnJvbSBcIi4vZm9ybWF0U3BlY2lmaWVyLmpzXCI7XG5pbXBvcnQgZm9ybWF0VHJpbSBmcm9tIFwiLi9mb3JtYXRUcmltLmpzXCI7XG5pbXBvcnQgZm9ybWF0VHlwZXMgZnJvbSBcIi4vZm9ybWF0VHlwZXMuanNcIjtcbmltcG9ydCB7cHJlZml4RXhwb25lbnR9IGZyb20gXCIuL2Zvcm1hdFByZWZpeEF1dG8uanNcIjtcbmltcG9ydCBpZGVudGl0eSBmcm9tIFwiLi9pZGVudGl0eS5qc1wiO1xuXG52YXIgbWFwID0gQXJyYXkucHJvdG90eXBlLm1hcCxcbiAgICBwcmVmaXhlcyA9IFtcInlcIixcInpcIixcImFcIixcImZcIixcInBcIixcIm5cIixcIlx1MDBCNVwiLFwibVwiLFwiXCIsXCJrXCIsXCJNXCIsXCJHXCIsXCJUXCIsXCJQXCIsXCJFXCIsXCJaXCIsXCJZXCJdO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihsb2NhbGUpIHtcbiAgdmFyIGdyb3VwID0gbG9jYWxlLmdyb3VwaW5nID09PSB1bmRlZmluZWQgfHwgbG9jYWxlLnRob3VzYW5kcyA9PT0gdW5kZWZpbmVkID8gaWRlbnRpdHkgOiBmb3JtYXRHcm91cChtYXAuY2FsbChsb2NhbGUuZ3JvdXBpbmcsIE51bWJlciksIGxvY2FsZS50aG91c2FuZHMgKyBcIlwiKSxcbiAgICAgIGN1cnJlbmN5UHJlZml4ID0gbG9jYWxlLmN1cnJlbmN5ID09PSB1bmRlZmluZWQgPyBcIlwiIDogbG9jYWxlLmN1cnJlbmN5WzBdICsgXCJcIixcbiAgICAgIGN1cnJlbmN5U3VmZml4ID0gbG9jYWxlLmN1cnJlbmN5ID09PSB1bmRlZmluZWQgPyBcIlwiIDogbG9jYWxlLmN1cnJlbmN5WzFdICsgXCJcIixcbiAgICAgIGRlY2ltYWwgPSBsb2NhbGUuZGVjaW1hbCA9PT0gdW5kZWZpbmVkID8gXCIuXCIgOiBsb2NhbGUuZGVjaW1hbCArIFwiXCIsXG4gICAgICBudW1lcmFscyA9IGxvY2FsZS5udW1lcmFscyA9PT0gdW5kZWZpbmVkID8gaWRlbnRpdHkgOiBmb3JtYXROdW1lcmFscyhtYXAuY2FsbChsb2NhbGUubnVtZXJhbHMsIFN0cmluZykpLFxuICAgICAgcGVyY2VudCA9IGxvY2FsZS5wZXJjZW50ID09PSB1bmRlZmluZWQgPyBcIiVcIiA6IGxvY2FsZS5wZXJjZW50ICsgXCJcIixcbiAgICAgIG1pbnVzID0gbG9jYWxlLm1pbnVzID09PSB1bmRlZmluZWQgPyBcIlx1MjIxMlwiIDogbG9jYWxlLm1pbnVzICsgXCJcIixcbiAgICAgIG5hbiA9IGxvY2FsZS5uYW4gPT09IHVuZGVmaW5lZCA/IFwiTmFOXCIgOiBsb2NhbGUubmFuICsgXCJcIjtcblxuICBmdW5jdGlvbiBuZXdGb3JtYXQoc3BlY2lmaWVyLCBvcHRpb25zKSB7XG4gICAgc3BlY2lmaWVyID0gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllcik7XG5cbiAgICB2YXIgZmlsbCA9IHNwZWNpZmllci5maWxsLFxuICAgICAgICBhbGlnbiA9IHNwZWNpZmllci5hbGlnbixcbiAgICAgICAgc2lnbiA9IHNwZWNpZmllci5zaWduLFxuICAgICAgICBzeW1ib2wgPSBzcGVjaWZpZXIuc3ltYm9sLFxuICAgICAgICB6ZXJvID0gc3BlY2lmaWVyLnplcm8sXG4gICAgICAgIHdpZHRoID0gc3BlY2lmaWVyLndpZHRoLFxuICAgICAgICBjb21tYSA9IHNwZWNpZmllci5jb21tYSxcbiAgICAgICAgcHJlY2lzaW9uID0gc3BlY2lmaWVyLnByZWNpc2lvbixcbiAgICAgICAgdHJpbSA9IHNwZWNpZmllci50cmltLFxuICAgICAgICB0eXBlID0gc3BlY2lmaWVyLnR5cGU7XG5cbiAgICAvLyBUaGUgXCJuXCIgdHlwZSBpcyBhbiBhbGlhcyBmb3IgXCIsZ1wiLlxuICAgIGlmICh0eXBlID09PSBcIm5cIikgY29tbWEgPSB0cnVlLCB0eXBlID0gXCJnXCI7XG5cbiAgICAvLyBUaGUgXCJcIiB0eXBlLCBhbmQgYW55IGludmFsaWQgdHlwZSwgaXMgYW4gYWxpYXMgZm9yIFwiLjEyfmdcIi5cbiAgICBlbHNlIGlmICghZm9ybWF0VHlwZXNbdHlwZV0pIHByZWNpc2lvbiA9PT0gdW5kZWZpbmVkICYmIChwcmVjaXNpb24gPSAxMiksIHRyaW0gPSB0cnVlLCB0eXBlID0gXCJnXCI7XG5cbiAgICAvLyBJZiB6ZXJvIGZpbGwgaXMgc3BlY2lmaWVkLCBwYWRkaW5nIGdvZXMgYWZ0ZXIgc2lnbiBhbmQgYmVmb3JlIGRpZ2l0cy5cbiAgICBpZiAoemVybyB8fCAoZmlsbCA9PT0gXCIwXCIgJiYgYWxpZ24gPT09IFwiPVwiKSkgemVybyA9IHRydWUsIGZpbGwgPSBcIjBcIiwgYWxpZ24gPSBcIj1cIjtcblxuICAgIC8vIENvbXB1dGUgdGhlIHByZWZpeCBhbmQgc3VmZml4LlxuICAgIC8vIEZvciBTSS1wcmVmaXgsIHRoZSBzdWZmaXggaXMgbGF6aWx5IGNvbXB1dGVkLlxuICAgIHZhciBwcmVmaXggPSAob3B0aW9ucyAmJiBvcHRpb25zLnByZWZpeCAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5wcmVmaXggOiBcIlwiKSArIChzeW1ib2wgPT09IFwiJFwiID8gY3VycmVuY3lQcmVmaXggOiBzeW1ib2wgPT09IFwiI1wiICYmIC9bYm94WF0vLnRlc3QodHlwZSkgPyBcIjBcIiArIHR5cGUudG9Mb3dlckNhc2UoKSA6IFwiXCIpLFxuICAgICAgICBzdWZmaXggPSAoc3ltYm9sID09PSBcIiRcIiA/IGN1cnJlbmN5U3VmZml4IDogL1slcF0vLnRlc3QodHlwZSkgPyBwZXJjZW50IDogXCJcIikgKyAob3B0aW9ucyAmJiBvcHRpb25zLnN1ZmZpeCAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5zdWZmaXggOiBcIlwiKTtcblxuICAgIC8vIFdoYXQgZm9ybWF0IGZ1bmN0aW9uIHNob3VsZCB3ZSB1c2U/XG4gICAgLy8gSXMgdGhpcyBhbiBpbnRlZ2VyIHR5cGU/XG4gICAgLy8gQ2FuIHRoaXMgdHlwZSBnZW5lcmF0ZSBleHBvbmVudGlhbCBub3RhdGlvbj9cbiAgICB2YXIgZm9ybWF0VHlwZSA9IGZvcm1hdFR5cGVzW3R5cGVdLFxuICAgICAgICBtYXliZVN1ZmZpeCA9IC9bZGVmZ3BycyVdLy50ZXN0KHR5cGUpO1xuXG4gICAgLy8gU2V0IHRoZSBkZWZhdWx0IHByZWNpc2lvbiBpZiBub3Qgc3BlY2lmaWVkLFxuICAgIC8vIG9yIGNsYW1wIHRoZSBzcGVjaWZpZWQgcHJlY2lzaW9uIHRvIHRoZSBzdXBwb3J0ZWQgcmFuZ2UuXG4gICAgLy8gRm9yIHNpZ25pZmljYW50IHByZWNpc2lvbiwgaXQgbXVzdCBiZSBpbiBbMSwgMjFdLlxuICAgIC8vIEZvciBmaXhlZCBwcmVjaXNpb24sIGl0IG11c3QgYmUgaW4gWzAsIDIwXS5cbiAgICBwcmVjaXNpb24gPSBwcmVjaXNpb24gPT09IHVuZGVmaW5lZCA/IDZcbiAgICAgICAgOiAvW2dwcnNdLy50ZXN0KHR5cGUpID8gTWF0aC5tYXgoMSwgTWF0aC5taW4oMjEsIHByZWNpc2lvbikpXG4gICAgICAgIDogTWF0aC5tYXgoMCwgTWF0aC5taW4oMjAsIHByZWNpc2lvbikpO1xuXG4gICAgZnVuY3Rpb24gZm9ybWF0KHZhbHVlKSB7XG4gICAgICB2YXIgdmFsdWVQcmVmaXggPSBwcmVmaXgsXG4gICAgICAgICAgdmFsdWVTdWZmaXggPSBzdWZmaXgsXG4gICAgICAgICAgaSwgbiwgYztcblxuICAgICAgaWYgKHR5cGUgPT09IFwiY1wiKSB7XG4gICAgICAgIHZhbHVlU3VmZml4ID0gZm9ybWF0VHlwZSh2YWx1ZSkgKyB2YWx1ZVN1ZmZpeDtcbiAgICAgICAgdmFsdWUgPSBcIlwiO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSArdmFsdWU7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIHRoZSBzaWduLiAtMCBpcyBub3QgbGVzcyB0aGFuIDAsIGJ1dCAxIC8gLTAgaXMhXG4gICAgICAgIHZhciB2YWx1ZU5lZ2F0aXZlID0gdmFsdWUgPCAwIHx8IDEgLyB2YWx1ZSA8IDA7XG5cbiAgICAgICAgLy8gUGVyZm9ybSB0aGUgaW5pdGlhbCBmb3JtYXR0aW5nLlxuICAgICAgICB2YWx1ZSA9IGlzTmFOKHZhbHVlKSA/IG5hbiA6IGZvcm1hdFR5cGUoTWF0aC5hYnModmFsdWUpLCBwcmVjaXNpb24pO1xuXG4gICAgICAgIC8vIFRyaW0gaW5zaWduaWZpY2FudCB6ZXJvcy5cbiAgICAgICAgaWYgKHRyaW0pIHZhbHVlID0gZm9ybWF0VHJpbSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gSWYgYSBuZWdhdGl2ZSB2YWx1ZSByb3VuZHMgdG8gemVybyBhZnRlciBmb3JtYXR0aW5nLCBhbmQgbm8gZXhwbGljaXQgcG9zaXRpdmUgc2lnbiBpcyByZXF1ZXN0ZWQsIGhpZGUgdGhlIHNpZ24uXG4gICAgICAgIGlmICh2YWx1ZU5lZ2F0aXZlICYmICt2YWx1ZSA9PT0gMCAmJiBzaWduICE9PSBcIitcIikgdmFsdWVOZWdhdGl2ZSA9IGZhbHNlO1xuXG4gICAgICAgIC8vIENvbXB1dGUgdGhlIHByZWZpeCBhbmQgc3VmZml4LlxuICAgICAgICB2YWx1ZVByZWZpeCA9ICh2YWx1ZU5lZ2F0aXZlID8gKHNpZ24gPT09IFwiKFwiID8gc2lnbiA6IG1pbnVzKSA6IHNpZ24gPT09IFwiLVwiIHx8IHNpZ24gPT09IFwiKFwiID8gXCJcIiA6IHNpZ24pICsgdmFsdWVQcmVmaXg7XG4gICAgICAgIHZhbHVlU3VmZml4ID0gKHR5cGUgPT09IFwic1wiICYmICFpc05hTih2YWx1ZSkgJiYgcHJlZml4RXhwb25lbnQgIT09IHVuZGVmaW5lZCA/IHByZWZpeGVzWzggKyBwcmVmaXhFeHBvbmVudCAvIDNdIDogXCJcIikgKyB2YWx1ZVN1ZmZpeCArICh2YWx1ZU5lZ2F0aXZlICYmIHNpZ24gPT09IFwiKFwiID8gXCIpXCIgOiBcIlwiKTtcblxuICAgICAgICAvLyBCcmVhayB0aGUgZm9ybWF0dGVkIHZhbHVlIGludG8gdGhlIGludGVnZXIgXHUyMDFDdmFsdWVcdTIwMUQgcGFydCB0aGF0IGNhbiBiZVxuICAgICAgICAvLyBncm91cGVkLCBhbmQgZnJhY3Rpb25hbCBvciBleHBvbmVudGlhbCBcdTIwMUNzdWZmaXhcdTIwMUQgcGFydCB0aGF0IGlzIG5vdC5cbiAgICAgICAgaWYgKG1heWJlU3VmZml4KSB7XG4gICAgICAgICAgaSA9IC0xLCBuID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgICAgICAgICBpZiAoYyA9IHZhbHVlLmNoYXJDb2RlQXQoaSksIDQ4ID4gYyB8fCBjID4gNTcpIHtcbiAgICAgICAgICAgICAgdmFsdWVTdWZmaXggPSAoYyA9PT0gNDYgPyBkZWNpbWFsICsgdmFsdWUuc2xpY2UoaSArIDEpIDogdmFsdWUuc2xpY2UoaSkpICsgdmFsdWVTdWZmaXg7XG4gICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuc2xpY2UoMCwgaSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0aGUgZmlsbCBjaGFyYWN0ZXIgaXMgbm90IFwiMFwiLCBncm91cGluZyBpcyBhcHBsaWVkIGJlZm9yZSBwYWRkaW5nLlxuICAgICAgaWYgKGNvbW1hICYmICF6ZXJvKSB2YWx1ZSA9IGdyb3VwKHZhbHVlLCBJbmZpbml0eSk7XG5cbiAgICAgIC8vIENvbXB1dGUgdGhlIHBhZGRpbmcuXG4gICAgICB2YXIgbGVuZ3RoID0gdmFsdWVQcmVmaXgubGVuZ3RoICsgdmFsdWUubGVuZ3RoICsgdmFsdWVTdWZmaXgubGVuZ3RoLFxuICAgICAgICAgIHBhZGRpbmcgPSBsZW5ndGggPCB3aWR0aCA/IG5ldyBBcnJheSh3aWR0aCAtIGxlbmd0aCArIDEpLmpvaW4oZmlsbCkgOiBcIlwiO1xuXG4gICAgICAvLyBJZiB0aGUgZmlsbCBjaGFyYWN0ZXIgaXMgXCIwXCIsIGdyb3VwaW5nIGlzIGFwcGxpZWQgYWZ0ZXIgcGFkZGluZy5cbiAgICAgIGlmIChjb21tYSAmJiB6ZXJvKSB2YWx1ZSA9IGdyb3VwKHBhZGRpbmcgKyB2YWx1ZSwgcGFkZGluZy5sZW5ndGggPyB3aWR0aCAtIHZhbHVlU3VmZml4Lmxlbmd0aCA6IEluZmluaXR5KSwgcGFkZGluZyA9IFwiXCI7XG5cbiAgICAgIC8vIFJlY29uc3RydWN0IHRoZSBmaW5hbCBvdXRwdXQgYmFzZWQgb24gdGhlIGRlc2lyZWQgYWxpZ25tZW50LlxuICAgICAgc3dpdGNoIChhbGlnbikge1xuICAgICAgICBjYXNlIFwiPFwiOiB2YWx1ZSA9IHZhbHVlUHJlZml4ICsgdmFsdWUgKyB2YWx1ZVN1ZmZpeCArIHBhZGRpbmc7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiPVwiOiB2YWx1ZSA9IHZhbHVlUHJlZml4ICsgcGFkZGluZyArIHZhbHVlICsgdmFsdWVTdWZmaXg7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiXlwiOiB2YWx1ZSA9IHBhZGRpbmcuc2xpY2UoMCwgbGVuZ3RoID0gcGFkZGluZy5sZW5ndGggPj4gMSkgKyB2YWx1ZVByZWZpeCArIHZhbHVlICsgdmFsdWVTdWZmaXggKyBwYWRkaW5nLnNsaWNlKGxlbmd0aCk7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OiB2YWx1ZSA9IHBhZGRpbmcgKyB2YWx1ZVByZWZpeCArIHZhbHVlICsgdmFsdWVTdWZmaXg7IGJyZWFrO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbnVtZXJhbHModmFsdWUpO1xuICAgIH1cblxuICAgIGZvcm1hdC50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHNwZWNpZmllciArIFwiXCI7XG4gICAgfTtcblxuICAgIHJldHVybiBmb3JtYXQ7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRQcmVmaXgoc3BlY2lmaWVyLCB2YWx1ZSkge1xuICAgIHZhciBlID0gTWF0aC5tYXgoLTgsIE1hdGgubWluKDgsIE1hdGguZmxvb3IoZXhwb25lbnQodmFsdWUpIC8gMykpKSAqIDMsXG4gICAgICAgIGsgPSBNYXRoLnBvdygxMCwgLWUpLFxuICAgICAgICBmID0gbmV3Rm9ybWF0KChzcGVjaWZpZXIgPSBmb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKSwgc3BlY2lmaWVyLnR5cGUgPSBcImZcIiwgc3BlY2lmaWVyKSwge3N1ZmZpeDogcHJlZml4ZXNbOCArIGUgLyAzXX0pO1xuICAgIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIGYoayAqIHZhbHVlKTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBmb3JtYXQ6IG5ld0Zvcm1hdCxcbiAgICBmb3JtYXRQcmVmaXg6IGZvcm1hdFByZWZpeFxuICB9O1xufVxuIiwgImltcG9ydCBmb3JtYXRMb2NhbGUgZnJvbSBcIi4vbG9jYWxlLmpzXCI7XG5cbnZhciBsb2NhbGU7XG5leHBvcnQgdmFyIGZvcm1hdDtcbmV4cG9ydCB2YXIgZm9ybWF0UHJlZml4O1xuXG5kZWZhdWx0TG9jYWxlKHtcbiAgdGhvdXNhbmRzOiBcIixcIixcbiAgZ3JvdXBpbmc6IFszXSxcbiAgY3VycmVuY3k6IFtcIiRcIiwgXCJcIl1cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkZWZhdWx0TG9jYWxlKGRlZmluaXRpb24pIHtcbiAgbG9jYWxlID0gZm9ybWF0TG9jYWxlKGRlZmluaXRpb24pO1xuICBmb3JtYXQgPSBsb2NhbGUuZm9ybWF0O1xuICBmb3JtYXRQcmVmaXggPSBsb2NhbGUuZm9ybWF0UHJlZml4O1xuICByZXR1cm4gbG9jYWxlO1xufVxuIiwgImltcG9ydCBleHBvbmVudCBmcm9tIFwiLi9leHBvbmVudC5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzdGVwKSB7XG4gIHJldHVybiBNYXRoLm1heCgwLCAtZXhwb25lbnQoTWF0aC5hYnMoc3RlcCkpKTtcbn1cbiIsICJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnQuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RlcCwgdmFsdWUpIHtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWF4KC04LCBNYXRoLm1pbig4LCBNYXRoLmZsb29yKGV4cG9uZW50KHZhbHVlKSAvIDMpKSkgKiAzIC0gZXhwb25lbnQoTWF0aC5hYnMoc3RlcCkpKTtcbn1cbiIsICJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnQuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RlcCwgbWF4KSB7XG4gIHN0ZXAgPSBNYXRoLmFicyhzdGVwKSwgbWF4ID0gTWF0aC5hYnMobWF4KSAtIHN0ZXA7XG4gIHJldHVybiBNYXRoLm1heCgwLCBleHBvbmVudChtYXgpIC0gZXhwb25lbnQoc3RlcCkpICsgMTtcbn1cbiIsICJpbXBvcnQge3RpY2tTdGVwfSBmcm9tIFwiZDMtYXJyYXlcIjtcbmltcG9ydCB7Zm9ybWF0LCBmb3JtYXRQcmVmaXgsIGZvcm1hdFNwZWNpZmllciwgcHJlY2lzaW9uRml4ZWQsIHByZWNpc2lvblByZWZpeCwgcHJlY2lzaW9uUm91bmR9IGZyb20gXCJkMy1mb3JtYXRcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdGlja0Zvcm1hdChzdGFydCwgc3RvcCwgY291bnQsIHNwZWNpZmllcikge1xuICB2YXIgc3RlcCA9IHRpY2tTdGVwKHN0YXJ0LCBzdG9wLCBjb3VudCksXG4gICAgICBwcmVjaXNpb247XG4gIHNwZWNpZmllciA9IGZvcm1hdFNwZWNpZmllcihzcGVjaWZpZXIgPT0gbnVsbCA/IFwiLGZcIiA6IHNwZWNpZmllcik7XG4gIHN3aXRjaCAoc3BlY2lmaWVyLnR5cGUpIHtcbiAgICBjYXNlIFwic1wiOiB7XG4gICAgICB2YXIgdmFsdWUgPSBNYXRoLm1heChNYXRoLmFicyhzdGFydCksIE1hdGguYWJzKHN0b3ApKTtcbiAgICAgIGlmIChzcGVjaWZpZXIucHJlY2lzaW9uID09IG51bGwgJiYgIWlzTmFOKHByZWNpc2lvbiA9IHByZWNpc2lvblByZWZpeChzdGVwLCB2YWx1ZSkpKSBzcGVjaWZpZXIucHJlY2lzaW9uID0gcHJlY2lzaW9uO1xuICAgICAgcmV0dXJuIGZvcm1hdFByZWZpeChzcGVjaWZpZXIsIHZhbHVlKTtcbiAgICB9XG4gICAgY2FzZSBcIlwiOlxuICAgIGNhc2UgXCJlXCI6XG4gICAgY2FzZSBcImdcIjpcbiAgICBjYXNlIFwicFwiOlxuICAgIGNhc2UgXCJyXCI6IHtcbiAgICAgIGlmIChzcGVjaWZpZXIucHJlY2lzaW9uID09IG51bGwgJiYgIWlzTmFOKHByZWNpc2lvbiA9IHByZWNpc2lvblJvdW5kKHN0ZXAsIE1hdGgubWF4KE1hdGguYWJzKHN0YXJ0KSwgTWF0aC5hYnMoc3RvcCkpKSkpIHNwZWNpZmllci5wcmVjaXNpb24gPSBwcmVjaXNpb24gLSAoc3BlY2lmaWVyLnR5cGUgPT09IFwiZVwiKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjYXNlIFwiZlwiOlxuICAgIGNhc2UgXCIlXCI6IHtcbiAgICAgIGlmIChzcGVjaWZpZXIucHJlY2lzaW9uID09IG51bGwgJiYgIWlzTmFOKHByZWNpc2lvbiA9IHByZWNpc2lvbkZpeGVkKHN0ZXApKSkgc3BlY2lmaWVyLnByZWNpc2lvbiA9IHByZWNpc2lvbiAtIChzcGVjaWZpZXIudHlwZSA9PT0gXCIlXCIpICogMjtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZm9ybWF0KHNwZWNpZmllcik7XG59XG4iLCAiaW1wb3J0IHt0aWNrcywgdGlja0luY3JlbWVudH0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQgY29udGludW91cywge2NvcHl9IGZyb20gXCIuL2NvbnRpbnVvdXMuanNcIjtcbmltcG9ydCB7aW5pdFJhbmdlfSBmcm9tIFwiLi9pbml0LmpzXCI7XG5pbXBvcnQgdGlja0Zvcm1hdCBmcm9tIFwiLi90aWNrRm9ybWF0LmpzXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBsaW5lYXJpc2goc2NhbGUpIHtcbiAgdmFyIGRvbWFpbiA9IHNjYWxlLmRvbWFpbjtcblxuICBzY2FsZS50aWNrcyA9IGZ1bmN0aW9uKGNvdW50KSB7XG4gICAgdmFyIGQgPSBkb21haW4oKTtcbiAgICByZXR1cm4gdGlja3MoZFswXSwgZFtkLmxlbmd0aCAtIDFdLCBjb3VudCA9PSBudWxsID8gMTAgOiBjb3VudCk7XG4gIH07XG5cbiAgc2NhbGUudGlja0Zvcm1hdCA9IGZ1bmN0aW9uKGNvdW50LCBzcGVjaWZpZXIpIHtcbiAgICB2YXIgZCA9IGRvbWFpbigpO1xuICAgIHJldHVybiB0aWNrRm9ybWF0KGRbMF0sIGRbZC5sZW5ndGggLSAxXSwgY291bnQgPT0gbnVsbCA/IDEwIDogY291bnQsIHNwZWNpZmllcik7XG4gIH07XG5cbiAgc2NhbGUubmljZSA9IGZ1bmN0aW9uKGNvdW50KSB7XG4gICAgaWYgKGNvdW50ID09IG51bGwpIGNvdW50ID0gMTA7XG5cbiAgICB2YXIgZCA9IGRvbWFpbigpO1xuICAgIHZhciBpMCA9IDA7XG4gICAgdmFyIGkxID0gZC5sZW5ndGggLSAxO1xuICAgIHZhciBzdGFydCA9IGRbaTBdO1xuICAgIHZhciBzdG9wID0gZFtpMV07XG4gICAgdmFyIHByZXN0ZXA7XG4gICAgdmFyIHN0ZXA7XG4gICAgdmFyIG1heEl0ZXIgPSAxMDtcblxuICAgIGlmIChzdG9wIDwgc3RhcnQpIHtcbiAgICAgIHN0ZXAgPSBzdGFydCwgc3RhcnQgPSBzdG9wLCBzdG9wID0gc3RlcDtcbiAgICAgIHN0ZXAgPSBpMCwgaTAgPSBpMSwgaTEgPSBzdGVwO1xuICAgIH1cbiAgICBcbiAgICB3aGlsZSAobWF4SXRlci0tID4gMCkge1xuICAgICAgc3RlcCA9IHRpY2tJbmNyZW1lbnQoc3RhcnQsIHN0b3AsIGNvdW50KTtcbiAgICAgIGlmIChzdGVwID09PSBwcmVzdGVwKSB7XG4gICAgICAgIGRbaTBdID0gc3RhcnRcbiAgICAgICAgZFtpMV0gPSBzdG9wXG4gICAgICAgIHJldHVybiBkb21haW4oZCk7XG4gICAgICB9IGVsc2UgaWYgKHN0ZXAgPiAwKSB7XG4gICAgICAgIHN0YXJ0ID0gTWF0aC5mbG9vcihzdGFydCAvIHN0ZXApICogc3RlcDtcbiAgICAgICAgc3RvcCA9IE1hdGguY2VpbChzdG9wIC8gc3RlcCkgKiBzdGVwO1xuICAgICAgfSBlbHNlIGlmIChzdGVwIDwgMCkge1xuICAgICAgICBzdGFydCA9IE1hdGguY2VpbChzdGFydCAqIHN0ZXApIC8gc3RlcDtcbiAgICAgICAgc3RvcCA9IE1hdGguZmxvb3Ioc3RvcCAqIHN0ZXApIC8gc3RlcDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgcHJlc3RlcCA9IHN0ZXA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNjYWxlO1xuICB9O1xuXG4gIHJldHVybiBzY2FsZTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbGluZWFyKCkge1xuICB2YXIgc2NhbGUgPSBjb250aW51b3VzKCk7XG5cbiAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjb3B5KHNjYWxlLCBsaW5lYXIoKSk7XG4gIH07XG5cbiAgaW5pdFJhbmdlLmFwcGx5KHNjYWxlLCBhcmd1bWVudHMpO1xuXG4gIHJldHVybiBsaW5lYXJpc2goc2NhbGUpO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIG5pY2UoZG9tYWluLCBpbnRlcnZhbCkge1xuICBkb21haW4gPSBkb21haW4uc2xpY2UoKTtcblxuICB2YXIgaTAgPSAwLFxuICAgICAgaTEgPSBkb21haW4ubGVuZ3RoIC0gMSxcbiAgICAgIHgwID0gZG9tYWluW2kwXSxcbiAgICAgIHgxID0gZG9tYWluW2kxXSxcbiAgICAgIHQ7XG5cbiAgaWYgKHgxIDwgeDApIHtcbiAgICB0ID0gaTAsIGkwID0gaTEsIGkxID0gdDtcbiAgICB0ID0geDAsIHgwID0geDEsIHgxID0gdDtcbiAgfVxuXG4gIGRvbWFpbltpMF0gPSBpbnRlcnZhbC5mbG9vcih4MCk7XG4gIGRvbWFpbltpMV0gPSBpbnRlcnZhbC5jZWlsKHgxKTtcbiAgcmV0dXJuIGRvbWFpbjtcbn1cbiIsICJjb25zdCB0MCA9IG5ldyBEYXRlLCB0MSA9IG5ldyBEYXRlO1xuXG5leHBvcnQgZnVuY3Rpb24gdGltZUludGVydmFsKGZsb29yaSwgb2Zmc2V0aSwgY291bnQsIGZpZWxkKSB7XG5cbiAgZnVuY3Rpb24gaW50ZXJ2YWwoZGF0ZSkge1xuICAgIHJldHVybiBmbG9vcmkoZGF0ZSA9IGFyZ3VtZW50cy5sZW5ndGggPT09IDAgPyBuZXcgRGF0ZSA6IG5ldyBEYXRlKCtkYXRlKSksIGRhdGU7XG4gIH1cblxuICBpbnRlcnZhbC5mbG9vciA9IChkYXRlKSA9PiB7XG4gICAgcmV0dXJuIGZsb29yaShkYXRlID0gbmV3IERhdGUoK2RhdGUpKSwgZGF0ZTtcbiAgfTtcblxuICBpbnRlcnZhbC5jZWlsID0gKGRhdGUpID0+IHtcbiAgICByZXR1cm4gZmxvb3JpKGRhdGUgPSBuZXcgRGF0ZShkYXRlIC0gMSkpLCBvZmZzZXRpKGRhdGUsIDEpLCBmbG9vcmkoZGF0ZSksIGRhdGU7XG4gIH07XG5cbiAgaW50ZXJ2YWwucm91bmQgPSAoZGF0ZSkgPT4ge1xuICAgIGNvbnN0IGQwID0gaW50ZXJ2YWwoZGF0ZSksIGQxID0gaW50ZXJ2YWwuY2VpbChkYXRlKTtcbiAgICByZXR1cm4gZGF0ZSAtIGQwIDwgZDEgLSBkYXRlID8gZDAgOiBkMTtcbiAgfTtcblxuICBpbnRlcnZhbC5vZmZzZXQgPSAoZGF0ZSwgc3RlcCkgPT4ge1xuICAgIHJldHVybiBvZmZzZXRpKGRhdGUgPSBuZXcgRGF0ZSgrZGF0ZSksIHN0ZXAgPT0gbnVsbCA/IDEgOiBNYXRoLmZsb29yKHN0ZXApKSwgZGF0ZTtcbiAgfTtcblxuICBpbnRlcnZhbC5yYW5nZSA9IChzdGFydCwgc3RvcCwgc3RlcCkgPT4ge1xuICAgIGNvbnN0IHJhbmdlID0gW107XG4gICAgc3RhcnQgPSBpbnRlcnZhbC5jZWlsKHN0YXJ0KTtcbiAgICBzdGVwID0gc3RlcCA9PSBudWxsID8gMSA6IE1hdGguZmxvb3Ioc3RlcCk7XG4gICAgaWYgKCEoc3RhcnQgPCBzdG9wKSB8fCAhKHN0ZXAgPiAwKSkgcmV0dXJuIHJhbmdlOyAvLyBhbHNvIGhhbmRsZXMgSW52YWxpZCBEYXRlXG4gICAgbGV0IHByZXZpb3VzO1xuICAgIGRvIHJhbmdlLnB1c2gocHJldmlvdXMgPSBuZXcgRGF0ZSgrc3RhcnQpKSwgb2Zmc2V0aShzdGFydCwgc3RlcCksIGZsb29yaShzdGFydCk7XG4gICAgd2hpbGUgKHByZXZpb3VzIDwgc3RhcnQgJiYgc3RhcnQgPCBzdG9wKTtcbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG5cbiAgaW50ZXJ2YWwuZmlsdGVyID0gKHRlc3QpID0+IHtcbiAgICByZXR1cm4gdGltZUludGVydmFsKChkYXRlKSA9PiB7XG4gICAgICBpZiAoZGF0ZSA+PSBkYXRlKSB3aGlsZSAoZmxvb3JpKGRhdGUpLCAhdGVzdChkYXRlKSkgZGF0ZS5zZXRUaW1lKGRhdGUgLSAxKTtcbiAgICB9LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICAgICAgaWYgKGRhdGUgPj0gZGF0ZSkge1xuICAgICAgICBpZiAoc3RlcCA8IDApIHdoaWxlICgrK3N0ZXAgPD0gMCkge1xuICAgICAgICAgIHdoaWxlIChvZmZzZXRpKGRhdGUsIC0xKSwgIXRlc3QoZGF0ZSkpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHlcbiAgICAgICAgfSBlbHNlIHdoaWxlICgtLXN0ZXAgPj0gMCkge1xuICAgICAgICAgIHdoaWxlIChvZmZzZXRpKGRhdGUsICsxKSwgIXRlc3QoZGF0ZSkpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIGlmIChjb3VudCkge1xuICAgIGludGVydmFsLmNvdW50ID0gKHN0YXJ0LCBlbmQpID0+IHtcbiAgICAgIHQwLnNldFRpbWUoK3N0YXJ0KSwgdDEuc2V0VGltZSgrZW5kKTtcbiAgICAgIGZsb29yaSh0MCksIGZsb29yaSh0MSk7XG4gICAgICByZXR1cm4gTWF0aC5mbG9vcihjb3VudCh0MCwgdDEpKTtcbiAgICB9O1xuXG4gICAgaW50ZXJ2YWwuZXZlcnkgPSAoc3RlcCkgPT4ge1xuICAgICAgc3RlcCA9IE1hdGguZmxvb3Ioc3RlcCk7XG4gICAgICByZXR1cm4gIWlzRmluaXRlKHN0ZXApIHx8ICEoc3RlcCA+IDApID8gbnVsbFxuICAgICAgICAgIDogIShzdGVwID4gMSkgPyBpbnRlcnZhbFxuICAgICAgICAgIDogaW50ZXJ2YWwuZmlsdGVyKGZpZWxkXG4gICAgICAgICAgICAgID8gKGQpID0+IGZpZWxkKGQpICUgc3RlcCA9PT0gMFxuICAgICAgICAgICAgICA6IChkKSA9PiBpbnRlcnZhbC5jb3VudCgwLCBkKSAlIHN0ZXAgPT09IDApO1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gaW50ZXJ2YWw7XG59XG4iLCAiaW1wb3J0IHt0aW1lSW50ZXJ2YWx9IGZyb20gXCIuL2ludGVydmFsLmpzXCI7XG5cbmV4cG9ydCBjb25zdCBtaWxsaXNlY29uZCA9IHRpbWVJbnRlcnZhbCgoKSA9PiB7XG4gIC8vIG5vb3Bcbn0sIChkYXRlLCBzdGVwKSA9PiB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXApO1xufSwgKHN0YXJ0LCBlbmQpID0+IHtcbiAgcmV0dXJuIGVuZCAtIHN0YXJ0O1xufSk7XG5cbi8vIEFuIG9wdGltaXplZCBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBzaW1wbGUgY2FzZS5cbm1pbGxpc2Vjb25kLmV2ZXJ5ID0gKGspID0+IHtcbiAgayA9IE1hdGguZmxvb3Ioayk7XG4gIGlmICghaXNGaW5pdGUoaykgfHwgIShrID4gMCkpIHJldHVybiBudWxsO1xuICBpZiAoIShrID4gMSkpIHJldHVybiBtaWxsaXNlY29uZDtcbiAgcmV0dXJuIHRpbWVJbnRlcnZhbCgoZGF0ZSkgPT4ge1xuICAgIGRhdGUuc2V0VGltZShNYXRoLmZsb29yKGRhdGUgLyBrKSAqIGspO1xuICB9LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICAgIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBrKTtcbiAgfSwgKHN0YXJ0LCBlbmQpID0+IHtcbiAgICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGs7XG4gIH0pO1xufTtcblxuZXhwb3J0IGNvbnN0IG1pbGxpc2Vjb25kcyA9IG1pbGxpc2Vjb25kLnJhbmdlO1xuIiwgImV4cG9ydCBjb25zdCBkdXJhdGlvblNlY29uZCA9IDEwMDA7XG5leHBvcnQgY29uc3QgZHVyYXRpb25NaW51dGUgPSBkdXJhdGlvblNlY29uZCAqIDYwO1xuZXhwb3J0IGNvbnN0IGR1cmF0aW9uSG91ciA9IGR1cmF0aW9uTWludXRlICogNjA7XG5leHBvcnQgY29uc3QgZHVyYXRpb25EYXkgPSBkdXJhdGlvbkhvdXIgKiAyNDtcbmV4cG9ydCBjb25zdCBkdXJhdGlvbldlZWsgPSBkdXJhdGlvbkRheSAqIDc7XG5leHBvcnQgY29uc3QgZHVyYXRpb25Nb250aCA9IGR1cmF0aW9uRGF5ICogMzA7XG5leHBvcnQgY29uc3QgZHVyYXRpb25ZZWFyID0gZHVyYXRpb25EYXkgKiAzNjU7XG4iLCAiaW1wb3J0IHt0aW1lSW50ZXJ2YWx9IGZyb20gXCIuL2ludGVydmFsLmpzXCI7XG5pbXBvcnQge2R1cmF0aW9uU2Vjb25kfSBmcm9tIFwiLi9kdXJhdGlvbi5qc1wiO1xuXG5leHBvcnQgY29uc3Qgc2Vjb25kID0gdGltZUludGVydmFsKChkYXRlKSA9PiB7XG4gIGRhdGUuc2V0VGltZShkYXRlIC0gZGF0ZS5nZXRNaWxsaXNlY29uZHMoKSk7XG59LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogZHVyYXRpb25TZWNvbmQpO1xufSwgKHN0YXJ0LCBlbmQpID0+IHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvblNlY29uZDtcbn0sIChkYXRlKSA9PiB7XG4gIHJldHVybiBkYXRlLmdldFVUQ1NlY29uZHMoKTtcbn0pO1xuXG5leHBvcnQgY29uc3Qgc2Vjb25kcyA9IHNlY29uZC5yYW5nZTtcbiIsICJpbXBvcnQge3RpbWVJbnRlcnZhbH0gZnJvbSBcIi4vaW50ZXJ2YWwuanNcIjtcbmltcG9ydCB7ZHVyYXRpb25NaW51dGUsIGR1cmF0aW9uU2Vjb25kfSBmcm9tIFwiLi9kdXJhdGlvbi5qc1wiO1xuXG5leHBvcnQgY29uc3QgdGltZU1pbnV0ZSA9IHRpbWVJbnRlcnZhbCgoZGF0ZSkgPT4ge1xuICBkYXRlLnNldFRpbWUoZGF0ZSAtIGRhdGUuZ2V0TWlsbGlzZWNvbmRzKCkgLSBkYXRlLmdldFNlY29uZHMoKSAqIGR1cmF0aW9uU2Vjb25kKTtcbn0sIChkYXRlLCBzdGVwKSA9PiB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvbk1pbnV0ZSk7XG59LCAoc3RhcnQsIGVuZCkgPT4ge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uTWludXRlO1xufSwgKGRhdGUpID0+IHtcbiAgcmV0dXJuIGRhdGUuZ2V0TWludXRlcygpO1xufSk7XG5cbmV4cG9ydCBjb25zdCB0aW1lTWludXRlcyA9IHRpbWVNaW51dGUucmFuZ2U7XG5cbmV4cG9ydCBjb25zdCB1dGNNaW51dGUgPSB0aW1lSW50ZXJ2YWwoKGRhdGUpID0+IHtcbiAgZGF0ZS5zZXRVVENTZWNvbmRzKDAsIDApO1xufSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uTWludXRlKTtcbn0sIChzdGFydCwgZW5kKSA9PiB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25NaW51dGU7XG59LCAoZGF0ZSkgPT4ge1xuICByZXR1cm4gZGF0ZS5nZXRVVENNaW51dGVzKCk7XG59KTtcblxuZXhwb3J0IGNvbnN0IHV0Y01pbnV0ZXMgPSB1dGNNaW51dGUucmFuZ2U7XG4iLCAiaW1wb3J0IHt0aW1lSW50ZXJ2YWx9IGZyb20gXCIuL2ludGVydmFsLmpzXCI7XG5pbXBvcnQge2R1cmF0aW9uSG91ciwgZHVyYXRpb25NaW51dGUsIGR1cmF0aW9uU2Vjb25kfSBmcm9tIFwiLi9kdXJhdGlvbi5qc1wiO1xuXG5leHBvcnQgY29uc3QgdGltZUhvdXIgPSB0aW1lSW50ZXJ2YWwoKGRhdGUpID0+IHtcbiAgZGF0ZS5zZXRUaW1lKGRhdGUgLSBkYXRlLmdldE1pbGxpc2Vjb25kcygpIC0gZGF0ZS5nZXRTZWNvbmRzKCkgKiBkdXJhdGlvblNlY29uZCAtIGRhdGUuZ2V0TWludXRlcygpICogZHVyYXRpb25NaW51dGUpO1xufSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uSG91cik7XG59LCAoc3RhcnQsIGVuZCkgPT4ge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uSG91cjtcbn0sIChkYXRlKSA9PiB7XG4gIHJldHVybiBkYXRlLmdldEhvdXJzKCk7XG59KTtcblxuZXhwb3J0IGNvbnN0IHRpbWVIb3VycyA9IHRpbWVIb3VyLnJhbmdlO1xuXG5leHBvcnQgY29uc3QgdXRjSG91ciA9IHRpbWVJbnRlcnZhbCgoZGF0ZSkgPT4ge1xuICBkYXRlLnNldFVUQ01pbnV0ZXMoMCwgMCwgMCk7XG59LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogZHVyYXRpb25Ib3VyKTtcbn0sIChzdGFydCwgZW5kKSA9PiB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25Ib3VyO1xufSwgKGRhdGUpID0+IHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDSG91cnMoKTtcbn0pO1xuXG5leHBvcnQgY29uc3QgdXRjSG91cnMgPSB1dGNIb3VyLnJhbmdlO1xuIiwgImltcG9ydCB7dGltZUludGVydmFsfSBmcm9tIFwiLi9pbnRlcnZhbC5qc1wiO1xuaW1wb3J0IHtkdXJhdGlvbkRheSwgZHVyYXRpb25NaW51dGV9IGZyb20gXCIuL2R1cmF0aW9uLmpzXCI7XG5cbmV4cG9ydCBjb25zdCB0aW1lRGF5ID0gdGltZUludGVydmFsKFxuICBkYXRlID0+IGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCksXG4gIChkYXRlLCBzdGVwKSA9PiBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgKyBzdGVwKSxcbiAgKHN0YXJ0LCBlbmQpID0+IChlbmQgLSBzdGFydCAtIChlbmQuZ2V0VGltZXpvbmVPZmZzZXQoKSAtIHN0YXJ0LmdldFRpbWV6b25lT2Zmc2V0KCkpICogZHVyYXRpb25NaW51dGUpIC8gZHVyYXRpb25EYXksXG4gIGRhdGUgPT4gZGF0ZS5nZXREYXRlKCkgLSAxXG4pO1xuXG5leHBvcnQgY29uc3QgdGltZURheXMgPSB0aW1lRGF5LnJhbmdlO1xuXG5leHBvcnQgY29uc3QgdXRjRGF5ID0gdGltZUludGVydmFsKChkYXRlKSA9PiB7XG4gIGRhdGUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG59LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICBkYXRlLnNldFVUQ0RhdGUoZGF0ZS5nZXRVVENEYXRlKCkgKyBzdGVwKTtcbn0sIChzdGFydCwgZW5kKSA9PiB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25EYXk7XG59LCAoZGF0ZSkgPT4ge1xuICByZXR1cm4gZGF0ZS5nZXRVVENEYXRlKCkgLSAxO1xufSk7XG5cbmV4cG9ydCBjb25zdCB1dGNEYXlzID0gdXRjRGF5LnJhbmdlO1xuXG5leHBvcnQgY29uc3QgdW5peERheSA9IHRpbWVJbnRlcnZhbCgoZGF0ZSkgPT4ge1xuICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xufSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgZGF0ZS5zZXRVVENEYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpICsgc3RlcCk7XG59LCAoc3RhcnQsIGVuZCkgPT4ge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uRGF5O1xufSwgKGRhdGUpID0+IHtcbiAgcmV0dXJuIE1hdGguZmxvb3IoZGF0ZSAvIGR1cmF0aW9uRGF5KTtcbn0pO1xuXG5leHBvcnQgY29uc3QgdW5peERheXMgPSB1bml4RGF5LnJhbmdlO1xuIiwgImltcG9ydCB7dGltZUludGVydmFsfSBmcm9tIFwiLi9pbnRlcnZhbC5qc1wiO1xuaW1wb3J0IHtkdXJhdGlvbk1pbnV0ZSwgZHVyYXRpb25XZWVrfSBmcm9tIFwiLi9kdXJhdGlvbi5qc1wiO1xuXG5mdW5jdGlvbiB0aW1lV2Vla2RheShpKSB7XG4gIHJldHVybiB0aW1lSW50ZXJ2YWwoKGRhdGUpID0+IHtcbiAgICBkYXRlLnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSAoZGF0ZS5nZXREYXkoKSArIDcgLSBpKSAlIDcpO1xuICAgIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gIH0sIChkYXRlLCBzdGVwKSA9PiB7XG4gICAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgc3RlcCAqIDcpO1xuICB9LCAoc3RhcnQsIGVuZCkgPT4ge1xuICAgIHJldHVybiAoZW5kIC0gc3RhcnQgLSAoZW5kLmdldFRpbWV6b25lT2Zmc2V0KCkgLSBzdGFydC5nZXRUaW1lem9uZU9mZnNldCgpKSAqIGR1cmF0aW9uTWludXRlKSAvIGR1cmF0aW9uV2VlaztcbiAgfSk7XG59XG5cbmV4cG9ydCBjb25zdCB0aW1lU3VuZGF5ID0gdGltZVdlZWtkYXkoMCk7XG5leHBvcnQgY29uc3QgdGltZU1vbmRheSA9IHRpbWVXZWVrZGF5KDEpO1xuZXhwb3J0IGNvbnN0IHRpbWVUdWVzZGF5ID0gdGltZVdlZWtkYXkoMik7XG5leHBvcnQgY29uc3QgdGltZVdlZG5lc2RheSA9IHRpbWVXZWVrZGF5KDMpO1xuZXhwb3J0IGNvbnN0IHRpbWVUaHVyc2RheSA9IHRpbWVXZWVrZGF5KDQpO1xuZXhwb3J0IGNvbnN0IHRpbWVGcmlkYXkgPSB0aW1lV2Vla2RheSg1KTtcbmV4cG9ydCBjb25zdCB0aW1lU2F0dXJkYXkgPSB0aW1lV2Vla2RheSg2KTtcblxuZXhwb3J0IGNvbnN0IHRpbWVTdW5kYXlzID0gdGltZVN1bmRheS5yYW5nZTtcbmV4cG9ydCBjb25zdCB0aW1lTW9uZGF5cyA9IHRpbWVNb25kYXkucmFuZ2U7XG5leHBvcnQgY29uc3QgdGltZVR1ZXNkYXlzID0gdGltZVR1ZXNkYXkucmFuZ2U7XG5leHBvcnQgY29uc3QgdGltZVdlZG5lc2RheXMgPSB0aW1lV2VkbmVzZGF5LnJhbmdlO1xuZXhwb3J0IGNvbnN0IHRpbWVUaHVyc2RheXMgPSB0aW1lVGh1cnNkYXkucmFuZ2U7XG5leHBvcnQgY29uc3QgdGltZUZyaWRheXMgPSB0aW1lRnJpZGF5LnJhbmdlO1xuZXhwb3J0IGNvbnN0IHRpbWVTYXR1cmRheXMgPSB0aW1lU2F0dXJkYXkucmFuZ2U7XG5cbmZ1bmN0aW9uIHV0Y1dlZWtkYXkoaSkge1xuICByZXR1cm4gdGltZUludGVydmFsKChkYXRlKSA9PiB7XG4gICAgZGF0ZS5zZXRVVENEYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpIC0gKGRhdGUuZ2V0VVRDRGF5KCkgKyA3IC0gaSkgJSA3KTtcbiAgICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xuICB9LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICAgIGRhdGUuc2V0VVRDRGF0ZShkYXRlLmdldFVUQ0RhdGUoKSArIHN0ZXAgKiA3KTtcbiAgfSwgKHN0YXJ0LCBlbmQpID0+IHtcbiAgICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uV2VlaztcbiAgfSk7XG59XG5cbmV4cG9ydCBjb25zdCB1dGNTdW5kYXkgPSB1dGNXZWVrZGF5KDApO1xuZXhwb3J0IGNvbnN0IHV0Y01vbmRheSA9IHV0Y1dlZWtkYXkoMSk7XG5leHBvcnQgY29uc3QgdXRjVHVlc2RheSA9IHV0Y1dlZWtkYXkoMik7XG5leHBvcnQgY29uc3QgdXRjV2VkbmVzZGF5ID0gdXRjV2Vla2RheSgzKTtcbmV4cG9ydCBjb25zdCB1dGNUaHVyc2RheSA9IHV0Y1dlZWtkYXkoNCk7XG5leHBvcnQgY29uc3QgdXRjRnJpZGF5ID0gdXRjV2Vla2RheSg1KTtcbmV4cG9ydCBjb25zdCB1dGNTYXR1cmRheSA9IHV0Y1dlZWtkYXkoNik7XG5cbmV4cG9ydCBjb25zdCB1dGNTdW5kYXlzID0gdXRjU3VuZGF5LnJhbmdlO1xuZXhwb3J0IGNvbnN0IHV0Y01vbmRheXMgPSB1dGNNb25kYXkucmFuZ2U7XG5leHBvcnQgY29uc3QgdXRjVHVlc2RheXMgPSB1dGNUdWVzZGF5LnJhbmdlO1xuZXhwb3J0IGNvbnN0IHV0Y1dlZG5lc2RheXMgPSB1dGNXZWRuZXNkYXkucmFuZ2U7XG5leHBvcnQgY29uc3QgdXRjVGh1cnNkYXlzID0gdXRjVGh1cnNkYXkucmFuZ2U7XG5leHBvcnQgY29uc3QgdXRjRnJpZGF5cyA9IHV0Y0ZyaWRheS5yYW5nZTtcbmV4cG9ydCBjb25zdCB1dGNTYXR1cmRheXMgPSB1dGNTYXR1cmRheS5yYW5nZTtcbiIsICJpbXBvcnQge3RpbWVJbnRlcnZhbH0gZnJvbSBcIi4vaW50ZXJ2YWwuanNcIjtcblxuZXhwb3J0IGNvbnN0IHRpbWVNb250aCA9IHRpbWVJbnRlcnZhbCgoZGF0ZSkgPT4ge1xuICBkYXRlLnNldERhdGUoMSk7XG4gIGRhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XG59LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICBkYXRlLnNldE1vbnRoKGRhdGUuZ2V0TW9udGgoKSArIHN0ZXApO1xufSwgKHN0YXJ0LCBlbmQpID0+IHtcbiAgcmV0dXJuIGVuZC5nZXRNb250aCgpIC0gc3RhcnQuZ2V0TW9udGgoKSArIChlbmQuZ2V0RnVsbFllYXIoKSAtIHN0YXJ0LmdldEZ1bGxZZWFyKCkpICogMTI7XG59LCAoZGF0ZSkgPT4ge1xuICByZXR1cm4gZGF0ZS5nZXRNb250aCgpO1xufSk7XG5cbmV4cG9ydCBjb25zdCB0aW1lTW9udGhzID0gdGltZU1vbnRoLnJhbmdlO1xuXG5leHBvcnQgY29uc3QgdXRjTW9udGggPSB0aW1lSW50ZXJ2YWwoKGRhdGUpID0+IHtcbiAgZGF0ZS5zZXRVVENEYXRlKDEpO1xuICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xufSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgZGF0ZS5zZXRVVENNb250aChkYXRlLmdldFVUQ01vbnRoKCkgKyBzdGVwKTtcbn0sIChzdGFydCwgZW5kKSA9PiB7XG4gIHJldHVybiBlbmQuZ2V0VVRDTW9udGgoKSAtIHN0YXJ0LmdldFVUQ01vbnRoKCkgKyAoZW5kLmdldFVUQ0Z1bGxZZWFyKCkgLSBzdGFydC5nZXRVVENGdWxsWWVhcigpKSAqIDEyO1xufSwgKGRhdGUpID0+IHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDTW9udGgoKTtcbn0pO1xuXG5leHBvcnQgY29uc3QgdXRjTW9udGhzID0gdXRjTW9udGgucmFuZ2U7XG4iLCAiaW1wb3J0IHt0aW1lSW50ZXJ2YWx9IGZyb20gXCIuL2ludGVydmFsLmpzXCI7XG5cbmV4cG9ydCBjb25zdCB0aW1lWWVhciA9IHRpbWVJbnRlcnZhbCgoZGF0ZSkgPT4ge1xuICBkYXRlLnNldE1vbnRoKDAsIDEpO1xuICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xufSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgZGF0ZS5zZXRGdWxsWWVhcihkYXRlLmdldEZ1bGxZZWFyKCkgKyBzdGVwKTtcbn0sIChzdGFydCwgZW5kKSA9PiB7XG4gIHJldHVybiBlbmQuZ2V0RnVsbFllYXIoKSAtIHN0YXJ0LmdldEZ1bGxZZWFyKCk7XG59LCAoZGF0ZSkgPT4ge1xuICByZXR1cm4gZGF0ZS5nZXRGdWxsWWVhcigpO1xufSk7XG5cbi8vIEFuIG9wdGltaXplZCBpbXBsZW1lbnRhdGlvbiBmb3IgdGhpcyBzaW1wbGUgY2FzZS5cbnRpbWVZZWFyLmV2ZXJ5ID0gKGspID0+IHtcbiAgcmV0dXJuICFpc0Zpbml0ZShrID0gTWF0aC5mbG9vcihrKSkgfHwgIShrID4gMCkgPyBudWxsIDogdGltZUludGVydmFsKChkYXRlKSA9PiB7XG4gICAgZGF0ZS5zZXRGdWxsWWVhcihNYXRoLmZsb29yKGRhdGUuZ2V0RnVsbFllYXIoKSAvIGspICogayk7XG4gICAgZGF0ZS5zZXRNb250aCgwLCAxKTtcbiAgICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICB9LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICAgIGRhdGUuc2V0RnVsbFllYXIoZGF0ZS5nZXRGdWxsWWVhcigpICsgc3RlcCAqIGspO1xuICB9KTtcbn07XG5cbmV4cG9ydCBjb25zdCB0aW1lWWVhcnMgPSB0aW1lWWVhci5yYW5nZTtcblxuZXhwb3J0IGNvbnN0IHV0Y1llYXIgPSB0aW1lSW50ZXJ2YWwoKGRhdGUpID0+IHtcbiAgZGF0ZS5zZXRVVENNb250aCgwLCAxKTtcbiAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbn0sIChkYXRlLCBzdGVwKSA9PiB7XG4gIGRhdGUuc2V0VVRDRnVsbFllYXIoZGF0ZS5nZXRVVENGdWxsWWVhcigpICsgc3RlcCk7XG59LCAoc3RhcnQsIGVuZCkgPT4ge1xuICByZXR1cm4gZW5kLmdldFVUQ0Z1bGxZZWFyKCkgLSBzdGFydC5nZXRVVENGdWxsWWVhcigpO1xufSwgKGRhdGUpID0+IHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDRnVsbFllYXIoKTtcbn0pO1xuXG4vLyBBbiBvcHRpbWl6ZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgc2ltcGxlIGNhc2UuXG51dGNZZWFyLmV2ZXJ5ID0gKGspID0+IHtcbiAgcmV0dXJuICFpc0Zpbml0ZShrID0gTWF0aC5mbG9vcihrKSkgfHwgIShrID4gMCkgPyBudWxsIDogdGltZUludGVydmFsKChkYXRlKSA9PiB7XG4gICAgZGF0ZS5zZXRVVENGdWxsWWVhcihNYXRoLmZsb29yKGRhdGUuZ2V0VVRDRnVsbFllYXIoKSAvIGspICogayk7XG4gICAgZGF0ZS5zZXRVVENNb250aCgwLCAxKTtcbiAgICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xuICB9LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoZGF0ZS5nZXRVVENGdWxsWWVhcigpICsgc3RlcCAqIGspO1xuICB9KTtcbn07XG5cbmV4cG9ydCBjb25zdCB1dGNZZWFycyA9IHV0Y1llYXIucmFuZ2U7XG4iLCAiaW1wb3J0IHtiaXNlY3RvciwgdGlja1N0ZXB9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IHtkdXJhdGlvbkRheSwgZHVyYXRpb25Ib3VyLCBkdXJhdGlvbk1pbnV0ZSwgZHVyYXRpb25Nb250aCwgZHVyYXRpb25TZWNvbmQsIGR1cmF0aW9uV2VlaywgZHVyYXRpb25ZZWFyfSBmcm9tIFwiLi9kdXJhdGlvbi5qc1wiO1xuaW1wb3J0IHttaWxsaXNlY29uZH0gZnJvbSBcIi4vbWlsbGlzZWNvbmQuanNcIjtcbmltcG9ydCB7c2Vjb25kfSBmcm9tIFwiLi9zZWNvbmQuanNcIjtcbmltcG9ydCB7dGltZU1pbnV0ZSwgdXRjTWludXRlfSBmcm9tIFwiLi9taW51dGUuanNcIjtcbmltcG9ydCB7dGltZUhvdXIsIHV0Y0hvdXJ9IGZyb20gXCIuL2hvdXIuanNcIjtcbmltcG9ydCB7dGltZURheSwgdW5peERheX0gZnJvbSBcIi4vZGF5LmpzXCI7XG5pbXBvcnQge3RpbWVTdW5kYXksIHV0Y1N1bmRheX0gZnJvbSBcIi4vd2Vlay5qc1wiO1xuaW1wb3J0IHt0aW1lTW9udGgsIHV0Y01vbnRofSBmcm9tIFwiLi9tb250aC5qc1wiO1xuaW1wb3J0IHt0aW1lWWVhciwgdXRjWWVhcn0gZnJvbSBcIi4veWVhci5qc1wiO1xuXG5mdW5jdGlvbiB0aWNrZXIoeWVhciwgbW9udGgsIHdlZWssIGRheSwgaG91ciwgbWludXRlKSB7XG5cbiAgY29uc3QgdGlja0ludGVydmFscyA9IFtcbiAgICBbc2Vjb25kLCAgMSwgICAgICBkdXJhdGlvblNlY29uZF0sXG4gICAgW3NlY29uZCwgIDUsICA1ICogZHVyYXRpb25TZWNvbmRdLFxuICAgIFtzZWNvbmQsIDE1LCAxNSAqIGR1cmF0aW9uU2Vjb25kXSxcbiAgICBbc2Vjb25kLCAzMCwgMzAgKiBkdXJhdGlvblNlY29uZF0sXG4gICAgW21pbnV0ZSwgIDEsICAgICAgZHVyYXRpb25NaW51dGVdLFxuICAgIFttaW51dGUsICA1LCAgNSAqIGR1cmF0aW9uTWludXRlXSxcbiAgICBbbWludXRlLCAxNSwgMTUgKiBkdXJhdGlvbk1pbnV0ZV0sXG4gICAgW21pbnV0ZSwgMzAsIDMwICogZHVyYXRpb25NaW51dGVdLFxuICAgIFsgIGhvdXIsICAxLCAgICAgIGR1cmF0aW9uSG91ciAgXSxcbiAgICBbICBob3VyLCAgMywgIDMgKiBkdXJhdGlvbkhvdXIgIF0sXG4gICAgWyAgaG91ciwgIDYsICA2ICogZHVyYXRpb25Ib3VyICBdLFxuICAgIFsgIGhvdXIsIDEyLCAxMiAqIGR1cmF0aW9uSG91ciAgXSxcbiAgICBbICAgZGF5LCAgMSwgICAgICBkdXJhdGlvbkRheSAgIF0sXG4gICAgWyAgIGRheSwgIDIsICAyICogZHVyYXRpb25EYXkgICBdLFxuICAgIFsgIHdlZWssICAxLCAgICAgIGR1cmF0aW9uV2VlayAgXSxcbiAgICBbIG1vbnRoLCAgMSwgICAgICBkdXJhdGlvbk1vbnRoIF0sXG4gICAgWyBtb250aCwgIDMsICAzICogZHVyYXRpb25Nb250aCBdLFxuICAgIFsgIHllYXIsICAxLCAgICAgIGR1cmF0aW9uWWVhciAgXVxuICBdO1xuXG4gIGZ1bmN0aW9uIHRpY2tzKHN0YXJ0LCBzdG9wLCBjb3VudCkge1xuICAgIGNvbnN0IHJldmVyc2UgPSBzdG9wIDwgc3RhcnQ7XG4gICAgaWYgKHJldmVyc2UpIFtzdGFydCwgc3RvcF0gPSBbc3RvcCwgc3RhcnRdO1xuICAgIGNvbnN0IGludGVydmFsID0gY291bnQgJiYgdHlwZW9mIGNvdW50LnJhbmdlID09PSBcImZ1bmN0aW9uXCIgPyBjb3VudCA6IHRpY2tJbnRlcnZhbChzdGFydCwgc3RvcCwgY291bnQpO1xuICAgIGNvbnN0IHRpY2tzID0gaW50ZXJ2YWwgPyBpbnRlcnZhbC5yYW5nZShzdGFydCwgK3N0b3AgKyAxKSA6IFtdOyAvLyBpbmNsdXNpdmUgc3RvcFxuICAgIHJldHVybiByZXZlcnNlID8gdGlja3MucmV2ZXJzZSgpIDogdGlja3M7XG4gIH1cblxuICBmdW5jdGlvbiB0aWNrSW50ZXJ2YWwoc3RhcnQsIHN0b3AsIGNvdW50KSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gTWF0aC5hYnMoc3RvcCAtIHN0YXJ0KSAvIGNvdW50O1xuICAgIGNvbnN0IGkgPSBiaXNlY3RvcigoWywsIHN0ZXBdKSA9PiBzdGVwKS5yaWdodCh0aWNrSW50ZXJ2YWxzLCB0YXJnZXQpO1xuICAgIGlmIChpID09PSB0aWNrSW50ZXJ2YWxzLmxlbmd0aCkgcmV0dXJuIHllYXIuZXZlcnkodGlja1N0ZXAoc3RhcnQgLyBkdXJhdGlvblllYXIsIHN0b3AgLyBkdXJhdGlvblllYXIsIGNvdW50KSk7XG4gICAgaWYgKGkgPT09IDApIHJldHVybiBtaWxsaXNlY29uZC5ldmVyeShNYXRoLm1heCh0aWNrU3RlcChzdGFydCwgc3RvcCwgY291bnQpLCAxKSk7XG4gICAgY29uc3QgW3QsIHN0ZXBdID0gdGlja0ludGVydmFsc1t0YXJnZXQgLyB0aWNrSW50ZXJ2YWxzW2kgLSAxXVsyXSA8IHRpY2tJbnRlcnZhbHNbaV1bMl0gLyB0YXJnZXQgPyBpIC0gMSA6IGldO1xuICAgIHJldHVybiB0LmV2ZXJ5KHN0ZXApO1xuICB9XG5cbiAgcmV0dXJuIFt0aWNrcywgdGlja0ludGVydmFsXTtcbn1cblxuY29uc3QgW3V0Y1RpY2tzLCB1dGNUaWNrSW50ZXJ2YWxdID0gdGlja2VyKHV0Y1llYXIsIHV0Y01vbnRoLCB1dGNTdW5kYXksIHVuaXhEYXksIHV0Y0hvdXIsIHV0Y01pbnV0ZSk7XG5jb25zdCBbdGltZVRpY2tzLCB0aW1lVGlja0ludGVydmFsXSA9IHRpY2tlcih0aW1lWWVhciwgdGltZU1vbnRoLCB0aW1lU3VuZGF5LCB0aW1lRGF5LCB0aW1lSG91ciwgdGltZU1pbnV0ZSk7XG5cbmV4cG9ydCB7dXRjVGlja3MsIHV0Y1RpY2tJbnRlcnZhbCwgdGltZVRpY2tzLCB0aW1lVGlja0ludGVydmFsfTtcbiIsICJpbXBvcnQge1xuICB0aW1lRGF5LFxuICB0aW1lU3VuZGF5LFxuICB0aW1lTW9uZGF5LFxuICB0aW1lVGh1cnNkYXksXG4gIHRpbWVZZWFyLFxuICB1dGNEYXksXG4gIHV0Y1N1bmRheSxcbiAgdXRjTW9uZGF5LFxuICB1dGNUaHVyc2RheSxcbiAgdXRjWWVhclxufSBmcm9tIFwiZDMtdGltZVwiO1xuXG5mdW5jdGlvbiBsb2NhbERhdGUoZCkge1xuICBpZiAoMCA8PSBkLnkgJiYgZC55IDwgMTAwKSB7XG4gICAgdmFyIGRhdGUgPSBuZXcgRGF0ZSgtMSwgZC5tLCBkLmQsIGQuSCwgZC5NLCBkLlMsIGQuTCk7XG4gICAgZGF0ZS5zZXRGdWxsWWVhcihkLnkpO1xuICAgIHJldHVybiBkYXRlO1xuICB9XG4gIHJldHVybiBuZXcgRGF0ZShkLnksIGQubSwgZC5kLCBkLkgsIGQuTSwgZC5TLCBkLkwpO1xufVxuXG5mdW5jdGlvbiB1dGNEYXRlKGQpIHtcbiAgaWYgKDAgPD0gZC55ICYmIGQueSA8IDEwMCkge1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoRGF0ZS5VVEMoLTEsIGQubSwgZC5kLCBkLkgsIGQuTSwgZC5TLCBkLkwpKTtcbiAgICBkYXRlLnNldFVUQ0Z1bGxZZWFyKGQueSk7XG4gICAgcmV0dXJuIGRhdGU7XG4gIH1cbiAgcmV0dXJuIG5ldyBEYXRlKERhdGUuVVRDKGQueSwgZC5tLCBkLmQsIGQuSCwgZC5NLCBkLlMsIGQuTCkpO1xufVxuXG5mdW5jdGlvbiBuZXdEYXRlKHksIG0sIGQpIHtcbiAgcmV0dXJuIHt5OiB5LCBtOiBtLCBkOiBkLCBIOiAwLCBNOiAwLCBTOiAwLCBMOiAwfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZm9ybWF0TG9jYWxlKGxvY2FsZSkge1xuICB2YXIgbG9jYWxlX2RhdGVUaW1lID0gbG9jYWxlLmRhdGVUaW1lLFxuICAgICAgbG9jYWxlX2RhdGUgPSBsb2NhbGUuZGF0ZSxcbiAgICAgIGxvY2FsZV90aW1lID0gbG9jYWxlLnRpbWUsXG4gICAgICBsb2NhbGVfcGVyaW9kcyA9IGxvY2FsZS5wZXJpb2RzLFxuICAgICAgbG9jYWxlX3dlZWtkYXlzID0gbG9jYWxlLmRheXMsXG4gICAgICBsb2NhbGVfc2hvcnRXZWVrZGF5cyA9IGxvY2FsZS5zaG9ydERheXMsXG4gICAgICBsb2NhbGVfbW9udGhzID0gbG9jYWxlLm1vbnRocyxcbiAgICAgIGxvY2FsZV9zaG9ydE1vbnRocyA9IGxvY2FsZS5zaG9ydE1vbnRocztcblxuICB2YXIgcGVyaW9kUmUgPSBmb3JtYXRSZShsb2NhbGVfcGVyaW9kcyksXG4gICAgICBwZXJpb2RMb29rdXAgPSBmb3JtYXRMb29rdXAobG9jYWxlX3BlcmlvZHMpLFxuICAgICAgd2Vla2RheVJlID0gZm9ybWF0UmUobG9jYWxlX3dlZWtkYXlzKSxcbiAgICAgIHdlZWtkYXlMb29rdXAgPSBmb3JtYXRMb29rdXAobG9jYWxlX3dlZWtkYXlzKSxcbiAgICAgIHNob3J0V2Vla2RheVJlID0gZm9ybWF0UmUobG9jYWxlX3Nob3J0V2Vla2RheXMpLFxuICAgICAgc2hvcnRXZWVrZGF5TG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV9zaG9ydFdlZWtkYXlzKSxcbiAgICAgIG1vbnRoUmUgPSBmb3JtYXRSZShsb2NhbGVfbW9udGhzKSxcbiAgICAgIG1vbnRoTG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV9tb250aHMpLFxuICAgICAgc2hvcnRNb250aFJlID0gZm9ybWF0UmUobG9jYWxlX3Nob3J0TW9udGhzKSxcbiAgICAgIHNob3J0TW9udGhMb29rdXAgPSBmb3JtYXRMb29rdXAobG9jYWxlX3Nob3J0TW9udGhzKTtcblxuICB2YXIgZm9ybWF0cyA9IHtcbiAgICBcImFcIjogZm9ybWF0U2hvcnRXZWVrZGF5LFxuICAgIFwiQVwiOiBmb3JtYXRXZWVrZGF5LFxuICAgIFwiYlwiOiBmb3JtYXRTaG9ydE1vbnRoLFxuICAgIFwiQlwiOiBmb3JtYXRNb250aCxcbiAgICBcImNcIjogbnVsbCxcbiAgICBcImRcIjogZm9ybWF0RGF5T2ZNb250aCxcbiAgICBcImVcIjogZm9ybWF0RGF5T2ZNb250aCxcbiAgICBcImZcIjogZm9ybWF0TWljcm9zZWNvbmRzLFxuICAgIFwiZ1wiOiBmb3JtYXRZZWFySVNPLFxuICAgIFwiR1wiOiBmb3JtYXRGdWxsWWVhcklTTyxcbiAgICBcIkhcIjogZm9ybWF0SG91cjI0LFxuICAgIFwiSVwiOiBmb3JtYXRIb3VyMTIsXG4gICAgXCJqXCI6IGZvcm1hdERheU9mWWVhcixcbiAgICBcIkxcIjogZm9ybWF0TWlsbGlzZWNvbmRzLFxuICAgIFwibVwiOiBmb3JtYXRNb250aE51bWJlcixcbiAgICBcIk1cIjogZm9ybWF0TWludXRlcyxcbiAgICBcInBcIjogZm9ybWF0UGVyaW9kLFxuICAgIFwicVwiOiBmb3JtYXRRdWFydGVyLFxuICAgIFwiUVwiOiBmb3JtYXRVbml4VGltZXN0YW1wLFxuICAgIFwic1wiOiBmb3JtYXRVbml4VGltZXN0YW1wU2Vjb25kcyxcbiAgICBcIlNcIjogZm9ybWF0U2Vjb25kcyxcbiAgICBcInVcIjogZm9ybWF0V2Vla2RheU51bWJlck1vbmRheSxcbiAgICBcIlVcIjogZm9ybWF0V2Vla051bWJlclN1bmRheSxcbiAgICBcIlZcIjogZm9ybWF0V2Vla051bWJlcklTTyxcbiAgICBcIndcIjogZm9ybWF0V2Vla2RheU51bWJlclN1bmRheSxcbiAgICBcIldcIjogZm9ybWF0V2Vla051bWJlck1vbmRheSxcbiAgICBcInhcIjogbnVsbCxcbiAgICBcIlhcIjogbnVsbCxcbiAgICBcInlcIjogZm9ybWF0WWVhcixcbiAgICBcIllcIjogZm9ybWF0RnVsbFllYXIsXG4gICAgXCJaXCI6IGZvcm1hdFpvbmUsXG4gICAgXCIlXCI6IGZvcm1hdExpdGVyYWxQZXJjZW50XG4gIH07XG5cbiAgdmFyIHV0Y0Zvcm1hdHMgPSB7XG4gICAgXCJhXCI6IGZvcm1hdFVUQ1Nob3J0V2Vla2RheSxcbiAgICBcIkFcIjogZm9ybWF0VVRDV2Vla2RheSxcbiAgICBcImJcIjogZm9ybWF0VVRDU2hvcnRNb250aCxcbiAgICBcIkJcIjogZm9ybWF0VVRDTW9udGgsXG4gICAgXCJjXCI6IG51bGwsXG4gICAgXCJkXCI6IGZvcm1hdFVUQ0RheU9mTW9udGgsXG4gICAgXCJlXCI6IGZvcm1hdFVUQ0RheU9mTW9udGgsXG4gICAgXCJmXCI6IGZvcm1hdFVUQ01pY3Jvc2Vjb25kcyxcbiAgICBcImdcIjogZm9ybWF0VVRDWWVhcklTTyxcbiAgICBcIkdcIjogZm9ybWF0VVRDRnVsbFllYXJJU08sXG4gICAgXCJIXCI6IGZvcm1hdFVUQ0hvdXIyNCxcbiAgICBcIklcIjogZm9ybWF0VVRDSG91cjEyLFxuICAgIFwialwiOiBmb3JtYXRVVENEYXlPZlllYXIsXG4gICAgXCJMXCI6IGZvcm1hdFVUQ01pbGxpc2Vjb25kcyxcbiAgICBcIm1cIjogZm9ybWF0VVRDTW9udGhOdW1iZXIsXG4gICAgXCJNXCI6IGZvcm1hdFVUQ01pbnV0ZXMsXG4gICAgXCJwXCI6IGZvcm1hdFVUQ1BlcmlvZCxcbiAgICBcInFcIjogZm9ybWF0VVRDUXVhcnRlcixcbiAgICBcIlFcIjogZm9ybWF0VW5peFRpbWVzdGFtcCxcbiAgICBcInNcIjogZm9ybWF0VW5peFRpbWVzdGFtcFNlY29uZHMsXG4gICAgXCJTXCI6IGZvcm1hdFVUQ1NlY29uZHMsXG4gICAgXCJ1XCI6IGZvcm1hdFVUQ1dlZWtkYXlOdW1iZXJNb25kYXksXG4gICAgXCJVXCI6IGZvcm1hdFVUQ1dlZWtOdW1iZXJTdW5kYXksXG4gICAgXCJWXCI6IGZvcm1hdFVUQ1dlZWtOdW1iZXJJU08sXG4gICAgXCJ3XCI6IGZvcm1hdFVUQ1dlZWtkYXlOdW1iZXJTdW5kYXksXG4gICAgXCJXXCI6IGZvcm1hdFVUQ1dlZWtOdW1iZXJNb25kYXksXG4gICAgXCJ4XCI6IG51bGwsXG4gICAgXCJYXCI6IG51bGwsXG4gICAgXCJ5XCI6IGZvcm1hdFVUQ1llYXIsXG4gICAgXCJZXCI6IGZvcm1hdFVUQ0Z1bGxZZWFyLFxuICAgIFwiWlwiOiBmb3JtYXRVVENab25lLFxuICAgIFwiJVwiOiBmb3JtYXRMaXRlcmFsUGVyY2VudFxuICB9O1xuXG4gIHZhciBwYXJzZXMgPSB7XG4gICAgXCJhXCI6IHBhcnNlU2hvcnRXZWVrZGF5LFxuICAgIFwiQVwiOiBwYXJzZVdlZWtkYXksXG4gICAgXCJiXCI6IHBhcnNlU2hvcnRNb250aCxcbiAgICBcIkJcIjogcGFyc2VNb250aCxcbiAgICBcImNcIjogcGFyc2VMb2NhbGVEYXRlVGltZSxcbiAgICBcImRcIjogcGFyc2VEYXlPZk1vbnRoLFxuICAgIFwiZVwiOiBwYXJzZURheU9mTW9udGgsXG4gICAgXCJmXCI6IHBhcnNlTWljcm9zZWNvbmRzLFxuICAgIFwiZ1wiOiBwYXJzZVllYXIsXG4gICAgXCJHXCI6IHBhcnNlRnVsbFllYXIsXG4gICAgXCJIXCI6IHBhcnNlSG91cjI0LFxuICAgIFwiSVwiOiBwYXJzZUhvdXIyNCxcbiAgICBcImpcIjogcGFyc2VEYXlPZlllYXIsXG4gICAgXCJMXCI6IHBhcnNlTWlsbGlzZWNvbmRzLFxuICAgIFwibVwiOiBwYXJzZU1vbnRoTnVtYmVyLFxuICAgIFwiTVwiOiBwYXJzZU1pbnV0ZXMsXG4gICAgXCJwXCI6IHBhcnNlUGVyaW9kLFxuICAgIFwicVwiOiBwYXJzZVF1YXJ0ZXIsXG4gICAgXCJRXCI6IHBhcnNlVW5peFRpbWVzdGFtcCxcbiAgICBcInNcIjogcGFyc2VVbml4VGltZXN0YW1wU2Vjb25kcyxcbiAgICBcIlNcIjogcGFyc2VTZWNvbmRzLFxuICAgIFwidVwiOiBwYXJzZVdlZWtkYXlOdW1iZXJNb25kYXksXG4gICAgXCJVXCI6IHBhcnNlV2Vla051bWJlclN1bmRheSxcbiAgICBcIlZcIjogcGFyc2VXZWVrTnVtYmVySVNPLFxuICAgIFwid1wiOiBwYXJzZVdlZWtkYXlOdW1iZXJTdW5kYXksXG4gICAgXCJXXCI6IHBhcnNlV2Vla051bWJlck1vbmRheSxcbiAgICBcInhcIjogcGFyc2VMb2NhbGVEYXRlLFxuICAgIFwiWFwiOiBwYXJzZUxvY2FsZVRpbWUsXG4gICAgXCJ5XCI6IHBhcnNlWWVhcixcbiAgICBcIllcIjogcGFyc2VGdWxsWWVhcixcbiAgICBcIlpcIjogcGFyc2Vab25lLFxuICAgIFwiJVwiOiBwYXJzZUxpdGVyYWxQZXJjZW50XG4gIH07XG5cbiAgLy8gVGhlc2UgcmVjdXJzaXZlIGRpcmVjdGl2ZSBkZWZpbml0aW9ucyBtdXN0IGJlIGRlZmVycmVkLlxuICBmb3JtYXRzLnggPSBuZXdGb3JtYXQobG9jYWxlX2RhdGUsIGZvcm1hdHMpO1xuICBmb3JtYXRzLlggPSBuZXdGb3JtYXQobG9jYWxlX3RpbWUsIGZvcm1hdHMpO1xuICBmb3JtYXRzLmMgPSBuZXdGb3JtYXQobG9jYWxlX2RhdGVUaW1lLCBmb3JtYXRzKTtcbiAgdXRjRm9ybWF0cy54ID0gbmV3Rm9ybWF0KGxvY2FsZV9kYXRlLCB1dGNGb3JtYXRzKTtcbiAgdXRjRm9ybWF0cy5YID0gbmV3Rm9ybWF0KGxvY2FsZV90aW1lLCB1dGNGb3JtYXRzKTtcbiAgdXRjRm9ybWF0cy5jID0gbmV3Rm9ybWF0KGxvY2FsZV9kYXRlVGltZSwgdXRjRm9ybWF0cyk7XG5cbiAgZnVuY3Rpb24gbmV3Rm9ybWF0KHNwZWNpZmllciwgZm9ybWF0cykge1xuICAgIHJldHVybiBmdW5jdGlvbihkYXRlKSB7XG4gICAgICB2YXIgc3RyaW5nID0gW10sXG4gICAgICAgICAgaSA9IC0xLFxuICAgICAgICAgIGogPSAwLFxuICAgICAgICAgIG4gPSBzcGVjaWZpZXIubGVuZ3RoLFxuICAgICAgICAgIGMsXG4gICAgICAgICAgcGFkLFxuICAgICAgICAgIGZvcm1hdDtcblxuICAgICAgaWYgKCEoZGF0ZSBpbnN0YW5jZW9mIERhdGUpKSBkYXRlID0gbmV3IERhdGUoK2RhdGUpO1xuXG4gICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICBpZiAoc3BlY2lmaWVyLmNoYXJDb2RlQXQoaSkgPT09IDM3KSB7XG4gICAgICAgICAgc3RyaW5nLnB1c2goc3BlY2lmaWVyLnNsaWNlKGosIGkpKTtcbiAgICAgICAgICBpZiAoKHBhZCA9IHBhZHNbYyA9IHNwZWNpZmllci5jaGFyQXQoKytpKV0pICE9IG51bGwpIGMgPSBzcGVjaWZpZXIuY2hhckF0KCsraSk7XG4gICAgICAgICAgZWxzZSBwYWQgPSBjID09PSBcImVcIiA/IFwiIFwiIDogXCIwXCI7XG4gICAgICAgICAgaWYgKGZvcm1hdCA9IGZvcm1hdHNbY10pIGMgPSBmb3JtYXQoZGF0ZSwgcGFkKTtcbiAgICAgICAgICBzdHJpbmcucHVzaChjKTtcbiAgICAgICAgICBqID0gaSArIDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc3RyaW5nLnB1c2goc3BlY2lmaWVyLnNsaWNlKGosIGkpKTtcbiAgICAgIHJldHVybiBzdHJpbmcuam9pbihcIlwiKTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbmV3UGFyc2Uoc3BlY2lmaWVyLCBaKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgdmFyIGQgPSBuZXdEYXRlKDE5MDAsIHVuZGVmaW5lZCwgMSksXG4gICAgICAgICAgaSA9IHBhcnNlU3BlY2lmaWVyKGQsIHNwZWNpZmllciwgc3RyaW5nICs9IFwiXCIsIDApLFxuICAgICAgICAgIHdlZWssIGRheTtcbiAgICAgIGlmIChpICE9IHN0cmluZy5sZW5ndGgpIHJldHVybiBudWxsO1xuXG4gICAgICAvLyBJZiBhIFVOSVggdGltZXN0YW1wIGlzIHNwZWNpZmllZCwgcmV0dXJuIGl0LlxuICAgICAgaWYgKFwiUVwiIGluIGQpIHJldHVybiBuZXcgRGF0ZShkLlEpO1xuICAgICAgaWYgKFwic1wiIGluIGQpIHJldHVybiBuZXcgRGF0ZShkLnMgKiAxMDAwICsgKFwiTFwiIGluIGQgPyBkLkwgOiAwKSk7XG5cbiAgICAgIC8vIElmIHRoaXMgaXMgdXRjUGFyc2UsIG5ldmVyIHVzZSB0aGUgbG9jYWwgdGltZXpvbmUuXG4gICAgICBpZiAoWiAmJiAhKFwiWlwiIGluIGQpKSBkLlogPSAwO1xuXG4gICAgICAvLyBUaGUgYW0tcG0gZmxhZyBpcyAwIGZvciBBTSwgYW5kIDEgZm9yIFBNLlxuICAgICAgaWYgKFwicFwiIGluIGQpIGQuSCA9IGQuSCAlIDEyICsgZC5wICogMTI7XG5cbiAgICAgIC8vIElmIHRoZSBtb250aCB3YXMgbm90IHNwZWNpZmllZCwgaW5oZXJpdCBmcm9tIHRoZSBxdWFydGVyLlxuICAgICAgaWYgKGQubSA9PT0gdW5kZWZpbmVkKSBkLm0gPSBcInFcIiBpbiBkID8gZC5xIDogMDtcblxuICAgICAgLy8gQ29udmVydCBkYXktb2Ytd2VlayBhbmQgd2Vlay1vZi15ZWFyIHRvIGRheS1vZi15ZWFyLlxuICAgICAgaWYgKFwiVlwiIGluIGQpIHtcbiAgICAgICAgaWYgKGQuViA8IDEgfHwgZC5WID4gNTMpIHJldHVybiBudWxsO1xuICAgICAgICBpZiAoIShcIndcIiBpbiBkKSkgZC53ID0gMTtcbiAgICAgICAgaWYgKFwiWlwiIGluIGQpIHtcbiAgICAgICAgICB3ZWVrID0gdXRjRGF0ZShuZXdEYXRlKGQueSwgMCwgMSkpLCBkYXkgPSB3ZWVrLmdldFVUQ0RheSgpO1xuICAgICAgICAgIHdlZWsgPSBkYXkgPiA0IHx8IGRheSA9PT0gMCA/IHV0Y01vbmRheS5jZWlsKHdlZWspIDogdXRjTW9uZGF5KHdlZWspO1xuICAgICAgICAgIHdlZWsgPSB1dGNEYXkub2Zmc2V0KHdlZWssIChkLlYgLSAxKSAqIDcpO1xuICAgICAgICAgIGQueSA9IHdlZWsuZ2V0VVRDRnVsbFllYXIoKTtcbiAgICAgICAgICBkLm0gPSB3ZWVrLmdldFVUQ01vbnRoKCk7XG4gICAgICAgICAgZC5kID0gd2Vlay5nZXRVVENEYXRlKCkgKyAoZC53ICsgNikgJSA3O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdlZWsgPSBsb2NhbERhdGUobmV3RGF0ZShkLnksIDAsIDEpKSwgZGF5ID0gd2Vlay5nZXREYXkoKTtcbiAgICAgICAgICB3ZWVrID0gZGF5ID4gNCB8fCBkYXkgPT09IDAgPyB0aW1lTW9uZGF5LmNlaWwod2VlaykgOiB0aW1lTW9uZGF5KHdlZWspO1xuICAgICAgICAgIHdlZWsgPSB0aW1lRGF5Lm9mZnNldCh3ZWVrLCAoZC5WIC0gMSkgKiA3KTtcbiAgICAgICAgICBkLnkgPSB3ZWVrLmdldEZ1bGxZZWFyKCk7XG4gICAgICAgICAgZC5tID0gd2Vlay5nZXRNb250aCgpO1xuICAgICAgICAgIGQuZCA9IHdlZWsuZ2V0RGF0ZSgpICsgKGQudyArIDYpICUgNztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChcIldcIiBpbiBkIHx8IFwiVVwiIGluIGQpIHtcbiAgICAgICAgaWYgKCEoXCJ3XCIgaW4gZCkpIGQudyA9IFwidVwiIGluIGQgPyBkLnUgJSA3IDogXCJXXCIgaW4gZCA/IDEgOiAwO1xuICAgICAgICBkYXkgPSBcIlpcIiBpbiBkID8gdXRjRGF0ZShuZXdEYXRlKGQueSwgMCwgMSkpLmdldFVUQ0RheSgpIDogbG9jYWxEYXRlKG5ld0RhdGUoZC55LCAwLCAxKSkuZ2V0RGF5KCk7XG4gICAgICAgIGQubSA9IDA7XG4gICAgICAgIGQuZCA9IFwiV1wiIGluIGQgPyAoZC53ICsgNikgJSA3ICsgZC5XICogNyAtIChkYXkgKyA1KSAlIDcgOiBkLncgKyBkLlUgKiA3IC0gKGRheSArIDYpICUgNztcbiAgICAgIH1cblxuICAgICAgLy8gSWYgYSB0aW1lIHpvbmUgaXMgc3BlY2lmaWVkLCBhbGwgZmllbGRzIGFyZSBpbnRlcnByZXRlZCBhcyBVVEMgYW5kIHRoZW5cbiAgICAgIC8vIG9mZnNldCBhY2NvcmRpbmcgdG8gdGhlIHNwZWNpZmllZCB0aW1lIHpvbmUuXG4gICAgICBpZiAoXCJaXCIgaW4gZCkge1xuICAgICAgICBkLkggKz0gZC5aIC8gMTAwIHwgMDtcbiAgICAgICAgZC5NICs9IGQuWiAlIDEwMDtcbiAgICAgICAgcmV0dXJuIHV0Y0RhdGUoZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIE90aGVyd2lzZSwgYWxsIGZpZWxkcyBhcmUgaW4gbG9jYWwgdGltZS5cbiAgICAgIHJldHVybiBsb2NhbERhdGUoZCk7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlU3BlY2lmaWVyKGQsIHNwZWNpZmllciwgc3RyaW5nLCBqKSB7XG4gICAgdmFyIGkgPSAwLFxuICAgICAgICBuID0gc3BlY2lmaWVyLmxlbmd0aCxcbiAgICAgICAgbSA9IHN0cmluZy5sZW5ndGgsXG4gICAgICAgIGMsXG4gICAgICAgIHBhcnNlO1xuXG4gICAgd2hpbGUgKGkgPCBuKSB7XG4gICAgICBpZiAoaiA+PSBtKSByZXR1cm4gLTE7XG4gICAgICBjID0gc3BlY2lmaWVyLmNoYXJDb2RlQXQoaSsrKTtcbiAgICAgIGlmIChjID09PSAzNykge1xuICAgICAgICBjID0gc3BlY2lmaWVyLmNoYXJBdChpKyspO1xuICAgICAgICBwYXJzZSA9IHBhcnNlc1tjIGluIHBhZHMgPyBzcGVjaWZpZXIuY2hhckF0KGkrKykgOiBjXTtcbiAgICAgICAgaWYgKCFwYXJzZSB8fCAoKGogPSBwYXJzZShkLCBzdHJpbmcsIGopKSA8IDApKSByZXR1cm4gLTE7XG4gICAgICB9IGVsc2UgaWYgKGMgIT0gc3RyaW5nLmNoYXJDb2RlQXQoaisrKSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGo7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVBlcmlvZChkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IHBlcmlvZFJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLnAgPSBwZXJpb2RMb29rdXAuZ2V0KG5bMF0udG9Mb3dlckNhc2UoKSksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlU2hvcnRXZWVrZGF5KGQsIHN0cmluZywgaSkge1xuICAgIHZhciBuID0gc2hvcnRXZWVrZGF5UmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQudyA9IHNob3J0V2Vla2RheUxvb2t1cC5nZXQoblswXS50b0xvd2VyQ2FzZSgpKSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VXZWVrZGF5KGQsIHN0cmluZywgaSkge1xuICAgIHZhciBuID0gd2Vla2RheVJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLncgPSB3ZWVrZGF5TG9va3VwLmdldChuWzBdLnRvTG93ZXJDYXNlKCkpLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVNob3J0TW9udGgoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBzaG9ydE1vbnRoUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICAgIHJldHVybiBuID8gKGQubSA9IHNob3J0TW9udGhMb29rdXAuZ2V0KG5bMF0udG9Mb3dlckNhc2UoKSksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTW9udGgoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBtb250aFJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLm0gPSBtb250aExvb2t1cC5nZXQoblswXS50b0xvd2VyQ2FzZSgpKSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VMb2NhbGVEYXRlVGltZShkLCBzdHJpbmcsIGkpIHtcbiAgICByZXR1cm4gcGFyc2VTcGVjaWZpZXIoZCwgbG9jYWxlX2RhdGVUaW1lLCBzdHJpbmcsIGkpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VMb2NhbGVEYXRlKGQsIHN0cmluZywgaSkge1xuICAgIHJldHVybiBwYXJzZVNwZWNpZmllcihkLCBsb2NhbGVfZGF0ZSwgc3RyaW5nLCBpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTG9jYWxlVGltZShkLCBzdHJpbmcsIGkpIHtcbiAgICByZXR1cm4gcGFyc2VTcGVjaWZpZXIoZCwgbG9jYWxlX3RpbWUsIHN0cmluZywgaSk7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRTaG9ydFdlZWtkYXkoZCkge1xuICAgIHJldHVybiBsb2NhbGVfc2hvcnRXZWVrZGF5c1tkLmdldERheSgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFdlZWtkYXkoZCkge1xuICAgIHJldHVybiBsb2NhbGVfd2Vla2RheXNbZC5nZXREYXkoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRTaG9ydE1vbnRoKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3Nob3J0TW9udGhzW2QuZ2V0TW9udGgoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRNb250aChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9tb250aHNbZC5nZXRNb250aCgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFBlcmlvZChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9wZXJpb2RzWysoZC5nZXRIb3VycygpID49IDEyKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRRdWFydGVyKGQpIHtcbiAgICByZXR1cm4gMSArIH5+KGQuZ2V0TW9udGgoKSAvIDMpO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDU2hvcnRXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3Nob3J0V2Vla2RheXNbZC5nZXRVVENEYXkoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRVVENXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3dlZWtkYXlzW2QuZ2V0VVRDRGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDU2hvcnRNb250aChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydE1vbnRoc1tkLmdldFVUQ01vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDTW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfbW9udGhzW2QuZ2V0VVRDTW9udGgoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRVVENQZXJpb2QoZCkge1xuICAgIHJldHVybiBsb2NhbGVfcGVyaW9kc1srKGQuZ2V0VVRDSG91cnMoKSA+PSAxMildO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDUXVhcnRlcihkKSB7XG4gICAgcmV0dXJuIDEgKyB+fihkLmdldFVUQ01vbnRoKCkgLyAzKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZm9ybWF0OiBmdW5jdGlvbihzcGVjaWZpZXIpIHtcbiAgICAgIHZhciBmID0gbmV3Rm9ybWF0KHNwZWNpZmllciArPSBcIlwiLCBmb3JtYXRzKTtcbiAgICAgIGYudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHNwZWNpZmllcjsgfTtcbiAgICAgIHJldHVybiBmO1xuICAgIH0sXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIHAgPSBuZXdQYXJzZShzcGVjaWZpZXIgKz0gXCJcIiwgZmFsc2UpO1xuICAgICAgcC50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIHA7XG4gICAgfSxcbiAgICB1dGNGb3JtYXQ6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIGYgPSBuZXdGb3JtYXQoc3BlY2lmaWVyICs9IFwiXCIsIHV0Y0Zvcm1hdHMpO1xuICAgICAgZi50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gc3BlY2lmaWVyOyB9O1xuICAgICAgcmV0dXJuIGY7XG4gICAgfSxcbiAgICB1dGNQYXJzZTogZnVuY3Rpb24oc3BlY2lmaWVyKSB7XG4gICAgICB2YXIgcCA9IG5ld1BhcnNlKHNwZWNpZmllciArPSBcIlwiLCB0cnVlKTtcbiAgICAgIHAudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHNwZWNpZmllcjsgfTtcbiAgICAgIHJldHVybiBwO1xuICAgIH1cbiAgfTtcbn1cblxudmFyIHBhZHMgPSB7XCItXCI6IFwiXCIsIFwiX1wiOiBcIiBcIiwgXCIwXCI6IFwiMFwifSxcbiAgICBudW1iZXJSZSA9IC9eXFxzKlxcZCsvLCAvLyBub3RlOiBpZ25vcmVzIG5leHQgZGlyZWN0aXZlXG4gICAgcGVyY2VudFJlID0gL14lLyxcbiAgICByZXF1b3RlUmUgPSAvW1xcXFxeJCorP3xbXFxdKCkue31dL2c7XG5cbmZ1bmN0aW9uIHBhZCh2YWx1ZSwgZmlsbCwgd2lkdGgpIHtcbiAgdmFyIHNpZ24gPSB2YWx1ZSA8IDAgPyBcIi1cIiA6IFwiXCIsXG4gICAgICBzdHJpbmcgPSAoc2lnbiA/IC12YWx1ZSA6IHZhbHVlKSArIFwiXCIsXG4gICAgICBsZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuICByZXR1cm4gc2lnbiArIChsZW5ndGggPCB3aWR0aCA/IG5ldyBBcnJheSh3aWR0aCAtIGxlbmd0aCArIDEpLmpvaW4oZmlsbCkgKyBzdHJpbmcgOiBzdHJpbmcpO1xufVxuXG5mdW5jdGlvbiByZXF1b3RlKHMpIHtcbiAgcmV0dXJuIHMucmVwbGFjZShyZXF1b3RlUmUsIFwiXFxcXCQmXCIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRSZShuYW1lcykge1xuICByZXR1cm4gbmV3IFJlZ0V4cChcIl4oPzpcIiArIG5hbWVzLm1hcChyZXF1b3RlKS5qb2luKFwifFwiKSArIFwiKVwiLCBcImlcIik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdExvb2t1cChuYW1lcykge1xuICByZXR1cm4gbmV3IE1hcChuYW1lcy5tYXAoKG5hbWUsIGkpID0+IFtuYW1lLnRvTG93ZXJDYXNlKCksIGldKSk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlV2Vla2RheU51bWJlclN1bmRheShkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMSkpO1xuICByZXR1cm4gbiA/IChkLncgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVdlZWtkYXlOdW1iZXJNb25kYXkoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDEpKTtcbiAgcmV0dXJuIG4gPyAoZC51ID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrTnVtYmVyU3VuZGF5KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuVSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlV2Vla051bWJlcklTTyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLlYgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVdlZWtOdW1iZXJNb25kYXkoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5XID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VGdWxsWWVhcihkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgNCkpO1xuICByZXR1cm4gbiA/IChkLnkgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVllYXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC55ID0gK25bMF0gKyAoK25bMF0gPiA2OCA/IDE5MDAgOiAyMDAwKSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVpvbmUoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gL14oWil8KFsrLV1cXGRcXGQpKD86Oj8oXFxkXFxkKSk/Ly5leGVjKHN0cmluZy5zbGljZShpLCBpICsgNikpO1xuICByZXR1cm4gbiA/IChkLlogPSBuWzFdID8gMCA6IC0oblsyXSArIChuWzNdIHx8IFwiMDBcIikpLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlUXVhcnRlcihkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMSkpO1xuICByZXR1cm4gbiA/IChkLnEgPSBuWzBdICogMyAtIDMsIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VNb250aE51bWJlcihkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLm0gPSBuWzBdIC0gMSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZURheU9mTW9udGgoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5kID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VEYXlPZlllYXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDMpKTtcbiAgcmV0dXJuIG4gPyAoZC5tID0gMCwgZC5kID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VIb3VyMjQoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5IID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VNaW51dGVzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuTSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlU2Vjb25kcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLlMgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1pbGxpc2Vjb25kcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMykpO1xuICByZXR1cm4gbiA/IChkLkwgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZU1pY3Jvc2Vjb25kcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgNikpO1xuICByZXR1cm4gbiA/IChkLkwgPSBNYXRoLmZsb29yKG5bMF0gLyAxMDAwKSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZUxpdGVyYWxQZXJjZW50KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IHBlcmNlbnRSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMSkpO1xuICByZXR1cm4gbiA/IGkgKyBuWzBdLmxlbmd0aCA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVVuaXhUaW1lc3RhbXAoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSkpO1xuICByZXR1cm4gbiA/IChkLlEgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVVuaXhUaW1lc3RhbXBTZWNvbmRzKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgcmV0dXJuIG4gPyAoZC5zID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0RGF5T2ZNb250aChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXREYXRlKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRIb3VyMjQoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0SG91cnMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdEhvdXIxMihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRIb3VycygpICUgMTIgfHwgMTIsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXREYXlPZlllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKDEgKyB0aW1lRGF5LmNvdW50KHRpbWVZZWFyKGQpLCBkKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1pbGxpc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRNaWxsaXNlY29uZHMoKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1pY3Jvc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBmb3JtYXRNaWxsaXNlY29uZHMoZCwgcCkgKyBcIjAwMFwiO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNb250aE51bWJlcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRNb250aCgpICsgMSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE1pbnV0ZXMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0TWludXRlcygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0U2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRTZWNvbmRzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrZGF5TnVtYmVyTW9uZGF5KGQpIHtcbiAgdmFyIGRheSA9IGQuZ2V0RGF5KCk7XG4gIHJldHVybiBkYXkgPT09IDAgPyA3IDogZGF5O1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrTnVtYmVyU3VuZGF5KGQsIHApIHtcbiAgcmV0dXJuIHBhZCh0aW1lU3VuZGF5LmNvdW50KHRpbWVZZWFyKGQpIC0gMSwgZCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBkSVNPKGQpIHtcbiAgdmFyIGRheSA9IGQuZ2V0RGF5KCk7XG4gIHJldHVybiAoZGF5ID49IDQgfHwgZGF5ID09PSAwKSA/IHRpbWVUaHVyc2RheShkKSA6IHRpbWVUaHVyc2RheS5jZWlsKGQpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrTnVtYmVySVNPKGQsIHApIHtcbiAgZCA9IGRJU08oZCk7XG4gIHJldHVybiBwYWQodGltZVRodXJzZGF5LmNvdW50KHRpbWVZZWFyKGQpLCBkKSArICh0aW1lWWVhcihkKS5nZXREYXkoKSA9PT0gNCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrZGF5TnVtYmVyU3VuZGF5KGQpIHtcbiAgcmV0dXJuIGQuZ2V0RGF5KCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFdlZWtOdW1iZXJNb25kYXkoZCwgcCkge1xuICByZXR1cm4gcGFkKHRpbWVNb25kYXkuY291bnQodGltZVllYXIoZCkgLSAxLCBkKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0RnVsbFllYXIoKSAlIDEwMCwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFllYXJJU08oZCwgcCkge1xuICBkID0gZElTTyhkKTtcbiAgcmV0dXJuIHBhZChkLmdldEZ1bGxZZWFyKCkgJSAxMDAsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRGdWxsWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRGdWxsWWVhcigpICUgMTAwMDAsIHAsIDQpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRGdWxsWWVhcklTTyhkLCBwKSB7XG4gIHZhciBkYXkgPSBkLmdldERheSgpO1xuICBkID0gKGRheSA+PSA0IHx8IGRheSA9PT0gMCkgPyB0aW1lVGh1cnNkYXkoZCkgOiB0aW1lVGh1cnNkYXkuY2VpbChkKTtcbiAgcmV0dXJuIHBhZChkLmdldEZ1bGxZZWFyKCkgJSAxMDAwMCwgcCwgNCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFpvbmUoZCkge1xuICB2YXIgeiA9IGQuZ2V0VGltZXpvbmVPZmZzZXQoKTtcbiAgcmV0dXJuICh6ID4gMCA/IFwiLVwiIDogKHogKj0gLTEsIFwiK1wiKSlcbiAgICAgICsgcGFkKHogLyA2MCB8IDAsIFwiMFwiLCAyKVxuICAgICAgKyBwYWQoeiAlIDYwLCBcIjBcIiwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0RheU9mTW9udGgoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDRGF0ZSgpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDSG91cjI0KGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0hvdXJzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENIb3VyMTIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDSG91cnMoKSAlIDEyIHx8IDEyLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDRGF5T2ZZZWFyKGQsIHApIHtcbiAgcmV0dXJuIHBhZCgxICsgdXRjRGF5LmNvdW50KHV0Y1llYXIoZCksIGQpLCBwLCAzKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDTWlsbGlzZWNvbmRzKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ01pbGxpc2Vjb25kcygpLCBwLCAzKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDTWljcm9zZWNvbmRzKGQsIHApIHtcbiAgcmV0dXJuIGZvcm1hdFVUQ01pbGxpc2Vjb25kcyhkLCBwKSArIFwiMDAwXCI7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01vbnRoTnVtYmVyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ01vbnRoKCkgKyAxLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDTWludXRlcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENNaW51dGVzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENTZWNvbmRzKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ1NlY29uZHMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1dlZWtkYXlOdW1iZXJNb25kYXkoZCkge1xuICB2YXIgZG93ID0gZC5nZXRVVENEYXkoKTtcbiAgcmV0dXJuIGRvdyA9PT0gMCA/IDcgOiBkb3c7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1dlZWtOdW1iZXJTdW5kYXkoZCwgcCkge1xuICByZXR1cm4gcGFkKHV0Y1N1bmRheS5jb3VudCh1dGNZZWFyKGQpIC0gMSwgZCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBVVENkSVNPKGQpIHtcbiAgdmFyIGRheSA9IGQuZ2V0VVRDRGF5KCk7XG4gIHJldHVybiAoZGF5ID49IDQgfHwgZGF5ID09PSAwKSA/IHV0Y1RodXJzZGF5KGQpIDogdXRjVGh1cnNkYXkuY2VpbChkKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla051bWJlcklTTyhkLCBwKSB7XG4gIGQgPSBVVENkSVNPKGQpO1xuICByZXR1cm4gcGFkKHV0Y1RodXJzZGF5LmNvdW50KHV0Y1llYXIoZCksIGQpICsgKHV0Y1llYXIoZCkuZ2V0VVRDRGF5KCkgPT09IDQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla2RheU51bWJlclN1bmRheShkKSB7XG4gIHJldHVybiBkLmdldFVUQ0RheSgpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrTnVtYmVyTW9uZGF5KGQsIHApIHtcbiAgcmV0dXJuIHBhZCh1dGNNb25kYXkuY291bnQodXRjWWVhcihkKSAtIDEsIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENGdWxsWWVhcigpICUgMTAwLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDWWVhcklTTyhkLCBwKSB7XG4gIGQgPSBVVENkSVNPKGQpO1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDRnVsbFllYXIoKSAlIDEwMCwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0Z1bGxZZWFyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0Z1bGxZZWFyKCkgJSAxMDAwMCwgcCwgNCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0Z1bGxZZWFySVNPKGQsIHApIHtcbiAgdmFyIGRheSA9IGQuZ2V0VVRDRGF5KCk7XG4gIGQgPSAoZGF5ID49IDQgfHwgZGF5ID09PSAwKSA/IHV0Y1RodXJzZGF5KGQpIDogdXRjVGh1cnNkYXkuY2VpbChkKTtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0Z1bGxZZWFyKCkgJSAxMDAwMCwgcCwgNCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1pvbmUoKSB7XG4gIHJldHVybiBcIiswMDAwXCI7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdExpdGVyYWxQZXJjZW50KCkge1xuICByZXR1cm4gXCIlXCI7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVuaXhUaW1lc3RhbXAoZCkge1xuICByZXR1cm4gK2Q7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVuaXhUaW1lc3RhbXBTZWNvbmRzKGQpIHtcbiAgcmV0dXJuIE1hdGguZmxvb3IoK2QgLyAxMDAwKTtcbn1cbiIsICJpbXBvcnQgZm9ybWF0TG9jYWxlIGZyb20gXCIuL2xvY2FsZS5qc1wiO1xuXG52YXIgbG9jYWxlO1xuZXhwb3J0IHZhciB0aW1lRm9ybWF0O1xuZXhwb3J0IHZhciB0aW1lUGFyc2U7XG5leHBvcnQgdmFyIHV0Y0Zvcm1hdDtcbmV4cG9ydCB2YXIgdXRjUGFyc2U7XG5cbmRlZmF1bHRMb2NhbGUoe1xuICBkYXRlVGltZTogXCIleCwgJVhcIixcbiAgZGF0ZTogXCIlLW0vJS1kLyVZXCIsXG4gIHRpbWU6IFwiJS1JOiVNOiVTICVwXCIsXG4gIHBlcmlvZHM6IFtcIkFNXCIsIFwiUE1cIl0sXG4gIGRheXM6IFtcIlN1bmRheVwiLCBcIk1vbmRheVwiLCBcIlR1ZXNkYXlcIiwgXCJXZWRuZXNkYXlcIiwgXCJUaHVyc2RheVwiLCBcIkZyaWRheVwiLCBcIlNhdHVyZGF5XCJdLFxuICBzaG9ydERheXM6IFtcIlN1blwiLCBcIk1vblwiLCBcIlR1ZVwiLCBcIldlZFwiLCBcIlRodVwiLCBcIkZyaVwiLCBcIlNhdFwiXSxcbiAgbW9udGhzOiBbXCJKYW51YXJ5XCIsIFwiRmVicnVhcnlcIiwgXCJNYXJjaFwiLCBcIkFwcmlsXCIsIFwiTWF5XCIsIFwiSnVuZVwiLCBcIkp1bHlcIiwgXCJBdWd1c3RcIiwgXCJTZXB0ZW1iZXJcIiwgXCJPY3RvYmVyXCIsIFwiTm92ZW1iZXJcIiwgXCJEZWNlbWJlclwiXSxcbiAgc2hvcnRNb250aHM6IFtcIkphblwiLCBcIkZlYlwiLCBcIk1hclwiLCBcIkFwclwiLCBcIk1heVwiLCBcIkp1blwiLCBcIkp1bFwiLCBcIkF1Z1wiLCBcIlNlcFwiLCBcIk9jdFwiLCBcIk5vdlwiLCBcIkRlY1wiXVxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGRlZmF1bHRMb2NhbGUoZGVmaW5pdGlvbikge1xuICBsb2NhbGUgPSBmb3JtYXRMb2NhbGUoZGVmaW5pdGlvbik7XG4gIHRpbWVGb3JtYXQgPSBsb2NhbGUuZm9ybWF0O1xuICB0aW1lUGFyc2UgPSBsb2NhbGUucGFyc2U7XG4gIHV0Y0Zvcm1hdCA9IGxvY2FsZS51dGNGb3JtYXQ7XG4gIHV0Y1BhcnNlID0gbG9jYWxlLnV0Y1BhcnNlO1xuICByZXR1cm4gbG9jYWxlO1xufVxuIiwgImltcG9ydCB7dGltZVllYXIsIHRpbWVNb250aCwgdGltZVdlZWssIHRpbWVEYXksIHRpbWVIb3VyLCB0aW1lTWludXRlLCB0aW1lU2Vjb25kLCB0aW1lVGlja3MsIHRpbWVUaWNrSW50ZXJ2YWx9IGZyb20gXCJkMy10aW1lXCI7XG5pbXBvcnQge3RpbWVGb3JtYXR9IGZyb20gXCJkMy10aW1lLWZvcm1hdFwiO1xuaW1wb3J0IGNvbnRpbnVvdXMsIHtjb3B5fSBmcm9tIFwiLi9jb250aW51b3VzLmpzXCI7XG5pbXBvcnQge2luaXRSYW5nZX0gZnJvbSBcIi4vaW5pdC5qc1wiO1xuaW1wb3J0IG5pY2UgZnJvbSBcIi4vbmljZS5qc1wiO1xuXG5mdW5jdGlvbiBkYXRlKHQpIHtcbiAgcmV0dXJuIG5ldyBEYXRlKHQpO1xufVxuXG5mdW5jdGlvbiBudW1iZXIodCkge1xuICByZXR1cm4gdCBpbnN0YW5jZW9mIERhdGUgPyArdCA6ICtuZXcgRGF0ZSgrdCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxlbmRhcih0aWNrcywgdGlja0ludGVydmFsLCB5ZWFyLCBtb250aCwgd2VlaywgZGF5LCBob3VyLCBtaW51dGUsIHNlY29uZCwgZm9ybWF0KSB7XG4gIHZhciBzY2FsZSA9IGNvbnRpbnVvdXMoKSxcbiAgICAgIGludmVydCA9IHNjYWxlLmludmVydCxcbiAgICAgIGRvbWFpbiA9IHNjYWxlLmRvbWFpbjtcblxuICB2YXIgZm9ybWF0TWlsbGlzZWNvbmQgPSBmb3JtYXQoXCIuJUxcIiksXG4gICAgICBmb3JtYXRTZWNvbmQgPSBmb3JtYXQoXCI6JVNcIiksXG4gICAgICBmb3JtYXRNaW51dGUgPSBmb3JtYXQoXCIlSTolTVwiKSxcbiAgICAgIGZvcm1hdEhvdXIgPSBmb3JtYXQoXCIlSSAlcFwiKSxcbiAgICAgIGZvcm1hdERheSA9IGZvcm1hdChcIiVhICVkXCIpLFxuICAgICAgZm9ybWF0V2VlayA9IGZvcm1hdChcIiViICVkXCIpLFxuICAgICAgZm9ybWF0TW9udGggPSBmb3JtYXQoXCIlQlwiKSxcbiAgICAgIGZvcm1hdFllYXIgPSBmb3JtYXQoXCIlWVwiKTtcblxuICBmdW5jdGlvbiB0aWNrRm9ybWF0KGRhdGUpIHtcbiAgICByZXR1cm4gKHNlY29uZChkYXRlKSA8IGRhdGUgPyBmb3JtYXRNaWxsaXNlY29uZFxuICAgICAgICA6IG1pbnV0ZShkYXRlKSA8IGRhdGUgPyBmb3JtYXRTZWNvbmRcbiAgICAgICAgOiBob3VyKGRhdGUpIDwgZGF0ZSA/IGZvcm1hdE1pbnV0ZVxuICAgICAgICA6IGRheShkYXRlKSA8IGRhdGUgPyBmb3JtYXRIb3VyXG4gICAgICAgIDogbW9udGgoZGF0ZSkgPCBkYXRlID8gKHdlZWsoZGF0ZSkgPCBkYXRlID8gZm9ybWF0RGF5IDogZm9ybWF0V2VlaylcbiAgICAgICAgOiB5ZWFyKGRhdGUpIDwgZGF0ZSA/IGZvcm1hdE1vbnRoXG4gICAgICAgIDogZm9ybWF0WWVhcikoZGF0ZSk7XG4gIH1cblxuICBzY2FsZS5pbnZlcnQgPSBmdW5jdGlvbih5KSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKGludmVydCh5KSk7XG4gIH07XG5cbiAgc2NhbGUuZG9tYWluID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gZG9tYWluKEFycmF5LmZyb20oXywgbnVtYmVyKSkgOiBkb21haW4oKS5tYXAoZGF0ZSk7XG4gIH07XG5cbiAgc2NhbGUudGlja3MgPSBmdW5jdGlvbihpbnRlcnZhbCkge1xuICAgIHZhciBkID0gZG9tYWluKCk7XG4gICAgcmV0dXJuIHRpY2tzKGRbMF0sIGRbZC5sZW5ndGggLSAxXSwgaW50ZXJ2YWwgPT0gbnVsbCA/IDEwIDogaW50ZXJ2YWwpO1xuICB9O1xuXG4gIHNjYWxlLnRpY2tGb3JtYXQgPSBmdW5jdGlvbihjb3VudCwgc3BlY2lmaWVyKSB7XG4gICAgcmV0dXJuIHNwZWNpZmllciA9PSBudWxsID8gdGlja0Zvcm1hdCA6IGZvcm1hdChzcGVjaWZpZXIpO1xuICB9O1xuXG4gIHNjYWxlLm5pY2UgPSBmdW5jdGlvbihpbnRlcnZhbCkge1xuICAgIHZhciBkID0gZG9tYWluKCk7XG4gICAgaWYgKCFpbnRlcnZhbCB8fCB0eXBlb2YgaW50ZXJ2YWwucmFuZ2UgIT09IFwiZnVuY3Rpb25cIikgaW50ZXJ2YWwgPSB0aWNrSW50ZXJ2YWwoZFswXSwgZFtkLmxlbmd0aCAtIDFdLCBpbnRlcnZhbCA9PSBudWxsID8gMTAgOiBpbnRlcnZhbCk7XG4gICAgcmV0dXJuIGludGVydmFsID8gZG9tYWluKG5pY2UoZCwgaW50ZXJ2YWwpKSA6IHNjYWxlO1xuICB9O1xuXG4gIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY29weShzY2FsZSwgY2FsZW5kYXIodGlja3MsIHRpY2tJbnRlcnZhbCwgeWVhciwgbW9udGgsIHdlZWssIGRheSwgaG91ciwgbWludXRlLCBzZWNvbmQsIGZvcm1hdCkpO1xuICB9O1xuXG4gIHJldHVybiBzY2FsZTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdGltZSgpIHtcbiAgcmV0dXJuIGluaXRSYW5nZS5hcHBseShjYWxlbmRhcih0aW1lVGlja3MsIHRpbWVUaWNrSW50ZXJ2YWwsIHRpbWVZZWFyLCB0aW1lTW9udGgsIHRpbWVXZWVrLCB0aW1lRGF5LCB0aW1lSG91ciwgdGltZU1pbnV0ZSwgdGltZVNlY29uZCwgdGltZUZvcm1hdCkuZG9tYWluKFtuZXcgRGF0ZSgyMDAwLCAwLCAxKSwgbmV3IERhdGUoMjAwMCwgMCwgMildKSwgYXJndW1lbnRzKTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiBmdW5jdGlvbiBjb25zdGFudCgpIHtcbiAgICByZXR1cm4geDtcbiAgfTtcbn1cbiIsICJjb25zdCBwaSA9IE1hdGguUEksXG4gICAgdGF1ID0gMiAqIHBpLFxuICAgIGVwc2lsb24gPSAxZS02LFxuICAgIHRhdUVwc2lsb24gPSB0YXUgLSBlcHNpbG9uO1xuXG5mdW5jdGlvbiBhcHBlbmQoc3RyaW5ncykge1xuICB0aGlzLl8gKz0gc3RyaW5nc1swXTtcbiAgZm9yIChsZXQgaSA9IDEsIG4gPSBzdHJpbmdzLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgIHRoaXMuXyArPSBhcmd1bWVudHNbaV0gKyBzdHJpbmdzW2ldO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFwcGVuZFJvdW5kKGRpZ2l0cykge1xuICBsZXQgZCA9IE1hdGguZmxvb3IoZGlnaXRzKTtcbiAgaWYgKCEoZCA+PSAwKSkgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIGRpZ2l0czogJHtkaWdpdHN9YCk7XG4gIGlmIChkID4gMTUpIHJldHVybiBhcHBlbmQ7XG4gIGNvbnN0IGsgPSAxMCAqKiBkO1xuICByZXR1cm4gZnVuY3Rpb24oc3RyaW5ncykge1xuICAgIHRoaXMuXyArPSBzdHJpbmdzWzBdO1xuICAgIGZvciAobGV0IGkgPSAxLCBuID0gc3RyaW5ncy5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgIHRoaXMuXyArPSBNYXRoLnJvdW5kKGFyZ3VtZW50c1tpXSAqIGspIC8gayArIHN0cmluZ3NbaV07XG4gICAgfVxuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgUGF0aCB7XG4gIGNvbnN0cnVjdG9yKGRpZ2l0cykge1xuICAgIHRoaXMuX3gwID0gdGhpcy5feTAgPSAvLyBzdGFydCBvZiBjdXJyZW50IHN1YnBhdGhcbiAgICB0aGlzLl94MSA9IHRoaXMuX3kxID0gbnVsbDsgLy8gZW5kIG9mIGN1cnJlbnQgc3VicGF0aFxuICAgIHRoaXMuXyA9IFwiXCI7XG4gICAgdGhpcy5fYXBwZW5kID0gZGlnaXRzID09IG51bGwgPyBhcHBlbmQgOiBhcHBlbmRSb3VuZChkaWdpdHMpO1xuICB9XG4gIG1vdmVUbyh4LCB5KSB7XG4gICAgdGhpcy5fYXBwZW5kYE0ke3RoaXMuX3gwID0gdGhpcy5feDEgPSAreH0sJHt0aGlzLl95MCA9IHRoaXMuX3kxID0gK3l9YDtcbiAgfVxuICBjbG9zZVBhdGgoKSB7XG4gICAgaWYgKHRoaXMuX3gxICE9PSBudWxsKSB7XG4gICAgICB0aGlzLl94MSA9IHRoaXMuX3gwLCB0aGlzLl95MSA9IHRoaXMuX3kwO1xuICAgICAgdGhpcy5fYXBwZW5kYFpgO1xuICAgIH1cbiAgfVxuICBsaW5lVG8oeCwgeSkge1xuICAgIHRoaXMuX2FwcGVuZGBMJHt0aGlzLl94MSA9ICt4fSwke3RoaXMuX3kxID0gK3l9YDtcbiAgfVxuICBxdWFkcmF0aWNDdXJ2ZVRvKHgxLCB5MSwgeCwgeSkge1xuICAgIHRoaXMuX2FwcGVuZGBRJHsreDF9LCR7K3kxfSwke3RoaXMuX3gxID0gK3h9LCR7dGhpcy5feTEgPSAreX1gO1xuICB9XG4gIGJlemllckN1cnZlVG8oeDEsIHkxLCB4MiwgeTIsIHgsIHkpIHtcbiAgICB0aGlzLl9hcHBlbmRgQyR7K3gxfSwkeyt5MX0sJHsreDJ9LCR7K3kyfSwke3RoaXMuX3gxID0gK3h9LCR7dGhpcy5feTEgPSAreX1gO1xuICB9XG4gIGFyY1RvKHgxLCB5MSwgeDIsIHkyLCByKSB7XG4gICAgeDEgPSAreDEsIHkxID0gK3kxLCB4MiA9ICt4MiwgeTIgPSAreTIsIHIgPSArcjtcblxuICAgIC8vIElzIHRoZSByYWRpdXMgbmVnYXRpdmU/IEVycm9yLlxuICAgIGlmIChyIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBuZWdhdGl2ZSByYWRpdXM6ICR7cn1gKTtcblxuICAgIGxldCB4MCA9IHRoaXMuX3gxLFxuICAgICAgICB5MCA9IHRoaXMuX3kxLFxuICAgICAgICB4MjEgPSB4MiAtIHgxLFxuICAgICAgICB5MjEgPSB5MiAtIHkxLFxuICAgICAgICB4MDEgPSB4MCAtIHgxLFxuICAgICAgICB5MDEgPSB5MCAtIHkxLFxuICAgICAgICBsMDFfMiA9IHgwMSAqIHgwMSArIHkwMSAqIHkwMTtcblxuICAgIC8vIElzIHRoaXMgcGF0aCBlbXB0eT8gTW92ZSB0byAoeDEseTEpLlxuICAgIGlmICh0aGlzLl94MSA9PT0gbnVsbCkge1xuICAgICAgdGhpcy5fYXBwZW5kYE0ke3RoaXMuX3gxID0geDF9LCR7dGhpcy5feTEgPSB5MX1gO1xuICAgIH1cblxuICAgIC8vIE9yLCBpcyAoeDEseTEpIGNvaW5jaWRlbnQgd2l0aCAoeDAseTApPyBEbyBub3RoaW5nLlxuICAgIGVsc2UgaWYgKCEobDAxXzIgPiBlcHNpbG9uKSk7XG5cbiAgICAvLyBPciwgYXJlICh4MCx5MCksICh4MSx5MSkgYW5kICh4Mix5MikgY29sbGluZWFyP1xuICAgIC8vIEVxdWl2YWxlbnRseSwgaXMgKHgxLHkxKSBjb2luY2lkZW50IHdpdGggKHgyLHkyKT9cbiAgICAvLyBPciwgaXMgdGhlIHJhZGl1cyB6ZXJvPyBMaW5lIHRvICh4MSx5MSkuXG4gICAgZWxzZSBpZiAoIShNYXRoLmFicyh5MDEgKiB4MjEgLSB5MjEgKiB4MDEpID4gZXBzaWxvbikgfHwgIXIpIHtcbiAgICAgIHRoaXMuX2FwcGVuZGBMJHt0aGlzLl94MSA9IHgxfSwke3RoaXMuX3kxID0geTF9YDtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UsIGRyYXcgYW4gYXJjIVxuICAgIGVsc2Uge1xuICAgICAgbGV0IHgyMCA9IHgyIC0geDAsXG4gICAgICAgICAgeTIwID0geTIgLSB5MCxcbiAgICAgICAgICBsMjFfMiA9IHgyMSAqIHgyMSArIHkyMSAqIHkyMSxcbiAgICAgICAgICBsMjBfMiA9IHgyMCAqIHgyMCArIHkyMCAqIHkyMCxcbiAgICAgICAgICBsMjEgPSBNYXRoLnNxcnQobDIxXzIpLFxuICAgICAgICAgIGwwMSA9IE1hdGguc3FydChsMDFfMiksXG4gICAgICAgICAgbCA9IHIgKiBNYXRoLnRhbigocGkgLSBNYXRoLmFjb3MoKGwyMV8yICsgbDAxXzIgLSBsMjBfMikgLyAoMiAqIGwyMSAqIGwwMSkpKSAvIDIpLFxuICAgICAgICAgIHQwMSA9IGwgLyBsMDEsXG4gICAgICAgICAgdDIxID0gbCAvIGwyMTtcblxuICAgICAgLy8gSWYgdGhlIHN0YXJ0IHRhbmdlbnQgaXMgbm90IGNvaW5jaWRlbnQgd2l0aCAoeDAseTApLCBsaW5lIHRvLlxuICAgICAgaWYgKE1hdGguYWJzKHQwMSAtIDEpID4gZXBzaWxvbikge1xuICAgICAgICB0aGlzLl9hcHBlbmRgTCR7eDEgKyB0MDEgKiB4MDF9LCR7eTEgKyB0MDEgKiB5MDF9YDtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fYXBwZW5kYEEke3J9LCR7cn0sMCwwLCR7Kyh5MDEgKiB4MjAgPiB4MDEgKiB5MjApfSwke3RoaXMuX3gxID0geDEgKyB0MjEgKiB4MjF9LCR7dGhpcy5feTEgPSB5MSArIHQyMSAqIHkyMX1gO1xuICAgIH1cbiAgfVxuICBhcmMoeCwgeSwgciwgYTAsIGExLCBjY3cpIHtcbiAgICB4ID0gK3gsIHkgPSAreSwgciA9ICtyLCBjY3cgPSAhIWNjdztcblxuICAgIC8vIElzIHRoZSByYWRpdXMgbmVnYXRpdmU/IEVycm9yLlxuICAgIGlmIChyIDwgMCkgdGhyb3cgbmV3IEVycm9yKGBuZWdhdGl2ZSByYWRpdXM6ICR7cn1gKTtcblxuICAgIGxldCBkeCA9IHIgKiBNYXRoLmNvcyhhMCksXG4gICAgICAgIGR5ID0gciAqIE1hdGguc2luKGEwKSxcbiAgICAgICAgeDAgPSB4ICsgZHgsXG4gICAgICAgIHkwID0geSArIGR5LFxuICAgICAgICBjdyA9IDEgXiBjY3csXG4gICAgICAgIGRhID0gY2N3ID8gYTAgLSBhMSA6IGExIC0gYTA7XG5cbiAgICAvLyBJcyB0aGlzIHBhdGggZW1wdHk/IE1vdmUgdG8gKHgwLHkwKS5cbiAgICBpZiAodGhpcy5feDEgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuX2FwcGVuZGBNJHt4MH0sJHt5MH1gO1xuICAgIH1cblxuICAgIC8vIE9yLCBpcyAoeDAseTApIG5vdCBjb2luY2lkZW50IHdpdGggdGhlIHByZXZpb3VzIHBvaW50PyBMaW5lIHRvICh4MCx5MCkuXG4gICAgZWxzZSBpZiAoTWF0aC5hYnModGhpcy5feDEgLSB4MCkgPiBlcHNpbG9uIHx8IE1hdGguYWJzKHRoaXMuX3kxIC0geTApID4gZXBzaWxvbikge1xuICAgICAgdGhpcy5fYXBwZW5kYEwke3gwfSwke3kwfWA7XG4gICAgfVxuXG4gICAgLy8gSXMgdGhpcyBhcmMgZW1wdHk/IFdlXHUyMDE5cmUgZG9uZS5cbiAgICBpZiAoIXIpIHJldHVybjtcblxuICAgIC8vIERvZXMgdGhlIGFuZ2xlIGdvIHRoZSB3cm9uZyB3YXk/IEZsaXAgdGhlIGRpcmVjdGlvbi5cbiAgICBpZiAoZGEgPCAwKSBkYSA9IGRhICUgdGF1ICsgdGF1O1xuXG4gICAgLy8gSXMgdGhpcyBhIGNvbXBsZXRlIGNpcmNsZT8gRHJhdyB0d28gYXJjcyB0byBjb21wbGV0ZSB0aGUgY2lyY2xlLlxuICAgIGlmIChkYSA+IHRhdUVwc2lsb24pIHtcbiAgICAgIHRoaXMuX2FwcGVuZGBBJHtyfSwke3J9LDAsMSwke2N3fSwke3ggLSBkeH0sJHt5IC0gZHl9QSR7cn0sJHtyfSwwLDEsJHtjd30sJHt0aGlzLl94MSA9IHgwfSwke3RoaXMuX3kxID0geTB9YDtcbiAgICB9XG5cbiAgICAvLyBJcyB0aGlzIGFyYyBub24tZW1wdHk/IERyYXcgYW4gYXJjIVxuICAgIGVsc2UgaWYgKGRhID4gZXBzaWxvbikge1xuICAgICAgdGhpcy5fYXBwZW5kYEEke3J9LCR7cn0sMCwkeysoZGEgPj0gcGkpfSwke2N3fSwke3RoaXMuX3gxID0geCArIHIgKiBNYXRoLmNvcyhhMSl9LCR7dGhpcy5feTEgPSB5ICsgciAqIE1hdGguc2luKGExKX1gO1xuICAgIH1cbiAgfVxuICByZWN0KHgsIHksIHcsIGgpIHtcbiAgICB0aGlzLl9hcHBlbmRgTSR7dGhpcy5feDAgPSB0aGlzLl94MSA9ICt4fSwke3RoaXMuX3kwID0gdGhpcy5feTEgPSAreX1oJHt3ID0gK3d9diR7K2h9aCR7LXd9WmA7XG4gIH1cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMuXztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGF0aCgpIHtcbiAgcmV0dXJuIG5ldyBQYXRoO1xufVxuXG4vLyBBbGxvdyBpbnN0YW5jZW9mIGQzLnBhdGhcbnBhdGgucHJvdG90eXBlID0gUGF0aC5wcm90b3R5cGU7XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoUm91bmQoZGlnaXRzID0gMykge1xuICByZXR1cm4gbmV3IFBhdGgoK2RpZ2l0cyk7XG59XG4iLCAiaW1wb3J0IHtQYXRofSBmcm9tIFwiZDMtcGF0aFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gd2l0aFBhdGgoc2hhcGUpIHtcbiAgbGV0IGRpZ2l0cyA9IDM7XG5cbiAgc2hhcGUuZGlnaXRzID0gZnVuY3Rpb24oXykge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRpZ2l0cztcbiAgICBpZiAoXyA9PSBudWxsKSB7XG4gICAgICBkaWdpdHMgPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBkID0gTWF0aC5mbG9vcihfKTtcbiAgICAgIGlmICghKGQgPj0gMCkpIHRocm93IG5ldyBSYW5nZUVycm9yKGBpbnZhbGlkIGRpZ2l0czogJHtffWApO1xuICAgICAgZGlnaXRzID0gZDtcbiAgICB9XG4gICAgcmV0dXJuIHNoYXBlO1xuICB9O1xuXG4gIHJldHVybiAoKSA9PiBuZXcgUGF0aChkaWdpdHMpO1xufVxuIiwgImV4cG9ydCB2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSBcIm9iamVjdFwiICYmIFwibGVuZ3RoXCIgaW4geFxuICAgID8geCAvLyBBcnJheSwgVHlwZWRBcnJheSwgTm9kZUxpc3QsIGFycmF5LWxpa2VcbiAgICA6IEFycmF5LmZyb20oeCk7IC8vIE1hcCwgU2V0LCBpdGVyYWJsZSwgc3RyaW5nLCBvciBhbnl0aGluZyBlbHNlXG59XG4iLCAiZnVuY3Rpb24gTGluZWFyKGNvbnRleHQpIHtcbiAgdGhpcy5fY29udGV4dCA9IGNvbnRleHQ7XG59XG5cbkxpbmVhci5wcm90b3R5cGUgPSB7XG4gIGFyZWFTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGluZSA9IDA7XG4gIH0sXG4gIGFyZWFFbmQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSBOYU47XG4gIH0sXG4gIGxpbmVTdGFydDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fcG9pbnQgPSAwO1xuICB9LFxuICBsaW5lRW5kOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5fbGluZSB8fCAodGhpcy5fbGluZSAhPT0gMCAmJiB0aGlzLl9wb2ludCA9PT0gMSkpIHRoaXMuX2NvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgdGhpcy5fbGluZSA9IDEgLSB0aGlzLl9saW5lO1xuICB9LFxuICBwb2ludDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHggPSAreCwgeSA9ICt5O1xuICAgIHN3aXRjaCAodGhpcy5fcG9pbnQpIHtcbiAgICAgIGNhc2UgMDogdGhpcy5fcG9pbnQgPSAxOyB0aGlzLl9saW5lID8gdGhpcy5fY29udGV4dC5saW5lVG8oeCwgeSkgOiB0aGlzLl9jb250ZXh0Lm1vdmVUbyh4LCB5KTsgYnJlYWs7XG4gICAgICBjYXNlIDE6IHRoaXMuX3BvaW50ID0gMjsgLy8gZmFsbHMgdGhyb3VnaFxuICAgICAgZGVmYXVsdDogdGhpcy5fY29udGV4dC5saW5lVG8oeCwgeSk7IGJyZWFrO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29udGV4dCkge1xuICByZXR1cm4gbmV3IExpbmVhcihjb250ZXh0KTtcbn1cbiIsICJleHBvcnQgZnVuY3Rpb24geChwKSB7XG4gIHJldHVybiBwWzBdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24geShwKSB7XG4gIHJldHVybiBwWzFdO1xufVxuIiwgImltcG9ydCBhcnJheSBmcm9tIFwiLi9hcnJheS5qc1wiO1xuaW1wb3J0IGNvbnN0YW50IGZyb20gXCIuL2NvbnN0YW50LmpzXCI7XG5pbXBvcnQgY3VydmVMaW5lYXIgZnJvbSBcIi4vY3VydmUvbGluZWFyLmpzXCI7XG5pbXBvcnQge3dpdGhQYXRofSBmcm9tIFwiLi9wYXRoLmpzXCI7XG5pbXBvcnQge3ggYXMgcG9pbnRYLCB5IGFzIHBvaW50WX0gZnJvbSBcIi4vcG9pbnQuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCwgeSkge1xuICB2YXIgZGVmaW5lZCA9IGNvbnN0YW50KHRydWUpLFxuICAgICAgY29udGV4dCA9IG51bGwsXG4gICAgICBjdXJ2ZSA9IGN1cnZlTGluZWFyLFxuICAgICAgb3V0cHV0ID0gbnVsbCxcbiAgICAgIHBhdGggPSB3aXRoUGF0aChsaW5lKTtcblxuICB4ID0gdHlwZW9mIHggPT09IFwiZnVuY3Rpb25cIiA/IHggOiAoeCA9PT0gdW5kZWZpbmVkKSA/IHBvaW50WCA6IGNvbnN0YW50KHgpO1xuICB5ID0gdHlwZW9mIHkgPT09IFwiZnVuY3Rpb25cIiA/IHkgOiAoeSA9PT0gdW5kZWZpbmVkKSA/IHBvaW50WSA6IGNvbnN0YW50KHkpO1xuXG4gIGZ1bmN0aW9uIGxpbmUoZGF0YSkge1xuICAgIHZhciBpLFxuICAgICAgICBuID0gKGRhdGEgPSBhcnJheShkYXRhKSkubGVuZ3RoLFxuICAgICAgICBkLFxuICAgICAgICBkZWZpbmVkMCA9IGZhbHNlLFxuICAgICAgICBidWZmZXI7XG5cbiAgICBpZiAoY29udGV4dCA9PSBudWxsKSBvdXRwdXQgPSBjdXJ2ZShidWZmZXIgPSBwYXRoKCkpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8PSBuOyArK2kpIHtcbiAgICAgIGlmICghKGkgPCBuICYmIGRlZmluZWQoZCA9IGRhdGFbaV0sIGksIGRhdGEpKSA9PT0gZGVmaW5lZDApIHtcbiAgICAgICAgaWYgKGRlZmluZWQwID0gIWRlZmluZWQwKSBvdXRwdXQubGluZVN0YXJ0KCk7XG4gICAgICAgIGVsc2Ugb3V0cHV0LmxpbmVFbmQoKTtcbiAgICAgIH1cbiAgICAgIGlmIChkZWZpbmVkMCkgb3V0cHV0LnBvaW50KCt4KGQsIGksIGRhdGEpLCAreShkLCBpLCBkYXRhKSk7XG4gICAgfVxuXG4gICAgaWYgKGJ1ZmZlcikgcmV0dXJuIG91dHB1dCA9IG51bGwsIGJ1ZmZlciArIFwiXCIgfHwgbnVsbDtcbiAgfVxuXG4gIGxpbmUueCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh4ID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGxpbmUpIDogeDtcbiAgfTtcblxuICBsaW5lLnkgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeSA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBsaW5lKSA6IHk7XG4gIH07XG5cbiAgbGluZS5kZWZpbmVkID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGRlZmluZWQgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCEhXyksIGxpbmUpIDogZGVmaW5lZDtcbiAgfTtcblxuICBsaW5lLmN1cnZlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGN1cnZlID0gXywgY29udGV4dCAhPSBudWxsICYmIChvdXRwdXQgPSBjdXJ2ZShjb250ZXh0KSksIGxpbmUpIDogY3VydmU7XG4gIH07XG5cbiAgbGluZS5jb250ZXh0ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKF8gPT0gbnVsbCA/IGNvbnRleHQgPSBvdXRwdXQgPSBudWxsIDogb3V0cHV0ID0gY3VydmUoY29udGV4dCA9IF8pLCBsaW5lKSA6IGNvbnRleHQ7XG4gIH07XG5cbiAgcmV0dXJuIGxpbmU7XG59XG4iLCAiaW1wb3J0IGFycmF5IGZyb20gXCIuL2FycmF5LmpzXCI7XG5pbXBvcnQgY29uc3RhbnQgZnJvbSBcIi4vY29uc3RhbnQuanNcIjtcbmltcG9ydCBjdXJ2ZUxpbmVhciBmcm9tIFwiLi9jdXJ2ZS9saW5lYXIuanNcIjtcbmltcG9ydCBsaW5lIGZyb20gXCIuL2xpbmUuanNcIjtcbmltcG9ydCB7d2l0aFBhdGh9IGZyb20gXCIuL3BhdGguanNcIjtcbmltcG9ydCB7eCBhcyBwb2ludFgsIHkgYXMgcG9pbnRZfSBmcm9tIFwiLi9wb2ludC5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4MCwgeTAsIHkxKSB7XG4gIHZhciB4MSA9IG51bGwsXG4gICAgICBkZWZpbmVkID0gY29uc3RhbnQodHJ1ZSksXG4gICAgICBjb250ZXh0ID0gbnVsbCxcbiAgICAgIGN1cnZlID0gY3VydmVMaW5lYXIsXG4gICAgICBvdXRwdXQgPSBudWxsLFxuICAgICAgcGF0aCA9IHdpdGhQYXRoKGFyZWEpO1xuXG4gIHgwID0gdHlwZW9mIHgwID09PSBcImZ1bmN0aW9uXCIgPyB4MCA6ICh4MCA9PT0gdW5kZWZpbmVkKSA/IHBvaW50WCA6IGNvbnN0YW50KCt4MCk7XG4gIHkwID0gdHlwZW9mIHkwID09PSBcImZ1bmN0aW9uXCIgPyB5MCA6ICh5MCA9PT0gdW5kZWZpbmVkKSA/IGNvbnN0YW50KDApIDogY29uc3RhbnQoK3kwKTtcbiAgeTEgPSB0eXBlb2YgeTEgPT09IFwiZnVuY3Rpb25cIiA/IHkxIDogKHkxID09PSB1bmRlZmluZWQpID8gcG9pbnRZIDogY29uc3RhbnQoK3kxKTtcblxuICBmdW5jdGlvbiBhcmVhKGRhdGEpIHtcbiAgICB2YXIgaSxcbiAgICAgICAgaixcbiAgICAgICAgayxcbiAgICAgICAgbiA9IChkYXRhID0gYXJyYXkoZGF0YSkpLmxlbmd0aCxcbiAgICAgICAgZCxcbiAgICAgICAgZGVmaW5lZDAgPSBmYWxzZSxcbiAgICAgICAgYnVmZmVyLFxuICAgICAgICB4MHogPSBuZXcgQXJyYXkobiksXG4gICAgICAgIHkweiA9IG5ldyBBcnJheShuKTtcblxuICAgIGlmIChjb250ZXh0ID09IG51bGwpIG91dHB1dCA9IGN1cnZlKGJ1ZmZlciA9IHBhdGgoKSk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDw9IG47ICsraSkge1xuICAgICAgaWYgKCEoaSA8IG4gJiYgZGVmaW5lZChkID0gZGF0YVtpXSwgaSwgZGF0YSkpID09PSBkZWZpbmVkMCkge1xuICAgICAgICBpZiAoZGVmaW5lZDAgPSAhZGVmaW5lZDApIHtcbiAgICAgICAgICBqID0gaTtcbiAgICAgICAgICBvdXRwdXQuYXJlYVN0YXJ0KCk7XG4gICAgICAgICAgb3V0cHV0LmxpbmVTdGFydCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dHB1dC5saW5lRW5kKCk7XG4gICAgICAgICAgb3V0cHV0LmxpbmVTdGFydCgpO1xuICAgICAgICAgIGZvciAoayA9IGkgLSAxOyBrID49IGo7IC0taykge1xuICAgICAgICAgICAgb3V0cHV0LnBvaW50KHgweltrXSwgeTB6W2tdKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3V0cHV0LmxpbmVFbmQoKTtcbiAgICAgICAgICBvdXRwdXQuYXJlYUVuZCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoZGVmaW5lZDApIHtcbiAgICAgICAgeDB6W2ldID0gK3gwKGQsIGksIGRhdGEpLCB5MHpbaV0gPSAreTAoZCwgaSwgZGF0YSk7XG4gICAgICAgIG91dHB1dC5wb2ludCh4MSA/ICt4MShkLCBpLCBkYXRhKSA6IHgweltpXSwgeTEgPyAreTEoZCwgaSwgZGF0YSkgOiB5MHpbaV0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChidWZmZXIpIHJldHVybiBvdXRwdXQgPSBudWxsLCBidWZmZXIgKyBcIlwiIHx8IG51bGw7XG4gIH1cblxuICBmdW5jdGlvbiBhcmVhbGluZSgpIHtcbiAgICByZXR1cm4gbGluZSgpLmRlZmluZWQoZGVmaW5lZCkuY3VydmUoY3VydmUpLmNvbnRleHQoY29udGV4dCk7XG4gIH1cblxuICBhcmVhLnggPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeDAgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgeDEgPSBudWxsLCBhcmVhKSA6IHgwO1xuICB9O1xuXG4gIGFyZWEueDAgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeDAgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJlYSkgOiB4MDtcbiAgfTtcblxuICBhcmVhLngxID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgxID0gXyA9PSBudWxsID8gbnVsbCA6IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmVhKSA6IHgxO1xuICB9O1xuXG4gIGFyZWEueSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh5MCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCB5MSA9IG51bGwsIGFyZWEpIDogeTA7XG4gIH07XG5cbiAgYXJlYS55MCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh5MCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmVhKSA6IHkwO1xuICB9O1xuXG4gIGFyZWEueTEgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeTEgPSBfID09IG51bGwgPyBudWxsIDogdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGFyZWEpIDogeTE7XG4gIH07XG5cbiAgYXJlYS5saW5lWDAgPVxuICBhcmVhLmxpbmVZMCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmVhbGluZSgpLngoeDApLnkoeTApO1xuICB9O1xuXG4gIGFyZWEubGluZVkxID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFyZWFsaW5lKCkueCh4MCkueSh5MSk7XG4gIH07XG5cbiAgYXJlYS5saW5lWDEgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXJlYWxpbmUoKS54KHgxKS55KHkwKTtcbiAgfTtcblxuICBhcmVhLmRlZmluZWQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZGVmaW5lZCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoISFfKSwgYXJlYSkgOiBkZWZpbmVkO1xuICB9O1xuXG4gIGFyZWEuY3VydmUgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoY3VydmUgPSBfLCBjb250ZXh0ICE9IG51bGwgJiYgKG91dHB1dCA9IGN1cnZlKGNvbnRleHQpKSwgYXJlYSkgOiBjdXJ2ZTtcbiAgfTtcblxuICBhcmVhLmNvbnRleHQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoXyA9PSBudWxsID8gY29udGV4dCA9IG91dHB1dCA9IG51bGwgOiBvdXRwdXQgPSBjdXJ2ZShjb250ZXh0ID0gXyksIGFyZWEpIDogY29udGV4dDtcbiAgfTtcblxuICByZXR1cm4gYXJlYTtcbn1cbiIsICJleHBvcnQgdmFyIHhodG1sID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCI7XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgc3ZnOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsXG4gIHhodG1sOiB4aHRtbCxcbiAgeGxpbms6IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLFxuICB4bWw6IFwiaHR0cDovL3d3dy53My5vcmcvWE1MLzE5OTgvbmFtZXNwYWNlXCIsXG4gIHhtbG5zOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAveG1sbnMvXCJcbn07XG4iLCAiaW1wb3J0IG5hbWVzcGFjZXMgZnJvbSBcIi4vbmFtZXNwYWNlcy5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBwcmVmaXggPSBuYW1lICs9IFwiXCIsIGkgPSBwcmVmaXguaW5kZXhPZihcIjpcIik7XG4gIGlmIChpID49IDAgJiYgKHByZWZpeCA9IG5hbWUuc2xpY2UoMCwgaSkpICE9PSBcInhtbG5zXCIpIG5hbWUgPSBuYW1lLnNsaWNlKGkgKyAxKTtcbiAgcmV0dXJuIG5hbWVzcGFjZXMuaGFzT3duUHJvcGVydHkocHJlZml4KSA/IHtzcGFjZTogbmFtZXNwYWNlc1twcmVmaXhdLCBsb2NhbDogbmFtZX0gOiBuYW1lOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXByb3RvdHlwZS1idWlsdGluc1xufVxuIiwgImltcG9ydCBuYW1lc3BhY2UgZnJvbSBcIi4vbmFtZXNwYWNlLmpzXCI7XG5pbXBvcnQge3hodG1sfSBmcm9tIFwiLi9uYW1lc3BhY2VzLmpzXCI7XG5cbmZ1bmN0aW9uIGNyZWF0b3JJbmhlcml0KG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBkb2N1bWVudCA9IHRoaXMub3duZXJEb2N1bWVudCxcbiAgICAgICAgdXJpID0gdGhpcy5uYW1lc3BhY2VVUkk7XG4gICAgcmV0dXJuIHVyaSA9PT0geGh0bWwgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm5hbWVzcGFjZVVSSSA9PT0geGh0bWxcbiAgICAgICAgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5hbWUpXG4gICAgICAgIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHVyaSwgbmFtZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0b3JGaXhlZChmdWxsbmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMub3duZXJEb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSkge1xuICB2YXIgZnVsbG5hbWUgPSBuYW1lc3BhY2UobmFtZSk7XG4gIHJldHVybiAoZnVsbG5hbWUubG9jYWxcbiAgICAgID8gY3JlYXRvckZpeGVkXG4gICAgICA6IGNyZWF0b3JJbmhlcml0KShmdWxsbmFtZSk7XG59XG4iLCAiZnVuY3Rpb24gbm9uZSgpIHt9XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiBzZWxlY3RvciA9PSBudWxsID8gbm9uZSA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9O1xufVxuIiwgImltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleC5qc1wiO1xuaW1wb3J0IHNlbGVjdG9yIGZyb20gXCIuLi9zZWxlY3Rvci5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3QpIHtcbiAgaWYgKHR5cGVvZiBzZWxlY3QgIT09IFwiZnVuY3Rpb25cIikgc2VsZWN0ID0gc2VsZWN0b3Ioc2VsZWN0KTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHN1Ymdyb3VwID0gc3ViZ3JvdXBzW2pdID0gbmV3IEFycmF5KG4pLCBub2RlLCBzdWJub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKChub2RlID0gZ3JvdXBbaV0pICYmIChzdWJub2RlID0gc2VsZWN0LmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApKSkge1xuICAgICAgICBpZiAoXCJfX2RhdGFfX1wiIGluIG5vZGUpIHN1Ym5vZGUuX19kYXRhX18gPSBub2RlLl9fZGF0YV9fO1xuICAgICAgICBzdWJncm91cFtpXSA9IHN1Ym5vZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oc3ViZ3JvdXBzLCB0aGlzLl9wYXJlbnRzKTtcbn1cbiIsICIvLyBHaXZlbiBzb21ldGhpbmcgYXJyYXkgbGlrZSAob3IgbnVsbCksIHJldHVybnMgc29tZXRoaW5nIHRoYXQgaXMgc3RyaWN0bHkgYW5cbi8vIGFycmF5LiBUaGlzIGlzIHVzZWQgdG8gZW5zdXJlIHRoYXQgYXJyYXktbGlrZSBvYmplY3RzIHBhc3NlZCB0byBkMy5zZWxlY3RBbGxcbi8vIG9yIHNlbGVjdGlvbi5zZWxlY3RBbGwgYXJlIGNvbnZlcnRlZCBpbnRvIHByb3BlciBhcnJheXMgd2hlbiBjcmVhdGluZyBhXG4vLyBzZWxlY3Rpb247IHdlIGRvblx1MjAxOXQgZXZlciB3YW50IHRvIGNyZWF0ZSBhIHNlbGVjdGlvbiBiYWNrZWQgYnkgYSBsaXZlXG4vLyBIVE1MQ29sbGVjdGlvbiBvciBOb2RlTGlzdC4gSG93ZXZlciwgbm90ZSB0aGF0IHNlbGVjdGlvbi5zZWxlY3RBbGwgd2lsbCB1c2UgYVxuLy8gc3RhdGljIE5vZGVMaXN0IGFzIGEgZ3JvdXAsIHNpbmNlIGl0IHNhZmVseSBkZXJpdmVkIGZyb20gcXVlcnlTZWxlY3RvckFsbC5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGFycmF5KHgpIHtcbiAgcmV0dXJuIHggPT0gbnVsbCA/IFtdIDogQXJyYXkuaXNBcnJheSh4KSA/IHggOiBBcnJheS5mcm9tKHgpO1xufVxuIiwgImZ1bmN0aW9uIGVtcHR5KCkge1xuICByZXR1cm4gW107XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiBzZWxlY3RvciA9PSBudWxsID8gZW1wdHkgOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgfTtcbn1cbiIsICJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXguanNcIjtcbmltcG9ydCBhcnJheSBmcm9tIFwiLi4vYXJyYXkuanNcIjtcbmltcG9ydCBzZWxlY3RvckFsbCBmcm9tIFwiLi4vc2VsZWN0b3JBbGwuanNcIjtcblxuZnVuY3Rpb24gYXJyYXlBbGwoc2VsZWN0KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXJyYXkoc2VsZWN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3QpIHtcbiAgaWYgKHR5cGVvZiBzZWxlY3QgPT09IFwiZnVuY3Rpb25cIikgc2VsZWN0ID0gYXJyYXlBbGwoc2VsZWN0KTtcbiAgZWxzZSBzZWxlY3QgPSBzZWxlY3RvckFsbChzZWxlY3QpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IFtdLCBwYXJlbnRzID0gW10sIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHN1Ymdyb3Vwcy5wdXNoKHNlbGVjdC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSk7XG4gICAgICAgIHBhcmVudHMucHVzaChub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihzdWJncm91cHMsIHBhcmVudHMpO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5tYXRjaGVzKHNlbGVjdG9yKTtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNoaWxkTWF0Y2hlcihzZWxlY3Rvcikge1xuICByZXR1cm4gZnVuY3Rpb24obm9kZSkge1xuICAgIHJldHVybiBub2RlLm1hdGNoZXMoc2VsZWN0b3IpO1xuICB9O1xufVxuXG4iLCAiaW1wb3J0IHtjaGlsZE1hdGNoZXJ9IGZyb20gXCIuLi9tYXRjaGVyLmpzXCI7XG5cbnZhciBmaW5kID0gQXJyYXkucHJvdG90eXBlLmZpbmQ7XG5cbmZ1bmN0aW9uIGNoaWxkRmluZChtYXRjaCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGZpbmQuY2FsbCh0aGlzLmNoaWxkcmVuLCBtYXRjaCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNoaWxkRmlyc3QoKSB7XG4gIHJldHVybiB0aGlzLmZpcnN0RWxlbWVudENoaWxkO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihtYXRjaCkge1xuICByZXR1cm4gdGhpcy5zZWxlY3QobWF0Y2ggPT0gbnVsbCA/IGNoaWxkRmlyc3RcbiAgICAgIDogY2hpbGRGaW5kKHR5cGVvZiBtYXRjaCA9PT0gXCJmdW5jdGlvblwiID8gbWF0Y2ggOiBjaGlsZE1hdGNoZXIobWF0Y2gpKSk7XG59XG4iLCAiaW1wb3J0IHtjaGlsZE1hdGNoZXJ9IGZyb20gXCIuLi9tYXRjaGVyLmpzXCI7XG5cbnZhciBmaWx0ZXIgPSBBcnJheS5wcm90b3R5cGUuZmlsdGVyO1xuXG5mdW5jdGlvbiBjaGlsZHJlbigpIHtcbiAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5jaGlsZHJlbik7XG59XG5cbmZ1bmN0aW9uIGNoaWxkcmVuRmlsdGVyKG1hdGNoKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZmlsdGVyLmNhbGwodGhpcy5jaGlsZHJlbiwgbWF0Y2gpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihtYXRjaCkge1xuICByZXR1cm4gdGhpcy5zZWxlY3RBbGwobWF0Y2ggPT0gbnVsbCA/IGNoaWxkcmVuXG4gICAgICA6IGNoaWxkcmVuRmlsdGVyKHR5cGVvZiBtYXRjaCA9PT0gXCJmdW5jdGlvblwiID8gbWF0Y2ggOiBjaGlsZE1hdGNoZXIobWF0Y2gpKSk7XG59XG4iLCAiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4LmpzXCI7XG5pbXBvcnQgbWF0Y2hlciBmcm9tIFwiLi4vbWF0Y2hlci5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihtYXRjaCkge1xuICBpZiAodHlwZW9mIG1hdGNoICE9PSBcImZ1bmN0aW9uXCIpIG1hdGNoID0gbWF0Y2hlcihtYXRjaCk7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBtID0gZ3JvdXBzLmxlbmd0aCwgc3ViZ3JvdXBzID0gbmV3IEFycmF5KG0pLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBzdWJncm91cCA9IHN1Ymdyb3Vwc1tqXSA9IFtdLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKChub2RlID0gZ3JvdXBbaV0pICYmIG1hdGNoLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApKSB7XG4gICAgICAgIHN1Ymdyb3VwLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oc3ViZ3JvdXBzLCB0aGlzLl9wYXJlbnRzKTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih1cGRhdGUpIHtcbiAgcmV0dXJuIG5ldyBBcnJheSh1cGRhdGUubGVuZ3RoKTtcbn1cbiIsICJpbXBvcnQgc3BhcnNlIGZyb20gXCIuL3NwYXJzZS5qc1wiO1xuaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4LmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbih0aGlzLl9lbnRlciB8fCB0aGlzLl9ncm91cHMubWFwKHNwYXJzZSksIHRoaXMuX3BhcmVudHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gRW50ZXJOb2RlKHBhcmVudCwgZGF0dW0pIHtcbiAgdGhpcy5vd25lckRvY3VtZW50ID0gcGFyZW50Lm93bmVyRG9jdW1lbnQ7XG4gIHRoaXMubmFtZXNwYWNlVVJJID0gcGFyZW50Lm5hbWVzcGFjZVVSSTtcbiAgdGhpcy5fbmV4dCA9IG51bGw7XG4gIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgdGhpcy5fX2RhdGFfXyA9IGRhdHVtO1xufVxuXG5FbnRlck5vZGUucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogRW50ZXJOb2RlLFxuICBhcHBlbmRDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5pbnNlcnRCZWZvcmUoY2hpbGQsIHRoaXMuX25leHQpOyB9LFxuICBpbnNlcnRCZWZvcmU6IGZ1bmN0aW9uKGNoaWxkLCBuZXh0KSB7IHJldHVybiB0aGlzLl9wYXJlbnQuaW5zZXJ0QmVmb3JlKGNoaWxkLCBuZXh0KTsgfSxcbiAgcXVlcnlTZWxlY3RvcjogZnVuY3Rpb24oc2VsZWN0b3IpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTsgfSxcbiAgcXVlcnlTZWxlY3RvckFsbDogZnVuY3Rpb24oc2VsZWN0b3IpIHsgcmV0dXJuIHRoaXMuX3BhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTsgfVxufTtcbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4geDtcbiAgfTtcbn1cbiIsICJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXguanNcIjtcbmltcG9ydCB7RW50ZXJOb2RlfSBmcm9tIFwiLi9lbnRlci5qc1wiO1xuaW1wb3J0IGNvbnN0YW50IGZyb20gXCIuLi9jb25zdGFudC5qc1wiO1xuXG5mdW5jdGlvbiBiaW5kSW5kZXgocGFyZW50LCBncm91cCwgZW50ZXIsIHVwZGF0ZSwgZXhpdCwgZGF0YSkge1xuICB2YXIgaSA9IDAsXG4gICAgICBub2RlLFxuICAgICAgZ3JvdXBMZW5ndGggPSBncm91cC5sZW5ndGgsXG4gICAgICBkYXRhTGVuZ3RoID0gZGF0YS5sZW5ndGg7XG5cbiAgLy8gUHV0IGFueSBub24tbnVsbCBub2RlcyB0aGF0IGZpdCBpbnRvIHVwZGF0ZS5cbiAgLy8gUHV0IGFueSBudWxsIG5vZGVzIGludG8gZW50ZXIuXG4gIC8vIFB1dCBhbnkgcmVtYWluaW5nIGRhdGEgaW50byBlbnRlci5cbiAgZm9yICg7IGkgPCBkYXRhTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICBub2RlLl9fZGF0YV9fID0gZGF0YVtpXTtcbiAgICAgIHVwZGF0ZVtpXSA9IG5vZGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVudGVyW2ldID0gbmV3IEVudGVyTm9kZShwYXJlbnQsIGRhdGFbaV0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIFB1dCBhbnkgbm9uLW51bGwgbm9kZXMgdGhhdCBkb25cdTIwMTl0IGZpdCBpbnRvIGV4aXQuXG4gIGZvciAoOyBpIDwgZ3JvdXBMZW5ndGg7ICsraSkge1xuICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgIGV4aXRbaV0gPSBub2RlO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBiaW5kS2V5KHBhcmVudCwgZ3JvdXAsIGVudGVyLCB1cGRhdGUsIGV4aXQsIGRhdGEsIGtleSkge1xuICB2YXIgaSxcbiAgICAgIG5vZGUsXG4gICAgICBub2RlQnlLZXlWYWx1ZSA9IG5ldyBNYXAsXG4gICAgICBncm91cExlbmd0aCA9IGdyb3VwLmxlbmd0aCxcbiAgICAgIGRhdGFMZW5ndGggPSBkYXRhLmxlbmd0aCxcbiAgICAgIGtleVZhbHVlcyA9IG5ldyBBcnJheShncm91cExlbmd0aCksXG4gICAgICBrZXlWYWx1ZTtcblxuICAvLyBDb21wdXRlIHRoZSBrZXkgZm9yIGVhY2ggbm9kZS5cbiAgLy8gSWYgbXVsdGlwbGUgbm9kZXMgaGF2ZSB0aGUgc2FtZSBrZXksIHRoZSBkdXBsaWNhdGVzIGFyZSBhZGRlZCB0byBleGl0LlxuICBmb3IgKGkgPSAwOyBpIDwgZ3JvdXBMZW5ndGg7ICsraSkge1xuICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgIGtleVZhbHVlc1tpXSA9IGtleVZhbHVlID0ga2V5LmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApICsgXCJcIjtcbiAgICAgIGlmIChub2RlQnlLZXlWYWx1ZS5oYXMoa2V5VmFsdWUpKSB7XG4gICAgICAgIGV4aXRbaV0gPSBub2RlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZUJ5S2V5VmFsdWUuc2V0KGtleVZhbHVlLCBub2RlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDb21wdXRlIHRoZSBrZXkgZm9yIGVhY2ggZGF0dW0uXG4gIC8vIElmIHRoZXJlIGEgbm9kZSBhc3NvY2lhdGVkIHdpdGggdGhpcyBrZXksIGpvaW4gYW5kIGFkZCBpdCB0byB1cGRhdGUuXG4gIC8vIElmIHRoZXJlIGlzIG5vdCAob3IgdGhlIGtleSBpcyBhIGR1cGxpY2F0ZSksIGFkZCBpdCB0byBlbnRlci5cbiAgZm9yIChpID0gMDsgaSA8IGRhdGFMZW5ndGg7ICsraSkge1xuICAgIGtleVZhbHVlID0ga2V5LmNhbGwocGFyZW50LCBkYXRhW2ldLCBpLCBkYXRhKSArIFwiXCI7XG4gICAgaWYgKG5vZGUgPSBub2RlQnlLZXlWYWx1ZS5nZXQoa2V5VmFsdWUpKSB7XG4gICAgICB1cGRhdGVbaV0gPSBub2RlO1xuICAgICAgbm9kZS5fX2RhdGFfXyA9IGRhdGFbaV07XG4gICAgICBub2RlQnlLZXlWYWx1ZS5kZWxldGUoa2V5VmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbnRlcltpXSA9IG5ldyBFbnRlck5vZGUocGFyZW50LCBkYXRhW2ldKTtcbiAgICB9XG4gIH1cblxuICAvLyBBZGQgYW55IHJlbWFpbmluZyBub2RlcyB0aGF0IHdlcmUgbm90IGJvdW5kIHRvIGRhdGEgdG8gZXhpdC5cbiAgZm9yIChpID0gMDsgaSA8IGdyb3VwTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoKG5vZGUgPSBncm91cFtpXSkgJiYgKG5vZGVCeUtleVZhbHVlLmdldChrZXlWYWx1ZXNbaV0pID09PSBub2RlKSkge1xuICAgICAgZXhpdFtpXSA9IG5vZGU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGRhdHVtKG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuX19kYXRhX187XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLCBkYXR1bSk7XG5cbiAgdmFyIGJpbmQgPSBrZXkgPyBiaW5kS2V5IDogYmluZEluZGV4LFxuICAgICAgcGFyZW50cyA9IHRoaXMuX3BhcmVudHMsXG4gICAgICBncm91cHMgPSB0aGlzLl9ncm91cHM7XG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB2YWx1ZSA9IGNvbnN0YW50KHZhbHVlKTtcblxuICBmb3IgKHZhciBtID0gZ3JvdXBzLmxlbmd0aCwgdXBkYXRlID0gbmV3IEFycmF5KG0pLCBlbnRlciA9IG5ldyBBcnJheShtKSwgZXhpdCA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICB2YXIgcGFyZW50ID0gcGFyZW50c1tqXSxcbiAgICAgICAgZ3JvdXAgPSBncm91cHNbal0sXG4gICAgICAgIGdyb3VwTGVuZ3RoID0gZ3JvdXAubGVuZ3RoLFxuICAgICAgICBkYXRhID0gYXJyYXlsaWtlKHZhbHVlLmNhbGwocGFyZW50LCBwYXJlbnQgJiYgcGFyZW50Ll9fZGF0YV9fLCBqLCBwYXJlbnRzKSksXG4gICAgICAgIGRhdGFMZW5ndGggPSBkYXRhLmxlbmd0aCxcbiAgICAgICAgZW50ZXJHcm91cCA9IGVudGVyW2pdID0gbmV3IEFycmF5KGRhdGFMZW5ndGgpLFxuICAgICAgICB1cGRhdGVHcm91cCA9IHVwZGF0ZVtqXSA9IG5ldyBBcnJheShkYXRhTGVuZ3RoKSxcbiAgICAgICAgZXhpdEdyb3VwID0gZXhpdFtqXSA9IG5ldyBBcnJheShncm91cExlbmd0aCk7XG5cbiAgICBiaW5kKHBhcmVudCwgZ3JvdXAsIGVudGVyR3JvdXAsIHVwZGF0ZUdyb3VwLCBleGl0R3JvdXAsIGRhdGEsIGtleSk7XG5cbiAgICAvLyBOb3cgY29ubmVjdCB0aGUgZW50ZXIgbm9kZXMgdG8gdGhlaXIgZm9sbG93aW5nIHVwZGF0ZSBub2RlLCBzdWNoIHRoYXRcbiAgICAvLyBhcHBlbmRDaGlsZCBjYW4gaW5zZXJ0IHRoZSBtYXRlcmlhbGl6ZWQgZW50ZXIgbm9kZSBiZWZvcmUgdGhpcyBub2RlLFxuICAgIC8vIHJhdGhlciB0aGFuIGF0IHRoZSBlbmQgb2YgdGhlIHBhcmVudCBub2RlLlxuICAgIGZvciAodmFyIGkwID0gMCwgaTEgPSAwLCBwcmV2aW91cywgbmV4dDsgaTAgPCBkYXRhTGVuZ3RoOyArK2kwKSB7XG4gICAgICBpZiAocHJldmlvdXMgPSBlbnRlckdyb3VwW2kwXSkge1xuICAgICAgICBpZiAoaTAgPj0gaTEpIGkxID0gaTAgKyAxO1xuICAgICAgICB3aGlsZSAoIShuZXh0ID0gdXBkYXRlR3JvdXBbaTFdKSAmJiArK2kxIDwgZGF0YUxlbmd0aCk7XG4gICAgICAgIHByZXZpb3VzLl9uZXh0ID0gbmV4dCB8fCBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZSA9IG5ldyBTZWxlY3Rpb24odXBkYXRlLCBwYXJlbnRzKTtcbiAgdXBkYXRlLl9lbnRlciA9IGVudGVyO1xuICB1cGRhdGUuX2V4aXQgPSBleGl0O1xuICByZXR1cm4gdXBkYXRlO1xufVxuXG4vLyBHaXZlbiBzb21lIGRhdGEsIHRoaXMgcmV0dXJucyBhbiBhcnJheS1saWtlIHZpZXcgb2YgaXQ6IGFuIG9iamVjdCB0aGF0XG4vLyBleHBvc2VzIGEgbGVuZ3RoIHByb3BlcnR5IGFuZCBhbGxvd3MgbnVtZXJpYyBpbmRleGluZy4gTm90ZSB0aGF0IHVubGlrZVxuLy8gc2VsZWN0QWxsLCB0aGlzIGlzblx1MjAxOXQgd29ycmllZCBhYm91dCBcdTIwMUNsaXZlXHUyMDFEIGNvbGxlY3Rpb25zIGJlY2F1c2UgdGhlIHJlc3VsdGluZ1xuLy8gYXJyYXkgd2lsbCBvbmx5IGJlIHVzZWQgYnJpZWZseSB3aGlsZSBkYXRhIGlzIGJlaW5nIGJvdW5kLiAoSXQgaXMgcG9zc2libGUgdG9cbi8vIGNhdXNlIHRoZSBkYXRhIHRvIGNoYW5nZSB3aGlsZSBpdGVyYXRpbmcgYnkgdXNpbmcgYSBrZXkgZnVuY3Rpb24sIGJ1dCBwbGVhc2Vcbi8vIGRvblx1MjAxOXQ7IHdlXHUyMDE5ZCByYXRoZXIgYXZvaWQgYSBncmF0dWl0b3VzIGNvcHkuKVxuZnVuY3Rpb24gYXJyYXlsaWtlKGRhdGEpIHtcbiAgcmV0dXJuIHR5cGVvZiBkYXRhID09PSBcIm9iamVjdFwiICYmIFwibGVuZ3RoXCIgaW4gZGF0YVxuICAgID8gZGF0YSAvLyBBcnJheSwgVHlwZWRBcnJheSwgTm9kZUxpc3QsIGFycmF5LWxpa2VcbiAgICA6IEFycmF5LmZyb20oZGF0YSk7IC8vIE1hcCwgU2V0LCBpdGVyYWJsZSwgc3RyaW5nLCBvciBhbnl0aGluZyBlbHNlXG59XG4iLCAiaW1wb3J0IHNwYXJzZSBmcm9tIFwiLi9zcGFyc2UuanNcIjtcbmltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleC5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24odGhpcy5fZXhpdCB8fCB0aGlzLl9ncm91cHMubWFwKHNwYXJzZSksIHRoaXMuX3BhcmVudHMpO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG9uZW50ZXIsIG9udXBkYXRlLCBvbmV4aXQpIHtcbiAgdmFyIGVudGVyID0gdGhpcy5lbnRlcigpLCB1cGRhdGUgPSB0aGlzLCBleGl0ID0gdGhpcy5leGl0KCk7XG4gIGlmICh0eXBlb2Ygb25lbnRlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgZW50ZXIgPSBvbmVudGVyKGVudGVyKTtcbiAgICBpZiAoZW50ZXIpIGVudGVyID0gZW50ZXIuc2VsZWN0aW9uKCk7XG4gIH0gZWxzZSB7XG4gICAgZW50ZXIgPSBlbnRlci5hcHBlbmQob25lbnRlciArIFwiXCIpO1xuICB9XG4gIGlmIChvbnVwZGF0ZSAhPSBudWxsKSB7XG4gICAgdXBkYXRlID0gb251cGRhdGUodXBkYXRlKTtcbiAgICBpZiAodXBkYXRlKSB1cGRhdGUgPSB1cGRhdGUuc2VsZWN0aW9uKCk7XG4gIH1cbiAgaWYgKG9uZXhpdCA9PSBudWxsKSBleGl0LnJlbW92ZSgpOyBlbHNlIG9uZXhpdChleGl0KTtcbiAgcmV0dXJuIGVudGVyICYmIHVwZGF0ZSA/IGVudGVyLm1lcmdlKHVwZGF0ZSkub3JkZXIoKSA6IHVwZGF0ZTtcbn1cbiIsICJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXguanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29udGV4dCkge1xuICB2YXIgc2VsZWN0aW9uID0gY29udGV4dC5zZWxlY3Rpb24gPyBjb250ZXh0LnNlbGVjdGlvbigpIDogY29udGV4dDtcblxuICBmb3IgKHZhciBncm91cHMwID0gdGhpcy5fZ3JvdXBzLCBncm91cHMxID0gc2VsZWN0aW9uLl9ncm91cHMsIG0wID0gZ3JvdXBzMC5sZW5ndGgsIG0xID0gZ3JvdXBzMS5sZW5ndGgsIG0gPSBNYXRoLm1pbihtMCwgbTEpLCBtZXJnZXMgPSBuZXcgQXJyYXkobTApLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwMCA9IGdyb3VwczBbal0sIGdyb3VwMSA9IGdyb3VwczFbal0sIG4gPSBncm91cDAubGVuZ3RoLCBtZXJnZSA9IG1lcmdlc1tqXSA9IG5ldyBBcnJheShuKSwgbm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXAwW2ldIHx8IGdyb3VwMVtpXSkge1xuICAgICAgICBtZXJnZVtpXSA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yICg7IGogPCBtMDsgKytqKSB7XG4gICAgbWVyZ2VzW2pdID0gZ3JvdXBzMFtqXTtcbiAgfVxuXG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKG1lcmdlcywgdGhpcy5fcGFyZW50cyk7XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBqID0gLTEsIG0gPSBncm91cHMubGVuZ3RoOyArK2ogPCBtOykge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gZ3JvdXAubGVuZ3RoIC0gMSwgbmV4dCA9IGdyb3VwW2ldLCBub2RlOyAtLWkgPj0gMDspIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgICAgaWYgKG5leHQgJiYgbm9kZS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbihuZXh0KSBeIDQpIG5leHQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgbmV4dCk7XG4gICAgICAgIG5leHQgPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufVxuIiwgImltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleC5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjb21wYXJlKSB7XG4gIGlmICghY29tcGFyZSkgY29tcGFyZSA9IGFzY2VuZGluZztcblxuICBmdW5jdGlvbiBjb21wYXJlTm9kZShhLCBiKSB7XG4gICAgcmV0dXJuIGEgJiYgYiA/IGNvbXBhcmUoYS5fX2RhdGFfXywgYi5fX2RhdGFfXykgOiAhYSAtICFiO1xuICB9XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBtID0gZ3JvdXBzLmxlbmd0aCwgc29ydGdyb3VwcyA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgc29ydGdyb3VwID0gc29ydGdyb3Vwc1tqXSA9IG5ldyBBcnJheShuKSwgbm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIHtcbiAgICAgICAgc29ydGdyb3VwW2ldID0gbm9kZTtcbiAgICAgIH1cbiAgICB9XG4gICAgc29ydGdyb3VwLnNvcnQoY29tcGFyZU5vZGUpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oc29ydGdyb3VwcywgdGhpcy5fcGFyZW50cykub3JkZXIoKTtcbn1cblxuZnVuY3Rpb24gYXNjZW5kaW5nKGEsIGIpIHtcbiAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID4gYiA/IDEgOiBhID49IGIgPyAwIDogTmFOO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICB2YXIgY2FsbGJhY2sgPSBhcmd1bWVudHNbMF07XG4gIGFyZ3VtZW50c1swXSA9IHRoaXM7XG4gIGNhbGxiYWNrLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gIHJldHVybiB0aGlzO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzKTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIGogPSAwLCBtID0gZ3JvdXBzLmxlbmd0aDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gMCwgbiA9IGdyb3VwLmxlbmd0aDsgaSA8IG47ICsraSkge1xuICAgICAgdmFyIG5vZGUgPSBncm91cFtpXTtcbiAgICAgIGlmIChub2RlKSByZXR1cm4gbm9kZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgbGV0IHNpemUgPSAwO1xuICBmb3IgKGNvbnN0IG5vZGUgb2YgdGhpcykgKytzaXplOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVudXNlZC12YXJzXG4gIHJldHVybiBzaXplO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gIXRoaXMubm9kZSgpO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBqID0gMCwgbSA9IGdyb3Vwcy5sZW5ndGg7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgaSA9IDAsIG4gPSBncm91cC5sZW5ndGgsIG5vZGU7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmIChub2RlID0gZ3JvdXBbaV0pIGNhbGxiYWNrLmNhbGwobm9kZSwgbm9kZS5fX2RhdGFfXywgaSwgZ3JvdXApO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufVxuIiwgImltcG9ydCBuYW1lc3BhY2UgZnJvbSBcIi4uL25hbWVzcGFjZS5qc1wiO1xuXG5mdW5jdGlvbiBhdHRyUmVtb3ZlKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyUmVtb3ZlTlMoZnVsbG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucmVtb3ZlQXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckNvbnN0YW50KG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJDb25zdGFudE5TKGZ1bGxuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwsIHZhbHVlKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHYgPT0gbnVsbCkgdGhpcy5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG4gICAgZWxzZSB0aGlzLnNldEF0dHJpYnV0ZShuYW1lLCB2KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0ckZ1bmN0aW9uTlMoZnVsbG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHYgPT0gbnVsbCkgdGhpcy5yZW1vdmVBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpO1xuICAgIGVsc2UgdGhpcy5zZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwsIHYpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICB2YXIgZnVsbG5hbWUgPSBuYW1lc3BhY2UobmFtZSk7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLm5vZGUoKTtcbiAgICByZXR1cm4gZnVsbG5hbWUubG9jYWxcbiAgICAgICAgPyBub2RlLmdldEF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbClcbiAgICAgICAgOiBub2RlLmdldEF0dHJpYnV0ZShmdWxsbmFtZSk7XG4gIH1cblxuICByZXR1cm4gdGhpcy5lYWNoKCh2YWx1ZSA9PSBudWxsXG4gICAgICA/IChmdWxsbmFtZS5sb2NhbCA/IGF0dHJSZW1vdmVOUyA6IGF0dHJSZW1vdmUpIDogKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICA/IChmdWxsbmFtZS5sb2NhbCA/IGF0dHJGdW5jdGlvbk5TIDogYXR0ckZ1bmN0aW9uKVxuICAgICAgOiAoZnVsbG5hbWUubG9jYWwgPyBhdHRyQ29uc3RhbnROUyA6IGF0dHJDb25zdGFudCkpKShmdWxsbmFtZSwgdmFsdWUpKTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihub2RlKSB7XG4gIHJldHVybiAobm9kZS5vd25lckRvY3VtZW50ICYmIG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldykgLy8gbm9kZSBpcyBhIE5vZGVcbiAgICAgIHx8IChub2RlLmRvY3VtZW50ICYmIG5vZGUpIC8vIG5vZGUgaXMgYSBXaW5kb3dcbiAgICAgIHx8IG5vZGUuZGVmYXVsdFZpZXc7IC8vIG5vZGUgaXMgYSBEb2N1bWVudFxufVxuIiwgImltcG9ydCBkZWZhdWx0VmlldyBmcm9tIFwiLi4vd2luZG93LmpzXCI7XG5cbmZ1bmN0aW9uIHN0eWxlUmVtb3ZlKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHN0eWxlQ29uc3RhbnQobmFtZSwgdmFsdWUsIHByaW9yaXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIHZhbHVlLCBwcmlvcml0eSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHN0eWxlRnVuY3Rpb24obmFtZSwgdmFsdWUsIHByaW9yaXR5KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKHYgPT0gbnVsbCkgdGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgICBlbHNlIHRoaXMuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdiwgcHJpb3JpdHkpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPiAxXG4gICAgICA/IHRoaXMuZWFjaCgodmFsdWUgPT0gbnVsbFxuICAgICAgICAgICAgPyBzdHlsZVJlbW92ZSA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgICA/IHN0eWxlRnVuY3Rpb25cbiAgICAgICAgICAgIDogc3R5bGVDb25zdGFudCkobmFtZSwgdmFsdWUsIHByaW9yaXR5ID09IG51bGwgPyBcIlwiIDogcHJpb3JpdHkpKVxuICAgICAgOiBzdHlsZVZhbHVlKHRoaXMubm9kZSgpLCBuYW1lKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0eWxlVmFsdWUobm9kZSwgbmFtZSkge1xuICByZXR1cm4gbm9kZS5zdHlsZS5nZXRQcm9wZXJ0eVZhbHVlKG5hbWUpXG4gICAgICB8fCBkZWZhdWx0Vmlldyhub2RlKS5nZXRDb21wdXRlZFN0eWxlKG5vZGUsIG51bGwpLmdldFByb3BlcnR5VmFsdWUobmFtZSk7XG59XG4iLCAiZnVuY3Rpb24gcHJvcGVydHlSZW1vdmUobmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgZGVsZXRlIHRoaXNbbmFtZV07XG4gIH07XG59XG5cbmZ1bmN0aW9uIHByb3BlcnR5Q29uc3RhbnQobmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXNbbmFtZV0gPSB2YWx1ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gcHJvcGVydHlGdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIGRlbGV0ZSB0aGlzW25hbWVdO1xuICAgIGVsc2UgdGhpc1tuYW1lXSA9IHY7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID4gMVxuICAgICAgPyB0aGlzLmVhY2goKHZhbHVlID09IG51bGxcbiAgICAgICAgICA/IHByb3BlcnR5UmVtb3ZlIDogdHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IHByb3BlcnR5RnVuY3Rpb25cbiAgICAgICAgICA6IHByb3BlcnR5Q29uc3RhbnQpKG5hbWUsIHZhbHVlKSlcbiAgICAgIDogdGhpcy5ub2RlKClbbmFtZV07XG59XG4iLCAiZnVuY3Rpb24gY2xhc3NBcnJheShzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZy50cmltKCkuc3BsaXQoL158XFxzKy8pO1xufVxuXG5mdW5jdGlvbiBjbGFzc0xpc3Qobm9kZSkge1xuICByZXR1cm4gbm9kZS5jbGFzc0xpc3QgfHwgbmV3IENsYXNzTGlzdChub2RlKTtcbn1cblxuZnVuY3Rpb24gQ2xhc3NMaXN0KG5vZGUpIHtcbiAgdGhpcy5fbm9kZSA9IG5vZGU7XG4gIHRoaXMuX25hbWVzID0gY2xhc3NBcnJheShub2RlLmdldEF0dHJpYnV0ZShcImNsYXNzXCIpIHx8IFwiXCIpO1xufVxuXG5DbGFzc0xpc3QucHJvdG90eXBlID0ge1xuICBhZGQ6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaSA9IHRoaXMuX25hbWVzLmluZGV4T2YobmFtZSk7XG4gICAgaWYgKGkgPCAwKSB7XG4gICAgICB0aGlzLl9uYW1lcy5wdXNoKG5hbWUpO1xuICAgICAgdGhpcy5fbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0aGlzLl9uYW1lcy5qb2luKFwiIFwiKSk7XG4gICAgfVxuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaSA9IHRoaXMuX25hbWVzLmluZGV4T2YobmFtZSk7XG4gICAgaWYgKGkgPj0gMCkge1xuICAgICAgdGhpcy5fbmFtZXMuc3BsaWNlKGksIDEpO1xuICAgICAgdGhpcy5fbm9kZS5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0aGlzLl9uYW1lcy5qb2luKFwiIFwiKSk7XG4gICAgfVxuICB9LFxuICBjb250YWluczogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9uYW1lcy5pbmRleE9mKG5hbWUpID49IDA7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGNsYXNzZWRBZGQobm9kZSwgbmFtZXMpIHtcbiAgdmFyIGxpc3QgPSBjbGFzc0xpc3Qobm9kZSksIGkgPSAtMSwgbiA9IG5hbWVzLmxlbmd0aDtcbiAgd2hpbGUgKCsraSA8IG4pIGxpc3QuYWRkKG5hbWVzW2ldKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NlZFJlbW92ZShub2RlLCBuYW1lcykge1xuICB2YXIgbGlzdCA9IGNsYXNzTGlzdChub2RlKSwgaSA9IC0xLCBuID0gbmFtZXMubGVuZ3RoO1xuICB3aGlsZSAoKytpIDwgbikgbGlzdC5yZW1vdmUobmFtZXNbaV0pO1xufVxuXG5mdW5jdGlvbiBjbGFzc2VkVHJ1ZShuYW1lcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2xhc3NlZEFkZCh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRGYWxzZShuYW1lcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgY2xhc3NlZFJlbW92ZSh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRGdW5jdGlvbihuYW1lcywgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICh2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpID8gY2xhc3NlZEFkZCA6IGNsYXNzZWRSZW1vdmUpKHRoaXMsIG5hbWVzKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIG5hbWVzID0gY2xhc3NBcnJheShuYW1lICsgXCJcIik7XG5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgdmFyIGxpc3QgPSBjbGFzc0xpc3QodGhpcy5ub2RlKCkpLCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gICAgd2hpbGUgKCsraSA8IG4pIGlmICghbGlzdC5jb250YWlucyhuYW1lc1tpXSkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmVhY2goKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICA/IGNsYXNzZWRGdW5jdGlvbiA6IHZhbHVlXG4gICAgICA/IGNsYXNzZWRUcnVlXG4gICAgICA6IGNsYXNzZWRGYWxzZSkobmFtZXMsIHZhbHVlKSk7XG59XG4iLCAiZnVuY3Rpb24gdGV4dFJlbW92ZSgpIHtcbiAgdGhpcy50ZXh0Q29udGVudCA9IFwiXCI7XG59XG5cbmZ1bmN0aW9uIHRleHRDb25zdGFudCh2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50ZXh0Q29udGVudCA9IHZhbHVlO1xuICB9O1xufVxuXG5mdW5jdGlvbiB0ZXh0RnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB0aGlzLnRleHRDb250ZW50ID0gdiA9PSBudWxsID8gXCJcIiA6IHY7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyB0ZXh0UmVtb3ZlIDogKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyB0ZXh0RnVuY3Rpb25cbiAgICAgICAgICA6IHRleHRDb25zdGFudCkodmFsdWUpKVxuICAgICAgOiB0aGlzLm5vZGUoKS50ZXh0Q29udGVudDtcbn1cbiIsICJmdW5jdGlvbiBodG1sUmVtb3ZlKCkge1xuICB0aGlzLmlubmVySFRNTCA9IFwiXCI7XG59XG5cbmZ1bmN0aW9uIGh0bWxDb25zdGFudCh2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gaHRtbEZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy5pbm5lckhUTUwgPSB2ID09IG51bGwgPyBcIlwiIDogdjtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgID8gdGhpcy5lYWNoKHZhbHVlID09IG51bGxcbiAgICAgICAgICA/IGh0bWxSZW1vdmUgOiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCJcbiAgICAgICAgICA/IGh0bWxGdW5jdGlvblxuICAgICAgICAgIDogaHRtbENvbnN0YW50KSh2YWx1ZSkpXG4gICAgICA6IHRoaXMubm9kZSgpLmlubmVySFRNTDtcbn1cbiIsICJmdW5jdGlvbiByYWlzZSgpIHtcbiAgaWYgKHRoaXMubmV4dFNpYmxpbmcpIHRoaXMucGFyZW50Tm9kZS5hcHBlbmRDaGlsZCh0aGlzKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVhY2gocmFpc2UpO1xufVxuIiwgImZ1bmN0aW9uIGxvd2VyKCkge1xuICBpZiAodGhpcy5wcmV2aW91c1NpYmxpbmcpIHRoaXMucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcywgdGhpcy5wYXJlbnROb2RlLmZpcnN0Q2hpbGQpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaChsb3dlcik7XG59XG4iLCAiaW1wb3J0IGNyZWF0b3IgZnJvbSBcIi4uL2NyZWF0b3IuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSkge1xuICB2YXIgY3JlYXRlID0gdHlwZW9mIG5hbWUgPT09IFwiZnVuY3Rpb25cIiA/IG5hbWUgOiBjcmVhdG9yKG5hbWUpO1xuICByZXR1cm4gdGhpcy5zZWxlY3QoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuYXBwZW5kQ2hpbGQoY3JlYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICB9KTtcbn1cbiIsICJpbXBvcnQgY3JlYXRvciBmcm9tIFwiLi4vY3JlYXRvci5qc1wiO1xuaW1wb3J0IHNlbGVjdG9yIGZyb20gXCIuLi9zZWxlY3Rvci5qc1wiO1xuXG5mdW5jdGlvbiBjb25zdGFudE51bGwoKSB7XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCBiZWZvcmUpIHtcbiAgdmFyIGNyZWF0ZSA9IHR5cGVvZiBuYW1lID09PSBcImZ1bmN0aW9uXCIgPyBuYW1lIDogY3JlYXRvcihuYW1lKSxcbiAgICAgIHNlbGVjdCA9IGJlZm9yZSA9PSBudWxsID8gY29uc3RhbnROdWxsIDogdHlwZW9mIGJlZm9yZSA9PT0gXCJmdW5jdGlvblwiID8gYmVmb3JlIDogc2VsZWN0b3IoYmVmb3JlKTtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmluc2VydEJlZm9yZShjcmVhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKSwgc2VsZWN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgfHwgbnVsbCk7XG4gIH0pO1xufVxuIiwgImZ1bmN0aW9uIHJlbW92ZSgpIHtcbiAgdmFyIHBhcmVudCA9IHRoaXMucGFyZW50Tm9kZTtcbiAgaWYgKHBhcmVudCkgcGFyZW50LnJlbW92ZUNoaWxkKHRoaXMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaChyZW1vdmUpO1xufVxuIiwgImZ1bmN0aW9uIHNlbGVjdGlvbl9jbG9uZVNoYWxsb3coKSB7XG4gIHZhciBjbG9uZSA9IHRoaXMuY2xvbmVOb2RlKGZhbHNlKSwgcGFyZW50ID0gdGhpcy5wYXJlbnROb2RlO1xuICByZXR1cm4gcGFyZW50ID8gcGFyZW50Lmluc2VydEJlZm9yZShjbG9uZSwgdGhpcy5uZXh0U2libGluZykgOiBjbG9uZTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0aW9uX2Nsb25lRGVlcCgpIHtcbiAgdmFyIGNsb25lID0gdGhpcy5jbG9uZU5vZGUodHJ1ZSksIHBhcmVudCA9IHRoaXMucGFyZW50Tm9kZTtcbiAgcmV0dXJuIHBhcmVudCA/IHBhcmVudC5pbnNlcnRCZWZvcmUoY2xvbmUsIHRoaXMubmV4dFNpYmxpbmcpIDogY2xvbmU7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGRlZXApIHtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGRlZXAgPyBzZWxlY3Rpb25fY2xvbmVEZWVwIDogc2VsZWN0aW9uX2Nsb25lU2hhbGxvdyk7XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGhcbiAgICAgID8gdGhpcy5wcm9wZXJ0eShcIl9fZGF0YV9fXCIsIHZhbHVlKVxuICAgICAgOiB0aGlzLm5vZGUoKS5fX2RhdGFfXztcbn1cbiIsICJmdW5jdGlvbiBjb250ZXh0TGlzdGVuZXIobGlzdGVuZXIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgbGlzdGVuZXIuY2FsbCh0aGlzLCBldmVudCwgdGhpcy5fX2RhdGFfXyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlVHlwZW5hbWVzKHR5cGVuYW1lcykge1xuICByZXR1cm4gdHlwZW5hbWVzLnRyaW0oKS5zcGxpdCgvXnxcXHMrLykubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgbmFtZSA9IFwiXCIsIGkgPSB0LmluZGV4T2YoXCIuXCIpO1xuICAgIGlmIChpID49IDApIG5hbWUgPSB0LnNsaWNlKGkgKyAxKSwgdCA9IHQuc2xpY2UoMCwgaSk7XG4gICAgcmV0dXJuIHt0eXBlOiB0LCBuYW1lOiBuYW1lfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG9uUmVtb3ZlKHR5cGVuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgb24gPSB0aGlzLl9fb247XG4gICAgaWYgKCFvbikgcmV0dXJuO1xuICAgIGZvciAodmFyIGogPSAwLCBpID0gLTEsIG0gPSBvbi5sZW5ndGgsIG87IGogPCBtOyArK2opIHtcbiAgICAgIGlmIChvID0gb25bal0sICghdHlwZW5hbWUudHlwZSB8fCBvLnR5cGUgPT09IHR5cGVuYW1lLnR5cGUpICYmIG8ubmFtZSA9PT0gdHlwZW5hbWUubmFtZSkge1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoby50eXBlLCBvLmxpc3RlbmVyLCBvLm9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb25bKytpXSA9IG87XG4gICAgICB9XG4gICAgfVxuICAgIGlmICgrK2kpIG9uLmxlbmd0aCA9IGk7XG4gICAgZWxzZSBkZWxldGUgdGhpcy5fX29uO1xuICB9O1xufVxuXG5mdW5jdGlvbiBvbkFkZCh0eXBlbmFtZSwgdmFsdWUsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBvbiA9IHRoaXMuX19vbiwgbywgbGlzdGVuZXIgPSBjb250ZXh0TGlzdGVuZXIodmFsdWUpO1xuICAgIGlmIChvbikgZm9yICh2YXIgaiA9IDAsIG0gPSBvbi5sZW5ndGg7IGogPCBtOyArK2opIHtcbiAgICAgIGlmICgobyA9IG9uW2pdKS50eXBlID09PSB0eXBlbmFtZS50eXBlICYmIG8ubmFtZSA9PT0gdHlwZW5hbWUubmFtZSkge1xuICAgICAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoby50eXBlLCBvLmxpc3RlbmVyLCBvLm9wdGlvbnMpO1xuICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoby50eXBlLCBvLmxpc3RlbmVyID0gbGlzdGVuZXIsIG8ub3B0aW9ucyA9IG9wdGlvbnMpO1xuICAgICAgICBvLnZhbHVlID0gdmFsdWU7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKHR5cGVuYW1lLnR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKTtcbiAgICBvID0ge3R5cGU6IHR5cGVuYW1lLnR5cGUsIG5hbWU6IHR5cGVuYW1lLm5hbWUsIHZhbHVlOiB2YWx1ZSwgbGlzdGVuZXI6IGxpc3RlbmVyLCBvcHRpb25zOiBvcHRpb25zfTtcbiAgICBpZiAoIW9uKSB0aGlzLl9fb24gPSBbb107XG4gICAgZWxzZSBvbi5wdXNoKG8pO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih0eXBlbmFtZSwgdmFsdWUsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGVuYW1lcyA9IHBhcnNlVHlwZW5hbWVzKHR5cGVuYW1lICsgXCJcIiksIGksIG4gPSB0eXBlbmFtZXMubGVuZ3RoLCB0O1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIHZhciBvbiA9IHRoaXMubm9kZSgpLl9fb247XG4gICAgaWYgKG9uKSBmb3IgKHZhciBqID0gMCwgbSA9IG9uLmxlbmd0aCwgbzsgaiA8IG07ICsraikge1xuICAgICAgZm9yIChpID0gMCwgbyA9IG9uW2pdOyBpIDwgbjsgKytpKSB7XG4gICAgICAgIGlmICgodCA9IHR5cGVuYW1lc1tpXSkudHlwZSA9PT0gby50eXBlICYmIHQubmFtZSA9PT0gby5uYW1lKSB7XG4gICAgICAgICAgcmV0dXJuIG8udmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgb24gPSB2YWx1ZSA/IG9uQWRkIDogb25SZW1vdmU7XG4gIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHRoaXMuZWFjaChvbih0eXBlbmFtZXNbaV0sIHZhbHVlLCBvcHRpb25zKSk7XG4gIHJldHVybiB0aGlzO1xufVxuIiwgImltcG9ydCBkZWZhdWx0VmlldyBmcm9tIFwiLi4vd2luZG93LmpzXCI7XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRXZlbnQobm9kZSwgdHlwZSwgcGFyYW1zKSB7XG4gIHZhciB3aW5kb3cgPSBkZWZhdWx0Vmlldyhub2RlKSxcbiAgICAgIGV2ZW50ID0gd2luZG93LkN1c3RvbUV2ZW50O1xuXG4gIGlmICh0eXBlb2YgZXZlbnQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGV2ZW50ID0gbmV3IGV2ZW50KHR5cGUsIHBhcmFtcyk7XG4gIH0gZWxzZSB7XG4gICAgZXZlbnQgPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJFdmVudFwiKTtcbiAgICBpZiAocGFyYW1zKSBldmVudC5pbml0RXZlbnQodHlwZSwgcGFyYW1zLmJ1YmJsZXMsIHBhcmFtcy5jYW5jZWxhYmxlKSwgZXZlbnQuZGV0YWlsID0gcGFyYW1zLmRldGFpbDtcbiAgICBlbHNlIGV2ZW50LmluaXRFdmVudCh0eXBlLCBmYWxzZSwgZmFsc2UpO1xuICB9XG5cbiAgbm9kZS5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn1cblxuZnVuY3Rpb24gZGlzcGF0Y2hDb25zdGFudCh0eXBlLCBwYXJhbXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkaXNwYXRjaEV2ZW50KHRoaXMsIHR5cGUsIHBhcmFtcyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGRpc3BhdGNoRnVuY3Rpb24odHlwZSwgcGFyYW1zKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGlzcGF0Y2hFdmVudCh0aGlzLCB0eXBlLCBwYXJhbXMuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHR5cGUsIHBhcmFtcykge1xuICByZXR1cm4gdGhpcy5lYWNoKCh0eXBlb2YgcGFyYW1zID09PSBcImZ1bmN0aW9uXCJcbiAgICAgID8gZGlzcGF0Y2hGdW5jdGlvblxuICAgICAgOiBkaXNwYXRjaENvbnN0YW50KSh0eXBlLCBwYXJhbXMpKTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiooKSB7XG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgaiA9IDAsIG0gPSBncm91cHMubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIGkgPSAwLCBuID0gZ3JvdXAubGVuZ3RoLCBub2RlOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB5aWVsZCBub2RlO1xuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCBzZWxlY3Rpb25fc2VsZWN0IGZyb20gXCIuL3NlbGVjdC5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9zZWxlY3RBbGwgZnJvbSBcIi4vc2VsZWN0QWxsLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3NlbGVjdENoaWxkIGZyb20gXCIuL3NlbGVjdENoaWxkLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3NlbGVjdENoaWxkcmVuIGZyb20gXCIuL3NlbGVjdENoaWxkcmVuLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2ZpbHRlciBmcm9tIFwiLi9maWx0ZXIuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fZGF0YSBmcm9tIFwiLi9kYXRhLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2VudGVyIGZyb20gXCIuL2VudGVyLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2V4aXQgZnJvbSBcIi4vZXhpdC5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9qb2luIGZyb20gXCIuL2pvaW4uanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fbWVyZ2UgZnJvbSBcIi4vbWVyZ2UuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fb3JkZXIgZnJvbSBcIi4vb3JkZXIuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fc29ydCBmcm9tIFwiLi9zb3J0LmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2NhbGwgZnJvbSBcIi4vY2FsbC5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9ub2RlcyBmcm9tIFwiLi9ub2Rlcy5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9ub2RlIGZyb20gXCIuL25vZGUuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fc2l6ZSBmcm9tIFwiLi9zaXplLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2VtcHR5IGZyb20gXCIuL2VtcHR5LmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2VhY2ggZnJvbSBcIi4vZWFjaC5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9hdHRyIGZyb20gXCIuL2F0dHIuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fc3R5bGUgZnJvbSBcIi4vc3R5bGUuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fcHJvcGVydHkgZnJvbSBcIi4vcHJvcGVydHkuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fY2xhc3NlZCBmcm9tIFwiLi9jbGFzc2VkLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3RleHQgZnJvbSBcIi4vdGV4dC5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9odG1sIGZyb20gXCIuL2h0bWwuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fcmFpc2UgZnJvbSBcIi4vcmFpc2UuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fbG93ZXIgZnJvbSBcIi4vbG93ZXIuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fYXBwZW5kIGZyb20gXCIuL2FwcGVuZC5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9pbnNlcnQgZnJvbSBcIi4vaW5zZXJ0LmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3JlbW92ZSBmcm9tIFwiLi9yZW1vdmUuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fY2xvbmUgZnJvbSBcIi4vY2xvbmUuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fZGF0dW0gZnJvbSBcIi4vZGF0dW0uanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fb24gZnJvbSBcIi4vb24uanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fZGlzcGF0Y2ggZnJvbSBcIi4vZGlzcGF0Y2guanNcIjtcbmltcG9ydCBzZWxlY3Rpb25faXRlcmF0b3IgZnJvbSBcIi4vaXRlcmF0b3IuanNcIjtcblxuZXhwb3J0IHZhciByb290ID0gW251bGxdO1xuXG5leHBvcnQgZnVuY3Rpb24gU2VsZWN0aW9uKGdyb3VwcywgcGFyZW50cykge1xuICB0aGlzLl9ncm91cHMgPSBncm91cHM7XG4gIHRoaXMuX3BhcmVudHMgPSBwYXJlbnRzO1xufVxuXG5mdW5jdGlvbiBzZWxlY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKFtbZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50XV0sIHJvb3QpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3Rpb25fc2VsZWN0aW9uKCkge1xuICByZXR1cm4gdGhpcztcbn1cblxuU2VsZWN0aW9uLnByb3RvdHlwZSA9IHNlbGVjdGlvbi5wcm90b3R5cGUgPSB7XG4gIGNvbnN0cnVjdG9yOiBTZWxlY3Rpb24sXG4gIHNlbGVjdDogc2VsZWN0aW9uX3NlbGVjdCxcbiAgc2VsZWN0QWxsOiBzZWxlY3Rpb25fc2VsZWN0QWxsLFxuICBzZWxlY3RDaGlsZDogc2VsZWN0aW9uX3NlbGVjdENoaWxkLFxuICBzZWxlY3RDaGlsZHJlbjogc2VsZWN0aW9uX3NlbGVjdENoaWxkcmVuLFxuICBmaWx0ZXI6IHNlbGVjdGlvbl9maWx0ZXIsXG4gIGRhdGE6IHNlbGVjdGlvbl9kYXRhLFxuICBlbnRlcjogc2VsZWN0aW9uX2VudGVyLFxuICBleGl0OiBzZWxlY3Rpb25fZXhpdCxcbiAgam9pbjogc2VsZWN0aW9uX2pvaW4sXG4gIG1lcmdlOiBzZWxlY3Rpb25fbWVyZ2UsXG4gIHNlbGVjdGlvbjogc2VsZWN0aW9uX3NlbGVjdGlvbixcbiAgb3JkZXI6IHNlbGVjdGlvbl9vcmRlcixcbiAgc29ydDogc2VsZWN0aW9uX3NvcnQsXG4gIGNhbGw6IHNlbGVjdGlvbl9jYWxsLFxuICBub2Rlczogc2VsZWN0aW9uX25vZGVzLFxuICBub2RlOiBzZWxlY3Rpb25fbm9kZSxcbiAgc2l6ZTogc2VsZWN0aW9uX3NpemUsXG4gIGVtcHR5OiBzZWxlY3Rpb25fZW1wdHksXG4gIGVhY2g6IHNlbGVjdGlvbl9lYWNoLFxuICBhdHRyOiBzZWxlY3Rpb25fYXR0cixcbiAgc3R5bGU6IHNlbGVjdGlvbl9zdHlsZSxcbiAgcHJvcGVydHk6IHNlbGVjdGlvbl9wcm9wZXJ0eSxcbiAgY2xhc3NlZDogc2VsZWN0aW9uX2NsYXNzZWQsXG4gIHRleHQ6IHNlbGVjdGlvbl90ZXh0LFxuICBodG1sOiBzZWxlY3Rpb25faHRtbCxcbiAgcmFpc2U6IHNlbGVjdGlvbl9yYWlzZSxcbiAgbG93ZXI6IHNlbGVjdGlvbl9sb3dlcixcbiAgYXBwZW5kOiBzZWxlY3Rpb25fYXBwZW5kLFxuICBpbnNlcnQ6IHNlbGVjdGlvbl9pbnNlcnQsXG4gIHJlbW92ZTogc2VsZWN0aW9uX3JlbW92ZSxcbiAgY2xvbmU6IHNlbGVjdGlvbl9jbG9uZSxcbiAgZGF0dW06IHNlbGVjdGlvbl9kYXR1bSxcbiAgb246IHNlbGVjdGlvbl9vbixcbiAgZGlzcGF0Y2g6IHNlbGVjdGlvbl9kaXNwYXRjaCxcbiAgW1N5bWJvbC5pdGVyYXRvcl06IHNlbGVjdGlvbl9pdGVyYXRvclxufTtcblxuZXhwb3J0IGRlZmF1bHQgc2VsZWN0aW9uO1xuIiwgImltcG9ydCB7U2VsZWN0aW9uLCByb290fSBmcm9tIFwiLi9zZWxlY3Rpb24vaW5kZXguanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0b3IpIHtcbiAgcmV0dXJuIHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyBuZXcgU2VsZWN0aW9uKFtbZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcildXSwgW2RvY3VtZW50LmRvY3VtZW50RWxlbWVudF0pXG4gICAgICA6IG5ldyBTZWxlY3Rpb24oW1tzZWxlY3Rvcl1dLCByb290KTtcbn1cbiIsICJpbXBvcnQgeyBBcHAsIE1vZGFsLCBzZXRJY29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IE5vdGVSZWNvcmQgfSBmcm9tIFwiLi90eXBlc1wiO1xyXG5pbXBvcnQgdHlwZSBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luIGZyb20gXCIuL21haW5cIjtcclxuaW1wb3J0IHsgc2F2ZVN0b3JlIH0gZnJvbSBcIi4vc3RvcmVcIjtcclxuaW1wb3J0IHsgd3JpdGVGcm9udG1hdHRlckRlY2tzIH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcclxuaW1wb3J0IHsgcmVhZE5vdGVSZWNvcmQgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiO1xyXG5pbXBvcnQgeyBBY3RpdmVNb2RhbCB9IGZyb20gXCIuL0FjdGl2ZU1vZGFsXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgRGVja1BpY2tlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgYXBwOiBBcHAsXHJcbiAgICBwcml2YXRlIHBsdWdpbjogU3BhY2VkRXZlcnl0aGluZ1BsdWdpbixcclxuICApIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgfVxyXG5cclxuICBvbk9wZW4oKSB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkNob29zZSBhIGRlY2tcIiB9KTtcclxuXHJcbiAgICAvLyBDb2xsZWN0IGRlY2sgXHUyMTkyIG5vdGVzIG1hcHBpbmcgZnJvbSBtZXRhZGF0YUNhY2hlXHJcbiAgICBjb25zdCBkZWNrTWFwID0gbmV3IE1hcDxzdHJpbmcsIE5vdGVSZWNvcmRbXT4oKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgdGhpcy5hcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpKSB7XHJcbiAgICAgIGNvbnN0IGZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xyXG4gICAgICBpZiAoIWZtPy5hY3RpdmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcmVjb3JkOiBOb3RlUmVjb3JkID0gcmVhZE5vdGVSZWNvcmQodGhpcy5wbHVnaW4sIGZpbGUpOyAgXHJcbiAgXHJcbiAgICAgIC8vIFwiZGVmYXVsdFwiIGFsd2F5cyBnZXRzIGV2ZXJ5IGFjdGl2ZSBub3RlICBcclxuICAgICAgaWYgKCFkZWNrTWFwLmhhcyhcImRlZmF1bHRcIikpIGRlY2tNYXAuc2V0KFwiZGVmYXVsdFwiLCBbXSk7ICBcclxuICAgICAgZGVja01hcC5nZXQoXCJkZWZhdWx0XCIpIS5wdXNoKHJlY29yZCk7ICBcclxuICBcclxuICAgICAgLy8gYWxzbyBhZGQgdG8gYW55IG5hbWVkIGRlY2tzIHRoZSBub3RlIGJlbG9uZ3MgdG8gIFxyXG4gICAgICBjb25zdCBuYW1lZERlY2tzOiBzdHJpbmdbXSA9IEFycmF5LmlzQXJyYXkoZm0uZGVja3MpID8gZm0uZGVja3MuZmlsdGVyKChkOiBzdHJpbmcpID0+IGQgIT09IFwiZGVmYXVsdFwiKSA6IFtdOyAgXHJcbiAgICAgIGZvciAoY29uc3QgZGVjayBvZiBuYW1lZERlY2tzKSB7ICBcclxuICAgICAgICBpZiAoIWRlY2tNYXAuaGFzKGRlY2spKSBkZWNrTWFwLnNldChkZWNrLCBbXSk7ICBcclxuICAgICAgICBkZWNrTWFwLmdldChkZWNrKSEucHVzaChyZWNvcmQpOyAgXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoZGVja01hcC5zaXplID09PSAwKSB7XHJcbiAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIGFjdGl2ZSBub3RlcyBmb3VuZC5cIiB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNvcnQ6IG1vc3QgcmVjZW50bHkgdXNlZCBmaXJzdDsgXCJkZWZhdWx0XCIgYWx3YXlzIGxpc3RlZFxyXG4gICAgY29uc3QgbGFzdFVzZWQgPSB0aGlzLnBsdWdpbi5kYXRhLmRlY2tMYXN0VXNlZCA/PyB7fTtcclxuICAgIGNvbnN0IHNvcnRlZCA9IFsuLi5kZWNrTWFwLmtleXMoKV0uc29ydCgoYSwgYikgPT4ge1xyXG4gICAgICBjb25zdCB0YSA9IGxhc3RVc2VkW2FdID8/IFwiXCI7XHJcbiAgICAgIGNvbnN0IHRiID0gbGFzdFVzZWRbYl0gPz8gXCJcIjtcclxuICAgICAgcmV0dXJuIHRiLmxvY2FsZUNvbXBhcmUodGEpOyAvLyBkZXNjZW5kaW5nXHJcbiAgICB9KTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IGRlY2tOYW1lIG9mIHNvcnRlZCkge1xyXG4gICAgICBjb25zdCBub3RlcyA9IGRlY2tNYXAuZ2V0KGRlY2tOYW1lKSE7XHJcbiAgICAgIGNvbnN0IHJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2stcm93XCIgfSk7XHJcblxyXG4gICAgICBjb25zdCBidG4gPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG4gICAgICAgIHRleHQ6IGAke2RlY2tOYW1lID09PSBcImRlZmF1bHRcIiA/IFwiRGVmYXVsdCBkZWNrXCIgOiBkZWNrTmFtZX0gKCR7bm90ZXMubGVuZ3RofSlgLFxyXG4gICAgICAgIGNsczogXCJtb2QtY3RhIHNwYWNlZC1kZWNrLXBpY2stYnRuXCIsXHJcbiAgICAgIH0pO1xyXG4gICAgICBidG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAvLyBSZWNvcmQgbGFzdCB1c2VkXHJcbiAgICAgICAgdGhpcy5wbHVnaW4uZGF0YS5kZWNrTGFzdFVzZWQgPSB7IC4uLmxhc3RVc2VkLCBbZGVja05hbWVdOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgfTtcclxuICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgQWN0aXZlTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luLCBub3RlcywgZGVja05hbWUpO1xyXG4gICAgICAgIC8vIFJlc3VtZSBzYXZlZCBzZXNzaW9uIGlmIGF2YWlsYWJsZVxyXG4gICAgICAgIGNvbnN0IHNhdmVkID0gdGhpcy5wbHVnaW4uZGF0YS5jcmFtU2Vzc2lvbnM/LltkZWNrTmFtZV07XHJcbiAgICAgICAgaWYgKHNhdmVkICYmIChzYXZlZC5yZW1haW5pbmcubGVuZ3RoID4gMCB8fCBzYXZlZC5mYWlsZWQubGVuZ3RoID4gMCkpIHtcclxuICAgICAgICAgIGNvbnN0IGFsbE5vdGVzID0gWy4uLm5vdGVzXTtcclxuICAgICAgICAgIGNvbnN0IHRvUmVjb3JkID0gKGZwOiBzdHJpbmcpOiBOb3RlUmVjb3JkIHwgdW5kZWZpbmVkID0+IGFsbE5vdGVzLmZpbmQoKG4pID0+IG4uZmlsZXBhdGggPT09IGZwKTtcclxuICAgICAgICAgIGNvbnN0IGZpbHRlclJlY29yZHMgPSAoZnBzOiBzdHJpbmdbXSkgPT4gZnBzLm1hcCh0b1JlY29yZCkuZmlsdGVyKChuKTogbiBpcyBOb3RlUmVjb3JkID0+IG4gIT09IHVuZGVmaW5lZCk7XHJcblxyXG4gICAgICAgICAgY29uc3QgcmVtYWluaW5nID0gZmlsdGVyUmVjb3JkcyhzYXZlZC5yZW1haW5pbmcpO1xyXG4gICAgICAgICAgY29uc3QgZmFpbGVkID0gZmlsdGVyUmVjb3JkcyhzYXZlZC5mYWlsZWQpO1xyXG5cclxuICAgICAgICAgIC8vIE9ubHkgcmVzdW1lIGlmIHRoZXJlJ3MgYWN0dWFsbHkgc29tZXRoaW5nIGxlZnQgYWZ0ZXIgZmlsdGVyaW5nIG91dCByZW5hbWVkL2RlbGV0ZWQgbm90ZXNcclxuICAgICAgICAgIGlmIChyZW1haW5pbmcubGVuZ3RoID4gMCB8fCBmYWlsZWQubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBtaXNzaW5nQ291bnQgPSBzYXZlZC5yZW1haW5pbmcubGVuZ3RoIC0gcmVtYWluaW5nLmxlbmd0aCArIHNhdmVkLmZhaWxlZC5sZW5ndGggLSBmYWlsZWQubGVuZ3RoO1xyXG5cclxuICAgICAgICAgICAgbW9kYWwucmVzdW1lU2Vzc2lvbih7XHJcbiAgICAgICAgICAgICAgcmVtYWluaW5nLFxyXG4gICAgICAgICAgICAgIGZhaWxlZCxcclxuICAgICAgICAgICAgICBwcm9ncmVzc0xvZzogc2F2ZWQucHJvZ3Jlc3NMb2csXHJcbiAgICAgICAgICAgICAgY3VycmVudFJvdW5kU2l6ZTogc2F2ZWQuY3VycmVudFJvdW5kU2l6ZSAtIG1pc3NpbmdDb3VudCxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBpZiAoZGVja05hbWUgIT09IFwiZGVmYXVsdFwiKSB7XHJcbiAgICAgICAgY29uc3QgcmVuYW1lQnRuID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtaGRyLWJ0blwiIH0pO1xyXG4gICAgICAgIHNldEljb24ocmVuYW1lQnRuLCBcInBlbmNpbFwiKTtcclxuICAgICAgICByZW5hbWVCdG4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBcIlJlbmFtZSBkZWNrXCIpO1xyXG4gICAgICAgIHJlbmFtZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHtcclxuICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblxyXG4gICAgICAgICAgLy8gU3dhcCBidXR0b24gZm9yIGFuIGlucHV0XHJcbiAgICAgICAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcclxuICAgICAgICAgIGlucHV0LmNsYXNzTmFtZSA9IFwic3BhY2VkLWRlY2stcmVuYW1lLWlucHV0XCI7XHJcbiAgICAgICAgICBpbnB1dC52YWx1ZSA9IGRlY2tOYW1lO1xyXG4gICAgICAgICAgYnRuLnJlcGxhY2VXaXRoKGlucHV0KTtcclxuICAgICAgICAgIHJlbmFtZUJ0bi5yZW1vdmUoKTtcclxuICAgICAgICAgIGlucHV0LmZvY3VzKCk7XHJcbiAgICAgICAgICBpbnB1dC5zZWxlY3QoKTtcclxuXHJcbiAgICAgICAgICBsZXQgc3VibWl0dGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgY29uc3QgY2FuY2VsID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBpbnB1dC5yZXBsYWNlV2l0aChidG4pO1xyXG4gICAgICAgICAgICByb3cuYXBwZW5kQ2hpbGQocmVuYW1lQnRuKTtcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgY29uc3QgY29uZmlybSA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKHN1Ym1pdHRlZCkgcmV0dXJuO1xyXG4gICAgICAgICAgICBzdWJtaXR0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBjb25zdCBuZXdOYW1lID0gaW5wdXQudmFsdWUudHJpbSgpO1xyXG4gICAgICAgICAgICBpZiAoIW5ld05hbWUgfHwgbmV3TmFtZSA9PT0gZGVja05hbWUpIHtcclxuICAgICAgICAgICAgICBjYW5jZWwoKTtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZW5hbWVEZWNrKGRlY2tOYW1lLCBuZXdOYW1lKTtcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgYXN5bmMgKGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGUua2V5ID09PSBcIkVudGVyXCIpIHtcclxuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgYXdhaXQgY29uZmlybSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gXCJFc2NhcGVcIikge1xyXG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICBjYW5jZWwoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICB2b2lkIGNvbmZpcm0oKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHJlbmFtZURlY2sob2xkTmFtZTogc3RyaW5nLCBuZXdOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIC8vIDEuIFVwZGF0ZSBmcm9udG1hdHRlciBmaXJzdCAoYmVmb3JlIGZvbGRlciByZW5hbWUgY2hhbmdlcyBmaWxlIHBhdGhzKVxyXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKSkge1xyXG4gICAgICBjb25zdCBkZWNrcyA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcj8uZGVja3M7XHJcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShkZWNrcykgfHwgIWRlY2tzLmluY2x1ZGVzKG9sZE5hbWUpKSBjb250aW51ZTtcclxuICAgICAgYXdhaXQgd3JpdGVGcm9udG1hdHRlckRlY2tzKFxyXG4gICAgICAgIHRoaXMuYXBwLFxyXG4gICAgICAgIGZpbGUucGF0aCxcclxuICAgICAgICBkZWNrcy5tYXAoKGQ6IHN0cmluZykgPT4gKGQgPT09IG9sZE5hbWUgPyBuZXdOYW1lIDogZCkpLFxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIDIuIE9wdGlvbmFsbHkgcmVuYW1lIG1hdGNoaW5nIGZvbGRlclxyXG4gICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLnJlbmFtZUZvbGRlcldpdGhEZWNrKSB7XHJcbiAgICAgIGNvbnN0IG1hdGNoaW5nRm9sZGVycyA9IHRoaXMuYXBwLnZhdWx0LmdldEFsbEZvbGRlcnMoKS5maWx0ZXIoKGYpID0+IGYubmFtZSA9PT0gb2xkTmFtZSk7XHJcbiAgICAgIGlmIChtYXRjaGluZ0ZvbGRlcnMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgY29uc3QgZm9sZGVyID0gbWF0Y2hpbmdGb2xkZXJzWzBdO1xyXG4gICAgICAgIGNvbnN0IHBhcmVudFBhdGggPSBmb2xkZXIucGFyZW50Py5wYXRoO1xyXG4gICAgICAgIGNvbnN0IG5ld0ZvbGRlclBhdGggPSBwYXJlbnRQYXRoICYmIHBhcmVudFBhdGggIT09IFwiL1wiID8gYCR7cGFyZW50UGF0aH0vJHtuZXdOYW1lfWAgOiBuZXdOYW1lO1xyXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlbmFtZShmb2xkZXIsIG5ld0ZvbGRlclBhdGgpO1xyXG4gICAgICB9IGVsc2UgaWYgKG1hdGNoaW5nRm9sZGVycy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgbmV3IE5vdGljZShgRGVjayByZW5hbWVkLCBidXQgZm9sZGVyIHdhcyBub3QgcmVuYW1lZDogbXVsdGlwbGUgZm9sZGVycyBuYW1lZCBcIiR7b2xkTmFtZX1cIiBleGlzdC5gKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIDMuIE1pZ3JhdGUgcGx1Z2luIGRhdGEga2V5c1xyXG4gICAgY29uc3QgbGFzdFVzZWQgPSB0aGlzLnBsdWdpbi5kYXRhLmRlY2tMYXN0VXNlZDtcclxuICAgIGlmIChsYXN0VXNlZD8uW29sZE5hbWVdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgbGFzdFVzZWRbbmV3TmFtZV0gPSBsYXN0VXNlZFtvbGROYW1lXTtcclxuICAgICAgZGVsZXRlIGxhc3RVc2VkW29sZE5hbWVdO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHNlc3Npb25zID0gdGhpcy5wbHVnaW4uZGF0YS5jcmFtU2Vzc2lvbnM7XHJcbiAgICBpZiAoc2Vzc2lvbnM/LltvbGROYW1lXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHNlc3Npb25zW25ld05hbWVdID0gc2Vzc2lvbnNbb2xkTmFtZV07XHJcbiAgICAgIGRlbGV0ZSBzZXNzaW9uc1tvbGROYW1lXTtcclxuICAgIH1cclxuXHJcbiAgICBhd2FpdCBzYXZlU3RvcmUodGhpcy5wbHVnaW4sIHRoaXMucGx1Z2luLmRhdGEpO1xyXG4gICAgdGhpcy5vbk9wZW4oKTtcclxuICB9XHJcblxyXG4gIG9uQ2xvc2UoKSB7XHJcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gIH1cclxufVxyXG4iLCAiaW1wb3J0IHsgQXBwLCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgTm90ZVJlY29yZCB9IGZyb20gXCIuL3R5cGVzXCI7XG5pbXBvcnQgdHlwZSBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luIGZyb20gXCIuL21haW5cIjtcbmltcG9ydCB7IHNhdmVTdG9yZSB9IGZyb20gXCIuL3N0b3JlXCI7XG5pbXBvcnQgeyBCYXNlTm90ZU1vZGFsIH0gZnJvbSBcIi4vQmFzZU5vdGVNb2RhbFwiO1xuaW1wb3J0IHsgc2h1ZmZsZUFycmF5LCBnZXRBY3RpdmVOb3RlcyB9IGZyb20gXCIuL3V0aWxzXCI7XG5cbmV4cG9ydCBjbGFzcyBBY3RpdmVNb2RhbCBleHRlbmRzIEJhc2VOb3RlTW9kYWwge1xuICBwcml2YXRlIHJlbWFpbmluZzogTm90ZVJlY29yZFtdO1xuICBwcml2YXRlIHBhc3NlZDogTm90ZVJlY29yZFtdID0gW107XG4gIHByaXZhdGUgZmFpbGVkOiBOb3RlUmVjb3JkW10gPSBbXTtcbiAgcHJpdmF0ZSBwcm9ncmVzc0xvZzogKFwicGFzc1wiIHwgXCJmYWlsXCIpW10gPSBbXTtcbiAgcHJpdmF0ZSBjdXJyZW50Um91bmRTaXplOiBudW1iZXI7XG4gIHByb3RlY3RlZCBub3RlITogTm90ZVJlY29yZDtcbiAgcHJpdmF0ZSBhbGxOb3RlczogTm90ZVJlY29yZFtdID0gW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJvdGVjdGVkIHBsdWdpbjogU3BhY2VkRXZlcnl0aGluZ1BsdWdpbixcbiAgICBub3RlczogTm90ZVJlY29yZFtdLFxuICAgIGRlY2tOYW1lOiBzdHJpbmcgPSBcImRlZmF1bHRcIixcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLmRlY2tOYW1lID0gZGVja05hbWU7XG4gICAgdGhpcy5hbGxOb3RlcyA9IFsuLi5ub3Rlc107XG4gICAgdGhpcy5yZW1haW5pbmcgPSBbLi4ubm90ZXNdO1xuICAgIHRoaXMuY3VycmVudFJvdW5kU2l6ZSA9IG5vdGVzLmxlbmd0aDtcbiAgfVxuICBwcm90ZWN0ZWQgc2hvd1Jlc3RhcnRCdXR0b24gPSB0cnVlO1xuXG4gIHByb3RlY3RlZCBvblJlc3RhcnRDbGljaygpOiB2b2lkIHtcbiAgICB2b2lkIHRoaXMucmVzdGFydFNlc3Npb24odGhpcy5hbGxOb3Rlcyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0U3RhdHVzVGV4dCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgJHt0aGlzLnJlbWFpbmluZy5sZW5ndGh9IHJlbWFpbmluZyBcdTAwQjcgJHt0aGlzLmZhaWxlZC5sZW5ndGh9IHRvIHJldHJ5YDtcbiAgfVxuXG4gIHB1YmxpYyByZXN1bWVTZXNzaW9uKHN0YXRlOiB7XG4gICAgcmVtYWluaW5nOiBOb3RlUmVjb3JkW107XG4gICAgZmFpbGVkOiBOb3RlUmVjb3JkW107XG4gICAgcHJvZ3Jlc3NMb2c6IChcInBhc3NcIiB8IFwiZmFpbFwiKVtdO1xuICAgIGN1cnJlbnRSb3VuZFNpemU6IG51bWJlcjtcbiAgfSkge1xuICAgIHRoaXMucmVtYWluaW5nID0gc3RhdGUucmVtYWluaW5nO1xuICAgIHRoaXMuZmFpbGVkID0gc3RhdGUuZmFpbGVkO1xuICAgIHRoaXMucHJvZ3Jlc3NMb2cgPSBzdGF0ZS5wcm9ncmVzc0xvZztcbiAgICB0aGlzLmN1cnJlbnRSb3VuZFNpemUgPSBzdGF0ZS5jdXJyZW50Um91bmRTaXplO1xuICB9XG5cbiAgYXN5bmMgb25PcGVuKCkge1xuICAgIGlmICh0aGlzLnJlbWFpbmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMuc2hvd1N1bW1hcnkodGhpcy5mYWlsZWQubGVuZ3RoID09PSAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5yZW5kZXIoKTtcbiAgICB0aGlzLnNldHVwVmF1bHRMaXN0ZW5lcigpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZW5kZXIoKSB7XG4gICAgaWYgKHRoaXMucmVtYWluaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy5zaG93U3VtbWFyeSh0aGlzLmZhaWxlZC5sZW5ndGggPT09IDApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcbiAgICB0aGlzLm5vdGUgPSB0aGlzLnJlbWFpbmluZ1swXTtcbiAgICBhd2FpdCB0aGlzLnJlbmRlck5vdGUoY29udGVudEVsKTtcbiAgfVxuICBwcm90ZWN0ZWQgcmVuZGVyQnV0dG9ucyhjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgYnRuUm93ID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYnRuLXJvd1wiIH0pO1xuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgeyBsYWJlbDogXCJOb3Qgbm93L1Bhc3NcIiwgY2xzOiBcInBhc3NcIiwgY2I6ICgpID0+IHRoaXMucmVzcG9uZChcInBhc3NcIikgfSk7XG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCB7IGxhYmVsOiBcIlJldHJ5XCIsIGNsczogXCJmYWlsXCIsIGNiOiAoKSA9PiB0aGlzLnJlc3BvbmQoXCJmYWlsXCIpIH0pO1xuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywge1xuICAgICAgaWNvbjogXCJzaHVmZmxlXCIsXG4gICAgICBjbHM6IFwiaWNvblwiLFxuICAgICAgdG9vbHRpcDogXCJTaHVmZmxlIHJlbWFpbmluZyBjYXJkc1wiLFxuICAgICAgY2I6IGFzeW5jICgpID0+IHtcbiAgICAgICAgdGhpcy5yZW1haW5pbmcgPSBzaHVmZmxlQXJyYXkodGhpcy5yZW1haW5pbmcpO1xuICAgICAgICBhd2FpdCB0aGlzLnJlbmRlcigpO1xuICAgICAgfSxcbiAgICB9KTtcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHsgaWNvbjogXCJyb3V0ZVwiLCBjbHM6IFwicm91dGVcIiwgdG9vbHRpcDogXCJSb3V0ZSBcdTIxOTJcIiwgY2I6ICgpID0+IHRoaXMucm91dGVOb3RlKCkgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0UHJvZ3Jlc3NTZWdtZW50cygpOiBzdHJpbmdbXSB7XG4gICAgY29uc3Qgc2VnbWVudHM6IHN0cmluZ1tdID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmN1cnJlbnRSb3VuZFNpemU7IGkrKykge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5wcm9ncmVzc0xvZ1tpXTtcbiAgICAgIGlmIChyZXN1bHQgPT09IFwicGFzc1wiKSBzZWdtZW50cy5wdXNoKFwic3BhY2VkLXByb2dyZXNzLXBhc3NcIik7XG4gICAgICBlbHNlIGlmIChyZXN1bHQgPT09IFwiZmFpbFwiKSBzZWdtZW50cy5wdXNoKFwic3BhY2VkLXByb2dyZXNzLWZhaWxcIik7XG4gICAgICBlbHNlIHNlZ21lbnRzLnB1c2goXCJcIik7XG4gICAgfVxuICAgIHJldHVybiBzZWdtZW50cztcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVzcG9uZChyZXN1bHQ6IFwicGFzc1wiIHwgXCJmYWlsXCIpIHtcbiAgICBhd2FpdCB0aGlzLnNhdmVUaXRsZSgpO1xuICAgIGF3YWl0IHRoaXMuc2F2ZUJvZHlFZGl0cygpO1xuICAgIGNvbnN0IG5vdGUgPSB0aGlzLnJlbWFpbmluZy5zaGlmdCgpITtcbiAgICB0aGlzLnByb2dyZXNzTG9nLnB1c2gocmVzdWx0KTtcblxuICAgIGlmIChyZXN1bHQgPT09IFwicGFzc1wiKSB7XG4gICAgICB0aGlzLnBhc3NlZC5wdXNoKG5vdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZhaWxlZC5wdXNoKG5vdGUpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJlbWFpbmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgIGlmICh0aGlzLmZhaWxlZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhpcy5zaG93U3VtbWFyeSh0cnVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2hvd1N1bW1hcnkoZmFsc2UpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcHJpdmF0ZSBzaG93U3VtbWFyeShpc0RvbmU6IGJvb2xlYW4pIHtcbiAgICB0aGlzLmNsZWFudXBFZGl0b3JzKCk7XG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgY29udGVudEVsLmVtcHR5KCk7XG4gICAgaWYgKGlzRG9uZSkge1xuICAgICAgdm9pZCB0aGlzLmNsZWFyU2Vzc2lvbigpO1xuICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFsbCBkb25lIVwiIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiUm91bmQgY29tcGxldGUhXCIgfSk7XG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFBhc3NlZDogJHt0aGlzLnBhc3NlZC5sZW5ndGh9YCB9KTtcbiAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgRmFpbGVkOiAke3RoaXMuZmFpbGVkLmxlbmd0aH1gIH0pO1xuICAgIH1cbiAgICBjb25zdCBidG5Sb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1idG4tcm93XCIgfSk7XG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCB7XG4gICAgICBsYWJlbDogaXNEb25lID8gXCJSZXN0YXJ0IHNlc3Npb25cIiA6IFwiTmV4dCByb3VuZFwiLFxuICAgICAgY2xzOiBcInN1bW1hcnktYWN0aW9uXCIsXG4gICAgICBtb2RpZmllcjogXCJjdGFcIixcbiAgICAgIGNiOiAoKSA9PiB0aGlzLnJlc3RhcnRTZXNzaW9uKGlzRG9uZSA/IHRoaXMuYWxsTm90ZXMgOiB0aGlzLmZhaWxlZCksXG4gICAgfSk7XG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCB7IGxhYmVsOiBcIkNsb3NlXCIsIGNsczogXCJzdW1tYXJ5LWNsb3NlXCIsIGNiOiAoKSA9PiB0aGlzLmNsb3NlKCkgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNsZWFyU2Vzc2lvbigpIHtcbiAgICBpZiAodGhpcy5wbHVnaW4uZGF0YS5jcmFtU2Vzc2lvbnMpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLnBsdWdpbi5kYXRhLmNyYW1TZXNzaW9uc1t0aGlzLmRlY2tOYW1lXTtcbiAgICB9XG4gICAgYXdhaXQgc2F2ZVN0b3JlKHRoaXMucGx1Z2luLCB0aGlzLnBsdWdpbi5kYXRhKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2F2ZVNlc3Npb24oKSB7XG4gICAgdGhpcy5wbHVnaW4uZGF0YS5jcmFtU2Vzc2lvbnMgPSB0aGlzLnBsdWdpbi5kYXRhLmNyYW1TZXNzaW9ucyA/PyB7fTtcbiAgICB0aGlzLnBsdWdpbi5kYXRhLmNyYW1TZXNzaW9uc1t0aGlzLmRlY2tOYW1lXSA9IHtcbiAgICAgIHJlbWFpbmluZzogdGhpcy5yZW1haW5pbmcubWFwKChuKSA9PiBuLmZpbGVwYXRoKSxcbiAgICAgIGZhaWxlZDogdGhpcy5mYWlsZWQubWFwKChuKSA9PiBuLmZpbGVwYXRoKSxcbiAgICAgIHByb2dyZXNzTG9nOiBbLi4udGhpcy5wcm9ncmVzc0xvZ10sXG4gICAgICBjdXJyZW50Um91bmRTaXplOiB0aGlzLmN1cnJlbnRSb3VuZFNpemUsXG4gICAgfTtcbiAgICBhd2FpdCBzYXZlU3RvcmUodGhpcy5wbHVnaW4sIHRoaXMucGx1Z2luLmRhdGEpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZXN0YXJ0U2Vzc2lvbihzb3VyY2VOb3RlczogTm90ZVJlY29yZFtdKSB7XG4gICAgdGhpcy5yZW1haW5pbmcgPSBnZXRBY3RpdmVOb3Rlcyh0aGlzLmFwcCwgc291cmNlTm90ZXMpO1xuICAgIHRoaXMucGFzc2VkID0gW107XG4gICAgdGhpcy5mYWlsZWQgPSBbXTtcbiAgICB0aGlzLnByb2dyZXNzTG9nID0gW107XG4gICAgdGhpcy5jdXJyZW50Um91bmRTaXplID0gdGhpcy5yZW1haW5pbmcubGVuZ3RoO1xuICAgIGF3YWl0IHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgb25TZXNzaW9uQ2xvc2UoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucmVtYWluaW5nLmxlbmd0aCA+IDAgfHwgdGhpcy5mYWlsZWQubGVuZ3RoID4gMCkge1xuICAgICAgdm9pZCB0aGlzLnNhdmVTZXNzaW9uKCk7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHtURm9sZGVyLCBOb3RpY2UsIEFwcCwgTW9kYWwgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgd3JpdGVGcm9udG1hdHRlckFjdGl2ZSwgd3JpdGVGcm9udG1hdHRlckRlY2tzIH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcclxuaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgRm9sZGVyRGVja1BpY2tlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG4gIHByaXZhdGUgc2VsZWN0ZWREZWNrczogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XHJcbiAgcHJpdmF0ZSB1c2VGb2xkZXJOYW1lID0gZmFsc2U7XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgYXBwOiBBcHAsXHJcbiAgICBwcml2YXRlIGZvbGRlcjogVEZvbGRlcixcclxuICAgIHByaXZhdGUgcGx1Z2luOiBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luLFxyXG4gICkge1xyXG4gICAgc3VwZXIoYXBwKTtcclxuICB9XHJcblxyXG4gIG9uT3BlbigpIHtcclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG4gICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IGBBZGQgXCIke3RoaXMuZm9sZGVyLm5hbWV9XCIgdG8gZGVja2AgfSk7XHJcblxyXG4gICAgLy8gT3B0aW9uOiB1c2UgZm9sZGVyIG5hbWUgYXMgZGVja1xyXG4gICAgY29uc3QgZm9sZGVyUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtZGVjay1pdGVtXCIgfSk7XHJcbiAgICBjb25zdCBmb2xkZXJDaGVjayA9IGZvbGRlclJvdy5jcmVhdGVFbChcImlucHV0XCIsIHsgdHlwZTogXCJjaGVja2JveFwiIH0pO1xyXG4gICAgZm9sZGVyUm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiBgQ3JlYXRlIGRlY2s6ICR7dGhpcy5mb2xkZXIubmFtZX0uLi5gIH0pO1xyXG4gICAgZm9sZGVyQ2hlY2suYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB7XHJcbiAgICAgIHRoaXMudXNlRm9sZGVyTmFtZSA9IGZvbGRlckNoZWNrLmNoZWNrZWQ7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFeGlzdGluZyBkZWNrc1xyXG4gICAgY29uc3QgZXhpc3RpbmdEZWNrcyA9IHRoaXMuZ2V0RXhpc3RpbmdEZWNrcygpO1xyXG4gICAgaWYgKGV4aXN0aW5nRGVja3MubGVuZ3RoID4gMCkge1xyXG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJPciBhZGQgdG8gZXhpc3RpbmcgZGVjazpcIiwgY2xzOiBcInNwYWNlZC1kZWNrLWVtcHR5XCIgfSk7XHJcbiAgICAgIGZvciAoY29uc3QgZGVjayBvZiBleGlzdGluZ0RlY2tzKSB7XHJcbiAgICAgICAgY29uc3Qgcm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtZGVjay1pdGVtXCIgfSk7XHJcbiAgICAgICAgY29uc3QgY2IgPSByb3cuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IHR5cGU6IFwiY2hlY2tib3hcIiB9KTtcclxuICAgICAgICByb3cuY3JlYXRlU3Bhbih7IHRleHQ6IGRlY2sgfSk7XHJcbiAgICAgICAgY2IuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB7XHJcbiAgICAgICAgICBpZiAoY2IuY2hlY2tlZCkgdGhpcy5zZWxlY3RlZERlY2tzLmFkZChkZWNrKTtcclxuICAgICAgICAgIGVsc2UgdGhpcy5zZWxlY3RlZERlY2tzLmRlbGV0ZShkZWNrKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIENvbmZpcm0gYnV0dG9uXHJcbiAgICBjb25zdCBidG5Sb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1idG4tcm93XCIgfSk7XHJcbiAgICBjb25zdCBjYW5jZWxCdG4gPSBidG5Sb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNhbmNlbFwiIH0pO1xyXG4gICAgY2FuY2VsQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNsb3NlKCkpO1xyXG5cclxuICAgIGNvbnN0IGNvbmZpcm1CdG4gPSBidG5Sb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkFkZCB0byBkZWNrXCIsIGNsczogXCJtb2QtY3RhXCIgfSk7XHJcbiAgICBjb25maXJtQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGRlY2tzVG9Bc3NpZ246IHN0cmluZ1tdID0gWy4uLnRoaXMuc2VsZWN0ZWREZWNrc107XHJcbiAgICAgIGlmICh0aGlzLnVzZUZvbGRlck5hbWUpIGRlY2tzVG9Bc3NpZ24ucHVzaCh0aGlzLmZvbGRlci5uYW1lKTtcclxuXHJcbiAgICAgIGNvbnN0IGZvbGRlckZpbGVzID0gdGhpcy5hcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpLmZpbHRlcigoZikgPT4gZi5wYXRoLnN0YXJ0c1dpdGgodGhpcy5mb2xkZXIucGF0aCArIFwiL1wiKSk7XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IGYgb2YgZm9sZGVyRmlsZXMpIHtcclxuICAgICAgICBhd2FpdCB3cml0ZUZyb250bWF0dGVyQWN0aXZlKHRoaXMuYXBwLCBmLnBhdGgsIHRydWUpO1xyXG4gICAgICAgIGlmIChkZWNrc1RvQXNzaWduLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGNvbnN0IGV4aXN0aW5nRm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmKT8uZnJvbnRtYXR0ZXI7XHJcbiAgICAgICAgICBjb25zdCBleGlzdGluZ0RlY2tzOiBzdHJpbmdbXSA9IEFycmF5LmlzQXJyYXkoZXhpc3RpbmdGbT8uZGVja3MpXHJcbiAgICAgICAgICAgID8gZXhpc3RpbmdGbS5kZWNrc1xyXG4gICAgICAgICAgICA6IGV4aXN0aW5nRm0/LmRlY2tzXHJcbiAgICAgICAgICAgICAgPyBbZXhpc3RpbmdGbS5kZWNrc11cclxuICAgICAgICAgICAgICA6IFtdO1xyXG4gICAgICAgICAgY29uc3QgbWVyZ2VkRGVja3MgPSBbLi4ubmV3IFNldChbLi4uZXhpc3RpbmdEZWNrcywgLi4uZGVja3NUb0Fzc2lnbl0pXTtcclxuICAgICAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJEZWNrcyh0aGlzLmFwcCwgZi5wYXRoLCBtZXJnZWREZWNrcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBuZXcgTm90aWNlKGBBZGRlZCAke2ZvbGRlckZpbGVzLmxlbmd0aH0gbm90ZSR7Zm9sZGVyRmlsZXMubGVuZ3RoICE9PSAxID8gXCJzXCIgOiBcIlwifSB0byBkZWNrLmApO1xyXG4gICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0RXhpc3RpbmdEZWNrcygpOiBzdHJpbmdbXSB7XHJcbiAgICBjb25zdCBkZWNrU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgdGhpcy5hcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpKSB7XHJcbiAgICAgIGNvbnN0IGZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk/LmZyb250bWF0dGVyO1xyXG4gICAgICBjb25zdCBkZWNrcyA9IGZtPy5kZWNrcztcclxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZGVja3MpKSBkZWNrcy5mb3JFYWNoKChkOiBzdHJpbmcpID0+IGRlY2tTZXQuYWRkKGQpKTtcclxuICAgICAgZWxzZSBpZiAodHlwZW9mIGRlY2tzID09PSBcInN0cmluZ1wiICYmIGRlY2tzKSBkZWNrU2V0LmFkZChkZWNrcyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gWy4uLmRlY2tTZXRdLnNvcnQoKTtcclxuICB9XHJcblxyXG4gIG9uQ2xvc2UoKSB7XHJcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gIH1cclxufVxyXG4iLCAiaW1wb3J0IHsgQXBwLCBOb3RpY2UsIHNldEljb24sIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEFjdGlvbk5vdGUsIFN5c3RlbVNlc3Npb24gfSBmcm9tIFwiLi90eXBlc1wiO1xyXG5pbXBvcnQgdHlwZSBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luIGZyb20gXCIuL21haW5cIjtcclxuaW1wb3J0IHsgc2F2ZVN0b3JlIH0gZnJvbSBcIi4vc3RvcmVcIjtcclxuaW1wb3J0IHsgQmFzZU5vdGVNb2RhbCB9IGZyb20gXCIuL0Jhc2VOb3RlTW9kYWxcIjtcclxuaW1wb3J0IHtcclxuICBzaHVmZmxlQXJyYXksXHJcbiAgZ2V0Q3VycmVudFRpbWVibG9jayxcclxuICBmaWx0ZXJCeUVuZXJneUxldmVsLFxyXG4gIGZpbHRlckJ5VGltZWJsb2NrLFxyXG4gIGZpbHRlckJ5Q29udGV4dCxcclxuICBnZXRBbGxDb250ZXh0VmFsdWVzLFxyXG4gIGlzRHVlLFxyXG4gIHRvZGF5XHJcbn0gZnJvbSBcIi4vdXRpbHNcIjtcclxuaW1wb3J0IHtcclxuICB3cml0ZUZyb250bWF0dGVyQWN0aXZlLFxyXG4gIHdyaXRlRnJvbnRtYXR0ZXJSZWN1cnJpbmdDb21wbGV0ZSxcclxuICB3cml0ZUZyb250bWF0dGVyU2tpcCxcclxuICByZWFkTm90ZVJlY29yZCxcclxufSBmcm9tIFwiLi9mcm9udG1hdHRlclwiOztcclxuaW1wb3J0IHsgU3VidGFza01vZGFsIH0gZnJvbSBcIi4vU3VidGFza01vZGFsXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgU3lzdGVtTW9kYWwgZXh0ZW5kcyBCYXNlTm90ZU1vZGFsIHtcclxuICBwcm90ZWN0ZWQgcGx1Z2luOiBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luO1xyXG4gIHByb3RlY3RlZCBub3RlITogQWN0aW9uTm90ZTtcclxuXHJcbiAgcHJpdmF0ZSBhbGxBY3Rpb25Ob3RlczogQWN0aW9uTm90ZVtdID0gW107XHJcbiAgcHJpdmF0ZSByZW1haW5pbmc6IEFjdGlvbk5vdGVbXSA9IFtdO1xyXG4gIHByaXZhdGUgcGFzc2VkOiBBY3Rpb25Ob3RlW10gPSBbXTtcclxuICBwcml2YXRlIGZhaWxlZDogQWN0aW9uTm90ZVtdID0gW107XHJcbiAgcHJpdmF0ZSBwcm9ncmVzc0xvZzogKFwicGFzc1wiIHwgXCJmYWlsXCIgfCBcInNraXBcIilbXSA9IFtdO1xyXG4gIHByaXZhdGUgY3VycmVudFJvdW5kU2l6ZSA9IDA7XHJcbiAgcHJpdmF0ZSBlbmVyZ3lMZXZlbDogXCJoaWdoXCIgfCBcImxvd1wiIHwgbnVsbCA9IG51bGw7XHJcbiAgcHJpdmF0ZSBhY3RpdmVUaW1lYmxvY2tzOiBzdHJpbmdbXSA9IFtdO1xyXG4gIHByaXZhdGUgYWN0aXZlQ29udGV4dHM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gIHByb3RlY3RlZCBzaG93UmVzdGFydEJ1dHRvbiA9IHRydWU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4pIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuICB9XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBCYXNlTm90ZU1vZGFsIGhvb2tzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuICBwcm90ZWN0ZWQgYXN5bmMgcmVuZGVyTW9kYWwoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBzYXZlZCA9IHRoaXMucGx1Z2luLmRhdGEuc3lzdGVtU2Vzc2lvbjtcclxuICAgIGlmIChzYXZlZCkge1xyXG4gICAgICBhd2FpdCB0aGlzLnJlc3VtZVNlc3Npb24oc2F2ZWQpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuZW5lcmd5TGV2ZWwgPT09IG51bGwpIHtcclxuICAgICAgdGhpcy5zaG93RW5lcmd5UGlja2VyKCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5yZW1haW5pbmcubGVuZ3RoID09PSAwICYmIHRoaXMuZmFpbGVkLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBhd2FpdCB0aGlzLnNob3dTdW1tYXJ5KHRydWUpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5yZW1haW5pbmcubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuc2hvd1N1bW1hcnkoZmFsc2UpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIHRoaXMubm90ZSA9IHRoaXMucmVtYWluaW5nWzBdO1xyXG4gICAgYXdhaXQgdGhpcy5yZW5kZXJOb3RlKGNvbnRlbnRFbCk7XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgYXN5bmMgcmVuZGVyRXh0cmFDb250ZW50KGNvbnRlbnRFbDogSFRNTEVsZW1lbnQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IHNraXBDb3VudCA9IHRoaXMubm90ZS5za2lwcGVkID8/IDA7XHJcbiAgICBpZiAoc2tpcENvdW50ID49IDIpIHtcclxuICAgICAgdGhpcy5yZW5kZXJMZWVjaEJhbm5lcihjb250ZW50RWwpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIGdldFN0YXR1c1RleHQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgJHt0aGlzLnJlbWFpbmluZy5sZW5ndGh9IHJlbWFpbmluZyBcdTAwQjcgJHt0aGlzLmZhaWxlZC5sZW5ndGh9IHRvIHJldHJ5YDtcclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCBnZXRQcm9ncmVzc1NlZ21lbnRzKCk6IHN0cmluZ1tdIHtcclxuICAgIGNvbnN0IHNlZ21lbnRzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmN1cnJlbnRSb3VuZFNpemU7IGkrKykge1xyXG4gICAgICBjb25zdCBsb2cgPSB0aGlzLnByb2dyZXNzTG9nW2ldO1xyXG4gICAgICBpZiAobG9nID09PSBcInBhc3NcIikgc2VnbWVudHMucHVzaChcInNwYWNlZC1wcm9ncmVzcy1wYXNzXCIpO1xyXG4gICAgICBlbHNlIGlmIChsb2cgPT09IFwiZmFpbFwiKSBzZWdtZW50cy5wdXNoKFwic3BhY2VkLXByb2dyZXNzLWZhaWxcIik7XHJcbiAgICAgIGVsc2UgaWYgKGxvZyA9PT0gXCJza2lwXCIpIHNlZ21lbnRzLnB1c2goXCJzcGFjZWQtcHJvZ3Jlc3Mtc2tpcFwiKTtcclxuICAgICAgZWxzZSBzZWdtZW50cy5wdXNoKFwiXCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHNlZ21lbnRzO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIHJlbmRlckJ1dHRvbnMoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG4gICAgY29uc3QgYnRuUm93ID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYnRuLXJvd1wiIH0pO1xyXG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCB7IGxhYmVsOiBcIlBhc3NcIiwgY2xzOiBcInBhc3NcIiwgY2I6ICgpID0+IHRoaXMucmVzcG9uZChcInBhc3NcIikgfSk7XHJcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHsgbGFiZWw6IFwiUmV0cnlcIiwgY2xzOiBcImZhaWxcIiwgY2I6ICgpID0+IHRoaXMucmVzcG9uZChcImZhaWxcIikgfSk7XHJcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHsgbGFiZWw6IFwiU2tpcFwiLCBjbHM6IFwic2tpcFwiLCB0b29sdGlwOiBcIlNraXAgZm9yIHRvZGF5XCIsIGNiOiAoKSA9PiB0aGlzLnNraXBOb3RlKCkgfSk7XHJcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHtcclxuICAgICAgaWNvbjogXCJzaHVmZmxlXCIsXHJcbiAgICAgIGNsczogXCJpY29uXCIsXHJcbiAgICAgIHRvb2x0aXA6IFwiU2h1ZmZsZSByZW1haW5pbmdcIixcclxuICAgICAgY2I6IGFzeW5jICgpID0+IHtcclxuICAgICAgICB0aGlzLnJlbWFpbmluZyA9IHNodWZmbGVBcnJheSh0aGlzLnJlbWFpbmluZyk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJNb2RhbCgpO1xyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHsgaWNvbjogXCJyb3V0ZVwiLCBjbHM6IFwicm91dGVcIiwgdG9vbHRpcDogXCJSb3V0ZSBcdTIxOTJcIiwgY2I6ICgpID0+IHRoaXMucm91dGVOb3RlKCkgfSk7XHJcblxyXG4gICAgLy8gXHUyNTAwXHUyNTAwIFN1YnRhc2sgYnV0dG9uIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gICAgY29uc3Qgc3VidGFza05vdGVzID0gdGhpcy5nZXRTdWJ0YXNrTm90ZXMoKTtcclxuICAgIGNvbnN0IHN1YnRhc2tCdG4gPSB0aGlzLmFkZEJ0bihidG5Sb3csIHtcclxuICAgICAgaWNvbjogXCJsaXN0LWNoZWNrc1wiLFxyXG4gICAgICBjbHM6IFwic3VidGFza3NcIixcclxuICAgICAgdG9vbHRpcDpcclxuICAgICAgICBzdWJ0YXNrTm90ZXMubGVuZ3RoID4gMFxyXG4gICAgICAgICAgPyBgT3BlbiAke3N1YnRhc2tOb3Rlcy5sZW5ndGh9IHN1YnRhc2ske3N1YnRhc2tOb3Rlcy5sZW5ndGggIT09IDEgPyBcInNcIiA6IFwiXCJ9YFxyXG4gICAgICAgICAgOiBcIk5vIHN1YnRhc2tzIGluIHRoaXMgbm90ZVwiLFxyXG4gICAgICBjYjogKCkgPT4ge1xyXG4gICAgICAgIGlmIChzdWJ0YXNrTm90ZXMubGVuZ3RoID09PSAwKSByZXR1cm47XHJcbiAgICAgICAgbmV3IFN1YnRhc2tNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIHN1YnRhc2tOb3Rlcykub3BlbigpO1xyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgICBpZiAoc3VidGFza05vdGVzLmxlbmd0aCA9PT0gMCkgc3VidGFza0J0bi5zZXREaXNhYmxlZCh0cnVlKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgc2tpcE5vdGUoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnNhdmVUaXRsZSgpO1xyXG4gICAgYXdhaXQgdGhpcy5zYXZlQm9keUVkaXRzKCk7XHJcbiAgICBjb25zdCBub3RlID0gdGhpcy5yZW1haW5pbmcuc2hpZnQoKSE7XHJcbiAgICB0aGlzLnByb2dyZXNzTG9nLnB1c2goXCJza2lwXCIpO1xyXG4gICAgYXdhaXQgd3JpdGVGcm9udG1hdHRlclNraXAodGhpcy5hcHAsIG5vdGUuZmlsZXBhdGgpO1xyXG4gICAgY29uc3QgdG9kYXlTdHIgPSB0b2RheSgpO1xyXG4gICAgY29uc3QgZW50cnkgPSB0aGlzLnBsdWdpbi5kYXRhLnN5c3RlbVNraXBwZWRUb2RheTtcclxuICAgIGlmICghZW50cnkgfHwgZW50cnkuZGF0ZSAhPT0gdG9kYXlTdHIpIHtcclxuICAgICAgdGhpcy5wbHVnaW4uZGF0YS5zeXN0ZW1Ta2lwcGVkVG9kYXkgPSB7IGRhdGU6IHRvZGF5U3RyLCBmaWxlcGF0aHM6IFtub3RlLmZpbGVwYXRoXSB9O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZW50cnkuZmlsZXBhdGhzLnB1c2gobm90ZS5maWxlcGF0aCk7XHJcbiAgICB9XHJcbiAgICBhd2FpdCBzYXZlU3RvcmUodGhpcy5wbHVnaW4sIHRoaXMucGx1Z2luLmRhdGEpO1xyXG4gICAgYXdhaXQgdGhpcy5yZW5kZXJNb2RhbCgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhcHBseUZpbHRlcnNJbmxpbmUoKTogdm9pZCB7XHJcbiAgICBjb25zdCBwcm9jZXNzZWQgPSBuZXcgU2V0KFsuLi50aGlzLnBhc3NlZC5tYXAoKG4pID0+IG4uZmlsZXBhdGgpLCAuLi50aGlzLmZhaWxlZC5tYXAoKG4pID0+IG4uZmlsZXBhdGgpXSk7XHJcblxyXG4gICAgLy8gS2VlcCBjdXJyZW50IG5vdGUgYXQgZnJvbnQgaWYgc3RpbGwgdmFsaWRcclxuICAgIGNvbnN0IGN1cnJlbnRQYXRoID0gdGhpcy5ub3RlPy5maWxlcGF0aDtcclxuICAgIHRoaXMuYnVpbGRGaWx0ZXJlZFJlbWFpbmluZyh0aGlzLmFsbEFjdGlvbk5vdGVzLCBwcm9jZXNzZWQpO1xyXG5cclxuICAgIGNvbnN0IGN1cnJlbnRTdGlsbFZhbGlkID0gdGhpcy5yZW1haW5pbmcuZmluZCgobikgPT4gbi5maWxlcGF0aCA9PT0gY3VycmVudFBhdGgpO1xyXG4gICAgaWYgKGN1cnJlbnRTdGlsbFZhbGlkKSB7XHJcbiAgICAgIHRoaXMucmVtYWluaW5nID0gW2N1cnJlbnRTdGlsbFZhbGlkLCAuLi50aGlzLnJlbWFpbmluZy5maWx0ZXIoKG4pID0+IG4uZmlsZXBhdGggIT09IGN1cnJlbnRQYXRoKV07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdG90YWwgPSB0aGlzLnJlbWFpbmluZy5sZW5ndGggKyB0aGlzLnBhc3NlZC5sZW5ndGggKyB0aGlzLmZhaWxlZC5sZW5ndGg7XHJcbiAgICB0aGlzLmN1cnJlbnRSb3VuZFNpemUgPSB0aGlzLnByb2dyZXNzTG9nLmxlbmd0aCArIHRoaXMucmVtYWluaW5nLmxlbmd0aDtcclxuICAgIHRoaXMucmVmcmVzaFByb2dyZXNzQmFyKCk7XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgcmVuZGVyRXh0cmFIZWFkZXJCdXR0b25zKGhlYWRlclJpZ2h0OiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG4gICAgLy8gXHUyNTAwXHUyNTAwIFRpbWVibG9jayBwaWNrZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgICBsZXQgdGJEcm9wZG93bjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuICAgIGNvbnN0IHRiQnRuID0gaGVhZGVyUmlnaHQuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1oZHItYnRuXCIgfSk7XHJcbiAgICBzZXRJY29uKHRiQnRuLCBcImNsb2NrXCIpO1xyXG4gICAgdGJCdG4uc2V0QXR0cmlidXRlKFxyXG4gICAgICBcImFyaWEtbGFiZWxcIixcclxuICAgICAgYFRpbWVibG9jazogJHt0aGlzLmFjdGl2ZVRpbWVibG9ja3MubGVuZ3RoID8gdGhpcy5hY3RpdmVUaW1lYmxvY2tzLmpvaW4oXCIsIFwiKSA6IFwiQWxsXCJ9YCxcclxuICAgICk7XHJcbiAgICB0YkJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICBpZiAodGJEcm9wZG93bikge1xyXG4gICAgICAgIHRiRHJvcGRvd24ucmVtb3ZlKCk7XHJcbiAgICAgICAgdGJEcm9wZG93biA9IG51bGw7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIHRiRHJvcGRvd24gPSBoZWFkZXJSaWdodC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLXRpbWVibG9jay1waWNrZXJcIiB9KTtcclxuICAgICAgZm9yIChjb25zdCBibG9jayBvZiBbXCJtb3JuaW5nXCIsIFwiYWZ0ZXJub29uXCIsIFwiZXZlbmluZ1wiLCBcIm5pZ2h0XCJdKSB7XHJcbiAgICAgICAgY29uc3Qgcm93ID0gdGJEcm9wZG93bi5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWNvbnRleHQtb3B0aW9uXCIgfSk7XHJcbiAgICAgICAgY29uc3QgY2IgPSByb3cuY3JlYXRlRWwoXCJpbnB1dFwiKTtcclxuICAgICAgICBjYi50eXBlID0gXCJjaGVja2JveFwiO1xyXG4gICAgICAgIGNiLmNoZWNrZWQgPSB0aGlzLmFjdGl2ZVRpbWVibG9ja3MuaW5jbHVkZXMoYmxvY2spO1xyXG4gICAgICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYmxvY2sgfSk7XHJcbiAgICAgICAgY2IuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB7XHJcbiAgICAgICAgICBpZiAoY2IuY2hlY2tlZCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuYWN0aXZlVGltZWJsb2Nrcy5pbmNsdWRlcyhibG9jaykpIHRoaXMuYWN0aXZlVGltZWJsb2Nrcy5wdXNoKGJsb2NrKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlVGltZWJsb2NrcyA9IHRoaXMuYWN0aXZlVGltZWJsb2Nrcy5maWx0ZXIoKGIpID0+IGIgIT09IGJsb2NrKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHZvaWQgdGhpcy5hcHBseUZpbHRlcnNJbmxpbmUoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3Qgb25PdXRzaWRlID0gKGU6IE1vdXNlRXZlbnQpID0+IHtcclxuICAgICAgICBpZiAoIXRiRHJvcGRvd24gfHwgIWRvY3VtZW50LmNvbnRhaW5zKHRiRHJvcGRvd24pKSB7XHJcbiAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG9uT3V0c2lkZSk7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghdGJEcm9wZG93bi5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKSAmJiAhdGJCdG4uY29udGFpbnMoZS50YXJnZXQgYXMgTm9kZSkpIHtcclxuICAgICAgICAgIHRiRHJvcGRvd24ucmVtb3ZlKCk7XHJcbiAgICAgICAgICB0YkRyb3Bkb3duID0gbnVsbDtcclxuICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb25PdXRzaWRlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb25PdXRzaWRlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFx1MjUwMFx1MjUwMCBDb250ZXh0IHBpY2tlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICAgIGxldCBjdHhEcm9wZG93bjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuICAgIGNvbnN0IGN0eEJ0biA9IGhlYWRlclJpZ2h0LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtaGRyLWJ0blwiIH0pO1xyXG4gICAgc2V0SWNvbihjdHhCdG4sIFwidGFnXCIpO1xyXG4gICAgY3R4QnRuLnNldEF0dHJpYnV0ZShcclxuICAgICAgXCJhcmlhLWxhYmVsXCIsXHJcbiAgICAgIGBDb250ZXh0OiAke3RoaXMuYWN0aXZlQ29udGV4dHMubGVuZ3RoID8gdGhpcy5hY3RpdmVDb250ZXh0cy5qb2luKFwiLCBcIikgOiBcIkFsbFwifWAsXHJcbiAgICApO1xyXG4gICAgY3R4QnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgIGlmIChjdHhEcm9wZG93bikge1xyXG4gICAgICAgIGN0eERyb3Bkb3duLnJlbW92ZSgpO1xyXG4gICAgICAgIGN0eERyb3Bkb3duID0gbnVsbDtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgYWxsQ29udGV4dHMgPSBnZXRBbGxDb250ZXh0VmFsdWVzKHRoaXMuYXBwKTtcclxuICAgICAgaWYgKGFsbENvbnRleHRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xyXG4gICAgICBjdHhEcm9wZG93biA9IGhlYWRlclJpZ2h0LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtY29udGV4dC1kcm9wZG93blwiIH0pO1xyXG4gICAgICBmb3IgKGNvbnN0IGN0eCBvZiBhbGxDb250ZXh0cykge1xyXG4gICAgICAgIGNvbnN0IHJvdyA9IGN0eERyb3Bkb3duLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtY29udGV4dC1vcHRpb25cIiB9KTtcclxuICAgICAgICBjb25zdCBjYiA9IHJvdy5jcmVhdGVFbChcImlucHV0XCIpO1xyXG4gICAgICAgIGNiLnR5cGUgPSBcImNoZWNrYm94XCI7XHJcbiAgICAgICAgY2IuY2hlY2tlZCA9IHRoaXMuYWN0aXZlQ29udGV4dHMuaW5jbHVkZXMoY3R4KTtcclxuICAgICAgICByb3cuY3JlYXRlU3Bhbih7IHRleHQ6IGN0eCB9KTtcclxuICAgICAgICBjYi5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcclxuICAgICAgICAgIGlmIChjYi5jaGVja2VkKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5hY3RpdmVDb250ZXh0cy5pbmNsdWRlcyhjdHgpKSB0aGlzLmFjdGl2ZUNvbnRleHRzLnB1c2goY3R4KTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlQ29udGV4dHMgPSB0aGlzLmFjdGl2ZUNvbnRleHRzLmZpbHRlcigoYykgPT4gYyAhPT0gY3R4KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHZvaWQgdGhpcy5hcHBseUZpbHRlcnNJbmxpbmUoKTsgLy8gXHUyMTkwIG5vIG9uT3V0c2lkZSBoZXJlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIG9uT3V0c2lkZSBpcyBoZXJlLCBpbiB0aGUgYnV0dG9uIGNsaWNrIGhhbmRsZXIgXHUyMDE0IG5vdCBpbnNpZGUgdGhlIGNoZWNrYm94IGhhbmRsZXJcclxuICAgICAgY29uc3Qgb25PdXRzaWRlID0gKGU6IE1vdXNlRXZlbnQpID0+IHtcclxuICAgICAgICBpZiAoIWN0eERyb3Bkb3duIHx8ICFkb2N1bWVudC5jb250YWlucyhjdHhEcm9wZG93bikpIHtcclxuICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb25PdXRzaWRlKTtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFjdHhEcm9wZG93bi5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKSAmJiAhY3R4QnRuLmNvbnRhaW5zKGUudGFyZ2V0IGFzIE5vZGUpKSB7XHJcbiAgICAgICAgICBjdHhEcm9wZG93bi5yZW1vdmUoKTtcclxuICAgICAgICAgIGN0eERyb3Bkb3duID0gbnVsbDtcclxuICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb25PdXRzaWRlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb25PdXRzaWRlKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIG9uUmVzdGFydENsaWNrKCk6IHZvaWQge1xyXG4gICAgdm9pZCB0aGlzLnJlc3RhcnRTZXNzaW9uKCk7XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgb25TZXNzaW9uQ2xvc2UoKTogdm9pZCB7XHJcbiAgICBpZiAodGhpcy5yZW1haW5pbmcubGVuZ3RoID4gMCB8fCB0aGlzLmZhaWxlZC5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHZvaWQgdGhpcy5zYXZlU2Vzc2lvbigpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIFNjcmVlbnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG4gIHByaXZhdGUgc2hvd0VuZXJneVBpY2tlcigpOiB2b2lkIHtcclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG4gICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiSG93J3MgeW91ciBlbmVyZ3k/XCIgfSk7XHJcbiAgICBjb25zdCBidG5Sb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1idG4tcm93XCIgfSk7XHJcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHtcclxuICAgICAgbGFiZWw6IFwiSGlnaCBlbmVyZ3lcIixcclxuICAgICAgY2xzOiBcImVuZXJneS1oaWdoXCIsXHJcbiAgICAgIG1vZGlmaWVyOiBcImN0YVwiLFxyXG4gICAgICBjYjogKCkgPT4ge1xyXG4gICAgICAgIHRoaXMuZW5lcmd5TGV2ZWwgPSBcImhpZ2hcIjtcclxuICAgICAgICB2b2lkIHRoaXMuc3RhcnRTZXNzaW9uKFwiaGlnaFwiKTtcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCB7XHJcbiAgICAgIGxhYmVsOiBcIkxvdyBlbmVyZ3lcIixcclxuICAgICAgY2xzOiBcImVuZXJneS1sb3dcIixcclxuICAgICAgY2I6ICgpID0+IHtcclxuICAgICAgICB0aGlzLmVuZXJneUxldmVsID0gXCJsb3dcIjtcclxuICAgICAgICB2b2lkIHRoaXMuc3RhcnRTZXNzaW9uKFwibG93XCIpO1xyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHN0YXJ0U2Vzc2lvbihsZXZlbDogXCJoaWdoXCIgfCBcImxvd1wiKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0aGlzLmVuZXJneUxldmVsID0gbGV2ZWw7XHJcbiAgICB0aGlzLmFjdGl2ZVRpbWVibG9ja3MgPSBbZ2V0Q3VycmVudFRpbWVibG9jaygpXTtcclxuICAgIHRoaXMuYWxsQWN0aW9uTm90ZXMgPSB0aGlzLmxvYWRBY3Rpb25Ob3RlcygpO1xyXG5cclxuICAgIGlmICh0aGlzLmFsbEFjdGlvbk5vdGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBuZXcgTm90aWNlKFwiTm8gYWN0aW9uIG5vdGVzIGZvdW5kIGluIHZhdWx0LlwiKTtcclxuICAgICAgdGhpcy5zaG93RW1wdHlTdGF0ZSgpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcHJvY2Vzc2VkID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgICBpZiAoIXRoaXMuYnVpbGRGaWx0ZXJlZFJlbWFpbmluZyh0aGlzLmFsbEFjdGlvbk5vdGVzLCBwcm9jZXNzZWQpKSB7XHJcbiAgICAgIG5ldyBOb3RpY2UoXCJObyBhY3Rpb25zIG1hdGNoIGN1cnJlbnQgZmlsdGVycy4gU2hvd2luZyBhbGwgYWN0aXZlIGFjdGlvbnMuXCIpO1xyXG4gICAgICB0aGlzLmFjdGl2ZVRpbWVibG9ja3MgPSBbXTtcclxuICAgICAgdGhpcy5hY3RpdmVDb250ZXh0cyA9IFtdO1xyXG4gICAgICB0aGlzLmJ1aWxkRmlsdGVyZWRSZW1haW5pbmcodGhpcy5hbGxBY3Rpb25Ob3RlcywgcHJvY2Vzc2VkKTtcclxuICAgIH1cclxuICAgIHRoaXMucGFzc2VkID0gW107XHJcbiAgICB0aGlzLmZhaWxlZCA9IFtdO1xyXG4gICAgdGhpcy5wcm9ncmVzc0xvZyA9IFtdO1xyXG4gICAgYXdhaXQgdGhpcy5yZW5kZXJNb2RhbCgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBuZXh0Um91bmQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBzb3VyY2VOb3RlcyA9IFsuLi50aGlzLmZhaWxlZF07XHJcbiAgICB0aGlzLnBhc3NlZCA9IFtdO1xyXG4gICAgdGhpcy5mYWlsZWQgPSBbXTtcclxuICAgIHRoaXMucHJvZ3Jlc3NMb2cgPSBbXTtcclxuICAgIGNvbnN0IHByb2Nlc3NlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgdGhpcy5idWlsZEZpbHRlcmVkUmVtYWluaW5nKHNvdXJjZU5vdGVzLCBwcm9jZXNzZWQpO1xyXG4gICAgYXdhaXQgdGhpcy5yZW5kZXJNb2RhbCgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyByZXN1bWVTZXNzaW9uKHNhdmVkOiBTeXN0ZW1TZXNzaW9uKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBkZWxldGUgdGhpcy5wbHVnaW4uZGF0YS5zeXN0ZW1TZXNzaW9uO1xyXG5cclxuICAgIHRoaXMuYWxsQWN0aW9uTm90ZXMgPSB0aGlzLmxvYWRBY3Rpb25Ob3RlcygpO1xyXG4gICAgdGhpcy5yZW1haW5pbmcgPSBzYXZlZC5yZW1haW5pbmdcclxuICAgICAgLm1hcCgoZnApID0+IHRoaXMuYWxsQWN0aW9uTm90ZXMuZmluZCgobikgPT4gbi5maWxlcGF0aCA9PT0gZnApKVxyXG4gICAgICAuZmlsdGVyKChuKTogbiBpcyBBY3Rpb25Ob3RlID0+IG4gIT09IHVuZGVmaW5lZCk7XHJcbiAgICB0aGlzLmZhaWxlZCA9IHNhdmVkLmZhaWxlZFxyXG4gICAgICAubWFwKChmcCkgPT4gdGhpcy5hbGxBY3Rpb25Ob3Rlcy5maW5kKChuKSA9PiBuLmZpbGVwYXRoID09PSBmcCkpXHJcbiAgICAgIC5maWx0ZXIoKG4pOiBuIGlzIEFjdGlvbk5vdGUgPT4gbiAhPT0gdW5kZWZpbmVkKTtcclxuICAgIHRoaXMucHJvZ3Jlc3NMb2cgPSBbLi4uc2F2ZWQucHJvZ3Jlc3NMb2ddO1xyXG4gICAgdGhpcy5jdXJyZW50Um91bmRTaXplID0gc2F2ZWQuY3VycmVudFJvdW5kU2l6ZTtcclxuICAgIHRoaXMuZW5lcmd5TGV2ZWwgPSBzYXZlZC5lbmVyZ3lMZXZlbDtcclxuICAgIHRoaXMuYWN0aXZlVGltZWJsb2NrcyA9IHNhdmVkLmFjdGl2ZVRpbWVibG9ja3MgPz8gW107XHJcbiAgICB0aGlzLmFjdGl2ZUNvbnRleHRzID0gWy4uLnNhdmVkLmFjdGl2ZUNvbnRleHRzXTtcclxuICAgIGF3YWl0IHRoaXMucmVuZGVyTW9kYWwoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgc2hvd1N1bW1hcnkoaXNEb25lOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0aGlzLmNsZWFudXBFZGl0b3JzKCk7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gICAgaWYgKGlzRG9uZSkge1xyXG4gICAgICBhd2FpdCB0aGlzLmNsZWFyU2Vzc2lvbigpO1xyXG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiQWxsIGRvbmUhXCIgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiUm91bmQgY29tcGxldGUhXCIgfSk7XHJcbiAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgUGFzc2VkOiAke3RoaXMucGFzc2VkLmxlbmd0aH1gIH0pO1xyXG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYEZhaWxlZDogJHt0aGlzLmZhaWxlZC5sZW5ndGh9YCB9KTtcclxuICAgIH1cclxuICAgIGNvbnN0IGJ0blJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWJ0bi1yb3dcIiB9KTtcclxuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywge1xyXG4gICAgICBsYWJlbDogaXNEb25lID8gXCJSZXN0YXJ0IHNlc3Npb25cIiA6IFwiTmV4dCByb3VuZFwiLFxyXG4gICAgICBjbHM6IFwic3VtbWFyeS1hY3Rpb25cIixcclxuICAgICAgbW9kaWZpZXI6IFwiY3RhXCIsXHJcbiAgICAgIGNiOiAoKSA9PiAoaXNEb25lID8gdm9pZCB0aGlzLnJlc3RhcnRTZXNzaW9uKCkgOiB2b2lkIHRoaXMubmV4dFJvdW5kKCkpLFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHsgbGFiZWw6IFwiQ2xvc2VcIiwgY2xzOiBcInN1bW1hcnktY2xvc2VcIiwgY2I6ICgpID0+IHRoaXMuY2xvc2UoKSB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgcmVzdGFydFNlc3Npb24oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmNsZWFyU2Vzc2lvbigpO1xyXG4gICAgdGhpcy5lbmVyZ3lMZXZlbCA9IG51bGw7XHJcbiAgICB0aGlzLnJlbWFpbmluZyA9IFtdO1xyXG4gICAgdGhpcy5wYXNzZWQgPSBbXTtcclxuICAgIHRoaXMuZmFpbGVkID0gW107XHJcbiAgICB0aGlzLnByb2dyZXNzTG9nID0gW107XHJcbiAgICB0aGlzLmN1cnJlbnRSb3VuZFNpemUgPSAwO1xyXG4gICAgYXdhaXQgdGhpcy5yZW5kZXJNb2RhbCgpO1xyXG4gIH1cclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIE5vdGUgcmVzcG9uc2UgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgcHJpdmF0ZSBhc3luYyByZXNwb25kKHJlc3VsdDogXCJwYXNzXCIgfCBcImZhaWxcIik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5zYXZlVGl0bGUoKTtcclxuICAgIGF3YWl0IHRoaXMuc2F2ZUJvZHlFZGl0cygpO1xyXG4gICAgY29uc3Qgbm90ZSA9IHRoaXMucmVtYWluaW5nLnNoaWZ0KCkhO1xyXG4gICAgdGhpcy5wcm9ncmVzc0xvZy5wdXNoKHJlc3VsdCk7XHJcbiAgICBpZiAocmVzdWx0ID09PSBcInBhc3NcIikge1xyXG4gICAgICB0aGlzLnBhc3NlZC5wdXNoKG5vdGUpO1xyXG4gICAgICBpZiAobm90ZS50aW1lc2NvcGUpIHtcclxuICAgICAgICBhd2FpdCB3cml0ZUZyb250bWF0dGVyUmVjdXJyaW5nQ29tcGxldGUodGhpcy5hcHAsIG5vdGUuZmlsZXBhdGgpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmZhaWxlZC5wdXNoKG5vdGUpO1xyXG4gICAgfVxyXG4gICAgYXdhaXQgdGhpcy5yZW5kZXJNb2RhbCgpO1xyXG4gIH1cclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIFNraXBwZWQgdHJhY2tpbmcgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG4gIHByaXZhdGUgcmVuZGVyTGVlY2hCYW5uZXIoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG4gICAgY29uc3QgY291bnQgPSB0aGlzLm5vdGUuc2tpcHBlZCA/PyAwO1xyXG4gICAgY29uc3QgYmFubmVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtbGVlY2gtYmFubmVyXCIgfSk7XHJcbiAgICBiYW5uZXIuY3JlYXRlU3Bhbih7IHRleHQ6IGBcdTI2QTBcdUZFMEYgU2tpcHBlZCAke2NvdW50fVx1MDBENyBcdTIwMTQgY29uc2lkZXIgcmVzY2hlZHVsaW5nIG9yIGJyZWFraW5nIHRoaXMgZG93bi5gIH0pO1xyXG5cclxuICAgIGNvbnN0IGFjdGlvbnMgPSBiYW5uZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1sZWVjaC1hY3Rpb25zXCIgfSk7XHJcbiAgICB0aGlzLmFkZEJ0bihhY3Rpb25zLCB7XHJcbiAgICAgIGxhYmVsOiBcIkVkaXRcIixcclxuICAgICAgY2xzOiBcImxlZWNoLWVkaXRcIixcclxuICAgICAgY2I6IGFzeW5jICgpID0+IHtcclxuICAgICAgICB0aGlzLmlzRWRpdGluZyA9IHRydWU7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJNb2RhbCgpO1xyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmFkZEJ0bihhY3Rpb25zLCB7XHJcbiAgICAgIGxhYmVsOiBcIldyb25nIGNvbnRleHQ/XCIsXHJcbiAgICAgIGNsczogXCJsZWVjaC1jb250ZXh0XCIsXHJcbiAgICAgIGNiOiAoKSA9PiB7XHJcbiAgICAgICAgbmV3IE5vdGljZShcIlVzZSB0aGUgY2xvY2sgb3IgdGFnIGJ1dHRvbnMgaW4gdGhlIGhlYWRlciB0byBhZGp1c3QgeW91ciB0aW1lYmxvY2sgb3IgY29udGV4dCBmaWx0ZXJzLlwiKTtcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgdGhpcy5hZGRCdG4oYWN0aW9ucywge1xyXG4gICAgICBsYWJlbDogXCJEZWFjdGl2YXRlXCIsXHJcbiAgICAgIGNsczogXCJsZWVjaC1kZWFjdGl2YXRlXCIsXHJcbiAgICAgIGNiOiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5yZW1haW5pbmcuc2hpZnQoKTtcclxuICAgICAgICB0aGlzLm5vdGUgPSB7IC4uLnRoaXMubm90ZSwgYWN0aXZlOiBmYWxzZSB9O1xyXG4gICAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJBY3RpdmUodGhpcy5hcHAsIHRoaXMubm90ZS5maWxlcGF0aCwgZmFsc2UpO1xyXG4gICAgICAgIGF3YWl0IHRoaXMucmVuZGVyTW9kYWwoKTtcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZXRTa2lwcGVkVG9kYXkoKTogU2V0PHN0cmluZz4ge1xyXG4gICAgY29uc3QgZW50cnkgPSB0aGlzLnBsdWdpbi5kYXRhLnN5c3RlbVNraXBwZWRUb2RheTtcclxuICAgIGlmICghZW50cnkgfHwgZW50cnkuZGF0ZSAhPT0gdG9kYXkoKSkgcmV0dXJuIG5ldyBTZXQoKTtcclxuICAgIHJldHVybiBuZXcgU2V0KGVudHJ5LmZpbGVwYXRocyk7XHJcbiAgfVxyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgTm90ZSBkaXNjb3ZlcnkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG4gIHByaXZhdGUgbG9hZEFjdGlvbk5vdGVzKCk6IEFjdGlvbk5vdGVbXSB7XHJcbiAgICBjb25zdCBza2lwcGVkVG9kYXkgPSB0aGlzLmdldFNraXBwZWRUb2RheSgpO1xyXG4gICAgY29uc3Qgbm90ZXM6IEFjdGlvbk5vdGVbXSA9IFtdO1xyXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKSkge1xyXG4gICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcclxuICAgICAgaWYgKGZtPy5hY3RpdmUgIT09IHRydWUpIGNvbnRpbnVlO1xyXG4gICAgICBpZiAoIWZtLmVuZXJneSAmJiAhZm0udGltZWJsb2NrICYmICFmbS50aW1lc2NvcGUpIGNvbnRpbnVlOyAvLyBvdmVyZmxvdyBndWFyZFxyXG4gICAgICBpZiAoZm0udGltZXNjb3BlICYmICFpc0R1ZShmbSkpIGNvbnRpbnVlOyAvLyByZWN1cnJlbmNlIGdhdGVcclxuICAgICAgaWYgKHNraXBwZWRUb2RheS5oYXMoZmlsZS5wYXRoKSkgY29udGludWU7IC8vIHNraXBwZWQgdG9kYXlcclxuICAgICAgbm90ZXMucHVzaCh7XHJcbiAgICAgICAgZmlsZXBhdGg6IGZpbGUucGF0aCxcclxuICAgICAgICBhY3RpdmU6IHRydWUsXHJcbiAgICAgICAgZW5lcmd5OiBmbS5lbmVyZ3ksXHJcbiAgICAgICAgdGltZWJsb2NrOiBmbS50aW1lYmxvY2ssXHJcbiAgICAgICAgZHVlOiBmbS5kdWUsXHJcbiAgICAgICAgY29udGV4dDogZm0uY29udGV4dCxcclxuICAgICAgICB0aW1lc2NvcGU6IGZtLnRpbWVzY29wZSxcclxuICAgICAgICBsYXN0X2NvbXBsZXRlZDogZm0ubGFzdF9jb21wbGV0ZWQsXHJcbiAgICAgICAgc2tpcHBlZDogZm0uc2tpcHBlZCxcclxuICAgICAgfSBhcyBBY3Rpb25Ob3RlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBub3RlcztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2hvd0VtcHR5U3RhdGUoKTogdm9pZCB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIk5vIGFjdGlvbiBub3RlcyBmb3VuZCBpbiB2YXVsdFwiIH0pO1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7XHJcbiAgICAgIHRleHQ6IFwiQWRkIG5vdGVzIHdpdGggYWN0aXZlOiB0cnVlIGFuZCBhdCBsZWFzdCBvbmUgb2YgZW5lcmd5LCB0aW1lYmxvY2ssIG9yIHRpbWVzY29wZSB0byB1c2UgdGhlIFN5c3RlbSBtb2RhbC5cIixcclxuICAgICAgY2xzOiBcInNwYWNlZC1lbXB0eS1kZXNjXCIsXHJcbiAgICB9KTtcclxuICAgIGNvbnN0IGJ0blJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWJ0bi1yb3dcIiB9KTtcclxuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgeyBsYWJlbDogXCJDbG9zZVwiLCBjbHM6IFwiY2xvc2VcIiwgY2I6ICgpID0+IHRoaXMuY2xvc2UoKSB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IFNFU1NJT05fU0laRSA9IDIwO1xyXG4gIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IERVRV9TTE9UUyA9IDEwO1xyXG5cclxuICBwcml2YXRlIGJ1aWxkRmlsdGVyZWRSZW1haW5pbmcoc291cmNlTm90ZXM6IEFjdGlvbk5vdGVbXSwgcHJvY2Vzc2VkOiBTZXQ8c3RyaW5nPik6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgYnlFbmVyZ3kgPSB0aGlzLmVuZXJneUxldmVsID8gZmlsdGVyQnlFbmVyZ3lMZXZlbChzb3VyY2VOb3RlcywgdGhpcy5lbmVyZ3lMZXZlbCkgOiBzb3VyY2VOb3RlcztcclxuICAgIGNvbnN0IGJ5VGltZWJsb2NrID0gZmlsdGVyQnlUaW1lYmxvY2soYnlFbmVyZ3ksIHRoaXMuYWN0aXZlVGltZWJsb2Nrcyk7XHJcbiAgICBjb25zdCBieUNvbnRleHQgPSBmaWx0ZXJCeUNvbnRleHQoYnlUaW1lYmxvY2ssIHRoaXMuYWN0aXZlQ29udGV4dHMpO1xyXG4gICAgY29uc3QgdW5wcm9jZXNzZWQgPSBieUNvbnRleHQuZmlsdGVyKChuKSA9PiAhcHJvY2Vzc2VkLmhhcyhuLmZpbGVwYXRoKSk7XHJcblxyXG4gICAgY29uc3Qgd2l0aER1ZSA9IHVucHJvY2Vzc2VkXHJcbiAgICAgIC5maWx0ZXIoKG4pID0+ICEhbi5kdWUpXHJcbiAgICAgIC5zb3J0KChhLCBiKSA9PiBuZXcgRGF0ZShhLmR1ZSEpLmdldFRpbWUoKSAtIG5ldyBEYXRlKGIuZHVlISkuZ2V0VGltZSgpKTtcclxuICAgIGNvbnN0IG5vRHVlQWxsID0gdW5wcm9jZXNzZWQuZmlsdGVyKChuKSA9PiAhbi5kdWUpO1xyXG4gICAgY29uc3Qgc2tpcHBlZEJlZm9yZSA9IG5vRHVlQWxsXHJcbiAgICAgIC5maWx0ZXIoKG4pID0+IChuLnNraXBwZWQgPz8gMCkgPiAwKVxyXG4gICAgICAuc29ydCgoYSwgYikgPT4gKGIuc2tpcHBlZCA/PyAwKSAtIChhLnNraXBwZWQgPz8gMCkpOyAvLyBtb3N0LXNraXBwZWQgZmlyc3RcclxuICAgIGNvbnN0IG5ldmVyU2tpcHBlZCA9IHNodWZmbGVBcnJheShub0R1ZUFsbC5maWx0ZXIoKG4pID0+ICEobi5za2lwcGVkID8/IDApKSk7XHJcbiAgICBjb25zdCB3aXRob3V0RHVlID0gWy4uLnNraXBwZWRCZWZvcmUsIC4uLm5ldmVyU2tpcHBlZF07XHJcblxyXG4gICAgY29uc3QgZHVlU2xpY2UgPSB3aXRoRHVlLnNsaWNlKDAsIFN5c3RlbU1vZGFsLkRVRV9TTE9UUyk7XHJcbiAgICBjb25zdCBub0R1ZVNsaWNlID0gd2l0aG91dER1ZS5zbGljZSgwLCBTeXN0ZW1Nb2RhbC5TRVNTSU9OX1NJWkUgLSBkdWVTbGljZS5sZW5ndGgpO1xyXG5cclxuICAgIHRoaXMucmVtYWluaW5nID0gWy4uLmR1ZVNsaWNlLCAuLi5ub0R1ZVNsaWNlXTtcclxuICAgIHRoaXMuY3VycmVudFJvdW5kU2l6ZSA9IHRoaXMucmVtYWluaW5nLmxlbmd0aDtcclxuICAgIHJldHVybiB0aGlzLnJlbWFpbmluZy5sZW5ndGggPiAwO1xyXG4gIH1cclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIFNlc3Npb24gcGVyc2lzdGVuY2UgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG4gIHByaXZhdGUgYXN5bmMgY2xlYXJTZXNzaW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgZGVsZXRlIHRoaXMucGx1Z2luLmRhdGEuc3lzdGVtU2Vzc2lvbjtcclxuICAgIGF3YWl0IHNhdmVTdG9yZSh0aGlzLnBsdWdpbiwgdGhpcy5wbHVnaW4uZGF0YSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHNhdmVTZXNzaW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdGhpcy5wbHVnaW4uZGF0YS5zeXN0ZW1TZXNzaW9uID0ge1xyXG4gICAgICByZW1haW5pbmc6IHRoaXMucmVtYWluaW5nLm1hcCgobikgPT4gbi5maWxlcGF0aCksXHJcbiAgICAgIGZhaWxlZDogdGhpcy5mYWlsZWQubWFwKChuKSA9PiBuLmZpbGVwYXRoKSxcclxuICAgICAgcHJvZ3Jlc3NMb2c6IFsuLi50aGlzLnByb2dyZXNzTG9nXSxcclxuICAgICAgY3VycmVudFJvdW5kU2l6ZTogdGhpcy5jdXJyZW50Um91bmRTaXplLFxyXG4gICAgICBlbmVyZ3lMZXZlbDogdGhpcy5lbmVyZ3lMZXZlbCxcclxuICAgICAgYWN0aXZlVGltZWJsb2NrczogdGhpcy5hY3RpdmVUaW1lYmxvY2tzLFxyXG4gICAgICBhY3RpdmVDb250ZXh0czogWy4uLnRoaXMuYWN0aXZlQ29udGV4dHNdLFxyXG4gICAgfTtcclxuICAgIGF3YWl0IHNhdmVTdG9yZSh0aGlzLnBsdWdpbiwgdGhpcy5wbHVnaW4uZGF0YSk7XHJcbiAgfVxyXG4gIC8vIFN1YnRhc2sgTW9kYWxcclxuICBwcml2YXRlIGdldFN1YnRhc2tOb3RlcygpOiBOb3RlUmVjb3JkW10ge1xyXG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLm5vdGUuZmlsZXBhdGgpIGFzIFRGaWxlIHwgbnVsbDtcclxuICAgIGlmICghZmlsZSkgcmV0dXJuIFtdO1xyXG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcclxuICAgIGlmICghY2FjaGUpIHJldHVybiBbXTtcclxuXHJcbiAgICAvLyBGaW5kIGxpbmVzIHRoYXQgYXJlIHRhc2sgbGlzdCBpdGVtc1xyXG4gICAgY29uc3QgdGFza0xpbmVzID0gbmV3IFNldChcclxuICAgICAgKGNhY2hlLmxpc3RJdGVtcyA/PyBbXSlcclxuICAgICAgICAuZmlsdGVyKChpdGVtKSA9PiBpdGVtLnRhc2sgIT09IHVuZGVmaW5lZCkgLy8gdGFzayBpdGVtcyBvbmx5IChub3QgcGxhaW4gbGlzdCBpdGVtcylcclxuICAgICAgICAubWFwKChpdGVtKSA9PiBpdGVtLnBvc2l0aW9uLnN0YXJ0LmxpbmUpLFxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBub3RlczogTm90ZVJlY29yZFtdID0gW107XHJcbiAgICBmb3IgKGNvbnN0IGxpbmsgb2YgY2FjaGUubGlua3MgPz8gW10pIHtcclxuICAgICAgLy8gT25seSBpbmNsdWRlIGxpbmtzIHRoYXQgYXBwZWFyIG9uIGEgdGFzayBsaXN0IGxpbmVcclxuICAgICAgaWYgKCF0YXNrTGluZXMuaGFzKGxpbmsucG9zaXRpb24uc3RhcnQubGluZSkpIGNvbnRpbnVlO1xyXG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGxpbmsubGluaywgdGhpcy5ub3RlLmZpbGVwYXRoKTtcclxuICAgICAgaWYgKCF0YXJnZXQgfHwgISh0YXJnZXQgaW5zdGFuY2VvZiBURmlsZSkpIGNvbnRpbnVlO1xyXG4gICAgICBub3Rlcy5wdXNoKFxyXG4gICAgICAgIHJlYWROb3RlUmVjb3JkKHRoaXMucGx1Z2luLCB0YXJnZXQpLFxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5vdGVzO1xyXG4gIH1cclxufVxyXG5cclxuIiwgImltcG9ydCB7IEFwcCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBOb3RlUmVjb3JkIH0gZnJvbSBcIi4vdHlwZXNcIjtcclxuaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XHJcbmltcG9ydCB7IEFjdGl2ZU1vZGFsIH0gZnJvbSBcIi4vQWN0aXZlTW9kYWxcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTdWJ0YXNrTW9kYWwgZXh0ZW5kcyBBY3RpdmVNb2RhbCB7XHJcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiwgbm90ZXM6IE5vdGVSZWNvcmRbXSkge1xyXG4gICAgc3VwZXIoYXBwLCBwbHVnaW4sIG5vdGVzLCBcIl9fc3VidGFza19fXCIpO1xyXG4gIH1cclxuXHJcbiAgLy8gTm8gc2Vzc2lvbiBwZXJzaXN0ZW5jZSBcdTIwMTQgdGhpcyBtb2RhbCBpcyBlcGhlbWVyYWxcclxuICBwcm90ZWN0ZWQgb25TZXNzaW9uQ2xvc2UoKTogdm9pZCB7fVxyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsb0JBQXFEOzs7QUNHckQsSUFBTSxhQUF5QixFQUFFLGVBQWUsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxFQUFFO0FBRXRFLGVBQXNCLFVBQVUsUUFBcUM7QUFMckU7QUFNRSxRQUFNLFFBQVEsTUFBTSxP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LEVBQ1QsTUFBTTtBQUFBLEVBQ04sVUFBVTtBQUFBLEVBQ1YsVUFBVTtBQUFBLEVBQ1YsZUFBZTtBQUFBLEVBQ2YsVUFBVTtBQUFBLEVBQ1YsV0FBVztBQUFBLEVBQ1gsVUFBVTtBQUFBLEVBQ1YsV0FBVztBQUFBLEVBQ1gsYUFBYTtBQUFBLEVBQ2IsZ0JBQWdCO0FBQUEsRUFDaEIsWUFBWTtBQUFBLEVBQ1osWUFBWTtBQUFBLEVBQ1osU0FBUztBQUFBLEVBQ1QsWUFBWTtBQUFBLEVBQ1osY0FBYztBQUFBLEVBQ2QsZUFBZTtBQUFBLEVBQ2YsZUFBZTtBQUFBLEVBQ2YsZUFBZTtBQUFBLEVBQ2YsZUFBZTtBQUFBLEVBQ2YsWUFBWTtBQUFBLEVBQ1osVUFBVTtBQUFBLEVBQ1YsYUFBYTtBQUFBLEVBQ2IsU0FBUztBQUFBLEVBQ1QsU0FBUztBQUFBLEVBQ1QsWUFBWTtBQUFBLEVBQ1osV0FBVztBQUFBLEVBQ1gsYUFBYTtBQUFBLEVBQ2IsYUFBYTtBQUFBLEVBQ2IsU0FBUztBQUFBLEVBQ1QsV0FBVztBQUFBLEVBQ1gsWUFBWTtBQUFBLEVBQ1osTUFBTTtBQUFBLEVBQ04sV0FBVztBQUFBLEVBQ1gsTUFBTTtBQUFBLEVBQ04sT0FBTztBQUFBLEVBQ1AsYUFBYTtBQUFBLEVBQ2IsTUFBTTtBQUFBLEVBQ04sVUFBVTtBQUFBLEVBQ1YsU0FBUztBQUFBLEVBQ1QsV0FBVztBQUFBLEVBQ1gsUUFBUTtBQUFBLEVBQ1IsT0FBTztBQUFBLEVBQ1AsT0FBTztBQUFBLEVBQ1AsVUFBVTtBQUFBLEVBQ1YsZUFBZTtBQUFBLEVBQ2YsV0FBVztBQUFBLEVBQ1gsY0FBYztBQUFBLEVBQ2QsV0FBVztBQUFBLEVBQ1gsWUFBWTtBQUFBLEVBQ1osV0FBVztBQUFBLEVBQ1gsc0JBQXNCO0FBQUEsRUFDdEIsV0FBVztBQUFBLEVBQ1gsWUFBWTtBQUFBLEVBQ1osV0FBVztBQUFBLEVBQ1gsV0FBVztBQUFBLEVBQ1gsYUFBYTtBQUFBLEVBQ2IsZUFBZTtBQUFBLEVBQ2YsY0FBYztBQUFBLEVBQ2QsZ0JBQWdCO0FBQUEsRUFDaEIsZ0JBQWdCO0FBQUEsRUFDaEIsZ0JBQWdCO0FBQUEsRUFDaEIsYUFBYTtBQUFBLEVBQ2IsTUFBTTtBQUFBLEVBQ04sV0FBVztBQUFBLEVBQ1gsT0FBTztBQUFBLEVBQ1AsU0FBUztBQUFBLEVBQ1QsUUFBUTtBQUFBLEVBQ1Isa0JBQWtCO0FBQUEsRUFDbEIsWUFBWTtBQUFBLEVBQ1osY0FBYztBQUFBLEVBQ2QsY0FBYztBQUFBLEVBQ2QsZ0JBQWdCO0FBQUEsRUFDaEIsaUJBQWlCO0FBQUEsRUFDakIsbUJBQW1CO0FBQUEsRUFDbkIsaUJBQWlCO0FBQUEsRUFDakIsaUJBQWlCO0FBQUEsRUFDakIsY0FBYztBQUFBLEVBQ2QsV0FBVztBQUFBLEVBQ1gsV0FBVztBQUFBLEVBQ1gsVUFBVTtBQUFBLEVBQ1YsYUFBYTtBQUFBLEVBQ2IsTUFBTTtBQUFBLEVBQ04sU0FBUztBQUFBLEVBQ1QsT0FBTztBQUFBLEVBQ1AsV0FBVztBQUFBLEVBQ1gsUUFBUTtBQUFBLEVBQ1IsV0FBVztBQUFBLEVBQ1gsUUFBUTtBQUFBLEVBQ1IsZUFBZTtBQUFBLEVBQ2YsV0FBVztBQUFBLEVBQ1gsZUFBZTtBQUFBLEVBQ2YsZUFBZTtBQUFBLEVBQ2YsWUFBWTtBQUFBLEVBQ1osV0FBVztBQUFBLEVBQ1gsTUFBTTtBQUFBLEVBQ04sTUFBTTtBQUFBLEVBQ04sTUFBTTtBQUFBLEVBQ04sWUFBWTtBQUFBLEVBQ1osUUFBUTtBQUFBLEVBQ1IsZUFBZTtBQUFBLEVBQ2YsS0FBSztBQUFBLEVBQ0wsV0FBVztBQUFBLEVBQ1gsV0FBVztBQUFBLEVBQ1gsYUFBYTtBQUFBLEVBQ2IsUUFBUTtBQUFBLEVBQ1IsWUFBWTtBQUFBLEVBQ1osVUFBVTtBQUFBLEVBQ1YsVUFBVTtBQUFBLEVBQ1YsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsU0FBUztBQUFBLEVBQ1QsV0FBVztBQUFBLEVBQ1gsV0FBVztBQUFBLEVBQ1gsV0FBVztBQUFBLEVBQ1gsTUFBTTtBQUFBLEVBQ04sYUFBYTtBQUFBLEVBQ2IsV0FBVztBQUFBLEVBQ1gsS0FBSztBQUFBLEVBQ0wsTUFBTTtBQUFBLEVBQ04sU0FBUztBQUFBLEVBQ1QsUUFBUTtBQUFBLEVBQ1IsV0FBVztBQUFBLEVBQ1gsUUFBUTtBQUFBLEVBQ1IsT0FBTztBQUFBLEVBQ1AsT0FBTztBQUFBLEVBQ1AsWUFBWTtBQUFBLEVBQ1osUUFBUTtBQUFBLEVBQ1IsYUFBYTtBQUNmO0FBRUEsZUFBTyxPQUFPLE9BQU87QUFBQSxFQUNuQixLQUFLLFVBQVU7QUFDYixXQUFPLE9BQU8sT0FBTyxJQUFJLEtBQUssZUFBYSxNQUFNLFFBQVE7QUFBQSxFQUMzRDtBQUFBLEVBQ0EsY0FBYztBQUNaLFdBQU8sS0FBSyxJQUFJLEVBQUUsWUFBWTtBQUFBLEVBQ2hDO0FBQUEsRUFDQSxLQUFLO0FBQUE7QUFBQSxFQUNMLFdBQVc7QUFBQSxFQUNYLFlBQVk7QUFBQSxFQUNaLFdBQVc7QUFBQSxFQUNYLFdBQVc7QUFBQSxFQUNYLFVBQVU7QUFDWixDQUFDO0FBRUQsU0FBUyxrQkFBa0I7QUFDekIsU0FBTyxLQUFLLElBQUksRUFBRSxVQUFVO0FBQzlCO0FBRUEsU0FBUyxtQkFBbUI7QUFDMUIsU0FBTyxLQUFLLElBQUksRUFBRSxXQUFXO0FBQy9CO0FBRUEsU0FBUyxrQkFBa0I7QUFDekIsU0FBTyxXQUFXLElBQUksRUFBRSxVQUFVO0FBQ3BDO0FBRUEsU0FBUyxrQkFBa0I7QUFDekIsU0FBTyxLQUFLLElBQUksRUFBRSxVQUFVO0FBQzlCO0FBRWUsU0FBUixNQUF1QkMsU0FBUTtBQUNwQyxNQUFJLEdBQUc7QUFDUCxFQUFBQSxXQUFVQSxVQUFTLElBQUksS0FBSyxFQUFFLFlBQVk7QUFDMUMsVUFBUSxJQUFJLE1BQU0sS0FBS0EsT0FBTSxNQUFNLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFDdEYsTUFBTSxJQUFJLElBQUksSUFBSyxLQUFLLElBQUksS0FBUSxLQUFLLElBQUksS0FBUSxLQUFLLElBQUksS0FBUSxJQUFJLE1BQVMsSUFBSSxPQUFRLElBQU0sSUFBSSxJQUFNLENBQUMsSUFDaEgsTUFBTSxJQUFJLEtBQUssS0FBSyxLQUFLLEtBQU0sS0FBSyxLQUFLLEtBQU0sS0FBSyxJQUFJLE1BQU8sSUFBSSxPQUFRLEdBQUksSUFDL0UsTUFBTSxJQUFJLEtBQU0sS0FBSyxLQUFLLEtBQVEsS0FBSyxJQUFJLEtBQVEsS0FBSyxJQUFJLEtBQVEsS0FBSyxJQUFJLEtBQVEsS0FBSyxJQUFJLEtBQVEsSUFBSSxPQUFVLElBQUksT0FBUSxJQUFNLElBQUksTUFBUSxHQUFJLElBQ3RKLFNBQ0MsSUFBSSxhQUFhLEtBQUtBLE9BQU0sS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUM1RCxJQUFJLGFBQWEsS0FBS0EsT0FBTSxLQUFLLElBQUksSUFBSSxFQUFFLENBQUMsSUFBSSxNQUFNLEtBQUssRUFBRSxDQUFDLElBQUksTUFBTSxLQUFLLEVBQUUsQ0FBQyxJQUFJLE1BQU0sS0FBSyxDQUFDLEtBQ2hHLElBQUksY0FBYyxLQUFLQSxPQUFNLEtBQUssS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUM3RCxJQUFJLGNBQWMsS0FBS0EsT0FBTSxLQUFLLEtBQUssRUFBRSxDQUFDLElBQUksTUFBTSxLQUFLLEVBQUUsQ0FBQyxJQUFJLE1BQU0sS0FBSyxFQUFFLENBQUMsSUFBSSxNQUFNLEtBQUssRUFBRSxDQUFDLENBQUMsS0FDakcsSUFBSSxhQUFhLEtBQUtBLE9BQU0sS0FBSyxLQUFLLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQ3JFLElBQUksY0FBYyxLQUFLQSxPQUFNLEtBQUssS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMs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LElBQ0wsS0FBSztBQUFBLEVBQ1A7QUFFQSxNQUFJLGFBQWE7QUFBQSxJQUNmLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxFQUNQO0FBRUEsTUFBSSxTQUFTO0FBQUEsSUFDWCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFL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RyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFVBQVU7QUFDOUM7QUFFQSxTQUFTLHNCQUFzQixHQUFHLFFBQVEsR0FBRztBQUMzQyxNQUFJLElBQUksU0FBUyxLQUFLLE9BQU8sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQzVDLFNBQU8sS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFVBQVU7QUFDOUM7QUFFQSxTQUFTLG1CQUFtQixHQUFHLFFBQVEsR0FBRztBQUN4QyxNQUFJLElBQUksU0FBUyxLQUFLLE9BQU8sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQzVDLFNBQU8sS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFVBQVU7QUFDOUM7QUFFQSxTQUFTLHNCQUFzQixHQUFHLFFBQVEsR0FBRztBQUMzQyxNQUFJLElBQUksU0FBUyxLQUFLLE9BQU8sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQzVDLFNBQU8sS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFVBQVU7QUFDOUM7QUFFQSxTQUFTLGNBQWMsR0FBRyxRQUFRLEdBQUc7QUFDbkMsTUFBSSxJQUFJLFNBQVMsS0FBSyxPQUFPLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQztBQUM1QyxTQUFPLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxVQUFVO0FBQzlDO0FBRUEsU0FBUyxVQUFVLEdBQUcsUUFBUSxHQUFHO0FBQy9CLE1BQUksSUFBSSxTQUFTLEtBQUssT0FBTyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDNUMsU0FBTyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxPQUFPLE1BQU8sSUFBSSxFQUFFLENBQUMsRUFBRSxVQUFVO0FBQzNFO0FBRUEsU0FBUyxV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SUFBSSxFQUFFLEdBQ3BCLEtBQUtELEtBQUksSUFDVCxLQUFLQyxLQUFJLElBQ1QsS0FBSyxJQUFJLEtBQ1QsS0FBSyxNQUFNLEtBQUssS0FBSyxLQUFLO0FBRzlCLFFBQUksS0FBSyxRQUFRLE1BQU07QUFDckIsV0FBSyxXQUFXLEVBQUUsSUFBSSxFQUFFO0FBQUEsSUFDMUIsV0FHUyxLQUFLLElBQUksS0FBSyxNQUFNLEVBQUUsSUFBSSxXQUFXLEtBQUssSUFBSSxLQUFLLE1BQU0sRUFBRSxJQUFJLFNBQVM7QUFDL0UsV0FBSyxXQUFXLEVBQUUsSUFBSSxFQUFFO0FBQUEsSUFDMUI7QUFHQSxRQUFJLENBQUMsRUFBRztBQUdSLFFBQUksS0FBSyxFQUFHLE1BQUssS0FBSyxNQUFNO0FBRzVCLFFBQUksS0FBSyxZQUFZO0FBQ25CLFdBQUssV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSUQsS0FBSSxFQUFFLElBQUlDLEtBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLEtBQUssTUFBTSxFQUFFLElBQUksS0FBSyxNQUFNLEVBQUU7QUFBQSxJQUM1RyxXQUdTLEtBQUssU0FBUztBQUNyQixXQUFLLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxJQUFJLEVBQUUsSUFBSSxLQUFLLE1BQU1ELEtBQUksSUFBSSxLQUFLLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxNQUFNQyxLQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztBQUFBLElBQ3JIO0FBQUEsRUFDRjtBQUFBLEVBQ0EsS0FBS0QsSUFBR0MsSUFBRyxHQUFHLEdBQUc7QUFDZixTQUFLLFdBQVcsS0FBSyxNQUFNLEtBQUssTUFBTSxDQUFDRCxFQUFDLElBQUksS0FBSyxNQUFNLEtBQUssTUFBTSxDQUFDQyxFQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFBQSxFQUM1RjtBQUFBLEVBQ0EsV0FBVztBQUNULFdBQU8sS0FB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QUFLLENBQUM7QUFBQSxJQUNqRTtBQUNBLGNBQVUsV0FBVyxJQUFJO0FBQUEsRUFDM0I7QUFBQSxFQUVBLE1BQU0sbUJBQW1CO0FBQ3ZCLGVBQVcsUUFBUSxLQUFLLElBQUksVUFBVSxnQkFBZ0IsZUFBZSxHQUFHO0FBQ3RFLFVBQUksS0FBSyxnQkFBZ0IsV0FBVztBQUNsQyxjQUFNLEtBQUssS0FBSyxPQUFPO0FBQUEsTUFDekI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBTSxZQUFZO0FBQ2hCLFNBQUssT0FBTyxFQUFFLGVBQWUsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxFQUFFO0FBQ25ELFVBQU0sVUFBVSxNQUFNLEtBQUssSUFBSTtBQUMvQixTQUFLLGdCQUFnQjtBQUNyQixVQUFNLEtBQUssb0JBQW9CO0FBQy9CLFVBQU0sS0FBSyxpQkFBaUI7QUFDNUIsUUFBSSx5QkFBTyxxQ0FBcUM7QUFBQSxFQUNsRDtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgIndlaWdodHMiLCAiZm0iLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAiZmlsdGVyIiwgInBhdGgiLCAicm9vdCIsICJmbSIsICJfYSIsICJfYiIsICJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAieCIsICJ4IiwgImtleSIsICJ0aWNrcyIsICJyYW5nZSIsICJyYW5nZSIsICJyYW5nZSIsICJmb3JtYXQiLCAidDEiLCAieCIsICJ5IiwgInkiLCAieSIsICJjb2xvciIsICJyZ2IiLCAieCIsICJ4IiwgInplcm8iLCAiaSIsICJ4IiwgIm51bWJlciIsICJ4IiwgIngiLCAicmFuZ2UiLCAiaSIsICJ5IiwgIm51bWJlciIsICJ4IiwgIngiLCAieCIsICJ4IiwgIngiLCAieCIsICJsb2NhbGUiLCAiemVybyIsICJmb3JtYXQiLCAiZm9ybWF0UHJlZml4IiwgInZhbHVlIiwgImxpbmVhciIsICJkYXRlIiwgInJhbmdlIiwgImRhdGUiLCAiZGF0ZSIsICJkYXRlIiwgImRhdGUiLCAiZGF0ZSIsICJkYXRlIiwgImRhdGUiLCAiZGF0ZSIsICJ0aWNrcyIsICJzdGVwIiwgImRhdGUiLCAieSIsICJsb2NhbGUiLCAiZm9ybWF0cyIsICJwYWQiLCAiZm9ybWF0IiwgImxvY2FsZSIsICJkZWZhdWx0TG9jYWxlIiwgIm51bWJlciIsICJ0aWNrcyIsICJzZWNvbmQiLCAiZm9ybWF0IiwgImZvcm1hdFllYXIiLCAidGlja0Zvcm1hdCIsICJkYXRlIiwgInkiLCAiY29uc3RhbnRfZGVmYXVsdCIsICJ4IiwgIngiLCAieSIsICJ4IiwgIngiLCAieSIsICJ4IiwgInkiLCAiY29uc3RhbnRfZGVmYXVsdCIsICJwYXRoIiwgImNvbnN0YW50X2RlZmF1bHQiLCAicGF0aCIsICJkb2N1bWVudCIsICJ4IiwgImRhdHVtIiwgImNvbnN0YW50X2RlZmF1bHQiLCAieCIsICJjb25zdGFudF9kZWZhdWx0IiwgInNlbGVjdGlvbiIsICJhc2NlbmRpbmciLCAic2VsZWN0X2RlZmF1bHQiLCAibGluZWFyIiwgInNlbGVjdF9kZWZhdWx0IiwgImRhdGUiLCAiX2EiLCAic2xpY2UiLCAiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgIl9iIiwgImUiLCAiaW1wb3J0X29ic2lkaWFuIiwgImV4aXN0aW5nRGVja3MiLCAiaW1wb3J0X29ic2lkaWFuIl0KfQo=
