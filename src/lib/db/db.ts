import Dexie, { type EntityTable } from 'dexie';
import { getRegion } from '../collections';
import { detectPlate } from '../plates/detect';
import type { Sighting } from './types';

export class SpzDatabase extends Dexie {
	sightings!: EntityTable<Sighting, 'id'>;

	constructor(name = 'spz-ky') {
		super(name);
		this.version(1).stores({
			sightings: 'id, collectionId, [collectionId+regionCode], plateNormalized, seenAt, updatedAt, dirty'
		});
		// v2: nationwide plates (regionCode null) and plateType.
		this.version(2)
			.stores({
				sightings: 'id, collectionId, [collectionId+regionCode], plateNormalized, seenAt, updatedAt, dirty'
			})
			.upgrade((tx) =>
				tx
					.table<Sighting>('sightings')
					.toCollection()
					.modify((s) => {
						s.plateType = inferPlateType(s);
					})
			);
		// v3: region data corrected (SK reserved codes like BD, TA, ZI were never issued).
		// Re-detect sightings whose region code no longer exists.
		this.version(3)
			.stores({
				sightings: 'id, collectionId, [collectionId+regionCode], plateNormalized, seenAt, updatedAt, dirty'
			})
			.upgrade((tx) =>
				tx
					.table<Sighting>('sightings')
					.toCollection()
					.modify((s) => {
						const fixed = reassignUnknownRegion(s);
						if (fixed) Object.assign(s, fixed, { updatedAt: Date.now(), dirty: 1 });
					})
			);
	}
}

/**
 * For a sighting whose region code is not in the collection (any more): the
 * best detection of its plate within the same collection, or null when there
 * is nothing to change (valid region, nationwide, or no plate to re-detect).
 */
export function reassignUnknownRegion(
	s: Pick<Sighting, 'plate' | 'collectionId' | 'regionCode'>
): Pick<Sighting, 'regionCode' | 'plateType'> | null {
	if (s.regionCode === null || getRegion(s.collectionId, s.regionCode) || !s.plate) return null;
	const best = detectPlate(s.plate).find((d) => d.collectionId === s.collectionId);
	if (!best) return null;
	return best.type === 'region'
		? { regionCode: best.regionCode, plateType: best.format }
		: { regionCode: null, plateType: best.format };
}

/** Format of a stored sighting's plate, if it matches what was saved. */
export function inferPlateType(s: Pick<Sighting, 'plate' | 'collectionId' | 'regionCode'>): Sighting['plateType'] {
	if (!s.plate) return null;
	const match = detectPlate(s.plate).find(
		(d) => d.collectionId === s.collectionId && (d.type === 'region' ? d.regionCode === s.regionCode : s.regionCode === null)
	);
	return match?.format ?? null;
}

export const db = new SpzDatabase();
