import { describe, expect, it } from "vitest";

import {
  isEmptyPlaceholderNode,
  stripEmptyPlaceholderNodes,
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
