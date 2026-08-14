import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { stripeClient } from "~/lib/stripe/client";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";

// app/api/stripe/connect/disconnect/route.ts

export async function POST(request: NextRequest) {
  // Declared outside the try so the catch block can report how far the
  // disconnect got, even if the failure happened before `business` (or its
  // update) resolved.
  let stripeAccountId: string | null = null;
  let dbCleared = false;
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
    stripeAccountId = business.stripeAccountId;

    // Order matters here: clear the DB record BEFORE revoking the grant at
    // Stripe. This is deliberately the REVERSE of the intuitive order
    // ("revoke, then clean up our records"). Reasoning: if we deauthorize
    // first and the DB write then fails, the business keeps a
    // `stripeAccountId` that points at an account whose grant is already
    // revoked. Nothing in the checkout path reads `stripeChargesEnabled` /
    // `stripePayoutsEnabled` — it just sees a non-null `stripeAccountId` and
    // treats the store as fully configured — so every subsequent charge
    // fails with an opaque 500 and there's no obvious "disconnected" state
    // to point at when debugging. Clearing the DB first means the worst case
    // is the opposite and much safer: the store immediately and correctly
    // reports "not connected", while a stale grant is left behind at
    // Stripe. That stale grant is harmless (no charges/payouts flow through
    // it once the businessId is gone) and can be revoked manually from the
    // Stripe dashboard. Do not swap this back.
    await db.business.update({
      where: { id: business.id },
      data: {
        stripeAccountId: null,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
      },
    });
    dbCleared = true;

    // Revoke access (deauthorize) at Stripe. Now best-effort: see the
    // `dbCleared` branch in the catch block below for why a failure here no
    // longer needs to fail the request.
    await stripeClient.oauth.deauthorize({
      client_id: env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID,
      stripe_user_id: stripeAccountId,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Disconnect error:", error);
    Sentry.captureException(error, {
      tags: { route: "stripe.connect.disconnect", service: "stripe" },
      extra: { stripeAccountId, dbCleared },
    });

    // If the DB was already cleared before this error hit, the business is
    // already correctly disconnected from the platform's point of view —
    // only the best-effort Stripe-side deauthorize failed. Surfacing that as
    // a 500 would be misleading (the disconnect substantively succeeded) and
    // actively harmful on retry: a second call would immediately hit the
    // "No Stripe account connected" 400 above, since `stripeAccountId` is
    // already null, even though the user just saw an error. Report success
    // instead; the dangling Stripe-side grant is captured above for
    // visibility and can be cleaned up from the Stripe dashboard.
    if (dbCleared) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to disconnect",
      },
      { status: 500 },
    );
  }
}
