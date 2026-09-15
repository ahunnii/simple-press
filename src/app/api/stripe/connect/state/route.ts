import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "~/env";
import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import {
  createSignedOAuthState,
  isAllowedReturnUrl,
} from "~/lib/stripe/oauth-state";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";

const stripeConnectStateSchema = z.object({
  businessId: z.string().min(1).max(64),
  returnUrl: z.string().min(1).max(2048),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = stripeConnectStateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing businessId or returnUrl" },
      { status: 400 },
    );
  }

  const { businessId, returnUrl } = parsed.data;

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
    select: { subdomain: true, customDomain: true, domainStatus: true },
  });

  if (!business) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    !isAllowedReturnUrl(returnUrl, business, {
      allowInsecureLocalhost: process.env.NODE_ENV !== "production",
    })
  ) {
    return NextResponse.json({ error: "Invalid return URL" }, { status: 400 });
  }

  const signedState = createSignedOAuthState(
    { businessId, returnUrl },
    env.SIMPLEPRESS_HASH_SECRET,
  );

  return NextResponse.json({ signedState });
}
