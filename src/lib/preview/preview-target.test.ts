// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import {
  parseItemAttr,
  resolvePreviewTarget,
  resolvePreviewTargetFromStack,
  sanitizeEditTarget,
} from "./preview-target";
import { fieldAttr, listItemAttr } from "./section-attrs";

describe("listItemAttr / parseItemAttr", () => {
  it("round-trips a field key and index", () => {
    const attr = listItemAttr("bamboo.homepage.hero-badges", 2);
    expect(attr).toEqual({ "data-sp-item": "bamboo.homepage.hero-badges#2" });
    expect(parseItemAttr(attr["data-sp-item"])).toEqual({
      field: "bamboo.homepage.hero-badges",
      item: 2,
    });
  });

  it("splits on the last #", () => {
    expect(parseItemAttr("a#b#3")).toEqual({ field: "a#b", item: 3 });
  });

  it("rejects malformed values", () => {
    for (const bad of [
      null,
      undefined,
      "",
      "no-hash",
      "#3",
      "key#",
      "key#-1",
      "key#1.5",
      "key#abc",
      "key# 1",
      "key#99999999",
    ]) {
      expect(parseItemAttr(bad)).toBeNull();
    }
  });
});

describe("sanitizeEditTarget", () => {
  it("keeps a valid field + item", () => {
    expect(sanitizeEditTarget("k", 0)).toEqual({ field: "k", item: 0 });
  });

  it("keeps the field when only the item is garbage", () => {
    expect(sanitizeEditTarget("k", "1")).toEqual({ field: "k" });
    expect(sanitizeEditTarget("k", -1)).toEqual({ field: "k" });
    expect(sanitizeEditTarget("k", 1.5)).toEqual({ field: "k" });
    expect(sanitizeEditTarget("k", Number.NaN)).toEqual({ field: "k" });
    expect(sanitizeEditTarget("k", undefined)).toEqual({ field: "k" });
  });

  it("drops everything without a valid field", () => {
    expect(sanitizeEditTarget(undefined, 1)).toBeNull();
    expect(sanitizeEditTarget("", 1)).toBeNull();
    expect(sanitizeEditTarget(42, 1)).toBeNull();
    expect(sanitizeEditTarget({ toString: () => "k" }, 1)).toBeNull();
    expect(sanitizeEditTarget("x".repeat(1000), 1)).toBeNull();
  });
});

function attrs(obj: Record<string, string>) {
  return Object.entries(obj)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
}

describe("resolvePreviewTarget", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section data-sp-group="homepage.hero">
        <h1 id="title" ${attrs(fieldAttr("t.hero-title"))}><em id="title-em">Hi</em></h1>
        <p id="plain">Unannotated</p>
        <ul>
          <li id="badge1" ${attrs(listItemAttr("t.hero-badges", 1))}>
            <span id="badge1-label">Label</span>
          </li>
          <li id="bad-item" data-sp-item="garbage">
            <span id="bad-item-label">x</span>
          </li>
        </ul>
        <div ${attrs(fieldAttr("t.hero-wrap"))}>
          <div id="bad-inside-field" data-sp-item="nope"><b id="deep">d</b></div>
        </div>
        <div data-sp-group="homepage.nested">
          <span id="nested-field" ${attrs(fieldAttr("t.nested-title"))}>n</span>
        </div>
      </section>
      <div id="outside" ${attrs(fieldAttr("t.outside"))}>o</div>
      <button id="overlay" data-sp-overlay=""><span id="pill">Edit</span></button>
    `;
  });

  const el = (id: string) => document.getElementById(id);

  it("resolves a list row from a descendant", () => {
    expect(resolvePreviewTarget(el("badge1-label"), "homepage.hero")).toEqual({
      field: "t.hero-badges",
      item: 1,
    });
  });

  it("resolves a text field from a descendant", () => {
    expect(resolvePreviewTarget(el("title-em"), "homepage.hero")).toEqual({
      field: "t.hero-title",
    });
  });

  it("returns null for unannotated content", () => {
    expect(resolvePreviewTarget(el("plain"), "homepage.hero")).toBeNull();
  });

  it("ignores targets owned by another group", () => {
    expect(
      resolvePreviewTarget(el("nested-field"), "homepage.hero"),
    ).toBeNull();
    expect(resolvePreviewTarget(el("outside"), "homepage.hero")).toBeNull();
    expect(resolvePreviewTarget(el("nested-field"), "homepage.nested")).toEqual(
      { field: "t.nested-title" },
    );
  });

  it("falls through a malformed item to an enclosing field", () => {
    expect(resolvePreviewTarget(el("deep"), "homepage.hero")).toEqual({
      field: "t.hero-wrap",
    });
    expect(
      resolvePreviewTarget(el("bad-item-label"), "homepage.hero"),
    ).toBeNull();
  });

  it("never resolves overlay chrome", () => {
    expect(resolvePreviewTarget(el("pill"), "homepage.hero")).toBeNull();
    expect(resolvePreviewTarget(null, "homepage.hero")).toBeNull();
  });

  it("stack variant skips overlay elements and uses the first page element", () => {
    const stack = [
      el("pill")!,
      el("overlay")!,
      el("badge1-label")!,
      el("title")!,
    ];
    expect(resolvePreviewTargetFromStack(stack, "homepage.hero")).toEqual({
      field: "t.hero-badges",
      item: 1,
    });
    // Only the topmost page element counts — no fallthrough to lower ones.
    expect(
      resolvePreviewTargetFromStack(
        [el("overlay")!, el("plain")!, el("title")!],
        "homepage.hero",
      ),
    ).toBeNull();
    expect(
      resolvePreviewTargetFromStack([el("overlay")!], "homepage.hero"),
    ).toBeNull();
  });
});
