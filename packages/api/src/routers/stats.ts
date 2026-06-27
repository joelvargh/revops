import { protectedProcedure } from "../index";

export const statsRouter = {
	dashboard: protectedProcedure.handler(async () => {
		const { createPrismaClient } = await import("@revops/db");
		const prisma = createPrismaClient();

		const [
			totalLeads,
			qualified,
			pendingReview,
			contactsAcquired,
			pipelineRaw,
			recentActivity,
			activeCampaigns,
		] = await Promise.all([
			prisma.company.count(),
			prisma.company.count({
				where: { status: { in: ["ICP_QUALIFIED", "READY"] } },
			}),
			prisma.company.count({ where: { status: "ICP_REVIEW_PENDING" } }),
			prisma.company.count({ where: { status: "CONTACT_ACQUIRED" } }),
			prisma.company.groupBy({ by: ["status"], _count: true }),
			prisma.company.findMany({
				where: { status: { not: "DISCOVERED" } },
				orderBy: { updatedAt: "desc" },
				take: 10,
				select: { id: true, name: true, status: true, updatedAt: true },
			}),
			prisma.campaign.findMany({
				where: { status: "ACTIVE" },
				take: 5,
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					name: true,
					_count: { select: { discoveryRuns: true } },
				},
			}),
		]);

		// Get company counts per active campaign
		const campaignIds = activeCampaigns.map((c) => c.id);
		const campaignStats = campaignIds.length
			? await prisma.company.groupBy({
					by: ["campaignId", "status"],
					where: { campaignId: { in: campaignIds } },
					_count: true,
				})
			: [];

		const pipelineBreakdown = pipelineRaw.map((p) => ({
			status: p.status,
			count: p._count,
		}));

		const campaignsWithCounts = activeCampaigns.map((c) => {
			const stats = campaignStats.filter((s) => s.campaignId === c.id);
			const found = stats.reduce((sum, s) => sum + s._count, 0);
			const qualifiedCount = stats
				.filter((s) =>
					["ICP_QUALIFIED", "READY", "CONTACT_ACQUIRED"].includes(s.status)
				)
				.reduce((sum, s) => sum + s._count, 0);
			return { id: c.id, name: c.name, found, qualified: qualifiedCount };
		});

		return {
			totalLeads,
			qualified,
			pendingReview,
			contactsAcquired,
			pipelineBreakdown,
			recentActivity,
			activeCampaigns: campaignsWithCounts,
		};
	}),
};
