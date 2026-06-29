#!/usr/bin/env bun
/**
 * n8n-reset.ts
 *
 * Deletes ALL workflows and credentials from your n8n instance.
 * Prompts for confirmation before destroying anything.
 *
 * Usage:
 *   bun scripts/n8n-reset.ts
 *
 * Environment:
 *   N8N_BASE_URL   - defaults to http://localhost:5678
 *   N8N_API_KEY    - your n8n API key (Settings → API → Create key)
 */

const BASE_URL = (process.env.N8N_BASE_URL ?? "http://localhost:5678").replace(
	/\/+$/,
	""
);
const API_KEY = process.env.N8N_API_KEY ?? "";

if (!API_KEY) {
	console.error(
		"❌  N8N_API_KEY is not set.\n" +
			"    Generate one in n8n → Settings → API → Create key, then:\n" +
			"    export N8N_API_KEY=your-key-here"
	);
	process.exit(1);
}

const headers = {
	"X-N8N-API-KEY": API_KEY,
	"Content-Type": "application/json",
};

async function fetchAll<T>(path: string): Promise<T[]> {
	const items: T[] = [];
	let cursor: string | undefined;

	do {
		const url = new URL(`${BASE_URL}/api/v1${path}`);
		url.searchParams.set("limit", "100");
		if (cursor) {
			url.searchParams.set("cursor", cursor);
		}

		const res = await fetch(url.toString(), { headers });
		if (!res.ok) {
			throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
		}

		const body = (await res.json()) as {
			data: T[];
			nextCursor?: string;
		};
		items.push(...body.data);
		cursor = body.nextCursor;
	} while (cursor);

	return items;
}

async function deleteOne(path: string, id: string): Promise<void> {
	const res = await fetch(`${BASE_URL}/api/v1${path}/${id}`, {
		method: "DELETE",
		headers,
	});
	if (!res.ok && res.status !== 404) {
		throw new Error(
			`DELETE ${path}/${id} failed: ${res.status} ${await res.text()}`
		);
	}
}

async function confirm(question: string): Promise<boolean> {
	process.stdout.write(`${question} [y/N] `);
	const _buf = Buffer.alloc(1);
	// Switch to raw mode for a single keypress
	if (process.stdin.isTTY) {
		process.stdin.setRawMode(true);
	}
	process.stdin.resume();

	const answer = await new Promise<string>((resolve) => {
		process.stdin.once("data", (chunk) => {
			const key = chunk.toString().trim().toLowerCase();
			resolve(key);
		});
	});

	if (process.stdin.isTTY) {
		process.stdin.setRawMode(false);
	}
	process.stdin.pause();
	process.stdout.write("\n");

	return answer === "y";
}

async function main() {
	console.log(`\n🔗  Connecting to n8n at ${BASE_URL}…\n`);

	// Fetch inventory
	const [workflows, credentials] = await Promise.all([
		fetchAll<{ id: string; name: string }>("/workflows"),
		fetchAll<{ id: string; name: string }>("/credentials"),
	]);

	if (workflows.length === 0 && credentials.length === 0) {
		console.log("✅  Nothing to delete — n8n is already empty.");
		return;
	}

	// Show what will be deleted
	console.log("📋  The following items will be permanently deleted:\n");

	if (workflows.length > 0) {
		console.log(`  Workflows (${workflows.length}):`);
		for (const wf of workflows) {
			console.log(`    • [${wf.id}] ${wf.name}`);
		}
	}

	if (credentials.length > 0) {
		console.log(`\n  Credentials (${credentials.length}):`);
		for (const cred of credentials) {
			console.log(`    • [${cred.id}] ${cred.name}`);
		}
	}

	console.log();
	const ok = await confirm("⚠️   This cannot be undone. Delete everything?");

	if (!ok) {
		console.log("\n🚫  Cancelled. Nothing was deleted.");
		return;
	}

	console.log();

	// Delete workflows first (they reference credentials)
	if (workflows.length > 0) {
		console.log(`🗑️   Deleting ${workflows.length} workflow(s)…`);
		for (const wf of workflows) {
			await deleteOne("/workflows", wf.id);
			console.log(`    ✓ ${wf.name}`);
		}
	}

	// Delete credentials
	if (credentials.length > 0) {
		console.log(`\n🗑️   Deleting ${credentials.length} credential(s)…`);
		for (const cred of credentials) {
			await deleteOne("/credentials", cred.id);
			console.log(`    ✓ ${cred.name}`);
		}
	}

	console.log("\n✅  n8n has been wiped clean.");
}

main().catch((err: unknown) => {
	console.error("\n❌  Error:", err instanceof Error ? err.message : err);
	process.exit(1);
});
