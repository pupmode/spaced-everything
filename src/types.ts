//← NoteRecord, PluginData, Settings interfaces

export interface NoteRecord {
  sha1sum: string;
  filepath: string;
  easeFactor: number; // percentage, e.g. 300 = 300%
  interval: number; // days; -1 = soft-deleted/archived
  lastReviewedOn: string; // ISO date "YYYY-MM-DD"
  createdOn: string; // ISO date "YYYY-MM-DD"
  reviewedCount: number;
  noteState: NoteState;
  active?: boolean;
  decks?: string[];
}

export interface CramSession {
  remaining: string[]; // filepaths
  passed: string[]; // filepaths
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
  timestamp: string; // ISO datetime "YYYY-MM-DDTHH:mm:ss"
  noteHash: string;
  reaction: NoteState;
}

export interface PluginData {
  notes: Record<string, NoteRecord>;
  reviewLoadLog: Array<{ timestamp: string; numNotes: number; numDue: number }>;
  reviewHistory: ReviewEvent[];
  cramSessions?: Record<string, CramSession>; // keyed by deck name; "default" for the default deck
  deckLastUsed?: Record<string, string>; // keyed by deck name; ISO datetime for sorting
}
export interface SpacedEverythingSettings {
  sourceScope: "vault" | "folder";
  sourceFolders: SourceFolder[]; 
  evergreenFolder: string;
  initialInterval: number;
  defaultEaseFactor: number;
  recentUndueThreshold: number; 
  excitingThreshold: number; 
}  

export const DEFAULT_SETTINGS: SpacedEverythingSettings = {
  sourceScope: "vault",
  sourceFolders: [],
  evergreenFolder: "Evergreen",
  initialInterval: 1,
  defaultEaseFactor: 300,
  recentUndueThreshold: 0.5,
  excitingThreshold: 0.7
};