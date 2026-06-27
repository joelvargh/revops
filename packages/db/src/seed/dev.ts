import dotenv from "dotenv";

dotenv.config({ path: "../../apps/web/.env" });

import { faker } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/client";
import { cleanDatabase } from "./clean";

type Prisma = InstanceType<typeof PrismaClient>;

const COMPANY_STATUSES = [
	"DISCOVERED",
	"FILTERED",
	"ICP_QUALIFIED",
	"ICP_REVIEW_PENDING",
	"ICP_DISQUALIFIED",
	"CONTACT_ACQUIRED",
	"READY",
] as const;

const DISCOVERY_RUN_STATUSES = [
	"PENDING",
	"RUNNING",
	"COMPLETED",
	"FAILED",
] as const;

const INDUSTRIES = [
	"Construction",
	"Healthcare",
	"Manufacturing",
	"HVAC",
	"Energy",
	"Pharmaceuticals",
	"Logistics",
	"Real Estate",
	"Engineering",
	"Facilities Management",
];

const SENIORITIES = ["c_suite", "vp", "director", "manager", "senior"];
const TITLES = [
	"CEO",
	"CTO",
	"CFO",
	"VP of Sales",
	"VP of Operations",
	"Director of Engineering",
	"Director of Procurement",
	"Operations Manager",
	"Senior Account Executive",
	"Business Development Manager",
];

const REGIONS_DATA = [
	// Full state bboxes - polygon clipping removes ocean/cross-border cells
	{
		code: "TX",
		name: "Texas",
		country: "US",
		cellSize: 0.25,
		bbox: { south: 25.84, west: -106.65, north: 36.5, east: -93.51 },
	},
	{
		code: "CA",
		name: "California",
		country: "US",
		cellSize: 0.25,
		bbox: { south: 32.53, west: -124.48, north: 42.01, east: -114.13 },
	},
	{
		code: "FL",
		name: "Florida",
		country: "US",
		cellSize: 0.25,
		bbox: { south: 24.52, west: -87.63, north: 31.0, east: -80.03 },
	},
	{
		code: "NY",
		name: "New York",
		country: "US",
		cellSize: 0.25,
		bbox: { south: 40.5, west: -79.76, north: 45.01, east: -71.86 },
	},
	{
		code: "IL",
		name: "Illinois",
		country: "US",
		cellSize: 0.25,
		bbox: { south: 36.97, west: -91.51, north: 42.51, east: -87.02 },
	},
	{
		code: "OH",
		name: "Ohio",
		country: "US",
		cellSize: 0.25,
		bbox: { south: 38.4, west: -84.82, north: 42.32, east: -80.52 },
	},
	{
		code: "PA",
		name: "Pennsylvania",
		country: "US",
		cellSize: 0.25,
		bbox: { south: 39.72, west: -80.52, north: 42.27, east: -74.69 },
	},
	{
		code: "GA",
		name: "Georgia",
		country: "US",
		cellSize: 0.25,
		bbox: { south: 30.36, west: -85.61, north: 35.0, east: -80.84 },
	},
];

