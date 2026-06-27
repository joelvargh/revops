import { z } from "zod";

import { protectedProcedure } from "../index";

export const leadsRouter = {
	list: protectedProcedure
		.input(
			z.object({
				page: z.number().int().min(1).default(1),
				perPage: z.number().int().min(1).max(200).default(50),
				search: z.string().optional(),
				industry: z.string().optional(),
				state: z.string().optional(),
				country: z.string().optional(),
				minScore: z.number().optional(),
				maxScore: z.number().optional(),
				status: z.array(z.string()).optional(),
				sort: z
					.array(z.object({ id: z.string(), desc: z.boolean() }))
					.optional(),
			})
		)
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			const {
				page,
				perPage,
				search,
				industry,
				state,
				country,
				minScore,
				maxScore,
				status,
				sort,
			} = input;

			const conditions: object[] = [];

			if (status?.length) {
				conditions.push({ status: { in: status } });
			}

			if (search) {
				conditions.push({
					OR: [
						{ name: { contains: search, mode: "insensitive" } },
						{ domain: { contains: search, mode: "insensitive" } },
						{ city: { contains: search, mode: "insensitive" } },
					],
				});
			}
			if (industry) {
				conditions.push({
					industry: { contains: industry, mode: "insensitive" },
				});
			}
			if (state) {
				conditions.push({ state });
			}
			if (country) {
				conditions.push({
					country: { contains: country, mode: "insensitive" },
				});
			}
			if (minScore !== undefined) {
				conditions.push({ scoreTotal: { gte: minScore } });
			}
			if (maxScore !== undefined) {
				conditions.push({ scoreTotal: { lte: maxScore } });
			}

			const where = { AND: conditions };
			const orderBy = sort?.length
				? sort.map((s) => ({ [s.id]: s.desc ? "desc" : "asc" }))
				: [{ scoreTotal: "desc" as const }];

			const [companies, total] = await Promise.all([
				prisma.company.findMany({
					where,
					orderBy,
					skip: (page - 1) * perPage,
					take: perPage,
					include: {
						contacts: {
							where: { verified: true },
							take: 3,
							orderBy: { seniority: "asc" },
						},
					},
				}),
				prisma.company.count({ where }),
			]);

			return { companies, total, pageCount: Math.ceil(total / perPage) };
		}),

	stats: protectedProcedure.handler(async () => {
		const { createPrismaClient } = await import("@revops/db");
		const prisma = createPrismaClient();
		const [qualified, approved, contactAcquired, ready] = await Promise.all([
			prisma.company.count({ where: { status: "ICP_QUALIFIED" } }),
			prisma.company.count({ where: { status: "ICP_REVIEW_APPROVED" } }),
			prisma.company.count({ where: { status: "CONTACT_ACQUIRED" } }),
			prisma.company.count({ where: { status: "READY" } }),
		]);
		return {
			qualified,
			approved,
			contactAcquired,
			ready,
			total: qualified + approved + contactAcquired + ready,
		};
	}),
};
