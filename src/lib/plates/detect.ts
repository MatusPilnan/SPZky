import { countryOf, getRegion } from '../collections';
import { czNumericToLetter } from '../data/cz';
import { FR_DEPARTMENT } from '../data/fr';
import type { CollectionId, NationwideCollectionId } from '../data/types';
import { rsRegions } from '../data/rs';
import { foldPlate, normalizePlate } from './normalize';

/** Plate formats that encode a region. */
export type RegionFormat =
	/** SK standard XX-NNNLL with a district code (1997–2022). */
	| 'sk-district'
	/** SK dealer/official/temporary/personalised plates that start with a district code. */
	| 'sk-district-special'
	/** CZ standard since 2001: 1A2 3456, region letter at position 2. */
	| 'cz-standard'
	/** CZ historic vehicle: NNV XXXX, NN = numeric region code. */
	| 'cz-historic'
	/** CZ pre-2001: XX NN-NN / XXX NN-NN, first two letters = district. */
	| 'cz-vintage'
	/** AT standard: district code + digits then letters (BN 123 AB, W 12345 A). */
	| 'at-standard'
	/** AT personalised (Wunschkennzeichen): district code + letters then digits (W JOHN 1). */
	| 'at-personalized'
	/** AT black plate 1947–1989: state/city code + digits (W 123.456). */
	| 'at-black'
	/** PL since 2000: 2–3 letter county code + serial (WA 12345, KRA 1A23). */
	| 'pl-standard'
	/** PL 1976–2000 black plate: area code + series letter + 4 digits or 3 digits + letter. */
	| 'pl-vintage'
	/** DE: district code (1–3 letters) + 1–2 letters + 1–4 digits (B MW 1234). */
	| 'de-standard'
	/** DE electric vehicle: as standard, with a trailing E. */
	| 'de-ev'
	/** DE historic vehicle (30+ years): as standard, with a trailing H. */
	| 'de-historic'
	/** UA since 2004: region code + 4 digits + 2-letter series (AA 1234 BB). */
	| 'ua-standard'
	/** UA 1995–2004: 5 digits + 2-letter series that identifies the region (123-45 KI). */
	| 'ua-vintage'
	/** FR since 2009 (SIV) with the department of the right band typed after it (AB-123-CD 75). */
	| 'fr-siv'
	/** FR 1950–2009 (FNI): digits, letters, department (1234 AB 75). */
	| 'fr-fni'
	/** BG: province code + 4 digits + series (CA 1234 AB). */
	| 'bg-standard'
	/** RO since 1992: county + 2 digits + 3 letters (CJ 12 ABC; Bucharest B 123 ABC). */
	| 'ro-standard'
	/** SI: area code + 3–6 letters/digits (exact serial formats not in the sources). */
	| 'si-standard'
	/** RS since 2011: area code + 3 digits (4 in Belgrade) + 2 letters (NS 123-AB). */
	| 'rs-standard'
	/** GR since 1984: 3 letters (code = first two) + 1000–9999, motorcycles 1–999. */
	| 'gr-standard'
	/** XK (RKS) since 2010: district 01–07 + 3 digits from 101 + 2 letters (01 234-AB). */
	| 'xk-standard';

/** Recognised plate formats without a region; they go to the country's nationwide subcollection. */
export type NationwideFormat =
	/** SK state-wide plates since 2023: same layout, but no district (series from AA). */
	| 'sk-2023'
	/** SK personalised plate since 2023 (LL-XXXXX), no district. */
	| 'sk-personalized'
	/** Electric vehicles: SK EL/EV + NNN + LL (green letters), CZ EL + NNN + LL (black letters). */
	| 'ev'
	/** CZ personalised: up to 8 characters with at least one digit, no G/O/Q/W. */
	| 'cz-personalized';

export type PlateFormat = RegionFormat | NationwideFormat;

export type Confidence = 'high' | 'medium' | 'low';

export type Detection =
	| {
			type: 'region';
			collectionId: CollectionId;
			regionCode: string;
			format: RegionFormat;
			confidence: Confidence;
	  }
	| {
			/** No region on the plate: saved to the country's nationwide subcollection. */
			type: 'nationwide';
			collectionId: NationwideCollectionId;
			format: NationwideFormat;
			confidence: Confidence;
	  };

