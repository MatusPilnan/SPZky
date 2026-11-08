import type { GeoPoint } from './db/types';

export type LocationStatus = 'idle' | 'waiting' | 'ok' | 'denied' | 'unavailable';

/** Positions older than this are not attached to a sighting. */
const MAX_AGE_MS = 2 * 60 * 1000;

/**
 * Watches the device position while active, so a fresh fix is already
 * available when the user saves (no waiting for GPS at save time).
 */
export class LocationTracker {
	status = $state<LocationStatus>('idle');
	// raw: plain object, not a deep proxy, so it can be stored in IndexedDB as-is.
	position = $state.raw<GeoPoint | null>(null);
	#timestamp = 0;
	#watchId: number | null = null;

	start() {
		if (this.#watchId !== null) return;
		if (!('geolocation' in navigator)) {
			this.status = 'unavailable';
			return;
		}
		this.status = this.position ? 'ok' : 'waiting';
		this.#watchId = navigator.geolocation.watchPosition(
			(pos) => {
				this.position = {
					lat: pos.coords.latitude,
					lng: pos.coords.longitude,
					accuracy: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null
				};
				this.#timestamp = pos.timestamp;
				this.status = 'ok';
			},
			(err) => {
				this.status = err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable';
				if (err.code === err.PERMISSION_DENIED) this.stop();
			},
			{ enableHighAccuracy: true, maximumAge: 30_000, timeout: 30_000 }
		);
	}

	stop() {
		if (this.#watchId !== null) navigator.geolocation.clearWatch(this.#watchId);
		this.#watchId = null;
		if (this.status === 'waiting' || this.status === 'ok') this.status = 'idle';
	}

	/** Current position if it is recent enough to describe "here and now". */
	current(): GeoPoint | null {
		return this.position && Date.now() - this.#timestamp < MAX_AGE_MS ? this.position : null;
	}
}
