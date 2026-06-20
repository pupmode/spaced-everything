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
var import_obsidian5 = require("obsidian");

// src/types.ts
var DEFAULT_SETTINGS = {
  sourceScope: "vault",
  sourceFolders: [],
  evergreenFolder: "Evergreen",
  initialInterval: 50,
  defaultEaseFactor: 300
};

// src/store.ts
var EMPTY_DATA = { notes: {}, reviewLoadLog: [] };
async function loadStore(plugin) {
  var _a;
  const saved = await plugin.loadData();
  return (_a = saved == null ? void 0 : saved.pluginData) != null ? _a : EMPTY_DATA;
}
async function saveStore(plugin, data) {
  var _a;
  const current = (_a = await plugin.loadData()) != null ? _a : {};
  await plugin.saveData({ ...current, pluginData: data });
}

// src/scheduler.ts
function folderWeight(filepath, settings) {
  if (settings.sourceScope !== "folder") return 1;
  const entry = settings.sourceFolders.find((e) => filepath.startsWith(e.path + "/"));
  return entry ? entry.weight / 100 : 1;
}
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
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
function nextInterval(note, reaction) {
  var _a;
  const { interval, easeFactor } = note;
  if (reaction === "skip") return interval;
  if (reaction === "revisit") {
    return Math.max(1, Math.floor(interval * 0.9));
  }
  const multipliers = {
    exciting: 0.83,
    interesting: 0.92,
    yeah: 1,
    lol: 1.05,
    meh: 1.2,
    cringe: 1.35,
    taxing: 1.5,
    normal: 1
  };
  const m = (_a = multipliers[reaction]) != null ? _a : 1;
  return Math.max(1, Math.floor(interval * easeFactor * m / 100));
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
function pickNoteToReview(notes2, settings) {
  const rand = Math.random();
  if (rand < 0.5) {
    const recentUnreviewed = notes2.filter((n) => {
      const age = daysBetween(n.createdOn, today());
      return n.interval > 0 && n.noteState === "normal" && age >= 50 && age <= 100 && n.reviewedCount === 0;
    });
    if (recentUnreviewed.length) {
      return recentUnreviewed[Math.floor(Math.random() * recentUnreviewed.length)];
    }
  }
  if (rand < 0.7) {
    const exciting = notes2.filter((n) => noteIsDue(n) && n.noteState === "exciting");
    const weights2 = exciting.map((n) => Math.pow(Math.max(1, numDaysOverdue(n)), 2));
    const picked = weightedRandom(exciting, weights2);
    if (picked) return picked;
  }
  const allDue = notes2.filter((n) => noteIsDue(n));
  const weights = allDue.map((n) => Math.pow(Math.max(1, numDaysOverdue(n)), 2) * folderWeight(n.filepath, settings));
  return weightedRandom(allDue, weights);
}

// src/sync.ts
async function sha1(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
function stripFrontmatter(content) {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  return end === -1 ? content : content.slice(end + 4).trimStart();
}
async function syncVault(vault, data, settings) {
  const files = vault.getMarkdownFiles().filter((f) => {
    if (settings.sourceScope === "folder") {
      return settings.sourceFolders.some((e) => f.path.startsWith(e.path + "/"));
    }
    return true;
  });
  const currentHashes = /* @__PURE__ */ new Set();
  for (const file of files) {
    const raw = await vault.read(file);
    const body = stripFrontmatter(raw);
    const hash = await sha1(body);
    currentHashes.add(hash);
    if (data.notes[hash] && data.notes[hash].interval >= 0) {
      data.notes[hash].filepath = file.path;
    } else if (data.notes[hash]) {
      data.notes[hash] = {
        ...data.notes[hash],
        filepath: file.path,
        interval: settings.initialInterval,
        easeFactor: settings.defaultEaseFactor,
        lastReviewedOn: daysAgo(settings.initialInterval),
        reviewedCount: 0,
        noteState: "normal"
      };
    } else {
      data.notes[hash] = {
        sha1sum: hash,
        filepath: file.path,
        easeFactor: settings.defaultEaseFactor,
        interval: settings.initialInterval,
        lastReviewedOn: daysAgo(settings.initialInterval),
        createdOn: today(),
        reviewedCount: 0,
        noteState: "normal"
      };
    }
  }
  for (const [hash, note] of Object.entries(data.notes)) {
    if (!currentHashes.has(hash) && note.interval >= 0) {
      data.notes[hash].interval = -1;
    }
  }
  const activeNotes = Object.values(data.notes).filter((n) => n.interval >= 0);
  const todayStr = today();
  const lastEntry = data.reviewLoadLog[data.reviewLoadLog.length - 1];
  if (lastEntry && lastEntry.timestamp.startsWith(todayStr)) {
    lastEntry.numNotes = activeNotes.length;
    lastEntry.numDue = activeNotes.filter((n) => noteIsDue(n)).length;
  } else {
    data.reviewLoadLog.push({
      timestamp: todayStr,
      numNotes: activeNotes.length,
      numDue: activeNotes.filter((n) => noteIsDue(n)).length
    });
    if (data.reviewLoadLog.length > 2e3) {
      data.reviewLoadLog = data.reviewLoadLog.slice(-2e3);
    }
  }
  return data;
}
function daysAgo(n) {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// src/ReviewModal.ts
var import_obsidian = require("obsidian");

// src/frontmatter.ts
async function writeFrontmatterReaction(app, filepath, state) {
  const file = app.vault.getAbstractFileByPath(filepath);
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm["note_mood"] = state;
  });
}

// src/ReviewModal.ts
var ReviewModal = class extends import_obsidian.Modal {
  constructor(app, plugin, note) {
    super(app);
    this.plugin = plugin;
    this.note = note;
    this.renderComponent = null;
  }
  async onOpen() {
    await this.render();
  }
  async render() {
    const { contentEl } = this;
    contentEl.empty();
    if (this.renderComponent) {
      this.renderComponent.unload();
    }
    this.renderComponent = new import_obsidian.Component();
    this.renderComponent.load();
    const title = this.note.filepath.split("/").pop().replace(/\.md$/, "");
    const titleEl = contentEl.createEl("h1", { text: title, cls: "spaced-note-title" });
    titleEl.style.cursor = "pointer";
    titleEl.addEventListener("click", async () => {
      const file2 = this.app.vault.getAbstractFileByPath(this.note.filepath);
      if (!file2) return;
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.openFile(file2);
    });
    const allNotes = Object.values(this.plugin.data.notes).filter((n) => n.interval >= 0);
    const dueCount = allNotes.filter((n) => noteIsDue(n)).length;
    contentEl.createEl("div", {
      text: `${dueCount} note${dueCount !== 1 ? "s" : ""} due`,
      cls: "spaced-due-count"
    });
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath);
    if (!file) {
      contentEl.createEl("p", { text: `File not found: ${this.note.filepath}` });
      return;
    }
    const content = await this.app.vault.read(file);
    const renderEl = contentEl.createDiv({ cls: "spaced-note-content" });
    await import_obsidian.MarkdownRenderer.render(
      this.app,
      content,
      renderEl,
      this.note.filepath,
      this.renderComponent
      // ← was: this
    );
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    this.addBtn(btnRow, "Exciting", "exciting", () => this.react("exciting"));
    this.addBtn(btnRow, "Interesting", "interesting", () => this.react("interesting"));
    this.addBtn(btnRow, "Yeah", "yeah", () => this.react("yeah"));
    this.addBtn(btnRow, "Lol", "lol", () => this.react("lol"));
    this.addBtn(btnRow, "Meh", "meh", () => this.react("meh"));
    this.addBtn(btnRow, "Cringe", "cringe", () => this.react("cringe"));
    this.addBtn(btnRow, "Taxing", "taxing", () => this.react("taxing"));
    this.addBtn(btnRow, "Revisit soon", "revisit", () => this.react("revisit"));
    this.addBtn(btnRow, "Route \u2192", "route", () => this.routeNote());
    this.addBtn(btnRow, "Skip", "skip", () => this.react("skip"));
    this.addBtn(btnRow, "Archive", "archive", () => this.archiveNote());
    this.addBtn(btnRow, "Delete", "delete", () => this.deleteNote());
    const editBtn = btnRow.createEl("button", { text: "Edit", cls: "spaced-btn spaced-btn-edit" });
    editBtn.addEventListener("click", async () => {
      const file2 = this.app.vault.getAbstractFileByPath(this.note.filepath);
      if (!file2) return;
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.openFile(file2);
    });
  }
  addBtn(container, label, cls, cb) {
    const btn = container.createEl("button", {
      text: label,
      cls: `spaced-btn spaced-btn-${cls}`
    });
    btn.addEventListener("click", cb);
  }
  async react(reaction) {
    const newNoteState = reaction === "skip" ? this.note.noteState : reaction;
    const newInterval = nextInterval(this.note, reaction);
    this.plugin.data.notes[this.note.sha1sum] = {
      ...this.note,
      interval: newInterval,
      lastReviewedOn: today(),
      reviewedCount: this.note.reviewedCount + 1,
      noteState: newNoteState
    };
    await saveStore(this.plugin, this.plugin.data);
    await writeFrontmatterReaction(this.app, this.note.filepath, newNoteState);
    await this.showNextNote();
  }
  async routeNote() {
    const filename = this.note.filepath.split("/").pop();
    const dest = `${this.plugin.settings.evergreenFolder}/${filename}`;
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath);
    await this.app.vault.rename(file, dest);
    await saveStore(this.plugin, this.plugin.data);
    await writeFrontmatterReaction(this.app, dest, this.note.noteState);
    await this.showNextNote();
  }
  async archiveNote() {
    this.plugin.data.notes[this.note.sha1sum].interval = -1;
    await saveStore(this.plugin, this.plugin.data);
    await this.showNextNote();
  }
  async showNextNote() {
    const allNotes = Object.values(this.plugin.data.notes).filter((n) => n.interval >= 0);
    const next = pickNoteToReview(notes, this.plugin.settings);
    if (!next) {
      const { contentEl } = this;
      contentEl.empty();
      contentEl.createEl("h3", { text: "All caught up!" });
      contentEl.createEl("p", { text: "No more notes due. Close this modal to exit." });
      return;
    }
    this.note = next;
    await this.render();
  }
  async deleteNote() {
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath);
    if (file) {
      await this.app.vault.delete(file);
    }
    delete this.plugin.data.notes[this.note.sha1sum];
    await saveStore(this.plugin, this.plugin.data);
    await this.showNextNote();
  }
  onClose() {
    if (this.renderComponent) {
      this.renderComponent.unload();
      this.renderComponent = null;
    }
    this.contentEl.empty();
  }
};