const confidenceRank: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };

function region(
	collectionId: CollectionId,
	regionCode: string,
	format: RegionFormat,
	confidence: Confidence
): Detection | null {
	return getRegion(collectionId, regionCode)
		? { type: 'region', collectionId, regionCode, format, confidence }
		: null;
}

function nationwide(collectionId: NationwideCollectionId, format: NationwideFormat, confidence: Confidence): Detection {
	return { type: 'nationwide', collectionId, format, confidence };
}

function detectSlovak(n: string): Detection[] {
	const out: (Detection | null)[] = [];
	const prefix = n.slice(0, 2);
	const isDistrict = !!getRegion('sk', prefix);

	if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(n)) {
		if (isDistrict) out.push(region('sk', prefix, 'sk-district', 'high'));
		else if (prefix === 'EL' || prefix === 'EV') out.push(nationwide('sk', 'ev', 'high'));
		else out.push(nationwide('sk', 'sk-2023', 'high'));
	} else if (/^[A-Z]{2}[A-Z0-9]{5}$/.test(n)) {
		// Personalised (XX-LLLLL / XX-LLLLN before 2023, LL-XXXXX since 2023).
		if (isDistrict) out.push(region('sk', prefix, 'sk-district-special', 'medium'));
		else out.push(nationwide('sk', 'sk-personalized', 'low'));
	} else if (/^[A-Z]{2}([A-Z]{1,2}\d{3}|\d{3}[A-Z])$/.test(n) && isDistrict) {
		// Dealer (XX-M 001 / XX-MA001), temporary (V), official (XX-NNN X).
		out.push(region('sk', prefix, 'sk-district-special', 'medium'));
	}
	return out.filter((d): d is Detection => d !== null);
}

function detectCzech(n: string): Detection[] {
	const out: (Detection | null)[] = [];

	// Electric vehicles: EL + series digit + two digits + two letters (EL-000-AA … EL-999-ZZ).
	if (/^EL\d{3}[A-Z]{2}$/.test(n)) out.push(nationwide('cz', 'ev', 'high'));

	const standard = /^\d([A-Z])[A-Z0-9]\d{4}$/.exec(n);
	if (standard) out.push(region('cz', standard[1], 'cz-standard', 'high'));

	const historic = /^(\d{2})V[A-Z0-9]{4}$/.exec(n);
	if (historic && czNumericToLetter[historic[1]]) {
		out.push(region('cz', czNumericToLetter[historic[1]], 'cz-historic', 'medium'));
	}

	const vintage = /^([A-Z])([A-Z])[A-Z]?\d{4}$/.exec(n);
	if (vintage) {
		const [, first, second] = vintage;
		// Prague used every A* code except AA (government).
		const code = first === 'A' ? (second === 'A' ? null : 'A') : first + second;
		if (code) out.push(region('cz-vintage', code, 'cz-vintage', 'high'));
	}

	const anyMatch = out.some((d) => d !== null);
	if (!anyMatch && /^(?=.*\d)[A-FH-NPR-VX-Z0-9]{8}$/.test(n)) {
		out.push(nationwide('cz', 'cz-personalized', 'low'));
	}
	return out.filter((d): d is Detection => d !== null);
}

/**
 * Austria: 1–2 letter district code, then the serial (no Q):
 * standard = digits then letters, personalised = letters then digits (3–6 characters);
 * black plates 1947–1989 = state/city code + up to 6 digits (or 999A99 once those ran out).
 * Typed with a separator after the code ("BN 123AB"), only that split is tried.
 */
