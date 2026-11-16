<script lang="ts">
	import { t } from '../i18n/i18n.svelte';
	import { showToast } from '../toast.svelte';
	import { account, cancelConflict, resolveConflict } from '../sync/account.svelte';
	import type { SignInChoice } from '../sync/engine';
	import ExportButton from './ExportButton.svelte';

	let dialog = $state<HTMLDialogElement | null>(null);
	let choice = $state<SignInChoice>('merge');
	let busy = $state(false);

	const open = $derived(account.phase === 'conflict' && account.conflict !== null);

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			choice = 'merge';
			dialog.showModal();
		}
		if (!open && dialog.open) dialog.close();
	});

	const options: { value: SignInChoice; label: 'conflict.merge' | 'conflict.useCloud' | 'conflict.useDevice'; hint: 'conflict.mergeHint' | 'conflict.useCloudHint' | 'conflict.useDeviceHint' }[] = [
		{ value: 'merge', label: 'conflict.merge', hint: 'conflict.mergeHint' },
		{ value: 'cloud', label: 'conflict.useCloud', hint: 'conflict.useCloudHint' },
		{ value: 'device', label: 'conflict.useDevice', hint: 'conflict.useDeviceHint' }
	];

	async function confirmChoice() {
		const c = account.conflict;
		if (!c || busy) return;
		if (choice === 'device' && c.onlyRemote > 0 && !confirm(t('conflict.confirmDevice', { count: c.onlyRemote }))) return;
		busy = true;
		try {
			await resolveConflict(choice);
		} catch {
			showToast({ text: t('account.failed'), kind: 'info' });
		} finally {
			busy = false;
		}
	}

	async function cancel() {
		busy = true;
		try {
			await cancelConflict();
		} finally {
			busy = false;
		}
	}
</script>

<!-- A choice is required: Escape doesn't close it (oncancel), "Cancel sign-in" does. -->
<dialog bind:this={dialog} aria-labelledby="conflict-title" oncancel={(e) => e.preventDefault()} data-testid="conflict">
	{#if account.conflict}
		{@const c = account.conflict}
		<div class="sheet stack">
			<h2 id="conflict-title">{t('conflict.title')}</h2>
			<p>{t('conflict.text')}</p>
			<div class="counts">
				<div class="count">
					<span class="muted">{t('conflict.here')}</span>
					<strong>{c.local}</strong>
					<span class="muted small">{t('conflict.onlyHere', { count: c.onlyLocal })}</span>
				</div>
				<div class="count">
					<span class="muted">{t('conflict.cloud')}</span>
					<strong>{c.remote}</strong>
					<span class="muted small">{t('conflict.onlyCloud', { count: c.onlyRemote })}</span>
				</div>
			</div>
			<div class="export">
				<ExportButton label={t('conflict.export')} />
				<span class="muted small">{t('conflict.exportHint')}</span>
			</div>
			<fieldset class="choices" disabled={busy}>
				{#each options as o (o.value)}
					<label class="choice">
						<input type="radio" name="conflict" value={o.value} checked={choice === o.value} onchange={() => (choice = o.value)} />
						<span><strong>{t(o.label)}</strong><br /><span class="muted">{t(o.hint)}</span></span>
					</label>
				{/each}
			</fieldset>
			<div class="actions">
				<button class="btn primary" type="button" onclick={confirmChoice} disabled={busy}>{t('conflict.continue')}</button>
				<button class="btn" type="button" onclick={cancel} disabled={busy}>{t('conflict.cancel')}</button>
			</div>
		</div>
	{/if}
</dialog>

<style>
	p {
		margin: 0;
	}
	h2 {
		margin: 0;
		font-size: 1.15rem;
	}
	.counts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
	.count {
		display: flex;
		flex-direction: column;
		padding: 0.6rem 0.75rem;
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.count strong {
		font-size: 1.5rem;
	}
	.small {
		font-size: 0.85rem;
	}
	.export {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}
	.choices {
		margin: 0;
		padding: 0;
		border: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.choice {
		display: flex;
		gap: 0.6rem;
		align-items: flex-start;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		cursor: pointer;
	}
	.choice:has(input:checked) {
		border-color: var(--accent);
	}
	.choice input {
		min-height: auto;
		margin-top: 0.3rem;
		accent-color: var(--accent);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	dialog {
		width: 100%;
		max-width: 32rem;
		max-height: 90dvh;
		margin: auto auto 0;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius) var(--radius) 0 0;
		background: var(--bg);
		color: var(--text);
		box-shadow: var(--shadow);
	}
	@media (min-width: 40rem) {
		dialog {
			margin: auto;
			border-radius: var(--radius);
		}
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 0.45);
	}
	.sheet {
		padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
	}
</style>
