/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { db } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
    const { token } = (await req.json()) as { token: string };

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find and validate token
    const signupToken = await db.signupToken.findUnique({
      where: { token },
    });

    if (!signupToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Check if token is expired
    if (signupToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Token has expired. Please try logging in." },
        { status: 400 },
      );
    }

    // Check if token was already used
    if (signupToken.used) {
      return NextResponse.json(
        { error: "Token has already been used" },
        { status: 400 },
      );
    }

    // Mark token as used
    await db.signupToken.update({
      where: { token },
      data: { used: true },
    });

    // Get the user
    const user = await db.user.findUnique({
      where: { id: signupToken.userId },
      select: {
        id: true,
        email: true,
        name: true,
        businessId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create a session for this user using Better Auth
    // We need to create the session manually since we don't have credentials
    const session = await db.session.create({
      data: {
        userId: user.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        token: require("crypto").randomBytes(32).toString("hex"),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      userId: user.id,
      businessId: user.businessId,
    });

    // Set the session cookie (Better Auth format)
    // Use same domain as auth config so session works on both localhost and mystore.localhost
    const isLocalhost =
      process.env.NODE_ENV === "development" &&
      (process.env.BETTER_AUTH_BASE_URL?.includes("localhost") ?? false);
    response.cookies.set("better-auth.session_token", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
      ...(isLocalhost && { domain: ".localhost" }),
    });

    return response;
  } catch (error: unknown) {
    console.error("Verify signup token error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to verify token",
      },
      { status: 500 },
    );
  }
}
