<script lang="ts">
	import { onMount } from 'svelte';
	import { formatBytes, i18n, localeNames, locales, t, type Locale } from '#lib/i18n/i18n.svelte.js';
	import { isStoragePersisted, requestPersistentStorage, storageEstimate } from '#lib/storage.js';
	import { prefs } from '#lib/prefs.svelte.js';
	import Switch from '#lib/components/Switch.svelte';

	let persisted = $state<boolean | null>(null);
	let locationDenied = $state(false);

	/** Runs after the switch has updated prefs.saveLocation. */
	function toggleLocation(enabled: boolean) {
		locationDenied = false;
		if (!enabled) return;
		if (!('geolocation' in navigator)) {
			prefs.saveLocation = false;
			locationDenied = true;
			return;
		}
		// Ask for permission right away (in response to the tap), not later on the Add screen.
		navigator.geolocation.getCurrentPosition(
			() => {},
			(err) => {
				if (err.code === err.PERMISSION_DENIED) {
					prefs.saveLocation = false;
					locationDenied = true;
				}
			},
			{ timeout: 30_000 }
		);
	}
	let estimate = $state<{ usage: number; quota: number } | null>(null);

	async function refresh() {
		persisted = await isStoragePersisted();
		estimate = await storageEstimate();
	}

	async function requestPersist() {
		await requestPersistentStorage();
		await refresh();
	}

	onMount(refresh);
</script>

<div class="stack">
	<h1>{t('settings.title')}</h1>

	<section class="card stack">
		<label class="field">
			{t('settings.language')}
			<select value={i18n.locale} onchange={(e) => (i18n.locale = e.currentTarget.value as Locale)}>
				{#each locales as l (l)}
					<option value={l}>{localeNames[l]}</option>
				{/each}
			</select>
		</label>
	</section>

	<section class="card">
		<h2>{t('settings.adding')}</h2>
		<Switch bind:checked={prefs.returnHomeAfterAdd}>{t('settings.returnHomeAfterAdd')}</Switch>
		<p class="muted small">{t('settings.returnHomeAfterAddHint')}</p>
	</section>

	<section class="card">
		<h2>{t('settings.location')}</h2>
		<Switch bind:checked={prefs.saveLocation} onchange={toggleLocation}>{t('settings.saveLocation')}</Switch>
		<p class="muted small">{t('settings.saveLocationHint')}</p>
		{#if locationDenied}<p class="error">{t('location.denied')}</p>{/if}
	</section>

	<section class="card">
		<h2>{t('settings.storage')}</h2>
		{#if persisted !== null}
			<p>{persisted ? t('settings.storagePersisted') : t('settings.storageNotPersisted')}</p>
			{#if !persisted}
				<button class="btn" onclick={requestPersist}>{t('settings.storageRequest')}</button>
			{/if}
		{/if}
		{#if estimate}
			<p class="muted">
				{t('settings.storageUsage', { used: formatBytes(estimate.usage), quota: formatBytes(estimate.quota) })}
			</p>
		{/if}
	</section>

	<section class="card">
		<h2>{t('settings.account')}</h2>
		<p class="muted">{t('settings.accountSoon')}</p>
	</section>

	<p class="muted version">{t('settings.version', { version: __APP_VERSION__ })}</p>
</div>

<style>
	h2 {
		font-size: 1.1rem;
	}
	section p {
		margin: 0 0 0.5rem;
	}
	.small {
		margin-top: 0.5rem;
		font-size: 0.85rem;
	}
	.error {
		color: var(--danger);
		font-weight: 600;
	}
	.version {
		text-align: center;
		font-size: 0.85rem;
	}
</style>
