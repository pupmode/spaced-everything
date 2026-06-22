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

    if (dueNotes.length === 0) {
      contentEl.createEl("div", {
        text: "All caught up — no notes due.",
        cls: "spaced-empty pane-empty",
      });
      return;
    }

    // Muted count line, like Obsidian's "X linked mentions"
    contentEl.createEl("div", {
      text: `${dueNotes.length} note${dueNotes.length !== 1 ? "s" : ""} due`,
      cls: "spaced-due-count",
    });

    const list = contentEl.createDiv({ cls: "nav-files-container" });

    for (const note of dueNotes) {
      const filename = note.filepath.split("/").pop()?.replace(/\.md$/, "") ?? note.filepath;
      const days = numDaysOverdue(note);

      const file = list.createDiv({ cls: "nav-file" });
      const title = file.createDiv({ cls: "nav-file-title" });

      title.createSpan({ text: filename, cls: "nav-file-title-content" });
      title.createSpan({
        text: `${days}d overdue · ${note.noteState}`,
        cls: "spaced-due-meta",
      });

      title.addEventListener("click", () => {
        new ReviewModal(this.app, this.plugin, note).open();
      });
    }
  }
}
