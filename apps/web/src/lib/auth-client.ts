import { ac, admin, user } from "@revops/auth/permissions";
import { adminClient, emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL:
		typeof window === "undefined"
			? "http://localhost:3001"
			: window.location.origin,
	plugins: [
		emailOTPClient(),
		adminClient({
			ac,
			roles: { admin, user },
		}),
	],
});
