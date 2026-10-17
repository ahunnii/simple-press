import type { JSONContent } from "@tiptap/core";
import { Editor } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { Column } from "~/lib/tiptap/columns-node";
import { DETAILS_EXTENSIONS } from "~/lib/tiptap/details-nodes";

import { BlockMove } from ".";
import { EditorColumns } from "../columns";
import {
  blockAt,
  blockSiblings,
  caretAfterDroppedBlock,
  dropWouldNestRow,
  selectedBlock,
  sliceHasColumns,
} from "./helpers";

// Headless editors (no element): state + commands only.
const editors: Editor[] = [];
function makeEditor(content: JSONContent) {
  const editor = new Editor({
    extensions: [
      StarterKit,
      EditorColumns,
      Column,
      ...DETAILS_EXTENSIONS,
      BlockMove,
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
const details = (summary: string, ...content: JSONContent[]): JSONContent => ({
  type: "details",
  content: [
    {
      type: "detailsSummary",
      content: [{ type: "text", text: summary }],
    },
    { type: "detailsContent", content },
  ],
});

/** Top-level block texts, with rows/collapsibles flattened per child. */
function texts(editor: Editor): string[] {
  const out: string[] = [];
  editor.state.doc.forEach((node) => out.push(node.textContent));
  return out;
}
function columnTexts(editor: Editor, rowIndex: number, column: number) {
  const out: string[] = [];
  editor.state.doc
    .child(rowIndex)
    .child(column)
    .forEach((node) => out.push(node.textContent));
  return out;
}
/** Position directly before the first top-level/nested node with this text. */
function posOf(editor: Editor, text: string, type = "paragraph"): number {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found >= 0) return false;
    if (node.type.name === type && node.textContent === text) found = pos;
    return found < 0;
  });
  if (found < 0) throw new Error(`no ${type} "${text}"`);
  return found;
}
function cursorIn(editor: Editor, text: string, offset = 1) {
  const pos = posOf(editor, text) + 1 + offset;
  editor.view.dispatch(
    editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos)),
  );
}

describe("block lookup", () => {
  it("blockAt accepts children of doc, column and detailsContent only", () => {
    const editor = makeEditor(
      doc(
        para("Top"),
        row([para("Left")], [para("Right")]),
        details("Title", para("Inside")),
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [para("Item")] }],
        },
        para("End"),
      ),
    );
    const d = editor.state.doc;
    expect(blockAt(d, posOf(editor, "Top"))?.node.textContent).toBe("Top");
    expect(blockAt(d, posOf(editor, "Left"))?.node.textContent).toBe("Left");
    expect(blockAt(d, posOf(editor, "Inside"))?.node.textContent).toBe(
      "Inside",
    );
    // A row is a block; a column and a list item's paragraph are not.
    const rowPos = posOf(editor, "LeftRight", "columns");
    expect(blockAt(d, rowPos)?.node.type.name).toBe("columns");
    expect(blockAt(d, rowPos + 1)).toBeNull();
    expect(blockAt(d, posOf(editor, "Item"))).toBeNull();
    expect(blockAt(d, -1)).toBeNull();
  });

  it("selectedBlock: innermost container child around the cursor", () => {
    const editor = makeEditor(
      doc(
        row([para("Left")], [para("Right")]),
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [para("Item")] }],
        },
        details("Title", para("Inside")),
        para("End"),
      ),
    );
    cursorIn(editor, "Right");
    expect(selectedBlock(editor.state.selection)?.node.textContent).toBe(
      "Right",
    );
    // In a list: the whole list.
    cursorIn(editor, "Item");
    expect(selectedBlock(editor.state.selection)?.node.type.name).toBe(
      "bulletList",
    );
    // In a collapsible's content: that block; in its title: the collapsible.
    cursorIn(editor, "Inside");
    expect(selectedBlock(editor.state.selection)?.node.textContent).toBe(
      "Inside",
    );
    const summaryPos = posOf(editor, "Title", "detailsSummary");
    editor.view.dispatch(
      editor.state.tr.setSelection(
        TextSelection.create(editor.state.doc, summaryPos + 2),
      ),
    );
    expect(selectedBlock(editor.state.selection)?.node.type.name).toBe(
      "details",
    );
  });

  it("selectedBlock: a node selected inside a column is the block itself", () => {
    const editor = makeEditor(
      doc(row([para("Left"), { type: "horizontalRule" }], [para("R")]), para()),
    );
    const hrPos = posOf(editor, "Left") + 6; // after "Left" (size 6)
    editor.view.dispatch(
      editor.state.tr.setSelection(
        NodeSelection.create(editor.state.doc, hrPos),
      ),
    );
    expect(selectedBlock(editor.state.selection)?.node.type.name).toBe(
      "horizontalRule",
    );
    expect(blockSiblings(editor.state.doc, hrPos)).toEqual({
      index: 1,
      count: 2,
    });
  });
});

