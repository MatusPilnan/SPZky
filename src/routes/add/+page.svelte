<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { liveQuery } from 'dexie';
	import { db } from '#lib/db/db.js';
	import { addSighting, deleteSighting } from '#lib/db/sightings.js';
	import { collections, getCollection, getRegion } from '#lib/collections.js';
	import { detectPlate, type Detection } from '#lib/plates/detect.js';
	import { normalizePlate } from '#lib/plates/normalize.js';
	import { countByRegion, regionCount } from '#lib/progress.js';
	import { prefs } from '#lib/prefs.svelte.js';
	import { LocationTracker } from '#lib/location.svelte.js';
	import { showToast } from '#lib/toast.svelte.js';
	import { fromLocalInputValue } from '#lib/datetime.js';
	import { formatDateTime, t } from '#lib/i18n/i18n.svelte.js';
	import { requestPersistentStorage } from '#lib/storage.js';
	import PlateInput from '#lib/components/PlateInput.svelte';
	import RegionGrid from '#lib/components/RegionGrid.svelte';
	import CollectionSwitch from '#lib/components/CollectionSwitch.svelte';

	type RegionDetection = Extract<Detection, { type: 'region' }>;
	interface Selection {
		collectionId: string;
		regionCode: string;
	}

	const all = liveQuery(() => db.sightings.toArray());
	const counts = $derived(countByRegion($all ?? []));

	const tracker = new LocationTracker();
	onMount(() => {
		if (prefs.saveLocation) tracker.start();
	});
	onDestroy(() => tracker.stop());

	// ---- plate mode -------------------------------------------------------
	let plate = $state('');
	let plateInput = $state<HTMLInputElement | null>(null);
	let pickedKey = $state<string | null>(null);
	let manual = $state<Selection | null>(null);
	let showManual = $state(false);
	let manualCollection = $state<string>(collections[0].id);
	let seenAtInput = $state('');
	let note = $state('');
	let saving = $state(false);

	const normalized = $derived(normalizePlate(plate));
	const detections = $derived(detectPlate(plate));
	const regionMatches = $derived(detections.filter((d): d is RegionDetection => d.type === 'region'));
	const noRegion = $derived(detections.find((d) => d.type === 'no-region'));
	const recognized = $derived(detections.length > 0);

	const key = (d: Selection) => `${d.collectionId}:${d.regionCode}`;

	const selection = $derived.by((): Selection | null => {
		if (manual) return manual;
		return regionMatches.find((d) => key(d) === pickedKey) ?? regionMatches[0] ?? null;
	});

	const duplicate = $derived(
		normalized ? ($all ?? []).find((s) => s.deleted === 0 && s.plateNormalized === normalized) : undefined
	);

	const bandCountry = $derived(
		selection
			? (getCollection(selection.collectionId)?.country ?? '')
			: noRegion?.type === 'no-region'
				? (noRegion.country ?? '')
				: ''
	);

	// Unrecognised plates go straight to the manual picker.
	const manualVisible = $derived(showManual || (normalized.length >= 5 && !recognized));

	const canSave = $derived(!!selection && normalized.length >= 2 && !duplicate && !saving);

	function onPlateInput() {
		pickedKey = null;
		manual = null;
		showManual = false;
	}

	function isNew(sel: Selection): boolean {
		return regionCount(counts, sel.collectionId, sel.regionCode) === 0;
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!canSave || !selection) return;
		saving = true;
		try {
			const sel = selection;
			const wasNew = isNew(sel);
			const saved = await addSighting({
				collectionId: sel.collectionId,
				regionCode: sel.regionCode,
				plate,
				seenAt: fromLocalInputValue(seenAtInput) ?? Date.now(),
				location: prefs.saveLocation ? tracker.current() : null,
				note
			});
			const region = getRegion(sel.collectionId, sel.regionCode);
			showToast(
				wasNew
					? { kind: 'celebrate', text: t('add.newRegionToast', { code: sel.regionCode, name: region?.name ?? '' }) }
					: { kind: 'success', text: t('add.saved', { plate: saved.plate ?? '' }) }
			);
			plate = '';
			note = '';
			seenAtInput = '';
			onPlateInput();
			plateInput?.focus();
			void requestPersistentStorage();
		} finally {
			saving = false;
		}
	}

	// ---- quick mode -------------------------------------------------------
	const quickCollection = $derived(getCollection(prefs.quickCollection) ?? collections[0]);

	async function quickPick(code: string) {
		const sel = { collectionId: quickCollection.id, regionCode: code };
		const wasNew = isNew(sel);
		const saved = await addSighting({
			...sel,
			plate: null,
			location: prefs.saveLocation ? tracker.current() : null
		});
		const name = getRegion(sel.collectionId, code)?.name ?? '';
		showToast({
			kind: wasNew ? 'celebrate' : 'success',
			text: wasNew ? t('add.newRegionToast', { code, name }) : t('add.quickSaved', { code, name }),
			action: { label: t('add.undo'), run: () => void deleteSighting(saved.id) }
		});
		void requestPersistentStorage();
	}
</script>

