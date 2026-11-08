<script lang="ts">
	import { dismissToast, toasts } from '../toast.svelte';
</script>

<div class="toasts" aria-live="polite">
	{#each toasts as toast (toast.id)}
		<div class="toast {toast.kind}">
			<span>{toast.kind === 'celebrate' ? '🎉 ' : ''}{toast.text}</span>
			{#if toast.action}
				<button
					class="action"
					onclick={() => {
						toast.action?.run();
						dismissToast(toast.id);
					}}>{toast.action.label}</button
				>
			{/if}
		</div>
	{/each}
</div>

<style>
	.toasts {
		position: fixed;
		left: 1rem;
		right: 1rem;
		bottom: calc(var(--nav-height) + 0.75rem + env(safe-area-inset-bottom));
		z-index: 30;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		pointer-events: none;
	}
	.toast {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 1rem;
		max-width: 28rem;
		width: 100%;
		padding: 0.65rem 1rem;
		border-radius: var(--radius);
		background: #23262e;
		color: #fff;
		box-shadow: var(--shadow);
		font-weight: 600;
		animation: pop 0.18s ease-out;
	}
	.toast span {
		flex: 1;
	}
	.toast.celebrate {
		background: var(--eu-blue);
		color: #fff;
		border: 2px solid var(--eu-yellow);
	}
	.action {
		border: none;
		background: none;
		color: var(--eu-yellow);
		font: inherit;
		font-weight: 700;
		text-transform: uppercase;
		cursor: pointer;
		padding: 0.25rem;
	}
	@keyframes pop {
		from {
			transform: translateY(8px);
			opacity: 0;
		}
	}
</style>
