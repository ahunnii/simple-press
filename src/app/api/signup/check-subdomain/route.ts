import { type NextRequest, NextResponse } from "next/server";
import { isSubdomainReserved } from "~/lib/utils";
import { db } from "~/server/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subdomain = searchParams.get("subdomain");

    if (!subdomain) {
      return NextResponse.json(
        { error: "Subdomain is required" },
        { status: 400 },
      );
    }

    // Check if subdomain is reserved
    if (isSubdomainReserved(subdomain)) {
      return NextResponse.json({ available: false });
    }

    // Check if subdomain is already taken
    const existing = await db.business.findUnique({
      where: { subdomain },
      select: { id: true },
    });

    return NextResponse.json({ available: !existing });
  } catch (error) {
    console.error("Error checking subdomain:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
