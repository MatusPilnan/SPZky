import type { Region } from './types';

// Slovak district codes (EČV) that were actually issued, 1997–2022. Plates issued
// until 2022 stay valid, so all of these are on the road today. Since 2023 new plates
// carry no district code (series starting at "AA"), see plates/detect.ts.
//
// Only Bratislava ever needed more than one code: BA, then BL (from 2010), then BT
// (from autumn 2019, chosen in a public vote). The other secondary codes in the
// decree (Bratislava BD/BE/BI, Banská Bystrica BC/BK, Košice KC/KI, Levice LL,
// Nitra NI/NT, Nové Zámky NC, Prešov PV/PS, Trenčín TC/TE, Trnava TA/TB,
// Žilina ZI/ZL) were only reserved and never issued, and with district codes
// discontinued in 2023 they never will be, so they are not collectable.
// Bratislava I–V share BA/BL/BT and Košice I–IV share KE: 70 + 3 + 1 = 74 codes.
//
// Sources (checked 2026-11-14):
// - https://sk.wikipedia.org/wiki/Zoznam_skratiek_okresov_Slovenska (reserved codes in parentheses)
// - https://sk.wikipedia.org/wiki/Evidenčné_číslo_vozidiel_na_Slovensku (Bratislava BA → BL → BT)
// - https://www.startitup.sk/auta-s-novou-bratislavskou-ecv-su-uz-na-cestach-za-tuto-skratku-hlasovali-desattisice-ludi/
export const skRegions: Region[] = [
	{ code: 'BA', name: 'Bratislava' },
	{ code: 'BL', name: 'Bratislava' },
	{ code: 'BT', name: 'Bratislava' },
	{ code: 'BB', name: 'Banská Bystrica' },
	{ code: 'BJ', name: 'Bardejov' },
	{ code: 'BN', name: 'Bánovce nad Bebravou' },
	{ code: 'BR', name: 'Brezno' },
	{ code: 'BS', name: 'Banská Štiavnica' },
	{ code: 'BY', name: 'Bytča' },
	{ code: 'CA', name: 'Čadca' },
	{ code: 'DK', name: 'Dolný Kubín' },
	{ code: 'DS', name: 'Dunajská Streda' },
	{ code: 'DT', name: 'Detva' },
	{ code: 'GA', name: 'Galanta' },
	{ code: 'GL', name: 'Gelnica' },
	{ code: 'HC', name: 'Hlohovec' },
	{ code: 'HE', name: 'Humenné' },
	{ code: 'IL', name: 'Ilava' },
	{ code: 'KA', name: 'Krupina' },
	{ code: 'KE', name: 'Košice' },
	{ code: 'KK', name: 'Kežmarok' },
	{ code: 'KM', name: 'Kysucké Nové Mesto' },
	{ code: 'KN', name: 'Komárno' },
	{ code: 'KS', name: 'Košice-okolie' },
	{ code: 'LC', name: 'Lučenec' },
	{ code: 'LE', name: 'Levoča' },
	{ code: 'LM', name: 'Liptovský Mikuláš' },
	{ code: 'LV', name: 'Levice' },
	{ code: 'MA', name: 'Malacky' },
	{ code: 'MI', name: 'Michalovce' },
	{ code: 'ML', name: 'Medzilaborce' },
	{ code: 'MT', name: 'Martin' },
	{ code: 'MY', name: 'Myjava' },
	{ code: 'NM', name: 'Nové Mesto nad Váhom' },
	{ code: 'NO', name: 'Námestovo' },
	{ code: 'NR', name: 'Nitra' },
	{ code: 'NZ', name: 'Nové Zámky' },
	{ code: 'PB', name: 'Považská Bystrica' },
	{ code: 'PD', name: 'Prievidza' },
	{ code: 'PE', name: 'Partizánske' },
	{ code: 'PK', name: 'Pezinok' },
	{ code: 'PN', name: 'Piešťany' },
	{ code: 'PO', name: 'Prešov' },
	{ code: 'PP', name: 'Poprad' },
	{ code: 'PT', name: 'Poltár' },
	{ code: 'PU', name: 'Púchov' },
	{ code: 'RA', name: 'Revúca' },
	{ code: 'RK', name: 'Ružomberok' },
	{ code: 'RS', name: 'Rimavská Sobota' },
	{ code: 'RV', name: 'Rožňava' },
	{ code: 'SA', name: 'Šaľa' },
	{ code: 'SB', name: 'Sabinov' },
	{ code: 'SC', name: 'Senec' },
	{ code: 'SE', name: 'Senica' },
	{ code: 'SI', name: 'Skalica' },
	{ code: 'SK', name: 'Svidník' },
	{ code: 'SL', name: 'Stará Ľubovňa' },
	{ code: 'SN', name: 'Spišská Nová Ves' },
	{ code: 'SO', name: 'Sobrance' },
	{ code: 'SP', name: 'Stropkov' },
	{ code: 'SV', name: 'Snina' },
	{ code: 'TN', name: 'Trenčín' },
	{ code: 'TO', name: 'Topoľčany' },
	{ code: 'TR', name: 'Turčianske Teplice' },
	{ code: 'TS', name: 'Tvrdošín' },
	{ code: 'TT', name: 'Trnava' },
	{ code: 'TV', name: 'Trebišov' },
	{ code: 'VK', name: 'Veľký Krtíš' },
	{ code: 'VT', name: 'Vranov nad Topľou' },
	{ code: 'ZA', name: 'Žilina' },
	{ code: 'ZC', name: 'Žarnovica' },
	{ code: 'ZH', name: 'Žiar nad Hronom' },
	{ code: 'ZM', name: 'Zlaté Moravce' },
	{ code: 'ZV', name: 'Zvolen' }
];
