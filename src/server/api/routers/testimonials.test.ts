import { describe, expect, it, vi } from "vitest";

import {
  PUBLIC_TESTIMONIAL_OMIT,
  redactTestimonialForPublic,
} from "./testimonials";

// Importing the router pulls in `../trpc` → the real better-auth singleton,
// whose construction eagerly fires `trustedOrigins()` (a live
// `db.business.findMany()`) — an unhandled rejection against Postgres in the
// DB-less unit project. Same stub as content.test.ts.
vi.mock("~/server/better-auth", () => ({ auth: {} }));

/**
 * `testimonial.list` (public branch) and `testimonial.listRandom` are
 * `publicProcedure`s — every storefront visitor's browser receives whatever
 * they return, across ~10 storefront surfaces (homepage/about/services
 * testimonial sections in nearly every template). `customerEmail` and
 * `customerId` are admin-only PII columns on `Testimonial` and must never
 * reach that payload with a real value.
 *
 * These are pure unit tests against the exported redaction helper / omit
 * clause — no DB or tRPC context needed, so they run in the `unit` vitest
 * project (no Docker/Postgres required). They pin the fix for a leak where
 * both procedures did a bare `findMany` with no select/omit, shipping
 * customerEmail to every visitor.
 */
describe("redactTestimonialForPublic", () => {
  const full = {
    id: "t_1",
    customerName: "Jane Shopper",
    customerEmail: "jane@example.com",
    customerId: "cust_1",
    text: "Loved it",
  };

  it("nulls customerEmail and customerId", () => {
    const redacted = redactTestimonialForPublic(full);
    expect(redacted.customerEmail).toBeNull();
    expect(redacted.customerId).toBeNull();
  });

  it("leaves every other field untouched", () => {
    const redacted = redactTestimonialForPublic(full);
    expect(redacted.id).toBe(full.id);
    expect(redacted.customerName).toBe(full.customerName);
    expect(redacted.text).toBe(full.text);
  });

  it("is a pure function — the input object is not mutated", () => {
    redactTestimonialForPublic(full);
    expect(full.customerEmail).toBe("jane@example.com");
    expect(full.customerId).toBe("cust_1");
  });

  it("never leaks the real email string anywhere in the redacted payload", () => {
    const redacted = redactTestimonialForPublic(full);
    expect(JSON.stringify(redacted)).not.toContain(full.customerEmail);
  });
});

describe("PUBLIC_TESTIMONIAL_OMIT", () => {
  it("omits customerEmail and customerId from testimonial.listRandom", () => {
    const omit = PUBLIC_TESTIMONIAL_OMIT as Record<string, unknown>;
    expect(omit.customerEmail).toBe(true);
    expect(omit.customerId).toBe(true);
  });
});
