import { NextRequest, NextResponse } from "next/server";

import { auth } from "~/lib/auth";
import { prisma } from "~/server/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Get session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { umamiWebsiteId, umamiEnabled } = await req.json();

    // Verify user owns this business
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { businessId: true },
    });

    if (user?.businessId !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update business
    const business = await prisma.business.update({
      where: { id },
      data: {
        umamiWebsiteId,
        umamiEnabled,
      },
    });

    return NextResponse.json({ success: true, business });
  } catch (error: any) {
    console.error("Update integrations error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update integrations" },
      { status: 500 },
    );
  }
}
