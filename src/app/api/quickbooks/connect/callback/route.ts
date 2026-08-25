import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { isQuickBooksConfigured } from "~/lib/quickbooks/config";
import { redactTokenBearingError } from "~/lib/quickbooks/errors";
import { exchangeCode, fetchCompanyInfo } from "~/lib/quickbooks/oauth";
import { verifySignedOAuthState } from "~/lib/stripe/oauth-state";
import { db } from "~/server/db";

/**
 * QuickBooks Online OAuth callback.
 *
 * WHY THIS LIVES ON THE MAIN PLATFORM DOMAIN
 * Intuit allows exactly one registered redirect URI per app, so every tenant's
 * connect flow — whichever subdomain or custom domain the owner started it from
 * — lands back here. That means the tenant's session cookie is NOT valid on this
 * request: it was issued for the store's own host. So this route never tries to
 * authenticate the caller. Authorization was already proven earlier, at
 * state-generation time, on the tenant host where the session was valid; that
 * step signs `{ businessId, returnUrl }` with SIMPLEPRESS_HASH_SECRET (15-min
 * TTL) and the signature is the only credential this route trusts. Same
 * two-step shape as `src/app/api/stripe/connect/callback/route.ts`, and it
 * reuses the same provider-agnostic state helper.
 *
 * The state is therefore verified FIRST — before `error` or `code` are even
 * looked at — because `returnUrl` is where every branch below redirects, and an
 * unverified `returnUrl` would turn this endpoint into an open redirector.
 *
 * REALM ID
 * Intuit passes `realmId` (the QuickBooks company id) as a plain query
 * parameter on this callback rather than inside the token response. It is
 * required on every subsequent QBO API call, so a callback without it is
 * unusable and is rejected as `no_realm`.
 *
 * REALM CHANGE = CACHE RESET
 * If the owner reconnects to a DIFFERENT QuickBooks company, the cached QBO
 * reference ids (income account, deposit item, service item) point at rows that
 * do not exist in the new company, so they are cleared on the upsert. Deposit
 * settings (mode/percent/fixed/due days) are business policy, not QBO ids, and
 * are deliberately preserved across any reconnect.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const encodedState = searchParams.get("state");
  const realmId = searchParams.get("realmId");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Verify and decode signed state (authorization was established at
  // state-generation time, on the tenant host where the session was valid).
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
    console.error("[QuickBooks Connect] Invalid state:", err);
    return new NextResponse("Invalid or expired state parameter", {
      status: 400,
    });
  }

  // Handle user cancellation or errors from Intuit
  if (error) {
    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("quickbooks_error", error);
    if (errorDescription) {
      redirectUrl.searchParams.set(
        "quickbooks_error_description",
        errorDescription,
      );
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("quickbooks_error", "no_code");
    return NextResponse.redirect(redirectUrl);
  }

  // Without the company id nothing downstream can call the QBO API.
  if (!realmId) {
    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("quickbooks_error", "no_realm");
    return NextResponse.redirect(redirectUrl);
  }

  if (!isQuickBooksConfigured()) {
    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("quickbooks_error", "not_configured");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Verify business still exists
    const business = await db.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });

    if (!business) {
      throw new Error("Business not found");
    }

    // Exchange authorization code for the token set (throws on failure)
    const tokens = await exchangeCode(code);

    const environment = env.QBO_ENVIRONMENT;

    // Best-effort: the display name is a nicety, and `fetchCompanyInfo` never
    // throws — a null company name must not lose an otherwise good connection.
    const { companyName } = await fetchCompanyInfo({
      accessToken: tokens.accessToken,
      realmId,
      environment,
    });

    const existing = await db.quickBooksConnection.findUnique({
      where: { businessId },
      select: { realmId: true },
    });
    const realmChanged = existing != null && existing.realmId !== realmId;

    const now = new Date();

    try {
      await db.quickBooksConnection.upsert({
        where: { businessId },
        create: {
          businessId,
          realmId,
          environment,
          companyName,
          status: "active",
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessTokenExpiresAt: tokens.accessTokenExpiresAt,
          refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
          lastRefreshAt: now,
          connectedAt: now,
        },
        update: {
          realmId,
          environment,
          companyName,
          status: "active",
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessTokenExpiresAt: tokens.accessTokenExpiresAt,
          refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
          lastRefreshAt: now,
          connectedAt: now,
          disconnectedAt: null,
          lastSyncError: null,
          // The cached QBO reference ids are per-company: an account or item id
          // from the old realm names nothing in the new one, so reconnecting to a
          // different company must clear them and let the next sync re-resolve.
          // Deposit settings are the owner's policy, not QBO ids — left intact.
          ...(realmChanged
            ? {
                incomeAccountId: null,
                depositItemId: null,
                serviceItemId: null,
              }
            : {}),
        },
      });
    } catch (err) {
      // `data` above carries live Intuit access/refresh tokens.
      // `PrismaClientValidationError` interpolates the full argument object
      // into `message`, so a raw failure here must never reach the outer
      // catch's console.error/Sentry call below.
      throw redactTokenBearingError(err, "callback-upsert");
    }

    console.log(
      `[QuickBooks Connect] Business ${businessId} connected realm ${realmId} (${environment})`,
    );

    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("quickbooks", "connected");
    return NextResponse.redirect(redirectUrl);
  } catch (err: unknown) {
    // Never log the error's payload beyond this — token responses can carry
    // access/refresh tokens in the body of a thrown fetch error.
    console.error("[QuickBooks Connect] Error:", err);
    Sentry.captureException(err, {
      tags: {
        "quickbooks.step": "token-exchange",
        service: "quickbooks",
        businessId,
      },
    });

    const redirectUrl = new URL(returnUrl);
    redirectUrl.searchParams.set("quickbooks_error", "connection_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
