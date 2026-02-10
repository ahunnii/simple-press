// app/api/stripe/connect/disconnect/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { env } from "~/env";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { stripeClient } from "~/lib/stripe/client";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's business
    // const user = await db.user.findUnique({
    //   where: { id: session.user.id },
    //   include: { business: true },
    // });

    // if (!user?.business?.stripeAccountId) {
    //   return NextResponse.json(
    //     { error: "No Stripe account connected" },
    //     { status: 400 },
    //   );
    // }

    const domain = getCurrentDomain(request.headers);
    const business = await getBusinessByDomain(domain);

    if (!business?.stripeAccountId) {
      return NextResponse.json(
        { error: "No Stripe account connected" },
        { status: 400 },
      );
    }

    // Revoke access (deauthorize)
    await stripeClient.oauth.deauthorize({
      client_id: env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID,
      stripe_user_id: business.stripeAccountId,
    });

    // Remove from database
    await db.business.update({
      where: { id: business.id },
      data: {
        stripeAccountId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Disconnect error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to disconnect",
      },
      { status: 500 },
    );
  }
}
