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
| UI language            | Slovak + English with a switch (own lightweight typed i18n instead of Paraglide)                        |
| Plates without region  | Not saved; the app explains why (SK since 2023, personalised, EV)                                       |

## Facts about the plate systems

- **Slovakia:** 93 district codes (1997–2022). **Plates issued since 2023 have no district
  code**: same `XX-NNNLL` layout, but the first two letters are a state-wide series starting at
  `AA`. No district code starts with `A`, so `A?` prefixes are treated as "no region" (revisit
  if the series ever reaches `B?`). EV plates use `EL`/`EV` prefixes.
- **Czechia:** region letter at position 2 (`1A2 3456`), 14 regions. Historic plates `NNV XXXX`
  carry the numeric region code (01–14). Personalised plates (8 characters) have no region.
- **Czech pre-2001:** `XX NN-NN` / `XXX NN-NN`, first two letters = district. All Prague `A?`
  codes (except `AA` government) count as one region `A`.
- Source: Wikipedia "Vehicle registration plates of Slovakia / of the Czech Republic".
  Data lives in `src/lib/data/`.

## Data model

`Sighting` (see `src/lib/db/types.ts`): client UUID, `collectionId`, `regionCode`, raw and
normalized plate (null for quick entries), `seenAt`, optional `location`, `note`, plus sync
fields `createdAt`, `updatedAt`, `deleted` (soft delete), `userId`, `dirty`. Progress is always
computed from sightings, never stored.

Planned sync: push dirty rows, then pull rows changed since the last sync, last write wins
by `updatedAt`. On first sign-in, local anonymous data is attached to the account and uploaded.

## Phases

| #   | Phase                                                                                     | Status                    |
| --- | ----------------------------------------------------------------------------------------- | ------------------------- |
| 1   | Scaffold: SvelteKit, PWA, Dexie, i18n, app shell, icons                                    | ✅ done (v0.1.0)          |
| 2   | SK + CZ data, plate detection, plate + quick entry, history/edit, date + GPS              | ✅ done (not released yet) |
| 3   | Progress: per-country screens, code grids, home overview                                   | next                      |
| 4   | Maps: boundary data → SVG, colored map views                                               |                           |
| 5   | Sync: Supabase project, schema + RLS, auth screens, sync engine, first-login merge         | needs Supabase URL + anon key from the user |
| 6   | Vintage CZ polish, deploy (Netlify / Cloudflare Pages / GitHub Pages)                      |                           |

## Known limitations

- On Windows, flag emoji render as letters ("SK"); phones show real flags.
- Location is only read while the Add screen is open (by design, to save battery).
