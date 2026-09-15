import "server-only";

import { createHash, createHmac, timingSafeEqual } from "crypto";

import { env } from "~/env";
import { db } from "~/server/db";

const DRAFT_PREFIX = "onboarding-draft:";
export const DRAFT_TTL_MS = 60 * 60 * 1000; // 1 hour — matches verification token expiry

/**
 * Cookie carrying the draft secret. The draft itself is written BEFORE signup
 * (a session is impossible there — `requireEmailVerification` blocks it), so
 * the only thing binding a draft to the person who created it is this
 * browser-held secret: without it, anyone who knows a victim's email could
 * plant a draft and dictate the store the victim ends up creating.
 */
export const ONBOARDING_DRAFT_COOKIE = "sp_onboarding_draft";

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

/**
 * What actually goes into `Verification.value`. The secret hash rides inside
 * the packed (HMAC-signed) blob so no schema change is needed — and so it is
 * covered by the same signature as the rest of the draft.
 */
type StoredOnboardingDraft = OnboardingDraftPayload & {
  /** sha256(draftSecret), hex. Absent on drafts written before browser binding. */
  draftSecretHash?: string;
};

export type SaveOnboardingDraftResult =
  /** Saved; `draftSecret` is what the caller must put in the cookie. */
  | { status: "saved"; draftSecret: string }
  /**
   * A live draft for this email already exists and the caller did not present
   * its secret. Maps to HTTP 409 — overwriting would let a stranger retarget
   * someone else's in-flight signup.
   */
  | { status: "conflict" };

function sign(value: string): string {
  return createHmac("sha256", env.SIMPLEPRESS_HASH_SECRET)
    .update(value)
    .digest("base64url");
}

function pack(payload: StoredOnboardingDraft): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${body}.${sign(body)}`;
}

function unpack(packed: string): StoredOnboardingDraft | null {
  const [body, signature] = packed.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as StoredOnboardingDraft;
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

/** The secret hash is server-side plumbing — it must never reach a client. */
function toPublicPayload(
  stored: StoredOnboardingDraft,
): OnboardingDraftPayload {
  const copy = { ...stored };
  delete copy.draftSecretHash;
  return copy;
}

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

function secretMatchesHash(
  secret: string | null | undefined,
  storedHash: string | undefined,
): boolean {
  if (!secret || !storedHash) return false;
  const presented = Buffer.from(hashSecret(secret), "hex");
  const expected = Buffer.from(storedHash, "hex");
  // A malformed stored hash decodes short — the length check rejects it.
  if (expected.length !== presented.length) return false;
  return timingSafeEqual(presented, expected);
}

function identifierFor(email: string): string {
  return `${DRAFT_PREFIX}${email.trim().toLowerCase()}`;
}

/**
 * Persist a signed onboarding draft keyed by email.
 * Survives the email-verification round-trip when requireEmailVerification
 * prevents an immediate session after signup.
 *
 * The draft is bound to the caller's browser via `options.draftSecret`: only a
 * request that presents the secret of a live draft (`options.presentedSecret`,
 * read from the `sp_onboarding_draft` cookie) may overwrite it, so restarting
 * signup in the same browser works while a third party who merely knows the
 * email cannot retarget the in-flight signup. Expired rows — and rows written
 * before browser binding existed, or corrupted rows whose signature no longer
 * verifies — are overwritten freely.
 *
 * Returns the secret that ends up bound to the stored draft: the presented one
 * on a same-browser overwrite (so the cookie stays valid), otherwise the fresh
 * `options.draftSecret`.
 */
export async function saveOnboardingDraft(
  payload: OnboardingDraftPayload,
  options: { draftSecret: string; presentedSecret?: string | null },
): Promise<SaveOnboardingDraftResult> {
  const email = payload.email.trim().toLowerCase();
  const identifier = identifierFor(email);

  const existing = await db.verification.findFirst({
    where: { identifier },
    select: { id: true, value: true, expiresAt: true },
  });

  let draftSecret = options.draftSecret;

  if (existing && existing.expiresAt.getTime() >= Date.now()) {
    const stored = unpack(existing.value);
    if (stored?.draftSecretHash) {
      if (!secretMatchesHash(options.presentedSecret, stored.draftSecretHash)) {
        return { status: "conflict" };
      }
      // Same browser restarting the wizard — keep the secret already in its
      // cookie so the re-set below is a no-op refresh rather than a rotation.
      draftSecret = options.presentedSecret!;
    }
  }

  const expiresAt = new Date(Date.now() + DRAFT_TTL_MS);
  const value = pack({
    ...payload,
    email,
    acceptedTerms: true,
    draftSecretHash: hashSecret(draftSecret),
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

  return { status: "saved", draftSecret };
}

/**
 * Load and consume an onboarding draft for the given email.
 *
 * `draftSecret` is the `sp_onboarding_draft` cookie value. Returns null when
 * missing, expired, tampered, or when the secret does not match the one bound
 * at save time. A secret mismatch deliberately does NOT delete the row: the
 * legitimate owner may simply be in a different browser, and onboarding treats
 * a null draft as "nothing to resume" (the user re-enters their details).
 */
export async function consumeOnboardingDraft(
  email: string,
  draftSecret: string | null | undefined,
): Promise<OnboardingDraftPayload | null> {
  const identifier = identifierFor(email);
  const row = await db.verification.findFirst({
    where: { identifier },
  });
  if (!row) return null;

  const expired = row.expiresAt.getTime() < Date.now();
  const payload = expired ? null : unpack(row.value);

  // An expired or unverifiable row can never be consumed by anyone — drop it.
  if (!payload) {
    await db.verification
      .delete({ where: { id: row.id } })
      .catch(() => undefined);
    return null;
  }

  // Not this browser's draft (or a pre-binding draft that nothing can prove
  // ownership of) — leave the row alone and behave as if there were no draft.
  if (!secretMatchesHash(draftSecret, payload.draftSecretHash)) return null;

  if (payload.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return null;
  }

  // Verified — the draft is single-use.
  await db.verification
    .delete({ where: { id: row.id } })
    .catch(() => undefined);

  return toPublicPayload(payload);
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
  const stored = unpack(row.value);
  return stored ? toPublicPayload(stored) : null;
}
