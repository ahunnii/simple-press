import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { Column } from "~/lib/tiptap/columns-node";
import { DETAILS_EXTENSIONS } from "~/lib/tiptap/details-nodes";

import { EditorColumns } from "./extensions/columns";
import { fillEmptyDoc } from "./utils";

describe("fillEmptyDoc", () => {
  it.each([
    ["content: []", { type: "doc", content: [] }],
    ["no content key", { type: "doc" }],
  ])("gives a childless doc (%s) one empty paragraph", (_label, input) => {
    expect(fillEmptyDoc(input)).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("does not mutate the stored value", () => {
    const stored = { type: "doc", content: [] as unknown[] };
    fillEmptyDoc(stored);
    expect(stored.content).toEqual([]);
  });

  it("keeps attrs on the doc", () => {
    expect(fillEmptyDoc({ type: "doc", attrs: { a: 1 }, content: [] })).toEqual(
      { type: "doc", attrs: { a: 1 }, content: [{ type: "paragraph" }] },
    );
  });

  it.each([
    ["a doc with content", { type: "doc", content: [{ type: "paragraph" }] }],
    ["an HTML string", "<p>Hi</p>"],
    ["an empty string", ""],
    ["null", null],
    ["undefined", undefined],
    ["a non-doc node", { type: "paragraph" }],
    ["a node array", [{ type: "paragraph" }]],
  ])("passes %s through by reference", (_label, input) => {
    expect(fillEmptyDoc(input)).toBe(input);
  });
});

describe("an editor opened on an empty field (never focused)", () => {
  const open = (content: unknown) =>
    new Editor({
      extensions: [StarterKit, EditorColumns, Column, ...DETAILS_EXTENSIONS],
      content: content as never,
    });

  it("unfilled, the childless doc refuses block inserts (the old bug)", () => {
    const editor = open({ type: "doc", content: [] });
    expect(editor.can().setDetails()).toBe(false);
    expect(editor.can().toggleCodeBlock()).toBe(false);
    editor.destroy();
  });

  it("filled, Insert menu items are available before any click", () => {
    const editor = open(fillEmptyDoc({ type: "doc", content: [] }));
    expect(editor.state.selection.from).toBe(1);
    expect(editor.can().insertColumns({ layout: "2" })).toBe(true);
    expect(editor.can().setDetails()).toBe(true);
    expect(editor.can().toggleCodeBlock()).toBe(true);
    expect(editor.can().toggleBlockquote()).toBe(true);
    editor.destroy();
  });
});
