# ŠPZ-ky

Offline-first PWA for hunting license plates: log plates you spot and track progress per country by regional code.

Plan, decisions and phase status: [docs/PLAN.md](docs/PLAN.md). Notes for Claude Code: [CLAUDE.md](CLAUDE.md).

## Requirements

Node **22.17+** (see `.nvmrc`). On an older Node the npm scripts stop with a version error.

With [fnm](https://github.com/Schniz/fnm), in each new PowerShell terminal:

```powershell
[Console]::OutputEncoding = [Text.Encoding]::UTF8             # see note below
fnm env --shell powershell | Out-String | Invoke-Expression   # activate fnm in this shell
fnm use                                                      # picks up .nvmrc
```

> **Note (Windows PowerShell 5.1):** `fnm env` prints UTF-8, but PowerShell decodes native
> output with the console code page (e.g. IBM 852). If your user path contains non-ASCII
> characters, the paths get garbled, PATH is broken and `fnm` stops being found
> ("The term 'fnm' is not recognized"). Setting the console output encoding to UTF-8 first fixes it.

To make fnm switch automatically instead, add this to your `$PROFILE`:

```powershell
[Console]::OutputEncoding = [Text.Encoding]::UTF8
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
```

## Scripts

| Command           | What it does                                                  |
| ----------------- | ------------------------------------------------------------- |
| `npm run dev`     | Dev server (service worker disabled in dev)                   |
| `npm run build`   | Static build to `build/` incl. service worker + manifest      |
| `npm run preview` | Serve the production build (use this to test offline/install) |
| `npm run check`   | Type-check (svelte-check)                                     |
| `npm test`        | Unit tests (Vitest, IndexedDB via fake-indexeddb)             |
| `npm run smoke`   | Build + browser smoke test in headless Edge/Chrome (`BROWSER_PATH` to override; `BASE_PATH=/SPZky` to test the Pages sub-path) |
| `npm run icons`   | Regenerate PWA icons from `static/favicon.svg`                |
| `npm run db:start` / `db:stop` | Start / stop the local Supabase stack (needs Docker Desktop running) |
| `npm run db:reset` | Recreate the local database from `supabase/migrations`       |
| `npm run db:test` | Database tests (pgTAP: row-level security, sync functions)    |
| `npm run db:lint` | Supabase database linter                                      |
| `npm run sync:e2e` | Build against the local stack + multi-device sync test (sign-in codes from Mailpit) |
| `npm run release -- <patch\|minor\|major>` | Check + test, bump version, add a `CHANGELOG.md` entry, commit `chore(release): vX.Y.Z`, create tag |

### Accounts and sync locally

Without Supabase settings the app runs offline-only and hides the account section. To try
sign-in and sync against the local stack:

```sh
npm run db:start
npx supabase status            # shows API URL, publishable key and Mailpit URL
```

Create `.env.local` (gitignored) with `PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and
`PUBLIC_SUPABASE_KEY=<publishable key>`, run `npm run dev`, and read the sign-in codes in
Mailpit (http://127.0.0.1:54324).

## Deployment

The app is published to GitHub Pages at **https://matuspilnan.github.io/SPZky/**.

- `.github/workflows/ci.yml`: type-check, unit tests and browser smoke test (built for the
  Pages sub-path, incl. offline loading); plus a local Supabase stack with database tests,
  linter and the sync end-to-end test. On every push and pull request to `main`.
- `.github/workflows/release.yml`: on a `vX.Y.Z` tag, checks that the tag matches
  `package.json`, runs the same checks, applies new database migrations and the auth/email
  settings to the hosted Supabase project, builds with `BASE_PATH=/<repo name>` and the
  public Supabase values, deploys to Pages and creates a GitHub Release whose notes are the
  version's section of [CHANGELOG.md](CHANGELOG.md).
- `CHANGELOG.md` is written by `npm run release`: a new entry from the Conventional Commits
  since the previous tag is added to the release commit (`scripts/release-notes.mjs`). It can
  be edited by hand before pushing the tag (amend the release commit and move the tag).

### Releasing

```sh
npm run release -- minor      # or patch / major; needs a clean working tree
git push --follow-tags        # pushes the commit and the tag → release workflow deploys
```

### One-time GitHub setup

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Settings → Environments → `github-pages` → Deployment branches and tags:** add a rule
   for tags `v*` (otherwise deploys started by a tag are rejected by the environment's
   protection rules). The environment appears after step 1.
3. **Supabase (sync):** a project, an access token, and a Gmail mailbox with an app password
   for the sign-in emails; then the secrets and variables listed in
   [docs/PLAN.md → GitHub configuration](docs/PLAN.md#github-configuration) under
   **Settings → Secrets and variables → Actions**.

## Stack

- SvelteKit 3 (Svelte 5 runes), `adapter-static`, every route prerendered as a client-only shell
- `@vite-pwa/sveltekit` (Workbox `generateSW`, update prompt)
- Dexie (IndexedDB) as the local source of truth; optional sync to Supabase (Postgres with
  row-level security, email-code sign-in); database as code in `supabase/`
- Lightweight typed i18n (`src/lib/i18n`) for Slovak and English
- Imports use Node subpath imports: `#lib/...` → `src/lib/...` (keep the `.js` extension for TS modules)

## Data and licences

- Region maps: Slovakia © Geoportal.SK (ÚGKK SR), CC BY 3.0 IGO; Czech regions © ČÚZK,
  CC BY 4.0; Czech districts public domain; Austrian districts and states © BEV, CC BY-SA
  2.0 (the generated `src/lib/geo/maps/at-districts.ts` and `at-states.ts` are shared under
  the same licence); Polish
  counties © Państwowy Rejestr Granic (GUGiK), CC BY 3.0 IGO; German districts ©
  GeoBasis-DE / BKG, Datenlizenz Deutschland – Namensnennung 2.0; Ukrainian regions ©
  State Enterprise "Kartographia", CC BY 3.0 IGO; French departments © IGN, Licence Ouverte
  Etalab 2.0; Bulgarian provinces public domain; Romanian counties © World Bank, CC BY 4.0;
  Greek regions © EuroGeographics, CC BY 4.0; Swiss cantons © swisstopo (open
  government data, attribution);
  Serbian municipalities © OpenStreetMap contributors, ODbL 1.0 (the generated
  `src/lib/geo/maps/rs-municipalities.ts` is shared under the same licence); Slovenian
  registration areas from municipalities © OpenStreetMap contributors, ODbL 1.0
  (`si-areas.ts` likewise); Kosovo
  districts © OpenStreetMap contributors, CC BY-SA 2.0 (`xk-districts.ts` likewise). All via
  [geoBoundaries](https://www.geoboundaries.org/).
- Country outlines: [Natural Earth](https://www.naturalearthdata.com/), public domain.
- Plate formats and region codes: see the sources in each file of `src/lib/data/`.

The app shows the map credits under each map and in Settings → Map data.

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/):
  `type(scope): summary`, e.g. `feat(add): detect region from plate`, `fix(build): …`.
  Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
  Breaking changes use `!` after the type or a `BREAKING CHANGE:` footer.
- **Versions** follow [Semantic Versioning](https://semver.org/). The version in `package.json` is
  bumped when releasing, and each release is tagged `vX.Y.Z`. While below 1.0.0:
  `feat` → minor, `fix` → patch.

## Layout

See the code map in [CLAUDE.md](CLAUDE.md#code-map).
