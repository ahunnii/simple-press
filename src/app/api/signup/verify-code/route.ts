import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "~/env";
import { getClientIp, inviteLimiter } from "~/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    await inviteLimiter.consume(ip);

    const { invitationCode } = (await req.json()) as {
      invitationCode: string;
    };

    // Check against environment variable
    const validCode = env.INVITATION_CODE;

    if (!validCode) {
      return NextResponse.json(
        { error: "Invitation system not configured" },
        { status: 500 },
      );
    }

    if (invitationCode !== validCode) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 400 },
      );
    }

    // Code is valid
    return NextResponse.json({ valid: true });
  } catch (error) {
    if (error instanceof Error && error.constructor.name === "RateLimiterRes") {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
