// Minimal collection registry. Phase 2 extends each entry with plate patterns
// and the full list of regions (codes, names, map ids).
export interface CollectionInfo {
	id: 'sk' | 'cz' | 'cz-vintage';
	/** ISO country code shown in the plate's EU band. */
	country: 'SK' | 'CZ';
	flag: string;
}

export const collections: CollectionInfo[] = [
	{ id: 'sk', country: 'SK', flag: '🇸🇰' },
	{ id: 'cz', country: 'CZ', flag: '🇨🇿' },
	{ id: 'cz-vintage', country: 'CZ', flag: '🇨🇿' }
];

export function getCollection(id: string): CollectionInfo | undefined {
	return collections.find((c) => c.id === id);
}
