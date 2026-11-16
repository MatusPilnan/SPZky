import { describe, expect, it } from 'vitest';
import { detectPlate, isBareFrenchPlate, orderByCountry, spansCountries, type Detection } from './detect';

function regions(raw: string) {
	return detectPlate(raw)
		.filter((d): d is Extract<Detection, { type: 'region' }> => d.type === 'region')
		.map((d) => `${d.collectionId}:${d.regionCode}`);
}

function first(raw: string) {
	return detectPlate(raw)[0];
}

describe('detectPlate: Austria', () => {
	const at = (raw: string) =>
		detectPlate(raw)
			.filter((d) => d.collectionId.startsWith('at'))
			.map((d) => `${(d as { regionCode: string }).regionCode}:${d.format}`);

	it('standard plates: district code, digits, letters', () => {
		expect(at('W 12345 A')).toEqual(['W:at-standard']);
		expect(at('G-1234 XY')).toEqual(['G:at-standard']);
		expect(at('MD 123 AB')).toEqual(['MD:at-standard']);
		expect(at('KS 12 ABC')).toEqual(['KS:at-standard']);
	});

	it('personalised plates: letters then digits', () => {
		expect(at('W JOHN 1')).toEqual(['W:at-personalized']);
		expect(at('SL-ABC 12')).toEqual(['SL:at-personalized']);
	});

	it('uses a typed separator to split code and serial', () => {
		// Without it, BNABC1 could be Bregenz (B NABC1) or Baden (BN ABC1).
		expect(at('BNABC1').sort()).toEqual(['B:at-personalized', 'BN:at-personalized']);
		expect(at('BN ABC1')).toEqual(['BN:at-personalized']);
		expect(at('B NABC1')).toEqual(['B:at-personalized']);
	});

	it('black plates before 1990: state/city code + digits', () => {
		expect(at('W 123.456')).toEqual(['W:at-black']);
		expect(detectPlate('W 123.456')[0]).toMatchObject({ collectionId: 'at-vintage', regionCode: 'W' });
		expect(at('ST 12.345')).toEqual(['ST:at-black']);
		expect(at('O 999 A 99')).toEqual(['O:at-black']);
		// District codes never had black plates.
		expect(at('MD 12345')).toEqual([]);
	});

	it('merged-district codes are still recognised; authority codes are not', () => {
		expect(at('MZ 123 AB')).toEqual(['MZ:at-standard']);
		expect(at('WU 123 AB')).toEqual(['WU:at-standard']);
		expect(at('BH 12345')).toEqual([]); // army
		expect(at('WD 1234 A')).toEqual([]); // diplomatic
	});

	it('never uses Q in the serial', () => {
		expect(at('W 1234 Q')).toEqual([]);
	});
});

describe('detectPlate: Germany', () => {
	const de = (raw: string) =>
		detectPlate(raw)
			.filter((d) => d.collectionId === 'de')
			.map((d) => `${(d as { regionCode: string }).regionCode}:${d.format}`);

	it('district code, then 1–2 letters and 1–4 digits', () => {
		expect(de('B-MW 1234')).toEqual(['B:de-standard']);
		expect(de('M AB 123')).toEqual(['M:de-standard']);
		expect(de('HGW-X 1')).toEqual(['HGW:de-standard']);
	});

	it('E = electric, H = historic', () => {
		expect(de('B-EV 123E')).toEqual(['B:de-ev']);
		expect(de('M-OT 12H')).toEqual(['M:de-historic']);
	});

	it('umlaut codes are their own codes', () => {
		expect(de('MÜ-AB 12')).toEqual(['MÜ:de-standard']);
		expect(de('MU-AB 12')).toEqual(['MU:de-standard']);
	});

	it('without a separator, every split that fits is offered', () => {
		expect(de('BMW1234').sort()).toEqual(['B:de-standard', 'BM:de-standard']);
	});

	it('at most 8 characters', () => {
		expect(de('HGW-XY 1234')).toEqual([]);
	});
});

