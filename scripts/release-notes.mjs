// Generates release notes (Markdown) from the Conventional Commits between the
// previous tag and the given tag.
//
//   node scripts/release-notes.mjs v0.2.0 > notes.md
//
// Used by .github/workflows/release.yml. Needs the full git history (fetch-depth: 0).
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SECTIONS = [
	['breaking', '⚠️ Breaking changes'],
	['feat', 'Features'],
	['fix', 'Bug fixes'],
	['perf', 'Performance'],
	['other', 'Other changes']
];

const CONVENTIONAL = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<subject>.+)$/;

/**
 * @param {{ hash: string, subject: string, body: string }[]} commits newest first
 * @param {{ repoUrl?: string, previousTag?: string | null, tag: string }} options
 */
export function formatReleaseNotes(commits, { repoUrl, previousTag, tag }) {
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

	const parts = [];
	for (const [key, title] of SECTIONS) {
		if (groups[key].length) parts.push(`## ${title}\n\n${groups[key].join('\n')}`);
	}
	if (!parts.length) parts.push('No changes since the previous release.');
	if (repoUrl && previousTag) parts.push(`**Full changelog:** ${repoUrl}/compare/${previousTag}...${tag}`);
	return parts.join('\n\n') + '\n';
}

function git(...args) {
	return execFileSync('git', args, { encoding: 'utf-8' }).trim();
}

function previousTagOf(tag) {
	try {
		return git('describe', '--tags', '--abbrev=0', '--match', 'v*', `${tag}^`);
	} catch {
		return null; // first release
	}
}

function readCommits(range) {
	const SEP = '\x1e';
	const FIELD = '\x1f';
	const raw = git('log', `--format=%H${FIELD}%s${FIELD}%b${SEP}`, range);
	return raw
		.split(SEP)
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const [hash, subject, body = ''] = entry.split(FIELD);
			return { hash, subject, body };
		});
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	const tag = process.argv[2];
	if (!tag) {
		console.error('usage: node scripts/release-notes.mjs <tag>');
		process.exit(1);
	}
	const previousTag = previousTagOf(tag);
	const commits = readCommits(previousTag ? `${previousTag}..${tag}` : tag);
	const repoUrl = process.env.GITHUB_REPOSITORY
		? `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${process.env.GITHUB_REPOSITORY}`
		: undefined;
	process.stdout.write(formatReleaseNotes(commits, { repoUrl, previousTag, tag }));
}
