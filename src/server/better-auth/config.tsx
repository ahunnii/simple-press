import { EmailTemplate } from "@daveyplate/better-auth-ui/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { captcha, organization } from "better-auth/plugins";

import { env } from "~/env";
import { checkBusiness } from "~/lib/check-business";
import { resend } from "~/lib/email/resend";
import { EMAIL_FROM } from "~/lib/email/send";
import { db } from "~/server/db";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_BASE_URL,

  database: prismaAdapter(db, {
    provider: "postgresql", // or "sqlite" or "mysql"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: true,
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string; name: string };
      url: string;
    }) => {
      void resend.emails.send({
        from: EMAIL_FROM.NOREPLY,
        to: user.email,
        subject: "Verify your email",
        react: EmailTemplate({
          action: "Verify Email",
          heading: "Verify your email address",
          content: (
            <>
              <p>{`Hello ${user.name},`}</p>
              <p>
                Click the button below to verify your email and activate your
                account.
              </p>
            </>
          ),
          siteName: "SimplePress",
          baseUrl: env.BETTER_AUTH_BASE_URL,
          url,
        }),
      });
    },
    sendResetPassword: async ({ user, url }) => {
      void resend.emails.send({
        from: EMAIL_FROM.NOREPLY,
        to: user.email,
        subject: "Reset your password",
        // html: `Click the link to reset your password: ${url}`,
        react: EmailTemplate({
          action: "Reset Password",
          heading: "Reset Password",
          content: (
            <>
              <p>{`Hello ${user.name},`}</p>
              <p>Click the button below to reset your password.</p>
            </>
          ),
          siteName: "SimplePress",
          baseUrl: env.BETTER_AUTH_BASE_URL,

          url,
        }),
      });
    },
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
    captcha({
      provider: "hcaptcha",
      secretKey: env.HCAPTCHA_SECRET_KEY,
      siteKey: env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY,
    }),
  ],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const business = await checkBusiness();
          if (!business) return { data: session };

          const membership = await db.businessMembership.findFirst({
            where: {
              userId: session.userId,
              businessId: business.id,
            },
            select: { id: true, businessId: true, role: true },
          });

          return {
            data: {
              ...session,
              businessId: membership?.businessId ?? null,
              membershipId: membership?.id ?? null,
              membershipRole: membership?.role ?? null,
              activeOrganizationId: business.id, // keep for org plugin compat
            },
          };
        },
      },
    },
  },

  trustedOrigins: async () => {
    const businesses = await db.business.findMany({
      where: {
        OR: [
          // Active businesses with a valid custom domain
          {
            domainStatus: "ACTIVE",
            customDomain: {
              not: null,
            },
          },
          // Inactive businesses with a valid subdomain
          {
            domainStatus: "PENDING_DNS",
            subdomain: {
              not: "",
            },
          },
        ],
      },
      select: { customDomain: true, subdomain: true },
    });

    const domains = [
      env.BETTER_AUTH_BASE_URL,
      ...businesses.flatMap((b) => [
        b.customDomain ? `https://${b.customDomain}` : null,
        `https://${b.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`,
        // Allow HTTP for local dev subdomains
        process.env.NODE_ENV === "development"
          ? `http://${b.subdomain}.localhost:3000`
          : null,
      ]),
    ].filter((o): o is string => o !== null);
    return domains;
  },

  session: {
    additionalFields: {
      businessId: {
        type: "string",
        required: false,
        defaultValue: null,
      },
      membershipId: {
        type: "string",
        required: false,
        defaultValue: null,
      },
      membershipRole: {
        type: "string",
        required: false,
        defaultValue: null,
      },
    },
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
});

export type Session = typeof auth.$Infer.Session;
