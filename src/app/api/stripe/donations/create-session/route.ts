import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { buildDonationCheckoutParams } from "~/lib/donations/checkout-session";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { donationCheckoutLimiter, getClientIp } from "~/lib/rate-limit";
import { stripeClient } from "~/lib/stripe/client";
import { donationCheckoutBodySchema } from "~/lib/validators/donation";

/**
 * `POST /api/stripe/donations/create-session` — the money endpoint of the
 * Donations/Tips lane.
 *
 * A deliberate PARALLEL of `src/app/api/stripe/subscriptions/create-session/route.ts`,
 * which is itself a parallel of the one-time checkout route: host-header tenant
 * resolution, a per-IP limiter, shopper-safe error strings, throttled
 * owner-fault reporting to Sentry. An owner debugging one should recognize all
 * three.
 *
 * What makes this route different from both of them:
 *
 *  1. **No DB row before Stripe.** A subscription pre-creates an `incomplete`
 *     row so the webhook has something to attach to; a donation has nothing to
 *     attach to and nothing to reserve, so the `Donation` row is created by the
 *     webhook and ONLY by the webhook. A donor who abandons Checkout leaves no
 *     trace to clean up.
 *  2. **No pending-session cookie.** `/donate?status=success` shows a thank-you
 *     and nothing else — there is no donation detail to gate behind proof that
 *     this visitor started the checkout.
 *  3. **No inventory, no shipping, no customer record.** Stripe Checkout
 *     collects the donor's email itself and the webhook reads it back off
 *     `customer_details`.
 *
 * Nothing about the amount comes from the client except the amount itself, and
 * that is bounded server-side by `donationCheckoutBodySchema`
 * ($1.00 – $10,000.00). There is no catalog to price against here: the donor
 * choosing what to give IS the feature.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Owner-fault blocks → Sentry
// ─────────────────────────────────────────────────────────────────────────────
//
// Same reasoning and the same throttle as `reportSubscriptionBlocked` in the
// subscriptions route, which is deliberately not imported (it is that module's
// private helper, and exporting it would be an edit to a money path this
// feature does not otherwise touch).
//
// A store misconfiguration rejects EVERY donor, so unthrottled this would bill
// one event per attempt for as long as the store stays broken. The signal worth
// acting on is "donations are blocked for this store, for this reason" — one
// event per store+reason per 15 minutes keeps the issue's `lastSeen` honest
// while capping the volume.
const BLOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_BLOCKS = 500;
const lastBlockReport = new Map<string, number>();

function reportDonationBlocked(
  reason: string,
  ctx: {
    businessId?: string;
    templateId?: string;
    /** Stands in as the throttle identity for branches that run before tenant resolution. */
    host?: string;
    extra?: Record<string, unknown>;
  },
): void {
  const key = `${ctx.businessId ?? ctx.host ?? "unknown"}:${reason}`;
  const now = Date.now();
  if (now - (lastBlockReport.get(key) ?? 0) < BLOCK_WINDOW_MS) return;
  if (lastBlockReport.size >= MAX_TRACKED_BLOCKS) lastBlockReport.clear();
  lastBlockReport.set(key, now);

  Sentry.captureMessage(`Donation checkout blocked: ${reason}`, {
    level: "error",
    tags: {
      route: "stripe.donations.create-session",
      "checkout.block": reason,
      "checkout.fault": "owner",
      ...(ctx.businessId ? { businessId: ctx.businessId } : {}),
      ...(ctx.templateId ? { templateId: ctx.templateId } : {}),
    },
    extra: ctx.extra,
  });
}

