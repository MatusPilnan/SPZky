// Sync between the local Dexie database and the server (docs/PLAN.md, "Sync —
// phase 7"). Every function takes the database, the remote and the user id,
// so the logic can be tested against fake-indexeddb and an in-memory remote.

import type { SpzDatabase } from '../db/db';
import { nextUpdatedAt } from '../db/sightings';
import type { Sighting } from '../db/types';
import type { Remote } from './remote';
import { compareSightings, fromRow, maxCursor, remoteWins, sightingKey, toRow, type Comparison, type RemoteRow } from './rows';

export const PUSH_BATCH = 200;
export const PULL_PAGE = 500;
/**
 * Pulls re-read the last minute before the cursor: a transaction that started
 * earlier can commit after a pull has already moved past its timestamp.
 */
export const PULL_OVERLAP_MS = 60_000;

const ACCOUNT_KEY = 'sync.account';
const CURSOR_KEY = 'sync.cursor';

export type SignInChoice = 'merge' | 'cloud' | 'device';

async function getMeta<T>(db: SpzDatabase, key: string): Promise<T | null> {
	return ((await db.meta.get(key))?.value as T | undefined) ?? null;
}

/** The account the local data has been merged into, or null (not signed in, or sign-in check pending). */
export function syncedAccount(db: SpzDatabase): Promise<string | null> {
	return getMeta<string>(db, ACCOUNT_KEY);
}

/** Fetches all rows changed since `since` (everything when null), page by page. */
export async function pullAll(remote: Remote, since: string | null): Promise<RemoteRow[]> {
	const all: RemoteRow[] = [];
	const seen = new Set<string>();
	let from = since;
	for (;;) {
		const page = await remote.pull(from, PULL_PAGE);
		const fresh = page.filter((r) => !seen.has(r.id));
		for (const r of fresh) seen.add(r.id);
		all.push(...fresh);
		// Pages are keyed by timestamp (>=), so the next page repeats the last
		// timestamp; a page with nothing new means we're stuck on equal timestamps.
		if (page.length < PULL_PAGE || fresh.length === 0) return all;
		from = page[page.length - 1].server_updated_at ?? null;
	}
}

/** Applies server rows locally where they win (last-write-wins). */
export async function applyRemote(db: SpzDatabase, rows: RemoteRow[], userId: string): Promise<number> {
	let applied = 0;
	await db.transaction('rw', db.sightings, async () => {
		const locals = await db.sightings.bulkGet(rows.map((r) => r.id));
		const winners = rows.filter((r, i) => remoteWins(locals[i], r)).map((r) => fromRow(r, userId));
		await db.sightings.bulkPut(winners);
		applied = winners.length;
	});
	return applied;
}

function unsynced(db: SpzDatabase, userId: string) {
	return db.sightings
		.where('dirty')
		.equals(1)
		.filter((s) => s.userId === null || s.userId === userId);
}

/** Pushes local changes; returns how many rows were sent. */
export async function push(db: SpzDatabase, remote: Remote, userId: string): Promise<number> {
	let sent = 0;
	for (;;) {
		const batch = await unsynced(db, userId).limit(PUSH_BATCH).toArray();
		if (batch.length === 0) return sent;
		const rejected = await remote.push(batch.map(toRow));
		let cleaned = 0;
		await db.transaction('rw', db.sightings, async () => {
			const current = await db.sightings.bulkGet(batch.map((s) => s.id));
			for (const [i, pushed] of batch.entries()) {
				const now = current[i];
				if (!now) continue;
				// Changed again while the request was running: stays dirty for the next round.
				const clean = now.updatedAt === pushed.updatedAt;
				if (clean) cleaned++;
				await db.sightings.update(pushed.id, clean ? { dirty: 0, userId } : { userId });
			}
		});
		// The server kept a newer version of these: take it.
		await applyRemote(db, rejected, userId);
		sent += batch.length;
		if (cleaned === 0) return sent; // only rows edited mid-flight; the next sync takes them
	}
}

/** Pulls changes made elsewhere and moves the cursor. */
export async function pull(db: SpzDatabase, remote: Remote, userId: string): Promise<number> {
	const cursor = await getMeta<string>(db, CURSOR_KEY);
	const since = cursor ? new Date(Date.parse(cursor) - PULL_OVERLAP_MS).toISOString() : null;
	const rows = await pullAll(remote, since);
	const applied = await applyRemote(db, rows, userId);
	const next = maxCursor(rows, cursor);
	if (next !== cursor) await db.meta.put({ key: CURSOR_KEY, value: next });
	return applied;
}

