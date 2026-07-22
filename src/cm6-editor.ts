import { App, TFile } from "obsidian";
import { stripFrontmatter } from "./frontmatter";
export async function createCM6Editor(
  container: HTMLElement,
  file: TFile,
  app: App,
): Promise<{ leaf: any; editMode: any }> {
  const leaf = app.workspace.getLeaf("tab");
  await leaf.openFile(file, { state: { mode: "source" }, active: false });

  const editMode = (leaf.view as any).editMode;
  container.appendChild(editMode.cm.dom);
  editMode.cm.requestMeasure(); // force layout recalc in new container

  return { leaf, editMode };
}

export function destroyCM6Editor(leaf: any): void {
  leaf.detach();
}

// Replaces extractMarkdown(tiptapEditor)
export function getCM6Content(editMode: any): string {
  const full = editMode.cm.state.doc.toString();
  const { body } = stripFrontmatter(full);
  return body;
}
