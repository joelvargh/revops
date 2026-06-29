import type { PrismaClient } from "../../prisma/generated/client";

export async function cleanDatabase(prisma: PrismaClient) {
	if (process.env.NODE_ENV === "production") {
		throw new Error("cleanDatabase cannot run in production");
	}
	console.log("🧹 Cleaning database…");

	await prisma.$executeRawUnsafe(`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN ('_prisma_migrations')
      ) LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" CASCADE';
      END LOOP;
    END $$;
  `);

	console.log("✅ Database cleaned");
}

if (import.meta.main) {
	const dotenv = await import("dotenv");
	dotenv.config({ path: "../../apps/web/.env" });
	const { PrismaPg } = await import("@prisma/adapter-pg");
	const { PrismaClient: PC } = await import("../../prisma/generated/client");

	if (process.env.NODE_ENV === "production") {
		console.error("❌ Refusing to clean production database");
		process.exit(1);
	}

	const adapter = new PrismaPg({
		connectionString: process.env.DATABASE_URL ?? "",
	});
	const prisma = new PC({ adapter });
	try {
		await cleanDatabase(prisma);
	} finally {
		await prisma.$disconnect();
	}
}
