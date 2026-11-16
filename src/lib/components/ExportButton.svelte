<script lang="ts">
	import { backupFileName, exportBackup } from '../backup';
	import { db } from '../db/db';
	import { saveTextFile } from '../files';
	import { t } from '../i18n/i18n.svelte';
	import { showToast } from '../toast.svelte';

	let { label }: { label?: string } = $props();
	let busy = $state(false);

	async function exportNow() {
		busy = true;
		try {
			const backup = await exportBackup(db, __APP_VERSION__);
			const result = await saveTextFile(backupFileName(), JSON.stringify(backup, null, '\t'));
			if (result === 'saved') {
				showToast({ text: t('data.exported', { count: backup.sightings.length }), kind: 'success' });
			}
		} catch {
			showToast({ text: t('data.exportFailed'), kind: 'info' });
		} finally {
			busy = false;
		}
	}
</script>

<button class="btn" type="button" onclick={exportNow} disabled={busy} data-testid="export">
	{label ?? t('data.export')}
</button>
