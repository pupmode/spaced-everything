import { App, TFile } from "obsidian";
import { NoteRecord } from "./types";
import type SpacedEverythingPlugin from "./main";
import { saveStore } from "./store";
import { BaseNoteModal } from "./BaseNoteModal";
import { shuffleArray, getActiveNotes } from "./utils";

export class ActiveModal extends BaseNoteModal {
  private remaining: NoteRecord[];
  private passed: NoteRecord[] = [];
  private failed: NoteRecord[] = [];
  private progressLog: ("pass" | "fail")[] = [];
  private currentRoundSize: number;
  protected note!: NoteRecord;
  private allNotes: NoteRecord[] = [];

  constructor(
    app: App,
    protected plugin: SpacedEverythingPlugin,
    notes: NoteRecord[],
    deckName: string = "default",
  ) {
    super(app);
    this.deckName = deckName;
    this.allNotes = [...notes];
    this.remaining = [...notes];
    this.currentRoundSize = notes.length;
  }
  protected showRestartButton = true;

  protected onRestartClick(): void {
    void this.restartSession(this.allNotes);
  }

  protected getStatusText(): string {
    return `${this.remaining.length} remaining · ${this.failed.length} to retry`;
  }

  public resumeSession(state: {
    remaining: NoteRecord[];
    failed: NoteRecord[];
    progressLog: ("pass" | "fail")[];
    currentRoundSize: number;
  }) {
    this.remaining = state.remaining;
    this.failed = state.failed;
    this.progressLog = state.progressLog;
    this.currentRoundSize = state.currentRoundSize;
  }

  async onOpen() {
    if (this.remaining.length === 0) {
      this.showSummary(this.failed.length === 0);
      return;
    }
    await this.render();
    this.setupVaultListener();
  }

  private async render() {
    if (this.remaining.length === 0) {
      this.showSummary(this.failed.length === 0);
      return;
    }
    const { contentEl } = this;
    contentEl.empty();
    this.note = this.remaining[0];
    await this.renderNote(contentEl);
  }
  protected renderButtons(container: HTMLElement): void {
    const btnRow = container.createDiv({ cls: "spaced-btn-row" });
    this.addBtn(btnRow, { label: "Not now/Pass", cls: "pass", cb: () => this.respond("pass") });
    this.addBtn(btnRow, { label: "Retry", cls: "fail", cb: () => this.respond("fail") });
    this.addBtn(btnRow, {
      icon: "shuffle",
      cls: "icon",
      tooltip: "Shuffle remaining cards",
      cb: async () => {
        this.remaining = shuffleArray(this.remaining);
        await this.render();
      },
    });
    this.addBtn(btnRow, { icon: "route", cls: "route", tooltip: "Route →", cb: () => this.routeNote() });
  }

  protected getProgressSegments(): string[] {
    const segments: string[] = [];
    for (let i = 0; i < this.currentRoundSize; i++) {
      const result = this.progressLog[i];
      if (result === "pass") segments.push("spaced-progress-pass");
      else if (result === "fail") segments.push("spaced-progress-fail");
      else segments.push("");
    }
    return segments;
  }

  private async respond(result: "pass" | "fail") {
    await this.saveTitle();
    await this.saveBodyEdits();
    const note = this.remaining.shift()!;
    this.progressLog.push(result);

    if (result === "pass") {
      this.passed.push(note);
    } else {
      this.failed.push(note);
    }

    if (this.remaining.length === 0) {
      if (this.failed.length === 0) {
        this.showSummary(true);
      } else {
        this.showSummary(false);
      }
      return;
    }
    await this.render();
  }

  private showSummary(isDone: boolean) {
    this.cleanupEditors();
    const { contentEl } = this;
    contentEl.empty();
    if (isDone) {
      void this.clearSession();
      contentEl.createEl("h3", { text: "All done!" });
    } else {
      contentEl.createEl("h3", { text: "Round complete!" });
      contentEl.createEl("p", { text: `Passed: ${this.passed.length}` });
      contentEl.createEl("p", { text: `Failed: ${this.failed.length}` });
    }
    const btnRow = contentEl.createDiv({ cls: "spaced-btn-row" });
    this.addBtn(btnRow, {
      label: isDone ? "Restart session" : "Next round",
      cls: "summary-action",
      modifier: "cta",
      cb: () => this.restartSession(isDone ? this.allNotes : this.failed),
    });
    this.addBtn(btnRow, { label: "Close", cls: "summary-close", cb: () => this.close() });
  }

  private async clearSession() {
    if (this.plugin.data.cramSessions) {
      delete this.plugin.data.cramSessions[this.deckName];
    }
    await saveStore(this.plugin, this.plugin.data);
  }

  private async saveSession() {
    this.plugin.data.cramSessions = this.plugin.data.cramSessions ?? {};
    this.plugin.data.cramSessions[this.deckName] = {
      remaining: this.remaining.map((n) => n.filepath),
      failed: this.failed.map((n) => n.filepath),
      progressLog: [...this.progressLog],
      currentRoundSize: this.currentRoundSize,
    };
    await saveStore(this.plugin, this.plugin.data);
  }

  private async restartSession(sourceNotes: NoteRecord[]) {
    this.remaining = getActiveNotes(this.app, sourceNotes);
    this.passed = [];
    this.failed = [];
    this.progressLog = [];
    this.currentRoundSize = this.remaining.length;
    await this.render();
  }

  protected onSessionClose(): void {
    if (this.remaining.length > 0 || this.failed.length > 0) {
      void this.saveSession();
    }
  }
}
