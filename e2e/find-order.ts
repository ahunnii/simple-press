// Side-effect import FIRST: points Prisma at the 5433 test DB.
import "../tests/helpers/test-env";

import { db } from "../tests/helpers/db";

// Run via `tsx` from the live spec (so `~` / generated/prisma resolve). Looks up
// the webhook-created order by its Stripe session id and prints it as JSON; exits
// non-zero when the order doesn't exist yet (the spec retries).
async function main() {
  const stripeSessionId = process.argv[2];
  if (!stripeSessionId) {
    console.error("usage: tsx e2e/find-order.ts <stripeSessionId>");
    process.exit(2);
  }

  const order = await db.order.findUnique({
    where: { stripeSessionId },
    include: { items: true },
  });
  await db.$disconnect();

  if (!order) {
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(order));
}

void main().catch((err) => {
  console.error(err);
  process.exit(2);
});
