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
  initialInterval: 3,
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
  async renderMarkdownBody(body) {
    var _a;
    if (!this.renderedContainer) return;
    this.renderedContainer.empty();
    (_a = this.renderComponent) == null ? void 0 : _a.unload();
    this.renderComponent = new import_obsidian4.Component();
    this.renderComponent.load();
    await import_obsidian4.MarkdownRenderer.render(this.app, body, this.renderedContainer, this.note.filepath, this.renderComponent);
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
      var _a2, _b2, _c, _d;
      if (this.isEditing) {
        await this.saveTitle();
        await this.saveBodyEdits();
        this.isEditing = false;
        (_a2 = this.footerEl) == null ? void 0 : _a2.removeClass("spaced-footer-disabled");
        this.titleEl.contentEditable = "false";
        if (this.editorContainer) this.editorContainer.style.display = "none";
        if (this.renderedContainer) {
          this.renderedContainer.style.display = "";
          const updatedFile = this.app.vault.getAbstractFileByPath(this.note.filepath);
          if (updatedFile) {
            const updatedRaw = await this.app.vault.read(updatedFile);
            const { body: updatedBody } = stripFrontmatter(updatedRaw);
            await this.renderMarkdownBody(updatedBody);
          }
        }
        (_b2 = this.metadataEditor) == null ? void 0 : _b2.containerEl.style.removeProperty("display");
        setTimeout(() => this.applyIconicPropertyIcons(), 0);
        (0, import_obsidian4.setIcon)(editBtn, "pencil");
        editBtn.setAttribute("aria-label", "Switch to edit view");
      } else {
        this.isEditing = true;
        (_c = this.footerEl) == null ? void 0 : _c.addClass("spaced-footer-disabled");
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
        (_d = this.metadataEditor) == null ? void 0 : _d.containerEl.style.setProperty("display", "none");
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
    var _a, _b, _c, _d;
    if (!((_a = this.metadataEditor) == null ? void 0 : _a.containerEl)) return;
    const iconic = (_c = (_b = this.app.plugins) == null ? void 0 : _b.plugins) == null ? void 0 : _c["iconic"];
    if (typeof ((_d = iconic == null ? void 0 : iconic.propertyIconManager) == null ? void 0 : _d.refreshIconsInContainer) === "function") {
      iconic.propertyIconManager.refreshIconsInContainer(this.metadataEditor.containerEl);
    }
  }
  async refreshContent() {
    if (this.isEditing || !this.renderedContainer) return;
    if (this.renderedContainer.contains(document.activeElement)) return;
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath);
    if (!file) return;
    const raw = await this.app.vault.read(file);
    const { body } = stripFrontmatter(raw);
    await this.renderMarkdownBody(body);
  }
  async saveBodyEdits() {
    if (!this.isEditing || !this.cm6EditMode) return;
    const newBody = getCM6Content(this.cm6EditMode);
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
  cleanupEditors() {
    var _a, _b;
    if (this.cm6Leaf) {
      destroyCM6Editor(this.cm6Leaf);
      this.cm6Leaf = null;
      this.cm6EditMode = null;
    }
    (_a = this.renderComponent) == null ? void 0 : _a.unload();
    this.renderComponent = null;
    (_b = this.metadataEditor) == null ? void 0 : _b.unload();
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
    await this.renderMarkdownBody(body);
    this.editorContainer = contentEl.createDiv({ cls: "spaced-tiptap-container" });
    const { leaf, editMode } = await createCM6Editor(this.editorContainer, file, this.app);
    this.cm6Leaf = leaf;
    this.cm6EditMode = editMode;
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
      const maxMult = this.plugin.settings.defaultEaseFactor / 100;
      const mult = t <= 0.5 ? 0.5 + 0.5 * (t * 2) : 1 + (maxMult - 1) * ((t - 0.5) * 2);
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
          reactions[i].intervalMult = parseFloat(
            (tFull <= 0.5 ? 0.5 + 0.5 * (tFull * 2) : 1 + (maxMult - 1) * ((tFull - 0.5) * 2)).toFixed(2)
          );
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL3N0b3JlLnRzIiwgInNyYy9SZXZpZXdNb2RhbC50cyIsICJzcmMvdHlwZXMudHMiLCAic3JjL3V0aWxzLnRzIiwgInNyYy9zY2hlZHVsZXIudHMiLCAic3JjL2Zyb250bWF0dGVyLnRzIiwgInNyYy9CYXNlTm90ZU1vZGFsLnRzIiwgInNyYy9Sb3V0ZUZvbGRlck1vZGFsLnRzIiwgInNyYy9RdWlja05vdGVNb2RhbC50cyIsICJzcmMvZGVja0Ryb3Bkb3duLnRzIiwgInNyYy9jbTYtZWRpdG9yLnRzIiwgInNyYy9NYWtlQWN0aW9uYWJsZU1vZGFsLnRzIiwgInNyYy9TZXR0aW5nc1RhYi50cyIsICJzcmMvRHVlTm90ZXNWaWV3LnRzIiwgInNyYy9TdGF0c1ZpZXcudHMiLCAibm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9hc2NlbmRpbmcuanMiLCAibm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9kZXNjZW5kaW5nLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1hcnJheS9zcmMvYmlzZWN0b3IuanMiLCAibm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9udW1iZXIuanMiLCAibm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy9iaXNlY3QuanMiLCAibm9kZV9tb2R1bGVzL2ludGVybm1hcC9zcmMvaW5kZXguanMiLCAibm9kZV9tb2R1bGVzL2QzLWFycmF5L3NyYy90aWNrcy5qcyIsICJub2RlX21vZHVsZXMvZDMtYXJyYXkvc3JjL3JhbmdlLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvaW5pdC5qcyIsICJub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL29yZGluYWwuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy9iYW5kLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvZGVmaW5lLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1jb2xvci9zcmMvY29sb3IuanMiLCAibm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9iYXNpcy5qcyIsICJub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL2Jhc2lzQ2xvc2VkLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvY29uc3RhbnQuanMiLCAibm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9jb2xvci5qcyIsICJub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL3JnYi5qcyIsICJub2RlX21vZHVsZXMvZDMtaW50ZXJwb2xhdGUvc3JjL251bWJlckFycmF5LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvYXJyYXkuanMiLCAibm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9kYXRlLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvbnVtYmVyLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvb2JqZWN0LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvc3RyaW5nLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1pbnRlcnBvbGF0ZS9zcmMvdmFsdWUuanMiLCAibm9kZV9tb2R1bGVzL2QzLWludGVycG9sYXRlL3NyYy9yb3VuZC5qcyIsICJub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL2NvbnN0YW50LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvbnVtYmVyLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvY29udGludW91cy5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXREZWNpbWFsLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2V4cG9uZW50LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdEdyb3VwLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdE51bWVyYWxzLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdFNwZWNpZmllci5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXRUcmltLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1mb3JtYXQvc3JjL2Zvcm1hdFByZWZpeEF1dG8uanMiLCAibm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZm9ybWF0Um91bmRlZC5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9mb3JtYXRUeXBlcy5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9pZGVudGl0eS5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9sb2NhbGUuanMiLCAibm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvZGVmYXVsdExvY2FsZS5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9wcmVjaXNpb25GaXhlZC5qcyIsICJub2RlX21vZHVsZXMvZDMtZm9ybWF0L3NyYy9wcmVjaXNpb25QcmVmaXguanMiLCAibm9kZV9tb2R1bGVzL2QzLWZvcm1hdC9zcmMvcHJlY2lzaW9uUm91bmQuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNjYWxlL3NyYy90aWNrRm9ybWF0LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvbGluZWFyLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zY2FsZS9zcmMvbmljZS5qcyIsICJub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvaW50ZXJ2YWwuanMiLCAibm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL21pbGxpc2Vjb25kLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9kdXJhdGlvbi5qcyIsICJub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvc2Vjb25kLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy10aW1lL3NyYy9taW51dGUuanMiLCAibm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL2hvdXIuanMiLCAibm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL2RheS5qcyIsICJub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvd2Vlay5qcyIsICJub2RlX21vZHVsZXMvZDMtdGltZS9zcmMvbW9udGguanMiLCAibm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3llYXIuanMiLCAibm9kZV9tb2R1bGVzL2QzLXRpbWUvc3JjL3RpY2tzLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy10aW1lLWZvcm1hdC9zcmMvbG9jYWxlLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy10aW1lLWZvcm1hdC9zcmMvZGVmYXVsdExvY2FsZS5qcyIsICJub2RlX21vZHVsZXMvZDMtc2NhbGUvc3JjL3RpbWUuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNoYXBlL3NyYy9jb25zdGFudC5qcyIsICJub2RlX21vZHVsZXMvZDMtcGF0aC9zcmMvcGF0aC5qcyIsICJub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL3BhdGguanMiLCAibm9kZV9tb2R1bGVzL2QzLXNoYXBlL3NyYy9hcnJheS5qcyIsICJub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL2N1cnZlL2xpbmVhci5qcyIsICJub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL3BvaW50LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zaGFwZS9zcmMvbGluZS5qcyIsICJub2RlX21vZHVsZXMvZDMtc2hhcGUvc3JjL2FyZWEuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbmFtZXNwYWNlcy5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9uYW1lc3BhY2UuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvY3JlYXRvci5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rvci5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc2VsZWN0LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL2FycmF5LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdG9yQWxsLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9zZWxlY3RBbGwuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvbWF0Y2hlci5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc2VsZWN0Q2hpbGQuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NlbGVjdENoaWxkcmVuLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9maWx0ZXIuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NwYXJzZS5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vZW50ZXIuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvY29uc3RhbnQuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2RhdGEuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2V4aXQuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2pvaW4uanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL21lcmdlLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9vcmRlci5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc29ydC5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vY2FsbC5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbm9kZXMuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL25vZGUuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3NpemUuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2VtcHR5LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9lYWNoLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9hdHRyLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3dpbmRvdy5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vc3R5bGUuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL3Byb3BlcnR5LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9jbGFzc2VkLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi90ZXh0LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9odG1sLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9yYWlzZS5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vbG93ZXIuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2FwcGVuZC5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaW5zZXJ0LmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9yZW1vdmUuanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2Nsb25lLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9kYXR1bS5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vb24uanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0aW9uL2Rpc3BhdGNoLmpzIiwgIm5vZGVfbW9kdWxlcy9kMy1zZWxlY3Rpb24vc3JjL3NlbGVjdGlvbi9pdGVyYXRvci5qcyIsICJub2RlX21vZHVsZXMvZDMtc2VsZWN0aW9uL3NyYy9zZWxlY3Rpb24vaW5kZXguanMiLCAibm9kZV9tb2R1bGVzL2QzLXNlbGVjdGlvbi9zcmMvc2VsZWN0LmpzIiwgInNyYy9EZWNrUGlja2VyTW9kYWwudHMiLCAic3JjL0FjdGl2ZU1vZGFsLnRzIiwgInNyYy9Gb2xkZXJEZWNrUGlja2VyTW9kYWwudHMiLCAic3JjL1N5c3RlbU1vZGFsLnRzIiwgInNyYy9TdWJ0YXNrTW9kYWwudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IFBsdWdpbiwgVEZpbGUsIFRGb2xkZXIsIE1lbnUsIE5vdGljZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBsb2FkU3RvcmUsIHNhdmVTdG9yZSB9IGZyb20gXCIuL3N0b3JlXCI7XHJcbmltcG9ydCB7IFJldmlld01vZGFsIH0gZnJvbSBcIi4vUmV2aWV3TW9kYWxcIjtcclxuaW1wb3J0IHsgU3BhY2VkRXZlcnl0aGluZ1NldHRpbmdzVGFiIH0gZnJvbSBcIi4vU2V0dGluZ3NUYWJcIjtcclxuaW1wb3J0IHsgRHVlTm90ZXNWaWV3LCBEVUVfTk9URVNfVklFV19UWVBFIH0gZnJvbSBcIi4vRHVlTm90ZXNWaWV3XCI7XHJcbmltcG9ydCB7IFN0YXRzVmlldywgU1RBVFNfVklFV19UWVBFIH0gZnJvbSBcIi4vU3RhdHNWaWV3XCI7XHJcbmltcG9ydCB7IERlY2tQaWNrZXJNb2RhbCB9IGZyb20gXCIuL0RlY2tQaWNrZXJNb2RhbFwiO1xyXG5pbXBvcnQgeyBGb2xkZXJEZWNrUGlja2VyTW9kYWwgfSBmcm9tIFwiLi9Gb2xkZXJEZWNrUGlja2VyTW9kYWxcIjtcclxuaW1wb3J0IHsgU3BhY2VkRXZlcnl0aGluZ1NldHRpbmdzLCBERUZBVUxUX1NFVFRJTkdTLCBQbHVnaW5EYXRhLCBOb3RlUmVjb3JkIH0gZnJvbSBcIi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgZ2V0Tm90ZXNGcm9tVmF1bHQsIHdyaXRlRnJvbnRtYXR0ZXJBY3RpdmUsIG1pZ3JhdGVTZVRvU3RvcmUgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiOyAgXHJcbmltcG9ydCB7IHBpY2tOb3RlVG9SZXZpZXcsIG5vdGVJc0R1ZSB9IGZyb20gXCIuL3NjaGVkdWxlclwiO1xyXG5pbXBvcnQgeyB0b2RheSB9IGZyb20gXCIuL3V0aWxzXCI7XHJcbmltcG9ydCB7IFN5c3RlbU1vZGFsIH0gZnJvbSBcIi4vU3lzdGVtTW9kYWxcIjtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xyXG4gIHNldHRpbmdzOiBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3M7XHJcbiAgZGF0YTogUGx1Z2luRGF0YTtcclxuXHJcbiAgcHJpdmF0ZSBzdGF0dXNCYXJJdGVtOiBIVE1MRWxlbWVudDtcclxuXHJcbiAgYXN5bmMgb25sb2FkKCkge1xyXG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcclxuICAgIHRoaXMuZGF0YSA9IGF3YWl0IGxvYWRTdG9yZSh0aGlzKTtcclxuXHJcbiAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub25MYXlvdXRSZWFkeShhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IG1pZ3JhdGVTZVRvU3RvcmUodGhpcyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcbiAgICAgIHRoaXMuYXBwLnZhdWx0Lm9uKFwicmVuYW1lXCIsIChmaWxlLCBvbGRQYXRoKSA9PiB7XHJcbiAgICAgICAgaWYgKCEoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSB8fCBmaWxlLmV4dGVuc2lvbiAhPT0gXCJtZFwiKSByZXR1cm47XHJcbiAgICAgICAgaWYgKHRoaXMuZGF0YS5ub3RlUmVjb3Jkcz8uW29sZFBhdGhdKSB7XHJcbiAgICAgICAgICB0aGlzLmRhdGEubm90ZVJlY29yZHNbZmlsZS5wYXRoXSA9IHRoaXMuZGF0YS5ub3RlUmVjb3Jkc1tvbGRQYXRoXTtcclxuICAgICAgICAgIGRlbGV0ZSB0aGlzLmRhdGEubm90ZVJlY29yZHNbb2xkUGF0aF07XHJcbiAgICAgICAgICB2b2lkIHNhdmVTdG9yZSh0aGlzLCB0aGlzLmRhdGEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSksXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuc3RhdHVzQmFySXRlbSA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpO1xyXG4gICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcclxuXHJcbiAgICB0aGlzLnJlZ2lzdGVyVmlldyhEVUVfTk9URVNfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IER1ZU5vdGVzVmlldyhsZWFmLCB0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5hZGRSaWJib25JY29uKFwiY2xvY2tcIiwgXCJTaG93IGR1ZSBub3Rlc1wiLCAoKSA9PiB0aGlzLmFjdGl2YXRlRHVlTm90ZXNWaWV3KCkpO1xyXG5cclxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgIGlkOiBcInN0YXJ0LXN5c3RlbS1yZXZpZXdcIixcclxuICAgICAgbmFtZTogXCJTdGFydCBzeXN0ZW0gcmV2aWV3XCIsXHJcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgbmV3IFN5c3RlbU1vZGFsKHRoaXMuYXBwLCB0aGlzKS5vcGVuKCk7XHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6IFwic2hvdy1kdWUtbm90ZXNcIixcclxuICAgICAgbmFtZTogXCJTaG93IGR1ZSBub3Rlc1wiLFxyXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5hY3RpdmF0ZUR1ZU5vdGVzVmlldygpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3NUYWIodGhpcy5hcHAsIHRoaXMpKTtcclxuXHJcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICBpZDogXCJyZXZpZXctbmV4dC1ub3RlXCIsXHJcbiAgICAgIG5hbWU6IFwiUmV2aWV3IG5leHQgbm90ZVwiLFxyXG4gICAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGRlbGV0ZSB0aGlzLmRhdGEuc3JzU2Vzc2lvbjtcclxuICAgICAgICBjb25zdCBub3RlcyA9IGdldE5vdGVzRnJvbVZhdWx0KHRoaXMpLmZpbHRlcigobikgPT4gbi5pbnRlcnZhbCA+PSAwKTtcclxuICAgICAgICBjb25zdCBkdWVDb3VudCA9IG5vdGVzLmZpbHRlcigobikgPT4gbm90ZUlzRHVlKG4pKS5sZW5ndGg7XHJcbiAgICAgICAgdGhpcy5kYXRhLnJldmlld0xvYWRMb2cucHVzaCh7IHRpbWVzdGFtcDogdG9kYXkoKSwgbnVtTm90ZXM6IG5vdGVzLmxlbmd0aCwgbnVtRHVlOiBkdWVDb3VudCB9KTtcclxuICAgICAgICBhd2FpdCBzYXZlU3RvcmUodGhpcywgdGhpcy5kYXRhKTtcclxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0Jhcihub3Rlcyk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoRHVlTm90ZXNWaWV3KCk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoU3RhdHNWaWV3KCk7XHJcbiAgICAgICAgY29uc3Qgbm90ZSA9IHBpY2tOb3RlVG9SZXZpZXcobm90ZXMsIHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgICAgIGlmICghbm90ZSkge1xyXG4gICAgICAgICAgbmV3IE5vdGljZShcIk5vIG5vdGVzIGR1ZSFcIik7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG5ldyBSZXZpZXdNb2RhbCh0aGlzLmFwcCwgdGhpcywgbm90ZSkub3BlbigpO1xyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6IFwiY29udGludWUtcmV2aWV3XCIsXHJcbiAgICAgIG5hbWU6IFwiQ29udGludWUgcmV2aWV3IHNlc3Npb25cIixcclxuICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcclxuICAgICAgICBjb25zdCBzYXZlZCA9IHRoaXMuZGF0YS5zcnNTZXNzaW9uO1xyXG4gICAgICAgIGlmICghc2F2ZWQgfHwgc2F2ZWQucmV2aWV3ZWRGaWxlcGF0aHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICBuZXcgTm90aWNlKFwiTm8gc2F2ZWQgc2Vzc2lvbiBmb3VuZC4gVXNlICdSZXZpZXcgbmV4dCBub3RlJyB0byBzdGFydCBvbmUuXCIpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBhbGxOb3RlcyA9IGdldE5vdGVzRnJvbVZhdWx0KHRoaXMpLmZpbHRlcigobikgPT4gbi5pbnRlcnZhbCA+PSAwKTtcclxuICAgICAgICBjb25zdCByZW1haW5pbmcgPSBhbGxOb3Rlcy5maWx0ZXIoKG4pID0+IG5vdGVJc0R1ZShuKSAmJiAhc2F2ZWQucmV2aWV3ZWRGaWxlcGF0aHMuaW5jbHVkZXMobi5maWxlcGF0aCkpO1xyXG4gICAgICAgIGlmIChyZW1haW5pbmcubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICBuZXcgTm90aWNlKFwiU2Vzc2lvbiBjb21wbGV0ZSBcdTIwMTQgbm8gbm90ZXMgcmVtYWluaW5nLlwiKTtcclxuICAgICAgICAgIGRlbGV0ZSB0aGlzLmRhdGEuc3JzU2Vzc2lvbjtcclxuICAgICAgICAgIGF3YWl0IHNhdmVTdG9yZSh0aGlzLCB0aGlzLmRhdGEpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBub3RlID0gcGlja05vdGVUb1JldmlldyhyZW1haW5pbmcsIHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgICAgIGlmICghbm90ZSkgcmV0dXJuO1xyXG4gICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IFJldmlld01vZGFsKHRoaXMuYXBwLCB0aGlzLCBub3RlKTtcclxuICAgICAgICBtb2RhbC5yZXN1bWVTZXNzaW9uKHNhdmVkKTtcclxuICAgICAgICBtb2RhbC5vcGVuKCk7XHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICBpZDogXCJzdGFydC1hY3RpdmUtcmV2aWV3XCIsXHJcbiAgICAgIG5hbWU6IFwiU3RhcnQgYWN0aXZlIGRlY2sgcmV2aWV3XCIsXHJcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB7XHJcbiAgICAgICAgbmV3IERlY2tQaWNrZXJNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpO1xyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6IFwic2hvdy1zdGF0c1wiLFxyXG4gICAgICBuYW1lOiBcIlNob3cgc3RhdHNcIixcclxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVTdGF0c1ZpZXcoKSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgIGlkOiBcInN5bmMtdmF1bHRcIixcclxuICAgICAgbmFtZTogXCJSZWZyZXNoIHNjaGVkdWxlIHZpZXdzXCIsXHJcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hEdWVOb3Rlc1ZpZXcoKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hTdGF0c1ZpZXcoKTtcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbGUgZXhwbG9yZXIgY29udGV4dCBtZW51XHJcbiAgICB0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcbiAgICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbihcImZpbGUtbWVudVwiLCAobWVudTogTWVudSwgZmlsZSkgPT4ge1xyXG4gICAgICAgIC8vIFNpbmdsZSBub3RlXHJcbiAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURmlsZSAmJiBmaWxlLmV4dGVuc2lvbiA9PT0gXCJtZFwiKSB7XHJcbiAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcj8uYWN0aXZlID09PSB0cnVlO1xyXG4gICAgICAgICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PlxyXG4gICAgICAgICAgICBpdGVtXHJcbiAgICAgICAgICAgICAgLnNldFRpdGxlKGlzQWN0aXZlID8gXCJSZW1vdmUgZnJvbSBhY3RpdmUgZGVja1wiIDogXCJBZGQgdG8gYWN0aXZlIGRlY2tcIilcclxuICAgICAgICAgICAgICAuc2V0SWNvbihpc0FjdGl2ZSA/IFwic3F1YXJlXCIgOiBcImNoZWNrLXNxdWFyZVwiKVxyXG4gICAgICAgICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJBY3RpdmUodGhpcy5hcHAsIGZpbGUucGF0aCwgIWlzQWN0aXZlKTtcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBGb2xkZXIgXHUyMDE0IGFkZCBhbGwgbm90ZXMgaW5zaWRlXHJcbiAgICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBURm9sZGVyKSB7XHJcbiAgICAgICAgICBtZW51LmFkZEl0ZW0oKGl0ZW0pID0+XHJcbiAgICAgICAgICAgIGl0ZW1cclxuICAgICAgICAgICAgICAuc2V0VGl0bGUoXCJBZGQgZm9sZGVyIHRvIGRlY2suLi5cIilcclxuICAgICAgICAgICAgICAuc2V0SWNvbihcImxheWVyc1wiKVxyXG4gICAgICAgICAgICAgIC5vbkNsaWNrKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIG5ldyBGb2xkZXJEZWNrUGlja2VyTW9kYWwodGhpcy5hcHAsIGZpbGUsIHRoaXMpLm9wZW4oKTtcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KSxcclxuICAgICk7XHJcblxyXG4gICAgLyogSXRlcmF0ZSBhbGwgbWFya2Rvd24gZmlsZXMgaW4gdGhlIHZhdWx0XHJcbkZvciBlYWNoIGZpbGUsIHJlYWQgZnJvbnRtYXR0ZXIuZGVja3MgZnJvbSBtZXRhZGF0YUNhY2hlXHJcbkNoZWNrIGlmIGl0J3MgYW4gYXJyYXkgd2l0aCBhbnkgZHVwbGljYXRlcyAoaS5lLiwgbmV3IFNldChkZWNrcykuc2l6ZSA8IGRlY2tzLmxlbmd0aClcclxuSWYgc28sIGNhbGwgd3JpdGVGcm9udG1hdHRlckRlY2tzKHRoaXMuYXBwLCBmaWxlLnBhdGgsIFsuLi5uZXcgU2V0KGRlY2tzKV0pXHJcblNob3cgYSBOb3RpY2UgcmVwb3J0aW5nIGhvdyBtYW55IGZpbGVzIHdlcmUgZml4ZWRcclxuXHJcbmh0dHBzOi8vZGVlcHdpa2kuY29tL3NlYXJjaC9zb21ldGltZXMtaS1oYXZlLWEtcHJvYmxlbS13aGVfYjk1N2FlYzQtYzhmNi00YTA3LWE5ZWEtNWI0Yzg0ZTdiMzIwXHJcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xyXG4gICAgICBpZDogXCJjaGVjay1kZWNrLWR1cGVzXCIsXHJcbiAgICAgIG5hbWU6IFwiQ2hlY2sgZGVjayBkdXBsaWNhdGVzXCIsXHJcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgIGl0ZXJhdGUgYWxsIG1hcmtkb3duIGZpbGVzIGluIHZhdWx0IFxyXG4gICAgICAgIGNvbnN0IEZpbGVzID0gdGhpcy5hcHAudmF1bHRcclxuICAgICAgICAgIC5nZXRNYXJrZG93bkZpbGVzKClcclxuICAgICAgICBcclxuICAgICAgfSxcclxuICAgIH0pOyovXHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6IFwiY2xlYXItYWN0aXZlLWRlY2tcIixcclxuICAgICAgbmFtZTogXCJDbGVhciBhY3RpdmUgZGVjayAodW5jaGVjayBhbGwgbm90ZXMpXCIsXHJcbiAgICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgYWN0aXZlRmlsZXMgPSB0aGlzLmFwcC52YXVsdFxyXG4gICAgICAgICAgLmdldE1hcmtkb3duRmlsZXMoKVxyXG4gICAgICAgICAgLmZpbHRlcigoZikgPT4gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZik/LmZyb250bWF0dGVyPy5hY3RpdmUgPT09IHRydWUpO1xyXG5cclxuICAgICAgICBpZiAoIWFjdGl2ZUZpbGVzLmxlbmd0aCkge1xyXG4gICAgICAgICAgbmV3IE5vdGljZShcIk5vIG5vdGVzIGluIHRoZSBhY3RpdmUgZGVjay5cIik7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgYWN0aXZlRmlsZXMpIHtcclxuICAgICAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJBY3RpdmUodGhpcy5hcHAsIGZpbGUucGF0aCwgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBuZXcgTm90aWNlKGBDbGVhcmVkICR7YWN0aXZlRmlsZXMubGVuZ3RofSBub3RlJHthY3RpdmVGaWxlcy5sZW5ndGggIT09IDEgPyBcInNcIiA6IFwiXCJ9IGZyb20gdGhlIGFjdGl2ZSBkZWNrLmApO1xyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5yZWdpc3RlclZpZXcoU1RBVFNfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IFN0YXRzVmlldyhsZWFmLCB0aGlzKSk7XHJcbiAgICB0aGlzLmFkZFJpYmJvbkljb24oXCJiYXItY2hhcnRcIiwgXCJTaG93IHN0YXRzXCIsICgpID0+IHRoaXMuYWN0aXZhdGVTdGF0c1ZpZXcoKSk7XHJcbiAgfVxyXG5cclxuICBvbnVubG9hZCgpIHt9XHJcblxyXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcclxuICAgIGNvbnN0IHNhdmVkID0gYXdhaXQgdGhpcy5sb2FkRGF0YSgpO1xyXG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIHNhdmVkPy5zZXR0aW5ncyA/PyB7fSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7XHJcbiAgICBjb25zdCBjdXJyZW50ID0gKGF3YWl0IHRoaXMubG9hZERhdGEoKSkgPz8ge307XHJcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHsgLi4uY3VycmVudCwgc2V0dGluZ3M6IHRoaXMuc2V0dGluZ3MgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVTdGF0dXNCYXIocHJlY29tcHV0ZWQ/OiBOb3RlUmVjb3JkW10pIHtcclxuICAgIGNvbnN0IGFsbE5vdGVzID0gcHJlY29tcHV0ZWQgPz8gZ2V0Tm90ZXNGcm9tVmF1bHQodGhpcykuZmlsdGVyKChuKSA9PiBuLmludGVydmFsID49IDApO1xyXG4gICAgY29uc3QgZHVlQ291bnQgPSBhbGxOb3Rlcy5maWx0ZXIoKG4pID0+IG5vdGVJc0R1ZShuKSkubGVuZ3RoO1xyXG4gICAgdGhpcy5zdGF0dXNCYXJJdGVtLnNldFRleHQoYCR7ZHVlQ291bnR9IGR1ZWApO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgYWN0aXZhdGVEdWVOb3Rlc1ZpZXcoKSB7XHJcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XHJcbiAgICBsZXQgbGVhZiA9IHdvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoRFVFX05PVEVTX1ZJRVdfVFlQRSlbMF07XHJcbiAgICBpZiAoIWxlYWYpIHtcclxuICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpITtcclxuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBEVUVfTk9URVNfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSk7XHJcbiAgICB9XHJcbiAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHJlZnJlc2hEdWVOb3Rlc1ZpZXcoKSB7XHJcbiAgICBmb3IgKGNvbnN0IGxlYWYgb2YgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShEVUVfTk9URVNfVklFV19UWVBFKSkge1xyXG4gICAgICBpZiAobGVhZi52aWV3IGluc3RhbmNlb2YgRHVlTm90ZXNWaWV3KSB7XHJcbiAgICAgICAgYXdhaXQgbGVhZi52aWV3LnJlbmRlcigpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhc3luYyBhY3RpdmF0ZVN0YXRzVmlldygpIHtcclxuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcclxuICAgIGxldCBsZWFmID0gd29ya3NwYWNlLmdldExlYXZlc09mVHlwZShTVEFUU19WSUVXX1RZUEUpWzBdO1xyXG4gICAgaWYgKCFsZWFmKSB7XHJcbiAgICAgIGxlYWYgPSB3b3Jrc3BhY2UuZ2V0UmlnaHRMZWFmKGZhbHNlKSE7XHJcbiAgICAgIGF3YWl0IGxlYWYuc2V0Vmlld1N0YXRlKHsgdHlwZTogU1RBVFNfVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSk7XHJcbiAgICB9XHJcbiAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIHJlZnJlc2hTdGF0c1ZpZXcoKSB7XHJcbiAgICBmb3IgKGNvbnN0IGxlYWYgb2YgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShTVEFUU19WSUVXX1RZUEUpKSB7XHJcbiAgICAgIGlmIChsZWFmLnZpZXcgaW5zdGFuY2VvZiBTdGF0c1ZpZXcpIHtcclxuICAgICAgICBhd2FpdCBsZWFmLnZpZXcucmVuZGVyKCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIHJlc2V0RGF0YSgpIHtcclxuICAgIHRoaXMuZGF0YSA9IHsgcmV2aWV3TG9hZExvZzogW10sIHJldmlld0hpc3Rvcnk6IFtdIH07XHJcbiAgICBhd2FpdCBzYXZlU3RvcmUodGhpcywgdGhpcy5kYXRhKTtcclxuICAgIHRoaXMudXBkYXRlU3RhdHVzQmFyKCk7XHJcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hEdWVOb3Rlc1ZpZXcoKTtcclxuICAgIGF3YWl0IHRoaXMucmVmcmVzaFN0YXRzVmlldygpO1xyXG4gICAgbmV3IE5vdGljZShcIkFsbCBzY2hlZHVsaW5nIGRhdGEgaGFzIGJlZW4gcmVzZXQuXCIpO1xyXG4gIH1cclxufVxyXG4iLCAiaW1wb3J0IHsgUGx1Z2luIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFBsdWdpbkRhdGEgfSBmcm9tIFwiLi90eXBlc1wiO1xyXG5cclxuY29uc3QgRU1QVFlfREFUQTogUGx1Z2luRGF0YSA9IHsgcmV2aWV3TG9hZExvZzogW10sIHJldmlld0hpc3Rvcnk6IFtdIH07XHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFN0b3JlKHBsdWdpbjogUGx1Z2luKTogUHJvbWlzZTxQbHVnaW5EYXRhPiB7XHJcbiAgY29uc3Qgc2F2ZWQgPSBhd2FpdCBwbHVnaW4ubG9hZERhdGEoKTtcclxuICByZXR1cm4gc2F2ZWQ/LnBsdWdpbkRhdGEgPz8gRU1QVFlfREFUQTtcclxufVxyXG5cclxuLy8gVGhlIGFjdHVhbCB3cml0ZSBcdTIwMTQgZG9lcyB0aGUgcmVhZC1tb2RpZnktd3JpdGVcclxuYXN5bmMgZnVuY3Rpb24gX3NhdmVTdG9yZShwbHVnaW46IFBsdWdpbiwgZGF0YTogUGx1Z2luRGF0YSk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IE1BWF9ISVNUT1JZID0gMTBfMDAwO1xyXG4gIGlmIChkYXRhLnJldmlld0hpc3RvcnkubGVuZ3RoID4gTUFYX0hJU1RPUlkpIHtcclxuICAgIC8vIEtlZXAgb25seSB0aGUgbW9zdCByZWNlbnQgZW50cmllczsgZG9uJ3QgbXV0YXRlIHRoZSBvcmlnaW5hbFxyXG4gICAgZGF0YSA9IHsgLi4uZGF0YSwgcmV2aWV3SGlzdG9yeTogZGF0YS5yZXZpZXdIaXN0b3J5LnNsaWNlKC1NQVhfSElTVE9SWSkgfTtcclxuICB9XHJcbiAgY29uc3QgY3VycmVudCA9IChhd2FpdCBwbHVnaW4ubG9hZERhdGEoKSkgPz8ge307XHJcbiAgYXdhaXQgcGx1Z2luLnNhdmVEYXRhKHsgLi4uY3VycmVudCwgcGx1Z2luRGF0YTogZGF0YSB9KTtcclxufVxyXG5cclxuLy8gQSBxdWV1ZSBzbyBjb25jdXJyZW50IGNhbGxzIG5ldmVyIG92ZXJsYXBcclxubGV0IHNhdmVRdWV1ZTogUHJvbWlzZTx2b2lkPiA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVTdG9yZShwbHVnaW46IFBsdWdpbiwgZGF0YTogUGx1Z2luRGF0YSk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHNhdmVRdWV1ZSA9IHNhdmVRdWV1ZS50aGVuKCgpID0+IF9zYXZlU3RvcmUocGx1Z2luLCBkYXRhKSk7XHJcbiAgcmV0dXJuIHNhdmVRdWV1ZTtcclxufVxyXG4iLCAiaW1wb3J0IHsgQXBwLCBURmlsZSwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgTm90ZVJlY29yZCwgU3JzU2Vzc2lvbiwgZ2V0QWN0aXZlUmVhY3Rpb25zIH0gZnJvbSBcIi4vdHlwZXNcIjtcbmltcG9ydCB7IG5leHRJbnRlcnZhbCwgbmV4dEVhc2VGYWN0b3IsIG5vdGVJc0R1ZSwgcGlja05vdGVUb1JldmlldyB9IGZyb20gXCIuL3NjaGVkdWxlclwiO1xuaW1wb3J0IHsgdG9kYXkgfSBmcm9tIFwiLi91dGlsc1wiO1xuaW1wb3J0IHsgc2F2ZVN0b3JlIH0gZnJvbSBcIi4vc3RvcmVcIjtcbmltcG9ydCB0eXBlIFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuaW1wb3J0IHsgd3JpdGVOb3RlUmVjb3JkLCBnZXROb3Rlc0Zyb21WYXVsdCwgd3JpdGVGcm9udG1hdHRlclN0YXRlIH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcbmltcG9ydCB7IEJhc2VOb3RlTW9kYWwgfSBmcm9tIFwiLi9CYXNlTm90ZU1vZGFsXCI7XG5pbXBvcnQgeyBNYWtlQWN0aW9uYWJsZU1vZGFsIH0gZnJvbSBcIi4vTWFrZUFjdGlvbmFibGVNb2RhbFwiO1xuXG5leHBvcnQgY2xhc3MgUmV2aWV3TW9kYWwgZXh0ZW5kcyBCYXNlTm90ZU1vZGFsIHtcbiAgcHJpdmF0ZSByZXZpZXdTdGFydFRpbWUgPSAwO1xuICBwcml2YXRlIHJldmlld2VkSW5TZXNzaW9uID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHByaXZhdGUgcHJvZ3Jlc3NMb2c6IHN0cmluZ1tdID0gW107XG4gIHByaXZhdGUgc2Vzc2lvblNpemUgPSAwO1xuICBwcml2YXRlIGFjdGl2ZVNvdXJjZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByb3RlY3RlZCBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXG4gICAgcHJvdGVjdGVkIG5vdGU6IE5vdGVSZWNvcmQsXG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gIH1cbiAgcHJpdmF0ZSBnZXRTb3VyY2VGb2xkZXJMaXN0KCk6IHN0cmluZ1tdIHtcbiAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3Muc291cmNlU2NvcGUgPT09IFwiZm9sZGVyXCIpIHtcbiAgICAgIHJldHVybiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zb3VyY2VGb2xkZXJzLm1hcCgoZikgPT4gZi5wYXRoKTtcbiAgICB9XG4gICAgLy8gdmF1bHQgc2NvcGU6IGRlcml2ZSB1bmlxdWUgdG9wLWxldmVsIGRpcnMgZnJvbSBsaXZlIG5vdGVzXG4gICAgY29uc3Qgbm90ZXMgPSBnZXROb3Rlc0Zyb21WYXVsdCh0aGlzLnBsdWdpbikuZmlsdGVyKChuKSA9PiBuLmludGVydmFsID49IDApO1xuICAgIGNvbnN0IGZvbGRlcnMgPSBuZXcgU2V0KFxuICAgICAgbm90ZXMubWFwKChuKSA9PiBuLmZpbGVwYXRoLnNwbGl0KFwiL1wiKVswXSkuZmlsdGVyKChzZWcpID0+IHNlZy5lbmRzV2l0aChcIi5tZFwiKSA9PT0gZmFsc2UpLCAvLyBleGNsdWRlIHJvb3QtbGV2ZWwgZmlsZXNcbiAgICApO1xuICAgIHJldHVybiBbLi4uZm9sZGVyc10uc29ydCgpO1xuICB9XG5cbiAgYXN5bmMgb25PcGVuKCkge1xuICAgIGNvbnN0IGFsbE5vdGVzID0gZ2V0Tm90ZXNGcm9tVmF1bHQodGhpcy5wbHVnaW4pLmZpbHRlcigobikgPT4gbi5pbnRlcnZhbCA+PSAwKTtcbiAgICB0aGlzLnNlc3Npb25TaXplID0gYWxsTm90ZXMuZmlsdGVyKChuKSA9PiBub3RlSXNEdWUobikpLmxlbmd0aDtcbiAgICBhd2FpdCB0aGlzLnJlbmRlcigpO1xuICAgIHRoaXMuc2V0dXBWYXVsdExpc3RlbmVyKCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0U3RhdHVzVGV4dCgpOiBzdHJpbmcge1xuICAgIGxldCBhbGxOb3RlcyA9IGdldE5vdGVzRnJvbVZhdWx0KHRoaXMucGx1Z2luKS5maWx0ZXIoKG4pID0+IG4uaW50ZXJ2YWwgPj0gMCk7XG4gICAgaWYgKHRoaXMuYWN0aXZlU291cmNlcy5sZW5ndGggPiAwKSB7XG4gICAgICBhbGxOb3RlcyA9IGFsbE5vdGVzLmZpbHRlcigobikgPT4gdGhpcy5hY3RpdmVTb3VyY2VzLnNvbWUoKHNyYykgPT4gbi5maWxlcGF0aC5zdGFydHNXaXRoKHNyYyArIFwiL1wiKSkpO1xuICAgIH1cbiAgICBjb25zdCByZW1haW5pbmdEdWUgPSBhbGxOb3Rlcy5maWx0ZXIoKG4pID0+IG5vdGVJc0R1ZShuKSAmJiAhdGhpcy5yZXZpZXdlZEluU2Vzc2lvbi5oYXMobi5maWxlcGF0aCkpLmxlbmd0aDtcbiAgICByZXR1cm4gYCR7cmVtYWluaW5nRHVlfSBub3RlJHtyZW1haW5pbmdEdWUgIT09IDEgPyBcInNcIiA6IFwiXCJ9IGR1ZWA7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlcigpIHtcbiAgICB0aGlzLnJldmlld1N0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgdGhpcy5pc0VkaXRpbmcgPSBmYWxzZTtcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcbiAgICBhd2FpdCB0aGlzLnJlbmRlck5vdGUoY29udGVudEVsKTtcbiAgfVxuXG4gIHByb3RlY3RlZCByZW5kZXJFeHRyYUhlYWRlckJ1dHRvbnMoaGVhZGVyUmlnaHQ6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgLy8gXHUyNTAwXHUyNTAwIFN0YXRlIGJhZGdlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNvbnN0IHN0YXRlT3B0aW9ucyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLm5vdGVTdGF0ZVZhbHVlcyA/PyBbXCJcdUQ4M0NcdURGMzFcIiwgXCJcdUQ4M0NcdURGM0ZcIiwgXCJcdUQ4M0NcdURGMzJcIl07XG5cbiAgICBsZXQgY3VycmVudFN0YXRlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoXG4gICAgICB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZSxcbiAgICApPy5mcm9udG1hdHRlcj8uc3RhdGUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gICAgbGV0IHN0YXRlRHJvcGRvd246IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG5cbiAgICBjb25zdCBiYWRnZSA9IGhlYWRlclJpZ2h0LmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICB0ZXh0OiBjdXJyZW50U3RhdGUgfHwgXCJubyBzdGF0ZVwiLFxuICAgICAgY2xzOiBcInNwYWNlZC1zdGF0ZS1iYWRnZVwiLFxuICAgIH0pO1xuICAgIGJhZGdlLnN0eWxlLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiO1xuICAgIGJhZGdlLnN0eWxlLmN1cnNvciA9IFwicG9pbnRlclwiO1xuXG4gICAgYmFkZ2UuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgIGlmIChzdGF0ZURyb3Bkb3duKSB7XG4gICAgICAgIHN0YXRlRHJvcGRvd24ucmVtb3ZlKCk7XG4gICAgICAgIHN0YXRlRHJvcGRvd24gPSBudWxsO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBzdGF0ZURyb3Bkb3duID0gYmFkZ2UuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1zdGF0ZS1kcm9wZG93blwiIH0pO1xuICAgICAgZm9yIChjb25zdCBzdGF0ZSBvZiBzdGF0ZU9wdGlvbnMpIHtcbiAgICAgICAgY29uc3Qgb3B0ID0gc3RhdGVEcm9wZG93bi5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLXN0YXRlLW9wdGlvblwiIH0pO1xuICAgICAgICBvcHQuc2V0VGV4dChzdGF0ZSk7XG4gICAgICAgIGlmIChzdGF0ZSA9PT0gY3VycmVudFN0YXRlKSBvcHQuYWRkQ2xhc3MoXCJpcy1hY3RpdmVcIik7XG4gICAgICAgIG9wdC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJTdGF0ZSh0aGlzLmFwcCwgdGhpcy5ub3RlLmZpbGVwYXRoLCBzdGF0ZSk7XG4gICAgICAgICAgY3VycmVudFN0YXRlID0gc3RhdGU7XG4gICAgICAgICAgYmFkZ2Uuc2V0VGV4dChzdGF0ZSk7XG4gICAgICAgICAgc3RhdGVEcm9wZG93bj8ucmVtb3ZlKCk7XG4gICAgICAgICAgc3RhdGVEcm9wZG93biA9IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIE1ha2UgQWN0aW9uYWJsZSBidXR0b24gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc3QgbWthQnRuID0gaGVhZGVyUmlnaHQuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1oZHItYnRuXCIgfSk7XG4gICAgc2V0SWNvbihta2FCdG4sIFwiemFwXCIpO1xuICAgIG1rYUJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiTWFrZSBhY3Rpb25hYmxlXCIpO1xuICAgIG1rYUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgbmV3IE1ha2VBY3Rpb25hYmxlTW9kYWwodGhpcy5hcHAsIHRoaXMubm90ZS5maWxlcGF0aCwgKCkgPT4ge30pLm9wZW4oKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIHJlYWN0aW9uIGJ1dHRvbiByb3dcbiAgcHJvdGVjdGVkIHJlbmRlckJ1dHRvbnMoY29udGVudEVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IENPTE9SX1ZBUl9NQVA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICBcInNwYWNlZC1zZWctcHVycGxlXCI6IFwidmFyKC0tY29sb3ItcHVycGxlKVwiLFxuICAgICAgXCJzcGFjZWQtc2VnLWJsdWVcIjogXCJ2YXIoLS1jb2xvci1ibHVlKVwiLFxuICAgICAgXCJzcGFjZWQtc2VnLWdyZWVuXCI6IFwidmFyKC0tY29sb3ItZ3JlZW4pXCIsXG4gICAgICBcInNwYWNlZC1zZWcteWVsbG93XCI6IFwidmFyKC0tY29sb3IteWVsbG93KVwiLFxuICAgICAgXCJzcGFjZWQtc2VnLW9yYW5nZVwiOiBcInZhcigtLWNvbG9yLW9yYW5nZSlcIixcbiAgICAgIFwic3BhY2VkLXNlZy1yZWRcIjogXCJ2YXIoLS1jb2xvci1yZWQpXCIsXG4gICAgfTtcblxuICAgIGNvbnN0IGJ0blJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWJ0bi1yb3dcIiB9KTtcbiAgICBjb25zdCByZWFjdGlvbnMgPSBnZXRBY3RpdmVSZWFjdGlvbnModGhpcy5wbHVnaW4uc2V0dGluZ3MpO1xuICAgIHJlYWN0aW9ucy5mb3JFYWNoKChyLCBpKSA9PiB7XG4gICAgICBjb25zdCB3cmFwcGVyID0gYnRuUm93LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYnRuLXdyYXBwZXJcIiB9KTtcbiAgICAgIGNvbnN0IGJ0biA9IHRoaXMuYWRkQnRuKHdyYXBwZXIsIHsgbGFiZWw6IHIubGFiZWwsIGNsczogci5pZCwgY2I6ICgpID0+IHRoaXMucmVhY3Qoci5pZCkgfSk7XG4gICAgICBpZiAoaSA9PT0gMCkgYnRuLnNldEN0YSgpO1xuICAgICAgY29uc3QgY29sb3JWYXIgPSBDT0xPUl9WQVJfTUFQW3RoaXMucmVhY3Rpb25Db2xvcihyLmlkKV07XG4gICAgICBpZiAoY29sb3JWYXIpIGJ0bi5idXR0b25FbC5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tcmVhY3Rpb24tY29sb3JcIiwgY29sb3JWYXIpO1xuXG4gICAgICBjb25zdCBkYXlzID0gbmV4dEludGVydmFsKHRoaXMubm90ZSwgci5pZCwgcmVhY3Rpb25zKTtcbiAgICAgIHdyYXBwZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHtcbiAgICAgICAgdGV4dDogZm9ybWF0SW50ZXJ2YWwoZGF5cyksXG4gICAgICAgIGNsczogXCJzcGFjZWQtYnRuLWludGVydmFsXCIsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBjb25zdCByb3V0ZUJ0biA9IHRoaXMuYWRkQnRuKGJ0blJvdywgeyBsYWJlbDogXCJSb3V0ZSBcdTIxOTJcIiwgY2xzOiBcInJvdXRlXCIsIGNiOiAoKSA9PiB0aGlzLnJvdXRlTm90ZSgpIH0pO1xuICAgIHJvdXRlQnRuLnNldEN0YSgpO1xuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgeyBsYWJlbDogXCJTa2lwXCIsIGNsczogXCJza2lwXCIsIGNiOiAoKSA9PiB0aGlzLnJlYWN0KFwic2tpcFwiKSB9KTtcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHsgbGFiZWw6IFwiQXJjaGl2ZVwiLCBjbHM6IFwiYXJjaGl2ZVwiLCBjYjogKCkgPT4gdGhpcy5hcmNoaXZlTm90ZSgpIH0pO1xuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgeyBpY29uOiBcInRyYXNoLTJcIiwgY2xzOiBcImRlbGV0ZVwiLCBjYjogKCkgPT4gdGhpcy5kZWxldGVOb3RlKCkgfSk7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgU291cmNlIHBpY2tlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBsZXQgc3JjRHJvcGRvd246IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3Qgc3JjQnRuID0gdGhpcy5hZGRCdG4oYnRuUm93LCB7XG4gICAgICBsYWJlbDogXCJTb3VyY2VcIixcbiAgICAgIGNsczogXCJzb3VyY2VcIixcbiAgICAgIHRvb2x0aXA6IGBTb3VyY2U6ICR7dGhpcy5hY3RpdmVTb3VyY2VzLmxlbmd0aCA/IHRoaXMuYWN0aXZlU291cmNlcy5qb2luKFwiLCBcIikgOiBcIkFsbFwifWAsXG4gICAgICBjYjogKCkgPT4ge1xuICAgICAgICBpZiAoc3JjRHJvcGRvd24pIHtcbiAgICAgICAgICBzcmNEcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgICBzcmNEcm9wZG93biA9IG51bGw7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZvbGRlcnMgPSB0aGlzLmdldFNvdXJjZUZvbGRlckxpc3QoKTtcbiAgICAgICAgaWYgKGZvbGRlcnMubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgICAgICAgc3JjRHJvcGRvd24gPSBidG5Sb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1zb3VyY2UtZHJvcGRvd25cIiB9KTtcbiAgICAgICAgY29uc3QgaXNBbGwgPSB0aGlzLmFjdGl2ZVNvdXJjZXMubGVuZ3RoID09PSAwO1xuXG4gICAgICAgIC8vIFwiQWxsXCIgcm93XG4gICAgICAgIGNvbnN0IGFsbFJvdyA9IHNyY0Ryb3Bkb3duLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtY29udGV4dC1vcHRpb25cIiB9KTtcbiAgICAgICAgY29uc3QgYWxsQ2IgPSBhbGxSb3cuY3JlYXRlRWwoXCJpbnB1dFwiKTtcbiAgICAgICAgYWxsQ2IudHlwZSA9IFwiY2hlY2tib3hcIjtcbiAgICAgICAgYWxsQ2IuY2hlY2tlZCA9IGlzQWxsO1xuICAgICAgICBhbGxSb3cuY3JlYXRlU3Bhbih7IHRleHQ6IFwiQWxsXCIgfSk7XG4gICAgICAgIGFsbENiLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xuICAgICAgICAgIHNyY0J0bi5idXR0b25FbC5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICBcImFyaWEtbGFiZWxcIixcbiAgICAgICAgICAgIGBTb3VyY2U6ICR7dGhpcy5hY3RpdmVTb3VyY2VzLmxlbmd0aCA/IHRoaXMuYWN0aXZlU291cmNlcy5qb2luKFwiLCBcIikgOiBcIkFsbFwifWAsXG4gICAgICAgICAgKTtcbiAgICAgICAgICB0aGlzLmFjdGl2ZVNvdXJjZXMgPSBbXTtcbiAgICAgICAgICB0aGlzLnJlZnJlc2hTZXNzaW9uU2l6ZSgpO1xuICAgICAgICAgIHNyY0Ryb3Bkb3duPy5yZW1vdmUoKTtcbiAgICAgICAgICBzcmNEcm9wZG93biA9IG51bGw7XG4gICAgICAgICAgLy8gcmUtb3BlbiB0byByZWZsZWN0IG5ldyBzdGF0ZVxuICAgICAgICAgIHNyY0J0bi5idXR0b25FbC5jbGljaygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQZXItZm9sZGVyIHJvd3NcbiAgICAgICAgZm9yIChjb25zdCBmb2xkZXIgb2YgZm9sZGVycykge1xuICAgICAgICAgIGNvbnN0IHJvdyA9IHNyY0Ryb3Bkb3duLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtY29udGV4dC1vcHRpb25cIiB9KTtcbiAgICAgICAgICBpZiAoaXNBbGwpIHJvdy5hZGRDbGFzcyhcInNwYWNlZC1zb3VyY2UtZ3JleWVkXCIpO1xuICAgICAgICAgIGNvbnN0IGNiID0gcm93LmNyZWF0ZUVsKFwiaW5wdXRcIik7XG4gICAgICAgICAgY2IudHlwZSA9IFwiY2hlY2tib3hcIjtcbiAgICAgICAgICBjYi5jaGVja2VkID0gaXNBbGwgfHwgdGhpcy5hY3RpdmVTb3VyY2VzLmluY2x1ZGVzKGZvbGRlcik7XG4gICAgICAgICAgcm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiBmb2xkZXIgfSk7XG5cbiAgICAgICAgICBjYi5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcbiAgICAgICAgICAgIHNyY0J0bi5idXR0b25FbC5zZXRBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgIFwiYXJpYS1sYWJlbFwiLFxuICAgICAgICAgICAgICBgU291cmNlOiAke3RoaXMuYWN0aXZlU291cmNlcy5sZW5ndGggPyB0aGlzLmFjdGl2ZVNvdXJjZXMuam9pbihcIiwgXCIpIDogXCJBbGxcIn1gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmFjdGl2ZVNvdXJjZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgIHRoaXMuYWN0aXZlU291cmNlcyA9IFtmb2xkZXJdO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjYi5jaGVja2VkKSB7XG4gICAgICAgICAgICAgIHRoaXMuYWN0aXZlU291cmNlcy5wdXNoKGZvbGRlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLmFjdGl2ZVNvdXJjZXMgPSB0aGlzLmFjdGl2ZVNvdXJjZXMuZmlsdGVyKChzKSA9PiBzICE9PSBmb2xkZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoU2Vzc2lvblNpemUoKTsgLy8gXHUyMTkwIHVwZGF0ZXMgZHVlIGNvdW50IG9ubHksIG5vIGZ1bGwgcmUtcmVuZGVyXG4gICAgICAgICAgICAvLyByZS1vcGVuIGRyb3Bkb3duIHRvIHJlZmxlY3QgbmV3IGNoZWNrZWQvZ3JleWVkIHN0YXRlczpcbiAgICAgICAgICAgIHNyY0Ryb3Bkb3duPy5yZW1vdmUoKTtcbiAgICAgICAgICAgIHNyY0Ryb3Bkb3duID0gbnVsbDtcbiAgICAgICAgICAgIHNyY0J0bi5idXR0b25FbC5jbGljaygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb25PdXRzaWRlID0gKGU6IE1vdXNlRXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoIXNyY0Ryb3Bkb3duIHx8ICFkb2N1bWVudC5jb250YWlucyhzcmNEcm9wZG93bikpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb25PdXRzaWRlKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFzcmNEcm9wZG93bi5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKSAmJiAhc3JjQnRuLmJ1dHRvbkVsLmNvbnRhaW5zKGUudGFyZ2V0IGFzIE5vZGUpKSB7XG4gICAgICAgICAgICBzcmNEcm9wZG93bi5yZW1vdmUoKTtcbiAgICAgICAgICAgIHNyY0Ryb3Bkb3duID0gbnVsbDtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb25PdXRzaWRlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgb25PdXRzaWRlKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlYWN0KHJlYWN0aW9uOiBzdHJpbmcpIHtcbiAgICBhd2FpdCB0aGlzLnNhdmVUaXRsZSgpO1xuICAgIGF3YWl0IHRoaXMuc2F2ZUJvZHlFZGl0cygpO1xuICAgIHRoaXMucHJvZ3Jlc3NMb2cucHVzaCh0aGlzLnJlYWN0aW9uQ29sb3IocmVhY3Rpb24pKTtcbiAgICBpZiAocmVhY3Rpb24gPT09IFwic2tpcFwiKSB7XG4gICAgICB0aGlzLnJldmlld2VkSW5TZXNzaW9uLmFkZCh0aGlzLm5vdGUuZmlsZXBhdGgpO1xuICAgICAgYXdhaXQgdGhpcy5zaG93TmV4dE5vdGUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5yZXZpZXdlZEluU2Vzc2lvbi5hZGQodGhpcy5ub3RlLmZpbGVwYXRoKTtcbiAgICB0aGlzLnBsdWdpbi5kYXRhLnJldmlld0hpc3RvcnkgPSB0aGlzLnBsdWdpbi5kYXRhLnJldmlld0hpc3RvcnkgPz8gW107XG4gICAgdGhpcy5wbHVnaW4uZGF0YS5yZXZpZXdIaXN0b3J5LnB1c2goe1xuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTkpLFxuICAgICAgbm90ZVBhdGg6IHRoaXMubm90ZS5maWxlcGF0aCxcbiAgICAgIHJlYWN0aW9uLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVhY3Rpb25zID0gZ2V0QWN0aXZlUmVhY3Rpb25zKHRoaXMucGx1Z2luLnNldHRpbmdzKTtcbiAgICBjb25zdCBuZXdJbnRlcnZhbCA9IG5leHRJbnRlcnZhbCh0aGlzLm5vdGUsIHJlYWN0aW9uLCByZWFjdGlvbnMpO1xuICAgIGNvbnN0IHVwZGF0ZWROb3RlOiBOb3RlUmVjb3JkID0ge1xuICAgICAgLi4udGhpcy5ub3RlLFxuICAgICAgaW50ZXJ2YWw6IG5ld0ludGVydmFsLFxuICAgICAgZWFzZUZhY3RvcjogbmV4dEVhc2VGYWN0b3IodGhpcy5ub3RlLCByZWFjdGlvbiwgcmVhY3Rpb25zKSxcbiAgICAgIGxhc3RSZXZpZXdlZE9uOiB0b2RheSgpLFxuICAgICAgcmV2aWV3ZWRDb3VudDogdGhpcy5ub3RlLnJldmlld2VkQ291bnQgKyAxLFxuICAgICAgbm90ZVN0YXRlOiByZWFjdGlvbixcbiAgICB9O1xuICAgIHRoaXMubm90ZSA9IHVwZGF0ZWROb3RlO1xuICAgIGF3YWl0IHdyaXRlTm90ZVJlY29yZCh0aGlzLnBsdWdpbiwgdGhpcy5ub3RlLmZpbGVwYXRoLCB1cGRhdGVkTm90ZSk7XG4gICAgYXdhaXQgc2F2ZVN0b3JlKHRoaXMucGx1Z2luLCB0aGlzLnBsdWdpbi5kYXRhKTtcbiAgICBhd2FpdCB0aGlzLnNob3dOZXh0Tm90ZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBhcmNoaXZlTm90ZSgpIHtcbiAgICBhd2FpdCB0aGlzLnNhdmVUaXRsZSgpO1xuICAgIGF3YWl0IHRoaXMuc2F2ZUJvZHlFZGl0cygpO1xuICAgIHRoaXMucHJvZ3Jlc3NMb2cucHVzaCh0aGlzLnJlYWN0aW9uQ29sb3IoXCJhcmNoaXZlXCIpKTtcbiAgICBhd2FpdCB3cml0ZU5vdGVSZWNvcmQodGhpcy5wbHVnaW4sIHRoaXMubm90ZS5maWxlcGF0aCwgeyBpbnRlcnZhbDogLTEgfSk7XG4gICAgYXdhaXQgdGhpcy5zaG93TmV4dE5vdGUoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgc2hvd05leHROb3RlKCkge1xuICAgIGxldCBhbGxOb3RlcyA9IGdldE5vdGVzRnJvbVZhdWx0KHRoaXMucGx1Z2luKS5maWx0ZXIoXG4gICAgICAobikgPT4gbi5pbnRlcnZhbCA+PSAwICYmICF0aGlzLnJldmlld2VkSW5TZXNzaW9uLmhhcyhuLmZpbGVwYXRoKSxcbiAgICApO1xuICAgIGlmICh0aGlzLmFjdGl2ZVNvdXJjZXMubGVuZ3RoID4gMCkge1xuICAgICAgYWxsTm90ZXMgPSBhbGxOb3Rlcy5maWx0ZXIoKG4pID0+IHRoaXMuYWN0aXZlU291cmNlcy5zb21lKChzcmMpID0+IG4uZmlsZXBhdGguc3RhcnRzV2l0aChzcmMgKyBcIi9cIikpKTtcbiAgICB9XG4gICAgY29uc3Qgbm90ZSA9IHBpY2tOb3RlVG9SZXZpZXcoYWxsTm90ZXMsIHRoaXMucGx1Z2luLnNldHRpbmdzKTtcbiAgICBpZiAoIW5vdGUpIHtcbiAgICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgICAgY29udGVudEVsLmVtcHR5KCk7XG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiQWxsIGNhdWdodCB1cCFcIiB9KTtcbiAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIG1vcmUgbm90ZXMgZHVlLiBDbG9zZSB0aGlzIG1vZGFsIHRvIGV4aXQuXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMubm90ZSA9IG5vdGU7XG4gICAgYXdhaXQgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZGVsZXRlTm90ZSgpIHtcbiAgICBhd2FpdCB0aGlzLnNhdmVUaXRsZSgpO1xuICAgIHRoaXMucHJvZ3Jlc3NMb2cucHVzaCh0aGlzLnJlYWN0aW9uQ29sb3IoXCJkZWxldGVcIikpO1xuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZTtcbiAgICBpZiAoZmlsZSkge1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuZGVsZXRlKGZpbGUpO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLnNob3dOZXh0Tm90ZSgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWFjdGlvbkNvbG9yKHJlYWN0aW9uOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHN5c3RlbUNvbG9yczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgIHJvdXRlOiBcInNwYWNlZC1zZWctYmx1ZVwiLFxuICAgICAgYXJjaGl2ZTogXCJzcGFjZWQtc2VnLXllbGxvd1wiLFxuICAgICAgZGVsZXRlOiBcInNwYWNlZC1zZWctcmVkXCIsXG4gICAgICBza2lwOiBcInNwYWNlZC1zZWctc2tpcFwiLFxuICAgIH07XG4gICAgaWYgKHN5c3RlbUNvbG9yc1tyZWFjdGlvbl0pIHJldHVybiBzeXN0ZW1Db2xvcnNbcmVhY3Rpb25dO1xuXG4gICAgY29uc3QgcmVhY3Rpb25zID0gZ2V0QWN0aXZlUmVhY3Rpb25zKHRoaXMucGx1Z2luLnNldHRpbmdzKTtcbiAgICBjb25zdCByZWFjdGlvbkRlZiA9IHJlYWN0aW9ucy5maW5kKChyKSA9PiByLmlkID09PSByZWFjdGlvbik7XG4gICAgaWYgKHJlYWN0aW9uRGVmPy5jb2xvcikgcmV0dXJuIHJlYWN0aW9uRGVmLmNvbG9yO1xuXG4gICAgY29uc3QgcmFtcCA9IFtcbiAgICAgIFwic3BhY2VkLXNlZy1wdXJwbGVcIixcbiAgICAgIFwic3BhY2VkLXNlZy1ibHVlXCIsXG4gICAgICBcInNwYWNlZC1zZWctZ3JlZW5cIixcbiAgICAgIFwic3BhY2VkLXNlZy15ZWxsb3dcIixcbiAgICAgIFwic3BhY2VkLXNlZy1vcmFuZ2VcIixcbiAgICAgIFwic3BhY2VkLXNlZy1yZWRcIixcbiAgICBdO1xuICAgIGNvbnN0IGlkeCA9IHJlYWN0aW9uRGVmID8gcmVhY3Rpb25zLmluZGV4T2YocmVhY3Rpb25EZWYpIDogLTE7XG4gICAgaWYgKGlkeCA9PT0gLTEpIHJldHVybiBcIlwiO1xuICAgIGNvbnN0IHQgPSByZWFjdGlvbnMubGVuZ3RoID09PSAxID8gMC41IDogaWR4IC8gKHJlYWN0aW9ucy5sZW5ndGggLSAxKTtcbiAgICByZXR1cm4gcmFtcFtNYXRoLnJvdW5kKHQgKiAocmFtcC5sZW5ndGggLSAxKSldO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFByb2dyZXNzU2VnbWVudHMoKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IHNlZ21lbnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zZXNzaW9uU2l6ZTsgaSsrKSB7XG4gICAgICBzZWdtZW50cy5wdXNoKHRoaXMucHJvZ3Jlc3NMb2dbaV0gPz8gXCJcIik7XG4gICAgfVxuICAgIHJldHVybiBzZWdtZW50cztcbiAgfVxuXG4gIHByaXZhdGUgcmVmcmVzaFNlc3Npb25TaXplKCk6IHZvaWQge1xuICAgIGxldCBhbGxOb3RlcyA9IGdldE5vdGVzRnJvbVZhdWx0KHRoaXMucGx1Z2luKS5maWx0ZXIoKG4pID0+IG4uaW50ZXJ2YWwgPj0gMCk7XG4gICAgaWYgKHRoaXMuYWN0aXZlU291cmNlcy5sZW5ndGggPiAwKSB7XG4gICAgICBhbGxOb3RlcyA9IGFsbE5vdGVzLmZpbHRlcigobikgPT4gdGhpcy5hY3RpdmVTb3VyY2VzLnNvbWUoKHNyYykgPT4gbi5maWxlcGF0aC5zdGFydHNXaXRoKHNyYyArIFwiL1wiKSkpO1xuICAgIH1cbiAgICBjb25zdCByZW1haW5pbmdEdWUgPSBhbGxOb3Rlcy5maWx0ZXIoKG4pID0+IG5vdGVJc0R1ZShuKSAmJiAhdGhpcy5yZXZpZXdlZEluU2Vzc2lvbi5oYXMobi5maWxlcGF0aCkpLmxlbmd0aDtcbiAgICB0aGlzLnNlc3Npb25TaXplID0gdGhpcy5wcm9ncmVzc0xvZy5sZW5ndGggKyByZW1haW5pbmdEdWU7XG4gICAgdGhpcy5yZWZyZXNoUHJvZ3Jlc3NCYXIoKTsgLy8gdXBkYXRlcyBkdWUgY291bnQgdGV4dCArIHJlZHJhd3MgYmFyXG4gIH1cblxuICBwdWJsaWMgcmVzdW1lU2Vzc2lvbihzZXNzaW9uOiBTcnNTZXNzaW9uKSB7XG4gICAgdGhpcy5yZXZpZXdlZEluU2Vzc2lvbiA9IG5ldyBTZXQoc2Vzc2lvbi5yZXZpZXdlZEZpbGVwYXRocyk7XG4gICAgdGhpcy5wcm9ncmVzc0xvZyA9IFsuLi5zZXNzaW9uLnByb2dyZXNzTG9nXTtcbiAgICB0aGlzLnNlc3Npb25TaXplID0gc2Vzc2lvbi5zZXNzaW9uU2l6ZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBvblNlc3Npb25DbG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5zZXNzaW9uU2l6ZSA+IDApIHtcbiAgICAgIGlmICh0aGlzLnJldmlld2VkSW5TZXNzaW9uLnNpemUgPCB0aGlzLnNlc3Npb25TaXplKSB7XG4gICAgICAgIHRoaXMucGx1Z2luLmRhdGEuc3JzU2Vzc2lvbiA9IHtcbiAgICAgICAgICByZXZpZXdlZEZpbGVwYXRoczogWy4uLnRoaXMucmV2aWV3ZWRJblNlc3Npb25dLFxuICAgICAgICAgIHByb2dyZXNzTG9nOiBbLi4udGhpcy5wcm9ncmVzc0xvZ10sXG4gICAgICAgICAgc2Vzc2lvblNpemU6IHRoaXMuc2Vzc2lvblNpemUsXG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWxldGUgdGhpcy5wbHVnaW4uZGF0YS5zcnNTZXNzaW9uO1xuICAgICAgfVxuICAgICAgdm9pZCBzYXZlU3RvcmUodGhpcy5wbHVnaW4sIHRoaXMucGx1Z2luLmRhdGEpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBmb3JtYXRJbnRlcnZhbChkYXlzOiBudW1iZXIpOiBzdHJpbmcge1xuICBpZiAoZGF5cyA8IDcpIHJldHVybiBgJHtkYXlzfWRgO1xuICBpZiAoZGF5cyA8IDMwKSByZXR1cm4gYCR7TWF0aC5yb3VuZChkYXlzIC8gNyl9d2A7XG4gIGlmIChkYXlzIDwgMzY1KSByZXR1cm4gYCR7TWF0aC5yb3VuZChkYXlzIC8gMzApfW1vYDtcbiAgcmV0dXJuIGAke01hdGgucm91bmQoZGF5cyAvIDM2NSl9eWA7XG59XG4iLCAiLy9cdTIxOTAgTm90ZVJlY29yZCwgUGx1Z2luRGF0YSwgU2V0dGluZ3MgaW50ZXJmYWNlc1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCYXNlTm90ZSB7XHJcbiAgZmlsZXBhdGg6IHN0cmluZztcclxuICBhY3RpdmU/OiBib29sZWFuO1xyXG59ICBcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTm90ZVJlY29yZCBleHRlbmRzIEJhc2VOb3RlIHtcclxuICBlYXNlRmFjdG9yOiBudW1iZXI7XHJcbiAgaW50ZXJ2YWw6IG51bWJlcjtcclxuICBsYXN0UmV2aWV3ZWRPbjogc3RyaW5nO1xyXG4gIGNyZWF0ZWRPbjogc3RyaW5nO1xyXG4gIHJldmlld2VkQ291bnQ6IG51bWJlcjtcclxuICBub3RlU3RhdGU6IE5vdGVTdGF0ZTtcclxuICBkZWNrcz86IHN0cmluZ1tdO1xyXG59ICBcclxuXHJcbmV4cG9ydCB0eXBlIEVuZXJneUNvbG9yID0gXCJcdUQ4M0RcdUREMjVcIiB8IFwiXHVEODNFXHVERTk0XCIgfCBcIlx1RDgzQ1x1REYwQVwiIHwgXCJcdUQ4M0NcdURGM0ZcIjsgIFxyXG5leHBvcnQgdHlwZSBEYXlOYW1lID0gXCJTdW5cIiB8IFwiTW9uXCIgfCBcIlR1ZVwiIHwgXCJXZWRcIiB8IFwiVGh1XCIgfCBcIkZyaVwiIHwgXCJTYXRcIjtcclxuIFxyXG5leHBvcnQgaW50ZXJmYWNlIEFjdGlvbk5vdGUgZXh0ZW5kcyBCYXNlTm90ZSB7ICBcclxuICBlbmVyZ3k/OiBFbmVyZ3lDb2xvciB8IEVuZXJneUNvbG9yW107ICBcclxuICB0aW1lYmxvY2s/OiBzdHJpbmcgfCBzdHJpbmdbXTsgIFxyXG4gIGR1ZT86IHN0cmluZzsgIFxyXG4gIGNvbnRleHQ/OiBzdHJpbmcgfCBzdHJpbmdbXTsgIFxyXG4gIHRpbWVzY29wZT86IFwiZGFpbHlcIiB8IFwiZXZlcnktb3RoZXItZGF5XCIgfCBcIndlZWtseVwiIHwgXCJldmVyeS1vdGhlci13ZWVrXCIgfCBcIm1vbnRobHlcIiB8IFwic2Vhc29uYWxcIiB8IFwieWVhcmx5XCI7ICBcclxuICBsYXN0X2NvbXBsZXRlZD86IHN0cmluZzsgICAvLyBZWVlZLU1NLUREICBcclxuICBza2lwcGVkPzogbnVtYmVyOyAgXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3VzdG9tUmVhY3Rpb25TZXQge1xyXG4gIGlkOiBzdHJpbmc7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG4gIHJlYWN0aW9uczogUmVhY3Rpb25EZWZpbml0aW9uW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3JhbVNlc3Npb24ge1xyXG4gIHJlbWFpbmluZzogc3RyaW5nW107IC8vIGZpbGVwYXRoc1xyXG4gIGZhaWxlZDogc3RyaW5nW107IC8vIGZpbGVwYXRoc1xyXG4gIHByb2dyZXNzTG9nOiAoXCJwYXNzXCIgfCBcImZhaWxcIilbXTtcclxuICBjdXJyZW50Um91bmRTaXplOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU3lzdGVtU2Vzc2lvbiB7XHJcbiAgcmVtYWluaW5nOiBzdHJpbmdbXTtcclxuICBmYWlsZWQ6IHN0cmluZ1tdO1xyXG4gIHByb2dyZXNzTG9nOiAoXCJwYXNzXCIgfCBcImZhaWxcIiB8IFwic2tpcFwiKVtdO1xyXG4gIGN1cnJlbnRSb3VuZFNpemU6IG51bWJlcjtcclxuICBlbmVyZ3lMZXZlbDogXCJoaWdoXCIgfCBcImxvd1wiIHwgbnVsbDtcclxuICBhY3RpdmVUaW1lYmxvY2tzOiBzdHJpbmdbXTtcclxuICBhY3RpdmVDb250ZXh0czogc3RyaW5nW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVhY3Rpb25EZWZpbml0aW9uIHtcclxuICBpZDogc3RyaW5nOyAvLyBzdG9yZWQgaW4gbm90ZVN0YXRlIGZyb250bWF0dGVyIChlLmcuIFwiZXhjaXRpbmdcIiwgXCJteS1jdXN0b21cIilcclxuICBsYWJlbDogc3RyaW5nOyAvLyBzaG93biBvbiB0aGUgYnV0dG9uXHJcbiAgbWFudWFsT3ZlcnJpZGU/OiBib29sZWFuO1xyXG4gIGludGVydmFsTXVsdD86IG51bWJlcjsgLy8gZGlyZWN0IG11bHRpcGxpZXI6IDwxIHNocmlua3MgKGUuZy4gMC41ID0gaGFsdmUpLCA+MSBncm93cyAoZS5nLiAzLjAgPSB0cmlwbGUpXHJcbiAgZWFzZURlbHRhPzogbnVtYmVyOyAvLyByZXBsYWNlcyB0aGUgbGVycCdkIGRlbHRhIChlLmcuICsxMCBvciAtMTUpXHJcbiAgY29sb3I/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIFJlYWN0aW9uU2V0TW9kZSA9IFwiZGVmYXVsdFwiIHwgXCJhbmtpXCIgfCAoc3RyaW5nICYge30pO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTb3VyY2VGb2xkZXIge1xyXG4gIHBhdGg6IHN0cmluZztcclxuICB3ZWlnaHQ6IG51bWJlcjsgLy8gcGVyY2VudGFnZSwgZS5nLiAxMDAgPSBub3JtYWwsIDUwID0gaGFsZiB3ZWlnaHRcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgTm90ZVN0YXRlID0gc3RyaW5nO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXZpZXdFdmVudCB7XHJcbiAgdGltZXN0YW1wOiBzdHJpbmc7XHJcbiAgbm90ZVBhdGg6IHN0cmluZztcclxuICByZWFjdGlvbjogTm90ZVN0YXRlO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNyc1Nlc3Npb24ge1xyXG4gIHJldmlld2VkRmlsZXBhdGhzOiBzdHJpbmdbXTtcclxuICBwcm9ncmVzc0xvZzogc3RyaW5nW107XHJcbiAgc2Vzc2lvblNpemU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTcnNSZWNvcmQge1xyXG4gIGVhc2VGYWN0b3I6IG51bWJlcjtcclxuICBpbnRlcnZhbDogbnVtYmVyO1xyXG4gIGxhc3RSZXZpZXdlZE9uOiBzdHJpbmc7XHJcbiAgY3JlYXRlZE9uOiBzdHJpbmc7XHJcbiAgcmV2aWV3ZWRDb3VudDogbnVtYmVyO1xyXG4gIG5vdGVTdGF0ZTogTm90ZVN0YXRlO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBsdWdpbkRhdGEge1xyXG4gIHJldmlld0xvYWRMb2c6IEFycmF5PHsgdGltZXN0YW1wOiBzdHJpbmc7IG51bU5vdGVzOiBudW1iZXI7IG51bUR1ZTogbnVtYmVyIH0+O1xyXG4gIHJldmlld0hpc3Rvcnk6IFJldmlld0V2ZW50W107XHJcbiAgY3JhbVNlc3Npb25zPzogUmVjb3JkPHN0cmluZywgQ3JhbVNlc3Npb24+O1xyXG4gIGRlY2tMYXN0VXNlZD86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XHJcbiAgc3JzU2Vzc2lvbj86IFNyc1Nlc3Npb247XHJcbiAgc3lzdGVtU2Vzc2lvbj86IFN5c3RlbVNlc3Npb247XHJcbiAgbm90ZVJlY29yZHM6IFJlY29yZDxzdHJpbmcsIFNyc1JlY29yZD47XHJcbiAgc3lzdGVtU2tpcHBlZFRvZGF5PzogeyBkYXRlOiBzdHJpbmc7IGZpbGVwYXRoczogc3RyaW5nW10gfTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3Mge1xyXG4gIHNvdXJjZVNjb3BlOiBcInZhdWx0XCIgfCBcImZvbGRlclwiO1xyXG4gIHNvdXJjZUZvbGRlcnM6IFNvdXJjZUZvbGRlcltdO1xyXG4gIGV2ZXJncmVlbkZvbGRlcjogc3RyaW5nO1xyXG4gIGluaXRpYWxJbnRlcnZhbDogbnVtYmVyO1xyXG4gIGRlZmF1bHRFYXNlRmFjdG9yOiBudW1iZXI7XHJcbiAgcmVuYW1lRm9sZGVyV2l0aERlY2s6IGJvb2xlYW47XHJcbiAgcmVjZW50VW5kdWVUaHJlc2hvbGQ6IG51bWJlcjtcclxuICBleGNpdGluZ1RocmVzaG9sZDogbnVtYmVyO1xyXG4gIHJlYWN0aW9uU2V0TW9kZTogUmVhY3Rpb25TZXRNb2RlO1xyXG4gIHdlZWtlbmREYXlzOiBEYXlOYW1lW107XHJcbiAgY3VzdG9tUmVhY3Rpb25TZXRzOiBDdXN0b21SZWFjdGlvblNldFtdO1xyXG4gIG5vdGVTdGF0ZVZhbHVlczogc3RyaW5nW107XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3MgPSB7XHJcbiAgc291cmNlU2NvcGU6IFwidmF1bHRcIixcclxuICBzb3VyY2VGb2xkZXJzOiBbXSxcclxuICBldmVyZ3JlZW5Gb2xkZXI6IFwiRXZlcmdyZWVuXCIsXHJcbiAgaW5pdGlhbEludGVydmFsOiAzLFxyXG4gIGRlZmF1bHRFYXNlRmFjdG9yOiAzMDAsXHJcbiAgcmVuYW1lRm9sZGVyV2l0aERlY2s6IHRydWUsXHJcbiAgcmVjZW50VW5kdWVUaHJlc2hvbGQ6IDAuNSxcclxuICBleGNpdGluZ1RocmVzaG9sZDogMC43LFxyXG4gIHJlYWN0aW9uU2V0TW9kZTogXCJkZWZhdWx0XCIsXHJcbiAgY3VzdG9tUmVhY3Rpb25TZXRzOiBbXSxcclxuICB3ZWVrZW5kRGF5czogW1wiU2F0XCIsIFwiU3VuXCJdLFxyXG4gIG5vdGVTdGF0ZVZhbHVlczogW1wiXHVEODNDXHVERjMxXCIsIFwiXHVEODNDXHVERjNGXCIsIFwiXHVEODNDXHVERjMyXCJdLFxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IFBSRVNFVF9ERUZBVUxUOiBSZWFjdGlvbkRlZmluaXRpb25bXSA9IFtcclxuICB7IGlkOiBcImV4Y2l0aW5nXCIsIGxhYmVsOiBcIkV4Y2l0aW5nXCIgfSxcclxuICB7IGlkOiBcImludGVyZXN0aW5nXCIsIGxhYmVsOiBcIkludGVyZXN0aW5nXCIgfSxcclxuICB7IGlkOiBcInllYWhcIiwgbGFiZWw6IFwiWWVhaFwiIH0sXHJcbiAgeyBpZDogXCJsb2xcIiwgbGFiZWw6IFwiTG9sXCIgfSxcclxuICB7IGlkOiBcIm1laFwiLCBsYWJlbDogXCJNZWhcIiB9LFxyXG4gIHsgaWQ6IFwiY3JpbmdlXCIsIGxhYmVsOiBcIkNyaW5nZVwiIH0sXHJcbiAgeyBpZDogXCJ0YXhpbmdcIiwgbGFiZWw6IFwiVGF4aW5nXCIgfSxcclxuXTtcclxuXHJcbmV4cG9ydCBjb25zdCBQUkVTRVRfQU5LSTogUmVhY3Rpb25EZWZpbml0aW9uW10gPSBbXHJcbiAgeyBpZDogXCJlYXN5XCIsIGxhYmVsOiBcIkVhc3lcIiB9LFxyXG4gIHsgaWQ6IFwiZ29vZFwiLCBsYWJlbDogXCJHb29kXCIgfSxcclxuICB7IGlkOiBcImhhcmRcIiwgbGFiZWw6IFwiSGFyZFwiIH0sXHJcbiAgeyBpZDogXCJhZ2FpblwiLCBsYWJlbDogXCJBZ2FpblwiIH0sXHJcbl07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aXZlUmVhY3Rpb25zKHNldHRpbmdzOiBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3MpOiBSZWFjdGlvbkRlZmluaXRpb25bXSB7XHJcbiAgaWYgKHNldHRpbmdzLnJlYWN0aW9uU2V0TW9kZSA9PT0gXCJhbmtpXCIpIHJldHVybiBQUkVTRVRfQU5LSTtcclxuICBjb25zdCBhY3RpdmVTZXQgPSBzZXR0aW5ncy5jdXN0b21SZWFjdGlvblNldHM/LmZpbmQoKHMpID0+IHMuaWQgPT09IHNldHRpbmdzLnJlYWN0aW9uU2V0TW9kZSk7XHJcbiAgaWYgKGFjdGl2ZVNldCkgcmV0dXJuIGFjdGl2ZVNldC5yZWFjdGlvbnM7XHJcbiAgcmV0dXJuIFBSRVNFVF9ERUZBVUxUO1xyXG59IiwgImltcG9ydCB7IEFwcCwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgTm90ZVJlY29yZCwgU3BhY2VkRXZlcnl0aGluZ1NldHRpbmdzLCBEYXlOYW1lLCBBY3Rpb25Ob3RlLCBFbmVyZ3lDb2xvciB9IGZyb20gXCIuL3R5cGVzXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdG9kYXkoKTogc3RyaW5nIHtcclxuICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEFsbERlY2tOYW1lcyhhcHA6IEFwcCk6IHN0cmluZ1tdIHtcclxuICBjb25zdCBkZWNrU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgZm9yIChjb25zdCBmaWxlIG9mIGFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkpIHtcclxuICAgIGNvbnN0IGRlY2tzID0gYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcj8uZGVja3M7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShkZWNrcykpXHJcbiAgICAgIGRlY2tzLmZvckVhY2goKGQ6IHN0cmluZykgPT4ge1xyXG4gICAgICAgIGlmIChkKSBkZWNrU2V0LmFkZChkKTtcclxuICAgICAgfSk7XHJcbiAgICBlbHNlIGlmICh0eXBlb2YgZGVja3MgPT09IFwic3RyaW5nXCIgJiYgZGVja3MpIGRlY2tTZXQuYWRkKGRlY2tzKTtcclxuICB9XHJcbiAgcmV0dXJuIEFycmF5LmZyb20oZGVja1NldCkuc29ydCgpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2h1ZmZsZUFycmF5PFQ+KGFycjogVFtdKTogVFtdIHtcclxuICBjb25zdCBhID0gWy4uLmFycl07XHJcbiAgZm9yIChsZXQgaSA9IGEubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xyXG4gICAgY29uc3QgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpO1xyXG4gICAgW2FbaV0sIGFbal1dID0gW2Fbal0sIGFbaV1dO1xyXG4gIH1cclxuICByZXR1cm4gYTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGl2ZU5vdGVzKGFwcDogQXBwLCBub3RlczogTm90ZVJlY29yZFtdKTogTm90ZVJlY29yZFtdIHtcclxuICByZXR1cm4gbm90ZXMuZmlsdGVyKChuKSA9PiB7XHJcbiAgICBjb25zdCBmID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChuLmZpbGVwYXRoKSBhcyBURmlsZSB8IG51bGw7XHJcbiAgICByZXR1cm4gZiA/IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmKT8uZnJvbnRtYXR0ZXI/LmFjdGl2ZSA9PT0gdHJ1ZSA6IGZhbHNlO1xyXG4gIH0pO1xyXG59XHJcblxyXG5jb25zdCBEQVlfTkFNRVM6IERheU5hbWVbXSA9IFtcIlN1blwiLCBcIk1vblwiLCBcIlR1ZVwiLCBcIldlZFwiLCBcIlRodVwiLCBcIkZyaVwiLCBcIlNhdFwiXTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDdXJyZW50RGF5TmFtZSgpOiBEYXlOYW1lIHtcclxuICByZXR1cm4gREFZX05BTUVTW25ldyBEYXRlKCkuZ2V0RGF5KCldO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaXNXZWVrZW5kKHNldHRpbmdzOiBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3MpOiBib29sZWFuIHtcclxuICByZXR1cm4gc2V0dGluZ3Mud2Vla2VuZERheXMuaW5jbHVkZXMoZ2V0Q3VycmVudERheU5hbWUoKSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDdXJyZW50VGltZWJsb2NrKCk6IFwibW9ybmluZ1wiIHwgXCJhZnRlcm5vb25cIiB8IFwiZXZlbmluZ1wiIHwgXCJuaWdodFwiIHtcclxuICBjb25zdCBob3VyID0gbmV3IERhdGUoKS5nZXRIb3VycygpO1xyXG4gIGlmIChob3VyID49IDUgJiYgaG91ciA8IDEyKSByZXR1cm4gXCJtb3JuaW5nXCI7XHJcbiAgaWYgKGhvdXIgPj0gMTIgJiYgaG91ciA8IDE3KSByZXR1cm4gXCJhZnRlcm5vb25cIjtcclxuICBpZiAoaG91ciA+PSAxNyAmJiBob3VyIDwgMjEpIHJldHVybiBcImV2ZW5pbmdcIjtcclxuICByZXR1cm4gXCJuaWdodFwiO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyQnlFbmVyZ3lMZXZlbChub3RlczogQWN0aW9uTm90ZVtdLCBsZXZlbDogXCJoaWdoXCIgfCBcImxvd1wiKTogQWN0aW9uTm90ZVtdIHtcclxuICBjb25zdCBoaWdoQ29sb3JzOiBFbmVyZ3lDb2xvcltdID0gW1wiXHVEODNEXHVERDI1XCIsIFwiXHVEODNDXHVERjNGXCJdO1xyXG4gIGNvbnN0IGxvd0NvbG9yczogRW5lcmd5Q29sb3JbXSA9IFtcIlx1RDgzRVx1REU5NFwiLCBcIlx1RDgzQ1x1REYwQVwiXTtcclxuICBjb25zdCBhbGxvd2VkID0gbGV2ZWwgPT09IFwiaGlnaFwiID8gWy4uLmhpZ2hDb2xvcnMsIC4uLmxvd0NvbG9yc10gOiBsb3dDb2xvcnM7XHJcbiAgcmV0dXJuIG5vdGVzLmZpbHRlcigobikgPT4ge1xyXG4gICAgaWYgKCFuLmVuZXJneSkgcmV0dXJuIHRydWU7XHJcbiAgICBjb25zdCBlbmVyZ2llcyA9IEFycmF5LmlzQXJyYXkobi5lbmVyZ3kpID8gbi5lbmVyZ3kgOiBbbi5lbmVyZ3ldO1xyXG4gICAgcmV0dXJuIGVuZXJnaWVzLnNvbWUoKGUpID0+IGFsbG93ZWQuaW5jbHVkZXMoZSkpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyQnlUaW1lYmxvY2sobm90ZXM6IEFjdGlvbk5vdGVbXSwgdGltZWJsb2Nrczogc3RyaW5nW10pOiBBY3Rpb25Ob3RlW10ge1xyXG4gIGlmICh0aW1lYmxvY2tzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG5vdGVzOyAvLyBlbXB0eSA9IG5vIGZpbHRlciwgc2hvdyBhbGxcclxuICByZXR1cm4gbm90ZXMuZmlsdGVyKChuKSA9PiB7XHJcbiAgICBpZiAoIW4udGltZWJsb2NrKSByZXR1cm4gdHJ1ZTtcclxuICAgIGNvbnN0IGJsb2NrcyA9IEFycmF5LmlzQXJyYXkobi50aW1lYmxvY2spID8gbi50aW1lYmxvY2sgOiBbbi50aW1lYmxvY2tdO1xyXG4gICAgcmV0dXJuIGJsb2Nrcy5zb21lKChiKSA9PiB0aW1lYmxvY2tzLmluY2x1ZGVzKGIpKTtcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckJ5Q29udGV4dChub3RlczogQWN0aW9uTm90ZVtdLCBjb250ZXh0czogc3RyaW5nW10pOiBBY3Rpb25Ob3RlW10ge1xyXG4gIGlmIChjb250ZXh0cy5sZW5ndGggPT09IDApIHJldHVybiBub3RlcztcclxuICByZXR1cm4gbm90ZXMuZmlsdGVyKChuKSA9PiB7XHJcbiAgICBpZiAoIW4uY29udGV4dCkgcmV0dXJuIHRydWU7XHJcbiAgICBjb25zdCBub3RlQ29udGV4dHMgPSBBcnJheS5pc0FycmF5KG4uY29udGV4dCkgPyBuLmNvbnRleHQgOiBbbi5jb250ZXh0XTtcclxuICAgIHJldHVybiBub3RlQ29udGV4dHMuc29tZSgoYykgPT4gY29udGV4dHMuaW5jbHVkZXMoYykpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsQ29udGV4dFZhbHVlcyhhcHA6IEFwcCk6IHN0cmluZ1tdIHtcclxuICBjb25zdCBjb250ZXh0U2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgZm9yIChjb25zdCBmaWxlIG9mIGFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkpIHtcclxuICAgIGNvbnN0IGZtID0gYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcclxuICAgIGlmICghZm0/LmFjdGl2ZSkgY29udGludWU7XHJcbiAgICBjb25zdCBjdHggPSBmbT8uY29udGV4dDtcclxuICAgIGlmIChBcnJheS5pc0FycmF5KGN0eCkpXHJcbiAgICAgIGN0eC5mb3JFYWNoKChjOiBzdHJpbmcpID0+IHtcclxuICAgICAgICBpZiAoYykgY29udGV4dFNldC5hZGQoYyk7XHJcbiAgICAgIH0pO1xyXG4gICAgZWxzZSBpZiAodHlwZW9mIGN0eCA9PT0gXCJzdHJpbmdcIiAmJiBjdHgpIGNvbnRleHRTZXQuYWRkKGN0eCk7XHJcbiAgfVxyXG4gIHJldHVybiBBcnJheS5mcm9tKGNvbnRleHRTZXQpLnNvcnQoKTtcclxufVxyXG5cclxuY29uc3QgdGltZXNjb3BlX0RBWVM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcbiAgZGFpbHk6IDEsXHJcbiAgXCJldmVyeS1vdGhlci1kYXlcIjogMixcclxuICB3ZWVrbHk6IDcsXHJcbiAgXCJldmVyeS1vdGhlci13ZWVrXCI6IDE0LFxyXG4gIG1vbnRobHk6IDMwLFxyXG4gIHNlYXNvbmFsOiA5MSxcclxuICB5ZWFybHk6IDM2NSxcclxufTtcclxuZXhwb3J0IGZ1bmN0aW9uIGlzRHVlKGZtOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IGJvb2xlYW4ge1xyXG4gIGNvbnN0IGZyZXEgPSBmbS50aW1lc2NvcGUgYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gIGlmICghZnJlcSkgcmV0dXJuIGZhbHNlO1xyXG4gIGNvbnN0IGludGVydmFsID0gdGltZXNjb3BlX0RBWVNbZnJlcV07XHJcbiAgaWYgKCFpbnRlcnZhbCkgcmV0dXJuIGZhbHNlO1xyXG4gIGNvbnN0IGxhc3QgPSBmbS5sYXN0X2NvbXBsZXRlZCBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgaWYgKCFsYXN0KSByZXR1cm4gdHJ1ZTtcclxuICBjb25zdCBkYXlzU2luY2UgPSBNYXRoLmZsb29yKChuZXcgRGF0ZSh0b2RheSgpKS5nZXRUaW1lKCkgLSBuZXcgRGF0ZShsYXN0KS5nZXRUaW1lKCkpIC8gODY0MDAwMDApO1xyXG4gIHJldHVybiBkYXlzU2luY2UgPj0gaW50ZXJ2YWw7XHJcbn0iLCAiaW1wb3J0IHsgTm90ZVJlY29yZCwgUmVhY3Rpb25EZWZpbml0aW9uLCBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3MsIGdldEFjdGl2ZVJlYWN0aW9ucyB9IGZyb20gXCIuL3R5cGVzXCI7XHJcbmltcG9ydCB7IHRvZGF5IH0gZnJvbSBcIi4vdXRpbHNcIjtcclxuXHJcbmNvbnN0IE1BWF9JTlRFUlZBTCA9IDM2NTsgLy8gZGF5cyBcdTIwMTQgcHJldmVudHMgbm90ZXMgZnJvbSBkaXNhcHBlYXJpbmcgZm9yIHllYXJzICBcclxuY29uc3QgTUlOX0lOVEVSVkFMID0gMTsgICAvLyBkYXlzIFx1MjAxNCBmbG9vciBmb3IgcG9zaXRpdmUgcmVhY3Rpb25zICBcclxuY29uc3QgTUFYX0VBU0UgPSA1MDA7IC8vIHBlcmNlbnRhZ2UgXHUyMDE0IHByZXZlbnRzIHJ1bmF3YXkgYWNjZWxlcmF0aW9uXHJcblxyXG5mdW5jdGlvbiBmb2xkZXJXZWlnaHQoZmlsZXBhdGg6IHN0cmluZywgc2V0dGluZ3M6IFNwYWNlZEV2ZXJ5dGhpbmdTZXR0aW5ncyk6IG51bWJlciB7XHJcbiAgaWYgKHNldHRpbmdzLnNvdXJjZVNjb3BlICE9PSBcImZvbGRlclwiKSByZXR1cm4gMTtcclxuICBjb25zdCBlbnRyeSA9IHNldHRpbmdzLnNvdXJjZUZvbGRlcnMuZmluZCgoZSkgPT4gZmlsZXBhdGguc3RhcnRzV2l0aChlLnBhdGggKyBcIi9cIikpO1xyXG4gIHJldHVybiBlbnRyeSA/IGVudHJ5LndlaWdodCAvIDEwMCA6IDE7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBkYXlzQmV0d2VlbihhOiBzdHJpbmcsIGI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgcmV0dXJuIE1hdGguZmxvb3IoKG5ldyBEYXRlKGIpLmdldFRpbWUoKSAtIG5ldyBEYXRlKGEpLmdldFRpbWUoKSkgLyA4NjQwMDAwMCk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBudW1EYXlzT3ZlcmR1ZShub3RlOiBOb3RlUmVjb3JkKTogbnVtYmVyIHtcclxuICBpZiAobm90ZS5pbnRlcnZhbCA8IDApIHJldHVybiBub3RlLmludGVydmFsO1xyXG4gIGNvbnN0IGRheXNTaW5jZVJldmlld2VkID0gZGF5c0JldHdlZW4obm90ZS5sYXN0UmV2aWV3ZWRPbiwgdG9kYXkoKSk7XHJcbiAgcmV0dXJuIGRheXNTaW5jZVJldmlld2VkIC0gbm90ZS5pbnRlcnZhbDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG5vdGVJc0R1ZShub3RlOiBOb3RlUmVjb3JkKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIG51bURheXNPdmVyZHVlKG5vdGUpID49IDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxlcnAoYTogbnVtYmVyLCBiOiBudW1iZXIsIHQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgcmV0dXJuIGEgKyAoYiAtIGEpICogdDtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVhY3Rpb25UKGlkOiBzdHJpbmcsIHJlYWN0aW9uczogUmVhY3Rpb25EZWZpbml0aW9uW10pOiBudW1iZXIge1xyXG4gIGNvbnN0IGlkeCA9IHJlYWN0aW9ucy5maW5kSW5kZXgoKHIpID0+IHIuaWQgPT09IGlkKTtcclxuICBpZiAoaWR4ID09PSAtMSkgcmV0dXJuIDAuNTsgLy8gdW5rbm93biByZWFjdGlvbiBcdTIxOTIgbmV1dHJhbFxyXG4gIHJldHVybiByZWFjdGlvbnMubGVuZ3RoID09PSAxID8gMC41IDogaWR4IC8gKHJlYWN0aW9ucy5sZW5ndGggLSAxKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG5leHRJbnRlcnZhbChub3RlOiBOb3RlUmVjb3JkLCByZWFjdGlvbjogc3RyaW5nLCByZWFjdGlvbnM6IFJlYWN0aW9uRGVmaW5pdGlvbltdKTogbnVtYmVyIHtcclxuICBjb25zdCB7IGludGVydmFsLCBlYXNlRmFjdG9yIH0gPSBub3RlO1xyXG4gIGlmIChyZWFjdGlvbiA9PT0gXCJza2lwXCIpIHJldHVybiBpbnRlcnZhbDtcclxuICBjb25zdCByZWFjdGlvbkRlZiA9IHJlYWN0aW9ucy5maW5kKChyKSA9PiByLmlkID09PSByZWFjdGlvbik7XHJcbiAgaWYgKHJlYWN0aW9uRGVmPy5tYW51YWxPdmVycmlkZSAmJiByZWFjdGlvbkRlZi5pbnRlcnZhbE11bHQgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIE1hdGgubWluKE1BWF9JTlRFUlZBTCwgTWF0aC5tYXgoTUlOX0lOVEVSVkFMLCBNYXRoLmZsb29yKGludGVydmFsICogcmVhY3Rpb25EZWYuaW50ZXJ2YWxNdWx0KSkpO1xyXG4gIH1cclxuICBjb25zdCBhdXRvUmVhY3Rpb25zID0gcmVhY3Rpb25zLmZpbHRlcigocikgPT4gIXIubWFudWFsT3ZlcnJpZGUpO1xyXG4gIGNvbnN0IHQgPSByZWFjdGlvblQocmVhY3Rpb24sIGF1dG9SZWFjdGlvbnMpO1xyXG4gIGxldCBtOiBudW1iZXI7XHJcbiAgaWYgKHQgPD0gMC41KSB7XHJcbiAgICAvLyBQb3NpdGl2ZSBoYWxmOiBzaHJpbmsgaW50ZXJ2YWwsIG5vIGVhc2VGYWN0b3JcclxuICAgIC8vIHQ9MCBcdTIxOTIgXHUwMEQ3MC41LCB0PTAuNSBcdTIxOTIgXHUwMEQ3MS4wXHJcbiAgICBtID0gbGVycCgwLjUsIDEuMCwgdCAqIDIpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBOZWdhdGl2ZSBoYWxmOiBncm93IGludGVydmFsIHVzaW5nIGVhc2VGYWN0b3JcclxuICAgIC8vIHQ9MC41IFx1MjE5MiBcdTAwRDcxLjAsIHQ9MSBcdTIxOTIgXHUwMEQ3KGVhc2VGYWN0b3IvMTAwKVxyXG4gICAgbSA9IGxlcnAoMS4wLCBlYXNlRmFjdG9yIC8gMTAwLCAodCAtIDAuNSkgKiAyKTtcclxuICB9XHJcbiAgcmV0dXJuIE1hdGgubWluKE1BWF9JTlRFUlZBTCwgTWF0aC5tYXgoTUlOX0lOVEVSVkFMLCBNYXRoLmZsb29yKGludGVydmFsICogbSkpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG5leHRFYXNlRmFjdG9yKG5vdGU6IE5vdGVSZWNvcmQsIHJlYWN0aW9uOiBzdHJpbmcsIHJlYWN0aW9uczogUmVhY3Rpb25EZWZpbml0aW9uW10pOiBudW1iZXIge1xyXG4gaWYgKHJlYWN0aW9uID09PSBcInNraXBcIikgcmV0dXJuIG5vdGUuZWFzZUZhY3RvcjtcclxuICBjb25zdCByZWFjdGlvbkRlZiA9IHJlYWN0aW9ucy5maW5kKChyKSA9PiByLmlkID09PSByZWFjdGlvbik7XHJcbiAgaWYgKHJlYWN0aW9uRGVmPy5tYW51YWxPdmVycmlkZSAmJiByZWFjdGlvbkRlZi5lYXNlRGVsdGEgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIE1hdGgubWluKE1BWF9FQVNFLCBNYXRoLm1heCgxMzAsIG5vdGUuZWFzZUZhY3RvciArIHJlYWN0aW9uRGVmLmVhc2VEZWx0YSkpO1xyXG4gIH1cclxuICBjb25zdCBhdXRvUmVhY3Rpb25zID0gcmVhY3Rpb25zLmZpbHRlcigocikgPT4gIXIubWFudWFsT3ZlcnJpZGUpO1xyXG4gIGNvbnN0IHQgPSByZWFjdGlvblQocmVhY3Rpb24sIGF1dG9SZWFjdGlvbnMpO1xyXG4gIGNvbnN0IGRlbHRhID0gTWF0aC5yb3VuZChsZXJwKDIwLCAtMjAsIHQpKTtcclxuICByZXR1cm4gTWF0aC5taW4oTUFYX0VBU0UsIE1hdGgubWF4KDEzMCwgbm90ZS5lYXNlRmFjdG9yICsgZGVsdGEpKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldER1ZU5vdGVzKG5vdGVzOiBOb3RlUmVjb3JkW10pOiBOb3RlUmVjb3JkW10ge1xyXG4gIHJldHVybiBub3Rlcy5maWx0ZXIobm90ZUlzRHVlKTtcclxufVxyXG5cclxuLy8gV2VpZ2h0ZWQgcmFuZG9tIHNlbGVjdGlvbiBcdTIwMTQgcG9ydCBvZiBnZXRfZXhjaXRpbmdfbm90ZSAvIGdldF9hbGxfb3RoZXJfbm90ZVxyXG5leHBvcnQgZnVuY3Rpb24gd2VpZ2h0ZWRSYW5kb208VD4oY2FuZGlkYXRlczogVFtdLCB3ZWlnaHRzOiBudW1iZXJbXSk6IFQgfCBudWxsIHtcclxuICBpZiAoIWNhbmRpZGF0ZXMubGVuZ3RoKSByZXR1cm4gbnVsbDtcclxuICBjb25zdCB0b3RhbCA9IHdlaWdodHMucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMCk7XHJcbiAgbGV0IHIgPSBNYXRoLnJhbmRvbSgpICogdG90YWw7XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjYW5kaWRhdGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICByIC09IHdlaWdodHNbaV07XHJcbiAgICBpZiAociA8PSAwKSByZXR1cm4gY2FuZGlkYXRlc1tpXTtcclxuICB9XHJcbiAgcmV0dXJuIGNhbmRpZGF0ZXNbY2FuZGlkYXRlcy5sZW5ndGggLSAxXTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBpY2tOb3RlVG9SZXZpZXcobm90ZXM6IE5vdGVSZWNvcmRbXSwgc2V0dGluZ3M6IFNwYWNlZEV2ZXJ5dGhpbmdTZXR0aW5ncyk6IE5vdGVSZWNvcmQgfCBudWxsIHtcclxuICBjb25zdCByYW5kID0gTWF0aC5yYW5kb20oKTtcclxuXHJcbiAgLy8gNTAlIGNoYW5jZTogcmVjZW50bHktY3JlYXRlZCB1bnJldmlld2VkIG5vdGVcclxuICBpZiAocmFuZCA8IHNldHRpbmdzLnJlY2VudFVuZHVlVGhyZXNob2xkKSB7XHJcbiAgICBjb25zdCByZWNlbnRVbnJldmlld2VkID0gbm90ZXMuZmlsdGVyKChuKSA9PiB7XHJcbiAgICAgIGNvbnN0IGFnZSA9IGRheXNCZXR3ZWVuKG4uY3JlYXRlZE9uLCB0b2RheSgpKTtcclxuICAgICAgcmV0dXJuIG4uaW50ZXJ2YWwgPj0gMCAmJiBuLm5vdGVTdGF0ZSA9PT0gXCJub3JtYWxcIiAmJiBhZ2UgPD0gNTAgJiYgbi5yZXZpZXdlZENvdW50ID09PSAwO1xyXG4gICAgfSk7XHJcbiAgICBpZiAocmVjZW50VW5yZXZpZXdlZC5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuIHJlY2VudFVucmV2aWV3ZWRbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcmVjZW50VW5yZXZpZXdlZC5sZW5ndGgpXTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNvbnN0IHJlYWN0aW9ucyA9IGdldEFjdGl2ZVJlYWN0aW9ucyhzZXR0aW5ncyk7XHJcblxyXG4gIC8vIDIwJSBjaGFuY2U6IGZpcnN0LXJlYWN0aW9uIChtb3N0IHBvc2l0aXZlKSBub3RlcyAod2VpZ2h0ZWQgYnkgb3ZlcmR1ZVx1MDBCMilcclxuICBpZiAocmFuZCA8IHNldHRpbmdzLmV4Y2l0aW5nVGhyZXNob2xkKSB7XHJcbiAgICBjb25zdCBleGNpdGluZ0lkID0gcmVhY3Rpb25zWzBdPy5pZCA/PyBcImV4Y2l0aW5nXCI7XHJcbiAgICBjb25zdCBleGNpdGluZyA9IG5vdGVzLmZpbHRlcigobikgPT4gbm90ZUlzRHVlKG4pICYmIG4ubm90ZVN0YXRlID09PSBleGNpdGluZ0lkKTtcclxuICAgIGNvbnN0IHdlaWdodHMgPSBleGNpdGluZy5tYXAoXHJcbiAgICAgIChuKSA9PiBNYXRoLnBvdyhNYXRoLm1heCgxLCBudW1EYXlzT3ZlcmR1ZShuKSksIDIpICogZm9sZGVyV2VpZ2h0KG4uZmlsZXBhdGgsIHNldHRpbmdzKSxcclxuICAgICk7XHJcbiAgICBjb25zdCBwaWNrZWQgPSB3ZWlnaHRlZFJhbmRvbShleGNpdGluZywgd2VpZ2h0cyk7XHJcbiAgICBpZiAocGlja2VkKSByZXR1cm4gcGlja2VkO1xyXG4gIH1cclxuXHJcbiAgLy8gRmFsbGJhY2s6IGFueSBkdWUgbm90ZSwgd2VpZ2h0ZWQgYnkgb3ZlcmR1ZVx1MDBCMiBcdTAwRDcgZm9sZGVyIHF1b3RhXHJcbiAgY29uc3QgYWxsRHVlID0gbm90ZXMuZmlsdGVyKChuKSA9PiBub3RlSXNEdWUobikpO1xyXG4gIGNvbnN0IHdlaWdodHMgPSBhbGxEdWUubWFwKChuKSA9PiB7XHJcbiAgICBsZXQgc3c6IG51bWJlcjtcclxuICAgIGlmIChuLm5vdGVTdGF0ZSA9PT0gXCJub3JtYWxcIikge1xyXG4gICAgICBzdyA9IDEuMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnN0IHQgPSByZWFjdGlvblQobi5ub3RlU3RhdGUsIHJlYWN0aW9ucyk7XHJcbiAgICAgIHN3ID0gbGVycCgxLjUsIDAuMywgdCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gTWF0aC5wb3coTWF0aC5tYXgoMSwgbnVtRGF5c092ZXJkdWUobikpLCAyKSAqIGZvbGRlcldlaWdodChuLmZpbGVwYXRoLCBzZXR0aW5ncykgKiBzdztcclxuICB9KTtcclxuICByZXR1cm4gd2VpZ2h0ZWRSYW5kb20oYWxsRHVlLCB3ZWlnaHRzKTtcclxufVxyXG4iLCAiaW1wb3J0IHsgQXBwLCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBOb3RlUmVjb3JkLCBTcnNSZWNvcmQsIFNwYWNlZEV2ZXJ5dGhpbmdTZXR0aW5ncyB9IGZyb20gXCIuL3R5cGVzXCI7XHJcbmltcG9ydCB7IHRvZGF5IH0gZnJvbSBcIi4vdXRpbHNcIjtcclxuaW1wb3J0IHsgc2F2ZVN0b3JlIH0gZnJvbSBcIi4vc3RvcmVcIjtcclxuaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XHJcblxyXG5mdW5jdGlvbiBkYXlzQWdvKG46IG51bWJlcik6IHN0cmluZyB7XHJcbiAgY29uc3QgZCA9IG5ldyBEYXRlKCk7XHJcbiAgZC5zZXRVVENEYXRlKGQuZ2V0VVRDRGF0ZSgpIC0gbik7XHJcbiAgcmV0dXJuIGQudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XHJcbn1cclxuLy8gXHUyNTAwXHUyNTAwIFJlYWQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVhZE5vdGVSZWNvcmQocGx1Z2luOiBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luLCBmaWxlOiBURmlsZSk6IE5vdGVSZWNvcmQge1xyXG4gIGNvbnN0IGZtID0gcGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXIgPz8ge307XHJcbiAgY29uc3Qgc3RvcmVkID0gcGx1Z2luLmRhdGEubm90ZVJlY29yZHM/LltmaWxlLnBhdGhdO1xyXG4gIGNvbnN0IHsgZGVmYXVsdEVhc2VGYWN0b3IsIGluaXRpYWxJbnRlcnZhbCB9ID0gcGx1Z2luLnNldHRpbmdzO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgZmlsZXBhdGg6IGZpbGUucGF0aCxcclxuICAgIGVhc2VGYWN0b3I6IHN0b3JlZD8uZWFzZUZhY3RvciA/PyBkZWZhdWx0RWFzZUZhY3RvcixcclxuICAgIGludGVydmFsOiBzdG9yZWQ/LmludGVydmFsID8/IGluaXRpYWxJbnRlcnZhbCxcclxuICAgIGxhc3RSZXZpZXdlZE9uOiBzdG9yZWQ/Lmxhc3RSZXZpZXdlZE9uID8/IGRheXNBZ28oaW5pdGlhbEludGVydmFsKSxcclxuICAgIGNyZWF0ZWRPbjogc3RvcmVkPy5jcmVhdGVkT24gPz8gdG9kYXkoKSxcclxuICAgIHJldmlld2VkQ291bnQ6IHN0b3JlZD8ucmV2aWV3ZWRDb3VudCA/PyAwLFxyXG4gICAgbm90ZVN0YXRlOiBzdG9yZWQ/Lm5vdGVTdGF0ZSA/PyBcIm5vcm1hbFwiLFxyXG4gICAgYWN0aXZlOiBmbS5hY3RpdmUsXHJcbiAgICBkZWNrczogZm0uZGVja3MsXHJcbiAgfTtcclxufVxyXG5cclxuLy8gXHUyNTAwXHUyNTAwIFdyaXRlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlTm90ZVJlY29yZChcclxuICBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXHJcbiAgZmlsZXBhdGg6IHN0cmluZyxcclxuICB1cGRhdGVzOiBQYXJ0aWFsPFNyc1JlY29yZD4sXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGlmICghcGx1Z2luLmRhdGEubm90ZVJlY29yZHMpIHBsdWdpbi5kYXRhLm5vdGVSZWNvcmRzID0ge307XHJcbiAgY29uc3QgZXhpc3Rpbmc6IFNyc1JlY29yZCA9IHBsdWdpbi5kYXRhLm5vdGVSZWNvcmRzW2ZpbGVwYXRoXSA/PyB7XHJcbiAgICBlYXNlRmFjdG9yOiBwbHVnaW4uc2V0dGluZ3MuZGVmYXVsdEVhc2VGYWN0b3IsXHJcbiAgICBpbnRlcnZhbDogcGx1Z2luLnNldHRpbmdzLmluaXRpYWxJbnRlcnZhbCxcclxuICAgIGxhc3RSZXZpZXdlZE9uOiBkYXlzQWdvKHBsdWdpbi5zZXR0aW5ncy5pbml0aWFsSW50ZXJ2YWwpLFxyXG4gICAgY3JlYXRlZE9uOiB0b2RheSgpLFxyXG4gICAgcmV2aWV3ZWRDb3VudDogMCxcclxuICAgIG5vdGVTdGF0ZTogXCJub3JtYWxcIixcclxuICB9O1xyXG4gIHBsdWdpbi5kYXRhLm5vdGVSZWNvcmRzW2ZpbGVwYXRoXSA9IHsgLi4uZXhpc3RpbmcsIC4uLnVwZGF0ZXMgfTtcclxuICBhd2FpdCBzYXZlU3RvcmUocGx1Z2luLCBwbHVnaW4uZGF0YSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250bWF0dGVyQWN0aW9uYWJsZShcclxuICBhcHA6IEFwcCxcclxuICBmaWxlcGF0aDogc3RyaW5nLFxyXG4gIG9wdHM6IHsgZW5lcmd5Pzogc3RyaW5nIHwgc3RyaW5nW107IHRpbWVibG9jaz86IHN0cmluZyB8IHN0cmluZ1tdIH0sXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGZpbGUgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZpbGVwYXRoKSBhcyBURmlsZSB8IG51bGw7XHJcbiAgaWYgKCFmaWxlKSByZXR1cm47XHJcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcclxuICAgIGZtLmFjdGl2ZSA9IHRydWU7XHJcbiAgICBpZiAob3B0cy5lbmVyZ3kgIT09IHVuZGVmaW5lZCkgZm0uZW5lcmd5ID0gb3B0cy5lbmVyZ3k7XHJcbiAgICBpZiAob3B0cy50aW1lYmxvY2sgIT09IHVuZGVmaW5lZCkgZm0udGltZWJsb2NrID0gb3B0cy50aW1lYmxvY2s7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250bWF0dGVyU3RhdGUoYXBwOiBBcHAsIGZpbGVwYXRoOiBzdHJpbmcsIHN0YXRlOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBmaWxlID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xyXG4gIGlmICghZmlsZSkgcmV0dXJuO1xyXG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XHJcbiAgICBmbS5zdGF0ZSA9IHN0YXRlO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgVmF1bHQgc2NhbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXROb3Rlc0Zyb21WYXVsdChwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4pOiBOb3RlUmVjb3JkW10ge1xyXG4gIGNvbnN0IGZpbGVzID0gcGx1Z2luLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkuZmlsdGVyKChmKSA9PiB7XHJcbiAgICBpZiAocGx1Z2luLnNldHRpbmdzLnNvdXJjZVNjb3BlID09PSBcImZvbGRlclwiKSB7XHJcbiAgICAgIHJldHVybiBwbHVnaW4uc2V0dGluZ3Muc291cmNlRm9sZGVycy5zb21lKChlKSA9PiBmLnBhdGguc3RhcnRzV2l0aChlLnBhdGggKyBcIi9cIikpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSk7XHJcbiAgcmV0dXJuIGZpbGVzLm1hcCgoZikgPT4gcmVhZE5vdGVSZWNvcmQocGx1Z2luLCBmKSk7XHJcbn1cclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBPbmUtdGltZSBtaWdyYXRpb24gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcblxyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWlncmF0ZVNlVG9TdG9yZShwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBpZiAocGx1Z2luLmRhdGEubm90ZVJlY29yZHMgIT09IHVuZGVmaW5lZCkgcmV0dXJuOyAvLyBhbHJlYWR5IG1pZ3JhdGVkXHJcblxyXG4gIHBsdWdpbi5kYXRhLm5vdGVSZWNvcmRzID0ge307XHJcbiAgY29uc3QgeyBkZWZhdWx0RWFzZUZhY3RvciwgaW5pdGlhbEludGVydmFsIH0gPSBwbHVnaW4uc2V0dGluZ3M7XHJcblxyXG4gIGZvciAoY29uc3QgZmlsZSBvZiBwbHVnaW4uYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKSkge1xyXG4gICAgY29uc3QgZm0gPSBwbHVnaW4uYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlciA/PyB7fTtcclxuICAgIGNvbnN0IG5lc3RlZCA9IGZtLnNlID8/IHt9O1xyXG5cclxuICAgIGNvbnN0IGhhc1NlRGF0YSA9XHJcbiAgICAgIG5lc3RlZC5lYXNlICE9PSB1bmRlZmluZWQgfHxcclxuICAgICAgbmVzdGVkLmludGVydmFsICE9PSB1bmRlZmluZWQgfHxcclxuICAgICAgZm0uc2VfZWFzZSAhPT0gdW5kZWZpbmVkIHx8XHJcbiAgICAgIGZtLnNlX2ludGVydmFsICE9PSB1bmRlZmluZWQgfHxcclxuICAgICAgZm0uc2VfYXJjaGl2ZWQgPT09IHRydWU7XHJcblxyXG4gICAgaWYgKGhhc1NlRGF0YSkge1xyXG4gICAgICBwbHVnaW4uZGF0YS5ub3RlUmVjb3Jkc1tmaWxlLnBhdGhdID0ge1xyXG4gICAgICAgIGVhc2VGYWN0b3I6IG5lc3RlZC5lYXNlID8/IGZtLnNlX2Vhc2UgPz8gZGVmYXVsdEVhc2VGYWN0b3IsXHJcbiAgICAgICAgaW50ZXJ2YWw6IGZtLnNlX2FyY2hpdmVkID09PSB0cnVlID8gLTEgOiAobmVzdGVkLmludGVydmFsID8/IGZtLnNlX2ludGVydmFsID8/IGluaXRpYWxJbnRlcnZhbCksXHJcbiAgICAgICAgbGFzdFJldmlld2VkT246IGZtLnNlX2xhc3RfcmV2aWV3ZWQgPz8gZGF5c0Fnbyhpbml0aWFsSW50ZXJ2YWwpLFxyXG4gICAgICAgIGNyZWF0ZWRPbjogbmVzdGVkLmNyZWF0ZWQgPz8gZm0uc2VfY3JlYXRlZCA/PyB0b2RheSgpLFxyXG4gICAgICAgIHJldmlld2VkQ291bnQ6IG5lc3RlZC5jb3VudCA/PyBmbS5zZV9jb3VudCA/PyAwLFxyXG4gICAgICAgIG5vdGVTdGF0ZTogbmVzdGVkLnN0YXRlID8/IGZtLnNlX3N0YXRlID8/IFwibm9ybWFsXCIsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU3RyaXAgYWxsIHNlIGtleXMgZnJvbSBmcm9udG1hdHRlciByZWdhcmRsZXNzXHJcbiAgICBjb25zdCBoYXNBbnlTZUtleSA9IGhhc1NlRGF0YSB8fCBmbS5zZV9sYXN0X3Jldmlld2VkICE9PSB1bmRlZmluZWQgfHwgZm0uc2VfbmV4dF9yZXZpZXcgIT09IHVuZGVmaW5lZDtcclxuXHJcbiAgICBpZiAoaGFzQW55U2VLZXkpIHtcclxuICAgICAgYXdhaXQgcGx1Z2luLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XHJcbiAgICAgICAgZGVsZXRlIGZtLnNlO1xyXG4gICAgICAgIGRlbGV0ZSBmbS5zZV9lYXNlO1xyXG4gICAgICAgIGRlbGV0ZSBmbS5zZV9pbnRlcnZhbDtcclxuICAgICAgICBkZWxldGUgZm0uc2VfbGFzdF9yZXZpZXdlZDtcclxuICAgICAgICBkZWxldGUgZm0uc2VfY3JlYXRlZDtcclxuICAgICAgICBkZWxldGUgZm0uc2VfY291bnQ7XHJcbiAgICAgICAgZGVsZXRlIGZtLnNlX3N0YXRlO1xyXG4gICAgICAgIGRlbGV0ZSBmbS5zZV9uZXh0X3JldmlldztcclxuICAgICAgICBkZWxldGUgZm0uc2VfYXJjaGl2ZWQ7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXdhaXQgc2F2ZVN0b3JlKHBsdWdpbiwgcGx1Z2luLmRhdGEpO1xyXG59XHJcblxyXG4vLyBcdTI1MDBcdTI1MDAgRnJvbnRtYXR0ZXIgaGVscGVycyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250bWF0dGVyQWN0aXZlKGFwcDogQXBwLCBmaWxlcGF0aDogc3RyaW5nLCBhY3RpdmU6IGJvb2xlYW4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBmaWxlID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xyXG4gIGlmICghZmlsZSkgcmV0dXJuO1xyXG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XHJcbiAgICBmbS5hY3RpdmUgPSBhY3RpdmU7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250bWF0dGVyUmVjdXJyaW5nQ29tcGxldGUoYXBwOiBBcHAsIGZpbGVwYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBmaWxlID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xyXG4gIGlmICghZmlsZSkgcmV0dXJuO1xyXG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XHJcbiAgICBmbS5sYXN0X2NvbXBsZXRlZCA9IHRvZGF5KCk7XHJcbiAgICBmbS5za2lwcGVkID0gMDtcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlRnJvbnRtYXR0ZXJEZWNrcyhhcHA6IEFwcCwgZmlsZXBhdGg6IHN0cmluZywgZGVja3M6IHN0cmluZ1tdKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgZmlsZSA9IGFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZXBhdGgpIGFzIFRGaWxlIHwgbnVsbDtcclxuICBpZiAoIWZpbGUpIHJldHVybjtcclxuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xyXG4gICAgZm0uZGVja3MgPSBkZWNrcztcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwRnJvbnRtYXR0ZXIocmF3OiBzdHJpbmcpOiB7IGZyb250bWF0dGVyOiBzdHJpbmc7IGJvZHk6IHN0cmluZyB9IHtcclxuICBpZiAocmF3LnN0YXJ0c1dpdGgoXCItLS1cIikpIHtcclxuICAgIGNvbnN0IGVuZCA9IHJhdy5pbmRleE9mKFwiXFxuLS0tXCIsIDMpO1xyXG4gICAgaWYgKGVuZCAhPT0gLTEpIHJldHVybiB7IGZyb250bWF0dGVyOiByYXcuc2xpY2UoMCwgZW5kICsgNCksIGJvZHk6IHJhdy5zbGljZShlbmQgKyA0KS50cmltU3RhcnQoKSB9O1xyXG4gIH1cclxuICByZXR1cm4geyBmcm9udG1hdHRlcjogXCJcIiwgYm9keTogcmF3IH07XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250bWF0dGVyU2tpcChhcHA6IEFwcCwgZmlsZXBhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGZpbGUgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZpbGVwYXRoKSBhcyBURmlsZSB8IG51bGw7XHJcbiAgaWYgKCFmaWxlKSByZXR1cm47XHJcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcclxuICAgIGZtLnNraXBwZWQgPSAoZm0uc2tpcHBlZCA/PyAwKSArIDE7XHJcbiAgfSk7XHJcbn0iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCwgVEZpbGUsIENvbXBvbmVudCwgTWFya2Rvd25SZW5kZXJlciwgRXZlbnRSZWYsIEJ1dHRvbkNvbXBvbmVudCwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgQmFzZU5vdGUgfSBmcm9tIFwiLi90eXBlc1wiO1xuaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgeyB3cml0ZUZyb250bWF0dGVyQWN0aXZlLCB3cml0ZUZyb250bWF0dGVyRGVja3MsIHN0cmlwRnJvbnRtYXR0ZXIgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiO1xuaW1wb3J0IHsgUm91dGVGb2xkZXJNb2RhbCB9IGZyb20gXCIuL1JvdXRlRm9sZGVyTW9kYWxcIjtcbmltcG9ydCB7IFF1aWNrTm90ZU1vZGFsIH0gZnJvbSBcIi4vUXVpY2tOb3RlTW9kYWxcIjtcbmltcG9ydCB7IGNyZWF0ZURlY2tEcm9wZG93biB9IGZyb20gXCIuL2RlY2tEcm9wZG93blwiO1xuaW1wb3J0IHsgY3JlYXRlQ002RWRpdG9yLCBnZXRDTTZDb250ZW50LCBkZXN0cm95Q002RWRpdG9yIH0gZnJvbSBcIi4vY202LWVkaXRvclwiO1xuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQmFzZU5vdGVNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgLy8gXHUyNTAwXHUyNTAwIFNoYXJlZCBmaWVsZHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIHByb3RlY3RlZCBjbTZFZGl0TW9kZTogYW55ID0gbnVsbDtcbiAgcHJvdGVjdGVkIGNtNkxlYWY6IGFueSA9IG51bGw7XG5cbiAgcHJvdGVjdGVkIHJlbmRlckNvbXBvbmVudDogQ29tcG9uZW50IHwgbnVsbCA9IG51bGw7XG4gIHByb3RlY3RlZCByZW5kZXJlZENvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJvdGVjdGVkIGVkaXRvckNvbnRhaW5lcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJvdGVjdGVkIGlzRWRpdGluZyA9IGZhbHNlO1xuICBwcm90ZWN0ZWQgdGl0bGVFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgcHJvdGVjdGVkIG9yaWdpbmFsVGl0bGUgPSBcIlwiO1xuICBwcm90ZWN0ZWQgZGVja05hbWUgPSBcIlwiO1xuICBwcm90ZWN0ZWQgc2hvd1Jlc3RhcnRCdXR0b24gPSBmYWxzZTtcbiAgcHJvdGVjdGVkIHByb2dyZXNzQmFyRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XG4gIHByb3RlY3RlZCBmb290ZXJFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgVVNFX0NNNiA9IHRydWU7XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHApIHtcbiAgICBzdXBlcihhcHApO1xuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwIFNoYXJlZCBtZXRob2RzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICBhc3luYyBvbk9wZW4oKSB7XG4gICAgaWYgKCF0aGlzLnNob3VsZE9wZW4oKSkgcmV0dXJuO1xuICAgIGF3YWl0IHRoaXMucmVuZGVyTW9kYWwoKTtcbiAgICB0aGlzLnNldHVwVmF1bHRMaXN0ZW5lcigpO1xuICB9XG4gIHByb3RlY3RlZCBzaG91bGRPcGVuKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZW5kZXJNb2RhbCgpOiBQcm9taXNlPHZvaWQ+O1xuXG4gIHByb3RlY3RlZCBhc3luYyByZW5kZXJNYXJrZG93bkJvZHkoYm9keTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnJlbmRlcmVkQ29udGFpbmVyKSByZXR1cm47XG4gICAgdGhpcy5yZW5kZXJlZENvbnRhaW5lci5lbXB0eSgpO1xuICAgIHRoaXMucmVuZGVyQ29tcG9uZW50Py51bmxvYWQoKTtcbiAgICB0aGlzLnJlbmRlckNvbXBvbmVudCA9IG5ldyBDb21wb25lbnQoKTtcbiAgICB0aGlzLnJlbmRlckNvbXBvbmVudC5sb2FkKCk7XG4gICAgYXdhaXQgTWFya2Rvd25SZW5kZXJlci5yZW5kZXIodGhpcy5hcHAsIGJvZHksIHRoaXMucmVuZGVyZWRDb250YWluZXIsIHRoaXMubm90ZS5maWxlcGF0aCwgdGhpcy5yZW5kZXJDb21wb25lbnQpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJlbmRlck5vdGUoY29udGVudEVsOiBIVE1MRWxlbWVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuY2xlYW51cEVkaXRvcnMoKTtcbiAgICB0aGlzLnJlbmRlckhlYWRlcihjb250ZW50RWwpO1xuICAgIGF3YWl0IHRoaXMucmVuZGVyRXh0cmFDb250ZW50KGNvbnRlbnRFbCk7XG4gICAgYXdhaXQgdGhpcy5yZW5kZXJDb250ZW50KGNvbnRlbnRFbCk7XG4gICAgY29uc3QgZm9vdGVyID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtc3RpY2t5LWZvb3RlclwiIH0pO1xuICAgIHRoaXMuZm9vdGVyRWwgPSBmb290ZXI7XG4gICAgdGhpcy5yZW5kZXJCdXR0b25zKGZvb3Rlcik7XG4gICAgdGhpcy5yZW5kZXJQcm9ncmVzc0Jhcihmb290ZXIpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHJlbmRlckV4dHJhQ29udGVudChjb250ZW50RWw6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIHByb3RlY3RlZCBhYnN0cmFjdCBnZXRTdGF0dXNUZXh0KCk6IHN0cmluZztcbiAgcHJvdGVjdGVkIG9uUmVzdGFydENsaWNrKCk6IHZvaWQge31cbiAgcHJvdGVjdGVkIGFic3RyYWN0IGdldFByb2dyZXNzU2VnbWVudHMoKTogc3RyaW5nW107XG4gIHByb3RlY3RlZCBub3RlITogQmFzZU5vdGU7XG4gIHByb3RlY3RlZCBhYnN0cmFjdCBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW47XG5cbiAgcHJvdGVjdGVkIHJlbmRlclByb2dyZXNzQmFyKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICB0aGlzLnByb2dyZXNzQmFyRWwgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1wcm9ncmVzcy1iYXJcIiB9KTtcbiAgICBjb25zdCBzZWdtZW50cyA9IHRoaXMuZ2V0UHJvZ3Jlc3NTZWdtZW50cygpO1xuICAgIGZvciAoY29uc3Qgc2VnIG9mIHNlZ21lbnRzKSB7XG4gICAgICB0aGlzLnByb2dyZXNzQmFyRWwuY3JlYXRlRGl2KHsgY2xzOiBgc3BhY2VkLXByb2dyZXNzLXNlZyAke3NlZ31gLnRyaW0oKSB9KTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgcmVmcmVzaFByb2dyZXNzQmFyKCk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXR1c0VsID0gdGhpcy5jb250ZW50RWwucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oXCIuc3BhY2VkLWR1ZS1jb3VudFwiKTtcbiAgICBpZiAoc3RhdHVzRWwpIHN0YXR1c0VsLnRleHRDb250ZW50ID0gdGhpcy5nZXRTdGF0dXNUZXh0KCk7XG4gICAgaWYgKCF0aGlzLnByb2dyZXNzQmFyRWwpIHJldHVybjtcbiAgICB0aGlzLnByb2dyZXNzQmFyRWwuZW1wdHkoKTtcbiAgICBjb25zdCBzZWdtZW50cyA9IHRoaXMuZ2V0UHJvZ3Jlc3NTZWdtZW50cygpO1xuICAgIGZvciAoY29uc3Qgc2VnIG9mIHNlZ21lbnRzKSB7XG4gICAgICB0aGlzLnByb2dyZXNzQmFyRWwuY3JlYXRlRGl2KHsgY2xzOiBgc3BhY2VkLXByb2dyZXNzLXNlZyAke3NlZ31gLnRyaW0oKSB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG1ldGFkYXRhRWRpdG9yOiBhbnkgPSBudWxsO1xuXG4gIHByb3RlY3RlZCBhc3luYyByZW5kZXJGcm9udG1hdHRlckVkaXRvcihjb250YWluZXI6IEhUTUxFbGVtZW50LCBmaWxlOiBURmlsZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IE1ldGFkYXRhRWRpdG9yQ2xhc3MgPSB0aGlzLmdldE1ldGFkYXRhRWRpdG9yQ2xhc3MoKTtcbiAgICBjb25zb2xlLmxvZyhcIk1ldGFkYXRhRWRpdG9yQ2xhc3M6XCIsIE1ldGFkYXRhRWRpdG9yQ2xhc3MpO1xuICAgIGlmICghTWV0YWRhdGFFZGl0b3JDbGFzcykgcmV0dXJuO1xuICAgIGNvbnNvbGUubG9nKFwibWV0YWRhdGFFZGl0b3IgaW5zdGFuY2U6XCIsIHRoaXMubWV0YWRhdGFFZGl0b3IpO1xuICAgIGNvbnNvbGUubG9nKFwiY29udGFpbmVyRWw6XCIsIHRoaXMubWV0YWRhdGFFZGl0b3I/LmNvbnRhaW5lckVsKTtcblxuICAgIGNvbnN0IG93bmVyID0ge1xuICAgICAgZ2V0RmlsZTogKCkgPT4gZmlsZSxcbiAgICAgIHNhdmVGcm9udG1hdHRlcjogYXN5bmMgKGZtOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGV4aXN0aW5nKSA9PiB7XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihleGlzdGluZywgZm0pO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgICBnZXRIb3ZlclNvdXJjZTogKCkgPT4gXCJwcmV2aWV3XCIsXG4gICAgICBnZXRNb2RlOiAoKSA9PiBcInByZXZpZXdcIixcbiAgICB9O1xuXG4gICAgdGhpcy5tZXRhZGF0YUVkaXRvciA9IG5ldyBNZXRhZGF0YUVkaXRvckNsYXNzKHRoaXMuYXBwLCBvd25lcik7XG4gICAgdGhpcy5tZXRhZGF0YUVkaXRvci5sb2FkKCk7XG5cbiAgICBjb25zdCByYXdGbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlciA/PyB7fTtcbiAgICBjb25zdCB7IHBvc2l0aW9uOiBfcG9zLCAuLi5mbSB9ID0gcmF3Rm07XG4gICAgdGhpcy5tZXRhZGF0YUVkaXRvci5zeW5jaHJvbml6ZShmbSk7XG5cbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5tZXRhZGF0YUVkaXRvci5jb250YWluZXJFbCk7XG4gICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmFwcGx5SWNvbmljUHJvcGVydHlJY29ucygpLCAwKTtcbiAgfVxuXG4gIHByb3RlY3RlZCByZW5kZXJIZWFkZXIoY29udGVudEVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IHRpdGxlID0gdGhpcy5ub3RlLmZpbGVwYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSEucmVwbGFjZSgvXFwubWQkLywgXCJcIik7XG4gICAgY29uc3QgaGVhZGVyUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtaGVhZGVyLXJvd1wiIH0pO1xuICAgIHRoaXMudGl0bGVFbCA9IGhlYWRlclJvdy5jcmVhdGVFbChcImgxXCIsIHsgdGV4dDogdGl0bGUsIGNsczogXCJzcGFjZWQtbm90ZS10aXRsZVwiIH0pO1xuICAgIHRoaXMub3JpZ2luYWxUaXRsZSA9IHRpdGxlO1xuICAgIHRoaXMudGl0bGVFbC5zcGVsbGNoZWNrID0gZmFsc2U7XG4gICAgdGhpcy50aXRsZUVsLmNvbnRlbnRFZGl0YWJsZSA9IHRoaXMuaXNFZGl0aW5nID8gXCJ0cnVlXCIgOiBcImZhbHNlXCI7XG5cbiAgICB0aGlzLnRpdGxlRWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnNhdmVUaXRsZSgpKTtcblxuICAgIHRoaXMudGl0bGVFbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNFZGl0aW5nKSByZXR1cm47XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMubm90ZS5maWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xuICAgICAgaWYgKGZpbGUpIHZvaWQgdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYodHJ1ZSkub3BlbkZpbGUoZmlsZSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLnRpdGxlRWwuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGUpID0+IHtcbiAgICAgIGlmICghdGhpcy5pc0VkaXRpbmcpIHJldHVybjtcbiAgICAgIGlmIChlLmtleSA9PT0gXCJFbnRlclwiKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy50aXRsZUVsIS5ibHVyKCk7XG4gICAgICB9XG4gICAgICBpZiAoZS5rZXkgPT09IFwiRXNjYXBlXCIpIHtcbiAgICAgICAgdGhpcy50aXRsZUVsIS50ZXh0Q29udGVudCA9IHRoaXMub3JpZ2luYWxUaXRsZTtcbiAgICAgICAgdGhpcy50aXRsZUVsIS5ibHVyKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJkaXZcIiwgeyB0ZXh0OiB0aGlzLmdldFN0YXR1c1RleHQoKSwgY2xzOiBcInNwYWNlZC1kdWUtY291bnRcIiB9KTtcblxuICAgIGNvbnN0IGhlYWRlclJpZ2h0ID0gaGVhZGVyUm93LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtaGVhZGVyLXJpZ2h0XCIgfSk7XG5cbiAgICB0aGlzLnJlbmRlckV4dHJhSGVhZGVyQnV0dG9ucyhoZWFkZXJSaWdodCk7XG5cbiAgICBpZiAodGhpcy5zaG93UmVzdGFydEJ1dHRvbikge1xuICAgICAgY29uc3QgcmVzdGFydEJ0biA9IGhlYWRlclJpZ2h0LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtaGRyLWJ0blwiIH0pO1xuICAgICAgc2V0SWNvbihyZXN0YXJ0QnRuLCBcInJvdGF0ZS1jY3dcIik7XG4gICAgICByZXN0YXJ0QnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJSZXN0YXJ0IHNlc3Npb25cIik7XG4gICAgICByZXN0YXJ0QnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLm9uUmVzdGFydENsaWNrKCkpO1xuICAgIH1cblxuICAgIC8vIEVkaXQgYnV0dG9uIFx1MjAxNCBpbmxpbmUgdG9nZ2xlLCBubyBmdWxsIHJlLXJlbmRlclxuICAgIGNvbnN0IGVkaXRCdG4gPSBoZWFkZXJSaWdodC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWhkci1idG5cIiB9KTtcbiAgICBzZXRJY29uKGVkaXRCdG4sIHRoaXMuaXNFZGl0aW5nID8gXCJleWVcIiA6IFwicGVuY2lsXCIpO1xuICAgIGVkaXRCdG4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCB0aGlzLmlzRWRpdGluZyA/IFwiU3dpdGNoIHRvIHJlYWQgdmlld1wiIDogXCJTd2l0Y2ggdG8gZWRpdCB2aWV3XCIpO1xuICAgIGVkaXRCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcbiAgICAgIGlmICh0aGlzLmlzRWRpdGluZykge1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmVUaXRsZSgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmVCb2R5RWRpdHMoKTtcbiAgICAgICAgdGhpcy5pc0VkaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5mb290ZXJFbD8ucmVtb3ZlQ2xhc3MoXCJzcGFjZWQtZm9vdGVyLWRpc2FibGVkXCIpO1xuICAgICAgICB0aGlzLnRpdGxlRWwhLmNvbnRlbnRFZGl0YWJsZSA9IFwiZmFsc2VcIjtcbiAgICAgICAgaWYgKHRoaXMuZWRpdG9yQ29udGFpbmVyKSB0aGlzLmVkaXRvckNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgIGlmICh0aGlzLnJlbmRlcmVkQ29udGFpbmVyKSB7XG4gICAgICAgICAgdGhpcy5yZW5kZXJlZENvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcbiAgICAgICAgICBjb25zdCB1cGRhdGVkRmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLm5vdGUuZmlsZXBhdGgpIGFzIFRGaWxlIHwgbnVsbDtcbiAgICAgICAgICBpZiAodXBkYXRlZEZpbGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRSYXcgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKHVwZGF0ZWRGaWxlKTtcbiAgICAgICAgICAgIGNvbnN0IHsgYm9keTogdXBkYXRlZEJvZHkgfSA9IHN0cmlwRnJvbnRtYXR0ZXIodXBkYXRlZFJhdyk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlbmRlck1hcmtkb3duQm9keSh1cGRhdGVkQm9keSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMubWV0YWRhdGFFZGl0b3I/LmNvbnRhaW5lckVsLnN0eWxlLnJlbW92ZVByb3BlcnR5KFwiZGlzcGxheVwiKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmFwcGx5SWNvbmljUHJvcGVydHlJY29ucygpLCAwKTtcbiAgICAgICAgc2V0SWNvbihlZGl0QnRuLCBcInBlbmNpbFwiKTtcbiAgICAgICAgZWRpdEJ0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiU3dpdGNoIHRvIGVkaXQgdmlld1wiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaXNFZGl0aW5nID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5mb290ZXJFbD8uYWRkQ2xhc3MoXCJzcGFjZWQtZm9vdGVyLWRpc2FibGVkXCIpO1xuICAgICAgICB0aGlzLnRpdGxlRWwhLmNvbnRlbnRFZGl0YWJsZSA9IFwidHJ1ZVwiO1xuICAgICAgICB0aGlzLnRpdGxlRWwhLmZvY3VzKCk7XG4gICAgICAgIGlmICh0aGlzLnJlbmRlcmVkQ29udGFpbmVyKSB0aGlzLnJlbmRlcmVkQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgaWYgKHRoaXMuZWRpdG9yQ29udGFpbmVyKSB0aGlzLmVkaXRvckNvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgY29uc3QgY20gPSB0aGlzLmNtNkVkaXRNb2RlPy5jbTtcbiAgICAgICAgICBpZiAoIWNtKSByZXR1cm47XG4gICAgICAgICAgY20uZGlzcGF0Y2goe30pOyAvLyBlbXB0eSB0cmFuc2FjdGlvbiBmb3JjZXMgYSBmdWxsIHJlLXJlbmRlciBjeWNsZVxuICAgICAgICAgIGNtLnJlcXVlc3RNZWFzdXJlKCk7XG4gICAgICAgICAgY20uZm9jdXMoKTtcbiAgICAgICAgfSwgMCk7XG4gICAgICAgIHNldEljb24oZWRpdEJ0biwgXCJleWVcIik7XG4gICAgICAgIHRoaXMubWV0YWRhdGFFZGl0b3I/LmNvbnRhaW5lckVsLnN0eWxlLnNldFByb3BlcnR5KFwiZGlzcGxheVwiLCBcIm5vbmVcIik7XG4gICAgICAgIGVkaXRCdG4uc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBcIlN3aXRjaCB0byByZWFkIHZpZXdcIik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBuZXdOb3RlQnRuID0gaGVhZGVyUmlnaHQuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1oZHItYnRuXCIgfSk7XG4gICAgc2V0SWNvbihuZXdOb3RlQnRuLCBcImZpbGUtcGx1c1wiKTtcbiAgICBuZXdOb3RlQnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJOZXcgbm90ZVwiKTtcbiAgICBuZXdOb3RlQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiBuZXcgUXVpY2tOb3RlTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luLCB0aGlzLmRlY2tOYW1lKS5vcGVuKCkpO1xuXG4gICAgY29uc3QgZGVja1dyYXBwZXIgPSBoZWFkZXJSaWdodC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2std3JhcHBlclwiIH0pO1xuICAgIGNvbnN0IGRlY2tCdG4gPSBkZWNrV3JhcHBlci5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2stYnRuXCIgfSk7XG4gICAgc2V0SWNvbihkZWNrQnRuLCBcImxheWVyc1wiKTtcbiAgICBkZWNrQnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJBc3NpZ24gdG8gZGVja3NcIik7XG4gICAgbGV0IGRlY2tEcm9wZG93bjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgZGVja091dHNpZGVIYW5kbGVyOiAoKGU6IE1vdXNlRXZlbnQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gICAgZGVja0J0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICBpZiAoZGVja0Ryb3Bkb3duICYmIGRvY3VtZW50LmNvbnRhaW5zKGRlY2tEcm9wZG93bikpIHtcbiAgICAgICAgZGVja0Ryb3Bkb3duLnJlbW92ZSgpO1xuICAgICAgICBkZWNrRHJvcGRvd24gPSBudWxsO1xuICAgICAgICBpZiAoZGVja091dHNpZGVIYW5kbGVyKSB7XG4gICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBkZWNrT3V0c2lkZUhhbmRsZXIpO1xuICAgICAgICAgIGRlY2tPdXRzaWRlSGFuZGxlciA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3Qgbm90ZUZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZSB8IG51bGw7XG4gICAgICBjb25zdCByYXdEZWNrcyA9IG5vdGVGaWxlID8gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUobm90ZUZpbGUpPy5mcm9udG1hdHRlcj8uZGVja3MgOiB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBpbml0aWFsRGVja3M6IHN0cmluZ1tdID0gQXJyYXkuaXNBcnJheShyYXdEZWNrcylcbiAgICAgICAgPyBbLi4ucmF3RGVja3NdXG4gICAgICAgIDogdHlwZW9mIHJhd0RlY2tzID09PSBcInN0cmluZ1wiICYmIHJhd0RlY2tzXG4gICAgICAgICAgPyBbcmF3RGVja3NdXG4gICAgICAgICAgOiBbXTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGNyZWF0ZURlY2tEcm9wZG93bih0aGlzLmFwcCwgZGVja1dyYXBwZXIsIGluaXRpYWxEZWNrcywgYXN5bmMgKGRlY2tzKSA9PiB7XG4gICAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJEZWNrcyh0aGlzLmFwcCwgdGhpcy5ub3RlLmZpbGVwYXRoLCBkZWNrcyk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXV0b0FjdGl2YXRlTm90ZSgpO1xuICAgICAgfSk7XG4gICAgICBkZWNrRHJvcGRvd24gPSByZXN1bHQuZHJvcGRvd247XG4gICAgICBkZWNrT3V0c2lkZUhhbmRsZXIgPSByZXN1bHQub3V0c2lkZUhhbmRsZXI7XG4gICAgfSk7XG5cbiAgICBjb25zdCBhY3RpdmVDaGVja2JveCA9IGhlYWRlclJpZ2h0LmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyBjbHM6IFwic3BhY2VkLWFjdGl2ZS1jaGVja2JveFwiIH0pO1xuICAgIGFjdGl2ZUNoZWNrYm94LnR5cGUgPSBcImNoZWNrYm94XCI7XG4gICAgY29uc3Qgbm90ZUZpbGVGb3JBY3RpdmUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZSB8IG51bGw7XG4gICAgYWN0aXZlQ2hlY2tib3guY2hlY2tlZCA9IG5vdGVGaWxlRm9yQWN0aXZlXG4gICAgICA/IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKG5vdGVGaWxlRm9yQWN0aXZlKT8uZnJvbnRtYXR0ZXI/LmFjdGl2ZSA9PT0gdHJ1ZVxuICAgICAgOiBmYWxzZTtcbiAgICBhY3RpdmVDaGVja2JveC5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiQWRkIHRvIGFjdGl2ZSBkZWNrXCIpO1xuICAgIGFjdGl2ZUNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbmV3QWN0aXZlID0gYWN0aXZlQ2hlY2tib3guY2hlY2tlZDtcbiAgICAgIHRoaXMubm90ZSA9IHsgLi4udGhpcy5ub3RlLCBhY3RpdmU6IG5ld0FjdGl2ZSB9O1xuICAgICAgYXdhaXQgd3JpdGVGcm9udG1hdHRlckFjdGl2ZSh0aGlzLmFwcCwgdGhpcy5ub3RlLmZpbGVwYXRoLCBuZXdBY3RpdmUpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIHJlbmRlckV4dHJhSGVhZGVyQnV0dG9ucyhoZWFkZXJSaWdodDogSFRNTEVsZW1lbnQpOiB2b2lkIHt9XG4gIHByaXZhdGUgX3ZhdWx0TW9kaWZ5UmVmOiBFdmVudFJlZiB8IG51bGwgPSBudWxsO1xuXG4gIHByb3RlY3RlZCBzZXR1cFZhdWx0TGlzdGVuZXIoKTogdm9pZCB7XG4gICAgdGhpcy5fdmF1bHRNb2RpZnlSZWYgPSB0aGlzLmFwcC52YXVsdC5vbihcIm1vZGlmeVwiLCAoZmlsZSkgPT4ge1xuICAgICAgaWYgKGZpbGUucGF0aCA9PT0gdGhpcy5ub3RlLmZpbGVwYXRoICYmICF0aGlzLmlzRWRpdGluZykge1xuICAgICAgICB2b2lkIHRoaXMucmVmcmVzaENvbnRlbnQoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCB0ZWFyZG93blZhdWx0TGlzdGVuZXIoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX3ZhdWx0TW9kaWZ5UmVmKSB7XG4gICAgICB0aGlzLmFwcC52YXVsdC5vZmZyZWYodGhpcy5fdmF1bHRNb2RpZnlSZWYpO1xuICAgICAgdGhpcy5fdmF1bHRNb2RpZnlSZWYgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIF9NZXRhZGF0YUVkaXRvckNsYXNzOiBhbnkgPSBudWxsO1xuXG4gIHByaXZhdGUgZ2V0TWV0YWRhdGFFZGl0b3JDbGFzcygpOiBhbnkge1xuICAgIGlmIChCYXNlTm90ZU1vZGFsLl9NZXRhZGF0YUVkaXRvckNsYXNzKSByZXR1cm4gQmFzZU5vdGVNb2RhbC5fTWV0YWRhdGFFZGl0b3JDbGFzcztcbiAgICBsZXQgY2xzOiBhbnkgPSBudWxsO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5pdGVyYXRlQWxsTGVhdmVzKChsZWFmKSA9PiB7XG4gICAgICBpZiAoIWNscykgY2xzID0gKGxlYWYudmlldyBhcyBhbnkpPy5tZXRhZGF0YUVkaXRvcj8uY29uc3RydWN0b3I7XG4gICAgfSk7XG4gICAgaWYgKGNscykgQmFzZU5vdGVNb2RhbC5fTWV0YWRhdGFFZGl0b3JDbGFzcyA9IGNscztcbiAgICByZXR1cm4gY2xzID8/IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFwcGx5SWNvbmljUHJvcGVydHlJY29ucygpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubWV0YWRhdGFFZGl0b3I/LmNvbnRhaW5lckVsKSByZXR1cm47XG4gICAgY29uc3QgaWNvbmljID0gKHRoaXMuYXBwIGFzIGFueSkucGx1Z2lucz8ucGx1Z2lucz8uW1wiaWNvbmljXCJdO1xuICAgIGlmICh0eXBlb2YgaWNvbmljPy5wcm9wZXJ0eUljb25NYW5hZ2VyPy5yZWZyZXNoSWNvbnNJbkNvbnRhaW5lciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBpY29uaWMucHJvcGVydHlJY29uTWFuYWdlci5yZWZyZXNoSWNvbnNJbkNvbnRhaW5lcih0aGlzLm1ldGFkYXRhRWRpdG9yLmNvbnRhaW5lckVsKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcmVmcmVzaENvbnRlbnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuaXNFZGl0aW5nIHx8ICF0aGlzLnJlbmRlcmVkQ29udGFpbmVyKSByZXR1cm47XG4gICAgaWYgKHRoaXMucmVuZGVyZWRDb250YWluZXIuY29udGFpbnMoZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkpIHJldHVybjtcbiAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMubm90ZS5maWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xuICAgIGlmICghZmlsZSkgcmV0dXJuO1xuICAgIGNvbnN0IHJhdyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgY29uc3QgeyBib2R5IH0gPSBzdHJpcEZyb250bWF0dGVyKHJhdyk7XG4gICAgYXdhaXQgdGhpcy5yZW5kZXJNYXJrZG93bkJvZHkoYm9keSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgc2F2ZUJvZHlFZGl0cygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuaXNFZGl0aW5nIHx8ICF0aGlzLmNtNkVkaXRNb2RlKSByZXR1cm47XG4gICAgY29uc3QgbmV3Qm9keSA9IGdldENNNkNvbnRlbnQodGhpcy5jbTZFZGl0TW9kZSk7XG4gICAgaWYgKG5ld0JvZHkgPT09IG51bGwpIHJldHVybjtcbiAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMubm90ZS5maWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xuICAgIGlmICghZmlsZSkgcmV0dXJuO1xuICAgIGNvbnN0IHJhdyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XG4gICAgY29uc3QgeyBmcm9udG1hdHRlciwgYm9keSB9ID0gc3RyaXBGcm9udG1hdHRlcihyYXcpO1xuICAgIGlmIChuZXdCb2R5LnRyaW0oKSA9PT0gYm9keS50cmltKCkpIHJldHVybjtcbiAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5tb2RpZnkoZmlsZSwgZnJvbnRtYXR0ZXIgPyBgJHtmcm9udG1hdHRlcn1cXG4ke25ld0JvZHl9YCA6IG5ld0JvZHkpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHNhdmVUaXRsZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuaXNFZGl0aW5nIHx8ICF0aGlzLnRpdGxlRWwpIHJldHVybjtcbiAgICBjb25zdCBuZXdOYW1lID0gKHRoaXMudGl0bGVFbC50ZXh0Q29udGVudCA/PyBcIlwiKS50cmltKCk7XG4gICAgaWYgKCFuZXdOYW1lIHx8IG5ld05hbWUgPT09IHRoaXMub3JpZ2luYWxUaXRsZSkgcmV0dXJuO1xuICAgIGNvbnN0IGYgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZTtcbiAgICBpZiAoIWYpIHJldHVybjtcbiAgICBjb25zdCBkaXIgPSB0aGlzLm5vdGUuZmlsZXBhdGguaW5jbHVkZXMoXCIvXCIpXG4gICAgICA/IHRoaXMubm90ZS5maWxlcGF0aC5zdWJzdHJpbmcoMCwgdGhpcy5ub3RlLmZpbGVwYXRoLmxhc3RJbmRleE9mKFwiL1wiKSlcbiAgICAgIDogXCJcIjtcbiAgICBjb25zdCBuZXdQYXRoID0gZGlyID8gYCR7ZGlyfS8ke25ld05hbWV9Lm1kYCA6IGAke25ld05hbWV9Lm1kYDtcbiAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZW5hbWUoZiwgbmV3UGF0aCk7XG4gICAgdGhpcy5ub3RlID0geyAuLi50aGlzLm5vdGUsIGZpbGVwYXRoOiBuZXdQYXRoIH07XG4gICAgdGhpcy5vcmlnaW5hbFRpdGxlID0gbmV3TmFtZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBhdXRvQWN0aXZhdGVOb3RlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLm5vdGUuYWN0aXZlKSByZXR1cm47XG4gICAgdGhpcy5ub3RlID0geyAuLi50aGlzLm5vdGUsIGFjdGl2ZTogdHJ1ZSB9O1xuICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJBY3RpdmUodGhpcy5hcHAsIHRoaXMubm90ZS5maWxlcGF0aCwgdHJ1ZSk7XG4gICAgY29uc3QgY2IgPSB0aGlzLmNvbnRlbnRFbC5xdWVyeVNlbGVjdG9yPEhUTUxJbnB1dEVsZW1lbnQ+KFwiLnNwYWNlZC1hY3RpdmUtY2hlY2tib3hcIik7XG4gICAgaWYgKGNiKSBjYi5jaGVja2VkID0gdHJ1ZTtcbiAgfVxuXG4gIHByb3RlY3RlZCByb3V0ZU5vdGUoKSB7XG4gICAgbmV3IFJvdXRlRm9sZGVyTW9kYWwodGhpcy5hcHAsIHRoaXMubm90ZSwgdGhpcy5wbHVnaW4sIChuZXdQYXRoKSA9PiB7XG4gICAgICB0aGlzLm5vdGUgPSB7IC4uLnRoaXMubm90ZSwgZmlsZXBhdGg6IG5ld1BhdGggfTtcbiAgICB9KS5vcGVuKCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgY2xlYW51cEVkaXRvcnMoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY202TGVhZikge1xuICAgICAgZGVzdHJveUNNNkVkaXRvcih0aGlzLmNtNkxlYWYpO1xuICAgICAgdGhpcy5jbTZMZWFmID0gbnVsbDtcbiAgICAgIHRoaXMuY202RWRpdE1vZGUgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLnJlbmRlckNvbXBvbmVudD8udW5sb2FkKCk7XG4gICAgdGhpcy5yZW5kZXJDb21wb25lbnQgPSBudWxsO1xuICAgIHRoaXMubWV0YWRhdGFFZGl0b3I/LnVubG9hZCgpO1xuICAgIHRoaXMubWV0YWRhdGFFZGl0b3IgPSBudWxsO1xuICAgIHRoaXMucmVuZGVyZWRDb250YWluZXIgPSBudWxsO1xuICAgIHRoaXMuZWRpdG9yQ29udGFpbmVyID0gbnVsbDtcbiAgfVxuXG4gIHByb3RlY3RlZCBhZGRCdG4oXG4gICAgY29udGFpbmVyOiBIVE1MRWxlbWVudCxcbiAgICBvcHRzOiB7XG4gICAgICBsYWJlbD86IHN0cmluZztcbiAgICAgIGljb24/OiBzdHJpbmc7XG4gICAgICBjbHM6IHN0cmluZztcbiAgICAgIG1vZGlmaWVyPzogc3RyaW5nO1xuICAgICAgdG9vbHRpcD86IHN0cmluZztcbiAgICAgIGNiOiAoKSA9PiB2b2lkO1xuICAgIH0sXG4gICkge1xuICAgIGNvbnN0IGJ0biA9IG5ldyBCdXR0b25Db21wb25lbnQoY29udGFpbmVyKS5vbkNsaWNrKG9wdHMuY2IpO1xuXG4gICAgaWYgKG9wdHMuaWNvbikgYnRuLnNldEljb24ob3B0cy5pY29uKTtcbiAgICBpZiAob3B0cy5sYWJlbCkgYnRuLnNldEJ1dHRvblRleHQob3B0cy5sYWJlbCk7XG4gICAgaWYgKG9wdHMudG9vbHRpcCkgYnRuLnNldFRvb2x0aXAob3B0cy50b29sdGlwKTtcbiAgICBlbHNlIGlmICghb3B0cy5sYWJlbCAmJiBvcHRzLmljb24pIGJ0bi5zZXRUb29sdGlwKG9wdHMuY2xzKTtcblxuICAgIGJ0bi5idXR0b25FbC5hZGRDbGFzcyhcInNwYWNlZC1idG5cIik7XG4gICAgYnRuLmJ1dHRvbkVsLmFkZENsYXNzKGBzcGFjZWQtYnRuLSR7b3B0cy5jbHN9YCk7XG4gICAgaWYgKG9wdHMubW9kaWZpZXIpIGJ0bi5idXR0b25FbC5hZGRDbGFzcyhgbW9kLSR7b3B0cy5tb2RpZmllcn1gKTtcblxuICAgIHJldHVybiBidG47XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgcmVuZGVyQ29udGVudChjb250ZW50RWw6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLm5vdGUuZmlsZXBhdGgpIGFzIFRGaWxlO1xuICAgIGlmICghZmlsZSkge1xuICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBGaWxlIG5vdCBmb3VuZDogJHt0aGlzLm5vdGUuZmlsZXBhdGh9YCB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcmF3ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcbiAgICBjb25zdCB7IGJvZHkgfSA9IHN0cmlwRnJvbnRtYXR0ZXIocmF3KTtcbiAgICBhd2FpdCB0aGlzLnJlbmRlckZyb250bWF0dGVyRWRpdG9yKGNvbnRlbnRFbCwgZmlsZSk7XG5cbiAgICAvLyBSZWFkLW9ubHkgcmVuZGVyZWQgdmlld1xuICAgIHRoaXMucmVuZGVyZWRDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1ub3RlLWNvbnRlbnRcIiB9KTtcbiAgICBhd2FpdCB0aGlzLnJlbmRlck1hcmtkb3duQm9keShib2R5KTtcblxuICAgIHRoaXMuZWRpdG9yQ29udGFpbmVyID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtdGlwdGFwLWNvbnRhaW5lclwiIH0pO1xuXG4gICAgY29uc3QgeyBsZWFmLCBlZGl0TW9kZSB9ID0gYXdhaXQgY3JlYXRlQ002RWRpdG9yKHRoaXMuZWRpdG9yQ29udGFpbmVyLCBmaWxlLCB0aGlzLmFwcCk7XG4gICAgdGhpcy5jbTZMZWFmID0gbGVhZjtcbiAgICB0aGlzLmNtNkVkaXRNb2RlID0gZWRpdE1vZGU7XG5cbiAgICBpZiAodGhpcy5pc0VkaXRpbmcpIHtcbiAgICAgIHRoaXMucmVuZGVyZWRDb250YWluZXIhLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgIHRoaXMuZWRpdG9yQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlbmRlcmVkQ29udGFpbmVyIS5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcbiAgICAgIHRoaXMuZWRpdG9yQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgb25TZXNzaW9uQ2xvc2UoKTogdm9pZCB7fVxuXG4gIHByb3RlY3RlZCBhYnN0cmFjdCByZW5kZXJCdXR0b25zKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkO1xuXG4gIG9uQ2xvc2UoKSB7XG4gICAgdGhpcy50ZWFyZG93blZhdWx0TGlzdGVuZXIoKTtcbiAgICB2b2lkIHRoaXMuc2F2ZVRpdGxlKCk7XG4gICAgdm9pZCB0aGlzLnNhdmVCb2R5RWRpdHMoKTtcbiAgICB0aGlzLm9uU2Vzc2lvbkNsb3NlKCk7XG4gICAgdGhpcy5jbGVhbnVwRWRpdG9ycygpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBBcHAsIFNldHRpbmcsIE1vZGFsLCBOb3RpY2UsIFRGb2xkZXIgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgQmFzZU5vdGUgfSBmcm9tIFwiLi90eXBlc1wiO1xyXG5pbXBvcnQgdHlwZSBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luIGZyb20gXCIuL21haW5cIjtcclxuaW1wb3J0IHsgc2F2ZVN0b3JlIH0gZnJvbSBcIi4vc3RvcmVcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBSb3V0ZUZvbGRlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG4gIHByaXZhdGUgc2VsZWN0ZWRGb2xkZXIgPSBcIlwiO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFwcDogQXBwLFxyXG4gICAgcHJpdmF0ZSBub3RlOiBCYXNlTm90ZSxcclxuICAgIHByaXZhdGUgcGx1Z2luOiBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luLFxyXG4gICAgcHJpdmF0ZSBvbk1vdmVkOiAobmV3UGF0aDogc3RyaW5nKSA9PiB2b2lkLFxyXG4gICkge1xyXG4gICAgc3VwZXIoYXBwKTtcclxuICB9XHJcblxyXG4gIG9uT3BlbigpIHtcclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlJvdXRlIG5vdGUgdG9cdTIwMjZcIiB9KTtcclxuXHJcbiAgICAvLyBcdTI1MDBcdTI1MDAgUXVpY2stcm91dGUgYnV0dG9uIChvbmx5IHNob3duIGlmIGEgbGFzdCBmb2xkZXIgaXMgcmVtZW1iZXJlZCkgXHUyNTAwXHUyNTAwXHJcbiAgICBjb25zdCBsYXN0Rm9sZGVyID0gdGhpcy5wbHVnaW4uZGF0YS5sYXN0Um91dGVkRm9sZGVyO1xyXG4gICAgaWYgKGxhc3RGb2xkZXIpIHtcclxuICAgICAgY29uc3QgcXVpY2tCdG4gPSBjb250ZW50RWwuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG4gICAgICAgIHRleHQ6IGBcdTIxQTkgTW92ZSB0byAke2xhc3RGb2xkZXJ9YCxcclxuICAgICAgICBjbHM6IFwic3BhY2VkLWJ0biBtb2QtY3RhIHNwYWNlZC1idG4tcXVpY2stcm91dGVcIixcclxuICAgICAgfSk7XHJcbiAgICAgIHF1aWNrQnRuLnN0eWxlLm1hcmdpbkJvdHRvbSA9IFwiMTJweFwiO1xyXG4gICAgICBxdWlja0J0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGF3YWl0IHRoaXMuZG9Nb3ZlKGxhc3RGb2xkZXIpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBcdTI1MDBcdTI1MDAgRm9sZGVyIHBpY2tlciBcdTI1MDBcdTI1MDBcclxuICAgIGNvbnN0IGZvbGRlcnMgPSB0aGlzLmFwcC52YXVsdFxyXG4gICAgICAuZ2V0QWxsRm9sZGVycygpXHJcbiAgICAgIC5tYXAoKGYpID0+IGYucGF0aClcclxuICAgICAgLnNvcnQoKTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250ZW50RWwpLnNldE5hbWUoXCJEZXN0aW5hdGlvbiBmb2xkZXJcIikuYWRkRHJvcGRvd24oKGRyb3ApID0+IHtcclxuICAgICAgZHJvcC5hZGRPcHRpb24oXCJcIiwgXCJcdTIwMTQgc2VsZWN0IGEgZm9sZGVyIFx1MjAxNFwiKTtcclxuICAgICAgZm9yIChjb25zdCBmIG9mIGZvbGRlcnMpIHtcclxuICAgICAgICBkcm9wLmFkZE9wdGlvbihmLCBmKTtcclxuICAgICAgfVxyXG4gICAgICBkcm9wLm9uQ2hhbmdlKCh2KSA9PiB7XHJcbiAgICAgICAgdGhpcy5zZWxlY3RlZEZvbGRlciA9IHY7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYnRuUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYnRuLXJvd1wiIH0pO1xyXG5cclxuICAgIGNvbnN0IGNhbmNlbEJ0biA9IGJ0blJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ2FuY2VsXCIgfSk7XHJcbiAgICBjYW5jZWxCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuY2xvc2UoKSk7XHJcblxyXG4gICAgY29uc3QgY29uZmlybUJ0biA9IGJ0blJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiTW92ZVwiLCBjbHM6IFwibW9kLWN0YVwiIH0pO1xyXG4gICAgY29uZmlybUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBpZiAoIXRoaXMuc2VsZWN0ZWRGb2xkZXIpIHJldHVybjtcclxuICAgICAgYXdhaXQgdGhpcy5kb01vdmUodGhpcy5zZWxlY3RlZEZvbGRlcik7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBTaGFyZWQgbW92ZSBsb2dpYyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICBwcml2YXRlIGFzeW5jIGRvTW92ZShmb2xkZXI6IHN0cmluZykge1xyXG4gICAgLy8gQ2hlY2sgZm9sZGVyIHN0aWxsIGV4aXN0c1xyXG4gICAgY29uc3QgZm9sZGVyRXhpc3RzID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKGZvbGRlcikgaW5zdGFuY2VvZiBURm9sZGVyO1xyXG4gICAgaWYgKCFmb2xkZXJFeGlzdHMpIHtcclxuICAgICAgbmV3IE5vdGljZShgRm9sZGVyIFwiJHtmb2xkZXJ9XCIgbm8gbG9uZ2VyIGV4aXN0cy5gKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIG5vdGUgaXNuJ3QgYWxyZWFkeSB0aGVyZVxyXG4gICAgY29uc3QgY3VycmVudEZvbGRlciA9IHRoaXMubm90ZS5maWxlcGF0aC5pbmNsdWRlcyhcIi9cIilcclxuICAgICAgPyB0aGlzLm5vdGUuZmlsZXBhdGguc3Vic3RyaW5nKDAsIHRoaXMubm90ZS5maWxlcGF0aC5sYXN0SW5kZXhPZihcIi9cIikpXHJcbiAgICAgIDogXCJcIjtcclxuICAgIGlmIChjdXJyZW50Rm9sZGVyID09PSBmb2xkZXIpIHtcclxuICAgICAgbmV3IE5vdGljZShgTm90ZSBpcyBhbHJlYWR5IGluIFwiJHtmb2xkZXJ9XCIuYCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaWxlbmFtZSA9IHRoaXMubm90ZS5maWxlcGF0aC5zcGxpdChcIi9cIikucG9wKCkhO1xyXG4gICAgY29uc3QgZGVzdCA9IGAke2ZvbGRlcn0vJHtmaWxlbmFtZX1gO1xyXG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLm5vdGUuZmlsZXBhdGgpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGlmIChmaWxlKSB7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQucmVuYW1lKGZpbGUsIGRlc3QpO1xyXG4gICAgICAgIC8vIFNhdmUgbGFzdCB1c2VkIGZvbGRlclxyXG4gICAgICAgIHRoaXMucGx1Z2luLmRhdGEubGFzdFJvdXRlZEZvbGRlciA9IGZvbGRlcjtcclxuICAgICAgICBhd2FpdCBzYXZlU3RvcmUodGhpcy5wbHVnaW4sIHRoaXMucGx1Z2luLmRhdGEpO1xyXG4gICAgICAgIHRoaXMub25Nb3ZlZChkZXN0KTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICBuZXcgTm90aWNlKGBDb3VsZCBub3QgbW92ZSBub3RlOiAke2UgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6IFN0cmluZyhlKX1gKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuY2xvc2UoKTtcclxuICB9XHJcblxyXG4gIG9uQ2xvc2UoKSB7XHJcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gIH1cclxufVxyXG4iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCwgVEZvbGRlciwgRnV6enlTdWdnZXN0TW9kYWwsIE5vdGljZSwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgdHlwZSBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luIGZyb20gXCIuL21haW5cIjtcclxuaW1wb3J0IHsgd3JpdGVGcm9udG1hdHRlckFjdGl2ZSwgd3JpdGVGcm9udG1hdHRlckRlY2tzIH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcclxuaW1wb3J0IHsgZ2V0QWxsRGVja05hbWVzIH0gZnJvbSBcIi4vdXRpbHNcIjtcclxuaW1wb3J0IHsgY3JlYXRlRGVja0Ryb3Bkb3duIH0gZnJvbSBcIi4vZGVja0Ryb3Bkb3duXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgUXVpY2tOb3RlTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgcHJpdmF0ZSB0aXRsZUlucHV0ITogSFRNTElucHV0RWxlbWVudDtcclxuICBwcml2YXRlIGNvbnRlbnRBcmVhITogSFRNTFRleHRBcmVhRWxlbWVudDtcclxuICBwcml2YXRlIHNlbGVjdGVkRGVja3M6IHN0cmluZ1tdO1xyXG4gIHByaXZhdGUgY3VzdG9tTG9jYXRpb246IHN0cmluZyB8IG51bGwgPSBudWxsO1xyXG4gIHByaXZhdGUgbG9jYXRpb25MYWJlbCE6IEhUTUxTcGFuRWxlbWVudDtcclxuXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBhcHA6IEFwcCxcclxuICAgIHByaXZhdGUgcGx1Z2luOiBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luLFxyXG4gICAgcHJpdmF0ZSBkZWNrTmFtZTogc3RyaW5nID0gXCJcIixcclxuICApIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgICB0aGlzLnNlbGVjdGVkRGVja3MgPSBkZWNrTmFtZSA/IFtkZWNrTmFtZV0gOiBbXTtcclxuICB9XHJcblxyXG4gIG9uT3BlbigpIHtcclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG4gICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiUXVpY2sgbm90ZVwiIH0pO1xyXG5cclxuICAgIHRoaXMudGl0bGVJbnB1dCA9IGNvbnRlbnRFbC5jcmVhdGVFbChcImlucHV0XCIsIHtcclxuICAgICAgdHlwZTogXCJ0ZXh0XCIsXHJcbiAgICAgIHBsYWNlaG9sZGVyOiBcIlRpdGxlXCIsXHJcbiAgICAgIGNsczogXCJzcGFjZWQtcXVpY2tub3RlLXRpdGxlXCIsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNvbnRlbnRBcmVhID0gY29udGVudEVsLmNyZWF0ZUVsKFwidGV4dGFyZWFcIiwge1xyXG4gICAgICBwbGFjZWhvbGRlcjogXCJKb3Qgc29tZXRoaW5nIGRvd24uLi5cIixcclxuICAgICAgY2xzOiBcInNwYWNlZC1xdWlja25vdGUtYm9keVwiLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gXHUyNTAwXHUyNTAwIERlY2sgcm93IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gICAgY29uc3QgZGVja1JvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLXF1aWNrbm90ZS1yb3dcIiB9KTtcclxuXHJcbiAgICBjb25zdCBkZWNrV3JhcHBlciA9IGRlY2tSb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1kZWNrLXdyYXBwZXJcIiB9KTtcclxuICAgIGNvbnN0IGRlY2tCdG4gPSBkZWNrV3JhcHBlci5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2stYnRuXCIgfSk7XHJcbiAgICBzZXRJY29uKGRlY2tCdG4sIFwibGF5ZXJzXCIpO1xyXG4gICAgZGVja0J0bi5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIFwiQXNzaWduIHRvIGRlY2tzXCIpO1xyXG4gICAgY29uc3QgZGVja0xhYmVsID0gZGVja1Jvdy5jcmVhdGVTcGFuKHsgY2xzOiBcInNwYWNlZC1xdWlja25vdGUtZGVjay1sYWJlbFwiIH0pO1xyXG4gICAgdGhpcy51cGRhdGVEZWNrTGFiZWwoZGVja0xhYmVsKTtcclxuXHJcbiAgICBsZXQgZGVja0Ryb3Bkb3duOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG4gICAgZGVja0Ryb3Bkb3duID0gY3JlYXRlRGVja0Ryb3Bkb3duKHRoaXMuYXBwLCBkZWNrV3JhcHBlciwgWy4uLnRoaXMuc2VsZWN0ZWREZWNrc10sIChkZWNrcykgPT4ge1xyXG4gICAgICB0aGlzLnNlbGVjdGVkRGVja3MgPSBbLi4uZGVja3NdO1xyXG4gICAgICB0aGlzLnVwZGF0ZURlY2tMYWJlbChkZWNrTGFiZWwpO1xyXG4gICAgICB0aGlzLnVwZGF0ZUxvY2F0aW9uTGFiZWwoKTtcclxuICAgIH0pLmRyb3Bkb3duO1xyXG5cclxuICAgIC8vIFwiQWRkIHRvIGN1cnJlbnQgZGVja1wiIGNoZWNrYm94IFx1MjAxNCBvbmx5IHNob3duIHdoZW4gb3BlbmVkIGZyb20gQWN0aXZlTW9kYWxcclxuICAgIGlmICh0aGlzLmRlY2tOYW1lKSB7XHJcbiAgICAgIGNvbnN0IGFkZFRvRGVja1JvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLXF1aWNrbm90ZS1yb3dcIiB9KTtcclxuICAgICAgY29uc3QgY2IgPSBhZGRUb0RlY2tSb3cuY3JlYXRlRWwoXCJpbnB1dFwiKTtcclxuICAgICAgY2IudHlwZSA9IFwiY2hlY2tib3hcIjtcclxuICAgICAgY2IuY2hlY2tlZCA9IHRydWU7XHJcbiAgICAgIGFkZFRvRGVja1Jvdy5jcmVhdGVTcGFuKHsgdGV4dDogYEFkZCB0byBcIiR7dGhpcy5kZWNrTmFtZX1cImAgfSk7XHJcbiAgICAgIGNiLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG4gICAgICAgIGlmIChjYi5jaGVja2VkKSB7XHJcbiAgICAgICAgICBpZiAoIXRoaXMuc2VsZWN0ZWREZWNrcy5pbmNsdWRlcyh0aGlzLmRlY2tOYW1lKSkgdGhpcy5zZWxlY3RlZERlY2tzLnB1c2godGhpcy5kZWNrTmFtZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuc2VsZWN0ZWREZWNrcyA9IHRoaXMuc2VsZWN0ZWREZWNrcy5maWx0ZXIoKGQpID0+IGQgIT09IHRoaXMuZGVja05hbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnVwZGF0ZURlY2tMYWJlbChkZWNrTGFiZWwpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlTG9jYXRpb25MYWJlbCgpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBcdTI1MDBcdTI1MDAgTG9jYXRpb24gcm93IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gICAgY29uc3QgbG9jYXRpb25Sb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1xdWlja25vdGUtcm93XCIgfSk7XHJcbiAgICB0aGlzLmxvY2F0aW9uTGFiZWwgPSBsb2NhdGlvblJvdy5jcmVhdGVTcGFuKHsgY2xzOiBcInNwYWNlZC1xdWlja25vdGUtbG9jYXRpb24tbGFiZWxcIiB9KTtcclxuICAgIHRoaXMudXBkYXRlTG9jYXRpb25MYWJlbCgpO1xyXG5cclxuICAgIGNvbnN0IGNob29zZUJ0biA9IGxvY2F0aW9uUm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDaG9vc2Ugb3RoZXIgbG9jYXRpb25cdTIwMjZcIiB9KTtcclxuICAgIGNob29zZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICBuZXcgRm9sZGVyUGlja2VyTW9kYWwodGhpcy5hcHAsIChmb2xkZXJQYXRoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5jdXN0b21Mb2NhdGlvbiA9IGZvbGRlclBhdGg7XHJcbiAgICAgICAgdGhpcy51cGRhdGVMb2NhdGlvbkxhYmVsKCk7XHJcbiAgICAgIH0pLm9wZW4oKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFx1MjUwMFx1MjUwMCBCdXR0b25zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gICAgY29uc3QgYnRuUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYnRuLXJvd1wiIH0pO1xyXG4gICAgYnRuUm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDYW5jZWxcIiB9KS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5jbG9zZSgpKTtcclxuICAgIGJ0blJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ3JlYXRlXCIsIGNsczogXCJtb2QtY3RhXCIgfSkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuY3JlYXRlTm90ZSgpKTtcclxuXHJcbiAgICBjb250ZW50RWwuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGUpID0+IHtcclxuICAgICAgaWYgKChlLmN0cmxLZXkgfHwgZS5tZXRhS2V5KSAmJiBlLmtleSA9PT0gXCJFbnRlclwiKSB7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgIHRoaXMuY3JlYXRlTm90ZSgpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChlLmtleSA9PT0gXCJFc2NhcGVcIikgdGhpcy5jbG9zZSgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy50aXRsZUlucHV0LmZvY3VzKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHVwZGF0ZURlY2tMYWJlbChlbDogSFRNTFNwYW5FbGVtZW50KSB7XHJcbiAgICBlbC50ZXh0Q29udGVudCA9IHRoaXMuc2VsZWN0ZWREZWNrcy5sZW5ndGggPiAwID8gdGhpcy5zZWxlY3RlZERlY2tzLmpvaW4oXCIsIFwiKSA6IFwiTm8gZGVja1wiO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSB1cGRhdGVMb2NhdGlvbkxhYmVsKCkge1xyXG4gICAgaWYgKHRoaXMuY3VzdG9tTG9jYXRpb24gIT09IG51bGwpIHtcclxuICAgICAgdGhpcy5sb2NhdGlvbkxhYmVsLnRleHRDb250ZW50ID0gYFNhdmUgdG86ICR7dGhpcy5jdXN0b21Mb2NhdGlvbn0vYDtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgLy8gQ2hlY2sgaWYgdGhlIHByaW1hcnkgZGVjayBuYW1lIG1hdGNoZXMgYSBmb2xkZXJcclxuICAgIGlmICh0aGlzLnNlbGVjdGVkRGVja3MubGVuZ3RoID4gMCkge1xyXG4gICAgICBjb25zdCBmID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMuc2VsZWN0ZWREZWNrc1swXSk7XHJcbiAgICAgIGlmIChmIGluc3RhbmNlb2YgVEZvbGRlcikge1xyXG4gICAgICAgIHRoaXMubG9jYXRpb25MYWJlbC50ZXh0Q29udGVudCA9IGBTYXZlIHRvOiAke3RoaXMuc2VsZWN0ZWREZWNrc1swXX0vIChkZWNrIGZvbGRlcilgO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgY29uc3QgZGVmYXVsdEZvbGRlciA9IHRoaXMuYXBwLmZpbGVNYW5hZ2VyLmdldE5ld0ZpbGVQYXJlbnQoXCJcIikucGF0aDtcclxuICAgIHRoaXMubG9jYXRpb25MYWJlbC50ZXh0Q29udGVudCA9IGBTYXZlIHRvOiAke2RlZmF1bHRGb2xkZXIgPT09IFwiL1wiID8gXCJ2YXVsdCByb290XCIgOiBkZWZhdWx0Rm9sZGVyICsgXCIvXCJ9YDtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVzb2x2ZUZvbGRlcigpOiBzdHJpbmcge1xyXG4gICAgaWYgKHRoaXMuY3VzdG9tTG9jYXRpb24gIT09IG51bGwpIHJldHVybiB0aGlzLmN1c3RvbUxvY2F0aW9uO1xyXG4gICAgaWYgKHRoaXMuc2VsZWN0ZWREZWNrcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnN0IGYgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5zZWxlY3RlZERlY2tzWzBdKTtcclxuICAgICAgaWYgKGYgaW5zdGFuY2VvZiBURm9sZGVyKSByZXR1cm4gdGhpcy5zZWxlY3RlZERlY2tzWzBdO1xyXG4gICAgfVxyXG4gICAgY29uc3QgcGFyZW50ID0gdGhpcy5hcHAuZmlsZU1hbmFnZXIuZ2V0TmV3RmlsZVBhcmVudChcIlwiKTtcclxuICAgIHJldHVybiBwYXJlbnQucGF0aCA9PT0gXCIvXCIgPyBcIlwiIDogcGFyZW50LnBhdGg7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGNyZWF0ZU5vdGUoKSB7XHJcbiAgICBjb25zdCB0aXRsZSA9IHRoaXMudGl0bGVJbnB1dC52YWx1ZS50cmltKCk7XHJcbiAgICBpZiAoIXRpdGxlKSB7XHJcbiAgICAgIHRoaXMudGl0bGVJbnB1dC5mb2N1cygpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZm9sZGVyID0gdGhpcy5yZXNvbHZlRm9sZGVyKCk7XHJcbiAgICBjb25zdCBwYXRoID0gZm9sZGVyID8gYCR7Zm9sZGVyfS8ke3RpdGxlfS5tZGAgOiBgJHt0aXRsZX0ubWRgO1xyXG4gICAgY29uc3QgYm9keSA9IHRoaXMuY29udGVudEFyZWEudmFsdWUudHJpbSgpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGZpbGUgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jcmVhdGUocGF0aCwgYm9keSA/IGAke2JvZHl9XFxuYCA6IFwiXCIpO1xyXG4gICAgICBpZiAodGhpcy5zZWxlY3RlZERlY2tzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBhd2FpdCB3cml0ZUZyb250bWF0dGVyRGVja3ModGhpcy5hcHAsIGZpbGUucGF0aCwgdGhpcy5zZWxlY3RlZERlY2tzKTtcclxuICAgICAgICBhd2FpdCB3cml0ZUZyb250bWF0dGVyQWN0aXZlKHRoaXMuYXBwLCBmaWxlLnBhdGgsIHRydWUpO1xyXG4gICAgICB9XHJcbiAgICAgIG5ldyBOb3RpY2UoYENyZWF0ZWQgXCIke3RpdGxlfVwiYCk7XHJcbiAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgbmV3IE5vdGljZShgQ291bGQgbm90IGNyZWF0ZSBub3RlOiAkeyhlIGFzIEVycm9yKS5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgb25DbG9zZSgpIHtcclxuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBGb2xkZXJQaWNrZXJNb2RhbCBleHRlbmRzIEZ1enp5U3VnZ2VzdE1vZGFsPFRGb2xkZXI+IHtcclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFwcDogQXBwLFxyXG4gICAgcHJpdmF0ZSBvbkNob29zZTogKHBhdGg6IHN0cmluZykgPT4gdm9pZCxcclxuICApIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgICB0aGlzLnNldFBsYWNlaG9sZGVyKFwiQ2hvb3NlIGEgZm9sZGVyXHUyMDI2XCIpO1xyXG4gIH1cclxuXHJcbiAgZ2V0SXRlbXMoKTogVEZvbGRlcltdIHtcclxuICAgIGNvbnN0IGZvbGRlcnM6IFRGb2xkZXJbXSA9IFtdO1xyXG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuYXBwLnZhdWx0LmdldFJvb3QoKTtcclxuICAgIGNvbnN0IGNvbGxlY3QgPSAoZm9sZGVyOiBURm9sZGVyKSA9PiB7XHJcbiAgICAgIGZvbGRlcnMucHVzaChmb2xkZXIpO1xyXG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGZvbGRlci5jaGlsZHJlbikge1xyXG4gICAgICAgIGlmIChjaGlsZCBpbnN0YW5jZW9mIFRGb2xkZXIpIGNvbGxlY3QoY2hpbGQpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgY29sbGVjdChyb290KTtcclxuICAgIHJldHVybiBmb2xkZXJzO1xyXG4gIH1cclxuXHJcbiAgZ2V0SXRlbVRleHQoZm9sZGVyOiBURm9sZGVyKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBmb2xkZXIucGF0aCA9PT0gXCIvXCIgPyBcIi8gKHZhdWx0IHJvb3QpXCIgOiBmb2xkZXIucGF0aDtcclxuICB9XHJcblxyXG4gIG9uQ2hvb3NlSXRlbShmb2xkZXI6IFRGb2xkZXIpIHtcclxuICAgIHRoaXMub25DaG9vc2UoZm9sZGVyLnBhdGggPT09IFwiL1wiID8gXCJcIiA6IGZvbGRlci5wYXRoKTtcclxuICB9XHJcbn1cclxuIiwgImltcG9ydCB7IEFwcCwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBnZXRBbGxEZWNrTmFtZXMgfSBmcm9tIFwiLi91dGlsc1wiO1xyXG5cclxuLyoqXHJcbiAqIEJ1aWxkcyBhbmQgYXR0YWNoZXMgYSBkZWNrLXBpY2tlciBkcm9wZG93biB0byBgYW5jaG9yYC5cclxuICpcclxuICogQHBhcmFtIGFwcCAgICAgICAgICAgLSBUaGUgT2JzaWRpYW4gQXBwIGluc3RhbmNlXHJcbiAqIEBwYXJhbSBhbmNob3IgICAgICAgIC0gVGhlIGVsZW1lbnQgdGhlIGRyb3Bkb3duIHdpbGwgYmUgYXBwZW5kZWQgdG9cclxuICogQHBhcmFtIGluaXRpYWxEZWNrcyAgLSBUaGUgZGVja3MgYWxyZWFkeSBzZWxlY3RlZCBmb3IgdGhpcyBub3RlXHJcbiAqIEBwYXJhbSBvbkRlY2tzQ2hhbmdlZCAtIENhbGxlZCB3aXRoIHRoZSBuZXcgZGVjayBsaXN0IHdoZW5ldmVyIGl0IGNoYW5nZXNcclxuICpcclxuICogUmV0dXJucyB0aGUgZHJvcGRvd24gZWxlbWVudCBhbmQgdGhlIG91dHNpZGUtY2xpY2sgaGFuZGxlclxyXG4gKiAoc28gdGhlIGNhbGxlciBjYW4gcmVtb3ZlIHRoZSBoYW5kbGVyIGlmIGl0IGNsb3NlcyB0aGUgZHJvcGRvd24gbWFudWFsbHkpLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlY2tEcm9wZG93bihcclxuICBhcHA6IEFwcCxcclxuICBhbmNob3I6IEhUTUxFbGVtZW50LFxyXG4gIGluaXRpYWxEZWNrczogc3RyaW5nW10sXHJcbiAgb25EZWNrc0NoYW5nZWQ6ICh1cGRhdGVkRGVja3M6IHN0cmluZ1tdKSA9PiBQcm9taXNlPHZvaWQ+IHwgdm9pZCxcclxuKTogeyBkcm9wZG93bjogSFRNTEVsZW1lbnQ7IG91dHNpZGVIYW5kbGVyOiAoZTogTW91c2VFdmVudCkgPT4gdm9pZCB9IHtcclxuICBjb25zdCBhbGxEZWNrcyA9IGdldEFsbERlY2tOYW1lcyhhcHApO1xyXG4gIGNvbnN0IGN1cnJlbnREZWNrcyA9IFsuLi5pbml0aWFsRGVja3NdOyAvLyB3b3JrIG9uIGEgY29weVxyXG5cclxuICBjb25zdCBkcm9wZG93biA9IGFuY2hvci5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2stZHJvcGRvd25cIiB9KTtcclxuXHJcbiAgY29uc3Qgc2VhcmNoSW5wdXQgPSBkcm9wZG93bi5jcmVhdGVFbChcImlucHV0XCIpO1xyXG4gIHNlYXJjaElucHV0LnR5cGUgPSBcInRleHRcIjtcclxuICBzZWFyY2hJbnB1dC5wbGFjZWhvbGRlciA9IFwiU2VhcmNoIGRlY2tzXHUyMDI2XCI7XHJcbiAgc2VhcmNoSW5wdXQuYWRkQ2xhc3MoXCJzcGFjZWQtZGVjay1zZWFyY2hcIik7XHJcblxyXG4gIGNvbnN0IGxpc3RFbCA9IGRyb3Bkb3duLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtZGVjay1saXN0XCIgfSk7XHJcblxyXG4gIGNvbnN0IGFkZERlY2sgPSBhc3luYyAobmFtZTogc3RyaW5nKSA9PiB7XHJcbiAgICBjb25zdCB0cmltbWVkID0gbmFtZS50cmltKCk7XHJcbiAgICBpZiAoIXRyaW1tZWQgfHwgY3VycmVudERlY2tzLmluY2x1ZGVzKHRyaW1tZWQpKSByZXR1cm47XHJcbiAgICBjdXJyZW50RGVja3MucHVzaCh0cmltbWVkKTtcclxuICAgIGlmICghYWxsRGVja3MuaW5jbHVkZXModHJpbW1lZCkpIHtcclxuICAgICAgYWxsRGVja3MucHVzaCh0cmltbWVkKTtcclxuICAgICAgYWxsRGVja3Muc29ydCgpO1xyXG4gICAgfVxyXG4gICAgYXdhaXQgb25EZWNrc0NoYW5nZWQoY3VycmVudERlY2tzKTtcclxuICAgIHNlYXJjaElucHV0LnZhbHVlID0gXCJcIjtcclxuICAgIHJlbmRlckxpc3QoXCJcIik7XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgcmVuZGVyTGlzdCA9IChmaWx0ZXI6IHN0cmluZykgPT4ge1xyXG4gICAgbGlzdEVsLmVtcHR5KCk7XHJcbiAgICBjb25zdCBmaWx0ZXJlZCA9IGFsbERlY2tzLmZpbHRlcigoZCkgPT4gZC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGZpbHRlci50b0xvd2VyQ2FzZSgpKSk7XHJcblxyXG4gICAgZm9yIChjb25zdCBkZWNrIG9mIGZpbHRlcmVkKSB7XHJcbiAgICAgIGNvbnN0IGl0ZW0gPSBsaXN0RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1kZWNrLWl0ZW1cIiB9KTtcclxuICAgICAgY29uc3QgY2IgPSBpdGVtLmNyZWF0ZUVsKFwiaW5wdXRcIik7XHJcbiAgICAgIGNiLnR5cGUgPSBcImNoZWNrYm94XCI7XHJcbiAgICAgIGNiLmNoZWNrZWQgPSBjdXJyZW50RGVja3MuaW5jbHVkZXMoZGVjayk7XHJcbiAgICAgIGl0ZW0uY3JlYXRlU3Bhbih7IHRleHQ6IGRlY2sgfSk7XHJcbiAgICAgIGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jIChlKSA9PiB7XHJcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICBjb25zdCBpZHggPSBjdXJyZW50RGVja3MuaW5kZXhPZihkZWNrKTtcclxuICAgICAgICBpZiAoaWR4ID49IDApIHtcclxuICAgICAgICAgIGN1cnJlbnREZWNrcy5zcGxpY2UoaWR4LCAxKTtcclxuICAgICAgICAgIGNiLmNoZWNrZWQgPSBmYWxzZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgY3VycmVudERlY2tzLnB1c2goZGVjayk7XHJcbiAgICAgICAgICBjYi5jaGVja2VkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXdhaXQgb25EZWNrc0NoYW5nZWQoY3VycmVudERlY2tzKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGZpbHRlci50cmltKCkpIHtcclxuICAgICAgY29uc3QgYWRkSXRlbSA9IGxpc3RFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2staXRlbSBzcGFjZWQtZGVjay1hZGRcIiB9KTtcclxuICAgICAgY29uc3QgaWNvbkVsID0gYWRkSXRlbS5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2stYWRkLWljb25cIiB9KTtcclxuICAgICAgc2V0SWNvbihpY29uRWwsIFwiY2lyY2xlLXBsdXNcIik7XHJcbiAgICAgIGFkZEl0ZW0uY3JlYXRlU3Bhbih7IHRleHQ6IGBBZGQgXCIke2ZpbHRlci50cmltKCl9XCJgIH0pO1xyXG4gICAgICBhZGRJdGVtLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgYXN5bmMgKGUpID0+IHtcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICBhd2FpdCBhZGREZWNrKGZpbHRlci50cmltKCkpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICByZW5kZXJMaXN0KFwiXCIpO1xyXG4gIHNlYXJjaElucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoKSA9PiByZW5kZXJMaXN0KHNlYXJjaElucHV0LnZhbHVlKSk7XHJcblxyXG4gIHNlYXJjaElucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGFzeW5jIChlKSA9PiB7XHJcbiAgICBpZiAoZS5rZXkgIT09IFwiRW50ZXJcIikgcmV0dXJuO1xyXG4gICAgY29uc3QgZmlsdGVyID0gc2VhcmNoSW5wdXQudmFsdWUudHJpbSgpO1xyXG4gICAgaWYgKCFmaWx0ZXIpIHJldHVybjtcclxuICAgIGNvbnN0IGZpbHRlcmVkID0gYWxsRGVja3MuZmlsdGVyKChkKSA9PiBkLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoZmlsdGVyLnRvTG93ZXJDYXNlKCkpKTtcclxuICAgIGlmIChmaWx0ZXJlZC5sZW5ndGggPT09IDEpIHtcclxuICAgICAgY29uc3QgZGVjayA9IGZpbHRlcmVkWzBdO1xyXG4gICAgICBjb25zdCBpZHggPSBjdXJyZW50RGVja3MuaW5kZXhPZihkZWNrKTtcclxuICAgICAgaWYgKGlkeCA+PSAwKSBjdXJyZW50RGVja3Muc3BsaWNlKGlkeCwgMSk7XHJcbiAgICAgIGVsc2UgY3VycmVudERlY2tzLnB1c2goZGVjayk7XHJcbiAgICAgIGF3YWl0IG9uRGVja3NDaGFuZ2VkKGN1cnJlbnREZWNrcyk7XHJcbiAgICAgIHJlbmRlckxpc3QoZmlsdGVyKTtcclxuICAgIH0gZWxzZSBpZiAoZmlsdGVyZWQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGF3YWl0IGFkZERlY2soZmlsdGVyKTtcclxuICAgIH1cclxuICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICB9KTtcclxuXHJcbiAgY29uc3Qgb3V0c2lkZUhhbmRsZXIgPSAoZTogTW91c2VFdmVudCkgPT4ge1xyXG4gICAgaWYgKCFkb2N1bWVudC5jb250YWlucyhkcm9wZG93bikgfHwgIWRyb3Bkb3duLmNvbnRhaW5zKGUudGFyZ2V0IGFzIE5vZGUpKSB7XHJcbiAgICAgIGRyb3Bkb3duLnJlbW92ZSgpO1xyXG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG91dHNpZGVIYW5kbGVyKTtcclxuICAgIH1cclxuICB9O1xyXG4gIHNldFRpbWVvdXQoKCkgPT4gZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBvdXRzaWRlSGFuZGxlciksIDApO1xyXG4gIHNlYXJjaElucHV0LmZvY3VzKCk7XHJcbiAgcmV0dXJuIHsgZHJvcGRvd24sIG91dHNpZGVIYW5kbGVyIH07XHJcbn1cclxuIiwgImltcG9ydCB7IEFwcCwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgc3RyaXBGcm9udG1hdHRlciB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7XHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVDTTZFZGl0b3IoXHJcbiAgY29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuICBmaWxlOiBURmlsZSxcclxuICBhcHA6IEFwcCxcclxuKTogUHJvbWlzZTx7IGxlYWY6IGFueTsgZWRpdE1vZGU6IGFueSB9PiB7XHJcbiAgY29uc3QgbGVhZiA9IGFwcC53b3Jrc3BhY2UuZ2V0TGVhZihcInRhYlwiKTtcclxuICBhd2FpdCBsZWFmLm9wZW5GaWxlKGZpbGUsIHsgc3RhdGU6IHsgbW9kZTogXCJzb3VyY2VcIiB9LCBhY3RpdmU6IGZhbHNlIH0pO1xyXG5cclxuICBjb25zdCBlZGl0TW9kZSA9IChsZWFmLnZpZXcgYXMgYW55KS5lZGl0TW9kZTtcclxuICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZWRpdE1vZGUuY20uZG9tKTtcclxuICBlZGl0TW9kZS5jbS5yZXF1ZXN0TWVhc3VyZSgpOyAvLyBmb3JjZSBsYXlvdXQgcmVjYWxjIGluIG5ldyBjb250YWluZXJcclxuXHJcbiAgcmV0dXJuIHsgbGVhZiwgZWRpdE1vZGUgfTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGRlc3Ryb3lDTTZFZGl0b3IobGVhZjogYW55KTogdm9pZCB7XHJcbiAgbGVhZi5kZXRhY2goKTtcclxufVxyXG5cclxuLy8gUmVwbGFjZXMgZXh0cmFjdE1hcmtkb3duKHRpcHRhcEVkaXRvcilcclxuZXhwb3J0IGZ1bmN0aW9uIGdldENNNkNvbnRlbnQoZWRpdE1vZGU6IGFueSk6IHN0cmluZyB7XHJcbiAgY29uc3QgZnVsbCA9IGVkaXRNb2RlLmNtLnN0YXRlLmRvYy50b1N0cmluZygpO1xyXG4gIGNvbnN0IHsgYm9keSB9ID0gc3RyaXBGcm9udG1hdHRlcihmdWxsKTtcclxuICByZXR1cm4gYm9keTtcclxufVxyXG4iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCwgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIHsgRW5lcmd5Q29sb3IgfSBmcm9tIFwiLi90eXBlc1wiO1xyXG5pbXBvcnQgeyB3cml0ZUZyb250bWF0dGVyQWN0aW9uYWJsZSB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7XHJcblxyXG5jb25zdCBFTkVSR1lfT1BUSU9OUzogeyB2YWx1ZTogRW5lcmd5Q29sb3I7IGxhYmVsOiBzdHJpbmc7IGRlc2M6IHN0cmluZyB9W10gPSBbXHJcbiAgeyB2YWx1ZTogXCJcdUQ4M0RcdUREMjVcIiwgbGFiZWw6IFwiXHVEODNEXHVERDI1XCIsIGRlc2M6IFwiVXJnZW50ICsgaGlnaCBlbmVyZ3lcIiB9LFxyXG4gIHsgdmFsdWU6IFwiXHVEODNFXHVERTk0XCIsIGxhYmVsOiBcIlx1RDgzRVx1REU5NFwiLCBkZXNjOiBcIlVyZ2VudCArIGxvdyBlbmVyZ3lcIiB9LFxyXG4gIHsgdmFsdWU6IFwiXHVEODNDXHVERjBBXCIsIGxhYmVsOiBcIlx1RDgzQ1x1REYwQVwiLCBkZXNjOiBcIkZ1biArIGxvdyBlbmVyZ3lcIiB9LFxyXG4gIHsgdmFsdWU6IFwiXHVEODNDXHVERjNGXCIsIGxhYmVsOiBcIlx1RDgzQ1x1REYzRlwiLCBkZXNjOiBcIkZ1biArIGhpZ2ggZW5lcmd5XCIgfSxcclxuXTtcclxuXHJcbmNvbnN0IFRJTUVCTE9DS1MgPSBbXCJtb3JuaW5nXCIsIFwiYWZ0ZXJub29uXCIsIFwiZXZlbmluZ1wiLCBcIm5pZ2h0XCJdO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1ha2VBY3Rpb25hYmxlTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgcHJpdmF0ZSBzZWxlY3RlZEVuZXJneTogRW5lcmd5Q29sb3JbXSA9IFtdO1xyXG4gIHByaXZhdGUgc2VsZWN0ZWRUaW1lYmxvY2tzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFwcDogQXBwLFxyXG4gICAgcHJpdmF0ZSBmaWxlcGF0aDogc3RyaW5nLFxyXG4gICAgcHJpdmF0ZSBvbkNvbmZpcm06ICgpID0+IHZvaWQsXHJcbiAgKSB7XHJcbiAgICBzdXBlcihhcHApO1xyXG4gIH1cclxuXHJcbiAgb25PcGVuKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgIGNvbnN0IG5vdGVUaXRsZSA9IHRoaXMuZmlsZXBhdGguc3BsaXQoXCIvXCIpLnBvcCgpIS5yZXBsYWNlKC9cXC5tZCQvLCBcIlwiKTtcclxuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KGBNYWtlIGFjdGlvbmFibGUgXHUyMDE0ICR7bm90ZVRpdGxlfWApO1xyXG5cclxuICAgIC8vIEVuZXJneVxyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiRW5lcmd5IGxldmVsXCIsIGNsczogXCJzcGFjZWQtbWthLWxhYmVsXCIgfSk7XHJcbiAgICBjb25zdCBlbmVyZ3lSb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1ta2Etcm93XCIgfSk7XHJcbiAgICBmb3IgKGNvbnN0IG9wdCBvZiBFTkVSR1lfT1BUSU9OUykge1xyXG4gICAgICBjb25zdCBidG4gPSBlbmVyZ3lSb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IGBzcGFjZWQtbWthLWJ0biBzcGFjZWQtbWthLSR7b3B0LnZhbHVlfWAgfSk7XHJcbiAgICAgIGJ0bi5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBvcHQubGFiZWwsIGNsczogXCJzcGFjZWQtbWthLWJ0bi1sYWJlbFwiIH0pO1xyXG4gICAgICBidG4uY3JlYXRlRWwoXCJzcGFuXCIsIHsgdGV4dDogb3B0LmRlc2MsIGNsczogXCJzcGFjZWQtbWthLWJ0bi1kZXNjXCIgfSk7XHJcbiAgICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkRW5lcmd5LmluY2x1ZGVzKG9wdC52YWx1ZSkpIHtcclxuICAgICAgICAgIHRoaXMuc2VsZWN0ZWRFbmVyZ3kgPSB0aGlzLnNlbGVjdGVkRW5lcmd5LmZpbHRlcigoZSkgPT4gZSAhPT0gb3B0LnZhbHVlKTtcclxuICAgICAgICAgIGJ0bi5yZW1vdmVDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5zZWxlY3RlZEVuZXJneS5wdXNoKG9wdC52YWx1ZSk7XHJcbiAgICAgICAgICBidG4uYWRkQ2xhc3MoXCJpcy1hY3RpdmVcIik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBUaW1lYmxvY2tcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIlRpbWVibG9ja1wiLCBjbHM6IFwic3BhY2VkLW1rYS1sYWJlbFwiIH0pO1xyXG4gICAgY29uc3QgdGJSb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1ta2Etcm93XCIgfSk7XHJcbiAgICBmb3IgKGNvbnN0IGJsb2NrIG9mIFRJTUVCTE9DS1MpIHtcclxuICAgICAgY29uc3QgYnRuID0gdGJSb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBibG9jaywgY2xzOiBcInNwYWNlZC1ta2EtYnRuXCIgfSk7XHJcbiAgICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkVGltZWJsb2Nrcy5pbmNsdWRlcyhibG9jaykpIHtcclxuICAgICAgICAgIHRoaXMuc2VsZWN0ZWRUaW1lYmxvY2tzID0gdGhpcy5zZWxlY3RlZFRpbWVibG9ja3MuZmlsdGVyKCh0KSA9PiB0ICE9PSBibG9jayk7XHJcbiAgICAgICAgICBidG4ucmVtb3ZlQ2xhc3MoXCJpcy1hY3RpdmVcIik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuc2VsZWN0ZWRUaW1lYmxvY2tzLnB1c2goYmxvY2spO1xyXG4gICAgICAgICAgYnRuLmFkZENsYXNzKFwiaXMtYWN0aXZlXCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29uZmlybSAvIENhbmNlbFxyXG4gICAgY29uc3QgYnRuUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYnRuLXJvd1wiIH0pO1xyXG4gICAgY29uc3QgY29uZmlybUJ0biA9IGJ0blJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiTWFrZSBhY3Rpb25hYmxlXCIsIGNsczogXCJtb2QtY3RhXCIgfSk7XHJcbiAgICBjb25maXJtQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJBY3Rpb25hYmxlKHRoaXMuYXBwLCB0aGlzLmZpbGVwYXRoLCB7XHJcbiAgICAgICAgZW5lcmd5OiB0aGlzLnNlbGVjdGVkRW5lcmd5Lmxlbmd0aCA+IDAgPyB0aGlzLnNlbGVjdGVkRW5lcmd5IDogdW5kZWZpbmVkLFxyXG4gICAgICAgIHRpbWVibG9jazogdGhpcy5zZWxlY3RlZFRpbWVibG9ja3MubGVuZ3RoID4gMCA/IHRoaXMuc2VsZWN0ZWRUaW1lYmxvY2tzIDogdW5kZWZpbmVkLFxyXG4gICAgICB9KTtcclxuICAgICAgbmV3IE5vdGljZShgJHtub3RlVGl0bGV9IG1hcmtlZCBhcyBhY3Rpb25hYmxlYCk7XHJcbiAgICAgIHRoaXMub25Db25maXJtKCk7XHJcbiAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgIH0pO1xyXG4gICAgY29uc3QgY2FuY2VsQnRuID0gYnRuUm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDYW5jZWxcIiB9KTtcclxuICAgIGNhbmNlbEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5jbG9zZSgpKTtcclxuICB9XHJcblxyXG4gIG9uQ2xvc2UoKSB7XHJcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gIH1cclxufVxyXG4iLCAiaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XHJcbmltcG9ydCB7IEFwcCwgTW9kYWwsIE5vdGljZSwgc2V0SWNvbiwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBDdXN0b21SZWFjdGlvblNldCwgRGF5TmFtZSB9IGZyb20gXCIuL3R5cGVzXCI7XHJcblxyXG5jb25zdCBSRUFDVElPTl9SQU1QID0gW1xyXG4gIFwic3BhY2VkLXNlZy1wdXJwbGVcIixcclxuICBcInNwYWNlZC1zZWctYmx1ZVwiLFxyXG4gIFwic3BhY2VkLXNlZy1ncmVlblwiLFxyXG4gIFwic3BhY2VkLXNlZy15ZWxsb3dcIixcclxuICBcInNwYWNlZC1zZWctb3JhbmdlXCIsXHJcbiAgXCJzcGFjZWQtc2VnLXJlZFwiLFxyXG5dO1xyXG5cclxubGV0IF9hY3RpdmVQYWxldHRlSGFuZGxlcjogKChlOiBNb3VzZUV2ZW50KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xyXG5cclxuZnVuY3Rpb24gb3BlbkNvbG9yUGFsZXR0ZShhbmNob3IsIGN1cnJlbnQsIG9uUGljaykge1xyXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuc3BhY2VkLWNvbG9yLXBhbGV0dGVcIikuZm9yRWFjaCgoZWwpID0+IGVsLnJlbW92ZSgpKTtcclxuICAvLyBSZW1vdmUgb2xkIGhhbmRsZXIgYmVmb3JlIHJlZ2lzdGVyaW5nIGEgbmV3IG9uZVxyXG4gIGlmIChfYWN0aXZlUGFsZXR0ZUhhbmRsZXIpIHtcclxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgX2FjdGl2ZVBhbGV0dGVIYW5kbGVyKTtcclxuICAgIF9hY3RpdmVQYWxldHRlSGFuZGxlciA9IG51bGw7XHJcbiAgfVxyXG5cclxuICBjb25zdCBwYWxldHRlID0gZG9jdW1lbnQuYm9keS5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWNvbG9yLXBhbGV0dGVcIiB9KTtcclxuICBjb25zdCByZWN0ID0gYW5jaG9yLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gIHBhbGV0dGUuc3R5bGUudG9wID0gYCR7cmVjdC5ib3R0b20gKyA0fXB4YDtcclxuICBwYWxldHRlLnN0eWxlLmxlZnQgPSBgJHtyZWN0LmxlZnR9cHhgO1xyXG5cclxuICBmb3IgKGNvbnN0IGNscyBvZiBSRUFDVElPTl9SQU1QKSB7XHJcbiAgICBjb25zdCBkb3QgPSBwYWxldHRlLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBgc3BhY2VkLWNvbG9yLWRvdCAke2Nsc31gIH0pO1xyXG4gICAgaWYgKGNscyA9PT0gY3VycmVudCkgZG90LmFkZENsYXNzKFwic3BhY2VkLWNvbG9yLWRvdC0tYWN0aXZlXCIpO1xyXG4gICAgZG90LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgKGUpID0+IHtcclxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICBvblBpY2soY2xzKTtcclxuICAgICAgcGFsZXR0ZS5yZW1vdmUoKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgY29uc3Qgb3V0c2lkZUhhbmRsZXIgPSAoZTogTW91c2VFdmVudCkgPT4ge1xyXG4gICAgaWYgKCFkb2N1bWVudC5jb250YWlucyhwYWxldHRlKSB8fCAhcGFsZXR0ZS5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKSkge1xyXG4gICAgICBwYWxldHRlLnJlbW92ZSgpO1xyXG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG91dHNpZGVIYW5kbGVyKTtcclxuICAgICAgX2FjdGl2ZVBhbGV0dGVIYW5kbGVyID0gbnVsbDtcclxuICAgIH1cclxuICB9O1xyXG4gIF9hY3RpdmVQYWxldHRlSGFuZGxlciA9IG91dHNpZGVIYW5kbGVyO1xyXG4gIHNldFRpbWVvdXQoKCkgPT4gZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBvdXRzaWRlSGFuZGxlciksIDApO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU3BhY2VkRXZlcnl0aGluZ1NldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XHJcbiAgcHJpdmF0ZSBwZW5kaW5nRm9sZGVyID0gXCJcIjtcclxuICBwcml2YXRlIHBlbmRpbmdTZXROYW1lID0gXCJcIjtcclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFwcDogQXBwLFxyXG4gICAgcHJpdmF0ZSBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXHJcbiAgKSB7XHJcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XHJcbiAgfVxyXG5cclxuICBkaXNwbGF5KCk6IHZvaWQge1xyXG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcclxuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJTcGFjZWQgRXZlcnl0aGluZ1wiIH0pO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAuc2V0TmFtZShcIlNvdXJjZSBzY29wZVwiKVxyXG4gICAgICAuc2V0RGVzYyhcIlByb2Nlc3Mgbm90ZXMgZnJvbSB0aGUgd2hvbGUgdmF1bHQgb3IgYSBzcGVjaWZpYyBmb2xkZXIuXCIpXHJcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcCkgPT5cclxuICAgICAgICBkcm9wXHJcbiAgICAgICAgICAuYWRkT3B0aW9uKFwidmF1bHRcIiwgXCJXaG9sZSB2YXVsdFwiKVxyXG4gICAgICAgICAgLmFkZE9wdGlvbihcImZvbGRlclwiLCBcIlNwZWNpZmljIGZvbGRlclwiKVxyXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnNvdXJjZVNjb3BlKVxyXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNvdXJjZVNjb3BlID0gdiBhcyBcInZhdWx0XCIgfCBcImZvbGRlclwiO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XHJcbiAgICAgICAgICB9KSxcclxuICAgICAgKTtcclxuXHJcbiAgICBjb25zdCBmb2xkZXJzID0gdGhpcy5hcHAudmF1bHRcclxuICAgICAgLmdldEFsbEZvbGRlcnMoKVxyXG4gICAgICAubWFwKChmKSA9PiBmLnBhdGgpXHJcbiAgICAgIC5zb3J0KCk7XHJcblxyXG4gICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLnNvdXJjZVNjb3BlID09PSBcImZvbGRlclwiKSB7XHJcbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc291cmNlRm9sZGVycykge1xyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgLnNldE5hbWUoZW50cnkucGF0aClcclxuICAgICAgICAgIC5zZXREZXNjKFwiUmV2aWV3IHF1b3RhIHdlaWdodCAoJSkuIDEwMCA9IGRlZmF1bHQsIGxvd2VyID0gYXBwZWFycyBsZXNzIG9mdGVuLlwiKVxyXG4gICAgICAgICAgLmFkZFNsaWRlcigoc2wpID0+XHJcbiAgICAgICAgICAgIHNsXHJcbiAgICAgICAgICAgICAgLnNldExpbWl0cygxLCAyMDAsIDEpXHJcbiAgICAgICAgICAgICAgLnNldFZhbHVlKGVudHJ5LndlaWdodClcclxuICAgICAgICAgICAgICAuc2V0RHluYW1pY1Rvb2x0aXAoKVxyXG4gICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodikgPT4ge1xyXG4gICAgICAgICAgICAgICAgZW50cnkud2VpZ2h0ID0gdjtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgLmFkZEJ1dHRvbigoYnRuKSA9PlxyXG4gICAgICAgICAgICBidG5cclxuICAgICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIlJlbW92ZVwiKVxyXG4gICAgICAgICAgICAgIC5zZXRXYXJuaW5nKClcclxuICAgICAgICAgICAgICAub25DbGljayhhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zb3VyY2VGb2xkZXJzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Muc291cmNlRm9sZGVycy5maWx0ZXIoXHJcbiAgICAgICAgICAgICAgICAgIChlKSA9PiBlLnBhdGggIT09IGVudHJ5LnBhdGgsXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMucGVuZGluZ0ZvbGRlciA9IFwiXCI7XHJcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgIC5zZXROYW1lKFwiQWRkIHNvdXJjZSBmb2xkZXJcIilcclxuICAgICAgICAuYWRkRHJvcGRvd24oKGRyb3ApID0+IHtcclxuICAgICAgICAgIGRyb3AuYWRkT3B0aW9uKFwiXCIsIFwiXHUyMDE0IHNlbGVjdCBhIGZvbGRlciBcdTIwMTRcIik7XHJcbiAgICAgICAgICBmb3IgKGNvbnN0IGYgb2YgZm9sZGVycykge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLnNvdXJjZUZvbGRlcnMuc29tZSgoZSkgPT4gZS5wYXRoID09PSBmKSkge1xyXG4gICAgICAgICAgICAgIGRyb3AuYWRkT3B0aW9uKGYsIGYpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBkcm9wLm9uQ2hhbmdlKCh2KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucGVuZGluZ0ZvbGRlciA9IHY7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIC5hZGRCdXR0b24oKGJ0bikgPT5cclxuICAgICAgICAgIGJ0bi5zZXRCdXR0b25UZXh0KFwiQWRkXCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wZW5kaW5nRm9sZGVyICYmICF0aGlzLnBsdWdpbi5zZXR0aW5ncy5zb3VyY2VGb2xkZXJzLnNvbWUoKGUpID0+IGUucGF0aCA9PT0gdGhpcy5wZW5kaW5nRm9sZGVyKSkge1xyXG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNvdXJjZUZvbGRlcnMucHVzaCh7IHBhdGg6IHRoaXMucGVuZGluZ0ZvbGRlciwgd2VpZ2h0OiAxMDAgfSk7XHJcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKFwiRXZlcmdyZWVuIGRlc3RpbmF0aW9uIGZvbGRlclwiKVxyXG4gICAgICAuc2V0RGVzYyhcIldoZXJlIHJvdXRlZCBub3RlcyBhcmUgbW92ZWQgdG8uXCIpXHJcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcCkgPT4ge1xyXG4gICAgICAgIGRyb3AuYWRkT3B0aW9uKFwiXCIsIFwiXHUyMDE0IHNlbGVjdCBhIGZvbGRlciBcdTIwMTRcIik7XHJcbiAgICAgICAgZm9yIChjb25zdCBmb2xkZXIgb2YgZm9sZGVycykge1xyXG4gICAgICAgICAgZHJvcC5hZGRPcHRpb24oZm9sZGVyLCBmb2xkZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkcm9wLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZXJncmVlbkZvbGRlcikub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcclxuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV2ZXJncmVlbkZvbGRlciA9IHY7XHJcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKFwiSW5pdGlhbCBpbnRlcnZhbCAoZGF5cylcIilcclxuICAgICAgLnNldERlc2MoXCJIb3cgbWFueSBkYXlzIGJlZm9yZSBhIG5ldyBub3RlIGZpcnN0IGFwcGVhcnMgZm9yIHJldmlldy5cIilcclxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XHJcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MuaW5pdGlhbEludGVydmFsKSkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcclxuICAgICAgICAgIGNvbnN0IG4gPSBwYXJzZUludCh2KTtcclxuICAgICAgICAgIGlmICghaXNOYU4obikgJiYgbiA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaW5pdGlhbEludGVydmFsID0gbjtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSksXHJcbiAgICAgICk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBlYXNlIGZhY3RvciAoJSlcIilcclxuICAgICAgLnNldERlc2MoXCJNdWx0aXBsaWVyIGZvciBpbnRlcnZhbCBncm93dGguIDMwMCA9IDN4IHBlciByZXZpZXcgY3ljbGUuXCIpXHJcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG4gICAgICAgIHRleHQuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRFYXNlRmFjdG9yKSkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcclxuICAgICAgICAgIGNvbnN0IG4gPSBwYXJzZUludCh2KTtcclxuICAgICAgICAgIGlmICghaXNOYU4obikgJiYgbiA+IDApIHtcclxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdEVhc2VGYWN0b3IgPSBuO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KSxcclxuICAgICAgKTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgLnNldE5hbWUoXCJSZW5hbWUgZm9sZGVyIHdoZW4gcmVuYW1pbmcgZGVja1wiKVxyXG4gICAgICAuc2V0RGVzYyhcIklmIGEgZGVjayBoYXMgYSBtYXRjaGluZyBmb2xkZXIsIHJlbmFtZSB0aGUgZm9sZGVyIHRvby5cIilcclxuICAgICAgLmFkZFRvZ2dsZSgodCkgPT5cclxuICAgICAgICB0LnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnJlbmFtZUZvbGRlcldpdGhEZWNrKS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xyXG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVuYW1lRm9sZGVyV2l0aERlY2sgPSB2O1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgfSksXHJcbiAgICAgICk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKFwiUmVjZW50LW5vdGUgcHJpb3JpdHkgdGhyZXNob2xkXCIpXHJcbiAgICAgIC5zZXREZXNjKFwiUHJvYmFiaWxpdHkgKDBcdTIwMTMxKSBvZiB0cnlpbmcgdG8gc2hvdyBhIHJlY2VudGx5LWNyZWF0ZWQgdW5yZXZpZXdlZCBub3RlIGZpcnN0LiBEZWZhdWx0OiAwLjVcIilcclxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XHJcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MucmVjZW50VW5kdWVUaHJlc2hvbGQpKS5vbkNoYW5nZShhc3luYyAodikgPT4ge1xyXG4gICAgICAgICAgY29uc3QgbiA9IHBhcnNlRmxvYXQodik7XHJcbiAgICAgICAgICBpZiAoIWlzTmFOKG4pICYmIG4gPj0gMCAmJiBuIDw9IDEpIHtcclxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MucmVjZW50VW5kdWVUaHJlc2hvbGQgPSBuO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KSxcclxuICAgICAgKTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgLnNldE5hbWUoXCJFeGNpdGluZy1ub3RlIHByaW9yaXR5IHRocmVzaG9sZFwiKVxyXG4gICAgICAuc2V0RGVzYyhcclxuICAgICAgICBcIkN1bXVsYXRpdmUgcHJvYmFiaWxpdHkgKDBcdTIwMTMxKSBvZiB0cnlpbmcgdG8gc2hvdyBhbiBleGNpdGluZyBub3RlLiBNdXN0IGJlID4gcmVjZW50LW5vdGUgdGhyZXNob2xkLiBEZWZhdWx0OiAwLjdcIixcclxuICAgICAgKVxyXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cclxuICAgICAgICB0ZXh0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5leGNpdGluZ1RocmVzaG9sZCkpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBuID0gcGFyc2VGbG9hdCh2KTtcclxuICAgICAgICAgIGlmICghaXNOYU4obikgJiYgbiA+PSAwICYmIG4gPD0gMSkge1xyXG4gICAgICAgICAgICBpZiAobiA8PSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZWNlbnRVbmR1ZVRocmVzaG9sZCkge1xyXG4gICAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJFeGNpdGluZyB0aHJlc2hvbGQgbXVzdCBiZSBncmVhdGVyIHRoYW4gcmVjZW50LW5vdGUgdGhyZXNob2xkLlwiKTtcclxuICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZXhjaXRpbmdUaHJlc2hvbGQgPSBuO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KSxcclxuICAgICAgKTtcclxuXHJcbiAgICAvLyBSZWFjdGlvbiBidXR0b25zXHJcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJSZWFjdGlvbiBidXR0b25zXCIgfSk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKFwiUmVhY3Rpb24gc2V0XCIpXHJcbiAgICAgIC5zZXREZXNjKFwiQ2hvb3NlIHdoaWNoIHJlYWN0aW9uIGJ1dHRvbnMgYXBwZWFyIGR1cmluZyByZXZpZXcuXCIpXHJcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcCkgPT4ge1xyXG4gICAgICAgIGRyb3AuYWRkT3B0aW9uKFwiZGVmYXVsdFwiLCBcIkRlZmF1bHQgKEV4Y2l0aW5nIC8gSW50ZXJlc3RpbmcgLyBcdTIwMjYpXCIpO1xyXG4gICAgICAgIGRyb3AuYWRkT3B0aW9uKFwiYW5raVwiLCBcIkFua2kgKEVhc3kgLyBHb29kIC8gSGFyZCAvIEFnYWluKVwiKTtcclxuICAgICAgICBmb3IgKGNvbnN0IHNldCBvZiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jdXN0b21SZWFjdGlvblNldHMpIHtcclxuICAgICAgICAgIGRyb3AuYWRkT3B0aW9uKHNldC5pZCwgc2V0Lm5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkcm9wLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnJlYWN0aW9uU2V0TW9kZSkub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcclxuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJlYWN0aW9uU2V0TW9kZSA9IHY7XHJcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhY3RpdmVTZXQgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jdXN0b21SZWFjdGlvblNldHMuZmluZChcclxuICAgICAgKHMpID0+IHMuaWQgPT09IHRoaXMucGx1Z2luLnNldHRpbmdzLnJlYWN0aW9uU2V0TW9kZSxcclxuICAgICk7XHJcbiAgICBpZiAoYWN0aXZlU2V0KSB7XHJcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgIC5zZXROYW1lKGBFZGl0OiAke2FjdGl2ZVNldC5uYW1lfWApXHJcbiAgICAgICAgLmFkZEJ1dHRvbigoYnRuKSA9PlxyXG4gICAgICAgICAgYnRuXHJcbiAgICAgICAgICAgIC5zZXRCdXR0b25UZXh0KFwiT3BlbiBlZGl0b3JcIilcclxuICAgICAgICAgICAgLm9uQ2xpY2soKCkgPT4gbmV3IEN1c3RvbVJlYWN0aW9uU2V0TW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luLCBhY3RpdmVTZXQpLm9wZW4oKSksXHJcbiAgICAgICAgKVxyXG4gICAgICAgIC5hZGRCdXR0b24oKGJ0bikgPT5cclxuICAgICAgICAgIGJ0blxyXG4gICAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIkRlbGV0ZVwiKVxyXG4gICAgICAgICAgICAuc2V0V2FybmluZygpXHJcbiAgICAgICAgICAgIC5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jdXN0b21SZWFjdGlvblNldHMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5jdXN0b21SZWFjdGlvblNldHMuZmlsdGVyKFxyXG4gICAgICAgICAgICAgICAgKHMpID0+IHMuaWQgIT09IGFjdGl2ZVNldC5pZCxcclxuICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnJlYWN0aW9uU2V0TW9kZSA9IFwiZGVmYXVsdFwiO1xyXG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucGVuZGluZ1NldE5hbWUgPSBcIlwiO1xyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKFwiQWRkIGN1c3RvbSByZWFjdGlvbiBzZXRcIilcclxuICAgICAgLmFkZFRleHQoKHRleHQpID0+XHJcbiAgICAgICAgdGV4dC5zZXRQbGFjZWhvbGRlcihcIlNldCBuYW1lXCIpLm9uQ2hhbmdlKCh2KSA9PiB7XHJcbiAgICAgICAgICB0aGlzLnBlbmRpbmdTZXROYW1lID0gdjtcclxuICAgICAgICB9KSxcclxuICAgICAgKVxyXG4gICAgICAuYWRkQnV0dG9uKChidG4pID0+XHJcbiAgICAgICAgYnRuLnNldEJ1dHRvblRleHQoXCJBZGRcIikub25DbGljayhhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBuYW1lID0gdGhpcy5wZW5kaW5nU2V0TmFtZS50cmltKCk7XHJcbiAgICAgICAgICBpZiAoIW5hbWUpIHJldHVybjtcclxuICAgICAgICAgIGNvbnN0IGlkID0gbmFtZS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1xccysvZywgXCItXCIpO1xyXG4gICAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbVJlYWN0aW9uU2V0cy5zb21lKChzKSA9PiBzLmlkID09PSBpZCkpIHtcclxuICAgICAgICAgICAgbmV3IE5vdGljZShgQSBzZXQgd2l0aCBpZCBcIiR7aWR9XCIgYWxyZWFkeSBleGlzdHMuYCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmN1c3RvbVJlYWN0aW9uU2V0cy5wdXNoKHsgaWQsIG5hbWUsIHJlYWN0aW9uczogW10gfSk7XHJcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZWFjdGlvblNldE1vZGUgPSBpZDtcclxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XHJcbiAgICAgICAgfSksXHJcbiAgICAgICk7XHJcblxyXG4gICAgLy8gU3lzdGVtXHJcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJTeXN0ZW1cIiB9KTtcclxuXHJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgLnNldE5hbWUoXCJXZWVrZW5kIGRheXNcIilcclxuICAgICAgLnNldERlc2MoXCJEYXlzIHRyZWF0ZWQgYXMgd2Vla2VuZCBmb3IgY29udGV4dCBhdXRvLWRldGVjdGlvbiBpbiBTeXN0ZW0gbW9kYWwuXCIpXHJcbiAgICAgIC50aGVuKChzZXR0aW5nKSA9PiB7XHJcbiAgICAgICAgY29uc3QgZGF5czogRGF5TmFtZVtdID0gW1wiU3VuXCIsIFwiTW9uXCIsIFwiVHVlXCIsIFwiV2VkXCIsIFwiVGh1XCIsIFwiRnJpXCIsIFwiU2F0XCJdO1xyXG4gICAgICAgIGNvbnN0IHJvdyA9IHNldHRpbmcuY29udHJvbEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtZGF5LXRvZ2dsZS1yb3dcIiB9KTtcclxuICAgICAgICBmb3IgKGNvbnN0IGRheSBvZiBkYXlzKSB7XHJcbiAgICAgICAgICBjb25zdCBidG4gPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBkYXksIGNsczogXCJzcGFjZWQtZGF5LXRvZ2dsZVwiIH0pO1xyXG4gICAgICAgICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLndlZWtlbmREYXlzLmluY2x1ZGVzKGRheSkpIGJ0bi5hZGRDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuICAgICAgICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3Mud2Vla2VuZERheXM7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50LmluY2x1ZGVzKGRheSkpIHtcclxuICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrZW5kRGF5cyA9IGN1cnJlbnQuZmlsdGVyKChkKSA9PiBkICE9PSBkYXkpO1xyXG4gICAgICAgICAgICAgIGJ0bi5yZW1vdmVDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy53ZWVrZW5kRGF5cyA9IFsuLi5jdXJyZW50LCBkYXldO1xyXG4gICAgICAgICAgICAgIGJ0bi5hZGRDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiTm90ZSBzdGF0ZSB2YWx1ZXNcIiB9KTtcclxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XHJcbiAgICAgIHRleHQ6IFwiVmFsdWVzIGF2YWlsYWJsZSBpbiB0aGUgc3RhdGUgYmFkZ2UgZHJvcGRvd24gZHVyaW5nIHJldmlldy5cIixcclxuICAgICAgY2xzOiBcInNldHRpbmctaXRlbS1kZXNjcmlwdGlvblwiLFxyXG4gICAgfSk7XHJcblxyXG4gICAgZm9yIChjb25zdCB2YWwgb2YgdGhpcy5wbHVnaW4uc2V0dGluZ3Mubm90ZVN0YXRlVmFsdWVzKSB7XHJcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKHZhbCkuYWRkQnV0dG9uKChidG4pID0+XHJcbiAgICAgICAgYnRuXHJcbiAgICAgICAgICAuc2V0QnV0dG9uVGV4dChcIlJlbW92ZVwiKVxyXG4gICAgICAgICAgLnNldFdhcm5pbmcoKVxyXG4gICAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub3RlU3RhdGVWYWx1ZXMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub3RlU3RhdGVWYWx1ZXMuZmlsdGVyKCh2KSA9PiB2ICE9PSB2YWwpO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XHJcbiAgICAgICAgICB9KSxcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgcGVuZGluZ1N0YXRlVmFsdWUgPSBcIlwiO1xyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKFwiQWRkIHN0YXRlIHZhbHVlXCIpXHJcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG4gICAgICAgIHRleHQuc2V0UGxhY2Vob2xkZXIoXCJlLmcuIGluY3ViYXRpbmdcIikub25DaGFuZ2UoKHYpID0+IHtcclxuICAgICAgICAgIHBlbmRpbmdTdGF0ZVZhbHVlID0gdjtcclxuICAgICAgICB9KSxcclxuICAgICAgKVxyXG4gICAgICAuYWRkQnV0dG9uKChidG4pID0+XHJcbiAgICAgICAgYnRuLnNldEJ1dHRvblRleHQoXCJBZGRcIikub25DbGljayhhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCB0cmltbWVkID0gcGVuZGluZ1N0YXRlVmFsdWUudHJpbSgpO1xyXG4gICAgICAgICAgaWYgKCF0cmltbWVkKSByZXR1cm47XHJcbiAgICAgICAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3Mubm90ZVN0YXRlVmFsdWVzLmluY2x1ZGVzKHRyaW1tZWQpKSB7XHJcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYFwiJHt0cmltbWVkfVwiIGFscmVhZHkgZXhpc3RzLmApO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ub3RlU3RhdGVWYWx1ZXMucHVzaCh0cmltbWVkKTtcclxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XHJcbiAgICAgICAgfSksXHJcbiAgICAgICk7XHJcblxyXG4gICAgLy8gRGFuZ2VyIHpvbmVcclxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkRhbmdlciBab25lXCIgfSk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKFwiUmVzZXQgYWxsIHNjaGVkdWxpbmcgZGF0YVwiKVxyXG4gICAgICAuc2V0RGVzYyhcclxuICAgICAgICBcIlBlcm1hbmVudGx5IGRlbGV0ZXMgYWxsIHJldmlldyBoaXN0b3J5LCBpbnRlcnZhbHMsIGFuZCBub3RlIHN0YXRlcy4gXCIgK1xyXG4gICAgICAgICAgXCJZb3VyIG5vdGUgZmlsZXMgYXJlIG5vdCBhZmZlY3RlZC4gVGhpcyBjYW5ub3QgYmUgdW5kb25lLlwiLFxyXG4gICAgICApXHJcbiAgICAgIC5hZGRCdXR0b24oKGJ0bikgPT5cclxuICAgICAgICBidG5cclxuICAgICAgICAgIC5zZXRCdXR0b25UZXh0KFwiUmVzZXQgZGF0YVwiKVxyXG4gICAgICAgICAgLnNldFdhcm5pbmcoKVxyXG4gICAgICAgICAgLm9uQ2xpY2soKCkgPT4gbmV3IFJlc2V0Q29uZmlybU1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbikub3BlbigpKSxcclxuICAgICAgKTtcclxuICB9XHJcbn1cclxuXHJcbmNsYXNzIFJlc2V0Q29uZmlybU1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgYXBwOiBBcHAsXHJcbiAgICBwcml2YXRlIHBsdWdpbjogU3BhY2VkRXZlcnl0aGluZ1BsdWdpbixcclxuICApIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgfVxyXG5cclxuICBvbk9wZW4oKSB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJSZXNldCBhbGwgc2NoZWR1bGluZyBkYXRhP1wiIH0pO1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7XHJcbiAgICAgIHRleHQ6XHJcbiAgICAgICAgXCJUaGlzIHdpbGwgcGVybWFuZW50bHkgZGVsZXRlIGFsbCByZXZpZXcgaGlzdG9yeSwgaW50ZXJ2YWxzLCBhbmQgc2NoZWR1bGluZyBcIiArXHJcbiAgICAgICAgXCJkYXRhIGZvciBldmVyeSBub3RlLiBZb3VyIGFjdHVhbCBub3RlIGZpbGVzIHdpbGwgbm90IGJlIHRvdWNoZWQuIFwiICtcclxuICAgICAgICBcIkFmdGVyIHJlc2V0LCBhbGwgbm90ZXMgd2lsbCBiZSByZS1pbXBvcnRlZCBvbiB0aGUgbmV4dCBzeW5jLlwiLFxyXG4gICAgfSk7XHJcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuICAgICAgdGV4dDogXCJUaGlzIGNhbm5vdCBiZSB1bmRvbmUuXCIsXHJcbiAgICAgIGNsczogXCJzcGFjZWQtcmVzZXQtd2FybmluZ1wiLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYnRuUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYnRuLXJvd1wiIH0pO1xyXG5cclxuICAgIGNvbnN0IGNhbmNlbEJ0biA9IGJ0blJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiQ2FuY2VsXCIgfSk7XHJcbiAgICBjYW5jZWxCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHRoaXMuY2xvc2UoKSk7XHJcblxyXG4gICAgY29uc3QgY29uZmlybUJ0biA9IGJ0blJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7XHJcbiAgICAgIHRleHQ6IFwiUmVzZXQgZXZlcnl0aGluZ1wiLFxyXG4gICAgICBjbHM6IFwibW9kLXdhcm5pbmdcIixcclxuICAgIH0pO1xyXG4gICAgY29uZmlybUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5yZXNldERhdGEoKTtcclxuICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBvbkNsb3NlKCkge1xyXG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuICB9XHJcbn1cclxuXHJcbmNsYXNzIEN1c3RvbVJlYWN0aW9uU2V0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBhcHA6IEFwcCxcclxuICAgIHByaXZhdGUgcGx1Z2luOiBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luLFxyXG4gICAgcHJpdmF0ZSBzZXQ6IEN1c3RvbVJlYWN0aW9uU2V0LFxyXG4gICkge1xyXG4gICAgc3VwZXIoYXBwKTtcclxuICB9XHJcblxyXG4gIG9uT3BlbigpIHtcclxuICAgIHRoaXMubW9kYWxFbC5hZGRDbGFzcyhcInNwYWNlZC1yZWFjdGlvbi1wYW5lbFwiKTtcclxuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KHRoaXMuc2V0Lm5hbWUpO1xyXG4gICAgdGhpcy5yZW5kZXJSZWFjdGlvbnMoKTtcclxuICB9XHJcblxyXG4gIHJlbmRlclJlYWN0aW9ucygpIHtcclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG4gICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgICBjb25zdCByZWFjdGlvbnMgPSB0aGlzLnNldC5yZWFjdGlvbnM7XHJcblxyXG4gICAgY29uc3QgbGlzdCA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLXJlYWN0aW9uLWxpc3RcIiB9KTtcclxuXHJcbiAgICByZWFjdGlvbnMuZm9yRWFjaCgociwgaSkgPT4ge1xyXG4gICAgICBjb25zdCBhdXRvUmVhY3Rpb25zID0gcmVhY3Rpb25zLmZpbHRlcigocngpID0+ICFyeC5tYW51YWxPdmVycmlkZSk7XHJcbiAgICAgIGNvbnN0IGF1dG9OID0gYXV0b1JlYWN0aW9ucy5sZW5ndGg7XHJcbiAgICAgIGNvbnN0IGF1dG9JZHggPSBhdXRvUmVhY3Rpb25zLmZpbmRJbmRleCgocngpID0+IHJ4LmlkID09PSByLmlkKTtcclxuICAgICAgY29uc3QgdEF1dG8gPSBhdXRvTiA8PSAxID8gMC41IDogYXV0b0lkeCAvIChhdXRvTiAtIDEpO1xyXG4gICAgICBjb25zdCB0RnVsbCA9IHJlYWN0aW9ucy5sZW5ndGggPT09IDEgPyAwLjUgOiBpIC8gKHJlYWN0aW9ucy5sZW5ndGggLSAxKTtcclxuICAgICAgY29uc3QgdCA9IHIubWFudWFsT3ZlcnJpZGUgPyB0RnVsbCA6IHRBdXRvO1xyXG4gICAgICBjb25zdCBtYXhNdWx0ID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdEVhc2VGYWN0b3IgLyAxMDA7XHJcbiAgICAgIGNvbnN0IG11bHQgPSB0IDw9IDAuNSA/IDAuNSArIDAuNSAqICh0ICogMikgOiAxLjAgKyAobWF4TXVsdCAtIDEuMCkgKiAoKHQgLSAwLjUpICogMik7XHJcbiAgICAgIGNvbnN0IGVhc2VEZWx0YSA9IE1hdGgucm91bmQoMjAgLSA0MCAqIHQpO1xyXG4gICAgICBjb25zdCBzaWduID0gZWFzZURlbHRhID49IDAgPyBcIitcIiA6IFwiXCI7XHJcblxyXG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtcmVhY3Rpb24taXRlbVwiIH0pO1xyXG5cclxuICAgICAgLy8gTWludXMgKHJlbW92ZSlcclxuICAgICAgY29uc3QgcmVtb3ZlQnRuID0gcm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcImNsaWNrYWJsZS1pY29uXCIgfSk7XHJcbiAgICAgIHNldEljb24ocmVtb3ZlQnRuLCBcImNpcmNsZS1taW51c1wiKTtcclxuICAgICAgcmVtb3ZlQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgcmVhY3Rpb25zLnNwbGljZShpLCAxKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICB0aGlzLnJlbmRlclJlYWN0aW9ucygpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIE1hbnVhbCBvdmVycmlkZSBjaGVja2JveFxyXG4gICAgICBjb25zdCBjaGVja2JveCA9IHJvdy5jcmVhdGVFbChcImlucHV0XCIsIHsgdHlwZTogXCJjaGVja2JveFwiIH0pO1xyXG4gICAgICBjaGVja2JveC5jaGVja2VkID0gci5tYW51YWxPdmVycmlkZSA/PyBmYWxzZTtcclxuICAgICAgY2hlY2tib3guYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgcmVhY3Rpb25zW2ldLm1hbnVhbE92ZXJyaWRlID0gY2hlY2tib3guY2hlY2tlZDtcclxuICAgICAgICBpZiAoIWNoZWNrYm94LmNoZWNrZWQpIHtcclxuICAgICAgICAgIGRlbGV0ZSByZWFjdGlvbnNbaV0uaW50ZXJ2YWxNdWx0O1xyXG4gICAgICAgICAgZGVsZXRlIHJlYWN0aW9uc1tpXS5lYXNlRGVsdGE7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJlYWN0aW9uc1tpXS5pbnRlcnZhbE11bHQgPSBwYXJzZUZsb2F0KFxyXG4gICAgICAgICAgICAodEZ1bGwgPD0gMC41ID8gMC41ICsgMC41ICogKHRGdWxsICogMikgOiAxLjAgKyAobWF4TXVsdCAtIDEuMCkgKiAoKHRGdWxsIC0gMC41KSAqIDIpKS50b0ZpeGVkKDIpLFxyXG4gICAgICAgICAgKTtcclxuICAgICAgICAgIHJlYWN0aW9uc1tpXS5lYXNlRGVsdGEgPSBNYXRoLnJvdW5kKDIwIC0gNDAgKiB0RnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgIHRoaXMucmVuZGVyUmVhY3Rpb25zKCk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gR2hvc3QgbGFiZWwgaW5wdXRcclxuICAgICAgY29uc3QgbGFiZWxJbnB1dCA9IHJvdy5jcmVhdGVFbChcImlucHV0XCIsIHsgdHlwZTogXCJ0ZXh0XCIsIGNsczogXCJzcGFjZWQtcmVhY3Rpb24tbGFiZWwtaW5wdXRcIiB9KTtcclxuICAgICAgbGFiZWxJbnB1dC52YWx1ZSA9IHIubGFiZWw7XHJcbiAgICAgIGxhYmVsSW5wdXQucGxhY2Vob2xkZXIgPSBcIkxhYmVsXCI7XHJcbiAgICAgIGxhYmVsSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgcmVhY3Rpb25zW2ldLmxhYmVsID0gbGFiZWxJbnB1dC52YWx1ZTtcclxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBDb2xvciBzd2F0Y2ggXHUyMDE0IHNob3dzIGN1cnJlbnQgY29sb3IsIGNsaWNrIGN5Y2xlcyB0aHJvdWdoIHJhbXAgb3IgY2xlYXJzXHJcbiAgICAgIGNvbnN0IFJBTVAgPSBbXHJcbiAgICAgICAgXCJzcGFjZWQtc2VnLXB1cnBsZVwiLFxyXG4gICAgICAgIFwic3BhY2VkLXNlZy1ibHVlXCIsXHJcbiAgICAgICAgXCJzcGFjZWQtc2VnLWdyZWVuXCIsXHJcbiAgICAgICAgXCJzcGFjZWQtc2VnLXllbGxvd1wiLFxyXG4gICAgICAgIFwic3BhY2VkLXNlZy1vcmFuZ2VcIixcclxuICAgICAgICBcInNwYWNlZC1zZWctcmVkXCIsXHJcbiAgICAgIF07XHJcblxyXG4gICAgICAvLyBDb21wdXRlIHRoZSBkZWZhdWx0IHJhbXAgY29sb3IgZm9yIHRoaXMgcmVhY3Rpb24gKHNhbWUgbWF0aCBhcyByZWFjdGlvbkNvbG9yKCkpXHJcbiAgICAgIGNvbnN0IGRlZmF1bHRDb2xvcklkeCA9IE1hdGgucm91bmQodEZ1bGwgKiAoUkFNUC5sZW5ndGggLSAxKSk7XHJcbiAgICAgIGNvbnN0IGRlZmF1bHRDb2xvciA9IFJBTVBbZGVmYXVsdENvbG9ySWR4XTtcclxuICAgICAgY29uc3QgYWN0aXZlQ29sb3IgPSByLmNvbG9yID8/IGRlZmF1bHRDb2xvcjtcclxuXHJcbiAgICAgIGNvbnN0IHN3YXRjaCA9IHJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogYGNsaWNrYWJsZS1pY29uIHNwYWNlZC1yZWFjdGlvbi1zd2F0Y2ggJHthY3RpdmVDb2xvcn1gIH0pO1xyXG4gICAgICBzd2F0Y2gudGl0bGUgPSByLmNvbG9yID8gYENvbG9yOiAke3IuY29sb3J9IChjbGljayB0byBjaGFuZ2UpYCA6IFwiQ29sb3I6IGF1dG8gKGNsaWNrIHRvIG92ZXJyaWRlKVwiO1xyXG5cclxuICAgICAgc3dhdGNoLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgLy8gU2hvdyBhIG1pbmkgcGFsZXR0ZSBwb3BvdmVyXHJcbiAgICAgICAgb3BlbkNvbG9yUGFsZXR0ZShzd2F0Y2gsIGFjdGl2ZUNvbG9yLCBhc3luYyAoY2hvc2VuKSA9PiB7XHJcbiAgICAgICAgICBpZiAoY2hvc2VuID09PSBkZWZhdWx0Q29sb3IpIHtcclxuICAgICAgICAgICAgLy8gQ2hvb3NpbmcgdGhlIGRlZmF1bHQgPSBjbGVhciB0aGUgb3ZlcnJpZGVcclxuICAgICAgICAgICAgZGVsZXRlIHJlYWN0aW9uc1tpXS5jb2xvcjtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJlYWN0aW9uc1tpXS5jb2xvciA9IGNob3NlbjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgdGhpcy5yZW5kZXJSZWFjdGlvbnMoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBJbnRlcnZhbC9lYXNlOiBlZGl0YWJsZSBpbnB1dHMgb3IgbXV0ZWQgdGV4dFxyXG4gICAgICBpZiAoci5tYW51YWxPdmVycmlkZSkge1xyXG4gICAgICAgIGNvbnN0IGlucHV0cyA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLXJlYWN0aW9uLWlucHV0c1wiIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBtdWx0SW5wdXQgPSBpbnB1dHMuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IHR5cGU6IFwidGV4dFwiLCBjbHM6IFwic3BhY2VkLXJlYWN0aW9uLWlucHV0XCIgfSk7XHJcbiAgICAgICAgbXVsdElucHV0LnBsYWNlaG9sZGVyID0gYFx1MDBENyR7bXVsdC50b0ZpeGVkKDIpfWA7XHJcbiAgICAgICAgbXVsdElucHV0LnZhbHVlID0gci5pbnRlcnZhbE11bHQgIT09IHVuZGVmaW5lZCA/IFN0cmluZyhyLmludGVydmFsTXVsdCkgOiBcIlwiO1xyXG4gICAgICAgIG11bHRJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgIGNvbnN0IG4gPSBwYXJzZUZsb2F0KG11bHRJbnB1dC52YWx1ZSk7XHJcbiAgICAgICAgICBpZiAoIWlzTmFOKG4pICYmIG4gPiAwKSB7XHJcbiAgICAgICAgICAgIHJlYWN0aW9uc1tpXS5pbnRlcnZhbE11bHQgPSBuO1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgZWFzZUlucHV0ID0gaW5wdXRzLmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyB0eXBlOiBcInRleHRcIiwgY2xzOiBcInNwYWNlZC1yZWFjdGlvbi1pbnB1dFwiIH0pO1xyXG4gICAgICAgIGVhc2VJbnB1dC5wbGFjZWhvbGRlciA9IGBlYXNlICR7c2lnbn0ke2Vhc2VEZWx0YX1gO1xyXG4gICAgICAgIGVhc2VJbnB1dC52YWx1ZSA9IHIuZWFzZURlbHRhICE9PSB1bmRlZmluZWQgPyBTdHJpbmcoci5lYXNlRGVsdGEpIDogXCJcIjtcclxuICAgICAgICBlYXNlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBuID0gcGFyc2VJbnQoZWFzZUlucHV0LnZhbHVlKTtcclxuICAgICAgICAgIGlmICghaXNOYU4obikpIHtcclxuICAgICAgICAgICAgcmVhY3Rpb25zW2ldLmVhc2VEZWx0YSA9IG47XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJvdy5jcmVhdGVTcGFuKHtcclxuICAgICAgICAgIHRleHQ6IGBcdTAwRDcke211bHQudG9GaXhlZCgyKX0gIGVhc2UgJHtzaWdufSR7ZWFzZURlbHRhfWAsXHJcbiAgICAgICAgICBjbHM6IFwic3BhY2VkLXJlYWN0aW9uLW1ldGFcIixcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVXAgLyBEb3duIGFycm93c1xyXG4gICAgICBjb25zdCB1cEJ0biA9IHJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJjbGlja2FibGUtaWNvblwiIH0pO1xyXG4gICAgICBzZXRJY29uKHVwQnRuLCBcImFycm93LXVwXCIpO1xyXG4gICAgICB1cEJ0bi5kaXNhYmxlZCA9IGkgPT09IDA7XHJcbiAgICAgIHVwQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgW3JlYWN0aW9uc1tpIC0gMV0sIHJlYWN0aW9uc1tpXV0gPSBbcmVhY3Rpb25zW2ldLCByZWFjdGlvbnNbaSAtIDFdXTtcclxuICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICB0aGlzLnJlbmRlclJlYWN0aW9ucygpO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGRvd25CdG4gPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwiY2xpY2thYmxlLWljb25cIiB9KTtcclxuICAgICAgc2V0SWNvbihkb3duQnRuLCBcImFycm93LWRvd25cIik7XHJcbiAgICAgIGRvd25CdG4uZGlzYWJsZWQgPSBpID09PSByZWFjdGlvbnMubGVuZ3RoIC0gMTtcclxuICAgICAgZG93bkJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIFtyZWFjdGlvbnNbaSArIDFdLCByZWFjdGlvbnNbaV1dID0gW3JlYWN0aW9uc1tpXSwgcmVhY3Rpb25zW2kgKyAxXV07XHJcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgdGhpcy5yZW5kZXJSZWFjdGlvbnMoKTtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgcm93IGF0IHRoZSBib3R0b21cclxuICAgIGNvbnN0IGFkZFJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLXJlYWN0aW9uLWFkZC1yb3dcIiB9KTtcclxuICAgIGNvbnN0IGFkZElucHV0ID0gYWRkUm93LmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyB0eXBlOiBcInRleHRcIiwgY2xzOiBcInNwYWNlZC1yZWFjdGlvbi1hZGQtaW5wdXRcIiB9KTtcclxuICAgIGFkZElucHV0LnBsYWNlaG9sZGVyID0gXCJOZXcgcmVhY3Rpb24gbGFiZWxcdTIwMjZcIjtcclxuXHJcbiAgICBjb25zdCBhZGRCdG4gPSBhZGRSb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwiY2xpY2thYmxlLWljb25cIiB9KTtcclxuICAgIHNldEljb24oYWRkQnRuLCBcImNpcmNsZS1wbHVzXCIpOyAvLyBtYXRjaGVzIHRoZSBkZWNrIGRyb3Bkb3duJ3MgYWRkIGljb25cclxuXHJcbiAgICBjb25zdCBkb0FkZCA9IGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgdHJpbW1lZCA9IGFkZElucHV0LnZhbHVlLnRyaW0oKTtcclxuICAgICAgaWYgKCF0cmltbWVkKSByZXR1cm47XHJcbiAgICAgIGNvbnN0IGlkID0gdHJpbW1lZC50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1xccysvZywgXCItXCIpO1xyXG4gICAgICBpZiAocmVhY3Rpb25zLnNvbWUoKHIpID0+IHIuaWQgPT09IGlkKSkge1xyXG4gICAgICAgIG5ldyBOb3RpY2UoYEEgcmVhY3Rpb24gd2l0aCBpZCBcIiR7aWR9XCIgYWxyZWFkeSBleGlzdHMuYCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIHJlYWN0aW9ucy5wdXNoKHsgaWQsIGxhYmVsOiB0cmltbWVkIH0pO1xyXG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgdGhpcy5yZW5kZXJSZWFjdGlvbnMoKTtcclxuICAgIH07XHJcblxyXG4gICAgYWRkQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBkb0FkZCk7XHJcbiAgICBhZGRJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBhc3luYyAoZSkgPT4ge1xyXG4gICAgICBpZiAoZS5rZXkgPT09IFwiRW50ZXJcIikge1xyXG4gICAgICAgIGF3YWl0IGRvQWRkKCk7XHJcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIG9uQ2xvc2UoKSB7XHJcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gIH1cclxufVxyXG4iLCAiaW1wb3J0IHsgSXRlbVZpZXcsIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgbm90ZUlzRHVlLCBudW1EYXlzT3ZlcmR1ZSB9IGZyb20gXCIuL3NjaGVkdWxlclwiO1xyXG5pbXBvcnQgeyBSZXZpZXdNb2RhbCB9IGZyb20gXCIuL1Jldmlld01vZGFsXCI7XHJcbmltcG9ydCB7IGdldE5vdGVzRnJvbVZhdWx0IH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcclxuaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XHJcblxyXG5leHBvcnQgY29uc3QgRFVFX05PVEVTX1ZJRVdfVFlQRSA9IFwic3BhY2VkLWV2ZXJ5dGhpbmctZHVlLW5vdGVzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgRHVlTm90ZXNWaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgbGVhZjogV29ya3NwYWNlTGVhZixcclxuICAgIHByaXZhdGUgcGx1Z2luOiBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luLFxyXG4gICkge1xyXG4gICAgc3VwZXIobGVhZik7XHJcbiAgfVxyXG5cclxuICBnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIERVRV9OT1RFU19WSUVXX1RZUEU7XHJcbiAgfVxyXG4gIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gXCJEdWUgTm90ZXNcIjtcclxuICB9XHJcbiAgZ2V0SWNvbigpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIFwiY2xvY2tcIjtcclxuICB9XHJcblxyXG4gIGFzeW5jIG9uT3BlbigpIHtcclxuICAgIGF3YWl0IHRoaXMucmVuZGVyKCk7XHJcbiAgfVxyXG4gIGFzeW5jIG9uQ2xvc2UoKSB7XHJcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgcmVuZGVyKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuXHJcbiAgICBjb25zdCBhbGxOb3RlcyA9IGdldE5vdGVzRnJvbVZhdWx0KHRoaXMucGx1Z2luKS5maWx0ZXIoKG4pID0+IG4uaW50ZXJ2YWwgPj0gMCk7XHJcbiAgICBjb25zdCBkdWVOb3RlcyA9IGFsbE5vdGVzLmZpbHRlcigobikgPT4gbm90ZUlzRHVlKG4pKS5zb3J0KChhLCBiKSA9PiBudW1EYXlzT3ZlcmR1ZShiKSAtIG51bURheXNPdmVyZHVlKGEpKTtcclxuXHJcbiAgICBpZiAoZHVlTm90ZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcbiAgICAgICAgdGV4dDogXCJBbGwgY2F1Z2h0IHVwIFx1MjAxNCBubyBub3RlcyBkdWUuXCIsXHJcbiAgICAgICAgY2xzOiBcInNwYWNlZC1lbXB0eSBwYW5lLWVtcHR5XCIsXHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTXV0ZWQgY291bnQgbGluZSwgbGlrZSBPYnNpZGlhbidzIFwiWCBsaW5rZWQgbWVudGlvbnNcIlxyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuICAgICAgdGV4dDogYCR7ZHVlTm90ZXMubGVuZ3RofSBub3RlJHtkdWVOb3Rlcy5sZW5ndGggIT09IDEgPyBcInNcIiA6IFwiXCJ9IGR1ZWAsXHJcbiAgICAgIGNsczogXCJzcGFjZWQtZHVlLWNvdW50XCIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBsaXN0ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJuYXYtZmlsZXMtY29udGFpbmVyXCIgfSk7XHJcblxyXG4gICAgZm9yIChjb25zdCBub3RlIG9mIGR1ZU5vdGVzKSB7XHJcbiAgICAgIGNvbnN0IGZpbGVuYW1lID0gbm90ZS5maWxlcGF0aC5zcGxpdChcIi9cIikucG9wKCk/LnJlcGxhY2UoL1xcLm1kJC8sIFwiXCIpID8/IG5vdGUuZmlsZXBhdGg7XHJcbiAgICAgIGNvbnN0IGRheXMgPSBudW1EYXlzT3ZlcmR1ZShub3RlKTtcclxuXHJcbiAgICAgIGNvbnN0IGZpbGUgPSBsaXN0LmNyZWF0ZURpdih7IGNsczogXCJuYXYtZmlsZVwiIH0pO1xyXG4gICAgICBjb25zdCB0aXRsZSA9IGZpbGUuY3JlYXRlRGl2KHsgY2xzOiBcIm5hdi1maWxlLXRpdGxlXCIgfSk7XHJcblxyXG4gICAgICB0aXRsZS5jcmVhdGVTcGFuKHsgdGV4dDogZmlsZW5hbWUsIGNsczogXCJuYXYtZmlsZS10aXRsZS1jb250ZW50XCIgfSk7XHJcbiAgICAgIHRpdGxlLmNyZWF0ZVNwYW4oe1xyXG4gICAgICAgIHRleHQ6IGAke2RheXN9ZCBvdmVyZHVlIFx1MDBCNyAke25vdGUubm90ZVN0YXRlfWAsXHJcbiAgICAgICAgY2xzOiBcInNwYWNlZC1kdWUtbWV0YVwiLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHRpdGxlLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgbW9kYWwgPSBuZXcgUmV2aWV3TW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luLCBub3RlKTtcclxuICAgICAgICBjb25zdCBzYXZlZCA9IHRoaXMucGx1Z2luLmRhdGEuc3JzU2Vzc2lvbjtcclxuICAgICAgICBpZiAoc2F2ZWQpIG1vZGFsLnJlc3VtZVNlc3Npb24oc2F2ZWQpO1xyXG4gICAgICAgIG1vZGFsLm9wZW4oKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiIsICJpbXBvcnQgeyBJdGVtVmlldywgV29ya3NwYWNlTGVhZiwgVmlld1N0YXRlUmVzdWx0LCBzZXRJY29uLCBNZW51IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xyXG5pbXBvcnQgeyBub3RlSXNEdWUgfSBmcm9tIFwiLi9zY2hlZHVsZXJcIjtcclxuaW1wb3J0IHsgdG9kYXkgfSBmcm9tIFwiLi91dGlsc1wiO1xyXG5pbXBvcnQgeyBnZXROb3Rlc0Zyb21WYXVsdCB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7XHJcbmltcG9ydCB7IFJldmlld0V2ZW50LCBOb3RlUmVjb3JkIH0gZnJvbSBcIi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgc2NhbGVMaW5lYXIsIHNjYWxlVGltZSwgc2NhbGVCYW5kLCBTY2FsZUxpbmVhciB9IGZyb20gXCJkMy1zY2FsZVwiO1xyXG5pbXBvcnQgeyBsaW5lIGFzIGQzTGluZSwgYXJlYSBhcyBkM0FyZWEgfSBmcm9tIFwiZDMtc2hhcGVcIjtcclxuaW1wb3J0IHsgdGltZUZvcm1hdCB9IGZyb20gXCJkMy10aW1lLWZvcm1hdFwiO1xyXG5pbXBvcnQgeyB0aW1lRGF5LCB0aW1lTW9udGgsIHRpbWVZZWFyIH0gZnJvbSBcImQzLXRpbWVcIjtcclxuaW1wb3J0IHsgc2VsZWN0IH0gZnJvbSBcImQzLXNlbGVjdGlvblwiO1xyXG5cclxuZXhwb3J0IGNvbnN0IFNUQVRTX1ZJRVdfVFlQRSA9IFwic3BhY2VkLWV2ZXJ5dGhpbmctc3RhdHNcIjtcclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBDb25zdGFudHMgJiBUeXBlcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuY29uc3QgQ0hBUlRfUEVSSU9EUyA9IFtcIjFXXCIsIFwiMldcIiwgXCIxTVwiLCBcIjZNXCIsIFwiMVlcIiwgXCJBbGxcIl0gYXMgY29uc3Q7XHJcbnR5cGUgQ2hhcnRQZXJpb2QgPSAodHlwZW9mIENIQVJUX1BFUklPRFMpW251bWJlcl07XHJcbmNvbnN0IFBFUklPRF9EQVlTOiBSZWNvcmQ8Q2hhcnRQZXJpb2QsIG51bWJlcj4gPSB7XHJcbiAgXCIxV1wiOiA3LFxyXG4gIFwiMldcIjogMTQsXHJcbiAgXCIxTVwiOiAzMCxcclxuICBcIjZNXCI6IDE4MCxcclxuICBcIjFZXCI6IDM2NSxcclxuICBBbGw6IEluZmluaXR5LFxyXG59O1xyXG5cclxuY29uc3QgUEVSSU9EX0xBQkVMUzogUmVjb3JkPENoYXJ0UGVyaW9kLCBzdHJpbmc+ID0ge1xyXG4gIFwiMVdcIjogXCJXZWVrXCIsXHJcbiAgXCIyV1wiOiBcIjE0IGRheXNcIixcclxuICBcIjFNXCI6IFwiTW9udGhcIixcclxuICBcIjZNXCI6IFwiSGFsZiB5ZWFyXCIsXHJcbiAgXCIxWVwiOiBcIlllYXJcIixcclxuICBBbGw6IFwiQWxsIHRpbWVcIixcclxufTtcclxuXHJcbi8vIFx1MjUwMFx1MjUwMCBNb2R1bGUtbGV2ZWwgY2hhcnQgdXRpbGl0aWVzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5mdW5jdGlvbiBtYWtlVGltZUZvcm1hdChwZXJpb2Q6IENoYXJ0UGVyaW9kKTogKGQ6IERhdGUpID0+IHN0cmluZyB7XHJcbiAgY29uc3QgZGF5Rm10ID0gdGltZUZvcm1hdChcIiVkXCIpO1xyXG4gIGlmIChwZXJpb2QgPT09IFwiMVdcIiB8fCBwZXJpb2QgPT09IFwiMldcIiB8fCBwZXJpb2QgPT09IFwiMU1cIikgcmV0dXJuIChkKSA9PiBTdHJpbmcocGFyc2VJbnQoZGF5Rm10KGQpKSk7XHJcbiAgaWYgKHBlcmlvZCA9PT0gXCI2TVwiKSByZXR1cm4gdGltZUZvcm1hdChcIiViXCIpO1xyXG4gIGlmIChwZXJpb2QgPT09IFwiMVlcIikge1xyXG4gICAgY29uc3QgeWVhckZtdCA9IHRpbWVGb3JtYXQoXCInJXlcIik7XHJcbiAgICBjb25zdCBtb250aEZtdCA9IHRpbWVGb3JtYXQoXCIlYlwiKTtcclxuICAgIHJldHVybiAoZCkgPT4gKGQuZ2V0TW9udGgoKSA9PT0gMCA/IHllYXJGbXQoZCkgOiBtb250aEZtdChkKSk7XHJcbiAgfVxyXG4gIHJldHVybiB0aW1lRm9ybWF0KFwiJyV5XCIpOyAvLyBcIkFsbFwiXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTdGF0c1ZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XHJcbiAgLy8gXHUyNTAwXHUyNTAwIFN0YXRlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gIHByaXZhdGUgY2FsZW5kYXJZZWFyOiBudW1iZXI7XHJcbiAgcHJpdmF0ZSBjYWxlbmRhck1vbnRoOiBudW1iZXI7IC8vIDAtaW5kZXhlZFxyXG4gIHByaXZhdGUgaGVhdG1hcFllYXI6IG51bWJlcjtcclxuICBwcml2YXRlIHJldmlld0NoYXJ0UGVyaW9kOiBDaGFydFBlcmlvZCA9IFwiMU1cIjtcclxuICBwcml2YXRlIGR1ZUNoYXJ0UGVyaW9kOiBDaGFydFBlcmlvZCA9IFwiMU1cIjtcclxuICBwcml2YXRlIGZvcmVjYXN0Q2hhcnRQZXJpb2Q6IENoYXJ0UGVyaW9kID0gXCIxTVwiO1xyXG4gIHByaXZhdGUgc2VsZWN0ZWRDaGFydDogXCJtb250aFwiIHwgXCJ5ZWFyXCIgfCBcImZvcmVjYXN0XCIgfCBcInJldmlld3NcIiB8IFwiZHVlXCIgPSBcIm1vbnRoXCI7XHJcbiAgcHJpdmF0ZSByZXNpemVPYnNlcnZlcjogUmVzaXplT2JzZXJ2ZXIgfCBudWxsID0gbnVsbDtcclxuICBwcml2YXRlIHJlc2l6ZURlYm91bmNlOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRUaW1lb3V0PiB8IG51bGwgPSBudWxsO1xyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgT2JzaWRpYW4gdmlldyBBUEkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBsZWFmOiBXb3Jrc3BhY2VMZWFmLFxyXG4gICAgcHJpdmF0ZSBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXHJcbiAgKSB7XHJcbiAgICBzdXBlcihsZWFmKTtcclxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcbiAgICB0aGlzLmNhbGVuZGFyWWVhciA9IG5vdy5nZXRGdWxsWWVhcigpO1xyXG4gICAgdGhpcy5jYWxlbmRhck1vbnRoID0gbm93LmdldE1vbnRoKCk7XHJcbiAgICB0aGlzLmhlYXRtYXBZZWFyID0gbm93LmdldEZ1bGxZZWFyKCk7XHJcbiAgfVxyXG5cclxuICBnZXRWaWV3VHlwZSgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIFNUQVRTX1ZJRVdfVFlQRTtcclxuICB9XHJcbiAgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBcIlNwYWNlZCBFdmVyeXRoaW5nIFx1MjAxNCBTdGF0c1wiO1xyXG4gIH1cclxuICBnZXRJY29uKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gXCJiYXItY2hhcnQtMlwiO1xyXG4gIH1cclxuXHJcbiAgZ2V0U3RhdGUoKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc2VsZWN0ZWRDaGFydDogdGhpcy5zZWxlY3RlZENoYXJ0LFxyXG4gICAgICBjYWxlbmRhclllYXI6IHRoaXMuY2FsZW5kYXJZZWFyLFxyXG4gICAgICBjYWxlbmRhck1vbnRoOiB0aGlzLmNhbGVuZGFyTW9udGgsXHJcbiAgICAgIGhlYXRtYXBZZWFyOiB0aGlzLmhlYXRtYXBZZWFyLFxyXG4gICAgICByZXZpZXdDaGFydFBlcmlvZDogdGhpcy5yZXZpZXdDaGFydFBlcmlvZCxcclxuICAgICAgZHVlQ2hhcnRQZXJpb2Q6IHRoaXMuZHVlQ2hhcnRQZXJpb2QsXHJcbiAgICAgIGZvcmVjYXN0Q2hhcnRQZXJpb2Q6IHRoaXMuZm9yZWNhc3RDaGFydFBlcmlvZCxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBhc3luYyBzZXRTdGF0ZShzdGF0ZTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIHJlc3VsdDogVmlld1N0YXRlUmVzdWx0KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAoc3RhdGUuc2VsZWN0ZWRDaGFydCAhPT0gdW5kZWZpbmVkKSB0aGlzLnNlbGVjdGVkQ2hhcnQgPSBzdGF0ZS5zZWxlY3RlZENoYXJ0IGFzIHR5cGVvZiB0aGlzLnNlbGVjdGVkQ2hhcnQ7XHJcbiAgICBpZiAoc3RhdGUuY2FsZW5kYXJZZWFyICE9PSB1bmRlZmluZWQpIHRoaXMuY2FsZW5kYXJZZWFyID0gc3RhdGUuY2FsZW5kYXJZZWFyIGFzIG51bWJlcjtcclxuICAgIGlmIChzdGF0ZS5jYWxlbmRhck1vbnRoICE9PSB1bmRlZmluZWQpIHRoaXMuY2FsZW5kYXJNb250aCA9IHN0YXRlLmNhbGVuZGFyTW9udGggYXMgbnVtYmVyO1xyXG4gICAgaWYgKHN0YXRlLmhlYXRtYXBZZWFyICE9PSB1bmRlZmluZWQpIHRoaXMuaGVhdG1hcFllYXIgPSBzdGF0ZS5oZWF0bWFwWWVhciBhcyBudW1iZXI7XHJcbiAgICBpZiAoc3RhdGUucmV2aWV3Q2hhcnRQZXJpb2QgIT09IHVuZGVmaW5lZClcclxuICAgICAgdGhpcy5yZXZpZXdDaGFydFBlcmlvZCA9IHN0YXRlLnJldmlld0NoYXJ0UGVyaW9kIGFzIHR5cGVvZiB0aGlzLnJldmlld0NoYXJ0UGVyaW9kO1xyXG4gICAgaWYgKHN0YXRlLmR1ZUNoYXJ0UGVyaW9kICE9PSB1bmRlZmluZWQpIHRoaXMuZHVlQ2hhcnRQZXJpb2QgPSBzdGF0ZS5kdWVDaGFydFBlcmlvZCBhcyB0eXBlb2YgdGhpcy5kdWVDaGFydFBlcmlvZDtcclxuICAgIGlmIChzdGF0ZS5mb3JlY2FzdENoYXJ0UGVyaW9kICE9PSB1bmRlZmluZWQpXHJcbiAgICAgIHRoaXMuZm9yZWNhc3RDaGFydFBlcmlvZCA9IHN0YXRlLmZvcmVjYXN0Q2hhcnRQZXJpb2QgYXMgdHlwZW9mIHRoaXMuZm9yZWNhc3RDaGFydFBlcmlvZDtcclxuICAgIGF3YWl0IHN1cGVyLnNldFN0YXRlKHN0YXRlLCByZXN1bHQpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgb25PcGVuKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5yZW5kZXIoKTtcclxuICAgIC8vIFNlY29uZCByZW5kZXIgYWZ0ZXIgbGF5b3V0IHNvIFNWRyBkaW1lbnNpb25zIChjbGllbnRXaWR0aC9jbGllbnRIZWlnaHQpIGFyZSBub24temVyby5cclxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcbiAgICAgIHRoaXMucmVuZGVyKCkuY2F0Y2goY29uc29sZS5lcnJvcik7XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnJlc2l6ZU9ic2VydmVyID0gbmV3IFJlc2l6ZU9ic2VydmVyKCgpID0+IHtcclxuICAgICAgaWYgKHRoaXMucmVzaXplRGVib3VuY2UpIGNsZWFyVGltZW91dCh0aGlzLnJlc2l6ZURlYm91bmNlKTtcclxuICAgICAgdGhpcy5yZXNpemVEZWJvdW5jZSA9IHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgIHRoaXMucmVuZGVyKCkuY2F0Y2goY29uc29sZS5lcnJvcik7XHJcbiAgICAgIH0sIDEwMCk7XHJcbiAgICB9KTtcclxuICAgIHRoaXMucmVzaXplT2JzZXJ2ZXIub2JzZXJ2ZSh0aGlzLmNvbnRhaW5lckVsKTtcclxuICB9XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBSZW5kZXIgJiBzZWN0aW9uIGRpc3BhdGNoZXJzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gIGFzeW5jIHJlbmRlcigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG4gICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgICBjb250ZW50RWwuYWRkQ2xhc3MoXCJzcGFjZWQtc3RhdHMtdmlld1wiKTtcclxuXHJcbiAgICBjb25zdCBoaXN0b3J5ID0gdGhpcy5wbHVnaW4uZGF0YS5yZXZpZXdIaXN0b3J5O1xyXG4gICAgY29uc3QgdG9kYXlTdHIgPSB0b2RheSgpO1xyXG4gICAgY29uc3QgYWN0aXZlTm90ZXMgPSBnZXROb3Rlc0Zyb21WYXVsdCh0aGlzLnBsdWdpbikuZmlsdGVyKChuKSA9PiBuLmludGVydmFsID49IDApO1xyXG4gICAgY29uc3QgZHVlTm90ZXMgPSBhY3RpdmVOb3Rlcy5maWx0ZXIoKG4pID0+IG5vdGVJc0R1ZShuKSk7XHJcbiAgICBjb25zdCB0b2RheUV2ZW50cyA9IGhpc3RvcnkuZmlsdGVyKChlKSA9PiBlLnRpbWVzdGFtcC5zdGFydHNXaXRoKHRvZGF5U3RyKSk7XHJcbiAgICBjb25zdCBhdmdJbnRlcnZhbCA9XHJcbiAgICAgIGFjdGl2ZU5vdGVzLmxlbmd0aCA+IDAgPyBNYXRoLnJvdW5kKGFjdGl2ZU5vdGVzLnJlZHVjZSgoc3VtLCBuKSA9PiBzdW0gKyBuLmludGVydmFsLCAwKSAvIGFjdGl2ZU5vdGVzLmxlbmd0aCkgOiAwO1xyXG5cclxuICAgIGNvbnN0IGhlYWRlckVsID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtaGVhZGVyLXN0YXRzXCIgfSk7XHJcbiAgICB0aGlzLmFkZFN0YXQoaGVhZGVyRWwsIFwiVG9kYXlcIiwgU3RyaW5nKHRvZGF5RXZlbnRzLmxlbmd0aCkpO1xyXG4gICAgdGhpcy5hZGRTdGF0KGhlYWRlckVsLCBcIkR1ZVwiLCBTdHJpbmcoZHVlTm90ZXMubGVuZ3RoKSk7XHJcbiAgICB0aGlzLmFkZFN0YXQoaGVhZGVyRWwsIFwiQWN0aXZlXCIsIFN0cmluZyhhY3RpdmVOb3Rlcy5sZW5ndGgpKTtcclxuICAgIHRoaXMuYWRkU3RhdChoZWFkZXJFbCwgXCJSZXZpZXdzXCIsIFN0cmluZyhoaXN0b3J5Lmxlbmd0aCkpO1xyXG4gICAgdGhpcy5hZGRTdGF0KGhlYWRlckVsLCBcIkF2ZyBpbnRlcnZhbFwiLCBgJHthdmdJbnRlcnZhbH1kYCk7XHJcblxyXG4gICAgY29uc3Qgc2VsZWN0b3JSb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1jaGFydC1zZWxlY3Rvci1yb3dcIiB9KTtcclxuICAgIGNvbnN0IGNoYXJ0T3B0aW9uczogeyB2YWx1ZTogdHlwZW9mIHRoaXMuc2VsZWN0ZWRDaGFydDsgbGFiZWw6IHN0cmluZyB9W10gPSBbXHJcbiAgICAgIHsgdmFsdWU6IFwibW9udGhcIiwgbGFiZWw6IFwiTW9udGggY2FsZW5kYXJcIiB9LFxyXG4gICAgICB7IHZhbHVlOiBcInllYXJcIiwgbGFiZWw6IFwiWWVhciBoZWF0bWFwXCIgfSxcclxuICAgICAgeyB2YWx1ZTogXCJmb3JlY2FzdFwiLCBsYWJlbDogXCJVcGNvbWluZyBsb2FkXCIgfSxcclxuICAgICAgeyB2YWx1ZTogXCJyZXZpZXdzXCIsIGxhYmVsOiBcIkRhaWx5IHJldmlld3NcIiB9LFxyXG4gICAgICB7IHZhbHVlOiBcImR1ZVwiLCBsYWJlbDogXCJEdWUgbm90ZXNcIiB9LFxyXG4gICAgXTtcclxuICAgIGNvbnN0IGN1cnJlbnRMYWJlbCA9IGNoYXJ0T3B0aW9ucy5maW5kKChvKSA9PiBvLnZhbHVlID09PSB0aGlzLnNlbGVjdGVkQ2hhcnQpPy5sYWJlbCA/PyB0aGlzLnNlbGVjdGVkQ2hhcnQ7XHJcblxyXG4gICAgY29uc3QgY2hhcnRUcmlnZ2VyV3JhcHBlciA9IHNlbGVjdG9yUm93LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtcGVyaW9kLXdyYXBwZXJcIiB9KTtcclxuICAgIGNvbnN0IGNoYXJ0VHJpZ2dlckJ0biA9IGNoYXJ0VHJpZ2dlcldyYXBwZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNlLWdyYXBoLXNlbFwiIH0pO1xyXG4gICAgY2hhcnRUcmlnZ2VyQnRuLmNyZWF0ZVNwYW4oeyB0ZXh0OiBjdXJyZW50TGFiZWwgfSk7XHJcblxyXG4gICAgY2hhcnRUcmlnZ2VyQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4ge1xyXG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICBjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuICAgICAgZm9yIChjb25zdCBvcHQgb2YgY2hhcnRPcHRpb25zKSB7XHJcbiAgICAgICAgbWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcbiAgICAgICAgICBpdGVtLnNldFRpdGxlKG9wdC5sYWJlbCk7XHJcbiAgICAgICAgICBpdGVtLnNldENoZWNrZWQob3B0LnZhbHVlID09PSB0aGlzLnNlbGVjdGVkQ2hhcnQpO1xyXG4gICAgICAgICAgaXRlbS5vbkNsaWNrKCgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5zZWxlY3RlZENoYXJ0ID0gb3B0LnZhbHVlO1xyXG4gICAgICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgICAgbWVudS5zaG93QXRNb3VzZUV2ZW50KGUpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgY2hhcnRBcmVhID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtY2hhcnQtYXJlYVwiIH0pO1xyXG5cclxuICAgIHN3aXRjaCAodGhpcy5zZWxlY3RlZENoYXJ0KSB7XHJcbiAgICAgIGNhc2UgXCJtb250aFwiOlxyXG4gICAgICAgIHRoaXMucmVuZGVyTW9udGhTZWN0aW9uKGNoYXJ0QXJlYSwgaGlzdG9yeSwgYWN0aXZlTm90ZXMsIHRvZGF5U3RyKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBcInllYXJcIjpcclxuICAgICAgICB0aGlzLnJlbmRlclllYXJTZWN0aW9uKGNoYXJ0QXJlYSwgaGlzdG9yeSwgdG9kYXlTdHIpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIFwiZm9yZWNhc3RcIjpcclxuICAgICAgICB0aGlzLnJlbmRlckZvcmVjYXN0U2VjdGlvbihjaGFydEFyZWEsIGFjdGl2ZU5vdGVzLCB0b2RheVN0cik7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgXCJyZXZpZXdzXCI6XHJcbiAgICAgICAgdGhpcy5yZW5kZXJSZXZpZXdzU2VjdGlvbihjaGFydEFyZWEsIGhpc3RvcnkpO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIFwiZHVlXCI6XHJcbiAgICAgICAgdGhpcy5yZW5kZXJEdWVTZWN0aW9uKGNoYXJ0QXJlYSk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlck1vbnRoU2VjdGlvbihcclxuICAgIGNoYXJ0QXJlYTogSFRNTEVsZW1lbnQsXHJcbiAgICBoaXN0b3J5OiBSZXZpZXdFdmVudFtdLFxyXG4gICAgYWN0aXZlTm90ZXM6IE5vdGVSZWNvcmRbXSxcclxuICAgIHRvZGF5U3RyOiBzdHJpbmcsXHJcbiAgKTogdm9pZCB7XHJcbiAgICBjb25zdCBwcmFjdGljZWRDb3VudHMgPSB0aGlzLmJ1aWxkUHJhY3RpY2VkQ291bnRzKGhpc3RvcnkpO1xyXG4gICAgY29uc3QgdXBjb21pbmdEdWUgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG4gICAgZm9yIChjb25zdCBub3RlIG9mIGFjdGl2ZU5vdGVzKSB7XHJcbiAgICAgIGNvbnN0IGR1ZURhdGUgPSBuZXcgRGF0ZShub3RlLmxhc3RSZXZpZXdlZE9uKTtcclxuICAgICAgZHVlRGF0ZS5zZXREYXRlKGR1ZURhdGUuZ2V0RGF0ZSgpICsgbm90ZS5pbnRlcnZhbCk7XHJcbiAgICAgIGNvbnN0IGR1ZURhdGVTdHIgPSBkdWVEYXRlLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xyXG4gICAgICBpZiAoZHVlRGF0ZVN0ciA+IHRvZGF5U3RyKSB1cGNvbWluZ0R1ZS5zZXQoZHVlRGF0ZVN0ciwgKHVwY29taW5nRHVlLmdldChkdWVEYXRlU3RyKSA/PyAwKSArIDEpO1xyXG4gICAgfVxyXG4gICAgY29uc3QgdG9kYXlZZWFyID0gcGFyc2VJbnQodG9kYXlTdHIuc2xpY2UoMCwgNCkpO1xyXG4gICAgY29uc3QgdG9kYXlNb250aCA9IHBhcnNlSW50KHRvZGF5U3RyLnNsaWNlKDUsIDcpKSAtIDE7IC8vIDAtaW5kZXhlZFxyXG4gICAgY29uc3QgaXNUaGlzTW9udGggPSB0aGlzLmNhbGVuZGFyWWVhciA9PT0gdG9kYXlZZWFyICYmIHRoaXMuY2FsZW5kYXJNb250aCA9PT0gdG9kYXlNb250aDtcclxuICAgIGNvbnN0IG1vbnRoTmFtZSA9IG5ldyBEYXRlKHRoaXMuY2FsZW5kYXJZZWFyLCB0aGlzLmNhbGVuZGFyTW9udGgsIDEpLnRvTG9jYWxlU3RyaW5nKFwiZGVmYXVsdFwiLCB7IG1vbnRoOiBcImxvbmdcIiB9KTtcclxuICAgIGNvbnN0IGxhYmVsID0gaXNUaGlzTW9udGggPyBcIlRoaXMgbW9udGhcIiA6IGAke21vbnRoTmFtZX0sICR7dGhpcy5jYWxlbmRhclllYXJ9YDtcclxuICAgIHRoaXMuY3JlYXRlTmF2Um93KFxyXG4gICAgICBjaGFydEFyZWEsXHJcbiAgICAgIGxhYmVsLFxyXG4gICAgICAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5jYWxlbmRhck1vbnRoLS07XHJcbiAgICAgICAgaWYgKHRoaXMuY2FsZW5kYXJNb250aCA8IDApIHtcclxuICAgICAgICAgIHRoaXMuY2FsZW5kYXJNb250aCA9IDExO1xyXG4gICAgICAgICAgdGhpcy5jYWxlbmRhclllYXItLTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgfSxcclxuICAgICAgKCkgPT4ge1xyXG4gICAgICAgIHRoaXMuY2FsZW5kYXJNb250aCsrO1xyXG4gICAgICAgIGlmICh0aGlzLmNhbGVuZGFyTW9udGggPiAxMSkge1xyXG4gICAgICAgICAgdGhpcy5jYWxlbmRhck1vbnRoID0gMDtcclxuICAgICAgICAgIHRoaXMuY2FsZW5kYXJZZWFyKys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgIH0sXHJcbiAgICApO1xyXG4gICAgdGhpcy5yZW5kZXJNb250aENhbGVuZGFyKGNoYXJ0QXJlYSwgdGhpcy5jYWxlbmRhclllYXIsIHRoaXMuY2FsZW5kYXJNb250aCwgcHJhY3RpY2VkQ291bnRzLCB0b2RheVN0ciwgdXBjb21pbmdEdWUpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXJZZWFyU2VjdGlvbihjaGFydEFyZWE6IEhUTUxFbGVtZW50LCBoaXN0b3J5OiBSZXZpZXdFdmVudFtdLCB0b2RheVN0cjogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zdCB5ZWFyRXZlbnRzID0gaGlzdG9yeS5maWx0ZXIoKGUpID0+IGUudGltZXN0YW1wLnN0YXJ0c1dpdGgoU3RyaW5nKHRoaXMuaGVhdG1hcFllYXIpKSk7XHJcbiAgICBjb25zdCBwcmFjdGljZWRJblllYXIgPSB0aGlzLmJ1aWxkUHJhY3RpY2VkQ291bnRzKHllYXJFdmVudHMpO1xyXG4gICAgdGhpcy5jcmVhdGVOYXZSb3coXHJcbiAgICAgIGNoYXJ0QXJlYSxcclxuICAgICAgU3RyaW5nKHRoaXMuaGVhdG1hcFllYXIpLFxyXG4gICAgICAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5oZWF0bWFwWWVhci0tO1xyXG4gICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgICAgIH0sXHJcbiAgICAgICgpID0+IHtcclxuICAgICAgICB0aGlzLmhlYXRtYXBZZWFyKys7XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgfSxcclxuICAgICk7XHJcbiAgICB0aGlzLnJlbmRlclllYXJIZWF0bWFwKGNoYXJ0QXJlYSwgdGhpcy5oZWF0bWFwWWVhciwgcHJhY3RpY2VkSW5ZZWFyLCB0b2RheVN0cik7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlckZvcmVjYXN0U2VjdGlvbihjaGFydEFyZWE6IEhUTUxFbGVtZW50LCBhY3RpdmVOb3RlczogTm90ZVJlY29yZFtdLCB0b2RheVN0cjogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zdCBmb3JlY2FzdERheXMgPSBNYXRoLm1pbihQRVJJT0RfREFZU1t0aGlzLmZvcmVjYXN0Q2hhcnRQZXJpb2RdLCA3MzApO1xyXG4gICAgY29uc3QgZm9yZWNhc3REYXRhID0gdGhpcy5idWlsZEZvcmVjYXN0RGF0YShhY3RpdmVOb3RlcywgdG9kYXlTdHIsIGZvcmVjYXN0RGF5cyk7XHJcbiAgICB0aGlzLnJlbmRlckZvcmVjYXN0Q2hhcnQoY2hhcnRBcmVhLCBmb3JlY2FzdERhdGEsIHRoaXMuZm9yZWNhc3RDaGFydFBlcmlvZCwgKHApID0+IHtcclxuICAgICAgdGhpcy5mb3JlY2FzdENoYXJ0UGVyaW9kID0gcDtcclxuICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXJSZXZpZXdzU2VjdGlvbihjaGFydEFyZWE6IEhUTUxFbGVtZW50LCBoaXN0b3J5OiBSZXZpZXdFdmVudFtdKTogdm9pZCB7XHJcbiAgICBjb25zdCBkYWlseURhdGEgPSB0aGlzLmJ1aWxkRGFpbHlSZXZpZXdEYXRhKGhpc3RvcnkpO1xyXG4gICAgaWYgKGRhaWx5RGF0YS5sZW5ndGggPT09IDApIHtcclxuICAgICAgY2hhcnRBcmVhLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gcmV2aWV3IGhpc3RvcnkgeWV0LlwiLCBjbHM6IFwic3BhY2VkLW11dGVkXCIgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnJlbmRlckJhclRyZW5kQ2hhcnQoY2hhcnRBcmVhLCBkYWlseURhdGEsIHRoaXMucmV2aWV3Q2hhcnRQZXJpb2QsIChwKSA9PiB7XHJcbiAgICAgICAgdGhpcy5yZXZpZXdDaGFydFBlcmlvZCA9IHA7XHJcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlckR1ZVNlY3Rpb24oY2hhcnRBcmVhOiBIVE1MRWxlbWVudCk6IHZvaWQge1xyXG4gICAgY29uc3QgbG9nID0gdGhpcy5wbHVnaW4uZGF0YS5yZXZpZXdMb2FkTG9nO1xyXG4gICAgaWYgKGxvZy5sZW5ndGggPT09IDApIHtcclxuICAgICAgY2hhcnRBcmVhLmNyZWF0ZUVsKFwicFwiLCB7XHJcbiAgICAgICAgdGV4dDogXCJObyBzeW5jIGhpc3RvcnkgeWV0LiBSdW4gJ1N5bmMgdmF1bHQnIHRvIHN0YXJ0IGxvZ2dpbmcuXCIsXHJcbiAgICAgICAgY2xzOiBcInNwYWNlZC1tdXRlZFwiLFxyXG4gICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMucmVuZGVyQmFyVHJlbmRDaGFydChcclxuICAgICAgICBjaGFydEFyZWEsXHJcbiAgICAgICAgdGhpcy5idWlsZERhaWx5RGF0YShsb2csIChlKSA9PiBlLm51bUR1ZSwgdHJ1ZSksXHJcbiAgICAgICAgdGhpcy5kdWVDaGFydFBlcmlvZCxcclxuICAgICAgICAocCkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5kdWVDaGFydFBlcmlvZCA9IHA7XHJcbiAgICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgU2hhcmVkIGNoYXJ0IGluZnJhc3RydWN0dXJlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gIC8vIFVzZWQgYnkgbXVsdGlwbGUgY2hhcnRzOiBzY2FmZm9sZCwgaGVscGVycywgc2hhcmVkIHByaW1pdGl2ZXNcclxuXHJcbiAgcHJpdmF0ZSBidWlsZENoYXJ0U2NhZmZvbGQoXHJcbiAgICBjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG4gICAgZGF0YTogeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfVtdLFxyXG4gICAgc2VsRWw6IEhUTUxFbGVtZW50LFxyXG4gICk6IHsgc3ZnOiBTVkdFbGVtZW50OyBjaGFydEg6IG51bWJlcjsgdG90YWxIOiBudW1iZXI7IHRvdGFsVzogbnVtYmVyOyB5U2NhbGU6IFNjYWxlTGluZWFyPG51bWJlciwgbnVtYmVyPiB9IHtcclxuICAgIGNvbnN0IGxhYmVsSCA9IDI0O1xyXG4gICAgY29uc3Qgc2VsSCA9IHNlbEVsLm9mZnNldEhlaWdodCArIDY7XHJcbiAgICBjb25zdCBjaGFydEggPSBNYXRoLm1heCgoY29udGFpbmVyLmNsaWVudEhlaWdodCB8fCAyMDApIC0gbGFiZWxIIC0gc2VsSCAtIDEwLCAxMDApO1xyXG4gICAgY29uc3QgdG90YWxIID0gY2hhcnRIICsgbGFiZWxIICsgMjA7XHJcbiAgICBjb25zdCB5QXhpc1cgPSAzNDtcclxuICAgIGNvbnN0IHRvdGFsVyA9IE1hdGgubWF4KChjb250YWluZXIuY2xpZW50V2lkdGggfHwgMzAwKSAtIHlBeGlzVyAtIDgsIDYwKTtcclxuICAgIGNvbnN0IGRhdGFNYXggPSBNYXRoLm1heCguLi5kYXRhLm1hcCgoZCkgPT4gZC52YWx1ZSksIDEpO1xyXG4gICAgY29uc3QgdG9wUGFkID0gMTQ7IC8vIHBpeGVscyByZXNlcnZlZCBhYm92ZSB0aGUgdGFsbGVzdCBiYXIgZm9yIGxhYmVsc1xyXG4gICAgY29uc3QgeVNjYWxlID0gc2NhbGVMaW5lYXIoKS5kb21haW4oWzAsIGRhdGFNYXhdKS5yYW5nZShbY2hhcnRILCB0b3BQYWRdKS5uaWNlKDYpO1xyXG4gICAgY29uc3QgeVRpY2tzID0geVNjYWxlLnRpY2tzKDYpO1xyXG5cclxuICAgIGNvbnN0IHdyYXBFbCA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWNoYXJ0LXdyYXBcIiB9KTtcclxuXHJcbiAgICAvLyBcdTI1MDBcdTI1MDAgWS1heGlzIFNWRyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICAgIGNvbnN0IHlBeGlzU3ZnID0gc2VsZWN0KHdyYXBFbClcclxuICAgICAgLmFwcGVuZChcInN2Z1wiKVxyXG4gICAgICAuYXR0cihcIndpZHRoXCIsIHlBeGlzVylcclxuICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgdG90YWxIKVxyXG4gICAgICAuYXR0cihcImNsYXNzXCIsIFwic3BhY2VkLXktYXhpcy1zdmdcIik7XHJcblxyXG4gICAgeUF4aXNTdmdcclxuICAgICAgLnNlbGVjdEFsbDxTVkdMaW5lRWxlbWVudCwgbnVtYmVyPihcImxpbmUueS10aWNrXCIpXHJcbiAgICAgIC5kYXRhKHlUaWNrcylcclxuICAgICAgLmpvaW4oXCJsaW5lXCIpXHJcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ5LXRpY2tcIilcclxuICAgICAgLmF0dHIoXCJ4MVwiLCB5QXhpc1cgLSA0KVxyXG4gICAgICAuYXR0cihcInkxXCIsIChkKSA9PiBNYXRoLnJvdW5kKHlTY2FsZShkKSkpXHJcbiAgICAgIC5hdHRyKFwieDJcIiwgeUF4aXNXKVxyXG4gICAgICAuYXR0cihcInkyXCIsIChkKSA9PiBNYXRoLnJvdW5kKHlTY2FsZShkKSkpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwidmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpXCIpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIDEpO1xyXG5cclxuICAgIHlBeGlzU3ZnXHJcbiAgICAgIC5zZWxlY3RBbGw8U1ZHVGV4dEVsZW1lbnQsIG51bWJlcj4oXCJ0ZXh0LnktbGFiZWxcIilcclxuICAgICAgLmRhdGEoeVRpY2tzKVxyXG4gICAgICAuam9pbihcInRleHRcIilcclxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcInktbGFiZWxcIilcclxuICAgICAgLmF0dHIoXCJ4XCIsIHlBeGlzVyAtIDYpXHJcbiAgICAgIC5hdHRyKFwieVwiLCAoZCkgPT4gTWF0aC5yb3VuZCh5U2NhbGUoZCkpICsgMylcclxuICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcImVuZFwiKVxyXG4gICAgICAuYXR0cihcImZvbnQtc2l6ZVwiLCAxNilcclxuICAgICAgLmF0dHIoXCJmaWxsXCIsIFwidmFyKC0tdGV4dC1tdXRlZClcIilcclxuICAgICAgLnRleHQoKGQpID0+IFN0cmluZyhkKSk7XHJcblxyXG4gICAgeUF4aXNTdmdcclxuICAgICAgLmFwcGVuZChcImxpbmVcIilcclxuICAgICAgLmF0dHIoXCJ4MVwiLCB5QXhpc1cpXHJcbiAgICAgIC5hdHRyKFwieTFcIiwgMClcclxuICAgICAgLmF0dHIoXCJ4MlwiLCB5QXhpc1cpXHJcbiAgICAgIC5hdHRyKFwieTJcIiwgY2hhcnRIKVxyXG4gICAgICAuYXR0cihcInN0cm9rZVwiLCBcInZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKVwiKVxyXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAxKTtcclxuXHJcbiAgICAvLyBcdTI1MDBcdTI1MDAgQ2hhcnQgU1ZHIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gICAgY29uc3QgY2hhcnRTdmcgPSBzZWxlY3Qod3JhcEVsKVxyXG4gICAgICAuYXBwZW5kKFwic3ZnXCIpXHJcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwgdG90YWxXKVxyXG4gICAgICAuYXR0cihcImhlaWdodFwiLCB0b3RhbEgpXHJcbiAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJzcGFjZWQtY2hhcnQtc3ZnXCIpO1xyXG5cclxuICAgIGNoYXJ0U3ZnXHJcbiAgICAgIC5zZWxlY3RBbGw8U1ZHTGluZUVsZW1lbnQsIG51bWJlcj4oXCJsaW5lLmdyaWQtaFwiKVxyXG4gICAgICAuZGF0YSh5VGlja3MpXHJcbiAgICAgIC5qb2luKFwibGluZVwiKVxyXG4gICAgICAuYXR0cihcImNsYXNzXCIsIFwiZ3JpZC1oXCIpXHJcbiAgICAgIC5hdHRyKFwieDFcIiwgMClcclxuICAgICAgLmF0dHIoXCJ5MVwiLCAoZCkgPT4gTWF0aC5yb3VuZCh5U2NhbGUoZCkpKVxyXG4gICAgICAuYXR0cihcIngyXCIsIHRvdGFsVylcclxuICAgICAgLmF0dHIoXCJ5MlwiLCAoZCkgPT4gTWF0aC5yb3VuZCh5U2NhbGUoZCkpKVxyXG4gICAgICAuYXR0cihcInN0cm9rZVwiLCBcInZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKVwiKVxyXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAxKVxyXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIiwgMC40KTtcclxuXHJcbiAgICBjaGFydFN2Z1xyXG4gICAgICAuYXBwZW5kKFwibGluZVwiKVxyXG4gICAgICAuYXR0cihcIngxXCIsIDApXHJcbiAgICAgIC5hdHRyKFwieTFcIiwgY2hhcnRIKVxyXG4gICAgICAuYXR0cihcIngyXCIsIHRvdGFsVylcclxuICAgICAgLmF0dHIoXCJ5MlwiLCBjaGFydEgpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwidmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpXCIpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlLXdpZHRoXCIsIDEpO1xyXG5cclxuICAgIHJldHVybiB7IHN2ZzogY2hhcnRTdmcubm9kZSgpISwgY2hhcnRILCB0b3RhbEgsIHRvdGFsVywgeVNjYWxlIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbmRlckxpbmVDb250ZW50KFxyXG4gICAgc3ZnOiBTVkdFbGVtZW50LFxyXG4gICAgZGF0YTogeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfVtdLFxyXG4gICAgcGVyaW9kOiBDaGFydFBlcmlvZCxcclxuICAgIGNoYXJ0SDogbnVtYmVyLFxyXG4gICAgdG90YWxIOiBudW1iZXIsXHJcbiAgICB0b3RhbFc6IG51bWJlcixcclxuICAgIHlTY2FsZTogU2NhbGVMaW5lYXI8bnVtYmVyLCBudW1iZXI+LFxyXG4gICk6IHZvaWQge1xyXG4gICAgY29uc3QgZGF0ZXMgPSBkYXRhLm1hcCgoZCkgPT4gbmV3IERhdGUoZC5kYXRlKSk7XHJcbiAgICBjb25zdCB4U2NhbGUgPSBzY2FsZVRpbWUoKVxyXG4gICAgICAuZG9tYWluKFtkYXRlc1swXSwgZGF0ZXNbZGF0ZXMubGVuZ3RoIC0gMV1dKVxyXG4gICAgICAucmFuZ2UoWzAsIHRvdGFsV10pO1xyXG5cclxuICAgIGNvbnN0IHRpY2tJbnRlcnZhbCA9XHJcbiAgICAgIHBlcmlvZCA9PT0gXCIxV1wiXHJcbiAgICAgICAgPyB0aW1lRGF5LmV2ZXJ5KDEpXHJcbiAgICAgICAgOiBwZXJpb2QgPT09IFwiMldcIlxyXG4gICAgICAgICAgPyB0aW1lRGF5LmV2ZXJ5KDIpXHJcbiAgICAgICAgICA6IHBlcmlvZCA9PT0gXCIxTVwiXHJcbiAgICAgICAgICAgID8gdGltZURheS5ldmVyeSgxMClcclxuICAgICAgICAgICAgOiBwZXJpb2QgPT09IFwiNk1cIlxyXG4gICAgICAgICAgICAgID8gdGltZU1vbnRoLmV2ZXJ5KDEpXHJcbiAgICAgICAgICAgICAgOiBwZXJpb2QgPT09IFwiMVlcIlxyXG4gICAgICAgICAgICAgICAgPyB0aW1lTW9udGguZXZlcnkoMSlcclxuICAgICAgICAgICAgICAgIDogdGltZVllYXIuZXZlcnkoMSk7XHJcbiAgICBjb25zdCB4VGlja3MgPSB4U2NhbGUudGlja3ModGlja0ludGVydmFsISk7XHJcbiAgICBjb25zdCBmbXQgPSBtYWtlVGltZUZvcm1hdChwZXJpb2QpO1xyXG5cclxuICAgIGNvbnN0IHJhd0RhdGEgPSBkYXRlcy5tYXAoKGRhdGUsIGkpID0+ICh7IGRhdGUsIHZhbHVlOiBkYXRhW2ldLnZhbHVlIH0pKTtcclxuXHJcbiAgICBjb25zdCBhcmVhR2VuID0gZDNBcmVhPHsgZGF0ZTogRGF0ZTsgdmFsdWU6IG51bWJlciB9PigpXHJcbiAgICAgIC54KChkKSA9PiB4U2NhbGUoZC5kYXRlKSlcclxuICAgICAgLnkwKGNoYXJ0SClcclxuICAgICAgLnkxKChkKSA9PiB5U2NhbGUoZC52YWx1ZSkpO1xyXG5cclxuICAgIGNvbnN0IGxpbmVHZW4gPSBkM0xpbmU8eyBkYXRlOiBEYXRlOyB2YWx1ZTogbnVtYmVyIH0+KClcclxuICAgICAgLngoKGQpID0+IHhTY2FsZShkLmRhdGUpKVxyXG4gICAgICAueSgoZCkgPT4geVNjYWxlKGQudmFsdWUpKTtcclxuXHJcbiAgICBjb25zdCBzdmdTZWwgPSBzZWxlY3Qoc3ZnKTtcclxuXHJcbiAgICBzdmdTZWxcclxuICAgICAgLnNlbGVjdEFsbDxTVkdMaW5lRWxlbWVudCwgRGF0ZT4oXCJsaW5lLmdyaWQtdlwiKVxyXG4gICAgICAuZGF0YSh4VGlja3MpXHJcbiAgICAgIC5qb2luKFwibGluZVwiKVxyXG4gICAgICAuYXR0cihcImNsYXNzXCIsIFwiZ3JpZC12XCIpXHJcbiAgICAgIC5hdHRyKFwieDFcIiwgKGQpID0+IE1hdGgucm91bmQoeFNjYWxlKGQpKSlcclxuICAgICAgLmF0dHIoXCJ5MVwiLCAwKVxyXG4gICAgICAuYXR0cihcIngyXCIsIChkKSA9PiBNYXRoLnJvdW5kKHhTY2FsZShkKSkpXHJcbiAgICAgIC5hdHRyKFwieTJcIiwgY2hhcnRIICsgMTApXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwidmFyKC0tY29sb3ItYmFzZS00MClcIilcclxuICAgICAgLmF0dHIoXCJzdHJva2Utd2lkdGhcIiwgMC41KTtcclxuXHJcbiAgICBzdmdTZWxcclxuICAgICAgLmFwcGVuZChcInBhdGhcIilcclxuICAgICAgLmF0dHIoXCJkXCIsIGFyZWFHZW4ocmF3RGF0YSkgPz8gXCJcIilcclxuICAgICAgLmF0dHIoXCJmaWxsXCIsIFwidmFyKC0taW50ZXJhY3RpdmUtYWNjZW50KVwiKVxyXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIiwgMC4xNSlcclxuICAgICAgLmF0dHIoXCJzdHJva2VcIiwgXCJub25lXCIpO1xyXG5cclxuICAgIHN2Z1NlbFxyXG4gICAgICAuYXBwZW5kKFwicGF0aFwiKVxyXG4gICAgICAuYXR0cihcImRcIiwgbGluZUdlbihyYXdEYXRhKSA/PyBcIlwiKVxyXG4gICAgICAuYXR0cihcImZpbGxcIiwgXCJub25lXCIpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwidmFyKC0taW50ZXJhY3RpdmUtYWNjZW50KVwiKVxyXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAxLjUpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlLWxpbmVjYXBcIiwgXCJyb3VuZFwiKVxyXG4gICAgICAuYXR0cihcInN0cm9rZS1saW5lam9pblwiLCBcInJvdW5kXCIpO1xyXG5cclxuICAgIHN2Z1NlbFxyXG4gICAgICAuc2VsZWN0QWxsPFNWR1RleHRFbGVtZW50LCBEYXRlPihcInRleHQueC1sYWJlbFwiKVxyXG4gICAgICAuZGF0YSh4VGlja3MpXHJcbiAgICAgIC5qb2luKFwidGV4dFwiKVxyXG4gICAgICAuYXR0cihcImNsYXNzXCIsIFwieC1sYWJlbFwiKVxyXG4gICAgICAuYXR0cihcInhcIiwgKGQpID0+IE1hdGgucm91bmQoeFNjYWxlKGQpKSlcclxuICAgICAgLmF0dHIoXCJ5XCIsIHRvdGFsSCAtIDIpXHJcbiAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcclxuICAgICAgLmF0dHIoXCJmb250LXNpemVcIiwgMTIpXHJcbiAgICAgIC5hdHRyKFwiZmlsbFwiLCBcInZhcigtLXRleHQtbXV0ZWQpXCIpXHJcbiAgICAgIC50ZXh0KChkKSA9PiBmbXQoZCkpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSByZW5kZXJCYXJDb250ZW50KFxyXG4gICAgc3ZnOiBTVkdFbGVtZW50LFxyXG4gICAgZGF0YTogeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfVtdLFxyXG4gICAgcGVyaW9kOiBDaGFydFBlcmlvZCxcclxuICAgIGNoYXJ0SDogbnVtYmVyLFxyXG4gICAgdG90YWxIOiBudW1iZXIsXHJcbiAgICB0b3RhbFc6IG51bWJlcixcclxuICAgIHlTY2FsZTogU2NhbGVMaW5lYXI8bnVtYmVyLCBudW1iZXI+LFxyXG4gICAgdG9kYXlTdHI/OiBzdHJpbmcsXHJcbiAgKTogdm9pZCB7XHJcbiAgICBjb25zdCB4U2NhbGUgPSBzY2FsZUJhbmQ8c3RyaW5nPigpXHJcbiAgICAgIC5kb21haW4oZGF0YS5tYXAoKGQpID0+IGQuZGF0ZSkpXHJcbiAgICAgIC5yYW5nZShbMCwgdG90YWxXXSlcclxuICAgICAgLnBhZGRpbmcoMC4zNSk7XHJcbiAgICBjb25zdCBiYXJXID0geFNjYWxlLmJhbmR3aWR0aCgpO1xyXG4gICAgY29uc3QgZm10ID0gbWFrZVRpbWVGb3JtYXQocGVyaW9kKTtcclxuXHJcbiAgICBjb25zdCBsYWJlbERhdGVzID0gZGF0YS5maWx0ZXIoKGQsIGkpID0+IHtcclxuICAgICAgaWYgKHBlcmlvZCA9PT0gXCIxV1wiKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgaWYgKHBlcmlvZCA9PT0gXCIyV1wiKSByZXR1cm4gaSAlIDIgPT09IDA7XHJcbiAgICAgIGlmIChwZXJpb2QgPT09IFwiMU1cIikge1xyXG4gICAgICAgIGNvbnN0IGRheSA9IHBhcnNlSW50KGQuZGF0ZS5zbGljZSg4LCAxMCkpO1xyXG4gICAgICAgIHJldHVybiBkYXkgPT09IDEgfHwgZGF5ID09PSAxMCB8fCBkYXkgPT09IDIwO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJvbGxpbmcgPSB0aGlzLnJvbGxpbmdBdmVyYWdlKGRhdGEpO1xyXG4gICAgY29uc3QgcmF3RGF0YSA9IGRhdGEubWFwKChkLCBpKSA9PiAoeyBkYXRlOiBkLmRhdGUsIHZhbHVlOiByb2xsaW5nW2ldIH0pKTtcclxuXHJcbiAgICBjb25zdCBsaW5lR2VuID0gZDNMaW5lPHsgZGF0ZTogc3RyaW5nOyB2YWx1ZTogbnVtYmVyIH0+KClcclxuICAgICAgLngoKGQpID0+ICh4U2NhbGUoZC5kYXRlKSA/PyAwKSArIGJhclcgLyAyKVxyXG4gICAgICAueSgoZCkgPT4geVNjYWxlKGQudmFsdWUpKTtcclxuXHJcbiAgICBjb25zdCBzdmdTZWwgPSBzZWxlY3Qoc3ZnKTtcclxuXHJcbiAgICBzdmdTZWxcclxuICAgICAgLnNlbGVjdEFsbDxTVkdMaW5lRWxlbWVudCwgeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfT4oXCJsaW5lLmdyaWQtdlwiKVxyXG4gICAgICAuZGF0YShsYWJlbERhdGVzKVxyXG4gICAgICAuam9pbihcImxpbmVcIilcclxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImdyaWQtdlwiKVxyXG4gICAgICAuYXR0cihcIngxXCIsIChkKSA9PiAoeFNjYWxlKGQuZGF0ZSkgPz8gMCkgKyBiYXJXIC8gMilcclxuICAgICAgLmF0dHIoXCJ5MVwiLCAwKVxyXG4gICAgICAuYXR0cihcIngyXCIsIChkKSA9PiAoeFNjYWxlKGQuZGF0ZSkgPz8gMCkgKyBiYXJXIC8gMilcclxuICAgICAgLmF0dHIoXCJ5MlwiLCBjaGFydEggKyAxMClcclxuICAgICAgLmF0dHIoXCJzdHJva2VcIiwgXCJ2YXIoLS1jb2xvci1iYXNlLTQwKVwiKVxyXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAwLjUpO1xyXG5cclxuICAgIHN2Z1NlbFxyXG4gICAgICAuYXBwZW5kKFwicGF0aFwiKVxyXG4gICAgICAuYXR0cihcImRcIiwgbGluZUdlbihyYXdEYXRhKSA/PyBcIlwiKVxyXG4gICAgICAuYXR0cihcImZpbGxcIiwgXCJub25lXCIpXHJcbiAgICAgIC5hdHRyKFwic3Ryb2tlXCIsIFwidmFyKC0taW50ZXJhY3RpdmUtYWNjZW50KVwiKVxyXG4gICAgICAuYXR0cihcInN0cm9rZS13aWR0aFwiLCAzKVxyXG4gICAgICAuYXR0cihcInN0cm9rZS1saW5lY2FwXCIsIFwicm91bmRcIilcclxuICAgICAgLmF0dHIoXCJzdHJva2UtbGluZWpvaW5cIiwgXCJyb3VuZFwiKVxyXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIiwgMC44KTtcclxuXHJcbiAgICBzdmdTZWxcclxuICAgICAgLnNlbGVjdEFsbDxTVkdSZWN0RWxlbWVudCwgeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfT4oXCJyZWN0LmJhclwiKVxyXG4gICAgICAuZGF0YShkYXRhKVxyXG4gICAgICAuam9pbihcInJlY3RcIilcclxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImJhclwiKVxyXG4gICAgICAuYXR0cihcInhcIiwgKGQpID0+IHhTY2FsZShkLmRhdGUpID8/IDApXHJcbiAgICAgIC5hdHRyKFwieVwiLCAoZCkgPT4geVNjYWxlKGQudmFsdWUpKVxyXG4gICAgICAuYXR0cihcIndpZHRoXCIsIGJhclcpXHJcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIChkKSA9PiBNYXRoLm1heChNYXRoLnJvdW5kKHlTY2FsZSgwKSAtIHlTY2FsZShkLnZhbHVlKSksIGQudmFsdWUgPiAwID8gMiA6IDApKVxyXG4gICAgICAuYXR0cihcInJ4XCIsIDIpXHJcbiAgICAgIC5hdHRyKFwiZmlsbFwiLCBcInZhcigtLWNvbG9yLWdyZWVuKVwiKVxyXG4gICAgICAuYXR0cihcIm9wYWNpdHlcIiwgMSk7XHJcblxyXG4gICAgLy8gVmFsdWUgbGFiZWxzIGFib3ZlIGJhcnMgXHUyMDE0IG9ubHkgZm9yIG5hcnJvdy1wZXJpb2Qgdmlld3NcclxuICAgIGlmIChwZXJpb2QgPT09IFwiMVdcIiB8fCBwZXJpb2QgPT09IFwiMldcIikge1xyXG4gICAgICBzdmdTZWxcclxuICAgICAgICAuc2VsZWN0QWxsPFNWR1RleHRFbGVtZW50LCB7IGRhdGU6IHN0cmluZzsgdmFsdWU6IG51bWJlciB9PihcInRleHQuYmFyLWxhYmVsXCIpXHJcbiAgICAgICAgLmRhdGEoZGF0YS5maWx0ZXIoKGQpID0+IGQudmFsdWUgPiAwKSlcclxuICAgICAgICAuam9pbihcInRleHRcIilcclxuICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwiYmFyLWxhYmVsXCIpXHJcbiAgICAgICAgLmF0dHIoXCJ4XCIsIChkKSA9PiAoeFNjYWxlKGQuZGF0ZSkgPz8gMCkgKyBiYXJXIC8gMilcclxuICAgICAgICAuYXR0cihcInlcIiwgKGQpID0+IE1hdGgubWF4KHlTY2FsZShkLnZhbHVlKSAtIDYsIDEwKSkgLy8gY2xhbXAgc28gaXQgZG9lc24ndCBjbGlwIGF0IHRvcFxyXG4gICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcclxuICAgICAgICAuYXR0cihcImZvbnQtc2l6ZVwiLCAxMilcclxuICAgICAgICAuYXR0cihcImZvbnQtd2VpZ2h0XCIsIFwiYm9sZFwiKVxyXG4gICAgICAgIC5hdHRyKFwiZmlsbFwiLCBcInZhcigtLWNvbG9yLWdyZWVuKVwiKVxyXG4gICAgICAgIC50ZXh0KChkKSA9PiBTdHJpbmcoZC52YWx1ZSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHN2Z1NlbFxyXG4gICAgICAuc2VsZWN0QWxsPFNWR1RleHRFbGVtZW50LCB7IGRhdGU6IHN0cmluZzsgdmFsdWU6IG51bWJlciB9PihcInRleHQueC1sYWJlbFwiKVxyXG4gICAgICAuZGF0YShsYWJlbERhdGVzKVxyXG4gICAgICAuam9pbihcInRleHRcIilcclxuICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIngtbGFiZWxcIilcclxuICAgICAgLmF0dHIoXCJ4XCIsIChkKSA9PiAoeFNjYWxlKGQuZGF0ZSkgPz8gMCkgKyBiYXJXIC8gMilcclxuICAgICAgLmF0dHIoXCJ5XCIsIHRvdGFsSCAtIDE4KVxyXG4gICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIFwibWlkZGxlXCIpXHJcbiAgICAgIC5hdHRyKFwiZm9udC1zaXplXCIsIDE2KVxyXG4gICAgICAuYXR0cihcImZpbGxcIiwgXCJ2YXIoLS10ZXh0LW11dGVkKVwiKVxyXG4gICAgICAudGV4dCgoZCkgPT4gZm10KG5ldyBEYXRlKGQuZGF0ZSkpKTtcclxuXHJcbiAgICAvLyBUb2RheSBjaXJjbGUgbWFya2VyIFx1MjAxNCBvbmx5IHdoZW4gY2FsbGVkIGZyb20gdGhlIGZvcmVjYXN0IGNoYXJ0XHJcbiAgICBpZiAodG9kYXlTdHIgJiYgbGFiZWxEYXRlcy5zb21lKChkKSA9PiBkLmRhdGUgPT09IHRvZGF5U3RyKSkge1xyXG4gICAgICBjb25zdCB0eCA9ICh4U2NhbGUodG9kYXlTdHIpID8/IDApICsgYmFyVyAvIDI7XHJcbiAgICAgIC8vIGZvbnQtc2l6ZSBpcyAxNiwgYmFzZWxpbmUgYXQgdG90YWxILTIsIHNvIGNlbnRlciBcdTIyNDggdG90YWxILTEwXHJcbiAgICAgIHN2Z1NlbFxyXG4gICAgICAgIC5pbnNlcnQoXCJjaXJjbGVcIiwgXCJ0ZXh0LngtbGFiZWxcIikgLy8gaW5zZXJ0cyBiZWZvcmUgdGV4dCwgc28gY2lyY2xlIGlzIGJlaGluZFxyXG4gICAgICAgIC5hdHRyKFwiY3hcIiwgdHgpXHJcbiAgICAgICAgLmF0dHIoXCJjeVwiLCB0b3RhbEggLSAyNClcclxuICAgICAgICAuYXR0cihcInJcIiwgMTApXHJcbiAgICAgICAgLmF0dHIoXCJmaWxsXCIsIFwidmFyKC0tdGV4dC1tdXRlZClcIik7XHJcbiAgICAgIHN2Z1NlbFxyXG4gICAgICAgIC5zZWxlY3RBbGw8U1ZHVGV4dEVsZW1lbnQsIHsgZGF0ZTogc3RyaW5nOyB2YWx1ZTogbnVtYmVyIH0+KFwidGV4dC54LWxhYmVsXCIpXHJcbiAgICAgICAgLmZpbHRlcigoZCkgPT4gZC5kYXRlID09PSB0b2RheVN0cilcclxuICAgICAgICAuYXR0cihcImZpbGxcIiwgXCJ2YXIoLS1iYWNrZ3JvdW5kLXByaW1hcnkpXCIpXHJcbiAgICAgICAgLmF0dHIoXCJmb250LXNpemVcIiwgXCIxNnB4XCIpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZU5hdlJvdyhjb250YWluZXI6IEhUTUxFbGVtZW50LCBsYWJlbDogc3RyaW5nLCBvblByZXY6ICgpID0+IHZvaWQsIG9uTmV4dDogKCkgPT4gdm9pZCk6IHZvaWQge1xyXG4gICAgY29uc3QgbmF2ID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtbmF2LXJvd1wiIH0pO1xyXG4gICAgbmF2LmNyZWF0ZVNwYW4oeyB0ZXh0OiBsYWJlbCB9KTtcclxuICAgIGNvbnN0IGJ0bnMgPSBuYXYuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1uYXYtYnRuc1wiIH0pOyAvLyBcdTIxOTAgYWRkIGNsYXNzXHJcblxyXG4gICAgY29uc3QgcHJldkJ0biA9IGJ0bnMuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic3BhY2VkLW5hdi1idG5cIiB9KTtcclxuICAgIHNldEljb24ocHJldkJ0biwgXCJjaGV2cm9uLWxlZnRcIik7XHJcbiAgICBwcmV2QnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBvblByZXYpO1xyXG5cclxuICAgIGNvbnN0IG5leHRCdG4gPSBidG5zLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNwYWNlZC1uYXYtYnRuXCIgfSk7XHJcbiAgICBzZXRJY29uKG5leHRCdG4sIFwiY2hldnJvbi1yaWdodFwiKTtcclxuICAgIG5leHRCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIG9uTmV4dCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFkZFN0YXQoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgY29uc3Qgcm93ID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtc3RhdC1yb3dcIiB9KTtcclxuICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogbGFiZWwsIGNsczogXCJzcGFjZWQtc3RhdC1sYWJlbFwiIH0pO1xyXG4gICAgcm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiB2YWx1ZSwgY2xzOiBcInNwYWNlZC1zdGF0LXZhbHVlXCIgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJvbGxpbmdBdmVyYWdlKGRhdGE6IHsgdmFsdWU6IG51bWJlciB9W10sIHdpbmRvdyA9IDcpOiBudW1iZXJbXSB7XHJcbiAgICByZXR1cm4gZGF0YS5tYXAoKF8sIGkpID0+IHtcclxuICAgICAgY29uc3Qgc2xpY2UgPSBkYXRhLnNsaWNlKE1hdGgubWF4KDAsIGkgLSAod2luZG93IC0gMSkpLCBpICsgMSk7XHJcbiAgICAgIHJldHVybiBzbGljZS5yZWR1Y2UoKHMsIGQpID0+IHMgKyBkLnZhbHVlLCAwKSAvIHNsaWNlLmxlbmd0aDtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIERhdGEgYnVpbGRlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgcHJpdmF0ZSBidWlsZFByYWN0aWNlZENvdW50cyhldmVudHM6IHsgdGltZXN0YW1wOiBzdHJpbmcgfVtdKTogTWFwPHN0cmluZywgbnVtYmVyPiB7XHJcbiAgICBjb25zdCBjb3VudHMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG4gICAgZm9yIChjb25zdCBlIG9mIGV2ZW50cykge1xyXG4gICAgICBjb25zdCBkID0gZS50aW1lc3RhbXAuc2xpY2UoMCwgMTApO1xyXG4gICAgICBjb3VudHMuc2V0KGQsIChjb3VudHMuZ2V0KGQpID8/IDApICsgMSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY291bnRzO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBidWlsZERhaWx5UmV2aWV3RGF0YShoaXN0b3J5OiB7IHRpbWVzdGFtcDogc3RyaW5nIH1bXSk6IHsgZGF0ZTogc3RyaW5nOyB2YWx1ZTogbnVtYmVyIH1bXSB7XHJcbiAgICByZXR1cm4gdGhpcy5idWlsZERhaWx5RGF0YShoaXN0b3J5LCAoKSA9PiAxKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYnVpbGRGb3JlY2FzdERhdGEoXHJcbiAgICBhY3RpdmVOb3RlczogeyBsYXN0UmV2aWV3ZWRPbjogc3RyaW5nOyBpbnRlcnZhbDogbnVtYmVyIH1bXSxcclxuICAgIHRvZGF5U3RyOiBzdHJpbmcsXHJcbiAgICBkYXlzID0gNzMwLFxyXG4gICk6IHsgZGF0ZTogc3RyaW5nOyB2YWx1ZTogbnVtYmVyIH1bXSB7XHJcbiAgICBjb25zdCBkdWVCeURhdGUgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG4gICAgZm9yIChjb25zdCBub3RlIG9mIGFjdGl2ZU5vdGVzKSB7XHJcbiAgICAgIGNvbnN0IGR1ZURhdGUgPSBuZXcgRGF0ZShub3RlLmxhc3RSZXZpZXdlZE9uKTtcclxuICAgICAgZHVlRGF0ZS5zZXREYXRlKGR1ZURhdGUuZ2V0RGF0ZSgpICsgbm90ZS5pbnRlcnZhbCk7XHJcbiAgICAgIGNvbnN0IGR1ZURhdGVTdHIgPSBkdWVEYXRlLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xyXG4gICAgICBjb25zdCBlZmZlY3RpdmVEYXRlID0gZHVlRGF0ZVN0ciA8IHRvZGF5U3RyID8gdG9kYXlTdHIgOiBkdWVEYXRlU3RyO1xyXG4gICAgICBkdWVCeURhdGUuc2V0KGVmZmVjdGl2ZURhdGUsIChkdWVCeURhdGUuZ2V0KGVmZmVjdGl2ZURhdGUpID8/IDApICsgMSk7XHJcbiAgICB9XHJcbiAgICBjb25zdCByZXN1bHQ6IHsgZGF0ZTogc3RyaW5nOyB2YWx1ZTogbnVtYmVyIH1bXSA9IFtdO1xyXG4gICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZSh0b2RheVN0cik7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRheXM7IGkrKykge1xyXG4gICAgICBjb25zdCBjdXIgPSBuZXcgRGF0ZShzdGFydCk7XHJcbiAgICAgIGN1ci5zZXREYXRlKGN1ci5nZXREYXRlKCkgKyBpKTtcclxuICAgICAgY29uc3QgZCA9IGN1ci50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcclxuICAgICAgcmVzdWx0LnB1c2goeyBkYXRlOiBkLCB2YWx1ZTogZHVlQnlEYXRlLmdldChkKSA/PyAwIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYnVpbGREYWlseURhdGE8VCBleHRlbmRzIHsgdGltZXN0YW1wOiBzdHJpbmcgfT4oXHJcbiAgICBlbnRyaWVzOiBUW10sXHJcbiAgICBnZXRWYWx1ZTogKGVudHJ5OiBUKSA9PiBudW1iZXIsXHJcbiAgICBvdmVyd3JpdGUgPSBmYWxzZSxcclxuICApOiB7IGRhdGU6IHN0cmluZzsgdmFsdWU6IG51bWJlciB9W10ge1xyXG4gICAgY29uc3QgYnlEYXkgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xyXG4gICAgZm9yIChjb25zdCBlIG9mIGVudHJpZXMpIHtcclxuICAgICAgY29uc3QgZCA9IGUudGltZXN0YW1wLnNsaWNlKDAsIDEwKTtcclxuICAgICAgaWYgKG92ZXJ3cml0ZSkge1xyXG4gICAgICAgIGJ5RGF5LnNldChkLCBnZXRWYWx1ZShlKSk7IC8vIGtlZXAgbGFzdCB2YWx1ZSBmb3IgdGhlIGRheVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGJ5RGF5LnNldChkLCAoYnlEYXkuZ2V0KGQpID8/IDApICsgZ2V0VmFsdWUoZSkpOyAvLyBhY2N1bXVsYXRlXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChieURheS5zaXplID09PSAwKSByZXR1cm4gW107XHJcbiAgICBjb25zdCB0b2RheVN0ciA9IHRvZGF5KCk7XHJcbiAgICBjb25zdCBzdGFydCA9IFsuLi5ieURheS5rZXlzKCldLnNvcnQoKVswXTtcclxuICAgIGNvbnN0IHJlc3VsdDogeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfVtdID0gW107XHJcbiAgICBjb25zdCBjdXIgPSBuZXcgRGF0ZShzdGFydCk7XHJcbiAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZSh0b2RheVN0cik7XHJcbiAgICB3aGlsZSAoY3VyIDw9IGVuZCkge1xyXG4gICAgICBjb25zdCBkID0gY3VyLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xyXG4gICAgICByZXN1bHQucHVzaCh7IGRhdGU6IGQsIHZhbHVlOiBieURheS5nZXQoZCkgPz8gMCB9KTtcclxuICAgICAgY3VyLnNldERhdGUoY3VyLmdldERhdGUoKSArIDEpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcbiAgLy8gXHUyNTAwXHUyNTAwIENoYXJ0OiBMaW5lIHRyZW5kIChSZXZpZXdzICYgRHVlKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICBwcml2YXRlIHJlbmRlckJhclRyZW5kQ2hhcnQoXHJcbiAgICBjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG4gICAgYWxsRGF0YTogeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfVtdLFxyXG4gICAgcGVyaW9kOiBDaGFydFBlcmlvZCxcclxuICAgIG9uUGVyaW9kQ2hhbmdlOiAocDogQ2hhcnRQZXJpb2QpID0+IHZvaWQsXHJcbiAgKTogdm9pZCB7XHJcbiAgICBjb25zdCBzZWxFbCA9IHRoaXMuY3JlYXRlUGVyaW9kU2VsZWN0KGNvbnRhaW5lciwgcGVyaW9kLCBvblBlcmlvZENoYW5nZSk7XHJcbiAgICBjb25zdCBkYXlzID0gUEVSSU9EX0RBWVNbcGVyaW9kXTtcclxuXHJcbiAgICBsZXQgZGF0YTogeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfVtdO1xyXG4gICAgaWYgKGRheXMgPT09IEluZmluaXR5KSB7XHJcbiAgICAgIGRhdGEgPSBhbGxEYXRhO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gQnVpbGQgYSBmdWxsIHdpbmRvdyBvZiBgZGF5c2AgZGF5cyBlbmRpbmcgdG9kYXksIGZpbGxpbmcgZ2FwcyB3aXRoIDBcclxuICAgICAgY29uc3QgYnlEYXRlID0gbmV3IE1hcChhbGxEYXRhLm1hcCgoZCkgPT4gW2QuZGF0ZSwgZC52YWx1ZV0pKTtcclxuICAgICAgZGF0YSA9IFtdO1xyXG4gICAgICBjb25zdCBlbmQgPSBuZXcgRGF0ZSh0b2RheSgpKTtcclxuICAgICAgY29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShlbmQpO1xyXG4gICAgICBzdGFydC5zZXREYXRlKHN0YXJ0LmdldERhdGUoKSAtIGRheXMgKyAxKTtcclxuICAgICAgY29uc3QgY3VyID0gbmV3IERhdGUoc3RhcnQpO1xyXG4gICAgICB3aGlsZSAoY3VyIDw9IGVuZCkge1xyXG4gICAgICAgIGNvbnN0IGQgPSBjdXIudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XHJcbiAgICAgICAgZGF0YS5wdXNoKHsgZGF0ZTogZCwgdmFsdWU6IGJ5RGF0ZS5nZXQoZCkgPz8gMCB9KTtcclxuICAgICAgICBjdXIuc2V0RGF0ZShjdXIuZ2V0RGF0ZSgpICsgMSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoZGF0YS5sZW5ndGggPCAyKSB7XHJcbiAgICAgIGNvbnRhaW5lci5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vdCBlbm91Z2ggZGF0YSBmb3IgdGhpcyBwZXJpb2QuXCIsIGNsczogXCJzcGFjZWQtbXV0ZWRcIiB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHNob3dCYXJzID0gcGVyaW9kID09PSBcIjFXXCIgfHwgcGVyaW9kID09PSBcIjJXXCIgfHwgcGVyaW9kID09PSBcIjFNXCI7XHJcbiAgICBjb25zdCB7IHN2ZywgY2hhcnRILCB0b3RhbEgsIHRvdGFsVywgeVNjYWxlIH0gPSB0aGlzLmJ1aWxkQ2hhcnRTY2FmZm9sZChjb250YWluZXIsIGRhdGEsIHNlbEVsKTtcclxuXHJcbiAgICBpZiAoc2hvd0JhcnMpIHtcclxuICAgICAgdGhpcy5yZW5kZXJCYXJDb250ZW50KHN2ZywgZGF0YSwgcGVyaW9kLCBjaGFydEgsIHRvdGFsSCwgdG90YWxXLCB5U2NhbGUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5yZW5kZXJMaW5lQ29udGVudChzdmcsIGRhdGEsIHBlcmlvZCwgY2hhcnRILCB0b3RhbEgsIHRvdGFsVywgeVNjYWxlKTtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gXHUyNTAwXHUyNTAwIENoYXJ0OiBGb3JlY2FzdCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICBwcml2YXRlIHJlbmRlckZvcmVjYXN0Q2hhcnQoXHJcbiAgICBjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG4gICAgYWxsRGF0YTogeyBkYXRlOiBzdHJpbmc7IHZhbHVlOiBudW1iZXIgfVtdLFxyXG4gICAgcGVyaW9kOiBDaGFydFBlcmlvZCxcclxuICAgIG9uUGVyaW9kQ2hhbmdlOiAocDogQ2hhcnRQZXJpb2QpID0+IHZvaWQsXHJcbiAgKTogdm9pZCB7XHJcbiAgICBjb25zdCBzaG93QmFycyA9IHBlcmlvZCA9PT0gXCIxV1wiIHx8IHBlcmlvZCA9PT0gXCIyV1wiIHx8IHBlcmlvZCA9PT0gXCIxTVwiO1xyXG4gICAgY29uc3Qgc2VsRWwgPSB0aGlzLmNyZWF0ZVBlcmlvZFNlbGVjdChjb250YWluZXIsIHBlcmlvZCwgb25QZXJpb2RDaGFuZ2UpO1xyXG4gICAgY29uc3QgZGF5cyA9IFBFUklPRF9EQVlTW3BlcmlvZF07XHJcbiAgICBjb25zdCBkYXRhID0gZGF5cyA9PT0gSW5maW5pdHkgPyBhbGxEYXRhIDogYWxsRGF0YS5zbGljZSgwLCBkYXlzKTtcclxuXHJcbiAgICBpZiAoZGF0YS5sZW5ndGggPCAxKSB7XHJcbiAgICAgIGNvbnRhaW5lci5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIGFjdGl2ZSBub3Rlcy5cIiwgY2xzOiBcInNwYWNlZC1tdXRlZFwiIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgeyBzdmcsIGNoYXJ0SCwgdG90YWxILCB0b3RhbFcsIHlTY2FsZSB9ID0gdGhpcy5idWlsZENoYXJ0U2NhZmZvbGQoY29udGFpbmVyLCBkYXRhLCBzZWxFbCk7XHJcblxyXG4gICAgaWYgKHNob3dCYXJzKSB7XHJcbiAgICAgIHRoaXMucmVuZGVyQmFyQ29udGVudChzdmcsIGRhdGEsIHBlcmlvZCwgY2hhcnRILCB0b3RhbEgsIHRvdGFsVywgeVNjYWxlLCB0b2RheSgpKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMucmVuZGVyTGluZUNvbnRlbnQoc3ZnLCBkYXRhLCBwZXJpb2QsIGNoYXJ0SCwgdG90YWxILCB0b3RhbFcsIHlTY2FsZSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIFx1MjUwMFx1MjUwMCBDaGFydDogTW9udGggQ2FsZW5kYXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgcHJpdmF0ZSByZW5kZXJNb250aENhbGVuZGFyKFxyXG4gICAgY29udGFpbmVyOiBIVE1MRWxlbWVudCxcclxuICAgIHllYXI6IG51bWJlcixcclxuICAgIG1vbnRoOiBudW1iZXIsXHJcbiAgICBwcmFjdGljZWRDb3VudHM6IE1hcDxzdHJpbmcsIG51bWJlcj4sXHJcbiAgICB0b2RheVN0cjogc3RyaW5nLFxyXG4gICAgdXBjb21pbmdEdWU6IE1hcDxzdHJpbmcsIG51bWJlcj4sXHJcbiAgKTogdm9pZCB7XHJcbiAgICBjb25zdCBncmlkID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzZS1tb250aC1ncmlkXCIgfSk7XHJcbiAgICBmb3IgKGNvbnN0IGQgb2YgW1wiTW9cIiwgXCJUdVwiLCBcIldlXCIsIFwiVGhcIiwgXCJGclwiLCBcIlNhXCIsIFwiU3VcIl0pIHtcclxuICAgICAgZ3JpZC5jcmVhdGVEaXYoeyB0ZXh0OiBkLCBjbHM6IFwic2UtbW9udGgtaGVhZGVyXCIgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZmlyc3REb3cgPSAobmV3IERhdGUoeWVhciwgbW9udGgsIDEpLmdldERheSgpICsgNikgJSA3O1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmaXJzdERvdzsgaSsrKSB7XHJcbiAgICAgIGdyaWQuY3JlYXRlRGl2KHsgY2xzOiBcInNlLW1vbnRoLWNlbGwgc2UtbW9udGgtZW1wdHlcIiB9KTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBkYXlzSW5Nb250aCA9IG5ldyBEYXRlKHllYXIsIG1vbnRoICsgMSwgMCkuZ2V0RGF0ZSgpO1xyXG4gICAgY29uc3QgbWF4RHVlID0gTWF0aC5tYXgoLi4uQXJyYXkuZnJvbSh1cGNvbWluZ0R1ZS52YWx1ZXMoKSksIDEpO1xyXG4gICAgZm9yIChsZXQgZCA9IDE7IGQgPD0gZGF5c0luTW9udGg7IGQrKykge1xyXG4gICAgICBjb25zdCBkYXRlU3RyID0gYCR7eWVhcn0tJHtTdHJpbmcobW9udGggKyAxKS5wYWRTdGFydCgyLCBcIjBcIil9LSR7U3RyaW5nKGQpLnBhZFN0YXJ0KDIsIFwiMFwiKX1gO1xyXG4gICAgICBjb25zdCBkdWVDb3VudCA9IHVwY29taW5nRHVlLmdldChkYXRlU3RyKSA/PyAwO1xyXG4gICAgICBjb25zdCBpc0Z1dHVyZSA9IGRhdGVTdHIgPiB0b2RheVN0cjtcclxuICAgICAgY29uc3QgcmV2aWV3Q291bnQgPSBwcmFjdGljZWRDb3VudHMuZ2V0KGRhdGVTdHIpID8/IDA7XHJcbiAgICAgIGNvbnN0IGNscyA9IFtcclxuICAgICAgICBcInNlLW1vbnRoLWNlbGxcIixcclxuICAgICAgICByZXZpZXdDb3VudCA+IDAgPyBcInNlLW1vbnRoLXByYWN0aWNlZFwiIDogXCJcIixcclxuICAgICAgICBpc0Z1dHVyZSAmJiBkdWVDb3VudCA+IDAgPyBcInNlLW1vbnRoLXVwY29taW5nXCIgOiBcIlwiLFxyXG4gICAgICAgIGRhdGVTdHIgPT09IHRvZGF5U3RyID8gXCJzZS1tb250aC10b2RheVwiIDogXCJcIixcclxuICAgICAgXVxyXG4gICAgICAgIC5maWx0ZXIoQm9vbGVhbilcclxuICAgICAgICAuam9pbihcIiBcIik7XHJcbiAgICAgIGNvbnN0IGNlbGwgPSBncmlkLmNyZWF0ZURpdih7IGNscyB9KTtcclxuICAgICAgaWYgKGlzRnV0dXJlICYmIGR1ZUNvdW50ID4gMCkge1xyXG4gICAgICAgIGNvbnN0IHBjdCA9IE1hdGgucm91bmQoMTAgKyAoZHVlQ291bnQgLyBtYXhEdWUpICogNjApOyAvLyAxMCUgXHUyMTkyIDkwJVxyXG4gICAgICAgIGNlbGwuc3R5bGUuYmFja2dyb3VuZCA9IGBjb2xvci1taXgoaW4gc3JnYiwgdmFyKC0taW50ZXJhY3RpdmUtYWNjZW50KSAke3BjdH0lLCB0cmFuc3BhcmVudClgO1xyXG4gICAgICB9XHJcbiAgICAgIGNlbGwuY3JlYXRlU3Bhbih7IHRleHQ6IFN0cmluZyhkKSwgY2xzOiBcInNlLW1vbnRoLWRheS1udW1cIiB9KTtcclxuICAgICAgaWYgKHJldmlld0NvdW50ID4gMCkge1xyXG4gICAgICAgIGNlbGwuZGF0YXNldC50b29sdGlwID0gYCR7cmV2aWV3Q291bnR9IHJldmlldyR7cmV2aWV3Q291bnQgIT09IDEgPyBcInNcIiA6IFwiXCJ9YDtcclxuICAgICAgfSBlbHNlIGlmIChpc0Z1dHVyZSAmJiBkdWVDb3VudCA+IDApIHtcclxuICAgICAgICBjZWxsLmRhdGFzZXQudG9vbHRpcCA9IGAke2R1ZUNvdW50fSBkdWVgO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZVBlcmlvZFNlbGVjdChcclxuICAgIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcbiAgICBwZXJpb2Q6IENoYXJ0UGVyaW9kLFxyXG4gICAgb25QZXJpb2RDaGFuZ2U6IChwOiBDaGFydFBlcmlvZCkgPT4gdm9pZCxcclxuICApOiBIVE1MRWxlbWVudCB7XHJcbiAgICBjb25zdCB3cmFwcGVyID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtcGVyaW9kLXdyYXBwZXJcIiB9KTtcclxuICAgIGNvbnN0IGJ0biA9IHdyYXBwZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1wZXJpb2QtdHJpZ2dlclwiIH0pO1xyXG4gICAgY29uc3QgbGFiZWxFbCA9IGJ0bi5jcmVhdGVTcGFuKHsgdGV4dDogUEVSSU9EX0xBQkVMU1twZXJpb2RdLCBjbHM6IFwic3BhY2VkLWRlY2stbGFiZWxcIiB9KTtcclxuXHJcbiAgICBidG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XHJcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgIGNvbnN0IG1lbnUgPSBuZXcgTWVudSgpO1xyXG4gICAgICBmb3IgKGNvbnN0IHAgb2YgQ0hBUlRfUEVSSU9EUykge1xyXG4gICAgICAgIG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG4gICAgICAgICAgaXRlbS5zZXRUaXRsZShQRVJJT0RfTEFCRUxTW3BdKTtcclxuICAgICAgICAgIGl0ZW0uc2V0Q2hlY2tlZChwID09PSBwZXJpb2QpO1xyXG4gICAgICAgICAgaXRlbS5vbkNsaWNrKCgpID0+IHtcclxuICAgICAgICAgICAgbGFiZWxFbC50ZXh0Q29udGVudCA9IFBFUklPRF9MQUJFTFNbcF07XHJcbiAgICAgICAgICAgIG9uUGVyaW9kQ2hhbmdlKHApO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgICAgbWVudS5zaG93QXRNb3VzZUV2ZW50KGUpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHdyYXBwZXI7XHJcbiAgfVxyXG4gIC8vIFx1MjUwMFx1MjUwMCBDaGFydDogWWVhciBIZWF0bWFwIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gIHByaXZhdGUgcmVuZGVyWWVhckhlYXRtYXAoXHJcbiAgICBjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG4gICAgeWVhcjogbnVtYmVyLFxyXG4gICAgcHJhY3RpY2VkRGF5czogTWFwPHN0cmluZywgbnVtYmVyPixcclxuICAgIHRvZGF5U3RyOiBzdHJpbmcsXHJcbiAgKTogdm9pZCB7XHJcbiAgICBjb25zdCBNT05USFMgPSBbXCJKYW5cIiwgXCJGZWJcIiwgXCJNYXJcIiwgXCJBcHJcIiwgXCJNYXlcIiwgXCJKdW5cIiwgXCJKdWxcIiwgXCJBdWdcIiwgXCJTZXBcIiwgXCJPY3RcIiwgXCJOb3ZcIiwgXCJEZWNcIl07XHJcblxyXG4gICAgY29uc3Qgd3JhcHBlciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic2UteWVhci1oZWF0bWFwLXZcIiB9KTtcclxuXHJcbiAgICAvLyBEYXktb2Ytd2VlayBoZWFkZXIgcm93XHJcbiAgICBjb25zdCBoZWFkZXJSb3cgPSB3cmFwcGVyLmNyZWF0ZURpdih7IGNsczogXCJzZS1oZWF0bWFwLXdlZWstcm93XCIgfSk7XHJcbiAgICBoZWFkZXJSb3cuY3JlYXRlRGl2KHsgY2xzOiBcInNlLWhlYXRtYXAtbW9udGgtY29sXCIgfSk7IC8vIGVtcHR5IHNwYWNlclxyXG4gICAgZm9yIChjb25zdCBoIG9mIFtcIk1vXCIsIFwiVHVcIiwgXCJXZVwiLCBcIlRoXCIsIFwiRnJcIiwgXCJTYVwiLCBcIlN1XCJdKSB7XHJcbiAgICAgIGhlYWRlclJvdy5jcmVhdGVEaXYoeyB0ZXh0OiBoLCBjbHM6IFwic2UtaGVhdG1hcC1kb3ctaGVhZGVyXCIgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQnVpbGQgc3RhcnQvZW5kIChzYW1lIGxvZ2ljIGFzIGJlZm9yZSlcclxuICAgIGNvbnN0IGphbjEgPSBuZXcgRGF0ZSh5ZWFyLCAwLCAxKTtcclxuICAgIGNvbnN0IHN0YXJ0T2Zmc2V0ID0gKGphbjEuZ2V0RGF5KCkgKyA2KSAlIDc7XHJcbiAgICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKGphbjEpO1xyXG4gICAgc3RhcnQuc2V0RGF0ZShzdGFydC5nZXREYXRlKCkgLSBzdGFydE9mZnNldCk7XHJcblxyXG4gICAgY29uc3QgZGVjMzEgPSBuZXcgRGF0ZSh5ZWFyLCAxMSwgMzEpO1xyXG4gICAgY29uc3QgZW5kT2Zmc2V0ID0gKGRlYzMxLmdldERheSgpICsgNikgJSA3O1xyXG4gICAgY29uc3QgZW5kID0gbmV3IERhdGUoZGVjMzEpO1xyXG4gICAgZW5kLnNldERhdGUoZW5kLmdldERhdGUoKSArICg2IC0gZW5kT2Zmc2V0KSk7XHJcblxyXG4gICAgY29uc3QgY3VyID0gbmV3IERhdGUoc3RhcnQpO1xyXG4gICAgd2hpbGUgKGN1ciA8PSBlbmQpIHtcclxuICAgICAgY29uc3Qgd2Vla1JvdyA9IHdyYXBwZXIuY3JlYXRlRGl2KHsgY2xzOiBcInNlLWhlYXRtYXAtd2Vlay1yb3dcIiB9KTtcclxuXHJcbiAgICAgIC8vIE1vbnRoIGxhYmVsOiBzaG93IGlmIGFueSBkYXkgaW4gdGhpcyB3ZWVrIGlzIHRoZSAxc3Qgb2YgYSBtb250aCBpbiBgeWVhcmBcclxuICAgICAgbGV0IG1vbnRoTGFiZWwgPSBcIlwiO1xyXG4gICAgICBmb3IgKGxldCBkID0gMDsgZCA8IDc7IGQrKykge1xyXG4gICAgICAgIGNvbnN0IGNoZWNrID0gbmV3IERhdGUoY3VyKTtcclxuICAgICAgICBjaGVjay5zZXREYXRlKGNoZWNrLmdldERhdGUoKSArIGQpO1xyXG4gICAgICAgIGlmIChjaGVjay5nZXREYXRlKCkgPT09IDEgJiYgY2hlY2suZ2V0RnVsbFllYXIoKSA9PT0geWVhcikge1xyXG4gICAgICAgICAgbW9udGhMYWJlbCA9IE1PTlRIU1tjaGVjay5nZXRNb250aCgpXTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICB3ZWVrUm93LmNyZWF0ZURpdih7IHRleHQ6IG1vbnRoTGFiZWwsIGNsczogXCJzZS1oZWF0bWFwLW1vbnRoLWNvbFwiIH0pO1xyXG5cclxuICAgICAgLy8gNyBkYXkgY2VsbHNcclxuICAgICAgZm9yIChsZXQgZCA9IDA7IGQgPCA3OyBkKyspIHtcclxuICAgICAgICBjb25zdCBkYXRlU3RyID0gY3VyLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xyXG4gICAgICAgIGNvbnN0IGluWWVhciA9IGN1ci5nZXRGdWxsWWVhcigpID09PSB5ZWFyO1xyXG4gICAgICAgIGNvbnN0IHJjID0gcHJhY3RpY2VkRGF5cy5nZXQoZGF0ZVN0cikgPz8gMDtcclxuICAgICAgICBjb25zdCBjbHMgPSBbXHJcbiAgICAgICAgICBcInNlLWhlYXRtYXAtY2VsbFwiLFxyXG4gICAgICAgICAgIWluWWVhciA/IFwic2UtaGVhdG1hcC1vdXRcIiA6IHJjID4gMCA/IFwic2UtaGVhdG1hcC1wcmFjdGljZWRcIiA6IFwiXCIsXHJcbiAgICAgICAgICBkYXRlU3RyID09PSB0b2RheVN0ciA/IFwic2UtaGVhdG1hcC10b2RheVwiIDogXCJcIixcclxuICAgICAgICBdXHJcbiAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXHJcbiAgICAgICAgICAuam9pbihcIiBcIik7XHJcbiAgICAgICAgY29uc3QgY2VsbCA9IHdlZWtSb3cuY3JlYXRlRGl2KHsgY2xzIH0pO1xyXG4gICAgICAgIGlmIChyYyA+IDApIGNlbGwuc2V0QXR0cmlidXRlKFwidGl0bGVcIiwgYCR7cmN9IHJldmlldyR7cmMgIT09IDEgPyBcInNcIiA6IFwiXCJ9YCk7XHJcbiAgICAgICAgY3VyLnNldERhdGUoY3VyLmdldERhdGUoKSArIDEpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBvbkNsb3NlKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdGhpcy5yZXNpemVPYnNlcnZlcj8uZGlzY29ubmVjdCgpO1xyXG4gICAgdGhpcy5yZXNpemVPYnNlcnZlciA9IG51bGw7XHJcbiAgICBpZiAodGhpcy5yZXNpemVEZWJvdW5jZSkge1xyXG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5yZXNpemVEZWJvdW5jZSk7XHJcbiAgICAgIHRoaXMucmVzaXplRGVib3VuY2UgPSBudWxsO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gIH1cclxufVxyXG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYXNjZW5kaW5nKGEsIGIpIHtcbiAgcmV0dXJuIGEgPT0gbnVsbCB8fCBiID09IG51bGwgPyBOYU4gOiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogYSA+PSBiID8gMCA6IE5hTjtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkZXNjZW5kaW5nKGEsIGIpIHtcbiAgcmV0dXJuIGEgPT0gbnVsbCB8fCBiID09IG51bGwgPyBOYU5cbiAgICA6IGIgPCBhID8gLTFcbiAgICA6IGIgPiBhID8gMVxuICAgIDogYiA+PSBhID8gMFxuICAgIDogTmFOO1xufVxuIiwgImltcG9ydCBhc2NlbmRpbmcgZnJvbSBcIi4vYXNjZW5kaW5nLmpzXCI7XG5pbXBvcnQgZGVzY2VuZGluZyBmcm9tIFwiLi9kZXNjZW5kaW5nLmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGJpc2VjdG9yKGYpIHtcbiAgbGV0IGNvbXBhcmUxLCBjb21wYXJlMiwgZGVsdGE7XG5cbiAgLy8gSWYgYW4gYWNjZXNzb3IgaXMgc3BlY2lmaWVkLCBwcm9tb3RlIGl0IHRvIGEgY29tcGFyYXRvci4gSW4gdGhpcyBjYXNlIHdlXG4gIC8vIGNhbiB0ZXN0IHdoZXRoZXIgdGhlIHNlYXJjaCB2YWx1ZSBpcyAoc2VsZi0pIGNvbXBhcmFibGUuIFdlIGNhblx1MjAxOXQgZG8gdGhpc1xuICAvLyBmb3IgYSBjb21wYXJhdG9yIChleGNlcHQgZm9yIHNwZWNpZmljLCBrbm93biBjb21wYXJhdG9ycykgYmVjYXVzZSB3ZSBjYW5cdTIwMTl0XG4gIC8vIHRlbGwgaWYgdGhlIGNvbXBhcmF0b3IgaXMgc3ltbWV0cmljLCBhbmQgYW4gYXN5bW1ldHJpYyBjb21wYXJhdG9yIGNhblx1MjAxOXQgYmVcbiAgLy8gdXNlZCB0byB0ZXN0IHdoZXRoZXIgYSBzaW5nbGUgdmFsdWUgaXMgY29tcGFyYWJsZS5cbiAgaWYgKGYubGVuZ3RoICE9PSAyKSB7XG4gICAgY29tcGFyZTEgPSBhc2NlbmRpbmc7XG4gICAgY29tcGFyZTIgPSAoZCwgeCkgPT4gYXNjZW5kaW5nKGYoZCksIHgpO1xuICAgIGRlbHRhID0gKGQsIHgpID0+IGYoZCkgLSB4O1xuICB9IGVsc2Uge1xuICAgIGNvbXBhcmUxID0gZiA9PT0gYXNjZW5kaW5nIHx8IGYgPT09IGRlc2NlbmRpbmcgPyBmIDogemVybztcbiAgICBjb21wYXJlMiA9IGY7XG4gICAgZGVsdGEgPSBmO1xuICB9XG5cbiAgZnVuY3Rpb24gbGVmdChhLCB4LCBsbyA9IDAsIGhpID0gYS5sZW5ndGgpIHtcbiAgICBpZiAobG8gPCBoaSkge1xuICAgICAgaWYgKGNvbXBhcmUxKHgsIHgpICE9PSAwKSByZXR1cm4gaGk7XG4gICAgICBkbyB7XG4gICAgICAgIGNvbnN0IG1pZCA9IChsbyArIGhpKSA+Pj4gMTtcbiAgICAgICAgaWYgKGNvbXBhcmUyKGFbbWlkXSwgeCkgPCAwKSBsbyA9IG1pZCArIDE7XG4gICAgICAgIGVsc2UgaGkgPSBtaWQ7XG4gICAgICB9IHdoaWxlIChsbyA8IGhpKTtcbiAgICB9XG4gICAgcmV0dXJuIGxvO1xuICB9XG5cbiAgZnVuY3Rpb24gcmlnaHQoYSwgeCwgbG8gPSAwLCBoaSA9IGEubGVuZ3RoKSB7XG4gICAgaWYgKGxvIDwgaGkpIHtcbiAgICAgIGlmIChjb21wYXJlMSh4LCB4KSAhPT0gMCkgcmV0dXJuIGhpO1xuICAgICAgZG8ge1xuICAgICAgICBjb25zdCBtaWQgPSAobG8gKyBoaSkgPj4+IDE7XG4gICAgICAgIGlmIChjb21wYXJlMihhW21pZF0sIHgpIDw9IDApIGxvID0gbWlkICsgMTtcbiAgICAgICAgZWxzZSBoaSA9IG1pZDtcbiAgICAgIH0gd2hpbGUgKGxvIDwgaGkpO1xuICAgIH1cbiAgICByZXR1cm4gbG87XG4gIH1cblxuICBmdW5jdGlvbiBjZW50ZXIoYSwgeCwgbG8gPSAwLCBoaSA9IGEubGVuZ3RoKSB7XG4gICAgY29uc3QgaSA9IGxlZnQoYSwgeCwgbG8sIGhpIC0gMSk7XG4gICAgcmV0dXJuIGkgPiBsbyAmJiBkZWx0YShhW2kgLSAxXSwgeCkgPiAtZGVsdGEoYVtpXSwgeCkgPyBpIC0gMSA6IGk7XG4gIH1cblxuICByZXR1cm4ge2xlZnQsIGNlbnRlciwgcmlnaHR9O1xufVxuXG5mdW5jdGlvbiB6ZXJvKCkge1xuICByZXR1cm4gMDtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBudW1iZXIoeCkge1xuICByZXR1cm4geCA9PT0gbnVsbCA/IE5hTiA6ICt4O1xufVxuXG5leHBvcnQgZnVuY3Rpb24qIG51bWJlcnModmFsdWVzLCB2YWx1ZW9mKSB7XG4gIGlmICh2YWx1ZW9mID09PSB1bmRlZmluZWQpIHtcbiAgICBmb3IgKGxldCB2YWx1ZSBvZiB2YWx1ZXMpIHtcbiAgICAgIGlmICh2YWx1ZSAhPSBudWxsICYmICh2YWx1ZSA9ICt2YWx1ZSkgPj0gdmFsdWUpIHtcbiAgICAgICAgeWllbGQgdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxldCBpbmRleCA9IC0xO1xuICAgIGZvciAobGV0IHZhbHVlIG9mIHZhbHVlcykge1xuICAgICAgaWYgKCh2YWx1ZSA9IHZhbHVlb2YodmFsdWUsICsraW5kZXgsIHZhbHVlcykpICE9IG51bGwgJiYgKHZhbHVlID0gK3ZhbHVlKSA+PSB2YWx1ZSkge1xuICAgICAgICB5aWVsZCB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgYXNjZW5kaW5nIGZyb20gXCIuL2FzY2VuZGluZy5qc1wiO1xuaW1wb3J0IGJpc2VjdG9yIGZyb20gXCIuL2Jpc2VjdG9yLmpzXCI7XG5pbXBvcnQgbnVtYmVyIGZyb20gXCIuL251bWJlci5qc1wiO1xuXG5jb25zdCBhc2NlbmRpbmdCaXNlY3QgPSBiaXNlY3Rvcihhc2NlbmRpbmcpO1xuZXhwb3J0IGNvbnN0IGJpc2VjdFJpZ2h0ID0gYXNjZW5kaW5nQmlzZWN0LnJpZ2h0O1xuZXhwb3J0IGNvbnN0IGJpc2VjdExlZnQgPSBhc2NlbmRpbmdCaXNlY3QubGVmdDtcbmV4cG9ydCBjb25zdCBiaXNlY3RDZW50ZXIgPSBiaXNlY3RvcihudW1iZXIpLmNlbnRlcjtcbmV4cG9ydCBkZWZhdWx0IGJpc2VjdFJpZ2h0O1xuIiwgImV4cG9ydCBjbGFzcyBJbnRlcm5NYXAgZXh0ZW5kcyBNYXAge1xuICBjb25zdHJ1Y3RvcihlbnRyaWVzLCBrZXkgPSBrZXlvZikge1xuICAgIHN1cGVyKCk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXModGhpcywge19pbnRlcm46IHt2YWx1ZTogbmV3IE1hcCgpfSwgX2tleToge3ZhbHVlOiBrZXl9fSk7XG4gICAgaWYgKGVudHJpZXMgIT0gbnVsbCkgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgZW50cmllcykgdGhpcy5zZXQoa2V5LCB2YWx1ZSk7XG4gIH1cbiAgZ2V0KGtleSkge1xuICAgIHJldHVybiBzdXBlci5nZXQoaW50ZXJuX2dldCh0aGlzLCBrZXkpKTtcbiAgfVxuICBoYXMoa2V5KSB7XG4gICAgcmV0dXJuIHN1cGVyLmhhcyhpbnRlcm5fZ2V0KHRoaXMsIGtleSkpO1xuICB9XG4gIHNldChrZXksIHZhbHVlKSB7XG4gICAgcmV0dXJuIHN1cGVyLnNldChpbnRlcm5fc2V0KHRoaXMsIGtleSksIHZhbHVlKTtcbiAgfVxuICBkZWxldGUoa2V5KSB7XG4gICAgcmV0dXJuIHN1cGVyLmRlbGV0ZShpbnRlcm5fZGVsZXRlKHRoaXMsIGtleSkpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbnRlcm5TZXQgZXh0ZW5kcyBTZXQge1xuICBjb25zdHJ1Y3Rvcih2YWx1ZXMsIGtleSA9IGtleW9mKSB7XG4gICAgc3VwZXIoKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyh0aGlzLCB7X2ludGVybjoge3ZhbHVlOiBuZXcgTWFwKCl9LCBfa2V5OiB7dmFsdWU6IGtleX19KTtcbiAgICBpZiAodmFsdWVzICE9IG51bGwpIGZvciAoY29uc3QgdmFsdWUgb2YgdmFsdWVzKSB0aGlzLmFkZCh2YWx1ZSk7XG4gIH1cbiAgaGFzKHZhbHVlKSB7XG4gICAgcmV0dXJuIHN1cGVyLmhhcyhpbnRlcm5fZ2V0KHRoaXMsIHZhbHVlKSk7XG4gIH1cbiAgYWRkKHZhbHVlKSB7XG4gICAgcmV0dXJuIHN1cGVyLmFkZChpbnRlcm5fc2V0KHRoaXMsIHZhbHVlKSk7XG4gIH1cbiAgZGVsZXRlKHZhbHVlKSB7XG4gICAgcmV0dXJuIHN1cGVyLmRlbGV0ZShpbnRlcm5fZGVsZXRlKHRoaXMsIHZhbHVlKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW50ZXJuX2dldCh7X2ludGVybiwgX2tleX0sIHZhbHVlKSB7XG4gIGNvbnN0IGtleSA9IF9rZXkodmFsdWUpO1xuICByZXR1cm4gX2ludGVybi5oYXMoa2V5KSA/IF9pbnRlcm4uZ2V0KGtleSkgOiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gaW50ZXJuX3NldCh7X2ludGVybiwgX2tleX0sIHZhbHVlKSB7XG4gIGNvbnN0IGtleSA9IF9rZXkodmFsdWUpO1xuICBpZiAoX2ludGVybi5oYXMoa2V5KSkgcmV0dXJuIF9pbnRlcm4uZ2V0KGtleSk7XG4gIF9pbnRlcm4uc2V0KGtleSwgdmFsdWUpO1xuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGludGVybl9kZWxldGUoe19pbnRlcm4sIF9rZXl9LCB2YWx1ZSkge1xuICBjb25zdCBrZXkgPSBfa2V5KHZhbHVlKTtcbiAgaWYgKF9pbnRlcm4uaGFzKGtleSkpIHtcbiAgICB2YWx1ZSA9IF9pbnRlcm4uZ2V0KGtleSk7XG4gICAgX2ludGVybi5kZWxldGUoa2V5KTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIGtleW9mKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgPyB2YWx1ZS52YWx1ZU9mKCkgOiB2YWx1ZTtcbn1cbiIsICJjb25zdCBlMTAgPSBNYXRoLnNxcnQoNTApLFxuICAgIGU1ID0gTWF0aC5zcXJ0KDEwKSxcbiAgICBlMiA9IE1hdGguc3FydCgyKTtcblxuZnVuY3Rpb24gdGlja1NwZWMoc3RhcnQsIHN0b3AsIGNvdW50KSB7XG4gIGNvbnN0IHN0ZXAgPSAoc3RvcCAtIHN0YXJ0KSAvIE1hdGgubWF4KDAsIGNvdW50KSxcbiAgICAgIHBvd2VyID0gTWF0aC5mbG9vcihNYXRoLmxvZzEwKHN0ZXApKSxcbiAgICAgIGVycm9yID0gc3RlcCAvIE1hdGgucG93KDEwLCBwb3dlciksXG4gICAgICBmYWN0b3IgPSBlcnJvciA+PSBlMTAgPyAxMCA6IGVycm9yID49IGU1ID8gNSA6IGVycm9yID49IGUyID8gMiA6IDE7XG4gIGxldCBpMSwgaTIsIGluYztcbiAgaWYgKHBvd2VyIDwgMCkge1xuICAgIGluYyA9IE1hdGgucG93KDEwLCAtcG93ZXIpIC8gZmFjdG9yO1xuICAgIGkxID0gTWF0aC5yb3VuZChzdGFydCAqIGluYyk7XG4gICAgaTIgPSBNYXRoLnJvdW5kKHN0b3AgKiBpbmMpO1xuICAgIGlmIChpMSAvIGluYyA8IHN0YXJ0KSArK2kxO1xuICAgIGlmIChpMiAvIGluYyA+IHN0b3ApIC0taTI7XG4gICAgaW5jID0gLWluYztcbiAgfSBlbHNlIHtcbiAgICBpbmMgPSBNYXRoLnBvdygxMCwgcG93ZXIpICogZmFjdG9yO1xuICAgIGkxID0gTWF0aC5yb3VuZChzdGFydCAvIGluYyk7XG4gICAgaTIgPSBNYXRoLnJvdW5kKHN0b3AgLyBpbmMpO1xuICAgIGlmIChpMSAqIGluYyA8IHN0YXJ0KSArK2kxO1xuICAgIGlmIChpMiAqIGluYyA+IHN0b3ApIC0taTI7XG4gIH1cbiAgaWYgKGkyIDwgaTEgJiYgMC41IDw9IGNvdW50ICYmIGNvdW50IDwgMikgcmV0dXJuIHRpY2tTcGVjKHN0YXJ0LCBzdG9wLCBjb3VudCAqIDIpO1xuICByZXR1cm4gW2kxLCBpMiwgaW5jXTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdGlja3Moc3RhcnQsIHN0b3AsIGNvdW50KSB7XG4gIHN0b3AgPSArc3RvcCwgc3RhcnQgPSArc3RhcnQsIGNvdW50ID0gK2NvdW50O1xuICBpZiAoIShjb3VudCA+IDApKSByZXR1cm4gW107XG4gIGlmIChzdGFydCA9PT0gc3RvcCkgcmV0dXJuIFtzdGFydF07XG4gIGNvbnN0IHJldmVyc2UgPSBzdG9wIDwgc3RhcnQsIFtpMSwgaTIsIGluY10gPSByZXZlcnNlID8gdGlja1NwZWMoc3RvcCwgc3RhcnQsIGNvdW50KSA6IHRpY2tTcGVjKHN0YXJ0LCBzdG9wLCBjb3VudCk7XG4gIGlmICghKGkyID49IGkxKSkgcmV0dXJuIFtdO1xuICBjb25zdCBuID0gaTIgLSBpMSArIDEsIHRpY2tzID0gbmV3IEFycmF5KG4pO1xuICBpZiAocmV2ZXJzZSkge1xuICAgIGlmIChpbmMgPCAwKSBmb3IgKGxldCBpID0gMDsgaSA8IG47ICsraSkgdGlja3NbaV0gPSAoaTIgLSBpKSAvIC1pbmM7XG4gICAgZWxzZSBmb3IgKGxldCBpID0gMDsgaSA8IG47ICsraSkgdGlja3NbaV0gPSAoaTIgLSBpKSAqIGluYztcbiAgfSBlbHNlIHtcbiAgICBpZiAoaW5jIDwgMCkgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyArK2kpIHRpY2tzW2ldID0gKGkxICsgaSkgLyAtaW5jO1xuICAgIGVsc2UgZm9yIChsZXQgaSA9IDA7IGkgPCBuOyArK2kpIHRpY2tzW2ldID0gKGkxICsgaSkgKiBpbmM7XG4gIH1cbiAgcmV0dXJuIHRpY2tzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGlja0luY3JlbWVudChzdGFydCwgc3RvcCwgY291bnQpIHtcbiAgc3RvcCA9ICtzdG9wLCBzdGFydCA9ICtzdGFydCwgY291bnQgPSArY291bnQ7XG4gIHJldHVybiB0aWNrU3BlYyhzdGFydCwgc3RvcCwgY291bnQpWzJdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGlja1N0ZXAoc3RhcnQsIHN0b3AsIGNvdW50KSB7XG4gIHN0b3AgPSArc3RvcCwgc3RhcnQgPSArc3RhcnQsIGNvdW50ID0gK2NvdW50O1xuICBjb25zdCByZXZlcnNlID0gc3RvcCA8IHN0YXJ0LCBpbmMgPSByZXZlcnNlID8gdGlja0luY3JlbWVudChzdG9wLCBzdGFydCwgY291bnQpIDogdGlja0luY3JlbWVudChzdGFydCwgc3RvcCwgY291bnQpO1xuICByZXR1cm4gKHJldmVyc2UgPyAtMSA6IDEpICogKGluYyA8IDAgPyAxIC8gLWluYyA6IGluYyk7XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmFuZ2Uoc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgc3RhcnQgPSArc3RhcnQsIHN0b3AgPSArc3RvcCwgc3RlcCA9IChuID0gYXJndW1lbnRzLmxlbmd0aCkgPCAyID8gKHN0b3AgPSBzdGFydCwgc3RhcnQgPSAwLCAxKSA6IG4gPCAzID8gMSA6ICtzdGVwO1xuXG4gIHZhciBpID0gLTEsXG4gICAgICBuID0gTWF0aC5tYXgoMCwgTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCkpIHwgMCxcbiAgICAgIHJhbmdlID0gbmV3IEFycmF5KG4pO1xuXG4gIHdoaWxlICgrK2kgPCBuKSB7XG4gICAgcmFuZ2VbaV0gPSBzdGFydCArIGkgKiBzdGVwO1xuICB9XG5cbiAgcmV0dXJuIHJhbmdlO1xufVxuIiwgImV4cG9ydCBmdW5jdGlvbiBpbml0UmFuZ2UoZG9tYWluLCByYW5nZSkge1xuICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBjYXNlIDA6IGJyZWFrO1xuICAgIGNhc2UgMTogdGhpcy5yYW5nZShkb21haW4pOyBicmVhaztcbiAgICBkZWZhdWx0OiB0aGlzLnJhbmdlKHJhbmdlKS5kb21haW4oZG9tYWluKTsgYnJlYWs7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0SW50ZXJwb2xhdG9yKGRvbWFpbiwgaW50ZXJwb2xhdG9yKSB7XG4gIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIGNhc2UgMDogYnJlYWs7XG4gICAgY2FzZSAxOiB7XG4gICAgICBpZiAodHlwZW9mIGRvbWFpbiA9PT0gXCJmdW5jdGlvblwiKSB0aGlzLmludGVycG9sYXRvcihkb21haW4pO1xuICAgICAgZWxzZSB0aGlzLnJhbmdlKGRvbWFpbik7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZGVmYXVsdDoge1xuICAgICAgdGhpcy5kb21haW4oZG9tYWluKTtcbiAgICAgIGlmICh0eXBlb2YgaW50ZXJwb2xhdG9yID09PSBcImZ1bmN0aW9uXCIpIHRoaXMuaW50ZXJwb2xhdG9yKGludGVycG9sYXRvcik7XG4gICAgICBlbHNlIHRoaXMucmFuZ2UoaW50ZXJwb2xhdG9yKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcztcbn1cbiIsICJpbXBvcnQge0ludGVybk1hcH0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQge2luaXRSYW5nZX0gZnJvbSBcIi4vaW5pdC5qc1wiO1xuXG5leHBvcnQgY29uc3QgaW1wbGljaXQgPSBTeW1ib2woXCJpbXBsaWNpdFwiKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gb3JkaW5hbCgpIHtcbiAgdmFyIGluZGV4ID0gbmV3IEludGVybk1hcCgpLFxuICAgICAgZG9tYWluID0gW10sXG4gICAgICByYW5nZSA9IFtdLFxuICAgICAgdW5rbm93biA9IGltcGxpY2l0O1xuXG4gIGZ1bmN0aW9uIHNjYWxlKGQpIHtcbiAgICBsZXQgaSA9IGluZGV4LmdldChkKTtcbiAgICBpZiAoaSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAodW5rbm93biAhPT0gaW1wbGljaXQpIHJldHVybiB1bmtub3duO1xuICAgICAgaW5kZXguc2V0KGQsIGkgPSBkb21haW4ucHVzaChkKSAtIDEpO1xuICAgIH1cbiAgICByZXR1cm4gcmFuZ2VbaSAlIHJhbmdlLmxlbmd0aF07XG4gIH1cblxuICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZG9tYWluLnNsaWNlKCk7XG4gICAgZG9tYWluID0gW10sIGluZGV4ID0gbmV3IEludGVybk1hcCgpO1xuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgXykge1xuICAgICAgaWYgKGluZGV4Lmhhcyh2YWx1ZSkpIGNvbnRpbnVlO1xuICAgICAgaW5kZXguc2V0KHZhbHVlLCBkb21haW4ucHVzaCh2YWx1ZSkgLSAxKTtcbiAgICB9XG4gICAgcmV0dXJuIHNjYWxlO1xuICB9O1xuXG4gIHNjYWxlLnJhbmdlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHJhbmdlID0gQXJyYXkuZnJvbShfKSwgc2NhbGUpIDogcmFuZ2Uuc2xpY2UoKTtcbiAgfTtcblxuICBzY2FsZS51bmtub3duID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHVua25vd24gPSBfLCBzY2FsZSkgOiB1bmtub3duO1xuICB9O1xuXG4gIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gb3JkaW5hbChkb21haW4sIHJhbmdlKS51bmtub3duKHVua25vd24pO1xuICB9O1xuXG4gIGluaXRSYW5nZS5hcHBseShzY2FsZSwgYXJndW1lbnRzKTtcblxuICByZXR1cm4gc2NhbGU7XG59XG4iLCAiaW1wb3J0IHtyYW5nZSBhcyBzZXF1ZW5jZX0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQge2luaXRSYW5nZX0gZnJvbSBcIi4vaW5pdC5qc1wiO1xuaW1wb3J0IG9yZGluYWwgZnJvbSBcIi4vb3JkaW5hbC5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBiYW5kKCkge1xuICB2YXIgc2NhbGUgPSBvcmRpbmFsKCkudW5rbm93bih1bmRlZmluZWQpLFxuICAgICAgZG9tYWluID0gc2NhbGUuZG9tYWluLFxuICAgICAgb3JkaW5hbFJhbmdlID0gc2NhbGUucmFuZ2UsXG4gICAgICByMCA9IDAsXG4gICAgICByMSA9IDEsXG4gICAgICBzdGVwLFxuICAgICAgYmFuZHdpZHRoLFxuICAgICAgcm91bmQgPSBmYWxzZSxcbiAgICAgIHBhZGRpbmdJbm5lciA9IDAsXG4gICAgICBwYWRkaW5nT3V0ZXIgPSAwLFxuICAgICAgYWxpZ24gPSAwLjU7XG5cbiAgZGVsZXRlIHNjYWxlLnVua25vd247XG5cbiAgZnVuY3Rpb24gcmVzY2FsZSgpIHtcbiAgICB2YXIgbiA9IGRvbWFpbigpLmxlbmd0aCxcbiAgICAgICAgcmV2ZXJzZSA9IHIxIDwgcjAsXG4gICAgICAgIHN0YXJ0ID0gcmV2ZXJzZSA/IHIxIDogcjAsXG4gICAgICAgIHN0b3AgPSByZXZlcnNlID8gcjAgOiByMTtcbiAgICBzdGVwID0gKHN0b3AgLSBzdGFydCkgLyBNYXRoLm1heCgxLCBuIC0gcGFkZGluZ0lubmVyICsgcGFkZGluZ091dGVyICogMik7XG4gICAgaWYgKHJvdW5kKSBzdGVwID0gTWF0aC5mbG9vcihzdGVwKTtcbiAgICBzdGFydCArPSAoc3RvcCAtIHN0YXJ0IC0gc3RlcCAqIChuIC0gcGFkZGluZ0lubmVyKSkgKiBhbGlnbjtcbiAgICBiYW5kd2lkdGggPSBzdGVwICogKDEgLSBwYWRkaW5nSW5uZXIpO1xuICAgIGlmIChyb3VuZCkgc3RhcnQgPSBNYXRoLnJvdW5kKHN0YXJ0KSwgYmFuZHdpZHRoID0gTWF0aC5yb3VuZChiYW5kd2lkdGgpO1xuICAgIHZhciB2YWx1ZXMgPSBzZXF1ZW5jZShuKS5tYXAoZnVuY3Rpb24oaSkgeyByZXR1cm4gc3RhcnQgKyBzdGVwICogaTsgfSk7XG4gICAgcmV0dXJuIG9yZGluYWxSYW5nZShyZXZlcnNlID8gdmFsdWVzLnJldmVyc2UoKSA6IHZhbHVlcyk7XG4gIH1cblxuICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZG9tYWluKF8pLCByZXNjYWxlKCkpIDogZG9tYWluKCk7XG4gIH07XG5cbiAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoW3IwLCByMV0gPSBfLCByMCA9ICtyMCwgcjEgPSArcjEsIHJlc2NhbGUoKSkgOiBbcjAsIHIxXTtcbiAgfTtcblxuICBzY2FsZS5yYW5nZVJvdW5kID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBbcjAsIHIxXSA9IF8sIHIwID0gK3IwLCByMSA9ICtyMSwgcm91bmQgPSB0cnVlLCByZXNjYWxlKCk7XG4gIH07XG5cbiAgc2NhbGUuYmFuZHdpZHRoID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGJhbmR3aWR0aDtcbiAgfTtcblxuICBzY2FsZS5zdGVwID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHN0ZXA7XG4gIH07XG5cbiAgc2NhbGUucm91bmQgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocm91bmQgPSAhIV8sIHJlc2NhbGUoKSkgOiByb3VuZDtcbiAgfTtcblxuICBzY2FsZS5wYWRkaW5nID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHBhZGRpbmdJbm5lciA9IE1hdGgubWluKDEsIHBhZGRpbmdPdXRlciA9ICtfKSwgcmVzY2FsZSgpKSA6IHBhZGRpbmdJbm5lcjtcbiAgfTtcblxuICBzY2FsZS5wYWRkaW5nSW5uZXIgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocGFkZGluZ0lubmVyID0gTWF0aC5taW4oMSwgXyksIHJlc2NhbGUoKSkgOiBwYWRkaW5nSW5uZXI7XG4gIH07XG5cbiAgc2NhbGUucGFkZGluZ091dGVyID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHBhZGRpbmdPdXRlciA9ICtfLCByZXNjYWxlKCkpIDogcGFkZGluZ091dGVyO1xuICB9O1xuXG4gIHNjYWxlLmFsaWduID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGFsaWduID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgXykpLCByZXNjYWxlKCkpIDogYWxpZ247XG4gIH07XG5cbiAgc2NhbGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBiYW5kKGRvbWFpbigpLCBbcjAsIHIxXSlcbiAgICAgICAgLnJvdW5kKHJvdW5kKVxuICAgICAgICAucGFkZGluZ0lubmVyKHBhZGRpbmdJbm5lcilcbiAgICAgICAgLnBhZGRpbmdPdXRlcihwYWRkaW5nT3V0ZXIpXG4gICAgICAgIC5hbGlnbihhbGlnbik7XG4gIH07XG5cbiAgcmV0dXJuIGluaXRSYW5nZS5hcHBseShyZXNjYWxlKCksIGFyZ3VtZW50cyk7XG59XG5cbmZ1bmN0aW9uIHBvaW50aXNoKHNjYWxlKSB7XG4gIHZhciBjb3B5ID0gc2NhbGUuY29weTtcblxuICBzY2FsZS5wYWRkaW5nID0gc2NhbGUucGFkZGluZ091dGVyO1xuICBkZWxldGUgc2NhbGUucGFkZGluZ0lubmVyO1xuICBkZWxldGUgc2NhbGUucGFkZGluZ091dGVyO1xuXG4gIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcG9pbnRpc2goY29weSgpKTtcbiAgfTtcblxuICByZXR1cm4gc2NhbGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwb2ludCgpIHtcbiAgcmV0dXJuIHBvaW50aXNoKGJhbmQuYXBwbHkobnVsbCwgYXJndW1lbnRzKS5wYWRkaW5nSW5uZXIoMSkpO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbnN0cnVjdG9yLCBmYWN0b3J5LCBwcm90b3R5cGUpIHtcbiAgY29uc3RydWN0b3IucHJvdG90eXBlID0gZmFjdG9yeS5wcm90b3R5cGUgPSBwcm90b3R5cGU7XG4gIHByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGNvbnN0cnVjdG9yO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW5kKHBhcmVudCwgZGVmaW5pdGlvbikge1xuICB2YXIgcHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQucHJvdG90eXBlKTtcbiAgZm9yICh2YXIga2V5IGluIGRlZmluaXRpb24pIHByb3RvdHlwZVtrZXldID0gZGVmaW5pdGlvbltrZXldO1xuICByZXR1cm4gcHJvdG90eXBlO1xufVxuIiwgImltcG9ydCBkZWZpbmUsIHtleHRlbmR9IGZyb20gXCIuL2RlZmluZS5qc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gQ29sb3IoKSB7fVxuXG5leHBvcnQgdmFyIGRhcmtlciA9IDAuNztcbmV4cG9ydCB2YXIgYnJpZ2h0ZXIgPSAxIC8gZGFya2VyO1xuXG52YXIgcmVJID0gXCJcXFxccyooWystXT9cXFxcZCspXFxcXHMqXCIsXG4gICAgcmVOID0gXCJcXFxccyooWystXT8oPzpcXFxcZCpcXFxcLik/XFxcXGQrKD86W2VFXVsrLV0/XFxcXGQrKT8pXFxcXHMqXCIsXG4gICAgcmVQID0gXCJcXFxccyooWystXT8oPzpcXFxcZCpcXFxcLik/XFxcXGQrKD86W2VFXVsrLV0/XFxcXGQrKT8pJVxcXFxzKlwiLFxuICAgIHJlSGV4ID0gL14jKFswLTlhLWZdezMsOH0pJC8sXG4gICAgcmVSZ2JJbnRlZ2VyID0gbmV3IFJlZ0V4cChgXnJnYlxcXFwoJHtyZUl9LCR7cmVJfSwke3JlSX1cXFxcKSRgKSxcbiAgICByZVJnYlBlcmNlbnQgPSBuZXcgUmVnRXhwKGBecmdiXFxcXCgke3JlUH0sJHtyZVB9LCR7cmVQfVxcXFwpJGApLFxuICAgIHJlUmdiYUludGVnZXIgPSBuZXcgUmVnRXhwKGBecmdiYVxcXFwoJHtyZUl9LCR7cmVJfSwke3JlSX0sJHtyZU59XFxcXCkkYCksXG4gICAgcmVSZ2JhUGVyY2VudCA9IG5ldyBSZWdFeHAoYF5yZ2JhXFxcXCgke3JlUH0sJHtyZVB9LCR7cmVQfSwke3JlTn1cXFxcKSRgKSxcbiAgICByZUhzbFBlcmNlbnQgPSBuZXcgUmVnRXhwKGBeaHNsXFxcXCgke3JlTn0sJHtyZVB9LCR7cmVQfVxcXFwpJGApLFxuICAgIHJlSHNsYVBlcmNlbnQgPSBuZXcgUmVnRXhwKGBeaHNsYVxcXFwoJHtyZU59LCR7cmVQfSwke3JlUH0sJHtyZU59XFxcXCkkYCk7XG5cbnZhciBuYW1lZCA9IHtcbiAgYWxpY2VibHVlOiAweGYwZjhmZixcbiAgYW50aXF1ZXdoaXRlOiAweGZhZWJkNyxcbiAgYXF1YTogMHgwMGZmZmYsXG4gIGFxdWFtYXJpbmU6IDB4N2ZmZmQ0LFxuICBhenVyZTogMHhmMGZmZmYsXG4gIGJlaWdlOiAweGY1ZjVkYyxcbiAgYmlzcXVlOiAweGZmZTRjNCxcbiAgYmxhY2s6IDB4MDAwMDAwLFxuICBibGFuY2hlZGFsbW9uZDogMHhmZmViY2QsXG4gIGJsdWU6IDB4MDAwMGZmLFxuICBibHVldmlvbGV0OiAweDhhMmJlMixcbiAgYnJvd246IDB4YTUyYTJhLFxuICBidXJseXdvb2Q6IDB4ZGViODg3LFxuICBjYWRldGJsdWU6IDB4NWY5ZWEwLFxuICBjaGFydHJldXNlOiAweDdmZmYwMCxcbiAgY2hvY29sYXRlOiAweGQyNjkxZSxcbiAgY29yYWw6IDB4ZmY3ZjUwLFxuICBjb3JuZmxvd2VyYmx1ZTogMHg2NDk1ZWQsXG4gIGNvcm5zaWxrOiAweGZmZjhkYyxcbiAgY3JpbXNvbjogMHhkYzE0M2MsXG4gIGN5YW46IDB4MDBmZmZmLFxuICBkYXJrYmx1ZTogMHgwMDAwOGIsXG4gIGRhcmtjeWFuOiAweDAwOGI4YixcbiAgZGFya2dvbGRlbnJvZDogMHhiODg2MGIsXG4gIGRhcmtncmF5OiAweGE5YTlhOSxcbiAgZGFya2dyZWVuOiAweDAwNjQwMCxcbiAgZGFya2dyZXk6IDB4YTlhOWE5LFxuICBkYXJra2hha2k6IDB4YmRiNzZiLFxuICBkYXJrbWFnZW50YTogMHg4YjAwOGIsXG4gIGRhcmtvbGl2ZWdyZWVuOiAweDU1NmIyZixcbiAgZGFya29yYW5nZTogMHhmZjhjMDAsXG4gIGRhcmtvcmNoaWQ6IDB4OTkzMmNjLFxuICBkYXJrcmVkOiAweDhiMDAwMCxcbiAgZGFya3NhbG1vbjogMHhlOTk2N2EsXG4gIGRhcmtzZWFncmVlbjogMHg4ZmJjOGYsXG4gIGRhcmtzbGF0ZWJsdWU6IDB4NDgzZDhiLFxuICBkYXJrc2xhdGVncmF5OiAweDJmNGY0ZixcbiAgZGFya3NsYXRlZ3JleTogMHgyZjRmNGYsXG4gIGRhcmt0dXJxdW9pc2U6IDB4MDBjZWQxLFxuICBkYXJrdmlvbGV0OiAweDk0MDBkMyxcbiAgZGVlcHBpbms6IDB4ZmYxNDkzLFxuICBkZWVwc2t5Ymx1ZTogMHgwMGJmZmYsXG4gIGRpbWdyYXk6IDB4Njk2OTY5LFxuICBkaW1ncmV5OiAweDY5Njk2OSxcbiAgZG9kZ2VyYmx1ZTogMHgxZTkwZmYsXG4gIGZpcmVicmljazogMHhiMjIyMjIsXG4gIGZsb3JhbHdoaXRlOiAweGZmZmFmMCxcbiAgZm9yZXN0Z3JlZW46IDB4MjI4YjIyLFxuICBmdWNoc2lhOiAweGZmMDBmZixcbiAgZ2FpbnNib3JvOiAweGRjZGNkYyxcbiAgZ2hvc3R3aGl0ZTogMHhmOGY4ZmYsXG4gIGdvbGQ6IDB4ZmZkNzAwLFxuICBnb2xkZW5yb2Q6IDB4ZGFhNTIwLFxuICBncmF5OiAweDgwODA4MCxcbiAgZ3JlZW46IDB4MDA4MDAwLFxuICBncmVlbnllbGxvdzogMHhhZGZmMmYsXG4gIGdyZXk6IDB4ODA4MDgwLFxuICBob25leWRldzogMHhmMGZmZjAsXG4gIGhvdHBpbms6IDB4ZmY2OWI0LFxuICBpbmRpYW5yZWQ6IDB4Y2Q1YzVjLFxuICBpbmRpZ286IDB4NGIwMDgyLFxuICBpdm9yeTogMHhmZmZmZjAsXG4gIGtoYWtpOiAweGYwZTY4YyxcbiAgbGF2ZW5kZXI6IDB4ZTZlNmZhLFxuICBsYXZlbmRlcmJsdXNoOiAweGZmZjBmNSxcbiAgbGF3bmdyZWVuOiAweDdjZmMwMCxcbiAgbGVtb25jaGlmZm9uOiAweGZmZmFjZCxcbiAgbGlnaHRibHVlOiAweGFkZDhlNixcbiAgbGlnaHRjb3JhbDogMHhmMDgwODAsXG4gIGxpZ2h0Y3lhbjogMHhlMGZmZmYsXG4gIGxpZ2h0Z29sZGVucm9keWVsbG93OiAweGZhZmFkMixcbiAgbGlnaHRncmF5OiAweGQzZDNkMyxcbiAgbGlnaHRncmVlbjogMHg5MGVlOTAsXG4gIGxpZ2h0Z3JleTogMHhkM2QzZDMsXG4gIGxpZ2h0cGluazogMHhmZmI2YzEsXG4gIGxpZ2h0c2FsbW9uOiAweGZmYTA3YSxcbiAgbGlnaHRzZWFncmVlbjogMHgyMGIyYWEsXG4gIGxpZ2h0c2t5Ymx1ZTogMHg4N2NlZmEsXG4gIGxpZ2h0c2xhdGVncmF5OiAweDc3ODg5OSxcbiAgbGlnaHRzbGF0ZWdyZXk6IDB4Nzc4ODk5LFxuICBsaWdodHN0ZWVsYmx1ZTogMHhiMGM0ZGUsXG4gIGxpZ2h0eWVsbG93OiAweGZmZmZlMCxcbiAgbGltZTogMHgwMGZmMDAsXG4gIGxpbWVncmVlbjogMHgzMmNkMzIsXG4gIGxpbmVuOiAweGZhZjBlNixcbiAgbWFnZW50YTogMHhmZjAwZmYsXG4gIG1hcm9vbjogMHg4MDAwMDAsXG4gIG1lZGl1bWFxdWFtYXJpbmU6IDB4NjZjZGFhLFxuICBtZWRpdW1ibHVlOiAweDAwMDBjZCxcbiAgbWVkaXVtb3JjaGlkOiAweGJhNTVkMyxcbiAgbWVkaXVtcHVycGxlOiAweDkzNzBkYixcbiAgbWVkaXVtc2VhZ3JlZW46IDB4M2NiMzcxLFxuICBtZWRpdW1zbGF0ZWJsdWU6IDB4N2I2OGVlLFxuICBtZWRpdW1zcHJpbmdncmVlbjogMHgwMGZhOWEsXG4gIG1lZGl1bXR1cnF1b2lzZTogMHg0OGQxY2MsXG4gIG1lZGl1bXZpb2xldHJlZDogMHhjNzE1ODUsXG4gIG1pZG5pZ2h0Ymx1ZTogMHgxOTE5NzAsXG4gIG1pbnRjcmVhbTogMHhmNWZmZmEsXG4gIG1pc3R5cm9zZTogMHhmZmU0ZTEsXG4gIG1vY2Nhc2luOiAweGZmZTRiNSxcbiAgbmF2YWpvd2hpdGU6IDB4ZmZkZWFkLFxuICBuYXZ5OiAweDAwMDA4MCxcbiAgb2xkbGFjZTogMHhmZGY1ZTYsXG4gIG9saXZlOiAweDgwODAwMCxcbiAgb2xpdmVkcmFiOiAweDZiOGUyMyxcbiAgb3JhbmdlOiAweGZmYTUwMCxcbiAgb3JhbmdlcmVkOiAweGZmNDUwMCxcbiAgb3JjaGlkOiAweGRhNzBkNixcbiAgcGFsZWdvbGRlbnJvZDogMHhlZWU4YWEsXG4gIHBhbGVncmVlbjogMHg5OGZiOTgsXG4gIHBhbGV0dXJxdW9pc2U6IDB4YWZlZWVlLFxuICBwYWxldmlvbGV0cmVkOiAweGRiNzA5MyxcbiAgcGFwYXlhd2hpcDogMHhmZmVmZDUsXG4gIHBlYWNocHVmZjogMHhmZmRhYjksXG4gIHBlcnU6IDB4Y2Q4NTNmLFxuICBwaW5rOiAweGZmYzBjYixcbiAgcGx1bTogMHhkZGEwZGQsXG4gIHBvd2RlcmJsdWU6IDB4YjBlMGU2LFxuICBwdXJwbGU6IDB4ODAwMDgwLFxuICByZWJlY2NhcHVycGxlOiAweDY2MzM5OSxcbiAgcmVkOiAweGZmMDAwMCxcbiAgcm9zeWJyb3duOiAweGJjOGY4ZixcbiAgcm95YWxibHVlOiAweDQxNjllMSxcbiAgc2FkZGxlYnJvd246IDB4OGI0NTEzLFxuICBzYWxtb246IDB4ZmE4MDcyLFxuICBzYW5keWJyb3duOiAweGY0YTQ2MCxcbiAgc2VhZ3JlZW46IDB4MmU4YjU3LFxuICBzZWFzaGVsbDogMHhmZmY1ZWUsXG4gIHNpZW5uYTogMHhhMDUyMmQsXG4gIHNpbHZlcjogMHhjMGMwYzAsXG4gIHNreWJsdWU6IDB4ODdjZWViLFxuICBzbGF0ZWJsdWU6IDB4NmE1YWNkLFxuICBzbGF0ZWdyYXk6IDB4NzA4MDkwLFxuICBzbGF0ZWdyZXk6IDB4NzA4MDkwLFxuICBzbm93OiAweGZmZmFmYSxcbiAgc3ByaW5nZ3JlZW46IDB4MDBmZjdmLFxuICBzdGVlbGJsdWU6IDB4NDY4MmI0LFxuICB0YW46IDB4ZDJiNDhjLFxuICB0ZWFsOiAweDAwODA4MCxcbiAgdGhpc3RsZTogMHhkOGJmZDgsXG4gIHRvbWF0bzogMHhmZjYzNDcsXG4gIHR1cnF1b2lzZTogMHg0MGUwZDAsXG4gIHZpb2xldDogMHhlZTgyZWUsXG4gIHdoZWF0OiAweGY1ZGViMyxcbiAgd2hpdGU6IDB4ZmZmZmZmLFxuICB3aGl0ZXNtb2tlOiAweGY1ZjVmNSxcbiAgeWVsbG93OiAweGZmZmYwMCxcbiAgeWVsbG93Z3JlZW46IDB4OWFjZDMyXG59O1xuXG5kZWZpbmUoQ29sb3IsIGNvbG9yLCB7XG4gIGNvcHkoY2hhbm5lbHMpIHtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihuZXcgdGhpcy5jb25zdHJ1Y3RvciwgdGhpcywgY2hhbm5lbHMpO1xuICB9LFxuICBkaXNwbGF5YWJsZSgpIHtcbiAgICByZXR1cm4gdGhpcy5yZ2IoKS5kaXNwbGF5YWJsZSgpO1xuICB9LFxuICBoZXg6IGNvbG9yX2Zvcm1hdEhleCwgLy8gRGVwcmVjYXRlZCEgVXNlIGNvbG9yLmZvcm1hdEhleC5cbiAgZm9ybWF0SGV4OiBjb2xvcl9mb3JtYXRIZXgsXG4gIGZvcm1hdEhleDg6IGNvbG9yX2Zvcm1hdEhleDgsXG4gIGZvcm1hdEhzbDogY29sb3JfZm9ybWF0SHNsLFxuICBmb3JtYXRSZ2I6IGNvbG9yX2Zvcm1hdFJnYixcbiAgdG9TdHJpbmc6IGNvbG9yX2Zvcm1hdFJnYlxufSk7XG5cbmZ1bmN0aW9uIGNvbG9yX2Zvcm1hdEhleCgpIHtcbiAgcmV0dXJuIHRoaXMucmdiKCkuZm9ybWF0SGV4KCk7XG59XG5cbmZ1bmN0aW9uIGNvbG9yX2Zvcm1hdEhleDgoKSB7XG4gIHJldHVybiB0aGlzLnJnYigpLmZvcm1hdEhleDgoKTtcbn1cblxuZnVuY3Rpb24gY29sb3JfZm9ybWF0SHNsKCkge1xuICByZXR1cm4gaHNsQ29udmVydCh0aGlzKS5mb3JtYXRIc2woKTtcbn1cblxuZnVuY3Rpb24gY29sb3JfZm9ybWF0UmdiKCkge1xuICByZXR1cm4gdGhpcy5yZ2IoKS5mb3JtYXRSZ2IoKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY29sb3IoZm9ybWF0KSB7XG4gIHZhciBtLCBsO1xuICBmb3JtYXQgPSAoZm9ybWF0ICsgXCJcIikudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiAobSA9IHJlSGV4LmV4ZWMoZm9ybWF0KSkgPyAobCA9IG1bMV0ubGVuZ3RoLCBtID0gcGFyc2VJbnQobVsxXSwgMTYpLCBsID09PSA2ID8gcmdibihtKSAvLyAjZmYwMDAwXG4gICAgICA6IGwgPT09IDMgPyBuZXcgUmdiKChtID4+IDggJiAweGYpIHwgKG0gPj4gNCAmIDB4ZjApLCAobSA+PiA0ICYgMHhmKSB8IChtICYgMHhmMCksICgobSAmIDB4ZikgPDwgNCkgfCAobSAmIDB4ZiksIDEpIC8vICNmMDBcbiAgICAgIDogbCA9PT0gOCA/IHJnYmEobSA+PiAyNCAmIDB4ZmYsIG0gPj4gMTYgJiAweGZmLCBtID4+IDggJiAweGZmLCAobSAmIDB4ZmYpIC8gMHhmZikgLy8gI2ZmMDAwMDAwXG4gICAgICA6IGwgPT09IDQgPyByZ2JhKChtID4+IDEyICYgMHhmKSB8IChtID4+IDggJiAweGYwKSwgKG0gPj4gOCAmIDB4ZikgfCAobSA+PiA0ICYgMHhmMCksIChtID4+IDQgJiAweGYpIHwgKG0gJiAweGYwKSwgKCgobSAmIDB4ZikgPDwgNCkgfCAobSAmIDB4ZikpIC8gMHhmZikgLy8gI2YwMDBcbiAgICAgIDogbnVsbCkgLy8gaW52YWxpZCBoZXhcbiAgICAgIDogKG0gPSByZVJnYkludGVnZXIuZXhlYyhmb3JtYXQpKSA/IG5ldyBSZ2IobVsxXSwgbVsyXSwgbVszXSwgMSkgLy8gcmdiKDI1NSwgMCwgMClcbiAgICAgIDogKG0gPSByZVJnYlBlcmNlbnQuZXhlYyhmb3JtYXQpKSA/IG5ldyBSZ2IobVsxXSAqIDI1NSAvIDEwMCwgbVsyXSAqIDI1NSAvIDEwMCwgbVszXSAqIDI1NSAvIDEwMCwgMSkgLy8gcmdiKDEwMCUsIDAlLCAwJSlcbiAgICAgIDogKG0gPSByZVJnYmFJbnRlZ2VyLmV4ZWMoZm9ybWF0KSkgPyByZ2JhKG1bMV0sIG1bMl0sIG1bM10sIG1bNF0pIC8vIHJnYmEoMjU1LCAwLCAwLCAxKVxuICAgICAgOiAobSA9IHJlUmdiYVBlcmNlbnQuZXhlYyhmb3JtYXQpKSA/IHJnYmEobVsxXSAqIDI1NSAvIDEwMCwgbVsyXSAqIDI1NSAvIDEwMCwgbVszXSAqIDI1NSAvIDEwMCwgbVs0XSkgLy8gcmdiKDEwMCUsIDAlLCAwJSwgMSlcbiAgICAgIDogKG0gPSByZUhzbFBlcmNlbnQuZXhlYyhmb3JtYXQpKSA/IGhzbGEobVsxXSwgbVsyXSAvIDEwMCwgbVszXSAvIDEwMCwgMSkgLy8gaHNsKDEyMCwgNTAlLCA1MCUpXG4gICAgICA6IChtID0gcmVIc2xhUGVyY2VudC5leGVjKGZvcm1hdCkpID8gaHNsYShtWzFdLCBtWzJdIC8gMTAwLCBtWzNdIC8gMTAwLCBtWzRdKSAvLyBoc2xhKDEyMCwgNTAlLCA1MCUsIDEpXG4gICAgICA6IG5hbWVkLmhhc093blByb3BlcnR5KGZvcm1hdCkgPyByZ2JuKG5hbWVkW2Zvcm1hdF0pIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tcHJvdG90eXBlLWJ1aWx0aW5zXG4gICAgICA6IGZvcm1hdCA9PT0gXCJ0cmFuc3BhcmVudFwiID8gbmV3IFJnYihOYU4sIE5hTiwgTmFOLCAwKVxuICAgICAgOiBudWxsO1xufVxuXG5mdW5jdGlvbiByZ2JuKG4pIHtcbiAgcmV0dXJuIG5ldyBSZ2IobiA+PiAxNiAmIDB4ZmYsIG4gPj4gOCAmIDB4ZmYsIG4gJiAweGZmLCAxKTtcbn1cblxuZnVuY3Rpb24gcmdiYShyLCBnLCBiLCBhKSB7XG4gIGlmIChhIDw9IDApIHIgPSBnID0gYiA9IE5hTjtcbiAgcmV0dXJuIG5ldyBSZ2IociwgZywgYiwgYSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZ2JDb252ZXJ0KG8pIHtcbiAgaWYgKCEobyBpbnN0YW5jZW9mIENvbG9yKSkgbyA9IGNvbG9yKG8pO1xuICBpZiAoIW8pIHJldHVybiBuZXcgUmdiO1xuICBvID0gby5yZ2IoKTtcbiAgcmV0dXJuIG5ldyBSZ2Ioby5yLCBvLmcsIG8uYiwgby5vcGFjaXR5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJnYihyLCBnLCBiLCBvcGFjaXR5KSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID09PSAxID8gcmdiQ29udmVydChyKSA6IG5ldyBSZ2IociwgZywgYiwgb3BhY2l0eSA9PSBudWxsID8gMSA6IG9wYWNpdHkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gUmdiKHIsIGcsIGIsIG9wYWNpdHkpIHtcbiAgdGhpcy5yID0gK3I7XG4gIHRoaXMuZyA9ICtnO1xuICB0aGlzLmIgPSArYjtcbiAgdGhpcy5vcGFjaXR5ID0gK29wYWNpdHk7XG59XG5cbmRlZmluZShSZ2IsIHJnYiwgZXh0ZW5kKENvbG9yLCB7XG4gIGJyaWdodGVyKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gYnJpZ2h0ZXIgOiBNYXRoLnBvdyhicmlnaHRlciwgayk7XG4gICAgcmV0dXJuIG5ldyBSZ2IodGhpcy5yICogaywgdGhpcy5nICogaywgdGhpcy5iICogaywgdGhpcy5vcGFjaXR5KTtcbiAgfSxcbiAgZGFya2VyKGspIHtcbiAgICBrID0gayA9PSBudWxsID8gZGFya2VyIDogTWF0aC5wb3coZGFya2VyLCBrKTtcbiAgICByZXR1cm4gbmV3IFJnYih0aGlzLnIgKiBrLCB0aGlzLmcgKiBrLCB0aGlzLmIgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICByZ2IoKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG4gIGNsYW1wKCkge1xuICAgIHJldHVybiBuZXcgUmdiKGNsYW1waSh0aGlzLnIpLCBjbGFtcGkodGhpcy5nKSwgY2xhbXBpKHRoaXMuYiksIGNsYW1wYSh0aGlzLm9wYWNpdHkpKTtcbiAgfSxcbiAgZGlzcGxheWFibGUoKSB7XG4gICAgcmV0dXJuICgtMC41IDw9IHRoaXMuciAmJiB0aGlzLnIgPCAyNTUuNSlcbiAgICAgICAgJiYgKC0wLjUgPD0gdGhpcy5nICYmIHRoaXMuZyA8IDI1NS41KVxuICAgICAgICAmJiAoLTAuNSA8PSB0aGlzLmIgJiYgdGhpcy5iIDwgMjU1LjUpXG4gICAgICAgICYmICgwIDw9IHRoaXMub3BhY2l0eSAmJiB0aGlzLm9wYWNpdHkgPD0gMSk7XG4gIH0sXG4gIGhleDogcmdiX2Zvcm1hdEhleCwgLy8gRGVwcmVjYXRlZCEgVXNlIGNvbG9yLmZvcm1hdEhleC5cbiAgZm9ybWF0SGV4OiByZ2JfZm9ybWF0SGV4LFxuICBmb3JtYXRIZXg4OiByZ2JfZm9ybWF0SGV4OCxcbiAgZm9ybWF0UmdiOiByZ2JfZm9ybWF0UmdiLFxuICB0b1N0cmluZzogcmdiX2Zvcm1hdFJnYlxufSkpO1xuXG5mdW5jdGlvbiByZ2JfZm9ybWF0SGV4KCkge1xuICByZXR1cm4gYCMke2hleCh0aGlzLnIpfSR7aGV4KHRoaXMuZyl9JHtoZXgodGhpcy5iKX1gO1xufVxuXG5mdW5jdGlvbiByZ2JfZm9ybWF0SGV4OCgpIHtcbiAgcmV0dXJuIGAjJHtoZXgodGhpcy5yKX0ke2hleCh0aGlzLmcpfSR7aGV4KHRoaXMuYil9JHtoZXgoKGlzTmFOKHRoaXMub3BhY2l0eSkgPyAxIDogdGhpcy5vcGFjaXR5KSAqIDI1NSl9YDtcbn1cblxuZnVuY3Rpb24gcmdiX2Zvcm1hdFJnYigpIHtcbiAgY29uc3QgYSA9IGNsYW1wYSh0aGlzLm9wYWNpdHkpO1xuICByZXR1cm4gYCR7YSA9PT0gMSA/IFwicmdiKFwiIDogXCJyZ2JhKFwifSR7Y2xhbXBpKHRoaXMucil9LCAke2NsYW1waSh0aGlzLmcpfSwgJHtjbGFtcGkodGhpcy5iKX0ke2EgPT09IDEgPyBcIilcIiA6IGAsICR7YX0pYH1gO1xufVxuXG5mdW5jdGlvbiBjbGFtcGEob3BhY2l0eSkge1xuICByZXR1cm4gaXNOYU4ob3BhY2l0eSkgPyAxIDogTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgb3BhY2l0eSkpO1xufVxuXG5mdW5jdGlvbiBjbGFtcGkodmFsdWUpIHtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWluKDI1NSwgTWF0aC5yb3VuZCh2YWx1ZSkgfHwgMCkpO1xufVxuXG5mdW5jdGlvbiBoZXgodmFsdWUpIHtcbiAgdmFsdWUgPSBjbGFtcGkodmFsdWUpO1xuICByZXR1cm4gKHZhbHVlIDwgMTYgPyBcIjBcIiA6IFwiXCIpICsgdmFsdWUudG9TdHJpbmcoMTYpO1xufVxuXG5mdW5jdGlvbiBoc2xhKGgsIHMsIGwsIGEpIHtcbiAgaWYgKGEgPD0gMCkgaCA9IHMgPSBsID0gTmFOO1xuICBlbHNlIGlmIChsIDw9IDAgfHwgbCA+PSAxKSBoID0gcyA9IE5hTjtcbiAgZWxzZSBpZiAocyA8PSAwKSBoID0gTmFOO1xuICByZXR1cm4gbmV3IEhzbChoLCBzLCBsLCBhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGhzbENvbnZlcnQobykge1xuICBpZiAobyBpbnN0YW5jZW9mIEhzbCkgcmV0dXJuIG5ldyBIc2woby5oLCBvLnMsIG8ubCwgby5vcGFjaXR5KTtcbiAgaWYgKCEobyBpbnN0YW5jZW9mIENvbG9yKSkgbyA9IGNvbG9yKG8pO1xuICBpZiAoIW8pIHJldHVybiBuZXcgSHNsO1xuICBpZiAobyBpbnN0YW5jZW9mIEhzbCkgcmV0dXJuIG87XG4gIG8gPSBvLnJnYigpO1xuICB2YXIgciA9IG8uciAvIDI1NSxcbiAgICAgIGcgPSBvLmcgLyAyNTUsXG4gICAgICBiID0gby5iIC8gMjU1LFxuICAgICAgbWluID0gTWF0aC5taW4ociwgZywgYiksXG4gICAgICBtYXggPSBNYXRoLm1heChyLCBnLCBiKSxcbiAgICAgIGggPSBOYU4sXG4gICAgICBzID0gbWF4IC0gbWluLFxuICAgICAgbCA9IChtYXggKyBtaW4pIC8gMjtcbiAgaWYgKHMpIHtcbiAgICBpZiAociA9PT0gbWF4KSBoID0gKGcgLSBiKSAvIHMgKyAoZyA8IGIpICogNjtcbiAgICBlbHNlIGlmIChnID09PSBtYXgpIGggPSAoYiAtIHIpIC8gcyArIDI7XG4gICAgZWxzZSBoID0gKHIgLSBnKSAvIHMgKyA0O1xuICAgIHMgLz0gbCA8IDAuNSA/IG1heCArIG1pbiA6IDIgLSBtYXggLSBtaW47XG4gICAgaCAqPSA2MDtcbiAgfSBlbHNlIHtcbiAgICBzID0gbCA+IDAgJiYgbCA8IDEgPyAwIDogaDtcbiAgfVxuICByZXR1cm4gbmV3IEhzbChoLCBzLCBsLCBvLm9wYWNpdHkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaHNsKGgsIHMsIGwsIG9wYWNpdHkpIHtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPT09IDEgPyBoc2xDb252ZXJ0KGgpIDogbmV3IEhzbChoLCBzLCBsLCBvcGFjaXR5ID09IG51bGwgPyAxIDogb3BhY2l0eSk7XG59XG5cbmZ1bmN0aW9uIEhzbChoLCBzLCBsLCBvcGFjaXR5KSB7XG4gIHRoaXMuaCA9ICtoO1xuICB0aGlzLnMgPSArcztcbiAgdGhpcy5sID0gK2w7XG4gIHRoaXMub3BhY2l0eSA9ICtvcGFjaXR5O1xufVxuXG5kZWZpbmUoSHNsLCBoc2wsIGV4dGVuZChDb2xvciwge1xuICBicmlnaHRlcihrKSB7XG4gICAgayA9IGsgPT0gbnVsbCA/IGJyaWdodGVyIDogTWF0aC5wb3coYnJpZ2h0ZXIsIGspO1xuICAgIHJldHVybiBuZXcgSHNsKHRoaXMuaCwgdGhpcy5zLCB0aGlzLmwgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICBkYXJrZXIoaykge1xuICAgIGsgPSBrID09IG51bGwgPyBkYXJrZXIgOiBNYXRoLnBvdyhkYXJrZXIsIGspO1xuICAgIHJldHVybiBuZXcgSHNsKHRoaXMuaCwgdGhpcy5zLCB0aGlzLmwgKiBrLCB0aGlzLm9wYWNpdHkpO1xuICB9LFxuICByZ2IoKSB7XG4gICAgdmFyIGggPSB0aGlzLmggJSAzNjAgKyAodGhpcy5oIDwgMCkgKiAzNjAsXG4gICAgICAgIHMgPSBpc05hTihoKSB8fCBpc05hTih0aGlzLnMpID8gMCA6IHRoaXMucyxcbiAgICAgICAgbCA9IHRoaXMubCxcbiAgICAgICAgbTIgPSBsICsgKGwgPCAwLjUgPyBsIDogMSAtIGwpICogcyxcbiAgICAgICAgbTEgPSAyICogbCAtIG0yO1xuICAgIHJldHVybiBuZXcgUmdiKFxuICAgICAgaHNsMnJnYihoID49IDI0MCA/IGggLSAyNDAgOiBoICsgMTIwLCBtMSwgbTIpLFxuICAgICAgaHNsMnJnYihoLCBtMSwgbTIpLFxuICAgICAgaHNsMnJnYihoIDwgMTIwID8gaCArIDI0MCA6IGggLSAxMjAsIG0xLCBtMiksXG4gICAgICB0aGlzLm9wYWNpdHlcbiAgICApO1xuICB9LFxuICBjbGFtcCgpIHtcbiAgICByZXR1cm4gbmV3IEhzbChjbGFtcGgodGhpcy5oKSwgY2xhbXB0KHRoaXMucyksIGNsYW1wdCh0aGlzLmwpLCBjbGFtcGEodGhpcy5vcGFjaXR5KSk7XG4gIH0sXG4gIGRpc3BsYXlhYmxlKCkge1xuICAgIHJldHVybiAoMCA8PSB0aGlzLnMgJiYgdGhpcy5zIDw9IDEgfHwgaXNOYU4odGhpcy5zKSlcbiAgICAgICAgJiYgKDAgPD0gdGhpcy5sICYmIHRoaXMubCA8PSAxKVxuICAgICAgICAmJiAoMCA8PSB0aGlzLm9wYWNpdHkgJiYgdGhpcy5vcGFjaXR5IDw9IDEpO1xuICB9LFxuICBmb3JtYXRIc2woKSB7XG4gICAgY29uc3QgYSA9IGNsYW1wYSh0aGlzLm9wYWNpdHkpO1xuICAgIHJldHVybiBgJHthID09PSAxID8gXCJoc2woXCIgOiBcImhzbGEoXCJ9JHtjbGFtcGgodGhpcy5oKX0sICR7Y2xhbXB0KHRoaXMucykgKiAxMDB9JSwgJHtjbGFtcHQodGhpcy5sKSAqIDEwMH0lJHthID09PSAxID8gXCIpXCIgOiBgLCAke2F9KWB9YDtcbiAgfVxufSkpO1xuXG5mdW5jdGlvbiBjbGFtcGgodmFsdWUpIHtcbiAgdmFsdWUgPSAodmFsdWUgfHwgMCkgJSAzNjA7XG4gIHJldHVybiB2YWx1ZSA8IDAgPyB2YWx1ZSArIDM2MCA6IHZhbHVlO1xufVxuXG5mdW5jdGlvbiBjbGFtcHQodmFsdWUpIHtcbiAgcmV0dXJuIE1hdGgubWF4KDAsIE1hdGgubWluKDEsIHZhbHVlIHx8IDApKTtcbn1cblxuLyogRnJvbSBGdkQgMTMuMzcsIENTUyBDb2xvciBNb2R1bGUgTGV2ZWwgMyAqL1xuZnVuY3Rpb24gaHNsMnJnYihoLCBtMSwgbTIpIHtcbiAgcmV0dXJuIChoIDwgNjAgPyBtMSArIChtMiAtIG0xKSAqIGggLyA2MFxuICAgICAgOiBoIDwgMTgwID8gbTJcbiAgICAgIDogaCA8IDI0MCA/IG0xICsgKG0yIC0gbTEpICogKDI0MCAtIGgpIC8gNjBcbiAgICAgIDogbTEpICogMjU1O1xufVxuIiwgImV4cG9ydCBmdW5jdGlvbiBiYXNpcyh0MSwgdjAsIHYxLCB2MiwgdjMpIHtcbiAgdmFyIHQyID0gdDEgKiB0MSwgdDMgPSB0MiAqIHQxO1xuICByZXR1cm4gKCgxIC0gMyAqIHQxICsgMyAqIHQyIC0gdDMpICogdjBcbiAgICAgICsgKDQgLSA2ICogdDIgKyAzICogdDMpICogdjFcbiAgICAgICsgKDEgKyAzICogdDEgKyAzICogdDIgLSAzICogdDMpICogdjJcbiAgICAgICsgdDMgKiB2MykgLyA2O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgdmFyIG4gPSB2YWx1ZXMubGVuZ3RoIC0gMTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgaSA9IHQgPD0gMCA/ICh0ID0gMCkgOiB0ID49IDEgPyAodCA9IDEsIG4gLSAxKSA6IE1hdGguZmxvb3IodCAqIG4pLFxuICAgICAgICB2MSA9IHZhbHVlc1tpXSxcbiAgICAgICAgdjIgPSB2YWx1ZXNbaSArIDFdLFxuICAgICAgICB2MCA9IGkgPiAwID8gdmFsdWVzW2kgLSAxXSA6IDIgKiB2MSAtIHYyLFxuICAgICAgICB2MyA9IGkgPCBuIC0gMSA/IHZhbHVlc1tpICsgMl0gOiAyICogdjIgLSB2MTtcbiAgICByZXR1cm4gYmFzaXMoKHQgLSBpIC8gbikgKiBuLCB2MCwgdjEsIHYyLCB2Myk7XG4gIH07XG59XG4iLCAiaW1wb3J0IHtiYXNpc30gZnJvbSBcIi4vYmFzaXMuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odmFsdWVzKSB7XG4gIHZhciBuID0gdmFsdWVzLmxlbmd0aDtcbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICB2YXIgaSA9IE1hdGguZmxvb3IoKCh0ICU9IDEpIDwgMCA/ICsrdCA6IHQpICogbiksXG4gICAgICAgIHYwID0gdmFsdWVzWyhpICsgbiAtIDEpICUgbl0sXG4gICAgICAgIHYxID0gdmFsdWVzW2kgJSBuXSxcbiAgICAgICAgdjIgPSB2YWx1ZXNbKGkgKyAxKSAlIG5dLFxuICAgICAgICB2MyA9IHZhbHVlc1soaSArIDIpICUgbl07XG4gICAgcmV0dXJuIGJhc2lzKCh0IC0gaSAvIG4pICogbiwgdjAsIHYxLCB2MiwgdjMpO1xuICB9O1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IHggPT4gKCkgPT4geDtcbiIsICJpbXBvcnQgY29uc3RhbnQgZnJvbSBcIi4vY29uc3RhbnQuanNcIjtcblxuZnVuY3Rpb24gbGluZWFyKGEsIGQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gYSArIHQgKiBkO1xuICB9O1xufVxuXG5mdW5jdGlvbiBleHBvbmVudGlhbChhLCBiLCB5KSB7XG4gIHJldHVybiBhID0gTWF0aC5wb3coYSwgeSksIGIgPSBNYXRoLnBvdyhiLCB5KSAtIGEsIHkgPSAxIC8geSwgZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBNYXRoLnBvdyhhICsgdCAqIGIsIHkpO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaHVlKGEsIGIpIHtcbiAgdmFyIGQgPSBiIC0gYTtcbiAgcmV0dXJuIGQgPyBsaW5lYXIoYSwgZCA+IDE4MCB8fCBkIDwgLTE4MCA/IGQgLSAzNjAgKiBNYXRoLnJvdW5kKGQgLyAzNjApIDogZCkgOiBjb25zdGFudChpc05hTihhKSA/IGIgOiBhKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdhbW1hKHkpIHtcbiAgcmV0dXJuICh5ID0gK3kpID09PSAxID8gbm9nYW1tYSA6IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gYiAtIGEgPyBleHBvbmVudGlhbChhLCBiLCB5KSA6IGNvbnN0YW50KGlzTmFOKGEpID8gYiA6IGEpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBub2dhbW1hKGEsIGIpIHtcbiAgdmFyIGQgPSBiIC0gYTtcbiAgcmV0dXJuIGQgPyBsaW5lYXIoYSwgZCkgOiBjb25zdGFudChpc05hTihhKSA/IGIgOiBhKTtcbn1cbiIsICJpbXBvcnQge3JnYiBhcyBjb2xvclJnYn0gZnJvbSBcImQzLWNvbG9yXCI7XG5pbXBvcnQgYmFzaXMgZnJvbSBcIi4vYmFzaXMuanNcIjtcbmltcG9ydCBiYXNpc0Nsb3NlZCBmcm9tIFwiLi9iYXNpc0Nsb3NlZC5qc1wiO1xuaW1wb3J0IG5vZ2FtbWEsIHtnYW1tYX0gZnJvbSBcIi4vY29sb3IuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgKGZ1bmN0aW9uIHJnYkdhbW1hKHkpIHtcbiAgdmFyIGNvbG9yID0gZ2FtbWEoeSk7XG5cbiAgZnVuY3Rpb24gcmdiKHN0YXJ0LCBlbmQpIHtcbiAgICB2YXIgciA9IGNvbG9yKChzdGFydCA9IGNvbG9yUmdiKHN0YXJ0KSkuciwgKGVuZCA9IGNvbG9yUmdiKGVuZCkpLnIpLFxuICAgICAgICBnID0gY29sb3Ioc3RhcnQuZywgZW5kLmcpLFxuICAgICAgICBiID0gY29sb3Ioc3RhcnQuYiwgZW5kLmIpLFxuICAgICAgICBvcGFjaXR5ID0gbm9nYW1tYShzdGFydC5vcGFjaXR5LCBlbmQub3BhY2l0eSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIHN0YXJ0LnIgPSByKHQpO1xuICAgICAgc3RhcnQuZyA9IGcodCk7XG4gICAgICBzdGFydC5iID0gYih0KTtcbiAgICAgIHN0YXJ0Lm9wYWNpdHkgPSBvcGFjaXR5KHQpO1xuICAgICAgcmV0dXJuIHN0YXJ0ICsgXCJcIjtcbiAgICB9O1xuICB9XG5cbiAgcmdiLmdhbW1hID0gcmdiR2FtbWE7XG5cbiAgcmV0dXJuIHJnYjtcbn0pKDEpO1xuXG5mdW5jdGlvbiByZ2JTcGxpbmUoc3BsaW5lKSB7XG4gIHJldHVybiBmdW5jdGlvbihjb2xvcnMpIHtcbiAgICB2YXIgbiA9IGNvbG9ycy5sZW5ndGgsXG4gICAgICAgIHIgPSBuZXcgQXJyYXkobiksXG4gICAgICAgIGcgPSBuZXcgQXJyYXkobiksXG4gICAgICAgIGIgPSBuZXcgQXJyYXkobiksXG4gICAgICAgIGksIGNvbG9yO1xuICAgIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGNvbG9yID0gY29sb3JSZ2IoY29sb3JzW2ldKTtcbiAgICAgIHJbaV0gPSBjb2xvci5yIHx8IDA7XG4gICAgICBnW2ldID0gY29sb3IuZyB8fCAwO1xuICAgICAgYltpXSA9IGNvbG9yLmIgfHwgMDtcbiAgICB9XG4gICAgciA9IHNwbGluZShyKTtcbiAgICBnID0gc3BsaW5lKGcpO1xuICAgIGIgPSBzcGxpbmUoYik7XG4gICAgY29sb3Iub3BhY2l0eSA9IDE7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHQpIHtcbiAgICAgIGNvbG9yLnIgPSByKHQpO1xuICAgICAgY29sb3IuZyA9IGcodCk7XG4gICAgICBjb2xvci5iID0gYih0KTtcbiAgICAgIHJldHVybiBjb2xvciArIFwiXCI7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IHZhciByZ2JCYXNpcyA9IHJnYlNwbGluZShiYXNpcyk7XG5leHBvcnQgdmFyIHJnYkJhc2lzQ2xvc2VkID0gcmdiU3BsaW5lKGJhc2lzQ2xvc2VkKTtcbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIGlmICghYikgYiA9IFtdO1xuICB2YXIgbiA9IGEgPyBNYXRoLm1pbihiLmxlbmd0aCwgYS5sZW5ndGgpIDogMCxcbiAgICAgIGMgPSBiLnNsaWNlKCksXG4gICAgICBpO1xuICByZXR1cm4gZnVuY3Rpb24odCkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBuOyArK2kpIGNbaV0gPSBhW2ldICogKDEgLSB0KSArIGJbaV0gKiB0O1xuICAgIHJldHVybiBjO1xuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1iZXJBcnJheSh4KSB7XG4gIHJldHVybiBBcnJheUJ1ZmZlci5pc1ZpZXcoeCkgJiYgISh4IGluc3RhbmNlb2YgRGF0YVZpZXcpO1xufVxuIiwgImltcG9ydCB2YWx1ZSBmcm9tIFwiLi92YWx1ZS5qc1wiO1xuaW1wb3J0IG51bWJlckFycmF5LCB7aXNOdW1iZXJBcnJheX0gZnJvbSBcIi4vbnVtYmVyQXJyYXkuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oYSwgYikge1xuICByZXR1cm4gKGlzTnVtYmVyQXJyYXkoYikgPyBudW1iZXJBcnJheSA6IGdlbmVyaWNBcnJheSkoYSwgYik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmljQXJyYXkoYSwgYikge1xuICB2YXIgbmIgPSBiID8gYi5sZW5ndGggOiAwLFxuICAgICAgbmEgPSBhID8gTWF0aC5taW4obmIsIGEubGVuZ3RoKSA6IDAsXG4gICAgICB4ID0gbmV3IEFycmF5KG5hKSxcbiAgICAgIGMgPSBuZXcgQXJyYXkobmIpLFxuICAgICAgaTtcblxuICBmb3IgKGkgPSAwOyBpIDwgbmE7ICsraSkgeFtpXSA9IHZhbHVlKGFbaV0sIGJbaV0pO1xuICBmb3IgKDsgaSA8IG5iOyArK2kpIGNbaV0gPSBiW2ldO1xuXG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgZm9yIChpID0gMDsgaSA8IG5hOyArK2kpIGNbaV0gPSB4W2ldKHQpO1xuICAgIHJldHVybiBjO1xuICB9O1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZTtcbiAgcmV0dXJuIGEgPSArYSwgYiA9ICtiLCBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIGQuc2V0VGltZShhICogKDEgLSB0KSArIGIgKiB0KSwgZDtcbiAgfTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHJldHVybiBhID0gK2EsIGIgPSArYiwgZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBhICogKDEgLSB0KSArIGIgKiB0O1xuICB9O1xufVxuIiwgImltcG9ydCB2YWx1ZSBmcm9tIFwiLi92YWx1ZS5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciBpID0ge30sXG4gICAgICBjID0ge30sXG4gICAgICBrO1xuXG4gIGlmIChhID09PSBudWxsIHx8IHR5cGVvZiBhICE9PSBcIm9iamVjdFwiKSBhID0ge307XG4gIGlmIChiID09PSBudWxsIHx8IHR5cGVvZiBiICE9PSBcIm9iamVjdFwiKSBiID0ge307XG5cbiAgZm9yIChrIGluIGIpIHtcbiAgICBpZiAoayBpbiBhKSB7XG4gICAgICBpW2tdID0gdmFsdWUoYVtrXSwgYltrXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNba10gPSBiW2tdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgZm9yIChrIGluIGkpIGNba10gPSBpW2tdKHQpO1xuICAgIHJldHVybiBjO1xuICB9O1xufVxuIiwgImltcG9ydCBudW1iZXIgZnJvbSBcIi4vbnVtYmVyLmpzXCI7XG5cbnZhciByZUEgPSAvWy0rXT8oPzpcXGQrXFwuP1xcZCp8XFwuP1xcZCspKD86W2VFXVstK10/XFxkKyk/L2csXG4gICAgcmVCID0gbmV3IFJlZ0V4cChyZUEuc291cmNlLCBcImdcIik7XG5cbmZ1bmN0aW9uIHplcm8oYikge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGI7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG9uZShiKSB7XG4gIHJldHVybiBmdW5jdGlvbih0KSB7XG4gICAgcmV0dXJuIGIodCkgKyBcIlwiO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHZhciBiaSA9IHJlQS5sYXN0SW5kZXggPSByZUIubGFzdEluZGV4ID0gMCwgLy8gc2NhbiBpbmRleCBmb3IgbmV4dCBudW1iZXIgaW4gYlxuICAgICAgYW0sIC8vIGN1cnJlbnQgbWF0Y2ggaW4gYVxuICAgICAgYm0sIC8vIGN1cnJlbnQgbWF0Y2ggaW4gYlxuICAgICAgYnMsIC8vIHN0cmluZyBwcmVjZWRpbmcgY3VycmVudCBudW1iZXIgaW4gYiwgaWYgYW55XG4gICAgICBpID0gLTEsIC8vIGluZGV4IGluIHNcbiAgICAgIHMgPSBbXSwgLy8gc3RyaW5nIGNvbnN0YW50cyBhbmQgcGxhY2Vob2xkZXJzXG4gICAgICBxID0gW107IC8vIG51bWJlciBpbnRlcnBvbGF0b3JzXG5cbiAgLy8gQ29lcmNlIGlucHV0cyB0byBzdHJpbmdzLlxuICBhID0gYSArIFwiXCIsIGIgPSBiICsgXCJcIjtcblxuICAvLyBJbnRlcnBvbGF0ZSBwYWlycyBvZiBudW1iZXJzIGluIGEgJiBiLlxuICB3aGlsZSAoKGFtID0gcmVBLmV4ZWMoYSkpXG4gICAgICAmJiAoYm0gPSByZUIuZXhlYyhiKSkpIHtcbiAgICBpZiAoKGJzID0gYm0uaW5kZXgpID4gYmkpIHsgLy8gYSBzdHJpbmcgcHJlY2VkZXMgdGhlIG5leHQgbnVtYmVyIGluIGJcbiAgICAgIGJzID0gYi5zbGljZShiaSwgYnMpO1xuICAgICAgaWYgKHNbaV0pIHNbaV0gKz0gYnM7IC8vIGNvYWxlc2NlIHdpdGggcHJldmlvdXMgc3RyaW5nXG4gICAgICBlbHNlIHNbKytpXSA9IGJzO1xuICAgIH1cbiAgICBpZiAoKGFtID0gYW1bMF0pID09PSAoYm0gPSBibVswXSkpIHsgLy8gbnVtYmVycyBpbiBhICYgYiBtYXRjaFxuICAgICAgaWYgKHNbaV0pIHNbaV0gKz0gYm07IC8vIGNvYWxlc2NlIHdpdGggcHJldmlvdXMgc3RyaW5nXG4gICAgICBlbHNlIHNbKytpXSA9IGJtO1xuICAgIH0gZWxzZSB7IC8vIGludGVycG9sYXRlIG5vbi1tYXRjaGluZyBudW1iZXJzXG4gICAgICBzWysraV0gPSBudWxsO1xuICAgICAgcS5wdXNoKHtpOiBpLCB4OiBudW1iZXIoYW0sIGJtKX0pO1xuICAgIH1cbiAgICBiaSA9IHJlQi5sYXN0SW5kZXg7XG4gIH1cblxuICAvLyBBZGQgcmVtYWlucyBvZiBiLlxuICBpZiAoYmkgPCBiLmxlbmd0aCkge1xuICAgIGJzID0gYi5zbGljZShiaSk7XG4gICAgaWYgKHNbaV0pIHNbaV0gKz0gYnM7IC8vIGNvYWxlc2NlIHdpdGggcHJldmlvdXMgc3RyaW5nXG4gICAgZWxzZSBzWysraV0gPSBicztcbiAgfVxuXG4gIC8vIFNwZWNpYWwgb3B0aW1pemF0aW9uIGZvciBvbmx5IGEgc2luZ2xlIG1hdGNoLlxuICAvLyBPdGhlcndpc2UsIGludGVycG9sYXRlIGVhY2ggb2YgdGhlIG51bWJlcnMgYW5kIHJlam9pbiB0aGUgc3RyaW5nLlxuICByZXR1cm4gcy5sZW5ndGggPCAyID8gKHFbMF1cbiAgICAgID8gb25lKHFbMF0ueClcbiAgICAgIDogemVybyhiKSlcbiAgICAgIDogKGIgPSBxLmxlbmd0aCwgZnVuY3Rpb24odCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBvOyBpIDwgYjsgKytpKSBzWyhvID0gcVtpXSkuaV0gPSBvLngodCk7XG4gICAgICAgICAgcmV0dXJuIHMuam9pbihcIlwiKTtcbiAgICAgICAgfSk7XG59XG4iLCAiaW1wb3J0IHtjb2xvcn0gZnJvbSBcImQzLWNvbG9yXCI7XG5pbXBvcnQgcmdiIGZyb20gXCIuL3JnYi5qc1wiO1xuaW1wb3J0IHtnZW5lcmljQXJyYXl9IGZyb20gXCIuL2FycmF5LmpzXCI7XG5pbXBvcnQgZGF0ZSBmcm9tIFwiLi9kYXRlLmpzXCI7XG5pbXBvcnQgbnVtYmVyIGZyb20gXCIuL251bWJlci5qc1wiO1xuaW1wb3J0IG9iamVjdCBmcm9tIFwiLi9vYmplY3QuanNcIjtcbmltcG9ydCBzdHJpbmcgZnJvbSBcIi4vc3RyaW5nLmpzXCI7XG5pbXBvcnQgY29uc3RhbnQgZnJvbSBcIi4vY29uc3RhbnQuanNcIjtcbmltcG9ydCBudW1iZXJBcnJheSwge2lzTnVtYmVyQXJyYXl9IGZyb20gXCIuL251bWJlckFycmF5LmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGEsIGIpIHtcbiAgdmFyIHQgPSB0eXBlb2YgYiwgYztcbiAgcmV0dXJuIGIgPT0gbnVsbCB8fCB0ID09PSBcImJvb2xlYW5cIiA/IGNvbnN0YW50KGIpXG4gICAgICA6ICh0ID09PSBcIm51bWJlclwiID8gbnVtYmVyXG4gICAgICA6IHQgPT09IFwic3RyaW5nXCIgPyAoKGMgPSBjb2xvcihiKSkgPyAoYiA9IGMsIHJnYikgOiBzdHJpbmcpXG4gICAgICA6IGIgaW5zdGFuY2VvZiBjb2xvciA/IHJnYlxuICAgICAgOiBiIGluc3RhbmNlb2YgRGF0ZSA/IGRhdGVcbiAgICAgIDogaXNOdW1iZXJBcnJheShiKSA/IG51bWJlckFycmF5XG4gICAgICA6IEFycmF5LmlzQXJyYXkoYikgPyBnZW5lcmljQXJyYXlcbiAgICAgIDogdHlwZW9mIGIudmFsdWVPZiAhPT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiBiLnRvU3RyaW5nICE9PSBcImZ1bmN0aW9uXCIgfHwgaXNOYU4oYikgPyBvYmplY3RcbiAgICAgIDogbnVtYmVyKShhLCBiKTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihhLCBiKSB7XG4gIHJldHVybiBhID0gK2EsIGIgPSArYiwgZnVuY3Rpb24odCkge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKGEgKiAoMSAtIHQpICsgYiAqIHQpO1xuICB9O1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbnN0YW50cyh4KSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4geDtcbiAgfTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBudW1iZXIoeCkge1xuICByZXR1cm4gK3g7XG59XG4iLCAiaW1wb3J0IHtiaXNlY3R9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IHtpbnRlcnBvbGF0ZSBhcyBpbnRlcnBvbGF0ZVZhbHVlLCBpbnRlcnBvbGF0ZU51bWJlciwgaW50ZXJwb2xhdGVSb3VuZH0gZnJvbSBcImQzLWludGVycG9sYXRlXCI7XG5pbXBvcnQgY29uc3RhbnQgZnJvbSBcIi4vY29uc3RhbnQuanNcIjtcbmltcG9ydCBudW1iZXIgZnJvbSBcIi4vbnVtYmVyLmpzXCI7XG5cbnZhciB1bml0ID0gWzAsIDFdO1xuXG5leHBvcnQgZnVuY3Rpb24gaWRlbnRpdHkoeCkge1xuICByZXR1cm4geDtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplKGEsIGIpIHtcbiAgcmV0dXJuIChiIC09IChhID0gK2EpKVxuICAgICAgPyBmdW5jdGlvbih4KSB7IHJldHVybiAoeCAtIGEpIC8gYjsgfVxuICAgICAgOiBjb25zdGFudChpc05hTihiKSA/IE5hTiA6IDAuNSk7XG59XG5cbmZ1bmN0aW9uIGNsYW1wZXIoYSwgYikge1xuICB2YXIgdDtcbiAgaWYgKGEgPiBiKSB0ID0gYSwgYSA9IGIsIGIgPSB0O1xuICByZXR1cm4gZnVuY3Rpb24oeCkgeyByZXR1cm4gTWF0aC5tYXgoYSwgTWF0aC5taW4oYiwgeCkpOyB9O1xufVxuXG4vLyBub3JtYWxpemUoYSwgYikoeCkgdGFrZXMgYSBkb21haW4gdmFsdWUgeCBpbiBbYSxiXSBhbmQgcmV0dXJucyB0aGUgY29ycmVzcG9uZGluZyBwYXJhbWV0ZXIgdCBpbiBbMCwxXS5cbi8vIGludGVycG9sYXRlKGEsIGIpKHQpIHRha2VzIGEgcGFyYW1ldGVyIHQgaW4gWzAsMV0gYW5kIHJldHVybnMgdGhlIGNvcnJlc3BvbmRpbmcgcmFuZ2UgdmFsdWUgeCBpbiBbYSxiXS5cbmZ1bmN0aW9uIGJpbWFwKGRvbWFpbiwgcmFuZ2UsIGludGVycG9sYXRlKSB7XG4gIHZhciBkMCA9IGRvbWFpblswXSwgZDEgPSBkb21haW5bMV0sIHIwID0gcmFuZ2VbMF0sIHIxID0gcmFuZ2VbMV07XG4gIGlmIChkMSA8IGQwKSBkMCA9IG5vcm1hbGl6ZShkMSwgZDApLCByMCA9IGludGVycG9sYXRlKHIxLCByMCk7XG4gIGVsc2UgZDAgPSBub3JtYWxpemUoZDAsIGQxKSwgcjAgPSBpbnRlcnBvbGF0ZShyMCwgcjEpO1xuICByZXR1cm4gZnVuY3Rpb24oeCkgeyByZXR1cm4gcjAoZDAoeCkpOyB9O1xufVxuXG5mdW5jdGlvbiBwb2x5bWFwKGRvbWFpbiwgcmFuZ2UsIGludGVycG9sYXRlKSB7XG4gIHZhciBqID0gTWF0aC5taW4oZG9tYWluLmxlbmd0aCwgcmFuZ2UubGVuZ3RoKSAtIDEsXG4gICAgICBkID0gbmV3IEFycmF5KGopLFxuICAgICAgciA9IG5ldyBBcnJheShqKSxcbiAgICAgIGkgPSAtMTtcblxuICAvLyBSZXZlcnNlIGRlc2NlbmRpbmcgZG9tYWlucy5cbiAgaWYgKGRvbWFpbltqXSA8IGRvbWFpblswXSkge1xuICAgIGRvbWFpbiA9IGRvbWFpbi5zbGljZSgpLnJldmVyc2UoKTtcbiAgICByYW5nZSA9IHJhbmdlLnNsaWNlKCkucmV2ZXJzZSgpO1xuICB9XG5cbiAgd2hpbGUgKCsraSA8IGopIHtcbiAgICBkW2ldID0gbm9ybWFsaXplKGRvbWFpbltpXSwgZG9tYWluW2kgKyAxXSk7XG4gICAgcltpXSA9IGludGVycG9sYXRlKHJhbmdlW2ldLCByYW5nZVtpICsgMV0pO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgaSA9IGJpc2VjdChkb21haW4sIHgsIDEsIGopIC0gMTtcbiAgICByZXR1cm4gcltpXShkW2ldKHgpKTtcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvcHkoc291cmNlLCB0YXJnZXQpIHtcbiAgcmV0dXJuIHRhcmdldFxuICAgICAgLmRvbWFpbihzb3VyY2UuZG9tYWluKCkpXG4gICAgICAucmFuZ2Uoc291cmNlLnJhbmdlKCkpXG4gICAgICAuaW50ZXJwb2xhdGUoc291cmNlLmludGVycG9sYXRlKCkpXG4gICAgICAuY2xhbXAoc291cmNlLmNsYW1wKCkpXG4gICAgICAudW5rbm93bihzb3VyY2UudW5rbm93bigpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybWVyKCkge1xuICB2YXIgZG9tYWluID0gdW5pdCxcbiAgICAgIHJhbmdlID0gdW5pdCxcbiAgICAgIGludGVycG9sYXRlID0gaW50ZXJwb2xhdGVWYWx1ZSxcbiAgICAgIHRyYW5zZm9ybSxcbiAgICAgIHVudHJhbnNmb3JtLFxuICAgICAgdW5rbm93bixcbiAgICAgIGNsYW1wID0gaWRlbnRpdHksXG4gICAgICBwaWVjZXdpc2UsXG4gICAgICBvdXRwdXQsXG4gICAgICBpbnB1dDtcblxuICBmdW5jdGlvbiByZXNjYWxlKCkge1xuICAgIHZhciBuID0gTWF0aC5taW4oZG9tYWluLmxlbmd0aCwgcmFuZ2UubGVuZ3RoKTtcbiAgICBpZiAoY2xhbXAgIT09IGlkZW50aXR5KSBjbGFtcCA9IGNsYW1wZXIoZG9tYWluWzBdLCBkb21haW5bbiAtIDFdKTtcbiAgICBwaWVjZXdpc2UgPSBuID4gMiA/IHBvbHltYXAgOiBiaW1hcDtcbiAgICBvdXRwdXQgPSBpbnB1dCA9IG51bGw7XG4gICAgcmV0dXJuIHNjYWxlO1xuICB9XG5cbiAgZnVuY3Rpb24gc2NhbGUoeCkge1xuICAgIHJldHVybiB4ID09IG51bGwgfHwgaXNOYU4oeCA9ICt4KSA/IHVua25vd24gOiAob3V0cHV0IHx8IChvdXRwdXQgPSBwaWVjZXdpc2UoZG9tYWluLm1hcCh0cmFuc2Zvcm0pLCByYW5nZSwgaW50ZXJwb2xhdGUpKSkodHJhbnNmb3JtKGNsYW1wKHgpKSk7XG4gIH1cblxuICBzY2FsZS5pbnZlcnQgPSBmdW5jdGlvbih5KSB7XG4gICAgcmV0dXJuIGNsYW1wKHVudHJhbnNmb3JtKChpbnB1dCB8fCAoaW5wdXQgPSBwaWVjZXdpc2UocmFuZ2UsIGRvbWFpbi5tYXAodHJhbnNmb3JtKSwgaW50ZXJwb2xhdGVOdW1iZXIpKSkoeSkpKTtcbiAgfTtcblxuICBzY2FsZS5kb21haW4gPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoZG9tYWluID0gQXJyYXkuZnJvbShfLCBudW1iZXIpLCByZXNjYWxlKCkpIDogZG9tYWluLnNsaWNlKCk7XG4gIH07XG5cbiAgc2NhbGUucmFuZ2UgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAocmFuZ2UgPSBBcnJheS5mcm9tKF8pLCByZXNjYWxlKCkpIDogcmFuZ2Uuc2xpY2UoKTtcbiAgfTtcblxuICBzY2FsZS5yYW5nZVJvdW5kID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiByYW5nZSA9IEFycmF5LmZyb20oXyksIGludGVycG9sYXRlID0gaW50ZXJwb2xhdGVSb3VuZCwgcmVzY2FsZSgpO1xuICB9O1xuXG4gIHNjYWxlLmNsYW1wID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGNsYW1wID0gXyA/IHRydWUgOiBpZGVudGl0eSwgcmVzY2FsZSgpKSA6IGNsYW1wICE9PSBpZGVudGl0eTtcbiAgfTtcblxuICBzY2FsZS5pbnRlcnBvbGF0ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChpbnRlcnBvbGF0ZSA9IF8sIHJlc2NhbGUoKSkgOiBpbnRlcnBvbGF0ZTtcbiAgfTtcblxuICBzY2FsZS51bmtub3duID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHVua25vd24gPSBfLCBzY2FsZSkgOiB1bmtub3duO1xuICB9O1xuXG4gIHJldHVybiBmdW5jdGlvbih0LCB1KSB7XG4gICAgdHJhbnNmb3JtID0gdCwgdW50cmFuc2Zvcm0gPSB1O1xuICAgIHJldHVybiByZXNjYWxlKCk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbnRpbnVvdXMoKSB7XG4gIHJldHVybiB0cmFuc2Zvcm1lcigpKGlkZW50aXR5LCBpZGVudGl0eSk7XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4gTWF0aC5hYnMoeCA9IE1hdGgucm91bmQoeCkpID49IDFlMjFcbiAgICAgID8geC50b0xvY2FsZVN0cmluZyhcImVuXCIpLnJlcGxhY2UoLywvZywgXCJcIilcbiAgICAgIDogeC50b1N0cmluZygxMCk7XG59XG5cbi8vIENvbXB1dGVzIHRoZSBkZWNpbWFsIGNvZWZmaWNpZW50IGFuZCBleHBvbmVudCBvZiB0aGUgc3BlY2lmaWVkIG51bWJlciB4IHdpdGhcbi8vIHNpZ25pZmljYW50IGRpZ2l0cyBwLCB3aGVyZSB4IGlzIHBvc2l0aXZlIGFuZCBwIGlzIGluIFsxLCAyMV0gb3IgdW5kZWZpbmVkLlxuLy8gRm9yIGV4YW1wbGUsIGZvcm1hdERlY2ltYWxQYXJ0cygxLjIzKSByZXR1cm5zIFtcIjEyM1wiLCAwXS5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREZWNpbWFsUGFydHMoeCwgcCkge1xuICBpZiAoIWlzRmluaXRlKHgpIHx8IHggPT09IDApIHJldHVybiBudWxsOyAvLyBOYU4sIFx1MDBCMUluZmluaXR5LCBcdTAwQjEwXG4gIHZhciBpID0gKHggPSBwID8geC50b0V4cG9uZW50aWFsKHAgLSAxKSA6IHgudG9FeHBvbmVudGlhbCgpKS5pbmRleE9mKFwiZVwiKSwgY29lZmZpY2llbnQgPSB4LnNsaWNlKDAsIGkpO1xuXG4gIC8vIFRoZSBzdHJpbmcgcmV0dXJuZWQgYnkgdG9FeHBvbmVudGlhbCBlaXRoZXIgaGFzIHRoZSBmb3JtIFxcZFxcLlxcZCtlWy0rXVxcZCtcbiAgLy8gKGUuZy4sIDEuMmUrMykgb3IgdGhlIGZvcm0gXFxkZVstK11cXGQrIChlLmcuLCAxZSszKS5cbiAgcmV0dXJuIFtcbiAgICBjb2VmZmljaWVudC5sZW5ndGggPiAxID8gY29lZmZpY2llbnRbMF0gKyBjb2VmZmljaWVudC5zbGljZSgyKSA6IGNvZWZmaWNpZW50LFxuICAgICt4LnNsaWNlKGkgKyAxKVxuICBdO1xufVxuIiwgImltcG9ydCB7Zm9ybWF0RGVjaW1hbFBhcnRzfSBmcm9tIFwiLi9mb3JtYXREZWNpbWFsLmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHggPSBmb3JtYXREZWNpbWFsUGFydHMoTWF0aC5hYnMoeCkpLCB4ID8geFsxXSA6IE5hTjtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihncm91cGluZywgdGhvdXNhbmRzKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSwgd2lkdGgpIHtcbiAgICB2YXIgaSA9IHZhbHVlLmxlbmd0aCxcbiAgICAgICAgdCA9IFtdLFxuICAgICAgICBqID0gMCxcbiAgICAgICAgZyA9IGdyb3VwaW5nWzBdLFxuICAgICAgICBsZW5ndGggPSAwO1xuXG4gICAgd2hpbGUgKGkgPiAwICYmIGcgPiAwKSB7XG4gICAgICBpZiAobGVuZ3RoICsgZyArIDEgPiB3aWR0aCkgZyA9IE1hdGgubWF4KDEsIHdpZHRoIC0gbGVuZ3RoKTtcbiAgICAgIHQucHVzaCh2YWx1ZS5zdWJzdHJpbmcoaSAtPSBnLCBpICsgZykpO1xuICAgICAgaWYgKChsZW5ndGggKz0gZyArIDEpID4gd2lkdGgpIGJyZWFrO1xuICAgICAgZyA9IGdyb3VwaW5nW2ogPSAoaiArIDEpICUgZ3JvdXBpbmcubGVuZ3RoXTtcbiAgICB9XG5cbiAgICByZXR1cm4gdC5yZXZlcnNlKCkuam9pbih0aG91c2FuZHMpO1xuICB9O1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG51bWVyYWxzKSB7XG4gIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9bMC05XS9nLCBmdW5jdGlvbihpKSB7XG4gICAgICByZXR1cm4gbnVtZXJhbHNbK2ldO1xuICAgIH0pO1xuICB9O1xufVxuIiwgIi8vIFtbZmlsbF1hbGlnbl1bc2lnbl1bc3ltYm9sXVswXVt3aWR0aF1bLF1bLnByZWNpc2lvbl1bfl1bdHlwZV1cbnZhciByZSA9IC9eKD86KC4pPyhbPD49Xl0pKT8oWytcXC0oIF0pPyhbJCNdKT8oMCk/KFxcZCspPygsKT8oXFwuXFxkKyk/KH4pPyhbYS16JV0pPyQvaTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllcikge1xuICBpZiAoIShtYXRjaCA9IHJlLmV4ZWMoc3BlY2lmaWVyKSkpIHRocm93IG5ldyBFcnJvcihcImludmFsaWQgZm9ybWF0OiBcIiArIHNwZWNpZmllcik7XG4gIHZhciBtYXRjaDtcbiAgcmV0dXJuIG5ldyBGb3JtYXRTcGVjaWZpZXIoe1xuICAgIGZpbGw6IG1hdGNoWzFdLFxuICAgIGFsaWduOiBtYXRjaFsyXSxcbiAgICBzaWduOiBtYXRjaFszXSxcbiAgICBzeW1ib2w6IG1hdGNoWzRdLFxuICAgIHplcm86IG1hdGNoWzVdLFxuICAgIHdpZHRoOiBtYXRjaFs2XSxcbiAgICBjb21tYTogbWF0Y2hbN10sXG4gICAgcHJlY2lzaW9uOiBtYXRjaFs4XSAmJiBtYXRjaFs4XS5zbGljZSgxKSxcbiAgICB0cmltOiBtYXRjaFs5XSxcbiAgICB0eXBlOiBtYXRjaFsxMF1cbiAgfSk7XG59XG5cbmZvcm1hdFNwZWNpZmllci5wcm90b3R5cGUgPSBGb3JtYXRTcGVjaWZpZXIucHJvdG90eXBlOyAvLyBpbnN0YW5jZW9mXG5cbmV4cG9ydCBmdW5jdGlvbiBGb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyKSB7XG4gIHRoaXMuZmlsbCA9IHNwZWNpZmllci5maWxsID09PSB1bmRlZmluZWQgPyBcIiBcIiA6IHNwZWNpZmllci5maWxsICsgXCJcIjtcbiAgdGhpcy5hbGlnbiA9IHNwZWNpZmllci5hbGlnbiA9PT0gdW5kZWZpbmVkID8gXCI+XCIgOiBzcGVjaWZpZXIuYWxpZ24gKyBcIlwiO1xuICB0aGlzLnNpZ24gPSBzcGVjaWZpZXIuc2lnbiA9PT0gdW5kZWZpbmVkID8gXCItXCIgOiBzcGVjaWZpZXIuc2lnbiArIFwiXCI7XG4gIHRoaXMuc3ltYm9sID0gc3BlY2lmaWVyLnN5bWJvbCA9PT0gdW5kZWZpbmVkID8gXCJcIiA6IHNwZWNpZmllci5zeW1ib2wgKyBcIlwiO1xuICB0aGlzLnplcm8gPSAhIXNwZWNpZmllci56ZXJvO1xuICB0aGlzLndpZHRoID0gc3BlY2lmaWVyLndpZHRoID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiArc3BlY2lmaWVyLndpZHRoO1xuICB0aGlzLmNvbW1hID0gISFzcGVjaWZpZXIuY29tbWE7XG4gIHRoaXMucHJlY2lzaW9uID0gc3BlY2lmaWVyLnByZWNpc2lvbiA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkIDogK3NwZWNpZmllci5wcmVjaXNpb247XG4gIHRoaXMudHJpbSA9ICEhc3BlY2lmaWVyLnRyaW07XG4gIHRoaXMudHlwZSA9IHNwZWNpZmllci50eXBlID09PSB1bmRlZmluZWQgPyBcIlwiIDogc3BlY2lmaWVyLnR5cGUgKyBcIlwiO1xufVxuXG5Gb3JtYXRTcGVjaWZpZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmZpbGxcbiAgICAgICsgdGhpcy5hbGlnblxuICAgICAgKyB0aGlzLnNpZ25cbiAgICAgICsgdGhpcy5zeW1ib2xcbiAgICAgICsgKHRoaXMuemVybyA/IFwiMFwiIDogXCJcIilcbiAgICAgICsgKHRoaXMud2lkdGggPT09IHVuZGVmaW5lZCA/IFwiXCIgOiBNYXRoLm1heCgxLCB0aGlzLndpZHRoIHwgMCkpXG4gICAgICArICh0aGlzLmNvbW1hID8gXCIsXCIgOiBcIlwiKVxuICAgICAgKyAodGhpcy5wcmVjaXNpb24gPT09IHVuZGVmaW5lZCA/IFwiXCIgOiBcIi5cIiArIE1hdGgubWF4KDAsIHRoaXMucHJlY2lzaW9uIHwgMCkpXG4gICAgICArICh0aGlzLnRyaW0gPyBcIn5cIiA6IFwiXCIpXG4gICAgICArIHRoaXMudHlwZTtcbn07XG4iLCAiLy8gVHJpbXMgaW5zaWduaWZpY2FudCB6ZXJvcywgZS5nLiwgcmVwbGFjZXMgMS4yMDAwayB3aXRoIDEuMmsuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzKSB7XG4gIG91dDogZm9yICh2YXIgbiA9IHMubGVuZ3RoLCBpID0gMSwgaTAgPSAtMSwgaTE7IGkgPCBuOyArK2kpIHtcbiAgICBzd2l0Y2ggKHNbaV0pIHtcbiAgICAgIGNhc2UgXCIuXCI6IGkwID0gaTEgPSBpOyBicmVhaztcbiAgICAgIGNhc2UgXCIwXCI6IGlmIChpMCA9PT0gMCkgaTAgPSBpOyBpMSA9IGk7IGJyZWFrO1xuICAgICAgZGVmYXVsdDogaWYgKCErc1tpXSkgYnJlYWsgb3V0OyBpZiAoaTAgPiAwKSBpMCA9IDA7IGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gaTAgPiAwID8gcy5zbGljZSgwLCBpMCkgKyBzLnNsaWNlKGkxICsgMSkgOiBzO1xufVxuIiwgImltcG9ydCB7Zm9ybWF0RGVjaW1hbFBhcnRzfSBmcm9tIFwiLi9mb3JtYXREZWNpbWFsLmpzXCI7XG5cbmV4cG9ydCB2YXIgcHJlZml4RXhwb25lbnQ7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgsIHApIHtcbiAgdmFyIGQgPSBmb3JtYXREZWNpbWFsUGFydHMoeCwgcCk7XG4gIGlmICghZCkgcmV0dXJuIHByZWZpeEV4cG9uZW50ID0gdW5kZWZpbmVkLCB4LnRvUHJlY2lzaW9uKHApO1xuICB2YXIgY29lZmZpY2llbnQgPSBkWzBdLFxuICAgICAgZXhwb25lbnQgPSBkWzFdLFxuICAgICAgaSA9IGV4cG9uZW50IC0gKHByZWZpeEV4cG9uZW50ID0gTWF0aC5tYXgoLTgsIE1hdGgubWluKDgsIE1hdGguZmxvb3IoZXhwb25lbnQgLyAzKSkpICogMykgKyAxLFxuICAgICAgbiA9IGNvZWZmaWNpZW50Lmxlbmd0aDtcbiAgcmV0dXJuIGkgPT09IG4gPyBjb2VmZmljaWVudFxuICAgICAgOiBpID4gbiA/IGNvZWZmaWNpZW50ICsgbmV3IEFycmF5KGkgLSBuICsgMSkuam9pbihcIjBcIilcbiAgICAgIDogaSA+IDAgPyBjb2VmZmljaWVudC5zbGljZSgwLCBpKSArIFwiLlwiICsgY29lZmZpY2llbnQuc2xpY2UoaSlcbiAgICAgIDogXCIwLlwiICsgbmV3IEFycmF5KDEgLSBpKS5qb2luKFwiMFwiKSArIGZvcm1hdERlY2ltYWxQYXJ0cyh4LCBNYXRoLm1heCgwLCBwICsgaSAtIDEpKVswXTsgLy8gbGVzcyB0aGFuIDF5IVxufVxuIiwgImltcG9ydCB7Zm9ybWF0RGVjaW1hbFBhcnRzfSBmcm9tIFwiLi9mb3JtYXREZWNpbWFsLmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgsIHApIHtcbiAgdmFyIGQgPSBmb3JtYXREZWNpbWFsUGFydHMoeCwgcCk7XG4gIGlmICghZCkgcmV0dXJuIHggKyBcIlwiO1xuICB2YXIgY29lZmZpY2llbnQgPSBkWzBdLFxuICAgICAgZXhwb25lbnQgPSBkWzFdO1xuICByZXR1cm4gZXhwb25lbnQgPCAwID8gXCIwLlwiICsgbmV3IEFycmF5KC1leHBvbmVudCkuam9pbihcIjBcIikgKyBjb2VmZmljaWVudFxuICAgICAgOiBjb2VmZmljaWVudC5sZW5ndGggPiBleHBvbmVudCArIDEgPyBjb2VmZmljaWVudC5zbGljZSgwLCBleHBvbmVudCArIDEpICsgXCIuXCIgKyBjb2VmZmljaWVudC5zbGljZShleHBvbmVudCArIDEpXG4gICAgICA6IGNvZWZmaWNpZW50ICsgbmV3IEFycmF5KGV4cG9uZW50IC0gY29lZmZpY2llbnQubGVuZ3RoICsgMikuam9pbihcIjBcIik7XG59XG4iLCAiaW1wb3J0IGZvcm1hdERlY2ltYWwgZnJvbSBcIi4vZm9ybWF0RGVjaW1hbC5qc1wiO1xuaW1wb3J0IGZvcm1hdFByZWZpeEF1dG8gZnJvbSBcIi4vZm9ybWF0UHJlZml4QXV0by5qc1wiO1xuaW1wb3J0IGZvcm1hdFJvdW5kZWQgZnJvbSBcIi4vZm9ybWF0Um91bmRlZC5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIFwiJVwiOiAoeCwgcCkgPT4gKHggKiAxMDApLnRvRml4ZWQocCksXG4gIFwiYlwiOiAoeCkgPT4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygyKSxcbiAgXCJjXCI6ICh4KSA9PiB4ICsgXCJcIixcbiAgXCJkXCI6IGZvcm1hdERlY2ltYWwsXG4gIFwiZVwiOiAoeCwgcCkgPT4geC50b0V4cG9uZW50aWFsKHApLFxuICBcImZcIjogKHgsIHApID0+IHgudG9GaXhlZChwKSxcbiAgXCJnXCI6ICh4LCBwKSA9PiB4LnRvUHJlY2lzaW9uKHApLFxuICBcIm9cIjogKHgpID0+IE1hdGgucm91bmQoeCkudG9TdHJpbmcoOCksXG4gIFwicFwiOiAoeCwgcCkgPT4gZm9ybWF0Um91bmRlZCh4ICogMTAwLCBwKSxcbiAgXCJyXCI6IGZvcm1hdFJvdW5kZWQsXG4gIFwic1wiOiBmb3JtYXRQcmVmaXhBdXRvLFxuICBcIlhcIjogKHgpID0+IE1hdGgucm91bmQoeCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCksXG4gIFwieFwiOiAoeCkgPT4gTWF0aC5yb3VuZCh4KS50b1N0cmluZygxNilcbn07XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4geDtcbn1cbiIsICJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnQuanNcIjtcbmltcG9ydCBmb3JtYXRHcm91cCBmcm9tIFwiLi9mb3JtYXRHcm91cC5qc1wiO1xuaW1wb3J0IGZvcm1hdE51bWVyYWxzIGZyb20gXCIuL2Zvcm1hdE51bWVyYWxzLmpzXCI7XG5pbXBvcnQgZm9ybWF0U3BlY2lmaWVyIGZyb20gXCIuL2Zvcm1hdFNwZWNpZmllci5qc1wiO1xuaW1wb3J0IGZvcm1hdFRyaW0gZnJvbSBcIi4vZm9ybWF0VHJpbS5qc1wiO1xuaW1wb3J0IGZvcm1hdFR5cGVzIGZyb20gXCIuL2Zvcm1hdFR5cGVzLmpzXCI7XG5pbXBvcnQge3ByZWZpeEV4cG9uZW50fSBmcm9tIFwiLi9mb3JtYXRQcmVmaXhBdXRvLmpzXCI7XG5pbXBvcnQgaWRlbnRpdHkgZnJvbSBcIi4vaWRlbnRpdHkuanNcIjtcblxudmFyIG1hcCA9IEFycmF5LnByb3RvdHlwZS5tYXAsXG4gICAgcHJlZml4ZXMgPSBbXCJ5XCIsXCJ6XCIsXCJhXCIsXCJmXCIsXCJwXCIsXCJuXCIsXCJcdTAwQjVcIixcIm1cIixcIlwiLFwia1wiLFwiTVwiLFwiR1wiLFwiVFwiLFwiUFwiLFwiRVwiLFwiWlwiLFwiWVwiXTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obG9jYWxlKSB7XG4gIHZhciBncm91cCA9IGxvY2FsZS5ncm91cGluZyA9PT0gdW5kZWZpbmVkIHx8IGxvY2FsZS50aG91c2FuZHMgPT09IHVuZGVmaW5lZCA/IGlkZW50aXR5IDogZm9ybWF0R3JvdXAobWFwLmNhbGwobG9jYWxlLmdyb3VwaW5nLCBOdW1iZXIpLCBsb2NhbGUudGhvdXNhbmRzICsgXCJcIiksXG4gICAgICBjdXJyZW5jeVByZWZpeCA9IGxvY2FsZS5jdXJyZW5jeSA9PT0gdW5kZWZpbmVkID8gXCJcIiA6IGxvY2FsZS5jdXJyZW5jeVswXSArIFwiXCIsXG4gICAgICBjdXJyZW5jeVN1ZmZpeCA9IGxvY2FsZS5jdXJyZW5jeSA9PT0gdW5kZWZpbmVkID8gXCJcIiA6IGxvY2FsZS5jdXJyZW5jeVsxXSArIFwiXCIsXG4gICAgICBkZWNpbWFsID0gbG9jYWxlLmRlY2ltYWwgPT09IHVuZGVmaW5lZCA/IFwiLlwiIDogbG9jYWxlLmRlY2ltYWwgKyBcIlwiLFxuICAgICAgbnVtZXJhbHMgPSBsb2NhbGUubnVtZXJhbHMgPT09IHVuZGVmaW5lZCA/IGlkZW50aXR5IDogZm9ybWF0TnVtZXJhbHMobWFwLmNhbGwobG9jYWxlLm51bWVyYWxzLCBTdHJpbmcpKSxcbiAgICAgIHBlcmNlbnQgPSBsb2NhbGUucGVyY2VudCA9PT0gdW5kZWZpbmVkID8gXCIlXCIgOiBsb2NhbGUucGVyY2VudCArIFwiXCIsXG4gICAgICBtaW51cyA9IGxvY2FsZS5taW51cyA9PT0gdW5kZWZpbmVkID8gXCJcdTIyMTJcIiA6IGxvY2FsZS5taW51cyArIFwiXCIsXG4gICAgICBuYW4gPSBsb2NhbGUubmFuID09PSB1bmRlZmluZWQgPyBcIk5hTlwiIDogbG9jYWxlLm5hbiArIFwiXCI7XG5cbiAgZnVuY3Rpb24gbmV3Rm9ybWF0KHNwZWNpZmllciwgb3B0aW9ucykge1xuICAgIHNwZWNpZmllciA9IGZvcm1hdFNwZWNpZmllcihzcGVjaWZpZXIpO1xuXG4gICAgdmFyIGZpbGwgPSBzcGVjaWZpZXIuZmlsbCxcbiAgICAgICAgYWxpZ24gPSBzcGVjaWZpZXIuYWxpZ24sXG4gICAgICAgIHNpZ24gPSBzcGVjaWZpZXIuc2lnbixcbiAgICAgICAgc3ltYm9sID0gc3BlY2lmaWVyLnN5bWJvbCxcbiAgICAgICAgemVybyA9IHNwZWNpZmllci56ZXJvLFxuICAgICAgICB3aWR0aCA9IHNwZWNpZmllci53aWR0aCxcbiAgICAgICAgY29tbWEgPSBzcGVjaWZpZXIuY29tbWEsXG4gICAgICAgIHByZWNpc2lvbiA9IHNwZWNpZmllci5wcmVjaXNpb24sXG4gICAgICAgIHRyaW0gPSBzcGVjaWZpZXIudHJpbSxcbiAgICAgICAgdHlwZSA9IHNwZWNpZmllci50eXBlO1xuXG4gICAgLy8gVGhlIFwiblwiIHR5cGUgaXMgYW4gYWxpYXMgZm9yIFwiLGdcIi5cbiAgICBpZiAodHlwZSA9PT0gXCJuXCIpIGNvbW1hID0gdHJ1ZSwgdHlwZSA9IFwiZ1wiO1xuXG4gICAgLy8gVGhlIFwiXCIgdHlwZSwgYW5kIGFueSBpbnZhbGlkIHR5cGUsIGlzIGFuIGFsaWFzIGZvciBcIi4xMn5nXCIuXG4gICAgZWxzZSBpZiAoIWZvcm1hdFR5cGVzW3R5cGVdKSBwcmVjaXNpb24gPT09IHVuZGVmaW5lZCAmJiAocHJlY2lzaW9uID0gMTIpLCB0cmltID0gdHJ1ZSwgdHlwZSA9IFwiZ1wiO1xuXG4gICAgLy8gSWYgemVybyBmaWxsIGlzIHNwZWNpZmllZCwgcGFkZGluZyBnb2VzIGFmdGVyIHNpZ24gYW5kIGJlZm9yZSBkaWdpdHMuXG4gICAgaWYgKHplcm8gfHwgKGZpbGwgPT09IFwiMFwiICYmIGFsaWduID09PSBcIj1cIikpIHplcm8gPSB0cnVlLCBmaWxsID0gXCIwXCIsIGFsaWduID0gXCI9XCI7XG5cbiAgICAvLyBDb21wdXRlIHRoZSBwcmVmaXggYW5kIHN1ZmZpeC5cbiAgICAvLyBGb3IgU0ktcHJlZml4LCB0aGUgc3VmZml4IGlzIGxhemlseSBjb21wdXRlZC5cbiAgICB2YXIgcHJlZml4ID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5wcmVmaXggIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMucHJlZml4IDogXCJcIikgKyAoc3ltYm9sID09PSBcIiRcIiA/IGN1cnJlbmN5UHJlZml4IDogc3ltYm9sID09PSBcIiNcIiAmJiAvW2JveFhdLy50ZXN0KHR5cGUpID8gXCIwXCIgKyB0eXBlLnRvTG93ZXJDYXNlKCkgOiBcIlwiKSxcbiAgICAgICAgc3VmZml4ID0gKHN5bWJvbCA9PT0gXCIkXCIgPyBjdXJyZW5jeVN1ZmZpeCA6IC9bJXBdLy50ZXN0KHR5cGUpID8gcGVyY2VudCA6IFwiXCIpICsgKG9wdGlvbnMgJiYgb3B0aW9ucy5zdWZmaXggIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuc3VmZml4IDogXCJcIik7XG5cbiAgICAvLyBXaGF0IGZvcm1hdCBmdW5jdGlvbiBzaG91bGQgd2UgdXNlP1xuICAgIC8vIElzIHRoaXMgYW4gaW50ZWdlciB0eXBlP1xuICAgIC8vIENhbiB0aGlzIHR5cGUgZ2VuZXJhdGUgZXhwb25lbnRpYWwgbm90YXRpb24/XG4gICAgdmFyIGZvcm1hdFR5cGUgPSBmb3JtYXRUeXBlc1t0eXBlXSxcbiAgICAgICAgbWF5YmVTdWZmaXggPSAvW2RlZmdwcnMlXS8udGVzdCh0eXBlKTtcblxuICAgIC8vIFNldCB0aGUgZGVmYXVsdCBwcmVjaXNpb24gaWYgbm90IHNwZWNpZmllZCxcbiAgICAvLyBvciBjbGFtcCB0aGUgc3BlY2lmaWVkIHByZWNpc2lvbiB0byB0aGUgc3VwcG9ydGVkIHJhbmdlLlxuICAgIC8vIEZvciBzaWduaWZpY2FudCBwcmVjaXNpb24sIGl0IG11c3QgYmUgaW4gWzEsIDIxXS5cbiAgICAvLyBGb3IgZml4ZWQgcHJlY2lzaW9uLCBpdCBtdXN0IGJlIGluIFswLCAyMF0uXG4gICAgcHJlY2lzaW9uID0gcHJlY2lzaW9uID09PSB1bmRlZmluZWQgPyA2XG4gICAgICAgIDogL1tncHJzXS8udGVzdCh0eXBlKSA/IE1hdGgubWF4KDEsIE1hdGgubWluKDIxLCBwcmVjaXNpb24pKVxuICAgICAgICA6IE1hdGgubWF4KDAsIE1hdGgubWluKDIwLCBwcmVjaXNpb24pKTtcblxuICAgIGZ1bmN0aW9uIGZvcm1hdCh2YWx1ZSkge1xuICAgICAgdmFyIHZhbHVlUHJlZml4ID0gcHJlZml4LFxuICAgICAgICAgIHZhbHVlU3VmZml4ID0gc3VmZml4LFxuICAgICAgICAgIGksIG4sIGM7XG5cbiAgICAgIGlmICh0eXBlID09PSBcImNcIikge1xuICAgICAgICB2YWx1ZVN1ZmZpeCA9IGZvcm1hdFR5cGUodmFsdWUpICsgdmFsdWVTdWZmaXg7XG4gICAgICAgIHZhbHVlID0gXCJcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gK3ZhbHVlO1xuXG4gICAgICAgIC8vIERldGVybWluZSB0aGUgc2lnbi4gLTAgaXMgbm90IGxlc3MgdGhhbiAwLCBidXQgMSAvIC0wIGlzIVxuICAgICAgICB2YXIgdmFsdWVOZWdhdGl2ZSA9IHZhbHVlIDwgMCB8fCAxIC8gdmFsdWUgPCAwO1xuXG4gICAgICAgIC8vIFBlcmZvcm0gdGhlIGluaXRpYWwgZm9ybWF0dGluZy5cbiAgICAgICAgdmFsdWUgPSBpc05hTih2YWx1ZSkgPyBuYW4gOiBmb3JtYXRUeXBlKE1hdGguYWJzKHZhbHVlKSwgcHJlY2lzaW9uKTtcblxuICAgICAgICAvLyBUcmltIGluc2lnbmlmaWNhbnQgemVyb3MuXG4gICAgICAgIGlmICh0cmltKSB2YWx1ZSA9IGZvcm1hdFRyaW0odmFsdWUpO1xuXG4gICAgICAgIC8vIElmIGEgbmVnYXRpdmUgdmFsdWUgcm91bmRzIHRvIHplcm8gYWZ0ZXIgZm9ybWF0dGluZywgYW5kIG5vIGV4cGxpY2l0IHBvc2l0aXZlIHNpZ24gaXMgcmVxdWVzdGVkLCBoaWRlIHRoZSBzaWduLlxuICAgICAgICBpZiAodmFsdWVOZWdhdGl2ZSAmJiArdmFsdWUgPT09IDAgJiYgc2lnbiAhPT0gXCIrXCIpIHZhbHVlTmVnYXRpdmUgPSBmYWxzZTtcblxuICAgICAgICAvLyBDb21wdXRlIHRoZSBwcmVmaXggYW5kIHN1ZmZpeC5cbiAgICAgICAgdmFsdWVQcmVmaXggPSAodmFsdWVOZWdhdGl2ZSA/IChzaWduID09PSBcIihcIiA/IHNpZ24gOiBtaW51cykgOiBzaWduID09PSBcIi1cIiB8fCBzaWduID09PSBcIihcIiA/IFwiXCIgOiBzaWduKSArIHZhbHVlUHJlZml4O1xuICAgICAgICB2YWx1ZVN1ZmZpeCA9ICh0eXBlID09PSBcInNcIiAmJiAhaXNOYU4odmFsdWUpICYmIHByZWZpeEV4cG9uZW50ICE9PSB1bmRlZmluZWQgPyBwcmVmaXhlc1s4ICsgcHJlZml4RXhwb25lbnQgLyAzXSA6IFwiXCIpICsgdmFsdWVTdWZmaXggKyAodmFsdWVOZWdhdGl2ZSAmJiBzaWduID09PSBcIihcIiA/IFwiKVwiIDogXCJcIik7XG5cbiAgICAgICAgLy8gQnJlYWsgdGhlIGZvcm1hdHRlZCB2YWx1ZSBpbnRvIHRoZSBpbnRlZ2VyIFx1MjAxQ3ZhbHVlXHUyMDFEIHBhcnQgdGhhdCBjYW4gYmVcbiAgICAgICAgLy8gZ3JvdXBlZCwgYW5kIGZyYWN0aW9uYWwgb3IgZXhwb25lbnRpYWwgXHUyMDFDc3VmZml4XHUyMDFEIHBhcnQgdGhhdCBpcyBub3QuXG4gICAgICAgIGlmIChtYXliZVN1ZmZpeCkge1xuICAgICAgICAgIGkgPSAtMSwgbiA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICB3aGlsZSAoKytpIDwgbikge1xuICAgICAgICAgICAgaWYgKGMgPSB2YWx1ZS5jaGFyQ29kZUF0KGkpLCA0OCA+IGMgfHwgYyA+IDU3KSB7XG4gICAgICAgICAgICAgIHZhbHVlU3VmZml4ID0gKGMgPT09IDQ2ID8gZGVjaW1hbCArIHZhbHVlLnNsaWNlKGkgKyAxKSA6IHZhbHVlLnNsaWNlKGkpKSArIHZhbHVlU3VmZml4O1xuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLnNsaWNlKDAsIGkpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gSWYgdGhlIGZpbGwgY2hhcmFjdGVyIGlzIG5vdCBcIjBcIiwgZ3JvdXBpbmcgaXMgYXBwbGllZCBiZWZvcmUgcGFkZGluZy5cbiAgICAgIGlmIChjb21tYSAmJiAhemVybykgdmFsdWUgPSBncm91cCh2YWx1ZSwgSW5maW5pdHkpO1xuXG4gICAgICAvLyBDb21wdXRlIHRoZSBwYWRkaW5nLlxuICAgICAgdmFyIGxlbmd0aCA9IHZhbHVlUHJlZml4Lmxlbmd0aCArIHZhbHVlLmxlbmd0aCArIHZhbHVlU3VmZml4Lmxlbmd0aCxcbiAgICAgICAgICBwYWRkaW5nID0gbGVuZ3RoIDwgd2lkdGggPyBuZXcgQXJyYXkod2lkdGggLSBsZW5ndGggKyAxKS5qb2luKGZpbGwpIDogXCJcIjtcblxuICAgICAgLy8gSWYgdGhlIGZpbGwgY2hhcmFjdGVyIGlzIFwiMFwiLCBncm91cGluZyBpcyBhcHBsaWVkIGFmdGVyIHBhZGRpbmcuXG4gICAgICBpZiAoY29tbWEgJiYgemVybykgdmFsdWUgPSBncm91cChwYWRkaW5nICsgdmFsdWUsIHBhZGRpbmcubGVuZ3RoID8gd2lkdGggLSB2YWx1ZVN1ZmZpeC5sZW5ndGggOiBJbmZpbml0eSksIHBhZGRpbmcgPSBcIlwiO1xuXG4gICAgICAvLyBSZWNvbnN0cnVjdCB0aGUgZmluYWwgb3V0cHV0IGJhc2VkIG9uIHRoZSBkZXNpcmVkIGFsaWdubWVudC5cbiAgICAgIHN3aXRjaCAoYWxpZ24pIHtcbiAgICAgICAgY2FzZSBcIjxcIjogdmFsdWUgPSB2YWx1ZVByZWZpeCArIHZhbHVlICsgdmFsdWVTdWZmaXggKyBwYWRkaW5nOyBicmVhaztcbiAgICAgICAgY2FzZSBcIj1cIjogdmFsdWUgPSB2YWx1ZVByZWZpeCArIHBhZGRpbmcgKyB2YWx1ZSArIHZhbHVlU3VmZml4OyBicmVhaztcbiAgICAgICAgY2FzZSBcIl5cIjogdmFsdWUgPSBwYWRkaW5nLnNsaWNlKDAsIGxlbmd0aCA9IHBhZGRpbmcubGVuZ3RoID4+IDEpICsgdmFsdWVQcmVmaXggKyB2YWx1ZSArIHZhbHVlU3VmZml4ICsgcGFkZGluZy5zbGljZShsZW5ndGgpOyBicmVhaztcbiAgICAgICAgZGVmYXVsdDogdmFsdWUgPSBwYWRkaW5nICsgdmFsdWVQcmVmaXggKyB2YWx1ZSArIHZhbHVlU3VmZml4OyBicmVhaztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG51bWVyYWxzKHZhbHVlKTtcbiAgICB9XG5cbiAgICBmb3JtYXQudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBzcGVjaWZpZXIgKyBcIlwiO1xuICAgIH07XG5cbiAgICByZXR1cm4gZm9ybWF0O1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0UHJlZml4KHNwZWNpZmllciwgdmFsdWUpIHtcbiAgICB2YXIgZSA9IE1hdGgubWF4KC04LCBNYXRoLm1pbig4LCBNYXRoLmZsb29yKGV4cG9uZW50KHZhbHVlKSAvIDMpKSkgKiAzLFxuICAgICAgICBrID0gTWF0aC5wb3coMTAsIC1lKSxcbiAgICAgICAgZiA9IG5ld0Zvcm1hdCgoc3BlY2lmaWVyID0gZm9ybWF0U3BlY2lmaWVyKHNwZWNpZmllciksIHNwZWNpZmllci50eXBlID0gXCJmXCIsIHNwZWNpZmllciksIHtzdWZmaXg6IHByZWZpeGVzWzggKyBlIC8gM119KTtcbiAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiBmKGsgKiB2YWx1ZSk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZm9ybWF0OiBuZXdGb3JtYXQsXG4gICAgZm9ybWF0UHJlZml4OiBmb3JtYXRQcmVmaXhcbiAgfTtcbn1cbiIsICJpbXBvcnQgZm9ybWF0TG9jYWxlIGZyb20gXCIuL2xvY2FsZS5qc1wiO1xuXG52YXIgbG9jYWxlO1xuZXhwb3J0IHZhciBmb3JtYXQ7XG5leHBvcnQgdmFyIGZvcm1hdFByZWZpeDtcblxuZGVmYXVsdExvY2FsZSh7XG4gIHRob3VzYW5kczogXCIsXCIsXG4gIGdyb3VwaW5nOiBbM10sXG4gIGN1cnJlbmN5OiBbXCIkXCIsIFwiXCJdXG59KTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZGVmYXVsdExvY2FsZShkZWZpbml0aW9uKSB7XG4gIGxvY2FsZSA9IGZvcm1hdExvY2FsZShkZWZpbml0aW9uKTtcbiAgZm9ybWF0ID0gbG9jYWxlLmZvcm1hdDtcbiAgZm9ybWF0UHJlZml4ID0gbG9jYWxlLmZvcm1hdFByZWZpeDtcbiAgcmV0dXJuIGxvY2FsZTtcbn1cbiIsICJpbXBvcnQgZXhwb25lbnQgZnJvbSBcIi4vZXhwb25lbnQuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc3RlcCkge1xuICByZXR1cm4gTWF0aC5tYXgoMCwgLWV4cG9uZW50KE1hdGguYWJzKHN0ZXApKSk7XG59XG4iLCAiaW1wb3J0IGV4cG9uZW50IGZyb20gXCIuL2V4cG9uZW50LmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0ZXAsIHZhbHVlKSB7XG4gIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1heCgtOCwgTWF0aC5taW4oOCwgTWF0aC5mbG9vcihleHBvbmVudCh2YWx1ZSkgLyAzKSkpICogMyAtIGV4cG9uZW50KE1hdGguYWJzKHN0ZXApKSk7XG59XG4iLCAiaW1wb3J0IGV4cG9uZW50IGZyb20gXCIuL2V4cG9uZW50LmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHN0ZXAsIG1heCkge1xuICBzdGVwID0gTWF0aC5hYnMoc3RlcCksIG1heCA9IE1hdGguYWJzKG1heCkgLSBzdGVwO1xuICByZXR1cm4gTWF0aC5tYXgoMCwgZXhwb25lbnQobWF4KSAtIGV4cG9uZW50KHN0ZXApKSArIDE7XG59XG4iLCAiaW1wb3J0IHt0aWNrU3RlcH0gZnJvbSBcImQzLWFycmF5XCI7XG5pbXBvcnQge2Zvcm1hdCwgZm9ybWF0UHJlZml4LCBmb3JtYXRTcGVjaWZpZXIsIHByZWNpc2lvbkZpeGVkLCBwcmVjaXNpb25QcmVmaXgsIHByZWNpc2lvblJvdW5kfSBmcm9tIFwiZDMtZm9ybWF0XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHRpY2tGb3JtYXQoc3RhcnQsIHN0b3AsIGNvdW50LCBzcGVjaWZpZXIpIHtcbiAgdmFyIHN0ZXAgPSB0aWNrU3RlcChzdGFydCwgc3RvcCwgY291bnQpLFxuICAgICAgcHJlY2lzaW9uO1xuICBzcGVjaWZpZXIgPSBmb3JtYXRTcGVjaWZpZXIoc3BlY2lmaWVyID09IG51bGwgPyBcIixmXCIgOiBzcGVjaWZpZXIpO1xuICBzd2l0Y2ggKHNwZWNpZmllci50eXBlKSB7XG4gICAgY2FzZSBcInNcIjoge1xuICAgICAgdmFyIHZhbHVlID0gTWF0aC5tYXgoTWF0aC5hYnMoc3RhcnQpLCBNYXRoLmFicyhzdG9wKSk7XG4gICAgICBpZiAoc3BlY2lmaWVyLnByZWNpc2lvbiA9PSBudWxsICYmICFpc05hTihwcmVjaXNpb24gPSBwcmVjaXNpb25QcmVmaXgoc3RlcCwgdmFsdWUpKSkgc3BlY2lmaWVyLnByZWNpc2lvbiA9IHByZWNpc2lvbjtcbiAgICAgIHJldHVybiBmb3JtYXRQcmVmaXgoc3BlY2lmaWVyLCB2YWx1ZSk7XG4gICAgfVxuICAgIGNhc2UgXCJcIjpcbiAgICBjYXNlIFwiZVwiOlxuICAgIGNhc2UgXCJnXCI6XG4gICAgY2FzZSBcInBcIjpcbiAgICBjYXNlIFwiclwiOiB7XG4gICAgICBpZiAoc3BlY2lmaWVyLnByZWNpc2lvbiA9PSBudWxsICYmICFpc05hTihwcmVjaXNpb24gPSBwcmVjaXNpb25Sb3VuZChzdGVwLCBNYXRoLm1heChNYXRoLmFicyhzdGFydCksIE1hdGguYWJzKHN0b3ApKSkpKSBzcGVjaWZpZXIucHJlY2lzaW9uID0gcHJlY2lzaW9uIC0gKHNwZWNpZmllci50eXBlID09PSBcImVcIik7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2FzZSBcImZcIjpcbiAgICBjYXNlIFwiJVwiOiB7XG4gICAgICBpZiAoc3BlY2lmaWVyLnByZWNpc2lvbiA9PSBudWxsICYmICFpc05hTihwcmVjaXNpb24gPSBwcmVjaXNpb25GaXhlZChzdGVwKSkpIHNwZWNpZmllci5wcmVjaXNpb24gPSBwcmVjaXNpb24gLSAoc3BlY2lmaWVyLnR5cGUgPT09IFwiJVwiKSAqIDI7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZvcm1hdChzcGVjaWZpZXIpO1xufVxuIiwgImltcG9ydCB7dGlja3MsIHRpY2tJbmNyZW1lbnR9IGZyb20gXCJkMy1hcnJheVwiO1xuaW1wb3J0IGNvbnRpbnVvdXMsIHtjb3B5fSBmcm9tIFwiLi9jb250aW51b3VzLmpzXCI7XG5pbXBvcnQge2luaXRSYW5nZX0gZnJvbSBcIi4vaW5pdC5qc1wiO1xuaW1wb3J0IHRpY2tGb3JtYXQgZnJvbSBcIi4vdGlja0Zvcm1hdC5qc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gbGluZWFyaXNoKHNjYWxlKSB7XG4gIHZhciBkb21haW4gPSBzY2FsZS5kb21haW47XG5cbiAgc2NhbGUudGlja3MgPSBmdW5jdGlvbihjb3VudCkge1xuICAgIHZhciBkID0gZG9tYWluKCk7XG4gICAgcmV0dXJuIHRpY2tzKGRbMF0sIGRbZC5sZW5ndGggLSAxXSwgY291bnQgPT0gbnVsbCA/IDEwIDogY291bnQpO1xuICB9O1xuXG4gIHNjYWxlLnRpY2tGb3JtYXQgPSBmdW5jdGlvbihjb3VudCwgc3BlY2lmaWVyKSB7XG4gICAgdmFyIGQgPSBkb21haW4oKTtcbiAgICByZXR1cm4gdGlja0Zvcm1hdChkWzBdLCBkW2QubGVuZ3RoIC0gMV0sIGNvdW50ID09IG51bGwgPyAxMCA6IGNvdW50LCBzcGVjaWZpZXIpO1xuICB9O1xuXG4gIHNjYWxlLm5pY2UgPSBmdW5jdGlvbihjb3VudCkge1xuICAgIGlmIChjb3VudCA9PSBudWxsKSBjb3VudCA9IDEwO1xuXG4gICAgdmFyIGQgPSBkb21haW4oKTtcbiAgICB2YXIgaTAgPSAwO1xuICAgIHZhciBpMSA9IGQubGVuZ3RoIC0gMTtcbiAgICB2YXIgc3RhcnQgPSBkW2kwXTtcbiAgICB2YXIgc3RvcCA9IGRbaTFdO1xuICAgIHZhciBwcmVzdGVwO1xuICAgIHZhciBzdGVwO1xuICAgIHZhciBtYXhJdGVyID0gMTA7XG5cbiAgICBpZiAoc3RvcCA8IHN0YXJ0KSB7XG4gICAgICBzdGVwID0gc3RhcnQsIHN0YXJ0ID0gc3RvcCwgc3RvcCA9IHN0ZXA7XG4gICAgICBzdGVwID0gaTAsIGkwID0gaTEsIGkxID0gc3RlcDtcbiAgICB9XG4gICAgXG4gICAgd2hpbGUgKG1heEl0ZXItLSA+IDApIHtcbiAgICAgIHN0ZXAgPSB0aWNrSW5jcmVtZW50KHN0YXJ0LCBzdG9wLCBjb3VudCk7XG4gICAgICBpZiAoc3RlcCA9PT0gcHJlc3RlcCkge1xuICAgICAgICBkW2kwXSA9IHN0YXJ0XG4gICAgICAgIGRbaTFdID0gc3RvcFxuICAgICAgICByZXR1cm4gZG9tYWluKGQpO1xuICAgICAgfSBlbHNlIGlmIChzdGVwID4gMCkge1xuICAgICAgICBzdGFydCA9IE1hdGguZmxvb3Ioc3RhcnQgLyBzdGVwKSAqIHN0ZXA7XG4gICAgICAgIHN0b3AgPSBNYXRoLmNlaWwoc3RvcCAvIHN0ZXApICogc3RlcDtcbiAgICAgIH0gZWxzZSBpZiAoc3RlcCA8IDApIHtcbiAgICAgICAgc3RhcnQgPSBNYXRoLmNlaWwoc3RhcnQgKiBzdGVwKSAvIHN0ZXA7XG4gICAgICAgIHN0b3AgPSBNYXRoLmZsb29yKHN0b3AgKiBzdGVwKSAvIHN0ZXA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHByZXN0ZXAgPSBzdGVwO1xuICAgIH1cblxuICAgIHJldHVybiBzY2FsZTtcbiAgfTtcblxuICByZXR1cm4gc2NhbGU7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGxpbmVhcigpIHtcbiAgdmFyIHNjYWxlID0gY29udGludW91cygpO1xuXG4gIHNjYWxlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY29weShzY2FsZSwgbGluZWFyKCkpO1xuICB9O1xuXG4gIGluaXRSYW5nZS5hcHBseShzY2FsZSwgYXJndW1lbnRzKTtcblxuICByZXR1cm4gbGluZWFyaXNoKHNjYWxlKTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBuaWNlKGRvbWFpbiwgaW50ZXJ2YWwpIHtcbiAgZG9tYWluID0gZG9tYWluLnNsaWNlKCk7XG5cbiAgdmFyIGkwID0gMCxcbiAgICAgIGkxID0gZG9tYWluLmxlbmd0aCAtIDEsXG4gICAgICB4MCA9IGRvbWFpbltpMF0sXG4gICAgICB4MSA9IGRvbWFpbltpMV0sXG4gICAgICB0O1xuXG4gIGlmICh4MSA8IHgwKSB7XG4gICAgdCA9IGkwLCBpMCA9IGkxLCBpMSA9IHQ7XG4gICAgdCA9IHgwLCB4MCA9IHgxLCB4MSA9IHQ7XG4gIH1cblxuICBkb21haW5baTBdID0gaW50ZXJ2YWwuZmxvb3IoeDApO1xuICBkb21haW5baTFdID0gaW50ZXJ2YWwuY2VpbCh4MSk7XG4gIHJldHVybiBkb21haW47XG59XG4iLCAiY29uc3QgdDAgPSBuZXcgRGF0ZSwgdDEgPSBuZXcgRGF0ZTtcblxuZXhwb3J0IGZ1bmN0aW9uIHRpbWVJbnRlcnZhbChmbG9vcmksIG9mZnNldGksIGNvdW50LCBmaWVsZCkge1xuXG4gIGZ1bmN0aW9uIGludGVydmFsKGRhdGUpIHtcbiAgICByZXR1cm4gZmxvb3JpKGRhdGUgPSBhcmd1bWVudHMubGVuZ3RoID09PSAwID8gbmV3IERhdGUgOiBuZXcgRGF0ZSgrZGF0ZSkpLCBkYXRlO1xuICB9XG5cbiAgaW50ZXJ2YWwuZmxvb3IgPSAoZGF0ZSkgPT4ge1xuICAgIHJldHVybiBmbG9vcmkoZGF0ZSA9IG5ldyBEYXRlKCtkYXRlKSksIGRhdGU7XG4gIH07XG5cbiAgaW50ZXJ2YWwuY2VpbCA9IChkYXRlKSA9PiB7XG4gICAgcmV0dXJuIGZsb29yaShkYXRlID0gbmV3IERhdGUoZGF0ZSAtIDEpKSwgb2Zmc2V0aShkYXRlLCAxKSwgZmxvb3JpKGRhdGUpLCBkYXRlO1xuICB9O1xuXG4gIGludGVydmFsLnJvdW5kID0gKGRhdGUpID0+IHtcbiAgICBjb25zdCBkMCA9IGludGVydmFsKGRhdGUpLCBkMSA9IGludGVydmFsLmNlaWwoZGF0ZSk7XG4gICAgcmV0dXJuIGRhdGUgLSBkMCA8IGQxIC0gZGF0ZSA/IGQwIDogZDE7XG4gIH07XG5cbiAgaW50ZXJ2YWwub2Zmc2V0ID0gKGRhdGUsIHN0ZXApID0+IHtcbiAgICByZXR1cm4gb2Zmc2V0aShkYXRlID0gbmV3IERhdGUoK2RhdGUpLCBzdGVwID09IG51bGwgPyAxIDogTWF0aC5mbG9vcihzdGVwKSksIGRhdGU7XG4gIH07XG5cbiAgaW50ZXJ2YWwucmFuZ2UgPSAoc3RhcnQsIHN0b3AsIHN0ZXApID0+IHtcbiAgICBjb25zdCByYW5nZSA9IFtdO1xuICAgIHN0YXJ0ID0gaW50ZXJ2YWwuY2VpbChzdGFydCk7XG4gICAgc3RlcCA9IHN0ZXAgPT0gbnVsbCA/IDEgOiBNYXRoLmZsb29yKHN0ZXApO1xuICAgIGlmICghKHN0YXJ0IDwgc3RvcCkgfHwgIShzdGVwID4gMCkpIHJldHVybiByYW5nZTsgLy8gYWxzbyBoYW5kbGVzIEludmFsaWQgRGF0ZVxuICAgIGxldCBwcmV2aW91cztcbiAgICBkbyByYW5nZS5wdXNoKHByZXZpb3VzID0gbmV3IERhdGUoK3N0YXJ0KSksIG9mZnNldGkoc3RhcnQsIHN0ZXApLCBmbG9vcmkoc3RhcnQpO1xuICAgIHdoaWxlIChwcmV2aW91cyA8IHN0YXJ0ICYmIHN0YXJ0IDwgc3RvcCk7XG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIGludGVydmFsLmZpbHRlciA9ICh0ZXN0KSA9PiB7XG4gICAgcmV0dXJuIHRpbWVJbnRlcnZhbCgoZGF0ZSkgPT4ge1xuICAgICAgaWYgKGRhdGUgPj0gZGF0ZSkgd2hpbGUgKGZsb29yaShkYXRlKSwgIXRlc3QoZGF0ZSkpIGRhdGUuc2V0VGltZShkYXRlIC0gMSk7XG4gICAgfSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgICAgIGlmIChkYXRlID49IGRhdGUpIHtcbiAgICAgICAgaWYgKHN0ZXAgPCAwKSB3aGlsZSAoKytzdGVwIDw9IDApIHtcbiAgICAgICAgICB3aGlsZSAob2Zmc2V0aShkYXRlLCAtMSksICF0ZXN0KGRhdGUpKSB7fSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWVtcHR5XG4gICAgICAgIH0gZWxzZSB3aGlsZSAoLS1zdGVwID49IDApIHtcbiAgICAgICAgICB3aGlsZSAob2Zmc2V0aShkYXRlLCArMSksICF0ZXN0KGRhdGUpKSB7fSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWVtcHR5XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBpZiAoY291bnQpIHtcbiAgICBpbnRlcnZhbC5jb3VudCA9IChzdGFydCwgZW5kKSA9PiB7XG4gICAgICB0MC5zZXRUaW1lKCtzdGFydCksIHQxLnNldFRpbWUoK2VuZCk7XG4gICAgICBmbG9vcmkodDApLCBmbG9vcmkodDEpO1xuICAgICAgcmV0dXJuIE1hdGguZmxvb3IoY291bnQodDAsIHQxKSk7XG4gICAgfTtcblxuICAgIGludGVydmFsLmV2ZXJ5ID0gKHN0ZXApID0+IHtcbiAgICAgIHN0ZXAgPSBNYXRoLmZsb29yKHN0ZXApO1xuICAgICAgcmV0dXJuICFpc0Zpbml0ZShzdGVwKSB8fCAhKHN0ZXAgPiAwKSA/IG51bGxcbiAgICAgICAgICA6ICEoc3RlcCA+IDEpID8gaW50ZXJ2YWxcbiAgICAgICAgICA6IGludGVydmFsLmZpbHRlcihmaWVsZFxuICAgICAgICAgICAgICA/IChkKSA9PiBmaWVsZChkKSAlIHN0ZXAgPT09IDBcbiAgICAgICAgICAgICAgOiAoZCkgPT4gaW50ZXJ2YWwuY291bnQoMCwgZCkgJSBzdGVwID09PSAwKTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGludGVydmFsO1xufVxuIiwgImltcG9ydCB7dGltZUludGVydmFsfSBmcm9tIFwiLi9pbnRlcnZhbC5qc1wiO1xuXG5leHBvcnQgY29uc3QgbWlsbGlzZWNvbmQgPSB0aW1lSW50ZXJ2YWwoKCkgPT4ge1xuICAvLyBub29wXG59LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwKTtcbn0sIChzdGFydCwgZW5kKSA9PiB7XG4gIHJldHVybiBlbmQgLSBzdGFydDtcbn0pO1xuXG4vLyBBbiBvcHRpbWl6ZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgc2ltcGxlIGNhc2UuXG5taWxsaXNlY29uZC5ldmVyeSA9IChrKSA9PiB7XG4gIGsgPSBNYXRoLmZsb29yKGspO1xuICBpZiAoIWlzRmluaXRlKGspIHx8ICEoayA+IDApKSByZXR1cm4gbnVsbDtcbiAgaWYgKCEoayA+IDEpKSByZXR1cm4gbWlsbGlzZWNvbmQ7XG4gIHJldHVybiB0aW1lSW50ZXJ2YWwoKGRhdGUpID0+IHtcbiAgICBkYXRlLnNldFRpbWUoTWF0aC5mbG9vcihkYXRlIC8gaykgKiBrKTtcbiAgfSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogayk7XG4gIH0sIChzdGFydCwgZW5kKSA9PiB7XG4gICAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBrO1xuICB9KTtcbn07XG5cbmV4cG9ydCBjb25zdCBtaWxsaXNlY29uZHMgPSBtaWxsaXNlY29uZC5yYW5nZTtcbiIsICJleHBvcnQgY29uc3QgZHVyYXRpb25TZWNvbmQgPSAxMDAwO1xuZXhwb3J0IGNvbnN0IGR1cmF0aW9uTWludXRlID0gZHVyYXRpb25TZWNvbmQgKiA2MDtcbmV4cG9ydCBjb25zdCBkdXJhdGlvbkhvdXIgPSBkdXJhdGlvbk1pbnV0ZSAqIDYwO1xuZXhwb3J0IGNvbnN0IGR1cmF0aW9uRGF5ID0gZHVyYXRpb25Ib3VyICogMjQ7XG5leHBvcnQgY29uc3QgZHVyYXRpb25XZWVrID0gZHVyYXRpb25EYXkgKiA3O1xuZXhwb3J0IGNvbnN0IGR1cmF0aW9uTW9udGggPSBkdXJhdGlvbkRheSAqIDMwO1xuZXhwb3J0IGNvbnN0IGR1cmF0aW9uWWVhciA9IGR1cmF0aW9uRGF5ICogMzY1O1xuIiwgImltcG9ydCB7dGltZUludGVydmFsfSBmcm9tIFwiLi9pbnRlcnZhbC5qc1wiO1xuaW1wb3J0IHtkdXJhdGlvblNlY29uZH0gZnJvbSBcIi4vZHVyYXRpb24uanNcIjtcblxuZXhwb3J0IGNvbnN0IHNlY29uZCA9IHRpbWVJbnRlcnZhbCgoZGF0ZSkgPT4ge1xuICBkYXRlLnNldFRpbWUoZGF0ZSAtIGRhdGUuZ2V0TWlsbGlzZWNvbmRzKCkpO1xufSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uU2Vjb25kKTtcbn0sIChzdGFydCwgZW5kKSA9PiB7XG4gIHJldHVybiAoZW5kIC0gc3RhcnQpIC8gZHVyYXRpb25TZWNvbmQ7XG59LCAoZGF0ZSkgPT4ge1xuICByZXR1cm4gZGF0ZS5nZXRVVENTZWNvbmRzKCk7XG59KTtcblxuZXhwb3J0IGNvbnN0IHNlY29uZHMgPSBzZWNvbmQucmFuZ2U7XG4iLCAiaW1wb3J0IHt0aW1lSW50ZXJ2YWx9IGZyb20gXCIuL2ludGVydmFsLmpzXCI7XG5pbXBvcnQge2R1cmF0aW9uTWludXRlLCBkdXJhdGlvblNlY29uZH0gZnJvbSBcIi4vZHVyYXRpb24uanNcIjtcblxuZXhwb3J0IGNvbnN0IHRpbWVNaW51dGUgPSB0aW1lSW50ZXJ2YWwoKGRhdGUpID0+IHtcbiAgZGF0ZS5zZXRUaW1lKGRhdGUgLSBkYXRlLmdldE1pbGxpc2Vjb25kcygpIC0gZGF0ZS5nZXRTZWNvbmRzKCkgKiBkdXJhdGlvblNlY29uZCk7XG59LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICBkYXRlLnNldFRpbWUoK2RhdGUgKyBzdGVwICogZHVyYXRpb25NaW51dGUpO1xufSwgKHN0YXJ0LCBlbmQpID0+IHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbk1pbnV0ZTtcbn0sIChkYXRlKSA9PiB7XG4gIHJldHVybiBkYXRlLmdldE1pbnV0ZXMoKTtcbn0pO1xuXG5leHBvcnQgY29uc3QgdGltZU1pbnV0ZXMgPSB0aW1lTWludXRlLnJhbmdlO1xuXG5leHBvcnQgY29uc3QgdXRjTWludXRlID0gdGltZUludGVydmFsKChkYXRlKSA9PiB7XG4gIGRhdGUuc2V0VVRDU2Vjb25kcygwLCAwKTtcbn0sIChkYXRlLCBzdGVwKSA9PiB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvbk1pbnV0ZSk7XG59LCAoc3RhcnQsIGVuZCkgPT4ge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uTWludXRlO1xufSwgKGRhdGUpID0+IHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDTWludXRlcygpO1xufSk7XG5cbmV4cG9ydCBjb25zdCB1dGNNaW51dGVzID0gdXRjTWludXRlLnJhbmdlO1xuIiwgImltcG9ydCB7dGltZUludGVydmFsfSBmcm9tIFwiLi9pbnRlcnZhbC5qc1wiO1xuaW1wb3J0IHtkdXJhdGlvbkhvdXIsIGR1cmF0aW9uTWludXRlLCBkdXJhdGlvblNlY29uZH0gZnJvbSBcIi4vZHVyYXRpb24uanNcIjtcblxuZXhwb3J0IGNvbnN0IHRpbWVIb3VyID0gdGltZUludGVydmFsKChkYXRlKSA9PiB7XG4gIGRhdGUuc2V0VGltZShkYXRlIC0gZGF0ZS5nZXRNaWxsaXNlY29uZHMoKSAtIGRhdGUuZ2V0U2Vjb25kcygpICogZHVyYXRpb25TZWNvbmQgLSBkYXRlLmdldE1pbnV0ZXMoKSAqIGR1cmF0aW9uTWludXRlKTtcbn0sIChkYXRlLCBzdGVwKSA9PiB7XG4gIGRhdGUuc2V0VGltZSgrZGF0ZSArIHN0ZXAgKiBkdXJhdGlvbkhvdXIpO1xufSwgKHN0YXJ0LCBlbmQpID0+IHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbkhvdXI7XG59LCAoZGF0ZSkgPT4ge1xuICByZXR1cm4gZGF0ZS5nZXRIb3VycygpO1xufSk7XG5cbmV4cG9ydCBjb25zdCB0aW1lSG91cnMgPSB0aW1lSG91ci5yYW5nZTtcblxuZXhwb3J0IGNvbnN0IHV0Y0hvdXIgPSB0aW1lSW50ZXJ2YWwoKGRhdGUpID0+IHtcbiAgZGF0ZS5zZXRVVENNaW51dGVzKDAsIDAsIDApO1xufSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgZGF0ZS5zZXRUaW1lKCtkYXRlICsgc3RlcCAqIGR1cmF0aW9uSG91cik7XG59LCAoc3RhcnQsIGVuZCkgPT4ge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uSG91cjtcbn0sIChkYXRlKSA9PiB7XG4gIHJldHVybiBkYXRlLmdldFVUQ0hvdXJzKCk7XG59KTtcblxuZXhwb3J0IGNvbnN0IHV0Y0hvdXJzID0gdXRjSG91ci5yYW5nZTtcbiIsICJpbXBvcnQge3RpbWVJbnRlcnZhbH0gZnJvbSBcIi4vaW50ZXJ2YWwuanNcIjtcbmltcG9ydCB7ZHVyYXRpb25EYXksIGR1cmF0aW9uTWludXRlfSBmcm9tIFwiLi9kdXJhdGlvbi5qc1wiO1xuXG5leHBvcnQgY29uc3QgdGltZURheSA9IHRpbWVJbnRlcnZhbChcbiAgZGF0ZSA9PiBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApLFxuICAoZGF0ZSwgc3RlcCkgPT4gZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpICsgc3RlcCksXG4gIChzdGFydCwgZW5kKSA9PiAoZW5kIC0gc3RhcnQgLSAoZW5kLmdldFRpbWV6b25lT2Zmc2V0KCkgLSBzdGFydC5nZXRUaW1lem9uZU9mZnNldCgpKSAqIGR1cmF0aW9uTWludXRlKSAvIGR1cmF0aW9uRGF5LFxuICBkYXRlID0+IGRhdGUuZ2V0RGF0ZSgpIC0gMVxuKTtcblxuZXhwb3J0IGNvbnN0IHRpbWVEYXlzID0gdGltZURheS5yYW5nZTtcblxuZXhwb3J0IGNvbnN0IHV0Y0RheSA9IHRpbWVJbnRlcnZhbCgoZGF0ZSkgPT4ge1xuICBkYXRlLnNldFVUQ0hvdXJzKDAsIDAsIDAsIDApO1xufSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgZGF0ZS5zZXRVVENEYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpICsgc3RlcCk7XG59LCAoc3RhcnQsIGVuZCkgPT4ge1xuICByZXR1cm4gKGVuZCAtIHN0YXJ0KSAvIGR1cmF0aW9uRGF5O1xufSwgKGRhdGUpID0+IHtcbiAgcmV0dXJuIGRhdGUuZ2V0VVRDRGF0ZSgpIC0gMTtcbn0pO1xuXG5leHBvcnQgY29uc3QgdXRjRGF5cyA9IHV0Y0RheS5yYW5nZTtcblxuZXhwb3J0IGNvbnN0IHVuaXhEYXkgPSB0aW1lSW50ZXJ2YWwoKGRhdGUpID0+IHtcbiAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbn0sIChkYXRlLCBzdGVwKSA9PiB7XG4gIGRhdGUuc2V0VVRDRGF0ZShkYXRlLmdldFVUQ0RhdGUoKSArIHN0ZXApO1xufSwgKHN0YXJ0LCBlbmQpID0+IHtcbiAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbkRheTtcbn0sIChkYXRlKSA9PiB7XG4gIHJldHVybiBNYXRoLmZsb29yKGRhdGUgLyBkdXJhdGlvbkRheSk7XG59KTtcblxuZXhwb3J0IGNvbnN0IHVuaXhEYXlzID0gdW5peERheS5yYW5nZTtcbiIsICJpbXBvcnQge3RpbWVJbnRlcnZhbH0gZnJvbSBcIi4vaW50ZXJ2YWwuanNcIjtcbmltcG9ydCB7ZHVyYXRpb25NaW51dGUsIGR1cmF0aW9uV2Vla30gZnJvbSBcIi4vZHVyYXRpb24uanNcIjtcblxuZnVuY3Rpb24gdGltZVdlZWtkYXkoaSkge1xuICByZXR1cm4gdGltZUludGVydmFsKChkYXRlKSA9PiB7XG4gICAgZGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpIC0gKGRhdGUuZ2V0RGF5KCkgKyA3IC0gaSkgJSA3KTtcbiAgICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICB9LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICAgIGRhdGUuc2V0RGF0ZShkYXRlLmdldERhdGUoKSArIHN0ZXAgKiA3KTtcbiAgfSwgKHN0YXJ0LCBlbmQpID0+IHtcbiAgICByZXR1cm4gKGVuZCAtIHN0YXJ0IC0gKGVuZC5nZXRUaW1lem9uZU9mZnNldCgpIC0gc3RhcnQuZ2V0VGltZXpvbmVPZmZzZXQoKSkgKiBkdXJhdGlvbk1pbnV0ZSkgLyBkdXJhdGlvbldlZWs7XG4gIH0pO1xufVxuXG5leHBvcnQgY29uc3QgdGltZVN1bmRheSA9IHRpbWVXZWVrZGF5KDApO1xuZXhwb3J0IGNvbnN0IHRpbWVNb25kYXkgPSB0aW1lV2Vla2RheSgxKTtcbmV4cG9ydCBjb25zdCB0aW1lVHVlc2RheSA9IHRpbWVXZWVrZGF5KDIpO1xuZXhwb3J0IGNvbnN0IHRpbWVXZWRuZXNkYXkgPSB0aW1lV2Vla2RheSgzKTtcbmV4cG9ydCBjb25zdCB0aW1lVGh1cnNkYXkgPSB0aW1lV2Vla2RheSg0KTtcbmV4cG9ydCBjb25zdCB0aW1lRnJpZGF5ID0gdGltZVdlZWtkYXkoNSk7XG5leHBvcnQgY29uc3QgdGltZVNhdHVyZGF5ID0gdGltZVdlZWtkYXkoNik7XG5cbmV4cG9ydCBjb25zdCB0aW1lU3VuZGF5cyA9IHRpbWVTdW5kYXkucmFuZ2U7XG5leHBvcnQgY29uc3QgdGltZU1vbmRheXMgPSB0aW1lTW9uZGF5LnJhbmdlO1xuZXhwb3J0IGNvbnN0IHRpbWVUdWVzZGF5cyA9IHRpbWVUdWVzZGF5LnJhbmdlO1xuZXhwb3J0IGNvbnN0IHRpbWVXZWRuZXNkYXlzID0gdGltZVdlZG5lc2RheS5yYW5nZTtcbmV4cG9ydCBjb25zdCB0aW1lVGh1cnNkYXlzID0gdGltZVRodXJzZGF5LnJhbmdlO1xuZXhwb3J0IGNvbnN0IHRpbWVGcmlkYXlzID0gdGltZUZyaWRheS5yYW5nZTtcbmV4cG9ydCBjb25zdCB0aW1lU2F0dXJkYXlzID0gdGltZVNhdHVyZGF5LnJhbmdlO1xuXG5mdW5jdGlvbiB1dGNXZWVrZGF5KGkpIHtcbiAgcmV0dXJuIHRpbWVJbnRlcnZhbCgoZGF0ZSkgPT4ge1xuICAgIGRhdGUuc2V0VVRDRGF0ZShkYXRlLmdldFVUQ0RhdGUoKSAtIChkYXRlLmdldFVUQ0RheSgpICsgNyAtIGkpICUgNyk7XG4gICAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbiAgfSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgICBkYXRlLnNldFVUQ0RhdGUoZGF0ZS5nZXRVVENEYXRlKCkgKyBzdGVwICogNyk7XG4gIH0sIChzdGFydCwgZW5kKSA9PiB7XG4gICAgcmV0dXJuIChlbmQgLSBzdGFydCkgLyBkdXJhdGlvbldlZWs7XG4gIH0pO1xufVxuXG5leHBvcnQgY29uc3QgdXRjU3VuZGF5ID0gdXRjV2Vla2RheSgwKTtcbmV4cG9ydCBjb25zdCB1dGNNb25kYXkgPSB1dGNXZWVrZGF5KDEpO1xuZXhwb3J0IGNvbnN0IHV0Y1R1ZXNkYXkgPSB1dGNXZWVrZGF5KDIpO1xuZXhwb3J0IGNvbnN0IHV0Y1dlZG5lc2RheSA9IHV0Y1dlZWtkYXkoMyk7XG5leHBvcnQgY29uc3QgdXRjVGh1cnNkYXkgPSB1dGNXZWVrZGF5KDQpO1xuZXhwb3J0IGNvbnN0IHV0Y0ZyaWRheSA9IHV0Y1dlZWtkYXkoNSk7XG5leHBvcnQgY29uc3QgdXRjU2F0dXJkYXkgPSB1dGNXZWVrZGF5KDYpO1xuXG5leHBvcnQgY29uc3QgdXRjU3VuZGF5cyA9IHV0Y1N1bmRheS5yYW5nZTtcbmV4cG9ydCBjb25zdCB1dGNNb25kYXlzID0gdXRjTW9uZGF5LnJhbmdlO1xuZXhwb3J0IGNvbnN0IHV0Y1R1ZXNkYXlzID0gdXRjVHVlc2RheS5yYW5nZTtcbmV4cG9ydCBjb25zdCB1dGNXZWRuZXNkYXlzID0gdXRjV2VkbmVzZGF5LnJhbmdlO1xuZXhwb3J0IGNvbnN0IHV0Y1RodXJzZGF5cyA9IHV0Y1RodXJzZGF5LnJhbmdlO1xuZXhwb3J0IGNvbnN0IHV0Y0ZyaWRheXMgPSB1dGNGcmlkYXkucmFuZ2U7XG5leHBvcnQgY29uc3QgdXRjU2F0dXJkYXlzID0gdXRjU2F0dXJkYXkucmFuZ2U7XG4iLCAiaW1wb3J0IHt0aW1lSW50ZXJ2YWx9IGZyb20gXCIuL2ludGVydmFsLmpzXCI7XG5cbmV4cG9ydCBjb25zdCB0aW1lTW9udGggPSB0aW1lSW50ZXJ2YWwoKGRhdGUpID0+IHtcbiAgZGF0ZS5zZXREYXRlKDEpO1xuICBkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApO1xufSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgZGF0ZS5zZXRNb250aChkYXRlLmdldE1vbnRoKCkgKyBzdGVwKTtcbn0sIChzdGFydCwgZW5kKSA9PiB7XG4gIHJldHVybiBlbmQuZ2V0TW9udGgoKSAtIHN0YXJ0LmdldE1vbnRoKCkgKyAoZW5kLmdldEZ1bGxZZWFyKCkgLSBzdGFydC5nZXRGdWxsWWVhcigpKSAqIDEyO1xufSwgKGRhdGUpID0+IHtcbiAgcmV0dXJuIGRhdGUuZ2V0TW9udGgoKTtcbn0pO1xuXG5leHBvcnQgY29uc3QgdGltZU1vbnRocyA9IHRpbWVNb250aC5yYW5nZTtcblxuZXhwb3J0IGNvbnN0IHV0Y01vbnRoID0gdGltZUludGVydmFsKChkYXRlKSA9PiB7XG4gIGRhdGUuc2V0VVRDRGF0ZSgxKTtcbiAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbn0sIChkYXRlLCBzdGVwKSA9PiB7XG4gIGRhdGUuc2V0VVRDTW9udGgoZGF0ZS5nZXRVVENNb250aCgpICsgc3RlcCk7XG59LCAoc3RhcnQsIGVuZCkgPT4ge1xuICByZXR1cm4gZW5kLmdldFVUQ01vbnRoKCkgLSBzdGFydC5nZXRVVENNb250aCgpICsgKGVuZC5nZXRVVENGdWxsWWVhcigpIC0gc3RhcnQuZ2V0VVRDRnVsbFllYXIoKSkgKiAxMjtcbn0sIChkYXRlKSA9PiB7XG4gIHJldHVybiBkYXRlLmdldFVUQ01vbnRoKCk7XG59KTtcblxuZXhwb3J0IGNvbnN0IHV0Y01vbnRocyA9IHV0Y01vbnRoLnJhbmdlO1xuIiwgImltcG9ydCB7dGltZUludGVydmFsfSBmcm9tIFwiLi9pbnRlcnZhbC5qc1wiO1xuXG5leHBvcnQgY29uc3QgdGltZVllYXIgPSB0aW1lSW50ZXJ2YWwoKGRhdGUpID0+IHtcbiAgZGF0ZS5zZXRNb250aCgwLCAxKTtcbiAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbn0sIChkYXRlLCBzdGVwKSA9PiB7XG4gIGRhdGUuc2V0RnVsbFllYXIoZGF0ZS5nZXRGdWxsWWVhcigpICsgc3RlcCk7XG59LCAoc3RhcnQsIGVuZCkgPT4ge1xuICByZXR1cm4gZW5kLmdldEZ1bGxZZWFyKCkgLSBzdGFydC5nZXRGdWxsWWVhcigpO1xufSwgKGRhdGUpID0+IHtcbiAgcmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKTtcbn0pO1xuXG4vLyBBbiBvcHRpbWl6ZWQgaW1wbGVtZW50YXRpb24gZm9yIHRoaXMgc2ltcGxlIGNhc2UuXG50aW1lWWVhci5ldmVyeSA9IChrKSA9PiB7XG4gIHJldHVybiAhaXNGaW5pdGUoayA9IE1hdGguZmxvb3IoaykpIHx8ICEoayA+IDApID8gbnVsbCA6IHRpbWVJbnRlcnZhbCgoZGF0ZSkgPT4ge1xuICAgIGRhdGUuc2V0RnVsbFllYXIoTWF0aC5mbG9vcihkYXRlLmdldEZ1bGxZZWFyKCkgLyBrKSAqIGspO1xuICAgIGRhdGUuc2V0TW9udGgoMCwgMSk7XG4gICAgZGF0ZS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbiAgfSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgICBkYXRlLnNldEZ1bGxZZWFyKGRhdGUuZ2V0RnVsbFllYXIoKSArIHN0ZXAgKiBrKTtcbiAgfSk7XG59O1xuXG5leHBvcnQgY29uc3QgdGltZVllYXJzID0gdGltZVllYXIucmFuZ2U7XG5cbmV4cG9ydCBjb25zdCB1dGNZZWFyID0gdGltZUludGVydmFsKChkYXRlKSA9PiB7XG4gIGRhdGUuc2V0VVRDTW9udGgoMCwgMSk7XG4gIGRhdGUuc2V0VVRDSG91cnMoMCwgMCwgMCwgMCk7XG59LCAoZGF0ZSwgc3RlcCkgPT4ge1xuICBkYXRlLnNldFVUQ0Z1bGxZZWFyKGRhdGUuZ2V0VVRDRnVsbFllYXIoKSArIHN0ZXApO1xufSwgKHN0YXJ0LCBlbmQpID0+IHtcbiAgcmV0dXJuIGVuZC5nZXRVVENGdWxsWWVhcigpIC0gc3RhcnQuZ2V0VVRDRnVsbFllYXIoKTtcbn0sIChkYXRlKSA9PiB7XG4gIHJldHVybiBkYXRlLmdldFVUQ0Z1bGxZZWFyKCk7XG59KTtcblxuLy8gQW4gb3B0aW1pemVkIGltcGxlbWVudGF0aW9uIGZvciB0aGlzIHNpbXBsZSBjYXNlLlxudXRjWWVhci5ldmVyeSA9IChrKSA9PiB7XG4gIHJldHVybiAhaXNGaW5pdGUoayA9IE1hdGguZmxvb3IoaykpIHx8ICEoayA+IDApID8gbnVsbCA6IHRpbWVJbnRlcnZhbCgoZGF0ZSkgPT4ge1xuICAgIGRhdGUuc2V0VVRDRnVsbFllYXIoTWF0aC5mbG9vcihkYXRlLmdldFVUQ0Z1bGxZZWFyKCkgLyBrKSAqIGspO1xuICAgIGRhdGUuc2V0VVRDTW9udGgoMCwgMSk7XG4gICAgZGF0ZS5zZXRVVENIb3VycygwLCAwLCAwLCAwKTtcbiAgfSwgKGRhdGUsIHN0ZXApID0+IHtcbiAgICBkYXRlLnNldFVUQ0Z1bGxZZWFyKGRhdGUuZ2V0VVRDRnVsbFllYXIoKSArIHN0ZXAgKiBrKTtcbiAgfSk7XG59O1xuXG5leHBvcnQgY29uc3QgdXRjWWVhcnMgPSB1dGNZZWFyLnJhbmdlO1xuIiwgImltcG9ydCB7YmlzZWN0b3IsIHRpY2tTdGVwfSBmcm9tIFwiZDMtYXJyYXlcIjtcbmltcG9ydCB7ZHVyYXRpb25EYXksIGR1cmF0aW9uSG91ciwgZHVyYXRpb25NaW51dGUsIGR1cmF0aW9uTW9udGgsIGR1cmF0aW9uU2Vjb25kLCBkdXJhdGlvbldlZWssIGR1cmF0aW9uWWVhcn0gZnJvbSBcIi4vZHVyYXRpb24uanNcIjtcbmltcG9ydCB7bWlsbGlzZWNvbmR9IGZyb20gXCIuL21pbGxpc2Vjb25kLmpzXCI7XG5pbXBvcnQge3NlY29uZH0gZnJvbSBcIi4vc2Vjb25kLmpzXCI7XG5pbXBvcnQge3RpbWVNaW51dGUsIHV0Y01pbnV0ZX0gZnJvbSBcIi4vbWludXRlLmpzXCI7XG5pbXBvcnQge3RpbWVIb3VyLCB1dGNIb3VyfSBmcm9tIFwiLi9ob3VyLmpzXCI7XG5pbXBvcnQge3RpbWVEYXksIHVuaXhEYXl9IGZyb20gXCIuL2RheS5qc1wiO1xuaW1wb3J0IHt0aW1lU3VuZGF5LCB1dGNTdW5kYXl9IGZyb20gXCIuL3dlZWsuanNcIjtcbmltcG9ydCB7dGltZU1vbnRoLCB1dGNNb250aH0gZnJvbSBcIi4vbW9udGguanNcIjtcbmltcG9ydCB7dGltZVllYXIsIHV0Y1llYXJ9IGZyb20gXCIuL3llYXIuanNcIjtcblxuZnVuY3Rpb24gdGlja2VyKHllYXIsIG1vbnRoLCB3ZWVrLCBkYXksIGhvdXIsIG1pbnV0ZSkge1xuXG4gIGNvbnN0IHRpY2tJbnRlcnZhbHMgPSBbXG4gICAgW3NlY29uZCwgIDEsICAgICAgZHVyYXRpb25TZWNvbmRdLFxuICAgIFtzZWNvbmQsICA1LCAgNSAqIGR1cmF0aW9uU2Vjb25kXSxcbiAgICBbc2Vjb25kLCAxNSwgMTUgKiBkdXJhdGlvblNlY29uZF0sXG4gICAgW3NlY29uZCwgMzAsIDMwICogZHVyYXRpb25TZWNvbmRdLFxuICAgIFttaW51dGUsICAxLCAgICAgIGR1cmF0aW9uTWludXRlXSxcbiAgICBbbWludXRlLCAgNSwgIDUgKiBkdXJhdGlvbk1pbnV0ZV0sXG4gICAgW21pbnV0ZSwgMTUsIDE1ICogZHVyYXRpb25NaW51dGVdLFxuICAgIFttaW51dGUsIDMwLCAzMCAqIGR1cmF0aW9uTWludXRlXSxcbiAgICBbICBob3VyLCAgMSwgICAgICBkdXJhdGlvbkhvdXIgIF0sXG4gICAgWyAgaG91ciwgIDMsICAzICogZHVyYXRpb25Ib3VyICBdLFxuICAgIFsgIGhvdXIsICA2LCAgNiAqIGR1cmF0aW9uSG91ciAgXSxcbiAgICBbICBob3VyLCAxMiwgMTIgKiBkdXJhdGlvbkhvdXIgIF0sXG4gICAgWyAgIGRheSwgIDEsICAgICAgZHVyYXRpb25EYXkgICBdLFxuICAgIFsgICBkYXksICAyLCAgMiAqIGR1cmF0aW9uRGF5ICAgXSxcbiAgICBbICB3ZWVrLCAgMSwgICAgICBkdXJhdGlvbldlZWsgIF0sXG4gICAgWyBtb250aCwgIDEsICAgICAgZHVyYXRpb25Nb250aCBdLFxuICAgIFsgbW9udGgsICAzLCAgMyAqIGR1cmF0aW9uTW9udGggXSxcbiAgICBbICB5ZWFyLCAgMSwgICAgICBkdXJhdGlvblllYXIgIF1cbiAgXTtcblxuICBmdW5jdGlvbiB0aWNrcyhzdGFydCwgc3RvcCwgY291bnQpIHtcbiAgICBjb25zdCByZXZlcnNlID0gc3RvcCA8IHN0YXJ0O1xuICAgIGlmIChyZXZlcnNlKSBbc3RhcnQsIHN0b3BdID0gW3N0b3AsIHN0YXJ0XTtcbiAgICBjb25zdCBpbnRlcnZhbCA9IGNvdW50ICYmIHR5cGVvZiBjb3VudC5yYW5nZSA9PT0gXCJmdW5jdGlvblwiID8gY291bnQgOiB0aWNrSW50ZXJ2YWwoc3RhcnQsIHN0b3AsIGNvdW50KTtcbiAgICBjb25zdCB0aWNrcyA9IGludGVydmFsID8gaW50ZXJ2YWwucmFuZ2Uoc3RhcnQsICtzdG9wICsgMSkgOiBbXTsgLy8gaW5jbHVzaXZlIHN0b3BcbiAgICByZXR1cm4gcmV2ZXJzZSA/IHRpY2tzLnJldmVyc2UoKSA6IHRpY2tzO1xuICB9XG5cbiAgZnVuY3Rpb24gdGlja0ludGVydmFsKHN0YXJ0LCBzdG9wLCBjb3VudCkge1xuICAgIGNvbnN0IHRhcmdldCA9IE1hdGguYWJzKHN0b3AgLSBzdGFydCkgLyBjb3VudDtcbiAgICBjb25zdCBpID0gYmlzZWN0b3IoKFssLCBzdGVwXSkgPT4gc3RlcCkucmlnaHQodGlja0ludGVydmFscywgdGFyZ2V0KTtcbiAgICBpZiAoaSA9PT0gdGlja0ludGVydmFscy5sZW5ndGgpIHJldHVybiB5ZWFyLmV2ZXJ5KHRpY2tTdGVwKHN0YXJ0IC8gZHVyYXRpb25ZZWFyLCBzdG9wIC8gZHVyYXRpb25ZZWFyLCBjb3VudCkpO1xuICAgIGlmIChpID09PSAwKSByZXR1cm4gbWlsbGlzZWNvbmQuZXZlcnkoTWF0aC5tYXgodGlja1N0ZXAoc3RhcnQsIHN0b3AsIGNvdW50KSwgMSkpO1xuICAgIGNvbnN0IFt0LCBzdGVwXSA9IHRpY2tJbnRlcnZhbHNbdGFyZ2V0IC8gdGlja0ludGVydmFsc1tpIC0gMV1bMl0gPCB0aWNrSW50ZXJ2YWxzW2ldWzJdIC8gdGFyZ2V0ID8gaSAtIDEgOiBpXTtcbiAgICByZXR1cm4gdC5ldmVyeShzdGVwKTtcbiAgfVxuXG4gIHJldHVybiBbdGlja3MsIHRpY2tJbnRlcnZhbF07XG59XG5cbmNvbnN0IFt1dGNUaWNrcywgdXRjVGlja0ludGVydmFsXSA9IHRpY2tlcih1dGNZZWFyLCB1dGNNb250aCwgdXRjU3VuZGF5LCB1bml4RGF5LCB1dGNIb3VyLCB1dGNNaW51dGUpO1xuY29uc3QgW3RpbWVUaWNrcywgdGltZVRpY2tJbnRlcnZhbF0gPSB0aWNrZXIodGltZVllYXIsIHRpbWVNb250aCwgdGltZVN1bmRheSwgdGltZURheSwgdGltZUhvdXIsIHRpbWVNaW51dGUpO1xuXG5leHBvcnQge3V0Y1RpY2tzLCB1dGNUaWNrSW50ZXJ2YWwsIHRpbWVUaWNrcywgdGltZVRpY2tJbnRlcnZhbH07XG4iLCAiaW1wb3J0IHtcbiAgdGltZURheSxcbiAgdGltZVN1bmRheSxcbiAgdGltZU1vbmRheSxcbiAgdGltZVRodXJzZGF5LFxuICB0aW1lWWVhcixcbiAgdXRjRGF5LFxuICB1dGNTdW5kYXksXG4gIHV0Y01vbmRheSxcbiAgdXRjVGh1cnNkYXksXG4gIHV0Y1llYXJcbn0gZnJvbSBcImQzLXRpbWVcIjtcblxuZnVuY3Rpb24gbG9jYWxEYXRlKGQpIHtcbiAgaWYgKDAgPD0gZC55ICYmIGQueSA8IDEwMCkge1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoLTEsIGQubSwgZC5kLCBkLkgsIGQuTSwgZC5TLCBkLkwpO1xuICAgIGRhdGUuc2V0RnVsbFllYXIoZC55KTtcbiAgICByZXR1cm4gZGF0ZTtcbiAgfVxuICByZXR1cm4gbmV3IERhdGUoZC55LCBkLm0sIGQuZCwgZC5ILCBkLk0sIGQuUywgZC5MKTtcbn1cblxuZnVuY3Rpb24gdXRjRGF0ZShkKSB7XG4gIGlmICgwIDw9IGQueSAmJiBkLnkgPCAxMDApIHtcbiAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKERhdGUuVVRDKC0xLCBkLm0sIGQuZCwgZC5ILCBkLk0sIGQuUywgZC5MKSk7XG4gICAgZGF0ZS5zZXRVVENGdWxsWWVhcihkLnkpO1xuICAgIHJldHVybiBkYXRlO1xuICB9XG4gIHJldHVybiBuZXcgRGF0ZShEYXRlLlVUQyhkLnksIGQubSwgZC5kLCBkLkgsIGQuTSwgZC5TLCBkLkwpKTtcbn1cblxuZnVuY3Rpb24gbmV3RGF0ZSh5LCBtLCBkKSB7XG4gIHJldHVybiB7eTogeSwgbTogbSwgZDogZCwgSDogMCwgTTogMCwgUzogMCwgTDogMH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGZvcm1hdExvY2FsZShsb2NhbGUpIHtcbiAgdmFyIGxvY2FsZV9kYXRlVGltZSA9IGxvY2FsZS5kYXRlVGltZSxcbiAgICAgIGxvY2FsZV9kYXRlID0gbG9jYWxlLmRhdGUsXG4gICAgICBsb2NhbGVfdGltZSA9IGxvY2FsZS50aW1lLFxuICAgICAgbG9jYWxlX3BlcmlvZHMgPSBsb2NhbGUucGVyaW9kcyxcbiAgICAgIGxvY2FsZV93ZWVrZGF5cyA9IGxvY2FsZS5kYXlzLFxuICAgICAgbG9jYWxlX3Nob3J0V2Vla2RheXMgPSBsb2NhbGUuc2hvcnREYXlzLFxuICAgICAgbG9jYWxlX21vbnRocyA9IGxvY2FsZS5tb250aHMsXG4gICAgICBsb2NhbGVfc2hvcnRNb250aHMgPSBsb2NhbGUuc2hvcnRNb250aHM7XG5cbiAgdmFyIHBlcmlvZFJlID0gZm9ybWF0UmUobG9jYWxlX3BlcmlvZHMpLFxuICAgICAgcGVyaW9kTG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV9wZXJpb2RzKSxcbiAgICAgIHdlZWtkYXlSZSA9IGZvcm1hdFJlKGxvY2FsZV93ZWVrZGF5cyksXG4gICAgICB3ZWVrZGF5TG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV93ZWVrZGF5cyksXG4gICAgICBzaG9ydFdlZWtkYXlSZSA9IGZvcm1hdFJlKGxvY2FsZV9zaG9ydFdlZWtkYXlzKSxcbiAgICAgIHNob3J0V2Vla2RheUxvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfc2hvcnRXZWVrZGF5cyksXG4gICAgICBtb250aFJlID0gZm9ybWF0UmUobG9jYWxlX21vbnRocyksXG4gICAgICBtb250aExvb2t1cCA9IGZvcm1hdExvb2t1cChsb2NhbGVfbW9udGhzKSxcbiAgICAgIHNob3J0TW9udGhSZSA9IGZvcm1hdFJlKGxvY2FsZV9zaG9ydE1vbnRocyksXG4gICAgICBzaG9ydE1vbnRoTG9va3VwID0gZm9ybWF0TG9va3VwKGxvY2FsZV9zaG9ydE1vbnRocyk7XG5cbiAgdmFyIGZvcm1hdHMgPSB7XG4gICAgXCJhXCI6IGZvcm1hdFNob3J0V2Vla2RheSxcbiAgICBcIkFcIjogZm9ybWF0V2Vla2RheSxcbiAgICBcImJcIjogZm9ybWF0U2hvcnRNb250aCxcbiAgICBcIkJcIjogZm9ybWF0TW9udGgsXG4gICAgXCJjXCI6IG51bGwsXG4gICAgXCJkXCI6IGZvcm1hdERheU9mTW9udGgsXG4gICAgXCJlXCI6IGZvcm1hdERheU9mTW9udGgsXG4gICAgXCJmXCI6IGZvcm1hdE1pY3Jvc2Vjb25kcyxcbiAgICBcImdcIjogZm9ybWF0WWVhcklTTyxcbiAgICBcIkdcIjogZm9ybWF0RnVsbFllYXJJU08sXG4gICAgXCJIXCI6IGZvcm1hdEhvdXIyNCxcbiAgICBcIklcIjogZm9ybWF0SG91cjEyLFxuICAgIFwialwiOiBmb3JtYXREYXlPZlllYXIsXG4gICAgXCJMXCI6IGZvcm1hdE1pbGxpc2Vjb25kcyxcbiAgICBcIm1cIjogZm9ybWF0TW9udGhOdW1iZXIsXG4gICAgXCJNXCI6IGZvcm1hdE1pbnV0ZXMsXG4gICAgXCJwXCI6IGZvcm1hdFBlcmlvZCxcbiAgICBcInFcIjogZm9ybWF0UXVhcnRlcixcbiAgICBcIlFcIjogZm9ybWF0VW5peFRpbWVzdGFtcCxcbiAgICBcInNcIjogZm9ybWF0VW5peFRpbWVzdGFtcFNlY29uZHMsXG4gICAgXCJTXCI6IGZvcm1hdFNlY29uZHMsXG4gICAgXCJ1XCI6IGZvcm1hdFdlZWtkYXlOdW1iZXJNb25kYXksXG4gICAgXCJVXCI6IGZvcm1hdFdlZWtOdW1iZXJTdW5kYXksXG4gICAgXCJWXCI6IGZvcm1hdFdlZWtOdW1iZXJJU08sXG4gICAgXCJ3XCI6IGZvcm1hdFdlZWtkYXlOdW1iZXJTdW5kYXksXG4gICAgXCJXXCI6IGZvcm1hdFdlZWtOdW1iZXJNb25kYXksXG4gICAgXCJ4XCI6IG51bGwsXG4gICAgXCJYXCI6IG51bGwsXG4gICAgXCJ5XCI6IGZvcm1hdFllYXIsXG4gICAgXCJZXCI6IGZvcm1hdEZ1bGxZZWFyLFxuICAgIFwiWlwiOiBmb3JtYXRab25lLFxuICAgIFwiJVwiOiBmb3JtYXRMaXRlcmFsUGVyY2VudFxuICB9O1xuXG4gIHZhciB1dGNGb3JtYXRzID0ge1xuICAgIFwiYVwiOiBmb3JtYXRVVENTaG9ydFdlZWtkYXksXG4gICAgXCJBXCI6IGZvcm1hdFVUQ1dlZWtkYXksXG4gICAgXCJiXCI6IGZvcm1hdFVUQ1Nob3J0TW9udGgsXG4gICAgXCJCXCI6IGZvcm1hdFVUQ01vbnRoLFxuICAgIFwiY1wiOiBudWxsLFxuICAgIFwiZFwiOiBmb3JtYXRVVENEYXlPZk1vbnRoLFxuICAgIFwiZVwiOiBmb3JtYXRVVENEYXlPZk1vbnRoLFxuICAgIFwiZlwiOiBmb3JtYXRVVENNaWNyb3NlY29uZHMsXG4gICAgXCJnXCI6IGZvcm1hdFVUQ1llYXJJU08sXG4gICAgXCJHXCI6IGZvcm1hdFVUQ0Z1bGxZZWFySVNPLFxuICAgIFwiSFwiOiBmb3JtYXRVVENIb3VyMjQsXG4gICAgXCJJXCI6IGZvcm1hdFVUQ0hvdXIxMixcbiAgICBcImpcIjogZm9ybWF0VVRDRGF5T2ZZZWFyLFxuICAgIFwiTFwiOiBmb3JtYXRVVENNaWxsaXNlY29uZHMsXG4gICAgXCJtXCI6IGZvcm1hdFVUQ01vbnRoTnVtYmVyLFxuICAgIFwiTVwiOiBmb3JtYXRVVENNaW51dGVzLFxuICAgIFwicFwiOiBmb3JtYXRVVENQZXJpb2QsXG4gICAgXCJxXCI6IGZvcm1hdFVUQ1F1YXJ0ZXIsXG4gICAgXCJRXCI6IGZvcm1hdFVuaXhUaW1lc3RhbXAsXG4gICAgXCJzXCI6IGZvcm1hdFVuaXhUaW1lc3RhbXBTZWNvbmRzLFxuICAgIFwiU1wiOiBmb3JtYXRVVENTZWNvbmRzLFxuICAgIFwidVwiOiBmb3JtYXRVVENXZWVrZGF5TnVtYmVyTW9uZGF5LFxuICAgIFwiVVwiOiBmb3JtYXRVVENXZWVrTnVtYmVyU3VuZGF5LFxuICAgIFwiVlwiOiBmb3JtYXRVVENXZWVrTnVtYmVySVNPLFxuICAgIFwid1wiOiBmb3JtYXRVVENXZWVrZGF5TnVtYmVyU3VuZGF5LFxuICAgIFwiV1wiOiBmb3JtYXRVVENXZWVrTnVtYmVyTW9uZGF5LFxuICAgIFwieFwiOiBudWxsLFxuICAgIFwiWFwiOiBudWxsLFxuICAgIFwieVwiOiBmb3JtYXRVVENZZWFyLFxuICAgIFwiWVwiOiBmb3JtYXRVVENGdWxsWWVhcixcbiAgICBcIlpcIjogZm9ybWF0VVRDWm9uZSxcbiAgICBcIiVcIjogZm9ybWF0TGl0ZXJhbFBlcmNlbnRcbiAgfTtcblxuICB2YXIgcGFyc2VzID0ge1xuICAgIFwiYVwiOiBwYXJzZVNob3J0V2Vla2RheSxcbiAgICBcIkFcIjogcGFyc2VXZWVrZGF5LFxuICAgIFwiYlwiOiBwYXJzZVNob3J0TW9udGgsXG4gICAgXCJCXCI6IHBhcnNlTW9udGgsXG4gICAgXCJjXCI6IHBhcnNlTG9jYWxlRGF0ZVRpbWUsXG4gICAgXCJkXCI6IHBhcnNlRGF5T2ZNb250aCxcbiAgICBcImVcIjogcGFyc2VEYXlPZk1vbnRoLFxuICAgIFwiZlwiOiBwYXJzZU1pY3Jvc2Vjb25kcyxcbiAgICBcImdcIjogcGFyc2VZZWFyLFxuICAgIFwiR1wiOiBwYXJzZUZ1bGxZZWFyLFxuICAgIFwiSFwiOiBwYXJzZUhvdXIyNCxcbiAgICBcIklcIjogcGFyc2VIb3VyMjQsXG4gICAgXCJqXCI6IHBhcnNlRGF5T2ZZZWFyLFxuICAgIFwiTFwiOiBwYXJzZU1pbGxpc2Vjb25kcyxcbiAgICBcIm1cIjogcGFyc2VNb250aE51bWJlcixcbiAgICBcIk1cIjogcGFyc2VNaW51dGVzLFxuICAgIFwicFwiOiBwYXJzZVBlcmlvZCxcbiAgICBcInFcIjogcGFyc2VRdWFydGVyLFxuICAgIFwiUVwiOiBwYXJzZVVuaXhUaW1lc3RhbXAsXG4gICAgXCJzXCI6IHBhcnNlVW5peFRpbWVzdGFtcFNlY29uZHMsXG4gICAgXCJTXCI6IHBhcnNlU2Vjb25kcyxcbiAgICBcInVcIjogcGFyc2VXZWVrZGF5TnVtYmVyTW9uZGF5LFxuICAgIFwiVVwiOiBwYXJzZVdlZWtOdW1iZXJTdW5kYXksXG4gICAgXCJWXCI6IHBhcnNlV2Vla051bWJlcklTTyxcbiAgICBcIndcIjogcGFyc2VXZWVrZGF5TnVtYmVyU3VuZGF5LFxuICAgIFwiV1wiOiBwYXJzZVdlZWtOdW1iZXJNb25kYXksXG4gICAgXCJ4XCI6IHBhcnNlTG9jYWxlRGF0ZSxcbiAgICBcIlhcIjogcGFyc2VMb2NhbGVUaW1lLFxuICAgIFwieVwiOiBwYXJzZVllYXIsXG4gICAgXCJZXCI6IHBhcnNlRnVsbFllYXIsXG4gICAgXCJaXCI6IHBhcnNlWm9uZSxcbiAgICBcIiVcIjogcGFyc2VMaXRlcmFsUGVyY2VudFxuICB9O1xuXG4gIC8vIFRoZXNlIHJlY3Vyc2l2ZSBkaXJlY3RpdmUgZGVmaW5pdGlvbnMgbXVzdCBiZSBkZWZlcnJlZC5cbiAgZm9ybWF0cy54ID0gbmV3Rm9ybWF0KGxvY2FsZV9kYXRlLCBmb3JtYXRzKTtcbiAgZm9ybWF0cy5YID0gbmV3Rm9ybWF0KGxvY2FsZV90aW1lLCBmb3JtYXRzKTtcbiAgZm9ybWF0cy5jID0gbmV3Rm9ybWF0KGxvY2FsZV9kYXRlVGltZSwgZm9ybWF0cyk7XG4gIHV0Y0Zvcm1hdHMueCA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZSwgdXRjRm9ybWF0cyk7XG4gIHV0Y0Zvcm1hdHMuWCA9IG5ld0Zvcm1hdChsb2NhbGVfdGltZSwgdXRjRm9ybWF0cyk7XG4gIHV0Y0Zvcm1hdHMuYyA9IG5ld0Zvcm1hdChsb2NhbGVfZGF0ZVRpbWUsIHV0Y0Zvcm1hdHMpO1xuXG4gIGZ1bmN0aW9uIG5ld0Zvcm1hdChzcGVjaWZpZXIsIGZvcm1hdHMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oZGF0ZSkge1xuICAgICAgdmFyIHN0cmluZyA9IFtdLFxuICAgICAgICAgIGkgPSAtMSxcbiAgICAgICAgICBqID0gMCxcbiAgICAgICAgICBuID0gc3BlY2lmaWVyLmxlbmd0aCxcbiAgICAgICAgICBjLFxuICAgICAgICAgIHBhZCxcbiAgICAgICAgICBmb3JtYXQ7XG5cbiAgICAgIGlmICghKGRhdGUgaW5zdGFuY2VvZiBEYXRlKSkgZGF0ZSA9IG5ldyBEYXRlKCtkYXRlKTtcblxuICAgICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgICAgaWYgKHNwZWNpZmllci5jaGFyQ29kZUF0KGkpID09PSAzNykge1xuICAgICAgICAgIHN0cmluZy5wdXNoKHNwZWNpZmllci5zbGljZShqLCBpKSk7XG4gICAgICAgICAgaWYgKChwYWQgPSBwYWRzW2MgPSBzcGVjaWZpZXIuY2hhckF0KCsraSldKSAhPSBudWxsKSBjID0gc3BlY2lmaWVyLmNoYXJBdCgrK2kpO1xuICAgICAgICAgIGVsc2UgcGFkID0gYyA9PT0gXCJlXCIgPyBcIiBcIiA6IFwiMFwiO1xuICAgICAgICAgIGlmIChmb3JtYXQgPSBmb3JtYXRzW2NdKSBjID0gZm9ybWF0KGRhdGUsIHBhZCk7XG4gICAgICAgICAgc3RyaW5nLnB1c2goYyk7XG4gICAgICAgICAgaiA9IGkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHN0cmluZy5wdXNoKHNwZWNpZmllci5zbGljZShqLCBpKSk7XG4gICAgICByZXR1cm4gc3RyaW5nLmpvaW4oXCJcIik7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5ld1BhcnNlKHNwZWNpZmllciwgWikge1xuICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIHZhciBkID0gbmV3RGF0ZSgxOTAwLCB1bmRlZmluZWQsIDEpLFxuICAgICAgICAgIGkgPSBwYXJzZVNwZWNpZmllcihkLCBzcGVjaWZpZXIsIHN0cmluZyArPSBcIlwiLCAwKSxcbiAgICAgICAgICB3ZWVrLCBkYXk7XG4gICAgICBpZiAoaSAhPSBzdHJpbmcubGVuZ3RoKSByZXR1cm4gbnVsbDtcblxuICAgICAgLy8gSWYgYSBVTklYIHRpbWVzdGFtcCBpcyBzcGVjaWZpZWQsIHJldHVybiBpdC5cbiAgICAgIGlmIChcIlFcIiBpbiBkKSByZXR1cm4gbmV3IERhdGUoZC5RKTtcbiAgICAgIGlmIChcInNcIiBpbiBkKSByZXR1cm4gbmV3IERhdGUoZC5zICogMTAwMCArIChcIkxcIiBpbiBkID8gZC5MIDogMCkpO1xuXG4gICAgICAvLyBJZiB0aGlzIGlzIHV0Y1BhcnNlLCBuZXZlciB1c2UgdGhlIGxvY2FsIHRpbWV6b25lLlxuICAgICAgaWYgKFogJiYgIShcIlpcIiBpbiBkKSkgZC5aID0gMDtcblxuICAgICAgLy8gVGhlIGFtLXBtIGZsYWcgaXMgMCBmb3IgQU0sIGFuZCAxIGZvciBQTS5cbiAgICAgIGlmIChcInBcIiBpbiBkKSBkLkggPSBkLkggJSAxMiArIGQucCAqIDEyO1xuXG4gICAgICAvLyBJZiB0aGUgbW9udGggd2FzIG5vdCBzcGVjaWZpZWQsIGluaGVyaXQgZnJvbSB0aGUgcXVhcnRlci5cbiAgICAgIGlmIChkLm0gPT09IHVuZGVmaW5lZCkgZC5tID0gXCJxXCIgaW4gZCA/IGQucSA6IDA7XG5cbiAgICAgIC8vIENvbnZlcnQgZGF5LW9mLXdlZWsgYW5kIHdlZWstb2YteWVhciB0byBkYXktb2YteWVhci5cbiAgICAgIGlmIChcIlZcIiBpbiBkKSB7XG4gICAgICAgIGlmIChkLlYgPCAxIHx8IGQuViA+IDUzKSByZXR1cm4gbnVsbDtcbiAgICAgICAgaWYgKCEoXCJ3XCIgaW4gZCkpIGQudyA9IDE7XG4gICAgICAgIGlmIChcIlpcIiBpbiBkKSB7XG4gICAgICAgICAgd2VlayA9IHV0Y0RhdGUobmV3RGF0ZShkLnksIDAsIDEpKSwgZGF5ID0gd2Vlay5nZXRVVENEYXkoKTtcbiAgICAgICAgICB3ZWVrID0gZGF5ID4gNCB8fCBkYXkgPT09IDAgPyB1dGNNb25kYXkuY2VpbCh3ZWVrKSA6IHV0Y01vbmRheSh3ZWVrKTtcbiAgICAgICAgICB3ZWVrID0gdXRjRGF5Lm9mZnNldCh3ZWVrLCAoZC5WIC0gMSkgKiA3KTtcbiAgICAgICAgICBkLnkgPSB3ZWVrLmdldFVUQ0Z1bGxZZWFyKCk7XG4gICAgICAgICAgZC5tID0gd2Vlay5nZXRVVENNb250aCgpO1xuICAgICAgICAgIGQuZCA9IHdlZWsuZ2V0VVRDRGF0ZSgpICsgKGQudyArIDYpICUgNztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3ZWVrID0gbG9jYWxEYXRlKG5ld0RhdGUoZC55LCAwLCAxKSksIGRheSA9IHdlZWsuZ2V0RGF5KCk7XG4gICAgICAgICAgd2VlayA9IGRheSA+IDQgfHwgZGF5ID09PSAwID8gdGltZU1vbmRheS5jZWlsKHdlZWspIDogdGltZU1vbmRheSh3ZWVrKTtcbiAgICAgICAgICB3ZWVrID0gdGltZURheS5vZmZzZXQod2VlaywgKGQuViAtIDEpICogNyk7XG4gICAgICAgICAgZC55ID0gd2Vlay5nZXRGdWxsWWVhcigpO1xuICAgICAgICAgIGQubSA9IHdlZWsuZ2V0TW9udGgoKTtcbiAgICAgICAgICBkLmQgPSB3ZWVrLmdldERhdGUoKSArIChkLncgKyA2KSAlIDc7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoXCJXXCIgaW4gZCB8fCBcIlVcIiBpbiBkKSB7XG4gICAgICAgIGlmICghKFwid1wiIGluIGQpKSBkLncgPSBcInVcIiBpbiBkID8gZC51ICUgNyA6IFwiV1wiIGluIGQgPyAxIDogMDtcbiAgICAgICAgZGF5ID0gXCJaXCIgaW4gZCA/IHV0Y0RhdGUobmV3RGF0ZShkLnksIDAsIDEpKS5nZXRVVENEYXkoKSA6IGxvY2FsRGF0ZShuZXdEYXRlKGQueSwgMCwgMSkpLmdldERheSgpO1xuICAgICAgICBkLm0gPSAwO1xuICAgICAgICBkLmQgPSBcIldcIiBpbiBkID8gKGQudyArIDYpICUgNyArIGQuVyAqIDcgLSAoZGF5ICsgNSkgJSA3IDogZC53ICsgZC5VICogNyAtIChkYXkgKyA2KSAlIDc7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIGEgdGltZSB6b25lIGlzIHNwZWNpZmllZCwgYWxsIGZpZWxkcyBhcmUgaW50ZXJwcmV0ZWQgYXMgVVRDIGFuZCB0aGVuXG4gICAgICAvLyBvZmZzZXQgYWNjb3JkaW5nIHRvIHRoZSBzcGVjaWZpZWQgdGltZSB6b25lLlxuICAgICAgaWYgKFwiWlwiIGluIGQpIHtcbiAgICAgICAgZC5IICs9IGQuWiAvIDEwMCB8IDA7XG4gICAgICAgIGQuTSArPSBkLlogJSAxMDA7XG4gICAgICAgIHJldHVybiB1dGNEYXRlKGQpO1xuICAgICAgfVxuXG4gICAgICAvLyBPdGhlcndpc2UsIGFsbCBmaWVsZHMgYXJlIGluIGxvY2FsIHRpbWUuXG4gICAgICByZXR1cm4gbG9jYWxEYXRlKGQpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVNwZWNpZmllcihkLCBzcGVjaWZpZXIsIHN0cmluZywgaikge1xuICAgIHZhciBpID0gMCxcbiAgICAgICAgbiA9IHNwZWNpZmllci5sZW5ndGgsXG4gICAgICAgIG0gPSBzdHJpbmcubGVuZ3RoLFxuICAgICAgICBjLFxuICAgICAgICBwYXJzZTtcblxuICAgIHdoaWxlIChpIDwgbikge1xuICAgICAgaWYgKGogPj0gbSkgcmV0dXJuIC0xO1xuICAgICAgYyA9IHNwZWNpZmllci5jaGFyQ29kZUF0KGkrKyk7XG4gICAgICBpZiAoYyA9PT0gMzcpIHtcbiAgICAgICAgYyA9IHNwZWNpZmllci5jaGFyQXQoaSsrKTtcbiAgICAgICAgcGFyc2UgPSBwYXJzZXNbYyBpbiBwYWRzID8gc3BlY2lmaWVyLmNoYXJBdChpKyspIDogY107XG4gICAgICAgIGlmICghcGFyc2UgfHwgKChqID0gcGFyc2UoZCwgc3RyaW5nLCBqKSkgPCAwKSkgcmV0dXJuIC0xO1xuICAgICAgfSBlbHNlIGlmIChjICE9IHN0cmluZy5jaGFyQ29kZUF0KGorKykpIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBqO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VQZXJpb2QoZCwgc3RyaW5nLCBpKSB7XG4gICAgdmFyIG4gPSBwZXJpb2RSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC5wID0gcGVyaW9kTG9va3VwLmdldChuWzBdLnRvTG93ZXJDYXNlKCkpLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZVNob3J0V2Vla2RheShkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IHNob3J0V2Vla2RheVJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLncgPSBzaG9ydFdlZWtkYXlMb29rdXAuZ2V0KG5bMF0udG9Mb3dlckNhc2UoKSksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlV2Vla2RheShkLCBzdHJpbmcsIGkpIHtcbiAgICB2YXIgbiA9IHdlZWtkYXlSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC53ID0gd2Vla2RheUxvb2t1cC5nZXQoblswXS50b0xvd2VyQ2FzZSgpKSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VTaG9ydE1vbnRoKGQsIHN0cmluZywgaSkge1xuICAgIHZhciBuID0gc2hvcnRNb250aFJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgICByZXR1cm4gbiA/IChkLm0gPSBzaG9ydE1vbnRoTG9va3VwLmdldChuWzBdLnRvTG93ZXJDYXNlKCkpLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZU1vbnRoKGQsIHN0cmluZywgaSkge1xuICAgIHZhciBuID0gbW9udGhSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gICAgcmV0dXJuIG4gPyAoZC5tID0gbW9udGhMb29rdXAuZ2V0KG5bMF0udG9Mb3dlckNhc2UoKSksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTG9jYWxlRGF0ZVRpbWUoZCwgc3RyaW5nLCBpKSB7XG4gICAgcmV0dXJuIHBhcnNlU3BlY2lmaWVyKGQsIGxvY2FsZV9kYXRlVGltZSwgc3RyaW5nLCBpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlTG9jYWxlRGF0ZShkLCBzdHJpbmcsIGkpIHtcbiAgICByZXR1cm4gcGFyc2VTcGVjaWZpZXIoZCwgbG9jYWxlX2RhdGUsIHN0cmluZywgaSk7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUxvY2FsZVRpbWUoZCwgc3RyaW5nLCBpKSB7XG4gICAgcmV0dXJuIHBhcnNlU3BlY2lmaWVyKGQsIGxvY2FsZV90aW1lLCBzdHJpbmcsIGkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0U2hvcnRXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3Nob3J0V2Vla2RheXNbZC5nZXREYXkoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRXZWVrZGF5KGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3dlZWtkYXlzW2QuZ2V0RGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0U2hvcnRNb250aChkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydE1vbnRoc1tkLmdldE1vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0TW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfbW9udGhzW2QuZ2V0TW9udGgoKV07XG4gIH1cblxuICBmdW5jdGlvbiBmb3JtYXRQZXJpb2QoZCkge1xuICAgIHJldHVybiBsb2NhbGVfcGVyaW9kc1srKGQuZ2V0SG91cnMoKSA+PSAxMildO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0UXVhcnRlcihkKSB7XG4gICAgcmV0dXJuIDEgKyB+fihkLmdldE1vbnRoKCkgLyAzKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFVUQ1Nob3J0V2Vla2RheShkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV9zaG9ydFdlZWtkYXlzW2QuZ2V0VVRDRGF5KCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDV2Vla2RheShkKSB7XG4gICAgcmV0dXJuIGxvY2FsZV93ZWVrZGF5c1tkLmdldFVUQ0RheSgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFVUQ1Nob3J0TW9udGgoZCkge1xuICAgIHJldHVybiBsb2NhbGVfc2hvcnRNb250aHNbZC5nZXRVVENNb250aCgpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFVUQ01vbnRoKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX21vbnRoc1tkLmdldFVUQ01vbnRoKCldO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9ybWF0VVRDUGVyaW9kKGQpIHtcbiAgICByZXR1cm4gbG9jYWxlX3BlcmlvZHNbKyhkLmdldFVUQ0hvdXJzKCkgPj0gMTIpXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdFVUQ1F1YXJ0ZXIoZCkge1xuICAgIHJldHVybiAxICsgfn4oZC5nZXRVVENNb250aCgpIC8gMyk7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZvcm1hdDogZnVuY3Rpb24oc3BlY2lmaWVyKSB7XG4gICAgICB2YXIgZiA9IG5ld0Zvcm1hdChzcGVjaWZpZXIgKz0gXCJcIiwgZm9ybWF0cyk7XG4gICAgICBmLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiBzcGVjaWZpZXI7IH07XG4gICAgICByZXR1cm4gZjtcbiAgICB9LFxuICAgIHBhcnNlOiBmdW5jdGlvbihzcGVjaWZpZXIpIHtcbiAgICAgIHZhciBwID0gbmV3UGFyc2Uoc3BlY2lmaWVyICs9IFwiXCIsIGZhbHNlKTtcbiAgICAgIHAudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHNwZWNpZmllcjsgfTtcbiAgICAgIHJldHVybiBwO1xuICAgIH0sXG4gICAgdXRjRm9ybWF0OiBmdW5jdGlvbihzcGVjaWZpZXIpIHtcbiAgICAgIHZhciBmID0gbmV3Rm9ybWF0KHNwZWNpZmllciArPSBcIlwiLCB1dGNGb3JtYXRzKTtcbiAgICAgIGYudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuIHNwZWNpZmllcjsgfTtcbiAgICAgIHJldHVybiBmO1xuICAgIH0sXG4gICAgdXRjUGFyc2U6IGZ1bmN0aW9uKHNwZWNpZmllcikge1xuICAgICAgdmFyIHAgPSBuZXdQYXJzZShzcGVjaWZpZXIgKz0gXCJcIiwgdHJ1ZSk7XG4gICAgICBwLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiBzcGVjaWZpZXI7IH07XG4gICAgICByZXR1cm4gcDtcbiAgICB9XG4gIH07XG59XG5cbnZhciBwYWRzID0ge1wiLVwiOiBcIlwiLCBcIl9cIjogXCIgXCIsIFwiMFwiOiBcIjBcIn0sXG4gICAgbnVtYmVyUmUgPSAvXlxccypcXGQrLywgLy8gbm90ZTogaWdub3JlcyBuZXh0IGRpcmVjdGl2ZVxuICAgIHBlcmNlbnRSZSA9IC9eJS8sXG4gICAgcmVxdW90ZVJlID0gL1tcXFxcXiQqKz98W1xcXSgpLnt9XS9nO1xuXG5mdW5jdGlvbiBwYWQodmFsdWUsIGZpbGwsIHdpZHRoKSB7XG4gIHZhciBzaWduID0gdmFsdWUgPCAwID8gXCItXCIgOiBcIlwiLFxuICAgICAgc3RyaW5nID0gKHNpZ24gPyAtdmFsdWUgOiB2YWx1ZSkgKyBcIlwiLFxuICAgICAgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcbiAgcmV0dXJuIHNpZ24gKyAobGVuZ3RoIDwgd2lkdGggPyBuZXcgQXJyYXkod2lkdGggLSBsZW5ndGggKyAxKS5qb2luKGZpbGwpICsgc3RyaW5nIDogc3RyaW5nKTtcbn1cblxuZnVuY3Rpb24gcmVxdW90ZShzKSB7XG4gIHJldHVybiBzLnJlcGxhY2UocmVxdW90ZVJlLCBcIlxcXFwkJlwiKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0UmUobmFtZXMpIHtcbiAgcmV0dXJuIG5ldyBSZWdFeHAoXCJeKD86XCIgKyBuYW1lcy5tYXAocmVxdW90ZSkuam9pbihcInxcIikgKyBcIilcIiwgXCJpXCIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRMb29rdXAobmFtZXMpIHtcbiAgcmV0dXJuIG5ldyBNYXAobmFtZXMubWFwKChuYW1lLCBpKSA9PiBbbmFtZS50b0xvd2VyQ2FzZSgpLCBpXSkpO1xufVxuXG5mdW5jdGlvbiBwYXJzZVdlZWtkYXlOdW1iZXJTdW5kYXkoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDEpKTtcbiAgcmV0dXJuIG4gPyAoZC53ID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrZGF5TnVtYmVyTW9uZGF5KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAxKSk7XG4gIHJldHVybiBuID8gKGQudSA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlV2Vla051bWJlclN1bmRheShkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLlUgPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVdlZWtOdW1iZXJJU08oZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5WID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VXZWVrTnVtYmVyTW9uZGF5KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuVyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRnVsbFllYXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDQpKTtcbiAgcmV0dXJuIG4gPyAoZC55ID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VZZWFyKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQueSA9ICtuWzBdICsgKCtuWzBdID4gNjggPyAxOTAwIDogMjAwMCksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2Vab25lKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IC9eKFopfChbKy1dXFxkXFxkKSg/Ojo/KFxcZFxcZCkpPy8uZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDYpKTtcbiAgcmV0dXJuIG4gPyAoZC5aID0gblsxXSA/IDAgOiAtKG5bMl0gKyAoblszXSB8fCBcIjAwXCIpKSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVF1YXJ0ZXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDEpKTtcbiAgcmV0dXJuIG4gPyAoZC5xID0gblswXSAqIDMgLSAzLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTW9udGhOdW1iZXIoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5tID0gblswXSAtIDEsIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VEYXlPZk1vbnRoKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuZCA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlRGF5T2ZZZWFyKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAzKSk7XG4gIHJldHVybiBuID8gKGQubSA9IDAsIGQuZCA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlSG91cjI0KGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGksIGkgKyAyKSk7XG4gIHJldHVybiBuID8gKGQuSCA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTWludXRlcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpLCBpICsgMikpO1xuICByZXR1cm4gbiA/IChkLk0gPSArblswXSwgaSArIG5bMF0ubGVuZ3RoKSA6IC0xO1xufVxuXG5mdW5jdGlvbiBwYXJzZVNlY29uZHMoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDIpKTtcbiAgcmV0dXJuIG4gPyAoZC5TID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VNaWxsaXNlY29uZHMoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDMpKTtcbiAgcmV0dXJuIG4gPyAoZC5MID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VNaWNyb3NlY29uZHMoZCwgc3RyaW5nLCBpKSB7XG4gIHZhciBuID0gbnVtYmVyUmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDYpKTtcbiAgcmV0dXJuIG4gPyAoZC5MID0gTWF0aC5mbG9vcihuWzBdIC8gMTAwMCksIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VMaXRlcmFsUGVyY2VudChkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBwZXJjZW50UmUuZXhlYyhzdHJpbmcuc2xpY2UoaSwgaSArIDEpKTtcbiAgcmV0dXJuIG4gPyBpICsgblswXS5sZW5ndGggOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VVbml4VGltZXN0YW1wKGQsIHN0cmluZywgaSkge1xuICB2YXIgbiA9IG51bWJlclJlLmV4ZWMoc3RyaW5nLnNsaWNlKGkpKTtcbiAgcmV0dXJuIG4gPyAoZC5RID0gK25bMF0sIGkgKyBuWzBdLmxlbmd0aCkgOiAtMTtcbn1cblxuZnVuY3Rpb24gcGFyc2VVbml4VGltZXN0YW1wU2Vjb25kcyhkLCBzdHJpbmcsIGkpIHtcbiAgdmFyIG4gPSBudW1iZXJSZS5leGVjKHN0cmluZy5zbGljZShpKSk7XG4gIHJldHVybiBuID8gKGQucyA9ICtuWzBdLCBpICsgblswXS5sZW5ndGgpIDogLTE7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdERheU9mTW9udGgoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0RGF0ZSgpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0SG91cjI0KGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldEhvdXJzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRIb3VyMTIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0SG91cnMoKSAlIDEyIHx8IDEyLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0RGF5T2ZZZWFyKGQsIHApIHtcbiAgcmV0dXJuIHBhZCgxICsgdGltZURheS5jb3VudCh0aW1lWWVhcihkKSwgZCksIHAsIDMpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNaWxsaXNlY29uZHMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0TWlsbGlzZWNvbmRzKCksIHAsIDMpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNaWNyb3NlY29uZHMoZCwgcCkge1xuICByZXR1cm4gZm9ybWF0TWlsbGlzZWNvbmRzKGQsIHApICsgXCIwMDBcIjtcbn1cblxuZnVuY3Rpb24gZm9ybWF0TW9udGhOdW1iZXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0TW9udGgoKSArIDEsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRNaW51dGVzKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldE1pbnV0ZXMoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFNlY29uZHMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0U2Vjb25kcygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0V2Vla2RheU51bWJlck1vbmRheShkKSB7XG4gIHZhciBkYXkgPSBkLmdldERheSgpO1xuICByZXR1cm4gZGF5ID09PSAwID8gNyA6IGRheTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0V2Vla051bWJlclN1bmRheShkLCBwKSB7XG4gIHJldHVybiBwYWQodGltZVN1bmRheS5jb3VudCh0aW1lWWVhcihkKSAtIDEsIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZElTTyhkKSB7XG4gIHZhciBkYXkgPSBkLmdldERheSgpO1xuICByZXR1cm4gKGRheSA+PSA0IHx8IGRheSA9PT0gMCkgPyB0aW1lVGh1cnNkYXkoZCkgOiB0aW1lVGh1cnNkYXkuY2VpbChkKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0V2Vla051bWJlcklTTyhkLCBwKSB7XG4gIGQgPSBkSVNPKGQpO1xuICByZXR1cm4gcGFkKHRpbWVUaHVyc2RheS5jb3VudCh0aW1lWWVhcihkKSwgZCkgKyAodGltZVllYXIoZCkuZ2V0RGF5KCkgPT09IDQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0V2Vla2RheU51bWJlclN1bmRheShkKSB7XG4gIHJldHVybiBkLmdldERheSgpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRXZWVrTnVtYmVyTW9uZGF5KGQsIHApIHtcbiAgcmV0dXJuIHBhZCh0aW1lTW9uZGF5LmNvdW50KHRpbWVZZWFyKGQpIC0gMSwgZCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRZZWFyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldEZ1bGxZZWFyKCkgJSAxMDAsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRZZWFySVNPKGQsIHApIHtcbiAgZCA9IGRJU08oZCk7XG4gIHJldHVybiBwYWQoZC5nZXRGdWxsWWVhcigpICUgMTAwLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0RnVsbFllYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0RnVsbFllYXIoKSAlIDEwMDAwLCBwLCA0KTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0RnVsbFllYXJJU08oZCwgcCkge1xuICB2YXIgZGF5ID0gZC5nZXREYXkoKTtcbiAgZCA9IChkYXkgPj0gNCB8fCBkYXkgPT09IDApID8gdGltZVRodXJzZGF5KGQpIDogdGltZVRodXJzZGF5LmNlaWwoZCk7XG4gIHJldHVybiBwYWQoZC5nZXRGdWxsWWVhcigpICUgMTAwMDAsIHAsIDQpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRab25lKGQpIHtcbiAgdmFyIHogPSBkLmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gIHJldHVybiAoeiA+IDAgPyBcIi1cIiA6ICh6ICo9IC0xLCBcIitcIikpXG4gICAgICArIHBhZCh6IC8gNjAgfCAwLCBcIjBcIiwgMilcbiAgICAgICsgcGFkKHogJSA2MCwgXCIwXCIsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENEYXlPZk1vbnRoKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0RhdGUoKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0hvdXIyNChkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENIb3VycygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDSG91cjEyKGQsIHApIHtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0hvdXJzKCkgJSAxMiB8fCAxMiwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ0RheU9mWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoMSArIHV0Y0RheS5jb3VudCh1dGNZZWFyKGQpLCBkKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01pbGxpc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENNaWxsaXNlY29uZHMoKSwgcCwgMyk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01pY3Jvc2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBmb3JtYXRVVENNaWxsaXNlY29uZHMoZCwgcCkgKyBcIjAwMFwiO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENNb250aE51bWJlcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENNb250aCgpICsgMSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ01pbnV0ZXMoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDTWludXRlcygpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDU2Vjb25kcyhkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENTZWNvbmRzKCksIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrZGF5TnVtYmVyTW9uZGF5KGQpIHtcbiAgdmFyIGRvdyA9IGQuZ2V0VVRDRGF5KCk7XG4gIHJldHVybiBkb3cgPT09IDAgPyA3IDogZG93O1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENXZWVrTnVtYmVyU3VuZGF5KGQsIHApIHtcbiAgcmV0dXJuIHBhZCh1dGNTdW5kYXkuY291bnQodXRjWWVhcihkKSAtIDEsIGQpLCBwLCAyKTtcbn1cblxuZnVuY3Rpb24gVVRDZElTTyhkKSB7XG4gIHZhciBkYXkgPSBkLmdldFVUQ0RheSgpO1xuICByZXR1cm4gKGRheSA+PSA0IHx8IGRheSA9PT0gMCkgPyB1dGNUaHVyc2RheShkKSA6IHV0Y1RodXJzZGF5LmNlaWwoZCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1dlZWtOdW1iZXJJU08oZCwgcCkge1xuICBkID0gVVRDZElTTyhkKTtcbiAgcmV0dXJuIHBhZCh1dGNUaHVyc2RheS5jb3VudCh1dGNZZWFyKGQpLCBkKSArICh1dGNZZWFyKGQpLmdldFVUQ0RheSgpID09PSA0KSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1dlZWtkYXlOdW1iZXJTdW5kYXkoZCkge1xuICByZXR1cm4gZC5nZXRVVENEYXkoKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0VVRDV2Vla051bWJlck1vbmRheShkLCBwKSB7XG4gIHJldHVybiBwYWQodXRjTW9uZGF5LmNvdW50KHV0Y1llYXIoZCkgLSAxLCBkKSwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1llYXIoZCwgcCkge1xuICByZXR1cm4gcGFkKGQuZ2V0VVRDRnVsbFllYXIoKSAlIDEwMCwgcCwgMik7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdFVUQ1llYXJJU08oZCwgcCkge1xuICBkID0gVVRDZElTTyhkKTtcbiAgcmV0dXJuIHBhZChkLmdldFVUQ0Z1bGxZZWFyKCkgJSAxMDAsIHAsIDIpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENGdWxsWWVhcihkLCBwKSB7XG4gIHJldHVybiBwYWQoZC5nZXRVVENGdWxsWWVhcigpICUgMTAwMDAsIHAsIDQpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENGdWxsWWVhcklTTyhkLCBwKSB7XG4gIHZhciBkYXkgPSBkLmdldFVUQ0RheSgpO1xuICBkID0gKGRheSA+PSA0IHx8IGRheSA9PT0gMCkgPyB1dGNUaHVyc2RheShkKSA6IHV0Y1RodXJzZGF5LmNlaWwoZCk7XG4gIHJldHVybiBwYWQoZC5nZXRVVENGdWxsWWVhcigpICUgMTAwMDAsIHAsIDQpO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVVENab25lKCkge1xuICByZXR1cm4gXCIrMDAwMFwiO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRMaXRlcmFsUGVyY2VudCgpIHtcbiAgcmV0dXJuIFwiJVwiO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVbml4VGltZXN0YW1wKGQpIHtcbiAgcmV0dXJuICtkO1xufVxuXG5mdW5jdGlvbiBmb3JtYXRVbml4VGltZXN0YW1wU2Vjb25kcyhkKSB7XG4gIHJldHVybiBNYXRoLmZsb29yKCtkIC8gMTAwMCk7XG59XG4iLCAiaW1wb3J0IGZvcm1hdExvY2FsZSBmcm9tIFwiLi9sb2NhbGUuanNcIjtcblxudmFyIGxvY2FsZTtcbmV4cG9ydCB2YXIgdGltZUZvcm1hdDtcbmV4cG9ydCB2YXIgdGltZVBhcnNlO1xuZXhwb3J0IHZhciB1dGNGb3JtYXQ7XG5leHBvcnQgdmFyIHV0Y1BhcnNlO1xuXG5kZWZhdWx0TG9jYWxlKHtcbiAgZGF0ZVRpbWU6IFwiJXgsICVYXCIsXG4gIGRhdGU6IFwiJS1tLyUtZC8lWVwiLFxuICB0aW1lOiBcIiUtSTolTTolUyAlcFwiLFxuICBwZXJpb2RzOiBbXCJBTVwiLCBcIlBNXCJdLFxuICBkYXlzOiBbXCJTdW5kYXlcIiwgXCJNb25kYXlcIiwgXCJUdWVzZGF5XCIsIFwiV2VkbmVzZGF5XCIsIFwiVGh1cnNkYXlcIiwgXCJGcmlkYXlcIiwgXCJTYXR1cmRheVwiXSxcbiAgc2hvcnREYXlzOiBbXCJTdW5cIiwgXCJNb25cIiwgXCJUdWVcIiwgXCJXZWRcIiwgXCJUaHVcIiwgXCJGcmlcIiwgXCJTYXRcIl0sXG4gIG1vbnRoczogW1wiSmFudWFyeVwiLCBcIkZlYnJ1YXJ5XCIsIFwiTWFyY2hcIiwgXCJBcHJpbFwiLCBcIk1heVwiLCBcIkp1bmVcIiwgXCJKdWx5XCIsIFwiQXVndXN0XCIsIFwiU2VwdGVtYmVyXCIsIFwiT2N0b2JlclwiLCBcIk5vdmVtYmVyXCIsIFwiRGVjZW1iZXJcIl0sXG4gIHNob3J0TW9udGhzOiBbXCJKYW5cIiwgXCJGZWJcIiwgXCJNYXJcIiwgXCJBcHJcIiwgXCJNYXlcIiwgXCJKdW5cIiwgXCJKdWxcIiwgXCJBdWdcIiwgXCJTZXBcIiwgXCJPY3RcIiwgXCJOb3ZcIiwgXCJEZWNcIl1cbn0pO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBkZWZhdWx0TG9jYWxlKGRlZmluaXRpb24pIHtcbiAgbG9jYWxlID0gZm9ybWF0TG9jYWxlKGRlZmluaXRpb24pO1xuICB0aW1lRm9ybWF0ID0gbG9jYWxlLmZvcm1hdDtcbiAgdGltZVBhcnNlID0gbG9jYWxlLnBhcnNlO1xuICB1dGNGb3JtYXQgPSBsb2NhbGUudXRjRm9ybWF0O1xuICB1dGNQYXJzZSA9IGxvY2FsZS51dGNQYXJzZTtcbiAgcmV0dXJuIGxvY2FsZTtcbn1cbiIsICJpbXBvcnQge3RpbWVZZWFyLCB0aW1lTW9udGgsIHRpbWVXZWVrLCB0aW1lRGF5LCB0aW1lSG91ciwgdGltZU1pbnV0ZSwgdGltZVNlY29uZCwgdGltZVRpY2tzLCB0aW1lVGlja0ludGVydmFsfSBmcm9tIFwiZDMtdGltZVwiO1xuaW1wb3J0IHt0aW1lRm9ybWF0fSBmcm9tIFwiZDMtdGltZS1mb3JtYXRcIjtcbmltcG9ydCBjb250aW51b3VzLCB7Y29weX0gZnJvbSBcIi4vY29udGludW91cy5qc1wiO1xuaW1wb3J0IHtpbml0UmFuZ2V9IGZyb20gXCIuL2luaXQuanNcIjtcbmltcG9ydCBuaWNlIGZyb20gXCIuL25pY2UuanNcIjtcblxuZnVuY3Rpb24gZGF0ZSh0KSB7XG4gIHJldHVybiBuZXcgRGF0ZSh0KTtcbn1cblxuZnVuY3Rpb24gbnVtYmVyKHQpIHtcbiAgcmV0dXJuIHQgaW5zdGFuY2VvZiBEYXRlID8gK3QgOiArbmV3IERhdGUoK3QpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FsZW5kYXIodGlja3MsIHRpY2tJbnRlcnZhbCwgeWVhciwgbW9udGgsIHdlZWssIGRheSwgaG91ciwgbWludXRlLCBzZWNvbmQsIGZvcm1hdCkge1xuICB2YXIgc2NhbGUgPSBjb250aW51b3VzKCksXG4gICAgICBpbnZlcnQgPSBzY2FsZS5pbnZlcnQsXG4gICAgICBkb21haW4gPSBzY2FsZS5kb21haW47XG5cbiAgdmFyIGZvcm1hdE1pbGxpc2Vjb25kID0gZm9ybWF0KFwiLiVMXCIpLFxuICAgICAgZm9ybWF0U2Vjb25kID0gZm9ybWF0KFwiOiVTXCIpLFxuICAgICAgZm9ybWF0TWludXRlID0gZm9ybWF0KFwiJUk6JU1cIiksXG4gICAgICBmb3JtYXRIb3VyID0gZm9ybWF0KFwiJUkgJXBcIiksXG4gICAgICBmb3JtYXREYXkgPSBmb3JtYXQoXCIlYSAlZFwiKSxcbiAgICAgIGZvcm1hdFdlZWsgPSBmb3JtYXQoXCIlYiAlZFwiKSxcbiAgICAgIGZvcm1hdE1vbnRoID0gZm9ybWF0KFwiJUJcIiksXG4gICAgICBmb3JtYXRZZWFyID0gZm9ybWF0KFwiJVlcIik7XG5cbiAgZnVuY3Rpb24gdGlja0Zvcm1hdChkYXRlKSB7XG4gICAgcmV0dXJuIChzZWNvbmQoZGF0ZSkgPCBkYXRlID8gZm9ybWF0TWlsbGlzZWNvbmRcbiAgICAgICAgOiBtaW51dGUoZGF0ZSkgPCBkYXRlID8gZm9ybWF0U2Vjb25kXG4gICAgICAgIDogaG91cihkYXRlKSA8IGRhdGUgPyBmb3JtYXRNaW51dGVcbiAgICAgICAgOiBkYXkoZGF0ZSkgPCBkYXRlID8gZm9ybWF0SG91clxuICAgICAgICA6IG1vbnRoKGRhdGUpIDwgZGF0ZSA/ICh3ZWVrKGRhdGUpIDwgZGF0ZSA/IGZvcm1hdERheSA6IGZvcm1hdFdlZWspXG4gICAgICAgIDogeWVhcihkYXRlKSA8IGRhdGUgPyBmb3JtYXRNb250aFxuICAgICAgICA6IGZvcm1hdFllYXIpKGRhdGUpO1xuICB9XG5cbiAgc2NhbGUuaW52ZXJ0ID0gZnVuY3Rpb24oeSkge1xuICAgIHJldHVybiBuZXcgRGF0ZShpbnZlcnQoeSkpO1xuICB9O1xuXG4gIHNjYWxlLmRvbWFpbiA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IGRvbWFpbihBcnJheS5mcm9tKF8sIG51bWJlcikpIDogZG9tYWluKCkubWFwKGRhdGUpO1xuICB9O1xuXG4gIHNjYWxlLnRpY2tzID0gZnVuY3Rpb24oaW50ZXJ2YWwpIHtcbiAgICB2YXIgZCA9IGRvbWFpbigpO1xuICAgIHJldHVybiB0aWNrcyhkWzBdLCBkW2QubGVuZ3RoIC0gMV0sIGludGVydmFsID09IG51bGwgPyAxMCA6IGludGVydmFsKTtcbiAgfTtcblxuICBzY2FsZS50aWNrRm9ybWF0ID0gZnVuY3Rpb24oY291bnQsIHNwZWNpZmllcikge1xuICAgIHJldHVybiBzcGVjaWZpZXIgPT0gbnVsbCA/IHRpY2tGb3JtYXQgOiBmb3JtYXQoc3BlY2lmaWVyKTtcbiAgfTtcblxuICBzY2FsZS5uaWNlID0gZnVuY3Rpb24oaW50ZXJ2YWwpIHtcbiAgICB2YXIgZCA9IGRvbWFpbigpO1xuICAgIGlmICghaW50ZXJ2YWwgfHwgdHlwZW9mIGludGVydmFsLnJhbmdlICE9PSBcImZ1bmN0aW9uXCIpIGludGVydmFsID0gdGlja0ludGVydmFsKGRbMF0sIGRbZC5sZW5ndGggLSAxXSwgaW50ZXJ2YWwgPT0gbnVsbCA/IDEwIDogaW50ZXJ2YWwpO1xuICAgIHJldHVybiBpbnRlcnZhbCA/IGRvbWFpbihuaWNlKGQsIGludGVydmFsKSkgOiBzY2FsZTtcbiAgfTtcblxuICBzY2FsZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNvcHkoc2NhbGUsIGNhbGVuZGFyKHRpY2tzLCB0aWNrSW50ZXJ2YWwsIHllYXIsIG1vbnRoLCB3ZWVrLCBkYXksIGhvdXIsIG1pbnV0ZSwgc2Vjb25kLCBmb3JtYXQpKTtcbiAgfTtcblxuICByZXR1cm4gc2NhbGU7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHRpbWUoKSB7XG4gIHJldHVybiBpbml0UmFuZ2UuYXBwbHkoY2FsZW5kYXIodGltZVRpY2tzLCB0aW1lVGlja0ludGVydmFsLCB0aW1lWWVhciwgdGltZU1vbnRoLCB0aW1lV2VlaywgdGltZURheSwgdGltZUhvdXIsIHRpbWVNaW51dGUsIHRpbWVTZWNvbmQsIHRpbWVGb3JtYXQpLmRvbWFpbihbbmV3IERhdGUoMjAwMCwgMCwgMSksIG5ldyBEYXRlKDIwMDAsIDAsIDIpXSksIGFyZ3VtZW50cyk7XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4gZnVuY3Rpb24gY29uc3RhbnQoKSB7XG4gICAgcmV0dXJuIHg7XG4gIH07XG59XG4iLCAiY29uc3QgcGkgPSBNYXRoLlBJLFxuICAgIHRhdSA9IDIgKiBwaSxcbiAgICBlcHNpbG9uID0gMWUtNixcbiAgICB0YXVFcHNpbG9uID0gdGF1IC0gZXBzaWxvbjtcblxuZnVuY3Rpb24gYXBwZW5kKHN0cmluZ3MpIHtcbiAgdGhpcy5fICs9IHN0cmluZ3NbMF07XG4gIGZvciAobGV0IGkgPSAxLCBuID0gc3RyaW5ncy5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICB0aGlzLl8gKz0gYXJndW1lbnRzW2ldICsgc3RyaW5nc1tpXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBlbmRSb3VuZChkaWdpdHMpIHtcbiAgbGV0IGQgPSBNYXRoLmZsb29yKGRpZ2l0cyk7XG4gIGlmICghKGQgPj0gMCkpIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCBkaWdpdHM6ICR7ZGlnaXRzfWApO1xuICBpZiAoZCA+IDE1KSByZXR1cm4gYXBwZW5kO1xuICBjb25zdCBrID0gMTAgKiogZDtcbiAgcmV0dXJuIGZ1bmN0aW9uKHN0cmluZ3MpIHtcbiAgICB0aGlzLl8gKz0gc3RyaW5nc1swXTtcbiAgICBmb3IgKGxldCBpID0gMSwgbiA9IHN0cmluZ3MubGVuZ3RoOyBpIDwgbjsgKytpKSB7XG4gICAgICB0aGlzLl8gKz0gTWF0aC5yb3VuZChhcmd1bWVudHNbaV0gKiBrKSAvIGsgKyBzdHJpbmdzW2ldO1xuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIFBhdGgge1xuICBjb25zdHJ1Y3RvcihkaWdpdHMpIHtcbiAgICB0aGlzLl94MCA9IHRoaXMuX3kwID0gLy8gc3RhcnQgb2YgY3VycmVudCBzdWJwYXRoXG4gICAgdGhpcy5feDEgPSB0aGlzLl95MSA9IG51bGw7IC8vIGVuZCBvZiBjdXJyZW50IHN1YnBhdGhcbiAgICB0aGlzLl8gPSBcIlwiO1xuICAgIHRoaXMuX2FwcGVuZCA9IGRpZ2l0cyA9PSBudWxsID8gYXBwZW5kIDogYXBwZW5kUm91bmQoZGlnaXRzKTtcbiAgfVxuICBtb3ZlVG8oeCwgeSkge1xuICAgIHRoaXMuX2FwcGVuZGBNJHt0aGlzLl94MCA9IHRoaXMuX3gxID0gK3h9LCR7dGhpcy5feTAgPSB0aGlzLl95MSA9ICt5fWA7XG4gIH1cbiAgY2xvc2VQYXRoKCkge1xuICAgIGlmICh0aGlzLl94MSAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5feDEgPSB0aGlzLl94MCwgdGhpcy5feTEgPSB0aGlzLl95MDtcbiAgICAgIHRoaXMuX2FwcGVuZGBaYDtcbiAgICB9XG4gIH1cbiAgbGluZVRvKHgsIHkpIHtcbiAgICB0aGlzLl9hcHBlbmRgTCR7dGhpcy5feDEgPSAreH0sJHt0aGlzLl95MSA9ICt5fWA7XG4gIH1cbiAgcXVhZHJhdGljQ3VydmVUbyh4MSwgeTEsIHgsIHkpIHtcbiAgICB0aGlzLl9hcHBlbmRgUSR7K3gxfSwkeyt5MX0sJHt0aGlzLl94MSA9ICt4fSwke3RoaXMuX3kxID0gK3l9YDtcbiAgfVxuICBiZXppZXJDdXJ2ZVRvKHgxLCB5MSwgeDIsIHkyLCB4LCB5KSB7XG4gICAgdGhpcy5fYXBwZW5kYEMkeyt4MX0sJHsreTF9LCR7K3gyfSwkeyt5Mn0sJHt0aGlzLl94MSA9ICt4fSwke3RoaXMuX3kxID0gK3l9YDtcbiAgfVxuICBhcmNUbyh4MSwgeTEsIHgyLCB5Miwgcikge1xuICAgIHgxID0gK3gxLCB5MSA9ICt5MSwgeDIgPSAreDIsIHkyID0gK3kyLCByID0gK3I7XG5cbiAgICAvLyBJcyB0aGUgcmFkaXVzIG5lZ2F0aXZlPyBFcnJvci5cbiAgICBpZiAociA8IDApIHRocm93IG5ldyBFcnJvcihgbmVnYXRpdmUgcmFkaXVzOiAke3J9YCk7XG5cbiAgICBsZXQgeDAgPSB0aGlzLl94MSxcbiAgICAgICAgeTAgPSB0aGlzLl95MSxcbiAgICAgICAgeDIxID0geDIgLSB4MSxcbiAgICAgICAgeTIxID0geTIgLSB5MSxcbiAgICAgICAgeDAxID0geDAgLSB4MSxcbiAgICAgICAgeTAxID0geTAgLSB5MSxcbiAgICAgICAgbDAxXzIgPSB4MDEgKiB4MDEgKyB5MDEgKiB5MDE7XG5cbiAgICAvLyBJcyB0aGlzIHBhdGggZW1wdHk/IE1vdmUgdG8gKHgxLHkxKS5cbiAgICBpZiAodGhpcy5feDEgPT09IG51bGwpIHtcbiAgICAgIHRoaXMuX2FwcGVuZGBNJHt0aGlzLl94MSA9IHgxfSwke3RoaXMuX3kxID0geTF9YDtcbiAgICB9XG5cbiAgICAvLyBPciwgaXMgKHgxLHkxKSBjb2luY2lkZW50IHdpdGggKHgwLHkwKT8gRG8gbm90aGluZy5cbiAgICBlbHNlIGlmICghKGwwMV8yID4gZXBzaWxvbikpO1xuXG4gICAgLy8gT3IsIGFyZSAoeDAseTApLCAoeDEseTEpIGFuZCAoeDIseTIpIGNvbGxpbmVhcj9cbiAgICAvLyBFcXVpdmFsZW50bHksIGlzICh4MSx5MSkgY29pbmNpZGVudCB3aXRoICh4Mix5Mik/XG4gICAgLy8gT3IsIGlzIHRoZSByYWRpdXMgemVybz8gTGluZSB0byAoeDEseTEpLlxuICAgIGVsc2UgaWYgKCEoTWF0aC5hYnMoeTAxICogeDIxIC0geTIxICogeDAxKSA+IGVwc2lsb24pIHx8ICFyKSB7XG4gICAgICB0aGlzLl9hcHBlbmRgTCR7dGhpcy5feDEgPSB4MX0sJHt0aGlzLl95MSA9IHkxfWA7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlLCBkcmF3IGFuIGFyYyFcbiAgICBlbHNlIHtcbiAgICAgIGxldCB4MjAgPSB4MiAtIHgwLFxuICAgICAgICAgIHkyMCA9IHkyIC0geTAsXG4gICAgICAgICAgbDIxXzIgPSB4MjEgKiB4MjEgKyB5MjEgKiB5MjEsXG4gICAgICAgICAgbDIwXzIgPSB4MjAgKiB4MjAgKyB5MjAgKiB5MjAsXG4gICAgICAgICAgbDIxID0gTWF0aC5zcXJ0KGwyMV8yKSxcbiAgICAgICAgICBsMDEgPSBNYXRoLnNxcnQobDAxXzIpLFxuICAgICAgICAgIGwgPSByICogTWF0aC50YW4oKHBpIC0gTWF0aC5hY29zKChsMjFfMiArIGwwMV8yIC0gbDIwXzIpIC8gKDIgKiBsMjEgKiBsMDEpKSkgLyAyKSxcbiAgICAgICAgICB0MDEgPSBsIC8gbDAxLFxuICAgICAgICAgIHQyMSA9IGwgLyBsMjE7XG5cbiAgICAgIC8vIElmIHRoZSBzdGFydCB0YW5nZW50IGlzIG5vdCBjb2luY2lkZW50IHdpdGggKHgwLHkwKSwgbGluZSB0by5cbiAgICAgIGlmIChNYXRoLmFicyh0MDEgLSAxKSA+IGVwc2lsb24pIHtcbiAgICAgICAgdGhpcy5fYXBwZW5kYEwke3gxICsgdDAxICogeDAxfSwke3kxICsgdDAxICogeTAxfWA7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2FwcGVuZGBBJHtyfSwke3J9LDAsMCwkeysoeTAxICogeDIwID4geDAxICogeTIwKX0sJHt0aGlzLl94MSA9IHgxICsgdDIxICogeDIxfSwke3RoaXMuX3kxID0geTEgKyB0MjEgKiB5MjF9YDtcbiAgICB9XG4gIH1cbiAgYXJjKHgsIHksIHIsIGEwLCBhMSwgY2N3KSB7XG4gICAgeCA9ICt4LCB5ID0gK3ksIHIgPSArciwgY2N3ID0gISFjY3c7XG5cbiAgICAvLyBJcyB0aGUgcmFkaXVzIG5lZ2F0aXZlPyBFcnJvci5cbiAgICBpZiAociA8IDApIHRocm93IG5ldyBFcnJvcihgbmVnYXRpdmUgcmFkaXVzOiAke3J9YCk7XG5cbiAgICBsZXQgZHggPSByICogTWF0aC5jb3MoYTApLFxuICAgICAgICBkeSA9IHIgKiBNYXRoLnNpbihhMCksXG4gICAgICAgIHgwID0geCArIGR4LFxuICAgICAgICB5MCA9IHkgKyBkeSxcbiAgICAgICAgY3cgPSAxIF4gY2N3LFxuICAgICAgICBkYSA9IGNjdyA/IGEwIC0gYTEgOiBhMSAtIGEwO1xuXG4gICAgLy8gSXMgdGhpcyBwYXRoIGVtcHR5PyBNb3ZlIHRvICh4MCx5MCkuXG4gICAgaWYgKHRoaXMuX3gxID09PSBudWxsKSB7XG4gICAgICB0aGlzLl9hcHBlbmRgTSR7eDB9LCR7eTB9YDtcbiAgICB9XG5cbiAgICAvLyBPciwgaXMgKHgwLHkwKSBub3QgY29pbmNpZGVudCB3aXRoIHRoZSBwcmV2aW91cyBwb2ludD8gTGluZSB0byAoeDAseTApLlxuICAgIGVsc2UgaWYgKE1hdGguYWJzKHRoaXMuX3gxIC0geDApID4gZXBzaWxvbiB8fCBNYXRoLmFicyh0aGlzLl95MSAtIHkwKSA+IGVwc2lsb24pIHtcbiAgICAgIHRoaXMuX2FwcGVuZGBMJHt4MH0sJHt5MH1gO1xuICAgIH1cblxuICAgIC8vIElzIHRoaXMgYXJjIGVtcHR5PyBXZVx1MjAxOXJlIGRvbmUuXG4gICAgaWYgKCFyKSByZXR1cm47XG5cbiAgICAvLyBEb2VzIHRoZSBhbmdsZSBnbyB0aGUgd3Jvbmcgd2F5PyBGbGlwIHRoZSBkaXJlY3Rpb24uXG4gICAgaWYgKGRhIDwgMCkgZGEgPSBkYSAlIHRhdSArIHRhdTtcblxuICAgIC8vIElzIHRoaXMgYSBjb21wbGV0ZSBjaXJjbGU/IERyYXcgdHdvIGFyY3MgdG8gY29tcGxldGUgdGhlIGNpcmNsZS5cbiAgICBpZiAoZGEgPiB0YXVFcHNpbG9uKSB7XG4gICAgICB0aGlzLl9hcHBlbmRgQSR7cn0sJHtyfSwwLDEsJHtjd30sJHt4IC0gZHh9LCR7eSAtIGR5fUEke3J9LCR7cn0sMCwxLCR7Y3d9LCR7dGhpcy5feDEgPSB4MH0sJHt0aGlzLl95MSA9IHkwfWA7XG4gICAgfVxuXG4gICAgLy8gSXMgdGhpcyBhcmMgbm9uLWVtcHR5PyBEcmF3IGFuIGFyYyFcbiAgICBlbHNlIGlmIChkYSA+IGVwc2lsb24pIHtcbiAgICAgIHRoaXMuX2FwcGVuZGBBJHtyfSwke3J9LDAsJHsrKGRhID49IHBpKX0sJHtjd30sJHt0aGlzLl94MSA9IHggKyByICogTWF0aC5jb3MoYTEpfSwke3RoaXMuX3kxID0geSArIHIgKiBNYXRoLnNpbihhMSl9YDtcbiAgICB9XG4gIH1cbiAgcmVjdCh4LCB5LCB3LCBoKSB7XG4gICAgdGhpcy5fYXBwZW5kYE0ke3RoaXMuX3gwID0gdGhpcy5feDEgPSAreH0sJHt0aGlzLl95MCA9IHRoaXMuX3kxID0gK3l9aCR7dyA9ICt3fXYkeytofWgkey13fVpgO1xuICB9XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLl87XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGgoKSB7XG4gIHJldHVybiBuZXcgUGF0aDtcbn1cblxuLy8gQWxsb3cgaW5zdGFuY2VvZiBkMy5wYXRoXG5wYXRoLnByb3RvdHlwZSA9IFBhdGgucHJvdG90eXBlO1xuXG5leHBvcnQgZnVuY3Rpb24gcGF0aFJvdW5kKGRpZ2l0cyA9IDMpIHtcbiAgcmV0dXJuIG5ldyBQYXRoKCtkaWdpdHMpO1xufVxuIiwgImltcG9ydCB7UGF0aH0gZnJvbSBcImQzLXBhdGhcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhQYXRoKHNoYXBlKSB7XG4gIGxldCBkaWdpdHMgPSAzO1xuXG4gIHNoYXBlLmRpZ2l0cyA9IGZ1bmN0aW9uKF8pIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkaWdpdHM7XG4gICAgaWYgKF8gPT0gbnVsbCkge1xuICAgICAgZGlnaXRzID0gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgZCA9IE1hdGguZmxvb3IoXyk7XG4gICAgICBpZiAoIShkID49IDApKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcihgaW52YWxpZCBkaWdpdHM6ICR7X31gKTtcbiAgICAgIGRpZ2l0cyA9IGQ7XG4gICAgfVxuICAgIHJldHVybiBzaGFwZTtcbiAgfTtcblxuICByZXR1cm4gKCkgPT4gbmV3IFBhdGgoZGlnaXRzKTtcbn1cbiIsICJleHBvcnQgdmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih4KSB7XG4gIHJldHVybiB0eXBlb2YgeCA9PT0gXCJvYmplY3RcIiAmJiBcImxlbmd0aFwiIGluIHhcbiAgICA/IHggLy8gQXJyYXksIFR5cGVkQXJyYXksIE5vZGVMaXN0LCBhcnJheS1saWtlXG4gICAgOiBBcnJheS5mcm9tKHgpOyAvLyBNYXAsIFNldCwgaXRlcmFibGUsIHN0cmluZywgb3IgYW55dGhpbmcgZWxzZVxufVxuIiwgImZ1bmN0aW9uIExpbmVhcihjb250ZXh0KSB7XG4gIHRoaXMuX2NvbnRleHQgPSBjb250ZXh0O1xufVxuXG5MaW5lYXIucHJvdG90eXBlID0ge1xuICBhcmVhU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpbmUgPSAwO1xuICB9LFxuICBhcmVhRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9saW5lID0gTmFOO1xuICB9LFxuICBsaW5lU3RhcnQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3BvaW50ID0gMDtcbiAgfSxcbiAgbGluZUVuZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2xpbmUgfHwgKHRoaXMuX2xpbmUgIT09IDAgJiYgdGhpcy5fcG9pbnQgPT09IDEpKSB0aGlzLl9jb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIHRoaXMuX2xpbmUgPSAxIC0gdGhpcy5fbGluZTtcbiAgfSxcbiAgcG9pbnQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB4ID0gK3gsIHkgPSAreTtcbiAgICBzd2l0Y2ggKHRoaXMuX3BvaW50KSB7XG4gICAgICBjYXNlIDA6IHRoaXMuX3BvaW50ID0gMTsgdGhpcy5fbGluZSA/IHRoaXMuX2NvbnRleHQubGluZVRvKHgsIHkpIDogdGhpcy5fY29udGV4dC5tb3ZlVG8oeCwgeSk7IGJyZWFrO1xuICAgICAgY2FzZSAxOiB0aGlzLl9wb2ludCA9IDI7IC8vIGZhbGxzIHRocm91Z2hcbiAgICAgIGRlZmF1bHQ6IHRoaXMuX2NvbnRleHQubGluZVRvKHgsIHkpOyBicmVhaztcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyBMaW5lYXIoY29udGV4dCk7XG59XG4iLCAiZXhwb3J0IGZ1bmN0aW9uIHgocCkge1xuICByZXR1cm4gcFswXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHkocCkge1xuICByZXR1cm4gcFsxXTtcbn1cbiIsICJpbXBvcnQgYXJyYXkgZnJvbSBcIi4vYXJyYXkuanNcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi9jb25zdGFudC5qc1wiO1xuaW1wb3J0IGN1cnZlTGluZWFyIGZyb20gXCIuL2N1cnZlL2xpbmVhci5qc1wiO1xuaW1wb3J0IHt3aXRoUGF0aH0gZnJvbSBcIi4vcGF0aC5qc1wiO1xuaW1wb3J0IHt4IGFzIHBvaW50WCwgeSBhcyBwb2ludFl9IGZyb20gXCIuL3BvaW50LmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHgsIHkpIHtcbiAgdmFyIGRlZmluZWQgPSBjb25zdGFudCh0cnVlKSxcbiAgICAgIGNvbnRleHQgPSBudWxsLFxuICAgICAgY3VydmUgPSBjdXJ2ZUxpbmVhcixcbiAgICAgIG91dHB1dCA9IG51bGwsXG4gICAgICBwYXRoID0gd2l0aFBhdGgobGluZSk7XG5cbiAgeCA9IHR5cGVvZiB4ID09PSBcImZ1bmN0aW9uXCIgPyB4IDogKHggPT09IHVuZGVmaW5lZCkgPyBwb2ludFggOiBjb25zdGFudCh4KTtcbiAgeSA9IHR5cGVvZiB5ID09PSBcImZ1bmN0aW9uXCIgPyB5IDogKHkgPT09IHVuZGVmaW5lZCkgPyBwb2ludFkgOiBjb25zdGFudCh5KTtcblxuICBmdW5jdGlvbiBsaW5lKGRhdGEpIHtcbiAgICB2YXIgaSxcbiAgICAgICAgbiA9IChkYXRhID0gYXJyYXkoZGF0YSkpLmxlbmd0aCxcbiAgICAgICAgZCxcbiAgICAgICAgZGVmaW5lZDAgPSBmYWxzZSxcbiAgICAgICAgYnVmZmVyO1xuXG4gICAgaWYgKGNvbnRleHQgPT0gbnVsbCkgb3V0cHV0ID0gY3VydmUoYnVmZmVyID0gcGF0aCgpKTtcblxuICAgIGZvciAoaSA9IDA7IGkgPD0gbjsgKytpKSB7XG4gICAgICBpZiAoIShpIDwgbiAmJiBkZWZpbmVkKGQgPSBkYXRhW2ldLCBpLCBkYXRhKSkgPT09IGRlZmluZWQwKSB7XG4gICAgICAgIGlmIChkZWZpbmVkMCA9ICFkZWZpbmVkMCkgb3V0cHV0LmxpbmVTdGFydCgpO1xuICAgICAgICBlbHNlIG91dHB1dC5saW5lRW5kKCk7XG4gICAgICB9XG4gICAgICBpZiAoZGVmaW5lZDApIG91dHB1dC5wb2ludCgreChkLCBpLCBkYXRhKSwgK3koZCwgaSwgZGF0YSkpO1xuICAgIH1cblxuICAgIGlmIChidWZmZXIpIHJldHVybiBvdXRwdXQgPSBudWxsLCBidWZmZXIgKyBcIlwiIHx8IG51bGw7XG4gIH1cblxuICBsaW5lLnggPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeCA9IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBsaW5lKSA6IHg7XG4gIH07XG5cbiAgbGluZS55ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHkgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgbGluZSkgOiB5O1xuICB9O1xuXG4gIGxpbmUuZGVmaW5lZCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChkZWZpbmVkID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCghIV8pLCBsaW5lKSA6IGRlZmluZWQ7XG4gIH07XG5cbiAgbGluZS5jdXJ2ZSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChjdXJ2ZSA9IF8sIGNvbnRleHQgIT0gbnVsbCAmJiAob3V0cHV0ID0gY3VydmUoY29udGV4dCkpLCBsaW5lKSA6IGN1cnZlO1xuICB9O1xuXG4gIGxpbmUuY29udGV4dCA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IChfID09IG51bGwgPyBjb250ZXh0ID0gb3V0cHV0ID0gbnVsbCA6IG91dHB1dCA9IGN1cnZlKGNvbnRleHQgPSBfKSwgbGluZSkgOiBjb250ZXh0O1xuICB9O1xuXG4gIHJldHVybiBsaW5lO1xufVxuIiwgImltcG9ydCBhcnJheSBmcm9tIFwiLi9hcnJheS5qc1wiO1xuaW1wb3J0IGNvbnN0YW50IGZyb20gXCIuL2NvbnN0YW50LmpzXCI7XG5pbXBvcnQgY3VydmVMaW5lYXIgZnJvbSBcIi4vY3VydmUvbGluZWFyLmpzXCI7XG5pbXBvcnQgbGluZSBmcm9tIFwiLi9saW5lLmpzXCI7XG5pbXBvcnQge3dpdGhQYXRofSBmcm9tIFwiLi9wYXRoLmpzXCI7XG5pbXBvcnQge3ggYXMgcG9pbnRYLCB5IGFzIHBvaW50WX0gZnJvbSBcIi4vcG9pbnQuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeDAsIHkwLCB5MSkge1xuICB2YXIgeDEgPSBudWxsLFxuICAgICAgZGVmaW5lZCA9IGNvbnN0YW50KHRydWUpLFxuICAgICAgY29udGV4dCA9IG51bGwsXG4gICAgICBjdXJ2ZSA9IGN1cnZlTGluZWFyLFxuICAgICAgb3V0cHV0ID0gbnVsbCxcbiAgICAgIHBhdGggPSB3aXRoUGF0aChhcmVhKTtcblxuICB4MCA9IHR5cGVvZiB4MCA9PT0gXCJmdW5jdGlvblwiID8geDAgOiAoeDAgPT09IHVuZGVmaW5lZCkgPyBwb2ludFggOiBjb25zdGFudCgreDApO1xuICB5MCA9IHR5cGVvZiB5MCA9PT0gXCJmdW5jdGlvblwiID8geTAgOiAoeTAgPT09IHVuZGVmaW5lZCkgPyBjb25zdGFudCgwKSA6IGNvbnN0YW50KCt5MCk7XG4gIHkxID0gdHlwZW9mIHkxID09PSBcImZ1bmN0aW9uXCIgPyB5MSA6ICh5MSA9PT0gdW5kZWZpbmVkKSA/IHBvaW50WSA6IGNvbnN0YW50KCt5MSk7XG5cbiAgZnVuY3Rpb24gYXJlYShkYXRhKSB7XG4gICAgdmFyIGksXG4gICAgICAgIGosXG4gICAgICAgIGssXG4gICAgICAgIG4gPSAoZGF0YSA9IGFycmF5KGRhdGEpKS5sZW5ndGgsXG4gICAgICAgIGQsXG4gICAgICAgIGRlZmluZWQwID0gZmFsc2UsXG4gICAgICAgIGJ1ZmZlcixcbiAgICAgICAgeDB6ID0gbmV3IEFycmF5KG4pLFxuICAgICAgICB5MHogPSBuZXcgQXJyYXkobik7XG5cbiAgICBpZiAoY29udGV4dCA9PSBudWxsKSBvdXRwdXQgPSBjdXJ2ZShidWZmZXIgPSBwYXRoKCkpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8PSBuOyArK2kpIHtcbiAgICAgIGlmICghKGkgPCBuICYmIGRlZmluZWQoZCA9IGRhdGFbaV0sIGksIGRhdGEpKSA9PT0gZGVmaW5lZDApIHtcbiAgICAgICAgaWYgKGRlZmluZWQwID0gIWRlZmluZWQwKSB7XG4gICAgICAgICAgaiA9IGk7XG4gICAgICAgICAgb3V0cHV0LmFyZWFTdGFydCgpO1xuICAgICAgICAgIG91dHB1dC5saW5lU3RhcnQoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvdXRwdXQubGluZUVuZCgpO1xuICAgICAgICAgIG91dHB1dC5saW5lU3RhcnQoKTtcbiAgICAgICAgICBmb3IgKGsgPSBpIC0gMTsgayA+PSBqOyAtLWspIHtcbiAgICAgICAgICAgIG91dHB1dC5wb2ludCh4MHpba10sIHkweltrXSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIG91dHB1dC5saW5lRW5kKCk7XG4gICAgICAgICAgb3V0cHV0LmFyZWFFbmQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGRlZmluZWQwKSB7XG4gICAgICAgIHgweltpXSA9ICt4MChkLCBpLCBkYXRhKSwgeTB6W2ldID0gK3kwKGQsIGksIGRhdGEpO1xuICAgICAgICBvdXRwdXQucG9pbnQoeDEgPyAreDEoZCwgaSwgZGF0YSkgOiB4MHpbaV0sIHkxID8gK3kxKGQsIGksIGRhdGEpIDogeTB6W2ldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYnVmZmVyKSByZXR1cm4gb3V0cHV0ID0gbnVsbCwgYnVmZmVyICsgXCJcIiB8fCBudWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gYXJlYWxpbmUoKSB7XG4gICAgcmV0dXJuIGxpbmUoKS5kZWZpbmVkKGRlZmluZWQpLmN1cnZlKGN1cnZlKS5jb250ZXh0KGNvbnRleHQpO1xuICB9XG5cbiAgYXJlYS54ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgwID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIHgxID0gbnVsbCwgYXJlYSkgOiB4MDtcbiAgfTtcblxuICBhcmVhLngwID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHgwID0gdHlwZW9mIF8gPT09IFwiZnVuY3Rpb25cIiA/IF8gOiBjb25zdGFudCgrXyksIGFyZWEpIDogeDA7XG4gIH07XG5cbiAgYXJlYS54MSA9IGZ1bmN0aW9uKF8pIHtcbiAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/ICh4MSA9IF8gPT0gbnVsbCA/IG51bGwgOiB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJlYSkgOiB4MTtcbiAgfTtcblxuICBhcmVhLnkgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeTAgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgeTEgPSBudWxsLCBhcmVhKSA6IHkwO1xuICB9O1xuXG4gIGFyZWEueTAgPSBmdW5jdGlvbihfKSB7XG4gICAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyAoeTAgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCtfKSwgYXJlYSkgOiB5MDtcbiAgfTtcblxuICBhcmVhLnkxID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKHkxID0gXyA9PSBudWxsID8gbnVsbCA6IHR5cGVvZiBfID09PSBcImZ1bmN0aW9uXCIgPyBfIDogY29uc3RhbnQoK18pLCBhcmVhKSA6IHkxO1xuICB9O1xuXG4gIGFyZWEubGluZVgwID1cbiAgYXJlYS5saW5lWTAgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXJlYWxpbmUoKS54KHgwKS55KHkwKTtcbiAgfTtcblxuICBhcmVhLmxpbmVZMSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcmVhbGluZSgpLngoeDApLnkoeTEpO1xuICB9O1xuXG4gIGFyZWEubGluZVgxID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFyZWFsaW5lKCkueCh4MSkueSh5MCk7XG4gIH07XG5cbiAgYXJlYS5kZWZpbmVkID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGRlZmluZWQgPSB0eXBlb2YgXyA9PT0gXCJmdW5jdGlvblwiID8gXyA6IGNvbnN0YW50KCEhXyksIGFyZWEpIDogZGVmaW5lZDtcbiAgfTtcblxuICBhcmVhLmN1cnZlID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKGN1cnZlID0gXywgY29udGV4dCAhPSBudWxsICYmIChvdXRwdXQgPSBjdXJ2ZShjb250ZXh0KSksIGFyZWEpIDogY3VydmU7XG4gIH07XG5cbiAgYXJlYS5jb250ZXh0ID0gZnVuY3Rpb24oXykge1xuICAgIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID8gKF8gPT0gbnVsbCA/IGNvbnRleHQgPSBvdXRwdXQgPSBudWxsIDogb3V0cHV0ID0gY3VydmUoY29udGV4dCA9IF8pLCBhcmVhKSA6IGNvbnRleHQ7XG4gIH07XG5cbiAgcmV0dXJuIGFyZWE7XG59XG4iLCAiZXhwb3J0IHZhciB4aHRtbCA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiO1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHN2ZzogXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLFxuICB4aHRtbDogeGh0bWwsXG4gIHhsaW5rOiBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIixcbiAgeG1sOiBcImh0dHA6Ly93d3cudzMub3JnL1hNTC8xOTk4L25hbWVzcGFjZVwiLFxuICB4bWxuczogXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3htbG5zL1wiXG59O1xuIiwgImltcG9ydCBuYW1lc3BhY2VzIGZyb20gXCIuL25hbWVzcGFjZXMuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSkge1xuICB2YXIgcHJlZml4ID0gbmFtZSArPSBcIlwiLCBpID0gcHJlZml4LmluZGV4T2YoXCI6XCIpO1xuICBpZiAoaSA+PSAwICYmIChwcmVmaXggPSBuYW1lLnNsaWNlKDAsIGkpKSAhPT0gXCJ4bWxuc1wiKSBuYW1lID0gbmFtZS5zbGljZShpICsgMSk7XG4gIHJldHVybiBuYW1lc3BhY2VzLmhhc093blByb3BlcnR5KHByZWZpeCkgPyB7c3BhY2U6IG5hbWVzcGFjZXNbcHJlZml4XSwgbG9jYWw6IG5hbWV9IDogbmFtZTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1wcm90b3R5cGUtYnVpbHRpbnNcbn1cbiIsICJpbXBvcnQgbmFtZXNwYWNlIGZyb20gXCIuL25hbWVzcGFjZS5qc1wiO1xuaW1wb3J0IHt4aHRtbH0gZnJvbSBcIi4vbmFtZXNwYWNlcy5qc1wiO1xuXG5mdW5jdGlvbiBjcmVhdG9ySW5oZXJpdChuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZG9jdW1lbnQgPSB0aGlzLm93bmVyRG9jdW1lbnQsXG4gICAgICAgIHVyaSA9IHRoaXMubmFtZXNwYWNlVVJJO1xuICAgIHJldHVybiB1cmkgPT09IHhodG1sICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5uYW1lc3BhY2VVUkkgPT09IHhodG1sXG4gICAgICAgID8gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChuYW1lKVxuICAgICAgICA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyh1cmksIG5hbWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdG9yRml4ZWQoZnVsbG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLm93bmVyRG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpO1xuICByZXR1cm4gKGZ1bGxuYW1lLmxvY2FsXG4gICAgICA/IGNyZWF0b3JGaXhlZFxuICAgICAgOiBjcmVhdG9ySW5oZXJpdCkoZnVsbG5hbWUpO1xufVxuIiwgImZ1bmN0aW9uIG5vbmUoKSB7fVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3Rvcikge1xuICByZXR1cm4gc2VsZWN0b3IgPT0gbnVsbCA/IG5vbmUgOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfTtcbn1cbiIsICJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXguanNcIjtcbmltcG9ydCBzZWxlY3RvciBmcm9tIFwiLi4vc2VsZWN0b3IuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0KSB7XG4gIGlmICh0eXBlb2Ygc2VsZWN0ICE9PSBcImZ1bmN0aW9uXCIpIHNlbGVjdCA9IHNlbGVjdG9yKHNlbGVjdCk7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBtID0gZ3JvdXBzLmxlbmd0aCwgc3ViZ3JvdXBzID0gbmV3IEFycmF5KG0pLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBzdWJncm91cCA9IHN1Ymdyb3Vwc1tqXSA9IG5ldyBBcnJheShuKSwgbm9kZSwgc3Vibm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmICgobm9kZSA9IGdyb3VwW2ldKSAmJiAoc3Vibm9kZSA9IHNlbGVjdC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSkpIHtcbiAgICAgICAgaWYgKFwiX19kYXRhX19cIiBpbiBub2RlKSBzdWJub2RlLl9fZGF0YV9fID0gbm9kZS5fX2RhdGFfXztcbiAgICAgICAgc3ViZ3JvdXBbaV0gPSBzdWJub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHN1Ymdyb3VwcywgdGhpcy5fcGFyZW50cyk7XG59XG4iLCAiLy8gR2l2ZW4gc29tZXRoaW5nIGFycmF5IGxpa2UgKG9yIG51bGwpLCByZXR1cm5zIHNvbWV0aGluZyB0aGF0IGlzIHN0cmljdGx5IGFuXG4vLyBhcnJheS4gVGhpcyBpcyB1c2VkIHRvIGVuc3VyZSB0aGF0IGFycmF5LWxpa2Ugb2JqZWN0cyBwYXNzZWQgdG8gZDMuc2VsZWN0QWxsXG4vLyBvciBzZWxlY3Rpb24uc2VsZWN0QWxsIGFyZSBjb252ZXJ0ZWQgaW50byBwcm9wZXIgYXJyYXlzIHdoZW4gY3JlYXRpbmcgYVxuLy8gc2VsZWN0aW9uOyB3ZSBkb25cdTIwMTl0IGV2ZXIgd2FudCB0byBjcmVhdGUgYSBzZWxlY3Rpb24gYmFja2VkIGJ5IGEgbGl2ZVxuLy8gSFRNTENvbGxlY3Rpb24gb3IgTm9kZUxpc3QuIEhvd2V2ZXIsIG5vdGUgdGhhdCBzZWxlY3Rpb24uc2VsZWN0QWxsIHdpbGwgdXNlIGFcbi8vIHN0YXRpYyBOb2RlTGlzdCBhcyBhIGdyb3VwLCBzaW5jZSBpdCBzYWZlbHkgZGVyaXZlZCBmcm9tIHF1ZXJ5U2VsZWN0b3JBbGwuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBhcnJheSh4KSB7XG4gIHJldHVybiB4ID09IG51bGwgPyBbXSA6IEFycmF5LmlzQXJyYXkoeCkgPyB4IDogQXJyYXkuZnJvbSh4KTtcbn1cbiIsICJmdW5jdGlvbiBlbXB0eSgpIHtcbiAgcmV0dXJuIFtdO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3Rvcikge1xuICByZXR1cm4gc2VsZWN0b3IgPT0gbnVsbCA/IGVtcHR5IDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gIH07XG59XG4iLCAiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4LmpzXCI7XG5pbXBvcnQgYXJyYXkgZnJvbSBcIi4uL2FycmF5LmpzXCI7XG5pbXBvcnQgc2VsZWN0b3JBbGwgZnJvbSBcIi4uL3NlbGVjdG9yQWxsLmpzXCI7XG5cbmZ1bmN0aW9uIGFycmF5QWxsKHNlbGVjdCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFycmF5KHNlbGVjdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oc2VsZWN0KSB7XG4gIGlmICh0eXBlb2Ygc2VsZWN0ID09PSBcImZ1bmN0aW9uXCIpIHNlbGVjdCA9IGFycmF5QWxsKHNlbGVjdCk7XG4gIGVsc2Ugc2VsZWN0ID0gc2VsZWN0b3JBbGwoc2VsZWN0KTtcblxuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIG0gPSBncm91cHMubGVuZ3RoLCBzdWJncm91cHMgPSBbXSwgcGFyZW50cyA9IFtdLCBqID0gMDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBuID0gZ3JvdXAubGVuZ3RoLCBub2RlLCBpID0gMDsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgICBzdWJncm91cHMucHVzaChzZWxlY3QuY2FsbChub2RlLCBub2RlLl9fZGF0YV9fLCBpLCBncm91cCkpO1xuICAgICAgICBwYXJlbnRzLnB1c2gobm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24oc3ViZ3JvdXBzLCBwYXJlbnRzKTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihzZWxlY3Rvcikge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubWF0Y2hlcyhzZWxlY3Rvcik7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjaGlsZE1hdGNoZXIoc2VsZWN0b3IpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5tYXRjaGVzKHNlbGVjdG9yKTtcbiAgfTtcbn1cblxuIiwgImltcG9ydCB7Y2hpbGRNYXRjaGVyfSBmcm9tIFwiLi4vbWF0Y2hlci5qc1wiO1xuXG52YXIgZmluZCA9IEFycmF5LnByb3RvdHlwZS5maW5kO1xuXG5mdW5jdGlvbiBjaGlsZEZpbmQobWF0Y2gpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmaW5kLmNhbGwodGhpcy5jaGlsZHJlbiwgbWF0Y2gpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjaGlsZEZpcnN0KCkge1xuICByZXR1cm4gdGhpcy5maXJzdEVsZW1lbnRDaGlsZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obWF0Y2gpIHtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KG1hdGNoID09IG51bGwgPyBjaGlsZEZpcnN0XG4gICAgICA6IGNoaWxkRmluZCh0eXBlb2YgbWF0Y2ggPT09IFwiZnVuY3Rpb25cIiA/IG1hdGNoIDogY2hpbGRNYXRjaGVyKG1hdGNoKSkpO1xufVxuIiwgImltcG9ydCB7Y2hpbGRNYXRjaGVyfSBmcm9tIFwiLi4vbWF0Y2hlci5qc1wiO1xuXG52YXIgZmlsdGVyID0gQXJyYXkucHJvdG90eXBlLmZpbHRlcjtcblxuZnVuY3Rpb24gY2hpbGRyZW4oKSB7XG4gIHJldHVybiBBcnJheS5mcm9tKHRoaXMuY2hpbGRyZW4pO1xufVxuXG5mdW5jdGlvbiBjaGlsZHJlbkZpbHRlcihtYXRjaCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGZpbHRlci5jYWxsKHRoaXMuY2hpbGRyZW4sIG1hdGNoKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obWF0Y2gpIHtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0QWxsKG1hdGNoID09IG51bGwgPyBjaGlsZHJlblxuICAgICAgOiBjaGlsZHJlbkZpbHRlcih0eXBlb2YgbWF0Y2ggPT09IFwiZnVuY3Rpb25cIiA/IG1hdGNoIDogY2hpbGRNYXRjaGVyKG1hdGNoKSkpO1xufVxuIiwgImltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleC5qc1wiO1xuaW1wb3J0IG1hdGNoZXIgZnJvbSBcIi4uL21hdGNoZXIuanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obWF0Y2gpIHtcbiAgaWYgKHR5cGVvZiBtYXRjaCAhPT0gXCJmdW5jdGlvblwiKSBtYXRjaCA9IG1hdGNoZXIobWF0Y2gpO1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHN1Ymdyb3VwcyA9IG5ldyBBcnJheShtKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgbiA9IGdyb3VwLmxlbmd0aCwgc3ViZ3JvdXAgPSBzdWJncm91cHNbal0gPSBbXSwgbm9kZSwgaSA9IDA7IGkgPCBuOyArK2kpIHtcbiAgICAgIGlmICgobm9kZSA9IGdyb3VwW2ldKSAmJiBtYXRjaC5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSkge1xuICAgICAgICBzdWJncm91cC5wdXNoKG5vZGUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHN1Ymdyb3VwcywgdGhpcy5fcGFyZW50cyk7XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odXBkYXRlKSB7XG4gIHJldHVybiBuZXcgQXJyYXkodXBkYXRlLmxlbmd0aCk7XG59XG4iLCAiaW1wb3J0IHNwYXJzZSBmcm9tIFwiLi9zcGFyc2UuanNcIjtcbmltcG9ydCB7U2VsZWN0aW9ufSBmcm9tIFwiLi9pbmRleC5qc1wiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24odGhpcy5fZW50ZXIgfHwgdGhpcy5fZ3JvdXBzLm1hcChzcGFyc2UpLCB0aGlzLl9wYXJlbnRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIEVudGVyTm9kZShwYXJlbnQsIGRhdHVtKSB7XG4gIHRoaXMub3duZXJEb2N1bWVudCA9IHBhcmVudC5vd25lckRvY3VtZW50O1xuICB0aGlzLm5hbWVzcGFjZVVSSSA9IHBhcmVudC5uYW1lc3BhY2VVUkk7XG4gIHRoaXMuX25leHQgPSBudWxsO1xuICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuX19kYXRhX18gPSBkYXR1bTtcbn1cblxuRW50ZXJOb2RlLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IEVudGVyTm9kZSxcbiAgYXBwZW5kQ2hpbGQ6IGZ1bmN0aW9uKGNoaWxkKSB7IHJldHVybiB0aGlzLl9wYXJlbnQuaW5zZXJ0QmVmb3JlKGNoaWxkLCB0aGlzLl9uZXh0KTsgfSxcbiAgaW5zZXJ0QmVmb3JlOiBmdW5jdGlvbihjaGlsZCwgbmV4dCkgeyByZXR1cm4gdGhpcy5fcGFyZW50Lmluc2VydEJlZm9yZShjaGlsZCwgbmV4dCk7IH0sXG4gIHF1ZXJ5U2VsZWN0b3I6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7IHJldHVybiB0aGlzLl9wYXJlbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7IH0sXG4gIHF1ZXJ5U2VsZWN0b3JBbGw6IGZ1bmN0aW9uKHNlbGVjdG9yKSB7IHJldHVybiB0aGlzLl9wYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7IH1cbn07XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oeCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHg7XG4gIH07XG59XG4iLCAiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4LmpzXCI7XG5pbXBvcnQge0VudGVyTm9kZX0gZnJvbSBcIi4vZW50ZXIuanNcIjtcbmltcG9ydCBjb25zdGFudCBmcm9tIFwiLi4vY29uc3RhbnQuanNcIjtcblxuZnVuY3Rpb24gYmluZEluZGV4KHBhcmVudCwgZ3JvdXAsIGVudGVyLCB1cGRhdGUsIGV4aXQsIGRhdGEpIHtcbiAgdmFyIGkgPSAwLFxuICAgICAgbm9kZSxcbiAgICAgIGdyb3VwTGVuZ3RoID0gZ3JvdXAubGVuZ3RoLFxuICAgICAgZGF0YUxlbmd0aCA9IGRhdGEubGVuZ3RoO1xuXG4gIC8vIFB1dCBhbnkgbm9uLW51bGwgbm9kZXMgdGhhdCBmaXQgaW50byB1cGRhdGUuXG4gIC8vIFB1dCBhbnkgbnVsbCBub2RlcyBpbnRvIGVudGVyLlxuICAvLyBQdXQgYW55IHJlbWFpbmluZyBkYXRhIGludG8gZW50ZXIuXG4gIGZvciAoOyBpIDwgZGF0YUxlbmd0aDsgKytpKSB7XG4gICAgaWYgKG5vZGUgPSBncm91cFtpXSkge1xuICAgICAgbm9kZS5fX2RhdGFfXyA9IGRhdGFbaV07XG4gICAgICB1cGRhdGVbaV0gPSBub2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbnRlcltpXSA9IG5ldyBFbnRlck5vZGUocGFyZW50LCBkYXRhW2ldKTtcbiAgICB9XG4gIH1cblxuICAvLyBQdXQgYW55IG5vbi1udWxsIG5vZGVzIHRoYXQgZG9uXHUyMDE5dCBmaXQgaW50byBleGl0LlxuICBmb3IgKDsgaSA8IGdyb3VwTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICBleGl0W2ldID0gbm9kZTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gYmluZEtleShwYXJlbnQsIGdyb3VwLCBlbnRlciwgdXBkYXRlLCBleGl0LCBkYXRhLCBrZXkpIHtcbiAgdmFyIGksXG4gICAgICBub2RlLFxuICAgICAgbm9kZUJ5S2V5VmFsdWUgPSBuZXcgTWFwLFxuICAgICAgZ3JvdXBMZW5ndGggPSBncm91cC5sZW5ndGgsXG4gICAgICBkYXRhTGVuZ3RoID0gZGF0YS5sZW5ndGgsXG4gICAgICBrZXlWYWx1ZXMgPSBuZXcgQXJyYXkoZ3JvdXBMZW5ndGgpLFxuICAgICAga2V5VmFsdWU7XG5cbiAgLy8gQ29tcHV0ZSB0aGUga2V5IGZvciBlYWNoIG5vZGUuXG4gIC8vIElmIG11bHRpcGxlIG5vZGVzIGhhdmUgdGhlIHNhbWUga2V5LCB0aGUgZHVwbGljYXRlcyBhcmUgYWRkZWQgdG8gZXhpdC5cbiAgZm9yIChpID0gMDsgaSA8IGdyb3VwTGVuZ3RoOyArK2kpIHtcbiAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICBrZXlWYWx1ZXNbaV0gPSBrZXlWYWx1ZSA9IGtleS5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKSArIFwiXCI7XG4gICAgICBpZiAobm9kZUJ5S2V5VmFsdWUuaGFzKGtleVZhbHVlKSkge1xuICAgICAgICBleGl0W2ldID0gbm9kZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGVCeUtleVZhbHVlLnNldChrZXlWYWx1ZSwgbm9kZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ29tcHV0ZSB0aGUga2V5IGZvciBlYWNoIGRhdHVtLlxuICAvLyBJZiB0aGVyZSBhIG5vZGUgYXNzb2NpYXRlZCB3aXRoIHRoaXMga2V5LCBqb2luIGFuZCBhZGQgaXQgdG8gdXBkYXRlLlxuICAvLyBJZiB0aGVyZSBpcyBub3QgKG9yIHRoZSBrZXkgaXMgYSBkdXBsaWNhdGUpLCBhZGQgaXQgdG8gZW50ZXIuXG4gIGZvciAoaSA9IDA7IGkgPCBkYXRhTGVuZ3RoOyArK2kpIHtcbiAgICBrZXlWYWx1ZSA9IGtleS5jYWxsKHBhcmVudCwgZGF0YVtpXSwgaSwgZGF0YSkgKyBcIlwiO1xuICAgIGlmIChub2RlID0gbm9kZUJ5S2V5VmFsdWUuZ2V0KGtleVZhbHVlKSkge1xuICAgICAgdXBkYXRlW2ldID0gbm9kZTtcbiAgICAgIG5vZGUuX19kYXRhX18gPSBkYXRhW2ldO1xuICAgICAgbm9kZUJ5S2V5VmFsdWUuZGVsZXRlKGtleVZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZW50ZXJbaV0gPSBuZXcgRW50ZXJOb2RlKHBhcmVudCwgZGF0YVtpXSk7XG4gICAgfVxuICB9XG5cbiAgLy8gQWRkIGFueSByZW1haW5pbmcgbm9kZXMgdGhhdCB3ZXJlIG5vdCBib3VuZCB0byBkYXRhIHRvIGV4aXQuXG4gIGZvciAoaSA9IDA7IGkgPCBncm91cExlbmd0aDsgKytpKSB7XG4gICAgaWYgKChub2RlID0gZ3JvdXBbaV0pICYmIChub2RlQnlLZXlWYWx1ZS5nZXQoa2V5VmFsdWVzW2ldKSA9PT0gbm9kZSkpIHtcbiAgICAgIGV4aXRbaV0gPSBub2RlO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBkYXR1bShub2RlKSB7XG4gIHJldHVybiBub2RlLl9fZGF0YV9fO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIEFycmF5LmZyb20odGhpcywgZGF0dW0pO1xuXG4gIHZhciBiaW5kID0ga2V5ID8gYmluZEtleSA6IGJpbmRJbmRleCxcbiAgICAgIHBhcmVudHMgPSB0aGlzLl9wYXJlbnRzLFxuICAgICAgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzO1xuXG4gIGlmICh0eXBlb2YgdmFsdWUgIT09IFwiZnVuY3Rpb25cIikgdmFsdWUgPSBjb25zdGFudCh2YWx1ZSk7XG5cbiAgZm9yICh2YXIgbSA9IGdyb3Vwcy5sZW5ndGgsIHVwZGF0ZSA9IG5ldyBBcnJheShtKSwgZW50ZXIgPSBuZXcgQXJyYXkobSksIGV4aXQgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgdmFyIHBhcmVudCA9IHBhcmVudHNbal0sXG4gICAgICAgIGdyb3VwID0gZ3JvdXBzW2pdLFxuICAgICAgICBncm91cExlbmd0aCA9IGdyb3VwLmxlbmd0aCxcbiAgICAgICAgZGF0YSA9IGFycmF5bGlrZSh2YWx1ZS5jYWxsKHBhcmVudCwgcGFyZW50ICYmIHBhcmVudC5fX2RhdGFfXywgaiwgcGFyZW50cykpLFxuICAgICAgICBkYXRhTGVuZ3RoID0gZGF0YS5sZW5ndGgsXG4gICAgICAgIGVudGVyR3JvdXAgPSBlbnRlcltqXSA9IG5ldyBBcnJheShkYXRhTGVuZ3RoKSxcbiAgICAgICAgdXBkYXRlR3JvdXAgPSB1cGRhdGVbal0gPSBuZXcgQXJyYXkoZGF0YUxlbmd0aCksXG4gICAgICAgIGV4aXRHcm91cCA9IGV4aXRbal0gPSBuZXcgQXJyYXkoZ3JvdXBMZW5ndGgpO1xuXG4gICAgYmluZChwYXJlbnQsIGdyb3VwLCBlbnRlckdyb3VwLCB1cGRhdGVHcm91cCwgZXhpdEdyb3VwLCBkYXRhLCBrZXkpO1xuXG4gICAgLy8gTm93IGNvbm5lY3QgdGhlIGVudGVyIG5vZGVzIHRvIHRoZWlyIGZvbGxvd2luZyB1cGRhdGUgbm9kZSwgc3VjaCB0aGF0XG4gICAgLy8gYXBwZW5kQ2hpbGQgY2FuIGluc2VydCB0aGUgbWF0ZXJpYWxpemVkIGVudGVyIG5vZGUgYmVmb3JlIHRoaXMgbm9kZSxcbiAgICAvLyByYXRoZXIgdGhhbiBhdCB0aGUgZW5kIG9mIHRoZSBwYXJlbnQgbm9kZS5cbiAgICBmb3IgKHZhciBpMCA9IDAsIGkxID0gMCwgcHJldmlvdXMsIG5leHQ7IGkwIDwgZGF0YUxlbmd0aDsgKytpMCkge1xuICAgICAgaWYgKHByZXZpb3VzID0gZW50ZXJHcm91cFtpMF0pIHtcbiAgICAgICAgaWYgKGkwID49IGkxKSBpMSA9IGkwICsgMTtcbiAgICAgICAgd2hpbGUgKCEobmV4dCA9IHVwZGF0ZUdyb3VwW2kxXSkgJiYgKytpMSA8IGRhdGFMZW5ndGgpO1xuICAgICAgICBwcmV2aW91cy5fbmV4dCA9IG5leHQgfHwgbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB1cGRhdGUgPSBuZXcgU2VsZWN0aW9uKHVwZGF0ZSwgcGFyZW50cyk7XG4gIHVwZGF0ZS5fZW50ZXIgPSBlbnRlcjtcbiAgdXBkYXRlLl9leGl0ID0gZXhpdDtcbiAgcmV0dXJuIHVwZGF0ZTtcbn1cblxuLy8gR2l2ZW4gc29tZSBkYXRhLCB0aGlzIHJldHVybnMgYW4gYXJyYXktbGlrZSB2aWV3IG9mIGl0OiBhbiBvYmplY3QgdGhhdFxuLy8gZXhwb3NlcyBhIGxlbmd0aCBwcm9wZXJ0eSBhbmQgYWxsb3dzIG51bWVyaWMgaW5kZXhpbmcuIE5vdGUgdGhhdCB1bmxpa2Vcbi8vIHNlbGVjdEFsbCwgdGhpcyBpc25cdTIwMTl0IHdvcnJpZWQgYWJvdXQgXHUyMDFDbGl2ZVx1MjAxRCBjb2xsZWN0aW9ucyBiZWNhdXNlIHRoZSByZXN1bHRpbmdcbi8vIGFycmF5IHdpbGwgb25seSBiZSB1c2VkIGJyaWVmbHkgd2hpbGUgZGF0YSBpcyBiZWluZyBib3VuZC4gKEl0IGlzIHBvc3NpYmxlIHRvXG4vLyBjYXVzZSB0aGUgZGF0YSB0byBjaGFuZ2Ugd2hpbGUgaXRlcmF0aW5nIGJ5IHVzaW5nIGEga2V5IGZ1bmN0aW9uLCBidXQgcGxlYXNlXG4vLyBkb25cdTIwMTl0OyB3ZVx1MjAxOWQgcmF0aGVyIGF2b2lkIGEgZ3JhdHVpdG91cyBjb3B5LilcbmZ1bmN0aW9uIGFycmF5bGlrZShkYXRhKSB7XG4gIHJldHVybiB0eXBlb2YgZGF0YSA9PT0gXCJvYmplY3RcIiAmJiBcImxlbmd0aFwiIGluIGRhdGFcbiAgICA/IGRhdGEgLy8gQXJyYXksIFR5cGVkQXJyYXksIE5vZGVMaXN0LCBhcnJheS1saWtlXG4gICAgOiBBcnJheS5mcm9tKGRhdGEpOyAvLyBNYXAsIFNldCwgaXRlcmFibGUsIHN0cmluZywgb3IgYW55dGhpbmcgZWxzZVxufVxuIiwgImltcG9ydCBzcGFyc2UgZnJvbSBcIi4vc3BhcnNlLmpzXCI7XG5pbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXguanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHRoaXMuX2V4aXQgfHwgdGhpcy5fZ3JvdXBzLm1hcChzcGFyc2UpLCB0aGlzLl9wYXJlbnRzKTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihvbmVudGVyLCBvbnVwZGF0ZSwgb25leGl0KSB7XG4gIHZhciBlbnRlciA9IHRoaXMuZW50ZXIoKSwgdXBkYXRlID0gdGhpcywgZXhpdCA9IHRoaXMuZXhpdCgpO1xuICBpZiAodHlwZW9mIG9uZW50ZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGVudGVyID0gb25lbnRlcihlbnRlcik7XG4gICAgaWYgKGVudGVyKSBlbnRlciA9IGVudGVyLnNlbGVjdGlvbigpO1xuICB9IGVsc2Uge1xuICAgIGVudGVyID0gZW50ZXIuYXBwZW5kKG9uZW50ZXIgKyBcIlwiKTtcbiAgfVxuICBpZiAob251cGRhdGUgIT0gbnVsbCkge1xuICAgIHVwZGF0ZSA9IG9udXBkYXRlKHVwZGF0ZSk7XG4gICAgaWYgKHVwZGF0ZSkgdXBkYXRlID0gdXBkYXRlLnNlbGVjdGlvbigpO1xuICB9XG4gIGlmIChvbmV4aXQgPT0gbnVsbCkgZXhpdC5yZW1vdmUoKTsgZWxzZSBvbmV4aXQoZXhpdCk7XG4gIHJldHVybiBlbnRlciAmJiB1cGRhdGUgPyBlbnRlci5tZXJnZSh1cGRhdGUpLm9yZGVyKCkgOiB1cGRhdGU7XG59XG4iLCAiaW1wb3J0IHtTZWxlY3Rpb259IGZyb20gXCIuL2luZGV4LmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgdmFyIHNlbGVjdGlvbiA9IGNvbnRleHQuc2VsZWN0aW9uID8gY29udGV4dC5zZWxlY3Rpb24oKSA6IGNvbnRleHQ7XG5cbiAgZm9yICh2YXIgZ3JvdXBzMCA9IHRoaXMuX2dyb3VwcywgZ3JvdXBzMSA9IHNlbGVjdGlvbi5fZ3JvdXBzLCBtMCA9IGdyb3VwczAubGVuZ3RoLCBtMSA9IGdyb3VwczEubGVuZ3RoLCBtID0gTWF0aC5taW4obTAsIG0xKSwgbWVyZ2VzID0gbmV3IEFycmF5KG0wKSwgaiA9IDA7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cDAgPSBncm91cHMwW2pdLCBncm91cDEgPSBncm91cHMxW2pdLCBuID0gZ3JvdXAwLmxlbmd0aCwgbWVyZ2UgPSBtZXJnZXNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwMFtpXSB8fCBncm91cDFbaV0pIHtcbiAgICAgICAgbWVyZ2VbaV0gPSBub2RlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBqIDwgbTA7ICsraikge1xuICAgIG1lcmdlc1tqXSA9IGdyb3VwczBbal07XG4gIH1cblxuICByZXR1cm4gbmV3IFNlbGVjdGlvbihtZXJnZXMsIHRoaXMuX3BhcmVudHMpO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgaiA9IC0xLCBtID0gZ3JvdXBzLmxlbmd0aDsgKytqIDwgbTspIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgaSA9IGdyb3VwLmxlbmd0aCAtIDEsIG5leHQgPSBncm91cFtpXSwgbm9kZTsgLS1pID49IDA7KSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIGlmIChuZXh0ICYmIG5vZGUuY29tcGFyZURvY3VtZW50UG9zaXRpb24obmV4dCkgXiA0KSBuZXh0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIG5leHQpO1xuICAgICAgICBuZXh0ID0gbm9kZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn1cbiIsICJpbXBvcnQge1NlbGVjdGlvbn0gZnJvbSBcIi4vaW5kZXguanNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oY29tcGFyZSkge1xuICBpZiAoIWNvbXBhcmUpIGNvbXBhcmUgPSBhc2NlbmRpbmc7XG5cbiAgZnVuY3Rpb24gY29tcGFyZU5vZGUoYSwgYikge1xuICAgIHJldHVybiBhICYmIGIgPyBjb21wYXJlKGEuX19kYXRhX18sIGIuX19kYXRhX18pIDogIWEgLSAhYjtcbiAgfVxuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgbSA9IGdyb3Vwcy5sZW5ndGgsIHNvcnRncm91cHMgPSBuZXcgQXJyYXkobSksIGogPSAwOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIG4gPSBncm91cC5sZW5ndGgsIHNvcnRncm91cCA9IHNvcnRncm91cHNbal0gPSBuZXcgQXJyYXkobiksIG5vZGUsIGkgPSAwOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSB7XG4gICAgICAgIHNvcnRncm91cFtpXSA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICAgIHNvcnRncm91cC5zb3J0KGNvbXBhcmVOb2RlKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKHNvcnRncm91cHMsIHRoaXMuX3BhcmVudHMpLm9yZGVyKCk7XG59XG5cbmZ1bmN0aW9uIGFzY2VuZGluZyhhLCBiKSB7XG4gIHJldHVybiBhIDwgYiA/IC0xIDogYSA+IGIgPyAxIDogYSA+PSBiID8gMCA6IE5hTjtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgdmFyIGNhbGxiYWNrID0gYXJndW1lbnRzWzBdO1xuICBhcmd1bWVudHNbMF0gPSB0aGlzO1xuICBjYWxsYmFjay5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICByZXR1cm4gdGhpcztcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIEFycmF5LmZyb20odGhpcyk7XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG5cbiAgZm9yICh2YXIgZ3JvdXBzID0gdGhpcy5fZ3JvdXBzLCBqID0gMCwgbSA9IGdyb3Vwcy5sZW5ndGg7IGogPCBtOyArK2opIHtcbiAgICBmb3IgKHZhciBncm91cCA9IGdyb3Vwc1tqXSwgaSA9IDAsIG4gPSBncm91cC5sZW5ndGg7IGkgPCBuOyArK2kpIHtcbiAgICAgIHZhciBub2RlID0gZ3JvdXBbaV07XG4gICAgICBpZiAobm9kZSkgcmV0dXJuIG5vZGU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIGxldCBzaXplID0gMDtcbiAgZm9yIChjb25zdCBub2RlIG9mIHRoaXMpICsrc2l6ZTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bnVzZWQtdmFyc1xuICByZXR1cm4gc2l6ZTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICF0aGlzLm5vZGUoKTtcbn1cbiIsICJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gIGZvciAodmFyIGdyb3VwcyA9IHRoaXMuX2dyb3VwcywgaiA9IDAsIG0gPSBncm91cHMubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgZm9yICh2YXIgZ3JvdXAgPSBncm91cHNbal0sIGkgPSAwLCBuID0gZ3JvdXAubGVuZ3RoLCBub2RlOyBpIDwgbjsgKytpKSB7XG4gICAgICBpZiAobm9kZSA9IGdyb3VwW2ldKSBjYWxsYmFjay5jYWxsKG5vZGUsIG5vZGUuX19kYXRhX18sIGksIGdyb3VwKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn1cbiIsICJpbXBvcnQgbmFtZXNwYWNlIGZyb20gXCIuLi9uYW1lc3BhY2UuanNcIjtcblxuZnVuY3Rpb24gYXR0clJlbW92ZShuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gYXR0clJlbW92ZU5TKGZ1bGxuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUF0dHJpYnV0ZU5TKGZ1bGxuYW1lLnNwYWNlLCBmdWxsbmFtZS5sb2NhbCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJDb25zdGFudChuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBhdHRyQ29uc3RhbnROUyhmdWxsbmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsLCB2YWx1ZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJGdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIHRoaXMucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgIGVsc2UgdGhpcy5zZXRBdHRyaWJ1dGUobmFtZSwgdik7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGF0dHJGdW5jdGlvbk5TKGZ1bGxuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIHRoaXMucmVtb3ZlQXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsKTtcbiAgICBlbHNlIHRoaXMuc2V0QXR0cmlidXRlTlMoZnVsbG5hbWUuc3BhY2UsIGZ1bGxuYW1lLmxvY2FsLCB2KTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgdmFyIGZ1bGxuYW1lID0gbmFtZXNwYWNlKG5hbWUpO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIHZhciBub2RlID0gdGhpcy5ub2RlKCk7XG4gICAgcmV0dXJuIGZ1bGxuYW1lLmxvY2FsXG4gICAgICAgID8gbm9kZS5nZXRBdHRyaWJ1dGVOUyhmdWxsbmFtZS5zcGFjZSwgZnVsbG5hbWUubG9jYWwpXG4gICAgICAgIDogbm9kZS5nZXRBdHRyaWJ1dGUoZnVsbG5hbWUpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZWFjaCgodmFsdWUgPT0gbnVsbFxuICAgICAgPyAoZnVsbG5hbWUubG9jYWwgPyBhdHRyUmVtb3ZlTlMgOiBhdHRyUmVtb3ZlKSA6ICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgPyAoZnVsbG5hbWUubG9jYWwgPyBhdHRyRnVuY3Rpb25OUyA6IGF0dHJGdW5jdGlvbilcbiAgICAgIDogKGZ1bGxuYW1lLmxvY2FsID8gYXR0ckNvbnN0YW50TlMgOiBhdHRyQ29uc3RhbnQpKSkoZnVsbG5hbWUsIHZhbHVlKSk7XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obm9kZSkge1xuICByZXR1cm4gKG5vZGUub3duZXJEb2N1bWVudCAmJiBub2RlLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXcpIC8vIG5vZGUgaXMgYSBOb2RlXG4gICAgICB8fCAobm9kZS5kb2N1bWVudCAmJiBub2RlKSAvLyBub2RlIGlzIGEgV2luZG93XG4gICAgICB8fCBub2RlLmRlZmF1bHRWaWV3OyAvLyBub2RlIGlzIGEgRG9jdW1lbnRcbn1cbiIsICJpbXBvcnQgZGVmYXVsdFZpZXcgZnJvbSBcIi4uL3dpbmRvdy5qc1wiO1xuXG5mdW5jdGlvbiBzdHlsZVJlbW92ZShuYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0eWxlLnJlbW92ZVByb3BlcnR5KG5hbWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzdHlsZUNvbnN0YW50KG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdHlsZS5zZXRQcm9wZXJ0eShuYW1lLCB2YWx1ZSwgcHJpb3JpdHkpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzdHlsZUZ1bmN0aW9uKG5hbWUsIHZhbHVlLCBwcmlvcml0eSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIGlmICh2ID09IG51bGwpIHRoaXMuc3R5bGUucmVtb3ZlUHJvcGVydHkobmFtZSk7XG4gICAgZWxzZSB0aGlzLnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIHYsIHByaW9yaXR5KTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgdmFsdWUsIHByaW9yaXR5KSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID4gMVxuICAgICAgPyB0aGlzLmVhY2goKHZhbHVlID09IG51bGxcbiAgICAgICAgICAgID8gc3R5bGVSZW1vdmUgOiB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICAgICAgPyBzdHlsZUZ1bmN0aW9uXG4gICAgICAgICAgICA6IHN0eWxlQ29uc3RhbnQpKG5hbWUsIHZhbHVlLCBwcmlvcml0eSA9PSBudWxsID8gXCJcIiA6IHByaW9yaXR5KSlcbiAgICAgIDogc3R5bGVWYWx1ZSh0aGlzLm5vZGUoKSwgbmFtZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHlsZVZhbHVlKG5vZGUsIG5hbWUpIHtcbiAgcmV0dXJuIG5vZGUuc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKVxuICAgICAgfHwgZGVmYXVsdFZpZXcobm9kZSkuZ2V0Q29tcHV0ZWRTdHlsZShub2RlLCBudWxsKS5nZXRQcm9wZXJ0eVZhbHVlKG5hbWUpO1xufVxuIiwgImZ1bmN0aW9uIHByb3BlcnR5UmVtb3ZlKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGRlbGV0ZSB0aGlzW25hbWVdO1xuICB9O1xufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eUNvbnN0YW50KG5hbWUsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB0aGlzW25hbWVdID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHByb3BlcnR5RnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciB2ID0gdmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBpZiAodiA9PSBudWxsKSBkZWxldGUgdGhpc1tuYW1lXTtcbiAgICBlbHNlIHRoaXNbbmFtZV0gPSB2O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA+IDFcbiAgICAgID8gdGhpcy5lYWNoKCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyBwcm9wZXJ0eVJlbW92ZSA6IHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBwcm9wZXJ0eUZ1bmN0aW9uXG4gICAgICAgICAgOiBwcm9wZXJ0eUNvbnN0YW50KShuYW1lLCB2YWx1ZSkpXG4gICAgICA6IHRoaXMubm9kZSgpW25hbWVdO1xufVxuIiwgImZ1bmN0aW9uIGNsYXNzQXJyYXkoc3RyaW5nKSB7XG4gIHJldHVybiBzdHJpbmcudHJpbSgpLnNwbGl0KC9efFxccysvKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NMaXN0KG5vZGUpIHtcbiAgcmV0dXJuIG5vZGUuY2xhc3NMaXN0IHx8IG5ldyBDbGFzc0xpc3Qobm9kZSk7XG59XG5cbmZ1bmN0aW9uIENsYXNzTGlzdChub2RlKSB7XG4gIHRoaXMuX25vZGUgPSBub2RlO1xuICB0aGlzLl9uYW1lcyA9IGNsYXNzQXJyYXkobm9kZS5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKSB8fCBcIlwiKTtcbn1cblxuQ2xhc3NMaXN0LnByb3RvdHlwZSA9IHtcbiAgYWRkOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGkgPSB0aGlzLl9uYW1lcy5pbmRleE9mKG5hbWUpO1xuICAgIGlmIChpIDwgMCkge1xuICAgICAgdGhpcy5fbmFtZXMucHVzaChuYW1lKTtcbiAgICAgIHRoaXMuX25vZGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgdGhpcy5fbmFtZXMuam9pbihcIiBcIikpO1xuICAgIH1cbiAgfSxcbiAgcmVtb3ZlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGkgPSB0aGlzLl9uYW1lcy5pbmRleE9mKG5hbWUpO1xuICAgIGlmIChpID49IDApIHtcbiAgICAgIHRoaXMuX25hbWVzLnNwbGljZShpLCAxKTtcbiAgICAgIHRoaXMuX25vZGUuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgdGhpcy5fbmFtZXMuam9pbihcIiBcIikpO1xuICAgIH1cbiAgfSxcbiAgY29udGFpbnM6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5fbmFtZXMuaW5kZXhPZihuYW1lKSA+PSAwO1xuICB9XG59O1xuXG5mdW5jdGlvbiBjbGFzc2VkQWRkKG5vZGUsIG5hbWVzKSB7XG4gIHZhciBsaXN0ID0gY2xhc3NMaXN0KG5vZGUpLCBpID0gLTEsIG4gPSBuYW1lcy5sZW5ndGg7XG4gIHdoaWxlICgrK2kgPCBuKSBsaXN0LmFkZChuYW1lc1tpXSk7XG59XG5cbmZ1bmN0aW9uIGNsYXNzZWRSZW1vdmUobm9kZSwgbmFtZXMpIHtcbiAgdmFyIGxpc3QgPSBjbGFzc0xpc3Qobm9kZSksIGkgPSAtMSwgbiA9IG5hbWVzLmxlbmd0aDtcbiAgd2hpbGUgKCsraSA8IG4pIGxpc3QucmVtb3ZlKG5hbWVzW2ldKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NlZFRydWUobmFtZXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzZWRBZGQodGhpcywgbmFtZXMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjbGFzc2VkRmFsc2UobmFtZXMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGNsYXNzZWRSZW1vdmUodGhpcywgbmFtZXMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBjbGFzc2VkRnVuY3Rpb24obmFtZXMsIHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAodmFsdWUuYXBwbHkodGhpcywgYXJndW1lbnRzKSA/IGNsYXNzZWRBZGQgOiBjbGFzc2VkUmVtb3ZlKSh0aGlzLCBuYW1lcyk7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gIHZhciBuYW1lcyA9IGNsYXNzQXJyYXkobmFtZSArIFwiXCIpO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIHZhciBsaXN0ID0gY2xhc3NMaXN0KHRoaXMubm9kZSgpKSwgaSA9IC0xLCBuID0gbmFtZXMubGVuZ3RoO1xuICAgIHdoaWxlICgrK2kgPCBuKSBpZiAoIWxpc3QuY29udGFpbnMobmFtZXNbaV0pKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gdGhpcy5lYWNoKCh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgPyBjbGFzc2VkRnVuY3Rpb24gOiB2YWx1ZVxuICAgICAgPyBjbGFzc2VkVHJ1ZVxuICAgICAgOiBjbGFzc2VkRmFsc2UpKG5hbWVzLCB2YWx1ZSkpO1xufVxuIiwgImZ1bmN0aW9uIHRleHRSZW1vdmUoKSB7XG4gIHRoaXMudGV4dENvbnRlbnQgPSBcIlwiO1xufVxuXG5mdW5jdGlvbiB0ZXh0Q29uc3RhbnQodmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdGV4dEZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdiA9IHZhbHVlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgdGhpcy50ZXh0Q29udGVudCA9IHYgPT0gbnVsbCA/IFwiXCIgOiB2O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aFxuICAgICAgPyB0aGlzLmVhY2godmFsdWUgPT0gbnVsbFxuICAgICAgICAgID8gdGV4dFJlbW92ZSA6ICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICAgID8gdGV4dEZ1bmN0aW9uXG4gICAgICAgICAgOiB0ZXh0Q29uc3RhbnQpKHZhbHVlKSlcbiAgICAgIDogdGhpcy5ub2RlKCkudGV4dENvbnRlbnQ7XG59XG4iLCAiZnVuY3Rpb24gaHRtbFJlbW92ZSgpIHtcbiAgdGhpcy5pbm5lckhUTUwgPSBcIlwiO1xufVxuXG5mdW5jdGlvbiBodG1sQ29uc3RhbnQodmFsdWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaW5uZXJIVE1MID0gdmFsdWU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGh0bWxGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHYgPSB2YWx1ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIHRoaXMuaW5uZXJIVE1MID0gdiA9PSBudWxsID8gXCJcIiA6IHY7XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMuZWFjaCh2YWx1ZSA9PSBudWxsXG4gICAgICAgICAgPyBodG1sUmVtb3ZlIDogKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiXG4gICAgICAgICAgPyBodG1sRnVuY3Rpb25cbiAgICAgICAgICA6IGh0bWxDb25zdGFudCkodmFsdWUpKVxuICAgICAgOiB0aGlzLm5vZGUoKS5pbm5lckhUTUw7XG59XG4iLCAiZnVuY3Rpb24gcmFpc2UoKSB7XG4gIGlmICh0aGlzLm5leHRTaWJsaW5nKSB0aGlzLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQodGhpcyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5lYWNoKHJhaXNlKTtcbn1cbiIsICJmdW5jdGlvbiBsb3dlcigpIHtcbiAgaWYgKHRoaXMucHJldmlvdXNTaWJsaW5nKSB0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMsIHRoaXMucGFyZW50Tm9kZS5maXJzdENoaWxkKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVhY2gobG93ZXIpO1xufVxuIiwgImltcG9ydCBjcmVhdG9yIGZyb20gXCIuLi9jcmVhdG9yLmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGNyZWF0ZSA9IHR5cGVvZiBuYW1lID09PSBcImZ1bmN0aW9uXCIgPyBuYW1lIDogY3JlYXRvcihuYW1lKTtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0KGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmFwcGVuZENoaWxkKGNyZWF0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgfSk7XG59XG4iLCAiaW1wb3J0IGNyZWF0b3IgZnJvbSBcIi4uL2NyZWF0b3IuanNcIjtcbmltcG9ydCBzZWxlY3RvciBmcm9tIFwiLi4vc2VsZWN0b3IuanNcIjtcblxuZnVuY3Rpb24gY29uc3RhbnROdWxsKCkge1xuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24obmFtZSwgYmVmb3JlKSB7XG4gIHZhciBjcmVhdGUgPSB0eXBlb2YgbmFtZSA9PT0gXCJmdW5jdGlvblwiID8gbmFtZSA6IGNyZWF0b3IobmFtZSksXG4gICAgICBzZWxlY3QgPSBiZWZvcmUgPT0gbnVsbCA/IGNvbnN0YW50TnVsbCA6IHR5cGVvZiBiZWZvcmUgPT09IFwiZnVuY3Rpb25cIiA/IGJlZm9yZSA6IHNlbGVjdG9yKGJlZm9yZSk7XG4gIHJldHVybiB0aGlzLnNlbGVjdChmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5pbnNlcnRCZWZvcmUoY3JlYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksIHNlbGVjdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpIHx8IG51bGwpO1xuICB9KTtcbn1cbiIsICJmdW5jdGlvbiByZW1vdmUoKSB7XG4gIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudE5vZGU7XG4gIGlmIChwYXJlbnQpIHBhcmVudC5yZW1vdmVDaGlsZCh0aGlzKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVhY2gocmVtb3ZlKTtcbn1cbiIsICJmdW5jdGlvbiBzZWxlY3Rpb25fY2xvbmVTaGFsbG93KCkge1xuICB2YXIgY2xvbmUgPSB0aGlzLmNsb25lTm9kZShmYWxzZSksIHBhcmVudCA9IHRoaXMucGFyZW50Tm9kZTtcbiAgcmV0dXJuIHBhcmVudCA/IHBhcmVudC5pbnNlcnRCZWZvcmUoY2xvbmUsIHRoaXMubmV4dFNpYmxpbmcpIDogY2xvbmU7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdGlvbl9jbG9uZURlZXAoKSB7XG4gIHZhciBjbG9uZSA9IHRoaXMuY2xvbmVOb2RlKHRydWUpLCBwYXJlbnQgPSB0aGlzLnBhcmVudE5vZGU7XG4gIHJldHVybiBwYXJlbnQgPyBwYXJlbnQuaW5zZXJ0QmVmb3JlKGNsb25lLCB0aGlzLm5leHRTaWJsaW5nKSA6IGNsb25lO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbihkZWVwKSB7XG4gIHJldHVybiB0aGlzLnNlbGVjdChkZWVwID8gc2VsZWN0aW9uX2Nsb25lRGVlcCA6IHNlbGVjdGlvbl9jbG9uZVNoYWxsb3cpO1xufVxuIiwgImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoXG4gICAgICA/IHRoaXMucHJvcGVydHkoXCJfX2RhdGFfX1wiLCB2YWx1ZSlcbiAgICAgIDogdGhpcy5ub2RlKCkuX19kYXRhX187XG59XG4iLCAiZnVuY3Rpb24gY29udGV4dExpc3RlbmVyKGxpc3RlbmVyKSB7XG4gIHJldHVybiBmdW5jdGlvbihldmVudCkge1xuICAgIGxpc3RlbmVyLmNhbGwodGhpcywgZXZlbnQsIHRoaXMuX19kYXRhX18pO1xuICB9O1xufVxuXG5mdW5jdGlvbiBwYXJzZVR5cGVuYW1lcyh0eXBlbmFtZXMpIHtcbiAgcmV0dXJuIHR5cGVuYW1lcy50cmltKCkuc3BsaXQoL158XFxzKy8pLm1hcChmdW5jdGlvbih0KSB7XG4gICAgdmFyIG5hbWUgPSBcIlwiLCBpID0gdC5pbmRleE9mKFwiLlwiKTtcbiAgICBpZiAoaSA+PSAwKSBuYW1lID0gdC5zbGljZShpICsgMSksIHQgPSB0LnNsaWNlKDAsIGkpO1xuICAgIHJldHVybiB7dHlwZTogdCwgbmFtZTogbmFtZX07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBvblJlbW92ZSh0eXBlbmFtZSkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG9uID0gdGhpcy5fX29uO1xuICAgIGlmICghb24pIHJldHVybjtcbiAgICBmb3IgKHZhciBqID0gMCwgaSA9IC0xLCBtID0gb24ubGVuZ3RoLCBvOyBqIDwgbTsgKytqKSB7XG4gICAgICBpZiAobyA9IG9uW2pdLCAoIXR5cGVuYW1lLnR5cGUgfHwgby50eXBlID09PSB0eXBlbmFtZS50eXBlKSAmJiBvLm5hbWUgPT09IHR5cGVuYW1lLm5hbWUpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKG8udHlwZSwgby5saXN0ZW5lciwgby5vcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9uWysraV0gPSBvO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoKytpKSBvbi5sZW5ndGggPSBpO1xuICAgIGVsc2UgZGVsZXRlIHRoaXMuX19vbjtcbiAgfTtcbn1cblxuZnVuY3Rpb24gb25BZGQodHlwZW5hbWUsIHZhbHVlLCBvcHRpb25zKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgb24gPSB0aGlzLl9fb24sIG8sIGxpc3RlbmVyID0gY29udGV4dExpc3RlbmVyKHZhbHVlKTtcbiAgICBpZiAob24pIGZvciAodmFyIGogPSAwLCBtID0gb24ubGVuZ3RoOyBqIDwgbTsgKytqKSB7XG4gICAgICBpZiAoKG8gPSBvbltqXSkudHlwZSA9PT0gdHlwZW5hbWUudHlwZSAmJiBvLm5hbWUgPT09IHR5cGVuYW1lLm5hbWUpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyKG8udHlwZSwgby5saXN0ZW5lciwgby5vcHRpb25zKTtcbiAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKG8udHlwZSwgby5saXN0ZW5lciA9IGxpc3RlbmVyLCBvLm9wdGlvbnMgPSBvcHRpb25zKTtcbiAgICAgICAgby52YWx1ZSA9IHZhbHVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcih0eXBlbmFtZS50eXBlLCBsaXN0ZW5lciwgb3B0aW9ucyk7XG4gICAgbyA9IHt0eXBlOiB0eXBlbmFtZS50eXBlLCBuYW1lOiB0eXBlbmFtZS5uYW1lLCB2YWx1ZTogdmFsdWUsIGxpc3RlbmVyOiBsaXN0ZW5lciwgb3B0aW9uczogb3B0aW9uc307XG4gICAgaWYgKCFvbikgdGhpcy5fX29uID0gW29dO1xuICAgIGVsc2Ugb24ucHVzaChvKTtcbiAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24odHlwZW5hbWUsIHZhbHVlLCBvcHRpb25zKSB7XG4gIHZhciB0eXBlbmFtZXMgPSBwYXJzZVR5cGVuYW1lcyh0eXBlbmFtZSArIFwiXCIpLCBpLCBuID0gdHlwZW5hbWVzLmxlbmd0aCwgdDtcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICB2YXIgb24gPSB0aGlzLm5vZGUoKS5fX29uO1xuICAgIGlmIChvbikgZm9yICh2YXIgaiA9IDAsIG0gPSBvbi5sZW5ndGgsIG87IGogPCBtOyArK2opIHtcbiAgICAgIGZvciAoaSA9IDAsIG8gPSBvbltqXTsgaSA8IG47ICsraSkge1xuICAgICAgICBpZiAoKHQgPSB0eXBlbmFtZXNbaV0pLnR5cGUgPT09IG8udHlwZSAmJiB0Lm5hbWUgPT09IG8ubmFtZSkge1xuICAgICAgICAgIHJldHVybiBvLnZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIG9uID0gdmFsdWUgPyBvbkFkZCA6IG9uUmVtb3ZlO1xuICBmb3IgKGkgPSAwOyBpIDwgbjsgKytpKSB0aGlzLmVhY2gob24odHlwZW5hbWVzW2ldLCB2YWx1ZSwgb3B0aW9ucykpO1xuICByZXR1cm4gdGhpcztcbn1cbiIsICJpbXBvcnQgZGVmYXVsdFZpZXcgZnJvbSBcIi4uL3dpbmRvdy5qc1wiO1xuXG5mdW5jdGlvbiBkaXNwYXRjaEV2ZW50KG5vZGUsIHR5cGUsIHBhcmFtcykge1xuICB2YXIgd2luZG93ID0gZGVmYXVsdFZpZXcobm9kZSksXG4gICAgICBldmVudCA9IHdpbmRvdy5DdXN0b21FdmVudDtcblxuICBpZiAodHlwZW9mIGV2ZW50ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBldmVudCA9IG5ldyBldmVudCh0eXBlLCBwYXJhbXMpO1xuICB9IGVsc2Uge1xuICAgIGV2ZW50ID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiRXZlbnRcIik7XG4gICAgaWYgKHBhcmFtcykgZXZlbnQuaW5pdEV2ZW50KHR5cGUsIHBhcmFtcy5idWJibGVzLCBwYXJhbXMuY2FuY2VsYWJsZSksIGV2ZW50LmRldGFpbCA9IHBhcmFtcy5kZXRhaWw7XG4gICAgZWxzZSBldmVudC5pbml0RXZlbnQodHlwZSwgZmFsc2UsIGZhbHNlKTtcbiAgfVxuXG4gIG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG59XG5cbmZ1bmN0aW9uIGRpc3BhdGNoQ29uc3RhbnQodHlwZSwgcGFyYW1zKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gZGlzcGF0Y2hFdmVudCh0aGlzLCB0eXBlLCBwYXJhbXMpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBkaXNwYXRjaEZ1bmN0aW9uKHR5cGUsIHBhcmFtcykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGRpc3BhdGNoRXZlbnQodGhpcywgdHlwZSwgcGFyYW1zLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih0eXBlLCBwYXJhbXMpIHtcbiAgcmV0dXJuIHRoaXMuZWFjaCgodHlwZW9mIHBhcmFtcyA9PT0gXCJmdW5jdGlvblwiXG4gICAgICA/IGRpc3BhdGNoRnVuY3Rpb25cbiAgICAgIDogZGlzcGF0Y2hDb25zdGFudCkodHlwZSwgcGFyYW1zKSk7XG59XG4iLCAiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24qKCkge1xuICBmb3IgKHZhciBncm91cHMgPSB0aGlzLl9ncm91cHMsIGogPSAwLCBtID0gZ3JvdXBzLmxlbmd0aDsgaiA8IG07ICsraikge1xuICAgIGZvciAodmFyIGdyb3VwID0gZ3JvdXBzW2pdLCBpID0gMCwgbiA9IGdyb3VwLmxlbmd0aCwgbm9kZTsgaSA8IG47ICsraSkge1xuICAgICAgaWYgKG5vZGUgPSBncm91cFtpXSkgeWllbGQgbm9kZTtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgc2VsZWN0aW9uX3NlbGVjdCBmcm9tIFwiLi9zZWxlY3QuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fc2VsZWN0QWxsIGZyb20gXCIuL3NlbGVjdEFsbC5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9zZWxlY3RDaGlsZCBmcm9tIFwiLi9zZWxlY3RDaGlsZC5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9zZWxlY3RDaGlsZHJlbiBmcm9tIFwiLi9zZWxlY3RDaGlsZHJlbi5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9maWx0ZXIgZnJvbSBcIi4vZmlsdGVyLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2RhdGEgZnJvbSBcIi4vZGF0YS5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9lbnRlciBmcm9tIFwiLi9lbnRlci5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9leGl0IGZyb20gXCIuL2V4aXQuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fam9pbiBmcm9tIFwiLi9qb2luLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX21lcmdlIGZyb20gXCIuL21lcmdlLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX29yZGVyIGZyb20gXCIuL29yZGVyLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3NvcnQgZnJvbSBcIi4vc29ydC5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9jYWxsIGZyb20gXCIuL2NhbGwuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fbm9kZXMgZnJvbSBcIi4vbm9kZXMuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fbm9kZSBmcm9tIFwiLi9ub2RlLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3NpemUgZnJvbSBcIi4vc2l6ZS5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9lbXB0eSBmcm9tIFwiLi9lbXB0eS5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9lYWNoIGZyb20gXCIuL2VhY2guanNcIjtcbmltcG9ydCBzZWxlY3Rpb25fYXR0ciBmcm9tIFwiLi9hdHRyLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3N0eWxlIGZyb20gXCIuL3N0eWxlLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3Byb3BlcnR5IGZyb20gXCIuL3Byb3BlcnR5LmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2NsYXNzZWQgZnJvbSBcIi4vY2xhc3NlZC5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl90ZXh0IGZyb20gXCIuL3RleHQuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25faHRtbCBmcm9tIFwiLi9odG1sLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX3JhaXNlIGZyb20gXCIuL3JhaXNlLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2xvd2VyIGZyb20gXCIuL2xvd2VyLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2FwcGVuZCBmcm9tIFwiLi9hcHBlbmQuanNcIjtcbmltcG9ydCBzZWxlY3Rpb25faW5zZXJ0IGZyb20gXCIuL2luc2VydC5qc1wiO1xuaW1wb3J0IHNlbGVjdGlvbl9yZW1vdmUgZnJvbSBcIi4vcmVtb3ZlLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2Nsb25lIGZyb20gXCIuL2Nsb25lLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2RhdHVtIGZyb20gXCIuL2RhdHVtLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX29uIGZyb20gXCIuL29uLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2Rpc3BhdGNoIGZyb20gXCIuL2Rpc3BhdGNoLmpzXCI7XG5pbXBvcnQgc2VsZWN0aW9uX2l0ZXJhdG9yIGZyb20gXCIuL2l0ZXJhdG9yLmpzXCI7XG5cbmV4cG9ydCB2YXIgcm9vdCA9IFtudWxsXTtcblxuZXhwb3J0IGZ1bmN0aW9uIFNlbGVjdGlvbihncm91cHMsIHBhcmVudHMpIHtcbiAgdGhpcy5fZ3JvdXBzID0gZ3JvdXBzO1xuICB0aGlzLl9wYXJlbnRzID0gcGFyZW50cztcbn1cblxuZnVuY3Rpb24gc2VsZWN0aW9uKCkge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbihbW2RvY3VtZW50LmRvY3VtZW50RWxlbWVudF1dLCByb290KTtcbn1cblxuZnVuY3Rpb24gc2VsZWN0aW9uX3NlbGVjdGlvbigpIHtcbiAgcmV0dXJuIHRoaXM7XG59XG5cblNlbGVjdGlvbi5wcm90b3R5cGUgPSBzZWxlY3Rpb24ucHJvdG90eXBlID0ge1xuICBjb25zdHJ1Y3RvcjogU2VsZWN0aW9uLFxuICBzZWxlY3Q6IHNlbGVjdGlvbl9zZWxlY3QsXG4gIHNlbGVjdEFsbDogc2VsZWN0aW9uX3NlbGVjdEFsbCxcbiAgc2VsZWN0Q2hpbGQ6IHNlbGVjdGlvbl9zZWxlY3RDaGlsZCxcbiAgc2VsZWN0Q2hpbGRyZW46IHNlbGVjdGlvbl9zZWxlY3RDaGlsZHJlbixcbiAgZmlsdGVyOiBzZWxlY3Rpb25fZmlsdGVyLFxuICBkYXRhOiBzZWxlY3Rpb25fZGF0YSxcbiAgZW50ZXI6IHNlbGVjdGlvbl9lbnRlcixcbiAgZXhpdDogc2VsZWN0aW9uX2V4aXQsXG4gIGpvaW46IHNlbGVjdGlvbl9qb2luLFxuICBtZXJnZTogc2VsZWN0aW9uX21lcmdlLFxuICBzZWxlY3Rpb246IHNlbGVjdGlvbl9zZWxlY3Rpb24sXG4gIG9yZGVyOiBzZWxlY3Rpb25fb3JkZXIsXG4gIHNvcnQ6IHNlbGVjdGlvbl9zb3J0LFxuICBjYWxsOiBzZWxlY3Rpb25fY2FsbCxcbiAgbm9kZXM6IHNlbGVjdGlvbl9ub2RlcyxcbiAgbm9kZTogc2VsZWN0aW9uX25vZGUsXG4gIHNpemU6IHNlbGVjdGlvbl9zaXplLFxuICBlbXB0eTogc2VsZWN0aW9uX2VtcHR5LFxuICBlYWNoOiBzZWxlY3Rpb25fZWFjaCxcbiAgYXR0cjogc2VsZWN0aW9uX2F0dHIsXG4gIHN0eWxlOiBzZWxlY3Rpb25fc3R5bGUsXG4gIHByb3BlcnR5OiBzZWxlY3Rpb25fcHJvcGVydHksXG4gIGNsYXNzZWQ6IHNlbGVjdGlvbl9jbGFzc2VkLFxuICB0ZXh0OiBzZWxlY3Rpb25fdGV4dCxcbiAgaHRtbDogc2VsZWN0aW9uX2h0bWwsXG4gIHJhaXNlOiBzZWxlY3Rpb25fcmFpc2UsXG4gIGxvd2VyOiBzZWxlY3Rpb25fbG93ZXIsXG4gIGFwcGVuZDogc2VsZWN0aW9uX2FwcGVuZCxcbiAgaW5zZXJ0OiBzZWxlY3Rpb25faW5zZXJ0LFxuICByZW1vdmU6IHNlbGVjdGlvbl9yZW1vdmUsXG4gIGNsb25lOiBzZWxlY3Rpb25fY2xvbmUsXG4gIGRhdHVtOiBzZWxlY3Rpb25fZGF0dW0sXG4gIG9uOiBzZWxlY3Rpb25fb24sXG4gIGRpc3BhdGNoOiBzZWxlY3Rpb25fZGlzcGF0Y2gsXG4gIFtTeW1ib2wuaXRlcmF0b3JdOiBzZWxlY3Rpb25faXRlcmF0b3Jcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHNlbGVjdGlvbjtcbiIsICJpbXBvcnQge1NlbGVjdGlvbiwgcm9vdH0gZnJvbSBcIi4vc2VsZWN0aW9uL2luZGV4LmpzXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gIHJldHVybiB0eXBlb2Ygc2VsZWN0b3IgPT09IFwic3RyaW5nXCJcbiAgICAgID8gbmV3IFNlbGVjdGlvbihbW2RvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpXV0sIFtkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRdKVxuICAgICAgOiBuZXcgU2VsZWN0aW9uKFtbc2VsZWN0b3JdXSwgcm9vdCk7XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBOb3RlUmVjb3JkIH0gZnJvbSBcIi4vdHlwZXNcIjtcclxuaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XHJcbmltcG9ydCB7IHNhdmVTdG9yZSB9IGZyb20gXCIuL3N0b3JlXCI7XHJcbmltcG9ydCB7IHdyaXRlRnJvbnRtYXR0ZXJEZWNrcyB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7XHJcbmltcG9ydCB7IHJlYWROb3RlUmVjb3JkIH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcclxuaW1wb3J0IHsgQWN0aXZlTW9kYWwgfSBmcm9tIFwiLi9BY3RpdmVNb2RhbFwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIERlY2tQaWNrZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFwcDogQXBwLFxyXG4gICAgcHJpdmF0ZSBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXHJcbiAgKSB7XHJcbiAgICBzdXBlcihhcHApO1xyXG4gIH1cclxuXHJcbiAgb25PcGVuKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogXCJDaG9vc2UgYSBkZWNrXCIgfSk7XHJcblxyXG4gICAgLy8gQ29sbGVjdCBkZWNrIFx1MjE5MiBub3RlcyBtYXBwaW5nIGZyb20gbWV0YWRhdGFDYWNoZVxyXG4gICAgY29uc3QgZGVja01hcCA9IG5ldyBNYXA8c3RyaW5nLCBOb3RlUmVjb3JkW10+KCk7XHJcblxyXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKSkge1xyXG4gICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcclxuICAgICAgaWYgKCFmbT8uYWN0aXZlKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZDogTm90ZVJlY29yZCA9IHJlYWROb3RlUmVjb3JkKHRoaXMucGx1Z2luLCBmaWxlKTsgIFxyXG4gIFxyXG4gICAgICAvLyBcImRlZmF1bHRcIiBhbHdheXMgZ2V0cyBldmVyeSBhY3RpdmUgbm90ZSAgXHJcbiAgICAgIGlmICghZGVja01hcC5oYXMoXCJkZWZhdWx0XCIpKSBkZWNrTWFwLnNldChcImRlZmF1bHRcIiwgW10pOyAgXHJcbiAgICAgIGRlY2tNYXAuZ2V0KFwiZGVmYXVsdFwiKSEucHVzaChyZWNvcmQpOyAgXHJcbiAgXHJcbiAgICAgIC8vIGFsc28gYWRkIHRvIGFueSBuYW1lZCBkZWNrcyB0aGUgbm90ZSBiZWxvbmdzIHRvICBcclxuICAgICAgY29uc3QgbmFtZWREZWNrczogc3RyaW5nW10gPSBBcnJheS5pc0FycmF5KGZtLmRlY2tzKSA/IGZtLmRlY2tzLmZpbHRlcigoZDogc3RyaW5nKSA9PiBkICE9PSBcImRlZmF1bHRcIikgOiBbXTsgIFxyXG4gICAgICBmb3IgKGNvbnN0IGRlY2sgb2YgbmFtZWREZWNrcykgeyAgXHJcbiAgICAgICAgaWYgKCFkZWNrTWFwLmhhcyhkZWNrKSkgZGVja01hcC5zZXQoZGVjaywgW10pOyAgXHJcbiAgICAgICAgZGVja01hcC5nZXQoZGVjaykhLnB1c2gocmVjb3JkKTsgIFxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGRlY2tNYXAuc2l6ZSA9PT0gMCkge1xyXG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBhY3RpdmUgbm90ZXMgZm91bmQuXCIgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTb3J0OiBtb3N0IHJlY2VudGx5IHVzZWQgZmlyc3Q7IFwiZGVmYXVsdFwiIGFsd2F5cyBsaXN0ZWRcclxuICAgIGNvbnN0IGxhc3RVc2VkID0gdGhpcy5wbHVnaW4uZGF0YS5kZWNrTGFzdFVzZWQgPz8ge307XHJcbiAgICBjb25zdCBzb3J0ZWQgPSBbLi4uZGVja01hcC5rZXlzKCldLnNvcnQoKGEsIGIpID0+IHtcclxuICAgICAgY29uc3QgdGEgPSBsYXN0VXNlZFthXSA/PyBcIlwiO1xyXG4gICAgICBjb25zdCB0YiA9IGxhc3RVc2VkW2JdID8/IFwiXCI7XHJcbiAgICAgIHJldHVybiB0Yi5sb2NhbGVDb21wYXJlKHRhKTsgLy8gZGVzY2VuZGluZ1xyXG4gICAgfSk7XHJcblxyXG4gICAgZm9yIChjb25zdCBkZWNrTmFtZSBvZiBzb3J0ZWQpIHtcclxuICAgICAgY29uc3Qgbm90ZXMgPSBkZWNrTWFwLmdldChkZWNrTmFtZSkhO1xyXG4gICAgICBjb25zdCByb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1kZWNrLXJvd1wiIH0pO1xyXG5cclxuICAgICAgY29uc3QgYnRuID0gcm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuICAgICAgICB0ZXh0OiBgJHtkZWNrTmFtZSA9PT0gXCJkZWZhdWx0XCIgPyBcIkRlZmF1bHQgZGVja1wiIDogZGVja05hbWV9ICgke25vdGVzLmxlbmd0aH0pYCxcclxuICAgICAgICBjbHM6IFwibW9kLWN0YSBzcGFjZWQtZGVjay1waWNrLWJ0blwiLFxyXG4gICAgICB9KTtcclxuICAgICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgLy8gUmVjb3JkIGxhc3QgdXNlZFxyXG4gICAgICAgIHRoaXMucGx1Z2luLmRhdGEuZGVja0xhc3RVc2VkID0geyAuLi5sYXN0VXNlZCwgW2RlY2tOYW1lXTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH07XHJcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgIGNvbnN0IG1vZGFsID0gbmV3IEFjdGl2ZU1vZGFsKHRoaXMuYXBwLCB0aGlzLnBsdWdpbiwgbm90ZXMsIGRlY2tOYW1lKTtcclxuICAgICAgICAvLyBSZXN1bWUgc2F2ZWQgc2Vzc2lvbiBpZiBhdmFpbGFibGVcclxuICAgICAgICBjb25zdCBzYXZlZCA9IHRoaXMucGx1Z2luLmRhdGEuY3JhbVNlc3Npb25zPy5bZGVja05hbWVdO1xyXG4gICAgICAgIGlmIChzYXZlZCAmJiAoc2F2ZWQucmVtYWluaW5nLmxlbmd0aCA+IDAgfHwgc2F2ZWQuZmFpbGVkLmxlbmd0aCA+IDApKSB7XHJcbiAgICAgICAgICBjb25zdCBhbGxOb3RlcyA9IFsuLi5ub3Rlc107XHJcbiAgICAgICAgICBjb25zdCB0b1JlY29yZCA9IChmcDogc3RyaW5nKTogTm90ZVJlY29yZCB8IHVuZGVmaW5lZCA9PiBhbGxOb3Rlcy5maW5kKChuKSA9PiBuLmZpbGVwYXRoID09PSBmcCk7XHJcbiAgICAgICAgICBjb25zdCBmaWx0ZXJSZWNvcmRzID0gKGZwczogc3RyaW5nW10pID0+IGZwcy5tYXAodG9SZWNvcmQpLmZpbHRlcigobik6IG4gaXMgTm90ZVJlY29yZCA9PiBuICE9PSB1bmRlZmluZWQpO1xyXG5cclxuICAgICAgICAgIGNvbnN0IHJlbWFpbmluZyA9IGZpbHRlclJlY29yZHMoc2F2ZWQucmVtYWluaW5nKTtcclxuICAgICAgICAgIGNvbnN0IGZhaWxlZCA9IGZpbHRlclJlY29yZHMoc2F2ZWQuZmFpbGVkKTtcclxuXHJcbiAgICAgICAgICAvLyBPbmx5IHJlc3VtZSBpZiB0aGVyZSdzIGFjdHVhbGx5IHNvbWV0aGluZyBsZWZ0IGFmdGVyIGZpbHRlcmluZyBvdXQgcmVuYW1lZC9kZWxldGVkIG5vdGVzXHJcbiAgICAgICAgICBpZiAocmVtYWluaW5nLmxlbmd0aCA+IDAgfHwgZmFpbGVkLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY29uc3QgbWlzc2luZ0NvdW50ID0gc2F2ZWQucmVtYWluaW5nLmxlbmd0aCAtIHJlbWFpbmluZy5sZW5ndGggKyBzYXZlZC5mYWlsZWQubGVuZ3RoIC0gZmFpbGVkLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgIG1vZGFsLnJlc3VtZVNlc3Npb24oe1xyXG4gICAgICAgICAgICAgIHJlbWFpbmluZyxcclxuICAgICAgICAgICAgICBmYWlsZWQsXHJcbiAgICAgICAgICAgICAgcHJvZ3Jlc3NMb2c6IHNhdmVkLnByb2dyZXNzTG9nLFxyXG4gICAgICAgICAgICAgIGN1cnJlbnRSb3VuZFNpemU6IHNhdmVkLmN1cnJlbnRSb3VuZFNpemUgLSBtaXNzaW5nQ291bnQsXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBtb2RhbC5vcGVuKCk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgaWYgKGRlY2tOYW1lICE9PSBcImRlZmF1bHRcIikge1xyXG4gICAgICAgIGNvbnN0IHJlbmFtZUJ0biA9IHJvdy5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWhkci1idG5cIiB9KTtcclxuICAgICAgICBzZXRJY29uKHJlbmFtZUJ0biwgXCJwZW5jaWxcIik7XHJcbiAgICAgICAgcmVuYW1lQnRuLnNldEF0dHJpYnV0ZShcImFyaWEtbGFiZWxcIiwgXCJSZW5hbWUgZGVja1wiKTtcclxuICAgICAgICByZW5hbWVCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XHJcbiAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgICAgICAgIC8vIFN3YXAgYnV0dG9uIGZvciBhbiBpbnB1dFxyXG4gICAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XHJcbiAgICAgICAgICBpbnB1dC5jbGFzc05hbWUgPSBcInNwYWNlZC1kZWNrLXJlbmFtZS1pbnB1dFwiO1xyXG4gICAgICAgICAgaW5wdXQudmFsdWUgPSBkZWNrTmFtZTtcclxuICAgICAgICAgIGJ0bi5yZXBsYWNlV2l0aChpbnB1dCk7XHJcbiAgICAgICAgICByZW5hbWVCdG4ucmVtb3ZlKCk7XHJcbiAgICAgICAgICBpbnB1dC5mb2N1cygpO1xyXG4gICAgICAgICAgaW5wdXQuc2VsZWN0KCk7XHJcblxyXG4gICAgICAgICAgbGV0IHN1Ym1pdHRlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgIGNvbnN0IGNhbmNlbCA9ICgpID0+IHtcclxuICAgICAgICAgICAgaW5wdXQucmVwbGFjZVdpdGgoYnRuKTtcclxuICAgICAgICAgICAgcm93LmFwcGVuZENoaWxkKHJlbmFtZUJ0bik7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIGNvbnN0IGNvbmZpcm0gPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChzdWJtaXR0ZWQpIHJldHVybjtcclxuICAgICAgICAgICAgc3VibWl0dGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgY29uc3QgbmV3TmFtZSA9IGlucHV0LnZhbHVlLnRyaW0oKTtcclxuICAgICAgICAgICAgaWYgKCFuZXdOYW1lIHx8IG5ld05hbWUgPT09IGRlY2tOYW1lKSB7XHJcbiAgICAgICAgICAgICAgY2FuY2VsKCk7XHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuYW1lRGVjayhkZWNrTmFtZSwgbmV3TmFtZSk7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGFzeW5jIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gXCJFbnRlclwiKSB7XHJcbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgIGF3YWl0IGNvbmZpcm0oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09IFwiRXNjYXBlXCIpIHtcclxuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgY2FuY2VsKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHtcclxuICAgICAgICAgICAgdm9pZCBjb25maXJtKCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyByZW5hbWVEZWNrKG9sZE5hbWU6IHN0cmluZywgbmV3TmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAvLyAxLiBVcGRhdGUgZnJvbnRtYXR0ZXIgZmlyc3QgKGJlZm9yZSBmb2xkZXIgcmVuYW1lIGNoYW5nZXMgZmlsZSBwYXRocylcclxuICAgIGZvciAoY29uc3QgZmlsZSBvZiB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkpIHtcclxuICAgICAgY29uc3QgZGVja3MgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI/LmRlY2tzO1xyXG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZGVja3MpIHx8ICFkZWNrcy5pbmNsdWRlcyhvbGROYW1lKSkgY29udGludWU7XHJcbiAgICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJEZWNrcyhcclxuICAgICAgICB0aGlzLmFwcCxcclxuICAgICAgICBmaWxlLnBhdGgsXHJcbiAgICAgICAgZGVja3MubWFwKChkOiBzdHJpbmcpID0+IChkID09PSBvbGROYW1lID8gbmV3TmFtZSA6IGQpKSxcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyAyLiBPcHRpb25hbGx5IHJlbmFtZSBtYXRjaGluZyBmb2xkZXJcclxuICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZW5hbWVGb2xkZXJXaXRoRGVjaykge1xyXG4gICAgICBjb25zdCBtYXRjaGluZ0ZvbGRlcnMgPSB0aGlzLmFwcC52YXVsdC5nZXRBbGxGb2xkZXJzKCkuZmlsdGVyKChmKSA9PiBmLm5hbWUgPT09IG9sZE5hbWUpO1xyXG4gICAgICBpZiAobWF0Y2hpbmdGb2xkZXJzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgIGNvbnN0IGZvbGRlciA9IG1hdGNoaW5nRm9sZGVyc1swXTtcclxuICAgICAgICBjb25zdCBwYXJlbnRQYXRoID0gZm9sZGVyLnBhcmVudD8ucGF0aDtcclxuICAgICAgICBjb25zdCBuZXdGb2xkZXJQYXRoID0gcGFyZW50UGF0aCAmJiBwYXJlbnRQYXRoICE9PSBcIi9cIiA/IGAke3BhcmVudFBhdGh9LyR7bmV3TmFtZX1gIDogbmV3TmFtZTtcclxuICAgICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZW5hbWUoZm9sZGVyLCBuZXdGb2xkZXJQYXRoKTtcclxuICAgICAgfSBlbHNlIGlmIChtYXRjaGluZ0ZvbGRlcnMubGVuZ3RoID4gMSkge1xyXG4gICAgICAgIG5ldyBOb3RpY2UoYERlY2sgcmVuYW1lZCwgYnV0IGZvbGRlciB3YXMgbm90IHJlbmFtZWQ6IG11bHRpcGxlIGZvbGRlcnMgbmFtZWQgXCIke29sZE5hbWV9XCIgZXhpc3QuYCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyAzLiBNaWdyYXRlIHBsdWdpbiBkYXRhIGtleXNcclxuICAgIGNvbnN0IGxhc3RVc2VkID0gdGhpcy5wbHVnaW4uZGF0YS5kZWNrTGFzdFVzZWQ7XHJcbiAgICBpZiAobGFzdFVzZWQ/LltvbGROYW1lXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIGxhc3RVc2VkW25ld05hbWVdID0gbGFzdFVzZWRbb2xkTmFtZV07XHJcbiAgICAgIGRlbGV0ZSBsYXN0VXNlZFtvbGROYW1lXTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzZXNzaW9ucyA9IHRoaXMucGx1Z2luLmRhdGEuY3JhbVNlc3Npb25zO1xyXG4gICAgaWYgKHNlc3Npb25zPy5bb2xkTmFtZV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBzZXNzaW9uc1tuZXdOYW1lXSA9IHNlc3Npb25zW29sZE5hbWVdO1xyXG4gICAgICBkZWxldGUgc2Vzc2lvbnNbb2xkTmFtZV07XHJcbiAgICB9XHJcblxyXG4gICAgYXdhaXQgc2F2ZVN0b3JlKHRoaXMucGx1Z2luLCB0aGlzLnBsdWdpbi5kYXRhKTtcclxuICAgIHRoaXMub25PcGVuKCk7XHJcbiAgfVxyXG5cclxuICBvbkNsb3NlKCkge1xyXG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuICB9XHJcbn1cclxuIiwgImltcG9ydCB7IEFwcCwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IE5vdGVSZWNvcmQgfSBmcm9tIFwiLi90eXBlc1wiO1xuaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgeyBzYXZlU3RvcmUgfSBmcm9tIFwiLi9zdG9yZVwiO1xuaW1wb3J0IHsgQmFzZU5vdGVNb2RhbCB9IGZyb20gXCIuL0Jhc2VOb3RlTW9kYWxcIjtcbmltcG9ydCB7IHNodWZmbGVBcnJheSwgZ2V0QWN0aXZlTm90ZXMgfSBmcm9tIFwiLi91dGlsc1wiO1xuXG5leHBvcnQgY2xhc3MgQWN0aXZlTW9kYWwgZXh0ZW5kcyBCYXNlTm90ZU1vZGFsIHtcbiAgcHJpdmF0ZSByZW1haW5pbmc6IE5vdGVSZWNvcmRbXTtcbiAgcHJpdmF0ZSBwYXNzZWQ6IE5vdGVSZWNvcmRbXSA9IFtdO1xuICBwcml2YXRlIGZhaWxlZDogTm90ZVJlY29yZFtdID0gW107XG4gIHByaXZhdGUgcHJvZ3Jlc3NMb2c6IChcInBhc3NcIiB8IFwiZmFpbFwiKVtdID0gW107XG4gIHByaXZhdGUgY3VycmVudFJvdW5kU2l6ZTogbnVtYmVyO1xuICBwcm90ZWN0ZWQgbm90ZSE6IE5vdGVSZWNvcmQ7XG4gIHByaXZhdGUgYWxsTm90ZXM6IE5vdGVSZWNvcmRbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByb3RlY3RlZCBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXG4gICAgbm90ZXM6IE5vdGVSZWNvcmRbXSxcbiAgICBkZWNrTmFtZTogc3RyaW5nID0gXCJkZWZhdWx0XCIsXG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gICAgdGhpcy5kZWNrTmFtZSA9IGRlY2tOYW1lO1xuICAgIHRoaXMuYWxsTm90ZXMgPSBbLi4ubm90ZXNdO1xuICAgIHRoaXMucmVtYWluaW5nID0gWy4uLm5vdGVzXTtcbiAgICB0aGlzLmN1cnJlbnRSb3VuZFNpemUgPSBub3Rlcy5sZW5ndGg7XG4gIH1cbiAgcHJvdGVjdGVkIHNob3dSZXN0YXJ0QnV0dG9uID0gdHJ1ZTtcblxuICBwcm90ZWN0ZWQgb25SZXN0YXJ0Q2xpY2soKTogdm9pZCB7XG4gICAgdm9pZCB0aGlzLnJlc3RhcnRTZXNzaW9uKHRoaXMuYWxsTm90ZXMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFN0YXR1c1RleHQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGhpcy5yZW1haW5pbmcubGVuZ3RofSByZW1haW5pbmcgXHUwMEI3ICR7dGhpcy5mYWlsZWQubGVuZ3RofSB0byByZXRyeWA7XG4gIH1cblxuICBwdWJsaWMgcmVzdW1lU2Vzc2lvbihzdGF0ZToge1xuICAgIHJlbWFpbmluZzogTm90ZVJlY29yZFtdO1xuICAgIGZhaWxlZDogTm90ZVJlY29yZFtdO1xuICAgIHByb2dyZXNzTG9nOiAoXCJwYXNzXCIgfCBcImZhaWxcIilbXTtcbiAgICBjdXJyZW50Um91bmRTaXplOiBudW1iZXI7XG4gIH0pIHtcbiAgICB0aGlzLnJlbWFpbmluZyA9IHN0YXRlLnJlbWFpbmluZztcbiAgICB0aGlzLmZhaWxlZCA9IHN0YXRlLmZhaWxlZDtcbiAgICB0aGlzLnByb2dyZXNzTG9nID0gc3RhdGUucHJvZ3Jlc3NMb2c7XG4gICAgdGhpcy5jdXJyZW50Um91bmRTaXplID0gc3RhdGUuY3VycmVudFJvdW5kU2l6ZTtcbiAgfVxuXG4gIGFzeW5jIG9uT3BlbigpIHtcbiAgICBpZiAodGhpcy5yZW1haW5pbmcubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLnNob3dTdW1tYXJ5KHRoaXMuZmFpbGVkLmxlbmd0aCA9PT0gMCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IHRoaXMucmVuZGVyKCk7XG4gICAgdGhpcy5zZXR1cFZhdWx0TGlzdGVuZXIoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVuZGVyKCkge1xuICAgIGlmICh0aGlzLnJlbWFpbmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMuc2hvd1N1bW1hcnkodGhpcy5mYWlsZWQubGVuZ3RoID09PSAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgY29udGVudEVsLmVtcHR5KCk7XG4gICAgdGhpcy5ub3RlID0gdGhpcy5yZW1haW5pbmdbMF07XG4gICAgYXdhaXQgdGhpcy5yZW5kZXJOb3RlKGNvbnRlbnRFbCk7XG4gIH1cbiAgcHJvdGVjdGVkIHJlbmRlckJ1dHRvbnMoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGJ0blJvdyA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWJ0bi1yb3dcIiB9KTtcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHsgbGFiZWw6IFwiTm90IG5vdy9QYXNzXCIsIGNsczogXCJwYXNzXCIsIGNiOiAoKSA9PiB0aGlzLnJlc3BvbmQoXCJwYXNzXCIpIH0pO1xuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgeyBsYWJlbDogXCJSZXRyeVwiLCBjbHM6IFwiZmFpbFwiLCBjYjogKCkgPT4gdGhpcy5yZXNwb25kKFwiZmFpbFwiKSB9KTtcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHtcbiAgICAgIGljb246IFwic2h1ZmZsZVwiLFxuICAgICAgY2xzOiBcImljb25cIixcbiAgICAgIHRvb2x0aXA6IFwiU2h1ZmZsZSByZW1haW5pbmcgY2FyZHNcIixcbiAgICAgIGNiOiBhc3luYyAoKSA9PiB7XG4gICAgICAgIHRoaXMucmVtYWluaW5nID0gc2h1ZmZsZUFycmF5KHRoaXMucmVtYWluaW5nKTtcbiAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXIoKTtcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCB7IGljb246IFwicm91dGVcIiwgY2xzOiBcInJvdXRlXCIsIHRvb2x0aXA6IFwiUm91dGUgXHUyMTkyXCIsIGNiOiAoKSA9PiB0aGlzLnJvdXRlTm90ZSgpIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldFByb2dyZXNzU2VnbWVudHMoKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IHNlZ21lbnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jdXJyZW50Um91bmRTaXplOyBpKyspIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucHJvZ3Jlc3NMb2dbaV07XG4gICAgICBpZiAocmVzdWx0ID09PSBcInBhc3NcIikgc2VnbWVudHMucHVzaChcInNwYWNlZC1wcm9ncmVzcy1wYXNzXCIpO1xuICAgICAgZWxzZSBpZiAocmVzdWx0ID09PSBcImZhaWxcIikgc2VnbWVudHMucHVzaChcInNwYWNlZC1wcm9ncmVzcy1mYWlsXCIpO1xuICAgICAgZWxzZSBzZWdtZW50cy5wdXNoKFwiXCIpO1xuICAgIH1cbiAgICByZXR1cm4gc2VnbWVudHM7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlc3BvbmQocmVzdWx0OiBcInBhc3NcIiB8IFwiZmFpbFwiKSB7XG4gICAgYXdhaXQgdGhpcy5zYXZlVGl0bGUoKTtcbiAgICBhd2FpdCB0aGlzLnNhdmVCb2R5RWRpdHMoKTtcbiAgICBjb25zdCBub3RlID0gdGhpcy5yZW1haW5pbmcuc2hpZnQoKSE7XG4gICAgdGhpcy5wcm9ncmVzc0xvZy5wdXNoKHJlc3VsdCk7XG5cbiAgICBpZiAocmVzdWx0ID09PSBcInBhc3NcIikge1xuICAgICAgdGhpcy5wYXNzZWQucHVzaChub3RlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5mYWlsZWQucHVzaChub3RlKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5yZW1haW5pbmcubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAodGhpcy5mYWlsZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRoaXMuc2hvd1N1bW1hcnkodHJ1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnNob3dTdW1tYXJ5KGZhbHNlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHByaXZhdGUgc2hvd1N1bW1hcnkoaXNEb25lOiBib29sZWFuKSB7XG4gICAgdGhpcy5jbGVhbnVwRWRpdG9ycygpO1xuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGlmIChpc0RvbmUpIHtcbiAgICAgIHZvaWQgdGhpcy5jbGVhclNlc3Npb24oKTtcbiAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJBbGwgZG9uZSFcIiB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlJvdW5kIGNvbXBsZXRlIVwiIH0pO1xuICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBQYXNzZWQ6ICR7dGhpcy5wYXNzZWQubGVuZ3RofWAgfSk7XG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYEZhaWxlZDogJHt0aGlzLmZhaWxlZC5sZW5ndGh9YCB9KTtcbiAgICB9XG4gICAgY29uc3QgYnRuUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYnRuLXJvd1wiIH0pO1xuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywge1xuICAgICAgbGFiZWw6IGlzRG9uZSA/IFwiUmVzdGFydCBzZXNzaW9uXCIgOiBcIk5leHQgcm91bmRcIixcbiAgICAgIGNsczogXCJzdW1tYXJ5LWFjdGlvblwiLFxuICAgICAgbW9kaWZpZXI6IFwiY3RhXCIsXG4gICAgICBjYjogKCkgPT4gdGhpcy5yZXN0YXJ0U2Vzc2lvbihpc0RvbmUgPyB0aGlzLmFsbE5vdGVzIDogdGhpcy5mYWlsZWQpLFxuICAgIH0pO1xuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgeyBsYWJlbDogXCJDbG9zZVwiLCBjbHM6IFwic3VtbWFyeS1jbG9zZVwiLCBjYjogKCkgPT4gdGhpcy5jbG9zZSgpIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjbGVhclNlc3Npb24oKSB7XG4gICAgaWYgKHRoaXMucGx1Z2luLmRhdGEuY3JhbVNlc3Npb25zKSB7XG4gICAgICBkZWxldGUgdGhpcy5wbHVnaW4uZGF0YS5jcmFtU2Vzc2lvbnNbdGhpcy5kZWNrTmFtZV07XG4gICAgfVxuICAgIGF3YWl0IHNhdmVTdG9yZSh0aGlzLnBsdWdpbiwgdGhpcy5wbHVnaW4uZGF0YSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNhdmVTZXNzaW9uKCkge1xuICAgIHRoaXMucGx1Z2luLmRhdGEuY3JhbVNlc3Npb25zID0gdGhpcy5wbHVnaW4uZGF0YS5jcmFtU2Vzc2lvbnMgPz8ge307XG4gICAgdGhpcy5wbHVnaW4uZGF0YS5jcmFtU2Vzc2lvbnNbdGhpcy5kZWNrTmFtZV0gPSB7XG4gICAgICByZW1haW5pbmc6IHRoaXMucmVtYWluaW5nLm1hcCgobikgPT4gbi5maWxlcGF0aCksXG4gICAgICBmYWlsZWQ6IHRoaXMuZmFpbGVkLm1hcCgobikgPT4gbi5maWxlcGF0aCksXG4gICAgICBwcm9ncmVzc0xvZzogWy4uLnRoaXMucHJvZ3Jlc3NMb2ddLFxuICAgICAgY3VycmVudFJvdW5kU2l6ZTogdGhpcy5jdXJyZW50Um91bmRTaXplLFxuICAgIH07XG4gICAgYXdhaXQgc2F2ZVN0b3JlKHRoaXMucGx1Z2luLCB0aGlzLnBsdWdpbi5kYXRhKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVzdGFydFNlc3Npb24oc291cmNlTm90ZXM6IE5vdGVSZWNvcmRbXSkge1xuICAgIHRoaXMucmVtYWluaW5nID0gZ2V0QWN0aXZlTm90ZXModGhpcy5hcHAsIHNvdXJjZU5vdGVzKTtcbiAgICB0aGlzLnBhc3NlZCA9IFtdO1xuICAgIHRoaXMuZmFpbGVkID0gW107XG4gICAgdGhpcy5wcm9ncmVzc0xvZyA9IFtdO1xuICAgIHRoaXMuY3VycmVudFJvdW5kU2l6ZSA9IHRoaXMucmVtYWluaW5nLmxlbmd0aDtcbiAgICBhd2FpdCB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcHJvdGVjdGVkIG9uU2Vzc2lvbkNsb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnJlbWFpbmluZy5sZW5ndGggPiAwIHx8IHRoaXMuZmFpbGVkLmxlbmd0aCA+IDApIHtcbiAgICAgIHZvaWQgdGhpcy5zYXZlU2Vzc2lvbigpO1xuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCB7VEZvbGRlciwgTm90aWNlLCBBcHAsIE1vZGFsIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IHdyaXRlRnJvbnRtYXR0ZXJBY3RpdmUsIHdyaXRlRnJvbnRtYXR0ZXJEZWNrcyB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7XHJcbmltcG9ydCB0eXBlIFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEZvbGRlckRlY2tQaWNrZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICBwcml2YXRlIHNlbGVjdGVkRGVja3M6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xyXG4gIHByaXZhdGUgdXNlRm9sZGVyTmFtZSA9IGZhbHNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFwcDogQXBwLFxyXG4gICAgcHJpdmF0ZSBmb2xkZXI6IFRGb2xkZXIsXHJcbiAgICBwcml2YXRlIHBsdWdpbjogU3BhY2VkRXZlcnl0aGluZ1BsdWdpbixcclxuICApIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgfVxyXG5cclxuICBvbk9wZW4oKSB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBgQWRkIFwiJHt0aGlzLmZvbGRlci5uYW1lfVwiIHRvIGRlY2tgIH0pO1xyXG5cclxuICAgIC8vIE9wdGlvbjogdXNlIGZvbGRlciBuYW1lIGFzIGRlY2tcclxuICAgIGNvbnN0IGZvbGRlclJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2staXRlbVwiIH0pO1xyXG4gICAgY29uc3QgZm9sZGVyQ2hlY2sgPSBmb2xkZXJSb3cuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IHR5cGU6IFwiY2hlY2tib3hcIiB9KTtcclxuICAgIGZvbGRlclJvdy5jcmVhdGVTcGFuKHsgdGV4dDogYENyZWF0ZSBkZWNrOiAke3RoaXMuZm9sZGVyLm5hbWV9Li4uYCB9KTtcclxuICAgIGZvbGRlckNoZWNrLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG4gICAgICB0aGlzLnVzZUZvbGRlck5hbWUgPSBmb2xkZXJDaGVjay5jaGVja2VkO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRXhpc3RpbmcgZGVja3NcclxuICAgIGNvbnN0IGV4aXN0aW5nRGVja3MgPSB0aGlzLmdldEV4aXN0aW5nRGVja3MoKTtcclxuICAgIGlmIChleGlzdGluZ0RlY2tzLmxlbmd0aCA+IDApIHtcclxuICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiT3IgYWRkIHRvIGV4aXN0aW5nIGRlY2s6XCIsIGNsczogXCJzcGFjZWQtZGVjay1lbXB0eVwiIH0pO1xyXG4gICAgICBmb3IgKGNvbnN0IGRlY2sgb2YgZXhpc3RpbmdEZWNrcykge1xyXG4gICAgICAgIGNvbnN0IHJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWRlY2staXRlbVwiIH0pO1xyXG4gICAgICAgIGNvbnN0IGNiID0gcm93LmNyZWF0ZUVsKFwiaW5wdXRcIiwgeyB0eXBlOiBcImNoZWNrYm94XCIgfSk7XHJcbiAgICAgICAgcm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiBkZWNrIH0pO1xyXG4gICAgICAgIGNiLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgaWYgKGNiLmNoZWNrZWQpIHRoaXMuc2VsZWN0ZWREZWNrcy5hZGQoZGVjayk7XHJcbiAgICAgICAgICBlbHNlIHRoaXMuc2VsZWN0ZWREZWNrcy5kZWxldGUoZGVjayk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBDb25maXJtIGJ1dHRvblxyXG4gICAgY29uc3QgYnRuUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYnRuLXJvd1wiIH0pO1xyXG4gICAgY29uc3QgY2FuY2VsQnRuID0gYnRuUm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJDYW5jZWxcIiB9KTtcclxuICAgIGNhbmNlbEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4gdGhpcy5jbG9zZSgpKTtcclxuXHJcbiAgICBjb25zdCBjb25maXJtQnRuID0gYnRuUm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJBZGQgdG8gZGVja1wiLCBjbHM6IFwibW9kLWN0YVwiIH0pO1xyXG4gICAgY29uZmlybUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBkZWNrc1RvQXNzaWduOiBzdHJpbmdbXSA9IFsuLi50aGlzLnNlbGVjdGVkRGVja3NdO1xyXG4gICAgICBpZiAodGhpcy51c2VGb2xkZXJOYW1lKSBkZWNrc1RvQXNzaWduLnB1c2godGhpcy5mb2xkZXIubmFtZSk7XHJcblxyXG4gICAgICBjb25zdCBmb2xkZXJGaWxlcyA9IHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKS5maWx0ZXIoKGYpID0+IGYucGF0aC5zdGFydHNXaXRoKHRoaXMuZm9sZGVyLnBhdGggKyBcIi9cIikpO1xyXG5cclxuICAgICAgZm9yIChjb25zdCBmIG9mIGZvbGRlckZpbGVzKSB7XHJcbiAgICAgICAgYXdhaXQgd3JpdGVGcm9udG1hdHRlckFjdGl2ZSh0aGlzLmFwcCwgZi5wYXRoLCB0cnVlKTtcclxuICAgICAgICBpZiAoZGVja3NUb0Fzc2lnbi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBjb25zdCBleGlzdGluZ0ZtID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZik/LmZyb250bWF0dGVyO1xyXG4gICAgICAgICAgY29uc3QgZXhpc3RpbmdEZWNrczogc3RyaW5nW10gPSBBcnJheS5pc0FycmF5KGV4aXN0aW5nRm0/LmRlY2tzKVxyXG4gICAgICAgICAgICA/IGV4aXN0aW5nRm0uZGVja3NcclxuICAgICAgICAgICAgOiBleGlzdGluZ0ZtPy5kZWNrc1xyXG4gICAgICAgICAgICAgID8gW2V4aXN0aW5nRm0uZGVja3NdXHJcbiAgICAgICAgICAgICAgOiBbXTtcclxuICAgICAgICAgIGNvbnN0IG1lcmdlZERlY2tzID0gWy4uLm5ldyBTZXQoWy4uLmV4aXN0aW5nRGVja3MsIC4uLmRlY2tzVG9Bc3NpZ25dKV07XHJcbiAgICAgICAgICBhd2FpdCB3cml0ZUZyb250bWF0dGVyRGVja3ModGhpcy5hcHAsIGYucGF0aCwgbWVyZ2VkRGVja3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgbmV3IE5vdGljZShgQWRkZWQgJHtmb2xkZXJGaWxlcy5sZW5ndGh9IG5vdGUke2ZvbGRlckZpbGVzLmxlbmd0aCAhPT0gMSA/IFwic1wiIDogXCJcIn0gdG8gZGVjay5gKTtcclxuICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldEV4aXN0aW5nRGVja3MoKTogc3RyaW5nW10ge1xyXG4gICAgY29uc3QgZGVja1NldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgZm9yIChjb25zdCBmaWxlIG9mIHRoaXMuYXBwLnZhdWx0LmdldE1hcmtkb3duRmlsZXMoKSkge1xyXG4gICAgICBjb25zdCBmbSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpPy5mcm9udG1hdHRlcjtcclxuICAgICAgY29uc3QgZGVja3MgPSBmbT8uZGVja3M7XHJcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRlY2tzKSkgZGVja3MuZm9yRWFjaCgoZDogc3RyaW5nKSA9PiBkZWNrU2V0LmFkZChkKSk7XHJcbiAgICAgIGVsc2UgaWYgKHR5cGVvZiBkZWNrcyA9PT0gXCJzdHJpbmdcIiAmJiBkZWNrcykgZGVja1NldC5hZGQoZGVja3MpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFsuLi5kZWNrU2V0XS5zb3J0KCk7XHJcbiAgfVxyXG5cclxuICBvbkNsb3NlKCkge1xyXG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuICB9XHJcbn1cclxuIiwgImltcG9ydCB7IEFwcCwgTm90aWNlLCBzZXRJY29uLCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBBY3Rpb25Ob3RlLCBTeXN0ZW1TZXNzaW9uIH0gZnJvbSBcIi4vdHlwZXNcIjtcclxuaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XHJcbmltcG9ydCB7IHNhdmVTdG9yZSB9IGZyb20gXCIuL3N0b3JlXCI7XHJcbmltcG9ydCB7IEJhc2VOb3RlTW9kYWwgfSBmcm9tIFwiLi9CYXNlTm90ZU1vZGFsXCI7XHJcbmltcG9ydCB7XHJcbiAgc2h1ZmZsZUFycmF5LFxyXG4gIGdldEN1cnJlbnRUaW1lYmxvY2ssXHJcbiAgZmlsdGVyQnlFbmVyZ3lMZXZlbCxcclxuICBmaWx0ZXJCeVRpbWVibG9jayxcclxuICBmaWx0ZXJCeUNvbnRleHQsXHJcbiAgZ2V0QWxsQ29udGV4dFZhbHVlcyxcclxuICBpc0R1ZSxcclxuICB0b2RheVxyXG59IGZyb20gXCIuL3V0aWxzXCI7XHJcbmltcG9ydCB7XHJcbiAgd3JpdGVGcm9udG1hdHRlckFjdGl2ZSxcclxuICB3cml0ZUZyb250bWF0dGVyUmVjdXJyaW5nQ29tcGxldGUsXHJcbiAgd3JpdGVGcm9udG1hdHRlclNraXAsXHJcbiAgcmVhZE5vdGVSZWNvcmQsXHJcbn0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjs7XHJcbmltcG9ydCB7IFN1YnRhc2tNb2RhbCB9IGZyb20gXCIuL1N1YnRhc2tNb2RhbFwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFN5c3RlbU1vZGFsIGV4dGVuZHMgQmFzZU5vdGVNb2RhbCB7XHJcbiAgcHJvdGVjdGVkIHBsdWdpbjogU3BhY2VkRXZlcnl0aGluZ1BsdWdpbjtcclxuICBwcm90ZWN0ZWQgbm90ZSE6IEFjdGlvbk5vdGU7XHJcblxyXG4gIHByaXZhdGUgYWxsQWN0aW9uTm90ZXM6IEFjdGlvbk5vdGVbXSA9IFtdO1xyXG4gIHByaXZhdGUgcmVtYWluaW5nOiBBY3Rpb25Ob3RlW10gPSBbXTtcclxuICBwcml2YXRlIHBhc3NlZDogQWN0aW9uTm90ZVtdID0gW107XHJcbiAgcHJpdmF0ZSBmYWlsZWQ6IEFjdGlvbk5vdGVbXSA9IFtdO1xyXG4gIHByaXZhdGUgcHJvZ3Jlc3NMb2c6IChcInBhc3NcIiB8IFwiZmFpbFwiIHwgXCJza2lwXCIpW10gPSBbXTtcclxuICBwcml2YXRlIGN1cnJlbnRSb3VuZFNpemUgPSAwO1xyXG4gIHByaXZhdGUgZW5lcmd5TGV2ZWw6IFwiaGlnaFwiIHwgXCJsb3dcIiB8IG51bGwgPSBudWxsO1xyXG4gIHByaXZhdGUgYWN0aXZlVGltZWJsb2Nrczogc3RyaW5nW10gPSBbXTtcclxuICBwcml2YXRlIGFjdGl2ZUNvbnRleHRzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICBwcm90ZWN0ZWQgc2hvd1Jlc3RhcnRCdXR0b24gPSB0cnVlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luKSB7XHJcbiAgICBzdXBlcihhcHApO1xyXG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgfVxyXG5cclxuICAvLyBcdTI1MDBcdTI1MDAgQmFzZU5vdGVNb2RhbCBob29rcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuXHJcbiAgcHJvdGVjdGVkIGFzeW5jIHJlbmRlck1vZGFsKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3Qgc2F2ZWQgPSB0aGlzLnBsdWdpbi5kYXRhLnN5c3RlbVNlc3Npb247XHJcbiAgICBpZiAoc2F2ZWQpIHtcclxuICAgICAgYXdhaXQgdGhpcy5yZXN1bWVTZXNzaW9uKHNhdmVkKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmVuZXJneUxldmVsID09PSBudWxsKSB7XHJcbiAgICAgIHRoaXMuc2hvd0VuZXJneVBpY2tlcigpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMucmVtYWluaW5nLmxlbmd0aCA9PT0gMCAmJiB0aGlzLmZhaWxlZC5sZW5ndGggPT09IDApIHtcclxuICAgICAgYXdhaXQgdGhpcy5zaG93U3VtbWFyeSh0cnVlKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMucmVtYWluaW5nLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBhd2FpdCB0aGlzLnNob3dTdW1tYXJ5KGZhbHNlKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG4gICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgICB0aGlzLm5vdGUgPSB0aGlzLnJlbWFpbmluZ1swXTtcclxuICAgIGF3YWl0IHRoaXMucmVuZGVyTm90ZShjb250ZW50RWwpO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIGFzeW5jIHJlbmRlckV4dHJhQ29udGVudChjb250ZW50RWw6IEhUTUxFbGVtZW50KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBza2lwQ291bnQgPSB0aGlzLm5vdGUuc2tpcHBlZCA/PyAwO1xyXG4gICAgaWYgKHNraXBDb3VudCA+PSAyKSB7XHJcbiAgICAgIHRoaXMucmVuZGVyTGVlY2hCYW5uZXIoY29udGVudEVsKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCBnZXRTdGF0dXNUZXh0KCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gYCR7dGhpcy5yZW1haW5pbmcubGVuZ3RofSByZW1haW5pbmcgXHUwMEI3ICR7dGhpcy5mYWlsZWQubGVuZ3RofSB0byByZXRyeWA7XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgZ2V0UHJvZ3Jlc3NTZWdtZW50cygpOiBzdHJpbmdbXSB7XHJcbiAgICBjb25zdCBzZWdtZW50czogc3RyaW5nW10gPSBbXTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jdXJyZW50Um91bmRTaXplOyBpKyspIHtcclxuICAgICAgY29uc3QgbG9nID0gdGhpcy5wcm9ncmVzc0xvZ1tpXTtcclxuICAgICAgaWYgKGxvZyA9PT0gXCJwYXNzXCIpIHNlZ21lbnRzLnB1c2goXCJzcGFjZWQtcHJvZ3Jlc3MtcGFzc1wiKTtcclxuICAgICAgZWxzZSBpZiAobG9nID09PSBcImZhaWxcIikgc2VnbWVudHMucHVzaChcInNwYWNlZC1wcm9ncmVzcy1mYWlsXCIpO1xyXG4gICAgICBlbHNlIGlmIChsb2cgPT09IFwic2tpcFwiKSBzZWdtZW50cy5wdXNoKFwic3BhY2VkLXByb2dyZXNzLXNraXBcIik7XHJcbiAgICAgIGVsc2Ugc2VnbWVudHMucHVzaChcIlwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBzZWdtZW50cztcclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCByZW5kZXJCdXR0b25zKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuICAgIGNvbnN0IGJ0blJvdyA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWJ0bi1yb3dcIiB9KTtcclxuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgeyBsYWJlbDogXCJQYXNzXCIsIGNsczogXCJwYXNzXCIsIGNiOiAoKSA9PiB0aGlzLnJlc3BvbmQoXCJwYXNzXCIpIH0pO1xyXG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCB7IGxhYmVsOiBcIlJldHJ5XCIsIGNsczogXCJmYWlsXCIsIGNiOiAoKSA9PiB0aGlzLnJlc3BvbmQoXCJmYWlsXCIpIH0pO1xyXG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCB7IGxhYmVsOiBcIlNraXBcIiwgY2xzOiBcInNraXBcIiwgdG9vbHRpcDogXCJTa2lwIGZvciB0b2RheVwiLCBjYjogKCkgPT4gdGhpcy5za2lwTm90ZSgpIH0pO1xyXG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCB7XHJcbiAgICAgIGljb246IFwic2h1ZmZsZVwiLFxyXG4gICAgICBjbHM6IFwiaWNvblwiLFxyXG4gICAgICB0b29sdGlwOiBcIlNodWZmbGUgcmVtYWluaW5nXCIsXHJcbiAgICAgIGNiOiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5yZW1haW5pbmcgPSBzaHVmZmxlQXJyYXkodGhpcy5yZW1haW5pbmcpO1xyXG4gICAgICAgIGF3YWl0IHRoaXMucmVuZGVyTW9kYWwoKTtcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCB7IGljb246IFwicm91dGVcIiwgY2xzOiBcInJvdXRlXCIsIHRvb2x0aXA6IFwiUm91dGUgXHUyMTkyXCIsIGNiOiAoKSA9PiB0aGlzLnJvdXRlTm90ZSgpIH0pO1xyXG5cclxuICAgIC8vIFx1MjUwMFx1MjUwMCBTdWJ0YXNrIGJ1dHRvbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICAgIGNvbnN0IHN1YnRhc2tOb3RlcyA9IHRoaXMuZ2V0U3VidGFza05vdGVzKCk7XHJcbiAgICBjb25zdCBzdWJ0YXNrQnRuID0gdGhpcy5hZGRCdG4oYnRuUm93LCB7XHJcbiAgICAgIGljb246IFwibGlzdC1jaGVja3NcIixcclxuICAgICAgY2xzOiBcInN1YnRhc2tzXCIsXHJcbiAgICAgIHRvb2x0aXA6XHJcbiAgICAgICAgc3VidGFza05vdGVzLmxlbmd0aCA+IDBcclxuICAgICAgICAgID8gYE9wZW4gJHtzdWJ0YXNrTm90ZXMubGVuZ3RofSBzdWJ0YXNrJHtzdWJ0YXNrTm90ZXMubGVuZ3RoICE9PSAxID8gXCJzXCIgOiBcIlwifWBcclxuICAgICAgICAgIDogXCJObyBzdWJ0YXNrcyBpbiB0aGlzIG5vdGVcIixcclxuICAgICAgY2I6ICgpID0+IHtcclxuICAgICAgICBpZiAoc3VidGFza05vdGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xyXG4gICAgICAgIG5ldyBTdWJ0YXNrTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luLCBzdWJ0YXNrTm90ZXMpLm9wZW4oKTtcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgaWYgKHN1YnRhc2tOb3Rlcy5sZW5ndGggPT09IDApIHN1YnRhc2tCdG4uc2V0RGlzYWJsZWQodHJ1ZSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHNraXBOb3RlKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5zYXZlVGl0bGUoKTtcclxuICAgIGF3YWl0IHRoaXMuc2F2ZUJvZHlFZGl0cygpO1xyXG4gICAgY29uc3Qgbm90ZSA9IHRoaXMucmVtYWluaW5nLnNoaWZ0KCkhO1xyXG4gICAgdGhpcy5wcm9ncmVzc0xvZy5wdXNoKFwic2tpcFwiKTtcclxuICAgIGF3YWl0IHdyaXRlRnJvbnRtYXR0ZXJTa2lwKHRoaXMuYXBwLCBub3RlLmZpbGVwYXRoKTtcclxuICAgIGNvbnN0IHRvZGF5U3RyID0gdG9kYXkoKTtcclxuICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5wbHVnaW4uZGF0YS5zeXN0ZW1Ta2lwcGVkVG9kYXk7XHJcbiAgICBpZiAoIWVudHJ5IHx8IGVudHJ5LmRhdGUgIT09IHRvZGF5U3RyKSB7XHJcbiAgICAgIHRoaXMucGx1Z2luLmRhdGEuc3lzdGVtU2tpcHBlZFRvZGF5ID0geyBkYXRlOiB0b2RheVN0ciwgZmlsZXBhdGhzOiBbbm90ZS5maWxlcGF0aF0gfTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGVudHJ5LmZpbGVwYXRocy5wdXNoKG5vdGUuZmlsZXBhdGgpO1xyXG4gICAgfVxyXG4gICAgYXdhaXQgc2F2ZVN0b3JlKHRoaXMucGx1Z2luLCB0aGlzLnBsdWdpbi5kYXRhKTtcclxuICAgIGF3YWl0IHRoaXMucmVuZGVyTW9kYWwoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXBwbHlGaWx0ZXJzSW5saW5lKCk6IHZvaWQge1xyXG4gICAgY29uc3QgcHJvY2Vzc2VkID0gbmV3IFNldChbLi4udGhpcy5wYXNzZWQubWFwKChuKSA9PiBuLmZpbGVwYXRoKSwgLi4udGhpcy5mYWlsZWQubWFwKChuKSA9PiBuLmZpbGVwYXRoKV0pO1xyXG5cclxuICAgIC8vIEtlZXAgY3VycmVudCBub3RlIGF0IGZyb250IGlmIHN0aWxsIHZhbGlkXHJcbiAgICBjb25zdCBjdXJyZW50UGF0aCA9IHRoaXMubm90ZT8uZmlsZXBhdGg7XHJcbiAgICB0aGlzLmJ1aWxkRmlsdGVyZWRSZW1haW5pbmcodGhpcy5hbGxBY3Rpb25Ob3RlcywgcHJvY2Vzc2VkKTtcclxuXHJcbiAgICBjb25zdCBjdXJyZW50U3RpbGxWYWxpZCA9IHRoaXMucmVtYWluaW5nLmZpbmQoKG4pID0+IG4uZmlsZXBhdGggPT09IGN1cnJlbnRQYXRoKTtcclxuICAgIGlmIChjdXJyZW50U3RpbGxWYWxpZCkge1xyXG4gICAgICB0aGlzLnJlbWFpbmluZyA9IFtjdXJyZW50U3RpbGxWYWxpZCwgLi4udGhpcy5yZW1haW5pbmcuZmlsdGVyKChuKSA9PiBuLmZpbGVwYXRoICE9PSBjdXJyZW50UGF0aCldO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHRvdGFsID0gdGhpcy5yZW1haW5pbmcubGVuZ3RoICsgdGhpcy5wYXNzZWQubGVuZ3RoICsgdGhpcy5mYWlsZWQubGVuZ3RoO1xyXG4gICAgdGhpcy5jdXJyZW50Um91bmRTaXplID0gdGhpcy5wcm9ncmVzc0xvZy5sZW5ndGggKyB0aGlzLnJlbWFpbmluZy5sZW5ndGg7XHJcbiAgICB0aGlzLnJlZnJlc2hQcm9ncmVzc0JhcigpO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIHJlbmRlckV4dHJhSGVhZGVyQnV0dG9ucyhoZWFkZXJSaWdodDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuICAgIC8vIFx1MjUwMFx1MjUwMCBUaW1lYmxvY2sgcGlja2VyIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gICAgbGV0IHRiRHJvcGRvd246IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcbiAgICBjb25zdCB0YkJ0biA9IGhlYWRlclJpZ2h0LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtaGRyLWJ0blwiIH0pO1xyXG4gICAgc2V0SWNvbih0YkJ0biwgXCJjbG9ja1wiKTtcclxuICAgIHRiQnRuLnNldEF0dHJpYnV0ZShcclxuICAgICAgXCJhcmlhLWxhYmVsXCIsXHJcbiAgICAgIGBUaW1lYmxvY2s6ICR7dGhpcy5hY3RpdmVUaW1lYmxvY2tzLmxlbmd0aCA/IHRoaXMuYWN0aXZlVGltZWJsb2Nrcy5qb2luKFwiLCBcIikgOiBcIkFsbFwifWAsXHJcbiAgICApO1xyXG4gICAgdGJCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgaWYgKHRiRHJvcGRvd24pIHtcclxuICAgICAgICB0YkRyb3Bkb3duLnJlbW92ZSgpO1xyXG4gICAgICAgIHRiRHJvcGRvd24gPSBudWxsO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICB0YkRyb3Bkb3duID0gaGVhZGVyUmlnaHQuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC10aW1lYmxvY2stcGlja2VyXCIgfSk7XHJcbiAgICAgIGZvciAoY29uc3QgYmxvY2sgb2YgW1wibW9ybmluZ1wiLCBcImFmdGVybm9vblwiLCBcImV2ZW5pbmdcIiwgXCJuaWdodFwiXSkge1xyXG4gICAgICAgIGNvbnN0IHJvdyA9IHRiRHJvcGRvd24uY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1jb250ZXh0LW9wdGlvblwiIH0pO1xyXG4gICAgICAgIGNvbnN0IGNiID0gcm93LmNyZWF0ZUVsKFwiaW5wdXRcIik7XHJcbiAgICAgICAgY2IudHlwZSA9IFwiY2hlY2tib3hcIjtcclxuICAgICAgICBjYi5jaGVja2VkID0gdGhpcy5hY3RpdmVUaW1lYmxvY2tzLmluY2x1ZGVzKGJsb2NrKTtcclxuICAgICAgICByb3cuY3JlYXRlU3Bhbih7IHRleHQ6IGJsb2NrIH0pO1xyXG4gICAgICAgIGNiLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgaWYgKGNiLmNoZWNrZWQpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmFjdGl2ZVRpbWVibG9ja3MuaW5jbHVkZXMoYmxvY2spKSB0aGlzLmFjdGl2ZVRpbWVibG9ja3MucHVzaChibG9jayk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmFjdGl2ZVRpbWVibG9ja3MgPSB0aGlzLmFjdGl2ZVRpbWVibG9ja3MuZmlsdGVyKChiKSA9PiBiICE9PSBibG9jayk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2b2lkIHRoaXMuYXBwbHlGaWx0ZXJzSW5saW5lKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IG9uT3V0c2lkZSA9IChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcbiAgICAgICAgaWYgKCF0YkRyb3Bkb3duIHx8ICFkb2N1bWVudC5jb250YWlucyh0YkRyb3Bkb3duKSkge1xyXG4gICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBvbk91dHNpZGUpO1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIXRiRHJvcGRvd24uY29udGFpbnMoZS50YXJnZXQgYXMgTm9kZSkgJiYgIXRiQnRuLmNvbnRhaW5zKGUudGFyZ2V0IGFzIE5vZGUpKSB7XHJcbiAgICAgICAgICB0YkRyb3Bkb3duLnJlbW92ZSgpO1xyXG4gICAgICAgICAgdGJEcm9wZG93biA9IG51bGw7XHJcbiAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG9uT3V0c2lkZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG9uT3V0c2lkZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBcdTI1MDBcdTI1MDAgQ29udGV4dCBwaWNrZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgICBsZXQgY3R4RHJvcGRvd246IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcbiAgICBjb25zdCBjdHhCdG4gPSBoZWFkZXJSaWdodC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWhkci1idG5cIiB9KTtcclxuICAgIHNldEljb24oY3R4QnRuLCBcInRhZ1wiKTtcclxuICAgIGN0eEJ0bi5zZXRBdHRyaWJ1dGUoXHJcbiAgICAgIFwiYXJpYS1sYWJlbFwiLFxyXG4gICAgICBgQ29udGV4dDogJHt0aGlzLmFjdGl2ZUNvbnRleHRzLmxlbmd0aCA/IHRoaXMuYWN0aXZlQ29udGV4dHMuam9pbihcIiwgXCIpIDogXCJBbGxcIn1gLFxyXG4gICAgKTtcclxuICAgIGN0eEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICBpZiAoY3R4RHJvcGRvd24pIHtcclxuICAgICAgICBjdHhEcm9wZG93bi5yZW1vdmUoKTtcclxuICAgICAgICBjdHhEcm9wZG93biA9IG51bGw7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbnN0IGFsbENvbnRleHRzID0gZ2V0QWxsQ29udGV4dFZhbHVlcyh0aGlzLmFwcCk7XHJcbiAgICAgIGlmIChhbGxDb250ZXh0cy5sZW5ndGggPT09IDApIHJldHVybjtcclxuICAgICAgY3R4RHJvcGRvd24gPSBoZWFkZXJSaWdodC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWNvbnRleHQtZHJvcGRvd25cIiB9KTtcclxuICAgICAgZm9yIChjb25zdCBjdHggb2YgYWxsQ29udGV4dHMpIHtcclxuICAgICAgICBjb25zdCByb3cgPSBjdHhEcm9wZG93bi5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWNvbnRleHQtb3B0aW9uXCIgfSk7XHJcbiAgICAgICAgY29uc3QgY2IgPSByb3cuY3JlYXRlRWwoXCJpbnB1dFwiKTtcclxuICAgICAgICBjYi50eXBlID0gXCJjaGVja2JveFwiO1xyXG4gICAgICAgIGNiLmNoZWNrZWQgPSB0aGlzLmFjdGl2ZUNvbnRleHRzLmluY2x1ZGVzKGN0eCk7XHJcbiAgICAgICAgcm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiBjdHggfSk7XHJcbiAgICAgICAgY2IuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB7XHJcbiAgICAgICAgICBpZiAoY2IuY2hlY2tlZCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuYWN0aXZlQ29udGV4dHMuaW5jbHVkZXMoY3R4KSkgdGhpcy5hY3RpdmVDb250ZXh0cy5wdXNoKGN0eCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmFjdGl2ZUNvbnRleHRzID0gdGhpcy5hY3RpdmVDb250ZXh0cy5maWx0ZXIoKGMpID0+IGMgIT09IGN0eCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICB2b2lkIHRoaXMuYXBwbHlGaWx0ZXJzSW5saW5lKCk7IC8vIFx1MjE5MCBubyBvbk91dHNpZGUgaGVyZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBvbk91dHNpZGUgaXMgaGVyZSwgaW4gdGhlIGJ1dHRvbiBjbGljayBoYW5kbGVyIFx1MjAxNCBub3QgaW5zaWRlIHRoZSBjaGVja2JveCBoYW5kbGVyXHJcbiAgICAgIGNvbnN0IG9uT3V0c2lkZSA9IChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcbiAgICAgICAgaWYgKCFjdHhEcm9wZG93biB8fCAhZG9jdW1lbnQuY29udGFpbnMoY3R4RHJvcGRvd24pKSB7XHJcbiAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG9uT3V0c2lkZSk7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghY3R4RHJvcGRvd24uY29udGFpbnMoZS50YXJnZXQgYXMgTm9kZSkgJiYgIWN0eEJ0bi5jb250YWlucyhlLnRhcmdldCBhcyBOb2RlKSkge1xyXG4gICAgICAgICAgY3R4RHJvcGRvd24ucmVtb3ZlKCk7XHJcbiAgICAgICAgICBjdHhEcm9wZG93biA9IG51bGw7XHJcbiAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG9uT3V0c2lkZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIG9uT3V0c2lkZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCBvblJlc3RhcnRDbGljaygpOiB2b2lkIHtcclxuICAgIHZvaWQgdGhpcy5yZXN0YXJ0U2Vzc2lvbigpO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIG9uU2Vzc2lvbkNsb3NlKCk6IHZvaWQge1xyXG4gICAgaWYgKHRoaXMucmVtYWluaW5nLmxlbmd0aCA+IDAgfHwgdGhpcy5mYWlsZWQubGVuZ3RoID4gMCkge1xyXG4gICAgICB2b2lkIHRoaXMuc2F2ZVNlc3Npb24oKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBTY3JlZW5zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuICBwcml2YXRlIHNob3dFbmVyZ3lQaWNrZXIoKTogdm9pZCB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIkhvdydzIHlvdXIgZW5lcmd5P1wiIH0pO1xyXG4gICAgY29uc3QgYnRuUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYnRuLXJvd1wiIH0pO1xyXG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCB7XHJcbiAgICAgIGxhYmVsOiBcIkhpZ2ggZW5lcmd5XCIsXHJcbiAgICAgIGNsczogXCJlbmVyZ3ktaGlnaFwiLFxyXG4gICAgICBtb2RpZmllcjogXCJjdGFcIixcclxuICAgICAgY2I6ICgpID0+IHtcclxuICAgICAgICB0aGlzLmVuZXJneUxldmVsID0gXCJoaWdoXCI7XHJcbiAgICAgICAgdm9pZCB0aGlzLnN0YXJ0U2Vzc2lvbihcImhpZ2hcIik7XHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywge1xyXG4gICAgICBsYWJlbDogXCJMb3cgZW5lcmd5XCIsXHJcbiAgICAgIGNsczogXCJlbmVyZ3ktbG93XCIsXHJcbiAgICAgIGNiOiAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5lbmVyZ3lMZXZlbCA9IFwibG93XCI7XHJcbiAgICAgICAgdm9pZCB0aGlzLnN0YXJ0U2Vzc2lvbihcImxvd1wiKTtcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBzdGFydFNlc3Npb24obGV2ZWw6IFwiaGlnaFwiIHwgXCJsb3dcIik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdGhpcy5lbmVyZ3lMZXZlbCA9IGxldmVsO1xyXG4gICAgdGhpcy5hY3RpdmVUaW1lYmxvY2tzID0gW2dldEN1cnJlbnRUaW1lYmxvY2soKV07XHJcbiAgICB0aGlzLmFsbEFjdGlvbk5vdGVzID0gdGhpcy5sb2FkQWN0aW9uTm90ZXMoKTtcclxuXHJcbiAgICBpZiAodGhpcy5hbGxBY3Rpb25Ob3Rlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgbmV3IE5vdGljZShcIk5vIGFjdGlvbiBub3RlcyBmb3VuZCBpbiB2YXVsdC5cIik7XHJcbiAgICAgIHRoaXMuc2hvd0VtcHR5U3RhdGUoKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHByb2Nlc3NlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgaWYgKCF0aGlzLmJ1aWxkRmlsdGVyZWRSZW1haW5pbmcodGhpcy5hbGxBY3Rpb25Ob3RlcywgcHJvY2Vzc2VkKSkge1xyXG4gICAgICBuZXcgTm90aWNlKFwiTm8gYWN0aW9ucyBtYXRjaCBjdXJyZW50IGZpbHRlcnMuIFNob3dpbmcgYWxsIGFjdGl2ZSBhY3Rpb25zLlwiKTtcclxuICAgICAgdGhpcy5hY3RpdmVUaW1lYmxvY2tzID0gW107XHJcbiAgICAgIHRoaXMuYWN0aXZlQ29udGV4dHMgPSBbXTtcclxuICAgICAgdGhpcy5idWlsZEZpbHRlcmVkUmVtYWluaW5nKHRoaXMuYWxsQWN0aW9uTm90ZXMsIHByb2Nlc3NlZCk7XHJcbiAgICB9XHJcbiAgICB0aGlzLnBhc3NlZCA9IFtdO1xyXG4gICAgdGhpcy5mYWlsZWQgPSBbXTtcclxuICAgIHRoaXMucHJvZ3Jlc3NMb2cgPSBbXTtcclxuICAgIGF3YWl0IHRoaXMucmVuZGVyTW9kYWwoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgbmV4dFJvdW5kKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3Qgc291cmNlTm90ZXMgPSBbLi4udGhpcy5mYWlsZWRdO1xyXG4gICAgdGhpcy5wYXNzZWQgPSBbXTtcclxuICAgIHRoaXMuZmFpbGVkID0gW107XHJcbiAgICB0aGlzLnByb2dyZXNzTG9nID0gW107XHJcbiAgICBjb25zdCBwcm9jZXNzZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgIHRoaXMuYnVpbGRGaWx0ZXJlZFJlbWFpbmluZyhzb3VyY2VOb3RlcywgcHJvY2Vzc2VkKTtcclxuICAgIGF3YWl0IHRoaXMucmVuZGVyTW9kYWwoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgcmVzdW1lU2Vzc2lvbihzYXZlZDogU3lzdGVtU2Vzc2lvbik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgZGVsZXRlIHRoaXMucGx1Z2luLmRhdGEuc3lzdGVtU2Vzc2lvbjtcclxuXHJcbiAgICB0aGlzLmFsbEFjdGlvbk5vdGVzID0gdGhpcy5sb2FkQWN0aW9uTm90ZXMoKTtcclxuICAgIHRoaXMucmVtYWluaW5nID0gc2F2ZWQucmVtYWluaW5nXHJcbiAgICAgIC5tYXAoKGZwKSA9PiB0aGlzLmFsbEFjdGlvbk5vdGVzLmZpbmQoKG4pID0+IG4uZmlsZXBhdGggPT09IGZwKSlcclxuICAgICAgLmZpbHRlcigobik6IG4gaXMgQWN0aW9uTm90ZSA9PiBuICE9PSB1bmRlZmluZWQpO1xyXG4gICAgdGhpcy5mYWlsZWQgPSBzYXZlZC5mYWlsZWRcclxuICAgICAgLm1hcCgoZnApID0+IHRoaXMuYWxsQWN0aW9uTm90ZXMuZmluZCgobikgPT4gbi5maWxlcGF0aCA9PT0gZnApKVxyXG4gICAgICAuZmlsdGVyKChuKTogbiBpcyBBY3Rpb25Ob3RlID0+IG4gIT09IHVuZGVmaW5lZCk7XHJcbiAgICB0aGlzLnByb2dyZXNzTG9nID0gWy4uLnNhdmVkLnByb2dyZXNzTG9nXTtcclxuICAgIHRoaXMuY3VycmVudFJvdW5kU2l6ZSA9IHNhdmVkLmN1cnJlbnRSb3VuZFNpemU7XHJcbiAgICB0aGlzLmVuZXJneUxldmVsID0gc2F2ZWQuZW5lcmd5TGV2ZWw7XHJcbiAgICB0aGlzLmFjdGl2ZVRpbWVibG9ja3MgPSBzYXZlZC5hY3RpdmVUaW1lYmxvY2tzID8/IFtdO1xyXG4gICAgdGhpcy5hY3RpdmVDb250ZXh0cyA9IFsuLi5zYXZlZC5hY3RpdmVDb250ZXh0c107XHJcbiAgICBhd2FpdCB0aGlzLnJlbmRlck1vZGFsKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHNob3dTdW1tYXJ5KGlzRG9uZTogYm9vbGVhbik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdGhpcy5jbGVhbnVwRWRpdG9ycygpO1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIGlmIChpc0RvbmUpIHtcclxuICAgICAgYXdhaXQgdGhpcy5jbGVhclNlc3Npb24oKTtcclxuICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkFsbCBkb25lIVwiIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlJvdW5kIGNvbXBsZXRlIVwiIH0pO1xyXG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogYFBhc3NlZDogJHt0aGlzLnBhc3NlZC5sZW5ndGh9YCB9KTtcclxuICAgICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IGBGYWlsZWQ6ICR7dGhpcy5mYWlsZWQubGVuZ3RofWAgfSk7XHJcbiAgICB9XHJcbiAgICBjb25zdCBidG5Sb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1idG4tcm93XCIgfSk7XHJcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHtcclxuICAgICAgbGFiZWw6IGlzRG9uZSA/IFwiUmVzdGFydCBzZXNzaW9uXCIgOiBcIk5leHQgcm91bmRcIixcclxuICAgICAgY2xzOiBcInN1bW1hcnktYWN0aW9uXCIsXHJcbiAgICAgIG1vZGlmaWVyOiBcImN0YVwiLFxyXG4gICAgICBjYjogKCkgPT4gKGlzRG9uZSA/IHZvaWQgdGhpcy5yZXN0YXJ0U2Vzc2lvbigpIDogdm9pZCB0aGlzLm5leHRSb3VuZCgpKSxcclxuICAgIH0pO1xyXG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCB7IGxhYmVsOiBcIkNsb3NlXCIsIGNsczogXCJzdW1tYXJ5LWNsb3NlXCIsIGNiOiAoKSA9PiB0aGlzLmNsb3NlKCkgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHJlc3RhcnRTZXNzaW9uKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgYXdhaXQgdGhpcy5jbGVhclNlc3Npb24oKTtcclxuICAgIHRoaXMuZW5lcmd5TGV2ZWwgPSBudWxsO1xyXG4gICAgdGhpcy5yZW1haW5pbmcgPSBbXTtcclxuICAgIHRoaXMucGFzc2VkID0gW107XHJcbiAgICB0aGlzLmZhaWxlZCA9IFtdO1xyXG4gICAgdGhpcy5wcm9ncmVzc0xvZyA9IFtdO1xyXG4gICAgdGhpcy5jdXJyZW50Um91bmRTaXplID0gMDtcclxuICAgIGF3YWl0IHRoaXMucmVuZGVyTW9kYWwoKTtcclxuICB9XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBOb3RlIHJlc3BvbnNlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gIHByaXZhdGUgYXN5bmMgcmVzcG9uZChyZXN1bHQ6IFwicGFzc1wiIHwgXCJmYWlsXCIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGF3YWl0IHRoaXMuc2F2ZVRpdGxlKCk7XHJcbiAgICBhd2FpdCB0aGlzLnNhdmVCb2R5RWRpdHMoKTtcclxuICAgIGNvbnN0IG5vdGUgPSB0aGlzLnJlbWFpbmluZy5zaGlmdCgpITtcclxuICAgIHRoaXMucHJvZ3Jlc3NMb2cucHVzaChyZXN1bHQpO1xyXG4gICAgaWYgKHJlc3VsdCA9PT0gXCJwYXNzXCIpIHtcclxuICAgICAgdGhpcy5wYXNzZWQucHVzaChub3RlKTtcclxuICAgICAgaWYgKG5vdGUudGltZXNjb3BlKSB7XHJcbiAgICAgICAgYXdhaXQgd3JpdGVGcm9udG1hdHRlclJlY3VycmluZ0NvbXBsZXRlKHRoaXMuYXBwLCBub3RlLmZpbGVwYXRoKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5mYWlsZWQucHVzaChub3RlKTtcclxuICAgIH1cclxuICAgIGF3YWl0IHRoaXMucmVuZGVyTW9kYWwoKTtcclxuICB9XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBTa2lwcGVkIHRyYWNraW5nIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuICBwcml2YXRlIHJlbmRlckxlZWNoQmFubmVyKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpOiB2b2lkIHtcclxuICAgIGNvbnN0IGNvdW50ID0gdGhpcy5ub3RlLnNraXBwZWQgPz8gMDtcclxuICAgIGNvbnN0IGJhbm5lciA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWxlZWNoLWJhbm5lclwiIH0pO1xyXG4gICAgYmFubmVyLmNyZWF0ZVNwYW4oeyB0ZXh0OiBgXHUyNkEwXHVGRTBGIFNraXBwZWQgJHtjb3VudH1cdTAwRDcgXHUyMDE0IGNvbnNpZGVyIHJlc2NoZWR1bGluZyBvciBicmVha2luZyB0aGlzIGRvd24uYCB9KTtcclxuXHJcbiAgICBjb25zdCBhY3Rpb25zID0gYmFubmVyLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtbGVlY2gtYWN0aW9uc1wiIH0pO1xyXG4gICAgdGhpcy5hZGRCdG4oYWN0aW9ucywge1xyXG4gICAgICBsYWJlbDogXCJFZGl0XCIsXHJcbiAgICAgIGNsczogXCJsZWVjaC1lZGl0XCIsXHJcbiAgICAgIGNiOiBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5pc0VkaXRpbmcgPSB0cnVlO1xyXG4gICAgICAgIGF3YWl0IHRoaXMucmVuZGVyTW9kYWwoKTtcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgdGhpcy5hZGRCdG4oYWN0aW9ucywge1xyXG4gICAgICBsYWJlbDogXCJXcm9uZyBjb250ZXh0P1wiLFxyXG4gICAgICBjbHM6IFwibGVlY2gtY29udGV4dFwiLFxyXG4gICAgICBjYjogKCkgPT4ge1xyXG4gICAgICAgIG5ldyBOb3RpY2UoXCJVc2UgdGhlIGNsb2NrIG9yIHRhZyBidXR0b25zIGluIHRoZSBoZWFkZXIgdG8gYWRqdXN0IHlvdXIgdGltZWJsb2NrIG9yIGNvbnRleHQgZmlsdGVycy5cIik7XHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICAgIHRoaXMuYWRkQnRuKGFjdGlvbnMsIHtcclxuICAgICAgbGFiZWw6IFwiRGVhY3RpdmF0ZVwiLFxyXG4gICAgICBjbHM6IFwibGVlY2gtZGVhY3RpdmF0ZVwiLFxyXG4gICAgICBjYjogYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIHRoaXMucmVtYWluaW5nLnNoaWZ0KCk7XHJcbiAgICAgICAgdGhpcy5ub3RlID0geyAuLi50aGlzLm5vdGUsIGFjdGl2ZTogZmFsc2UgfTtcclxuICAgICAgICBhd2FpdCB3cml0ZUZyb250bWF0dGVyQWN0aXZlKHRoaXMuYXBwLCB0aGlzLm5vdGUuZmlsZXBhdGgsIGZhbHNlKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnJlbmRlck1vZGFsKCk7XHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0U2tpcHBlZFRvZGF5KCk6IFNldDxzdHJpbmc+IHtcclxuICAgIGNvbnN0IGVudHJ5ID0gdGhpcy5wbHVnaW4uZGF0YS5zeXN0ZW1Ta2lwcGVkVG9kYXk7XHJcbiAgICBpZiAoIWVudHJ5IHx8IGVudHJ5LmRhdGUgIT09IHRvZGF5KCkpIHJldHVybiBuZXcgU2V0KCk7XHJcbiAgICByZXR1cm4gbmV3IFNldChlbnRyeS5maWxlcGF0aHMpO1xyXG4gIH1cclxuXHJcbiAgLy8gXHUyNTAwXHUyNTAwIE5vdGUgZGlzY292ZXJ5IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuICBwcml2YXRlIGxvYWRBY3Rpb25Ob3RlcygpOiBBY3Rpb25Ob3RlW10ge1xyXG4gICAgY29uc3Qgc2tpcHBlZFRvZGF5ID0gdGhpcy5nZXRTa2lwcGVkVG9kYXkoKTtcclxuICAgIGNvbnN0IG5vdGVzOiBBY3Rpb25Ob3RlW10gPSBbXTtcclxuICAgIGZvciAoY29uc3QgZmlsZSBvZiB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkpIHtcclxuICAgICAgY29uc3QgZm0gPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKT8uZnJvbnRtYXR0ZXI7XHJcbiAgICAgIGlmIChmbT8uYWN0aXZlICE9PSB0cnVlKSBjb250aW51ZTtcclxuICAgICAgaWYgKCFmbS5lbmVyZ3kgJiYgIWZtLnRpbWVibG9jayAmJiAhZm0udGltZXNjb3BlKSBjb250aW51ZTsgLy8gb3ZlcmZsb3cgZ3VhcmRcclxuICAgICAgaWYgKGZtLnRpbWVzY29wZSAmJiAhaXNEdWUoZm0pKSBjb250aW51ZTsgLy8gcmVjdXJyZW5jZSBnYXRlXHJcbiAgICAgIGlmIChza2lwcGVkVG9kYXkuaGFzKGZpbGUucGF0aCkpIGNvbnRpbnVlOyAvLyBza2lwcGVkIHRvZGF5XHJcbiAgICAgIG5vdGVzLnB1c2goe1xyXG4gICAgICAgIGZpbGVwYXRoOiBmaWxlLnBhdGgsXHJcbiAgICAgICAgYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgIGVuZXJneTogZm0uZW5lcmd5LFxyXG4gICAgICAgIHRpbWVibG9jazogZm0udGltZWJsb2NrLFxyXG4gICAgICAgIGR1ZTogZm0uZHVlLFxyXG4gICAgICAgIGNvbnRleHQ6IGZtLmNvbnRleHQsXHJcbiAgICAgICAgdGltZXNjb3BlOiBmbS50aW1lc2NvcGUsXHJcbiAgICAgICAgbGFzdF9jb21wbGV0ZWQ6IGZtLmxhc3RfY29tcGxldGVkLFxyXG4gICAgICAgIHNraXBwZWQ6IGZtLnNraXBwZWQsXHJcbiAgICAgIH0gYXMgQWN0aW9uTm90ZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbm90ZXM7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHNob3dFbXB0eVN0YXRlKCk6IHZvaWQge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJObyBhY3Rpb24gbm90ZXMgZm91bmQgaW4gdmF1bHRcIiB9KTtcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwge1xyXG4gICAgICB0ZXh0OiBcIkFkZCBub3RlcyB3aXRoIGFjdGl2ZTogdHJ1ZSBhbmQgYXQgbGVhc3Qgb25lIG9mIGVuZXJneSwgdGltZWJsb2NrLCBvciB0aW1lc2NvcGUgdG8gdXNlIHRoZSBTeXN0ZW0gbW9kYWwuXCIsXHJcbiAgICAgIGNsczogXCJzcGFjZWQtZW1wdHktZGVzY1wiLFxyXG4gICAgfSk7XHJcbiAgICBjb25zdCBidG5Sb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1idG4tcm93XCIgfSk7XHJcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIHsgbGFiZWw6IFwiQ2xvc2VcIiwgY2xzOiBcImNsb3NlXCIsIGNiOiAoKSA9PiB0aGlzLmNsb3NlKCkgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBTRVNTSU9OX1NJWkUgPSAyMDtcclxuICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBEVUVfU0xPVFMgPSAxMDtcclxuXHJcbiAgcHJpdmF0ZSBidWlsZEZpbHRlcmVkUmVtYWluaW5nKHNvdXJjZU5vdGVzOiBBY3Rpb25Ob3RlW10sIHByb2Nlc3NlZDogU2V0PHN0cmluZz4pOiBib29sZWFuIHtcclxuICAgIGNvbnN0IGJ5RW5lcmd5ID0gdGhpcy5lbmVyZ3lMZXZlbCA/IGZpbHRlckJ5RW5lcmd5TGV2ZWwoc291cmNlTm90ZXMsIHRoaXMuZW5lcmd5TGV2ZWwpIDogc291cmNlTm90ZXM7XHJcbiAgICBjb25zdCBieVRpbWVibG9jayA9IGZpbHRlckJ5VGltZWJsb2NrKGJ5RW5lcmd5LCB0aGlzLmFjdGl2ZVRpbWVibG9ja3MpO1xyXG4gICAgY29uc3QgYnlDb250ZXh0ID0gZmlsdGVyQnlDb250ZXh0KGJ5VGltZWJsb2NrLCB0aGlzLmFjdGl2ZUNvbnRleHRzKTtcclxuICAgIGNvbnN0IHVucHJvY2Vzc2VkID0gYnlDb250ZXh0LmZpbHRlcigobikgPT4gIXByb2Nlc3NlZC5oYXMobi5maWxlcGF0aCkpO1xyXG5cclxuICAgIGNvbnN0IHdpdGhEdWUgPSB1bnByb2Nlc3NlZFxyXG4gICAgICAuZmlsdGVyKChuKSA9PiAhIW4uZHVlKVxyXG4gICAgICAuc29ydCgoYSwgYikgPT4gbmV3IERhdGUoYS5kdWUhKS5nZXRUaW1lKCkgLSBuZXcgRGF0ZShiLmR1ZSEpLmdldFRpbWUoKSk7XHJcbiAgICBjb25zdCBub0R1ZUFsbCA9IHVucHJvY2Vzc2VkLmZpbHRlcigobikgPT4gIW4uZHVlKTtcclxuICAgIGNvbnN0IHNraXBwZWRCZWZvcmUgPSBub0R1ZUFsbFxyXG4gICAgICAuZmlsdGVyKChuKSA9PiAobi5za2lwcGVkID8/IDApID4gMClcclxuICAgICAgLnNvcnQoKGEsIGIpID0+IChiLnNraXBwZWQgPz8gMCkgLSAoYS5za2lwcGVkID8/IDApKTsgLy8gbW9zdC1za2lwcGVkIGZpcnN0XHJcbiAgICBjb25zdCBuZXZlclNraXBwZWQgPSBzaHVmZmxlQXJyYXkobm9EdWVBbGwuZmlsdGVyKChuKSA9PiAhKG4uc2tpcHBlZCA/PyAwKSkpO1xyXG4gICAgY29uc3Qgd2l0aG91dER1ZSA9IFsuLi5za2lwcGVkQmVmb3JlLCAuLi5uZXZlclNraXBwZWRdO1xyXG5cclxuICAgIGNvbnN0IGR1ZVNsaWNlID0gd2l0aER1ZS5zbGljZSgwLCBTeXN0ZW1Nb2RhbC5EVUVfU0xPVFMpO1xyXG4gICAgY29uc3Qgbm9EdWVTbGljZSA9IHdpdGhvdXREdWUuc2xpY2UoMCwgU3lzdGVtTW9kYWwuU0VTU0lPTl9TSVpFIC0gZHVlU2xpY2UubGVuZ3RoKTtcclxuXHJcbiAgICB0aGlzLnJlbWFpbmluZyA9IFsuLi5kdWVTbGljZSwgLi4ubm9EdWVTbGljZV07XHJcbiAgICB0aGlzLmN1cnJlbnRSb3VuZFNpemUgPSB0aGlzLnJlbWFpbmluZy5sZW5ndGg7XHJcbiAgICByZXR1cm4gdGhpcy5yZW1haW5pbmcubGVuZ3RoID4gMDtcclxuICB9XHJcblxyXG4gIC8vIFx1MjUwMFx1MjUwMCBTZXNzaW9uIHBlcnNpc3RlbmNlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG5cclxuICBwcml2YXRlIGFzeW5jIGNsZWFyU2Vzc2lvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGRlbGV0ZSB0aGlzLnBsdWdpbi5kYXRhLnN5c3RlbVNlc3Npb247XHJcbiAgICBhd2FpdCBzYXZlU3RvcmUodGhpcy5wbHVnaW4sIHRoaXMucGx1Z2luLmRhdGEpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBzYXZlU2Vzc2lvbigpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRoaXMucGx1Z2luLmRhdGEuc3lzdGVtU2Vzc2lvbiA9IHtcclxuICAgICAgcmVtYWluaW5nOiB0aGlzLnJlbWFpbmluZy5tYXAoKG4pID0+IG4uZmlsZXBhdGgpLFxyXG4gICAgICBmYWlsZWQ6IHRoaXMuZmFpbGVkLm1hcCgobikgPT4gbi5maWxlcGF0aCksXHJcbiAgICAgIHByb2dyZXNzTG9nOiBbLi4udGhpcy5wcm9ncmVzc0xvZ10sXHJcbiAgICAgIGN1cnJlbnRSb3VuZFNpemU6IHRoaXMuY3VycmVudFJvdW5kU2l6ZSxcclxuICAgICAgZW5lcmd5TGV2ZWw6IHRoaXMuZW5lcmd5TGV2ZWwsXHJcbiAgICAgIGFjdGl2ZVRpbWVibG9ja3M6IHRoaXMuYWN0aXZlVGltZWJsb2NrcyxcclxuICAgICAgYWN0aXZlQ29udGV4dHM6IFsuLi50aGlzLmFjdGl2ZUNvbnRleHRzXSxcclxuICAgIH07XHJcbiAgICBhd2FpdCBzYXZlU3RvcmUodGhpcy5wbHVnaW4sIHRoaXMucGx1Z2luLmRhdGEpO1xyXG4gIH1cclxuICAvLyBTdWJ0YXNrIE1vZGFsXHJcbiAgcHJpdmF0ZSBnZXRTdWJ0YXNrTm90ZXMoKTogTm90ZVJlY29yZFtdIHtcclxuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZSB8IG51bGw7XHJcbiAgICBpZiAoIWZpbGUpIHJldHVybiBbXTtcclxuICAgIGNvbnN0IGNhY2hlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XHJcbiAgICBpZiAoIWNhY2hlKSByZXR1cm4gW107XHJcblxyXG4gICAgLy8gRmluZCBsaW5lcyB0aGF0IGFyZSB0YXNrIGxpc3QgaXRlbXNcclxuICAgIGNvbnN0IHRhc2tMaW5lcyA9IG5ldyBTZXQoXHJcbiAgICAgIChjYWNoZS5saXN0SXRlbXMgPz8gW10pXHJcbiAgICAgICAgLmZpbHRlcigoaXRlbSkgPT4gaXRlbS50YXNrICE9PSB1bmRlZmluZWQpIC8vIHRhc2sgaXRlbXMgb25seSAobm90IHBsYWluIGxpc3QgaXRlbXMpXHJcbiAgICAgICAgLm1hcCgoaXRlbSkgPT4gaXRlbS5wb3NpdGlvbi5zdGFydC5saW5lKSxcclxuICAgICk7XHJcblxyXG4gICAgY29uc3Qgbm90ZXM6IE5vdGVSZWNvcmRbXSA9IFtdO1xyXG4gICAgZm9yIChjb25zdCBsaW5rIG9mIGNhY2hlLmxpbmtzID8/IFtdKSB7XHJcbiAgICAgIC8vIE9ubHkgaW5jbHVkZSBsaW5rcyB0aGF0IGFwcGVhciBvbiBhIHRhc2sgbGlzdCBsaW5lXHJcbiAgICAgIGlmICghdGFza0xpbmVzLmhhcyhsaW5rLnBvc2l0aW9uLnN0YXJ0LmxpbmUpKSBjb250aW51ZTtcclxuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaXJzdExpbmtwYXRoRGVzdChsaW5rLmxpbmssIHRoaXMubm90ZS5maWxlcGF0aCk7XHJcbiAgICAgIGlmICghdGFyZ2V0IHx8ICEodGFyZ2V0IGluc3RhbmNlb2YgVEZpbGUpKSBjb250aW51ZTtcclxuICAgICAgbm90ZXMucHVzaChcclxuICAgICAgICByZWFkTm90ZVJlY29yZCh0aGlzLnBsdWdpbiwgdGFyZ2V0KSxcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIHJldHVybiBub3RlcztcclxuICB9XHJcbn1cclxuXHJcbiIsICJpbXBvcnQgeyBBcHAgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgTm90ZVJlY29yZCB9IGZyb20gXCIuL3R5cGVzXCI7XHJcbmltcG9ydCB0eXBlIFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xyXG5pbXBvcnQgeyBBY3RpdmVNb2RhbCB9IGZyb20gXCIuL0FjdGl2ZU1vZGFsXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgU3VidGFza01vZGFsIGV4dGVuZHMgQWN0aXZlTW9kYWwge1xyXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sIG5vdGVzOiBOb3RlUmVjb3JkW10pIHtcclxuICAgIHN1cGVyKGFwcCwgcGx1Z2luLCBub3RlcywgXCJfX3N1YnRhc2tfX1wiKTtcclxuICB9XHJcblxyXG4gIC8vIE5vIHNlc3Npb24gcGVyc2lzdGVuY2UgXHUyMDE0IHRoaXMgbW9kYWwgaXMgZXBoZW1lcmFsXHJcbiAgcHJvdGVjdGVkIG9uU2Vzc2lvbkNsb3NlKCk6IHZvaWQge31cclxufVxyXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG9CQUFxRDs7O0FDR3JELElBQU0sYUFBeUIsRUFBRSxlQUFlLENBQUMsR0FBRyxlQUFlLENBQUMsRUFBRTtBQUV0RSxlQUFzQixVQUFVLFFBQXFDO0FBTHJFO0FBTUUsUUFBTSxRQUFRLE1BQU0sT0FBTyxTQUFTO0FBQ3BDLFVBQU8sb0NBQU8s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TTtBQUFBLEVBQ04sVUFBVTtBQUFBLEVBQ1YsVUFBVTtBQUFBLEVBQ1YsZUFBZTtBQUFBLEVBQ2YsVUFBVTtBQUFBLEVBQ1YsV0FBVztBQUFBLEVBQ1gsVUFBVTtBQUFBLEVBQ1YsV0FBVztBQUFBLEVBQ1gsYUFBYTtBQUFBLEVBQ2IsZ0JBQWdCO0FBQUEsRUFDaEIsWUFBWTtBQUFBLEVBQ1osWUFBWTtBQUFBLEVBQ1osU0FBUztBQUFBLEVBQ1QsWUFBWTtBQUFBLEVBQ1osY0FBYztBQUFBLEVBQ2QsZUFBZTtBQUFBLEVBQ2YsZUFBZTtBQUFBLEVBQ2YsZUFBZTtBQUFBLEVBQ2YsZUFBZTtBQUFBLEVBQ2YsWUFBWTtBQUFBLEVBQ1osVUFBVTtBQUFBLEVBQ1YsYUFBYTtBQUFBLEVBQ2IsU0FBUztBQUFBLEVBQ1QsU0FBUztBQUFBLEVBQ1QsWUFBWTtBQUFBLEVBQ1osV0FBVztBQUFBLEVBQ1gsYUFBYTtBQUFBLEVBQ2IsYUFBYTtBQUFBLEVBQ2IsU0FBUztBQUFBLEVBQ1QsV0FBVztBQUFBLEVBQ1gsWUFBWTtBQUFBLEVBQ1osTUFBTTtBQUFBLEVBQ04sV0FBVztBQUFBLEVBQ1gsTUFBTTtBQUFBLEVBQ04sT0FBTztBQUFBLEVBQ1AsYUFBYTtBQUFBLEVBQ2IsTUFBTTtBQUFBLEVBQ04sVUFBVTtBQUFBLEVBQ1YsU0FBUztBQUFBLEVBQ1QsV0FBVztBQUFBLEVBQ1gsUUFBUTtBQUFBLEVBQ1IsT0FBTztBQUFBLEVBQ1AsT0FBTztBQUFBLEVBQ1AsVUFBVTtBQUFBLEVBQ1YsZUFBZTtBQUFBLEVBQ2YsV0FBVztBQUFBLEVBQ1gsY0FBYztBQUFBLEVBQ2QsV0FBVztBQUFBLEVBQ1gsWUFBWTtBQUFBLEVBQ1osV0FBVztBQUFBLEVBQ1gsc0JBQXNCO0FBQUEsRUFDdEIsV0FBVztBQUFBLEVBQ1gsWUFBWTtBQUFBLEVBQ1osV0FBVztBQUFBLEVBQ1gsV0FBVztBQUFBLEVBQ1gsYUFBYTtBQUFBLEVBQ2IsZUFBZTtBQUFBLEVBQ2YsY0FBYztBQUFBLEVBQ2QsZ0JBQWdCO0FBQUEsRUFDaEIsZ0JBQWdCO0FBQUEsRUFDaEIsZ0JBQWdCO0FBQUEsRUFDaEIsYUFBYTtBQUFBLEVBQ2IsTUFBTTtBQUFBLEVBQ04sV0FBVztBQUFBLEVBQ1gsT0FBTztBQUFBLEVBQ1AsU0FBUztBQUFBLEVBQ1QsUUFBUTtBQUFBLEVBQ1Isa0JBQWtCO0FBQUEsRUFDbEIsWUFBWTtBQUFBLEVBQ1osY0FBYztBQUFBLEVBQ2QsY0FBYztBQUFBLEVBQ2QsZ0JBQWdCO0FBQUEsRUFDaEIsaUJBQWlCO0FBQUEsRUFDakIsbUJBQW1CO0FBQUEsRUFDbkIsaUJBQWlCO0FBQUEsRUFDakIsaUJBQWlCO0FBQUEsRUFDakIsY0FBYztBQUFBLEVBQ2QsV0FBVztBQUFBLEVBQ1gsV0FBVztBQUFBLEVBQ1gsVUFBVTtBQUFBLEVBQ1YsYUFBYTtBQUFBLEVBQ2IsTUFBTTtBQUFBLEVBQ04sU0FBUztBQUFBLEVBQ1QsT0FBTztBQUFBLEVBQ1AsV0FBVztBQUFBLEVBQ1gsUUFBUTtBQUFBLEVBQ1IsV0FBVztBQUFBLEVBQ1gsUUFBUTtBQUFBLEVBQ1IsZUFBZTtBQUFBLEVBQ2YsV0FBVztBQUFBLEVBQ1gsZUFBZTtBQUFBLEVBQ2YsZUFBZTtBQUFBLEVBQ2YsWUFBWTtBQUFBLEVBQ1osV0FBVztBQUFBLEVBQ1gsTUFBTTtBQUFBLEVBQ04sTUFBTTtBQUFBLEVBQ04sTUFBTTtBQUFBLEVBQ04sWUFBWTtBQUFBLEVBQ1osUUFBUTtBQUFBLEVBQ1IsZUFBZTtBQUFBLEVBQ2YsS0FBSztBQUFBLEVBQ0wsV0FBVztBQUFBLEVBQ1gsV0FBVztBQUFBLEVBQ1gsYUFBYTtBQUFBLEVBQ2IsUUFBUTtBQUFBLEVBQ1IsWUFBWTtBQUFBLEVBQ1osVUFBVTtBQUFBLEVBQ1YsVUFBVTtBQUFBLEVBQ1YsUUFBUTtBQUFBLEVBQ1IsUUFBUTtBQUFBLEVBQ1IsU0FBUztBQUFBLEVBQ1QsV0FBVztBQUFBLEVBQ1gsV0FBVztBQUFBLEVBQ1gsV0FBVztBQUFBLEVBQ1gsTUFBTTtBQUFBLEVBQ04sYUFBYTtBQUFBLEVBQ2IsV0FBVztBQUFBLEVBQ1gsS0FBSztBQUFBLEVBQ0wsTUFBTTtBQUFBLEVBQ04sU0FBUztBQUFBLEVBQ1QsUUFBUTtBQUFBLEVBQ1IsV0FBVztBQUFBLEVBQ1gsUUFBUTtBQUFBLEVBQ1IsT0FBTztBQUFBLEVBQ1AsT0FBTztBQUFBLEVBQ1AsWUFBWTtBQUFBLEVBQ1osUUFBUTtBQUFBLEVBQ1IsYUFBYTtBQUNmO0FBRUEsZUFBTyxPQUFPLE9BQU87QUFBQSxFQUNuQixLQUFLLFVBQVU7QUFDYixXQUFPLE9BQU8sT0FBTyxJQUFJLEtBQUssZUFBYSxNQUFNLFFBQVE7QUFBQSxFQUMzRDtBQUFBLEVBQ0EsY0FBYztBQUNaLFdBQU8sS0FBSyxJQUFJLEVBQUUsWUFBWTtBQUFBLEVBQ2hDO0FBQUEsRUFDQSxLQUFLO0FBQUE7QUFBQSxFQUNMLFdBQVc7QUFBQSxFQUNYLFlBQVk7QUFBQSxFQUNaLFdBQVc7QUFBQSxFQUNYLFdBQVc7QUFBQSxFQUNYLFVBQVU7QUFDWixDQUFDO0FBRUQsU0FBUyxrQkFBa0I7QUFDekIsU0FBTyxLQUFLLElBQUksRUFBRSxVQUFVO0FBQzlCO0FBRUEsU0FBUyxtQkFBbUI7QUFDMUIsU0FBTyxLQUFLLElBQUksRUFBRSxXQUFXO0FBQy9CO0FBRUEsU0FBUyxrQkFBa0I7QUFDekIsU0FBTyxXQUFXLElBQUksRUFBRSxVQUFVO0FBQ3BDO0FBRUEsU0FBUyxrQkFBa0I7QUFDekIsU0FBTyxLQUFLLElBQUksRUFBRSxVQUFVO0FBQzlCO0FBRWUsU0FBUixNQUF1QkMsU0FBUTtBQUNwQyxNQUFJLEdBQUc7QUFDUCxFQUFBQSxXQUFVQSxVQUFTLElBQUksS0FBSyxFQUFFLFlBQVk7QUFDMUMsVUFBUSxJQUFJLE1BQU0sS0FBS0EsT0FBTSxNQUFNLElBQUksRUFBRSxDQUFDLEVBQUUsUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFDdEYsTUFBTSxJQUFJLElBQUksSUFBSyxLQUFLLElBQUksS0FBUSxLQUFLLElBQUksS0FBUSxLQUFLLElBQUksS0FBUSxJQUFJLE1BQVMsSUFBSSxPQUFRLElBQU0sSUFBSSxJQUFNLENBQUMsSUFDaEgsTUFBTSxJQUFJLEtBQUssS0FBSyxLQUFLLEtBQU0sS0FBSyxLQUFLLEtBQU0sS0FBSyxJQUFJLE1BQU8sSUFBSSxPQUFRLEdBQUksSUFDL0UsTUFBTSxJQUFJLEtBQU0sS0FBSyxLQUFLLEtBQVEsS0FBSyxJQUFJLEtBQVEsS0FBSyxJQUFJLEtBQVEsS0FBSyxJQUFJLEtBQVEsS0FBSyxJQUFJLEtBQVEsSUFBSSxPQUFVLElBQUksT0FBUSxJQUFNLElBQUksTUFBUSxHQUFJLElBQ3RKLFNBQ0MsSUFBSSxhQUFhLEtBQUtBLE9BQU0sS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUM1RCxJQUFJLGFBQWEsS0FBS0EsT0FBTSxLQUFLLElBQUksSUFBSSxFQUFFLENBQUMsSUFBSSxNQUFNLEtBQUssRUFBRSxDQUFDLElBQUksTUFBTSxLQUFLLEVBQUUsQ0FBQyxJQUFJLE1BQU0sS0FBSyxDQUFDLEtBQ2hHLElBQUksY0FBYyxLQUFLQSxPQUFNLEtBQUssS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUM3RCxJQUFJLGNBQWMsS0FBS0EsT0FBTSxLQUFLLEtBQUssRUFBRSxDQUFDLElBQUksTUFBTSxLQUFLLEVBQUUsQ0FBQyxJQUFJLE1BQU0sS0FBSyxFQUFFLENBQUMsSUFBSSxNQUFNLEtBQUssRUFBRSxDQUFDLENBQUMsS0FDakcsSUFBSSxhQUFhLEtBQUtBLE9BQU0sS0FBSyxLQUFLLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQ3JFLElBQUksY0FBYyxLQUFLQSxPQUFNLEtBQUssS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsSUFDMUUsTUFB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SztBQUFBLEVBQ1A7QUFFQSxNQUFJLGFBQWE7QUFBQSxJQUNmLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxJQUNMLEtBQUs7QUFBQSxFQUNQO0FBRUEsTUFBSSxTQUFTO0FBQUEsSUFDWCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFDTCxLQUFLO0FBQUEsSUFD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QUUsQ0FBQyxFQUFFLFVBQVU7QUFDOUM7QUFFQSxTQUFTLHNCQUFzQixHQUFHLFFBQVEsR0FBRztBQUMzQyxNQUFJLElBQUksU0FBUyxLQUFLLE9BQU8sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQzVDLFNBQU8sS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFVBQVU7QUFDOUM7QUFFQSxTQUFTLG1CQUFtQixHQUFHLFFBQVEsR0FBRztBQUN4QyxNQUFJLElBQUksU0FBUyxLQUFLLE9BQU8sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQzVDLFNBQU8sS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFVBQVU7QUFDOUM7QUFFQSxTQUFTLHNCQUFzQixHQUFHLFFBQVEsR0FBRztBQUMzQyxNQUFJLElBQUksU0FBUyxLQUFLLE9BQU8sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQzVDLFNBQU8sS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFVBQVU7QUFDOUM7QUFFQSxTQUFTLGNBQWMsR0FBRyxRQUFRLEdBQUc7QUFDbkMsTUFBSSxJQUFJLFNBQVMsS0FBSyxPQUFPLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQztBQUM1QyxTQUFPLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxVQUFVO0FBQzlDO0FBRUEsU0FBUyxVQUFVLEdBQUcsUUFBUSxHQUFHO0FBQy9CLE1BQUksSUFBSSxTQUFTLEtBQUssT0FBTyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDNUMsU0FBTyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxPQUFPLE1BQU8sSUFBSSxFQUFFLENBQUMsRUFBRSxVQUFVO0FBQzNFO0FBRUEsU0FBUyxVQUFVLEdBQUcs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LEdBQ3BCLEtBQUtELEtBQUksSUFDVCxLQUFLQyxLQUFJLElBQ1QsS0FBSyxJQUFJLEtBQ1QsS0FBSyxNQUFNLEtBQUssS0FBSyxLQUFLO0FBRzlCLFFBQUksS0FBSyxRQUFRLE1BQU07QUFDckIsV0FBSyxXQUFXLEVBQUUsSUFBSSxFQUFFO0FBQUEsSUFDMUIsV0FHUyxLQUFLLElBQUksS0FBSyxNQUFNLEVBQUUsSUFBSSxXQUFXLEtBQUssSUFBSSxLQUFLLE1BQU0sRUFBRSxJQUFJLFNBQVM7QUFDL0UsV0FBSyxXQUFXLEVBQUUsSUFBSSxFQUFFO0FBQUEsSUFDMUI7QUFHQSxRQUFJLENBQUMsRUFBRztBQUdSLFFBQUksS0FBSyxFQUFHLE1BQUssS0FBSyxNQUFNO0FBRzVCLFFBQUksS0FBSyxZQUFZO0FBQ25CLFdBQUssV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSUQsS0FBSSxFQUFFLElBQUlDLEtBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLEtBQUssTUFBTSxFQUFFLElBQUksS0FBSyxNQUFNLEVBQUU7QUFBQSxJQUM1RyxXQUdTLEtBQUssU0FBUztBQUNyQixXQUFLLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxJQUFJLEVBQUUsSUFBSSxLQUFLLE1BQU1ELEtBQUksSUFBSSxLQUFLLElBQUksRUFBRSxDQUFDLElBQUksS0FBSyxNQUFNQyxLQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztBQUFBLElBQ3JIO0FBQUEsRUFDRjtBQUFBLEVBQ0EsS0FBS0QsSUFBR0MsSUFBRyxHQUFHLEdBQUc7QUFDZixTQUFLLFdBQVcsS0FBSyxNQUFNLEtBQUssTUFBTSxDQUFDRCxFQUFDLElBQUksS0FBSyxNQUFNLEtBQUssTUFBTSxDQUFDQyxFQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFBQSxFQUM1RjtBQUFBLEVBQ0EsV0FBVztBQUNULFdBQU8sS0FBSztBQUFBLEVBQ2Q7QUFDRjtBQUVPLFNBQVMsT0FBTztBQUNyQixTQUFPLElBQUk7QUFDYjtBQUdBLEtBQUssWUFBWSxLQUFLOzs7QUNySmYsU0FBUyxTQUFTLE9BQU87QUFDOUIsTUFBSSxTQUFTO0FBRWIsUUFBTSxTQUFTLFNBQVMsR0FBRztBQUN6QixRQUFJLENBQUMsVUFBVSxPQUFRLFFBQU87QUFDOUIsUUFBSSxLQUFLLE1BQU07QUFDYixlQUFTO0FBQUEsSUFDWCxPQUFPO0FBQ0wsWUFBTSxJQUFJLEtBQUssTUFBTSxDQUFDO0FBQ3RCLFVBQUksRUFBRSxLQUFLLEdBQUksT0FBTSxJQUFJLFdBQVcsbUJBQW1CLENBQUMsRUFBRTtBQUMxRCxlQUFTO0FBQUEsSUFDWDtBQUNBLFdBQU87QUFBQSxFQUNUO0FBRUEsU0FBTyxNQUFNLElBQUksS0FBSyxNQUFNO0FBQzlCOzs7QUNsQk8sSUFBSSxRQUFRLE1BQU0sVUFBVTtBQUVwQixTQUFSLGNBQWlCQyxJQUFHO0FBQ3pCLFNBQU8sT0FBT0EsT0FBTSxZQUFZLFlBQVlBLEtBQ3hDQSxLQUNBLE1BQU0sS0FBS0EsRUFBQztBQUNsQjs7O0FDTkEsU0FBUyxPQUFPLFNBQVM7QUFDdkIsT0FBSyxXQUFXO0FBQ2xCO0FBRUEsT0FBTyxZQUFZO0FBQUEsRUFDakIsV0FBVyxXQUFXO0FBQ3BCLFNBQUssUUFBUTtBQUFBLEVBQ2Y7QUFBQSxFQUNBLFNBQVMsV0FBVztBQUNsQixTQUFLLFFBQVE7QUFBQSxFQUNmO0FBQUEsRUFDQSxXQUFXLFdBQVc7QUFDcEIsU0FBSyxTQUFTO0FBQUEsRUFDaEI7QUFBQSxFQUNBLFNBQVMsV0FBVztBQUNsQixRQUFJLEtBQUssU0FBVSxLQUFLLFVBQVUsS0FBSyxLQUFLLFdBQVcsRUFBSSxNQUFLLFNBQVMsVUFBVTtBQUNuRixTQUFLLFFBQVEsSUFBSSxLQUFLO0FBQUEsRUFDeEI7QUFBQSxFQUNBLE9BQU8sU0FBU0MsSUFBR0MsSUFBRztBQUNwQixJQUFBRCxLQUFJLENBQUNBLElBQUdDLEtBQUksQ0FBQ0E7QUFDYixZQUFRLEtBQUssUUFBUTtBQUFBLE1BQ25CLEtBQUs7QUFBRyxhQUFLLFNBQVM7QUFBRyxhQUFLLFFBQVEsS0FBSyxTQUFTLE9BQU9ELElBQUdDLEVBQUMsSUFBSSxLQUFLLFNBQVMsT0FBT0QsSUFBR0MsRUFBQztBQUFHO0FBQUEsTUFDL0YsS0FBSztBQUFHLGFBQUssU0FBUztBQUFBO0FBQUEsTUFDdEI7QUFBUyxhQUFLLFNBQVMsT0FBT0QsSUFBR0MsRUFBQztBQUFHO0FBQUEsSUFDdkM7QUFBQSxFQUNGO0FBQ0Y7QUFFZSxTQUFSLGVBQWlCLFNBQVM7QUFDL0IsU0FBTyxJQUFJLE9BQU8sT0FBTztBQUMzQjs7O0FDOUJPLFNBQVMsRUFBRSxHQUFHO0FBQ25CLFNBQU8sRUFBRSxDQUFDO0FBQ1o7QUFFTyxTQUFTLEVBQUUsR0FBRztBQUNuQixTQUFPLEVBQUUsQ0FBQztBQUNaOzs7QUNBZSxTQUFSLGFBQWlCQyxJQUFHQyxJQUFHO0FBQzVCLE1BQUksVUFBVUMsa0JBQVMsSUFBSSxHQUN2QixVQUFVLE1BQ1YsUUFBUSxnQkFDUixTQUFTLE1BQ1RDLFFBQU8sU0FBUyxJQUFJO0FBRXhCLEVBQUFILEtBQUksT0FBT0EsT0FBTSxhQUFhQSxLQUFLQSxPQUFNLFNBQWEsSUFBU0Usa0JBQVNGLEVBQUM7QUFDekUsRUFBQUMsS0FBSSxPQUFPQSxPQUFNLGFBQWFBLEtBQUtBLE9BQU0sU0FBYSxJQUFTQyxrQkFBU0QsRUFBQztBQUV6RSxXQUFTLEtBQUssTUFBTTtBQUNsQixRQUFJLEdBQ0EsS0FBSyxPQUFPLGNBQU0sSUFBSSxHQUFHLFFBQ3pCLEdBQ0EsV0FBVyxPQUNYO0FBRUosUUFBSSxXQUFXLEtBQU0sVUFBUyxNQUFNLFNBQVNFLE1BQUssQ0FBQztBQUVuRCxTQUFLLElBQUksR0FBRyxLQUFLLEdBQUcsRUFBRSxHQUFHO0FBQ3ZCLFVBQUksRUFBRSxJQUFJLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxPQUFPLFVBQVU7QUFDMUQsWUFBSSxXQUFXLENBQUMsU0FBVSxRQUFPLFVBQVU7QUFBQSxZQUN0QyxRQUFPLFFBQVE7QUFBQSxNQUN0QjtBQUNBLFVBQUksU0FBVSxRQUFPLE1BQU0sQ0FBQ0gsR0FBRSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUNDLEdBQUUsR0FBRyxHQUFHLElBQUksQ0FBQztBQUFBLElBQzNEO0FBRUEsUUFBSSxPQUFRLFFBQU8sU0FBUyxNQUFNLFNBQVMsTUFBTTtBQUFBLEVBQ25EO0FBRUEsT0FBSyxJQUFJLFNBQVMsR0FBRztBQUNuQixXQUFPLFVBQVUsVUFBVUQsS0FBSSxPQUFPLE1BQU0sYUFBYSxJQUFJRSxrQkFBUyxDQUFDLENBQUMsR0FBRyxRQUFRRjtBQUFBLEVBQ3JGO0FBRUEsT0FBSyxJQUFJLFNBQVMsR0FBRztBQUNuQixXQUFPLFVBQVUsVUFBVUMsS0FBSSxPQUFPLE1BQU0sYUFBYSxJQUFJQyxrQkFBUyxDQUFDLENBQUMsR0FBRyxRQUFRRDtBQUFBLEVBQ3JGO0FBRUEsT0FBSyxVQUFVLFNBQVMsR0FBRztBQUN6QixXQUFPLFVBQVUsVUFBVSxVQUFVLE9BQU8sTUFBTSxhQUFhLElBQUlDLGtCQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUTtBQUFBLEVBQzVGO0FBRUEsT0FBSyxRQUFRLFNBQVMsR0FBRztBQUN2QixXQUFPLFVBQVUsVUFBVSxRQUFRLEdBQUcsV0FBVyxTQUFTLFNBQVMsTUFBTSxPQUFPLElBQUksUUFBUTtBQUFBLEVBQzlGO0FBRUEsT0FBSyxVQUFVLFNBQVMsR0FBRztBQUN6QixXQUFPLFVBQVUsVUFBVSxLQUFLLE9BQU8sVUFBVSxTQUFTLE9BQU8sU0FBUyxNQUFNLFVBQVUsQ0FBQyxHQUFHLFFBQVE7QUFBQSxFQUN4RztBQUVBLFNBQU87QUFDVDs7O0FDbERlLFNBQVIsYUFBaUIsSUFBSSxJQUFJLElBQUk7QUFDbEMsTUFBSSxLQUFLLE1BQ0wsVUFBVUUsa0JBQVMsSUFBSSxHQUN2QixVQUFVLE1BQ1YsUUFBUSxnQkFDUixTQUFTLE1BQ1RDLFFBQU8sU0FBUyxJQUFJO0FBRXhCLE9BQUssT0FBTyxPQUFPLGFBQWEsS0FBTSxPQUFPLFNBQWEsSUFBU0Qsa0JBQVMsQ0FBQyxFQUFFO0FBQy9FLE9BQUssT0FBTyxPQUFPLGFBQWEsS0FBTSxPQUFPLFNBQWFBLGtCQUFTLENBQUMsSUFBSUEsa0JBQVMsQ0FBQyxFQUFFO0FBQ3BGLE9BQUssT0FBTyxPQUFPLGFBQWEsS0FBTSxPQUFPLFNBQWEsSUFBU0Esa0JBQVMsQ0FBQyxFQUFFO0FBRS9FLFdBQVMsS0FBSyxNQUFNO0FBQ2xCLFFBQUksR0FDQSxHQUNBLEdBQ0EsS0FBSyxPQUFPLGNBQU0sSUFBSSxHQUFHLFFBQ3pCLEdBQ0EsV0FBVyxPQUNYLFFBQ0EsTUFBTSxJQUFJLE1BQU0sQ0FBQyxHQUNqQixNQUFNLElBQUksTUFBTSxDQUFDO0FBRXJCLFFBQUksV0FBVyxLQUFNLFVBQVMsTUFBTSxTQUFTQyxNQUFLLENBQUM7QUFFbkQsU0FBSyxJQUFJLEdBQUcsS0FBSyxHQUFHLEVBQUUsR0FBRztBQUN2QixVQUFJLEVBQUUsSUFBSSxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLElBQUksT0FBTyxVQUFVO0FBQzFELFlBQUksV0FBVyxDQUFDLFVBQVU7QUFDeEIsY0FBSTtBQUNKLGlCQUFPLFVBQVU7QUFDakIsaUJBQU8sVUFBVTtBQUFBLFFBQ25CLE9BQU87QUFDTCxpQkFBTyxRQUFRO0FBQ2YsaUJBQU8sVUFBVTtBQUNqQixlQUFLLElBQUksSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFLEdBQUc7QUFDM0IsbUJBQU8sTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUFBLFVBQzdCO0FBQ0EsaUJBQU8sUUFBUTtBQUNmLGlCQUFPLFFBQVE7QUFBQSxRQUNqQjtBQUFBLE1BQ0Y7QUFDQSxVQUFJLFVBQVU7QUFDWixZQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUk7QUFDakQsZUFBTyxNQUFNLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztBQUFBLE1BQzNFO0FBQUEsSUFDRjtBQUVBLFFBQUksT0FBUSxRQUFPLFNBQVMsTUFBTSxTQUFTLE1BQU07QUFBQSxFQUNuRDtBQUVBLFdBQVMsV0FBVztBQUNsQixXQUFPLGFBQUssRUFBRSxRQUFRLE9BQU8sRUFBRSxNQUFNLEtBQUssRUFBRSxRQUFRLE9BQU87QUFBQSxFQUM3RDtBQUVBLE9BQUssSUFBSSxTQUFTLEdBQUc7QUFDbkIsV0FBTyxVQUFVLFVBQVUsS0FBSyxPQUFPLE1BQU0sYUFBYSxJQUFJRCxrQkFBUyxDQUFDLENBQUMsR0FBRyxLQUFLLE1BQU0sUUFBUTtBQUFBLEVBQ2pHO0FBRUEsT0FBSyxLQUFLLFNBQVMsR0FBRztBQUNwQixXQUFPLFVBQVUsVUFBVSxLQUFLLE9BQU8sTUFBTSxhQUFhLElBQUlBLGtCQUFTLENBQUMsQ0FBQyxHQUFHLFFBQVE7QUFBQSxFQUN0RjtBQUVBLE9BQUssS0FBSyxTQUFTLEdBQUc7QUFDcEIsV0FBTyxVQUFVLFVBQVUsS0FBSyxLQUFLLE9BQU8sT0FBTyxPQUFPLE1BQU0sYUFBYSxJQUFJQSxrQkFBUyxDQUFDLENBQUMsR0FBRyxRQUFRO0FBQUEsRUFDekc7QUFFQSxPQUFLLElBQUksU0FBUyxHQUFHO0FBQ25CLFdBQU8sVUFBVSxVQUFVLEtBQUssT0FBTyxNQUFNLGFBQWEsSUFBSUEsa0JBQVMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxNQUFNLFFBQVE7QUFBQSxFQUNqRztBQUVBLE9BQUssS0FBSyxTQUFTLEdBQUc7QUFDcEIsV0FBTyxVQUFVLFVBQVUsS0FBSyxPQUFPLE1BQU0sYUFBYSxJQUFJQSxrQkFBUyxDQUFDLENBQUMsR0FBRyxRQUFRO0FBQUEsRUFDdEY7QUFFQSxPQUFLLEtBQUssU0FBUyxHQUFHO0FBQ3BCLFdBQU8sVUFBVSxVQUFVLEtBQUssS0FBSyxPQUFPLE9BQU8sT0FBTyxNQUFNLGFBQWEsSUFBSUEsa0JBQVMsQ0FBQyxDQUFDLEdBQUcsUUFBUTtBQUFBLEVBQ3pHO0FBRUEsT0FBSyxTQUNMLEtBQUssU0FBUyxXQUFXO0FBQ3ZCLFdBQU8sU0FBUyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUFBLEVBQzlCO0FBRUEsT0FBSyxTQUFTLFdBQVc7QUFDdkIsV0FBTyxTQUFTLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQUEsRUFDOUI7QUFFQSxPQUFLLFNBQVMsV0FBVztBQUN2QixXQUFPLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFBQSxFQUM5QjtBQUVBLE9BQUssVUFBVSxTQUFTLEdBQUc7QUFDekIsV0FBTyxVQUFVLFVBQVUsVUFBVSxPQUFPLE1BQU0sYUFBYSxJQUFJQSxrQkFBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVE7QUFBQSxFQUM1RjtBQUVBLE9BQUssUUFBUSxTQUFTLEdBQUc7QUFDdkIsV0FBTyxVQUFVLFVBQVUsUUFBUSxHQUFHLFdBQVcsU0FBUyxTQUFTLE1BQU0sT0FBTyxJQUFJLFFBQVE7QUFBQSxFQUM5RjtBQUVBLE9BQUssVUFBVSxTQUFTLEdBQUc7QUFDekIsV0FBTyxVQUFVLFVBQVUsS0FBSyxPQUFPLFVBQVUsU0FBUyxPQUFPLFNBQVMsTUFBTSxVQUFVLENBQUMsR0FBRyxRQUFRO0FBQUEsRUFDeEc7QUFFQSxTQUFPO0FBQ1Q7OztBQy9HTyxJQUFJLFFBQVE7QUFFbkIsSUFBTyxxQkFBUTtBQUFBLEVBQ2IsS0FBSztBQUFBLEVBQ0w7QUFBQSxFQUNBLE9BQU87QUFBQSxFQUNQLEtBQUs7QUFBQSxFQUNMLE9BQU87QUFDVDs7O0FDTmUsU0FBUixrQkFBaUIsTUFBTTtBQUM1QixNQUFJLFNBQVMsUUFBUSxJQUFJLElBQUksT0FBTyxRQUFRLEdBQUc7QUFDL0MsTUFBSSxLQUFLLE1BQU0sU0FBUyxLQUFLLE1BQU0sR0FBRyxDQUFDLE9BQU8sUUFBUyxRQUFPLEtBQUssTUFBTSxJQUFJLENBQUM7QUFDOUUsU0FBTyxtQkFBVyxlQUFlLE1BQU0sSUFBSSxFQUFDLE9BQU8sbUJBQVcsTUFBTSxHQUFHLE9BQU8sS0FBSSxJQUFJO0FBQ3hGOzs7QUNIQSxTQUFTLGVBQWUsTUFBTTtBQUM1QixTQUFPLFdBQVc7QUFDaEIsUUFBSUUsWUFBVyxLQUFLLGVBQ2hCLE1BQU0sS0FBSztBQUNmLFdBQU8sUUFBUSxTQUFTQSxVQUFTLGdCQUFnQixpQkFBaUIsUUFDNURBLFVBQVMsY0FBYyxJQUFJLElBQzNCQSxVQUFTLGdCQUFnQixLQUFLLElBQUk7QUFBQSxFQUMxQztBQUNGO0FBRUEsU0FBUyxhQUFhLFVBQVU7QUFDOUIsU0FBTyxXQUFXO0FBQ2hCLFdBQU8sS0FBSyxjQUFjLGdCQUFnQixTQUFTLE9BQU8sU0FBUyxLQUFLO0FBQUEsRUFDMUU7QUFDRjtBQUVlLFNBQVIsZ0JBQWlCLE1BQU07QUFDNUIsTUFBSSxXQUFXLGtCQUFVLElBQUk7QUFDN0IsVUFBUSxTQUFTLFFBQ1gsZUFDQSxnQkFBZ0IsUUFBUTtBQUNoQzs7O0FDeEJBLFNBQVMsT0FBTztBQUFDO0FBRUYsU0FBUixpQkFBaUIsVUFBVTtBQUNoQyxTQUFPLFlBQVksT0FBTyxPQUFPLFdBQVc7QUFDMUMsV0FBTyxLQUFLLGNBQWMsUUFBUTtBQUFBLEVBQ3BDO0FBQ0Y7OztBQ0hlLFNBQVIsZUFBaUIsUUFBUTtBQUM5QixNQUFJLE9BQU8sV0FBVyxXQUFZLFVBQVMsaUJBQVMsTUFBTTtBQUUxRCxXQUFTLFNBQVMsS0FBSyxTQUFTLElBQUksT0FBTyxRQUFRLFlBQVksSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRztBQUM5RixhQUFTLFFBQVEsT0FBTyxDQUFDLEdBQUcsSUFBSSxNQUFNLFFBQVEsV0FBVyxVQUFVLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxHQUFHLE1BQU0sU0FBUyxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRztBQUN0SCxXQUFLLE9BQU8sTUFBTSxDQUFDLE9BQU8sVUFBVSxPQUFPLEtBQUssTUFBTSxLQUFLLFVBQVUsR0FBRyxLQUFLLElBQUk7QUFDL0UsWUFBSSxjQUFjLEtBQU0sU0FBUSxXQUFXLEtBQUs7QUFDaEQsaUJBQVMsQ0FBQyxJQUFJO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUVBLFNBQU8sSUFBSSxVQUFVLFdBQVcsS0FBSyxRQUFRO0FBQy9DOzs7QUNWZSxTQUFSLE1BQXVCQyxJQUFHO0FBQy9CLFNBQU9BLE1BQUssT0FBTyxDQUFDLElBQUksTUFBTSxRQUFRQSxFQUFDLElBQUlBLEtBQUksTUFBTSxLQUFLQSxFQUFDO0FBQzdEOzs7QUNSQSxTQUFTLFFBQVE7QUFDZixTQUFPLENBQUM7QUFDVjtBQUVlLFNBQVIsb0JBQWlCLFVBQVU7QUFDaEMsU0FBTyxZQUFZLE9BQU8sUUFBUSxXQUFXO0FBQzNDLFdBQU8sS0FBSyxpQkFBaUIsUUFBUTtBQUFBLEVBQ3ZDO0FBQ0Y7OztBQ0pBLFNBQVMsU0FBUyxRQUFRO0FBQ3hCLFNBQU8sV0FBVztBQUNoQixXQUFPLE1BQU0sT0FBTyxNQUFNLE1BQU0sU0FBUyxDQUFDO0FBQUEsRUFDNUM7QUFDRjtBQUVlLFNBQVIsa0JBQWlCLFFBQVE7QUFDOUIsTUFBSSxPQUFPLFdBQVcsV0FBWSxVQUFTLFNBQVMsTUFBTTtBQUFBLE1BQ3JELFVBQVMsb0JBQVksTUFBTTtBQUVoQyxXQUFTLFNBQVMsS0FBSyxTQUFTLElBQUksT0FBTyxRQUFRLFlBQVksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHO0FBQ2xHLGFBQVMsUUFBUSxPQUFPLENBQUMsR0FBRyxJQUFJLE1BQU0sUUFBUSxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHO0FBQ3JFLFVBQUksT0FBTyxNQUFNLENBQUMsR0FBRztBQUNuQixrQkFBVSxLQUFLLE9BQU8sS0FBSyxNQUFNLEtBQUssVUFBVSxHQUFHLEtBQUssQ0FBQztBQUN6RCxnQkFBUSxLQUFLLElBQUk7QUFBQSxNQUNuQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBRUEsU0FBTyxJQUFJLFVBQVUsV0FBVyxPQUFPO0FBQ3pDOzs7QUN4QmUsU0FBUixnQkFBaUIsVUFBVTtBQUNoQyxTQUFPLFdBQVc7QUFDaEIsV0FBTyxLQUFLLFFBQVEsUUFBUTtBQUFBLEVBQzlCO0FBQ0Y7QUFFTyxTQUFTLGFBQWEsVUFBVTtBQUNyQyxTQUFPLFNBQVMsTUFBTTtBQUNwQixXQUFPLEtBQUssUUFBUSxRQUFRO0FBQUEsRUFDOUI7QUFDRjs7O0FDUkEsSUFBSSxPQUFPLE1BQU0sVUFBVTtBQUUzQixTQUFTLFVBQVUsT0FBTztBQUN4QixTQUFPLFdBQVc7QUFDaEIsV0FBTyxLQUFLLEtBQUssS0FBSyxVQUFVLEtBQUs7QUFBQSxFQUN2QztBQUNGO0FBRUEsU0FBUyxhQUFhO0FBQ3BCLFNBQU8sS0FBSztBQUNkO0FBRWUsU0FBUixvQkFBaUIsT0FBTztBQUM3QixTQUFPLEtBQUssT0FBTyxTQUFTLE9BQU8sYUFDN0IsVUFBVSxPQUFPLFVBQVUsYUFBYSxRQUFRLGFBQWEsS0FBSyxDQUFDLENBQUM7QUFDNUU7OztBQ2ZBLElBQUksU0FBUyxNQUFNLFVBQVU7QUFFN0IsU0FBUyxXQUFXO0FBQ2xCLFNBQU8sTUFBTSxLQUFLLEtBQUssUUFBUTtBQUNqQztBQUVBLFNBQVMsZUFBZSxPQUFPO0FBQzdCLFNBQU8sV0FBVztBQUNoQixXQUFPLE9BQU8sS0FBSyxLQUFLLFVBQVUsS0FBSztBQUFBLEVBQ3pDO0FBQ0Y7QUFFZSxTQUFSLHVCQUFpQixPQUFPO0FBQzdCLFNBQU8sS0FBSyxVQUFVLFNBQVMsT0FBTyxXQUNoQyxlQUFlLE9BQU8sVUFBVSxhQUFhLFFBQVEsYUFBYSxLQUFLLENBQUMsQ0FBQztBQUNqRjs7O0FDZGUsU0FBUixlQUFpQixPQUFPO0FBQzdCLE1BQUksT0FBTyxVQUFVLFdBQVksU0FBUSxnQkFBUSxLQUFLO0FBRXRELFdBQVMsU0FBUyxLQUFLLFNBQVMsSUFBSSxPQUFPLFFBQVEsWUFBWSxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHO0FBQzlGLGFBQVMsUUFBUSxPQUFPLENBQUMsR0FBRyxJQUFJLE1BQU0sUUFBUSxXQUFXLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHO0FBQ25HLFdBQUssT0FBTyxNQUFNLENBQUMsTUFBTSxNQUFNLEtBQUssTUFBTSxLQUFLLFVBQVUsR0FBRyxLQUFLLEdBQUc7QUFDbEUsaUJBQVMsS0FBSyxJQUFJO0FBQUEsTUFDcEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUVBLFNBQU8sSUFBSSxVQUFVLFdBQVcsS0FBSyxRQUFRO0FBQy9DOzs7QUNmZSxTQUFSLGVBQWlCLFFBQVE7QUFDOUIsU0FBTyxJQUFJLE1BQU0sT0FBTyxNQUFNO0FBQ2hDOzs7QUNDZSxTQUFSLGdCQUFtQjtBQUN4QixTQUFPLElBQUksVUFBVSxLQUFLLFVBQVUsS0FBSyxRQUFRLElBQUksY0FBTSxHQUFHLEtBQUssUUFBUTtBQUM3RTtBQUVPLFNBQVMsVUFBVSxRQUFRQyxRQUFPO0FBQ3ZDLE9BQUssZ0JBQWdCLE9BQU87QUFDNUIsT0FBSyxlQUFlLE9BQU87QUFDM0IsT0FBSyxRQUFRO0FBQ2IsT0FBSyxVQUFVO0FBQ2YsT0FBSyxXQUFXQTtBQUNsQjtBQUVBLFVBQVUsWUFBWTtBQUFBLEVBQ3BCLGFBQWE7QUFBQSxFQUNiLGFBQWEsU0FBUyxPQUFPO0FBQUUsV0FBTyxLQUFLLFFBQVEsYUFBYSxPQUFPLEtBQUssS0FBSztBQUFBLEVBQUc7QUFBQSxFQUNwRixjQUFjLFNBQVMsT0FBTyxNQUFNO0FBQUUsV0FBTyxLQUFLLFFBQVEsYUFBYSxPQUFPLElBQUk7QUFBQSxFQUFHO0FBQUEsRUFDckYsZUFBZSxTQUFTLFVBQVU7QUFBRSxXQUFPLEtBQUssUUFBUSxjQUFjLFFBQVE7QUFBQSxFQUFHO0FBQUEsRUFDakYsa0JBQWtCLFNBQVMsVUFBVTtBQUFFLFdBQU8sS0FBSyxRQUFRLGlCQUFpQixRQUFRO0FBQUEsRUFBRztBQUN6Rjs7O0FDckJlLFNBQVJDLGtCQUFpQkMsSUFBRztBQUN6QixTQUFPLFdBQVc7QUFDaEIsV0FBT0E7QUFBQSxFQUNUO0FBQ0Y7OztBQ0FBLFNBQVMsVUFBVSxRQUFRLE9BQU8sT0FBTyxRQUFRLE1BQU0sTUFBTTtBQUMzRCxNQUFJLElBQUksR0FDSixNQUNBLGNBQWMsTUFBTSxRQUNwQixhQUFhLEtBQUs7QUFLdEIsU0FBTyxJQUFJLFlBQVksRUFBRSxHQUFHO0FBQzFCLFFBQUksT0FBTyxNQUFNLENBQUMsR0FBRztBQUNuQixXQUFLLFdBQVcsS0FBSyxDQUFDO0FBQ3RCLGFBQU8sQ0FBQyxJQUFJO0FBQUEsSUFDZCxPQUFPO0FBQ0wsWUFBTSxDQUFDLElBQUksSUFBSSxVQUFVLFFBQVEsS0FBSyxDQUFDLENBQUM7QUFBQSxJQUMxQztBQUFBLEVBQ0Y7QUFHQSxTQUFPLElBQUksYUFBYSxFQUFFLEdBQUc7QUFDM0IsUUFBSSxPQUFPLE1BQU0sQ0FBQyxHQUFHO0FBQ25CLFdBQUssQ0FBQyxJQUFJO0FBQUEsSUFDWjtBQUFBLEVBQ0Y7QUFDRjtBQUVBLFNBQVMsUUFBUSxRQUFRLE9BQU8sT0FBTyxRQUFRLE1BQU0sTUFBTSxLQUFLO0FBQzlELE1BQUksR0FDQSxNQUNBLGlCQUFpQixvQkFBSSxPQUNyQixjQUFjLE1BQU0sUUFDcEIsYUFBYSxLQUFLLFFBQ2xCLFlBQVksSUFBSSxNQUFNLFdBQVcsR0FDakM7QUFJSixPQUFLLElBQUksR0FBRyxJQUFJLGFBQWEsRUFBRSxHQUFHO0FBQ2hDLFFBQUksT0FBTyxNQUFNLENBQUMsR0FBRztBQUNuQixnQkFBVSxDQUFDLElBQUksV0FBVyxJQUFJLEtBQUssTUFBTSxLQUFLLFVBQVUsR0FBRyxLQUFLLElBQUk7QUFDcEUsVUFBSSxlQUFlLElBQUksUUFBUSxHQUFHO0FBQ2hDLGFBQUssQ0FBQyxJQUFJO0FBQUEsTUFDWixPQUFPO0FBQ0wsdUJBQWUsSUFBSSxVQUFVLElBQUk7QUFBQSxNQUNuQztBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBS0EsT0FBSyxJQUFJLEdBQUcsSUFBSSxZQUFZLEVBQUUsR0FBRztBQUMvQixlQUFXLElBQUksS0FBSyxRQUFRLEtBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxJQUFJO0FBQ2hELFFBQUksT0FBTyxlQUFlLElBQUksUUFBUSxHQUFHO0FBQ3ZDLGFBQU8sQ0FBQyxJQUFJO0FBQ1osV0FBSyxXQUFXLEtBQUssQ0FBQztBQUN0QixxQkFBZSxPQUFPLFFBQVE7QUFBQSxJQUNoQyxPQUFPO0FBQ0wsWUFBTSxDQUFDLElBQUksSUFBSSxVQUFVLFFBQVEsS0FBSyxDQUFDLENBQUM7QUFBQSxJQUMxQztBQUFBLEVBQ0Y7QUFHQSxPQUFLLElBQUksR0FBRyxJQUFJLGFBQWEsRUFBRSxHQUFHO0FBQ2hDLFNBQUssT0FBTyxNQUFNLENBQUMsTUFBTyxlQUFlLElBQUksVUFBVSxDQUFDLENBQUMsTUFBTSxNQUFPO0FBQ3BFLFdBQUssQ0FBQyxJQUFJO0FBQUEsSUFDWjtBQUFBLEVBQ0Y7QUFDRjtBQUVBLFNBQVMsTUFBTSxNQUFNO0FBQ25CLFNBQU8sS0FBSztBQUNkO0FBRWUsU0FBUixhQUFpQixPQUFPLEtBQUs7QUFDbEMsTUFBSSxDQUFDLFVBQVUsT0FBUSxRQUFPLE1BQU0sS0FBSyxNQUFNLEtBQUs7QUFFcEQsTUFBSSxPQUFPLE1BQU0sVUFBVSxXQUN2QixVQUFVLEtBQUssVUFDZixTQUFTLEtBQUs7QUFFbEIsTUFBSSxPQUFPLFVBQVUsV0FBWSxTQUFRQyxrQkFBUyxLQUFLO0FBRXZELFdBQVMsSUFBSSxPQUFPLFFBQVEsU0FBUyxJQUFJLE1BQU0sQ0FBQyxHQUFHLFFBQVEsSUFBSSxNQUFNLENBQUMsR0FBRyxPQUFPLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUc7QUFDL0csUUFBSSxTQUFTLFFBQVEsQ0FBQyxHQUNsQixRQUFRLE9BQU8sQ0FBQyxHQUNoQixjQUFjLE1BQU0sUUFDcEIsT0FBTyxVQUFVLE1BQU0sS0FBSyxRQUFRLFVBQVUsT0FBTyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQzFFLGFBQWEsS0FBSyxRQUNsQixhQUFhLE1BQU0sQ0FBQyxJQUFJLElBQUksTUFBTSxVQUFVLEdBQzVDLGNBQWMsT0FBTyxDQUFDLElBQUksSUFBSSxNQUFNLFVBQVUsR0FDOUMsWUFBWSxLQUFLLENBQUMsSUFBSSxJQUFJLE1BQU0sV0FBVztBQUUvQyxTQUFLLFFBQVEsT0FBTyxZQUFZLGFBQWEsV0FBVyxNQUFNLEdBQUc7QUFLakUsYUFBUyxLQUFLLEdBQUcsS0FBSyxHQUFHLFVBQVUsTUFBTSxLQUFLLFlBQVksRUFBRSxJQUFJO0FBQzlELFVBQUksV0FBVyxXQUFXLEVBQUUsR0FBRztBQUM3QixZQUFJLE1BQU0sR0FBSSxNQUFLLEtBQUs7QUFDeEIsZUFBTyxFQUFFLE9BQU8sWUFBWSxFQUFFLE1BQU0sRUFBRSxLQUFLLFdBQVc7QUFDdEQsaUJBQVMsUUFBUSxRQUFRO0FBQUEsTUFDM0I7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUVBLFdBQVMsSUFBSSxVQUFVLFFBQVEsT0FBTztBQUN0QyxTQUFPLFNBQVM7QUFDaEIsU0FBTyxRQUFRO0FBQ2YsU0FBTztBQUNUO0FBUUEsU0FBUyxVQUFVLE1BQU07QUFDdkIsU0FBTyxPQUFPLFNBQVMsWUFBWSxZQUFZLE9BQzNDLE9BQ0EsTUFBTSxLQUFLLElBQUk7QUFDckI7OztBQzVIZSxTQUFSLGVBQW1CO0FBQ3hCLFNBQU8sSUFBSSxVQUFVLEtBQUssU0FBUyxLQUFLLFFBQVEsSUFBSSxjQUFNLEdBQUcsS0FBSyxRQUFRO0FBQzVFOzs7QUNMZSxTQUFSLGFBQWlCLFNBQVMsVUFBVSxRQUFRO0FBQ2pELE1BQUksUUFBUSxLQUFLLE1BQU0sR0FBRyxTQUFTLE1BQU0sT0FBTyxLQUFLLEtBQUs7QUFDMUQsTUFBSSxPQUFPLFlBQVksWUFBWTtBQUNqQyxZQUFRLFFBQVEsS0FBSztBQUNyQixRQUFJLE1BQU8sU0FBUSxNQUFNLFVBQVU7QUFBQSxFQUNyQyxPQUFPO0FBQ0wsWUFBUSxNQUFNLE9BQU8sVUFBVSxFQUFFO0FBQUEsRUFDbkM7QUFDQSxNQUFJLFlBQVksTUFBTTtBQUNwQixhQUFTLFNBQVMsTUFBTTtBQUN4QixRQUFJLE9BQVEsVUFBUyxPQUFPLFVBQVU7QUFBQSxFQUN4QztBQUNBLE1BQUksVUFBVSxLQUFNLE1BQUssT0FBTztBQUFBLE1BQVEsUUFBTyxJQUFJO0FBQ25ELFNBQU8sU0FBUyxTQUFTLE1BQU0sTUFBTSxNQUFNLEVBQUUsTUFBTSxJQUFJO0FBQ3pEOzs7QUNaZSxTQUFSLGNBQWlCLFNBQVM7QUFDL0IsTUFBSUMsYUFBWSxRQUFRLFlBQVksUUFBUSxVQUFVLElBQUk7QUFFMUQsV0FBUyxVQUFVLEtBQUssU0FBUyxVQUFVQSxXQUFVLFNBQVMsS0FBSyxRQUFRLFFBQVEsS0FBSyxRQUFRLFFBQVEsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFLEdBQUcsU0FBUyxJQUFJLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHO0FBQ3ZLLGFBQVMsU0FBUyxRQUFRLENBQUMsR0FBRyxTQUFTLFFBQVEsQ0FBQyxHQUFHLElBQUksT0FBTyxRQUFRLFFBQVEsT0FBTyxDQUFDLElBQUksSUFBSSxNQUFNLENBQUMsR0FBRyxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHO0FBQy9ILFVBQUksT0FBTyxPQUFPLENBQUMsS0FBSyxPQUFPLENBQUMsR0FBRztBQUNqQyxjQUFNLENBQUMsSUFBSTtBQUFBLE1BQ2I7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUVBLFNBQU8sSUFBSSxJQUFJLEVBQUUsR0FBRztBQUNsQixXQUFPLENBQUMsSUFBSSxRQUFRLENBQUM7QUFBQSxFQUN2QjtBQUVBLFNBQU8sSUFBSSxVQUFVLFFBQVEsS0FBSyxRQUFRO0FBQzVDOzs7QUNsQmUsU0FBUixnQkFBbUI7QUFFeEIsV0FBUyxTQUFTLEtBQUssU0FBUyxJQUFJLElBQUksSUFBSSxPQUFPLFFBQVEsRUFBRSxJQUFJLEtBQUk7QUFDbkUsYUFBUyxRQUFRLE9BQU8sQ0FBQyxHQUFHLElBQUksTUFBTSxTQUFTLEdBQUcsT0FBTyxNQUFNLENBQUMsR0FBRyxNQUFNLEVBQUUsS0FBSyxLQUFJO0FBQ2xGLFVBQUksT0FBTyxNQUFNLENBQUMsR0FBRztBQUNuQixZQUFJLFFBQVEsS0FBSyx3QkFBd0IsSUFBSSxJQUFJLEVBQUcsTUFBSyxXQUFXLGFBQWEsTUFBTSxJQUFJO0FBQzNGLGVBQU87QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFQSxTQUFPO0FBQ1Q7OztBQ1ZlLFNBQVIsYUFBaUIsU0FBUztBQUMvQixNQUFJLENBQUMsUUFBUyxXQUFVQztBQUV4QixXQUFTLFlBQVksR0FBRyxHQUFHO0FBQ3pCLFdBQU8sS0FBSyxJQUFJLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQUEsRUFDMUQ7QUFFQSxXQUFTLFNBQVMsS0FBSyxTQUFTLElBQUksT0FBTyxRQUFRLGFBQWEsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRztBQUMvRixhQUFTLFFBQVEsT0FBTyxDQUFDLEdBQUcsSUFBSSxNQUFNLFFBQVEsWUFBWSxXQUFXLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxHQUFHLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUc7QUFDL0csVUFBSSxPQUFPLE1BQU0sQ0FBQyxHQUFHO0FBQ25CLGtCQUFVLENBQUMsSUFBSTtBQUFBLE1BQ2pCO0FBQUEsSUFDRjtBQUNBLGNBQVUsS0FBSyxXQUFXO0FBQUEsRUFDNUI7QUFFQSxTQUFPLElBQUksVUFBVSxZQUFZLEtBQUssUUFBUSxFQUFFLE1BQU07QUFDeEQ7QUFFQSxTQUFTQSxXQUFVLEdBQUcsR0FBRztBQUN2QixTQUFPLElBQUksSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJO0FBQy9DOzs7QUN2QmUsU0FBUixlQUFtQjtBQUN4QixNQUFJLFdBQVcsVUFBVSxDQUFDO0FBQzFCLFlBQVUsQ0FBQyxJQUFJO0FBQ2YsV0FBUyxNQUFNLE1BQU0sU0FBUztBQUM5QixTQUFPO0FBQ1Q7OztBQ0xlLFNBQVIsZ0JBQW1CO0FBQ3hCLFNBQU8sTUFBTSxLQUFLLElBQUk7QUFDeEI7OztBQ0ZlLFNBQVIsZUFBbUI7QUFFeEIsV0FBUyxTQUFTLEtBQUssU0FBUyxJQUFJLEdBQUcsSUFBSSxPQUFPLFFBQVEsSUFBSSxHQUFHLEVBQUUsR0FBRztBQUNwRSxhQUFTLFFBQVEsT0FBTyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFLEdBQUc7QUFDL0QsVUFBSSxPQUFPLE1BQU0sQ0FBQztBQUNsQixVQUFJLEtBQU0sUUFBTztBQUFBLElBQ25CO0FBQUEsRUFDRjtBQUVBLFNBQU87QUFDVDs7O0FDVmUsU0FBUixlQUFtQjtBQUN4QixNQUFJLE9BQU87QUFDWCxhQUFXLFFBQVEsS0FBTSxHQUFFO0FBQzNCLFNBQU87QUFDVDs7O0FDSmUsU0FBUixnQkFBbUI7QUFDeEIsU0FBTyxDQUFDLEtBQUssS0FBSztBQUNwQjs7O0FDRmUsU0FBUixhQUFpQixVQUFVO0FBRWhDLFdBQVMsU0FBUyxLQUFLLFNBQVMsSUFBSSxHQUFHLElBQUksT0FBTyxRQUFRLElBQUksR0FBRyxFQUFFLEdBQUc7QUFDcEUsYUFBUyxRQUFRLE9BQU8sQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLE1BQU0sUUFBUSxNQUFNLElBQUksR0FBRyxFQUFFLEdBQUc7QUFDckUsVUFBSSxPQUFPLE1BQU0sQ0FBQyxFQUFHLFVBQVMsS0FBSyxNQUFNLEtBQUssVUFBVSxHQUFHLEtBQUs7QUFBQSxJQUNsRTtBQUFBLEVBQ0Y7QUFFQSxTQUFPO0FBQ1Q7OztBQ1BBLFNBQVMsV0FBVyxNQUFNO0FBQ3hCLFNBQU8sV0FBVztBQUNoQixTQUFLLGdCQUFnQixJQUFJO0FBQUEsRUFDM0I7QUFDRjtBQUVBLFNBQVMsYUFBYSxVQUFVO0FBQzlCLFNBQU8sV0FBVztBQUNoQixTQUFLLGtCQUFrQixTQUFTLE9BQU8sU0FBUyxLQUFLO0FBQUEsRUFDdkQ7QUFDRjtBQUVBLFNBQVMsYUFBYSxNQUFNLE9BQU87QUFDakMsU0FBTyxXQUFXO0FBQ2hCLFNBQUssYUFBYSxNQUFNLEtBQUs7QUFBQSxFQUMvQjtBQUNGO0FBRUEsU0FBUyxlQUFlLFVBQVUsT0FBTztBQUN2QyxTQUFPLFdBQVc7QUFDaEIsU0FBSyxlQUFlLFNBQVMsT0FBTyxTQUFTLE9BQU8sS0FBSztBQUFBLEVBQzNEO0FBQ0Y7QUFFQSxTQUFTLGFBQWEsTUFBTSxPQUFPO0FBQ2pDLFNBQU8sV0FBVztBQUNoQixRQUFJLElBQUksTUFBTSxNQUFNLE1BQU0sU0FBUztBQUNuQyxRQUFJLEtBQUssS0FBTSxNQUFLLGdCQUFnQixJQUFJO0FBQUEsUUFDbkMsTUFBSyxhQUFhLE1BQU0sQ0FBQztBQUFBLEVBQ2hDO0FBQ0Y7QUFFQSxTQUFTLGVBQWUsVUFBVSxPQUFPO0FBQ3ZDLFNBQU8sV0FBVztBQUNoQixRQUFJLElBQUksTUFBTSxNQUFNLE1BQU0sU0FBUztBQUNuQyxRQUFJLEtBQUssS0FBTSxNQUFLLGtCQUFrQixTQUFTLE9BQU8sU0FBUyxLQUFLO0FBQUEsUUFDL0QsTUFBSyxlQUFlLFNBQVMsT0FBTyxTQUFTLE9BQU8sQ0FBQztBQUFBLEVBQzVEO0FBQ0Y7QUFFZSxTQUFSLGFBQWlCLE1BQU0sT0FBTztBQUNuQyxNQUFJLFdBQVcsa0JBQVUsSUFBSTtBQUU3QixNQUFJLFVBQVUsU0FBUyxHQUFHO0FBQ3hCLFFBQUksT0FBTyxLQUFLLEtBQUs7QUFDckIsV0FBTyxTQUFTLFFBQ1YsS0FBSyxlQUFlLFNBQVMsT0FBTyxTQUFTLEtBQUssSUFDbEQsS0FBSyxhQUFhLFFBQVE7QUFBQSxFQUNsQztBQUVBLFNBQU8sS0FBSyxNQUFNLFNBQVMsT0FDcEIsU0FBUyxRQUFRLGVBQWUsYUFBZSxPQUFPLFVBQVUsYUFDaEUsU0FBUyxRQUFRLGlCQUFpQixlQUNsQyxTQUFTLFFBQVEsaUJBQWlCLGNBQWdCLFVBQVUsS0FBSyxDQUFDO0FBQzNFOzs7QUN4RGUsU0FBUixlQUFpQixNQUFNO0FBQzVCLFNBQVEsS0FBSyxpQkFBaUIsS0FBSyxjQUFjLGVBQ3pDLEtBQUssWUFBWSxRQUNsQixLQUFLO0FBQ2Q7OztBQ0ZBLFNBQVMsWUFBWSxNQUFNO0FBQ3pCLFNBQU8sV0FBVztBQUNoQixTQUFLLE1BQU0sZUFBZSxJQUFJO0FBQUEsRUFDaEM7QUFDRjtBQUVBLFNBQVMsY0FBYyxNQUFNLE9BQU8sVUFBVTtBQUM1QyxTQUFPLFdBQVc7QUFDaEIsU0FBSyxNQUFNLFlBQVksTUFBTSxPQUFPLFFBQVE7QUFBQSxFQUM5QztBQUNGO0FBRUEsU0FBUyxjQUFjLE1BQU0sT0FBTyxVQUFVO0FBQzVDLFNBQU8sV0FBVztBQUNoQixRQUFJLElBQUksTUFBTSxNQUFNLE1BQU0sU0FBUztBQUNuQyxRQUFJLEtBQUssS0FBTSxNQUFLLE1BQU0sZUFBZSxJQUFJO0FBQUEsUUFDeEMsTUFBSyxNQUFNLFlBQVksTUFBTSxHQUFHLFFBQVE7QUFBQSxFQUMvQztBQUNGO0FBRWUsU0FBUixjQUFpQixNQUFNLE9BQU8sVUFBVTtBQUM3QyxTQUFPLFVBQVUsU0FBUyxJQUNwQixLQUFLLE1BQU0sU0FBUyxPQUNkLGNBQWMsT0FBTyxVQUFVLGFBQy9CLGdCQUNBLGVBQWUsTUFBTSxPQUFPLFlBQVksT0FBTyxLQUFLLFFBQVEsQ0FBQyxJQUNuRSxXQUFXLEtBQUssS0FBSyxHQUFHLElBQUk7QUFDcEM7QUFFTyxTQUFTLFdBQVcsTUFBTSxNQUFNO0FBQ3JDLFNBQU8sS0FBSyxNQUFNLGlCQUFpQixJQUFJLEtBQ2hDLGVBQVksSUFBSSxFQUFFLGlCQUFpQixNQUFNLElBQUksRUFBRSxpQkFBaUIsSUFBSTtBQUM3RTs7O0FDbENBLFNBQVMsZUFBZSxNQUFNO0FBQzVCLFNBQU8sV0FBVztBQUNoQixXQUFPLEtBQUssSUFBSTtBQUFBLEVBQ2xCO0FBQ0Y7QUFFQSxTQUFTLGlCQUFpQixNQUFNLE9BQU87QUFDckMsU0FBTyxXQUFXO0FBQ2hCLFNBQUssSUFBSSxJQUFJO0FBQUEsRUFDZjtBQUNGO0FBRUEsU0FBUyxpQkFBaUIsTUFBTSxPQUFPO0FBQ3JDLFNBQU8sV0FBVztBQUNoQixRQUFJLElBQUksTUFBTSxNQUFNLE1BQU0sU0FBUztBQUNuQyxRQUFJLEtBQUssS0FBTSxRQUFPLEtBQUssSUFBSTtBQUFBLFFBQzFCLE1BQUssSUFBSSxJQUFJO0FBQUEsRUFDcEI7QUFDRjtBQUVlLFNBQVIsaUJBQWlCLE1BQU0sT0FBTztBQUNuQyxTQUFPLFVBQVUsU0FBUyxJQUNwQixLQUFLLE1BQU0sU0FBUyxPQUNoQixpQkFBaUIsT0FBTyxVQUFVLGFBQ2xDLG1CQUNBLGtCQUFrQixNQUFNLEtBQUssQ0FBQyxJQUNsQyxLQUFLLEtBQUssRUFBRSxJQUFJO0FBQ3hCOzs7QUMzQkEsU0FBUyxXQUFXLFFBQVE7QUFDMUIsU0FBTyxPQUFPLEtBQUssRUFBRSxNQUFNLE9BQU87QUFDcEM7QUFFQSxTQUFTLFVBQVUsTUFBTTtBQUN2QixTQUFPLEtBQUssYUFBYSxJQUFJLFVBQVUsSUFBSTtBQUM3QztBQUVBLFNBQVMsVUFBVSxNQUFNO0FBQ3ZCLE9BQUssUUFBUTtBQUNiLE9BQUssU0FBUyxXQUFXLEtBQUssYUFBYSxPQUFPLEtBQUssRUFBRTtBQUMzRDtBQUVBLFVBQVUsWUFBWTtBQUFBLEVBQ3BCLEtBQUssU0FBUyxNQUFNO0FBQ2xCLFFBQUksSUFBSSxLQUFLLE9BQU8sUUFBUSxJQUFJO0FBQ2hDLFFBQUksSUFBSSxHQUFHO0FBQ1QsV0FBSyxPQUFPLEtBQUssSUFBSTtBQUNyQixXQUFLLE1BQU0sYUFBYSxTQUFTLEtBQUssT0FBTyxLQUFLLEdBQUcsQ0FBQztBQUFBLElBQ3hEO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUSxTQUFTLE1BQU07QUFDckIsUUFBSSxJQUFJLEtBQUssT0FBTyxRQUFRLElBQUk7QUFDaEMsUUFBSSxLQUFLLEdBQUc7QUFDVixXQUFLLE9BQU8sT0FBTyxHQUFHLENBQUM7QUFDdkIsV0FBSyxNQUFNLGFBQWEsU0FBUyxLQUFLLE9BQU8sS0FBSyxHQUFHLENBQUM7QUFBQSxJQUN4RDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFVBQVUsU0FBUyxNQUFNO0FBQ3ZCLFdBQU8sS0FBSyxPQUFPLFFBQVEsSUFBSSxLQUFLO0FBQUEsRUFDdEM7QUFDRjtBQUVBLFNBQVMsV0FBVyxNQUFNLE9BQU87QUFDL0IsTUFBSSxPQUFPLFVBQVUsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLE1BQU07QUFDOUMsU0FBTyxFQUFFLElBQUksRUFBRyxNQUFLLElBQUksTUFBTSxDQUFDLENBQUM7QUFDbkM7QUFFQSxTQUFTLGNBQWMsTUFBTSxPQUFPO0FBQ2xDLE1BQUksT0FBTyxVQUFVLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxNQUFNO0FBQzlDLFNBQU8sRUFBRSxJQUFJLEVBQUcsTUFBSyxPQUFPLE1BQU0sQ0FBQyxDQUFDO0FBQ3RDO0FBRUEsU0FBUyxZQUFZLE9BQU87QUFDMUIsU0FBTyxXQUFXO0FBQ2hCLGVBQVcsTUFBTSxLQUFLO0FBQUEsRUFDeEI7QUFDRjtBQUVBLFNBQVMsYUFBYSxPQUFPO0FBQzNCLFNBQU8sV0FBVztBQUNoQixrQkFBYyxNQUFNLEtBQUs7QUFBQSxFQUMzQjtBQUNGO0FBRUEsU0FBUyxnQkFBZ0IsT0FBTyxPQUFPO0FBQ3JDLFNBQU8sV0FBVztBQUNoQixLQUFDLE1BQU0sTUFBTSxNQUFNLFNBQVMsSUFBSSxhQUFhLGVBQWUsTUFBTSxLQUFLO0FBQUEsRUFDekU7QUFDRjtBQUVlLFNBQVIsZ0JBQWlCLE1BQU0sT0FBTztBQUNuQyxNQUFJLFFBQVEsV0FBVyxPQUFPLEVBQUU7QUFFaEMsTUFBSSxVQUFVLFNBQVMsR0FBRztBQUN4QixRQUFJLE9BQU8sVUFBVSxLQUFLLEtBQUssQ0FBQyxHQUFHLElBQUksSUFBSSxJQUFJLE1BQU07QUFDckQsV0FBTyxFQUFFLElBQUksRUFBRyxLQUFJLENBQUMsS0FBSyxTQUFTLE1BQU0sQ0FBQyxDQUFDLEVBQUcsUUFBTztBQUNyRCxXQUFPO0FBQUEsRUFDVDtBQUVBLFNBQU8sS0FBSyxNQUFNLE9BQU8sVUFBVSxhQUM3QixrQkFBa0IsUUFDbEIsY0FDQSxjQUFjLE9BQU8sS0FBSyxDQUFDO0FBQ25DOzs7QUMxRUEsU0FBUyxhQUFhO0FBQ3BCLE9BQUssY0FBYztBQUNyQjtBQUVBLFNBQVMsYUFBYSxPQUFPO0FBQzNCLFNBQU8sV0FBVztBQUNoQixTQUFLLGNBQWM7QUFBQSxFQUNyQjtBQUNGO0FBRUEsU0FBUyxhQUFhLE9BQU87QUFDM0IsU0FBTyxXQUFXO0FBQ2hCLFFBQUksSUFBSSxNQUFNLE1BQU0sTUFBTSxTQUFTO0FBQ25DLFNBQUssY0FBYyxLQUFLLE9BQU8sS0FBSztBQUFBLEVBQ3RDO0FBQ0Y7QUFFZSxTQUFSLGFBQWlCLE9BQU87QUFDN0IsU0FBTyxVQUFVLFNBQ1gsS0FBSyxLQUFLLFNBQVMsT0FDZixjQUFjLE9BQU8sVUFBVSxhQUMvQixlQUNBLGNBQWMsS0FBSyxDQUFDLElBQ3hCLEtBQUssS0FBSyxFQUFFO0FBQ3BCOzs7QUN4QkEsU0FBUyxhQUFhO0FBQ3BCLE9BQUssWUFBWTtBQUNuQjtBQUVBLFNBQVMsYUFBYSxPQUFPO0FBQzNCLFNBQU8sV0FBVztBQUNoQixTQUFLLFlBQVk7QUFBQSxFQUNuQjtBQUNGO0FBRUEsU0FBUyxhQUFhLE9BQU87QUFDM0IsU0FBTyxXQUFXO0FBQ2hCLFFBQUksSUFBSSxNQUFNLE1BQU0sTUFBTSxTQUFTO0FBQ25DLFNBQUssWUFBWSxLQUFLLE9BQU8sS0FBSztBQUFBLEVBQ3BDO0FBQ0Y7QUFFZSxTQUFSLGFBQWlCLE9BQU87QUFDN0IsU0FBTyxVQUFVLFNBQ1gsS0FBSyxLQUFLLFNBQVMsT0FDZixjQUFjLE9BQU8sVUFBVSxhQUMvQixlQUNBLGNBQWMsS0FBSyxDQUFDLElBQ3hCLEtBQUssS0FBSyxFQUFFO0FBQ3BCOzs7QUN4QkEsU0FBUyxRQUFRO0FBQ2YsTUFBSSxLQUFLLFlBQWEsTUFBSyxXQUFXLFlBQVksSUFBSTtBQUN4RDtBQUVlLFNBQVIsZ0JBQW1CO0FBQ3hCLFNBQU8sS0FBSyxLQUFLLEtBQUs7QUFDeEI7OztBQ05BLFNBQVMsUUFBUTtBQUNmLE1BQUksS0FBSyxnQkFBaUIsTUFBSyxXQUFXLGFBQWEsTUFBTSxLQUFLLFdBQVcsVUFBVTtBQUN6RjtBQUVlLFNBQVIsZ0JBQW1CO0FBQ3hCLFNBQU8sS0FBSyxLQUFLLEtBQUs7QUFDeEI7OztBQ0plLFNBQVIsZUFBaUIsTUFBTTtBQUM1QixNQUFJLFNBQVMsT0FBTyxTQUFTLGFBQWEsT0FBTyxnQkFBUSxJQUFJO0FBQzdELFNBQU8sS0FBSyxPQUFPLFdBQVc7QUFDNUIsV0FBTyxLQUFLLFlBQVksT0FBTyxNQUFNLE1BQU0sU0FBUyxDQUFDO0FBQUEsRUFDdkQsQ0FBQztBQUNIOzs7QUNKQSxTQUFTLGVBQWU7QUFDdEIsU0FBTztBQUNUO0FBRWUsU0FBUixlQUFpQixNQUFNLFFBQVE7QUFDcEMsTUFBSSxTQUFTLE9BQU8sU0FBUyxhQUFhLE9BQU8sZ0JBQVEsSUFBSSxHQUN6RCxTQUFTLFVBQVUsT0FBTyxlQUFlLE9BQU8sV0FBVyxhQUFhLFNBQVMsaUJBQVMsTUFBTTtBQUNwRyxTQUFPLEtBQUssT0FBTyxXQUFXO0FBQzVCLFdBQU8sS0FBSyxhQUFhLE9BQU8sTUFBTSxNQUFNLFNBQVMsR0FBRyxPQUFPLE1BQU0sTUFBTSxTQUFTLEtBQUssSUFBSTtBQUFBLEVBQy9GLENBQUM7QUFDSDs7O0FDYkEsU0FBUyxTQUFTO0FBQ2hCLE1BQUksU0FBUyxLQUFLO0FBQ2xCLE1BQUksT0FBUSxRQUFPLFlBQVksSUFBSTtBQUNyQztBQUVlLFNBQVIsaUJBQW1CO0FBQ3hCLFNBQU8sS0FBSyxLQUFLLE1BQU07QUFDekI7OztBQ1BBLFNBQVMseUJBQXlCO0FBQ2hDLE1BQUksUUFBUSxLQUFLLFVBQVUsS0FBSyxHQUFHLFNBQVMsS0FBSztBQUNqRCxTQUFPLFNBQVMsT0FBTyxhQUFhLE9BQU8sS0FBSyxXQUFXLElBQUk7QUFDakU7QUFFQSxTQUFTLHNCQUFzQjtBQUM3QixNQUFJLFFBQVEsS0FBSyxVQUFVLElBQUksR0FBRyxTQUFTLEtBQUs7QUFDaEQsU0FBTyxTQUFTLE9BQU8sYUFBYSxPQUFPLEtBQUssV0FBVyxJQUFJO0FBQ2pFO0FBRWUsU0FBUixjQUFpQixNQUFNO0FBQzVCLFNBQU8sS0FBSyxPQUFPLE9BQU8sc0JBQXNCLHNCQUFzQjtBQUN4RTs7O0FDWmUsU0FBUixjQUFpQixPQUFPO0FBQzdCLFNBQU8sVUFBVSxTQUNYLEtBQUssU0FBUyxZQUFZLEtBQUssSUFDL0IsS0FBSyxLQUFLLEVBQUU7QUFDcEI7OztBQ0pBLFNBQVMsZ0JBQWdCLFVBQVU7QUFDakMsU0FBTyxTQUFTLE9BQU87QUFDckIsYUFBUyxLQUFLLE1BQU0sT0FBTyxLQUFLLFFBQVE7QUFBQSxFQUMxQztBQUNGO0FBRUEsU0FBUyxlQUFlLFdBQVc7QUFDakMsU0FBTyxVQUFVLEtBQUssRUFBRSxNQUFNLE9BQU8sRUFBRSxJQUFJLFNBQVMsR0FBRztBQUNyRCxRQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUUsUUFBUSxHQUFHO0FBQ2hDLFFBQUksS0FBSyxFQUFHLFFBQU8sRUFBRSxNQUFNLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxNQUFNLEdBQUcsQ0FBQztBQUNuRCxXQUFPLEVBQUMsTUFBTSxHQUFHLEtBQVU7QUFBQSxFQUM3QixDQUFDO0FBQ0g7QUFFQSxTQUFTLFNBQVMsVUFBVTtBQUMxQixTQUFPLFdBQVc7QUFDaEIsUUFBSSxLQUFLLEtBQUs7QUFDZCxRQUFJLENBQUMsR0FBSTtBQUNULGFBQVMsSUFBSSxHQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsUUFBUSxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUc7QUFDcEQsVUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxRQUFRLEVBQUUsU0FBUyxTQUFTLFNBQVMsRUFBRSxTQUFTLFNBQVMsTUFBTTtBQUN2RixhQUFLLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTztBQUFBLE1BQ3hELE9BQU87QUFDTCxXQUFHLEVBQUUsQ0FBQyxJQUFJO0FBQUEsTUFDWjtBQUFBLElBQ0Y7QUFDQSxRQUFJLEVBQUUsRUFBRyxJQUFHLFNBQVM7QUFBQSxRQUNoQixRQUFPLEtBQUs7QUFBQSxFQUNuQjtBQUNGO0FBRUEsU0FBUyxNQUFNLFVBQVUsT0FBTyxTQUFTO0FBQ3ZDLFNBQU8sV0FBVztBQUNoQixRQUFJLEtBQUssS0FBSyxNQUFNLEdBQUcsV0FBVyxnQkFBZ0IsS0FBSztBQUN2RCxRQUFJLEdBQUksVUFBUyxJQUFJLEdBQUcsSUFBSSxHQUFHLFFBQVEsSUFBSSxHQUFHLEVBQUUsR0FBRztBQUNqRCxXQUFLLElBQUksR0FBRyxDQUFDLEdBQUcsU0FBUyxTQUFTLFFBQVEsRUFBRSxTQUFTLFNBQVMsTUFBTTtBQUNsRSxhQUFLLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTztBQUN0RCxhQUFLLGlCQUFpQixFQUFFLE1BQU0sRUFBRSxXQUFXLFVBQVUsRUFBRSxVQUFVLE9BQU87QUFDeEUsVUFBRSxRQUFRO0FBQ1Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUNBLFNBQUssaUJBQWlCLFNBQVMsTUFBTSxVQUFVLE9BQU87QUFDdEQsUUFBSSxFQUFDLE1BQU0sU0FBUyxNQUFNLE1BQU0sU0FBUyxNQUFNLE9BQWMsVUFBb0IsUUFBZ0I7QUFDakcsUUFBSSxDQUFDLEdBQUksTUFBSyxPQUFPLENBQUMsQ0FBQztBQUFBLFFBQ2xCLElBQUcsS0FBSyxDQUFDO0FBQUEsRUFDaEI7QUFDRjtBQUVlLFNBQVIsV0FBaUIsVUFBVSxPQUFPLFNBQVM7QUFDaEQsTUFBSSxZQUFZLGVBQWUsV0FBVyxFQUFFLEdBQUcsR0FBRyxJQUFJLFVBQVUsUUFBUTtBQUV4RSxNQUFJLFVBQVUsU0FBUyxHQUFHO0FBQ3hCLFFBQUksS0FBSyxLQUFLLEtBQUssRUFBRTtBQUNyQixRQUFJLEdBQUksVUFBUyxJQUFJLEdBQUcsSUFBSSxHQUFHLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBRSxHQUFHO0FBQ3BELFdBQUssSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRztBQUNqQyxhQUFLLElBQUksVUFBVSxDQUFDLEdBQUcsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTTtBQUMzRCxpQkFBTyxFQUFFO0FBQUEsUUFDWDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQ0E7QUFBQSxFQUNGO0FBRUEsT0FBSyxRQUFRLFFBQVE7QUFDckIsT0FBSyxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQUUsRUFBRyxNQUFLLEtBQUssR0FBRyxVQUFVLENBQUMsR0FBRyxPQUFPLE9BQU8sQ0FBQztBQUNsRSxTQUFPO0FBQ1Q7OztBQ2hFQSxTQUFTLGNBQWMsTUFBTSxNQUFNLFFBQVE7QUFDekMsTUFBSSxTQUFTLGVBQVksSUFBSSxHQUN6QixRQUFRLE9BQU87QUFFbkIsTUFBSSxPQUFPLFVBQVUsWUFBWTtBQUMvQixZQUFRLElBQUksTUFBTSxNQUFNLE1BQU07QUFBQSxFQUNoQyxPQUFPO0FBQ0wsWUFBUSxPQUFPLFNBQVMsWUFBWSxPQUFPO0FBQzNDLFFBQUksT0FBUSxPQUFNLFVBQVUsTUFBTSxPQUFPLFNBQVMsT0FBTyxVQUFVLEdBQUcsTUFBTSxTQUFTLE9BQU87QUFBQSxRQUN2RixPQUFNLFVBQVUsTUFBTSxPQUFPLEtBQUs7QUFBQSxFQUN6QztBQUVBLE9BQUssY0FBYyxLQUFLO0FBQzFCO0FBRUEsU0FBUyxpQkFBaUIsTUFBTSxRQUFRO0FBQ3RDLFNBQU8sV0FBVztBQUNoQixXQUFPLGNBQWMsTUFBTSxNQUFNLE1BQU07QUFBQSxFQUN6QztBQUNGO0FBRUEsU0FBUyxpQkFBaUIsTUFBTSxRQUFRO0FBQ3RDLFNBQU8sV0FBVztBQUNoQixXQUFPLGNBQWMsTUFBTSxNQUFNLE9BQU8sTUFBTSxNQUFNLFNBQVMsQ0FBQztBQUFBLEVBQ2hFO0FBQ0Y7QUFFZSxTQUFSLGlCQUFpQixNQUFNLFFBQVE7QUFDcEMsU0FBTyxLQUFLLE1BQU0sT0FBTyxXQUFXLGFBQzlCLG1CQUNBLGtCQUFrQixNQUFNLE1BQU0sQ0FBQztBQUN2Qzs7O0FDakNlLFVBQVIsbUJBQW9CO0FBQ3pCLFdBQVMsU0FBUyxLQUFLLFNBQVMsSUFBSSxHQUFHLElBQUksT0FBTyxRQUFRLElBQUksR0FBRyxFQUFFLEdBQUc7QUFDcEUsYUFBUyxRQUFRLE9BQU8sQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLE1BQU0sUUFBUSxNQUFNLElBQUksR0FBRyxFQUFFLEdBQUc7QUFDckUsVUFBSSxPQUFPLE1BQU0sQ0FBQyxFQUFHLE9BQU07QUFBQSxJQUM3QjtBQUFBLEVBQ0Y7QUFDRjs7O0FDNkJPLElBQUksT0FBTyxDQUFDLElBQUk7QUFFaEIsU0FBUyxVQUFVLFFBQVEsU0FBUztBQUN6QyxPQUFLLFVBQVU7QUFDZixPQUFLLFdBQVc7QUFDbEI7QUFFQSxTQUFTLFlBQVk7QUFDbkIsU0FBTyxJQUFJLFVBQVUsQ0FBQyxDQUFDLFNBQVMsZUFBZSxDQUFDLEdBQUcsSUFBSTtBQUN6RDtBQUVBLFNBQVMsc0JBQXNCO0FBQzdCLFNBQU87QUFDVDtBQUVBLFVBQVUsWUFBWSxVQUFVLFlBQVk7QUFBQSxFQUMxQyxhQUFhO0FBQUEsRUFDYixRQUFRO0FBQUEsRUFDUixXQUFXO0FBQUEsRUFDWCxhQUFhO0FBQUEsRUFDYixnQkFBZ0I7QUFBQSxFQUNoQixRQUFRO0FBQUEsRUFDUixNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsRUFDUCxNQUFNO0FBQUEsRUFDTixNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsRUFDUCxXQUFXO0FBQUEsRUFDWCxPQUFPO0FBQUEsRUFDUCxNQUFNO0FBQUEsRUFDTixNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsRUFDUCxNQUFNO0FBQUEsRUFDTixNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsRUFDUCxNQUFNO0FBQUEsRUFDTixNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsRUFDUCxVQUFVO0FBQUEsRUFDVixTQUFTO0FBQUEsRUFDVCxNQUFNO0FBQUEsRUFDTixNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsRUFDUCxPQUFPO0FBQUEsRUFDUCxRQUFRO0FBQUEsRUFDUixRQUFRO0FBQUEsRUFDUixRQUFRO0FBQUEsRUFDUixPQUFPO0FBQUEsRUFDUCxPQUFPO0FBQUEsRUFDUCxJQUFJO0FBQUEsRUFDSixVQUFVO0FBQUEsRUFDVixDQUFDLE9BQU8sUUFBUSxHQUFHO0FBQ3JCOzs7QUNyRmUsU0FBUkMsZ0JBQWlCLFVBQVU7QUFDaEMsU0FBTyxPQUFPLGFBQWEsV0FDckIsSUFBSSxVQUFVLENBQUMsQ0FBQyxTQUFTLGNBQWMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsZUFBZSxDQUFDLElBQzlFLElBQUksVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSTtBQUN4Qzs7O0FuSE1PLElBQU0sa0JBQWtCO0FBRy9CLElBQU0sZ0JBQWdCLENBQUMsTUFBTSxNQUFNLE1BQU0sTUFBTSxNQUFNLEtBQUs7QUFFMUQsSUFBTSxjQUEyQztBQUFBLEVBQy9DLE1BQU07QUFBQSxFQUNOLE1BQU07QUFBQSxFQUNOLE1BQU07QUFBQSxFQUNOLE1BQU07QUFBQSxFQUNOLE1BQU07QUFBQSxFQUNOLEtBQUs7QUFDUDtBQUVBLElBQU0sZ0JBQTZDO0FBQUEsRUFDakQsTUFBTTtBQUFBLEVBQ04sTUFBTTtBQUFBLEVBQ04sTUFBTTtBQUFBLEVBQ04sTUFBTTtBQUFBLEVBQ04sTUFBTTtBQUFBLEVBQ04sS0FBSztBQUNQO0FBR0EsU0FBUyxlQUFlLFFBQTBDO0FBQ2hFLFFBQU0sU0FBUyxXQUFXLElBQUk7QUFDOUIsTUFBSSxXQUFXLFFBQVEsV0FBVyxRQUFRLFdBQVcsS0FBTSxRQUFPLENBQUMsTUFBTSxPQUFPLFNBQVMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNuRyxNQUFJLFdBQVcsS0FBTSxRQUFPLFdBQVcsSUFBSTtBQUMzQyxNQUFJLFdBQVcsTUFBTTtBQUNuQixVQUFNLFVBQVUsV0FBVyxLQUFLO0FBQ2hDLFVBQU0sV0FBVyxXQUFXLElBQUk7QUFDaEMsV0FBTyxDQUFDLE1BQU8sRUFBRSxTQUFTLE1BQU0sSUFBSSxRQUFRLENBQUMsSUFBSSxTQUFTLENBQUM7QUFBQSxFQUM3RDtBQUNBLFNBQU8sV0FBVyxLQUFLO0FBQ3pCO0FBRU8sSUFBTSxZQUFOLGNBQXdCLDBCQUFTO0FBQUE7QUFBQSxFQWF0QyxZQUNFLE1BQ1EsUUFDUjtBQUNBLFVBQU0sSUFBSTtBQUZGO0FBVlYsU0FBUSxvQkFBaUM7QUFDekMsU0FBUSxpQkFBOEI7QUFDdEMsU0FBUSxzQkFBbUM7QUFDM0MsU0FBUSxnQkFBbUU7QUFDM0UsU0FBUSxpQkFBd0M7QUFDaEQsU0FBUSxpQkFBdUQ7QUFRN0QsVUFBTSxNQUFNLG9CQUFJLEtBQUs7QUFDckIsU0FBSyxlQUFlLElBQUksWUFBWTtBQUNwQyxTQUFLLGdCQUFnQixJQUFJLFNBQVM7QUFDbEMsU0FBSyxjQUFjLElBQUksWUFBWTtBQUFBLEVBQ3JDO0FBQUEsRUFFQSxjQUFzQjtBQUNwQixXQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ0EsaUJBQXlCO0FBQ3ZCLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFDQSxVQUFrQjtBQUNoQixXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRUEsV0FBb0M7QUFDbEMsV0FBTztBQUFBLE1BQ0wsZUFBZSxLQUFLO0FBQUEsTUFDcEIsY0FBYyxLQUFLO0FBQUEsTUFDbkIsZUFBZSxLQUFLO0FBQUEsTUFDcEIsYUFBYSxLQUFLO0FBQUEsTUFDbEIsbUJBQW1CLEtBQUs7QUFBQSxNQUN4QixnQkFBZ0IsS0FBSztBQUFBLE1BQ3JCLHFCQUFxQixLQUFLO0FBQUEsSUFDNUI7QUFBQSxFQUNGO0FBQUEsRUFFQSxNQUFNLFNBQVMsT0FBZ0MsUUFBd0M7QUFDckYsUUFBSSxNQUFNLGtCQUFrQixPQUFXLE1BQUssZ0JBQWdCLE1BQU07QUFDbEUsUUFBSSxNQUFNLGlCQUFpQixPQUFXLE1BQUssZUFBZSxNQUFNO0FBQ2hFLFFBQUksTUFBTSxrQkFBa0IsT0FBVyxNQUFLLGdCQUFnQixNQUFNO0FBQ2xFLFFBQUksTUFBTSxnQkFBZ0IsT0FBVyxNQUFLLGNBQWMsTUFBTTtBQUM5RCxRQUFJLE1BQU0sc0JBQXNCO0FBQzlCLFdBQUssb0JBQW9CLE1BQU07QUFDakMsUUFBSSxNQUFNLG1CQUFtQixPQUFXLE1BQUssaUJBQWlCLE1BQU07QUFDcEUsUUFBSSxNQUFNLHdCQUF3QjtBQUNoQyxXQUFLLHNCQUFzQixNQUFNO0FBQ25DLFVBQU0sTUFBTSxTQUFTLE9BQU8sTUFBTTtBQUFBLEVBQ3BDO0FBQUEsRUFFQSxNQUFNLFNBQXdCO0FBQzVCLFVBQU0sS0FBSyxPQUFPO0FBRWxCLDBCQUFzQixNQUFNO0FBQzFCLFdBQUssT0FBTyxFQUFFLE1BQU0sUUFBUSxLQUFLO0FBQUEsSUFDbkMsQ0FBQztBQUVELFNBQUssaUJBQWlCLElBQUksZUFBZSxNQUFNO0FBQzdDLFVBQUksS0FBSyxlQUFnQixjQUFhLEtBQUssY0FBYztBQUN6RCxXQUFLLGlCQUFpQixXQUFXLE1BQU07QUFDckMsYUFBSyxPQUFPLEVBQUUsTUFBTSxRQUFRLEtBQUs7QUFBQSxNQUNuQyxHQUFHLEdBQUc7QUFBQSxJQUNSLENBQUM7QUFDRCxTQUFLLGVBQWUsUUFBUSxLQUFLLFdBQVc7QUFBQSxFQUM5QztBQUFBO0FBQUEsRUFHQSxNQUFNLFNBQXdCO0FBNUhoQztBQTZISSxVQUFNLEVBQUUsVUFBVSxJQUFJO0FBQ3RCLGNBQVUsTUFBTTtBQUNoQixjQUFVLFNBQVMsbUJBQW1CO0FBRXRDLFVBQU0sVUFBVSxLQUFLLE9BQU8sS0FBSztBQUNqQyxVQUFNLFdBQVcsTUFBTTtBQUN2QixVQUFNLGNBQWMsa0JBQWtCLEtBQUssTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDO0FBQ2hGLFVBQU0sV0FBVyxZQUFZLE9BQU8sQ0FBQyxNQUFNLFVBQVUsQ0FBQyxDQUFDO0FBQ3ZELFVBQU0sY0FBYyxRQUFRLE9BQU8sQ0FBQyxNQUFNLEVBQUUsVUFBVSxXQUFXLFFBQVEsQ0FBQztBQUMxRSxVQUFNLGNBQ0osWUFBWSxTQUFTLElBQUksS0FBSyxNQUFNLFlBQVksT0FBTyxDQUFDLEtBQUssTUFBTSxNQUFNLEVBQUUsVUFBVSxDQUFDLElBQUksWUFBWSxNQUFNLElBQUk7QUFFbEgsVUFBTSxXQUFXLFVBQVUsVUFBVSxFQUFFLEtBQUssc0JBQXNCLENBQUM7QUFDbkUsU0FBSyxRQUFRLFVBQVUsU0FBUyxPQUFPLFlBQVksTUFBTSxDQUFDO0FBQzFELFNBQUssUUFBUSxVQUFVLE9BQU8sT0FBTyxTQUFTLE1BQU0sQ0FBQztBQUNyRCxTQUFLLFFBQVEsVUFBVSxVQUFVLE9BQU8sWUFBWSxNQUFNLENBQUM7QUFDM0QsU0FBSyxRQUFRLFVBQVUsV0FBVyxPQUFPLFFBQVEsTUFBTSxDQUFDO0FBQ3hELFNBQUssUUFBUSxVQUFVLGdCQUFnQixHQUFHLFdBQVcsR0FBRztBQUV4RCxVQUFNLGNBQWMsVUFBVSxVQUFVLEVBQUUsS0FBSyw0QkFBNEIsQ0FBQztBQUM1RSxVQUFNLGVBQXNFO0FBQUEsTUFDMUUsRUFBRSxPQUFPLFNBQVMsT0FBTyxpQkFBaUI7QUFBQSxNQUMxQyxFQUFFLE9BQU8sUUFBUSxPQUFPLGVBQWU7QUFBQSxNQUN2QyxFQUFFLE9BQU8sWUFBWSxPQUFPLGdCQUFnQjtBQUFBLE1BQzVDLEVBQUUsT0FBTyxXQUFXLE9BQU8sZ0JBQWdCO0FBQUEsTUFDM0MsRUFBRSxPQUFPLE9BQU8sT0FBTyxZQUFZO0FBQUEsSUFDckM7QUFDQSxVQUFNLGdCQUFlLHdCQUFhLEtBQUssQ0FBQyxNQUFNLEVBQUUsVUFBVSxLQUFLLGFBQWEsTUFBdkQsbUJBQTBELFVBQTFELFlBQW1FLEtBQUs7QUFFN0YsVUFBTSxzQkFBc0IsWUFBWSxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsQ0FBQztBQUNsRixVQUFNLGtCQUFrQixvQkFBb0IsVUFBVSxFQUFFLEtBQUssZUFBZSxDQUFDO0FBQzdFLG9CQUFnQixXQUFXLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFakQsb0JBQWdCLGlCQUFpQixTQUFTLENBQUMsTUFBTTtBQUMvQyxRQUFFLGdCQUFnQjtBQUNsQixZQUFNLE9BQU8sSUFBSSxzQkFBSztBQUN0QixpQkFBVyxPQUFPLGNBQWM7QUFDOUIsYUFBSyxRQUFRLENBQUMsU0FBUztBQUNyQixlQUFLLFNBQVMsSUFBSSxLQUFLO0FBQ3ZCLGVBQUssV0FBVyxJQUFJLFVBQVUsS0FBSyxhQUFhO0FBQ2hELGVBQUssUUFBUSxNQUFNO0FBQ2pCLGlCQUFLLGdCQUFnQixJQUFJO0FBQ3pCLGlCQUFLLE9BQU87QUFBQSxVQUNkLENBQUM7QUFBQSxRQUNILENBQUM7QUFBQSxNQUNIO0FBQ0EsV0FBSyxpQkFBaUIsQ0FBQztBQUFBLElBQ3pCLENBQUM7QUFFRCxVQUFNLFlBQVksVUFBVSxVQUFVLEVBQUUsS0FBSyxvQkFBb0IsQ0FBQztBQUVsRSxZQUFRLEtBQUssZUFBZTtBQUFBLE1BQzFCLEtBQUs7QUFDSCxhQUFLLG1CQUFtQixXQUFXLFNBQVMsYUFBYSxRQUFRO0FBQ2pFO0FBQUEsTUFDRixLQUFLO0FBQ0gsYUFBSyxrQkFBa0IsV0FBVyxTQUFTLFFBQVE7QUFDbkQ7QUFBQSxNQUNGLEtBQUs7QUFDSCxhQUFLLHNCQUFzQixXQUFXLGFBQWEsUUFBUTtBQUMzRDtBQUFBLE1BQ0YsS0FBSztBQUNILGFBQUsscUJBQXFCLFdBQVcsT0FBTztBQUM1QztBQUFBLE1BQ0YsS0FBSztBQUNILGFBQUssaUJBQWlCLFNBQVM7QUFDL0I7QUFBQSxJQUNKO0FBQUEsRUFDRjtBQUFBLEVBRVEsbUJBQ04sV0FDQSxTQUNBLGFBQ0EsVUFDTTtBQXhNVjtBQXlNSSxVQUFNLGtCQUFrQixLQUFLLHFCQUFxQixPQUFPO0FBQ3pELFVBQU0sY0FBYyxvQkFBSSxJQUFvQjtBQUM1QyxlQUFXLFFBQVEsYUFBYTtBQUM5QixZQUFNLFVBQVUsSUFBSSxLQUFLLEtBQUssY0FBYztBQUM1QyxjQUFRLFFBQVEsUUFBUSxRQUFRLElBQUksS0FBSyxRQUFRO0FBQ2pELFlBQU0sYUFBYSxRQUFRLFlBQVksRUFBRSxNQUFNLEdBQUcsRUFBRTtBQUNwRCxVQUFJLGFBQWEsU0FBVSxhQUFZLElBQUksY0FBYSxpQkFBWSxJQUFJLFVBQVUsTUFBMUIsWUFBK0IsS0FBSyxDQUFDO0FBQUEsSUFDL0Y7QUFDQSxVQUFNLFlBQVksU0FBUyxTQUFTLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDL0MsVUFBTSxhQUFhLFNBQVMsU0FBUyxNQUFNLEdBQUcsQ0FBQyxDQUFDLElBQUk7QUFDcEQsVUFBTSxjQUFjLEtBQUssaUJBQWlCLGFBQWEsS0FBSyxrQkFBa0I7QUFDOUUsVUFBTSxZQUFZLElBQUksS0FBSyxLQUFLLGNBQWMsS0FBSyxlQUFlLENBQUMsRUFBRSxlQUFlLFdBQVcsRUFBRSxPQUFPLE9BQU8sQ0FBQztBQUNoSCxVQUFNLFFBQVEsY0FBYyxlQUFlLEdBQUcsU0FBUyxLQUFLLEtBQUssWUFBWTtBQUM3RSxTQUFLO0FBQUEsTUFDSDtBQUFBLE1BQ0E7QUFBQSxNQUNBLE1BQU07QUFDSixhQUFLO0FBQ0wsWUFBSSxLQUFLLGdCQUFnQixHQUFHO0FBQzFCLGVBQUssZ0JBQWdCO0FBQ3JCLGVBQUs7QUFBQSxRQUNQO0FBQ0EsYUFBSyxPQUFPO0FBQUEsTUFDZDtBQUFBLE1BQ0EsTUFBTTtBQUNKLGFBQUs7QUFDTCxZQUFJLEtBQUssZ0JBQWdCLElBQUk7QUFDM0IsZUFBSyxnQkFBZ0I7QUFDckIsZUFBSztBQUFBLFFBQ1A7QUFDQSxhQUFLLE9BQU87QUFBQSxNQUNkO0FBQUEsSUFDRjtBQUNBLFNBQUssb0JBQW9CLFdBQVcsS0FBSyxjQUFjLEtBQUssZUFBZSxpQkFBaUIsVUFBVSxXQUFXO0FBQUEsRUFDbkg7QUFBQSxFQUVRLGtCQUFrQixXQUF3QixTQUF3QixVQUF3QjtBQUNoRyxVQUFNLGFBQWEsUUFBUSxPQUFPLENBQUMsTUFBTSxFQUFFLFVBQVUsV0FBVyxPQUFPLEtBQUssV0FBVyxDQUFDLENBQUM7QUFDekYsVUFBTSxrQkFBa0IsS0FBSyxxQkFBcUIsVUFBVTtBQUM1RCxTQUFLO0FBQUEsTUFDSDtBQUFBLE1BQ0EsT0FBTyxLQUFLLFdBQVc7QUFBQSxNQUN2QixNQUFNO0FBQ0osYUFBSztBQUNMLGFBQUssT0FBTztBQUFBLE1BQ2Q7QUFBQSxNQUNBLE1BQU07QUFDSixhQUFLO0FBQ0wsYUFBSyxPQUFPO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFDQSxTQUFLLGtCQUFrQixXQUFXLEtBQUssYUFBYSxpQkFBaUIsUUFBUTtBQUFBLEVBQy9FO0FBQUEsRUFFUSxzQkFBc0IsV0FBd0IsYUFBMkIsVUFBd0I7QUFDdkcsVUFBTSxlQUFlLEtBQUssSUFBSSxZQUFZLEtBQUssbUJBQW1CLEdBQUcsR0FBRztBQUN4RSxVQUFNLGVBQWUsS0FBSyxrQkFBa0IsYUFBYSxVQUFVLFlBQVk7QUFDL0UsU0FBSyxvQkFBb0IsV0FBVyxjQUFjLEtBQUsscUJBQXFCLENBQUMsTUFBTTtBQUNqRixXQUFLLHNCQUFzQjtBQUMzQixXQUFLLE9BQU87QUFBQSxJQUNkLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFUSxxQkFBcUIsV0FBd0IsU0FBOEI7QUFDakYsVUFBTSxZQUFZLEtBQUsscUJBQXFCLE9BQU87QUFDbkQsUUFBSSxVQUFVLFdBQVcsR0FBRztBQUMxQixnQkFBVSxTQUFTLEtBQUssRUFBRSxNQUFNLDBCQUEwQixLQUFLLGVBQWUsQ0FBQztBQUFBLElBQ2pGLE9BQU87QUFDTCxXQUFLLG9CQUFvQixXQUFXLFdBQVcsS0FBSyxtQkFBbUIsQ0FBQyxNQUFNO0FBQzVFLGFBQUssb0JBQW9CO0FBQ3pCLGFBQUssT0FBTztBQUFBLE1BQ2QsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGO0FBQUEsRUFFUSxpQkFBaUIsV0FBOEI7QUFDckQsVUFBTSxNQUFNLEtBQUssT0FBTyxLQUFLO0FBQzdCLFFBQUksSUFBSSxXQUFXLEdBQUc7QUFDcEIsZ0JBQVUsU0FBUyxLQUFLO0FBQUEsUUFDdEIsTUFBTTtBQUFBLFFBQ04sS0FBSztBQUFBLE1BQ1AsQ0FBQztBQUFBLElBQ0gsT0FBTztBQUNMLFdBQUs7QUFBQSxRQUNIO0FBQUEsUUFDQSxLQUFLLGVBQWUsS0FBSyxDQUFDLE1BQU0sRUFBRSxRQUFRLElBQUk7QUFBQSxRQUM5QyxLQUFLO0FBQUEsUUFDTCxDQUFDLE1BQU07QUFDTCxlQUFLLGlCQUFpQjtBQUN0QixlQUFLLE9BQU87QUFBQSxRQUNkO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQTtBQUFBLEVBS1EsbUJBQ04sV0FDQSxNQUNBLE9BQzBHO0FBQzFHLFVBQU0sU0FBUztBQUNmLFVBQU0sT0FBTyxNQUFNLGVBQWU7QUFDbEMsVUFBTSxTQUFTLEtBQUssS0FBSyxVQUFVLGdCQUFnQixPQUFPLFNBQVMsT0FBTyxJQUFJLEdBQUc7QUFDakYsVUFBTSxTQUFTLFNBQVMsU0FBUztBQUNqQyxVQUFNLFNBQVM7QUFDZixVQUFNLFNBQVMsS0FBSyxLQUFLLFVBQVUsZUFBZSxPQUFPLFNBQVMsR0FBRyxFQUFFO0FBQ3ZFLFVBQU0sVUFBVSxLQUFLLElBQUksR0FBRyxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxHQUFHLENBQUM7QUFDdkQsVUFBTSxTQUFTO0FBQ2YsVUFBTSxTQUFTQyxRQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLEVBQUUsTUFBTSxDQUFDLFFBQVEsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDO0FBQ2hGLFVBQU0sU0FBUyxPQUFPLE1BQU0sQ0FBQztBQUU3QixVQUFNLFNBQVMsVUFBVSxVQUFVLEVBQUUsS0FBSyxvQkFBb0IsQ0FBQztBQUcvRCxVQUFNLFdBQVdDLGdCQUFPLE1BQU0sRUFDM0IsT0FBTyxLQUFLLEVBQ1osS0FBSyxTQUFTLE1BQU0sRUFDcEIsS0FBSyxVQUFVLE1BQU0sRUFDckIsS0FBSyxTQUFTLG1CQUFtQjtBQUVwQyxhQUNHLFVBQWtDLGFBQWEsRUFDL0MsS0FBSyxNQUFNLEVBQ1gsS0FBSyxNQUFNLEVBQ1gsS0FBSyxTQUFTLFFBQVEsRUFDdEIsS0FBSyxNQUFNLFNBQVMsQ0FBQyxFQUNyQixLQUFLLE1BQU0sQ0FBQyxNQUFNLEtBQUssTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQ3ZDLEtBQUssTUFBTSxNQUFNLEVBQ2pCLEtBQUssTUFBTSxDQUFDLE1BQU0sS0FBSyxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFDdkMsS0FBSyxVQUFVLG1DQUFtQyxFQUNsRCxLQUFLLGdCQUFnQixDQUFDO0FBRXpCLGFBQ0csVUFBa0MsY0FBYyxFQUNoRCxLQUFLLE1BQU0sRUFDWCxLQUFLLE1BQU0sRUFDWCxLQUFLLFNBQVMsU0FBUyxFQUN2QixLQUFLLEtBQUssU0FBUyxDQUFDLEVBQ3BCLEtBQUssS0FBSyxDQUFDLE1BQU0sS0FBSyxNQUFNLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUMxQyxLQUFLLGVBQWUsS0FBSyxFQUN6QixLQUFLLGFBQWEsRUFBRSxFQUNwQixLQUFLLFFBQVEsbUJBQW1CLEVBQ2hDLEtBQUssQ0FBQyxNQUFNLE9BQU8sQ0FBQyxDQUFDO0FBRXhCLGFBQ0csT0FBTyxNQUFNLEVBQ2IsS0FBSyxNQUFNLE1BQU0sRUFDakIsS0FBSyxNQUFNLENBQUMsRUFDWixLQUFLLE1BQU0sTUFBTSxFQUNqQixLQUFLLE1BQU0sTUFBTSxFQUNqQixLQUFLLFVBQVUsbUNBQW1DLEVBQ2xELEtBQUssZ0JBQWdCLENBQUM7QUFHekIsVUFBTSxXQUFXQSxnQkFBTyxNQUFNLEVBQzNCLE9BQU8sS0FBSyxFQUNaLEtBQUssU0FBUyxNQUFNLEVBQ3BCLEtBQUssVUFBVSxNQUFNLEVBQ3JCLEtBQUssU0FBUyxrQkFBa0I7QUFFbkMsYUFDRyxVQUFrQyxhQUFhLEVBQy9DLEtBQUssTUFBTSxFQUNYLEtBQUssTUFBTSxFQUNYLEtBQUssU0FBUyxRQUFRLEVBQ3RCLEtBQUssTUFBTSxDQUFDLEVBQ1osS0FBSyxNQUFNLENBQUMsTUFBTSxLQUFLLE1BQU0sT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUN2QyxLQUFLLE1BQU0sTUFBTSxFQUNqQixLQUFLLE1BQU0sQ0FBQyxNQUFNLEtBQUssTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQ3ZDLEtBQUssVUFBVSxtQ0FBbUMsRUFDbEQsS0FBSyxnQkFBZ0IsQ0FBQyxFQUN0QixLQUFLLFdBQVcsR0FBRztBQUV0QixhQUNHLE9BQU8sTUFBTSxFQUNiLEtBQUssTUFBTSxDQUFDLEVBQ1osS0FBSyxNQUFNLE1BQU0sRUFDakIsS0FBSyxNQUFNLE1BQU0sRUFDakIsS0FBSyxNQUFNLE1BQU0sRUFDakIsS0FBSyxVQUFVLG1DQUFtQyxFQUNsRCxLQUFLLGdCQUFnQixDQUFDO0FBRXpCLFdBQU8sRUFBRSxLQUFLLFNBQVMsS0FBSyxHQUFJLFFBQVEsUUFBUSxRQUFRLE9BQU87QUFBQSxFQUNqRTtBQUFBLEVBRVEsa0JBQ04sS0FDQSxNQUNBLFFBQ0EsUUFDQSxRQUNBLFFBQ0EsUUFDTTtBQTdZVjtBQThZSSxVQUFNLFFBQVEsS0FBSyxJQUFJLENBQUMsTUFBTSxJQUFJLEtBQUssRUFBRSxJQUFJLENBQUM7QUFDOUMsVUFBTSxTQUFTLEtBQVUsRUFDdEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sTUFBTSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQzFDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQztBQUVwQixVQUFNLGVBQ0osV0FBVyxPQUNQLFFBQVEsTUFBTSxDQUFDLElBQ2YsV0FBVyxPQUNULFFBQVEsTUFBTSxDQUFDLElBQ2YsV0FBVyxPQUNULFFBQVEsTUFBTSxFQUFFLElBQ2hCLFdBQVcsT0FDVCxVQUFVLE1BQU0sQ0FBQyxJQUNqQixXQUFXLE9BQ1QsVUFBVSxNQUFNLENBQUMsSUFDakIsU0FBUyxNQUFNLENBQUM7QUFDOUIsVUFBTSxTQUFTLE9BQU8sTUFBTSxZQUFhO0FBQ3pDLFVBQU0sTUFBTSxlQUFlLE1BQU07QUFFakMsVUFBTSxVQUFVLE1BQU0sSUFBSSxDQUFDQyxPQUFNLE9BQU8sRUFBRSxNQUFBQSxPQUFNLE9BQU8sS0FBSyxDQUFDLEVBQUUsTUFBTSxFQUFFO0FBRXZFLFVBQU0sVUFBVSxhQUFzQyxFQUNuRCxFQUFFLENBQUMsTUFBTSxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQ3ZCLEdBQUcsTUFBTSxFQUNULEdBQUcsQ0FBQyxNQUFNLE9BQU8sRUFBRSxLQUFLLENBQUM7QUFFNUIsVUFBTSxVQUFVLGFBQXNDLEVBQ25ELEVBQUUsQ0FBQyxNQUFNLE9BQU8sRUFBRSxJQUFJLENBQUMsRUFDdkIsRUFBRSxDQUFDLE1BQU0sT0FBTyxFQUFFLEtBQUssQ0FBQztBQUUzQixVQUFNLFNBQVNELGdCQUFPLEdBQUc7QUFFekIsV0FDRyxVQUFnQyxhQUFhLEVBQzdDLEtBQUssTUFBTSxFQUNYLEtBQUssTUFBTSxFQUNYLEtBQUssU0FBUyxRQUFRLEVBQ3RCLEtBQUssTUFBTSxDQUFDLE1BQU0sS0FBSyxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFDdkMsS0FBSyxNQUFNLENBQUMsRUFDWixLQUFLLE1BQU0sQ0FBQyxNQUFNLEtBQUssTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQ3ZDLEtBQUssTUFBTSxTQUFTLEVBQUUsRUFDdEIsS0FBSyxVQUFVLHNCQUFzQixFQUNyQyxLQUFLLGdCQUFnQixHQUFHO0FBRTNCLFdBQ0csT0FBTyxNQUFNLEVBQ2IsS0FBSyxNQUFLLGFBQVEsT0FBTyxNQUFmLFlBQW9CLEVBQUUsRUFDaEMsS0FBSyxRQUFRLDJCQUEyQixFQUN4QyxLQUFLLFdBQVcsSUFBSSxFQUNwQixLQUFLLFVBQVUsTUFBTTtBQUV4QixXQUNHLE9BQU8sTUFBTSxFQUNiLEtBQUssTUFBSyxhQUFRLE9BQU8sTUFBZixZQUFvQixFQUFFLEVBQ2hDLEtBQUssUUFBUSxNQUFNLEVBQ25CLEtBQUssVUFBVSwyQkFBMkIsRUFDMUMsS0FBSyxnQkFBZ0IsR0FBRyxFQUN4QixLQUFLLGtCQUFrQixPQUFPLEVBQzlCLEtBQUssbUJBQW1CLE9BQU87QUFFbEMsV0FDRyxVQUFnQyxjQUFjLEVBQzlDLEtBQUssTUFBTSxFQUNYLEtBQUssTUFBTSxFQUNYLEtBQUssU0FBUyxTQUFTLEVBQ3ZCLEtBQUssS0FBSyxDQUFDLE1BQU0sS0FBSyxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFDdEMsS0FBSyxLQUFLLFNBQVMsQ0FBQyxFQUNwQixLQUFLLGVBQWUsUUFBUSxFQUM1QixLQUFLLGFBQWEsRUFBRSxFQUNwQixLQUFLLFFBQVEsbUJBQW1CLEVBQ2hDLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDO0FBQUEsRUFDdkI7QUFBQSxFQUVRLGlCQUNOLEtBQ0EsTUFDQSxRQUNBLFFBQ0EsUUFDQSxRQUNBLFFBQ0EsVUFDTTtBQWplVjtBQWtlSSxVQUFNLFNBQVMsS0FBa0IsRUFDOUIsT0FBTyxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQzlCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxFQUNqQixRQUFRLElBQUk7QUFDZixVQUFNLE9BQU8sT0FBTyxVQUFVO0FBQzlCLFVBQU0sTUFBTSxlQUFlLE1BQU07QUFFakMsVUFBTSxhQUFhLEtBQUssT0FBTyxDQUFDLEdBQUcsTUFBTTtBQUN2QyxVQUFJLFdBQVcsS0FBTSxRQUFPO0FBQzVCLFVBQUksV0FBVyxLQUFNLFFBQU8sSUFBSSxNQUFNO0FBQ3RDLFVBQUksV0FBVyxNQUFNO0FBQ25CLGNBQU0sTUFBTSxTQUFTLEVBQUUsS0FBSyxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ3hDLGVBQU8sUUFBUSxLQUFLLFFBQVEsTUFBTSxRQUFRO0FBQUEsTUFDNUM7QUFDQSxhQUFPO0FBQUEsSUFDVCxDQUFDO0FBRUQsVUFBTSxVQUFVLEtBQUssZUFBZSxJQUFJO0FBQ3hDLFVBQU0sVUFBVSxLQUFLLElBQUksQ0FBQyxHQUFHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxPQUFPLFFBQVEsQ0FBQyxFQUFFLEVBQUU7QUFFeEUsVUFBTSxVQUFVLGFBQXdDLEVBQ3JELEVBQUUsQ0FBQyxNQUFHO0FBdmZiLFVBQUFFO0FBdWZpQixlQUFBQSxNQUFBLE9BQU8sRUFBRSxJQUFJLE1BQWIsT0FBQUEsTUFBa0IsS0FBSyxPQUFPO0FBQUEsS0FBQyxFQUN6QyxFQUFFLENBQUMsTUFBTSxPQUFPLEVBQUUsS0FBSyxDQUFDO0FBRTNCLFVBQU0sU0FBU0YsZ0JBQU8sR0FBRztBQUV6QixXQUNHLFVBQTJELGFBQWEsRUFDeEUsS0FBSyxVQUFVLEVBQ2YsS0FBSyxNQUFNLEVBQ1gsS0FBSyxTQUFTLFFBQVEsRUFDdEIsS0FBSyxNQUFNLENBQUMsTUFBRztBQWpnQnRCLFVBQUFFO0FBaWdCMEIsZUFBQUEsTUFBQSxPQUFPLEVBQUUsSUFBSSxNQUFiLE9BQUFBLE1BQWtCLEtBQUssT0FBTztBQUFBLEtBQUMsRUFDbEQsS0FBSyxNQUFNLENBQUMsRUFDWixLQUFLLE1BQU0sQ0FBQyxNQUFHO0FBbmdCdEIsVUFBQUE7QUFtZ0IwQixlQUFBQSxNQUFBLE9BQU8sRUFBRSxJQUFJLE1BQWIsT0FBQUEsTUFBa0IsS0FBSyxPQUFPO0FBQUEsS0FBQyxFQUNsRCxLQUFLLE1BQU0sU0FBUyxFQUFFLEVBQ3RCLEtBQUssVUFBVSxzQkFBc0IsRUFDckMsS0FBSyxnQkFBZ0IsR0FBRztBQUUzQixXQUNHLE9BQU8sTUFBTSxFQUNiLEtBQUssTUFBSyxhQUFRLE9BQU8sTUFBZixZQUFvQixFQUFFLEVBQ2hDLEtBQUssUUFBUSxNQUFNLEVBQ25CLEtBQUssVUFBVSwyQkFBMkIsRUFDMUMsS0FBSyxnQkFBZ0IsQ0FBQyxFQUN0QixLQUFLLGtCQUFrQixPQUFPLEVBQzlCLEtBQUssbUJBQW1CLE9BQU8sRUFDL0IsS0FBSyxXQUFXLEdBQUc7QUFFdEIsV0FDRyxVQUEyRCxVQUFVLEVBQ3JFLEtBQUssSUFBSSxFQUNULEtBQUssTUFBTSxFQUNYLEtBQUssU0FBUyxLQUFLLEVBQ25CLEtBQUssS0FBSyxDQUFDLE1BQUc7QUF2aEJyQixVQUFBQTtBQXVoQndCLGNBQUFBLE1BQUEsT0FBTyxFQUFFLElBQUksTUFBYixPQUFBQSxNQUFrQjtBQUFBLEtBQUMsRUFDcEMsS0FBSyxLQUFLLENBQUMsTUFBTSxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQ2hDLEtBQUssU0FBUyxJQUFJLEVBQ2xCLEtBQUssVUFBVSxDQUFDLE1BQU0sS0FBSyxJQUFJLEtBQUssTUFBTSxPQUFPLENBQUMsSUFBSSxPQUFPLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxRQUFRLElBQUksSUFBSSxDQUFDLENBQUMsRUFDNUYsS0FBSyxNQUFNLENBQUMsRUFDWixLQUFLLFFBQVEsb0JBQW9CLEVBQ2pDLEtBQUssV0FBVyxDQUFDO0FBR3BCLFFBQUksV0FBVyxRQUFRLFdBQVcsTUFBTTtBQUN0QyxhQUNHLFVBQTJELGdCQUFnQixFQUMzRSxLQUFLLEtBQUssT0FBTyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUNwQyxLQUFLLE1BQU0sRUFDWCxLQUFLLFNBQVMsV0FBVyxFQUN6QixLQUFLLEtBQUssQ0FBQyxNQUFHO0FBdGlCdkIsWUFBQUE7QUFzaUIyQixpQkFBQUEsTUFBQSxPQUFPLEVBQUUsSUFBSSxNQUFiLE9BQUFBLE1BQWtCLEtBQUssT0FBTztBQUFBLE9BQUMsRUFDakQsS0FBSyxLQUFLLENBQUMsTUFBTSxLQUFLLElBQUksT0FBTyxFQUFFLEtBQUssSUFBSSxHQUFHLEVBQUUsQ0FBQyxFQUNsRCxLQUFLLGVBQWUsUUFBUSxFQUM1QixLQUFLLGFBQWEsRUFBRSxFQUNwQixLQUFLLGVBQWUsTUFBTSxFQUMxQixLQUFLLFFBQVEsb0JBQW9CLEVBQ2pDLEtBQUssQ0FBQyxNQUFNLE9BQU8sRUFBRSxLQUFLLENBQUM7QUFBQSxJQUNoQztBQUVBLFdBQ0csVUFBMkQsY0FBYyxFQUN6RSxLQUFLLFVBQVUsRUFDZixLQUFLLE1BQU0sRUFDWCxLQUFLLFNBQVMsU0FBUyxFQUN2QixLQUFLLEtBQUssQ0FBQyxNQUFHO0FBcGpCckIsVUFBQUE7QUFvakJ5QixlQUFBQSxNQUFBLE9BQU8sRUFBRSxJQUFJLE1BQWIsT0FBQUEsTUFBa0IsS0FBSyxPQUFPO0FBQUEsS0FBQyxFQUNqRCxLQUFLLEtBQUssU0FBUyxFQUFFLEVBQ3JCLEtBQUssZUFBZSxRQUFRLEVBQzVCLEtBQUssYUFBYSxFQUFFLEVBQ3BCLEtBQUssUUFBUSxtQkFBbUIsRUFDaEMsS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztBQUdwQyxRQUFJLFlBQVksV0FBVyxLQUFLLENBQUMsTUFBTSxFQUFFLFNBQVMsUUFBUSxHQUFHO0FBQzNELFlBQU0sT0FBTSxZQUFPLFFBQVEsTUFBZixZQUFvQixLQUFLLE9BQU87QUFFNUMsYUFDRyxPQUFPLFVBQVUsY0FBYyxFQUMvQixLQUFLLE1BQU0sRUFBRSxFQUNiLEtBQUssTUFBTSxTQUFTLEVBQUUsRUFDdEIsS0FBSyxLQUFLLEVBQUUsRUFDWixLQUFLLFFBQVEsbUJBQW1CO0FBQ25DLGFBQ0csVUFBMkQsY0FBYyxFQUN6RSxPQUFPLENBQUMsTUFBTSxFQUFFLFNBQVMsUUFBUSxFQUNqQyxLQUFLLFFBQVEsMkJBQTJCLEVBQ3hDLEtBQUssYUFBYSxNQUFNO0FBQUEsSUFDN0I7QUFBQSxFQUNGO0FBQUEsRUFFUSxhQUFhLFdBQXdCLE9BQWUsUUFBb0IsUUFBMEI7QUFDeEcsVUFBTSxNQUFNLFVBQVUsVUFBVSxFQUFFLEtBQUssaUJBQWlCLENBQUM7QUFDekQsUUFBSSxXQUFXLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDOUIsVUFBTSxPQUFPLElBQUksVUFBVSxFQUFFLEtBQUssa0JBQWtCLENBQUM7QUFFckQsVUFBTSxVQUFVLEtBQUssU0FBUyxVQUFVLEVBQUUsS0FBSyxpQkFBaUIsQ0FBQztBQUNqRSxrQ0FBUSxTQUFTLGNBQWM7QUFDL0IsWUFBUSxpQkFBaUIsU0FBUyxNQUFNO0FBRXhDLFVBQU0sVUFBVSxLQUFLLFNBQVMsVUFBVSxFQUFFLEtBQUssaUJBQWlCLENBQUM7QUFDakUsa0NBQVEsU0FBUyxlQUFlO0FBQ2hDLFlBQVEsaUJBQWlCLFNBQVMsTUFBTTtBQUFBLEVBQzFDO0FBQUEsRUFFUSxRQUFRLFdBQXdCLE9BQWUsT0FBcUI7QUFDMUUsVUFBTSxNQUFNLFVBQVUsVUFBVSxFQUFFLEtBQUssa0JBQWtCLENBQUM7QUFDMUQsUUFBSSxXQUFXLEVBQUUsTUFBTSxPQUFPLEtBQUssb0JBQW9CLENBQUM7QUFDeEQsUUFBSSxXQUFXLEVBQUUsTUFBTSxPQUFPLEtBQUssb0JBQW9CLENBQUM7QUFBQSxFQUMxRDtBQUFBLEVBRVEsZUFBZSxNQUEyQixTQUFTLEdBQWE7QUFDdEUsV0FBTyxLQUFLLElBQUksQ0FBQyxHQUFHLE1BQU07QUFDeEIsWUFBTUMsU0FBUSxLQUFLLE1BQU0sS0FBSyxJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDN0QsYUFBT0EsT0FBTSxPQUFPLENBQUMsR0FBRyxNQUFNLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSUEsT0FBTTtBQUFBLElBQ3hELENBQUM7QUFBQSxFQUNIO0FBQUE7QUFBQSxFQUdRLHFCQUFxQixRQUFzRDtBQXptQnJGO0FBMG1CSSxVQUFNLFNBQVMsb0JBQUksSUFBb0I7QUFDdkMsZUFBVyxLQUFLLFFBQVE7QUFDdEIsWUFBTSxJQUFJLEVBQUUsVUFBVSxNQUFNLEdBQUcsRUFBRTtBQUNqQyxhQUFPLElBQUksS0FBSSxZQUFPLElBQUksQ0FBQyxNQUFaLFlBQWlCLEtBQUssQ0FBQztBQUFBLElBQ3hDO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVRLHFCQUFxQixTQUFxRTtBQUNoRyxXQUFPLEtBQUssZUFBZSxTQUFTLE1BQU0sQ0FBQztBQUFBLEVBQzdDO0FBQUEsRUFFUSxrQkFDTixhQUNBLFVBQ0EsT0FBTyxLQUM0QjtBQTFuQnZDO0FBMm5CSSxVQUFNLFlBQVksb0JBQUksSUFBb0I7QUFDMUMsZUFBVyxRQUFRLGFBQWE7QUFDOUIsWUFBTSxVQUFVLElBQUksS0FBSyxLQUFLLGNBQWM7QUFDNUMsY0FBUSxRQUFRLFFBQVEsUUFBUSxJQUFJLEtBQUssUUFBUTtBQUNqRCxZQUFNLGFBQWEsUUFBUSxZQUFZLEVBQUUsTUFBTSxHQUFHLEVBQUU7QUFDcEQsWUFBTSxnQkFBZ0IsYUFBYSxXQUFXLFdBQVc7QUFDekQsZ0JBQVUsSUFBSSxpQkFBZ0IsZUFBVSxJQUFJLGFBQWEsTUFBM0IsWUFBZ0MsS0FBSyxDQUFDO0FBQUEsSUFDdEU7QUFDQSxVQUFNLFNBQTRDLENBQUM7QUFDbkQsVUFBTSxRQUFRLElBQUksS0FBSyxRQUFRO0FBQy9CLGFBQVMsSUFBSSxHQUFHLElBQUksTUFBTSxLQUFLO0FBQzdCLFlBQU0sTUFBTSxJQUFJLEtBQUssS0FBSztBQUMxQixVQUFJLFFBQVEsSUFBSSxRQUFRLElBQUksQ0FBQztBQUM3QixZQUFNLElBQUksSUFBSSxZQUFZLEVBQUUsTUFBTSxHQUFHLEVBQUU7QUFDdkMsYUFBTyxLQUFLLEVBQUUsTUFBTSxHQUFHLFFBQU8sZUFBVSxJQUFJLENBQUMsTUFBZixZQUFvQixFQUFFLENBQUM7QUFBQSxJQUN2RDtBQUNBLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFUSxlQUNOLFNBQ0EsVUFDQSxZQUFZLE9BQ3VCO0FBbHBCdkM7QUFtcEJJLFVBQU0sUUFBUSxvQkFBSSxJQUFvQjtBQUN0QyxlQUFXLEtBQUssU0FBUztBQUN2QixZQUFNLElBQUksRUFBRSxVQUFVLE1BQU0sR0FBRyxFQUFFO0FBQ2pDLFVBQUksV0FBVztBQUNiLGNBQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDO0FBQUEsTUFDMUIsT0FBTztBQUNMLGNBQU0sSUFBSSxLQUFJLFdBQU0sSUFBSSxDQUFDLE1BQVgsWUFBZ0IsS0FBSyxTQUFTLENBQUMsQ0FBQztBQUFBLE1BQ2hEO0FBQUEsSUFDRjtBQUNBLFFBQUksTUFBTSxTQUFTLEVBQUcsUUFBTyxDQUFDO0FBQzlCLFVBQU0sV0FBVyxNQUFNO0FBQ3ZCLFVBQU0sUUFBUSxDQUFDLEdBQUcsTUFBTSxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQztBQUN4QyxVQUFNLFNBQTRDLENBQUM7QUFDbkQsVUFBTSxNQUFNLElBQUksS0FBSyxLQUFLO0FBQzFCLFVBQU0sTUFBTSxJQUFJLEtBQUssUUFBUTtBQUM3QixXQUFPLE9BQU8sS0FBSztBQUNqQixZQUFNLElBQUksSUFBSSxZQUFZLEVBQUUsTUFBTSxHQUFHLEVBQUU7QUFDdkMsYUFBTyxLQUFLLEVBQUUsTUFBTSxHQUFHLFFBQU8sV0FBTSxJQUFJLENBQUMsTUFBWCxZQUFnQixFQUFFLENBQUM7QUFDakQsVUFBSSxRQUFRLElBQUksUUFBUSxJQUFJLENBQUM7QUFBQSxJQUMvQjtBQUNBLFdBQU87QUFBQSxFQUNUO0FBQUE7QUFBQSxFQUVRLG9CQUNOLFdBQ0EsU0FDQSxRQUNBLGdCQUNNO0FBL3FCVjtBQWdyQkksVUFBTSxRQUFRLEtBQUssbUJBQW1CLFdBQVcsUUFBUSxjQUFjO0FBQ3ZFLFVBQU0sT0FBTyxZQUFZLE1BQU07QUFFL0IsUUFBSTtBQUNKLFFBQUksU0FBUyxVQUFVO0FBQ3JCLGFBQU87QUFBQSxJQUNULE9BQU87QUFFTCxZQUFNLFNBQVMsSUFBSSxJQUFJLFFBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM1RCxhQUFPLENBQUM7QUFDUixZQUFNLE1BQU0sSUFBSSxLQUFLLE1BQU0sQ0FBQztBQUM1QixZQUFNLFFBQVEsSUFBSSxLQUFLLEdBQUc7QUFDMUIsWUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLE9BQU8sQ0FBQztBQUN4QyxZQUFNLE1BQU0sSUFBSSxLQUFLLEtBQUs7QUFDMUIsYUFBTyxPQUFPLEtBQUs7QUFDakIsY0FBTSxJQUFJLElBQUksWUFBWSxFQUFFLE1BQU0sR0FBRyxFQUFFO0FBQ3ZDLGFBQUssS0FBSyxFQUFFLE1BQU0sR0FBRyxRQUFPLFlBQU8sSUFBSSxDQUFDLE1BQVosWUFBaUIsRUFBRSxDQUFDO0FBQ2hELFlBQUksUUFBUSxJQUFJLFFBQVEsSUFBSSxDQUFDO0FBQUEsTUFDL0I7QUFBQSxJQUNGO0FBRUEsUUFBSSxLQUFLLFNBQVMsR0FBRztBQUNuQixnQkFBVSxTQUFTLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxLQUFLLGVBQWUsQ0FBQztBQUN6RjtBQUFBLElBQ0Y7QUFFQSxVQUFNLFdBQVcsV0FBVyxRQUFRLFdBQVcsUUFBUSxXQUFXO0FBQ2xFLFVBQU0sRUFBRSxLQUFLLFFBQVEsUUFBUSxRQUFRLE9BQU8sSUFBSSxLQUFLLG1CQUFtQixXQUFXLE1BQU0sS0FBSztBQUU5RixRQUFJLFVBQVU7QUFDWixXQUFLLGlCQUFpQixLQUFLLE1BQU0sUUFBUSxRQUFRLFFBQVEsUUFBUSxNQUFNO0FBQUEsSUFDekUsT0FBTztBQUNMLFdBQUssa0JBQWtCLEtBQUssTUFBTSxRQUFRLFFBQVEsUUFBUSxRQUFRLE1BQU07QUFBQSxJQUMxRTtBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBRVEsb0JBQ04sV0FDQSxTQUNBLFFBQ0EsZ0JBQ007QUFDTixVQUFNLFdBQVcsV0FBVyxRQUFRLFdBQVcsUUFBUSxXQUFXO0FBQ2xFLFVBQU0sUUFBUSxLQUFLLG1CQUFtQixXQUFXLFFBQVEsY0FBYztBQUN2RSxVQUFNLE9BQU8sWUFBWSxNQUFNO0FBQy9CLFVBQU0sT0FBTyxTQUFTLFdBQVcsVUFBVSxRQUFRLE1BQU0sR0FBRyxJQUFJO0FBRWhFLFFBQUksS0FBSyxTQUFTLEdBQUc7QUFDbkIsZ0JBQVUsU0FBUyxLQUFLLEVBQUUsTUFBTSxvQkFBb0IsS0FBSyxlQUFlLENBQUM7QUFDekU7QUFBQSxJQUNGO0FBRUEsVUFBTSxFQUFFLEtBQUssUUFBUSxRQUFRLFFBQVEsT0FBTyxJQUFJLEtBQUssbUJBQW1CLFdBQVcsTUFBTSxLQUFLO0FBRTlGLFFBQUksVUFBVTtBQUNaLFdBQUssaUJBQWlCLEtBQUssTUFBTSxRQUFRLFFBQVEsUUFBUSxRQUFRLFFBQVEsTUFBTSxDQUFDO0FBQUEsSUFDbEYsT0FBTztBQUNMLFdBQUssa0JBQWtCLEtBQUssTUFBTSxRQUFRLFFBQVEsUUFBUSxRQUFRLE1BQU07QUFBQSxJQUMxRTtBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBRVEsb0JBQ04sV0FDQSxNQUNBLE9BQ0EsaUJBQ0EsVUFDQSxhQUNNO0FBcHZCVjtBQXF2QkksVUFBTSxPQUFPLFVBQVUsVUFBVSxFQUFFLEtBQUssZ0JBQWdCLENBQUM7QUFDekQsZUFBVyxLQUFLLENBQUMsTUFBTSxNQUFNLE1BQU0sTUFBTSxNQUFNLE1BQU0sSUFBSSxHQUFHO0FBQzFELFdBQUssVUFBVSxFQUFFLE1BQU0sR0FBRyxLQUFLLGtCQUFrQixDQUFDO0FBQUEsSUFDcEQ7QUFFQSxVQUFNLFlBQVksSUFBSSxLQUFLLE1BQU0sT0FBTyxDQUFDLEVBQUUsT0FBTyxJQUFJLEtBQUs7QUFDM0QsYUFBUyxJQUFJLEdBQUcsSUFBSSxVQUFVLEtBQUs7QUFDakMsV0FBSyxVQUFVLEVBQUUsS0FBSywrQkFBK0IsQ0FBQztBQUFBLElBQ3hEO0FBRUEsVUFBTSxjQUFjLElBQUksS0FBSyxNQUFNLFFBQVEsR0FBRyxDQUFDLEVBQUUsUUFBUTtBQUN6RCxVQUFNLFNBQVMsS0FBSyxJQUFJLEdBQUcsTUFBTSxLQUFLLFlBQVksT0FBTyxDQUFDLEdBQUcsQ0FBQztBQUM5RCxhQUFTLElBQUksR0FBRyxLQUFLLGFBQWEsS0FBSztBQUNyQyxZQUFNLFVBQVUsR0FBRyxJQUFJLElBQUksT0FBTyxRQUFRLENBQUMsRUFBRSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLEVBQUUsU0FBUyxHQUFHLEdBQUcsQ0FBQztBQUMzRixZQUFNLFlBQVcsaUJBQVksSUFBSSxPQUFPLE1BQXZCLFlBQTRCO0FBQzdDLFlBQU0sV0FBVyxVQUFVO0FBQzNCLFlBQU0sZUFBYyxxQkFBZ0IsSUFBSSxPQUFPLE1BQTNCLFlBQWdDO0FBQ3BELFlBQU0sTUFBTTtBQUFBLFFBQ1Y7QUFBQSxRQUNBLGNBQWMsSUFBSSx1QkFBdUI7QUFBQSxRQUN6QyxZQUFZLFdBQVcsSUFBSSxzQkFBc0I7QUFBQSxRQUNqRCxZQUFZLFdBQVcsbUJBQW1CO0FBQUEsTUFDNUMsRUFDRyxPQUFPLE9BQU8sRUFDZCxLQUFLLEdBQUc7QUFDWCxZQUFNLE9BQU8sS0FBSyxVQUFVLEVBQUUsSUFBSSxDQUFDO0FBQ25DLFVBQUksWUFBWSxXQUFXLEdBQUc7QUFDNUIsY0FBTSxNQUFNLEtBQUssTUFBTSxLQUFNLFdBQVcsU0FBVSxFQUFFO0FBQ3BELGFBQUssTUFBTSxhQUFhLGdEQUFnRCxHQUFHO0FBQUEsTUFDN0U7QUFDQSxXQUFLLFdBQVcsRUFBRSxNQUFNLE9BQU8sQ0FBQyxHQUFHLEtBQUssbUJBQW1CLENBQUM7QUFDNUQsVUFBSSxjQUFjLEdBQUc7QUFDbkIsYUFBSyxRQUFRLFVBQVUsR0FBRyxXQUFXLFVBQVUsZ0JBQWdCLElBQUksTUFBTSxFQUFFO0FBQUEsTUFDN0UsV0FBVyxZQUFZLFdBQVcsR0FBRztBQUNuQyxhQUFLLFFBQVEsVUFBVSxHQUFHLFFBQVE7QUFBQSxNQUNwQztBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFFUSxtQkFDTixXQUNBLFFBQ0EsZ0JBQ2E7QUFDYixVQUFNLFVBQVUsVUFBVSxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsQ0FBQztBQUNwRSxVQUFNLE1BQU0sUUFBUSxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsQ0FBQztBQUM5RCxVQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUUsTUFBTSxjQUFjLE1BQU0sR0FBRyxLQUFLLG9CQUFvQixDQUFDO0FBRXhGLFFBQUksaUJBQWlCLFNBQVMsQ0FBQyxNQUFNO0FBQ25DLFFBQUUsZ0JBQWdCO0FBQ2xCLFlBQU0sT0FBTyxJQUFJLHNCQUFLO0FBQ3RCLGlCQUFXLEtBQUssZUFBZTtBQUM3QixhQUFLLFFBQVEsQ0FBQyxTQUFTO0FBQ3JCLGVBQUssU0FBUyxjQUFjLENBQUMsQ0FBQztBQUM5QixlQUFLLFdBQVcsTUFBTSxNQUFNO0FBQzVCLGVBQUssUUFBUSxNQUFNO0FBQ2pCLG9CQUFRLGNBQWMsY0FBYyxDQUFDO0FBQ3JDLDJCQUFlLENBQUM7QUFBQSxVQUNsQixDQUFDO0FBQUEsUUFDSCxDQUFDO0FBQUEsTUFDSDtBQUNBLFdBQUssaUJBQWlCLENBQUM7QUFBQSxJQUN6QixDQUFDO0FBRUQsV0FBTztBQUFBLEVBQ1Q7QUFBQTtBQUFBLEVBRVEsa0JBQ04sV0FDQSxNQUNBLGVBQ0EsVUFDTTtBQTd6QlY7QUE4ekJJLFVBQU0sU0FBUyxDQUFDLE9BQU8sT0FBTyxPQUFPLE9BQU8sT0FBTyxPQUFPLE9BQU8sT0FBTyxPQUFPLE9BQU8sT0FBTyxLQUFLO0FBRWxHLFVBQU0sVUFBVSxVQUFVLFVBQVUsRUFBRSxLQUFLLG9CQUFvQixDQUFDO0FBR2hFLFVBQU0sWUFBWSxRQUFRLFVBQVUsRUFBRSxLQUFLLHNCQUFzQixDQUFDO0FBQ2xFLGNBQVUsVUFBVSxFQUFFLEtBQUssdUJBQXVCLENBQUM7QUFDbkQsZUFBVyxLQUFLLENBQUMsTUFBTSxNQUFNLE1BQU0sTUFBTSxNQUFNLE1BQU0sSUFBSSxHQUFHO0FBQzFELGdCQUFVLFVBQVUsRUFBRSxNQUFNLEdBQUcsS0FBSyx3QkFBd0IsQ0FBQztBQUFBLElBQy9EO0FBR0EsVUFBTSxPQUFPLElBQUksS0FBSyxNQUFNLEdBQUcsQ0FBQztBQUNoQyxVQUFNLGVBQWUsS0FBSyxPQUFPLElBQUksS0FBSztBQUMxQyxVQUFNLFFBQVEsSUFBSSxLQUFLLElBQUk7QUFDM0IsVUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLFdBQVc7QUFFM0MsVUFBTSxRQUFRLElBQUksS0FBSyxNQUFNLElBQUksRUFBRTtBQUNuQyxVQUFNLGFBQWEsTUFBTSxPQUFPLElBQUksS0FBSztBQUN6QyxVQUFNLE1BQU0sSUFBSSxLQUFLLEtBQUs7QUFDMUIsUUFBSSxRQUFRLElBQUksUUFBUSxLQUFLLElBQUksVUFBVTtBQUUzQyxVQUFNLE1BQU0sSUFBSSxLQUFLLEtBQUs7QUFDMUIsV0FBTyxPQUFPLEtBQUs7QUFDakIsWUFBTSxVQUFVLFFBQVEsVUFBVSxFQUFFLEtBQUssc0JBQXNCLENBQUM7QUFHaEUsVUFBSSxhQUFhO0FBQ2pCLGVBQVMsSUFBSSxHQUFHLElBQUksR0FBRyxLQUFLO0FBQzFCLGNBQU0sUUFBUSxJQUFJLEtBQUssR0FBRztBQUMxQixjQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksQ0FBQztBQUNqQyxZQUFJLE1BQU0sUUFBUSxNQUFNLEtBQUssTUFBTSxZQUFZLE1BQU0sTUFBTTtBQUN6RCx1QkFBYSxPQUFPLE1BQU0sU0FBUyxDQUFDO0FBQ3BDO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFDQSxjQUFRLFVBQVUsRUFBRSxNQUFNLFlBQVksS0FBSyx1QkFBdUIsQ0FBQztBQUduRSxlQUFTLElBQUksR0FBRyxJQUFJLEdBQUcsS0FBSztBQUMxQixjQUFNLFVBQVUsSUFBSSxZQUFZLEVBQUUsTUFBTSxHQUFHLEVBQUU7QUFDN0MsY0FBTSxTQUFTLElBQUksWUFBWSxNQUFNO0FBQ3JDLGNBQU0sTUFBSyxtQkFBYyxJQUFJLE9BQU8sTUFBekIsWUFBOEI7QUFDekMsY0FBTSxNQUFNO0FBQUEsVUFDVjtBQUFBLFVBQ0EsQ0FBQyxTQUFTLG1CQUFtQixLQUFLLElBQUkseUJBQXlCO0FBQUEsVUFDL0QsWUFBWSxXQUFXLHFCQUFxQjtBQUFBLFFBQzlDLEVBQ0csT0FBTyxPQUFPLEVBQ2QsS0FBSyxHQUFHO0FBQ1gsY0FBTSxPQUFPLFFBQVEsVUFBVSxFQUFFLElBQUksQ0FBQztBQUN0QyxZQUFJLEtBQUssRUFBRyxNQUFLLGFBQWEsU0FBUyxHQUFHLEVBQUUsVUFBVSxPQUFPLElBQUksTUFBTSxFQUFFLEVBQUU7QUFDM0UsWUFBSSxRQUFRLElBQUksUUFBUSxJQUFJLENBQUM7QUFBQSxNQUMvQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFFQSxVQUF5QjtBQXYzQjNCO0FBdzNCSSxlQUFLLG1CQUFMLG1CQUFxQjtBQUNyQixTQUFLLGlCQUFpQjtBQUN0QixRQUFJLEtBQUssZ0JBQWdCO0FBQ3ZCLG1CQUFhLEtBQUssY0FBYztBQUNoQyxXQUFLLGlCQUFpQjtBQUFBLElBQ3hCO0FBQ0EsV0FBTyxRQUFRLFFBQVE7QUFBQSxFQUN6QjtBQUNGOzs7QW9IaDRCQSxJQUFBQyxvQkFBb0M7OztBQ083QixJQUFNLGNBQU4sY0FBMEIsY0FBYztBQUFBLEVBUzdDLFlBQ0UsS0FDVSxRQUNWLE9BQ0EsV0FBbUIsV0FDbkI7QUFDQSxVQUFNLEdBQUc7QUFKQztBQVRaLFNBQVEsU0FBdUIsQ0FBQztBQUNoQyxTQUFRLFNBQXVCLENBQUM7QUFDaEMsU0FBUSxjQUFtQyxDQUFDO0FBRzVDLFNBQVEsV0FBeUIsQ0FBQztBQWNsQyxTQUFVLG9CQUFvQjtBQUw1QixTQUFLLFdBQVc7QUFDaEIsU0FBSyxXQUFXLENBQUMsR0FBRyxLQUFLO0FBQ3pCLFNBQUssWUFBWSxDQUFDLEdBQUcsS0FBSztBQUMxQixTQUFLLG1CQUFtQixNQUFNO0FBQUEsRUFDaEM7QUFBQSxFQUdVLGlCQUF1QjtBQUMvQixTQUFLLEtBQUssZUFBZSxLQUFLLFFBQVE7QUFBQSxFQUN4QztBQUFBLEVBRVUsZ0JBQXdCO0FBQ2hDLFdBQU8sR0FBRyxLQUFLLFVBQVUsTUFBTSxtQkFBZ0IsS0FBSyxPQUFPLE1BQU07QUFBQSxFQUNuRTtBQUFBLEVBRU8sY0FBYyxPQUtsQjtBQUNELFNBQUssWUFBWSxNQUFNO0FBQ3ZCLFNBQUssU0FBUyxNQUFNO0FBQ3BCLFNBQUssY0FBYyxNQUFNO0FBQ3pCLFNBQUssbUJBQW1CLE1BQU07QUFBQSxFQUNoQztBQUFBLEVBRUEsTUFBTSxTQUFTO0FBQ2IsUUFBSSxLQUFLLFVBQVUsV0FBVyxHQUFHO0FBQy9CLFdBQUssWUFBWSxLQUFLLE9BQU8sV0FBVyxDQUFDO0FBQ3pDO0FBQUEsSUFDRjtBQUNBLFVBQU0sS0FBSyxPQUFPO0FBQ2xCLFNBQUssbUJBQW1CO0FBQUEsRUFDMUI7QUFBQSxFQUVBLE1BQWMsU0FBUztBQUNyQixRQUFJLEtBQUssVUFBVSxXQUFXLEdBQUc7QUFDL0IsV0FBSyxZQUFZLEtBQUssT0FBTyxXQUFXLENBQUM7QUFDekM7QUFBQSxJQUNGO0FBQ0EsVUFBTSxFQUFFLFVBQVUsSUFBSTtBQUN0QixjQUFVLE1BQU07QUFDaEIsU0FBSyxPQUFPLEtBQUssVUFBVSxDQUFDO0FBQzVCLFVBQU0sS0FBSyxXQUFXLFNBQVM7QUFBQSxFQUNqQztBQUFBLEVBQ1UsY0FBYyxXQUE4QjtBQUNwRCxVQUFNLFNBQVMsVUFBVSxVQUFVLEVBQUUsS0FBSyxpQkFBaUIsQ0FBQztBQUM1RCxTQUFLLE9BQU8sUUFBUSxFQUFFLE9BQU8sZ0JBQWdCLEtBQUssUUFBUSxJQUFJLE1BQU0sS0FBSyxRQUFRLE1BQU0sRUFBRSxDQUFDO0FBQzFGLFNBQUssT0FBTyxRQUFRLEVBQUUsT0FBTyxTQUFTLEtBQUssUUFBUSxJQUFJLE1BQU0sS0FBSyxRQUFRLE1BQU0sRUFBRSxDQUFDO0FBQ25GLFNBQUssT0FBTyxRQUFRO0FBQUEsTUFDbEIsTUFBTTtBQUFBLE1BQ04sS0FBSztBQUFBLE1BQ0wsU0FBUztBQUFBLE1BQ1QsSUFBSSxZQUFZO0FBQ2QsYUFBSyxZQUFZLGFBQWEsS0FBSyxTQUFTO0FBQzVDLGNBQU0sS0FBSyxPQUFPO0FBQUEsTUFDcEI7QUFBQSxJQUNGLENBQUM7QUFDRCxTQUFLLE9BQU8sUUFBUSxFQUFFLE1BQU0sU0FBUyxLQUFLLFNBQVMsU0FBUyxnQkFBVyxJQUFJLE1BQU0sS0FBSyxVQUFVLEVBQUUsQ0FBQztBQUFBLEVBQ3JHO0FBQUEsRUFFVSxzQkFBZ0M7QUFDeEMsVUFBTSxXQUFxQixDQUFDO0FBQzVCLGFBQVMsSUFBSSxHQUFHLElBQUksS0FBSyxrQkFBa0IsS0FBSztBQUM5QyxZQUFNLFNBQVMsS0FBSyxZQUFZLENBQUM7QUFDakMsVUFBSSxXQUFXLE9BQVEsVUFBUyxLQUFLLHNCQUFzQjtBQUFBLGVBQ2xELFdBQVcsT0FBUSxVQUFTLEtBQUssc0JBQXNCO0FBQUEsVUFDM0QsVUFBUyxLQUFLLEVBQUU7QUFBQSxJQUN2QjtBQUNBLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFQSxNQUFjLFFBQVEsUUFBeUI7QUFDN0MsVUFBTSxLQUFLLFVBQVU7QUFDckIsVUFBTSxLQUFLLGNBQWM7QUFDekIsVUFBTSxPQUFPLEtBQUssVUFBVSxNQUFNO0FBQ2xDLFNBQUssWUFBWSxLQUFLLE1BQU07QUFFNUIsUUFBSSxXQUFXLFFBQVE7QUFDckIsV0FBSyxPQUFPLEtBQUssSUFBSTtBQUFBLElBQ3ZCLE9BQU87QUFDTCxXQUFLLE9BQU8sS0FBSyxJQUFJO0FBQUEsSUFDdkI7QUFFQSxRQUFJLEtBQUssVUFBVSxXQUFXLEdBQUc7QUFDL0IsVUFBSSxLQUFLLE9BQU8sV0FBVyxHQUFHO0FBQzVCLGFBQUssWUFBWSxJQUFJO0FBQUEsTUFDdkIsT0FBTztBQUNMLGFBQUssWUFBWSxLQUFLO0FBQUEsTUFDeEI7QUFDQTtBQUFBLElBQ0Y7QUFDQSxVQUFNLEtBQUssT0FBTztBQUFBLEVBQ3BCO0FBQUEsRUFFUSxZQUFZLFFBQWlCO0FBQ25DLFNBQUssZUFBZTtBQUNwQixVQUFNLEVBQUUsVUFBVSxJQUFJO0FBQ3RCLGNBQVUsTUFBTTtBQUNoQixRQUFJLFFBQVE7QUFDVixXQUFLLEtBQUssYUFBYTtBQUN2QixnQkFBVSxTQUFTLE1BQU0sRUFBRSxNQUFNLFlBQVksQ0FBQztBQUFBLElBQ2hELE9BQU87QUFDTCxnQkFBVSxTQUFTLE1BQU0sRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3BELGdCQUFVLFNBQVMsS0FBSyxFQUFFLE1BQU0sV0FBVyxLQUFLLE9BQU8sTUFBTSxHQUFHLENBQUM7QUFDakUsZ0JBQVUsU0FBUyxLQUFLLEVBQUUsTUFBTSxXQUFXLEtBQUssT0FBTyxNQUFNLEdBQUcsQ0FBQztBQUFBLElBQ25FO0FBQ0EsVUFBTSxTQUFTLFVBQVUsVUFBVSxFQUFFLEtBQUssaUJBQWlCLENBQUM7QUFDNUQsU0FBSyxPQUFPLFFBQVE7QUFBQSxNQUNsQixPQUFPLFNBQVMsb0JBQW9CO0FBQUEsTUFDcEMsS0FBSztBQUFBLE1BQ0wsVUFBVTtBQUFBLE1BQ1YsSUFBSSxNQUFNLEtBQUssZUFBZSxTQUFTLEtBQUssV0FBVyxLQUFLLE1BQU07QUFBQSxJQUNwRSxDQUFDO0FBQ0QsU0FBSyxPQUFPLFFBQVEsRUFBRSxPQUFPLFNBQVMsS0FBSyxpQkFBaUIsSUFBSSxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7QUFBQSxFQUN0RjtBQUFBLEVBRUEsTUFBYyxlQUFlO0FBQzNCLFFBQUksS0FBSyxPQUFPLEtBQUssY0FBYztBQUNqQyxhQUFPLEtBQUssT0FBTyxLQUFLLGFBQWEsS0FBSyxRQUFRO0FBQUEsSUFDcEQ7QUFDQSxVQUFNLFVBQVUsS0FBSyxRQUFRLEtBQUssT0FBTyxJQUFJO0FBQUEsRUFDL0M7QUFBQSxFQUVBLE1BQWMsY0FBYztBQXBKOUI7QUFxSkksU0FBSyxPQUFPLEtBQUssZ0JBQWUsVUFBSyxPQUFPLEtBQUssaUJBQWpCLFlBQWlDLENBQUM7QUFDbEUsU0FBSyxPQUFPLEtBQUssYUFBYSxLQUFLLFFBQVEsSUFBSTtBQUFBLE1BQzdDLFdBQVcsS0FBSyxVQUFVLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUTtBQUFBLE1BQy9DLFFBQVEsS0FBSyxPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUTtBQUFBLE1BQ3pDLGFBQWEsQ0FBQyxHQUFHLEtBQUssV0FBVztBQUFBLE1BQ2pDLGtCQUFrQixLQUFLO0FBQUEsSUFDekI7QUFDQSxVQUFNLFVBQVUsS0FBSyxRQUFRLEtBQUssT0FBTyxJQUFJO0FBQUEsRUFDL0M7QUFBQSxFQUVBLE1BQWMsZUFBZSxhQUEyQjtBQUN0RCxTQUFLLFlBQVksZUFBZSxLQUFLLEtBQUssV0FBVztBQUNyRCxTQUFLLFNBQVMsQ0FBQztBQUNmLFNBQUssU0FBUyxDQUFDO0FBQ2YsU0FBSyxjQUFjLENBQUM7QUFDcEIsU0FBSyxtQkFBbUIsS0FBSyxVQUFVO0FBQ3ZDLFVBQU0sS0FBSyxPQUFPO0FBQUEsRUFDcEI7QUFBQSxFQUVVLGlCQUF1QjtBQUMvQixRQUFJLEtBQUssVUFBVSxTQUFTLEtBQUssS0FBSyxPQUFPLFNBQVMsR0FBRztBQUN2RCxXQUFLLEtBQUssWUFBWTtBQUFBLElBQ3hCO0FBQUEsRUFDRjtBQUNGOzs7QURyS08sSUFBTSxrQkFBTixjQUE4Qix3QkFBTTtBQUFBLEVBQ3pDLFlBQ0UsS0FDUSxRQUNSO0FBQ0EsVUFBTSxHQUFHO0FBRkQ7QUFBQSxFQUdWO0FBQUEsRUFFQSxTQUFTO0FBaEJYO0FBaUJJLFVBQU0sRUFBRSxVQUFVLElBQUk7QUFDdEIsY0FBVSxNQUFNO0FBQ2hCLGNBQVUsU0FBUyxNQUFNLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUdsRCxVQUFNLFVBQVUsb0JBQUksSUFBMEI7QUFFOUMsZUFBVyxRQUFRLEtBQUssSUFBSSxNQUFNLGlCQUFpQixHQUFHO0FBQ3BELFlBQU0sTUFBSyxVQUFLLElBQUksY0FBYyxhQUFhLElBQUksTUFBeEMsbUJBQTJDO0FBQ3RELFVBQUksRUFBQyx5QkFBSSxRQUFRO0FBRVgsWUFBTSxTQUFxQixlQUFlLEtBQUssUUFBUSxJQUFJO0FBR2pFLFVBQUksQ0FBQyxRQUFRLElBQUksU0FBUyxFQUFHLFNBQVEsSUFBSSxXQUFXLENBQUMsQ0FBQztBQUN0RCxjQUFRLElBQUksU0FBUyxFQUFHLEtBQUssTUFBTTtBQUduQyxZQUFNLGFBQXVCLE1BQU0sUUFBUSxHQUFHLEtBQUssSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLE1BQWMsTUFBTSxTQUFTLElBQUksQ0FBQztBQUMxRyxpQkFBVyxRQUFRLFlBQVk7QUFDN0IsWUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLEVBQUcsU0FBUSxJQUFJLE1BQU0sQ0FBQyxDQUFDO0FBQzVDLGdCQUFRLElBQUksSUFBSSxFQUFHLEtBQUssTUFBTTtBQUFBLE1BQ2hDO0FBQUEsSUFDRjtBQUVBLFFBQUksUUFBUSxTQUFTLEdBQUc7QUFDdEIsZ0JBQVUsU0FBUyxLQUFLLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMxRDtBQUFBLElBQ0Y7QUFHQSxVQUFNLFlBQVcsVUFBSyxPQUFPLEtBQUssaUJBQWpCLFlBQWlDLENBQUM7QUFDbkQsVUFBTSxTQUFTLENBQUMsR0FBRyxRQUFRLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLE1BQU07QUFqRHRELFVBQUFDLEtBQUFDO0FBa0RNLFlBQU0sTUFBS0QsTUFBQSxTQUFTLENBQUMsTUFBVixPQUFBQSxNQUFlO0FBQzFCLFlBQU0sTUFBS0MsTUFBQSxTQUFTLENBQUMsTUFBVixPQUFBQSxNQUFlO0FBQzFCLGFBQU8sR0FBRyxjQUFjLEVBQUU7QUFBQSxJQUM1QixDQUFDO0FBRUQsZUFBVyxZQUFZLFFBQVE7QUFDN0IsWUFBTSxRQUFRLFFBQVEsSUFBSSxRQUFRO0FBQ2xDLFlBQU0sTUFBTSxVQUFVLFVBQVUsRUFBRSxLQUFLLGtCQUFrQixDQUFDO0FBRTFELFlBQU0sTUFBTSxJQUFJLFNBQVMsVUFBVTtBQUFBLFFBQ2pDLE1BQU0sR0FBRyxhQUFhLFlBQVksaUJBQWlCLFFBQVEsS0FBSyxNQUFNLE1BQU07QUFBQSxRQUM1RSxLQUFLO0FBQUEsTUFDUCxDQUFDO0FBQ0QsVUFBSSxpQkFBaUIsU0FBUyxNQUFNO0FBL0QxQyxZQUFBRDtBQWlFUSxhQUFLLE9BQU8sS0FBSyxlQUFlLEVBQUUsR0FBRyxVQUFVLENBQUMsUUFBUSxJQUFHLG9CQUFJLEtBQUssR0FBRSxZQUFZLEVBQUU7QUFDcEYsYUFBSyxNQUFNO0FBQ1gsY0FBTSxRQUFRLElBQUksWUFBWSxLQUFLLEtBQUssS0FBSyxRQUFRLE9BQU8sUUFBUTtBQUVwRSxjQUFNLFNBQVFBLE1BQUEsS0FBSyxPQUFPLEtBQUssaUJBQWpCLGdCQUFBQSxJQUFnQztBQUM5QyxZQUFJLFVBQVUsTUFBTSxVQUFVLFNBQVMsS0FBSyxNQUFNLE9BQU8sU0FBUyxJQUFJO0FBQ3BFLGdCQUFNLFdBQVcsQ0FBQyxHQUFHLEtBQUs7QUFDMUIsZ0JBQU0sV0FBVyxDQUFDLE9BQXVDLFNBQVMsS0FBSyxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUU7QUFDL0YsZ0JBQU0sZ0JBQWdCLENBQUMsUUFBa0IsSUFBSSxJQUFJLFFBQVEsRUFBRSxPQUFPLENBQUMsTUFBdUIsTUFBTSxNQUFTO0FBRXpHLGdCQUFNLFlBQVksY0FBYyxNQUFNLFNBQVM7QUFDL0MsZ0JBQU0sU0FBUyxjQUFjLE1BQU0sTUFBTTtBQUd6QyxjQUFJLFVBQVUsU0FBUyxLQUFLLE9BQU8sU0FBUyxHQUFHO0FBQzdDLGtCQUFNLGVBQWUsTUFBTSxVQUFVLFNBQVMsVUFBVSxTQUFTLE1BQU0sT0FBTyxTQUFTLE9BQU87QUFFOUYsa0JBQU0sY0FBYztBQUFBLGNBQ2xCO0FBQUEsY0FDQTtBQUFBLGNBQ0EsYUFBYSxNQUFNO0FBQUEsY0FDbkIsa0JBQWtCLE1BQU0sbUJBQW1CO0FBQUEsWUFDN0MsQ0FBQztBQUFBLFVBQ0g7QUFBQSxRQUNGO0FBQ0EsY0FBTSxLQUFLO0FBQUEsTUFDYixDQUFDO0FBRUQsVUFBSSxhQUFhLFdBQVc7QUFDMUIsY0FBTSxZQUFZLElBQUksVUFBVSxFQUFFLEtBQUssaUJBQWlCLENBQUM7QUFDekQsdUNBQVEsV0FBVyxRQUFRO0FBQzNCLGtCQUFVLGFBQWEsY0FBYyxhQUFhO0FBQ2xELGtCQUFVLGlCQUFpQixTQUFTLENBQUMsTUFBTTtBQUN6QyxZQUFFLGdCQUFnQjtBQUdsQixnQkFBTSxRQUFRLFNBQVMsY0FBYyxPQUFPO0FBQzVDLGdCQUFNLFlBQVk7QUFDbEIsZ0JBQU0sUUFBUTtBQUNkLGNBQUksWUFBWSxLQUFLO0FBQ3JCLG9CQUFVLE9BQU87QUFDakIsZ0JBQU0sTUFBTTtBQUNaLGdCQUFNLE9BQU87QUFFYixjQUFJLFlBQVk7QUFFaEIsZ0JBQU0sU0FBUyxNQUFNO0FBQ25CLGtCQUFNLFlBQVksR0FBRztBQUNyQixnQkFBSSxZQUFZLFNBQVM7QUFBQSxVQUMzQjtBQUVBLGdCQUFNLFVBQVUsWUFBWTtBQUMxQixnQkFBSSxVQUFXO0FBQ2Ysd0JBQVk7QUFDWixrQkFBTSxVQUFVLE1BQU0sTUFBTSxLQUFLO0FBQ2pDLGdCQUFJLENBQUMsV0FBVyxZQUFZLFVBQVU7QUFDcEMscUJBQU87QUFDUDtBQUFBLFlBQ0Y7QUFDQSxrQkFBTSxLQUFLLFdBQVcsVUFBVSxPQUFPO0FBQUEsVUFDekM7QUFFQSxnQkFBTSxpQkFBaUIsV0FBVyxPQUFPRSxPQUFNO0FBQzdDLGdCQUFJQSxHQUFFLFFBQVEsU0FBUztBQUNyQixjQUFBQSxHQUFFLGVBQWU7QUFDakIsb0JBQU0sUUFBUTtBQUFBLFlBQ2hCO0FBQ0EsZ0JBQUlBLEdBQUUsUUFBUSxVQUFVO0FBQ3RCLGNBQUFBLEdBQUUsZUFBZTtBQUNqQixxQkFBTztBQUFBLFlBQ1Q7QUFBQSxVQUNGLENBQUM7QUFFRCxnQkFBTSxpQkFBaUIsUUFBUSxNQUFNO0FBQ25DLGlCQUFLLFFBQVE7QUFBQSxVQUNmLENBQUM7QUFBQSxRQUNILENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQWMsV0FBVyxTQUFpQixTQUFnQztBQWxKNUU7QUFvSkksZUFBVyxRQUFRLEtBQUssSUFBSSxNQUFNLGlCQUFpQixHQUFHO0FBQ3BELFlBQU0sU0FBUSxnQkFBSyxJQUFJLGNBQWMsYUFBYSxJQUFJLE1BQXhDLG1CQUEyQyxnQkFBM0MsbUJBQXdEO0FBQ3RFLFVBQUksQ0FBQyxNQUFNLFFBQVEsS0FBSyxLQUFLLENBQUMsTUFBTSxTQUFTLE9BQU8sRUFBRztBQUN2RCxZQUFNO0FBQUEsUUFDSixLQUFLO0FBQUEsUUFDTCxLQUFLO0FBQUEsUUFDTCxNQUFNLElBQUksQ0FBQyxNQUFlLE1BQU0sVUFBVSxVQUFVLENBQUU7QUFBQSxNQUN4RDtBQUFBLElBQ0Y7QUFHQSxRQUFJLEtBQUssT0FBTyxTQUFTLHNCQUFzQjtBQUM3QyxZQUFNLGtCQUFrQixLQUFLLElBQUksTUFBTSxjQUFjLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxTQUFTLE9BQU87QUFDdkYsVUFBSSxnQkFBZ0IsV0FBVyxHQUFHO0FBQ2hDLGNBQU0sU0FBUyxnQkFBZ0IsQ0FBQztBQUNoQyxjQUFNLGNBQWEsWUFBTyxXQUFQLG1CQUFlO0FBQ2xDLGNBQU0sZ0JBQWdCLGNBQWMsZUFBZSxNQUFNLEdBQUcsVUFBVSxJQUFJLE9BQU8sS0FBSztBQUN0RixjQUFNLEtBQUssSUFBSSxNQUFNLE9BQU8sUUFBUSxhQUFhO0FBQUEsTUFDbkQsV0FBVyxnQkFBZ0IsU0FBUyxHQUFHO0FBQ3JDLFlBQUksT0FBTyxxRUFBcUUsT0FBTyxVQUFVO0FBQUEsTUFDbkc7QUFBQSxJQUNGO0FBR0EsVUFBTSxXQUFXLEtBQUssT0FBTyxLQUFLO0FBQ2xDLFNBQUkscUNBQVcsY0FBYSxRQUFXO0FBQ3JDLGVBQVMsT0FBTyxJQUFJLFNBQVMsT0FBTztBQUNwQyxhQUFPLFNBQVMsT0FBTztBQUFBLElBQ3pCO0FBRUEsVUFBTSxXQUFXLEtBQUssT0FBTyxLQUFLO0FBQ2xDLFNBQUkscUNBQVcsY0FBYSxRQUFXO0FBQ3JDLGVBQVMsT0FBTyxJQUFJLFNBQVMsT0FBTztBQUNwQyxhQUFPLFNBQVMsT0FBTztBQUFBLElBQ3pCO0FBRUEsVUFBTSxVQUFVLEtBQUssUUFBUSxLQUFLLE9BQU8sSUFBSTtBQUM3QyxTQUFLLE9BQU87QUFBQSxFQUNkO0FBQUEsRUFFQSxVQUFVO0FBQ1IsU0FBSyxVQUFVLE1BQU07QUFBQSxFQUN2QjtBQUNGOzs7QUUvTEEsSUFBQUMsb0JBQTJDO0FBSXBDLElBQU0sd0JBQU4sY0FBb0Msd0JBQU07QUFBQSxFQUkvQyxZQUNFLEtBQ1EsUUFDQSxRQUNSO0FBQ0EsVUFBTSxHQUFHO0FBSEQ7QUFDQTtBQU5WLFNBQVEsZ0JBQTZCLG9CQUFJLElBQUk7QUFDN0MsU0FBUSxnQkFBZ0I7QUFBQSxFQVF4QjtBQUFBLEVBRUEsU0FBUztBQUNQLFVBQU0sRUFBRSxVQUFVLElBQUk7QUFDdEIsY0FBVSxNQUFNO0FBQ2hCLGNBQVUsU0FBUyxNQUFNLEVBQUUsTUFBTSxRQUFRLEtBQUssT0FBTyxJQUFJLFlBQVksQ0FBQztBQUd0RSxVQUFNLFlBQVksVUFBVSxVQUFVLEVBQUUsS0FBSyxtQkFBbUIsQ0FBQztBQUNqRSxVQUFNLGNBQWMsVUFBVSxTQUFTLFNBQVMsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUNwRSxjQUFVLFdBQVcsRUFBRSxNQUFNLGdCQUFnQixLQUFLLE9BQU8sSUFBSSxNQUFNLENBQUM7QUFDcEUsZ0JBQVksaUJBQWlCLFVBQVUsTUFBTTtBQUMzQyxXQUFLLGdCQUFnQixZQUFZO0FBQUEsSUFDbkMsQ0FBQztBQUdELFVBQU0sZ0JBQWdCLEtBQUssaUJBQWlCO0FBQzVDLFFBQUksY0FBYyxTQUFTLEdBQUc7QUFDNUIsZ0JBQVUsU0FBUyxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsS0FBSyxvQkFBb0IsQ0FBQztBQUN0RixpQkFBVyxRQUFRLGVBQWU7QUFDaEMsY0FBTSxNQUFNLFVBQVUsVUFBVSxFQUFFLEtBQUssbUJBQW1CLENBQUM7QUFDM0QsY0FBTSxLQUFLLElBQUksU0FBUyxTQUFTLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDckQsWUFBSSxXQUFXLEVBQUUsTUFBTSxLQUFLLENBQUM7QUFDN0IsV0FBRyxpQkFBaUIsVUFBVSxNQUFNO0FBQ2xDLGNBQUksR0FBRyxRQUFTLE1BQUssY0FBYyxJQUFJLElBQUk7QUFBQSxjQUN0QyxNQUFLLGNBQWMsT0FBTyxJQUFJO0FBQUEsUUFDckMsQ0FBQztBQUFBLE1BQ0g7QUFBQSxJQUNGO0FBR0EsVUFBTSxTQUFTLFVBQVUsVUFBVSxFQUFFLEtBQUssaUJBQWlCLENBQUM7QUFDNUQsVUFBTSxZQUFZLE9BQU8sU0FBUyxVQUFVLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDOUQsY0FBVSxpQkFBaUIsU0FBUyxNQUFNLEtBQUssTUFBTSxDQUFDO0FBRXRELFVBQU0sYUFBYSxPQUFPLFNBQVMsVUFBVSxFQUFFLE1BQU0sZUFBZSxLQUFLLFVBQVUsQ0FBQztBQUNwRixlQUFXLGlCQUFpQixTQUFTLFlBQVk7QUFsRHJEO0FBbURNLFlBQU0sZ0JBQTBCLENBQUMsR0FBRyxLQUFLLGFBQWE7QUFDdEQsVUFBSSxLQUFLLGNBQWUsZUFBYyxLQUFLLEtBQUssT0FBTyxJQUFJO0FBRTNELFlBQU0sY0FBYyxLQUFLLElBQUksTUFBTSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLEtBQUssV0FBVyxLQUFLLE9BQU8sT0FBTyxHQUFHLENBQUM7QUFFN0csaUJBQVcsS0FBSyxhQUFhO0FBQzNCLGNBQU0sdUJBQXVCLEtBQUssS0FBSyxFQUFFLE1BQU0sSUFBSTtBQUNuRCxZQUFJLGNBQWMsU0FBUyxHQUFHO0FBQzVCLGdCQUFNLGNBQWEsVUFBSyxJQUFJLGNBQWMsYUFBYSxDQUFDLE1BQXJDLG1CQUF3QztBQUMzRCxnQkFBTUMsaUJBQTBCLE1BQU0sUUFBUSx5Q0FBWSxLQUFLLElBQzNELFdBQVcsU0FDWCx5Q0FBWSxTQUNWLENBQUMsV0FBVyxLQUFLLElBQ2pCLENBQUM7QUFDUCxnQkFBTSxjQUFjLENBQUMsR0FBRyxvQkFBSSxJQUFJLENBQUMsR0FBR0EsZ0JBQWUsR0FBRyxhQUFhLENBQUMsQ0FBQztBQUNyRSxnQkFBTSxzQkFBc0IsS0FBSyxLQUFLLEVBQUUsTUFBTSxXQUFXO0FBQUEsUUFDM0Q7QUFBQSxNQUNGO0FBRUEsVUFBSSx5QkFBTyxTQUFTLFlBQVksTUFBTSxRQUFRLFlBQVksV0FBVyxJQUFJLE1BQU0sRUFBRSxXQUFXO0FBQzVGLFdBQUssTUFBTTtBQUFBLElBQ2IsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUVRLG1CQUE2QjtBQTNFdkM7QUE0RUksVUFBTSxVQUFVLG9CQUFJLElBQVk7QUFDaEMsZUFBVyxRQUFRLEtBQUssSUFBSSxNQUFNLGlCQUFpQixHQUFHO0FBQ3BELFlBQU0sTUFBSyxVQUFLLElBQUksY0FBYyxhQUFhLElBQUksTUFBeEMsbUJBQTJDO0FBQ3RELFlBQU0sUUFBUSx5QkFBSTtBQUNsQixVQUFJLE1BQU0sUUFBUSxLQUFLLEVBQUcsT0FBTSxRQUFRLENBQUMsTUFBYyxRQUFRLElBQUksQ0FBQyxDQUFDO0FBQUEsZUFDNUQsT0FBTyxVQUFVLFlBQVksTUFBTyxTQUFRLElBQUksS0FBSztBQUFBLElBQ2hFO0FBQ0EsV0FBTyxDQUFDLEdBQUcsT0FBTyxFQUFFLEtBQUs7QUFBQSxFQUMzQjtBQUFBLEVBRUEsVUFBVTtBQUNSLFNBQUssVUFBVSxNQUFNO0FBQUEsRUFDdkI7QUFDRjs7O0FDekZBLElBQUFDLG9CQUE0Qzs7O0FDS3JDLElBQU0sZUFBTixjQUEyQixZQUFZO0FBQUEsRUFDNUMsWUFBWSxLQUFVLFFBQWdDLE9BQXFCO0FBQ3pFLFVBQU0sS0FBSyxRQUFRLE9BQU8sYUFBYTtBQUFBLEVBQ3pDO0FBQUE7QUFBQSxFQUdVLGlCQUF1QjtBQUFBLEVBQUM7QUFDcEM7OztBRFdPLElBQU0sZUFBTixNQUFNLHFCQUFvQixjQUFjO0FBQUEsRUFnQjdDLFlBQVksS0FBVSxRQUFnQztBQUNwRCxVQUFNLEdBQUc7QUFiWCxTQUFRLGlCQUErQixDQUFDO0FBQ3hDLFNBQVEsWUFBMEIsQ0FBQztBQUNuQyxTQUFRLFNBQXVCLENBQUM7QUFDaEMsU0FBUSxTQUF1QixDQUFDO0FBQ2hDLFNBQVEsY0FBNEMsQ0FBQztBQUNyRCxTQUFRLG1CQUFtQjtBQUMzQixTQUFRLGNBQXFDO0FBQzdDLFNBQVEsbUJBQTZCLENBQUM7QUFDdEMsU0FBUSxpQkFBMkIsQ0FBQztBQUVwQyxTQUFVLG9CQUFvQjtBQUk1QixTQUFLLFNBQVM7QUFBQSxFQUNoQjtBQUFBO0FBQUEsRUFJQSxNQUFnQixjQUE2QjtBQUMzQyxVQUFNLFFBQVEsS0FBSyxPQUFPLEtBQUs7QUFDL0IsUUFBSSxPQUFPO0FBQ1QsWUFBTSxLQUFLLGNBQWMsS0FBSztBQUM5QjtBQUFBLElBQ0Y7QUFFQSxRQUFJLEtBQUssZ0JBQWdCLE1BQU07QUFDN0IsV0FBSyxpQkFBaUI7QUFDdEI7QUFBQSxJQUNGO0FBRUEsUUFBSSxLQUFLLFVBQVUsV0FBVyxLQUFLLEtBQUssT0FBTyxXQUFXLEdBQUc7QUFDM0QsWUFBTSxLQUFLLFlBQVksSUFBSTtBQUMzQjtBQUFBLElBQ0Y7QUFDQSxRQUFJLEtBQUssVUFBVSxXQUFXLEdBQUc7QUFDL0IsWUFBTSxLQUFLLFlBQVksS0FBSztBQUM1QjtBQUFBLElBQ0Y7QUFFQSxVQUFNLEVBQUUsVUFBVSxJQUFJO0FBQ3RCLGNBQVUsTUFBTTtBQUNoQixTQUFLLE9BQU8sS0FBSyxVQUFVLENBQUM7QUFDNUIsVUFBTSxLQUFLLFdBQVcsU0FBUztBQUFBLEVBQ2pDO0FBQUEsRUFFQSxNQUFnQixtQkFBbUIsV0FBdUM7QUF6RTVFO0FBMEVJLFVBQU0sYUFBWSxVQUFLLEtBQUssWUFBVixZQUFxQjtBQUN2QyxRQUFJLGFBQWEsR0FBRztBQUNsQixXQUFLLGtCQUFrQixTQUFTO0FBQUEsSUFDbEM7QUFBQSxFQUNGO0FBQUEsRUFFVSxnQkFBd0I7QUFDaEMsV0FBTyxHQUFHLEtBQUssVUFBVSxNQUFNLG1CQUFnQixLQUFLLE9BQU8sTUFBTTtBQUFBLEVBQ25FO0FBQUEsRUFFVSxzQkFBZ0M7QUFDeEMsVUFBTSxXQUFxQixDQUFDO0FBQzVCLGFBQVMsSUFBSSxHQUFHLElBQUksS0FBSyxrQkFBa0IsS0FBSztBQUM5QyxZQUFNLE1BQU0sS0FBSyxZQUFZLENBQUM7QUFDOUIsVUFBSSxRQUFRLE9BQVEsVUFBUyxLQUFLLHNCQUFzQjtBQUFBLGVBQy9DLFFBQVEsT0FBUSxVQUFTLEtBQUssc0JBQXNCO0FBQUEsZUFDcEQsUUFBUSxPQUFRLFVBQVMsS0FBSyxzQkFBc0I7QUFBQSxVQUN4RCxVQUFTLEtBQUssRUFBRTtBQUFBLElBQ3ZCO0FBQ0EsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVVLGNBQWMsV0FBOEI7QUFDcEQsVUFBTSxTQUFTLFVBQVUsVUFBVSxFQUFFLEtBQUssaUJBQWlCLENBQUM7QUFDNUQsU0FBSyxPQUFPLFFBQVEsRUFBRSxPQUFPLFFBQVEsS0FBSyxRQUFRLElBQUksTUFBTSxLQUFLLFFBQVEsTUFBTSxFQUFFLENBQUM7QUFDbEYsU0FBSyxPQUFPLFFBQVEsRUFBRSxPQUFPLFNBQVMsS0FBSyxRQUFRLElBQUksTUFBTSxLQUFLLFFBQVEsTUFBTSxFQUFFLENBQUM7QUFDbkYsU0FBSyxPQUFPLFFBQVEsRUFBRSxPQUFPLFFBQVEsS0FBSyxRQUFRLFNBQVMsa0JBQWtCLElBQUksTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO0FBQ3hHLFNBQUssT0FBTyxRQUFRO0FBQUEsTUFDbEIsTUFBTTtBQUFBLE1BQ04sS0FBSztBQUFBLE1BQ0wsU0FBUztBQUFBLE1BQ1QsSUFBSSxZQUFZO0FBQ2QsYUFBSyxZQUFZLGFBQWEsS0FBSyxTQUFTO0FBQzVDLGNBQU0sS0FBSyxZQUFZO0FBQUEsTUFDekI7QUFBQSxJQUNGLENBQUM7QUFDRCxTQUFLLE9BQU8sUUFBUSxFQUFFLE1BQU0sU0FBUyxLQUFLLFNBQVMsU0FBUyxnQkFBVyxJQUFJLE1BQU0sS0FBSyxVQUFVLEVBQUUsQ0FBQztBQUduRyxVQUFNLGVBQWUsS0FBSyxnQkFBZ0I7QUFDMUMsVUFBTSxhQUFhLEtBQUssT0FBTyxRQUFRO0FBQUEsTUFDckMsTUFBTTtBQUFBLE1BQ04sS0FBSztBQUFBLE1BQ0wsU0FDRSxhQUFhLFNBQVMsSUFDbEIsUUFBUSxhQUFhLE1BQU0sV0FBVyxhQUFhLFdBQVcsSUFBSSxNQUFNLEVBQUUsS0FDMUU7QUFBQSxNQUNOLElBQUksTUFBTTtBQUNSLFlBQUksYUFBYSxXQUFXLEVBQUc7QUFDL0IsWUFBSSxhQUFhLEtBQUssS0FBSyxLQUFLLFFBQVEsWUFBWSxFQUFFLEtBQUs7QUFBQSxNQUM3RDtBQUFBLElBQ0YsQ0FBQztBQUNELFFBQUksYUFBYSxXQUFXLEVBQUcsWUFBVyxZQUFZLElBQUk7QUFBQSxFQUM1RDtBQUFBLEVBRUEsTUFBYyxXQUEwQjtBQUN0QyxVQUFNLEtBQUssVUFBVTtBQUNyQixVQUFNLEtBQUssY0FBYztBQUN6QixVQUFNLE9BQU8sS0FBSyxVQUFVLE1BQU07QUFDbEMsU0FBSyxZQUFZLEtBQUssTUFBTTtBQUM1QixVQUFNLHFCQUFxQixLQUFLLEtBQUssS0FBSyxRQUFRO0FBQ2xELFVBQU0sV0FBVyxNQUFNO0FBQ3ZCLFVBQU0sUUFBUSxLQUFLLE9BQU8sS0FBSztBQUMvQixRQUFJLENBQUMsU0FBUyxNQUFNLFNBQVMsVUFBVTtBQUNyQyxXQUFLLE9BQU8sS0FBSyxxQkFBcUIsRUFBRSxNQUFNLFVBQVUsV0FBVyxDQUFDLEtBQUssUUFBUSxFQUFFO0FBQUEsSUFDckYsT0FBTztBQUNMLFlBQU0sVUFBVSxLQUFLLEtBQUssUUFBUTtBQUFBLElBQ3BDO0FBQ0EsVUFBTSxVQUFVLEtBQUssUUFBUSxLQUFLLE9BQU8sSUFBSTtBQUM3QyxVQUFNLEtBQUssWUFBWTtBQUFBLEVBQ3pCO0FBQUEsRUFFUSxxQkFBMkI7QUFsSnJDO0FBbUpJLFVBQU0sWUFBWSxvQkFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLEdBQUcsR0FBRyxLQUFLLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUd4RyxVQUFNLGVBQWMsVUFBSyxTQUFMLG1CQUFXO0FBQy9CLFNBQUssdUJBQXVCLEtBQUssZ0JBQWdCLFNBQVM7QUFFMUQsVUFBTSxvQkFBb0IsS0FBSyxVQUFVLEtBQUssQ0FBQyxNQUFNLEVBQUUsYUFBYSxXQUFXO0FBQy9FLFFBQUksbUJBQW1CO0FBQ3JCLFdBQUssWUFBWSxDQUFDLG1CQUFtQixHQUFHLEtBQUssVUFBVSxPQUFPLENBQUMsTUFBTSxFQUFFLGFBQWEsV0FBVyxDQUFDO0FBQUEsSUFDbEc7QUFFQSxVQUFNLFFBQVEsS0FBSyxVQUFVLFNBQVMsS0FBSyxPQUFPLFNBQVMsS0FBSyxPQUFPO0FBQ3ZFLFNBQUssbUJBQW1CLEtBQUssWUFBWSxTQUFTLEtBQUssVUFBVTtBQUNqRSxTQUFLLG1CQUFtQjtBQUFBLEVBQzFCO0FBQUEsRUFFVSx5QkFBeUIsYUFBZ0M7QUFFakUsUUFBSSxhQUFpQztBQUNyQyxVQUFNLFFBQVEsWUFBWSxVQUFVLEVBQUUsS0FBSyxpQkFBaUIsQ0FBQztBQUM3RCxtQ0FBUSxPQUFPLE9BQU87QUFDdEIsVUFBTTtBQUFBLE1BQ0o7QUFBQSxNQUNBLGNBQWMsS0FBSyxpQkFBaUIsU0FBUyxLQUFLLGlCQUFpQixLQUFLLElBQUksSUFBSSxLQUFLO0FBQUEsSUFDdkY7QUFDQSxVQUFNLGlCQUFpQixTQUFTLE1BQU07QUFDcEMsVUFBSSxZQUFZO0FBQ2QsbUJBQVcsT0FBTztBQUNsQixxQkFBYTtBQUNiO0FBQUEsTUFDRjtBQUNBLG1CQUFhLFlBQVksVUFBVSxFQUFFLEtBQUssMEJBQTBCLENBQUM7QUFDckUsaUJBQVcsU0FBUyxDQUFDLFdBQVcsYUFBYSxXQUFXLE9BQU8sR0FBRztBQUNoRSxjQUFNLE1BQU0sV0FBVyxVQUFVLEVBQUUsS0FBSyx3QkFBd0IsQ0FBQztBQUNqRSxjQUFNLEtBQUssSUFBSSxTQUFTLE9BQU87QUFDL0IsV0FBRyxPQUFPO0FBQ1YsV0FBRyxVQUFVLEtBQUssaUJBQWlCLFNBQVMsS0FBSztBQUNqRCxZQUFJLFdBQVcsRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUM5QixXQUFHLGlCQUFpQixVQUFVLE1BQU07QUFDbEMsY0FBSSxHQUFHLFNBQVM7QUFDZCxnQkFBSSxDQUFDLEtBQUssaUJBQWlCLFNBQVMsS0FBSyxFQUFHLE1BQUssaUJBQWlCLEtBQUssS0FBSztBQUFBLFVBQzlFLE9BQU87QUFDTCxpQkFBSyxtQkFBbUIsS0FBSyxpQkFBaUIsT0FBTyxDQUFDLE1BQU0sTUFBTSxLQUFLO0FBQUEsVUFDekU7QUFDQSxlQUFLLEtBQUssbUJBQW1CO0FBQUEsUUFDL0IsQ0FBQztBQUFBLE1BQ0g7QUFFQSxZQUFNLFlBQVksQ0FBQyxNQUFrQjtBQUNuQyxZQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsU0FBUyxVQUFVLEdBQUc7QUFDakQsbUJBQVMsb0JBQW9CLGFBQWEsU0FBUztBQUNuRDtBQUFBLFFBQ0Y7QUFDQSxZQUFJLENBQUMsV0FBVyxTQUFTLEVBQUUsTUFBYyxLQUFLLENBQUMsTUFBTSxTQUFTLEVBQUUsTUFBYyxHQUFHO0FBQy9FLHFCQUFXLE9BQU87QUFDbEIsdUJBQWE7QUFDYixtQkFBUyxvQkFBb0IsYUFBYSxTQUFTO0FBQUEsUUFDckQ7QUFBQSxNQUNGO0FBQ0EsZUFBUyxpQkFBaUIsYUFBYSxTQUFTO0FBQUEsSUFDbEQsQ0FBQztBQUdELFFBQUksY0FBa0M7QUFDdEMsVUFBTSxTQUFTLFlBQVksVUFBVSxFQUFFLEtBQUssaUJBQWlCLENBQUM7QUFDOUQsbUNBQVEsUUFBUSxLQUFLO0FBQ3JCLFdBQU87QUFBQSxNQUNMO0FBQUEsTUFDQSxZQUFZLEtBQUssZUFBZSxTQUFTLEtBQUssZUFBZSxLQUFLLElBQUksSUFBSSxLQUFLO0FBQUEsSUFDakY7QUFDQSxXQUFPLGlCQUFpQixTQUFTLE1BQU07QUFDckMsVUFBSSxhQUFhO0FBQ2Ysb0JBQVksT0FBTztBQUNuQixzQkFBYztBQUNkO0FBQUEsTUFDRjtBQUNBLFlBQU0sY0FBYyxvQkFBb0IsS0FBSyxHQUFHO0FBQ2hELFVBQUksWUFBWSxXQUFXLEVBQUc7QUFDOUIsb0JBQWMsWUFBWSxVQUFVLEVBQUUsS0FBSywwQkFBMEIsQ0FBQztBQUN0RSxpQkFBVyxPQUFPLGFBQWE7QUFDN0IsY0FBTSxNQUFNLFlBQVksVUFBVSxFQUFFLEtBQUssd0JBQXdCLENBQUM7QUFDbEUsY0FBTSxLQUFLLElBQUksU0FBUyxPQUFPO0FBQy9CLFdBQUcsT0FBTztBQUNWLFdBQUcsVUFBVSxLQUFLLGVBQWUsU0FBUyxHQUFHO0FBQzdDLFlBQUksV0FBVyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzVCLFdBQUcsaUJBQWlCLFVBQVUsTUFBTTtBQUNsQyxjQUFJLEdBQUcsU0FBUztBQUNkLGdCQUFJLENBQUMsS0FBSyxlQUFlLFNBQVMsR0FBRyxFQUFHLE1BQUssZUFBZSxLQUFLLEdBQUc7QUFBQSxVQUN0RSxPQUFPO0FBQ0wsaUJBQUssaUJBQWlCLEtBQUssZUFBZSxPQUFPLENBQUMsTUFBTSxNQUFNLEdBQUc7QUFBQSxVQUNuRTtBQUNBLGVBQUssS0FBSyxtQkFBbUI7QUFBQSxRQUMvQixDQUFDO0FBQUEsTUFDSDtBQUdBLFlBQU0sWUFBWSxDQUFDLE1BQWtCO0FBQ25DLFlBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxTQUFTLFdBQVcsR0FBRztBQUNuRCxtQkFBUyxvQkFBb0IsYUFBYSxTQUFTO0FBQ25EO0FBQUEsUUFDRjtBQUNBLFlBQUksQ0FBQyxZQUFZLFNBQVMsRUFBRSxNQUFjLEtBQUssQ0FBQyxPQUFPLFNBQVMsRUFBRSxNQUFjLEdBQUc7QUFDakYsc0JBQVksT0FBTztBQUNuQix3QkFBYztBQUNkLG1CQUFTLG9CQUFvQixhQUFhLFNBQVM7QUFBQSxRQUNyRDtBQUFBLE1BQ0Y7QUFDQSxlQUFTLGlCQUFpQixhQUFhLFNBQVM7QUFBQSxJQUNsRCxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRVUsaUJBQXVCO0FBQy9CLFNBQUssS0FBSyxlQUFlO0FBQUEsRUFDM0I7QUFBQSxFQUVVLGlCQUF1QjtBQUMvQixRQUFJLEtBQUssVUFBVSxTQUFTLEtBQUssS0FBSyxPQUFPLFNBQVMsR0FBRztBQUN2RCxXQUFLLEtBQUssWUFBWTtBQUFBLElBQ3hCO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFJUSxtQkFBeUI7QUFDL0IsVUFBTSxFQUFFLFVBQVUsSUFBSTtBQUN0QixjQUFVLE1BQU07QUFDaEIsY0FBVSxTQUFTLE1BQU0sRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3ZELFVBQU0sU0FBUyxVQUFVLFVBQVUsRUFBRSxLQUFLLGlCQUFpQixDQUFDO0FBQzVELFNBQUssT0FBTyxRQUFRO0FBQUEsTUFDbEIsT0FBTztBQUFBLE1BQ1AsS0FBSztBQUFBLE1BQ0wsVUFBVTtBQUFBLE1BQ1YsSUFBSSxNQUFNO0FBQ1IsYUFBSyxjQUFjO0FBQ25CLGFBQUssS0FBSyxhQUFhLE1BQU07QUFBQSxNQUMvQjtBQUFBLElBQ0YsQ0FBQztBQUNELFNBQUssT0FBTyxRQUFRO0FBQUEsTUFDbEIsT0FBTztBQUFBLE1BQ1AsS0FBSztBQUFBLE1BQ0wsSUFBSSxNQUFNO0FBQ1IsYUFBSyxjQUFjO0FBQ25CLGFBQUssS0FBSyxhQUFhLEtBQUs7QUFBQSxNQUM5QjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUVBLE1BQWMsYUFBYSxPQUFzQztBQUMvRCxTQUFLLGNBQWM7QUFDbkIsU0FBSyxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQztBQUM5QyxTQUFLLGlCQUFpQixLQUFLLGdCQUFnQjtBQUUzQyxRQUFJLEtBQUssZUFBZSxXQUFXLEdBQUc7QUFDcEMsVUFBSSx5QkFBTyxpQ0FBaUM7QUFDNUMsV0FBSyxlQUFlO0FBQ3BCO0FBQUEsSUFDRjtBQUVBLFVBQU0sWUFBWSxvQkFBSSxJQUFZO0FBQ2xDLFFBQUksQ0FBQyxLQUFLLHVCQUF1QixLQUFLLGdCQUFnQixTQUFTLEdBQUc7QUFDaEUsVUFBSSx5QkFBTywrREFBK0Q7QUFDMUUsV0FBSyxtQkFBbUIsQ0FBQztBQUN6QixXQUFLLGlCQUFpQixDQUFDO0FBQ3ZCLFdBQUssdUJBQXVCLEtBQUssZ0JBQWdCLFNBQVM7QUFBQSxJQUM1RDtBQUNBLFNBQUssU0FBUyxDQUFDO0FBQ2YsU0FBSyxTQUFTLENBQUM7QUFDZixTQUFLLGNBQWMsQ0FBQztBQUNwQixVQUFNLEtBQUssWUFBWTtBQUFBLEVBQ3pCO0FBQUEsRUFFQSxNQUFjLFlBQTJCO0FBQ3ZDLFVBQU0sY0FBYyxDQUFDLEdBQUcsS0FBSyxNQUFNO0FBQ25DLFNBQUssU0FBUyxDQUFDO0FBQ2YsU0FBSyxTQUFTLENBQUM7QUFDZixTQUFLLGNBQWMsQ0FBQztBQUNwQixVQUFNLFlBQVksb0JBQUksSUFBWTtBQUNsQyxTQUFLLHVCQUF1QixhQUFhLFNBQVM7QUFDbEQsVUFBTSxLQUFLLFlBQVk7QUFBQSxFQUN6QjtBQUFBLEVBRUEsTUFBYyxjQUFjLE9BQXFDO0FBeFVuRTtBQXlVSSxXQUFPLEtBQUssT0FBTyxLQUFLO0FBRXhCLFNBQUssaUJBQWlCLEtBQUssZ0JBQWdCO0FBQzNDLFNBQUssWUFBWSxNQUFNLFVBQ3BCLElBQUksQ0FBQyxPQUFPLEtBQUssZUFBZSxLQUFLLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQzlELE9BQU8sQ0FBQyxNQUF1QixNQUFNLE1BQVM7QUFDakQsU0FBSyxTQUFTLE1BQU0sT0FDakIsSUFBSSxDQUFDLE9BQU8sS0FBSyxlQUFlLEtBQUssQ0FBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFDOUQsT0FBTyxDQUFDLE1BQXVCLE1BQU0sTUFBUztBQUNqRCxTQUFLLGNBQWMsQ0FBQyxHQUFHLE1BQU0sV0FBVztBQUN4QyxTQUFLLG1CQUFtQixNQUFNO0FBQzlCLFNBQUssY0FBYyxNQUFNO0FBQ3pCLFNBQUssb0JBQW1CLFdBQU0scUJBQU4sWUFBMEIsQ0FBQztBQUNuRCxTQUFLLGlCQUFpQixDQUFDLEdBQUcsTUFBTSxjQUFjO0FBQzlDLFVBQU0sS0FBSyxZQUFZO0FBQUEsRUFDekI7QUFBQSxFQUVBLE1BQWMsWUFBWSxRQUFnQztBQUN4RCxTQUFLLGVBQWU7QUFDcEIsVUFBTSxFQUFFLFVBQVUsSUFBSTtBQUN0QixjQUFVLE1BQU07QUFDaEIsUUFBSSxRQUFRO0FBQ1YsWUFBTSxLQUFLLGFBQWE7QUFDeEIsZ0JBQVUsU0FBUyxNQUFNLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFBQSxJQUNoRCxPQUFPO0FBQ0wsZ0JBQVUsU0FBUyxNQUFNLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNwRCxnQkFBVSxTQUFTLEtBQUssRUFBRSxNQUFNLFdBQVcsS0FBSyxPQUFPLE1BQU0sR0FBRyxDQUFDO0FBQ2pFLGdCQUFVLFNBQVMsS0FBSyxFQUFFLE1BQU0sV0FBVyxLQUFLLE9BQU8sTUFBTSxHQUFHLENBQUM7QUFBQSxJQUNuRTtBQUNBLFVBQU0sU0FBUyxVQUFVLFVBQVUsRUFBRSxLQUFLLGlCQUFpQixDQUFDO0FBQzVELFNBQUssT0FBTyxRQUFRO0FBQUEsTUFDbEIsT0FBTyxTQUFTLG9CQUFvQjtBQUFBLE1BQ3BDLEtBQUs7QUFBQSxNQUNMLFVBQVU7QUFBQSxNQUNWLElBQUksTUFBTyxTQUFTLEtBQUssS0FBSyxlQUFlLElBQUksS0FBSyxLQUFLLFVBQVU7QUFBQSxJQUN2RSxDQUFDO0FBQ0QsU0FBSyxPQUFPLFFBQVEsRUFBRSxPQUFPLFNBQVMsS0FBSyxpQkFBaUIsSUFBSSxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7QUFBQSxFQUN0RjtBQUFBLEVBRUEsTUFBYyxpQkFBZ0M7QUFDNUMsVUFBTSxLQUFLLGFBQWE7QUFDeEIsU0FBSyxjQUFjO0FBQ25CLFNBQUssWUFBWSxDQUFDO0FBQ2xCLFNBQUssU0FBUyxDQUFDO0FBQ2YsU0FBSyxTQUFTLENBQUM7QUFDZixTQUFLLGNBQWMsQ0FBQztBQUNwQixTQUFLLG1CQUFtQjtBQUN4QixVQUFNLEtBQUssWUFBWTtBQUFBLEVBQ3pCO0FBQUE7QUFBQSxFQUdBLE1BQWMsUUFBUSxRQUF3QztBQUM1RCxVQUFNLEtBQUssVUFBVTtBQUNyQixVQUFNLEtBQUssY0FBYztBQUN6QixVQUFNLE9BQU8sS0FBSyxVQUFVLE1BQU07QUFDbEMsU0FBSyxZQUFZLEtBQUssTUFBTTtBQUM1QixRQUFJLFdBQVcsUUFBUTtBQUNyQixXQUFLLE9BQU8sS0FBSyxJQUFJO0FBQ3JCLFVBQUksS0FBSyxXQUFXO0FBQ2xCLGNBQU0sa0NBQWtDLEtBQUssS0FBSyxLQUFLLFFBQVE7QUFBQSxNQUNqRTtBQUFBLElBQ0YsT0FBTztBQUNMLFdBQUssT0FBTyxLQUFLLElBQUk7QUFBQSxJQUN2QjtBQUNBLFVBQU0sS0FBSyxZQUFZO0FBQUEsRUFDekI7QUFBQTtBQUFBLEVBSVEsa0JBQWtCLFdBQThCO0FBOVkxRDtBQStZSSxVQUFNLFNBQVEsVUFBSyxLQUFLLFlBQVYsWUFBcUI7QUFDbkMsVUFBTSxTQUFTLFVBQVUsVUFBVSxFQUFFLEtBQUssc0JBQXNCLENBQUM7QUFDakUsV0FBTyxXQUFXLEVBQUUsTUFBTSx3QkFBYyxLQUFLLDJEQUFtRCxDQUFDO0FBRWpHLFVBQU0sVUFBVSxPQUFPLFVBQVUsRUFBRSxLQUFLLHVCQUF1QixDQUFDO0FBQ2hFLFNBQUssT0FBTyxTQUFTO0FBQUEsTUFDbkIsT0FBTztBQUFBLE1BQ1AsS0FBSztBQUFBLE1BQ0wsSUFBSSxZQUFZO0FBQ2QsYUFBSyxZQUFZO0FBQ2pCLGNBQU0sS0FBSyxZQUFZO0FBQUEsTUFDekI7QUFBQSxJQUNGLENBQUM7QUFDRCxTQUFLLE9BQU8sU0FBUztBQUFBLE1BQ25CLE9BQU87QUFBQSxNQUNQLEtBQUs7QUFBQSxNQUNMLElBQUksTUFBTTtBQUNSLFlBQUkseUJBQU8seUZBQXlGO0FBQUEsTUFDdEc7QUFBQSxJQUNGLENBQUM7QUFDRCxTQUFLLE9BQU8sU0FBUztBQUFBLE1BQ25CLE9BQU87QUFBQSxNQUNQLEtBQUs7QUFBQSxNQUNMLElBQUksWUFBWTtBQUNkLGFBQUssVUFBVSxNQUFNO0FBQ3JCLGFBQUssT0FBTyxFQUFFLEdBQUcsS0FBSyxNQUFNLFFBQVEsTUFBTTtBQUMxQyxjQUFNLHVCQUF1QixLQUFLLEtBQUssS0FBSyxLQUFLLFVBQVUsS0FBSztBQUNoRSxjQUFNLEtBQUssWUFBWTtBQUFBLE1BQ3pCO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBRVEsa0JBQStCO0FBQ3JDLFVBQU0sUUFBUSxLQUFLLE9BQU8sS0FBSztBQUMvQixRQUFJLENBQUMsU0FBUyxNQUFNLFNBQVMsTUFBTSxFQUFHLFFBQU8sb0JBQUksSUFBSTtBQUNyRCxXQUFPLElBQUksSUFBSSxNQUFNLFNBQVM7QUFBQSxFQUNoQztBQUFBO0FBQUEsRUFJUSxrQkFBZ0M7QUF2YjFDO0FBd2JJLFVBQU0sZUFBZSxLQUFLLGdCQUFnQjtBQUMxQyxVQUFNLFFBQXNCLENBQUM7QUFDN0IsZUFBVyxRQUFRLEtBQUssSUFBSSxNQUFNLGlCQUFpQixHQUFHO0FBQ3BELFlBQU0sTUFBSyxVQUFLLElBQUksY0FBYyxhQUFhLElBQUksTUFBeEMsbUJBQTJDO0FBQ3RELFdBQUkseUJBQUksWUFBVyxLQUFNO0FBQ3pCLFVBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxHQUFHLFVBQVc7QUFDbEQsVUFBSSxHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsRUFBRztBQUNoQyxVQUFJLGFBQWEsSUFBSSxLQUFLLElBQUksRUFBRztBQUNqQyxZQUFNLEtBQUs7QUFBQSxRQUNULFVBQVUsS0FBSztBQUFBLFFBQ2YsUUFBUTtBQUFBLFFBQ1IsUUFBUSxHQUFHO0FBQUEsUUFDWCxXQUFXLEdBQUc7QUFBQSxRQUNkLEtBQUssR0FBRztBQUFBLFFBQ1IsU0FBUyxHQUFHO0FBQUEsUUFDWixXQUFXLEdBQUc7QUFBQSxRQUNkLGdCQUFnQixHQUFHO0FBQUEsUUFDbkIsU0FBUyxHQUFHO0FBQUEsTUFDZCxDQUFlO0FBQUEsSUFDakI7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUFBLEVBRVEsaUJBQXVCO0FBQzdCLFVBQU0sRUFBRSxVQUFVLElBQUk7QUFDdEIsY0FBVSxNQUFNO0FBQ2hCLGNBQVUsU0FBUyxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNuRSxjQUFVLFNBQVMsS0FBSztBQUFBLE1BQ3RCLE1BQU07QUFBQSxNQUNOLEtBQUs7QUFBQSxJQUNQLENBQUM7QUFDRCxVQUFNLFNBQVMsVUFBVSxVQUFVLEVBQUUsS0FBSyxpQkFBaUIsQ0FBQztBQUM1RCxTQUFLLE9BQU8sUUFBUSxFQUFFLE9BQU8sU0FBUyxLQUFLLFNBQVMsSUFBSSxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7QUFBQSxFQUM5RTtBQUFBLEVBS1EsdUJBQXVCLGFBQTJCLFdBQWlDO0FBQ3pGLFVBQU0sV0FBVyxLQUFLLGNBQWMsb0JBQW9CLGFBQWEsS0FBSyxXQUFXLElBQUk7QUFDekYsVUFBTSxjQUFjLGtCQUFrQixVQUFVLEtBQUssZ0JBQWdCO0FBQ3JFLFVBQU0sWUFBWSxnQkFBZ0IsYUFBYSxLQUFLLGNBQWM7QUFDbEUsVUFBTSxjQUFjLFVBQVUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLElBQUksRUFBRSxRQUFRLENBQUM7QUFFdEUsVUFBTSxVQUFVLFlBQ2IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUNyQixLQUFLLENBQUMsR0FBRyxNQUFNLElBQUksS0FBSyxFQUFFLEdBQUksRUFBRSxRQUFRLElBQUksSUFBSSxLQUFLLEVBQUUsR0FBSSxFQUFFLFFBQVEsQ0FBQztBQUN6RSxVQUFNLFdBQVcsWUFBWSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRztBQUNqRCxVQUFNLGdCQUFnQixTQUNuQixPQUFPLENBQUMsTUFBRztBQXplbEI7QUF5ZXNCLHNCQUFFLFlBQUYsWUFBYSxLQUFLO0FBQUEsS0FBQyxFQUNsQyxLQUFLLENBQUMsR0FBRyxNQUFHO0FBMWVuQjtBQTBldUIsc0JBQUUsWUFBRixZQUFhLE9BQU0sT0FBRSxZQUFGLFlBQWE7QUFBQSxLQUFFO0FBQ3JELFVBQU0sZUFBZSxhQUFhLFNBQVMsT0FBTyxDQUFDLE1BQUc7QUEzZTFEO0FBMmU2RCxnQkFBRSxPQUFFLFlBQUYsWUFBYTtBQUFBLEtBQUUsQ0FBQztBQUMzRSxVQUFNLGFBQWEsQ0FBQyxHQUFHLGVBQWUsR0FBRyxZQUFZO0FBRXJELFVBQU0sV0FBVyxRQUFRLE1BQU0sR0FBRyxhQUFZLFNBQVM7QUFDdkQsVUFBTSxhQUFhLFdBQVcsTUFBTSxHQUFHLGFBQVksZUFBZSxTQUFTLE1BQU07QUFFakYsU0FBSyxZQUFZLENBQUMsR0FBRyxVQUFVLEdBQUcsVUFBVTtBQUM1QyxTQUFLLG1CQUFtQixLQUFLLFVBQVU7QUFDdkMsV0FBTyxLQUFLLFVBQVUsU0FBUztBQUFBLEVBQ2pDO0FBQUE7QUFBQSxFQUlBLE1BQWMsZUFBOEI7QUFDMUMsV0FBTyxLQUFLLE9BQU8sS0FBSztBQUN4QixVQUFNLFVBQVUsS0FBSyxRQUFRLEtBQUssT0FBTyxJQUFJO0FBQUEsRUFDL0M7QUFBQSxFQUVBLE1BQWMsY0FBNkI7QUFDekMsU0FBSyxPQUFPLEtBQUssZ0JBQWdCO0FBQUEsTUFDL0IsV0FBVyxLQUFLLFVBQVUsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRO0FBQUEsTUFDL0MsUUFBUSxLQUFLLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRO0FBQUEsTUFDekMsYUFBYSxDQUFDLEdBQUcsS0FBSyxXQUFXO0FBQUEsTUFDakMsa0JBQWtCLEtBQUs7QUFBQSxNQUN2QixhQUFhLEtBQUs7QUFBQSxNQUNsQixrQkFBa0IsS0FBSztBQUFBLE1BQ3ZCLGdCQUFnQixDQUFDLEdBQUcsS0FBSyxjQUFjO0FBQUEsSUFDekM7QUFDQSxVQUFNLFVBQVUsS0FBSyxRQUFRLEtBQUssT0FBTyxJQUFJO0FBQUEsRUFDL0M7QUFBQTtBQUFBLEVBRVEsa0JBQWdDO0FBMWdCMUM7QUEyZ0JJLFVBQU0sT0FBTyxLQUFLLElBQUksTUFBTSxzQkFBc0IsS0FBSyxLQUFLLFFBQVE7QUFDcEUsUUFBSSxDQUFDLEtBQU0sUUFBTyxDQUFDO0FBQ25CLFVBQU0sUUFBUSxLQUFLLElBQUksY0FBYyxhQUFhLElBQUk7QUFDdEQsUUFBSSxDQUFDLE1BQU8sUUFBTyxDQUFDO0FBR3BCLFVBQU0sWUFBWSxJQUFJO0FBQUEsUUFDbkIsV0FBTSxjQUFOLFlBQW1CLENBQUMsR0FDbEIsT0FBTyxDQUFDLFNBQVMsS0FBSyxTQUFTLE1BQVMsRUFDeEMsSUFBSSxDQUFDLFNBQVMsS0FBSyxTQUFTLE1BQU0sSUFBSTtBQUFBLElBQzNDO0FBRUEsVUFBTSxRQUFzQixDQUFDO0FBQzdCLGVBQVcsU0FBUSxXQUFNLFVBQU4sWUFBZSxDQUFDLEdBQUc7QUFFcEMsVUFBSSxDQUFDLFVBQVUsSUFBSSxLQUFLLFNBQVMsTUFBTSxJQUFJLEVBQUc7QUFDOUMsWUFBTSxTQUFTLEtBQUssSUFBSSxjQUFjLHFCQUFxQixLQUFLLE1BQU0sS0FBSyxLQUFLLFFBQVE7QUFDeEYsVUFBSSxDQUFDLFVBQVUsRUFBRSxrQkFBa0IseUJBQVE7QUFDM0MsWUFBTTtBQUFBLFFBQ0osZUFBZSxLQUFLLFFBQVEsTUFBTTtBQUFBLE1BQ3BDO0FBQUEsSUFDRjtBQUNBLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUE1Z0JhLGFBb2NhLGVBQWU7QUFwYzVCLGFBcWNhLFlBQVk7QUFyYy9CLElBQU0sY0FBTjs7O0F0SVRQLElBQXFCLHlCQUFyQixjQUFvRCx5QkFBTztBQUFBLEVBTXpELE1BQU0sU0FBUztBQUNiLFVBQU0sS0FBSyxhQUFhO0FBQ3hCLFNBQUssT0FBTyxNQUFNLFVBQVUsSUFBSTtBQUVoQyxTQUFLLElBQUksVUFBVSxjQUFjLFlBQVk7QUFDM0MsWUFBTSxpQkFBaUIsSUFBSTtBQUFBLElBQzdCLENBQUM7QUFFRCxTQUFLO0FBQUEsTUFDSCxLQUFLLElBQUksTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLFlBQVk7QUE3QnJEO0FBOEJRLFlBQUksRUFBRSxnQkFBZ0IsNEJBQVUsS0FBSyxjQUFjLEtBQU07QUFDekQsYUFBSSxVQUFLLEtBQUssZ0JBQVYsbUJBQXdCLFVBQVU7QUFDcEMsZUFBSyxLQUFLLFlBQVksS0FBSyxJQUFJLElBQUksS0FBSyxLQUFLLFlBQVksT0FBTztBQUNoRSxpQkFBTyxLQUFLLEtBQUssWUFBWSxPQUFPO0FBQ3BDLGVBQUssVUFBVSxNQUFNLEtBQUssSUFBSTtBQUFBLFFBQ2hDO0FBQUEsTUFDRixDQUFDO0FBQUEsSUFDSDtBQUVBLFNBQUssZ0JBQWdCLEtBQUssaUJBQWlCO0FBQzNDLFNBQUssZ0JBQWdCO0FBRXJCLFNBQUssYUFBYSxxQkFBcUIsQ0FBQyxTQUFTLElBQUksYUFBYSxNQUFNLElBQUksQ0FBQztBQUU3RSxTQUFLLGNBQWMsU0FBUyxrQkFBa0IsTUFBTSxLQUFLLHFCQUFxQixDQUFDO0FBRS9FLFNBQUssV0FBVztBQUFBLE1BQ2QsSUFBSTtBQUFBLE1BQ0osTUFBTTtBQUFBLE1BQ04sVUFBVSxNQUFNO0FBQ2QsWUFBSSxZQUFZLEtBQUssS0FBSyxJQUFJLEVBQUUsS0FBSztBQUFBLE1BQ3ZDO0FBQUEsSUFDRixDQUFDO0FBRUQsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLE1BQU0sS0FBSyxxQkFBcUI7QUFBQSxJQUM1QyxDQUFDO0FBRUQsU0FBSyxjQUFjLElBQUksNEJBQTRCLEtBQUssS0FBSyxJQUFJLENBQUM7QUFFbEUsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLFlBQVk7QUFDcEIsZUFBTyxLQUFLLEtBQUs7QUFDakIsY0FBTSxRQUFRLGtCQUFrQixJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUM7QUFDbkUsY0FBTSxXQUFXLE1BQU0sT0FBTyxDQUFDLE1BQU0sVUFBVSxDQUFDLENBQUMsRUFBRTtBQUNuRCxhQUFLLEtBQUssY0FBYyxLQUFLLEVBQUUsV0FBVyxNQUFNLEdBQUcsVUFBVSxNQUFNLFFBQVEsUUFBUSxTQUFTLENBQUM7QUFDN0YsY0FBTSxVQUFVLE1BQU0sS0FBSyxJQUFJO0FBQy9CLGFBQUssZ0JBQWdCLEtBQUs7QUFDMUIsY0FBTSxLQUFLLG9CQUFvQjtBQUMvQixjQUFNLEtBQUssaUJBQWlCO0FBQzVCLGNBQU0sT0FBTyxpQkFBaUIsT0FBTyxLQUFLLFFBQVE7QUFDbEQsWUFBSSxDQUFDLE1BQU07QUFDVCxjQUFJLHlCQUFPLGVBQWU7QUFDMUI7QUFBQSxRQUNGO0FBQ0EsWUFBSSxZQUFZLEtBQUssS0FBSyxNQUFNLElBQUksRUFBRSxLQUFLO0FBQUEsTUFDN0M7QUFBQSxJQUNGLENBQUM7QUFFRCxTQUFLLFdBQVc7QUFBQSxNQUNkLElBQUk7QUFBQSxNQUNKLE1BQU07QUFBQSxNQUNOLFVBQVUsWUFBWTtBQUNwQixjQUFNLFFBQVEsS0FBSyxLQUFLO0FBQ3hCLFlBQUksQ0FBQyxTQUFTLE1BQU0sa0JBQWtCLFdBQVcsR0FBRztBQUNsRCxjQUFJLHlCQUFPLDhEQUE4RDtBQUN6RTtBQUFBLFFBQ0Y7QUFDQSxjQUFNLFdBQVcsa0JBQWtCLElBQUksRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQztBQUN0RSxjQUFNLFlBQVksU0FBUyxPQUFPLENBQUMsTUFBTSxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sa0JBQWtCLFNBQVMsRUFBRSxRQUFRLENBQUM7QUFDdEcsWUFBSSxVQUFVLFdBQVcsR0FBRztBQUMxQixjQUFJLHlCQUFPLDZDQUF3QztBQUNuRCxpQkFBTyxLQUFLLEtBQUs7QUFDakIsZ0JBQU0sVUFBVSxNQUFNLEtBQUssSUFBSTtBQUMvQjtBQUFBLFFBQ0Y7QUFDQSxjQUFNLE9BQU8saUJBQWlCLFdBQVcsS0FBSyxRQUFRO0FBQ3RELFlBQUksQ0FBQyxLQUFNO0FBQ1gsY0FBTSxRQUFRLElBQUksWUFBWSxLQUFLLEtBQUssTUFBTSxJQUFJO0FBQ2xELGNBQU0sY0FBYyxLQUFLO0FBQ3pCLGNBQU0sS0FBSztBQUFBLE1BQ2I7QUFBQSxJQUNGLENBQUM7QUFFRCxTQUFLLFdBQVc7QUFBQSxNQUNkLElBQUk7QUFBQSxNQUNKLE1BQU07QUFBQSxNQUNOLFVBQVUsTUFBTTtBQUNkLFlBQUksZ0JBQWdCLEtBQUssS0FBSyxJQUFJLEVBQUUsS0FBSztBQUFBLE1BQzNDO0FBQUEsSUFDRixDQUFDO0FBRUQsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLE1BQU0sS0FBSyxrQkFBa0I7QUFBQSxJQUN6QyxDQUFDO0FBRUQsU0FBSyxXQUFXO0FBQUEsTUFDZCxJQUFJO0FBQUEsTUFDSixNQUFNO0FBQUEsTUFDTixVQUFVLFlBQVk7QUFDcEIsYUFBSyxnQkFBZ0I7QUFDckIsY0FBTSxLQUFLLG9CQUFvQjtBQUMvQixjQUFNLEtBQUssaUJBQWlCO0FBQUEsTUFDOUI7QUFBQSxJQUNGLENBQUM7QUFHRCxTQUFLO0FBQUEsTUFDSCxLQUFLLElBQUksVUFBVSxHQUFHLGFBQWEsQ0FBQyxNQUFZLFNBQVM7QUF0SS9EO0FBd0lRLFlBQUksZ0JBQWdCLDJCQUFTLEtBQUssY0FBYyxNQUFNO0FBQ3BELGdCQUFNLGFBQVcsZ0JBQUssSUFBSSxjQUFjLGFBQWEsSUFBSSxNQUF4QyxtQkFBMkMsZ0JBQTNDLG1CQUF3RCxZQUFXO0FBQ3BGLGVBQUs7QUFBQSxZQUFRLENBQUMsU0FDWixLQUNHLFNBQVMsV0FBVyw0QkFBNEIsb0JBQW9CLEVBQ3BFLFFBQVEsV0FBVyxXQUFXLGNBQWMsRUFDNUMsUUFBUSxZQUFZO0FBQ25CLG9CQUFNLHVCQUF1QixLQUFLLEtBQUssS0FBSyxNQUFNLENBQUMsUUFBUTtBQUFBLFlBQzdELENBQUM7QUFBQSxVQUNMO0FBQUEsUUFDRjtBQUdBLFlBQUksZ0JBQWdCLDJCQUFTO0FBQzNCLGVBQUs7QUFBQSxZQUFRLENBQUMsU0FDWixLQUNHLFNBQVMsdUJBQXVCLEVBQ2hDLFFBQVEsUUFBUSxFQUNoQixRQUFRLE1BQU07QUFDYixrQkFBSSxzQkFBc0IsS0FBSyxLQUFLLE1BQU0sSUFBSSxFQUFFLEtBQUs7QUFBQSxZQUN2RCxDQUFDO0FBQUEsVUFDTDtBQUFBLFFBQ0Y7QUFBQSxNQUNGLENBQUM7QUFBQSxJQUNIO0FBb0JBLFNBQUssV0FBVztBQUFBLE1BQ2QsSUFBSTtBQUFBLE1BQ0osTUFBTTtBQUFBLE1BQ04sVUFBVSxZQUFZO0FBQ3BCLGNBQU0sY0FBYyxLQUFLLElBQUksTUFDMUIsaUJBQWlCLEVBQ2pCLE9BQU8sQ0FBQyxNQUFHO0FBMUx0QjtBQTBMeUIsbUNBQUssSUFBSSxjQUFjLGFBQWEsQ0FBQyxNQUFyQyxtQkFBd0MsZ0JBQXhDLG1CQUFxRCxZQUFXO0FBQUEsU0FBSTtBQUVyRixZQUFJLENBQUMsWUFBWSxRQUFRO0FBQ3ZCLGNBQUkseUJBQU8sOEJBQThCO0FBQ3pDO0FBQUEsUUFDRjtBQUVBLG1CQUFXLFFBQVEsYUFBYTtBQUM5QixnQkFBTSx1QkFBdUIsS0FBSyxLQUFLLEtBQUssTUFBTSxLQUFLO0FBQUEsUUFDekQ7QUFDQSxZQUFJLHlCQUFPLFdBQVcsWUFBWSxNQUFNLFFBQVEsWUFBWSxXQUFXLElBQUksTUFBTSxFQUFFLHdCQUF3QjtBQUFBLE1BQzdHO0FBQUEsSUFDRixDQUFDO0FBRUQsU0FBSyxhQUFhLGlCQUFpQixDQUFDLFNBQVMsSUFBSSxVQUFVLE1BQU0sSUFBSSxDQUFDO0FBQ3RFLFNBQUssY0FBYyxhQUFhLGNBQWMsTUFBTSxLQUFLLGtCQUFrQixDQUFDO0FBQUEsRUFDOUU7QUFBQSxFQUVBLFdBQVc7QUFBQSxFQUFDO0FBQUEsRUFFWixNQUFNLGVBQWU7QUE5TXZCO0FBK01JLFVBQU0sUUFBUSxNQUFNLEtBQUssU0FBUztBQUNsQyxTQUFLLFdBQVcsT0FBTyxPQUFPLENBQUMsR0FBRyxtQkFBa0Isb0NBQU8sYUFBUCxZQUFtQixDQUFDLENBQUM7QUFBQSxFQUMzRTtBQUFBLEVBRUEsTUFBTSxlQUFlO0FBbk52QjtBQW9OSSxVQUFNLFdBQVcsV0FBTSxLQUFLLFNBQVMsTUFBcEIsWUFBMEIsQ0FBQztBQUM1QyxVQUFNLEtBQUssU0FBUyxFQUFFLEdBQUcsU0FBUyxVQUFVLEtBQUssU0FBUyxDQUFDO0FBQUEsRUFDN0Q7QUFBQSxFQUVBLGdCQUFnQixhQUE0QjtBQUMxQyxVQUFNLFdBQVcsb0NBQWUsa0JBQWtCLElBQUksRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQztBQUNyRixVQUFNLFdBQVcsU0FBUyxPQUFPLENBQUMsTUFBTSxVQUFVLENBQUMsQ0FBQyxFQUFFO0FBQ3RELFNBQUssY0FBYyxRQUFRLEdBQUcsUUFBUSxNQUFNO0FBQUEsRUFDOUM7QUFBQSxFQUVBLE1BQU0sdUJBQXVCO0FBQzNCLFVBQU0sRUFBRSxVQUFVLElBQUksS0FBSztBQUMzQixRQUFJLE9BQU8sVUFBVSxnQkFBZ0IsbUJBQW1CLEVBQUUsQ0FBQztBQUMzRCxRQUFJLENBQUMsTUFBTTtBQUNULGFBQU8sVUFBVSxhQUFhLEtBQUs7QUFDbkMsWUFBTSxLQUFLLGFBQWEsRUFBRSxNQUFNLHFCQUFxQixRQUFRLEtBQUssQ0FBQztBQUFBLElBQ3JFO0FBQ0EsY0FBVSxXQUFXLElBQUk7QUFBQSxFQUMzQjtBQUFBLEVBRUEsTUFBTSxzQkFBc0I7QUFDMUIsZUFBVyxRQUFRLEtBQUssSUFBSSxVQUFVLGdCQUFnQixtQkFBbUIsR0FBRztBQUMxRSxVQUFJLEtBQUssZ0JBQWdCLGNBQWM7QUFDckMsY0FBTSxLQUFLLEtBQUssT0FBTztBQUFBLE1BQ3pCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQU0sb0JBQW9CO0FBQ3hCLFVBQU0sRUFBRSxVQUFVLElBQUksS0FBSztBQUMzQixRQUFJLE9BQU8sVUFBVSxnQkFBZ0IsZUFBZSxFQUFFLENBQUM7QUFDdkQsUUFBSSxDQUFDLE1BQU07QUFDVCxhQUFPLFVBQVUsYUFBYSxLQUFLO0FBQ25DLFlBQU0sS0FBSyxhQUFhLEVBQUUsTUFBTSxpQkFBaUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNqRTtBQUNBLGNBQVUsV0FBVyxJQUFJO0FBQUEsRUFDM0I7QUFBQSxFQUVBLE1BQU0sbUJBQW1CO0FBQ3ZCLGVBQVcsUUFBUSxLQUFLLElBQUksVUFBVSxnQkFBZ0IsZUFBZSxHQUFHO0FBQ3RFLFVBQUksS0FBSyxnQkFBZ0IsV0FBVztBQUNsQyxjQUFNLEtBQUssS0FBSyxPQUFPO0FBQUEsTUFDekI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBTSxZQUFZO0FBQ2hCLFNBQUssT0FBTyxFQUFFLGVBQWUsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxFQUFFO0FBQ25ELFVBQU0sVUFBVSxNQUFNLEtBQUssSUFBSTtBQUMvQixTQUFLLGdCQUFnQjtBQUNyQixVQUFNLEtBQUssb0JBQW9CO0FBQy9CLFVBQU0sS0FBSyxpQkFBaUI7QUFDNUIsUUFBSSx5QkFBTyxxQ0FBcUM7QUFBQSxFQUNsRDtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgIndlaWdodHMiLCAiZm0iLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAiZmlsdGVyIiwgInBhdGgiLCAicm9vdCIsICJmbSIsICJfYSIsICJfYiIsICJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAieCIsICJ4IiwgImtleSIsICJ0aWNrcyIsICJyYW5nZSIsICJyYW5nZSIsICJyYW5nZSIsICJmb3JtYXQiLCAidDEiLCAieCIsICJ5IiwgInkiLCAieSIsICJjb2xvciIsICJyZ2IiLCAieCIsICJ4IiwgInplcm8iLCAiaSIsICJ4IiwgIm51bWJlciIsICJ4IiwgIngiLCAicmFuZ2UiLCAiaSIsICJ5IiwgIm51bWJlciIsICJ4IiwgIngiLCAieCIsICJ4IiwgIngiLCAieCIsICJsb2NhbGUiLCAiemVybyIsICJmb3JtYXQiLCAiZm9ybWF0UHJlZml4IiwgInZhbHVlIiwgImxpbmVhciIsICJkYXRlIiwgInJhbmdlIiwgImRhdGUiLCAiZGF0ZSIsICJkYXRlIiwgImRhdGUiLCAiZGF0ZSIsICJkYXRlIiwgImRhdGUiLCAiZGF0ZSIsICJ0aWNrcyIsICJzdGVwIiwgImRhdGUiLCAieSIsICJsb2NhbGUiLCAiZm9ybWF0cyIsICJwYWQiLCAiZm9ybWF0IiwgImxvY2FsZSIsICJkZWZhdWx0TG9jYWxlIiwgIm51bWJlciIsICJ0aWNrcyIsICJzZWNvbmQiLCAiZm9ybWF0IiwgImZvcm1hdFllYXIiLCAidGlja0Zvcm1hdCIsICJkYXRlIiwgInkiLCAiY29uc3RhbnRfZGVmYXVsdCIsICJ4IiwgIngiLCAieSIsICJ4IiwgIngiLCAieSIsICJ4IiwgInkiLCAiY29uc3RhbnRfZGVmYXVsdCIsICJwYXRoIiwgImNvbnN0YW50X2RlZmF1bHQiLCAicGF0aCIsICJkb2N1bWVudCIsICJ4IiwgImRhdHVtIiwgImNvbnN0YW50X2RlZmF1bHQiLCAieCIsICJjb25zdGFudF9kZWZhdWx0IiwgInNlbGVjdGlvbiIsICJhc2NlbmRpbmciLCAic2VsZWN0X2RlZmF1bHQiLCAibGluZWFyIiwgInNlbGVjdF9kZWZhdWx0IiwgImRhdGUiLCAiX2EiLCAic2xpY2UiLCAiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgIl9iIiwgImUiLCAiaW1wb3J0X29ic2lkaWFuIiwgImV4aXN0aW5nRGVja3MiLCAiaW1wb3J0X29ic2lkaWFuIl0KfQo=
