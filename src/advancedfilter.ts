import { App, Modal, setIcon } from "obsidian";
import {
	DeckFilter,
	FilterGroup,
	emptyFilterGroup,
	cloneFilterGroup,
} from "./types";
import { filterHasSelection } from "./savedata";
import { DeckChecklist, DeckPillEditor } from "./pickermodal";

/**
 * Popup for building a filter of OR'd groups, each requiring ALL of some
 * decks (or any deck at all) and NONE of some others. Modeled loosely on
 * Obsidian Bases' filter UI, but fixed at two levels (no arbitrary nesting)
 * since deck membership is the only condition we ever need to express.
 */
export class AdvancedFilterModal extends Modal {
	private groups: FilterGroup[];
	private onConfirm: (groups: FilterGroup[]) => void;
	private groupsContainer!: HTMLElement;

	constructor(
		app: App,
		initialGroups: FilterGroup[],
		onConfirm: (groups: FilterGroup[]) => void,
	) {
		super(app);
		this.groups =
			initialGroups.length > 0
				? initialGroups.map(cloneFilterGroup)
				: [emptyFilterGroup()];
		this.onConfirm = onConfirm;
	}

	onOpen() {
		this.setTitle("Advanced filter");
		this.contentEl.addClass("cram-picker-modal");

		this.contentEl.createEl("p", {
			text: "A note matches if it satisfies ANY of these groups:",
			cls: "cram-advfilter-intro",
		});

		this.groupsContainer = this.contentEl.createDiv();
		this.renderGroups();

		const addGroupBtn = this.contentEl.createEl("button", {
			text: "+ Add group",
			cls: "cram-advfilter-addgroup",
		});
		addGroupBtn.onclick = () => {
			this.groups.push(emptyFilterGroup());
			this.renderGroups();
		};

		const confirmBtn = this.contentEl.createEl("button", {
			text: "APPLY FILTER",
			cls: "mod-cta cram-btn-block",
		});
		confirmBtn.onclick = () => {
			const cleaned = this.groups.filter(
				(g) => g.includeAll || g.include.length > 0 || g.exclude.length > 0,
			);
			this.onConfirm(cleaned);
			this.close();
		};
	}

	onClose() {
		this.contentEl.empty();
	}

	private renderGroups() {
		this.groupsContainer.empty();

		this.groups.forEach((group, idx) => {
			const card = this.groupsContainer.createDiv({
				cls: "cram-advfilter-group",
			});

			const header = card.createDiv({ cls: "cram-advfilter-group-header" });
			header.createSpan({
				text: this.groups.length > 1 ? `Group ${idx + 1}` : "Filter",
				cls: "cram-advfilter-group-title",
			});
			if (this.groups.length > 1) {
				const removeBtn = header.createSpan({
					cls: "cram-advfilter-group-remove",
				});
				setIcon(removeBtn, "trash-2");
				removeBtn.onclick = () => {
					this.groups.splice(idx, 1);
					this.renderGroups();
				};
			}

			const allRow = card.createEl("label", {
				cls: "cram-advfilter-toggle-row",
			});
			const allCheck = allRow.createEl("input", {
				type: "checkbox",
			}) as HTMLInputElement;
			allCheck.checked = group.includeAll;
			allRow.createSpan({ text: "Match any deck" });
			allCheck.addEventListener("change", () => {
				group.includeAll = allCheck.checked;
				this.renderGroups();
			});

			card.createDiv({
				text: "Must have all of:",
				cls: "cram-advfilter-label",
			});
			const includeWrap = card.createDiv({
				cls: group.includeAll ? "cram-advfilter-disabled" : "",
			});
			new DeckPillEditor(this.app, includeWrap, group.include, (decks) => {
				group.include = decks;
			}).render();

			card.createDiv({
				text: "Must have none of:",
				cls: "cram-advfilter-label",
			});
			const excludeWrap = card.createDiv();
			new DeckPillEditor(this.app, excludeWrap, group.exclude, (decks) => {
				group.exclude = decks;
			}).render();
		});
	}
}

