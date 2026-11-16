/// <reference types="@unplugin-pwa/core/svelte" />

declare global {
	const __APP_VERSION__: string;
	/** Sub-path of the deployment ("" or "/SPZky"), for generated files such as changelog.json. */
	const __BASE_PATH__: string;
	/** Supabase project URL and publishable key, set at build time (empty = sync off). */
	const __SUPABASE_URL__: string;
	const __SUPABASE_KEY__: string;

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		interface PageState {
			/** Position in the app's back stack (src/lib/nav.ts): 0 = Home at the bottom. */
			depth?: number;
		}
		// interface Platform {}
	}
}

export {};
