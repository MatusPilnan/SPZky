import type { Region } from './types';

// Austrian district and city codes (Bezirks-/Behördenkennzeichen). Checked 2026-11-16.
//
// Sources:
// - https://de.wikipedia.org/wiki/Kfz-Kennzeichen_(Österreich) (codes, status, validity)
// - https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Austria (codes, formats)
// Both lists agree. One difference: en.wikipedia marks BA (Bad Aussee) as suspended in
// 2013; de.wikipedia says it was reinstated on 7 April 2025 (Außenstelle of BH Liezen) — kept.
//
// What's in:
// - Every current district and statutory-city code (94 districts/cities; some have two
//   codes: Leoben LE/LN, Liezen LI + offices BA/GB, Tulln TU + Klosterneuburg KG,
//   Bruck an der Leitha BL + Schwechat SW).
// - Codes of districts merged in 2012/13 and Wien-Umgebung (dissolved 2017): FB, FF, HB,
//   JU, KF, MZ, RA, WU. Standard plates stay valid until the car is re-registered
//   ("verlieren bei Ummeldung die Gültigkeit"), personalised ones for their 15 years, so
//   they are still on the road.
// - State codes N, O, ST, T, V of the black plates 1947–1989 (B, K, S, W are also city
//   codes). Black plates stay valid "solange sich an der Zulassung nichts ändert";
//   >126,000 were still registered in 2025 (de.wikipedia).
// What's out (not regional): A (federal top officials), BB, BD, BG, BH (army), BP
// (police), FV, FW, JW, PT, ZW, and the diplomatic/consular series (WD, WK, GK, KK, LK, SK,
// TD, TK, VD, BK, KD, LD).
// Plausibility: 111 codes = 93 of the 94 map areas with a code of their own (Rust shares
// E with Eisenstadt) + 5 second codes in one area (LN Leoben, BA/GB Liezen, KG Tulln, SW
// Bruck an der Leitha) + 8 codes of merged/dissolved districts + 5 black-plate state codes.
// Note: B on a black plate means Burgenland, on a current plate Bregenz; K/S/W are both city
// and state. They are one code each here, named after the current district.
export const atRegions: Region[] = [
	{ code: 'AM', name: 'Amstetten' },
	{ code: 'B', name: 'Bregenz' },
	{ code: 'BA', name: 'Bad Aussee' },
	{ code: 'BL', name: 'Bruck an der Leitha' },
	{ code: 'BM', name: 'Bruck-Mürzzuschlag' },
	{ code: 'BN', name: 'Baden' },
	{ code: 'BR', name: 'Braunau am Inn' },
	{ code: 'BZ', name: 'Bludenz' },
	{ code: 'DL', name: 'Deutschlandsberg' },
	{ code: 'DO', name: 'Dornbirn' },
	{ code: 'E', name: 'Eisenstadt' },
	{ code: 'EF', name: 'Eferding' },
	{ code: 'EU', name: 'Eisenstadt-Umgebung' },
	{ code: 'FB', name: 'Feldbach' },
	{ code: 'FE', name: 'Feldkirchen' },
	{ code: 'FF', name: 'Fürstenfeld' },
	{ code: 'FK', name: 'Feldkirch' },
	{ code: 'FR', name: 'Freistadt' },
	{ code: 'G', name: 'Graz' },
	{ code: 'GB', name: 'Gröbming' },
	{ code: 'GD', name: 'Gmünd' },
	{ code: 'GF', name: 'Gänserndorf' },
	{ code: 'GM', name: 'Gmunden' },
	{ code: 'GR', name: 'Grieskirchen' },
	{ code: 'GS', name: 'Güssing' },
	{ code: 'GU', name: 'Graz-Umgebung' },
	{ code: 'HA', name: 'Hallein' },
	{ code: 'HB', name: 'Hartberg' },
	{ code: 'HE', name: 'Hermagor' },
	{ code: 'HF', name: 'Hartberg-Fürstenfeld' },
	{ code: 'HL', name: 'Hollabrunn' },
	{ code: 'HO', name: 'Horn' },
	{ code: 'I', name: 'Innsbruck' },
	{ code: 'IL', name: 'Innsbruck-Land' },
	{ code: 'IM', name: 'Imst' },
	{ code: 'JE', name: 'Jennersdorf' },
	{ code: 'JO', name: 'St. Johann im Pongau' },
	{ code: 'JU', name: 'Judenburg' },
	{ code: 'K', name: 'Klagenfurt' },
	{ code: 'KB', name: 'Kitzbühel' },
	{ code: 'KF', name: 'Knittelfeld' },
	{ code: 'KG', name: 'Klosterneuburg' },
	{ code: 'KI', name: 'Kirchdorf an der Krems' },
	{ code: 'KL', name: 'Klagenfurt-Land' },
	{ code: 'KO', name: 'Korneuburg' },
	{ code: 'KR', name: 'Krems-Land' },
	{ code: 'KS', name: 'Krems an der Donau' },
	{ code: 'KU', name: 'Kufstein' },
	{ code: 'L', name: 'Linz' },
	{ code: 'LA', name: 'Landeck' },
	{ code: 'LB', name: 'Leibnitz' },
	{ code: 'LE', name: 'Leoben' },
	{ code: 'LF', name: 'Lilienfeld' },
	{ code: 'LI', name: 'Liezen' },
	{ code: 'LL', name: 'Linz-Land' },
	{ code: 'LN', name: 'Leoben' },
	{ code: 'LZ', name: 'Lienz' },
	{ code: 'MA', name: 'Mattersburg' },
	{ code: 'MD', name: 'Mödling' },
	{ code: 'ME', name: 'Melk' },
	{ code: 'MI', name: 'Mistelbach' },
	{ code: 'MT', name: 'Murtal' },
	{ code: 'MU', name: 'Murau' },
	{ code: 'MZ', name: 'Mürzzuschlag' },
	{ code: 'N', name: 'Niederösterreich' },
	{ code: 'ND', name: 'Neusiedl am See' },
	{ code: 'NK', name: 'Neunkirchen' },
	{ code: 'O', name: 'Oberösterreich' },
	{ code: 'OP', name: 'Oberpullendorf' },
	{ code: 'OW', name: 'Oberwart' },
	{ code: 'P', name: 'St. Pölten' },
	{ code: 'PE', name: 'Perg' },
	{ code: 'PL', name: 'St. Pölten-Land' },
	{ code: 'RA', name: 'Bad Radkersburg' },
	{ code: 'RE', name: 'Reutte' },
	{ code: 'RI', name: 'Ried im Innkreis' },
	{ code: 'RO', name: 'Rohrbach' },
	{ code: 'S', name: 'Salzburg' },
	{ code: 'SB', name: 'Scheibbs' },
	{ code: 'SD', name: 'Schärding' },
	{ code: 'SE', name: 'Steyr-Land' },
	{ code: 'SL', name: 'Salzburg-Umgebung' },
	{ code: 'SO', name: 'Südoststeiermark' },
	{ code: 'SP', name: 'Spittal an der Drau' },
	{ code: 'SR', name: 'Steyr' },
	{ code: 'ST', name: 'Steiermark' },
	{ code: 'SV', name: 'St. Veit an der Glan' },
	{ code: 'SW', name: 'Schwechat' },
	{ code: 'SZ', name: 'Schwaz' },
	{ code: 'T', name: 'Tirol' },
	{ code: 'TA', name: 'Tamsweg' },
	{ code: 'TU', name: 'Tulln' },
	{ code: 'UU', name: 'Urfahr-Umgebung' },
	{ code: 'V', name: 'Vorarlberg' },
	{ code: 'VB', name: 'Vöcklabruck' },
	{ code: 'VI', name: 'Villach' },
	{ code: 'VK', name: 'Völkermarkt' },
	{ code: 'VL', name: 'Villach-Land' },
	{ code: 'VO', name: 'Voitsberg' },
	{ code: 'W', name: 'Wien' },
	{ code: 'WB', name: 'Wiener Neustadt-Land' },
	{ code: 'WE', name: 'Wels' },
	{ code: 'WL', name: 'Wels-Land' },
	{ code: 'WN', name: 'Wiener Neustadt' },
	{ code: 'WO', name: 'Wolfsberg' },
	{ code: 'WT', name: 'Waidhofen an der Thaya' },
	{ code: 'WU', name: 'Wien-Umgebung' },
	{ code: 'WY', name: 'Waidhofen an der Ybbs' },
	{ code: 'WZ', name: 'Weiz' },
	{ code: 'ZE', name: 'Zell am See' },
	{ code: 'ZT', name: 'Zwettl' }
];

/** Codes used on the black plates 1947–1989 (states, plus the cities Graz and Linz). */
export const atBlackPlateCodes = new Set(['B', 'G', 'K', 'L', 'N', 'O', 'S', 'ST', 'T', 'V', 'W']);

/** Codes without a map area of their own (states of the old black plates, dissolved Wien-Umgebung). */
export const atUnmappedCodes = new Set(['N', 'O', 'ST', 'T', 'V', 'WU']);
