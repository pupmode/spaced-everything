import { App, Setting, ButtonComponent, Modal, TFile, setIcon, MarkdownRenderer, Component } from "obsidian";
import { NoteRecord, NoteState, ReviewEvent } from "./types";
import { nextInterval, nextEaseFactor, today, noteIsDue } from "./scheduler";
import { saveStore } from "./store";
import { pickNoteToReview } from "./scheduler";
import type SpacedEverythingPlugin from "./main";
import { writeFrontmatterReaction, writeFrontmatterActive, writeFrontmatterDecks } from "./frontmatter";
import { createTiptapEditor, extractMarkdown } from "./tiptap-editor";
import type { Editor } from "@tiptap/core";

export class ReviewModal extends Modal {
  private tiptapEditor: Editor | null = null;
  private renderComponent: Component | null = null;
  private renderedContainer: HTMLElement | null = null;
  private tiptapContainer: HTMLElement | null = null;
  private isEditing = false;
  private sessionSize = 0;
  private progressLog: string[] = [];
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
    const titleEl = contentEl.createEl("h1", { text: title, cls: "spaced-note-title" });
    titleEl.contentEditable = "true";
    titleEl.spellcheck = false;

    const saveTitle = async () => {
      const newName = (titleEl.textContent ?? "").trim();
      if (!newName || newName === title) return;
      const f = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
      if (!f) return;
      const dir = this.note.filepath.includes("/")
        ? this.note.filepath.substring(0, this.note.filepath.lastIndexOf("/"))
        : "";
      const newPath = dir ? `${dir}/${newName}.md` : `${newName}.md`;
      await this.app.vault.rename(f, newPath);
      if (this.plugin.data.notes[this.note.sha1sum]) {
        this.plugin.data.notes[this.note.sha1sum].filepath = newPath;
        await saveStore(this.plugin, this.plugin.data);
      }
      this.note = { ...this.note, filepath: newPath };
    };

    titleEl.addEventListener("blur", saveTitle);
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

    const allNotes = Object.values(this.plugin.data.notes).filter((n) => n.interval >= 0);
    const dueCount = allNotes.filter((n) => noteIsDue(n)).length;
    if (this.sessionSize === 0) this.sessionSize = dueCount;

    // Header row: due count (left) + controls (right)
    const headerRow = contentEl.createDiv({ cls: "spaced-header-row" });
    headerRow.createEl("div", {
      text: `${dueCount} note${dueCount !== 1 ? "s" : ""} due`,
      cls: "spaced-due-count",
    });

    const headerRight = headerRow.createDiv({ cls: "spaced-header-right" });

