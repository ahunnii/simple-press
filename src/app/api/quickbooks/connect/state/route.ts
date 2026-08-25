import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "~/env";
import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { isQuickBooksConfigured } from "~/lib/quickbooks/config";
import { buildAuthorizeUrl } from "~/lib/quickbooks/oauth";
import { createSignedOAuthState } from "~/lib/stripe/oauth-state";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";

// app/api/quickbooks/connect/state/route.ts
//
// Mints a signed OAuth state and hands back the fully-built Intuit
// authorize URL. Two things are deliberately different from a "just sign
// the state and let the client build the URL" approach:
//
// 1. The authorize URL (which embeds `QBO_CLIENT_ID`) is built server-side
//    (`buildAuthorizeUrl`, in `~/lib/quickbooks/oauth`) rather than in the
//    browser. That keeps `QBO_CLIENT_ID` a plain server env var with no
//    `NEXT_PUBLIC_` twin — see the "NEXT_PUBLIC_ twin antipattern" note:
//    don't duplicate a server value into the client bundle when a server
//    route can hand back the finished artifact instead.
// 2. Membership (OWNER/MANAGER) or platform-admin is verified HERE, on the
//    subdomain where the tenant session cookie is valid, rather than in the
//    `/callback` route. The callback is hit by Intuit's redirect on the
//    MAIN platform domain, where that cookie does not exist — exactly the
//    same cross-domain reasoning as the Stripe Connect state/callback split
//    (see `src/app/api/stripe/connect/state/route.ts`).
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    businessId?: string;
    returnUrl?: string;
  };

  const { businessId, returnUrl } = body;
  if (!businessId || !returnUrl) {
    return NextResponse.json(
      { error: "Missing businessId or returnUrl" },
      { status: 400 },
    );
  }

  if (!isQuickBooksConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  // Verify the requesting user owns this business
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

  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { featureFlags: true },
  });
  if (!business) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!resolveFlags(business.featureFlags).isEnabled("quickbooks")) {
    return NextResponse.json({ error: "feature_disabled" }, { status: 403 });
  }

  const state = createSignedOAuthState(
    { businessId, returnUrl },
    env.SIMPLEPRESS_HASH_SECRET,
  );

  return NextResponse.json({ authorizeUrl: buildAuthorizeUrl({ state }) });
}
