import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "~/env";
import { stripeClient } from "~/lib/stripe/client";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";

// app/api/stripe/connect/disconnect/route.ts

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      businessId?: string;
    };
    const businessId = body.businessId;
    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    const membership = await db.businessMembership.findFirst({
      where: {
        userId: session.user.id,
        businessId,
        role: { in: ["OWNER", "MANAGER"] },
      },
    });
    if (!membership && session.user.platformRole !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const business = await db.business.findUnique({
      where: { id: businessId },
      select: { id: true, stripeAccountId: true },
    });

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
