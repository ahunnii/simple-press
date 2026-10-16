import type { JSONContent } from "@tiptap/core";
import { Editor } from "@tiptap/core";
import { TableKit } from "@tiptap/extension-table";
import { AllSelection, NodeSelection, TextSelection } from "@tiptap/pm/state";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { Column } from "~/lib/tiptap/columns-node";
import { DETAILS_EXTENSIONS } from "~/lib/tiptap/details-nodes";

import { EditorSpacer } from ".";
import { EditorColumns } from "../columns";

// Headless editors (no element): state + commands only.
const editors: Editor[] = [];
function makeEditor(content: JSONContent) {
  const editor = new Editor({
    extensions: [
      StarterKit,
      TableKit,
      EditorColumns,
      Column,
      ...DETAILS_EXTENSIONS,
      EditorSpacer,
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
const spacer = (size = "md"): JSONContent => ({
  type: "spacer",
  attrs: { size },
});

/** What the editor's FocusEvents plugin emits when the owner clicks in. */
function focus(editor: Editor) {
  editor.emit("focus", {
    editor,
    event: {} as FocusEvent,
    transaction: editor.state.tr,
  });
}

/** Position just inside the first text node containing `needle`. */
function posOf(editor: Editor, needle: string): number {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found >= 0) return false;
    if (node.isText && node.text?.includes(needle)) {
      found = pos + node.text.indexOf(needle) + 1;
    }
    return true;
  });
  if (found < 0) throw new Error(`"${needle}" not in doc`);
  return found;
}

function cursorAt(editor: Editor, pos: number) {
  editor.view.dispatch(
    editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos)),
  );
}

function selectNodeAt(editor: Editor, pos: number) {
  editor.view.dispatch(
    editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)),
  );
}

/** Block types (and spacer sizes) of the doc's top level. */
const shape = (editor: Editor) =>
  (editor.getJSON().content ?? []).map((n) =>
    n.type === "spacer" ? `spacer:${String(n.attrs?.size)}` : n.type,
  );

/** Position of the first spacer in the doc. */
function spacerPos(editor: Editor): number {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found < 0 && node.type.name === "spacer") found = pos;
    return found < 0;
  });
  return found;
}

