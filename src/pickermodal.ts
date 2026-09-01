import { App, Modal, setIcon, TFile, prepareFuzzySearch } from "obsidian";
import { getAllDecks, getDeckNoteCounts } from "./savedata";

/** Builds the icon + input search bar used by every deck list in the plugin. */
export function createSearchInput(
	containerEl: HTMLElement,
	placeholder: string,
	onInput: (query: string) => void,
): HTMLInputElement {
	const wrap = containerEl.createDiv({ cls: "cram-search-wrap" });
	setIcon(wrap.createSpan({ cls: "cram-search-icon" }), "search");
	const input = wrap.createEl("input", {
		type: "text",
		placeholder,
		cls: "cram-search-input",
	});
	input.addEventListener("input", () => onInput(input.value));
	return input;
}

/** Fuzzy-filters a list of deck names by a query, returning the full list when the query is empty. */
export function fuzzyFilterDecks(decks: string[], query: string): string[] {
	if (!query) return decks;
	const match = prepareFuzzySearch(query);
	return decks.filter((d) => match(d) !== null);
}

/**
 * Reusable deck checkbox list: search bar + "All" row + individual deck rows.
 * Used by SourceSelector (start screen + source picker's simple mode).
 */
export class DeckChecklist {
	private app: App;
	private containerEl: HTMLElement;
	private allDecks: string[] = [];
	private deckCounts: Record<string, number> = {};
	private selectedDecks: Set<string>;
	private allSelected: boolean = false;
	private previousSelection: Set<string> = new Set();
	private filterQuery: string = "";
	private deckListContainer!: HTMLElement;
	private emptyStateEl!: HTMLElement;
	private onChange?: (selected: string[]) => void;

	constructor(
		app: App,
		containerEl: HTMLElement,
		initialSelected: string[] = [],
		onChange?: (selected: string[]) => void,
	) {
		this.app = app;
		this.containerEl = containerEl;
		this.selectedDecks = new Set(initialSelected);
		this.onChange = onChange;
	}

	render() {
		this.allDecks = getAllDecks(this.app);
		this.deckCounts = getDeckNoteCounts(this.app);

		if (this.allDecks.length === 0) {
			this.containerEl.createDiv({ cls: "cram-empty-state" }).setText(
				"No decks yet. Add a \"deck\" property to a note's frontmatter, " +
					"or create a note with a deck from inside a session.",
			);
			return;
		}

		createSearchInput(this.containerEl, "Search decks...", (query) => {
			this.filterQuery = query;
			this.renderDeckList();
		});

		const allRow = this.containerEl.createEl("label", {
			cls: "cram-deck-row cram-deck-row-all",
		});
		const allCheckEl = allRow.createEl("input", {
			type: "checkbox",
		}) as HTMLInputElement;
		allRow.createSpan({ text: "All decks", cls: "cram-deck-name" });

		// "All" starts checked only if every currently-known deck is already selected.
		allCheckEl.checked =
			this.allDecks.length > 0 &&
			this.allDecks.every((d) => this.selectedDecks.has(d));
		this.allSelected = allCheckEl.checked;

		allCheckEl.addEventListener("change", () => {
			this.handleAllToggle(allCheckEl.checked);
		});

		this.deckListContainer = this.containerEl.createDiv({
			cls: "cram-deck-list",
		});
		this.emptyStateEl = this.containerEl.createDiv({
			cls: "cram-empty-state cram-search-empty",
		});
		this.renderDeckList();
	}

	getSelected(): string[] {
		return Array.from(this.selectedDecks);
	}

	private renderDeckList() {
		this.deckListContainer.empty();
		this.emptyStateEl.empty();

		const visibleDecks = fuzzyFilterDecks(this.allDecks, this.filterQuery);

		if (visibleDecks.length === 0) {
			this.emptyStateEl.setText(`No decks match "${this.filterQuery}".`);
			return;
		}

		visibleDecks.forEach((deckName) => {
			const row = this.deckListContainer.createEl("label", {
				cls: "cram-deck-row",
			});

			const checkEl = row.createEl("input", {
				type: "checkbox",
			}) as HTMLInputElement;
			row.createSpan({ text: deckName, cls: "cram-deck-name" });
			row.createSpan({
				text: String(this.deckCounts[deckName] ?? 0),
				cls: "cram-deck-count",
			});

			this.updateRowVisual(row, checkEl, deckName);

			checkEl.addEventListener("change", () => {
				if (checkEl.checked) {
					this.selectedDecks.add(deckName);
				} else {
					this.selectedDecks.delete(deckName);
				}
				this.updateRowVisual(row, checkEl, deckName);
				this.onChange?.(this.getSelected());
			});
		});
	}

	private updateRowVisual(
		row: HTMLElement,
		checkEl: HTMLInputElement,
		deckName: string,
	) {
		checkEl.checked = this.selectedDecks.has(deckName);
		checkEl.disabled = this.allSelected;
		row.toggleClass("is-disabled", this.allSelected);
	}

