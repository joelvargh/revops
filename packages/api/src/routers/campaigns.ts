import { z } from "zod";

import { protectedProcedure } from "../index";

export const campaignsRouter = {
	list: protectedProcedure.handler(async () => {
		const { createPrismaClient } = await import("@revops/db");
		const prisma = createPrismaClient();
		const campaigns = await prisma.campaign.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				regions: {
					include: {
						region: {
							select: {
								name: true,
								code: true,
								bboxSouth: true,
								bboxWest: true,
								bboxNorth: true,
								bboxEast: true,
							},
						},
					},
				},
				_count: { select: { discoveryRuns: true } },
			},
		});

		// Get run stats per campaign
		const result = await Promise.all(
			campaigns.map(async (c) => {
				const stats = await prisma.discoveryRun.groupBy({
					by: ["status"],
					where: { campaignId: c.id },
					_count: true,
				});
				const statusCounts = Object.fromEntries(
					stats.map((s) => [s.status, s._count])
				);
				return {
					...c,
					stats: {
						total: c._count.discoveryRuns,
						completed: statusCounts.COMPLETED ?? 0,
						running: statusCounts.RUNNING ?? 0,
						pending: statusCounts.PENDING ?? 0,
						failed: statusCounts.FAILED ?? 0,
					},
				};
			})
		);
		return result;
	}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1),
				searchTerm: z.string().min(1),
				regionId: z.string(),
				cellSize: z.number().optional(),
				source: z.string().default("google_maps"),
			})
		)
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();

			// Create campaign + link region
			const campaign = await prisma.campaign.create({
				data: {
					name: input.name,
					searchTerm: input.searchTerm,
					source: input.source,
					regions: { create: { regionId: input.regionId } },
				},
			});

			// Generate grid cells for region if not already done
			const region = await prisma.region.findUniqueOrThrow({
				where: { id: input.regionId },
			});
			if (!region.cellsGenerated) {
				const size = input.cellSize ?? region.cellSize;
				if (input.cellSize) {
					await prisma.region.update({
						where: { id: region.id },
						data: { cellSize: input.cellSize },
					});
				}
				const { generateClippedCells } = await import("@revops/db/geo-utils");
				const bbox: [number, number, number, number] = [
					region.bboxWest,
					region.bboxSouth,
					region.bboxEast,
					region.bboxNorth,
				];
				const clippedCells = generateClippedCells(
					{
						type: "Feature",
						geometry: region.polygon as
							| import("@turf/helpers").Polygon
							| import("@turf/helpers").MultiPolygon,
						properties: {},
					},
					bbox,
					size
				);
				await prisma.gridCell.createMany({
					data: clippedCells.map((c) => ({
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
				});
				await prisma.region.update({
					where: { id: region.id },
					data: { cellsGenerated: true },
				});
			}

			// Create discovery runs for each cell, snapshotting bbox + geometry
			const cells = await prisma.gridCell.findMany({
				where: { regionId: input.regionId },
			});
			await prisma.discoveryRun.createMany({
				data: cells.map((cell) => ({
					campaignId: campaign.id,
					gridCellId: cell.id,
					bboxSouth: cell.bboxSouth,
					bboxWest: cell.bboxWest,
					bboxNorth: cell.bboxNorth,
					bboxEast: cell.bboxEast,
					geometry: cell.geometry,
				})),
				skipDuplicates: true,
			});

			return campaign;
		}),

	detail: protectedProcedure
		.input(z.object({ campaignId: z.string() }))
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			const campaign = await prisma.campaign.findUniqueOrThrow({
				where: { id: input.campaignId },
				include: { regions: { include: { region: true } } },
			});
			const stats = await prisma.discoveryRun.groupBy({
				by: ["status"],
				where: { campaignId: input.campaignId },
				_count: true,
			});
			const statusCounts = Object.fromEntries(
				stats.map((s) => [s.status, s._count])
			);
			const total = stats.reduce((sum, s) => sum + s._count, 0);
			return {
				...campaign,
				discoveryRunStats: {
					total,
					pending: statusCounts.PENDING ?? 0,
					completed: statusCounts.COMPLETED ?? 0,
					failed: statusCounts.FAILED ?? 0,
				},
			};
		}),

	update: protectedProcedure
		.input(z.object({ campaignId: z.string(), name: z.string().min(1) }))
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.campaign.update({
				where: { id: input.campaignId },
				data: { name: input.name },
			});
		}),

	updateStatus: protectedProcedure
		.input(
			z.object({
				campaignId: z.string(),
				status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]),
			})
		)
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.campaign.update({
				where: { id: input.campaignId },
				data: { status: input.status },
			});
		}),

	delete: protectedProcedure
		.input(z.object({ campaignId: z.string() }))
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			await prisma.company.updateMany({
				where: { campaignId: input.campaignId },
				data: { campaignId: null },
			});
			await prisma.discoveryRun.deleteMany({
				where: { campaignId: input.campaignId },
			});
			await prisma.campaignRegion.deleteMany({
				where: { campaignId: input.campaignId },
			});
			await prisma.campaign.delete({ where: { id: input.campaignId } });
			return { success: true };
		}),

	// Returns ALL grid cells for the campaign's regions, with the latest discovery run
	// status merged in. Cells with no run get status PENDING so the full state grid is visible.
	gridCells: protectedProcedure
		.input(z.object({ campaignId: z.string() }))
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();

			// 1. Resolve which regions this campaign covers
			const campaignRegions = await prisma.campaignRegion.findMany({
				where: { campaignId: input.campaignId },
				select: { regionId: true },
			});
			const regionIds = campaignRegions.map((cr) => cr.regionId);

			// 2. Fetch every grid cell for those regions
			const allCells = await prisma.gridCell.findMany({
				where: { regionId: { in: regionIds } },
				select: {
					id: true,
					row: true,
					col: true,
					bboxSouth: true,
					bboxWest: true,
					bboxNorth: true,
					bboxEast: true,
					geometry: true,
				},
			});

			// 3. Fetch all runs for this campaign so we can merge status per cell
			const runs = await prisma.discoveryRun.findMany({
				where: { campaignId: input.campaignId },
				select: {
					gridCellId: true,
					status: true,
					resultsFound: true,
					resultsNew: true,
				},
			});

			// Build a map of cellId → run (prefer COMPLETED > RUNNING > FAILED > PENDING)
			const STATUS_PRIORITY: Record<string, number> = {
				COMPLETED: 4,
				RUNNING: 3,
				FAILED: 2,
				PENDING: 1,
			};
			const runByCellId = new Map<
				string,
				{ status: string; resultsFound: number; resultsNew: number }
			>();
			for (const run of runs) {
				if (!run.gridCellId) {
					continue;
				}
				const existing = runByCellId.get(run.gridCellId);
				if (
					!existing ||
					(STATUS_PRIORITY[run.status] ?? 0) >
						(STATUS_PRIORITY[existing.status] ?? 0)
				) {
					runByCellId.set(run.gridCellId, {
						status: run.status,
						resultsFound: run.resultsFound,
						resultsNew: run.resultsNew,
					});
				}
			}

			// 4. Merge: every cell gets a status (PENDING if no run yet)
			return allCells.map((cell) => {
				const run = runByCellId.get(cell.id);
				return {
					id: cell.id,
					row: cell.row,
					col: cell.col,
					bboxSouth: cell.bboxSouth,
					bboxWest: cell.bboxWest,
					bboxNorth: cell.bboxNorth,
					bboxEast: cell.bboxEast,
					geometry: cell.geometry,
					status: run?.status ?? "PENDING",
					resultsFound: run?.resultsFound ?? 0,
					resultsNew: run?.resultsNew ?? 0,
				};
			});
		}),

	regions: protectedProcedure.handler(async () => {
		const { createPrismaClient } = await import("@revops/db");
		const prisma = createPrismaClient();
		return prisma.region.findMany({
			include: { country: { select: { code: true } } },
			orderBy: { name: "asc" },
		});
	}),

	// Heatmap: avg score per discovery run for a campaign
	heatmap: protectedProcedure
		.input(z.object({ campaignId: z.string() }))
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();

			const runs = await prisma.discoveryRun.findMany({
				where: {
					campaignId: input.campaignId,
					status: "COMPLETED",
					bboxSouth: { not: null },
				},
				select: {
					id: true,
					bboxSouth: true,
					bboxWest: true,
					bboxNorth: true,
					bboxEast: true,
					gridCell: { select: { row: true, col: true } },
				},
			});

			const result = await Promise.all(
				runs
					.filter(
						(
							run
						): run is typeof run & {
							bboxSouth: number;
							bboxNorth: number;
							bboxWest: number;
							bboxEast: number;
						} =>
							run.bboxSouth !== null &&
							run.bboxNorth !== null &&
							run.bboxWest !== null &&
							run.bboxEast !== null
					)
					.map(async (run) => {
						const avgScore = await prisma.company.aggregate({
							where: {
								campaignId: input.campaignId,
								lat: { gte: run.bboxSouth, lte: run.bboxNorth },
								lng: { gte: run.bboxWest, lte: run.bboxEast },
								scoreTotal: { not: null },
							},
							_avg: { scoreTotal: true },
							_count: true,
						});
						return {
							row: run.gridCell?.row ?? null,
							col: run.gridCell?.col ?? null,
							bboxSouth: run.bboxSouth,
							bboxWest: run.bboxWest,
							bboxNorth: run.bboxNorth,
							bboxEast: run.bboxEast,
							avgScore: avgScore._avg.scoreTotal ?? 0,
							count: avgScore._count,
						};
					})
			);
			return result;
		}),
};
