import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "~/server/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // businessId
    const error = searchParams.get("error");

    // Handle error from Stripe
    if (error) {
      console.error("Stripe Connect error:", error);
      return NextResponse.redirect(
        new URL(`/admin/welcome?stripe_error=${error}`, req.url),
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/admin/welcome?stripe_error=missing_parameters", req.url),
      );
    }

    const businessId = state;

    // Exchange code for Stripe account ID
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const tokenResponse = await fetch(
      "https://connect.stripe.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_secret: stripeSecretKey,
          code,
          grant_type: "authorization_code",
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorData = (await tokenResponse.json()) as {
        error_description: string;
      };
      console.error("Stripe token exchange error:", errorData);
      throw new Error(
        errorData.error_description ?? "Failed to connect Stripe",
      );
    }

    const { stripe_user_id } = (await tokenResponse.json()) as {
      token_type: string;
      scope: string;
      livemode: boolean;
      stripe_user_id: "string";
    };

    // Update business with Stripe account ID
    await db.business.update({
      where: { id: businessId },
      data: {
        stripeAccountId: stripe_user_id,
      },
    });

    // Redirect back to welcome page with success
    return NextResponse.redirect(
      new URL("/admin/welcome?stripe_success=true", req.url),
    );
  } catch (error: unknown) {
    console.error("Stripe callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/admin/welcome?stripe_error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to connect Stripe")}`,
        req.url,
      ),
    );
  }
}
