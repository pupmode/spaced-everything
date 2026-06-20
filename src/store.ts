//← load/save plugin data (JSON)

import { Plugin } from "obsidian";
import { PluginData, NoteRecord } from "./types";

const EMPTY_DATA: PluginData = { notes: {}, reviewLoadLog: [] };

export async function loadStore(plugin: Plugin): Promise<PluginData> {
  const saved = await plugin.loadData();
  return saved?.pluginData ?? EMPTY_DATA;
}

export async function saveStore(plugin: Plugin, data: PluginData): Promise<void> {
  const current = (await plugin.loadData()) ?? {};
  await plugin.saveData({ ...current, pluginData: data });
}

export function getActiveNotes(data: PluginData): NoteRecord[] {
  return Object.values(data.notes).filter((n) => n.interval >= 0);
}