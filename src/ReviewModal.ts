import { App, ButtonComponent, WorkspaceLeaf, TFile, setIcon, MarkdownRenderer, Component } from "obsidian";
import { NoteRecord, NoteState, SrsSession } from "./types";
import { nextInterval, nextEaseFactor, noteIsDue, pickNoteToReview } from "./scheduler";
import { today } from "./utils";
import { saveStore } from "./store";
import type SpacedEverythingPlugin from "./main";
import {
  writeNoteRecord,
  writeFrontmatterActive,
  writeFrontmatterDecks,
  getNotesFromVault,
  stripFrontmatter,
} from "./frontmatter";
import { createTiptapEditor, extractMarkdown } from "./tiptap-editor";
import type { Editor } from "@tiptap/core";
import { QuickNoteModal } from "./QuickNoteModal";
import { RouteFolderModal } from "./RouteFolderModal";
import { createDeckDropdown } from "./deckDropdown";
import { BaseNoteModal } from "./BaseNoteModal";

export class ReviewModal extends BaseNoteModal {
  private reviewStartTime = 0;
  private reviewedInSession = new Set<string>();
  private progressLog: string[] = [];
  private sessionSize = 0;
  constructor(
    app: App,
    protected plugin: SpacedEverythingPlugin,
    protected note: NoteRecord,
  ) {
    super(app);
  }

  async onOpen() {
    await this.render();
    this.setupVaultListener();
    this.patchActiveFile(); 
  }

  private async render() {
    this.reviewStartTime = Date.now();
    this.isEditing = false;
    const { contentEl } = this;
    contentEl.empty();

    this.renderHeader(contentEl);
    await this.renderContent(contentEl);
    this.renderButtons(contentEl);
    this.renderProgressBar(contentEl);
  }

  // — title, edit button, new note button, deck picker, active checkbox
  private renderHeader(contentEl: HTMLElement): void {
    const title = this.note.filepath.split("/").pop()!.replace(/\.md$/, "");
    const headerRow = contentEl.createDiv({ cls: "spaced-header-row" });
    this.titleEl = headerRow.createEl("h1", { text: title, cls: "spaced-note-title" });
    this.originalTitle = title;
    this.titleEl.spellcheck = false;
    this.titleEl.addEventListener("blur", () => this.saveTitle());

    // Non-edit mode: click opens the note
    this.titleEl!.addEventListener("click", () => {
      if (this.isEditing) return;
      const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
      if (file) this.app.workspace.getLeaf(false).openFile(file);
    });

    // Edit mode: Enter confirms, Escape cancels
    this.titleEl!.addEventListener("keydown", (e) => {
      if (!this.isEditing) return;
      if (e.key === "Enter") {
        e.preventDefault();
        this.titleEl!.blur();
      }
      if (e.key === "Escape") {
        this.titleEl!.textContent = title;
        this.titleEl!.blur();
      }
    });

    const allNotes = getNotesFromVault(this.app, this.plugin.settings).filter((n) => n.interval >= 0);
    const totalDue = allNotes.filter((n) => noteIsDue(n)).length;
    if (this.sessionSize === 0) this.sessionSize = totalDue;
    const remainingDue = allNotes.filter((n) => noteIsDue(n) && !this.reviewedInSession.has(n.filepath)).length;
    contentEl.createEl("div", {
      text: `${remainingDue} note${remainingDue !== 1 ? "s" : ""} due`,
      cls: "spaced-due-count",
    });

    const headerRight = headerRow.createDiv({ cls: "spaced-header-right" });

    // Edit button
    const editBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    setIcon(editBtn, "pencil");
    editBtn.setAttribute("aria-label", "Switch to edit view");
    editBtn.addEventListener("click", async () => {
      if (this.isEditing) {
        await this.saveTitle();
        await this.saveBodyEdits();
        this.isEditing = false;
        this.titleEl!.contentEditable = "false";
        if (this.tiptapContainer) this.tiptapContainer.style.display = "none";
        if (this.renderedContainer) {
          this.renderedContainer.style.display = "";
          // Re-render with the saved content
          this.renderedContainer.empty();
          this.renderComponent?.unload();
          this.renderComponent = null;
          const updatedFile = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
          if (updatedFile) {
            const updatedRaw = await this.app.vault.read(updatedFile);
            const { body: updatedBody } = stripFrontmatter(updatedRaw);
            this.renderComponent = new Component();
            this.renderComponent.load();
            await MarkdownRenderer.render(
              this.app,
              updatedBody,
              this.renderedContainer,
              this.note.filepath,
              this.renderComponent,
            );
          }
        }
        setIcon(editBtn, "pencil");
        editBtn.setAttribute("aria-label", "Switch to edit view");
      } else {
        this.isEditing = true;
        this.titleEl!.contentEditable = "true";
        this.titleEl!.focus();
        if (this.renderedContainer) this.renderedContainer.style.display = "none";
        if (this.tiptapContainer) this.tiptapContainer.style.display = "";
        this.tiptapEditor?.commands.focus();
        setIcon(editBtn, "eye");
        editBtn.setAttribute("aria-label", "Switch to read view");
      }
    });

    // New note button
    const newNoteBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    setIcon(newNoteBtn, "file-plus");
    newNoteBtn.setAttribute("aria-label", "New note");
    newNoteBtn.addEventListener("click", () => {
      new QuickNoteModal(this.app, this.plugin).open();
    });

    // Deck picker button
    const deckWrapper = headerRight.createDiv({ cls: "spaced-deck-wrapper" });
    const deckBtn = deckWrapper.createDiv({ cls: "spaced-deck-btn" });
    setIcon(deckBtn, "layers");
    deckBtn.setAttribute("aria-label", "Assign to decks");
    let deckDropdown: HTMLElement | null = null;
    let deckOutsideHandler: ((e: MouseEvent) => void) | null = null;
    deckBtn.addEventListener("click", (e) => {
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
      // Read the note's current decks from the cache
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
      deckOutsideHandler = result.outsideHandler;
    });

    // Active checkbox (no label, larger)
    const activeCheckbox = headerRight.createEl("input", { cls: "spaced-active-checkbox" });
    activeCheckbox.type = "checkbox";
    const noteFileForActive = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
    activeCheckbox.checked = noteFileForActive
      ? this.app.metadataCache.getFileCache(noteFileForActive)?.frontmatter?.active === true
      : false;
    activeCheckbox.setAttribute("aria-label", "Add to active deck");
    activeCheckbox.addEventListener("change", async () => {
      const newActive = activeCheckbox.checked;
      this.note = { ...this.note, active: newActive };
      await writeFrontmatterActive(this.app, this.note.filepath, newActive);
    });
  }

