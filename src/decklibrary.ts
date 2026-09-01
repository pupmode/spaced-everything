import { App, Modal } from "obsidian";
import { getAllDecks, getDeckNoteCounts } from "./savedata";
import { DeckEditorModal } from "./deckeditor";
import { createSearchInput, fuzzyFilterDecks } from "./pickermodal";

/**
 * Top-level browse screen for decks: search, tap a deck to edit it, or add
 * a brand new one. This is the entry point for building up decks without
 * hand-editing frontmatter note by note.
 */
export class DeckLibraryModal extends Modal {
	private filterQuery: string = "";
	private listContainer!: HTMLElement;
	private onClosed?: () => void;

	constructor(app: App, onClosed?: () => void) {
		super(app);
		this.onClosed = onClosed;
	}

	onOpen() {
		this.setTitle("Deck library");
		this.contentEl.addClass("cram-picker-modal");

		createSearchInput(this.contentEl, "Search decks...", (query) => {
			this.filterQuery = query;
			this.renderList();
		});

		this.listContainer = this.contentEl.createDiv();
		this.renderList();

		const newBtn = this.contentEl.createEl("button", {
			text: "+ New deck",
			cls: "mod-cta cram-btn-block",
		});
		newBtn.onclick = () => {
			new DeckEditorModal(this.app, null, this.sourcePath(), () => {
				this.renderList();
			}).open();
		};
	}

	onClose() {
		this.contentEl.empty();
		this.onClosed?.();
	}

	private sourcePath(): string {
		return this.app.workspace.getActiveFile()?.path ?? "";
	}

	private renderList() {
		this.listContainer.empty();

		const counts = getDeckNoteCounts(this.app);
		const allDecks = getAllDecks(this.app);
		const visibleDecks = fuzzyFilterDecks(allDecks, this.filterQuery);

		if (allDecks.length === 0) {
			this.listContainer.createDiv({ cls: "cram-empty-state" }).setText(
				'No decks yet. Tap "+ New deck" below to create your first one.',
			);
			return;
		}

		if (visibleDecks.length === 0) {
			this.listContainer.createDiv({ cls: "cram-empty-state" }).setText(
				`No decks match "${this.filterQuery}".`,
			);
			return;
		}

		visibleDecks.forEach((deckName) => {
			const row = this.listContainer.createDiv({ cls: "cram-deck-row" });
			row.createSpan({ text: deckName, cls: "cram-deck-name" });
			row.createSpan({
				text: String(counts[deckName] ?? 0),
				cls: "cram-deck-count",
			});
			row.onclick = () => {
				new DeckEditorModal(
					this.app,
					deckName,
					this.sourcePath(),
					() => this.renderList(),
				).open();
			};
		});
	}
}
