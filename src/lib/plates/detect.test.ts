import { describe, expect, it } from 'vitest';
import { detectPlate, type Detection } from './detect';

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

	it('treats non-district prefixes as 2023 state-wide plates without region', () => {
		expect(detectPlate('AA-123BC')).toEqual([
			{ type: 'no-region', country: 'SK', format: 'sk-2023', confidence: 'high' }
		]);
	});

	it('recognises EV plates as non-regional', () => {
		expect(first('EL-123AB')).toMatchObject({ type: 'no-region', format: 'ev' });
		expect(first('EV-456CD')).toMatchObject({ type: 'no-region', format: 'ev' });
	});

	it('detects special plates with a district code at medium confidence', () => {
		expect(first('BA-MA001')).toMatchObject({ regionCode: 'BA', format: 'sk-district-special', confidence: 'medium' });
		expect(first('NR-M 001')).toMatchObject({ regionCode: 'NR', format: 'sk-district-special' });
		expect(first('TT-123 X')).toMatchObject({ regionCode: 'TT', format: 'sk-district-special' });
		expect(first('ZA-HELLO')).toMatchObject({ regionCode: 'ZA', format: 'sk-district-special' });
	});

	it('marks personalised plates without a district as no-region', () => {
		expect(first('XY-HELLO')).toMatchObject({ type: 'no-region', country: 'SK', format: 'sk-personalized' });
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

	it('flags personalised plates as non-regional', () => {
		expect(first('JIRKA123')).toMatchObject({ type: 'no-region', country: 'CZ', format: 'cz-personalized' });
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

	it('orders region matches before no-region ones and by confidence', () => {
		const result = detectPlate('BA-123AB');
		expect(result[0].type).toBe('region');
	});
});
