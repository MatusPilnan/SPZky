import { describe, expect, it } from 'vitest';
import { countryAt } from './country';

describe('countryAt', () => {
	it.each([
		['Bratislava', 48.1486, 17.1077, 'SK'],
		['Bratislava-Petržalka', 48.11, 17.11, 'SK'],
		['Košice', 48.7164, 21.2611, 'SK'],
		['Žilina', 49.2231, 18.7394, 'SK'],
		['Skalica (near CZ border)', 48.845, 17.227, 'SK'],
		['Praha', 50.0755, 14.4378, 'CZ'],
		['Brno', 49.1951, 16.6068, 'CZ'],
		['Ostrava', 49.8209, 18.2625, 'CZ'],
		['Hodonín (near SK border)', 48.849, 17.132, 'CZ'],
		['Wien', 48.2082, 16.3738, null],
		['Budapest', 47.4979, 19.0402, null],
		['Kraków', 50.0647, 19.945, null],
		['Dresden', 51.0504, 13.7373, null],
		['Atlantic', 0, 0, null]
	])('%s → %s', (_, lat, lng, expected) => {
		expect(countryAt(lat as number, lng as number)).toBe(expected);
	});
});
