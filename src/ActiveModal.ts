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
  private pendingSaveTitle: (() => Promise<void>) | null = null;

  private remaining: NoteRecord[];
  private passed: NoteRecord[] = [];
  private failed: NoteRecord[] = [];
  private progressLog: ("pass" | "fail")[] = [];
  private currentRoundSize: number;
  private note!: NoteRecord;

  constructor(
    app: App,
    private plugin: SpacedEverythingPlugin,
    notes: NoteRecord[],
    private deckName: string = "default",
  ) {
    super(app);
    this.remaining = [...notes];
    this.currentRoundSize = notes.length;
  }

  public resumeSession(state: {
    remaining: NoteRecord[];
    passed: NoteRecord[];
    failed: NoteRecord[];
    progressLog: ("pass" | "fail")[];
    currentRoundSize: number;
  }) {
    this.remaining = state.remaining;
    this.passed = state.passed;
    this.failed = state.failed;
    this.progressLog = state.progressLog;
    this.currentRoundSize = state.currentRoundSize;
  }

  async onOpen() {
    if (this.remaining.length === 0 && this.failed.length > 0) {
      this.showRoundSummary();
      return;
    }
    await this.render();
  }

  private async render() {
    const { contentEl } = this;
    contentEl.empty();
    this.note = this.remaining[0];
    const note = this.note;

    if (this.tiptapEditor) {
      this.tiptapEditor.destroy();
      this.tiptapEditor = null;
    }
    if (this.renderComponent) {
      this.renderComponent.unload();
    }
    this.renderComponent = new Component();
    this.renderComponent.load();

    // Title row: title (left) + controls (right)
    const headerRow = contentEl.createDiv({ cls: "spaced-header-row" });

    // Title (clickable to open note)
    const title = note.filepath.split("/").pop()!.replace(/\.md$/, "");
    const titleEl = headerRow.createEl("h1", { text: title, cls: "spaced-note-title" });
    titleEl.spellcheck = false;

    if (this.isEditing) {
      titleEl.contentEditable = "true";
      this.pendingSaveTitle = async () => {
        const newName = (titleEl.textContent ?? "").trim();
        if (!newName || newName === title) return;
        const f = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
        if (!f) return;
        const dir = this.note.filepath.includes("/")
          ? this.note.filepath.substring(0, this.note.filepath.lastIndexOf("/"))
          : "";
        const newPath = dir ? `${dir}/${newName}.md` : `${newName}.md`;
        await this.app.vault.rename(f, newPath);
        this.note = { ...this.note, filepath: newPath };
        this.pendingSaveTitle = null;
      };
      titleEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          titleEl.blur();
        }
        if (e.key === "Escape") {
          titleEl.textContent = title;
          titleEl.blur();
        }
      });
      titleEl.addEventListener("blur", async () => {
        await this.pendingSaveTitle?.();
      });
    } else {
      titleEl.style.cursor = "pointer";
      titleEl.addEventListener("click", async () => {
        const file = this.app.vault.getAbstractFileByPath(note.filepath) as TFile;
        if (!file) return;
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);
      });
      this.pendingSaveTitle = null;
    }

    // Right: controls
    const headerRight = headerRow.createDiv({ cls: "spaced-header-right" });

    // Restart session button
    const restartBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    setIcon(restartBtn, "rotate-ccw");
    restartBtn.setAttribute("aria-label", "Restart session");
    restartBtn.addEventListener("click", async () => {
      const allNotes = [...this.remaining, ...this.passed, ...this.failed].filter((n) => {
        const f = this.app.vault.getAbstractFileByPath(n.filepath) as TFile | null;
        return f ? this.app.metadataCache.getFileCache(f)?.frontmatter?.active === true : false;
      });
      this.remaining = allNotes;
      this.passed = [];
      this.failed = [];
      this.progressLog = [];
      this.currentRoundSize = allNotes.length;
      await this.render();
    });

    // Edit button
    const editBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    setIcon(editBtn, this.isEditing ? "eye" : "pencil");
    editBtn.setAttribute("aria-label", this.isEditing ? "Switch to read view" : "Switch to edit view");
    editBtn.addEventListener("click", async () => {
      await this.pendingSaveTitle?.();
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
      let body = raw;
      if (raw.startsWith("---")) {
        const end = raw.indexOf("\n---", 3);
        if (end !== -1) body = raw.slice(end + 4).trimStart();
      }
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
    let frontmatter = "";
    let body = existing;
    if (existing.startsWith("---")) {
      const end = existing.indexOf("\n---", 3);
      if (end !== -1) {
        frontmatter = existing.slice(0, end + 4);
        body = existing.slice(end + 4).trimStart();
      }
    }
    if (markdown.trim() === body.trim()) return;
    await this.app.vault.modify(file, frontmatter ? `${frontmatter}\n${markdown}` : markdown);
  }

  private async respond(result: "pass" | "fail") {
    await this.pendingSaveTitle?.();
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
        await this.showDone();
      } else {
        this.showRoundSummary();
      }
      return;
    }
    await this.render();
  }

  private showRoundSummary() {
    if (this.renderComponent) {
      this.renderComponent.unload();
      this.renderComponent = null;
    }
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Round complete!" });
    contentEl.createEl("p", { text: `Notes passed: ${this.passed.length}` });
    contentEl.createEl("p", { text: `Notes failed: ${this.failed.length}` });

    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });

    const nextBtn = btnRow.createEl("button", { text: "Next round", cls: "mod-cta" });
    nextBtn.addEventListener("click", async () => {
      this.remaining = this.failed.filter((n) => {
        const f = this.app.vault.getAbstractFileByPath(n.filepath) as TFile | null;
        return f ? this.app.metadataCache.getFileCache(f)?.frontmatter?.active === true : false;
      });
      this.passed = [];
      this.failed = [];
      this.progressLog = [];
      this.currentRoundSize = this.remaining.length;
      await this.render();
    });

    const closeBtn = btnRow.createEl("button", { text: "Close" });
    closeBtn.addEventListener("click", () => this.close());
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
      passed: this.passed.map((n) => n.filepath),
      failed: this.failed.map((n) => n.filepath),
      progressLog: [...this.progressLog],
      currentRoundSize: this.currentRoundSize,
    };
    await saveStore(this.plugin, this.plugin.data);
  }

  private async showDone() {
    await this.clearSession();
    if (this.renderComponent) {
      this.renderComponent.unload();
      this.renderComponent = null;
    }
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "All done!" });

    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });

    const restartBtn = btnRow.createEl("button", { text: "Restart session", cls: "mod-cta" });
    restartBtn.addEventListener("click", async () => {
      this.remaining = this.passed.filter((n) => {
        const f = this.app.vault.getAbstractFileByPath(n.filepath) as TFile | null;
        return f ? this.app.metadataCache.getFileCache(f)?.frontmatter?.active === true : false;
      });
      this.passed = [];
      this.failed = [];
      this.progressLog = [];
      this.currentRoundSize = this.remaining.length;
      await this.render();
    });

    const closeBtn = btnRow.createEl("button", { text: "Close" });
    closeBtn.addEventListener("click", () => this.close());
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

  private createDeckDropdown(anchor: HTMLElement): { dropdown: HTMLElement; outsideHandler: (e: MouseEvent) => void } {
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
      // Auto-activate the note when a deck is assigned
      if (!this.note.active) {
        this.note = { ...this.note, active: true };
        await writeFrontmatterActive(this.app, this.note.filepath, true);
        const activeCheckbox = this.contentEl.querySelector<HTMLInputElement>(".spaced-active-checkbox");
        if (activeCheckbox) activeCheckbox.checked = true;
      }
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
            // Auto-activate the note when assigned to a deck
            if (!this.note.active) {
              this.note = { ...this.note, active: true };
              await writeFrontmatterActive(this.app, this.note.filepath, true);
              const activeCheckbox = this.contentEl.querySelector<HTMLInputElement>(".spaced-active-checkbox");
              if (activeCheckbox) activeCheckbox.checked = true;
            }
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
    return { dropdown, outsideHandler };
  }

  close() {
    if (this.isEditing) {
      void Promise.all([this.pendingSaveTitle?.(), this.saveBodyEdits()]).then(() => {
        this.isEditing = false;
        super.close();
      });
      return;
    }
    super.close();
  }

  onClose() {
    void this.pendingSaveTitle?.();
    void this.saveBodyEdits();
    if (this.tiptapEditor) {
      this.tiptapEditor.destroy();
      this.tiptapEditor = null;
    }
    if (this.renderComponent) {
      this.renderComponent.unload();
      this.renderComponent = null;
    }
    this.contentEl.empty();
    // Save session state if mid-session
    if (this.remaining.length > 0 || this.passed.length > 0 || this.failed.length > 0) {
      this.saveSession(); // fire-and-forget is fine here
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
        if (saved) {
          const allNotes = [...notes]; // full deck for filepath lookup
          const toRecord = (fp: string) => allNotes.find((n) => n.filepath === fp) ?? notes[0];
          modal.resumeSession({
            remaining: saved.remaining.map(toRecord),
            passed: saved.passed.map(toRecord),
            failed: saved.failed.map(toRecord),
            progressLog: saved.progressLog,
            currentRoundSize: saved.currentRoundSize,
          });
        }
        modal.open();
      });
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
