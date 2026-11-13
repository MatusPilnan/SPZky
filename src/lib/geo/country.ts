import { borders, type CountryShape, type Ring } from './borders';

export type CountryCode = 'SK' | 'CZ';

type BBox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

function bboxOf(shape: CountryShape): BBox {
	const box: BBox = [Infinity, Infinity, -Infinity, -Infinity];
	for (const polygon of shape)
		for (const [lng, lat] of polygon[0]) {
			box[0] = Math.min(box[0], lng);
			box[1] = Math.min(box[1], lat);
			box[2] = Math.max(box[2], lng);
			box[3] = Math.max(box[3], lat);
		}
	return box;
}

const index = Object.entries(borders).map(([code, shape]) => ({ code: code as CountryCode, shape, bbox: bboxOf(shape) }));

/** Ray casting; points exactly on an edge may go either way, which is fine here. */
function inRing(lng: number, lat: number, ring: Ring): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

function inShape(lng: number, lat: number, shape: CountryShape): boolean {
	return shape.some(([outer, ...holes]) => inRing(lng, lat, outer) && !holes.some((h) => inRing(lng, lat, h)));
}

/**
 * Supported country containing the point, or null (abroad / unknown). Works
 * offline with the bundled outlines. Bounding boxes alone are not enough
 * because the SK and CZ boxes overlap.
 */
export function countryAt(lat: number, lng: number): CountryCode | null {
	for (const { code, shape, bbox } of index) {
		if (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3]) continue;
		if (inShape(lng, lat, shape)) return code;
	}
	return null;
}
