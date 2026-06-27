import { z } from "zod";

import { protectedProcedure } from "../index";

export const researchRouter = {
  queue: protectedProcedure.handler(async () => {
    const { createPrismaClient } = await import("@revops/db");
    const prisma = createPrismaClient();
    return prisma.company.findMany({
      where: { status: "RESEARCH_PENDING" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        category: true,
        website: true,
        domain: true,
        phone: true,
        discoveredAt: true,
      },
    });
  }),

  submit: protectedProcedure
    .input(z.object({
      companyId: z.string(),
      employees: z.number().nullable(),
      revenueMm: z.number().nullable(),
      industry: z.string().nullable(),
    }))
    .handler(async ({ input }) => {
      const { createPrismaClient } = await import("@revops/db");
      const prisma = createPrismaClient();
      return prisma.company.update({
        where: { id: input.companyId },
        data: {
          employeeCount: input.employees,
          revenueMm: input.revenueMm,
          industry: input.industry,
          enrichment: { employees: input.employees, revenue_millions: input.revenueMm, industry: input.industry, data_found: true, source: "manual" },
          status: "FILTERED" as const, // Goes back to scoring pipeline (WF-03c will pick it up)
        },
      });
    }),

  skip: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .handler(async ({ input }) => {
      const { createPrismaClient } = await import("@revops/db");
      const prisma = createPrismaClient();
      return prisma.company.update({
        where: { id: input.companyId },
        data: { status: "ICP_DISQUALIFIED" },
      });
    }),

  count: protectedProcedure.handler(async () => {
    const { createPrismaClient } = await import("@revops/db");
    const prisma = createPrismaClient();
    return prisma.company.count({ where: { status: "RESEARCH_PENDING" } });
  }),
};
