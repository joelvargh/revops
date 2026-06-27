export {};

declare global {
  namespace PrismaJson {
    type CompanyEnrichment = {
      employees?: number | null;
      revenue_millions?: number | null;
      industry?: string | null;
      technologies?: string[];
      funding?: string | null;
      linkedin_url?: string | null;
      data_found?: boolean;
      source?: "sonar" | "apollo" | "manual";
    };

    type ScoreBreakdown = {
      industry_fit: number;
      company_size: number;
      revenue: number;
      decision_maker: number;
    };

    type SettingValue =
      | string
      | number
      | boolean
      | string[]
      | Record<string, unknown>;
  }
}
