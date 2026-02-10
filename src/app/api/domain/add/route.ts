import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { DomainRouteInput } from "~/lib/validators/domain";
import { isValidDomain } from "~/lib/utils";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { domain } = (await req.json()) as DomainRouteInput;

    if (!domain || !isValidDomain(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 },
      );
    }

    // Get user's business
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { businessId: true },
    });

    if (!user?.businessId) {
      return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    // Check if domain is already taken
    const existingDomain = await db.business.findFirst({
      where: {
        customDomain: domain,
        id: { not: user.businessId },
      },
    });

    if (existingDomain) {
      return NextResponse.json(
        { error: "This domain is already in use" },
        { status: 400 },
      );
    }

    // Update business with custom domain
    await db.business.update({
      where: { id: user.businessId },
      data: {
        customDomain: domain,
        domainStatus: "PENDING_DNS",
      },
    });

    // Add to domain queue for Coolify
    await db.domainQueue.create({
      data: {
        domain,
        businessId: user.businessId,
        status: "pending",
      },
    });

    // TODO: Send notification to admin to add domain to Coolify
    // This could be an email, Slack message, or webhook

    return NextResponse.json({
      success: true,
      domain,
      status: "PENDING_DNS",
    });
  } catch (error: unknown) {
    console.error("Add domain error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add domain",
      },
      { status: 500 },
    );
  }
}
