import { getRegion } from './collections';
import type { Sighting } from './db/types';

/** collectionId → regionCode → number of (non-deleted) sightings. */
export type RegionCounts = Map<string, Map<string, number>>;

export function countByRegion(
	sightings: Pick<Sighting, 'collectionId' | 'regionCode' | 'deleted'>[]
): RegionCounts {
	const counts: RegionCounts = new Map();
	for (const s of sightings) {
		// Nationwide plates (regionCode null) never count toward progress.
		const code = s.regionCode;
		if (s.deleted || code === null || !getRegion(s.collectionId, code)) continue;
		let perRegion = counts.get(s.collectionId);
		if (!perRegion) counts.set(s.collectionId, (perRegion = new Map()));
		perRegion.set(code, (perRegion.get(code) ?? 0) + 1);
	}
	return counts;
}

/** collectionId → nationwide plate type → number of sightings (not part of progress). */
export type NationwideCounts = Map<string, Map<string, number>>;

export function countNationwide(
	sightings: Pick<Sighting, 'collectionId' | 'regionCode' | 'plateType' | 'deleted'>[]
): NationwideCounts {
	const counts: NationwideCounts = new Map();
	for (const s of sightings) {
		if (s.deleted || s.regionCode !== null || !s.plateType) continue;
		let perType = counts.get(s.collectionId);
		if (!perType) counts.set(s.collectionId, (perType = new Map()));
		perType.set(s.plateType, (perType.get(s.plateType) ?? 0) + 1);
	}
	return counts;
}

export function regionCount(counts: RegionCounts | undefined, collectionId: string, regionCode: string): number {
	return counts?.get(collectionId)?.get(regionCode) ?? 0;
}
