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
		.handler(async ({ context, input }) =>
			context.prisma.setting.findMany({
				where: input?.category ? { category: input.category } : undefined,
				orderBy: [{ category: "asc" }, { key: "asc" }],
			})
		),

	update: protectedProcedure
		.input(z.object({ key: z.string(), value: jsonValue }))
		.handler(({ context, input }) => {
			// upsert so it works even if key doesn't exist yet (avoids P2025)
			return context.prisma.setting.upsert({
				where: { key: input.key },
				update: { value: input.value as never },
				create: {
					key: input.key,
					category: "misc",
					value: input.value as never,
				},
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
		.handler(async ({ context, input }) =>
			context.prisma.setting.upsert({
				where: { key: input.key },
				update: { value: input.value as never, label: input.label },
				create: {
					category: input.category,
					key: input.key,
					value: input.value as never,
					label: input.label,
				},
			})
		),
};
