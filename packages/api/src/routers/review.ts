import { z } from "zod";

import { protectedProcedure } from "../index";

export const reviewRouter = {
	list: protectedProcedure
		.input(
			z.object({
				page: z.number().int().min(1).default(1),
				perPage: z.number().int().min(1).max(100).default(20),
				search: z.string().optional(),
			})
		)
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			const { page, perPage, search } = input;
			const where: object = search
				? {
						status: "ICP_REVIEW_PENDING",
						name: { contains: search, mode: "insensitive" },
					}
				: { status: "ICP_REVIEW_PENDING" };
			const [data, total] = await Promise.all([
				prisma.company.findMany({
					where,
					orderBy: { scoreTotal: "desc" },
					skip: (page - 1) * perPage,
					take: perPage,
					select: {
						id: true,
						name: true,
						city: true,
						state: true,
						industry: true,
						employeeCount: true,
						revenueMm: true,
						scoreTotal: true,
						scoreBreakdown: true,
					},
				}),
				prisma.company.count({ where }),
			]);
			return { data, total, pageCount: Math.ceil(total / perPage) };
		}),

	queue: protectedProcedure
		.input(
			z
				.object({ limit: z.number().int().min(1).max(50).default(20) })
				.optional()
		)
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.company.findMany({
				where: { status: "ICP_REVIEW_PENDING" },
				orderBy: { scoreTotal: "desc" },
				take: input?.limit ?? 20,
				select: {
					id: true,
					name: true,
					city: true,
					state: true,
					category: true,
					website: true,
					industry: true,
					employeeCount: true,
					revenueMm: true,
					scoreTotal: true,
					scoreBreakdown: true,
					discoveredAt: true,
				},
			});
		}),

	approve: protectedProcedure
		.input(z.object({ companyId: z.string(), note: z.string().optional() }))
		.handler(async ({ context, input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.company.update({
				where: { id: input.companyId },
				data: {
					status: "ICP_REVIEW_APPROVED",
					reviewedBy: context.session?.user?.id,
					reviewedAt: new Date(),
					reviewNote: input.note,
				},
			});
		}),

	reject: protectedProcedure
		.input(z.object({ companyId: z.string(), note: z.string().optional() }))
		.handler(async ({ context, input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.company.update({
				where: { id: input.companyId },
				data: {
					status: "ICP_REVIEW_REJECTED",
					reviewedBy: context.session?.user?.id,
					reviewedAt: new Date(),
					reviewNote: input.note,
				},
			});
		}),

	count: protectedProcedure.handler(async () => {
		const { createPrismaClient } = await import("@revops/db");
		const prisma = createPrismaClient();
		return prisma.company.count({ where: { status: "ICP_REVIEW_PENDING" } });
	}),

	bulkApprove: protectedProcedure
		.input(z.object({ companyIds: z.array(z.string()) }))
		.handler(async ({ context, input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.company.updateMany({
				where: { id: { in: input.companyIds }, status: "ICP_REVIEW_PENDING" },
				data: {
					status: "ICP_REVIEW_APPROVED",
					reviewedBy: context.session?.user?.id,
					reviewedAt: new Date(),
				},
			});
		}),

	bulkReject: protectedProcedure
		.input(z.object({ companyIds: z.array(z.string()) }))
		.handler(async ({ context, input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.company.updateMany({
				where: { id: { in: input.companyIds }, status: "ICP_REVIEW_PENDING" },
				data: {
					status: "ICP_REVIEW_REJECTED",
					reviewedBy: context.session?.user?.id,
					reviewedAt: new Date(),
				},
			});
		}),
};
