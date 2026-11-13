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
| Hosting & CI           | GitHub Pages at the repo-name URL `matuspilnan.github.io/SPZky/`. Tests on every push to `main`, deploy only on release tags (decided 2026-11-13) |
| Plates without region  | Saved into a per-country **nationwide** subcollection that does **not** count toward country progress. Special plates (EV, personalised, …) are highlighted (decided 2026-11-13, replaces the earlier "not saved") |

## Facts about the plate systems

- **Slovakia:** 93 district codes (1997–2022). **Plates issued since 2023 have no district
  code**: same `XX-NNNLL` layout, but the first two letters are a state-wide series starting at
  `AA`. No district code starts with `A`, so `A?` prefixes are treated as "no region" (revisit
  if the series ever reaches `B?`). EV plates use `EL`/`EV` prefixes. Plates without a region
  go to the nationwide subcollection (see below).
- **Czechia:** region letter at position 2 (`1A2 3456`), 14 regions. Historic plates `NNV XXXX`
  carry the numeric region code (01–14). Personalised plates (8 characters) have no region.
- **Czech pre-2001:** `XX NN-NN` / `XXX NN-NN`, first two letters = district. All Prague `A?`
  codes (except `AA` government) count as one region `A`.
- Source: Wikipedia "Vehicle registration plates of Slovakia / of the Czech Republic".
  Data lives in `src/lib/data/`.

## Nationwide plates (plates without a region) — phase 4

Plates whose format carries no region are saved into a per-country subcollection labelled
**Nationwide** (*Celoštátne* in the Slovak UI). Pre-2001 CZ plates have no nationwide part.

- **Not part of progress:** the region count (e.g. "47 / 93") ignores them. The nationwide
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
  plates"); the pre-2001 CZ collection is listed separately as the bonus collection; the three
  most recent sightings with a link to History.
- **Country screen** `/country?id=<collection>` (query param, so it is one precached shell):
  progress header, code grid with All / Found / Missing filter, nationwide section. Tapping a
  code or nationwide type opens a detail sheet (`<dialog>`) with count, first/last seen and
  the sightings (each opens the edit screen).
- Helpers in `src/lib/progress.ts`: `collectionProgress()`, `regionStats()`.

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

Planned sync: push dirty rows, then pull rows changed since the last sync, last write wins
by `updatedAt`. On first sign-in, local anonymous data is attached to the account and uploaded.

## Phases

| #   | Phase                                                                                     | Status                    |
| --- | ----------------------------------------------------------------------------------------- | ------------------------- |
| 1   | Scaffold: SvelteKit, PWA, Dexie, i18n, app shell, icons                                    | ✅ done (v0.1.0)          |
| 2   | SK + CZ data, plate detection, plate + quick entry, history/edit, date + GPS              | ✅ done (v0.2.0)          |
| 3   | Deploy: GitHub Pages under `/SPZky/`, CI on `main`, release-tag publishing (see below)     | ✅ done (v0.2.0, live at https://matuspilnan.github.io/SPZky/) |
| 4   | Nationwide plates: save plates without region per country, plate types + highlighting; country choice ordered by GPS, then last used (see above) | ✅ done (v0.3.0) |
| 5   | Progress: per-country screens incl. nationwide subcollection, code grids, home overview    | ✅ done (v0.3.0) |
| 6   | Maps: boundary data → SVG, colored map views                                               | next                      |
| 7   | Sync: Supabase project, schema + RLS, auth screens, sync engine, first-login merge         | needs Supabase URL + anon key from the user |
| 8   | Vintage CZ polish                                                                          |                           |

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
