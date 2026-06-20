// ← Plugin entry point, registers commands & events

import { Plugin, TFile, Notice} from "obsidian";
import { SpacedEverythingSettings, DEFAULT_SETTINGS, PluginData } from "./types";
import { loadStore, saveStore } from "./store";
import { syncVault } from "./sync";
import { pickNoteToReview, noteIsDue} from "./scheduler";
import { ReviewModal } from "./ReviewModal";
import { SpacedEverythingSettingsTab } from "./SettingsTab";
import { DueNotesView, DUE_NOTES_VIEW_TYPE } from "./DueNotesView";
import { StatsView, STATS_VIEW_TYPE } from "./StatsView";  

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
        this.data = await syncVault(this.app.vault, this.data, this.settings);
        await saveStore(this, this.data);
        this.updateStatusBar();
        await this.refreshDueNotesView();
        await this.refreshStatsView
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
        await this.refreshStatsView
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
          await this.refreshStatsView
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
    this.data = { notes: {}, reviewLoadLog: [] };
    await saveStore(this, this.data);
    this.updateStatusBar();
    await this.refreshDueNotesView();
    await this.refreshStatsView
    new Notice("All scheduling data has been reset.");
  }
}