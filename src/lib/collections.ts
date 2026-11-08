import { czRegions } from './data/cz';
import { czVintageRegions } from './data/cz-vintage';
import { skRegions } from './data/sk';
import type { CollectionDef, CollectionId, Region } from './data/types';

export type { CollectionDef, CollectionId, Region };

export const collections: CollectionDef[] = [
	{ id: 'sk', country: 'SK', flag: '🇸🇰', bonus: false, regions: skRegions },
	{ id: 'cz', country: 'CZ', flag: '🇨🇿', bonus: false, regions: czRegions },
	{ id: 'cz-vintage', country: 'CZ', flag: '🇨🇿', bonus: true, regions: czVintageRegions }
];

const byId = new Map(collections.map((c) => [c.id as string, c]));
const regionIndex = new Map(
	collections.map((c) => [c.id as string, new Map(c.regions.map((r) => [r.code, r]))])
);

export function getCollection(id: string): CollectionDef | undefined {
	return byId.get(id);
}

export function getRegion(collectionId: string, code: string): Region | undefined {
	return regionIndex.get(collectionId)?.get(code);
}

export function isCollectionId(id: string): id is CollectionId {
	return byId.has(id);
}
