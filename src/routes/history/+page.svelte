<script lang="ts">
	import { liveQuery } from 'dexie';
	import { listSightings, deleteSighting } from '#lib/db/sightings.js';
	import { getCollection } from '#lib/collections.js';
	import { formatDateTime, t } from '#lib/i18n/i18n.svelte.js';
	import PlateBadge from '#lib/components/PlateBadge.svelte';

	const sightings = liveQuery(() => listSightings());

	async function remove(id: string) {
		if (confirm(t('history.confirmDelete'))) await deleteSighting(id);
	}
</script>

<h1>{t('history.title')}</h1>

{#if $sightings && $sightings.length === 0}
	<p class="muted">{t('history.empty')}</p>
{:else if $sightings}
	<ul>
		{#each $sightings as s (s.id)}
			{@const collection = getCollection(s.collectionId)}
			<li class="card">
				<div class="main">
					<PlateBadge
						text={s.plate ?? s.regionCode}
						country={collection?.country ?? '?'}
						muted={s.plate === null}
					/>
					<div class="meta muted">
						{collection?.flag ?? ''}
						{s.regionCode} · {formatDateTime(s.seenAt)}
						{#if s.plate === null}· {t('history.quickEntry')}{/if}
					</div>
				</div>
				<button class="btn danger" onclick={() => remove(s.id)} aria-label={t('history.delete')}>✕</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem;
	}
	.main {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
		font-size: 1.1rem;
	}
	.meta {
		font-size: 0.85rem;
	}
</style>
