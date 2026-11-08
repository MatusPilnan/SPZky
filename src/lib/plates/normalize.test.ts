import { describe, expect, it } from 'vitest';
import { normalizePlate } from './normalize';

describe('normalizePlate', () => {
	it('uppercases and strips separators', () => {
		expect(normalizePlate('ba-123 ab')).toBe('BA123AB');
		expect(normalizePlate(' 5T2 1234 ')).toBe('5T21234');
		expect(normalizePlate('BN 12-34')).toBe('BN1234');
	});

	it('drops diacritics instead of the whole letter', () => {
		expect(normalizePlate('čA-123ŠŽ')).toBe('CA123SZ');
	});

	it('returns empty string for input without letters or digits', () => {
		expect(normalizePlate(' - . ')).toBe('');
	});
});
