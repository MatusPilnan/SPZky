import { describe, expect, it } from 'vitest';
import type { PlateFormat } from './plates/detect';
import { collectionProgress, countByRegion, countNationwide, regionCount, regionStats } from './progress';

const s = (
	collectionId: string,
	regionCode: string | null,
	plateType: PlateFormat | null = null,
	deleted: 0 | 1 = 0
) => ({ collectionId, regionCode, plateType, deleted });

describe('countByRegion', () => {
	it('counts sightings per collection and region, skipping deleted, unknown and nationwide', () => {
		const counts = countByRegion([
			s('sk', 'BA'),
			s('sk', 'BA'),
			s('sk', 'KE', null, 1),
			s('sk', 'XX'),
			s('sk', null, 'ev'),
			s('cz', 'A')
		]);
		expect(regionCount(counts, 'sk', 'BA')).toBe(2);
		expect(regionCount(counts, 'sk', 'KE')).toBe(0);
		expect(regionCount(counts, 'sk', 'XX')).toBe(0);
		expect(regionCount(counts, 'cz', 'A')).toBe(1);
		expect(counts.get('sk')?.size).toBe(1);
		expect(regionCount(undefined, 'sk', 'BA')).toBe(0);
	});
});

describe('collectionProgress', () => {
	it('counts found regions out of all, with nationwide plates separately', () => {
		const list = [s('sk', 'BA'), s('sk', 'BA'), s('sk', 'KE'), s('sk', null, 'ev'), s('sk', null, 'sk-2023')];
		const sk = { id: 'sk', regions: [{ code: 'BA' }, { code: 'KE' }, { code: 'ZA' }, { code: 'NR' }] };
		expect(collectionProgress(sk, countByRegion(list), countNationwide(list))).toEqual({
			found: 2,
			total: 4,
			ratio: 0.5,
			nationwide: 2
		});
		expect(collectionProgress({ id: 'cz', regions: [] }, undefined)).toEqual({
			found: 0,
			total: 0,
			ratio: 0,
			nationwide: 0
		});
	});
});

describe('regionStats', () => {
	it('tracks count and first/last seen per region of one collection', () => {
		const at = (code: string | null, seenAt: number, collectionId = 'sk', deleted: 0 | 1 = 0) => ({
			collectionId,
			regionCode: code,
			seenAt,
			deleted
		});
		const stats = regionStats(
			[at('BA', 300), at('BA', 100), at('BA', 200), at('BA', 50, 'sk', 1), at('KE', 400), at('A', 10, 'cz'), at(null, 5)],
			'sk'
		);
		expect(Object.fromEntries(stats)).toEqual({
			BA: { count: 3, firstSeenAt: 100, lastSeenAt: 300 },
			KE: { count: 1, firstSeenAt: 400, lastSeenAt: 400 }
		});
	});
});

describe('countNationwide', () => {
	it('counts nationwide plates per type, separately from regions', () => {
		const counts = countNationwide([
			s('sk', null, 'ev'),
			s('sk', null, 'ev'),
			s('sk', null, 'sk-2023'),
			s('sk', null, 'ev', 1),
			s('sk', 'BA', 'sk-district'),
			s('cz', null, 'cz-personalized')
		]);
		expect(Object.fromEntries(counts.get('sk')!)).toEqual({ ev: 2, 'sk-2023': 1 });
		expect(Object.fromEntries(counts.get('cz')!)).toEqual({ 'cz-personalized': 1 });
	});
});
