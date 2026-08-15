import * as Sentry from "@sentry/nextjs";
import ResetPasswordEmail from "~/emails/reset-password";
import VerifyEmail from "~/emails/verify-email";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { isAPIError } from "better-auth/api";
import { organization } from "better-auth/plugins";

import { env } from "~/env";
import { allowedHosts, syncAllowedHostsFromDb } from "~/lib/auth/allowed-hosts";
import { getBusinessUrl } from "~/lib/business-url";
import { checkBusiness, checkBusinessForEmail } from "~/lib/check-business";
import { sendResendEmail } from "~/lib/email/resend";
import { EMAIL_FROM } from "~/lib/email/send";
import { createRedisSecondaryStorage } from "~/lib/redis";
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
      // userId only — never put the email in Sentry extras.
      extra: { userId: user.id, linked: true },
    });
  }
}

const secondaryStorage = env.REDIS_URL
  ? createRedisSecondaryStorage()
  : undefined;

const trustedProxyIps = (env.TRUSTED_PROXY_IPS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const auth = betterAuth({
  baseURL: {
    // Shared mutable array — `trustedOrigins` refreshes ACTIVE custom domains
    // into this same reference so newly activated domains work without redeploy.
    allowedHosts,
    // If a host arrives before the first sync (or DNS flap), fall back to the
    // platform origin rather than throwing and 500-ing every auth call.
    fallback: env.BETTER_AUTH_BASE_URL,
    protocol: process.env.NODE_ENV === "development" ? "http" : "https",
  },

  database: prismaAdapter(db, {
    provider: "postgresql", // or "sqlite" or "mysql"
  }),

  // Shared Redis when configured — keeps auth rate limits consistent across
  // Coolify replicas. Without REDIS_URL, Better Auth falls back to memory.
  ...(secondaryStorage
    ? {
        secondaryStorage,
        rateLimit: {
          enabled: true,
          storage: "secondary-storage" as const,
          window: 60,
          max: 100,
        },
      }
    : {
        rateLimit: {
          enabled: true,
          window: 60,
          max: 100,
        },
      }),

  advanced: {
    // Only honour forwarded client IPs from Coolify/Traefik when explicitly
    // configured. Empty list → better-auth refuses multi-hop XFF chains.
    ...(trustedProxyIps.length > 0
      ? {
          ipAddress: {
            ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
            trustedProxies: trustedProxyIps,
          },
        }
      : {}),
  },

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

      // Await provider acceptance so short-lived workers cannot exit before
      // Resend receives the message. Failures are reported but do not throw —
      // Better Auth has already issued the reset token by this point.
      try {
        await sendResendEmail({
          from: `${business?.name ?? "SimplePress"} via SimplePress <${EMAIL_FROM.NOREPLY}>`,
          to: user.email,
          subject: "Reset your SimplePress password",
          react: ResetPasswordEmail({
            name: user.name,
            businessName: business?.name ?? "",
            resetUrl: updatedResetUrl,
            logoUrl: business?.siteContent?.logoUrl ?? undefined,
          }),
        });
      } catch (err) {
        Sentry.captureException(err, {
          tags: { "auth.email": "password-reset" },
        });
      }
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
      try {
        await sendResendEmail({
          from: `${business?.name ?? "SimplePress"} via SimplePress <${EMAIL_FROM.NOREPLY}>`,
          to: user.email,
          subject: "Verify your email",
          react: VerifyEmail({
            name: user.name,
            businessName: business?.name ?? "",
            verifyUrl: updatedVerifyUrl,
            logoUrl: business?.siteContent?.logoUrl ?? undefined,
          }),
        });
      } catch (err) {
        Sentry.captureException(err, {
          tags: { "auth.email": "verification" },
        });
      }
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600, // 1 hour
  },

  // Discord OAuth is intentionally not enabled. Cross-domain OAuth is not
  // production-safe for multi-tenant hosts yet, and the AuthProvider does not
  // pass `socialProviders`, so the UI already hides the button. Credentials
  // remain optional in env for a future re-enable.

  user: {
    additionalFields: {
      // Privileged — clients must NEVER be able to set these via signup or
      // /update-user. Without `input: false`, Better Auth accepts them.
      platformRole: {
        type: "string",
        defaultValue: "BUSINESS_USER",
        input: false,
      },
      businessId: {
        type: "string",
        required: false,
        input: false,
      },
      businessRole: {
        type: "string",
        required: false,
        input: false,
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
              // Creation-time SNAPSHOT, stale by design — nothing ever updates
              // it, so it is null for anyone invited after they signed in and
              // wrong for the whole cookie-cache lifetime after any role
              // change. NEVER read it for authorization: server code reads
              // `ctx.membershipRole`, which the tRPC procedure tiers re-resolve
              // from the DB on every request (`~/server/api/trpc.ts`).
              membershipRole: membership?.role ?? null,
              activeOrganizationId: business.id, // keep for org plugin compat
            },
          };
        },
      },
    },
  },

  trustedOrigins: async () => {
    // Keep baseURL.allowedHosts in sync with ACTIVE custom domains so auth
    // works on newly activated domains without a code deploy.
    await syncAllowedHostsFromDb();

    const businesses = await db.business.findMany({
      where: {
        // Closed tenants must not remain trusted CSRF origins. Suspended
        // tenants stay trusted: platform admins temporarily suspend a store
        // to remediate a policy violation and must still be able to SIGN IN
        // on that tenant host (cookies are host-scoped). Origin trust is not
        // authorization — the storefront and tenant procedures still 404 a
        // suspended store for everyone but platform admins.
        status: { in: ["active", "suspended"] },
        OR: [
          {
            domainStatus: "ACTIVE",
            customDomain: {
              not: null,
            },
          },
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
      // Short cache for performance; privileged authorization still re-reads
      // platformRole from the DB. Version bump invalidates any pre-existing
      // 7-day cached payloads that may have carried a forged/stale role.
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
      version: "2",
    },
  },

  /**
   * The only Sentry seam on the entire auth surface.
   *
   * Nothing else reports auth failures. better-auth catches every throw inside
   * its own router (`better-auth/dist/api/index.mjs` → `createRouter({ onError
   * })`) and answers with a JSON error body, so the request resolves 4xx/5xx
   * *successfully* from Next's point of view. That means `onRequestError` in
   * `src/instrumentation.ts` — which only fires for errors that escape a
   * request — never sees them. Without this hook a Prisma adapter failure
   * during sign-in, a Discord token-exchange failure, or a DB outage while
   * creating a session is completely silent in production.
   *
   * ⚠️ Supplying `onError` REPLACES better-auth's own logging. The router does
   * `if (options.onAPIError?.onError) { options.onAPIError.onError(e, ctx);
   * return; }` — it returns before reaching any of its default `ctx.logger`
   * calls. So both branches below must log unconditionally, or server logs go
   * dark at the same time Sentry lights up.
   *
   * ⚠️ The discriminator is `statusCode`, NOT `status`. `APIError`'s
   * constructor (`better-call/dist/error.mjs`) stores whatever it was handed:
   * `this.status = status`, where `status` may be the string enum
   * (`"BAD_REQUEST"`) or a raw number. better-auth's own `ValidationError`
   * calls `super(400, …)`, so `status === 400` for those. Only `statusCode` is
   * normalised to a number (`statusCode = typeof status === "number" ? status
   * : statusCodes[status]`), which makes it the only safe thing to compare.
   *
   * The filter mirrors `src/app/api/trpc/[trpc]/route.ts`: **only 5xx is a
   * bug.** Wrong password, unverified email, an expired or already-consumed
   * reset/verification token, an unknown account, an untrusted origin — all are
   * sub-500 `APIError`s and are expected traffic, not defects; capturing them
   * would bury the real failures. Anything that is *not* an `APIError` has no
   * `statusCode` at all, defaults to 500, and is captured — which is exactly
   * the class we are blind to today (adapter/network/plugin throws).
   *
   * `isAPIError` is preferred over `instanceof APIError`: it also accepts
   * `error?.name === "APIError"`, so an error minted against a second copy of
   * better-call under pnpm's strict layout still classifies correctly.
   *
   * `throw` is deliberately NOT set — that would turn swallowed errors into
   * real throws and change every HTTP response. This hook is side-effect only.
   *
   * PII: `sendDefaultPii: false` platform-wide. Never put an email, password,
   * session token, or verification/reset token in these tags or extras. The
   * endpoint path is attached separately, on an isolation scope in
   * `src/app/api/auth/[...all]/route.ts` — `AuthContext` carries no request, so
   * it cannot be read here.
   */
  onAPIError: {
    onError: (error, ctx) => {
      const apiError = isAPIError(error) ? error : null;
      const statusCode = apiError?.statusCode ?? 500;

      if (apiError && statusCode < 500) {
        // Expected outcome. Log it (better-auth no longer will) and stop.
        ctx.logger.warn(`${String(apiError.status)} ${apiError.message}`);
        return;
      }

      console.error("[Auth] Unhandled auth error:", error);
      Sentry.captureException(error, {
        tags: {
          service: "better-auth",
          // `status` is string-or-number (see above), and non-APIError throws
          // have no status at all — "THROWN" is the bucket for those.
          "auth.status": String(apiError?.status ?? "THROWN"),
        },
        extra: {
          statusCode,
          code: apiError?.body?.code,
          baseURL: ctx.baseURL,
        },
      });
    },
  },
});

export type Session = typeof auth.$Infer.Session;
