import type { Region } from './types';

// Swiss canton codes. Checked 2026-11-16.
//
// Format (system since 1933, white plates): two-letter canton code + a number of up to six
// digits ("ZH 123456"; small cantons up to five). Seven digits are allowed for ZH and BE
// from January 2026 (first ones expected 2027). No EU band; the rear plate shows the Swiss
// and cantonal coats of arms. Detection needs at least 5 characters (as for every country),
// so numbers of 1–2 digits ("AI 12") are picked by hand.
//
// Sources:
// - https://de.wikipedia.org/wiki/Kontrollschild_(Schweiz) (codes, number lengths per canton,
//   seven digits for ZH/BE, special series)
// - https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Switzerland (same 26 codes,
//   federal A/P plates replaced by cantonal ones in 2004)
// What's out: dealer plates (suffix U), temporary/customs (Z), diplomatic (CD/CC/AT), army
// (M + number), federal A/P (abolished 2004), FL (Liechtenstein, a separate country).
// No bonus collection: the plates of 1933 are the current system.
// Names: the canton's own name (as on the swisstopo map), which matches the map areas.
// Plausibility: 26 cantons, one code each → 26.
const TABLE: [code: string, name: string][] = [
	['AG', 'Aargau'],
	['AI', 'Appenzell Innerrhoden'],
	['AR', 'Appenzell Ausserrhoden'],
	['BE', 'Bern'],
	['BL', 'Basel-Landschaft'],
	['BS', 'Basel-Stadt'],
	['FR', 'Fribourg'],
	['GE', 'Genève'],
	['GL', 'Glarus'],
	['GR', 'Graubünden'],
	['JU', 'Jura'],
	['LU', 'Luzern'],
	['NE', 'Neuchâtel'],
	['NW', 'Nidwalden'],
	['OW', 'Obwalden'],
	['SG', 'St. Gallen'],
	['SH', 'Schaffhausen'],
	['SO', 'Solothurn'],
	['SZ', 'Schwyz'],
	['TG', 'Thurgau'],
	['TI', 'Ticino'],
	['UR', 'Uri'],
	['VD', 'Vaud'],
	['VS', 'Valais'],
	['ZG', 'Zug'],
	['ZH', 'Zürich']
];

export const chRegions: Region[] = TABLE.map(([code, name]) => ({ code, name }));
