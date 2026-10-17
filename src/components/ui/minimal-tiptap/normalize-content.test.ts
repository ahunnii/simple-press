import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { getEditorContentKey, isEditorContentEqual } from "./normalize-content";

const doc = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
});
const para = (text?: string): JSONContent =>
  text
    ? { type: "paragraph", content: [{ type: "text", text }] }
    : { type: "paragraph" };
const rule: JSONContent = { type: "horizontalRule" };
const row = (...columns: JSONContent[][]): JSONContent => ({
  type: "columns",
  attrs: { layout: "2" },
  content: columns.map((content) => ({ type: "column", content })),
});
const details = (...body: JSONContent[]): JSONContent => ({
  type: "details",
  content: [
    { type: "detailsSummary", content: [{ type: "text", text: "Q" }] },
    { type: "detailsContent", content: body },
  ],
});

describe("isEditorContentEqual — container padding", () => {
  it("ignores the padding paragraph after an atom at the end of a column", () => {
    const saved = doc(row([para("A"), rule], [para("B")]), para("end"));
    const opened = doc(
      row([para("A"), rule, para()], [para("B")]),
      para("end"),
    );
    expect(isEditorContentEqual(saved, opened)).toBe(true);
  });

  it("ignores the padding paragraph at the end of a collapsible body", () => {
    expect(
      isEditorContentEqual(
        doc(details(para("x"), rule), para("end")),
        doc(details(para("x"), rule, para()), para("end")),
      ),
    ).toBe(true);
  });

  it("ignores nested padding", () => {
    expect(
      isEditorContentEqual(
        doc(row([para("A"), details(para("x"), rule)]), para("end")),
        doc(
          row([para("A"), details(para("x"), rule, para()), para()]),
          para("end"),
        ),
      ),
    ).toBe(true);
  });

  it("still sees a real blank line after a paragraph in a column", () => {
    expect(
      isEditorContentEqual(
        doc(row([para("A")], [para("B")]), para("end")),
        doc(row([para("A"), para()], [para("B")]), para("end")),
      ),
    ).toBe(false);
  });

  it("still sees real edits next to the padding", () => {
    expect(
      isEditorContentEqual(
        doc(row([para("A"), rule]), para("end")),
        doc(row([para("A!"), rule, para()]), para("end")),
      ),
    ).toBe(false);
  });

  it("does not mutate its input", () => {
    const input = doc(row([para("A"), rule, para()]), para("end"));
    const before = JSON.stringify(input);
    getEditorContentKey(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});
