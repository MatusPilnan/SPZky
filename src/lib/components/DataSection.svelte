<script lang="ts">
	import { BackupError, importBackup, parseBackup, previewImport, type ImportMode, type ImportPreview, type ParsedBackup } from '../backup';
	import { db } from '../db/db';
	import { closeOnBackdrop } from '../dialog';
	import { t } from '../i18n/i18n.svelte';
	import { account } from '../sync/account.svelte';
	import { showToast } from '../toast.svelte';
	import ExportButton from './ExportButton.svelte';

	let fileInput = $state<HTMLInputElement | null>(null);
	let dialog = $state<HTMLDialogElement | null>(null);
	let error = $state<string | null>(null);
	let parsed = $state.raw<ParsedBackup | null>(null);
	let preview = $state<ImportPreview | null>(null);
	let mode = $state<ImportMode>('add');
	let busy = $state(false);

	async function onFile(e: Event & { currentTarget: HTMLInputElement }) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = ''; // the same file can be picked again
		if (!file) return;
		error = null;
		try {
			parsed = parseBackup(await file.text());
			preview = await previewImport(db, parsed);
			mode = 'add';
			dialog?.showModal();
		} catch (err) {
			error = err instanceof BackupError && err.reason === 'newer' ? t('data.newerFile') : t('data.invalidFile');
		}
	}

	async function runImport() {
		if (!parsed || !preview || busy) return;
		if (mode === 'replace' && !confirm(t('data.confirmReplace', { count: preview.local }))) return;
		busy = true;
		try {
			const result = await importBackup(db, parsed, mode);
			dialog?.close();
			showToast({ text: t('data.imported', { count: result.added }), kind: 'success' });
		} catch {
			showToast({ text: t('data.importFailed'), kind: 'info' });
		} finally {
			busy = false;
		}
	}
</script>

<section class="card" data-testid="data">
	<h2>{t('data.title')}</h2>
	<p class="muted small">{t('data.hint')}</p>
	<div class="actions">
		<ExportButton />
		<button class="btn" type="button" onclick={() => fileInput?.click()}>{t('data.import')}</button>
		<input
			bind:this={fileInput}
			class="hidden"
			type="file"
			accept="application/json,.json"
			onchange={onFile}
			aria-label={t('data.import')}
		/>
	</div>
	{#if error}<p class="error" role="alert">{error}</p>{/if}
</section>

<dialog bind:this={dialog} aria-labelledby="import-title" onclose={() => (parsed = null)} onclick={closeOnBackdrop}>
	{#if preview}
		<div class="sheet stack">
			<h2 id="import-title">{t('data.import')}</h2>
			<p>
				{t('data.fileHas', { count: preview.total })}
				{t('data.fresh', { count: preview.fresh })}
				{#if preview.skipped > 0}<br /><span class="muted">{t('data.skipped', { count: preview.skipped })}</span>{/if}
			</p>
			<fieldset class="choices" disabled={busy}>
				<label class="choice">
					<input type="radio" name="import" value="add" checked={mode === 'add'} onchange={() => (mode = 'add')} />
					<span><strong>{t('data.add')}</strong><br /><span class="muted">{t('data.addHint')}</span></span>
				</label>
				<label class="choice">
					<input type="radio" name="import" value="replace" checked={mode === 'replace'} onchange={() => (mode = 'replace')} />
					<span>
						<strong>{t('data.replace')}</strong><br />
						<span class="muted">
							{t('data.replaceHint', { count: preview.local })}
							{#if account.phase === 'ready'}{t('data.replaceHintAccount')}{/if}
						</span>
					</span>
				</label>
			</fieldset>
			<div class="actions">
				<button class="btn primary" type="button" onclick={runImport} disabled={busy}>{t('data.importNow')}</button>
				<button class="btn" type="button" onclick={() => dialog?.close()} disabled={busy}>{t('account.cancel')}</button>
			</div>
		</div>
	{/if}
</dialog>

<style>
	h2 {
		font-size: 1.1rem;
	}
	p {
		margin: 0 0 0.5rem;
	}
	.small {
		font-size: 0.85rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.hidden {
		display: none;
	}
	.error {
		margin-top: 0.5rem;
		color: var(--danger);
		font-weight: 600;
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

	dialog {
		width: 100%;
		max-width: 32rem;
		max-height: 85dvh;
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
	.sheet h2 {
		margin: 0;
	}
</style>
