import { Plugin, TFile, TFolder, Menu, Notice } from "obsidian";
import { loadStore, saveStore } from "./store";
import { ReviewModal } from "./ReviewModal";
import { SpacedEverythingSettingsTab } from "./SettingsTab";
import { DueNotesView, DUE_NOTES_VIEW_TYPE } from "./DueNotesView";
import { StatsView, STATS_VIEW_TYPE } from "./StatsView";
import { DeckPickerModal } from "./DeckPickerModal";
import { FolderDeckPickerModal } from "./FolderDeckPickerModal";
import { SpacedEverythingSettings, DEFAULT_SETTINGS, PluginData, NoteRecord } from "./types";
import { getNotesFromVault, writeFrontmatterActive } from "./frontmatter";
import { pickNoteToReview, noteIsDue } from "./scheduler";
import { today } from "./utils";
import { TestModal } from "./testmodal";

export default class SpacedEverythingPlugin extends Plugin {
  settings: SpacedEverythingSettings;
  data: PluginData;

  private statusBarItem: HTMLElement;

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
        delete this.data.srsSession;
        const notes = getNotesFromVault(this.app, this.settings).filter((n) => n.interval >= 0);
        const dueCount = notes.filter((n) => noteIsDue(n)).length;
        this.data.reviewLoadLog.push({ timestamp: today(), numNotes: notes.length, numDue: dueCount });
        await saveStore(this, this.data);
        this.updateStatusBar(notes);
        await this.refreshDueNotesView();
        await this.refreshStatsView();
        const note = pickNoteToReview(notes, this.settings);
        if (!note) {
          new Notice("No notes due!");
          return;
        }
        new ReviewModal(this.app, this, note).open();
      },
    });

    this.addCommand({
      id: "continue-review",
      name: "Continue review session",
      callback: async () => {
        const saved = this.data.srsSession;
        if (!saved || saved.reviewedFilepaths.length === 0) {
          new Notice("No saved session found. Use 'Review next note' to start one.");
          return;
        }
        const allNotes = getNotesFromVault(this.app, this.settings).filter((n) => n.interval >= 0);
        const remaining = allNotes.filter((n) => noteIsDue(n) && !saved.reviewedFilepaths.includes(n.filepath));
        if (remaining.length === 0) {
          new Notice("Session complete — no notes remaining.");
          delete this.data.srsSession;
          await saveStore(this, this.data);
          return;
        }
        const note = pickNoteToReview(remaining, this.settings);
        if (!note) return;
        const modal = new ReviewModal(this.app, this, note);
        modal.resumeSession(saved);
        modal.open();
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
      name: "Refresh schedule views",
      callback: async () => {
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
                await writeFrontmatterActive(this.app, file.path, !isActive);
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

    /* Iterate all markdown files in the vault
For each file, read frontmatter.decks from metadataCache
Check if it's an array with any duplicates (i.e., new Set(decks).size < decks.length)
If so, call writeFrontmatterDecks(this.app, file.path, [...new Set(decks)])
Show a Notice reporting how many files were fixed

https://deepwiki.com/search/sometimes-i-have-a-problem-whe_b957aec4-c8f6-4a07-a9ea-5b4c84e7b320
    this.addCommand({
      id: "check-deck-dupes",
      name: "Check deck duplicates",
      callback: async () => {
         iterate all markdown files in vault 
        const Files = this.app.vault
          .getMarkdownFiles()
        
      },
    });*/

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
        }
        new Notice(`Cleared ${activeFiles.length} note${activeFiles.length !== 1 ? "s" : ""} from the active deck.`);
      },
    });

    this.registerView(STATS_VIEW_TYPE, (leaf) => new StatsView(leaf, this));
    this.addRibbonIcon("bar-chart", "Show stats", () => this.activateStatsView());
  }

  onunload() {}

  async loadSettings() {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved?.settings ?? {});
  }

  async saveSettings() {
    const current = (await this.loadData()) ?? {};
    await this.saveData({ ...current, settings: this.settings });
  }

  updateStatusBar(precomputed?: NoteRecord[]) {
    const allNotes = precomputed ?? getNotesFromVault(this.app, this.settings).filter((n) => n.interval >= 0);
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
    this.data = { reviewLoadLog: [], reviewHistory: [] };
    await saveStore(this, this.data);
    this.updateStatusBar();
    await this.refreshDueNotesView();
    await this.refreshStatsView();
    new Notice("All scheduling data has been reset.");
  }
}
