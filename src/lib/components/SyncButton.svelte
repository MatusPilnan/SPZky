<script lang="ts">
	import { t } from '../i18n/i18n.svelte';
	import { account, syncConfigured, syncNow } from '../sync/account.svelte';

	/** Shown only when signed in and linked; spins while syncing, says why when it can't sync. */
	const visible = $derived(syncConfigured && account.phase === 'ready');
	const syncing = $derived(account.status === 'syncing');
	const label = $derived(syncing ? t('account.status.syncing') : t('account.syncNow'));
	const problem = $derived(
		account.status === 'offline' || account.status === 'unavailable' || account.status === 'error'
			? t(`account.status.${account.status}`)
			: null
	);
</script>

{#if visible}
	<div class="sync">
		<!-- Icon only on phones; the label stays for screen readers and as a tooltip. -->
		<button
			class="btn"
			type="button"
			onclick={() => syncNow()}
			disabled={syncing}
			aria-label={label}
			title={label}
			data-testid="sync-now"
		>
			<svg class:spin={syncing} viewBox="0 0 24 24" aria-hidden="true">
				<path d="M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9" />
				<path d="M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2" />
			</svg>
			<span class="text" aria-hidden="true">{label}</span>
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
	/* Phones: a round icon button as tall as "Add a plate" next to it. */
	.btn {
		width: 2.75rem;
		padding: 0;
		font-size: 0.9rem;
	}
	.text {
		display: none;
	}
	@media (min-width: 40rem) {
		.btn {
			width: auto;
			padding: 0.35rem 0.9rem;
		}
		.text {
			display: inline;
		}
	}
	svg {
		width: 1.1rem;
		height: 1.1rem;
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
