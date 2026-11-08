import Dexie, { type EntityTable } from 'dexie';
import type { Sighting } from './types';

export class SpzDatabase extends Dexie {
	sightings!: EntityTable<Sighting, 'id'>;

	constructor(name = 'spz-ky') {
		super(name);
		this.version(1).stores({
			sightings: 'id, collectionId, [collectionId+regionCode], plateNormalized, seenAt, updatedAt, dirty'
		});
	}
}

export const db = new SpzDatabase();