describe('detectPlate: Ukraine', () => {
	const ua = (raw: string) =>
		detectPlate(raw)
			.filter((d) => d.collectionId.startsWith('ua'))
			.map((d) => `${d.collectionId}:${(d as { regionCode: string }).regionCode}`);

	it('current plates, typed in Latin or Cyrillic', () => {
		expect(ua('AA 1234 BC')).toEqual(['ua:AA']);
		expect(ua('АА 1234 ВС')).toEqual(['ua:AA']); // Cyrillic
		expect(ua('ВС 0001 АО')).toEqual(['ua:BC']);
	});

	it('the series uses only Latin-looking letters', () => {
		expect(ua('AA 1234 ZZ')).toEqual([]);
	});

	it('1995–2004 plates: five digits and the region series', () => {
		expect(ua('123-45 КІ')).toEqual(['ua-vintage:KI']);
		expect(ua('123-45 PE')).toEqual(['ua-vintage:PE']); // Zakarpattia
	});
});

describe('detectPlate: France', () => {
	const fr = (raw: string) =>
		detectPlate(raw)
			.filter((d) => d.collectionId === 'fr')
			.map((d) => `${(d as { regionCode: string }).regionCode}:${d.format}`);

	it('SIV plates count with the department typed after them', () => {
		expect(fr('AB-123-CD 75')).toEqual(['75:fr-siv']);
		expect(fr('GH-456-JK 2A')).toEqual(['2A:fr-siv']);
		expect(fr('AB-123-CD 974')).toEqual(['974:fr-siv']);
	});

	it('a bare SIV plate has no department (the Add screen asks for it)', () => {
		expect(fr('AB-123-CD')).toEqual([]);
		expect(isBareFrenchPlate('AB-123-CD')).toBe(true);
		expect(isBareFrenchPlate('AB-123-CD 75')).toBe(false);
	});

	it('FNI plates end with the department', () => {
		expect(fr('1234 AB 75')).toEqual(['75:fr-fni']);
		expect(fr('123 ABC 13')).toEqual(['13:fr-fni']);
		expect(fr('12 AB 2B')).toEqual(['2B:fr-fni']);
		expect(fr('1234 AB 20')).toEqual([]); // Corsica before 1976: not collected
	});

	it('SIV never uses I, O, U', () => {
		expect(fr('AI-123-CD 75')).toEqual([]);
	});
});

describe('detectPlate: Bulgaria', () => {
	const bg = (raw: string) =>
		detectPlate(raw)
			.filter((d) => d.collectionId === 'bg')
			.map((d) => (d.type === 'region' ? `${d.regionCode}:${d.format}` : `*${d.format}`));

	it('province code + 4 digits + series, typed in Latin or Cyrillic', () => {
		expect(bg('CA 1234 AB')).toEqual(['CA:bg-standard']);
		expect(bg('СА 1234 АВ')).toEqual(['CA:bg-standard']); // Cyrillic
		expect(bg('A 1234 K')).toEqual(['A:bg-standard']); // Burgas, one-letter series
		expect(bg('TX 0001 PP')).toEqual(['TX:bg-standard']);
	});

	it('electric plates (EA/EM) have no province: nationwide', () => {
		expect(bg('EA 1234 AB')).toEqual(['*ev']);
		expect(bg('EM 1234 A')).toEqual(['*ev']);
	});

	it('same format as Ukrainian plates: CA is Sofia or Cherkasy', () => {
		const both = detectPlate('CA 1234 AB');
		expect(spansCountries(both)).toBe(true);
		expect(orderByCountry(both, ['BG'])[0]).toMatchObject({ collectionId: 'bg' });
		expect(orderByCountry(both, ['UA'])[0]).toMatchObject({ collectionId: 'ua' });
	});
});

describe('detectPlate: Romania', () => {
	const ro = (raw: string) =>
		detectPlate(raw)
			.filter((d) => d.collectionId === 'ro')
			.map((d) => (d as { regionCode: string }).regionCode);

	it('county + 2 digits + 3 letters; Bucharest with up to 3 digits', () => {
		expect(ro('CJ 12 ABC')).toEqual(['CJ']);
		expect(ro('B 123 XYZ')).toEqual(['B']);
		expect(ro('B 12 XYZ')).toEqual(['B']);
		expect(ro('CJ 123 ABC')).toEqual([]); // 3 digits only in Bucharest
	});

	it('letter groups never start with I or O and never use Q', () => {
		expect(ro('CJ 12 IAB')).toEqual([]);
		expect(ro('CJ 12 AQB')).toEqual([]);
	});
});

