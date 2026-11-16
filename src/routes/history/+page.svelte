<script lang="ts">
	import { liveQuery } from 'dexie';
	import { onMount } from 'svelte';
	import { listSightings } from '#lib/db/sightings.js';
	import { t } from '#lib/i18n/i18n.svelte.js';
	import { syncNow } from '#lib/sync/account.svelte.js';
	import SightingList from '#lib/components/SightingList.svelte';

	const sightings = liveQuery(() => listSightings());

	// Fetch changes from other devices whenever History is opened (no-op when not signed in);
	// the list updates by itself when they arrive.
	onMount(() => void syncNow());
</script>

<h1>{t('history.title')}</h1>

{#if $sightings && $sightings.length === 0}
	<p class="muted">{t('history.empty')}</p>
{:else if $sightings}
	<SightingList sightings={$sightings} />
{/if}
