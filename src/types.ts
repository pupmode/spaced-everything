export type ReviewState = "unreviewed" | "pass" | "retry";

/**
 * One clause of the advanced filter: a note matches this group if it has
 * ALL of `include` (or `includeAll` is set, meaning "any deck at all") AND
 * NONE of `exclude`. Groups themselves are OR'd together — a note matches
 * the overall filter if it matches at least one group.
 */
export interface FilterGroup {
	includeAll: boolean; // true = ignore `include`, match any note with at least one deck
	include: string[]; // decks that must ALL be present (AND)
	exclude: string[]; // decks that must NOT be present (NOT)
}

export function emptyFilterGroup(): FilterGroup {
	return { includeAll: false, include: [], exclude: [] };
}

export function cloneFilterGroup(group: FilterGroup): FilterGroup {
	return {
		includeAll: group.includeAll,
		include: [...group.include],
		exclude: [...group.exclude],
	};
}

/**
 * Simple mode is the fast, one-tap-per-deck path: any note with any of
 * `decks` matches (plain OR). Advanced mode is the group builder, letting
 * you express AND / OR / NOT combinations.
 */
export type DeckFilter =
	| { mode: "simple"; decks: string[] }
	| { mode: "advanced"; groups: FilterGroup[] };

export function emptyDeckFilter(): DeckFilter {
	return { mode: "simple", decks: [] };
}

export interface SessionData {
	active: boolean;
	filter: DeckFilter;
	round: number;
	noteOrder: string[];
	noteStates: Record<string, ReviewState>;
	currentIndex: number;
}

/**
 * A single logged "sector": the span of time a card was actively on screen
 * during a review session, long enough (and resolved decisively enough) to
 * be worth keeping. Mirrors what gets written to a note's sectorStart /
 * sectorEnd frontmatter at the moment it's logged — frontmatter always
 * reflects the *latest* sector for that note, while this array is the full
 * history across every note and every session.
 */
export interface SectorRecord {
	notePath: string;
	noteName: string;
	deckLabel: string; // decks the note belonged to, joined for display (e.g. "Spanish, Vocab")
	start: string; // local ISO 8601 datetime, with UTC offset
	end: string; // local ISO 8601 datetime, with UTC offset
}

export interface CramPluginSettings {
	session: SessionData | null; // null when no session is saved
	sectors: SectorRecord[]; // historical log of every logged sector
	sectorsIcsPath: string; // vault-relative path of the generated .ics export
}

export const DEFAULT_SETTINGS: CramPluginSettings = {
	session: null,
	sectors: [],
	sectorsIcsPath: "Sectors.ics",
};