describe("moveBlockUp / moveBlockDown", () => {
  it("swaps top-level blocks and keeps the cursor in the moved block", () => {
    const editor = makeEditor(doc(para("A"), para("B"), para("C")));
    cursorIn(editor, "B", 1);
    expect(editor.commands.moveBlockUp()).toBe(true);
    expect(texts(editor)).toEqual(["B", "A", "C"]);
    // Cursor still after "B" (pos 1 in doc → paragraph B now at 0).
    expect(editor.state.selection.from).toBe(2);
    expect(editor.state.selection.$from.parent.textContent).toBe("B");

    expect(editor.commands.moveBlockDown()).toBe(true);
    expect(editor.commands.moveBlockDown()).toBe(true);
    expect(texts(editor)).toEqual(["A", "C", "B"]);
    expect(editor.state.selection.$from.parent.textContent).toBe("B");
  });

  it("does nothing at the edges", () => {
    const editor = makeEditor(doc(para("A"), para("B")));
    cursorIn(editor, "A");
    expect(editor.can().moveBlockUp()).toBe(false);
    expect(editor.commands.moveBlockUp()).toBe(false);
    cursorIn(editor, "B");
    expect(editor.commands.moveBlockDown()).toBe(false);
    expect(texts(editor)).toEqual(["A", "B"]);
  });

  it("moves inside a column and never leaves it", () => {
    const editor = makeEditor(
      doc(
        para("Before"),
        row([para("L1"), para("L2")], [para("R1")]),
        para("After"),
      ),
    );
    cursorIn(editor, "L2");
    expect(editor.commands.moveBlockUp()).toBe(true);
    expect(columnTexts(editor, 1, 0)).toEqual(["L2", "L1"]);
    // Top of the column: stays put (doesn't jump out above the row).
    expect(editor.commands.moveBlockUp()).toBe(false);
    expect(texts(editor)[0]).toBe("Before");
    // Down twice: second one hits the column's bottom edge.
    expect(editor.commands.moveBlockDown()).toBe(true);
    expect(editor.commands.moveBlockDown()).toBe(false);
    expect(columnTexts(editor, 1, 0)).toEqual(["L1", "L2"]);
    expect(columnTexts(editor, 1, 1)).toEqual(["R1"]);
    expect(() => editor.state.doc.check()).not.toThrow();
  });

  it("moves a whole row by position (the grip menu path)", () => {
    const editor = makeEditor(
      doc(para("Before"), row([para("L")], [para("R")]), para("After")),
    );
    const rowPos = posOf(editor, "LR", "columns");
    expect(editor.commands.moveBlockUp(rowPos)).toBe(true);
    expect(editor.state.doc.child(0).type.name).toBe("columns");
    expect(texts(editor)).toEqual(["LR", "Before", "After"]);
  });

  it("moves inside a collapsible's content", () => {
    const editor = makeEditor(
      doc(details("Title", para("One"), para("Two")), para("End")),
    );
    expect(editor.commands.moveBlockUp(posOf(editor, "Two"))).toBe(true);
    const content = editor.state.doc.child(0).child(1);
    expect(content.child(0).textContent).toBe("Two");
    expect(content.child(1).textContent).toBe("One");
  });

  it("Alt+↑ on a list item moves the whole list", () => {
    const editor = makeEditor(
      doc(para("Intro"), {
        type: "bulletList",
        content: [
          { type: "listItem", content: [para("One")] },
          { type: "listItem", content: [para("Two")] },
        ],
      }),
    );
    cursorIn(editor, "Two");
    expect(editor.commands.moveBlockUp()).toBe(true);
    expect(editor.state.doc.child(0).type.name).toBe("bulletList");
    expect(editor.state.doc.child(0).childCount).toBe(2);
    expect(editor.state.selection.$from.parent.textContent).toBe("Two");
  });
});

