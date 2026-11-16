import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpzDatabase } from '../db/db';
import { addSighting, deleteSighting, listSightings, updateSighting } from '../db/sightings';
import {
	checkSignIn,
	PULL_PAGE,
	resolveSignIn,
	signOutLocal,
	syncedAccount,
	syncOnce,
	unsyncedCount
} from './engine';
import { FakeServer } from './fake-remote';

const ALICE = 'aaaaaaaa-0000-0000-0000-000000000001';
const BOB = 'bbbbbbbb-0000-0000-0000-000000000002';

let server: FakeServer;
const dbs: SpzDatabase[] = [];

function device(): SpzDatabase {
	const db = new SpzDatabase(`sync-${crypto.randomUUID()}`);
	dbs.push(db);
	return db;
}

/** A device signed in as `userId` with nothing local (sign-in already resolved). */
async function signedIn(userId: string): Promise<SpzDatabase> {
	const db = device();
	const remote = server.remote(userId);
	const check = await checkSignIn(db, remote, userId);
	await resolveSignIn(db, remote, userId, 'merge', check.remoteRows);
	return db;
}

const plates = async (db: SpzDatabase) => (await listSightings(db)).map((s) => s.plate).sort();

beforeEach(() => {
	server = new FakeServer();
});

afterEach(async () => {
	await Promise.all(dbs.splice(0).map((db) => db.delete()));
});

describe('sync rounds', () => {
	it('pushes new sightings once and marks them clean', async () => {
		const db = await signedIn(ALICE);
		const s = await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'BA-123AB' }, db);
		expect(await unsyncedCount(db, ALICE)).toBe(1);

		expect((await syncOnce(db, server.remote(ALICE), ALICE)).pushed).toBe(1);
		expect(await db.sightings.get(s.id)).toMatchObject({ dirty: 0, userId: ALICE });
		expect(server.of(ALICE)).toHaveLength(1);
		expect(await unsyncedCount(db, ALICE)).toBe(0);
		expect((await syncOnce(db, server.remote(ALICE), ALICE)).pushed).toBe(0);
	});

	it('carries additions, edits and deletions between two devices', async () => {
		const phone = await signedIn(ALICE);
		const tablet = await signedIn(ALICE);
		const s = await addSighting({ collectionId: 'sk', regionCode: 'KE', plate: 'KE-111AA' }, phone);
		await syncOnce(phone, server.remote(ALICE), ALICE);
		await syncOnce(tablet, server.remote(ALICE), ALICE);
		expect(await plates(tablet)).toEqual(['KE-111AA']);

		await updateSighting(s.id, { note: 'D1' }, tablet);
		await syncOnce(tablet, server.remote(ALICE), ALICE);
		await syncOnce(phone, server.remote(ALICE), ALICE);
		expect((await phone.sightings.get(s.id))?.note).toBe('D1');

		await deleteSighting(s.id, phone);
		await syncOnce(phone, server.remote(ALICE), ALICE);
		await syncOnce(tablet, server.remote(ALICE), ALICE);
		expect(await plates(tablet)).toEqual([]);
	});

	it('keeps the newer of two concurrent edits on every device', async () => {
		const phone = await signedIn(ALICE);
		const tablet = await signedIn(ALICE);
		const s = await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'BA-123AB' }, phone);
		await syncOnce(phone, server.remote(ALICE), ALICE);
		await syncOnce(tablet, server.remote(ALICE), ALICE);

		await updateSighting(s.id, { note: 'older' }, phone);
		await tablet.sightings.update(s.id, { note: 'newer', updatedAt: Date.now() + 60_000, dirty: 1 });
		await syncOnce(tablet, server.remote(ALICE), ALICE);
		// The phone's push is rejected; it takes the server's newer version right away.
		await syncOnce(phone, server.remote(ALICE), ALICE);
		expect(await phone.sightings.get(s.id)).toMatchObject({ note: 'newer', dirty: 0 });
		expect(server.rows.get(s.id)?.note).toBe('newer');
	});

	it('a local edit beats the version it was made on, even with a clock behind', async () => {
		const phone = await signedIn(ALICE);
		const tablet = await signedIn(ALICE);
		const s = await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'BA-123AB' }, tablet);
		// The tablet's clock runs an hour ahead.
		await tablet.sightings.update(s.id, { updatedAt: Date.now() + 3_600_000 });
		await syncOnce(tablet, server.remote(ALICE), ALICE);
		await syncOnce(phone, server.remote(ALICE), ALICE);
		await updateSighting(s.id, { note: 'from phone' }, phone);
		await syncOnce(phone, server.remote(ALICE), ALICE);
		expect(server.rows.get(s.id)?.note).toBe('from phone');
	});

	it('keeps a sighting edited while its push is running dirty', async () => {
		const db = await signedIn(ALICE);
		const s = await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'BA-123AB' }, db);
		server.onPush = async () => {
			server.onPush = null;
			await updateSighting(s.id, { note: 'mid-flight' }, db);
		};
		await syncOnce(db, server.remote(ALICE), ALICE);
		expect((await db.sightings.get(s.id))?.dirty).toBe(1);
		await syncOnce(db, server.remote(ALICE), ALICE);
		expect(server.rows.get(s.id)?.note).toBe('mid-flight');
		expect((await db.sightings.get(s.id))?.dirty).toBe(0);
	});

	it('pulls more than one page', async () => {
		const phone = await signedIn(ALICE);
		const n = PULL_PAGE * 2 + 7;
		for (let i = 0; i < n; i++) {
			await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: `BA-${String(i).padStart(3, '0')}AA` }, phone);
		}
		await syncOnce(phone, server.remote(ALICE), ALICE);
		const tablet = await signedIn(ALICE);
		expect(await tablet.sightings.count()).toBe(n);
	});

	it('never shows one user the other user’s data', async () => {
		const alice = await signedIn(ALICE);
		await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'BA-123AB' }, alice);
		await syncOnce(alice, server.remote(ALICE), ALICE);
		const bob = await signedIn(BOB);
		expect(await bob.sightings.count()).toBe(0);
	});
});

