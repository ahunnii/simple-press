import type { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";

import type { InsertItemGates } from "./insert-items";

import {
  filterInsertItems,
  getInsertItems,
  INSERT_ITEMS,
} from "./insert-items";

const ALL_FLAGS: InsertItemGates = {
  galleriesEnabled: true,
  embedsEnabled: true,
  quotesEnabled: true,
  formsEnabled: true,
  layoutBlocksEnabled: true,
  videosEnabled: true,
};

const values = (surface: "toolbar" | "slash", gates: InsertItemGates) =>
  getInsertItems(surface, gates).map((item) => item.value);

const editorWith = (...names: string[]) =>
  ({
    extensionManager: { extensions: names.map((name) => ({ name })) },
  }) as unknown as Editor;

describe("getInsertItems: toolbar", () => {
  it("keeps today's Insert dropdown with every flag on", () => {
    expect(values("toolbar", ALL_FLAGS)).toEqual([
      "codeBlock",
      "blockquote",
      "horizontalRule",
      "gallery",
      "embed",
      "quoteCalculator",
      "form",
      "table",
      "columns",
      "details",
      "spacer",
    ]);
  });

  it("drops flagged items when their flags are off (the default)", () => {
    expect(values("toolbar", {})).toEqual([
      "codeBlock",
      "blockquote",
      "horizontalRule",
      "table",
    ]);
  });

  it("gates columns, collapsible and space on layoutBlocksEnabled", () => {
    const off = values("toolbar", { ...ALL_FLAGS, layoutBlocksEnabled: false });
    expect(off).not.toContain("columns");
    expect(off).not.toContain("details");
    expect(off).not.toContain("spacer");
    expect(off).toContain("gallery");
  });

  it("gates each block on its own flag", () => {
    expect(
      values("toolbar", { ...ALL_FLAGS, galleriesEnabled: false }),
    ).not.toContain("gallery");
    expect(
      values("toolbar", { ...ALL_FLAGS, embedsEnabled: false }),
    ).not.toContain("embed");
    expect(
      values("toolbar", { ...ALL_FLAGS, quotesEnabled: false }),
    ).not.toContain("quoteCalculator");
    expect(
      values("toolbar", { ...ALL_FLAGS, formsEnabled: false }),
    ).not.toContain("form");
  });

  it("offers only blockquote and divider in email, whatever the flags", () => {
    expect(values("toolbar", { ...ALL_FLAGS, emailMode: true })).toEqual([
      "blockquote",
      "horizontalRule",
    ]);
  });

  it("never lists text styles, lists or media (they have own buttons)", () => {
    const toolbar = values("toolbar", ALL_FLAGS);
    for (const value of [
      "heading1",
      "bulletList",
      "orderedList",
      "image",
      "video",
    ] as const) {
      expect(toolbar).not.toContain(value);
    }
  });
});

describe("getInsertItems: slash", () => {
  it("offers everything, in registry order, with every flag on", () => {
    expect(values("slash", ALL_FLAGS)).toEqual(
      INSERT_ITEMS.map((item) => item.value),
    );
  });

  it("keeps the basics with every flag off", () => {
    expect(values("slash", {})).toEqual([
      "heading1",
      "heading2",
      "heading3",
      "bulletList",
      "orderedList",
      "blockquote",
      "codeBlock",
      "horizontalRule",
      "image",
      "table",
    ]);
  });

  it("limits email to what an email can show", () => {
    expect(values("slash", { ...ALL_FLAGS, emailMode: true })).toEqual([
      "heading1",
      "heading2",
      "heading3",
      "bulletList",
      "orderedList",
      "blockquote",
      "horizontalRule",
      "image",
    ]);
  });

  it("derives video from the registered extension when not given", () => {
    expect(values("slash", { editor: editorWith("image", "video") })).toContain(
      "video",
    );
    expect(values("slash", { editor: editorWith("image") })).not.toContain(
      "video",
    );
    expect(
      values("slash", { editor: editorWith("video"), emailMode: true }),
    ).not.toContain("video");
  });

  it("matches the toolbar's gating for every shared item", () => {
    const combos: InsertItemGates[] = [
      {},
      ALL_FLAGS,
      { galleriesEnabled: true, layoutBlocksEnabled: true },
      { embedsEnabled: true, formsEnabled: true },
      { ...ALL_FLAGS, emailMode: true },
    ];
    for (const gates of combos) {
      const slash = new Set(values("slash", gates));
      for (const value of values("toolbar", gates)) {
        expect(slash.has(value)).toBe(true);
      }
    }
  });

  it("gives image and video a dialog and everything else a command", () => {
    for (const item of INSERT_ITEMS) {
      if (item.value === "image" || item.value === "video") {
        expect(item.dialog).toBe(item.value);
        expect(item.run).toBeUndefined();
      } else {
        expect(item.dialog).toBeUndefined();
        expect(typeof item.run).toBe("function");
      }
    }
  });
});

describe("filterInsertItems", () => {
  const items = getInsertItems("slash", ALL_FLAGS);
  const filter = (query: string) =>
    filterInsertItems(items, query).map((item) => item.value);

  it("returns everything for an empty or blank query", () => {
    expect(filter("")).toEqual(items.map((item) => item.value));
    expect(filter("  ")).toEqual(items.map((item) => item.value));
  });

  it("matches labels case-insensitively, prefixes first", () => {
    expect(filter("COL")).toEqual(["columns", "details"]);
    expect(filter("head")).toEqual(["heading1", "heading2", "heading3"]);
  });

  it("matches keywords", () => {
    expect(filter("h2")).toEqual(["heading2"]);
    expect(filter("photo")[0]).toBe("image");
    expect(filter("accordion")).toEqual(["details"]);
    expect(filter("hr")).toContain("horizontalRule");
  });

  it("ranks a label prefix above a keyword match", () => {
    // "Quote calculator" starts with "quote"; Blockquote has it as a word
    // inside the label (substring) and as a keyword.
    expect(filter("quote")[0]).toBe("quoteCalculator");
    expect(filter("quote")).toContain("blockquote");
  });

  it("ranks a later word prefix above keyword-only matches", () => {
    // "Numbered list" / "Bullet list" match on a label word; "ul"/"ol"
    // aren't involved.
    expect(filter("list")).toEqual(["bulletList", "orderedList"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filter("zzz")).toEqual([]);
  });
});
