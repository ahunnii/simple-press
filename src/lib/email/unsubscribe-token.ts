import { z } from "zod";

import { env } from "~/env";

import { createSignedToken, readSignedToken } from "./signed-token";

/**
 * Signature context for unsubscribe tokens (see `./signed-token.ts` for the
 * domain-separation scheme).
 */
const UNSUBSCRIBE_CONTEXT = "unsub:v1";

/**
 * The decoded payload, shape-checked. `.strict()` + non-empty ids are the
 * security boundary: the legacy (pre-context) format shares its MAC with
 * invoice / order-status / subscription tokens, and before this check a pasted
 * invoice token decoded to `{customerId: undefined, businessId: undefined}` —
 * which Prisma drops from a `where`, opting out every customer on the platform.
 */
const unsubscribePayloadSchema = z
  .object({
    customerId: z.string().min(1),
    businessId: z.string().min(1),
    /** Campaign-recipient id, for per-campaign unsubscribe attribution. */
    r: z.string().min(1).optional(),
  })
  .strict();

export type UnsubscribePayload = z.infer<typeof unsubscribePayloadSchema>;

/**
 * Create a permanent (no expiry) HMAC-signed unsubscribe token.
 * Format: <base64url-payload>.<base64url-sig>, signed under the `unsub:v1`
 * context. `r` is included only when provided.
 */
export function createUnsubscribeToken(
  { customerId, businessId, r }: UnsubscribePayload,
  secret: string = env.SIMPLEPRESS_HASH_SECRET,
): string {
  const payload: UnsubscribePayload = r
    ? { customerId, businessId, r }
    : { customerId, businessId };
  return createSignedToken(payload, secret, UNSUBSCRIBE_CONTEXT);
}

/**
 * Verify and decode an unsubscribe token. Returns the payload if valid, or
 * null if tampered/malformed/wrong shape. Never throws.
 *
 * Tries the current `unsub:v1` scheme first, then the legacy bare-payload
 * scheme so links in emails sent before domain separation keep working. The
 * shape check applies to both, which is what makes the legacy fallback safe.
 */
export function verifyUnsubscribeToken(
  token: string,
  secret: string = env.SIMPLEPRESS_HASH_SECRET,
): UnsubscribePayload | null {
  for (const context of [UNSUBSCRIBE_CONTEXT, null]) {
    const raw = readSignedToken(token, secret, context);
    if (raw === null) continue;
    const parsed = unsubscribePayloadSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  }
  return null;
}

/**
 * The public unsubscribe page for a recipient: `<baseUrl>/api/unsubscribe?t=…`.
 * `baseUrl` is the business's storefront origin (`getBusinessUrl`). The token
 * has no timestamp, so the same inputs always yield the same URL — retries of
 * an idempotent send rebuild identical bytes.
 */
export function buildUnsubscribeUrl(
  baseUrl: string,
  payload: UnsubscribePayload,
): string {
  const token = createUnsubscribeToken(payload);
  return `${baseUrl}/api/unsubscribe?t=${encodeURIComponent(token)}`;
}

/** RFC 8058 one-click unsubscribe headers (handled by /api/unsubscribe POST). */
export function oneClickUnsubscribeHeaders(
  unsubscribeUrl: string,
): Record<"List-Unsubscribe" | "List-Unsubscribe-Post", string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