    // Edit button
    const editBtn = headerRight.createDiv({ cls: "clickable-icon" });
    setIcon(editBtn, "pencil");
    editBtn.setAttribute("aria-label", "Switch to edit view");
    editBtn.addEventListener("click", async () => {
      if (this.isEditing) {
        // Save and switch back to read view
        await this.saveBodyEdits();
        this.isEditing = false;
        if (this.tiptapContainer) this.tiptapContainer.style.display = "none";
        if (this.renderedContainer) {
          this.renderedContainer.style.display = "";
          // Re-render with the saved content
          this.renderedContainer.empty();
          if (this.renderComponent) {
            this.renderComponent.unload();
            this.renderComponent = null;
          }
          const updatedFile = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
          if (updatedFile) {
            const updatedRaw = await this.app.vault.read(updatedFile);
            let updatedBody = updatedRaw;
            if (updatedRaw.startsWith("---")) {
              const end = updatedRaw.indexOf("\n---", 3);
              if (end !== -1) updatedBody = updatedRaw.slice(end + 4).trimStart();
            }
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
        // Switch to edit view
        this.isEditing = true;
        if (this.renderedContainer) this.renderedContainer.style.display = "none";
        if (this.tiptapContainer) this.tiptapContainer.style.display = "";
        this.tiptapEditor?.commands.focus();
        setIcon(editBtn, "eye");
        editBtn.setAttribute("aria-label", "Switch to read view");
      }
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
      deckDropdown = null; // clear any stale reference
      deckDropdown = this.createDeckDropdown(deckWrapper);
    });

    // Active checkbox (no label, larger)
    const activeCheckbox = headerRight.createEl("input", { cls: "spaced-active-checkbox" });
    activeCheckbox.type = "checkbox";
    activeCheckbox.checked = this.note.active ?? false;
    activeCheckbox.setAttribute("aria-label", "Add to active deck");
    activeCheckbox.addEventListener("change", async () => {
      const newActive = activeCheckbox.checked;
      this.plugin.data.notes[this.note.sha1sum].active = newActive;
      this.note = { ...this.note, active: newActive };
      await saveStore(this.plugin, this.plugin.data);
      await writeFrontmatterActive(this.app, this.note.filepath, newActive);
    });

    // Render note content
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
    if (!file) {
      contentEl.createEl("p", { text: `File not found: ${this.note.filepath}` });
      return;
    }
    const raw = await this.app.vault.read(file);
    let body = raw;
    if (raw.startsWith("---")) {
      const end = raw.indexOf("\n---", 3);
      if (end !== -1) body = raw.slice(end + 4).trimStart();
    }
    // Read-only rendered view (default)
    this.renderedContainer = contentEl.createDiv({ cls: "spaced-note-content" });
    if (this.renderComponent) {
      this.renderComponent.unload();
      this.renderComponent = null;
    }
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

  private async saveBodyEdits() {
    if (!this.isEditing || !this.tiptapEditor) return;
    const newBody = extractMarkdown(this.tiptapEditor);
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
    if (!file) return;
    const raw = await this.app.vault.read(file);
    const fmMatch = raw.match(/^---[\s\S]*?---\n/);
    const frontmatter = fmMatch ? fmMatch[0] : "";
    await this.app.vault.modify(file, frontmatter + newBody);
  }

  private async react(reaction: NoteState | "skip") {
    await this.saveBodyEdits();
    this.progressLog.push(this.reactionColor(reaction));
    if (reaction === "skip") {
      await this.showNextNote();
      return;
    }
    this.plugin.data.reviewHistory = this.plugin.data.reviewHistory ?? [];
    this.plugin.data.reviewHistory.push({
      timestamp: new Date().toISOString().slice(0, 19),
      noteHash: this.note.sha1sum,
      reaction,
    });

    const newInterval = nextInterval(this.note, reaction);
    this.plugin.data.notes[this.note.sha1sum] = {
      ...this.note,
      interval: newInterval,
      easeFactor: nextEaseFactor(this.note, reaction),
      lastReviewedOn: today(),
      reviewedCount: this.note.reviewedCount + 1,
      noteState: reaction,
    };
    await saveStore(this.plugin, this.plugin.data);
    await writeFrontmatterReaction(this.app, this.note.filepath, reaction);
    await this.showNextNote();
  }

  private routeNote() {
    new RouteFolderModal(this.app, this.note, this.plugin, (newPath) => {
      this.note = { ...this.note, filepath: newPath };
    }).open();
  }

  private async archiveNote() {
    await this.saveBodyEdits();
    this.progressLog.push(this.reactionColor("archive"));
    this.plugin.data.notes[this.note.sha1sum].interval = -1;
    await saveStore(this.plugin, this.plugin.data);
    await this.showNextNote();
  }

  private async showNextNote() {
    const allNotes = Object.values(this.plugin.data.notes).filter((n) => n.interval >= 0);
    const next = pickNoteToReview(allNotes, this.plugin.settings);
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

  private async deleteNote() {
    this.progressLog.push(this.reactionColor("delete"));
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
    if (file) {
      await this.app.vault.delete(file);
    }
    // Remove from store entirely (not just soft-delete)
    delete this.plugin.data.notes[this.note.sha1sum];
    await saveStore(this.plugin, this.plugin.data);
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

  onClose() {
    // Save any pending Tiptap edits before closing
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
        // Update filepath in store so it doesn't get orphaned on next sync
        this.plugin.data.notes[this.note.sha1sum].filepath = dest;
        await saveStore(this.plugin, this.plugin.data);
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
