<script lang="ts">
	interface Props {
		/** 0..1 */
		value: number;
		/** Accessible label, e.g. "Slovakia: 12 of 93 regions". */
		label: string;
	}

	let { value, label }: Props = $props();
	const pct = $derived(Math.round(Math.min(1, Math.max(0, value)) * 100));
</script>

<div class="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
	<div class="fill" style:width="{pct}%"></div>
</div>

<style>
	.bar {
		height: 0.6rem;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
	}
	.fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--accent), var(--success));
		transition: width 0.3s ease;
	}
	@media (prefers-reduced-motion: reduce) {
		.fill {
			transition: none;
		}
	}
</style>
