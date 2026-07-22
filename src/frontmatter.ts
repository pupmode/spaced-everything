import { App, TFile } from "obsidian";
import { NoteRecord, SrsRecord, SpacedEverythingSettings } from "./types";
import { today } from "./utils";
import { saveStore } from "./store";
import type SpacedEverythingPlugin from "./main";

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
// ── Read ──────────────────────────────────────────────────────────────────────

export function readNoteRecord(plugin: SpacedEverythingPlugin, file: TFile): NoteRecord {
  const fm = plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  const stored = plugin.data.noteRecords?.[file.path];
  const { defaultEaseFactor, initialInterval } = plugin.settings;

  return {
    filepath: file.path,
    easeFactor: stored?.easeFactor ?? defaultEaseFactor,
    interval: stored?.interval ?? initialInterval,
    lastReviewedOn: stored?.lastReviewedOn ?? daysAgo(initialInterval),
    createdOn: stored?.createdOn ?? today(),
    reviewedCount: stored?.reviewedCount ?? 0,
    noteState: stored?.noteState ?? "normal",
    active: fm.active,
    decks: fm.decks,
  };
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function writeNoteRecord(
  plugin: SpacedEverythingPlugin,
  filepath: string,
  updates: Partial<SrsRecord>,
): Promise<void> {
  if (!plugin.data.noteRecords) plugin.data.noteRecords = {};
  const existing: SrsRecord = plugin.data.noteRecords[filepath] ?? {
    easeFactor: plugin.settings.defaultEaseFactor,
    interval: plugin.settings.initialInterval,
    lastReviewedOn: daysAgo(plugin.settings.initialInterval),
    createdOn: today(),
    reviewedCount: 0,
    noteState: "normal",
  };
  plugin.data.noteRecords[filepath] = { ...existing, ...updates };
  await saveStore(plugin, plugin.data);
}

export async function writeFrontmatterActionable(
  app: App,
  filepath: string,
  opts: { energy?: string | string[]; timeblock?: string | string[] },
): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.active = true;
    if (opts.energy !== undefined) fm.energy = opts.energy;
    if (opts.timeblock !== undefined) fm.timeblock = opts.timeblock;
  });
}

export async function writeFrontmatterState(app: App, filepath: string, state: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.state = state;
  });
}

// ── Vault scan ────────────────────────────────────────────────────────────────

export function getNotesFromVault(plugin: SpacedEverythingPlugin): NoteRecord[] {
  const files = plugin.app.vault.getMarkdownFiles().filter((f) => {
    if (plugin.settings.sourceScope === "folder") {
      return plugin.settings.sourceFolders.some((e) => f.path.startsWith(e.path + "/"));
    }
    return true;
  });
  return files.map((f) => readNoteRecord(plugin, f));
}

// ── One-time migration ────────────────────────────────────────────────────────

export async function migrateSeToStore(plugin: SpacedEverythingPlugin): Promise<void> {
  if (plugin.data.noteRecords !== undefined) return; // already migrated

  plugin.data.noteRecords = {};
  const { defaultEaseFactor, initialInterval } = plugin.settings;

  for (const file of plugin.app.vault.getMarkdownFiles()) {
    const fm = plugin.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const nested = fm.se ?? {};

    const hasSeData =
      nested.ease !== undefined ||
      nested.interval !== undefined ||
      fm.se_ease !== undefined ||
      fm.se_interval !== undefined ||
      fm.se_archived === true;

    if (hasSeData) {
      plugin.data.noteRecords[file.path] = {
        easeFactor: nested.ease ?? fm.se_ease ?? defaultEaseFactor,
        interval: fm.se_archived === true ? -1 : (nested.interval ?? fm.se_interval ?? initialInterval),
        lastReviewedOn: fm.se_last_reviewed ?? daysAgo(initialInterval),
        createdOn: nested.created ?? fm.se_created ?? today(),
        reviewedCount: nested.count ?? fm.se_count ?? 0,
        noteState: nested.state ?? fm.se_state ?? "normal",
      };
    }

    // Strip all se keys from frontmatter regardless
    const hasAnySeKey = hasSeData || fm.se_last_reviewed !== undefined || fm.se_next_review !== undefined;

    if (hasAnySeKey) {
      await plugin.app.fileManager.processFrontMatter(file, (fm) => {
        delete fm.se;
        delete fm.se_ease;
        delete fm.se_interval;
        delete fm.se_last_reviewed;
        delete fm.se_created;
        delete fm.se_count;
        delete fm.se_state;
        delete fm.se_next_review;
        delete fm.se_archived;
      });
    }
  }

  await saveStore(plugin, plugin.data);
}

// ── Frontmatter helpers ──────────────────────────────────────────

export async function writeFrontmatterActive(app: App, filepath: string, active: boolean): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.active = active;
  });
}

export async function writeFrontmatterRecurringComplete(app: App, filepath: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.last_completed = today();
    fm.skipped = 0;
  });
}

export async function writeFrontmatterDecks(app: App, filepath: string, decks: string[]): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.decks = decks;
  });
}

export function stripFrontmatter(raw: string): { frontmatter: string; body: string } {
  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end !== -1) return { frontmatter: raw.slice(0, end + 4), body: raw.slice(end + 4).trimStart() };
  }
  return { frontmatter: "", body: raw };
}

export async function writeFrontmatterSkip(app: App, filepath: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.skipped = (fm.skipped ?? 0) + 1;
  });
}