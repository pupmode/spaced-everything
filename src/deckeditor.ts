import { App, Modal, TFile, setIcon } from "obsidian";
import {
	createNote,
	describeNoteWriteError,
	getFilesForDeck,
	getNoteBody,
	renameNote,
	setNoteBody,
	unassignDeck,
} from "./savedata";

interface EditorCard {
	file: TFile | null; // null until this card is saved as a real note
	front: string;
	back: string;
	originalFront: string; // used to detect whether a rename is needed
	originalBack: string | null; // null = existing note whose body hasn't been loaded yet
	backOpen: boolean;
	error: string | null;
}

function blankCard(): EditorCard {
	return {
		file: null,
		front: "",
		back: "",
		originalFront: "",
		originalBack: "",
		backOpen: false,
		error: null,
	};
}

/**
 * Create-or-edit screen for a single deck: a vertical stack of cards styled
 * like the review card, each editable in place. New deck -> starts with 3
 * blank cards and an editable name. Existing deck -> its notes load in as
 * cards (body loads lazily, only once "edit back" is opened) and the name
 * is locked, since renaming it would mean rewriting every note in it.
 */
export class DeckEditorModal extends Modal {
	private deckName: string | null;
	private sourcePath: string;
	private onSaved: (deckName: string) => void;

	private cards: EditorCard[] = [];
	private pendingUnassigns: TFile[] = [];

	private cardsContainer!: HTMLElement;
	private nameInput!: HTMLInputElement;
	private nameError!: HTMLElement;
	private saveBtn!: HTMLButtonElement;

	constructor(
		app: App,
		deckName: string | null,
		sourcePath: string,
		onSaved: (deckName: string) => void,
	) {
		super(app);
		this.deckName = deckName;
		this.sourcePath = sourcePath;
		this.onSaved = onSaved;
	}

	onOpen() {
		this.setTitle(this.deckName ? `Edit "${this.deckName}"` : "New deck");
		this.contentEl.addClass("cram-picker-modal");

		if (this.deckName) {
			this.cards = getFilesForDeck(this.app, this.deckName).map(
				(file): EditorCard => ({
					file,
					front: file.basename,
					back: "",
					originalFront: file.basename,
					originalBack: null,
					backOpen: false,
					error: null,
				}),
			);
		} else {
			this.cards = [blankCard(), blankCard(), blankCard()];
		}

		if (!this.deckName) {
			this.contentEl.createEl("label", {
				text: "Deck name",
				cls: "cram-newnote-label",
			});
			this.nameInput = this.contentEl.createEl("input", {
				type: "text",
				placeholder: "Deck name...",
				cls: "cram-editor-deckname-input",
			});
			this.nameInput.addEventListener("input", () => {
				this.nameError.setText("");
			});
		} else {
			this.contentEl.createDiv({
				text: this.deckName,
				cls: "cram-editor-deckname-locked",
			});
		}
		this.nameError = this.contentEl.createEl("p", {
			cls: "cram-newnote-error",
		});

		this.cardsContainer = this.contentEl.createDiv({
			cls: "cram-editor-list",
		});
		this.renderCards();

		const addBtn = this.contentEl.createEl("button", {
			text: "+ Add card",
			cls: "cram-advfilter-addgroup",
		});
		addBtn.onclick = () => {
			this.cards.push(blankCard());
			this.renderCards();
		};

		this.saveBtn = this.contentEl.createEl("button", {
			text: "SAVE DECK",
			cls: "mod-cta cram-btn-block",
		});
		this.saveBtn.onclick = () => void this.handleSave();
	}

	onClose() {
		this.contentEl.empty();
	}

	private renderCards() {
		this.cardsContainer.empty();
		this.cards.forEach((card, idx) => this.buildCardEl(card, idx));
	}

	private buildCardEl(card: EditorCard, idx: number) {
		const isMobileView = document.body.hasClass("is-mobile");
		const cardEl = this.cardsContainer.createDiv({
			cls: isMobileView
				? ["cram-card", "cram-editor-card"]
				: ["cram-card", "cram-card-desktop", "cram-editor-card"],
		});

		const actions = cardEl.createDiv({ cls: "cram-editor-card-actions" });

		const flipBtn = actions.createSpan({
			cls: "cram-editor-card-action",
			attr: { "aria-label": "Flip card" },
		});
		setIcon(flipBtn, "flip-horizontal-2");
		flipBtn.onclick = (evt) => {
			evt.stopPropagation();
			this.flipCard(card, cardEl);
		};

		const removeBtn = actions.createSpan({
			cls: "cram-editor-card-action",
			attr: { "aria-label": "Remove card" },
		});
		setIcon(removeBtn, "x");
		removeBtn.onclick = (evt) => {
			evt.stopPropagation();
			this.removeCard(idx);
		};

		const faceEl = cardEl.createDiv({ cls: "cram-editor-card-face" });
		this.renderCardFace(card, faceEl, cardEl);
	}

