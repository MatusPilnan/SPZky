<script lang="ts">
	import { liveQuery } from 'dexie';
	import { resolve } from '$app/paths';
	import { db } from '#lib/db/db.js';
	import { t } from '#lib/i18n/i18n.svelte.js';

	const total = liveQuery(() => db.sightings.filter((s) => s.deleted === 0).count());
</script>

<div class="stack">
	<section class="card hero">
		<h1>{t('app.tagline')}</h1>
		{#if $total === undefined}
			<p class="muted">…</p>
		{:else if $total === 0}
			<p class="muted">{t('home.empty')}</p>
		{:else}
			<p class="count">{t('home.total', { count: $total })}</p>
		{/if}
		<a class="btn primary" href={resolve('/add')}>{t('home.addCta')}</a>
	</section>

	<p class="muted">{t('home.collectionsSoon')}</p>
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
	.count {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}
	.hero p {
		margin: 0 0 0.5rem;
	}
</style>
