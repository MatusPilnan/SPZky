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
  plates"); the pre-2001 CZ collection is listed separately as the bonus collection; the three
  most recent sightings with a link to History.
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

## Sync — phase 7 (plan, 2026-11-15)

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
  config.toml                     auth settings (site URL, OTP length/expiry, rate limits,
                                  email template, SMTP with env(SUPABASE_SMTP_PASSWORD)),
                                  [remotes.production] for the hosted project
  templates/sign-in-code.html     email with {{ .Token }} (sk + en text)
  migrations/<timestamp>_sightings.sql
  tests/rls.test.sql              pgTAP: user A can't see/change user B's rows, etc.
```

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
  incoming `updated_at` is newer (last-write-wins enforced on the server, in one call).

### Sync algorithm (client, `src/lib/sync/`)

1. **Push:** send all local rows with `dirty = 1` (batches of ~200) via `push_sightings`;
   then mark them clean (a rejected, older row is corrected by the pull).
2. **Pull:** fetch rows with `server_updated_at > cursor` (pages of 500), apply each one
   locally if it is new or its `updated_at` is newer than the local row; store the cursor
   in a new local `meta` table (Dexie schema v4).
3. **When:** on app start, when coming back online, a few seconds after a local change
   (debounced), when the app returns to the foreground, and via "Sync now" in Settings.
4. **First sign-in on a device:** local rows without a user are assigned to the account,
   marked dirty and pushed; then everything is pulled.
5. **Same plate logged on two devices while offline:** after a pull, for duplicates of the
   same `plate_normalized` the oldest (`created_at`, then `id`) is kept and the others are
   soft-deleted, so every device ends up with the same result. Quick entries without a
   plate are never merged.
6. **Errors:** network errors, a paused project or an expired session never block the app;
   the status line in Settings shows the state and the last successful sync.

### App changes

- `@supabase/supabase-js`, configured from build-time values `PUBLIC_SUPABASE_URL` and
  `PUBLIC_SUPABASE_KEY` (the public key; RLS protects the data). Without them (local dev,
  forks) the account section is hidden and the app works as today.
- Settings → **Account & sync:** email → "Send code" → 6-digit code → signed in; then the
  email, sync status, last sync, "Sync now", "Sign out", "Delete my cloud data".
- Session stored by supabase-js in localStorage under an `spz-ky.*` key (shared origin on
  GitHub Pages).

### CI/CD

- **ci.yml**, new job *database*: `supabase/setup-cli`, start a local database on the runner
  (Docker), apply all migrations, run `supabase test db` (RLS tests) and the linter.
- **Sync end-to-end test** against the local Supabase stack in CI (it includes a mail
  catcher, so the smoke test can read the sign-in code): two browser profiles act as two
  devices, log plates offline, sync, and must end up identical.
- **release.yml**, new job *migrate* after the tests and before the deploy: `supabase link`,
  `supabase db push`, `supabase config push` (auth settings and SMTP). The build gets the
  public URL and key from repo variables.

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

- **Sign-out:** keep the local data on the device, or remove it after making sure
  everything is synced? (Proposal: ask the user, default "remove", blocked while unsynced
  changes exist.)
- **Delete account completely** (including the email in Supabase Auth) needs a server-side
  function with admin rights (Edge Function). Decided 2026-11-15: **later**, not in phase 7;
  phase 7 has "Delete my cloud data" (the rows).
- Verify during setup: Gmail app passwords and limits on Google's own pages, Supabase's
  current OTP email template variables and `config push` support for SMTP settings.

## Phases

| #   | Phase                                                                                     | Status                    |
| --- | ----------------------------------------------------------------------------------------- | ------------------------- |
| 1   | Scaffold: SvelteKit, PWA, Dexie, i18n, app shell, icons                                    | ✅ done (v0.1.0)          |
| 2   | SK + CZ data, plate detection, plate + quick entry, history/edit, date + GPS              | ✅ done (v0.2.0)          |
| 3   | Deploy: GitHub Pages under `/SPZky/`, CI on `main`, release-tag publishing (see below)     | ✅ done (v0.2.0, live at https://matuspilnan.github.io/SPZky/) |
| 4   | Nationwide plates: save plates without region per country, plate types + highlighting; country choice ordered by GPS, then last used (see above) | ✅ done (v0.3.0) |
| 5   | Progress: per-country screens incl. nationwide subcollection, code grids, home overview    | ✅ done (v0.3.0) |
| 6   | Maps: boundary data → SVG, colored map views                                               | ✅ done (v0.5.0)          |
| 7   | Sync: Supabase project, schema + RLS, email-code sign-in, sync engine, first-login merge  | next; planned in "Sync — phase 7"; needs the owner's setup steps first |
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
