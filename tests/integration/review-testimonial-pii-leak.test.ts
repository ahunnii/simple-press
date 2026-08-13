import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createOwnerUser,
  createProduct,
} from "../helpers/factories";

// Same rationale as unpublished-product-leak.test.ts: every procedure under
// test is a `publicProcedure` that resolves its tenant from the request host
// (`checkBusiness()`), so the host has to be mockable per-test.
const reqHost = vi.hoisted(() => ({ value: "piileak.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

/**
 * `ProductReview.customerEmail`/`customerId`/`orderId` and
 * `Testimonial.customerEmail`/`customerId` are admin-only PII/order-linkage
 * columns. `review.listByProduct`, `testimonial.list` (public branch), and
 * `testimonial.listRandom` are all `publicProcedure`s. This is the same bug
 * class as unpublished-product-leak.test.ts — a leak found in production,
 * fixed once — so it lives alongside it and exercises the real routers
 * end-to-end against Postgres rather than just the exported select/redact
 * shapes (see the co-located src/server/api/routers/review.test.ts and
 * testimonials.test.ts for the DB-free version of this same regression).
 *
 * NOT RUN in the session that added it: this project's `integration` vitest
 * project needs a live Postgres via `pnpm test:db:up` (Docker), which that
 * session was not permitted to start. Run with:
 *   pnpm test:db:up && pnpm vitest run tests/integration/review-testimonial-pii-leak.test.ts
 */
describe("review and testimonial PII never leaks to public callers", () => {
  beforeEach(resetDb);

  async function seed() {
    const business = await createBusiness({
      subdomain: "piileak",
      // `reviews` is enabledByDefault: false; `testimonials` is true but set
      // explicitly for clarity. `reviews` depends on products/customerAccounts,
      // both enabledByDefault: true, so no extra flags needed for those.
      featureFlags: { reviews: true, testimonials: true },
    });
    reqHost.value = "piileak.simplepress.test";

    const customer = await createCustomer(business.id, {
      email: "shopper@leaktest.dev",
    });
    const product = await createProduct(business.id, {
      name: "Reviewed Product",
      published: true,
    });

    const review = await db.productReview.create({
      data: {
        productId: product.id,
        customerId: customer.id,
        customerEmail: customer.email,
        customerName: "Jane Shopper",
        rating: 5,
        comment: "Loved it",
        images: [],
        isApproved: true,
        isHidden: false,
      },
    });

    const testimonial = await db.testimonial.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        customerEmail: customer.email,
        customerName: "Jane Shopper",
        text: "Best storefront ever",
        photoUrls: [],
        isApproved: true,
        isHidden: false,
      },
    });

    return { business, customer, product, review, testimonial };
  }

  it("review.listByProduct omits customerEmail/customerId/orderId", async () => {
    const { product, customer } = await seed();
    const caller = createTestCaller({});

    const rows = await caller.review.listByProduct({ productId: product.id });
    expect(rows).toHaveLength(1);
    const row = rows[0] as unknown as Record<string, unknown>;
    expect(row).not.toHaveProperty("customerEmail");
    expect(row).not.toHaveProperty("customerId");
    expect(row).not.toHaveProperty("orderId");
    expect(JSON.stringify(row)).not.toContain(customer.email);
    // Sanity: the fix didn't also drop what the storefront needs to render.
    expect(row.customerName).toBe("Jane Shopper");
    expect(row.rating).toBe(5);
  });

  it("testimonial.list (public) redacts customerEmail/customerId to null", async () => {
    const { customer } = await seed();
    const caller = createTestCaller({});

    const rows = await caller.testimonial.list({ publicOnly: true });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.customerEmail).toBeNull();
    expect(rows[0]!.customerId).toBeNull();
    expect(JSON.stringify(rows[0])).not.toContain(customer.email);
    expect(rows[0]!.customerName).toBe("Jane Shopper");
  });

  it("testimonial.list stays redacted for an unauthenticated publicOnly:false request", async () => {
    // A caller can ask for publicOnly:false without a session — `canSeeAll`
    // must stay false rather than the branch silently trusting the flag.
    await seed();
    const caller = createTestCaller({});

    const rows = await caller.testimonial.list({ publicOnly: false });
    expect(rows[0]!.customerEmail).toBeNull();
    expect(rows[0]!.customerId).toBeNull();
  });

  it("testimonial.list still returns the real email to an authenticated OWNER (columns widen with rows)", async () => {
    const { business, customer } = await seed();
    const owner = await createOwnerUser(business.id);
    const caller = createTestCaller({ userId: owner.id, email: owner.email });

    const rows = await caller.testimonial.list({ publicOnly: false });
    expect(rows[0]!.customerEmail).toBe(customer.email);
    expect(rows[0]!.customerId).toBe(customer.id);
  });

  it("testimonial.listRandom omits customerEmail/customerId entirely", async () => {
    const { customer } = await seed();
    const caller = createTestCaller({});

    const rows = await caller.testimonial.listRandom({ limit: 3 });
    expect(rows).toHaveLength(1);
    const row = rows[0] as unknown as Record<string, unknown>;
    expect(row).not.toHaveProperty("customerEmail");
    expect(row).not.toHaveProperty("customerId");
    expect(JSON.stringify(row)).not.toContain(customer.email);
  });
});
