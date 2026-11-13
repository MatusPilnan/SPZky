import { describe, expect, it } from 'vitest';
import { formatReleaseNotes } from './release-notes.mjs';

const c = (subject, body = '') => ({ hash: 'abcdef1234567890', subject, body });

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
			{ repoUrl: 'https://github.com/o/r', previousTag: 'v0.1.0', tag: 'v0.2.0' }
		);
		expect(notes).toBe(
			[
				'## Features',
				'',
				'- **plates:** add SK data ([abcdef1](https://github.com/o/r/commit/abcdef1234567890))',
				'',
				'## Bug fixes',
				'',
				'- handle proxies ([abcdef1](https://github.com/o/r/commit/abcdef1234567890))',
				'',
				'## Other changes',
				'',
				'- update plan ([abcdef1](https://github.com/o/r/commit/abcdef1234567890))',
				'- not conventional at all ([abcdef1](https://github.com/o/r/commit/abcdef1234567890))',
				'',
				'**Full changelog:** https://github.com/o/r/compare/v0.1.0...v0.2.0',
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
		expect(formatReleaseNotes([c('chore(release): v0.2.1')], { tag: 'v0.2.1' })).toBe(
			'No changes since the previous release.\n'
		);
	});
});
