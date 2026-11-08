import { formatMessage, type Params } from './format';
import { en, sk, type MessageKey, type Messages } from './messages';

export const locales = ['sk', 'en'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = { sk: 'Slovenčina', en: 'English' };

const dictionaries: Record<Locale, Messages> = { sk, en };
const STORAGE_KEY = 'spz-ky.locale';

function isLocale(value: unknown): value is Locale {
	return locales.includes(value as Locale);
}

function detectLocale(): Locale {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (isLocale(saved)) return saved;
	} catch {
		// storage unavailable (private mode etc.)
	}
	for (const tag of navigator.languages ?? [navigator.language]) {
		const lang = tag.toLowerCase().slice(0, 2);
		if (lang === 'sk' || lang === 'cs') return 'sk';
		if (lang === 'en') return 'en';
	}
	return 'sk';
}

let current = $state<Locale>('sk');

export const i18n = {
	get locale(): Locale {
		return current;
	},
	set locale(value: Locale) {
		current = value;
		document.documentElement.lang = value;
		try {
			localStorage.setItem(STORAGE_KEY, value);
		} catch {
			// ignore
		}
	},
	/** Call once on app start (client only). */
	init() {
		current = detectLocale();
		document.documentElement.lang = current;
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
