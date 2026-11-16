import type { NationwideFormat } from '../plates/detect';

export interface Region {
	/** Code as it appears on the plate, e.g. "BA" (SK), "A" (CZ). */
	code: string;
	/** Native name of the district/region the code belongs to. */
	name: string;
	/**
	 * Name of its area on the generated map, when it differs from `name` (e.g. Polish data
	 * names counties by their adjective without diacritics: "Boleslawiecki").
	 */
	area?: string;
	/** Several map areas, when a code belongs to more than one (e.g. German city + district). */
	areas?: string[];
}

export type CollectionId =
	| 'sk'
	| 'cz'
	| 'cz-vintage'
	| 'at'
	| 'at-vintage'
	| 'pl'
	| 'pl-vintage'
	| 'de'
	| 'ua'
	| 'ua-vintage'
	| 'fr'
	| 'bg'
	| 'ro';

/** ISO 3166-1 alpha-2 codes of the supported countries. */
export type CountryCode = 'SK' | 'CZ' | 'AT' | 'PL' | 'DE' | 'UA' | 'FR' | 'BG' | 'RO';

/** Collections that have a nationwide subcollection (plates without a region). */
export type NationwideCollectionId = 'sk' | 'cz' | 'bg';

export interface CollectionDef {
	id: CollectionId;
	/** ISO country code (GPS country, grouping). */
	country: CountryCode;
	/** Code in the plate's EU band (international vehicle code: "SK", "CZ", "A"…). */
	bandCode: string;
	flag: string;
	/** Bonus collections (e.g. pre-2001 plates) are shown separately. */
	bonus: boolean;
	/**
	 * How the plates look: "eu" = blue EU band with the country code; "plain" = no band
	 * (plates from before the EU-style design, e.g. CZ before 2001: black on white);
	 * "black" = no band, white on black (e.g. Poland before 2000).
	 */
	plateStyle: 'eu' | 'plain' | 'black';
	regions: Region[];
	/**
	 * Plate types collected in the nationwide subcollection (not counted toward
	 * progress). Empty when the country has no plates without a region.
	 */
	nationwideTypes: NationwideFormat[];
}
