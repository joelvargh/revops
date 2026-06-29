import { z } from "zod";

import { adminProcedure, protectedProcedure } from "../index";

export const usersRouter = {
	list: protectedProcedure
		.input(
			z.object({
				page: z.number().int().min(1).default(1),
				perPage: z.number().int().min(1).max(100).default(10),
				sort: z
					.array(z.object({ id: z.string(), desc: z.boolean() }))
					.optional(),
				filters: z
					.array(z.object({ id: z.string(), value: z.unknown() }))
					.optional(),
			})
		)
		.handler(async ({ input }) => {
			const { page, perPage, sort, filters } = input;
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();

			const where: Record<string, unknown> = {};
			if (filters) {
				for (const f of filters) {
					if (f.id === "role" && Array.isArray(f.value)) {
						where.role = { in: f.value };
					}
					if (f.id === "email" && typeof f.value === "string") {
						where.email = { contains: f.value, mode: "insensitive" };
					}
					if (f.id === "name" && typeof f.value === "string") {
						where.name = { contains: f.value, mode: "insensitive" };
					}
				}
			}

			const orderBy = sort?.length
				? sort.map((s) => ({ [s.id]: s.desc ? "desc" : "asc" }))
				: [{ createdAt: "desc" as const }];

			const [users, total] = await Promise.all([
				prisma.user.findMany({
					where,
					orderBy,
					skip: (page - 1) * perPage,
					take: perPage,
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
						banned: true,
						emailVerified: true,
						createdAt: true,
					},
				}),
				prisma.user.count({ where }),
			]);

			return { users, total, pageCount: Math.ceil(total / perPage) };
		}),

	create: adminProcedure
		.input(
			z.object({
				name: z.string().min(1),
				email: z.string().email(),
				role: z.enum(["admin", "user"]).default("user"),
			})
		)
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			const existing = await prisma.user.findUnique({
				where: { email: input.email },
			});
			if (existing) {
				throw new Error("A user with this email already exists");
			}
			const user = await prisma.user.create({
				data: { id: crypto.randomUUID(), ...input, emailVerified: true },
			});
			return user;
		}),

	updateRole: adminProcedure
		.input(z.object({ userId: z.string(), role: z.enum(["admin", "user"]) }))
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.user.update({
				where: { id: input.userId },
				data: { role: input.role },
			});
		}),

	ban: adminProcedure
		.input(
			z.object({
				userId: z.string(),
				banned: z.boolean(),
				reason: z.string().optional(),
			})
		)
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.user.update({
				where: { id: input.userId },
				data: {
					banned: input.banned,
					banReason: input.banned ? input.reason : null,
				},
			});
		}),

	delete: adminProcedure
		.input(z.object({ userId: z.string() }))
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			await prisma.user.delete({ where: { id: input.userId } });
			return { success: true };
		}),
};
