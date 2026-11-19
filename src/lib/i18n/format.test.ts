import { describe, expect, it } from 'vitest';
import { formatMessage } from './format';
import { en, sk } from './messages';
import { de } from './messages.de';

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

	it('selects German plural forms', () => {
		expect(formatMessage(de['account.unsynced'], 'de', { count: 1 })).toBe('1 Änderung wartet auf Synchronisierung');
		expect(formatMessage(de['account.unsynced'], 'de', { count: 4 })).toBe('4 Änderungen warten auf Synchronisierung');
	});

	it('German has every text, with the same placeholders as English', () => {
		const placeholders = (m: unknown) => [...JSON.stringify(m).matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort();
		for (const key of Object.keys(en) as (keyof typeof en)[]) {
			expect(de[key], key).toBeTruthy();
			expect([...new Set(placeholders(de[key]))], key).toEqual([...new Set(placeholders(en[key]))]);
		}
	});
});
