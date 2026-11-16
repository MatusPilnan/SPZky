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
// What's out (not regional): A (federal top officials), BB, BD, BG, BH (army), BP
// (police), FV, FW, JW, PT, ZW, and the diplomatic/consular series (WD, WK, GK, KK, LK, SK,
// TD, TK, VD, BK, KD, LD). The black plates 1947–1989 are their own bonus collection
// (atVintageRegions below).
// Plausibility: 106 codes = 93 of the 94 map areas with a code of their own (Rust shares
// E with Eisenstadt) + 5 second codes in one area (LN Leoben, BA/GB Liezen, KG Tulln, SW
// Bruck an der Leitha) + 8 codes of merged/dissolved districts.
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
	{ code: 'ND', name: 'Neusiedl am See' },
	{ code: 'NK', name: 'Neunkirchen' },
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
	{ code: 'SV', name: 'St. Veit an der Glan' },
	{ code: 'SW', name: 'Schwechat' },
	{ code: 'SZ', name: 'Schwaz' },
	{ code: 'TA', name: 'Tamsweg' },
	{ code: 'TU', name: 'Tulln' },
	{ code: 'UU', name: 'Urfahr-Umgebung' },
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

/** Codes without a map area (dissolved Wien-Umgebung). */
export const atUnmappedCodes = new Set(['WU']);

// Bonus collection: black plates 1947–1989, white on black, "W 123.456" (state or city code +
// up to six digits; "XX 999.A99" once the numbers ran out). Since 1 January 1990 only the
// current plates are issued, but black plates stay valid "solange sich an der Zulassung
// nichts ändert": >126,000 were still registered in 2025 (de.wikipedia). Codes: the nine
// states (B Burgenland, K Kärnten, N Niederösterreich, O Oberösterreich, S Salzburg,
// ST Steiermark, T Tirol, V Vorarlberg, W Wien) and the cities G (Graz) and L (Linz).
// Left out: BH (army) and PT (post). Sources as above (checked 2026-11-16).
export const atVintageRegions: Region[] = [
	{ code: 'B', name: 'Burgenland' },
	{ code: 'G', name: 'Graz' },
	{ code: 'K', name: 'Kärnten' },
	{ code: 'L', name: 'Linz' },
	{ code: 'N', name: 'Niederösterreich' },
	{ code: 'O', name: 'Oberösterreich' },
	{ code: 'S', name: 'Salzburg' },
	{ code: 'ST', name: 'Steiermark' },
	{ code: 'T', name: 'Tirol' },
	{ code: 'V', name: 'Vorarlberg' },
	{ code: 'W', name: 'Wien' }
];
