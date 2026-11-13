// Per-device preferences, persisted in localStorage.

const STORAGE_KEY = 'spz-ky.prefs';

interface Prefs {
	/** Attach the device location to new sightings. */
	saveLocation: boolean;
	/** Go back to the home screen after a sighting has been saved. */
	returnHomeAfterAdd: boolean;
	/** Last used tab on the Add screen. */
	addMode: 'plate' | 'quick';
	/** Last collection picked in quick mode. */
	quickCollection: string;
}

const defaults: Prefs = {
	saveLocation: false,
	returnHomeAfterAdd: false,
	addMode: 'plate',
	quickCollection: 'sk'
};

function load(): Prefs {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return { ...defaults, ...JSON.parse(raw) };
	} catch {
		// unavailable or corrupt → defaults
	}
	return { ...defaults };
}

export const prefs: Prefs = $state(typeof localStorage === 'undefined' ? { ...defaults } : load());

$effect.root(() => {
	$effect(() => {
		const snapshot = JSON.stringify(prefs);
		try {
			localStorage.setItem(STORAGE_KEY, snapshot);
		} catch {
			// ignore
		}
	});
});