describe("duplicateBlock / deleteBlock / insertParagraphAfterBlock", () => {
  it("duplicates right after, inside a column", () => {
    const editor = makeEditor(doc(row([para("L")], [para("R")]), para()));
    expect(editor.commands.duplicateBlock(posOf(editor, "R"))).toBe(true);
    expect(columnTexts(editor, 0, 1)).toEqual(["R", "R"]);
    expect(columnTexts(editor, 0, 0)).toEqual(["L"]);
  });

  it("deletes a block; a column's only block becomes an empty line", () => {
    const editor = makeEditor(
      doc(para("A"), row([para("L1"), para("L2")], [para("R")]), para("Z")),
    );
    expect(editor.commands.deleteBlock(posOf(editor, "A"))).toBe(true);
    expect(texts(editor)[0]).toBe("L1L2R");

    expect(editor.commands.deleteBlock(posOf(editor, "L1"))).toBe(true);
    expect(columnTexts(editor, 0, 0)).toEqual(["L2"]);

    expect(editor.commands.deleteBlock(posOf(editor, "R"))).toBe(true);
    const right = editor.state.doc.child(0).child(1);
    expect(right.childCount).toBe(1);
    expect(right.firstChild?.type.name).toBe("paragraph");
    expect(right.firstChild?.content.size).toBe(0);
    // Already just an empty line: nothing left to delete.
    const emptyPos = posOf(editor, "", "paragraph");
    expect(blockAt(editor.state.doc, emptyPos)).not.toBeNull();
    expect(editor.can().deleteBlock(emptyPos)).toBe(false);
    expect(() => editor.state.doc.check()).not.toThrow();
  });

  it("deletes a whole row", () => {
    const editor = makeEditor(
      doc(para("A"), row([para("L")], [para("R")]), para("Z")),
    );
    expect(editor.commands.deleteBlock(posOf(editor, "LR", "columns"))).toBe(
      true,
    );
    expect(texts(editor)).toEqual(["A", "Z"]);
  });

  it("adds an empty line after a block in the same column, cursor in it", () => {
    const editor = makeEditor(
      doc(row([para("L"), { type: "horizontalRule" }], [para("R")]), para()),
    );
    const hrPos = posOf(editor, "L") + 3;
    expect(editor.state.doc.nodeAt(hrPos)?.type.name).toBe("horizontalRule");
    expect(editor.commands.insertParagraphAfterBlock(hrPos)).toBe(true);
    const left = editor.state.doc.child(0).child(0);
    expect(left.childCount).toBe(3);
    expect(left.child(2).type.name).toBe("paragraph");
    const { $from } = editor.state.selection;
    expect($from.parent.type.name).toBe("paragraph");
    expect($from.parent.content.size).toBe(0);
    expect($from.node($from.depth - 1).type.name).toBe("column");
    expect($from.index($from.depth - 1)).toBe(2);
  });

  it("reuses an empty line that already follows the block (trailing padding)", () => {
    // Column: [para, hr, empty para] — the empty para is the padding line.
    const editor = makeEditor(
      doc(
        row([para("L"), { type: "horizontalRule" }, para()], [para("R")]),
        { type: "horizontalRule" },
        para(),
      ),
    );
    const hrPos = posOf(editor, "L") + 3;
    expect(editor.commands.insertParagraphAfterBlock(hrPos)).toBe(true);
    const left = editor.state.doc.child(0).child(0);
    expect(left.childCount).toBe(3);
    const { $from } = editor.state.selection;
    expect($from.parent.content.size).toBe(0);
    expect($from.index($from.depth - 1)).toBe(2);
    expect($from.node($from.depth - 1).type.name).toBe("column");

    // Top level: the doc's trailing empty paragraph after a rule.
    const sizeBefore = editor.state.doc.childCount;
    const topHrPos = editor.state.doc.child(0).nodeSize;
    expect(editor.state.doc.nodeAt(topHrPos)?.type.name).toBe("horizontalRule");
    expect(editor.commands.insertParagraphAfterBlock(topHrPos)).toBe(true);
    expect(editor.state.doc.childCount).toBe(sizeBefore);
    expect(editor.state.selection.$from.depth).toBe(1);
    expect(editor.state.selection.$from.index(0)).toBe(2);
  });

  it("still inserts a new line when the next block has text", () => {
    const editor = makeEditor(doc(para("A"), para("B")));
    expect(editor.commands.insertParagraphAfterBlock(0)).toBe(true);
    expect(texts(editor)).toEqual(["A", "", "B"]);
    expect(editor.state.selection.from).toBe(4);
  });

  it("adds an empty line inside a collapsible", () => {
    const editor = makeEditor(doc(details("Title", para("One")), para("End")));
    expect(
      editor.commands.insertParagraphAfterBlock(posOf(editor, "One")),
    ).toBe(true);
    const { $from } = editor.state.selection;
    expect($from.node($from.depth - 1).type.name).toBe("detailsContent");
  });
});

