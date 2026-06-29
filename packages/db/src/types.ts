export {};

declare global {
	// biome-ignore lint/style/noNamespace: Required by prisma-json-types-generator for typed JSON fields
	namespace PrismaJson {
		interface CompanyEnrichment {
			data_found?: boolean;
			employees?: number | null;
			funding?: string | null;
			industry?: string | null;
			linkedin_url?: string | null;
			revenue_millions?: number | null;
			source?: "sonar" | "apollo" | "manual";
			technologies?: string[];
		}

		interface ScoreBreakdown {
			company_size: number;
			decision_maker: number;
			industry_fit: number;
			revenue: number;
		}

		type SettingValue =
			| string
			| number
			| boolean
			| string[]
			| Record<string, unknown>;
	}
}
