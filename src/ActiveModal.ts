import { App, Component, Modal, MarkdownRenderer, TFile, setIcon } from "obsidian";
import { NoteRecord } from "./types";
import type SpacedEverythingPlugin from "./main";
import { saveStore } from "./store";
import { writeFrontmatterActive, writeFrontmatterDecks } from "./frontmatter";
import { createTiptapEditor, extractMarkdown } from "./tiptap-editor";
import type { Editor } from "@tiptap/core";
import { readNoteRecord } from "./frontmatter";
import { QuickNoteModal } from "./QuickNoteModal";

export class ActiveModal extends Modal {
  private renderComponent: Component | null = null;
  private tiptapEditor: Editor | null = null;
  private renderedContainer: HTMLElement | null = null;
  private tiptapContainer: HTMLElement | null = null;
  private isEditing = false;

  private remaining: NoteRecord[];
  private passed: NoteRecord[] = [];
  private failed: NoteRecord[] = [];
  private progressLog: ("pass" | "fail")[] = [];
  private currentRoundSize: number;
  private note!: NoteRecord;
  private titleEl: HTMLElement | null = null;
  private originalTitle = "";

  private allNotes: NoteRecord[] = [];

  constructor(
    app: App,
    private plugin: SpacedEverythingPlugin,
    notes: NoteRecord[],
    private deckName: string = "default",
  ) {
    super(app);
    this.allNotes = [...notes];
    this.remaining = [...notes];
    this.currentRoundSize = notes.length;
  }

  public resumeSession(state: {
    remaining: NoteRecord[];
    failed: NoteRecord[];
    progressLog: ("pass" | "fail")[];
    currentRoundSize: number;
  }) {
    this.remaining = state.remaining;
    this.failed = state.failed;
    this.progressLog = state.progressLog;
    this.currentRoundSize = state.currentRoundSize;
  }

  async onOpen() {
    if (this.remaining.length === 0 && this.failed.length > 0) {
      this.showSummary(false);
      return;
    }
    await this.render();
  }

