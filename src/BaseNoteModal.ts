import { App, Modal, TFile, Component, MarkdownRenderer, EventRef, ButtonComponent, setIcon } from "obsidian";
import { BaseNote } from "./types";
import type SpacedEverythingPlugin from "./main";
import { writeFrontmatterActive, writeFrontmatterDecks, stripFrontmatter } from "./frontmatter";
import { RouteFolderModal } from "./RouteFolderModal";
import { QuickNoteModal } from "./QuickNoteModal";
import { createDeckDropdown } from "./deckDropdown";
import { createCM6Editor, getCM6Content, destroyCM6Editor } from "./cm6-editor";

export abstract class BaseNoteModal extends Modal {
  // ── Shared fields ──────────────────────────────────────────────────────────
  protected tiptapEditor: Editor | null = null;
  protected cm6EditMode: any = null;
  protected cm6Leaf: any = null;

  protected renderComponent: Component | null = null;
  protected renderedContainer: HTMLElement | null = null;
  protected editorContainer: HTMLElement | null = null;
  protected isEditing = false;
  protected titleEl: HTMLElement | null = null;
  protected originalTitle = "";
  protected deckName = "";
  protected showRestartButton = false;
  protected progressBarEl: HTMLElement | null = null;
  protected footerEl: HTMLElement | null = null;
  USE_CM6 = true;

  constructor(app: App) {
    super(app);
  }

  // ── Shared methods ─────────────────────────────────────────────────────────
  async onOpen() {
    if (!this.shouldOpen()) return;
    await this.renderModal();
    this.setupVaultListener();
  }
  protected shouldOpen(): boolean {
    return true;
  }
  protected abstract renderModal(): Promise<void>;

  protected async renderNote(contentEl: HTMLElement): Promise<void> {
    this.cleanupEditors();
    this.renderHeader(contentEl);
    await this.renderExtraContent(contentEl);
    await this.renderContent(contentEl);
    const footer = contentEl.createDiv({ cls: "spaced-sticky-footer" });
    this.footerEl = footer;
    this.renderButtons(footer);
    this.renderProgressBar(footer);
  }

  protected async renderExtraContent(contentEl: HTMLElement): Promise<void> {}

  protected abstract getStatusText(): string;
  protected onRestartClick(): void {}
  protected abstract getProgressSegments(): string[];
  protected note!: BaseNote;
  protected abstract plugin: SpacedEverythingPlugin;

  protected renderProgressBar(container: HTMLElement): void {
    this.progressBarEl = container.createDiv({ cls: "spaced-progress-bar" });
    const segments = this.getProgressSegments();
    for (const seg of segments) {
      this.progressBarEl.createDiv({ cls: `spaced-progress-seg ${seg}`.trim() });
    }
  }

  protected refreshProgressBar(): void {
    const statusEl = this.contentEl.querySelector<HTMLElement>(".spaced-due-count");
    if (statusEl) statusEl.textContent = this.getStatusText();
    if (!this.progressBarEl) return;
    this.progressBarEl.empty();
    const segments = this.getProgressSegments();
    for (const seg of segments) {
      this.progressBarEl.createDiv({ cls: `spaced-progress-seg ${seg}`.trim() });
    }
  }

  private metadataEditor: any = null;

  protected async renderFrontmatterEditor(container: HTMLElement, file: TFile): Promise<void> {
    const MetadataEditorClass = this.getMetadataEditorClass();
    console.log("MetadataEditorClass:", MetadataEditorClass);
    if (!MetadataEditorClass) return;
    console.log("metadataEditor instance:", this.metadataEditor);
    console.log("containerEl:", this.metadataEditor?.containerEl);

    const owner = {
      getFile: () => file,
      saveFrontmatter: async (fm: Record<string, unknown>) => {
        await this.app.fileManager.processFrontMatter(file, (existing) => {
          Object.assign(existing, fm);
        });
      },
      getHoverSource: () => "preview",
      getMode: () => "preview",
    };

    this.metadataEditor = new MetadataEditorClass(this.app, owner);
    this.metadataEditor.load();

    const rawFm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const { position: _pos, ...fm } = rawFm;
    this.metadataEditor.synchronize(fm);

    container.appendChild(this.metadataEditor.containerEl);
    setTimeout(() => this.applyIconicPropertyIcons(), 0);
  }

