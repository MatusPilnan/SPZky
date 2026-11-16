<script lang="ts">
	import { onMount } from 'svelte';
	import { formatBytes, i18n, localeNames, locales, t, type Locale } from '#lib/i18n/i18n.svelte.js';
	import { isStoragePersisted, requestPersistentStorage, storageEstimate } from '#lib/storage.js';
	import { prefs } from '#lib/prefs.svelte.js';
	import Switch from '#lib/components/Switch.svelte';
	import { collections, type CollectionId } from '#lib/collections.js';
	import { loadMap } from '#lib/geo/maps/index.js';
	import AccountSection from '#lib/components/AccountSection.svelte';
	import DataSection from '#lib/components/DataSection.svelte';
	import { syncConfigured } from '#lib/sync/account.svelte.js';
	import { clampFullCount, homeOrders } from '#lib/home.js';

	/** Country collections on Home (the bonus ones are a separate section). */
	const countryCount = collections.filter((c) => !c.bonus).length;

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

	/** Map data credits (required by the CC BY licences). */
	let mapCredits = $state<{ collection: CollectionId; text: string }[]>([]);
	onMount(async () => {
		const credits = await Promise.all(
			collections.map(async (c) => {
				const m = await loadMap(c.id);
				return m ? { collection: c.id, text: `${m.attribution} (${m.license})` } : null;
			})
		);
		mapCredits = credits.filter((c) => c !== null);
	});
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

	<section class="card stack home-prefs">
		<h2>{t('settings.home')}</h2>
		<label class="field">
			{t('settings.homeOrder')}
			<select bind:value={prefs.homeOrder} data-testid="home-order">
				{#each homeOrders as o (o)}
					<option value={o}>{t(`settings.homeOrder.${o}`)}</option>
				{/each}
			</select>
		</label>
		<label class="field">
			{t('settings.homeFullCount')}
			<input
				type="number"
				inputmode="numeric"
				min="0"
				max={countryCount}
				value={prefs.homeFullCount}
				onchange={(e) => (e.currentTarget.value = String((prefs.homeFullCount = clampFullCount(e.currentTarget.value, countryCount))))}
				data-testid="home-full-count"
			/>
		</label>
		<p class="muted small">{t('settings.homeFullCountHint')}</p>
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

	{#if syncConfigured}<AccountSection />{/if}

	<DataSection />

	<section class="card credits">
		<h2>{t('settings.mapData')}</h2>
		<ul>
			{#each mapCredits as m (m.collection)}
				<li><strong>{t(`collection.${m.collection}`)}:</strong> {m.text}</li>
			{/each}
			<li>{t('settings.mapDataBorders')}</li>
		</ul>
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
	.credits ul {
		margin: 0;
		padding-left: 1.1rem;
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.credits li + li {
		margin-top: 0.25rem;
	}
	.version {
		text-align: center;
		font-size: 0.85rem;
	}
</style>
