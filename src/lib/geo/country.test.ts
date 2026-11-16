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
		['Wien', 48.2082, 16.3738, 'AT'],
		['Gdańsk', 54.352, 18.6466, 'PL'],
		['Innsbruck', 47.2692, 11.4041, 'AT'],
		['Bratislava (next to the AT border)', 48.1486, 17.1077, 'SK'],
		['Budapest', 47.4979, 19.0402, null],
		['Kraków', 50.0647, 19.945, 'PL'],
		['Dresden', 51.0504, 13.7373, 'DE'],
		['Lviv', 49.8397, 24.0297, 'UA'],
		['Paris', 48.8566, 2.3522, 'FR'],
		['Sofia', 42.6977, 23.3219, 'BG'],
		['Cluj-Napoca', 46.7712, 23.6236, 'RO'],
		['Ljubljana', 46.0569, 14.5058, 'SI'],
		['Novi Sad', 45.2671, 19.8335, 'RS'],
		['Thessaloniki', 40.6401, 22.9444, 'GR'],
		['Heraklion (Crete)', 35.3387, 25.1442, 'GR'],
		['Corte (Corsica)', 42.3061, 9.1497, 'FR'],
		['Kyiv', 50.45, 30.523, 'UA'],
		['Budapest (not supported)', 47.4979, 19.0402, null],
		['Atlantic', 0, 0, null]
	])('%s → %s', (_, lat, lng, expected) => {
		expect(countryAt(lat as number, lng as number)).toBe(expected);
	});
});
