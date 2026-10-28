import { clickwrapCoversUpdate } from "./material-updates";
import { MERCHANT_TERMS_VERSION } from "./policy-versions";

/**
 * Resolved merchant-terms acceptance status for a business, derived from its
 * OWNER memberships only (never MANAGER/STAFF — the Seller & Merchant
 * Agreement is the owner's to sign). Three states, because they carry
 * different meaning for a platform admin:
 *
 * - `"none"` — no OWNER membership has ever accepted. The actionable one:
 *   this business currently has no signed agreement on file at all.
 * - `"current"` — at least one OWNER accepted the version in force right now
 *   (`MERCHANT_TERMS_VERSION`), OR accepted on/after the latest announced
 *   material merchant update (`clickwrapCoversUpdate` — typo-only "Last
 *   Updated" bumps after that no longer make an owner "outdated"), OR has a
 *   `PolicyAcceptance` log row covering the current terms: a notice-ack of
 *   the latest material merchant update, or a clickwrap at the current
 *   version. `via` says which. With no material merchant update announced,
 *   only the exact-version rule applies (plus log rows).
 * - `"outdated"` — at least one OWNER accepted at some point, but not the
 *   current version / the latest material update, and has not acknowledged it.
 *
 * A business can have more than one OWNER. If any of them is current, that's
 * the status reported — one signed, current agreement is enough to cover the
 * store. Otherwise the most recent acceptance (necessarily a stale version)
 * is reported.
 */
export type MerchantTermsStatus =
  | { state: "none" }
  | {
      state: "current";
      acceptedAt: Date;
      /** The terms version, or the material update id for a notice-ack. */
      version: string;
      /** `"column"` = `BusinessMembership` stamp; `"log"` = `PolicyAcceptance` row. */
      via: "column" | "log";
    }
  | { state: "outdated"; acceptedAt: Date; version: string | null };

type OwnerAcceptance = {
  /** Needed only to match log rows to owners; omit when passing no log. */
  userId?: string;
  merchantTermsAcceptedAt: Date | null;
  merchantTermsVersion: string | null;
};

/** A merchant-bundle `PolicyAcceptance` row for this business. */
export type MerchantPolicyLogRow = {
  userId: string;
  version: string;
  acceptedAt: Date;
};

export type MerchantPolicyLog = {
  /**
   * `latestMaterialUpdate(MATERIAL_POLICY_UPDATES, now, "merchant")?.id`, or
   * null when no material merchant update has been announced.
   */
  latestUpdateId: string | null;
  /**
   * `announcedOn` of that same update, or null. An owner whose column version
   * is on/after it clickwrapped the post-update text and counts as current.
   */
  latestUpdateAnnouncedOn: string | null;
  /** Merchant-bundle rows for this business (any method). */
  rows: readonly MerchantPolicyLogRow[];
};

export function getMerchantTermsStatus(
  ownerMemberships: OwnerAcceptance[],
  /**
   * Optional. Omitted (or undefined because the log table could not be read)
   * → column-only status, exactly the pre-log behavior.
   */
  log?: MerchantPolicyLog,
): MerchantTermsStatus {
  const accepted = ownerMemberships.filter(
    (m): m is OwnerAcceptance & { merchantTermsAcceptedAt: Date } =>
      m.merchantTermsAcceptedAt !== null,
  );

  if (accepted.length === 0) {
    // A log row alone never upgrades "none": acknowledging an update is
    // continued assent to an agreement already on file, not a first signature.
    return { state: "none" };
  }

  const current = accepted.find(
    (m) => m.merchantTermsVersion === MERCHANT_TERMS_VERSION,
  );
  if (current) {
    return {
      state: "current",
      acceptedAt: current.merchantTermsAcceptedAt,
      version: MERCHANT_TERMS_VERSION,
      via: "column",
    };
  }

  // A column version on/after the latest material update's announcement means
  // they ticked the box on the new text; later non-material edits to the
  // pages (which only bump `MERCHANT_TERMS_VERSION`) do not invalidate that.
  if (log?.latestUpdateAnnouncedOn) {
    const announcedOn = log.latestUpdateAnnouncedOn;
    const covering = accepted
      .filter((m) =>
        clickwrapCoversUpdate(m.merchantTermsVersion, { announcedOn }),
      )
      .reduce<
        (typeof accepted)[number] | null
      >((latest, m) => (!latest || m.merchantTermsAcceptedAt > latest.merchantTermsAcceptedAt ? m : latest), null);
    if (covering?.merchantTermsVersion) {
      return {
        state: "current",
        acceptedAt: covering.merchantTermsAcceptedAt,
        version: covering.merchantTermsVersion,
        via: "column",
      };
    }
  }

  if (log) {
    // Only owners who have a first acceptance on file can carry it forward.
    const ownersOnFile = new Set(
      accepted.flatMap((m) => (m.userId ? [m.userId] : [])),
    );
    const covering = log.rows
      .filter(
        (row) =>
          ownersOnFile.has(row.userId) &&
          (row.version === MERCHANT_TERMS_VERSION ||
            (log.latestUpdateId !== null &&
              row.version === log.latestUpdateId)),
      )
      .reduce<MerchantPolicyLogRow | null>(
        (latest, row) =>
          !latest || row.acceptedAt > latest.acceptedAt ? row : latest,
        null,
      );
    if (covering) {
      return {
        state: "current",
        acceptedAt: covering.acceptedAt,
        version: covering.version,
        via: "log",
      };
    }
  }

  const mostRecent = accepted.reduce((latest, m) =>
    m.merchantTermsAcceptedAt > latest.merchantTermsAcceptedAt ? m : latest,
  );
  return {
    state: "outdated",
    acceptedAt: mostRecent.merchantTermsAcceptedAt,
    version: mostRecent.merchantTermsVersion,
  };
}
