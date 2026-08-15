import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { stripeClient } from "~/lib/stripe/client";
import { verifySignedOAuthState } from "~/lib/stripe/oauth-state";
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

    // Seed the capability flags from the account itself rather than waiting for
    // an `account.updated` webhook.
    //
    // Both columns default to `false` in the schema and, until now, the webhook
    // was their ONLY writer. That made `false` ambiguous — it meant either
    // "Stripe says this account cannot charge" or "no webhook has ever arrived
    // for it" — which is why nothing in the checkout path can safely gate on
    // them: a guard would refuse perfectly healthy stores whose `account.updated`
    // simply never fired. Reading the account here makes `false` mean what it
    // says for every newly connected store.
    //
    // Best-effort: a failure here must not fail the connection, since the OAuth
    // grant has already been exchanged and the account id below is the part that
    // actually matters. The webhook remains the ongoing source of truth.
    // `stripe_user_id` is optional in Stripe's OAuthToken type, so the read is
    // guarded rather than asserted — the `stripeAccountId` write below already
    // tolerates undefined (the column is nullable) and that behavior is left
    // exactly as it was.
    let capabilities: { charges: boolean; payouts: boolean } | null = null;
    try {
      if (!connectedAccountId) throw new Error("Missing stripe_user_id");
      const account = await stripeClient.accounts.retrieve(connectedAccountId);
      capabilities = {
        charges: account.charges_enabled ?? false,
        payouts: account.payouts_enabled ?? false,
      };
    } catch (err) {
      console.error("[Stripe Connect] Capability read failed:", err);
      Sentry.captureException(err, {
        tags: {
          "stripe.oauth": "account-retrieve",
          service: "stripe",
          businessId,
        },
        extra: { connectedAccountId },
      });
    }

    // Save to database
    await db.business.update({
      where: { id: businessId },
      data: {
        stripeAccountId: connectedAccountId,
        ...(capabilities
          ? {
              stripeChargesEnabled: capabilities.charges,
              stripePayoutsEnabled: capabilities.payouts,
            }
          : {}),
      },
    });

    console.log(
      `[Stripe Connect] Business ${businessId} connected account ${connectedAccountId}`,
    );

    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("stripe", "connected");
    return NextResponse.redirect(redirectUrl);
  } catch (err: unknown) {
    console.error("[Stripe Connect] Error:", err);
    Sentry.captureException(err, {
      tags: { "stripe.oauth": "token-exchange", businessId },
    });

    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("stripe_error", "connection_failed");
    redirectUrl.searchParams.set(
      "stripe_error_description",
      "connection_failed",
    );
    return NextResponse.redirect(redirectUrl);
  }
}
