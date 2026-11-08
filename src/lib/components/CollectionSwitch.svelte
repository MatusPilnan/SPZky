<script lang="ts">
	import { collections } from '../collections';
	import { t } from '../i18n/i18n.svelte';

	interface Props {
		value: string;
	}

	let { value = $bindable() }: Props = $props();
</script>

<div class="switch" role="radiogroup">
	{#each collections as c (c.id)}
		<button
			type="button"
			role="radio"
			aria-checked={value === c.id}
			class:active={value === c.id}
			onclick={() => (value = c.id)}
		>
			<span aria-hidden="true">{c.flag}</span>
			{t(`collection.${c.id}`)}
		</button>
	{/each}
</div>

<style>
	.switch {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		scrollbar-width: none;
	}
	button {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 2.5rem;
		padding: 0.35rem 0.85rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}
	button.active {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-contrast);
	}
</style>