// src/SettingsTab.ts
var import_obsidian2 = require("obsidian");
var SpacedEverythingSettingsTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Spaced Everything" });
    new import_obsidian2.Setting(containerEl).setName("Source scope").setDesc("Process notes from the whole vault or a specific folder.").addDropdown(
      (drop) => drop.addOption("vault", "Whole vault").addOption("folder", "Specific folder").setValue(this.plugin.settings.sourceScope).onChange(async (v) => {
        this.plugin.settings.sourceScope = v;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    const folders = this.app.vault.getAllFolders().map((f) => f.path).sort();
    if (this.plugin.settings.sourceScope === "folder") {
      for (const entry of this.plugin.settings.sourceFolders) {
        new import_obsidian2.Setting(containerEl).setName(entry.path).setDesc("Review quota weight (%). 100 = default, lower = appears less often.").addSlider(
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
      let pendingFolder = "";
      new import_obsidian2.Setting(containerEl).setName("Add source folder").addDropdown((drop) => {
        drop.addOption("", "\u2014 select a folder \u2014");
        for (const f of folders) {
          if (!this.plugin.settings.sourceFolders.some((e) => e.path === f)) {
            drop.addOption(f, f);
          }
        }
        drop.onChange((v) => {
          pendingFolder = v;
        });
      }).addButton(
        (btn) => btn.setButtonText("Add").onClick(async () => {
          if (pendingFolder && !this.plugin.settings.sourceFolders.some((e) => e.path === pendingFolder)) {
            this.plugin.settings.sourceFolders.push({ path: pendingFolder, weight: 100 });
            await this.plugin.saveSettings();
            this.display();
          }
        })
      );
    }
    new import_obsidian2.Setting(containerEl).setName("Evergreen destination folder").setDesc("Where routed notes are moved to.").addDropdown((drop) => {
      drop.addOption("", "\u2014 select a folder \u2014");
      for (const folder of folders) {
        drop.addOption(folder, folder);
      }
      drop.setValue(this.plugin.settings.evergreenFolder).onChange(async (v) => {
        this.plugin.settings.evergreenFolder = v;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian2.Setting(containerEl).setName("Initial interval (days)").setDesc("How many days before a new note first appears for review.").addText(
      (text) => text.setValue(String(this.plugin.settings.initialInterval)).onChange(async (v) => {
        const n = parseInt(v);
        if (!isNaN(n) && n > 0) {
          this.plugin.settings.initialInterval = n;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Default ease factor (%)").setDesc("Multiplier for interval growth. 300 = 3x per review cycle.").addText(
      (text) => text.setValue(String(this.plugin.settings.defaultEaseFactor)).onChange(async (v) => {
        const n = parseInt(v);
        if (!isNaN(n) && n > 0) {
          this.plugin.settings.defaultEaseFactor = n;
          await this.plugin.saveSettings();
        }
      })
    );
    containerEl.createEl("h3", { text: "Danger Zone" });
    new import_obsidian2.Setting(containerEl).setName("Reset all scheduling data").setDesc(
      "Permanently deletes all review history, intervals, and note states. Your note files are not affected. This cannot be undone."
    ).addButton(
      (btn) => btn.setButtonText("Reset data").setWarning().onClick(() => new ResetConfirmModal(this.app, this.plugin).open())
    );
  }
};
var ResetConfirmModal = class extends import_obsidian2.Modal {
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

// src/DueNotesView.ts
var import_obsidian3 = require("obsidian");
var DUE_NOTES_VIEW_TYPE = "spaced-everything-due-notes";
var DueNotesView = class extends import_obsidian3.ItemView {
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
    var _a;
    const { contentEl } = this;
    contentEl.empty();
    const allNotes = Object.values(this.plugin.data.notes).filter((n) => n.interval >= 0);
    const dueNotes = allNotes.filter((n) => noteIsDue(n)).sort((a, b) => numDaysOverdue(b) - numDaysOverdue(a));
    contentEl.createEl("h4", { text: "Due Notes" });
    if (dueNotes.length === 0) {
      contentEl.createEl("p", { text: "All caught up! No notes due.", cls: "spaced-empty" });
      return;
    }
    contentEl.createEl("p", {
      text: `${dueNotes.length} note${dueNotes.length !== 1 ? "s" : ""} due`,
      cls: "spaced-due-count"
    });
    const list = contentEl.createDiv({ cls: "spaced-due-list" });
    for (const note of dueNotes) {
      const row = list.createDiv({ cls: "spaced-due-row" });
      const info = row.createDiv({ cls: "spaced-due-info" });
      const filename = (_a = note.filepath.split("/").pop()) != null ? _a : note.filepath;
      info.createEl("span", { text: filename, cls: "spaced-due-filename" });
      info.createEl("span", {
        text: ` \xB7 ${numDaysOverdue(note)}d overdue \xB7 ${note.noteState}`,
        cls: "spaced-due-meta"
      });
      const btn = row.createEl("button", { text: "Review", cls: "spaced-btn" });
      btn.addEventListener("click", () => {
        new ReviewModal(this.app, this.plugin, note).open();
      });
    }
  }
};

// src/StatsView.ts
var import_obsidian4 = require("obsidian");
var STATS_VIEW_TYPE = "spaced-everything-stats";
var StatsView = class extends import_obsidian4.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
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
  async onOpen() {
    await this.render();
  }
  async render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("spaced-stats-view");
    const data = this.plugin.data;
    const activeNotes = Object.values(data.notes).filter((n) => n.interval >= 0);
    const dueNotes = activeNotes.filter((n) => noteIsDue(n));
    const avgInterval = activeNotes.length > 0 ? Math.round(activeNotes.reduce((sum, n) => sum + n.interval, 0) / activeNotes.length) : 0;
    contentEl.createEl("h4", { text: "Summary" });
    const summaryEl = contentEl.createDiv({ cls: "spaced-stats-summary" });
    this.addStat(summaryEl, "Active notes", String(activeNotes.length));
    this.addStat(summaryEl, "Due now", String(dueNotes.length));
    this.addStat(summaryEl, "Avg interval", `${avgInterval} days`);
    contentEl.createEl("h4", { text: "Upcoming review load" });
    const todayStr = today();
    const labels = ["Overdue", "Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"];
    const counts = new Array(9).fill(0);
    for (const note of activeNotes) {
      const daysUntilDue = note.interval - daysBetween(note.lastReviewedOn, todayStr);
      if (daysUntilDue <= 0) {
        counts[0]++;
      } else {
        const week = Math.ceil(daysUntilDue / 7);
        if (week <= 8) counts[week]++;
      }
    }
    const forecastEl = contentEl.createDiv({ cls: "spaced-bar-chart" });
    const maxForecast = Math.max(...counts, 1);
    for (let i = 0; i < labels.length; i++) {
      this.addBarRow(forecastEl, labels[i], counts[i], maxForecast, i === 0);
    }
    const log = data.reviewLoadLog;
    if (log.length > 0) {
      contentEl.createEl("h4", { text: "Due notes over time (last 30 syncs)" });
      const timeseriesEl = contentEl.createDiv({ cls: "spaced-bar-chart" });
      const recent = log.slice(-30);
      const maxDue = Math.max(...recent.map((e) => e.numDue), 1);
      for (const entry of recent) {
        const label = entry.timestamp.slice(5, 10);
        this.addBarRow(timeseriesEl, label, entry.numDue, maxDue, false);
      }
    } else {
      contentEl.createEl("p", {
        text: "No sync history yet. Run 'Sync vault' to start logging.",
        cls: "spaced-muted"
      });
    }
  }
  addStat(container, label, value) {
    const row = container.createDiv({ cls: "spaced-stat-row" });
    row.createSpan({ text: label, cls: "spaced-stat-label" });
    row.createSpan({ text: value, cls: "spaced-stat-value" });
  }
  /**
   * @param accent  if true, uses --color-red for the bar fill (highlights overdue)
   */
  addBarRow(container, label, value, max, accent) {
    const row = container.createDiv({ cls: "spaced-bar-row" });
    row.createSpan({ text: label, cls: "spaced-bar-label" });
    const track = row.createDiv({ cls: "spaced-bar-track" });
    const fill = track.createDiv({ cls: accent ? "spaced-bar-fill spaced-bar-fill-accent" : "spaced-bar-fill" });
    fill.style.width = `${Math.round(value / max * 100)}%`;
    row.createSpan({ text: String(value), cls: "spaced-bar-value" });
  }
  onClose() {
    return Promise.resolve();
  }
};

// src/main.ts
var SpacedEverythingPlugin = class extends import_obsidian5.Plugin {
  async onload() {
    await this.loadSettings();
    this.data = await loadStore(this);
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar();
    this.registerView(DUE_NOTES_VIEW_TYPE, (leaf) => new DueNotesView(leaf, this));
    this.addRibbonIcon("clock", "Show due notes", () => this.activateDueNotesView());
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
        this.data = await syncVault(this.app.vault, this.data, this.settings);
        await saveStore(this, this.data);
        this.updateStatusBar();
        await this.refreshDueNotesView();
        await this.refreshStatsView;
        const notes2 = Object.values(this.data.notes).filter((n) => n.interval >= 0);
        const note = pickNoteToReview(notes2, this.settings);
        if (!note) {
          new import_obsidian5.Notice("No notes due!");
          return;
        }
        new ReviewModal(this.app, this, note).open();
      }
    });
    this.addCommand({
      id: "show-stats",
      name: "Show stats",
      callback: () => this.activateStatsView()
    });
    this.addCommand({
      id: "sync-vault",
      name: "Sync vault with schedule",
      callback: async () => {
        this.data = await syncVault(this.app.vault, this.data, this.settings);
        await saveStore(this, this.data);
        this.updateStatusBar();
        await this.refreshDueNotesView();
        await this.refreshStatsView;
      }
    });
    this.registerView(STATS_VIEW_TYPE, (leaf) => new StatsView(leaf, this));
    this.addRibbonIcon("bar-chart", "Show stats", () => this.activateStatsView());
    this.registerEvent(
      this.app.vault.on("modify", async (file) => {
        if (file instanceof import_obsidian5.TFile && file.extension === "md") {
          this.data = await syncVault(this.app.vault, this.data, this.settings);
          await saveStore(this, this.data);
          this.updateStatusBar();
          await this.refreshDueNotesView();
          await this.refreshStatsView;
        }
      })
    );
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
  updateStatusBar() {
    const allNotes = Object.values(this.data.notes).filter((n) => n.interval >= 0);
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
    this.data = { notes: {}, reviewLoadLog: [] };
    await saveStore(this, this.data);
    this.updateStatusBar();
    await this.refreshDueNotesView();
    await this.refreshStatsView;
    new import_obsidian5.Notice("All scheduling data has been reset.");
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL3R5cGVzLnRzIiwgInNyYy9zdG9yZS50cyIsICJzcmMvc2NoZWR1bGVyLnRzIiwgInNyYy9zeW5jLnRzIiwgInNyYy9SZXZpZXdNb2RhbC50cyIsICJzcmMvZnJvbnRtYXR0ZXIudHMiLCAic3JjL1NldHRpbmdzVGFiLnRzIiwgInNyYy9EdWVOb3Rlc1ZpZXcudHMiLCAic3JjL1N0YXRzVmlldy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLy8gXHUyMTkwIFBsdWdpbiBlbnRyeSBwb2ludCwgcmVnaXN0ZXJzIGNvbW1hbmRzICYgZXZlbnRzXHJcblxyXG5pbXBvcnQgeyBQbHVnaW4sIFRGaWxlLCBOb3RpY2V9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3MsIERFRkFVTFRfU0VUVElOR1MsIFBsdWdpbkRhdGEgfSBmcm9tIFwiLi90eXBlc1wiO1xyXG5pbXBvcnQgeyBsb2FkU3RvcmUsIHNhdmVTdG9yZSB9IGZyb20gXCIuL3N0b3JlXCI7XHJcbmltcG9ydCB7IHN5bmNWYXVsdCB9IGZyb20gXCIuL3N5bmNcIjtcclxuaW1wb3J0IHsgcGlja05vdGVUb1Jldmlldywgbm90ZUlzRHVlfSBmcm9tIFwiLi9zY2hlZHVsZXJcIjtcclxuaW1wb3J0IHsgUmV2aWV3TW9kYWwgfSBmcm9tIFwiLi9SZXZpZXdNb2RhbFwiO1xyXG5pbXBvcnQgeyBTcGFjZWRFdmVyeXRoaW5nU2V0dGluZ3NUYWIgfSBmcm9tIFwiLi9TZXR0aW5nc1RhYlwiO1xyXG5pbXBvcnQgeyBEdWVOb3Rlc1ZpZXcsIERVRV9OT1RFU19WSUVXX1RZUEUgfSBmcm9tIFwiLi9EdWVOb3Rlc1ZpZXdcIjtcclxuaW1wb3J0IHsgU3RhdHNWaWV3LCBTVEFUU19WSUVXX1RZUEUgfSBmcm9tIFwiLi9TdGF0c1ZpZXdcIjsgIFxyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XHJcbiAgc2V0dGluZ3M6IFNwYWNlZEV2ZXJ5dGhpbmdTZXR0aW5ncztcclxuICBkYXRhOiBQbHVnaW5EYXRhO1xyXG5cclxuICBwcml2YXRlIHN0YXR1c0Jhckl0ZW06IEhUTUxFbGVtZW50O1xyXG5cclxuICBhc3luYyBvbmxvYWQoKSB7XHJcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xyXG4gICAgdGhpcy5kYXRhID0gYXdhaXQgbG9hZFN0b3JlKHRoaXMpO1xyXG5cclxuICAgIHRoaXMuc3RhdHVzQmFySXRlbSA9IHRoaXMuYWRkU3RhdHVzQmFySXRlbSgpO1xyXG4gICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcclxuXHJcbiAgICB0aGlzLnJlZ2lzdGVyVmlldyhEVUVfTk9URVNfVklFV19UWVBFLCAobGVhZikgPT4gbmV3IER1ZU5vdGVzVmlldyhsZWFmLCB0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5hZGRSaWJib25JY29uKFwiY2xvY2tcIiwgXCJTaG93IGR1ZSBub3Rlc1wiLCAoKSA9PiB0aGlzLmFjdGl2YXRlRHVlTm90ZXNWaWV3KCkpO1xyXG5cclxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgIGlkOiBcInNob3ctZHVlLW5vdGVzXCIsXHJcbiAgICAgIG5hbWU6IFwiU2hvdyBkdWUgbm90ZXNcIixcclxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVEdWVOb3Rlc1ZpZXcoKSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgU3BhY2VkRXZlcnl0aGluZ1NldHRpbmdzVGFiKHRoaXMuYXBwLCB0aGlzKSk7XHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6IFwicmV2aWV3LW5leHQtbm90ZVwiLFxyXG4gICAgICBuYW1lOiBcIlJldmlldyBuZXh0IG5vdGVcIixcclxuICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcclxuICAgICAgICB0aGlzLmRhdGEgPSBhd2FpdCBzeW5jVmF1bHQodGhpcy5hcHAudmF1bHQsIHRoaXMuZGF0YSwgdGhpcy5zZXR0aW5ncyk7XHJcbiAgICAgICAgYXdhaXQgc2F2ZVN0b3JlKHRoaXMsIHRoaXMuZGF0YSk7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hEdWVOb3Rlc1ZpZXcoKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hTdGF0c1ZpZXdcclxuICAgICAgICBjb25zdCBub3RlcyA9IE9iamVjdC52YWx1ZXModGhpcy5kYXRhLm5vdGVzKS5maWx0ZXIoKG4pID0+IG4uaW50ZXJ2YWwgPj0gMCk7XHJcbiAgICAgICAgY29uc3Qgbm90ZSA9IHBpY2tOb3RlVG9SZXZpZXcobm90ZXMsIHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgICAgIGlmICghbm90ZSkge1xyXG4gICAgICAgICAgbmV3IE5vdGljZShcIk5vIG5vdGVzIGR1ZSFcIik7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG5ldyBSZXZpZXdNb2RhbCh0aGlzLmFwcCwgdGhpcywgbm90ZSkub3BlbigpO1xyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6IFwic2hvdy1zdGF0c1wiLFxyXG4gICAgICBuYW1lOiBcIlNob3cgc3RhdHNcIixcclxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVTdGF0c1ZpZXcoKSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgIGlkOiBcInN5bmMtdmF1bHRcIixcclxuICAgICAgbmFtZTogXCJTeW5jIHZhdWx0IHdpdGggc2NoZWR1bGVcIixcclxuICAgICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcclxuICAgICAgICB0aGlzLmRhdGEgPSBhd2FpdCBzeW5jVmF1bHQodGhpcy5hcHAudmF1bHQsIHRoaXMuZGF0YSwgdGhpcy5zZXR0aW5ncyk7XHJcbiAgICAgICAgYXdhaXQgc2F2ZVN0b3JlKHRoaXMsIHRoaXMuZGF0YSk7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNCYXIoKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hEdWVOb3Rlc1ZpZXcoKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hTdGF0c1ZpZXdcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KFNUQVRTX1ZJRVdfVFlQRSwgKGxlYWYpID0+IG5ldyBTdGF0c1ZpZXcobGVhZiwgdGhpcykpO1xyXG4gICAgdGhpcy5hZGRSaWJib25JY29uKFwiYmFyLWNoYXJ0XCIsIFwiU2hvdyBzdGF0c1wiLCAoKSA9PiB0aGlzLmFjdGl2YXRlU3RhdHNWaWV3KCkpO1xyXG5cclxuICAgIC8vIEF1dG8tc3luYyBvbiBmaWxlIG1vZGlmeVxyXG4gICAgdGhpcy5yZWdpc3RlckV2ZW50KFxyXG4gICAgICB0aGlzLmFwcC52YXVsdC5vbihcIm1vZGlmeVwiLCBhc3luYyAoZmlsZSkgPT4ge1xyXG4gICAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUgJiYgZmlsZS5leHRlbnNpb24gPT09IFwibWRcIikge1xyXG4gICAgICAgICAgdGhpcy5kYXRhID0gYXdhaXQgc3luY1ZhdWx0KHRoaXMuYXBwLnZhdWx0LCB0aGlzLmRhdGEsIHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgICAgICAgYXdhaXQgc2F2ZVN0b3JlKHRoaXMsIHRoaXMuZGF0YSk7XHJcbiAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0JhcigpO1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoRHVlTm90ZXNWaWV3KCk7XHJcbiAgICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hTdGF0c1ZpZXdcclxuICAgICAgICB9XHJcbiAgICAgIH0pLFxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcclxuICAgIGNvbnN0IHNhdmVkID0gYXdhaXQgdGhpcy5sb2FkRGF0YSgpO1xyXG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIHNhdmVkPy5zZXR0aW5ncyA/PyB7fSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7XHJcbiAgICBjb25zdCBjdXJyZW50ID0gKGF3YWl0IHRoaXMubG9hZERhdGEoKSkgPz8ge307XHJcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHsgLi4uY3VycmVudCwgc2V0dGluZ3M6IHRoaXMuc2V0dGluZ3MgfSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVTdGF0dXNCYXIoKSB7XHJcbiAgICBjb25zdCBhbGxOb3RlcyA9IE9iamVjdC52YWx1ZXModGhpcy5kYXRhLm5vdGVzKS5maWx0ZXIoKG4pID0+IG4uaW50ZXJ2YWwgPj0gMCk7XHJcbiAgICBjb25zdCBkdWVDb3VudCA9IGFsbE5vdGVzLmZpbHRlcigobikgPT4gbm90ZUlzRHVlKG4pKS5sZW5ndGg7XHJcbiAgICB0aGlzLnN0YXR1c0Jhckl0ZW0uc2V0VGV4dChgJHtkdWVDb3VudH0gZHVlYCk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBhY3RpdmF0ZUR1ZU5vdGVzVmlldygpIHtcclxuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcclxuICAgIGxldCBsZWFmID0gd29ya3NwYWNlLmdldExlYXZlc09mVHlwZShEVUVfTk9URVNfVklFV19UWVBFKVswXTtcclxuICAgIGlmICghbGVhZikge1xyXG4gICAgICBsZWFmID0gd29ya3NwYWNlLmdldFJpZ2h0TGVhZihmYWxzZSkhO1xyXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7IHR5cGU6IERVRV9OT1RFU19WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KTtcclxuICAgIH1cclxuICAgIHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgcmVmcmVzaER1ZU5vdGVzVmlldygpIHtcclxuICAgIGZvciAoY29uc3QgbGVhZiBvZiB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKERVRV9OT1RFU19WSUVXX1RZUEUpKSB7XHJcbiAgICAgIGlmIChsZWFmLnZpZXcgaW5zdGFuY2VvZiBEdWVOb3Rlc1ZpZXcpIHtcclxuICAgICAgICBhd2FpdCBsZWFmLnZpZXcucmVuZGVyKCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIGFjdGl2YXRlU3RhdHNWaWV3KCkge1xyXG4gICAgY29uc3QgeyB3b3Jrc3BhY2UgfSA9IHRoaXMuYXBwO1xyXG4gICAgbGV0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFNUQVRTX1ZJRVdfVFlQRSlbMF07XHJcbiAgICBpZiAoIWxlYWYpIHtcclxuICAgICAgbGVhZiA9IHdvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpITtcclxuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBTVEFUU19WSUVXX1RZUEUsIGFjdGl2ZTogdHJ1ZSB9KTtcclxuICAgIH1cclxuICAgIHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgcmVmcmVzaFN0YXRzVmlldygpIHtcclxuICAgIGZvciAoY29uc3QgbGVhZiBvZiB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFNUQVRTX1ZJRVdfVFlQRSkpIHtcclxuICAgICAgaWYgKGxlYWYudmlldyBpbnN0YW5jZW9mIFN0YXRzVmlldykge1xyXG4gICAgICAgIGF3YWl0IGxlYWYudmlldy5yZW5kZXIoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXN5bmMgcmVzZXREYXRhKCkge1xyXG4gICAgdGhpcy5kYXRhID0geyBub3Rlczoge30sIHJldmlld0xvYWRMb2c6IFtdIH07XHJcbiAgICBhd2FpdCBzYXZlU3RvcmUodGhpcywgdGhpcy5kYXRhKTtcclxuICAgIHRoaXMudXBkYXRlU3RhdHVzQmFyKCk7XHJcbiAgICBhd2FpdCB0aGlzLnJlZnJlc2hEdWVOb3Rlc1ZpZXcoKTtcclxuICAgIGF3YWl0IHRoaXMucmVmcmVzaFN0YXRzVmlld1xyXG4gICAgbmV3IE5vdGljZShcIkFsbCBzY2hlZHVsaW5nIGRhdGEgaGFzIGJlZW4gcmVzZXQuXCIpO1xyXG4gIH1cclxufSIsICIvL1x1MjE5MCBOb3RlUmVjb3JkLCBQbHVnaW5EYXRhLCBTZXR0aW5ncyBpbnRlcmZhY2VzXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE5vdGVSZWNvcmQge1xyXG4gIHNoYTFzdW06IHN0cmluZztcclxuICBmaWxlcGF0aDogc3RyaW5nO1xyXG4gIGVhc2VGYWN0b3I6IG51bWJlcjsgLy8gcGVyY2VudGFnZSwgZS5nLiAzMDAgPSAzMDAlXHJcbiAgaW50ZXJ2YWw6IG51bWJlcjsgLy8gZGF5czsgLTEgPSBzb2Z0LWRlbGV0ZWQvYXJjaGl2ZWRcclxuICBsYXN0UmV2aWV3ZWRPbjogc3RyaW5nOyAvLyBJU08gZGF0ZSBcIllZWVktTU0tRERcIlxyXG4gIGNyZWF0ZWRPbjogc3RyaW5nOyAvLyBJU08gZGF0ZSBcIllZWVktTU0tRERcIlxyXG4gIHJldmlld2VkQ291bnQ6IG51bWJlcjtcclxuICBub3RlU3RhdGU6IE5vdGVTdGF0ZTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTb3VyY2VGb2xkZXIge1xyXG4gIHBhdGg6IHN0cmluZztcclxuICB3ZWlnaHQ6IG51bWJlcjsgLy8gcGVyY2VudGFnZSwgZS5nLiAxMDAgPSBub3JtYWwsIDUwID0gaGFsZiB3ZWlnaHRcclxufSAgXHJcblxyXG5leHBvcnQgdHlwZSBOb3RlU3RhdGUgPSAgXHJcbiAgfCBcIm5vcm1hbFwiICAgICAgIC8vIGludGVydmFsICogZWFzZUZhY3RvciAqIDEuMCAgLyAxMDAgXHUyMDE0IG5vIHJlYWN0aW9uLCBkZWZhdWx0ICBcclxuICB8IFwiZXhjaXRpbmdcIiAgICAgLy8gaW50ZXJ2YWwgKiBlYXNlRmFjdG9yICogMC44MyAvIDEwMCBcdTIwMTQgc2VlIG1vcmUgb2Z0ZW47IGdldHMgcHJpb3JpdHkgaW4gc2VsZWN0aW9uICBcclxuICB8IFwiaW50ZXJlc3RpbmdcIiAgLy8gaW50ZXJ2YWwgKiBlYXNlRmFjdG9yICogMC45MiAvIDEwMCBcdTIwMTQgc2xpZ2h0bHkgbW9yZSBvZnRlbiAgXHJcbiAgfCBcInllYWhcIiAgICAgICAgIC8vIGludGVydmFsICogZWFzZUZhY3RvciAqIDEuMCAgLyAxMDAgXHUyMDE0IG5ldXRyYWwgYWdyZWVtZW50ICBcclxuICB8IFwibG9sXCIgICAgICAgICAgLy8gaW50ZXJ2YWwgKiBlYXNlRmFjdG9yICogMS4wNSAvIDEwMCBcdTIwMTQgc2xpZ2h0bHkgbGVzcyBvZnRlbiAgXHJcbiAgfCBcIm1laFwiICAgICAgICAgIC8vIGludGVydmFsICogZWFzZUZhY3RvciAqIDEuMiAgLyAxMDAgXHUyMDE0IGxlc3Mgb2Z0ZW4gIFxyXG4gIHwgXCJjcmluZ2VcIiAgICAgICAvLyBpbnRlcnZhbCAqIGVhc2VGYWN0b3IgKiAxLjM1IC8gMTAwIFx1MjAxNCBsZXNzIG9mdGVuICBcclxuICB8IFwidGF4aW5nXCIgICAgICAgLy8gaW50ZXJ2YWwgKiBlYXNlRmFjdG9yICogMS41ICAvIDEwMCBcdTIwMTQgc2VlIGxlc3Mgb2Z0ZW4gIFxyXG4gIHwgXCJyZXZpc2l0XCI7ICAgICAvLyBpbnRlcnZhbCAqIDAuOSAobm8gZWFzZUZhY3RvcikgICAgIFx1MjAxNCBzZWUgc29vbjsgbWF0Y2hlcyBhZ2Fpbl9pbnRlcnZhbCgpXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBsdWdpbkRhdGEge1xyXG4gIG5vdGVzOiBSZWNvcmQ8c3RyaW5nLCBOb3RlUmVjb3JkPjsgLy8ga2V5ZWQgYnkgc2hhMXN1bVxyXG4gIHJldmlld0xvYWRMb2c6IEFycmF5PHsgdGltZXN0YW1wOiBzdHJpbmc7IG51bU5vdGVzOiBudW1iZXI7IG51bUR1ZTogbnVtYmVyIH0+O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNwYWNlZEV2ZXJ5dGhpbmdTZXR0aW5ncyB7XHJcbiAgc291cmNlU2NvcGU6IFwidmF1bHRcIiB8IFwiZm9sZGVyXCI7XHJcbiAgc291cmNlRm9sZGVyczogU291cmNlRm9sZGVyW107IC8vIFx1MjE5MCB3YXM6IHN0cmluZ1tdXHJcbiAgZXZlcmdyZWVuRm9sZGVyOiBzdHJpbmc7XHJcbiAgaW5pdGlhbEludGVydmFsOiBudW1iZXI7XHJcbiAgZGVmYXVsdEVhc2VGYWN0b3I6IG51bWJlcjtcclxufSAgXHJcblxyXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU3BhY2VkRXZlcnl0aGluZ1NldHRpbmdzID0ge1xyXG4gIHNvdXJjZVNjb3BlOiBcInZhdWx0XCIsXHJcbiAgc291cmNlRm9sZGVyczogW10sXHJcbiAgZXZlcmdyZWVuRm9sZGVyOiBcIkV2ZXJncmVlblwiLFxyXG4gIGluaXRpYWxJbnRlcnZhbDogNTAsXHJcbiAgZGVmYXVsdEVhc2VGYWN0b3I6IDMwMCxcclxufTsiLCAiLy9cdTIxOTAgbG9hZC9zYXZlIHBsdWdpbiBkYXRhIChKU09OKVxyXG5cclxuaW1wb3J0IHsgUGx1Z2luIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFBsdWdpbkRhdGEsIE5vdGVSZWNvcmQgfSBmcm9tIFwiLi90eXBlc1wiO1xyXG5cclxuY29uc3QgRU1QVFlfREFUQTogUGx1Z2luRGF0YSA9IHsgbm90ZXM6IHt9LCByZXZpZXdMb2FkTG9nOiBbXSB9O1xyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRTdG9yZShwbHVnaW46IFBsdWdpbik6IFByb21pc2U8UGx1Z2luRGF0YT4ge1xyXG4gIGNvbnN0IHNhdmVkID0gYXdhaXQgcGx1Z2luLmxvYWREYXRhKCk7XHJcbiAgcmV0dXJuIHNhdmVkPy5wbHVnaW5EYXRhID8/IEVNUFRZX0RBVEE7XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzYXZlU3RvcmUocGx1Z2luOiBQbHVnaW4sIGRhdGE6IFBsdWdpbkRhdGEpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBjdXJyZW50ID0gKGF3YWl0IHBsdWdpbi5sb2FkRGF0YSgpKSA/PyB7fTtcclxuICBhd2FpdCBwbHVnaW4uc2F2ZURhdGEoeyAuLi5jdXJyZW50LCBwbHVnaW5EYXRhOiBkYXRhIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aXZlTm90ZXMoZGF0YTogUGx1Z2luRGF0YSk6IE5vdGVSZWNvcmRbXSB7XHJcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoZGF0YS5ub3RlcykuZmlsdGVyKChuKSA9PiBuLmludGVydmFsID49IDApO1xyXG59IiwgIi8vIERpcmVjdCBwb3J0IG9mIHNwYWNlZF9pbmJveC5weSBzY2hlZHVsaW5nIGxvZ2ljXHJcblxyXG5pbXBvcnQgeyBOb3RlUmVjb3JkLCBOb3RlU3RhdGUsIFNwYWNlZEV2ZXJ5dGhpbmdTZXR0aW5ncyB9IGZyb20gXCIuL3R5cGVzXCI7XHJcblxyXG5mdW5jdGlvbiBmb2xkZXJXZWlnaHQoZmlsZXBhdGg6IHN0cmluZywgc2V0dGluZ3M6IFNwYWNlZEV2ZXJ5dGhpbmdTZXR0aW5ncyk6IG51bWJlciB7XHJcbiAgaWYgKHNldHRpbmdzLnNvdXJjZVNjb3BlICE9PSBcImZvbGRlclwiKSByZXR1cm4gMTtcclxuICBjb25zdCBlbnRyeSA9IHNldHRpbmdzLnNvdXJjZUZvbGRlcnMuZmluZCgoZSkgPT4gZmlsZXBhdGguc3RhcnRzV2l0aChlLnBhdGggKyBcIi9cIikpO1xyXG4gIHJldHVybiBlbnRyeSA/IGVudHJ5LndlaWdodCAvIDEwMCA6IDE7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB0b2RheSgpOiBzdHJpbmcge1xyXG4gIHJldHVybiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZGF5c0JldHdlZW4oYTogc3RyaW5nLCBiOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIHJldHVybiBNYXRoLmZsb29yKChuZXcgRGF0ZShiKS5nZXRUaW1lKCkgLSBuZXcgRGF0ZShhKS5nZXRUaW1lKCkpIC8gODY0MDAwMDApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbnVtRGF5c092ZXJkdWUobm90ZTogTm90ZVJlY29yZCk6IG51bWJlciB7XHJcbiAgaWYgKG5vdGUuaW50ZXJ2YWwgPCAwKSByZXR1cm4gbm90ZS5pbnRlcnZhbDtcclxuICBjb25zdCBkYXlzU2luY2VSZXZpZXdlZCA9IGRheXNCZXR3ZWVuKG5vdGUubGFzdFJldmlld2VkT24sIHRvZGF5KCkpO1xyXG4gIHJldHVybiBkYXlzU2luY2VSZXZpZXdlZCAtIG5vdGUuaW50ZXJ2YWw7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBub3RlSXNEdWUobm90ZTogTm90ZVJlY29yZCk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiBudW1EYXlzT3ZlcmR1ZShub3RlKSA+PSAwO1xyXG59XHJcblxyXG4vLyBNYXBzIHRvIGdvb2RfaW50ZXJ2YWwoKSBpbiBzcGFjZWRfaW5ib3gucHlcclxuZXhwb3J0IGZ1bmN0aW9uIG5leHRJbnRlcnZhbChub3RlOiBOb3RlUmVjb3JkLCByZWFjdGlvbjogTm90ZVN0YXRlIHwgXCJza2lwXCIpOiBudW1iZXIge1xyXG4gIGNvbnN0IHsgaW50ZXJ2YWwsIGVhc2VGYWN0b3IgfSA9IG5vdGU7XHJcbiAgaWYgKHJlYWN0aW9uID09PSBcInNraXBcIikgcmV0dXJuIGludGVydmFsO1xyXG4gIGlmIChyZWFjdGlvbiA9PT0gXCJyZXZpc2l0XCIpIHtcclxuICAgIHJldHVybiBNYXRoLm1heCgxLCBNYXRoLmZsb29yKGludGVydmFsICogMC45KSk7IC8vIG5vIGVhc2VGYWN0b3IgXHUyMDE0IG1hdGNoZXMgYWdhaW5faW50ZXJ2YWwoKVxyXG4gIH1cclxuICBjb25zdCBtdWx0aXBsaWVyczogUGFydGlhbDxSZWNvcmQ8Tm90ZVN0YXRlLCBudW1iZXI+PiA9IHtcclxuICAgIGV4Y2l0aW5nOiAwLjgzLFxyXG4gICAgaW50ZXJlc3Rpbmc6IDAuOTIsXHJcbiAgICB5ZWFoOiAxLjAsXHJcbiAgICBsb2w6IDEuMDUsXHJcbiAgICBtZWg6IDEuMixcclxuICAgIGNyaW5nZTogMS4zNSxcclxuICAgIHRheGluZzogMS41LFxyXG4gICAgbm9ybWFsOiAxLjAsXHJcbiAgfTtcclxuICBjb25zdCBtID0gbXVsdGlwbGllcnNbcmVhY3Rpb25dID8/IDEuMDtcclxuICByZXR1cm4gTWF0aC5tYXgoMSwgTWF0aC5mbG9vcigoaW50ZXJ2YWwgKiBlYXNlRmFjdG9yICogbSkgLyAxMDApKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldER1ZU5vdGVzKG5vdGVzOiBOb3RlUmVjb3JkW10pOiBOb3RlUmVjb3JkW10ge1xyXG4gIHJldHVybiBub3Rlcy5maWx0ZXIobm90ZUlzRHVlKTtcclxufVxyXG5cclxuLy8gV2VpZ2h0ZWQgcmFuZG9tIHNlbGVjdGlvbiBcdTIwMTQgcG9ydCBvZiBnZXRfZXhjaXRpbmdfbm90ZSAvIGdldF9hbGxfb3RoZXJfbm90ZVxyXG5leHBvcnQgZnVuY3Rpb24gd2VpZ2h0ZWRSYW5kb208VD4oY2FuZGlkYXRlczogVFtdLCB3ZWlnaHRzOiBudW1iZXJbXSk6IFQgfCBudWxsIHtcclxuICBpZiAoIWNhbmRpZGF0ZXMubGVuZ3RoKSByZXR1cm4gbnVsbDtcclxuICBjb25zdCB0b3RhbCA9IHdlaWdodHMucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMCk7XHJcbiAgbGV0IHIgPSBNYXRoLnJhbmRvbSgpICogdG90YWw7XHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjYW5kaWRhdGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICByIC09IHdlaWdodHNbaV07XHJcbiAgICBpZiAociA8PSAwKSByZXR1cm4gY2FuZGlkYXRlc1tpXTtcclxuICB9XHJcbiAgcmV0dXJuIGNhbmRpZGF0ZXNbY2FuZGlkYXRlcy5sZW5ndGggLSAxXTtcclxufVxyXG5cclxuLy8gUG9ydCBvZiBwaWNrX25vdGVfdG9fcmV2aWV3KClcclxuZXhwb3J0IGZ1bmN0aW9uIHBpY2tOb3RlVG9SZXZpZXcoXHJcbiAgbm90ZXM6IE5vdGVSZWNvcmRbXSxcclxuICBzZXR0aW5nczogU3BhY2VkRXZlcnl0aGluZ1NldHRpbmdzLCBcclxuKTogTm90ZVJlY29yZCB8IG51bGwge1xyXG4gIGNvbnN0IHJhbmQgPSBNYXRoLnJhbmRvbSgpO1xyXG5cclxuICAvLyA1MCUgY2hhbmNlOiByZWNlbnRseS1jcmVhdGVkIHVucmV2aWV3ZWQgbm90ZVxyXG4gIGlmIChyYW5kIDwgMC41KSB7XHJcbiAgICBjb25zdCByZWNlbnRVbnJldmlld2VkID0gbm90ZXMuZmlsdGVyKChuKSA9PiB7XHJcbiAgICAgIGNvbnN0IGFnZSA9IGRheXNCZXR3ZWVuKG4uY3JlYXRlZE9uLCB0b2RheSgpKTtcclxuICAgICAgcmV0dXJuIG4uaW50ZXJ2YWwgPiAwICYmIG4ubm90ZVN0YXRlID09PSBcIm5vcm1hbFwiICYmIGFnZSA+PSA1MCAmJiBhZ2UgPD0gMTAwICYmIG4ucmV2aWV3ZWRDb3VudCA9PT0gMDtcclxuICAgIH0pO1xyXG4gICAgaWYgKHJlY2VudFVucmV2aWV3ZWQubGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiByZWNlbnRVbnJldmlld2VkW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHJlY2VudFVucmV2aWV3ZWQubGVuZ3RoKV07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyAyMCUgY2hhbmNlOiBleGNpdGluZyBub3RlICh3ZWlnaHRlZCBieSBvdmVyZHVlXHUwMEIyKVxyXG4gIGlmIChyYW5kIDwgMC43KSB7XHJcbiAgICBjb25zdCBleGNpdGluZyA9IG5vdGVzLmZpbHRlcigobikgPT4gbm90ZUlzRHVlKG4pICYmIG4ubm90ZVN0YXRlID09PSBcImV4Y2l0aW5nXCIpO1xyXG4gICAgY29uc3Qgd2VpZ2h0cyA9IGV4Y2l0aW5nLm1hcCgobikgPT4gTWF0aC5wb3coTWF0aC5tYXgoMSwgbnVtRGF5c092ZXJkdWUobikpLCAyKSk7XHJcbiAgICBjb25zdCBwaWNrZWQgPSB3ZWlnaHRlZFJhbmRvbShleGNpdGluZywgd2VpZ2h0cyk7XHJcbiAgICBpZiAocGlja2VkKSByZXR1cm4gcGlja2VkO1xyXG4gIH1cclxuXHJcbiAgLy8gRmFsbGJhY2s6IGFueSBkdWUgbm90ZSwgd2VpZ2h0ZWQgYnkgb3ZlcmR1ZVx1MDBCMiBcdTAwRDcgZm9sZGVyIHF1b3RhXHJcbiAgY29uc3QgYWxsRHVlID0gbm90ZXMuZmlsdGVyKChuKSA9PiBub3RlSXNEdWUobikpO1xyXG4gIGNvbnN0IHdlaWdodHMgPSBhbGxEdWUubWFwKChuKSA9PiBNYXRoLnBvdyhNYXRoLm1heCgxLCBudW1EYXlzT3ZlcmR1ZShuKSksIDIpICogZm9sZGVyV2VpZ2h0KG4uZmlsZXBhdGgsIHNldHRpbmdzKSk7XHJcbiAgcmV0dXJuIHdlaWdodGVkUmFuZG9tKGFsbER1ZSwgd2VpZ2h0cyk7XHJcbn0iLCAiLy9cdTIxOTAgc3luY1ZhdWx0KCk6IHJlY29uY2lsZSB2YXVsdCBmaWxlcyBcdTIxOTQgc3RvcmVcclxuXHJcbi8vIFBvcnQgb2YgcmVsb2FkX2RiKCkgZnJvbSBzcGFjZWRfaW5ib3gucHlcclxuLy8gUmVjb25jaWxlcyB2YXVsdCAubWQgZmlsZXMgYWdhaW5zdCB0aGUgc2NoZWR1bGUgc3RvcmUuXHJcblxyXG5pbXBvcnQgeyBURmlsZSwgVmF1bHQgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgUGx1Z2luRGF0YSwgU3BhY2VkRXZlcnl0aGluZ1NldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgdG9kYXksIG5vdGVJc0R1ZSB9IGZyb20gXCIuL3NjaGVkdWxlclwiO1xyXG5cclxuLy8gY3J5cHRvIGltcG9ydFxyXG5hc3luYyBmdW5jdGlvbiBzaGExKGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgY29uc3QgZW5jb2RlciA9IG5ldyBUZXh0RW5jb2RlcigpO1xyXG4gIGNvbnN0IGRhdGEgPSBlbmNvZGVyLmVuY29kZShjb250ZW50KTtcclxuICBjb25zdCBoYXNoQnVmZmVyID0gYXdhaXQgY3J5cHRvLnN1YnRsZS5kaWdlc3QoXCJTSEEtMVwiLCBkYXRhKTtcclxuICBjb25zdCBoYXNoQXJyYXkgPSBBcnJheS5mcm9tKG5ldyBVaW50OEFycmF5KGhhc2hCdWZmZXIpKTtcclxuICByZXR1cm4gaGFzaEFycmF5Lm1hcCgoYikgPT4gYi50b1N0cmluZygxNikucGFkU3RhcnQoMiwgXCIwXCIpKS5qb2luKFwiXCIpO1xyXG59XHJcblxyXG4vLyBTdHJpcCBZQU1MIGZyb250bWF0dGVyIGJlZm9yZSBoYXNoaW5nIHNvIG1ldGFkYXRhIGNoYW5nZXMgZG9uJ3QgcmVzZXQgc2NoZWR1bGVcclxuZnVuY3Rpb24gc3RyaXBGcm9udG1hdHRlcihjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGlmICghY29udGVudC5zdGFydHNXaXRoKFwiLS0tXCIpKSByZXR1cm4gY29udGVudDtcclxuICBjb25zdCBlbmQgPSBjb250ZW50LmluZGV4T2YoXCJcXG4tLS1cIiwgMyk7XHJcbiAgcmV0dXJuIGVuZCA9PT0gLTEgPyBjb250ZW50IDogY29udGVudC5zbGljZShlbmQgKyA0KS50cmltU3RhcnQoKTtcclxufVxyXG5cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN5bmNWYXVsdChcclxuICB2YXVsdDogVmF1bHQsXHJcbiAgZGF0YTogUGx1Z2luRGF0YSxcclxuICBzZXR0aW5nczogU3BhY2VkRXZlcnl0aGluZ1NldHRpbmdzLFxyXG4pOiBQcm9taXNlPFBsdWdpbkRhdGE+IHtcclxuICBjb25zdCBmaWxlczogVEZpbGVbXSA9IHZhdWx0LmdldE1hcmtkb3duRmlsZXMoKS5maWx0ZXIoKGYpID0+IHtcclxuICAgIGlmIChzZXR0aW5ncy5zb3VyY2VTY29wZSA9PT0gXCJmb2xkZXJcIikge1xyXG4gICAgICAgIHJldHVybiBzZXR0aW5ncy5zb3VyY2VGb2xkZXJzLnNvbWUoKGUpID0+IGYucGF0aC5zdGFydHNXaXRoKGUucGF0aCArIFwiL1wiKSk7ICAgICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IGN1cnJlbnRIYXNoZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XHJcbiAgICBjb25zdCByYXcgPSBhd2FpdCB2YXVsdC5yZWFkKGZpbGUpO1xyXG4gICAgY29uc3QgYm9keSA9IHN0cmlwRnJvbnRtYXR0ZXIocmF3KTtcclxuICAgIGNvbnN0IGhhc2ggPSBhd2FpdCBzaGExKGJvZHkpO1xyXG4gICAgY3VycmVudEhhc2hlcy5hZGQoaGFzaCk7XHJcblxyXG4gICAgaWYgKGRhdGEubm90ZXNbaGFzaF0gJiYgZGF0YS5ub3Rlc1toYXNoXS5pbnRlcnZhbCA+PSAwKSB7XHJcbiAgICAgIC8vIEV4aXN0aW5nIGFjdGl2ZSBub3RlIFx1MjAxNCB1cGRhdGUgZmlsZXBhdGggaW4gY2FzZSBpdCBtb3ZlZFxyXG4gICAgICBkYXRhLm5vdGVzW2hhc2hdLmZpbGVwYXRoID0gZmlsZS5wYXRoO1xyXG4gICAgfSBlbHNlIGlmIChkYXRhLm5vdGVzW2hhc2hdKSB7XHJcbiAgICAgIC8vIFdhcyBzb2Z0LWRlbGV0ZWQvYXJjaGl2ZWQsIG5vdyBiYWNrIFx1MjAxNCByZXN1cnJlY3RcclxuICAgICAgZGF0YS5ub3Rlc1toYXNoXSA9IHtcclxuICAgICAgICAuLi5kYXRhLm5vdGVzW2hhc2hdLFxyXG4gICAgICAgIGZpbGVwYXRoOiBmaWxlLnBhdGgsXHJcbiAgICAgICAgaW50ZXJ2YWw6IHNldHRpbmdzLmluaXRpYWxJbnRlcnZhbCxcclxuICAgICAgICBlYXNlRmFjdG9yOiBzZXR0aW5ncy5kZWZhdWx0RWFzZUZhY3RvcixcclxuICAgICAgICBsYXN0UmV2aWV3ZWRPbjogZGF5c0FnbyhzZXR0aW5ncy5pbml0aWFsSW50ZXJ2YWwpLFxyXG4gICAgICAgIHJldmlld2VkQ291bnQ6IDAsXHJcbiAgICAgICAgbm90ZVN0YXRlOiBcIm5vcm1hbFwiLFxyXG4gICAgICB9O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gTmV3IG5vdGVcclxuICAgICAgZGF0YS5ub3Rlc1toYXNoXSA9IHtcclxuICAgICAgICBzaGExc3VtOiBoYXNoLFxyXG4gICAgICAgIGZpbGVwYXRoOiBmaWxlLnBhdGgsXHJcbiAgICAgICAgZWFzZUZhY3Rvcjogc2V0dGluZ3MuZGVmYXVsdEVhc2VGYWN0b3IsXHJcbiAgICAgICAgaW50ZXJ2YWw6IHNldHRpbmdzLmluaXRpYWxJbnRlcnZhbCxcclxuICAgICAgICBsYXN0UmV2aWV3ZWRPbjogZGF5c0FnbyhzZXR0aW5ncy5pbml0aWFsSW50ZXJ2YWwpLFxyXG4gICAgICAgIGNyZWF0ZWRPbjogdG9kYXkoKSxcclxuICAgICAgICByZXZpZXdlZENvdW50OiAwLFxyXG4gICAgICAgIG5vdGVTdGF0ZTogXCJub3JtYWxcIixcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgfVxyXG5cclxuICAvLyBTb2Z0LWRlbGV0ZSBub3RlcyBubyBsb25nZXIgaW4gdmF1bHRcclxuICBmb3IgKGNvbnN0IFtoYXNoLCBub3RlXSBvZiBPYmplY3QuZW50cmllcyhkYXRhLm5vdGVzKSkge1xyXG4gICAgaWYgKCFjdXJyZW50SGFzaGVzLmhhcyhoYXNoKSAmJiBub3RlLmludGVydmFsID49IDApIHtcclxuICAgICAgZGF0YS5ub3Rlc1toYXNoXS5pbnRlcnZhbCA9IC0xO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gTG9nIHJldmlldyBsb2FkIHNuYXBzaG90IHBlciBkYXlcclxuICBjb25zdCBhY3RpdmVOb3RlcyA9IE9iamVjdC52YWx1ZXMoZGF0YS5ub3RlcykuZmlsdGVyKChuKSA9PiBuLmludGVydmFsID49IDApO1xyXG4gIGNvbnN0IHRvZGF5U3RyID0gdG9kYXkoKTtcclxuICBjb25zdCBsYXN0RW50cnkgPSBkYXRhLnJldmlld0xvYWRMb2dbZGF0YS5yZXZpZXdMb2FkTG9nLmxlbmd0aCAtIDFdO1xyXG5cclxuICBpZiAobGFzdEVudHJ5ICYmIGxhc3RFbnRyeS50aW1lc3RhbXAuc3RhcnRzV2l0aCh0b2RheVN0cikpIHtcclxuICAgIGxhc3RFbnRyeS5udW1Ob3RlcyA9IGFjdGl2ZU5vdGVzLmxlbmd0aDtcclxuICAgIGxhc3RFbnRyeS5udW1EdWUgPSBhY3RpdmVOb3Rlcy5maWx0ZXIoKG4pID0+IG5vdGVJc0R1ZShuKSkubGVuZ3RoO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBkYXRhLnJldmlld0xvYWRMb2cucHVzaCh7XHJcbiAgICAgIHRpbWVzdGFtcDogdG9kYXlTdHIsXHJcbiAgICAgIG51bU5vdGVzOiBhY3RpdmVOb3Rlcy5sZW5ndGgsXHJcbiAgICAgIG51bUR1ZTogYWN0aXZlTm90ZXMuZmlsdGVyKChuKSA9PiBub3RlSXNEdWUobikpLmxlbmd0aCxcclxuICAgIH0pO1xyXG4gICAgaWYgKGRhdGEucmV2aWV3TG9hZExvZy5sZW5ndGggPiAyMDAwKSB7XHJcbiAgICAgIGRhdGEucmV2aWV3TG9hZExvZyA9IGRhdGEucmV2aWV3TG9hZExvZy5zbGljZSgtMjAwMCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZGF0YTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGF5c0FnbyhuOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGQgPSBuZXcgRGF0ZSgpO1xyXG4gIGQuc2V0RGF0ZShkLmdldERhdGUoKSAtIG4pO1xyXG4gIHJldHVybiBkLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xyXG59IiwgImltcG9ydCB7IEFwcCwgQ29tcG9uZW50LCBNb2RhbCwgTWFya2Rvd25SZW5kZXJlciwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgTm90ZVJlY29yZCwgTm90ZVN0YXRlIH0gZnJvbSBcIi4vdHlwZXNcIjtcclxuaW1wb3J0IHsgbmV4dEludGVydmFsLCB0b2RheSwgbm90ZUlzRHVlIH0gZnJvbSBcIi4vc2NoZWR1bGVyXCI7XHJcbmltcG9ydCB7IHNhdmVTdG9yZSB9IGZyb20gXCIuL3N0b3JlXCI7XHJcbmltcG9ydCB7IHBpY2tOb3RlVG9SZXZpZXcgfSBmcm9tIFwiLi9zY2hlZHVsZXJcIjtcclxuaW1wb3J0IHR5cGUgU3BhY2VkRXZlcnl0aGluZ1BsdWdpbiBmcm9tIFwiLi9tYWluXCI7XHJcbmltcG9ydCB7IHdyaXRlRnJvbnRtYXR0ZXJSZWFjdGlvbiB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7ICBcclxuXHJcbmV4cG9ydCBjbGFzcyBSZXZpZXdNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICBwcml2YXRlIHJlbmRlckNvbXBvbmVudDogQ29tcG9uZW50IHwgbnVsbCA9IG51bGw7XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgYXBwOiBBcHAsXHJcbiAgICBwcml2YXRlIHBsdWdpbjogU3BhY2VkRXZlcnl0aGluZ1BsdWdpbixcclxuICAgIHByaXZhdGUgbm90ZTogTm90ZVJlY29yZCxcclxuICApIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBvbk9wZW4oKSB7XHJcbiAgICBhd2FpdCB0aGlzLnJlbmRlcigpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyByZW5kZXIoKSB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuICAgIC8vIFVubG9hZCBwcmV2aW91cyByZW5kZXIgY29tcG9uZW50IHRvIGF2b2lkIG1lbW9yeSBsZWFrcyBvbiByZS1yZW5kZXJcclxuICAgIGlmICh0aGlzLnJlbmRlckNvbXBvbmVudCkge1xyXG4gICAgICB0aGlzLnJlbmRlckNvbXBvbmVudC51bmxvYWQoKTtcclxuICAgIH1cclxuICAgIHRoaXMucmVuZGVyQ29tcG9uZW50ID0gbmV3IENvbXBvbmVudCgpO1xyXG4gICAgdGhpcy5yZW5kZXJDb21wb25lbnQubG9hZCgpO1xyXG5cclxuICAgIGNvbnN0IHRpdGxlID0gdGhpcy5ub3RlLmZpbGVwYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSEucmVwbGFjZSgvXFwubWQkLywgXCJcIik7XHJcbiAgICBjb25zdCB0aXRsZUVsID0gY29udGVudEVsLmNyZWF0ZUVsKFwiaDFcIiwgeyB0ZXh0OiB0aXRsZSwgY2xzOiBcInNwYWNlZC1ub3RlLXRpdGxlXCIgfSk7XHJcbiAgICB0aXRsZUVsLnN0eWxlLmN1cnNvciA9IFwicG9pbnRlclwiO1xyXG4gICAgdGl0bGVFbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMubm90ZS5maWxlcGF0aCkgYXMgVEZpbGU7XHJcbiAgICAgIGlmICghZmlsZSkgcmV0dXJuO1xyXG4gICAgICBjb25zdCBsZWFmID0gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYWYoXCJ0YWJcIik7XHJcbiAgICAgIGF3YWl0IGxlYWYub3BlbkZpbGUoZmlsZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBEdWUgY291bnQgaGVhZGVyXHJcbiAgICBjb25zdCBhbGxOb3RlcyA9IE9iamVjdC52YWx1ZXModGhpcy5wbHVnaW4uZGF0YS5ub3RlcykuZmlsdGVyKChuKSA9PiBuLmludGVydmFsID49IDApO1xyXG4gICAgY29uc3QgZHVlQ291bnQgPSBhbGxOb3Rlcy5maWx0ZXIoKG4pID0+IG5vdGVJc0R1ZShuKSkubGVuZ3RoO1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuICAgICAgdGV4dDogYCR7ZHVlQ291bnR9IG5vdGUke2R1ZUNvdW50ICE9PSAxID8gXCJzXCIgOiBcIlwifSBkdWVgLFxyXG4gICAgICBjbHM6IFwic3BhY2VkLWR1ZS1jb3VudFwiLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmVuZGVyIG5vdGUgY29udGVudFxyXG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLm5vdGUuZmlsZXBhdGgpIGFzIFRGaWxlO1xyXG4gICAgaWYgKCFmaWxlKSB7XHJcbiAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBgRmlsZSBub3QgZm91bmQ6ICR7dGhpcy5ub3RlLmZpbGVwYXRofWAgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xyXG4gICAgY29uc3QgcmVuZGVyRWwgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1ub3RlLWNvbnRlbnRcIiB9KTtcclxuICAgIGF3YWl0IE1hcmtkb3duUmVuZGVyZXIucmVuZGVyKFxyXG4gICAgICB0aGlzLmFwcCxcclxuICAgICAgY29udGVudCxcclxuICAgICAgcmVuZGVyRWwsXHJcbiAgICAgIHRoaXMubm90ZS5maWxlcGF0aCxcclxuICAgICAgdGhpcy5yZW5kZXJDb21wb25lbnQsIC8vIFx1MjE5MCB3YXM6IHRoaXNcclxuICAgICk7XHJcblxyXG4gICAgLy8gUmVhY3Rpb24gYnV0dG9uc1xyXG4gICAgY29uc3QgYnRuUm93ID0gY29udGVudEVsLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYnRuLXJvd1wiIH0pO1xyXG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCBcIkV4Y2l0aW5nXCIsIFwiZXhjaXRpbmdcIiwgKCkgPT4gdGhpcy5yZWFjdChcImV4Y2l0aW5nXCIpKTtcclxuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgXCJJbnRlcmVzdGluZ1wiLCBcImludGVyZXN0aW5nXCIsICgpID0+IHRoaXMucmVhY3QoXCJpbnRlcmVzdGluZ1wiKSk7XHJcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIFwiWWVhaFwiLCBcInllYWhcIiwgKCkgPT4gdGhpcy5yZWFjdChcInllYWhcIikpO1xyXG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCBcIkxvbFwiLCBcImxvbFwiLCAoKSA9PiB0aGlzLnJlYWN0KFwibG9sXCIpKTtcclxuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgXCJNZWhcIiwgXCJtZWhcIiwgKCkgPT4gdGhpcy5yZWFjdChcIm1laFwiKSk7XHJcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIFwiQ3JpbmdlXCIsIFwiY3JpbmdlXCIsICgpID0+IHRoaXMucmVhY3QoXCJjcmluZ2VcIikpO1xyXG4gICAgdGhpcy5hZGRCdG4oYnRuUm93LCBcIlRheGluZ1wiLCBcInRheGluZ1wiLCAoKSA9PiB0aGlzLnJlYWN0KFwidGF4aW5nXCIpKTtcclxuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgXCJSZXZpc2l0IHNvb25cIiwgXCJyZXZpc2l0XCIsICgpID0+IHRoaXMucmVhY3QoXCJyZXZpc2l0XCIpKTtcclxuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgXCJSb3V0ZSBcdTIxOTJcIiwgXCJyb3V0ZVwiLCAoKSA9PiB0aGlzLnJvdXRlTm90ZSgpKTtcclxuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgXCJTa2lwXCIsIFwic2tpcFwiLCAoKSA9PiB0aGlzLnJlYWN0KFwic2tpcFwiKSk7XHJcbiAgICB0aGlzLmFkZEJ0bihidG5Sb3csIFwiQXJjaGl2ZVwiLCBcImFyY2hpdmVcIiwgKCkgPT4gdGhpcy5hcmNoaXZlTm90ZSgpKTtcclxuICAgIHRoaXMuYWRkQnRuKGJ0blJvdywgXCJEZWxldGVcIiwgXCJkZWxldGVcIiwgKCkgPT4gdGhpcy5kZWxldGVOb3RlKCkpO1xyXG4gICAgY29uc3QgZWRpdEJ0biA9IGJ0blJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiRWRpdFwiLCBjbHM6IFwic3BhY2VkLWJ0biBzcGFjZWQtYnRuLWVkaXRcIiB9KTtcclxuICAgIGVkaXRCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0aGlzLm5vdGUuZmlsZXBhdGgpIGFzIFRGaWxlO1xyXG4gICAgICBpZiAoIWZpbGUpIHJldHVybjtcclxuICAgICAgY29uc3QgbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKFwidGFiXCIpO1xyXG4gICAgICBhd2FpdCBsZWFmLm9wZW5GaWxlKGZpbGUpO1xyXG4gICAgICAvLyBEbyBOT1QgY2FsbCByZWFjdCgpIG9yIHVwZGF0ZSB0aGUgc2NoZWR1bGVcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhZGRCdG4oY29udGFpbmVyOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgY2xzOiBzdHJpbmcsIGNiOiAoKSA9PiB2b2lkKSB7XHJcbiAgICBjb25zdCBidG4gPSBjb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG4gICAgICB0ZXh0OiBsYWJlbCxcclxuICAgICAgY2xzOiBgc3BhY2VkLWJ0biBzcGFjZWQtYnRuLSR7Y2xzfWAsXHJcbiAgICB9KTtcclxuICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY2IpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyByZWFjdChyZWFjdGlvbjogTm90ZVN0YXRlIHwgXCJza2lwXCIpIHtcclxuICAgIGNvbnN0IG5ld05vdGVTdGF0ZTogTm90ZVN0YXRlID0gcmVhY3Rpb24gPT09IFwic2tpcFwiID8gdGhpcy5ub3RlLm5vdGVTdGF0ZSA6IChyZWFjdGlvbiBhcyBOb3RlU3RhdGUpO1xyXG4gICAgY29uc3QgbmV3SW50ZXJ2YWwgPSBuZXh0SW50ZXJ2YWwodGhpcy5ub3RlLCByZWFjdGlvbik7XHJcbiAgICB0aGlzLnBsdWdpbi5kYXRhLm5vdGVzW3RoaXMubm90ZS5zaGExc3VtXSA9IHtcclxuICAgICAgLi4udGhpcy5ub3RlLFxyXG4gICAgICBpbnRlcnZhbDogbmV3SW50ZXJ2YWwsXHJcbiAgICAgIGxhc3RSZXZpZXdlZE9uOiB0b2RheSgpLFxyXG4gICAgICByZXZpZXdlZENvdW50OiB0aGlzLm5vdGUucmV2aWV3ZWRDb3VudCArIDEsXHJcbiAgICAgIG5vdGVTdGF0ZTogbmV3Tm90ZVN0YXRlLFxyXG4gICAgfTtcclxuICAgIGF3YWl0IHNhdmVTdG9yZSh0aGlzLnBsdWdpbiwgdGhpcy5wbHVnaW4uZGF0YSk7XHJcbiAgICBhd2FpdCB3cml0ZUZyb250bWF0dGVyUmVhY3Rpb24odGhpcy5hcHAsIHRoaXMubm90ZS5maWxlcGF0aCwgbmV3Tm90ZVN0YXRlKTtcclxuICAgIGF3YWl0IHRoaXMuc2hvd05leHROb3RlKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIHJvdXRlTm90ZSgpIHtcclxuICAgIGNvbnN0IGZpbGVuYW1lID0gdGhpcy5ub3RlLmZpbGVwYXRoLnNwbGl0KFwiL1wiKS5wb3AoKSE7XHJcbiAgICBjb25zdCBkZXN0ID0gYCR7dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXZlcmdyZWVuRm9sZGVyfS8ke2ZpbGVuYW1lfWA7XHJcbiAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRoaXMubm90ZS5maWxlcGF0aCkgYXMgVEZpbGU7XHJcbiAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZW5hbWUoZmlsZSwgZGVzdCk7XHJcbiAgICBhd2FpdCBzYXZlU3RvcmUodGhpcy5wbHVnaW4sIHRoaXMucGx1Z2luLmRhdGEpO1xyXG4gICAgYXdhaXQgd3JpdGVGcm9udG1hdHRlclJlYWN0aW9uKHRoaXMuYXBwLCBkZXN0LCB0aGlzLm5vdGUubm90ZVN0YXRlKTtcclxuICAgIGF3YWl0IHRoaXMuc2hvd05leHROb3RlKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFzeW5jIGFyY2hpdmVOb3RlKCkge1xyXG4gICAgdGhpcy5wbHVnaW4uZGF0YS5ub3Rlc1t0aGlzLm5vdGUuc2hhMXN1bV0uaW50ZXJ2YWwgPSAtMTtcclxuICAgIGF3YWl0IHNhdmVTdG9yZSh0aGlzLnBsdWdpbiwgdGhpcy5wbHVnaW4uZGF0YSk7XHJcbiAgICBhd2FpdCB0aGlzLnNob3dOZXh0Tm90ZSgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBzaG93TmV4dE5vdGUoKSB7XHJcbiAgICBjb25zdCBhbGxOb3RlcyA9IE9iamVjdC52YWx1ZXModGhpcy5wbHVnaW4uZGF0YS5ub3RlcykuZmlsdGVyKChuKSA9PiBuLmludGVydmFsID49IDApO1xyXG4gICAgY29uc3QgbmV4dCA9IHBpY2tOb3RlVG9SZXZpZXcobm90ZXMsIHRoaXMucGx1Z2luLnNldHRpbmdzKTtcclxuICAgIGlmICghbmV4dCkge1xyXG4gICAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgICAgY29udGVudEVsLmVtcHR5KCk7XHJcbiAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJBbGwgY2F1Z2h0IHVwIVwiIH0pO1xyXG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBtb3JlIG5vdGVzIGR1ZS4gQ2xvc2UgdGhpcyBtb2RhbCB0byBleGl0LlwiIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLm5vdGUgPSBuZXh0O1xyXG4gICAgYXdhaXQgdGhpcy5yZW5kZXIoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgZGVsZXRlTm90ZSgpIHtcclxuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGhpcy5ub3RlLmZpbGVwYXRoKSBhcyBURmlsZTtcclxuICAgIGlmIChmaWxlKSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmRlbGV0ZShmaWxlKTtcclxuICAgIH1cclxuICAgIC8vIFJlbW92ZSBmcm9tIHN0b3JlIGVudGlyZWx5IChub3QganVzdCBzb2Z0LWRlbGV0ZSlcclxuICAgIGRlbGV0ZSB0aGlzLnBsdWdpbi5kYXRhLm5vdGVzW3RoaXMubm90ZS5zaGExc3VtXTtcclxuICAgIGF3YWl0IHNhdmVTdG9yZSh0aGlzLnBsdWdpbiwgdGhpcy5wbHVnaW4uZGF0YSk7XHJcbiAgICBhd2FpdCB0aGlzLnNob3dOZXh0Tm90ZSgpO1xyXG4gIH1cclxuXHJcbiAgb25DbG9zZSgpIHtcclxuICAgIGlmICh0aGlzLnJlbmRlckNvbXBvbmVudCkge1xyXG4gICAgICB0aGlzLnJlbmRlckNvbXBvbmVudC51bmxvYWQoKTtcclxuICAgICAgdGhpcy5yZW5kZXJDb21wb25lbnQgPSBudWxsO1xyXG4gICAgfVxyXG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuICB9XHJcbn1cclxuIiwgImltcG9ydCB7IEFwcCwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgTm90ZVN0YXRlIH0gZnJvbSBcIi4vdHlwZXNcIjtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250bWF0dGVyUmVhY3Rpb24oYXBwOiBBcHAsIGZpbGVwYXRoOiBzdHJpbmcsIHN0YXRlOiBOb3RlU3RhdGUpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBmaWxlID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChmaWxlcGF0aCkgYXMgVEZpbGUgfCBudWxsO1xyXG4gIGlmICghZmlsZSkgcmV0dXJuO1xyXG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XHJcbiAgICBmbVtcIm5vdGVfbW9vZFwiXSA9IHN0YXRlO1xyXG4gIH0pO1xyXG59XHJcbiIsICJpbXBvcnQgdHlwZSBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luIGZyb20gXCIuL21haW5cIjtcclxuaW1wb3J0IHsgQXBwLCBNb2RhbCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNwYWNlZEV2ZXJ5dGhpbmdTZXR0aW5nc1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgYXBwOiBBcHAsXHJcbiAgICBwcml2YXRlIHBsdWdpbjogU3BhY2VkRXZlcnl0aGluZ1BsdWdpbixcclxuICApIHtcclxuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcclxuICB9XHJcblxyXG4gIGRpc3BsYXkoKTogdm9pZCB7XHJcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xyXG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcclxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBcIlNwYWNlZCBFdmVyeXRoaW5nXCIgfSk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKFwiU291cmNlIHNjb3BlXCIpXHJcbiAgICAgIC5zZXREZXNjKFwiUHJvY2VzcyBub3RlcyBmcm9tIHRoZSB3aG9sZSB2YXVsdCBvciBhIHNwZWNpZmljIGZvbGRlci5cIilcclxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wKSA9PlxyXG4gICAgICAgIGRyb3BcclxuICAgICAgICAgIC5hZGRPcHRpb24oXCJ2YXVsdFwiLCBcIldob2xlIHZhdWx0XCIpXHJcbiAgICAgICAgICAuYWRkT3B0aW9uKFwiZm9sZGVyXCIsIFwiU3BlY2lmaWMgZm9sZGVyXCIpXHJcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Muc291cmNlU2NvcGUpXHJcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc291cmNlU2NvcGUgPSB2IGFzIFwidmF1bHRcIiB8IFwiZm9sZGVyXCI7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICB0aGlzLmRpc3BsYXkoKTsgLy8gcmUtcmVuZGVyIHRvIHNob3cvaGlkZSBmb2xkZXIgaW5wdXRcclxuICAgICAgICAgIH0pLFxyXG4gICAgICApO1xyXG5cclxuICAgIGNvbnN0IGZvbGRlcnMgPSB0aGlzLmFwcC52YXVsdFxyXG4gICAgICAuZ2V0QWxsRm9sZGVycygpXHJcbiAgICAgIC5tYXAoKGYpID0+IGYucGF0aClcclxuICAgICAgLnNvcnQoKTtcclxuXHJcbiAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3Muc291cmNlU2NvcGUgPT09IFwiZm9sZGVyXCIpIHtcclxuICAgICAgLy8gU2hvdyBlYWNoIHNlbGVjdGVkIGZvbGRlciB3aXRoIGEgUmVtb3ZlIGJ1dHRvblxyXG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHRoaXMucGx1Z2luLnNldHRpbmdzLnNvdXJjZUZvbGRlcnMpIHtcclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgIC5zZXROYW1lKGVudHJ5LnBhdGgpXHJcbiAgICAgICAgICAuc2V0RGVzYyhcIlJldmlldyBxdW90YSB3ZWlnaHQgKCUpLiAxMDAgPSBkZWZhdWx0LCBsb3dlciA9IGFwcGVhcnMgbGVzcyBvZnRlbi5cIilcclxuICAgICAgICAgIC5hZGRTbGlkZXIoKHNsKSA9PlxyXG4gICAgICAgICAgICBzbFxyXG4gICAgICAgICAgICAgIC5zZXRMaW1pdHMoMSwgMjAwLCAxKVxyXG4gICAgICAgICAgICAgIC5zZXRWYWx1ZShlbnRyeS53ZWlnaHQpXHJcbiAgICAgICAgICAgICAgLnNldER5bmFtaWNUb29sdGlwKClcclxuICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHYpID0+IHtcclxuICAgICAgICAgICAgICAgIGVudHJ5LndlaWdodCA9IHY7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgIClcclxuICAgICAgICAgIC5hZGRCdXR0b24oKGJ0bikgPT5cclxuICAgICAgICAgICAgYnRuXHJcbiAgICAgICAgICAgICAgLnNldEJ1dHRvblRleHQoXCJSZW1vdmVcIilcclxuICAgICAgICAgICAgICAuc2V0V2FybmluZygpXHJcbiAgICAgICAgICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc291cmNlRm9sZGVycyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnNvdXJjZUZvbGRlcnMuZmlsdGVyKFxyXG4gICAgICAgICAgICAgICAgICAoZSkgPT4gZS5wYXRoICE9PSBlbnRyeS5wYXRoLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICApO1xyXG4gICAgICB9ICBcclxuXHJcbiAgICAgIGxldCBwZW5kaW5nRm9sZGVyID0gXCJcIjtcclxuICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgLnNldE5hbWUoXCJBZGQgc291cmNlIGZvbGRlclwiKVxyXG4gICAgICAgIC5hZGREcm9wZG93bigoZHJvcCkgPT4ge1xyXG4gICAgICAgICAgZHJvcC5hZGRPcHRpb24oXCJcIiwgXCJcdTIwMTQgc2VsZWN0IGEgZm9sZGVyIFx1MjAxNFwiKTtcclxuICAgICAgICAgIGZvciAoY29uc3QgZiBvZiBmb2xkZXJzKSB7XHJcbiAgICAgICAgICAgIC8vIFx1MjE5MCB1c2UgYGZvbGRlcnNgLCBub3QgZ2V0QWxsRm9sZGVyUGF0aHMoKVxyXG4gICAgICAgICAgICBpZiAoIXRoaXMucGx1Z2luLnNldHRpbmdzLnNvdXJjZUZvbGRlcnMuc29tZSgoZSkgPT4gZS5wYXRoID09PSBmKSkge1xyXG4gICAgICAgICAgICAgIGRyb3AuYWRkT3B0aW9uKGYsIGYpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBkcm9wLm9uQ2hhbmdlKCh2KSA9PiB7XHJcbiAgICAgICAgICAgIHBlbmRpbmdGb2xkZXIgPSB2O1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAuYWRkQnV0dG9uKChidG4pID0+XHJcbiAgICAgICAgICBidG4uc2V0QnV0dG9uVGV4dChcIkFkZFwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKHBlbmRpbmdGb2xkZXIgJiYgIXRoaXMucGx1Z2luLnNldHRpbmdzLnNvdXJjZUZvbGRlcnMuc29tZSgoZSkgPT4gZS5wYXRoID09PSBwZW5kaW5nRm9sZGVyKSkge1xyXG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNvdXJjZUZvbGRlcnMucHVzaCh7IHBhdGg6IHBlbmRpbmdGb2xkZXIsIHdlaWdodDogMTAwIH0pO1xyXG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAuc2V0TmFtZShcIkV2ZXJncmVlbiBkZXN0aW5hdGlvbiBmb2xkZXJcIilcclxuICAgICAgLnNldERlc2MoXCJXaGVyZSByb3V0ZWQgbm90ZXMgYXJlIG1vdmVkIHRvLlwiKVxyXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3ApID0+IHtcclxuICAgICAgICBkcm9wLmFkZE9wdGlvbihcIlwiLCBcIlx1MjAxNCBzZWxlY3QgYSBmb2xkZXIgXHUyMDE0XCIpO1xyXG4gICAgICAgIGZvciAoY29uc3QgZm9sZGVyIG9mIGZvbGRlcnMpIHtcclxuICAgICAgICAgIGRyb3AuYWRkT3B0aW9uKGZvbGRlciwgZm9sZGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZHJvcC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVyZ3JlZW5Gb2xkZXIpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XHJcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ldmVyZ3JlZW5Gb2xkZXIgPSB2O1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAuc2V0TmFtZShcIkluaXRpYWwgaW50ZXJ2YWwgKGRheXMpXCIpXHJcbiAgICAgIC5zZXREZXNjKFwiSG93IG1hbnkgZGF5cyBiZWZvcmUgYSBuZXcgbm90ZSBmaXJzdCBhcHBlYXJzIGZvciByZXZpZXcuXCIpXHJcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PlxyXG4gICAgICAgIHRleHQuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmluaXRpYWxJbnRlcnZhbCkpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBuID0gcGFyc2VJbnQodik7XHJcbiAgICAgICAgICBpZiAoIWlzTmFOKG4pICYmIG4gPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmluaXRpYWxJbnRlcnZhbCA9IG47XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pLFxyXG4gICAgICApO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgZWFzZSBmYWN0b3IgKCUpXCIpXHJcbiAgICAgIC5zZXREZXNjKFwiTXVsdGlwbGllciBmb3IgaW50ZXJ2YWwgZ3Jvd3RoLiAzMDAgPSAzeCBwZXIgcmV2aWV3IGN5Y2xlLlwiKVxyXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT5cclxuICAgICAgICB0ZXh0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0RWFzZUZhY3RvcikpLm9uQ2hhbmdlKGFzeW5jICh2KSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBuID0gcGFyc2VJbnQodik7XHJcbiAgICAgICAgICBpZiAoIWlzTmFOKG4pICYmIG4gPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRFYXNlRmFjdG9yID0gbjtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSksXHJcbiAgICAgICk7XHJcblxyXG4gICAgLy8gRGFuZ2VyIHpvbmUgIFxyXG4gIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkRhbmdlciBab25lXCIgfSk7ICBcclxuICAgIFxyXG4gIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKSAgXHJcbiAgICAuc2V0TmFtZShcIlJlc2V0IGFsbCBzY2hlZHVsaW5nIGRhdGFcIikgIFxyXG4gICAgLnNldERlc2MoICBcclxuICAgICAgXCJQZXJtYW5lbnRseSBkZWxldGVzIGFsbCByZXZpZXcgaGlzdG9yeSwgaW50ZXJ2YWxzLCBhbmQgbm90ZSBzdGF0ZXMuIFwiICsgIFxyXG4gICAgICBcIllvdXIgbm90ZSBmaWxlcyBhcmUgbm90IGFmZmVjdGVkLiBUaGlzIGNhbm5vdCBiZSB1bmRvbmUuXCIgIFxyXG4gICAgKSAgXHJcbiAgICAuYWRkQnV0dG9uKGJ0biA9PiAgXHJcbiAgICAgIGJ0biAgXHJcbiAgICAgICAgLnNldEJ1dHRvblRleHQoXCJSZXNldCBkYXRhXCIpICBcclxuICAgICAgICAuc2V0V2FybmluZygpICBcclxuICAgICAgICAub25DbGljaygoKSA9PiBuZXcgUmVzZXRDb25maXJtTW9kYWwodGhpcy5hcHAsIHRoaXMucGx1Z2luKS5vcGVuKCkpICBcclxuICAgICk7XHJcbiAgfVxyXG59XHJcblxyXG5jbGFzcyBSZXNldENvbmZpcm1Nb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFwcDogQXBwLFxyXG4gICAgcHJpdmF0ZSBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXHJcbiAgKSB7XHJcbiAgICBzdXBlcihhcHApO1xyXG4gIH1cclxuXHJcbiAgb25PcGVuKCkge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiUmVzZXQgYWxsIHNjaGVkdWxpbmcgZGF0YT9cIiB9KTtcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwge1xyXG4gICAgICB0ZXh0OlxyXG4gICAgICAgIFwiVGhpcyB3aWxsIHBlcm1hbmVudGx5IGRlbGV0ZSBhbGwgcmV2aWV3IGhpc3RvcnksIGludGVydmFscywgYW5kIHNjaGVkdWxpbmcgXCIgK1xyXG4gICAgICAgIFwiZGF0YSBmb3IgZXZlcnkgbm90ZS4gWW91ciBhY3R1YWwgbm90ZSBmaWxlcyB3aWxsIG5vdCBiZSB0b3VjaGVkLiBcIiArXHJcbiAgICAgICAgXCJBZnRlciByZXNldCwgYWxsIG5vdGVzIHdpbGwgYmUgcmUtaW1wb3J0ZWQgb24gdGhlIG5leHQgc3luYy5cIixcclxuICAgIH0pO1xyXG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7XHJcbiAgICAgIHRleHQ6IFwiVGhpcyBjYW5ub3QgYmUgdW5kb25lLlwiLFxyXG4gICAgICBjbHM6IFwic3BhY2VkLXJlc2V0LXdhcm5pbmdcIixcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGJ0blJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLWJ0bi1yb3dcIiB9KTtcclxuXHJcbiAgICBjb25zdCBjYW5jZWxCdG4gPSBidG5Sb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIkNhbmNlbFwiIH0pO1xyXG4gICAgY2FuY2VsQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLmNsb3NlKCkpO1xyXG5cclxuICAgIGNvbnN0IGNvbmZpcm1CdG4gPSBidG5Sb3cuY3JlYXRlRWwoXCJidXR0b25cIiwge1xyXG4gICAgICB0ZXh0OiBcIlJlc2V0IGV2ZXJ5dGhpbmdcIixcclxuICAgICAgY2xzOiBcIm1vZC13YXJuaW5nXCIsXHJcbiAgICB9KTtcclxuICAgIGNvbmZpcm1CdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4ucmVzZXREYXRhKCk7XHJcbiAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgb25DbG9zZSgpIHtcclxuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XHJcbiAgfVxyXG59IiwgImltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IG5vdGVJc0R1ZSwgbnVtRGF5c092ZXJkdWUgfSBmcm9tIFwiLi9zY2hlZHVsZXJcIjtcclxuaW1wb3J0IHsgUmV2aWV3TW9kYWwgfSBmcm9tIFwiLi9SZXZpZXdNb2RhbFwiO1xyXG5pbXBvcnQgdHlwZSBTcGFjZWRFdmVyeXRoaW5nUGx1Z2luIGZyb20gXCIuL21haW5cIjtcclxuXHJcbmV4cG9ydCBjb25zdCBEVUVfTk9URVNfVklFV19UWVBFID0gXCJzcGFjZWQtZXZlcnl0aGluZy1kdWUtbm90ZXNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBEdWVOb3Rlc1ZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBsZWFmOiBXb3Jrc3BhY2VMZWFmLFxyXG4gICAgcHJpdmF0ZSBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXHJcbiAgKSB7XHJcbiAgICBzdXBlcihsZWFmKTtcclxuICB9XHJcblxyXG4gIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gRFVFX05PVEVTX1ZJRVdfVFlQRTtcclxuICB9XHJcbiAgZ2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBcIkR1ZSBOb3Rlc1wiO1xyXG4gIH1cclxuICBnZXRJY29uKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gXCJjbG9ja1wiO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgb25PcGVuKCkge1xyXG4gICAgYXdhaXQgdGhpcy5yZW5kZXIoKTtcclxuICB9XHJcbiAgYXN5bmMgb25DbG9zZSgpIHtcclxuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XHJcbiAgfVxyXG5cclxuICBhc3luYyByZW5kZXIoKSB7XHJcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cclxuICAgIGNvbnN0IGFsbE5vdGVzID0gT2JqZWN0LnZhbHVlcyh0aGlzLnBsdWdpbi5kYXRhLm5vdGVzKS5maWx0ZXIoKG4pID0+IG4uaW50ZXJ2YWwgPj0gMCk7XHJcbiAgICBjb25zdCBkdWVOb3RlcyA9IGFsbE5vdGVzLmZpbHRlcigobikgPT4gbm90ZUlzRHVlKG4pKS5zb3J0KChhLCBiKSA9PiBudW1EYXlzT3ZlcmR1ZShiKSAtIG51bURheXNPdmVyZHVlKGEpKTtcclxuXHJcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoNFwiLCB7IHRleHQ6IFwiRHVlIE5vdGVzXCIgfSk7XHJcblxyXG4gICAgaWYgKGR1ZU5vdGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJBbGwgY2F1Z2h0IHVwISBObyBub3RlcyBkdWUuXCIsIGNsczogXCJzcGFjZWQtZW1wdHlcIiB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwge1xyXG4gICAgICB0ZXh0OiBgJHtkdWVOb3Rlcy5sZW5ndGh9IG5vdGUke2R1ZU5vdGVzLmxlbmd0aCAhPT0gMSA/IFwic1wiIDogXCJcIn0gZHVlYCxcclxuICAgICAgY2xzOiBcInNwYWNlZC1kdWUtY291bnRcIixcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGxpc3QgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1kdWUtbGlzdFwiIH0pO1xyXG5cclxuICAgIGZvciAoY29uc3Qgbm90ZSBvZiBkdWVOb3Rlcykge1xyXG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtZHVlLXJvd1wiIH0pO1xyXG4gICAgICBjb25zdCBpbmZvID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtZHVlLWluZm9cIiB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGZpbGVuYW1lID0gbm90ZS5maWxlcGF0aC5zcGxpdChcIi9cIikucG9wKCkgPz8gbm90ZS5maWxlcGF0aDtcclxuICAgICAgaW5mby5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBmaWxlbmFtZSwgY2xzOiBcInNwYWNlZC1kdWUtZmlsZW5hbWVcIiB9KTtcclxuICAgICAgaW5mby5jcmVhdGVFbChcInNwYW5cIiwge1xyXG4gICAgICAgIHRleHQ6IGAgXHUwMEI3ICR7bnVtRGF5c092ZXJkdWUobm90ZSl9ZCBvdmVyZHVlIFx1MDBCNyAke25vdGUubm90ZVN0YXRlfWAsXHJcbiAgICAgICAgY2xzOiBcInNwYWNlZC1kdWUtbWV0YVwiLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGJ0biA9IHJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiUmV2aWV3XCIsIGNsczogXCJzcGFjZWQtYnRuXCIgfSk7XHJcbiAgICAgIGJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgIG5ldyBSZXZpZXdNb2RhbCh0aGlzLmFwcCwgdGhpcy5wbHVnaW4sIG5vdGUpLm9wZW4oKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiIsICIvLyBzcmMvU3RhdHNWaWV3LnRzXHJcbmltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xyXG5pbXBvcnQgeyBub3RlSXNEdWUsIGRheXNCZXR3ZWVuLCB0b2RheSB9IGZyb20gXCIuL3NjaGVkdWxlclwiO1xyXG5cclxuZXhwb3J0IGNvbnN0IFNUQVRTX1ZJRVdfVFlQRSA9IFwic3BhY2VkLWV2ZXJ5dGhpbmctc3RhdHNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTdGF0c1ZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBsZWFmOiBXb3Jrc3BhY2VMZWFmLFxyXG4gICAgcHJpdmF0ZSBwbHVnaW46IFNwYWNlZEV2ZXJ5dGhpbmdQbHVnaW4sXHJcbiAgKSB7XHJcbiAgICBzdXBlcihsZWFmKTtcclxuICB9XHJcblxyXG4gIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gU1RBVFNfVklFV19UWVBFO1xyXG4gIH1cclxuICBnZXREaXNwbGF5VGV4dCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIFwiU3BhY2VkIEV2ZXJ5dGhpbmcgXHUyMDE0IFN0YXRzXCI7XHJcbiAgfVxyXG4gIGdldEljb24oKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBcImJhci1jaGFydC0yXCI7XHJcbiAgfVxyXG5cclxuICBhc3luYyBvbk9wZW4oKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLnJlbmRlcigpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgcmVuZGVyKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcclxuICAgIGNvbnRlbnRFbC5hZGRDbGFzcyhcInNwYWNlZC1zdGF0cy12aWV3XCIpO1xyXG5cclxuICAgIGNvbnN0IGRhdGEgPSB0aGlzLnBsdWdpbi5kYXRhO1xyXG4gICAgY29uc3QgYWN0aXZlTm90ZXMgPSBPYmplY3QudmFsdWVzKGRhdGEubm90ZXMpLmZpbHRlcigobikgPT4gbi5pbnRlcnZhbCA+PSAwKTtcclxuICAgIGNvbnN0IGR1ZU5vdGVzID0gYWN0aXZlTm90ZXMuZmlsdGVyKChuKSA9PiBub3RlSXNEdWUobikpO1xyXG4gICAgY29uc3QgYXZnSW50ZXJ2YWwgPVxyXG4gICAgICBhY3RpdmVOb3Rlcy5sZW5ndGggPiAwID8gTWF0aC5yb3VuZChhY3RpdmVOb3Rlcy5yZWR1Y2UoKHN1bSwgbikgPT4gc3VtICsgbi5pbnRlcnZhbCwgMCkgLyBhY3RpdmVOb3Rlcy5sZW5ndGgpIDogMDtcclxuXHJcbiAgICAvLyBcdTI1MDBcdTI1MDAgU3VtbWFyeSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJTdW1tYXJ5XCIgfSk7XHJcbiAgICBjb25zdCBzdW1tYXJ5RWwgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1zdGF0cy1zdW1tYXJ5XCIgfSk7XHJcbiAgICB0aGlzLmFkZFN0YXQoc3VtbWFyeUVsLCBcIkFjdGl2ZSBub3Rlc1wiLCBTdHJpbmcoYWN0aXZlTm90ZXMubGVuZ3RoKSk7XHJcbiAgICB0aGlzLmFkZFN0YXQoc3VtbWFyeUVsLCBcIkR1ZSBub3dcIiwgU3RyaW5nKGR1ZU5vdGVzLmxlbmd0aCkpO1xyXG4gICAgdGhpcy5hZGRTdGF0KHN1bW1hcnlFbCwgXCJBdmcgaW50ZXJ2YWxcIiwgYCR7YXZnSW50ZXJ2YWx9IGRheXNgKTtcclxuXHJcbiAgICAvLyBcdTI1MDBcdTI1MDAgRm9yZWNhc3QgY2hhcnQgKHBvcnQgb2YgcGxvdF9oaXN0b2dyYW1fcmV2aWV3X2xvYWQucHkpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxyXG4gICAgLy8gU2hvd3MgaG93IG1hbnkgbm90ZXMgd2lsbCBiZWNvbWUgZHVlIGluIGVhY2ggdXBjb21pbmcgd2Vlay5cclxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJVcGNvbWluZyByZXZpZXcgbG9hZFwiIH0pO1xyXG5cclxuICAgIGNvbnN0IHRvZGF5U3RyID0gdG9kYXkoKTtcclxuICAgIC8vIEJ1Y2tldHM6IG92ZXJkdWUsIHdlZWsgMVx1MjAxMzhcclxuICAgIGNvbnN0IGxhYmVscyA9IFtcIk92ZXJkdWVcIiwgXCJXayAxXCIsIFwiV2sgMlwiLCBcIldrIDNcIiwgXCJXayA0XCIsIFwiV2sgNVwiLCBcIldrIDZcIiwgXCJXayA3XCIsIFwiV2sgOFwiXTtcclxuICAgIGNvbnN0IGNvdW50cyA9IG5ldyBBcnJheSg5KS5maWxsKDApO1xyXG5cclxuICAgIGZvciAoY29uc3Qgbm90ZSBvZiBhY3RpdmVOb3Rlcykge1xyXG4gICAgICBjb25zdCBkYXlzVW50aWxEdWUgPSBub3RlLmludGVydmFsIC0gZGF5c0JldHdlZW4obm90ZS5sYXN0UmV2aWV3ZWRPbiwgdG9kYXlTdHIpO1xyXG4gICAgICBpZiAoZGF5c1VudGlsRHVlIDw9IDApIHtcclxuICAgICAgICBjb3VudHNbMF0rKzsgLy8gb3ZlcmR1ZVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IHdlZWsgPSBNYXRoLmNlaWwoZGF5c1VudGlsRHVlIC8gNyk7IC8vIDEtaW5kZXhlZCB3ZWVrXHJcbiAgICAgICAgaWYgKHdlZWsgPD0gOCkgY291bnRzW3dlZWtdKys7XHJcbiAgICAgICAgLy8gbm90ZXMgZHVlIGJleW9uZCA4IHdlZWtzIGFyZSBub3Qgc2hvd25cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGZvcmVjYXN0RWwgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1iYXItY2hhcnRcIiB9KTtcclxuICAgIGNvbnN0IG1heEZvcmVjYXN0ID0gTWF0aC5tYXgoLi4uY291bnRzLCAxKTtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGFiZWxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHRoaXMuYWRkQmFyUm93KGZvcmVjYXN0RWwsIGxhYmVsc1tpXSwgY291bnRzW2ldLCBtYXhGb3JlY2FzdCwgaSA9PT0gMCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gXHUyNTAwXHUyNTAwIFRpbWVzZXJpZXMgY2hhcnQgKHBvcnQgb2YgcGxvdF90aW1lc2VyaWVzX3Jldmlld19sb2FkLnB5KSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcclxuICAgIC8vIFNob3dzIG51bUR1ZSBvdmVyIHRoZSBsYXN0IDMwIHN5bmMgc25hcHNob3RzLlxyXG4gICAgY29uc3QgbG9nID0gZGF0YS5yZXZpZXdMb2FkTG9nO1xyXG4gICAgaWYgKGxvZy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImg0XCIsIHsgdGV4dDogXCJEdWUgbm90ZXMgb3ZlciB0aW1lIChsYXN0IDMwIHN5bmNzKVwiIH0pO1xyXG4gICAgICBjb25zdCB0aW1lc2VyaWVzRWwgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcInNwYWNlZC1iYXItY2hhcnRcIiB9KTtcclxuICAgICAgY29uc3QgcmVjZW50ID0gbG9nLnNsaWNlKC0zMCk7XHJcbiAgICAgIGNvbnN0IG1heER1ZSA9IE1hdGgubWF4KC4uLnJlY2VudC5tYXAoKGUpID0+IGUubnVtRHVlKSwgMSk7XHJcbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgcmVjZW50KSB7XHJcbiAgICAgICAgY29uc3QgbGFiZWwgPSBlbnRyeS50aW1lc3RhbXAuc2xpY2UoNSwgMTApOyAvLyBcIk1NLUREXCJcclxuICAgICAgICB0aGlzLmFkZEJhclJvdyh0aW1lc2VyaWVzRWwsIGxhYmVsLCBlbnRyeS5udW1EdWUsIG1heER1ZSwgZmFsc2UpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuICAgICAgICB0ZXh0OiBcIk5vIHN5bmMgaGlzdG9yeSB5ZXQuIFJ1biAnU3luYyB2YXVsdCcgdG8gc3RhcnQgbG9nZ2luZy5cIixcclxuICAgICAgICBjbHM6IFwic3BhY2VkLW11dGVkXCIsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhZGRTdGF0KGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsIGxhYmVsOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGNvbnN0IHJvdyA9IGNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwic3BhY2VkLXN0YXQtcm93XCIgfSk7XHJcbiAgICByb3cuY3JlYXRlU3Bhbih7IHRleHQ6IGxhYmVsLCBjbHM6IFwic3BhY2VkLXN0YXQtbGFiZWxcIiB9KTtcclxuICAgIHJvdy5jcmVhdGVTcGFuKHsgdGV4dDogdmFsdWUsIGNsczogXCJzcGFjZWQtc3RhdC12YWx1ZVwiIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQHBhcmFtIGFjY2VudCAgaWYgdHJ1ZSwgdXNlcyAtLWNvbG9yLXJlZCBmb3IgdGhlIGJhciBmaWxsIChoaWdobGlnaHRzIG92ZXJkdWUpXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhZGRCYXJSb3coY29udGFpbmVyOiBIVE1MRWxlbWVudCwgbGFiZWw6IHN0cmluZywgdmFsdWU6IG51bWJlciwgbWF4OiBudW1iZXIsIGFjY2VudDogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgY29uc3Qgcm93ID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYmFyLXJvd1wiIH0pO1xyXG4gICAgcm93LmNyZWF0ZVNwYW4oeyB0ZXh0OiBsYWJlbCwgY2xzOiBcInNwYWNlZC1iYXItbGFiZWxcIiB9KTtcclxuICAgIGNvbnN0IHRyYWNrID0gcm93LmNyZWF0ZURpdih7IGNsczogXCJzcGFjZWQtYmFyLXRyYWNrXCIgfSk7XHJcbiAgICBjb25zdCBmaWxsID0gdHJhY2suY3JlYXRlRGl2KHsgY2xzOiBhY2NlbnQgPyBcInNwYWNlZC1iYXItZmlsbCBzcGFjZWQtYmFyLWZpbGwtYWNjZW50XCIgOiBcInNwYWNlZC1iYXItZmlsbFwiIH0pO1xyXG4gICAgZmlsbC5zdHlsZS53aWR0aCA9IGAke01hdGgucm91bmQoKHZhbHVlIC8gbWF4KSAqIDEwMCl9JWA7XHJcbiAgICByb3cuY3JlYXRlU3Bhbih7IHRleHQ6IFN0cmluZyh2YWx1ZSksIGNsczogXCJzcGFjZWQtYmFyLXZhbHVlXCIgfSk7XHJcbiAgfVxyXG5cclxuICBvbkNsb3NlKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gIH1cclxufVxyXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUVBLElB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TSxpQkFBaUIsUUFBUSxLQUFLLENBQUM7QUFBQSxJQUNqRTtBQUNBLGNBQVUsV0FBVyxJQUFJO0FBQUEsRUFDM0I7QUFBQSxFQUVBLE1BQU0sbUJBQW1CO0FBQ3ZCLGVBQVcsUUFBUSxLQUFLLElBQUksVUFBVSxnQkFBZ0IsZUFBZSxHQUFHO0FBQ3RFLFVBQUksS0FBSyxnQkFBZ0IsV0FBVztBQUNsQyxjQUFNLEtBQUssS0FBSyxPQUFPO0FBQUEsTUFDekI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBTSxZQUFZO0FBQ2hCLFNBQUssT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLGVBQWUsQ0FBQyxFQUFFO0FBQzNDLFVBQU0sVUFBVSxNQUFNLEtBQUssSUFBSTtBQUMvQixTQUFLLGdCQUFnQjtBQUNyQixVQUFNLEtBQUssb0JBQW9CO0FBQy9CLFVBQU0sS0FBSztBQUNYLFFBQUksd0JBQU8scUNBQXFDO0FBQUEsRUFDbEQ7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgIm5vdGVzIiwgIndlaWdodHMiLCAiZmlsZSIsICJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJub3RlcyJdCn0K
