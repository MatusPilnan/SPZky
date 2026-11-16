<script lang="ts">
	interface Props {
		/** Text on the plate. */
		text: string;
		/** Country code in the blue EU band. */
		country: string;
		/** Dimmed style, e.g. for quick entries showing only a region code. */
		muted?: boolean;
		/** Electric vehicle: green letters (as on Slovak EV plates). */
		ev?: boolean;
		/** Plate from before the EU-style design (e.g. CZ before 2001): no blue band. */
		plain?: boolean;
		/** Old black plate: white characters on black (implies no band). */
		dark?: boolean;
	}

	let { text, country, muted = false, ev = false, plain = false, dark = false }: Props = $props();

	/** Characters that fit the fixed plate width at full size; longer text is scaled down. */
	const FIT_CHARS = 9;
	const scale = $derived(Math.min(1, FIT_CHARS / Math.max(1, [...text].length)));
</script>

<span class="plate" class:muted class:ev class:plain={plain || dark} class:dark>
	{#if !plain && !dark}
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
	{/if}
	<span class="text"><span class="chars" style:font-size={scale < 1 ? `${scale}em` : undefined}>{text}</span></span>
</span>

<style>
	/* All plates have the same size, whatever their text, and never shrink in a row. */
	.plate {
		flex: none;
		display: inline-flex;
		align-items: stretch;
		/* Fixed outer size: plates with and without the EU band line up in lists.
		   Band (~1.1em) + room for 9 characters of the plate font ("BA-123 AB", "ABC 12-34"). */
		width: calc(7.7em + 4px);
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
		flex: none;
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
		justify-content: center;
		flex: 1;
		min-width: 0;
		padding: 0 0.35em;
		overflow: hidden;
		text-transform: uppercase;
	}
	.chars {
		line-height: 1;
	}
	.ev .text {
		color: #0f8a3c; /* plate background is always white */
	}
	/* Pre-2001 CZ plates: black on white, no EU band; a thin inner rim like the pressed edge. */
	.plain {
		box-shadow:
			inset 0 0 0 2px #fff,
			inset 0 0 0 3px #111,
			0 1px 2px rgb(0 0 0 / 0.15);
	}
	/* Old black plates (PL before 2000, AT before 1990): white on black. */
	.dark {
		background: #111;
		color: #f4f4f4;
		box-shadow:
			inset 0 0 0 2px #111,
			inset 0 0 0 3px #f4f4f4,
			0 1px 2px rgb(0 0 0 / 0.15);
	}
	.dark.muted .text {
		color: #bbb;
	}
	.muted .text {
		color: #666;
		font-style: italic;
	}
</style>
