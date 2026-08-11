import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { AcceptanceState } from "~/lib/legal/owner-terms-gate";
import { shouldPromptOwnerTerms } from "~/lib/legal/owner-terms-gate";
import { db } from "~/server/db";

export type OwnerTermsGateState = {
  /**
   * Whether the acceptance checkbox should also cover the platform Terms of
   * Service + Privacy Policy — true when `User.termsAcceptedAt` is null, the
   * same rule `/platform/claim/[code]` uses. Most pre-existing owners need both
   * bundles, since neither column was backfilled.
   */
  includePlatformTerms: boolean;
};

/**
 * Decide whether `/admin` should show the retroactive acceptance interstitial,
 * and in which shape.
 *
 * Returns `null` for "let them through". Everything here is wrapped so that a
 * failure means *no gate*: this screen exists to collect a signature, and the
 * worst possible outcome is an owner who cannot reach their orders because a
 * consent lookup threw. A missed prompt costs one login's worth of delay; a
 * false block costs them their store.
 */
export async function resolveOwnerTermsGate(input: {
  membershipRole: string | null;
  merchantTermsAcceptedAt: AcceptanceState;
  userId: string;
}): Promise<OwnerTermsGateState | null> {
  if (
    !shouldPromptOwnerTerms({
      membershipRole: input.membershipRole,
      merchantTermsAcceptedAt: input.merchantTermsAcceptedAt,
    })
  ) {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { termsAcceptedAt: true },
    });
    return { includePlatformTerms: !user?.termsAcceptedAt };
  } catch (error) {
    // Same reasoning as the fallback in `~/lib/check-business`: the terms
    // columns can exist in schema.prisma before they exist in the database. If
    // we cannot read the account-level acceptance we cannot record one either,
    // so fail open rather than showing a screen whose answer we can't store.
    Sentry.captureException(error, { tags: { gate: "owner-terms" } });
    return null;
  }
}
