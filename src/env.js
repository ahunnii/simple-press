import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    BETTER_AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    BETTER_AUTH_DISCORD_ID: z.string(),
    BETTER_AUTH_DISCORD_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    MINIO_ACCESS_KEY: z.string(),
    MINIO_SECRET_KEY: z.string(),
    BETTER_AUTH_BASE_URL: z.string().url(),
    UMAMI_BASE_URL: z.string().url(),

    STRIPE_SECRET_KEY: z.string(),

    STRIPE_WEBHOOK_SECRET: z.string(),

    INVITATION_CODE: z.string(),
    RESEND_API_KEY: z.string(),

    SLACK_WEBHOOK_URL: z.string().url(),
    VPS_IP: z.string(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_STORAGE_URL: z.string(),
    NEXT_PUBLIC_STORAGE_BUCKET_NAME: z.string(),
    NEXT_PUBLIC_HELP_URL: z.string(),
    NEXT_PUBLIC_ENABLE_UMAMI: z
      .string()
      .refine((s) => s === "true" || s === "false")
      .transform((s) => s === "true"),
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: z.string(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(),
    NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID: z.string(),
    NEXT_PUBLIC_PLATFORM_DOMAIN: z.string(),
    NEXT_PUBLIC_EMAIL_FROM_NOREPLY: z.string(),
    NEXT_PUBLIC_EMAIL_FROM_ORDERS: z.string(),
    NEXT_PUBLIC_EMAIL_FROM_SUPPORT: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_DISCORD_ID: process.env.BETTER_AUTH_DISCORD_ID,
    BETTER_AUTH_DISCORD_SECRET: process.env.BETTER_AUTH_DISCORD_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
    NEXT_PUBLIC_STORAGE_URL: process.env.NEXT_PUBLIC_STORAGE_URL,
    NEXT_PUBLIC_STORAGE_BUCKET_NAME:
      process.env.NEXT_PUBLIC_STORAGE_BUCKET_NAME,
    BETTER_AUTH_BASE_URL: process.env.BETTER_AUTH_BASE_URL,
    NEXT_PUBLIC_HELP_URL: process.env.NEXT_PUBLIC_HELP_URL,
    NEXT_PUBLIC_ENABLE_UMAMI: process.env.NEXT_PUBLIC_ENABLE_UMAMI,
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
    UMAMI_BASE_URL: process.env.UMAMI_BASE_URL,
    INVITATION_CODE: process.env.INVITATION_CODE,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID:
      process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_PLATFORM_DOMAIN: process.env.NEXT_PUBLIC_PLATFORM_DOMAIN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NEXT_PUBLIC_EMAIL_FROM_NOREPLY: process.env.NEXT_PUBLIC_EMAIL_FROM_NOREPLY,
    NEXT_PUBLIC_EMAIL_FROM_ORDERS: process.env.NEXT_PUBLIC_EMAIL_FROM_ORDERS,
    NEXT_PUBLIC_EMAIL_FROM_SUPPORT: process.env.NEXT_PUBLIC_EMAIL_FROM_SUPPORT,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    VPS_IP: process.env.VPS_IP,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
