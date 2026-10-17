import type { JSONContent } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";
import { Editor, getAttributes, isActive } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { EditorState, NodeSelection, TextSelection } from "@tiptap/pm/state";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { Column } from "~/lib/tiptap/columns-node";
import { createLinkExtension } from "~/lib/tiptap/link-extension";

import { EditorColumns } from "../../extensions/columns";
import {
  SlashCommand,
  slashCommandPluginKey,
} from "../../extensions/slash-command";
import { EditorSpacer } from "../../extensions/spacer";
import {
  isColumnsBubbleTarget,
  isImageBubbleTarget,
  isLinkBubbleTarget,
  isSlashMenuOpen,
  isSpacerBubbleTarget,
  isTableBubbleTarget,
} from "./bubble-menu-predicates";

const editors: Editor[] = [];
function makeEditor(content: JSONContent) {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({ link: false }),
      // Same options as the admin editor.
      createLinkExtension({
        enableClickSelection: true,
        openOnClick: false,
        HTMLAttributes: { class: "link" },
      }),
      Image,
      TableKit,
      EditorColumns,
      Column,
      EditorSpacer,
      SlashCommand,
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
const text = (value: string, marks?: JSONContent["marks"]): JSONContent =>
  marks ? { type: "text", text: value, marks } : { type: "text", text: value };
const para = (...content: JSONContent[]): JSONContent => ({
  type: "paragraph",
  content,
});
const link = (href: string, variant: string | null = null) => [
  { type: "link", attrs: { href, variant } },
];
const row = (...columns: JSONContent[][]): JSONContent => ({
  type: "columns",
  attrs: { layout: "2" },
  content: columns.map((content) => ({ type: "column", content })),
});

/** Position just inside the first occurrence of `needle` (+ `offset`). */
function posOf(editor: Editor, needle: string, offset = 1): number {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found >= 0) return false;
    if (node.isText && node.text?.includes(needle)) {
      found = pos + node.text.indexOf(needle) + offset;
    }
    return true;
  });
  if (found < 0) throw new Error(`"${needle}" not in doc`);
  return found;
}

function cursorAt(editor: Editor, pos: number, to = pos) {
  editor.view.dispatch(
    editor.state.tr.setSelection(
      TextSelection.create(editor.state.doc, pos, to),
    ),
  );
}

const targets = (editor: Editor) => ({
  link: isLinkBubbleTarget(editor),
  table: isTableBubbleTarget(editor),
  columns: isColumnsBubbleTarget(editor),
});

