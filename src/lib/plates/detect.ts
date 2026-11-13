import { countryOf, getRegion } from '../collections';
import { czNumericToLetter } from '../data/cz';
import type { CollectionId, NationwideCollectionId } from '../data/types';
import { normalizePlate } from './normalize';

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
	| 'cz-vintage';

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
	return [...detectSlovak(n), ...detectCzech(n)]
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
