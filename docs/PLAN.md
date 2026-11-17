# ŠPZ-ky: plan and decisions

Offline-first PWA for logging license plates spotted "in the wild". Progress is tracked
per country by how many regional codes have been found.

## Decisions (agreed 2026-11-08)

| Topic                  | Decision                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| Countries at launch    | Slovakia + Czechia; more later                                                                          |
| Bonus collection       | Czech pre-2001 district codes ("vintage")                                                               |
| Entry                  | Both: full plate with auto-detection (default) **and** quick "tap a region code"                        |
| Progress unit          | Each plate code counts (SK: every district code incl. BA/BL/BT…; CZ: 14 region letters)                 |
| Extras                 | Region maps, date + GPS per sighting, cloud sync with accounts. Export/import was **not** requested     |
| Stack                  | SvelteKit (static, prerendered client-only shells) + `@vite-pwa/sveltekit`, Dexie (IndexedDB)           |
| Sync backend           | Supabase (auth + Postgres + row-level security); local DB stays the source of truth (offline-first)     |
| Sync setup             | Database setup in the repo (`supabase/`), applied by GitHub Actions with the Supabase CLI on release tags; free plan, no keep-alive workflow (a paused project shows "sync unavailable") (decided 2026-11-15) |
| Sign-in                | 6-digit **email code** typed in the app (works in installed PWAs on iPhone and Android); sent through a dedicated Gmail mailbox via SMTP with an app password, as there is no own domain (decided 2026-11-15) |
| UI language            | Slovak + English with a switch (own lightweight typed i18n instead of Paraglide)                        |
| Hosting & CI           | GitHub Pages at the repo-name URL `matuspilnan.github.io/SPZky/`. Tests on every push to `main`, deploy only on release tags (decided 2026-11-13) |
| Plates without region  | Saved into a per-country **nationwide** subcollection that does **not** count toward country progress. Special plates (EV, personalised, …) are highlighted (decided 2026-11-13, replaces the earlier "not saved") |

## Facts about the plate systems

Rule (2026-11-14): a collection contains only codes that were **actually issued and can be
seen on cars today**. Codes that were only reserved or never used are left out. Follow the
checklist "Region data" in `CLAUDE.md` for every country added later.

- **Slovakia:** **74** district codes that were actually issued (1997–2022; those plates stay
  valid). Only Bratislava used more than one code (BA → BL from 2010 → BT from 2019). The
  decree's other secondary codes (BD, BE, BI, BC, BK, KC, KI, LL, NI, NT, NC, PV, PS, TC, TE,
  TA, TB, ZI, ZL) were only reserved, never issued, and never will be (district codes ended in
  2023), so they were removed in v0.3.x; the DB v3 upgrade re-detects sightings saved under
  them. **Plates issued since 2023 have no district code**: same `XX-NNNLL` layout, but the
  first two letters are a state-wide series starting at `AA`. No district code starts with
  `A`, so `A?` prefixes are treated as "no region" (revisit if the series ever reaches `B?`).
  EV plates use `EL`/`EV` prefixes. Plates without a region go to the nationwide
  subcollection (see below).
- **Czechia:** region letter at position 2 (`1A2 3456`), 14 regions, all current. Historic
  plates `NNV XXXX` carry the numeric region code (01–14). Personalised plates (8 characters)
  have no region.
- **Czech pre-2001:** `XX NN-NN` / `XXX NN-NN`, first two letters = district; 96 codes. These
  plates are still valid but getting rare; GT/GV (Gottwaldov, until 1990) and BI (trucks only)
  are the rarest. FI and US were allocated but never used and are left out. Prague's codes
  AB–AZ count as one region `A` (`AA` = government).
- **Austria** (phase 9, 2026-11-16): **106** codes: 1–2 letter district/city codes
  (`BN 123 AB`, `W 12345 A`; personalised `W JOHN 1` = letters then digits; no Q). Includes
  the codes of the districts merged in 2012/13 (FB, FF, HB, JU, KF, MZ, RA) and of
  Wien-Umgebung (WU, dissolved 2017): standard plates stay valid until re-registration.
  BA (Bad Aussee) was reinstated in 2025. Left out: authority (A, BH army, BP police, FV, JW, PT…)
  and diplomatic/consular series. The band shows "A". Many 2-letter codes equal Slovak
  ones (BA, BL, BN, BR…), so `BA-123AB` fits both countries; GPS decides the order.
  Sources: de.wikipedia "Kfz-Kennzeichen (Österreich)", en.wikipedia "Vehicle registration
  plates of Austria" (checked 2026-11-16).
- **Austria before 1990** (bonus, black plates `W 123.456`): **11** codes, the nine states
  plus Graz (G) and Linz (L); valid while the registration is unchanged (>126,000 in 2025).
  Map of the nine states; G and L count within Styria and Upper Austria. (First built into
  the main list; moved to a bonus collection after the bonus decision, before any release.)
- **Poland** (phase 9, 2026-11-16): **441** codes of the system since 2000: county codes
  of 2–3 letters, first letter = voivodeship (some voivodeships have a second letter: A, I,
  J, M, V, X, Y). Includes secondary codes (Kraków KR/KK/JR, Wrocław DW/DX/VW, Warsaw's 16
  district codes as "Warszawa") and codes no longer issued but valid (DB, PKO, SRS, POZ,
  NOG). Left out: codes pl.wikipedia marks as never used by the office (BIB, SBN, CBC, KBA,
  PA, TKC, TKM, TKP, LVB, NOX, PX, WPX, RZR, ZZ, SWZ, DWW, VWW), STY (not a county),
  army/police/diplomatic and personalised plates. Serials never use B, D, I, O, Z.
