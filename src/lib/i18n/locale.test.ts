import { describe, expect, it } from 'vitest';
import { systemLocale } from './locale';

describe('systemLocale', () => {
	it('Slovak for Slovak and Czech devices', () => {
		expect(systemLocale(['sk-SK'])).toBe('sk');
		expect(systemLocale(['cs'])).toBe('sk');
		expect(systemLocale(['cs-CZ', 'en-US'])).toBe('sk');
	});

	it('English for English and every other language', () => {
		expect(systemLocale(['en-GB'])).toBe('en');
		expect(systemLocale(['de-AT'])).toBe('en');
		expect(systemLocale(['pl', 'uk'])).toBe('en');
		expect(systemLocale([])).toBe('en');
	});

	it('takes the first Slovak, Czech or English entry in preference order', () => {
		expect(systemLocale(['de-DE', 'sk', 'en'])).toBe('sk');
		expect(systemLocale(['hu', 'en-US', 'sk'])).toBe('en');
	});

	it('does not mistake other languages for Slovak (no prefix match)', () => {
		expect(systemLocale(['skr'])).toBe('en');
	});
});
