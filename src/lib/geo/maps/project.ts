// Places a lat/lng on a generated region map (offline location pin). The maps were
// projected by mapshaper with `+proj=laea +datum=WGS84` (scripts/build-maps.mjs); this is
// the same projection: Lambert azimuthal equal-area on the WGS84 ellipsoid (Snyder 1987,
// "Map Projections – A Working Manual", eqs. 3-12, 24-11…24-13).

import type { MapProjection } from './types';

const A = 6378137;
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const E = Math.sqrt(E2);
const RAD = Math.PI / 180;

function q(sinPhi: number): number {
	return (1 - E2) * (sinPhi / (1 - E2 * sinPhi * sinPhi) - (1 / (2 * E)) * Math.log((1 - E * sinPhi) / (1 + E * sinPhi)));
}

const QP = q(1);
const RQ = A * Math.sqrt(QP / 2);

/** Projected metres (x east, y north) for the projection centred on lon0/lat0. */
export function laea(lat: number, lng: number, lat0: number, lon0: number): [number, number] {
	const sinPhi1 = Math.sin(lat0 * RAD);
	const beta1 = Math.asin(q(sinPhi1) / QP);
	const beta = Math.asin(Math.max(-1, Math.min(1, q(Math.sin(lat * RAD)) / QP)));
	const m1 = Math.cos(lat0 * RAD) / Math.sqrt(1 - E2 * sinPhi1 * sinPhi1);
	const d = (A * m1) / (RQ * Math.cos(beta1));
	const dLon = (lng - lon0) * RAD;
	const b = RQ * Math.sqrt(2 / (1 + Math.sin(beta1) * Math.sin(beta) + Math.cos(beta1) * Math.cos(beta) * Math.cos(dLon)));
	const x = b * d * Math.cos(beta) * Math.sin(dLon);
	const y = (b / d) * (Math.cos(beta1) * Math.sin(beta) - Math.sin(beta1) * Math.cos(beta) * Math.cos(dLon));
	return [x, y];
}

/** A point in the map's viewBox coordinates. */
export function projectToMap(p: MapProjection, lat: number, lng: number): { x: number; y: number } {
	const [x, y] = laea(lat, lng, p.lat0, p.lon0);
	return { x: (x - p.minX) * p.scale, y: (p.maxY - y) * p.scale };
}

/** Metres → viewBox units (for drawing the accuracy circle). */
export function metresToMap(p: MapProjection, metres: number): number {
	return metres * p.scale;
}
