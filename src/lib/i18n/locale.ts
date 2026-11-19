// Which app language the device's languages call for. Pure, so it can be tested.

export const locales = ['sk', 'en', 'de'] as const;
export type Locale = (typeof locales)[number];

/** A saved language choice: a language, or follow the device ("system"). */
export type LocalePreference = Locale | 'system';

export function isLocale(value: unknown): value is Locale {
	return locales.includes(value as Locale);
}

/**
 * The app language for the device's preferred languages (most preferred first): the first
 * one the app has decides, with Czech counting as Slovak (Czech readers read Slovak
 * easily); English for every other language.
 */
export function systemLocale(languages: readonly string[]): Locale {
	for (const tag of languages) {
		const lang = tag.toLowerCase().split(/[-_]/)[0];
		if (lang === 'cs') return 'sk';
		if (isLocale(lang)) return lang;
	}
	return 'en';
}