  private async render() {
    if (this.remaining.length === 0) {
      this.showSummary(this.failed.length === 0);
      return;
    }
    const { contentEl } = this;
    contentEl.empty();
    this.note = this.remaining[0];
    const note = this.note;

    this.cleanupEditors();
    this.renderComponent = new Component();
    this.renderComponent.load();

    // Title row: title (left) + controls (right)
    const headerRow = contentEl.createDiv({ cls: "spaced-header-row" });

    // Title (clickable to open note)
    const title = note.filepath.split("/").pop()!.replace(/\.md$/, "");
    this.titleEl = headerRow.createEl("h1", { text: title, cls: "spaced-note-title" });
    this.originalTitle = title;
    this.titleEl.spellcheck = false;

    if (this.isEditing) {
      this.titleEl.contentEditable = "true";
      this.titleEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.titleEl!.blur();
        }
        if (e.key === "Escape") {
          this.titleEl!.textContent = this.originalTitle;
          this.titleEl!.blur();
        }
      });
      this.titleEl.addEventListener("blur", () => this.saveTitle());
    } else {
      this.titleEl.style.cursor = "pointer";
      this.titleEl.addEventListener("click", async () => {
        const file = this.app.vault.getAbstractFileByPath(note.filepath) as TFile;
        if (!file) return;
        await this.app.workspace.getLeaf(false).openFile(file);
      });
    }

    // Right: controls
    const headerRight = headerRow.createDiv({ cls: "spaced-header-right" });

    // Restart session button
    const restartBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    setIcon(restartBtn, "rotate-ccw");
    restartBtn.setAttribute("aria-label", "Restart session");
    restartBtn.addEventListener("click", () => this.restartSession(this.allNotes));

    // Edit button
    const editBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    setIcon(editBtn, this.isEditing ? "eye" : "pencil");
    editBtn.setAttribute("aria-label", this.isEditing ? "Switch to read view" : "Switch to edit view");
    editBtn.addEventListener("click", async () => {
      await this.saveTitle();
      await this.saveBodyEdits();
      this.isEditing = !this.isEditing;
      await this.render();
    });

    // New note button
    const newNoteBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    setIcon(newNoteBtn, "file-plus");
    newNoteBtn.setAttribute("aria-label", "New note");
    newNoteBtn.addEventListener("click", () => {
      new QuickNoteModal(this.app).open();
    });

    // Deck picker button
    const deckWrapper = headerRight.createDiv({ cls: "spaced-deck-wrapper" });
    const deckBtn = deckWrapper.createDiv({ cls: "spaced-deck-btn" });
    setIcon(deckBtn, "layers");
    deckBtn.setAttribute("aria-label", "Assign to decks");
    let deckDropdown: HTMLElement | null = null;
    deckBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (deckDropdown && document.contains(deckDropdown)) {
        deckDropdown.remove();
        deckDropdown = null;
        return;
      }
      deckDropdown = null;
      deckDropdown = this.createDeckDropdown(deckWrapper);
    });

    // Active checkbox (no label, larger)
    const activeCheckbox = headerRight.createEl("input", { cls: "spaced-active-checkbox" });
    activeCheckbox.type = "checkbox";
    const noteFileForActive = this.app.vault.getAbstractFileByPath(note.filepath) as TFile | null;
    activeCheckbox.checked = noteFileForActive
      ? this.app.metadataCache.getFileCache(noteFileForActive)?.frontmatter?.active === true
      : false;
    activeCheckbox.setAttribute("aria-label", "Add to active deck");
    activeCheckbox.addEventListener("change", async () => {
      const newActive = activeCheckbox.checked;
      this.note = { ...this.note, active: newActive };
      await writeFrontmatterActive(this.app, this.note.filepath, newActive);
    });

    // Counter
    contentEl.createEl("div", {
      text: `${this.remaining.length} remaining · ${this.failed.length} to retry`,
      cls: "spaced-due-count",
    });

    // Note content
    const file = this.app.vault.getAbstractFileByPath(note.filepath) as TFile;
    if (!file) {
      contentEl.createEl("p", { text: `File not found: ${note.filepath}` });
    } else {
      const raw = await this.app.vault.read(file);
      const { body } = this.stripFrontmatter(raw);
      this.renderedContainer = contentEl.createDiv({ cls: "spaced-note-content spaced-note-rendered" });
      this.tiptapContainer = contentEl.createDiv({ cls: "spaced-note-content" });
      if (this.isEditing) {
        this.renderedContainer.style.display = "none";
        this.tiptapEditor = createTiptapEditor(this.tiptapContainer, body);
      } else {
        this.tiptapContainer.style.display = "none";
        await MarkdownRenderer.render(this.app, body, this.renderedContainer, note.filepath, this.renderComponent!);
      }
    }

    // Pass / Fail buttons
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    const passBtn = btnRow.createEl("button", { text: "Not now/Pass", cls: "spaced-btn spaced-btn-pass" });
    const failBtn = btnRow.createEl("button", { text: "Retry", cls: "spaced-btn spaced-btn-fail" });
    const shuffleBtn = btnRow.createEl("button", { cls: "spaced-btn spaced-btn-icon" });
    setIcon(shuffleBtn, "shuffle");
    shuffleBtn.setAttribute("aria-label", "Shuffle remaining cards");
    shuffleBtn.addEventListener("click", async () => {
      this.remaining = this.shuffleArray(this.remaining);
      await this.render();
    });
    passBtn.addEventListener("click", () => this.respond("pass"));
    failBtn.addEventListener("click", () => this.respond("fail"));

    // Progress bar
    this.renderProgressBar(contentEl);
  }

  private renderProgressBar(container: HTMLElement) {
    const bar = container.createDiv({ cls: "spaced-active-progress-bar" });
    for (let i = 0; i < this.currentRoundSize; i++) {
      const result = this.progressLog[i];
      const seg = bar.createDiv({ cls: "spaced-active-progress-seg" });
      if (result === "pass") seg.addClass("spaced-active-progress-pass");
      else if (result === "fail") seg.addClass("spaced-active-progress-fail");
    }
  }

  private async saveBodyEdits(): Promise<void> {
    if (!this.tiptapEditor || !this.isEditing) return;
    const markdown = extractMarkdown(this.tiptapEditor);
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
    if (!file) return;
    const existing = await this.app.vault.read(file);
    const { frontmatter, body } = this.stripFrontmatter(existing);
    if (markdown.trim() === body.trim()) return;
    await this.app.vault.modify(file, frontmatter ? `${frontmatter}\n${markdown}` : markdown);
  }

  private async respond(result: "pass" | "fail") {
    await this.saveTitle();
    await this.saveBodyEdits();
    const note = this.remaining.shift()!;
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

  private showSummary(isDone: boolean) {
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
    const actionBtn = btnRow.createEl("button", {
      text: isDone ? "Restart session" : "Next round",
      cls: "mod-cta",
    });
    actionBtn.addEventListener("click", () => this.restartSession(isDone ? this.allNotes : this.failed));
    btnRow.createEl("button", { text: "Close" }).addEventListener("click", () => this.close());
  }

  private async clearSession() {
    if (this.plugin.data.cramSessions) {
      delete this.plugin.data.cramSessions[this.deckName];
    }
    await saveStore(this.plugin, this.plugin.data);
  }

  private async saveSession() {
    this.plugin.data.cramSessions = this.plugin.data.cramSessions ?? {};
    this.plugin.data.cramSessions[this.deckName] = {
      remaining: this.remaining.map((n) => n.filepath),
      failed: this.failed.map((n) => n.filepath),
      progressLog: [...this.progressLog],
      currentRoundSize: this.currentRoundSize,
    };
    await saveStore(this.plugin, this.plugin.data);
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private getAllDeckNames(): string[] {
    const deckSet = new Set<string>();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      const decks = cache?.frontmatter?.decks;
      if (Array.isArray(decks)) {
        decks.forEach((d: string) => {
          if (d) deckSet.add(d);
        });
      } else if (typeof decks === "string" && decks) {
        deckSet.add(decks);
      }
    }
    return Array.from(deckSet).sort();
  }

  private createDeckDropdown(anchor: HTMLElement): HTMLElement {
    const allDecks = this.getAllDeckNames();

    const noteFile = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
    const cache = noteFile ? this.app.metadataCache.getFileCache(noteFile) : null;
    const rawDecks = cache?.frontmatter?.decks;
    const currentDecks: string[] = Array.isArray(rawDecks)
      ? [...rawDecks]
      : typeof rawDecks === "string" && rawDecks
        ? [rawDecks]
        : [];

    const dropdown = anchor.createDiv({ cls: "spaced-deck-dropdown" });

    const searchInput = dropdown.createEl("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search decks…";
    searchInput.addClass("spaced-deck-search");

    const listEl = dropdown.createDiv({ cls: "spaced-deck-list" });

    // Helper: create a new deck and assign it to the note
    const addDeck = async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || currentDecks.includes(trimmed)) return;
      currentDecks.push(trimmed);
      allDecks.push(trimmed);
      allDecks.sort();
      await writeFrontmatterDecks(this.app, this.note.filepath, currentDecks);
      await this.autoActivateNote();
      searchInput.value = "";
      renderList("");
    };

    const renderList = (filter: string) => {
      listEl.empty();
      const filtered = allDecks.filter((d) => d.toLowerCase().includes(filter.toLowerCase()));

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
            await this.autoActivateNote();
          }
          await writeFrontmatterDecks(this.app, this.note.filepath, currentDecks);
        });
      }

      // Always show "Add deck" at the bottom when the user has typed something
      if (filter.trim()) {
        const addItem = listEl.createDiv({ cls: "spaced-deck-item spaced-deck-add" });
        const iconEl = addItem.createDiv({ cls: "spaced-deck-add-icon" });
        setIcon(iconEl, "circle-plus");
        addItem.createSpan({ text: `Add "${filter.trim()}"` });
        addItem.addEventListener("mousedown", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await addDeck(filter.trim());
        });
      }
    };

    renderList("");
    searchInput.addEventListener("input", () => renderList(searchInput.value));

    searchInput.addEventListener("keydown", async (e) => {
      if (e.key !== "Enter") return;
      const filter = searchInput.value.trim();
      if (!filter) return;
      const filtered = allDecks.filter((d) => d.toLowerCase().includes(filter.toLowerCase()));
      if (filtered.length === 1) {
        // Single match — toggle it
        const deck = filtered[0];
        const idx = currentDecks.indexOf(deck);
        if (idx >= 0) {
          currentDecks.splice(idx, 1);
        } else {
          currentDecks.push(deck);
        }
        await writeFrontmatterDecks(this.app, this.note.filepath, currentDecks);
        renderList(filter);
      } else if (filtered.length === 0) {
        // No matches — create the new deck
        await addDeck(filter);
      }
      e.preventDefault();
    });

    // Close on outside click
    const outsideHandler = (e: MouseEvent) => {
      if (!document.contains(dropdown) || !dropdown.contains(e.target as Node)) {
        dropdown.remove();
        document.removeEventListener("mousedown", outsideHandler);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", outsideHandler), 0);
    searchInput.focus();
    return dropdown;
  }

  private async saveTitle(): Promise<void> {
    if (!this.isEditing || !this.titleEl) return;
    const newName = (this.titleEl.textContent ?? "").trim();
    if (!newName || newName === this.originalTitle) return;
    const f = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
    if (!f) return;
    const dir = this.note.filepath.includes("/")
      ? this.note.filepath.substring(0, this.note.filepath.lastIndexOf("/"))
      : "";
    const newPath = dir ? `${dir}/${newName}.md` : `${newName}.md`;
    await this.app.vault.rename(f, newPath);
    this.note = { ...this.note, filepath: newPath };
    this.originalTitle = newName;  
  }

  private getActiveNotes(notes: NoteRecord[]): NoteRecord[] {
    return notes.filter((n) => {
      const f = this.app.vault.getAbstractFileByPath(n.filepath) as TFile | null;
      return f ? this.app.metadataCache.getFileCache(f)?.frontmatter?.active === true : false;
    });
  }

  private async restartSession(sourceNotes: NoteRecord[]) {
    this.remaining = this.getActiveNotes(sourceNotes);
    this.passed = [];
    this.failed = [];
    this.progressLog = [];
    this.currentRoundSize = this.remaining.length;
    await this.render();
  }

  private cleanupEditors() {
    this.tiptapEditor?.destroy();
    this.tiptapEditor = null;
    this.renderComponent?.unload();
    this.renderComponent = null;
  }

  private async autoActivateNote(): Promise<void> {
    if (this.note.active) return;
    this.note = { ...this.note, active: true };
    await writeFrontmatterActive(this.app, this.note.filepath, true);
    const cb = this.contentEl.querySelector<HTMLInputElement>(".spaced-active-checkbox");
    if (cb) cb.checked = true;
  }

  private stripFrontmatter(raw: string): { frontmatter: string; body: string } {
    if (raw.startsWith("---")) {
      const end = raw.indexOf("\n---", 3);
      if (end !== -1) return { frontmatter: raw.slice(0, end + 4), body: raw.slice(end + 4).trimStart() };
    }
    return { frontmatter: "", body: raw };
  }

  onClose() {
    void this.saveTitle();
    void this.saveBodyEdits();
    this.cleanupEditors();
    this.contentEl.empty();
    if (this.remaining.length > 0 || this.failed.length > 0) {
      void this.saveSession();
    }
  }
}

