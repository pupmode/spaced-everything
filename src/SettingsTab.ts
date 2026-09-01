import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import CramPlugin from "./main";
import { buildIcsContent, writeIcsFile } from "./savedata";

export class CramSettingTab extends PluginSettingTab {
	private plugin: CramPlugin;

	constructor(app: App, plugin: CramPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Sectors .ics file path")
			.setDesc(
				"Vault-relative path where the sector log is exported as a calendar (.ics) file. " +
					"Changing this doesn't move the existing file at the old path.",
			)
			.addText((text) =>
				text
					.setPlaceholder("Sectors.ics")
					.setValue(this.plugin.settings.sectorsIcsPath)
					.onChange(async (value) => {
						this.plugin.settings.sectorsIcsPath =
							value.trim() || "Sectors.ics";
						await this.plugin.saveSettings();
					}),
			);

			new Setting(containerEl)
				.setName(
					"Keep tracking a card's time when the review modal is closed",
				)
				.setDesc(
					"When on, closing the review modal doesn't end the timer for the card " +
						"currently on screen — reopening the modal on the same card resumes it. " +
						"There's no cap on how long the gap can be, so if you leave the modal " +
						"closed for hours or days, the eventual logged sector will span the " +
						"whole gap.",
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.keepTrackingOnClose)
						.onChange(async (value) => {
							this.plugin.settings.keepTrackingOnClose = value;
							await this.plugin.saveSettings();
						}),
				);
				
		new Setting(containerEl)
			.setName("Regenerate .ics file now")
			.setDesc(
				"Rewrites the .ics file at the path above from the full sector log. " +
					"Useful right after changing the path, or if the file was deleted.",
			)
			.addButton((btn) =>
				btn.setButtonText("Regenerate").onClick(async () => {
					const content = buildIcsContent(this.plugin.settings.sectors);
					await writeIcsFile(
						this.app,
						this.plugin.settings.sectorsIcsPath,
						content,
					);
					new Notice("Sectors .ics file regenerated.");
				}),
			);
	}
}
