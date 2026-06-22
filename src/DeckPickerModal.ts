import { App, Modal } from "obsidian";
import { NoteRecord } from "./types";
import type SpacedEverythingPlugin from "./main";
import { ActiveModal } from "./ActiveModal";

export class DeckPickerModal extends Modal {
  constructor(
    app: App,
    private plugin: SpacedEverythingPlugin,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Choose a deck" });

    // Collect deck → notes mapping from metadataCache
    const deckMap = new Map<string, NoteRecord[]>();

    for (const file of this.app.vault.getMarkdownFiles()) {
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (!fm?.active) continue;

      const decks: string[] = Array.isArray(fm.decks) && fm.decks.length > 0 ? fm.decks : ["default"];
      const stored = Object.values(this.plugin.data.notes).find((n) => n.filepath === file.path);
      const record: NoteRecord = stored
        ? { ...stored, active: true }
        : {
            sha1sum: file.path,
            filepath: file.path,
            easeFactor: 300,
            interval: 0,
            lastReviewedOn: "",
            createdOn: "",
            reviewedCount: 0,
            noteState: "normal",
            active: true,
          };

      for (const deck of decks) {
        if (!deckMap.has(deck)) deckMap.set(deck, []);
        deckMap.get(deck)!.push(record);
      }
    }

    if (deckMap.size === 0) {
      contentEl.createEl("p", { text: "No active notes found." });
      return;
    }

    // Sort: most recently used first; "default" always listed
    const lastUsed = this.plugin.data.deckLastUsed ?? {};
    const sorted = [...deckMap.keys()].sort((a, b) => {
      const ta = lastUsed[a] ?? "";
      const tb = lastUsed[b] ?? "";
      return tb.localeCompare(ta); // descending
    });

    for (const deckName of sorted) {
      const notes = deckMap.get(deckName)!;
      const btn = contentEl.createEl("button", {
        text: `${deckName === "default" ? "Default deck" : deckName} (${notes.length})`,
        cls: "mod-cta",
      });
      btn.style.display = "block";
      btn.style.marginBottom = "8px";
      btn.addEventListener("click", () => {
        // Record last used
        this.plugin.data.deckLastUsed = { ...lastUsed, [deckName]: new Date().toISOString() };
        this.close();
        const modal = new ActiveModal(this.app, this.plugin, notes, deckName);
        // Resume saved session if available
        const saved = this.plugin.data.cramSessions?.[deckName];
        if (saved) {
          const allNotes = [...notes]; // full deck for filepath lookup
          const toRecord = (fp: string) => allNotes.find((n) => n.filepath === fp) ?? notes[0];
          modal.resumeSession({
            remaining: saved.remaining.map(toRecord),
            passed: saved.passed.map(toRecord),
            failed: saved.failed.map(toRecord),
            progressLog: saved.progressLog,
            currentRoundSize: saved.currentRoundSize,
          });
        }
        modal.open();
      });
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
