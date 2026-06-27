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

export function CreateUserForm() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("user");

	const createMutation = useMutation({
		mutationFn: () =>
			client.users.create({ name, email, role: role as "admin" | "user" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
			toast.success("User created");
			router.push("/admin/users");
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<Card>
			<CardContent className="space-y-4 pt-6">
				<div className="space-y-2">
					<Label>Name</Label>
					<Input
						onChange={(e) => setName(e.target.value)}
						placeholder="John Doe"
						required
						value={name}
					/>
				</div>
				<div className="space-y-2">
					<Label>Email</Label>
					<Input
						onChange={(e) => setEmail(e.target.value)}
						placeholder="john@company.com"
						required
						type="email"
						value={email}
					/>
					<p className="text-muted-foreground text-xs">
						User will sign in via email OTP. No password needed.
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
						disabled={createMutation.isPending || !name || !email}
						onClick={() => createMutation.mutate()}
					>
						{createMutation.isPending ? "Creating..." : "Create User"}
					</Button>
					<Button onClick={() => router.back()} variant="outline">
						Cancel
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
