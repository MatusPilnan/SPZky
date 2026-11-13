import { describe, expect, it } from 'vitest';
import { detectPlate, orderByCountry, spansCountries, type Detection } from './detect';

function regions(raw: string) {
	return detectPlate(raw)
		.filter((d): d is Extract<Detection, { type: 'region' }> => d.type === 'region')
		.map((d) => `${d.collectionId}:${d.regionCode}`);
}

function first(raw: string) {
	return detectPlate(raw)[0];
}

describe('detectPlate: Slovakia', () => {
	it('detects standard district plates in any formatting', () => {
		for (const raw of ['BA-123AB', 'ba 123 ab', 'BA123AB']) {
			expect(first(raw)).toMatchObject({
				type: 'region',
				collectionId: 'sk',
				regionCode: 'BA',
				format: 'sk-district',
				confidence: 'high'
			});
		}
		expect(regions('KE-999ZZ')).toEqual(['sk:KE']);
		expect(regions('ZV 001 YA')).toEqual(['sk:ZV']); // trailer
	});

	it('treats non-district prefixes as nationwide plates since 2023', () => {
		expect(detectPlate('AA-123BC')).toEqual([
			{ type: 'nationwide', collectionId: 'sk', format: 'sk-2023', confidence: 'high' }
		]);
	});

	it('recognises EV plates: EV is Slovak only, EL could be either country', () => {
		expect(detectPlate('EV-456CD')).toEqual([{ type: 'nationwide', collectionId: 'sk', format: 'ev', confidence: 'high' }]);
		expect(detectPlate('EL-123AB')).toEqual([
			{ type: 'nationwide', collectionId: 'sk', format: 'ev', confidence: 'high' },
			{ type: 'nationwide', collectionId: 'cz', format: 'ev', confidence: 'high' }
		]);
	});

	it('detects special plates with a district code at medium confidence', () => {
		expect(first('BA-MA001')).toMatchObject({ regionCode: 'BA', format: 'sk-district-special', confidence: 'medium' });
		expect(first('NR-M 001')).toMatchObject({ regionCode: 'NR', format: 'sk-district-special' });
		expect(first('TT-123 X')).toMatchObject({ regionCode: 'TT', format: 'sk-district-special' });
		expect(first('ZA-HELLO')).toMatchObject({ regionCode: 'ZA', format: 'sk-district-special' });
	});

	it('marks personalised plates without a district as nationwide', () => {
		expect(first('XY-HELLO')).toMatchObject({ type: 'nationwide', collectionId: 'sk', format: 'sk-personalized' });
	});
});

describe('detectPlate: Czechia', () => {
	it('reads the region letter of standard plates', () => {
		expect(first('1A2 3456')).toMatchObject({
			type: 'region',
			collectionId: 'cz',
			regionCode: 'A',
			format: 'cz-standard',
			confidence: 'high'
		});
		expect(regions('5T2 1234')).toEqual(['cz:T']);
		expect(regions('2BC 1234')).toEqual(['cz:B']); // letter at position 3
	});

	it('rejects letters that are not region codes', () => {
		expect(regions('1X2 3456')).toEqual([]);
		expect(regions('1G2 3456')).toEqual([]);
	});

	it('maps historic plates via the numeric region code', () => {
		expect(first('01V 1234')).toMatchObject({ collectionId: 'cz', regionCode: 'A', format: 'cz-historic' });
		expect(first('14V 0001')).toMatchObject({ regionCode: 'Z' });
		expect(regions('15V 0001')).toEqual([]);
	});

	it('treats personalised plates as nationwide, respecting the forbidden letters', () => {
		expect(first('JIRKA123')).toMatchObject({ type: 'nationwide', collectionId: 'cz', format: 'cz-personalized' });
		expect(detectPlate('HOLKA123')).toEqual([]); // O is not allowed on CZ personalised plates
	});

	it('detects CZ EV plates (EL + 3 digits + 2 letters)', () => {
		expect(detectPlate('EL 012 AB').map((d) => `${d.collectionId}:${d.format}`)).toEqual(['sk:ev', 'cz:ev']);
		expect(detectPlate('EL 0123 A').every((d) => d.format !== 'ev')).toBe(true);
	});
});

describe('detectPlate: Czech pre-2001', () => {
	it('detects two- and three-letter district plates', () => {
		expect(first('BN 12-34')).toMatchObject({
			collectionId: 'cz-vintage',
			regionCode: 'BN',
			format: 'cz-vintage',
			confidence: 'high'
		});
		expect(regions('KOA 12-34')).toEqual(['cz-vintage:KO']);
	});

	it('collects all Prague A* codes as A, except government AA', () => {
		expect(regions('AK 12-34')).toEqual(['cz-vintage:A']);
		expect(regions('ABC 12-34')).toEqual(['cz-vintage:A']);
		expect(regions('AA 12-34')).toEqual([]);
	});

	it('ignores codes that never existed', () => {
		expect(regions('FI 12-34')).toEqual([]);
		expect(regions('QQ 12-34')).toEqual([]);
	});
});

describe('detectPlate: general', () => {
	it('returns nothing for short or unknown input', () => {
		expect(detectPlate('')).toEqual([]);
		expect(detectPlate('BA1')).toEqual([]);
		expect(detectPlate('123456789')).toEqual([]);
	});

	it('orders by confidence, regional before nationwide on a tie', () => {
		expect(detectPlate('BA-123AB')[0].type).toBe('region');
		expect(detectPlate('ZA-HELLO')[0]).toMatchObject({ type: 'region', confidence: 'medium' });
	});
});

describe('orderByCountry', () => {
	const el = detectPlate('EL-123AB'); // [sk, cz]
	const countries = (list: { collectionId: string }[]) => list.map((d) => d.collectionId).join(',');

	it('puts the GPS country first, then the last used one', () => {
		expect(countries(orderByCountry(el, ['CZ', 'SK']))).toBe('cz,sk');
		expect(countries(orderByCountry(el, [null, 'CZ']))).toBe('cz,sk'); // no GPS → last used
		expect(countries(orderByCountry(el, ['SK', 'CZ']))).toBe('sk,cz');
		expect(countries(orderByCountry(el, [undefined, null]))).toBe('sk,cz'); // default order
		expect(countries(orderByCountry(el, ['AT', 'CZ']))).toBe('cz,sk'); // unsupported GPS country ignored
	});

	it('leaves single-country results alone', () => {
		const ba = detectPlate('BA-123AB');
		expect(orderByCountry(ba, ['CZ'])).toBe(ba);
		expect(spansCountries(ba)).toBe(false);
		expect(spansCountries(el)).toBe(true);
	});

	it('treats the CZ pre-2001 bonus collection as Czechia', () => {
		const mixed = [{ collectionId: 'sk' }, { collectionId: 'cz-vintage' }];
		expect(countries(orderByCountry(mixed, ['CZ']))).toBe('cz-vintage,sk');
	});
});
