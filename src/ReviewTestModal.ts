import {
	App,
	Modal,
	Setting,
	Platform,
	setIcon,
	ButtonComponent,
} from "obsidian";

/* add later: full cram theme (incl backgrounds and buttons colors) */
interface PlaceholderProps {
	total: 10;
	retry: 2;
	pass: 3;
}

export class ReviewTestModal extends Modal {
	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
	}

	onOpen() {
		this.Render();
	}

	onClose() {
		this.contentEl.empty();
	}
    
	private Render() {
		// title
		this.setTitle("MEMORIZE");

		const isMobileView = document.body.hasClass("is-mobile");

		// card
		const { contentEl } = this;
		let card = "This is a card"; // placeholder for note title
		const cardEl = contentEl.createEl("p", {
			text: card,
			cls: isMobileView
				? "cram-card"
				: ["cram-card", "cram-card-desktop"],
		});

		requestAnimationFrame(() => {
			if (cardEl.scrollHeight > cardEl.clientHeight) {
				cardEl.addClass("cram-card-scrollable");
				cardEl.addClass("cram-card-long-text");
			}
		});

		// placeholder for prog bar and due count:
		let total = "10";
		let retry = "2";
		let pass = "3";
		let done = Number(pass) + Number(retry);

		const dueEl = contentEl.createEl("p", {
			text: done + " of " + total,
			cls: ["cram-due"],
		});

		const progressContainer = contentEl.createEl("div", {
			cls: "cram-progbar",
		});

		const numSegments = parseInt(total);
		const numPass = parseInt(pass);
		const numRetry = parseInt(retry);

		for (let i = 0; i < numSegments; i++) {
			const segment = progressContainer.createEl("div", {
				cls: "cram-prog-segment",
			});
			if (i < numPass) {
				segment.addClass("cram-segment-pass");
			} else if (i < numPass + numRetry) {
				segment.addClass("cram-segment-retry");
			} else {
				segment.addClass("cram-segment-due");
			}
		}

		const reactRow = new Setting(this.contentEl)
			.setClass("cram-react-row")
			.addButton((btn) => {
				btn.setIcon("x");
				btn.buttonEl.addClass("react-btn", "react-btn-red");
			})
			.addButton((btn) => {
				btn.setIcon("check");
				btn.buttonEl.addClass("react-btn", "react-btn-green");
			});

		const toolRow = new Setting(this.contentEl)
			.setClass("cram-tool-row")
			// restart
			.addButton((btn) => {
				btn.setIcon("arrow-left-to-line");
				btn.buttonEl.addClass("tool-btn");
			})
			// src picker
			.addButton((btn) => {
				btn.setIcon("library-big");
				btn.buttonEl.addClass("tool-btn");
			})
			// shuffle
			.addButton((btn) => {
				btn.setIcon("shuffle");
				btn.buttonEl.addClass("tool-btn");
			})
			// new note
			.addButton((btn) => {
				btn.setIcon("file-plus-corner");
				btn.buttonEl.addClass("tool-btn");
			})
			// deckpicker
			.addButton((btn) => {
				btn.setIcon("layers-plus");
				btn.buttonEl.addClass("tool-btn");
			});

		if (!isMobileView) {
			toolRow.settingEl.addClass("cram-tool-row-desktop");
		}

		if (!isMobileView) {
			reactRow.settingEl.addClass("cram-react-row-desktop");
		}
	}
}
