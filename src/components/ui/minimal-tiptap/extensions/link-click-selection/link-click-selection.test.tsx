import type { JSONContent } from "@tiptap/core";
import { Editor } from "@tiptap/core";
import { TextStyle } from "@tiptap/extension-text-style";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { Column } from "~/lib/tiptap/columns-node";
import { createLinkExtension } from "~/lib/tiptap/link-extension";

import { LinkClickSelection, linkClickSelectionKey, linkRangeAt } from ".";
import {
  isColumnsBubbleTarget,
  isLinkBubbleTarget,
} from "../../components/bubble-menu/bubble-menu-predicates";
import { EditorColumns } from "../columns";

const editors: Editor[] = [];
function makeEditor(content: JSONContent) {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({ link: false }),
      TextStyle,
      createLinkExtension({
        enableClickSelection: true,
        openOnClick: false,
        HTMLAttributes: { class: "link" },
      }),
      LinkClickSelection,
      EditorColumns,
      Column,
    ],
    content,
  });
  editors.push(editor);
  return editor;
}
afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
  document.body.innerHTML = "";
});

const text = (value: string, marks?: JSONContent["marks"]): JSONContent =>
  marks ? { type: "text", text: value, marks } : { type: "text", text: value };
const para = (...content: JSONContent[]): JSONContent => ({
  type: "paragraph",
  content,
});
const link = (href: string, variant: string | null = null) => ({
  type: "link",
  attrs: { href, variant },
});
const row = (...columns: JSONContent[][]): JSONContent => ({
  type: "columns",
  attrs: { layout: "2" },
  content: columns.map((content) => ({ type: "column", content })),
});

/** Runs the editor's click handlers the way ProseMirror does on mouseup. */
function click(
  editor: Editor,
  target: Element,
  init: Partial<MouseEvent> = {},
): boolean {
  const event = {
    button: 0,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    target,
    ...init,
  } as unknown as MouseEvent;
  return (
    editor.view.someProp("handleClick", (f) => f(editor.view, 1, event)) ??
    false
  );
}

describe("LinkClickSelection", () => {
  it("runs before the stock Link click handler", () => {
    const editor = makeEditor({ type: "doc", content: [para(text("x"))] });
    const keys = editor.state.plugins.map(
      (p) => (p as unknown as { key: string }).key,
    );
    const ours = keys.indexOf(
      (linkClickSelectionKey as unknown as { key: string }).key,
    );
    const stock = keys.findIndex((k) => k.startsWith("handleClickLink"));
    expect(ours).toBeGreaterThanOrEqual(0);
    expect(stock).toBeGreaterThan(ours);
  });

  it("clicking a button link in a row selects the whole link, even with the caret elsewhere", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        row(
          [
            para(
              text("Intro "),
              text("Book now", [link("/book", "solid")]),
              text(" after"),
            ),
          ],
          [para(text("Right"))],
        ),
      ],
    });
    // Caret outside the link (the doc start), as after a click on the
    // button's padding that the browser didn't turn into a caret move.
    expect(isColumnsBubbleTarget(editor)).toBe(true);
    const anchor = editor.view.dom.querySelector("a.sp-button");
    expect(anchor).not.toBeNull();

    expect(click(editor, anchor!)).toBe(true);
    const { from, to } = editor.state.selection;
    expect(editor.state.doc.textBetween(from, to)).toBe("Book now");
    expect(isLinkBubbleTarget(editor)).toBe(true);
    expect(isColumnsBubbleTarget(editor)).toBe(false);
  });

  it("a click on the link's inner text node resolves the same link", () => {
    const editor = makeEditor({
      type: "doc",
      content: [para(text("Go "), text("there", [link("https://x.test")]))],
    });
    const anchor = editor.view.dom.querySelector("a")!;
    // `closest` from an element inside the anchor (e.g. a bold span).
    const inner = document.createElement("strong");
    anchor.appendChild(inner);
    expect(click(editor, inner)).toBe(true);
    const { from, to } = editor.state.selection;
    expect(editor.state.doc.textBetween(from, to)).toBe("there");
  });

  it("leaves non-link and modified clicks to the stock handlers", () => {
    const editor = makeEditor({
      type: "doc",
      content: [para(text("Plain "), text("link", [link("/x")]))],
    });
    const before = editor.state.selection;
    const paragraph = editor.view.dom.querySelector("p")!;
    const anchor = editor.view.dom.querySelector("a")!;
    // Our handler declines; the stock one only acts on <a>, so nothing runs.
    expect(click(editor, paragraph)).toBe(false);
    expect(editor.state.selection.eq(before)).toBe(true);
    // Shift-click (extend selection) skips ours; the stock Link handler
    // still claims it, as it always did.
    const ours = linkClickSelectionKey.get(editor.state)!;
    const event = {
      button: 0,
      shiftKey: true,
      target: anchor,
    } as unknown as MouseEvent;
    expect(ours.props.handleClick?.call(ours, editor.view, 1, event)).toBe(
      false,
    );
  });
});

describe("linkRangeAt", () => {
  it("matches the link mark's own attrs: a coloured link, and two adjacent links", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        para(
          text("Red", [
            { type: "textStyle", attrs: { color: "#f00" } },
            link("/a"),
          ]),
          text("Blue", [link("/b")]),
          text(" tail"),
        ),
      ],
    });
    const { doc } = editor.state;
    // "Red" spans 1..4, "Blue" 4..8.
    expect(linkRangeAt(doc, 1)).toEqual({ from: 1, to: 4 });
    expect(linkRangeAt(doc, 5)).toEqual({ from: 4, to: 8 });
    expect(linkRangeAt(doc, 10)).toBeNull();
  });
});
