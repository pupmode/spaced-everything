import { App } from "obsidian";
import { NoteRecord } from "./types";
import type SpacedEverythingPlugin from "./main";
import { ActiveModal } from "./ActiveModal";

export class SubtaskModal extends ActiveModal {
  constructor(app: App, plugin: SpacedEverythingPlugin, notes: NoteRecord[]) {
    super(app, plugin, notes, "__subtask__");
  }

  // No session persistence — this modal is ephemeral
  protected onSessionClose(): void {}
}
