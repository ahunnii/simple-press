import { z } from "zod";

import { env } from "~/env";

import { createSignedToken, readSignedToken } from "./signed-token";

/**
 * Newsletter double-opt-in confirmation token: stateless, carried in the
 * confirmation email link. No DB row exists until the person clicks it, so
 * everything needed to create the subscriber lives in the signed payload.
 *
 * Signed under its own `nl-confirm:v1` context (see `./signed-token.ts`), so it
 * can never verify as an unsubscribe token — or any other token signed with
 * SIMPLEPRESS_HASH_SECRET — and vice versa.
 */
const NEWSLETTER_CONFIRM_CONTEXT = "nl-confirm:v1";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Default lifetime: the sign-up form's confirmation email. */
const TOKEN_TTL_MS = 7 * DAY_MS;

/**
 * Lifetime of the confirm link in a contact import's one-time re-permission
 * invite (`s: "imp"`): a cold list reads its mail slowly, and there is no
 * reminder to catch latecomers.
 */
export const IMPORT_INVITE_TOKEN_TTL_MS = 30 * DAY_MS;

const newsletterConfirmPayloadSchema = z
  .object({
    k: z.literal("nlc"),
    /** Business id. */
    b: z.string().min(1),
    /** Email, lowercased + trimmed at mint time. */
    e: z.string().email().max(254),
    /** First name. */
    f: z.string().min(1).optional(),
    /** Last name. */
    l: z.string().min(1).optional(),
    /**
     * Where the link was sent from. Absent = the sign-up form (the person
     * asked for it). `"imp"` = a contact import's re-permission invite, which
     * the person did NOT ask for: `newsletter.confirm` records it as
     * IMPORT_CONFIRM and refuses to lift any suppression or do-not-email
     * entry with it.
     */
    s: z.literal("imp").optional(),
    /** Issued at (ms). */
    iat: z.number(),
    /** Expires at (ms). */
    exp: z.number(),
  })
  .strict();

export type NewsletterConfirmPayload = z.infer<
  typeof newsletterConfirmPayloadSchema
>;

export type NewsletterConfirmVerification =
  | { ok: true; payload: NewsletterConfirmPayload }
  | { ok: false; reason: "invalid" | "expired" };

export function createNewsletterConfirmToken(
  input: {
    businessId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    /** `"imp"` for a contact import's re-permission invite (see the schema). */
    source?: "imp";
    /** Lifetime in ms; defaults to 7 days. */
    ttlMs?: number;
    /**
     * Issue time. Fixed by callers that must mint the same token twice (the
     * campaign worker passes `queuedAt`, so a retried batch is byte-identical).
     */
    now?: Date;
  },
  secret: string = env.SIMPLEPRESS_HASH_SECRET,
): string {
  const iat = input.now?.getTime() ?? Date.now();
  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  const payload: NewsletterConfirmPayload = {
    k: "nlc",
    b: input.businessId,
    e: input.email.trim().toLowerCase(),
    ...(firstName ? { f: firstName } : {}),
    ...(lastName ? { l: lastName } : {}),
    ...(input.source ? { s: input.source } : {}),
    iat,
    exp: iat + (input.ttlMs ?? TOKEN_TTL_MS),
  };
  return createSignedToken(payload, secret, NEWSLETTER_CONFIRM_CONTEXT);
}

/**
 * The /email-preferences confirm page for a token — the one URL shape both the
 * sign-up form's email and the re-permission invite link to.
 */
export function buildNewsletterConfirmUrl(
  baseUrl: string,
  token: string,
): string {
  return `${baseUrl}/email-preferences?view=confirm&t=${encodeURIComponent(token)}`;
}

/**
 * Verify a confirmation token — never throws. `expired` is only returned for a
 * token whose signature AND shape check out, so a forged token can't learn
 * anything by probing for the difference.
 */
export function verifyNewsletterConfirmToken(
  token: string,
  now: Date = new Date(),
  secret: string = env.SIMPLEPRESS_HASH_SECRET,
): NewsletterConfirmVerification {
  const invalid = { ok: false, reason: "invalid" } as const;

  const raw = readSignedToken(token, secret, NEWSLETTER_CONFIRM_CONTEXT);
  if (raw === null) return invalid;

  const parsed = newsletterConfirmPayloadSchema.safeParse(raw);
  if (!parsed.success) return invalid;

  if (now.getTime() > parsed.data.exp) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload: parsed.data };
}
