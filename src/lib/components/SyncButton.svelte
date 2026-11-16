<script lang="ts">
	import { t } from '../i18n/i18n.svelte';
	import { account, syncConfigured, syncNow } from '../sync/account.svelte';

	/** Shown only when signed in and linked; spins while syncing, says why when it can't sync. */
	const visible = $derived(syncConfigured && account.phase === 'ready');
	const syncing = $derived(account.status === 'syncing');
	const problem = $derived(
		account.status === 'offline' || account.status === 'unavailable' || account.status === 'error'
			? t(`account.status.${account.status}`)
			: null
	);
</script>

{#if visible}
	<div class="sync">
		<button class="btn" type="button" onclick={() => syncNow()} disabled={syncing} data-testid="sync-now">
			<svg class:spin={syncing} viewBox="0 0 24 24" aria-hidden="true">
				<path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9" />
				<path d="M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2" />
			</svg>
			{syncing ? t('account.status.syncing') : t('account.syncNow')}
		</button>
		{#if problem && !syncing}<p class="problem muted" role="status">{problem}</p>{/if}
	</div>
{/if}

<style>
	.sync {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	svg {
		width: 1.15rem;
		height: 1.15rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.spin {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spin {
			animation: none;
		}
	}
	.problem {
		margin: 0;
		font-size: 0.85rem;
	}
</style>