<div class="stack">
	<div class="modes" role="tablist">
		<button
			role="tab"
			aria-selected={prefs.addMode === 'plate'}
			class:active={prefs.addMode === 'plate'}
			onclick={() => (prefs.addMode = 'plate')}>{t('add.modePlate')}</button
		>
		<button
			role="tab"
			aria-selected={prefs.addMode === 'quick'}
			class:active={prefs.addMode === 'quick'}
			onclick={() => (prefs.addMode = 'quick')}>{t('add.modeQuick')}</button
		>
	</div>

	{#if prefs.addMode === 'plate'}
		<form class="stack" onsubmit={save}>
			<PlateInput
				bind:value={plate}
				bind:ref={plateInput}
				country={bandCountry}
				oninput={onPlateInput}
				placeholder={t('add.platePlaceholder')}
				aria-label={t('add.plate')}
				enterkeyhint="done"
			/>

			{#if regionMatches.length > 0 && !manual}
				<div class="candidates" role="radiogroup">
					{#each regionMatches as d (key(d))}
						{@const c = getCollection(d.collectionId)}
						{@const region = getRegion(d.collectionId, d.regionCode)}
						{@const active = selection !== null && key(selection) === key(d)}
						<button
							type="button"
							role="radio"
							aria-checked={active}
							class="candidate"
							class:active
							onclick={() => (pickedKey = key(d))}
						>
							<span class="flag" aria-hidden="true">{c?.flag}</span>
							<span class="code">{d.regionCode}</span>
							<span class="info">
								<strong>{region?.name}</strong>
								<small class="muted">{t(`collection.${d.collectionId}`)} · {t(`format.${d.format}`)}</small>
							</span>
							{#if isNew(d)}<span class="new">{t('add.newRegion')}</span>{/if}
						</button>
					{/each}
				</div>
			{:else if manual}
				{@const region = getRegion(manual.collectionId, manual.regionCode)}
				<div class="candidate active">
					<span class="flag" aria-hidden="true">{getCollection(manual.collectionId)?.flag}</span>
					<span class="code">{manual.regionCode}</span>
					<span class="info"><strong>{region?.name}</strong></span>
					{#if isNew(manual)}<span class="new">{t('add.newRegion')}</span>{/if}
				</div>
			{/if}

			{#if noRegion?.type === 'no-region' && regionMatches.length === 0 && !manual}
				<p class="notice">{t(`noRegion.${noRegion.format}`)}</p>
			{/if}

			{#if duplicate}
				<p class="notice warn">{t('add.duplicate', { date: formatDateTime(duplicate.seenAt) })}</p>
			{/if}

			{#if manualVisible}
				<section class="card stack manual">
					{#if !recognized}<p class="hint">{t('add.unrecognized')}</p>{/if}
					<CollectionSwitch bind:value={manualCollection} />
					{#key manualCollection}
						<RegionGrid
							collection={getCollection(manualCollection) ?? collections[0]}
							counts={counts.get(manualCollection)}
							selected={manual?.collectionId === manualCollection ? manual.regionCode : null}
							onpick={(code) => {
								manual = { collectionId: manualCollection, regionCode: code };
								showManual = false;
							}}
						/>
					{/key}
				</section>
			{:else if normalized.length >= 5}
				<button type="button" class="link" onclick={() => (showManual = true)}>{t('add.chooseManually')}</button>
			{/if}

			<details>
				<summary>{t('add.details')}</summary>
				<div class="stack details">
					<label class="field">
						{t('add.seenAt')}
						<input type="datetime-local" bind:value={seenAtInput} />
					</label>
					<label class="field">
						{t('add.note')}
						<input bind:value={note} placeholder={t('add.notePlaceholder')} />
					</label>
				</div>
			</details>

			<p class="location muted">
				{tracker.status === 'ok'
					? t('location.ok', { accuracy: tracker.position?.accuracy ?? '?' })
					: t(`location.${tracker.status}`)}
			</p>

			<button class="btn primary save" type="submit" disabled={!canSave}>{t('add.save')}</button>
		</form>
	{:else}
		<section class="stack">
			<p class="muted hint">{t('add.quickHint')}</p>
			<CollectionSwitch bind:value={prefs.quickCollection} />
			{#key quickCollection.id}
				<RegionGrid collection={quickCollection} counts={counts.get(quickCollection.id)} onpick={quickPick} />
			{/key}
			<p class="location muted">
				{tracker.status === 'ok'
					? t('location.ok', { accuracy: tracker.position?.accuracy ?? '?' })
					: t(`location.${tracker.status}`)}
			</p>
		</section>
	{/if}
</div>

<style>
	.modes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 0.25rem;
		border-radius: 999px;
		background: var(--surface-2);
	}
	.modes button {
		min-height: 2.5rem;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--text-muted);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.modes button.active {
		background: var(--surface);
		color: var(--text);
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.15);
	}
	.candidates {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.candidate {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.6rem 0.8rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.candidate.active {
		border-color: var(--accent);
		box-shadow: inset 0 0 0 1px var(--accent);
	}
	.flag {
		font-size: 1.4rem;
	}
	.code {
		min-width: 2.2ch;
		font-family: var(--font-plate);
		font-size: 1.6rem;
		font-weight: 700;
	}
	.info {
		flex: 1;
		display: flex;
		flex-direction: column;
		line-height: 1.25;
	}
	.new {
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: var(--eu-yellow);
		color: #111;
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
	}
	.notice {
		margin: 0;
		padding: 0.6rem 0.8rem;
		border-radius: var(--radius);
		background: var(--surface-2);
	}
	.notice.warn {
		background: color-mix(in srgb, var(--danger) 15%, var(--surface));
		color: var(--danger);
		font-weight: 600;
	}
	.manual .hint,
	.hint {
		margin: 0;
	}
	.link {
		align-self: flex-start;
		padding: 0;
		border: none;
		background: none;
		color: var(--accent);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
	details summary {
		cursor: pointer;
		font-weight: 600;
	}
	.details {
		margin-top: 0.75rem;
	}
	.location {
		margin: 0;
		font-size: 0.85rem;
	}
	.save {
		min-height: 3.25rem;
		font-size: 1.1rem;
	}
</style>
