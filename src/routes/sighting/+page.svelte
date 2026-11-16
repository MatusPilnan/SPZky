<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { back } from '#lib/nav.js';
	import { resolvePlaces } from '#lib/geo/place.js';
	import LocationMap from '#lib/components/LocationMap.svelte';
	import { page } from '$app/state';
	import { liveQuery } from 'dexie';
	import { db, inferPlateType } from '#lib/db/db.js';
	import { deleteSighting, updateSighting } from '#lib/db/sightings.js';
	import type { GeoPoint, Sighting } from '#lib/db/types.js';
	import { collections, getCollection, getRegion, isNationwideType } from '#lib/collections.js';
	import { detectPlate, type NationwideFormat } from '#lib/plates/detect.js';
	import { countByRegion, countNationwide } from '#lib/progress.js';
	import { fromLocalInputValue, toLocalInputValue } from '#lib/datetime.js';
	import { showToast } from '#lib/toast.svelte.js';
	import { t } from '#lib/i18n/i18n.svelte.js';
	import PlateInput from '#lib/components/PlateInput.svelte';
	import RegionGrid from '#lib/components/RegionGrid.svelte';
	import NationwidePicker from '#lib/components/NationwidePicker.svelte';
	import CollectionSwitch from '#lib/components/CollectionSwitch.svelte';
	import TypeChip from '#lib/components/TypeChip.svelte';

	// Edit page uses ?id= rather than a dynamic route so it can be prerendered
	// (and precached) as a single static shell.
	const id = page.url.searchParams.get('id') ?? '';

	let original = $state<Sighting | null>(null);
	let notFound = $state(false);
	let plate = $state('');
	let collectionId = $state<string>(collections[0].id);
	/** null = nationwide (then nationwideType says which kind). */
	let regionCode = $state<string | null>(null);
	let nationwideType = $state<NationwideFormat | null>(null);
	let seenAtInput = $state('');
	let note = $state('');
	let location = $state<GeoPoint | null>(null);
	let saving = $state(false);
	let pickerOpen = $state(false);

	const all = liveQuery(() => db.sightings.toArray());
	const counts = $derived(countByRegion($all ?? []));
	const nationwideCounts = $derived(countNationwide($all ?? []));

	const valid = $derived(
		regionCode !== null ? !!getRegion(collectionId, regionCode) : isNationwideType(collectionId, nationwideType)
	);

	onMount(async () => {
		const s = await db.sightings.get(id);
		if (!s || s.deleted) {
			notFound = true;
			return;
		}
		original = s;
		plate = s.plate ?? '';
		collectionId = s.collectionId;
		regionCode = s.regionCode;
		nationwideType = s.regionCode === null && isNationwideType(s.collectionId, s.plateType) ? s.plateType : null;
		seenAtInput = toLocalInputValue(s.seenAt);
		note = s.note;
		location = s.location;
	});

	function onPlateInput() {
		// Follow the plate when the user retypes it and it is clearly recognised.
		// Keep the current country if it is one of the matches (e.g. EL plates fit SK and CZ).
		const matches = detectPlate(plate).filter((d) => d.confidence === 'high');
		const top = matches.find((d) => d.collectionId === collectionId) ?? matches[0];
		if (!top) return;
		collectionId = top.collectionId;
		if (top.type === 'region') {
			regionCode = top.regionCode;
			nationwideType = null;
		} else {
			regionCode = null;
			nationwideType = top.format;
		}
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!original || !valid) return;
		saving = true;
		try {
			const newPlate = plate.trim() ? plate : null;
			await updateSighting(original.id, {
				plate: newPlate,
				collectionId,
				regionCode,
				plateType:
					regionCode === null ? nationwideType : inferPlateType({ plate: newPlate, collectionId, regionCode }),
				seenAt: fromLocalInputValue(seenAtInput) ?? original.seenAt,
				note,
				location
			});
			showToast({ kind: 'success', text: t('edit.saved') });
			await back(resolve('/history'));
		} finally {
			saving = false;
		}
	}

	async function remove() {
		if (!original || !confirm(t('edit.confirmDelete'))) return;
		await deleteSighting(original.id);
		showToast({ kind: 'info', text: t('edit.deleted') });
		await back(resolve('/history'));
	}

	/** Address from the live record (filled in by the background lookup), while the location is unchanged. */
	const livePlace = $derived.by(() => {
		const current = ($all ?? []).find((s) => s.id === id);
		const same = current?.location && location && current.location.lat === location.lat && current.location.lng === location.lng;
		return same ? (current.place ?? null) : null;
	});
	let online = $state(typeof navigator === 'undefined' || navigator.onLine);
	onMount(() => {
		const update = () => (online = navigator.onLine);
		addEventListener('online', update);
		addEventListener('offline', update);
		// Look up the address now if it's still missing (no-op when there's nothing to do).
		void resolvePlaces();
		return () => {
			removeEventListener('online', update);
			removeEventListener('offline', update);
		};
	});

	function mapUrl(p: GeoPoint): string {
		return `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`;
	}