- **Poland before 2000** (bonus, black plates `XYZ 1234` / `XYZ 123A`): **165** area codes
  of the 49 voivodeships of 1975–1998; valid until change of owner/residence, no deadline.
  No map (those voivodeships aren't available as boundary data). Old and current formats
  never overlap; `KOA 12-34` fits both CZ pre-2001 (Kolín) and PL pre-2000 (Koszalin).
  Decided 2026-11-16: **every country with a still-valid older system gets a bonus
  collection** like CZ pre-2001.
  Sources: pl.wikipedia "Tablice rejestracyjne w Polsce", en.wikipedia "Vehicle
  registration plates of Poland" (checked 2026-11-16).
- **Germany** (phase 9, 2026-11-16): **714** codes, imported by
  `scripts/import-de-codes.mjs` from de.wikipedia "Liste der Kfz-Kennzeichen in
  Deutschland" (as of 1 Dec 2023) into `de.generated.ts`: every current district code and
  every old code reintroduced since 2013. Codes can cover several districts (city + district
  of the same name, or one old code reintroduced in several districts). Names = what the
  code stands for (AA Aalen, ANK Anklam). Umlauts are distinct letters (MÜ ≠ MU), so
  `normalizePlate` keeps Ä Ö Ü. Format: code 1–3 letters + 1–2 letters + 1–4 digits, ≤ 8
  characters; E = electric, H = historic (highlighted). Left out: authority series (BD, BP,
  BW, THW, X, Y), state-parliament codes (BBL, BWL… THL), diplomatic plates, old codes never
  reintroduced. **No bonus collection:** GDR plates had to be exchanged by 31 Dec 1993.
  Many plates also fit SK/AT formats (e.g. `BA-MA001` Bamberg); GPS decides the order.
  Sources: de.wikipedia list (above), en.wikipedia "Vehicle registration plates of Germany",
  de.wikipedia "Kfz-Kennzeichen (DDR)" (checked 2026-11-16).
- **France** (phase 9, 2026-11-16): **101** department numbers (01–95 without 20, 2A, 2B,
  971–974, 976). Decided 2026-11-16: the department counts, from either system: SIV
  (since 2009, `AB-123-CD`) shows a freely chosen but mandatory department on the right
  band, typed after the plate (`AB-123-CD 75`); FNI (until 2009, `1234 AB 75`) ends with it
  and is converted only at a change of owner/address. Same codes, so one collection (no
  bonus). A bare SIV plate has the shape of a Slovak plate (and matches the loose SK
  personalised pattern), so the Add screen hints "add the department" only when nothing
  else matched or GPS is in France. Overseas departments have no map area. Sources:
  fr.wikipedia "Plaque d'immatriculation française", en.wikipedia "Vehicle registration
  plates of France" (checked 2026-11-16).
- **Bulgaria** (phase 9, 2026-11-16): **30** province codes (28 provinces, Sofia city C/CA/CB),
  `CA 1234 AB` with Cyrillic look-alike letters. Electric plates since 17 Nov 2022 (`ЕА
  NNNN XX`, motorcycles `ЕМ NNNN X`) have no province: nationwide type "Electric". Same
  format as Ukraine: `CA 1234 AB` is Sofia or Cherkasy, GPS decides. No bonus collection:
  plates of the pre-1992 systems became invalid (1992/1993). Left out: army (BA), civil
  protection, temporary, foreigners', diplomatic. Sources: bg.wikipedia "Регистрационен
  номер на МПС (България)", en.wikipedia "Vehicle registration plates of Bulgaria"
  (checked 2026-11-16).
- **Romania** (phase 9, 2026-11-16): **42** codes (41 counties + B Bucharest), `CJ 12 ABC`,
  Bucharest `B 123 ABC`; letter groups never start with I/O, never use Q. No bonus
  collection: the 1966–1992 plates were valid only until 2000. Left out: army (A), MAI,
  diplomatic (CD, TC, CO), temporary. Sources: ro.wikipedia "Numerele de înmatriculare auto
  în România", en.wikipedia "Vehicle registration plates of Romania" (checked 2026-11-16).
- **Serbia** (phase 9, 2026-11-16): **81** registration areas, imported by
  `scripts/import-rs-codes.mjs` from sr.wikipedia into `rs.generated.ts` (official list,
  Правилник, Прилог 1, May 2025). Format since 2011 `NS 123-AB` (Belgrade `BG 1234-AB`).
  Codes contain Č Ć Š Ž Đ (BČ Bečej ≠ BĆ Bogatić), so `normalizePlate` keeps them;
  `foldPlate` lets a code typed without diacritics match at medium confidence. Decided
  2026-11-16: the 7 Kosovo codes (ĐA, GL, KM, PE, PR, PZ, UR) are included and **marked
  rare** (`Region.rare`, ✦ in the grid; since 2024 cars in Kosovo need RKS plates. Since
  2026-11-17 `rare` is a reason key, explained in the code's detail sheet by the message
  `rare.<reason>`; a test requires a text in both languages for every rare code); Kosovo
  gets its own collection. KU (Kula, since 2025) and SO both count. No bonus collection:
  pre-2011 plates were valid only until the end of 2011. Left out: diplomatic, police,
  army, temporary. Sources: sr.wikipedia "Регистарске ознаке у Србији", en.wikipedia
  "Vehicle registration plates of Serbia" (checked 2026-11-16).
- **Switzerland** (phase 9, 2026-11-16): **26** canton codes, `ZH 123456` (up to 6 digits,
  7 for ZH/BE from 2026), white plates **without EU band** (`plateStyle: 'plain'`). System
  unchanged since 1933, so no bonus collection. Left out: dealer (U), temporary/customs
  (Z), diplomatic (CD/CC/AT), army (M), federal A/P (abolished 2004), FL (Liechtenstein).
  SG is also Slovenj Gradec (SI): GPS decides. Numbers of 1–2 digits are under the
  5-character detection minimum and are picked by hand. Place names in German (the
  majority language; Nominatim has no "local language" option). Map: 26 cantons, swisstopo
  open data (attribution). Sources: de.wikipedia "Kontrollschild (Schweiz)", en.wikipedia
  "Vehicle registration plates of Switzerland" (checked 2026-11-16).
- **Kosovo** (phase 9, 2026-11-16, owner's decision: own collection): **7** district codes
  01–07 (RKS plates since Dec 2010, `01 234-AB`, numbers from 101), band code RKS, country
  code XK (user-assigned; Natural Earth has no numeric code, so `build-borders.mjs` also
  matches by name). The Serbian plates with Kosovo codes stay in the Serbian collection,
  marked rare. No bonus collection: UNMIK "KS" plates (1999–2010) are no longer used. Left
  out: police, emergency, customs, government, diplomatic, KSF, EULEX/KFOR/OSCE/UNMIK,
  temporary. Sources: sr.wikipedia "Регистарске ознаке у Србији" (section Косово и
  Метохија), en.wikipedia "Vehicle registration plates of Kosovo", europlates.eu (checked
  2026-11-16).
- **Greece** (phase 9, 2026-11-16): **156** codes: the two-letter series of the 54 former
  prefectures (Athens and Thessaloniki have many each) + ΚΟΗ/ΚΟΚ (3 letters, issued in
  Thessaloniki; the rest of ΚΟ is Rhodope). Format since 1984 `ΙΚΗ-1234` (1000–9999),
  motorcycles 1–999; only the 14 Greek letters that look Latin, stored in Latin. Only
  series en.wikipedia marks "Current" (not "Future"). Left out: ΙΑ, ΝΧ, ΤΑ (non-regional),
  historic ΙΟ + 5 digits, diplomatic, army. Same shape as CZ pre-2001 / PL pre-2000
  (`KOA 1234`): GPS decides. Decided 2026-11-16: no bonus collection for the 1972–1984
  `ΧΧ-0000` plates for now (still valid, very rare). Map: 13 regions, codes grouped by
  prefecture's region. Sources: el.wikipedia "Πινακίδες κυκλοφορίας οχημάτων στην Ελλάδα",
  en.wikipedia "Vehicle registration plates of Greece" (checked 2026-11-16).
- **Slovenia** (phase 9, 2026-11-16): **11** registration areas (CE, GO, KK, KP, KR, LJ, MB,
  MS, NM, PO, SG). The sources don't give the serial formats, so detection is loose (code +
  3–6 letters/digits with a digit, medium confidence); KK/PO also exist in Slovakia, GPS
  decides. Older Slovenian designs use the same codes (no bonus); the sources don't say
  Yugoslav-era plates are valid. **Map** (added 2026-11-16): the areas group the 58
  administrative units (upravne enote), which have no boundary data, so the map merges
  the 212 municipalities (geoBoundaries SVN ADM2, OSM, ODbL) into the 11 areas.
  `scripts/import-si-areas.mjs` writes the municipality → area table
  (`scripts/data/si-municipality-areas.json`; units → areas from sl.wikipedia, municipalities
  → units from the units' gov.si pages, Wikipedia as fallback, 3 units by hand). The
  map's municipality names lost Č/Š/Ž (e.g. "Lentjur" = Šentjur), so matching allows any
  letter at those positions and fails on ambiguity; it also fails if a municipality lands
  in two areas (Škocjan is resolved to Novo mesto by hand). Sources: sl.wikipedia
  "Registrske tablice Slovenije", en.wikipedia "Vehicle registration plates of Slovenia"
  (checked 2026-11-16).
- **Ukraine** (phase 9, 2026-11-16): **107** region codes of the system since 2004
  (`AA 1234 BB`): four per region (2004, 2013, 2021×2), only the 12 Cyrillic letters that
  look Latin; typed Cyrillic is mapped to Latin by `normalizePlate` (also Greek for later).
  KK is listed for Crimea (2013) and Kyiv (2021): kept for Kyiv only. Crimea, Sevastopol and
  the occupied regions keep their codes (Ukrainian plates still on the road). Left out:
  DI/PD/ED/DC (online registration since Dec 2022, no region), II (national, withdrawn
  2006), BP (parliament), police/military/diplomatic/transit.
- **Ukraine 1995–2004** (bonus, `123-45 КІ`): **105** series of the 27 regions (uk.wikipedia
  table; the en.wikipedia table has errors). Still usable on the road, exchanged at any
  registration change (hsc.gov.ua, 2025). Same map as the current collection.
  Sources: uk.wikipedia "Номерні знаки України" (citing zakon.rada.gov.ua z0353-21),
  en.wikipedia "Vehicle registration plates of Ukraine", hsc.gov.ua (checked 2026-11-16).
- Sources, with details in the header of each file in `src/lib/data/`: en.wikipedia (plates
  of Slovakia / Czech Republic), sk.wikipedia "Zoznam skratiek okresov Slovenska" (reserved
  codes) and "Evidenčné číslo vozidiel na Slovensku", cs.wikipedia "Státní poznávací značky v
  Československu" (pre-2001 table, validity).

## Nationwide plates (plates without a region) — phase 4

Plates whose format carries no region are saved into a per-country subcollection labelled
**Nationwide** (*Celoštátne* in the Slovak UI). Pre-2001 CZ plates have no nationwide part.

- **Not part of progress:** the region count (e.g. "47 / 74") ignores them. The nationwide
  section shows its own counter (total and per type) below the region grid.
- **Plates with a region keep their region,** e.g. a pre-2023 SK personalised plate `ZA-HELLO`
  stays in Žilina (highlighted as special). Only plates without a region are nationwide.
- **Duplicates:** the same plate still counts only once.
- **Quick mode / manual pick / edit:** a nationwide picker per country with its plate types.
- **Plate types and highlights** (`highlightOf()` in `src/lib/collections.ts`):

  | Country | Type (`plateType`)            | Format                                                      | Highlight          |
  | ------- | ----------------------------- | ----------------------------------------------------------- | ------------------ |
  | SK      | `sk-2023` standard since 2023 | `XX-NNNLL` with a non-district prefix (`AA…`)               | plain              |
  | SK      | `sk-personalized` since 2023  | `LL-XXXXX` with a non-district prefix                       | ★ special          |
  | SK      | `ev` electric (since 2023)    | `EL`/`EV` + `NNN` + `LL`, **green** letters on white        | ⚡ green           |
  | CZ      | `ev` electric                 | `EL` + `NNN` + `LL` (EL-000-AA … EL-999-ZZ), **black** letters | ⚡ green        |
  | CZ      | `cz-personalized`             | 8 characters, ≥ 1 digit, no G/O/Q/W                         | ★ special          |
  | SK / CZ | regional `sk-district-special`, `cz-historic` | (keep their region)                         | ★ special          |

  So `EV…` is always Slovak, while `EL-NNN-LL` fits both countries (see country choice below);
  the app shows a tip that SK EV plates have green and CZ ones black letters.
  Sources: [Wikipedia SK](https://en.wikipedia.org/wiki/Vehicle_registration_plates_of_Slovakia),
  [Slov-Lex 480/2022](https://static.slov-lex.sk/static/SK/ZZ/2022/480/20230101.html),
  [cs.wikipedia CZ](https://cs.wikipedia.org/wiki/Registrační_značky_v_Česku).
  Candidates to add later: diplomatic (SK `CD-NNNNN`; CZ `NNN CD/XX/XS/HC NN`), military
  (numeric), export/trade/test plates.

## Choosing the country when detection is ambiguous — phase 4

When the plate format leaves more than one possible country (EV plates today, and any overlap
once more countries are added), the entry screen shows the countries as choices, ordered and
preselected like this (decided 2026-11-13):

1. **Current country by GPS:** the country the device is in right now, if location saving is
   enabled and a recent position exists (the tracker on the Add screen already provides it).
2. **Last used country:** the country of the most recently saved sighting (or the last one
   picked in this choice).
3. The remaining candidates in their default order.

The first option is preselected, so the common case is just "Save". Duplicates in the list are
removed (e.g. when GPS and last used are the same country).

- The lookup works **offline**: point-in-polygon against Natural Earth 1:10m outlines of SK and
  CZ shipped with the app (`src/lib/geo/borders.ts`, ~23 kB, generated by
  `scripts/build-borders.mjs`; the maps phase can reuse them). Bounding boxes alone are not
  enough, because SK and CZ boxes overlap.
- Outside all supported countries, or without location, step 1 is skipped.
- The GPS position only picks the **default** choice. It is a hint (a Slovak car is often seen
  in Czechia), never an automatic decision without showing the options.
- This only applies to the **country**. When the country is clear but several regions match,
  candidates stay ordered by detection confidence. Implemented in `orderByCountry()`
  (`src/lib/plates/detect.ts`).

## Progress screens — phase 5

- **Home:** per-collection cards (flag, % and progress bar, "found of total", "+ N nationwide
  plates"); the three most recent sightings with a link to History.
  Since 2026-11-17 (owner's request, with more countries): only the first **N countries get
  a full card** (default 3), the rest are square **tiles** (flag inside a donut chart of the
  share found, % below; `CollectionTile.svelte`). Order: **most recently spotted**
  (default; countries without plates alphabetically after), **most complete**, or
  **alphabetical**. N and the order are per-device prefs in Settings → Home screen. The
  **bonus collections** are one collapsible section: closed it shows how many there are and
  how many are started / finished / not started; open/closed is remembered. Logic in
  `src/lib/home.ts` (`orderCollections`, `bonusSummary`).
- **Country screen** `/country?id=<collection>` (query param, so it is one precached shell):
  progress header, code grid with All / Found / Missing filter, nationwide section. Tapping a
  code or nationwide type opens a detail sheet (`<dialog>`) with count, first/last seen and
  the sightings (each opens the edit screen). Below, a collapsible **History** section
  (closed by default, with a count) lists only that collection's sightings, regional and
  nationwide (added after v0.3.2). Pre-2001 CZ plates are their own collection, so they
  show on the bonus collection's screen, not under Czechia.
- Helpers in `src/lib/progress.ts`: `collectionProgress()`, `regionStats()`.

## Region maps — phase 6

SVG maps generated by `scripts/build-maps.mjs` into `src/lib/geo/maps/` (GENERATED; ~60 kB
raw, loaded on demand and precached for offline use):

| Collection | Areas | Source (geoBoundaries, release commit 9469f09) | Licence |
| --- | --- | --- | --- |
| SK | 79 districts (okresy) | gbHumanitarian SVK ADM2: Geoportal.SK (ÚGKK SR) via HDX, 2022 | CC BY 3.0 IGO |
| CZ | 14 regions (kraje) | gbOpen CZE ADM1: ČÚZK, 2021 | CC BY 4.0 |
| CZ pre-2001 | 77 districts (okresy) | gbOpen CZE ADM2: Wikimedia Commons, 2010 | Public domain |
| AT | 94 districts and statutory cities (Bezirke) | gbOpen AUT ADM2: BEV, 2017 | CC BY-SA 2.0 (share-alike: the generated `at-districts.ts` is under the same licence) |

| PL | 380 counties and city counties (powiaty) | gbHumanitarian POL ADM2: Państwowy Rejestr Granic via HDX, 2022 | CC BY 3.0 IGO |
| PL pre-2000 | — (no map) | — | — |
| SI | 11 registration areas, merged from 212 municipalities (`groupBy` + `dissolve`) | gbOpen SVN ADM2: OpenStreetMap | ODbL 1.0 (share-alike: the generated `si-areas.ts` is under the same licence) |
| FR | 96 metropolitan departments (overseas 971–976 without area) | gbOpen FRA ADM2: IGN, 2022 | Etalab Open Licence 2.0 (attribution) |
| BG | 28 provinces (oblasti) | gbOpen BGR ADM1: Wikimedia Commons, 2019 | Public domain |
| RO | 41 counties + Bucharest | gbOpen ROU ADM1: World Bank, 2017 | CC BY 4.0 |
| GR | 13 regions + Mount Athos (alias of Central Macedonia), prefecture codes grouped by region | gbOpen GRC ADM2: EuroGeoGraphics | CC BY 4.0 |
| CH | 26 cantons | gbOpen CHE ADM1: swisstopo, 2022 | swisstopo open government data (free use, attribution) |
| XK | 7 districts | gbOpen XKX ADM1: OpenStreetMap | CC BY-SA 2.0 (share-alike: the generated `xk-districts.ts` is under the same licence) |
| RS | 145 municipalities, grouped into registration areas (Kosovo codes without area) | gbOpen SRB ADM2: OpenStreetMap | ODbL 1.0 (share-alike: the generated `rs-municipalities.ts` is under the same licence) |
| UA, UA 1995–2004 | 27 regions (oblasts, Crimea, Kyiv, Sevastopol) | gbHumanitarian UKR ADM1: State Enterprise "Kartographia" via HDX, 2022 (Kyiv city renamed by location: both are "Kyivska") | CC BY 3.0 IGO |
| DE | 401 districts and district-free cities (Kreise) | gbOpen DEU ADM3: BKG, 2021 (dissolved by name: coastal districts come in several parts) | dl-de/by-2-0 (attribution) |

| AT pre-1990 | 9 states (Bundesländer) | gbOpen AUT ADM1: BEV, 2017 | CC BY-SA 2.0 (as above) |

- Codes without a map area (`isUnmappedCode`): Austria's WU (Wien-Umgebung, dissolved
  2017); Poland's NOG (Olecko-Gołdap until 2002); France's overseas departments; Serbia's
  Kosovo codes.
  They are in the grid but not on the map.
- Polish county names repeat across voivodeships ("Bielski"…): `build-maps.mjs` appends the
  voivodeship (`disambiguateWith`), and each Polish region names its map area (`Region.area`).
- Collections without a map (`hasMap`): no map card, no Home thumbnail.

- The gbOpen SVK ADM2 data (OSM, ODbL with share-alike) has garbled names, so the
  humanitarian release is used instead.
- Simplified with **mapshaper** (dev dependency, topology-aware so neighbours keep shared
  borders) and projected with Lambert azimuthal equal-area.
- Areas are matched to codes by name (`codesOfArea()` in `src/lib/geo/maps/index.ts`):
  Bratislava I–V share BA/BL/BT, Košice I–IV share KE, Zlín also covers Gottwaldov
  (GT/GV). A unit test ensures every area has codes and every code has an area.
- Colours: all codes of an area found = dark green, some = light green, none = grey.
  Tapping an area opens its code (or, for shared codes, a sheet with all codes of the area);
  the selected area is outlined. Home cards show non-interactive thumbnails.
- Attribution (required by CC BY): under each map and in Settings → Map data.
- Old CZ districts are drawn with today's district borders (very close to the pre-2001
  ones; Jeseník exists since 1996 and has its own old code JE).

## Data model

`Sighting` (see `src/lib/db/types.ts`): client UUID, `collectionId`, `regionCode` (`null` =
nationwide), `plateType` (detected format, e.g. `sk-district`, `ev`, `sk-2023`; required for
nationwide, `null` for quick region taps and unrecognised plates), raw and normalized plate
(null for quick entries), `seenAt`, optional `location`, `note`, plus sync fields `createdAt`,
`updatedAt`, `deleted` (soft delete), `userId`, `dirty`. Progress is always computed from
sightings, never stored; nationwide plates are counted separately (`countNationwide()`).

Dexie schema v2 (phase 4) fills `plateType` for existing rows from their plate. The
repository rejects a nationwide sighting without a valid nationwide type of its collection.
Sync (phase 7) must include `plateType` and a nullable `region_code`.

Sync: see "Sync — phase 7" below.

## Sync — phase 7 (planned 2026-11-15, built 2026-11-16)

Goal: the same collection on every device of a user, while the app stays fully usable
offline and without an account. The local IndexedDB stays the source of truth; Supabase is
a sync target, not a dependency.

### Decisions and why

- **Supabase free plan.** Inactive projects (too little database activity in a rolling
  week) get paused; data is kept and the project can be restored in the dashboard. No
  keep-alive workflow: normal sync traffic keeps it active while the app is used. When the
  project is paused or unreachable, the app shows "sync unavailable, data is stored on this
  device" instead of an error dialog.
- **Database as code in the repo**, applied by our own GitHub Actions (Supabase CLI), not
  Supabase's GitHub integration: it deploys on release tags together with the app, works on
  the free plan, and CI can test it. (The integration deploys on every push to `main`, ignores
  auth config by default, and its preview branches are paid.)
- **Email code (OTP), not a magic link or Google:** in an installed PWA on iPhone, links and
  OAuth redirects open Safari, which has separate storage, so the user ends up signed in in
  Safari, not in the app. A 6-digit code typed into the app works the same everywhere.
- **Gmail SMTP:** Supabase's built-in mail sends only 2 emails/hour and only to project team
  members, so a real SMTP service is required. Without an own domain, a dedicated Gmail
  account with an app password (smtp.gmail.com:587, ~500 emails/day) is the reliable free
  option. With a domain later, switch to a mail service (e.g. Resend, Brevo) by changing
  config only. "Sign in with Google" may be added later as a second option.

### Repository structure

```
supabase/
  config.toml                     local stack + hosted auth settings (OTP 6 digits, 15 min,
                                  one code per address per 60 s, 30 emails/hour, templates,
                                  SMTP via env(SMTP_USER) / env(SUPABASE_SMTP_PASSWORD))
  templates/sign-in-code.html     email with {{ .Token }} (sk + en text)
  migrations/20261116120000_sightings.sql
  tests/database/sightings.test.sql   pgTAP: RLS, last-write-wins, replace, validation
```

- **SMTP is `enabled = false` in the committed config**, so the local stack keeps using its
  mail catcher (Mailpit). The release workflow flips it to `true` with `sed` right before
  `config push`. (CLI `[remotes.*]` blocks were not used: they need the project ref in the
  file, and the matching rules are not documented.)
- `config push` writes **every setting the file declares**. Sections the app doesn't use
  and that would change the hosted project (`[db.pooler]`, storage S3/analytics/vector)
  were removed from `config.toml` on purpose; don't add them back without checking.

### Database schema (migration)

`public.sightings`, one row per sighting, mirroring the local `Sighting`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | generated on the device |
| `user_id` | uuid, not null, default `auth.uid()` | references `auth.users`, on delete cascade |
| `collection_id`, `region_code`, `plate_type` | text | `region_code` null = nationwide (then `plate_type` required, check constraint) |
| `plate`, `plate_normalized` | text, nullable | null for quick entries |
| `seen_at`, `created_at`, `updated_at` | timestamptz | `updated_at` from the device (last-write-wins) |
| `lat`, `lng`, `accuracy` | double / real, nullable | location |
| `note` | text | |
| `deleted` | boolean | soft delete, so deletions sync |
| `server_updated_at` | timestamptz | set by a trigger on every write; the pull cursor (independent of device clocks) |

- Row-level security on: a user can select/insert/update only rows with `user_id =
  auth.uid()`; hard delete only for their own rows (used by "delete my cloud data").
- Index on `(user_id, server_updated_at)`.
- RPC `push_sightings(rows jsonb)`: upsert where an existing row is only overwritten if the
  incoming `updated_at` is newer (last-write-wins enforced on the server, in one call; at
  most 500 rows). It **returns the server's version of every row it rejected**, and the
  device adopts it right away (otherwise a rejected row whose newer server version was
  already pulled would never be corrected).
- RPC `replace_sightings(rows jsonb)`: for "use this device's data" at sign-in; upserts the
  rows and soft-deletes all other rows of the caller, in one transaction (only own rows,
  `security invoker`).

### Sync algorithm (client, `src/lib/sync/`)

Code: `rows.ts` (pure conversion and rules), `engine.ts` (push/pull/sign-in/sign-out against
an injectable `Remote`), `remote.ts` (Supabase implementation), `account.svelte.ts` (UI state,
triggers, auth), `fake-remote.ts` (in-memory server for the unit tests).

1. **Push:** send local rows with `dirty = 1` (batches of 200) via `push_sightings`; mark
   them clean only if they weren't edited again while the request ran; adopt the rejected
   rows the server returns.
2. **Pull:** fetch rows with `server_updated_at >= cursor − 60 s` (pages of 500, keyed by
   the timestamp), apply each one locally if it is new or its `updated_at` is newer than
   the local row (equal: only if the local row has no pending change); store the cursor in
   the local `meta` table (Dexie schema v4). The 60-second overlap covers transactions that
   commit after a pull has already moved past their timestamp.
   - A local edit always gets `updatedAt = max(now, previous + 1)` (`nextUpdatedAt`), so it
     beats the version it was made on even when this device's clock is behind.
3. **When:** on app start, when coming back online, a few seconds after a local change
   (debounced), when the app returns to the foreground, when History is opened, and via
   "Sync now" (Settings, and a button on Home while signed in). No polling or Realtime
   while the app just sits open (decided 2026-11-16: not needed); the screens read the
   local database live, so pulled plates appear without a reload.
4. **Sign-in on a device: conflict check** (decided 2026-11-16). Before anything is pushed,
   the client fetches all of the account's cloud rows into memory (not yet into Dexie) and
   compares them with the local rows that have no account (never synced, or kept at
   sign-out):
   - **One side empty, or both hold the same sightings** (same set of `plate_normalized`;
     quick entries by collection + region + `seen_at`): no question; the local rows are
     assigned to the account, pushed, and the cloud rows pulled (merge).
   - **Both sides hold different sightings:** a dialog shows the counts ("on this device:
     N, in the cloud: M, only here: X, only in the cloud: Y") and offers:
     - **Merge both** (preselected): as above; local entries the account already has
       (same key) are dropped as duplicates.
     - **Use the cloud data:** local rows are removed from this device, then the cloud
       rows are pulled.
     - **Use this device's data:** RPC `replace_sightings(rows jsonb)` in one transaction
       upserts the local rows and soft-deletes every other cloud row of the user (so other
       devices drop them on their next pull). The dialog warns that this also removes the
       plates from the account's other devices, and asks for a second confirmation.
     - **Cancel:** signs out again; nothing changes on either side.
   - The check runs only at sign-in, never on later syncs. The device counts as linked
     (`meta` key `sync.account`) only after the choice; if the app closes or goes offline
     in between, the check runs again on the next start / when back online.
5. **Same plate logged on two devices while offline:** changed while building (2026-11-16):
   **no automatic de-duplication on normal syncs.** The app allows saving a plate twice on
   purpose (it only warns), so merging by plate would delete intended entries, and
   duplicates don't change progress (a region counts once). Duplicates are only dropped in
   the sign-in merge (step 4).
6. **Sign-out** (decided 2026-11-16, see Open points): local part in `signOutLocal`.
   "Keep" gives the kept plates **new ids** and no account, so they can later go into any
   account without clashing with the old account's rows on the server (ids are global).
   A session ending elsewhere (revoked, account deleted) is handled like "keep".
   **Delete my cloud data** hard-deletes the account's rows, then signs out keeping the
   plates on the device (staying signed in would push them straight back).
7. **Errors:** network errors, a paused project or an expired session never block the app;
   the status line in Settings shows the state (synced / syncing / offline / unavailable /
   failed) and the last successful sync. Supabase allows one code per address per 60 s;
   the sign-in form then says "try again in a minute".

### App changes

- `@supabase/supabase-js`, configured from build-time values `PUBLIC_SUPABASE_URL` and
  `PUBLIC_SUPABASE_KEY` (the public key; RLS protects the data), passed into the bundle via
  Vite `define` (`__SUPABASE_URL__`, `__SUPABASE_KEY__`), from the environment or
  `.env.local`. Without them (local dev, forks) the account section is hidden, supabase-js is
  never downloaded (dynamic import) and the app works as before.
- The sign-in conflict dialog (`SignInConflict.svelte`) lives in the layout, so it appears
  wherever the user is when the check finishes.
- Settings → **Account & sync:** email → "Send code" → 6-digit code → signed in; then the
  email, sync status, last sync, "Sync now", "Sign out", "Delete my cloud data".
- Session stored by supabase-js in localStorage under an `spz-ky.*` key (shared origin on
  GitHub Pages).

### CI/CD

- The Supabase CLI is a pinned dev dependency (`supabase` in package.json), so local runs
  and CI use the same version.
- **ci.yml**, job *Database and sync*: `npm run db:start` (local stack in Docker with all
  migrations), `db:test` (pgTAP), `db:lint`, then `sync:e2e`.
- **Sync end-to-end test** (`scripts/sync-e2e.mjs`): builds against the local stack, reads
  sign-in codes from Mailpit, and drives three browser contexts ("phone", "tablet",
  "laptop") through sign-in, all conflict choices incl. cancel, offline changes, both
  sign-out choices and "Delete my cloud data".
- **release.yml**, job *migrate* after the tests and before the build: checks the secrets,
  `supabase link`, `supabase db push --remote` (**without `--remote` CLI 3 pushes to the
  local database**), turns SMTP on, `supabase config push --yes`. The build gets the public
  URL and key from repo variables and fails if they're missing.

### GitHub configuration

| Name | Kind | Value |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | secret | personal access token (Supabase account → Access Tokens) |
| `SUPABASE_DB_PASSWORD` | secret | database password chosen when creating the project |
| `SUPABASE_PROJECT_ID` | secret | project reference (from the project URL) |
| `SUPABASE_SMTP_PASSWORD` | secret | Gmail app password |
| `PUBLIC_SUPABASE_URL` | variable | `https://<project-ref>.supabase.co` |
| `PUBLIC_SUPABASE_KEY` | variable | the project's publishable (anon) key |
| `SMTP_USER` | variable | the Gmail address (also the sender) |

### Owner's setup steps (before building starts)

1. Create a **new Gmail account** for the app (not a personal one), turn on 2-Step
   Verification, create an **app password** ("Supabase").
2. Create a free **Supabase** account and project; region **Frankfurt (eu-central-1)**;
   keep the database password.
3. Create a Supabase **access token** (account settings → Access Tokens).
4. In GitHub: Settings → Secrets and variables → Actions, add the secrets and variables
   above. Never paste secrets into a chat or commit them.

### Open points (decide before or during building)

- **Sign-out:** decided 2026-11-16: the app **asks** whether to keep the plates on this
  device or remove them, with **"remove from this device"** preselected. Sign-out is
  **blocked while unsynced changes exist** (offer "Sync now" instead). Kept plates stay as
  local-only data; the next sign-in runs the conflict check (sync algorithm, step 4).
- **Delete account completely** (including the email in Supabase Auth) needs a server-side
  function with admin rights (Edge Function). Decided 2026-11-15: **later**, not in phase 7;
  phase 7 has "Delete my cloud data" (the rows).
- **First release with sync:** watch the *Migrate Supabase* job (the first `config push`
  shows the diff it applies) and sign in once on the live app to check that the Gmail
  mail arrives (and isn't in spam).
- "Sign in with Google" as a second option: later, if wanted.

## Export / import (added 2026-11-16, with phase 7)

Settings → **Your data**, and "Export this device's plates first" in the sign-in conflict
dialog (owner's request: a backup before choosing). Code: `src/lib/backup.ts`,
`src/lib/files.ts`, `DataSection.svelte`, `ExportButton.svelte`.

- **JSON only** (decided 2026-11-16; no CSV). File `spz-ky-YYYY-MM-DD.json`:
  `{ app: "spz-ky", format: 1, appVersion, exportedAt, sightings: [...] }`, live sightings
  only, readable ISO times, no ids or sync fields. Raise `format` only for changes older
  versions can't read; the import refuses files with a newer format ("update the app").
- **Saving:** in an installed app (standalone) the share sheet is used, because a download
  link often does nothing there (iPhone); elsewhere a normal download.
- **Import checks every entry** and skips what it can't use (unknown country or region,
  bad date, a nationwide type that doesn't belong to the country). Plate type and
  normalised plate are recomputed, not trusted; region codes removed since the export are
  re-detected (`reassignUnknownRegion`).
- A preview shows the count in the file, how many are new and how many are skipped, then:
  **Add to my plates** (default; plates already on the device, by the same key as the
  sign-in check, are skipped) or **Replace my plates** (second confirmation; never-synced
  plates are removed, synced ones become deletions, so with an account they are deleted
  there and on other devices too).
- Imported plates get **new ids**, `updatedAt` = now and count as local changes, so they
  sync like new entries and can't clash with rows of another account.

## Vintage CZ polish — phase 8 (2026-11-16)

Scope chosen by the owner: **plate look** and **context**. (Grouping the 96 codes by old
regions was offered and not chosen.)

- **Look:** pre-2001 CZ plates were black on white **without the EU band** (the band came
  with the 2001 system; reflective plates from 1994). `CollectionDef.plateStyle`
  (`'eu' | 'plain'`) drives `PlateBadge`/`PlateInput`; `plain` hides the band and draws a
  thin inner rim. Badges keep one fixed outer width either way. Source:
  [cs.wikipedia: SPZ v Československu](https://cs.wikipedia.org/wiki/Státní_poznávací_značky_v_Československu)
  (checked 2026-11-16: "vzhledově se nové značky shodovaly se starším systémem", reflective
  from 1994, older plates "stále platné").
- **Context:** an "About these plates" card on the bonus collection's screen: system
  1960–2001, format with example `BN 12-34`, still valid, rarest codes (GT/GV, BI, Prague
  AB–AZ as A), map drawn with today's districts. Facts as in `src/lib/data/cz-vintage.ts`.

## More countries — phase 9 (planned 2026-11-16, done 2026-11-16, released in v0.10.0–v0.12.0)

Goal: more collections beyond SK + CZ, one country per release, each through the
**"Region data" checklist in CLAUDE.md** (issued codes only, still on the road, two sources
incl. one in the country's language, plausibility count, tests, Dexie migration if codes
change, facts here, map from geoBoundaries with a usable licence).

Per country, the work is:
1. Region data file with sources (`src/lib/data/<cc>.ts`) and nationwide types if any.
2. Plate detection for the country's formats in `src/lib/plates/detect.ts`, plus the
   **overlaps with existing countries** (e.g. two-letter codes shared with SK/CZ): the
   country choice (GPS first, then last used) already handles ambiguous plates, but each
   new country needs test cases for its overlaps.
3. Map (`scripts/build-maps.mjs`) and the offline country outline for GPS (`countryAt`,
   `scripts/build-borders.mjs`).
4. i18n names, collection registry, plate look (`plateStyle`, band country code).

Candidates (to verify with the checklist before deciding; ordered by how often they're
seen in SK/CZ):
- **Austria:** district codes of one or two letters (e.g. `W`, `G`, `BN`); fits the
  "every code counts" model well.
- **Poland:** county codes of two or three letters; several hundred codes, so the grid and
  map need to work at that size.
- **Hungary:** current plates have **no regional code** (since 1990), so it would only have a
  nationwide collection; probably not worth a collection unless there's another goal.
- **Germany:** several hundred district codes ("Unterscheidungszeichen"), many
  re-introduced old codes; the largest data task.
- **Ukraine:** two-letter region codes (oblasts), plus older systems still on the road.

Open: which countries, in which order (owner to decide), and whether very large lists
(PL, DE) need search/filter in the grid first.

## Special series — phase 10 (planned 2026-11-16, not started)

Goal: collect plates of special series that are not regional and not covered by the
nationwide types (see "Candidates to add later" above).

Candidates, per country, each to be verified like region data (format, still issued,
sources):
- **Diplomatic** (SK `CD-NNNNN`; CZ `NNN CD/XX/XS/HC NN`; older series to be checked).
- **Military** (SK and CZ military plates are numeric series).
- **Trade / test / export / temporary** plates (dealer and short-term plates).
- **Historic vehicle** plates beyond what's already handled (`cz-historic` keeps its region).

Questions to decide before building:
- **Where do they live?** As extra types in the existing nationwide subcollection (simplest:
  same picker, same counters, not part of progress) or as a separate "special" section per
  country.
- **What counts?** Collect each series type once (like nationwide types), or count
  individual codes inside a series (e.g. diplomatic codes per embassy, if that's public).
- **Privacy/sensitivity:** diplomatic and military plates are public on the road, but the
  app shouldn't present who a plate belongs to beyond the series type.

## Fixes after v0.7.0 (planned and done 2026-11-16)

All seven done; how they were solved is noted per item.

- (2) `UpdatePrompt` uses a `<dialog>` (showModal); the smoke test simulates a real new
  release (rebuild with `SMOKE_VERSION_SUFFIX`, restart the preview server, which reads files
  only at startup).
  Since 2026-11-16 it also shows **"What's new"** (owner: English is fine): the build turns
  CHANGELOG.md into `changelog.json` (plugin in `vite.config.ts`, parser in
  `src/lib/changelog.ts`: Features/Bug fixes/Performance only, scope and commit links
  removed). It isn't precached, so the old app fetches the new deployment's file
  (`cache: 'no-store'`) and lists the versions above its own. Offline or failed fetch: no
  list.
- (3) `closeOnBackdrop` in `src/lib/dialog.ts`.
- (4) Even clearing the input right after `addSighting` was too late (the live query
  updates first), so the duplicate check is off while `saving`.
- (5) `src/lib/nav.ts`: every entry stores its depth in SvelteKit page state; in-app links
  are intercepted in the layout. Apps opened directly on a sub-page have no Home below; the
  Home tab then replaces that entry with Home.
- (7) Address: Nominatim (max 1 request/s, results saved, credited), street level, or town
  only for approximate fixes; names in the place's language. Migration
  `20261117120000_sighting_place.sql`: column `place`; pushes from app versions without it
  keep the stored address unless the spot moved. Map: Leaflet + OSM tiles, not draggable
  (page scrolling stays smooth; zoom buttons work); offline (or when a tile fails) a pin on
  the region map, using the map projection now saved in the generated map files
  (`projectToMap`, same LAEA as mapshaper, tested against it).

1. Home sync button smaller; icon only on phones.
2. "New version available" as a centred modal with a darkened background (the "ready to
   work offline" note stays a toast).
3. Tapping outside a dialog closes it (not the sign-in conflict dialog: a choice is needed).
4. Red flash after saving a plate: the live query sees the just-saved plate as a duplicate
   before the input is cleared. Clear first; never count the just-saved plate.
5. Back stack: Home always at the bottom; bottom-bar screens replace each other (never
   deeper than Home → screen); detail screens (country, edit) sit on top of the screen
   they came from; the Home tab goes straight back; save/delete on the edit page go back.
6. Location always ±2000 m (owner's phone: Android): that's Android's "approximate
   location" permission for the browser. Detect a coarse fix and say how to allow precise
   location.
7. Edit page: address (town, street) via OpenStreetMap Nominatim, looked up once when
   online and **saved with the sighting** (synced; new column + Dexie version); a small
   street map (Leaflet + OSM tiles) with the accuracy circle when online, a pin on the
   app's own district map offline.

## Phases

| #   | Phase                                                                                     | Status                    |
| --- | ----------------------------------------------------------------------------------------- | ------------------------- |
| 1   | Scaffold: SvelteKit, PWA, Dexie, i18n, app shell, icons                                    | ✅ done (v0.1.0)          |
| 2   | SK + CZ data, plate detection, plate + quick entry, history/edit, date + GPS              | ✅ done (v0.2.0)          |
| 3   | Deploy: GitHub Pages under `/SPZky/`, CI on `main`, release-tag publishing (see below)     | ✅ done (v0.2.0, live at https://matuspilnan.github.io/SPZky/) |
| 4   | Nationwide plates: save plates without region per country, plate types + highlighting; country choice ordered by GPS, then last used (see above) | ✅ done (v0.3.0) |
| 5   | Progress: per-country screens incl. nationwide subcollection, code grids, home overview    | ✅ done (v0.3.0) |
| 6   | Maps: boundary data → SVG, colored map views                                               | ✅ done (v0.5.0)          |
| 7   | Sync: Supabase project, schema + RLS, email-code sign-in, sync engine, first-login merge  | ✅ done (v0.6.0; export/import v0.6.0, Home sync button v0.7.0, fixes + address/map v0.8.0) |
| 8   | Vintage CZ polish: plate look without the EU band, "About these plates" (see above)      | ✅ done (v0.9.0)          |
| 9   | More countries, one per release, via the region-data checklist (see "More countries")    | planned                   |
| 10  | Special series: diplomatic, military, trade/test… (see "Special series")                 | planned                   |

Deploy comes before the remaining features so the app can be installed and tested on a phone
over HTTPS (needed for the service worker, install prompt and GPS) from then on.

## Deployment (phase 3)

**Target:** GitHub Pages at the repository-name URL <https://matuspilnan.github.io/SPZky/>
(decided 2026-11-13), deployed by GitHub Actions (Pages source set to "GitHub Actions", no
`gh-pages` branch). The path is case-sensitive and follows the repo name, so it is not
hardcoded: CI derives the base path as `/${{ github.event.repository.name }}`.

### Pipelines

GitHub only runs workflows from `.github/workflows/*.yml` (or `.yaml`) at the **repository
root**. The repo root is this project folder (`spz-ky/`), so the files are:

| Workflow file                    | Trigger                                  | Steps                                                                                                                  |
| -------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`       | `push` to `main`, `pull_request` to `main` | Node from `.nvmrc` (`actions/setup-node` with `node-version-file`), `npm ci`, `npm run check`, `npm test`, `npm run smoke` (Chrome is preinstalled on `ubuntu-latest`); upload `.smoke/` screenshots as an artifact on failure |
| `.github/workflows/release.yml`  | `push` of tags `v*.*.*`                   | Same checks, then verify the tag equals `v` + `package.json` version, build with the base path, upload with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages` (job needs `permissions: pages: write, id-token: write` and `environment: github-pages`), create a GitHub Release with notes generated from the Conventional Commits since the previous tag |

Only release tags publish. Pushes to `main` are tested but not deployed.

### One-time repository settings

- Settings → Pages → Source: **GitHub Actions**.
- Settings → Environments → `github-pages` → deployment branches and tags: add a tag rule
  `v*`. By default the environment often only allows the default branch, and a deploy started
  by a tag then fails with "Tag … is not allowed to deploy to github-pages due to environment
  protection rules".
- **Visibility:** the repo is **public** (since 2026-11-13; verified via the GitHub API:
  name `SPZky`, default branch `main`). That is required for Pages on a free plan, and Actions
  minutes are unlimited for public repos. Pages was not enabled yet at that point.

### Release flow

1. Bump `version` in `package.json` (SemVer, see CLAUDE.md), commit `chore(release): vX.Y.Z`.
2. Tag `vX.Y.Z` and push the commit and the tag.
3. `release.yml` tests, deploys and creates the GitHub Release. A failing check blocks the deploy.

Steps 1–2 are `npm run release -- <patch|minor|major>` (runs check + tests first, adds the
`CHANGELOG.md` entry to the release commit) followed by `git push --follow-tags`. Release
notes are kept in `CHANGELOG.md` (decided 2026-11-13), and the GitHub Release reuses the
version's section.

### App changes needed for a sub-path

- Set the SvelteKit base path from an env var (e.g. `BASE_PATH=/SPZky`, set by CI), so local
  dev and preview keep working at `/`. All links already go through `resolve()`, and assets
  through `%sveltekit.assets%`.
- Make the manifest base-aware: `id`, `start_url` and `scope` are currently hardcoded to `/`.
- Service worker scope must be the base path (`/SPZky/`), so it never controls other projects
  on `matuspilnan.github.io`.
- The origin `matuspilnan.github.io` is shared with any other Pages project of the same user.
  IndexedDB (`spz-ky`) and localStorage keys (`spz-ky.*`) are already namespaced. Keep it that way.
- Run the smoke test against a build with the base path (preview served under `/SPZky/`), so
  path bugs are caught before release.
- No `.nojekyll` needed: Actions-based deploys (`deploy-pages`) publish the artifact as-is
  without Jekyll, so the `_app/` folder is served.

### Open points

- **Renaming the repo changes the URL** (and therefore the PWA's scope, and stored data under
  the old path's service worker). The base path follows automatically, but installed apps
  would need reinstalling. Keep the name stable once released.
- Supabase (phase 7) will need `https://matuspilnan.github.io/SPZky/` in its allowed auth
  redirect URLs.
- A custom domain would later change the origin, so locally stored data would not carry over.
  Prefer to decide on the domain before people start using the app.

## Known limitations

- On Windows, flag emoji render as letters ("SK"); phones show real flags.
- Location is only read while the Add screen is open (by design, to save battery).
