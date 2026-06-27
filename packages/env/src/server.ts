import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    RESEND_API_KEY: z.string().min(1),
    MAIL_FROM: z.string().min(1).default("RevOps <revops@email.galaxylabs.co.in>"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    SEED_ADMIN_EMAIL: z.string().email().optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
