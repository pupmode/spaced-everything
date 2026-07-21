//← NoteRecord, PluginData, Settings interfaces

export interface BaseNote {
  filepath: string;
  active?: boolean;
}  

export interface NoteRecord extends BaseNote {
  easeFactor: number;
  interval: number;
  lastReviewedOn: string;
  createdOn: string;
  reviewedCount: number;
  noteState: NoteState;
  decks?: string[];
}  

export type EnergyColor = "🔥" | "🪔" | "🌊" | "🌿";  
export type DayName = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export interface ActionNote extends BaseNote {
  energy?: EnergyColor | EnergyColor[];
  timeblock?: string | string[];
  due?: string;
  context?: string | string[];
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

export interface SystemSession {
  remaining: string[];
  failed: string[];
  progressLog: ("pass" | "fail")[];
  currentRoundSize: number;
  energyLevel: "high" | "low";
  activeTimeblocks: string[];
  activeContexts: string[];
}

export interface ReactionDefinition {
  id: string; // stored in noteState frontmatter (e.g. "exciting", "my-custom")
  label: string; // shown on the button
  manualOverride?: boolean;
  intervalMult?: number; // direct multiplier: <1 shrinks (e.g. 0.5 = halve), >1 grows (e.g. 3.0 = triple)
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

export interface SrsRecord {
  easeFactor: number;
  interval: number;
  lastReviewedOn: string;
  createdOn: string;
  reviewedCount: number;
  noteState: NoteState;
}

export interface PluginData {
  reviewLoadLog: Array<{ timestamp: string; numNotes: number; numDue: number }>;
  reviewHistory: ReviewEvent[];
  cramSessions?: Record<string, CramSession>;
  deckLastUsed?: Record<string, string>;
  srsSession?: SrsSession;
  systemSession?: SystemSession;
  systemLeechCounts?: Record<string, number>;
  noteRecords: Record<string, SrsRecord>;
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
  weekendDays: DayName[];
  customReactionSets: CustomReactionSet[];
  noteStateValues: string[];
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
  weekendDays: ["Sat", "Sun"],
  noteStateValues: ["🌱", "🌿", "🌲"],
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