import type { Region } from './types';

// Polish plates of the 1976–2000 system: white characters on black, "XYZ 1234" or
// "XYZ 123A" (until ~1980s the final-letter form was for state-owned cars). The first two
// letters are the area code, one of 2–6 codes per voivodeship of the 1975–1998 division
// (49 voivodeships); the third letter is a series. Checked 2026-11-16.
//
// Still valid: they lose validity on a change of owner, of the owner's residence or a
// sale to another county, but "nie ma jednak terminu ani obowiązku zmiany tablic na białe"
// (pl.wikipedia), so they are still seen on old cars.
// Sources:
// - https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Poland (area codes per voivodeship)
// - https://pl.wikipedia.org/wiki/Tablice_rejestracyjne_w_Polsce (validity)
// Left out: special codes of that system (MO militia, U army, HW border guard, HN, I
// foreigners, X test plates) and the 1956–1976 and pre-war systems (no longer on the road).
// Names: the voivodeship's capital. No map: the 1975–1998 voivodeships don't exist as
// boundary data in the sources used for the other maps.
// Plausibility: 49 voivodeships, 2–6 codes each (Warsaw 12).
const BY_VOIVODESHIP: Record<string, string[]> = {
	'Biała Podlaska': ['BP', 'BA', 'BS'],
	Białystok: ['BK', 'BT', 'BI'],
	'Bielsko-Biała': ['BB', 'BL', 'BO'],
	Bydgoszcz: ['BY', 'BG', 'BD', 'BC'],
	Chełm: ['CH', 'CM', 'CU'],
	Ciechanów: ['CI', 'CN', 'CA'],
	Częstochowa: ['CZ', 'CE', 'CO'],
	Elbląg: ['EL', 'EG', 'EB'],
	Gdańsk: ['GD', 'GK', 'GA', 'GN'],
	'Gorzów Wielkopolski': ['GO', 'GW', 'GR'],
	'Jelenia Góra': ['JG', 'JE', 'JA'],
	Kalisz: ['KL', 'KZ', 'KP'],
	Katowice: ['KA', 'KT', 'KB', 'KC', 'KD', 'KX'],
	Kielce: ['KI', 'KE', 'KJ'],
	Konin: ['KN', 'KM', 'KF'],
	Koszalin: ['KO', 'KG', 'KY'],
	Kraków: ['KR', 'KK', 'KW', 'KV'],
	Krosno: ['KS', 'KU', 'KH'],
	Legnica: ['LG', 'LC', 'LI'],
	Leszno: ['LE', 'LS', 'LN'],
	Lublin: ['LU', 'LL', 'LB'],
	Łomża: ['LO', 'LM', 'LA'],
	Łódź: ['LD', 'LZ', 'LF', 'LW'],
	'Nowy Sącz': ['NS', 'NO', 'NA'],
	Olsztyn: ['OL', 'ON', 'OT'],
	Opole: ['OP', 'OE', 'OD'],
	Ostrołęka: ['OS', 'OK', 'OR'],
	Piła: ['PI', 'PA', 'PY'],
	'Piotrków Trybunalski': ['PT', 'PK', 'PU'],
	Płock: ['PL', 'PC', 'PB'],
	Poznań: ['PO', 'PN', 'PZ', 'PW'],
	Przemyśl: ['PR', 'PM', 'PE'],
	Radom: ['RA', 'RO', 'RD'],
	Rzeszów: ['RZ', 'RE', 'RW'],
	Siedlce: ['SE', 'SD', 'ST'],
	Sieradz: ['SI', 'SA', 'SB'],
	Skierniewice: ['SK', 'SN', 'SF'],
	Słupsk: ['SL', 'SP', 'SG'],
	Suwałki: ['SU', 'SW', 'SO'],
	Szczecin: ['SZ', 'SC', 'SM'],
	Tarnobrzeg: ['TG', 'TB', 'TE'],
	Tarnów: ['TA', 'TN', 'TW'],
	Toruń: ['TO', 'TU', 'TY'],
	Wałbrzych: ['WB', 'WY', 'WH'],
	Warszawa: ['WA', 'WS', 'WI', 'WU', 'WG', 'WF', 'WX', 'WZ', 'WM', 'WT', 'WP', 'WV'],
	Włocławek: ['WL', 'WK', 'WE'],
	Wrocław: ['WR', 'WO', 'WC', 'WW'],
	Zamość: ['ZA', 'ZM', 'ZC'],
	'Zielona Góra': ['ZG', 'ZE', 'ZN']
};

export const plVintageRegions: Region[] = Object.entries(BY_VOIVODESHIP)
	.flatMap(([name, codes]) => codes.map((code) => ({ code, name })))
	.sort((a, b) => a.code.localeCompare(b.code));
