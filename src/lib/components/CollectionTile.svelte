<script lang="ts">
	// Small square tile for Home: the collection's name, and a donut chart of the share found
	// with the flag and percentage inside. Links to the collection like the full card.
	import { resolve } from '$app/paths';
	import type { CollectionDef } from '../collections';
	import type { CollectionProgress } from '../progress';
	import { t } from '../i18n/i18n.svelte';

	interface Props {
		collection: CollectionDef;
		progress: CollectionProgress;
	}

	let { collection, progress }: Props = $props();
	const name = $derived(t(`collection.${collection.id}`));
	const pct = $derived(Math.round(progress.ratio * 100));
	// The arc uses the exact share, so 1 of 714 still shows a sliver (the text says 0 %).
	const arc = $derived(Math.min(100, Math.max(0, progress.ratio * 100)));
	const done = $derived(progress.total > 0 && progress.found === progress.total);
</script>

<a
	class="tile"
	href="{resolve('/country')}?id={collection.id}"
	aria-label={t('progress.label', { name, found: progress.found, total: progress.total })}
	title={name}
	data-testid="collection-tile"
>
	<span class="name" aria-hidden="true">{name}</span>
	<!-- Two layers in the same cell: the donut, and the text centred on top of it. -->
	<span class="ring" aria-hidden="true">
		<svg class="donut" viewBox="0 0 36 36">
			<circle class="track" cx="18" cy="18" r="15.915" />
			{#if arc > 0}
				<circle class="arc" class:done cx="18" cy="18" r="15.915" stroke-dasharray="{arc} {100 - arc}" />
			{/if}
		</svg>
		<span class="label">
			<span class="flag">{collection.flag}</span>
			<span class="pct">{pct}&nbsp;%</span>
		</span>
	</span>
</a>

<style>
	/*
	 * Square tile: the name on top, the donut in the rest. The donut and the text layer
	 * share one cell, so the text centres on exactly the donut's box (the circle is centred
	 * in that cell too). Text sizes in cqmin (the cell's smaller side) scale with the donut.
	 */
	.tile {
		aspect-ratio: 1;
		min-width: 0;
		display: grid;
		grid-template: auto minmax(0, 1fr) / 100%;
		gap: 0.15rem;
		padding: 0.35rem 0.35rem 0.4rem;
		box-sizing: border-box;
		overflow: hidden;
		container-type: inline-size;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: inherit;
		text-decoration: none;
	}
	.tile:hover,
	.tile:focus-visible {
		border-color: var(--accent);
	}
	/*
	 * Shrinks with the tile so the longest names ("Switzerland", "Švajčiarsko") fit on
	 * narrow phones and with wide fonts (Linux's DejaVu Sans); "…" only as a last resort.
	 */
	.name {
		overflow: hidden;
		font-size: min(0.72rem, 14cqi);
		font-weight: 600;
		line-height: 1.2;
		text-align: center;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ring {
		display: grid;
		grid-template: 100% / 100%;
		min-height: 0;
		container-type: size;
	}
	.donut,
	.label {
		grid-area: 1 / 1;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
	}
	.donut {
		display: block;
		transform: rotate(-90deg);
	}
	circle {
		fill: none;
		stroke-width: 3.6;
	}
	.track {
		stroke: var(--surface-2);
	}
	.arc {
		stroke: var(--accent);
		stroke-linecap: round;
		transition: stroke-dasharray 0.3s ease;
	}
	.arc.done {
		stroke: var(--success);
	}
	.label {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 9cqmin;
		line-height: 1;
		text-align: center;
	}
	/*
	 * Both lines are trimmed to their visible height (cap height to baseline), without the
	 * empty space a line box keeps above and below the letters, so the pair is centred by
	 * what you see. A flag emoji reaches a little beyond its trimmed box, evenly above and
	 * below, hence the larger gap.
	 */
	.flag,
	.pct {
		display: block;
		text-box: trim-both cap alphabetic;
	}
	.flag {
		font-size: 30cqmin;
	}
	.pct {
		font-size: 16cqmin;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	@media (prefers-reduced-motion: reduce) {
		.arc {
			transition: none;
		}
	}
</style>
