<script lang="ts">
	import type { CollectionDef } from '../collections';
	import { areaStatus, codesOfArea, loadMap, type RegionMapData } from '../geo/maps';
	import { t } from '../i18n/i18n.svelte';

	interface Props {
		collection: CollectionDef;
		/** regionCode → number of sightings. */
		counts?: Map<string, number>;
		/** Codes to outline (current selection). */
		selectedCodes?: string[];
		/** Tappable areas (country screen) or a plain picture (home cards). */
		interactive?: boolean;
		onpick?: (area: { name: string; codes: string[] }) => void;
	}

	let { collection, counts, selectedCodes = [], interactive = false, onpick }: Props = $props();

	let map = $state.raw<RegionMapData | null>(null);
	$effect(() => {
		const id = collection.id;
		let cancelled = false;
		loadMap(id).then((m) => {
			if (!cancelled) map = m;
		});
		return () => {
			cancelled = true;
		};
	});

	const areas = $derived(
		(map?.shapes ?? []).map((s) => {
			const codes = codesOfArea(collection, s.name);
			const found = codes.filter((c) => (counts?.get(c) ?? 0) > 0).length;
			return { ...s, codes, found, status: areaStatus(codes, counts) };
		})
	);
	const selected = $derived(areas.filter((a) => a.codes.some((c) => selectedCodes.includes(c))));

	function pick(a: (typeof areas)[number]) {
		onpick?.({ name: a.name, codes: a.codes });
	}
</script>

{#if map}
	<svg
		viewBox={map.viewBox}
		class="map"
		class:interactive
		role={interactive ? 'group' : 'img'}
		aria-label={t('map.label', { name: t(`collection.${collection.id}`) })}
		aria-hidden={interactive ? undefined : 'true'}
	>
		{#each areas as a (a.name)}
			{#if interactive}
				<path
					d={a.d}
					class={a.status}
					data-area={a.name}
					role="button"
					tabindex="0"
					aria-label={t('map.area', { name: a.name, found: a.found, total: a.codes.length })}
					onclick={() => pick(a)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							pick(a);
						}
					}}
				><title>{a.name}</title></path>
			{:else}
				<path d={a.d} class={a.status} />
			{/if}
		{/each}
		<!-- Selection outlines on top, so neighbouring areas don't cover them. -->
		{#each selected as a (a.name)}
			<path d={a.d} class="outline" />
		{/each}
	</svg>
{:else}
	<div class="placeholder" aria-hidden="true"></div>
{/if}

<style>
	.map {
		display: block;
		width: 100%;
		height: auto;
	}
	path {
		stroke: var(--bg);
		stroke-width: 1;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
	.missing {
		fill: var(--surface-2);
	}
	.partial {
		fill: color-mix(in srgb, var(--success) 40%, var(--surface-2));
	}
	.found {
		fill: color-mix(in srgb, var(--success) 80%, var(--surface));
	}
	.interactive path:not(.outline) {
		cursor: pointer;
	}
	.interactive path:not(.outline):hover {
		filter: brightness(1.15);
	}
	.interactive path:focus-visible {
		outline: none;
		stroke: var(--accent);
		stroke-width: 2.5;
	}
	.outline {
		fill: none;
		stroke: var(--accent);
		stroke-width: 2.5;
		pointer-events: none;
	}
	.placeholder {
		aspect-ratio: 2 / 1;
		border-radius: 8px;
		background: var(--surface-2);
	}
</style>
