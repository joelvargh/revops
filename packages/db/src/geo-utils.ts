import squareGrid from "@turf/square-grid";
import intersect from "@turf/intersect";
import area from "@turf/area";
import { type Feature, type Polygon, type MultiPolygon, type BBox, featureCollection } from "@turf/helpers";

export interface ClippedCell {
  row: number;
  col: number;
  geometry: { type: "Polygon"; coordinates: number[][][] };
  bboxSouth: number;
  bboxWest: number;
  bboxNorth: number;
  bboxEast: number;
}

/**
 * Splits a state polygon into ~targetCount clipped sub-polygons using grid intersection.
 * Each resulting polygon is a piece of the state with no ocean/cross-border overlap.
 */
export function generateClippedCells(
  statePolygon: Feature<Polygon | MultiPolygon>,
  bbox: BBox,
  cellSizeDeg: number,
): ClippedCell[] {
  // Generate square grid over bbox
  const grid = squareGrid(bbox, cellSizeDeg, { units: "degrees" });

  const cells: ClippedCell[] = [];
  let row = 0;
  let col = 0;
  const cols = Math.ceil((bbox[2] - bbox[0]) / cellSizeDeg);

  for (let i = 0; i < grid.features.length; i++) {
    const cell = grid.features[i];
    col = i % cols;
    row = Math.floor(i / cols);

    // Intersect grid cell with state polygon
    const clipped = intersect(featureCollection([cell, statePolygon as Feature<Polygon>]));
    if (!clipped) continue; // Cell entirely outside state

    // Skip tiny slivers (< 1% of a full cell area)
    const fullCellArea = cellSizeDeg * cellSizeDeg * 111000 * 111000; // approx m²
    if (area(clipped) < fullCellArea * 0.01) continue;

    // Get bbox of the clipped polygon
    const coords = clipped.geometry.coordinates.flat(2) as number[];
    const lngs = coords.filter((_, i) => i % 2 === 0);
    const lats = coords.filter((_, i) => i % 2 === 1);

    // Ensure we have a Polygon (not MultiPolygon)
    let geom: { type: "Polygon"; coordinates: number[][][] };
    if (clipped.geometry.type === "MultiPolygon") {
      // Take the largest polygon from the multi
      const polys = clipped.geometry.coordinates;
      geom = { type: "Polygon", coordinates: polys[0] };
    } else {
      geom = clipped.geometry as { type: "Polygon"; coordinates: number[][][] };
    }

    cells.push({
      row,
      col,
      geometry: geom,
      bboxSouth: Math.min(...lats),
      bboxWest: Math.min(...lngs),
      bboxNorth: Math.max(...lats),
      bboxEast: Math.max(...lngs),
    });
  }

  return cells;
}
