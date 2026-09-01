import { Plugin } from "obsidian";  
import { CramPluginSettings, DEFAULT_SETTINGS } from "./types";  
import { CramModal } from "./crammodal";  
import { DeckLibraryModal } from "./decklibrary";
import { SectorLogModal } from "./sectorlog";
import { CramSettingTab } from "./settingstab";

export default class CramPlugin extends Plugin {
	settings: CramPluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CramSettingTab(this.app, this));

		this.addCommand({
			id: "open-cram-session",
			name: "Open cram session",
			callback: () => {
				new CramModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: "open-deck-library",
			name: "Open deck library",
			callback: () => {
				new DeckLibraryModal(this.app).open();
			},
		});

		this.addCommand({
			id: "open-sector-log",
			name: "Open sector log",
			callback: () => {
				new SectorLogModal(this.app, this).open();
			},
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<CramPluginSettings>,
		);
	}
	
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
