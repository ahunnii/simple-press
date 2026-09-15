import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { RENDERER_BASE_EXTENSIONS } from "./renderer-extensions";
import { isSafeImageSrc, sanitizeTiptapDoc } from "./sanitize";

/**
 * Built exactly the way `TiptapRenderer` builds its schema, minus the three
 * custom nodes (Gallery/Embed/QuoteCalculator) whose React node views cannot
 * be imported from a node test. `unknown node survives when the schema
 * declares it` below covers the mechanism those three rely on.
 */
const schema = getSchema(RENDERER_BASE_EXTENSIONS);

const doc = (...content: unknown[]) => ({ type: "doc", content });
const para = (...content: unknown[]) => ({ type: "paragraph", content });
const text = (value: string, marks?: unknown[]) =>
  marks ? { type: "text", text: value, marks } : { type: "text", text: value };

describe("sanitizeTiptapDoc — envelope", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "hello"],
    ["an array", []],
    ["a non-doc node", { type: "paragraph", content: [] }],
    ["a doc with no content array", { type: "doc" }],
  ])("returns null for %s", (_label, input) => {
    expect(sanitizeTiptapDoc(input, schema)).toBeNull();
  });
});

describe("sanitizeTiptapDoc — clean content round-trips", () => {
  it("returns a deep-equal copy of a rich but legitimate document", () => {
    const input = doc(
      {
        type: "heading",
        attrs: { level: 2, textAlign: "center" },
        content: [text("Title")],
      },
      para(
        text("Hello "),
        text("world", [{ type: "bold" }, { type: "italic" }]),
        text(" and ", [{ type: "underline" }, { type: "strike" }]),
        text("a link", [
          {
            type: "link",
            attrs: { href: "https://example.com", target: "_blank" },
          },
        ]),
        { type: "hardBreak" },
      ),
      { type: "blockquote", content: [para(text("Quoted."))] },
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [para(text("one"))] },
          { type: "listItem", content: [para(text("two"))] },
        ],
      },
      {
        type: "orderedList",
        attrs: { start: 1, type: null },
        content: [{ type: "listItem", content: [para(text("first"))] }],
      },
      {
        type: "codeBlock",
        attrs: { language: null },
        content: [text("const a = 1;")],
      },
      { type: "horizontalRule" },
      {
        type: "image",
        attrs: {
          src: "https://cdn.example.com/a.png",
          alt: "A",
          title: null,
          width: null,
          height: null,
        },
      },
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableHeader",
                attrs: { colspan: 1, rowspan: 1, colwidth: [120], align: null },
                content: [para(text("H"))],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null },
                content: [para(text("C"))],
              },
            ],
          },
        ],
      },
    );
    const snapshot = structuredClone(input);

    expect(sanitizeTiptapDoc(input, schema)).toEqual(input);
    // The same JSON object is reused across renders — it must not be touched.
    expect(input).toEqual(snapshot);
  });

  it("returns a structurally new object", () => {
    const input = doc(para(text("hi")));
    const out = sanitizeTiptapDoc(input, schema);
    expect(out).not.toBe(input);
    expect(out?.content?.[0]).not.toBe(input.content[0]);
  });

  it("round-trips the TipTap fixture prisma/seed-demo.ts stores", () => {
    // `doc(text)` in prisma/seed-demo.ts — the only inline TipTap JSON in any
    // seed file. seed.ts and seed-relocation.ts contain none.
    const seeded = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This is a sample blog post on the demo store.",
            },
          ],
        },
      ],
    };
    expect(sanitizeTiptapDoc(seeded, schema)).toEqual(seeded);
  });
});