/** One full sync round: push local changes, then pull the others. */
export async function syncOnce(db: SpzDatabase, remote: Remote, userId: string) {
	const pushed = await push(db, remote, userId);
	const pulled = await pull(db, remote, userId);
	return { pushed, pulled };
}

/** Local sightings not (yet) in the account: never synced, or kept at sign-out. */
function notInAccount(db: SpzDatabase, userId: string): Promise<Sighting[]> {
	return db.sightings.filter((s) => s.userId !== userId).toArray();
}

export interface SignInCheck {
	comparison: Comparison;
	/** All rows of the account, fetched once and reused by `resolveSignIn`. */
	remoteRows: RemoteRow[];
}

/** Step 1 of sign-in: compare this device's data with the account's, without changing anything. */
export async function checkSignIn(db: SpzDatabase, remote: Remote, userId: string): Promise<SignInCheck> {
	const remoteRows = await pullAll(remote, null);
	const local = await notInAccount(db, userId);
	return { comparison: compareSightings(local, remoteRows), remoteRows };
}

/**
 * Step 2 of sign-in: combine (merge), keep only the account's data (cloud) or
 * make this device's data the account's (device). Afterwards the device is
 * linked to the account and normal syncs run.
 */
export async function resolveSignIn(
	db: SpzDatabase,
	remote: Remote,
	userId: string,
	choice: SignInChoice,
	remoteRows: RemoteRow[]
): Promise<void> {
	const local = await notInAccount(db, userId);
	const live = local.filter((s) => s.deleted === 0);

	if (choice === 'device') {
		const now = Date.now();
		const mine = live.map((s) => ({ ...s, userId, updatedAt: nextUpdatedAt(s, now) }));
		await remote.replace(mine.map(toRow));
		await db.transaction('rw', db.sightings, async () => {
			await db.sightings.bulkDelete(local.filter((s) => s.deleted === 1).map((s) => s.id));
			await db.sightings.bulkPut(mine.map((s) => ({ ...s, dirty: 0 as const })));
		});
		// Re-read the account: the soft-deleted rows and the new server timestamps.
		const after = await pullAll(remote, null);
		await applyRemote(db, after, userId);
		await linkAccount(db, userId, maxCursor(after));
		return;
	}

	await db.transaction('rw', db.sightings, async () => {
		if (choice === 'cloud') {
			await db.sightings.bulkDelete(local.map((s) => s.id));
		} else {
			// merge: local entries the account already has are dropped as duplicates
			const remoteKeys = new Set(remoteRows.filter((r) => !r.deleted).map((r) => sightingKey(fromRow(r, userId))));
			const drop = local.filter((s) => s.deleted === 1 || remoteKeys.has(sightingKey(s)));
			await db.sightings.bulkDelete(drop.map((s) => s.id));
			const keep = live.filter((s) => !remoteKeys.has(sightingKey(s)));
			await db.sightings.bulkPut(keep.map((s) => ({ ...s, userId, dirty: 1 as const })));
		}
	});
	await applyRemote(db, remoteRows, userId);
	await linkAccount(db, userId, maxCursor(remoteRows));
	if (choice === 'merge') await push(db, remote, userId);
}

async function linkAccount(db: SpzDatabase, userId: string, cursor: string | null) {
	await db.meta.bulkPut([
		{ key: ACCOUNT_KEY, value: userId },
		{ key: CURSOR_KEY, value: cursor }
	]);
}

/** Local changes not on the server yet (sign-out is blocked while there are any). */
export function unsyncedCount(db: SpzDatabase, userId: string): Promise<number> {
	return unsynced(db, userId).count();
}

/**
 * Local part of signing out. `keep`: the sightings stay as local-only data
 * with new ids (so they can later go into any account without clashing with
 * this account's rows); otherwise they are removed from this device.
 */
export async function signOutLocal(db: SpzDatabase, keep: boolean): Promise<void> {
	await db.transaction('rw', db.sightings, db.meta, async () => {
		if (keep) {
			const all = await db.sightings.toArray();
			await db.sightings.clear();
			await db.sightings.bulkAdd(
				all
					.filter((s) => s.deleted === 0)
					.map((s) => ({ ...s, id: crypto.randomUUID(), userId: null, dirty: 1 as const }))
			);
		} else {
			await db.sightings.clear();
		}
		await db.meta.bulkDelete([ACCOUNT_KEY, CURSOR_KEY]);
	});
}
