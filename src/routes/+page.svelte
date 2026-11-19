<script lang="ts">
	import { liveQuery } from 'dexie';
	import { resolve } from '$app/paths';
	import { listSightings } from '#lib/db/sightings.js';
	import { collections, type CollectionDef } from '#lib/collections.js';
	import { collectionProgress, countByRegion, countNationwide, type CollectionProgress } from '#lib/progress.js';
	import { i18n, t } from '#lib/i18n/i18n.svelte.js';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import SightingList from '#lib/components/SightingList.svelte';
	import RegionMap from '#lib/components/RegionMap.svelte';
	import CollectionTile from '#lib/components/CollectionTile.svelte';
	import ContinentMaps from '#lib/components/ContinentMaps.svelte';
	import { hasMap } from '#lib/geo/maps/index.js';
	import SyncButton from '#lib/components/SyncButton.svelte';
	import { prefs } from '#lib/prefs.svelte.js';
	import { bonusSummary, clampFullCount, lastSeenByCollection, orderCollections } from '#lib/home.js';

	const sightings = liveQuery(() => listSightings());
	const counts = $derived(countByRegion($sightings ?? []));
	const nationwide = $derived(countNationwide($sightings ?? []));
	const lastSeen = $derived(lastSeenByCollection($sightings ?? []));

	const withProgress = (c: CollectionDef) => ({ c, id: c.id, name: t(`collection.${c.id}`), progress: collectionProgress(c, counts, nationwide) });

	// Countries in the chosen order: the first few as full cards, the rest as small tiles.
	const main = $derived(
		orderCollections(
			collections.filter((c) => !c.bonus).map(withProgress),
			prefs.homeOrder,
			lastSeen,
			i18n.locale
		)
	);
	const fullCount = $derived(clampFullCount(prefs.homeFullCount, main.length));
	// Continent maps: each country coloured by its main collection (bonus ones stay separate).
	const byCountry = $derived(new Map(main.map((m) => [m.c.country as string, { collection: m.c, progress: m.progress }])));
	const bonus = $derived(collections.filter((c) => c.bonus).map(withProgress));
	const bonusStats = $derived(bonusSummary(bonus.map((b) => b.progress)));
</script>

{#snippet collectionCard(c: CollectionDef, p: CollectionProgress)}
	{@const name = t(`collection.${c.id}`)}
	<a class="card collection" href="{resolve('/country')}?id={c.id}">
		<div class="info">
			<div class="title">
				<span class="flag" aria-hidden="true">{c.flag}</span>
				<strong>{name}</strong>
				<span class="pct">{Math.round(p.ratio * 100)} %</span>
			</div>
			<ProgressBar value={p.ratio} label={t('progress.label', { name, found: p.found, total: p.total })} />
			<div class="sub muted">
				<span>{t('progress.found', { found: p.found, total: p.total })}</span>
				{#if p.nationwide > 0}<span>{t('progress.nationwide', { count: p.nationwide })}</span>{/if}
			</div>
		</div>
		{#if hasMap(c.id)}<div class="thumb"><RegionMap collection={c} counts={counts.get(c.id)} /></div>{/if}
	</a>
{/snippet}

<div class="stack">
	<section class="card hero">
		<h1>{t('app.tagline')}</h1>
		{#if $sightings === undefined}
			<p class="muted">…</p>
		{:else if $sightings.length === 0}
			<p class="muted">{t('home.empty')}</p>
		{:else}
			<p class="count">{t('home.total', { count: $sightings.length })}</p>
		{/if}
		<div class="actions">
			<a class="btn primary" href={resolve('/add')}>{t('home.addCta')}</a>
			<SyncButton />
		</div>
	</section>

	<section class="stack tight">
		<h2>{t('home.countries')}</h2>
		{#each main.slice(0, fullCount) as m (m.id)}
			{@render collectionCard(m.c, m.progress)}
		{/each}
		{#if main.length > fullCount}
			<div class="tiles">
				{#each main.slice(fullCount) as m (m.id)}
					<CollectionTile collection={m.c} progress={m.progress} />
				{/each}
			</div>
		{/if}
	</section>

	<ContinentMaps countries={byCountry} />

	{#if bonus.length}
		<details class="bonus stack tight" bind:open={prefs.bonusOpen} data-testid="bonus">
			<summary class="card">
				<h2>{t('home.bonus')} <span class="badge">{bonusStats.total}</span></h2>
				<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
				<span class="bonus-stats muted">
					<span>{t('home.bonusStarted', { count: bonusStats.started })}</span>
					<span>{t('home.bonusFinished', { count: bonusStats.finished })}</span>
					<span>{t('home.bonusUnstarted', { count: bonusStats.unstarted })}</span>
				</span>
			</summary>
			{#each bonus as b (b.id)}
				{@render collectionCard(b.c, b.progress)}
			{/each}
		</details>
	{/if}

	{#if $sightings && $sightings.length > 0}
		<section class="stack tight">
			<div class="row">
				<h2>{t('home.recent')}</h2>
				<a href={resolve('/history')}>{t('home.seeAll')}</a>
			</div>
			<SightingList sightings={$sightings.slice(0, 3)} />
		</section>
	{/if}
</div>

<style>
	.hero {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
	}
	.hero h1 {
		font-size: 1.35rem;
	}
	.hero p {
		margin: 0 0 0.5rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0.5rem;
	}
	.count {
		font-size: 1.1rem;
		font-weight: 600;
	}
	h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.tight {
		gap: 0.5rem;
	}
	.collection {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		color: inherit;
		text-decoration: none;
	}
	.info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.thumb {
		flex: none;
		width: 6.5rem;
	}
	.title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.05rem;
	}
	.flag {
		flex: none;
		font-size: 1.3rem;
	}
	/* A long name ("Ukrajina (1995–2004)") wraps; the percentage stays on one line. */
	.title strong {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.pct {
		flex: none;
		white-space: nowrap;
		margin-left: auto;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.sub {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.25rem 1rem;
		font-size: 0.85rem;
	}
	.tiles {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.75rem, 1fr));
		gap: 0.5rem;
	}
	/* Title + count, chevron on the right, the three counts below. */
	.bonus summary {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 0.35rem 0.5rem;
		cursor: pointer;
		list-style: none;
	}
	.bonus summary::-webkit-details-marker {
		display: none;
	}
	.bonus summary h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.badge {
		min-width: 1.6rem;
		padding: 0.05rem 0.45rem;
		border-radius: 999px;
		background: var(--surface-2);
		font-size: 0.85rem;
		font-weight: 700;
		text-align: center;
	}
	.chevron {
		width: 1.25rem;
		height: 1.25rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: transform 0.2s ease;
	}
	.bonus[open] .chevron {
		transform: rotate(180deg);
	}
	.bonus-stats {
		grid-column: 1 / -1;
		display: flex;
		flex-wrap: wrap;
		gap: 0.15rem 1rem;
		font-size: 0.85rem;
	}
	@media (prefers-reduced-motion: reduce) {
		.chevron {
			transition: none;
		}
	}
	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.row a {
		font-weight: 600;
		font-size: 0.9rem;
	}
</style>
