import { describe, expect, it } from "vitest";

import { toMetaDescription } from "./meta-description";

describe("toMetaDescription", () => {
  it("strips HTML tags", () => {
    const result = toMetaDescription("<p>Hello <strong>world</strong></p>");
    expect(result).toBe("Hello world");
  });

  it("converts literal newline escape sequences to spaces", () => {
    const result = toMetaDescription("Line one\\nLine two");
    expect(result).toBe("Line one Line two");
  });

  it("returns the text unchanged when length <= max", () => {
    const text = "This is a short description";
    expect(toMetaDescription(text)).toBe(text);
  });

  it("truncates to word boundary when text exceeds max", () => {
    const text = "This is a longer description that should be truncated";
    const result = toMetaDescription(text, 30);
    expect(result).toBe("This is a longer description…");
    expect(result?.length).toBeLessThanOrEqual(30);
  });

  it("trims trailing punctuation before appending ellipsis", () => {
    const text = "This is a longer description, with trailing punctuation";
    const result = toMetaDescription(text, 40);
    expect(result).toMatch(/…$/);
    expect(result).not.toMatch(/[,;:.\-–—]…/);
  });

  it("returns undefined for null input", () => {
    expect(toMetaDescription(null)).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    expect(toMetaDescription(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(toMetaDescription("")).toBeUndefined();
  });

  it("returns undefined for whitespace-only string", () => {
    expect(toMetaDescription("   ")).toBeUndefined();
  });

  it("returns undefined for HTML-only content with no text", () => {
    expect(toMetaDescription("<p></p>")).toBeUndefined();
  });

  it("handles mixed HTML and text", () => {
    const result = toMetaDescription("<h1>Product</h1><p>A great item for your home</p>");
    expect(result).toBe("Product A great item for your home");
  });

  it("maintains default max of 160", () => {
    const longText = "a".repeat(200);
    const result = toMetaDescription(longText);
    expect(result).toBeDefined();
    expect((result ?? "").length).toBeLessThanOrEqual(160);
    expect((result ?? "").endsWith("…")).toBe(true);
  });

  it("handles text with multiple spaces", () => {
    const result = toMetaDescription("This   has   multiple   spaces");
    expect(result).toBe("This has multiple spaces");
  });

  it("truncates at last space within boundary", () => {
    const text = "word1 word2 word3 word4 word5";
    const result = toMetaDescription(text, 16);
    // max = 16, so we look at first 15 chars: "word1 word2 wor"
    // last space is after "word2", so we get "word1 word2…"
    expect(result).toBe("word1 word2…");
    expect(result?.length).toBeLessThanOrEqual(16);
  });

  it("handles multiple trailing punctuation marks", () => {
    const longText = "Description here with trailing punctuation marks...---";
    const result = toMetaDescription(longText, 40);
    expect(result).not.toMatch(/[.,;:\-–—]…/);
    expect(result).toMatch(/…$/);
  });
});
