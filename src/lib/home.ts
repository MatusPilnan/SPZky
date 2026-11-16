// Home screen: order of the country collections and the bonus summary. Pure functions.

import type { Sighting } from './db/types';
import type { CollectionProgress } from './progress';

/** How the country collections on Home are ordered (a per-device preference). */
export type HomeOrder = 'recent' | 'progress' | 'alpha';
export const homeOrders: HomeOrder[] = ['recent', 'progress', 'alpha'];

/** Time of the latest (not deleted) sighting per collection. */
export function lastSeenByCollection(sightings: Pick<Sighting, 'collectionId' | 'seenAt' | 'deleted'>[]): Map<string, number> {
	const last = new Map<string, number>();
	for (const s of sightings) {
		if (s.deleted) continue;
		if (s.seenAt > (last.get(s.collectionId) ?? -Infinity)) last.set(s.collectionId, s.seenAt);
	}
	return last;
}

interface OrderInput {
	id: string;
	/** Display name in the current language (for alphabetical order and ties). */
	name: string;
	progress: CollectionProgress;
}

/**
 * Orders collections:
 * - recent: latest sighting first; collections without any at the end;
 * - progress: highest share found first (then most regions found);
 * - alpha: by name.
 * Ties are broken by name.
 */
export function orderCollections<T extends OrderInput>(items: T[], order: HomeOrder, lastSeen: Map<string, number>, locale: string): T[] {
	const byName = (a: T, b: T) => a.name.localeCompare(b.name, locale);
	const compare: Record<HomeOrder, (a: T, b: T) => number> = {
		recent: (a, b) => (lastSeen.get(b.id) ?? -Infinity) - (lastSeen.get(a.id) ?? -Infinity) || byName(a, b),
		progress: (a, b) => b.progress.ratio - a.progress.ratio || b.progress.found - a.progress.found || byName(a, b),
		alpha: byName
	};
	return [...items].sort(compare[order]);
}

export interface BonusSummary {
	total: number;
	/** Some regions found, not all. */
	started: number;
	finished: number;
	unstarted: number;
}

export function bonusSummary(progress: Pick<CollectionProgress, 'found' | 'total'>[]): BonusSummary {
	const finished = progress.filter((p) => p.total > 0 && p.found === p.total).length;
	const unstarted = progress.filter((p) => p.found === 0).length;
	return { total: progress.length, started: progress.length - finished - unstarted, finished, unstarted };
}

/** Number of full-size cards: a whole number between 0 and the number of collections. */
export function clampFullCount(value: unknown, max: number): number {
	const n = Math.round(Number(value));
	return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : Math.min(3, max);
}
