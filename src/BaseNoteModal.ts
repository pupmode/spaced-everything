import { App, Modal, TFile, Component } from "obsidian";
import { NoteRecord } from "./types";
import type SpacedEverythingPlugin from "./main";
import { writeFrontmatterActive, stripFrontmatter } from "./frontmatter";
import { extractMarkdown } from "./tiptap-editor";
import type { Editor } from "@tiptap/core";
import { RouteFolderModal } from "./RouteFolderModal";

export abstract class BaseNoteModal extends Modal {
  // ── Shared fields ──────────────────────────────────────────────────────────
  // "protected" means: accessible in this class AND in subclasses,
  // but not from outside code.
  protected tiptapEditor: Editor | null = null;
  protected renderComponent: Component | null = null;
  protected renderedContainer: HTMLElement | null = null;
  protected tiptapContainer: HTMLElement | null = null;
  protected isEditing = false;
  protected titleEl: HTMLElement | null = null;
  protected originalTitle = "";

  // These two must be set by the subclass constructor.
  // The "!" tells TypeScript "I promise this will be assigned before use."
  protected note!: NoteRecord;
  protected abstract plugin: SpacedEverythingPlugin;

  constructor(app: App) {
    super(app);
  }

  // ── Shared methods ─────────────────────────────────────────────────────────

  protected async saveBodyEdits(): Promise<void> {
    if (!this.isEditing || !this.tiptapEditor) return;
    const newBody = extractMarkdown(this.tiptapEditor);
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile | null;
    if (!file) return;
    const raw = await this.app.vault.read(file);
    const { frontmatter, body } = stripFrontmatter(raw);
    if (newBody.trim() === body.trim()) return;
    await this.app.vault.modify(file, frontmatter ? `${frontmatter}\n${newBody}` : newBody);
  }

  protected async saveTitle(): Promise<void> {
    if (!this.isEditing || !this.titleEl) return;
    const newName = (this.titleEl.textContent ?? "").trim();
    if (!newName || newName === this.originalTitle) return;
    const f = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
    if (!f) return;
    const dir = this.note.filepath.includes("/")
      ? this.note.filepath.substring(0, this.note.filepath.lastIndexOf("/"))
      : "";
    const newPath = dir ? `${dir}/${newName}.md` : `${newName}.md`;
    await this.app.vault.rename(f, newPath);
    this.note = { ...this.note, filepath: newPath };
    this.originalTitle = newName;
  }

  protected async autoActivateNote(): Promise<void> {
    if (this.note.active) return;
    this.note = { ...this.note, active: true };
    await writeFrontmatterActive(this.app, this.note.filepath, true);
    const cb = this.contentEl.querySelector<HTMLInputElement>(".spaced-active-checkbox");
    if (cb) cb.checked = true;
  }

  protected routeNote() {
    new RouteFolderModal(this.app, this.note, this.plugin, (newPath) => {
      this.note = { ...this.note, filepath: newPath };
    }).open();
  }

  protected cleanupEditors(): void {
    this.tiptapEditor?.destroy();
    this.tiptapEditor = null;
    this.renderComponent?.unload();
    this.renderComponent = null;
  }
}
