import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { renderBoldMarkup } from "./wealth-bold-markup";

const html = (text: string) =>
  renderToStaticMarkup(<p>{renderBoldMarkup(text)}</p>);

describe("renderBoldMarkup", () => {
  it("returns plain text untouched", () => {
    expect(html("No markup here.")).toBe("<p>No markup here.</p>");
  });

  it("turns **pairs** into <strong>", () => {
    expect(html("We offer **non-extractive financing** and **more**.")).toBe(
      "<p>We offer <strong>non-extractive financing</strong> and <strong>more</strong>.</p>",
    );
  });

  it("leaves unmatched markers as literal text", () => {
    expect(html("Dangling **marker")).toBe("<p>Dangling **marker</p>");
    expect(html("Empty **** pair")).toBe("<p>Empty **** pair</p>");
  });

  it("never emits owner-typed HTML", () => {
    expect(html("**<script>alert(1)</script>** and <b>x</b>")).toBe(
      "<p><strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong> and &lt;b&gt;x&lt;/b&gt;</p>",
    );
  });
});
