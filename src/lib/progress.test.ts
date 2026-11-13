import { describe, expect, it } from 'vitest';
import type { PlateFormat } from './plates/detect';
import { countByRegion, countNationwide, regionCount } from './progress';

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
