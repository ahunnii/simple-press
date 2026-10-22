import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { MaterialPolicyUpdate } from "~/lib/legal/material-updates";
import {
  clickwrapCoversUpdate,
  isPending,
  latestMaterialUpdate,
  MATERIAL_POLICY_UPDATES,
} from "~/lib/legal/material-updates";
import { hasAcknowledged } from "~/lib/legal/policy-acceptance.server";
import { db } from "~/server/db";

export type PolicyUpdateNoticeState = {
  update: MaterialPolicyUpdate;
  /** True until `effectiveOn`; false once the update is in force. */
  pending: boolean;
};

/**
 * Decide whether `/admin` should show the non-blocking "we're updating our
 * policies" banner, and for which update. `null` = show nothing.
 *
 * Shown only when ALL of these hold:
 *
 * 1. `membershipRole === "OWNER"` exactly. PLATFORM_ADMIN resolves to `null`
 *    and never matches (an acknowledgement from a platform admin browsing a
 *    tenant would fabricate a merchant's record); MANAGER and STAFF have no
 *    standing to acknowledge the owner's agreements.
 * 2. A material update has been announced (the newest one — an owner who
 *    skipped an older notice is covered by the newer one's text).
 * 3. At least one bundle the update touches is NOT already covered, where a
 *    bundle is covered by either:
 *    - a clickwrap acceptance stamped on/after `announcedOn` — they ticked the
 *      box on the new text already, so a notice would be noise. The merchant
 *      bundle reads `BusinessMembership.merchantTermsVersion` (passed in); the
 *      platform bundle reads `User.termsVersion` (one extra read, only when the
 *      update touches the platform bundle); or
 *    - a `PolicyAcceptance` row for this update id (a previous "Got it").
 *    Checked per bundle rather than through `hasAcknowledgedUpdate`, so an
 *    owner covered by clickwrap on one bundle and a "Got it" on the other is
 *    correctly done.
 *
 * FAILS OPEN on every unknown. The banner is informational and the evidence
 * lives in the email and the policy pages; an owner who cannot be asked
 * reliably (version column unreadable, log table missing, any throw) is shown
 * nothing rather than a banner whose "Got it" we could not record.
 */
export async function resolvePolicyUpdateNotice(input: {
  membershipRole: string | null;
  userId: string;
  businessId: string;
  /** `undefined` = column unreadable → show nothing when the merchant bundle is in play. */
  merchantTermsVersion: string | null | undefined;
  now?: Date;
  /** Injected by tests. */
  updates?: readonly MaterialPolicyUpdate[];
}): Promise<PolicyUpdateNoticeState | null> {
  if (input.membershipRole !== "OWNER") return null;

  try {
    const now = input.now ?? new Date();
    const update = latestMaterialUpdate(
      input.updates ?? MATERIAL_POLICY_UPDATES,
      now,
    );
    if (!update) return null;

    let userTermsVersion: string | null | undefined;
    if (update.documents.includes("platform")) {
      const user = await db.user.findUnique({
        where: { id: input.userId },
        select: { termsVersion: true },
      });
      userTermsVersion = user?.termsVersion ?? null;
    }

    let needsNotice = false;
    for (const bundle of update.documents) {
      const accepted =
        bundle === "merchant" ? input.merchantTermsVersion : userTermsVersion;
      if (accepted === undefined) return null; // unknown → fail open
      if (clickwrapCoversUpdate(accepted, update)) continue;

      const acknowledged = await hasAcknowledged({
        userId: input.userId,
        bundle,
        version: update.id,
        businessId: bundle === "merchant" ? input.businessId : undefined,
      });
      if (acknowledged === undefined) return null; // log unreadable → fail open
      if (!acknowledged) needsNotice = true;
    }

    return needsNotice ? { update, pending: isPending(update, now) } : null;
  } catch (error) {
    Sentry.captureException(error, { tags: { legal: "policy-update-notice" } });
    return null;
  }
}
