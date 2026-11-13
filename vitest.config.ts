import { defineConfig } from 'vitest/config';

// Unit tests cover plain TS modules (data layer, plate parsing, i18n helpers),
// so they run without the SvelteKit/PWA plugins.
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
		environment: 'node'
	}
});
