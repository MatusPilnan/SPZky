import { describe, expect, it } from 'vitest';
import { formatMessage } from './format';
import { en, sk } from './messages';

describe('formatMessage', () => {
	it('fills placeholders and leaves unknown ones intact', () => {
		expect(formatMessage('Saved {plate} {x}', 'en', { plate: 'BA123AB' })).toBe('Saved BA123AB {x}');
	});

	it('selects Slovak plural forms', () => {
		const m = sk['home.total'];
		expect(formatMessage(m, 'sk', { count: 1 })).toBe('1 zaznamenaná ŠPZ');
		expect(formatMessage(m, 'sk', { count: 3 })).toBe('3 zaznamenané ŠPZ');
		expect(formatMessage(m, 'sk', { count: 5 })).toBe('5 zaznamenaných ŠPZ');
		expect(formatMessage(m, 'sk', { count: 0 })).toBe('0 zaznamenaných ŠPZ');
	});

	it('selects English plural forms', () => {
		expect(formatMessage(en['home.total'], 'en', { count: 1 })).toBe('1 plate spotted');
		expect(formatMessage(en['home.total'], 'en', { count: 2 })).toBe('2 plates spotted');
	});
});
