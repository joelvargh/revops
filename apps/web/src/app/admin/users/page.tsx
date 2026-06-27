import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UsersTable } from "./users-table";

export default function UsersPage() {
	return (
		<div className="flex flex-col gap-4 p-4 md:p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Users</h1>
					<p className="text-muted-foreground text-sm">
						Manage team members and their roles.
					</p>
				</div>
				<Button asChild>
					<Link href="/admin/users/create">Create User</Link>
				</Button>
			</div>
			<UsersTable />
		</div>
	);
}
