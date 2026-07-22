import { App, TFile } from "obsidian";
import { NoteRecord, SpacedEverythingSettings, DayName, ActionNote, EnergyColor } from "./types";

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getAllDeckNames(app: App): string[] {
  const deckSet = new Set<string>();
  for (const file of app.vault.getMarkdownFiles()) {
    const decks = app.metadataCache.getFileCache(file)?.frontmatter?.decks;
    if (Array.isArray(decks))
      decks.forEach((d: string) => {
        if (d) deckSet.add(d);
      });
    else if (typeof decks === "string" && decks) deckSet.add(decks);
  }
  return Array.from(deckSet).sort();
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getActiveNotes(app: App, notes: NoteRecord[]): NoteRecord[] {
  return notes.filter((n) => {
    const f = app.vault.getAbstractFileByPath(n.filepath) as TFile | null;
    return f ? app.metadataCache.getFileCache(f)?.frontmatter?.active === true : false;
  });
}

const DAY_NAMES: DayName[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getCurrentDayName(): DayName {
  return DAY_NAMES[new Date().getDay()];
}

export function isWeekend(settings: SpacedEverythingSettings): boolean {
  return settings.weekendDays.includes(getCurrentDayName());
}

export function getCurrentTimeblock(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function filterByEnergyLevel(notes: ActionNote[], level: "high" | "low"): ActionNote[] {
  const highColors: EnergyColor[] = ["🔥", "🌿"];
  const lowColors: EnergyColor[] = ["🪔", "🌊"];
  const allowed = level === "high" ? [...highColors, ...lowColors] : lowColors;
  return notes.filter((n) => {
    if (!n.energy) return true;
    const energies = Array.isArray(n.energy) ? n.energy : [n.energy];
    return energies.some((e) => allowed.includes(e));
  });
}

export function filterByTimeblock(notes: ActionNote[], timeblocks: string[]): ActionNote[] {
  if (timeblocks.length === 0) return notes; // empty = no filter, show all
  return notes.filter((n) => {
    if (!n.timeblock) return true;
    const blocks = Array.isArray(n.timeblock) ? n.timeblock : [n.timeblock];
    return blocks.some((b) => timeblocks.includes(b));
  });
}

export function filterByContext(notes: ActionNote[], contexts: string[]): ActionNote[] {
  if (contexts.length === 0) return notes;
  return notes.filter((n) => {
    if (!n.context) return true;
    const noteContexts = Array.isArray(n.context) ? n.context : [n.context];
    return noteContexts.some((c) => contexts.includes(c));
  });
}

export function getAllContextValues(app: App): string[] {
  const contextSet = new Set<string>();
  for (const file of app.vault.getMarkdownFiles()) {
    const fm = app.metadataCache.getFileCache(file)?.frontmatter;
    if (!fm?.active) continue;
    const ctx = fm?.context;
    if (Array.isArray(ctx))
      ctx.forEach((c: string) => {
        if (c) contextSet.add(c);
      });
    else if (typeof ctx === "string" && ctx) contextSet.add(ctx);
  }
  return Array.from(contextSet).sort();
}

const timescope_DAYS: Record<string, number> = {
  daily: 1,
  "every-other-day": 2,
  weekly: 7,
  "every-other-week": 14,
  monthly: 30,
  seasonal: 91,
  yearly: 365,
};
export function isDue(fm: Record<string, unknown>): boolean {
  const freq = fm.timescope as string | undefined;
  if (!freq) return false;
  const interval = timescope_DAYS[freq];
  if (!interval) return false;
  const last = fm.last_completed as string | undefined;
  if (!last) return true;
  const daysSince = Math.floor((new Date(today()).getTime() - new Date(last).getTime()) / 86400000);
  return daysSince >= interval;
}