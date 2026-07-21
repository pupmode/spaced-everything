import { App, Setting, Modal, Notice, TFolder } from "obsidian";
import { BaseNote } from "./types";
import type SpacedEverythingPlugin from "./main";
import { saveStore } from "./store";

export class RouteFolderModal extends Modal {
  private selectedFolder = "";

  constructor(
    app: App,
    private note: BaseNote,
    private plugin: SpacedEverythingPlugin,
    private onMoved: (newPath: string) => void,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Route note to…" });

    // ── Quick-route button (only shown if a last folder is remembered) ──
    const lastFolder = this.plugin.data.lastRoutedFolder;
    if (lastFolder) {
      const quickBtn = contentEl.createEl("button", {
        text: `↩ Move to ${lastFolder}`,
        cls: "spaced-btn mod-cta spaced-btn-quick-route",
      });
      quickBtn.style.marginBottom = "12px";
      quickBtn.addEventListener("click", async () => {
        await this.doMove(lastFolder);
      });
    }

    // ── Folder picker ──
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
      await this.doMove(this.selectedFolder);
    });
  }

  // ── Shared move logic ──────────────────────────────────────────────────────
  private async doMove(folder: string) {
    // Check folder still exists
    const folderExists = this.app.vault.getAbstractFileByPath(folder) instanceof TFolder;
    if (!folderExists) {
      new Notice(`Folder "${folder}" no longer exists.`);
      return;
    }

    // Check note isn't already there
    const currentFolder = this.note.filepath.includes("/")
      ? this.note.filepath.substring(0, this.note.filepath.lastIndexOf("/"))
      : "";
    if (currentFolder === folder) {
      new Notice(`Note is already in "${folder}".`);
      return;
    }

    const filename = this.note.filepath.split("/").pop()!;
    const dest = `${folder}/${filename}`;
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath);

    try {
      if (file) {
        await this.app.vault.rename(file, dest);
        // Save last used folder
        this.plugin.data.lastRoutedFolder = folder;
        await saveStore(this.plugin, this.plugin.data);
        this.onMoved(dest);
      }
    } catch (e) {
      new Notice(`Could not move note: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    this.close();
  }

  onClose() {
    this.contentEl.empty();
  }
}
