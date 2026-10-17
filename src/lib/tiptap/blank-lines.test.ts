import { generateHTML } from "@tiptap/html/server";
import { describe, expect, it } from "vitest";

import { isEmptyParagraph, preserveBlankLines } from "./blank-lines";
import { RENDERER_BASE_EXTENSIONS } from "./renderer-extensions";

const doc = (...content: unknown[]) => ({ type: "doc", content });
const text = (value: string) => ({ type: "text", text: value });
const para = (...content: unknown[]) => ({ type: "paragraph", content });
const empty = (attrs?: Record<string, unknown>) =>
  attrs ? { type: "paragraph", attrs } : { type: "paragraph" };
const br = () => ({ type: "hardBreak" });
const heading = (value: string) => ({
  type: "heading",
  attrs: { level: 2 },
  content: [text(value)],
});

describe("isEmptyParagraph", () => {
  it("treats missing, empty and whitespace-only content as empty", () => {
    expect(isEmptyParagraph({ type: "paragraph" })).toBe(true);
    expect(isEmptyParagraph({ type: "paragraph", content: [] })).toBe(true);
    expect(isEmptyParagraph(para(text("   "), text("\n")))).toBe(true);
  });

  it("does not treat text, hardBreaks or other nodes as empty", () => {
    expect(isEmptyParagraph(para(text("hi")))).toBe(false);
    expect(isEmptyParagraph(para(br()))).toBe(false);
    expect(isEmptyParagraph(heading("x"))).toBe(false);
    expect(isEmptyParagraph(null)).toBe(false);
  });
});

describe("preserveBlankLines — interior empties", () => {
  it("turns a single interior empty paragraph into a hardBreak paragraph", () => {
    const out = preserveBlankLines(
      doc(para(text("A")), empty(), para(text("B"))),
    );
    expect(out).toEqual(
      doc(
        para(text("A")),
        { type: "paragraph", content: [br()] },
        para(text("B")),
      ),
    );
  });

  it("pads several empties in a row, one hardBreak each", () => {
    const out = preserveBlankLines(
      doc(para(text("A")), empty(), empty(), empty(), para(text("B"))),
    );
    expect(out.content).toHaveLength(5);
    for (const i of [1, 2, 3]) {
      expect(out.content[i]).toEqual({ type: "paragraph", content: [br()] });
    }
  });

  it("treats a whitespace-only text paragraph as empty", () => {
    const out = preserveBlankLines(
      doc(para(text("A")), para(text("  ")), para(text("B"))),
    );
    expect(out.content[1]).toEqual({ type: "paragraph", content: [br()] });
  });

  it("preserves attrs such as textAlign", () => {
    const out = preserveBlankLines(
      doc(para(text("A")), empty({ textAlign: "center" }), para(text("B"))),
    );
    expect(out.content[1]).toEqual({
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [br()],
    });
  });
});

describe("preserveBlankLines — leading and trailing empties", () => {
  it("drops leading and trailing empty paragraphs", () => {
    const out = preserveBlankLines(
      doc(empty(), empty(), para(text("A")), empty(), empty()),
    );
    expect(out).toEqual(doc(para(text("A"))));
  });

  it("drops the TrailingNode paragraph after a heading", () => {
    const out = preserveBlankLines(doc(para(text("A")), heading("H"), empty()));
    expect(out).toEqual(doc(para(text("A")), heading("H")));
  });

  it("keeps exactly one unpadded paragraph when everything is empty", () => {
    const out = preserveBlankLines(doc(empty(), empty(), empty()));
    expect(out).toEqual(doc(empty()));
  });
});

describe("preserveBlankLines — hardBreaks", () => {
  it("adds a second hardBreak when a paragraph ends with one", () => {
    const out = preserveBlankLines(doc(para(text("A"), br())));
    expect(out).toEqual(doc(para(text("A"), br(), br())));
  });

  it("leaves a mid-paragraph hardBreak alone", () => {
    const input = doc(para(text("A"), br(), text("B")));
    expect(preserveBlankLines(input)).toEqual(input);
  });

  it("does not double-pad an empty paragraph that became a hardBreak", () => {
    const out = preserveBlankLines(
      doc(para(text("A")), empty(), para(text("B"))),
    );
    expect(out.content[1]).toEqual({ type: "paragraph", content: [br()] });
  });
});

