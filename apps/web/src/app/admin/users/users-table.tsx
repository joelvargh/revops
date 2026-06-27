"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
	DataTable,
	type FilterConfig,
	type QueryParams,
	type QueryResult,
} from "@/components/data-table";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { client } from "@/lib/orpc";

interface User {
	createdAt: string;
	email: string;
	id: string;
	name: string;
	role: string;
}

const filterConfigs: FilterConfig[] = [
	{
		id: "role",
		label: "Roles",
		options: [
			{ label: "Admin", value: "admin" },
			{ label: "User", value: "user" },
		],
	},
];

async function fetchUsers(params: QueryParams): Promise<QueryResult<User>> {
	const filters: { id: string; value: unknown }[] = [];
	if (params.search) {
		filters.push({ id: "name", value: params.search });
	}
	if (params.filters.role) {
		filters.push({ id: "role", value: [params.filters.role] });
	}
	const result = await client.users.list({
		page: params.page,
		perPage: params.perPage,
		filters: filters.length > 0 ? filters : undefined,
	});
	return {
		data: result.users as unknown as User[],
		pageCount: result.pageCount,
		total: result.total,
	};
}

export function UsersTable() {
	const queryClient = useQueryClient();
	const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
	const [confirmEmail, setConfirmEmail] = useState("");

	const deleteMutation = useMutation({
		mutationFn: (userId: string) => client.users.delete({ userId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
			toast.success("User deleted");
			setDeleteTarget(null);
			setConfirmEmail("");
		},
		onError: (err) => toast.error(err.message),
	});

	const columns: ColumnDef<User, unknown>[] = [
		{
			accessorKey: "name",
			header: "Name",
			cell: ({ row }) => (
				<span className="font-medium">{row.getValue("name")}</span>
			),
		},
		{ accessorKey: "email", header: "Email" },
		{
			accessorKey: "role",
			header: "Role",
			cell: ({ row }) => (
				<Badge
					variant={row.getValue("role") === "admin" ? "default" : "secondary"}
				>
					{row.getValue("role") as string}
				</Badge>
			),
		},
		{
			accessorKey: "createdAt",
			header: "Joined",
			cell: ({ row }) =>
				new Date(row.getValue("createdAt") as string).toLocaleDateString(),
		},
		{
			id: "actions",
			header: "",
			cell: ({ row }) => (
				<div className="flex gap-1">
					<Button asChild className="size-8" size="icon" variant="ghost">
						<Link href={`/admin/users/${row.original.id}`}>
							<Eye className="size-4" />
						</Link>
					</Button>
					<Button asChild className="size-8" size="icon" variant="ghost">
						<Link href={`/admin/users/${row.original.id}/edit`}>
							<Pencil className="size-4" />
						</Link>
					</Button>
					<Button
						className="size-8 text-destructive hover:text-destructive"
						onClick={() => setDeleteTarget(row.original)}
						size="icon"
						variant="ghost"
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			),
		},
	];

	return (
		<>
			<DataTable<User>
				columns={columns}
				defaultPerPage={20}
				filters={filterConfigs}
				queryFn={fetchUsers}
				queryKey="users"
				searchPlaceholder="Search by name..."
			/>

			{/* Delete confirmation dialog */}
			<AlertDialog
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
						setConfirmEmail("");
					}
				}}
				open={!!deleteTarget}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete user?</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3">
								<p>
									This will permanently delete{" "}
									<span className="font-medium text-foreground">
										{deleteTarget?.name}
									</span>{" "}
									and all associated data. This cannot be undone.
								</p>
								<p className="text-sm">
									Type{" "}
									<span className="font-mono font-semibold">
										{deleteTarget?.email}
									</span>{" "}
									to confirm:
								</p>
								<Input
									onChange={(e) => setConfirmEmail(e.target.value)}
									placeholder={deleteTarget?.email}
									value={confirmEmail}
								/>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={
								confirmEmail !== deleteTarget?.email || deleteMutation.isPending
							}
							onClick={() =>
								deleteTarget && deleteMutation.mutate(deleteTarget.id)
							}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete User"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
