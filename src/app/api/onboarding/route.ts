import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { notifyArtisanalFuturesClaimed } from "~/lib/artisanal-futures/notify";
import {
  MERCHANT_TERMS_VERSION,
  PLATFORM_TERMS_VERSION,
} from "~/lib/legal/policy-versions";
import { signPartnerRequest } from "~/lib/partner-auth";
import { authLimiter, getClientIp } from "~/lib/rate-limit";
import { isSubdomainReserved, isValidDomain, slugify } from "~/lib/utils";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";

/**
 * Verify an Artisanal Futures artisan token server-side. The artisan onboarding
 * flow is exempt from the invitation code, so the token IS its admission
 * credential and must be validated — otherwise any request could bypass the
 * invite gate by supplying an arbitrary `aftoken`. Fails closed (`verified:
 * false`) on an invalid token OR an unreachable AF API, so an unverified token
 * can never grant the exemption.
 *
 * Returns the email AF has bound to this token so the caller can enforce that
 * the token holder can only sign up with THAT email — otherwise any holder of a
 * valid token could claim an arbitrary address. `email` is `null` whenever the
 * token is unverified or the response body can't be parsed.
 */
async function verifyArtisanToken(
  aftoken: string,
): Promise<{ verified: boolean; email: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    // Sign the canonical GET query string per the partner contract. AF tolerates
    // missing HMAC during cutover, but send it now so SP is ready. HMAC runs over
    // the exact `code=<aftoken>` bytes used below.
    const canonicalQuery = `code=${encodeURIComponent(aftoken)}`;
    const { timestamp, signature } = signPartnerRequest(
      canonicalQuery,
      env.AF_SP_WEBHOOK_SECRET,
    );
    const res = await fetch(
      `${env.ARTISANAL_FUTURES_API_URL}/simplepress?${canonicalQuery}`,
      {
        headers: {
          Authorization: `Bearer ${env.ARTISANAL_FUTURES_API_TOKEN}`,
          "X-Partner-Timestamp": String(timestamp),
          "X-Partner-Signature": signature,
        },
        signal: controller.signal,
      },
    );
    if (res.status !== 200) {
      return { verified: false, email: null };
    }
    // Fail closed on any parse error (treat as unverified).
    const data = (await res.json()) as { email?: unknown };
    const email = typeof data.email === "string" ? data.email : null;
    return { verified: email !== null, email };
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: "onboarding", step: "verify-artisan-token" },
    });
    return { verified: false, email: null };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Notify Artisanal Futures that an artisan token was successfully used and the
 * site is live. Non-blocking — a failure here should never prevent store
 * creation. Delegates to the shared `notifyArtisanalFuturesClaimed` client,
 * which posts the fixed contract body `{code, event, status, subdomain,
 * deploymentUrl, customDomain, errorMessage}` with the partner auth headers
 * (bearer + timestamp + HMAC) and never throws (it reports to Sentry itself).
 *
 * In the v1 flow the aftoken IS the AF provision code. `customDomain` carries
 * the actual bare domain (or null) — never a URL; the storefront URL is built
 * separately and sent as `deploymentUrl`.
 */
async function notifyArtisanalFutures(
  aftoken: string,
  subdomain: string,
  customDomain: string | null,
): Promise<void> {
  const deploymentUrl = customDomain
    ? `https://${customDomain}`
    : `https://${subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;
  await notifyArtisanalFuturesClaimed({
    afProvisionCode: aftoken,
    event: "claimed",
    status: "ACTIVE",
    subdomain,
    deploymentUrl,
    customDomain,
  });
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
      /**
       * Explicit acceptance of the platform ToS + Privacy Policy (the account)
       * AND the Seller & Merchant Agreement + Acceptable Use Policy (the store).
       * Must be literally `true`; a checkbox that only exists in React is not
       * evidence of anything, so this is required here too. The TIMESTAMP is
       * never taken from the client — see the transaction below.
       */
      acceptedTerms?: unknown;
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
      acceptedTerms,
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

    // Terms acceptance is a hard precondition for creating a store: this is the
    // only point at which anyone agrees to the documents that let the platform
    // suspend a merchant. Require the flag explicitly (`true`, not truthy) and
    // refuse rather than silently creating an unbound store.
    if (acceptedTerms !== true) {
      return NextResponse.json(
        {
          error:
            "You must accept the Terms of Service, Privacy Policy, Seller & Merchant Agreement, and Acceptable Use Policy to create a store.",
        },
        { status: 400 },
      );
    }

    // Enforce the invitation code SERVER-SIDE. The wizard gates on it client-side
    // (and via /api/signup/verify-code), but both are bypassable — so re-check here
    // before creating any store. The artisan flow is exempt from the invite code,
    // but ONLY when its Artisanal Futures token is verified against the AF API —
    // an unverified/forged aftoken must not bypass the invite gate.
    const artisanCheck = aftoken
      ? await verifyArtisanToken(aftoken)
      : { verified: false as const, email: null };
    if (aftoken && artisanCheck.verified) {
      // Bind the token to the email AF issued it for. `session.user.email` is
      // already proven to equal `email` (checked above), so comparing against it
      // pins the signup to the verified session identity. A holder of a valid
      // token must NOT be able to sign up with an arbitrary address — reject
      // outright rather than falling through to the invitation-code path.
      if (
        artisanCheck.email?.toLowerCase() !== session.user.email.toLowerCase()
      ) {
        return NextResponse.json(
          {
            error:
              "This Artisanal Futures link is for a different email address",
          },
          { status: 403 },
        );
      }
    } else {
      // No token, or the token is unverified — require a valid invitation code.
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
      // Server-generated acceptance instant — never read from the request body.
      const acceptedAt = new Date();

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

      // 3. Create business membership for the owner, carrying its acceptance of
      // the Seller & Merchant Agreement + Acceptable Use Policy. Written in the
      // SAME transaction as the business so a store can never exist without a
      // recorded acceptance.
      await tx.businessMembership.create({
        data: {
          userId: existingUser.id,
          businessId: newBusiness.id,
          role: "OWNER",
          merchantTermsAcceptedAt: acceptedAt,
          merchantTermsVersion: MERCHANT_TERMS_VERSION,
        },
      });

      // 3b. Platform ToS + Privacy attach to the ACCOUNT, which this flow just
      // created (via better-auth on the client, immediately before this call).
      // Only stamp when nothing is recorded yet: a retry after a failed store
      // step must not overwrite the original acceptance instant/version.
      if (!existingUser.termsAcceptedAt) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            termsAcceptedAt: acceptedAt,
            termsVersion: PLATFORM_TERMS_VERSION,
          },
        });
      }

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
