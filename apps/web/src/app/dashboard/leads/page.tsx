"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
	DataTable,
	type FilterConfig,
	type QueryParams,
} from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { client } from "@/lib/orpc";

type Lead = {
	id: string;
	name: string;
	industry: string | null;
	employeeCount: number | null;
	revenueMm: number | null;
	scoreTotal: number | null;
	status: string;
	city: string | null;
	state: string | null;
	country: string | null;
};

const columns: ColumnDef<Lead, unknown>[] = [
	{ accessorKey: "name", header: "Company" },
	{ accessorKey: "industry", header: "Industry" },
	{ accessorKey: "employeeCount", header: "Employees" },
	{
		accessorKey: "revenueMm",
		header: "Revenue ($M)",
		cell: ({ getValue }) => (getValue() == null ? "—" : `$${getValue()}M`),
	},
	{ accessorKey: "scoreTotal", header: "ICP Score" },
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ getValue }) => (
			<Badge variant="secondary">{String(getValue()).replace(/_/g, " ")}</Badge>
		),
	},
	{
		id: "location",
		header: "Location",
		cell: ({ row }) =>
			[row.original.city, row.original.state].filter(Boolean).join(", ") || "—",
	},
];

const statusOptions = [
	"DISCOVERED",
	"FILTERED",
	"ICP_QUALIFIED",
	"ICP_REVIEW_PENDING",
	"ICP_DISQUALIFIED",
	"CONTACT_ACQUIRED",
	"READY",
].map((s) => ({ label: s.replace(/_/g, " "), value: s }));

const countryOptions = [
	{ label: "US", value: "US" },
	{ label: "UK", value: "UK" },
	{ label: "CA", value: "CA" },
	{ label: "AU", value: "AU" },
];

const filters: FilterConfig[] = [
	{ id: "status", label: "Status", options: statusOptions },
	{ id: "country", label: "Country", options: countryOptions },
];

async function queryFn(params: QueryParams) {
	const result = await client.leads.list({
		page: params.page,
		perPage: params.perPage,
		search: params.search || undefined,
		status: params.filters.status ? [params.filters.status] : undefined,
		country: params.filters.country || undefined,
	});
	return {
		data: result.companies as Lead[],
		pageCount: result.pageCount,
		total: result.total,
	};
}

export default function LeadsPage() {
	return (
		<div className="flex flex-col gap-4 p-4 md:p-6">
			<div>
				<h1 className="font-semibold text-2xl">Leads</h1>
				<p className="text-muted-foreground text-sm">
					All discovered companies in the pipeline.
				</p>
			</div>
			<DataTable<Lead>
				columns={columns}
				defaultPerPage={50}
				filters={filters}
				queryFn={queryFn}
				queryKey="leads"
				searchPlaceholder="Search by company name..."
			/>
		</div>
	);
}
