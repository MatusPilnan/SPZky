<script lang="ts">
	// A sighting's location: an interactive OpenStreetMap street map when online (Leaflet,
	// loaded on demand), otherwise a pin on the app's own region map (works offline).
	import { onDestroy } from 'svelte';
	import type { Map as LeafletMap } from 'leaflet';
	import type { GeoPoint } from '../db/types';
	import { mainCollectionOf } from '../collections';
	import { countryAt } from '../geo/country';
	import { loadMap } from '../geo/maps/index';
	import { metresToMap, projectToMap } from '../geo/maps/project';
	import type { RegionMapData } from '../geo/maps/types';
	import { t } from '../i18n/i18n.svelte';

	let { location }: { location: GeoPoint } = $props();

	let online = $state(typeof navigator === 'undefined' ? true : navigator.onLine);
	/** Tiles failed to load (offline despite navigator.onLine, blocked…): use the pin map. */
	let tilesFailed = $state(false);
	const street = $derived(online && !tilesFailed);

	let container = $state<HTMLDivElement | null>(null);
	let map: LeafletMap | null = null;

	function onOnline() {
		online = true;
		tilesFailed = false;
	}
	function onOffline() {
		online = false;
	}
	$effect(() => {
		addEventListener('online', onOnline);
		addEventListener('offline', onOffline);
		return () => {
			removeEventListener('online', onOnline);
			removeEventListener('offline', onOffline);
		};
	});

	// Street map (re)built whenever it's shown or the location changes.
	$effect(() => {
		const el = container;
		const { lat, lng, accuracy } = location;
		if (!street || !el) return;
		let cancelled = false;
		void (async () => {
			const L = (await import('leaflet')).default;
			await import('leaflet/dist/leaflet.css');
			if (cancelled) return;
			map?.remove();
			const radius = accuracy ?? 30;
			const m = L.map(el, { scrollWheelZoom: false, dragging: false, attributionControl: true });
			// Fit the accuracy circle (bounds computed without the map: layers need a view first).
			m.fitBounds(L.latLng(lat, lng).toBounds(radius * 2), { padding: [16, 16], maxZoom: 17 });
			map = m;
			L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
			})
				// No connection (even if the phone thinks it has one): show the offline pin instead.
				.on('tileerror', () => (tilesFailed = true))
				.addTo(m);
			const accent = getComputedStyle(el).getPropertyValue('--accent').trim() || '#0a47c2';
			L.circle([lat, lng], { radius, color: accent, weight: 1, fillOpacity: 0.12 }).addTo(m);
			L.circleMarker([lat, lng], { radius: 6, color: '#fff', weight: 2, fillColor: accent, fillOpacity: 1 }).addTo(m);
		})();
		return () => {
			cancelled = true;
			map?.remove();
			map = null;
		};
	});
	onDestroy(() => map?.remove());

	// Offline: pin on the map of the country the point is in (SK districts / CZ regions).
	let pinMap = $state.raw<RegionMapData | null>(null);
	$effect(() => {
		if (street) return;
		const country = countryAt(location.lat, location.lng);
		const collection = country ? mainCollectionOf(country) : undefined;
		if (!collection) {
			pinMap = null;
			return;
		}
		void loadMap(collection.id).then((m) => (pinMap = m));
	});
	const pin = $derived(pinMap ? projectToMap(pinMap.projection, location.lat, location.lng) : null);
	const pinRadius = $derived(pinMap && location.accuracy ? metresToMap(pinMap.projection, location.accuracy) : 0);
</script>

{#if street}
	<div class="street" bind:this={container} data-testid="street-map" role="img" aria-label={t('edit.mapLabel')}></div>
{:else if pinMap && pin}
	<figure class="pin" data-testid="pin-map">
		<svg viewBox={pinMap.viewBox} role="img" aria-label={t('edit.mapLabel')}>
			{#each pinMap.shapes as s (s.name)}<path d={s.d} />{/each}
			{#if pinRadius > 6}<circle class="accuracy" cx={pin.x} cy={pin.y} r={pinRadius} />{/if}
			<circle class="halo" cx={pin.x} cy={pin.y} r="30" />
			<circle class="dot" cx={pin.x} cy={pin.y} r="14" />
		</svg>
		<figcaption class="muted">{t('edit.mapOffline')}</figcaption>
	</figure>
{/if}

<style>
	.street {
		height: 13rem;
		border-radius: var(--radius);
		overflow: hidden;
		border: 1px solid var(--border);
		/* Leaflet panes have z-indexes up to 1000; keep them under the app's header and dialogs. */
		isolation: isolate;
		z-index: 0;
	}
	.pin {
		margin: 0;
	}
	.pin svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.pin path {
		fill: var(--surface-2);
		stroke: var(--border);
		stroke-width: 1.5;
	}
	.accuracy {
		fill: color-mix(in srgb, var(--accent) 18%, transparent);
		stroke: var(--accent);
		stroke-width: 1.5;
	}
	.halo {
		fill: color-mix(in srgb, var(--accent) 30%, transparent);
	}
	.dot {
		fill: var(--accent);
		stroke: var(--surface);
		stroke-width: 5;
	}
	figcaption {
		margin-top: 0.25rem;
		font-size: 0.8rem;
	}
</style>
