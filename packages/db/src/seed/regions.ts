/**
 * Regions seed: loads GADM boundary polygons and generates grid cells for all
 * regions in the database that have a matching state name.
 *
 * Run once after prod seed (or after adding new regions):
 *   bun run src/seed/regions.ts
 */
import dotenv from "dotenv";

dotenv.config({ path: "../../apps/web/.env" });

import { PrismaPg } from "@prisma/adapter-pg";
import type { Feature, MultiPolygon, Polygon } from "@turf/helpers";
import { PrismaClient } from "../../prisma/generated/client";
import { generateClippedCells } from "../geo-utils";

async function main() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is not set");
	}
	const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
	const prisma = new PrismaClient({ adapter });

	const statesGeoJson = await import("../us-states.json");
	const statesData = (statesGeoJson.default ?? statesGeoJson) as {
		features: { properties: { name: string }; geometry: unknown }[];
	};

	console.log("🗺  Regions seed starting…");

	const regions = await prisma.region.findMany({
		include: { country: true, _count: { select: { cells: true } } },
	});

	let totalCells = 0;
	for (const region of regions) {
		const stateFeature = statesData.features.find(
			(f) => f.properties.name === region.name
		);
		if (!stateFeature) {
			console.log(`  ⚠ No GADM polygon found for "${region.name}" — skipping`);
			continue;
		}

		console.log(
			`  → ${region.name} (${region.code}) existing cells: ${region._count.cells}`
		);

		const bbox: [number, number, number, number] = [
			region.bboxWest,
			region.bboxSouth,
			region.bboxEast,
			region.bboxNorth,
		];

		const cells = generateClippedCells(
			stateFeature as Feature<Polygon | MultiPolygon>,
			bbox,
			region.cellSize
		);

		// Store polygon + cells atomically
		await prisma.$transaction([
			prisma.region.update({
				where: { id: region.id },
				data: { polygon: stateFeature.geometry as never, cellsGenerated: true },
			}),
			prisma.gridCell.deleteMany({ where: { regionId: region.id } }),
			prisma.gridCell.createMany({
				data: cells.map((c) => ({
					regionId: region.id,
					row: c.row,
					col: c.col,
					bboxSouth: c.bboxSouth,
					bboxWest: c.bboxWest,
					bboxNorth: c.bboxNorth,
					bboxEast: c.bboxEast,
					geometry: c.geometry,
				})),
				skipDuplicates: true,
			}),
		]);

		console.log(`    ✓ ${cells.length} cells generated`);
		totalCells += cells.length;
	}

	console.log(
		`\n✅ Done: ${totalCells} total cells across ${regions.length} regions`
	);
	await prisma.$disconnect();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
