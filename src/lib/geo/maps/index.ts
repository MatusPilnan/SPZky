import { atUnmappedCodes } from '../../data/at';
import { plUnmappedCodes } from '../../data/pl';
import type { CollectionDef, CollectionId } from '../../data/types';
import type { RegionMapData } from './types';

export type { MapShape, RegionMapData } from './types';

/**
 * Lazily loaded map per collection (keeps the data out of screens that don't show maps).
 * Collections without one (historic systems whose regions no longer exist as map data,
 * e.g. Poland before 2000) are simply missing here.
 */
const loaders: Partial<Record<CollectionId, () => Promise<{ map: RegionMapData }>>> = {
	sk: () => import('./sk-districts'),
	cz: () => import('./cz-regions'),
	'cz-vintage': () => import('./cz-districts'),
	at: () => import('./at-districts'),
	'at-vintage': () => import('./at-states'),
	pl: () => import('./pl-counties'),
	de: () => import('./de-districts'),
	ua: () => import('./ua-regions'),
	'ua-vintage': () => import('./ua-regions')
};

export function hasMap(collectionId: CollectionId): boolean {
	return collectionId in loaders;
}

/** The collection's map, or null when it has none. */
export async function loadMap(collectionId: CollectionId): Promise<RegionMapData | null> {
	const loader = loaders[collectionId];
	return loader ? (await loader()).map : null;
}

/**
 * Map areas whose name differs from the region name in the collection data, or that
 * cover several region names. Everything else matches by identical name (or `Region.area`).
 */
const areaAliases: Partial<Record<CollectionId, Record<string, string[]>>> = {
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
	'cz-vintage': { Zlín: ['Zlín', 'Gottwaldov'] },
	at: {
		// Offices of BH Liezen with their own codes.
		Liezen: ['Liezen', 'Bad Aussee', 'Gröbming'],
		// Districts merged 2012/13: old codes still on the road.
		'Bruck-Mürzzuschlag': ['Bruck-Mürzzuschlag', 'Mürzzuschlag'],
		Südoststeiermark: ['Südoststeiermark', 'Feldbach', 'Bad Radkersburg'],
		'Hartberg-Fürstenfeld': ['Hartberg-Fürstenfeld', 'Hartberg', 'Fürstenfeld'],
		Murtal: ['Murtal', 'Judenburg', 'Knittelfeld'],
		// Klosterneuburg (KG) belongs to Tulln, Schwechat (SW) to Bruck an der Leitha.
		Tulln: ['Tulln', 'Klosterneuburg'],
		'Bruck an der Leitha': ['Bruck an der Leitha', 'Schwechat'],
		// Rust is a statutory city but uses Eisenstadt's code E.
		Rust: ['Eisenstadt']
	},
	// Black plates before 1990: Graz (G) and Linz (L) had their own codes within their states.
	'at-vintage': {
		Steiermark: ['Steiermark', 'Graz'],
		Oberösterreich: ['Oberösterreich', 'Linz']
	}
};

/**
 * Codes with no area on the map: Austrian state codes of the pre-1990 black plates and
 * the dissolved district Wien-Umgebung. They still count in the grid.
 */
const unmapped: Partial<Record<CollectionId, Set<string>>> = { at: atUnmappedCodes, pl: plUnmappedCodes };

export function isUnmappedCode(collectionId: CollectionId, code: string): boolean {
	return unmapped[collectionId]?.has(code) ?? false;
}

/** Region codes of the collection that belong to a map area. */
export function codesOfArea(collection: CollectionDef, areaName: string): string[] {
	const names = areaAliases[collection.id]?.[areaName] ?? [areaName];
	return collection.regions
		.filter((r) => (r.areas ?? [r.area ?? r.name]).some((a) => names.includes(a)))
		.map((r) => r.code);
}

export type AreaStatus = 'found' | 'partial' | 'missing';

/** found = every code of the area seen, partial = some, missing = none. */
export function areaStatus(codes: string[], counts: Map<string, number> | undefined): AreaStatus {
	const seen = codes.filter((c) => (counts?.get(c) ?? 0) > 0).length;
	return seen === 0 ? 'missing' : seen === codes.length ? 'found' : 'partial';
}
