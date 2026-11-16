// Export / import of the local plates as a JSON file (Settings → Your data,
// and the sign-in conflict dialog). The file is meant to be read back by this
// app, by any later version: it carries a format number.

import { getCollection, getRegion, isNationwideType } from './collections';
import { inferPlateType, reassignUnknownRegion, type SpzDatabase } from './db/db';
import { nextUpdatedAt } from './db/sightings';
import type { GeoPoint, Sighting } from './db/types';
import { normalizePlate } from './plates/normalize';
import { sightingKey } from './sync/rows';

export const BACKUP_FORMAT = 1;

export interface BackupSighting {
	collectionId: string;
	/** null = nationwide plate (then plateType names the nationwide type). */
	regionCode: string | null;
	plateType: string | null;
	plate: string | null;
	seenAt: string;
	createdAt: string;
	updatedAt: string;
	location: GeoPoint | null;
	/** Address of the location (optional; files from before it existed don't have it). */
	place?: string | null;
	note: string;
}

export interface BackupFile {
	app: 'spz-ky';
	format: number;
	appVersion: string;
	exportedAt: string;
	sightings: BackupSighting[];
}

const iso = (ms: number) => new Date(ms).toISOString();

/** All live sightings as a backup file object. */
export async function exportBackup(db: SpzDatabase, appVersion: string, now = Date.now()): Promise<BackupFile> {
	const live = await db.sightings.filter((s) => s.deleted === 0).toArray();
	live.sort((a, b) => a.seenAt - b.seenAt);
	return {
		app: 'spz-ky',
		format: BACKUP_FORMAT,
		appVersion,
		exportedAt: iso(now),
		sightings: live.map((s) => ({
			collectionId: s.collectionId,
			regionCode: s.regionCode,
			plateType: s.plateType,
			plate: s.plate,
			seenAt: iso(s.seenAt),
			createdAt: iso(s.createdAt),
			updatedAt: iso(s.updatedAt),
			location: s.location ? { lat: s.location.lat, lng: s.location.lng, accuracy: s.location.accuracy } : null,
			place: s.place ?? null,
			note: s.note
		}))
	};
}

