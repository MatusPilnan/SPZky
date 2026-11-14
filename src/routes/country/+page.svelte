<script lang="ts">
	import { liveQuery } from 'dexie';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { listSightings } from '#lib/db/sightings.js';
	import { getCollection, getRegion } from '#lib/collections.js';
	import type { NationwideFormat } from '#lib/plates/detect.js';
	import { collectionProgress, countByRegion, countNationwide, regionStats } from '#lib/progress.js';
	import { formatDateTime, t } from '#lib/i18n/i18n.svelte.js';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import RegionGrid from '#lib/components/RegionGrid.svelte';
	import NationwidePicker from '#lib/components/NationwidePicker.svelte';
	import SightingList from '#lib/components/SightingList.svelte';
	import TypeChip from '#lib/components/TypeChip.svelte';
	import RegionMap from '#lib/components/RegionMap.svelte';
	import { loadMap } from '#lib/geo/maps/index.js';

	function pickArea(area: { name: string; codes: string[] }) {
		detail = area.codes.length === 1 ? { kind: 'region', code: area.codes[0] } : { kind: 'area', ...area };
	}

	/** Credit for the map data (required by its licence), shown under the map. */
	let mapCredit = $state('');

	// ?id= instead of a dynamic route, so the page is one prerendered (and precached) shell.
	const collection = getCollection(page.url.searchParams.get('id') ?? '');

	const sightings = liveQuery(() => listSightings());
	const counts = $derived(countByRegion($sightings ?? []));
	const nationwide = $derived(countNationwide($sightings ?? []));
	const progress = $derived(collection ? collectionProgress(collection, counts, nationwide) : null);
	const stats = $derived(collection ? regionStats($sightings ?? [], collection.id) : new Map());

	let filter = $state<'all' | 'found' | 'missing'>('all');

	/**
	 * What the detail sheet shows: one region code, one map area with several codes
	 * (e.g. Bratislava I: BA/BL/BT), or one nationwide plate type.
	 */
	let detail = $state<
		| { kind: 'region'; code: string }
		| { kind: 'area'; name: string; codes: string[] }
		| { kind: 'nationwide'; type: NationwideFormat }
		| null
	>(null);

	const selectedCodes = $derived(
		detail?.kind === 'region' ? [detail.code] : detail?.kind === 'area' ? detail.codes : []
	);
	let dialog = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialog) return;
		if (detail && !dialog.open) dialog.showModal();
		if (!detail && dialog.open) dialog.close();
	});

	const detailSightings = $derived.by(() => {
		if (!detail || !collection || !$sightings) return [];
		const d = detail;
		return $sightings.filter(
			(s) =>
				s.collectionId === collection.id &&
				(d.kind === 'region'
					? s.regionCode === d.code
					: d.kind === 'area'
						? s.regionCode !== null && d.codes.includes(s.regionCode)
						: s.regionCode === null && s.plateType === d.type)
		);
	});
	const detailStats = $derived(detail?.kind === 'region' ? stats.get(detail.code) : undefined);

	/** All sightings of this collection (regional and nationwide), newest first. */
	const collectionSightings = $derived(
		collection ? ($sightings ?? []).filter((s) => s.collectionId === collection.id) : []
	);

	$effect(() => {
		if (collection) loadMap(collection.id).then((m) => (mapCredit = `${m.attribution} (${m.license})`));
	});

	const filters = ['all', 'found', 'missing'] as const;
	const filterLabel = { all: 'country.filterAll', found: 'country.filterFound', missing: 'country.filterMissing' } as const;
	const emptyFiltered = $derived(
		progress && ((filter === 'found' && progress.found === 0) || (filter === 'missing' && progress.found === progress.total))
	);
</script>

