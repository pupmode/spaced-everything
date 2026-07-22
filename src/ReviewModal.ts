import { App, TFile, setIcon } from "obsidian";
import { NoteRecord, SrsSession, getActiveReactions } from "./types";
import { nextInterval, nextEaseFactor, noteIsDue, pickNoteToReview } from "./scheduler";
import { today } from "./utils";
import { saveStore } from "./store";
import type SpacedEverythingPlugin from "./main";
import { writeNoteRecord, getNotesFromVault, writeFrontmatterState } from "./frontmatter";
import { BaseNoteModal } from "./BaseNoteModal";
import { MakeActionableModal } from "./MakeActionableModal";

export class ReviewModal extends BaseNoteModal {
  private reviewStartTime = 0;
  private reviewedInSession = new Set<string>();
  private progressLog: string[] = [];
  private sessionSize = 0;
  private activeSources: string[] = [];
  constructor(
    app: App,
    protected plugin: SpacedEverythingPlugin,
    protected note: NoteRecord,
  ) {
    super(app);
  }
  private getSourceFolderList(): string[] {
    if (this.plugin.settings.sourceScope === "folder") {
      return this.plugin.settings.sourceFolders.map((f) => f.path);
    }
    // vault scope: derive unique top-level dirs from live notes
    const notes = getNotesFromVault(this.plugin).filter((n) => n.interval >= 0);
    const folders = new Set(
      notes.map((n) => n.filepath.split("/")[0]).filter((seg) => seg.endsWith(".md") === false), // exclude root-level files
    );
    return [...folders].sort();
  }

  async onOpen() {
    const allNotes = getNotesFromVault(this.plugin).filter((n) => n.interval >= 0);
    this.sessionSize = allNotes.filter((n) => noteIsDue(n)).length;
    await this.render();
    this.setupVaultListener();
  }

  protected getStatusText(): string {
    let allNotes = getNotesFromVault(this.plugin).filter((n) => n.interval >= 0);
    if (this.activeSources.length > 0) {
      allNotes = allNotes.filter((n) => this.activeSources.some((src) => n.filepath.startsWith(src + "/")));
    }
    const remainingDue = allNotes.filter((n) => noteIsDue(n) && !this.reviewedInSession.has(n.filepath)).length;
    return `${remainingDue} note${remainingDue !== 1 ? "s" : ""} due`;
  }

  private async render() {
    this.reviewStartTime = Date.now();
    this.isEditing = false;
    const { contentEl } = this;
    contentEl.empty();
    await this.renderNote(contentEl);
  }

  protected renderExtraHeaderButtons(headerRight: HTMLElement): void {
    // ── State badge ──────────────────────────────────────────────────────────
    const stateOptions = this.plugin.settings.noteStateValues ?? ["🌱", "🌿", "🌲"];

    let currentState = this.app.metadataCache.getFileCache(
      this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile,
    )?.frontmatter?.state as string | undefined;

    let stateDropdown: HTMLElement | null = null;

    const badge = headerRight.createEl("span", {
      text: currentState || "no state",
      cls: "spaced-state-badge",
    });
    badge.style.position = "relative";
    badge.style.cursor = "pointer";

    badge.addEventListener("click", () => {
      if (stateDropdown) {
        stateDropdown.remove();
        stateDropdown = null;
        return;
      }
      stateDropdown = badge.createDiv({ cls: "spaced-state-dropdown" });
      for (const state of stateOptions) {
        const opt = stateDropdown.createDiv({ cls: "spaced-state-option" });
        opt.setText(state);
        if (state === currentState) opt.addClass("is-active");
        opt.addEventListener("click", async () => {
          await writeFrontmatterState(this.app, this.note.filepath, state);
          currentState = state;
          badge.setText(state);
          stateDropdown?.remove();
          stateDropdown = null;
        });
      }
    });

    // ── Make Actionable button ───────────────────────────────────────────────
    const mkaBtn = headerRight.createDiv({ cls: "spaced-hdr-btn" });
    setIcon(mkaBtn, "zap");
    mkaBtn.setAttribute("aria-label", "Make actionable");
    mkaBtn.addEventListener("click", () => {
      new MakeActionableModal(this.app, this.note.filepath, () => {}).open();
    });
  }

