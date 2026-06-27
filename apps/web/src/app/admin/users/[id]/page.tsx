export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { client } from "@/lib/orpc";

export default async function UserViewPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const data = await client.users.list({ page: 1, perPage: 100 });
	const user = data.users.find((u) => u.id === id);

	if (!user) {
		notFound();
	}

	return (
		<div className="flex flex-col gap-4 p-4 md:p-6">
			<div className="flex items-center justify-between">
				<h1 className="font-semibold text-2xl">{user.name}</h1>
				<Button asChild>
					<Link href={`/admin/users/${id}/edit` as never}>Edit User</Link>
				</Button>
			</div>
			<Card>
				<CardHeader>
					<CardTitle>User Details</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-2">
					<div>
						<p className="text-muted-foreground text-sm">Email</p>
						<p className="font-medium">{user.email}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-sm">Role</p>
						<Badge variant={user.role === "admin" ? "default" : "secondary"}>
							{user.role}
						</Badge>
					</div>
					<div>
						<p className="text-muted-foreground text-sm">Status</p>
						<Badge variant={user.banned ? "destructive" : "outline"}>
							{user.banned ? "Banned" : "Active"}
						</Badge>
					</div>
					<div>
						<p className="text-muted-foreground text-sm">Joined</p>
						<p>{new Date(user.createdAt).toLocaleDateString()}</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
