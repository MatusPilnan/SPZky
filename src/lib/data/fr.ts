import type { Region } from './types';

// French department numbers. Checked 2026-11-16.
//
// What counts (owner's decision 2026-11-16): the department number, from either system:
// - SIV (since 2009, "AB-123-CD"): the number isn't part of the registration; the right
//   blue band must show a department, "choisi librement par le propriétaire" (fr.wikipedia).
//   In the app the band's number is typed after the plate ("AB-123-CD 75") or picked.
// - FNI (1950–2009, "1234 AB 75"): the department ends the number. Converted to SIV only
//   at a change of owner or address (since 15 Oct 2009), so still on the road.
// Both systems use the same department numbers, so they share this one collection (the
// "bonus collection for old systems" rule came later and isn't needed here).
//
// Sources:
// - https://fr.wikipedia.org/wiki/Plaque_d'immatriculation_française (band rule, FNI→SIV,
//   2A/2B since 1976, overseas 971–976)
// - https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_France
// Left out: 20 (Corsica before its 1976 split, no such plates left), 975 (Saint-Pierre-et-
// Miquelon has its own plates), special series (W garage, WW temporary, diplomatic CD/CMD).
// Plausibility: 101 departments = 01–95 without 20 (94) + 2A, 2B + 971–974, 976.
// Overseas departments have no area on the (metropolitan) map.
const TABLE = `
01|Ain
02|Aisne
03|Allier
04|Alpes-de-Haute-Provence
05|Hautes-Alpes
06|Alpes-Maritimes
07|Ardèche
08|Ardennes
09|Ariège
10|Aube
11|Aude
12|Aveyron
13|Bouches-du-Rhône
14|Calvados
15|Cantal
16|Charente
17|Charente-Maritime
18|Cher
19|Corrèze
2A|Corse-du-Sud
2B|Haute-Corse
21|Côte-d'Or
22|Côtes-d'Armor
23|Creuse
24|Dordogne
25|Doubs
26|Drôme
27|Eure
28|Eure-et-Loir
29|Finistère
30|Gard
31|Haute-Garonne
32|Gers
33|Gironde
34|Hérault
35|Ille-et-Vilaine
36|Indre
37|Indre-et-Loire
38|Isère
39|Jura
40|Landes
41|Loir-et-Cher
42|Loire
43|Haute-Loire
44|Loire-Atlantique
45|Loiret
46|Lot
47|Lot-et-Garonne
48|Lozère
49|Maine-et-Loire
50|Manche
51|Marne
52|Haute-Marne
53|Mayenne
54|Meurthe-et-Moselle
55|Meuse
56|Morbihan
57|Moselle
58|Nièvre
59|Nord
60|Oise
61|Orne
62|Pas-de-Calais
63|Puy-de-Dôme
64|Pyrénées-Atlantiques
65|Hautes-Pyrénées
66|Pyrénées-Orientales
67|Bas-Rhin
68|Haut-Rhin
69|Rhône
70|Haute-Saône
71|Saône-et-Loire
72|Sarthe
73|Savoie
74|Haute-Savoie
75|Paris
76|Seine-Maritime
77|Seine-et-Marne
78|Yvelines
79|Deux-Sèvres
80|Somme
81|Tarn
82|Tarn-et-Garonne
83|Var
84|Vaucluse
85|Vendée
86|Vienne
87|Haute-Vienne
88|Vosges
89|Yonne
90|Territoire de Belfort
91|Essonne
92|Hauts-de-Seine
93|Seine-Saint-Denis
94|Val-de-Marne
95|Val-d'Oise
971|Guadeloupe
972|Martinique
973|Guyane
974|La Réunion
976|Mayotte
`;

export const frRegions: Region[] = TABLE.trim()
	.split('\n')
	.map((line) => {
		const [code, name, area] = line.split('|');
		return area !== undefined ? { code, name, area } : { code, name };
	});

/** Overseas departments: no area on the metropolitan map. */
export const frUnmappedCodes = new Set(['971', '972', '973', '974', '976']);

/** "75", "2A", "974": a department number as it appears on plates. */
export const FR_DEPARTMENT = '(?:\\d{2}|2[AB]|97[1-46])';
