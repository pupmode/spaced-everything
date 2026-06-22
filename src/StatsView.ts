import { ItemView, WorkspaceLeaf } from "obsidian";
import type SpacedEverythingPlugin from "./main";
import { noteIsDue, daysBetween, today } from "./scheduler";

export const STATS_VIEW_TYPE = "spaced-everything-stats";

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export class StatsView extends ItemView {
  private calendarYear: number;
  private calendarMonth: number; // 0-indexed
  private heatmapYear: number;

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: SpacedEverythingPlugin,
  ) {
    super(leaf);
    const now = new Date();
    this.calendarYear = now.getFullYear();
    this.calendarMonth = now.getMonth();
    this.heatmapYear = now.getFullYear();
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const history: any[] = (this.plugin.data as any).reviewHistory ?? [];
    const todayStr = today();
    const activeNotes = Object.values(this.plugin.data.notes).filter((n) => n.interval >= 0);

    // ── Today ──────────────────────────────────────────────────────────────
    const todayEvents = history.filter((e) => e.timestamp.startsWith(todayStr));

    contentEl.createEl("h4", { text: "Today" });
    const todayEl = contentEl.createDiv({ cls: "spaced-stats-summary" });
    this.addStat(todayEl, "Reviews", String(todayEvents.length));

    // ── Summary ────────────────────────────────────────────────────────────
    const dueNotes = activeNotes.filter((n) => noteIsDue(n));
    contentEl.createEl("h4", { text: "Summary" });
    const summaryEl = contentEl.createDiv({ cls: "spaced-stats-summary" });
    this.addStat(summaryEl, "Active notes", String(activeNotes.length));
    this.addStat(summaryEl, "Due now", String(dueNotes.length));

    // ── Month calendar ─────────────────────────────────────────────────────
    const practicedCounts = new Map<string, number>();
    for (const e of history) {
      const d = e.timestamp.slice(0, 10);
      practicedCounts.set(d, (practicedCounts.get(d) ?? 0) + 1);
    }

    const upcomingDue = new Map<string, number>();
    for (const note of activeNotes) {
      const dueDate = new Date(note.lastReviewedOn);
      dueDate.setDate(dueDate.getDate() + note.interval);
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      if (dueDateStr > todayStr) {
        upcomingDue.set(dueDateStr, (upcomingDue.get(dueDateStr) ?? 0) + 1);
      }
    }

    contentEl.createEl("h4", { text: "Month" });
    const monthNav = contentEl.createDiv({ cls: "spaced-nav-row" });
    monthNav.createSpan({
      text: new Date(this.calendarYear, this.calendarMonth, 1).toLocaleString("default", {
        month: "long",
        year: "numeric",
      }),
    });
    const monthBtns = monthNav.createDiv();
    const prevMonthBtn = monthBtns.createEl("button", { text: "←" });
    const nextMonthBtn = monthBtns.createEl("button", { text: "→" });

    prevMonthBtn.addEventListener("click", () => {
      this.calendarMonth--;
      if (this.calendarMonth < 0) {
        this.calendarMonth = 11;
        this.calendarYear--;
      }
      this.render();
    });
    nextMonthBtn.addEventListener("click", () => {
      this.calendarMonth++;
      if (this.calendarMonth > 11) {
        this.calendarMonth = 0;
        this.calendarYear++;
      }
      this.render();
    });

    this.renderMonthCalendar(contentEl, this.calendarYear, this.calendarMonth, practicedCounts, todayStr, upcomingDue);

    // ── Forecast bar chart ─────────────────────────────────────────────────
    contentEl.createEl("h4", { text: "Upcoming review load" });
    const labels = ["Overdue", "Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5", "Wk 6", "Wk 7", "Wk 8"];
    const counts = new Array(9).fill(0);
    for (const note of activeNotes) {
      const daysUntilDue = note.interval - daysBetween(note.lastReviewedOn, todayStr);
      if (daysUntilDue <= 0) {
        counts[0]++;
      } else {
        const week = Math.ceil(daysUntilDue / 7);
        if (week <= 8) counts[week]++;
      }
    }
    const forecastEl = contentEl.createDiv({ cls: "spaced-bar-chart" });
    const maxForecast = Math.max(...counts, 1);
    for (let i = 0; i < labels.length; i++) {
      this.addBarRow(forecastEl, labels[i], counts[i], maxForecast, i === 0);
    }

    // ── Timeseries ─────────────────────────────────────────────────────────
    const log = this.plugin.data.reviewLoadLog;
    if (log.length > 0) {
      contentEl.createEl("h4", { text: "Due notes over time (last 30 syncs)" });
      const timeseriesEl = contentEl.createDiv({ cls: "spaced-bar-chart" });
      const recent = log.slice(-30);
      const maxDue = Math.max(...recent.map((e) => e.numDue), 1);
      for (const entry of recent) {
        this.addBarRow(timeseriesEl, entry.timestamp.slice(5, 10), entry.numDue, maxDue, false);
      }
    } else {
      contentEl.createEl("p", {
        text: "No sync history yet. Run 'Sync vault' to start logging.",
        cls: "spaced-muted",
      });
    }

    // ── Total ──────────────────────────────────────────────────────────────
    const uniqueNotes = new Set(history.map((e) => e.noteHash)).size;
    const avgInterval =
      activeNotes.length > 0 ? Math.round(activeNotes.reduce((sum, n) => sum + n.interval, 0) / activeNotes.length) : 0;
    contentEl.createEl("h4", { text: "Total" });
    const totalEl = contentEl.createDiv({ cls: "spaced-stats-summary" });
    this.addStat(totalEl, "Reviews", String(history.length));
    this.addStat(totalEl, "Unique notes reviewed", String(uniqueNotes));
    this.addStat(totalEl, "Avg interval", `${avgInterval} days`);

    // ── Year heatmap ───────────────────────────────────────────────────────
    contentEl.createEl("h4", { text: "Year" });
    const yearNav = contentEl.createDiv({ cls: "spaced-nav-row" });
    yearNav.createSpan({ text: String(this.heatmapYear) });
    const yearBtns = yearNav.createDiv();
    const prevYearBtn = yearBtns.createEl("button", { text: "←" });
    const nextYearBtn = yearBtns.createEl("button", { text: "→" });

    prevYearBtn.addEventListener("click", () => {
      this.heatmapYear--;
      this.render();
    });
    nextYearBtn.addEventListener("click", () => {
      this.heatmapYear++;
      this.render();
    });

    const yearEvents = history.filter((e) => e.timestamp.startsWith(String(this.heatmapYear)));
    const practicedInYear = new Map<string, number>();
    for (const e of yearEvents) {
      const d = e.timestamp.slice(0, 10);
      practicedInYear.set(d, (practicedInYear.get(d) ?? 0) + 1);
    }
    contentEl.createEl("p", {
      text: `${practicedInYear.size}/${isLeapYear(this.heatmapYear) ? 366 : 365} days practiced`,
      cls: "spaced-muted",
    });
    this.renderYearHeatmap(contentEl, this.heatmapYear, practicedInYear, todayStr);
  }

  private renderMonthCalendar(
    container: HTMLElement,
    year: number,
    month: number,
    practicedCounts: Map<string, number>,
    todayStr: string,
    upcomingDue: Map<string, number>,
  ): void {
    const grid = container.createDiv({ cls: "se-month-grid" });
    for (const d of ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]) {
      grid.createDiv({ text: d, cls: "se-month-header" });
    }

    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) {
      grid.createDiv({ cls: "se-month-cell se-month-empty" });
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dueCount = upcomingDue.get(dateStr) ?? 0;
      const isFuture = dateStr > todayStr;
      const reviewCount = practicedCounts.get(dateStr) ?? 0;
      const cls = [
        "se-month-cell",
        reviewCount > 0 ? "se-month-practiced" : "",
        isFuture && dueCount > 0 ? "se-month-upcoming" : "",
        dateStr === todayStr ? "se-month-today" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const cell = grid.createDiv({ cls });
      cell.createSpan({ text: String(d), cls: "se-month-day-num" });
      if (reviewCount > 0) {
        cell.setAttribute("title", `${reviewCount} review${reviewCount !== 1 ? "s" : ""}`);
      } else if (isFuture && dueCount > 0) {
        cell.setAttribute("title", `${dueCount} due`);
      }
    }
  }

  private renderYearHeatmap(
    container: HTMLElement,
    year: number,
    practicedDays: Map<string, number>,
    todayStr: string,
  ): void {
    const heatmap = container.createDiv({ cls: "se-year-heatmap" });

    const jan1 = new Date(year, 0, 1);
    const startOffset = (jan1.getDay() + 6) % 7;
    const start = new Date(jan1);
    start.setDate(start.getDate() - startOffset);

    const dec31 = new Date(year, 11, 31);
    const endOffset = (dec31.getDay() + 6) % 7;
    const end = new Date(dec31);
    end.setDate(end.getDate() + (6 - endOffset));

    const cur = new Date(start);
    while (cur <= end) {
      const dateStr = cur.toISOString().slice(0, 10);
      const inYear = cur.getFullYear() === year;
      const rc = practicedDays.get(dateStr) ?? 0;
      const cls = [
        "se-heatmap-cell",
        !inYear ? "se-heatmap-out" : rc > 0 ? "se-heatmap-practiced" : "",
        dateStr === todayStr ? "se-heatmap-today" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const cell = heatmap.createDiv({ cls });
      if (rc > 0) cell.setAttribute("title", `${rc} review${rc !== 1 ? "s" : ""}`);
      cur.setDate(cur.getDate() + 1);
    }
  }

  private addStat(container: HTMLElement, label: string, value: string): void {
    const row = container.createDiv({ cls: "spaced-stat-row" });
    row.createSpan({ text: label, cls: "spaced-stat-label" });
    row.createSpan({ text: value, cls: "spaced-stat-value" });
  }

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
