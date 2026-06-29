import { z } from "zod";

import { protectedProcedure } from "../index";

const jsonValue = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.array(z.string()),
	z.record(z.string(), z.unknown()),
]);

export const settingsRouter = {
	list: protectedProcedure
		.input(z.object({ category: z.string().optional() }).optional())
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.setting.findMany({
				where: input?.category ? { category: input.category } : undefined,
				orderBy: [{ category: "asc" }, { key: "asc" }],
			});
		}),

	update: protectedProcedure
		.input(z.object({ key: z.string(), value: jsonValue }))
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.setting.update({
				where: { key: input.key },
				data: { value: input.value as object },
			});
		}),

	upsert: protectedProcedure
		.input(
			z.object({
				category: z.string(),
				key: z.string(),
				value: jsonValue,
				label: z.string().optional(),
			})
		)
		.handler(async ({ input }) => {
			const { createPrismaClient } = await import("@revops/db");
			const prisma = createPrismaClient();
			return prisma.setting.upsert({
				where: { key: input.key },
				update: { value: input.value as object, label: input.label },
				create: {
					category: input.category,
					key: input.key,
					value: input.value as object,
					label: input.label,
				},
			});
		}),
};