function detectAustrian(n: string, raw: string): Detection[] {
	const out: (Detection | null)[] = [];
	const firstGroup = raw.trim().toUpperCase().split(/[\s\-.·]+/);
	const typedCode = firstGroup.length > 1 && /^[A-Z]{1,2}$/.test(firstGroup[0]) ? firstGroup[0] : null;
	for (const len of typedCode ? [typedCode.length] : [1, 2]) {
		const code = n.slice(0, len);
		const serial = n.slice(len);
		if (!/^[A-Z]+$/.test(code) || serial.includes('Q')) continue;
		const sized = serial.length >= 3 && serial.length <= 6;
		// region() returns null for codes the collection doesn't have.
		if (sized && /^\d{1,5}[A-Z]{1,3}$/.test(serial)) out.push(region('at', code, 'at-standard', 'high'));
		else if (sized && /^[A-Z]{1,5}\d{1,3}$/.test(serial)) out.push(region('at', code, 'at-personalized', 'medium'));
		else if (/^\d{1,6}$/.test(serial) || /^\d{3}[A-Z]\d{2}$/.test(serial)) {
			// Black plate 1947–1989: its own (bonus) collection.
			out.push(region('at-vintage', code, 'at-black', 'medium'));
		}
	}
	return out.filter((d): d is Detection => d !== null);
}

/** Letters allowed in Polish serials (B, D, I, O, Z are never used). */
const PL = '[ACEFGHJKLMNPRSTUVWXY]';
/** Serials after a 2-letter code (5 characters). */
const plSerial2 = new RegExp(`^(\\d{5}|\\d{4}${PL}|\\d{3}${PL}{2}|\\d${PL}\\d{3}|\\d${PL}{2}\\d{2})$`);
/** Serials after a 3-letter code (4 or 5 characters). */
const plSerial3 = new RegExp(
	`^(${PL}\\d{3}|\\d{2}${PL}{2}|\\d${PL}\\d{2}|\\d{2}${PL}\\d|\\d${PL}{2}\\d|${PL}{2}\\d{2}|\\d{5}|\\d{4}${PL}|\\d{3}${PL}{2})$`
);

/**
 * Poland. Since 2000: county code of 2–3 letters (first = voivodeship) + serial.
 * 1976–2000 (black plates): 2-letter area code + series letter + 4 digits or 3 digits + letter;
 * that serial shape never occurs on current plates, so the two systems don't overlap.
 */
function detectPolish(n: string): Detection[] {
	const out: (Detection | null)[] = [];
	for (const len of [2, 3]) {
		const code = n.slice(0, len);
		const serial = n.slice(len);
		if (!getRegion('pl', code)) continue;
		if ((len === 2 ? plSerial2 : plSerial3).test(serial)) out.push(region('pl', code, 'pl-standard', 'high'));
	}
	const old = /^([A-Z]{2})[A-Z](\d{4}|\d{3}[A-Z])$/.exec(n);
	if (old) out.push(region('pl-vintage', old[1], 'pl-vintage', 'high'));
	return out.filter((d): d is Detection => d !== null);
}

/**
 * Germany: district code of 1–3 letters (umlauts are letters of their own), then 1–2
 * letters and 1–4 digits, at most 8 characters; a trailing E marks electric, H historic
 * vehicles. Typed with a separator after the code ("B-MW 1234"), only that split is tried;
 * without one, every code length that fits is offered (B MW… vs BM W…).
 */
function detectGerman(n: string, raw: string): Detection[] {
	const out: (Detection | null)[] = [];
	const groups = raw.trim().toUpperCase().split(/[\s\-.·]+/);
	const typedCode = groups.length > 1 && /^[A-ZÄÖÜ]{1,3}$/.test(groups[0]) ? groups[0] : null;
	for (const len of typedCode ? [typedCode.length] : [1, 2, 3]) {
		const code = n.slice(0, len);
		const m = /^([A-Z]{1,2}\d{1,4})([EH])?$/.exec(n.slice(len));
		if (!m || code.length + m[1].length > 8) continue;
		const format = m[2] === 'E' ? 'de-ev' : m[2] === 'H' ? 'de-historic' : 'de-standard';
		out.push(region('de', code, format, 'high'));
	}
	return out.filter((d): d is Detection => d !== null);
}

/**
 * Ukraine (typed in Latin or Cyrillic; normalizePlate maps Cyrillic to Latin).
 * Since 2004: region code + 4 digits + series of the 12 Latin-looking letters.
 * 1995–2004: 5 digits + 2-letter series; the series identifies the region.
 */
