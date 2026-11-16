<script lang="ts">
	import { useRegisterSW } from 'virtual:pwa-register/svelte';
	import { t } from '../i18n/i18n.svelte';
	import { closeOnBackdrop } from '../dialog';
	import { fetchChangelog, newerThan, type ChangelogEntry } from '../changelog';

	/** How long the purely informational "ready to work offline" message stays. */
	const OFFLINE_READY_MS = 5000;

	const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
		onRegisterError(error) {
			console.error('Service worker registration failed', error);
		}
	});

	let dialog = $state<HTMLDialogElement | null>(null);
	let updating = $state(false);
	/** What the waiting version brings (English, from the deployed changelog.json). */
	let news = $state.raw<ChangelogEntry[]>([]);

	$effect(() => {
		if (!$needRefresh) return;
		let cancelled = false;
		void fetchChangelog(`${__BASE_PATH__}/changelog.json`).then((entries) => {
			if (!cancelled) news = newerThan(entries, __APP_VERSION__);
		});
		return () => {
			cancelled = true;
		};
	});

	// "New version available" is a modal in the middle of the screen; it waits for the user.
	$effect(() => {
		if (!dialog) return;
		if ($needRefresh && !dialog.open) dialog.showModal();
		if (!$needRefresh && dialog.open) dialog.close();
	});

	function later() {
		needRefresh.set(false);
	}

	function update() {
		updating = true;
		void updateServiceWorker();
	}

	function closeOfflineReady() {
		offlineReady.set(false);
	}
</script>

{#if $offlineReady && !$needRefresh}
	<div class="toast" role="status" style:--duration="{OFFLINE_READY_MS}ms">
		<p>{t('pwa.offlineReady')}</p>
		<div class="actions">
			<button class="btn" onclick={closeOfflineReady}>{t('pwa.close')}</button>
		</div>
		<!-- The bar's animation is the timer: it closes the message when it ends,
		     and pausing it (hover/focus) pauses the countdown too. -->
		<div class="countdown" aria-hidden="true" onanimationend={closeOfflineReady}></div>
	</div>
{/if}

<dialog
	bind:this={dialog}
	class="update"
	aria-labelledby="update-title"
	onclose={() => {
		if (!dialog?.open) later();
	}}
	onclick={closeOnBackdrop}
	data-testid="update"
>
	<div class="body">
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M5 21h14" /></svg>
		<h2 id="update-title">{t('pwa.needRefresh')}</h2>
		<p class="muted">{t('pwa.needRefreshHint')}</p>
		{#if news.length > 0}
			<section class="news" lang="en" aria-label={t('pwa.whatsNew')} data-testid="whats-new">
				<h3>{t('pwa.whatsNew')}</h3>
				{#each news as entry (entry.version)}
					{#if news.length > 1}<h4>{entry.version}</h4>{/if}
					<ul>
						{#each entry.items as item, i (i)}
							<li>{item}</li>
						{/each}
					</ul>
				{/each}
			</section>
		{/if}
		<div class="buttons">
			<button class="btn primary" onclick={update} disabled={updating}>{t('pwa.reload')}</button>
			<button class="btn" onclick={() => dialog?.close()}>{t('pwa.later')}</button>
		</div>
	</div>
</dialog>

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
	.toast p {
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

	/* Centred modal over a darkened screen. */
	.update {
		width: calc(100% - 2rem);
		max-width: 22rem;
		margin: auto;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow);
	}
	.update::backdrop {
		background: rgb(0 0 0 / 0.55);
	}
	.body {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 1.25rem 1.25rem;
		text-align: center;
	}
	.body svg {
		width: 2.5rem;
		height: 2.5rem;
		padding: 0.5rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		fill: none;
		stroke: var(--accent);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.body h2 {
		margin: 0.25rem 0 0;
		font-size: 1.15rem;
	}
	.body p {
		margin: 0;
	}
	.news {
		align-self: stretch;
		max-height: 40vh;
		overflow-y: auto;
		margin-top: 0.5rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: calc(var(--radius) / 2);
		text-align: left;
		font-size: 0.9rem;
	}
	.news h3 {
		margin: 0 0 0.25rem;
		font-size: 0.95rem;
	}
	.news h4 {
		margin: 0.5rem 0 0.15rem;
		font-size: 0.85rem;
		color: var(--muted, inherit);
	}
	.news ul {
		margin: 0;
		padding-left: 1.1rem;
	}
	.news li + li {
		margin-top: 0.15rem;
	}
	.buttons {
		display: flex;
		flex-direction: column;
		align-self: stretch;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
</style>
