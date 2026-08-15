import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { getClientIp, inviteLimiter } from "~/lib/rate-limit";

// Fires at most once per server process — INVITATION_CODE being unset or
// blank means every invitation code attempt gets a 500 that looks like a
// routine server error, but actually means signup is silently closed
// platform-wide. Mirrors warnMissingCronSecret in
// src/app/api/cron/route.ts: loud once, not spammed on every attempt.
let warnedMissingInvitationCode = false;

function warnMissingInvitationCode(): void {
  if (warnedMissingInvitationCode) return;
  warnedMissingInvitationCode = true;

  const message =
    "INVITATION_CODE is not set (or is blank) — /api/signup/verify-code is " +
    "rejecting every invitation code with a 500, which silently closes " +
    "signup platform-wide. Set INVITATION_CODE to re-enable signup.";
  console.warn(message);
  Sentry.captureMessage(message, {
    level: "error",
    tags: { route: "signup.verify-code", gate: "invitation-code" },
  });
}

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
      warnMissingInvitationCode();
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
    Sentry.captureException(error, {
      tags: { route: "signup.verify-code" },
    });
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
