import type { Region } from './types';

// Czech region letters (2nd character of plates issued since 2001), in the
// order of their numeric region codes 01–14. Historic "V" plates
// (format NNV XXXX) carry the numeric code instead of the letter.
// Source: https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_the_Czech_Republic
export const czRegions: Region[] = [
	{ code: 'A', name: 'Hlavní město Praha' },
	{ code: 'B', name: 'Jihomoravský kraj' },
	{ code: 'C', name: 'Jihočeský kraj' },
	{ code: 'E', name: 'Pardubický kraj' },
	{ code: 'H', name: 'Královéhradecký kraj' },
	{ code: 'J', name: 'Kraj Vysočina' },
	{ code: 'K', name: 'Karlovarský kraj' },
	{ code: 'L', name: 'Liberecký kraj' },
	{ code: 'M', name: 'Olomoucký kraj' },
	{ code: 'P', name: 'Plzeňský kraj' },
	{ code: 'S', name: 'Středočeský kraj' },
	{ code: 'T', name: 'Moravskoslezský kraj' },
	{ code: 'U', name: 'Ústecký kraj' },
	{ code: 'Z', name: 'Zlínský kraj' }
];

/** Numeric region code (as on historic plates) → region letter. */
export const czNumericToLetter: Record<string, string> = Object.fromEntries(
	czRegions.map((r, i) => [String(i + 1).padStart(2, '0'), r.code])
);
