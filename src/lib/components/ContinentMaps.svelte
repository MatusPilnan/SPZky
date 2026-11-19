<script lang="ts">
	// Home: a carousel of continent maps (only continents with a tracked country). Tracked
	// countries are coloured by the share found in their main collection and open it on tap;
	// other land is hatched as "not tracked".
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import type { CollectionDef } from '../collections';
	import type { CollectionProgress } from '../progress';
	import { loadContinents, type ContinentMapData } from '../geo/maps/index';
	import { navigate } from '../nav';
	import { t } from '../i18n/i18n.svelte';

	interface Props {
		/** Main collection and its progress per country code (e.g. "SK"). */
		countries: Map<string, { collection: CollectionDef; progress: CollectionProgress }>;
	}

	let { countries }: Props = $props();
	let continents = $state.raw<ContinentMapData[]>([]);
	let track = $state<HTMLDivElement | null>(null);
	let current = $state(0);

	onMount(() => {
		void loadContinents().then((c) => (continents = c));
	});

	/** Same green as the region maps: 0 % = empty, any find visible, 100 % = full. */
	function fill(ratio: number): string {
		return ratio > 0 ? `color-mix(in srgb, var(--success) ${Math.round(20 + 60 * ratio)}%, var(--surface-2))` : 'var(--surface-2)';
	}

	function open(code: string) {
		const entry = countries.get(code);
		if (entry) void navigate(`${resolve('/country')}?id=${entry.collection.id}`);
	}

	function onScroll() {
		if (track) current = Math.round(track.scrollLeft / track.clientWidth);
	}

	function show(i: number) {
		track?.children[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
	}
</script>

{#if continents.length > 0}
	<section class="continents" aria-label={t('continent.title')} data-testid="continents">
		<div class="track" bind:this={track} onscroll={onScroll}>
			{#each continents as continent (continent.id)}
				<figure class="card slide" data-continent={continent.id}>
					<figcaption><h2>{t(`continent.${continent.id}`)}</h2></figcaption>
					<svg class="map" viewBox={continent.viewBox}>
						<defs>
							<pattern id="hatch-{continent.id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
								<line x1="0" y1="0" x2="0" y2="6" class="hatch-line" />
							</pattern>
						</defs>
						<rect class="sea" width="100%" height="100%" />
						<!-- Untracked land: a solid fill with hatching on top. -->
						<path class="land" d={continent.land} />
						<path class="land-hatch" d={continent.land} fill="url(#hatch-{continent.id})" />
						{#each continent.countries as c (c.code)}
							{@const entry = countries.get(c.code)}
							{#if entry}
								{@const name = t(`collection.${entry.collection.id}`)}
								{@const pct = Math.round(entry.progress.ratio * 100)}
								<path
									class="country"
									class:started={entry.progress.found > 0}
									d={c.d}
									style:fill={fill(entry.progress.ratio)}
									role="link"
									tabindex="0"
									aria-label="{name}: {pct} %"
									data-code={c.code}
									onclick={() => open(c.code)}
									onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open(c.code))}
								>
									<title>{name}: {pct} %</title>
								</path>
							{/if}
						{/each}
					</svg>
					<div class="legend muted" aria-hidden="true">
						<span class="scale"><span>0 %</span><span class="gradient"></span><span>100 %</span></span>
						<span class="untracked"><span class="swatch"></span>{t('continent.notTracked')}</span>
					</div>
				</figure>
			{/each}
		</div>
		{#if continents.length > 1}
			<div class="dots">
				{#each continents as continent, i (continent.id)}
					<button
						class="dot"
						class:active={i === current}
						aria-label={t(`continent.${continent.id}`)}
						aria-current={i === current}
						onclick={() => show(i)}
					></button>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	.continents {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	/* One continent per "page", swiped sideways. */
	.track {
		display: flex;
		gap: 0.75rem;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
	}
	.track::-webkit-scrollbar {
		display: none;
	}
	.slide {
		flex: 0 0 100%;
		margin: 0;
		scroll-snap-align: start;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		box-sizing: border-box;
	}
	h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.map {
		display: block;
		width: 100%;
		height: auto;
		border-radius: calc(var(--radius) / 2);
	}
	/* Three levels: sea (faint blue), untracked land (hatched), tracked countries (solid). */
	.sea {
		fill: color-mix(in srgb, var(--accent) 9%, var(--surface));
	}
	.land {
		fill: var(--surface);
	}
	.land-hatch {
		stroke: none;
	}
	path {
		stroke: var(--bg);
		stroke-width: 0.8;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
	.hatch-line {
		stroke: var(--border);
		stroke-width: 2;
	}
	/* Tracked but nothing found yet: a solid, outlined shape (vs hatched untracked land). */
	.country {
		stroke: var(--text-muted);
		cursor: pointer;
		outline: none;
	}
	.country:hover,
	.country:focus-visible {
		stroke: var(--accent);
		stroke-width: 2.5;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.25rem 1rem;
		font-size: 0.8rem;
	}
	.scale,
	.untracked {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	.gradient {
		width: 4.5rem;
		height: 0.6rem;
		border-radius: 999px;
		background: linear-gradient(
			90deg,
			var(--surface-2),
			color-mix(in srgb, var(--success) 20%, var(--surface-2)),
			color-mix(in srgb, var(--success) 80%, var(--surface-2))
		);
		border: 1px solid var(--text-muted);
	}
	.swatch {
		width: 0.9rem;
		height: 0.9rem;
		border-radius: 3px;
		background: repeating-linear-gradient(45deg, var(--border) 0 2px, var(--surface) 2px 5px);
		outline: 1px solid var(--border);
	}
	.dots {
		display: flex;
		justify-content: center;
		gap: 0.4rem;
	}
	.dot {
		width: 0.55rem;
		height: 0.55rem;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: var(--border);
	}
	.dot.active {
		background: var(--accent);
	}
</style>
