import { describe, expect, it } from "vitest";

import type { TemplateField } from "~/lib/template-fields";

import { resolveTemplateFields } from "./resolve-template-fields";

function field(
  key: string,
  partial: Partial<TemplateField> = {},
): TemplateField {
  return {
    key,
    label: key,
    description: "",
    page: "homepage",
    type: "text",
    ...partial,
  } as TemplateField;
}

function mapOf(...fields: TemplateField[]): Map<string, TemplateField> {
  return new Map(fields.map((f) => [f.key, f]));
}

/**
 * `customFields` is `z.any()` on the wire, so this read-time pass is the only
 * place a `type: "url"` template field is scheme-checked before a template
 * renders it as an `href`.
 */
describe("resolveTemplateFields — url fields", () => {
  const fieldMap = mapOf(
    field("t.cta-link", { type: "url", defaultValue: "/shop" }),
    field("t.heading", { type: "text" }),
  );

  it("passes a safe url through", () => {
    const out = resolveTemplateFields(
      { "t.cta-link": "https://example.com/x" },
      ["t.cta-link"],
      fieldMap,
    );
    expect(out["t.cta-link"]).toBe("https://example.com/x");
  });

  it("keeps relative and fragment links", () => {
    const out = resolveTemplateFields(
      { "t.cta-link": "/collections/new" },
      ["t.cta-link"],
      fieldMap,
    );
    expect(out["t.cta-link"]).toBe("/collections/new");
  });

  it("blanks an unsafe url so the caller's `|| fallback` takes over", () => {
    for (const bad of [
      "javascript:alert(1)",
      "data:text/html;base64,AAA",
      "%6Aavascript:alert(1)",
    ]) {
      const out = resolveTemplateFields(
        { "t.cta-link": bad },
        ["t.cta-link"],
        fieldMap,
      );
      expect(out["t.cta-link"]).toBe("");
    }
  });

  it("falls back to the platform-authored default when unset", () => {
    expect(
      resolveTemplateFields({}, ["t.cta-link"], fieldMap)["t.cta-link"],
    ).toBe("/shop");
  });

  it("leaves non-url fields untouched", () => {
    const out = resolveTemplateFields(
      { "t.heading": "javascript:not a link, just text" },
      ["t.heading"],
      fieldMap,
    );
    expect(out["t.heading"]).toBe("javascript:not a link, just text");
  });

  it("returns '' for an unknown key", () => {
    expect(resolveTemplateFields({}, ["nope"], fieldMap).nope).toBe("");
  });
});
