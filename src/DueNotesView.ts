import { ItemView, WorkspaceLeaf } from "obsidian";
import { noteIsDue, numDaysOverdue } from "./scheduler";
import { ReviewModal } from "./ReviewModal";
import type SpacedEverythingPlugin from "./main";

export const DUE_NOTES_VIEW_TYPE = "spaced-everything-due-notes";

export class DueNotesView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private plugin: SpacedEverythingPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return DUE_NOTES_VIEW_TYPE;
  }
  getDisplayText(): string {
    return "Due Notes";
  }
  getIcon(): string {
    return "clock";
  }

  async onOpen() {
    await this.render();
  }
  async onClose() {
    this.contentEl.empty();
  }

  async render() {
    const { contentEl } = this;
    contentEl.empty();

    const allNotes = Object.values(this.plugin.data.notes).filter((n) => n.interval >= 0);
    const dueNotes = allNotes.filter((n) => noteIsDue(n)).sort((a, b) => numDaysOverdue(b) - numDaysOverdue(a));

    contentEl.createEl("h4", { text: "Due Notes" });

    if (dueNotes.length === 0) {
      contentEl.createEl("p", { text: "All caught up! No notes due.", cls: "spaced-empty" });
      return;
    }

    contentEl.createEl("p", {
      text: `${dueNotes.length} note${dueNotes.length !== 1 ? "s" : ""} due`,
      cls: "spaced-due-count",
    });

    const list = contentEl.createDiv({ cls: "spaced-due-list" });

    for (const note of dueNotes) {
      const row = list.createDiv({ cls: "spaced-due-row" });
      const info = row.createDiv({ cls: "spaced-due-info" });

      const filename = note.filepath.split("/").pop() ?? note.filepath;
      info.createEl("span", { text: filename, cls: "spaced-due-filename" });
      info.createEl("span", {
        text: ` · ${numDaysOverdue(note)}d overdue · ${note.noteState}`,
        cls: "spaced-due-meta",
      });

      const btn = row.createEl("button", { text: "Review", cls: "spaced-btn" });
      btn.addEventListener("click", () => {
        new ReviewModal(this.app, this.plugin, note).open();
      });
    }
  }
}
