"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
	DataTable,
	type QueryParams,
	type QueryResult,
} from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { client, orpc } from "@/lib/orpc";

interface Campaign {
	_count: { discoveryRuns: number };
	createdAt: Date;
	id: string;
	name: string;
	regions: { region: { name: string; code: string } }[];
	searchTerm: string;
	status: string;
}

function statusVariant(status: string): "default" | "secondary" | "outline" {
	if (status === "ACTIVE") {
		return "default";
	}
	if (status === "PAUSED") {
		return "secondary";
	}
	return "outline";
}

const columns: ColumnDef<Campaign, unknown>[] = [
	{
		accessorKey: "name",
		header: "Name",
		cell: ({ row }) => (
			<a
				className="font-medium hover:underline"
				href={`/dashboard/campaigns/${row.original.id}`}
			>
				{row.original.name}
			</a>
		),
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => (
			<Badge variant={statusVariant(row.original.status)}>
				{row.original.status}
			</Badge>
		),
	},
	{
		id: "regions",
		header: "Regions",
		cell: ({ row }) => row.original.regions.length,
	},
	{
		id: "companies",
		header: "Discovery Runs",
		cell: ({ row }) => row.original._count.discoveryRuns,
	},
	{
		accessorKey: "createdAt",
		header: "Created",
		cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
	},
];

async function queryFn(params: QueryParams): Promise<QueryResult<Campaign>> {
	const campaigns = await client.campaigns.list();
	let filtered = campaigns as Campaign[];

	if (params.search) {
		const q = params.search.toLowerCase();
		filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
	}
	if (params.filters.status) {
		filtered = filtered.filter((c) => c.status === params.filters.status);
	}

	const total = filtered.length;
	const start = (params.page - 1) * params.perPage;
	const data = filtered.slice(start, start + params.perPage);

	return { data, pageCount: Math.ceil(total / params.perPage), total };
}

export function CampaignsTable() {
	return (
		<DataTable
			columns={columns}
			filters={[
				{
					id: "status",
					label: "Status",
					options: [
						{ label: "Active", value: "ACTIVE" },
						{ label: "Paused", value: "PAUSED" },
						{ label: "Completed", value: "COMPLETED" },
					],
				},
			]}
			queryFn={queryFn}
			queryKey={orpc.campaigns.list.key({})}
			searchPlaceholder="Search campaigns..."
		/>
	);
}
