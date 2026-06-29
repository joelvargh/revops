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
			.input(
				z.object({ regionId: z.string(), cellSize: z.number().optional() })
			)
			.handler(async ({ input }) => {
				const { createPrismaClient } = await import("@revops/db");
				const prisma = createPrismaClient();
				if (input.cellSize) {
					await prisma.region.update({
						where: { id: input.regionId },
						data: { cellSize: input.cellSize },
					});
				}
				const region = await prisma.region.findUniqueOrThrow({
					where: { id: input.regionId },
				});

				if (!region.polygon) {
					throw new Error(
						"Region has no boundary polygon. Upload one in Settings > Geography."
					);
				}

				const { generateClippedCells } = await import("@revops/db/geo-utils");
				const bbox: [number, number, number, number] = [
					region.bboxWest,
					region.bboxSouth,
					region.bboxEast,
					region.bboxNorth,
				];

				const cells = generateClippedCells(
					{
						type: "Feature",
						geometry: region.polygon as
							| import("@turf/helpers").Polygon
							| import("@turf/helpers").MultiPolygon,
						properties: {},
					},
					bbox,
					region.cellSize
				);

				await prisma.gridCell.deleteMany({ where: { regionId: region.id } });
				await prisma.gridCell.createMany({
					data: cells.map((c) => ({
						regionId: region.id,
						row: c.row,
						col: c.col,
						geometry: c.geometry,
						bboxSouth: c.bboxSouth,
						bboxWest: c.bboxWest,
						bboxNorth: c.bboxNorth,
						bboxEast: c.bboxEast,
					})),
					skipDuplicates: true,
				});
				await prisma.region.update({
					where: { id: region.id },
					data: { cellsGenerated: true },
				});
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
