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

export interface CramSession {
  remaining: string[]; // filepaths
  failed: string[]; // filepaths
  progressLog: ("pass" | "fail")[];
  currentRoundSize: number;
}

export interface SourceFolder {
  path: string;
  weight: number; // percentage, e.g. 100 = normal, 50 = half weight
}  

export type NoteState =  
  | "normal"       // interval * easeFactor * 1.0  / 100 — no reaction, default  
  | "exciting"     // interval * easeFactor * 0.83 / 100 — see more often; gets priority in selection  
  | "interesting"  // interval * easeFactor * 0.92 / 100 — slightly more often  
  | "yeah"         // interval * easeFactor * 1.0  / 100 — neutral agreement  
  | "lol"          // interval * easeFactor * 1.05 / 100 — slightly less often  
  | "meh"          // interval * easeFactor * 1.2  / 100 — less often  
  | "cringe"       // interval * easeFactor * 1.35 / 100 — less often  
  | "taxing"       // interval * easeFactor * 1.5  / 100 — see less often  
  | "revisit";     // interval * 0.9 (no easeFactor)     — see soon; matches again_interval()

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
};