import type { Region } from './types';

// Romanian county codes (indicative auto). Checked 2026-11-16.
//
// Format since 1992: "CJ 12 ABC" (county, two digits, three letters; Bucharest "B 123 ABC"
// with up to three digits). Letter groups never start with I or O and never use Q.
// Sources:
// - https://ro.wikipedia.org/wiki/Numerele_de_înmatriculare_auto_în_România (county list, format)
// - https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Romania (same 42 codes; the
//   1966–1992 plates "remained valid until 2000", so no bonus collection)
// Left out: army (A + digits), MAI (interior ministry), diplomatic (CD, TC, CO), temporary
// plates (red, or with an expiry band). Green-lettered electric plates keep the county code.
// Plausibility: 41 counties + Bucharest = 42 codes.
const TABLE: [code: string, name: string, area: string][] = [
	['B', 'București', 'BUCURESTI'],
	['AB', 'Alba', 'ALBA'],
	['AG', 'Argeș', 'ARGES'],
	['AR', 'Arad', 'ARAD'],
	['BC', 'Bacău', 'BACAU'],
	['BH', 'Bihor', 'BIHOR'],
	['BN', 'Bistrița-Năsăud', 'BISTRITA-NASAUD'],
	['BR', 'Brăila', 'BRAILA'],
	['BT', 'Botoșani', 'BOTOSANI'],
	['BV', 'Brașov', 'BRASOV'],
	['BZ', 'Buzău', 'BUZAU'],
	['CJ', 'Cluj', 'CLUJ'],
	['CL', 'Călărași', 'CALARASI'],
	['CS', 'Caraș-Severin', 'CARAS-SEVERIN'],
	['CT', 'Constanța', 'CONSTANTA'],
	['CV', 'Covasna', 'COVASNA'],
	['DB', 'Dâmbovița', 'DAMBOVITA'],
	['DJ', 'Dolj', 'DOLJ'],
	['GJ', 'Gorj', 'GORJ'],
	['GL', 'Galați', 'GALATI'],
	['GR', 'Giurgiu', 'GIURGIU'],
	['HD', 'Hunedoara', 'HUNEDOARA'],
	['HR', 'Harghita', 'HARGHITA'],
	['IF', 'Ilfov', 'ILFOV'],
	['IL', 'Ialomița', 'IALOMITA'],
	['IS', 'Iași', 'IASI'],
	['MH', 'Mehedinți', 'MEHEDINTI'],
	['MM', 'Maramureș', 'MARAMURES'],
	['MS', 'Mureș', 'MURES'],
	['NT', 'Neamț', 'NEAMT'],
	['OT', 'Olt', 'OLT'],
	['PH', 'Prahova', 'PRAHOVA'],
	['SB', 'Sibiu', 'SIBIU'],
	['SJ', 'Sălaj', 'SALAJ'],
	['SM', 'Satu Mare', 'SATU MARE'],
	['SV', 'Suceava', 'SUCEAVA'],
	['TL', 'Tulcea', 'TULCEA'],
	['TM', 'Timiș', 'TIMIS'],
	['TR', 'Teleorman', 'TELEORMAN'],
	['VL', 'Vâlcea', 'VALCEA'],
	['VN', 'Vrancea', 'VRANCEA'],
	['VS', 'Vaslui', 'VASLUI']
];

export const roRegions: Region[] = TABLE.map(([code, name, area]) => ({ code, name, area }));
