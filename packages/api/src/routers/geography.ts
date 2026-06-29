import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { adminProcedure, protectedProcedure } from "../index";

export const geographyRouter = {
	countries: {
		list: protectedProcedure.handler(async ({ context }) =>
			context.prisma.country.findMany({
				orderBy: { name: "asc" },
				include: { _count: { select: { regions: true } } },
			})
		),

		create: adminProcedure
			.input(
				z.object({
					name: z.string().min(1),
					code: z.string().min(2).max(3).toUpperCase(),
				})
			)
			.handler(async ({ context, input }) =>
				context.prisma.country.create({ data: input })
			),

		delete: adminProcedure
			.input(z.object({ countryId: z.string() }))
			.handler(async ({ context, input }) => {
				await context.prisma.country.delete({ where: { id: input.countryId } });
				return { success: true };
			}),
	},

	regions: {
		list: protectedProcedure
			.input(z.object({ countryId: z.string().optional() }))
			.handler(async ({ context, input }) =>
				context.prisma.region.findMany({
					where: input.countryId ? { countryId: input.countryId } : undefined,
					orderBy: { name: "asc" },
					include: { _count: { select: { cells: true } } },
				})
			),

		create: adminProcedure
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
			.handler(async ({ context, input }) =>
				context.prisma.region.create({ data: input })
			),

		generateCells: adminProcedure
			.input(
				z.object({ regionId: z.string(), cellSize: z.number().optional() })
			)
			.handler(async ({ context, input }) => {
				const prisma = context.prisma;

				const region = await prisma.region.findUniqueOrThrow({
					where: { id: input.regionId },
				});

				if (!region.polygon) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Region has no boundary polygon.",
					});
				}

				const { generateClippedCells } = await import("@revops/db/geo-utils");
				const size = input.cellSize ?? region.cellSize;
				const bbox: [number, number, number, number] = [
					region.bboxWest,
					region.bboxSouth,
					region.bboxEast,
					region.bboxNorth,
				];

				const cells = generateClippedCells(
					{
						type: "Feature",
						geometry: region.polygon as never,
						properties: {},
					},
					bbox,
					size
				);

				await prisma.$transaction([
					prisma.gridCell.deleteMany({ where: { regionId: region.id } }),
					prisma.gridCell.createMany({
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
					}),
					prisma.region.update({
						where: { id: region.id },
						data: { cellSize: size, cellsGenerated: true },
					}),
				]);

				return { success: true, cellCount: cells.length };
			}),

		delete: adminProcedure
			.input(z.object({ regionId: z.string() }))
			.handler(async ({ context, input }) => {
				// gridCell rows cascade via schema onDelete:Cascade on region
				await context.prisma.region.delete({ where: { id: input.regionId } });
				return { success: true };
			}),
	},
};
