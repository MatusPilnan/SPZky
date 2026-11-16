import { describe, expect, it } from 'vitest';
import { bonusSummary, clampFullCount, lastSeenByCollection, orderCollections } from './home';

const p = (found: number, total: number) => ({ found, total, ratio: found / total, nationwide: 0 });
const items = [
	{ id: 'sk', name: 'Slovensko', progress: p(10, 74) },
	{ id: 'at', name: 'Rakúsko', progress: p(0, 106) },
	{ id: 'cz', name: 'Česko', progress: p(7, 14) },
	{ id: 'de', name: 'Nemecko', progress: p(0, 714) }
];
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('orderCollections', () => {
	it('recent: latest sighting first, never-seen ones alphabetically at the end', () => {
		const last = new Map([
			['sk', 100],
			['cz', 200]
		]);
		expect(ids(orderCollections(items, 'recent', last, 'sk'))).toEqual(['cz', 'sk', 'de', 'at']);
	});

	it('progress: highest share first, ties by name', () => {
		expect(ids(orderCollections(items, 'progress', new Map(), 'sk'))).toEqual(['cz', 'sk', 'de', 'at']);
	});

	it('alpha: by name in the current language (Č after C, before D)', () => {
		const withC = [...items, { id: 'hr', name: 'Chorvátsko', progress: p(0, 1) }];
		expect(ids(orderCollections(withC, 'alpha', new Map(), 'sk'))).toEqual(['cz', 'hr', 'de', 'at', 'sk']);
	});

	it('does not change the input', () => {
		const copy = [...items];
		orderCollections(items, 'alpha', new Map(), 'en');
		expect(items).toEqual(copy);
	});
});

describe('lastSeenByCollection', () => {
	it('takes the latest sighting per collection and ignores deleted ones', () => {
		const last = lastSeenByCollection([
			{ collectionId: 'sk', seenAt: 5, deleted: 0 },
			{ collectionId: 'sk', seenAt: 9, deleted: 0 },
			{ collectionId: 'sk', seenAt: 20, deleted: 1 },
			{ collectionId: 'cz', seenAt: 3, deleted: 1 }
		]);
		expect([...last]).toEqual([['sk', 9]]);
	});
});

describe('bonusSummary', () => {
	it('counts started, finished and unstarted collections', () => {
		expect(bonusSummary([p(0, 96), p(3, 11), p(11, 11), p(0, 105)])).toEqual({ total: 4, started: 1, finished: 1, unstarted: 2 });
	});
});

describe('clampFullCount', () => {
	it('keeps a whole number between 0 and the number of collections', () => {
		expect(clampFullCount(3, 15)).toBe(3);
		expect(clampFullCount(40, 15)).toBe(15);
		expect(clampFullCount(-2, 15)).toBe(0);
		expect(clampFullCount('2.6', 15)).toBe(3);
		expect(clampFullCount('x', 15)).toBe(3);
	});
});
