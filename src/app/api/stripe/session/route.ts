import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { stripeClient } from "~/lib/stripe/client";

export async function GET(req: NextRequest) {
  const domain = getCurrentDomain(req.headers);
  const business = await getBusinessByDomain(domain);

  if (!business?.stripeAccountId) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

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
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to retrieve session",
      },
      { status: 500 },
    );
  }
}
