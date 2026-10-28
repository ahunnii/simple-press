import { beforeEach, describe, expect, it, vi } from "vitest";

import { RECAPTCHA_TEST_BYPASS_TOKEN } from "~/lib/captcha/verify-recaptcha";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createProduct,
  createUser,
} from "../helpers/factories";

// `review.submit` resolves its tenant from the request host (`checkBusiness()`),
// so the host has to be mockable per-test.
const reqHost = vi.hoisted(() => ({ value: "reviewguard.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

// Every accepted review emails the owner; keep Resend off the network.
vi.mock("~/lib/email/templates", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  sendNewReviewNotification: vi.fn().mockResolvedValue({ success: true }),
}));

const REVIEW = {
  rating: 5,
  title: "Great",
  comment: "Really enjoyed this product.",
};

/**
 * `review.submit` anti-spam guards: reCAPTCHA, per-user rate limit, and the
 * same-store product check. The rate limiter falls back to in-process memory
 * when Redis is absent, so its state lives for the whole file — every test
 * uses its own user (the limiter key is `userId:host`) to stay independent.
 */
describe("review.submit guards", () => {
  beforeEach(resetDb);

  async function seed() {
    const business = await createBusiness({
      subdomain: "reviewguard",
      featureFlags: { reviews: true },
    });
    reqHost.value = "reviewguard.simplepress.test";
    const user = await createUser();
    const product = await createProduct(business.id, { published: true });
    const caller = createTestCaller({
      userId: user.id,
      email: user.email,
      headers: { host: reqHost.value },
    });
    return { business, user, product, caller };
  }

  it("accepts the bypass token and stores the review unapproved", async () => {
    const { product, caller } = await seed();

    const review = await caller.review.submit({
      productId: product.id,
      ...REVIEW,
      captchaToken: RECAPTCHA_TEST_BYPASS_TOKEN,
    });

    expect(review.isApproved).toBe(false);
    const stored = await db.productReview.findUniqueOrThrow({
      where: { id: review.id },
    });
    expect(stored.isApproved).toBe(false);
    expect(stored.productId).toBe(product.id);
  });

  it("rejects a bad captcha token with BAD_REQUEST and stores nothing", async () => {
    const { product, caller } = await seed();

    await expect(
      caller.review.submit({
        productId: product.id,
        ...REVIEW,
        captchaToken: "not-a-real-token",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(await db.productReview.count()).toBe(0);
  });

  it("rejects a product that belongs to another business with NOT_FOUND", async () => {
    const { caller } = await seed();
    const other = await createBusiness({
      subdomain: "otherstore",
      featureFlags: { reviews: true },
    });
    const foreignProduct = await createProduct(other.id, { published: true });

    await expect(
      caller.review.submit({
        productId: foreignProduct.id,
        ...REVIEW,
        captchaToken: RECAPTCHA_TEST_BYPASS_TOKEN,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Product not found",
    });

    expect(await db.productReview.count()).toBe(0);
  });

  it("rate-limits the 6th submission inside the window", async () => {
    const { business, caller } = await seed();
    // Distinct products so the one-review-per-product dedupe can't fire first.
    const products = await Promise.all(
      Array.from({ length: 6 }, () =>
        createProduct(business.id, { published: true }),
      ),
    );

    for (const product of products.slice(0, 5)) {
      await caller.review.submit({
        productId: product.id,
        ...REVIEW,
        captchaToken: RECAPTCHA_TEST_BYPASS_TOKEN,
      });
    }

    await expect(
      caller.review.submit({
        productId: products[5]!.id,
        ...REVIEW,
        captchaToken: RECAPTCHA_TEST_BYPASS_TOKEN,
      }),
    ).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: "Too many reviews. Please try again later.",
    });
    expect(await db.productReview.count()).toBe(5);
  });

  it("ignores images/videoUrl in the input", async () => {
    const { product, caller } = await seed();

    // Not in the input schema any more; zod strips the unknown keys. Cast
    // because the typed caller (correctly) no longer accepts them.
    const review = await caller.review.submit({
      productId: product.id,
      ...REVIEW,
      captchaToken: RECAPTCHA_TEST_BYPASS_TOKEN,
      images: ["https://evil.example/x.png"],
      videoUrl: "https://evil.example/v.mp4",
    } as Parameters<typeof caller.review.submit>[0]);

    const stored = await db.productReview.findUniqueOrThrow({
      where: { id: review.id },
    });
    expect(stored.images).toEqual([]);
    expect(stored.videoUrl).toBeNull();
  });
});
