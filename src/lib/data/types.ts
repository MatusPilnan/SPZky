export interface Region {
	/** Code as it appears on the plate, e.g. "BA" (SK), "A" (CZ). */
	code: string;
	/** Native name of the district/region the code belongs to. */
	name: string;
}

export type CollectionId = 'sk' | 'cz' | 'cz-vintage';

export interface CollectionDef {
	id: CollectionId;
	/** ISO country code shown in the plate's EU band. */
	country: 'SK' | 'CZ';
	flag: string;
	/** Bonus collections (e.g. pre-2001 plates) are shown separately. */
	bonus: boolean;
	regions: Region[];
}
