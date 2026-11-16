// "What's new" for the update dialog. The build turns CHANGELOG.md into changelog.json
// (vite.config.ts); the dialog runs in the *old* app version, so it fetches that file from
// the network to learn what the new version brings. Plain functions, no DOM: also used by
// vite.config.ts at build time.

export interface ChangelogEntry {
	version: string;
	/** YYYY-MM-DD, or "" when the heading has none. */
	date: string;
	/** User-facing lines: features, fixes, performance (scope and commit link removed). */
	items: string[];
}

/** Sections shown to users. "Other changes" (docs, chores) and the duplicated breaking list are left out. */
const SHOWN = new Set(['Features', 'Bug fixes', 'Performance']);

/** Parses the CHANGELOG.md written by scripts/release-notes.mjs, newest version first. */
export function parseChangelog(md: string): ChangelogEntry[] {
	const entries: ChangelogEntry[] = [];
	let entry: ChangelogEntry | null = null;
	let shown = false;
	for (const line of md.split(/\r?\n/)) {
		const version = /^## \[?([^\]\s(]+)\]?(?:\([^)]*\))?(?:\s+-\s+(\S+))?/.exec(line);
		if (version) {
			entry = { version: version[1].replace(/^v/, ''), date: version[2] ?? '', items: [] };
			entries.push(entry);
			shown = false;
			continue;
		}
		const section = /^### (.+)$/.exec(line);
		if (section) {
			shown = SHOWN.has(section[1].trim());
			continue;
		}
		if (entry && shown && line.startsWith('- ')) {
			const text = line
				.slice(2)
				.replace(/^\*\*[^*]+:\*\*\s*/, '')
				.replace(/\s*\((?:\[[0-9a-f]{7,}\]\([^)]*\)|[0-9a-f]{7,})\)$/, '')
				.trim();
			if (text) entry.items.push(text.charAt(0).toUpperCase() + text.slice(1));
		}
	}
	return entries;
}

/**
 * Entries newer than the running version: those listed above it (the file is newest first).
 * Unknown running version (a dev build): nothing, rather than the whole history.
 */
export function newerThan(entries: ChangelogEntry[], current: string): ChangelogEntry[] {
	const i = entries.findIndex((e) => e.version === current);
	return i < 0 ? [] : entries.slice(0, i).filter((e) => e.items.length > 0);
}

/** Fetches the deployed changelog.json (never from the offline cache). [] on any failure. */
export async function fetchChangelog(url: string, fetcher: typeof fetch = fetch): Promise<ChangelogEntry[]> {
	try {
		const res = await fetcher(url, { cache: 'no-store' });
		if (!res.ok) return [];
		const data: unknown = await res.json();
		return Array.isArray(data) ? (data as ChangelogEntry[]).filter((e) => typeof e?.version === 'string' && Array.isArray(e.items)) : [];
	} catch {
		return [];
	}
}
