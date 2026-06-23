import { App, Modal, TFile, Notice } from "obsidian";

export class QuickNoteModal extends Modal {
  private titleInput!: HTMLInputElement;
  private contentArea!: HTMLTextAreaElement;

  constructor(app: App) {
    super(app);
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

    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });

    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());

    const createBtn = btnRow.createEl("button", { text: "Create", cls: "mod-cta" });
    createBtn.addEventListener("click", () => this.createNote());

    // Submit on Ctrl/Cmd+Enter
    contentEl.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.createNote();
      }
      if (e.key === "Escape") this.close();
    });

    this.titleInput.focus();
  }

  private async createNote() {
    const title = this.titleInput.value.trim();
    if (!title) {
      this.titleInput.focus();
      return;
    }
    const content = this.contentArea.value.trim();
    const folder = this.app.fileManager.getNewFileParent("");
    const folderPath = folder.path === "/" ? "" : folder.path + "/";
    const path = `${folderPath}${title}.md`;
    const body = content ? `${content}\n` : "";

    try {
      await this.app.vault.create(path, body);
      new Notice(`Created "${title}"`);
      this.close();
    } catch (e) {
      new Notice(`Could not create note: ${(e as Error).message}`);
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
