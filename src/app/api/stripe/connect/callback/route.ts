import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "~/env";
import { verifySignedOAuthState } from "~/lib/stripe/oauth-state";
import { stripeClient } from "~/lib/stripe/client";
import { db } from "~/server/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const encodedState = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Verify and decode signed state (authorization was established at state-generation time)
  let businessId: string;
  let returnUrl: string;
  try {
    if (!encodedState) throw new Error("No state");
    const verified = verifySignedOAuthState(
      encodedState,
      env.SIMPLEPRESS_HASH_SECRET,
    );
    if (!verified) throw new Error("Invalid or expired state");
    ({ businessId, returnUrl } = verified);
  } catch (err) {
    console.error("[Stripe Connect] Invalid state:", err);
    return new NextResponse("Invalid or expired state parameter", {
      status: 400,
    });
  }

  // Handle user cancellation or errors
  if (error) {
    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("stripe_error", error);
    if (errorDescription) {
      redirectUrl.searchParams.set(
        "stripe_error_description",
        errorDescription,
      );
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("stripe_error", "no_code");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Verify business still exists
    const business = await db.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new Error("Business not found");
    }

    // Exchange authorization code for connected account ID
    const response = await stripeClient.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const connectedAccountId = response.stripe_user_id;

    // Save to database
    await db.business.update({
      where: { id: businessId },
      data: { stripeAccountId: connectedAccountId },
    });

    console.log(
      `[Stripe Connect] Business ${businessId} connected account ${connectedAccountId}`,
    );

    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("stripe", "connected");
    return NextResponse.redirect(redirectUrl);
  } catch (err: unknown) {
    console.error("[Stripe Connect] Error:", err);

    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("stripe_error", "connection_failed");
    redirectUrl.searchParams.set(
      "stripe_error_description",
      "connection_failed",
    );
    return NextResponse.redirect(redirectUrl);
  }
}
