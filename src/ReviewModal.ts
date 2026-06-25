import { App, Setting, ButtonComponent, Modal, TFile, setIcon, MarkdownRenderer, Component, Notice } from "obsidian";
import { NoteRecord, NoteState, ReviewEvent, SrsSession } from "./types";
import { nextInterval, nextEaseFactor, today, noteIsDue } from "./scheduler";
import { saveStore } from "./store";
import { pickNoteToReview } from "./scheduler";
import type SpacedEverythingPlugin from "./main";
import { writeNoteRecord, writeFrontmatterActive, writeFrontmatterDecks, getNotesFromVault } from "./frontmatter";
import { createTiptapEditor, extractMarkdown } from "./tiptap-editor";
import type { Editor } from "@tiptap/core";
import { QuickNoteModal } from "./QuickNoteModal";  

export class ReviewModal extends Modal {
  private tiptapEditor: Editor | null = null;
  private renderComponent: Component | null = null;
  private renderedContainer: HTMLElement | null = null;
  private tiptapContainer: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private originalTitle = "";
  private isEditing = false;
  private sessionSize = 0;
  private progressLog: string[] = [];
  private reviewedInSession: Set<string> = new Set();
  private reviewStartTime = 0;

  constructor(
    app: App,
    private plugin: SpacedEverythingPlugin,
    private note: NoteRecord,
  ) {
    super(app);
  }

  async onOpen() {
    await this.render();
  }

  private async render() {
    this.reviewStartTime = Date.now();
    this.isEditing = false;
    const { contentEl } = this;
    contentEl.empty();

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
            const { body: updatedBody } = this.stripFrontmatter(updatedRaw);
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
      deckDropdown = null;
      const result = this.createDeckDropdown(deckWrapper);
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

    // Render note content
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
    if (!file) {
      contentEl.createEl("p", { text: `File not found: ${this.note.filepath}` });
      return;
    }
    const raw = await this.app.vault.read(file);
    const { body } = this.stripFrontmatter(raw);
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

    // Reaction buttons
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
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

    this.renderProgressBar(contentEl);
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

  private stripFrontmatter(raw: string): { frontmatter: string; body: string } {
    if (raw.startsWith("---")) {
      const end = raw.indexOf("\n---", 3);
      if (end !== -1) return { frontmatter: raw.slice(0, end + 4), body: raw.slice(end + 4).trimStart() };
    }
    return { frontmatter: "", body: raw };
  }

  private async saveBodyEdits() {
    if (!this.isEditing || !this.tiptapEditor) return;
    const newBody = extractMarkdown(this.tiptapEditor);
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
    if (!file) return;
    const raw = await this.app.vault.read(file);
    const { frontmatter, body } = this.stripFrontmatter(raw);
    if (newBody.trim() === body.trim()) return;
    await this.app.vault.modify(file, frontmatter ? `${frontmatter}\n${newBody}` : newBody);
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

  private routeNote() {
    new RouteFolderModal(this.app, this.note, this.plugin, (newPath) => {
      this.note = { ...this.note, filepath: newPath };
    }).open();
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

  private reactionColor(reaction: NoteState | "skip" | "archive" | "delete"): string {
    switch (reaction) {
      case "exciting":
        return "spaced-seg-purple";
      case "interesting":
        return "spaced-seg-green";
      case "yeah":
        return "spaced-seg-green";
      case "lol":
        return "spaced-seg-yellow";
      case "meh":
        return "spaced-seg-orange";
      case "cringe":
        return "spaced-seg-red";
      case "taxing":
        return "spaced-seg-red";
      case "revisit":
        return "spaced-seg-blue";
      case "archive":
        return "spaced-seg-yellow";
      case "delete":
        return "spaced-seg-red";
      case "skip":
        return "spaced-seg-skip";
      default:
        return "";
    }
  }

  private renderProgressBar(container: HTMLElement) {
    const bar = container.createDiv({ cls: "spaced-review-progress-bar" });
    for (let i = 0; i < this.sessionSize; i++) {
      const seg = bar.createDiv({ cls: "spaced-review-progress-seg" });
      if (this.progressLog[i]) seg.addClass(this.progressLog[i]);
    }
  }

  private async autoActivateNote(): Promise<void> {
    if (this.note.active) return;
    this.note = { ...this.note, active: true };
    await writeFrontmatterActive(this.app, this.note.filepath, true);
    const cb = this.contentEl.querySelector<HTMLInputElement>(".spaced-active-checkbox");
    if (cb) cb.checked = true;
  }

  private cleanupEditors() {
    this.tiptapEditor?.destroy();
    this.tiptapEditor = null;
    this.renderComponent?.unload();
    this.renderComponent = null;
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
            // Auto-activate the note when assigned to a deck
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
    return { dropdown, outsideHandler };
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

  public resumeSession(session: SrsSession) {
    this.reviewedInSession = new Set(session.reviewedFilepaths);
    this.progressLog = [...session.progressLog];
    this.sessionSize = session.sessionSize;
  }

  onClose() {
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

class RouteFolderModal extends Modal {
  private selectedFolder = "";

  constructor(
    app: App,
    private note: NoteRecord,
    private plugin: SpacedEverythingPlugin,
    private onMoved: (newPath: string) => void,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Route note to…" });

    const folders = this.app.vault
      .getAllFolders()
      .map((f) => f.path)
      .sort();

    new Setting(contentEl).setName("Destination folder").addDropdown((drop) => {
      drop.addOption("", "— select a folder —");
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
      const filename = this.note.filepath.split("/").pop()!;
      const dest = `${this.selectedFolder}/${filename}`;
      const file = this.app.vault.getAbstractFileByPath(this.note.filepath);
      if (file) {
        await this.app.vault.rename(file, dest);
        this.onMoved(dest);
      }
      this.close();
      // ReviewModal stays open on the same note — no showNextNote()
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
