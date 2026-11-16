// Pure helpers for sync: converting between the local Dexie `Sighting` and the
// server's `public.sightings` row, last-write-wins decisions and the
// comparison behind the sign-in conflict check. No I/O here (unit-tested).

import type { Sighting } from '../db/types';
import type { PlateFormat } from '../plates/detect';

/** A row of public.sightings as sent to / received from Supabase. */
export interface RemoteRow {
	id: string;
	collection_id: string;
	region_code: string | null;
	plate_type: string | null;
	plate: string | null;
	plate_normalized: string | null;
	seen_at: string;
	created_at: string;
	updated_at: string;
	lat: number | null;
	lng: number | null;
	accuracy: number | null;
	note: string;
	deleted: boolean;
	/** Only in rows coming from the server. */
	server_updated_at?: string;
	user_id?: string;
}

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (value: string) => Date.parse(value);

export function toRow(s: Sighting): RemoteRow {
	return {
		id: s.id,
		collection_id: s.collectionId,
		region_code: s.regionCode,
		plate_type: s.plateType,
		plate: s.plate,
		plate_normalized: s.plateNormalized,
		seen_at: iso(s.seenAt),
		created_at: iso(s.createdAt),
		updated_at: iso(s.updatedAt),
		lat: s.location?.lat ?? null,
		lng: s.location?.lng ?? null,
		accuracy: s.location?.accuracy ?? null,
		note: s.note,
		deleted: s.deleted === 1
	};
}

/** A server row as a clean local sighting of `userId`. */
export function fromRow(r: RemoteRow, userId: string): Sighting {
	return {
		id: r.id,
		collectionId: r.collection_id,
		regionCode: r.region_code,
		plateType: r.plate_type as PlateFormat | null,
		plate: r.plate,
		plateNormalized: r.plate_normalized,
		seenAt: ms(r.seen_at),
		location: r.lat === null || r.lng === null ? null : { lat: r.lat, lng: r.lng, accuracy: r.accuracy },
		note: r.note ?? '',
		createdAt: ms(r.created_at),
		updatedAt: ms(r.updated_at),
		deleted: r.deleted ? 1 : 0,
		userId,
		dirty: 0
	};
}

/**
 * Whether a row from the server replaces the local copy: when there is none
 * (unless the row is a deletion, nothing to keep then), when the server's is
 * newer, or when both are equally new and the local one has no pending change.
 */
export function remoteWins(local: Sighting | undefined, remote: RemoteRow): boolean {
	if (!local) return !remote.deleted;
	const remoteUpdated = ms(remote.updated_at);
	return remoteUpdated > local.updatedAt || (remoteUpdated === local.updatedAt && local.dirty === 0);
}

/**
 * Identity of a sighting across devices for the sign-in check: the plate when
 * typed, otherwise (quick entry) collection + region/type + time seen.
 */
export function sightingKey(
	s: Pick<Sighting, 'plateNormalized' | 'collectionId' | 'regionCode' | 'plateType' | 'seenAt'>
): string {
	return s.plateNormalized
		? `plate:${s.plateNormalized}`
		: `quick:${s.collectionId}:${s.regionCode ?? `*${s.plateType}`}:${s.seenAt}`;
}

export interface Comparison {
	/** Live sightings on this device (not yet in the account). */
	local: number;
	/** Live sightings in the account. */
	remote: number;
	onlyLocal: number;
	onlyRemote: number;
	/** True when the user must choose: both sides hold sightings and they differ. */
	conflict: boolean;
}

/** Compares live (non-deleted) local and remote sightings by `sightingKey`. */
export function compareSightings(local: Sighting[], remote: RemoteRow[]): Comparison {
	const localKeys = new Set(local.filter((s) => s.deleted === 0).map(sightingKey));
	const remoteKeys = new Set(
		remote.filter((r) => !r.deleted).map((r) => sightingKey(fromRow(r, '')))
	);
	let onlyLocal = 0;
	for (const k of localKeys) if (!remoteKeys.has(k)) onlyLocal++;
	let onlyRemote = 0;
	for (const k of remoteKeys) if (!localKeys.has(k)) onlyRemote++;
	return {
		local: localKeys.size,
		remote: remoteKeys.size,
		onlyLocal,
		onlyRemote,
		conflict: localKeys.size > 0 && remoteKeys.size > 0 && (onlyLocal > 0 || onlyRemote > 0)
	};
}

/** Latest server_updated_at among rows (string compare is fine for ISO timestamps from one server). */
export function maxCursor(rows: RemoteRow[], current: string | null = null): string | null {
	let max = current;
	for (const r of rows) {
		const c = r.server_updated_at;
		if (c && (max === null || ms(c) > ms(max) || (ms(c) === ms(max) && c > max))) max = c;
	}
	return max;
}
