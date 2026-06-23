import { Plugin } from "obsidian";
import { PluginData } from "./types";

const EMPTY_DATA: PluginData = { reviewLoadLog: [], reviewHistory: [] };

export async function loadStore(plugin: Plugin): Promise<PluginData> {
  const saved = await plugin.loadData();
  return saved?.pluginData ?? EMPTY_DATA;
}

export async function saveStore(plugin: Plugin, data: PluginData): Promise<void> {
  const current = (await plugin.loadData()) ?? {};
  await plugin.saveData({ ...current, pluginData: data });
}
