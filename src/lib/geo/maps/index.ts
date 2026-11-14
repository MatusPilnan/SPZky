import type { CollectionDef, CollectionId } from '../../data/types';
import type { RegionMapData } from './types';

export type { MapShape, RegionMapData } from './types';

/** Lazily loaded map per collection (keeps the data out of screens that don't show maps). */
const loaders: Record<CollectionId, () => Promise<{ map: RegionMapData }>> = {
	sk: () => import('./sk-districts'),
	cz: () => import('./cz-regions'),
	'cz-vintage': () => import('./cz-districts')
};

export async function loadMap(collectionId: CollectionId): Promise<RegionMapData> {
	return (await loaders[collectionId]()).map;
}

/**
 * Map areas whose name differs from the region name in the collection data, or that
 * cover several region names. Everything else matches by identical name.
 */
const areaAliases: Record<CollectionId, Record<string, string[]>> = {
	sk: {
		// Bratislava I–V share the codes BA/BL/BT, Košice I–IV share KE.
		'Bratislava I': ['Bratislava'],
		'Bratislava II': ['Bratislava'],
		'Bratislava III': ['Bratislava'],
		'Bratislava IV': ['Bratislava'],
		'Bratislava V': ['Bratislava'],
		'Košice I': ['Košice'],
		'Košice II': ['Košice'],
		'Košice III': ['Košice'],
		'Košice IV': ['Košice'],
		'Košice - okolie': ['Košice-okolie']
	},
	cz: {},
	// Gottwaldov was renamed Zlín in 1990; its old codes belong to the same district.
	'cz-vintage': { Zlín: ['Zlín', 'Gottwaldov'] }
};

/** Region codes of the collection that belong to a map area. */
export function codesOfArea(collection: CollectionDef, areaName: string): string[] {
	const names = areaAliases[collection.id][areaName] ?? [areaName];
	return collection.regions.filter((r) => names.includes(r.name)).map((r) => r.code);
}

export type AreaStatus = 'found' | 'partial' | 'missing';

/** found = every code of the area seen, partial = some, missing = none. */
export function areaStatus(codes: string[], counts: Map<string, number> | undefined): AreaStatus {
	const seen = codes.filter((c) => (counts?.get(c) ?? 0) > 0).length;
	return seen === 0 ? 'missing' : seen === codes.length ? 'found' : 'partial';
}
