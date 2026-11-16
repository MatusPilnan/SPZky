// Town and street of a sighting's location, looked up once with OpenStreetMap's
// Nominatim (https://nominatim.org/release-docs/latest/api/Reverse/) and saved on the
// sighting (field `place`, synced). Usage policy: at most 1 request per second, cache
// results, credit OpenStreetMap — so lookups run one at a time in the background and
// every result is stored. https://operations.osmfoundation.org/policies/nominatim/

import { db as defaultDb, type SpzDatabase } from '../db/db';
import { nextUpdatedAt } from '../db/sightings';
import type { GeoPoint } from '../db/types';
import { isCoarse } from './accuracy';
import { countryAt, type CountryCode } from './country';

const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
/** Gap between requests (policy: max 1/s). */
const GAP_MS = 1100;
/** Per run, so a big backlog (e.g. after an import) is worked off over several app starts. */
const MAX_PER_RUN = 30;

/** The address fields of a Nominatim response that we use. */
export interface NominatimAddress {
	road?: string;
	pedestrian?: string;
	footway?: string;
	house_number?: string;
	hamlet?: string;
	village?: string;
	town?: string;
	city?: string;
	municipality?: string;
	suburb?: string;
	city_district?: string;
	county?: string;
	state?: string;
	country?: string;
}

/**
 * "Hlavná 12, Košice" from an address. With a coarse fix (approximate location) the
 * street would be a guess, so only the town is used. "" when nothing useful is there.
 */
export function formatPlace(a: NominatimAddress, coarse: boolean): string {
	const locality = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? a.suburb ?? a.county ?? a.state;
	const street = a.road ?? a.pedestrian ?? a.footway;
	const streetPart = !coarse && street ? [street, a.house_number].filter(Boolean).join(' ') : null;
	const parts = [streetPart, locality ?? (streetPart ? null : a.country)].filter((p): p is string => !!p);
	return parts.join(', ').slice(0, 300);
}

/** Main language per supported country, so place names come in their local form. */
const LOCAL_LANGUAGE: Record<CountryCode, string> = { SK: 'sk', CZ: 'cs', AT: 'de', PL: 'pl', DE: 'de', UA: 'uk', FR: 'fr', BG: 'bg', RO: 'ro', SI: 'sl', RS: 'sr-Latn', GR: 'el', XK: 'sq' };

/** Names in the language of the place (Slovak towns in Slovak, Czech in Czech…). */
function languageFor(p: GeoPoint): string {
	const country = countryAt(p.lat, p.lng);
	const local = country ? LOCAL_LANGUAGE[country] : null;
	return [...new Set([local, 'sk', 'cs', 'en'].filter(Boolean))].join(',');
}

export class LookupError extends Error {}

/** Looks up one location. Throws LookupError when the service can't be reached (try later). */
export async function lookupPlace(p: GeoPoint, fetcher: typeof fetch = fetch): Promise<string> {
	const coarse = isCoarse(p);
	const params = new URLSearchParams({
		format: 'jsonv2',
		lat: String(p.lat),
		lon: String(p.lng),
		// 18 = building/street level; 10 = town level for approximate fixes.
		zoom: coarse ? '10' : '18',
		addressdetails: '1',
		'accept-language': languageFor(p)
	});
	let res: Response;
	try {
		res = await fetcher(`${ENDPOINT}?${params}`, { headers: { Accept: 'application/json' } });
	} catch (e) {
		throw new LookupError(String(e));
	}
	if (res.status === 429 || res.status >= 500) throw new LookupError(`HTTP ${res.status}`);
	if (!res.ok) return '';
	const body = (await res.json()) as { address?: NominatimAddress; error?: string };
	return body.address ? formatPlace(body.address, coarse) : '';
}

let running: Promise<number> | null = null;

/**
 * Looks up the address of every sighting with a location but none yet, one per
 * second, and saves it (as a change, so it syncs). Returns how many were saved.
 * Stops quietly when offline or the service is unavailable; runs once at a time.
 */
export function resolvePlaces(
	database: SpzDatabase = defaultDb,
	fetcher: typeof fetch = fetch,
	gapMs = GAP_MS
): Promise<number> {
	running ??= (async () => {
		let saved = 0;
		try {
			const todo = await database.sightings
				.filter((s) => s.deleted === 0 && s.location !== null && (s.place === null || s.place === undefined))
				.limit(MAX_PER_RUN)
				.toArray();
			for (const [i, s] of todo.entries()) {
				if (typeof navigator !== 'undefined' && navigator.onLine === false) break;
				if (i > 0) await new Promise((r) => setTimeout(r, gapMs));
				let place: string;
				try {
					place = await lookupPlace(s.location!, fetcher);
				} catch {
					break; // offline / rate-limited / server down: next time
				}
				await database.transaction('rw', database.sightings, async () => {
					const current = await database.sightings.get(s.id);
					// Skip if it changed meanwhile (moved, deleted, already has an address).
					if (!current || current.deleted || current.place != null) return;
					if (current.location?.lat !== s.location!.lat || current.location?.lng !== s.location!.lng) return;
					await database.sightings.update(s.id, { place, updatedAt: nextUpdatedAt(current), dirty: 1 });
					saved++;
				});
			}
		} finally {
			running = null;
		}
		return saved;
	})();
	return running;
}
