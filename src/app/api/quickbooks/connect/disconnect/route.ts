import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { revokeToken } from "~/lib/quickbooks/oauth";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";

// app/api/quickbooks/connect/disconnect/route.ts

export async function POST(request: NextRequest) {
  // Declared outside the try so the outer catch can report which business
  // was being disconnected even if the failure happened before the DB
  // update resolved.
  let businessIdForReport: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { businessId?: string };
    const businessId = body.businessId;
    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }
    businessIdForReport = businessId;

    const membership = await db.businessMembership.findFirst({
      where: {
        userId: session.user.id,
        businessId,
        role: { in: ["OWNER", "MANAGER"] },
      },
    });
    if (!membership && !(await isPlatformAdmin(session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await db.quickBooksConnection.findUnique({
      where: { businessId },
    });

    // No connection on record: nothing to disconnect. Idempotent — a retry
    // after an already-successful disconnect (or a client double-click
    // race) must not surface as an error.
    if (!existing) {
      return NextResponse.json({ success: true });
    }

    // DB first — same ordering, and the same reasoning, as the Stripe
    // Connect disconnect route (see
    // `src/app/api/stripe/connect/disconnect/route.ts`): clear the local
    // connection record BEFORE revoking the grant at Intuit. If the revoke
    // then fails, the worst case is a harmless stale grant sitting at
    // Intuit that can be cleaned up manually; the reverse order risks a DB
    // row that still reports "active" while pointing at tokens Intuit has
    // already revoked, which is a much worse failure mode to debug. The row
    // itself — and the deposit/invoice settings on it (depositMode,
    // depositPercent, incomeAccountId, etc.) — is retained, not deleted:
    // reconnecting the same business restores those settings instead of
    // making the owner re-enter them.
    const refreshToken = existing.refreshToken;
    await db.quickBooksConnection.update({
      where: { businessId },
      data: {
        status: "disconnected",
        accessToken: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        disconnectedAt: new Date(),
      },
    });

    // Revoke at Intuit. Best-effort, deliberately: the DB is already the
    // source of truth for whether this business is connected by the time we
    // get here, so a failure revoking the token must not fail the request —
    // it would just leave a stale (harmless) grant at Intuit. Mirrors the
    // Stripe route's "a stale grant is harmless; a DB row pointing at a
    // revoked grant is not" reasoning, except here we've already guaranteed
    // the DB can't end up in that bad state.
    if (refreshToken) {
      try {
        await revokeToken(refreshToken);
      } catch (err: unknown) {
        Sentry.captureException(err, {
          tags: {
            route: "quickbooks.connect.disconnect",
            service: "quickbooks",
            businessId,
            // dbCleared as a tag: "true" here = DB cleared but the
            // Intuit-side revoke failed — a dangling grant worth finding.
            dbCleared: "true",
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("QuickBooks disconnect error:", error);
    Sentry.captureException(error, {
      tags: {
        route: "quickbooks.connect.disconnect",
        service: "quickbooks",
      },
      extra: { businessId: businessIdForReport },
    });

    return NextResponse.json(
      { error: "Failed to disconnect QuickBooks" },
      { status: 500 },
    );
  }
}
