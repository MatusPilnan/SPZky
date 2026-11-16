import type { Region } from './types';

// Ukrainian region codes. Checked 2026-11-16.
//
// Plates use only the Cyrillic letters that look like Latin ones (А В Е І К М Н О Р С Т Х);
// codes are stored in their Latin form and normalizePlate maps typed Cyrillic to Latin.
//
// Sources:
// - https://uk.wikipedia.org/wiki/Номерні_знаки_України (2004/2013/2021 codes per region,
//   citing the official list zakon.rada.gov.ua/laws/show/z0353-21; 1995–2004 series per region)
// - https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Ukraine (same 2004/2013/2021
//   codes; its 1995 table has errors, e.g. РА for both Zakarpattia and Rivne, so the
//   Ukrainian table is used for the bonus collection)
// - https://hsc.gov.ua (MVS service centres, 2025): plates issued before 2004 ("п'ять цифр і
//   дві літери") may still be used on the road, but must be exchanged at any registration
//   change; online registrations since Dec 2022 get the series DI/PD (Diia) or ED/DC
//   (driver's e-cabinet) instead of a region code.
//
// Current system (since 2004): "AA 1234 BB" = region code, four digits, series. Every region
// has four codes: from 2004, 2013 and two from 2021. Left out (not regional): DI, PD, ED,
// DC (online registration), II (national series, withdrawn 2006), BP (parliament), police,
// military, diplomatic and transit series. The codes of Crimea, Sevastopol and the occupied
// parts of other regions are Ukrainian codes still on Ukrainian-registered cars and are kept.
// Plausibility: 27 regions (24 oblasts, Crimea, Kyiv, Sevastopol) × 4 = 108 codes, minus
// KK listed for both Crimea (2013) and Kyiv (2021): kept for Kyiv only → 107.
const CURRENT: [name: string, area: string, codes: string[]][] = [
	// KK was Crimea's 2013 code, but the 2021 list gives KK to Kyiv (Crimea occupied since 2014).
	['AR Krym', 'Avtonomna Respublika Krym', ['AK', 'TK', 'MK']],
	['Vinnytska oblast', 'Vinnytska', ['AB', 'KB', 'IM', 'PI']],
	['Volynska oblast', 'Volynska', ['AC', 'KC', 'CM', 'TC']],
	['Dnipropetrovska oblast', 'Dnipropetrovska', ['AE', 'KE', 'PP', 'MI']],
	['Donetska oblast', 'Donetska', ['AH', 'KH', 'TH', 'MH']],
	['Zhytomyrska oblast', 'Zhytomyrska', ['AM', 'KM', 'TM', 'MB']],
	['Zakarpatska oblast', 'Zakarpatska', ['AO', 'KO', 'MT', 'MO']],
	['Zaporizka oblast', 'Zaporizka', ['AP', 'KP', 'TP', 'MP']],
	['Ivano-Frankivska oblast', 'Ivano-Frankivska', ['AT', 'KT', 'TO', 'XC']],
	['Kyivska oblast', 'Kyivska', ['AI', 'KI', 'TI', 'EE']],
	['Kyiv', 'Kyiv', ['AA', 'KA', 'TT', 'KK']],
	['Kirovohradska oblast', 'Kirovohradska', ['BA', 'HA', 'XA', 'EA']],
	['Luhanska oblast', 'Luhanska', ['BB', 'HB', 'EP', 'EB']],
	['Lvivska oblast', 'Lvivska', ['BC', 'HC', 'CC', 'EC']],
	['Mykolaivska oblast', 'Mykolaivska', ['BE', 'HE', 'XE', 'XH']],
	['Odeska oblast', 'Odeska', ['BH', 'HH', 'OO', 'EH']],
	['Poltavska oblast', 'Poltavska', ['BI', 'HI', 'XI', 'EI']],
	['Rivnenska oblast', 'Rivnenska', ['BK', 'HK', 'XK', 'EK']],
	['Sumska oblast', 'Sumska', ['BM', 'HM', 'XM', 'EM']],
	['Ternopilska oblast', 'Ternopilska', ['BO', 'HO', 'XO', 'EO']],
	['Kharkivska oblast', 'Kharkivska', ['AX', 'KX', 'XX', 'EX']],
	['Khersonska oblast', 'Khersonska', ['BT', 'HT', 'XT', 'ET']],
	['Khmelnytska oblast', 'Khmelnytska', ['BX', 'HX', 'OX', 'PX']],
	['Cherkaska oblast', 'Cherkaska', ['CA', 'IA', 'OA', 'PA']],
	['Chernihivska oblast', 'Chernihivska', ['CB', 'IB', 'OB', 'PB']],
	['Chernivetska oblast', 'Chernivetska', ['CE', 'IE', 'OE', 'PE']],
	['Sevastopol', 'Sevastopilska', ['CH', 'IH', 'OH', 'PH']]
];

