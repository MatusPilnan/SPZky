import { readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-static';
import { withPwa } from '@vite-pwa/sveltekit';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { parseChangelog } from './src/lib/changelog.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
const version = pkg.version + (process.env.SMOKE_VERSION_SUFFIX ?? '');

/** PUBLIC_* settings from the environment (CI), else from .env / .env.local (local dev). */
const env = { ...loadEnv('', process.cwd(), 'PUBLIC_'), ...process.env };

/**
 * Sub-path the app is served from: "" locally, "/SPZky" on GitHub Pages
 * (set by CI from the repository name). Must start with "/" and have no trailing slash.
 */
const base = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');
if (base && !base.startsWith('/')) throw new Error(`BASE_PATH must start with "/": ${base}`);
const scope = `${base}/`;

/**
 * Serves CHANGELOG.md as changelog.json (last 20 versions) for the update dialog's
 * "What's new". Not precached (only js/css/html/images are), so an installed app always
 * fetches the newly deployed one. The smoke test's fake release gets a fake entry.
 */
function changelogJson(): Plugin {
	const json = () => {
		const entries = parseChangelog(readFileSync(new URL('./CHANGELOG.md', import.meta.url), 'utf-8'));
		if (version !== pkg.version) entries.unshift({ version, date: '', items: ['Smoke test release'] });
		return JSON.stringify(entries.slice(0, 20));
	};
	return {
		name: 'changelog-json',
		configureServer(server) {
			server.middlewares.use(`${base}/changelog.json`, (_req, res) => {
				res.setHeader('Content-Type', 'application/json');
				res.end(json());
			});
		},
		generateBundle() {
			// Client build only (SvelteKit copies its output to build/).
			if (this.environment?.name !== 'client') return;
			this.emitFile({ type: 'asset', fileName: 'changelog.json', source: json() });
		}
	};
}

export default defineConfig({
	define: {
		// SMOKE_VERSION_SUFFIX: the smoke test rebuilds with a suffix to simulate a new release.
		__APP_VERSION__: JSON.stringify(version),
		// For generated files outside static/ (changelog.json), which asset() can't type.
		__BASE_PATH__: JSON.stringify(base),
		// Sync backend (public values; row-level security protects the data). Empty
		// in local dev and forks: the app then works offline-only, without accounts.
		__SUPABASE_URL__: JSON.stringify(env.PUBLIC_SUPABASE_URL ?? ''),
		__SUPABASE_KEY__: JSON.stringify(env.PUBLIC_SUPABASE_KEY ?? '')
	},
	plugins: [
		changelogJson(),
		withPwa(
			{
				// Every route is prerendered (ssr=false shells), so the build is a plain
				// static site that works on any host, and every page can be precached.
				adapter: adapter(),
				paths: { base: base as '' | `/${string}` }
			},
			{
				strategies: 'generateSW',
				registerType: 'prompt',
				injectRegister: false,
				manifest: {
					id: scope,
					name: 'ŠPZ-ky',
					short_name: 'ŠPZ-ky',
					description: 'Hunt license plates from every region.',
					lang: 'sk',
					start_url: scope,
					scope,
					display: 'standalone',
					orientation: 'portrait',
					theme_color: '#003399',
					background_color: '#f4f5f8',
					icons: [
						{ src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
						{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
						{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
						{
							src: 'maskable-icon-512x512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable'
						}
					]
				},
				// Static files, built assets and prerendered pages are precached by
				// the SvelteKit integration's defaults.
				generateSW: {
					// /sighting?id=… must hit the precached /sighting shell.
					ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^id$/]
				},
				devOptions: {
					enabled: false
				}
			}
		)
	]
});
