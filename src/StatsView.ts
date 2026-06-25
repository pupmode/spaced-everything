import { ItemView, WorkspaceLeaf, ViewStateResult, setIcon, Menu } from "obsidian";
import type SpacedEverythingPlugin from "./main";
import { noteIsDue, today } from "./scheduler";
import { getNotesFromVault } from "./frontmatter";
import { ReviewEvent } from "./types";
import { scaleLinear, scaleTime, scaleBand, ScaleLinear } from "d3-scale";
import { line as d3Line, area as d3Area } from "d3-shape";
import { timeFormat } from "d3-time-format";
import { timeDay, timeMonth, timeYear } from "d3-time";
import { select } from "d3-selection";

export const STATS_VIEW_TYPE = "spaced-everything-stats";

// ── Constants & Types ──────────────────────────────────────────────────────
const CHART_PERIODS = ["1W", "2W", "1M", "6M", "1Y", "All"] as const;
type ChartPeriod = (typeof CHART_PERIODS)[number];
const PERIOD_DAYS: Record<ChartPeriod, number> = {
  "1W": 7,
  "2W": 14,
  "1M": 30,
  "6M": 180,
  "1Y": 365,
  All: Infinity,
};

const PERIOD_LABELS: Record<ChartPeriod, string> = {
  "1W": "Week",
  "2W": "14 days",
  "1M": "Month",
  "6M": "Half year",
  "1Y": "Year",
  All: "All time",
};

// ── Module-level chart utilities ───────────────────────────────────────────
function makeTimeFormat(period: ChartPeriod): (d: Date) => string {
  const dayFmt = timeFormat("%d");
  if (period === "1W" || period === "2W" || period === "1M") return (d) => String(parseInt(dayFmt(d)));
  if (period === "6M") return timeFormat("%b");
  if (period === "1Y") {
    const yearFmt = timeFormat("'%y");
    const monthFmt = timeFormat("%b");
    return (d) => (d.getMonth() === 0 ? yearFmt(d) : monthFmt(d));
  }
  return timeFormat("'%y"); // "All"
}

export class StatsView extends ItemView {
  // ── State ─────────────────────────────────────────────────────────────────
  private calendarYear: number;
  private calendarMonth: number; // 0-indexed
  private heatmapYear: number;
  private reviewChartPeriod: ChartPeriod = "1M";
  private dueChartPeriod: ChartPeriod = "1M";
  private forecastChartPeriod: ChartPeriod = "1M";
  private selectedChart: "month" | "year" | "forecast" | "reviews" | "due" = "month";
  private resizeObserver: ResizeObserver | null = null;
  private resizeDebounce: ReturnType<typeof setTimeout> | null = null;

  // ── Obsidian view API ─────────────────────────────────────────────────────
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

  getState(): Record<string, unknown> {
    return {
      selectedChart: this.selectedChart,
      calendarYear: this.calendarYear,
      calendarMonth: this.calendarMonth,
      heatmapYear: this.heatmapYear,
      reviewChartPeriod: this.reviewChartPeriod,
      dueChartPeriod: this.dueChartPeriod,
      forecastChartPeriod: this.forecastChartPeriod,
    };
  }

  async setState(state: Record<string, unknown>, result: ViewStateResult): Promise<void> {
    if (state.selectedChart !== undefined) this.selectedChart = state.selectedChart as typeof this.selectedChart;
    if (state.calendarYear !== undefined) this.calendarYear = state.calendarYear as number;
    if (state.calendarMonth !== undefined) this.calendarMonth = state.calendarMonth as number;
    if (state.heatmapYear !== undefined) this.heatmapYear = state.heatmapYear as number;
    if (state.reviewChartPeriod !== undefined)
      this.reviewChartPeriod = state.reviewChartPeriod as typeof this.reviewChartPeriod;
    if (state.dueChartPeriod !== undefined) this.dueChartPeriod = state.dueChartPeriod as typeof this.dueChartPeriod;
    if (state.forecastChartPeriod !== undefined)
      this.forecastChartPeriod = state.forecastChartPeriod as typeof this.forecastChartPeriod;
    await super.setState(state, result);
  }

