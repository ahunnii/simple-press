import { writeFileSync } from "node:fs";

// Side-effect import FIRST: points the Prisma client at the local test DB and sets
// SKIP_ENV_VALIDATION before `~/server/db` (via the factories) constructs.
import "../tests/helpers/test-env";

import type { Prisma } from "generated/prisma";
// better-auth's own password hasher (scrypt) — used to seed a credential
// `Account` row directly, bypassing the real /sign-up/email flow (which would
// leave the user unverified and unable to sign in; see SEED_USER's doc comment).
import { hashPassword } from "better-auth/crypto";

import type { SeedTenant } from "./global-setup";

import { db } from "../tests/helpers/db";
import { createBusiness, createProduct } from "../tests/helpers/factories";
import { SEED_FILE, SEED_USER, TEMPLATES } from "./global-setup";

// Templates whose e2e tenant gets the `subscriptions` flag turned on plus a
// second, subscription-enabled product (see SeedTenant's doc comment) — the
// two templates the product-subscriptions MVP actually wired the Subscribe
// panel into (default + happy-bamboo product actions). Every other seeded
// tenant is untouched: `subscriptions` has `enabledByDefault: false` in the
// feature registry, so simply not overriding it leaves those stores exactly
// as they were before this feature existed.
const SUBSCRIPTION_TEMPLATE_IDS: readonly string[] = [
  "default",
  "happy-bamboo",
];

// The two cadences configured on the seeded subscription product — chosen to
// match subscribe-flow.default.spec.ts, which picks "week:2" off the panel's
// two-option cadence radio and asserts the "Monthly" / "Every 2 weeks" short
// labels are both present.
const SUBSCRIPTION_PRODUCT_INTERVALS = ["month:1", "week:2"];

// Run via `tsx` from e2e/global-setup.ts. Seeds one tenant (with a published
// product) per template and writes the lookup table the specs read.
async function main() {
  // Idempotent: drop any prior e2e- tenants. Children first in case relations
  // aren't cascade-configured.
  const stale = { business: { subdomain: { startsWith: "e2e-" } } };
  await db.product.deleteMany({ where: stale });
  await db.siteContent.deleteMany({ where: stale });
  await db.business.deleteMany({
    where: { subdomain: { startsWith: "e2e-" } },
  });

  const tenants: SeedTenant[] = [];

  for (const templateId of TEMPLATES) {
    const wantsSubscriptions = SUBSCRIPTION_TEMPLATE_IDS.includes(templateId);

    const business = await createBusiness({
      subdomain: `e2e-${templateId}`,
      templateId,
      name: `E2E ${templateId}`,
      status: "active",
      // Additive only: every other template keeps calling createBusiness()
      // with no featureFlags override at all, so its stored JSON (and every
      // registry default it resolves against) is unchanged.
      ...(wantsSubscriptions ? { featureFlags: { subscriptions: true } } : {}),
    });

    // Several templates gate the checkout form behind `isStripeConnected`
    // (= !!stripeAccountId). A dummy id flips that on; no real Stripe call is
    // made because create-session is stubbed in the (stubbed) specs.
    //
    // For the real Stripe test-mode suite, the `default` tenant must point at a
    // real charges-enabled test connected account so create-session/webhook hit
    // Stripe for real. E2E_STRIPE_ACCOUNT_ID supplies it when running that suite.
    const realAccountId = process.env.E2E_STRIPE_ACCOUNT_ID;
    const stripeAccountId =
      templateId === "default" && realAccountId
        ? realAccountId
        : `acct_e2e_${templateId}`;
    await db.business.update({
      where: { id: business.id },
      data: { stripeAccountId },
    });

    // Minimal SiteContent so storefront layouts that expect the relation render
    // (colors fall back to schema defaults).
    await db.siteContent.create({ data: { businessId: business.id } });

    const product = await createProduct(business.id, {
      name: "E2E Widget",
      price: 2500,
      published: true,
      inventoryQty: 50,
    });

    // A second, subscription-enabled product on the same tenant (see
    // SeedTenant's doc comment) — left published/in-stock/priced exactly
    // like the plain product above, plus the three subscription fields the
    // product form's own "Subscriptions" card writes and a real weight (the
    // zone_weight shipping path reads it; this store's shippingType is the
    // schema default "free", so it isn't exercised by the stubbed spec, but
    // a subscription product should never carry an unset weight). Not part
    // of `createProduct` (used by the Vitest integration factories too) —
    // done as a follow-up update so that shared factory stays untouched.
    let subscriptionProduct: { id: string; slug: string; name: string } | null =
      null;
    if (wantsSubscriptions) {
      const created = await createProduct(business.id, {
        name: "E2E Subscribe Widget",
        price: 2500,
        published: true,
        inventoryQty: 50,
      });
      await db.product.update({
        where: { id: created.id },
        data: {
          subscriptionEnabled: true,
          subscriptionIntervals:
            SUBSCRIPTION_PRODUCT_INTERVALS as Prisma.InputJsonValue,
          subscriptionDiscountPercent: 10,
          weight: 2.5,
        },
      });
      subscriptionProduct = created;
    }

    tenants.push({
      templateId,
      subdomain: business.subdomain,
      businessId: business.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      price: product.price,
      ...(subscriptionProduct
        ? {
            subscriptionProductId: subscriptionProduct.id,
            subscriptionProductSlug: subscriptionProduct.slug,
            subscriptionProductName: subscriptionProduct.name,
          }
        : {}),
    });
  }

  // Idempotent: drop + recreate the shared auth user (same pattern as the
  // stale-tenant cleanup above). Cascades to its Session/Account rows.
  await db.user.deleteMany({ where: { email: SEED_USER.email } });
  const authUser = await db.user.create({
    data: {
      name: "E2E Signed-In User",
      email: SEED_USER.email,
      emailVerified: true,
    },
  });
  await db.account.create({
    data: {
      userId: authUser.id,
      providerId: "credential",
      // Matches better-auth's own sign-up handler, which links the credential
      // account under the user's own id (see
      // node_modules/better-auth/dist/api/routes/sign-up.mjs).
      accountId: authUser.id,
      password: await hashPassword(SEED_USER.password),
    },
  });

  writeFileSync(SEED_FILE, JSON.stringify(tenants, null, 2));
  await db.$disconnect();
  console.log(`Seeded ${tenants.length} e2e tenants → ${SEED_FILE}`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
