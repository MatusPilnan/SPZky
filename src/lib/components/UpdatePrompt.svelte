<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import { t } from '../i18n/i18n.svelte';

	const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
		onRegisterError(error) {
			console.error('Service worker registration failed', error);
		}
	});

	function close() {
		offlineReady.set(false);
		needRefresh.set(false);
	}
</script>

{#if $offlineReady || $needRefresh}
	<div class="toast" role="status">
		<p>{$needRefresh ? t('pwa.needRefresh') : t('pwa.offlineReady')}</p>
		<div class="actions">
			{#if $needRefresh}
				<button class="btn primary" onclick={() => updateServiceWorker()}>{t('pwa.reload')}</button>
			{/if}
			<button class="btn" onclick={close}>{t('pwa.close')}</button>
		</div>
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		left: 1rem;
		right: 1rem;
		bottom: calc(var(--nav-height) + 1rem + env(safe-area-inset-bottom));
		z-index: 20;
		margin: 0 auto;
		max-width: 28rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius);
		background: var(--surface);
		border: 1px solid var(--border);
		box-shadow: var(--shadow);
	}
	p {
		margin: 0 0 0.5rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
</style>
