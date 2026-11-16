import type { GeoPoint } from '../db/types';

/**
 * Fixes this coarse come from "approximate location" (Android reports ±2000 m when the
 * browser only has approximate permission; iPhone with "Precise Location" off is similar).
 * The app can't switch to precise itself, so it tells the user how, and address lookups
 * use only the town.
 */
export const COARSE_ACCURACY_M = 1000;

export function isCoarse(position: GeoPoint | null | undefined): boolean {
	return position?.accuracy != null && position.accuracy >= COARSE_ACCURACY_M;
}
