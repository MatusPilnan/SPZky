// Release notes and CHANGELOG.md from Conventional Commits.
//
//   node scripts/release-notes.mjs changelog
//       Prepends an entry for the version in package.json (commits since the last
//       tag) to CHANGELOG.md. Runs automatically in `npm run release` (npm "version"
//       lifecycle), so the entry is part of the release commit.
//
//   node scripts/release-notes.mjs notes <tag>
//       Prints the notes for a GitHub Release: the tag's section from CHANGELOG.md,
//       or (if missing) notes generated from the commits since the previous tag.
//       Used by .github/workflows/release.yml (needs fetch-depth: 0).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SECTIONS = [
	['breaking', '⚠️ Breaking changes'],
	['feat', 'Features'],
	['fix', 'Bug fixes'],
	['perf', 'Performance'],
	['other', 'Other changes']
];

const CONVENTIONAL = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<subject>.+)$/;

export const CHANGELOG_HEADER =
	'# Changelog\n\nAll notable changes to this project. Versions follow [Semantic Versioning](https://semver.org/);\n' +
	'entries are generated from [Conventional Commits](https://www.conventionalcommits.org/) by `npm run release`.\n';

/**
 * Notes body grouped by commit type. Section headings use the given level.
 * @param {{ hash: string, subject: string, body: string }[]} commits newest first
 * @param {{ repoUrl?: string, headingLevel?: number }} [options]
 */
export function formatSections(commits, { repoUrl, headingLevel = 2 } = {}) {
	/** @type {Record<string, string[]>} */
	const groups = Object.fromEntries(SECTIONS.map(([key]) => [key, []]));

	for (const c of commits) {
		const m = CONVENTIONAL.exec(c.subject);
		if (m?.groups?.type === 'chore' && m.groups.scope === 'release') continue;
		const shortHash = c.hash.slice(0, 7);
		const link = repoUrl ? `[${shortHash}](${repoUrl}/commit/${c.hash})` : shortHash;
		const text = m?.groups ? (m.groups.scope ? `**${m.groups.scope}:** ` : '') + m.groups.subject : c.subject;
		const line = `- ${text} (${link})`;

		const breaking = m?.groups?.bang === '!' || /^BREAKING[ -]CHANGE:/m.test(c.body);
		if (breaking) groups.breaking.push(line);
		const type = m?.groups?.type;
		groups[type === 'feat' || type === 'fix' || type === 'perf' ? type : 'other'].push(line);
	}

	const hashes = '#'.repeat(headingLevel);
	const parts = SECTIONS.filter(([key]) => groups[key].length).map(
		([key, title]) => `${hashes} ${title}\n\n${groups[key].join('\n')}`
	);
	return parts.length ? parts.join('\n\n') : 'No notable changes.';
}

/** Notes for a GitHub Release (sections at ## + compare link). */
export function formatReleaseNotes(commits, { repoUrl, previousTag, tag }) {
	let notes = formatSections(commits, { repoUrl, headingLevel: 2 });
	if (repoUrl && previousTag) notes += `\n\n**Full changelog:** ${repoUrl}/compare/${previousTag}...${tag}`;
	return notes + '\n';
}

/** One CHANGELOG.md entry: "## [x.y.z](compare) - date" with ### sections. */
export function formatChangelogEntry(commits, { version, date, repoUrl, previousTag }) {
	const tag = `v${version}`;
	const title =
		repoUrl && previousTag ? `[${version}](${repoUrl}/compare/${previousTag}...${tag})` : version;
	return `## ${title} - ${date}\n\n${formatSections(commits, { repoUrl, headingLevel: 3 })}\n`;
}

/** Inserts an entry above the newest one, creating the file header if needed. */
export function prependEntry(changelog, entry) {
	const body = changelog?.trim() ? changelog : CHANGELOG_HEADER;
	const firstEntry = body.search(/^## /m);
	if (firstEntry === -1) return `${body.trimEnd()}\n\n${entry}`;
	return `${body.slice(0, firstEntry)}${entry}\n${body.slice(firstEntry)}`;
}

/** The section for a version (without its "## …" heading), or null. */
export function extractEntry(changelog, version) {
	const lines = changelog.split('\n');
	const escaped = version.replace(/\./g, '\\.');
	const start = lines.findIndex((l) => new RegExp(`^## \\[?${escaped}\\]?[ (]`).test(l));
	if (start === -1) return null;
	let end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
	if (end === -1) end = lines.length;
	return lines
		.slice(start + 1, end)
		.join('\n')
		.trim()
		.replace(/^### /gm, '## ');
}

// ---------------------------------------------------------------------------- git

function git(...args) {
	return execFileSync('git', args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function previousTagOf(ref) {
	try {
		// stderr is captured (not printed): "no names found" is expected before the first tag.
		return git('describe', '--tags', '--abbrev=0', '--match', 'v*', ref);
	} catch {
		return null; // no earlier release
	}
}

function readCommits(range) {
	const SEP = '\x1e';
	const FIELD = '\x1f';
	return git('log', `--format=%H${FIELD}%s${FIELD}%b${SEP}`, range)
		.split(SEP)
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const [hash, subject, body = ''] = entry.split(FIELD);
			return { hash, subject, body };
		});
}

function repoUrl() {
	if (process.env.GITHUB_REPOSITORY)
		return `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${process.env.GITHUB_REPOSITORY}`;
	try {
		const url = git('config', '--get', 'remote.origin.url');
		const m = /github\.com[/:](.+?)(?:\.git)?$/.exec(url);
		return m ? `https://github.com/${m[1]}` : undefined;
	} catch {
		return undefined;
	}
}

// ---------------------------------------------------------------------------- CLI

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const [command, arg] = process.argv.slice(2);
	const url = repoUrl();

	if (command === 'changelog') {
		const version = JSON.parse(readFileSync('package.json', 'utf-8')).version;
		const previousTag = previousTagOf('HEAD');
		if (previousTag === `v${version}`) {
			console.error(`v${version} is already tagged; bump the version first.`);
			process.exit(1);
		}
		const commits = readCommits(previousTag ? `${previousTag}..HEAD` : 'HEAD');
		const date = new Date().toISOString().slice(0, 10);
		const entry = formatChangelogEntry(commits, { version, date, repoUrl: url, previousTag });
		const existing = existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf-8') : '';
		writeFileSync('CHANGELOG.md', prependEntry(existing, entry));
		console.error(`CHANGELOG.md: added ${version} (${commits.length} commits since ${previousTag ?? 'the start'})`);
	} else if (command === 'notes' && arg) {
		const version = arg.replace(/^v/, '');
		const changelog = existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf-8') : '';
		const previousTag = previousTagOf(`${arg}^`);
		const fromChangelog = extractEntry(changelog, version);
		if (fromChangelog) {
			const compare = url && previousTag ? `\n\n**Full changelog:** ${url}/compare/${previousTag}...${arg}` : '';
			process.stdout.write(`${fromChangelog}${compare}\n`);
		} else {
			const commits = readCommits(previousTag ? `${previousTag}..${arg}` : arg);
			process.stdout.write(formatReleaseNotes(commits, { repoUrl: url, previousTag, tag: arg }));
		}
	} else {
		console.error('usage: node scripts/release-notes.mjs changelog | notes <tag>');
		process.exit(1);
	}
}
