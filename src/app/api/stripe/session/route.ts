import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import {
  legacyBareCookieAllowed,
  matchPendingSessionCookie,
} from "~/lib/checkout/pending-session-cookie";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { stripeClient } from "~/lib/stripe/client";

export async function GET(req: NextRequest) {
  const domain = getCurrentDomain(req.headers);
  const business = await getBusinessByDomain(domain);

  if (!business?.stripeAccountId) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Declared outside the try so the catch block can include it — it's parsed
  // inside the try, but this is the order-confirmation page's session lookup,
  // and knowing which sessionId failed is the whole point of the capture.
  let sessionId: string | null = null;
  try {
    const { searchParams } = new URL(req.url);
    sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 },
      );
    }

    // Verify the requesting browser is the one that initiated this checkout.
    // create-session sets a signed `pending_session` cookie naming the
    // session before redirecting to Stripe. Anyone who obtained the URL from
    // elsewhere (shared link, browser history) won't have this cookie.
    //
    // Legacy bare-cookie fallback (cookies set before the cookie was signed)
    // switches itself off about an hour after the signed-cookie deploy. A bare
    // value is accepted only for a session that (a) lacks
    // `metadata.pendingCookie` — every session create-session makes from the
    // deploy on carries it, and for those only a SIGNED cookie works — and
    // (b) was created within the cookie's lifetime (+ clock-skew slack). A
    // genuine bare cookie can never be older than
    // PENDING_SESSION_COOKIE_MAX_AGE, and Stripe keeps completed Checkout
    // Sessions retrievable indefinitely, so without (b) every pre-deploy order
    // would stay readable with nothing but its id. Once an hour has passed
    // since the deploy no unmarked session is young enough, and the fallback
    // rejects everything. The signed path has no age limit: the shopper can
    // revisit the confirmation page for as long as the cookie lives.
    const cookie = matchPendingSessionCookie(
      req.headers,
      business.id,
      sessionId,
    );
    const signedOk = cookie?.signed === true;

    // No cookie for this session at all: refuse before touching Stripe.
    if (!cookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripeClient.checkout.sessions.retrieve(sessionId, {
        stripeAccount: business.stripeAccountId,
      });
    } catch (retrieveError) {
      // A bare-cookie caller must not be able to tell a session that does not
      // exist from one that is not theirs: both are 403, as before this
      // lookup moved ahead of the ownership decision.
      if (
        !signedOk &&
        (retrieveError as { type?: unknown } | null)?.type ===
          "StripeInvalidRequestError"
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      throw retrieveError;
    }

    // Bare cookie only: not accepted for a marked session, nor for one too old
    // to have been started with a bare cookie (see above).
    if (!signedOk && !legacyBareCookieAllowed(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // The cookie is intentionally NOT cleared here: it expires on its own
    // (maxAge set at checkout), and keeping it lets the shopper refresh or
    // revisit the confirmation page without the details disappearing. It is
    // replaced as soon as they start another checkout.
    return NextResponse.json({
      customer_email: session.customer_email,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_status: session.payment_status,
      delivery_method: session.metadata?.deliveryMethod ?? null,
    });
  } catch (error: unknown) {
    console.error("Retrieve session error:", error);
    // This backs the order-confirmation page: a paying customer lands here
    // straight out of Stripe Checkout, so a failure here means they're
    // staring at a blank/broken confirmation for an order that (as far as
    // Stripe is concerned) already went through. Worth capturing eagerly
    // rather than waiting for a support ticket. `session.customer_email` is
    // never included below — sendDefaultPii is false, IDs only.
    Sentry.captureException(error, {
      tags: {
        route: "stripe.session",
        service: "stripe",
        businessId: business.id,
      },
      extra: { stripeAccountId: business.stripeAccountId, sessionId },
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to retrieve session",
      },
      { status: 500 },
    );
  }
}
