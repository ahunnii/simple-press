import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildProductSchema } from "~/lib/structured-data";

import { JsonLd } from "./json-ld";

const business = {
  subdomain: "testshop",
  customDomain: null,
  domainStatus: null,
  name: "Test Shop",
};

const baseProduct = {
  name: "Test Product",
  slug: "test-product",
  price: 1000,
  images: [],
  averageRating: null,
  reviewCount: 0,
  trackInventory: false,
  inventoryQty: 0,
  allowBackorders: false,
};

describe("JsonLd XSS prevention", () => {
  it("escapes < in product names to prevent </script> breakout", () => {
    const maliciousSchema = buildProductSchema(
      {
        ...baseProduct,
        name: "Widget</script><script>alert(1)</script>",
      },
      business,
    );

    const output = renderToStaticMarkup(<JsonLd data={maliciousSchema} />);

    // Verify the malicious closing tag is escaped and not present as unescaped
    expect(output).not.toContain("</script><script>");
    // Verify it contains the escaped form
    expect(output).toContain("\\u003c");
    // Verify the script tag is still there
    expect(output).toContain('type="application/ld+json"');
  });
});
