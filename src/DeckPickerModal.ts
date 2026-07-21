import { App, Modal, setIcon } from "obsidian";
import { NoteRecord } from "./types";
import type SpacedEverythingPlugin from "./main";
import { saveStore } from "./store";
import { writeFrontmatterDecks } from "./frontmatter";
import { readNoteRecord } from "./frontmatter";
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
      const record: NoteRecord = readNoteRecord(this.plugin, file);

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
      const row = contentEl.createDiv({ cls: "spaced-deck-row" });

      const btn = row.createEl("button", {
        text: `${deckName === "default" ? "Default deck" : deckName} (${notes.length})`,
        cls: "mod-cta spaced-deck-pick-btn",
      });
      btn.addEventListener("click", () => {
        // Record last used
        this.plugin.data.deckLastUsed = { ...lastUsed, [deckName]: new Date().toISOString() };
        this.close();
        const modal = new ActiveModal(this.app, this.plugin, notes, deckName);
        // Resume saved session if available
        const saved = this.plugin.data.cramSessions?.[deckName];
        if (saved && (saved.remaining.length > 0 || saved.failed.length > 0)) {
          const allNotes = [...notes];
          const toRecord = (fp: string): NoteRecord | undefined => allNotes.find((n) => n.filepath === fp);
          const filterRecords = (fps: string[]) => fps.map(toRecord).filter((n): n is NoteRecord => n !== undefined);

          const remaining = filterRecords(saved.remaining);
          const failed = filterRecords(saved.failed);

          // Only resume if there's actually something left after filtering out renamed/deleted notes
          if (remaining.length > 0 || failed.length > 0) {
            const missingCount = saved.remaining.length - remaining.length + saved.failed.length - failed.length;

            modal.resumeSession({
              remaining,
              failed,
              progressLog: saved.progressLog,
              currentRoundSize: saved.currentRoundSize - missingCount,
            });
          }
        }
        modal.open();
      });

      if (deckName !== "default") {
        const renameBtn = row.createDiv({ cls: "spaced-hdr-btn" });
        setIcon(renameBtn, "pencil");
        renameBtn.setAttribute("aria-label", "Rename deck");
        renameBtn.addEventListener("click", (e) => {
          e.stopPropagation();

          // Swap button for an input
          const input = document.createElement("input");
          input.className = "spaced-deck-rename-input";
          input.value = deckName;
          btn.replaceWith(input);
          renameBtn.remove();
          input.focus();
          input.select();

          let submitted = false;

          const cancel = () => {
            input.replaceWith(btn);
            row.appendChild(renameBtn);
          };

          const confirm = async () => {
            if (submitted) return;
            submitted = true;
            const newName = input.value.trim();
            if (!newName || newName === deckName) {
              cancel();
              return;
            }
            await this.renameDeck(deckName, newName);
          };

          input.addEventListener("keydown", async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await confirm();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          });

          input.addEventListener("blur", () => {
            void confirm();
          });
        });
      }
    }
  }

  private async renameDeck(oldName: string, newName: string): Promise<void> {
    // 1. Update frontmatter first (before folder rename changes file paths)
    for (const file of this.app.vault.getMarkdownFiles()) {
      const decks = this.app.metadataCache.getFileCache(file)?.frontmatter?.decks;
      if (!Array.isArray(decks) || !decks.includes(oldName)) continue;
      await writeFrontmatterDecks(
        this.app,
        file.path,
        decks.map((d: string) => (d === oldName ? newName : d)),
      );
    }

    // 2. Optionally rename matching folder
    if (this.plugin.settings.renameFolderWithDeck) {
      const matchingFolders = this.app.vault.getAllFolders().filter((f) => f.name === oldName);
      if (matchingFolders.length === 1) {
        const folder = matchingFolders[0];
        const parentPath = folder.parent?.path;
        const newFolderPath = parentPath && parentPath !== "/" ? `${parentPath}/${newName}` : newName;
        await this.app.vault.rename(folder, newFolderPath);
      } else if (matchingFolders.length > 1) {
        new Notice(`Deck renamed, but folder was not renamed: multiple folders named "${oldName}" exist.`);
      }
    }

    // 3. Migrate plugin data keys
    const lastUsed = this.plugin.data.deckLastUsed;
    if (lastUsed?.[oldName] !== undefined) {
      lastUsed[newName] = lastUsed[oldName];
      delete lastUsed[oldName];
    }

    const sessions = this.plugin.data.cramSessions;
    if (sessions?.[oldName] !== undefined) {
      sessions[newName] = sessions[oldName];
      delete sessions[oldName];
    }

    await saveStore(this.plugin, this.plugin.data);
    this.onOpen();
  }

  onClose() {
    this.contentEl.empty();
  }
}
