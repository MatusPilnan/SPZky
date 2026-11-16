// Imports the German district codes (Unterscheidungszeichen) from de.wikipedia's
// "Liste der Kfz-Kennzeichen in Deutschland" into src/lib/data/de.generated.ts.
//
//   node scripts/import-de-codes.mjs            # writes the file, prints what didn't match
//
// Each row of the per-letter tables: code | district(s) | derivation | federal state.
// Only rows with a federal state are regional (federal authorities like Y, BW, THW have
// none). Districts are mapped to the map areas of the geoBoundaries DEU ADM3 data
// ("Augsburg, Kreisfreie Stadt", "Augsburg, Landkreis"…); MANUAL fixes the rest.
import { writeFileSync } from 'node:fs';

const LIST = 'https://de.wikipedia.org/w/index.php?title=Liste_der_Kfz-Kennzeichen_in_Deutschland&action=raw';
const MAP = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/DEU/ADM3/geoBoundaries-DEU-ADM3_simplified.geojson';
const headers = { 'User-Agent': 'spz-ky-data-import/1.0 (https://github.com/MatusPilnan/SPZky)' };

/** District names (as in the list) that the automatic matching can't place. */
const MANUAL = {
	// Abbreviated in the map data.
	'Landkreis Dillingen an der Donau': 'Dillingen a.d. Donau',
	'Landkreis Neustadt an der Waldnaab': 'Neustadt a.d. Waldnaab',
	'Landkreis Neustadt an der Aisch-Bad Windsheim': 'Neustadt a.d. Aisch-Bad Windsheim',
	'Landkreis Neumarkt in der Oberpfalz': 'Neumarkt i.d. OPf.',
	'Landkreis Wunsiedel im Fichtelgebirge': 'Wunsiedel i. Fichtelgebirge',
	'Landkreis Mühldorf am Inn': 'Mühldorf a. Inn',
	'Landkreis Pfaffenhofen an der Ilm': 'Pfaffenhofen a.d. Ilm',
	'Landkreis Nienburg/Weser': 'Nienburg (Weser)',
	'Landkreis Friesland': 'Friesland (DE)',
	'Stadt Hof (Saale)': 'Hof, Kreisfreie Stadt',
	'Stadt Weiden in der Oberpfalz': 'Weiden i.d. Opf, Kreisfreie Stadt',
	'Stadt Oldenburg (Oldb)': 'Oldenburg (Oldenburg), Kreisfreie Stadt',
	// Cities with their own code that lie in a larger district.
	'Stadt Greifswald': 'Vorpommern-Greifswald',
	'Stadt Stralsund': 'Vorpommern-Rügen',
	'Stadt Wismar': 'Nordwestmecklenburg',
	'Stadt Neubrandenburg': 'Mecklenburgische Seenplatte',
	'Stadt Hanau': 'Main-Kinzig-Kreis',
	'Stadt Völklingen': 'Regionalverband Saarbrücken',
	'Stadt St. Ingbert': 'Saarpfalz-Kreis',
	'Büsingen am Hochrhein': 'Konstanz'
};

/** Non-regional holders that share a code with a district (state governments, police…). */
const NOT_A_DISTRICT =
	/Senat|Abgeordnetenhaus|Diplomat|Landesregierung|Staatsregierung|Landtag|Bürgerschaft|Polizei|^(Baden-Württemberg|Bayern|Brandenburg|Hessen|Mecklenburg-Vorpommern|Niedersachsen|Nordrhein-Westfalen|Rheinland-Pfalz|Saarland|Sachsen|Sachsen-Anhalt|Schleswig-Holstein|Thüringen)$/;

const wiki = (await (await fetch(LIST, { headers })).text()).replace(/<!--[\s\S]*?-->/g, '');
const areas = [...new Set((await (await fetch(MAP, { headers })).json()).features.map((f) => f.properties.shapeName))];
const areaSet = new Set(areas);

