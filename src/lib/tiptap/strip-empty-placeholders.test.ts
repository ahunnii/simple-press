import { describe, expect, it } from "vitest";

import {
  isEmptyPlaceholderNode,
  isUnfinishedUploadNode,
  stripEmptyPlaceholderNodes,
  stripEmptyPlaceholdersInFields,
} from "./strip-empty-placeholders";

const doc = (...content: unknown[]) => ({ type: "doc", content });
const para = (text?: string) =>
  text
    ? { type: "paragraph", content: [{ type: "text", text }] }
    : { type: "paragraph" };
const embed = (attrs: Record<string, unknown> = { src: null }) => ({
  type: "embed",
  attrs: {
    src: null,
    height: null,
    title: null,
    aspectRatio: null,
    maxWidth: null,
    displayMode: null,
    triggerLabel: null,
    ...attrs,
  },
});
const filledEmbed = embed({
  src: "https://www.youtube.com/embed/abc123",
  title: "Promo video",
  aspectRatio: "16:9",
});

describe("isEmptyPlaceholderNode", () => {
  it.each([
    ["embed src null", embed()],
    ["embed src empty string", embed({ src: "" })],
    ["embed src whitespace", embed({ src: "   " })],
    ["embed with no attrs at all", { type: "embed" }],
    [
      "gallery id null",
      { type: "gallery", attrs: { galleryId: null, businessId: "b1" } },
    ],
    [
      "quote calculator id null",
      { type: "quoteCalculator", attrs: { calculatorId: null } },
    ],
    ["form id null", { type: "form", attrs: { formId: null } }],
  ])("true for %s", (_label, node) => {
    expect(isEmptyPlaceholderNode(node)).toBe(true);
  });

  it.each([
    ["a filled embed", filledEmbed],
    ["a filled gallery", { type: "gallery", attrs: { galleryId: "g1" } }],
    [
      "a filled quote calculator",
      { type: "quoteCalculator", attrs: { calculatorId: "q1" } },
    ],
    ["a filled form", { type: "form", attrs: { formId: "f1" } }],
    ["a paragraph", para("hi")],
    [
      "an image with no src (not a placeholder type)",
      { type: "image", attrs: { src: null } },
    ],
    [
      "a video with no src (not a placeholder type)",
      { type: "video", attrs: { src: null } },
    ],
    ["null", null],
    ["a string", "embed"],
    ["an array", [embed()]],
  ])("false for %s", (_label, node) => {
    expect(isEmptyPlaceholderNode(node)).toBe(false);
  });
});

