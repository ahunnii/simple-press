import { createHmac } from "crypto";

import type { TxClient } from "~/server/db";
import { env } from "~/env";
import { normalizeEmail } from "~/lib/utils";

/**
 * Per-store do-not-email list (`MarketingDoNotEmail`). Keyed by a keyed hash of
 * the normalized address — never the address — so an unsubscribe, bounce or
 * complaint outlives the Customer row (erasure, re-import, a fresh checkout
 * re-creating the customer) without the list itself holding PII.
 *
 * HASH. HMAC-SHA256 with SIMPLEPRESS_HASH_SECRET over `dne:v1:<email>`, hex.
 * That is the same context-prefix domain separation as
 * `~/lib/email/signed-token.ts`: every other MAC under this secret is either
 * over a bare base64url payload (no ":") or prefixed with a different context
 * (`unsub:v1`, `nl-confirm:v1`, `pending_session:v1`, ...), so these hashes
 * can never equal — or be replayed as — any token signature. Rotating
 * SIMPLEPRESS_HASH_SECRET orphans
 * every row here (lookups silently stop matching); re-hashing is impossible
 * without the addresses, so treat the secret as permanent.
 */

const DO_NOT_EMAIL_CONTEXT = "dne:v1";

export const DO_NOT_EMAIL_REASONS = [
  "UNSUBSCRIBED",
  "HARD_BOUNCE",
  "COMPLAINT",
  "PROVIDER_SUPPRESSED",
] as const;

export type DoNotEmailReason = (typeof DO_NOT_EMAIL_REASONS)[number];

/**
 * Strength of each reason. A row is never downgraded: an UNSUBSCRIBED arriving
 * after a COMPLAINT keeps COMPLAINT, so a caller that may only lift weaker
 * blocks (e.g. a resubscribe link may undo an unsubscribe but never a
 * complaint) still sees the strongest reason on record.
 */
const REASON_RANK: Record<DoNotEmailReason, number> = {
  UNSUBSCRIBED: 1,
  PROVIDER_SUPPRESSED: 2,
  HARD_BOUNCE: 2,
  COMPLAINT: 3,
};

/** Hex HMAC of the normalized address under the `dne:v1` context. */
export function hashEmailForDoNotEmail(
  email: string,
  secret: string = env.SIMPLEPRESS_HASH_SECRET,
): string {
  return createHmac("sha256", secret)
    .update(`${DO_NOT_EMAIL_CONTEXT}:${normalizeEmail(email)}`)
    .digest("hex");
}

/**
 * Put an address on the store's list. Idempotent: re-adding is a no-op unless
 * the new reason is stronger than the stored one, in which case the stored
 * reason is raised (see `REASON_RANK`). Returns the reason now on record.
 */
export async function addToDoNotEmail(
  tx: TxClient,
  businessId: string,
  email: string,
  reason: DoNotEmailReason,
): Promise<{ reason: DoNotEmailReason }> {
  const emailHash = hashEmailForDoNotEmail(email);
  const row = await tx.marketingDoNotEmail.upsert({
    where: { businessId_emailHash: { businessId, emailHash } },
    create: { businessId, emailHash, reason },
    update: {},
    select: { reason: true },
  });

  const weaker = DO_NOT_EMAIL_REASONS.filter(
    (r) => REASON_RANK[r] < REASON_RANK[reason],
  );
  if (!weaker.includes(row.reason as DoNotEmailReason)) {
    return { reason: row.reason as DoNotEmailReason };
  }
  // Conditional so a concurrent stronger write is never overwritten.
  await tx.marketingDoNotEmail.updateMany({
    where: { businessId, emailHash, reason: { in: [...weaker] } },
    data: { reason },
  });
  return { reason };
}

/** The stored reason when the address is on the store's list, else null. */
export async function isOnDoNotEmailList(
  db: TxClient,
  businessId: string,
  email: string,
): Promise<{ reason: DoNotEmailReason } | null> {
  const row = await db.marketingDoNotEmail.findUnique({
    where: {
      businessId_emailHash: {
        businessId,
        emailHash: hashEmailForDoNotEmail(email),
      },
    },
    select: { reason: true },
  });
  return row ? { reason: row.reason as DoNotEmailReason } : null;
}

/**
 * Take an address off the store's list. With `onlyReasons`, removes it only
 * when the stored reason is one of them (e.g. a resubscribe link passes
 * `["UNSUBSCRIBED"]` so it can never lift a bounce or complaint). Returns
 * whether a row was removed.
 */
export async function removeFromDoNotEmail(
  tx: TxClient,
  businessId: string,
  email: string,
  opts: { onlyReasons?: readonly DoNotEmailReason[] } = {},
): Promise<boolean> {
  const { count } = await tx.marketingDoNotEmail.deleteMany({
    where: {
      businessId,
      emailHash: hashEmailForDoNotEmail(email),
      ...(opts.onlyReasons ? { reason: { in: [...opts.onlyReasons] } } : {}),
    },
  });
  return count > 0;
}

/**
 * Batch form of `addToDoNotEmail` for list imports: one `createMany` (existing
 * rows are skipped, so nothing is ever downgraded) plus one conditional raise
 * per weaker stored reason. Same end state as calling `addToDoNotEmail` per
 * address, in a handful of queries instead of thousands.
 */
export async function addManyToDoNotEmail(
  tx: TxClient,
  businessId: string,
  emails: readonly string[],
  reason: DoNotEmailReason,
): Promise<void> {
  const hashes = [...new Set(emails.map((e) => hashEmailForDoNotEmail(e)))];
  const weaker = DO_NOT_EMAIL_REASONS.filter(
    (r) => REASON_RANK[r] < REASON_RANK[reason],
  );
  for (let i = 0; i < hashes.length; i += 1000) {
    const chunk = hashes.slice(i, i + 1000);
    await tx.marketingDoNotEmail.createMany({
      data: chunk.map((emailHash) => ({ businessId, emailHash, reason })),
      skipDuplicates: true,
    });
    if (weaker.length > 0) {
      await tx.marketingDoNotEmail.updateMany({
        where: {
          businessId,
          emailHash: { in: chunk },
          reason: { in: [...weaker] },
        },
        data: { reason },
      });
    }
  }
}

/**
 * Which of these addresses are on the store's list, in one query per 1,000.
 * Keys of the returned map are `normalizeEmail(email)`.
 */
export async function findDoNotEmailed(
  db: TxClient,
  businessId: string,
  emails: readonly string[],
): Promise<Map<string, DoNotEmailReason>> {
  const byHash = new Map<string, string>();
  for (const email of emails) {
    byHash.set(hashEmailForDoNotEmail(email), normalizeEmail(email));
  }
  const hashes = [...byHash.keys()];
  const found = new Map<string, DoNotEmailReason>();
  for (let i = 0; i < hashes.length; i += 1000) {
    const rows = await db.marketingDoNotEmail.findMany({
      where: { businessId, emailHash: { in: hashes.slice(i, i + 1000) } },
      select: { emailHash: true, reason: true },
    });
    for (const row of rows) {
      const email = byHash.get(row.emailHash);
      if (email) found.set(email, row.reason as DoNotEmailReason);
    }
  }
  return found;
}
