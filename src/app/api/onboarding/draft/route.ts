import { NextResponse } from "next/server";
import { z } from "zod";

import type { OnboardingDraftPayload } from "~/lib/onboarding/draft";
import {
  peekOnboardingDraft,
  saveOnboardingDraft,
} from "~/lib/onboarding/draft";
import { authLimiter, getClientIp } from "~/lib/rate-limit";
import { auth } from "~/server/better-auth";

export const runtime = "nodejs";

const draftSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  businessName: z.string().min(1),
  subdomain: z.string().min(1),
  customDomain: z.string().optional(),
  templateId: z.string().min(1),
  heroTitle: z.string().optional(),
  heroSubtitle: z.string().optional(),
  aboutText: z.string().optional(),
  primaryColor: z.string().optional(),
  invitationCode: z.string().optional(),
  aftoken: z.string().optional(),
  acceptedTerms: z.literal(true),
});

/**
 * Persist a signed onboarding draft before email/password signup.
 * Required because `requireEmailVerification` prevents an immediate session,
 * so `/api/onboarding` cannot run until the owner verifies and returns.
 */
export async function POST(req: Request) {
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

  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid onboarding draft" },
      { status: 400 },
    );
  }

  const payload: OnboardingDraftPayload = parsed.data;
  await saveOnboardingDraft(payload);
  return NextResponse.json({ ok: true });
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
