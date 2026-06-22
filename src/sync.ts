import { TFile, Vault } from "obsidian";
import { PluginData, SpacedEverythingSettings } from "./types";
import { today, noteIsDue } from "./scheduler";

async function sha1(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  return end === -1 ? content : content.slice(end + 4).trimStart();
}

export async function syncVault(
  vault: Vault,
  data: PluginData,
  settings: SpacedEverythingSettings,
): Promise<PluginData> {
  const files: TFile[] = vault.getMarkdownFiles().filter((f) => {
    if (settings.sourceScope === "folder") {
      return settings.sourceFolders.some((e) => f.path.startsWith(e.path + "/"));
    }
    return true;
  });

  const currentHashes = new Set<string>();

  for (const file of files) {
    const raw = await vault.read(file);
    const body = stripFrontmatter(raw);
    const hash = await sha1(body);
    currentHashes.add(hash);

    if (data.notes[hash] && data.notes[hash].interval >= 0) {
      data.notes[hash].filepath = file.path;
    } else if (data.notes[hash]) {
      data.notes[hash] = {
        ...data.notes[hash],
        filepath: file.path,
        interval: settings.initialInterval,
        easeFactor: settings.defaultEaseFactor,
        lastReviewedOn: daysAgo(settings.initialInterval),
        reviewedCount: 0,
        noteState: "normal",
      };
    } else {
      // Check if an existing record has this filepath (body was edited — preserve SRS data)
      const existingByPath = Object.values(data.notes).find((n) => n.filepath === file.path);
      if (existingByPath) {
        data.notes[hash] = { ...existingByPath, sha1sum: hash, filepath: file.path };
        delete data.notes[existingByPath.sha1sum];
      } else {
        // Truly new note
        data.notes[hash] = {
          sha1sum: hash,
          filepath: file.path,
          easeFactor: settings.defaultEaseFactor,
          interval: settings.initialInterval,
          lastReviewedOn: daysAgo(settings.initialInterval),
          createdOn: today(),
          reviewedCount: 0,
          noteState: "normal",
        };
      }
    }

    // Sync active flag from frontmatter into store
    const activeFlag = parseFrontmatterActive(raw);
    if (activeFlag !== undefined) {
      data.notes[hash].active = activeFlag;
    }
  }

  // Soft-delete notes no longer in vault
  for (const [hash, note] of Object.entries(data.notes)) {
    if (!currentHashes.has(hash) && note.interval >= 0) {
      data.notes[hash].interval = -1;
    }
  }

  // Log review load snapshot per day
  const activeNotes = Object.values(data.notes).filter((n) => n.interval >= 0);
  const todayStr = today();
  const lastEntry = data.reviewLoadLog[data.reviewLoadLog.length - 1];

  if (lastEntry && lastEntry.timestamp.startsWith(todayStr)) {
    lastEntry.numNotes = activeNotes.length;
    lastEntry.numDue = activeNotes.filter((n) => noteIsDue(n)).length;
  } else {
    data.reviewLoadLog.push({
      timestamp: todayStr,
      numNotes: activeNotes.length,
      numDue: activeNotes.filter((n) => noteIsDue(n)).length,
    });
    if (data.reviewLoadLog.length > 2000) {
      data.reviewLoadLog = data.reviewLoadLog.slice(-2000);
    }
  }

  return data;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function parseFrontmatterActive(raw: string): boolean | undefined {
  if (!raw.startsWith("---")) return undefined;
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return undefined;
  const fm = raw.slice(3, end);
  const match = fm.match(/^active:\s*["']?(true|false)["']?\s*$/m);
  if (!match) return undefined;
  return match[1] === "true";
}
