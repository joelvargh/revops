import area from "@turf/area";
import {
	type BBox,
	type Feature,
	feature,
	featureCollection,
	type MultiPolygon,
	type Polygon,
} from "@turf/helpers";
import intersect from "@turf/intersect";

export interface ClippedCell {
	bboxEast: number;
	bboxNorth: number;
	bboxSouth: number;
	bboxWest: number;
	col: number;
	/**
	 * Clipped GeoJSON geometry — passed directly to Apify as customGeolocation.
	 * May be MultiPolygon when the cell overlaps two disconnected sub-polygons
	 * (e.g. a cell straddling Florida mainland and an offshore island).
	 */
	geometry:
		| { type: "Polygon"; coordinates: number[][][] }
		| { type: "MultiPolygon"; coordinates: number[][][][] };
	row: number;
}

// Minimum fraction of a full cell area to keep.
// 0.0001 = 0.01% — preserves narrow coastal peninsulas and barrier island strips.
const MIN_AREA_FRACTION = 0.0001;

/**
 * Clips a single grid rectangle against a state polygon.
 * subBboxes is pre-computed once per state to skip impossible intersections.
 */
function clipCellAgainstState(
	cell: Feature<Polygon>,
	state: Feature<Polygon | MultiPolygon>,
	subBboxes: [number, number, number, number][] | undefined
): Feature<Polygon | MultiPolygon> | null {
	if (state.geometry.type === "Polygon") {
		return intersect(featureCollection([cell, state as Feature<Polygon>]));
	}

	const ring = cell.geometry.coordinates[0];
	const cW = ring[0][0];
	const cS = ring[0][1];
	const cE = ring[2][0];
	const cN = ring[2][1];

	const parts: Feature<Polygon>[] = [];
	const coordsList = state.geometry.coordinates;
	for (let i = 0; i < coordsList.length; i++) {
		if (subBboxes) {
			const [minLng, minLat, maxLng, maxLat] = subBboxes[i];
			if (maxLng < cW || minLng > cE || maxLat < cS || minLat > cN) {
				continue;
			}
		}
		const subPoly = feature({
			type: "Polygon" as const,
			coordinates: coordsList[i],
		});
		const clipped = intersect(featureCollection([cell, subPoly]));
		if (clipped) {
			// intersect can return MultiPolygon if the sub-polygon has holes/complex shape
			if (clipped.geometry.type === "MultiPolygon") {
				for (const coords of clipped.geometry.coordinates) {
					parts.push(
						feature({ type: "Polygon" as const, coordinates: coords })
					);
				}
			} else {
				parts.push(clipped as Feature<Polygon>);
			}
		}
	}

	if (!parts.length) {
		return null;
	}
	if (parts.length === 1) {
		return parts[0];
	}

	return feature({
		type: "MultiPolygon" as const,
		coordinates: parts.map(
			(p) =>
				(p.geometry as { type: "Polygon"; coordinates: number[][][] })
					.coordinates
		),
	});
}

export function generateClippedCells(
	statePolygon: Feature<Polygon | MultiPolygon>,
	bbox: BBox,
	cellSizeDeg: number
): ClippedCell[] {
	const [west, south, east, north] = bbox;

	// Pre-compute sub-polygon bboxes once — skips impossible intersections per cell
	let subBboxes: [number, number, number, number][] | undefined;
	if (statePolygon.geometry.type === "MultiPolygon") {
		subBboxes = statePolygon.geometry.coordinates.map((coords) => {
			const outer = coords[0];
			let minLng = Number.POSITIVE_INFINITY;
			let maxLng = Number.NEGATIVE_INFINITY;
			let minLat = Number.POSITIVE_INFINITY;
			let maxLat = Number.NEGATIVE_INFINITY;
			for (const [lng, lat] of outer) {
				if (lng < minLng) {
					minLng = lng;
				}
				if (lng > maxLng) {
					maxLng = lng;
				}
				if (lat < minLat) {
					minLat = lat;
				}
				if (lat > maxLat) {
					maxLat = lat;
				}
			}
			return [minLng, minLat, maxLng, maxLat];
		});
	}

	const cells: ClippedCell[] = [];
	let row = 0;

	for (let lat = south; lat < north; lat += cellSizeDeg) {
		let col = 0;
		for (let lng = west; lng < east; lng += cellSizeDeg) {
			const cellSouth = lat;
			const cellNorth = Math.min(lat + cellSizeDeg, north);
			const cellWest = lng;
			const cellEast = Math.min(lng + cellSizeDeg, east);

			const cellFeature = feature({
				type: "Polygon" as const,
				coordinates: [
					[
						[cellWest, cellSouth],
						[cellEast, cellSouth],
						[cellEast, cellNorth],
						[cellWest, cellNorth],
						[cellWest, cellSouth],
					],
				],
			});

			// Use actual cell area (not flat-earth approx) for accurate threshold
			const cellArea = area(cellFeature);
			const minArea = cellArea * MIN_AREA_FRACTION;

			const clipped = clipCellAgainstState(
				cellFeature,
				statePolygon,
				subBboxes
			);
			if (!clipped) {
				col++;
				continue;
			}

			if (area(clipped) < minArea) {
				col++;
				continue;
			}

			let geom: ClippedCell["geometry"];
			let coords: number[][];

			if (clipped.geometry.type === "MultiPolygon") {
				geom = clipped.geometry as {
					type: "MultiPolygon";
					coordinates: number[][][][];
				};
				coords = clipped.geometry.coordinates.flat(2) as number[][];
			} else {
				geom = clipped.geometry as {
					type: "Polygon";
					coordinates: number[][][];
				};
				coords = clipped.geometry.coordinates.flat(1) as number[][];
			}

			const lngs = coords.map((c) => c[0]);
			const lats = coords.map((c) => c[1]);

			cells.push({
				row,
				col,
				geometry: geom,
				bboxSouth: Math.min(...lats),
				bboxWest: Math.min(...lngs),
				bboxNorth: Math.max(...lats),
				bboxEast: Math.max(...lngs),
			});

			col++;
		}
		row++;
	}

	return cells;
}
