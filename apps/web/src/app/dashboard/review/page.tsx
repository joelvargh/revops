"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type QueryParams } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { client } from "@/lib/orpc";

type ReviewItem = {
	id: string;
	name: string;
	industry: string | null;
	employeeCount: number | null;
	revenueMm: number | null;
	scoreTotal: number | null;
};

export default function ReviewPage() {
	const queryClient = useQueryClient();
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const toggle = (id: string) =>
		setSelected((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const toggleAll = (ids: string[], checked: boolean) => {
		setSelected(checked ? new Set(ids) : new Set());
	};

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ["review"] });
		setSelected(new Set());
	};

	const approveMutation = useMutation({
		mutationFn: (id: string) => client.review.approve({ companyId: id }),
		onSuccess: () => {
			invalidate();
			toast.success("Approved");
		},
	});

	const rejectMutation = useMutation({
		mutationFn: (id: string) => client.review.reject({ companyId: id }),
		onSuccess: () => {
			invalidate();
			toast.success("Rejected");
		},
	});

	const bulkApproveMutation = useMutation({
		mutationFn: (ids: string[]) =>
			client.review.bulkApprove({ companyIds: ids }),
		onSuccess: () => {
			invalidate();
			toast.success("Bulk approved");
		},
	});

	const bulkRejectMutation = useMutation({
		mutationFn: (ids: string[]) =>
			client.review.bulkReject({ companyIds: ids }),
		onSuccess: () => {
			invalidate();
			toast.success("Bulk rejected");
		},
	});

	const columns: ColumnDef<ReviewItem, unknown>[] = [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={
						selected.size > 0 &&
						selected.size === table.getRowModel().rows.length
					}
					onCheckedChange={(checked) =>
						toggleAll(
							table.getRowModel().rows.map((r) => r.original.id),
							!!checked
						)
					}
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={selected.has(row.original.id)}
					onCheckedChange={() => toggle(row.original.id)}
				/>
			),
		},
		{ accessorKey: "name", header: "Company" },
		{
			accessorKey: "scoreTotal",
			header: "Score",
			cell: ({ getValue }) => (
				<Badge variant="secondary">{String(getValue() ?? "—")}</Badge>
			),
		},
		{ accessorKey: "industry", header: "Industry" },
		{ accessorKey: "employeeCount", header: "Employees" },
		{
			accessorKey: "revenueMm",
			header: "Revenue ($M)",
			cell: ({ getValue }) => (getValue() == null ? "—" : `$${getValue()}M`),
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => (
				<div className="flex gap-1">
					<Button
						disabled={approveMutation.isPending}
						onClick={() => approveMutation.mutate(row.original.id)}
						size="sm"
						variant="ghost"
					>
						<CheckCircle className="size-4 text-green-600" />
					</Button>
					<Button
						disabled={rejectMutation.isPending}
						onClick={() => rejectMutation.mutate(row.original.id)}
						size="sm"
						variant="ghost"
					>
						<XCircle className="size-4 text-red-600" />
					</Button>
				</div>
			),
		},
	];

	async function queryFn(params: QueryParams) {
		const result = await client.review.list({
			page: params.page,
			perPage: params.perPage,
			search: params.search || undefined,
		});
		return {
			data: result.data as ReviewItem[],
			pageCount: result.pageCount,
			total: result.total,
		};
	}

	return (
		<div className="flex flex-col gap-4 p-4 md:p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Review Queue</h1>
					<p className="text-muted-foreground text-sm">
						Companies pending ICP review.
					</p>
				</div>
				{selected.size > 0 && (
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground text-sm">
							{selected.size} selected
						</span>
						<Button
							disabled={bulkApproveMutation.isPending}
							onClick={() => bulkApproveMutation.mutate([...selected])}
							size="sm"
						>
							<CheckCircle className="mr-1 size-4" /> Approve
						</Button>
						<Button
							disabled={bulkRejectMutation.isPending}
							onClick={() => bulkRejectMutation.mutate([...selected])}
							size="sm"
							variant="destructive"
						>
							<XCircle className="mr-1 size-4" /> Reject
						</Button>
					</div>
				)}
			</div>
			<DataTable<ReviewItem>
				columns={columns}
				defaultPerPage={20}
				queryFn={queryFn}
				queryKey="review"
				searchPlaceholder="Search companies..."
			/>
		</div>
	);
}
