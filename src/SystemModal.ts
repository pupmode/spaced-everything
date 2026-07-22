import { App, Notice, setIcon, TFile } from "obsidian";
import { ActionNote, SystemSession } from "./types";
import type SpacedEverythingPlugin from "./main";
import { saveStore } from "./store";
import { BaseNoteModal } from "./BaseNoteModal";
import {
  shuffleArray,
  getCurrentTimeblock,
  filterByEnergyLevel,
  filterByTimeblock,
  filterByContext,
  getAllContextValues,
  isDue,
  today
} from "./utils";
import {
  writeFrontmatterActive,
  writeFrontmatterRecurringComplete,
  writeFrontmatterSkip,
  readNoteRecord,
} from "./frontmatter";;
import { SubtaskModal } from "./SubtaskModal";

export class SystemModal extends BaseNoteModal {
  protected plugin: SpacedEverythingPlugin;
  protected note!: ActionNote;

  private allActionNotes: ActionNote[] = [];
  private remaining: ActionNote[] = [];
  private passed: ActionNote[] = [];
  private failed: ActionNote[] = [];
  private progressLog: ("pass" | "fail" | "skip")[] = [];
  private currentRoundSize = 0;
  private energyLevel: "high" | "low" | null = null;
  private activeTimeblocks: string[] = [];
  private activeContexts: string[] = [];

  protected showRestartButton = true;

  constructor(app: App, plugin: SpacedEverythingPlugin) {
    super(app);
    this.plugin = plugin;
  }

  // ── BaseNoteModal hooks ────────────────────────────────────────────────────

