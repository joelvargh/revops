import { z } from "zod";

import { protectedProcedure } from "../index";

export const campaignsRouter = {
	list: protectedProcedure.handler(async ({ context }) => {
		const prisma = context.prisma;
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

		// Single groupBy instead of N+1 per campaign
		const campaignIds = campaigns.map((c) => c.id);
		const allStats = await prisma.discoveryRun.groupBy({
			by: ["campaignId", "status"],
			where: { campaignId: { in: campaignIds } },
			_count: true,
		});

		const statsByCampaign = new Map<string, Record<string, number>>();
		for (const s of allStats) {
			const map = statsByCampaign.get(s.campaignId) ?? {};
			map[s.status] = s._count;
			statsByCampaign.set(s.campaignId, map);
		}

		return campaigns.map((c) => {
			const counts = statsByCampaign.get(c.id) ?? {};
			return {
				...c,
				stats: {
					total: c._count.discoveryRuns,
					completed: counts.COMPLETED ?? 0,
					running: counts.RUNNING ?? 0,
					pending: counts.PENDING ?? 0,
					failed: counts.FAILED ?? 0,
				},
			};
		});
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
		.handler(async ({ context, input }) => {
			const prisma = context.prisma;

			const region = await prisma.region.findUniqueOrThrow({
				where: { id: input.regionId },
			});

			// Generate cells if not already done
			if (!region.cellsGenerated) {
				if (!region.polygon) {
					const { ORPCError } = await import("@orpc/server");
					throw new ORPCError("BAD_REQUEST", {
						message:
							"Region has no boundary polygon. Generate cells first in Settings > Geography.",
					});
				}
				const size = input.cellSize ?? region.cellSize;
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
						geometry: region.polygon as never,
						properties: {},
					},
					bbox,
					size
				);
				await prisma.$transaction([
					prisma.gridCell.createMany({
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
					}),
					prisma.region.update({
						where: { id: region.id },
						data: { cellSize: size, cellsGenerated: true },
					}),
				]);
			}

			// Create campaign + runs in a transaction
			const cells = await prisma.gridCell.findMany({
				where: { regionId: input.regionId },
				select: {
					id: true,
					bboxSouth: true,
					bboxWest: true,
					bboxNorth: true,
					bboxEast: true,
					geometry: true,
				},
			});

			const campaign = await prisma.$transaction(async (tx) => {
				const c = await tx.campaign.create({
					data: {
						name: input.name,
						searchTerm: input.searchTerm,
						source: input.source,
						regions: { create: { regionId: input.regionId } },
					},
				});
				await tx.discoveryRun.createMany({
					data: cells.map((cell) => ({
						campaignId: c.id,
						gridCellId: cell.id,
						bboxSouth: cell.bboxSouth,
						bboxWest: cell.bboxWest,
						bboxNorth: cell.bboxNorth,
						bboxEast: cell.bboxEast,
						geometry: cell.geometry,
					})),
					skipDuplicates: true,
				});
				return c;
			});

			return campaign;
		}),

	detail: protectedProcedure
		.input(z.object({ campaignId: z.string() }))
		.handler(async ({ context, input }) => {
			const prisma = context.prisma;
			const [campaign, stats] = await Promise.all([
				prisma.campaign.findUniqueOrThrow({
					where: { id: input.campaignId },
					include: { regions: { include: { region: true } } },
				}),
				prisma.discoveryRun.groupBy({
					by: ["status"],
					where: { campaignId: input.campaignId },
					_count: true,
				}),
			]);
			const statusCounts = Object.fromEntries(
				stats.map((s) => [s.status, s._count])
			);
			return {
				...campaign,
				discoveryRunStats: {
					total: stats.reduce((sum, s) => sum + s._count, 0),
					pending: statusCounts.PENDING ?? 0,
					completed: statusCounts.COMPLETED ?? 0,
					failed: statusCounts.FAILED ?? 0,
				},
			};
		}),

	update: protectedProcedure
		.input(z.object({ campaignId: z.string(), name: z.string().min(1) }))
		.handler(async ({ context, input }) =>
			context.prisma.campaign.update({
				where: { id: input.campaignId },
				data: { name: input.name },
			})
		),

	updateStatus: protectedProcedure
		.input(
			z.object({
				campaignId: z.string(),
				status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]),
			})
		)
		.handler(async ({ context, input }) =>
			context.prisma.campaign.update({
				where: { id: input.campaignId },
				data: { status: input.status },
			})
		),

	delete: protectedProcedure
		.input(z.object({ campaignId: z.string() }))
		.handler(async ({ context, input }) => {
			// Cascade delete handles discoveryRun + campaignRegion via schema onDelete:Cascade
			// Just detach companies first (no cascade on company.campaignId)
			await context.prisma.company.updateMany({
				where: { campaignId: input.campaignId },
				data: { campaignId: null },
			});
			await context.prisma.campaign.delete({ where: { id: input.campaignId } });
			return { success: true };
		}),

	gridCells: protectedProcedure
		.input(z.object({ campaignId: z.string() }))
		.handler(async ({ context, input }) => {
			const prisma = context.prisma;

			const [campaignRegions, runs] = await Promise.all([
				prisma.campaignRegion.findMany({
					where: { campaignId: input.campaignId },
					select: { regionId: true },
				}),
				prisma.discoveryRun.findMany({
					where: { campaignId: input.campaignId },
					select: {
						gridCellId: true,
						status: true,
						resultsFound: true,
						resultsNew: true,
					},
				}),
			]);

			const regionIds = campaignRegions.map((cr) => cr.regionId);
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

			return allCells.map((cell) => {
				const run = runByCellId.get(cell.id);
				return {
					...cell,
					status: run?.status ?? "PENDING",
					resultsFound: run?.resultsFound ?? 0,
					resultsNew: run?.resultsNew ?? 0,
				};
			});
		}),

	heatmap: protectedProcedure
		.input(z.object({ campaignId: z.string() }))
		.handler(async ({ context, input }) => {
			const prisma = context.prisma;
			const runs = await prisma.discoveryRun.findMany({
				where: {
					campaignId: input.campaignId,
					status: "COMPLETED",
					bboxSouth: { not: null },
				},
				select: {
					bboxSouth: true,
					bboxWest: true,
					bboxNorth: true,
					bboxEast: true,
					gridCell: { select: { row: true, col: true } },
				},
			});

			const validRuns = runs.filter(
				(
					r
				): r is typeof r & {
					bboxSouth: number;
					bboxNorth: number;
					bboxWest: number;
					bboxEast: number;
				} =>
					r.bboxSouth !== null &&
					r.bboxNorth !== null &&
					r.bboxWest !== null &&
					r.bboxEast !== null
			);

			// Fetch all scored companies in the campaign once, then group in memory
			const companies = await prisma.company.findMany({
				where: { campaignId: input.campaignId, scoreTotal: { not: null } },
				select: { lat: true, lng: true, scoreTotal: true },
			});

			return validRuns.map((run) => {
				const inCell = companies.filter(
					(c) =>
						c.lat !== null &&
						c.lng !== null &&
						c.lat >= run.bboxSouth &&
						c.lat <= run.bboxNorth &&
						c.lng >= run.bboxWest &&
						c.lng <= run.bboxEast
				);
				const avgScore =
					inCell.length > 0
						? inCell.reduce((sum, c) => sum + (c.scoreTotal ?? 0), 0) /
							inCell.length
						: 0;
				return {
					row: run.gridCell?.row ?? null,
					col: run.gridCell?.col ?? null,
					bboxSouth: run.bboxSouth,
					bboxWest: run.bboxWest,
					bboxNorth: run.bboxNorth,
					bboxEast: run.bboxEast,
					avgScore,
					count: inCell.length,
				};
			});
		}),
};