  // reaction button row
  protected renderButtons(contentEl: HTMLElement): void {
    const COLOR_VAR_MAP: Record<string, string> = {
      "spaced-seg-purple": "var(--color-purple)",
      "spaced-seg-blue": "var(--color-blue)",
      "spaced-seg-green": "var(--color-green)",
      "spaced-seg-yellow": "var(--color-yellow)",
      "spaced-seg-orange": "var(--color-orange)",
      "spaced-seg-red": "var(--color-red)",
    };

    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    const reactions = getActiveReactions(this.plugin.settings);
    reactions.forEach((r, i) => {
      const wrapper = btnRow.createDiv({ cls: "spaced-btn-wrapper" });
      const btn = this.addBtn(wrapper, { label: r.label, cls: r.id, cb: () => this.react(r.id) });
      if (i === 0) btn.setCta();
      const colorVar = COLOR_VAR_MAP[this.reactionColor(r.id)];
      if (colorVar) btn.buttonEl.style.setProperty("--reaction-color", colorVar);

      const days = nextInterval(this.note, r.id, reactions);
      wrapper.createEl("span", {
        text: formatInterval(days),
        cls: "spaced-btn-interval",
      });
    });
    const routeBtn = this.addBtn(btnRow, { label: "Route →", cls: "route", cb: () => this.routeNote() });
    routeBtn.setCta();
    this.addBtn(btnRow, { label: "Skip", cls: "skip", cb: () => this.react("skip") });
    this.addBtn(btnRow, { label: "Archive", cls: "archive", cb: () => this.archiveNote() });
    this.addBtn(btnRow, { icon: "trash-2", cls: "delete", cb: () => this.deleteNote() });

    // ── Source picker ────────────────────────────────────────────────────────
    let srcDropdown: HTMLElement | null = null;
    const srcBtn = this.addBtn(btnRow, {
      label: "Source",
      cls: "source",
      tooltip: `Source: ${this.activeSources.length ? this.activeSources.join(", ") : "All"}`,
      cb: () => {
        if (srcDropdown) {
          srcDropdown.remove();
          srcDropdown = null;
          return;
        }
        const folders = this.getSourceFolderList();
        if (folders.length === 0) return;

        srcDropdown = btnRow.createDiv({ cls: "spaced-source-dropdown" });
        const isAll = this.activeSources.length === 0;

        // "All" row
        const allRow = srcDropdown.createDiv({ cls: "spaced-context-option" });
        const allCb = allRow.createEl("input");
        allCb.type = "checkbox";
        allCb.checked = isAll;
        allRow.createSpan({ text: "All" });
        allCb.addEventListener("change", () => {
          srcBtn.buttonEl.setAttribute(
            "aria-label",
            `Source: ${this.activeSources.length ? this.activeSources.join(", ") : "All"}`,
          );
          this.activeSources = [];
          this.refreshSessionSize();
          srcDropdown?.remove();
          srcDropdown = null;
          // re-open to reflect new state
          srcBtn.buttonEl.click();
        });

        // Per-folder rows
        for (const folder of folders) {
          const row = srcDropdown.createDiv({ cls: "spaced-context-option" });
          if (isAll) row.addClass("spaced-source-greyed");
          const cb = row.createEl("input");
          cb.type = "checkbox";
          cb.checked = isAll || this.activeSources.includes(folder);
          row.createSpan({ text: folder });

          cb.addEventListener("change", () => {
            srcBtn.buttonEl.setAttribute(
              "aria-label",
              `Source: ${this.activeSources.length ? this.activeSources.join(", ") : "All"}`,
            );
            if (this.activeSources.length === 0) {
              this.activeSources = [folder];
            } else if (cb.checked) {
              this.activeSources.push(folder);
            } else {
              this.activeSources = this.activeSources.filter((s) => s !== folder);
            }
            this.refreshSessionSize(); // ← updates due count only, no full re-render
            // re-open dropdown to reflect new checked/greyed states:
            srcDropdown?.remove();
            srcDropdown = null;
            srcBtn.buttonEl.click();
          });
        }

        const onOutside = (e: MouseEvent) => {
          if (!srcDropdown || !document.contains(srcDropdown)) {
            document.removeEventListener("mousedown", onOutside);
            return;
          }
          if (!srcDropdown.contains(e.target as Node) && !srcBtn.buttonEl.contains(e.target as Node)) {
            srcDropdown.remove();
            srcDropdown = null;
            document.removeEventListener("mousedown", onOutside);
          }
        };
        document.addEventListener("mousedown", onOutside);
      },
    });
  }

