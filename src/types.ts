//← NoteRecord, PluginData, Settings interfaces

export interface NoteRecord {
  filepath: string;
  easeFactor: number;
  interval: number;
  lastReviewedOn: string;
  createdOn: string;
  reviewedCount: number;
  noteState: NoteState;
  active?: boolean;
  decks?: string[];
}

export interface CustomReactionSet {
  id: string;
  name: string;
  reactions: ReactionDefinition[];
}

export interface CramSession {
  remaining: string[]; // filepaths
  failed: string[]; // filepaths
  progressLog: ("pass" | "fail")[];
  currentRoundSize: number;
}

export interface ReactionDefinition {
  id: string; // stored in noteState frontmatter (e.g. "exciting", "my-custom")
  label: string; // shown on the button
  manualOverride?: boolean;
  intervalMult?: number; // replaces the lerp'd multiplier (e.g. 1.2 = ×1.2)
  easeDelta?: number; // replaces the lerp'd delta (e.g. +10 or -15)
  color?: string;
}

export type ReactionSetMode = "default" | "anki" | (string & {});

export interface SourceFolder {
  path: string;
  weight: number; // percentage, e.g. 100 = normal, 50 = half weight
}

export type NoteState = string;

export interface ReviewEvent {
  timestamp: string;
  notePath: string;
  reaction: NoteState;
}

export interface SrsSession {
  reviewedFilepaths: string[];
  progressLog: string[];
  sessionSize: number;
}

export interface PluginData {
  reviewLoadLog: Array<{ timestamp: string; numNotes: number; numDue: number }>;
  reviewHistory: ReviewEvent[];
  cramSessions?: Record<string, CramSession>;
  deckLastUsed?: Record<string, string>;
  srsSession?: SrsSession;
}

export interface SpacedEverythingSettings {
  sourceScope: "vault" | "folder";
  sourceFolders: SourceFolder[];
  evergreenFolder: string;
  initialInterval: number;
  defaultEaseFactor: number;
  renameFolderWithDeck: boolean;
  recentUndueThreshold: number;
  excitingThreshold: number;
  reactionSetMode: ReactionSetMode;
  customReactionSets: CustomReactionSet[];
}

export const DEFAULT_SETTINGS: SpacedEverythingSettings = {
  sourceScope: "vault",
  sourceFolders: [],
  evergreenFolder: "Evergreen",
  initialInterval: 1,
  defaultEaseFactor: 300,
  renameFolderWithDeck: true,
  recentUndueThreshold: 0.5,
  excitingThreshold: 0.7,
  reactionSetMode: "default",
  customReactionSets: [],
};

export const PRESET_DEFAULT: ReactionDefinition[] = [
  { id: "exciting", label: "Exciting" },
  { id: "interesting", label: "Interesting" },
  { id: "yeah", label: "Yeah" },
  { id: "lol", label: "Lol" },
  { id: "meh", label: "Meh" },
  { id: "cringe", label: "Cringe" },
  { id: "taxing", label: "Taxing" },
];

export const PRESET_ANKI: ReactionDefinition[] = [
  { id: "easy", label: "Easy" },
  { id: "good", label: "Good" },
  { id: "hard", label: "Hard" },
  { id: "again", label: "Again" },
];

export function getActiveReactions(settings: SpacedEverythingSettings): ReactionDefinition[] {
  if (settings.reactionSetMode === "anki") return PRESET_ANKI;
  const activeSet = settings.customReactionSets?.find((s) => s.id === settings.reactionSetMode);
  if (activeSet) return activeSet.reactions;
  return PRESET_DEFAULT;
}