import { App, Modal, TFile, TFolder, FuzzySuggestModal, Notice, setIcon } from "obsidian";
import type SpacedEverythingPlugin from "./main";
import { writeFrontmatterActive, writeFrontmatterDecks } from "./frontmatter";

export class QuickNoteModal extends Modal {
  private titleInput!: HTMLInputElement;
  private contentArea!: HTMLTextAreaElement;
  private selectedDecks: string[];
  private customLocation: string | null = null;
  private locationLabel!: HTMLSpanElement;

  constructor(
    app: App,
    private plugin: SpacedEverythingPlugin,
    private deckName: string = "",
  ) {
    super(app);
    this.selectedDecks = deckName ? [deckName] : [];
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Quick note" });

    this.titleInput = contentEl.createEl("input", {
      type: "text",
      placeholder: "Title",
      cls: "spaced-quicknote-title",
    });

    this.contentArea = contentEl.createEl("textarea", {
      placeholder: "Jot something down...",
      cls: "spaced-quicknote-body",
    });

    // ── Deck row ──────────────────────────────────────────────────────────────
    const deckRow = contentEl.createDiv({ cls: "spaced-quicknote-row" });

    const deckWrapper = deckRow.createDiv({ cls: "spaced-deck-wrapper" });
    const deckBtn = deckWrapper.createDiv({ cls: "spaced-deck-btn" });
    setIcon(deckBtn, "layers");
    deckBtn.setAttribute("aria-label", "Assign to decks");
    const deckLabel = deckRow.createSpan({ cls: "spaced-quicknote-deck-label" });
    this.updateDeckLabel(deckLabel);

    let deckDropdown: HTMLElement | null = null;
    deckBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (deckDropdown && document.contains(deckDropdown)) {
        deckDropdown.remove();
        deckDropdown = null;
        return;
      }
      deckDropdown = this.createDeckDropdown(deckWrapper, deckLabel);
    });

    // "Add to current deck" checkbox — only shown when opened from ActiveModal
    if (this.deckName) {
      const addToDeckRow = contentEl.createDiv({ cls: "spaced-quicknote-row" });
      const cb = addToDeckRow.createEl("input");
      cb.type = "checkbox";
      cb.checked = true;
      addToDeckRow.createSpan({ text: `Add to "${this.deckName}"` });
      cb.addEventListener("change", () => {
        if (cb.checked) {
          if (!this.selectedDecks.includes(this.deckName)) this.selectedDecks.push(this.deckName);
        } else {
          this.selectedDecks = this.selectedDecks.filter((d) => d !== this.deckName);
        }
        this.updateDeckLabel(deckLabel);
        this.updateLocationLabel();
      });
    }

    // ── Location row ──────────────────────────────────────────────────────────
    const locationRow = contentEl.createDiv({ cls: "spaced-quicknote-row" });
    this.locationLabel = locationRow.createSpan({ cls: "spaced-quicknote-location-label" });
    this.updateLocationLabel();

    const chooseBtn = locationRow.createEl("button", { text: "Choose other location…" });
    chooseBtn.addEventListener("click", () => {
      new FolderPickerModal(this.app, (folderPath) => {
        this.customLocation = folderPath;
        this.updateLocationLabel();
      }).open();
    });

    // ── Buttons ───────────────────────────────────────────────────────────────
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    btnRow.createEl("button", { text: "Cancel" }).addEventListener("click", () => this.close());
    btnRow.createEl("button", { text: "Create", cls: "mod-cta" }).addEventListener("click", () => this.createNote());

    contentEl.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.createNote();
      }
      if (e.key === "Escape") this.close();
    });

    this.titleInput.focus();
  }

  private updateDeckLabel(el: HTMLSpanElement) {
    el.textContent = this.selectedDecks.length > 0 ? this.selectedDecks.join(", ") : "No deck";
  }

  private updateLocationLabel() {
    if (this.customLocation !== null) {
      this.locationLabel.textContent = `Save to: ${this.customLocation}/`;
      return;
    }
    // Check if the primary deck name matches a folder
    if (this.selectedDecks.length > 0) {
      const f = this.app.vault.getAbstractFileByPath(this.selectedDecks[0]);
      if (f instanceof TFolder) {
        this.locationLabel.textContent = `Save to: ${this.selectedDecks[0]}/ (deck folder)`;
        return;
      }
    }
    const defaultFolder = this.app.fileManager.getNewFileParent("").path;
    this.locationLabel.textContent = `Save to: ${defaultFolder === "/" ? "vault root" : defaultFolder + "/"}`;
  }

  private resolveFolder(): string {
    if (this.customLocation !== null) return this.customLocation;
    if (this.selectedDecks.length > 0) {
      const f = this.app.vault.getAbstractFileByPath(this.selectedDecks[0]);
      if (f instanceof TFolder) return this.selectedDecks[0];
    }
    const parent = this.app.fileManager.getNewFileParent("");
    return parent.path === "/" ? "" : parent.path;
  }

  private async createNote() {
    const title = this.titleInput.value.trim();
    if (!title) {
      this.titleInput.focus();
      return;
    }

    const folder = this.resolveFolder();
    const path = folder ? `${folder}/${title}.md` : `${title}.md`;
    const body = this.contentArea.value.trim();

    try {
      const file = await this.app.vault.create(path, body ? `${body}\n` : "");
      if (this.selectedDecks.length > 0) {
        await writeFrontmatterDecks(this.app, file.path, this.selectedDecks);
        await writeFrontmatterActive(this.app, file.path, true);
      }
      new Notice(`Created "${title}"`);
      this.close();
    } catch (e) {
      new Notice(`Could not create note: ${(e as Error).message}`);
    }
  }

  private getAllDeckNames(): string[] {
    const deckSet = new Set<string>();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const decks = this.app.metadataCache.getFileCache(file)?.frontmatter?.decks;
      if (Array.isArray(decks))
        decks.forEach((d: string) => {
          if (d) deckSet.add(d);
        });
      else if (typeof decks === "string" && decks) deckSet.add(decks);
    }
    return Array.from(deckSet).sort();
  }

  private createDeckDropdown(anchor: HTMLElement, label: HTMLSpanElement): HTMLElement {
    const allDecks = this.getAllDeckNames();
    const dropdown = anchor.createDiv({ cls: "spaced-deck-dropdown" });

    const searchInput = dropdown.createEl("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search decks…";
    searchInput.addClass("spaced-deck-search");

    const listEl = dropdown.createDiv({ cls: "spaced-deck-list" });

    const addDeck = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || this.selectedDecks.includes(trimmed)) return;
      this.selectedDecks.push(trimmed);
      if (!allDecks.includes(trimmed)) {
        allDecks.push(trimmed);
        allDecks.sort();
      }
      this.updateDeckLabel(label);
      this.updateLocationLabel();
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
        cb.checked = this.selectedDecks.includes(deck);
        item.createSpan({ text: deck });
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = this.selectedDecks.indexOf(deck);
          if (idx >= 0) {
            this.selectedDecks.splice(idx, 1);
            cb.checked = false;
          } else {
            this.selectedDecks.push(deck);
            cb.checked = true;
          }
          this.updateDeckLabel(label);
          this.updateLocationLabel();
        });
      }
      if (filter.trim()) {
        const addItem = listEl.createDiv({ cls: "spaced-deck-item spaced-deck-add" });
        setIcon(addItem.createDiv({ cls: "spaced-deck-add-icon" }), "circle-plus");
        addItem.createSpan({ text: `Add "${filter.trim()}"` });
        addItem.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          addDeck(filter.trim());
        });
      }
    };

    renderList("");
    searchInput.addEventListener("input", () => renderList(searchInput.value));
    searchInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const filter = searchInput.value.trim();
      if (!filter) return;
      const filtered = allDecks.filter((d) => d.toLowerCase().includes(filter.toLowerCase()));
      if (filtered.length === 1) {
        const idx = this.selectedDecks.indexOf(filtered[0]);
        if (idx >= 0) this.selectedDecks.splice(idx, 1);
        else this.selectedDecks.push(filtered[0]);
        this.updateDeckLabel(label);
        this.updateLocationLabel();
        renderList(filter);
      } else if (filtered.length === 0) {
        addDeck(filter);
      }
      e.preventDefault();
    });

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
    this.contentEl.empty();
  }
}

class FolderPickerModal extends FuzzySuggestModal<TFolder> {
  constructor(
    app: App,
    private onChoose: (path: string) => void,
  ) {
    super(app);
    this.setPlaceholder("Choose a folder…");
  }

  getItems(): TFolder[] {
    const folders: TFolder[] = [];
    const root = this.app.vault.getRoot();
    const collect = (folder: TFolder) => {
      folders.push(folder);
      for (const child of folder.children) {
        if (child instanceof TFolder) collect(child);
      }
    };
    collect(root);
    return folders;
  }

  getItemText(folder: TFolder): string {
    return folder.path === "/" ? "/ (vault root)" : folder.path;
  }

  onChooseItem(folder: TFolder) {
    this.onChoose(folder.path === "/" ? "" : folder.path);
  }
}
