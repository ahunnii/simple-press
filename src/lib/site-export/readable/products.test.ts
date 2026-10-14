import { describe, expect, it } from "vitest";

import { ctx, product } from "./fixtures";
import {
  renderCollectionsDoc,
  renderProductDoc,
  renderProductsIndex,
} from "./products";

describe("renderProductDoc", () => {
  const path = "Products/Blue Mug.html";

  it("points photos at the local Photos folder with a relative, encoded path", () => {
    const html = renderProductDoc(product(), ctx, path);
    expect(html).toContain('src="../Photos/Products/Blue%20Mug/01.jpg"');
    expect(html).not.toContain("cdn.example.com");
  });

  it("falls back to the remote URL when the photo is not in the export", () => {
    const html = renderProductDoc(
      product({ images: [{ url: "https://other.example.com/x.jpg" }] }),
      ctx,
      path,
    );
    expect(html).toContain('src="https://other.example.com/x.jpg"');
  });

  it("escapes hostile text everywhere", () => {
    const html = renderProductDoc(
      product({
        name: '<img src=x onerror="alert(1)">',
        description: "<script>alert(1)</script>",
        sku: '"><b>',
        collections: ["<i>Sale</i>"],
      }),
      ctx,
      path,
    );
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<i>Sale");
    expect(html).toContain("&lt;script&gt;");
    // store name in the header is escaped too
    expect(html).toContain("Mug &amp; Co &lt;script&gt;");
  });

  it("drops empty fields and sections", () => {
    const html = renderProductDoc(product(), ctx, path);
    expect(html).not.toContain("Compare-at price");
    expect(html).not.toContain("SKU");
    expect(html).not.toContain("Options and variants");
    expect(html).not.toContain("Search engine details");
    expect(html).toContain("$18.50");
    expect(html).toContain("<p>A nice mug.</p><p>Dishwasher safe.</p>");
  });

  it("renders a variants table with option columns and falls back to product price", () => {
    const html = renderProductDoc(
      product({
        trackInventory: true,
        variants: [
          { name: "Small / Red", sku: "S-R", price: null, compareAtPrice: null, inventoryQty: 3, options: { size: "Small", color: "Red" }, imageUrl: null },
          { name: "Large / Red", sku: null, price: 2200, compareAtPrice: 2500, inventoryQty: 0, options: { size: "Large", color: "Red" }, imageUrl: null },
        ],
      }),
      ctx,
      path,
    );
    expect(html).toContain("Options and variants");
    expect(html).toContain('<th scope="col">Size</th>');
    expect(html).toContain('<th scope="col">Color</th>');
    expect(html).toContain("<td>$18.50</td>");
    expect(html).toContain("<td>$22.00</td>");
  });

  it("has breadcrumbs back to the products index and START HERE", () => {
    const html = renderProductDoc(product(), ctx, path);
    expect(html).toContain('href="../START%20HERE.html"');
    expect(html).toContain('href="index.html"');
  });
});

describe("renderProductsIndex / collections", () => {
  it("lists products with thumbnails relative to the index", () => {
    const html = renderProductsIndex(
      [{ product: product(), path: "Products/Blue Mug.html" }],
      ctx,
      true,
    );
    expect(html).toContain('src="../Photos/Products/Blue%20Mug/01.jpg"');
    expect(html).toContain('href="Blue%20Mug.html"');
    expect(html).toContain('href="Collections.html"');
  });

  it("links collection products to their docs", () => {
    const html = renderCollectionsDoc(
      [
        {
          id: "c1",
          name: "Mugs",
          slug: "mugs",
          description: null,
          imageUrl: null,
          published: true,
          metaTitle: null,
          metaDescription: null,
          products: [{ name: "Blue Mug", slug: "blue-mug" }, { name: "Gone", slug: "gone" }],
        },
      ],
      new Map([["blue-mug", "Products/Blue Mug.html"]]),
      ctx,
    );
    expect(html).toContain('href="Blue%20Mug.html"');
    expect(html).toContain("<li>Gone</li>");
    expect(html).toContain('id="collection-mugs"');
  });
});
