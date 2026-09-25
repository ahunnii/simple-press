/**
 * Store-transfer rewrite walkers: URL, gallery-id and embed-id (form /
 * quote-calculator) remapping over TipTap docs and free-form JSON.
 *
 * `~/server/db` is mocked (rewrite.ts → media/usage.ts imports it), so this
 * runs in the `unit` project (`pnpm test:nodb`) with no Postgres. Storage URLs
 * are built with the real `keyToPublicUrl` so `isStorageUrl` recognizes them.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("~/server/db", () => ({ db: {} }));

const { rewriteJsonValue, rewriteTiptapDoc } = await import("./rewrite");
const { keyToPublicUrl } = await import("~/lib/s3/url");

const OLD_IMG = keyToPublicUrl("source-biz/image-aaaa1111.jpg");
const NEW_IMG = keyToPublicUrl("target-biz/image-aaaa1111.jpg");

const urlMap = new Map([[OLD_IMG, NEW_IMG]]);
const galleryIdMap = new Map([["gal_old", "gal_new"]]);
const embedIdMaps = {
  form: new Map([["form_old", "form_new"]]),
  quoteCalculator: new Map([["calc_old", "calc_new"]]),
};

function doc(...content: unknown[]) {
  return { type: "doc", content };
}

describe("rewriteTiptapDoc", () => {
  it("remaps form and quoteCalculator embed ids", () => {
    const out = rewriteTiptapDoc(
      doc(
        { type: "form", attrs: { formId: "form_old", other: 1 } },
        { type: "quoteCalculator", attrs: { calculatorId: "calc_old" } },
      ),
      urlMap,
      galleryIdMap,
      embedIdMaps,
    );
    expect(out).toEqual(
      doc(
        { type: "form", attrs: { formId: "form_new", other: 1 } },
        { type: "quoteCalculator", attrs: { calculatorId: "calc_new" } },
      ),
    );
  });

  it("leaves unmapped embed ids unchanged", () => {
    const input = doc(
      { type: "form", attrs: { formId: "form_unknown" } },
      { type: "quoteCalculator", attrs: { calculatorId: "calc_unknown" } },
    );
    expect(rewriteTiptapDoc(input, urlMap, galleryIdMap, embedIdMaps)).toEqual(
      input,
    );
  });

  it("leaves embed ids unchanged when no embed maps are passed", () => {
    const input = doc(
      { type: "form", attrs: { formId: "form_old" } },
      { type: "quoteCalculator", attrs: { calculatorId: "calc_old" } },
    );
    expect(rewriteTiptapDoc(input, urlMap, galleryIdMap)).toEqual(input);
  });

  it("still rewrites image src and gallery ids, recursing into nested content", () => {
    const input = doc({
      type: "blockquote",
      content: [
        { type: "image", attrs: { src: OLD_IMG, alt: "x" } },
        { type: "gallery", attrs: { galleryId: "gal_old" } },
        { type: "form", attrs: { formId: "form_old" } },
      ],
    });
    const out = rewriteTiptapDoc(input, urlMap, galleryIdMap, embedIdMaps);
    expect(out).toEqual(
      doc({
        type: "blockquote",
        content: [
          { type: "image", attrs: { src: NEW_IMG, alt: "x" } },
          { type: "gallery", attrs: { galleryId: "gal_new" } },
          { type: "form", attrs: { formId: "form_new" } },
        ],
      }),
    );
  });

  it("rewrites video node src like image src (mirrors usage.ts walkTiptap)", () => {
    const input = doc({
      type: "video",
      attrs: { src: OLD_IMG, ambient: true },
    });
    expect(rewriteTiptapDoc(input, urlMap, galleryIdMap)).toEqual(
      doc({ type: "video", attrs: { src: NEW_IMG, ambient: true } }),
    );
  });

  it("does not mutate its input", () => {
    const input = doc({ type: "form", attrs: { formId: "form_old" } });
    const snapshot = structuredClone(input);
    rewriteTiptapDoc(input, urlMap, galleryIdMap, embedIdMaps);
    expect(input).toEqual(snapshot);
  });
});

describe("rewriteJsonValue", () => {
  it("applies embed maps to a TipTap doc nested inside an object", () => {
    const input = {
      heroImage: OLD_IMG,
      sections: [
        {
          body: doc(
            { type: "form", attrs: { formId: "form_old" } },
            { type: "quoteCalculator", attrs: { calculatorId: "calc_old" } },
            { type: "gallery", attrs: { galleryId: "gal_old" } },
          ),
        },
      ],
      external: "https://example.com/not-ours.jpg",
    };
    const out = rewriteJsonValue(
      input,
      urlMap,
      galleryIdMap,
      undefined,
      embedIdMaps,
    );
    expect(out).toEqual({
      heroImage: NEW_IMG,
      sections: [
        {
          body: doc(
            { type: "form", attrs: { formId: "form_new" } },
            { type: "quoteCalculator", attrs: { calculatorId: "calc_new" } },
            { type: "gallery", attrs: { galleryId: "gal_new" } },
          ),
        },
      ],
      external: "https://example.com/not-ours.jpg",
    });
  });

  it("threads embed maps through the templateId path too", () => {
    const out = rewriteJsonValue(
      { "about.body": doc({ type: "form", attrs: { formId: "form_old" } }) },
      urlMap,
      galleryIdMap,
      { templateId: "modern" },
      embedIdMaps,
    );
    expect(out).toEqual({
      "about.body": doc({ type: "form", attrs: { formId: "form_new" } }),
    });
  });
});
