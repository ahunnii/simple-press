import type { JSONContent } from "@tiptap/core";
import { Editor } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import { AllSelection, NodeSelection, TextSelection } from "@tiptap/pm/state";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { Column } from "~/lib/tiptap/columns-node";
import { DETAILS_EXTENSIONS } from "~/lib/tiptap/details-nodes";

import { EditorColumns, hasBeenFocused } from ".";
import { findColumnsAbove, findColumnsInsertRange } from "./helpers";

// Headless editors (no element): state + commands only, which is all
// `can()` and the insert-range helper need.
const editors: Editor[] = [];
function makeEditor(content: JSONContent | string | null) {
  const editor = new Editor({
    extensions: [
      StarterKit,
      TableKit,
      EditorColumns,
      Column,
      ...DETAILS_EXTENSIONS,
    ],
    content,
  });
  editors.push(editor);
  return editor;
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
const row = (...columns: JSONContent[][]): JSONContent => ({
  type: "columns",
  attrs: { layout: "2" },
  content: columns.map((content) => ({ type: "column", content })),
});

/** What the editor's FocusEvents plugin emits when the owner clicks in. */
function focus(editor: Editor) {
  editor.emit("focus", {
    editor,
    event: {} as FocusEvent,
    transaction: editor.state.tr,
  });
}

function setSelection(
  editor: Editor,
  make: (d: Editor["state"]["doc"]) => Editor["state"]["selection"],
) {
  editor.view.dispatch(editor.state.tr.setSelection(make(editor.state.doc)));
}

describe("findColumnsInsertRange", () => {
  it("childless doc (never-focused empty field): inserts at 0 via the AllSelection", () => {
    const editor = makeEditor({ type: "doc", content: [] });
    expect(editor.state.selection).toBeInstanceOf(AllSelection);
    expect(findColumnsInsertRange(editor.state)).toEqual({ from: 0, to: 0 });
    expect(editor.can().insertColumns({ layout: "2" })).toBe(true);
  });

  it("empty paragraph (the initial cursor of an empty field): replaces it", () => {
    const editor = makeEditor(doc(para()));
    expect(editor.state.selection.from).toBe(1);
    expect(findColumnsInsertRange(editor.state)).toEqual({ from: 0, to: 2 });
  });

  it("non-empty paragraph: goes after it", () => {
    const editor = makeEditor(doc(para("Hello"), para("World")));
    setSelection(editor, (d) => TextSelection.create(d, 3));
    expect(findColumnsInsertRange(editor.state)).toEqual({ from: 7, to: 7 });
  });

  it("inside a row: refused (rows never nest)", () => {
    const editor = makeEditor(doc(row([para("Left")], [para("Right")])));
    setSelection(editor, (d) => TextSelection.create(d, 4));
    expect(findColumnsInsertRange(editor.state)).toBeNull();
    focus(editor);
    expect(editor.can().insertColumns({ layout: "2" })).toBe(false);
  });

  it("list item: climbs out and goes after the whole list", () => {
    const editor = makeEditor(
      doc(
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [para("One")] }],
        },
        para("After"),
      ),
    );
    setSelection(editor, (d) => TextSelection.create(d, 4));
    const listEnd = editor.state.doc.child(0).nodeSize;
    expect(findColumnsInsertRange(editor.state)).toEqual({
      from: listEnd,
      to: listEnd,
    });
  });

  it("Cmd+A over content: appends at the end, never replacing it", () => {
    const editor = makeEditor(doc(para("Hello")));
    setSelection(editor, (d) => new AllSelection(d));
    const end = editor.state.doc.content.size;
    expect(findColumnsInsertRange(editor.state)).toEqual({
      from: end,
      to: end,
    });
  });

  it("atDocEnd: replaces a trailing empty paragraph, else appends", () => {
    const trailing = makeEditor(doc(para("Hello"), para()));
    expect(findColumnsInsertRange(trailing.state, { atDocEnd: true })).toEqual({
      from: 7,
      to: 9,
    });
    const full = makeEditor(doc(para("Hello")));
    expect(findColumnsInsertRange(full.state, { atDocEnd: true })).toEqual({
      from: 7,
      to: 7,
    });
  });

  it("atDocEnd ignores a default selection that sits inside a row", () => {
    const editor = makeEditor(doc(row([para("Left")], [para("Right")])));
    expect(findColumnsAbove(editor.state.selection.$from)).not.toBeNull();
    const end = editor.state.doc.content.size;
    expect(findColumnsInsertRange(editor.state, { atDocEnd: true })).toEqual({
      from: end,
      to: end,
    });
  });

  it("node selection: directly after the node", () => {
    const editor = makeEditor(
      doc(para("Before"), { type: "horizontalRule" }, para("After")),
    );
    setSelection(editor, (d) => NodeSelection.create(d, 8));
    expect(findColumnsInsertRange(editor.state)).toEqual({ from: 9, to: 9 });
  });
});

describe("insertColumns", () => {
  it("fills a childless doc with a valid row and puts the cursor in column one", () => {
    const editor = makeEditor({ type: "doc", content: [] });
    expect(editor.commands.insertColumns({ layout: "3" })).toBe(true);
    const { doc: result, selection } = editor.state;
    expect(() => result.check()).not.toThrow();
    expect(result.firstChild?.type.name).toBe("columns");
    expect(result.firstChild?.childCount).toBe(3);
    expect(selection.$from.parent.type.name).toBe("paragraph");
    expect(selection.$from.node(selection.$from.depth - 1).type.name).toBe(
      "column",
    );
  });

  it("replaces the empty paragraph of an empty field", () => {
    const editor = makeEditor(doc(para()));
    expect(editor.commands.insertColumns()).toBe(true);
    expect(editor.state.doc.childCount).toBe(1);
    expect(editor.state.doc.firstChild?.type.name).toBe("columns");
  });

  it("never focused: enabled and appended at the end, even when the doc starts with a row", () => {
    const editor = makeEditor(
      doc(row([para("Left")], [para("Right")]), para("Closing")),
    );
    // The default selection is inside the first row…
    expect(findColumnsAbove(editor.state.selection.$from)).not.toBeNull();
    expect(hasBeenFocused(editor)).toBe(false);
    // …but nobody put it there, so Insert → Columns stays available.
    expect(editor.can().insertColumns({ layout: "2" })).toBe(true);
    expect(editor.commands.insertColumns({ layout: "2" })).toBe(true);
    const { doc: result } = editor.state;
    expect(result.child(0).type.name).toBe("columns");
    expect(result.child(1).textContent).toBe("Closing");
    expect(result.child(2).type.name).toBe("columns");
  });

  it("once focused: follows the cursor, and is refused inside a row", () => {
    const editor = makeEditor(
      doc(para("First"), row([para("Left")], [para("Right")]), para("Last")),
    );
    focus(editor);
    expect(hasBeenFocused(editor)).toBe(true);
    setSelection(editor, (d) => TextSelection.create(d, 3));
    expect(editor.commands.insertColumns()).toBe(true);
    expect(editor.state.doc.child(1).type.name).toBe("columns");
    // The cursor is now inside the new row: no nesting.
    expect(editor.can().insertColumns()).toBe(false);
  });
});
