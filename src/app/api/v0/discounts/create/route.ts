import { NextRequest, NextResponse } from "next/server";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { businessId, code, type, value, active, usageLimit, expiresAt } =
      (await req.json()) as {
        businessId: string;
        code: string;
        type: "percentage" | "fixed";
        value: number;
        active: boolean;
        usageLimit: number;
        expiresAt: string;
      };

    // Validation
    if (!code || !type || !value) {
      return NextResponse.json(
        { error: "Code, type, and value are required" },
        { status: 400 },
      );
    }

    // Verify user has access to this business
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { businessId: true },
    });

    if (user?.businessId !== businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if code already exists for this business
    const existingCode = await db.discountCode.findFirst({
      where: {
        businessId,
        code: code.toUpperCase(),
      },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: "A discount code with this code already exists" },
        { status: 400 },
      );
    }

    // Create discount code
    const discount = await db.discountCode.create({
      data: {
        businessId,
        code: code.toUpperCase(),
        type,
        value,
        active: active ?? true,
        usageLimit,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({ success: true, discount });
  } catch (error: unknown) {
    console.error("Create discount error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create discount",
      },
      { status: 500 },
    );
  }
}
