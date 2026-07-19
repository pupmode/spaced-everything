import type SpacedEverythingPlugin from "./main";
import { App, Modal, Notice, setIcon, PluginSettingTab, Setting } from "obsidian";
import { CustomReactionSet } from "./types";

const REACTION_RAMP = [
  "spaced-seg-purple",
  "spaced-seg-blue",
  "spaced-seg-green",
  "spaced-seg-yellow",
  "spaced-seg-orange",
  "spaced-seg-red",
];

let _activePaletteHandler: ((e: MouseEvent) => void) | null = null;  

function openColorPalette(anchor, current, onPick) {
  document.querySelectorAll(".spaced-color-palette").forEach((el) => el.remove());
  // Remove old handler before registering a new one
  if (_activePaletteHandler) {
    document.removeEventListener("mousedown", _activePaletteHandler);
    _activePaletteHandler = null;
  }

  const palette = document.body.createDiv({ cls: "spaced-color-palette" });
  const rect = anchor.getBoundingClientRect();
  palette.style.top = `${rect.bottom + 4}px`;
  palette.style.left = `${rect.left}px`;

  for (const cls of REACTION_RAMP) {
    const dot = palette.createEl("button", { cls: `spaced-color-dot ${cls}` });
    if (cls === current) dot.addClass("spaced-color-dot--active");
    dot.addEventListener("mousedown", (e) => {
      e.preventDefault();
      onPick(cls);
      palette.remove();
    });
  }

  const outsideHandler = (e: MouseEvent) => {
    if (!document.contains(palette) || !palette.contains(e.target as Node)) {
      palette.remove();
      document.removeEventListener("mousedown", outsideHandler);
      _activePaletteHandler = null;
    }
  };
  _activePaletteHandler = outsideHandler;
  setTimeout(() => document.addEventListener("mousedown", outsideHandler), 0);
}

