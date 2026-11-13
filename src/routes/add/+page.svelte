<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { liveQuery } from 'dexie';
	import { db } from '#lib/db/db.js';
	import { addSighting, deleteSighting } from '#lib/db/sightings.js';
	import {
		collections,
		countryOf,
		getCollection,
		getRegion,
		highlightOf,
		type CollectionId
	} from '#lib/collections.js';
	import {
		detectionKey,
		detectPlate,
		orderByCountry,
		spansCountries,
		type NationwideFormat,
		type PlateFormat
	} from '#lib/plates/detect.js';
	import { normalizePlate } from '#lib/plates/normalize.js';
	import { countByRegion, countNationwide, regionCount } from '#lib/progress.js';
	import { countryAt } from '#lib/geo/country.js';
	import { prefs } from '#lib/prefs.svelte.js';
	import { LocationTracker } from '#lib/location.svelte.js';
	import { showToast } from '#lib/toast.svelte.js';
	import { fromLocalInputValue } from '#lib/datetime.js';
	import { formatDateTime, t } from '#lib/i18n/i18n.svelte.js';
	import { requestPersistentStorage } from '#lib/storage.js';
	import PlateInput from '#lib/components/PlateInput.svelte';
	import RegionGrid from '#lib/components/RegionGrid.svelte';
	import NationwidePicker from '#lib/components/NationwidePicker.svelte';
	import CollectionSwitch from '#lib/components/CollectionSwitch.svelte';
	import TypeChip from '#lib/components/TypeChip.svelte';

	/** What gets saved: a region, or (regionCode null) a nationwide plate of some type. */
	interface Selection {
		collectionId: CollectionId;
		regionCode: string | null;
		plateType: PlateFormat | null;
	}

	const selectionKey = (s: Selection) =>
		s.regionCode !== null ? `${s.collectionId}:${s.regionCode}` : `${s.collectionId}:*${s.plateType}`;

	const all = liveQuery(() => db.sightings.toArray());
	const counts = $derived(countByRegion($all ?? []));
	const nationwideCounts = $derived(countNationwide($all ?? []));

	const tracker = new LocationTracker();
	onMount(() => {
		if (prefs.saveLocation) tracker.start();
	});
	onDestroy(() => tracker.stop());

	// Country preference for ambiguous plates: where the device is, then the last used country.
	const gpsCountry = $derived(tracker.position ? countryAt(tracker.position.lat, tracker.position.lng) : null);
	const lastCountry = $derived.by(() => {
		let latest: { createdAt: number; collectionId: string } | null = null;
		for (const s of $all ?? []) if (!s.deleted && (!latest || s.createdAt > latest.createdAt)) latest = s;
		return latest ? (countryOf(latest.collectionId) ?? null) : null;
	});

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
	const candidates = $derived(
		orderByCountry(detectPlate(plate), [gpsCountry, lastCountry]).map((d) => ({
			key: detectionKey(d),
			format: d.format,
			selection: {
				collectionId: d.collectionId,
				regionCode: d.type === 'region' ? d.regionCode : null,
				plateType: d.format
			} satisfies Selection
		}))
	);
	const recognized = $derived(candidates.length > 0);
	const ambiguousCountry = $derived(spansCountries(candidates.map((c) => c.selection)));
	const evAmbiguous = $derived(ambiguousCountry && candidates.some((c) => c.format === 'ev'));

	const selection = $derived.by((): Selection | null => {
		if (manual) return manual;
		return (candidates.find((c) => c.key === pickedKey) ?? candidates[0])?.selection ?? null;
	});

	const duplicate = $derived(
		normalized ? ($all ?? []).find((s) => s.deleted === 0 && s.plateNormalized === normalized) : undefined
	);

	const bandCountry = $derived(selection ? (countryOf(selection.collectionId) ?? '') : '');

	// Unrecognised plates go straight to the manual picker.
	const manualVisible = $derived(showManual || (normalized.length >= 5 && !recognized));

	const canSave = $derived(!!selection && normalized.length >= 2 && !duplicate && !saving);

	function onPlateInput() {
		pickedKey = null;
		manual = null;
		showManual = false;
	}

	/** "New!" only for regions: nationwide plates don't count toward progress. */
	function isNewRegion(sel: Selection): boolean {
		return sel.regionCode !== null && regionCount(counts, sel.collectionId, sel.regionCode) === 0;
	}

	/** After a save: stay for the next plate, or go home if the user chose so in Settings. */
	async function afterSave(): Promise<boolean> {
		void requestPersistentStorage();
		if (!prefs.returnHomeAfterAdd) return false;
		await goto(resolve('/')); // toasts live in the layout, so they stay visible
		return true;
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!canSave || !selection) return;
		saving = true;
		try {
			const sel = selection;
			const wasNew = isNewRegion(sel);
			const saved = await addSighting({
				collectionId: sel.collectionId,
				regionCode: sel.regionCode,
				plateType: sel.plateType,
				plate,
				seenAt: fromLocalInputValue(seenAtInput) ?? Date.now(),
				location: prefs.saveLocation ? tracker.current() : null,
				note
			});
			const region = getRegion(sel.collectionId, sel.regionCode);
			showToast(
				wasNew
					? { kind: 'celebrate', text: t('add.newRegionToast', { code: sel.regionCode ?? '', name: region?.name ?? '' }) }
					: sel.regionCode === null
						? { kind: 'success', text: t('add.savedNationwide', { plate: saved.plate ?? '' }) }
						: { kind: 'success', text: t('add.saved', { plate: saved.plate ?? '' }) }
			);
			if (await afterSave()) return;
			plate = '';
			note = '';
			seenAtInput = '';
			onPlateInput();
			plateInput?.focus();
		} finally {
			saving = false;
		}
	}

	// ---- quick mode -------------------------------------------------------
	const quickCollection = $derived(getCollection(prefs.quickCollection) ?? collections[0]);

	async function quickLog(sel: Selection, text: string, celebrate: boolean) {
		const saved = await addSighting({
			...sel,
			plate: null,
			location: prefs.saveLocation ? tracker.current() : null
		});
		showToast({
			kind: celebrate ? 'celebrate' : 'success',
			text,
			action: { label: t('add.undo'), run: () => void deleteSighting(saved.id) }
		});
		await afterSave();
	}

	function quickPick(code: string) {
		const sel = { collectionId: quickCollection.id, regionCode: code, plateType: null };
		const name = getRegion(sel.collectionId, code)?.name ?? '';
		const wasNew = isNewRegion(sel);
		void quickLog(
			sel,
			wasNew ? t('add.newRegionToast', { code, name }) : t('add.quickSaved', { code, name }),
			wasNew
		);
	}

	function quickNationwide(type: NationwideFormat) {
		void quickLog(
			{ collectionId: quickCollection.id, regionCode: null, plateType: type },
			t('add.quickSavedNationwide', { type: t(`nationwideType.${type}`) }),
			false
		);
	}
