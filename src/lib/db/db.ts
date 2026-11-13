import Dexie, { type EntityTable } from 'dexie';
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
	}
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
