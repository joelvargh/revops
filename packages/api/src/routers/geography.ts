import { z } from "zod";

import { protectedProcedure } from "../index";

export const geographyRouter = {
	countries: {
		list: protectedProcedure.handler(async () => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.country.findMany({
				orderBy: { name: "asc" },
				include: { _count: { select: { regions: true } } },
			});
		}),

		create: protectedProcedure
			.input(z.object({ name: z.string().min(1), code: z.string().min(1) }))
			.handler(async ({ input }) => {
				const { createPrismaClient } = await import("@revops/db");
				const prisma = createPrismaClient();
				return prisma.country.create({ data: input });
			}),

		delete: protectedProcedure
			.input(z.object({ countryId: z.string() }))
			.handler(async ({ input }) => {
				const { createPrismaClient } = await import("@revops/db");
				const prisma = createPrismaClient();
				await prisma.country.delete({ where: { id: input.countryId } });
				return { success: true };
			}),
	},

	regions: {
		list: protectedProcedure
			.input(z.object({ countryId: z.string().optional() }))
			.handler(async ({ input }) => {
				const { createPrismaClient } = await import("@revops/db");
				const prisma = createPrismaClient();
				return prisma.region.findMany({
					where: input.countryId ? { countryId: input.countryId } : undefined,
					orderBy: { name: "asc" },
					include: { _count: { select: { cells: true } } },
				});
			}),

		create: protectedProcedure
			.input(
				z.object({
					countryId: z.string(),
					name: z.string().min(1),
					code: z.string().min(1),
					bboxSouth: z.number(),
					bboxWest: z.number(),
					bboxNorth: z.number(),
					bboxEast: z.number(),
					cellSize: z.number().optional(),
				})
			)
			.handler(async ({ input }) => {
				const { createPrismaClient } = await import("@revops/db");
				const prisma = createPrismaClient();
				return prisma.region.create({ data: input });
			}),

    generateCells: protectedProcedure
      .input(z.object({ regionId: z.string(), cellSize: z.number().optional() }))
      .handler(async ({ input }) => {
        const { createPrismaClient } = await import("@revops/db");
        const prisma = createPrismaClient();
        if (input.cellSize) {
          await prisma.region.update({ where: { id: input.regionId }, data: { cellSize: input.cellSize } });
        }
        const region = await prisma.region.findUniqueOrThrow({ where: { id: input.regionId } });

        if (!region.polygon) throw new Error("Region has no boundary polygon. Upload one in Settings > Geography.");

        const { default: squareGrid } = await import("@turf/square-grid");
        const { default: intersect } = await import("@turf/intersect");
        const { default: turfArea } = await import("@turf/area");
        const { featureCollection } = await import("@turf/helpers");

        const bbox: [number, number, number, number] = [region.bboxWest, region.bboxSouth, region.bboxEast, region.bboxNorth];
        const grid = squareGrid(bbox, region.cellSize, { units: "degrees" });
        const statePolygon = { type: "Feature" as const, properties: {}, geometry: region.polygon } as any;
        const cols = Math.ceil((region.bboxEast - region.bboxWest) / region.cellSize);

        const cells = [];
        for (let i = 0; i < grid.features.length; i++) {
          const clipped = intersect(featureCollection([grid.features[i], statePolygon]));
          if (!clipped) continue;
          const fullCellArea = region.cellSize * region.cellSize * 111000 * 111000;
          if (turfArea(clipped) < fullCellArea * 0.01) continue;

          const row = Math.floor(i / cols);
          const col = i % cols;
          const geom = clipped.geometry.type === "MultiPolygon"
            ? { type: "Polygon", coordinates: (clipped.geometry as any).coordinates[0] }
            : clipped.geometry;
          const allCoords = (clipped.geometry as any).coordinates.flat(3) as number[];
          const lngs: number[] = []; const lats: number[] = [];
          for (let j = 0; j < allCoords.length; j++) { (j % 2 === 0 ? lngs : lats).push(allCoords[j]); }

          cells.push({
            regionId: region.id, row, col, geometry: geom,
            bboxSouth: Math.min(...lats), bboxWest: Math.min(...lngs),
            bboxNorth: Math.max(...lats), bboxEast: Math.max(...lngs),
          });
        }

        await prisma.gridCell.deleteMany({ where: { regionId: region.id } });
        await prisma.gridCell.createMany({ data: cells, skipDuplicates: true });
        await prisma.region.update({ where: { id: region.id }, data: { cellsGenerated: true } });
        return { success: true, cellCount: cells.length };
      }),

		delete: protectedProcedure
			.input(z.object({ regionId: z.string() }))
			.handler(async ({ input }) => {
				const { createPrismaClient } = await import("@revops/db");
				const prisma = createPrismaClient();
				await prisma.gridCell.deleteMany({
					where: { regionId: input.regionId },
				});
				await prisma.region.delete({ where: { id: input.regionId } });
				return { success: true };
			}),
	},
};
