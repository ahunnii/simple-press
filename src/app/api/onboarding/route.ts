import type { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

import { env } from "~/env";
import { authLimiter, getClientIp } from "~/lib/rate-limit";
import { isSubdomainReserved, slugify } from "~/lib/utils";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";

/**
 * Notify Artisanal Futures that an artisan token was successfully used.
 * Non-blocking — a failure here should never prevent store creation.
 * Called server-side so SIMPLEPRESS_HASH_SECRET is never exposed to the client.
 */
async function notifyArtisanalFutures(
  aftoken: string,
  subdomain: string,
  customDomain: string | null,
): Promise<void> {
  const storeUrl =
    customDomain ??
    `https://${subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;
  try {
    const res = await fetch(`${env.ARTISANAL_FUTURES_API_URL}/simplepress`, {
      method: "POST",
      body: JSON.stringify({ artisanToken: aftoken, subdomain, customDomain: storeUrl }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.SIMPLEPRESS_HASH_SECRET}`,
      },
    });
    if (!res.ok) {
      console.warn("[Onboarding] AF token update returned non-OK status", res.status);
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "onboarding", step: "af-token-update" } });
    console.error("[Onboarding] Failed to notify Artisanal Futures (non-blocking)", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    await authLimiter.consume(ip);

    const formData = (await req.json()) as {
      email: string;
      password: string;
      name: string;
      businessName: string;
      subdomain: string;
      customDomain: string;
      templateId: string;
      heroTitle: string;
      heroSubtitle: string;
      aboutText: string;
      primaryColor: string;
      /** Artisanal Futures token — present only for the artisan onboarding flow. */
      aftoken?: string | null;
    };

    const {
      email,
      password,
      name,
      businessName,
      subdomain,
      customDomain,
      templateId,
      heroTitle,
      heroSubtitle,
      aboutText,
      primaryColor,
      aftoken,
    } = formData;

    // Verify the caller is authenticated and owns this email
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.email !== email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validation
    if (!email || !password || !name || !businessName || !subdomain) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check subdomain availability
    if (isSubdomainReserved(subdomain)) {
      return NextResponse.json(
        { error: "This subdomain is reserved" },
        { status: 400 },
      );
    }

    const existingBusiness = await db.business.findUnique({
      where: { subdomain },
    });

    if (existingBusiness) {
      return NextResponse.json(
        { error: "This subdomain is already taken" },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findFirst({
      where: { email },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Unable to complete store setup. Please try again." },
        { status: 400 },
      );
    }

    //First, create the user.

    // const authUser = await auth.api.signUpEmail({
    //   body: {
    //     email,
    //     password,
    //     name,
    //   },
    // });

    // if (!authUser.user) {
    //   return NextResponse.json(
    //     { error: "Failed to create user" },
    //     { status: 400 },
    //   );
    // }

    // Then, create business, and site content in a transaction
    const business = await db.$transaction(async (tx) => {
      // 1. Create business
      const newBusiness = await tx.business.create({
        data: {
          name: businessName,
          slug: slugify(businessName),
          subdomain,
          customDomain: customDomain || null,
          domainStatus: customDomain ? "PENDING_DNS" : "NONE",
          templateId: templateId || "modern",
          ownerEmail: email,
          status: "active",
          onboardingComplete: false,
        },
      });

      // 2. Create site content
      await tx.siteContent.create({
        data: {
          businessId: newBusiness.id,
          heroTitle: heroTitle || `Welcome to ${businessName}`,
          heroSubtitle: heroSubtitle || "",
          aboutText: aboutText || "",
          primaryColor: primaryColor || "#3b82f6",
          secondaryColor: "#ffffff",
          accentColor: "#3b82f6",
        },
      });

      // 3. Create business membership for the owner
      await tx.businessMembership.create({
        data: {
          userId: existingUser.id,
          businessId: newBusiness.id,
          role: "OWNER",
        },
      });

      // 4. If custom domain, add to domain queue
      if (customDomain) {
        await tx.domainQueue.create({
          data: {
            domain: customDomain,
            businessId: newBusiness.id,
            status: "pending",
          },
        });
      }

      return newBusiness;
    });

    // Notify Artisanal Futures that this token was consumed (non-blocking).
    if (aftoken) {
      void notifyArtisanalFutures(aftoken, business.subdomain, business.customDomain);
    }

    // Redirect to signup completion page with token
    const isDev = process.env.NODE_ENV === "development";
    const subdomainUrl = isDev
      ? `http://${subdomain}.localhost:3000`
      : `https://${subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;

    const redirectUrl = `${subdomainUrl}/auth/signup-complete`;

    return NextResponse.json({
      success: true,
      redirectUrl,
      businessId: business.id,
    });
  } catch (error) {
    if (error instanceof Error && error.constructor.name === "RateLimiterRes") {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }
    console.error("Onboarding error:", error);
    Sentry.captureException(error, { tags: { route: "onboarding" } });
    return NextResponse.json(
      { error: "Failed to create your store. Please try again." },
      { status: 500 },
    );
  }
}
