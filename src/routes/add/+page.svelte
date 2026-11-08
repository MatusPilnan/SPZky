<script lang="ts">
	import { addSighting, findByPlate } from '#lib/db/sightings.js';
	import { collections } from '#lib/collections.js';
	import { t } from '#lib/i18n/i18n.svelte.js';
	import { requestPersistentStorage } from '#lib/storage.js';

	// Temporary manual form. Phase 2 replaces it with plate auto-detection
	// and the quick "tap a region" mode.
	let plate = $state('');
	let collectionId = $state<string>(collections[0].id);
	let regionCode = $state('');
	let message = $state<{ kind: 'ok' | 'warn'; text: string } | null>(null);
	let saving = $state(false);

	async function onPlateBlur() {
		if (!regionCode && plate.trim()) {
			// Convenience until real detection exists: SK plates start with the district code.
			regionCode = plate.trim().slice(0, 2).toUpperCase();
		}
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!regionCode.trim()) return;
		saving = true;
		try {
			const duplicates = plate.trim() ? await findByPlate(plate) : [];
			if (duplicates.length > 0) {
				message = { kind: 'warn', text: t('add.duplicate') };
				return;
			}
			const saved = await addSighting({ collectionId, regionCode, plate });
			message = { kind: 'ok', text: t('add.saved', { plate: saved.plate ?? saved.regionCode }) };
			plate = '';
			regionCode = '';
			void requestPersistentStorage();
		} finally {
			saving = false;
		}
	}
</script>

<form class="card stack" onsubmit={save}>
	<h1>{t('add.title')}</h1>
	<p class="muted note">{t('add.temporaryNote')}</p>

	<label class="field">
		{t('add.plate')}
		<input
			bind:value={plate}
			onblur={onPlateBlur}
			placeholder={t('add.platePlaceholder')}
			autocomplete="off"
			autocapitalize="characters"
			spellcheck="false"
			enterkeyhint="done"
		/>
	</label>

	<label class="field">
		{t('add.collection')}
		<select bind:value={collectionId}>
			{#each collections as c (c.id)}
				<option value={c.id}>{c.flag} {t(`collection.${c.id}`)}</option>
			{/each}
		</select>
	</label>

	<label class="field">
		{t('add.region')}
		<input
			bind:value={regionCode}
			placeholder={t('add.regionPlaceholder')}
			required
			autocomplete="off"
			autocapitalize="characters"
			spellcheck="false"
		/>
	</label>

	<button class="btn primary" type="submit" disabled={saving}>{t('add.save')}</button>

	{#if message}
		<p class="message {message.kind}" role="status">{message.text}</p>
	{/if}
</form>

<style>
	.note {
		margin: 0;
		font-size: 0.9rem;
	}
	.message {
		margin: 0;
		font-weight: 600;
	}
	.message.ok {
		color: var(--success);
	}
	.message.warn {
		color: var(--danger);
	}
</style>
