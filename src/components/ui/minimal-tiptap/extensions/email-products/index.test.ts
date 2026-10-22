import type { JSONContent } from "@tiptap/core";
import { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { createLinkExtension } from "~/lib/tiptap/link-extension";

import { EditorEmailProducts } from ".";
import {
  insertButtonLink,
  OPEN_LINK_EDIT_META,
} from "../../components/link/insert-button-link";

const item = (id: string) => ({
  productId: id,
  name: `Product ${id}`,
  imageUrl: null,
  priceCents: 1000,
  compareAtCents: null,
  slug: `product-${id}`,
});

// Headless editors (no element): state + commands only.
const editors: Editor[] = [];
function makeEditor(content: JSONContent) {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({ link: false }),
      createLinkExtension(),
      EditorEmailProducts,
    ],
    content,
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

const emptyDoc: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

describe("insertEmailProducts", () => {
  it("replaces an empty line with a sanitized product block", () => {
    const editor = makeEditor(emptyDoc);
    editor.commands.setTextSelection(1);
    editor.commands.insertEmailProducts({
      items: [item("a"), item("a"), item("b"), item("c"), item("d"), item("e")],
      buttonLabel: "  Buy  ",
    });
    const first = editor.getJSON().content?.[0];
    expect(first?.type).toBe("emailProducts");
    expect(
      (first?.attrs?.items as { productId: string }[]).map((i) => i.productId),
    ).toEqual(["a", "b", "c", "d"]);
    expect(first?.attrs?.buttonLabel).toBe("Buy");
  });

  it("goes after a node-selected block instead of replacing it", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        { type: "emailProducts", attrs: { items: [item("a")] } },
        { type: "paragraph" },
      ],
    });
    editor.commands.setNodeSelection(0);
    editor.commands.insertEmailProducts({ items: [item("b")] });
    const types = editor.getJSON().content?.map((node) => node.type);
    expect(types?.filter((type) => type === "emailProducts")).toHaveLength(2);
  });
});

describe("setEmailProducts", () => {
  it("updates the node-selected block and keeps it selected", () => {
    const editor = makeEditor({
      type: "doc",
      content: [{ type: "emailProducts", attrs: { items: [item("a")] } }],
    });
    editor.commands.setNodeSelection(0);
    expect(
      editor.commands.setEmailProducts({ items: [item("b"), item("c")] }),
    ).toBe(true);
    const node = editor.getJSON().content?.[0];
    expect(
      (node?.attrs?.items as { productId: string }[]).map((i) => i.productId),
    ).toEqual(["b", "c"]);
    expect(node?.attrs?.buttonLabel).toBe("Shop now");
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
  });

  it("refuses without a selected product block", () => {
    const editor = makeEditor(emptyDoc);
    expect(editor.commands.setEmailProducts({ items: [item("a")] })).toBe(
      false,
    );
  });
});

describe("insertButtonLink", () => {
  it("inserts a solid button link on its own line with its text selected", () => {
    const editor = makeEditor(emptyDoc);
    editor.commands.setTextSelection(1);
    let opened = false;
    editor.on("transaction", ({ transaction }) => {
      if (transaction.getMeta(OPEN_LINK_EDIT_META)) opened = true;
    });

    // (Its `focus()` step reports false without a DOM; the edit still lands.)
    insertButtonLink(editor);

    expect(editor.getJSON().content?.[0]).toEqual({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Shop now",
          marks: [
            {
              type: "link",
              attrs: expect.objectContaining({
                href: "/",
                variant: "solid",
              }) as unknown,
            },
          ],
        },
      ],
    });
    const { from, to } = editor.state.selection;
    expect(editor.state.doc.textBetween(from, to)).toBe("Shop now");
    expect(opened).toBe(true);
  });
});