describe('sign-in check', () => {
	async function cloudWith(userId: string, ...plateNumbers: string[]) {
		const db = await signedIn(userId);
		for (const plate of plateNumbers) await addSighting({ collectionId: 'sk', regionCode: plate.slice(0, 2), plate }, db);
		await syncOnce(db, server.remote(userId), userId);
	}

	async function deviceWith(...plateNumbers: string[]) {
		const db = device();
		for (const plate of plateNumbers) await addSighting({ collectionId: 'sk', regionCode: plate.slice(0, 2), plate }, db);
		return db;
	}

	it('asks nothing when the account is empty', async () => {
		const db = await deviceWith('BA-123AB');
		const check = await checkSignIn(db, server.remote(ALICE), ALICE);
		expect(check.comparison).toMatchObject({ local: 1, remote: 0, conflict: false });
	});

	it('asks nothing when the device is empty or both hold the same plates', async () => {
		await cloudWith(ALICE, 'BA-123AB', 'KE-111AA');
		expect((await checkSignIn(device(), server.remote(ALICE), ALICE)).comparison.conflict).toBe(false);
		const same = await deviceWith('KE 111 AA', 'ba-123ab');
		expect((await checkSignIn(same, server.remote(ALICE), ALICE)).comparison).toMatchObject({
			local: 2,
			remote: 2,
			conflict: false
		});
	});

	it('reports a conflict with counts when both sides differ', async () => {
		await cloudWith(ALICE, 'BA-123AB', 'KE-111AA');
		const db = await deviceWith('BA-123AB', 'NR-222BB', 'ZA-333CC');
		expect((await checkSignIn(db, server.remote(ALICE), ALICE)).comparison).toEqual({
			local: 3,
			remote: 2,
			onlyLocal: 2,
			onlyRemote: 1,
			conflict: true
		});
		// Checking changes nothing.
		expect(await syncedAccount(db)).toBeNull();
		expect(server.of(ALICE)).toHaveLength(2);
	});

	it('merge: combines both sides without duplicates', async () => {
		await cloudWith(ALICE, 'BA-123AB', 'KE-111AA');
		const db = await deviceWith('BA-123AB', 'NR-222BB');
		const check = await checkSignIn(db, server.remote(ALICE), ALICE);
		await resolveSignIn(db, server.remote(ALICE), ALICE, 'merge', check.remoteRows);
		expect(await plates(db)).toEqual(['BA-123AB', 'KE-111AA', 'NR-222BB']);
		expect(server.of(ALICE).map((r) => r.plate).sort()).toEqual(['BA-123AB', 'KE-111AA', 'NR-222BB']);
		expect(await syncedAccount(db)).toBe(ALICE);
		expect(await unsyncedCount(db, ALICE)).toBe(0);
	});

	it('cloud: replaces the device’s data with the account’s', async () => {
		await cloudWith(ALICE, 'BA-123AB', 'KE-111AA');
		const db = await deviceWith('NR-222BB');
		const check = await checkSignIn(db, server.remote(ALICE), ALICE);
		await resolveSignIn(db, server.remote(ALICE), ALICE, 'cloud', check.remoteRows);
		expect(await plates(db)).toEqual(['BA-123AB', 'KE-111AA']);
		expect(server.of(ALICE).filter((r) => !r.deleted)).toHaveLength(2);
	});

	it('device: replaces the account’s data, also on the other devices', async () => {
		await cloudWith(ALICE, 'BA-123AB', 'KE-111AA');
		const other = await signedIn(ALICE);
		expect(await plates(other)).toEqual(['BA-123AB', 'KE-111AA']);

		const db = await deviceWith('NR-222BB', 'BA-123AB');
		const check = await checkSignIn(db, server.remote(ALICE), ALICE);
		await resolveSignIn(db, server.remote(ALICE), ALICE, 'device', check.remoteRows);
		expect(await plates(db)).toEqual(['BA-123AB', 'NR-222BB']);
		expect(server.of(ALICE).filter((r) => !r.deleted).map((r) => r.plate).sort()).toEqual(['BA-123AB', 'NR-222BB']);

		await syncOnce(other, server.remote(ALICE), ALICE);
		expect(await plates(other)).toEqual(['BA-123AB', 'NR-222BB']);
	});
});

