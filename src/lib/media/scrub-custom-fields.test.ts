import { describe, expect, it } from "vitest";

import {
  scrubGalleryIdsFromCustomFields,
  scrubUrlsFromCustomFields,
} from "./scrub-custom-fields";

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

describe("scrubGalleryIdsFromCustomFields", () => {
  const GAL = "cmgal00000000000000000001";
  const GAL_KEEP = "cmgal00000000000000000002";

  it("deletes a top-level gallery field whose value is exactly a scrubbed ID", () => {
    const fields = deepFreeze({
      "noise.homepage.intro-gallery": GAL,
      "dark-trend.homepage.gallery": GAL_KEEP,
      "noise.homepage.title": "Hello",
    });

    const { value, changed } = scrubGalleryIdsFromCustomFields(
      fields,
      set(GAL),
    );

    expect(changed).toBe(true);
    expect(value).toEqual({
      "dark-trend.homepage.gallery": GAL_KEEP,
      "noise.homepage.title": "Hello",
    });
  });

  it("blanks a nested string equal to a scrubbed ID", () => {
    const fields = deepFreeze({
      "x.list": [
        { _id: "r1", gallery: GAL },
        { _id: "r2", gallery: GAL_KEEP },
      ],
    });

    const { value, changed } = scrubGalleryIdsFromCustomFields(
      fields,
      set(GAL),
    );

    expect(changed).toBe(true);
    expect(value).toEqual({
      "x.list": [
        { _id: "r1", gallery: "" },
        { _id: "r2", gallery: GAL_KEEP },
      ],
    });
  });

  it("removes a TipTap gallery node (even nested) while siblings survive", () => {
    const fields = deepFreeze({
      "x.body": {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Before" }] },
          { type: "gallery", attrs: { galleryId: GAL } },
          { type: "gallery", attrs: { galleryId: GAL_KEEP } },
          {
            type: "blockquote",
            content: [{ type: "gallery", attrs: { galleryId: GAL } }],
          },
        ],
      },
    });

    const { value, changed } = scrubGalleryIdsFromCustomFields(
      fields,
      set(GAL),
    );

    expect(changed).toBe(true);
    expect(value).toEqual({
      "x.body": {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Before" }] },
          { type: "gallery", attrs: { galleryId: GAL_KEEP } },
          { type: "blockquote", content: [] },
        ],
      },
    });
  });

  it("only removes nodes of type gallery (an image node with a matching attr stays)", () => {
    const fields = deepFreeze({
      "x.body": {
        type: "doc",
        content: [{ type: "image", attrs: { src: A, galleryId: GAL } }],
      },
    });

    const { value, changed } = scrubGalleryIdsFromCustomFields(
      fields,
      set(GAL),
    );

    // The node is kept; only the incidental matching attr string is blanked.
    expect(changed).toBe(true);
    expect(value).toEqual({
      "x.body": {
        type: "doc",
        content: [{ type: "image", attrs: { src: A, galleryId: "" } }],
      },
    });
  });

  it("never touches _sp metadata", () => {
    const fields = deepFreeze({
      _sp: { lastGallery: GAL },
      "noise.homepage.intro-gallery": GAL,
    });

    const { value } = scrubGalleryIdsFromCustomFields(fields, set(GAL));

    expect(value).toEqual({ _sp: { lastGallery: GAL } });
    expect((value as Record<string, unknown>)._sp).toBe(fields._sp);
  });

  it("returns the input by reference when nothing matches or ids is empty", () => {
    const fields = deepFreeze({ "x.gallery": GAL_KEEP, "x.title": GAL + "x" });

    expect(scrubGalleryIdsFromCustomFields(fields, set(GAL))).toEqual({
      value: fields,
      changed: false,
    });
    expect(scrubGalleryIdsFromCustomFields(fields, set()).value).toBe(fields);
    expect(scrubGalleryIdsFromCustomFields(null, set(GAL))).toEqual({
      value: null,
      changed: false,
    });
  });

  it("does not treat URLs with a query string as gallery-ID matches", () => {
    const fields = deepFreeze({ "x.gallery": `${GAL}?v=2` });

    expect(scrubGalleryIdsFromCustomFields(fields, set(GAL)).changed).toBe(
      false,
    );
  });
});
