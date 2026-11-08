// Without persistent storage, browsers (notably Safari) may evict IndexedDB
// data after a period of inactivity. Ask for it once the user has real data.

export async function isStoragePersisted(): Promise<boolean> {
	return (await navigator.storage?.persisted?.()) ?? false;
}

export async function requestPersistentStorage(): Promise<boolean> {
	if (!navigator.storage?.persist) return false;
	if (await isStoragePersisted()) return true;
	try {
		return await navigator.storage.persist();
	} catch {
		return false;
	}
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
	const estimate = await navigator.storage?.estimate?.();
	if (!estimate || estimate.usage === undefined || estimate.quota === undefined) return null;
	return { usage: estimate.usage, quota: estimate.quota };
}
