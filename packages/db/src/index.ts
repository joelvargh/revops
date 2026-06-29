import { PrismaPg } from "@prisma/adapter-pg";

// biome-ignore lint/style/noExportedImports: PrismaClient must be importable as a type from this entry point
import { PrismaClient } from "../prisma/generated/client";

// biome-ignore lint/performance/noBarrelFile: intentional re-export of generated enums for consumers
export {
	CampaignStatus,
	CompanyStatus,
	DiscoveryRunStatus,
} from "../prisma/generated/enums";

// biome-ignore lint/style/noNonNullAssertion: DATABASE_URL must be set in environment — crash fast if missing
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export default prisma;
export { PrismaClient };
export const createPrismaClient = () => prisma;
