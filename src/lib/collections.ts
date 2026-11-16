import { atRegions, atVintageRegions } from './data/at';
import { bgRegions } from './data/bg';
import { czRegions } from './data/cz';
import { czVintageRegions } from './data/cz-vintage';
import { deRegions } from './data/de';
import { frRegions } from './data/fr';
import { plRegions } from './data/pl';
import { plVintageRegions } from './data/pl-vintage';
import { roRegions } from './data/ro';
import { rsRegions } from './data/rs';
import { siRegions } from './data/si';
import { uaRegions, uaVintageRegions } from './data/ua';
import { skRegions } from './data/sk';
import type { CollectionDef, CollectionId, CountryCode, NationwideCollectionId, Region } from './data/types';
import type { NationwideFormat, PlateFormat } from './plates/detect';

export type { CollectionDef, CollectionId, CountryCode, NationwideCollectionId, Region };

export const collections: CollectionDef[] = [
	{
		id: 'sk',
		country: 'SK',
		bandCode: 'SK',
		flag: '🇸🇰',
		bonus: false,
		plateStyle: 'eu',
		regions: skRegions,
		nationwideTypes: ['sk-2023', 'ev', 'sk-personalized']
	},
	{
		id: 'cz',
		country: 'CZ',
		bandCode: 'CZ',
		flag: '🇨🇿',
		bonus: false,
		plateStyle: 'eu',
		regions: czRegions,
		nationwideTypes: ['ev', 'cz-personalized']
	},
	{
		id: 'cz-vintage',
		country: 'CZ',
		bandCode: 'CZ',
		flag: '🇨🇿',
		bonus: true,
		plateStyle: 'plain',
		regions: czVintageRegions,
		nationwideTypes: []
	},
	{ id: 'at', country: 'AT', bandCode: 'A', flag: '🇦🇹', bonus: false, plateStyle: 'eu', regions: atRegions, nationwideTypes: [] },
	{
		id: 'at-vintage',
		country: 'AT',
		bandCode: 'A',
		flag: '🇦🇹',
		bonus: true,
		plateStyle: 'black',
		regions: atVintageRegions,
		nationwideTypes: []
	},
	{ id: 'de', country: 'DE', bandCode: 'D', flag: '🇩🇪', bonus: false, plateStyle: 'eu', regions: deRegions, nationwideTypes: [] },
	{ id: 'fr', country: 'FR', bandCode: 'F', flag: '🇫🇷', bonus: false, plateStyle: 'eu', regions: frRegions, nationwideTypes: [] },
	{ id: 'bg', country: 'BG', bandCode: 'BG', flag: '🇧🇬', bonus: false, plateStyle: 'eu', regions: bgRegions, nationwideTypes: ['ev'] },
	{ id: 'ro', country: 'RO', bandCode: 'RO', flag: '🇷🇴', bonus: false, plateStyle: 'eu', regions: roRegions, nationwideTypes: [] },
	{ id: 'si', country: 'SI', bandCode: 'SLO', flag: '🇸🇮', bonus: false, plateStyle: 'eu', regions: siRegions, nationwideTypes: [] },
	{ id: 'rs', country: 'RS', bandCode: 'SRB', flag: '🇷🇸', bonus: false, plateStyle: 'eu', regions: rsRegions, nationwideTypes: [] },
	{ id: 'ua', country: 'UA', bandCode: 'UA', flag: '🇺🇦', bonus: false, plateStyle: 'eu', regions: uaRegions, nationwideTypes: [] },
	{
		id: 'ua-vintage',
		country: 'UA',
		bandCode: 'UA',
		flag: '🇺🇦',
		bonus: true,
		plateStyle: 'plain',
		regions: uaVintageRegions,
		nationwideTypes: []
	},
	{ id: 'pl', country: 'PL', bandCode: 'PL', flag: '🇵🇱', bonus: false, plateStyle: 'eu', regions: plRegions, nationwideTypes: [] },
	{
		id: 'pl-vintage',
		country: 'PL',
		bandCode: 'PL',
		flag: '🇵🇱',
		bonus: true,
		plateStyle: 'black',
		regions: plVintageRegions,
		nationwideTypes: []
	}
];

/** Plate looks like the old black plates (white on black, no band). */
export function isDarkPlate(collectionId: string, type: PlateFormat | null | undefined): boolean {
	return byId.get(collectionId)?.plateStyle === 'black' || type === 'at-black';
}

/** Plate without the EU band (old systems). */
export function isBandless(collectionId: string, type: PlateFormat | null | undefined): boolean {
	return byId.get(collectionId)?.plateStyle !== 'eu' || type === 'at-black';
}

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
export function countryOf(collectionId: string): CountryCode | undefined {
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
		case 'de-ev':
			return 'ev';
		case 'de-historic':
		case 'sk-personalized':
		case 'cz-personalized':
		case 'sk-district-special':
		case 'cz-historic':
		case 'at-personalized':
		case 'at-black':
			return 'special';
		default:
			return null;
	}
}