/** Human-readable summary of an advanced filter, shown once it's applied. */
function summarizeGroups(groups: FilterGroup[]): string {
	if (groups.length === 0) return "No groups set — this matches nothing yet.";

	return groups
		.map((g) => {
			const inc = g.includeAll ? "any deck" : g.include.join(" + ") || "—";
			const exc = g.exclude.length > 0 ? ` without ${g.exclude.join(", ")}` : "";
			return `${inc}${exc}`;
		})
		.join("  OR  ");
}

/**
 * Wraps the simple deck checklist and the advanced filter builder behind one
 * consistent surface, so StartScreen and SourcePickerModal don't each have
 * to implement the simple/advanced toggle themselves.
 */
export class SourceSelector {
	private app: App;
	private containerEl: HTMLElement;
	private filter: DeckFilter;
	private onChange?: (filter: DeckFilter) => void;
	private bodyEl!: HTMLElement;

	constructor(
		app: App,
		containerEl: HTMLElement,
		initialFilter: DeckFilter,
		onChange?: (filter: DeckFilter) => void,
	) {
		this.app = app;
		this.containerEl = containerEl;
		this.filter = initialFilter;
		this.onChange = onChange;
	}

	getFilter(): DeckFilter {
		return this.filter;
	}

	/** Re-reads decks from the vault and re-renders — call after decks may have changed elsewhere. */
	refresh() {
		this.renderBody();
	}

	render() {
		this.bodyEl = this.containerEl.createDiv();
		this.renderBody();
	}

	private renderBody() {
		this.bodyEl.empty();

		if (this.filter.mode === "simple") {
			const checklist = new DeckChecklist(
				this.app,
				this.bodyEl,
				this.filter.decks,
				(decks) => {
					this.filter = { mode: "simple", decks };
					this.onChange?.(this.filter);
				},
			);
			checklist.render();

			const advLink = this.bodyEl.createDiv({
				text: "Advanced filter →",
				cls: "cram-textlink",
			});
			advLink.onclick = () => this.openAdvanced([]);
		} else {
			const filter = this.filter; // narrowed to the "advanced" variant here
			const summary = this.bodyEl.createDiv({
				cls: "cram-advfilter-summary",
			});
			summary.setText(summarizeGroups(filter.groups));

			const editBtn = this.bodyEl.createEl("button", {
				text: "Edit filter",
				cls: "cram-btn-block",
			});
			editBtn.onclick = () => this.openAdvanced(filter.groups);

			const backLink = this.bodyEl.createDiv({
				text: "← Use simple checklist",
				cls: "cram-textlink",
			});
			backLink.onclick = () => {
				this.filter = { mode: "simple", decks: [] };
				this.onChange?.(this.filter);
				this.renderBody();
			};
		}
	}

	private openAdvanced(initialGroups: FilterGroup[]) {
		new AdvancedFilterModal(this.app, initialGroups, (groups) => {
			this.filter = { mode: "advanced", groups };
			this.onChange?.(this.filter);
			this.renderBody();
		}).open();
	}
}

/**
 * Source picker: a small popup Modal on top of CramModal, letting the user
 * change which decks are being reviewed mid-session (simple checklist by
 * default, with the same "Advanced filter" escape hatch as the start screen).
 */
export class SourcePickerModal extends Modal {
	private initialFilter: DeckFilter;
	private onConfirm: (filter: DeckFilter) => void;
	private selector!: SourceSelector;

	constructor(
		app: App,
		initialFilter: DeckFilter,
		onConfirm: (filter: DeckFilter) => void,
	) {
		super(app);
		this.initialFilter = initialFilter;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		this.setTitle("Choose sources");
		this.contentEl.addClass("cram-picker-modal");

		const listContainer = this.contentEl.createDiv();
		let confirmBtn: HTMLButtonElement;

		this.selector = new SourceSelector(
			this.app,
			listContainer,
			this.initialFilter,
			(filter) => {
				confirmBtn.disabled = !filterHasSelection(filter);
			},
		);
		this.selector.render();

		confirmBtn = this.contentEl.createEl("button", {
			text: "CONFIRM",
			cls: "mod-cta cram-btn-block",
		});
		confirmBtn.disabled = !filterHasSelection(this.initialFilter);

		confirmBtn.onclick = () => {
			this.onConfirm(this.selector.getFilter());
			this.close();
		};
	}

	onClose() {
		this.contentEl.empty();
	}
}
