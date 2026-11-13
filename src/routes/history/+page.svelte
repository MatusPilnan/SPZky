<script lang="ts">
	import { liveQuery } from 'dexie';
	import { resolve } from '$app/paths';
	import { listSightings } from '#lib/db/sightings.js';
	import { getCollection, getRegion, highlightOf } from '#lib/collections.js';
	import type { PlateFormat } from '#lib/plates/detect.js';
	import { formatDateTime, t } from '#lib/i18n/i18n.svelte.js';
	import PlateBadge from '#lib/components/PlateBadge.svelte';
	import TypeChip from '#lib/components/TypeChip.svelte';

	const sightings = liveQuery(() => listSightings());

	/** Plate text for quick nationwide entries, which have no plate number. */
	function nationwideSymbol(type: PlateFormat | null): string {
		const kind = highlightOf(type);
		return kind === 'ev' ? '⚡' : kind === 'special' ? '★' : '🌐';
	}
</script>

<h1>{t('history.title')}</h1>

{#if $sightings && $sightings.length === 0}
	<p class="muted">{t('history.empty')}</p>
{:else if $sightings}
	<ul>
		{#each $sightings as s (s.id)}
			{@const collection = getCollection(s.collectionId)}
			<li>
				<a class="card item" href="{resolve('/sighting')}?id={encodeURIComponent(s.id)}">
					<PlateBadge
						text={s.plate ?? s.regionCode ?? nationwideSymbol(s.plateType)}
						country={collection?.country ?? '?'}
						muted={s.plate === null}
						ev={s.plateType === 'ev'}
					/>
					<div class="meta">
						<span>
							{collection?.flag}
							{#if s.regionCode !== null}
								<strong>{s.regionCode}</strong>
								{getRegion(s.collectionId, s.regionCode)?.name ?? ''}
							{:else}
								<strong>{t('nationwide.title')}</strong>
							{/if}
							<TypeChip type={s.plateType} showPlain={s.regionCode === null} />
						</span>
						<span class="muted small">
							{formatDateTime(s.seenAt)}
							{#if s.plate === null}· {t('history.quickEntry')}{/if}
							{#if s.location}· 📍{/if}
						</span>
						{#if s.note}<span class="muted small note">{s.note}</span>{/if}
					</div>
				</a>
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
	.item {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 0.75rem;
		color: inherit;
		text-decoration: none;
		font-size: 1.05rem;
	}
	.meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
		font-size: 0.95rem;
		line-height: 1.35;
	}
	.small {
		font-size: 0.8rem;
	}
	.note {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
