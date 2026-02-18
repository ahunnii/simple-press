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

    // Retrieve session - note: this gets it from platform account
    // In production, you'd need to know which Connect account to use
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      stripeAccount: business.stripeAccountId,
    });

    console.log(session);

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
