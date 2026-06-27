import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../prisma/generated/client";

export {
	CampaignStatus,
	CompanyStatus,
	DiscoveryRunStatus,
} from "../prisma/generated/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export default prisma;
export { PrismaClient };
export const createPrismaClient = () => prisma;