</script>

<div class="stack">
	<!-- Back to wherever the edit page was opened from (History, Home, a country). -->
	<a
		class="back"
		href={resolve('/history')}
		data-back
		onclick={(e) => {
			e.preventDefault();
			void back(resolve('/history'));
		}}>← {t('edit.back')}</a
	>
	<h1>{t('edit.title')}</h1>

	{#if notFound}
		<p class="muted">{t('edit.notFound')}</p>
	{:else if original}
		<form class="stack" onsubmit={save}>
			<PlateInput
				bind:value={plate}
				country={getCollection(collectionId)?.country ?? ''}
				plain={getCollection(collectionId)?.plateStyle === 'plain'}
				oninput={onPlateInput}
				aria-label={t('add.plate')}
			/>

			<section class="card stack">
				<div class="current">
					<span class="flag" aria-hidden="true">{getCollection(collectionId)?.flag}</span>
					{#if regionCode !== null}
						<span class="code">{regionCode}</span>
						<span class="name">{getRegion(collectionId, regionCode)?.name ?? ''}</span>
					{:else}
						<span class="name">
							{t('nationwide.title')}
							<TypeChip type={nationwideType} showPlain />
						</span>
					{/if}
					<button type="button" class="btn" onclick={() => (pickerOpen = !pickerOpen)} aria-expanded={pickerOpen}>
						{pickerOpen ? t('edit.closePicker') : t('edit.changeRegion')}
					</button>
				</div>
				{#if pickerOpen}
					<CollectionSwitch bind:value={collectionId} />
					{#key collectionId}
						{@const c = getCollection(collectionId) ?? collections[0]}
						<div>
							<RegionGrid
								collection={c}
								counts={counts.get(c.id)}
								selected={regionCode}
								onpick={(code) => {
									regionCode = code;
									nationwideType = null;
									pickerOpen = false;
								}}
							/>
							<NationwidePicker
								collection={c}
								counts={nationwideCounts.get(c.id)}
								selected={regionCode === null ? nationwideType : null}
								onpick={(type) => {
									regionCode = null;
									nationwideType = type;
									pickerOpen = false;
								}}
							/>
						</div>
					{/key}
				{/if}
			</section>

			<label class="field">
				{t('add.seenAt')}
				<input type="datetime-local" bind:value={seenAtInput} required />
			</label>
			<label class="field">
				{t('add.note')}
				<input bind:value={note} placeholder={t('add.notePlaceholder')} />
			</label>

			<section class="card">
				<h2>{t('edit.location')}</h2>
				{#if location}
					<div class="place" data-testid="place">
						{#if livePlace}
							<strong>{livePlace}</strong>
						{:else if livePlace == null && online}
							<span class="muted">{t('edit.placeLooking')}</span>
						{/if}
						<span class="muted small">
							{location.lat.toFixed(5)}, {location.lng.toFixed(5)}
							{#if location.accuracy !== null}(±{location.accuracy} m){/if}
						</span>
					</div>
					<LocationMap {location} />
					{#if livePlace}<p class="muted credit">{t('edit.placeCredit')}</p>{/if}
					<div class="row">
						<a class="btn" href={mapUrl(location)} target="_blank" rel="noopener noreferrer">{t('edit.showOnMap')}</a>
						<button type="button" class="btn" onclick={() => (location = null)}>{t('edit.removeLocation')}</button>
					</div>
				{:else}
					<p class="muted">{t('edit.noLocation')}</p>
				{/if}
			</section>

			<button class="btn primary" type="submit" disabled={saving || !valid}>
				{t('edit.save')}
			</button>
			<button class="btn danger" type="button" onclick={remove}>{t('edit.delete')}</button>
		</form>
	{/if}
</div>

<style>
	.back {
		align-self: flex-start;
		text-decoration: none;
		font-weight: 600;
	}
	h2 {
		font-size: 1.05rem;
	}
	section p {
		margin: 0 0 0.5rem;
	}
	.current {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.current .flag {
		font-size: 1.3rem;
	}
	.current .code {
		font-family: var(--font-plate);
		font-size: 1.5rem;
		font-weight: 700;
	}
	.current .name {
		flex: 1;
		min-width: 0;
		font-weight: 600;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
	.place {
		display: flex;
		flex-direction: column;
		margin-bottom: 0.6rem;
	}
	.small {
		font-size: 0.85rem;
	}
	.credit {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
	}
</style>