  protected renderHeader(contentEl: HTMLElement): void {
    const title = this.note.filepath.split("/").pop()!.replace(/\.md$/, "");
    const headerRow = contentEl.createDiv({ cls: "spaced-header-row" });
    this.titleEl = headerRow.createEl("h1", { text: title, cls: "spaced-note-title" });
    this.originalTitle = title;
    this.titleEl.spellcheck = false;
    this.titleEl.contentEditable = this.isEditing ? "true" : "false";

    this.titleEl.addEventListener("blur", () => void this.saveTitle());

    this.titleEl.addEventListener("click", () => {
      if (this.isEditing) return;
      const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
      if (file) void this.app.workspace.getLeaf(true).openFile(file);
    });

    this.titleEl.addEventListener("keydown", (e) => {
      if (!this.isEditing) return;
      if (e.key === "Enter") {
        e.preventDefault();
        this.titleEl!.blur();
      }
      if (e.key === "Escape") {
        this.titleEl!.textContent = this.originalTitle;
        this.titleEl!.blur();
      }
    });

    contentEl.createEl("div", { text: this.getStatusText(), cls: "spaced-due-count" });

    const headerRight = headerRow.createDiv({ cls: "spaced-header-right" });

    this.renderExtraHeaderButtons(headerRight);

    if (this.showRestartButton) {
      const restartBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
      setIcon(restartBtn, "rotate-ccw");
      restartBtn.setAttribute("aria-label", "Restart session");
      restartBtn.addEventListener("click", () => this.onRestartClick());
    }

    // Edit button — inline toggle, no full re-render
    const editBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    setIcon(editBtn, this.isEditing ? "eye" : "pencil");
    editBtn.setAttribute("aria-label", this.isEditing ? "Switch to read view" : "Switch to edit view");
    editBtn.addEventListener("click", async () => {
      if (this.isEditing) {
        await this.saveTitle();
        await this.saveBodyEdits();
        this.isEditing = false;
        this.footerEl?.removeClass("spaced-footer-disabled");
        this.titleEl!.contentEditable = "false";
        if (this.editorContainer) this.editorContainer.style.display = "none";
        if (this.renderedContainer) {
          this.renderedContainer.style.display = "";
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
        this.metadataEditor?.containerEl.style.removeProperty("display");
        setIcon(editBtn, "pencil");
        editBtn.setAttribute("aria-label", "Switch to edit view");
      } else {
        this.isEditing = true;
        this.footerEl?.addClass("spaced-footer-disabled");
        this.titleEl!.contentEditable = "true";
        this.titleEl!.focus();
        if (this.renderedContainer) this.renderedContainer.style.display = "none";
        if (this.editorContainer) this.editorContainer.style.display = "";
        setTimeout(() => {
          const cm = this.cm6EditMode?.cm;
          if (!cm) return;
          cm.dispatch({}); // empty transaction forces a full re-render cycle
          cm.requestMeasure();
          cm.focus();
        }, 0);
        setIcon(editBtn, "eye");
        this.metadataEditor?.containerEl.style.setProperty("display", "none");
        editBtn.setAttribute("aria-label", "Switch to read view");
      }
    });

    const newNoteBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    setIcon(newNoteBtn, "file-plus");
    newNoteBtn.setAttribute("aria-label", "New note");
    newNoteBtn.addEventListener("click", () => new QuickNoteModal(this.app, this.plugin, this.deckName).open());

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

  protected renderExtraHeaderButtons(headerRight: HTMLElement): void {}
  private _vaultModifyRef: EventRef | null = null;

  protected setupVaultListener(): void {
    this._vaultModifyRef = this.app.vault.on("modify", (file) => {
      if (file.path === this.note.filepath && !this.isEditing) {
        void this.refreshContent();
      }
    });
  }

  protected teardownVaultListener(): void {
    if (this._vaultModifyRef) {
      this.app.vault.offref(this._vaultModifyRef);
      this._vaultModifyRef = null;
    }
  }

  private static _MetadataEditorClass: any = null;

  private getMetadataEditorClass(): any {
    if (BaseNoteModal._MetadataEditorClass) return BaseNoteModal._MetadataEditorClass;
    let cls: any = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!cls) cls = (leaf.view as any)?.metadataEditor?.constructor;
    });
    if (cls) BaseNoteModal._MetadataEditorClass = cls;
    return cls ?? null;
  }

  private applyIconicPropertyIcons(): void {
    if (!this.metadataEditor?.containerEl) return;
    const propertyIcons: Record<string, { icon?: string; color?: string }> =
      (this.app as any).plugins?.plugins?.["iconic"]?.settings?.propertyIcons ?? {};
    if (!Object.keys(propertyIcons).length) return;

    const propEls = this.metadataEditor.containerEl.findAll(".metadata-property");
    for (const propEl of propEls) {
      const key = (propEl as HTMLElement).dataset.propertyKey?.toLowerCase();
      if (!key) continue;
      const entry = propertyIcons[key];
      if (!entry?.icon) continue;
      const iconEl = propEl.find(".metadata-property-icon") as HTMLElement | null;
      if (!iconEl) continue;
      setIcon(iconEl, entry.icon);
      const svgEl = iconEl.find(".svg-icon") as HTMLElement | null;
      if (svgEl && entry.color) {
        svgEl.style.setProperty("color", entry.color);
      }
    }
  }

  protected async refreshContent(): Promise<void> {
    if (this.isEditing || !this.renderedContainer) return;
    if (this.renderedContainer.contains(document.activeElement)) return;
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
    if (!file) return;
    const raw = await this.app.vault.read(file);
    const { body } = stripFrontmatter(raw);
    this.renderedContainer.empty();
    this.renderComponent?.unload();
    this.renderComponent = new Component();
    this.renderComponent.load();
    await MarkdownRenderer.render(this.app, body, this.renderedContainer, this.note.filepath, this.renderComponent);
  }
  /*
  protected async saveBodyEdits(): Promise<void> {
    if (!this.isEditing || !this.tiptapEditor) return;
    const newBody = extractMarkdown(this.tiptapEditor);
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
    if (!file) return;
    const raw = await this.app.vault.read(file);
    const { frontmatter, body } = stripFrontmatter(raw);
    if (newBody.trim() === body.trim()) return;
    await this.app.vault.modify(file, frontmatter ? `${frontmatter}\n${newBody}` : newBody);
  }*/

  protected async saveBodyEdits(): Promise<void> {
    if (!this.isEditing) return;
    const newBody = this.USE_CM6
      ? this.cm6EditMode
        ? getCM6Content(this.cm6EditMode)
        : null
      : this.tiptapEditor
        ? extractMarkdown(this.tiptapEditor)
        : null;
    if (newBody === null) return;
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
    if (!file) return;
    const raw = await this.app.vault.read(file);
    const { frontmatter, body } = stripFrontmatter(raw);
    if (newBody.trim() === body.trim()) return;
    await this.app.vault.modify(file, frontmatter ? `${frontmatter}\n${newBody}` : newBody);
  }

  protected async saveTitle(): Promise<void> {
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

  protected async autoActivateNote(): Promise<void> {
    if (this.note.active) return;
    this.note = { ...this.note, active: true };
    await writeFrontmatterActive(this.app, this.note.filepath, true);
    const cb = this.contentEl.querySelector<HTMLInputElement>(".spaced-active-checkbox");
    if (cb) cb.checked = true;
  }

  protected routeNote() {
    new RouteFolderModal(this.app, this.note, this.plugin, (newPath) => {
      this.note = { ...this.note, filepath: newPath };
    }).open();
  }
  /*
  protected cleanupEditors(): void {
    this.tiptapEditor?.destroy();
    this.tiptapEditor = null;
    this.renderComponent?.unload();
    this.renderComponent = null;
    this.metadataEditor?.unload();
    this.metadataEditor = null;
    this.renderedContainer = null;
    this.editorContainer = null;
  }
*/

  protected cleanupEditors(): void {
    if (this.USE_CM6) {
      if (this.cm6Leaf) {
        destroyCM6Editor(this.cm6Leaf);
        this.cm6Leaf = null;
        this.cm6EditMode = null;
      }
    } else {
      this.tiptapEditor?.destroy();
      this.tiptapEditor = null;
    }
    this.renderComponent?.unload();
    this.renderComponent = null;
    this.metadataEditor?.unload();
    this.metadataEditor = null;
    this.renderedContainer = null;
    this.editorContainer = null;
  }

  protected addBtn(
    container: HTMLElement,
    opts: {
      label?: string;
      icon?: string;
      cls: string;
      modifier?: string;
      tooltip?: string;
      cb: () => void;
    },
  ) {
    const btn = new ButtonComponent(container).onClick(opts.cb);

    if (opts.icon) btn.setIcon(opts.icon);
    if (opts.label) btn.setButtonText(opts.label);
    if (opts.tooltip) btn.setTooltip(opts.tooltip);
    else if (!opts.label && opts.icon) btn.setTooltip(opts.cls);

    btn.buttonEl.addClass("spaced-btn");
    btn.buttonEl.addClass(`spaced-btn-${opts.cls}`);
    if (opts.modifier) btn.buttonEl.addClass(`mod-${opts.modifier}`);

    return btn;
  }

  protected async renderContent(contentEl: HTMLElement): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
    if (!file) {
      contentEl.createEl("p", { text: `File not found: ${this.note.filepath}` });
      return;
    }
    const raw = await this.app.vault.read(file);
    const { body } = stripFrontmatter(raw);
    await this.renderFrontmatterEditor(contentEl, file);

    // Read-only rendered view
    this.renderedContainer = contentEl.createDiv({ cls: "spaced-note-content" });
    this.renderComponent = new Component();
    this.renderComponent.load();
    await MarkdownRenderer.render(this.app, body, this.renderedContainer, this.note.filepath, this.renderComponent);

    /*
    // Tiptap editor — always created, visibility controlled by isEditing
    this.editorContainer = contentEl.createDiv({ cls: "spaced-tiptap-container" });
    if (this.tiptapEditor) {
      this.tiptapEditor.destroy();
      this.tiptapEditor = null;
    }
    this.tiptapEditor = createTiptapEditor(this.editorContainer, body);

    if (this.isEditing) {
      this.renderedContainer.style.display = "none";
      this.editorContainer.style.display = "";
    } else {
      this.renderedContainer.style.display = "";
      this.editorContainer.style.display = "none";
    }*/

    this.editorContainer = contentEl.createDiv({ cls: "spaced-tiptap-container" });
    if (this.USE_CM6) {
      const { leaf, editMode } = await createCM6Editor(this.editorContainer, file, this.app);
      this.cm6Leaf = leaf;
      this.cm6EditMode = editMode;
    } else {
      if (this.tiptapEditor) {
        this.tiptapEditor.destroy();
        this.tiptapEditor = null;
      }
      this.tiptapEditor = createTiptapEditor(this.editorContainer, body);
    }

    if (this.isEditing) {
      this.renderedContainer!.style.display = "none";
      this.editorContainer.style.display = "";
    } else {
      this.renderedContainer!.style.display = "";
      this.editorContainer.style.display = "none";
    }
  }

  protected onSessionClose(): void {}

  protected abstract renderButtons(container: HTMLElement): void;

  onClose() {
    this.teardownVaultListener();
    void this.saveTitle();
    void this.saveBodyEdits();
    this.onSessionClose();
    this.cleanupEditors();
    this.contentEl.empty();
  }
}
