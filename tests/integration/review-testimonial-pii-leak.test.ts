import { beforeEach, describe, expect, it, vi } from "vitest";

import { RECAPTCHA_TEST_BYPASS_TOKEN } from "~/lib/captcha/verify-recaptcha";

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
 * `ProductReview.customerEmail`/`customerId`/`orderId`,
 * `Testimonial.customerEmail`/`customerId` and `TestimonialInvite.email`/
 * `customerId` are admin-only PII/order-linkage columns.
 * `review.listByProduct`, `testimonial.list` (public branch),
 * `testimonial.listRandom`, `testimonial.getInvite` and
 * `testimonial.submitWithCode` are all `publicProcedure`s. This is the same bug
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

  // ─── TestimonialInvite ────────────────────────────────────────────────────
  //
  // Same bug class one model over. `TestimonialInvite.email` is the invited
  // shopper's address and `customerId` links the invite to their Customer row;
  // `testimonial.getInvite` and `testimonial.submitWithCode` are both
  // `publicProcedure`s keyed on nothing but a `code` that travels in a URL. A
  // bare row return therefore handed the invitee's email to anyone holding —
  // or brute-forcing — a code.

  /** Deliberately different from the seeded customer's address so the
   *  JSON.stringify checks below prove the *invite's* column is gone, not just
   *  that the testimonial redaction happened to cover it. */
  const INVITE_EMAIL = "invitee@leaktest.dev";

  async function seedInvite() {
    const { business, customer } = await seed();
    const invite = await db.testimonialInvite.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        email: INVITE_EMAIL,
        code: "invite-code-under-test",
        maxPhotos: 2,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { business, customer, invite };
  }

  it("testimonial.getInvite omits the invitee's email and customerId", async () => {
    const { customer, invite } = await seedInvite();
    const caller = createTestCaller({});

    const result = await caller.testimonial.getInvite({ code: invite.code });
    const row = result as unknown as Record<string, unknown>;
    expect(row).not.toHaveProperty("email");
    expect(row).not.toHaveProperty("customerId");
    expect(JSON.stringify(result)).not.toContain(INVITE_EMAIL);
    expect(JSON.stringify(result)).not.toContain(customer.id);

    // Positive control: everything the claim form actually renders survives
    // (src/app/(storefront)/testimonials/submit/_components/
    // testimonial-form-unauthenticated.tsx reads exactly these two).
    expect(result.maxPhotos).toBe(2);
    expect(result.business.name).toBe("Test Store");
  });

  it("testimonial.getInvite still rejects unknown / used / expired codes", async () => {
    // The narrowed projection has to keep selecting `used` and `expiresAt`:
    // dropping them from the select would silently turn every invalid invite
    // into a valid one.
    const { invite } = await seedInvite();
    const caller = createTestCaller({});

    await expect(
      caller.testimonial.getInvite({ code: "no-such-code" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", message: "Invite not found" });

    await db.testimonialInvite.update({
      where: { id: invite.id },
      data: { used: true },
    });
    await expect(
      caller.testimonial.getInvite({ code: invite.code }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This invite has already been used",
    });

    await db.testimonialInvite.update({
      where: { id: invite.id },
      data: { used: false, expiresAt: new Date(Date.now() - 60_000) },
    });
    await expect(
      caller.testimonial.getInvite({ code: invite.code }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This invite has expired",
    });
  });

  it("testimonial.submitWithCode does not echo the invitee's email back", async () => {
    const { invite } = await seedInvite();
    const caller = createTestCaller({});

    const result = await caller.testimonial.submitWithCode({
      code: invite.code,
      name: "Ivy Invitee",
      text: "A perfectly adequate testimonial.",
      photoUrls: [],
      // Sentinel accepted by verifyRecaptcha under NODE_ENV !== production +
      // NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS=1 (both set by tests/helpers/test-env.ts).
      captchaToken: RECAPTCHA_TEST_BYPASS_TOKEN,
    });

    const row = result as unknown as Record<string, unknown>;
    expect(row).not.toHaveProperty("customerEmail");
    expect(row).not.toHaveProperty("customerId");
    expect(JSON.stringify(result)).not.toContain(INVITE_EMAIL);
    // Positive control: the claim form picks its thank-you copy off this.
    expect(result.isApproved).toBe(false);

    // The row itself must still carry the PII — only the wire payload is narrowed.
    const stored = await db.testimonial.findFirstOrThrow({
      where: { customerName: "Ivy Invitee" },
    });
    expect(stored.customerEmail).toBe(INVITE_EMAIL);
  });
});
