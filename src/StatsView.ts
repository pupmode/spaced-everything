// src/StatsView.ts
import { ItemView, WorkspaceLeaf } from "obsidian";
import type SpacedEverythingPlugin from "./main";
import { noteIsDue, daysBetween, today } from "./scheduler";

export const STATS_VIEW_TYPE = "spaced-everything-stats";

export class StatsView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private plugin: SpacedEverythingPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return STATS_VIEW_TYPE;
  }
  getDisplayText(): string {
    return "Spaced Everything — Stats";
  }
  getIcon(): string {
    return "bar-chart-2";
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async render(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("spaced-stats-view");

    const data = this.plugin.data;
    const activeNotes = Object.values(data.notes).filter((n) => n.interval >= 0);
    const dueNotes = activeNotes.filter((n) => noteIsDue(n));
    const avgInterval =
      activeNotes.length > 0 ? Math.round(activeNotes.reduce((sum, n) => sum + n.interval, 0) / activeNotes.length) : 0;

    // ── Summary ──────────────────────────────────────────────────────────────
    contentEl.createEl("h4", { text: "Summary" });
    const summaryEl = contentEl.createDiv({ cls: "spaced-stats-summary" });
    this.addStat(summaryEl, "Active notes", String(activeNotes.length));
    this.addStat(summaryEl, "Due now", String(dueNotes.length));
    this.addStat(summaryEl, "Avg interval", `${avgInterval} days`);

    // ── Forecast chart (port of plot_histogram_review_load.py) ───────────────
    // Shows how many notes will become due in each upcoming week.
    contentEl.createEl("h4", { text: "Upcoming review load" });

    const todayStr = today();
    // Buckets: overdue, week 1–8
    const labels = ["Overdue", "Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"];
    const counts = new Array(9).fill(0);

    for (const note of activeNotes) {
      const daysUntilDue = note.interval - daysBetween(note.lastReviewedOn, todayStr);
      if (daysUntilDue <= 0) {
        counts[0]++; // overdue
      } else {
        const week = Math.ceil(daysUntilDue / 7); // 1-indexed week
        if (week <= 8) counts[week]++;
        // notes due beyond 8 weeks are not shown
      }
    }

    const forecastEl = contentEl.createDiv({ cls: "spaced-bar-chart" });
    const maxForecast = Math.max(...counts, 1);
    for (let i = 0; i < labels.length; i++) {
      this.addBarRow(forecastEl, labels[i], counts[i], maxForecast, i === 0);
    }

    // ── Timeseries chart (port of plot_timeseries_review_load.py) ────────────
    // Shows numDue over the last 30 sync snapshots.
    const log = data.reviewLoadLog;
    if (log.length > 0) {
      contentEl.createEl("h4", { text: "Due notes over time (last 30 syncs)" });
      const timeseriesEl = contentEl.createDiv({ cls: "spaced-bar-chart" });
      const recent = log.slice(-30);
      const maxDue = Math.max(...recent.map((e) => e.numDue), 1);
      for (const entry of recent) {
        const label = entry.timestamp.slice(5, 10); // "MM-DD"
        this.addBarRow(timeseriesEl, label, entry.numDue, maxDue, false);
      }
    } else {
      contentEl.createEl("p", {
        text: "No sync history yet. Run 'Sync vault' to start logging.",
        cls: "spaced-muted",
      });
    }
  }

  private addStat(container: HTMLElement, label: string, value: string): void {
    const row = container.createDiv({ cls: "spaced-stat-row" });
    row.createSpan({ text: label, cls: "spaced-stat-label" });
    row.createSpan({ text: value, cls: "spaced-stat-value" });
  }

  /**
   * @param accent  if true, uses --color-red for the bar fill (highlights overdue)
   */
  private addBarRow(container: HTMLElement, label: string, value: number, max: number, accent: boolean): void {
    const row = container.createDiv({ cls: "spaced-bar-row" });
    row.createSpan({ text: label, cls: "spaced-bar-label" });
    const track = row.createDiv({ cls: "spaced-bar-track" });
    const fill = track.createDiv({ cls: accent ? "spaced-bar-fill spaced-bar-fill-accent" : "spaced-bar-fill" });
    fill.style.width = `${Math.round((value / max) * 100)}%`;
    row.createSpan({ text: String(value), cls: "spaced-bar-value" });
  }

  onClose(): Promise<void> {
    return Promise.resolve();
  }
}
