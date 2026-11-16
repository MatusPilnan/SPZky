import { describe, expect, it } from 'vitest';
import type { Sighting } from '../db/types';
import { compareSightings, fromRow, maxCursor, remoteWins, sightingKey, toRow, type RemoteRow } from './rows';

const base: Sighting = {
	id: '11111111-0000-0000-0000-000000000001',
	collectionId: 'sk',
	regionCode: 'BA',
	plateType: 'sk-district',
	plate: 'BA-123AB',
	plateNormalized: 'BA123AB',
	seenAt: Date.parse('2026-11-01T10:00:00Z'),
	location: { lat: 48.1, lng: 17.1, accuracy: 12 },
	note: 'D1',
	createdAt: Date.parse('2026-11-01T10:00:01Z'),
	updatedAt: Date.parse('2026-11-01T10:00:02Z'),
	deleted: 0,
	userId: null,
	dirty: 1
};

describe('row conversion', () => {
	it('round-trips a sighting', () => {
		expect(fromRow(toRow(base), 'u1')).toEqual({ ...base, userId: 'u1', dirty: 0 });
	});

	it('handles missing location and deletions', () => {
		const s: Sighting = { ...base, location: null, deleted: 1 };
		expect(toRow(s)).toMatchObject({ lat: null, lng: null, accuracy: null, deleted: true });
		expect(fromRow(toRow(s), 'u1')).toMatchObject({ location: null, deleted: 1 });
	});

	it('parses Postgres timestamps with microseconds', () => {
		const row = { ...toRow(base), updated_at: '2026-11-01T10:00:02.123456+00:00' };
		expect(fromRow(row, 'u1').updatedAt).toBe(Date.parse('2026-11-01T10:00:02.123Z'));
	});
});

describe('remoteWins', () => {
	const row = (updated: number, deleted = false): RemoteRow => ({
		...toRow(base),
		updated_at: new Date(updated).toISOString(),
		deleted
	});

	it('takes new rows but not deletions of unknown ones', () => {
		expect(remoteWins(undefined, row(base.updatedAt))).toBe(true);
		expect(remoteWins(undefined, row(base.updatedAt, true))).toBe(false);
	});

	it('takes newer rows, keeps newer local changes', () => {
		expect(remoteWins(base, row(base.updatedAt + 1))).toBe(true);
		expect(remoteWins(base, row(base.updatedAt - 1))).toBe(false);
	});

	it('on equal time, keeps a pending local change', () => {
		expect(remoteWins(base, row(base.updatedAt))).toBe(false);
		expect(remoteWins({ ...base, dirty: 0 }, row(base.updatedAt))).toBe(true);
	});
});

describe('compareSightings', () => {
	const quick = (seenAt: number): Sighting => ({ ...base, plate: null, plateNormalized: null, seenAt });

	it('matches typed plates by plate, quick entries by region and time', () => {
		expect(sightingKey(base)).toBe(sightingKey({ ...base, collectionId: 'cz' }));
		expect(sightingKey(quick(1))).not.toBe(sightingKey(quick(2)));
		expect(sightingKey({ ...quick(1), regionCode: null, plateType: 'ev' })).toBe('quick:sk:*ev:1');
	});

	it('ignores deleted sightings', () => {
		const remote = [toRow(base)];
		expect(compareSightings([{ ...base, deleted: 1 }], remote)).toMatchObject({ local: 0, conflict: false });
		expect(compareSightings([base], [{ ...toRow(base), deleted: true }])).toMatchObject({ remote: 0, conflict: false });
	});
});

describe('maxCursor', () => {
	it('picks the latest server timestamp, keeping the current one if later', () => {
		const r = (c: string): RemoteRow => ({ ...toRow(base), server_updated_at: c });
		expect(maxCursor([r('2026-11-01T10:00:00.000002+00:00'), r('2026-11-01T10:00:00.000010+00:00')])).toBe(
			'2026-11-01T10:00:00.000010+00:00'
		);
		expect(maxCursor([r('2026-11-01T10:00:00+00:00')], '2026-12-01T00:00:00+00:00')).toBe('2026-12-01T00:00:00+00:00');
		expect(maxCursor([])).toBeNull();
	});
});
