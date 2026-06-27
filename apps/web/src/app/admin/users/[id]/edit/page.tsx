export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { client } from "@/lib/orpc";

import { EditUserForm } from "./edit-form";

export default async function EditUserPage({
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
		<div className="flex max-w-2xl flex-col gap-4 p-4 md:p-6">
			<h1 className="font-semibold text-2xl">Edit User</h1>
			<EditUserForm
				user={{
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
					banned: user.banned ?? false,
				}}
			/>
		</div>
	);
}