export class DeckPickerModal extends Modal {
  constructor(
    app: App,
    private plugin: SpacedEverythingPlugin,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Choose a deck" });

    // Collect deck → notes mapping from metadataCache
    const deckMap = new Map<string, NoteRecord[]>();

    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (!fm?.active) continue;

      const decks: string[] = Array.isArray(fm.decks) && fm.decks.length > 0 ? fm.decks : ["default"];
      const record: NoteRecord = readNoteRecord(
        this.app,
        file,
        this.plugin.settings.defaultEaseFactor,
        this.plugin.settings.initialInterval,
      );

      for (const deck of decks) {
        if (!deckMap.has(deck)) deckMap.set(deck, []);
        deckMap.get(deck)!.push(record);
      }
    }

    if (deckMap.size === 0) {
      contentEl.createEl("p", { text: "No active notes found." });
      return;
    }

    // Sort: most recently used first; "default" always listed
    const lastUsed = this.plugin.data.deckLastUsed ?? {};
    const sorted = [...deckMap.keys()].sort((a, b) => {
      const ta = lastUsed[a] ?? "";
      const tb = lastUsed[b] ?? "";
      return tb.localeCompare(ta); // descending
    });

    for (const deckName of sorted) {
      const notes = deckMap.get(deckName)!;
      const btn = contentEl.createEl("button", {
        text: `${deckName === "default" ? "Default deck" : deckName} (${notes.length})`,
        cls: "mod-cta",
      });
      btn.style.display = "block";
      btn.style.marginBottom = "8px";
      btn.addEventListener("click", () => {
        // Record last used
        this.plugin.data.deckLastUsed = { ...lastUsed, [deckName]: new Date().toISOString() };
        this.close();
        const modal = new ActiveModal(this.app, this.plugin, notes, deckName);
        // Resume saved session if available
        const saved = this.plugin.data.cramSessions?.[deckName];
        if (saved && (saved.remaining.length > 0 || saved.failed.length > 0)) {
          const allNotes = [...notes];
          const toRecord = (fp: string): NoteRecord | undefined => allNotes.find((n) => n.filepath === fp);
          const filterRecords = (fps: string[]) => fps.map(toRecord).filter((n): n is NoteRecord => n !== undefined);

          const remaining = filterRecords(saved.remaining);
          const failed = filterRecords(saved.failed);

          // Only resume if there's actually something left after filtering out renamed/deleted notes
          if (remaining.length > 0 || failed.length > 0) {
            const missingCount = saved.remaining.length - remaining.length + saved.failed.length - failed.length;

            modal.resumeSession({
              remaining,
              failed,
              progressLog: saved.progressLog,
              currentRoundSize: saved.currentRoundSize - missingCount,
            });
          }
        }
        modal.open();
      });
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
