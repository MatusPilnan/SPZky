<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import { t } from '../i18n/i18n.svelte';

	/** How long the purely informational "ready to work offline" message stays. */
	const OFFLINE_READY_MS = 5000;

	const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
		onRegisterError(error) {
			console.error('Service worker registration failed', error);
		}
	});

	// Only the info message auto-closes. "New version available" waits for the user.
	const autoClose = $derived($offlineReady && !$needRefresh);

	function close() {
		offlineReady.set(false);
		needRefresh.set(false);
	}
</script>

{#if $offlineReady || $needRefresh}
	<div class="toast" role="status" class:auto-close={autoClose} style:--duration="{OFFLINE_READY_MS}ms">
		<p>{$needRefresh ? t('pwa.needRefresh') : t('pwa.offlineReady')}</p>
		<div class="actions">
			{#if $needRefresh}
				<button class="btn primary" onclick={() => updateServiceWorker()}>{t('pwa.reload')}</button>
			{/if}
			<button class="btn" onclick={close}>{t('pwa.close')}</button>
		</div>
		{#if autoClose}
			<!-- The bar's animation is the timer: it closes the message when it ends,
			     and pausing it (hover/focus) pauses the countdown too. -->
			<div class="countdown" aria-hidden="true" onanimationend={close}></div>
		{/if}
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		left: 1rem;
		right: 1rem;
		/* Top of the screen, so it never collides with toasts above the nav bar. */
		top: calc(3.5rem + env(safe-area-inset-top));
		z-index: 20;
		margin: 0 auto;
		max-width: 28rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius);
		background: var(--surface);
		border: 1px solid var(--border);
		box-shadow: var(--shadow);
		overflow: hidden;
	}
	p {
		margin: 0 0 0.5rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
	.countdown {
		position: absolute;
		left: 0;
		bottom: 0;
		width: 100%;
		height: 3px;
		background: var(--accent);
		opacity: 0.45;
		transform-origin: left;
		animation: countdown var(--duration) linear forwards;
	}
	.toast:hover .countdown,
	.toast:focus-within .countdown {
		animation-play-state: paused;
	}
	@keyframes countdown {
		from {
			transform: scaleX(1);
		}
		to {
			transform: scaleX(0);
		}
	}
</style>
