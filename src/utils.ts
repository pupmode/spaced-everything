import { App } from "obsidian";

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