/** [[Target|Label]] → Label, [[Target]] → Target, '''x''' → x */
const plain = (s) =>
	s
		.replace(/<ref[^>]*\/>|<ref[^>]*>.*?<\/ref>/g, '')
		.replace(/\[\[([^|\]]*)\|([^\]]*)\]\]/g, '$2')
		.replace(/\[\[([^\]]*)\]\]/g, '$1')
		.replace(/'''?/g, '')
		.replace(/<[^>]+>/g, '')
		.replace(/\{\{[^}]*\}\}/g, '')
		.trim();
/**
 * Districts named in a cell: "[[Landkreis X]]", "Stadt [[X]]", or several joined with
 * "und" / "," ("[[Landkreis Darmstadt-Dieburg]] und Stadt [[Darmstadt]]").
 */
const districtsIn = (s) =>
	s
		.split(/\s+und\s+|,\s+(?=\[\[|Stadt )/)
		.map((part) => {
			const links = [...part.matchAll(/\[\[([^|\]]*)/g)].map((m) => m[1].trim());
			if (!links.length) return plain(part);
			// "Stadt [[Anklam]] im [[Landkreis Vorpommern-Greifswald]]": the district counts.
			const district = links.find((l) => /^(Landkreis|Kreis|Region|Städteregion|Regionalverband) |kreis$/.test(l));
			if (district) return district;
			return /Stadt\s*\[\[/.test(part) ? `Stadt ${links[0]}` : links[0];
		})
		.filter(Boolean);
const cellValue = (c) => c.replace(/^\s*(rowspan|colspan)="\d+"\s*\|/, '').trim();
const isCodeCell = (c) => /^'''/.test(cellValue(c));

function toArea(district) {
	if (MANUAL[district]) return MANUAL[district];
	const tries = [];
	let m;
	if ((m = /^Stadt (.+)$/.exec(district))) tries.push(`${m[1]}, Kreisfreie Stadt`, `${m[1]}, Stadtkreis`, m[1]);
	if ((m = /^(?:Landkreis|Kreis) (.+)$/.exec(district))) tries.push(`${m[1]}, Landkreis`, `${m[1]}, Kreis`, m[1]);
	tries.push(district, `${district}, Kreisfreie Stadt`, `${district}, Stadtkreis`, `${district}, Landkreis`);
	return tries.find((t) => areaSet.has(t)) ?? null;
}

// Rows of the tables in sections "=== A ===" … "=== Z ===". rowspan on the code cell
// means several districts share the code (they follow in the next rows, district cell only).
const rows = [];
for (const [, letter, body] of wiki.matchAll(/^=== ([A-ZÄÖÜ]) ===\n([\s\S]*?)(?=^=== |\n== )/gm)) {
	const lines = body.split('\n|-').slice(1);
	let pending = null;
	for (const raw of lines) {
		const cells = raw
			.split('\n')
			.filter((l) => l.startsWith('|') && !l.startsWith('|}'))
			.map((l) => l.slice(1));
		if (cells.length >= 3 && isCodeCell(cells[0])) {
			const span = /rowspan="(\d+)"/.exec(cells[0]);
			const code = plain(cellValue(cells[0]));
			const state = plain(cellValue(cells[cells.length - 1]));
			const derivation = plain(cellValue(cells[cells.length - 2]));
			pending = { letter, code, state, derivation, districts: districtsIn(cellValue(cells[1])), left: span ? Number(span[1]) - 1 : 0 };
			rows.push(pending);
		} else if (cells.length >= 1 && pending?.left) {
			// Another district of the code above (its own derivation/state cells may follow).
			pending.districts.push(...districtsIn(cellValue(cells[0])));
			pending.left--;
		}
	}
}

const STATES = new Set([
	'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern',
	'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt',
	'Schleswig-Holstein', 'Thüringen'
]);
const regional = rows.filter((r) => STATES.has(r.state) && /^[A-ZÄÖÜ]{1,3}$/.test(r.code));
const skipped = rows.filter((r) => !regional.includes(r)).map((r) => `${r.code} (${r.state || '–'})`);

const unmatched = new Set();
/**
 * Display name: what the code stands for (the list's "derivation": AA = Aalen, ANK =
 * Anklam), whose code letters are bolded in the source and sometimes capitalised mid-word
 * ("MuldenTaL" → "Muldental"); without one, the district(s).
 */
function displayName(derivation, districts) {
	const fixCase = (word) => (/^[^A-ZÄÖÜ]*$|^[A-ZÄÖÜ.]+$/.test(word.slice(1)) && word.length < 4 ? word : word[0] + word.slice(1).toLowerCase());
	const d = derivation.split(' / ')[0].replace(/\s+/g, ' ').trim();
	if (d) return d.replace(/[\p{L}.]+/gu, (w) => (/[A-ZÄÖÜ]/.test(w.slice(1)) ? fixCase(w) : w));
	const short = districts.map((x) => x.replace(/^(Landkreis|Kreis|Stadt) /, ''));
	return [...new Set(short)].join(' / ');
}
// Codes of state parliaments/governments only (no district left) are not regional.
const authorityOnly = regional.filter((r) => r.districts.every((d) => NOT_A_DISTRICT.test(d)));
const out = regional
	.filter((r) => !authorityOnly.includes(r))
	.map((r) => {
		const districts = r.districts.filter((d) => !NOT_A_DISTRICT.test(d));
		const mapped = districts.map((d) => toArea(d) ?? (unmatched.add(`${d} (${r.code})`), null)).filter(Boolean);
		// Eisenach joined the Wartburgkreis in 2021 but is still separate in the map data.
		if (r.code === 'EA') mapped.push('Eisenach, Kreisfreie Stadt');
		return { code: r.code, name: displayName(r.derivation, districts), areas: [...new Set(mapped)] };
	});
console.log('authority-only codes left out:', authorityOnly.map((r) => r.code).join(', '));

const usedAreas = new Set(out.flatMap((r) => r.areas));
const areasWithoutCode = areas.filter((a) => !usedAreas.has(a));

const ts = `// GENERATED by scripts/import-de-codes.mjs from de.wikipedia "Liste der Kfz-Kennzeichen in
// Deutschland" (Stand 1 December 2023 per the article; imported ${new Date().toISOString().slice(0, 10)}). Do not edit;
// see src/lib/data/de.ts for the sources, what's in and what's out.
export const deTable: { code: string; name: string; areas: string[] }[] = ${JSON.stringify(out, null, '\t')};
`;
writeFileSync('src/lib/data/de.generated.ts', ts);
console.log(`regional codes: ${out.length}, skipped (not regional): ${skipped.length}`);
console.log('skipped:', skipped.join(', '));
console.log('unmatched districts:', [...unmatched].join(' | ') || '–');
console.log('map areas without a code:', areasWithoutCode.join(' | ') || '–');
