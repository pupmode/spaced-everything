import {TFolder, Notice, App, Modal } from "obsidian";
import { writeFrontmatterActive, writeFrontmatterDecks } from "./frontmatter";
import type SpacedEverythingPlugin from "./main";

export class FolderDeckPickerModal extends Modal {
  private selectedDecks: Set<string> = new Set();
  private useFolderName = false;

  constructor(
    app: App,
    private folder: TFolder,
    private plugin: SpacedEverythingPlugin,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: `Add "${this.folder.name}" to deck` });

    // Option: use folder name as deck
    const folderRow = contentEl.createDiv({ cls: "spaced-deck-item" });
    const folderCheck = folderRow.createEl("input", { type: "checkbox" });
    folderRow.createSpan({ text: `Create deck: ${this.folder.name}...` });
    folderCheck.addEventListener("change", () => {
      this.useFolderName = folderCheck.checked;
    });

    // Existing decks
    const existingDecks = this.getExistingDecks();
    if (existingDecks.length > 0) {
      contentEl.createEl("p", { text: "Or add to existing deck:", cls: "spaced-deck-empty" });
      for (const deck of existingDecks) {
        const row = contentEl.createDiv({ cls: "spaced-deck-item" });
        const cb = row.createEl("input", { type: "checkbox" });
        row.createSpan({ text: deck });
        cb.addEventListener("change", () => {
          if (cb.checked) this.selectedDecks.add(deck);
          else this.selectedDecks.delete(deck);
        });
      }
    }

    // Confirm button
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());

    const confirmBtn = btnRow.createEl("button", { text: "Add to deck", cls: "mod-cta" });
    confirmBtn.addEventListener("click", async () => {
      const decksToAssign: string[] = [...this.selectedDecks];
      if (this.useFolderName) decksToAssign.push(this.folder.name);

      const folderFiles = this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith(this.folder.path + "/"));

      for (const f of folderFiles) {
        await writeFrontmatterActive(this.app, f.path, true);
        if (decksToAssign.length > 0) {
          const existingFm = this.app.metadataCache.getFileCache(f)?.frontmatter;
          const existingDecks: string[] = Array.isArray(existingFm?.decks)
            ? existingFm.decks
            : existingFm?.decks
              ? [existingFm.decks]
              : [];
          const mergedDecks = [...new Set([...existingDecks, ...decksToAssign])];
          await writeFrontmatterDecks(this.app, f.path, mergedDecks);
        }
      }

      new Notice(`Added ${folderFiles.length} note${folderFiles.length !== 1 ? "s" : ""} to deck.`);
      this.close();
    });
  }

  private getExistingDecks(): string[] {
    const deckSet = new Set<string>();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      const decks = fm?.decks;
      if (Array.isArray(decks)) decks.forEach((d: string) => deckSet.add(d));
      else if (typeof decks === "string" && decks) deckSet.add(decks);
    }
    return [...deckSet].sort();
  }

  onClose() {
    this.contentEl.empty();
  }
}
