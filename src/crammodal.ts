import {
	App,
	Modal,
	Setting,
	TFile,
	MarkdownRenderer,
	Component,
} from "obsidian";
import {
	getNotesForFilter,
	matchesFilter,
	suggestedDecksForFilter,
	getDecksForFile,
	loadSession,
	saveSession,
	setNoteDecks,
	recordSector,
} from "./savedata";
import { SessionData, ReviewState } from "./types";
import { StartScreen } from "./startscreen";
import { EndScreen } from "./endscreen";
import CramPlugin from "./main";
import { SourcePickerModal } from "./advancedfilter";
import { DeckPickerModal } from "./pickermodal";
import { NewNoteModal } from "./newnotemodal";

/* add later: full cram theme (incl backgrounds and buttons colors) */

export class CramModal extends Modal {
	private plugin: CramPlugin;
	private session: SessionData | null = null;
	private flipped: boolean = false;
	private renderComponent: Component = new Component();

	constructor(app: App, plugin: CramPlugin) {
		super(app);
		this.plugin = plugin;
		this.setTitle("MEMORIZE");
	}
	onOpen() {
		this.renderComponent.load();
		this.session = loadSession(this.plugin);
		this.clearAndRender();
	}

	onClose() {
		if (!this.plugin.settings.keepTrackingOnClose) {
			this.finalizeSector("other"); // modal closed before a choice was made on the current card
		}
		void saveSession(this.plugin, this.session);
		this.renderComponent.unload();
		this.contentEl.empty();
	}

