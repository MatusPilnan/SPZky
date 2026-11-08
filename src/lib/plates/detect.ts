import { getRegion } from '../collections';
import { czNumericToLetter } from '../data/cz';
import type { CollectionId } from '../data/types';
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

/** Recognised plate formats that carry no region. */
export type NoRegionFormat =
	/** SK state-wide plates since 2023: same layout, but no district (series from AA). */
	| 'sk-2023'
	/** SK personalised plate since 2023 (LL-XXXXX), no district. */
	| 'sk-personalized'
	/** Electric vehicle plates (EL/EV prefix). */
	| 'ev'
	/** CZ personalised (8 characters, at least one digit). */
	| 'cz-personalized';

export type PlateFormat = RegionFormat | NoRegionFormat;

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
			/** Recognised plate format that does not encode a region. */
			type: 'no-region';
			country: 'SK' | 'CZ' | null;
			format: NoRegionFormat;
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

function detectSlovak(n: string): Detection[] {
	const out: (Detection | null)[] = [];
	const prefix = n.slice(0, 2);
	const isDistrict = !!getRegion('sk', prefix);

	if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(n)) {
		if (isDistrict) out.push(region('sk', prefix, 'sk-district', 'high'));
		else if (prefix === 'EL' || prefix === 'EV')
			out.push({ type: 'no-region', country: null, format: 'ev', confidence: 'high' });
		else out.push({ type: 'no-region', country: 'SK', format: 'sk-2023', confidence: 'high' });
	} else if (/^[A-Z]{2}[A-Z0-9]{5}$/.test(n)) {
		// Personalised (XX-LLLLL / XX-LLLLN before 2023, LL-XXXXX since 2023).
		if (isDistrict) out.push(region('sk', prefix, 'sk-district-special', 'medium'));
		else out.push({ type: 'no-region', country: 'SK', format: 'sk-personalized', confidence: 'low' });
	} else if (/^[A-Z]{2}([A-Z]{1,2}\d{3}|\d{3}[A-Z])$/.test(n) && isDistrict) {
		// Dealer (XX-M 001 / XX-MA001), temporary (V), official (XX-NNN X).
		out.push(region('sk', prefix, 'sk-district-special', 'medium'));
	}
	return out.filter((d): d is Detection => d !== null);
}

function detectCzech(n: string): Detection[] {
	const out: (Detection | null)[] = [];

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

	const anyRegion = out.some((d) => d !== null);
	if (!anyRegion && /^(?=.*\d)[A-Z0-9]{8}$/.test(n)) {
		out.push({ type: 'no-region', country: 'CZ', format: 'cz-personalized', confidence: 'low' });
	}
	return out.filter((d): d is Detection => d !== null);
}

/**
 * Detects country and region from a plate as typed. Returns candidates
 * ordered best-first; an empty array means the plate was not recognised.
 */
export function detectPlate(raw: string): Detection[] {
	const n = normalizePlate(raw);
	if (n.length < 5) return [];

	const seen = new Set<string>();
	return [...detectSlovak(n), ...detectCzech(n)]
		.filter((d) => {
			const key = d.type === 'region' ? `${d.collectionId}:${d.regionCode}` : `none:${d.format}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.sort((a, b) => {
			if (a.type !== b.type) return a.type === 'region' ? -1 : 1;
			return confidenceRank[a.confidence] - confidenceRank[b.confidence];
		});
}
