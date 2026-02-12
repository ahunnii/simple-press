import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "~/env";
import { db } from "~/server/db";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_BASE_URL,

  database: prismaAdapter(db, {
    provider: "postgresql", // or "sqlite" or "mysql"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
    autoSignIn: true,
  },

  socialProviders: {
    discord: {
      clientId: env.BETTER_AUTH_DISCORD_ID,
      clientSecret: env.BETTER_AUTH_DISCORD_SECRET,
      redirectURI: `${env.BETTER_AUTH_BASE_URL}/api/auth/callback/discord`,
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER",
      },
      businessId: {
        type: "string",
        required: false,
      },
    },
  },

  trustedOrigins: ["*"],

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
});

export type Session = typeof auth.$Infer.Session;
