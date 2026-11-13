import { describe, expect, it } from 'vitest';
import {
	CHANGELOG_HEADER,
	extractEntry,
	formatChangelogEntry,
	formatReleaseNotes,
	prependEntry
} from './release-notes.mjs';

const c = (subject, body = '') => ({ hash: 'abcdef1234567890', subject, body });
const URL = 'https://github.com/o/r';
const link = `([abcdef1](${URL}/commit/abcdef1234567890))`;

describe('formatReleaseNotes', () => {
	it('groups conventional commits by type and links them', () => {
		const notes = formatReleaseNotes(
			[
				c('feat(plates): add SK data'),
				c('fix: handle proxies'),
				c('docs: update plan'),
				c('chore(release): v0.2.0'),
				c('not conventional at all')
			],
			{ repoUrl: URL, previousTag: 'v0.1.0', tag: 'v0.2.0' }
		);
		expect(notes).toBe(
			[
				'## Features',
				'',
				`- **plates:** add SK data ${link}`,
				'',
				'## Bug fixes',
				'',
				`- handle proxies ${link}`,
				'',
				'## Other changes',
				'',
				`- update plan ${link}`,
				`- not conventional at all ${link}`,
				'',
				`**Full changelog:** ${URL}/compare/v0.1.0...v0.2.0`,
				''
			].join('\n')
		);
	});

	it('lists breaking changes separately (bang or footer)', () => {
		const notes = formatReleaseNotes([c('feat!: new storage'), c('fix: x', 'BREAKING CHANGE: data reset')], {
			tag: 'v1.0.0'
		});
		expect(notes).toContain('## ⚠️ Breaking changes\n\n- new storage (abcdef1)\n- x (abcdef1)');
		expect(notes).toContain('## Features\n\n- new storage (abcdef1)');
		expect(notes).not.toContain('Full changelog');
	});

	it('handles releases without changes', () => {
		expect(formatReleaseNotes([c('chore(release): v0.2.1')], { tag: 'v0.2.1' })).toBe('No notable changes.\n');
	});
});

describe('CHANGELOG.md', () => {
	const entry = (version, prev) =>
		formatChangelogEntry([c('feat: thing')], { version, date: '2026-11-13', repoUrl: URL, previousTag: prev });

	it('formats an entry with compare link and ### sections', () => {
		expect(entry('0.2.0', 'v0.1.0')).toBe(
			`## [0.2.0](${URL}/compare/v0.1.0...v0.2.0) - 2026-11-13\n\n### Features\n\n- thing ${link}\n`
		);
		expect(entry('0.1.0', null)).toMatch(/^## 0\.1\.0 - 2026-11-13\n/);
	});

	it('creates the file and prepends newer entries above older ones', () => {
		const first = prependEntry('', entry('0.1.0', null));
		expect(first.startsWith(CHANGELOG_HEADER)).toBe(true);
		const second = prependEntry(first, entry('0.2.0', 'v0.1.0'));
		expect(second.indexOf('## [0.2.0]')).toBeLessThan(second.indexOf('## 0.1.0'));
		expect(second.startsWith(CHANGELOG_HEADER)).toBe(true);
	});

	it('extracts a version section for the GitHub Release', () => {
		const log = prependEntry(prependEntry('', entry('0.1.0', null)), entry('0.2.0', 'v0.1.0'));
		expect(extractEntry(log, '0.2.0')).toBe(`## Features\n\n- thing ${link}`);
		expect(extractEntry(log, '0.1.0')).toBe(`## Features\n\n- thing ${link}`);
		expect(extractEntry(log, '9.9.9')).toBeNull();
		expect(extractEntry(log, '0.1')).toBeNull();
	});
});
