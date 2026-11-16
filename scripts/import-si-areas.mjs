// Builds scripts/data/si-municipality-areas.json: which Slovenian registration area each
// municipality of the geoBoundaries SVN ADM2 map data (OpenStreetMap) belongs to. Used by
// build-maps.mjs to merge the 212 municipalities into the 11 registration areas.
//
// Chain:
// - registration area → administrative units (upravne enote): sl.wikipedia "Registrske
//   tablice Slovenije" (table "Registracijsko območje / Upravna enota");
// - administrative unit → municipalities (občine): each unit's page on gov.si
//   ("Občine in naselja upravne enote …"), the official source;
// - municipality → map area: by name. The map data's names lost their Č/Š/Ž (replaced by
//   arbitrary letters: "Ajdovtcina", "Lmarje pri Jelcah") or are cut off ("Velike La"), so
//   a name matches when it equals the municipality's name except at Č/Ć/Š/Ž/Đ positions,
//   possibly cut off at the end. Ambiguous or unmatched names stop the import.
//
//   node scripts/import-si-areas.mjs      # writes the file (~120 requests, sequential)
import { mkdirSync, writeFileSync } from 'node:fs';

const PLATES = 'https://sl.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=Registrske%20tablice%20Slovenije';
const UNITS = 'https://sl.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=Upravne%20enote%20Slovenije';
const GOV = 'https://www.gov.si/drzavni-organi/upravne-enote/';
const MAP = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/SVN/ADM2/geoBoundaries-SVN-ADM2_simplified.geojson';
const headers = { 'User-Agent': 'spz-ky-data-import/1.0 (https://github.com/MatusPilnan/SPZky)' };
const OUT = 'scripts/data/si-municipality-areas.json';

/** Registration area names as in src/lib/data/si.ts. */
const AREA_NAMES = {
	CE: 'Celje',
	GO: 'Nova Gorica',
	KK: 'Krško',
	KP: 'Koper',
	KR: 'Kranj',
	LJ: 'Ljubljana',
	MB: 'Maribor',
	MS: 'Murska Sobota',
	NM: 'Novo mesto',
	PO: 'Postojna',
	SG: 'Slovenj Gradec'
};

/** Map names abbreviated beyond the generic matching. */
const FIX = { 'Sveti Andrac v Slov. goricah': 'Sveti Andraž v Slovenskih goricah' };

const get = async (url) => {
	const res = await fetch(url, { headers });
	if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
	return res.text();
};
/** Lower-case ASCII letters only. */
const fold = (s) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^a-z]/g, '');
/** Lower-case letters only, keeping Č Ć Š Ž Đ (the letters the map data garbled). */
const letters = (s) => s.toLowerCase().replace(/[^a-zčćšžđ]/g, '');
const SPECIAL = new Set('čćšžđ');
const BASE = { č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'd' };
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

// 1. Registration area → administrative units.
const plates = JSON.parse(await get(PLATES)).parse.wikitext.replace(/<!--[\s\S]*?-->/g, '');
const unitArea = new Map();
let area = null;
for (const line of plates.split('\n')) {
	const head = /^!\s*(?:rowspan="?\d+"?\s*\|)?\s*([A-Z]{2})\s*[–-]/.exec(line);
	if (head) area = AREA_NAMES[head[1]] ? head[1] : null;
	else if (line.startsWith('|}')) area = null;
	// Unit links only, not the example pictures ("[[Slika:Tablica SG - Radlje.jpg|250px]]").
	const unit = area && /^\|\s*\[\[(?!Slika:|File:|Datoteka:)([^|\]]+)(?:\|([^\]]+))?\]\]\s*$/.exec(line);
	if (unit) unitArea.set(fold(unit[2] ?? unit[1]), area);
}
if (unitArea.size !== 58) throw new Error(`expected 58 administrative units, got ${unitArea.size}`);