<div class="stack">
	<a class="back" href={resolve('/')}>← {t('nav.home')}</a>

	{#if !collection || !progress}
		<p class="muted">{t('country.notFound')}</p>
	{:else}
		{@const name = t(`collection.${collection.id}`)}
		<header class="card stack tight">
			<h1><span aria-hidden="true">{collection.flag}</span> {name}</h1>
			<ProgressBar value={progress.ratio} label={t('progress.label', { name, found: progress.found, total: progress.total })} />
			<div class="sub">
				<strong>{t('progress.found', { found: progress.found, total: progress.total })}</strong>
				<span class="pct">{Math.round(progress.ratio * 100)} %</span>
			</div>
		</header>

		<section class="card map-card">
			<RegionMap
				{collection}
				counts={counts.get(collection.id)}
				{selectedCodes}
				interactive
				onpick={pickArea}
			/>
			{#if mapCredit}<p class="credit muted">{t('map.credit', { source: mapCredit })}</p>{/if}
		</section>

		<section class="card">
			<div class="filters" role="tablist">
				{#each filters as f (f)}
					<button role="tab" aria-selected={filter === f} class:active={filter === f} onclick={() => (filter = f)}>
						{t(filterLabel[f])}
					</button>
				{/each}
			</div>
			{#if emptyFiltered}
				<p class="muted empty">{filter === 'found' ? t('country.noneFound') : t('country.allFound')}</p>
			{:else}
				<RegionGrid
					{collection}
					counts={counts.get(collection.id)}
					{filter}
					showSummary={false}
					selected={detail?.kind === 'region' ? detail.code : null}
					onpick={(code) => (detail = { kind: 'region', code })}
				/>
			{/if}
			<NationwidePicker
				{collection}
				counts={nationwide.get(collection.id)}
				onpick={(type) => (detail = { kind: 'nationwide', type })}
			/>
		</section>

		<details class="card history">
			<summary>
				<span>{t('country.history')}</span>
				<span class="badge">{collectionSightings.length}</span>
			</summary>
			{#if collectionSightings.length}
				<div class="history-list">
					<SightingList sightings={collectionSightings} />
				</div>
			{:else}
				<p class="muted">{t('history.empty')}</p>
			{/if}
		</details>
	{/if}
</div>

<!-- The close event is dispatched asynchronously: if another sheet was opened in the
     meantime (quick taps), a stale event must not close it again. -->
<dialog
	bind:this={dialog}
	onclose={() => {
		if (!dialog?.open) detail = null;
	}}
	aria-labelledby="detail-title"
>
	{#if detail && collection}
		<div class="sheet stack tight">
			<div class="sheet-head">
				{#if detail.kind === 'region'}
					<h2 id="detail-title">
						<span class="code">{detail.code}</span>
						{getRegion(collection.id, detail.code)?.name}
					</h2>
				{:else if detail.kind === 'area'}
					<h2 id="detail-title">{detail.name}</h2>
				{:else}
					<h2 id="detail-title">{t('nationwide.title')} <TypeChip type={detail.type} showPlain /></h2>
				{/if}
				<button class="btn" onclick={() => (detail = null)}>{t('region.close')}</button>
			</div>

			{#if detail.kind === 'region'}
				{#if detailStats}
					<p class="muted">
						{t('region.seen', { count: detailStats.count })} ·
						{t('region.firstSeen', { date: formatDateTime(detailStats.firstSeenAt) })}
						{#if detailStats.count > 1}· {t('region.lastSeen', { date: formatDateTime(detailStats.lastSeenAt) })}{/if}
					</p>
				{:else}
					<p class="muted">{t('region.notSeen')}</p>
				{/if}
			{:else if detail.kind === 'area'}
				<!-- Several codes share this area: show each, tap one for its own details. -->
				<div class="area-codes">
					{#each detail.codes as code (code)}
						{@const s = stats.get(code)}
						<button class="area-code" class:seen={!!s} onclick={() => (detail = { kind: 'region', code })}>
							<span class="code">{code}</span>
							<small>{s ? t('region.seen', { count: s.count }) : t('region.notSeen')}</small>
						</button>
					{/each}
				</div>
			{:else}
				<p class="muted">{t('nationwide.hint')}</p>
			{/if}

			{#if detailSightings.length}
				<div class="list">
					<SightingList sightings={detailSightings} compact={detail.kind !== 'area'} />
				</div>
			{/if}
		</div>
	{/if}
</dialog>

<style>
	.back {
		align-self: flex-start;
		text-decoration: none;
		font-weight: 600;
	}
	h1 {
		margin: 0;
		font-size: 1.5rem;
	}
	.tight {
		gap: 0.5rem;
	}
	.sub {
		display: flex;
		justify-content: space-between;
	}
	.pct {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.filters {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		margin-bottom: 0.75rem;
		padding: 0.2rem;
		border-radius: 999px;
		background: var(--surface-2);
	}
	.filters button {
		min-height: 2.25rem;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--text-muted);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 700;
		cursor: pointer;
	}
	.filters button.active {
		background: var(--surface);
		color: var(--text);
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.15);
	}
	.empty {
		margin: 0.5rem 0;
		text-align: center;
	}
	.map-card {
		padding: 0.75rem;
	}
	.credit {
		margin: 0.4rem 0 0;
		font-size: 0.7rem;
		text-align: right;
	}
	.area-codes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.area-code {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 5.5rem;
		padding: 0.35rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface);
		color: var(--text-muted);
		font: inherit;
		cursor: pointer;
	}
	.area-code.seen {
		border-color: color-mix(in srgb, var(--success) 55%, var(--border));
		background: color-mix(in srgb, var(--success) 18%, var(--surface));
		color: var(--text);
	}
	.area-code .code {
		font-family: var(--font-plate);
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--text);
	}
	.history summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
		cursor: pointer;
		list-style: none;
	}
	.history summary::-webkit-details-marker {
		display: none;
	}
	/* Chevron that turns when the section opens. */
	.history summary::before {
		content: '';
		width: 0.5rem;
		height: 0.5rem;
		border-right: 2px solid currentColor;
		border-bottom: 2px solid currentColor;
		transform: rotate(-45deg);
		transition: transform 0.15s ease;
	}
	.history[open] summary::before {
		transform: rotate(45deg);
	}
	.badge {
		padding: 0 0.5rem;
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--text-muted);
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
	}
	.history-list,
	.history p {
		margin: 0.75rem 0 0;
	}
	@media (prefers-reduced-motion: reduce) {
		.history summary::before {
			transition: none;
		}
	}

	/* Bottom sheet on phones, centred box on wider screens. */
	dialog {
		width: 100%;
		max-width: 32rem;
		max-height: 80dvh;
		margin: auto auto 0;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius) var(--radius) 0 0;
		background: var(--bg);
		color: var(--text);
		box-shadow: var(--shadow);
	}
	@media (min-width: 40rem) {
		dialog {
			margin: auto;
			border-radius: var(--radius);
		}
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 0.45);
	}
	.sheet {
		padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
	}
	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.sheet-head h2 {
		margin: 0;
		font-size: 1.15rem;
	}
	.sheet-head .code {
		font-family: var(--font-plate);
		font-size: 1.5rem;
		margin-right: 0.25rem;
	}
	.sheet p {
		margin: 0;
	}
	.list {
		overflow-y: auto;
	}
</style>
