import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { DbClient, TxClient } from "~/server/db";
import { getBusinessUrl } from "~/lib/business-url";
import { captchaFailureToTrpcError } from "~/lib/captcha/trpc-error";
import { verifyRecaptcha } from "~/lib/captcha/verify-recaptcha";
import { checkBusiness } from "~/lib/check-business";
import {
  createNewsletterConfirmToken,
  verifyNewsletterConfirmToken,
} from "~/lib/email/newsletter-confirm-token";
import { sendNewsletterConfirmEmail } from "~/lib/email/templates";
import { verifyUnsubscribeToken } from "~/lib/email/unsubscribe-token";
import { resolveFlags } from "~/lib/features/resolve-flags";
import {
  hasMarketingConsentHistory,
  MARKETING_SUPPRESSION_REASONS,
  marketingOptInData,
} from "~/lib/marketing/consent";
import {
  consentRequestMeta,
  recordConsentEvent,
} from "~/lib/marketing/consent-log";
import {
  NEWSLETTER_CONSENT_WORDING,
  RESUBSCRIBE_WORDING,
} from "~/lib/marketing/consent-wording";
import {
  isOnDoNotEmailList,
  removeFromDoNotEmail,
} from "~/lib/marketing/do-not-email";
import { isUniqueConstraintError } from "~/lib/prisma-errors";
import {
  getClientIpFromHeaders,
  newsletterConsentActionLimiter,
  newsletterSubscribeEmailLimiter,
  newsletterSubscribeGlobalEmailLimiter,
  newsletterSubscribeIpLimiter,
} from "~/lib/rate-limit";
import { normalizeEmail } from "~/lib/utils";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

/** The email-marketing feature flag every procedure here is gated on. */
const FEATURE_KEY = "emailMarketing";

const UNAVAILABLE_MESSAGE =
  "Newsletter sign-up isn't available for this store right now.";

const tooMany = () =>
  new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: "Too many attempts. Please try again later.",
  });

export const subscribeInputSchema = z.object({
  email: z.string().trim().email().max(254),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  captchaToken: z.string().max(4096),
  /** Honeypot: real visitors never see this field, so it is always empty. */
  website: z.string().max(500).optional(),
});

const tokenInputSchema = z.object({ token: z.string().min(1).max(4096) });

/**
 * Resolve the tenant from the request host (never from client input) and
 * require the `emailMarketing` flag. Anything else is a typed FORBIDDEN the
 * sign-up UI renders as its honest "not available" state.
 */
async function requireNewsletterBusiness(db: DbClient) {
  const tenant = await checkBusiness();
  if (!tenant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }
  const business = await db.business.findUnique({
    where: { id: tenant.id },
    select: {
      id: true,
      name: true,
      ownerEmail: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
      featureFlags: true,
      siteContent: { select: { logoUrl: true } },
    },
  });
  if (!business) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }
  const { isEnabled, disabledByDependency } = resolveFlags(
    business.featureFlags,
  );
  if (!isEnabled(FEATURE_KEY) || disabledByDependency.includes(FEATURE_KEY)) {
    throw new TRPCError({ code: "FORBIDDEN", message: UNAVAILABLE_MESSAGE });
  }
  return business;
}

/**
 * Per-IP limit for the token-gated actions, keyed on the RESOLVED store
 * rather than the raw Host header (host spellings that resolve to one store —
 * case, port, alias domains — would otherwise each get a fresh bucket).
 */
async function consumeActionLimit(headers: Headers, businessId: string) {
  const ip = getClientIpFromHeaders(headers);
  try {
    await newsletterConsentActionLimiter.consume(`${ip}:${businessId}`);
  } catch {
    throw tooMany();
  }
}

/** Whether a bounce / complaint / provider block excludes this customer. */
function isSuppressed(customer: {
  marketingSuppressedAt: Date | null;
  marketingSuppressionReason: string | null;
}) {
  return (
    customer.marketingSuppressedAt !== null ||
    (MARKETING_SUPPRESSION_REASONS as readonly string[]).includes(
      customer.marketingSuppressionReason ?? "",
    )
  );
}

