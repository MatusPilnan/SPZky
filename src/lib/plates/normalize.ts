/**
 * Cyrillic (UA, BG, RS) and Greek letters that look like Latin ones and are the only ones
 * those plates use; a plate typed in either script normalises to the same Latin form.
 */
const LOOKALIKES: Record<string, string> = {
	// Cyrillic
	А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', У: 'Y', Х: 'X', І: 'I',
	// Greek
	Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X'
};

/**
 * Letters with diacritics that are letters of their own on plates and are kept:
 * German umlauts (MÜ Mühldorf ≠ MU München) and Serbian Č Ć Š Ž Đ (BČ Bečej ≠ BĆ Bogatić).
 */
const KEPT = 'ÄÖÜČĆŠŽĐ';

/**
 * Canonical form of a plate used for matching and duplicate detection: uppercase ASCII
 * letters, digits and the letters in KEPT. Separators (spaces, dashes, dots) and other
 * diacritics are dropped, so "ba-123 ab", "BA123AB" and "BA 123AB" are equal.
 */
export function normalizePlate(raw: string): string {
	const upper = raw.toUpperCase().replace(/[АВЕКМНОРСТУХІΑΒΕΖΗΙΚΜΝΟΡΤΥΧ]/g, (c) => LOOKALIKES[c]);
	let out = '';
	for (const ch of upper) {
		if (KEPT.includes(ch)) out += ch;
		else out += ch.normalize('NFD').replace(/\p{Diacritic}/gu, '');
	}
	return out.replace(/[^A-Z0-9ÄÖÜČĆŠŽĐ]/g, '');
}

/** Folds the kept letters to plain ASCII (Č→C, Ü→U…), e.g. to match codes typed without them. */
export function foldPlate(normalized: string): string {
	return normalized.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/Đ/g, 'D');
}
