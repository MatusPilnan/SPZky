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

	it('keeps German umlauts (they are distinct codes: MÜ ≠ MU)', () => {
		expect(normalizePlate('mü-ab 123')).toBe('MÜAB123');
		expect(normalizePlate('KÜN X 1')).toBe('KÜNX1');
		expect(normalizePlate('LÖ-A 1')).not.toBe(normalizePlate('LO-A 1'));
	});

	it('maps Cyrillic and Greek look-alike letters to Latin', () => {
		expect(normalizePlate('АА 1234 ВС')).toBe('AA1234BC'); // Ukrainian, typed in Cyrillic
		expect(normalizePlate('аа 1234 вс')).toBe('AA1234BC');
		expect(normalizePlate('123-45 КІ')).toBe('12345KI');
		expect(normalizePlate('ΥΧΝ 1234')).toBe('YXN1234'); // Greek
	});

	it('returns empty string for input without letters or digits', () => {
		expect(normalizePlate(' - . ')).toBe('');
	});
});
