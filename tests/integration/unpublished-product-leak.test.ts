import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCollection,
  createCollectionProduct,
  createEvent,
  createProduct,
} from "../helpers/factories";

// Every procedure under test is a `publicProcedure` that resolves its tenant
// from the request host (`getBusinessProcedure` / `checkBusiness`), so the host
// has to be mockable per-test.
const reqHost = vi.hoisted(() => ({ value: "leaktest.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

/**
 * Draft (`published: false`) products must never reach the storefront. This is a
 * recurring bug class in this codebase — the top-level `where` gates the
 * business or the collection, and a nested `collectionProducts.product` include
 * silently doesn't. Every leak found in the 2026-07-31 audit is covered here, so
 * new public procedures that enumerate products should be added to this file.
 */
describe("unpublished products never leak to the storefront", () => {
  beforeEach(resetDb);

  /**
   * One published + one draft product, both in the same published collection.
   * `comingSoon: false` is set because `business.getHomepage` additionally
   * requires that key to be explicitly false — without it the homepage assertion
   * would pass for the wrong reason.
   */
  async function seed() {
    const business = await createBusiness({
      subdomain: "leaktest",
      // `collections` is enabledByDefault: false in the feature registry, so the
      // collections procedures would 403 before ever running their query.
      featureFlags: { collections: true },
    });
    reqHost.value = "leaktest.simplepress.test";

    const live = await createProduct(business.id, {
      name: "Live Product",
      price: 5000,
      published: true,
      additionalFields: { comingSoon: false },
    });
    // A second published product so `getRelated` — which excludes its own anchor
    // product — has something legitimate to return.
    const liveB = await createProduct(business.id, {
      name: "Live Product B",
      price: 6000,
      published: true,
      additionalFields: { comingSoon: false },
    });
    const draft = await createProduct(business.id, {
      name: "Draft Product",
      // Deliberately the cheapest product: pink's collection stats compute a
      // "from $X" price, so a leak shows up as a wrong price, not just a card.
      price: 100,
      published: false,
      additionalFields: { comingSoon: false },
    });

    const collection = await createCollection(business.id, {
      name: "All Products",
      slug: "all-products",
    });
    await createCollectionProduct(collection.id, live.id, { sortOrder: 0 });
    await createCollectionProduct(collection.id, draft.id, { sortOrder: 1 });

    return {
      business,
      live,
      liveB,
      draft,
      collection,
      caller: createTestCaller({}),
    };
  }

  const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

  it("omits drafts from product list procedures", async () => {
    const { live, liveB, draft, caller } = await seed();

    // [procedure, rows, id that must still be present]
    const cases: [string, { id: string }[], string][] = [
      ["product.getFeatured", await caller.product.getFeatured(), live.id],
      [
        "product.getRailProducts",
        await caller.product.getRailProducts(),
        live.id,
      ],
      [
        // Anchored on `live`, so the expected survivor is the *other* published
        // product — getRelated always excludes its own anchor.
        "product.getRelated",
        await caller.product.getRelated({ productId: live.id }),
        liveB.id,
      ],
    ];

    for (const [name, rows, expectedId] of cases) {
      expect(ids(rows), `${name} leaked the draft product`).not.toContain(
        draft.id,
      );
      expect(ids(rows), `${name} dropped a published product`).toContain(
        expectedId,
      );
    }
  });

  it("omits drafts from collection procedures", async () => {
    const { live, draft, collection, caller } = await seed();

    const bySlug = await caller.collections.getBySlug(collection.slug);
    const bySlugIds = bySlug.collectionProducts.map((cp) => cp.product.id);
    expect(bySlugIds, "collections.getBySlug leaked the draft").not.toContain(
      draft.id,
    );
    expect(bySlugIds).toContain(live.id);

    const byId = await caller.collections.getProductsByCollectionId(
      collection.id,
    );
    expect(byId).not.toBeNull();
    expect(
      ids(byId!.products),
      "collections.getProductsByCollectionId leaked the draft",
    ).not.toContain(draft.id);
    expect(ids(byId!.products)).toContain(live.id);
  });

  it("counts only published products in public collection counts", async () => {
    const { collection, caller } = await seed();

    const all = await caller.collections.getAllPublic();
    const row = all.find((c) => c.id === collection.id);
    expect(row).toBeDefined();
    // Two pivot rows exist, but only one points at a published product.
    expect(row!._count.collectionProducts).toBe(1);
  });

  it("omits drafts from business storefront payloads", async () => {
    const { live, draft, caller } = await seed();

    const homepage = await caller.business.getHomepage();
    expect(homepage).not.toBeNull();
    expect(
      ids(homepage!.products),
      "getHomepage leaked the draft",
    ).not.toContain(draft.id);
    expect(ids(homepage!.products)).toContain(live.id);

    const shop = await caller.business.getWithProducts();
    expect(shop).not.toBeNull();
    expect(
      ids(shop!.products),
      "getWithProducts leaked the draft",
    ).not.toContain(draft.id);
    expect(ids(shop!.products)).toContain(live.id);
  });

  it("does not price drafts in shipping quotes", async () => {
    const { business, draft, caller } = await seed();

    // `shipping.quote` only returns `shippingCents`, so the subtotal is observed
    // indirectly: with a $1.00 free-shipping threshold, quoting the $1.00 draft
    // returns 0 if its price was counted and the flat 500 if it was filtered out.
    await db.business.update({
      where: { id: business.id },
      data: {
        shippingType: "flat_rate_with_threshold",
        shippingFlatRate: 500,
        freeShippingThreshold: 100,
      },
    });

    const quote = await caller.shipping.quote({
      items: [{ productId: draft.id, variantId: null, quantity: 1 }],
      destinationState: "MI",
      destinationCountry: "US",
      deliveryMethod: "ship",
    });
    expect(quote.shippingCents, "shipping.quote priced a draft product").toBe(
      500,
    );
  });
});

/**
 * Same bug class, different model: `events.getUpcomingPublic` is a new public
 * procedure that enumerates records, so it belongs in this file per the note
 * above.
 */
describe("draft events never leak to the storefront", () => {
  beforeEach(resetDb);

  it("omits an unpublished event from the public upcoming list", async () => {
    const business = await createBusiness({
      subdomain: "leaktest-events",
      // `events` is enabledByDefault: false, same trap as `collections` above.
      featureFlags: { events: true },
    });
    reqHost.value = "leaktest-events.simplepress.test";

    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const live = await createEvent(business.id, {
      name: "Live Event",
      published: true,
      startAt: future,
    });
    const draft = await createEvent(business.id, {
      name: "Draft Event",
      published: false,
      startAt: future,
    });

    const result = await createTestCaller({}).events.getUpcomingPublic();
    const ids = result.map((e) => e.id);

    expect(ids, "events.getUpcomingPublic leaked the draft").not.toContain(
      draft.id,
    );
    expect(ids).toContain(live.id);
  });
});