  async onOpen(): Promise<void> {
    await this.render();
    // Second render after layout so SVG dimensions (clientWidth/clientHeight) are non-zero.
    requestAnimationFrame(() => {
      this.render().catch(console.error);
    });

    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeDebounce) clearTimeout(this.resizeDebounce);
      this.resizeDebounce = setTimeout(() => {
        this.render().catch(console.error);
      }, 100);
    });
    this.resizeObserver.observe(this.containerEl);
  }

  // ── Render & section dispatchers ──────────────────────────────────────────
  async render(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("spaced-stats-view");

    const history = this.plugin.data.reviewHistory;
    const todayStr = today();
    const activeNotes = getNotesFromVault(this.app, this.plugin.settings).filter((n) => n.interval >= 0);
    const dueNotes = activeNotes.filter((n) => noteIsDue(n));
    const todayEvents = history.filter((e) => e.timestamp.startsWith(todayStr));
    const avgInterval =
      activeNotes.length > 0 ? Math.round(activeNotes.reduce((sum, n) => sum + n.interval, 0) / activeNotes.length) : 0;

    const headerEl = contentEl.createDiv({ cls: "spaced-header-stats" });
    this.addStat(headerEl, "Today", String(todayEvents.length));
    this.addStat(headerEl, "Due", String(dueNotes.length));
    this.addStat(headerEl, "Active", String(activeNotes.length));
    this.addStat(headerEl, "Reviews", String(history.length));
    this.addStat(headerEl, "Avg interval", `${avgInterval}d`);

    const selectorRow = contentEl.createDiv({ cls: "spaced-chart-selector-row" });
    const chartOptions: { value: typeof this.selectedChart; label: string }[] = [
      { value: "month", label: "Month calendar" },
      { value: "year", label: "Year heatmap" },
      { value: "forecast", label: "Upcoming load" },
      { value: "reviews", label: "Daily reviews" },
      { value: "due", label: "Due notes" },
    ];
    const currentLabel = chartOptions.find((o) => o.value === this.selectedChart)?.label ?? this.selectedChart;

    const chartTriggerWrapper = selectorRow.createDiv({ cls: "spaced-period-wrapper" });
    const chartTriggerBtn = chartTriggerWrapper.createDiv({ cls: "se-graph-sel" });
    chartTriggerBtn.createSpan({ text: currentLabel });

    chartTriggerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = new Menu();
      for (const opt of chartOptions) {
        menu.addItem((item) => {
          item.setTitle(opt.label);
          item.setChecked(opt.value === this.selectedChart);
          item.onClick(() => {
            this.selectedChart = opt.value;
            this.render();
          });
        });
      }
      menu.showAtMouseEvent(e);
    });

    const chartArea = contentEl.createDiv({ cls: "spaced-chart-area" });

    switch (this.selectedChart) {
      case "month":
        this.renderMonthSection(chartArea, history, activeNotes, todayStr);
        break;
      case "year":
        this.renderYearSection(chartArea, history, todayStr);
        break;
      case "forecast":
        this.renderForecastSection(chartArea, activeNotes, todayStr);
        break;
      case "reviews":
        this.renderReviewsSection(chartArea, history);
        break;
      case "due":
        this.renderDueSection(chartArea);
        break;
    }
  }

  private renderMonthSection(
    chartArea: HTMLElement,
    history: ReviewEvent[],
    activeNotes: NoteRecord[],
    todayStr: string,
  ): void {
    const practicedCounts = this.buildPracticedCounts(history);
    const upcomingDue = new Map<string, number>();
    for (const note of activeNotes) {
      const dueDate = new Date(note.lastReviewedOn);
      dueDate.setDate(dueDate.getDate() + note.interval);
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      if (dueDateStr > todayStr) upcomingDue.set(dueDateStr, (upcomingDue.get(dueDateStr) ?? 0) + 1);
    }
    const todayYear = parseInt(todayStr.slice(0, 4));
    const todayMonth = parseInt(todayStr.slice(5, 7)) - 1; // 0-indexed
    const isThisMonth = this.calendarYear === todayYear && this.calendarMonth === todayMonth;
    const monthName = new Date(this.calendarYear, this.calendarMonth, 1).toLocaleString("default", { month: "long" });
    const label = isThisMonth ? "This month" : `${monthName}, ${this.calendarYear}`;
    this.createNavRow(
      chartArea,
      label,
      () => {
        this.calendarMonth--;
        if (this.calendarMonth < 0) {
          this.calendarMonth = 11;
          this.calendarYear--;
        }
        this.render();
      },
      () => {
        this.calendarMonth++;
        if (this.calendarMonth > 11) {
          this.calendarMonth = 0;
          this.calendarYear++;
        }
        this.render();
      },
    );
    this.renderMonthCalendar(chartArea, this.calendarYear, this.calendarMonth, practicedCounts, todayStr, upcomingDue);
  }

  private renderYearSection(chartArea: HTMLElement, history: ReviewEvent[], todayStr: string): void {
    const yearEvents = history.filter((e) => e.timestamp.startsWith(String(this.heatmapYear)));
    const practicedInYear = this.buildPracticedCounts(yearEvents);
    this.createNavRow(
      chartArea,
      String(this.heatmapYear),
      () => {
        this.heatmapYear--;
        this.render();
      },
      () => {
        this.heatmapYear++;
        this.render();
      },
    );
    this.renderYearHeatmap(chartArea, this.heatmapYear, practicedInYear, todayStr);
  }

  private renderForecastSection(chartArea: HTMLElement, activeNotes: NoteRecord[], todayStr: string): void {
    const forecastData = this.buildForecastData(activeNotes, todayStr);
    this.renderForecastChart(chartArea, forecastData, this.forecastChartPeriod, (p) => {
      this.forecastChartPeriod = p;
      this.render();
    });
  }

  private renderReviewsSection(chartArea: HTMLElement, history: ReviewEvent[]): void {
    const dailyData = this.buildDailyReviewData(history);
    if (dailyData.length === 0) {
      chartArea.createEl("p", { text: "No review history yet.", cls: "spaced-muted" });
    } else {
      this.renderBarTrendChart(chartArea, dailyData, this.reviewChartPeriod, (p) => {
        this.reviewChartPeriod = p;
        this.render();
      });
    }
  }

  private renderDueSection(chartArea: HTMLElement): void {
    const log = this.plugin.data.reviewLoadLog;
    if (log.length === 0) {
      chartArea.createEl("p", {
        text: "No sync history yet. Run 'Sync vault' to start logging.",
        cls: "spaced-muted",
      });
    } else {
      this.renderBarTrendChart(chartArea, this.buildDailyDueData(log), this.dueChartPeriod, (p) => {
        this.dueChartPeriod = p;
        this.render();
      });
    }
  }

  // ── Shared chart infrastructure ───────────────────────────────────────────
  // Used by multiple charts: scaffold, helpers, shared primitives

  private buildChartScaffold(
    container: HTMLElement,
    data: { date: string; value: number }[],
    selEl: HTMLElement,
  ): { svg: SVGElement; chartH: number; totalH: number; totalW: number; yScale: ScaleLinear<number, number> } {
    const labelH = 24;
    const selH = selEl.offsetHeight + 6;
    const chartH = Math.max((container.clientHeight || 200) - labelH - selH - 10, 100);
    const totalH = chartH + labelH;
    const yAxisW = 34;
    const totalW = Math.max((container.clientWidth || 300) - yAxisW - 8, 60);
    const dataMax = Math.max(...data.map((d) => d.value), 1);
    const topPad = 14; // pixels reserved above the tallest bar for labels
    const yScale = scaleLinear().domain([0, dataMax]).range([chartH, topPad]).nice(6);
    const yTicks = yScale.ticks(6);

    const wrapEl = container.createDiv({ cls: "spaced-chart-wrap" });

    // ── Y-axis SVG ────────────────────────────────────────────────────────────
    const yAxisSvg = select(wrapEl)
      .append("svg")
      .attr("width", yAxisW)
      .attr("height", totalH)
      .attr("class", "spaced-y-axis-svg");

    yAxisSvg
      .selectAll<SVGLineElement, number>("line.y-tick")
      .data(yTicks)
      .join("line")
      .attr("class", "y-tick")
      .attr("x1", yAxisW - 4)
      .attr("y1", (d) => Math.round(yScale(d)))
      .attr("x2", yAxisW)
      .attr("y2", (d) => Math.round(yScale(d)))
      .attr("stroke", "var(--background-modifier-border)")
      .attr("stroke-width", 1);

    yAxisSvg
      .selectAll<SVGTextElement, number>("text.y-label")
      .data(yTicks)
      .join("text")
      .attr("class", "y-label")
      .attr("x", yAxisW - 6)
      .attr("y", (d) => Math.round(yScale(d)) + 3)
      .attr("text-anchor", "end")
      .attr("font-size", 16)
      .attr("fill", "var(--text-muted)")
      .text((d) => String(d));

    yAxisSvg
      .append("line")
      .attr("x1", yAxisW)
      .attr("y1", 0)
      .attr("x2", yAxisW)
      .attr("y2", chartH)
      .attr("stroke", "var(--background-modifier-border)")
      .attr("stroke-width", 1);

    // ── Chart SVG ─────────────────────────────────────────────────────────────
    const chartSvg = select(wrapEl)
      .append("svg")
      .attr("width", totalW)
      .attr("height", totalH)
      .attr("class", "spaced-chart-svg");

    chartSvg
      .selectAll<SVGLineElement, number>("line.grid-h")
      .data(yTicks)
      .join("line")
      .attr("class", "grid-h")
      .attr("x1", 0)
      .attr("y1", (d) => Math.round(yScale(d)))
      .attr("x2", totalW)
      .attr("y2", (d) => Math.round(yScale(d)))
      .attr("stroke", "var(--background-modifier-border)")
      .attr("stroke-width", 1)
      .attr("opacity", 0.4);

    chartSvg
      .append("line")
      .attr("x1", 0)
      .attr("y1", chartH)
      .attr("x2", totalW)
      .attr("y2", chartH)
      .attr("stroke", "var(--background-modifier-border)")
      .attr("stroke-width", 1);

    return { svg: chartSvg.node()!, chartH, totalH, totalW, yScale };
  }

  private renderLineContent(
    svg: SVGElement,
    data: { date: string; value: number }[],
    period: ChartPeriod,
    chartH: number,
    totalH: number,
    totalW: number,
    yScale: ScaleLinear<number, number>,
  ): void {
    const dates = data.map((d) => new Date(d.date));
    const xScale = scaleTime()
      .domain([dates[0], dates[dates.length - 1]])
      .range([0, totalW]);

    const tickInterval =
      period === "1W"
        ? timeDay.every(1)
        : period === "2W"
          ? timeDay.every(2)
          : period === "1M"
            ? timeDay.every(10)
            : period === "6M"
              ? timeMonth.every(1)
              : period === "1Y"
                ? timeMonth.every(1)
                : timeYear.every(1);
    const xTicks = xScale.ticks(tickInterval!);
    const fmt = makeTimeFormat(period);

    const rawData = dates.map((date, i) => ({ date, value: data[i].value }));

    const areaGen = d3Area<{ date: Date; value: number }>()
      .x((d) => xScale(d.date))
      .y0(chartH)
      .y1((d) => yScale(d.value));

    const lineGen = d3Line<{ date: Date; value: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.value));

    const svgSel = select(svg);

    svgSel
      .selectAll<SVGLineElement, Date>("line.grid-v")
      .data(xTicks)
      .join("line")
      .attr("class", "grid-v")
      .attr("x1", (d) => Math.round(xScale(d)))
      .attr("y1", 0)
      .attr("x2", (d) => Math.round(xScale(d)))
      .attr("y2", chartH + 10)
      .attr("stroke", "var(--color-base-40)")
      .attr("stroke-width", 0.5);

    svgSel
      .append("path")
      .attr("d", areaGen(rawData) ?? "")
      .attr("fill", "var(--interactive-accent)")
      .attr("opacity", 0.15)
      .attr("stroke", "none");

    svgSel
      .append("path")
      .attr("d", lineGen(rawData) ?? "")
      .attr("fill", "none")
      .attr("stroke", "var(--interactive-accent)")
      .attr("stroke-width", 1.5)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round");

    svgSel
      .selectAll<SVGTextElement, Date>("text.x-label")
      .data(xTicks)
      .join("text")
      .attr("class", "x-label")
      .attr("x", (d) => Math.round(xScale(d)))
      .attr("y", totalH - 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("fill", "var(--text-muted)")
      .text((d) => fmt(d));
  }

  private renderBarContent(
    svg: SVGElement,
    data: { date: string; value: number }[],
    period: ChartPeriod,
    chartH: number,
    totalH: number,
    totalW: number,
    yScale: ScaleLinear<number, number>,
  ): void {
    const xScale = scaleBand<string>()
      .domain(data.map((d) => d.date))
      .range([0, totalW])
      .padding(0.35);
    const barW = xScale.bandwidth();
    const fmt = makeTimeFormat(period);

    const labelDates = data.filter((d, i) => {
      if (period === "1W") return true;
      if (period === "2W") return i % 2 === 0;
      if (period === "1M") {
        const day = parseInt(d.date.slice(8, 10));
        return day === 1 || day === 10 || day === 20;
      }
      return false;
    });

    const rolling = this.rollingAverage(data);
    const rawData = data.map((d, i) => ({ date: d.date, value: rolling[i] }));

    const lineGen = d3Line<{ date: string; value: number }>()
      .x((d) => (xScale(d.date) ?? 0) + barW / 2)
      .y((d) => yScale(d.value));

    const svgSel = select(svg);

    svgSel
      .selectAll<SVGLineElement, { date: string; value: number }>("line.grid-v")
      .data(labelDates)
      .join("line")
      .attr("class", "grid-v")
      .attr("x1", (d) => (xScale(d.date) ?? 0) + barW / 2)
      .attr("y1", 0)
      .attr("x2", (d) => (xScale(d.date) ?? 0) + barW / 2)
      .attr("y2", chartH + 10)
      .attr("stroke", "var(--color-base-40)")
      .attr("stroke-width", 0.5);

    svgSel
      .append("path")
      .attr("d", lineGen(rawData) ?? "")
      .attr("fill", "none")
      .attr("stroke", "var(--interactive-accent)")
      .attr("stroke-width", 3)
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .attr("opacity", 0.8);

    svgSel
      .selectAll<SVGRectElement, { date: string; value: number }>("rect.bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.date) ?? 0)
      .attr("y", (d) => yScale(d.value))
      .attr("width", barW)
      .attr("height", (d) => Math.max(Math.round(yScale(0) - yScale(d.value)), d.value > 0 ? 2 : 0))
      .attr("rx", 2)
      .attr("fill", "var(--color-green)")
      .attr("opacity", 1);

    // Value labels above bars — only for narrow-period views
    if (period === "1W" || period === "2W") {
      svgSel
        .selectAll<SVGTextElement, { date: string; value: number }>("text.bar-label")
        .data(data.filter((d) => d.value > 0))
        .join("text")
        .attr("class", "bar-label")
        .attr("x", (d) => (xScale(d.date) ?? 0) + barW / 2)
        .attr("y", (d) => Math.max(yScale(d.value) - 6, 10)) // clamp so it doesn't clip at top
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("font-weight", "bold")
        .attr("fill", "var(--color-green)")
        .text((d) => String(d.value));
    }

    svgSel
      .selectAll<SVGTextElement, { date: string; value: number }>("text.x-label")
      .data(labelDates)
      .join("text")
      .attr("class", "x-label")
      .attr("x", (d) => (xScale(d.date) ?? 0) + barW / 2)
      .attr("y", totalH - 2)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("fill", "var(--text-muted)")
      .text((d) => fmt(new Date(d.date)));
  }

  private createNavRow(container: HTMLElement, label: string, onPrev: () => void, onNext: () => void): void {
    const nav = container.createDiv({ cls: "spaced-nav-row" });
    nav.createSpan({ text: label });
    const btns = nav.createDiv({ cls: "spaced-nav-btns" }); // ← add class

    const prevBtn = btns.createEl("button", { cls: "spaced-nav-btn" });
    setIcon(prevBtn, "chevron-left");
    prevBtn.addEventListener("click", onPrev);

    const nextBtn = btns.createEl("button", { cls: "spaced-nav-btn" });
    setIcon(nextBtn, "chevron-right");
    nextBtn.addEventListener("click", onNext);
  }

  private addStat(container: HTMLElement, label: string, value: string): void {
    const row = container.createDiv({ cls: "spaced-stat-row" });
    row.createSpan({ text: label, cls: "spaced-stat-label" });
    row.createSpan({ text: value, cls: "spaced-stat-value" });
  }

  private rollingAverage(data: { value: number }[], window = 7): number[] {
    return data.map((_, i) => {
      const slice = data.slice(Math.max(0, i - (window - 1)), i + 1);
      return slice.reduce((s, d) => s + d.value, 0) / slice.length;
    });
  }

  // ── Data builders ─────────────────────────────────────────────────────────
  private buildDailyDueData(log: { timestamp: string; numDue: number }[]): { date: string; value: number }[] {
    const byDay = new Map<string, number>();
    for (const e of log) {
      const d = e.timestamp.slice(0, 10);
      // Overwrite: keep the last sync's numDue for each day
      byDay.set(d, e.numDue);
    }
    if (byDay.size === 0) return [];
    const todayStr = today();
    const start = [...byDay.keys()].sort()[0];
    const result: { date: string; value: number }[] = [];
    const cur = new Date(start);
    const end = new Date(todayStr);
    while (cur <= end) {
      const d = cur.toISOString().slice(0, 10);
      result.push({ date: d, value: byDay.get(d) ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }

  private buildPracticedCounts(events: { timestamp: string }[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const e of events) {
      const d = e.timestamp.slice(0, 10);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return counts;
  }

  private buildDailyReviewData(history: { timestamp: string }[]): { date: string; value: number }[] {
    return this.buildDailyData(history, () => 1);
  }

  private buildForecastData(
    activeNotes: { lastReviewedOn: string; interval: number }[],
    todayStr: string,
  ): { date: string; value: number }[] {
    const dueByDate = new Map<string, number>();
    for (const note of activeNotes) {
      const dueDate = new Date(note.lastReviewedOn);
      dueDate.setDate(dueDate.getDate() + note.interval);
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      const effectiveDate = dueDateStr < todayStr ? todayStr : dueDateStr;
      dueByDate.set(effectiveDate, (dueByDate.get(effectiveDate) ?? 0) + 1);
    }
    const result: { date: string; value: number }[] = [];
    const start = new Date(todayStr);
    for (let i = 0; i < 730; i++) {
      const cur = new Date(start);
      cur.setDate(cur.getDate() + i);
      const d = cur.toISOString().slice(0, 10);
      result.push({ date: d, value: dueByDate.get(d) ?? 0 });
    }
    return result;
  }

  private buildDailyData<T extends { timestamp: string }>(
    entries: T[],
    getValue: (entry: T) => number,
  ): { date: string; value: number }[] {
    const byDay = new Map<string, number>();
    for (const e of entries) {
      const d = e.timestamp.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + getValue(e));
    }
    if (byDay.size === 0) return [];
    const todayStr = today();
    const start = [...byDay.keys()].sort()[0];
    const result: { date: string; value: number }[] = [];
    const cur = new Date(start);
    const end = new Date(todayStr);
    while (cur <= end) {
      const d = cur.toISOString().slice(0, 10);
      result.push({ date: d, value: byDay.get(d) ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }
  // ── Chart: Line trend (Reviews & Due) ─────────────────────────────────────
  private renderBarTrendChart(
    container: HTMLElement,
    allData: { date: string; value: number }[],
    period: ChartPeriod,
    onPeriodChange: (p: ChartPeriod) => void,
  ): void {
    const selEl = this.createPeriodSelect(container, period, onPeriodChange);
    const days = PERIOD_DAYS[period];

    let data: { date: string; value: number }[];
    if (days === Infinity) {
      data = allData;
    } else {
      // Build a full window of `days` days ending today, filling gaps with 0
      const byDate = new Map(allData.map((d) => [d.date, d.value]));
      data = [];
      const end = new Date(today());
      const start = new Date(end);
      start.setDate(start.getDate() - days + 1);
      const cur = new Date(start);
      while (cur <= end) {
        const d = cur.toISOString().slice(0, 10);
        data.push({ date: d, value: byDate.get(d) ?? 0 });
        cur.setDate(cur.getDate() + 1);
      }
    }

    if (data.length < 2) {
      container.createEl("p", { text: "Not enough data for this period.", cls: "spaced-muted" });
      return;
    }

    const showBars = period === "1W" || period === "2W" || period === "1M";
    const { svg, chartH, totalH, totalW, yScale } = this.buildChartScaffold(container, data, selEl);

    if (showBars) {
      this.renderBarContent(svg, data, period, chartH, totalH, totalW, yScale);
    } else {
      this.renderLineContent(svg, data, period, chartH, totalH, totalW, yScale);
    }
  }
  // ── Chart: Forecast ───────────────────────────────────────────────────────
  private renderForecastChart(
    container: HTMLElement,
    allData: { date: string; value: number }[],
    period: ChartPeriod,
    onPeriodChange: (p: ChartPeriod) => void,
  ): void {
    const showBars = period === "1W" || period === "2W" || period === "1M";
    const selEl = this.createPeriodSelect(container, period, onPeriodChange);
    const days = PERIOD_DAYS[period];
    const data = days === Infinity ? allData : allData.slice(0, days);

    if (data.length < 1) {
      container.createEl("p", { text: "No active notes.", cls: "spaced-muted" });
      return;
    }

    const { svg, chartH, totalH, totalW, yScale } = this.buildChartScaffold(container, data, selEl);

    if (showBars) {
      this.renderBarContent(svg, data, period, chartH, totalH, totalW, yScale);
    } else {
      this.renderLineContent(svg, data, period, chartH, totalH, totalW, yScale);
    }
  }
  // ── Chart: Month Calendar ─────────────────────────────────────────────────
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
        cell.dataset.tooltip = `${reviewCount} review${reviewCount !== 1 ? "s" : ""}`;
      } else if (isFuture && dueCount > 0) {
        cell.dataset.tooltip = `${dueCount} due`;
      }
    }
  }

  private createPeriodSelect(
    container: HTMLElement,
    period: ChartPeriod,
    onPeriodChange: (p: ChartPeriod) => void,
  ): HTMLElement {
    const wrapper = container.createDiv({ cls: "spaced-period-wrapper" });
    const btn = wrapper.createDiv({ cls: "spaced-period-trigger" });
    const labelEl = btn.createSpan({ text: PERIOD_LABELS[period], cls: "spaced-deck-label" });

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = new Menu();
      for (const p of CHART_PERIODS) {
        menu.addItem((item) => {
          item.setTitle(PERIOD_LABELS[p]);
          item.setChecked(p === period);
          item.onClick(() => {
            labelEl.textContent = PERIOD_LABELS[p];
            onPeriodChange(p);
          });
        });
      }
      menu.showAtMouseEvent(e);
    });

    return wrapper;
  }
  // ── Chart: Year Heatmap ───────────────────────────────────────────────────
  private renderYearHeatmap(
    container: HTMLElement,
    year: number,
    practicedDays: Map<string, number>,
    todayStr: string,
  ): void {
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const wrapper = container.createDiv({ cls: "se-year-heatmap-v" });

    // Day-of-week header row
    const headerRow = wrapper.createDiv({ cls: "se-heatmap-week-row" });
    headerRow.createDiv({ cls: "se-heatmap-month-col" }); // empty spacer
    for (const h of ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]) {
      headerRow.createDiv({ text: h, cls: "se-heatmap-dow-header" });
    }

    // Build start/end (same logic as before)
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
      const weekRow = wrapper.createDiv({ cls: "se-heatmap-week-row" });

      // Month label: show if any day in this week is the 1st of a month in `year`
      let monthLabel = "";
      for (let d = 0; d < 7; d++) {
        const check = new Date(cur);
        check.setDate(check.getDate() + d);
        if (check.getDate() === 1 && check.getFullYear() === year) {
          monthLabel = MONTHS[check.getMonth()];
          break;
        }
      }
      weekRow.createDiv({ text: monthLabel, cls: "se-heatmap-month-col" });

      // 7 day cells
      for (let d = 0; d < 7; d++) {
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
        const cell = weekRow.createDiv({ cls });
        if (rc > 0) cell.setAttribute("title", `${rc} review${rc !== 1 ? "s" : ""}`);
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  onClose(): Promise<void> {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.resizeDebounce) {
      clearTimeout(this.resizeDebounce);
      this.resizeDebounce = null;
    }
    return Promise.resolve();
  }
}
