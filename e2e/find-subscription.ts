// Side-effect import FIRST: points Prisma at the local test DB.
import "../tests/helpers/test-env";

import { db } from "../tests/helpers/db";

/**
 * Run via `tsx` from `e2e/live/subscription-live.spec.ts` (so `~` /
 * generated/prisma resolve — same reasoning as `find-order.ts`, which this
 * mirrors). Looks up the `Subscription` row created by the real Subscribe
 * checkout by its Stripe Checkout Session id, requires it to have reached
 * `status: "active"` (set by the webhook's `checkout.session.completed`
 * subscription-mode handler once Stripe confirms the subscription), and
 * requires at least one `Order` linked to it carrying a `stripeInvoiceId`
 * (set by `invoice.paid` → `createOrderFromSubscriptionInvoice` — the plan's
 * "every paid invoice creates a normal Order" invariant). Prints
 * `{ subscription, order }` as JSON on success; exits non-zero while either
 * half hasn't landed yet, so the spec's `expect.poll` retries.
 */
async function main() {
  const stripeCheckoutSessionId = process.argv[2];
  if (!stripeCheckoutSessionId) {
    console.error(
      "usage: tsx e2e/find-subscription.ts <stripeCheckoutSessionId>",
    );
    process.exit(2);
  }

  const subscription = await db.subscription.findFirst({
    where: { stripeCheckoutSessionId },
  });

  if (subscription?.status !== "active") {
    await db.$disconnect();
    process.exit(1);
  }

  const order = await db.order.findFirst({
    where: { subscriptionId: subscription.id, stripeInvoiceId: { not: null } },
    include: { items: true },
  });
  await db.$disconnect();

  if (!order) {
    process.exit(1);
  }

  process.stdout.write(JSON.stringify({ subscription, order }));
}

void main().catch((err) => {
  console.error(err);
  process.exit(2);
});