describe("sanitizeTiptapDoc — link marks", () => {
  it("drops a javascript: link mark but keeps its text", () => {
    const out = sanitizeTiptapDoc(
      doc(
        para(
          text("click me", [
            { type: "link", attrs: { href: "javascript:alert(1)" } },
          ]),
        ),
      ),
      schema,
    );
    expect(out).toEqual(
      doc(para({ type: "text", text: "click me", marks: [] })),
    );
  });

  it.each([
    "data:text/html;base64,AAA",
    "vbscript:x",
    "%6Aavascript:alert(1)",
    "java\tscript:1",
  ])("drops a link mark pointing at %s", (href) => {
    const out = sanitizeTiptapDoc(
      doc(para(text("t", [{ type: "link", attrs: { href } }]))),
      schema,
    );
    expect(out?.content?.[0]?.content?.[0]?.marks).toEqual([]);
  });

  it("keeps relative, mailto and tel links", () => {
    for (const href of ["/shop", "#top", "mailto:a@b.c", "tel:+15551234567"]) {
      const out = sanitizeTiptapDoc(
        doc(para(text("t", [{ type: "link", attrs: { href } }]))),
        schema,
      );
      expect(out?.content?.[0]?.content?.[0]?.marks?.[0]?.attrs?.href).toBe(
        href,
      );
    }
  });

  it("drops a stored rel (the renderer force-sets it) and a bogus target", () => {
    const out = sanitizeTiptapDoc(
      doc(
        para(
          text("t", [
            {
              type: "link",
              attrs: {
                href: "https://x.test",
                rel: "dofollow",
                target: "javascript:1",
              },
            },
          ]),
        ),
      ),
      schema,
    );
    expect(out?.content?.[0]?.content?.[0]?.marks?.[0]?.attrs).toEqual({
      href: "https://x.test",
    });
  });

  it("keeps _blank and _self targets", () => {
    for (const target of ["_blank", "_self"]) {
      const out = sanitizeTiptapDoc(
        doc(
          para(
            text("t", [
              { type: "link", attrs: { href: "https://x.test", target } },
            ]),
          ),
        ),
        schema,
      );
      expect(out?.content?.[0]?.content?.[0]?.marks?.[0]?.attrs?.target).toBe(
        target,
      );
    }
  });

  it("drops a link mark with no href at all", () => {
    const out = sanitizeTiptapDoc(
      doc(para(text("t", [{ type: "link", attrs: {} }]))),
      schema,
    );
    expect(out?.content?.[0]?.content?.[0]?.marks).toEqual([]);
  });
});

describe("sanitizeTiptapDoc — marks the renderer's schema doesn't know", () => {
  it("drops an unknown mark and keeps the text", () => {
    const out = sanitizeTiptapDoc(
      doc(para(text("t", [{ type: "evil" }, { type: "bold" }]))),
      schema,
    );
    expect(out?.content?.[0]?.content?.[0]).toEqual({
      type: "text",
      text: "t",
      marks: [{ type: "bold" }],
    });
  });

  it("strips a textStyle `color` attr the storefront schema never declares", () => {
    // Verified against this exact extension list: `schema.marks.textStyle.spec.attrs`
    // is `{}` — the admin editor registers Color/TextStyle-with-types, the
    // storefront registers bare TextStyle, so a saved colour has nowhere to go.
    expect(Object.keys(schema.marks.textStyle?.spec.attrs ?? {})).toEqual([]);

    const out = sanitizeTiptapDoc(
      doc(
        para(
          text("t", [
            { type: "textStyle", attrs: { color: "#ff0000", style: "x" } },
          ]),
        ),
      ),
      schema,
    );
    expect(out?.content?.[0]?.content?.[0]?.marks).toEqual([
      { type: "textStyle", attrs: {} },
    ]);
  });
});

describe("sanitizeTiptapDoc — images", () => {
  it("keeps a base64 raster image (FileHandler inserts these)", () => {
    const src = "data:image/png;base64,iVBORw0KGgo=";
    const out = sanitizeTiptapDoc(
      doc({ type: "image", attrs: { src } }),
      schema,
    );
    expect(out?.content?.[0]?.attrs?.src).toBe(src);
  });

  it.each([
    "data:text/html;base64,AAA",
    "data:image/svg+xml;base64,AAA",
    "javascript:alert(1)",
    "blob:https://x/y",
    "file:///etc/passwd",
  ])("drops the whole image node for src %s", (src) => {
    expect(
      sanitizeTiptapDoc(doc({ type: "image", attrs: { src } }), schema),
    ).toEqual(doc());
  });

  it("keeps http(s) and relative srcs", () => {
    for (const src of ["https://cdn.example.com/a.png", "/uploads/a.png"]) {
      const out = sanitizeTiptapDoc(
        doc({ type: "image", attrs: { src } }),
        schema,
      );
      expect(out?.content).toHaveLength(1);
    }
  });

  it("drops non-string alt / title", () => {
    const out = sanitizeTiptapDoc(
      doc({ type: "image", attrs: { src: "/a.png", alt: 5, title: true } }),
      schema,
    );
    expect(out?.content?.[0]?.attrs).toEqual({ src: "/a.png" });
  });

  it("isSafeImageSrc refuses non-strings and blanks", () => {
    expect(isSafeImageSrc(null)).toBe(false);
    expect(isSafeImageSrc("")).toBe(false);
    expect(isSafeImageSrc("   ")).toBe(false);
  });
});