</script>

{#snippet candidateBody(sel: Selection)}
	{@const c = getCollection(sel.collectionId)}
	<span class="flag" aria-hidden="true">{c?.flag}</span>
	{#if sel.regionCode !== null}
		<span class="code">{sel.regionCode}</span>
		<span class="info">
			<strong>{getRegion(sel.collectionId, sel.regionCode)?.name}</strong>
			<small class="muted">
				{t(`collection.${sel.collectionId}`)}{#if sel.plateType}&nbsp;· {t(`format.${sel.plateType}`)}{/if}
			</small>
		</span>
		{#if highlightOf(sel.plateType)}<TypeChip type={sel.plateType} />{/if}
		{#if isNewRegion(sel)}<span class="new">{t('add.newRegion')}</span>{/if}
	{:else}
		<span class="info">
			<strong>{t(`collection.${sel.collectionId}`)} · {t('nationwide.title')}</strong>
			<small class="muted">{t('add.notCounted')}</small>
		</span>
		<TypeChip type={sel.plateType} showPlain />
	{/if}
{/snippet}

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

			{#if candidates.length > 0 && !manual}
				{#if ambiguousCountry}
					<p class="notice">
						{t('add.chooseCountry')}
						{#if evAmbiguous}<br /><small>{t('add.evColorHint')}</small>{/if}
					</p>
				{/if}
				<div class="candidates" role="radiogroup">
					{#each candidates as cand (cand.key)}
						{@const active = selection !== null && selectionKey(selection) === cand.key}
						<button
							type="button"
							role="radio"
							aria-checked={active}
							class="candidate"
							class:active
							class:nationwide={cand.selection.regionCode === null}
							onclick={() => (pickedKey = cand.key)}
						>
							{@render candidateBody(cand.selection)}
						</button>
					{/each}
				</div>
			{:else if manual}
				<div class="candidate active" class:nationwide={manual.regionCode === null}>
					{@render candidateBody(manual)}
				</div>
			{/if}

			{#if duplicate}
				<p class="notice warn">{t('add.duplicate', { date: formatDateTime(duplicate.seenAt) })}</p>
			{/if}

			{#if manualVisible}
				<section class="card stack manual">
					{#if !recognized}<p class="hint">{t('add.unrecognized')}</p>{/if}
					<CollectionSwitch bind:value={manualCollection} />
					{#key manualCollection}
						{@const mc = getCollection(manualCollection) ?? collections[0]}
						<div>
							<RegionGrid
								collection={mc}
								counts={counts.get(mc.id)}
								selected={manual?.collectionId === mc.id ? manual.regionCode : null}
								onpick={(code) => {
									manual = { collectionId: mc.id, regionCode: code, plateType: null };
									showManual = false;
								}}
							/>
							<NationwidePicker
								collection={mc}
								counts={nationwideCounts.get(mc.id)}
								selected={manual?.collectionId === mc.id && manual.regionCode === null
									? (manual.plateType as NationwideFormat)
									: null}
								onpick={(type) => {
									manual = { collectionId: mc.id, regionCode: null, plateType: type };
									showManual = false;
								}}
							/>
						</div>
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
				<div>
					<RegionGrid collection={quickCollection} counts={counts.get(quickCollection.id)} onpick={quickPick} />
					<NationwidePicker
						collection={quickCollection}
						counts={nationwideCounts.get(quickCollection.id)}
						onpick={quickNationwide}
					/>
				</div>
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
	.candidate.nationwide {
		border-style: dashed;
	}
	.candidate.active {
		border-color: var(--accent);
		border-style: solid;
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
		min-width: 0;
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
