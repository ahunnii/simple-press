import { describe, expect, it } from "vitest";

import { previewPageFlag } from "./preview-paths";

describe("previewPageFlag", () => {
  it("maps flag-gated pages to their feature flag", () => {
    expect(previewPageFlag("products")).toBe("products");
    expect(previewPageFlag("shop")).toBe("products");
    expect(previewPageFlag("events")).toBe("events");
    expect(previewPageFlag("blog")).toBe("blog");
    expect(previewPageFlag("services")).toBe("services");
    expect(previewPageFlag("collections")).toBe("collections");
    expect(previewPageFlag("videos")).toBe("videos");
    expect(previewPageFlag("donate")).toBe("donations");
    expect(previewPageFlag("testimonials")).toBe("testimonials");
  });

  it("gates the product page on the shop's flag", () => {
    expect(previewPageFlag("product")).toBe("products");
  });

  it("leaves ungated pages alone", () => {
    expect(previewPageFlag("homepage")).toBeNull();
    expect(previewPageFlag("about")).toBeNull();
    expect(previewPageFlag("contact")).toBeNull();
    expect(previewPageFlag("faq")).toBeNull();
    expect(previewPageFlag("authentication")).toBeNull();
  });

  it("returns null for unknown page keys", () => {
    expect(previewPageFlag("nope")).toBeNull();
    expect(previewPageFlag("")).toBeNull();
  });
});
