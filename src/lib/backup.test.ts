import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, BackupError, backupFileName, exportBackup, importBackup, parseBackup, previewImport } from './backup';
import { SpzDatabase } from './db/db';
import { addSighting, listSightings } from './db/sightings';

let db: SpzDatabase;
const others: SpzDatabase[] = [];

beforeEach(() => {
	db = new SpzDatabase(`backup-${crypto.randomUUID()}`);
});

afterEach(async () => {
	await Promise.all([db, ...others.splice(0)].map((d) => d.delete()));
});

function otherDevice() {
	const d = new SpzDatabase(`backup-${crypto.randomUUID()}`);
	others.push(d);
	return d;
}

const file = (sightings: unknown[], extra: object = {}) =>
	JSON.stringify({ app: 'spz-ky', format: BACKUP_FORMAT, appVersion: 'test', exportedAt: '2026-11-16T00:00:00Z', sightings, ...extra });

const entry = (over: object = {}) => ({
	collectionId: 'sk',
	regionCode: 'BA',
	plateType: 'sk-district',
	plate: 'BA-123AB',
	seenAt: '2026-11-01T10:00:00Z',
	createdAt: '2026-11-01T10:00:00Z',
	updatedAt: '2026-11-01T10:00:00Z',
	location: { lat: 48.1, lng: 17.1, accuracy: 10 },
	note: 'D1',
	...over
});

describe('export', () => {
	it('round-trips through a file into another device', async () => {
		await addSighting({ collectionId: 'sk', regionCode: 'BA', plateType: 'sk-district', plate: 'BA-123AB', location: { lat: 48.1, lng: 17.1, accuracy: 5 }, note: 'D1' }, db);
		await addSighting({ collectionId: 'sk', regionCode: null, plateType: 'ev', plate: 'EL-123AB' }, db);
		await addSighting({ collectionId: 'cz', regionCode: 'A' }, db); // quick entry
		const deleted = await addSighting({ collectionId: 'sk', regionCode: 'KE', plate: 'KE-111AA' }, db);
		await db.sightings.update(deleted.id, { deleted: 1 });

		const text = JSON.stringify(await exportBackup(db, '0.6.0'));
		const target = otherDevice();
		const parsed = parseBackup(text);
		expect(parsed).toMatchObject({ skipped: 0 });
		expect(await importBackup(target, parsed, 'add')).toEqual({ added: 3, removed: 0 });

		const strip = (list: Awaited<ReturnType<typeof listSightings>>) =>
			list
				.map(({ collectionId, regionCode, plateType, plate, plateNormalized, seenAt, location, note, createdAt }) => ({
					collectionId, regionCode, plateType, plate, plateNormalized, seenAt, location, note, createdAt
				}))
				.sort((a, b) => `${a.collectionId}${a.plate}`.localeCompare(`${b.collectionId}${b.plate}`));
		expect(strip(await listSightings(target))).toEqual(strip(await listSightings(db)));
	});

	it('names the file by date', () => {
		expect(backupFileName(new Date(2026, 0, 5))).toBe('spz-ky-2026-01-05.json');
	});
});

describe('parseBackup', () => {
	it('rejects files that are not ŠPZ-ky backups', () => {
		for (const text of ['not json', '[]', '{}', JSON.stringify({ app: 'other', format: 1, sightings: [] })]) {
			expect(() => parseBackup(text)).toThrow(BackupError);
		}
	});

	it('reports files from a newer app version', () => {
		expect(() => parseBackup(file([], { format: BACKUP_FORMAT + 1 }))).toThrow(expect.objectContaining({ reason: 'newer' }));
	});

	it('skips entries it cannot use and keeps the rest', () => {
		const parsed = parseBackup(
			file([
				entry(),
				entry({ collectionId: 'de' }), // unknown country
				entry({ regionCode: 'XX', plate: null }), // unknown region, nothing to re-detect
				entry({ regionCode: null, plateType: 'cz-personalized' }), // not a nationwide type of SK
				entry({ seenAt: 'yesterday' }),
				'garbage'
			])
		);
		expect(parsed.sightings).toHaveLength(1);
		expect(parsed.skipped).toBe(5);
	});

	it('re-detects removed region codes and recomputes plate data', () => {
		const [bd, ba] = parseBackup(
			file([
				entry({ regionCode: 'BD', plate: 'BD-123AB' }), // reserved code, never issued → nationwide since 2023
				entry({ plateType: 'made-up', plate: ' ba 123 ab ', location: { lat: 999, lng: 1 } })
			])
		).sightings;
		expect(bd).toMatchObject({ regionCode: null, plateType: 'sk-2023' });
		expect(ba).toMatchObject({ plateType: 'sk-district', plate: 'ba 123 ab', plateNormalized: 'BA123AB', location: null });
	});
});

describe('import', () => {
	it('preview counts what is new', async () => {
		await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'BA-123AB' }, db);
		const parsed = parseBackup(file([entry(), entry({ plate: 'BA-999ZZ' }), entry({ plate: 'BA-999ZZ' }), { bad: true }]));
		expect(await previewImport(db, parsed)).toEqual({ total: 3, fresh: 1, skipped: 1, local: 1 });
	});

	it('add: skips plates already on the device', async () => {
		await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'BA-123AB' }, db);
		const result = await importBackup(db, parseBackup(file([entry(), entry({ plate: 'BA-999ZZ' })])), 'add');
		expect(result).toEqual({ added: 1, removed: 0 });
		expect((await listSightings(db)).map((s) => s.plate).sort()).toEqual(['BA-123AB', 'BA-999ZZ']);
	});

	it('imported plates get new ids and are pending sync', async () => {
		const now = Date.parse('2026-11-16T12:00:00Z');
		await importBackup(db, parseBackup(file([entry()])), 'add', now);
		const [s] = await db.sightings.toArray();
		expect(s).toMatchObject({ userId: null, dirty: 1, deleted: 0, updatedAt: now, createdAt: Date.parse('2026-11-01T10:00:00Z') });
		expect(s.id).toMatch(/^[0-9a-f-]{36}$/);
	});

	it('replace: removes local-only plates and turns synced ones into deletions to sync', async () => {
		const local = await addSighting({ collectionId: 'sk', regionCode: 'KE', plate: 'KE-111AA' }, db);
		const synced = await addSighting({ collectionId: 'sk', regionCode: 'NR', plate: 'NR-222BB' }, db);
		await db.sightings.update(synced.id, { userId: 'u1', dirty: 0 });

		const result = await importBackup(db, parseBackup(file([entry()])), 'replace');
		expect(result).toEqual({ added: 1, removed: 2 });
		expect(await db.sightings.get(local.id)).toBeUndefined();
		expect(await db.sightings.get(synced.id)).toMatchObject({ deleted: 1, dirty: 1 });
		expect((await listSightings(db)).map((s) => s.plate)).toEqual(['BA-123AB']);
	});

	it('replace with the same plate keeps it once', async () => {
		await addSighting({ collectionId: 'sk', regionCode: 'BA', plate: 'BA-123AB' }, db);
		await importBackup(db, parseBackup(file([entry()])), 'replace');
		expect((await listSightings(db)).map((s) => s.note)).toEqual(['D1']);
	});
});
