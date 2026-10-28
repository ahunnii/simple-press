/**
 * Registry of MATERIAL policy updates — the ones existing users must be told
 * about before they take effect.
 *
 * `~/lib/legal/policy-versions` tracks *that* a policy page changed. This file
 * tracks *which* changes matter. Most edits do not: a typo, a broken link, a
 * reworded sentence that changes nothing anyone agreed to. Existing
 * acceptances keep covering those. A material change (new fees, new grounds
 * for suspension, a new kind of data collected, a narrower refund rule …)
 * needs notice: we tell every affected owner ahead of time, and their
 * continued use after the effective date — or an explicit acknowledgement —
 * is what binds them to the new text.
 *
 * ## The ritual
 *
 * - **Non-material edit** (typo, formatting, clarification): bump the date in
 *   `POLICY_LAST_UPDATED` only. Do NOT add an entry here.
 * - **Material change**:
 *   1. Edit the policy page and bump its date in `POLICY_LAST_UPDATED`.
 *   2. Append an entry below. `announcedOn` is the day the new text goes live
 *      and owners are told (normally the same date as step 1);
 *      `effectiveOn` must be at least {@link MATERIAL_UPDATE_NOTICE_DAYS} days
 *      after it — the unit test enforces this.
 *   3. Send the notice email from the platform hub. `PolicyNotice` (one row
 *      per update id) keeps that send idempotent.
 *
 * Entries are append-only. Never edit or delete one that has shipped: its
 * `id` is the version stamped on every `PolicyAcceptance` notice-ack row for
 * it, and changing it orphans that evidence.
 *
 * Pure and dependency-free (safe to import from client components).
 */

/** The two acceptance bundles — see `PLATFORM_TERMS_VERSION` / `MERCHANT_TERMS_VERSION`. */
export type PolicyBundle = "merchant" | "platform";

export const POLICY_BUNDLES = [
  "merchant",
  "platform",
] as const satisfies readonly PolicyBundle[];

export type MaterialPolicyUpdate = {
  /**
   * Stable, unique, never reused — e.g. `"2027-01-merchant-fees"`. Stored as
   * `PolicyAcceptance.version` on notice-ack rows and as `PolicyNotice.updateId`.
   * Must NOT be a bare `YYYY-MM-DD` (that is what clickwrap rows store).
   */
  readonly id: string;
  /** Which acceptance bundles this update changes. Never empty. */
  readonly documents: readonly PolicyBundle[];
  /** ISO `YYYY-MM-DD` — when the new text went live and notice went out. */
  readonly announcedOn: string;
  /** ISO `YYYY-MM-DD` — ≥ `MATERIAL_UPDATE_NOTICE_DAYS` after `announcedOn`. */
  readonly effectiveOn: string;
  /** One or two plain-language sentences shown in the admin banner + email. */
  readonly summary: string;
};

/** Minimum notice period between `announcedOn` and `effectiveOn`. */
export const MATERIAL_UPDATE_NOTICE_DAYS = 30;

/**
 * Append-only. Oldest first is conventional but not required — the helpers
 * below never rely on array order.
 */
export const MATERIAL_POLICY_UPDATES: readonly MaterialPolicyUpdate[] = [];

/**
 * The calendar day the platform considers "today", as ISO `YYYY-MM-DD`.
 *
 * Evaluated in US Eastern time, not UTC: UTC midnight is 7–8pm Eastern the
 * evening BEFORE, so a UTC calendar would make every update effective a few
 * hours early for most owners. Erring late is the safe direction for a legal
 * effective date. `en-CA` formats as `YYYY-MM-DD`.
 */
export function policyToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * The newest update already announced as of `now` (`announcedOn <= today`),
 * optionally limited to updates that touch `bundle`. `null` when none.
 *
 * Plain string comparison on ISO dates, same as `latest()` in
 * `policy-versions.ts`. Ties on `announcedOn` resolve to the later `effectiveOn`,
 * then to the later array position, so the result is deterministic.
 */
