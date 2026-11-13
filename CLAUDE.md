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

## Checks before committing

```sh
npm run check   # svelte-check, must be 0 errors / 0 warnings
npm test        # Vitest unit tests
npm run smoke   # builds, then drives the app in headless Edge/Chrome (scripts/smoke.mjs)
```

For a readable stack trace from the smoke test, run `MODE=dev node scripts/smoke.mjs`
against the dev server. Screenshots land in `.smoke/`; look at them after UI changes.
CI runs the smoke test with `BASE_PATH=/SPZky` (GitHub Pages sub-path). Run it that way too
after touching links, paths, the manifest or the service worker (PowerShell:
`$env:BASE_PATH='/SPZky'; npm run smoke`).

## Deployment and releases

- GitHub Pages at `https://matuspilnan.github.io/SPZky/`. Workflows live in
  `.github/workflows/` at the repo root: `ci.yml` (push/PR to `main`, also reused by
  release) and `release.yml` (tags `v*.*.*`: verify tag = `package.json` version, CI,
  build, deploy, GitHub Release).
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
src/lib/collections.ts collection registry + lookups
src/lib/plates/       normalizePlate, detectPlate (ranked candidates, no-region formats)
src/lib/db/           Dexie schema, sighting repository (soft delete, sync fields)
src/lib/progress.ts   counts per collection/region (computed, never stored)
src/lib/i18n/         typed sk/en messages, plural-aware formatter, reactive locale
src/lib/*.svelte.ts   prefs (localStorage), location tracker, toasts
src/lib/components/   PlateInput, PlateBadge, RegionGrid, CollectionSwitch, Toasts, UpdatePrompt
src/routes/           home, add (plate + quick), history, sighting (edit), settings
scripts/              check-node.cjs, smoke.mjs, release-notes.mjs (+ test)
.github/workflows/    ci.yml, release.yml
```
