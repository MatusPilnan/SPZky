import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpzDatabase } from './db';
import { addSighting, deleteSighting, findByPlate, listSightings, updateSighting } from './sightings';

let db: SpzDatabase;

beforeEach(() => {
	db = new SpzDatabase(`test-${crypto.randomUUID()}`);
});

afterEach(async () => {
	await db.delete();
});

describe('sightings repository', () => {
	it('adds a sighting with normalized plate and sync metadata', async () => {
		const s = await addSighting({ collectionId: 'sk', regionCode: 'ba', plate: ' ba-123 ab ' }, db);
		expect(s).toMatchObject({
			collectionId: 'sk',
			regionCode: 'BA',
			plate: 'ba-123 ab',
			plateNormalized: 'BA123AB',
			deleted: 0,
			dirty: 1,
			userId: null,
			location: null,
			note: ''
		});
		expect(s.id).toMatch(/^[0-9a-f-]{36}$/);
		expect(await db.sightings.get(s.id)).toEqual(s);
	});

	it('stores locations coming from reactive proxies (Svelte $state)', async () => {
		const proxied = new Proxy({ lat: 48.1, lng: 17.1, accuracy: 10 }, {});
		const s = await addSighting({ collectionId: 'sk', regionCode: 'BA', location: proxied }, db);
		expect((await db.sightings.get(s.id))?.location).toEqual({ lat: 48.1, lng: 17.1, accuracy: 10 });
		await updateSighting(s.id, { location: new Proxy({ lat: 1, lng: 2, accuracy: null }, {}) }, db);
		expect((await db.sightings.get(s.id))?.location).toEqual({ lat: 1, lng: 2, accuracy: null });
	});

	it('stores nationwide plates with their type', async () => {
		const s = await addSighting({ collectionId: 'sk', regionCode: null, plateType: 'ev', plate: 'EL-123AB' }, db);
		expect(await db.sightings.get(s.id)).toMatchObject({ regionCode: null, plateType: 'ev', plateNormalized: 'EL123AB' });
	});

	it('rejects nationwide plates without a valid nationwide type', async () => {
		await expect(addSighting({ collectionId: 'sk', regionCode: null }, db)).rejects.toThrow('nationwide');
		await expect(addSighting({ collectionId: 'cz', regionCode: null, plateType: 'sk-2023' }, db)).rejects.toThrow();
		await expect(addSighting({ collectionId: 'cz-vintage', regionCode: null, plateType: 'ev' }, db)).rejects.toThrow();
		const s = await addSighting({ collectionId: 'sk', regionCode: 'BA' }, db);
		await expect(updateSighting(s.id, { regionCode: null }, db)).rejects.toThrow('nationwide');
		await updateSighting(s.id, { regionCode: null, plateType: 'sk-2023' }, db);
		expect((await db.sightings.get(s.id))?.regionCode).toBeNull();
	});

	it('stores quick entries without a plate', async () => {
		const s = await addSighting({ collectionId: 'cz', regionCode: 'A', plate: '  ' }, db);
		expect(s.plate).toBeNull();
		expect(s.plateNormalized).toBeNull();
	});

	it('lists non-deleted sightings newest first', async () => {
		const a = await addSighting({ collectionId: 'sk', regionCode: 'BA', seenAt: 1000 }, db);
		const b = await addSighting({ collectionId: 'sk', regionCode: 'KE', seenAt: 3000 }, db);
		const c = await addSighting({ collectionId: 'sk', regionCode: 'ZA', seenAt: 2000 }, db);
		await deleteSighting(c.id, db);
		expect((await listSightings(db)).map((s) => s.id)).toEqual([b.id, a.id]);
	});

	it('soft-deletes and marks dirty', async () => {
		const s = await addSighting({ collectionId: 'sk', regionCode: 'BA' }, db);
		await db.sightings.update(s.id, { dirty: 0 });
		await deleteSighting(s.id, db);
		const stored = await db.sightings.get(s.id);
		expect(stored?.deleted).toBe(1);
		expect(stored?.dirty).toBe(1);
	});

	it('updates and re-normalizes plate', async () => {
		const s = await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'BA123AB' }, db);
		await updateSighting(s.id, { plate: 'ke-999 zz', regionCode: 'ke', note: ' hi ' }, db);
		const stored = await db.sightings.get(s.id);
		expect(stored).toMatchObject({ plate: 'ke-999 zz', plateNormalized: 'KE999ZZ', regionCode: 'KE', note: 'hi' });
		expect(stored!.updatedAt).toBeGreaterThanOrEqual(s.updatedAt);
	});

	it('throws when updating a missing sighting', async () => {
		await expect(updateSighting('nope', { note: 'x' }, db)).rejects.toThrow('not found');
		await expect(deleteSighting('nope', db)).rejects.toThrow('not found');
	});

	it('finds duplicates regardless of formatting, ignoring deleted', async () => {
		const a = await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'BA-123AB' }, db);
		const b = await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'ba 123 ab' }, db);
		await deleteSighting(b.id, db);
		expect((await findByPlate('BA123AB', db)).map((s) => s.id)).toEqual([a.id]);
		expect(await findByPlate('---', db)).toEqual([]);
	});
});

