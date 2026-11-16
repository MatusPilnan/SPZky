import { describe, expect, it } from 'vitest';
// @ts-expect-error mapshaper ships no types
import mapshaper from 'mapshaper';
import { laea, projectToMap } from './project';
import { map as sk } from './sk-districts';

/** Projects points with mapshaper, exactly as scripts/build-maps.mjs does. */
async function viaMapshaper(points: [number, number][], lat0: number, lon0: number): Promise<[number, number][]> {
	const input = JSON.stringify({
		type: 'FeatureCollection',
		features: points.map(([lng, lat]) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } }))
	});
	const out = await mapshaper.applyCommands(
		`-i in.json -proj +proj=laea +lat_0=${lat0} +lon_0=${lon0} +datum=WGS84 -o out.json format=geojson geojson-type=FeatureCollection`,
		{ 'in.json': input }
	);
	return JSON.parse(out['out.json']).features.map((f: { geometry: { coordinates: [number, number] } }) => f.geometry.coordinates);
}

describe('LAEA projection', () => {
	it('matches mapshaper/proj to within a metre', async () => {
		const points: [number, number][] = [
			[17.1077, 48.1486], // Bratislava
			[22.5, 48.9], // eastern SK
			[14.4378, 50.0755], // Praha
			[19.5, 48.7] // the centre itself
		];
		const expected = await viaMapshaper(points, 48.7, 19.5);
		points.forEach(([lng, lat], i) => {
			const [x, y] = laea(lat, lng, 48.7, 19.5);
			expect(Math.abs(x - expected[i][0])).toBeLessThan(1);
			expect(Math.abs(y - expected[i][1])).toBeLessThan(1);
		});
	});

	it('puts a point inside the right district on the generated map', () => {
		// Košice city centre → one of the "Košice I–IV" shapes' bounding boxes.
		const { x, y } = projectToMap(sk.projection, 48.7208, 21.2578);
		const boxes = sk.shapes
			.filter((s) => s.name.startsWith('Košice ') && !s.name.includes('okolie'))
			.map((s) => {
				const n = s.d.match(/-?\d+(\.\d+)?/g)!.map(Number);
				const xs = n.filter((_, i) => i % 2 === 0);
				const ys = n.filter((_, i) => i % 2 === 1);
				return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
			});
		expect(boxes.some((b) => x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY)).toBe(true);
	});
});
