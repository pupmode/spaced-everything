//← syncVault(): reconcile vault files ↔ store

// Port of reload_db() from spaced_inbox.py
// Reconciles vault .md files against the schedule store.

import { TFile, Vault } from "obsidian";
import { PluginData, SpacedEverythingSettings } from "./types";
import { today, noteIsDue } from "./scheduler";

// crypto import
async function sha1(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Strip YAML frontmatter before hashing so metadata changes don't reset schedule
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
        return settings.sourceFolders.some((e) => f.path.startsWith(e.path + "/"));      }
    return true;
  });

  const currentHashes = new Set<string>();

  for (const file of files) {
    const raw = await vault.read(file);
    const body = stripFrontmatter(raw);
    const hash = await sha1(body);
    currentHashes.add(hash);

    if (data.notes[hash] && data.notes[hash].interval >= 0) {
      // Existing active note — update filepath in case it moved
      data.notes[hash].filepath = file.path;
    } else if (data.notes[hash]) {
      // Was soft-deleted/archived, now back — resurrect
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
      // New note
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