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
		expect(size).toEqual({ sk: 93, cz: 14, 'cz-vintage': 96 });
	});

	it('maps CZ numeric codes 01–14 to letters', () => {
		expect(czNumericToLetter['01']).toBe('A');
		expect(czNumericToLetter['04']).toBe('E');
		expect(czNumericToLetter['14']).toBe('Z');
		expect(Object.keys(czNumericToLetter)).toHaveLength(14);
	});
});
