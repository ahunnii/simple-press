// app/api/stripe/connect/account/route.ts
import { NextRequest, NextResponse } from "next/server";

import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { stripeClient } from "~/lib/stripe/client";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // const user = await db.user.findUnique({
    //   where: { id: session.user.id },
    //   include: { business: true },
    // });

    // if (!user?.business?.stripeAccountId) {
    //   return NextResponse.json({ connected: false });
    // }

    const domain = getCurrentDomain(request.headers);
    const business = await getBusinessByDomain(domain);

    if (!business?.stripeAccountId) {
      return NextResponse.json({ connected: false });
    }

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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get account",
      },
      { status: 500 },
    );
  }
}