describe('sign-out', () => {
	it('keep: data stays as local-only with new ids and can go into another account', async () => {
		const db = await signedIn(ALICE);
		const s = await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'BA-123AB' }, db);
		await syncOnce(db, server.remote(ALICE), ALICE);

		await signOutLocal(db, true);
		const [kept] = await db.sightings.toArray();
		expect(kept).toMatchObject({ plate: 'BA-123AB', userId: null, dirty: 1 });
		expect(kept.id).not.toBe(s.id);
		expect(await syncedAccount(db)).toBeNull();

		// Bob's account: no id clash with Alice's row on the server.
		const check = await checkSignIn(db, server.remote(BOB), BOB);
		await resolveSignIn(db, server.remote(BOB), BOB, 'merge', check.remoteRows);
		expect(server.of(BOB).map((r) => r.plate)).toEqual(['BA-123AB']);

		// Back to Alice: the kept copy is recognised as the same plate.
		await signOutLocal(db, true);
		const again = await checkSignIn(db, server.remote(ALICE), ALICE);
		expect(again.comparison.conflict).toBe(false);
		await resolveSignIn(db, server.remote(ALICE), ALICE, 'merge', again.remoteRows);
		expect(server.of(ALICE)).toHaveLength(1);
		expect(await db.sightings.count()).toBe(1);
	});

	it('remove: clears the device', async () => {
		const db = await signedIn(ALICE);
		await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'BA-123AB' }, db);
		await syncOnce(db, server.remote(ALICE), ALICE);
		await signOutLocal(db, false);
		expect(await db.sightings.count()).toBe(0);
		expect(await syncedAccount(db)).toBeNull();
	});
});
