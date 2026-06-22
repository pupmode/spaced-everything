import { App, Component, Modal, MarkdownRenderer, TFile, setIcon } from "obsidian";
import { NoteRecord } from "./types";
import type SpacedEverythingPlugin from "./main";
import { saveStore } from "./store";
import { writeFrontmatterActive, writeFrontmatterDecks } from "./frontmatter";

export class ActiveModal extends Modal {
  private renderComponent: Component | null = null;

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
    titleEl.style.cursor = "pointer";
    titleEl.addEventListener("click", async () => {
      const file = this.app.vault.getAbstractFileByPath(note.filepath) as TFile;
      if (!file) return;
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.openFile(file);
    });

    // Right: controls
    const headerRight = headerRow.createDiv({ cls: "spaced-header-right" });

    // Restart session button
    const restartBtn = headerRight.createDiv({ cls: "spaced-restart-btn" });
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
      const record = this.plugin.data.notes[this.note.sha1sum];
      if (record) record.active = newActive;
      this.note = { ...this.note, active: newActive };
      await saveStore(this.plugin, this.plugin.data);
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
      const content = await this.app.vault.read(file);
      const renderEl = contentEl.createDiv({ cls: "spaced-note-content" });
      await MarkdownRenderer.render(this.app, content, renderEl, note.filepath, this.renderComponent);
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

  private async respond(result: "pass" | "fail") {
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
      // Auto-activate the note when a deck is assigned
      if (!this.note.active) {
        this.note = { ...this.note, active: true };
        const record = this.plugin.data.notes[this.note.sha1sum];
        if (record) record.active = true;
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
        item.addEventListener("mousedown", async (e) => {
          e.preventDefault();
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
              const record = this.plugin.data.notes[this.note.sha1sum];
              if (record) record.active = true;
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
    return dropdown;
  }

  onClose() {
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
