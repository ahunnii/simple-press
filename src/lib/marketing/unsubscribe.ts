import * as Sentry from "@sentry/nextjs";

import type { UnsubscribePayload } from "~/lib/email/unsubscribe-token";
import type { MarketingConsentEventSource } from "~/lib/marketing/consent-log";
import type { TxClient } from "~/server/db";
import { getBusinessUrl } from "~/lib/business-url";
import { verifyUnsubscribeToken } from "~/lib/email/unsubscribe-token";
import {
  hasMarketingConsentHistory,
  isMarketingUnsubscribeCurrent,
} from "~/lib/marketing/consent";
import { recordConsentEvent } from "~/lib/marketing/consent-log";
import {
  addToDoNotEmail,
  isOnDoNotEmailList,
} from "~/lib/marketing/do-not-email";
import { db } from "~/server/db";

/**
 * Unsubscribe-by-token, split into a READ-ONLY resolve step and a WRITE step.
 *
 * GET /api/unsubscribe must never write: security scanners and mail-client
 * link prefetchers GET every URL in an email and would silently unsubscribe
 * people. GET therefore only resolves the token and redirects to the store's
 * /email-preferences confirm page; the write happens on POST (RFC 8058
 * one-click from the mail client, or the confirm button on that page).
 */

export type UnsubscribeFailure = {
  ok: false;
  title: string;
  message: string;
};

const INVALID_MISSING: UnsubscribeFailure = {
  ok: false,
  title: "Invalid link",
  message:
    "This unsubscribe link is missing a token. Please use the link from your email.",
};

const INVALID_TOKEN: UnsubscribeFailure = {
  ok: false,
  title: "Invalid link",
  message:
    "This unsubscribe link is invalid or has been tampered with. Please contact support if you believe this is an error.",
};

const SERVER_ERROR: UnsubscribeFailure = {
  ok: false,
  title: "Something went wrong",
  message:
    "We couldn't process your unsubscribe request right now. Please try again in a few minutes, or contact support if the problem persists.",
};

/** Verify the token shape. No database access. */
export function parseUnsubscribeToken(
  token: string | null,
):
  | { ok: true; token: string; payload: UnsubscribePayload }
  | UnsubscribeFailure {
  if (!token) return INVALID_MISSING;
  const payload = verifyUnsubscribeToken(token);
  // `!payload.customerId || !payload.businessId`: belt-and-braces on top of the
  // shape check in verifyUnsubscribeToken — an undefined id would be dropped
  // from a `where` by Prisma and opt out every customer platform-wide.
  if (!payload?.customerId || !payload.businessId) return INVALID_TOKEN;
  return { ok: true, token, payload };
}

/**
 * Read-only: verify the token and find the storefront origin of the business
 * it belongs to (for the branded confirm page). Writes nothing.
 */
export async function resolveUnsubscribeToken(token: string | null): Promise<
  | {
      ok: true;
      token: string;
      payload: UnsubscribePayload;
      storefrontUrl: string;
    }
  | UnsubscribeFailure
> {
  const parsed = parseUnsubscribeToken(token);
  if (!parsed.ok) return parsed;
  try {
    const business = await db.business.findUnique({
      where: { id: parsed.payload.businessId },
      select: { subdomain: true, customDomain: true, domainStatus: true },
    });
    // A token for a deleted store has nowhere to land.
    if (!business) return INVALID_TOKEN;
    return {
      ok: true,
      token: parsed.token,
      payload: parsed.payload,
      storefrontUrl: getBusinessUrl(business),
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "unsubscribe", step: "resolve" },
      extra: {
        customerId: parsed.payload.customerId,
        businessId: parsed.payload.businessId,
      },
    });
    return SERVER_ERROR;
  }
}

export type UnsubscribeWriteSource = Extract<
  MarketingConsentEventSource,
  "ONE_CLICK" | "UNSUBSCRIBE_LINK"
>;

/**
 * Opt the token's customer out. Idempotent. Works for people who never
 * subscribed too: abandoned-checkout reminders go to shoppers with
 * `acceptsMarketing: false`, and their unsubscribe must still stick (it is
 * what blocks the next reminder). The Customer update, the UNSUBSCRIBED
 * do-not-email entry and the OPT_OUT consent event commit together; the event
 * is recorded only when this call recorded a new unsubscribe.
 */
export async function applyUnsubscribe(
  token: string | null,
  opts: {
    source: UnsubscribeWriteSource;
    ip?: string;
    userAgent?: string;
  },
): Promise<
  { ok: true; changed: boolean; message: string } | UnsubscribeFailure