  protected async renderModal(): Promise<void> {
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

  protected async renderExtraContent(contentEl: HTMLElement): Promise<void> {
    const skipCount = this.note.skipped ?? 0;
    if (skipCount >= 2) {
      this.renderLeechBanner(contentEl);
    }
  }

  protected getStatusText(): string {
    return `${this.remaining.length} remaining · ${this.failed.length} to retry`;
  }

  protected getProgressSegments(): string[] {
    const segments: string[] = [];
    for (let i = 0; i < this.currentRoundSize; i++) {
      const log = this.progressLog[i];
      if (log === "pass") segments.push("spaced-progress-pass");
      else if (log === "fail") segments.push("spaced-progress-fail");
      else if (log === "skip") segments.push("spaced-progress-skip");
      else segments.push("");
    }
    return segments;
  }

  protected renderButtons(container: HTMLElement): void {
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
      },
    });
    this.addBtn(btnRow, { icon: "route", cls: "route", tooltip: "Route →", cb: () => this.routeNote() });

    // ── Subtask button ────────────────────────────────────────────────────────
    const subtaskNotes = this.getSubtaskNotes();
    const subtaskBtn = this.addBtn(btnRow, {
      icon: "list-checks",
      cls: "subtasks",
      tooltip:
        subtaskNotes.length > 0
          ? `Open ${subtaskNotes.length} subtask${subtaskNotes.length !== 1 ? "s" : ""}`
          : "No subtasks in this note",
      cb: () => {
        if (subtaskNotes.length === 0) return;
        new SubtaskModal(this.app, this.plugin, subtaskNotes).open();
      },
    });
    if (subtaskNotes.length === 0) subtaskBtn.setDisabled(true);
  }

  private async skipNote(): Promise<void> {
    await this.saveTitle();
    await this.saveBodyEdits();
    const note = this.remaining.shift()!;
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

  private applyFiltersInline(): void {
    const processed = new Set([...this.passed.map((n) => n.filepath), ...this.failed.map((n) => n.filepath)]);

    // Keep current note at front if still valid
    const currentPath = this.note?.filepath;
    this.buildFilteredRemaining(this.allActionNotes, processed);

    const currentStillValid = this.remaining.find((n) => n.filepath === currentPath);
    if (currentStillValid) {
      this.remaining = [currentStillValid, ...this.remaining.filter((n) => n.filepath !== currentPath)];
    }

    const total = this.remaining.length + this.passed.length + this.failed.length;
    this.currentRoundSize = this.progressLog.length + this.remaining.length;
    this.refreshProgressBar();
  }

  protected renderExtraHeaderButtons(headerRight: HTMLElement): void {
    // ── Timeblock picker ────────────────────────────────────────────────────
    let tbDropdown: HTMLElement | null = null;
    const tbBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    setIcon(tbBtn, "clock");
    tbBtn.setAttribute(
      "aria-label",
      `Timeblock: ${this.activeTimeblocks.length ? this.activeTimeblocks.join(", ") : "All"}`,
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

      const onOutside = (e: MouseEvent) => {
        if (!tbDropdown || !document.contains(tbDropdown)) {
          document.removeEventListener("mousedown", onOutside);
          return;
        }
        if (!tbDropdown.contains(e.target as Node) && !tbBtn.contains(e.target as Node)) {
          tbDropdown.remove();
          tbDropdown = null;
          document.removeEventListener("mousedown", onOutside);
        }
      };
      document.addEventListener("mousedown", onOutside);
    });

    // ── Context picker ───────────────────────────────────────────────────────
    let ctxDropdown: HTMLElement | null = null;
    const ctxBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    setIcon(ctxBtn, "tag");
    ctxBtn.setAttribute(
      "aria-label",
      `Context: ${this.activeContexts.length ? this.activeContexts.join(", ") : "All"}`,
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
          void this.applyFiltersInline(); // ← no onOutside here
        });
      }

      // onOutside is here, in the button click handler — not inside the checkbox handler
      const onOutside = (e: MouseEvent) => {
        if (!ctxDropdown || !document.contains(ctxDropdown)) {
          document.removeEventListener("mousedown", onOutside);
          return;
        }
        if (!ctxDropdown.contains(e.target as Node) && !ctxBtn.contains(e.target as Node)) {
          ctxDropdown.remove();
          ctxDropdown = null;
          document.removeEventListener("mousedown", onOutside);
        }
      };
      document.addEventListener("mousedown", onOutside);
    });
  }

  protected onRestartClick(): void {
    void this.restartSession();
  }

  protected onSessionClose(): void {
    if (this.remaining.length > 0 || this.failed.length > 0) {
      void this.saveSession();
    }
  }

  // ── Screens ────────────────────────────────────────────────────────────────

  private showEnergyPicker(): void {
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
      },
    });
    this.addBtn(btnRow, {
      label: "Low energy",
      cls: "energy-low",
      cb: () => {
        this.energyLevel = "low";
        void this.startSession("low");
      },
    });
  }

  private async startSession(level: "high" | "low"): Promise<void> {
    this.energyLevel = level;
    this.activeTimeblocks = [getCurrentTimeblock()];
    this.allActionNotes = this.loadActionNotes();

    if (this.allActionNotes.length === 0) {
      new Notice("No action notes found in vault.");
      this.showEmptyState();
      return;
    }

    const processed = new Set<string>();
    if (!this.buildFilteredRemaining(this.allActionNotes, processed)) {
      new Notice("No actions match current filters. Showing all active actions.");
      this.activeTimeblocks = [];
      this.activeContexts = [];
      this.buildFilteredRemaining(this.allActionNotes, processed);
    }
    this.passed = [];
    this.failed = [];
    this.progressLog = [];
    await this.renderModal();
  }

  private async nextRound(): Promise<void> {
    const sourceNotes = [...this.failed];
    this.passed = [];
    this.failed = [];
    this.progressLog = [];
    const processed = new Set<string>();
    this.buildFilteredRemaining(sourceNotes, processed);
    await this.renderModal();
  }

  private async resumeSession(saved: SystemSession): Promise<void> {
    delete this.plugin.data.systemSession;

    this.allActionNotes = this.loadActionNotes();
    this.remaining = saved.remaining
      .map((fp) => this.allActionNotes.find((n) => n.filepath === fp))
      .filter((n): n is ActionNote => n !== undefined);
    this.failed = saved.failed
      .map((fp) => this.allActionNotes.find((n) => n.filepath === fp))
      .filter((n): n is ActionNote => n !== undefined);
    this.progressLog = [...saved.progressLog];
    this.currentRoundSize = saved.currentRoundSize;
    this.energyLevel = saved.energyLevel;
    this.activeTimeblocks = saved.activeTimeblocks ?? [];
    this.activeContexts = [...saved.activeContexts];
    await this.renderModal();
  }

  private async showSummary(isDone: boolean): Promise<void> {
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
      cb: () => (isDone ? void this.restartSession() : void this.nextRound()),
    });
    this.addBtn(btnRow, { label: "Close", cls: "summary-close", cb: () => this.close() });
  }

  private async restartSession(): Promise<void> {
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
  private async respond(result: "pass" | "fail"): Promise<void> {
    await this.saveTitle();
    await this.saveBodyEdits();
    const note = this.remaining.shift()!;
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

  private renderLeechBanner(container: HTMLElement): void {
    const count = this.note.skipped ?? 0;
    const banner = container.createDiv({ cls: "spaced-leech-banner" });
    banner.createSpan({ text: `⚠️ Skipped ${count}× — consider rescheduling or breaking this down.` });

    const actions = banner.createDiv({ cls: "spaced-leech-actions" });
    this.addBtn(actions, {
      label: "Edit",
      cls: "leech-edit",
      cb: async () => {
        this.isEditing = true;
        await this.renderModal();
      },
    });
    this.addBtn(actions, {
      label: "Wrong context?",
      cls: "leech-context",
      cb: () => {
        new Notice("Use the clock or tag buttons in the header to adjust your timeblock or context filters.");
      },
    });
    this.addBtn(actions, {
      label: "Deactivate",
      cls: "leech-deactivate",
      cb: async () => {
        this.remaining.shift();
        this.note = { ...this.note, active: false };
        await writeFrontmatterActive(this.app, this.note.filepath, false);
        await this.renderModal();
      },
    });
  }

  private getSkippedToday(): Set<string> {
    const entry = this.plugin.data.systemSkippedToday;
    if (!entry || entry.date !== today()) return new Set();
    return new Set(entry.filepaths);
  }

  // ── Note discovery ──────────────────

  private loadActionNotes(): ActionNote[] {
    const skippedToday = this.getSkippedToday();
    const notes: ActionNote[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (fm?.active !== true) continue;
      if (!fm.energy && !fm.timeblock && !fm.timescope) continue; // overflow guard
      if (fm.timescope && !isDue(fm)) continue; // recurrence gate
      if (skippedToday.has(file.path)) continue; // skipped today
      notes.push({
        filepath: file.path,
        active: true,
        energy: fm.energy,
        timeblock: fm.timeblock,
        due: fm.due,
        context: fm.context,
        timescope: fm.timescope,
        last_completed: fm.last_completed,
        skipped: fm.skipped,
      } as ActionNote);
    }
    return notes;
  }

  private showEmptyState(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "No action notes found in vault" });
    contentEl.createEl("p", {
      text: "Add notes with active: true and at least one of energy, timeblock, or timescope to use the System modal.",
      cls: "spaced-empty-desc",
    });
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    this.addBtn(btnRow, { label: "Close", cls: "close", cb: () => this.close() });
  }

  private static readonly SESSION_SIZE = 20;
  private static readonly DUE_SLOTS = 10;

  private buildFilteredRemaining(sourceNotes: ActionNote[], processed: Set<string>): boolean {
    const byEnergy = this.energyLevel ? filterByEnergyLevel(sourceNotes, this.energyLevel) : sourceNotes;
    const byTimeblock = filterByTimeblock(byEnergy, this.activeTimeblocks);
    const byContext = filterByContext(byTimeblock, this.activeContexts);
    const unprocessed = byContext.filter((n) => !processed.has(n.filepath));

    const withDue = unprocessed
      .filter((n) => !!n.due)
      .sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime());
    const noDueAll = unprocessed.filter((n) => !n.due);
    const skippedBefore = noDueAll
      .filter((n) => (n.skipped ?? 0) > 0)
      .sort((a, b) => (b.skipped ?? 0) - (a.skipped ?? 0)); // most-skipped first
    const neverSkipped = shuffleArray(noDueAll.filter((n) => !(n.skipped ?? 0)));
    const withoutDue = [...skippedBefore, ...neverSkipped];

    const dueSlice = withDue.slice(0, SystemModal.DUE_SLOTS);
    const noDueSlice = withoutDue.slice(0, SystemModal.SESSION_SIZE - dueSlice.length);

    this.remaining = [...dueSlice, ...noDueSlice];
    this.currentRoundSize = this.remaining.length;
    return this.remaining.length > 0;
  }

  // ── Session persistence ────────────────────────────────────────────────────

  private async clearSession(): Promise<void> {
    delete this.plugin.data.systemSession;
    await saveStore(this.plugin, this.plugin.data);
  }

  private async saveSession(): Promise<void> {
    this.plugin.data.systemSession = {
      remaining: this.remaining.map((n) => n.filepath),
      failed: this.failed.map((n) => n.filepath),
      progressLog: [...this.progressLog],
      currentRoundSize: this.currentRoundSize,
      energyLevel: this.energyLevel,
      activeTimeblocks: this.activeTimeblocks,
      activeContexts: [...this.activeContexts],
    };
    await saveStore(this.plugin, this.plugin.data);
  }
  // Subtask Modal
  private getSubtaskNotes(): NoteRecord[] {
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
    if (!file) return [];
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return [];

    // Find lines that are task list items
    const taskLines = new Set(
      (cache.listItems ?? [])
        .filter((item) => item.task !== undefined) // task items only (not plain list items)
        .map((item) => item.position.start.line),
    );

    const notes: NoteRecord[] = [];
    for (const link of cache.links ?? []) {
      // Only include links that appear on a task list line
      if (!taskLines.has(link.position.start.line)) continue;
      const target = this.app.metadataCache.getFirstLinkpathDest(link.link, this.note.filepath);
      if (!target || !(target instanceof TFile)) continue;
      notes.push(
        readNoteRecord(this.plugin, target),
      );
    }
    return notes;
  }
}