describe("bubble menu targets", () => {
  it("plain text in a row: the row menu", () => {
    const editor = makeEditor(
      doc(row([para(text("Left"))], [para(text("R"))])),
    );
    cursorAt(editor, posOf(editor, "Left"));
    expect(targets(editor)).toEqual({
      link: false,
      table: false,
      columns: true,
    });
  });

  it.each([
    ["plain link", null],
    ["solid button link", "solid"],
    ["outline button link", "outline"],
  ])(
    "collapsed cursor in a %s in a row: the link menu, row menu hidden",
    (_label, variant) => {
      const editor = makeEditor(
        doc(
          row(
            [para(text("Intro "), text("Book now", link("/book", variant)))],
            [para(text("Right"))],
          ),
        ),
      );
      cursorAt(editor, posOf(editor, "Book now", 2));
      expect(editor.state.selection.empty).toBe(true);
      expect(targets(editor)).toEqual({
        link: true,
        table: false,
        columns: false,
      });
    },
  );

  it("whole link selected in a row (what clicking a link does): the link menu", () => {
    const editor = makeEditor(
      doc(row([para(text("Book now", link("/book", "solid")))], [para()])),
    );
    const start = posOf(editor, "Book now", 0);
    cursorAt(editor, start, start + "Book now".length);
    expect(targets(editor)).toEqual({
      link: true,
      table: false,
      columns: false,
    });
  });

  it("collapsed cursor in a link outside any row: the link menu", () => {
    const editor = makeEditor(
      doc(para(text("See "), text("our menu", link("https://x.test")))),
    );
    cursorAt(editor, posOf(editor, "our menu", 3));
    expect(targets(editor)).toEqual({
      link: true,
      table: false,
      columns: false,
    });
  });

  it("a link with no href never claims the link menu", () => {
    const editor = makeEditor(
      doc(row([para(text("Dangling", link("")))], [para()])),
    );
    cursorAt(editor, posOf(editor, "Dangling", 2));
    expect(targets(editor)).toEqual({
      link: false,
      table: false,
      columns: true,
    });
  });

  it("a link in a table cell: the link menu, table menu hidden", () => {
    const editor = makeEditor(
      doc({
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              {
                type: "tableCell",
                content: [para(text("Cell link", link("/x")))],
              },
            ],
          },
        ],
      }),
    );
    cursorAt(editor, posOf(editor, "Cell link", 2));
    expect(targets(editor)).toEqual({
      link: true,
      table: false,
      columns: false,
    });
  });

  it("plain text in a table: the table menu", () => {
    const editor = makeEditor(
      doc({
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [{ type: "tableCell", content: [para(text("Cell"))] }],
          },
        ],
      }),
    );
    cursorAt(editor, posOf(editor, "Cell"));
    expect(targets(editor)).toEqual({
      link: false,
      table: true,
      columns: false,
    });
  });

  it("a selected image in a row: neither the row nor the link menu", () => {
    const editor = makeEditor(
      doc(
        row(
          [{ type: "image", attrs: { src: "https://x.test/a.png" } }],
          [para(text("Right"))],
        ),
      ),
    );
    // columns(0) > column(1) > image(2)
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 2)),
    );
    expect(targets(editor)).toEqual({
      link: false,
      table: false,
      columns: false,
    });
  });

  it("read-only editor: no menus", () => {
    const editor = makeEditor(
      doc(row([para(text("Book", link("/book", "solid")))], [para()])),
    );
    cursorAt(editor, posOf(editor, "Book", 2));
    editor.setEditable(false);
    expect(targets(editor)).toEqual({
      link: false,
      table: false,
      columns: false,
    });
  });
});

describe("spacer menu target", () => {
  const spacer = { type: "spacer", attrs: { size: "md" } };

  it("a node-selected spacer in a row: the spacer menu, row menu hidden", () => {
    const editor = makeEditor(
      doc(row([para(text("Left")), spacer], [para(text("Right"))])),
    );
    // columns(0) > column(1) > paragraph "Left"(2..8) > spacer(8)
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 8)),
    );
    expect(editor.state.doc.nodeAt(8)?.type.name).toBe("spacer");
    expect(isSpacerBubbleTarget(editor)).toBe(true);
    expect(isColumnsBubbleTarget(editor)).toBe(false);
    expect(isLinkBubbleTarget(editor)).toBe(false);
  });

  it("a cursor next to a spacer, or text selected across one: no spacer menu", () => {
    const editor = makeEditor(
      doc(para(text("Above")), spacer, para(text("Below"))),
    );
    cursorAt(editor, posOf(editor, "Above", 5));
    expect(isSpacerBubbleTarget(editor)).toBe(false);
    cursorAt(editor, posOf(editor, "Above"), posOf(editor, "Below", 3));
    expect(isSpacerBubbleTarget(editor)).toBe(false);
  });

  it("read-only editor: no spacer menu", () => {
    const editor = makeEditor(doc(para(text("A")), spacer, para()));
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 3)),
    );
    editor.setEditable(false);
    expect(isSpacerBubbleTarget(editor)).toBe(false);
  });
});

