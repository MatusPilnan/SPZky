<script lang="ts">
	import { closeOnBackdrop } from '../dialog';
	import { formatDateTime, t } from '../i18n/i18n.svelte';
	import { showToast } from '../toast.svelte';
	import { account, deleteCloudData, sendCode, signOut, syncNow, verifyCode } from '../sync/account.svelte';

	// Sign-in form
	let email = $state('');
	let code = $state('');
	let codeSentTo = $state<string | null>(null);
	let busy = $state(false);
	let formError = $state<string | null>(null);

	const emailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
	const codeValid = $derived(/^\d{6}$/.test(code.trim()));

	async function requestCode(e?: Event) {
		e?.preventDefault();
		if (!emailValid || busy) return;
		if (!navigator.onLine) {
			formError = t('account.offline');
			return;
		}
		busy = true;
		formError = null;
		const target = email.trim().toLowerCase();
		try {
			await sendCode(target);
			codeSentTo = target;
			code = '';
		} catch {
			formError = t('account.sendFailed');
		} finally {
			busy = false;
		}
	}

	async function submitCode(e: Event) {
		e.preventDefault();
		if (!codeSentTo || !codeValid || busy) return;
		busy = true;
		formError = null;
		try {
			await verifyCode(codeSentTo, code.trim());
			codeSentTo = null;
			code = '';
		} catch {
			formError = navigator.onLine ? t('account.invalidCode') : t('account.offline');
		} finally {
			busy = false;
		}
	}

	function changeEmail() {
		codeSentTo = null;
		code = '';
		formError = null;
	}

	// Sign-out
	let signOutDialog = $state<HTMLDialogElement | null>(null);
	let keepData = $state(false);

	function openSignOut() {
		keepData = false;
		signOutDialog?.showModal();
	}

	async function confirmSignOut() {
		busy = true;
		try {
			await signOut(keepData);
			signOutDialog?.close();
			showToast({ text: t('account.signedOut'), kind: 'info' });
		} catch {
			// Changes appeared meanwhile; the dialog now shows the blocked state.
		} finally {
			busy = false;
		}
	}

	async function removeCloudData() {
		if (!confirm(t('account.deleteCloudConfirm'))) return;
		busy = true;
		try {
			await deleteCloudData();
			showToast({ text: t('account.deleteCloudDone'), kind: 'info' });
		} catch {
			showToast({ text: t('account.failed'), kind: 'info' });
		} finally {
			busy = false;
		}
	}
</script>

