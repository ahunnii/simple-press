import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  productDescriptionToPlainText,
  renderProductDescription,
} from "./product-description";

function html(raw: string | null | undefined): string {
  return renderToStaticMarkup(<>{renderProductDescription(raw)}</>);
}

describe("renderProductDescription", () => {
  it("renders imported HTML with literal \\n escapes as headings and paragraphs", () => {
    const raw =
      "<h2>Stylish Warmth</h2>\\nIntroducing our <em>sleek</em> beanie.\\n<h2>Quality</h2>\\nBuilt to last.";
    expect(html(raw)).toBe(
      "<h3>Stylish Warmth</h3><p>Introducing our <em>sleek</em> beanie.</p>" +
        "<h3>Quality</h3><p>Built to last.</p>",
    );
  });

  it("keeps plain-text descriptions readable: blank lines split paragraphs, single newlines become <br>", () => {
    expect(html("First line\nsecond line\n\nNew paragraph")).toBe(
      "<p>First line<br/>second line</p><p>New paragraph</p>",
    );
  });

  it("drops unknown tags and every attribute, keeping their text", () => {
    const out = html(
      '<p onclick="x()">Hi <a href="javascript:alert(1)">there</a><script>alert(1)</script></p><img src=x onerror=alert(1)>',
    );
    expect(out).toBe("<p>Hi therealert(1)</p>");
    expect(out).not.toMatch(/onclick|href|script|img|onerror/);
  });

  it("escapes decoded entities as text rather than markup", () => {
    expect(html("5 &lt; 6 &amp; &lt;b&gt;not bold&lt;/b&gt;")).toBe(
      "<p>5 &lt; 6 &amp; &lt;b&gt;not bold&lt;/b&gt;</p>",
    );
  });

  it("renders lists", () => {
    expect(html("<ul><li>One</li><li><strong>Two</strong></li></ul>")).toBe(
      "<ul><li>One</li><li><strong>Two</strong></li></ul>",
    );
  });

  it("returns nothing for empty input", () => {
    expect(renderProductDescription("")).toEqual([]);
    expect(renderProductDescription("   ")).toEqual([]);
    expect(renderProductDescription(null)).toEqual([]);
  });
});

describe("productDescriptionToPlainText", () => {
  it("strips tags and escape sequences into one line", () => {
    expect(
      productDescriptionToPlainText(
        "<h2>Stylish Warmth</h2>\\nIntroducing our <em>sleek</em> beanie &amp; more.",
      ),
    ).toBe("Stylish Warmth Introducing our sleek beanie & more.");
  });

  it("returns an empty string for missing input", () => {
    expect(productDescriptionToPlainText(undefined)).toBe("");
  });
});