describe("stripEmptyPlaceholderNodes", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an HTML string", "<p>hello</p>"],
    ["a number", 42],
    ["an empty object", {}],
  ])("returns %s untouched", (_label, input) => {
    expect(stripEmptyPlaceholderNodes(input)).toBe(input);
  });

  it("removes a top-level empty embed and keeps its siblings in order", () => {
    const input = doc(para("intro"), embed(), para("outro"));
    expect(stripEmptyPlaceholderNodes(input)).toEqual(
      doc(para("intro"), para("outro")),
    );
  });

  it("keeps a filled embed (with all its attrs)", () => {
    const input = doc(para("intro"), filledEmbed);
    const out = stripEmptyPlaceholderNodes(input);
    expect(out).toBe(input);
    expect(out).toEqual(doc(para("intro"), filledEmbed));
  });

  it("removes only the empty embed when filled and empty embeds are mixed", () => {
    const input = doc(filledEmbed, embed(), embed({ src: "" }), filledEmbed);
    expect(stripEmptyPlaceholderNodes(input)).toEqual(
      doc(filledEmbed, filledEmbed),
    );
  });

  it("returns the same reference when nothing is removed", () => {
    const input = doc(
      para("a"),
      { type: "blockquote", content: [para("b"), filledEmbed] },
      { type: "image", attrs: { src: "https://x/y.png" } },
    );
    expect(stripEmptyPlaceholderNodes(input)).toBe(input);
  });

  it("does not mutate the input", () => {
    const input = doc(para("a"), embed());
    const snapshot = JSON.stringify(input);
    stripEmptyPlaceholderNodes(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("removes an empty embed nested inside a blockquote", () => {
    const input = doc({
      type: "blockquote",
      content: [para("quoted"), embed()],
    });
    expect(stripEmptyPlaceholderNodes(input)).toEqual(
      doc({ type: "blockquote", content: [para("quoted")] }),
    );
  });

  it("removes an empty embed deep inside a table and backfills an emptied cell", () => {
    const input = doc({
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableCell", attrs: { colspan: 1 }, content: [embed()] },
            { type: "tableCell", attrs: { colspan: 1 }, content: [para("x")] },
          ],
        },
      ],
    });
    expect(stripEmptyPlaceholderNodes(input)).toEqual(
      doc({
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                attrs: { colspan: 1 },
                content: [{ type: "paragraph" }],
              },
              {
                type: "tableCell",
                attrs: { colspan: 1 },
                content: [para("x")],
              },
            ],
          },
        ],
      }),
    );
  });

  it("backfills a column emptied by the removal with an empty paragraph", () => {
    const input = doc({
      type: "columns",
      attrs: { layout: "2" },
      content: [
        { type: "column", content: [embed()] },
        { type: "column", content: [para("kept")] },
      ],
    });
    expect(stripEmptyPlaceholderNodes(input)).toEqual(
      doc({
        type: "columns",
        attrs: { layout: "2" },
        content: [
          { type: "column", content: [{ type: "paragraph" }] },
          { type: "column", content: [para("kept")] },
        ],
      }),
    );
  });

  it("backfills an emptied detailsContent but never refills a detailsSummary", () => {
    const blobImage = { type: "image", attrs: { src: "blob:http://x/1" } };
    const input = doc({
      type: "details",
      content: [
        // Inline content (`text*`): a paragraph here would be invalid.
        { type: "detailsSummary", content: [blobImage] },
        { type: "detailsContent", content: [{ type: "form", attrs: {} }] },
      ],
    });
    expect(stripEmptyPlaceholderNodes(input)).toEqual(
      doc({
        type: "details",
        content: [
          { type: "detailsSummary" },
          { type: "detailsContent", content: [{ type: "paragraph" }] },
        ],
      }),
    );
  });

  it("leaves untouched branches as the same references", () => {
    const untouched = { type: "blockquote", content: [para("keep")] };
    const input = doc(untouched, embed());
    const out = stripEmptyPlaceholderNodes(input);
    expect(out.content[0]).toBe(untouched);
  });

  it("yields the canonical empty doc when the embed was the only node", () => {
    expect(stripEmptyPlaceholderNodes(doc(embed()))).toEqual(doc());
  });

  it("also strips empty gallery / quote calculator / form placeholders", () => {
    const input = doc(
      para("a"),
      { type: "gallery", attrs: { galleryId: null, businessId: "b1" } },
      { type: "gallery", attrs: { galleryId: "g1", businessId: "b1" } },
      { type: "quoteCalculator", attrs: { calculatorId: null } },
      { type: "form", attrs: { formId: null } },
      { type: "form", attrs: { formId: "f1" } },
    );
    expect(stripEmptyPlaceholderNodes(input)).toEqual(
      doc(
        para("a"),
        { type: "gallery", attrs: { galleryId: "g1", businessId: "b1" } },
        { type: "form", attrs: { formId: "f1" } },
      ),
    );
  });

  it("leaves other node types (images, videos, marks, text) untouched", () => {
    const input = doc(
      {
        type: "paragraph",
        content: [
          { type: "text", text: "bold", marks: [{ type: "bold" }] },
          { type: "hardBreak" },
        ],
      },
      { type: "image", attrs: { src: null } },
      { type: "video", attrs: { src: null } },
      { type: "horizontalRule" },
      embed(),
    );
    expect(stripEmptyPlaceholderNodes(input)).toEqual(
      doc(
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bold", marks: [{ type: "bold" }] },
            { type: "hardBreak" },
          ],
        },
        { type: "image", attrs: { src: null } },
        { type: "video", attrs: { src: null } },
        { type: "horizontalRule" },
      ),
    );
  });
});

describe("unfinished image uploads", () => {
  const blobImage = {
    type: "image",
    attrs: { src: "blob:http://demo.localhost:3000/3f2a", alt: "a.png" },
  };
  const storedImage = {
    type: "image",
    attrs: { src: "https://storage.example.com/a.png", alt: "a.png" },
  };

  it("flags only images whose src is a blob: URL", () => {
    expect(isUnfinishedUploadNode(blobImage)).toBe(true);
    expect(
      isUnfinishedUploadNode({ type: "image", attrs: { src: " BLOB:x" } }),
    ).toBe(true);
    expect(isUnfinishedUploadNode(storedImage)).toBe(false);
    expect(
      isUnfinishedUploadNode({
        type: "image",
        attrs: { src: "data:image/png;base64,AAAA" },
      }),
    ).toBe(false);
    expect(
      isUnfinishedUploadNode({ type: "video", attrs: { src: "blob:x" } }),
    ).toBe(false);
    expect(isUnfinishedUploadNode({ type: "image" })).toBe(false);
  });

  it("removes blob: images and keeps stored ones", () => {
    expect(
      stripEmptyPlaceholderNodes(doc(para("a"), blobImage, storedImage)),
    ).toEqual(doc(para("a"), storedImage));
  });

  it("removes a blob: image nested in a blockquote and backfills it", () => {
    expect(
      stripEmptyPlaceholderNodes(
        doc({ type: "blockquote", content: [blobImage] }),
      ),
    ).toEqual(doc({ type: "blockquote", content: [{ type: "paragraph" }] }));
  });

  it("leaves an emptied paragraph valid (no nested block)", () => {
    expect(
      stripEmptyPlaceholderNodes(
        doc({
          type: "paragraph",
          attrs: { textAlign: null },
          content: [blobImage],
        }),
      ),
    ).toEqual(doc({ type: "paragraph", attrs: { textAlign: null } }));
  });

  it("strips blob: images inside string-encoded field docs", () => {
    const fields = { body: JSON.stringify(doc(para("x"), blobImage)) };
    const out = stripEmptyPlaceholdersInFields(fields);
    expect(JSON.parse(out.body)).toEqual(doc(para("x")));
  });
});

