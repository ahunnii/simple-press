import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { authLimiter, getClientIp } from "~/lib/rate-limit";
import { isSubdomainReserved, isValidDomain, slugify } from "~/lib/utils";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";

/**
 * Verify an Artisanal Futures artisan token server-side. The artisan onboarding
 * flow is exempt from the invitation code, so the token IS its admission
 * credential and must be validated — otherwise any request could bypass the
 * invite gate by supplying an arbitrary `aftoken`. Fails closed (returns false)
 * on an invalid token OR an unreachable AF API, so an unverified token can never
 * grant the exemption.
 */
async function verifyArtisanToken(aftoken: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(
      `${env.ARTISANAL_FUTURES_API_URL}/simplepress?code=${encodeURIComponent(aftoken)}`,
      {
        headers: {
          Authorization: `Bearer ${env.ARTISANAL_FUTURES_API_TOKEN ?? env.SIMPLEPRESS_HASH_SECRET}`,
        },
        signal: controller.signal,
      },
    );
    return res.status === 200;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "onboarding", step: "verify-artisan-token" },
    });
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

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
    customDomain ?? `https://${subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;
  try {
    const res = await fetch(`${env.ARTISANAL_FUTURES_API_URL}/simplepress`, {
      method: "POST",
      body: JSON.stringify({
        artisanToken: aftoken,
        subdomain,
        customDomain: storeUrl,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.SIMPLEPRESS_HASH_SECRET}`,
      },
    });
    if (!res.ok) {
      console.warn(
        "[Onboarding] AF token update returned non-OK status",
        res.status,
      );
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "onboarding", step: "af-token-update" },
    });
    console.error(
      "[Onboarding] Failed to notify Artisanal Futures (non-blocking)",
      err,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit in its own guard so a genuine throttle returns 429. The limiter
    // rejects with a RateLimiterRes (NOT an Error), so it can't be reliably
    // caught by the outer `instanceof Error` catch — handle it here instead.
    try {
      await authLimiter.consume(getClientIp(req));
    } catch {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

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
      /** Invitation code — required for the standard (non-artisan) signup flow. */
      invitationCode?: string | null;
      /** Artisanal Futures token — present only for the artisan onboarding flow. */
      aftoken?: string | null;
    };

    const {
      email,
      password,
      name,
      businessName,
      subdomain: rawSubdomain,
      customDomain: rawCustomDomain,
      templateId,
      heroTitle,
      heroSubtitle,
      aboutText,
      primaryColor,
      invitationCode,
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
    if (!email || !password || !name || !businessName || !rawSubdomain) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Enforce the invitation code SERVER-SIDE. The wizard gates on it client-side
    // (and via /api/signup/verify-code), but both are bypassable — so re-check here
    // before creating any store. The artisan flow is exempt from the invite code,
    // but ONLY when its Artisanal Futures token is verified against the AF API —
    // an unverified/forged aftoken must not bypass the invite gate.
    const artisanVerified = aftoken ? await verifyArtisanToken(aftoken) : false;
    if (!artisanVerified) {
      if (!invitationCode || invitationCode !== env.INVITATION_CODE) {
        return NextResponse.json(
          { error: "Invalid or missing invitation code" },
          { status: 400 },
        );
      }
    }

    // Normalize + validate the subdomain: lowercase, allowed charset only
    // (a–z, 0–9, hyphens), no leading/trailing hyphen, reasonable length.
    const subdomain = rawSubdomain.trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
      return NextResponse.json(
        {
          error:
            "Subdomain may only contain lowercase letters, numbers, and hyphens (not starting or ending with a hyphen).",
        },
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

    // Normalize + validate an optional custom domain, and reject an
    // already-taken one with a clear 400 (rather than letting the unique
    // constraint blow up as a 500 inside the transaction below).
    const customDomain = rawCustomDomain?.trim().toLowerCase() || null;
    if (customDomain) {
      if (!isValidDomain(customDomain)) {
        return NextResponse.json(
          {
            error:
              "Enter a valid custom domain (e.g. example.com) without a scheme or path.",
          },
          { status: 400 },
        );
      }

      const existingDomain = await db.business.findFirst({
        where: { customDomain },
        select: { id: true },
      });
      if (existingDomain) {
        return NextResponse.json(
          { error: "This custom domain is already in use" },
          { status: 400 },
        );
      }
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

    // Generate a globally-unique slug. `Business.slug` is unique, so two stores
    // with the same name would otherwise collide — the second onboarding would
    // 500 inside the transaction and orphan the just-created user. Loop-suffix
    // until we find a free slug (same pattern as collections/services).
    const baseSlug = slugify(businessName) || "store";
    let slug = baseSlug;
    for (let counter = 1; counter <= 100; counter++) {
      const slugTaken = await db.business.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!slugTaken) break;
      slug = `${baseSlug}-${counter}`;
    }

    // The user was already created via better-auth signUpEmail on the client
    // before this route is called (see StoreCustomizationStep) — verified
    // above via getSession(). Create business + site content in a transaction.
    const business = await db.$transaction(async (tx) => {
      // 1. Create business
      const newBusiness = await tx.business.create({
        data: {
          name: businessName,
          slug,
          subdomain,
          customDomain,
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
      void notifyArtisanalFutures(
        aftoken,
        business.subdomain,
        business.customDomain,
      );
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
    // Rate-limit rejections are handled up-front (see the guard at the top of
    // this handler); anything reaching here is an unexpected failure.
    console.error("Onboarding error:", error);
    Sentry.captureException(error, { tags: { route: "onboarding" } });
    return NextResponse.json(
      { error: "Failed to create your store. Please try again." },
      { status: 500 },
    );
  }
}
