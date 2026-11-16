import { deTable } from './de.generated';
import type { Region } from './types';

// German district codes (Unterscheidungszeichen). Checked 2026-11-16.
//
// Imported by scripts/import-de-codes.mjs from de.wikipedia "Liste der Kfz-Kennzeichen in
// Deutschland" (the codes the registration offices may issue, as of 1 December 2023).
// Second source: en.wikipedia "Vehicle registration plates of Germany" (format: code of 1–3
// letters, then 1–2 letters and 1–4 digits, at most 8 characters; umlauts Ä Ö Ü in codes;
// old codes reintroduced since 2013; registrations with retired codes stay valid).
//
// What's in: every code with a federal state in the list, i.e. all current district codes
// incl. the old codes reintroduced since 2013 ("Kennzeichenliberalisierung"), which are
// issued again on request and so on the road. Several districts can share a code (city
// and district of the same name, e.g. A Augsburg; or a code reintroduced in several
// districts, e.g. BK Backnang/Börde): the code covers all their map areas.
// What's out: federal and state authority series without a district (BD Bundestag, BP
// federal police, BW waterways, THW, X NATO, Y army, and the state-parliament codes
// BBL, BWL, BYL, HEL, LSA, LSN, MVL, NL, NRW, RPL, SAL, SH, THL), diplomatic plates
// (0-…), and old codes that were never reintroduced: plates with them are only valid
// while unchanged since the 1970s district reforms, so practically none are left.
// Names: what the code stands for (the list's derivation: AA = Aalen, ANK = Anklam).
// Umlauts are letters of their own here (MÜ Mühldorf ≠ MU München; see normalizePlate).
// Plausibility: 714 codes for the 400 districts and district-free cities (+ Eisenach,
// separate in the 2021 map data): one current code each, the rest mostly reintroduced
// old codes. The maps test checks that every area has a code and vice versa.
export const deRegions: Region[] = deTable.map(({ code, name, areas }) => ({ code, name, areas }));
