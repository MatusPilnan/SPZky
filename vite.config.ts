import { readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-static';
import { withPwa } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	plugins: [
		withPwa(
			{
				// Every route is prerendered (ssr=false shells), so the build is a plain
				// static site that works on any host, and every page can be precached.
				adapter: adapter()
			},
			{
				strategies: 'generateSW',
				registerType: 'prompt',
				injectRegister: false,
				manifest: {
					id: '/',
					name: 'ŠPZ-ky',
					short_name: 'ŠPZ-ky',
					description: 'Hunt license plates from every region.',
					lang: 'sk',
					start_url: '/',
					scope: '/',
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
