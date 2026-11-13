import { czRegions } from './data/cz';
import { czVintageRegions } from './data/cz-vintage';
import { skRegions } from './data/sk';
import type { CollectionDef, CollectionId, NationwideCollectionId, Region } from './data/types';
import type { NationwideFormat, PlateFormat } from './plates/detect';

export type { CollectionDef, CollectionId, NationwideCollectionId, Region };

export const collections: CollectionDef[] = [
	{
		id: 'sk',
		country: 'SK',
		flag: '🇸🇰',
		bonus: false,
		regions: skRegions,
		nationwideTypes: ['sk-2023', 'ev', 'sk-personalized']
	},
	{ id: 'cz', country: 'CZ', flag: '🇨🇿', bonus: false, regions: czRegions, nationwideTypes: ['ev', 'cz-personalized'] },
	{ id: 'cz-vintage', country: 'CZ', flag: '🇨🇿', bonus: true, regions: czVintageRegions, nationwideTypes: [] }
];

const byId = new Map(collections.map((c) => [c.id as string, c]));
const regionIndex = new Map(
	collections.map((c) => [c.id as string, new Map(c.regions.map((r) => [r.code, r]))])
);

export function getCollection(id: string): CollectionDef | undefined {
	return byId.get(id);
}

export function getRegion(collectionId: string, code: string | null | undefined): Region | undefined {
	return code ? regionIndex.get(collectionId)?.get(code) : undefined;
}

export function isCollectionId(id: string): id is CollectionId {
	return byId.has(id);
}

/** Country of a collection ("cz-vintage" → "CZ"). */
export function countryOf(collectionId: string): 'SK' | 'CZ' | undefined {
	return byId.get(collectionId)?.country;
}

/** The main (non-bonus) collection of a country; nationwide plates belong there. */
export function mainCollectionOf(country: string): CollectionDef | undefined {
	return collections.find((c) => c.country === country && !c.bonus);
}

export function isNationwideType(collectionId: string, type: string | null | undefined): type is NationwideFormat {
	return !!type && (byId.get(collectionId)?.nationwideTypes as string[] | undefined)?.includes(type) === true;
}

/** Plate types worth highlighting, with the kind of highlight. */
export function highlightOf(type: PlateFormat | null | undefined): 'ev' | 'special' | null {
	switch (type) {
		case 'ev':
			return 'ev';
		case 'sk-personalized':
		case 'cz-personalized':
		case 'sk-district-special':
		case 'cz-historic':
			return 'special';
		default:
			return null;
	}
}