describe("sanitizeTiptapDoc — unknown nodes", () => {
  it("drops a script wrapper and hoists its text into the parent paragraph", () => {
    const out = sanitizeTiptapDoc(
      doc(
        para(
          text("before "),
          { type: "script", content: [text("alert(1)")] },
          text(" after"),
        ),
      ),
      schema,
    );
    expect(out).toEqual(
      doc(para(text("before "), text("alert(1)"), text(" after"))),
    );
  });

  it("drops an iframe wrapper at doc level, and its inline children with it", () => {
    // `doc` is `block+`; a hoisted text node has no legal home there, so it
    // goes rather than producing a document ProseMirror cannot build.
    const out = sanitizeTiptapDoc(
      doc({
        type: "iframe",
        attrs: { src: "javascript:1" },
        content: [text("x")],
      }),
      schema,
    );
    expect(out).toEqual(doc());
  });

  it("hoists a block child out of an unknown block wrapper", () => {
    const out = sanitizeTiptapDoc(
      doc({ type: "mystery", content: [para(text("kept"))] }),
      schema,
    );
    expect(out).toEqual(doc(para(text("kept"))));
  });

  it("survives when the schema DOES declare the node (the gallery/embed case)", () => {
    // Gallery/Embed/QuoteCalculator are in the renderer's real extension list,
    // so their nodes are in its schema and pass through untouched — exactly
    // like `image` does here.
    const node = { type: "image", attrs: { src: "/a.png" } };
    expect(sanitizeTiptapDoc(doc(node), schema)).toEqual(doc(node));
  });

  it("drops malformed entries", () => {
    expect(
      sanitizeTiptapDoc(doc(null, "x", 5, {}, { type: "" }), schema),
    ).toEqual(doc());
  });

  it("drops a text node whose `text` is not a non-empty string", () => {
    const out = sanitizeTiptapDoc(
      doc(
        para({ type: "text", text: 5 }, { type: "text", text: "" }, text("ok")),
      ),
      schema,
    );
    expect(out).toEqual(doc(para(text("ok"))));
  });
});

describe("sanitizeTiptapDoc — attrs", () => {
  it("drops event handlers, style and class even on a known node", () => {
    const out = sanitizeTiptapDoc(
      doc({
        type: "paragraph",
        attrs: {
          textAlign: "center",
          onerror: "alert(1)",
          onclick: "x",
          style: "color:red",
          class: "evil",
        },
        content: [text("t")],
      }),
      schema,
    );
    expect(out?.content?.[0]?.attrs).toEqual({ textAlign: "center" });
  });

  it("drops attrs the schema does not declare", () => {
    const out = sanitizeTiptapDoc(
      doc({
        type: "heading",
        attrs: { level: 2, nonsense: "x" },
        content: [text("t")],
      }),
      schema,
    );
    expect(out?.content?.[0]?.attrs).toEqual({ level: 2 });
  });

  it("drops object-valued attrs but keeps a flat primitive array (colwidth)", () => {
    const out = sanitizeTiptapDoc(
      doc({
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                attrs: {
                  colwidth: [120, 80],
                  colspan: { evil: true },
                  rowspan: 1,
                },
                content: [para(text("c"))],
              },
            ],
          },
        ],
      }),
      schema,
    );
    expect(out?.content?.[0]?.content?.[0]?.content?.[0]?.attrs).toEqual({
      colwidth: [120, 80],
      rowspan: 1,
    });
  });

  it("omits attrs / marks entirely when the input had none", () => {
    const out = sanitizeTiptapDoc(doc(para(text("t"))), schema);
    const node = out?.content?.[0];
    expect(node && "attrs" in node).toBe(false);
    expect(node && "marks" in node).toBe(false);
  });
});
