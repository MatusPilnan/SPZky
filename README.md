# ŠPZ-ky

Offline-first PWA for hunting license plates: log plates you spot and track progress per country by regional code.

## Requirements

Node **22.17+** (see `.nvmrc`). On an older Node the npm scripts stop with a version error.

With [fnm](https://github.com/Schniz/fnm), in each new PowerShell terminal:

```powershell
fnm env --shell powershell | Out-String | Invoke-Expression   # activate fnm in this shell
fnm use                                                      # picks up .nvmrc
```

To make fnm switch automatically instead, add this to your `$PROFILE`:

```powershell
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

```
src/lib/db/          Dexie schema + sighting repository
src/lib/plates/      plate normalization (detection comes in phase 2)
src/lib/i18n/        messages (sk/en), formatter, reactive locale
src/lib/components/  PlateBadge, UpdatePrompt
src/routes/          home, add, history, settings
```
