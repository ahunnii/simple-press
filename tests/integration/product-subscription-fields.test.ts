import type { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  productCreateSchema,
  productUpdateSchema,
} from "~/lib/validators/product";

import { createTestCaller } from "../helpers/caller";
import { resetDb } from "../helpers/db";
import {
  createBusiness,
  createMembership,
  createOwnerUser,
  createUser,
} from "../helpers/factories";

/**
 * RED (test-first) coverage for the product-side subscription fields (plan
 * §2/§8/§13 "Product validators/router" row):
 * `Product.subscriptionEnabled` / `subscriptionIntervals` / `subscriptionDiscountPercent`,
 * surfaced on the product form via `productSubscriptionFieldsSchema`
 * (`~/lib/validators/subscription`, already implemented — Phase 1d) and
 * expected to be merged into `productFormObjectSchema` /
 * `productCreateSchema` / `productUpdateSchema`
 * (`~/lib/validators/product`) plus persisted by `product.create` /
 * `product.update` (`~/server/api/routers/product.ts`). None of that merge
 * work exists yet, so this file fails on ASSERTIONS and zod rejections, not
 * module resolution — every import below already resolves today.
 *
 * Why the zod-schema tests fail today: `z.object()` defaults to "strip"
 * mode, so passing `subscriptionEnabled`/`subscriptionIntervals`/
 * `subscriptionDiscountPercent` into `productCreateSchema.parse()` right now
 * silently DROPS them rather than rejecting — the parsed result simply lacks
 * the keys. That's why "accepts and retains" and "defaults to false/[]/0"
 * both fail today (the fields come back `undefined`, not `true`/`false`/`[]`/
 * `0`), and why "rejects an unknown interval key" / "rejects
 * subscriptionDiscountPercent: 95" both fail today too (current `success` is
 * `true` — the bad value is stripped, not validated).
 *
 * PINNED INTERPRETATION: `Product.subscriptionIntervals` is `Json?` with NO
 * `@default` at the column level (unlike `subscriptionEnabled`
 * `@default(false)` and `subscriptionDiscountPercent` `@default(0)`, which
 * are both already correct even without any router change, since Prisma
 * applies those column defaults whenever `create`'s `data:` object omits the
 * field entirely). So the ONLY genuinely-new work `product.create` needs for
 * the "omitted" case is to explicitly write `[]` (not rely on the column
 * default, which is `null`) — see the plan's own "(recommend `[]` JSON,
 * decide and pin)" note. This file pins `[]`.
 */

