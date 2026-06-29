import dotenv from "dotenv";

dotenv.config({ path: "../../apps/web/.env" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/client";

type Prisma = InstanceType<typeof PrismaClient>;

async function seedAdminUser(prisma: Prisma) {
	const adminEmail = process.env.SEED_ADMIN_EMAIL;
	if (!adminEmail) {
		console.log("  · SEED_ADMIN_EMAIL not set, skipping admin creation");
		return;
	}
	await prisma.user.upsert({
		where: { email: adminEmail },
		update: {},
		create: {
			id: crypto.randomUUID(),
			name: "Admin",
			email: adminEmail,
			emailVerified: true,
			role: "admin",
		},
	});
	console.log(`  ✓ Admin ${adminEmail} upserted`);
}

async function seedSettings(prisma: Prisma) {
	const settings = [
		{
			category: "icp",
			key: "score_green_threshold",
			value: 70,
			label: "Minimum score for auto-approve",
		},
		{
			category: "icp",
			key: "score_amber_min",
			value: 50,
			label: "Minimum score for human review",
		},
		{
			category: "icp",
			key: "industry_scores",
			value: {
				Hospital: 30,
				Pharmacy: 25,
				Lab: 25,
				"Construction (General)": 22,
				Manufacturing: 20,
				"Construction (Specialty)": 18,
			},
			label: "Industry fit scores",
		},
		{
			category: "icp",
			key: "size_scores",
			value: {
				"50-200": 25,
				"200-500": 22,
				"20-50": 15,
				"500-1000": 10,
				"1000-5000": 5,
			},
			label: "Company size scores",
		},
		{
			category: "icp",
			key: "revenue_scores",
			value: { "10-100": 25, "5-10": 20, "100-500": 15, "1-5": 10 },
			label: "Revenue scores (millions)",
		},
		{
			category: "prefilter",
			key: "target_categories",
			value: [
				"contractor",
				"construction",
				"healthcare",
				"hospital",
				"clinic",
				"medical",
				"manufacturing",
				"oil",
				"gas",
				"energy",
			],
			label: "Target industry keywords",
		},
		{
			category: "prefilter",
			key: "require_website",
			value: true,
			label: "Require website to pass pre-filter",
		},
		{
			category: "prefilter",
			key: "require_phone",
			value: true,
			label: "Require phone to pass pre-filter",
		},
		{
			category: "discovery",
			key: "max_cells_per_day",
			value: 5,
			label: "Max grid cells to scrape per day",
		},
		{
			category: "discovery",
			key: "cell_size_degrees",
			value: 0.25,
			label: "Grid cell size in degrees",
		},
		{
			category: "contacts",
			key: "max_reveals_per_day",
			value: 200,
			label: "Max Apollo reveals per day",
		},
		{
			category: "contacts",
			key: "reveals_per_company",
			value: 2,
			label: "People to reveal per company",
		},
		{
			category: "contacts",
			key: "target_seniorities",
			value: ["owner", "founder", "c_suite", "vp", "director"],
			label: "Seniority filter for people search",
		},
		{
			category: "enrichment",
			key: "sonar_system_prompt",
			value:
				'For the company "{{name}}" located at "{{address}}", Google Maps category: "{{category}}".\nReturn ONLY valid JSON:\n{\n  "employees": <number or null>,\n  "revenue_millions": <number or null>,\n  "industry": "<string>",\n  "data_found": <true if found real data, false if unsure>\n}\nReturn null if you cannot find actual data. Do NOT estimate.',
			label: "Sonar System Prompt",
		},
		{
			category: "enrichment",
			key: "sonar_daily_limit",
			value: 500,
			label: "Sonar API daily limit",
		},
	];

	for (const s of settings) {
		await prisma.setting.upsert({
			where: { key: s.key },
			update: { value: s.value, label: s.label, category: s.category },
			create: {
				category: s.category,
				key: s.key,
				value: s.value,
				label: s.label,
			},
		});
	}
	console.log(`  ✓ ${settings.length} settings seeded`);
}

async function seedGeography(prisma: Prisma) {
	const us = await prisma.country.upsert({
		where: { code: "US" },
		update: {},
		create: { code: "US", name: "United States" },
	});

	// NOTE: polygon field is left null here — run the regions-seed script
	// (src/seed/regions.ts) after prod seed to populate polygons and generate cells.
	const regions = [
		{
			code: "TX",
			name: "Texas",
			bboxSouth: 25.75,
			bboxWest: -106.75,
			bboxNorth: 36.75,
			bboxEast: -93.5,
		},
		{
			code: "CA",
			name: "California",
			bboxSouth: 32.5,
			bboxWest: -124.5,
			bboxNorth: 42.25,
			bboxEast: -114.0,
		},
		{
			code: "FL",
			name: "Florida",
			bboxSouth: 24.5,
			bboxWest: -87.75,
			bboxNorth: 31.25,
			bboxEast: -79.5,
		},
		{
			code: "NY",
			name: "New York",
			bboxSouth: 40.25,
			bboxWest: -80.0,
			bboxNorth: 45.25,
			bboxEast: -71.75,
		},
		{
			code: "IL",
			name: "Illinois",
			bboxSouth: 36.75,
			bboxWest: -91.75,
			bboxNorth: 42.75,
			bboxEast: -87.0,
		},
		{
			code: "OH",
			name: "Ohio",
			bboxSouth: 38.25,
			bboxWest: -85.0,
			bboxNorth: 43.0,
			bboxEast: -78.75,
		},
		{
			code: "PA",
			name: "Pennsylvania",
			bboxSouth: 39.5,
			bboxWest: -80.75,
			bboxNorth: 42.5,
			bboxEast: -74.5,
		},
		{
			code: "GA",
			name: "Georgia",
			bboxSouth: 30.25,
			bboxWest: -85.75,
			bboxNorth: 35.25,
			bboxEast: -80.75,
		},
	];

	for (const r of regions) {
		await prisma.region.upsert({
			where: { countryId_code: { countryId: us.id, code: r.code } },
			update: {},
			create: { ...r, countryId: us.id },
		});
	}
	console.log(`  ✓ ${regions.length} US regions seeded`);
}

async function main() {
	console.log("🌱 Production seed starting…");
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is not set");
	}
	const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
	const prisma = new PrismaClient({ adapter });
	try {
		await seedAdminUser(prisma);
		await seedSettings(prisma);
		await seedGeography(prisma);
		console.log("✅ Production seed complete");
		console.log("   ➡ Run 'bun run db:seed-regions' to generate grid cells");
	} finally {
		await prisma.$disconnect();
	}
}

main();