function detectUkrainian(n: string): Detection[] {
	const out: (Detection | null)[] = [];
	const current = /^([A-Z]{2})\d{4}[ABCEHIKMOPTX]{2}$/.exec(n);
	if (current) out.push(region('ua', current[1], 'ua-standard', 'high'));
	const old = /^\d{5}([A-Z]{2})$/.exec(n);
	if (old) out.push(region('ua-vintage', old[1], 'ua-vintage', 'high'));
	return out.filter((d): d is Detection => d !== null);
}

/** SIV letters: no I, O, U. */
const FR_L = '[A-HJ-NP-TV-Z]';
const frSivWithDepartment = new RegExp(`^${FR_L}{2}\\d{3}${FR_L}{2}(${FR_DEPARTMENT})$`);
const frFni = new RegExp(`^\\d{1,4}[A-Z]{1,3}(${FR_DEPARTMENT})$`);
const frSivBare = new RegExp(`^${FR_L}{2}\\d{3}${FR_L}{2}$`);

/**
 * France: what counts is the department number. On SIV plates (since 2009) it's on the
 * right band, not in the number, so it's typed after the plate ("AB-123-CD 75"); on FNI
 * plates (until 2009) it ends the number ("1234 AB 75").
 */
function detectFrench(n: string): Detection[] {
	const out: (Detection | null)[] = [];
	const siv = frSivWithDepartment.exec(n);
	if (siv) out.push(region('fr', siv[1], 'fr-siv', 'high'));
	const fni = frFni.exec(n);
	if (fni) out.push(region('fr', fni[1], 'fr-fni', 'high'));
	return out.filter((d): d is Detection => d !== null);
}

/** A French SIV plate typed without the department of its right band (the Add screen hints). */
export function isBareFrenchPlate(raw: string): boolean {
	return frSivBare.test(normalizePlate(raw));
}

/**
 * Bulgaria: province code (1–2 letters) + 4 digits + series of 1–2 letters (A B E K M H O
 * P C T Y X). Electric (since Nov 2022): EA + 4 digits + 2 letters, EM + 4 digits + 1 letter,
 * no province: nationwide.
 */
function detectBulgarian(n: string): Detection[] {
	const out: (Detection | null)[] = [];
	if (/^EA\d{4}[ABEKMHOPCTYX]{2}$/.test(n) || /^EM\d{4}[ABEKMHOPCTYX]$/.test(n)) {
		out.push(nationwide('bg', 'ev', 'high'));
	}
	const m = /^([A-Z]{1,2})\d{4}[ABEKMHOPCTYX]{1,2}$/.exec(n);
	if (m) out.push(region('bg', m[1], 'bg-standard', 'high'));
	return out.filter((d): d is Detection => d !== null);
}

/**
 * Romania: county code + 2 digits + 3 letters (no Q, not starting with I or O); Bucharest
 * "B" with 2–3 digits.
 */
function detectRomanian(n: string): Detection[] {
	const m = /^([A-Z]{1,2})(\d{2,3})([A-HJ-NPR-Z][A-PR-Z]{2})$/.exec(n);
	if (!m) return [];
	const [, code, digits] = m;
	if (digits.length === 3 && code !== 'B') return [];
	const d = region('ro', code, 'ro-standard', 'high');
	return d ? [d] : [];
}

/**
 * Slovenia: area code + 3–6 letters/digits with at least one digit. Deliberately loose
 * (the sources don't give the serial formats), hence medium confidence.
 */
function detectSlovenian(n: string): Detection[] {
	const m = /^([A-Z]{2})(?=[A-Z0-9]*\d)([A-Z0-9]{3,6})$/.exec(n);
	if (!m) return [];
	const d = region('si', m[1], 'si-standard', 'medium');
	return d ? [d] : [];
}

/**
 * Greece: three letters (only the Greek-looking ones) + 1000–9999 (cars) or 1–999
 * (motorcycles). The code is the first two letters, except the 3-letter ΚΟΗ/ΚΟΚ.
 */
function detectGreek(n: string): Detection[] {
	const m = /^([ABEZHIKMNOPTYX]{3})([1-9]\d{0,3})$/.exec(n);
	if (!m) return [];
	const d = region('gr', m[1], 'gr-standard', 'high') ?? region('gr', m[1].slice(0, 2), 'gr-standard', 'high');
	return d ? [d] : [];
}