	private handleAllToggle(isAllChecked: boolean) {
		this.allSelected = isAllChecked;

		if (isAllChecked) {
			this.previousSelection = new Set(this.selectedDecks);
			this.allDecks.forEach((deckName) =>
				this.selectedDecks.add(deckName),
			);
		} else {
			this.selectedDecks = new Set(this.previousSelection);
		}

		this.renderDeckList();
		this.onChange?.(this.getSelected());
	}
}

/**
 * Pill-style deck editor: chips with a remove (x) button, plus a text input
 * (with suggestions from existing decks) to add more. Used by the deck
 * picker and the new note modal — anywhere a *single note's* decks are
 * being edited, as opposed to picking session sources from a list.
 */
export class DeckPillEditor {
	private app: App;
	private containerEl: HTMLElement;
	private decks: string[];
	private onChange?: (decks: string[]) => void;
	private pillsEl!: HTMLElement;
	private suggestionsEl!: HTMLElement;
	private inputEl!: HTMLInputElement;

	constructor(
		app: App,
		containerEl: HTMLElement,
		initialDecks: string[] = [],
		onChange?: (decks: string[]) => void,
	) {
		this.app = app;
		this.containerEl = containerEl;
		this.decks = [...initialDecks];
		this.onChange = onChange;
	}

	getDecks(): string[] {
		return [...this.decks];
	}

	render() {
		const wrapper = this.containerEl.createDiv({ cls: "cram-pill-editor" });

		this.pillsEl = wrapper.createDiv({ cls: "cram-pill-list" });
		this.renderPills();

		const addRow = wrapper.createDiv({ cls: "cram-pill-add-row" });
		this.inputEl = addRow.createEl("input", {
			type: "text",
			placeholder: "Add deck...",
			cls: "cram-pill-input",
		});

		const addBtn = addRow.createEl("button", { cls: "cram-pill-add-btn" });
		setIcon(addBtn, "plus");

		this.suggestionsEl = wrapper.createDiv({ cls: "cram-pill-suggestions" });

		const tryAdd = () => {
			const value = this.inputEl.value.trim();
			if (!value) return;
			this.addDeck(value);
			this.inputEl.value = "";
			this.renderSuggestions();
		};

		addBtn.onclick = tryAdd;
		this.inputEl.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				tryAdd();
			}
		});
		this.inputEl.addEventListener("input", () => this.renderSuggestions());
		this.inputEl.addEventListener("focus", () => this.renderSuggestions());
		this.inputEl.addEventListener("blur", () => {
			// Delay so a click on a suggestion registers before it disappears.
			setTimeout(() => this.suggestionsEl.empty(), 150);
		});
	}

	private addDeck(name: string) {
		if (this.decks.includes(name)) return;
		this.decks.push(name);
		this.renderPills();
		this.onChange?.(this.getDecks());
	}

	private removeDeck(name: string) {
		this.decks = this.decks.filter((d) => d !== name);
		this.renderPills();
		this.onChange?.(this.getDecks());
	}

	private renderPills() {
		this.pillsEl.empty();
		if (this.decks.length === 0) {
			this.pillsEl.createSpan({
				text: "No decks yet",
				cls: "cram-pill-empty",
			});
			return;
		}
		this.decks.forEach((deckName) => {
			const pill = this.pillsEl.createDiv({ cls: "cram-pill" });
			pill.createSpan({ text: deckName, cls: "cram-pill-label" });
			const removeBtn = pill.createSpan({ cls: "cram-pill-remove" });
			setIcon(removeBtn, "x");
			removeBtn.onclick = () => this.removeDeck(deckName);
		});
	}

	private renderSuggestions() {
		this.suggestionsEl.empty();
		const query = this.inputEl.value.trim().toLowerCase();
		const candidates = getAllDecks(this.app).filter(
			(d) =>
				!this.decks.includes(d) &&
				(!query || d.toLowerCase().includes(query)),
		);
		candidates.slice(0, 6).forEach((deckName) => {
			const item = this.suggestionsEl.createDiv({
				cls: "cram-pill-suggestion",
			});
			item.setText(deckName);
			// mousedown (not click) fires before the input's blur handler clears this list.
			item.addEventListener("mousedown", (evt) => {
				evt.preventDefault();
				this.addDeck(deckName);
				this.inputEl.value = "";
				this.inputEl.focus();
				this.renderSuggestions();
			});
		});
	}
}

export class DeckPickerModal extends Modal {
	private file: TFile;
	private initialSelected: string[];
	private onConfirm: (selected: string[]) => void;
	private pillEditor!: DeckPillEditor;

	constructor(
		app: App,
		file: TFile,
		initialSelected: string[],
		onConfirm: (selected: string[]) => void,
	) {
		super(app);
		this.file = file;
		this.initialSelected = initialSelected;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		this.setTitle(`Edit decks for "${this.file.basename}"`);
		this.contentEl.addClass("cram-picker-modal");

		this.pillEditor = new DeckPillEditor(
			this.app,
			this.contentEl,
			this.initialSelected,
		);
		this.pillEditor.render();

		const confirmBtn = this.contentEl.createEl("button", {
			text: "CONFIRM",
			cls: "mod-cta cram-btn-block",
		});
		confirmBtn.onclick = () => {
			this.onConfirm(this.pillEditor.getDecks());
			this.close();
		};
	}

	onClose() {
		this.contentEl.empty();
	}
}