describe("drop guard (rows never nest)", () => {
  it("refuses a row dropped into a column, allows it at the top level", () => {
    const editor = makeEditor(
      doc(para("Top"), row([para("Left")], [para("Right")]), para("End")),
    );
    const d = editor.state.doc;
    const rowPos = posOf(editor, "LeftRight", "columns");
    const rowSlice = new Slice(
      d.slice(rowPos, rowPos + d.child(1).nodeSize).content,
      0,
      0,
    );
    expect(sliceHasColumns(rowSlice)).toBe(true);

    // Into a column's paragraph → would nest.
    expect(dropWouldNestRow(d, posOf(editor, "Right") + 2, rowSlice)).toBe(
      true,
    );
    // Into a top-level paragraph → lands between top-level blocks.
    expect(dropWouldNestRow(d, posOf(editor, "End") + 2, rowSlice)).toBe(false);
    // A plain paragraph may go into a column.
    const paraSlice = d.slice(posOf(editor, "Top"), posOf(editor, "Top") + 5);
    expect(sliceHasColumns(paraSlice)).toBe(false);
    expect(dropWouldNestRow(d, posOf(editor, "Right") + 2, paraSlice)).toBe(
      false,
    );
  });

  it("refuses a collapsible holding a row inside a column", () => {
    const editor = makeEditor(
      doc(
        details("Title", row([para("A")], [para("B")])),
        row([para("Left")], [para("Right")]),
        para("End"),
      ),
    );
    const d = editor.state.doc;
    const detailsNode = d.child(0);
    const slice = new Slice(d.slice(0, detailsNode.nodeSize).content, 0, 0);
    expect(sliceHasColumns(slice)).toBe(true);
    expect(dropWouldNestRow(d, posOf(editor, "Left") + 2, slice)).toBe(true);
  });
});

describe("after a drop", () => {
  // (The plugin's appendTransaction only runs in a mounted view; this tests
  // the selection rule it applies.)
  it("a dropped paragraph gets a cursor at its end, not a node selection", () => {
    const editor = makeEditor(doc(para("A"), para("Bee"), para("C")));
    const pos = posOf(editor, "Bee");
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)),
    );
    const tr = caretAfterDroppedBlock(editor.state);
    expect(tr).not.toBeNull();
    const selection = tr!.selection;
    expect(selection).toBeInstanceOf(TextSelection);
    expect(selection.empty).toBe(true);
    expect(selection.from).toBe(pos + 4);
  });

  it("a dropped row gets a cursor inside it", () => {
    const editor = makeEditor(doc(row([para("L")], [para("R")]), para()));
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 0)),
    );
    const selection = caretAfterDroppedBlock(editor.state)!.selection;
    expect(selection).toBeInstanceOf(TextSelection);
    expect(selection.$from.parent.textContent).toBe("R");
  });

  it("a dropped atom keeps its node selection", () => {
    const editor = makeEditor(
      doc(para("A"), { type: "horizontalRule" }, para("C")),
    );
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 3)),
    );
    expect(caretAfterDroppedBlock(editor.state)).toBeNull();
  });
});
