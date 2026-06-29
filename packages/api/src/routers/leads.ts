import { z } from "zod";

import { protectedProcedure } from "../index";

const ALLOWED_SORT_FIELDS = new Set([
	"name",
	"domain",
	"city",
	"state",
	"industry",
	"employeeCount",
	"revenueMm",
	"scoreTotal",
	"discoveredAt",
	"createdAt",
]);

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
		.handler(async ({ context, input }) => {
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
				? sort
						.filter((s) => ALLOWED_SORT_FIELDS.has(s.id))
						.map((s) => ({ [s.id]: s.desc ? "desc" : "asc" }))
				: [{ scoreTotal: "desc" as const }];

			const [companies, total] = await Promise.all([
				context.prisma.company.findMany({
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
				context.prisma.company.count({ where }),
			]);

			return { companies, total, pageCount: Math.ceil(total / perPage) };
		}),

	stats: protectedProcedure.handler(async ({ context }) => {
		const [qualified, approved, contactAcquired, ready] = await Promise.all([
			context.prisma.company.count({ where: { status: "ICP_QUALIFIED" } }),
			context.prisma.company.count({
				where: { status: "ICP_REVIEW_APPROVED" },
			}),
			context.prisma.company.count({ where: { status: "CONTACT_ACQUIRED" } }),
			context.prisma.company.count({ where: { status: "READY" } }),
		]);
		return {
			qualified,
			approved,
			contactAcquired,
			ready,
			total: qualified + approved + contactAcquired + ready,
		};
	}),

	filterOptions: protectedProcedure.handler(async ({ context }) => {
		const [states, industries] = await Promise.all([
			context.prisma.company.findMany({
				where: { state: { not: null } },
				select: { state: true },
				distinct: ["state"],
				orderBy: { state: "asc" },
			}),
			context.prisma.company.findMany({
				where: { industry: { not: null } },
				select: { industry: true },
				distinct: ["industry"],
				orderBy: { industry: "asc" },
			}),
		]);
		return {
			states: states.map((s) => s.state as string),
			industries: industries.map((i) => i.industry as string),
		};
	}),
};
