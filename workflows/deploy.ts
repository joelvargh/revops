#!/usr/bin/env bun
/**
 * Deploy n8n workflows upserts by name.
 * Finds existing workflow by name → updates it. Creates if not found.
 *
 * Usage: bun run workflows/deploy.ts
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Load .env.deploy from monorepo root
const scriptDir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(scriptDir, "../.env.deploy") });

const N8N_URL = process.env.N8N_URL;
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_URL || !N8N_API_KEY) {
  console.error("❌ Missing N8N_URL or N8N_API_KEY environment variables");
  process.exit(1);
}

interface N8nWorkflow {
  id: string;
  name: string;
}

interface WorkflowFile {
  name: string;
  nodes: unknown[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
}

const headers = {
  "X-N8N-API-KEY": N8N_API_KEY,
  "Content-Type": "application/json",
};

async function fetchExistingWorkflows(): Promise<Map<string, string>> {
  const res = await fetch(`${N8N_URL}/api/v1/workflows?limit=100`, { headers });
  if (!res.ok) throw new Error(`Failed to list workflows: ${res.status}`);
  const { data } = (await res.json()) as { data: N8nWorkflow[] };
  return new Map(data.map((w) => [w.name, w.id]));
}

async function updateWorkflow(id: string, workflow: WorkflowFile) {
  const res = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update ${id}: ${res.status} ${err}`);
  }
}

async function createWorkflow(workflow: WorkflowFile): Promise<string> {
  const res = await fetch(`${N8N_URL}/api/v1/workflows`, {
    method: "POST",
    headers,
    body: JSON.stringify(workflow),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create: ${res.status} ${err}`);
  }
  const created = (await res.json()) as N8nWorkflow;
  return created.id;
}

async function main() {
  const workflowDir = dirname(fileURLToPath(import.meta.url));
  const files = readdirSync(workflowDir).filter((f) => f.startsWith("wf-") && f.endsWith(".json"));

  if (files.length === 0) {
    console.log("No workflow files found.");
    return;
  }

  console.log(`Found ${files.length} workflow files`);
  console.log(`Target: ${N8N_URL}\n`);

  const existing = await fetchExistingWorkflows();
  console.log(`Existing workflows on server: ${existing.size}\n`);

  for (const file of files) {
    const raw = readFileSync(join(workflowDir, file), "utf-8");
    const workflow = JSON.parse(raw) as WorkflowFile;

    if (existing.has(workflow.name)) {
      const id = existing.get(workflow.name)!;
      await updateWorkflow(id, workflow);
      console.log(`  ✓ Updated: ${workflow.name} (${id})`);
    } else {
      const id = await createWorkflow(workflow);
      console.log(`  + Created: ${workflow.name} (${id})`);
    }
  }

  console.log("\n✅ Deploy complete");
}

main().catch((err: Error) => {
  console.error("❌ Deploy failed:", err.message);
  process.exit(1);
});
