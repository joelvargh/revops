import prisma from "@revops/db";
import { env } from "@revops/env/server";
import { sendOtpEmail } from "@revops/mail";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin as adminPlugin, emailOTP } from "better-auth/plugins";

import { ac, admin, user } from "./permissions";

export const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: "postgresql" }),
	trustedOrigins: [env.CORS_ORIGIN, env.BETTER_AUTH_URL],
	emailAndPassword: { enabled: false },
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	plugins: [
		nextCookies(),
		emailOTP({
			async sendVerificationOTP({ email, otp, type }) {
				if (type === "sign-in") {
					await sendOtpEmail(email, otp);
				}
			},
			otpLength: 6,
			expiresIn: 300,
			disableSignUp: true,
		}),
		adminPlugin({ ac, roles: { admin, user }, defaultRole: "user" }),
	],
});

export type Auth = typeof auth;
