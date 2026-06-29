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
// 0.001 = 0.1% — preserves thin coastal strips and narrow panhandle edges.
const MIN_AREA_FRACTION = 0.001;

/**
 * Clips a single grid rectangle against a state polygon (Polygon or MultiPolygon).
 *
 * For MultiPolygon states (e.g. Florida mainland + Keys + barrier islands),
 * each sub-polygon is intersected separately so no island geography is silently
 * dropped. If the cell overlaps multiple sub-polygons it is returned as a
 * MultiPolygon so Apify can search both areas in one run.
 */
function clipCellAgainstState(
	cell: Feature<Polygon>,
	state: Feature<Polygon | MultiPolygon>
): Feature<Polygon | MultiPolygon> | null {
	if (state.geometry.type === "Polygon") {
		return intersect(featureCollection([cell, state as Feature<Polygon>]));
	}

	// MultiPolygon: intersect each sub-polygon independently
	const parts: Feature<Polygon>[] = [];
	for (const coords of state.geometry.coordinates) {
		const subPoly = feature({ type: "Polygon" as const, coordinates: coords });
		const clipped = intersect(featureCollection([cell, subPoly]));
		if (clipped) {
			parts.push(clipped as Feature<Polygon>);
		}
	}

	if (!parts.length) {
		return null;
	}
	if (parts.length === 1) {
		return parts[0];
	}

	// Cell overlaps multiple disconnected islands — return as MultiPolygon
	return feature({
		type: "MultiPolygon" as const,
		coordinates: parts.map(
			(p) =>
				(p.geometry as { type: "Polygon"; coordinates: number[][][] })
					.coordinates
		),
	});
}

/**
 * Splits a state polygon into rectangular grid cells clipped to the boundary.
 *
 * Generates a grid of (cellSizeDeg × cellSizeDeg) rectangles over the bounding
 * box, intersects each with the state polygon, and drops cells outside or below
 * the sliver threshold. Handles both Polygon and MultiPolygon states so islands
 * and the Florida Keys are fully covered.
 *
 * The stored geometry is passed directly to the Apify scraper as
 * `customGeolocation`, ensuring the scraper searches only within the actual
 * state boundary — no ocean, no neighboring-state overlap.
 */
export function generateClippedCells(
	statePolygon: Feature<Polygon | MultiPolygon>,
	bbox: BBox,
	cellSizeDeg: number
): ClippedCell[] {
	const [west, south, east, north] = bbox;
	// Approximate area of one full unclipped cell (m²)
	const fullCellArea = cellSizeDeg * cellSizeDeg * 111_000 * 111_000;
	const minArea = fullCellArea * MIN_AREA_FRACTION;

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

			const clipped = clipCellAgainstState(cellFeature, statePolygon);
			if (!clipped) {
				col++;
				continue;
			}

			// Drop slivers smaller than 0.1% of a full cell
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
