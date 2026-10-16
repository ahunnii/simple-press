import type { JSONContent } from "@tiptap/core";
import { getSchema } from "@tiptap/core";
import { generateHTML } from "@tiptap/html/server";
import { describe, expect, it } from "vitest";

import { preserveBlankLines } from "./blank-lines";
import { RENDERER_BASE_EXTENSIONS } from "./renderer-extensions";
import { sanitizeTiptapDoc } from "./sanitize";
import {
  coerceSpacerSize,
  DEFAULT_SPACER_SIZE,
  SPACER_SIZES,
  spacerClassName,
} from "./spacer-node";

const schema = getSchema(RENDERER_BASE_EXTENSIONS);

const doc = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
});
const spacer = (size?: unknown): JSONContent =>
  size === undefined
    ? { type: "spacer" }
    : { type: "spacer", attrs: { size } as Record<string, unknown> };
const para = (text?: string): JSONContent =>
  text
    ? { type: "paragraph", content: [{ type: "text", text }] }
    : { type: "paragraph" };

/** generateHTML minus the XHTML namespace the server build stamps on. */
const render = (content: JSONContent) =>
  generateHTML(content, RENDERER_BASE_EXTENSIONS).replaceAll(
    ' xmlns="http://www.w3.org/1999/xhtml"',
    "",
  );

describe("coerceSpacerSize", () => {
  it.each(SPACER_SIZES)("keeps a known size (%s)", (size) => {
    expect(coerceSpacerSize(size)).toBe(size);
  });

  it.each([undefined, null, "", "xl", "MD", 2, {}, '"><script>'])(
    "falls back to the default for %j",
    (value) => {
      expect(coerceSpacerSize(value)).toBe(DEFAULT_SPACER_SIZE);
    },
  );

  it("defaults to md", () => {
    expect(DEFAULT_SPACER_SIZE).toBe("md");
    expect(spacerClassName("md")).toBe("sp-spacer sp-spacer--md");
  });
});

describe("spacer rendering (RENDERER_BASE_EXTENSIONS)", () => {
  it.each(SPACER_SIZES)("renders the %s markup", (size) => {
    expect(render(doc(spacer(size)))).toBe(
      `<div class="sp-spacer sp-spacer--${size}" data-type="spacer" data-size="${size}" aria-hidden="true"></div>`,
    );
  });

  it("renders a spacer with no attrs at the default size", () => {
    expect(render(doc(spacer()))).toContain(
      'class="sp-spacer sp-spacer--md" data-type="spacer" data-size="md"',
    );
  });

  it("coerces a bogus size to md and never emits the raw value", () => {
    const html = render(doc(spacer('xl" onload="alert(1)')));
    expect(html).toBe(
      '<div class="sp-spacer sp-spacer--md" data-type="spacer" data-size="md" aria-hidden="true"></div>',
    );
    expect(html).not.toContain("onload");
  });

  it("is allowed inside a columns row and a collapsible body", () => {
    const html = render(
      doc(
        {
          type: "columns",
          attrs: { layout: "2" },
          content: [
            { type: "column", content: [para("A"), spacer("lg"), para("B")] },
            { type: "column", content: [para("C")] },
          ],
        },
        {
          type: "details",
          content: [
            { type: "detailsSummary", content: [{ type: "text", text: "Q" }] },
            { type: "detailsContent", content: [spacer("sm")] },
          ],
        },
      ),
    );
    expect(html).toContain('<p>A</p><div class="sp-spacer sp-spacer--lg"');
    expect(html).toContain('class="sp-spacer sp-spacer--sm"');
  });
});

describe("spacer through sanitizeTiptapDoc", () => {
  it("keeps a spacer and its size", () => {
    const input = doc(para("Above"), spacer("lg"), para("Below"));
    expect(sanitizeTiptapDoc(input, schema)).toEqual(input);
  });

  it("keeps a spacer with a bogus size (the renderer coerces it)", () => {
    const out = sanitizeTiptapDoc(doc(spacer("huge")), schema);
    expect(out?.content?.[0]?.type).toBe("spacer");
    expect(render(out!)).toContain('data-size="md"');
  });

  it("drops style/class smuggled onto a spacer", () => {
    const out = sanitizeTiptapDoc(
      doc({
        type: "spacer",
        attrs: { size: "sm", style: "height:900px", class: "evil" },
      }),
      schema,
    );
    expect(out?.content?.[0]?.attrs).toEqual({ size: "sm" });
  });
});

describe("spacer and preserveBlankLines", () => {
  it("leaves a spacer untouched (it is not a paragraph)", () => {
    const input = doc(para("Above"), spacer("sm"), para("Below"));
    expect(preserveBlankLines(input)).toEqual(input);
  });
});
