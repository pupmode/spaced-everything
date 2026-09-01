import { App, Modal } from "obsidian";
import CramPlugin from "./main";

/** Read-only browser for every logged sector, newest first. */
export class SectorLogModal extends Modal {
	private plugin: CramPlugin;

	constructor(app: App, plugin: CramPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		this.setTitle("Sector log");
		this.contentEl.addClass("cram-picker-modal");
		this.render();
	}

	onClose() {
		this.contentEl.empty();
	}

	private render() {
		this.contentEl.empty();

		const sectors = [...this.plugin.settings.sectors].sort(
			(a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
		);

		if (sectors.length === 0) {
			this.contentEl.createDiv({ cls: "cram-empty-state" }).setText(
				"No sectors logged yet. A sector is recorded once a card has been " +
					"active on screen long enough during a review session.",
			);
			return;
		}

		const list = this.contentEl.createDiv({ cls: "cram-sectorlog-list" });
		sectors.forEach((sector) => {
			const row = list.createDiv({ cls: "cram-sectorlog-row" });
			row.createDiv({
				text: `${sector.deckLabel} - ${sector.noteName}`,
				cls: "cram-sectorlog-title",
			});
			row.createDiv({
				text: formatSectorRange(sector.start, sector.end),
				cls: "cram-sectorlog-range",
			});
		});
	}
}

function formatSectorRange(start: string, end: string): string {
	const startDate = new Date(start);
	const endDate = new Date(end);
	const durationMin = Math.round(
		(endDate.getTime() - startDate.getTime()) / 60000,
	);

	const started = startDate.toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
	const ended = endDate.toLocaleTimeString(undefined, { timeStyle: "short" });

	return `${started} \u2192 ${ended} (${durationMin} min)`;
}
