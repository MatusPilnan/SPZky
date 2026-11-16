import { describe, expect, it } from 'vitest';
import { fetchChangelog, newerThan, parseChangelog } from './changelog';

const MD = `# Changelog

Intro text.

## [0.10.0](https://github.com/x/y/compare/v0.9.0...v0.10.0) - 2026-11-16

### Features

- **ch:** Switzerland with 26 canton codes ([4d53390](https://github.com/x/y/commit/4d5339084982baf81d1da454761bedb7e5b6ace7))
- address on the edit page (abc1234)

### Other changes

- repair characters in the plan ([044d9ac](https://github.com/x/y/commit/044d9ac))

## [0.9.1](https://github.com/x/y/compare/v0.9.0...v0.9.1) - 2026-11-15

### Other changes

- docs only ([1111111](https://github.com/x/y/commit/1111111))

## [0.9.0](https://github.com/x/y/compare/v0.8.0...v0.9.0) - 2026-11-14

### ⚠️ Breaking changes

- **db:** new format ([2222222](https://github.com/x/y/commit/2222222))

### Bug fixes

- **db:** new format ([2222222](https://github.com/x/y/commit/2222222))
`;

describe('parseChangelog', () => {
	it('reads versions, dates and user-facing lines without scope and commit links', () => {
		const entries = parseChangelog(MD);
		expect(entries.map((e) => [e.version, e.date])).toEqual([
			['0.10.0', '2026-11-16'],
			['0.9.1', '2026-11-15'],
			['0.9.0', '2026-11-14']
		]);
		expect(entries[0].items).toEqual(['Switzerland with 26 canton codes', 'Address on the edit page']);
		expect(entries[1].items).toEqual([]); // only "Other changes"
		expect(entries[2].items).toEqual(['New format']); // breaking list not duplicated
	});
});

describe('newerThan', () => {
	const entries = parseChangelog(MD);
	it('lists versions above the running one, skipping those without user-facing lines', () => {
		expect(newerThan(entries, '0.9.0').map((e) => e.version)).toEqual(['0.10.0']);
		expect(newerThan(entries, '0.10.0')).toEqual([]);
	});
	it('shows nothing for an unknown running version', () => {
		expect(newerThan(entries, '0.0.0-dev')).toEqual([]);
	});
});

describe('fetchChangelog', () => {
	it('bypasses caches and returns [] on errors or bad data', async () => {
		let init: RequestInit | undefined;
		const ok = (async (_: string, i?: RequestInit) => {
			init = i;
			return new Response(JSON.stringify([{ version: '1.0.0', date: '', items: ['A'] }, { bad: true }]));
		}) as typeof fetch;
		expect(await fetchChangelog('/changelog.json', ok)).toEqual([{ version: '1.0.0', date: '', items: ['A'] }]);
		expect(init?.cache).toBe('no-store');
		const offline = (async () => {
			throw new TypeError('offline');
		}) as typeof fetch;
		expect(await fetchChangelog('/changelog.json', offline)).toEqual([]);
		const notFound = (async () => new Response('', { status: 404 })) as typeof fetch;
		expect(await fetchChangelog('/changelog.json', notFound)).toEqual([]);
	});
});
