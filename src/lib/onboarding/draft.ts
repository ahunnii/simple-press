import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { env } from "~/env";
import { db } from "~/server/db";

const DRAFT_PREFIX = "onboarding-draft:";
const DRAFT_TTL_MS = 60 * 60 * 1000; // 1 hour — matches verification token expiry

export type OnboardingDraftPayload = {
  email: string;
  name: string;
  businessName: string;
  subdomain: string;
  customDomain?: string;
  templateId: string;
  heroTitle?: string;
  heroSubtitle?: string;
  aboutText?: string;
  primaryColor?: string;
  invitationCode?: string;
  aftoken?: string;
  acceptedTerms: true;
};

function sign(value: string): string {
  return createHmac("sha256", env.SIMPLEPRESS_HASH_SECRET)
    .update(value)
    .digest("base64url");
}

function pack(payload: OnboardingDraftPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${body}.${sign(body)}`;
}

function unpack(packed: string): OnboardingDraftPayload | null {
  const [body, signature] = packed.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as OnboardingDraftPayload;
    if (
      !parsed?.email ||
      !parsed?.name ||
      !parsed?.businessName ||
      !parsed?.subdomain ||
      !parsed?.templateId ||
      parsed.acceptedTerms !== true
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function identifierFor(email: string): string {
  return `${DRAFT_PREFIX}${email.trim().toLowerCase()}`;
}

/**
 * Persist a signed onboarding draft keyed by email.
 * Survives the email-verification round-trip when requireEmailVerification
 * prevents an immediate session after signup.
 */
export async function saveOnboardingDraft(
  payload: OnboardingDraftPayload,
): Promise<void> {
  const email = payload.email.trim().toLowerCase();
  const identifier = identifierFor(email);
  const expiresAt = new Date(Date.now() + DRAFT_TTL_MS);
  const value = pack({ ...payload, email, acceptedTerms: true });

  const existing = await db.verification.findFirst({
    where: { identifier },
    select: { id: true },
  });

  if (existing) {
    await db.verification.update({
      where: { id: existing.id },
      data: { value, expiresAt },
    });
  } else {
    await db.verification.create({
      data: { identifier, value, expiresAt },
    });
  }
}

/**
 * Load and consume an onboarding draft for the given email.
 * Returns null when missing, expired, or tampered.
 */
export async function consumeOnboardingDraft(
  email: string,
): Promise<OnboardingDraftPayload | null> {
  const identifier = identifierFor(email);
  const row = await db.verification.findFirst({
    where: { identifier },
  });
  if (!row) return null;

  // Always delete — draft is single-use whether valid or not.
  await db.verification
    .delete({ where: { id: row.id } })
    .catch(() => undefined);

  if (row.expiresAt.getTime() < Date.now()) return null;
  const payload = unpack(row.value);
  if (!payload) return null;
  if (payload.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return null;
  }
  return payload;
}

/** Peek without consuming — used by the continue page to decide UI state. */
export async function peekOnboardingDraft(
  email: string,
): Promise<OnboardingDraftPayload | null> {
  const identifier = identifierFor(email);
  const row = await db.verification.findFirst({
    where: { identifier },
  });
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return unpack(row.value);
}