describe("insertSpacer", () => {
  it("goes after the current block and leaves the cursor in the next paragraph", () => {
    const editor = makeEditor(doc(para("Above"), para("Below")));
    focus(editor);
    cursorAt(editor, posOf(editor, "Above"));

    expect(editor.can().insertSpacer()).toBe(true);
    expect(editor.commands.insertSpacer({ size: "lg" })).toBe(true);

    expect(shape(editor)).toEqual(["paragraph", "spacer:lg", "paragraph"]);
    const { $from } = editor.state.selection;
    expect(editor.state.selection).toBeInstanceOf(TextSelection);
    expect($from.parent.textContent).toBe("Below");
    expect($from.parentOffset).toBe(0);
  });

  it("goes above an empty paragraph, keeping the cursor in it", () => {
    const editor = makeEditor(doc(para("Above"), para()));
    focus(editor);
    cursorAt(editor, editor.state.doc.content.size - 1);

    editor.commands.insertSpacer();

    expect(shape(editor)).toEqual(["paragraph", "spacer:md", "paragraph"]);
    const { $from } = editor.state.selection;
    expect($from.parent.type.name).toBe("paragraph");
    expect($from.parent.content.size).toBe(0);
  });

  it("at the end of the doc, adds a paragraph to keep typing in", () => {
    const editor = makeEditor(doc(para("Last")));
    focus(editor);
    cursorAt(editor, posOf(editor, "Last"));

    editor.commands.insertSpacer({ size: "sm" });

    expect(shape(editor)).toEqual(["paragraph", "spacer:sm", "paragraph"]);
    const { $from } = editor.state.selection;
    expect($from.parent.type.name).toBe("paragraph");
    expect($from.parent.content.size).toBe(0);
    expect($from.after()).toBe(editor.state.doc.content.size);
  });

  it("an editor never focused puts it at the end of the doc", () => {
    const editor = makeEditor(doc(para("First"), para("Second")));

    editor.commands.insertSpacer();

    expect(shape(editor)).toEqual([
      "paragraph",
      "paragraph",
      "spacer:md",
      "paragraph",
    ]);
  });

  it("Cmd+A puts it at the end without replacing anything", () => {
    const editor = makeEditor(doc(para("One"), para("Two")));
    focus(editor);
    editor.view.dispatch(
      editor.state.tr.setSelection(new AllSelection(editor.state.doc)),
    );

    editor.commands.insertSpacer();

    expect(shape(editor)).toEqual([
      "paragraph",
      "paragraph",
      "spacer:md",
      "paragraph",
    ]);
  });

  it("is allowed inside a column", () => {
    const editor = makeEditor(
      doc({
        type: "columns",
        attrs: { layout: "2" },
        content: [
          { type: "column", content: [para("Left")] },
          { type: "column", content: [para("Right")] },
        ],
      }),
    );
    focus(editor);
    cursorAt(editor, posOf(editor, "Left"));

    expect(editor.commands.insertSpacer()).toBe(true);

    const left = editor.state.doc.firstChild!.firstChild!;
    expect(left.childCount).toBe(3);
    expect(left.child(1).type.name).toBe("spacer");
    expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");
  });

  it("climbs out of a list item", () => {
    const editor = makeEditor(
      doc({
        type: "bulletList",
        content: [{ type: "listItem", content: [para("Item")] }],
      }),
    );
    focus(editor);
    cursorAt(editor, posOf(editor, "Item"));

    editor.commands.insertSpacer();

    expect(shape(editor)).toEqual(["bulletList", "spacer:md", "paragraph"]);
  });

  it("coerces a bogus size", () => {
    const editor = makeEditor(doc(para("x")));
    focus(editor);
    cursorAt(editor, posOf(editor, "x"));

    editor.commands.insertSpacer({ size: "huge" as never });

    expect(shape(editor)).toContain("spacer:md");
  });
});

describe("setSpacerSize / deleteSpacer", () => {
  it("resize a node-selected spacer and keep it selected", () => {
    const editor = makeEditor(doc(para("A"), spacer("md"), para("B")));
    selectNodeAt(editor, spacerPos(editor));

    expect(editor.commands.setSpacerSize("lg")).toBe(true);

    expect(shape(editor)).toEqual(["paragraph", "spacer:lg", "paragraph"]);
    const { selection } = editor.state;
    expect(selection).toBeInstanceOf(NodeSelection);
    expect((selection as NodeSelection).node.attrs.size).toBe("lg");
  });

  it("are refused without a node-selected spacer", () => {
    const editor = makeEditor(doc(para("A"), spacer("md"), para("B")));
    cursorAt(editor, posOf(editor, "A"));

    expect(editor.can().setSpacerSize("sm")).toBe(false);
    expect(editor.can().deleteSpacer()).toBe(false);
  });

  it("delete removes the spacer", () => {
    const editor = makeEditor(doc(para("A"), spacer("sm"), para("B")));
    selectNodeAt(editor, spacerPos(editor));

    expect(editor.commands.deleteSpacer()).toBe(true);

    expect(shape(editor)).toEqual(["paragraph", "paragraph"]);
  });

  it("deleting a column's only block leaves an empty paragraph", () => {
    const editor = makeEditor(
      doc({
        type: "columns",
        attrs: { layout: "2" },
        content: [
          { type: "column", content: [spacer("lg")] },
          { type: "column", content: [para("Right")] },
        ],
      }),
    );
    selectNodeAt(editor, spacerPos(editor));

    expect(editor.commands.deleteSpacer()).toBe(true);

    const left = editor.state.doc.firstChild!.firstChild!;
    expect(left.childCount).toBe(1);
    expect(left.firstChild!.type.name).toBe("paragraph");
  });
});
