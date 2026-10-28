import "server-only";

import * as Sentry from "@sentry/nextjs";

import type {
  MaterialPolicyUpdate,
  PolicyBundle,
} from "~/lib/legal/material-updates";
import { db } from "~/server/db";

/**
 * The append-only `PolicyAcceptance` evidence log.
 *
 * The first-acceptance columns (`User.termsAcceptedAt` /
 * `BusinessMembership.merchantTermsAcceptedAt`) stay exactly as they are —
 * written once, never overwritten. This log is written ALONGSIDE them on every
 * clickwrap, and is the only record of later events (acknowledgements of
 * material updates, see `~/lib/legal/material-updates`).
 *
 * Everything here FAILS OPEN. The table can exist in schema.prisma before it
 * exists in a database (`prisma/manual/2026-10-21-policy-acceptance-log.sql`
 * is hand-applied), and a missing log row must never cost someone their
 * signup, claim, store creation or acceptance — those already wrote their
 * real evidence to the columns. Same reasoning as the fallback in
 * `~/lib/check-business`.
 */

export type PolicyAcceptanceMethod = "clickwrap" | "notice-ack";

export type PolicyAcceptanceEntry = {
  userId: string;
  /** Required for the merchant bundle (accepted per store); null/omitted for account-level platform clickwrap. */
  businessId?: string | null;
  bundle: PolicyBundle;
  /** clickwrap → the `*_TERMS_VERSION` in force; notice-ack → `MaterialPolicyUpdate.id`. */
  version: string;
  method: PolicyAcceptanceMethod;
  /**
   * Server clock only — pass the SAME instant written to the column so the two
   * records agree. Defaults to now. Never from the request.
   */
  acceptedAt?: Date;
};

/**
 * Best-effort append of one or more log rows. Never throws.
 *
 * Returns `true` when written, `false` when the write failed (already reported
 * to Sentry). Call it AFTER the surrounding transaction commits, never inside
 * one: a failed INSERT inside a Postgres transaction aborts the whole
 * transaction, which would take the real acceptance down with it.
 */
export async function recordPolicyAcceptance(
  entries: PolicyAcceptanceEntry | readonly PolicyAcceptanceEntry[],
): Promise<boolean> {
  const rows = (
    Array.isArray(entries) ? entries : [entries]
  ) as readonly PolicyAcceptanceEntry[];
  if (rows.length === 0) return true;

  try {
    await db.policyAcceptance.createMany({
      data: rows.map((row) => ({
        userId: row.userId,
        businessId: row.businessId ?? null,
        bundle: row.bundle,
        version: row.version,
        method: row.method,
        acceptedAt: row.acceptedAt ?? new Date(),
      })),
    });
    return true;
  } catch (error) {
    // Typically P2021 (table does not exist yet). Report and move on.
    Sentry.captureException(error, {
      tags: { legal: "policy-acceptance-log" },
      extra: {
        rows: rows.map((r) => ({
          userId: r.userId,
          businessId: r.businessId ?? null,
          bundle: r.bundle,
          version: r.version,
          method: r.method,
        })),
      },
    });
    return false;
  }
}

/**
 * Has `userId` a log row (clickwrap OR notice-ack) for `bundle` at `version`?
 *
 * - `true` / `false` — answered from the log.
 * - `undefined` — could not read (table missing, DB error). Callers must treat
 *   this as "don't prompt": a notice we cannot record the answer to is worse
 *   than one shown a login late.
 *
 * Pass `businessId` for the merchant bundle — the Seller & Merchant Agreement
 * is per store, so an acknowledgement given in store A does not cover store B.
 * Omit it for the platform bundle, which attaches to the account.
 */
export async function hasAcknowledged(input: {
  userId: string;
  bundle: PolicyBundle;
  version: string;
  businessId?: string;
}): Promise<boolean | undefined> {
  try {
    const row = await db.policyAcceptance.findFirst({
      where: {
        userId: input.userId,
        bundle: input.bundle,
        version: input.version,
        ...(input.businessId ? { businessId: input.businessId } : {}),
      },
      select: { id: true },
    });
    return row !== null;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { legal: "policy-acceptance-log" },
    });
    return undefined;
  }
}

/**
 * Has `userId` acknowledged EVERY bundle `update` touches? Merchant bundle
 * checks are scoped to `businessId`; platform bundle checks are account-wide.
 *
 * `undefined` if any lookup could not be answered (fail open — see
 * `hasAcknowledged`).
 */
export async function hasAcknowledgedUpdate(input: {
  userId: string;
  businessId: string;
  update: MaterialPolicyUpdate;
}): Promise<boolean | undefined> {
  const results = await Promise.all(
    input.update.documents.map((bundle) =>
      hasAcknowledged({
        userId: input.userId,
        bundle,
        version: input.update.id,
        businessId: bundle === "merchant" ? input.businessId : undefined,
      }),
    ),
  );
  if (results.some((r) => r === undefined)) return undefined;
  return results.every((r) => r === true);
}
