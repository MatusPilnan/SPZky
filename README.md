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
| `npm run release -- <patch\|minor\|major>` | Check + test, bump version, commit `chore(release): vX.Y.Z`, create tag |

## Deployment

The app is published to GitHub Pages at **https://matuspilnan.github.io/SPZky/**.

- `.github/workflows/ci.yml`: type-check, unit tests and browser smoke test (built for the
  Pages sub-path, incl. offline loading) on every push and pull request to `main`.
- `.github/workflows/release.yml`: on a `vX.Y.Z` tag, checks that the tag matches
  `package.json`, runs the same checks, builds with `BASE_PATH=/<repo name>`, deploys to
  Pages and creates a GitHub Release with notes from the Conventional Commits since the
  previous tag (`scripts/release-notes.mjs`).

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
| `npm run icons`   | Regenerate PWA icons from `static/favicon.svg`                |

## Stack

- SvelteKit 3 (Svelte 5 runes), `adapter-static`, every route prerendered as a client-only shell
- `@vite-pwa/sveltekit` (Workbox `generateSW`, update prompt)
- Dexie (IndexedDB) as the local source of truth; Supabase sync planned
- Lightweight typed i18n (`src/lib/i18n`) for Slovak and English
- Imports use Node subpath imports: `#lib/...` → `src/lib/...` (keep the `.js` extension for TS modules)

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
