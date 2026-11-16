/// <reference types="@unplugin-pwa/core/svelte" />

declare global {
	const __APP_VERSION__: string;
	/** Supabase project URL and publishable key, set at build time (empty = sync off). */
	const __SUPABASE_URL__: string;
	const __SUPABASE_KEY__: string;

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