	renderCard() {
		const session = this.session!;
		const isMobileView = document.body.hasClass("is-mobile");

		const currentPath = session.noteOrder[session.currentIndex]!;
		this.trackCardAppearance(currentPath);

		const currentFile = this.app.vault.getAbstractFileByPath(currentPath);

		const { contentEl } = this;
		const cardEl = contentEl.createEl("div", {
			cls: isMobileView
				? ["cram-card", "cram-card-flipping"]
				: ["cram-card", "cram-card-desktop", "cram-card-flipping"],
		});

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				cardEl.removeClass("cram-card-flipping");
			});
		});

		if (this.flipped) {
			void this.renderCardBack(currentFile, cardEl);
		} else {
			let title = "This is a card";
			if (currentFile instanceof TFile) {
				title = currentFile.basename;
			}
			cardEl.setText(title);
		}

		cardEl.onclick = () => {
			cardEl.addClass("cram-card-flipping"); // shrink to blank

			setTimeout(() => {
				this.flipped = !this.flipped;
				this.clearAndRender();
			}, 150); // matches the CSS transition duration above
		};

		requestAnimationFrame(() => {
			if (cardEl.scrollHeight > cardEl.clientHeight) {
				cardEl.addClass("cram-card-scrollable");
				cardEl.addClass("cram-card-long-text");
			}
		});

		const total = session.noteOrder.length;
		const numPass = session.noteOrder.filter(
			(p) => session.noteStates[p] === "pass",
		).length;
		const numRetry = session.noteOrder.filter(
			(p) => session.noteStates[p] === "retry",
		).length;
		const done = numPass + numRetry;

		const dueEl = contentEl.createEl("p", {
			text: done + " of " + total,
			cls: ["cram-due"],
		});

		const progressContainer = contentEl.createEl("div", {
			cls: "cram-progbar",
		});

		session.noteOrder.forEach((path) => {
			const segment = progressContainer.createEl("div", {
				cls: "cram-prog-segment",
			});
			const state = session.noteStates[path];
			if (state === "pass") segment.addClass("cram-segment-pass");
			else if (state === "retry") segment.addClass("cram-segment-retry");
			else segment.addClass("cram-segment-due");
		});

		const reactRow = new Setting(this.contentEl)
			.setClass("cram-react-row")
			.addButton((btn) => {
				btn.setIcon("x");
				btn.buttonEl.addClass("react-btn", "react-btn-red");
				btn.onClick(() => {
					this.reactToCurrentCard("retry");
				});
			})
			.addButton((btn) => {
				btn.setIcon("check");
				btn.buttonEl.addClass("react-btn", "react-btn-green");
				btn.onClick(() => {
					this.reactToCurrentCard("pass");
				});
			});

		const toolRow = new Setting(this.contentEl)
			.setClass("cram-tool-row")
			// restart
			.addButton((btn) => {
				btn.setIcon("arrow-left-to-line");
				btn.buttonEl.addClass("tool-btn");
				btn.onClick(() => {
					this.restartRound();
				});
			})
			// src picker
			.addButton((btn) => {
				btn.setIcon("library-big");
				btn.buttonEl.addClass("tool-btn");
				btn.onClick(() => {
					const session = this.session!;
					new SourcePickerModal(
						this.app,
						session.filter,
						(newFilter) => {
							session.filter = newFilter;
							const newPaths = getNotesForFilter(
								this.app,
								newFilter,
							);

							// Add newly-included notes as unreviewed, keep existing states for notes still in the pool,
							// drop notes no longer covered by the filter.
							const newNoteStates: Record<string, ReviewState> =
								{};
							newPaths.forEach((path) => {
								newNoteStates[path] =
									session.noteStates[path] ?? "unreviewed";
							});

							session.noteOrder = newPaths;
							session.noteStates = newNoteStates;
							session.currentIndex = 0;
							this.flipped = false;

							this.clearAndRender();
						},
					).open();
				});
			})
			// shuffle
			.addButton((btn) => {
				btn.setIcon("shuffle");
				btn.buttonEl.addClass("tool-btn");
				btn.onClick(() => {
					this.shufflePool();
				});
			})
			// new note
			.addButton((btn) => {
				btn.setIcon("file-plus-corner");
				btn.buttonEl.addClass("tool-btn");
				btn.onClick(() => {
					const session = this.session!;
					const currentPath =
						session.noteOrder[session.currentIndex]!;

					new NewNoteModal(
						this.app,
						suggestedDecksForFilter(session.filter),
						currentPath,
						(file, decks) => {
							if (matchesFilter(decks, session.filter)) {
								session.noteOrder.push(file.path);
								session.noteStates[file.path] = "unreviewed";
							}
							this.clearAndRender();
						},
					).open();
				});
			})
			// deckpicker
			.addButton((btn) => {
				btn.setIcon("layers-plus");
				btn.buttonEl.addClass("tool-btn");
				btn.onClick(() => {
					const session = this.session!;
					const currentPath =
						session.noteOrder[session.currentIndex]!;
					const currentFile =
						this.app.vault.getAbstractFileByPath(currentPath);
					if (!(currentFile instanceof TFile)) return;

					const currentDecks = getDecksForFile(this.app, currentFile);

					new DeckPickerModal(
						this.app,
						currentFile,
						currentDecks,
						async (newDecks) => {
							await setNoteDecks(this.app, currentFile, newDecks);
							this.clearAndRender();
						},
					).open();
				});
			});

		if (!isMobileView) {
			toolRow.settingEl.addClass("cram-tool-row-desktop");
		}
		if (!isMobileView) {
			reactRow.settingEl.addClass("cram-react-row-desktop");
		}
	}

	private async renderCardBack(
		file: import("obsidian").TAbstractFile | null,
		containerEl: HTMLElement,
	) {
		if (!(file instanceof TFile)) {
			containerEl.setText("This is a card");
			return;
		}

		const raw = await this.app.vault.cachedRead(file);
		const cache = this.app.metadataCache.getFileCache(file);
		const fmPos = cache?.frontmatterPosition;

		const body = fmPos ? raw.slice(fmPos.end.offset).trim() : raw;

		await MarkdownRenderer.render(
			this.app,
			body,
			containerEl,
			file.path,
			this.renderComponent,
		);
	}

	/**
	 * Starts (or continues) sector tracking for whichever card is now on
	 * screen. Called at the top of every renderCard(). A re-render of the
	 * *same* card (flip, deck-picker edit, new-note creation, etc.) leaves
	 * the running timer untouched; only an actual change of card matters.
	 */
	private trackCardAppearance(path: string) {
		const session = this.session!;

		if (path === session.currentSectorPath) return; // same card still showing — timer keeps running

		if (session.currentSectorPath !== null) {
			// The card changed without an explicit pass/retry (restart round,
			// shuffle, or a mid-session filter change) — treat like a retry.
			this.finalizeSector("other");
		}

		session.currentSectorPath = path;
		session.currentSectorStart = Date.now();
	}

	/**
	 * Ends the current sector, if any. Only writes it (to frontmatter + the
	 * historical log) if it cleared the relevant duration threshold: "pass"
	 * uses 5 minutes, "other" (retry, modal closed, or an abandoned card)
	 * uses 10 minutes. Sub-threshold sectors are simply discarded.
	 */
	private finalizeSector(kind: "pass" | "other") {
		const session = this.session!;

		if (
			session.currentSectorPath === null ||
			session.currentSectorStart === null
		) {
			return;
		}

		const path = session.currentSectorPath;
		const startMs = session.currentSectorStart;
		const endMs = Date.now();

		session.currentSectorPath = null;
		session.currentSectorStart = null;

		const thresholdMs = (kind === "pass" ? 5 : 10) * 60 * 1000;
		if (endMs - startMs <= thresholdMs) return;

		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return;

		void recordSector(this.app, this.plugin, file, startMs, endMs);
	}

	private reactToCurrentCard(newState: ReviewState) {
		const session = this.session!;
		const currentPath = session.noteOrder[session.currentIndex]!;

		this.finalizeSector(newState === "pass" ? "pass" : "other");

		session.noteStates[currentPath] = newState;

		this.advanceToNextCard();
	}

	private shuffleArray<T>(arr: T[]): T[] {
		const result = [...arr]; // copy, don't mutate the original array in place
		for (let i = result.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			const temp = result[i]!;
			result[i] = result[j]!;
			result[j] = temp;
		}
		return result;
	}

	private shufflePool() {
		const session = this.session!;

		// Split into "still to do" vs "already reacted to."
		const unreviewedPaths = session.noteOrder.filter(
			(p) => session.noteStates[p] === "unreviewed",
		);
		const reactedPaths = session.noteOrder.filter(
			(p) => session.noteStates[p] !== "unreviewed",
		);

		const shuffledUnreviewed = this.shuffleArray(unreviewedPaths);

		// Rebuild noteOrder: reacted notes keep their existing spots' relative order,
		// unreviewed notes are replaced with the shuffled version.
		session.noteOrder = [...reactedPaths, ...shuffledUnreviewed];
		session.currentIndex = reactedPaths.length; // first unreviewed card in the new order

		this.flipped = false; // reset to front view
		this.clearAndRender();
	}

	private advanceToNextCard() {
		const session = this.session!;
		const total = session.noteOrder.length;

		for (let step = 1; step <= total; step++) {
			const nextIndex = (session.currentIndex + step) % total;
			const nextPath = session.noteOrder[nextIndex]!;
			if (session.noteStates[nextPath] === "unreviewed") {
				session.currentIndex = nextIndex;
				this.flipped = false;
				this.clearAndRender();
				return;
			}
		}

		this.clearAndRender();
	}

	private renderEndScreen() {
		const session = this.session!;

		const passCount = session.noteOrder.filter(
			(p) => session.noteStates[p] === "pass",
		).length;
		const retryCount = session.noteOrder.filter(
			(p) => session.noteStates[p] === "retry",
		).length;

		const endScreen = new EndScreen(
			this.contentEl,
			passCount,
			retryCount,
			() => this.startNextRound(),
			() => this.restartRound(),
			() => this.endSession(),
			session.round,
		);
		endScreen.render();
	}

	private startNextRound() {
		const session = this.session!;

		// New pool = only the notes that were retried this round.
		const retryPaths = session.noteOrder.filter(
			(p) => session.noteStates[p] === "retry",
		);

		retryPaths.forEach((path) => {
			session.noteStates[path] = "unreviewed"; // reset for the new round
		});

		session.noteOrder = retryPaths;
		session.round += 1;
		session.currentIndex = 0;
		this.flipped = false;

		this.clearAndRender();
	}

	private restartRound() {
		const session = this.session!;

		session.noteOrder.forEach((path) => {
			session.noteStates[path] = "unreviewed";
		});
		session.currentIndex = 0;
		this.flipped = false;

		this.clearAndRender();
	}

	private endSession() {
		this.session = null;
		this.clearAndRender();
	}

	private isRoundComplete(): boolean {
		const session = this.session!;
		return session.noteOrder.every(
			(path) => session.noteStates[path] !== "unreviewed",
		);
	}

	private clearAndRender() {
		this.contentEl.empty();

		if (this.session && this.isRoundComplete()) {
			this.renderEndScreen();
		} else if (this.session) {
			this.renderCard();
		} else {
			const startScreen = new StartScreen(
				this.app,
				this.contentEl,
				(filter) => {
					const notePaths = getNotesForFilter(this.app, filter);

					const noteStates: Record<string, ReviewState> = {};
					notePaths.forEach((path) => {
						noteStates[path] = "unreviewed";
					});

					this.session = {
						active: true,
						filter,
						round: 1,
						noteOrder: notePaths,
						noteStates: noteStates,
						currentIndex: 0,
						currentSectorPath: null,
						currentSectorStart: null,
					};

					this.clearAndRender();
				},
			);
			startScreen.render();
		}
	}
}
