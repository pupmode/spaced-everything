import { App, Component, Modal, MarkdownRenderer, TFile } from "obsidian";
import { NoteRecord, NoteState } from "./types";
import { nextInterval, today, noteIsDue } from "./scheduler";
import { saveStore } from "./store";
import { pickNoteToReview } from "./scheduler";
import type SpacedEverythingPlugin from "./main";
import { writeFrontmatterReaction } from "./frontmatter";  

export class ReviewModal extends Modal {
  private renderComponent: Component | null = null;

  constructor(
    app: App,
    private plugin: SpacedEverythingPlugin,
    private note: NoteRecord,
  ) {
    super(app);
  }

  async onOpen() {
    await this.render();
  }

  private async render() {
    const { contentEl } = this;
    contentEl.empty();

    // Unload previous render component to avoid memory leaks on re-render
    if (this.renderComponent) {
      this.renderComponent.unload();
    }
    this.renderComponent = new Component();
    this.renderComponent.load();

    const title = this.note.filepath.split("/").pop()!.replace(/\.md$/, "");
    const titleEl = contentEl.createEl("h1", { text: title, cls: "spaced-note-title" });
    titleEl.style.cursor = "pointer";
    titleEl.addEventListener("click", async () => {
      const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
      if (!file) return;
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.openFile(file);
    });

    // Due count header
    const allNotes = Object.values(this.plugin.data.notes).filter((n) => n.interval >= 0);
    const dueCount = allNotes.filter((n) => noteIsDue(n)).length;
    contentEl.createEl("div", {
      text: `${dueCount} note${dueCount !== 1 ? "s" : ""} due`,
      cls: "spaced-due-count",
    });

    // Render note content
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
    if (!file) {
      contentEl.createEl("p", { text: `File not found: ${this.note.filepath}` });
      return;
    }
    const content = await this.app.vault.read(file);
    const renderEl = contentEl.createDiv({ cls: "spaced-note-content" });
    await MarkdownRenderer.render(
      this.app,
      content,
      renderEl,
      this.note.filepath,
      this.renderComponent, // ← was: this
    );

    // Reaction buttons
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    this.addBtn(btnRow, "Exciting", "exciting", () => this.react("exciting"));
    this.addBtn(btnRow, "Interesting", "interesting", () => this.react("interesting"));
    this.addBtn(btnRow, "Yeah", "yeah", () => this.react("yeah"));
    this.addBtn(btnRow, "Lol", "lol", () => this.react("lol"));
    this.addBtn(btnRow, "Meh", "meh", () => this.react("meh"));
    this.addBtn(btnRow, "Cringe", "cringe", () => this.react("cringe"));
    this.addBtn(btnRow, "Taxing", "taxing", () => this.react("taxing"));
    this.addBtn(btnRow, "Revisit soon", "revisit", () => this.react("revisit"));
    this.addBtn(btnRow, "Route →", "route", () => this.routeNote());
    this.addBtn(btnRow, "Skip", "skip", () => this.react("skip"));
    this.addBtn(btnRow, "Archive", "archive", () => this.archiveNote());
    this.addBtn(btnRow, "Delete", "delete", () => this.deleteNote());
    const editBtn = btnRow.createEl("button", { text: "Edit", cls: "spaced-btn spaced-btn-edit" });
    editBtn.addEventListener("click", async () => {
      const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
      if (!file) return;
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.openFile(file);
      // Do NOT call react() or update the schedule
    });
  }

  private addBtn(container: HTMLElement, label: string, cls: string, cb: () => void) {
    const btn = container.createEl("button", {
      text: label,
      cls: `spaced-btn spaced-btn-${cls}`,
    });
    btn.addEventListener("click", cb);
  }

  private async react(reaction: NoteState | "skip") {
    const newNoteState: NoteState = reaction === "skip" ? this.note.noteState : (reaction as NoteState);
    const newInterval = nextInterval(this.note, reaction);
    this.plugin.data.notes[this.note.sha1sum] = {
      ...this.note,
      interval: newInterval,
      lastReviewedOn: today(),
      reviewedCount: this.note.reviewedCount + 1,
      noteState: newNoteState,
    };
    await saveStore(this.plugin, this.plugin.data);
    await writeFrontmatterReaction(this.app, this.note.filepath, newNoteState);
    await this.showNextNote();
  }

  private async routeNote() {
    const filename = this.note.filepath.split("/").pop()!;
    const dest = `${this.plugin.settings.evergreenFolder}/${filename}`;
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
    await this.app.vault.rename(file, dest);
    await saveStore(this.plugin, this.plugin.data);
    await writeFrontmatterReaction(this.app, dest, this.note.noteState);
    await this.showNextNote();
  }

  private async archiveNote() {
    this.plugin.data.notes[this.note.sha1sum].interval = -1;
    await saveStore(this.plugin, this.plugin.data);
    await this.showNextNote();
  }

  private async showNextNote() {
    const allNotes = Object.values(this.plugin.data.notes).filter((n) => n.interval >= 0);
    const next = pickNoteToReview(notes, this.plugin.settings);
    if (!next) {
      const { contentEl } = this;
      contentEl.empty();
      contentEl.createEl("h3", { text: "All caught up!" });
      contentEl.createEl("p", { text: "No more notes due. Close this modal to exit." });
      return;
    }
    this.note = next;
    await this.render();
  }

  private async deleteNote() {
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
    if (file) {
      await this.app.vault.delete(file);
    }
    // Remove from store entirely (not just soft-delete)
    delete this.plugin.data.notes[this.note.sha1sum];
    await saveStore(this.plugin, this.plugin.data);
    await this.showNextNote();
  }

  onClose() {
    if (this.renderComponent) {
      this.renderComponent.unload();
      this.renderComponent = null;
    }
    this.contentEl.empty();
  }
}
