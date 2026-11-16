/**
 * Canonical form of a plate used for matching and duplicate detection:
 * uppercase ASCII letters, digits and the German umlauts Ä Ö Ü. Separators (spaces,
 * dashes, dots) and other diacritics are dropped, so "ba-123 ab", "BA123AB" and
 * "BA 123AB" are equal.
 *
 * Umlauts are kept because they are distinct letters on German plates: "MÜ" (Mühldorf)
 * and "MU" (Landkreis München) are different codes.
 */
export function normalizePlate(raw: string): string {
	return raw
		.toUpperCase()
		.replace(/Ä/g, '\u0001')
		.replace(/Ö/g, '\u0002')
		.replace(/Ü/g, '\u0003')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^A-Z0-9\u0001-\u0003]/g, '')
		.replace(/\u0001/g, 'Ä')
		.replace(/\u0002/g, 'Ö')
		.replace(/\u0003/g, 'Ü');
}
