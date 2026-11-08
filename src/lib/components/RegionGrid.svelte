<script lang="ts">
	import type { CollectionDef } from '../collections';
	import { t } from '../i18n/i18n.svelte';

	interface Props {
		collection: CollectionDef;
		/** regionCode → number of sightings. */
		counts?: Map<string, number>;
		/** Highlighted code (e.g. current selection when editing). */
		selected?: string | null;
		onpick: (code: string) => void;
	}

	let { collection, counts, selected = null, onpick }: Props = $props();

	const sorted = $derived([...collection.regions].sort((a, b) => a.code.localeCompare(b.code)));
	const found = $derived(collection.regions.filter((r) => (counts?.get(r.code) ?? 0) > 0).length);
</script>

<p class="summary muted">{t('grid.found', { found, total: collection.regions.length })}</p>

<div class="grid">
	{#each sorted as region (region.code)}
		{@const count = counts?.get(region.code) ?? 0}
		<button
			type="button"
			class:found={count > 0}
			class:selected={selected === region.code}
			aria-pressed={selected === region.code}
			title={region.name}
			onclick={() => onpick(region.code)}
		>
			<span class="code">{region.code}</span>
			<span class="name">{region.name}</span>
			{#if count > 1}<span class="count">{count}</span>{/if}
		</button>
	{/each}
</div>

<style>
	.summary {
		margin: 0 0 0.5rem;
		font-size: 0.85rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(4.6rem, 1fr));
		gap: 0.4rem;
	}
	button {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 3.6rem;
		padding: 0.3rem 0.2rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		cursor: pointer;
		overflow: hidden;
	}
	button.found {
		background: color-mix(in srgb, var(--success) 18%, var(--surface));
		border-color: color-mix(in srgb, var(--success) 55%, var(--border));
	}
	button.selected {
		outline: 3px solid var(--accent);
		outline-offset: -1px;
	}
	.code {
		font-family: var(--font-plate);
		font-weight: 700;
		font-size: 1.2rem;
		letter-spacing: 0.04em;
		line-height: 1.1;
	}
	.name {
		max-width: 100%;
		font-size: 0.62rem;
		line-height: 1.2;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.count {
		position: absolute;
		top: 2px;
		right: 4px;
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--success);
	}
</style>
