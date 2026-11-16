import type { Region } from './types';

// Greek prefecture codes. Checked 2026-11-16.
//
// Format since 1984 (euroband since 2004): three letters + four digits 1000–9999 for cars
// ("ΙΚΗ-1234"), 1–3 digits for motorcycles. Only the 14 Greek capitals that look Latin
// (Α Β Ε Ζ Η Ι Κ Μ Ν Ο Ρ Τ Υ Χ) are used; stored in Latin, normalizePlate maps Greek.
// The first two letters are the prefecture's series; Athens and Thessaloniki have many
// series each (Athens Ι Υ Ζ Ο Χ…, Thessaloniki Ν…), counted as separate codes like
// Warsaw's in Poland. Exception: ΚΟΗ and ΚΟΚ were issued in Thessaloniki, not Rhodope
// (3-letter codes; ΚΟΗ was also issued in Agrinio earlier, not counted there).
//
// Sources:
// - https://el.wikipedia.org/wiki/Πινακίδες_κυκλοφορίας_οχημάτων_στην_Ελλάδα (series per
//   prefecture, "ΚΟ (εκτός από ΚΟΗ και ΚΟΚ)" for Rhodope, motorcycle format)
// - https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Greece (table with a status
//   column: only "Current" series are listed here; series marked "Future" are left out)
// What's out: non-regional series (ΙΑ international transport, ΝΧ prefecture transport,
// ΤΑ taxis), historic (ΙΟ), trailers (ΤΑ/ΤΧ), diplomatic, army, state; series a prefecture
// issued only "previously" (ΒΟΡ in Pella, ΕΥΑ/ΚΧΑ/ΜΥΖ in Rhodes, ΗΚΗ/ΗΚΖ in Chania…: they
// count under the series' current prefecture).
// No bonus collection (owner's decision 2026-11-16): the 1972–1984 "ΧΧ-0000" plates and the
// six-digit plates of 1956–1972 are still valid but very rare; maybe later.
// Map: 13 regions (EuroGeoGraphics via geoBoundaries, CC BY 4.0); each prefecture's codes
// belong to its region, Mount Athos shares Central Macedonia's.
// Plausibility: the 54 former prefectures (incl. Athens, Piraeus, East and West Attica)
// with 154 two-letter series + ΚΟΗ, ΚΟΚ → 156 codes.
const TABLE: [area: string, name: string, codes: string][] = [
	['East Macedonia and Thrace', 'Drama', 'PM'],
	['East Macedonia and Thrace', 'Evros', 'EB OP'],
	['East Macedonia and Thrace', 'Kavala', 'KB AB'],
	['East Macedonia and Thrace', 'Xanthi', 'AH HO'],
	['East Macedonia and Thrace', 'Rhodope', 'KO KK'],
	['Central Macedonia', 'Thessaloniki', 'NA NB NE NZ NH NI NK NM NN NO NP NT NY KOH KOK'],
	['Central Macedonia', 'Imathia', 'HM'],
	['Central Macedonia', 'Kilkis', 'KI'],
	['Central Macedonia', 'Pella', 'EE'],
	['Central Macedonia', 'Pieria', 'KN'],
	['Central Macedonia', 'Serres', 'EP IX'],
	['Central Macedonia', 'Chalkidiki', 'XK'],
	['West Macedonia', 'Grevena', 'PN'],
	['West Macedonia', 'Kastoria', 'KT'],
	['West Macedonia', 'Kozani', 'KZ MN'],
	['West Macedonia', 'Florina', 'PA'],
	['Epirus', 'Arta', 'AT'],
	['Epirus', 'Thesprotia', 'HN'],
	['Epirus', 'Ioannina', 'IN'],
	['Epirus', 'Preveza', 'PZ'],
	['Thessaly', 'Karditsa', 'KA'],
	['Thessaly', 'Larissa', 'PI PP'],
	['Thessaly', 'Magnesia', 'BO BA BB'],
	['Thessaly', 'Trikala', 'TK'],
	['Central Greece', 'Boeotia', 'BI'],
	['Central Greece', 'Euboea', 'XA EH EI'],
	['Central Greece', 'Evrytania', 'KH'],
	['Central Greece', 'Phthiotis', 'MI'],
	['Central Greece', 'Phocis', 'AM'],
	['Ionian Islands', 'Corfu', 'KY ET TB'],
	['Ionian Islands', 'Kefalonia and Ithaca', 'KE'],
	['Ionian Islands', 'Lefkada', 'EY'],
	['Ionian Islands', 'Zakynthos', 'ZA'],
	['Western Greece', 'Aetolia-Acarnania', 'AI ME'],
	['Western Greece', 'Achaia', 'AA AZ AX AO'],
	['Western Greece', 'Elis', 'HA HE'],
	['Peloponnese', 'Argolis', 'AP TM'],
	['Peloponnese', 'Arcadia', 'TP'],
	['Peloponnese', 'Corinthia', 'KP'],
	['Peloponnese', 'Laconia', 'AK'],
	['Peloponnese', 'Messinia', 'KM MZ'],
	['Attica', 'Athens', 'HB IB IE IZ IH IK IM IO IP IT IY OA OB OE OH OI OK OM ON OO OY XE XZ XH XP XT XY XX YA YB YE YZ YH ZZ ZH ZK ZM'],
	['Attica', 'Piraeus', 'BE BH BX ZN ZP TZ YI YK YM YN'],
	['Attica', 'East Attica', 'BK ZY ZX YY YX'],
	['Attica', 'West Attica', 'ZT YO YP YT'],
	['North Aegean', 'Lesbos', 'MY MT MH'],
	['North Aegean', 'Samos', 'MO'],
	['North Aegean', 'Chios', 'XI XO'],
	['South Aegean', 'Dodecanese', 'EA KX PK PO PY'],
	['South Aegean', 'Cyclades', 'EM EZ'],
	['Crete', 'Heraklion', 'HZ HH HI HK HP'],
	['Crete', 'Lasithi', 'AN AE'],
	['Crete', 'Rethymno', 'PE PH'],
	['Crete', 'Chania', 'XN XB TY']
];

export const grRegions: Region[] = TABLE.flatMap(([area, name, codes]) =>
	codes.split(' ').map((code) => ({ code, name, area }))
).sort((a, b) => a.code.localeCompare(b.code));
