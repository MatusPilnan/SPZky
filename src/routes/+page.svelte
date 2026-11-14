<script lang="ts">
	import { liveQuery } from 'dexie';
	import { resolve } from '$app/paths';
	import { listSightings } from '#lib/db/sightings.js';
	import { collections, type CollectionDef } from '#lib/collections.js';
	import { collectionProgress, countByRegion, countNationwide } from '#lib/progress.js';
	import { t } from '#lib/i18n/i18n.svelte.js';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import SightingList from '#lib/components/SightingList.svelte';
	import RegionMap from '#lib/components/RegionMap.svelte';

	const sightings = liveQuery(() => listSightings());
	const counts = $derived(countByRegion($sightings ?? []));
	const nationwide = $derived(countNationwide($sightings ?? []));

	const main = collections.filter((c) => !c.bonus);
	const bonus = collections.filter((c) => c.bonus);
</script>

{#snippet collectionCard(c: CollectionDef)}
	{@const p = collectionProgress(c, counts, nationwide)}
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
		<div class="thumb"><RegionMap collection={c} counts={counts.get(c.id)} /></div>
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
		<a class="btn primary" href={resolve('/add')}>{t('home.addCta')}</a>
	</section>

	<section class="stack tight">
		<h2>{t('home.countries')}</h2>
		{#each main as c (c.id)}
			{@render collectionCard(c)}
		{/each}
	</section>

	{#if bonus.length}
		<section class="stack tight">
			<h2>{t('home.bonus')}</h2>
			{#each bonus as c (c.id)}
				{@render collectionCard(c)}
			{/each}
		</section>
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
		font-size: 1.3rem;
	}
	.pct {
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
