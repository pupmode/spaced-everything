import { App, normalizePath, TFile, TFolder } from "obsidian";
import type CramPlugin from "./main";
import { DeckFilter, SectorRecord, SessionData } from "./types";

/* ==========================================================================
   Session persistence (data.json, via Obsidian's own loadData/saveData)
   ========================================================================== */

export async function saveSession(
	plugin: CramPlugin,
	session: SessionData | null,
): Promise<void> {
	plugin.settings.session = session;
	await plugin.saveData(plugin.settings);
}

export function loadSession(plugin: CramPlugin): SessionData | null {
	const session = plugin.settings.session;
	if (!session) return null;

	if (!("filter" in session)) {
		const legacy = session as unknown as { sources?: string[] };
		(session as SessionData).filter = {
			mode: "simple",
			decks: legacy.sources ?? [],
		};
	}

	if (!("currentSectorPath" in session)) {
		(session as SessionData).currentSectorPath = null;
	}
	if (!("currentSectorStart" in session)) {
		(session as SessionData).currentSectorStart = null;
	}

	return session;
}

/* ==========================================================================
   Reading decks from frontmatter
   ========================================================================== */

/** The deck names (from frontmatter) that a single note belongs to. */
export function getDecksForFile(app: App, file: TFile): string[] {
	const cache = app.metadataCache.getFileCache(file);
	const deck = cache?.frontmatter?.deck;
	if (Array.isArray(deck)) return deck.map(String);
	if (typeof deck === "string") return [deck];
	return [];
}

/** Returns every deck name currently referenced by any note's frontmatter. */
export function getAllDecks(app: App): string[] {
	const decks = new Set<string>();

	for (const file of app.vault.getMarkdownFiles()) {
		getDecksForFile(app, file).forEach((d) => decks.add(d));
	}

	return Array.from(decks).sort();
}

/** How many notes currently reference each deck name. Used for the small count badge in deck lists. */
export function getDeckNoteCounts(app: App): Record<string, number> {
	const counts: Record<string, number> = {};

	for (const file of app.vault.getMarkdownFiles()) {
		getDecksForFile(app, file).forEach((d) => {
			counts[d] = (counts[d] ?? 0) + 1;
		});
	}

	return counts;
}

/** Returns the actual files (not just paths) belonging to a single deck, sorted by title. */
export function getFilesForDeck(app: App, deckName: string): TFile[] {
	const files: TFile[] = [];
	for (const file of app.vault.getMarkdownFiles()) {
		if (getDecksForFile(app, file).includes(deckName)) files.push(file);
	}
	return files.sort((a, b) => a.basename.localeCompare(b.basename));
}

/* ==========================================================================
   Filter matching (simple deck lists + advanced OR-of-AND/NOT groups)
   ========================================================================== */

/**
 * Whether a note's deck list matches a filter. Shared by pool computation
 * (below) and by the "does this brand new note belong here" check when a
 * note is created mid-session.
 */
export function matchesFilter(noteDecks: string[], filter: DeckFilter): boolean {
	if (filter.mode === "simple") {
		return filter.decks.some((d) => noteDecks.includes(d));
	}

	return filter.groups.some((group) => {
		const includeOk =
			group.includeAll ||
			(group.include.length > 0 &&
				group.include.every((d) => noteDecks.includes(d)));
		const excludeOk = group.exclude.every((d) => !noteDecks.includes(d));
		return includeOk && excludeOk;
	});
}

/** Returns file paths of every note that matches the given filter. */
export function getNotesForFilter(app: App, filter: DeckFilter): string[] {
	const paths: string[] = [];

	for (const file of app.vault.getMarkdownFiles()) {
		if (matchesFilter(getDecksForFile(app, file), filter)) {
			paths.push(file.path);
		}
	}

	return paths;
}

/** Whether a filter currently selects anything at all (used to enable/disable Start/Confirm buttons). */
export function filterHasSelection(filter: DeckFilter): boolean {
	if (filter.mode === "simple") return filter.decks.length > 0;
	return filter.groups.some((g) => g.includeAll || g.include.length > 0);
}

/**
 * A reasonable set of decks to pre-fill when creating a new note from within
 * a filtered session: every deck explicitly required by some group (an
 * "includeAll" group has no specific deck to suggest, so it contributes
 * nothing here).
 */
export function suggestedDecksForFilter(filter: DeckFilter): string[] {
	if (filter.mode === "simple") return [...filter.decks];
	const decks = new Set<string>();
	filter.groups.forEach((g) => g.include.forEach((d) => decks.add(d)));
	return Array.from(decks);
}

/* ==========================================================================
   Writing: frontmatter, file creation/rename, and body edits
   ========================================================================== */

