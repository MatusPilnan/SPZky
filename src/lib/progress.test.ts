import { describe, expect, it } from 'vitest';
import { countByRegion, regionCount } from './progress';

describe('countByRegion', () => {
	it('counts sightings per collection and region, skipping deleted and unknown', () => {
		const counts = countByRegion([
			{ collectionId: 'sk', regionCode: 'BA', deleted: 0 },
			{ collectionId: 'sk', regionCode: 'BA', deleted: 0 },
			{ collectionId: 'sk', regionCode: 'KE', deleted: 1 },
			{ collectionId: 'sk', regionCode: 'XX', deleted: 0 },
			{ collectionId: 'cz', regionCode: 'A', deleted: 0 }
		]);
		expect(regionCount(counts, 'sk', 'BA')).toBe(2);
		expect(regionCount(counts, 'sk', 'KE')).toBe(0);
		expect(regionCount(counts, 'sk', 'XX')).toBe(0);
		expect(regionCount(counts, 'cz', 'A')).toBe(1);
		expect(counts.get('sk')?.size).toBe(1);
		expect(regionCount(undefined, 'sk', 'BA')).toBe(0);
	});
});
