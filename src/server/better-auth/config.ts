import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, organization } from "better-auth/plugins";

import { env } from "~/env";
import { checkBusiness } from "~/lib/check-business";
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
      platformRole: {
        type: "string",
        defaultValue: "BUSINESS_USER",
      },
      businessId: {
        type: "string",
        required: false,
      },
      businessRole: {
        type: "string",
        required: false,
      },
    },
  },
  // hooks: {
  //   after: createAuthMiddleware(async (ctx) => {
  //     const business = await checkBusiness();

  //     const membership = await db.businessMembership.findFirst({
  //       where: {
  //         userId: ctx.context.session?.user.id,
  //         businessId: business?.id,
  //       },
  //       select: {
  //         businessId: true,
  //         role: true,
  //       },
  //     });

  //     return {
  //       context: {
  //         ...ctx.context,
  //         session: {
  //           ...ctx.context.session,
  //           user: {
  //             ...ctx.context.session?.user,
  //             businessId: membership?.businessId ?? null,
  //             businessRole: membership?.role ?? null,
  //           },
  //         },
  //       },
  //     };
  //   }),
  // },

  plugins: [
    organization({
      schema: {
        organization: { modelName: "business" },
        member: {
          modelName: "businessMembership",
          fields: { organizationId: "businessId" },
        },
      },
    }),
  ],
  // databaseHooks: {
  //   session: {
  //     create: {
  //       before: async (session) => {

  //         const business = await checkBusiness();
  //         // Implement your custom logic to set initial active organization

  //         return {
  //           data: {
  //             ...session,
  //             activeOrganizationId: business?.id,
  //           },
  //         };
  //       },
  //     },
  //   },
  // },

  trustedOrigins: ["*"],

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
});

export type Session = typeof auth.$Infer.Session;
