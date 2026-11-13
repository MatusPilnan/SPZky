<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		checked: boolean;
		/** Called after the user flips the switch (also for bound values). */
		onchange?: (checked: boolean) => void;
		disabled?: boolean;
		children: Snippet;
	}

	let { checked = $bindable(), onchange, disabled = false, children }: Props = $props();
</script>

<!-- A native checkbox with role="switch": keyboard, screen readers and forms keep
     working; only the look is a sliding toggle. -->
<label class="switch" class:disabled>
	<span class="text">{@render children()}</span>
	<input
		type="checkbox"
		role="switch"
		bind:checked
		{disabled}
		onchange={(e) => onchange?.(e.currentTarget.checked)}
	/>
</label>

<style>
	.switch {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 2.75rem;
		font-weight: 600;
		cursor: pointer;
	}
	.switch.disabled {
		opacity: 0.5;
		cursor: default;
	}
	.text {
		flex: 1;
	}
	input {
		appearance: none;
		flex: none;
		position: relative;
		width: 3.1rem;
		height: 1.8rem;
		min-height: 0;
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 999px;
		/* Off state must stay visible on cards in both light and dark theme. */
		background: color-mix(in srgb, var(--text-muted) 55%, var(--surface));
		cursor: inherit;
		transition: background-color 0.18s ease;
	}
	input::after {
		content: '';
		position: absolute;
		top: 0.2rem;
		left: 0.2rem;
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
		transition: transform 0.18s ease;
	}
	input:checked {
		background: var(--accent);
	}
	input:checked::after {
		transform: translateX(1.3rem);
	}
	input:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	@media (prefers-reduced-motion: reduce) {
		input,
		input::after {
			transition: none;
		}
	}
</style>
