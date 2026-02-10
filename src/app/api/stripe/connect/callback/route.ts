// // app/api/stripe/connect/callback/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import Stripe from "stripe";

// import { stripeClient } from "~/lib/stripe/client";
// import { buildSubdomainUrl } from "~/lib/subdomain";
// import { db } from "~/server/db";

// export async function GET(request: NextRequest) {
//   const searchParams = request.nextUrl.searchParams;
//   const code = searchParams.get("code");
//   const encodedState = searchParams.get("state");
//   const error = searchParams.get("error");

//   // Parse state
//   let state: { businessId: string; subdomain: string };
//   try {
//     const decoded = Buffer.from(encodedState!, "base64").toString("utf-8");
//     state = JSON.parse(decoded) as { businessId: string; subdomain: string };
//   } catch (err: unknown) {
//     return NextResponse.redirect(
//       new URL("/admin/settings?error=invalid_state", request.url),
//     );
//   }

//   const { businessId, subdomain } = state;

//   // Handle user cancellation
//   if (error) {
//     const redirectUrl = buildSubdomainUrl(
//       subdomain,
//       `/admin/settings?error=${error}`,
//     );
//     return NextResponse.redirect(redirectUrl);
//   }

//   if (!code) {
//     const redirectUrl = buildSubdomainUrl(
//       subdomain,
//       "/admin/settings?error=no_code",
//     );
//     return NextResponse.redirect(redirectUrl);
//   }

//   try {
//     // Exchange authorization code for access token
//     const response = await stripeClient.oauth.token({
//       grant_type: "authorization_code",
//       code,
//     });

//     const connectedAccountId = response.stripe_user_id;

//     // Save to database
//     await db.business.update({
//       where: { id: businessId },
//       data: {
//         stripeAccountId: connectedAccountId,
//       },
//     });

//     // Redirect back to the subdomain
//     const redirectUrl = buildSubdomainUrl(
//       subdomain,
//       "/admin/settings?stripe=connected",
//     );

//     return NextResponse.redirect(redirectUrl);
//   } catch (error: unknown) {
//     console.error("Stripe Connect error:", error);

//     const redirectUrl = buildSubdomainUrl(
//       subdomain,
//       `/admin/settings?error=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`,
//     );

//     return NextResponse.redirect(redirectUrl);
//   }
// }

// app/api/stripe/connect/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { decodeOAuthState } from "~/lib/domain";
import { stripeClient } from "~/lib/stripe/client";
import { db } from "~/server/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const encodedState = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Decode state
  let state: { businessId: string; returnUrl: string };
  try {
    if (!encodedState) throw new Error("No state");
    state = decodeOAuthState(encodedState);
  } catch (err) {
    console.error("Invalid state:", err);
    return new NextResponse("Invalid state parameter", { status: 400 });
  }

  const { businessId, returnUrl } = state;

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
    // Verify business exists
    const business = await db.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new Error("Business not found");
    }

    // Exchange authorization code for account ID
    const response = await stripeClient.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const connectedAccountId = response.stripe_user_id;

    // Save to database
    await db.business.update({
      where: { id: businessId },
      data: {
        stripeAccountId: connectedAccountId,
      },
    });

    // Log the connection
    console.log(
      `[Stripe Connect] Business ${businessId} connected account ${connectedAccountId}`,
    );

    // Redirect back to original URL with success
    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("stripe", "connected");

    return NextResponse.redirect(redirectUrl);
  } catch (error: unknown) {
    console.error("[Stripe Connect] Error:", error);

    // Redirect back with error
    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("stripe_error", "connection_failed");
    redirectUrl.searchParams.set(
      "stripe_error_description",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.redirect(redirectUrl);
  }
}
