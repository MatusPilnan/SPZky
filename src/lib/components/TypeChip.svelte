<script lang="ts">
	import { highlightOf } from '../collections';
	import type { PlateFormat } from '../plates/detect';
	import { t } from '../i18n/i18n.svelte';

	interface Props {
		type: PlateFormat | null | undefined;
		/** Also show plain (non-highlighted) types, e.g. "standard since 2023". */
		showPlain?: boolean;
	}

	let { type, showPlain = false }: Props = $props();
	const kind = $derived(highlightOf(type));
</script>

{#if type && (kind || showPlain)}
	<span class="chip {kind ?? 'plain'}">
		{#if kind === 'ev'}<span aria-hidden="true">⚡</span>{:else if kind === 'special'}<span aria-hidden="true">★</span>{/if}
		{t(`format.${type}`)}
	</span>
{/if}

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.05rem 0.5rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1.5;
		white-space: nowrap;
		vertical-align: middle;
	}
	.ev {
		background: color-mix(in srgb, var(--ev) 20%, var(--surface));
		color: var(--ev);
		border: 1px solid color-mix(in srgb, var(--ev) 50%, transparent);
	}
	.special {
		background: color-mix(in srgb, var(--special) 18%, var(--surface));
		color: var(--special);
		border: 1px solid color-mix(in srgb, var(--special) 45%, transparent);
	}
	.plain {
		background: var(--surface-2);
		color: var(--text-muted);
		border: 1px solid var(--border);
	}
</style>
