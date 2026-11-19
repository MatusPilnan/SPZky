import { describe, expect, it } from 'vitest';
import { systemLocale } from './locale';

describe('systemLocale', () => {
	it('Slovak for Slovak and Czech devices', () => {
		expect(systemLocale(['sk-SK'])).toBe('sk');
		expect(systemLocale(['cs'])).toBe('sk');
		expect(systemLocale(['cs-CZ', 'en-US'])).toBe('sk');
	});

	it('German for German devices (Germany, Austria, Switzerland)', () => {
		expect(systemLocale(['de-DE'])).toBe('de');
		expect(systemLocale(['de-AT', 'en'])).toBe('de');
		expect(systemLocale(['de-CH'])).toBe('de');
	});

	it('English for English and every other language', () => {
		expect(systemLocale(['en-GB'])).toBe('en');
		expect(systemLocale(['pl', 'uk'])).toBe('en');
		expect(systemLocale([])).toBe('en');
	});

	it('takes the first language the app has, in preference order', () => {
		expect(systemLocale(['hu', 'sk', 'en'])).toBe('sk');
		expect(systemLocale(['hu', 'en-US', 'sk'])).toBe('en');
		expect(systemLocale(['fr', 'de', 'cs'])).toBe('de');
	});

	it('does not mistake other languages for Slovak (no prefix match)', () => {
		expect(systemLocale(['skr'])).toBe('en');
	});
});