describe("while the slash menu is open", () => {
  // A headless Editor's own state carries no plugins, so (like the
  // container-trailing-paragraph tests) drive a real EditorState built from
  // the editor's plugins, and judge it through a state-backed MenuEditor.
  function makeSlashHarness(content: JSONContent) {
    const editor = makeEditor(content);
    let state = EditorState.create({
      doc: editor.state.doc,
      plugins: editor.extensionManager.plugins,
    });
    const menuEditor = {
      get state() {
        return state;
      },
      isEditable: true,
      isActive: (name: string, attrs?: Record<string, unknown>) =>
        isActive(state, name, attrs),
      getAttributes: (name: string) => getAttributes(state, name),
    };
    const apply = (build: (tr: Transaction) => Transaction) => {
      state = state.apply(build(state.tr));
    };
    return {
      menuEditor,
      cursorAt: (pos: number) =>
        apply((tr) => tr.setSelection(TextSelection.create(tr.doc, pos))),
      /** Types "/" at the cursor, as a keystroke would. */
      typeSlash: () => apply((tr) => tr.insertText("/")),
      /** What Escape does: Suggestion's exit meta (no doc/selection change). */
      escape: () =>
        apply((tr) => tr.setMeta(slashCommandPluginKey, { exit: true })),
      deleteRange: (from: number, to: number) =>
        apply((tr) => tr.delete(from, to)),
    };
  }

  it("hides the row menu on an empty line in a column, back after Escape", () => {
    const h = makeSlashHarness(doc(row([para()], [para(text("Right"))])));
    // columns(0) > column(1) > paragraph(2): inside it at 3.
    h.cursorAt(3);
    expect(isColumnsBubbleTarget(h.menuEditor)).toBe(true);

    h.typeSlash();
    expect(isSlashMenuOpen(h.menuEditor)).toBe(true);
    expect(isColumnsBubbleTarget(h.menuEditor)).toBe(false);
    expect(isLinkBubbleTarget(h.menuEditor)).toBe(false);
    expect(isTableBubbleTarget(h.menuEditor)).toBe(false);

    h.escape();
    expect(isSlashMenuOpen(h.menuEditor)).toBe(false);
    expect(isColumnsBubbleTarget(h.menuEditor)).toBe(true);
  });

  it("hides the table menu in a cell, back once the query is deleted", () => {
    const h = makeSlashHarness(
      doc({
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [{ type: "tableCell", content: [para()] }],
          },
        ],
      }),
    );
    // table(0) > row(1) > cell(2) > paragraph(3): inside it at 4.
    h.cursorAt(4);
    h.typeSlash();
    expect(isSlashMenuOpen(h.menuEditor)).toBe(true);
    expect(isTableBubbleTarget(h.menuEditor)).toBe(false);

    h.deleteRange(4, 5);
    expect(isSlashMenuOpen(h.menuEditor)).toBe(false);
    expect(isTableBubbleTarget(h.menuEditor)).toBe(true);
  });

  it("a slash after text never opens it, so the row menu stays", () => {
    const h = makeSlashHarness(doc(row([para(text("and"))], [para()])));
    // columns(0) > column(1) > paragraph(2) > "and" at 3..6.
    h.cursorAt(6);
    h.typeSlash();
    expect(isSlashMenuOpen(h.menuEditor)).toBe(false);
    expect(isColumnsBubbleTarget(h.menuEditor)).toBe(true);
  });
});

describe("image menu target", () => {
  it("a node-selected image: the image menu; a cursor: none", () => {
    const editor = makeEditor(
      doc(para(text("A")), {
        type: "image",
        attrs: { src: "https://x.test/a.png" },
      }),
    );
    // paragraph(0..3) > image at 3.
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 3)),
    );
    expect(isImageBubbleTarget(editor)).toBe(true);
    cursorAt(editor, 1);
    expect(isImageBubbleTarget(editor)).toBe(false);
  });

  it("read-only editor: no image menu", () => {
    const editor = makeEditor(
      doc(para(text("A")), {
        type: "image",
        attrs: { src: "https://x.test/a.png" },
      }),
    );
    editor.view.dispatch(
      editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, 3)),
    );
    editor.setEditable(false);
    expect(isImageBubbleTarget(editor)).toBe(false);
  });
});
