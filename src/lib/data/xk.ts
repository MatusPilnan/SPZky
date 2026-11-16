import type { Region } from './types';

// Kosovo (RKS plates) district codes. Checked 2026-11-16.
//
// Format since December 2010: two-digit district code, three digits (from 101), two letters
// ("01 234-AB"); band code RKS. Mandatory for residents since 1 June 2012; since early 2024
// Kosovo accepts only RKS plates for its residents (Serbian plates with the Kosovo codes
// are in the Serbian collection, marked rare).
//
// Sources:
// - https://sr.wikipedia.org/wiki/Регистарске_ознаке_у_Србији, section "Косово и Метохија"
//   (codes 01–07 per district, system in use since December 2010; Serbian is an official
//   language of Kosovo)
// - https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Kosovo (same codes, format,
//   start at 101, obligation since 2012)
// - https://www.europlates.eu/license-plates/europe/kosovo.htm (same codes, special series)
// What's out: police (district number shifted), emergency (112), customs (DG), government
// (3Z/4Z/5Z), diplomatic (CD), KSF/FSK, EULEX, KFOR, OSCE, UNMIK, temporary (RP).
// No bonus collection: the UNMIK-era "KS" plates (1999–2010) are no longer issued and RKS
// plates are mandatory, so they aren't on the road any more.
// Map: the 7 districts (OpenStreetMap via geoBoundaries, CC BY-SA 2.0).
// Plausibility: 7 districts, 7 codes.
const TABLE: [code: string, name: string][] = [
	['01', 'Prishtina'],
	['02', 'Mitrovica'],
	['03', 'Peja'],
	['04', 'Prizren'],
	['05', 'Ferizaj'],
	['06', 'Gjilan'],
	['07', 'Gjakova']
];

export const xkRegions: Region[] = TABLE.map(([code, name]) => ({ code, name }));