  private async react(reaction: string) {
    await this.saveTitle();
    await this.saveBodyEdits();
    this.progressLog.push(this.reactionColor(reaction));
    if (reaction === "skip") {
      this.reviewedInSession.add(this.note.filepath);
      await this.showNextNote();
      return;
    }
    this.reviewedInSession.add(this.note.filepath);
    this.plugin.data.reviewHistory = this.plugin.data.reviewHistory ?? [];
    this.plugin.data.reviewHistory.push({
      timestamp: new Date().toISOString().slice(0, 19),
      notePath: this.note.filepath,
      reaction,
    });

    const reactions = getActiveReactions(this.plugin.settings);
    const newInterval = nextInterval(this.note, reaction, reactions);
    const updatedNote: NoteRecord = {
      ...this.note,
      interval: newInterval,
      easeFactor: nextEaseFactor(this.note, reaction, reactions),
      lastReviewedOn: today(),
      reviewedCount: this.note.reviewedCount + 1,
      noteState: reaction,
    };
    this.note = updatedNote;
    await writeNoteRecord(this.plugin, this.note.filepath, updatedNote);
    await saveStore(this.plugin, this.plugin.data);
    await this.showNextNote();
  }

  private async archiveNote() {
    await this.saveTitle();
    await this.saveBodyEdits();
    this.progressLog.push(this.reactionColor("archive"));
    await writeNoteRecord(this.plugin, this.note.filepath, { interval: -1 });
    await this.showNextNote();
  }

  private async showNextNote() {
    let allNotes = getNotesFromVault(this.plugin).filter(
      (n) => n.interval >= 0 && !this.reviewedInSession.has(n.filepath),
    );
    if (this.activeSources.length > 0) {
      allNotes = allNotes.filter((n) => this.activeSources.some((src) => n.filepath.startsWith(src + "/")));
    }
    const note = pickNoteToReview(allNotes, this.plugin.settings);
    if (!note) {
      const { contentEl } = this;
      contentEl.empty();
      contentEl.createEl("h3", { text: "All caught up!" });
      contentEl.createEl("p", { text: "No more notes due. Close this modal to exit." });
      return;
    }
    this.note = note;
    await this.render();
  }

  private async deleteNote() {
    await this.saveTitle();
    this.progressLog.push(this.reactionColor("delete"));
    const file = this.app.vault.getAbstractFileByPath(this.note.filepath) as TFile;
    if (file) {
      await this.app.vault.delete(file);
    }
    await this.showNextNote();
  }

  private reactionColor(reaction: string): string {
    const systemColors: Record<string, string> = {
      route: "spaced-seg-blue",
      archive: "spaced-seg-yellow",
      delete: "spaced-seg-red",
      skip: "spaced-seg-skip",
    };
    if (systemColors[reaction]) return systemColors[reaction];

    const reactions = getActiveReactions(this.plugin.settings);
    const reactionDef = reactions.find((r) => r.id === reaction);
    if (reactionDef?.color) return reactionDef.color;

    const ramp = [
      "spaced-seg-purple",
      "spaced-seg-blue",
      "spaced-seg-green",
      "spaced-seg-yellow",
      "spaced-seg-orange",
      "spaced-seg-red",
    ];
    const idx = reactionDef ? reactions.indexOf(reactionDef) : -1;
    if (idx === -1) return "";
    const t = reactions.length === 1 ? 0.5 : idx / (reactions.length - 1);
    return ramp[Math.round(t * (ramp.length - 1))];
  }

  protected getProgressSegments(): string[] {
    const segments: string[] = [];
    for (let i = 0; i < this.sessionSize; i++) {
      segments.push(this.progressLog[i] ?? "");
    }
    return segments;
  }

  private refreshSessionSize(): void {
    let allNotes = getNotesFromVault(this.plugin).filter((n) => n.interval >= 0);
    if (this.activeSources.length > 0) {
      allNotes = allNotes.filter((n) => this.activeSources.some((src) => n.filepath.startsWith(src + "/")));
    }
    const remainingDue = allNotes.filter((n) => noteIsDue(n) && !this.reviewedInSession.has(n.filepath)).length;
    this.sessionSize = this.progressLog.length + remainingDue;
    this.refreshProgressBar(); // updates due count text + redraws bar
  }

  public resumeSession(session: SrsSession) {
    this.reviewedInSession = new Set(session.reviewedFilepaths);
    this.progressLog = [...session.progressLog];
    this.sessionSize = session.sessionSize;
  }

  protected onSessionClose(): void {
    if (this.sessionSize > 0) {
      if (this.reviewedInSession.size < this.sessionSize) {
        this.plugin.data.srsSession = {
          reviewedFilepaths: [...this.reviewedInSession],
          progressLog: [...this.progressLog],
          sessionSize: this.sessionSize,
        };
      } else {
        delete this.plugin.data.srsSession;
      }
      void saveStore(this.plugin, this.plugin.data);
    }
  }
}

function formatInterval(days: number): string {
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}
