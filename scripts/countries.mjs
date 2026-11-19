// Supported countries in Natural Earth (world-atlas): ISO 3166-1 numeric code, or the name
// where Natural Earth has no numeric code (Kosovo). Used by build-borders.mjs (GPS country
// lookup) and build-continents.mjs (continent maps on Home). Add a country here when it
// gets a collection.
export const COUNTRIES = {
	SK: '703',
	CZ: '203',
	AT: '040',
	PL: '616',
	DE: '276',
	UA: '804',
	FR: '250',
	BG: '100',
	RO: '642',
	SI: '705',
	RS: '688',
	GR: '300',
	XK: 'Kosovo',
	CH: '756'
};

/** The supported country (our code) of a world-atlas feature, or null. */
export function countryOfFeature(feature) {
	for (const [code, id] of Object.entries(COUNTRIES)) {
		if (/^\d+$/.test(id) ? String(feature.id).padStart(3, '0') === id : feature.properties?.name === id) return code;
	}
	return null;
}
