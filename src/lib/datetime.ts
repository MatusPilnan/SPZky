// Conversions for <input type="datetime-local">, which works in local time
// with the format "YYYY-MM-DDTHH:mm".

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

export function toLocalInputValue(epochMs: number): string {
	const d = new Date(epochMs);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Returns null for empty/invalid input. */
export function fromLocalInputValue(value: string): number | null {
	if (!value) return null;
	const ms = new Date(value).getTime(); // no timezone suffix → parsed as local time
	return Number.isNaN(ms) ? null : ms;
}