	/** (Re)builds just the front-input-or-back-textarea content of a card, leaving its outer element (and any in-flight flip transition on it) untouched. */
	private renderCardFace(
		card: EditorCard,
		faceEl: HTMLElement,
		cardEl: HTMLElement,
	) {
		faceEl.empty();
		cardEl.removeClass("cram-card-scrollable", "cram-card-long-text");

		if (!card.backOpen) {
			const frontInput = faceEl.createEl("input", {
				type: "text",
				placeholder: "Front...",
				cls: "cram-editor-card-front",
			});
			frontInput.value = card.front;
			frontInput.addEventListener("input", () => {
				card.front = frontInput.value;
				if (card.error) {
					card.error = null;
					errorEl.setText("");
				}
			});
		} else {
			const backInput = faceEl.createEl("textarea", {
				placeholder: "Back (optional)...",
				cls: "cram-editor-card-back",
			});
			backInput.value = card.back;
			backInput.addEventListener("input", () => {
				card.back = backInput.value;
			});
		}

		const errorEl = faceEl.createEl("p", {
			text: card.error ?? "",
			cls: "cram-editor-card-error",
		});

		// Same long-content shrink-and-scroll behavior as the review card.
		requestAnimationFrame(() => {
			if (cardEl.scrollHeight > cardEl.clientHeight) {
				cardEl.addClass("cram-card-scrollable", "cram-card-long-text");
			}
		});
	}

	/** Shrinks the card away, swaps its face content, then grows it back in — identical timing/mechanic to the review screen's flip. */
	private flipCard(card: EditorCard, cardEl: HTMLElement) {
		cardEl.addClass("cram-card-flipping");

		setTimeout(async () => {
			if (!card.backOpen && card.file && card.originalBack === null) {
				const body = await getNoteBody(this.app, card.file);
				card.back = body;
				card.originalBack = body;
			}
			card.backOpen = !card.backOpen;

			const faceEl = cardEl.querySelector<HTMLElement>(
				".cram-editor-card-face",
			);
			if (faceEl) this.renderCardFace(card, faceEl, cardEl);

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					cardEl.removeClass("cram-card-flipping");
				});
			});
		}, 150); // matches the CSS transition duration on .cram-card
	}

	private removeCard(idx: number) {
		const [card] = this.cards.splice(idx, 1);
		if (card?.file) this.pendingUnassigns.push(card.file);
		this.renderCards();
	}

	private async handleSave() {
		const deckName = this.deckName ?? this.nameInput.value.trim();
		if (!this.deckName && !deckName) {
			this.nameError.setText("Deck name is required.");
			return;
		}

		let hasError = false;

		for (const card of this.cards) {
			const front = card.front.trim();
			const back = card.back.trim();
			const untouchedBlank = !card.file && !front && !back;
			if (untouchedBlank) continue;

			if (!front) {
				card.error = "Front is required.";
				hasError = true;
				continue;
			}

			try {
				if (!card.file) {
					const result = await createNote(
						this.app,
						this.sourcePath,
						front,
						back,
						[deckName],
					);
					if (!result.file) {
						card.error = describeNoteWriteError(result.reason);
						hasError = true;
						continue;
					}
					card.file = result.file;
					card.originalFront = front;
					card.originalBack = back;
				} else {
					if (front !== card.originalFront) {
						const renamed = await renameNote(this.app, card.file, front);
						if (!renamed.ok) {
							card.error = describeNoteWriteError(renamed.reason);
							hasError = true;
							continue;
						}
						card.originalFront = front;
					}
					if (card.originalBack !== null && back !== card.originalBack) {
						await setNoteBody(this.app, card.file, back);
						card.originalBack = back;
					}
				}
				card.error = null;
			} catch (e) {
				card.error = "Something went wrong saving this card.";
				hasError = true;
			}
		}

		for (const file of this.pendingUnassigns) {
			await unassignDeck(this.app, file, deckName);
		}
		this.pendingUnassigns = [];

		// Errors are always about the front (empty/collision), so make sure
		// the card is showing its front — not stuck on the back — when
		// there's something to fix.
		this.cards.forEach((c) => {
			if (c.error) c.backOpen = false;
		});

		// Drop cards that never got any content — nothing to keep around.
		this.cards = this.cards.filter(
			(c) => c.file || c.front.trim() || c.back.trim(),
		);
		this.renderCards();

		if (hasError) return;

		this.deckName = deckName;
		this.onSaved(deckName);
		this.close();
	}
}
