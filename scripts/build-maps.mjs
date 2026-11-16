// Generates the region maps in src/lib/geo/maps/ (SVG path data, GENERATED files).
//
//   node scripts/build-maps.mjs
//
// Downloads boundaries from geoBoundaries (pinned to release commit 9469f09), simplifies
// them with mapshaper (topology-aware, so neighbours keep shared borders), projects them
// (Lambert azimuthal equal-area) and writes compact SVG paths. Licences and attribution
// are stored next to the data and shown in the app (Settings → Map data).
import { mkdirSync, writeFileSync } from 'node:fs';
import mapshaper from 'mapshaper';

const RELEASE = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData';

/** @type {{ file: string, url: string, simplify: string, center: [number, number], attribution: string, license: string, rename?: Record<string, string>, disambiguateWith?: string, dissolve?: boolean, nameAt?: { from: string, point: [number, number], to: string }[] }[]} */
const MAPS = [
	{
		file: 'sk-districts',
		url: `${RELEASE}/gbHumanitarian/SVK/ADM2/geoBoundaries-SVK-ADM2_simplified.geojson`,
		simplify: '8%',
		center: [19.5, 48.7],
		attribution: 'Geoportal.SK (ÚGKK SR) via geoBoundaries / HDX',
		license: 'CC BY 3.0 IGO'
	},
	{
		file: 'cz-regions',
		url: `${RELEASE}/gbOpen/CZE/ADM1/geoBoundaries-CZE-ADM1_simplified.geojson`,
		simplify: '6%',
		center: [15.5, 49.8],
		attribution: 'ČÚZK (Czech Office for Surveying) via geoBoundaries',
		license: 'CC BY 4.0'
	},
	{
		file: 'cz-districts',
		url: `${RELEASE}/gbOpen/CZE/ADM2/geoBoundaries-CZE-ADM2_simplified.geojson`,
		simplify: '6%',
		center: [15.5, 49.8],
		attribution: 'geoBoundaries, Wikimedia Commons',
		license: 'Public domain',
		// The source uses English names for some districts; use the Czech ones.
		rename: {
			Prague: 'Praha',
			'Prague-East': 'Praha-východ',
			'Prague-West': 'Praha-západ',
			'Brno-City': 'Brno-město',
			'Brno-Country': 'Brno-venkov',
			'Ostrava-City': 'Ostrava-město',
			'Plzeň-City': 'Plzeň-město',
			'Plzeň-North': 'Plzeň-sever',
			'Plzeň-South': 'Plzeň-jih',
			Rakovnik: 'Rakovník'
		}
	},
	{
		// 94 districts and statutory cities (BEV data, 2017: after the Styrian mergers and
		// the dissolution of Wien-Umgebung). Share-alike: this generated file is CC BY-SA 2.0.
		file: 'at-districts',
		url: `${RELEASE}/gbOpen/AUT/ADM2/geoBoundaries-AUT-ADM2_simplified.geojson`,
		simplify: '8%',
		center: [13.33, 47.6],
		attribution: 'BEV (Austrian Federal Office of Metrology and Surveying) via geoBoundaries',
		license: 'CC BY-SA 2.0',
		rename: {
			'Eisenstadt(Stadt)': 'Eisenstadt',
			'Graz(Stadt)': 'Graz',
			'Innsbruck-Stadt': 'Innsbruck',
			'Klagenfurt Land': 'Klagenfurt-Land',
			'Klagenfurt(Stadt)': 'Klagenfurt',
			'Krems an der Donau(Stadt)': 'Krems an der Donau',
			'Krems(Land)': 'Krems-Land',
			'Linz(Stadt)': 'Linz',
			'Rust(Stadt)': 'Rust',
			'Salzburg(Stadt)': 'Salzburg',
			'Sankt Johann im Pongau': 'St. Johann im Pongau',
			'Sankt Pölten(Land)': 'St. Pölten-Land',
			'Sankt Pölten(Stadt)': 'St. Pölten',
			'Sankt Veit an der Glan': 'St. Veit an der Glan',
			'Steyr(Stadt)': 'Steyr',
			'Villach Land': 'Villach-Land',
			'Villach(Stadt)': 'Villach',
			'Waidhofen an der Ybbs(Stadt)': 'Waidhofen an der Ybbs',
			'Wels(Stadt)': 'Wels',
			'Wien(Stadt)': 'Wien',
			'Wiener Neustadt(Land)': 'Wiener Neustadt-Land',
			'Wiener Neustadt(Stadt)': 'Wiener Neustadt'
		}
	},
	{
		// The nine states, for the black plates before 1990 (state codes). Same source/licence.
		file: 'at-states',
		url: `${RELEASE}/gbOpen/AUT/ADM1/geoBoundaries-AUT-ADM1_simplified.geojson`,
		simplify: '8%',
		center: [13.33, 47.6],
		attribution: 'BEV (Austrian Federal Office of Metrology and Surveying) via geoBoundaries',
		license: 'CC BY-SA 2.0'
	},
	{
		// 380 counties and city counties from the official border register (PRG). Names
		// have no diacritics and repeat across voivodeships (e.g. "Bielski"), so repeated
		// names get the voivodeship appended; regions point to areas via `area` in pl.ts.
		file: 'pl-counties',
		url: `${RELEASE}/gbHumanitarian/POL/ADM2/geoBoundaries-POL-ADM2_simplified.geojson`,
		disambiguateWith: `${RELEASE}/gbHumanitarian/POL/ADM1/geoBoundaries-POL-ADM1_simplified.geojson`,
		simplify: '6%',
		center: [19.4, 52.1],
		attribution: 'Państwowy Rejestr Granic (GUGiK) via geoBoundaries / HDX',
		license: 'CC BY 3.0 IGO'
	},
	{
		// 401 districts and district-free cities (2021; Eisenach still separate). Coastal
		// districts come as several features (sea areas), hence dissolve.
		file: 'de-districts',
		url: `${RELEASE}/gbOpen/DEU/ADM3/geoBoundaries-DEU-ADM3_simplified.geojson`,
		dissolve: true,
		simplify: '5%',
		center: [10.4, 51.2],
		attribution: '© GeoBasis-DE / BKG (Federal Agency for Cartography and Geodesy) via geoBoundaries',
		license: 'dl-de/by-2-0'
	},
	{
		// The 96 metropolitan departments (overseas departments are not in this data).
		file: 'fr-departments',
		url: `${RELEASE}/gbOpen/FRA/ADM2/geoBoundaries-FRA-ADM2_simplified.geojson`,
		simplify: '6%',
		center: [2.5, 46.6],
		attribution: 'IGN via geoBoundaries',
		license: 'Etalab Open Licence 2.0',
		rename: { "Côtes d'Armor": "Côtes-d'Armor" }
	},
	{
		// The 28 provinces (oblasti).
		file: 'bg-provinces',
		url: `${RELEASE}/gbOpen/BGR/ADM1/geoBoundaries-BGR-ADM1_simplified.geojson`,
		simplify: '8%',
		center: [25.4, 42.7],
		attribution: 'geoBoundaries, Wikimedia Commons',
		license: 'Public domain'
	},
	{
		// 41 counties and Bucharest.
		file: 'ro-counties',
		url: `${RELEASE}/gbOpen/ROU/ADM1/geoBoundaries-ROU-ADM1_simplified.geojson`,
		simplify: '8%',
		center: [25.0, 45.9],
		attribution: 'World Bank via geoBoundaries',
		license: 'CC BY 4.0'
	},
	{
		// 13 regions + Mount Athos; prefecture codes are grouped by region (gr.ts).
		file: 'gr-regions',
		url: `${RELEASE}/gbOpen/GRC/ADM2/geoBoundaries-GRC-ADM2_simplified.geojson`,
		simplify: '10%',
		center: [23.8, 38.6],
		attribution: '© EuroGeographics via geoBoundaries',
		license: 'CC BY 4.0',
		rename: {
			'Anatolikis Makedonias kai Thr*': 'East Macedonia and Thrace',
			'Kentrikis Makedonias': 'Central Macedonia',
			'Dytikis Makedonias': 'West Macedonia',
			Ipeiroy: 'Epirus',
			Thessalias: 'Thessaly',
			'Stereas Elladas': 'Central Greece',
			'Ionion Nison': 'Ionian Islands',
			'Dytikis Elladas': 'Western Greece',
			Peloponnisoy: 'Peloponnese',
			Attikis: 'Attica',
			'Voreioy Aigaioy': 'North Aegean',
			'Notioy Aigaioy': 'South Aegean',
			Kritis: 'Crete',
			'Agion Oros': 'Mount Athos'
		}
	},
	{
		// 145 municipalities (without Kosovo), grouped into registration areas by rs.ts.
		// ODbL (share-alike): this generated file is under the same licence.
		file: 'rs-municipalities',
		url: `${RELEASE}/gbOpen/SRB/ADM2/geoBoundaries-SRB-ADM2_simplified.geojson`,
		simplify: '8%',
		center: [20.9, 44.0],
		attribution: '© OpenStreetMap contributors via geoBoundaries',
		license: 'ODbL 1.0'
	},
	{
		// 24 oblasts, Crimea, Kyiv and Sevastopol (official boundaries, 2022). Used by both
		// Ukrainian collections (the 1995 system used the same regions).
		file: 'ua-regions',
		url: `${RELEASE}/gbHumanitarian/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson`,
		nameAt: [{ from: 'Kyivska', point: [30.523, 50.45], to: 'Kyiv' }],
		simplify: '6%',
		center: [31.2, 48.4],
		attribution: 'State Enterprise "Kartographia" via geoBoundaries / HDX',
		license: 'CC BY 3.0 IGO'
	}
];

