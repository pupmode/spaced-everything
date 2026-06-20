import type SpacedEverythingPlugin from "./main";
import { App, Modal, PluginSettingTab, Setting } from "obsidian";

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

    // Danger zone  
  containerEl.createEl("h3", { text: "Danger Zone" });  
    
  new Setting(containerEl)  
    .setName("Reset all scheduling data")  
    .setDesc(  
      "Permanently deletes all review history, intervals, and note states. " +  
      "Your note files are not affected. This cannot be undone."  
    )  
    .addButton(btn =>  
      btn  
        .setButtonText("Reset data")  
        .setWarning()  
        .onClick(() => new ResetConfirmModal(this.app, this.plugin).open())  
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