describe("preserveBlankLines — nested containers", () => {
  it("handles columns > column", () => {
    const out = preserveBlankLines(
      doc({
        type: "columns",
        attrs: { layout: "two" },
        content: [
          {
            type: "column",
            content: [
              empty(),
              para(text("A")),
              empty(),
              para(text("B")),
              empty(),
            ],
          },
          { type: "column", content: [empty()] },
        ],
      }),
    );
    const [col1, col2] = (
      out.content[0] as { content: { content: unknown[] }[] }
    ).content;
    expect(col1!.content).toEqual([
      para(text("A")),
      { type: "paragraph", content: [br()] },
      para(text("B")),
    ]);
    expect(col2!.content).toEqual([empty()]);
  });

  it("handles details > detailsContent", () => {
    const out = preserveBlankLines(
      doc({
        type: "details",
        content: [
          { type: "detailsSummary", content: [text("Q")] },
          {
            type: "detailsContent",
            content: [para(text("A")), empty(), para(text("B")), empty()],
          },
        ],
      }),
    );
    const details = out.content[0] as { content: { content: unknown[] }[] };
    expect(details.content[0]).toEqual({
      type: "detailsSummary",
      content: [text("Q")],
    });
    expect(details.content[1]!.content).toEqual([
      para(text("A")),
      { type: "paragraph", content: [br()] },
      para(text("B")),
    ]);
  });
});

describe("preserveBlankLines — safety", () => {
  it("returns non-doc input unchanged", () => {
    const p = para(text("A"));
    expect(preserveBlankLines(null)).toBeNull();
    expect(preserveBlankLines("x")).toBe("x");
    expect(preserveBlankLines(p)).toBe(p);
    const noContent = { type: "doc" };
    expect(preserveBlankLines(noContent)).toBe(noContent);
  });

  it("does not mutate its input", () => {
    const input = doc(
      empty(),
      para(text("A"), br()),
      empty({ textAlign: "left" }),
      para(text("B")),
      empty(),
    );
    const snapshot = structuredClone(input);
    preserveBlankLines(input);
    expect(input).toEqual(snapshot);
  });
});

describe("preserveBlankLines — rendering", () => {
  it("renders an interior empty paragraph as <p><br></p>", () => {
    const html = generateHTML(
      preserveBlankLines(
        doc(para(text("A")), empty(), para(text("B"))),
      ) as Parameters<typeof generateHTML>[0],
      RENDERER_BASE_EXTENSIONS,
    );
    expect(html).toMatch(/<p[^>]*>A<\/p><p[^>]*><br ?\/?><\/p><p[^>]*>B<\/p>/);
    expect(html).not.toMatch(/<p[^>]*><\/p>/);
  });
});

describe("preserveBlankLines — container padding", () => {
  const image = { type: "image", attrs: { src: "/a.png" } };
  const table = { type: "table", content: [] };

  it("drops the editor's trailing empty paragraph after an image in a column", () => {
    const out = preserveBlankLines(
      doc({
        type: "columns",
        attrs: { layout: "2" },
        content: [
          { type: "column", content: [para(text("A")), image, empty()] },
          { type: "column", content: [para(text("B"))] },
        ],
      }),
    );
    expect(out).toEqual(
      doc({
        type: "columns",
        attrs: { layout: "2" },
        content: [
          { type: "column", content: [para(text("A")), image] },
          { type: "column", content: [para(text("B"))] },
        ],
      }),
    );
  });

  it("drops the trailing empty paragraph after a table in a collapsible body", () => {
    const out = preserveBlankLines(
      doc({
        type: "details",
        content: [
          { type: "detailsSummary", content: [text("Q")] },
          { type: "detailsContent", content: [table, empty()] },
        ],
      }),
    );
    expect(out).toEqual(
      doc({
        type: "details",
        content: [
          { type: "detailsSummary", content: [text("Q")] },
          { type: "detailsContent", content: [table] },
        ],
      }),
    );
  });
});