export async function POST(req: Request) {
  // Diagnostic snapshot for the outer catch: `business` is scoped inside the
  // try, so it is unreachable where a 500 is reported. Filled in as each field
  // becomes known; never influences a response.
  const errorContext: Record<string, unknown> = {};

  try {
    const parsed = donationCheckoutBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      // The highest-value report here: `parsed.error` is otherwise discarded
      // and the donor gets a bare "Invalid request.", so a donate form posting
      // a malformed body takes the store to zero donations with no trace.
      // `flatten()` names the offending field and carries no values — the
      // donor's name and message are free text and never leave the request.
      const host = req.headers.get("host");
      reportDonationBlocked("invalid-request-body", {
        host: host ?? undefined,
        extra: { host, issues: parsed.error.flatten() },
      });
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const body = parsed.data;

    try {
      await donationCheckoutLimiter.consume(getClientIp(req));
    } catch {
      // Not reported: a 429 is the limiter working as designed. Donation forms
      // are a card-testing target precisely because they are short, public and
      // repeatable, so this limiter earns its keep.
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const domain = getCurrentDomain(req.headers);
    const business = await getBusinessByDomain(domain);

    if (!business) {
      reportDonationBlocked("business-not-found", {
        host: domain,
        extra: { host: domain },
      });
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    errorContext.businessId = business.id;
    errorContext.templateId = business.templateId;
    errorContext.stripeAccountId = business.stripeAccountId;
    errorContext.stripeChargesEnabled = business.stripeChargesEnabled;

    // Hiding the donate page is not a security boundary — this endpoint is
    // POST-able directly. `donations` deliberately has NO `dependsOn` (a
    // Venmo/Cash App-only store must be able to enable it without Stripe), so
    // unlike `subscriptions` this can never be switched off by a parent
    // cascade; the dependency detail is reported anyway so the two routes read
    // the same way in Sentry.
    const { isEnabled, disabledByDependency } = resolveFlags(
      business.featureFlags,
    );
    if (!isEnabled("donations")) {
      reportDonationBlocked("feature-disabled", {
        businessId: business.id,
        templateId: business.templateId,
        extra: {
          viaDependencyCascade: disabledByDependency.includes("donations"),
          disabledByDependency,
        },
      });
      return NextResponse.json(
        { error: "Donations are not available for this store." },
        { status: 403 },
      );
    }

    // Donations are billed as direct charges on the store's own account. The
    // donate page hides the card form when this is not satisfied and offers
    // only the Venmo/Cash App handles — but the page is not the boundary, this
    // is.
    //
    // NOTE for future maintainers: this is the ONLY checkout lane that gates on
    // `stripeChargesEnabled`. The one-time and subscription routes deliberately
    // check `stripeAccountId` alone (see the comment in
    // `stripe/create-session/route.ts`, and `getPaymentsHealth`), because the
    // column is `@default(false)` and is only ever flipped true by the
    // `account.updated` webhook or the Connect callback — so a store that
    // connected before 2026-08-13, or one running where Stripe webhooks never
    // arrive (local dev, preview), can sit at `false` while charging perfectly
    // well. That is acceptable HERE and nowhere else: a donation has a
    // no-Stripe fallback (Venmo/Cash App) to fall back to, so the cost of a
    // false negative is a hidden card form rather than a dead store. Do not
    // copy this guard into the order or subscription lanes.
    if (!business.stripeAccountId || !business.stripeChargesEnabled) {
      reportDonationBlocked("stripe-not-ready", {
        businessId: business.id,
        templateId: business.templateId,
        host: domain,
        extra: {
          host: domain,
          hasStripeAccountId: !!business.stripeAccountId,
          stripeChargesEnabled: business.stripeChargesEnabled,
        },
      });
      return NextResponse.json(
        { error: "Card donations are not available for this store." },
        { status: 400 },
      );
    }

    const isDev = process.env.NODE_ENV === "development";
    const baseUrl = isDev
      ? `http://${domain}`
      : business.customDomain && business.domainStatus === "ACTIVE"
        ? `https://${business.customDomain}`
        : `https://${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;

    const params = buildDonationCheckoutParams({
      business: {
        id: business.id,
        name: business.name,
        donationLabel: business.donationLabel,
        stripeAutoTaxEnabled: business.stripeAutoTaxEnabled,
      },
      baseUrl,
      amountCents: body.amountCents,
      ...(body.donorName ? { donorName: body.donorName } : {}),
      ...(body.message ? { message: body.message } : {}),
    });

    try {
      // Direct charge on the connected account — the money never touches the
      // platform. No DB row is written before or after: the webhook owns the
      // `Donation` record, keyed on this session's id.
      const session = await stripeClient.checkout.sessions.create(params, {
        stripeAccount: business.stripeAccountId,
      });

      return NextResponse.json({
        sessionUrl: session.url,
        sessionId: session.id,
      });
    } catch (stripeErr) {
      Sentry.captureException(stripeErr, {
        tags: {
          route: "stripe.donations.create-session",
          service: "stripe",
          "donation.step": "checkout-create",
          businessId: business.id,
          templateId: business.templateId,
        },
        extra: errorContext,
      });
      return NextResponse.json(
        { error: "Failed to start donation checkout. Please try again." },
        { status: 500 },
      );
    }
  } catch (error: unknown) {
    console.error("Create donation checkout session error:", error);
    Sentry.withScope((scope) => {
      scope.setTag("route", "stripe.donations.create-session");
      scope.setTag("donation.step", "unhandled");
      scope.setExtras(errorContext);
      // Also as tags: extras are not searchable, and the whole point is that
      // one `businessId:<id>` query returns both the blocked-checkout messages
      // above and the 500s from down here.
      if (typeof errorContext.businessId === "string") {
        scope.setTag("businessId", errorContext.businessId);
      }
      if (typeof errorContext.templateId === "string") {
        scope.setTag("templateId", errorContext.templateId);
      }
      Sentry.captureException(error);
    });
    return NextResponse.json(
      { error: "Failed to start donation checkout. Please try again." },
      { status: 500 },
    );
  }
}
