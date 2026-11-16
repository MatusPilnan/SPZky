import { describe, expect, it } from 'vitest';
import { collections } from '../collections';
import { czNumericToLetter } from './cz';

describe('collection data', () => {
	it.each(collections.map((c) => [c.id, c] as const))('%s has unique, well-formed codes', (_, c) => {
		const codes = c.regions.map((r) => r.code);
		expect(new Set(codes).size).toBe(codes.length);
		for (const r of c.regions) {
			expect(r.code).toMatch(/^[A-Z]{1,2}$/);
			expect(r.name.trim()).not.toBe('');
		}
	});

	it('has the expected sizes', () => {
		const size = Object.fromEntries(collections.map((c) => [c.id, c.regions.length]));
		expect(size).toEqual({ sk: 74, cz: 14, 'cz-vintage': 96, at: 111 });
	});

	it('Austria: regional codes only, merged districts and black-plate state codes kept', () => {
		const at = collections.find((c) => c.id === 'at')!.regions.map((r) => r.code);
		// Authority, diplomatic and consular series are not regional.
		for (const code of ['A', 'BB', 'BD', 'BG', 'BH', 'BP', 'FV', 'FW', 'JW', 'PT', 'ZW', 'WD', 'WK', 'GK', 'KK', 'LK', 'SK', 'TD', 'TK', 'VD']) {
			expect(at).not.toContain(code);
		}
		// Merged/dissolved districts: plates still on the road.
		for (const code of ['FB', 'FF', 'HB', 'JU', 'KF', 'MZ', 'RA', 'WU']) expect(at).toContain(code);
		// Black plates 1947–1989.
		for (const code of ['N', 'O', 'ST', 'T', 'V']) expect(at).toContain(code);
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