describe('schema upgrade v1 → v2', () => {
	it('fills plateType for existing sightings', async () => {
		const name = `upgrade-${crypto.randomUUID()}`;
		const v1 = new Dexie(name);
		v1.version(1).stores({
			sightings: 'id, collectionId, [collectionId+regionCode], plateNormalized, seenAt, updatedAt, dirty'
		});
		const base = { seenAt: 1, location: null, note: '', createdAt: 1, updatedAt: 1, deleted: 0, userId: null, dirty: 0 };
		await v1.table('sightings').bulkAdd([
			{ ...base, id: 'a', collectionId: 'sk', regionCode: 'BA', plate: 'BA-123AB', plateNormalized: 'BA123AB' },
			{ ...base, id: 'b', collectionId: 'sk', regionCode: 'ZA', plate: 'ZA-HELLO', plateNormalized: 'ZAHELLO' },
			{ ...base, id: 'c', collectionId: 'sk', regionCode: 'KE', plate: null, plateNormalized: null },
			{ ...base, id: 'd', collectionId: 'sk', regionCode: 'ZA', plate: '1234567', plateNormalized: '1234567' }
		]);
		v1.close();

		const v2 = new SpzDatabase(name);
		const types = Object.fromEntries((await v2.sightings.toArray()).map((s) => [s.id, s.plateType]));
		expect(types).toEqual({ a: 'sk-district', b: 'sk-district-special', c: null, d: null });
		await v2.delete();
	});
});

describe('schema upgrade v2 → v3', () => {
	it('re-detects sightings saved under SK codes that were never issued', async () => {
		const name = `upgrade3-${crypto.randomUUID()}`;
		const v2 = new Dexie(name);
		const stores = { sightings: 'id, collectionId, [collectionId+regionCode], plateNormalized, seenAt, updatedAt, dirty' };
		v2.version(1).stores(stores);
		v2.version(2).stores(stores);
		const base = { seenAt: 1, location: null, note: '', createdAt: 1, updatedAt: 1, deleted: 0, userId: null, dirty: 0 };
		await v2.table('sightings').bulkAdd([
			// BD was only reserved: as a standard plate it is a post-2023 nationwide plate
			{ ...base, id: 'bd', collectionId: 'sk', regionCode: 'BD', plateType: 'sk-district', plate: 'BD-123AB', plateNormalized: 'BD123AB' },
			{ ...base, id: 'ta', collectionId: 'sk', regionCode: 'TA', plateType: 'sk-district-special', plate: 'TA-HELLO', plateNormalized: 'TAHELLO' },
			// quick tap on a removed code: nothing to re-detect, left for the user to fix
			{ ...base, id: 'kc', collectionId: 'sk', regionCode: 'KC', plateType: null, plate: null, plateNormalized: null },
			// valid data is untouched
			{ ...base, id: 'ba', collectionId: 'sk', regionCode: 'BA', plateType: 'sk-district', plate: 'BA-123AB', plateNormalized: 'BA123AB' }
		]);
		v2.close();

		const v3 = new SpzDatabase(name);
		const rows = Object.fromEntries((await v3.sightings.toArray()).map((s) => [s.id, s]));
		expect(rows.bd).toMatchObject({ regionCode: null, plateType: 'sk-2023', dirty: 1 });
		expect(rows.ta).toMatchObject({ regionCode: null, plateType: 'sk-personalized', dirty: 1 });
		expect(rows.kc).toMatchObject({ regionCode: 'KC', plateType: null, dirty: 0 });
		expect(rows.ba).toMatchObject({ regionCode: 'BA', plateType: 'sk-district', dirty: 0, updatedAt: 1 });
		await v3.delete();
	});
});
