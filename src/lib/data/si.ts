import type { Region } from './types';

// Slovenian registration areas (registracijska območja). Checked 2026-11-16.
//
// Plates: two-letter area code, the coat of arms of the administrative unit (upravna
// enota) that issued them, then the registration mark (letters and digits; letters of the
// Slovenian alphabet without Č Š Ž, plus X Y W).
// Sources:
// - https://sl.wikipedia.org/wiki/Registrske_tablice_Slovenije ("V Sloveniji je 11
//   registracijskih območij"; 8 in Yugoslav times, without Krško, Postojna and Slovenj
//   Gradec; the designs issued until 2004 and 2004–2008 are "še vedno v uporabi")
// - https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Slovenia (same 11 codes)
// Neither source gives the exact serial format, so detection accepts 3–6 letters/digits
// with at least one digit after the code (medium confidence).
// No bonus collection: the older Slovenian designs use the same 11 codes; the sources
// don't say Yugoslav-era plates (before 1991) are still valid.
// No map: the areas group the 58 administrative units, which aren't available as boundary
// data (only 2 macro-regions or 212 municipalities with garbled names, share-alike).
// Left out: diplomatic, test (PR), dealer, temporary and export plates.
// Plausibility: 11 areas, one code each.
export const siRegions: Region[] = [
	{ code: 'CE', name: 'Celje' },
	{ code: 'GO', name: 'Nova Gorica' },
	{ code: 'KK', name: 'Krško' },
	{ code: 'KP', name: 'Koper' },
	{ code: 'KR', name: 'Kranj' },
	{ code: 'LJ', name: 'Ljubljana' },
	{ code: 'MB', name: 'Maribor' },
	{ code: 'MS', name: 'Murska Sobota' },
	{ code: 'NM', name: 'Novo mesto' },
	{ code: 'PO', name: 'Postojna' },
	{ code: 'SG', name: 'Slovenj Gradec' }
];
