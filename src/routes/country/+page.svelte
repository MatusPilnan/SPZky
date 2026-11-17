<script lang="ts">
	import { liveQuery } from 'dexie';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { listSightings } from '#lib/db/sightings.js';
	import { getCollection, getRegion } from '#lib/collections.js';
	import type { NationwideFormat } from '#lib/plates/detect.js';
	import { collectionProgress, countByRegion, countNationwide, regionStats } from '#lib/progress.js';
	import { formatDateTime, t } from '#lib/i18n/i18n.svelte.js';
	import { closeOnBackdrop } from '#lib/dialog.js';
	import ProgressBar from '#lib/components/ProgressBar.svelte';
	import RegionGrid from '#lib/components/RegionGrid.svelte';
	import NationwidePicker from '#lib/components/NationwidePicker.svelte';
	import SightingList from '#lib/components/SightingList.svelte';
	import PlateBadge from '#lib/components/PlateBadge.svelte';
	import TypeChip from '#lib/components/TypeChip.svelte';
	import RegionMap from '#lib/components/RegionMap.svelte';
	import { hasMap, loadMap } from '#lib/geo/maps/index.js';

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
		if (collection) loadMap(collection.id).then((m) => (mapCredit = m ? `${m.attribution} (${m.license})` : ''));
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

		{#if collection.id === 'cz-vintage'}
			<!-- What these plates are and why they still count (facts: src/lib/data/cz-vintage.ts). -->
			<section class="card about" data-testid="about">
				<div class="about-head">
					<PlateBadge text="BN 12-34" country="CZ" plain />
					<h2>{t('about.cz-vintage.title')}</h2>
				</div>
				<p>{t('about.cz-vintage.what')}</p>
				<p>{t('about.cz-vintage.valid')}</p>
				<p class="muted">{t('about.cz-vintage.rare')}</p>
				<p class="muted">{t('about.cz-vintage.map')}</p>
			</section>
		{:else if collection.id === 'at-vintage'}
			<!-- Facts: src/lib/data/at.ts (atVintageRegions) -->
			<section class="card about" data-testid="about">
				<div class="about-head">
					<PlateBadge text="W 123.456" country="A" dark />
					<h2>{t('about.at-vintage.title')}</h2>
				</div>
				<p>{t('about.at-vintage.what')}</p>
				<p>{t('about.at-vintage.valid')}</p>
				<p class="muted">{t('about.at-vintage.map')}</p>
			</section>
		{:else if collection.id === 'ua-vintage'}
			<!-- Facts: src/lib/data/ua.ts (uaVintageRegions) -->
			<section class="card about" data-testid="about">
				<div class="about-head">
					<PlateBadge text="123-45 KI" country="UA" plain />
					<h2>{t('about.ua-vintage.title')}</h2>
				</div>
				<p>{t('about.ua-vintage.what')}</p>
				<p>{t('about.ua-vintage.valid')}</p>
			</section>
		{:else if collection.id === 'pl-vintage'}
			<!-- Facts: src/lib/data/pl-vintage.ts -->
			<section class="card about" data-testid="about">
				<div class="about-head">
					<PlateBadge text="KRA 1234" country="PL" dark />
					<h2>{t('about.pl-vintage.title')}</h2>
				</div>
				<p>{t('about.pl-vintage.what')}</p>
				<p>{t('about.pl-vintage.valid')}</p>
				<p class="muted">{t('about.pl-vintage.map')}</p>
			</section>
		{/if}

		{#if hasMap(collection.id)}
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
		{/if}

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
	onclick={closeOnBackdrop}
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
				{@const rare = getRegion(collection.id, detail.code)?.rare}
				{#if rare}
					<p class="rare-note" data-testid="rare-note">
						<span aria-hidden="true">✦</span>
						<span><strong>{t('region.rareNote')}</strong> {t(`rare.${rare}`)}</span>
					</p>
				{/if}
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
	.about p {
		margin: 0.5rem 0 0;
	}
	.about .muted {
		font-size: 0.9rem;
	}
	.about-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.about-head h2 {
		margin: 0;
		font-size: 1.05rem;
	}
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
	/* Why a code is rare: the grid's ✦ marker, explained. */
	.rare-note {
		display: flex;
		gap: 0.5rem;
		margin: 0;
		padding: 0.5rem 0.75rem;
		border-radius: calc(var(--radius) / 2);
		background: color-mix(in srgb, var(--special) 12%, transparent);
		font-size: 0.9rem;
	}
	.rare-note > span:first-child {
		color: var(--special);
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
