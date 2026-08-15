import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { checkBusinessMembership } from "~/lib/check-business";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { stripeClient } from "~/lib/stripe/client";
import { auth } from "~/server/better-auth";

export async function GET(request: NextRequest) {
  // Declared outside the try so the catch block can tag/report the business
  // even though `business` itself is scoped inside the try.
  let businessId: string | null = null;
  let stripeAccountId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const domain = getCurrentDomain(request.headers);
    const business = await getBusinessByDomain(domain);

    if (!business) {
      return NextResponse.json({ connected: false });
    }
    businessId = business.id;

    // Authorization: the connected Stripe account's email/id/country is
    // sensitive, so only an OWNER/MANAGER of THIS business may read it. Without
    // this check any authenticated user (e.g. a customer on the storefront)
    // could enumerate a store's Stripe account details.
    const membership = await checkBusinessMembership(
      business.id,
      session.user.id,
    );
    if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!business.stripeAccountId) {
      return NextResponse.json({ connected: false });
    }
    stripeAccountId = business.stripeAccountId;

    // Get account details from Stripe
    const account = await stripeClient.accounts.retrieve(
      business.stripeAccountId,
    );

    return NextResponse.json({
      connected: true,
      account: {
        id: account.id,
        email: account.email,
        country: account.country,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      },
    });
  } catch (error: unknown) {
    console.error("Get account error:", error);
    Sentry.captureException(error, {
      tags: {
        route: "stripe.connect.account",
        service: "stripe",
        ...(businessId ? { businessId } : {}),
      },
      extra: { ...(stripeAccountId ? { stripeAccountId } : {}) },
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get account",
      },
      { status: 500 },
    );
  }
}
