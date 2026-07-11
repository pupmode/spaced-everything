import { Plugin } from "obsidian";
import { PluginData } from "./types";

const EMPTY_DATA: PluginData = { reviewLoadLog: [], reviewHistory: [] };

export async function loadStore(plugin: Plugin): Promise<PluginData> {
  const saved = await plugin.loadData();
  return saved?.pluginData ?? EMPTY_DATA;
}

// The actual write — does the read-modify-write
async function _saveStore(plugin: Plugin, data: PluginData): Promise<void> {
  const MAX_HISTORY = 10_000;
  if (data.reviewHistory.length > MAX_HISTORY) {
    // Keep only the most recent entries; don't mutate the original
    data = { ...data, reviewHistory: data.reviewHistory.slice(-MAX_HISTORY) };
  }
  const current = (await plugin.loadData()) ?? {};
  await plugin.saveData({ ...current, pluginData: data });
}

// A queue so concurrent calls never overlap
let saveQueue: Promise<void> = Promise.resolve();

export function saveStore(plugin: Plugin, data: PluginData): Promise<void> {
  saveQueue = saveQueue.then(() => _saveStore(plugin, data));
  return saveQueue;
}
