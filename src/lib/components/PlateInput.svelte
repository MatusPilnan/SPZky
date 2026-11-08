<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		value: string;
		/** Text in the blue EU band (detected country), empty when unknown. */
		country?: string;
		ref?: HTMLInputElement | null;
	}

	let { value = $bindable(), country = '', ref = $bindable(null), ...rest }: Props = $props();
</script>

<div class="plate">
	<span class="band" aria-hidden="true">
		<svg viewBox="0 0 20 20" class="stars">
			{#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
				<circle cx={10 + 6.5 * Math.cos((i * Math.PI) / 6)} cy={10 + 6.5 * Math.sin((i * Math.PI) / 6)} r="1.1" />
			{/each}
		</svg>
		<span class="cc">{country}</span>
	</span>
	<input
		bind:this={ref}
		bind:value
		autocomplete="off"
		autocapitalize="characters"
		autocorrect="off"
		spellcheck="false"
		{...rest}
	/>
</div>

<style>
	.plate {
		display: flex;
		align-items: stretch;
		height: 4.2rem;
		border: 3px solid #111;
		border-radius: 10px;
		background: #fff;
		overflow: hidden;
		box-shadow: 0 2px 6px rgb(0 0 0 / 0.15);
	}
	.plate:focus-within {
		outline: 3px solid var(--accent);
		outline-offset: 2px;
	}
	.band {
		flex: none;
		width: 2.6rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		padding: 0.35rem 0 0.3rem;
		background: var(--eu-blue);
		color: #fff;
		font-weight: 700;
		font-size: 0.9rem;
	}
	.stars {
		width: 1.6rem;
		height: 1.6rem;
		fill: var(--eu-yellow);
	}
	.cc {
		min-height: 1em;
		line-height: 1;
	}
	input {
		flex: 1;
		min-width: 0;
		min-height: 0;
		border: none;
		border-radius: 0;
		padding: 0 0.75rem;
		background: transparent;
		color: #111;
		font-family: var(--font-plate);
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	input::placeholder {
		color: #c4c7cf;
	}
	input:focus-visible {
		outline: none;
	}
</style>