> {
  const parsed = parseUnsubscribeToken(token);
  if (!parsed.ok) return parsed;
  const { payload } = parsed;

  // CAN-SPAM-mandated flow: a DB failure renders the same styled failure the
  // caller already uses for an invalid token, not an unhandled error page.
  try {
    // Per-campaign attribution: the token carries the recipient row id. Scoped
    // by customer + business so a token can never stamp someone else's row.
    // Best-effort: the opt-out is what the law requires, so a failure here
    // must not turn it into an error.
    let campaignId: string | null = null;
    if (payload.r) {
      try {
        const recipient = await db.marketingCampaignRecipient.findFirst({
          where: {
            id: payload.r,
            customerId: payload.customerId,
            businessId: payload.businessId,
          },
          select: { campaignId: true },
        });
        campaignId = recipient?.campaignId ?? null;
      } catch (error) {
        Sentry.captureException(error, {
          level: "warning",
          tags: { route: "unsubscribe", step: "recipient-lookup" },
          extra: { recipientId: payload.r },
        });
      }
    }

    const now = new Date();
    // Only people with an account have preferences to return to; imported or
    // guest-checkout contacts re-subscribe through the store's sign-up form.
    let hasAccount = false;
    const changed = await db.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        // An erased customer has nothing left to opt out (and its placeholder
        // address must not land on the do-not-email list).
        where: {
          id: payload.customerId,
          businessId: payload.businessId,
          anonymizedAt: null,
        },
        select: {
          id: true,
          email: true,
          acceptsMarketing: true,
          marketingUnsubscribedAt: true,
          marketingConsentAt: true,
          userId: true,
        },
      });
      if (!customer) return false;
      hasAccount = customer.userId !== null;

      // Always (re)assert the list entry: idempotent, and it backfills an
      // unsubscribe recorded before the list existed.
      await addToDoNotEmail(
        tx,
        payload.businessId,
        customer.email,
        "UNSUBSCRIBED",
      );

      // Already unsubscribed: keep the first click's timestamp and evidence.
      if (
        !customer.acceptsMarketing &&
        isMarketingUnsubscribeCurrent(customer)
      ) {
        return false;
      }

      await tx.customer.update({
        where: { id: customer.id },
        data: { acceptsMarketing: false, marketingUnsubscribedAt: now },
      });
      await recordConsentEvent(tx, {
        businessId: payload.businessId,
        customerId: customer.id,
        type: "OPT_OUT",
        source: opts.source,
        ip: opts.ip,
        userAgent: opts.userAgent,
        campaignId,
      });
      return true;
    });

    if (payload.r) {
      try {
        // `unsubscribedAt: null` keeps the first click's timestamp.
        await db.marketingCampaignRecipient.updateMany({
          where: {
            id: payload.r,
            customerId: payload.customerId,
            businessId: payload.businessId,
            unsubscribedAt: null,
          },
          data: { unsubscribedAt: now },
        });
      } catch (error) {
        Sentry.captureException(error, {
          level: "warning",
          tags: { route: "unsubscribe", step: "recipient-attribution" },
          extra: { recipientId: payload.r },
        });
      }
    }

    return {
      ok: true,
      changed,
      message: hasAccount
        ? "You will no longer receive marketing emails. You can re-enable emails at any time from your account preferences."
        : "You will no longer receive marketing emails. You can sign up again on our website any time.",
    };
  } catch (error) {
    console.error("Error processing unsubscribe request:", error);
    Sentry.captureException(error, {
      tags: { route: "unsubscribe" },
      // customerId/businessId are opaque internal IDs, not PII — never the
      // token or email address.
      extra: { customerId: payload.customerId, businessId: payload.businessId },
    });
    return SERVER_ERROR;
  }
}

/**
 * Whether marketing email to this customer is already off, so the
 * unsubscribe page can show "You're unsubscribed" instead of asking: a
 * current unsubscribe (`isMarketingUnsubscribeCurrent`, the rule the
 * abandoned-checkout reminder gate uses), a suppression (bounce / complaint /
 * provider block), or the address on the store's do-not-email list. Someone
 * whose switch is on (`acceptsMarketing`) is never "already unsubscribed":
 * they always get the confirm step, which turns it off.
 */
export async function isEffectivelyUnsubscribed(
  client: TxClient,
  businessId: string,
  customer: {
    email: string;
    acceptsMarketing: boolean;
    marketingUnsubscribedAt: Date | null;
    marketingConsentAt: Date | null;
    marketingSuppressedAt: Date | null;
  },
): Promise<boolean> {
  if (customer.acceptsMarketing) return false;
  if (isMarketingUnsubscribeCurrent(customer)) return true;
  if (customer.marketingSuppressedAt) return true;
  return !!(await isOnDoNotEmailList(client, businessId, customer.email));
}

export type UnsubscribePageState =
  | { kind: "invalid" }
  | {
      /** "unsubscribe" asks first; "unsubscribed" is the done card. */
      kind: "unsubscribe" | "unsubscribed";
      /**
       * Offer the Resubscribe undo (subject to the feature flag): only to
       * people who had opted in before. `newsletter.resubscribe` enforces the
       * same rule server-side.
       */
      canResubscribe: boolean;
    };

/**
 * Read-only: which card /email-preferences?s=confirm shows for this token on
 * this store. State comes from the database, never from the URL.
 */
export async function resolveUnsubscribePageState(
  token: string | null,
  businessId: string,
): Promise<UnsubscribePageState> {
  const parsed = parseUnsubscribeToken(token);
  // A token for another store (or garbage) gets the generic state.
  if (!parsed.ok || parsed.payload.businessId !== businessId) {
    return { kind: "invalid" };
  }
  const customer = await db.customer.findFirst({
    where: { id: parsed.payload.customerId, businessId, anonymizedAt: null },
    select: {
      email: true,
      acceptsMarketing: true,
      marketingUnsubscribedAt: true,
      marketingConsentAt: true,
      marketingConsentSource: true,
      marketingSuppressedAt: true,
    },
  });
  if (!customer) return { kind: "invalid" };
  const done = await isEffectivelyUnsubscribed(db, businessId, customer);
  return {
    kind: done ? "unsubscribed" : "unsubscribe",
    canResubscribe: hasMarketingConsentHistory(customer),
  };
}
