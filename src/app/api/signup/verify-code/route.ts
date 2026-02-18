import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "~/env";

export async function POST(req: NextRequest) {
  try {
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
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
