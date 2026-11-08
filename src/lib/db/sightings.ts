import { normalizePlate } from '../plates/normalize';
import { db as defaultDb, type SpzDatabase } from './db';
import type { GeoPoint, Sighting } from './types';

export interface NewSighting {
	collectionId: string;
	regionCode: string;
	plate?: string | null;
	seenAt?: number;
	location?: GeoPoint | null;
	note?: string;
}

export type SightingPatch = Partial<
	Pick<Sighting, 'collectionId' | 'regionCode' | 'plate' | 'seenAt' | 'location' | 'note'>
>;

function cleanPlate(plate: string | null | undefined): { plate: string | null; plateNormalized: string | null } {
	const trimmed = plate?.trim() ?? '';
	const normalized = normalizePlate(trimmed);
	return normalized ? { plate: trimmed, plateNormalized: normalized } : { plate: null, plateNormalized: null };
}

export async function addSighting(input: NewSighting, database: SpzDatabase = defaultDb): Promise<Sighting> {
	const now = Date.now();
	const sighting: Sighting = {
		id: crypto.randomUUID(),
		collectionId: input.collectionId,
		regionCode: input.regionCode.toUpperCase(),
		...cleanPlate(input.plate),
		seenAt: input.seenAt ?? now,
		location: input.location ?? null,
		note: input.note?.trim() ?? '',
		createdAt: now,
		updatedAt: now,
		deleted: 0,
		userId: null,
		dirty: 1
	};
	await database.sightings.add(sighting);
	return sighting;
}

export async function updateSighting(
	id: string,
	patch: SightingPatch,
	database: SpzDatabase = defaultDb
): Promise<void> {
	const changes: Partial<Sighting> = { ...patch, updatedAt: Date.now(), dirty: 1 };
	if ('plate' in patch) Object.assign(changes, cleanPlate(patch.plate));
	if (patch.regionCode) changes.regionCode = patch.regionCode.toUpperCase();
	if (patch.note !== undefined) changes.note = patch.note.trim();
	const updated = await database.sightings.update(id, changes);
	if (!updated) throw new Error(`Sighting ${id} not found`);
}

/** Soft-deletes so the deletion can propagate to other devices on sync. */
export async function deleteSighting(id: string, database: SpzDatabase = defaultDb): Promise<void> {
	const updated = await database.sightings.update(id, { deleted: 1, updatedAt: Date.now(), dirty: 1 });
	if (!updated) throw new Error(`Sighting ${id} not found`);
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
