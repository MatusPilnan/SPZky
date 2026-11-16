/**
 * Saves a text file for the user. In an installed app (standalone display
 * mode) a download link often does nothing (notably iPhone), so the share
 * sheet is used there (save to Files, AirDrop, mail…). Elsewhere: a normal download.
 */
export async function saveTextFile(name: string, text: string, type = 'application/json'): Promise<'saved' | 'cancelled'> {
	const file = new File([text], name, { type });
	const standalone =
		matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
	if (standalone && navigator.canShare?.({ files: [file] })) {
		try {
			await navigator.share({ files: [file] });
			return 'saved';
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
			// share failed for another reason: fall back to a download
		}
	}
	const url = URL.createObjectURL(file);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
	return 'saved';
}