export class SpacedEverythingSettingsTab extends PluginSettingTab {
  private pendingFolder = "";
  private pendingSetName = "";
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
            this.display();
          }),
      );

    const folders = this.app.vault
      .getAllFolders()
      .map((f) => f.path)
      .sort();

    if (this.plugin.settings.sourceScope === "folder") {
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

      this.pendingFolder = "";
      new Setting(containerEl)
        .setName("Add source folder")
        .addDropdown((drop) => {
          drop.addOption("", "— select a folder —");
          for (const f of folders) {
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
            if (n >= this.plugin.settings.excitingThreshold) {
              new Notice("Recent-note threshold must be less than exciting threshold.");
              return;
            }
            this.plugin.settings.recentUndueThreshold = n;
            await this.plugin.saveSettings();
          }
        }),
      );

    // Reaction buttons
    containerEl.createEl("h3", { text: "Reaction buttons" });

    new Setting(containerEl)
      .setName("Reaction set")
      .setDesc("Choose which reaction buttons appear during review.")
      .addDropdown((drop) => {
        drop.addOption("default", "Default (Exciting / Interesting / …)");
        drop.addOption("anki", "Anki (Easy / Good / Hard / Again)");
        for (const set of this.plugin.settings.customReactionSets) {
          drop.addOption(set.id, set.name);
        }
        drop.setValue(this.plugin.settings.reactionSetMode).onChange(async (v) => {
          this.plugin.settings.reactionSetMode = v;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    const activeSet = this.plugin.settings.customReactionSets.find(
      (s) => s.id === this.plugin.settings.reactionSetMode,
    );
    if (activeSet) {
      new Setting(containerEl)
        .setName(`Edit: ${activeSet.name}`)
        .addButton((btn) =>
          btn
            .setButtonText("Open editor")
            .onClick(() => new CustomReactionSetModal(this.app, this.plugin, activeSet).open()),
        );
    }

    if (activeSet) {
      new Setting(containerEl)
        .setName(`Edit: ${activeSet.name}`)
        .addButton((btn) =>
          btn
            .setButtonText("Open editor")
            .onClick(() => new CustomReactionSetModal(this.app, this.plugin, activeSet).open()),
        )
        .addButton((btn) =>
          btn
            .setButtonText("Delete")
            .setWarning()
            .onClick(async () => {
              this.plugin.settings.customReactionSets = this.plugin.settings.customReactionSets.filter(
                (s) => s.id !== activeSet.id,
              );
              this.plugin.settings.reactionSetMode = "default";
              await this.plugin.saveSettings();
              this.display();
            }),
        );
    }

    this.pendingSetName = "";
    new Setting(containerEl)
      .setName("Add custom reaction set")
      .addText((text) =>
        text.setPlaceholder("Set name").onChange((v) => {
          pendingSetName = v;
        }),
      )
      .addButton((btn) =>
        btn.setButtonText("Add").onClick(async () => {
          const name = pendingSetName.trim();
          if (!name) return;
          const id = name.toLowerCase().replace(/\s+/g, "-");
          if (this.plugin.settings.customReactionSets.some((s) => s.id === id)) {
            new Notice(`A set with id "${id}" already exists.`);
            return;
          }
          this.plugin.settings.customReactionSets.push({ id, name, reactions: [] });
          this.plugin.settings.reactionSetMode = id;
          await this.plugin.saveSettings();
          this.display();
        }),
      );

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

class CustomReactionSetModal extends Modal {
  constructor(
    app: App,
    private plugin: SpacedEverythingPlugin,
    private set: CustomReactionSet,
  ) {
    super(app);
  }

  onOpen() {
    this.modalEl.addClass("spaced-reaction-panel");
    this.titleEl.setText(this.set.name);
    this.renderReactions();
  }

  renderReactions() {
    const { contentEl } = this;
    contentEl.empty();
    const reactions = this.set.reactions;

    const list = contentEl.createDiv({ cls: "spaced-reaction-list" });

    reactions.forEach((r, i) => {
      const autoReactions = reactions.filter((rx) => !rx.manualOverride);
      const autoN = autoReactions.length;
      const autoIdx = autoReactions.findIndex((rx) => rx.id === r.id);
      const tAuto = autoN <= 1 ? 0.5 : autoIdx / (autoN - 1);
      const tFull = reactions.length === 1 ? 0.5 : i / (reactions.length - 1);
      const t = r.manualOverride ? tFull : tAuto;
      const mult = 0.83 + (1.5 - 0.83) * t;
      const easeDelta = Math.round(20 - 40 * t);
      const sign = easeDelta >= 0 ? "+" : "";

      const row = list.createDiv({ cls: "spaced-reaction-item" });

      // Minus (remove)
      const removeBtn = row.createEl("button", { cls: "clickable-icon" });
      setIcon(removeBtn, "circle-minus");
      removeBtn.addEventListener("click", async () => {
        reactions.splice(i, 1);
        await this.plugin.saveSettings();
        this.renderReactions();
      });

      // Manual override checkbox
      const checkbox = row.createEl("input", { type: "checkbox" });
      checkbox.checked = r.manualOverride ?? false;
      checkbox.addEventListener("change", async () => {
        reactions[i].manualOverride = checkbox.checked;
        if (!checkbox.checked) {
          delete reactions[i].intervalMult;
          delete reactions[i].easeDelta;
        } else {
          reactions[i].intervalMult = parseFloat((0.83 + (1.5 - 0.83) * tFull).toFixed(2));
          reactions[i].easeDelta = Math.round(20 - 40 * tFull);
        }
        await this.plugin.saveSettings();
        this.renderReactions();
      });

      // Ghost label input
      const labelInput = row.createEl("input", { type: "text", cls: "spaced-reaction-label-input" });
      labelInput.value = r.label;
      labelInput.placeholder = "Label";
      labelInput.addEventListener("change", async () => {
        reactions[i].label = labelInput.value;
        await this.plugin.saveSettings();
      });

      // Color swatch — shows current color, click cycles through ramp or clears
      const RAMP = [
        "spaced-seg-purple",
        "spaced-seg-blue",
        "spaced-seg-green",
        "spaced-seg-yellow",
        "spaced-seg-orange",
        "spaced-seg-red",
      ];

      // Compute the default ramp color for this reaction (same math as reactionColor())
      const defaultColorIdx = Math.round(tFull * (RAMP.length - 1));
      const defaultColor = RAMP[defaultColorIdx];
      const activeColor = r.color ?? defaultColor;

      const swatch = row.createEl("button", { cls: `clickable-icon spaced-reaction-swatch ${activeColor}` });
      swatch.title = r.color ? `Color: ${r.color} (click to change)` : "Color: auto (click to override)";

      swatch.addEventListener("click", () => {
        // Show a mini palette popover
        openColorPalette(swatch, activeColor, async (chosen) => {
          if (chosen === defaultColor) {
            // Choosing the default = clear the override
            delete reactions[i].color;
          } else {
            reactions[i].color = chosen;
          }
          await this.plugin.saveSettings();
          this.renderReactions();
        });
      });

      // Interval/ease: editable inputs or muted text
      if (r.manualOverride) {
        const inputs = row.createDiv({ cls: "spaced-reaction-inputs" });

        const multInput = inputs.createEl("input", { type: "text", cls: "spaced-reaction-input" });
        multInput.placeholder = `×${mult.toFixed(2)}`;
        multInput.value = r.intervalMult !== undefined ? String(r.intervalMult) : "";
        multInput.addEventListener("change", async () => {
          const n = parseFloat(multInput.value);
          if (!isNaN(n) && n > 0) {
            reactions[i].intervalMult = n;
            await this.plugin.saveSettings();
          }
        });

        const easeInput = inputs.createEl("input", { type: "text", cls: "spaced-reaction-input" });
        easeInput.placeholder = `ease ${sign}${easeDelta}`;
        easeInput.value = r.easeDelta !== undefined ? String(r.easeDelta) : "";
        easeInput.addEventListener("change", async () => {
          const n = parseInt(easeInput.value);
          if (!isNaN(n)) {
            reactions[i].easeDelta = n;
            await this.plugin.saveSettings();
          }
        });
      } else {
        row.createSpan({
          text: `×${mult.toFixed(2)}  ease ${sign}${easeDelta}`,
          cls: "spaced-reaction-meta",
        });
      }

      // Up / Down arrows
      const upBtn = row.createEl("button", { cls: "clickable-icon" });
      setIcon(upBtn, "arrow-up");
      upBtn.disabled = i === 0;
      upBtn.addEventListener("click", async () => {
        [reactions[i - 1], reactions[i]] = [reactions[i], reactions[i - 1]];
        await this.plugin.saveSettings();
        this.renderReactions();
      });

      const downBtn = row.createEl("button", { cls: "clickable-icon" });
      setIcon(downBtn, "arrow-down");
      downBtn.disabled = i === reactions.length - 1;
      downBtn.addEventListener("click", async () => {
        [reactions[i + 1], reactions[i]] = [reactions[i], reactions[i + 1]];
        await this.plugin.saveSettings();
        this.renderReactions();
      });
    });

    // Add row at the bottom
    const addRow = contentEl.createDiv({ cls: "spaced-reaction-add-row" });
    const addInput = addRow.createEl("input", { type: "text", cls: "spaced-reaction-add-input" });
    addInput.placeholder = "New reaction label…";

    const addBtn = addRow.createEl("button", { cls: "clickable-icon" });
    setIcon(addBtn, "circle-plus"); // matches the deck dropdown's add icon

    const doAdd = async () => {
      const trimmed = addInput.value.trim();
      if (!trimmed) return;
      const id = trimmed.toLowerCase().replace(/\s+/g, "-");
      if (reactions.some((r) => r.id === id)) {
        new Notice(`A reaction with id "${id}" already exists.`);
        return;
      }
      reactions.push({ id, label: trimmed });
      await this.plugin.saveSettings();
      this.renderReactions();
    };

    addBtn.addEventListener("click", doAdd);
    addInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        await doAdd();
        e.preventDefault();
      }
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}
