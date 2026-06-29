import { protectedProcedure } from "../index";

export const activityRouter = {
	recent: protectedProcedure.handler(async () => {
		const { createPrismaClient } = await import("@revops/db");
		const prisma = createPrismaClient();

		// Get last 15 companies that changed status (most recent activity)
		const recent = await prisma.company.findMany({
			where: { status: { not: "DISCOVERED" } },
			orderBy: { updatedAt: "desc" },
			take: 15,
			select: {
				id: true,
				name: true,
				city: true,
				status: true,
				scoreTotal: true,
				updatedAt: true,
			},
		});

		return recent;
	}),
};