describe('detectPlate: Slovenia', () => {
	const si = (raw: string) =>
		detectPlate(raw)
			.filter((d) => d.collectionId === 'si')
			.map((d) => (d as { regionCode: string }).regionCode);

	it('area code + letters/digits with at least one digit', () => {
		expect(si('LJ 12-34A')).toEqual(['LJ']);
		expect(si('MB A1-234')).toEqual(['MB']);
		expect(si('LJ ABCD')).toEqual([]); // no digit
		expect(si('XX 12-34A')).toEqual([]); // not an area
	});
});

describe('detectPlate: Serbia', () => {
	const rs = (raw: string) =>
		detectPlate(raw)
			.filter((d) => d.collectionId === 'rs')
			.map((d) => `${(d as { regionCode: string }).regionCode}:${d.confidence}`);

	it('area + 3 digits + 2 letters; Belgrade with 4 digits', () => {
		expect(rs('NS 123-AB')).toEqual(['NS:high']);
		expect(rs('BG 1234-AB')).toEqual(['BG:high']);
		expect(rs('NS 1234-AB')).toEqual([]); // 4 digits only in Belgrade
	});

	it('codes with Serbian letters, typed with or without diacritics', () => {
		expect(rs('ČA 123-AB')).toEqual(['ČA:high']);
		expect(rs('CA 123-AB')).toEqual(['ČA:medium']);
		expect(rs('BČ 123-AB')).toEqual(['BČ:high']);
		expect(rs('BC 123-AB').sort()).toEqual(['BĆ:medium', 'BČ:medium']);
	});
});

describe('detectPlate: Greece', () => {
	const gr = (raw: string) =>
		detectPlate(raw)
			.filter((d) => d.collectionId === 'gr')
			.map((d) => (d as { regionCode: string }).regionCode);

	it('3 letters + 1000–9999 (cars) or 1–999 (motorcycles), typed in Greek or Latin', () => {
		expect(gr('ΙΚΗ-1234')).toEqual(['IK']);
		expect(gr('IKH 1234')).toEqual(['IK']);
		expect(gr('ΑΧΑ 12')).toEqual(['AX']);
		expect(gr('ΙΚΗ-0123')).toEqual([]); // no leading zero
		expect(gr('ΙΚΗ-12345')).toEqual([]);
		expect(gr('ABC 1234')).toEqual([]); // C is not a Greek-looking letter
	});

	it('ΚΟΗ/ΚΟΚ are Thessaloniki, the rest of ΚΟ Rhodope', () => {
		expect(gr('ΚΟΗ 1234')).toEqual(['KOH']);
		expect(gr('ΚΟΚ 1234')).toEqual(['KOK']);
		expect(gr('ΚΟΑ 1234')).toEqual(['KO']);
	});
});

describe('detectPlate: Switzerland', () => {
	const ch = (raw: string) =>
		detectPlate(raw)
			.filter((d) => d.collectionId === 'ch')
			.map((d) => (d as { regionCode: string }).regionCode);

	it('canton + up to 6 digits; 7 only in Zürich and Bern', () => {
		expect(ch('ZH 123456')).toEqual(['ZH']);
		expect(ch('AI 123')).toEqual(['AI']);
		expect(ch('AI 12')).toEqual([]); // under 5 characters: picked by hand
		expect(ch('BE 1234567')).toEqual(['BE']);
		expect(ch('VD 1234567')).toEqual([]);
		expect(ch('ZH 012345')).toEqual([]); // no leading zero
		expect(ch('FL 1234')).toEqual([]); // Liechtenstein is not a canton
	});

	it('SG is also a Slovenian area: both are offered', () => {
		const all = detectPlate('SG 12345').map((d) => d.collectionId);
		expect(all).toContain('ch');
		expect(all).toContain('si');
	});
});

describe('detectPlate: Kosovo', () => {
	const xk = (raw: string) =>
		detectPlate(raw)
			.filter((d) => d.collectionId === 'xk')
			.map((d) => (d as { regionCode: string }).regionCode);

	it('district 01–07 + 3 digits from 101 + 2 letters', () => {
		expect(xk('01 234-AB')).toEqual(['01']);
		expect(xk('07-101-KA')).toEqual(['07']);
		expect(xk('08 234-AB')).toEqual([]); // no such district
		expect(xk('01 034-AB')).toEqual([]); // numbers start at 101
	});
});

