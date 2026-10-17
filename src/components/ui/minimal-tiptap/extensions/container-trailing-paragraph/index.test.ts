import type { JSONContent } from "@tiptap/core";
import { Editor } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import { EditorState } from "@tiptap/pm/state";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { Column } from "~/lib/tiptap/columns-node";
import { DETAILS_EXTENSIONS } from "~/lib/tiptap/details-nodes";

import { ContainerTrailingParagraph } from ".";
import { EditorColumns } from "../columns";

// A headless Editor has no view, and its state carries no plugins, so build a
// real EditorState from the editor's schema + plugins and apply transactions
// to it (appendTransaction runs inside `state.apply`).
const editors: Editor[] = [];
function makeState(content: JSONContent, withContainers = true) {
  const editor = new Editor({
    extensions: [
      StarterKit,
      TableKit,
      ...(withContainers ? [EditorColumns, Column, ...DETAILS_EXTENSIONS] : []),
      ContainerTrailingParagraph,
    ],
    content,
  });
  editors.push(editor);
  const state = EditorState.create({
    doc: editor.state.doc,
    plugins: editor.extensionManager.plugins,
  });
  // The first transaction (any) triggers the initial pass, like TrailingNode.
  return state.apply(state.tr);
}
afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
});

const doc = (...content: JSONContent[]): JSONContent => ({
  type: "doc",
  content,
});
const para = (text?: string): JSONContent =>
  text
    ? { type: "paragraph", content: [{ type: "text", text }] }
    : { type: "paragraph" };
const rule: JSONContent = { type: "horizontalRule" };
const table: JSONContent = {
  type: "table",
  content: [
    {
      type: "tableRow",
      content: [{ type: "tableCell", content: [para("c")] }],
    },
  ],
};
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

/** Child type names of every container of one type, in document order. */
function childTypes(state: EditorState, containerType: string) {
  const out: string[][] = [];
  state.doc.descendants((node) => {
    if (node.type.name === containerType) {
      out.push(node.content.content.map((c) => c.type.name));
    }
  });
  return out;
}

describe("ContainerTrailingParagraph", () => {
  it("pads a column that ends in a non-paragraph on the first transaction", () => {
    const state = makeState(
      doc(row([para("A"), rule], [para("B")]), para("end")),
    );
    expect(childTypes(state, "column")).toEqual([
      ["paragraph", "horizontalRule", "paragraph"],
      ["paragraph"],
    ]);
  });

  it("leaves a column that already ends in a paragraph untouched", () => {
    const state = makeState(doc(row([rule, para("A")], [para("B")]), para()));
    expect(childTypes(state, "column")).toEqual([
      ["horizontalRule", "paragraph"],
      ["paragraph"],
    ]);
  });

  it("pads a collapsible body that ends in a table", () => {
    const state = makeState(doc(details(para("x"), table), para()));
    expect(childTypes(state, "detailsContent")).toEqual([
      ["paragraph", "table", "paragraph"],
    ]);
  });

  it("pads nested containers in one pass", () => {
    const state = makeState(
      doc(row([para("A"), details(para("x"), table)], [rule]), para()),
    );
    expect(childTypes(state, "detailsContent")).toEqual([
      ["paragraph", "table", "paragraph"],
    ]);
    expect(childTypes(state, "column")).toEqual([
      ["paragraph", "details", "paragraph"],
      ["horizontalRule", "paragraph"],
    ]);
  });

  it("pads again after an edit leaves a container ending in an atom", () => {
    const state = makeState(doc(row([para("A")], [para("B")]), para()));
    // columns(0) > column(1) > p(2..5): the end of the first column is 6.
    const endOfFirstColumn = 2 + state.doc.nodeAt(2)!.nodeSize;
    const next = state.apply(
      state.tr.insert(
        endOfFirstColumn,
        state.schema.nodes.horizontalRule!.create(),
      ),
    );
    expect(childTypes(next, "column")[0]).toEqual([
      "paragraph",
      "horizontalRule",
      "paragraph",
    ]);
  });

  it("is idempotent", () => {
    const state = makeState(doc(row([para("A"), rule], [para("B")]), para()));
    const once = JSON.stringify(state.doc.toJSON());
    let next = state.apply(state.tr);
    next = next.apply(next.tr.insertText("x", 3));
    next = next.apply(next.tr.delete(3, 4));
    expect(JSON.stringify(next.doc.toJSON())).toBe(once);
  });

  it("keeps the padding out of undo history", () => {
    const state = makeState(doc(row([para("A"), rule], [para("B")]), para()));
    // Drop the padding paragraph (column 1 ends [p, hr, p]) so the next
    // transaction has to re-add it.
    const padStart = 2 + state.doc.nodeAt(2)!.nodeSize + 1;
    const tr = state.tr.delete(padStart, padStart + 2);
    const { transactions } = state.applyTransaction(tr);
    expect(transactions).toHaveLength(2);
    expect(transactions[1]!.getMeta("addToHistory")).toBe(false);
  });

  it("does nothing when the schema has no column / detailsContent", () => {
    const state = makeState(doc(para("A"), table), false);
    expect(state.doc.content.content.map((n) => n.type.name)).toEqual([
      "paragraph",
      "table",
      "paragraph", // StarterKit's own TrailingNode
    ]);
  });
});
