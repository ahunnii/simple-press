import { describe, expect, it } from "vitest";

import { scrubUrlsFromCustomFields } from "./scrub-custom-fields";

const A = "https://cdn.example.com/biz/a.jpg";
const B = "https://cdn.example.com/biz/b.jpg";
const KEEP = "https://cdn.example.com/biz/keep.jpg";

const set = (...urls: string[]) => new Set(urls);

/** Recursively freeze so any accidental mutation of the input throws. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

describe("scrubUrlsFromCustomFields", () => {
  it("deletes a top-level key whose value is exactly a scrubbed URL", () => {
    const fields = deepFreeze({
      "default.hero.image": A,
      "default.hero.title": "Hello",
    });

    const { value, changed } = scrubUrlsFromCustomFields(fields, set(A));

    expect(changed).toBe(true);
    expect(value).toEqual({ "default.hero.title": "Hello" });
    expect(Object.keys(value as object)).not.toContain("default.hero.image");
  });

  it("blanks a nested list-row URL instead of dropping the row", () => {
    const fields = deepFreeze({
      "default.logos.list": [
        { _id: "r1", image: A, label: "One" },
        { _id: "r2", image: KEEP, label: "Two" },
      ],
    });

    const { value, changed } = scrubUrlsFromCustomFields(fields, set(A));

    expect(changed).toBe(true);
    expect(value).toEqual({
      "default.logos.list": [
        { _id: "r1", image: "", label: "One" },
        { _id: "r2", image: KEEP, label: "Two" },
      ],
    });
  });

  it("removes a TipTap image node while sibling nodes survive", () => {
    const fields = deepFreeze({
      "default.about.body": {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Before" }] },
          { type: "image", attrs: { src: A, alt: "Gone" } },
          { type: "image", attrs: { src: KEEP, alt: "Stays" } },
          { type: "paragraph", content: [{ type: "text", text: "After" }] },
        ],
      },
    });

    const { value, changed } = scrubUrlsFromCustomFields(fields, set(A));

    expect(changed).toBe(true);
    expect(value).toEqual({
      "default.about.body": {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Before" }] },
          { type: "image", attrs: { src: KEEP, alt: "Stays" } },
          { type: "paragraph", content: [{ type: "text", text: "After" }] },
        ],
      },
    });
  });

  it("removes nested rich-text media nodes at any depth", () => {
    const fields = deepFreeze({
      "default.about.body": {
        type: "doc",
        content: [
          {
            type: "blockquote",
            content: [
              { type: "image", attrs: { src: A } },
              { type: "paragraph", content: [{ type: "text", text: "Keep" }] },
            ],
          },
        ],
      },
    });

    const { value, changed } = scrubUrlsFromCustomFields(fields, set(A));

    expect(changed).toBe(true);
    expect(value).toEqual({
      "default.about.body": {
        type: "doc",
        content: [
          {
            type: "blockquote",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Keep" }] },
            ],
          },
        ],
      },
    });
  });

  it("never touches the reserved _sp metadata key", () => {
    const sp = { theme: "sunset", cover: A, sections: { hero: { hidden: A } } };
    const fields = deepFreeze({ _sp: sp, "default.hero.image": A });

    const { value, changed } = scrubUrlsFromCustomFields(fields, set(A));

    expect(changed).toBe(true);
    const out = value as Record<string, unknown>;
    expect(out._sp).toEqual(sp);
    // untouched branches are shared by reference
    expect(out._sp).toBe(sp);
    expect(out).not.toHaveProperty("default.hero.image");
  });

  it("returns the identical reference and changed:false when nothing matches", () => {
    const fields = deepFreeze({
      "default.hero.image": KEEP,
      "default.logos.list": [{ image: KEEP }],
      "default.about.body": {
        type: "doc",
        content: [{ type: "image", attrs: { src: KEEP } }],
      },
    });

    const result = scrubUrlsFromCustomFields(fields, set(A, B));

    expect(result.changed).toBe(false);
    expect(result.value).toBe(fields);
  });

  it("handles null, undefined, and non-object input safely", () => {
    for (const input of [null, undefined, "a string", 42, true, [A]]) {
      const result = scrubUrlsFromCustomFields(input, set(A));
      expect(result.changed).toBe(false);
      expect(result.value).toBe(input);
    }
  });

  it("is a no-op for an empty URL set", () => {
    const fields = deepFreeze({ "default.hero.image": A });
    const result = scrubUrlsFromCustomFields(fields, new Set<string>());

    expect(result.changed).toBe(false);
    expect(result.value).toBe(fields);
  });

  it("removes several URLs in one pass", () => {
    const fields = deepFreeze({
      "default.hero.image": A,
      "default.logos.list": [{ image: B }, { image: KEEP }],
      "default.about.body": {
        type: "doc",
        content: [
          { type: "image", attrs: { src: B } },
          { type: "paragraph", content: [{ type: "text", text: "Keep" }] },
        ],
      },
      "default.hero.title": "Hello",
    });

    const { value, changed } = scrubUrlsFromCustomFields(fields, set(A, B));

    expect(changed).toBe(true);
    expect(value).toEqual({
      "default.logos.list": [{ image: "" }, { image: KEEP }],
      "default.about.body": {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Keep" }] },
        ],
      },
      "default.hero.title": "Hello",
    });
  });

  it("matches a stored URL that carries a query string", () => {
    const fields = deepFreeze({
      "default.hero.image": `${A}?v=2`,
      "default.logos.list": [{ image: `${B}?w=400` }],
    });

    const { value, changed } = scrubUrlsFromCustomFields(fields, set(A, B));

    expect(changed).toBe(true);
    expect(value).toEqual({ "default.logos.list": [{ image: "" }] });
  });

  it("does not mutate the input blob", () => {
    const fields = {
      "default.hero.image": A,
      "default.logos.list": [{ image: A }],
      "default.about.body": {
        type: "doc",
        content: [
          { type: "image", attrs: { src: A } },
          { type: "paragraph", content: [{ type: "text", text: "Keep" }] },
        ],
      },
    };
    const snapshot = JSON.parse(JSON.stringify(fields)) as unknown;
    deepFreeze(fields);

    const { changed } = scrubUrlsFromCustomFields(fields, set(A));

    expect(changed).toBe(true);
    expect(fields).toEqual(snapshot);
  });
});