describe("stripEmptyPlaceholdersInFields", () => {
  const richWithPlaceholder = () => doc(para("intro"), embed(), filledEmbed);
  const richStripped = doc(para("intro"), filledEmbed);

  it("strips object-encoded docs stored as field values", () => {
    const fields = {
      "pink.about.body": richWithPlaceholder(),
      "pink.about.title": "About us",
    };
    expect(stripEmptyPlaceholdersInFields(fields)).toEqual({
      "pink.about.body": richStripped,
      "pink.about.title": "About us",
    });
  });

  it("strips string-encoded docs and re-serializes only those", () => {
    const fields = {
      "noise.home.body": JSON.stringify(richWithPlaceholder()),
      "noise.home.clean": JSON.stringify(doc(para("hi"), filledEmbed)),
    };
    const out = stripEmptyPlaceholdersInFields(fields);
    expect(JSON.parse(out["noise.home.body"])).toEqual(richStripped);
    // Nothing to remove → the exact original string (formatting preserved).
    expect(out["noise.home.clean"]).toBe(fields["noise.home.clean"]);
  });

  it("keeps a pretty-printed doc string byte-identical when it has no placeholder", () => {
    const pretty = JSON.stringify(doc(para("x"), filledEmbed), null, 2);
    expect(stripEmptyPlaceholdersInFields({ k: pretty }).k).toBe(pretty);
  });

  it("walks list rows and strips docs in their cells", () => {
    const rows = [
      { title: "One", body: richWithPlaceholder() },
      { title: "Two", body: "plain text" },
    ];
    const out = stripEmptyPlaceholdersInFields({ "vii.list": rows });
    expect(out["vii.list"]).toEqual([
      { title: "One", body: richStripped },
      { title: "Two", body: "plain text" },
    ]);
    // The untouched row keeps its identity.
    expect(out["vii.list"][1]).toBe(rows[1]);
  });

  it("never alters non-doc values", () => {
    const iframe = JSON.stringify({
      src: "https://example.com/embed",
      height: 400,
    });
    const embedLookingJson = JSON.stringify({ type: "embed", src: null });
    const fields = {
      text: "Hello",
      braces: "{not json",
      iframe,
      embedLookingJson,
      num: 3,
      bool: true,
      nil: null,
      empty: "",
      // A bare placeholder node that is NOT inside a doc is not rich text.
      looseNode: embed(),
    };
    const out = stripEmptyPlaceholdersInFields(fields);
    expect(out).toBe(fields);
    expect(out).toEqual({ ...fields });
  });

  it("returns the input by reference when nothing was removed", () => {
    const fields = {
      a: doc(para("a"), filledEmbed),
      b: JSON.stringify(doc(para("b"))),
      list: [{ c: doc(para("c")) }],
    };
    expect(stripEmptyPlaceholdersInFields(fields)).toBe(fields);
  });

  it("preserves identity of unchanged siblings when one value changes", () => {
    const clean = doc(para("clean"));
    const fields = { dirty: richWithPlaceholder(), clean };
    const out = stripEmptyPlaceholdersInFields(fields);
    expect(out).not.toBe(fields);
    expect(out.clean).toBe(clean);
  });

  it("handles a product additionalFields blob", () => {
    const additionalFields = {
      additionalInformation: doc(
        para("Care"),
        { type: "gallery", attrs: { galleryId: null } },
        { type: "quoteCalculator", attrs: { calculatorId: null } },
      ),
      productFeatures: [{ icon: "leaf", text: "Organic" }],
      comingSoon: false,
      productTagline: null,
    };
    const out = stripEmptyPlaceholdersInFields(additionalFields);
    expect(out).toEqual({
      ...additionalFields,
      additionalInformation: doc(para("Care")),
    });
    expect(out.productFeatures).toBe(additionalFields.productFeatures);
  });

  it("passes through non-object top-level input", () => {
    expect(stripEmptyPlaceholdersInFields(null)).toBeNull();
    expect(stripEmptyPlaceholdersInFields(undefined)).toBeUndefined();
    expect(stripEmptyPlaceholdersInFields("plain")).toBe("plain");
  });
});
