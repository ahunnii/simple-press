/**
 * normalize-customer-emails.ts
 *
 * One-time reconciliation script: normalizes all Customer.email values to
 * lowercase + trimmed, and merges duplicate rows that share the same
 * (businessId, lower(trim(email))) key.
 *
 * Usage:
 *   pnpm tsx scripts/normalize-customer-emails.ts          # dry-run (safe, read-only)
 *   pnpm tsx scripts/normalize-customer-emails.ts --apply  # write changes
 *   APPLY=1 pnpm tsx scripts/normalize-customer-emails.ts  # same as --apply
 *
 * Idempotent: re-running after a successful apply reports 0 actions.
 */

import { PrismaClient } from "../generated/prisma";

const db = new PrismaClient({ log: ["error"] });

const DRY_RUN =
  !process.argv.includes("--apply") && process.env["APPLY"] !== "1";

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------
const stats = {
  businessesScanned: 0,
  singletonsRenamed: 0,
  groupsMerged: 0,
  customersDeleted: 0,
  ordersReassigned: 0,
  addressesReassigned: 0,
  testimonialsReassigned: 0,
  testimonialInvitesReassigned: 0,
  reviewsReassigned: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (DRY_RUN) {
    console.log("=== DRY RUN (pass --apply to write changes) ===\n");
  } else {
    console.log("=== APPLY MODE — writing changes ===\n");
  }

  // Fetch all businesses that have at least one Customer
  const businesses = await db.business.findMany({
    where: { customers: { some: {} } },
    select: { id: true, name: true },
  });

  stats.businessesScanned = businesses.length;
  console.log(`Businesses with customers: ${businesses.length}\n`);

  for (const business of businesses) {
    const customers = await db.customer.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "asc" },
    });

    // Group by normalized email
    const groups = new Map<string, typeof customers>();
    for (const c of customers) {
      const key = normalizeEmail(c.email);
      const existing = groups.get(key);
      if (existing) {
        existing.push(c);
      } else {
        groups.set(key, [c]);
      }
    }

    for (const [normalizedEmail, group] of groups.entries()) {
      // Skip groups that are already correct (one row, email already normalized)
      if (group.length === 1) {
        const only = group[0]!;
        if (only.email === normalizedEmail) continue; // already good

        // Singleton whose stored email differs from its normalized form
        // Guard: no other row already owns the normalized email in this business
        // (the group map guarantees this — if there were two they'd be in the same group)
        stats.singletonsRenamed++;
        console.log(
          `  [RENAME] business=${business.name} | "${only.email}" → "${normalizedEmail}" (id=${only.id})`,
        );

        if (!DRY_RUN) {
          await db.customer.update({
            where: { id: only.id },
            data: { email: normalizedEmail },
          });
        }
        continue;
      }

      // Multiple rows with same normalized email — merge them
      // Pick canonical: prefer non-null userId, then earliest createdAt
      const canonical =
        group.find((c) => c.userId !== null) ??
        group.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));

      const duplicates = group.filter((c) => c.id !== canonical.id);

      stats.groupsMerged++;
      console.log(
        `  [MERGE] business=${business.name} | normalizedEmail="${normalizedEmail}" | canonical=${canonical.id} | duplicates=${duplicates.map((d) => d.id).join(",")}`,
      );

      if (!DRY_RUN) {
        await db.$transaction(async (tx) => {
          for (const dup of duplicates) {
            // 1. Reassign child relations to canonical
            const orders = await tx.order.updateMany({
              where: { customerId: dup.id },
              data: { customerId: canonical.id },
            });
            stats.ordersReassigned += orders.count;

            // ShippingAddress is onDelete: Cascade — MUST reassign before delete
            const addresses = await tx.shippingAddress.updateMany({
              where: { customerId: dup.id },
              data: { customerId: canonical.id },
            });
            stats.addressesReassigned += addresses.count;

            const testimonials = await tx.testimonial.updateMany({
              where: { customerId: dup.id },
              data: { customerId: canonical.id },
            });
            stats.testimonialsReassigned += testimonials.count;

            const invites = await tx.testimonialInvite.updateMany({
              where: { customerId: dup.id },
              data: { customerId: canonical.id },
            });
            stats.testimonialInvitesReassigned += invites.count;

            const reviews = await tx.productReview.updateMany({
              where: { customerId: dup.id },
              data: { customerId: canonical.id },
            });
            stats.reviewsReassigned += reviews.count;

            // 2. Delete the duplicate (all children already moved)
            await tx.customer.delete({ where: { id: dup.id } });
            stats.customersDeleted++;
          }

          // 3. Aggregate stats onto canonical
          const totalSpentAgg = duplicates.reduce(
            (sum, d) => sum + d.totalSpent,
            canonical.totalSpent,
          );
          const orderCountAgg = duplicates.reduce(
            (sum, d) => sum + d.orderCount,
            canonical.orderCount,
          );
          const acceptsMarketingAgg =
            canonical.acceptsMarketing ||
            duplicates.some((d) => d.acceptsMarketing);

          // Adopt a userId from a duplicate if canonical lacks one
          const adoptedUserId =
            canonical.userId ??
            duplicates.find((d) => d.userId !== null)?.userId ??
            null;

          // 4. Update canonical: normalize email + aggregate stats
          await tx.customer.update({
            where: { id: canonical.id },
            data: {
              email: normalizedEmail,
              totalSpent: totalSpentAgg,
              orderCount: orderCountAgg,
              acceptsMarketing: acceptsMarketingAgg,
              userId: adoptedUserId,
            },
          });
        });
      } else {
        // Dry-run: still tally what would change
        for (const dup of duplicates) {
          const [ordersCount, addressesCount, testimonialsCount, invitesCount, reviewsCount] =
            await Promise.all([
              db.order.count({ where: { customerId: dup.id } }),
              db.shippingAddress.count({ where: { customerId: dup.id } }),
              db.testimonial.count({ where: { customerId: dup.id } }),
              db.testimonialInvite.count({ where: { customerId: dup.id } }),
              db.productReview.count({ where: { customerId: dup.id } }),
            ]);
          stats.ordersReassigned += ordersCount;
          stats.addressesReassigned += addressesCount;
          stats.testimonialsReassigned += testimonialsCount;
          stats.testimonialInvitesReassigned += invitesCount;
          stats.reviewsReassigned += reviewsCount;
          stats.customersDeleted++;
          console.log(
            `    dup=${dup.id} | orders=${ordersCount} addresses=${addressesCount} testimonials=${testimonialsCount} invites=${invitesCount} reviews=${reviewsCount}`,
          );
        }
      }
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Businesses scanned:           ${stats.businessesScanned}`);
  console.log(`Singletons renamed:           ${stats.singletonsRenamed}`);
  console.log(`Duplicate groups merged:      ${stats.groupsMerged}`);
  console.log(`Customers deleted:            ${stats.customersDeleted}`);
  console.log(`Orders reassigned:            ${stats.ordersReassigned}`);
  console.log(`Addresses reassigned:         ${stats.addressesReassigned}`);
  console.log(`Testimonials reassigned:      ${stats.testimonialsReassigned}`);
  console.log(`TestimonialInvites reassigned:${stats.testimonialInvitesReassigned}`);
  console.log(`Reviews reassigned:           ${stats.reviewsReassigned}`);

  if (DRY_RUN) {
    console.log(
      "\n[DRY RUN] No changes written. Re-run with --apply to apply.\n",
    );
  } else {
    console.log("\n[APPLY] All changes written successfully.\n");
  }
}

main()
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