export function backupFileName(now = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `spz-ky-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** A sighting read from a file, checked and ready to be added (id etc. are assigned on import). */
export type ImportedSighting = Omit<Sighting, 'id' | 'userId' | 'dirty' | 'deleted'>;

export interface ParsedBackup {
	sightings: ImportedSighting[];
	/** Entries that could not be used (unknown country or region, broken data). */
	skipped: number;
}

export class BackupError extends Error {
	constructor(readonly reason: 'invalid' | 'newer') {
		super(reason);
	}
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const time = (v: unknown): number | null => {
	const ms = typeof v === 'string' ? Date.parse(v) : typeof v === 'number' ? v : NaN;
	return Number.isFinite(ms) ? ms : null;
};

function location(v: unknown): GeoPoint | null {
	if (!isObject(v)) return null;
	const { lat, lng, accuracy } = v;
	if (typeof lat !== 'number' || typeof lng !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
	return { lat, lng, accuracy: typeof accuracy === 'number' && accuracy >= 0 ? accuracy : null };
}

/** One entry of the file → a valid sighting, or null to skip it. */
function readSighting(raw: unknown): ImportedSighting | null {
	if (!isObject(raw)) return null;
	const collectionId = str(raw.collectionId);
	if (!collectionId || !getCollection(collectionId)) return null;
	const seenAt = time(raw.seenAt);
	if (seenAt === null) return null;
	const typed = str(raw.plate)?.slice(0, 32) ?? null;
	const plateNormalized = typed ? normalizePlate(typed) || null : null;
	const plate = plateNormalized ? typed : null;
	let regionCode = str(raw.regionCode)?.toUpperCase() ?? null;
	let plateType: Sighting['plateType'] | undefined;

	if (regionCode === null) {
		// Nationwide: the type is what puts it into the collection, so it must be one of its types.
		const type = str(raw.plateType);
		if (!isNationwideType(collectionId, type)) return null;
		plateType = type;
	} else {
		if (!getRegion(collectionId, regionCode)) {
			// e.g. a code removed from the data since the export: re-detect from the plate.
			const fixed = reassignUnknownRegion({ plate, collectionId, regionCode });
			if (!fixed) return null;
			({ regionCode } = fixed);
			if (regionCode === null) {
				if (!isNationwideType(collectionId, fixed.plateType)) return null;
				plateType = fixed.plateType;
			}
		}
		// Recomputed rather than trusted from the file.
		plateType ??= regionCode === null ? null : inferPlateType({ plate, collectionId, regionCode });
	}

	const createdAt = time(raw.createdAt) ?? seenAt;
	const where = location(raw.location);
	return {
		collectionId,
		regionCode,
		plateType: plateType ?? null,
		plate,
		plateNormalized,
		seenAt,
		location: where,
		// Only meaningful with a location; otherwise looked up again later.
		place: where && typeof raw.place === 'string' ? raw.place.trim().slice(0, 300) : null,
		note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 2000) : '',
		createdAt,
		updatedAt: time(raw.updatedAt) ?? createdAt
	};
}

/** Reads and checks a backup file's text. Throws BackupError for files that aren't usable at all. */
export function parseBackup(text: string): ParsedBackup {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		throw new BackupError('invalid');
	}
	if (!isObject(data) || data.app !== 'spz-ky' || typeof data.format !== 'number' || !Array.isArray(data.sightings)) {
		throw new BackupError('invalid');
	}
	if (data.format > BACKUP_FORMAT) throw new BackupError('newer');

	const sightings: ImportedSighting[] = [];
	let skipped = 0;
	for (const raw of data.sightings) {
		const s = readSighting(raw);
		if (s) sightings.push(s);
		else skipped++;
	}
	return { sightings, skipped };
}

export interface ImportPreview {
	/** Usable entries in the file. */
	total: number;
	/** Of those, not on this device yet (and not repeated within the file). */
	fresh: number;
	skipped: number;
	/** Live plates on this device now. */
	local: number;
}

async function liveKeys(db: SpzDatabase): Promise<{ count: number; keys: Set<string> }> {
	const live = await db.sightings.filter((s) => s.deleted === 0).toArray();
	return { count: live.length, keys: new Set(live.map(sightingKey)) };
}

/** Entries of the file that aren't in `keys`, each key once. */
function unseen(sightings: ImportedSighting[], keys: Set<string>): ImportedSighting[] {
	const seen = new Set(keys);
	return sightings.filter((s) => {
		const key = sightingKey(s);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

export async function previewImport(db: SpzDatabase, parsed: ParsedBackup): Promise<ImportPreview> {
	const { count, keys } = await liveKeys(db);
	return {
		total: parsed.sightings.length,
		fresh: unseen(parsed.sightings, keys).length,
		skipped: parsed.skipped,
		local: count
	};
}

export type ImportMode = 'add' | 'replace';

/**
 * Imports the file's sightings. `add`: plates already on the device are
 * skipped. `replace`: the device's plates are removed first (synced ones as
 * deletions, so with an account they disappear there too).
 * Imported sightings get new ids and count as local changes (synced when signed in).
 */
export async function importBackup(
	db: SpzDatabase,
	parsed: ParsedBackup,
	mode: ImportMode,
	now = Date.now()
): Promise<{ added: number; removed: number }> {
	let added = 0;
	let removed = 0;
	await db.transaction('rw', db.sightings, async () => {
		if (mode === 'replace') {
			const live = await db.sightings.filter((s) => s.deleted === 0).toArray();
			removed = live.length;
			// Never synced: just remove. Synced: soft delete, so the deletion reaches the account.
			await db.sightings.bulkDelete(live.filter((s) => s.userId === null).map((s) => s.id));
			for (const s of live.filter((s) => s.userId !== null)) {
				await db.sightings.update(s.id, { deleted: 1, dirty: 1, updatedAt: nextUpdatedAt(s, now) });
			}
		}
		const { keys } = await liveKeys(db);
		const rows: Sighting[] = unseen(parsed.sightings, keys).map((s) => ({
			...s,
			id: crypto.randomUUID(),
			// A fresh change, so it wins over anything older on other devices.
			updatedAt: now,
			deleted: 0,
			userId: null,
			dirty: 1
		}));
		await db.sightings.bulkAdd(rows);
		added = rows.length;
	});
	return { added, removed };
}
