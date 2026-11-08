import { getRegion } from './collections';
import type { Sighting } from './db/types';

/** collectionId → regionCode → number of (non-deleted) sightings. */
export type RegionCounts = Map<string, Map<string, number>>;

export function countByRegion(
	sightings: Pick<Sighting, 'collectionId' | 'regionCode' | 'deleted'>[]
): RegionCounts {
	const counts: RegionCounts = new Map();
	for (const s of sightings) {
		if (s.deleted || !getRegion(s.collectionId, s.regionCode)) continue;
		let perRegion = counts.get(s.collectionId);
		if (!perRegion) counts.set(s.collectionId, (perRegion = new Map()));
		perRegion.set(s.regionCode, (perRegion.get(s.regionCode) ?? 0) + 1);
	}
	return counts;
}

export function regionCount(counts: RegionCounts | undefined, collectionId: string, regionCode: string): number {
	return counts?.get(collectionId)?.get(regionCode) ?? 0;
}
