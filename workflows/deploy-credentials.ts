#!/usr/bin/env bun
/**
 * Upsert n8n credentials from .env.deploy.
 * Updates existing credentials by ID; creates if missing.
 *
 * Usage: bun run workflows/deploy-credentials.ts
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const scriptDir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(scriptDir, "../.env.deploy") });

const N8N_URL = process.env.N8N_URL!;
const N8N_API_KEY = process.env.N8N_API_KEY!;

if (!(N8N_URL && N8N_API_KEY)) {
	console.error("❌ Missing N8N_URL or N8N_API_KEY");
	process.exit(1);
}

const headers = {
	"X-N8N-API-KEY": N8N_API_KEY,
	"Content-Type": "application/json",
};

// Credentials to upsert: matched by name against existing credentials.
// data shape must match the n8n credential type schema.
const CREDENTIALS: Array<{
	name: string;
	type: string;
	data: Record<string, string | number | boolean>;
}> = [
	{
		name: "Apify",
		type: "httpQueryAuth",
		data: {
			name: "token",
			value: process.env.APIFY_TOKEN!,
			allowedHttpRequestDomains: "all",
		},
	},
	{
		name: "OpenRouter",
		type: "httpHeaderAuth",
		data: {
			name: "Authorization",
			value: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
			allowedHttpRequestDomains: "all",
		},
	},
	{
		name: "Apollo",
		type: "httpHeaderAuth",
		data: {
			name: "x-api-key",
			value: process.env.APOLLO_API_KEY!,
			allowedHttpRequestDomains: "all",
		},
	},
	{
		name: "RevOps PostgreSQL",
		type: "postgres",
		data: {
			host: process.env.POSTGRES_HOST!,
			port: Number(process.env.POSTGRES_PORT!),
			database: process.env.POSTGRES_DB!,
			user: process.env.POSTGRES_USER!,
			password: process.env.POSTGRES_PASSWORD!,
			ssl: "disable",
			sshTunnel: false,
		},
	},
];

async function listCredentials(): Promise<Map<string, string>> {
	const res = await fetch(`${N8N_URL}/api/v1/credentials`, { headers });
	if (!res.ok) {
		throw new Error(`Failed to list credentials: ${res.status}`);
	}
	const { data } = (await res.json()) as {
		data: Array<{ id: string; name: string }>;
	};
	return new Map(data.map((c) => [c.name, c.id]));
}

async function updateCredential(id: string, cred: (typeof CREDENTIALS)[0]) {
	const res = await fetch(`${N8N_URL}/api/v1/credentials/${id}`, {
		method: "PATCH",
		headers,
		body: JSON.stringify({ name: cred.name, type: cred.type, data: cred.data }),
	});
	if (!res.ok) {
		throw new Error(
			`Failed to update "${cred.name}": ${res.status} ${await res.text()}`
		);
	}
}

async function createCredential(cred: (typeof CREDENTIALS)[0]) {
	const res = await fetch(`${N8N_URL}/api/v1/credentials`, {
		method: "POST",
		headers,
		body: JSON.stringify({ name: cred.name, type: cred.type, data: cred.data }),
	});
	if (!res.ok) {
		throw new Error(
			`Failed to create "${cred.name}": ${res.status} ${await res.text()}`
		);
	}
	const created = (await res.json()) as { id: string };
	return created.id;
}

async function main() {
	const missing = CREDENTIALS.filter((c) =>
		Object.values(c.data).some(
			(v) => v === undefined || String(v).includes("undefined")
		)
	);
	if (missing.length) {
		console.error(
			`❌ Missing env vars for: ${missing.map((c) => c.name).join(", ")}`
		);
		process.exit(1);
	}

	const existing = await listCredentials();

	for (const cred of CREDENTIALS) {
		if (existing.has(cred.name)) {
			const id = existing.get(cred.name)!;
			await updateCredential(id, cred);
			console.log(`  ✓ Updated: ${cred.name} (${id})`);
		} else {
			const id = await createCredential(cred);
			console.log(`  + Created: ${cred.name} (${id})`);
		}
	}

	console.log("\n✅ Credentials deploy complete");
}

main().catch((err: Error) => {
	console.error("❌ Failed:", err.message);
	process.exit(1);
});