describe('detectPlate: Poland', () => {
	const pl = (raw: string) =>
		detectPlate(raw)
			.filter((d) => d.collectionId.startsWith('pl'))
			.map((d) => `${d.collectionId}:${(d as { regionCode: string }).regionCode}`);

	it('current plates: 2-letter codes + 5, 3-letter codes + 4 or 5 characters', () => {
		expect(pl('WA 12345')).toEqual(['pl:WA']);
		expect(pl('KR 1234A')).toEqual(['pl:KR']);
		expect(pl('DW 1A234')).toEqual(['pl:DW']);
		expect(pl('KRA 1A23')).toEqual(['pl:KRA']);
		expect(pl('WPI 12345')).toEqual(['pl:WPI']);
		expect(pl('GDA AC12')).toEqual(['pl:GDA']);
	});

	it('never uses B, D, I, O, Z in the serial', () => {
		expect(pl('WA 1234B')).toEqual([]);
		expect(pl('KRA 12OZ')).toEqual([]);
	});

	it('old black plates: area code + series letter + 4 digits (or 3 digits + letter)', () => {
		expect(pl('KRA 1234')).toEqual(['pl-vintage:KR']);
		expect(pl('WAB 123C')).toEqual(['pl-vintage:WA']);
		expect(detectPlate('KRA 1234').find((d) => d.collectionId === 'pl-vintage')?.format).toBe('pl-vintage');
	});

	it('old and current systems never match the same plate', () => {
		for (const raw of ['KRA 1234', 'KRA 1A23', 'WA 12345', 'POZ 12AC']) {
			const hits = pl(raw).map((h) => h.split(':')[0]);
			expect(new Set(hits).size).toBe(1);
		}
	});
});

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
		// Some of these also fit German plates (BA-MA001 = Bamberg); GPS orders them in the app.
		const sk = (raw: string) => detectPlate(raw).find((d) => d.collectionId === 'sk');
		expect(sk('BA-MA001')).toMatchObject({ regionCode: 'BA', format: 'sk-district-special', confidence: 'medium' });
		expect(sk('NR-M 001')).toMatchObject({ regionCode: 'NR', format: 'sk-district-special' });
		expect(sk('TT-123 X')).toMatchObject({ regionCode: 'TT', format: 'sk-district-special' });
		expect(sk('ZA-HELLO')).toMatchObject({ regionCode: 'ZA', format: 'sk-district-special' });
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
		// O is not allowed on CZ personalised plates (it is a valid Austrian wish plate of Horn, HO).
		expect(detectPlate('HOLKA123').filter((d) => d.collectionId === 'cz')).toEqual([]);
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
		// Same shape as an old Polish plate (Koszalin KO) and a Greek one (Rhodope ΚΟ): all are
		// offered, GPS decides the order.
		expect(regions('KOA 12-34')).toEqual(['cz-vintage:KO', 'pl-vintage:KO', 'gr:KO']);
		expect(spansCountries(detectPlate('KOA 12-34'))).toBe(true);
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

	it('orders SK/AT overlaps by the GPS country', () => {
		const ba = detectPlate('BA-123AB'); // Bratislava, or Bad Aussee
		expect(spansCountries(ba)).toBe(true);
		expect(orderByCountry(ba, ['SK'])[0]).toMatchObject({ collectionId: 'sk', regionCode: 'BA' });
		expect(orderByCountry(ba, ['AT'])[0]).toMatchObject({ collectionId: 'at', regionCode: 'BA' });
	});

	it('leaves single-country results alone', () => {
		const ke = detectPlate('KE-123AB'); // KE is not an Austrian code
		expect(orderByCountry(ke, ['CZ'])).toBe(ke);
		expect(spansCountries(ke)).toBe(false);
		expect(spansCountries(el)).toBe(true);
	});

	it('treats the CZ pre-2001 bonus collection as Czechia', () => {
		const mixed = [{ collectionId: 'sk' }, { collectionId: 'cz-vintage' }];
		expect(countries(orderByCountry(mixed, ['CZ']))).toBe('cz-vintage,sk');
	});
});
