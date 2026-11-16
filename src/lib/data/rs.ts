import { rsTable } from './rs.generated';
import type { Region } from './types';

// Serbian registration areas (регистарска подручја). Checked 2026-11-16.
//
// Imported by scripts/import-rs-codes.mjs from sr.wikipedia "Регистарске ознаке у Србији",
// whose list follows the official one (Правилник о регистрацији моторних и прикључних
// возила, Прилог 1, 5 May 2025: 81 areas). Second source: en.wikipedia "Vehicle
// registration plates of Serbia" (73 codes: Serbia proper without KU from 2025 and
// without the Kosovo codes; old plates were used alongside the new ones only "during the
// transitional period until the end of 2011").
//
// Format since 1 Jan 2011: area code, three digits (four in Belgrade since mid-2016),
// two letters ("NS 123-AB", "BG 1234-AB"). Codes may contain Č Ć Š Ž Đ (BČ Bečej,
// BĆ Bogatić, ČA Čačak…); normalizePlate keeps those letters, and detection also accepts a
// code typed without them (BC → BČ or BĆ).
// What's in: all 81 areas of the official list, incl. the 7 for Kosovo towns (ĐA, GL, KM,
// PE, PR, PZ, UR), marked rare: since early 2024 cars in Kosovo must carry Kosovo (RKS)
// plates, so Serbian plates with these codes are rarely seen (owner's decision 2026-11-16:
// include and mark rare; Kosovo gets its own collection). KU (Kula) is in use since May
// 2025; Kula's older plates with SO stay valid (both counted).
// What's out: diplomatic, police, army and temporary plates. No bonus collection: plates of
// the pre-2011 (Yugoslav-era) format were only valid until the end of 2011.
// Map: 145 municipalities (OpenStreetMap via geoBoundaries, ODbL), grouped by area; the
// Kosovo codes have no map area (not in the data).
// Plausibility: 81 areas (74 + 7 Kosovo).
export const rsRegions: Region[] = rsTable.map(({ code, name, areas, rare }) =>
	rare ? { code, name, areas, rare } : { code, name, areas }
);

/** Kosovo codes: no area on the map. */
export const rsUnmappedCodes = new Set(rsTable.filter((r) => r.areas.length === 0).map((r) => r.code));
