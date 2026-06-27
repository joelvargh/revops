import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { activityRouter } from "./activity";
import { campaignsRouter } from "./campaigns";
import { geographyRouter } from "./geography";
import { leadsRouter } from "./leads";
import { researchRouter } from "./research";
import { reviewRouter } from "./review";
import { settingsRouter } from "./settings";
import { statsRouter } from "./stats";
import { usersRouter } from "./users";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => "OK"),
	privateData: protectedProcedure.handler(({ context }) => ({
		message: "This is private",
		user: context.session?.user,
	})),
	users: usersRouter,
	campaigns: campaignsRouter,
	geography: geographyRouter,
	review: reviewRouter,
	research: researchRouter,
	leads: leadsRouter,
	settings: settingsRouter,
	stats: statsRouter,
	activity: activityRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