export const newsletterRouter = createTRPCRouter({
  /**
   * Double opt-in step 1. Nothing is stored; we email a signed link. The
   * response is identical for new, already-subscribed and rate-limited-by-
   * email-free paths, so the form can't be used to probe who is a customer.
   */
  subscribe: publicProcedure
    .input(subscribeInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Bots fill the hidden field; pretend it worked and do nothing.
      if (input.website && input.website.trim() !== "") {
        return { ok: true as const };
      }

      const requestHost = ctx.headers.get("host") ?? "";
      const rawIp = getClientIpFromHeaders(ctx.headers);
      const remoteIp = rawIp === "unknown" ? undefined : rawIp;

      // Resolve the store first so the per-IP bucket is keyed on its id, not
      // the raw Host header (see `consumeActionLimit`).
      const business = await requireNewsletterBusiness(ctx.db);

      try {
        await newsletterSubscribeIpLimiter.consume(`${rawIp}:${business.id}`);
      } catch {
        throw tooMany();
      }

      const captcha = await verifyRecaptcha(input.captchaToken, {
        action: "newsletter",
        requestHost,
        remoteIp,
      });
      if (!captcha.ok) {
        throw captchaFailureToTrpcError(captcha.reason);
      }

      // Per-address limits only after the captcha, so nobody can burn a
      // victim's budget (and lock them out of signing up) without solving
      // it. The global one stops fanning sign-ups for one inbox out across
      // many stores.
      const email = normalizeEmail(input.email);
      try {
        await newsletterSubscribeEmailLimiter.consume(
          `${business.id}:${email}`,
        );
        await newsletterSubscribeGlobalEmailLimiter.consume(email);
      } catch {
        throw tooMany();
      }

      const existing = await ctx.db.customer.findUnique({
        where: { businessId_email: { businessId: business.id, email } },
        select: {
          acceptsMarketing: true,
          marketingSuppressedAt: true,
          anonymizedAt: true,
        },
      });
      if (
        existing?.acceptsMarketing &&
        !existing.marketingSuppressedAt &&
        !existing.anonymizedAt
      ) {
        return { ok: true as const };
      }

      const token = createNewsletterConfirmToken({
        businessId: business.id,
        email,
        firstName: input.firstName,
        lastName: input.lastName,
      });
      const baseUrl = getBusinessUrl({
        subdomain: business.subdomain,
        customDomain: business.customDomain,
        domainStatus: business.domainStatus,
      });
      const confirmUrl = `${baseUrl}/email-preferences?view=confirm&t=${encodeURIComponent(token)}`;

      const report = (err?: unknown) => {
        const context = {
          level: "warning" as const,
          tags: { feature: "newsletter", step: "email-confirm" },
          extra: { businessId: business.id },
        };
        if (err === undefined) {
          Sentry.captureMessage(
            "Newsletter confirmation email failed",
            context,
          );
        } else {
          Sentry.captureException(err, context);
        }
      };
      const send = () =>
        sendNewsletterConfirmEmail({
          to: email,
          businessName: business.name,
          confirmUrl,
          logoUrl: business.siteContent?.logoUrl ?? undefined,
          ownerEmail: business.ownerEmail ?? undefined,
        }).then((result) => {
          if (!result.success) report();
        }, report);
      // Never awaited: this path and the already-subscribed one above both
      // return without waiting on Resend, so response time can't reveal who
      // is on the list. `after()` keeps the send alive past the response;
      // outside a request scope (scripts, test callers) it throws, and we
      // fall back to a detached promise (same idiom as marketing.ts).
      try {
        after(send);
      } catch {
        void send();
      }

      // Same answer whether or not an email actually went out.
      return { ok: true as const };
    }),

  /**
   * Double opt-in step 2: a POST from the button on /email-preferences (never
   * a GET, so link scanners can't confirm for the recipient). The signed
   * token carries the email, so nothing the client sends can pick the address.
   */
  confirm: publicProcedure
    .input(tokenInputSchema)
    .mutation(async ({ ctx, input }) => {
      const business = await requireNewsletterBusiness(ctx.db);
      await consumeActionLimit(ctx.headers, business.id);

      const verified = verifyNewsletterConfirmToken(input.token);
      // A token minted for another store is indistinguishable from a bad one.
      if (!verified.ok) {
        return { ok: false as const, reason: verified.reason };
      }
      if (verified.payload.b !== business.id) {
        return { ok: false as const, reason: "invalid" as const };
      }

      const { e: email, f, l, iat } = verified.payload;
      const where = {
        businessId_email: { businessId: business.id, email },
      };
      const meta = consentRequestMeta(ctx.headers);
      // Clicking the link proves current inbox access, which is the one
      // thing allowed to lift a bounce / complaint suppression — on the
      // customer row AND on the store's do-not-email list (any reason).
      const optIn = () =>
        marketingOptInData("NEWSLETTER_FORM", { clearSuppression: true });

      /**
       * Consent evidence for a confirm, in the caller's transaction. The
       * do-not-email entry is lifted on every confirm (it's a no-op when
       * absent); UNSUPPRESSED is logged only when something was actually
       * lifted (customer suppression or a list entry). OPT_IN is logged only
       * by callers that really flip `acceptsMarketing`.
       */
      const liftDoNotEmail = async (
        tx: TxClient,
        customerId: string,
        wasSuppressed: boolean,
      ) => {
        const removed = await removeFromDoNotEmail(tx, business.id, email);
        if (wasSuppressed || removed) {
          await recordConsentEvent(tx, {
            businessId: business.id,
            customerId,
            type: "UNSUPPRESSED",
            source: "NEWSLETTER_FORM",
            ip: meta.ip,
            userAgent: meta.userAgent,
          });
        }
      };
      const logOptIn = (tx: TxClient, customerId: string) =>
        recordConsentEvent(tx, {
          businessId: business.id,
          customerId,
          type: "OPT_IN",
          source: "NEWSLETTER_FORM",
          ip: meta.ip,
          userAgent: meta.userAgent,
          wording: NEWSLETTER_CONSENT_WORDING,
        });

      const applyExisting = (): Promise<"missing" | "stale" | "applied"> =>
        ctx.db.$transaction(async (tx) => {
          const row = await tx.customer.findUnique({
            where,
            select: {
              id: true,
              firstName: true,
              lastName: true,
              acceptsMarketing: true,
              marketingSuppressedAt: true,
              marketingUnsubscribedAt: true,
            },
          });
          if (!row) return "missing" as const;
          // A link minted before a later unsubscribe is a replay of consent
          // the person has since withdrawn: never let it opt them back in.
          if (
            row.marketingUnsubscribedAt &&
            iat < row.marketingUnsubscribedAt.getTime()
          ) {
            return "stale" as const;
          }
          const names = {
            ...(f && !row.firstName ? { firstName: f } : {}),
            ...(l && !row.lastName ? { lastName: l } : {}),
          };
          // Already a clean subscriber: keep the original consent record.
          const alreadyOptedIn =
            row.acceptsMarketing && !row.marketingSuppressedAt;
          const data = alreadyOptedIn ? names : { ...optIn(), ...names };
          if (Object.keys(data).length > 0) {
            await tx.customer.update({ where: { id: row.id }, data });
          }
          await liftDoNotEmail(tx, row.id, row.marketingSuppressedAt !== null);
          if (!alreadyOptedIn) await logOptIn(tx, row.id);
          return "applied" as const;
        });

      let outcome = await applyExisting();
      if (outcome === "missing") {
        try {
          await ctx.db.$transaction(async (tx) => {
            const created = await tx.customer.create({
              data: {
                businessId: business.id,
                email,
                firstName: f ?? null,
                lastName: l ?? null,
                ...optIn(),
              },
              select: { id: true },
            });
            await liftDoNotEmail(tx, created.id, false);
            await logOptIn(tx, created.id);
          });
          outcome = "applied";
        } catch (err) {
          // Lost a race with an order / another confirm click: update instead.
          if (!isUniqueConstraintError(err)) throw err;
          outcome = await applyExisting();
        }
      }
      // Shown as the friendly "link has expired, sign up again" state.
      if (outcome === "stale") {
        return { ok: false as const, reason: "expired" as const };
      }

      return { ok: true as const };
    }),

  /**
   * Undo for the unsubscribe page. Holding a valid unsubscribe token proves
   * the caller once received our email, so it is enough to flip the switch
   * back on — but NOT to lift a suppression: unsubscribe tokens never expire
   * and get forwarded with the email, so they say nothing about who controls
   * the inbox now. A suppressed address is refused (the card tells them to
   * sign up again, whose double opt-in proves current inbox access), and so is
   * someone who never opted in: the link would otherwise subscribe a shopper
   * who only ever got an abandoned-checkout reminder.
   */
  resubscribe: publicProcedure
    .input(tokenInputSchema)
    .mutation(async ({ ctx, input }) => {
      const business = await requireNewsletterBusiness(ctx.db);
      await consumeActionLimit(ctx.headers, business.id);

      const payload = verifyUnsubscribeToken(input.token);
      if (!payload?.customerId || payload.businessId !== business.id) {
        return { ok: false as const, reason: "invalid" as const };
      }

      const where = {
        id: payload.customerId,
        businessId: business.id,
        anonymizedAt: null,
      };
      const meta = consentRequestMeta(ctx.headers);

      return ctx.db.$transaction(async (tx) => {
        const customer = await tx.customer.findFirst({
          where,
          select: {
            email: true,
            acceptsMarketing: true,
            marketingConsentAt: true,
            marketingConsentSource: true,
            marketingSuppressedAt: true,
            marketingSuppressionReason: true,
          },
        });
        if (!customer) {
          return { ok: false as const, reason: "invalid" as const };
        }
        // The do-not-email list outlives the customer row: only an
        // UNSUBSCRIBED entry may be lifted by this link, never a bounce,
        // complaint or provider block.
        const listed = await isOnDoNotEmailList(
          tx,
          business.id,
          customer.email,
        );
        if (
          isSuppressed(customer) ||
          (listed && listed.reason !== "UNSUBSCRIBED")
        ) {
          return { ok: false as const, reason: "suppressed" as const };
        }
        // Undo only restores a consent that existed. Someone who never opted
        // in (e.g. an abandoned-checkout reminder recipient) is never offered
        // the button; a direct call is refused the same way.
        if (!hasMarketingConsentHistory(customer)) {
          return { ok: false as const, reason: "not-subscribed" as const };
        }

        const result = await tx.customer.updateMany({
          // Conditional, so a suppression landing in between still wins.
          where: { ...where, marketingSuppressedAt: null },
          data: marketingOptInData("RESUBSCRIBE_LINK", {
            clearSuppression: false,
          }),
        });
        if (result.count === 0) {
          return { ok: false as const, reason: "invalid" as const };
        }
        await removeFromDoNotEmail(tx, business.id, customer.email, {
          onlyReasons: ["UNSUBSCRIBED"],
        });
        // Evidence only when the switch really flipped back on.
        if (!customer.acceptsMarketing) {
          await recordConsentEvent(tx, {
            businessId: business.id,
            customerId: payload.customerId,
            type: "OPT_IN",
            source: "RESUBSCRIBE_LINK",
            ip: meta.ip,
            userAgent: meta.userAgent,
            wording: RESUBSCRIBE_WORDING,
          });
        }
        return { ok: true as const };
      });
    }),
});
