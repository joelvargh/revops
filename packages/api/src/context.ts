import { auth } from "@revops/auth";
import prisma from "@revops/db";
import type { NextRequest } from "next/server";

export async function createContext(req: NextRequest) {
	const session = await auth.api.getSession({ headers: req.headers });
	return { session, prisma };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
