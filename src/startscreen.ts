import { App, setIcon } from "obsidian";
import { DeckFilter, emptyDeckFilter } from "./types";
import { filterHasSelection } from "./savedata";
import { SourceSelector } from "./advancedfilter";
import { DeckLibraryModal } from "./decklibrary";

export class StartScreen {
	private app: App;
	private containerEl: HTMLElement;
	private onStart: (filter: DeckFilter) => void;
	private selector!: SourceSelector;

	constructor(
		app: App,
		containerEl: HTMLElement,
		onStart: (filter: DeckFilter) => void,
	) {
		this.app = app;
		this.containerEl = containerEl;
		this.onStart = onStart;
	}

	render() {
		const header = this.containerEl.createDiv({ cls: "cram-start-header" });
		setIcon(header.createDiv({ cls: "cram-start-icon" }), "layers");
		header.createEl("p", {
			text: "Choose one or more decks to start reviewing.",
			cls: "cram-start-subtitle",
		});

		const listContainer = this.containerEl.createDiv();
		const startBtn = this.containerEl.createEl("button", {
			text: "START SESSION",
			cls: "mod-cta cram-start-btn cram-btn-block",
		});

		this.selector = new SourceSelector(
			this.app,
			listContainer,
			emptyDeckFilter(),
			(filter) => {
				startBtn.disabled = !filterHasSelection(filter);
			},
		);
		this.selector.render();

		startBtn.disabled = true;
		startBtn.onclick = () => {
			this.onStart(this.selector.getFilter());
		};

		const manageLink = this.containerEl.createDiv({
			text: "Manage decks →",
			cls: "cram-textlink",
		});
		manageLink.onclick = () => {
			new DeckLibraryModal(this.app, () => this.selector.refresh()).open();
		};
	}
}