/** Kosovo (RKS): district code 01–07, three digits (from 101), two letters. */
function detectKosovar(n: string): Detection[] {
	const m = /^(\d{2})[1-9]\d{2}[A-Z]{2}$/.exec(n);
	if (!m) return [];
	const d = region('xk', m[1], 'xk-standard', 'high');
	return d ? [d] : [];
}

/** Serbian codes by their diacritic-free form ("BC" → BČ, BĆ), for codes typed without Č Ć Š Ž Đ. */
let rsByFold: Map<string, string[]> | null = null;
function rsCodesFor(typed: string): { codes: string[]; exact: boolean } {
	if (getRegion('rs', typed)) return { codes: [typed], exact: true };
	rsByFold ??= rsRegions.reduce((m, r) => m.set(foldPlate(r.code), [...(m.get(foldPlate(r.code)) ?? []), r.code]), new Map<string, string[]>());
	return { codes: rsByFold.get(foldPlate(typed)) ?? [], exact: false };
}

/**
 * Serbia since 2011: area code + 3 digits (4 in Belgrade) + 2 letters. A code typed
 * without its diacritics (CA for ČA) is matched at medium confidence.
 */
function detectSerbian(n: string): Detection[] {
	const m = /^([A-ZČĆŠŽĐ]{2})(\d{3,4})[A-ZČĆŠŽĐ]{2}$/.exec(n);
	if (!m) return [];
	const { codes, exact } = rsCodesFor(m[1]);
	return codes
		.filter((code) => m[2].length === 3 || code === 'BG')
		.map((code) => region('rs', code, 'rs-standard', exact ? 'high' : 'medium'))
		.filter((d): d is Detection => d !== null);
}

export function detectionKey(d: Detection): string {
	return d.type === 'region' ? `${d.collectionId}:${d.regionCode}` : `${d.collectionId}:*${d.format}`;
}

/**
 * Detects country and region from a plate as typed. Returns candidates
 * ordered best-first (by confidence; regional before nationwide on a tie);
 * an empty array means the plate was not recognised. When candidates span
 * several countries, see orderByCountry().
 */
export function detectPlate(raw: string): Detection[] {
	const n = normalizePlate(raw);
	if (n.length < 5) return [];

	const seen = new Set<string>();
	return [...detectSlovak(n), ...detectCzech(n), ...detectAustrian(n, raw), ...detectPolish(n), ...detectGerman(n, raw), ...detectUkrainian(n), ...detectFrench(n), ...detectBulgarian(n), ...detectRomanian(n), ...detectSlovenian(n), ...detectSerbian(n), ...detectGreek(n), ...detectKosovar(n)]
		.filter((d) => {
			const key = detectionKey(d);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.sort((a, b) => {
			const byConfidence = confidenceRank[a.confidence] - confidenceRank[b.confidence];
			if (byConfidence !== 0) return byConfidence;
			return a.type === b.type ? 0 : a.type === 'region' ? -1 : 1;
		});
}

/**
 * When the candidates belong to more than one country, puts the preferred
 * countries first (in the given order: GPS country, then last used), keeping
 * the existing order otherwise. With a single country nothing changes.
 */
export function orderByCountry<T extends { collectionId: string }>(
	candidates: T[],
	preferred: (string | null | undefined)[]
): T[] {
	const countries = new Set(candidates.map((c) => countryOf(c.collectionId)));
	if (countries.size <= 1) return candidates;
	const ranking = [...new Set(preferred.filter((p): p is string => !!p))];
	const rank = (c: T) => {
		const i = ranking.indexOf(countryOf(c.collectionId) ?? '');
		return i === -1 ? ranking.length : i;
	};
	return candidates
		.map((c, i) => ({ c, i }))
		.sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i)
		.map(({ c }) => c);
}

/** True when the candidates belong to more than one country. */
export function spansCountries(candidates: { collectionId: string }[]): boolean {
	return new Set(candidates.map((c) => countryOf(c.collectionId))).size > 1;
}
