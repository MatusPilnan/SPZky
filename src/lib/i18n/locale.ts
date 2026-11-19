// Which app language the device's languages call for. Pure, so it can be tested.

export const locales = ['sk', 'en'] as const;
export type Locale = (typeof locales)[number];

/** A saved language choice: a language, or follow the device ("system"). */
export type LocalePreference = Locale | 'system';

export function isLocale(value: unknown): value is Locale {
	return locales.includes(value as Locale);
}

/**
 * The app language for the device's preferred languages (most preferred first): Slovak
 * when the first Slovak, Czech or English entry is Slovak or Czech (Czech readers read
 * Slovak easily); English otherwise, also for every other language.
 */
export function systemLocale(languages: readonly string[]): Locale {
	for (const tag of languages) {
		const lang = tag.toLowerCase().split(/[-_]/)[0];
		if (lang === 'sk' || lang === 'cs') return 'sk';
		if (lang === 'en') return 'en';
	}
	return 'en';
}
