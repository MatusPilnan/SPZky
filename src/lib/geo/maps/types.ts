export interface MapShape {
	/** Area name (district / region), matched to collection regions by name. */
	name: string;
	/** SVG path data in the map's viewBox coordinates. */
	d: string;
}

/**
 * How the map was drawn: Lambert azimuthal equal-area (WGS84 ellipsoid) centred on
 * lon0/lat0, then x' = (x − minX)·scale, y' = (maxY − y)·scale.
 */
export interface MapProjection {
	lon0: number;
	lat0: number;
	minX: number;
	maxY: number;
	scale: number;
}

/**
 * Continents with a frame in scripts/build-continents.mjs; the name is the message
 * `continent.<id>`. Add one here (and its texts) together with its frame.
 */
export type ContinentId = 'europe';

/** A continent on Home: supported countries as shapes, all other land as one background. */
export interface ContinentMapData {
	id: ContinentId;
	viewBox: string;
	/** Supported countries (ISO alpha-2 as in CountryCode) with their outline. */
	countries: { code: string; d: string }[];
	/** All other land in the frame (untracked), one path. */
	land: string;
}

export interface RegionMapData {
	viewBox: string;
	projection: MapProjection;
	/** Data source to credit (shown under the map and in Settings). */
	attribution: string;
	license: string;
	shapes: MapShape[];
}