  // file reading, markdown render, tiptap editor
  private async renderContent(contentEl: HTMLElement): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
    if (!file) {
      contentEl.createEl("p", { text: `File not found: ${this.note.filepath}` });
      return;
    }
    const raw = await this.app.vault.read(file);
    const { body } = stripFrontmatter(raw);
    // Read-only rendered view (default)
    this.renderedContainer = contentEl.createDiv({ cls: "spaced-note-content" });
    this.renderComponent = new Component();
    this.renderComponent.load();
    await MarkdownRenderer.render(this.app, body, this.renderedContainer, this.note.filepath, this.renderComponent);

    // Tiptap editor (hidden until edit mode)
    this.tiptapContainer = contentEl.createDiv({ cls: "spaced-tiptap-container" });
    this.tiptapContainer.style.display = "none";
    if (this.tiptapEditor) {
      this.tiptapEditor.destroy();
      this.tiptapEditor = null;
    }
    this.tiptapEditor = createTiptapEditor(this.tiptapContainer, body);
  }

  // reaction button row
  private renderButtons(contentEl: HTMLElement): void {
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    // Reaction buttons
    this.addBtn(btnRow, { label: "Exciting", cls: "exciting", cb: () => this.react("exciting") });
    this.addBtn(btnRow, { label: "Interesting", cls: "interesting", cb: () => this.react("interesting") });
    this.addBtn(btnRow, { label: "Yeah", cls: "yeah", cb: () => this.react("yeah") });
    this.addBtn(btnRow, { label: "Lol", cls: "lol", cb: () => this.react("lol") });
    this.addBtn(btnRow, { label: "Meh", cls: "meh", cb: () => this.react("meh") });
    this.addBtn(btnRow, { label: "Cringe", cls: "cringe", cb: () => this.react("cringe") });
    this.addBtn(btnRow, { label: "Taxing", cls: "taxing", cb: () => this.react("taxing") });
    this.addBtn(btnRow, { label: "Revisit soon", cls: "revisit", cb: () => this.react("revisit") });
    this.addBtn(btnRow, { label: "Route →", cls: "route", cb: () => this.routeNote() });
    this.addBtn(btnRow, { label: "Skip", cls: "skip", cb: () => this.react("skip") });
    this.addBtn(btnRow, { label: "Archive", cls: "archive", cb: () => this.archiveNote() });
    this.addBtn(btnRow, { icon: "trash-2", cls: "delete", cb: () => this.deleteNote() });
  }

  private addBtn(
    container: HTMLElement,
    opts: {
      label?: string;
      icon?: string;
      cls: string;
      modifier?: string;
      cb: () => void;
    },
  ) {
    const btn = new ButtonComponent(container).onClick(opts.cb);

    if (opts.icon) btn.setIcon(opts.icon);
    if (opts.label) btn.setButtonText(opts.label);
    if (!opts.label && opts.icon) btn.setTooltip(opts.cls); // fallback tooltip for icon-only

    btn.buttonEl.addClass(`spaced-btn-${opts.cls}`);
    if (opts.modifier) btn.buttonEl.addClass(`mod-${opts.modifier}`);
    if (opts.cls === "exciting") btn.setCta();
    if (opts.cls === "route") btn.setCta();

    return btn;
  }

  private async react(reaction: NoteState | "skip") {
    await this.saveTitle();
    await this.saveBodyEdits();
    this.progressLog.push(this.reactionColor(reaction));
    if (reaction === "skip") {
      await this.showNextNote();
      return;
    }
    this.reviewedInSession.add(this.note.filepath);
    this.plugin.data.reviewHistory = this.plugin.data.reviewHistory ?? [];
    this.plugin.data.reviewHistory.push({
      timestamp: new Date().toISOString().slice(0, 19),
      notePath: this.note.filepath,
      reaction,
    });

    const newInterval = nextInterval(this.note, reaction);
    const updatedNote: NoteRecord = {
      ...this.note,
      interval: newInterval,
      easeFactor: nextEaseFactor(this.note, reaction),
      lastReviewedOn: today(),
      reviewedCount: this.note.reviewedCount + 1,
      noteState: reaction,
    };
    this.note = updatedNote;
    await writeNoteRecord(this.app, this.note.filepath, updatedNote);
    await saveStore(this.plugin, this.plugin.data);
    await this.showNextNote();
  }

  private async archiveNote() {
    await this.saveTitle();
    await this.saveBodyEdits();
    this.progressLog.push(this.reactionColor("archive"));
    await writeNoteRecord(this.app, this.note.filepath, { interval: -1 });
    await this.showNextNote();
  }

  private async showNextNote() {
    const allNotes = getNotesFromVault(this.app, this.plugin.settings).filter(
      (n) => n.interval >= 0 && !this.reviewedInSession.has(n.filepath),
    );
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

  private async deleteNote() {
    await this.saveTitle();
    this.progressLog.push(this.reactionColor("delete"));
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
    if (file) {
      await this.app.vault.delete(file);
    }
    await this.showNextNote();
  }

  private reactionColor(reaction: string): string {
    return ReviewModal.REACTION_COLORS[reaction] ?? "";
  }

  private renderProgressBar(container: HTMLElement) {
    const bar = container.createDiv({ cls: "spaced-review-progress-bar" });
    for (let i = 0; i < this.sessionSize; i++) {
      const seg = bar.createDiv({ cls: "spaced-review-progress-seg" });
      if (this.progressLog[i]) seg.addClass(this.progressLog[i]);
    }
  }

  public resumeSession(session: SrsSession) {
    this.reviewedInSession = new Set(session.reviewedFilepaths);
    this.progressLog = [...session.progressLog];
    this.sessionSize = session.sessionSize;
  }

  private static readonly REACTION_COLORS: Record<string, string> = {
    exciting: "spaced-seg-purple",
    interesting: "spaced-seg-green",
    yeah: "spaced-seg-green",
    lol: "spaced-seg-yellow",
    meh: "spaced-seg-orange",
    cringe: "spaced-seg-red",
    taxing: "spaced-seg-red",
    revisit: "spaced-seg-blue",
    route: "spaced-seg-blue",
    archive: "spaced-seg-yellow",
    delete: "spaced-seg-red",
    skip: "spaced-seg-skip",
  };

  onClose() {
    this.restoreActiveFile();
    void this.saveTitle();
    void this.saveBodyEdits();
    if (this.sessionSize > 0) {
      if (this.reviewedInSession.size < this.sessionSize) {
        this.plugin.data.srsSession = {
          reviewedFilepaths: [...this.reviewedInSession],
          progressLog: [...this.progressLog],
          sessionSize: this.sessionSize,
        };
      } else {
        delete this.plugin.data.srsSession;
      }
      void saveStore(this.plugin, this.plugin.data);
    }
    this.cleanupEditors();
    this.contentEl.empty();
  }
}