const build = (table: [string, string, string[]][]): Region[] =>
	table
		.flatMap(([name, area, codes]) => codes.map((code) => ({ code, name, area })))
		.sort((a, b) => a.code.localeCompare(b.code));

export const uaRegions: Region[] = build(CURRENT);

// Bonus collection: plates of 1995–2004, "123-45 КІ" (five digits, two letters), white with
// black characters and the flag. The two letters are the series, from a set per region
// (most regions' series start with one letter). Still usable on the road (hsc.gov.ua, see
// above). Left out: the national series 28 (НН, ХХ, ІІ; ІІ also appears in Kyiv's list and
// is kept there). The 1995 regions are today's regions, so the same map is used.
// Plausibility: 27 regions, 1–8 series each = 105 codes (uk.wikipedia table).
const OLD: [string, string, string[]][] = [
	['AR Krym', 'Avtonomna Respublika Krym', ['KP', 'KO', 'PK']],
	['Vinnytska oblast', 'Vinnytska', ['BI', 'BT', 'BX']],
	['Volynska oblast', 'Volynska', ['BO', 'BK', 'BM']],
	['Dnipropetrovska oblast', 'Dnipropetrovska', ['AA', 'AB', 'AE', 'AH', 'AK', 'AI', 'CM']],
	['Donetska oblast', 'Donetska', ['EA', 'EB', 'EK', 'EH', 'EO', 'EC', 'EE']],
	['Zhytomyrska oblast', 'Zhytomyrska', ['BA', 'BB', 'BE', 'OI']],
	['Zakarpatska oblast', 'Zakarpatska', ['PE', 'PT', 'PP']],
	['Zaporizka oblast', 'Zaporizka', ['HA', 'HE', 'HC', 'HO', 'HP', 'HB']],
	['Ivano-Frankivska oblast', 'Ivano-Frankivska', ['IB', 'IC', 'IE']],
	['Kyivska oblast', 'Kyivska', ['KK', 'KM', 'KX']],
	['Kyiv', 'Kyiv', ['KA', 'KB', 'KE', 'KI', 'KH', 'KT', 'II', 'OO']],
	['Kirovohradska oblast', 'Kirovohradska', ['OH', 'OM', 'OC']],
	['Luhanska oblast', 'Luhanska', ['AM', 'AP', 'AO', 'AT', 'AX', 'AC', 'IA']],
	['Lvivska oblast', 'Lvivska', ['TA', 'TB', 'TC', 'TH', 'TT', 'TO']],
	['Mykolaivska oblast', 'Mykolaivska', ['HI', 'HK', 'HT']],
	['Odeska oblast', 'Odeska', ['OA', 'OB', 'OE', 'OK', 'OT']],
	['Poltavska oblast', 'Poltavska', ['CK', 'CH', 'CC']],
	['Rivnenska oblast', 'Rivnenska', ['PA', 'PB', 'PO']],
	['Sumska oblast', 'Sumska', ['CA', 'CB', 'CE']],
	['Ternopilska oblast', 'Ternopilska', ['TI', 'TE', 'TK']],
	['Kharkivska oblast', 'Kharkivska', ['XA', 'XK', 'XB', 'XP']],
	['Khersonska oblast', 'Khersonska', ['XO', 'XH']],
	['Khmelnytska oblast', 'Khmelnytska', ['XM', 'XI']],
	['Cherkaska oblast', 'Cherkaska', ['MA', 'MB', 'ME', 'MT']],
	['Chernihivska oblast', 'Chernihivska', ['MM', 'MH', 'MK']],
	['Chernivetska oblast', 'Chernivetska', ['MO', 'MP', 'MC']],
	['Sevastopol', 'Sevastopilska', ['KC']]
];

export const uaVintageRegions: Region[] = build(OLD);
