import { describe, expect, it } from "vitest";

import { findPlaceholders } from "./placeholders";

const doc = (...content: unknown[]) =>
  ({ type: "doc", content }) as Parameters<
    typeof findPlaceholders
  >[0]["bodyJson"];
const para = (...runs: Array<string | { text: string; bold: true }>) => ({
  type: "paragraph",
  content: runs.map((r) =>
    typeof r === "string"
      ? { type: "text", text: r }
      : { type: "text", text: r.text, marks: [{ type: "bold" }] },
  ),
});

describe("findPlaceholders", () => {
  it("finds bracketed text in subject, preview and body, deduped", () => {
    expect(
      findPlaceholders({
        subject: "[Event name] — [date]",
        previewText: "[Event name] at the shop",
        bodyJson: doc(para("Hello [Day, date, time]"), {
          type: "bulletList",
          content: [{ type: "listItem", content: [para("[Place or link]")] }],
        }),
      }),
    ).toEqual([
      "[Event name]",
      "[date]",
      "[Day, date, time]",
      "[Place or link]",
    ]);
  });

  it("sees a placeholder split across formatting marks", () => {
    expect(
      findPlaceholders({
        bodyJson: doc(
          para("[Your ", { text: "sale", bold: true }, " headline]"),
        ),
      }),
    ).toEqual(["[Your sale headline]"]);
  });

  it("ignores empty, one-character, over-long and multi-line brackets", () => {
    expect(
      findPlaceholders({
        subject: "[] [a] sizes [S/M/L]",
        previewText: `[${"x".repeat(81)}]`,
        bodyJson: doc(para("[line one"), para("line two]")),
      }),
    ).toEqual(["[S/M/L]"]);
  });

  it("returns nothing for clean content", () => {
    expect(
      findPlaceholders({ subject: "Hi", bodyJson: doc(para("All good.")) }),
    ).toEqual([]);
    expect(findPlaceholders({})).toEqual([]);
  });
});
