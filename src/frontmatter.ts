import { App, TFile } from "obsidian";
import { NoteRecord, SpacedEverythingSettings } from "./types";
import { today } from "./scheduler";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function readNoteRecord(app: App, file: TFile, defaultEaseFactor: number, initialInterval: number): NoteRecord {
  const fm = app.metadataCache.getFileCache(file)?.frontmatter ?? {};
  const nested = fm.se ?? {};
  return {
    filepath: file.path,
    easeFactor: nested.ease ?? fm.se_ease ?? defaultEaseFactor,
    interval: fm.se_archived === true ? -1 : (nested.interval ?? fm.se_interval ?? initialInterval),
    lastReviewedOn: fm.se_last_reviewed ?? daysAgo(initialInterval),
    createdOn: nested.created ?? fm.se_created ?? today(),
    reviewedCount: nested.count ?? fm.se_count ?? 0,
    noteState: nested.state ?? fm.se_state ?? "normal",
    active: fm.active,
    decks: fm.decks,
  };
}

export async function writeNoteRecord(app: App, filepath: string, updates: Partial<NoteRecord>): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    if (!fm.se || typeof fm.se !== "object") fm.se = {};

    if (updates.easeFactor !== undefined) {
      fm.se.ease = updates.easeFactor;
      delete fm.se_ease; // migrate old flat key
    }
    if (updates.interval !== undefined) {
      if (updates.interval < 0) {
        fm.se_archived = true;
        delete fm.se.interval;
        delete fm.se_interval;
      } else {
        fm.se.interval = updates.interval;
        delete fm.se_interval; // migrate old flat key
        delete fm.se_archived;
      }
    }
    if (updates.lastReviewedOn !== undefined) {
      fm.se_last_reviewed = updates.lastReviewedOn;
    }
    if (updates.createdOn !== undefined) {
      fm.se.created = updates.createdOn;
      delete fm.se_created; // migrate old flat key
    }
    if (updates.reviewedCount !== undefined) {
      fm.se.count = updates.reviewedCount;
      delete fm.se_count; // migrate old flat key
    }
    if (updates.noteState !== undefined) {
      fm.se.state = updates.noteState;
      delete fm.se_state; // migrate old flat key
    }

    // Always recompute se_next_review from final values
    const lastReviewed = updates.lastReviewedOn ?? fm.se_last_reviewed;
    const interval = updates.interval !== undefined ? updates.interval : (fm.se?.interval ?? fm.se_interval);
    if (lastReviewed && interval !== undefined && interval >= 0) {
      fm.se_next_review = addDays(lastReviewed, interval);
    }
  });
}

export function getNotesFromVault(app: App, settings: SpacedEverythingSettings): NoteRecord[] {
  const files = app.vault.getMarkdownFiles().filter((f) => {
    if (settings.sourceScope === "folder") {
      return settings.sourceFolders.some((e) => f.path.startsWith(e.path + "/"));
    }
    return true;
  });
  return files.map((f) => readNoteRecord(app, f, settings.defaultEaseFactor, settings.initialInterval));
}

export async function writeFrontmatterActive(app: App, filepath: string, active: boolean): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.active = active;
  });
}

export async function writeFrontmatterDecks(app: App, filepath: string, decks: string[]): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm.decks = decks;
  });
}

