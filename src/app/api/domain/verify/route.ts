import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { DomainRouteInput } from "~/lib/validators/domain";
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

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
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

    // Verify this domain belongs to this business
    const business = await db.business.findFirst({
      where: {
        id: user.businessId,
        customDomain: domain,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Domain not found for your business" },
        { status: 404 },
      );
    }

    // Check DNS records
    const vpsIp = process.env.VPS_IP;

    if (!vpsIp) {
      return NextResponse.json(
        { error: "VPS IP not configured" },
        { status: 500 },
      );
    }

    // Use DNS lookup to check if domain points to our VPS
    const dns = await import("dns").then((m) => m.promises);

    try {
      const addresses = await dns.resolve4(domain);
      const pointsToUs = addresses.includes(vpsIp);

      if (pointsToUs) {
        // DNS is configured correctly!
        // Update business status
        await db.business.update({
          where: { id: user.businessId },
          data: { domainStatus: "ACTIVE" },
        });

        // Update domain queue
        await db.domainQueue.updateMany({
          where: {
            domain,
            businessId: user.businessId,
          },
          data: { status: "completed" },
        });

        return NextResponse.json({
          verified: true,
          message: "Domain verified successfully",
        });
      } else {
        return NextResponse.json({
          verified: false,
          message: `Domain points to ${addresses.join(", ")} but should point to ${vpsIp}`,
        });
      }
    } catch (dnsError: unknown) {
      // DNS lookup failed - domain not configured yet
      console.error("DNS lookup failed:", dnsError);
      return NextResponse.json({
        verified: false,
        message: "DNS records not found. Please check your configuration.",
      });
    }
  } catch (error: unknown) {
    console.error("Verify domain error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to verify domain",
      },
      { status: 500 },
    );
  }
}
