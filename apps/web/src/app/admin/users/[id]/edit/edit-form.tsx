"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { client } from "@/lib/orpc";

interface Props {
	user: {
		id: string;
		name: string;
		email: string;
		role: string;
		banned: boolean;
	};
}

export function EditUserForm({ user }: Props) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [name, setName] = useState(user.name);
	const [role, setRole] = useState(user.role);

	const updateRole = useMutation({
		mutationFn: () =>
			client.users.updateRole({
				userId: user.id,
				role: role as "admin" | "user",
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
			toast.success("User updated");
			router.push(`/admin/users/${user.id}`);
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Card>
			<CardContent className="space-y-4 pt-6">
				<div className="space-y-2">
					<Label>Name</Label>
					<Input onChange={(e) => setName(e.target.value)} value={name} />
				</div>
				<div className="space-y-2">
					<Label>Email</Label>
					<Input disabled value={user.email} />
					<p className="text-muted-foreground text-xs">
						Email cannot be changed.
					</p>
				</div>
				<div className="space-y-2">
					<Label>Role</Label>
					<Select onValueChange={setRole} value={role}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="admin">Admin</SelectItem>
							<SelectItem value="user">User</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="flex gap-2 pt-4">
					<Button
						disabled={updateRole.isPending}
						onClick={() => updateRole.mutate()}
					>
						{updateRole.isPending ? "Saving..." : "Save Changes"}
					</Button>
					<Button onClick={() => router.back()} variant="outline">
						Cancel
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
