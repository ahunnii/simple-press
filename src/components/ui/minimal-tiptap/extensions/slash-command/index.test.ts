import type { JSONContent } from "@tiptap/core";
import { Editor } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { isSlashAllowed } from ".";

const editors: Editor[] = [];
afterEach(() => {
  while (editors.length) editors.pop()?.destroy();
});

/** State for a doc whose first block holds `text`; "/" is located in it. */
function check(block: JSONContent) {
  const editor = new Editor({
    extensions: [StarterKit],
    content: { type: "doc", content: [block] },
  });
  editors.push(editor);
  const { state } = editor;
  const text = state.doc.firstChild?.textContent ?? "";
  const slash = text.lastIndexOf("/");
  // Inside the first block: +1 for its opening token.
  const from = 1 + slash;
  const match = /^\/[^\s/]*/.exec(text.slice(slash));
  const to = from + (match?.[0].length ?? 1);
  return isSlashAllowed(state, { from, to });
}

const paragraph = (text: string): JSONContent => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : undefined,
});

describe("isSlashAllowed", () => {
  it("allows a slash that starts an otherwise empty paragraph", () => {
    expect(check(paragraph("/"))).toBe(true);
    expect(check(paragraph("/ima"))).toBe(true);
  });

  it("allows leading whitespace", () => {
    expect(check(paragraph("  /col"))).toBe(true);
  });

  it("refuses a slash after text (URLs, dates, fractions)", () => {
    expect(check(paragraph("and/or"))).toBe(false);
    expect(check(paragraph("see https://x/y"))).toBe(false);
    expect(check(paragraph("1 /2"))).toBe(false);
  });

  it("refuses when text follows the query", () => {
    expect(check(paragraph("/ima more"))).toBe(false);
  });

  it("refuses outside plain paragraphs", () => {
    expect(
      check({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "/h" }],
      }),
    ).toBe(false);
    expect(
      check({
        type: "codeBlock",
        content: [{ type: "text", text: "/usr" }],
      }),
    ).toBe(false);
  });
});
