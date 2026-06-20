import { App, TFile } from "obsidian";
import { NoteState } from "./types";

export async function writeFrontmatterReaction(app: App, filepath: string, state: NoteState): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filepath) as TFile | null;
  if (!file) return;
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm["note_mood"] = state;
  });
}
