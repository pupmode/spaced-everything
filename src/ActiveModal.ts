import { App, Component, Modal, MarkdownRenderer, TFile, setIcon } from "obsidian";
import { NoteRecord } from "./types";
import type SpacedEverythingPlugin from "./main";
import { saveStore } from "./store";
import { writeFrontmatterActive, writeFrontmatterDecks, stripFrontmatter } from "./frontmatter";
import { createTiptapEditor, extractMarkdown } from "./tiptap-editor";
import { QuickNoteModal } from "./QuickNoteModal";
import { createDeckDropdown } from "./deckDropdown";
import { BaseNoteModal } from "./BaseNoteModal";

export class ActiveModal extends BaseNoteModal {
  private remaining: NoteRecord[];
  private passed: NoteRecord[] = [];
  private failed: NoteRecord[] = [];
  private progressLog: ("pass" | "fail")[] = [];
  private currentRoundSize: number;
  protected note!: NoteRecord;
  private allNotes: NoteRecord[] = [];

  constructor(
    app: App,
    protected plugin: SpacedEverythingPlugin,
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
    this.setupVaultListener(); 
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
      new QuickNoteModal(this.app, this.plugin, this.deckName).open();
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
      const noteFile = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
      const rawDecks = noteFile ? this.app.metadataCache.getFileCache(noteFile)?.frontmatter?.decks : undefined;
      const initialDecks: string[] = Array.isArray(rawDecks)
        ? [...rawDecks]
        : typeof rawDecks === "string" && rawDecks
          ? [rawDecks]
          : [];

      const result = createDeckDropdown(this.app, deckWrapper, initialDecks, async (decks) => {
        await writeFrontmatterDecks(this.app, this.note.filepath, decks);
        await this.autoActivateNote();
      });
      deckDropdown = result.dropdown;
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
      const { body } = stripFrontmatter(raw);
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
    const routeBtn = btnRow.createEl("button", { cls: "spaced-btn spaced-btn-route" });
    setIcon(routeBtn, "route");
    shuffleBtn.setAttribute("aria-label", "Shuffle remaining cards");
    shuffleBtn.addEventListener("click", async () => {
      this.remaining = this.shuffleArray(this.remaining);
      await this.render();
    });
    routeBtn.addEventListener("click", () => this.routeNote());
    routeBtn.setAttribute("aria-label", "Route →");
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
