import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { OnboardingDraftPayload } from "~/lib/onboarding/draft";
import {
  DRAFT_TTL_MS,
  ONBOARDING_DRAFT_COOKIE,
  peekOnboardingDraft,
  saveOnboardingDraft,
} from "~/lib/onboarding/draft";
import { authLimiter, getClientIp } from "~/lib/rate-limit";
import { onboardingDraftSchema } from "~/lib/validators/onboarding";
import { auth } from "~/server/better-auth";

export const runtime = "nodejs";

/**
 * Persist a signed onboarding draft before email/password signup.
 * Required because `requireEmailVerification` prevents an immediate session,
 * so `/api/onboarding` cannot run until the owner verifies and returns.
 *
 * Since no session can exist here, the draft is bound to THIS browser instead:
 * a random secret is stored hashed inside the draft and handed back as an
 * HttpOnly cookie, and `/api/onboarding` refuses to consume a draft without
 * it. Otherwise anyone who knew a victim's email could plant a draft and
 * dictate the business name / subdomain / custom domain / template of the
 * store that victim creates after verifying.
 */
export async function POST(req: NextRequest) {
  try {
    await authLimiter.consume(getClientIp(req));
  } catch {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = onboardingDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid onboarding draft" },
      { status: 400 },
    );
  }

  const payload: OnboardingDraftPayload = parsed.data;
  const result = await saveOnboardingDraft(payload, {
    draftSecret: randomBytes(32).toString("hex"),
    presentedSecret: req.cookies.get(ONBOARDING_DRAFT_COOKIE)?.value ?? null,
  });

  if (result.status === "conflict") {
    return NextResponse.json(
      { error: "A signup is already in progress for this email" },
      { status: 409 },
    );
  }

  const response = NextResponse.json({ ok: true });
  // Mirrors the `pending_session` cookie in stripe/create-session: HttpOnly so
  // script can't read the secret, `lax` (not `strict`) because the browser
  // returns here through the top-level navigation of the verification email
  // link, and `secure` off in development so http://localhost still works.
  response.cookies.set(ONBOARDING_DRAFT_COOKIE, result.draftSecret, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: DRAFT_TTL_MS / 1000,
  });
  return response;
}

/**
 * Peek at the current user's draft (does not consume). Used by the continue
 * page to confirm there is something to resume.
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.emailVerified) {
    return NextResponse.json(
      { error: "Email not verified", verified: false },
      { status: 403 },
    );
  }

  const draft = await peekOnboardingDraft(session.user.email);
  if (!draft) {
    return NextResponse.json({ draft: null });
  }

  return NextResponse.json({ draft });
}
