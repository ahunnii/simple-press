import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

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
    // The checkout form sets a `pending_session` cookie with the session ID
    // before redirecting to Stripe. Anyone who obtained the URL from elsewhere
    // (shared link, browser history) won't have this cookie.
    const cookieHeader = req.headers.get("cookie") ?? "";
    const pendingSession = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("pending_session="))
      ?.split("=")[1];

    if (!pendingSession || pendingSession !== sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      stripeAccount: business.stripeAccountId,
    });

    // The cookie is intentionally NOT cleared here: it expires on its own
    // (maxAge set at checkout), and keeping it lets the shopper refresh or
    // revisit the confirmation page without the details disappearing. It is
    // replaced as soon as they start another checkout.
    return NextResponse.json({
      customer_email: session.customer_email,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_status: session.payment_status,
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
