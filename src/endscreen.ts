import { setIcon } from "obsidian";

export class EndScreen {
	private containerEl: HTMLElement;
	private passCount: number;
	private retryCount: number;
	private roundNumber?: number;
	private onNextRound: () => void;
	private onRestartRound: () => void;
	private onEndSession: () => void;

	constructor(
		containerEl: HTMLElement,
		passCount: number,
		retryCount: number,
		onNextRound: () => void,
		onRestartRound: () => void,
		onEndSession: () => void,
		roundNumber?: number,
	) {
		this.containerEl = containerEl;
		this.passCount = passCount;
		this.retryCount = retryCount;
		this.onNextRound = onNextRound;
		this.onRestartRound = onRestartRound;
		this.onEndSession = onEndSession;
		this.roundNumber = roundNumber;
	}

	render() {
		const total = this.passCount + this.retryCount;
		const passPercent =
			total === 0 ? 0 : Math.round((this.passCount / total) * 100);
		const retryPercent = 100 - passPercent;
		const allPassed = total > 0 && this.retryCount === 0;

		this.containerEl.createEl("p", {
			text: this.roundNumber
				? `Round ${this.roundNumber} complete!`
				: "Round complete!",
			cls: "cram-end-heading",
		});

		const pieWrapper = this.containerEl.createDiv({
			cls: "cram-end-pie-wrapper",
		});
		const pie = pieWrapper.createDiv({ cls: "cram-end-pie" });

		// conic-gradient draws the green slice first, then red fills the rest
		pie.style.background = `conic-gradient(var(--color-cram-green) 0% ${passPercent}%, var(--color-cram-red) ${passPercent}% 100%)`;

		const hole = pie.createDiv({ cls: "cram-end-pie-hole" });
		hole.createEl("span", {
			text: `${passPercent}%`,
			cls: "cram-end-pie-percent",
		});
		hole.createEl("span", {
			text: "passed",
			cls: "cram-end-pie-caption",
		});

		if (!allPassed) {
			const statsEl = this.containerEl.createDiv({ cls: "cram-end-stats" });

			const passStat = statsEl.createDiv({
				cls: "cram-end-stat cram-end-stat-pass",
			});
			setIcon(passStat.createSpan(), "check");
			passStat.createSpan({ text: `${passPercent}% (${this.passCount})` });

			const retryStat = statsEl.createDiv({
				cls: "cram-end-stat cram-end-stat-retry",
			});
			setIcon(retryStat.createSpan(), "x");
			retryStat.createSpan({
				text: `${retryPercent}% (${this.retryCount})`,
			});
		}

		const buttonRow = this.containerEl.createDiv({
			cls: "cram-end-buttons",
		});

		if (this.retryCount > 0) {
			const nextBtn = buttonRow.createEl("button", {
				text: "Next round",
				cls: "mod-cta cram-end-btn",
			});
			nextBtn.onclick = () => this.onNextRound();
		}

		const restartBtn = buttonRow.createEl("button", {
			text: "Restart round",
			cls: "cram-end-btn",
		});
		restartBtn.onclick = () => this.onRestartRound();

		const endBtn = buttonRow.createEl("button", {
			text: "End session",
			cls: "cram-end-btn cram-end-btn-danger",
		});
		endBtn.onclick = () => this.onEndSession();
	}
}