/** Ray casting on [lng, lat] rings. */
function inRing([x, y], ring) {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}
const polygonsOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);

/**
 * Renames the area of a given name that contains a point (e.g. Kyiv city vs Kyiv Oblast,
 * both "Kyivska"; the oblast has the city as a hole, so only the city contains it).
 */
function renameAt(input, rules) {
	const gj = JSON.parse(input);
	for (const { from, point, to } of rules) {
		const hits = gj.features.filter(
			(f) =>
				f.properties.shapeName === from &&
				polygonsOf(f.geometry).some(([outer, ...holes]) => inRing(point, outer) && !holes.some((h) => inRing(point, h)))
		);
		if (hits.length !== 1) throw new Error(`nameAt ${from} → ${to}: ${hits.length} areas contain the point`);
		hits[0].properties.shapeName = to;
	}
	return JSON.stringify(gj);
}

/**
 * Appends " (Parent)" to area names that occur more than once, using the parent
 * level (e.g. voivodeship) that contains an inner point of the area.
 */
async function disambiguate(input, parentUrl) {
	const gj = JSON.parse(input);
	const count = new Map();
	for (const f of gj.features) count.set(f.properties.shapeName, (count.get(f.properties.shapeName) ?? 0) + 1);
	const res = await fetch(parentUrl);
	if (!res.ok) throw new Error(`${parentUrl}: HTTP ${res.status}`);
	const parents = (await res.json()).features;
	const inner = JSON.parse(
		(await mapshaper.applyCommands('-i in.json -each "ix=this.innerX, iy=this.innerY" -o out.json format=geojson', { 'in.json': input }))[
			'out.json'
		]
	).features;
	gj.features.forEach((f, i) => {
		if (count.get(f.properties.shapeName) < 2) return;
		const point = [inner[i].properties.ix, inner[i].properties.iy];
		const parent = parents.find((p) => polygonsOf(p.geometry).some(([outer]) => inRing(point, outer)));
		if (!parent) throw new Error(`no parent area for ${f.properties.shapeName}`);
		f.properties.shapeName = `${f.properties.shapeName} (${parent.properties.shapeName})`;
	});
	return JSON.stringify(gj);
}

