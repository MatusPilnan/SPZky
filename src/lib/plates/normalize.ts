/**
 * Canonical form of a plate used for matching and duplicate detection:
 * uppercase ASCII letters and digits only. Separators (spaces, dashes, dots)
 * and diacritics are dropped, so "ba-123 ab", "BA123AB" and "BA 123AB" are equal.
 */
export function normalizePlate(raw: string): string {
	return raw
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '');
}
