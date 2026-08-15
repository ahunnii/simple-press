import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "~/env";
import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { createSignedOAuthState } from "~/lib/stripe/oauth-state";
import { auth } from "~/server/better-auth/config";
import { db } from "~/server/db";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    businessId: string;
    returnUrl: string;
  };

  const { businessId, returnUrl } = body;
  if (!businessId || !returnUrl) {
    return NextResponse.json(
      { error: "Missing businessId or returnUrl" },
      { status: 400 },
    );
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

  const signedState = createSignedOAuthState(
    { businessId, returnUrl },
    env.SIMPLEPRESS_HASH_SECRET,
  );

  return NextResponse.json({ signedState });
}