const reqHost = vi.hoisted(() => ({ value: "sub-prod.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

let seq = 0;
function uniqSlug(): string {
  return `sub-prod-${Date.now().toString(36)}-${seq++}`;
}

/** Minimal valid `productCreateSchema`/`productUpdateSchema` payload. */
function basePayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "Subscribable Widget",
    slug: uniqSlug(),
    price: 1500,
    published: true,
    featured: false,
    trackInventory: false,
    allowBackorders: false,
    variants: [],
    ...overrides,
  };
}

// The zod-schema tests below call `.safeParse()`/`.parse()` directly, which
// accept `unknown`, so `basePayload`'s loose `Record<string, unknown>` return
// type is exactly right there — some of those tests deliberately pass
// invalid values (an unknown interval key, an out-of-range discount percent)
// to prove the schema rejects them. The router-call tests further down send
// their payload straight into the typed tRPC caller, though, which needs the
// real input shape rather than an untyped bag of properties. These two
// wrappers give the router-call tests that shape while reusing the exact
// same literal defaults as `basePayload`.
type ProductCreateInput = z.input<typeof productCreateSchema>;
type ProductUpdateInput = z.input<typeof productUpdateSchema>;

function createProductPayload(
  overrides: Partial<ProductCreateInput> = {},
): ProductCreateInput {
  return basePayload(overrides) as unknown as ProductCreateInput;
}

function updateProductPayload(
  overrides: Partial<ProductUpdateInput> & Pick<ProductUpdateInput, "id">,
): ProductUpdateInput {
  return basePayload(overrides) as unknown as ProductUpdateInput;
}

async function setup() {
  const business = await createBusiness({ subdomain: "sub-prod" });
  reqHost.value = `${business.subdomain}.simplepress.test`;
  const owner = await createOwnerUser(business.id);
  const staffUser = await createUser({ name: "Sub Prod Staff" });
  await createMembership(business.id, staffUser.id, "STAFF");
  return {
    business,
    ownerCaller: createTestCaller({ userId: owner.id }),
    staffCaller: createTestCaller({ userId: staffUser.id }),
  };
}

describe("product subscription fields (validators/product.ts + routers/product.ts)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  // ── zod schema: productCreateSchema ───────────────────────────────────────

  describe("productCreateSchema", () => {
    it("accepts and retains subscriptionEnabled/subscriptionIntervals/subscriptionDiscountPercent", () => {
      const result = productCreateSchema.safeParse(
        basePayload({
          subscriptionEnabled: true,
          subscriptionIntervals: ["week:1", "month:1"],
          subscriptionDiscountPercent: 15,
        }),
      );

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.subscriptionEnabled).toBe(true);
      expect(result.data.subscriptionIntervals).toEqual(["week:1", "month:1"]);
      expect(result.data.subscriptionDiscountPercent).toBe(15);
    });

    it("defaults to false / [] / 0 when the fields are omitted", () => {
      const result = productCreateSchema.parse(basePayload());
      expect(result.subscriptionEnabled).toBe(false);
      expect(result.subscriptionIntervals).toEqual([]);
      expect(result.subscriptionDiscountPercent).toBe(0);
    });

    it("rejects an unknown subscription interval key", () => {
      const result = productCreateSchema.safeParse(
        basePayload({ subscriptionIntervals: ["not-a-real-interval"] }),
      );
      expect(result.success).toBe(false);
    });

    it("rejects subscriptionDiscountPercent: 95 (above the 90 cap)", () => {
      const result = productCreateSchema.safeParse(
        basePayload({ subscriptionDiscountPercent: 95 }),
      );
      expect(result.success).toBe(false);
    });
  });

  // ── zod schema: productUpdateSchema (id-bearing sibling) ──────────────────

  describe("productUpdateSchema", () => {
    it("accepts and retains the three fields, keyed the same way as create", () => {
      const result = productUpdateSchema.safeParse(
        basePayload({
          id: "prod_x",
          subscriptionEnabled: true,
          subscriptionIntervals: ["month:2"],
          subscriptionDiscountPercent: 10,
        }),
      );

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.subscriptionEnabled).toBe(true);
      expect(result.data.subscriptionIntervals).toEqual(["month:2"]);
      expect(result.data.subscriptionDiscountPercent).toBe(10);
    });

    it("rejects an unknown subscription interval key", () => {
      const result = productUpdateSchema.safeParse(
        basePayload({ id: "prod_x", subscriptionIntervals: ["bogus"] }),
      );
      expect(result.success).toBe(false);
    });
  });

  // ── router: product.create / product.update persist the fields ───────────

  it("product.create persists the three fields, and product.get (public) returns them", async () => {
    const { ownerCaller } = await setup();
    const slug = uniqSlug();

    await ownerCaller.product.create(
      createProductPayload({
        slug,
        subscriptionEnabled: true,
        subscriptionIntervals: ["week:1", "month:1"],
        subscriptionDiscountPercent: 12,
      }),
    );

    const publicView = await ownerCaller.product.get(slug);
    expect(publicView?.subscriptionEnabled).toBe(true);
    expect(publicView?.subscriptionIntervals).toEqual(["week:1", "month:1"]);
    expect(publicView?.subscriptionDiscountPercent).toBe(12);
  });

  it("product.create without the fields leaves defaults — subscriptionIntervals stores [] (not null)", async () => {
    const { ownerCaller } = await setup();
    const slug = uniqSlug();

    await ownerCaller.product.create(createProductPayload({ slug }));

    const { db } = await import("../helpers/db");
    const row = await db.product.findFirstOrThrow({ where: { slug } });
    expect(row.subscriptionEnabled).toBe(false);
    expect(row.subscriptionIntervals).toEqual([]);
    expect(row.subscriptionDiscountPercent).toBe(0);
  });

  it("product.update persists a change to the three fields", async () => {
    const { ownerCaller } = await setup();
    const slug = uniqSlug();
    await ownerCaller.product.create(createProductPayload({ slug }));
    const { db } = await import("../helpers/db");
    const row = await db.product.findFirstOrThrow({ where: { slug } });

    await ownerCaller.product.update(
      updateProductPayload({
        id: row.id,
        slug,
        subscriptionEnabled: true,
        subscriptionIntervals: ["month:3"],
        subscriptionDiscountPercent: 20,
      }),
    );

    const updated = await db.product.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(updated.subscriptionEnabled).toBe(true);
    expect(updated.subscriptionIntervals).toEqual(["month:3"]);
    expect(updated.subscriptionDiscountPercent).toBe(20);
  });

  it("product.update rejects subscriptionEnabled: true with an empty subscriptionIntervals array", async () => {
    const { ownerCaller } = await setup();
    const slug = uniqSlug();
    await ownerCaller.product.create(createProductPayload({ slug }));
    const { db } = await import("../helpers/db");
    const row = await db.product.findFirstOrThrow({ where: { slug } });

    await expect(
      ownerCaller.product.update(
        updateProductPayload({
          id: row.id,
          slug,
          subscriptionEnabled: true,
          subscriptionIntervals: [],
        }),
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Choose at least one subscription cadence",
    });

    // Untouched: the rejected update must not have partially applied.
    const untouched = await db.product.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(untouched.subscriptionEnabled).toBe(false);
  });

  it("STAFF cannot call product.update — already-enforced tier, pinned here for the subscription fields too", async () => {
    const { ownerCaller, staffCaller } = await setup();
    const slug = uniqSlug();
    await ownerCaller.product.create(createProductPayload({ slug }));
    const { db } = await import("../helpers/db");
    const row = await db.product.findFirstOrThrow({ where: { slug } });

    await expect(
      staffCaller.product.update(
        updateProductPayload({
          id: row.id,
          slug,
          subscriptionEnabled: true,
          subscriptionIntervals: ["month:1"],
        }),
      ),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Not a business member",
    });
  });
});
