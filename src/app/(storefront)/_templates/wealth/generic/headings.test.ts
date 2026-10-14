import { describe, expect, it } from "vitest";

import { assignHeadingIds, extractH2Headings } from "./headings";

const h = (level: number, text: string) => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});

describe("extractH2Headings", () => {
  it("returns h2s only, in order, with slug ids", () => {
    const doc = {
      type: "doc",
      content: [h(2, "Who we lend to:"), h(3, "Skip me"), h(2, "Our Process")],
    };
    expect(extractH2Headings(doc)).toEqual([
      { id: "who-we-lend-to", text: "Who we lend to:" },
      { id: "our-process", text: "Our Process" },
    ]);
  });

  it("dedupes repeated headings and finds nested ones", () => {
    const doc = {
      type: "doc",
      content: [h(2, "FAQ"), { type: "blockquote", content: [h(2, "FAQ")] }],
    };
    expect(extractH2Headings(doc).map((x) => x.id)).toEqual(["faq", "faq-2"]);
  });

  it("avoids ids the page already uses and tolerates junk", () => {
    expect(extractH2Headings({ content: [h(2, "Page title")] })[0]?.id).toBe(
      "page-title-section",
    );
    expect(extractH2Headings(null)).toEqual([]);
    expect(extractH2Headings({ content: [h(2, "!!!")] })[0]?.id).toBe(
      "section",
    );
  });
});

describe("assignHeadingIds", () => {
  const headings = [
    { id: "one", text: "One" },
    { id: "two", text: "Two  words" },
    { id: "three", text: "Three" },
  ];

  it("pairs rendered h2s with ids in order", () => {
    expect(assignHeadingIds(["One", "Two words", "Three"], headings)).toEqual([
      "one",
      "two",
      "three",
    ]);
  });

  it("skips empty rendered headings without shifting later ids", () => {
    expect(
      assignHeadingIds(["One", "  ", "Two words", "Three"], headings),
    ).toEqual(["one", null, "two", "three"]);
  });

  it("leaves a rendered heading unmatched when the JSON did not list it", () => {
    expect(assignHeadingIds(["One", "Extra", "Three"], headings)).toEqual([
      "one",
      null,
      "three",
    ]);
  });
});