const WIDTH = 1000;

function toPath(geometry, project) {
	const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
	let d = '';
	for (const rings of polygons)
		for (const ring of rings) {
			const pts = ring.map(project);
			d += 'M' + pts.map(([x, y]) => `${x} ${y}`).join(' ') + 'Z';
		}
	return d;
}

mkdirSync('src/lib/geo/maps', { recursive: true });

for (const m of MAPS) {
	const res = await fetch(m.url);
	if (!res.ok) throw new Error(`${m.url}: HTTP ${res.status}`);
	let input = await res.text();
	if (m.disambiguateWith) input = await disambiguate(input, m.disambiguateWith);
	if (m.nameAt) input = renameAt(input, m.nameAt);

	const proj = `+proj=laea +lat_0=${m.center[1]} +lon_0=${m.center[0]} +datum=WGS84`;
	// dissolve: one area per name (some datasets split a district into several features).
	const dissolve = m.dissolve ? '-dissolve shapeName ' : '';
	const out = await mapshaper.applyCommands(
		`-i in.json ${dissolve}-simplify ${m.simplify} keep-shapes -proj ${proj} -o out.json format=geojson`,
		{ 'in.json': input }
	);
	const gj = JSON.parse(out['out.json']);

	let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
	const visit = (c) => {
		if (typeof c[0] === 'number') {
			minX = Math.min(minX, c[0]);
			maxX = Math.max(maxX, c[0]);
			minY = Math.min(minY, c[1]);
			maxY = Math.max(maxY, c[1]);
		} else c.forEach(visit);
	};
	gj.features.forEach((f) => visit(f.geometry.coordinates));
	const scale = WIDTH / (maxX - minX);
	const height = Math.ceil((maxY - minY) * scale);
	const round = (n) => Math.round(n * 10) / 10;
	const project = ([x, y]) => [round((x - minX) * scale), round((maxY - y) * scale)];

	const shapes = gj.features
		.map((f) => {
			// Some sources end names with (non-breaking) spaces, e.g. "Indre-et-Loire ".
			const raw = f.properties.shapeName.replace(/[\s ]+$/u, '');
			return { name: m.rename?.[raw] ?? raw, d: toPath(f.geometry, project) };
		})
		.sort((a, b) => a.name.localeCompare(b.name, 'cs'));

	const ts = `// GENERATED by scripts/build-maps.mjs. Do not edit.
// Source: ${m.url}
// Data: ${m.attribution}. Licence: ${m.license}. Simplified to ${m.simplify} with mapshaper.
import type { RegionMapData } from './types';

export const map: RegionMapData = ${JSON.stringify(
		{
			viewBox: `0 0 ${WIDTH} ${height}`,
			attribution: m.attribution,
			license: m.license,
			// For placing points (e.g. a sighting's location) on the map: see projectToMap().
			projection: { lon0: m.center[0], lat0: m.center[1], minX, maxY, scale },
			shapes
		},
		null,
		'\t'
	)};
`;
	writeFileSync(`src/lib/geo/maps/${m.file}.ts`, ts);
	const points = shapes.reduce((n, s) => n + s.d.split(' ').length / 2, 0);
	console.log(`${m.file}: ${shapes.length} shapes, ~${Math.round(points)} points, ${Math.round(ts.length / 1024)} kB`);
}
