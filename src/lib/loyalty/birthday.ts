/**
 * Loyalty Rewards — birthday bonuses: the date math, and the cron sweep that
 * spends it.
 *
 * The top half is pure (`isLeapYear`, `birthdayTargets`, `isValidBirthday`) and
 * is also imported by `birthdaySchema` in `src/lib/validators/loyalty.ts` and
 * the account "save your birthday" form. `zonedCalendarDate` (from
 * `~/lib/calendar-date`) is the one place it crosses into `Intl`, and it
 * already falls back to UTC on a bad time zone string, so nothing here can
 * throw on malformed `Business.timeZone`.
 *
 * The bottom half (`awardBirthdayPoints`) is the server sweep. It takes its
 * `DbClient` as a parameter and never imports the `~/server/db` singleton, so
 * the pure unit test beside this file keeps testing pure functions.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * STEADY-STATE COST
 * ────────────────────────────────────────────────────────────────────────────
 * The platform cron ticks every ~15 minutes and every tenant shares it, so the
 * first thing the sweep does is one narrow SELECT over `LoyaltyProgram`
 * (`birthdayEnabled: true, birthdayBonus > 0`) — a table with at most one row
 * per business, and that filter excludes every business that hasn't configured
 * a birthday rule. No rows means no customer query, no flag resolution, no
 * email: the run returns 0 immediately. That is the path virtually every tick
 * takes. A business that HAS a rule costs one extra indexed customer query
 * (`@@index([businessId, birthMonth, birthDay])`), which on any given day
 * returns zero rows for most stores.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * IDEMPOTENCY
 * ────────────────────────────────────────────────────────────────────────────
 * This job runs ~96 times on the customer's birthday, not once. What makes
 * that safe is the ledger's `@@unique([businessId, sourceKey])`: every award
 * uses `birthday:<customerId>:<year>`, so the first tick of the day writes the
 * row and all 95 others collapse onto the constraint and return
 * `{ awarded: false, reason: "duplicate" }` — a silent, expected no-op that is
 * deliberately never reported. Nothing here tracks "already ran today"; the
 * key IS the tracking, which is why it must stay derived from the customer id
 * and the calendar year and nothing else.
 *
 * The email is sent only on the tick that actually won the constraint, and
 * Resend's own idempotency key (`loyalty-birthday-<customerId>-<year>`, set
 * inside `sendLoyaltyBirthdayEmail`) is the second line of defence for a
 * redelivery. `sendEmail` never throws and its result is deliberately NOT
 * branched on: the ledger row is already committed, and a lost birthday email
 * must never claw back points the customer has been told they have. The Resend
 * failure is reported from inside `sendEmail` (tagged `service: resend`,
 * `email.type: loyalty_birthday`).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ISOLATION
 * ────────────────────────────────────────────────────────────────────────────
 * Each business is swept inside its own try/catch — one tenant's DB error or
 * malformed row must never stop the remaining tenants in the same tick from
 * being swept. A business whose `loyalty` flag is off is skipped with no write
 * and no email at all (not stamped, not marked): nothing is consumed, so
 * turning the feature back on takes effect on the very next tick. Points
 * already awarded are never revoked by a flag change — see the loyalty
 * feature's "money records survive a toggle" rule.
 */

import * as Sentry from "@sentry/nextjs";

import type { DbClient } from "~/server/db";
import { zonedCalendarDate } from "~/lib/calendar-date";
import { sendLoyaltyBirthdayEmail } from "~/lib/email/templates";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { awardPoints } from "~/lib/loyalty/ledger";

/** True for a Gregorian leap year (divisible by 4, not by 100 unless also by 400). */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * The birthday(s) that qualify for today's bonus in `timeZone`, plus the
 * current year for building the `birthday:<customerId>:<YYYY>` ledger
 * idempotency key. Consumed by `awardBirthdayPoints` below.
 *
 * `targets` is normally just `[today]`. On February 28th of a non-leap year
 * it additionally includes `{ month: 2, day: 29 }`, so a customer whose
 * stored birthday is February 29th still gets their bonus once a year
 * instead of being skipped for three years out of four.
 */
export function birthdayTargets(
  now: Date,
  timeZone: string,
): {
  year: number;
  today: { month: number; day: number };
  targets: Array<{ month: number; day: number }>;
} {
  const ymd = zonedCalendarDate(now, timeZone);
  const [yearStr, monthStr, dayStr] = ymd.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const today = { month, day };

  const targets: Array<{ month: number; day: number }> = [today];
  if (month === 2 && day === 28 && !isLeapYear(year)) {
    targets.push({ month: 2, day: 29 });
  }

  return { year, today, targets };
}

const MONTH_MAX_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Whether `month`/`day` is a real, year-agnostic calendar birthday (February
 * always allows the 29th, since a birthday is stored without a year).
 * Consumed by `birthdaySchema` in `src/lib/validators/loyalty.ts` and the
 * "save your birthday" account-preferences form.
 */
export function isValidBirthday(month: number, day: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const max = MONTH_MAX_DAYS[month - 1] ?? 31;
  return day <= max;
}

