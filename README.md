# ŠPZ-ky

Offline-first PWA for hunting license plates: log plates you spot and track progress per country by regional code.

## Requirements

Node **22.17+** (see `.nvmrc`). With [fnm](https://github.com/Schniz/fnm):

```sh
fnm use        # picks up .nvmrc
```

To make fnm switch automatically in PowerShell, add this to your `$PROFILE`:

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

## Layout

```
src/lib/db/          Dexie schema + sighting repository
src/lib/plates/      plate normalization (detection comes in phase 2)
src/lib/i18n/        messages (sk/en), formatter, reactive locale
src/lib/components/  PlateBadge, UpdatePrompt
src/routes/          home, add, history, settings
```
