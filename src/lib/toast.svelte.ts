export interface Toast {
	id: number;
	text: string;
	kind: 'info' | 'success' | 'celebrate';
	action?: { label: string; run: () => void };
}

let nextId = 1;
/** Older toasts are dropped so rapid quick-taps don't stack up over the screen. */
const MAX_VISIBLE = 2;

export const toasts: Toast[] = $state([]);

export function showToast(toast: Omit<Toast, 'id'>, durationMs = 4000): number {
	const id = nextId++;
	toasts.push({ ...toast, id });
	if (toasts.length > MAX_VISIBLE) toasts.splice(0, toasts.length - MAX_VISIBLE);
	setTimeout(() => dismissToast(id), durationMs);
	return id;
}

export function dismissToast(id: number) {
	const index = toasts.findIndex((t) => t.id === id);
	if (index !== -1) toasts.splice(index, 1);
}
