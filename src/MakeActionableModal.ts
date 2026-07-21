import { App, Modal, Notice } from "obsidian";
import type { EnergyColor } from "./types";
import { writeFrontmatterActionable } from "./frontmatter";

const ENERGY_OPTIONS: { value: EnergyColor; label: string; desc: string }[] = [
  { value: "🔥", label: "🔥", desc: "Urgent + high energy" },
  { value: "🪔", label: "🪔", desc: "Urgent + low energy" },
  { value: "🌊", label: "🌊", desc: "Fun + low energy" },
  { value: "🌿", label: "🌿", desc: "Fun + high energy" },
];

const TIMEBLOCKS = ["morning", "afternoon", "evening", "night"];

export class MakeActionableModal extends Modal {
  private selectedEnergy: EnergyColor[] = [];
  private selectedTimeblocks: string[] = [];

  constructor(
    app: App,
    private filepath: string,
    private onConfirm: () => void,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
   const noteTitle = this.filepath.split("/").pop()!.replace(/\.md$/, "");
    this.titleEl.setText(`Make actionable — ${noteTitle}`);

    // Energy
    contentEl.createEl("p", { text: "Energy level", cls: "spaced-mka-label" });
    const energyRow = contentEl.createDiv({ cls: "spaced-mka-row" });
    for (const opt of ENERGY_OPTIONS) {
      const btn = energyRow.createEl("button", { cls: `spaced-mka-btn spaced-mka-${opt.value}` });
      btn.createEl("span", { text: opt.label, cls: "spaced-mka-btn-label" });
      btn.createEl("span", { text: opt.desc, cls: "spaced-mka-btn-desc" });
      btn.addEventListener("click", () => {
        if (this.selectedEnergy.includes(opt.value)) {
          this.selectedEnergy = this.selectedEnergy.filter((e) => e !== opt.value);
          btn.removeClass("is-active");
        } else {
          this.selectedEnergy.push(opt.value);
          btn.addClass("is-active");
        }
      });
    }

    // Timeblock
    contentEl.createEl("p", { text: "Timeblock", cls: "spaced-mka-label" });
    const tbRow = contentEl.createDiv({ cls: "spaced-mka-row" });
    for (const block of TIMEBLOCKS) {
      const btn = tbRow.createEl("button", { text: block, cls: "spaced-mka-btn" });
      btn.addEventListener("click", () => {
        if (this.selectedTimeblocks.includes(block)) {
          this.selectedTimeblocks = this.selectedTimeblocks.filter((t) => t !== block);
          btn.removeClass("is-active");
        } else {
          this.selectedTimeblocks.push(block);
          btn.addClass("is-active");
        }
      });
    }

    // Confirm / Cancel
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    const confirmBtn = btnRow.createEl("button", { text: "Make actionable", cls: "mod-cta" });
    confirmBtn.addEventListener("click", async () => {
      await writeFrontmatterActionable(this.app, this.filepath, {
        energy: this.selectedEnergy.length > 0 ? this.selectedEnergy : undefined,
        timeblock: this.selectedTimeblocks.length > 0 ? this.selectedTimeblocks : undefined,
      });
      new Notice(`${noteTitle} marked as actionable`);
      this.onConfirm();
      this.close();
    });
    const cancelBtn = btnRow.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}
