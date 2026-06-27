import { CreateUserForm } from "./create-form";

export default function CreateUserPage() {
	return (
		<div className="flex max-w-2xl flex-col gap-4 p-4 md:p-6">
			<h1 className="font-semibold text-2xl">Create User</h1>
			<CreateUserForm />
		</div>
	);
}
