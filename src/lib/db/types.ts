export interface GeoPoint {
	lat: number;
	lng: number;
	/** Accuracy radius in metres, as reported by the Geolocation API. */
	accuracy: number | null;
}

/** Dexie can't index booleans, so flags are stored as 0/1. */
export type Flag = 0 | 1;

export interface Sighting {
	/** Client-generated UUID, so records can be created offline and synced later. */
	id: string;
	/** Which collection the region belongs to, e.g. "sk", "cz", "cz-vintage". */
	collectionId: string;
	/** Region code within the collection, e.g. "BA" (SK) or "A" (CZ). */
	regionCode: string;
	/** Plate as typed by the user; null for quick "tap a region" entries. */
	plate: string | null;
	/** normalizePlate(plate); null when plate is null. Used for duplicate checks. */
	plateNormalized: string | null;
	/** When the plate was spotted (epoch ms). */
	seenAt: number;
	location: GeoPoint | null;
	note: string;
	createdAt: number;
	/** Last local modification (epoch ms); drives last-write-wins sync. */
	updatedAt: number;
	/** Soft delete so deletions can be synced to other devices. */
	deleted: Flag;
	/** Supabase user id once the user signs in; null for anonymous local data. */
	userId: string | null;
	/** 1 when the record has local changes not yet pushed to the server. */
	dirty: Flag;
}
