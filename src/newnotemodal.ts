import { App, Modal, TFile } from "obsidian";
import { createNote, describeNoteWriteError } from "./savedata";
import { DeckPillEditor } from "./pickermodal";

/**
 * Modal for creating a brand new note mid-session. Pre-fills the deck pills
 * with the session's currently selected sources; the caller decides whether
 * to fold the created note into the active pool (only if it shares a deck
 * with the session's sources).
 */
export class NewNoteModal extends Modal {
	private initialDecks: string[];
	private sourcePath: string;
	private onCreate: (file: TFile, decks: string[]) => void;

	private pillEditor!: DeckPillEditor;
	private nameInput!: HTMLInputElement;
	private contentInput!: HTMLTextAreaElement;
	private errorEl!: HTMLElement;
	private createBtn!: HTMLButtonElement;

	constructor(
		app: App,
		initialDecks: string[],
		sourcePath: string,
		onCreate: (file: TFile, decks: string[]) => void,
	) {
		super(app);
		this.initialDecks = initialDecks;
		this.sourcePath = sourcePath;
		this.onCreate = onCreate;
	}

	onOpen() {
		this.setTitle("New note");
		this.contentEl.addClass("cram-newnote-modal");

		this.contentEl.createEl("label", {
			text: "Name",
			cls: "cram-newnote-label",
		});
		this.nameInput = this.contentEl.createEl("input", {
			type: "text",
			placeholder: "Note title...",
			cls: "cram-newnote-name",
		});
		this.nameInput.addEventListener("input", () => {
			this.errorEl.setText("");
			this.updateCreateEnabled();
		});
		this.nameInput.addEventListener("keydown", (evt) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				void this.handleCreate();
			}
		});

		this.contentEl.createEl("label", {
			text: "Content",
			cls: "cram-newnote-label",
		});
		this.contentInput = this.contentEl.createEl("textarea", {
			placeholder: "Write the note body here...",
			cls: "cram-newnote-content",
		});

		this.contentEl.createEl("label", {
			text: "Decks",
			cls: "cram-newnote-label",
		});
		this.pillEditor = new DeckPillEditor(
			this.app,
			this.contentEl,
			this.initialDecks,
		);
		this.pillEditor.render();

		this.errorEl = this.contentEl.createEl("p", {
			cls: "cram-newnote-error",
		});

		this.createBtn = this.contentEl.createEl("button", {
			text: "CREATE",
			cls: "mod-cta cram-btn-block",
		});
		this.createBtn.onclick = () => void this.handleCreate();
		this.updateCreateEnabled();

		this.nameInput.focus();
	}

	onClose() {
		this.contentEl.empty();
	}

	private updateCreateEnabled() {
		this.createBtn.disabled = this.nameInput.value.trim().length === 0;
	}

	private async handleCreate() {
		if (this.nameInput.value.trim().length === 0) return;

		const result = await createNote(
			this.app,
			this.sourcePath,
			this.nameInput.value,
			this.contentInput.value,
			this.pillEditor.getDecks(),
		);

		if (!result.file) {
			this.errorEl.setText(describeNoteWriteError(result.reason));
			return;
		}

		this.onCreate(result.file, this.pillEditor.getDecks());
		this.close();
	}
}
