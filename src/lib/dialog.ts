/**
 * Click handler for a modal <dialog>: closes it when the click lands outside
 * its box (on the darkened backdrop). Clicks on the backdrop are reported on
 * the dialog element itself, so compare the click point with the dialog's box
 * (a click on the dialog's own padding is inside the box and is ignored).
 */
export function closeOnBackdrop(event: MouseEvent & { currentTarget: HTMLDialogElement }) {
	const dialog = event.currentTarget;
	if (event.target !== dialog || !dialog.open) return;
	const r = dialog.getBoundingClientRect();
	const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
	// Keyboard-triggered clicks have no position (0, 0); never close on those.
	if (!inside && (event.clientX !== 0 || event.clientY !== 0)) dialog.close();
}
