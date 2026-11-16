import { describe, expect, it } from 'vitest';
import { collections } from '../../collections';
import { areaStatus, codesOfArea, isUnmappedCode, loadMap } from './index';

describe('region maps', () => {
	it.each(collections.map((c) => [c.id, c] as const))('%s: every area has codes and every code an area', async (_, c) => {
		const map = await loadMap(c.id);
		const areasWithoutCodes = map.shapes.filter((s) => codesOfArea(c, s.name).length === 0).map((s) => s.name);
		expect(areasWithoutCodes).toEqual([]);
		const covered = new Set(map.shapes.flatMap((s) => codesOfArea(c, s.name)));
		expect(c.regions.filter((r) => !covered.has(r.code) && !isUnmappedCode(c.id, r.code)).map((r) => r.code)).toEqual([]);
		// …and codes declared as unmapped really have no area.
		expect(c.regions.filter((r) => covered.has(r.code) && isUnmappedCode(c.id, r.code)).map((r) => r.code)).toEqual([]);
		expect(map.shapes.every((s) => /^M[\d. MZ-]+Z$/.test(s.d))).toBe(true);
	});

	it('has the expected number of areas', async () => {
		expect((await loadMap('sk')).shapes).toHaveLength(79);
		expect((await loadMap('cz')).shapes).toHaveLength(14);
		expect((await loadMap('cz-vintage')).shapes).toHaveLength(77);
		expect((await loadMap('at')).shapes).toHaveLength(94);
	});

	it('maps shared codes to all areas of a city', () => {
		const sk = collections.find((c) => c.id === 'sk')!;
		expect(codesOfArea(sk, 'Bratislava III')).toEqual(['BA', 'BL', 'BT']);
		expect(codesOfArea(sk, 'Košice IV')).toEqual(['KE']);
		expect(codesOfArea(sk, 'Košice - okolie')).toEqual(['KS']);
		const vintage = collections.find((c) => c.id === 'cz-vintage')!;
		expect(codesOfArea(vintage, 'Zlín').sort()).toEqual(['GT', 'GV', 'ZL']);
		expect(codesOfArea(vintage, 'Brno-město').sort()).toEqual(['BM', 'BS', 'BZ']);
		const at = collections.find((c) => c.id === 'at')!;
		expect(codesOfArea(at, 'Liezen').sort()).toEqual(['BA', 'GB', 'LI']);
		expect(codesOfArea(at, 'Murtal').sort()).toEqual(['JU', 'KF', 'MT']);
		expect(codesOfArea(at, 'Leoben').sort()).toEqual(['LE', 'LN']);
		expect(codesOfArea(at, 'Rust')).toEqual(['E']);
	});

	it('derives the area status from its codes', () => {
		const counts = new Map([
			['BA', 2],
			['BL', 1]
		]);
		expect(areaStatus(['BA', 'BL', 'BT'], counts)).toBe('partial');
		expect(areaStatus(['BA', 'BL'], counts)).toBe('found');
		expect(areaStatus(['KE'], counts)).toBe('missing');
		expect(areaStatus(['KE'], undefined)).toBe('missing');
	});
});