async function seedDevData(prisma: Prisma) {
	// 1. Users
	await prisma.user.createMany({
		data: [
			{
				id: crypto.randomUUID(),
				name: "Admin",
				email: "wernerheisenberg047@gmail.com",
				emailVerified: true,
				role: "admin",
			},
			{
				id: crypto.randomUUID(),
				name: "Sales Rep",
				email: "wernerheisenberg.shared@gmail.com",
				emailVerified: true,
				role: "user",
			},
		],
		skipDuplicates: true,
	});
	console.log("  ✓ 2 users created");

	// 2. Countries
	const countries = await Promise.all([
		prisma.country.upsert({
			where: { code: "US" },
			update: {},
			create: { code: "US", name: "United States" },
		}),
	]);
	const countryMap = Object.fromEntries(countries.map((c) => [c.code, c.id]));
	console.log("  ✓ 1 country created (US)");

	// Load state polygons
	const statesGeoJson = await import("../us-states.json");
	const statesData = (statesGeoJson.default ?? statesGeoJson) as { features: { properties: { name: string }; geometry: unknown }[] };

	// 3. Regions (with state polygon stored)
	const regions = await Promise.all(
		REGIONS_DATA.map((r) => {
			const stateFeature = statesData.features.find((f) => f.properties.name === r.name);
			return prisma.region.upsert({
				where: {
					countryId_code: { countryId: countryMap[r.country]!, code: r.code },
				},
				update: {},
				create: {
					code: r.code,
					name: r.name,
					countryId: countryMap[r.country]!,
					cellSize: r.cellSize,
					bboxSouth: r.bbox.south,
					bboxWest: r.bbox.west,
					bboxNorth: r.bbox.north,
					bboxEast: r.bbox.east,
					polygon: stateFeature?.geometry ?? null,
					cellsGenerated: true,
				},
			});
		})
	);
	console.log(`  ✓ ${regions.length} regions created`);

	// 4. Grid cells (polygon-clipped to state boundaries using Turf.js)
	
	
	const { generateClippedCells } = await import("../geo-utils");

	let totalCells = 0;
	for (const region of regions) {
		const rd = REGIONS_DATA.find((r) => r.code === region.code)!;
		const stateFeature = statesData.features.find((f) => f.properties.name === rd.name);
		if (!stateFeature) { console.log(`  ⚠ No polygon found for ${rd.name}`); continue; }

		const bbox: [number, number, number, number] = [rd.bbox.west, rd.bbox.south, rd.bbox.east, rd.bbox.north];
		const cells = generateClippedCells(stateFeature as any, bbox, rd.cellSize);

		await prisma.gridCell.createMany({
			data: cells.map((c) => ({
				regionId: region.id, row: c.row, col: c.col,
				bboxSouth: c.bboxSouth, bboxWest: c.bboxWest, bboxNorth: c.bboxNorth, bboxEast: c.bboxEast,
				geometry: c.geometry,
			})),
			skipDuplicates: true,
		});
		await prisma.region.update({ where: { id: region.id }, data: { cellsGenerated: true } });
		totalCells += cells.length;
	}
	console.log(`  ✓ ${totalCells} grid cells created (polygon-clipped, zero ocean/overlap)`);

	// 5. Campaigns
	const campaignData = [
		{
			name: "HVAC Contractors Texas",
			searchTerm: "HVAC contractors",
			regionCode: "TX",
		},
		{ name: "Hospitals California", searchTerm: "Hospitals", regionCode: "CA" },
		{
			name: "Manufacturers Florida",
			searchTerm: "Manufacturing companies",
			regionCode: "FL",
		},
	];
	const campaigns = [];
	for (const cd of campaignData) {
		const campaign = await prisma.campaign.create({
			data: { name: cd.name, searchTerm: cd.searchTerm, source: "google_maps" },
		});
		const region = regions.find((r) => r.code === cd.regionCode)!;
		await prisma.campaignRegion.create({
			data: { campaignId: campaign.id, regionId: region.id },
		});
		campaigns.push({ ...campaign, regionId: region.id });
	}
	console.log("  ✓ 3 campaigns created");

	// 6. Companies (~500)
	const companyRecords = [];
	for (let i = 0; i < 500; i++) {
		const campaign = faker.helpers.arrayElement(campaigns);
		const status = faker.helpers.arrayElement(COMPANY_STATUSES);
		const hasScore = !["DISCOVERED", "FILTERED"].includes(status);
		companyRecords.push({
			name: faker.company.name(),
			domain: faker.internet.domainName(),
			phone: faker.phone.number({ style: "international" }),
			address: faker.location.streetAddress(),
			city: faker.location.city(),
			state: faker.location.state({ abbreviated: true }),
			country: "US",
			category: faker.helpers.arrayElement([
				"HVAC contractor",
				"Hospital",
				"Manufacturer",
				"General contractor",
				"Supplier",
				"Engineering firm",
			]),
			industry: faker.helpers.arrayElement(INDUSTRIES),
			employeeCount: faker.number.int({ min: 5, max: 10_000 }),
			revenueMm: faker.number.float({ min: 0.5, max: 500, fractionDigits: 1 }),
			scoreTotal: hasScore ? faker.number.int({ min: 10, max: 100 }) : null,
			status: status as any,
			source: "google_maps",
			campaignId: campaign.id,
			rating: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
			reviewCount: faker.number.int({ min: 0, max: 500 }),
			website: faker.internet.url(),
		});
	}
	await prisma.company.createMany({
		data: companyRecords,
		skipDuplicates: true,
	});
	console.log(`  ✓ ${companyRecords.length} companies created`);

	// 7. Contacts (~200) — linked to CONTACT_ACQUIRED or READY companies
	const contactCompanies = await prisma.company.findMany({
		where: { status: { in: ["CONTACT_ACQUIRED", "READY"] } },
		select: { id: true, domain: true },
	});
	const contactRecords = [];
	const targetCount = Math.min(200, contactCompanies.length * 3);
	for (let i = 0; i < targetCount; i++) {
		const company = faker.helpers.arrayElement(contactCompanies);
		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();
		contactRecords.push({
			companyId: company.id,
			firstName,
			lastName,
			email: faker.internet.email({
				firstName,
				lastName,
				provider: company.domain ?? undefined,
			}),
			phone: faker.phone.number({ style: "international" }),
			title: faker.helpers.arrayElement(TITLES),
			seniority: faker.helpers.arrayElement(SENIORITIES),
			linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-${faker.string.alphanumeric(5)}`,
			source: "apollo_reveal",
			revealed: true,
			verified: faker.datatype.boolean(0.8),
		});
	}
	await prisma.contact.createMany({
		data: contactRecords,
		skipDuplicates: true,
	});
	console.log(`  ✓ ${contactRecords.length} contacts created`);

	// 8. Discovery runs (~50)
	const allCells = await prisma.gridCell.findMany({
		select: { id: true, regionId: true },
	});
	const runRecords = [];
	for (let i = 0; i < 50; i++) {
		const campaign = faker.helpers.arrayElement(campaigns);
		const regionCells = allCells.filter(
			(c) => c.regionId === campaign.regionId
		);
		if (!regionCells.length) {
			continue;
		}
		const cell = faker.helpers.arrayElement(regionCells);
		const status = faker.helpers.arrayElement(DISCOVERY_RUN_STATUSES);
		runRecords.push({
			campaignId: campaign.id,
			gridCellId: cell.id,
			status: status as any,
			resultsFound:
				status === "COMPLETED" ? faker.number.int({ min: 50, max: 1200 }) : 0,
			resultsNew:
				status === "COMPLETED" ? faker.number.int({ min: 20, max: 800 }) : 0,
			startedAt: status === "PENDING" ? null : faker.date.recent({ days: 7 }),
			completedAt:
				status === "COMPLETED" ? faker.date.recent({ days: 3 }) : null,
			error: status === "FAILED" ? faker.lorem.sentence() : null,
		});
	}
	await prisma.discoveryRun.createMany({
		data: runRecords,
		skipDuplicates: true,
	});
	console.log(`  ✓ ${runRecords.length} discovery runs created`);

	// 9. Settings
	const settings = [
		{
			category: "icp",
			key: "score_green_threshold",
			value: 70,
			label: "Min score for auto-approve",
		},
		{
			category: "icp",
			key: "score_amber_min",
			value: 50,
			label: "Min score for human review",
		},
		{
			category: "prefilter",
			key: "target_categories",
			value: [
				"contractor",
				"construction",
				"healthcare",
				"hospital",
				"manufacturing",
				"hvac",
				"engineering",
			],
			label: "Target keywords",
		},
		{
			category: "discovery",
			key: "max_cells_per_day",
			value: 5,
			label: "Max cells/day",
		},
		{
			category: "contacts",
			key: "max_reveals_per_day",
			value: 200,
			label: "Max reveals/day",
		},
		{
			category: "enrichment",
			key: "sonar_system_prompt",
			value:
				'For the company "{{name}}" located at "{{address}}", Google Maps category: "{{category}}".\nReturn ONLY valid JSON:\n{\n  "employees": <number or null>,\n  "revenue_millions": <number or null>,\n  "industry": "<string>",\n  "data_found": <true if found real data, false if unsure>\n}\nReturn null if you cannot find actual data. Do NOT estimate.',
			label: "Sonar System Prompt",
		},
		{
			category: "icp",
			key: "icp_scoring_weights",
			value: JSON.stringify({
				industries: {
					hospital: 30,
					pharmacy: 25,
					construction: 22,
					manufacturing: 20,
					hvac: 18,
					energy: 15,
				},
				size: { min: 20, ideal_min: 50, ideal_max: 200, max: 5000 },
				revenue: { min: 1, ideal_min: 10, ideal_max: 100, max: 500 },
			}),
			label: "ICP Scoring Weights (JSON)",
		},
		{
			category: "discovery",
			key: "cell_size_degrees",
			value: 0.5,
			label: "Grid cell size in degrees",
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
			update: { value: s.value },
			create: {
				category: s.category,
				key: s.key,
				value: s.value,
				label: s.label,
			},
		});
	}
	console.log("  ✓ Settings seeded");

	// 10. Metrics
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	await prisma.metric.createMany({
		data: [
			{ key: "apollo_credits", date: today, value: 147, limit: 200 },
			{ key: "sonar_calls", date: today, value: 312, limit: 500 },
			{ key: "companies_scraped", date: today, value: 847 },
		],
		skipDuplicates: true,
	});
	console.log("  ✓ Metrics seeded");
}

async function main() {
	console.log("🌱 Dev seed starting…");
	const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
	const prisma = new PrismaClient({ adapter });

	try {
		await cleanDatabase(prisma);
		await seedDevData(prisma);
		console.log("✅ Dev seed complete");
	} finally {
		await prisma.$disconnect();
	}
}

main();
