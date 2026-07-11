import { NoteRecord, ReactionDefinition, SpacedEverythingSettings, getActiveReactions } from "./types";
import { today } from "./utils";

const MAX_INTERVAL = 365; // days — prevents notes from disappearing for years
const MAX_EASE = 500; // percentage — prevents runaway acceleration

function folderWeight(filepath: string, settings: SpacedEverythingSettings): number {
  if (settings.sourceScope !== "folder") return 1;
  const entry = settings.sourceFolders.find((e) => filepath.startsWith(e.path + "/"));
  return entry ? entry.weight / 100 : 1;
}

export function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function numDaysOverdue(note: NoteRecord): number {
  if (note.interval < 0) return note.interval;
  const daysSinceReviewed = daysBetween(note.lastReviewedOn, today());
  return daysSinceReviewed - note.interval;
}

export function noteIsDue(note: NoteRecord): boolean {
  return numDaysOverdue(note) >= 0;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function reactionT(id: string, reactions: ReactionDefinition[]): number {
  const idx = reactions.findIndex((r) => r.id === id);
  if (idx === -1) return 0.5; // unknown reaction → neutral
  return reactions.length === 1 ? 0.5 : idx / (reactions.length - 1);
}

export function nextInterval(note: NoteRecord, reaction: string, reactions: ReactionDefinition[]): number {
  const { interval, easeFactor } = note;
  if (reaction === "skip") return interval;
  if (reaction === "revisit") {
    return Math.max(1, Math.floor(interval * 0.9)); // no easeFactor — matches again_interval()
  }
  const t = reactionT(reaction, reactions);
  const m = lerp(0.83, 1.5, t);
  return Math.min(MAX_INTERVAL, Math.max(1, Math.floor((interval * easeFactor * m) / 100)));
}

export function nextEaseFactor(note: NoteRecord, reaction: string, reactions: ReactionDefinition[]): number {
  if (reaction === "skip" || reaction === "revisit") return note.easeFactor;
  const t = reactionT(reaction, reactions);
  const delta = Math.round(lerp(20, -20, t));
  return Math.min(MAX_EASE, Math.max(130, note.easeFactor + delta));
}

export function getDueNotes(notes: NoteRecord[]): NoteRecord[] {
  return notes.filter(noteIsDue);
}

// Weighted random selection — port of get_exciting_note / get_all_other_note
export function weightedRandom<T>(candidates: T[], weights: number[]): T | null {
  if (!candidates.length) return null;
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

// Port of pick_note_to_review()
export function pickNoteToReview(notes: NoteRecord[], settings: SpacedEverythingSettings): NoteRecord | null {
  const rand = Math.random();

  // 50% chance: recently-created unreviewed note
  if (rand < settings.recentUndueThreshold) {
    const recentUnreviewed = notes.filter((n) => {
      const age = daysBetween(n.createdOn, today());
      return n.interval >= 0 && n.noteState === "normal" && age >= 50 && age <= 100 && n.reviewedCount === 0;
    });
    if (recentUnreviewed.length) {
      return recentUnreviewed[Math.floor(Math.random() * recentUnreviewed.length)];
    }
  }

  // Always prioritize "revisit" notes (user explicitly flagged to see soon)
  const revisitDue = notes.filter((n) => noteIsDue(n) && n.noteState === "revisit");
  if (revisitDue.length) {
    const weights = revisitDue.map(
      (n) => Math.pow(Math.max(1, numDaysOverdue(n)), 2) * folderWeight(n.filepath, settings),
    );
    const picked = weightedRandom(revisitDue, weights);
    if (picked) return picked;
  }

  const reactions = getActiveReactions(settings);

  // 20% chance: exciting note (weighted by overdue²)
  if (rand < settings.excitingThreshold) {
    const exciting = notes.filter((n) => noteIsDue(n) && n.noteState === "exciting");
    const weights = exciting.map(
      (n) => Math.pow(Math.max(1, numDaysOverdue(n)), 2) * folderWeight(n.filepath, settings),
    );
    const picked = weightedRandom(exciting, weights);
    if (picked) return picked;
  }

  // Fallback: any due note, weighted by overdue² × folder quota
  const allDue = notes.filter((n) => noteIsDue(n));
  const weights = allDue.map((n) => {
    let sw: number;
    if (n.noteState === "normal" || n.noteState === "revisit") {
      sw = 1.0;
    } else {
      const t = reactionT(n.noteState, reactions);
      sw = lerp(1.5, 0.3, t);
    }
    return Math.pow(Math.max(1, numDaysOverdue(n)), 2) * folderWeight(n.filepath, settings) * sw;
  });
  return weightedRandom(allDue, weights);
}