/**
 * The business columns the sweep needs: `featureFlags` for the gate,
 * `timeZone` for "what day is it", and the rest purely to address the email
 * (`sendLoyaltyBirthdayEmail` builds the storefront URL from
 * subdomain/customDomain/domainStatus).
 */
const BIRTHDAY_BUSINESS_SELECT = {
  id: true,
  featureFlags: true,
  timeZone: true,
  name: true,
  ownerEmail: true,
  subdomain: true,
  customDomain: true,
  domainStatus: true,
  siteContent: { select: { logoUrl: true } },
} as const;

export type AwardBirthdayPointsOptions = {
  /** Injectable clock — one run resolves "today" for every business from this instant. */
  now?: Date;
};

/**
 * Award the birthday bonus to every customer whose stored month/day matches
 * today in their store's time zone, and email them about it.
 *
 * Returns the number of customers awarded across all businesses in this run
 * (0 on a tick where every birthday had already been awarded — see
 * IDEMPOTENCY in the module docblock).
 */
export async function awardBirthdayPoints(
  db: DbClient,
  opts: AwardBirthdayPointsOptions = {},
): Promise<number> {
  const now = opts.now ?? new Date();

  // `birthdayBonus > 0` is part of the filter, not a later check: a rule worth
  // zero points would make `awardPoints` return `{ awarded: false, reason:
  // "zero" }` for every customer, so loading those businesses could only cost
  // queries and never award anything.
  const programs = await db.loyaltyProgram.findMany({
    where: { birthdayEnabled: true, birthdayBonus: { gt: 0 } },
    include: { business: { select: BIRTHDAY_BUSINESS_SELECT } },
  });
  // The steady state on a platform where nobody runs a birthday rule: one
  // query, zero rows, done — no customer table access, no email client.
  if (programs.length === 0) return 0;

  let awardedCount = 0;

  for (const program of programs) {
    const business = program.business;

    try {
      // Cron requests arrive on the platform host, so the host-based
      // `featureGate` tRPC middleware can't resolve a business here — resolve
      // the flags directly, same as the `backInStock` and `quickbooks` jobs.
      // Skipped WITHOUT a write of any kind, so re-enabling the feature takes
      // effect on the next tick (and mid-day, on the same birthday).
      if (!resolveFlags(business.featureFlags).isEnabled("loyalty")) continue;

      // "Today" is the owner's calendar day, not UTC's: a Detroit store's
      // birthdays would otherwise fire during the previous local evening.
      const { year, targets } = birthdayTargets(now, business.timeZone);

      const customers = await db.customer.findMany({
        where: {
          businessId: business.id,
          // An anonymized customer is a deleted person: no points, no email.
          anonymizedAt: null,
          // Usually one pair; two on Feb 28 of a non-leap year, which is where
          // Feb-29 birthdays land. Covered by
          // `@@index([businessId, birthMonth, birthDay])`.
          OR: targets.map((target) => ({
            birthMonth: target.month,
            birthDay: target.day,
          })),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          loyaltyPoints: true,
        },
      });
      if (customers.length === 0) continue;

      for (const customer of customers) {
        // Per-customer isolation: one bad row (e.g. a constraint failure on a
        // half-migrated customer) must not cost the rest of this store's
        // birthdays their tick. Nothing is stamped, so the failed customer
        // simply retries next tick; awards that already landed are protected
        // from a double by their sourceKey.
        try {
          const result = await awardPoints(db, {
            businessId: business.id,
            customerId: customer.id,
            type: "birthday_bonus",
            points: program.birthdayBonus,
            // The whole idempotency story for this job — see the module
            // docblock. Once per customer per calendar year, forever.
            sourceKey: `birthday:${customer.id}:${year}`,
            reason: "Birthday bonus",
          });

          // Already awarded on an earlier tick today (or the bonus resolved to
          // zero). Expected, silent, and explicitly not an error.
          if (!result.awarded) continue;

          // Not branched on: `sendEmail` never throws and returns
          // `{ success: false }` on failure, which is already reported from
          // inside it. The ledger row is committed; a failed email must not
          // undo points the balance already reflects.
          await sendLoyaltyBirthdayEmail({
            to: customer.email,
            customerName: customer.firstName,
            points: result.points,
            balance: result.balanceAfter,
            customerId: customer.id,
            year,
            business,
          });

          awardedCount++;
        } catch (err) {
          Sentry.withScope((scope) => {
            scope.setTag("loyalty.step", "birthday");
            scope.setTag("businessId", business.id);
            scope.setExtra("customerId", customer.id);
            Sentry.captureException(err);
          });
        }
      }
    } catch (err) {
      // Per-business isolation: a failure BEFORE the customer loop (flag
      // resolution, the customer query) must not cost the rest of the
      // platform its birthday run. Nothing is stamped, so this business
      // retries on the next tick.
      Sentry.withScope((scope) => {
        scope.setTag("loyalty.step", "birthday");
        scope.setTag("businessId", business.id);
        Sentry.captureException(err);
      });
    }
  }

  return awardedCount;
}