/** Strips characters that aren't safe in an Obsidian note filename. */
export function sanitizeNoteName(rawName: string): string {
	return rawName.replace(/[\\/:*?"<>|#^[\]]/g, "").trim();
}

/** Builds a normalized vault path for `name.md` inside `folder` (root-safe). */
function buildNotePath(folder: TFolder, name: string): string {
	const folderPath = folder.isRoot() ? "" : folder.path + "/";
	return normalizePath(`${folderPath}${name}.md`);
}

/** The raw file offset where a note's frontmatter block ends, if it has one. */
function getFrontmatterEndOffset(app: App, file: TFile): number | undefined {
	return app.metadataCache.getFileCache(file)?.frontmatterPosition?.end.offset;
}

/** Overwrites the deck list in a note's frontmatter (used by the deck picker). */
export async function setNoteDecks(
	app: App,
	file: TFile,
	decks: string[],
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (fm) => {
		if (decks.length === 0) {
			delete fm.deck;
		} else {
			fm.deck = decks;
		}
	});
}

/** Removes a single deck from a note's frontmatter, leaving its other decks untouched. */
export async function unassignDeck(
	app: App,
	file: TFile,
	deckName: string,
): Promise<void> {
	const remaining = getDecksForFile(app, file).filter((d) => d !== deckName);
	await setNoteDecks(app, file, remaining);
}

/** A note's body, with the frontmatter block stripped off. */
export async function getNoteBody(app: App, file: TFile): Promise<string> {
	const raw = await app.vault.cachedRead(file);
	const fmEnd = getFrontmatterEndOffset(app, file);
	return fmEnd ? raw.slice(fmEnd).trim() : raw.trim();
}

/** Rewrites a note's body while leaving its frontmatter untouched. */
export async function setNoteBody(
	app: App,
	file: TFile,
	newBody: string,
): Promise<void> {
	const raw = await app.vault.read(file);
	const fmEnd = getFrontmatterEndOffset(app, file);
	const frontmatterBlock = fmEnd ? raw.slice(0, fmEnd).trimEnd() : "";
	const newContent = frontmatterBlock
		? `${frontmatterBlock}\n\n${newBody.trim()}`
		: newBody.trim();
	await app.vault.modify(file, newContent);
}

/**
 * Renames a note (keeping it in the same folder), using Obsidian's own
 * rename so links elsewhere in the vault stay intact. No-ops if the
 * sanitized name matches the file's current name.
 */
export async function renameNote(
	app: App,
	file: TFile,
	rawNewName: string,
): Promise<{ ok: boolean; reason?: "exists" }> {
	const newName = sanitizeNoteName(rawNewName);
	if (!file.parent) return { ok: false };

	const newPath = buildNotePath(file.parent, newName);
	if (newPath === file.path) return { ok: true };
	if (app.vault.getAbstractFileByPath(newPath)) {
		return { ok: false, reason: "exists" };
	}

	await app.fileManager.renameFile(file, newPath);
	return { ok: true };
}

/**
 * Creates a new markdown note with the given content and deck frontmatter,
 * saved into the folder Obsidian would normally use for a new note created
 * from `sourcePath` (respecting the user's "default location for new notes"
 * setting). Returns the created file, or null if the name was empty or a
 * note already exists at the target path.
 */
export async function createNote(
	app: App,
	sourcePath: string,
	rawName: string,
	content: string,
	decks: string[],
): Promise<{ file: TFile | null; reason?: "empty-name" | "exists" }> {
	const name = sanitizeNoteName(rawName);
	if (!name) return { file: null, reason: "empty-name" };

	const path = buildNotePath(app.fileManager.getNewFileParent(sourcePath), name);
	if (app.vault.getAbstractFileByPath(path)) {
		return { file: null, reason: "exists" };
	}

	const file = await app.vault.create(path, content);

	if (decks.length > 0) {
		await setNoteDecks(app, file, decks);
	}

	return { file };
}

/** User-facing message for a failed create/rename, shared by the new note modal and the deck editor. */
export function describeNoteWriteError(
	reason: "empty-name" | "exists" | undefined,
): string {
	switch (reason) {
		case "exists":
			return "A note with that name already exists there.";
		case "empty-name":
			return "Please enter a name for the note.";
		default:
			return "Something went wrong saving this note.";
	}
}

/* ==========================================================================
   Sector tracking: frontmatter, historical log, and .ics export
   ========================================================================== */

/**
 * ISO 8601 datetime with the *local* UTC offset (e.g. "2026-08-31T14:30:00-07:00"),
 * unlike Date.prototype.toISOString() which always converts to UTC. Sectors are
 * wall-clock spans a person actually experienced, so the local offset is worth
 * keeping in the frontmatter/log — the underlying instant is unambiguous either
 * way, and a start/end pair spanning midnight (or a DST change) needs no special
 * handling since both are full date-times, not bare times.
 */
export function toLocalIsoString(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");

	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1);
	const day = pad(date.getDate());
	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());
	const seconds = pad(date.getSeconds());

	// getTimezoneOffset() is UTC minus local, in minutes; we want local minus UTC.
	const offsetMinutes = -date.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? "+" : "-";
	const absOffset = Math.abs(offsetMinutes);
	const offsetHours = pad(Math.floor(absOffset / 60));
	const offsetMins = pad(absOffset % 60);

	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMins}`;
}

/** ICS wants UTC, formatted as YYYYMMDDTHHMMSSZ — this is just a display conversion, not a second source of truth. */
function formatIcsUtc(date: Date): string {
	return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function icsEscape(text: string): string {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\n/g, "\\n");
}

/** RFC 5545 line folding: continuation lines are a CRLF followed by a single leading space. */
function foldIcsLine(line: string): string {
	const LIMIT = 75;
	if (line.length <= LIMIT) return line;

	let result = line.slice(0, LIMIT);
	let rest = line.slice(LIMIT);
	while (rest.length > 0) {
		result += "\r\n " + rest.slice(0, LIMIT - 1);
		rest = rest.slice(LIMIT - 1);
	}
	return result;
}

const MERGE_GAP_MS = 15 * 60 * 1000; // 15 minutes

function sectorIdentityKey(sector: SectorRecord): string {
	return `${sector.deckLabel}\u0000${sector.noteName}`;
}

/**
 * Groups chronologically consecutive SectorRecords that share the same
 * deckLabel+noteName identity and are separated by at most MERGE_GAP_MS,
 * with nothing else falling strictly between them. Used only for the .ics
 * export — the underlying sectors log and note frontmatter are untouched.
 */
export function mergeAdjacentSectors(
	sectors: SectorRecord[],
): SectorRecord[][] {
	const sorted = [...sectors].sort(
		(a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
	);

	const groups: SectorRecord[][] = [];

	for (const sector of sorted) {
		const lastGroup = groups[groups.length - 1];
		const prev = lastGroup ? lastGroup[lastGroup.length - 1]! : null;

		if (
			prev &&
			sectorIdentityKey(prev) === sectorIdentityKey(sector) &&
			new Date(sector.start).getTime() - new Date(prev.end).getTime() <=
				MERGE_GAP_MS
		) {
			lastGroup!.push(sector);
		} else {
			groups.push([sector]);
		}
	}

	return groups;
}

/** Builds the full contents of the sectors .ics file from every logged sector. Regenerated from scratch each time, so it's always a straight reflection of the log. */
export function buildIcsContent(sectors: SectorRecord[]): string {
	const lines: string[] = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Cram Plugin//Sectors//EN",
		"CALSCALE:GREGORIAN",
	];

	const groups = mergeAdjacentSectors(sectors);

	groups.forEach((group) => {
		const first = group[0]!;
		const last = group[group.length - 1]!;
		const start = new Date(first.start);
		const end = new Date(last.end);
		const uid =
			`${first.notePath}-${first.start}`.replace(/[^a-zA-Z0-9]/g, "") +
			"@cram-plugin";

		lines.push("BEGIN:VEVENT");
		lines.push(foldIcsLine(`UID:${uid}`));
		lines.push(foldIcsLine(`DTSTAMP:${formatIcsUtc(end)}`));
		lines.push(foldIcsLine(`DTSTART:${formatIcsUtc(start)}`));
		lines.push(foldIcsLine(`DTEND:${formatIcsUtc(end)}`));
		lines.push(
			foldIcsLine(
				`SUMMARY:${icsEscape(`${first.deckLabel} - ${first.noteName}`)}`,
			),
		);
		lines.push("END:VEVENT");
	});

	lines.push("END:VCALENDAR");
	return lines.join("\r\n") + "\r\n";
}

/** Writes (creating or overwriting) a vault file at `path`, making parent folders as needed. */
export async function writeIcsFile(
	app: App,
	path: string,
	content: string,
): Promise<void> {
	const normalized = normalizePath(path);
	const lastSlash = normalized.lastIndexOf("/");
	const folderPath = lastSlash > -1 ? normalized.slice(0, lastSlash) : "";

	if (folderPath && !app.vault.getAbstractFileByPath(folderPath)) {
		await app.vault.createFolder(folderPath).catch(() => {
			// May already exist from a concurrent write; safe to ignore.
		});
	}

	const existing = app.vault.getAbstractFileByPath(normalized);
	if (existing instanceof TFile) {
		await app.vault.modify(existing, content);
	} else {
		await app.vault.create(normalized, content);
	}
}

/**
 * Finalizes a logged sector: writes sectorStart/sectorEnd to the note's own
 * frontmatter (always the *latest* logged sector for that note — earlier
 * ones only live on in the historical log), appends it to the historical
 * log, and regenerates the .ics export from the full log.
 */
export async function recordSector(
	app: App,
	plugin: CramPlugin,
	file: TFile,
	startMs: number,
	endMs: number,
): Promise<void> {
	const start = toLocalIsoString(new Date(startMs));
	const end = toLocalIsoString(new Date(endMs));

	await app.fileManager.processFrontMatter(file, (fm) => {
		fm.sectorStart = start;
		fm.sectorEnd = end;
	});

	const decks = getDecksForFile(app, file);

	const record: SectorRecord = {
		notePath: file.path,
		noteName: file.basename,
		deckLabel: decks.length > 0 ? decks.join(", ") : "No deck",
		start,
		end,
	};

	plugin.settings.sectors.push(record);
	await plugin.saveSettings();

	try {
		const icsContent = buildIcsContent(plugin.settings.sectors);
		await writeIcsFile(app, plugin.settings.sectorsIcsPath, icsContent);
	} catch (e) {
		console.error("Cram: failed to write sectors .ics file", e);
	}
}
