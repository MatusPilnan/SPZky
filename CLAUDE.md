# CLAUDE.md

Guidance for Claude Code in this repo. Plan, decisions and phase status: [docs/PLAN.md](docs/PLAN.md).
Setup and scripts for humans: [README.md](README.md).

## Working agreements

- **Keep project knowledge in this repo**, not in Claude's local memory: the owner works from
  several devices and continues by cloning. Update `docs/PLAN.md` (decisions, status) and this
  file (how to work here) as things change.
- **Conventional Commits** (`type(scope): summary`) and **SemVer**. Bump `package.json` and tag
  `vX.Y.Z` only when releasing. While below 1.0.0: `feat` → minor, `fix` → patch.
- Commit only when asked. Push and release tags only when the owner confirms.
- Build phases one at a time. Don't start the next phase without being asked.

## Environment

- Needs **Node ≥ 22.17** (`.nvmrc`). npm scripts stop with a clear error on older Node.
- On the owner's Windows PC the system Node is 16, and Node 22 comes from **fnm**. In a
  PowerShell tool call, prefix commands with:

  ```powershell
  [Console]::OutputEncoding = [Text.Encoding]::UTF8; $env:Path = [Environment]::GetEnvironmentVariable('Path','User') + ';' + [Environment]::GetEnvironmentVariable('Path','Machine'); fnm env --shell powershell | Out-String | Invoke-Expression; fnm use 22 | Out-Null;
  ```

  The UTF-8 line matters because the user profile path has non-ASCII characters and
  PowerShell 5.1 would garble fnm's output.
- Don't leave a shell `cd`'d inside `build/`: Windows locks the folder and the next build fails
  with EBUSY.
- Git on that PC is old (2.17): no `git stash push <path>`, no `git init -b`.
- Commit message files: write them **without a BOM**. PowerShell 5.1 `Set-Content -Encoding
  UTF8` adds one, which ends up at the start of the subject and breaks the Conventional
  Commit parsing for CHANGELOG.md. Use the Write tool, `-Encoding ASCII`, or
  `[IO.File]::WriteAllText(path, text, (New-Object Text.UTF8Encoding $false))`.
- `npm i <package>` removes the generated `node_modules/$app` (tsconfig/types from
  `svelte-kit sync`), and then Vitest fails with "Failed to load tsconfig '$app/tsconfig'".
  `npm test` runs `svelte-kit sync` first; otherwise run `npx svelte-kit sync`.

## Stack gotchas (SvelteKit 3 / Svelte 5)

- No `svelte.config.js`. Kit options go into `vite.config.ts` via
  `withPwa(kitOptions, pwaOptions)` from `@vite-pwa/sveltekit` v2.
- `$lib` is removed. Use subpath imports `#lib/...` **with the `.js` extension** for TS
  modules (`#lib/db/sightings.js`) and `.svelte` for components. Inside `src/lib` use
  relative imports.
- `tsconfig.json` extends `$app/tsconfig`.
- Every route is prerendered with `ssr = false`, so there are no dynamic routes. Use query
  params instead (e.g. `/sighting?id=…`) and add new param names to
  `generateSW.ignoreURLParametersMatching` in `vite.config.ts`.
- **Never write Svelte `$state` objects to IndexedDB directly.** They are Proxies and Dexie
  fails with DataCloneError. Copy them to plain objects (see `plainLocation` in
  `src/lib/db/sightings.ts`) or use `$state.raw`.
- TS narrows arrays through inferred type predicates (`arr.every(x => x === null)` makes
  `arr` a `null[]`). Use `some` or a separate variable.

## Sync and database (Supabase, phase 7)

Design and reasons: `docs/PLAN.md`, "Sync — phase 7". Practical rules:

- **The database lives in `supabase/`** (migrations, config, email template, pgTAP tests).
  Change the schema only with a **new migration file**; never edit an applied one. Every
  change gets tests in `supabase/tests/database/` and keeps `npm run db:lint` clean.
