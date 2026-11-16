import { describe, expect, it } from 'vitest';
import { collections } from '../collections';
import { czNumericToLetter } from './cz';

describe('collection data', () => {
	it.each(collections.map((c) => [c.id, c] as const))('%s has unique, well-formed codes', (_, c) => {
		const codes = c.regions.map((r) => r.code);
		expect(new Set(codes).size).toBe(codes.length);
		for (const r of c.regions) {
			expect(r.code).toMatch(/^[A-ZÄÖÜ]{1,3}$/);
			expect(r.name.trim()).not.toBe('');
		}
	});

	it('has the expected sizes', () => {
		const size = Object.fromEntries(collections.map((c) => [c.id, c.regions.length]));
		expect(size).toEqual({ sk: 74, cz: 14, 'cz-vintage': 96, at: 106, 'at-vintage': 11, pl: 441, 'pl-vintage': 165, de: 714, ua: 107, 'ua-vintage': 105 });
	});

	it('Ukraine: four codes per region (KK only for Kyiv), no online/national series', () => {
		const ua = collections.find((c) => c.id === 'ua')!.regions;
		const byName = new Map<string, string[]>();
		for (const r of ua) byName.set(r.name, [...(byName.get(r.name) ?? []), r.code]);
		expect(byName.size).toBe(27);
		expect(byName.get('Kyiv')!.sort()).toEqual(['AA', 'KA', 'KK', 'TT']);
		expect(byName.get('AR Krym')!.sort()).toEqual(['AK', 'MK', 'TK']);
		for (const [name, codes] of byName) if (name !== 'AR Krym') expect(codes).toHaveLength(4);
		for (const code of ['DI', 'PD', 'ED', 'DC', 'II', 'BP']) expect(ua.map((r) => r.code)).not.toContain(code);
		// Only the 12 Latin-looking Cyrillic letters.
		for (const r of ua) expect(r.code).toMatch(/^[ABCEHIKMOPTX]{2}$/);
	});

	it('Germany: district codes incl. reintroduced ones, no authority series', () => {
		const de = collections.find((c) => c.id === 'de')!.regions.map((r) => r.code);
		for (const code of ['BD', 'BP', 'BW', 'THW', 'X', 'Y', 'BBL', 'NRW', 'LSA']) expect(de).not.toContain(code);
		// Current, reintroduced, with umlauts, shared by city and district.
		for (const code of ['B', 'M', 'HH', 'MTL', 'HGW', 'ANK', 'MÜ', 'MU', 'BÜS', 'A']) expect(de).toContain(code);
	});

	it('Poland: no never-used codes, secondary codes kept, every voivodeship letter valid', () => {
		const pl = collections.find((c) => c.id === 'pl')!.regions;
		const codes = pl.map((r) => r.code);
		// Marked "not in use" by pl.wikipedia, and STY (no such county).
		for (const code of ['BIB', 'SBN', 'CBC', 'KBA', 'PA', 'TKC', 'TKM', 'TKP', 'LVB', 'NOX', 'PX', 'WPX', 'RZR', 'ZZ', 'SWZ', 'DWW', 'VWW', 'STY']) {
			expect(codes).not.toContain(code);
		}
		for (const code of ['KK', 'JR', 'DX', 'VW', 'PY', 'MO', 'AE', 'WV', 'SRS', 'PKO', 'POZ', 'NOG']) expect(codes).toContain(code);
		expect(pl.filter((r) => r.name === 'Warszawa')).toHaveLength(16);
		expect(new Set(codes.map((c) => c[0]))).toEqual(new Set('DVCLFEKJWAORYBGXSITNPMZ'));
	});

	it('Poland before 2000: 49 voivodeships with 2–12 codes each', () => {
		const old = collections.find((c) => c.id === 'pl-vintage')!.regions;
		const byName = new Map<string, number>();
		for (const r of old) byName.set(r.name, (byName.get(r.name) ?? 0) + 1);
		expect(byName.size).toBe(49);
		expect(byName.get('Warszawa')).toBe(12);
		expect(byName.get('Katowice')).toBe(6);
	});

	it('Austria: regional codes only, merged districts kept, black plates separate', () => {
		const at = collections.find((c) => c.id === 'at')!.regions.map((r) => r.code);
		// Authority, diplomatic and consular series are not regional.
		for (const code of ['A', 'BB', 'BD', 'BG', 'BH', 'BP', 'FV', 'FW', 'JW', 'PT', 'ZW', 'WD', 'WK', 'GK', 'KK', 'LK', 'SK', 'TD', 'TK', 'VD']) {
			expect(at).not.toContain(code);
		}
		// Merged/dissolved districts: plates still on the road.
		for (const code of ['FB', 'FF', 'HB', 'JU', 'KF', 'MZ', 'RA', 'WU']) expect(at).toContain(code);
		// Black plates 1947–1989 are the bonus collection: states + Graz/Linz, not in the main list.
		for (const code of ['N', 'O', 'ST', 'T', 'V']) expect(at).not.toContain(code);
		const black = collections.find((c) => c.id === 'at-vintage')!.regions.map((r) => r.code);
		expect(black.sort()).toEqual(['B', 'G', 'K', 'L', 'N', 'O', 'S', 'ST', 'T', 'V', 'W']);
		// Bad Aussee was reinstated in 2025.
		expect(at).toContain('BA');
	});

	it('contains only Slovak codes that were actually issued (no reserved ones)', () => {
		const sk = collections.find((c) => c.id === 'sk')!.regions;
		const neverIssued = ['BD', 'BE', 'BI', 'BC', 'BK', 'KC', 'KI', 'LL', 'NI', 'NT', 'NC', 'PV', 'PS', 'TC', 'TE', 'TA', 'TB', 'ZI', 'ZL'];
		expect(sk.filter((r) => neverIssued.includes(r.code))).toEqual([]);
		// Only Bratislava ever used more than one code; every other district has exactly one.
		const codesOf = (name: string) => sk.filter((r) => r.name === name).map((r) => r.code);
		expect(codesOf('Bratislava')).toEqual(['BA', 'BL', 'BT']);
		const names = new Set(sk.map((r) => r.name));
		for (const name of names) if (name !== 'Bratislava') expect(codesOf(name)).toHaveLength(1);
	});

	it('maps CZ numeric codes 01–14 to letters', () => {
		expect(czNumericToLetter['01']).toBe('A');
		expect(czNumericToLetter['04']).toBe('E');
		expect(czNumericToLetter['14']).toBe('Z');
		expect(Object.keys(czNumericToLetter)).toHaveLength(14);
	});
});
