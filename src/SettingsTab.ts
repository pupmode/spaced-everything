import type SpacedEverythingPlugin from "./main";
import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import { ReactionSetMode } from "./types";

export class SpacedEverythingSettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: SpacedEverythingPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Spaced Everything" });

    new Setting(containerEl)
      .setName("Source scope")
      .setDesc("Process notes from the whole vault or a specific folder.")
      .addDropdown((drop) =>
        drop
          .addOption("vault", "Whole vault")
          .addOption("folder", "Specific folder")
          .setValue(this.plugin.settings.sourceScope)
          .onChange(async (v) => {
            this.plugin.settings.sourceScope = v as "vault" | "folder";
            await this.plugin.saveSettings();
            this.display(); // re-render to show/hide folder input
          }),
      );

    const folders = this.app.vault
      .getAllFolders()
      .map((f) => f.path)
      .sort();

    if (this.plugin.settings.sourceScope === "folder") {
      // Show each selected folder with a Remove button
      for (const entry of this.plugin.settings.sourceFolders) {
        new Setting(containerEl)
          .setName(entry.path)
          .setDesc("Review quota weight (%). 100 = default, lower = appears less often.")
          .addSlider((sl) =>
            sl
              .setLimits(1, 200, 1)
              .setValue(entry.weight)
              .setDynamicTooltip()
              .onChange(async (v) => {
                entry.weight = v;
                await this.plugin.saveSettings();
              }),
          )
          .addButton((btn) =>
            btn
              .setButtonText("Remove")
              .setWarning()
              .onClick(async () => {
                this.plugin.settings.sourceFolders = this.plugin.settings.sourceFolders.filter(
                  (e) => e.path !== entry.path,
                );
                await this.plugin.saveSettings();
                this.display();
              }),
          );
      }

      let pendingFolder = "";
      new Setting(containerEl)
        .setName("Add source folder")
        .addDropdown((drop) => {
          drop.addOption("", "— select a folder —");
          for (const f of folders) {
            // ← use `folders`, not getAllFolderPaths()
            if (!this.plugin.settings.sourceFolders.some((e) => e.path === f)) {
              drop.addOption(f, f);
            }
          }
          drop.onChange((v) => {
            pendingFolder = v;
          });
        })
        .addButton((btn) =>
          btn.setButtonText("Add").onClick(async () => {
            if (pendingFolder && !this.plugin.settings.sourceFolders.some((e) => e.path === pendingFolder)) {
              this.plugin.settings.sourceFolders.push({ path: pendingFolder, weight: 100 });
              await this.plugin.saveSettings();
              this.display();
            }
          }),
        );
    }

    new Setting(containerEl)
      .setName("Evergreen destination folder")
      .setDesc("Where routed notes are moved to.")
      .addDropdown((drop) => {
        drop.addOption("", "— select a folder —");
        for (const folder of folders) {
          drop.addOption(folder, folder);
        }
        drop.setValue(this.plugin.settings.evergreenFolder).onChange(async (v) => {
          this.plugin.settings.evergreenFolder = v;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Initial interval (days)")
      .setDesc("How many days before a new note first appears for review.")
      .addText((text) =>
        text.setValue(String(this.plugin.settings.initialInterval)).onChange(async (v) => {
          const n = parseInt(v);
          if (!isNaN(n) && n > 0) {
            this.plugin.settings.initialInterval = n;
            await this.plugin.saveSettings();
          }
        }),
      );

    new Setting(containerEl)
      .setName("Default ease factor (%)")
      .setDesc("Multiplier for interval growth. 300 = 3x per review cycle.")
      .addText((text) =>
        text.setValue(String(this.plugin.settings.defaultEaseFactor)).onChange(async (v) => {
          const n = parseInt(v);
          if (!isNaN(n) && n > 0) {
            this.plugin.settings.defaultEaseFactor = n;
            await this.plugin.saveSettings();
          }
        }),
      );

    new Setting(containerEl)
      .setName("Rename folder when renaming deck")
      .setDesc("If a deck has a matching folder, rename the folder too.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.renameFolderWithDeck).onChange(async (v) => {
          this.plugin.settings.renameFolderWithDeck = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Recent-note priority threshold")
      .setDesc("Probability (0–1) of trying to show a recently-created unreviewed note first. Default: 0.5")
      .addText((text) =>
        text.setValue(String(this.plugin.settings.recentUndueThreshold)).onChange(async (v) => {
          const n = parseFloat(v);
          if (!isNaN(n) && n >= 0 && n <= 1) {
            this.plugin.settings.recentUndueThreshold = n;
            await this.plugin.saveSettings();
          }
        }),
      );

    new Setting(containerEl)
      .setName("Exciting-note priority threshold")
      .setDesc(
        "Cumulative probability (0–1) of trying to show an exciting note. Must be > recent-note threshold. Default: 0.7",
      )
      .addText((text) =>
        text.setValue(String(this.plugin.settings.excitingThreshold)).onChange(async (v) => {
          const n = parseFloat(v);
          if (!isNaN(n) && n >= 0 && n <= 1) {
            if (n <= this.plugin.settings.recentUndueThreshold) {
              new Notice("Exciting threshold must be greater than recent-note threshold.");
              return;
            }
            this.plugin.settings.excitingThreshold = n;
            await this.plugin.saveSettings();
          }
          
        }),
      );

     // Reaction buttons  
containerEl.createEl("h3", { text: "Reaction buttons" });  
  
new Setting(containerEl)  
  .setName("Reaction set")  
  .setDesc("Choose which reaction buttons appear during review.")  
  .addDropdown((drop) =>  
    drop  
      .addOption("default", "Default (Exciting / Interesting / …)")  
      .addOption("anki", "Anki (Easy / Good / Hard / Again)")  
      .addOption("custom", "Custom")  
      .setValue(this.plugin.settings.reactionSetMode)  
      .onChange(async (v) => {  
        this.plugin.settings.reactionSetMode = v as ReactionSetMode;  
        await this.plugin.saveSettings();  
        this.display();  
      }),  
  );  
  
if (this.plugin.settings.reactionSetMode === "custom") {  
  const reactions = this.plugin.settings.customReactions;  
  const n = reactions.length;  
  
  containerEl.createEl("p", {  
    text: "← more often    less often →",  
    cls: "spaced-reaction-dir-label",  
  });  
  
  reactions.forEach((r, i) => {  
    const t = n === 1 ? 0.5 : i / (n - 1);  
    const mult = 0.83 + (1.5 - 0.83) * t;  
    const easeDelta = Math.round(20 - 40 * t);  
    const sign = easeDelta >= 0 ? "+" : "";  
  
    new Setting(containerEl)  
      .setName(`${r.id}`)  
      .setDesc(`interval ×${mult.toFixed(2)}  |  ease ${sign}${easeDelta}`)  
      .addText((text) =>  
        text  
          .setValue(r.label)  
          .setPlaceholder("Label")  
          .onChange(async (v) => {  
            reactions[i].label = v;  
            await this.plugin.saveSettings();  
          }),  
      )  
      .addButton((btn) =>  
        btn  
          .setIcon("arrow-up")  
          .setTooltip("Move up (more often)")  
          .setDisabled(i === 0)  
          .onClick(async () => {  
            [reactions[i - 1], reactions[i]] = [reactions[i], reactions[i - 1]];  
            await this.plugin.saveSettings();  
            this.display();  
          }),  
      )  
      .addButton((btn) =>  
        btn  
          .setIcon("arrow-down")  
          .setTooltip("Move down (less often)")  
          .setDisabled(i === reactions.length - 1)  
          .onClick(async () => {  
            [reactions[i + 1], reactions[i]] = [reactions[i], reactions[i + 1]];  
            await this.plugin.saveSettings();  
            this.display();  
          }),  
      )  
      .addButton((btn) =>  
        btn  
          .setIcon("trash-2")  
          .setTooltip("Remove")  
          .setWarning()  
          .onClick(async () => {  
            reactions.splice(i, 1);  
            await this.plugin.saveSettings();  
            this.display();  
          }),  
      );  
  });  
  
  let newLabel = "";  
  new Setting(containerEl)  
    .setName("Add reaction")  
    .addText((text) =>  
      text  
        .setPlaceholder("Label")  
        .onChange((v) => {  
          newLabel = v;  
        }),  
    )  
    .addButton((btn) =>  
      btn.setButtonText("Add").onClick(async () => {  
        const trimmed = newLabel.trim();  
        if (!trimmed) return;  
        const id = trimmed.toLowerCase().replace(/\s+/g, "-");  
        if (reactions.some((r) => r.id === id)) {  
          new Notice(`A reaction with id "${id}" already exists.`);  
          return;  
        }  
        reactions.push({ id, label: trimmed });  
        await this.plugin.saveSettings();  
        this.display();  
      }),  
    );  
}

    // Danger zone
    containerEl.createEl("h3", { text: "Danger Zone" });

    new Setting(containerEl)
      .setName("Reset all scheduling data")
      .setDesc(
        "Permanently deletes all review history, intervals, and note states. " +
          "Your note files are not affected. This cannot be undone.",
      )
      .addButton((btn) =>
        btn
          .setButtonText("Reset data")
          .setWarning()
          .onClick(() => new ResetConfirmModal(this.app, this.plugin).open()),
      );
  }
}


class ResetConfirmModal extends Modal {
  constructor(
    app: App,
    private plugin: SpacedEverythingPlugin,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Reset all scheduling data?" });
    contentEl.createEl("p", {
      text:
        "This will permanently delete all review history, intervals, and scheduling " +
        "data for every note. Your actual note files will not be touched. " +
        "After reset, all notes will be re-imported on the next sync.",
    });
    contentEl.createEl("p", {
      text: "This cannot be undone.",
      cls: "spaced-reset-warning",
    });

    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });

    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());

    const confirmBtn = btnRow.createEl("button", {
      text: "Reset everything",
      cls: "mod-warning",
    });
    confirmBtn.addEventListener("click", async () => {
      await this.plugin.resetData();
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