export function latestMaterialUpdate(
  updates: readonly MaterialPolicyUpdate[],
  now: Date,
  bundle?: PolicyBundle,
): MaterialPolicyUpdate | null {
  const today = policyToday(now);
  let best: MaterialPolicyUpdate | null = null;
  for (const update of updates) {
    if (update.announcedOn > today) continue;
    if (bundle && !update.documents.includes(bundle)) continue;
    if (
      !best ||
      update.announcedOn > best.announcedOn ||
      (update.announcedOn === best.announcedOn &&
        update.effectiveOn >= best.effectiveOn)
    ) {
      best = update;
    }
  }
  return best;
}

/** True while the update has been announced but is not yet in effect. */
export function isPending(update: MaterialPolicyUpdate, now: Date): boolean {
  return update.effectiveOn > policyToday(now);
}

/** Look an update up by id (e.g. to validate `legal.acknowledgePolicyUpdate` input). */
export function findMaterialUpdate(
  updates: readonly MaterialPolicyUpdate[],
  id: string,
): MaterialPolicyUpdate | null {
  return updates.find((u) => u.id === id) ?? null;
}

/**
 * Does a clickwrap acceptance stamped with `acceptedVersion` (a
 * `*_TERMS_VERSION` ISO date) already cover `update`'s new text?
 *
 * True when the accepted version is on/after `announcedOn` — the person
 * ticked the box on the post-update text, so notifying them again is noise.
 * Relies on step 1 of the ritual (text + `POLICY_LAST_UPDATED` bumped no later
 * than `announcedOn`). `null` (nothing on file) never covers anything.
 */
export function clickwrapCoversUpdate(
  acceptedVersion: string | null | undefined,
  update: Pick<MaterialPolicyUpdate, "announcedOn">,
): boolean {
  if (!acceptedVersion) return false;
  return acceptedVersion >= update.announcedOn;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isoDayNumber(iso: string): number | null {
  if (!ISO_DATE.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const ms = Date.UTC(y, m - 1, d);
  const roundTrip = new Date(ms).toISOString().slice(0, 10);
  // Rejects impossible dates like 2026-02-30, which Date.UTC silently rolls.
  return roundTrip === iso ? ms / 86_400_000 : null;
}

/**
 * Registry sanity checks. Returns a list of human-readable problems (empty =
 * valid). Run against `MATERIAL_POLICY_UPDATES` in the unit tests so a
 * malformed entry fails CI rather than shipping.
 */
export function validateMaterialUpdates(
  updates: readonly MaterialPolicyUpdate[],
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const u of updates) {
    const label = u.id || "(empty id)";
    if (!u.id.trim()) problems.push(`${label}: id is empty`);
    // Clickwrap rows store a bare ISO date as their version; an id shaped the
    // same way would be indistinguishable from one in PolicyAcceptance.
    if (ISO_DATE.test(u.id)) {
      problems.push(`${label}: id must not be a bare YYYY-MM-DD date`);
    }
    if (seen.has(u.id)) problems.push(`${label}: duplicate id`);
    seen.add(u.id);

    if (u.documents.length === 0) problems.push(`${label}: documents is empty`);
    if (!u.summary.trim()) problems.push(`${label}: summary is empty`);

    const announced = isoDayNumber(u.announcedOn);
    const effective = isoDayNumber(u.effectiveOn);
    if (announced === null) {
      problems.push(
        `${label}: announcedOn "${u.announcedOn}" is not a valid YYYY-MM-DD date`,
      );
    }
    if (effective === null) {
      problems.push(
        `${label}: effectiveOn "${u.effectiveOn}" is not a valid YYYY-MM-DD date`,
      );
    }
    if (
      announced !== null &&
      effective !== null &&
      effective - announced < MATERIAL_UPDATE_NOTICE_DAYS
    ) {
      problems.push(
        `${label}: effectiveOn must be at least ${MATERIAL_UPDATE_NOTICE_DAYS} days after announcedOn`,
      );
    }
  }

  return problems;
}
