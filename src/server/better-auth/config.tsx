import * as Sentry from "@sentry/nextjs";
import ResetPasswordEmail from "~/emails/reset-password";
import VerifyEmail from "~/emails/verify-email";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";

import { env } from "~/env";
import { getBusinessUrl } from "~/lib/business-url";
import { checkBusiness, checkBusinessForEmail } from "~/lib/check-business";
import { sendResendEmail } from "~/lib/email/resend";
import { EMAIL_FROM } from "~/lib/email/send";
import { recaptcha } from "~/server/better-auth/plugins/recaptcha";
import { resolvePlatformTermsAcceptance } from "~/server/better-auth/terms-acceptance";
import { db } from "~/server/db";

async function linkGuestOrdersToUser(user: {
  id: string;
  email: string;
  emailVerified: boolean;
}) {
  if (!user.emailVerified) return;
  try {
    const result = await db.customer.updateMany({
      where: {
        email: user.email.toLowerCase(),
        userId: null,
      },
      data: { userId: user.id },
    });
    if (result.count > 0) {
      console.log(
        `[Auth Hook] Linked ${result.count} customer record(s) to user ${user.id}`,
      );
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { "auth.hook": "link-guest-orders" },
      extra: { userId: user.id, email: user.email },
    });
  }
}

export const auth = betterAuth({
  baseURL: {
    allowedHosts: [
      "*.localhost:3000", // custom domains (wildcard)
      "localhost:3000", // local dev
      `${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`,
      `*.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`,
      "zairesvisions.org",
      "detroitpollinatorcompany.com",
      "happy-bamboo.org",
      "finallyresults.com",
    ],

    protocol: process.env.NODE_ENV === "development" ? "http" : "https",
  },

  database: prismaAdapter(db, {
    provider: "postgresql", // or "sqlite" or "mysql"
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: true,

    resetPasswordTokenExpiresIn: 3600, // 1 hour

    sendResetPassword: async ({ user, url }) => {
      const business = await checkBusinessForEmail();

      // On the platform domain (e.g. owner signup) no business resolves. Leave
      // the URL on BETTER_AUTH_BASE_URL — rewriting with an empty subdomain
      // produces a malformed `https://.<domain>` link — and use a neutral
      // sender instead of "undefined via SimplePress".
      const updatedResetUrl = business
        ? url.replace(
            env.BETTER_AUTH_BASE_URL,
            getBusinessUrl({
              subdomain: business.subdomain ?? "",
              customDomain: business.customDomain ?? null,
              domainStatus: business.domainStatus ?? "NONE",
            }),
          )
        : url;

      sendResendEmail({
        from: `${business?.name ?? "SimplePress"} via SimplePress <${EMAIL_FROM.NOREPLY}>`,
        to: user.email,
        subject: "Reset your SimplePress password",
        react: ResetPasswordEmail({
          name: user.name,
          businessName: business?.name ?? "",
          resetUrl: updatedResetUrl,
          logoUrl: business?.siteContent?.logoUrl ?? undefined,
        }),
      }).catch((err) => {
        Sentry.captureException(err, {
          tags: { "auth.email": "password-reset" },
        });
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string; name: string };
      url: string;
    }) => {
      const business = await checkBusinessForEmail();

      // On the platform domain (e.g. owner signup) no business resolves. Leave
      // the URL on BETTER_AUTH_BASE_URL — rewriting with an empty subdomain
      // produces a malformed `https://.<domain>` link — and use a neutral
      // sender instead of "undefined via SimplePress".
      const updatedVerifyUrl = business
        ? url.replace(
            env.BETTER_AUTH_BASE_URL,
            getBusinessUrl({
              subdomain: business.subdomain ?? "",
              customDomain: business.customDomain ?? null,
              domainStatus: business.domainStatus ?? "NONE",
            }),
          )
        : url;
      sendResendEmail({
        from: `${business?.name ?? "SimplePress"} via SimplePress <${EMAIL_FROM.NOREPLY}>`,
        to: user.email,
        subject: "Verify your email",
        react: VerifyEmail({
          name: user.name,
          businessName: business?.name ?? "",
          verifyUrl: updatedVerifyUrl,
          logoUrl: business?.siteContent?.logoUrl ?? undefined,
        }),
      }).catch((err) => {
        Sentry.captureException(err, {
          tags: { "auth.email": "verification" },
        });
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600, // 1 hour
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
    // Hand-rolled reCAPTCHA v3 gate. Reads its own keys via the shared
    // verifier, so there is nothing to configure here — see
    // `~/server/better-auth/plugins/recaptcha` for why the built-in
    // `captcha()` plugin cannot cover our DB-backed host allowlist.
    recaptcha(),
  ],
  databaseHooks: {
    user: {
      create: {
        // Platform terms-of-service acceptance. See
        // `resolvePlatformTermsAcceptance`'s docblock for the full
        // reasoning (why `/sign-up/email` + `termsAccepted` are the gate,
        // why `termsAccepted` is read off the raw body instead of being a
        // `user.additionalFields` entry, and why Discord OAuth sign-ups are
        // intentionally left with `termsAcceptedAt: null`). Kept as a
        // separate, dependency-free module so the gating logic is unit
        // testable without booting the whole `betterAuth()` instance.
        before: async (user, context) => {
          const acceptance = resolvePlatformTermsAcceptance(context);
          if (!acceptance) return;

          return { data: { ...user, ...acceptance } };
        },
        after: async (user) => {
          await linkGuestOrdersToUser(user);
        },
      },
      update: {
        after: async (user) => {
          await linkGuestOrdersToUser(user);
        },
      },
    },
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
            domainStatus: "NONE",
            subdomain: {
              not: "",
            },
          },
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
