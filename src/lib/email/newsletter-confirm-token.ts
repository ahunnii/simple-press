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

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
    iat,
    exp: iat + TOKEN_TTL_MS,
  };
  return createSignedToken(payload, secret, NEWSLETTER_CONFIRM_CONTEXT);
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
