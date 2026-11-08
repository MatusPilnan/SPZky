import 'fake-indexeddb/auto';
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
