<script lang="ts">
	import { highlightOf, type CollectionDef } from '../collections';
	import type { NationwideFormat } from '../plates/detect';
	import { t } from '../i18n/i18n.svelte';

	interface Props {
		collection: CollectionDef;
		/** plate type → number of nationwide sightings. */
		counts?: Map<string, number>;
		selected?: NationwideFormat | null;
		onpick: (type: NationwideFormat) => void;
	}

	let { collection, counts, selected = null, onpick }: Props = $props();
	const total = $derived(collection.nationwideTypes.reduce((sum, type) => sum + (counts?.get(type) ?? 0), 0));
</script>

{#if collection.nationwideTypes.length > 0}
	<section class="nationwide">
		<div class="head">
			<h3>{t('nationwide.title')}</h3>
			<span class="muted total">{t('nationwide.count', { count: total })}</span>
		</div>
		<p class="muted hint">{t('nationwide.hint')}</p>
		<div class="types">
			{#each collection.nationwideTypes as type (type)}
				{@const count = counts?.get(type) ?? 0}
				{@const kind = highlightOf(type)}
				<button
					type="button"
					class="type {kind ?? ''}"
					class:selected={selected === type}
					aria-pressed={selected === type}
					onclick={() => onpick(type)}
				>
					<span class="icon" aria-hidden="true">{kind === 'ev' ? '⚡' : kind === 'special' ? '★' : '🌐'}</span>
					<span class="label">{t(`nationwideType.${type}`)}</span>
					{#if count > 0}<span class="count">{count}</span>{/if}
				</button>
			{/each}
		</div>
	</section>
{/if}

<style>
	.nationwide {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px dashed var(--border);
	}
	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}
	h3 {
		margin: 0;
		font-size: 1rem;
	}
	.total {
		font-size: 0.85rem;
	}
	.hint {
		margin: 0.15rem 0 0.5rem;
		font-size: 0.8rem;
	}
	.types {
		display: grid;
		/* Wide enough for the longest labels ("Personalizovaná" + icon + count); on narrow
		   phones the tiles stack one per row instead of breaking words. */
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 11rem), 1fr));
		gap: 0.4rem;
	}
	.type {
		position: relative;
		/* Allow the tile to be narrower than its longest word (e.g. "Personalizovaná"). */
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 3rem;
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
	}
	.type.ev {
		border-color: color-mix(in srgb, var(--ev) 55%, var(--border));
		background: color-mix(in srgb, var(--ev) 10%, var(--surface));
	}
	.type.special {
		border-color: color-mix(in srgb, var(--special) 50%, var(--border));
		background: color-mix(in srgb, var(--special) 9%, var(--surface));
	}
	.type.selected {
		outline: 3px solid var(--accent);
		outline-offset: -1px;
	}
	.icon {
		flex: none;
		font-size: 1.1rem;
	}
	.label {
		flex: 1;
		min-width: 0;
		line-height: 1.2;
		/* Last resort for very narrow screens: hyphenate by the page language, else break. */
		hyphens: auto;
		overflow-wrap: break-word;
	}
	.count {
		flex: none;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-muted);
	}
</style>
