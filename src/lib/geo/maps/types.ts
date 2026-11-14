export interface MapShape {
	/** Area name (district / region), matched to collection regions by name. */
	name: string;
	/** SVG path data in the map's viewBox coordinates. */
	d: string;
}

export interface RegionMapData {
	viewBox: string;
	/** Data source to credit (shown under the map and in Settings). */
	attribution: string;
	license: string;
	shapes: MapShape[];
}
