// Ray-casting point-in-polygon
export function pointInPolygon(
	point: [number, number],
	polygon: [number, number][]
): boolean {
	const [x, y] = point;
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i];
		const [xj, yj] = polygon[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
			inside = !inside;
		}
	}
	return inside;
}

export function pointInGeometry(
	lng: number,
	lat: number,
	geometry: { type: string; coordinates: unknown }
): boolean {
	if (geometry.type === "Polygon") {
		const coords = geometry.coordinates as number[][][];
		return pointInPolygon([lng, lat], coords[0] as [number, number][]);
	}
	if (geometry.type === "MultiPolygon") {
		const coords = geometry.coordinates as number[][][][];
		return coords.some((poly) =>
			pointInPolygon([lng, lat], poly[0] as [number, number][])
		);
	}
	return false;
}

// Fetch state polygon by name from bundled GeoJSON
let _statesCache: {
	features: {
		properties: { name: string };
		geometry: { type: string; coordinates: unknown };
	}[];
} | null = null;

export async function getStatePolygon(stateName: string) {
	if (!_statesCache) {
		const resp = await fetch(
			"https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json"
		);
		_statesCache = await resp.json();
	}
	return (
		_statesCache?.features.find((f) => f.properties.name === stateName)
			?.geometry ?? null
	);
}
