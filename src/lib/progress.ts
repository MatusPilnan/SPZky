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

export interface CollectionProgress {
	found: number;
	total: number;
	/** 0..1 */
	ratio: number;
	/** Nationwide plates of this collection (not part of found/total). */
	nationwide: number;
}

export function collectionProgress(
	collection: { id: string; regions: { code: string }[] },
	counts: RegionCounts | undefined,
	nationwideCounts?: NationwideCounts
): CollectionProgress {
	const perRegion = counts?.get(collection.id);
	const found = collection.regions.filter((r) => (perRegion?.get(r.code) ?? 0) > 0).length;
	const total = collection.regions.length;
	let nationwide = 0;
	for (const n of nationwideCounts?.get(collection.id)?.values() ?? []) nationwide += n;
	return { found, total, ratio: total ? found / total : 0, nationwide };
}

export interface RegionStats {
	count: number;
	firstSeenAt: number;
	lastSeenAt: number;
}

/** Per region code of one collection: how often and when it was seen (non-deleted only). */
export function regionStats(
	sightings: Pick<Sighting, 'collectionId' | 'regionCode' | 'seenAt' | 'deleted'>[],
	collectionId: string
): Map<string, RegionStats> {
	const stats = new Map<string, RegionStats>();
	for (const s of sightings) {
		if (s.deleted || s.collectionId !== collectionId || s.regionCode === null) continue;
		const prev = stats.get(s.regionCode);
		stats.set(
			s.regionCode,
			prev
				? {
						count: prev.count + 1,
						firstSeenAt: Math.min(prev.firstSeenAt, s.seenAt),
						lastSeenAt: Math.max(prev.lastSeenAt, s.seenAt)
					}
				: { count: 1, firstSeenAt: s.seenAt, lastSeenAt: s.seenAt }
		);
	}
	return stats;
}
