import { describe, expect, it } from 'vitest';
import { fromLocalInputValue, toLocalInputValue } from './datetime';

describe('datetime-local conversion', () => {
	it('round-trips to minute precision', () => {
		const ms = new Date(2026, 10, 8, 9, 5, 42).getTime();
		const value = toLocalInputValue(ms);
		expect(value).toBe('2026-11-08T09:05');
		expect(fromLocalInputValue(value)).toBe(new Date(2026, 10, 8, 9, 5).getTime());
	});

	it('returns null for empty or invalid values', () => {
		expect(fromLocalInputValue('')).toBeNull();
		expect(fromLocalInputValue('not a date')).toBeNull();
	});
});
