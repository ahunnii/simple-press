// Side-effect import FIRST: points Prisma at the local test DB.
import "../tests/helpers/test-env";

import type { Prisma } from "generated/prisma";

import { db } from "../tests/helpers/db";

/**
 * Flip one key in a seeded e2e business's `featureFlags` JSON, in place.
 * Used by `subscribe-flow.default.spec.ts`'s flag-off test
 * (`test.beforeAll`/`test.afterAll`) to turn `subscriptions` off for a
 * single test and restore it afterward — there is no existing pattern of a
 * spec mutating seeded state mid-suite (every other spec only *reads* the
 * seed via `getTenant`), so this mirrors `find-order.ts`'s pattern instead:
 * a tiny script run via `tsx` from the spec (with `execFileSync`), because
 * touching the app's Prisma singleton needs the `~` alias and
 * `generated/prisma` resolved, which Playwright's own ESM runner can't do.
 *
 * Merges into whatever `featureFlags` the business already has rather than
 * replacing it wholesale, so a second flag override a seeded tenant might
 * carry is never silently dropped.
 *
 * usage: tsx e2e/set-feature-flag.ts <subdomain> <flagKey> <true|false>
 */
async function main() {
  const [subdomain, key, valueArg] = process.argv.slice(2);
  if (!subdomain || !key || (valueArg !== "true" && valueArg !== "false")) {
    console.error(
      "usage: tsx e2e/set-feature-flag.ts <subdomain> <flagKey> <true|false>",
    );
    process.exit(2);
  }
  const value = valueArg === "true";

  const business = await db.business.findUnique({
    where: { subdomain },
    select: { id: true, featureFlags: true },
  });
  if (!business) {
    console.error(`no business found for subdomain "${subdomain}"`);
    process.exit(1);
  }

  const current =
    business.featureFlags &&
    typeof business.featureFlags === "object" &&
    !Array.isArray(business.featureFlags)
      ? (business.featureFlags as Record<string, boolean>)
      : {};

  await db.business.update({
    where: { id: business.id },
    data: {
      featureFlags: { ...current, [key]: value } as Prisma.InputJsonValue,
    },
  });

  await db.$disconnect();
}

void main().catch((err) => {
  console.error(err);
  process.exit(2);
});