// 2. Administrative unit → municipalities (gov.si).
const slugs = [...new Set([...(await get(GOV)).matchAll(/\/drzavni-organi\/upravne-enote\/([a-z0-9-]+)\//g)].map((m) => m[1]))].filter(
	(s) => unitArea.has(fold(s))
);
if (slugs.length !== 58) throw new Error(`expected 58 units on gov.si, got ${slugs.length}`);
// Fallback: Wikipedia's article on the units names the municipalities of some units
// ("obsega pa ozemlje [[občina X|…]] in [[občina Y|…]]").
const units = JSON.parse(await get(UNITS)).parse.wikitext.replace(/<!--[\s\S]*?-->/g, '');
const wikiNames = new Map();
for (const section of units.split(/^===\s*Upravna enota /m).slice(1)) {
	const unit = section.slice(0, section.indexOf('==')).trim();
	const intro = section.slice(section.indexOf('\n'), section.indexOf('{{hlist'));
	const names = [...intro.matchAll(/\[\[(?:mestn[a-z]* )?občin[a-z]* ([^|\]]+)(?:\|[^\]]*)?\]\]/gi)].map((m) => m[1].trim());
	if (names.length) wikiNames.set(fold(unit), names);
}

/** The unit's municipalities from gov.si: unit page → "O upravni enoti" → "Občine in naselja". */
async function govNames(slug) {
	const home = await get(`${GOV}${slug}/`);
	const aboutLink = /href="([^"]*\/o-upravni-enoti[^"#]*)"/.exec(home)?.[1];
	if (!aboutLink) return [];
	const about = await get(new URL(aboutLink, GOV).href);
	// "obcine-in-naselja…", or "obcini-…" for two municipalities.
	const link = /href="([^"]*\/obcin[a-z]*-[^"#]*)"/.exec(about)?.[1];
	if (!link) return [];
	const page = decode(await get(new URL(link, GOV).href));
	return [...new Set([...page.matchAll(/(?:Mestna )?[Oo]bčina ([A-ZČŠŽ][^<,(\n]{1,45}?)\s*(?:<|,|\(|\n|$)/g)].map((m) => m[1].trim()))];
}

/**
 * One entry per municipality: drops spelling variants ("Miren - Kostanjevica" /
 * "Miren-Kostanjevica"), abbreviations ("Sv. Andraž…") and text the page ran on with
 * ("Prevalje obsega", "Zagorje ob Sav").
 */
function clean(names) {
	const unique = [...new Map(names.filter((n) => !n.includes('.')).map((n) => [fold(n), n])).values()];
	const cutOff = (n, o) => fold(o).length > fold(n).length && fold(o).startsWith(fold(n));
	const runOn = (n, o) => n.startsWith(o + ' ');
	return unique.filter((n) => !unique.some((o) => o !== n && ((cutOff(n, o) && !runOn(o, n)) || runOn(n, o))));
}

/**
 * Municipalities two unit pages name, in different registration areas: the unit they
 * belong to (the other page mentions them for a few settlements).
 */
const RESOLVE = { Škocjan: 'novo-mesto' };
/** Names on gov.si pages that aren't separate municipalities (misspelled duplicates). */
const NOT_MUNICIPALITIES = new Set(['Kostanjevica ob Krki']);

/** Units whose municipalities neither gov.si nor Wikipedia list in a parsable way. */
const MANUAL = {
	radovljica: ['Radovljica', 'Bled', 'Bohinj', 'Gorje'],
	trbovlje: ['Trbovlje'],
	vrhnika: ['Vrhnika', 'Borovnica', 'Log - Dragomer']
};

const municipalities = []; // { name, area, unit }
const report = [];
for (const slug of slugs) {
	const key = fold(slug);
	let names = clean(await govNames(slug));
	let source = 'gov.si';
	if (names.length === 0) [names, source] = [wikiNames.get(key) ?? [], 'wikipedia'];
	if (names.length === 0) [names, source] = [MANUAL[slug] ?? [], 'manual'];
	if (names.length === 0) report.push(`${slug}: no municipality list`);
	for (const listed of names) {
		const name = listed.split('/')[0].trim(); // "Hodoš/Hodos": bilingual
		if (NOT_MUNICIPALITIES.has(name) || (RESOLVE[name] && RESOLVE[name] !== slug)) continue;
		municipalities.push({ name, area: AREA_NAMES[unitArea.get(key)], unit: slug });
	}
	report.push(`${slug} (${source}): ${names.join(', ')}`);
}
console.log(report.join('\n'));
if (report.some((r) => r.endsWith('no municipality list'))) process.exit(1);
// A municipality listed by two units must not end up in two registration areas.
const areaOf = new Map();
for (const m of municipalities) {
	const prev = areaOf.get(fold(m.name));
	if (prev && prev.area !== m.area) throw new Error(`${m.name}: ${prev.unit} (${prev.area}) and ${m.unit} (${m.area})`);
	areaOf.set(fold(m.name), m);
}

// 3. Map areas → registration area.
function matches(mapName, official) {
	const g = fold(mapName);
	const o = letters(official);
	if (g.length > o.length || g.length < Math.min(o.length, 4)) return false;
	for (let i = 0; i < g.length; i++) if (g[i] !== o[i] && !SPECIAL.has(o[i])) return false;
	// Cut-off names must still be long enough to be unambiguous (checked below).
	return g.length === o.length || g.length >= 4;
}
const features = JSON.parse(await get(MAP)).features;
const result = {};
const problems = [];
const used = new Set();
for (const f of features) {
	const raw = f.properties.shapeName;
	const name = FIX[raw] ?? raw.split(' / ')[0];
	let hits = municipalities.filter((m) => matches(name, m.name));
	// Prefer the same spelling ("Trzin" is Trzin, not a garbled Tržič), then an exact-length
	// match over cut-off ones ("Ribnica" vs "Ribnica na Pohorju").
	const same = hits.filter((m) => fold(m.name) === fold(name));
	const full = hits.filter((m) => letters(m.name).length === fold(name).length);
	if (same.length) hits = same;
	else if (full.length) hits = full;
	// Same municipality listed twice (two pages) counts once.
	const areas = new Set(hits.map((m) => m.area));
	const ids = new Set(hits.map((m) => m.name));
	if (ids.size === 1) {
		result[raw] = hits[0].area;
		used.add(hits[0].name);
	} else problems.push(`${raw}: ${ids.size === 0 ? 'no match' : `ambiguous (${[...ids].join(', ')}; areas ${[...areas].join(', ')})`}`);
}
const allNames = new Set(municipalities.map((m) => m.name));
const missing = [...allNames].filter((n) => !used.has(n));
console.log(`${unitArea.size} units, ${allNames.size} municipalities, ${features.length} map areas`);
if (problems.length || missing.length) {
	console.log('problems:\n  ' + problems.join('\n  '));
	console.log('municipalities without map area:', missing.join(' | '));
	process.exit(1);
}
const counts = {};
for (const a of Object.values(result)) counts[a] = (counts[a] ?? 0) + 1;
console.log(counts);
mkdirSync('scripts/data', { recursive: true });
writeFileSync(OUT, JSON.stringify(Object.fromEntries(Object.entries(result).sort()), null, '\t') + '\n');
console.log(`wrote ${OUT}`);
