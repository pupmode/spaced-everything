// ← Plugin entry point, registers commands & events

import { Plugin, TFile, TFolder, Menu, Notice, App, Modal } from "obsidian";
import { SpacedEverythingSettings, NoteRecord, DEFAULT_SETTINGS, PluginData } from "./types";
import { loadStore, saveStore } from "./store";
import { syncVault } from "./sync";
import { pickNoteToReview, noteIsDue} from "./scheduler";
import { ReviewModal } from "./ReviewModal";
import { writeFrontmatterActive, writeFrontmatterDecks } from "./frontmatter";  
import { SpacedEverythingSettingsTab } from "./SettingsTab";
import { DueNotesView, DUE_NOTES_VIEW_TYPE } from "./DueNotesView";
import { StatsView, STATS_VIEW_TYPE } from "./StatsView";  
import { DeckPickerModal } from "./DeckPickerModal";

export default class SpacedEverythingPlugin extends Plugin {
  settings: SpacedEverythingSettings;
  data: PluginData;

  private statusBarItem: HTMLElement;
  private noteFromFilepath(filepath: string): NoteRecord {
    const stored = Object.values(this.data.notes).find((n) => n.filepath === filepath);
    if (stored) return stored;
    return {
      sha1sum: filepath,
      filepath,
      easeFactor: 300,
      interval: 0,
      lastReviewedOn: "",
      createdOn: "",
      reviewedCount: 0,
      noteState: "normal",
    };
  }

  async onload() {
    await this.loadSettings();
    this.data = await loadStore(this);

    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar();

    this.registerView(DUE_NOTES_VIEW_TYPE, (leaf) => new DueNotesView(leaf, this));

    this.addRibbonIcon("clock", "Show due notes", () => this.activateDueNotesView());

    this.addCommand({
      id: "show-due-notes",
      name: "Show due notes",
      callback: () => this.activateDueNotesView(),
    });

    this.addSettingTab(new SpacedEverythingSettingsTab(this.app, this));

    this.addCommand({
      id: "review-next-note",
      name: "Review next note",
      callback: async () => {
        this.data = await syncVault(this.app.vault, this.data, this.settings);
        await saveStore(this, this.data);
        this.updateStatusBar();
        await this.refreshDueNotesView();
        await this.refreshStatsView();
        const notes = Object.values(this.data.notes).filter((n) => n.interval >= 0);
        const note = pickNoteToReview(notes, this.settings);
        if (!note) {
          new Notice("No notes due!");
          return;
        }
        new ReviewModal(this.app, this, note).open();
      },
    });

    this.addCommand({
      id: "start-active-review",
      name: "Start active deck review",
      callback: () => {
        new DeckPickerModal(this.app, this).open();
      },
    });

    this.addCommand({
      id: "show-stats",
      name: "Show stats",
      callback: () => this.activateStatsView(),
    });

    this.addCommand({
      id: "sync-vault",
      name: "Sync vault with schedule",
      callback: async () => {
        this.data = await syncVault(this.app.vault, this.data, this.settings);
        await saveStore(this, this.data);
        this.updateStatusBar();
        await this.refreshDueNotesView();
        await this.refreshStatsView();
      },
    });

    // File explorer context menu
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu: Menu, file) => {
        // Single note
        if (file instanceof TFile && file.extension === "md") {
          const isActive = this.app.metadataCache.getFileCache(file)?.frontmatter?.active === true;
          menu.addItem((item) =>
            item
              .setTitle(isActive ? "Remove from active deck" : "Add to active deck")
              .setIcon(isActive ? "square" : "check-square")
              .onClick(async () => {
                const newActive = !isActive;
                await writeFrontmatterActive(this.app, file.path, newActive);
                const record = Object.values(this.data.notes).find((n) => n.filepath === file.path);
                if (record) this.data.notes[record.sha1sum].active = newActive;
              }),
          );
        }

        // Folder — add all notes inside
        if (file instanceof TFolder) {
          menu.addItem((item) =>
            item
              .setTitle("Add folder to deck...")
              .setIcon("layers")
              .onClick(() => {
                new FolderDeckPickerModal(this.app, file, this).open();
              }),
          );
        }
      }),
    );

    this.addCommand({
      id: "clear-active-deck",
      name: "Clear active deck (uncheck all notes)",
      callback: async () => {
        const activeFiles = this.app.vault
          .getMarkdownFiles()
          .filter((f) => this.app.metadataCache.getFileCache(f)?.frontmatter?.active === true);

        if (!activeFiles.length) {
          new Notice("No notes in the active deck.");
          return;
        }

        for (const file of activeFiles) {
          await writeFrontmatterActive(this.app, file.path, false);
          const record = Object.values(this.data.notes).find((n) => n.filepath === file.path);
          if (record) this.data.notes[record.sha1sum].active = false;
        }
        await saveStore(this, this.data);
        new Notice(`Cleared ${activeFiles.length} note${activeFiles.length !== 1 ? "s" : ""} from the active deck.`);
      },
    });

    this.registerView(STATS_VIEW_TYPE, (leaf) => new StatsView(leaf, this));
    this.addRibbonIcon("bar-chart", "Show stats", () => this.activateStatsView());

    // Auto-sync on file modify
    this.registerEvent(
      this.app.vault.on("modify", async (file) => {
        if (file instanceof TFile && file.extension === "md") {
          this.data = await syncVault(this.app.vault, this.data, this.settings);
          await saveStore(this, this.data);
          this.updateStatusBar();
          await this.refreshDueNotesView();
          await this.refreshStatsView();
        }
      }),
    );
  }

  async loadSettings() {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved?.settings ?? {});
  }

  async saveSettings() {
    const current = (await this.loadData()) ?? {};
    await this.saveData({ ...current, settings: this.settings });
  }

  updateStatusBar() {
    const allNotes = Object.values(this.data.notes).filter((n) => n.interval >= 0);
    const dueCount = allNotes.filter((n) => noteIsDue(n)).length;
    this.statusBarItem.setText(`${dueCount} due`);
  }

  async activateDueNotesView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(DUE_NOTES_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false)!;
      await leaf.setViewState({ type: DUE_NOTES_VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  async refreshDueNotesView() {
    for (const leaf of this.app.workspace.getLeavesOfType(DUE_NOTES_VIEW_TYPE)) {
      if (leaf.view instanceof DueNotesView) {
        await leaf.view.render();
      }
    }
  }

  async activateStatsView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(STATS_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false)!;
      await leaf.setViewState({ type: STATS_VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  async refreshStatsView() {
    for (const leaf of this.app.workspace.getLeavesOfType(STATS_VIEW_TYPE)) {
      if (leaf.view instanceof StatsView) {
        await leaf.view.render();
      }
    }
  }

  async resetData() {
    this.data = { notes: {}, reviewLoadLog: [], reviewHistory: [] };
    await saveStore(this, this.data);
    this.updateStatusBar();
    await this.refreshDueNotesView();
    await this.refreshStatsView();
    new Notice("All scheduling data has been reset.");
  }
}

class FolderDeckPickerModal extends Modal {
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
    folderRow.createSpan({ text: `Use folder name as deck ("${this.folder.name}")` });
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
          await writeFrontmatterDecks(this.app, f.path, decksToAssign);
        }
        const record = Object.values(this.plugin.data.notes).find((n) => n.filepath === f.path);
        if (record) {
          record.active = true;
          if (decksToAssign.length > 0) record.decks = decksToAssign;
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