import { App, Modal } from "obsidian";

interface CardData {
	front: string;
	back: string;
}

export class LibTestModal extends Modal {
	private deckName = "TestDeck";
	private cards: CardData[] = [
		{ front: "Title Card 1", back: "Back of Card 1" },
		{ front: "Title Card 2", back: "Back of Card 2" },
		{ front: "Title Card 3", back: "Back of Card 3" },
		{ front: "Title Card 4", back: "Back of Card 4" },
		{ front: "Title Card 5", back: "Back of Card 5" },
		{ front: "Title Card 6", back: "Back of Card 6" },
	];

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
	}

	onOpen() {
		this.setTitle("EDIT DECK " + this.deckName);

		const isMobileView = document.body.hasClass("is-mobile");
		const { contentEl } = this;

		// Create container for cards
		const cardContainer = contentEl.createEl("div", {
			cls: ["modal-content", "cram-container"],
		});

		this.cards.forEach((card) => {
			this.createCardEl(cardContainer, card.front, isMobileView);
		});

		// Add title to container
		const title = contentEl.createEl("h2", { text: "Title Card 1" });
		cardContainer.appendChild(title);
	}

	private createCardEl(
		containerEl: HTMLElement,
		text: string,
		isMobileView: boolean,
	) {
		const cardEl = containerEl.createEl("p", {
			text,
			cls: isMobileView
				? "cram-card"
				: ["cram-card", "cram-card-desktop"],
		});

		// Create the base hoverable card div
		const foldEl = cardEl.createDiv({ cls: "hoverable-card" });

		cardEl.setAttribute("contenteditable", "true");
		cardEl.setAttribute("spellcheck", "false");

		// Optional: react to edits later (e.g. for saving)
		cardEl.addEventListener("blur", () => {
			const newText = cardEl.textContent ?? "";
			console.log(`Card ${text} edited to: "${newText}"`);
			// store newText somewhere, e.g. update this.cards[i].front
		});

		requestAnimationFrame(() => {
			if (cardEl.scrollHeight > cardEl.clientHeight) {
				cardEl.addClass("cram-card-scrollable");
				cardEl.addClass("cram-card-long-text");
			}
		});

		return cardEl;
	}

	onClose() {
		this.contentEl.empty();
	}
}
