import "server-only";

import { createRouterClient } from "@orpc/server";
import { appRouter } from "@revops/api/routers/index";
import { headers } from "next/headers";

globalThis.$client = createRouterClient(appRouter, {
	context: async () => {
		const { auth } = await import("@revops/auth");
		const h = await headers();
		const session = await auth.api.getSession({ headers: h });
		return { auth: null, session };
	},
});
