import { formatMessage, type Params } from './format';
import { isLocale, locales, systemLocale, type Locale, type LocalePreference } from './locale';
import { en, sk, type MessageKey, type Messages } from './messages';
import { de } from './messages.de';

export { locales, type Locale, type LocalePreference };

export const localeNames: Record<Locale, string> = { sk: 'Slovenčina', en: 'English', de: 'Deutsch' };

const dictionaries: Record<Locale, Messages> = { sk, en, de };
/** The saved choice: "sk" / "en", or nothing (= follow the device). */
const STORAGE_KEY = 'spz-ky.locale';

function deviceLocale(): Locale {
	return systemLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

function savedPreference(): LocalePreference {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (isLocale(saved)) return saved;
	} catch {
		// storage unavailable (private mode etc.)
	}
	return 'system';
}

let preference = $state<LocalePreference>('system');
/** What "system" means here; updated when the device's language changes. */
let device = $state<Locale>('sk');
let current = $state<Locale>('sk');

function apply(locale: Locale) {
	current = locale;
	document.documentElement.lang = locale;
}

export const i18n = {
	/** The language in use. */
	get locale(): Locale {
		return current;
	},
	/** The choice in Settings: a language, or "system" (follow the device's languages). */
	get preference(): LocalePreference {
		return preference;
	},
	set preference(value: LocalePreference) {
		preference = value;
		apply(value === 'system' ? device : value);
		try {
			if (value === 'system') localStorage.removeItem(STORAGE_KEY);
			else localStorage.setItem(STORAGE_KEY, value);
		} catch {
			// ignore
		}
	},
	/** The language "system" stands for on this device. */
	get deviceLocale(): Locale {
		return device;
	},
	/** Call once on app start (client only). */
	init() {
		device = deviceLocale();
		preference = savedPreference();
		apply(preference === 'system' ? device : preference);
		// Following the device: switch when its language changes.
		addEventListener('languagechange', () => {
			device = deviceLocale();
			if (preference === 'system') apply(device);
		});
	}
};

/** Translate a key. Reactive: re-renders when the locale changes. */
export function t(key: MessageKey, params?: Params): string {
	return formatMessage(dictionaries[current][key] ?? en[key], current, params);
}

export function formatDateTime(epochMs: number): string {
	return new Intl.DateTimeFormat(current, { dateStyle: 'medium', timeStyle: 'short' }).format(epochMs);
}

export function formatBytes(bytes: number): string {
	const units = ['B', 'kB', 'MB', 'GB'];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${new Intl.NumberFormat(current, { maximumFractionDigits: 1 }).format(value)} ${units[unit]}`;
}
