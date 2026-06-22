import { App, TFile } from "obsidian";
import { NoteState } from "./types";

export async function writeFrontmatterReaction(app: App, filepath: string, state: NoteState): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm["note_mood"] = state;
  });
}

export async function writeFrontmatterActive(app: App, filepath: string, active: boolean): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm["active"] = active;
  });
}

export async function writeFrontmatterDecks(app: App, filepath: string, decks: string[]): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    if (decks.length === 0) {
      delete fm["decks"];
    } else {
      fm["decks"] = decks;
    }
  });
}