- Local stack needs **Docker Desktop running**. `npm run db:start` / `db:stop` / `db:reset`
  / `db:test` / `db:lint` use the CLI pinned in package.json (`npx supabase …`).
- `npm run sync:e2e` builds the app against the local stack and runs the multi-device test
  (codes come from Mailpit). `SKIP_BUILD=1` reuses the last build. After `db:stop` the stack
  restarts from a backup, so tests must not assume an empty database.
- For manual testing against the local stack, put `PUBLIC_SUPABASE_URL` and
  `PUBLIC_SUPABASE_KEY` (publishable key from `npx supabase status`) into `.env.local`
  (gitignored). Without them the account section is hidden.
- CLI 3 gotchas: `supabase db push` targets the **local** database unless `--remote`;
  hosted changes need `--yes`; `config push` writes every setting `config.toml` declares
  (that's why `[db.pooler]` and the storage add-on sections were removed).
- SMTP stays `enabled = false` in `config.toml`; only release.yml turns it on before
  `config push`. Secrets are only in GitHub Actions secrets, never in files or chats.
- Local rows: `userId` null = not in an account; `dirty` = not pushed. Any local edit must
  use `nextUpdatedAt` (in `db/sightings.ts`) so it wins last-write-wins sync.
- Supabase allows one sign-in code per address per 60 s.
- Changing the `Sighting` shape? Also update the export format in `src/lib/backup.ts`
  (bump `BACKUP_FORMAT` only if older app versions couldn't read the new files) and keep
  importing older files working (tests in `backup.test.ts`).

## Region data: checklist for new or changed countries

Collections may contain **only codes that were actually issued and can still be seen on
cars today** (rule since 2026-11-14). The first SK list had 19 codes that were only
*reserved* in the decree and never issued (BD, KC, TA, ZI, …); English Wikipedia listed them
like normal codes. For every country added or changed in `src/lib/data/`:

1. **Issued, not just reserved.** Check each secondary/reserve code. Lists in decrees and
   on wikis often include reserved codes; national-language Wikipedia lists mark them
   differently (e.g. in parentheses). Look for evidence that each extra code really went
   into use (news about the switch, a date).
2. **Still on the road.** Are plates of that system still valid (no mandatory replacement)?
   Drop codes of systems whose plates expired. Note very rare but valid codes in the file
   header.
3. **Never-used and non-regional codes out:** codes allocated but never issued, government,
   diplomatic and military series.
4. **At least two sources, preferably one in the country's language.** Cite them with the
   check date in the data file's header, along with what was left out and why.
5. **Plausibility check:** compare the count with the number of districts/regions (shared
   codes, cities split into several districts) and write it in the header.
6. **Tests:** `src/lib/data/data.test.ts` pins the size and includes known traps (e.g. "no
   reserved codes", "only Bratislava has several codes").
7. **Existing user data:** if codes are removed or renamed, add a Dexie schema version whose
   upgrade re-detects affected sightings (see v3 and `reassignUnknownRegion` in
   `src/lib/db/db.ts`), and update the counts in `scripts/smoke.mjs`.
8. Record the facts and sources in `docs/PLAN.md` ("Facts about the plate systems").
9. **Map:** add the country's boundaries to `scripts/build-maps.mjs` (check the licence per
   dataset on geoBoundaries; prefer CC BY / public domain, check the names aren't garbled),
   add name aliases in `src/lib/geo/maps/index.ts` where areas share codes, and run the
   maps test (every area has codes, every code has an area).

## Checks before committing

```sh
npm run check   # svelte-check, must be 0 errors / 0 warnings
npm test        # Vitest unit tests
npm run smoke   # builds, then drives the app in headless Edge/Chrome (scripts/smoke.mjs)
# after touching supabase/ or src/lib/sync/ (needs Docker + npm run db:start):
npm run db:test && npm run db:lint && npm run sync:e2e
```

For a readable stack trace from the smoke test, run `MODE=dev node scripts/smoke.mjs`
against the dev server. Screenshots land in `.smoke/`; look at them after UI changes.
CI runs the smoke test with `BASE_PATH=/SPZky` (GitHub Pages sub-path). Run it that way too
after touching links, paths, the manifest or the service worker (PowerShell:
`$env:BASE_PATH='/SPZky'; npm run smoke`).

## Deployment and releases

- GitHub Pages at `https://matuspilnan.github.io/SPZky/`. Workflows live in
  `.github/workflows/` at the repo root: `ci.yml` (push/PR to `main`, also reused by
  release; jobs: check/test/smoke and database/sync) and `release.yml` (tags `v*.*.*`:
  verify tag = `package.json` version, CI, migrate Supabase, build with the public Supabase
  values, deploy, GitHub Release). Secret/variable names: `docs/PLAN.md`, "GitHub
  configuration".
- The base path comes from `BASE_PATH` (CI: `/${{ github.event.repository.name }}`). Never
  hardcode `/` or `/SPZky` in app code: use `resolve()` for links, `%sveltekit.assets%` /
  relative paths for assets, `page.route.id` (not `page.url.pathname`) for route checks.
- Release: `npm run release -- <patch|minor|major>` then `git push --follow-tags`, only after
  the owner confirms the release. The npm `version` hook adds the `CHANGELOG.md` entry to the
  release commit, and the GitHub Release text is that section. Keep commit subjects clean
  Conventional Commits, because they become the changelog lines.
- Action versions in the workflows were current majors on 2026-11-13 (checkout/setup-node/
  upload-artifact v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5). Check
  their `action.yml` before changing inputs.

## Code map

```
src/lib/data/         region lists (sk, cz, cz-vintage) with sources
src/lib/collections.ts collection registry, nationwide types per country, highlightOf, countryOf
src/lib/plates/       normalizePlate, detectPlate (region + nationwide candidates), orderByCountry
src/lib/geo/          countryAt (offline point-in-polygon); borders.ts is GENERATED
src/lib/geo/maps/     region maps (GENERATED *.ts), loadMap, codesOfArea, areaStatus
src/lib/db/           Dexie schema (v2 plateType, v3 data fix, v4 meta + userId index),
                      sighting repository (soft delete, sync fields, nextUpdatedAt)
src/lib/sync/         rows (pure rules), engine (push/pull/sign-in check/sign-out), remote
                      (Supabase), account.svelte (auth + state + triggers), fake-remote (tests)
src/lib/progress.ts   region/nationwide counts, collectionProgress, regionStats (computed, never stored)
src/lib/backup.ts     JSON export/import (format 1: parse + validate, preview, add/replace)
src/lib/files.ts      saveTextFile: share sheet in installed apps, download otherwise
src/lib/i18n/         typed sk/en messages, plural-aware formatter, reactive locale
src/lib/*.svelte.ts   prefs (localStorage), location tracker, toasts
src/lib/components/   PlateInput, PlateBadge, RegionGrid (filterable), NationwidePicker, TypeChip,
                      SightingList, ProgressBar, RegionMap, Switch, CollectionSwitch, Toasts,
                      UpdatePrompt, AccountSection (Settings), SignInConflict (layout),
                      DataSection + ExportButton (export/import)
src/routes/           home (overview), country (?id=), add (plate + quick), history,
                      sighting (edit, ?id=), settings
supabase/             config.toml, migrations/, templates/, tests/database/ (pgTAP)
scripts/              check-node.cjs, smoke.mjs, sync-e2e.mjs, release-notes.mjs (+ test),
                      build-borders.mjs (regenerates src/lib/geo/borders.ts),
                      build-maps.mjs (regenerates src/lib/geo/maps/*; keep attribution/licence)
.github/workflows/    ci.yml, release.yml
```
