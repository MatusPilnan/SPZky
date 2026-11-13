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

## Nationwide plates (plates without a region)

Plates whose format carries no region are no longer rejected. Each country gets a
subcollection labelled **Nationwide** (SK: *Celoštátne*, CZ: *Celostátní* — UI text in sk/en
as usual) that collects them.

- **Not part of progress:** the country's region count (e.g. "47 / 93") ignores them. The
  nationwide subcollection shows its own counter instead (number of plates, and per type).
- **Plate types** (detected from the format, highlighted with their own badge/colour):

  | Country | Type                         | Format (as detected today)                         | Highlight            |
  | ------- | ---------------------------- | -------------------------------------------------- | -------------------- |
  | SK      | standard since 2023          | `XX-NNNLL` with a non-district prefix (`AA…`)      | plain                |
  | SK      | personalised since 2023      | `LL-XXXXX` with a non-district prefix              | special              |
  | SK/CZ   | electric vehicle             | `EL…` / `EV…` prefix                               | special, green (EV)  |
  | CZ      | personalised                 | 8 characters, at least one digit                   | special              |

  Candidates to verify and add later: diplomatic plates (SK `CD-NNNNN`, CZ `DD`/`XX` series),
  military plates, temporary/export plates.
- **EV country:** the `EL`/`EV` prefix alone doesn't tell SK from CZ (detection currently
  returns `country: null`), so the country choice below applies. Check the exact SK and CZ EV
  formats from sources before implementing; they may turn out to be distinguishable.

## Choosing the country when detection is ambiguous

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

- The lookup must work **offline**: point-in-polygon against simplified country outlines
  shipped with the app (a few kB for SK + CZ; the maps phase can reuse them). Bounding boxes
  alone are not enough, because SK and CZ boxes overlap.
- Outside all supported countries, or without location, step 1 is skipped.
- The GPS position only picks the **default** choice. It is a hint (a Slovak car is often seen
  in Czechia), never an automatic decision without showing the options.
- This only applies to the **country**. When the country is clear but several regions match,
  candidates stay ordered by detection confidence as today.
- **Duplicates:** the same plate still counts only once (same duplicate check as regional
  plates).
- **Quick mode:** a "Nationwide" tile per country, with a type picker (standard / EV /
  personalised), for logging without typing the plate.
- **Plates with a region keep their region.** E.g. a pre-2023 SK personalised plate
  `ZA-HELLO` stays in Žilina. Only plates without a region go to the nationwide subcollection.

## Data model

`Sighting` (see `src/lib/db/types.ts`): client UUID, `collectionId`, `regionCode`, raw and
normalized plate (null for quick entries), `seenAt`, optional `location`, `note`, plus sync
fields `createdAt`, `updatedAt`, `deleted` (soft delete), `userId`, `dirty`. Progress is always
computed from sightings, never stored.

Planned for nationwide plates: `collectionId` stays the country (`sk`, `cz`), `regionCode` is
`null`, and a new `plateType` field stores the detected format (`sk-2023`, `ev`,
`sk-personalized`, `cz-personalized`, …; also useful for regional special plates). This needs
a Dexie schema version 2 with an upgrade that fills `plateType` for existing rows, and the
progress counting must skip `regionCode === null`.

Planned sync: push dirty rows, then pull rows changed since the last sync, last write wins
by `updatedAt`. On first sign-in, local anonymous data is attached to the account and uploaded.

## Phases

| #   | Phase                                                                                     | Status                    |
| --- | ----------------------------------------------------------------------------------------- | ------------------------- |
| 1   | Scaffold: SvelteKit, PWA, Dexie, i18n, app shell, icons                                    | ✅ done (v0.1.0)          |
| 2   | SK + CZ data, plate detection, plate + quick entry, history/edit, date + GPS              | ✅ done (not released yet) |
| 3   | Deploy: GitHub Pages under `/SPZky/`, CI on `main`, release-tag publishing (see below)     | ✅ built; first deploy pending the one-time GitHub settings and a release tag |
| 4   | Nationwide plates: save plates without region per country, plate types + highlighting; country choice ordered by GPS, then last used (see above) | next |
| 5   | Progress: per-country screens incl. nationwide subcollection, code grids, home overview    |                           |
| 6   | Maps: boundary data → SVG, colored map views                                               |                           |
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

Steps 1–2 are `npm run release -- <patch|minor|major>` (runs check + tests first) followed by
`git push --follow-tags`.

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
