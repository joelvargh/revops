import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Public routes — no auth needed
	if (pathname.startsWith("/login") || pathname.startsWith("/api/")) {
		return NextResponse.next();
	}

	// Check session cookie (optimistic — real validation in layout)
	const sessionCookie = getSessionCookie(request);
	if (!sessionCookie) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|icon.svg|logo.svg).*)"],
};
