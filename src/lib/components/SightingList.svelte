<script lang="ts">
	import { resolve } from '$app/paths';
	import { getCollection, getRegion, highlightOf } from '../collections';
	import type { Sighting } from '../db/types';
	import type { PlateFormat } from '../plates/detect';
	import { formatDateTime, t } from '../i18n/i18n.svelte';
	import PlateBadge from './PlateBadge.svelte';
	import TypeChip from './TypeChip.svelte';

	interface Props {
		sightings: Sighting[];
		/** Hide the region line (e.g. in a region's own detail view). */
		compact?: boolean;
	}

	let { sightings, compact = false }: Props = $props();

	/** Plate text for quick nationwide entries, which have no plate number. */
	function nationwideSymbol(type: PlateFormat | null): string {
		const kind = highlightOf(type);
		return kind === 'ev' ? '⚡' : kind === 'special' ? '★' : '🌐';
	}
</script>

<ul>
	{#each sightings as s (s.id)}
		{@const collection = getCollection(s.collectionId)}
		<li>
			<a class="card item" class:compact href="{resolve('/sighting')}?id={encodeURIComponent(s.id)}">
				<PlateBadge
					text={s.plate ?? s.regionCode ?? nationwideSymbol(s.plateType)}
					country={collection?.country ?? '?'}
					muted={s.plate === null}
					ev={s.plateType === 'ev'}
				/>
				<div class="meta">
					{#if !compact}
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
					{:else if highlightOf(s.plateType)}
						<span><TypeChip type={s.plateType} /></span>
					{/if}
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
	.item.compact {
		padding: 0.5rem 0.75rem;
		font-size: 0.95rem;
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
