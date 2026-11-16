import type { Region } from './types';

// Bulgarian province codes. Checked 2026-11-16.
//
// Format "X(X) NNNN Y(Y)": province code of 1–2 Cyrillic letters that look Latin
// (А В Е К М Н О Р С Т У Х; stored in Latin, normalizePlate maps Cyrillic), four digits,
// a series of 1–2 letters. Electric vehicles since 17 Nov 2022: "ЕА NNNN XX" (cars) and
// "ЕМ NNNN X" (motorcycles) with no province code: they go to the nationwide section.
//
// Sources:
// - https://bg.wikipedia.org/wiki/Регистрационен_номер_на_МПС_(България) (codes per province,
//   EV plates without a province code)
// - https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Bulgaria (same codes; all
//   plates of the systems before 1992 became invalid, hyphenated ones in 1993)
// No bonus collection: no older system is still valid.
// Left out: army (BA), civil protection (CP, no longer used), temporary/transit, foreigners'
// (XX/XH), diplomatic (C/CC/CT on red: own format).
// Plausibility: 28 provinces, Sofia city with three codes (C, CA, CB) → 30 codes.
const TABLE: [code: string, name: string, area?: string][] = [
	['A', 'Burgas'],
	['B', 'Varna'],
	['BH', 'Vidin'],
	['BP', 'Vratsa'],
	['BT', 'Veliko Tarnovo'],
	['C', 'Sofia (city)', 'Sofia City'],
	['CA', 'Sofia (city)', 'Sofia City'],
	['CB', 'Sofia (city)', 'Sofia City'],
	['CC', 'Silistra'],
	['CH', 'Sliven'],
	['CM', 'Smolyan'],
	['CO', 'Sofia (province)', 'Sofia'],
	['CT', 'Stara Zagora'],
	['E', 'Blagoevgrad'],
	['EB', 'Gabrovo'],
	['EH', 'Pleven'],
	['H', 'Shumen'],
	['K', 'Kardzhali'],
	['KH', 'Kyustendil'],
	['M', 'Montana'],
	['OB', 'Lovech'],
	['P', 'Ruse'],
	['PA', 'Pazardzhik'],
	['PB', 'Plovdiv'],
	['PK', 'Pernik'],
	['PP', 'Razgrad'],
	['T', 'Targovishte'],
	['TX', 'Dobrich'],
	['X', 'Haskovo'],
	['Y', 'Yambol']
];

export const bgRegions: Region[] = TABLE.map(([code, name, area]) => (area ? { code, name, area } : { code, name }));
