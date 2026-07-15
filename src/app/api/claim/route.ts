import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Prisma } from "generated/prisma";

import { env } from "~/env";
import { notifyArtisanalFuturesClaimed } from "~/lib/artisanal-futures/notify";
import { authLimiter, getClientIp } from "~/lib/rate-limit";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";

/**
 * Build the tenant admin URL for a claimed site, mirroring how
 * `src/app/api/onboarding/route.ts` derives its redirect (dev localhost vs.
 * production platform domain). `/admin` is the tenant dashboard entry point
 * (it internally redirects to /admin/welcome or /admin/dashboard).
 */
function buildAdminRedirect(subdomain: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const base = isDev
    ? `http://${subdomain}.localhost:3000`
    : `https://${subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;
  return `${base}/admin`;
}

/**
 * POST /api/claim — an invited business owner takes ownership of a headlessly
 * provisioned site. Contract: item B6 in
 * `docs/integrations/artisanal-futures-provisioning.md`.
 *
 * Body: `{ code: string }`. The caller must already have an authenticated,
 * email-verified session whose email matches the invite. On success the owner
 * gets an OWNER membership, the invite is consumed, the site's "coming soon"
 * maintenance mode is lifted, and Artisanal Futures is notified (best-effort).
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit up-front so a genuine throttle returns 429. The limiter rejects
    // with a RateLimiterRes (NOT an Error), so it can't be reliably caught by
    // the outer `instanceof Error` catch — handle it here (same as onboarding).
    try {
      await authLimiter.consume(getClientIp(req));
    } catch {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    // Session required — the owner must be signed in before claiming.
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      code?: string;
    } | null;
    const code = body?.code?.trim();
    if (!code) {
      return NextResponse.json({ error: "Missing claim code" }, { status: 400 });
    }

    const invite = await db.platformInvite.findUnique({
      where: { code },
      include: { business: true },
    });
    if (!invite) {
      return NextResponse.json({ error: "Invalid claim link" }, { status: 404 });
    }

    // Already used. A double-click by the SAME owner must not error — return the
    // redirect idempotently. Any other used invite is a hard 409.
    if (invite.used) {
      if (invite.usedBy === session.user.id && invite.business) {
        return NextResponse.json({
          redirectUrl: buildAdminRedirect(invite.business.subdomain),
        });
      }
      return NextResponse.json(
        { error: "This site has already been claimed." },
        { status: 409 },
      );
    }

    // Unexpired.
    if (invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        {
          error:
            "This claim link has expired. Contact Artisanal Futures support for a new one.",
        },
        { status: 410 },
      );
    }

    // Email binding — the session must belong to the invited address.
    if (session.user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation is for a different email address." },
        { status: 403 },
      );
    }

    // Email must be verified before a claim is honored.
    if (session.user.emailVerified !== true) {
      return NextResponse.json(
        { error: "Verify your email first." },
        { status: 403 },
      );
    }

    // Claim invites always carry a business (minted by partner-provision).
    if (!invite.businessId || !invite.business) {
      return NextResponse.json(
        { error: "This claim link is not associated with a site." },
        { status: 400 },
      );
    }

    const business = invite.business;
    const userId = session.user.id;

    try {
      await db.$transaction(async (tx) => {
        // Grant ownership. `upsert` on the @@unique(userId, businessId) makes a
        // repeat claim idempotent WITHOUT aborting the surrounding transaction
        // (a raw create that hit P2002 would poison the Postgres transaction).
        await tx.businessMembership.upsert({
          where: {
            userId_businessId: { userId, businessId: business.id },
          },
          create: { userId, businessId: business.id, role: "OWNER" },
          update: {},
        });

        await tx.platformInvite.update({
          where: { id: invite.id },
          data: { used: true, usedAt: new Date(), usedBy: userId },
        });

        await tx.business.update({
          where: { id: business.id },
          data: { onboardingComplete: true, maintenanceMode: false },
        });
      });
    } catch (txError) {
      // Belt-and-suspenders: a concurrent claim by the same user could still
      // race to a unique-constraint violation. Treat that as idempotent success
      // rather than surfacing a 500 on a harmless double-submit.
      if (
        txError instanceof Prisma.PrismaClientKnownRequestError &&
        txError.code === "P2002"
      ) {
        return NextResponse.json({
          redirectUrl: buildAdminRedirect(business.subdomain),
        });
      }
      throw txError;
    }

    // Notify Artisanal Futures (fire-and-forget — never blocks the response and
    // never throws; see notify.ts). Skipped for non-AF invites (afProvisionCode
    // null), e.g. future platform-admin-minted invites.
    if (business.afProvisionCode) {
      void notifyArtisanalFuturesClaimed({
        afProvisionCode: business.afProvisionCode,
        event: "claimed",
        status: "ACTIVE",
        subdomain: business.subdomain,
        deploymentUrl: `https://${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`,
        customDomain: business.customDomain,
      });
    }

    return NextResponse.json({
      redirectUrl: buildAdminRedirect(business.subdomain),
    });
  } catch (error) {
    console.error("Claim error:", error);
    Sentry.captureException(error, { tags: { route: "claim" } });
    return NextResponse.json(
      { error: "Failed to claim your site. Please try again." },
      { status: 500 },
    );
  }
}