<section class="card account" data-testid="account">
	<h2>{t('settings.account')}</h2>

	{#if account.phase === 'signedOut'}
		<p class="muted">{t('account.intro')}</p>
		{#if !codeSentTo}
			<form class="row" onsubmit={requestCode}>
				<label class="field grow">
					{t('account.email')}
					<input
						type="email"
						name="email"
						autocomplete="email"
						inputmode="email"
						required
						bind:value={email}
						disabled={busy}
					/>
				</label>
				<button class="btn primary" type="submit" disabled={!emailValid || busy}>{t('account.sendCode')}</button>
			</form>
		{:else}
			<p>{t('account.codeSent', { email: codeSentTo })}</p>
			<form class="row" onsubmit={submitCode}>
				<label class="field grow">
					{t('account.code')}
					<input
						class="code"
						name="code"
						autocomplete="one-time-code"
						inputmode="numeric"
						pattern="[0-9]*"
						maxlength="6"
						required
						bind:value={code}
						disabled={busy}
					/>
				</label>
				<button class="btn primary" type="submit" disabled={!codeValid || busy}>{t('account.signIn')}</button>
			</form>
			<div class="actions">
				<button class="btn" type="button" onclick={() => requestCode()} disabled={busy}>{t('account.resend')}</button>
				<button class="btn" type="button" onclick={changeEmail} disabled={busy}>{t('account.changeEmail')}</button>
			</div>
		{/if}
		{#if formError}<p class="error" role="alert">{formError}</p>{/if}
	{:else}
		<p><strong>{t('account.signedInAs', { email: account.email ?? '' })}</strong></p>

		{#if account.phase === 'checking'}
			<p class="status" data-status={account.status}>
				{account.status === 'syncing' ? t('account.checking') : t(`account.status.${account.status}`)}
			</p>
		{:else if account.phase === 'ready'}
			<p class="status" data-status={account.status} role="status">
				{t(`account.status.${account.status}`)}
				{#if account.status === 'error' && account.error}<span class="detail">{account.error}</span>{/if}
			</p>
			{#if account.unsynced > 0}
				<p class="muted">{t('account.unsynced', { count: account.unsynced })}</p>
			{/if}
			{#if account.lastSync}
				<p class="muted small">{t('account.lastSync', { time: formatDateTime(account.lastSync) })}</p>
			{/if}
		{/if}

		<div class="actions">
			{#if account.phase === 'ready'}
				<button class="btn" type="button" onclick={() => syncNow()} disabled={account.status === 'syncing'}>
					{t('account.syncNow')}
				</button>
			{/if}
			<button class="btn" type="button" onclick={openSignOut} disabled={busy}>{t('account.signOut')}</button>
		</div>
		{#if account.phase === 'ready'}
			<button class="btn danger link" type="button" onclick={removeCloudData} disabled={busy}>
				{t('account.deleteCloud')}
			</button>
		{/if}
	{/if}
</section>

<dialog bind:this={signOutDialog} aria-labelledby="signout-title" onclick={closeOnBackdrop}>
	<div class="sheet stack">
		<h2 id="signout-title">{t('account.signOut')}</h2>
		{#if account.unsynced > 0}
			<p>{t('account.signOutBlocked', { count: account.unsynced })}</p>
			<div class="actions">
				<button class="btn primary" type="button" onclick={() => syncNow()} disabled={account.status === 'syncing'}>
					{t('account.syncNow')}
				</button>
				<button class="btn" type="button" onclick={() => signOutDialog?.close()}>{t('account.cancel')}</button>
			</div>
			{#if account.status !== 'idle' && account.status !== 'syncing'}
				<p class="muted small">{t(`account.status.${account.status}`)}</p>
			{/if}
		{:else}
			<p>{t('account.signOutQuestion')}</p>
			<fieldset class="choices">
				<label class="choice">
					<input type="radio" name="signout" value="remove" checked={!keepData} onchange={() => (keepData = false)} />
					<span><strong>{t('account.signOutRemove')}</strong><br /><span class="muted">{t('account.signOutRemoveHint')}</span></span>
				</label>
				<label class="choice">
					<input type="radio" name="signout" value="keep" checked={keepData} onchange={() => (keepData = true)} />
					<span><strong>{t('account.signOutKeep')}</strong><br /><span class="muted">{t('account.signOutKeepHint')}</span></span>
				</label>
			</fieldset>
			<div class="actions">
				<button class="btn primary" type="button" onclick={confirmSignOut} disabled={busy}>{t('account.signOut')}</button>
				<button class="btn" type="button" onclick={() => signOutDialog?.close()}>{t('account.cancel')}</button>
			</div>
		{/if}
	</div>
</dialog>

<style>
	h2 {
		font-size: 1.1rem;
	}
	p {
		margin: 0 0 0.5rem;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
	.grow {
		flex: 1 1 12rem;
		min-width: 0;
	}
	.code {
		font-family: var(--font-plate);
		font-size: 1.4rem;
		letter-spacing: 0.3em;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.link {
		margin-top: 0.75rem;
		border: none;
		background: none;
		padding-left: 0;
		padding-right: 0;
		min-height: 2.25rem;
		font-size: 0.9rem;
	}
	.status::before {
		content: '';
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		margin-right: 0.4rem;
		border-radius: 50%;
		background: var(--success);
	}
	.status[data-status='syncing']::before {
		background: var(--accent);
	}
	.status[data-status='offline']::before,
	.status[data-status='unavailable']::before {
		background: var(--text-muted);
	}
	.status[data-status='error']::before {
		background: var(--danger);
	}
	.detail {
		display: block;
		font-size: 0.8rem;
		color: var(--text-muted);
		overflow-wrap: anywhere;
	}
	.small {
		font-size: 0.85rem;
	}
	.error {
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

	/* Bottom sheet on phones, centred box on wider screens (as on the country screen). */
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
