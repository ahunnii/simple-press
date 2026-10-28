import type { Prisma } from "generated/prisma";

import type { Audience } from "./segments";
import type { TxClient } from "~/server/db";

import { hashEmailForDoNotEmail } from "./do-not-email";
import { audienceSegmentWhere } from "./segments";

/**
 * The single definition of "who can receive a marketing campaign": opted in,
 * not anonymized, not suppressed (hard bounce / complaint / provider
 * suppression), and with a usable email address.
 *
 * Every audience count, export and snapshot taken at queue time must use this
 * so the number an owner sees is the number we send to. `marketingUnsubscribedAt`
 * is deliberately NOT a predicate: an unsubscribe clears `acceptsMarketing`,
 * so it is already excluded by the opt-in check.
 *
 * `audience` optionally narrows this to a campaign segment
 * (`./segments.ts`); it is ANDed on, so a segment can only shrink the list.
 * Omitted (or "all") returns the plain consent filter.
 */
export function marketingAudienceWhere(
  businessId: string,
  audience?: Audience,
  now?: Date,
): Prisma.CustomerWhereInput {
  const base: Prisma.CustomerWhereInput = {
    businessId,
    acceptsMarketing: true,
    anonymizedAt: null,
    marketingSuppressedAt: null,
    NOT: { email: "" },
  };
  if (!audience) return base;
  const segment = audienceSegmentWhere(audience, now);
  return Object.keys(segment).length > 0 ? { ...base, AND: [segment] } : base;
}

/**
 * The single definition of who a contact import's one-time re-permission
 * invite (`MarketingCampaign.kind = "REPERMISSION"`) may go to: customers that
 * import CREATED (`importId`) and the old site marked subscribed
 * (`importStatus`), still not opted in, not anonymized, not
 * suppressed, never unsubscribed, and with a usable email address.
 *
 * Used by the invite's audience preview, the queue-time snapshot and the
 * worker's per-batch re-check, like `marketingAudienceWhere` for standard
 * campaigns. Segments never apply to an invite.
 *
 * NOT the whole rule: the store's do-not-email list is keyed by a hash of the
 * address, which a Prisma `where` can't express. Every caller must also drop
 * listed addresses with `withoutDoNotEmail` (in the same transaction as the
 * read where it matters).
 *
 * Unlike `marketingAudienceWhere`, `marketingUnsubscribedAt` IS a predicate:
 * here everyone has `acceptsMarketing: false`, so an unsubscribe (including
 * one from this very invite, or one carried over from the old site) is only
 * visible through that stamp.
 */
export function repermissionAudienceWhere(
  businessId: string,
  importId: string,
): Prisma.CustomerWhereInput {
  return {
    businessId,
    importId,
    // What the old site said. "unknown" rows are imported but never invited:
    // a consent request is itself a commercial message (CASL / GDPR).
    importStatus: "subscribed",
    acceptsMarketing: false,
    anonymizedAt: null,
    marketingSuppressedAt: null,
    marketingUnsubscribedAt: null,
    NOT: { email: "" },
  };
}

/** Hashes per `IN (...)` lookup against the do-not-email list. */
const DO_NOT_EMAIL_LOOKUP_CHUNK = 1000;

/**
 * `rows` minus every address on the store's do-not-email list (any reason),
 * order preserved. The batch form of `isOnDoNotEmailList`: one indexed
 * `IN (...)` query per 1,000 addresses on the `[businessId, emailHash]` key.
 */
export async function withoutDoNotEmail<T extends { email: string }>(
  db: TxClient,
  businessId: string,
  rows: T[],
): Promise<T[]> {
  if (rows.length === 0) return rows;
  const hashes = rows.map((r) => hashEmailForDoNotEmail(r.email));
  const listed = new Set<string>();
  for (let i = 0; i < hashes.length; i += DO_NOT_EMAIL_LOOKUP_CHUNK) {
    const found = await db.marketingDoNotEmail.findMany({
      where: {
        businessId,
        emailHash: { in: hashes.slice(i, i + DO_NOT_EMAIL_LOOKUP_CHUNK) },
      },
      select: { emailHash: true },
    });
    for (const f of found) listed.add(f.emailHash);
  }
  if (listed.size === 0) return rows;
  return rows.filter((_, i) => !listed.has(hashes[i]!));
}
