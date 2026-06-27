import { auth } from "@revops/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/login");
	}
	if (session.user.role === "admin") {
		redirect("/admin");
	}
	redirect("/dashboard");
}
