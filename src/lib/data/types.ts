import type { NationwideFormat } from '../plates/detect';

export interface Region {
	/** Code as it appears on the plate, e.g. "BA" (SK), "A" (CZ). */
	code: string;
	/** Native name of the district/region the code belongs to. */
	name: string;
}

export type CollectionId = 'sk' | 'cz' | 'cz-vintage' | 'at';

/** ISO 3166-1 alpha-2 codes of the supported countries. */
export type CountryCode = 'SK' | 'CZ' | 'AT';

/** Collections that have a nationwide subcollection (plates without a region). */
export type NationwideCollectionId = 'sk' | 'cz';

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
	 * (plates from before the EU-style design, e.g. CZ before 2001: black on white).
	 */
	plateStyle: 'eu' | 'plain';
	regions: Region[];
	/**
	 * Plate types collected in the nationwide subcollection (not counted toward
	 * progress). Empty when the country has no plates without a region.
	 */
	nationwideTypes: NationwideFormat[];
}
