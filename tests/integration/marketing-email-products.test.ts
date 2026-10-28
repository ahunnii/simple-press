import type { JSONContent } from "@tiptap/core";
import { beforeEach, describe, expect, it } from "vitest";

import {
  EMAIL_PRODUCTS_DOC_MAX_PRODUCTS,
  hydrateEmailProducts,
  SHOP_OFF_WARNING,
  TOO_MANY_PRODUCTS_WARNING,
} from "~/lib/marketing/email-products";
import { tiptapToEmailHtml } from "~/lib/marketing/tiptap-to-email";

import { db, resetDb } from "../helpers/db";
import { createBusiness, createProduct } from "../helpers/factories";

/**
 * `hydrateEmailProducts` (`src/lib/marketing/email-products.ts`) rebuilds the
 * email product blocks from the database before a campaign is previewed or
 * queued. A draft's snapshot (price, name, slug, photo) is never trusted:
 * only the ids and their order survive, and products from another store or
 * unpublished ones are dropped with a warning.
 */
describe("hydrateEmailProducts", () => {
  beforeEach(resetDb);

  async function seed() {
    const biz = await createBusiness();
    const other = await createBusiness();

    const plain = await createProduct(biz.id, {
      name: "Plain Tote",
      price: 2000,
    });
    await db.image.createMany({
      data: [
        {
          url: "https://cdn.test/tote-2.jpg",
          sortOrder: 2,
          productId: plain.id,
        },
        {
          url: "https://cdn.test/tote-1.jpg",
          sortOrder: 1,
          productId: plain.id,
        },
      ],
    });

    const sale = await createProduct(biz.id, { name: "Sale Mug", price: 1200 });
    await db.product.update({
      where: { id: sale.id },
      data: { compareAtPrice: 1600 },
    });

    const variants = await createProduct(biz.id, {
      name: "Variant Tee",
      price: 3000,
    });
    await db.productVariant.createMany({
      data: [
        {
          productId: variants.id,
          name: "Large",
          price: 3500,
          options: { size: "L" },
        },
        {
          productId: variants.id,
          name: "Small",
          price: 2200,
          compareAtPrice: 2800,
          options: { size: "S" },
        },
      ],
    });

    const draft = await createProduct(biz.id, {
      name: "Draft Hat",
      published: false,
    });
    const foreign = await createProduct(other.id, { name: "Foreign Scarf" });

    return { biz, other, plain, sale, variants, draft, foreign };
  }

  const snapshot = (productId: string, name: string) => ({
    productId,
    name,
    slug: "fake-slug",
    imageUrl: "https://evil.test/fake.jpg",
    priceCents: 1,
    compareAtCents: 999999,
  });

  it("rebuilds items from the database and drops foreign/unpublished ones", async () => {
    const { biz, plain, sale, variants, draft, foreign } = await seed();

    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hi" }] },
        {
          type: "emailProducts",
          attrs: {
            buttonLabel: "  Grab   it ",
            items: [
              snapshot(variants.id, "Cheap Tee"),
              snapshot(foreign.id, "Foreign Scarf"),
              snapshot(plain.id, "Hacked"),
              snapshot(sale.id, "Mug"),
              // A repeat of the same product is dropped.
              snapshot(sale.id, "Mug again"),
            ],
          },
        },
        {
          type: "emailProducts",
          attrs: {
            items: [
              snapshot(foreign.id, "Foreign Scarf"),
              snapshot(draft.id, "Draft Hat"),
            ],
          },
        },
        { type: "emailProducts", attrs: { items: [] } },
      ],
    };
    const before = structuredClone(doc);

    const result = await hydrateEmailProducts(db, biz.id, doc);

    // Input untouched; output is a different object.
    expect(doc).toEqual(before);
    expect(result.doc).not.toBe(doc);

    const blocks = result.doc.content!.filter(
      (n) => n.type === "emailProducts",
    );
    expect(blocks[0]!.attrs!.buttonLabel).toBe("Grab it");
    expect(blocks[0]!.attrs!.items).toEqual([
      {
        productId: variants.id,
        name: "Variant Tee",
        imageUrl: null,
        priceCents: 2200,
        compareAtCents: 2800,
        slug: variants.slug,
      },
      {
        productId: plain.id,
        name: "Plain Tote",
        imageUrl: "https://cdn.test/tote-1.jpg",
        priceCents: 2000,
        compareAtCents: null,
        slug: plain.slug,
      },
      {
        productId: sale.id,
        name: "Sale Mug",
        imageUrl: null,
        priceCents: 1200,
        compareAtCents: 1600,
        slug: sale.slug,
      },
    ]);
    expect(blocks[1]!.attrs!.items).toEqual([]);
    expect(blocks[2]!.attrs!.items).toEqual([]);

    expect(result.emptyProductBlocks).toBe(2);
    expect(result.warnings.sort()).toEqual(
      [
        '"Draft Hat" is no longer available and was left out.',
        '"Foreign Scarf" is no longer available and was left out.',
      ].sort(),
    );
    // Non-product content passes through.
    expect(result.doc.content![0]).toEqual(doc.content![0]);
  });

  it("reports nothing for a doc without product blocks", async () => {
    const { biz } = await seed();
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }],
    };
    const result = await hydrateEmailProducts(db, biz.id, doc);
    expect(result).toEqual({ doc, warnings: [], emptyProductBlocks: 0 });
    expect(result.doc).not.toBe(doc);
  });

  it("drops a product unpublished after it was picked", async () => {
    const { biz, plain } = await seed();
    await db.product.update({
      where: { id: plain.id },
      data: { published: false },
    });
    const result = await hydrateEmailProducts(db, biz.id, {
      type: "doc",
      content: [
        {
          type: "emailProducts",
          attrs: { items: [{ productId: plain.id }] },
        },
      ],
    });
    expect(result.emptyProductBlocks).toBe(1);
    expect(result.warnings).toEqual([
      "A product is no longer available and was left out.",
    ]);
  });

  it("hydrates a product block nested 20 lists deep (and the walker renders the fresh item)", async () => {
    const { biz, plain } = await seed();
    let node: JSONContent = {
      type: "emailProducts",
      attrs: { items: [snapshot(plain.id, "Fake Tote")] },
    };
    for (let i = 0; i < 20; i++) {
      node = {
        type: "bulletList",
        content: [{ type: "listItem", content: [node] }],
      };
    }
    const result = await hydrateEmailProducts(db, biz.id, {
      type: "doc",
      content: [node],
    });

    let block = result.doc.content![0]!;
    while (block.type !== "emailProducts") block = block.content![0]!;
    expect(block.attrs!.items).toEqual([
      {
        productId: plain.id,
        name: "Plain Tote",
        imageUrl: "https://cdn.test/tote-1.jpg",
        priceCents: 2000,
        compareAtCents: null,
        slug: plain.slug,
      },
    ]);
    expect(result.emptyProductBlocks).toBe(0);

    // The email walker reaches it too, and shows only the database values.
    const { html } = tiptapToEmailHtml(result.doc, {
      baseUrl: "https://shop.test",
    });
    expect(html).toContain("Plain Tote");
    expect(html).not.toContain("Fake Tote");
    expect(html).not.toContain("evil.test");
  });

  it("leaves every block empty when the shop (products flag) is off", async () => {
    const { biz, plain, sale } = await seed();
    await db.business.update({
      where: { id: biz.id },
      data: { featureFlags: { products: false } },
    });
    const result = await hydrateEmailProducts(db, biz.id, {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hi" }] },
        {
          type: "emailProducts",
          attrs: { items: [snapshot(plain.id, "Tote")] },
        },
        {
          type: "emailProducts",
          attrs: { items: [snapshot(sale.id, "Mug")] },
        },
      ],
    });
    expect(result.emptyProductBlocks).toBe(2);
    expect(result.warnings).toEqual([SHOP_OFF_WARNING]);
    for (const n of result.doc.content!.slice(1)) {
      expect(n.attrs!.items).toEqual([]);
    }
  });

  it(`hydrates at most ${EMAIL_PRODUCTS_DOC_MAX_PRODUCTS} distinct products per document`, async () => {
    const biz = await createBusiness();
    const products = await Promise.all(
      Array.from({ length: EMAIL_PRODUCTS_DOC_MAX_PRODUCTS + 4 }, (_, i) =>
        createProduct(biz.id, { name: `P${i}`, price: 100 + i }),
      ),
    );
    // Full blocks of 4 distinct products each, then one block that only
    // repeats products already shown.
    const blocks: JSONContent[] = [];
    for (let i = 0; i < products.length; i += 4) {
      blocks.push({
        type: "emailProducts",
        attrs: {
          items: products
            .slice(i, i + 4)
            .map((p) => ({ productId: p.id, name: p.name })),
        },
      });
    }
    blocks.push({
      type: "emailProducts",
      attrs: { items: [{ productId: products[0]!.id }] },
    });

    const result = await hydrateEmailProducts(db, biz.id, {
      type: "doc",
      content: blocks,
    });
    const out = result.doc.content!;
    const lastFull = EMAIL_PRODUCTS_DOC_MAX_PRODUCTS / 4;
    for (let i = 0; i < lastFull; i++) {
      expect(out[i]!.attrs!.items).toHaveLength(4);
    }
    // The block past the cap is emptied; a repeat-only block still renders.
    expect(out[lastFull]!.attrs!.items).toEqual([]);
    expect(out[lastFull + 1]!.attrs!.items).toHaveLength(1);
    expect(result.emptyProductBlocks).toBe(1);
    expect(result.warnings).toEqual([TOO_MANY_PRODUCTS_WARNING]);
  });
});
