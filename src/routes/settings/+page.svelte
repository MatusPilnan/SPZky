<script lang="ts">
	import { onMount } from 'svelte';
	import { formatBytes, i18n, localeNames, locales, t, type Locale } from '#lib/i18n/i18n.svelte.js';
	import { isStoragePersisted, requestPersistentStorage, storageEstimate } from '#lib/storage.js';

	let persisted = $state<boolean | null>(null);
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
	.version {
		text-align: center;
		font-size: 0.85rem;
	}
</style>
