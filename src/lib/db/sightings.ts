import { isNationwideType } from '../collections';
import { normalizePlate } from '../plates/normalize';
import { db as defaultDb, type SpzDatabase } from './db';
import type { GeoPoint, Sighting } from './types';

export interface NewSighting {
	collectionId: string;
	/** null = nationwide plate (then plateType must be one of the collection's nationwide types). */
	regionCode: string | null;
	plateType?: Sighting['plateType'];
	plate?: string | null;
	seenAt?: number;
	location?: GeoPoint | null;
	note?: string;
}

export type SightingPatch = Partial<
	Pick<Sighting, 'collectionId' | 'regionCode' | 'plateType' | 'plate' | 'seenAt' | 'location' | 'note'>
>;

function assertConsistent(s: Pick<Sighting, 'collectionId' | 'regionCode' | 'plateType'>) {
	if (s.regionCode === null && !isNationwideType(s.collectionId, s.plateType)) {
		throw new Error(`Nationwide sighting needs a nationwide plate type of ${s.collectionId}, got ${s.plateType}`);
	}
}

function cleanPlate(plate: string | null | undefined): { plate: string | null; plateNormalized: string | null } {
	const trimmed = plate?.trim() ?? '';
	const normalized = normalizePlate(trimmed);
	return normalized ? { plate: trimmed, plateNormalized: normalized } : { plate: null, plateNormalized: null };
}

/**
 * Copies a location into a plain object. Values coming from Svelte `$state`
 * are Proxies, which IndexedDB cannot store (DataCloneError).
 */
function plainLocation(location: GeoPoint | null | undefined): GeoPoint | null {
	if (!location) return null;
	return { lat: location.lat, lng: location.lng, accuracy: location.accuracy ?? null };
}

export async function addSighting(input: NewSighting, database: SpzDatabase = defaultDb): Promise<Sighting> {
	const now = Date.now();
	const sighting: Sighting = {
		id: crypto.randomUUID(),
		collectionId: input.collectionId,
		regionCode: input.regionCode?.toUpperCase() ?? null,
		plateType: input.plateType ?? null,
		...cleanPlate(input.plate),
		seenAt: input.seenAt ?? now,
		location: plainLocation(input.location),
		note: input.note?.trim() ?? '',
		createdAt: now,
		updatedAt: now,
		deleted: 0,
		userId: null,
		dirty: 1
	};
	assertConsistent(sighting);
	await database.sightings.add(sighting);
	return sighting;
}

export async function updateSighting(
	id: string,
	patch: SightingPatch,
	database: SpzDatabase = defaultDb
): Promise<void> {
	const changes: Partial<Sighting> = { ...patch, dirty: 1 };
	if ('plate' in patch) Object.assign(changes, cleanPlate(patch.plate));
	if (patch.regionCode) changes.regionCode = patch.regionCode.toUpperCase();
	if (patch.note !== undefined) changes.note = patch.note.trim();
	if ('location' in patch) changes.location = plainLocation(patch.location);
	await database.transaction('rw', database.sightings, async () => {
		const current = await database.sightings.get(id);
		if (!current) throw new Error(`Sighting ${id} not found`);
		changes.updatedAt = nextUpdatedAt(current);
		assertConsistent({ ...current, ...changes });
		await database.sightings.update(id, changes);
	});
}

/**
 * Timestamp for a local change: now, but always later than the version being
 * changed (which may come from a device whose clock runs ahead), so the change
 * wins last-write-wins sync.
 */
export function nextUpdatedAt(current: Pick<Sighting, 'updatedAt'>, now = Date.now()): number {
	return Math.max(now, current.updatedAt + 1);
}

/** Soft-deletes so the deletion can propagate to other devices on sync. */
export async function deleteSighting(id: string, database: SpzDatabase = defaultDb): Promise<void> {
	await database.transaction('rw', database.sightings, async () => {
		const current = await database.sightings.get(id);
		if (!current) throw new Error(`Sighting ${id} not found`);
		await database.sightings.update(id, { deleted: 1, updatedAt: nextUpdatedAt(current), dirty: 1 });
	});
}

/** All non-deleted sightings, newest first. */
export function listSightings(database: SpzDatabase = defaultDb): Promise<Sighting[]> {
	return database.sightings
		.orderBy('seenAt')
		.reverse()
		.filter((s) => s.deleted === 0)
		.toArray();
}

/** Non-deleted sightings of the same plate (ignoring separators/case). */
export async function findByPlate(plate: string, database: SpzDatabase = defaultDb): Promise<Sighting[]> {
	const normalized = normalizePlate(plate);
	if (!normalized) return [];
	const matches = await database.sightings.where('plateNormalized').equals(normalized).toArray();
	return matches.filter((s) => s.deleted === 0);
}
