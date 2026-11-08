<script lang="ts">
	interface Props {
		/** Text on the plate. */
		text: string;
		/** Country code in the blue EU band. */
		country: string;
		/** Dimmed style, e.g. for quick entries showing only a region code. */
		muted?: boolean;
	}

	let { text, country, muted = false }: Props = $props();
</script>

<span class="plate" class:muted>
	<span class="band" aria-hidden="true">
		<svg viewBox="0 0 20 20" class="stars">
			{#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
				<circle
					cx={10 + 6.5 * Math.cos((i * Math.PI) / 6)}
					cy={10 + 6.5 * Math.sin((i * Math.PI) / 6)}
					r="1.1"
				/>
			{/each}
		</svg>
		<span class="cc">{country}</span>
	</span>
	<span class="text">{text}</span>
</span>

<style>
	.plate {
		display: inline-flex;
		align-items: stretch;
		height: 2.1em;
		border: 2px solid #111;
		border-radius: 6px;
		background: #fff;
		color: #111;
		overflow: hidden;
		font-family: var(--font-plate);
		font-weight: 700;
		letter-spacing: 0.06em;
		white-space: nowrap;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.15);
	}
	.band {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		padding: 0.15em 0.2em 0.1em;
		background: var(--eu-blue);
		color: #fff;
		font-family: var(--font-ui);
		font-size: 0.55em;
		letter-spacing: 0;
	}
	.stars {
		width: 1.6em;
		height: 1.6em;
		fill: var(--eu-yellow);
	}
	.cc {
		line-height: 1;
	}
	.text {
		display: flex;
		align-items: center;
		padding: 0 0.5em;
		text-transform: uppercase;
	}
	.muted .text {
		color: #666;
		font-style: italic;
	}
</style>
