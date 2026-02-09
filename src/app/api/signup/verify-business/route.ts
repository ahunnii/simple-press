import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
    const { businessId } = (await req.json()) as { businessId: string };

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 },
      );
    }

    // Get the current session
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    // Get the user from database
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        businessId: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the user has the correct businessId
    if (user.businessId !== businessId) {
      return NextResponse.json(
        { error: "Business verification failed" },
        { status: 403 },
      );
    }

    // All good!
    return NextResponse.json({
      verified: true,
      userId: user.id,
      businessId: user.businessId,
    });
  } catch (error: unknown) {
    console.error("Verify business error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 },
    );
  }
}
