import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpzDatabase } from '../db/db';
import { addSighting, updateSighting } from '../db/sightings';
import { formatPlace, lookupPlace, resolvePlaces } from './place';

describe('formatPlace', () => {
	it('street with number and town', () => {
		expect(formatPlace({ road: 'Hlavná', house_number: '12', city: 'Košice', country: 'Slovensko' }, false)).toBe('Hlavná 12, Košice');
	});
	it('village without a street, or a road outside towns', () => {
		expect(formatPlace({ village: 'Lieskovec', county: 'okres Zvolen' }, false)).toBe('Lieskovec');
		expect(formatPlace({ road: 'D1', county: 'okres Senec' }, false)).toBe('D1, okres Senec');
	});
	it('only the town for an approximate location', () => {
		expect(formatPlace({ road: 'Hlavná', house_number: '12', town: 'Senec' }, true)).toBe('Senec');
	});
	it('empty when there is nothing usable', () => {
		expect(formatPlace({}, false)).toBe('');
	});
});

const response = (address: object) => new Response(JSON.stringify({ address }), { status: 200 });

describe('lookupPlace', () => {
	it('asks at street level, or town level for coarse fixes, in the place’s language', async () => {
		const urls: string[] = [];
		const fetcher = (async (url: string) => {
			urls.push(url);
			return response({ road: 'Hlavná', city: 'Košice' });
		}) as unknown as typeof fetch;
		expect(await lookupPlace({ lat: 48.72, lng: 21.26, accuracy: 10 }, fetcher)).toBe('Hlavná, Košice');
		expect(await lookupPlace({ lat: 50.08, lng: 14.44, accuracy: 2000 }, fetcher)).toBe('Košice');
		expect(urls[0]).toContain('zoom=18');
		expect(urls[0]).toContain('accept-language=sk');
		expect(urls[1]).toContain('zoom=10');
		expect(urls[1]).toContain('accept-language=cs');
	});

	it('throws when the service is unreachable or rate-limits, "" when it finds nothing', async () => {
		const failing = (async () => {
			throw new TypeError('Failed to fetch');
		}) as unknown as typeof fetch;
		await expect(lookupPlace({ lat: 1, lng: 1, accuracy: 5 }, failing)).rejects.toThrow();
		const limited = (async () => new Response('', { status: 429 })) as unknown as typeof fetch;
		await expect(lookupPlace({ lat: 1, lng: 1, accuracy: 5 }, limited)).rejects.toThrow();
		const nothing = (async () => new Response(JSON.stringify({ error: 'Unable to geocode' }), { status: 200 })) as unknown as typeof fetch;
		expect(await lookupPlace({ lat: 1, lng: 1, accuracy: 5 }, nothing)).toBe('');
	});
});

describe('resolvePlaces', () => {
	let db: SpzDatabase;
	beforeEach(() => {
		db = new SpzDatabase(`place-${crypto.randomUUID()}`);
	});
	afterEach(async () => {
		await db.delete();
	});

	it('saves the address of sightings with a location, once, as a change to sync', async () => {
		const here = await addSighting({ collectionId: 'sk', regionCode: 'KE', location: { lat: 48.72, lng: 21.26, accuracy: 10 } }, db);
		const nowhere = await addSighting({ collectionId: 'sk', regionCode: 'BA' }, db);
		await db.sightings.update(here.id, { dirty: 0 });
		let calls = 0;
		const fetcher = (async () => {
			calls++;
			return response({ road: 'Hlavná', city: 'Košice' });
		}) as unknown as typeof fetch;

		expect(await resolvePlaces(db, fetcher, 0)).toBe(1);
		expect(await db.sightings.get(here.id)).toMatchObject({ place: 'Hlavná, Košice', dirty: 1 });
		expect((await db.sightings.get(nowhere.id))?.place).toBeNull();
		expect(await resolvePlaces(db, fetcher, 0)).toBe(0);
		expect(calls).toBe(1);

		// Moving the location asks again.
		await updateSighting(here.id, { location: { lat: 48.15, lng: 17.11, accuracy: 10 } }, db);
		expect((await db.sightings.get(here.id))?.place).toBeNull();
		await resolvePlaces(db, fetcher, 0);
		expect(calls).toBe(2);
	});

	it('stops when the service is unavailable and keeps the rest for later', async () => {
		await addSighting({ collectionId: 'sk', regionCode: 'KE', location: { lat: 48.72, lng: 21.26, accuracy: 10 } }, db);
		const down = (async () => new Response('', { status: 503 })) as unknown as typeof fetch;
		expect(await resolvePlaces(db, down, 0)).toBe(0);
		expect((await db.sightings.toArray())[0].place).toBeNull();
	});
});
